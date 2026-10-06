/** Shown at once while an admin page loads, so a tap always gets an instant answer. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="skeleton h-9 w-48 sm:h-10 sm:w-64" />
      <div className="skeleton mt-3 h-4 w-full max-w-md" />
      <div className="mt-8 grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-surface p-5">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton mt-3 h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
