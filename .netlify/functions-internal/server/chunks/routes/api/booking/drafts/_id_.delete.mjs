import { d as defineEventHandler, j as getAuthUser, i as createError, m as getRouterParam, k as getBearerToken, l as createSupabaseClientForUser, u as useRuntimeConfig } from '../../../../nitro/nitro.mjs';
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

const _id__delete = defineEventHandler(async (event) => {
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
  const { error } = await client.from("booking_drafts").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
  return { deleted: true };
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
