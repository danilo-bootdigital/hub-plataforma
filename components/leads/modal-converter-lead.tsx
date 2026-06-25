'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { converterLeadEmContato } from '@/app/(dashboard)/leads/actions'
import { UserCheck } from 'lucide-react'
import type { Lead } from '@/types/database'

type Props = {
  lead: Pick<Lead, 'id' | 'nome' | 'email' | 'telefone' | 'empresa'>
}

export function ModalConverterLead({ lead }: Props) {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    try {
      await converterLeadEmContato(lead.id, formData)
    } catch (e: unknown) {
      if (e instanceof Error && (e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e
      setErro(e instanceof Error ? e.message : 'Erro ao converter lead.')
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={
        <Button variant="outline">
          <UserCheck className="mr-2 h-4 w-4" />
          Converter em Contato
        </Button>
      } />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Converter em Contato</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input id="nome" name="nome" defaultValue={lead.nome ?? ''} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" defaultValue={lead.telefone ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={lead.email ?? ''} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input id="cargo" name="cargo" placeholder="Ex: Diretor Comercial" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="empresa_nome">Empresa</Label>
            <Input id="empresa_nome" name="empresa_nome" defaultValue={lead.empresa ?? ''} placeholder="Nome da empresa" />
          </div>
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Convertendo...' : 'Converter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
