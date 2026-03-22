import { d as defineEventHandler, o as getAuthUser, n as createError, v as getRouterParam, q as getBearerToken, s as createSupabaseClientForUser, u as useRuntimeConfig } from '../../../../nitro/nitro.mjs';
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
  const { data, error } = await client.from("booking_drafts").select(`
      id,
      shop_id,
      payload,
      created_at,
      updated_at,
      diveshops ( id, business_name )
    `).eq("id", id).single();
  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: "Draft not found" });
  }
  const shop = data.diveshops;
  const { diveshops: _, ...rest } = data;
  return {
    ...rest,
    shopName: (_a = shop == null ? void 0 : shop.business_name) != null ? _a : null
  };
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
