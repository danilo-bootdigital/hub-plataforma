import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { listarValidacoes } from './actions'
import { RESULTADO_LABEL, RESULTADO_BADGE, RESULTADO_EMOJI, STATUS_LABEL, STATUS_BADGE, fmtData } from './ui'

const PERFIS_PERMITIDOS = ['proprietario_hub', 'assistente']

export default async function ValidacaoReceitaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (!PERFIS_PERMITIDOS.includes(perfil.cargo)) redirect('/painel')

  const validacoes = await listarValidacoes()

  return (
    <div className="mx-auto w-[90%] max-w-[1600px] space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Validação de Receita</h1>
          <p className="mt-1 text-sm text-slate-500">Conferência documental da receita com pré-análise por IA e decisão humana.</p>
        </div>
        <Link href="/hub/validacao-receita/nova" className={cn(buttonVariants({ size: 'default' }))}>
          <Plus /> Nova Validação
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Resultado</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Última atualização</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {validacoes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  Nenhuma validação ainda. Clique em <span className="font-medium text-slate-600">Nova Validação</span> para começar.
                </td>
              </tr>
            )}
            {validacoes.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fmtData(v.criado_em)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{v.paciente ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{v.produto ?? '—'}</td>
                <td className="px-4 py-3">
                  {v.resultado_analise ? (
                    <Badge variant={RESULTADO_BADGE[v.resultado_analise] ?? 'secondary'}>
                      {RESULTADO_EMOJI[v.resultado_analise] ?? ''} {RESULTADO_LABEL[v.resultado_analise] ?? v.resultado_analise}
                    </Badge>
                  ) : v.status_processamento === 'erro' ? (
                    <Badge variant="error">Erro</Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_BADGE[v.status_atual] ?? 'secondary'}>{STATUS_LABEL[v.status_atual] ?? v.status_atual}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{v.responsavel ?? '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtData(v.atualizado_em)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/hub/validacao-receita/${v.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'xs' }))}>
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
