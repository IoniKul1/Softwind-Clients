export default function Loading() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-neutral-800 rounded-xl px-5 py-4 animate-pulse">
          <div className="h-4 w-32 bg-neutral-800 rounded" />
        </div>
      ))}
    </div>
  )
}
