"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin, type ActionState } from "@/lib/admin/auth";

// Payment accounts ------------------------------------------------------------------

const accountSchema = z.object({
  id: z.coerce.number().int().positive(),
  accountTitle: z.string().trim().max(80).optional(),
  accountNumber: z.string().trim().max(60).optional(),
  iban: z.string().trim().max(40).optional(),
  bankName: z.string().trim().max(80).optional(),
  instructions: z.string().trim().max(400).optional(),
  isActive: z.boolean(),
});

export async function savePaymentAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = accountSchema.safeParse({
    id: formData.get("id"),
    accountTitle: formData.get("accountTitle") || undefined,
    accountNumber: formData.get("accountNumber") || undefined,
    iban: formData.get("iban") || undefined,
    bankName: formData.get("bankName") || undefined,
    instructions: formData.get("instructions") || undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: "Please check the account details." };
  const v = parsed.data;
  if (v.isActive && !v.accountNumber && !v.iban) {
    return { error: "Enter an account number or IBAN before turning this method on." };
  }

  const { error } = await supabase
    .from("payment_accounts")
    .update({
      account_title: v.accountTitle ?? null,
      account_number: v.accountNumber ?? null,
      iban: v.iban ?? null,
      bank_name: v.bankName ?? null,
      instructions: v.instructions ?? null,
      is_active: v.isActive,
    })
    .eq("id", v.id);
  if (error) return { error: error.message };

  updateTag("settings");
  revalidatePath("/admin/payments");
  return { ok: v.isActive ? "Saved. Customers can now choose this method at checkout." : "Saved. This method is hidden at checkout." };
}

// Settings --------------------------------------------------------------------------

const settingsSchema = z.object({
  shippingFlat: z.coerce.number().int().min(0).max(100000),
  freeShippingThreshold: z.coerce.number().int().min(0).max(10_000_000),
  deliveryDaysMin: z.coerce.number().int("Delivery days must be whole numbers").min(1, "Delivery time must be at least 1 day").max(60),
  deliveryDaysMax: z.coerce.number().int("Delivery days must be whole numbers").min(1).max(60),
  courier: z.string().trim().min(2).max(60),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s+()-]/g, ""))
    .refine((v) => /^92\d{10}$/.test(v), "Enter the WhatsApp number as 923001234567 (country code 92, no leading zero)"),
  helpline: z.string().trim().min(5).max(30),
  email: z.string().trim().email("Enter a valid email address").max(120),
});

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = settingsSchema.safeParse({
    shippingFlat: formData.get("shippingFlat"),
    freeShippingThreshold: formData.get("freeShippingThreshold"),
    deliveryDaysMin: formData.get("deliveryDaysMin"),
    deliveryDaysMax: formData.get("deliveryDaysMax"),
    courier: formData.get("courier"),
    whatsapp: formData.get("whatsapp"),
    helpline: formData.get("helpline"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the settings." };
  const v = parsed.data;
  if (v.deliveryDaysMax < v.deliveryDaysMin) return { error: "The longest delivery time cannot be shorter than the shortest." };

  const { error } = await supabase.from("settings").upsert([
    { key: "shipping_flat", value: v.shippingFlat },
    { key: "free_shipping_threshold", value: v.freeShippingThreshold },
    { key: "delivery_days_min", value: v.deliveryDaysMin },
    { key: "delivery_days_max", value: v.deliveryDaysMax },
    { key: "courier", value: v.courier },
    { key: "whatsapp_number", value: v.whatsapp },
    { key: "helpline", value: v.helpline },
    { key: "contact_email", value: v.email },
  ]);
  if (error) return { error: error.message };

  updateTag("settings");
  revalidatePath("/admin/settings");
  return { ok: "Settings saved." };
}
