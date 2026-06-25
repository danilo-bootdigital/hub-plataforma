'use client'

import { AcoesOrcamentoDetalhe } from '@/components/orcamentos/acoes-orcamento-detalhe'

interface AcoesWrapperProps {
  orcamentoId: string
  status: string
}

export function AcoesWrapper({ orcamentoId, status }: AcoesWrapperProps) {
  return (
    <AcoesOrcamentoDetalhe
      orcamentoId={orcamentoId}
      status={status as any}
      cargo="admin" // temporário até implementar autenticação real
    />
  )
}