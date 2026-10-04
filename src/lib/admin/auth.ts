import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Verifies the caller is a signed-in admin. Call it first in every admin page and server
 * action. The returned client carries the admin's session, so row level security (not just
 * this check) still limits what it can do.
 */
export async function requireAdmin() {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return { supabase, user: data.user, name: profile.full_name };
}

export type ActionState = { ok?: string; error?: string };
