export default function CaixaDeEntradaLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 rounded bg-slate-200" />
      <div className="h-10 rounded-lg bg-slate-200" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-200" />
        ))}
      </div>
    </div>
  )
}
