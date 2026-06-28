import { Briefcase } from 'lucide-react'

// Fatia 03 — área inicial (placeholder) do Assistente de Venda.
// Sem CRUD/operação real: as funcionalidades chegam nas próximas fatias.
export default function AreaAssistentePage() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <Briefcase className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-semibold text-slate-800">Minha Área</h1>
      </div>
      <p className="text-slate-500 max-w-prose">
        Esta é a sua área inicial de Assistente de Venda. As funcionalidades
        operacionais serão disponibilizadas nas próximas etapas de implementação.
      </p>
    </div>
  )
}
