import { d as defineEventHandler, F as getAuthUser, E as createError, G as getBearerToken, H as createSupabaseClientForUser, u as useRuntimeConfig } from '../../../nitro/nitro.mjs';
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
  var _a;
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
  const { data: rows, error } = await client.from("booking_drafts").select("id, shop_id, payload, created_at, updated_at").order("updated_at", { ascending: false });
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
  const list = rows || [];
  const shopIds = [...new Set(list.map((r) => r.shop_id).filter(Boolean))];
  let shopNames = /* @__PURE__ */ new Map();
  if (shopIds.length > 0) {
    const { data: shops } = await client.from("diveshops").select("id, business_name").in("id", shopIds);
    for (const s of shops || []) {
      const row = s;
      if (row.id) shopNames.set(row.id, (_a = row.business_name) != null ? _a : "");
    }
  }
  const drafts = list.map((row) => {
    var _a2;
    return {
      ...row,
      shopName: (_a2 = shopNames.get(String(row.shop_id))) != null ? _a2 : null
    };
  });
  return { drafts };
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
