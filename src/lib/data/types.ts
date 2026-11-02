export type ProductImage = {
  /** Where the photo is served from: the Cloudinary address when `publicId` is set, otherwise the Supabase Storage file. */
  url: string;
  /** Cloudinary public_id, set for photos stored on Cloudinary. */
  publicId: string | null;
  alt: string;
  blur_data_url: string | null;
  /** Pixel size of the photo, so cards and galleries take its shape. Null for photos not measured yet. */
  width: number | null;
  height: number | null;
};

/**
 * A variant group: a heading ("Nose Ring 1") with the sizes and colours a customer can choose from. A product can
 * have several groups. The customer chooses sizes and colours from each, with a quantity for every choice.
 */
export type OptionGroup = {
  id: number;
  heading: string;
  sizes: string[];
  colours: string[];
};

export type ProductSummary = {
  id: number;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  isFeatured: boolean;
  category: { name: string; slug: string } | null;
  images: ProductImage[];
  /** Pieces in stock: one number for the whole product, whatever sizes and colours are chosen. */
  stock: number;
  inStock: boolean;
  /** True when the pieces left are few (see LOW_STOCK_THRESHOLD) but not zero. */
  lowStock: boolean;
  /** Average star rating (0 when there are no reviews yet), review count and units sold. */
  rating: number;
  ratingCount: number;
  soldCount: number;
  /** Set when the product has no variant groups (nothing to choose), so cards can offer quick add. */
  quickAdd: { stock: number } | null;
};

export type ProductDetail = ProductSummary & {
  description: string | null;
  material: string | null;
  tags: string[];
  groups: OptionGroup[];
};

export type Review = {
  id: number;
  authorName: string;
  city: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  product?: { name: string; slug: string } | null;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

export type SiteSettings = {
  shippingFlat: number;
  freeShippingThreshold: number;
  /** Usual delivery time in days, shown on product pages as "Delivery in 4 to 5 days". */
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  courier: string;
  whatsapp: string;
  helpline: string;
  email: string;
};

export type GiftOption = {
  productId: number;
  productName: string;
  image: string | null;
};

export type GiftOffer = {
  id: number;
  name: string;
  minItems: number;
  options: GiftOption[];
};

export type PaymentAccount = {
  id: number;
  method: "jazzcash" | "easypaisa" | "bank_transfer";
  accountTitle: string | null;
  accountNumber: string | null;
  iban: string | null;
  bankName: string | null;
  instructions: string | null;
};

export type Announcement = { id: string; text: string; code?: string; href?: string };

export type Banner = {
  id: number;
  imageUrl: string;
  mobileImageUrl: string | null;
  heading: string | null;
  subheading: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
};
