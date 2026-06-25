import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListaTarefas } from '@/components/tarefas/lista-tarefas'
import type { UserRole } from '@/types/database'

export default async function TarefasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  let tarefasQuery = supabase
    .from('tasks')
    .select(`
      id,
      titulo,
      descricao,
      tipo,
      data_vencimento,
      concluida,
      lead_id,
      contato_id,
      deal_id,
      responsavel_id,
      responsavel:profiles!responsavel_id(id, nome)
    `)
    .eq('organization_id', perfil.organization_id)
    .order('concluida', { ascending: true })
    .order('data_vencimento', { ascending: true, nullsFirst: false })

  if (perfil.cargo === 'vendedor' || perfil.cargo === 'atendimento') {
    tarefasQuery = tarefasQuery.eq('responsavel_id', perfil.id)
  }

  const { data: tarefasRaw } = await tarefasQuery

  const tarefas = (tarefasRaw ?? []).map((t) => ({
    id: t.id as string,
    titulo: t.titulo as string,
    descricao: t.descricao as string | null,
    tipo: t.tipo as 'ligacao' | 'email' | 'reuniao' | 'whatsapp',
    data_vencimento: t.data_vencimento as string | null,
    concluida: t.concluida as boolean,
    lead_id: t.lead_id as string | null,
    contato_id: t.contato_id as string | null,
    deal_id: t.deal_id as string | null,
    responsavel: (Array.isArray(t.responsavel) ? t.responsavel[0] : t.responsavel) as { id: string; nome: string } | null,
  }))

  let vendedores: { id: string; nome: string }[] = []
  if (perfil.cargo === 'admin' || perfil.cargo === 'gestor') {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('organization_id', perfil.organization_id)
      .eq('ativo', true)
      .in('cargo', ['vendedor', 'atendimento', 'gestor', 'admin'])
      .order('nome')
    vendedores = data ?? []
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tarefas</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Gerencie suas tarefas e follow-ups.
        </p>
      </div>

      <ListaTarefas
        tarefas={tarefas}
        cargo={perfil.cargo as UserRole}
        vendedores={vendedores}
        perfilId={perfil.id}
      />
    </div>
  )
}
