/**
 * Creates (or resets) the admin account.
 *
 *   npm run create-admin
 *
 * Reads ADMIN_EMAIL, ADMIN_PASSWORD, NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY from .env.local. Credentials are never stored in the repo.
 */
import { createClient } from "@supabase/supabase-js";

const { ADMIN_EMAIL, ADMIN_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
  process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env. Set ADMIN_EMAIL, ADMIN_PASSWORD, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserId(email: string) {
  // Small user base (admins only), so listing one page is enough.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
}

async function main() {
  const email = ADMIN_EMAIL!;
  let id = await findUserId(email);

  if (id) {
    const { error } = await supabase.auth.admin.updateUserById(id, {
      password: ADMIN_PASSWORD!,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`Updated existing user ${email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: ADMIN_PASSWORD!,
      email_confirm: true,
    });
    if (error) throw error;
    id = data.user.id;
    console.log(`Created user ${email}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id, full_name: "Glance of Gold Admin", role: "admin" });
  if (profileError) throw profileError;

  console.log("Admin profile ready. You can sign in at /admin/login.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
