"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_EDGE, type ImageSlot } from "@/lib/image-specs";
import { cn } from "@/lib/utils";

/** The live site accepts about 4.5 MB per request, so a form's photos have to fit under that together. */
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
/** To fit the upload limit a photo is made lighter first, and only then smaller, but never below this many pixels. */
const FLOOR_EDGE = 1600;

const inputClass =
  "w-full border border-border bg-surface px-3 py-2.5 text-sm file:mr-4 file:border-0 file:bg-sand file:px-4 file:py-1.5 file:text-sm";

type Report = { key: string; name: string; text: string; error?: boolean };

const px = (w: number, h: number) => `${w.toLocaleString("en-PK")} × ${h.toLocaleString("en-PK")}`;

function toJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Gets a photo ready to send. Any size is accepted. A photo is sent as it is when it already fits its share
 * of the upload limit; otherwise it is re-saved as a high quality JPEG, losing a little quality and then a
 * little size only as far as needed. Phone photos are often 4000 pixels wide and 5 MB or more, which a form
 * cannot send, so this keeps as much detail as the upload allows without anyone resizing by hand.
 */
async function prepare(file: File, slot: ImageSlot, budget: number): Promise<{ file: File; note?: string }> {
  const bitmap = await createImageBitmap(file); // applies the camera's rotation
  const { width, height } = bitmap;
  const long = Math.max(width, height);
  const maxEdge = MAX_EDGE[slot];

  if (long <= maxEdge && file.size <= budget) {
    bitmap.close();
    return { file };
  }

  let edge = Math.min(long, maxEdge);
  let quality = 0.9;
  let blob: Blob | null = null;
  let w = width;
  let h = height;
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, edge / long);
    w = Math.round(width * scale);
    h = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "white"; // JPEG has no transparency
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    blob = await toJpeg(canvas, quality);
    if (!blob || blob.size <= budget) break;
    if (quality > 0.82) quality = 0.82;
    else if (edge * 0.85 >= FLOOR_EDGE) edge = Math.round(edge * 0.85);
    else break;
  }
  bitmap.close();

  // Keep the original if re-saving did not make it smaller (or the browser could not do it).
  if (!blob || blob.size >= file.size) return { file };
  const reduced = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  return {
    file: reduced,
    note: `Reduced from ${px(width, height)} to ${px(w, h)} (${(reduced.size / 1024 / 1024).toFixed(1)} MB) so it uploads reliably.`,
  };
}

/**
 * A photo upload box for the admin. Any photo can be added, whatever its size; very large ones are reduced
 * for you so the form can send them.
 */
export function PhotoInput({
  slot,
  name,
  id,
  multiple,
  required,
}: {
  slot: ImageSlot;
  name: string;
  id: string;
  multiple?: boolean;
  required?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(false);

  // The form clears itself after saving, so clear the notes too.
  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    const clear = () => setReports([]);
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    const chosen = [...(el.files ?? [])];
    el.setCustomValidity("");
    if (chosen.length === 0) {
      setReports([]);
      return;
    }
    setBusy(true);
    const next: Report[] = [];
    const ready: File[] = [];
    let blocked = "";
    // Photos share the upload limit, so each gets an equal part of it.
    const budget = MAX_TOTAL_BYTES / chosen.length;
    for (const [i, file] of chosen.entries()) {
      try {
        const p = await prepare(file, slot, budget);
        if (p.note) next.push({ key: `${i}-${file.name}`, name: file.name, text: p.note });
        ready.push(p.file);
      } catch {
        const text = "could not be read as a picture. Please choose a JPG, PNG, WebP or AVIF photo.";
        next.push({ key: `${i}-${file.name}`, name: file.name, text, error: true });
        blocked ||= `${file.name} ${text}`;
      }
    }

    // Put the prepared copies in the box, so those are what gets sent.
    try {
      const transfer = new DataTransfer();
      ready.forEach((f) => transfer.items.add(f));
      el.files = transfer.files;
    } catch {
      /* an older browser: the original files are sent, and the server reduces them */
    }

    const total = ready.reduce((n, f) => n + f.size, 0);
    if (!blocked && total > MAX_TOTAL_BYTES) {
      blocked = `These photos add up to ${(total / 1024 / 1024).toFixed(1)} MB. Please add them in smaller groups, about 3 at a time, so they upload reliably.`;
      next.push({ key: "total", name: "Too many at once", text: blocked, error: true });
    }
    el.setCustomValidity(blocked);
    setReports(next);
    setBusy(false);
  }

  return (
    <div>
      <input
        ref={input}
        id={id}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple={multiple}
        required={required}
        onChange={onChange}
        className={inputClass}
      />
      {busy && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          Checking your {multiple ? "photos" : "photo"}...
        </p>
      )}
      {reports.length > 0 && (
        <ul className="mt-2 space-y-1.5" aria-live="polite">
          {reports.map((r) => (
            <li
              key={r.key}
              className={cn("text-xs leading-relaxed", r.error ? "text-danger" : "text-muted-foreground")}
            >
              <span className="font-medium">{r.name}</span> {r.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
