"use client";

import type { BundleSelection, PieceState } from "@/components/store/use-bundle-selection";
import { DIM_LABEL, type Dim } from "@/components/store/use-variant-selection";
import { chipBase, chipOff, chipOn, chipOut } from "@/components/store/variant-picker";
import { cn } from "@/lib/utils";

/** The chips for one kind of choice of one piece ("Nosering size 1"): radio buttons, so it can be used from the keyboard. */
function PieceGroup({
  piece,
  dim,
  bundle,
  idPrefix,
}: {
  piece: PieceState;
  dim: Dim;
  bundle: BundleSelection;
  idPrefix: string;
}) {
  const values = bundle.dims.find((d) => d.dim === dim)?.values ?? [];
  const picked = piece.choice[dim];
  // Sentence case, like the rest of the store: "Nosering size 1", "Nosering colour 1".
  const legend = `${bundle.pieceName} ${DIM_LABEL[dim].toLowerCase()} ${piece.index + 1}`;

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm">
        {legend}
        {picked !== undefined && <span className="ml-2 text-muted-foreground">{picked ?? "Standard"}</span>}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => {
          const on = picked === value;
          const out = bundle.isDisabled(piece.index, dim, value);
          return (
            <label key={value ?? "none"} className={cn("relative", out && "cursor-not-allowed")}>
              <input
                type="radio"
                name={`${idPrefix}-${piece.index}-${dim}`}
                checked={on}
                disabled={out}
                onChange={() => bundle.choose(piece.index, dim, value)}
                className="peer sr-only"
              />
              <span className={cn(chipBase, on ? chipOn : chipOff, out && chipOut)}>
                {value ?? "Standard"}
                {out && <span className="sr-only"> (not available)</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * The pickers for an offer of several pieces. Every piece has its own choices, shown one after the other:
 * a size first and, once it is chosen, the colour (and a design if there is one), then the next piece.
 */
export function BundlePicker({ bundle, idPrefix }: { bundle: BundleSelection; idPrefix: string }) {
  const anyDone = bundle.pieces.some((p) => p.variant);

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        This offer is for {bundle.count} pieces. Choose each one below, one after the other.
      </p>

      <div className="divide-y divide-border">
        {bundle.pieces.map((piece) => (
          <div key={piece.index} className="space-y-5 py-5 first:pt-0 last:pb-0">
            {piece.visible.map((dim) => (
              <PieceGroup key={dim} piece={piece} dim={dim} bundle={bundle} idPrefix={idPrefix} />
            ))}
          </div>
        ))}
      </div>

      {anyDone && (
        <section aria-label="Your set" className="text-sm">
          <p className="mb-2">Your set</p>
          <ul className="divide-y divide-border border border-border bg-surface">
            {bundle.pieces.map((piece) => (
              <li key={piece.index} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2.5">
                <span>{piece.heading}</span>
                <span className={piece.variant ? "text-foreground" : "text-muted-foreground"}>
                  {piece.variant ? piece.label || "Standard" : "Not chosen yet"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
