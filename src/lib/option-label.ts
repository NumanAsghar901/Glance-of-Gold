/**
 * What a customer chose from a product's variant groups, written the same way everywhere (the bag, checkout,
 * orders, emails): "Nose Ring 1: Size 6mm, Gold · Nose Ring 2: Size 8mm, Silver".
 * The database writes the same text onto each order line.
 * No external imports, so client components can use it.
 */

export type OptionItem = {
  group: string;
  size?: string | null;
  colour?: string | null;
};

export type OptionChoice = {
  options?: OptionItem[] | null;
  group?: string | null;
  size?: string | null;
  colour?: string | null;
};

/** "6mm" becomes "Size 6mm", but a value that already says what it is ("Size 6") is left as it is. */
const sized = (value: string) => (/\bsize\b/i.test(value) ? value : `Size ${value}`);

function formatOneGroup(grp: string | undefined | null, size: string | undefined | null, colour: string | undefined | null, simplifyGeneric = false): string {
  const bits = [size?.trim() ? sized(size.trim()) : "", colour?.trim()].filter(Boolean).join(", ");
  const g = grp?.trim();
  if (!g) return bits;
  if (!bits) return g;
  if (simplifyGeneric && /^(size|colour|color|option|options|standard)$/i.test(g)) return bits;
  return `${g}: ${bits}`;
}

/** Formats the chosen variants into a label. Empty when nothing was chosen. */
export function composeOptionLabel(choice: OptionChoice): string {
  if (choice.options && choice.options.length > 0) {
    return choice.options
      .map((o) => formatOneGroup(o.group, o.size, o.colour, choice.options!.length === 1))
      .filter(Boolean)
      .join(" · ");
  }

  return formatOneGroup(choice.group, choice.size, choice.colour, true);
}

/** The separate lines of a label (e.g. one line per variant: "Nose Ring 1: Size 6mm, Gold"). */
export function optionLines(label: string | null | undefined): string[] {
  if (!label || label.toLowerCase() === "standard") return [];
  if (label.includes(" · ")) {
    return label
      .split(" · ")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (label.includes("\n")) {
    return label
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return label
    .split(", ")
    .map((s) => s.trim())
    .filter(Boolean);
}
