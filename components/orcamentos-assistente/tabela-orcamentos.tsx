import Link from 'next/link'

// Tabela read-only de Orçamentos do Assistente (Fatia 12). Sem itens/valores.
export type OrcamentoRow = {
  id: string
  numero: number | null
  cliente_nome: string
  atendimento_titulo: string
  status: string
  criado_em: string
  responsavel_nome: string
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'RASCUNHO',
  aguardando_aprovacao_interna: 'Aguardando aprovação interna',
  aprovado_internamente: 'Aprovado internamente',
  rejeitado_internamente: 'Rejeitado internamente',
  enviado_ao_cliente: 'Enviado ao cliente',
  aprovado_pelo_cliente: 'Aprovado pelo cliente',
  recusado_pelo_cliente: 'Recusado pelo cliente',
}

const STATUS_CLASSE: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-600',
  enviado_ao_cliente: 'bg-blue-100 text-blue-700',
  aprovado_pelo_cliente: 'bg-emerald-100 text-emerald-700',
  recusado_pelo_cliente: 'bg-red-100 text-red-700',
}

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export function TabelaOrcamentos({ orcamentos }: { orcamentos: OrcamentoRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nº</th>
            <th className="px-4 py-3 font-medium text-slate-600">Cliente</th>
            <th className="px-4 py-3 font-medium text-slate-600">Atendimento</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Criado em</th>
            <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
            <th className="px-4 py-3 w-20">Ações</th>
          </tr>
        </thead>
        <tbody>
          {orcamentos.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                Nenhum Orçamento criado por você.
              </td>
            </tr>
          )}
          {orcamentos.map((o) => (
            <tr key={o.id} className="border-b last:border-0">
              <td className="px-4 py-3 text-slate-700">{o.numero ?? '—'}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{o.cliente_nome}</td>
              <td className="px-4 py-3 text-slate-600">{o.atendimento_titulo}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSE[o.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">{formatarData(o.criado_em)}</td>
              <td className="px-4 py-3 text-slate-600">{o.responsavel_nome}</td>
              <td className="px-4 py-3">
                <Link href={`/assistente/orcamentos/${o.id}`} className="text-emerald-700 hover:underline">
                  Abrir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
