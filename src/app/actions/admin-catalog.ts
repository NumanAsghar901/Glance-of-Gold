"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, type ActionState } from "@/lib/admin/auth";
import { prepareImage, removeStoredImages, uploadPreparedImage, uploadPublicImage } from "@/lib/admin/storage";
import { randomSuffix, slugify } from "@/lib/slug";
import { composeVariantName } from "@/lib/variant-name";
import type { Database } from "@/types/database";

const BUCKET = "product-images";

const idSchema = z.coerce.number().int().positive();

function refreshCatalog() {
  updateTag("catalog");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin");
}

// Images -------------------------------------------------------------------------

function storagePath(url: string) {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

function filesFrom(formData: FormData, key: string) {
  return formData.getAll(key).filter((f): f is File => f instanceof File && f.size > 0);
}

// Products -----------------------------------------------------------------------

const variantSchema = z.object({
  id: z.number().int().positive().nullable().optional(),
  // The full name. Only sent by the older form (before designs and sizes had their own boxes); otherwise it is built from the three below.
  name: z.string().trim().max(100).optional(),
  color: z.string().trim().max(30).nullable().optional(),
  design: z.string().trim().max(30).nullable().optional(),
  size: z.string().trim().max(30).nullable().optional(),
  sku: z.string().trim().max(40).optional(),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative").max(100000),
  priceOverride: z.coerce.number().int().min(0).max(10_000_000).nullable().optional(),
  isActive: z.boolean(),
});

const productSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2, "Enter a product name").max(120),
  slug: z.string().trim().max(80).optional(),
  categoryId: z.coerce.number().int().positive().nullable(),
  description: z.string().trim().max(3000).optional(),
  price: z.coerce.number().int("Price must be a whole number of rupees").min(0).max(10_000_000),
  compareAtPrice: z.coerce.number().int().min(0).max(10_000_000).nullable(),
  material: z.string().trim().max(80).optional(),
  tags: z.string().trim().max(200).optional(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  variants: z.array(variantSchema).min(1, "Add at least one variant").max(40),
  allowMultiple: z.boolean().optional(),
});

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  let variantsRaw: unknown;
  try {
    variantsRaw = JSON.parse(String(formData.get("variants") ?? "[]"));
  } catch {
    return { error: "The variants could not be read. Reload the page and try again." };
  }

  const parsed = productSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    categoryId: formData.get("categoryId") || null,
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || null,
    material: formData.get("material") || undefined,
    tags: formData.get("tags") || undefined,
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    variants: variantsRaw,
    // The form only sends the marker "attrs" once the design and size migration has been run, so older databases still save.
    allowMultiple: formData.has("attrs") ? formData.get("allowMultiple") === "on" : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the product details." };
  const v = parsed.data;

  if (v.compareAtPrice !== null && v.compareAtPrice <= v.price) {
    return { error: "The original price must be higher than the selling price, or left empty." };
  }

  // Colour, design, size and "select several" exist once the design and size migration has been run.
  const withAttrs = formData.has("attrs");
  const variantNames = v.variants.map((x) =>
    // Before the design and size migration the form has one name box, kept exactly as typed.
    withAttrs ? composeVariantName({ color: x.color, design: x.design, size: x.size }) : x.name?.trim() || "Standard",
  );
  if (new Set(variantNames.map((n) => n.toLowerCase())).size !== variantNames.length) {
    return { error: "Two variants are the same. Each needs its own colour, design or size." };
  }

  // Photos are checked (unreadable ones are turned away) and reduced if huge before anything is saved.
  const checked = await Promise.all(filesFrom(formData, "images").map((f) => prepareImage(f, "product")));
  const images = checked.flatMap((c) => ("image" in c ? [c.image] : []));
  const rejected = checked.find((c) => "problem" in c);
  if (rejected && "problem" in rejected) return { error: rejected.problem };

  const row = {
    name: v.name,
    category_id: v.categoryId,
    description: v.description ?? null,
    price: v.price,
    compare_at_price: v.compareAtPrice,
    material: v.material ?? null,
    tags: (v.tags ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
    is_active: v.isActive,
    is_featured: v.isFeatured,
    ...(withAttrs ? { allow_multiple: v.allowMultiple ?? false } : {}),
  };

  // Create or update the product, retrying once with a different slug if it is taken.
  // Every database call below that does not depend on another runs at the same time: each one is a
  // round trip, and a product with many variants and photos used to wait for them one after another.
  let productId = v.id;
  let existingIds: number[] = [];
  if (productId) {
    const patch = v.slug ? { ...row, slug: slugify(v.slug) } : row;
    const [{ error }, { data: existing }] = await Promise.all([
      supabase.from("products").update(patch).eq("id", productId),
      supabase.from("product_variants").select("id").eq("product_id", productId),
    ]);
    if (error) return { error: error.code === "23505" ? "Another product already uses that URL name." : error.message };
    existingIds = (existing ?? []).map((x) => x.id);
  } else {
    const base = slugify(v.slug || v.name) || "product";
    for (const slug of [base, `${base}-${randomSuffix()}`]) {
      const { data, error } = await supabase.from("products").insert({ ...row, slug }).select("id").single();
      if (!error) {
        productId = data.id;
        break;
      }
      if (error.code !== "23505") return { error: error.message };
    }
    if (!productId) return { error: "Could not create the product. Try a different name." };
  }
  const pid = productId;

  // Variants: update the ones with ids, insert the new ones in a single call, remove the ones that were dropped.
  const keep = new Set(v.variants.flatMap((x) => (x.id ? [x.id] : [])));
  const drop = existingIds.filter((id) => !keep.has(id));
  if (drop.length) {
    // First, so a new variant can reuse the SKU of one that was just removed.
    const { error } = await supabase.from("product_variants").delete().in("id", drop);
    if (error) return { error: error.message };
  }
  const skuTaken = (label: string) => `The SKU for "${label}" is already in use.`;
  const variantWrites: PromiseLike<string | null>[] = [];
  const newRows: Database["public"]["Tables"]["product_variants"]["Insert"][] = [];
  for (const [i, x] of v.variants.entries()) {
    const fullName = variantNames[i];
    const fields = {
      name: fullName,
      ...(withAttrs
        ? { color: x.color?.trim() || null, design: x.design?.trim() || null, size: x.size?.trim() || null }
        : {}),
      stock: x.stock,
      price_override: x.priceOverride ?? null,
      is_active: x.isActive,
      sort: i,
    };
    if (x.id) {
      variantWrites.push(
        supabase
          .from("product_variants")
          .update({ ...fields, ...(x.sku ? { sku: x.sku } : {}) })
          .eq("id", x.id)
          .then(({ error }) => (error ? (error.code === "23505" ? skuTaken(fullName) : error.message) : null)),
      );
    } else {
      newRows.push({
        ...fields,
        product_id: pid,
        sku: x.sku || `GG-${pid}-${slugify(fullName).toUpperCase().slice(0, 12) || "STD"}-${randomSuffix(3).toUpperCase()}`,
      });
    }
  }
  if (newRows.length) {
    variantWrites.push(
      supabase
        .from("product_variants")
        .insert(newRows)
        .then(({ error }) =>
          error ? (error.code === "23505" ? "A SKU you entered is already used by another variant." : error.message) : null,
        ),
    );
  }

  // Photos: stored side by side, then added to the product in one call. Anything stored that cannot be
  // recorded is removed again, so the bucket never keeps files no product points to.
  const savePhotos = async (): Promise<string | null> => {
    if (!images.length) return null;
    const [{ count }, uploads] = await Promise.all([
      supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", pid),
      Promise.allSettled(images.map((img) => uploadPreparedImage(supabase, String(pid), img))),
    ]);
    const stored = uploads.flatMap((u, i) => (u.status === "fulfilled" ? [{ url: u.value, image: images[i] }] : []));
    if (stored.length) {
      const rows = (withSize: boolean) =>
        stored.map(({ url, image }, i) => ({
          product_id: pid,
          url,
          alt: v.name,
          sort: (count ?? 0) + i,
          ...(withSize ? { width: image.width, height: image.height } : {}),
        }));
      let { error } = await supabase.from("product_images").insert(rows(true));
      // Before the photo size migration has been run the columns do not exist: save without them.
      if (error && /width|height|schema cache/i.test(error.message)) ({ error } = await supabase.from("product_images").insert(rows(false)));
      if (error) {
        await removeStoredImages(supabase, ...stored.map((s) => s.url));
        return error.message;
      }
    }
    const failed = uploads.find((u) => u.status === "rejected");
    return failed ? (failed.reason instanceof Error ? failed.reason.message : "upload error") : null;
  };

  const [variantErrors, photoError] = await Promise.all([Promise.all(variantWrites), savePhotos()]);
  const variantError = variantErrors.find((e) => e !== null);
  if (variantError) {
    refreshCatalog();
    return { error: variantError };
  }
  if (photoError) {
    refreshCatalog();
    return { error: `Product saved, but an image failed: ${photoError}` };
  }

  refreshCatalog();
  if (!v.id) redirect(`/admin/products/${productId}`);
  revalidatePath(`/admin/products/${productId}`);
  return { ok: "Product saved." };
}

export async function deleteProduct(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));

  const { data: imgs } = await supabase.from("product_images").select("url").eq("product_id", id);
  const paths = (imgs ?? []).flatMap((i) => storagePath(i.url) ?? []);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);

  await supabase.from("products").delete().eq("id", id);
  refreshCatalog();
  redirect("/admin/products");
}

export async function deleteImage(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const { data: img } = await supabase.from("product_images").select("url, product_id").eq("id", id).maybeSingle();
  if (!img) return;
  const path = storagePath(img.url);
  if (path) await supabase.storage.from(BUCKET).remove([path]);
  await supabase.from("product_images").delete().eq("id", id);
  refreshCatalog();
  revalidatePath(`/admin/products/${img.product_id}`);
}

export async function makePrimaryImage(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const productId = idSchema.parse(formData.get("productId"));
  const { data: imgs } = await supabase.from("product_images").select("id").eq("product_id", productId).order("sort").order("id");
  const order = [id, ...(imgs ?? []).map((i) => i.id).filter((x) => x !== id)];
  await Promise.all(order.map((imgId, sort) => supabase.from("product_images").update({ sort }).eq("id", imgId)));
  refreshCatalog();
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteSampleProducts() {
  const { supabase } = await requireAdmin();
  const { data: imgs } = await supabase
    .from("product_images")
    .select("url, products!inner(is_sample)")
    .eq("products.is_sample", true);
  const paths = (imgs ?? []).flatMap((i) => storagePath(i.url) ?? []);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  await supabase.from("products").delete().eq("is_sample", true);
  refreshCatalog();
}

// Categories ---------------------------------------------------------------------

const categorySchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2, "Enter a category name").max(60),
  slug: z.string().trim().max(60).optional(),
  description: z.string().trim().max(300).optional(),
  sort: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: z.boolean(),
});

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = categorySchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    description: formData.get("description") || undefined,
    sort: formData.get("sort") || 0,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the details." };
  const v = parsed.data;

  const row = {
    name: v.name,
    slug: slugify(v.slug || v.name),
    description: v.description ?? null,
    sort: v.sort,
    is_active: v.isActive,
  };
  if (!row.slug) return { error: "Enter a valid name." };

  const removeImage = formData.get("removeImage") === "on";
  const file = filesFrom(formData, "image")[0];

  const uploadPhoto = async (): Promise<{ url?: string; error?: string }> => {
    if (!file) return {};
    try {
      return { url: await uploadPublicImage(supabase, "categories", file, "category") };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Image upload failed." };
    }
  };

  // The current row is read while the new photo uploads, since neither waits on the other.
  const [{ data: existing }, upload] = await Promise.all([
    v.id ? supabase.from("categories").select("image_url").eq("id", v.id).maybeSingle() : Promise.resolve({ data: null }),
    uploadPhoto(),
  ]);
  if (upload.error) return { error: upload.error };
  const imageUrl = upload.url;

  // New photo wins; otherwise "remove" clears it; otherwise leave the current one untouched.
  const imagePatch = imageUrl ? { image_url: imageUrl } : removeImage ? { image_url: null } : {};
  const { error } = v.id
    ? await supabase.from("categories").update({ ...row, ...imagePatch }).eq("id", v.id)
    : await supabase.from("categories").insert({ ...row, image_url: imageUrl ?? null });
  if (error) {
    // The row was not saved, so the freshly uploaded file would be an orphan.
    if (imageUrl) await removeStoredImages(supabase, imageUrl);
    return { error: error.code === "23505" ? "A category with that URL name already exists." : error.message };
  }
  // The row now points elsewhere, so the old file is no longer used anywhere.
  if (existing?.image_url && (imageUrl || removeImage)) await removeStoredImages(supabase, existing.image_url);

  refreshCatalog();
  return { ok: v.id ? "Category saved." : "Category added." };
}

export async function deleteCategory(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const { data: cat } = await supabase.from("categories").select("image_url").eq("id", id).maybeSingle();
  await supabase.from("categories").delete().eq("id", id);
  await removeStoredImages(supabase, cat?.image_url);
  refreshCatalog();
}
