import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const READ_TIMEOUT_MS = 8000;

/**
 * Cookie-less anon client for public storefront reads (catalogue, offers,
 * settings). It never touches cookies/headers, so pages that use it can be
 * cached and served fast. RLS limits it to active, public data.
 *
 * Every request has a timeout: if the database is slow or unreachable, a page
 * fails fast and keeps serving its last cached version instead of hanging.
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const timeout = AbortSignal.timeout(READ_TIMEOUT_MS);
          const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
          return fetch(input, { ...init, signal });
        },
      },
    },
  );
}
