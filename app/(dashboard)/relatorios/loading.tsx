export default function RelatoriosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded bg-slate-200" />
      <div className="h-10 w-full rounded-lg bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-lg bg-slate-200" />
        <div className="h-72 rounded-lg bg-slate-200" />
      </div>
    </div>
  )
}
