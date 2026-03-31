export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col gap-2 animate-pulse">
          <div className="h-3 w-16 bg-neutral-800 rounded" />
          <div className="h-10 bg-neutral-900 border border-neutral-800 rounded-lg" />
        </div>
      ))}
      <div className="h-12 bg-neutral-900 border border-neutral-800 rounded-full animate-pulse mt-4" />
    </div>
  )
}
