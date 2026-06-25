'use client'

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Lock, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BalaoMensagem } from './balao-mensagem'
import { carregarMensagensConversa } from '@/app/(dashboard)/whatsapp/actions-mensagens'
import { PAGINA_MENSAGENS, type MensagemDTO } from '@/lib/whatsapp/mensagens-tipos'

type Mensagem = MensagemDTO & { responsavel?: { nome: string } | null }

type Props = {
  conversaId: string
  /** Seed opcional do SSR (deep-link) — evita 1 fetch no primeiro paint. */
  mensagensIniciais?: Mensagem[]
  /** Notifica o pai sobre o loading inicial (para desabilitar o input). */
  onLoadingChange?: (carregando: boolean) => void
}

// ------------------------------------------------------------
// Cache por conversa: persiste entre trocas dentro da sessão.
// Revisitar uma conversa já aberta reusa as mensagens (instantâneo)
// e revalida em segundo plano.
// ------------------------------------------------------------
const cacheMensagens = new Map<string, { mensagens: Mensagem[]; temMais: boolean }>()

// Fundo sutil estilo WhatsApp (padrão leve sobre off-white)
const PADRAO_FUNDO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill='%23000000' fill-opacity='0.025'%3E%3Ccircle cx='10' cy='10' r='1.5'/%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/svg%3E\")"

function rotuloData(dataIso: string): string {
  const d = new Date(dataIso)
  if (isToday(d)) return 'Hoje'
  if (isYesterday(d)) return 'Ontem'
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function chaveDia(dataIso: string): string {
  return format(new Date(dataIso), 'yyyy-MM-dd')
}

function mesclar(antigas: Mensagem[], novas: Mensagem[]): Mensagem[] {
  const mapa = new Map<string, Mensagem>()
  for (const m of antigas) mapa.set(m.id, m)
  for (const m of novas) mapa.set(m.id, mapa.get(m.id) ?? m)
  return Array.from(mapa.values()).sort(
    (a, b) => new Date(a.enviado_em).getTime() - new Date(b.enviado_em).getTime(),
  )
}

function MensagensSkeleton() {
  const larguras = ['60%', '40%', '72%', '50%', '66%']
  return (
    <div className="flex flex-col gap-3 px-1 py-2">
      {larguras.map((w, i) => (
        <div key={i} className={i % 2 === 0 ? 'flex justify-start' : 'flex justify-end'}>
          <div
            className="h-9 animate-pulse rounded-2xl bg-white/70"
            style={{ width: w }}
          />
        </div>
      ))}
    </div>
  )
}

export function ThreadMensagens({ conversaId, mensagensIniciais, onLoadingChange }: Props) {
  const emCache = cacheMensagens.get(conversaId)
  const seed: { mensagens: Mensagem[]; temMais: boolean } | undefined =
    emCache ??
    (mensagensIniciais && mensagensIniciais.length > 0
      ? { mensagens: mensagensIniciais, temMais: mensagensIniciais.length >= PAGINA_MENSAGENS }
      : undefined)

  const [mensagens, setMensagens] = useState<Mensagem[]>(seed?.mensagens ?? [])
  const [temMais, setTemMais] = useState<boolean>(seed?.temMais ?? false)
  const [carregando, setCarregando] = useState<boolean>(!seed)
  const [carregandoAntigas, setCarregandoAntigas] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const ancoraPrepend = useRef<{ altura: number; topo: number } | null>(null)
  const mensagensRef = useRef<Mensagem[]>(mensagens)

  // Mantém o ref atualizado (fora do render) + persiste no cache
  useEffect(() => {
    mensagensRef.current = mensagens
    cacheMensagens.set(conversaId, { mensagens, temMais })
  }, [conversaId, mensagens, temMais])

  useEffect(() => {
    onLoadingChange?.(carregando)
  }, [carregando, onLoadingChange])

  // Carga inicial: cache (revalida em 2º plano) ou fetch
  useEffect(() => {
    let ativo = true

    async function carregar() {
      if (seed) {
        // Já temos algo para mostrar (cache/seed) — revalida em segundo plano.
        const { mensagens: recentes, temMais: tm } = await carregarMensagensConversa(conversaId)
        if (!ativo) return
        setMensagens((prev) => mesclar(prev, recentes))
        setTemMais((prev) => (prev ? prev : tm))
      } else {
        const { mensagens: novas, temMais: tm } = await carregarMensagensConversa(conversaId)
        if (!ativo) return
        setMensagens(novas)
        setTemMais(tm)
        setCarregando(false)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
    // conversaId é estável por instância (key={conversaId} no pai)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carregar mensagens antigas (scroll para o topo)
  const carregarAntigas = useCallback(async () => {
    const atuais = mensagensRef.current
    if (carregandoAntigas || !temMais || atuais.length === 0) return
    const el = scrollRef.current
    if (el) ancoraPrepend.current = { altura: el.scrollHeight, topo: el.scrollTop }
    setCarregandoAntigas(true)
    const cursor = atuais[0].enviado_em
    const { mensagens: antigas, temMais: tm } = await carregarMensagensConversa(conversaId, cursor)
    setMensagens((prev) => mesclar(antigas, prev))
    setTemMais(tm)
    setCarregandoAntigas(false)
  }, [carregandoAntigas, temMais, conversaId])

  function handleScroll() {
    const el = scrollRef.current
    if (el && el.scrollTop < 64) carregarAntigas()
  }

  // Preserva a posição do scroll após prepend de mensagens antigas
  useLayoutEffect(() => {
    const el = scrollRef.current
    const ancora = ancoraPrepend.current
    if (el && ancora) {
      el.scrollTop = ancora.topo + (el.scrollHeight - ancora.altura)
      ancoraPrepend.current = null
    }
  }, [mensagens])

  // Rola para o fim no carregamento inicial e em novas mensagens (sem prepend)
  useEffect(() => {
    if (ancoraPrepend.current) return
    bottomRef.current?.scrollIntoView({ behavior: carregando ? 'auto' : 'smooth' })
  }, [mensagens.length, carregando])

  // Realtime: anexa mensagens novas desta conversa
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`thread-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversaId}`,
        },
        (payload) => {
          const nova = payload.new as Record<string, unknown>
          const mensagem: Mensagem = {
            id: nova.id as string,
            direcao: nova.direcao as 'enviada' | 'recebida',
            conteudo: nova.conteudo as string | null,
            tipo_midia: (nova.tipo_midia as string) ?? 'texto',
            url_midia: (nova.url_midia as string) ?? null,
            enviado_em: nova.enviado_em as string,
            responsavel: null,
          }
          setMensagens((prev) =>
            prev.some((m) => m.id === mensagem.id) ? prev : [...prev, mensagem],
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversaId])

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col overflow-y-auto px-4 py-4 md:px-8"
      style={{ backgroundColor: '#f3f1ec', backgroundImage: PADRAO_FUNDO }}
    >
      {/* Indicador de carregamento de mensagens antigas */}
      {carregandoAntigas && (
        <div className="mb-2 flex justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      )}

      {/* Aviso de criptografia */}
      <div className="mb-4 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50/90 px-3 py-1.5 text-center text-[12px] text-amber-700 shadow-sm">
          <Lock className="h-3 w-3 shrink-0" />
          As mensagens são protegidas com criptografia de ponta a ponta.
        </span>
      </div>

      {carregando ? (
        <MensagensSkeleton />
      ) : mensagens.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="rounded-md bg-white/70 px-4 py-2 text-sm text-slate-400 shadow-sm">
            Nenhuma mensagem nesta conversa. Envie a primeira mensagem abaixo.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {mensagens.map((m, i) => {
            const mostrarSeparador =
              i === 0 || chaveDia(m.enviado_em) !== chaveDia(mensagens[i - 1].enviado_em)
            return (
              <div key={m.id} className="flex flex-col gap-1.5">
                {mostrarSeparador && (
                  <div className="my-2 flex justify-center">
                    <span className="rounded-md bg-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 shadow-sm">
                      {rotuloData(m.enviado_em)}
                    </span>
                  </div>
                )}
                <BalaoMensagem mensagem={{ ...m, responsavel: m.responsavel ?? null }} />
              </div>
            )
          })}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
