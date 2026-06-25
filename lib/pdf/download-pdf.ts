// Download do PDF do orçamento (formato novo, gerado pela rota Puppeteer
// /api/orcamentos/[id]/pdf). Lógica ÚNICA de download, reutilizada pelos
// botões `ExportarPdfButton` e `BotaoBaixarPdf` — evita duplicação.
//
// Client-side: usa fetch + Blob + âncora temporária para forçar o download.
// Em caso de erro, lança Error com a mensagem da rota; o chamador decide
// como sinalizar (alert/toast) e controla o estado de loading.

export async function baixarOrcamentoPdf(
  orcamentoId: string,
  numero: number,
): Promise<void> {
  const response = await fetch(`/api/orcamentos/${orcamentoId}/pdf`)

  if (!response.ok) {
    const detalhe = await response.text()
    throw new Error(detalhe || `Falha ao gerar PDF (HTTP ${response.status})`)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `orcamento-${numero}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
