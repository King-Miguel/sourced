import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isAppConfigured } from "@/lib/env";

let cachedClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service role key. Bypasses RLS.
 * Never import this from a Client Component, and never expose the service
 * role key to the browser.
 *
 * Returns null when Supabase env vars are missing so callers can render a
 * "Setup required" response instead of throwing.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isAppConfigured()) return null;
  if (cachedClient) return cachedClient;

  cachedClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
