import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";

/**
 * Meta Conversions API (server-side Purchase). Uses the same event_id as the
 * browser pixel so Meta de-duplicates the two. Skipped silently unless both
 * NEXT_PUBLIC_META_PIXEL_ID and META_CAPI_TOKEN are configured.
 */
const sha256 = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export type PurchaseEvent = {
  eventId: string;
  value: number;
  contentIds: string[];
  phone: string; // local format 03XXXXXXXXX
  email?: string | null;
  name: string;
  city: string;
};

export type MetaRequestContext = {
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  sourceUrl?: string;
};

/** Capture request-scoped values. Call this in the request, before handing work to after(). */
export async function readMetaContext(): Promise<MetaRequestContext> {
  const h = await headers();
  const c = await cookies();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: h.get("user-agent") ?? undefined,
    fbp: c.get("_fbp")?.value,
    fbc: c.get("_fbc")?.value,
    sourceUrl: h.get("referer") ?? undefined,
  };
}

export async function sendMetaPurchase(e: PurchaseEvent, ctx: MetaRequestContext) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) return;

  try {
    const [first, ...rest] = e.name.trim().split(/\s+/);

    const userData: Record<string, unknown> = {
      ph: [sha256(e.phone.replace(/^0/, "92"))],
      fn: [sha256(first)],
      ct: [sha256(e.city.replace(/\s+/g, ""))],
      country: [sha256("pk")],
      client_ip_address: ctx.ip,
      client_user_agent: ctx.userAgent,
      fbp: ctx.fbp,
      fbc: ctx.fbc,
    };
    if (rest.length) userData.ln = [sha256(rest[rest.length - 1])];
    if (e.email) userData.em = [sha256(e.email)];

    const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            event_id: e.eventId,
            action_source: "website",
            event_source_url: ctx.sourceUrl,
            user_data: userData,
            custom_data: {
              currency: "PKR",
              value: e.value,
              content_type: "product",
              content_ids: e.contentIds,
            },
          },
        ],
      }),
    });
    if (!res.ok) console.error("[meta] CAPI responded", res.status, await res.text());
  } catch (err) {
    console.error("[meta] CAPI failed:", err);
  }
}
