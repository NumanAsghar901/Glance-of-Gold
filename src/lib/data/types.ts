export type ProductImage = {
  url: string;
  alt: string;
  blur_data_url: string | null;
};

export type ProductVariant = {
  id: number;
  /** Full label used in the bag and on orders, for example "Gold, Design A, Size 6". */
  name: string;
  /** What kind of piece this variant is. Each is optional, and each gets its own picker on the product page. */
  color: string | null;
  design: string | null;
  size: string | null;
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
  /** Whether a customer may pick several designs or sizes at once, each with its own quantity. */
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
  /** Usual delivery time in days, shown on product pages as "Delivery in 4 to 5 days". */
  deliveryDaysMin: number;
  deliveryDaysMax: number;
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
