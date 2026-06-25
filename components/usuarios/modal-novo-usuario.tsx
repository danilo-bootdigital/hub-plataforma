'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarUsuario } from '@/app/(dashboard)/configuracoes/usuarios/actions'
import { Plus } from 'lucide-react'

const perfis = [
  { valor: 'admin', label: 'Administrador' },
  { valor: 'gestor', label: 'Gestor Comercial' },
  { valor: 'vendedor', label: 'Vendedor' },
  { valor: 'atendimento', label: 'Atendimento' },
  { valor: 'financeiro', label: 'Financeiro' },
  { valor: 'suporte', label: 'Suporte' },
]

export function ModalNovoUsuario() {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [cargoSelecionado, setCargoSelecionado] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    if (!cargoSelecionado) {
      setErro('Selecione o perfil de acesso.')
      return
    }
    formData.set('cargo', cargoSelecionado)
    setCarregando(true)
    setErro(null)
    try {
      await criarUsuario(formData)
      setAberto(false)
      setCargoSelecionado(null)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar usuário.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" />Novo Usuário</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" name="nome" placeholder="João Silva" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" placeholder="joao@bootdigital.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-2">
            <Label>Perfil de acesso</Label>
            <Select value={cargoSelecionado} onValueChange={setCargoSelecionado}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                {perfis.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha inicial</Label>
            <Input id="senha" name="senha" type="password" placeholder="Mínimo 8 caracteres" required minLength={8} />
          </div>
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
