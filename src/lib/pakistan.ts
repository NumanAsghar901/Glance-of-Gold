/**
 * Pakistan address and phone helpers. Kept free of imports on purpose: the checkout form (a client
 * component) uses them, and pulling them from validators.ts would ship the whole Zod library to
 * every customer's phone.
 */

export const PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Azad Jammu & Kashmir",
  "Gilgit-Baltistan",
] as const;

/** Accepts 03XXXXXXXXX, 03XX-XXXXXXX, +923XXXXXXXXX, 923XXXXXXXXX. Returns 03XXXXXXXXX or null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "");
  let local = digits;
  if (/^\+92\d{10}$/.test(digits)) local = `0${digits.slice(3)}`;
  else if (/^92\d{10}$/.test(digits)) local = `0${digits.slice(2)}`;
  return /^03\d{9}$/.test(local) ? local : null;
}
