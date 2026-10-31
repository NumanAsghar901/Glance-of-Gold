import "server-only";
import { createHash } from "node:crypto";
import {
  CLOUD_NAME,
  incomingTransformation,
  isCloudinarySrc,
  PROOF_EDGE,
  publicIdFromSrc,
  SLOTS,
  type UploadSlot,
  type UploadTicket,
} from "@/lib/cloudinary";

/**
 * Server side of Cloudinary: signs browser uploads, deletes assets and links to private ones. The API secret never
 * leaves this file. No SDK is used, so nothing extra is shipped: Cloudinary's signature is a SHA-1 of the sorted
 * parameters plus the secret.
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

function ticketFor(signed: Record<string, string | number>): UploadTicket {
  const params = { ...signed, timestamp: Math.floor(Date.now() / 1000) };
  return {
    url: `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    fields: {
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      api_key: API_KEY,
      signature: sign(params),
    },
  };
}

/** A signed ticket for the admin to upload one image of this kind straight to Cloudinary. */
export function createUploadTicket(slot: UploadSlot): UploadTicket {
  const { folder, edge } = SLOTS[slot];
  return ticketFor({ allowed_formats: "jpg,jpeg,png,webp,avif", folder, transformation: incomingTransformation(edge) });
}

/** A signed ticket for a customer to upload one payment screenshot. It can only create this one private asset. */
export function createProofTicket(publicId: string): UploadTicket {
  return ticketFor({
    allowed_formats: "jpg,jpeg,png,webp",
    public_id: publicId,
    transformation: incomingTransformation(PROOF_EDGE),
    type: "authenticated",
  });
}

/** Deletes assets from Cloudinary. Returns the ones that could not be deleted (an asset that is already gone counts as deleted). */
export async function destroyAssets(publicIds: string[], type: "upload" | "authenticated" = "upload"): Promise<string[]> {
  if (!publicIds.length) return [];
  if (!cloudinaryConfigured()) return publicIds;
  const results = await Promise.all(
    publicIds.map(async (publicId) => {
      // Every parameter except the key goes into the signature, "invalidate" (clears the CDN's copy) included.
      const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), type, invalidate: "true" };
      const body = new URLSearchParams({
        ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
        api_key: API_KEY,
        signature: sign(params),
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

/** Deletes the Cloudinary assets behind stored image addresses. Anything that is not a Cloudinary address is ignored. */
export async function removeCloudinaryImages(...urls: (string | null | undefined)[]) {
  const ids = urls.flatMap((u) => (u && isCloudinarySrc(u) ? (publicIdFromSrc(u) ?? []) : []));
  const leftOver = await destroyAssets([...new Set(ids)]);
  if (leftOver.length) console.error("Cloudinary assets could not be deleted:", leftOver.join(", "));
}

/** A signed link to a private asset (a payment screenshot). Only someone holding this link can open it. */
export function privateImageUrl(publicId: string) {
  const signature = createHash("sha1").update(publicId + API_SECRET).digest("base64url").slice(0, 8);
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/authenticated/s--${signature}--/${publicId}`;
}
