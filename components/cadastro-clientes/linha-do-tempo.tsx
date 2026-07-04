import {
  FilePlus, Upload, Send, AlertTriangle, RefreshCw, CheckCircle2, XCircle, UserCheck, Mail, Circle, Trash2,
} from 'lucide-react'
import { EVENTO_LABEL } from '@/lib/cadastro-clientes/documentos'
import type { DetalheCadastro } from '@/lib/cadastro-clientes/documentos'

const ICONE: Record<string, typeof Circle> = {
  criado: FilePlus,
  documento_enviado: Upload,
  documento_removido: Trash2,
  enviado_industria: Send,
  correcao_solicitada: AlertTriangle,
  reapresentado: RefreshCw,
  aprovado: CheckCircle2,
  reprovado: XCircle,
  convertido: UserCheck,
  email_enviado: Mail,
}

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return dt }
}

export function LinhaDoTempo({ eventos }: { eventos: DetalheCadastro['eventos'] }) {
  if (!eventos.length) {
    return <p className="text-sm text-slate-500">Nenhum evento registrado ainda.</p>
  }
  return (
    <ol className="space-y-4">
      {eventos.map((e) => {
        const Icone = ICONE[e.tipo_evento] ?? Circle
        return (
          <li key={e.id} className="flex gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Icone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{EVENTO_LABEL[e.tipo_evento] ?? e.tipo_evento}</p>
              {e.observacao && <p className="mt-0.5 text-sm text-slate-600">{e.observacao}</p>}
              <p className="mt-0.5 text-xs text-slate-400">
                {fmt(e.created_at)}{e.ator_nome ? ` · ${e.ator_nome}` : ''}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
