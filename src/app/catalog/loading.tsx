export default function LoadingCatalog() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="aspect-square rounded bg-zinc-800" />
          <div className="mt-3 h-4 w-3/4 rounded bg-zinc-800" />
          <div className="mt-2 h-4 w-1/2 rounded bg-zinc-800" />
          <div className="mt-2 h-6 w-1/3 rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}
