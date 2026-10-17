import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createSupabaseServerClient(learnerId?: string): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    ...(learnerId ? { global: { headers: { "x-learner-id": learnerId } } } : {}),
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; middleware/actions handle refresh writes.
        }
      },
    },
  });
}

/** Server-only elevated client for controlled operations such as authoritative grading.
 * The key is never sent to the browser. Callers must perform their own actor checks
 * before using it; it exists because student RLS must not expose answer keys. */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createServerClient(url, key, { cookies: { getAll: () => [], setAll: () => undefined } }) : null;
}
