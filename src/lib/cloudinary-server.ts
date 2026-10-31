import "server-only";
import { createHash } from "node:crypto";
import { CLOUD_NAME, INCOMING_TRANSFORMATION, PRODUCT_FOLDER } from "@/lib/cloudinary";

/**
 * Server side of Cloudinary: signs browser uploads and deletes assets. The API secret never leaves this file.
 * No SDK is used, so nothing extra is shipped: Cloudinary's signature is a SHA-1 of the sorted parameters plus the secret.
 */

const API_KEY = process.env.CLOUDINARY_API_KEY ?? "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET ?? "";

export const cloudinaryConfigured = () => Boolean(CLOUD_NAME && API_KEY && API_SECRET);

/** Cloudinary's signature: `a=1&b=2` over the sorted, non-empty parameters, with the secret appended, hashed with SHA-1. */
export function sign(params: Record<string, string | number>, secret = API_SECRET) {
  const text = Object.keys(params)
    .sort()
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(text + secret).digest("hex");
}

/** Everything the browser needs to send one photo straight to Cloudinary. */
export type UploadTicket = {
  url: string;
  fields: { api_key: string; timestamp: string; signature: string; folder: string; transformation: string; allowed_formats: string };
};

const ALLOWED_FORMATS = "jpg,jpeg,png,webp,avif";

export function createUploadTicket(): UploadTicket {
  const signed = {
    allowed_formats: ALLOWED_FORMATS,
    folder: PRODUCT_FOLDER,
    timestamp: Math.floor(Date.now() / 1000),
    transformation: INCOMING_TRANSFORMATION,
  };
  return {
    url: `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    fields: {
      api_key: API_KEY,
      timestamp: String(signed.timestamp),
      signature: sign(signed),
      folder: signed.folder,
      transformation: signed.transformation,
      allowed_formats: signed.allowed_formats,
    },
  };
}

/** Deletes assets from Cloudinary. Returns the ones that could not be deleted (an asset that is already gone counts as deleted). */
export async function destroyAssets(publicIds: string[]): Promise<string[]> {
  if (!publicIds.length) return [];
  if (!cloudinaryConfigured()) return publicIds;
  const results = await Promise.all(
    publicIds.map(async (publicId) => {
      const timestamp = Math.floor(Date.now() / 1000);
      const body = new URLSearchParams({
        public_id: publicId,
        timestamp: String(timestamp),
        api_key: API_KEY,
        signature: sign({ public_id: publicId, timestamp }),
        invalidate: "true",
      });
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, { method: "POST", body });
        const json = (await res.json()) as { result?: string };
        return json.result === "ok" || json.result === "not found" ? null : publicId;
      } catch {
        return publicId;
      }
    }),
  );
  return results.flatMap((r) => (r ? [r] : []));
}
