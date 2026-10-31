"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { FOLDERS, PUBLIC_ID_PATTERN, SLOTS, type UploadSlot, type UploadTicket } from "@/lib/cloudinary";
import { cloudinaryConfigured, createUploadTicket, destroyAssets } from "@/lib/cloudinary-server";

/**
 * Direct browser uploads: the admin's browser asks here for a signed ticket and then sends the photo to
 * Cloudinary itself, so the file never passes through this server (and never meets Vercel's request size limit).
 */
export async function getUploadTicket(slot: UploadSlot): Promise<{ ticket: UploadTicket } | { error: string }> {
  await requireAdmin();
  if (!(slot in SLOTS)) return { error: "Unknown photo type." };
  if (!cloudinaryConfigured()) {
    return { error: "Photo storage is not set up yet. Add the Cloudinary keys to the site settings, then try again." };
  }
  return { ticket: createUploadTicket(slot) };
}

const discardSchema = z
  .array(
    z
      .string()
      .regex(PUBLIC_ID_PATTERN)
      .refine((id) => [FOLDERS.product, FOLDERS.category, FOLDERS.banner].some((f) => id.startsWith(`${f}/`))),
  )
  .max(50);

/** Removes photos that were uploaded but never saved (the admin took them off the list or replaced them). */
export async function discardUploads(publicIds: string[]): Promise<void> {
  await requireAdmin();
  const parsed = discardSchema.safeParse(publicIds);
  if (!parsed.success) return;
  await destroyAssets(parsed.data);
}
