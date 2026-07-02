import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import { OrcamentoPdfTemplate } from '@/components/orcamentos/orcamento-pdf-template'
import { BotaoBaixarPdf } from '@/components/orcamentos/botao-baixar-pdf'

// Página de preview HTML do orçamento.
// PR 1: renderiza o template com dados reais. Botão "Baixar PDF" é apenas visual.
// PR 2: usa BotaoBaixarPdf real que chama a API Puppeteer.

// Print CSS INLINE. Antes era um <link href="./print.css"> relativo, que o
// middleware NÃO serve (só trata como estático _next/favicon/imagens; .css cai
// no fluxo de auth e retorna 307/404). Inline garante que as regras de @page e
// do layout A4 sempre se apliquem na impressão do Puppeteer.
const PRINT_CSS = `
@page { size: A4; margin: 14mm 0 0 0; }
@page :first { margin-top: 0; }
* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; width: 100%; }
main { margin: 0 !important; padding: 0 !important; background: #ffffff !important; min-height: auto; display: block !important; }
[data-pdf-page] {
  width: 210mm !important; max-width: 210mm !important; min-height: 297mm; margin: 0 auto !important;
  padding: 4mm 12mm 12mm !important; background: #ffffff !important; box-shadow: none !important;
  border: none !important; border-radius: 0 !important; overflow: visible !important; display: block !important;
}
.print-hidden, button[title*="Salvar como PDF"], .no-print { display: none !important; visibility: hidden !important; }
table { page-break-inside: auto; border-collapse: collapse; }
thead { display: table-header-group; }
tr, th, td { page-break-inside: avoid; break-inside: avoid; }
* { max-width: 100%; }
img { max-width: 100% !important; height: auto !important; page-break-inside: avoid; break-inside: avoid; }
* { transform: none !important; filter: none !important; }
.bg-emerald-700, .bg-emerald-600 { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
section, article { page-break-inside: avoid; break-inside: avoid; }
@media print {
  [data-pdf-products] { page-break-inside: auto !important; break-inside: auto !important; }
  [data-pdf-products] > div { overflow: visible !important; }
}
`

export default async function PreviewPdfPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const supabase = await createClient()
  const { id } = await params
  const isPrint = (await searchParams).print === '1'

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  // Query INLINE — mesma do route.ts atual (29-91) e da page.tsx atual (18-52).
  // Helper de extração (lib/orcamentos/queries.ts) está fora do escopo do PR 1.
  // [pdf-perf] mede a query pesada (~10 joins) que roda durante o page.goto
  // do Puppeteer. Somente medição — não altera comportamento.
  const tQuery = performance.now()
  const { data: orcamento, error } = await supabase
    .from('quotes')
    .select(`
      *,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(id, nome, telefone, email, endereco, cpf_cnpj),
      contato:contacts!contato_id(
        id, nome, telefone, email, cpf_cnpj, cargo, tipo_pessoa, categoria_cliente,
        especialidade, tipo_conselho, numero_conselho, uf_conselho, observacoes,
        empresa_id, empresa:companies!empresa_id(id, nome),
        endereco, endereco_numero, endereco_complemento, endereco_bairro,
        endereco_cidade, endereco_estado, endereco_cep
      ),
      deal:deals!deal_id(id, titulo, contato_id),
      aprovador:profiles!aprovacao_interna_por(nome),
      fornecedor:suppliers!supplier_id(id, nome, hub_id, health_hubs:health_hubs(id, nome, logo_url)),
      carrier:freight_carriers!carrier_id(nome),
      organizacao:organizations!organization_id(
        nome, nome_fantasia, cnpj, telefone, email, endereco, logo_url, site, instagram
      ),
      itens:quote_items!quote_id(
        id, descricao, quantidade, preco_unitario, desconto_item, subtotal, product_id
      )
    `)
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  console.log(
    '[pdf-perf]',
    JSON.stringify({
      stage: 'preview-pdf:query_pesada',
      id,
      itens: Array.isArray(orcamento?.itens) ? orcamento.itens.length : 0,
      query_ms: Math.round(performance.now() - tQuery),
    })
  )

  if (error || !orcamento) notFound()

  // Orçamento do Hub (DEC-017): enriquece cada item com a FICHA COMPLETA do
  // produto. Produtos têm RLS admin/gestor; o Hub não lê direto, então a ficha
  // é buscada via admin client — o acesso ao orçamento já foi validado acima
  // pela query com RLS + escopo de organização.
  let dadosTemplate = orcamento
  const ehHub = !!orcamento.portfolio_id
  const itensQuote: Array<Record<string, unknown> & { product_id: string | null }> =
    Array.isArray(orcamento.itens) ? orcamento.itens : []
  if (ehHub) {
    const admin = createAdminClient()

    // Identidade do Hub (remetente do PDF ao cliente — DEC-017). Via admin
    // pois hubs pode ter RLS restrita; o acesso ao orçamento já foi validado.
    let hubIdentidade = null
    if (orcamento.hub_id) {
      const { data: hub } = await admin
        .from('hubs')
        .select('nome, logo_url, telefone, email, site, instagram, cnpj, endereco')
        .eq('id', orcamento.hub_id)
        .maybeSingle()
      hubIdentidade = hub ?? null
    }

    // Ficha completa dos produtos (produtos têm RLS admin/gestor).
    let itensEnriquecidos = itensQuote
    const productIds = [...new Set(itensQuote.map((i) => i.product_id).filter(Boolean))] as string[]
    if (productIds.length > 0) {
      const { data: produtos } = await admin
        .from('products')
        .select('id, nome, descricao, composicao, apresentacao, via_administracao, via_apresentacao, volume, unidade, quantidade_por_caixa, aplicadores, exige_receita')
        .in('id', productIds)
      const pmap = new Map((produtos ?? []).map((p) => [p.id, p]))
      itensEnriquecidos = itensQuote.map((i) => {
        const p = i.product_id ? pmap.get(i.product_id) : null
        return p
          ? {
              ...i,
              produto_nome: p.nome,
              descricao_ficha: p.descricao,
              composicao: p.composicao,
              apresentacao: p.apresentacao,
              via_administracao: p.via_administracao,
              via_apresentacao: p.via_apresentacao,
              volume: p.volume,
              unidade: p.unidade,
              quantidade_por_caixa: p.quantidade_por_caixa,
              aplicadores: p.aplicadores,
              exige_receita: p.exige_receita,
            }
          : i
      })
    }

    dadosTemplate = { ...orcamento, itens: itensEnriquecidos, hub: hubIdentidade }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <main className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
        <div
          data-pdf-page="true"
          className="mx-auto w-[794px] max-w-full bg-white shadow-lg print:shadow-none print:w-[210mm] print:max-w-none"
        >
          <OrcamentoPdfTemplate data={dadosTemplate} />
        </div>
        {!isPrint && (
          <div className="mx-auto mt-4 w-[794px] max-w-full flex justify-end print:hidden">
            <BotaoBaixarPdf orcamentoId={id} numero={orcamento.numero} />
          </div>
        )}
      </main>
    </>
  )
}
