import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BadgeOrigem } from '@/components/leads/badge-origem'
import { BadgeStatusLead } from '@/components/leads/badge-status-lead'
import { ModalConverterLead } from '@/components/leads/modal-converter-lead'
import { BotaoDescartarLead } from '@/components/leads/botao-descartar-lead'
import { FormObservacao } from '@/components/leads/form-observacao'
import { TimelineAtividades } from '@/components/shared/timeline-atividades'
import { ListaTarefas } from '@/components/tarefas/lista-tarefas'
import { ModalChamarWhatsapp } from '@/components/whatsapp/modal-chamar-whatsapp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import type { Lead, Profile } from '@/types/database'

type LeadComResponsavel = Lead & { responsavel: Pick<Profile, 'id' | 'nome'> | null }

export default async function LeadDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfilAtual) redirect('/login')

  const { data: lead } = await supabase
    .from('leads')
    .select('*, responsavel:profiles!responsavel_id(id, nome)')
    .eq('id', id)
    .eq('organization_id', perfilAtual.organization_id)
    .single() as { data: LeadComResponsavel | null }

  if (!lead) notFound()

  // Buscar contato correspondente para exibir CPF/CNPJ e endereço
  let contatoVinculado: { cpf_cnpj: string | null; endereco: string | null } | null = null
  if (lead.telefone) {
    const { data: c } = await supabase
      .from('contacts')
      .select('cpf_cnpj, endereco')
      .eq('organization_id', perfilAtual.organization_id)
      .eq('telefone', lead.telefone)
      .limit(1)
      .single()
    if (c) contatoVinculado = c
  }
  if (!contatoVinculado && lead.nome) {
    const { data: c } = await supabase
      .from('contacts')
      .select('cpf_cnpj, endereco')
      .eq('organization_id', perfilAtual.organization_id)
      .eq('nome', lead.nome)
      .limit(1)
      .single()
    if (c) contatoVinculado = c
  }

  // Dados consolidados: prioriza lead, fallback para contato
  const cpfCnpj = lead.observacoes || contatoVinculado?.cpf_cnpj || null
  const enderecoLead = lead.endereco || contatoVinculado?.endereco || null

  let tarefasQuery = supabase
    .from('tasks')
    .select(`
      id, titulo, descricao, tipo, data_vencimento, concluida,
      lead_id, contato_id, deal_id, responsavel_id,
      responsavel:profiles!responsavel_id(id, nome)
    `)
    .eq('lead_id', id)
    .eq('organization_id', lead.organization_id)
    .order('concluida', { ascending: true })
    .order('data_vencimento', { ascending: true, nullsFirst: false })

  if (perfilAtual.cargo === 'vendedor' || perfilAtual.cargo === 'atendimento') {
    tarefasQuery = tarefasQuery.eq('responsavel_id', perfilAtual.id)
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
  if (perfilAtual.cargo === 'admin' || perfilAtual.cargo === 'gestor') {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('organization_id', lead.organization_id)
      .eq('ativo', true)
      .in('cargo', ['vendedor', 'atendimento', 'gestor', 'admin'])
      .order('nome')
    vendedores = data ?? []
  }

  const podeConverter = lead.status !== 'qualificado' && lead.status !== 'descartado'

  // Buscar instâncias WhatsApp autorizadas
  let instQuery = supabase
    .from('whatsapp_instances')
    .select('id, nome, numero, status_conexao')
    .eq('organization_id', perfilAtual.organization_id)
    .eq('status_conexao', 'conectado')

  if (perfilAtual.cargo === 'vendedor' || perfilAtual.cargo === 'atendimento') {
    instQuery = instQuery.or(`vendedor_id.eq.${perfilAtual.id},compartilhado.eq.true`)
  }

  const { data: instanciasRaw } = await instQuery
  const instancias = (instanciasRaw ?? []) as { id: string; nome: string; numero: string | null; status_conexao: string }[]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/leads">
          <Button variant="ghost" size="sm" className="gap-1 pl-0 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
            Leads
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {lead.nome ?? <span className="italic text-slate-400">Sem nome</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2">
                <BadgeOrigem origem={lead.origem} />
                <BadgeStatusLead status={lead.status} />
              </div>
              {lead.telefone && (
                <div>
                  <p className="text-xs text-slate-500">Telefone</p>
                  <p className="font-medium">{lead.telefone}</p>
                </div>
              )}
              {lead.email && (
                <div>
                  <p className="text-xs text-slate-500">E-mail</p>
                  <p className="font-medium">{lead.email}</p>
                </div>
              )}
              {cpfCnpj && (
                <div>
                  <p className="text-xs text-slate-500">CPF/CNPJ</p>
                  <p className="font-medium">{cpfCnpj}</p>
                </div>
              )}
              {lead.empresa && (
                <div>
                  <p className="text-xs text-slate-500">Empresa</p>
                  <p className="font-medium">{lead.empresa}</p>
                </div>
              )}
              {enderecoLead && (
                <div>
                  <p className="text-xs text-slate-500">Endereço</p>
                  <p className="font-medium">{enderecoLead}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Responsável</p>
                <p className="font-medium">{lead.responsavel?.nome ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cadastrado em</p>
                <p className="font-medium">{format(new Date(lead.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {lead.telefone && (
              <ModalChamarWhatsapp
                nome={lead.nome ?? 'Sem nome'}
                telefone={lead.telefone}
                leadId={lead.id}
                instancias={instancias}
              />
            )}
            {podeConverter && <ModalConverterLead lead={lead} />}
            {lead.status !== 'descartado' && (
              <BotaoDescartarLead leadId={lead.id} />
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar observação</CardTitle>
            </CardHeader>
            <CardContent>
              <FormObservacao leadId={lead.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <ListaTarefas
                tarefas={tarefas}
                cargo={perfilAtual.cargo as import('@/types/database').UserRole}
                vendedores={vendedores}
                perfilId={perfilAtual.id}
                leadId={id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineAtividades leadId={lead.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
