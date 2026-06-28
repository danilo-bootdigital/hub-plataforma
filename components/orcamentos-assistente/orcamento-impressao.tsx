import { formatarMoeda } from '@/lib/utils'

// Layout oficial do Orçamento — SOMENTE LEITURA.
// Componente puramente presentacional, reutilizável para futura geração de PDF
// (Fatia 13C: usado apenas para conferência/impressão; NÃO gera PDF).

export type ItemImpressao = {
  descricao: string
  quantidade: number
  preco_unitario: number
  subtotal: number
}

export type OrcamentoImpressaoProps = {
  numero: number | null
  statusLabel: string
  criadoEm: string
  organizacao: { nome: string | null; logoUrl: string | null }
  cliente: { nome: string; telefone: string | null; email: string | null }
  carteiraNome: string
  atendimentoTitulo: string
  etapa: string
  assistenteNome: string
  itens: ItemImpressao[]
  totalBruto: number
  descontoRotulo: string
  descontoTotal: number
  totalFinal: number
  observacoes: string | null
}

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export function OrcamentoImpressao(props: OrcamentoImpressaoProps) {
  const {
    numero,
    statusLabel,
    criadoEm,
    organizacao,
    cliente,
    carteiraNome,
    atendimentoTitulo,
    etapa,
    assistenteNome,
    itens,
    totalBruto,
    descontoRotulo,
    descontoTotal,
    totalFinal,
    observacoes,
  } = props

  return (
    <div className="mx-auto max-w-3xl bg-white text-slate-900 print:max-w-none">
      {/* Cabeçalho */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          {organizacao.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organizacao.logoUrl} alt={organizacao.nome ?? 'Logo'} className="h-12 w-auto object-contain" />
          ) : null}
          <div>
            <p className="text-lg font-bold leading-tight">{organizacao.nome ?? '—'}</p>
            <p className="text-xs text-slate-500">Orçamento comercial</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold leading-tight">Orçamento {numero ? `#${numero}` : ''}</p>
          <p className="text-xs text-slate-500">Emitido em {formatarData(criadoEm)}</p>
          <p className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {statusLabel}
          </p>
        </div>
      </header>

      {/* Dados de identificação */}
      <section className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Cliente</h2>
          <p className="font-medium">{cliente.nome}</p>
          <p className="text-slate-600">{cliente.telefone ?? '—'}</p>
          <p className="text-slate-600">{cliente.email ?? '—'}</p>
        </div>
        <div>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Atendimento</h2>
          <p className="font-medium">{atendimentoTitulo}</p>
          <p className="text-slate-600">Etapa: {etapa}</p>
        </div>
        <div>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Assistente responsável</h2>
          <p className="font-medium">{assistenteNome}</p>
        </div>
        <div>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Carteira</h2>
          <p className="font-medium">{carteiraNome}</p>
        </div>
      </section>

      {/* Itens */}
      <section className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Produtos</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
              <th className="py-2 pr-2 font-semibold">Produto</th>
              <th className="py-2 px-2 text-right font-semibold">Qtd.</th>
              <th className="py-2 px-2 text-right font-semibold">Valor unit.</th>
              <th className="py-2 pl-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">Nenhum produto neste Orçamento.</td>
              </tr>
            ) : (
              itens.map((i, idx) => (
                <tr key={idx} className="break-inside-avoid border-b border-slate-100">
                  <td className="py-2 pr-2 align-top">{i.descricao}</td>
                  <td className="py-2 px-2 text-right align-top tabular-nums">{i.quantidade}</td>
                  <td className="py-2 px-2 text-right align-top tabular-nums">{formatarMoeda(Number(i.preco_unitario))}</td>
                  <td className="py-2 pl-2 text-right align-top tabular-nums">{formatarMoeda(Number(i.subtotal))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Totais */}
      <section className="mt-4 flex break-inside-avoid justify-end">
        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Total Bruto</dt>
            <dd className="tabular-nums">{formatarMoeda(Number(totalBruto))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Desconto{descontoRotulo ? ` (${descontoRotulo})` : ''}</dt>
            <dd className="tabular-nums text-slate-700">− {formatarMoeda(Number(descontoTotal))}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t-2 border-slate-800 pt-1.5">
            <dt className="font-bold">Total Final</dt>
            <dd className="tabular-nums text-lg font-bold">{formatarMoeda(Number(totalFinal))}</dd>
          </div>
        </dl>
      </section>

      {/* Observações comerciais */}
      <section className="mt-6 break-inside-avoid">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Observações comerciais</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{observacoes?.trim() ? observacoes : '—'}</p>
      </section>
    </div>
  )
}
