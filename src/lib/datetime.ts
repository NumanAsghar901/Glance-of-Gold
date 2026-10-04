/** Admin date fields are entered and shown in Pakistan Standard Time (UTC+5, no daylight saving). */
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** "2026-10-04T18:30" (as typed in a datetime-local field) to an ISO timestamp, or null when empty/invalid. */
export function fromPktInput(value: FormDataEntryValue | null | undefined): string | null {
  if (typeof value !== "string" || !value) return null;
  const t = Date.parse(`${value}:00+05:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** ISO timestamp to the value format datetime-local fields expect, in PKT. */
export function toPktInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(Date.parse(iso) + PKT_OFFSET_MS).toISOString().slice(0, 16);
}
