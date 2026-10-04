import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  Announcement,
  Banner,
  GiftOffer,
  PaymentAccount,
  SiteSettings,
} from "@/lib/data/types";

/** Public site configuration and marketing content, cached with "settings" / "marketing" tags. */

const DEFAULT_SETTINGS: SiteSettings = {
  shippingFlat: 100,
  freeShippingThreshold: 2000,
  courier: "Leopards",
  whatsapp: "923166568142",
  helpline: "0316 6568142",
  email: "Glanceofgold@gmail.com",
};

export const getSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) throw new Error(`getSettings: ${error.message}`);

    const map = new Map(data.map((r) => [r.key, r.value]));
    const num = (k: string, fallback: number) => {
      const v = map.get(k);
      return typeof v === "number" ? v : fallback;
    };
    const str = (k: string, fallback: string) => {
      const v = map.get(k);
      return typeof v === "string" && v ? v : fallback;
    };
    return {
      shippingFlat: num("shipping_flat", DEFAULT_SETTINGS.shippingFlat),
      freeShippingThreshold: num("free_shipping_threshold", DEFAULT_SETTINGS.freeShippingThreshold),
      courier: str("courier", DEFAULT_SETTINGS.courier),
      whatsapp: str("whatsapp_number", DEFAULT_SETTINGS.whatsapp),
      helpline: str("helpline", DEFAULT_SETTINGS.helpline),
      email: str("contact_email", DEFAULT_SETTINGS.email),
    };
  },
  ["settings"],
  { tags: ["settings"], revalidate: 3600 },
);

export const getAnnouncements = unstable_cache(
  async (): Promise<Announcement[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("announcements")
      .select("id, message, coupon_code, link_url")
      .order("sort");
    if (error) throw new Error(`getAnnouncements: ${error.message}`);
    return data.map((a) => ({
      id: String(a.id),
      text: a.message,
      code: a.coupon_code ?? undefined,
      href: a.link_url ?? undefined,
    }));
  },
  ["announcements"],
  { tags: ["marketing"], revalidate: 300 },
);

export const getBanners = unstable_cache(
  async (): Promise<Banner[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.from("banners").select("*").order("sort");
    if (error) throw new Error(`getBanners: ${error.message}`);
    return data.map((b) => ({
      id: b.id,
      imageUrl: b.image_url,
      mobileImageUrl: b.mobile_image_url,
      heading: b.heading,
      subheading: b.subheading,
      ctaLabel: b.cta_label,
      ctaUrl: b.cta_url,
    }));
  },
  ["banners"],
  { tags: ["marketing"], revalidate: 300 },
);

type RawGiftRow = {
  id: number;
  name: string;
  min_items: number;
  pool: {
    variant: {
      id: number;
      name: string;
      stock: number;
      product: { name: string; images: { url: string; sort: number }[] } | null;
    } | null;
  }[];
};

export const getGiftOffer = unstable_cache(
  async (): Promise<GiftOffer | null> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("gift_offers")
      .select(
        "id, name, min_items, pool:gift_offer_products(variant:product_variants(id, name, stock, product:products(name, images:product_images(url, sort))))",
      )
      .order("min_items", { ascending: true })
      .limit(1);
    if (error) throw new Error(`getGiftOffer: ${error.message}`);

    const offer = (data as unknown as RawGiftRow[])[0];
    if (!offer) return null;

    const options = offer.pool.flatMap(({ variant }) => {
      if (!variant || !variant.product || variant.stock < 1) return [];
      const image = [...variant.product.images].sort((a, b) => a.sort - b.sort)[0]?.url ?? null;
      return [
        {
          variantId: variant.id,
          productName: variant.product.name,
          variantName: variant.name,
          image,
        },
      ];
    });
    if (options.length === 0) return null;
    return { id: offer.id, name: offer.name, minItems: offer.min_items, options };
  },
  ["gift-offer"],
  { tags: ["marketing"], revalidate: 300 },
);

export const getPaymentAccounts = unstable_cache(
  async (): Promise<PaymentAccount[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("payment_accounts")
      .select("id, method, account_title, account_number, iban, bank_name, instructions")
      .order("sort");
    if (error) throw new Error(`getPaymentAccounts: ${error.message}`);
    return data.flatMap((a) =>
      a.method === "cod"
        ? []
        : [
            {
              id: a.id,
              method: a.method,
              accountTitle: a.account_title,
              accountNumber: a.account_number,
              iban: a.iban,
              bankName: a.bank_name,
              instructions: a.instructions,
            },
          ],
    );
  },
  ["payment-accounts"],
  { tags: ["settings"], revalidate: 600 },
);
