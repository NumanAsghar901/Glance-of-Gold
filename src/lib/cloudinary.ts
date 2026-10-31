/**
 * Cloudinary delivery, shared by the browser and the server. Nothing here is secret: the cloud name is public,
 * and the API secret only ever lives in `cloudinary-server.ts`.
 *
 * Product photos are stored once (limited to 2000 px on the longest side when they are uploaded) and every
 * size the store shows is made on the fly by Cloudinary from the URL, so Vercel's image optimiser is not used.
 */

export const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

/** Where product photos live in the Cloudinary media library. */
export const PRODUCT_FOLDER = "little-luxe-glow/products";
/** The longest side a stored photo may have: Cloudinary reduces anything larger as it is uploaded. */
export const MAX_STORED_EDGE = 2000;
/** Incoming transformation applied to every upload (signed, so the browser cannot change it). */
export const INCOMING_TRANSFORMATION = `c_limit,w_${MAX_STORED_EDGE},h_${MAX_STORED_EDGE}`;

const DELIVERY = "https://res.cloudinary.com";
/** The widths Cloudinary is asked for. Next asks for many; snapping keeps the number of generated copies small. */
const WIDTHS = [160, 320, 480, 640, 828, 1080, 1440, MAX_STORED_EDGE];

const snapWidth = (w: number) => WIDTHS.find((x) => x >= w) ?? MAX_STORED_EDGE;

/** A public_id as the store saves it: folder names and a file name, nothing else. */
export const PUBLIC_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_\-/]{0,198}[A-Za-z0-9]$/;

/** The plain address of the stored photo (no transformation). Used as the photo's `src`; the loader adds the sizing. */
export function cloudinarySrc(publicId: string) {
  return `${DELIVERY}/${CLOUD_NAME}/image/upload/${publicId}`;
}

/**
 * The address to show a stored product photo from: Cloudinary when it has a public_id, otherwise the saved `url`
 * (the Supabase file). Without a cloud name configured the saved `url` is used, so a missing setting never breaks pictures.
 */
export function photoSrc(photo: { url: string; cloudinary_public_id?: string | null }) {
  return photo.cloudinary_public_id && CLOUD_NAME ? cloudinarySrc(photo.cloudinary_public_id) : photo.url;
}

/** True for addresses made by `cloudinarySrc` or copied from Cloudinary's upload response. */
export function isCloudinarySrc(src: string) {
  return src.startsWith(`${DELIVERY}/`) && src.includes("/image/upload/");
}

/** The public_id inside a Cloudinary delivery address (version and file extension dropped). */
export function publicIdFromSrc(src: string) {
  const at = src.indexOf("/image/upload/");
  if (at === -1) return null;
  const rest = src.slice(at + "/image/upload/".length).replace(/^v\d+\//, "");
  return rest.replace(/\.[A-Za-z0-9]{2,5}$/, "") || null;
}

function deliver(src: string, transformation: string) {
  const at = src.indexOf("/image/upload/");
  return `${src.slice(0, at + "/image/upload/".length)}${transformation}/${src.slice(at + "/image/upload/".length)}`;
}

/** Next's `loader` for photos cropped to a frame (product cards): fills the frame, keeping the subject in view. */
export function fillLoader(ratio: number) {
  // 4:5 is the store's standard portrait frame; anything else is passed as a decimal (width over height).
  const ar = Math.abs(ratio - 4 / 5) < 0.005 ? "4:5" : String(Math.round(ratio * 100) / 100);
  return ({ src, width }: { src: string; width: number }) =>
    deliver(src, `f_auto,q_auto,c_fill,ar_${ar},g_auto,w_${snapWidth(width)}`);
}

/** Next's `loader` for photos shown whole (product page, quick view, bag): never cropped, never enlarged. */
export const limitLoader = ({ src, width }: { src: string; width: number }) =>
  deliver(src, `f_auto,q_auto,c_limit,w_${snapWidth(width)}`);
