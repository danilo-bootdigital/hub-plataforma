'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, X, Search, Plus, Send, Pencil, Trash2, ArrowLeft, Paperclip, FileText, Image as ImageIcon, Mic } from 'lucide-react'
import {
  listarTemplates,
  criarTemplate,
  editarTemplate,
  excluirTemplate,
} from '@/app/(dashboard)/whatsapp/actions-conversa'
import { toast } from 'sonner'

type Template = {
  id: string
  nome: string
  conteudo: string
  categoria: string | null
}

type Variaveis = {
  nome?: string
  vendedor?: string
  empresa?: string
  telefone?: string
}

type Props = {
  variaveis: Variaveis
  onSelecionar: (texto: string) => void
  onEnviarComArquivo?: (texto: string, arquivo: File | null) => void
}

type Tela = 'lista' | 'criar' | 'editar'

function substituirVariaveis(conteudo: string, variaveis: Variaveis): string {
  return conteudo
    .replace(/\{\{nome\}\}/gi, variaveis.nome || '{{nome}}')
    .replace(/\{\{vendedor\}\}/gi, variaveis.vendedor || '{{vendedor}}')
    .replace(/\{\{empresa\}\}/gi, variaveis.empresa || '{{empresa}}')
    .replace(/\{\{telefone\}\}/gi, variaveis.telefone || '{{telefone}}')
}

function IconeArquivo({ tipo }: { tipo: string }) {
  if (tipo.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />
  if (tipo.startsWith('audio/')) return <Mic className="h-4 w-4 text-purple-500" />
  return <FileText className="h-4 w-4 text-red-500" />
}

export function SeletorRespostaRapida({ variaveis, onSelecionar, onEnviarComArquivo }: Props) {
  const [aberto, setAberto] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [tela, setTela] = useState<Tela>('lista')
  const [editando, setEditando] = useState<Template | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [arquivoAnexo, setArquivoAnexo] = useState<File | null>(null)
  const [previewAnexo, setPreviewAnexo] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form fields
  const [formNome, setFormNome] = useState('')
  const [formConteudo, setFormConteudo] = useState('')
  const [formCategoria, setFormCategoria] = useState('')

  useEffect(() => {
    if (!aberto) return
    carregarTemplates()
  }, [aberto])

  async function carregarTemplates() {
    setCarregando(true)
    try {
      const data = await listarTemplates()
      setTemplates(data)
    } finally {
      setCarregando(false)
    }
  }

  function handleSelecionar(template: Template) {
    const texto = substituirVariaveis(template.conteudo, variaveis)
    if (onEnviarComArquivo) {
      onEnviarComArquivo(texto, arquivoAnexo)
    } else {
      onSelecionar(texto)
    }
    fechar()
  }

  function fechar() {
    setAberto(false)
    setBusca('')
    setTela('lista')
    setEditando(null)
    setErro(null)
    limparAnexo()
  }

  function limparAnexo() {
    if (previewAnexo) URL.revokeObjectURL(previewAnexo)
    setArquivoAnexo(null)
    setPreviewAnexo(null)
  }

  function handleAnexoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 16 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máximo 16MB).')
      return
    }
    setArquivoAnexo(file)
    if (file.type.startsWith('image/')) {
      setPreviewAnexo(URL.createObjectURL(file))
    } else {
      setPreviewAnexo(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function abrirCriar() {
    setFormNome('')
    setFormConteudo('')
    setFormCategoria('')
    setErro(null)
    setTela('criar')
  }

  function abrirEditar(template: Template) {
    setEditando(template)
    setFormNome(template.nome)
    setFormConteudo(template.conteudo)
    setFormCategoria(template.categoria || '')
    setErro(null)
    setTela('editar')
  }

  async function handleSalvar() {
    setSalvando(true)
    setErro(null)
    try {
      if (tela === 'criar') {
        const novo = await criarTemplate(formNome, formConteudo, formCategoria || null)
        setTemplates((prev) => [...prev, novo])
      } else if (tela === 'editar' && editando) {
        await editarTemplate(editando.id, formNome, formConteudo, formCategoria || null)
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editando.id
              ? { ...t, nome: formNome.trim(), conteudo: formConteudo.trim(), categoria: formCategoria.trim() || null }
              : t
          )
        )
      }
      setTela('lista')
      setEditando(null)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(template: Template) {
    if (!confirm(`Excluir o modelo "${template.nome}"?`)) return
    try {
      await excluirTemplate(template.id)
      setTemplates((prev) => prev.filter((t) => t.id !== template.id))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir.')
    }
  }

  const filtrados = templates.filter((t) => {
    if (!busca) return true
    const termo = busca.toLowerCase()
    return (
      t.nome.toLowerCase().includes(termo) ||
      t.conteudo.toLowerCase().includes(termo) ||
      (t.categoria?.toLowerCase().includes(termo) ?? false)
    )
  })

  const categorias = [...new Set(filtrados.map((t) => t.categoria || 'Sem categoria'))]

  if (!aberto) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setAberto(true)}
        title="Respostas rápidas"
      >
        <Zap className="h-4 w-4 text-amber-500" />
      </Button>
    )
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border bg-white shadow-lg z-10 max-h-96 flex flex-col">
      {tela === 'lista' && (
        <>
          {/* Header */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar modelo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filtrados.length > 0) {
                  e.preventDefault()
                  handleSelecionar(filtrados[0])
                }
                if (e.key === 'Escape') fechar()
              }}
              className="flex-1 text-sm outline-none placeholder:text-slate-400"
              autoFocus
            />
            <button
              onClick={abrirCriar}
              className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              title="Novo modelo"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo
            </button>
            <button onClick={fechar} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto p-2">
            {carregando ? (
              <p className="text-center text-xs text-slate-400 py-4">Carregando...</p>
            ) : filtrados.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <p className="text-xs text-slate-400">Nenhum modelo encontrado.</p>
                <button
                  onClick={abrirCriar}
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Criar primeiro modelo
                </button>
              </div>
            ) : (
              categorias.map((cat) => (
                <div key={cat} className="mb-2">
                  <p className="text-[11px] font-medium text-slate-400 uppercase px-2 mb-1">{cat}</p>
                  {filtrados
                    .filter((t) => (t.categoria || 'Sem categoria') === cat)
                    .map((t) => {
                      const preview = substituirVariaveis(t.conteudo, variaveis)
                      return (
                        <div
                          key={t.id}
                          className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700">{t.nome}</p>
                            <p className="text-[11px] text-slate-500 truncate">{preview}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleSelecionar(t)}
                              className="flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700 hover:bg-green-100"
                              title="Inserir na conversa"
                            >
                              <Send className="h-3 w-3" />
                              Usar
                            </button>
                            <button
                              onClick={() => abrirEditar(t)}
                              className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                              title="Editar"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleExcluir(t)}
                              className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Excluir"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ))
            )}
          </div>

          {/* Dica de variáveis */}
          <div className="border-t px-3 py-1.5">
            <p className="text-[11px] text-slate-400">
              Variáveis: {'{{nome}}'} {'{{vendedor}}'} {'{{empresa}}'} {'{{telefone}}'}
            </p>
          </div>

          {/* Anexo para enviar junto */}
          <div className="border-t px-3 py-2 space-y-1.5">
            {arquivoAnexo ? (
              <div className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
                {previewAnexo ? (
                  <img src={previewAnexo} alt="Preview" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <IconeArquivo tipo={arquivoAnexo.type} />
                )}
                <span className="flex-1 text-[11px] text-slate-700 truncate">{arquivoAnexo.name}</span>
                <button onClick={limparAnexo} className="text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-blue-600 transition-colors"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Anexar arquivo para enviar junto
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleAnexoChange}
              className="hidden"
            />
            <p className="text-[11px] text-slate-400">
              Selecione um modelo e pressione Enter ou clique em &quot;Usar&quot; para enviar direto.
            </p>
          </div>
        </>
      )}

      {(tela === 'criar' || tela === 'editar') && (
        <>
          {/* Header form */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <button onClick={() => { setTela('lista'); setErro(null) }} className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-700">
              {tela === 'criar' ? 'Novo modelo' : 'Editar modelo'}
            </span>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Nome</label>
              <input
                type="text"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Saudação inicial"
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Categoria (opcional)</label>
              <input
                type="text"
                value={formCategoria}
                onChange={(e) => setFormCategoria(e.target.value)}
                placeholder="Ex: Vendas, Suporte, Pós-venda"
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Mensagem</label>
              <textarea
                value={formConteudo}
                onChange={(e) => setFormConteudo(e.target.value)}
                placeholder="Olá {{nome}}, tudo bem? Aqui é {{vendedor}} da {{empresa}}..."
                rows={4}
                className="mt-1 w-full rounded-md border px-3 py-1.5 text-sm outline-none resize-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Use {'{{nome}}'}, {'{{vendedor}}'}, {'{{empresa}}'}, {'{{telefone}}'} como variáveis.
              </p>
            </div>
            {erro && (
              <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{erro}</div>
            )}
          </div>

          {/* Footer form */}
          <div className="border-t px-3 py-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setTela('lista'); setErro(null) }}>
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={salvando || !formNome.trim() || !formConteudo.trim()} onClick={handleSalvar}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
