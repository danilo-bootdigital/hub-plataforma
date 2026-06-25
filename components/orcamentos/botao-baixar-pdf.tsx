'use client'

// Botão "Baixar PDF" do preview HTML.
// Baixa o PDF do orçamento (formato novo) via a rota Puppeteer existente
// /api/orcamentos/[id]/pdf, reutilizando a MESMA lógica de download de
// `ExportarPdfButton` (lib/pdf/download-pdf.ts) — sem duplicar código,
// sem criar nova rota e sem `window.print()`.

import { Printer, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { baixarOrcamentoPdf } from '@/lib/pdf/download-pdf'

type Props = {
  orcamentoId: string
  numero?: number
}

export function BotaoBaixarPdf({ orcamentoId, numero }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return

    setLoading(true)
    try {
      await baixarOrcamentoPdf(orcamentoId, numero ?? 0)
    } catch (error) {
      console.error('Erro ao baixar PDF:', error)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="gap-2 bg-emerald-700 hover:bg-emerald-800 print:hidden"
      title="Baixar o PDF do orçamento."
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
      <span>Baixar PDF</span>
    </Button>
  )
}
