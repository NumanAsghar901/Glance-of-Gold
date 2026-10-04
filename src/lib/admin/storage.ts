import "server-only";
import { randomUUID } from "node:crypto";
import type { requireAdmin } from "@/lib/admin/auth";

/** Helpers for the public product-images bucket (product photos, category photos, banners). */

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export const IMAGE_BUCKET = "product-images";
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
  if (file.size > MAX_IMAGE_BYTES) return `${file.name} is larger than 5 MB.`;
  return null;
}

/** Uploads an image under `folder/` and returns its public URL. Throws a readable Error on failure. */
export async function uploadPublicImage(supabase: Supabase, folder: string, file: File): Promise<string> {
  const problem = validateImage(file);
  if (problem) throw new Error(problem);
  const path = `${folder}/${randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`);
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
