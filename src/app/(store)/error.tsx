"use client";

import { Button } from "@/components/ui/button";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap grid min-h-[60dvh] place-content-center gap-6 py-24 text-center">
      <h1 className="text-title">Something went wrong</h1>
      <p className="mx-auto max-w-md text-muted-foreground">
        We could not load this page. Please try again. If it keeps happening, message us on WhatsApp and we will help
        with your order.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button onClick={reset}>Try again</Button>
        <Button href="/" variant="outline">
          Back to home
        </Button>
      </div>
    </div>
  );
}
