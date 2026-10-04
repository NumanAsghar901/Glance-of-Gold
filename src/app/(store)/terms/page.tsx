import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/store/policy";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Glance of Gold.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms of Service"
      subtitle="The terms that govern your use of Glance of Gold."
      intro={
        'These Terms of Service ("Terms") govern your use of the Glance of Gold website and related services. By accessing or placing an order through our website, you agree to comply with and be bound by these Terms.'
      }
    >
      <PolicySection title="1. Use of the Website">
        <p>
          You agree to use this website for lawful purposes only. Any misuse, fraudulent activity, or attempt to
          disrupt the website&apos;s functionality is strictly prohibited.
        </p>
      </PolicySection>
      <PolicySection title="2. Intellectual Property">
        <p>
          All content on this website, including text, images, logos, graphics, and design, is the property of Glance
          of Gold and is protected by applicable copyright and intellectual property laws. Unauthorized use,
          reproduction, or distribution is not permitted.
        </p>
      </PolicySection>
      <PolicySection title="3. Product Information & Pricing">
        <p>
          We strive to ensure all product descriptions, images, and prices are accurate. However, errors may
          occasionally occur. Glance of Gold reserves the right to correct any errors and to cancel or refuse orders
          placed at incorrect prices.
        </p>
      </PolicySection>
      <PolicySection title="4. Orders & Payment">
        <p>
          All orders are subject to confirmation and availability. We offer Cash on Delivery (COD) and, where shown at
          checkout, manual payment by JazzCash, Easypaisa or bank transfer. Orders paid by transfer are confirmed once
          your payment has been verified. You agree to provide accurate and complete information when placing an
          order.
        </p>
      </PolicySection>
      <PolicySection title="5. Limitation of Liability">
        <p>
          Glance of Gold shall not be liable for any indirect, incidental, or consequential damages resulting from the
          use of our website or products, to the fullest extent permitted by law.
        </p>
      </PolicySection>
      <PolicySection title="6. Governing Law">
        <p>
          These Terms shall be governed by and interpreted in accordance with the laws of Pakistan. Any disputes shall
          be subject to the jurisdiction of the courts of Pakistan.
        </p>
      </PolicySection>
      <PolicySection title="7. Changes to These Terms">
        <p>
          We reserve the right to update or modify these Terms at any time. Continued use of the website after changes
          are posted constitutes acceptance of those changes.
        </p>
      </PolicySection>
      <PolicySection title="Contact">
        <p>If you have any questions regarding these Terms, please contact us:</p>
        <p>
          Email: <a href={`mailto:${site.email}`}>{site.email}</a>
          <br />
          Phone: <a href={`tel:${site.helplineTel}`}>{site.helpline}</a>
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
