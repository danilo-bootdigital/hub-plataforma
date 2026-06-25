'use client'

import { Button } from '@/components/ui/button'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'

type DadosFunil = { nome: string; cor: string; total: number }
type DadosLeadsSemana = { semana: string; total: number }
type DadosVendas = { nome: string; valor: number; deals: number }
type DadosProdutos = { nome: string; fornecedor: string; quantidade: number; receita: number }
type DadosFornecedor = { nome: string; pedidos: number; itens: number; receita: number }

type Props = {
  metricas: {
    leadsNovos: number
    taxaConversao: number
    dealsGanhos: number
    receita: number
    ticketMedio: number
    dealsPerdidos: number
  }
  dadosFunil: DadosFunil[]
  dadosLeadsSemana: DadosLeadsSemana[]
  dadosVendas: DadosVendas[]
  dadosProdutos: DadosProdutos[]
  dadosFornecedor: DadosFornecedor[]
  periodo: string
}

export function BotoesExportar(props: Props) {
  async function exportarPdf() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14

    // Título
    doc.setFillColor(241, 245, 249)
    doc.rect(0, 0, pageWidth, 20, 'F')
    doc.setFontSize(14)
    doc.setFont(undefined!, 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('Relatório de Desempenho', margin, 13)
    doc.setFontSize(9)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`Período: ${props.periodo}`, pageWidth - margin, 13, { align: 'right' })

    let y = 28

    // === MÉTRICAS ===
    doc.setFontSize(11)
    doc.setFont(undefined!, 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('Métricas Gerais', margin, y)
    y += 8

    const metricas = [
      ['Leads Novos', String(props.metricas.leadsNovos)],
      ['Taxa de Conversão', `${props.metricas.taxaConversao}%`],
      ['Deals Ganhos', String(props.metricas.dealsGanhos)],
      ['Receita Total', formatarMoeda(props.metricas.receita)],
      ['Ticket Médio', formatarMoeda(props.metricas.ticketMedio)],
      ['Deals Perdidos', String(props.metricas.dealsPerdidos)],
    ]

    autoTable(doc, {
      startY: y,
      head: [['Métrica', 'Valor']],
      body: metricas,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
      columnStyles: { 0: { fontStyle: 'bold' } },
      margin: { left: margin, right: margin },
      tableWidth: 100,
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12

    // === FUNIL ===
    if (props.dadosFunil.length > 0) {
      doc.setFontSize(11)
      doc.setFont(undefined!, 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Funil do Pipeline', margin, y)
      y += 6

      const maxFunil = Math.max(...props.dadosFunil.map(d => d.total), 1)
      const barMaxW = 100

      props.dadosFunil.forEach((etapa) => {
        const barW = (etapa.total / maxFunil) * barMaxW
        // Cor da barra
        const hex = etapa.cor.replace('#', '')
        const r = parseInt(hex.substring(0, 2), 16) || 100
        const g = parseInt(hex.substring(2, 4), 16) || 100
        const b = parseInt(hex.substring(4, 6), 16) || 100

        doc.setFillColor(r, g, b)
        doc.roundedRect(margin, y, Math.max(barW, 2), 6, 1, 1, 'F')

        doc.setFontSize(8)
        doc.setFont(undefined!, 'normal')
        doc.setTextColor(71, 85, 105)
        doc.text(`${etapa.nome} (${etapa.total})`, margin + barW + 4, y + 4.5)
        y += 9
      })
      y += 6
    }

    // === LEADS POR SEMANA ===
    if (props.dadosLeadsSemana.length > 0 && y < 220) {
      doc.setFontSize(11)
      doc.setFont(undefined!, 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Leads por Semana', margin, y)
      y += 4

      autoTable(doc, {
        startY: y,
        head: [['Semana', 'Leads']],
        body: props.dadosLeadsSemana.map(d => [d.semana, String(d.total)]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
        tableWidth: 80,
      })

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
    }

    // === VENDAS POR VENDEDOR ===
    if (props.dadosVendas.length > 0) {
      if (y > 220) { doc.addPage(); y = 20 }

      doc.setFontSize(11)
      doc.setFont(undefined!, 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Vendas por Vendedor', margin, y)
      y += 4

      autoTable(doc, {
        startY: y,
        head: [['Vendedor', 'Deals', 'Receita']],
        body: props.dadosVendas.map(d => [d.nome, String(d.deals), formatarMoeda(d.valor)]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      })

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
    }

    // === VENDAS POR FORNECEDOR ===
    if (props.dadosFornecedor.length > 0) {
      if (y > 220) { doc.addPage(); y = 20 }

      doc.setFontSize(11)
      doc.setFont(undefined!, 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Vendas por Fornecedor', margin, y)
      y += 4

      autoTable(doc, {
        startY: y,
        head: [['Fornecedor', 'Pedidos', 'Itens', 'Receita']],
        body: props.dadosFornecedor.map(d => [d.nome, String(d.pedidos), String(d.itens), formatarMoeda(d.receita)]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      })

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
    }

    // === PRODUTOS MAIS VENDIDOS ===
    if (props.dadosProdutos.length > 0) {
      if (y > 220) { doc.addPage(); y = 20 }

      doc.setFontSize(11)
      doc.setFont(undefined!, 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Produtos Mais Vendidos', margin, y)
      y += 4

      autoTable(doc, {
        startY: y,
        head: [['Produto', 'Fornecedor', 'Qtd Vendida', 'Receita']],
        body: props.dadosProdutos.map(d => [d.nome, d.fornecedor, String(d.quantidade), formatarMoeda(d.receita)]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      })
    }

    // Rodapé
    const pages = doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      const ph = doc.internal.pageSize.getHeight()
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} — Página ${i}/${pages}`, pageWidth / 2, ph - 6, { align: 'center' })
    }

    doc.save(`relatorio-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  async function exportarXlsx() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    // Aba Métricas
    const wsMetricas = XLSX.utils.aoa_to_sheet([
      ['Métrica', 'Valor'],
      ['Leads Novos', props.metricas.leadsNovos],
      ['Taxa de Conversão (%)', props.metricas.taxaConversao],
      ['Deals Ganhos', props.metricas.dealsGanhos],
      ['Receita Total (R$)', props.metricas.receita],
      ['Ticket Médio (R$)', props.metricas.ticketMedio],
      ['Deals Perdidos', props.metricas.dealsPerdidos],
    ])
    XLSX.utils.book_append_sheet(wb, wsMetricas, 'Métricas')

    // Aba Funil
    if (props.dadosFunil.length > 0) {
      const wsFunil = XLSX.utils.aoa_to_sheet([
        ['Etapa', 'Quantidade'],
        ...props.dadosFunil.map(d => [d.nome, d.total]),
      ])
      XLSX.utils.book_append_sheet(wb, wsFunil, 'Funil')
    }

    // Aba Leads por Semana
    if (props.dadosLeadsSemana.length > 0) {
      const wsLeads = XLSX.utils.aoa_to_sheet([
        ['Semana', 'Leads'],
        ...props.dadosLeadsSemana.map(d => [d.semana, d.total]),
      ])
      XLSX.utils.book_append_sheet(wb, wsLeads, 'Leads por Semana')
    }

    // Aba Vendas por Vendedor
    if (props.dadosVendas.length > 0) {
      const wsVendas = XLSX.utils.aoa_to_sheet([
        ['Vendedor', 'Deals Ganhos', 'Receita (R$)'],
        ...props.dadosVendas.map(d => [d.nome, d.deals, d.valor]),
      ])
      XLSX.utils.book_append_sheet(wb, wsVendas, 'Vendas por Vendedor')
    }

    // Aba Vendas por Fornecedor
    if (props.dadosFornecedor.length > 0) {
      const wsFornecedor = XLSX.utils.aoa_to_sheet([
        ['Fornecedor', 'Pedidos', 'Itens Vendidos', 'Receita (R$)'],
        ...props.dadosFornecedor.map(d => [d.nome, d.pedidos, d.itens, d.receita]),
      ])
      XLSX.utils.book_append_sheet(wb, wsFornecedor, 'Vendas por Fornecedor')
    }

    // Aba Produtos
    if (props.dadosProdutos.length > 0) {
      const wsProdutos = XLSX.utils.aoa_to_sheet([
        ['Produto', 'Fornecedor', 'Quantidade Vendida', 'Receita (R$)'],
        ...props.dadosProdutos.map(d => [d.nome, d.fornecedor, d.quantidade, d.receita]),
      ])
      XLSX.utils.book_append_sheet(wb, wsProdutos, 'Produtos')
    }

    XLSX.writeFile(wb, `relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportarPdf} className="gap-1.5">
        <FileDown className="h-4 w-4" />
        Exportar PDF
      </Button>
      <Button variant="outline" size="sm" onClick={exportarXlsx} className="gap-1.5">
        <FileSpreadsheet className="h-4 w-4" />
        Exportar Planilha
      </Button>
    </div>
  )
}
