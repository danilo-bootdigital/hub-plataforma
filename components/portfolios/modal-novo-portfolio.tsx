'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { criarPortfolio, editarPortfolio } from '@/app/(dashboard)/configuracoes/portfolios/actions'
import { Plus, Pencil } from 'lucide-react'
import type { Portfolio } from '@/types/database'

type Props = {
  portfolio?: Portfolio
}

export function ModalNovoPortfolio({ portfolio }: Props) {
  const [aberto, setAberto] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const editando = !!portfolio

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (editando) {
          await editarPortfolio(portfolio.id, formData)
        } else {
          await criarPortfolio(formData)
        }
        setAberto(false)
        router.refresh()
        toast.success(editando ? 'Portfólio atualizado.' : 'Portfólio criado.')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar portfólio.')
      }
    })
  }

  return (
    <>
      {editando ? (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAberto(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button size="sm" className="gap-1.5" onClick={() => setAberto(true)}>
          <Plus className="h-4 w-4" />
          Novo portfólio
        </Button>
      )}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar portfólio' : 'Novo portfólio'}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome do portfólio *</Label>
              <Input id="nome" name="nome" defaultValue={portfolio?.nome ?? ''} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                name="descricao"
                defaultValue={portfolio?.descricao ?? ''}
                rows={3}
                placeholder="Descrição comercial do portfólio"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar portfólio'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
