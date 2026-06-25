import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { OrcamentoPdfTemplate } from '@/components/orcamentos/orcamento-pdf-template'
import { BotaoBaixarPdf } from '@/components/orcamentos/botao-baixar-pdf'

// Página de preview HTML do orçamento.
// PR 1: renderiza o template com dados reais. Botão "Baixar PDF" é apenas visual.
// PR 2: usa BotaoBaixarPdf real que chama a API Puppeteer.

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

  return (
    <>
      <link rel="stylesheet" href="./print.css" />
      <main className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
        <div
          data-pdf-page="true"
          className="mx-auto w-[794px] max-w-full bg-white shadow-lg print:shadow-none print:w-[210mm] print:max-w-none"
        >
          <OrcamentoPdfTemplate data={orcamento} />
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
