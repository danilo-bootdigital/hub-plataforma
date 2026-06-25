export default function DashboardLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
        <p className="text-sm text-slate-500">Carregando...</p>
      </div>
    </div>
  )
}
