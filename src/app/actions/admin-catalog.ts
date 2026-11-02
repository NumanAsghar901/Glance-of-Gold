"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, type ActionState } from "@/lib/admin/auth";
import { cloudinarySrc, FOLDERS, ownPublicId, PRODUCT_FOLDER, PUBLIC_ID_PATTERN } from "@/lib/cloudinary";
import { destroyAssets, removeCloudinaryImages } from "@/lib/cloudinary-server";
import { randomSuffix, slugify } from "@/lib/slug";

const idSchema = z.coerce.number().int().positive();

function refreshCatalog() {
  updateTag("catalog");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin");
}

// Images -------------------------------------------------------------------------

/** Deletes the Cloudinary assets behind product photos. */
async function removePhotoFiles(photos: { cloudinary_public_id?: string | null }[]) {
  const ids = photos.flatMap((p) => (p.cloudinary_public_id ? [p.cloudinary_public_id] : []));
  const leftOver = await destroyAssets(ids);
  if (leftOver.length) console.error("Cloudinary assets could not be deleted:", leftOver.join(", "));
}

/** Photos the browser already sent to Cloudinary: only addresses inside our own folder are accepted. */
const uploadedPhotosSchema = z
  .array(
    z.object({
      publicId: z.string().regex(PUBLIC_ID_PATTERN).startsWith(`${PRODUCT_FOLDER}/`),
      width: z.number().int().min(1).max(10_000),
      height: z.number().int().min(1).max(10_000),
    }),
  )
  .max(30);

// Products -----------------------------------------------------------------------

/** A list of sizes or colours: trimmed, no blanks, no repeats (ignoring capitals), kept in the order entered. */
const listSchema = z
  .array(z.string().trim().max(40, "A size or colour is too long"))
  .max(40, "Too many sizes or colours in one group")
  .transform((list) => {
    const seen = new Set<string>();
    return list.filter((x) => {
      const key = x.toLowerCase();
      if (!x || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

const groupSchema = z.object({
  id: z.number().int().positive().nullable().optional(),
  heading: z.string().trim().min(1, "Give every variant group a heading").max(60, "A heading is too long"),
  sizes: listSchema,
  colours: listSchema,
});

const productSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2, "Enter a product name").max(120),
  slug: z.string().trim().max(80).optional(),
  categoryId: z.coerce.number().int().positive().nullable(),
  description: z.string().trim().max(3000).optional(),
  price: z.coerce.number().int("Price must be a whole number of rupees").min(0).max(10_000_000),
  compareAtPrice: z.coerce.number().int().min(0).max(10_000_000).nullable(),
  // One stock number for the whole product, whatever sizes and colours are chosen.
  stock: z.coerce.number().int("Stock must be a whole number").min(0, "Stock cannot be negative").max(1_000_000),
  material: z.string().trim().max(80).optional(),
  tags: z.string().trim().max(200).optional(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  groups: z.array(groupSchema).max(20, "Too many variant groups"),
});

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  let groupsRaw: unknown;
  try {
    groupsRaw = JSON.parse(String(formData.get("groups") ?? "[]"));
  } catch {
    return { error: "The variant groups could not be read. Reload the page and try again." };
  }

  const parsed = productSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    categoryId: formData.get("categoryId") || null,
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice") || null,
    stock: formData.get("stock") || 0,
    material: formData.get("material") || undefined,
    tags: formData.get("tags") || undefined,
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    groups: groupsRaw,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the product details." };
  const v = parsed.data;

  if (v.compareAtPrice !== null && v.compareAtPrice <= v.price) {
    return { error: "The original price must be higher than the selling price, or left empty." };
  }

  // The order looks a group up by its heading, so headings must differ; and a group with neither sizes nor colours has nothing to choose.
  const headings = v.groups.map((g) => g.heading.toLowerCase());
  if (new Set(headings).size !== headings.length) return { error: "Two variant groups have the same heading. Give each its own." };
  const empty = v.groups.find((g) => g.sizes.length + g.colours.length === 0);
  if (empty) return { error: `Add at least one size or colour to "${empty.heading}", or remove the group.` };

  // Photos were already sent by the browser straight to Cloudinary; the form only carries where they are.
  let uploadedRaw: unknown;
  try {
    uploadedRaw = JSON.parse(String(formData.get("uploadedImages") || "[]"));
  } catch {
    return { error: "The photos could not be read. Remove them and add them again." };
  }
  const uploaded = uploadedPhotosSchema.safeParse(uploadedRaw);
  if (!uploaded.success) return { error: "The photos could not be read. Remove them and add them again." };
  const images = uploaded.data;

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
    stock: v.stock,
  };

  // Create or update the product, retrying once with a different slug if it is taken.
  // Every database call below that does not depend on another runs at the same time: each one is a
  // round trip, and a product with several groups and photos used to wait for them one after another.
  let productId = v.id;
  let existingIds: number[] = [];
  if (productId) {
    const patch = v.slug ? { ...row, slug: slugify(v.slug) } : row;
    const [{ error }, { data: existing }] = await Promise.all([
      supabase.from("products").update(patch).eq("id", productId),
      supabase.from("product_option_groups").select("id").eq("product_id", productId),
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

  // Variant groups: update the ones that exist, insert the new ones in a single call, remove the ones that were dropped.
  const keep = new Set(v.groups.flatMap((g) => (g.id ? [g.id] : [])));
  const drop = existingIds.filter((id) => !keep.has(id));
  const groupWrites: PromiseLike<string | null>[] = [];
  if (drop.length) {
    groupWrites.push(supabase.from("product_option_groups").delete().in("id", drop).then(({ error }) => error?.message ?? null));
  }
  const newGroups: { product_id: number; heading: string; sizes: string[]; colours: string[]; sort: number }[] = [];
  for (const [i, g] of v.groups.entries()) {
    const fields = { heading: g.heading, sizes: g.sizes, colours: g.colours, sort: i };
    if (g.id && existingIds.includes(g.id)) {
      groupWrites.push(supabase.from("product_option_groups").update(fields).eq("id", g.id).then(({ error }) => error?.message ?? null));
    } else {
      newGroups.push({ product_id: pid, ...fields });
    }
  }
  if (newGroups.length) {
    groupWrites.push(supabase.from("product_option_groups").insert(newGroups).then(({ error }) => error?.message ?? null));
  }

  // Photos: the files are already on Cloudinary, so this only records them, in one call, after the ones already there.
  // If they cannot be recorded they are deleted again, so Cloudinary never keeps files no product points to.
  const savePhotos = async (): Promise<string | null> => {
    if (!images.length) return null;
    const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", pid);
    const { error } = await supabase.from("product_images").insert(
      images.map((img, i) => ({
        product_id: pid,
        url: cloudinarySrc(img.publicId),
        cloudinary_public_id: img.publicId,
        alt: v.name,
        sort: (count ?? 0) + i,
        width: img.width,
        height: img.height,
      })),
    );
    if (error) {
      await destroyAssets(images.map((img) => img.publicId));
      return /cloudinary_public_id|schema cache/i.test(error.message)
        ? "The database needs one update before photos can be saved (the Cloudinary migration). Run it in the Supabase SQL editor, then add the photos again."
        : error.message;
    }
    return null;
  };

  const [groupErrors, photoError] = await Promise.all([Promise.all(groupWrites), savePhotos()]);
  const groupError = groupErrors.find((e) => e !== null);
  if (groupError) {
    refreshCatalog();
    return { error: groupError };
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

  const { data: imgs } = await supabase.from("product_images").select("*").eq("product_id", id);
  await removePhotoFiles(imgs ?? []);

  await supabase.from("products").delete().eq("id", id);
  refreshCatalog();
  redirect("/admin/products");
}

export async function deleteImage(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const { data: img } = await supabase.from("product_images").select("*").eq("id", id).maybeSingle();
  if (!img) return;
  await removePhotoFiles([img]);
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
  // Sample products use the built-in pictures in /public, so there are no stored files to remove.
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
  // The photo was already sent to Cloudinary by the browser; the form carries only where it is.
  const sent = formData.get("image");
  const newId = ownPublicId(sent, FOLDERS.category);
  if (typeof sent === "string" && sent && !newId) return { error: "The photo could not be read. Remove it and add it again." };
  const imageUrl = newId ? cloudinarySrc(newId) : undefined;

  const { data: existing } = v.id
    ? await supabase.from("categories").select("image_url").eq("id", v.id).maybeSingle()
    : { data: null };

  // New photo wins; otherwise "remove" clears it; otherwise leave the current one untouched.
  const imagePatch = imageUrl ? { image_url: imageUrl } : removeImage ? { image_url: null } : {};
  const { error } = v.id
    ? await supabase.from("categories").update({ ...row, ...imagePatch }).eq("id", v.id)
    : await supabase.from("categories").insert({ ...row, image_url: imageUrl ?? null });
  if (error) {
    // The row was not saved, so the freshly uploaded photo would be an orphan.
    if (imageUrl) await removeCloudinaryImages(imageUrl);
    return { error: error.code === "23505" ? "A category with that URL name already exists." : error.message };
  }
  // The row now points elsewhere, so the old photo is no longer used anywhere.
  if (existing?.image_url && (imageUrl || removeImage) && existing.image_url !== imageUrl) await removeCloudinaryImages(existing.image_url);

  refreshCatalog();
  return { ok: v.id ? "Category saved." : "Category added." };
}

export async function deleteCategory(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const { data: cat } = await supabase.from("categories").select("image_url").eq("id", id).maybeSingle();
  await supabase.from("categories").delete().eq("id", id);
  await removeCloudinaryImages(cat?.image_url);
  refreshCatalog();
}
