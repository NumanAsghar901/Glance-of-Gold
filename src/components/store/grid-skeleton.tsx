/** Placeholder shown while product data loads. Uses the sand shimmer so layout never jumps. */
export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="skeleton aspect-[4/5]" />
          <div className="skeleton mt-4 h-3 w-1/3" />
          <div className="skeleton mt-2 h-5 w-3/4" />
          <div className="skeleton mt-2 h-4 w-1/4" />
        </li>
      ))}
    </ul>
  );
}
