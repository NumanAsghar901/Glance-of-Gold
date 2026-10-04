"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createSessionClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

const loginSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(200),
});

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!(await rateLimit("admin-login", 8, 10 * 60_000))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email and password." };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  // One message for every failure so the form cannot be used to discover accounts.
  if (error || !data.user) return { error: "Email or password is incorrect." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Email or password is incorrect." };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
