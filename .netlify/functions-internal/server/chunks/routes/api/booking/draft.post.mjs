import { d as defineEventHandler, I as getAuthUser, H as createError, r as readBody, J as getBearerToken, K as createSupabaseClientForUser, u as useRuntimeConfig } from '../../../nitro/nitro.mjs';
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

const draft_post = defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  const body = await readBody(event).catch(() => null);
  const shopId = (body == null ? void 0 : body.shopId) && String(body.shopId).trim();
  const payload = (body == null ? void 0 : body.payload) && typeof body.payload === "object" ? body.payload : null;
  const draftId = (body == null ? void 0 : body.draftId) && String(body.draftId).trim() || void 0;
  if (!shopId) {
    throw createError({ statusCode: 400, statusMessage: "shopId is required" });
  }
  if (!payload) {
    throw createError({ statusCode: 400, statusMessage: "payload is required" });
  }
  const config = useRuntimeConfig();
  const token = getBearerToken(event);
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  );
  if (draftId) {
    const { data: data2, error: error2 } = await client.from("booking_drafts").update({ shop_id: shopId, payload, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", draftId).eq("user_id", user.id).select("id").maybeSingle();
    if (error2) {
      throw createError({ statusCode: 500, statusMessage: error2.message });
    }
    if (!(data2 == null ? void 0 : data2.id)) {
      throw createError({ statusCode: 404, statusMessage: "Draft not found" });
    }
    return { draftId: data2.id, updated: true };
  }
  const { data, error } = await client.from("booking_drafts").upsert(
    {
      user_id: user.id,
      shop_id: shopId,
      payload,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    { onConflict: "user_id,shop_id" }
  ).select("id").maybeSingle();
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
  if (!(data == null ? void 0 : data.id)) {
    throw createError({ statusCode: 500, statusMessage: "Draft save returned no row" });
  }
  return { draftId: data.id, updated: false };
});

export { draft_post as default };
//# sourceMappingURL=draft.post.mjs.map
