'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { alternarDisponibilidade } from '@/app/(dashboard)/configuracoes/distribuicao/actions'
import type { UserRole } from '@/types/database'

type Props = {
  disponivel: boolean
  cargo: UserRole
}

const CARGOS_COM_DISPONIBILIDADE: UserRole[] = ['vendedor', 'atendimento']

export function BotaoDisponibilidade({ disponivel, cargo }: Props) {
  if (!CARGOS_COM_DISPONIBILIDADE.includes(cargo)) return null

  return <BotaoDisponibilidadeInterativo disponivel={disponivel} />
}

function BotaoDisponibilidadeInterativo({ disponivel: inicial }: { disponivel: boolean }) {
  const [disponivel, setDisponivel] = useState(inicial)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      try {
        await alternarDisponibilidade()
        setDisponivel((prev) => !prev)
        router.refresh()
      } catch {
        // estado não muda se a action falhar
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={
        disponivel
          ? 'Você está disponível — clique para ficar indisponível'
          : 'Você está indisponível — clique para ficar disponível'
      }
      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
      style={
        disponivel
          ? { borderColor: '#16a34a', color: '#15803d', backgroundColor: '#f0fdf4' }
          : { borderColor: '#94a3b8', color: '#475569', backgroundColor: '#f8fafc' }
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: disponivel ? '#16a34a' : '#94a3b8' }}
      />
      {isPending ? '...' : disponivel ? 'Disponível' : 'Indisponível'}
    </button>
  )
}
