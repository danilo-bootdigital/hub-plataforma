'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  alterarStatusConversa,
  transferirConversa,
  adicionarTagConversa,
  removerTagConversa,
  criarTag,
  criarAnotacao,
} from '@/app/(dashboard)/whatsapp/actions-conversa'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { X, UserPlus, Tag, StickyNote, ArrowRightLeft, CheckCircle2, Clock, MessageCircle, CircleDot } from 'lucide-react'
import { SecaoDealVinculo } from './secao-deal-vinculo'
import { SecaoHistoricoAuditoria } from './secao-historico-auditoria'

type ConversaStatus = 'nao_atendida' | 'em_atendimento' | 'aguardando_cliente' | 'finalizada'

type TagType = { id: string; nome: string; cor: string }
type Nota = { id: string; conteudo: string; criado_em: string; autor_nome: string }
type Usuario = { id: string; nome: string }
type DealType = { id: string; titulo: string; valor_estimado: number | null; estagio_nome: string }

type Props = {
  conversaId: string
  status: ConversaStatus
  responsavel: Usuario | null
  tags: TagType[]
  todasTags: TagType[]
  notas: Nota[]
  usuarios: Usuario[]
  dealVinculado: DealType | null
  onClose: () => void
}

const STATUS_CONFIG: Record<ConversaStatus, { label: string; icon: typeof CircleDot; cor: string }> = {
  nao_atendida: { label: 'Não atendida', icon: CircleDot, cor: 'text-red-600' },
  em_atendimento: { label: 'Em atendimento', icon: MessageCircle, cor: 'text-blue-600' },
  aguardando_cliente: { label: 'Aguardando cliente', icon: Clock, cor: 'text-amber-600' },
  finalizada: { label: 'Finalizada', icon: CheckCircle2, cor: 'text-green-600' },
}

export function PainelDetalhesConversa({
  conversaId,
  status: statusInicial,
  responsavel: responsavelInicial,
  tags: tagsIniciais,
  todasTags: todasTagsIniciais,
  notas: notasIniciais,
  usuarios,
  dealVinculado,
  onClose,
}: Props) {
  const [status, setStatus] = useState<ConversaStatus>(statusInicial)
  const [responsavel, setResponsavel] = useState<Usuario | null>(responsavelInicial)
  const [tags, setTags] = useState<TagType[]>(tagsIniciais)
  const [todasTags, setTodasTags] = useState<TagType[]>(todasTagsIniciais)
  const [notas, setNotas] = useState<Nota[]>(notasIniciais)
  const [novaNotaTexto, setNovaNotaTexto] = useState('')
  const [novaTagNome, setNovaTagNome] = useState('')
  const [showTransferir, setShowTransferir] = useState(false)
  const [motivoTransf, setMotivoTransf] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleStatus(novoStatus: ConversaStatus) {
    const anterior = status
    setStatus(novoStatus)
    startTransition(async () => {
      try { await alterarStatusConversa(conversaId, novoStatus) }
      catch (e) {
        if (isRedirectError(e)) throw e
        setStatus(anterior)
      }
    })
  }

  function handleTransferir(paraId: string) {
    const usuario = usuarios.find((u) => u.id === paraId)
    if (!usuario) return
    const anteriorResp = responsavel
    setResponsavel(usuario)
    setShowTransferir(false)
    startTransition(async () => {
      try { await transferirConversa(conversaId, paraId, motivoTransf || undefined) }
      catch (e) {
        if (isRedirectError(e)) throw e
        setResponsavel(anteriorResp)
      }
    })
    setMotivoTransf('')
  }

  function handleAdicionarTag(tagId: string) {
    const tag = todasTags.find((t) => t.id === tagId)
    if (!tag || tags.some((t) => t.id === tagId)) return
    setTags([...tags, tag])
    startTransition(async () => {
      try { await adicionarTagConversa(conversaId, tagId) }
      catch (e) {
        if (isRedirectError(e)) throw e
        setTags((prev) => prev.filter((t) => t.id !== tagId))
      }
    })
  }

  function handleRemoverTag(tagId: string) {
    const tagRemovida = tags.find((t) => t.id === tagId)
    setTags(tags.filter((t) => t.id !== tagId))
    startTransition(async () => {
      try { await removerTagConversa(conversaId, tagId) }
      catch (e) {
        if (isRedirectError(e)) throw e
        if (tagRemovida) setTags((prev) => [...prev, tagRemovida])
      }
    })
  }

  function handleCriarTag() {
    if (!novaTagNome.trim()) return
    startTransition(async () => {
      try {
        const nova = await criarTag(novaTagNome.trim())
        if (nova) {
          setTodasTags([...todasTags, nova])
          setTags([...tags, nova])
          await adicionarTagConversa(conversaId, nova.id)
        }
      } catch (e) { if (isRedirectError(e)) throw e }
    })
    setNovaTagNome('')
  }

  function handleCriarNota() {
    if (!novaNotaTexto.trim()) return
    const texto = novaNotaTexto.trim()
    setNovaNotaTexto('')
    startTransition(async () => {
      try {
        const nova = await criarAnotacao(conversaId, texto)
        if (nova) setNotas([{ ...nova, id: nova.id as string, conteudo: nova.conteudo as string, criado_em: nova.criado_em as string, autor_nome: nova.autor_nome as string }, ...notas])
      } catch (e) { if (isRedirectError(e)) throw e }
    })
  }

  const tagsDisponiveis = todasTags.filter((t) => !tags.some((ct) => ct.id === t.id))

  return (
    <div className="flex h-full w-80 flex-col border-l bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Detalhes</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Status */}
        <section>
          <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Status</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.entries(STATUS_CONFIG) as [ConversaStatus, typeof STATUS_CONFIG[ConversaStatus]][]).map(([key, cfg]) => {
              const Icon = cfg.icon
              return (
                <button
                  key={key}
                  onClick={() => handleStatus(key)}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    status === key
                      ? 'bg-slate-100 ring-1 ring-slate-300'
                      : 'hover:bg-slate-50'
                  } ${cfg.cor}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Responsável */}
        <section>
          <h3 className="text-xs font-medium text-slate-500 uppercase mb-2 flex items-center gap-1">
            <UserPlus className="h-3.5 w-3.5" /> Responsável
          </h3>
          <p className="text-sm text-slate-700 mb-2">
            {responsavel?.nome ?? <span className="text-slate-400 italic">Nenhum</span>}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowTransferir(!showTransferir)}
          >
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Transferir
          </Button>
          {showTransferir && (
            <div className="mt-2 space-y-2 rounded-md border p-2">
              <input
                type="text"
                placeholder="Motivo (opcional)"
                value={motivoTransf}
                onChange={(e) => setMotivoTransf(e.target.value)}
                className="w-full rounded border px-2 py-1 text-xs"
              />
              <div className="max-h-32 overflow-y-auto space-y-1">
                {usuarios.filter((u) => u.id !== responsavel?.id).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleTransferir(u.id)}
                    disabled={isPending}
                    className="w-full text-left rounded px-2 py-1 text-xs hover:bg-slate-100"
                  >
                    {u.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Tags */}
        <section>
          <h3 className="text-xs font-medium text-slate-500 uppercase mb-2 flex items-center gap-1">
            <Tag className="h-3.5 w-3.5" /> Tags
          </h3>
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs gap-1"
                style={{ borderColor: tag.cor, color: tag.cor }}
              >
                {tag.nome}
                <button onClick={() => handleRemoverTag(tag.id)} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {tagsDisponiveis.length > 0 && (
            <select
              onChange={(e) => { handleAdicionarTag(e.target.value); e.target.value = '' }}
              className="w-full rounded border px-2 py-1 text-xs text-slate-600 mb-1"
              defaultValue=""
            >
              <option value="" disabled>Adicionar tag existente...</option>
              {tagsDisponiveis.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          )}
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Nova tag..."
              value={novaTagNome}
              onChange={(e) => setNovaTagNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCriarTag()}
              className="flex-1 rounded border px-2 py-1 text-xs"
            />
            <Button size="sm" variant="outline" onClick={handleCriarTag} disabled={isPending || !novaTagNome.trim()} className="text-xs px-2">
              +
            </Button>
          </div>
        </section>

        {/* Deal / Oportunidade */}
        <SecaoDealVinculo conversaId={conversaId} dealVinculado={dealVinculado} />

        {/* Anotações */}
        <section>
          <h3 className="text-xs font-medium text-slate-500 uppercase mb-2 flex items-center gap-1">
            <StickyNote className="h-3.5 w-3.5" /> Anotações internas
          </h3>
          <div className="space-y-2 mb-2">
            <Textarea
              value={novaNotaTexto}
              onChange={(e) => setNovaNotaTexto(e.target.value)}
              placeholder="Escreva uma anotação..."
              rows={2}
              className="text-xs resize-none"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCriarNota}
              disabled={isPending || !novaNotaTexto.trim()}
              className="w-full text-xs"
            >
              Salvar anotação
            </Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notas.map((nota) => (
              <div key={nota.id} className="rounded-md bg-amber-50 border border-amber-200 p-2">
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{nota.conteudo}</p>
                <p className="text-[12px] text-slate-400 mt-1">
                  {nota.autor_nome} · {new Date(nota.criado_em).toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Histórico de auditoria */}
        <SecaoHistoricoAuditoria conversaId={conversaId} />
      </div>
    </div>
  )
}
