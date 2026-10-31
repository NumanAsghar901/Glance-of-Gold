"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { discardUploads, getUploadTicket } from "@/app/actions/admin-uploads";
import { photoInputClass } from "@/components/admin/cloudinary-uploader";
import { useOnFormSaved } from "@/components/admin/action-form";
import { Photo } from "@/components/ui/photo";
import { cloudinarySrc, SLOTS, type UploadedPhoto, type UploadSlot } from "@/lib/cloudinary";
import { ACCEPT, lighten, sendToCloudinary } from "@/lib/cloudinary-upload";

type State = { name: string; progress: number; error?: string; photo?: UploadedPhoto };

/**
 * A single-photo box for the admin (category photo, banner photos). The photo goes from the browser straight to
 * Cloudinary as soon as it is chosen, and the form carries only its address in a field called `name`.
 * Choosing another photo replaces the one not yet saved; saving the form empties the box.
 */
export function CloudinaryPhotoField({
  id,
  name,
  slot,
  required,
}: {
  id: string;
  name: string;
  slot: UploadSlot;
  required?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State | null>(null);
  const uploading = !!state && !state.photo && !state.error;

  useOnFormSaved(() => setState(null));

  useEffect(() => {
    input.current?.setCustomValidity(
      uploading ? "Please wait until the photo has finished uploading." : required && !state?.photo ? "Please choose a photo." : "",
    );
  }, [uploading, required, state?.photo]);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = ""; // the file is kept below, not in the box
    if (!file) return;

    // A photo chosen earlier but never saved is replaced, so it must not be left behind.
    if (state?.photo) void discardUploads([state.photo.publicId]);
    setState({ name: file.name, progress: 0 });

    const ticket = await getUploadTicket(slot);
    if ("error" in ticket) {
      setState({ name: file.name, progress: 0, error: ticket.error });
      return;
    }
    try {
      const ready = await lighten(file, SLOTS[slot].edge);
      const photo = await sendToCloudinary(ready, ticket.ticket, (progress) => setState((s) => (s ? { ...s, progress } : s)));
      setState({ name: file.name, progress: 1, photo });
    } catch (err) {
      setState({ name: file.name, progress: 0, error: err instanceof Error ? err.message : "The upload failed." });
    }
  }

  function remove() {
    if (state?.photo) void discardUploads([state.photo.publicId]);
    setState(null);
  }

  return (
    <div>
      <input ref={input} id={id} type="file" accept={ACCEPT} onChange={onChange} className={photoInputClass} />
      {/* Controlled, so a form reset after a failed save cannot empty it while the photo is still shown. */}
      <input type="hidden" name={name} value={state?.photo?.publicId ?? ""} readOnly />

      {state && (
        <div className="mt-3 flex items-center gap-3 border border-border bg-background p-2" aria-live="polite">
          <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-sand">
            {state.photo && <Photo src={cloudinarySrc(state.photo.publicId)} alt="" fill sizes="44px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-medium">{state.name}</p>
            {state.error ? (
              <p className="mt-0.5 leading-relaxed text-danger">{state.error}</p>
            ) : state.photo ? (
              <p className="mt-0.5 text-muted-foreground">Uploaded, saved when you save.</p>
            ) : (
              <div className="mt-1.5 h-1 w-full bg-sand" role="progressbar" aria-label={`Uploading ${state.name}`} aria-valuenow={Math.round(state.progress * 100)}>
                <div className="h-full origin-left bg-gold transition-transform duration-200" style={{ transform: `scaleX(${state.progress})` }} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={remove}
            aria-label={`Remove ${state.name}`}
            className="grid size-10 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-danger"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
