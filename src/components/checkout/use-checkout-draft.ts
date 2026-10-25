"use client";

import { useCallback, useEffect, useRef } from "react";
import { saveCheckoutDraft } from "@/app/actions/checkout-draft";
import type { CartLine } from "@/lib/cart-store";
import { normalizePhone } from "@/lib/pakistan";

const DELAY_MS = 1500;

/**
 * Quietly saves what the customer has typed at checkout, a moment after they stop typing, once they have entered a
 * phone number we could reach them on. If they never place the order, the owner sees it under Abandoned checkouts.
 * Call `schedule` from the form's change and blur events, and `stop` when the order is submitted.
 */
export function useCheckoutDraft(lines: CartLine[], method: string, formId: string) {
  const timer = useRef<number | undefined>(undefined);
  const stopped = useRef(false);
  const lastSent = useRef("");
  const bag = useRef({ lines, method });
  // The latest bag is read when the timer fires, not when it was scheduled.
  useEffect(() => {
    bag.current = { lines, method };
  }, [lines, method]);

  const flush = useCallback(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement) || stopped.current) return;
    const data = new FormData(form);
    const field = (name: string) => String(data.get(name) ?? "");
    if (!normalizePhone(field("phone")) || bag.current.lines.length === 0) return;

    const payload = {
      phone: field("phone"),
      name: field("name"),
      email: field("email"),
      province: field("province"),
      city: field("city"),
      address: field("address"),
      landmark: field("landmark"),
      paymentMethod: bag.current.method,
      items: bag.current.lines.map((l) => ({ name: l.name, variantName: l.variantName, qty: l.qty, price: l.price })),
    };
    const key = JSON.stringify(payload);
    if (key === lastSent.current) return;
    lastSent.current = key;
    void saveCheckoutDraft(payload);
  }, [formId]);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, DELAY_MS);
  }, [flush]);

  const stop = useCallback(() => {
    stopped.current = true;
    window.clearTimeout(timer.current);
  }, []);

  /** After a failed submit the customer is still at checkout, so saving resumes. */
  const resume = useCallback(() => {
    stopped.current = false;
  }, []);

  // A change to the bag or the payment method also counts, once there is a phone number.
  useEffect(() => {
    schedule();
    return () => window.clearTimeout(timer.current);
  }, [lines, method, schedule]);

  return { schedule, stop, resume };
}
