"use server";

import { z } from "zod";
import { sendContactMessage } from "@/lib/email/send-order";
import { rateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/validators";

export type ContactState = {
  ok?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    phone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => v === undefined || normalizePhone(v) !== null, "Enter a valid mobile number, e.g. 0300 1234567"),
    email: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => v === undefined || z.email().safeParse(v).success, "Enter a valid email address"),
    message: z.string().trim().min(10, "Write a little more so we can help").max(1500),
  })
  .refine((d) => d.phone || d.email, { message: "Add a phone number or an email so we can reply", path: ["phone"] });

export async function sendMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const values = Object.fromEntries(["name", "phone", "email", "message"].map((k) => [k, String(formData.get(k) ?? "")]));
  if (formData.get("website")) return { error: "We could not send your message. Please try again.", values };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Please check the highlighted fields.", fieldErrors, values };
  }

  if (!(await rateLimit("contact", 4, 10 * 60_000))) {
    return { error: "You have sent several messages already. Please wait a few minutes or message us on WhatsApp.", values };
  }

  const sent = await sendContactMessage(parsed.data);
  if (!sent) return { error: "We could not send your message right now. Please message us on WhatsApp instead.", values };
  return { ok: "Thank you. Your message has been sent and we will reply soon." };
}
