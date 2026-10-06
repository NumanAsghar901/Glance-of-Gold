"use client";

import { useEffect, useRef, useState } from "react";
import { describeImageSize, IMAGE_SPECS, judgeImageSize, type ImageSlot, type SizeVerdict } from "@/lib/image-specs";
import { cn } from "@/lib/utils";

/** The live site accepts about 4.5 MB per request, so a form's photos have to fit under that together. */
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
/** A photo already smaller than this is sent as it is, untouched. */
const KEEP_AS_IS_BYTES = 1.5 * 1024 * 1024;

const inputClass =
  "w-full border border-border bg-surface px-3 py-2.5 text-sm file:mr-4 file:border-0 file:bg-sand file:px-4 file:py-1.5 file:text-sm";

type Report = { key: string; name: string; verdict: SizeVerdict; text: string; shrunk?: string };

/**
 * Reads a photo and, when it is bigger than it needs to be, reduces it to a sharp but compact JPEG. Phone
 * photos are often 4000 pixels wide and 5 MB or more, which a form cannot send; shrinking them here means
 * nobody has to shrink a photo by hand (which is how photos end up blurry).
 */
async function prepare(file: File, slot: ImageSlot) {
  const bitmap = await createImageBitmap(file); // applies the camera's rotation
  const { width, height } = bitmap;
  const long = Math.max(width, height);
  const { maxEdge } = IMAGE_SPECS[slot];

  if (long <= maxEdge && file.size <= KEEP_AS_IS_BYTES) {
    bitmap.close();
    return { file, width, height, shrunk: undefined };
  }

  const scale = Math.min(1, maxEdge / long);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { file, width, height, shrunk: undefined };
  }
  ctx.fillStyle = "white"; // JPEG has no transparency
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  // Keep the original if re-saving did not make it smaller (or the browser could not do it).
  if (!blob || blob.size >= file.size) return { file, width, height, shrunk: undefined };
  const reduced = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  return {
    file: reduced,
    width: w,
    height: h,
    shrunk: `Reduced from ${width.toLocaleString("en-PK")} × ${height.toLocaleString("en-PK")} to ${w.toLocaleString("en-PK")} × ${h.toLocaleString("en-PK")} (${(reduced.size / 1024 / 1024).toFixed(1)} MB) so it uploads quickly and stays sharp.`,
    sourceWidth: width,
    sourceHeight: height,
  };
}

/**
 * A photo upload box for the admin. It tells you straight away whether each photo is big enough to look sharp
 * where the store shows it, reduces huge phone photos for you, and stops the form if a photo is too small.
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
    for (const [i, file] of chosen.entries()) {
      try {
        const p = await prepare(file, slot);
        // Sharpness depends on the photo you chose, not on the copy we shrank, so judge the original size.
        const w = "sourceWidth" in p && p.sourceWidth ? p.sourceWidth : p.width;
        const h = "sourceHeight" in p && p.sourceHeight ? p.sourceHeight : p.height;
        const { verdict, text } = describeImageSize(slot, w, h);
        next.push({ key: `${i}-${file.name}`, name: file.name, verdict: judgeImageSize(slot, w, h), text, shrunk: p.shrunk });
        if (verdict === "too-small" && !blocked) blocked = `${file.name}: ${text}`;
        ready.push(p.file);
      } catch {
        next.push({ key: `${i}-${file.name}`, name: file.name, verdict: "too-small", text: "could not be read as a picture. Please choose a JPG, PNG, WebP or AVIF photo." });
        blocked ||= `${file.name} could not be read as a picture.`;
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
      next.push({ key: "total", name: "Too many at once", verdict: "too-small", text: blocked });
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
              className={cn(
                "text-xs leading-relaxed",
                r.verdict === "too-small" ? "text-danger" : r.verdict === "soft" ? "text-gold-hover" : "text-muted-foreground",
              )}
            >
              <span className="font-medium">{r.name}</span> {r.text}
              {r.shrunk && <span className="block text-muted-foreground">{r.shrunk}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * For a photo that is already uploaded: says so when it is too small to look sharp. Nothing is shown for a photo
 * that is big enough. Loads the picture in the browser to read its size.
 */
export function ImageSizeNote({ url, slot, className }: { url: string; slot: ImageSlot; className?: string }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;
    return () => {
      img.onload = null;
    };
  }, [url]);

  if (!size) return null;
  const { verdict, text } = describeImageSize(slot, size.width, size.height);
  if (verdict === "sharp") return null;
  return (
    <p className={cn("text-xs leading-relaxed", verdict === "too-small" ? "text-danger" : "text-gold-hover", className)}>
      {text}
    </p>
  );
}
