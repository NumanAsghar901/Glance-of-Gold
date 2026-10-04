import type { Metadata } from "next";
import { TrackView } from "@/components/order/track-view";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status of your Glance of Gold order with your order number and phone number.",
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
