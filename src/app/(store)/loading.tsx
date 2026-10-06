/** Instant placeholder for any storefront page that has to be fetched, such as search, order tracking or the wishlist. */
export default function Loading() {
  return (
    <div className="wrap py-10 lg:py-16" role="status" aria-label="Loading">
      <div className="skeleton mx-auto h-10 w-56 sm:h-12 sm:w-72" />
      <div className="skeleton mx-auto mt-5 h-4 w-full max-w-md" />
      <div className="mt-12 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/5] w-full" />
            <div className="skeleton mt-3 h-4 w-3/4" />
            <div className="skeleton mt-2 h-4 w-1/3" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
