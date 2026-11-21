export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-border" />
      <div className="h-4 w-64 rounded bg-border" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-lg border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}
