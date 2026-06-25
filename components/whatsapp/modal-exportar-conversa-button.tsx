'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { ModalExportarConversa } from './modal-exportar-conversa'

type Mensagem = {
  id: string
  direcao: 'enviada' | 'recebida'
  conteudo: string | null
  enviado_em: string
  responsavel: { nome: string } | null
}

type Props = {
  conversaId: string
  telefone: string
  nomeContato: string
  mensagens: Mensagem[]
  organizationId: string
  perfilId: string
  perfilNome: string
  leadId: string | null
}

export function ModalExportarConversaButton(props: Props) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAberto(true)} title="Exportar conversa">
        <Download className="h-4 w-4" />
      </Button>
      <ModalExportarConversa aberto={aberto} onFechar={() => setAberto(false)} {...props} />
    </>
  )
}
