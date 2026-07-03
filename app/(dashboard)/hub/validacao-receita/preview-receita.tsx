import { FileText } from 'lucide-react'

// Preview grande da receita (esquerda). Imagem → <img>; PDF → <iframe>. Plano (server/client).
export function PreviewReceita({ url, tipo, nome }: { url: string | null; tipo: string | null; nome?: string | null }) {
  const ehImagem = (tipo ?? '').startsWith('image/')
  return (
    <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
        <span className="truncate text-xs font-medium text-slate-600">{nome ?? 'Receita'}</span>
        {url && <a href={url} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-emerald-600 hover:underline">Abrir em nova aba</a>}
      </div>
      <div className="min-h-0 flex-1">
        {!url ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <FileText className="size-10" />
            <span className="text-sm">Anexe a receita para pré-visualizar</span>
          </div>
        ) : ehImagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Receita" className="h-full w-full object-contain" />
        ) : (
          <iframe src={url} title="Receita" className="h-full w-full border-0" />
        )}
      </div>
    </div>
  )
}
