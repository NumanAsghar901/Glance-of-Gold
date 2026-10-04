import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/store/policy";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Returns & Exchange",
  description: "Return or exchange your Glance of Gold order within 14 days of delivery.",
  alternates: { canonical: "/returns-exchange" },
};

export default function ReturnsPage() {
  return (
    <PolicyPage
      title="Returns & Exchange"
      subtitle="Not quite right? We make returns and exchanges simple."
      intro="At Glance of Gold, customer satisfaction is our priority. If you are not fully satisfied with your purchase, you may request a return or exchange within 14 days of receiving your order."
    >
      <PolicySection title="Eligibility">
        <ul>
          <li>Items must be unused, unopened (if applicable), and in original packaging.</li>
          <li>Products damaged due to misuse or improper handling are not eligible for return.</li>
          <li>
            Certain items (such as clearance or made-to-order pieces) may not be eligible for return or exchange.
          </li>
        </ul>
      </PolicySection>
      <PolicySection title="How to Request a Return or Exchange">
        <ul>
          <li>
            Contact us via email at <a href={`mailto:${site.email}`}>{site.email}</a> or call us at{" "}
            <a href={`tel:${site.helplineTel}`}>{site.helpline}</a>.
          </li>
          <li>Provide your order number and reason for return or exchange.</li>
          <li>Our team will guide you through the next steps and confirm the process.</li>
        </ul>
      </PolicySection>
      <PolicySection title="Refunds & Exchanges">
        <p>
          <strong className="font-medium text-foreground">Refunds:</strong> Once the returned product is received and
          inspected, refunds will be processed within 5-7 business days.
        </p>
        <p>
          <strong className="font-medium text-foreground">Exchanges:</strong> If the requested item is available, we
          will dispatch the replacement as soon as possible.
        </p>
      </PolicySection>
      <PolicySection title="Shipping Costs">
        <p>
          Delivery charges are non-refundable unless the item received was damaged or incorrect. Return shipping costs
          may apply depending on the reason for return.
        </p>
      </PolicySection>
      <PolicySection title="Need help?">
        <p>
          For any further assistance, feel free to contact us at <a href={`mailto:${site.email}`}>{site.email}</a> or
          call <a href={`tel:${site.helplineTel}`}>{site.helpline}</a>.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
