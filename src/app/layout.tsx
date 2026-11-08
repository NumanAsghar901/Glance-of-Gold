import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Little Luxe Glow | Pakistani Jewellery Brand",
    template: "%s | Little Luxe Glow",
  },
  description: site.description,
  applicationName: "Little Luxe Glow",
  keywords: [
    "Little Luxe Glow",
    "Little Luxe Glow Jewellery",
    "Pakistani jewellery",
    "jewellery Pakistan",
    "online jewellery store Pakistan",
    "nose rings",
    "rings",
    "necklaces",
    "earrings",
    "bangles",
    "cash on delivery jewellery",
  ],
  authors: [{ name: "Little Luxe Glow", url: site.url }],
  creator: "Little Luxe Glow",
  publisher: "Little Luxe Glow",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_PK",
    url: site.url,
    title: "Little Luxe Glow | Pakistani Jewellery Brand",
    description: site.description,
    images: [
      {
        url: `${site.url}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: "Little Luxe Glow Jewellery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Little Luxe Glow | Pakistani Jewellery Brand",
    description: site.description,
    images: [`${site.url}/opengraph-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#FBF8F3",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
