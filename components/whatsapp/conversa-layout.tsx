'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ThreadMensagens } from './thread-mensagens'
import { FormEnvioMensagem } from './form-envio-mensagem'
import { PainelDetalhesConversa } from './painel-detalhes-conversa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ModalExportarConversaButton } from './modal-exportar-conversa-button'
import Link from 'next/link'
import { ChevronLeft, PanelRightOpen, Pencil, Check, X } from 'lucide-react'
import { formatarTelefone, iniciais } from '@/lib/telefone'
import { editarNomeConversa } from '@/app/(dashboard)/whatsapp/actions-conversa'

type ConversaStatus = 'nao_atendida' | 'em_atendimento' | 'aguardando_cliente' | 'finalizada'
type TagType = { id: string; nome: string; cor: string }
type Nota = { id: string; conteudo: string; criado_em: string; autor_nome: string }
type Usuario = { id: string; nome: string }
type Mensagem = {
  id: string
  direcao: 'enviada' | 'recebida'
  conteudo: string | null
  tipo_midia: string
  url_midia: string | null
  enviado_em: string
  responsavel: { nome: string } | null
}

type DealType = { id: string; titulo: string; valor_estimado: number | null; estagio_nome: string }

type Props = {
  conversaId: string
  titulo: string
  telefone: string
  instanciaNome: string | null
  instanciaConectada: boolean
  leadId: string | null
  status: ConversaStatus
  responsavel: Usuario | null
  tags: TagType[]
  todasTags: TagType[]
  notas: Nota[]
  usuarios: Usuario[]
  dealVinculado: DealType | null
  mensagens: Mensagem[]
  organizationId: string
  perfilId: string
  perfilNome: string
}

const STATUS_BADGE: Record<ConversaStatus, { label: string; variant: string }> = {
  nao_atendida: { label: 'Não atendida', variant: 'bg-red-100 text-red-700' },
  em_atendimento: { label: 'Em atendimento', variant: 'bg-blue-100 text-blue-700' },
  aguardando_cliente: { label: 'Aguardando', variant: 'bg-amber-100 text-amber-700' },
  finalizada: { label: 'Finalizada', variant: 'bg-green-100 text-green-700' },
}

export function ConversaLayout({
  conversaId,
  titulo,
  telefone,
  instanciaNome,
  instanciaConectada,
  leadId,
  status,
  responsavel,
  tags,
  todasTags,
  notas,
  usuarios,
  dealVinculado,
  mensagens,
  organizationId,
  perfilId,
  perfilNome,
}: Props) {
  const [painelAberto, setPainelAberto] = useState(false)
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome] = useState(titulo)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const badge = STATUS_BADGE[status]

  function salvarNome() {
    if (!novoNome.trim()) {
      toast.error('Nome não pode estar vazio.')
      return
    }
    startTransition(async () => {
      try {
        await editarNomeConversa(conversaId, novoNome.trim())
        toast.success('Nome atualizado.')
        setEditandoNome(false)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

  return (
    <div className="flex h-full">
      {/* Área principal */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
          <Link href="/whatsapp">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700 font-semibold text-xs shrink-0">
            {iniciais(titulo)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {editandoNome ? (
                <div className="flex items-center gap-1">
                  <Input
                    className="h-7 text-sm w-48"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') setEditandoNome(false) }}
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={salvarNome} disabled={isPending}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={() => { setEditandoNome(false); setNovoNome(titulo) }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900 truncate">{titulo}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => { setEditandoNome(true); setNovoNome(titulo) }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </>
              )}
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium ${badge.variant}`}>
                {badge.label}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <p className="text-xs text-slate-400">
                {formatarTelefone(telefone)}
                {instanciaNome && ` · ${instanciaNome}`}
                {!instanciaConectada && ' · ⚠ Desconectado'}
              </p>
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-[12px] px-1.5 py-0" style={{ borderColor: tag.cor, color: tag.cor }}>
                  {tag.nome}
                </Badge>
              ))}
              {tags.length > 3 && (
                <span className="text-[12px] text-slate-400">+{tags.length - 3}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ModalExportarConversaButton
              conversaId={conversaId}
              telefone={telefone}
              nomeContato={titulo}
              mensagens={mensagens}
              organizationId={organizationId}
              perfilId={perfilId}
              perfilNome={perfilNome}
              leadId={leadId}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPainelAberto(!painelAberto)}>
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Thread */}
        <ThreadMensagens mensagensIniciais={mensagens} conversaId={conversaId} />

        {/* Envio */}
        <FormEnvioMensagem
          conversaId={conversaId}
          variaveis={{ nome: titulo, vendedor: perfilNome, telefone }}
        />
      </div>

      {/* Painel lateral */}
      {painelAberto && (
        <PainelDetalhesConversa
          conversaId={conversaId}
          status={status}
          responsavel={responsavel}
          tags={tags}
          todasTags={todasTags}
          notas={notas}
          usuarios={usuarios}
          dealVinculado={dealVinculado}
          onClose={() => setPainelAberto(false)}
        />
      )}
    </div>
  )
}
