'use client'

// ============================================================
// WhatsappShell: container principal da Central de Atendimento
// Layout estilo WhatsApp Web: Coluna de Conversas + Chat + Painel
// Estado de URL (searchParams) é a fonte da verdade
// SEM Zustand, SEM fetch próprio
// ============================================================

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { ListaConversas, type ConversaSelecionada } from './lista-conversas'
import { ChatArea, type ChatHeaderInfo } from './chat-area'
import { PainelCliente } from './painel-cliente'
import { ModalNovaConversa } from './modal-nova-conversa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings,
  BarChart3,
  Search,
  Wifi,
  WifiOff,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ConversaResumo } from '@/lib/queries/conversas'
import type { KPIWhatsApp, ConversaStatus } from '@/types/database'
import type {
  WhatsappInstanciaResumo,
  ConversaCompleta,
  PerfilCentral,
  UsuarioResumo,
  TagConversa,
} from '@/types/whatsapp-central'
import type { TotaisCliente } from '@/types/database'

type Props = {
  instancias: WhatsappInstanciaResumo[]
  conversas: ConversaResumo[]
  kpis: KPIWhatsApp
  usuarios: UsuarioResumo[]
  tags: TagConversa[]
  perfil: PerfilCentral
  conversaAtiva: ConversaCompleta | null
  totais: TotaisCliente | null
  painelAberto: boolean
  notasAtivas: Array<{ id: string; conteudo: string; criado_em: string; autor_nome: string | null }>
  dealAtivo: { id: string; titulo: string; valor_estimado: number | null; estagio_nome: string | null } | null
  tagsAtivas: TagConversa[]
  mensagensIniciais: Array<{
    id: string; conteudo: string | null; direcao: 'enviada' | 'recebida'
    tipo_midia: string; url_midia: string | null; enviado_em: string
  }>
  pagination: {
    offset: number
    limite: number
    total: number
  }
}

// Adapter: ConversaResumo -> formato esperado por ListaConversas
type ListaConversaItem = {
  id: string
  nome_contato: string
  telefone: string
  ultima_mensagem_em: string | null
  ultima_mensagem_em_formatada: string | null
  ultima_mensagem: string | null
  nao_lidas: number
  status: string
}

function toListaItem(c: ConversaResumo & {
  ultima_mensagem?: string
  ultima_mensagem_em_formatada?: string | null
}): ListaConversaItem {
  return {
    id: c.id,
    nome_contato: c.nome_contato ?? c.telefone_externo,
    telefone: c.telefone_externo,
    ultima_mensagem_em: c.ultima_mensagem_em,
    ultima_mensagem_em_formatada: c.ultima_mensagem_em_formatada ?? null,
    ultima_mensagem: c.ultima_mensagem ?? null,
    nao_lidas: c.nao_lidas ?? 0,
    status: c.status,
  }
}

function statusIcon(status: string) {
  if (status === 'conectado') return <Wifi className="h-3 w-3" />
  if (status === 'aguardando_qr') return <Loader2 className="h-3 w-3 animate-spin" />
  return <WifiOff className="h-3 w-3" />
}

function statusClass(status: string): string {
  if (status === 'conectado') return 'text-green-600 bg-green-50'
  if (status === 'aguardando_qr') return 'text-amber-600 bg-amber-50'
  return 'text-slate-400 bg-slate-100'
}

function statusLabel(status: string): string {
  if (status === 'conectado') return 'Online'
  if (status === 'aguardando_qr') return 'Aguardando QR'
  return 'Offline'
}

// Chip de filtro estilo WhatsApp Web
function FiltroChip({
  label,
  count,
  ativo,
  onClick,
}: {
  label: string
  count?: number
  ativo: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        ativo
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
      )}
    >
      {label}
      {count != null && count > 0 && (
        <span
          className={cn(
            'rounded-full px-1.5 text-[10px] font-semibold leading-4',
            ativo ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export function WhatsappShell(props: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Estado para debounce da busca
  const [buscaInput, setBuscaInput] = useState(searchParams.get('busca') ?? '')

  // Mostrar/ocultar seletor de instâncias (ação "filtro")
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // Filtro client-side instantâneo (UX imediata enquanto digita)
  const filteredConversas = useMemo<ConversaResumo[]>(() => {
    const termo = buscaInput.toLowerCase().trim()
    if (!termo) return props.conversas
    return props.conversas.filter(c =>
      (c.nome_contato?.toLowerCase().includes(termo)) ||
      (c.telefone_externo?.toLowerCase().includes(termo))
    )
  }, [buscaInput, props.conversas])

  // Debounce: sincroniza o termo de busca com a URL (server refaz a query completa)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (buscaInput) params.set('busca', buscaInput)
      else params.delete('busca')
      router.replace(`?${params.toString()}`)
    }, 400)
    return () => clearTimeout(timer)
  }, [buscaInput, router])

  // Atualizar URL (filtros e estado de UI)
  const setParam = useCallback((key: string, value: string | null): void => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`?${params.toString()}`)
  }, [searchParams, router])

  // Aplicar filtro de status/não-lidas via chips (limpa os outros)
  const aplicarFiltro = useCallback((opts: { status?: ConversaStatus | null; naoLidas?: boolean }): void => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('status')
    params.delete('somenteNaoLidas')
    if (opts.status) params.set('status', opts.status)
    if (opts.naoLidas) params.set('somenteNaoLidas', '1')
    params.delete('offset')
    router.replace(`?${params.toString()}`)
  }, [searchParams, router])

  const instanciaAtiva: string | null = searchParams.get('instanciaId')
  const statusAtivo = (searchParams.get('status') as ConversaStatus | null) ?? null
  const somenteNaoLidas = searchParams.get('somenteNaoLidas') === '1'
  const semFiltro = !statusAtivo && !somenteNaoLidas

  const listaItens: ListaConversaItem[] = filteredConversas.map(toListaItem)

  const totalOnline = props.instancias.filter((i) => i.status_conexao === 'conectado').length

  // Conversas para ModalNovaConversa
  const instanciasParaModal = props.instancias.map((i) => ({
    id: i.id,
    nome: i.nome,
    numero: i.numero,
    status_conexao: i.status_conexao,
  }))

  // ------------------------------------------------------------
  // Seleção da conversa: CLIENT-SIDE → troca instantânea, sem
  // re-renderizar a página inteira nem recarregar lista/KPIs.
  // A URL é mantida sincronizada (history.replaceState) para
  // refresh/bookmark, mas sem disparar refetch do server.
  // ------------------------------------------------------------
  const [selecionada, setSelecionada] = useState<ChatHeaderInfo | null>(() => {
    const cid = searchParams.get('conversaId')
    if (!cid) return null
    if (props.conversaAtiva && props.conversaAtiva.id === cid) {
      return {
        id: cid,
        nome: props.conversaAtiva.nome_contato ?? props.conversaAtiva.telefone_externo,
        telefone: props.conversaAtiva.telefone_externo,
        status: props.conversaAtiva.status,
        instanciaNome: props.conversaAtiva.instancia?.nome ?? null,
      }
    }
    const c = props.conversas.find((x) => x.id === cid)
    if (c) {
      return {
        id: c.id,
        nome: c.nome_contato ?? c.telefone_externo,
        telefone: c.telefone_externo,
        status: c.status,
        instanciaNome: c.instancia?.nome ?? null,
      }
    }
    return null
  })

  // Estável (deps []) → não invalida a memoização das linhas da lista
  const selecionar = useCallback((info: ConversaSelecionada) => {
    setSelecionada(info)
    const params = new URLSearchParams(window.location.search)
    params.set('conversaId', info.id)
    params.delete('painel')
    window.history.replaceState(null, '', `?${params.toString()}`)
  }, [])

  const fecharConversa = useCallback(() => {
    setSelecionada(null)
    const params = new URLSearchParams(window.location.search)
    params.delete('conversaId')
    params.delete('painel')
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [])

  // Conversa finalizada na lista: se for a que está aberta no painel
  // direito, limpa a seleção (padrão mais seguro). Caso contrário, não faz
  // nada — a própria lista já a remove otimisticamente.
  const aoFinalizarConversa = useCallback((conversaId: string) => {
    setSelecionada((atual) => {
      if (!atual || atual.id !== conversaId) return atual
      const params = new URLSearchParams(window.location.search)
      params.delete('conversaId')
      params.delete('painel')
      const qs = params.toString()
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
      return null
    })
  }, [])

  // Painel lateral precisa de dados completos (notas/deal/tags) → navegação real
  const abrirPainel = useCallback(() => {
    if (!selecionada) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('conversaId', selecionada.id)
    params.set('painel', '1')
    router.replace(`?${params.toString()}`)
  }, [selecionada, searchParams, router])

  const mensagensSeed =
    selecionada && props.conversaAtiva && selecionada.id === props.conversaAtiva.id
      ? props.mensagensIniciais
      : undefined

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* ============================================================ */}
      {/* Coluna 1: Conversas (estilo WhatsApp Web)                    */}
      {/* ============================================================ */}
      <div
        className={cn(
          'flex w-full shrink-0 flex-col border-r border-slate-200 bg-white min-h-0 md:w-[380px] lg:w-[400px]',
          selecionada && 'hidden md:flex',
        )}
      >
        {/* Header da coluna */}
        <div className="border-b border-slate-100 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">Conversas</h1>
            <div className="flex items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-500"
                title="Filtrar instâncias"
                onClick={() => setMostrarFiltros((v) => !v)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-500"
                title="Ordenar (mais recentes)"
                disabled
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
              <ModalNovaConversa instancias={instanciasParaModal} />
              <Link href="/monitoramento-whatsapp">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500" title="Monitoramento">
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/configuracoes-whatsapp">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500" title="Configurações">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Seletor de instâncias (mostrado ao clicar em "filtro" ou se houver várias) */}
          {(mostrarFiltros || props.instancias.length > 1) && (
            <Select
              value={instanciaAtiva ?? 'todas'}
              onValueChange={(value) => setParam('instanciaId', value === 'todas' ? null : value)}
            >
              <SelectTrigger className="mt-3 h-8 w-full text-xs">
                <SelectValue placeholder="Todas as instâncias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">
                  <span className="text-muted-foreground">Todas ({totalOnline} online)</span>
                </SelectItem>
                {props.instancias.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    <div className="flex items-center gap-2">
                      <span className={cn('p-0.5 rounded', statusClass(inst.status_conexao))}>
                        {statusIcon(inst.status_conexao)}
                      </span>
                      <span>{inst.nome}</span>
                      <span className="text-muted-foreground text-xs">({statusLabel(inst.status_conexao)})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Campo de busca com debounce */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              className="h-9 rounded-full bg-slate-50 pl-9 text-sm"
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
            />
          </div>

          {/* Chips de filtro */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FiltroChip
              label="Todas"
              count={props.kpis.abertas}
              ativo={semFiltro}
              onClick={() => aplicarFiltro({})}
            />
            <FiltroChip
              label="Não lidas"
              count={props.kpis.naoLidas}
              ativo={somenteNaoLidas}
              onClick={() => aplicarFiltro({ naoLidas: true })}
            />
            <FiltroChip
              label="Em atendimento"
              count={props.kpis.emAtendimento}
              ativo={statusAtivo === 'em_atendimento'}
              onClick={() => aplicarFiltro({ status: 'em_atendimento' })}
            />
            <FiltroChip
              label="Aguardando"
              count={props.kpis.aguardandoCliente}
              ativo={statusAtivo === 'aguardando_cliente'}
              onClick={() => aplicarFiltro({ status: 'aguardando_cliente' })}
            />
            <FiltroChip
              label="Finalizadas hoje"
              count={props.kpis.finalizadasHoje}
              ativo={statusAtivo === 'finalizada'}
              onClick={() => aplicarFiltro({ status: 'finalizada' })}
            />
          </div>
        </div>

        {/* Lista (rolagem própria) */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ListaConversas
            conversasIniciais={listaItens}
            conversaAtivaId={selecionada?.id ?? undefined}
            onSelecionar={selecionar}
            onFinalizada={aoFinalizarConversa}
          />
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-center gap-3 border-t border-slate-100 px-4 py-2.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={props.pagination.offset === 0}
            onClick={() => setParam('offset', String(props.pagination.offset - props.pagination.limite))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-500">
            {props.pagination.total === 0
              ? '0'
              : `${props.pagination.offset + 1}–${Math.min(props.pagination.offset + props.pagination.limite, props.pagination.total)} de ${props.pagination.total}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={props.pagination.offset + props.pagination.limite >= props.pagination.total}
            onClick={() => setParam('offset', String(props.pagination.offset + props.pagination.limite))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Coluna 2: Chat                                               */}
      {/* ============================================================ */}
      {selecionada ? (
        <ChatArea
          info={selecionada}
          mensagensIniciais={mensagensSeed}
          onFechar={fecharConversa}
          onAbrirPainel={abrirPainel}
        />
      ) : (
        <div className="hidden flex-1 flex-col items-center justify-center bg-slate-50 text-center md:flex">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <MessageSquare className="h-8 w-8 text-emerald-600" />
          </div>
          <p className="mt-4 text-base font-medium text-slate-700">Selecione uma conversa</p>
          <p className="mt-1 max-w-xs text-sm text-slate-400">
            Escolha um contato na lista ao lado para ver o histórico e responder.
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* Coluna 3: Painel lateral (se aberto)                         */}
      {/* ============================================================ */}
      {props.painelAberto && props.conversaAtiva && selecionada?.id === props.conversaAtiva.id && (
        <PainelCliente
          conversa={props.conversaAtiva}
          totais={props.totais}
          notas={props.notasAtivas}
          deal={props.dealAtivo}
          tagsAtivas={props.tagsAtivas}
          todasTags={props.tags}
          usuarios={props.usuarios}
          onFechar={() => setParam('painel', null)}
        />
      )}
    </div>
  )
}
