import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (
          entries: { name: string; value: string; options?: Record<string, unknown> }[]
        ) => {
          for (const { name, value, options } of entries) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Next may call this in a read-only context; ignore.
            }
          }
        },
      },
    }
  );
}

/**
 * Service-role client. Never expose to the browser.
 * Used by webhooks and internal jobs that must bypass RLS.
 */
export function createServiceSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
