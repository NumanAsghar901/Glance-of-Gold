export type ProductImage = {
  url: string;
  alt: string;
  blur_data_url: string | null;
};

/** What the variants of a product are called on its page. */
export type OptionLabel = "Size" | "Design" | "Option";

export type ProductVariant = {
  id: number;
  /** Full label used in the bag and on orders, for example "Gold, Size 6". */
  name: string;
  /** Colour of this variant, when the product comes in colours. */
  color: string | null;
  /** The part of the name that is not the colour, for example "Size 6". Empty for a colour-only variant. */
  label: string;
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
  /** True when the pieces left across all variants are few (see LOW_STOCK_THRESHOLD) but not zero. */
  lowStock: boolean;
  /** Average star rating (0 when there are no reviews yet), review count and units sold. */
  rating: number;
  ratingCount: number;
  soldCount: number;
  /** Set when the product has exactly one variant, so cards can offer quick add. */
  quickAdd: { variantId: number; variantName: string; stock: number } | null;
};

export type ProductDetail = ProductSummary & {
  description: string | null;
  material: string | null;
  tags: string[];
  variants: ProductVariant[];
  /** What the variants are called, and whether a customer may pick several at once. */
  optionLabel: OptionLabel;
  allowMultiple: boolean;
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
