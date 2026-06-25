'use client'

import { useEffect, useState, useTransition, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar,
  DollarSign,
  User,
  MessageSquare,
  MessageCircle,
  Globe,
  XCircle,
  ArrowRightLeft,
} from 'lucide-react'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatarMoeda } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { adicionarObservacaoDeal, moverDeal } from '@/app/(dashboard)/pipeline/actions'
import { BadgeOrigem } from '@/components/leads/badge-origem'
import { FileText, Plus } from 'lucide-react'

import type { DealCard } from './kanban-card'

type Autor = {
  nome: string
}

type ObservacaoSupabase = {
  id: string
  descricao: string
  criado_em: string
  autor: Autor | Autor[] | null
}

type Observacao = {
  id: string
  descricao: string
  criado_em: string
  autor: Autor | null
}

type Estagio = {
  id: string
  nome: string
  tipo_especial: 'fechado' | 'perdido' | null
}

type Props = {
  deal: DealCard | null
  aberto: boolean
  onFechar: () => void
  estagios?: Estagio[]
}

type BadgeOrigemTipo = ComponentProps<typeof BadgeOrigem>['origem']

function normalizarObservacoes(data: ObservacaoSupabase[] | null): Observacao[] {
  return (data ?? []).map((obs) => ({
    id: obs.id,
    descricao: obs.descricao,
    criado_em: obs.criado_em,
    autor: Array.isArray(obs.autor) ? obs.autor[0] ?? null : obs.autor,
  }))
}

async function buscarObservacoesDeal(dealId: string): Promise<Observacao[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('activities')
    .select('id, descricao, criado_em, autor:profiles!autor_id(nome)')
    .eq('deal_id', dealId)
    .eq('tipo', 'observacao')
    .order('criado_em', { ascending: false })

  if (error) {
    throw new Error('Erro ao carregar observações.')
  }

  return normalizarObservacoes(data as ObservacaoSupabase[])
}

export function ModalDetalheDeal({ deal, aberto, onFechar, estagios = [] }: Props) {
  const [observacoes, setObservacoes] = useState<Observacao[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [texto, setTexto] = useState('')
  const [isPending, startTransition] = useTransition()
  const [marcandoPerdido, setMarcandoPerdido] = useState(false)
  const [orcamentos, setOrcamentos] = useState<any[]>([])

  const router = useRouter()

  useEffect(() => {
    if (!deal || !aberto) return

    let cancelado = false

    const buscarDados = async () => {
      try {
        // Buscar observações
        const observacoesData = await buscarObservacoesDeal(deal.id)
        if (!cancelado) setObservacoes(observacoesData)

        // Buscar orçamentos vinculados a este deal
        const supabase = createClient()
        const { data: orcamentosData } = await supabase
          .from('quotes')
          .select(`
            id, numero, status, valor_total, criado_em,
            responsavel:profiles!responsavel_id(nome)
          `)
          .eq('deal_id', deal.id)
          .order('criado_em', { ascending: false })

        if (!cancelado && orcamentosData) {
          setOrcamentos(orcamentosData)
        }
      } catch (error) {
        if (!cancelado) {
          toast.error('Erro ao carregar dados adicionais.')
        }
      }
    }

    buscarDados()

    return () => {
      cancelado = true
    }
  }, [deal, aberto])

  function handleMarcarPerdido() {
    if (!deal) return

    const estagioPerdido = estagios.find((e) => e.tipo_especial === 'perdido')

    if (!estagioPerdido) {
      toast.error('Estágio "perdido" não configurado no pipeline.')
      return
    }

    setMarcandoPerdido(true)

    startTransition(async () => {
      try {
        await moverDeal(deal.id, estagioPerdido.id, {
          motivo_perda: 'Cliente não retornou',
        })

        toast.success('Negociação marcada como perdida.')
        onFechar()
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao registrar perda.')
      } finally {
        setMarcandoPerdido(false)
      }
    })
  }

  function handleMudarEtapa(novoEstagioId: string) {
    if (!deal || novoEstagioId === deal.estagio_id) return

    const etapa = estagios.find((e) => e.id === novoEstagioId)

    if (etapa?.tipo_especial === 'perdido') {
      handleMarcarPerdido()
      return
    }

    startTransition(async () => {
      try {
        await moverDeal(deal.id, novoEstagioId)
        toast.success('Etapa atualizada.')
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao mover negociação.')
      }
    })
  }

  function handleAdicionar() {
    if (!deal || !texto.trim()) return

    startTransition(async () => {
      try {
        await adicionarObservacaoDeal(deal.id, texto.trim())

        toast.success('Observação adicionada.')
        setTexto('')
        setMostrarForm(false)

        const novasObservacoes = await buscarObservacoesDeal(deal.id)
        setObservacoes(novasObservacoes)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao adicionar observação.')
      }
    })
  }

  if (!deal) return null

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{deal.titulo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            {deal.valor_estimado !== null && deal.valor_estimado > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium">{formatarMoeda(deal.valor_estimado)}</span>
              </div>
            )}

            {deal.responsavel && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-sm">{deal.responsavel.nome}</span>
              </div>
            )}

            {deal.data_fechamento_prevista && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm">
                  {format(new Date(`${deal.data_fechamento_prevista}T12:00:00`), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
          </div>

          {deal.lead && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">Origem:</span>
              <BadgeOrigem origem={deal.lead.origem as BadgeOrigemTipo} />
            </div>
          )}

          {deal.ganho === null && estagios.length > 0 && (
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">Etapa:</span>
              <select
                value={deal.estagio_id}
                onChange={(e) => handleMudarEtapa(e.target.value)}
                disabled={isPending}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {estagios.map((etapa) => (
                  <option key={etapa.id} value={etapa.id}>
                    {etapa.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {deal.ultimas_mensagens && deal.ultimas_mensagens.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-3">
                <MessageCircle className="h-4 w-4" />
                Últimas mensagens
              </h3>

              <div className="space-y-2">
                {deal.ultimas_mensagens.map((msg, index) => (
                  <div
                    key={index}
                    className={`rounded-md px-3 py-2 text-sm ${
                      msg.direcao === 'enviada'
                        ? 'bg-green-50 text-green-800 ml-4'
                        : 'bg-slate-50 text-slate-700 mr-4'
                    }`}
                  >
                    <p className="line-clamp-2">{msg.conteudo || '[mídia]'}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {format(new Date(msg.enviado_em), 'dd/MM HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>

              {deal.conversa_id && (
                <div className="mt-3">
                  <Link
                    href={`/whatsapp/${deal.conversa_id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Ir para conversa
                  </Link>
                </div>
              )}
            </div>
          )}

          {deal.conversa_id && (!deal.ultimas_mensagens || deal.ultimas_mensagens.length === 0) && (
            <div className="border-t pt-4">
              <Link
                href={`/whatsapp/${deal.conversa_id}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                Ir para conversa no WhatsApp
              </Link>
            </div>
          )}

          {deal.ganho === true && (
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              Negociação ganha
            </div>
          )}

          {deal.ganho === false && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <p className="font-medium">Negociação perdida</p>
              {deal.motivo_perda && <p className="mt-1 text-xs">{deal.motivo_perda}</p>}
            </div>
          )}

          {deal.ganho === null && estagios.length > 0 && (
            <div className="border-t pt-4">
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={handleMarcarPerdido}
                disabled={marcandoPerdido || isPending}
              >
                <XCircle className="h-4 w-4" />
                {marcandoPerdido ? 'Registrando...' : 'Venda perdida, cliente não retornou'}
              </Button>
            </div>
          )}

          {deal && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Orçamentos
                </h3>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-7"
                >
                  <Link href={`/orcamentos/novo?deal_id=${deal.id}`}>
                    <Plus className="h-3.5 w-3.5" />
                    Novo orçamento
                  </Link>
                </Button>
              </div>

              {orcamentos.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {orcamentos.map((orcamento) => (
                    <div key={orcamento.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">#{orcamento.numero}</span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(orcamento.criado_em), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          orcamento.status === 'rascunho' ? 'bg-yellow-100 text-yellow-700' :
                          orcamento.status === 'aprovado_pelo_cliente' ? 'bg-green-100 text-green-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {orcamento.status === 'rascunho' ? 'Rascunho' :
                           orcamento.status === 'aprovado_pelo_cliente' ? 'Aprovado' : 'Outro'}
                        </span>
                        <Link href={`/orcamentos/${orcamento.id}`}>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <FileText className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Nenhum orçamento vinculado a esta negociação.</p>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Observações
              </h3>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1 h-7"
                onClick={() => setMostrarForm((atual) => !atual)}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>

            {mostrarForm && (
              <div className="mb-3 space-y-2">
                <Textarea
                  placeholder="Digite a observação..."
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={3}
                  className="text-sm"
                />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMostrarForm(false)
                      setTexto('')
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleAdicionar} disabled={isPending || !texto.trim()}>
                    {isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            )}

            {observacoes.length === 0 && !mostrarForm && (
              <p className="text-xs text-slate-400">Nenhuma observação registrada.</p>
            )}

            <div className="space-y-3 max-h-48 overflow-y-auto">
              {observacoes.map((obs) => (
                <div key={obs.id} className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-sm text-slate-700">{obs.descricao}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {obs.autor?.nome ?? 'Sistema'} —{' '}
                    {format(new Date(obs.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}