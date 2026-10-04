"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { submitPaymentProof, type ProofState } from "@/app/actions/order";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { cartActions } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

/** Empties the bag once the order page has loaded, and fires the Purchase pixel once per order. */
export function OrderPlaced({ eventId, value, ids }: { eventId: string; value: number; ids: string[] }) {
  useEffect(() => {
    cartActions.clear();
    try {
      const key = `gog-purchase-${eventId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* sessionStorage unavailable: worst case the pixel dedupes by event id */
    }
    track("Purchase", { value, currency: "PKR", content_ids: ids, content_type: "product" }, eventId);
  }, [eventId, value, ids]);
  return null;
}

const inputClass =
  "h-12 w-full border border-border bg-surface px-4 text-base transition-colors duration-200 placeholder:text-muted-foreground hover:border-gold focus-visible:border-gold sm:text-sm";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? "Please wait..." : children}
    </Button>
  );
}

export function PaymentProofForm({ token }: { token: string }) {
  const [state, action] = useActionState<ProofState, FormData>(submitPaymentProof, {});

  if (state.ok) {
    return (
      <p role="status" className="border border-gold bg-sand/60 px-4 py-4 text-sm">
        Thank you. We have received your payment details and will verify them shortly. We will confirm your order on WhatsApp.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p role="alert" className="border border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="transactionId" className="mb-2 block text-sm">
          Transaction ID
        </label>
        <input id="transactionId" name="transactionId" required autoComplete="off" className={inputClass} />
      </div>
      <div>
        <label htmlFor="screenshot" className="mb-2 block text-sm">
          Screenshot of payment <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="screenshot"
          name="screenshot"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={cn(inputClass, "h-auto py-3 file:mr-4 file:border-0 file:bg-sand file:px-4 file:py-2 file:text-sm")}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB.</p>
      </div>
      <Submit>Send payment details</Submit>
    </form>
  );
}
