'use client'

// ============================================================
// ChatArea: painel de conversa estilo WhatsApp Web
// ============================================================
// - Cabeçalho renderiza a partir do RESUMO da conversa (mesma
//   fonte da lista) → troca instantânea, sem fetch.
// - ThreadMensagens carrega as mensagens de forma assíncrona,
//   paginada e com cache (skeleton só na área de mensagens).
// - Input desabilitado enquanto a 1ª página carrega.
// ============================================================

import { useState } from 'react'
import { ArrowLeft, Star, Tag, MoreVertical, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { iniciais, formatarTelefone } from '@/lib/telefone'
import { ThreadMensagens } from './thread-mensagens'
import { FormEnvioMensagem } from './form-envio-mensagem'

const STATUS_BADGE: Record<string, { label: string; classe: string }> = {
  nao_atendida: { label: 'Não atendida', classe: 'bg-red-100 text-red-700' },
  em_atendimento: { label: 'Em atendimento', classe: 'bg-blue-100 text-blue-700' },
  aguardando_cliente: { label: 'Aguardando', classe: 'bg-amber-100 text-amber-700' },
  finalizada: { label: 'Finalizada', classe: 'bg-emerald-100 text-emerald-700' },
}

export type ChatHeaderInfo = {
  id: string
  nome: string
  telefone: string
  status: string
  instanciaNome?: string | null
}

type MensagemInicial = {
  id: string
  conteudo: string | null
  direcao: 'enviada' | 'recebida'
  tipo_midia: string
  url_midia: string | null
  enviado_em: string
}

type Props = {
  info: ChatHeaderInfo
  mensagensIniciais?: MensagemInicial[]
  onFechar: () => void
  onAbrirPainel: () => void
}

export function ChatArea({ info, mensagensIniciais, onFechar, onAbrirPainel }: Props) {
  const [carregando, setCarregando] = useState(true)
  const badge = STATUS_BADGE[info.status] ?? STATUS_BADGE.nao_atendida

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-white">
      {/* Header (instantâneo, a partir do resumo da lista) */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2.5 md:px-4">
        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 md:hidden" onClick={onFechar} title="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-emerald-100 text-sm font-semibold text-emerald-700">
            {iniciais(info.nome)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{info.nome}</p>
            <Badge className={badge.classe} variant="secondary">
              {badge.label}
            </Badge>
          </div>
          <p className="truncate text-xs text-slate-400">
            {formatarTelefone(info.telefone)}
            {info.instanciaNome && <span className="ml-1">· {info.instanciaNome}</span>}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-500" title="Etiquetas" onClick={onAbrirPainel}>
            <Tag className="h-[18px] w-[18px]" />
          </Button>
          <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-500" title="Favoritar" disabled>
            <Star className="h-[18px] w-[18px]" />
          </Button>
          <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-500" title="Detalhes do contato" onClick={onAbrirPainel}>
            <PanelRightOpen className="h-[18px] w-[18px]" />
          </Button>
          <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-500" title="Mais opções" onClick={onAbrirPainel}>
            <MoreVertical className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </div>

      {/* Thread — remonta por conversa (key) para estado limpo; cache no módulo */}
      <ThreadMensagens
        key={info.id}
        conversaId={info.id}
        mensagensIniciais={mensagensIniciais}
        onLoadingChange={setCarregando}
      />

      {/* Form de envio (desabilitado enquanto a 1ª página carrega) */}
      <FormEnvioMensagem conversaId={info.id} disabled={carregando} />
    </div>
  )
}
