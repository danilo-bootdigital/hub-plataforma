import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { nomeExibicao, iniciais, formatarTelefone } from '@/lib/telefone'

type ConversaStatus = 'nao_atendida' | 'em_atendimento' | 'aguardando_cliente' | 'finalizada'

type Props = {
  conversa: {
    id: string
    telefone_externo: string
    ultima_mensagem_em: string | null
    lead: { id: string; nome: string | null } | null
    instancia: { nome: string } | null
    ultima_mensagem: string | null
    status: ConversaStatus
    responsavel_id: string | null
    responsavel_nome: string | null
    tags: { id: string; nome: string; cor: string }[]
  }
  ativa: boolean
}

const STATUS_DOT: Record<ConversaStatus, string> = {
  nao_atendida: 'bg-red-500',
  em_atendimento: 'bg-blue-500',
  aguardando_cliente: 'bg-amber-500',
  finalizada: 'bg-green-500',
}

export function ItemConversa({ conversa, ativa }: Props) {
  const nome = nomeExibicao(conversa.lead?.nome, conversa.telefone_externo)
  const telefoneFormatado = formatarTelefone(conversa.telefone_externo)
  const avatarIniciais = iniciais(conversa.lead?.nome ?? nome)
  const hora = conversa.ultima_mensagem_em
    ? format(new Date(conversa.ultima_mensagem_em), 'HH:mm', { locale: ptBR })
    : ''

  const semResposta = conversa.status === 'nao_atendida' && conversa.ultima_mensagem_em
  const tempoEspera = semResposta
    ? formatDistanceToNow(new Date(conversa.ultima_mensagem_em!), { locale: ptBR, addSuffix: false })
    : null

  return (
    <Link
      href={`/whatsapp/${conversa.id}`}
      className={cn(
        'flex items-start gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors',
        ativa && 'bg-slate-100',
        semResposta && 'bg-red-50/50'
      )}
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 font-semibold text-xs">
        {avatarIniciais}
        <span className={cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white', STATUS_DOT[conversa.status])} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{nome}</p>
            <p className="text-[11px] text-slate-400 truncate">{telefoneFormatado}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {semResposta && (
              <span className="flex items-center gap-0.5 text-[12px] text-red-600 font-medium">
                <AlertCircle className="h-3 w-3" />
                {tempoEspera}
              </span>
            )}
            {hora && <span className="text-xs text-slate-400">{hora}</span>}
          </div>
        </div>
        {conversa.ultima_mensagem && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{conversa.ultima_mensagem}</p>
        )}
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {conversa.responsavel_nome && (
            <span className="text-[12px] text-slate-400">{conversa.responsavel_nome}</span>
          )}
          {conversa.instancia && (
            <span className="text-[12px] text-slate-400">· {conversa.instancia.nome}</span>
          )}
          {conversa.tags.slice(0, 2).map((tag) => (
            <Badge key={tag.id} variant="outline" className="text-[9px] px-1 py-0 h-4" style={{ borderColor: tag.cor, color: tag.cor }}>
              {tag.nome}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  )
}
