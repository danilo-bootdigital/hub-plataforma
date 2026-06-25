import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TimelineAtividades } from '@/components/shared/timeline-atividades'
import { FormObservacaoContato } from '@/components/contatos/form-observacao-contato'
import { AcoesContato } from '@/components/contatos/acoes-contato'
import { ModalChamarWhatsapp } from '@/components/whatsapp/modal-chamar-whatsapp'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Edit, User, Briefcase, MapPin, Clock } from 'lucide-react'
import type { Contact, Company, Profile } from '@/types/database'

type ContatoCompleto = Contact & {
  empresa: Pick<Company, 'id' | 'nome'> | null
  responsavel: Pick<Profile, 'id' | 'nome'> | null
}

function CampoExibicao({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{rotulo}</p>
      <p className="font-medium">{valor || <span className="text-slate-400 italic">Não informado</span>}</p>
    </div>
  )
}

function BlocoDados({ titulo, icone: Icon, children }: { titulo: string; icone: React.ElementType; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-slate-500" />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {children}
      </CardContent>
    </Card>
  )
}

export default async function ContatoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: contato } = await supabase
    .from('contacts')
    .select('*, empresa:companies!empresa_id(id, nome), responsavel:profiles!responsavel_id(id, nome)')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single() as { data: ContatoCompleto | null }

  if (!contato) notFound()

  // Buscar instâncias WhatsApp autorizadas
  let instQuery = supabase
    .from('whatsapp_instances')
    .select('id, nome, numero, status_conexao')
    .eq('organization_id', perfil.organization_id)
    .eq('status_conexao', 'conectado')

  if (perfil.cargo === 'vendedor' || perfil.cargo === 'atendimento') {
    instQuery = instQuery.or(`vendedor_id.eq.${perfil.id},compartilhado.eq.true`)
  }

  const { data: instanciasRaw } = await instQuery
  const instancias = (instanciasRaw ?? []) as { id: string; nome: string; numero: string | null; status_conexao: string }[]

  const naoInformado = <span className="text-slate-400 italic">Não informado</span>

  // RBAC: verificar se usuário pode editar
  const podeEditar = perfil.cargo === 'admin' || perfil.cargo === 'gestor' || contato.responsavel_id === perfil.id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/contatos">
            <Button variant="ghost" size="sm" className="gap-1 pl-0 text-slate-600">
              <ChevronLeft className="h-4 w-4" />
              Contatos
            </Button>
          </Link>
        </div>
        {podeEditar && (
          <Link href={`/contatos/${id}/editar`}>
            <Button variant="outline" size="sm" className="gap-1">
              <Edit className="h-4 w-4" />
              Editar contato
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          {/* Card Principal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{contato.nome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <CampoExibicao rotulo="Telefone" valor={contato.telefone} />
              <CampoExibicao rotulo="E-mail" valor={contato.email} />
              <CampoExibicao rotulo="CPF/CNPJ" valor={contato.cpf_cnpj} />
              <CampoExibicao rotulo="Empresa" valor={contato.empresa?.nome} />
              <hr className="my-3" />
              {contato.telefone && (
                <div className="mb-3">
                  <ModalChamarWhatsapp
                    nome={contato.nome}
                    telefone={contato.telefone}
                    contatoId={contato.id}
                    instancias={instancias}
                  />
                </div>
              )}
              <AcoesContato contatoId={contato.id} contatoNome={contato.nome} />
            </CardContent>
          </Card>

          {/* Card Sistema */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-slate-500" />
                Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Responsável</p>
                <p className="font-medium">{contato.responsavel?.nome ?? naoInformado}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Criado em</p>
                <p className="font-medium">{format(new Date(contato.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Atualizado em</p>
                <p className="font-medium">{contato.atualizado_em ? format(new Date(contato.atualizado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : naoInformado}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Dados Profissionais */}
          <BlocoDados titulo="Dados Profissionais" icone={Briefcase}>
            <CampoExibicao rotulo="Cargo" valor={contato.cargo} />
            <CampoExibicao rotulo="Tipo de Pessoa" valor={contato.tipo_pessoa} />
            <CampoExibicao rotulo="Categoria" valor={contato.categoria_cliente} />
            <CampoExibicao rotulo="Especialidade" valor={contato.especialidade} />
            <CampoExibicao rotulo="Conselho" valor={contato.tipo_conselho} />
            <CampoExibicao rotulo="Nº Conselho" valor={contato.numero_conselho} />
            <CampoExibicao rotulo="UF Conselho" valor={contato.uf_conselho} />
          </BlocoDados>

          {/* Endereço */}
          <BlocoDados titulo="Endereço" icone={MapPin}>
            <div className="col-span-2">
              <CampoExibicao rotulo="Rua / Logradouro" valor={contato.endereco} />
            </div>
            <CampoExibicao rotulo="Número" valor={contato.endereco_numero} />
            <CampoExibicao rotulo="Complemento" valor={contato.endereco_complemento} />
            <CampoExibicao rotulo="Bairro" valor={contato.endereco_bairro} />
            <CampoExibicao rotulo="CEP" valor={contato.endereco_cep} />
            <CampoExibicao rotulo="Cidade" valor={contato.endereco_cidade} />
            <CampoExibicao rotulo="UF" valor={contato.endereco_estado} />
          </BlocoDados>

          {/* Observações */}
          {contato.observacoes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-slate-500" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{contato.observacoes}</p>
              </CardContent>
            </Card>
          )}

          {/* Adicionar observação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar observação</CardTitle>
            </CardHeader>
            <CardContent>
              <FormObservacaoContato contatoId={contato.id} />
            </CardContent>
          </Card>

          {/* Histórico de atividades */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineAtividades contatoId={contato.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
