'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { editarContato } from '@/app/(dashboard)/contatos/actions'
import type { Contact, Company } from '@/types/database'

type ContatoCompleto = Contact & {
  empresa: Pick<Company, 'id' | 'nome'> | null
}

interface FormularioEditarContatoProps {
  contato: ContatoCompleto
}

export function FormularioEditarContato({ contato }: FormularioEditarContatoProps) {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    try {
      await editarContato(contato.id, formData)
      router.push(`/contatos/${contato.id}`)
    } catch (e: unknown) {
      if (e instanceof Error && (e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
      setErro(e instanceof Error ? e.message : 'Erro ao editar contato.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Dados Principais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados Principais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input id="nome" name="nome" defaultValue={contato.nome} placeholder="João Silva" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input id="cpf_cnpj" name="cpf_cnpj" defaultValue={contato.cpf_cnpj ?? ''} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" defaultValue={contato.telefone ?? ''} placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={contato.email ?? ''} placeholder="joao@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" name="cargo" defaultValue={contato.cargo ?? ''} placeholder="Ex: Diretor" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="empresa_nome">Empresa</Label>
            <Input id="empresa_nome" name="empresa_nome" defaultValue={contato.empresa?.nome ?? ''} placeholder="Nome da empresa" />
          </div>
        </CardContent>
      </Card>

      {/* Dados Profissionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados Profissionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tipo_pessoa">Tipo de Pessoa</Label>
              <select
                id="tipo_pessoa"
                name="tipo_pessoa"
                defaultValue={contato.tipo_pessoa ?? ''}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecione...</option>
                <option value="PF">Pessoa Física (PF)</option>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria_cliente">Categoria</Label>
              <select
                id="categoria_cliente"
                name="categoria_cliente"
                defaultValue={contato.categoria_cliente ?? ''}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecione...</option>
                <option value="Médico">Médico</option>
                <option value="Dentista">Dentista</option>
                <option value="Biomédico">Biomédico</option>
                <option value="Nutricionista">Nutricionista</option>
                <option value="Farmacêutico">Farmacêutico</option>
                <option value="Fisioterapeuta">Fisioterapeuta</option>
                <option value="Enfermeiro">Enfermeiro</option>
                <option value="Veterinário">Veterinário</option>
                <option value="Clínica">Clínica</option>
                <option value="Hospital">Hospital</option>
                <option value="Distribuidor">Distribuidor</option>
                <option value="Laboratório">Laboratório</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="especialidade">Especialidade</Label>
              <Input id="especialidade" name="especialidade" defaultValue={contato.especialidade ?? ''} placeholder="Ex: Cardiologia" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo_conselho">Tipo de Conselho</Label>
              <select
                id="tipo_conselho"
                name="tipo_conselho"
                defaultValue={contato.tipo_conselho ?? ''}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecione...</option>
                <option value="CRM">CRM</option>
                <option value="CRO">CRO</option>
                <option value="CRBM">CRBM</option>
                <option value="CRN">CRN</option>
                <option value="CRF">CRF</option>
                <option value="CREFITO">CREFITO</option>
                <option value="CRESS">CRESS</option>
                <option value="COREN">COREN</option>
                <option value="CRMV">CRMV</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="numero_conselho">Número do Conselho</Label>
              <Input id="numero_conselho" name="numero_conselho" defaultValue={contato.numero_conselho ?? ''} placeholder="123456" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf_conselho">UF do Conselho</Label>
              <Input id="uf_conselho" name="uf_conselho" defaultValue={contato.uf_conselho ?? ''} placeholder="SP" maxLength={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="endereco">Rua / Logradouro</Label>
              <Input id="endereco" name="endereco" defaultValue={contato.endereco ?? ''} placeholder="Rua das Flores" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco_numero">Número</Label>
              <Input id="endereco_numero" name="endereco_numero" defaultValue={contato.endereco_numero ?? ''} placeholder="123" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="endereco_complemento">Complemento</Label>
              <Input id="endereco_complemento" name="endereco_complemento" defaultValue={contato.endereco_complemento ?? ''} placeholder="Apto 4B" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco_bairro">Bairro</Label>
              <Input id="endereco_bairro" name="endereco_bairro" defaultValue={contato.endereco_bairro ?? ''} placeholder="Centro" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="endereco_cep">CEP</Label>
              <Input id="endereco_cep" name="endereco_cep" defaultValue={contato.endereco_cep ?? ''} placeholder="00000-000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco_cidade">Cidade</Label>
              <Input id="endereco_cidade" name="endereco_cidade" defaultValue={contato.endereco_cidade ?? ''} placeholder="São Paulo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco_estado">Estado</Label>
              <Input id="endereco_estado" name="endereco_estado" defaultValue={contato.endereco_estado ?? ''} placeholder="SP" maxLength={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              name="observacoes"
              defaultValue={contato.observacoes ?? ''}
              placeholder="Informações adicionais..."
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      {erro && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      )}

      <div className="flex justify-end gap-3">
        <Link href={`/contatos/${contato.id}`}>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
        <Button type="submit" disabled={carregando}>
          {carregando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {carregando ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
