"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { cloudinaryConfigured, createUploadTicket, destroyAssets, type UploadTicket } from "@/lib/cloudinary-server";
import { PRODUCT_FOLDER, PUBLIC_ID_PATTERN } from "@/lib/cloudinary";

/**
 * Direct browser uploads: the admin's browser asks here for a signed ticket and then sends the photo to
 * Cloudinary itself, so the file never passes through this server (and never meets Vercel's request size limit).
 */
export async function getUploadTicket(): Promise<{ ticket: UploadTicket } | { error: string }> {
  await requireAdmin();
  if (!cloudinaryConfigured()) {
    return { error: "Photo storage is not set up yet. Add the Cloudinary keys to the site settings, then try again." };
  }
  return { ticket: createUploadTicket() };
}

const discardSchema = z.array(z.string().regex(PUBLIC_ID_PATTERN).startsWith(`${PRODUCT_FOLDER}/`)).max(50);

/** Removes photos that were uploaded but never saved with a product (the admin took them off the list). */
export async function discardUploads(publicIds: string[]): Promise<void> {
  await requireAdmin();
  const parsed = discardSchema.safeParse(publicIds);
  if (!parsed.success) return;
  await destroyAssets(parsed.data);
}
