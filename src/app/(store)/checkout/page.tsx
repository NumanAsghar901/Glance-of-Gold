import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getPaymentAccounts } from "@/lib/data/site";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const accounts = await getPaymentAccounts();
  // Transfer methods appear only once the owner has activated an account for them.
  const transferMethods = [...new Set(accounts.map((a) => a.method))];

  return (
    <div className="wrap py-10 lg:py-16">
      <h1 className="text-title text-center">Checkout</h1>
      <div className="mx-auto mt-4 h-px w-16 bg-gold" aria-hidden="true" />
      <div className="mt-10 lg:mt-14">
        <CheckoutForm transferMethods={transferMethods} />
      </div>
    </div>
  );
}
