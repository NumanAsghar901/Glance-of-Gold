import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/store/policy";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Glance of Gold collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      subtitle="Your privacy matters to us. Here's how we protect it."
      intro="At Glance of Gold, your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you visit our website, place an order, or contact our customer support team."
    >
      <PolicySection title="Information We Collect">
        <p>
          We may collect personal information such as your name, phone number, email address, shipping address, and
          order details to process and deliver your purchases. We also collect limited technical data (such as browser
          type and device information) to improve our website performance and user experience.
        </p>
      </PolicySection>
      <PolicySection title="How We Use Your Information">
        <p>
          Your information is used to process orders, confirm deliveries, provide customer support, and improve our
          services. We do not sell, rent, or trade your personal information to third parties for marketing purposes.
        </p>
      </PolicySection>
      <PolicySection title="Payment Method">
        <p>
          Glance of Gold offers Cash on Delivery (COD): you only pay when your order is delivered to your address.
          Where shown at checkout, you may instead pay by JazzCash, Easypaisa or bank transfer. In that case we receive
          the transaction ID and any screenshot you send us, and use them only to verify your payment.
        </p>
      </PolicySection>
      <PolicySection title="Data Protection & Security">
        <p>
          We implement appropriate security measures to protect your personal data from unauthorized access,
          alteration, disclosure, or misuse. Access to your information is limited to authorized personnel only.
        </p>
      </PolicySection>
      <PolicySection title="Customer Support & Communication">
        <p>
          When you contact us through email, phone or WhatsApp, we may retain those communications to respond to your
          inquiries, resolve issues, and improve our customer service.
        </p>
      </PolicySection>
      <PolicySection title="Third-Party Services">
        <p>
          We may use trusted third-party service providers (such as courier services) to fulfill deliveries. These
          partners only receive the necessary information required to complete your order.
        </p>
        <p>
          We also use Meta (Facebook and Instagram) advertising tools, such as the Meta Pixel, to measure and improve
          our advertising. These tools may collect information about your browser and device and about the pages you
          view and actions you take on our website.
        </p>
      </PolicySection>
      <PolicySection title="Policy Updates">
        <p>
          Glance of Gold may update this Privacy Policy from time to time. Any changes will be posted on this page, and
          we encourage you to review it periodically.
        </p>
      </PolicySection>
      <PolicySection title="Contact Us">
        <p>If you have any questions regarding this Privacy Policy, please contact us:</p>
        <p>
          Email: <a href={`mailto:${site.email}`}>{site.email}</a>
          <br />
          Phone: <a href={`tel:${site.helplineTel}`}>{site.helpline}</a>
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
