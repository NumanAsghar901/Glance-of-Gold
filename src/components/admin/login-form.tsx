"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/actions/admin-auth";
import { SubmitButton } from "@/components/admin/action-form";
import { Field, Input } from "@/components/admin/ui";

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form action={action} className="mt-6 space-y-5">
      {state.error && (
        <p role="alert" className="border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Signing in...">
        Sign in
      </SubmitButton>
    </form>
  );
}
