'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarLead } from '@/app/(dashboard)/leads/actions'
import { Plus } from 'lucide-react'
import type { Profile, LeadOrigem } from '@/types/database'

const ORIGENS: { valor: LeadOrigem; label: string }[] = [
  { valor: 'manual', label: 'Manual' },
  { valor: 'indicacao', label: 'Indicação' },
  { valor: 'evento', label: 'Evento' },
  { valor: 'site', label: 'Site' },
  { valor: 'whatsapp', label: 'WhatsApp' },
  { valor: 'instagram_lead_ad', label: 'Instagram Lead Ad' },
  { valor: 'facebook_lead_ad', label: 'Facebook Lead Ad' },
]

type Props = {
  responsaveis: Pick<Profile, 'id' | 'nome'>[]
}

export function ModalNovoLead({ responsaveis }: Props) {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [origemSelecionada, setOrigemSelecionada] = useState<LeadOrigem>('manual')
  const [responsavelSelecionado, setResponsavelSelecionado] = useState('')

  async function handleSubmit(formData: FormData) {
    formData.set('origem', origemSelecionada)
    if (responsavelSelecionado) formData.set('responsavel_id', responsavelSelecionado)
    setCarregando(true)
    setErro(null)
    try {
      await criarLead(formData)
      setAberto(false)
    } catch (e: unknown) {
      if (e instanceof Error && (e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
      setErro(e instanceof Error ? e.message : 'Erro ao criar lead.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" />Novo Lead</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Lead</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" placeholder="João Silva" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="joao@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Input id="empresa" name="empresa" placeholder="Nome da empresa" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input id="cpf_cnpj" name="cpf_cnpj" placeholder="000.000.000-00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" name="endereco" placeholder="Rua, número, bairro, cidade" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={origemSelecionada} onValueChange={(v: string | null) => setOrigemSelecionada((v ?? 'manual') as LeadOrigem)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENS.map((o) => (
                    <SelectItem key={o.valor} value={o.valor}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={responsavelSelecionado} onValueChange={(v: string | null) => setResponsavelSelecionado(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem responsável</SelectItem>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
