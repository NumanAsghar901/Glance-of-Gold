"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { getProofTicket, submitPaymentProof, type ProofState } from "@/app/actions/order";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { cartActions } from "@/lib/cart-store";
import { PROOF_EDGE } from "@/lib/cloudinary";
import { ACCEPT, lighten, sendToCloudinary } from "@/lib/cloudinary-upload";
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

type Screenshot = { name: string; progress: number; error?: string; publicId?: string };

export function PaymentProofForm({ token }: { token: string }) {
  const [state, action] = useActionState<ProofState, FormData>(submitPaymentProof, {});
  const input = useRef<HTMLInputElement>(null);
  const [shot, setShot] = useState<Screenshot | null>(null);
  const uploading = !!shot && !shot.publicId && !shot.error;

  // The form cannot be sent while the screenshot is still on its way.
  useEffect(() => {
    input.current?.setCustomValidity(uploading ? "Please wait until the screenshot has finished uploading." : "");
  }, [uploading]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = ""; // the file is kept below, not in the box
    if (!file) return;
    setShot({ name: file.name, progress: 0 });

    const ticket = await getProofTicket(token);
    if ("error" in ticket) {
      setShot({ name: file.name, progress: 0, error: ticket.error });
      return;
    }
    try {
      const ready = await lighten(file, PROOF_EDGE);
      const sent = await sendToCloudinary(ready, ticket.ticket, (progress) => setShot((s) => (s ? { ...s, progress } : s)));
      setShot({ name: file.name, progress: 1, publicId: sent.publicId });
    } catch (err) {
      setShot({ name: file.name, progress: 0, error: err instanceof Error ? err.message : "The upload failed." });
    }
  }

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
      {/* Controlled, so the form clearing itself after a failed attempt cannot lose an uploaded screenshot. */}
      <input type="hidden" name="screenshot" value={shot?.publicId ?? ""} readOnly />
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
          ref={input}
          id="screenshot"
          type="file"
          accept={ACCEPT}
          onChange={onPick}
          aria-describedby="screenshot-status"
          className={cn(inputClass, "h-auto py-3 file:mr-4 file:border-0 file:bg-sand file:px-4 file:py-2 file:text-sm")}
        />
        <p id="screenshot-status" role="status" className="mt-1.5 text-xs text-muted-foreground">
          {!shot
            ? "JPG, PNG or WebP."
            : shot.error
              ? <span className="text-danger">{shot.error}</span>
              : shot.publicId
                ? `${shot.name} is attached.`
                : `Uploading ${shot.name}, ${Math.round(shot.progress * 100)}%`}
        </p>
      </div>
      <Submit>Send payment details</Submit>
    </form>
  );
}
