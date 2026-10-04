import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/store/policy";
import { getSettings } from "@/lib/data/site";
import { formatPKR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shipping & Delivery",
  description: "Delivery charges, free delivery threshold and payment options at Glance of Gold.",
  alternates: { canonical: "/shipping" },
};

export default async function ShippingPage() {
  const s = await getSettings();
  return (
    <PolicyPage
      title="Shipping & Delivery"
      subtitle="Simple delivery across Pakistan."
      intro={`We deliver across Pakistan with ${s.courier}.`}
    >
      <PolicySection title="Delivery charges">
        <ul>
          <li>A flat delivery charge of {formatPKR(s.shippingFlat)} applies to every order.</li>
          <li>Delivery is free when your order is {formatPKR(s.freeShippingThreshold)} or more.</li>
          <li>The free delivery amount is counted before any coupon discount.</li>
        </ul>
      </PolicySection>
      <PolicySection title="Payment">
        <p>
          Pay with cash on delivery when your order arrives. Where shown at checkout you can also pay by JazzCash,
          Easypaisa or bank transfer.
        </p>
      </PolicySection>
      <PolicySection title="Order confirmation">
        <p>
          After you place an order we confirm it with you on WhatsApp, then dispatch it. We will share an estimated
          delivery time when we confirm your order. You can follow your order any time on the{" "}
          <Link href="/track">tracking page</Link>.
        </p>
      </PolicySection>
      <PolicySection title="Returns">
        <p>
          Changed your mind? See our <Link href="/returns-exchange">returns and exchange policy</Link>.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
