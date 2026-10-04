import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Verifies the caller is a signed-in admin. Call it first in every admin page and server
 * action. The returned client carries the admin's session, so row level security (not just
 * this check) still limits what it can do.
 *
 * Wrapped in cache() so the layout and the page of one request share a single check.
 * getClaims() verifies the session token without an extra round trip to the auth server.
 */
export const requireAdmin = cache(async () => {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", claims.sub)
    .maybeSingle();
  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return {
    supabase,
    user: { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" },
    name: profile.full_name,
  };
});

export type ActionState = { ok?: string; error?: string };
