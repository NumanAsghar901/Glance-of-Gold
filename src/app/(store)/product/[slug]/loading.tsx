export default function Loading() {
  return (
    <div className="wrap py-6 lg:py-10" role="status" aria-label="Loading product">
      <div className="skeleton h-4 w-56" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="skeleton aspect-[4/5]" />
        <div className="space-y-4 lg:py-4">
          <div className="skeleton h-12 w-3/4" />
          <div className="skeleton h-5 w-32" />
          <div className="skeleton mt-6 h-20 w-full" />
          <div className="skeleton mt-6 h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
