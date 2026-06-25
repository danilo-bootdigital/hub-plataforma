'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ModalNovaInstancia } from './modal-nova-instancia'

type Props = { vendedores: { id: string; nome: string }[] }

export function AdicionarInstanciaButton({ vendedores }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <Button className="gap-1.5" onClick={() => setAberto(true)}>
        <Plus className="h-4 w-4" />
        Nova Instância
      </Button>
      <ModalNovaInstancia
        aberto={aberto}
        onFechar={() => { setAberto(false); router.refresh() }}
        vendedores={vendedores}
      />
    </>
  )
}
