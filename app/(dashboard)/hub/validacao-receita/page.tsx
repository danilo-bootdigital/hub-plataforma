import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CabecalhoPagina, CartaoTabela, tabela } from '@/components/layout/listagem'
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
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Validação de Receita"
        descricao="Conferência documental da receita com pré-análise por IA e decisão humana."
        acao={
          <Link href="/hub/validacao-receita/nova">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nova Validação
            </Button>
          </Link>
        }
      />

      <CartaoTabela>
        <table className={tabela.root}>
          <thead>
            <tr className={tabela.theadTr}>
              <th className={tabela.th}>Data</th>
              <th className={tabela.th}>Paciente</th>
              <th className={tabela.th}>Produto</th>
              <th className={tabela.th}>Resultado</th>
              <th className={tabela.th}>Status</th>
              <th className={tabela.th}>Responsável</th>
              <th className={tabela.th}>Última atualização</th>
              <th className={`${tabela.th} text-right`}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {validacoes.length === 0 && (
              <tr>
                <td colSpan={8} className={tabela.vazio}>
                  Nenhuma validação ainda. Clique em <span className="font-medium text-slate-600">Nova Validação</span> para começar.
                </td>
              </tr>
            )}
            {validacoes.map((v) => (
              <tr key={v.id} className={tabela.tr}>
                <td className={`${tabela.td} whitespace-nowrap text-slate-600`}>{fmtData(v.criado_em)}</td>
                <td className={`${tabela.td} font-medium text-slate-900`}>{v.paciente ?? '—'}</td>
                <td className={`${tabela.td} text-slate-600`}>{v.produto ?? '—'}</td>
                <td className={tabela.td}>
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
                <td className={tabela.td}>
                  <Badge variant={STATUS_BADGE[v.status_atual] ?? 'secondary'}>{STATUS_LABEL[v.status_atual] ?? v.status_atual}</Badge>
                </td>
                <td className={`${tabela.td} text-slate-600`}>{v.responsavel ?? '—'}</td>
                <td className={`${tabela.td} whitespace-nowrap text-slate-500`}>{fmtData(v.atualizado_em)}</td>
                <td className={`${tabela.td} text-right`}>
                  <Link href={`/hub/validacao-receita/${v.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'xs' }))}>
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CartaoTabela>
    </div>
  )
}
