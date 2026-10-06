/**
 * A variant's `name` is the full label that appears in the bag, on orders and in emails, for example
 * "Gold, Design A, Size 6". The colour, design and size are also stored on their own so the store can
 * give each one its own picker. These helpers keep the naming rule in one place, for the admin (writing)
 * and the store (reading). No imports, so client components can use them.
 */

export type VariantParts = { color?: string | null; design?: string | null; size?: string | null };

const isStandard = (label: string) => label.toLowerCase() === "standard";

/** Builds the full name from the colour, design and size that are set. "Standard" when none is. */
export function composeVariantName(parts: VariantParts): string {
  const bits = [parts.color, parts.design, parts.size]
    .map((p) => (p ?? "").trim())
    .filter((p) => p && !isStandard(p));
  return bits.length ? bits.join(", ") : "Standard";
}

/**
 * The part of an older variant's name that is not its colour. Only used for products saved before
 * designs and sizes had their own columns.
 */
export function variantLabel(name: string, color: string | null | undefined): string {
  const c = (color ?? "").trim();
  if (!c) return name;
  if (name === c) return "";
  const prefix = `${c}, `;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}
