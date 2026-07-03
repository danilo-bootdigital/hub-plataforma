'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Search, Loader2, Check, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PreviewReceita } from '../preview-receita'
import { PainelResultado } from '../painel-resultado'
import { criarConferencia, rodarPreAnalise, buscarProdutosParaValidacao, getValidacaoDetalhe } from '../actions'

const TIPOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX = 10 * 1024 * 1024
type Produto = { id: string; nome: string }
type Detalhe = NonNullable<Awaited<ReturnType<typeof getValidacaoDetalhe>>>

export function TelaValidacao() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Produto[]>([])
  const [produto, setProduto] = useState<Produto | null>(null)
  const [posologiaEsperada, setPosologiaEsperada] = useState('')
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confId, setConfId] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  useEffect(() => {
    if (produto || detalhe) return
    const t = setTimeout(async () => { setResultados(await buscarProdutosParaValidacao(busca)) }, 250)
    return () => clearTimeout(t)
  }, [busca, produto, detalhe])

  function selecionarArquivo(f: File | null) {
    setErro(null)
    if (!f) return
    if (!TIPOS.includes(f.type)) { setErro('Arquivo deve ser PDF, JPG ou PNG.'); return }
    if (f.size > MAX) { setErro('Arquivo deve ter no máximo 10MB.'); return }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  async function executar() {
    if (!file) return
    setProcessando(true); setErro(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      if (produto) fd.set('productId', produto.id)
      const { id } = await criarConferencia(fd)
      setConfId(id)
      try { await rodarPreAnalise(id, posologiaEsperada) } catch { /* mostra estado de erro no detalhe */ }
      setDetalhe(await getValidacaoDetalhe(id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao processar a validação.')
    } finally {
      setProcessando(false)
    }
  }

  async function recarregar() {
    if (confId) setDetalhe(await getValidacaoDetalhe(confId))
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      {/* Esquerda — preview grande */}
      <PreviewReceita url={previewUrl} tipo={file?.type ?? null} nome={file?.name} />

      {/* Direita — coleta OU resultado (mesmo fluxo, sem navegação) */}
      <div>
        {detalhe ? (
          <PainelResultado detalhe={detalhe} onAtualizado={recarregar} />
        ) : (
          <div className="space-y-4">
            <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*" className="hidden"
              onChange={(e) => selecionarArquivo(e.target.files?.[0] ?? null)} />

            {/* 1. Receita */}
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-700">1. Receita</p>
              {!file ? (
                <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
                  <Upload /> Anexar receita (PDF, JPG ou PNG)
                </Button>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <span className="truncate text-slate-700">{file.name}</span>
                  <Button variant="ghost" size="xs" onClick={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setFile(null); setPreviewUrl(null) }}><X /> Trocar</Button>
                </div>
              )}
            </div>

            {/* 2. Produto */}
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-700">2. Produto <span className="font-normal text-slate-400">(opcional)</span></p>
              {produto ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-emerald-800"><Check className="size-4" /> {produto.nome}</span>
                  <Button variant="ghost" size="xs" onClick={() => { setProduto(null); setBusca('') }}><X /> Trocar</Button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar produto…" className="pl-9" />
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-100">
                    {resultados.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">Nenhum produto encontrado.</p>}
                    {resultados.map((p) => (
                      <button key={p.id} type="button" onClick={() => setProduto(p)}
                        className="flex w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">{p.nome}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Posologia esperada (opcional) */}
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-700">3. Posologia esperada <span className="font-normal text-slate-400">(opcional)</span></p>
              <Textarea value={posologiaEsperada} onChange={(e) => setPosologiaEsperada(e.target.value)} rows={2}
                placeholder="Cole a posologia de referência para comparação semântica. Se vazio, nenhuma comparação é feita." />
            </div>

            {/* Executar */}
            {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <Button size="lg" className="w-full" disabled={!file || processando} onClick={executar}>
              {processando ? <><Loader2 className="animate-spin" /> Lendo a receita com IA…</> : <><Sparkles /> Executar análise</>}
            </Button>
            {!produto && file && <p className="hint">Sem produto selecionado → validação documental genérica (sem checagem de medicamento/concentração/limite).</p>}
          </div>
        )}
      </div>
    </div>
  )
}
