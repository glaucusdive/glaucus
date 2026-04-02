import { d as defineEventHandler, u as useRuntimeConfig, H as createError, M as getHeader, N as readMultipartFormData, r as readBody, O as FEEDBACK_LIMITS, P as uploadBufferToLinear, Q as buildLinearFeedbackDescription, R as buildLinearFeedbackTitle, S as resolveFeedbackLabelIds } from '../../nitro/nitro.mjs';
import '@supabase/supabase-js';
import 'chrono-node';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '@iconify/utils';
import 'consola';

const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";
const ISSUE_CREATE_MUTATION = `
mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue {
      identifier
      url
    }
  }
}
`;
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif"
]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isFeedbackKind(v) {
  return v === "feature" || v === "bug" || v === "correction";
}
async function linearGraphQL(apiKey, query, variables) {
  const res = await fetch(LINEAR_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, json };
}
function appendAttachmentToDescription(description, assetUrl, filename, contentType) {
  var _a;
  const base = ((_a = contentType.split(";")[0]) == null ? void 0 : _a.trim().toLowerCase()) || "";
  const isImage = ALLOWED_IMAGE_TYPES.has(base);
  if (isImage) {
    return `${description}

**Attachment:**

![${filename.replace(/]/g, "")}](${assetUrl})`;
  }
  const safeName = filename.replace(/[[\]]/g, "");
  return `${description}

**Attachment:** [${safeName}](${assetUrl})`;
}
const feedback_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const config = useRuntimeConfig();
  const apiKey = typeof config.linearApiKey === "string" ? config.linearApiKey.trim() : "";
  const teamId = typeof config.linearTeamId === "string" ? config.linearTeamId.trim() : "";
  const stateId = typeof config.linearFeedbackStateId === "string" ? config.linearFeedbackStateId.trim() : "";
  if (!apiKey || !teamId || !stateId) {
    throw createError({
      statusCode: 503,
      statusMessage: "Feedback is temporarily unavailable."
    });
  }
  const contentTypeHeader = getHeader(event, "content-type") || "";
  let kindRaw = "";
  let subject = "";
  let name = "";
  let email = "";
  let message = "";
  let pageUrl;
  let fileBuffer = null;
  let fileFilename = null;
  let fileMime = null;
  if (contentTypeHeader.toLowerCase().includes("multipart/form-data")) {
    const parts = await readMultipartFormData(event);
    if (!(parts == null ? void 0 : parts.length)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid multipart body" });
    }
    for (const p of parts) {
      const field = p.name || "";
      if (field === "file" && p.filename && ((_a = p.data) == null ? void 0 : _a.length)) {
        fileBuffer = Buffer.from(p.data);
        fileFilename = String(p.filename).slice(0, 255);
        fileMime = (p.type || "application/octet-stream").split(";")[0].trim().toLowerCase();
      } else if (p.data) {
        const text = p.data.toString("utf8").trim();
        if (field === "kind") kindRaw = text;
        else if (field === "subject") subject = text;
        else if (field === "name") name = text;
        else if (field === "email") email = text;
        else if (field === "message") message = text;
        else if (field === "pageUrl" && text) pageUrl = text;
      }
    }
  } else {
    const raw = await readBody(event).catch(() => ({}));
    kindRaw = (raw == null ? void 0 : raw.kind) != null ? String(raw.kind).trim().toLowerCase() : "";
    subject = (raw == null ? void 0 : raw.subject) != null ? String(raw.subject).trim() : "";
    name = (raw == null ? void 0 : raw.name) != null ? String(raw.name).trim() : "";
    email = (raw == null ? void 0 : raw.email) != null ? String(raw.email).trim() : "";
    message = (raw == null ? void 0 : raw.message) != null ? String(raw.message).trim() : "";
    if ((raw == null ? void 0 : raw.pageUrl) != null && String(raw.pageUrl).trim()) {
      pageUrl = String(raw.pageUrl).trim();
    }
  }
  kindRaw = kindRaw.trim().toLowerCase();
  if (!isFeedbackKind(kindRaw)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'kind must be "feature", "bug", or "correction"'
    });
  }
  const kind = kindRaw;
  subject = subject.trim().slice(0, FEEDBACK_LIMITS.subjectMax);
  if (subject.length < FEEDBACK_LIMITS.subjectMin) {
    throw createError({
      statusCode: 400,
      statusMessage: `Subject must be at least ${FEEDBACK_LIMITS.subjectMin} characters`
    });
  }
  name = name.trim().slice(0, FEEDBACK_LIMITS.nameMax);
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "name is required" });
  }
  email = email.trim();
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: "email is required" });
  }
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid email" });
  }
  message = message.trim().slice(0, FEEDBACK_LIMITS.messageMax);
  if (message.length < FEEDBACK_LIMITS.messageMin) {
    throw createError({
      statusCode: 400,
      statusMessage: `message must be at least ${FEEDBACK_LIMITS.messageMin} characters`
    });
  }
  if (pageUrl != null && pageUrl !== "") {
    pageUrl = pageUrl.trim().slice(0, FEEDBACK_LIMITS.pageUrlMax);
  } else {
    pageUrl = void 0;
  }
  let assetUrl = null;
  if (fileBuffer && fileFilename && fileMime) {
    if (fileBuffer.byteLength > MAX_ATTACHMENT_BYTES) {
      throw createError({
        statusCode: 400,
        statusMessage: `Attachment must be ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB or smaller`
      });
    }
    if (!ALLOWED_IMAGE_TYPES.has(fileMime)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Attachment must be a JPEG, PNG, WebP, or GIF image"
      });
    }
    try {
      assetUrl = await uploadBufferToLinear({
        apiKey,
        buffer: fileBuffer,
        filename: fileFilename,
        contentType: fileMime === "image/jpg" ? "image/jpeg" : fileMime
      });
    } catch (e) {
      console.error("Linear feedback attachment upload failed:", e);
      throw createError({
        statusCode: 502,
        statusMessage: "Could not upload attachment. Try without a photo or try again later."
      });
    }
  }
  let description = buildLinearFeedbackDescription({
    kind,
    subject,
    name,
    email,
    message,
    pageUrl,
    submittedAtIso: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (assetUrl && fileFilename && fileMime) {
    description = appendAttachmentToDescription(description, assetUrl, fileFilename, fileMime);
  }
  const title = buildLinearFeedbackTitle({ kind, subject });
  const labelIds = await resolveFeedbackLabelIds(apiKey, teamId, kind);
  const issueInput = {
    teamId,
    title,
    description,
    stateId
  };
  if (labelIds.length > 0) {
    issueInput.labelIds = labelIds;
  }
  const { ok, json } = await linearGraphQL(apiKey, ISSUE_CREATE_MUTATION, {
    input: issueInput
  });
  if (!ok || !json) {
    console.error("Linear feedback: HTTP or parse failure", { ok });
    throw createError({ statusCode: 502, statusMessage: "Could not send feedback. Please try again later." });
  }
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    console.error("Linear feedback GraphQL errors:", json.errors.map((e) => e == null ? void 0 : e.message).join("; "));
    throw createError({ statusCode: 502, statusMessage: "Could not send feedback. Please try again later." });
  }
  const created = (_b = json.data) == null ? void 0 : _b.issueCreate;
  if (!(created == null ? void 0 : created.success) || !((_c = created.issue) == null ? void 0 : _c.identifier)) {
    console.error("Linear feedback: issueCreate unsuccessful", JSON.stringify(created));
    throw createError({ statusCode: 502, statusMessage: "Could not send feedback. Please try again later." });
  }
  return {
    identifier: created.issue.identifier,
    url: (_d = created.issue.url) != null ? _d : null
  };
});

export { feedback_post as default };
//# sourceMappingURL=feedback.post.mjs.map
