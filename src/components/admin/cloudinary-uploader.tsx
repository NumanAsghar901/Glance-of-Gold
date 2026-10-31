"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { discardUploads, getUploadTicket } from "@/app/actions/admin-uploads";
import { ProductPhoto } from "@/components/store/product-photo";
import { cloudinarySrc, MAX_STORED_EDGE } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

/** Sent to the server with the form: where each uploaded photo lives and how big it is. */
export type UploadedPhoto = { publicId: string; width: number; height: number };

type Item = {
  key: string;
  name: string;
  progress: number;
  error?: string;
  photo?: UploadedPhoto;
};

/** Cloudinary's limit for one image on the free plan. Anything near it is re-saved smaller first. */
const BIGGEST_FILE = 9 * 1024 * 1024;
const AT_ONCE = 3;

const inputClass =
  "w-full border border-border bg-surface px-3 py-2.5 text-sm file:mr-4 file:border-0 file:bg-sand file:px-4 file:py-1.5 file:text-sm";

/** A photo too heavy for Cloudinary's file limit is re-saved as a high quality JPEG at the stored size (2000 px). */
async function lighten(file: File): Promise<File> {
  if (file.size <= BIGGEST_FILE) return file;
  const bitmap = await createImageBitmap(file); // applies the camera's rotation
  const scale = Math.min(1, MAX_STORED_EDGE / Math.max(bitmap.width, bitmap.height));
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

type Ticket = Extract<Awaited<ReturnType<typeof getUploadTicket>>, { ticket: unknown }>["ticket"];

/** Sends one photo straight to Cloudinary (not through this site's server), reporting progress as it goes. */
function sendToCloudinary(file: File, ticket: Ticket, onProgress: (fraction: number) => void) {
  return new Promise<UploadedPhoto>((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    for (const [k, v] of Object.entries(ticket.fields)) body.append(k, v);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", ticket.url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () => reject(new Error("The upload was interrupted. Check your connection and add the photo again."));
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

/**
 * Photo upload for products. Each photo goes from the browser straight to Cloudinary the moment it is chosen
 * (signed by the server, limited to 2000 px on the longest side), so size is never a problem and saving the
 * product only sends the photo addresses. The first photo is the main image, the second shows on hover.
 */
export function CloudinaryUploader({ id }: { id: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const uploading = items.some((i) => !i.photo && !i.error);

  // The form cannot be saved while a photo is still on its way, so it is never saved without it.
  useEffect(() => {
    input.current?.setCustomValidity(uploading ? "Please wait until the photos have finished uploading." : "");
  }, [uploading]);

  const patch = (key: string, change: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...change } : i)));

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = [...(e.currentTarget.files ?? [])];
    e.currentTarget.value = ""; // the files are kept below, not in the box
    if (!chosen.length) return;

    const added = chosen.map((file, i) => ({ file, item: { key: `${Date.now()}-${i}-${file.name}`, name: file.name, progress: 0 } satisfies Item }));
    setItems((list) => [...list, ...added.map((a) => a.item)]);

    const ticket = await getUploadTicket();
    if ("error" in ticket) {
      added.forEach((a) => patch(a.item.key, { error: ticket.error }));
      return;
    }

    // A few at a time, so a phone on mobile data is not asked to carry everything at once.
    const queue = [...added];
    await Promise.all(
      Array.from({ length: Math.min(AT_ONCE, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          try {
            const file = await lighten(next.file);
            const photo = await sendToCloudinary(file, ticket.ticket, (f) => patch(next!.item.key, { progress: f }));
            patch(next.item.key, { progress: 1, photo });
          } catch (err) {
            patch(next.item.key, { error: err instanceof Error ? err.message : "The upload failed." });
          }
        }
      }),
    );
  }

  function remove(item: Item) {
    setItems((list) => list.filter((i) => i.key !== item.key));
    // Not saved with any product yet, so the stored copy would be left over: delete it.
    if (item.photo) void discardUploads([item.photo.publicId]);
  }

  const done = items.flatMap((i) => (i.photo ? [i.photo] : []));

  return (
    <div>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        onChange={onChange}
        className={inputClass}
      />
      {/* Controlled, so a form reset after saving cannot empty it while the photos are still listed. */}
      <input type="hidden" name="uploadedImages" value={JSON.stringify(done)} readOnly />

      {items.length > 0 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 border border-border bg-background p-2">
              <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-sand">
                {item.photo && (
                  <ProductPhoto src={cloudinarySrc(item.photo.publicId)} alt="" fill sizes="44px" className="object-contain" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="truncate font-medium">{item.name}</p>
                {item.error ? (
                  <p className="mt-0.5 leading-relaxed text-danger">{item.error}</p>
                ) : item.photo ? (
                  <p className="mt-0.5 text-muted-foreground">Uploaded, saved when you save the product.</p>
                ) : (
                  <div className="mt-1.5 h-1 w-full bg-sand" role="progressbar" aria-label={`Uploading ${item.name}`} aria-valuenow={Math.round(item.progress * 100)}>
                    <div className="h-full origin-left bg-gold transition-transform duration-200" style={{ transform: `scaleX(${item.progress})` }} />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(item)}
                aria-label={`Remove ${item.name}`}
                className={cn("grid size-10 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-danger")}
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
