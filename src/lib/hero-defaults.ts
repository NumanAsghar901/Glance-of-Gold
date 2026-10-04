export type HeroSlide = {
  id: string | number;
  heading: string;
  subheading?: string | null;
  ctaLabel: string;
  ctaUrl: string;
  image: string;
  mobileImage?: string | null;
  alt: string;
};

/**
 * Slides shown on the home page until the owner adds banners in Admin > Home banner.
 * The artwork is generated illustration; real photography replaces it through the admin panel.
 */
export const defaultSlides: HeroSlide[] = [
  {
    id: "default-1",
    heading: "Jewellery made to be noticed",
    subheading: "Fine, wearable pieces for every day and every occasion, delivered across Pakistan.",
    ctaLabel: "Shop the collection",
    ctaUrl: "/shop",
    image: "/banners/banner-1.svg",
    mobileImage: "/banners/banner-1-m.svg",
    alt: "A woman wearing layered gold necklaces, a tikka and jhumka earrings",
  },
  {
    id: "default-2",
    heading: "Jhumkas for every celebration",
    subheading: "Light, golden and made to move with you.",
    ctaLabel: "Shop earrings",
    ctaUrl: "/collections/earrings",
    image: "/banners/banner-2.svg",
    mobileImage: "/banners/banner-2-m.svg",
    alt: "A woman in emerald wearing gold jhumka earrings and necklaces",
  },
  {
    id: "default-3",
    heading: "Bridal sets, ready to gift",
    subheading: "Matching necklaces and earrings for the big day.",
    ctaLabel: "Shop sets",
    ctaUrl: "/collections/sets",
    image: "/banners/banner-3.svg",
    mobileImage: "/banners/banner-3-m.svg",
    alt: "A gold bridal necklace set with jhumka earrings on an arched backdrop",
  },
];
