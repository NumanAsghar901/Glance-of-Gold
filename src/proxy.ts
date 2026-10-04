import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Admin gate. Refreshes the Supabase session cookie and sends signed-out visitors to the
 * login page. This is a fast first check only: every admin page and server action also
 * verifies the admin role through requireAdmin().
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  const isLogin = request.nextUrl.pathname === "/admin/login";

  if (!signedIn && !isLogin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (signedIn && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
