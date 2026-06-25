'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { excluirContato, converterContatoEmLead } from '@/app/(dashboard)/contatos/actions'
import { Trash2, UserPlus } from 'lucide-react'

type Props = {
  contatoId: string
  contatoNome: string
}

export function AcoesContato({ contatoId, contatoNome }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleExcluir() {
    if (!confirmando) {
      setConfirmando(true)
      return
    }

    startTransition(async () => {
      try {
        await excluirContato(contatoId)
        toast.success('Contato excluído.')
        router.push('/contatos')
      } catch (e: unknown) {
        if (isRedirectError(e)) throw e
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
        setConfirmando(false)
      }
    })
  }

  function handleConverterEmLead() {
    startTransition(async () => {
      try {
        await converterContatoEmLead(contatoId)
        toast.success(`"${contatoNome}" convertido em lead.`)
      } catch (e: unknown) {
        if (isRedirectError(e)) throw e
        toast.error(e instanceof Error ? e.message : 'Erro ao converter.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 w-full justify-start"
        onClick={handleConverterEmLead}
        disabled={isPending}
      >
        <UserPlus className="h-4 w-4" />
        Converter em Lead
      </Button>
      <Button
        variant={confirmando ? 'destructive' : 'outline'}
        size="sm"
        className="gap-1.5 w-full justify-start"
        onClick={handleExcluir}
        onBlur={() => setConfirmando(false)}
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4" />
        {confirmando ? 'Confirmar exclusão' : 'Excluir contato'}
      </Button>
    </div>
  )
}
