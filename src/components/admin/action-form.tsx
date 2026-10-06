"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/admin/auth";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  pendingLabel = "Saving...",
}: {
  children: ReactNode;
  variant?: "primary" | "outline" | "dark" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Text shown while the action runs; pass null to keep the normal label. */
  pendingLabel?: string | null;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} className={className}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/** Form wired to a server action, with a success or error notice. */
export function ActionForm({
  action,
  children,
  className,
  submitLabel = "Save changes",
  hideSubmit,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  submitLabel?: string;
  hideSubmit?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const notice = useRef<HTMLParagraphElement>(null);

  // The result appears right under the button that was pressed. If that is near the edge of the screen
  // (long forms, phones), nudge it fully into view.
  useEffect(() => {
    notice.current?.scrollIntoView({ block: "nearest" });
  }, [state]);

  return (
    <form action={formAction} className={cn("space-y-5", className)}>
      {children}
      {!hideSubmit && <SubmitButton>{submitLabel}</SubmitButton>}
      {state.error && (
        <p ref={notice} role="alert" className="scroll-mb-6 border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p ref={notice} role="status" className="scroll-mb-6 border border-gold bg-sand/60 px-4 py-3 text-sm">
          {state.ok}
        </p>
      )}
    </form>
  );
}

/** One-click server action (delete, toggle, resend) with an optional confirmation prompt. */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "outline",
  size = "sm",
  className,
  fields,
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  confirm?: string;
  variant?: "primary" | "outline" | "dark" | "ghost";
  size?: "sm" | "md";
  className?: string;
  fields?: Record<string, string | number>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline"
    >
      {fields && Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton variant={variant} size={size} className={className} pendingLabel={null}>
        {children}
      </SubmitButton>
    </form>
  );
}
