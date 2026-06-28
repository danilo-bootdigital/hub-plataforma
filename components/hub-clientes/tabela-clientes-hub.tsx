// Tabela read-only de Clientes visíveis no Hub (Fatia 10). Sem ações/edição.
export type ClienteHubRow = {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  carteira_nome: string
  modo: 'ABERTA' | 'DISTRIBUIDA'
  responsavel_nome: string | null
}

export function TabelaClientesHub({ clientes }: { clientes: ClienteHubRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Cliente</th>
            <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
            <th className="px-4 py-3 font-medium text-slate-600">Carteira</th>
            <th className="px-4 py-3 font-medium text-slate-600">Modo</th>
            <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
          </tr>
        </thead>
        <tbody>
          {clientes.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                Nenhum Cliente disponível para você no momento.
              </td>
            </tr>
          )}
          {clientes.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium text-slate-800">{c.nome}</td>
              <td className="px-4 py-3 text-slate-600">{c.telefone || '—'}</td>
              <td className="px-4 py-3 text-slate-600">{c.email || '—'}</td>
              <td className="px-4 py-3 text-slate-600">{c.carteira_nome}</td>
              <td className="px-4 py-3">
                <span className={c.modo === 'ABERTA' ? 'text-emerald-700' : 'text-blue-700'}>
                  {c.modo === 'ABERTA' ? 'Aberta' : 'Distribuída'}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{c.responsavel_nome || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
