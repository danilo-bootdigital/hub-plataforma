'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { criarContato } from '@/app/(dashboard)/contatos/actions'
import { Plus } from 'lucide-react'

export function ModalNovoContato() {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    try {
      await criarContato(formData)
      setAberto(false)
    } catch (e: unknown) {
      if (e instanceof Error && (e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
      setErro(e instanceof Error ? e.message : 'Erro ao criar contato.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" />Novo Contato</Button>} />
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Contato</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input id="nome" name="nome" placeholder="João Silva" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input id="cpf_cnpj" name="cpf_cnpj" placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="joao@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" name="cargo" placeholder="Ex: Diretor" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="empresa_nome">Empresa</Label>
            <Input id="empresa_nome" name="empresa_nome" placeholder="Nome da empresa" />
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Endereço</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="endereco">Rua / Logradouro</Label>
                <Input id="endereco" name="endereco" placeholder="Rua das Flores" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco_numero">Número</Label>
                <Input id="endereco_numero" name="endereco_numero" placeholder="123" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="endereco_complemento">Complemento</Label>
                <Input id="endereco_complemento" name="endereco_complemento" placeholder="Apto 4B" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco_bairro">Bairro</Label>
                <Input id="endereco_bairro" name="endereco_bairro" placeholder="Centro" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="endereco_cep">CEP</Label>
                <Input id="endereco_cep" name="endereco_cep" placeholder="00000-000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco_cidade">Cidade</Label>
                <Input id="endereco_cidade" name="endereco_cidade" placeholder="São Paulo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco_estado">Estado</Label>
                <Input id="endereco_estado" name="endereco_estado" placeholder="SP" maxLength={2} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Input id="observacoes" name="observacoes" placeholder="Informações adicionais..." />
          </div>

          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Contato'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
