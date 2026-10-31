"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { discardUploads, getUploadTicket } from "@/app/actions/admin-uploads";
import { useOnFormSaved } from "@/components/admin/action-form";
import { Photo } from "@/components/ui/photo";
import { cloudinarySrc, SLOTS, type UploadedPhoto } from "@/lib/cloudinary";
import { ACCEPT, lighten, sendToCloudinary } from "@/lib/cloudinary-upload";

type Item = {
  key: string;
  name: string;
  progress: number;
  error?: string;
  photo?: UploadedPhoto;
};

const AT_ONCE = 3;

export const photoInputClass =
  "w-full border border-border bg-surface px-3 py-2.5 text-sm file:mr-4 file:border-0 file:bg-sand file:px-4 file:py-1.5 file:text-sm";

/**
 * Photo upload for products. Each photo goes from the browser straight to Cloudinary the moment it is chosen
 * (signed by the server, limited to 2000 px on the longest side), so size is never a problem and saving the
 * product only sends the photo addresses. The first photo is the main image, the second shows on hover.
 */
export function CloudinaryUploader({ id }: { id: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const uploading = items.some((i) => !i.photo && !i.error);

  // Once the product is saved these photos belong to it, so the list starts empty again.
  useOnFormSaved(() => setItems([]));

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

    const ticket = await getUploadTicket("product");
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
            const file = await lighten(next.file, SLOTS.product.edge);
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
      <input ref={input} id={id} type="file" accept={ACCEPT} multiple onChange={onChange} className={photoInputClass} />
      {/* Controlled, so a form reset after saving cannot empty it while the photos are still listed. */}
      <input type="hidden" name="uploadedImages" value={JSON.stringify(done)} readOnly />

      {items.length > 0 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 border border-border bg-background p-2">
              <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-sand">
                {item.photo && <Photo src={cloudinarySrc(item.photo.publicId)} alt="" fill sizes="44px" className="object-contain" />}
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
                className="grid size-10 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-danger"
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
