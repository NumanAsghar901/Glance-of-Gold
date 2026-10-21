import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { requireAdmin } from "@/lib/admin/auth";
import { MAX_EDGE, type ImageSlot } from "@/lib/image-specs";

/** Helpers for the public product-images bucket (product photos, category photos, banners). */

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export const IMAGE_BUCKET = "product-images";
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
/** Larger originals are fine: they are reduced before they are stored. */
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/** Storage object path for a public URL in our bucket, or null for any other URL (e.g. built-in placeholders). */
export function storagePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/${IMAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

/** Deletes the stored file behind a public image URL. Safe to call with null or a non-storage URL. */
export async function removeStoredImages(supabase: Supabase, ...urls: (string | null | undefined)[]) {
  const paths = urls.flatMap((u) => storagePath(u) ?? []);
  if (paths.length) await supabase.storage.from(IMAGE_BUCKET).remove(paths);
}

export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES[file.type]) return "Images must be JPG, PNG, WebP or AVIF.";
  if (file.size > MAX_IMAGE_BYTES) return `${file.name} is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`;
  return null;
}

/** The real pixel size of a photo as it will be seen, after any phone-camera rotation. */
async function pixelSize(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) return null;
  const turned = (meta.orientation ?? 1) >= 5;
  return turned ? { width: meta.height, height: meta.width } : { width: meta.width, height: meta.height };
}

/** A photo that has been checked and is ready to store, so it is decoded only once. */
export type PreparedImage = { name: string; body: Buffer; contentType: string; ext: string };

/**
 * Checks that a photo can be read and gets it ready to store. Any size is accepted. One longer than the slot keeps
 * is reduced first (the admin form already does this in the browser; this is the safety net).
 */
export async function prepareImage(file: File, slot: ImageSlot): Promise<{ problem: string } | { image: PreparedImage }> {
  const basic = validateImage(file);
  if (basic) return { problem: basic };
  const buffer = Buffer.from(await file.arrayBuffer());
  let size: { width: number; height: number } | null;
  try {
    size = await pixelSize(buffer);
  } catch {
    return { problem: `${file.name} could not be read as a picture.` };
  }
  if (!size) return { problem: `${file.name} could not be read as a picture.` };

  const maxEdge = MAX_EDGE[slot];
  if (Math.max(size.width, size.height) > maxEdge) {
    const body = await sharp(buffer)
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    return { image: { name: file.name, body, contentType: "image/jpeg", ext: "jpg" } };
  }
  return { image: { name: file.name, body: buffer, contentType: file.type, ext: IMAGE_TYPES[file.type] } };
}

/** Why this photo cannot be used (unreadable or the wrong type), or null if it can. */
export async function imageProblem(file: File, slot: ImageSlot): Promise<string | null> {
  const result = await prepareImage(file, slot);
  return "problem" in result ? result.problem : null;
}

/** Stores a prepared photo under `folder/` and returns its public URL. Throws a readable Error on failure. */
export async function uploadPreparedImage(supabase: Supabase, folder: string, image: PreparedImage): Promise<string> {
  const path = `${folder}/${randomUUID()}.${image.ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, image.body, { contentType: image.contentType });
  if (error) throw new Error(`Could not upload ${image.name}: ${error.message}`);
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Checks, prepares and uploads one photo. Throws a readable Error when it cannot be read or stored. */
export async function uploadPublicImage(supabase: Supabase, folder: string, file: File, slot: ImageSlot): Promise<string> {
  const result = await prepareImage(file, slot);
  if ("problem" in result) throw new Error(result.problem);
  return uploadPreparedImage(supabase, folder, result.image);
}
