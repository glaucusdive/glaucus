import { d as defineEventHandler, F as getAuthUser, E as createError, I as getRouterParam, G as getBearerToken, H as createSupabaseClientForUser, u as useRuntimeConfig } from '../../../../nitro/nitro.mjs';
import '@supabase/supabase-js';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '@iconify/utils';
import 'consola';

const _id__get = defineEventHandler(async (event) => {
  var _a;
  const user = await getAuthUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Draft id is required" });
  }
  const config = useRuntimeConfig();
  const token = getBearerToken(event);
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  );
  const { data: row, error } = await client.from("booking_drafts").select("id, shop_id, payload, created_at, updated_at").eq("id", id).maybeSingle();
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Draft not found" });
  }
  const shopId = row.shop_id;
  const { data: shopRow } = await client.from("diveshops").select("business_name").eq("id", shopId).maybeSingle();
  return {
    ...row,
    shopName: (_a = shopRow == null ? void 0 : shopRow.business_name) != null ? _a : null
  };
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
