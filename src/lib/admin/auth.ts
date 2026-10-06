import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Admin role lookups remembered for a minute per server instance. Without this every admin page
 * and action pays a database round trip just to re-read a role that almost never changes. It is
 * only a shortcut: the session client still runs under row level security, which re-checks
 * is_admin() inside the database on every query.
 */
const ADMIN_TTL_MS = 60_000;
const verifiedAdmins = new Map<string, { name: string | null; until: number }>();

/**
 * Verifies the caller is a signed-in admin. Call it first in every admin page and server
 * action. The returned client carries the admin's session, so row level security (not just
 * this check) still limits what it can do.
 *
 * Wrapped in cache() so the layout and the page of one request share a single check.
 * getClaims() verifies the session token locally, with no round trip to the auth server.
 */
export const requireAdmin = cache(async () => {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) redirect("/admin/login");

  const user = { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
  const known = verifiedAdmins.get(claims.sub);
  if (known && known.until > Date.now()) return { supabase, user, name: known.name };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", claims.sub)
    .maybeSingle();
  if (profile?.role !== "admin") {
    verifiedAdmins.delete(claims.sub);
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  verifiedAdmins.set(claims.sub, { name: profile.full_name, until: Date.now() + ADMIN_TTL_MS });
  return { supabase, user, name: profile.full_name };
});

export type ActionState = { ok?: string; error?: string };
