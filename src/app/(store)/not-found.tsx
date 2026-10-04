import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="wrap grid min-h-[60dvh] place-content-center gap-6 py-24 text-center">
      <p className="font-heading text-[5rem] leading-none text-gold sm:text-[7rem]">404</p>
      <h1 className="text-title">This page could not be found</h1>
      <p className="mx-auto max-w-md text-muted-foreground">
        The link may be old, or the piece you are looking for may no longer be available.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button href="/shop">Browse the collection</Button>
        <Button href="/" variant="outline">
          Back to home
        </Button>
      </div>
    </div>
  );
}
