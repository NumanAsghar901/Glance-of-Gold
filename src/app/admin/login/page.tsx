import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="mt-10 border border-border bg-surface p-6 sm:p-8">
          <h1 className="font-heading text-3xl">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Store admin for Glance of Gold.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
