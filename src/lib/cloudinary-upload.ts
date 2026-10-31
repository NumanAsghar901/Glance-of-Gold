import type { UploadedPhoto, UploadTicket } from "@/lib/cloudinary";

/** Browser side of direct uploads: used by every admin photo box and by the payment screenshot box at checkout. */

/** Cloudinary's limit for one image on the free plan. Anything near it is re-saved smaller first. */
const BIGGEST_FILE = 9 * 1024 * 1024;

export const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/** A photo too heavy for Cloudinary's file limit is re-saved as a high quality JPEG at the stored size. Others are sent as they are. */
export async function lighten(file: File, edge: number): Promise<File> {
  if (file.size <= BIGGEST_FILE) return file;
  const bitmap = await createImageBitmap(file); // applies the camera's rotation
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot reduce the photo.");
  ctx.fillStyle = "white"; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("This browser cannot reduce the photo.");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
}

/** Sends one image straight to Cloudinary (not through this site's server), reporting progress as it goes. */
export function sendToCloudinary(file: File, ticket: UploadTicket, onProgress: (fraction: number) => void) {
  return new Promise<UploadedPhoto>((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    for (const [k, v] of Object.entries(ticket.fields)) body.append(k, v);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", ticket.url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () => reject(new Error("The upload was interrupted. Check your connection and try again."));
    xhr.onload = () => {
      let json: { public_id?: string; width?: number; height?: number; error?: { message?: string } } = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* handled below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && json.public_id && json.width && json.height) {
        resolve({ publicId: json.public_id, width: json.width, height: json.height });
      } else {
        reject(new Error(json.error?.message ?? `The upload was refused (HTTP ${xhr.status}).`));
      }
    };
    xhr.send(body);
  });
}
