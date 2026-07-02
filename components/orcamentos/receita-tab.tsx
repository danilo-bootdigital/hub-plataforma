'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Sparkles, Save, Upload, Check, X, Send, Paperclip } from 'lucide-react'
import {
  getReceitasDoOrcamento,
  gerarModeloReceita,
  salvarRascunhoReceita,
  anexarReceitaAssinada,
  validarReceita,
  marcarReceitaEnviada,
  type ReceitaDoOrcamento,
  type ReceitaStatusFluxo,
} from '@/app/(dashboard)/orcamentos/actions-receita'

const STATUS_LABEL: Record<ReceitaStatusFluxo, { texto: string; classe: string }> = {
  rascunho: { texto: 'Rascunho', classe: 'bg-slate-100 text-slate-600' },
  modelo_gerado: { texto: 'Modelo gerado', classe: 'bg-blue-50 text-blue-700' },
  enviada: { texto: 'Enviada', classe: 'bg-amber-50 text-amber-700' },
  recebida: { texto: 'Recebida', classe: 'bg-purple-50 text-purple-700' },
  validada: { texto: 'Validada', classe: 'bg-emerald-50 text-emerald-700' },
  rejeitada: { texto: 'Rejeitada', classe: 'bg-red-50 text-red-700' },
}

function BadgeStatus({ status }: { status: ReceitaStatusFluxo }) {
  const s = STATUS_LABEL[status] ?? STATUS_LABEL.rascunho
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.classe}`}>{s.texto}</span>
  )
}

function formatarTamanho(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ReceitaTab({ quoteId }: { quoteId: string }) {
  const [receitas, setReceitas] = useState<ReceitaDoOrcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Editor do modelo/rascunho
  const [texto, setTexto] = useState('')
  const [receitaId, setReceitaId] = useState<string | null>(null)
  const [geradoDoModelo, setGeradoDoModelo] = useState(false)
  const [pending, startTransition] = useTransition()

  const fileRef = useRef<HTMLInputElement>(null)

  async function recarregar() {
    try {
      setErro(null)
      const dados = await getReceitasDoOrcamento(quoteId)
      setReceitas(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar receitas.')
    } finally {
      setLoading(false)
    }
  }

  // Carregamento sob demanda: só roda quando o componente monta (aba aberta)
  useEffect(() => {
    recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId])

  function handleGerarModelo() {
    startTransition(async () => {
      try {
        setErro(null)
        const { texto: modelo } = await gerarModeloReceita(quoteId)
        setTexto(modelo)
        setGeradoDoModelo(true)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao gerar modelo.')
      }
    })
  }

  function handleSalvarRascunho() {
    if (!texto.trim()) {
      setErro('Escreva ou gere o texto da receita antes de salvar.')
      return
    }
    startTransition(async () => {
      try {
        setErro(null)
        const { id } = await salvarRascunhoReceita({
          quoteId,
          receitaId: receitaId ?? undefined,
          texto,
          geradoDoModelo,
        })
        setReceitaId(id)
        setGeradoDoModelo(false)
        await recarregar()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao salvar rascunho.')
      }
    })
  }

  function handleAnexar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setErro('Selecione o arquivo da receita assinada.')
      return
    }
    const fd = new FormData()
    fd.set('quoteId', quoteId)
    fd.set('file', file)
    startTransition(async () => {
      try {
        setErro(null)
        await anexarReceitaAssinada(fd)
        if (fileRef.current) fileRef.current.value = ''
        await recarregar()
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao anexar receita.')
      }
    })
  }

  function handleValidar(id: string, decisao: 'validada' | 'rejeitada') {
    startTransition(async () => {
      try {
        setErro(null)
        await validarReceita({ receitaId: id, quoteId, decisao })
        await recarregar()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao validar receita.')
      }
    })
  }

  function handleEnviada(id: string) {
    startTransition(async () => {
      try {
        setErro(null)
        await marcarReceitaEnviada(id, quoteId)
        await recarregar()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao marcar como enviada.')
      }
    })
  }

  return (
    <div className="space-y-5">
      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Editor do modelo/rascunho */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-700">Modelo da Receita</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGerarModelo} disabled={pending}>
                <Sparkles className="h-4 w-4" />
                Gerar modelo
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handleSalvarRascunho} disabled={pending}>
                <Save className="h-4 w-4" />
                Salvar rascunho
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Gere um modelo a partir dos itens do orçamento ou escreva o texto da receita aqui…"
            className="min-h-[220px] font-mono text-sm"
          />
          <p className="text-xs text-slate-400">
            {receitaId ? 'Editando um rascunho existente.' : 'Um novo rascunho será criado ao salvar.'}
          </p>
        </CardContent>
      </Card>

      {/* Anexar receita assinada */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
              <Paperclip className="h-4 w-4 text-purple-600" />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-700">Receita Assinada</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleAnexar} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
            <Button type="submit" size="sm" className="gap-1.5" disabled={pending}>
              <Upload className="h-4 w-4" />
              Anexar assinada
            </Button>
          </form>
          <p className="mt-2 text-xs text-slate-400">PDF ou imagem (PNG/JPG/WEBP), até 10MB. Armazenado com acesso restrito.</p>
        </CardContent>
      </Card>

      {/* Lista de receitas */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-slate-50/50">
          <CardTitle className="text-sm font-semibold text-slate-700">Receitas deste orçamento</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Carregando…</div>
          ) : receitas.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Nenhuma receita ainda.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {receitas.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <BadgeStatus status={r.status_fluxo} />
                      {r.arquivo_url ? (
                        <a
                          href={r.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-emerald-700 hover:underline"
                        >
                          {r.arquivo_nome ?? 'arquivo'}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-500">
                          {r.texto_modelo ? 'Modelo/rascunho (sem anexo)' : 'Sem anexo'}
                        </span>
                      )}
                      {r.arquivo_tamanho ? (
                        <span className="text-xs text-slate-400">{formatarTamanho(r.arquivo_tamanho)}</span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {r.texto_modelo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTexto(r.texto_modelo ?? '')
                            setReceitaId(r.id)
                            setGeradoDoModelo(false)
                          }}
                        >
                          Editar
                        </Button>
                      )}
                      {(r.status_fluxo === 'rascunho' || r.status_fluxo === 'modelo_gerado') && (
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleEnviada(r.id)} disabled={pending}>
                          <Send className="h-3.5 w-3.5" />
                          Enviada
                        </Button>
                      )}
                      {r.status_fluxo !== 'validada' && r.status_fluxo !== 'rejeitada' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-emerald-700"
                            onClick={() => handleValidar(r.id, 'validada')}
                            disabled={pending}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Validar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-red-600"
                            onClick={() => handleValidar(r.id, 'rejeitada')}
                            disabled={pending}
                          >
                            <X className="h-3.5 w-3.5" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {r.validacao_comentario && (
                    <p className="mt-2 text-xs text-slate-500">Obs.: {r.validacao_comentario}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
