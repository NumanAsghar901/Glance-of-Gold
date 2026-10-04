export type ProductImage = {
  url: string;
  alt: string;
  blur_data_url: string | null;
};

export type ProductVariant = {
  id: number;
  name: string;
  stock: number;
  priceOverride: number | null;
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
  inStock: boolean;
  /** Set when the product has exactly one variant, so cards can offer quick add. */
  quickAdd: { variantId: number; variantName: string; stock: number } | null;
};

export type ProductDetail = ProductSummary & {
  description: string | null;
  material: string | null;
  tags: string[];
  variants: ProductVariant[];
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
  courier: string;
  whatsapp: string;
  helpline: string;
  email: string;
};

export type GiftOption = {
  variantId: number;
  productName: string;
  variantName: string;
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
