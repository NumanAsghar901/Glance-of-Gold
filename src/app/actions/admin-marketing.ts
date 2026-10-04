"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin, type ActionState } from "@/lib/admin/auth";
import { removeStoredImages, uploadPublicImage } from "@/lib/admin/storage";
import { fromPktInput } from "@/lib/datetime";

const idSchema = z.coerce.number().int().positive();
const optionalInt = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.coerce.number().int().min(0).nullable());

function refreshMarketing(path: string) {
  updateTag("marketing");
  revalidatePath(path);
}

// Coupons ------------------------------------------------------------------------

const couponSchema = z
  .object({
    id: idSchema.optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,32}$/, "Use 3 to 32 letters, numbers, dashes or underscores for the code"),
    description: z.string().trim().max(200).optional(),
    discountType: z.enum(["percent", "fixed"]),
    value: z.coerce.number().int().min(0).max(10_000_000),
    minSubtotal: z.coerce.number().int().min(0).max(10_000_000).default(0),
    maxDiscount: optionalInt,
    usageLimit: optionalInt,
    oncePerPhone: z.boolean(),
    freeShipping: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((c) => c.discountType !== "percent" || c.value <= 100, { message: "A percentage cannot be more than 100", path: ["value"] })
  .refine((c) => c.freeShipping || c.value > 0, { message: "Enter a discount amount, or tick free delivery", path: ["value"] });

export async function saveCoupon(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = couponSchema.safeParse({
    id: formData.get("id") || undefined,
    code: formData.get("code"),
    description: formData.get("description") || undefined,
    discountType: formData.get("discountType"),
    value: formData.get("value") || 0,
    minSubtotal: formData.get("minSubtotal") || 0,
    maxDiscount: formData.get("maxDiscount"),
    usageLimit: formData.get("usageLimit"),
    oncePerPhone: formData.get("oncePerPhone") === "on",
    freeShipping: formData.get("freeShipping") === "on",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the coupon details." };
  const v = parsed.data;

  const row = {
    code: v.code,
    description: v.description ?? null,
    discount_type: v.discountType,
    value: v.value,
    min_subtotal: v.minSubtotal,
    max_discount: v.maxDiscount && v.maxDiscount > 0 ? v.maxDiscount : null,
    usage_limit: v.usageLimit && v.usageLimit > 0 ? v.usageLimit : null,
    once_per_phone: v.oncePerPhone,
    free_shipping: v.freeShipping,
    starts_at: fromPktInput(formData.get("startsAt")),
    expires_at: fromPktInput(formData.get("expiresAt")),
    is_active: v.isActive,
  };

  const { error } = v.id
    ? await supabase.from("coupons").update(row).eq("id", v.id)
    : await supabase.from("coupons").insert(row);
  if (error) return { error: error.code === "23505" ? "A coupon with that code already exists." : error.message };

  revalidatePath("/admin/coupons");
  return { ok: v.id ? "Coupon saved." : "Coupon created." };
}

export async function deleteCoupon(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  // A coupon that has been used cannot be deleted without losing order history, so switch it off instead.
  if (error?.code === "23503") await supabase.from("coupons").update({ is_active: false }).eq("id", id);
  revalidatePath("/admin/coupons");
}

// Free gift offer ------------------------------------------------------------------

const giftSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2, "Give the offer a name").max(80),
  minItems: z.coerce.number().int().min(1).max(20),
  isActive: z.boolean(),
  variantIds: z.array(idSchema).max(60),
});

export async function saveGiftOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = giftSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    minItems: formData.get("minItems") || 2,
    isActive: formData.get("isActive") === "on",
    variantIds: formData.getAll("variantIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the offer details." };
  const v = parsed.data;
  if (v.isActive && v.variantIds.length === 0) return { error: "Choose at least one gift before switching the offer on." };

  const row = {
    name: v.name,
    min_items: v.minItems,
    is_active: v.isActive,
    starts_at: fromPktInput(formData.get("startsAt")),
    ends_at: fromPktInput(formData.get("endsAt")),
  };

  let offerId = v.id;
  if (offerId) {
    const { error } = await supabase.from("gift_offers").update(row).eq("id", offerId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from("gift_offers").insert(row).select("id").single();
    if (error) return { error: error.message };
    offerId = data.id;
  }

  const { data: current } = await supabase.from("gift_offer_products").select("variant_id").eq("offer_id", offerId);
  const have = new Set((current ?? []).map((c) => c.variant_id));
  const want = new Set(v.variantIds);
  const remove = [...have].filter((x) => !want.has(x));
  const add = [...want].filter((x) => !have.has(x));
  if (remove.length) await supabase.from("gift_offer_products").delete().eq("offer_id", offerId).in("variant_id", remove);
  if (add.length) await supabase.from("gift_offer_products").insert(add.map((variant_id) => ({ offer_id: offerId!, variant_id })));

  refreshMarketing("/admin/gifts");
  return { ok: "Free gift offer saved." };
}

// Announcement bar -----------------------------------------------------------------

const announcementSchema = z.object({
  id: idSchema.optional(),
  message: z.string().trim().min(2, "Enter the message").max(140),
  linkUrl: z.string().trim().max(200).optional(),
  couponCode: z.string().trim().toUpperCase().max(32).optional(),
  sort: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: z.boolean(),
});

export async function saveAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = announcementSchema.safeParse({
    id: formData.get("id") || undefined,
    message: formData.get("message"),
    linkUrl: formData.get("linkUrl") || undefined,
    couponCode: formData.get("couponCode") || undefined,
    sort: formData.get("sort") || 0,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the details." };
  const v = parsed.data;
  if (v.linkUrl && !/^(\/|https?:\/\/)/.test(v.linkUrl)) return { error: "The link must start with / or https://" };

  const row = {
    message: v.message,
    link_url: v.linkUrl ?? null,
    coupon_code: v.couponCode ?? null,
    sort: v.sort,
    is_active: v.isActive,
    starts_at: fromPktInput(formData.get("startsAt")),
    ends_at: fromPktInput(formData.get("endsAt")),
  };
  const { error } = v.id
    ? await supabase.from("announcements").update(row).eq("id", v.id)
    : await supabase.from("announcements").insert(row);
  if (error) return { error: error.message };

  refreshMarketing("/admin/announcements");
  return { ok: v.id ? "Announcement saved." : "Announcement added." };
}

export async function deleteAnnouncement(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("announcements").delete().eq("id", idSchema.parse(formData.get("id")));
  refreshMarketing("/admin/announcements");
}

// Home banner -------------------------------------------------------------------------

const bannerSchema = z.object({
  id: idSchema.optional(),
  heading: z.string().trim().max(80).optional(),
  subheading: z.string().trim().max(200).optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaUrl: z.string().trim().max(200).optional(),
  sort: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: z.boolean(),
});

export async function saveBanner(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = bannerSchema.safeParse({
    id: formData.get("id") || undefined,
    heading: formData.get("heading") || undefined,
    subheading: formData.get("subheading") || undefined,
    ctaLabel: formData.get("ctaLabel") || undefined,
    ctaUrl: formData.get("ctaUrl") || undefined,
    sort: formData.get("sort") || 0,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the details." };
  const v = parsed.data;
  if (v.ctaUrl && !/^(\/|https?:\/\/)/.test(v.ctaUrl)) return { error: "The button link must start with / or https://" };

  const { data: existing } = v.id
    ? await supabase.from("banners").select("image_url, mobile_image_url").eq("id", v.id).maybeSingle()
    : { data: null };

  const desktopFile = formData.get("image");
  const mobileFile = formData.get("mobileImage");
  const removeMobile = formData.get("removeMobileImage") === "on";

  const uploaded: string[] = [];
  let imageUrl: string | undefined;
  let mobileUrl: string | undefined;
  try {
    if (desktopFile instanceof File && desktopFile.size > 0) {
      imageUrl = await uploadPublicImage(supabase, "banners", desktopFile);
      uploaded.push(imageUrl);
    }
    if (mobileFile instanceof File && mobileFile.size > 0) {
      mobileUrl = await uploadPublicImage(supabase, "banners", mobileFile);
      uploaded.push(mobileUrl);
    }
  } catch (e) {
    await removeStoredImages(supabase, ...uploaded);
    return { error: e instanceof Error ? e.message : "Image upload failed." };
  }
  if (!v.id && !imageUrl) return { error: "Upload an image for the banner." };

  const row = {
    heading: v.heading ?? null,
    subheading: v.subheading ?? null,
    cta_label: v.ctaLabel ?? null,
    cta_url: v.ctaUrl ?? null,
    sort: v.sort,
    is_active: v.isActive,
    ...(imageUrl ? { image_url: imageUrl } : {}),
    ...(mobileUrl ? { mobile_image_url: mobileUrl } : removeMobile ? { mobile_image_url: null } : {}),
  };
  const { error } = v.id
    ? await supabase.from("banners").update(row).eq("id", v.id)
    : await supabase.from("banners").insert({ ...row, image_url: imageUrl! });
  if (error) {
    await removeStoredImages(supabase, ...uploaded);
    return { error: error.message };
  }

  // Files that were replaced or removed are no longer used anywhere, so delete them from storage.
  if (existing) {
    if (imageUrl) await removeStoredImages(supabase, existing.image_url);
    if (mobileUrl || removeMobile) await removeStoredImages(supabase, existing.mobile_image_url);
  }

  refreshMarketing("/admin/banners");
  return { ok: v.id ? "Banner saved." : "Banner added." };
}

export async function deleteBanner(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const { data: banner } = await supabase.from("banners").select("image_url, mobile_image_url").eq("id", id).maybeSingle();
  await supabase.from("banners").delete().eq("id", id);
  await removeStoredImages(supabase, banner?.image_url, banner?.mobile_image_url);
  refreshMarketing("/admin/banners");
}
