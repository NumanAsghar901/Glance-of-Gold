import type { Metadata } from "next";
import { TrackView } from "@/components/order/track-view";

import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Check the status of your Little Luxe Glow order with your order number and phone number.",
  alternates: { canonical: "/track" },
  openGraph: {
    title: "Track Your Order | Little Luxe Glow",
    description: "Check the status of your Little Luxe Glow order with your order number and phone number.",
    url: `${site.url}/track`,
    siteName: site.name,
    images: [
      {
        url: `${site.url}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: "Track Your Order - Little Luxe Glow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Track Your Order | Little Luxe Glow",
    description: "Check the status of your Little Luxe Glow order with your order number and phone number.",
    images: [`${site.url}/opengraph-image.png`],
  },
};

export default function TrackPage() {
  return (
    <div className="wrap py-10 lg:py-16">
      <header className="text-center">
        <h1 className="text-title">Track your order</h1>
        <div className="mx-auto mt-4 h-px w-16 bg-gold" aria-hidden="true" />
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Enter your order number and the mobile number you used when ordering.
        </p>
      </header>
      <div className="mt-10">
        <TrackView />
      </div>
    </div>
  );
}
