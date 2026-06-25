import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RelatoriosWhatsappClient } from '@/components/whatsapp/relatorios-client'

export default async function RelatoriosWhatsappPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  // Apenas admin e gestor podem ver relatórios
  if (!['admin', 'gestor'].includes(perfil.cargo)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-400">Acesso restrito a administradores e gestores.</p>
      </div>
    )
  }

  // Métricas dos últimos 30 dias
  const { data: metricas } = await supabase.rpc('metricas_atendimento_whatsapp', {
    p_org_id: perfil.organization_id,
  })

  // Totais gerais
  const { count: totalConversas } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', perfil.organization_id)

  const { count: conversasAbertas } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', perfil.organization_id)
    .in('status', ['nao_atendida', 'em_atendimento', 'aguardando_cliente'])

  const { count: semResposta } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', perfil.organization_id)
    .eq('status', 'nao_atendida')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Relatórios WhatsApp</h1>
        <p className="text-xs text-slate-500">Métricas dos últimos 30 dias</p>
      </div>

      <RelatoriosWhatsappClient
        metricas={(metricas ?? []) as {
          vendedor_id: string
          vendedor_nome: string
          total_conversas: number
          conversas_finalizadas: number
          conversas_sem_resposta: number
          tempo_medio_primeira_resposta_min: number | null
          total_mensagens_enviadas: number
        }[]}
        totalConversas={totalConversas ?? 0}
        conversasAbertas={conversasAbertas ?? 0}
        semResposta={semResposta ?? 0}
      />
    </div>
  )
}
