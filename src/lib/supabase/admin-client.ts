import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey } from "@/lib/env";
import { getSupabasePublicConfig } from "./public-config";

// Service-role Supabase Auth admin access (e.g. auth.admin.getUserById). Data
// table reads/writes that need service-role privilege go through the
// adminSupabase* REST helpers in src/lib/supabase-rest.ts instead, matching
// the rest of this codebase's REST-over-SDK convention -- this client exists
// specifically for the Auth admin API, which has no REST equivalent used
// elsewhere here.
export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicConfig();

  return createClient(url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
