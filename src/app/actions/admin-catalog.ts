"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, type ActionState } from "@/lib/admin/auth";
import { removeStoredImages } from "@/lib/admin/storage";
import { randomSuffix, slugify } from "@/lib/slug";

const BUCKET = "product-images";
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const MAX_IMAGE = 5 * 1024 * 1024;

const idSchema = z.coerce.number().int().positive();

function refreshCatalog() {
  updateTag("catalog");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin");
}

// Images -------------------------------------------------------------------------

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function uploadImage(supabase: Supabase, folder: string, file: File) {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new Error("Images must be JPG, PNG, WebP or AVIF.");
  if (file.size > MAX_IMAGE) throw new Error(`${file.name} is larger than 5 MB.`);
  const path = `${folder}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

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
  name: z.string().trim().min(1, "Every variant needs a name").max(40),
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
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the product details." };
  const v = parsed.data;

  if (v.compareAtPrice !== null && v.compareAtPrice <= v.price) {
    return { error: "The original price must be higher than the selling price, or left empty." };
  }

  const images = filesFrom(formData, "images");
  for (const f of images) {
    if (!IMAGE_TYPES[f.type]) return { error: "Images must be JPG, PNG, WebP or AVIF." };
    if (f.size > MAX_IMAGE) return { error: `${f.name} is larger than 5 MB.` };
  }

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
  };

  // Create or update the product, retrying once with a different slug if it is taken.
  let productId = v.id;
  if (productId) {
    const patch = v.slug ? { ...row, slug: slugify(v.slug) } : row;
    const { error } = await supabase.from("products").update(patch).eq("id", productId);
    if (error) return { error: error.code === "23505" ? "Another product already uses that URL name." : error.message };
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

  // Variants: update the ones with ids, insert the new, remove the ones that were dropped.
  const { data: existing } = await supabase.from("product_variants").select("id").eq("product_id", productId);
  const keep = new Set(v.variants.flatMap((x) => (x.id ? [x.id] : [])));
  const drop = (existing ?? []).map((x) => x.id).filter((id) => !keep.has(id));
  if (drop.length) {
    const { error } = await supabase.from("product_variants").delete().in("id", drop);
    if (error) return { error: error.message };
  }
  for (const [i, x] of v.variants.entries()) {
    const fields = {
      name: x.name,
      stock: x.stock,
      price_override: x.priceOverride ?? null,
      is_active: x.isActive,
      sort: i,
    };
    const { error } = x.id
      ? await supabase.from("product_variants").update({ ...fields, ...(x.sku ? { sku: x.sku } : {}) }).eq("id", x.id)
      : await supabase.from("product_variants").insert({
          ...fields,
          product_id: productId,
          sku: x.sku || `GG-${productId}-${slugify(x.name).toUpperCase().slice(0, 12) || "STD"}-${randomSuffix(3).toUpperCase()}`,
        });
    if (error) {
      return { error: error.code === "23505" ? `The SKU for "${x.name}" is already in use.` : error.message };
    }
  }

  // Images
  if (images.length) {
    const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
    let sort = count ?? 0;
    try {
      for (const file of images) {
        const url = await uploadImage(supabase, String(productId), file);
        const { error } = await supabase
          .from("product_images")
          .insert({ product_id: productId, url, alt: v.name, sort: sort++ });
        if (error) throw new Error(error.message);
      }
    } catch (e) {
      refreshCatalog();
      return { error: `Product saved, but an image failed: ${e instanceof Error ? e.message : "upload error"}` };
    }
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

  const { data: existing } = v.id
    ? await supabase.from("categories").select("image_url").eq("id", v.id).maybeSingle()
    : { data: null };
  const removeImage = formData.get("removeImage") === "on";

  let imageUrl: string | undefined;
  const file = filesFrom(formData, "image")[0];
  if (file) {
    try {
      imageUrl = await uploadImage(supabase, "categories", file);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Image upload failed." };
    }
  }

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
