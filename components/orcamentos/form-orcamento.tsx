'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { criarOrcamento, editarOrcamento } from '@/app/(dashboard)/orcamentos/actions'
import { formatarMoeda } from '@/lib/utils'
import { BuscaProduto } from '@/components/orcamentos/busca-produto'
import { Plus, Trash2, CreditCard, User, Upload, FileText } from 'lucide-react'
import type { Product, Supplier, SupplierCategory } from '@/types/database'
import { ImportarItensPlanilha } from '@/components/orcamentos/importar-itens-planilha'

const FORMAS_PAGAMENTO = [
  { value: 'pix', label: 'PIX' },
  { value: 'credito_1x', label: 'Cartão de Crédito - 1x' },
  { value: 'credito_2x', label: 'Cartão de Crédito - 2x' },
  { value: 'credito_3x', label: 'Cartão de Crédito - 3x' },
  { value: 'credito_4x', label: 'Cartão de Crédito - 4x' },
  { value: 'credito_5x', label: 'Cartão de Crédito - 5x' },
] as const

type ItemForm = {
  key: string
  product_id: string | null
  descricao: string
  unidade: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
}

type Deal = { id: string; titulo: string }
type Contato = {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  cpf_cnpj: string | null
  cargo: string | null
  tipo_pessoa: string | null
  categoria_cliente: string | null
  especialidade: string | null
  tipo_conselho: string | null
  numero_conselho: string | null
  uf_conselho: string | null
  observacoes: string | null
  empresa_id: string | null
  empresa_nome?: string | null
  endereco: string | null
  endereco_numero: string | null
  endereco_complemento: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_estado: string | null
  endereco_cep: string | null
}
type Empresa = { id: string; nome: string; cnpj: string | null; nome_fantasia: string | null; inscricao_estadual: string | null; inscricao_municipal: string | null; endereco: string | null }

type Props = {
  produtos: Product[]
  fornecedores: Supplier[]
  categorias: SupplierCategory[]
  deals: Deal[]
  contatos: Contato[]
  empresas: Empresa[]
  fretesFornecedores: { supplier_id: string; carrier_id: string; regiao: string; valor: number }[]
  transportadoras: { id: string; supplier_id: string; nome: string }[]
  orcamentoId?: string
  defaultValues?: {
    lead_id: string | null
    deal_id: string | null
    supplier_id: string | null
    contato_id: string | null
    observacoes: string | null
    endereco_entrega: string | null
    forma_pagamento: string | null
    desconto_geral: number
    frete: number
    itens: Omit<ItemForm, 'key'>[]
    // Migration 049: dados para emissão da nota fiscal
    nota_tipo_pessoa?: string | null
    nota_nome?: string | null
    nota_documento?: string | null
    nota_razao_social?: string | null
    nota_nome_fantasia?: string | null
    nota_endereco?: string | null
    nota_ie?: string | null
    nota_im?: string | null
  }
}

function calcularSubtotal(item: ItemForm) {
  return item.quantidade * item.preco_unitario * (1 - item.desconto_item / 100)
}

export function FormOrcamento({ produtos, fornecedores, categorias, deals, contatos, empresas, fretesFornecedores, transportadoras, orcamentoId, defaultValues }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const editando = !!orcamentoId
  const [isLoading, setIsLoading] = useState(false)

  const [dealId, setDealId] = useState(defaultValues?.deal_id ?? '')
  const [supplierId, setSupplierId] = useState(defaultValues?.supplier_id ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [contatoId, setContatoId] = useState(defaultValues?.contato_id ?? '')
  const [buscaContato, setBuscaContato] = useState('')
  const [observacoes, setObservacoes] = useState(defaultValues?.observacoes ?? '')
  const [enderecoEntrega, setEnderecoEntrega] = useState(defaultValues?.endereco_entrega ?? '')
  const [formaPagamento, setFormaPagamento] = useState(defaultValues?.forma_pagamento ?? '')
  const [descontoGeral, setDescontoGeral] = useState(defaultValues?.desconto_geral ?? 0)
  const [frete, setFrete] = useState(defaultValues?.frete ?? 0)
  const [carrierId, setCarrierId] = useState('')
  const [freteRegiao, setFreteRegiao] = useState('')
  const [itens, setItens] = useState<ItemForm[]>(
    defaultValues?.itens.map((item, i) => ({ ...item, unidade: item.unidade ?? 'un', key: `item-${i}` })) ?? [
      { key: 'item-0', product_id: null, descricao: '', unidade: 'un', quantidade: 1, preco_unitario: 0, desconto_item: 0 },
    ]
  )

  // Migration 049: dados para emissão da nota fiscal
  const [notaTipoPessoa, setNotaTipoPessoa] = useState(defaultValues?.nota_tipo_pessoa ?? 'PF')
  const [notaNome, setNotaNome] = useState(defaultValues?.nota_nome ?? '')
  const [notaDocumento, setNotaDocumento] = useState(defaultValues?.nota_documento ?? '')
  const [notaRazaoSocial, setNotaRazaoSocial] = useState(defaultValues?.nota_razao_social ?? '')
  const [notaNomeFantasia, setNotaNomeFantasia] = useState(defaultValues?.nota_nome_fantasia ?? '')
  const [notaEndereco, setNotaEndereco] = useState(defaultValues?.nota_endereco ?? '')
  const [notaIe, setNotaIe] = useState(defaultValues?.nota_ie ?? '')
  const [notaIm, setNotaIm] = useState(defaultValues?.nota_im ?? '')

  // Filtrar categorias pelo fornecedor selecionado
  const categoriasFiltradas = supplierId
    ? categorias.filter((c) => c.supplier_id === supplierId)
    : []

  const produtosFiltrados = useMemo(() => produtos.filter((p) => {
    if (!p.ativo) return false
    if (supplierId && p.supplier_id !== supplierId) return false
    if (categoryId && p.category_id !== categoryId) return false
    return true
  }), [produtos, supplierId, categoryId])

  const contatosFiltrados = useMemo(() => {
    if (!buscaContato.trim()) return contatos.slice(0, 20)
    const termo = buscaContato.toLowerCase()
    return contatos.filter((c) =>
      c.nome.toLowerCase().includes(termo) ||
      c.telefone?.includes(termo) ||
      c.email?.toLowerCase().includes(termo) ||
      c.cpf_cnpj?.includes(termo)
    ).slice(0, 20)
  }, [contatos, buscaContato])

  const contatoSelecionado = useMemo(() => {
    if (!contatoId) return null
    return contatos.find((c) => c.id === contatoId) ?? null
  }, [contatos, contatoId])

  // Empresa vinculada ao contato selecionado
  const empresaVinculada = useMemo(() => {
    if (!contatoSelecionado?.empresa_id) return null
    return empresas.find((e) => e.id === contatoSelecionado.empresa_id) ?? null
  }, [contatoSelecionado, empresas])

  // Montar endereço completo do contato
  const montarEnderecoCompleto = (contato: Contato): string => {
    const partes: string[] = []
    if (contato.endereco) partes.push(contato.endereco)
    if (contato.endereco_numero) partes.push(contato.endereco_numero)
    if (contato.endereco_complemento) partes.push(contato.endereco_complemento)
    if (contato.endereco_bairro) partes.push(contato.endereco_bairro)
    const cidadeUFCEP: string[] = []
    if (contato.endereco_cidade) cidadeUFCEP.push(contato.endereco_cidade)
    if (contato.endereco_estado) cidadeUFCEP.push(contato.endereco_estado)
    if (contato.endereco_cep) cidadeUFCEP.push(contato.endereco_cep)
    if (cidadeUFCEP.length > 0) partes.push(cidadeUFCEP.join(' - '))
    return partes.join(', ')
  }

  // Preencher dados da nota quando empresa vinculada é encontrada ou alterada
  const preencherDadosNota = (tipo: string) => {
    if (tipo === 'PJ' && empresaVinculada) {
      setNotaNome(empresaVinculada.nome)
      setNotaDocumento(empresaVinculada.cnpj ?? '')
      setNotaRazaoSocial(empresaVinculada.nome)
      setNotaNomeFantasia(empresaVinculada.nome_fantasia ?? '')
      setNotaEndereco(empresaVinculada.endereco ?? '')
      setNotaIe(empresaVinculada.inscricao_estadual ?? '')
      setNotaIm(empresaVinculada.inscricao_municipal ?? '')
    } else if (tipo === 'PF' && contatoSelecionado) {
      setNotaNome(contatoSelecionado.nome)
      setNotaDocumento(contatoSelecionado.cpf_cnpj ?? '')
      setNotaRazaoSocial('')
      setNotaNomeFantasia('')
      setNotaEndereco(montarEnderecoCompleto(contatoSelecionado))
      setNotaIe('')
      setNotaIm('')
    }
  }

  // Quando o tipo de pessoa muda
  const handleNotaTipoPessoaChange = (tipo: string) => {
    setNotaTipoPessoa(tipo)
    preencherDadosNota(tipo)
  }

  // Quando empresa vinculada muda ou tipo de pessoa muda
  useEffect(() => {
    if (notaTipoPessoa === 'PJ' && empresaVinculada) {
      preencherDadosNota('PJ')
    }
  }, [empresaVinculada, notaTipoPessoa])

  function handleFornecedorChange(novoId: string | null) {
    const id = (!novoId || novoId === '__none__') ? '' : novoId
    if (id === supplierId) return
    const temProdutoSelecionado = itens.some((i) => i.product_id)
    if (temProdutoSelecionado) {
      const confirmar = window.confirm(
        'Trocar de fornecedor vai limpar os produtos selecionados nos itens. Continuar?'
      )
      if (!confirmar) return
      setItens((prev) =>
        prev.map((i) => ({ ...i, product_id: null, descricao: '', preco_unitario: 0 }))
      )
    }
    setSupplierId(id)
    setCategoryId('')
    setCarrierId('')
    setFreteRegiao('')
    setFrete(0)
  }

  function adicionarItem() {
    setItens((prev) => [
      ...prev,
      { key: crypto.randomUUID(), product_id: null, descricao: '', unidade: 'un', quantidade: 1, preco_unitario: 0, desconto_item: 0 },
    ])
  }

  function removerItem(key: string) {
    setItens((prev) => prev.filter((i) => i.key !== key))
  }

  function atualizarItem(key: string, campo: keyof ItemForm, valor: unknown) {
    setItens((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i
        const atualizado = { ...i, [campo]: valor }
        if (campo === 'quantidade' && i.descricao.toLowerCase().includes('tirzepatida')) {
          const qtd = Number(valor)
          if (qtd > 3) {
            toast.error('Tirzepatida: máximo 3 unidades por linha. Crie outra linha para mais unidades.')
            return i
          }
        }
        return atualizado
      })
    )
  }

  function selecionarProduto(key: string, produtoId: string) {
    const produto = produtosFiltrados.find((p) => p.id === produtoId)
    if (!produto) return
    setItens((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i
        const qtd = i.quantidade
        if (produto.nome.toLowerCase().includes('tirzepatida') && qtd > 3) {
          toast.error('Tirzepatida: máximo 3 unidades por linha.')
          return { ...i, product_id: produtoId, descricao: produto.nome, preco_unitario: produto.preco_unitario, unidade: produto.unidade ?? 'un', quantidade: 3 }
        }
        return { ...i, product_id: produtoId, descricao: produto.nome, preco_unitario: produto.preco_unitario, unidade: produto.unidade ?? 'un' }
      })
    )
  }

  const valorSubtotal = itens.reduce((acc, item) => acc + calcularSubtotal(item), 0)
  const valorTotal = valorSubtotal * (1 - descontoGeral / 100) + frete

  function handleSubmit() {
    if (!supplierId) {
      toast.error('Selecione um fornecedor.')
      return
    }
    if (itens.length === 0) {
      toast.error('Adicione ao menos um item.')
      return
    }
    const itensInvalidos = itens.some((i) => !i.descricao.trim())
    if (itensInvalidos) {
      toast.error('Todos os itens precisam de uma descrição.')
      return
    }
    const itensComValorInvalido = itens.some((i) => i.quantidade <= 0 || i.preco_unitario < 0 || i.desconto_item < 0 || i.desconto_item > 100)
    if (itensComValorInvalido) {
      toast.error('Verifique os valores dos itens: quantidade deve ser maior que zero, preço não pode ser negativo e desconto deve estar entre 0 e 100%.')
      return
    }
    const tirzepatidaInvalida = itens.some((i) => i.descricao.toLowerCase().includes('tirzepatida') && i.quantidade > 3)
    if (tirzepatidaInvalida) {
      toast.error('Tirzepatida: máximo 3 unidades por linha. Crie linhas adicionais para mais unidades.')
      return
    }

    startTransition(async () => {
      try {
        const dados = {
          lead_id: null,
          deal_id: dealId || null,
          supplier_id: supplierId,
          contato_id: contatoId || null,
          observacoes: observacoes || null,
          endereco_entrega: enderecoEntrega || null,
          forma_pagamento: formaPagamento || null,
          desconto_geral: Math.min(Math.max(descontoGeral, 0), 100),
          frete,
          carrier_id: carrierId || null,
          frete_regiao: freteRegiao || null,
          itens: itens.map(({ product_id, descricao, unidade, quantidade, preco_unitario, desconto_item }) => ({
            product_id,
            descricao,
            unidade,
            quantidade,
            preco_unitario,
            desconto_item,
          })),
          // Migration 049: dados para emissão da nota fiscal
          nota_tipo_pessoa: notaTipoPessoa,
          nota_nome: notaNome || null,
          nota_documento: notaDocumento || null,
          nota_razao_social: notaRazaoSocial || null,
          nota_nome_fantasia: notaNomeFantasia || null,
          nota_endereco: notaEndereco || null,
          nota_ie: notaIe || null,
          nota_im: notaIm || null,
        }
        if (editando) {
          await editarOrcamento(orcamentoId, dados)
          toast.success('Orçamento atualizado.')
        } else {
          await criarOrcamento(dados)
          toast.success('Orçamento criado com sucesso.')
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar orçamento.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Cliente */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Cliente</Label>
          {contatoSelecionado ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-800">{contatoSelecionado.nome}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setContatoId(''); setBuscaContato('') }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remover
                </button>
              </div>
              {contatoSelecionado.telefone && <p className="text-xs text-slate-500">Tel: {contatoSelecionado.telefone}</p>}
              {contatoSelecionado.email && <p className="text-xs text-slate-500">Email: {contatoSelecionado.email}</p>}
              {contatoSelecionado.cpf_cnpj && <p className="text-xs text-slate-500">CPF/CNPJ: {contatoSelecionado.cpf_cnpj}</p>}
              {contatoSelecionado.endereco && <p className="text-xs text-slate-500">Endereço: {contatoSelecionado.endereco}</p>}
              {empresaVinculada && (
                <p className="text-xs text-blue-600 font-medium">Empresa: {empresaVinculada.nome}</p>
              )}
            </div>
          ) : (
            <div className="relative">
              <Input
                value={buscaContato}
                onChange={(e) => setBuscaContato(e.target.value)}
                placeholder="Pesquisar cliente por nome, telefone, email ou CPF/CNPJ..."
                className="h-9 text-sm"
              />
              {buscaContato.trim() && contatosFiltrados.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                  {contatosFiltrados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setContatoId(c.id); setBuscaContato('') }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b last:border-0"
                    >
                      <span className="font-medium text-slate-800">{c.nome}</span>
                      {c.telefone && <span className="ml-2 text-xs text-slate-400">{c.telefone}</span>}
                    </button>
                  ))}
                </div>
              )}
              {buscaContato.trim() && contatosFiltrados.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg p-3">
                  <p className="text-xs text-slate-400">Nenhum cliente encontrado.</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Label>Negociação (opcional)</Label>
          <Select value={dealId || '__none__'} onValueChange={(v) => setDealId(v === '__none__' ? '' : (v ?? ''))}>
            <SelectTrigger>
              <span className="flex flex-1 text-left truncate">
                {dealId ? deals.find(d => d.id === dealId)?.titulo ?? 'Selecionar...' : 'Nenhuma'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhuma</SelectItem>
              {deals.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.titulo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Migration 049: Dados para Emissão da Nota Fiscal */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
            <FileText className="h-5 w-5 text-blue-600" />
            <Label className="text-base font-semibold text-blue-800">Dados para Emissão da Nota Fiscal</Label>
          </div>

          {/* Tipo de Pessoa */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Emitir em nome de:</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="nota_tipo_pessoa"
                  value="PF"
                  checked={notaTipoPessoa === 'PF'}
                  onChange={() => handleNotaTipoPessoaChange('PF')}
                  className="text-blue-600"
                />
                <span className="text-sm">Pessoa Física</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="nota_tipo_pessoa"
                  value="PJ"
                  checked={notaTipoPessoa === 'PJ'}
                  onChange={() => handleNotaTipoPessoaChange('PJ')}
                  className="text-blue-600"
                />
                <span className="text-sm">Pessoa Jurídica</span>
              </label>
            </div>
            {/* Aviso só aparece se não há empresa vinculada E não há dados manuais preenchidos */}
            {notaTipoPessoa === 'PJ' && !empresaVinculada && contatoSelecionado && !notaNome && !notaDocumento && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                ℹ️ Este contato não possui empresa vinculada. Você pode preencher os dados manualmente ou vincular uma empresa ao contato.
              </p>
            )}
          </div>

          {/* Campos do Formulário */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Nome / Razão Social</Label>
              <Input
                value={notaNome}
                onChange={(e) => setNotaNome(e.target.value)}
                placeholder={notaTipoPessoa === 'PF' ? 'Nome completo' : 'Razão Social'}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{notaTipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}</Label>
              <Input
                value={notaDocumento}
                onChange={(e) => setNotaDocumento(e.target.value)}
                placeholder={notaTipoPessoa === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {notaTipoPessoa === 'PJ' && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Razão Social</Label>
                  <Input
                    value={notaRazaoSocial}
                    onChange={(e) => setNotaRazaoSocial(e.target.value)}
                    placeholder="Razão Social completa"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nome Fantasia</Label>
                  <Input
                    value={notaNomeFantasia}
                    onChange={(e) => setNotaNomeFantasia(e.target.value)}
                    placeholder="Nome Fantasia"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Inscrição Estadual</Label>
                  <Input
                    value={notaIe}
                    onChange={(e) => setNotaIe(e.target.value)}
                    placeholder="000.000.000"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Inscrição Municipal</Label>
                  <Input
                    value={notaIm}
                    onChange={(e) => setNotaIm(e.target.value)}
                    placeholder="Opcional"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Endereço</Label>
                  <Input
                    value={notaEndereco}
                    onChange={(e) => setNotaEndereco(e.target.value)}
                    placeholder="Endereço para a nota"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {notaTipoPessoa === 'PF' && (
            <div className="space-y-1">
              <Label className="text-xs">Endereço</Label>
              <Input
                value={notaEndereco}
                onChange={(e) => setNotaEndereco(e.target.value)}
                placeholder="Endereço para a nota"
                className="h-9 text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-1">
          <Label>Fornecedor *</Label>
          <Select value={supplierId || '__none__'} onValueChange={handleFornecedorChange} aria-required="true">
            <SelectTrigger>
              <span className="flex flex-1 text-left truncate">
                {supplierId ? fornecedores.find(f => f.id === supplierId)?.nome ?? 'Selecionar...' : 'Selecionar fornecedor...'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {fornecedores.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {supplierId && (
            <p className="text-xs text-slate-500">Apenas produtos deste fornecedor serão exibidos.</p>
          )}
        </div>
        {supplierId && categoriasFiltradas.length > 0 && (
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={categoryId || '__all__'} onValueChange={(v) => setCategoryId(v === '__all__' ? '' : (v ?? ''))}>
              <SelectTrigger>
                <span className="flex flex-1 text-left truncate">
                  {categoryId ? categoriasFiltradas.find(c => c.id === categoryId)?.nome ?? 'Todas' : 'Todas as categorias'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as categorias</SelectItem>
                {categoriasFiltradas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Itens</Label>
          <div className="flex items-center gap-2">
            <ImportarItensPlanilha
              produtos={produtosFiltrados}
              onImportar={(novos) => setItens((prev) => [...prev, ...novos])}
              disabled={!supplierId}
            />
            <Button type="button" variant="outline" size="sm" onClick={adicionarItem} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Adicionar item
            </Button>
          </div>
        </div>

        {itens.map((item) => (
          <Card key={item.key} className="overflow-visible">
            <CardContent className="space-y-3 p-4">
              {/* Linha 1: Produto (50%) + Descrição (50%) */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Produto</Label>
                  <BuscaProduto
                    produtos={produtosFiltrados}
                    value={item.product_id}
                    onSelect={(produtoId) => {
                      if (produtoId) selecionarProduto(item.key, produtoId)
                      else atualizarItem(item.key, 'product_id', null)
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    className="h-9 text-sm"
                    value={item.descricao}
                    onChange={(e) => atualizarItem(item.key, 'descricao', e.target.value)}
                    placeholder="Descrição do item"
                  />
                </div>
              </div>

              {/* Linha 2: Unidade + Qtd + Desc% + Preço + Total + Excluir */}
              <div className="grid gap-3 md:grid-cols-12 items-end">
                <div className="md:col-span-1 space-y-1">
                  <Label className="text-xs">Unidade</Label>
                  <Input
                    className="h-9 text-sm"
                    value={item.unidade ?? 'un'}
                    onChange={(e) => atualizarItem(item.key, 'unidade', e.target.value)}
                    placeholder="un"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs">Qtd</Label>
                  <Input
                    className="h-9 text-sm"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.quantidade}
                    onChange={(e) => atualizarItem(item.key, 'quantidade', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="md:col-span-1 space-y-1">
                  <Label className="text-xs">Desc %</Label>
                  <Input
                    className="h-9 text-sm"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.desconto_item}
                    onChange={(e) => atualizarItem(item.key, 'desconto_item', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label className="text-xs">Preço unitário</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>
                    <Input
                      className="h-9 text-sm pl-8"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.preco_unitario}
                      onChange={(e) => atualizarItem(item.key, 'preco_unitario', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label className="text-xs">Valor total</Label>
                  <div className="h-9 flex items-center rounded-lg border bg-slate-50 px-3">
                    <span className="text-sm font-medium text-slate-900">{formatarMoeda(calcularSubtotal(item))}</span>
                  </div>
                </div>
                <div className="md:col-span-2 flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-400 hover:text-red-600"
                    onClick={() => removerItem(item.key)}
                    disabled={itens.length === 1}
                    aria-label="Remover item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Endereço de entrega</Label>
            <Input
              value={enderecoEntrega}
              onChange={(e) => setEnderecoEntrega(e.target.value)}
              placeholder="Rua, número, bairro, cidade - UF"
            />
          </div>
          <div className="space-y-1">
            <Label>Forma de pagamento</Label>
            <Select value={formaPagamento || '__none__'} onValueChange={(v) => setFormaPagamento(v === '__none__' ? '' : (v ?? ''))}>
              <SelectTrigger>
                <span className="flex flex-1 items-center gap-2 text-left truncate">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  {formaPagamento ? FORMAS_PAGAMENTO.find(f => f.value === formaPagamento)?.label ?? 'Selecionar...' : 'Selecionar forma de pagamento'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma</SelectItem>
                {FORMAS_PAGAMENTO.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Condições de pagamento, prazo de entrega..."
              rows={3}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Desconto geral (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="w-24"
                value={descontoGeral}
                onChange={(e) => setDescontoGeral(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label>Frete</Label>
              {(() => {
                const transportadorasDoFornecedor = transportadoras.filter((t) => t.supplier_id === supplierId)
                if (transportadorasDoFornecedor.length > 0) {
                  const fretesDoCarrier = fretesFornecedores.filter((f) => f.carrier_id === carrierId)
                  return (
                    <div className="space-y-2">
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={carrierId}
                        onChange={(e) => { setCarrierId(e.target.value); setFrete(0); setFreteRegiao('') }}
                      >
                        <option value="">Selecionar transportadora...</option>
                        {transportadorasDoFornecedor.map((t) => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                      {carrierId && fretesDoCarrier.length > 0 && (
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={freteRegiao}
                          onChange={(e) => {
                            const regiao = e.target.value
                            setFreteRegiao(regiao)
                            const freteItem = fretesDoCarrier.find((f) => f.regiao === regiao)
                            setFrete(freteItem?.valor ?? 0)
                          }}
                        >
                          <option value="">Selecionar região...</option>
                          {fretesDoCarrier.map((f) => (
                            <option key={f.regiao} value={f.regiao}>
                              {f.regiao} — R$ {f.valor.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )
                }
                return (
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>
                    <Input
                      type="number"
                      min="0"
                      max="99999"
                      step="0.01"
                      className="pl-8 w-32"
                      value={frete}
                      onChange={(e) => setFrete(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )
              })()}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 space-y-1">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{formatarMoeda(valorSubtotal)}</span>
            </div>
            {descontoGeral > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Desconto ({descontoGeral}%)</span>
                <span>-{formatarMoeda(valorSubtotal * descontoGeral / 100)}</span>
              </div>
            )}
            {frete > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>Frete</span>
                <span>+{formatarMoeda(frete)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 border-t pt-1">
              <span>Total</span>
              <span>{formatarMoeda(valorTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={isPending} className="w-full md:w-auto">
        {isPending ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar orçamento'}
      </Button>
    </div>
  )
}
