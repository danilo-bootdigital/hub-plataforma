'use client'

type ConversaStatus = 'nao_atendida' | 'em_atendimento' | 'aguardando_cliente' | 'finalizada'
type TagType = { id: string; nome: string; cor: string }
type Usuario = { id: string; nome: string }

type Filtros = {
  status: ConversaStatus | null
  responsavelId: string | null
  tagId: string | null
  busca: string
}

type Props = {
  filtros: Filtros
  onChange: (f: Filtros) => void
  usuarios: Usuario[]
  tags: TagType[]
  contadores: Record<ConversaStatus, number>
}

const STATUS_LABELS: Record<ConversaStatus, string> = {
  nao_atendida: 'Não atendidas',
  em_atendimento: 'Em atendimento',
  aguardando_cliente: 'Aguardando',
  finalizada: 'Finalizadas',
}

const STATUS_CORES: Record<ConversaStatus, string> = {
  nao_atendida: 'bg-red-100 text-red-700 hover:bg-red-200',
  em_atendimento: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  aguardando_cliente: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
  finalizada: 'bg-green-100 text-green-700 hover:bg-green-200',
}

export function FiltrosConversas({ filtros, onChange, usuarios, tags, contadores }: Props) {
  return (
    <div className="space-y-3 border-b px-4 py-3">
      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar por nome ou telefone..."
        value={filtros.busca}
        onChange={(e) => onChange({ ...filtros, busca: e.target.value })}
        className="w-full rounded-md border px-3 py-1.5 text-sm placeholder:text-slate-400"
      />

      {/* Status */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onChange({ ...filtros, status: null })}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            filtros.status === null ? 'bg-slate-200 text-slate-800' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          Todas
        </button>
        {(Object.keys(STATUS_LABELS) as ConversaStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => onChange({ ...filtros, status: filtros.status === s ? null : s })}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              filtros.status === s ? STATUS_CORES[s] : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {STATUS_LABELS[s]}
            {contadores[s] > 0 && (
              <span className="ml-1 opacity-70">({contadores[s]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Filtros secundários */}
      <div className="flex gap-2">
        <select
          value={filtros.responsavelId ?? ''}
          onChange={(e) => onChange({ ...filtros, responsavelId: e.target.value || null })}
          className="rounded border px-2 py-1 text-xs text-slate-600"
        >
          <option value="">Todos os vendedores</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </select>

        {tags.length > 0 && (
          <select
            value={filtros.tagId ?? ''}
            onChange={(e) => onChange({ ...filtros, tagId: e.target.value || null })}
            className="rounded border px-2 py-1 text-xs text-slate-600"
          >
            <option value="">Todas as tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
