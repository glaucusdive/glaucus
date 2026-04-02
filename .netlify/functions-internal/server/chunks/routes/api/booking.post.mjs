import { d as defineEventHandler, r as readBody, H as createError, u as useRuntimeConfig, j as getShopById, b as runWithRetries, I as getAuthUser, J as getBearerToken, K as createSupabaseClientForUser } from '../../nitro/nitro.mjs';
import { Resend } from 'resend';
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

function buildDiveshopEmailBody(payload, shopName) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const lines = [
    `Hello ${shopName},`,
    "",
    "Glaucus Dive is an AI assistant for scuba divers looking for a fast and easy way to book dives. The divers below are interested in diving with you! We have compiled the divers' information and dive preferences below. Replying to this email will reply directly to our divers' inbox in Glaucus Dive. Please visit us at https://glaucusdive.com to see your business's profile, claim your business, make any changes, or reach out to us with any questions. Happy diving!",
    "",
    "DIVER(S) INFORMATION",
    "",
    "\u2014 Trip \u2014",
    `Dates: ${payload.startDate} to ${payload.endDate}`,
    `Number of divers: ${(_b = (_a = payload.divers) == null ? void 0 : _a.length) != null ? _b : 0}`,
    ""
  ];
  if (Array.isArray(payload.desiredCourses) && payload.desiredCourses.length > 0) {
    for (const c of payload.desiredCourses) {
      lines.push(`Course interest: ${c}`);
    }
    lines.push("");
  }
  if (Array.isArray(payload.desiredDiveSites) && payload.desiredDiveSites.length > 0) {
    for (const site of payload.desiredDiveSites) {
      lines.push(`Desired dive site: ${site}`);
    }
    lines.push("");
  }
  lines.push("\u2014 Divers \u2014");
  for (let i = 0; i < ((_d = (_c = payload.divers) == null ? void 0 : _c.length) != null ? _d : 0); i++) {
    const d = payload.divers[i];
    const gearItems = Array.isArray(d.gear) && d.gear.length > 0 ? d.gear.map((g) => g == null ? void 0 : g.gearType).filter(Boolean) : [];
    lines.push(
      `Diver ${i + 1}: ${(_e = d.name) != null ? _e : "\u2014"}`,
      `  Certification: ${(_f = d.certificationNumber) != null ? _f : "\u2014"}`,
      `  Dives completed: ${(_g = d.numberOfDives) != null ? _g : "\u2014"}`,
      `  Height: ${(_h = d.height) != null ? _h : "\u2014"} ${((_i = d.heightUnit) != null ? _i : "").trim()}`.trim(),
      `  Weight: ${(_j = d.weight) != null ? _j : "\u2014"} ${((_k = d.weightUnit) != null ? _k : "").trim()}`.trim()
    );
    if (gearItems.length > 0) {
      for (const item of gearItems) {
        lines.push(`  Rental gear: ${item}`);
      }
    } else {
      lines.push("  Rental gear: None");
    }
    lines.push("");
  }
  lines.push(
    "\u2014 Guest contact \u2014",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    "",
    "Sincerely,",
    "Glaucus Dive"
  );
  return lines.join("\n");
}
function buildUserConfirmationBody(shopName, userEmail, shopEmail) {
  return [
    `We've sent your booking request to ${shopName}.`,
    "",
    `They'll contact you at ${userEmail}.`,
    "",
    "If you don't hear back in a few days, reach out to them directly at " + shopEmail + "."
  ].join("\n");
}
async function logSubmissionIfAuthenticated(event, payload) {
  const user = await getAuthUser(event);
  if (!user) return;
  const token = getBearerToken(event);
  if (!token) return;
  const config = useRuntimeConfig();
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  );
  const { error } = await client.from("booking_submissions").insert({
    user_id: user.id,
    shop_id: payload.shopId,
    payload,
    sent_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (error) {
    console.error("Failed to log booking submission:", error.message);
  }
}
async function clearMatchingDraftIfAuthenticated(event, payload) {
  const user = await getAuthUser(event);
  if (!user) return;
  const token = getBearerToken(event);
  if (!token) return;
  const config = useRuntimeConfig();
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  );
  const { error } = await client.from("booking_drafts").delete().eq("user_id", user.id).eq("shop_id", payload.shopId);
  if (error) {
    console.error("Failed to clear matching booking draft after send:", error.message);
  }
}
const booking_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  const shopId = (body == null ? void 0 : body.shopId) && String(body.shopId).trim();
  const name = (body == null ? void 0 : body.name) && String(body.name).trim();
  const email = (body == null ? void 0 : body.email) && String(body.email).trim();
  const startDate = (body == null ? void 0 : body.startDate) && String(body.startDate).trim();
  const endDate = (body == null ? void 0 : body.endDate) && String(body.endDate).trim();
  const divers = Array.isArray(body == null ? void 0 : body.divers) ? body.divers : [];
  if (!shopId) {
    throw createError({ statusCode: 400, statusMessage: "shopId is required" });
  }
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "name is required" });
  }
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: "email is required" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid email" });
  }
  if (!startDate) {
    throw createError({ statusCode: 400, statusMessage: "startDate is required" });
  }
  if (!endDate) {
    throw createError({ statusCode: 400, statusMessage: "endDate is required" });
  }
  if (divers.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "At least one diver is required" });
  }
  const config = useRuntimeConfig();
  const supabaseUrl = config.public.supabaseUrl;
  const supabaseKey = config.public.supabaseKey;
  const resendApiKey = config.resendApiKey;
  if (!resendApiKey) {
    throw createError({ statusCode: 500, statusMessage: "Email is not configured (RESEND_API_KEY missing)" });
  }
  const rawFrom = config.bookingFromEmail;
  const fromEmail = typeof rawFrom === "string" ? rawFrom.trim() : "";
  if (!fromEmail) {
    throw createError({ statusCode: 500, statusMessage: "Email is not configured (booking from address missing)" });
  }
  const shop = await getShopById(supabaseUrl, supabaseKey, shopId);
  if (!shop) {
    throw createError({ statusCode: 404, statusMessage: "Dive shop not found" });
  }
  if (!shop.email || !String(shop.email).trim()) {
    throw createError({ statusCode: 400, statusMessage: "This shop has no email on file." });
  }
  const shopEmail = String(shop.email).trim();
  const resend = new Resend(resendApiKey);
  const shopName = shop.business_name || "Dive shop";
  const payload = {
    shopId,
    name,
    email,
    startDate,
    endDate,
    desiredCourses: Array.isArray(body.desiredCourses) ? body.desiredCourses : [],
    desiredDiveSites: Array.isArray(body.desiredDiveSites) ? body.desiredDiveSites : [],
    divers
  };
  const diveshopSubject = `Dive trip booking request from ${name} via Glaucus`;
  const diveshopText = buildDiveshopEmailBody(payload, shopName);
  let toShop;
  try {
    toShop = await runWithRetries(
      async () => {
        const { data, error: errShop } = await resend.emails.send({
          from: fromEmail,
          to: [shopEmail],
          subject: diveshopSubject,
          text: diveshopText
        });
        if (errShop) {
          throw Object.assign(new Error(errShop.message || "Failed to send email to dive shop"), {
            resendMessage: errShop.message
          });
        }
        return data;
      },
      {
        maxAttempts: 4,
        baseDelayMs: 400,
        onRetry: ({ attempt, maxAttempts, error }) => {
          console.warn(`[booking] shop email attempt ${attempt}/${maxAttempts} failed, retrying:`, error);
        }
      }
    );
  } catch (e) {
    const msg = (e == null ? void 0 : e.resendMessage) || (e == null ? void 0 : e.message) || "Failed to send email to dive shop";
    throw createError({
      statusCode: 502,
      statusMessage: msg,
      data: { message: msg, resendError: (_a = e == null ? void 0 : e.resendMessage) != null ? _a : e == null ? void 0 : e.message }
    });
  }
  await logSubmissionIfAuthenticated(event, payload);
  await clearMatchingDraftIfAuthenticated(event, payload);
  const userSubject = `We've sent your booking request to ${shopName}`;
  const userText = buildUserConfirmationBody(shopName, email, shopEmail);
  let errUser = null;
  try {
    await runWithRetries(
      async () => {
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: [email],
          subject: userSubject,
          text: userText
        });
        if (error) {
          throw new Error(error.message || "Failed to send confirmation email");
        }
      },
      {
        maxAttempts: 4,
        baseDelayMs: 400,
        onRetry: ({ attempt, maxAttempts, error }) => {
          console.warn(`[booking] user confirmation attempt ${attempt}/${maxAttempts} failed, retrying:`, error);
        }
      }
    );
  } catch (e) {
    errUser = { message: e == null ? void 0 : e.message };
  }
  if (errUser) {
    return {
      sent: true,
      message: "Your request was sent to the dive shop. Confirmation email could not be sent; please check your email address.",
      emailId: toShop == null ? void 0 : toShop.id
    };
  }
  return {
    sent: true,
    message: "Booking request sent. Check your email for confirmation."
  };
});

export { booking_post as default };
//# sourceMappingURL=booking.post.mjs.map
