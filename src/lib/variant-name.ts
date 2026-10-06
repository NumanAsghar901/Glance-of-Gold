/**
 * A variant's `name` is the full label that appears in the bag, on orders and in emails, for example
 * "Gold, Size 6". The colour is also stored on its own so the store can group variants by colour.
 * These two helpers keep the naming rule in one place, for the admin (writing) and the store (reading).
 * No imports, so client components can use them.
 */

const isStandard = (label: string) => label.toLowerCase() === "standard";

/** Builds the full name from an optional colour and a size, design or option label. */
export function composeVariantName(color: string | null | undefined, label: string): string {
  const c = (color ?? "").trim();
  const l = label.trim();
  if (c) return l && !isStandard(l) ? `${c}, ${l}` : c;
  return l || "Standard";
}

/** The part of a variant's name that is not its colour. Empty for a colour-only variant. */
export function variantLabel(name: string, color: string | null | undefined): string {
  const c = (color ?? "").trim();
  if (!c) return name;
  if (name === c) return "";
  const prefix = `${c}, `;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}
