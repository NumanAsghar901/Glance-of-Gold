import { z } from "zod";
import { normalizePhone, PROVINCES } from "@/lib/pakistan";

// Server code keeps importing these from here; client code must import "@/lib/pakistan" directly.
export { normalizePhone, PROVINCES };

const phone = z
  .string()
  .trim()
  .min(1, "Enter your phone number")
  .refine((v) => normalizePhone(v) !== null, "Enter a valid mobile number, e.g. 0300 1234567")
  .transform((v) => normalizePhone(v) as string);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const cartPayloadSchema = z.object({
  items: z
    .array(z.object({ variantId: z.number().int().positive(), qty: z.number().int().min(1).max(20) }))
    .min(1, "Your bag is empty")
    .max(50),
  giftVariantId: z.number().int().positive().nullable().optional(),
  couponCode: z.string().trim().max(32).nullable().optional(),
});

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone,
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || z.email().safeParse(v).success, "Enter a valid email address"),
  province: z.enum(PROVINCES, { message: "Select your province" }),
  city: z.string().trim().min(2, "Enter your city").max(60),
  address: z.string().trim().min(8, "Enter your full delivery address").max(250),
  landmark: optionalText(120),
  notes: optionalText(300),
  paymentMethod: z.enum(["cod", "jazzcash", "easypaisa", "bank_transfer"], {
    message: "Choose a payment method",
  }),
  submissionId: z.uuid(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const trackSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(GG-)?\d{4,8}$/, "Enter your order number, e.g. GG-10001")
    .transform((v) => (v.startsWith("GG-") ? v : `GG-${v}`)),
  phone,
});

export const paymentProofSchema = z.object({
  token: z.uuid(),
  transactionId: z.string().trim().min(4, "Enter the transaction ID").max(60),
});
