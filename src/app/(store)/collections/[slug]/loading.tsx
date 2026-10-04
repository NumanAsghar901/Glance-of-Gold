import { GridSkeleton } from "@/components/store/grid-skeleton";

export default function Loading() {
  return (
    <div className="wrap py-10 lg:py-16" role="status" aria-label="Loading products">
      <div className="skeleton mx-auto h-12 w-64" />
      <div className="mt-16">
        <GridSkeleton />
      </div>
    </div>
  );
}
