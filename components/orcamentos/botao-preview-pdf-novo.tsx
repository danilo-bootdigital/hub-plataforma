// Botão temporário de teste do novo preview HTML/PDF.
// Abre /orcamentos/[id]/preview-pdf em nova aba.
// Visualmente secundário (variant="ghost") para não competir com o "Exportar PDF".
// Este componente será REMOVIDO quando o PR 2 integrar Puppeteer e o botão oficial
// "Exportar PDF" for redirecionado para o preview.

import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  orcamentoId: string
}

export function BotaoPreviewPdfNovo({ orcamentoId }: Props) {
  return (
    <Link
      href={`/orcamentos/${orcamentoId}/preview-pdf`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 h-9 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-dashed border-emerald-300"
        title="Teste do novo preview HTML/Tailwind (PR 1). PDF real será gerado no PR 2."
      >
        <Eye className="h-4 w-4" />
        <span className="hidden sm:inline">Pré-visualizar PDF novo</span>
      </Button>
    </Link>
  )
}
