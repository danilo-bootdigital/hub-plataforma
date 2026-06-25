import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageCircle } from 'lucide-react'

type Props = {
  conversaId: string
  leadNome: string | null
  telefone: string
  conteudo: string | null
  enviadoEm: string
}

export function ItemMensagemPendente({ conversaId, leadNome, telefone, conteudo, enviadoEm }: Props) {
  const inicial = (leadNome ?? telefone).charAt(0).toUpperCase()

  return (
    <Link
      href={`/whatsapp/${conversaId}`}
      className="group flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:shadow-md hover:border-slate-300/80"
    >
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
        {inicial}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-800 truncate">
            {leadNome ?? telefone}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">
              {formatDistanceToNow(new Date(enviadoEm), { addSuffix: true, locale: ptBR })}
            </span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
            </div>
          </div>
        </div>
        {leadNome && (
          <p className="text-xs text-slate-400 mt-0.5">{telefone}</p>
        )}
        <p className="mt-1.5 text-sm text-slate-500 line-clamp-1">
          {conteudo ?? 'Mídia recebida'}
        </p>
      </div>
    </Link>
  )
}
