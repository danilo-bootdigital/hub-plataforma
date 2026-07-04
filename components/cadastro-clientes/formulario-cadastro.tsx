'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, Send, Loader2, User, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BarraProgresso } from './barra-progresso'
import { AreaDocumentos } from './area-documentos'
import { criarCadastro, salvarCadastro, enviarParaIndustria } from '@/app/(dashboard)/hub/cadastro-clientes/actions'
import { documentosObrigatorios, type DetalheCadastro } from '@/lib/cadastro-clientes/documentos'
import type { TipoPessoaOnboarding } from '@/types/database'

type FormState = {
  nome_completo: string
  razao_social: string
  nome_fantasia: string
  registro_conselho: string
  cpf: string
  cnpj: string
  data_nascimento: string
  email: string
  endereco_completo: string
  cep: string
  telefones: string[]
}

const VAZIO: FormState = {
  nome_completo: '', razao_social: '', nome_fantasia: '', registro_conselho: '',
  cpf: '', cnpj: '', data_nascimento: '', email: '', endereco_completo: '', cep: '',
  telefones: [''],
}

function fromDetalhe(d: DetalheCadastro): FormState {
  const c = d.cadastro
  return {
    nome_completo: c.nome_completo ?? '', razao_social: c.razao_social ?? '',
    nome_fantasia: c.nome_fantasia ?? '', registro_conselho: c.registro_conselho ?? '',
    cpf: c.cpf ?? '', cnpj: c.cnpj ?? '', data_nascimento: c.data_nascimento ?? '',
    email: c.email ?? '', endereco_completo: c.endereco_completo ?? '', cep: c.cep ?? '',
    telefones: (c.telefones && c.telefones.length ? c.telefones : ['']),
  }
}

// Campos obrigatórios para ENVIAR (espelha a RPC hub_onboarding_enviar).
function obrigatoriosPreenchidos(tipo: TipoPessoaOnboarding, f: FormState): boolean {
  const base = !!f.email.trim() && !!f.cep.trim() && !!f.registro_conselho.trim()
    && f.telefones.some((t) => t.trim())
  if (tipo === 'fisica') return base && !!f.nome_completo.trim() && !!f.cpf.trim()
  return base && !!f.razao_social.trim() && !!f.nome_fantasia.trim() && !!f.cnpj.trim() && !!f.cpf.trim()
}

export function FormularioCadastro({ detalhe }: { detalhe?: DetalheCadastro }) {
  const router = useRouter()
  const editando = !!detalhe
  const [tipo, setTipo] = useState<TipoPessoaOnboarding>(detalhe?.cadastro.tipo_pessoa ?? 'fisica')
  const [form, setForm] = useState<FormState>(detalhe ? fromDetalhe(detalhe) : VAZIO)
  const [salvando, startSalvar] = useTransition()
  const [enviando, startEnviar] = useTransition()

  const id = detalhe?.cadastro.id
  const arquivos = detalhe?.arquivos ?? []
  const docsReq = documentosObrigatorios(tipo)
  const docsEnviados = docsReq.filter((d) => arquivos.some((a) => a.tipo_documento === d.tipo)).length

  const camposOk = obrigatoriosPreenchidos(tipo, form)
  const docsOk = editando && docsEnviados === docsReq.length
  const podeEnviar = camposOk && docsOk

  const percentual = useMemo(() => {
    // metade campos, metade documentos
    const campos = camposOk ? 50 : Math.round((pesoCampos(tipo, form) / totalCampos(tipo)) * 50)
    const docs = editando ? Math.round((docsEnviados / docsReq.length) * 50) : 0
    return campos + docs
  }, [tipo, form, camposOk, editando, docsEnviados, docsReq.length])

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function payload() {
    return {
      nome_completo: form.nome_completo, razao_social: form.razao_social,
      nome_fantasia: form.nome_fantasia, registro_conselho: form.registro_conselho,
      cpf: form.cpf, cnpj: form.cnpj, data_nascimento: form.data_nascimento,
      email: form.email, endereco_completo: form.endereco_completo, cep: form.cep,
      telefones: form.telefones.map((t) => t.trim()).filter(Boolean),
    }
  }

  function salvar() {
    startSalvar(async () => {
      try {
        if (editando && id) {
          await salvarCadastro(id, payload())
          toast.success('Rascunho salvo.')
          router.refresh()
        } else {
          const novoId = await criarCadastro(tipo, payload())
          toast.success('Rascunho criado. Anexe os documentos para enviar.')
          router.push(`/hub/cadastro-clientes/${novoId}`)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao salvar.')
      }
    })
  }

  function enviar() {
    if (!id) return
    startEnviar(async () => {
      try {
        await enviarParaIndustria(id)
        toast.success('Cadastro enviado para a Indústria.')
        router.push(`/hub/cadastro-clientes/${id}`)
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao enviar.')
      }
    })
  }

  const camposPF = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Nome completo" obrigatorio className="sm:col-span-2">
        <Input value={form.nome_completo} onChange={(e) => set('nome_completo', e.target.value)} />
      </Campo>
      <Campo label="Número do Registro (Conselho)" obrigatorio>
        <Input value={form.registro_conselho} onChange={(e) => set('registro_conselho', e.target.value)} placeholder="Ex.: CRM 123456/SP" />
      </Campo>
      <Campo label="CPF" obrigatorio>
        <Input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} />
      </Campo>
      <Campo label="Data de nascimento">
        <Input type="date" value={form.data_nascimento} onChange={(e) => set('data_nascimento', e.target.value)} />
      </Campo>
      <Campo label="E-mail" obrigatorio>
        <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
      </Campo>
    </div>
  )

  const camposPJ = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Razão Social" obrigatorio>
        <Input value={form.razao_social} onChange={(e) => set('razao_social', e.target.value)} />
      </Campo>
      <Campo label="Nome Fantasia" obrigatorio>
        <Input value={form.nome_fantasia} onChange={(e) => set('nome_fantasia', e.target.value)} />
      </Campo>
      <Campo label="CNPJ" obrigatorio>
        <Input value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
      </Campo>
      <Campo label="Número do Registro (Conselho)" obrigatorio>
        <Input value={form.registro_conselho} onChange={(e) => set('registro_conselho', e.target.value)} placeholder="Ex.: CRM 123456/SP" />
      </Campo>
      <Campo label="Nome completo do responsável" obrigatorio className="sm:col-span-2">
        <Input value={form.nome_completo} onChange={(e) => set('nome_completo', e.target.value)} />
      </Campo>
      <Campo label="CPF do responsável" obrigatorio>
        <Input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} />
      </Campo>
      <Campo label="Data de nascimento do responsável">
        <Input type="date" value={form.data_nascimento} onChange={(e) => set('data_nascimento', e.target.value)} />
      </Campo>
      <Campo label="E-mail" obrigatorio>
        <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
      </Campo>
    </div>
  )

  const endereco = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Campo label="Endereço completo" className="sm:col-span-2">
        <Input value={form.endereco_completo} onChange={(e) => set('endereco_completo', e.target.value)} />
      </Campo>
      <Campo label="CEP" obrigatorio>
        <Input value={form.cep} onChange={(e) => set('cep', e.target.value)} />
      </Campo>
    </div>
  )

  const telefones = (
    <Campo label="Telefones" obrigatorio>
      <div className="space-y-2">
        {form.telefones.map((tel, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={tel}
              onChange={(e) => { const t = [...form.telefones]; t[i] = e.target.value; set('telefones', t) }}
              placeholder="(11) 99999-9999"
            />
            {form.telefones.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => set('telefones', form.telefones.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-rose-600" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => set('telefones', [...form.telefones, ''])}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar telefone
        </Button>
      </div>
    </Campo>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <BarraProgresso percentual={percentual} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {editando ? (
            <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              {tipo === 'fisica' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              {tipo === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
            </div>
          ) : (
            <Tabs value={tipo} onValueChange={(v) => setTipo(v as TipoPessoaOnboarding)}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="fisica"><User className="mr-1.5 h-4 w-4" /> Pessoa Física</TabsTrigger>
                <TabsTrigger value="juridica"><Building2 className="mr-1.5 h-4 w-4" /> Pessoa Jurídica</TabsTrigger>
              </TabsList>
              <TabsContent value="fisica" className="pt-4">{camposPF}</TabsContent>
              <TabsContent value="juridica" className="pt-4">{camposPJ}</TabsContent>
            </Tabs>
          )}
          {editando && (tipo === 'fisica' ? camposPF : camposPJ)}
          {endereco}
          {telefones}
        </CardContent>
      </Card>

      {editando && id && (
        <Card>
          <CardHeader>
            <CardTitle>Documentação cadastral</CardTitle>
            <p className="text-sm text-slate-500">Todos os documentos são obrigatórios para o envio. {docsEnviados}/{docsReq.length} enviados.</p>
          </CardHeader>
          <CardContent>
            <AreaDocumentos
              onboardingId={id}
              documentos={docsReq}
              arquivos={arquivos}
              editavel
              onMudou={() => router.refresh()}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Salvar Rascunho
        </Button>
        {editando && (
          <Button onClick={enviar} disabled={!podeEnviar || enviando} title={podeEnviar ? '' : 'Preencha os campos obrigatórios e anexe todos os documentos.'}>
            {enviando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            Enviar para Indústria
          </Button>
        )}
      </div>
      {editando && !podeEnviar && (
        <p className="text-right text-xs text-slate-500">
          {!camposOk ? 'Preencha todos os campos obrigatórios. ' : ''}
          {!docsOk ? 'Anexe todos os documentos obrigatórios.' : ''}
        </p>
      )}
    </div>
  )
}

function Campo({ label, obrigatorio, className, children }: { label: string; obrigatorio?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm">
        {label} {obrigatorio && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  )
}

// helpers de progresso — quantos dos campos obrigatórios já estão preenchidos.
function camposObrigatorios(tipo: TipoPessoaOnboarding, f: FormState): boolean[] {
  const temTelefone = f.telefones.some((t) => t.trim())
  if (tipo === 'fisica') {
    return [!!f.nome_completo.trim(), !!f.cpf.trim(), !!f.email.trim(), !!f.cep.trim(), !!f.registro_conselho.trim(), temTelefone]
  }
  return [!!f.razao_social.trim(), !!f.nome_fantasia.trim(), !!f.cnpj.trim(), !!f.cpf.trim(), !!f.email.trim(), !!f.cep.trim(), !!f.registro_conselho.trim(), temTelefone]
}
function totalCampos(tipo: TipoPessoaOnboarding): number {
  return camposObrigatorios(tipo, VAZIO).length
}
function pesoCampos(tipo: TipoPessoaOnboarding, f: FormState): number {
  return camposObrigatorios(tipo, f).filter(Boolean).length
}
