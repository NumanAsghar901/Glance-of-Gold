/**
 * A variant's `name` is the full label that appears in the cart, on orders and in emails, for example
 * "Gold, Size 6, Design 2". The colour, size and design are also stored on their own so the store can give
 * each one its own picker. These helpers keep the naming rule in one place, for the admin (writing) and the
 * store (reading). No imports, so client components can use them.
 *
 * The order is always colour, size, design, and a size or design is always labelled, so a bare "6" or "2"
 * still reads as "Size 6" or "Design 2" in the cart and on the order.
 */

export type VariantParts = { color?: string | null; design?: string | null; size?: string | null };

/** The three things a variant can differ by. A customer may choose only some of them, for example just a size. */
export type VariantPart = "colour" | "size" | "design";

/** The name of a variant showing only the parts the customer chose ("Size 6" when no design was chosen). */
export function composeChosenName(
  variant: { color?: string | null; design?: string | null; size?: string | null },
  parts: readonly VariantPart[],
): string {
  return composeVariantName({
    color: parts.includes("colour") ? variant.color : null,
    size: parts.includes("size") ? variant.size : null,
    design: parts.includes("design") ? variant.design : null,
  });
}

const isStandard = (label: string) => label.toLowerCase() === "standard";

/** "6" becomes "Size 6", but "Size 6" and "Rose design" are left as they are (they already say what they are). */
function labelled(kind: "size" | "design", value: string) {
  return new RegExp(`\\b${kind}\\b`, "i").test(value) ? value : `${kind === "size" ? "Size" : "Design"} ${value}`;
}

/** Builds the full name from the colour, size and design that are set. "Standard" when none is. */
export function composeVariantName(parts: VariantParts): string {
  const clean = (v: string | null | undefined) => {
    const t = (v ?? "").trim();
    return t && !isStandard(t) ? t : "";
  };
  const color = clean(parts.color);
  const size = clean(parts.size);
  const design = clean(parts.design);
  const bits = [color, size && labelled("size", size), design && labelled("design", design)].filter(Boolean);
  return bits.length ? bits.join(", ") : "Standard";
}

/** The separate lines of a variant name ("Size 6", "Design 2"), for showing each on its own line. Empty for Standard. */
export function variantLines(name: string | null | undefined): string[] {
  if (!name || isStandard(name)) return [];
  return name
    .split(", ")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The part of an older variant's name that is not its colour. Only used for products saved before designs
 * and sizes had their own columns.
 */
export function variantLabel(name: string, color: string | null | undefined): string {
  const c = (color ?? "").trim();
  if (!c) return name;
  if (name === c) return "";
  const prefix = `${c}, `;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}
