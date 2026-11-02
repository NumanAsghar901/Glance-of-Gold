/**
 * What a customer chose from a product's variant groups, written the same way everywhere (the bag, checkout,
 * orders, emails): "Nose Ring 1, Size 6mm, gold". The database writes the same text onto each order line.
 * No imports, so client components can use it.
 */

export type OptionChoice = { group?: string | null; size?: string | null; colour?: string | null };

/** "6mm" becomes "Size 6mm", but a value that already says what it is ("Size 6") is left as it is. */
const sized = (value: string) => (/\bsize\b/i.test(value) ? value : `Size ${value}`);

/** The group heading, then the size, then the colour, whichever were chosen. Empty when nothing was. */
export function composeOptionLabel({ group, size, colour }: OptionChoice): string {
  const bits = [group?.trim(), size?.trim() ? sized(size.trim()) : "", colour?.trim()];
  return bits.filter(Boolean).join(", ");
}

/** The separate lines of a label ("Nose Ring 1", "Size 6mm", "gold"), for showing each on its own line. */
export function optionLines(label: string | null | undefined): string[] {
  if (!label || label.toLowerCase() === "standard") return [];
  return label
    .split(", ")
    .map((s) => s.trim())
    .filter(Boolean);
}
