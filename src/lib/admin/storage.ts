import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { requireAdmin } from "@/lib/admin/auth";
import { describeImageSize, IMAGE_SPECS, type ImageSlot } from "@/lib/image-specs";

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

/**
 * Why this photo cannot be used, or null if it can. A photo smaller than the minimum for its place would be
 * stretched by the browser and look blurry, so it is turned away with the size it needs.
 */
export async function imageProblem(file: File, slot: ImageSlot): Promise<string | null> {
  const basic = validateImage(file);
  if (basic) return basic;
  let size: { width: number; height: number } | null;
  try {
    size = await pixelSize(Buffer.from(await file.arrayBuffer()));
  } catch {
    return `${file.name} could not be read as a picture.`;
  }
  if (!size) return `${file.name} could not be read as a picture.`;
  const { verdict, text } = describeImageSize(slot, size.width, size.height);
  return verdict === "too-small" ? `${file.name}: ${text}` : null;
}

/**
 * Uploads an image under `folder/` and returns its public URL. Throws a readable Error on failure or when the
 * photo is too small for its place. A photo longer than the slot needs is reduced first (the admin form already
 * does this in the browser; this is the safety net).
 */
export async function uploadPublicImage(supabase: Supabase, folder: string, file: File, slot: ImageSlot): Promise<string> {
  const problem = await imageProblem(file, slot);
  if (problem) throw new Error(problem);

  const buffer = Buffer.from(await file.arrayBuffer());
  const size = await pixelSize(buffer);
  const { maxEdge } = IMAGE_SPECS[slot];

  let body: Buffer = buffer;
  let contentType = file.type;
  let ext = IMAGE_TYPES[file.type];
  if (size && Math.max(size.width, size.height) > maxEdge) {
    body = await sharp(buffer)
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    contentType = "image/jpeg";
    ext = "jpg";
  }

  const path = `${folder}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, body, { contentType });
  if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`);
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
