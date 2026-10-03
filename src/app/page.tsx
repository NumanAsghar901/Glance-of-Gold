import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Temporary landing so the shell can be reviewed. The real home page is step 3.
export default function Home() {
  return (
    <section className="wrap grid min-h-[70dvh] place-content-center gap-8 py-20 text-center">
      <p className="text-eyebrow text-gold-hover">Glance of Gold</p>
      <h1 className="text-display mx-auto max-w-3xl">Jewellery made to be noticed</h1>
      <p className="mx-auto max-w-md text-muted-foreground">
        Our collection is being prepared. Elegant pieces, delivered across Pakistan.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button href="/shop">
          Shop the collection <ArrowRight />
        </Button>
        <Button href="/about" variant="outline">
          Our story
        </Button>
      </div>
    </section>
  );
}
