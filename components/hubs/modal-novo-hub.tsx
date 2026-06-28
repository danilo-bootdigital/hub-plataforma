'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { criarHub } from '@/app/(dashboard)/configuracoes/hubs/actions'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ModalNovoHub() {
  const [aberto, setAberto] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [obs, setObs] = useState('')
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    // Validação amigável no cliente (a action revalida no servidor).
    const nome = (formData.get('nome') as string)?.trim()
    const nomeRepresentante = (formData.get('nome_representante') as string)?.trim()
    const email = (formData.get('email') as string)?.trim()
    const telefone = (formData.get('telefone') as string)?.trim()
    const cnpj = (formData.get('cnpj') as string)?.trim()

    if (!nome) { toast.error('Informe o nome do Hub.'); return }
    if (!nomeRepresentante) { toast.error('Informe o nome do representante.'); return }
    if (!email) { toast.error('Informe o e-mail.'); return }
    if (!EMAIL_RE.test(email)) { toast.error('Informe um e-mail válido.'); return }
    if (!telefone) { toast.error('Informe o telefone.'); return }
    if (!cnpj) { toast.error('Informe o CNPJ da empresa.'); return }
    if (obs.length > 3000) { toast.error('Observações: máximo de 3.000 caracteres.'); return }

    startTransition(async () => {
      try {
        await criarHub(formData)
        toast.success('Hub criado com sucesso.')
        setObs('')
        setAberto(false)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao criar Hub.')
      }
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="h-4 w-4" />
        Novo Hub
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Hub</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="nome">Nome do Hub *</Label>
            <Input id="nome" name="nome" required autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="nome_representante">Nome do representante *</Label>
            <Input id="nome_representante" name="nome_representante" required autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input id="email" name="email" type="email" required autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone *</Label>
            <Input id="telefone" name="telefone" required autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="cnpj">CNPJ da empresa *</Label>
            <Input id="cnpj" name="cnpj" required autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
            <Input id="nome_fantasia" name="nome_fantasia" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="razao_social">Razão Social</Label>
            <Input id="razao_social" name="razao_social" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              name="observacoes"
              rows={4}
              maxLength={3000}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Informações comerciais, condições, anotações…"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{obs.length}/3000</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={isPending} onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar Hub'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
