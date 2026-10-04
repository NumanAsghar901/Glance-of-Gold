"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendMessage, type ContactState } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputClass = (error?: string) =>
  cn(
    "w-full border bg-surface px-4 text-base transition-colors duration-200 placeholder:text-muted-foreground hover:border-gold focus-visible:border-gold sm:text-sm",
    error ? "border-danger" : "border-border",
  );

function Send() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Sending..." : "Send message"}
    </Button>
  );
}

export function ContactForm() {
  const [state, action] = useActionState<ContactState, FormData>(sendMessage, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  if (state.ok) {
    return (
      <p role="status" className="border border-gold bg-sand/60 px-5 py-6 text-[0.9375rem]">
        {state.ok}
      </p>
    );
  }

  const field = (id: string, label: string, input: React.ReactNode, hint?: string) => (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm">
        {label}
      </label>
      {input}
      {hint && !fe[id] && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      {fe[id] && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {fe[id]}
        </p>
      )}
    </div>
  );

  return (
    <form action={action} className="space-y-5" noValidate>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {field("name", "Your name", <input id="name" name="name" autoComplete="name" defaultValue={v.name} required aria-invalid={!!fe.name} aria-describedby={fe.name ? "name-error" : undefined} className={cn(inputClass(fe.name), "h-12")} />)}
      <div className="grid gap-5 sm:grid-cols-2">
        {field("phone", "Mobile number", <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" defaultValue={v.phone} aria-invalid={!!fe.phone} aria-describedby={fe.phone ? "phone-error" : undefined} className={cn(inputClass(fe.phone), "h-12")} />)}
        {field("email", "Email (optional)", <input id="email" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={v.email} aria-invalid={!!fe.email} aria-describedby={fe.email ? "email-error" : undefined} className={cn(inputClass(fe.email), "h-12")} />)}
      </div>
      {field("message", "How can we help?", <textarea id="message" name="message" rows={5} defaultValue={v.message} required aria-invalid={!!fe.message} aria-describedby={fe.message ? "message-error" : undefined} className={cn(inputClass(fe.message), "py-3")} />, "Include your order number if it is about an order.")}
      <Send />
    </form>
  );
}
