import { d as defineEventHandler, A as getAuthUser, z as createError, B as getBearerToken, C as createSupabaseClientForUser, u as useRuntimeConfig } from '../../../nitro/nitro.mjs';
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

const index_get = defineEventHandler(async (event) => {
  const user = await getAuthUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
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
    `).order("updated_at", { ascending: false });
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
  const drafts = (data || []).map((row) => {
    var _a;
    const shop = row.diveshops;
    const { diveshops: _, ...rest } = row;
    return {
      ...rest,
      shopName: (_a = shop == null ? void 0 : shop.business_name) != null ? _a : null
    };
  });
  return { drafts };
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
