import { formatarMoeda } from '@/lib/utils'

// Paleta verde suave DPRIME
const GREEN = [47, 143, 70] as const
const GREEN_LIGHT = [234, 244, 236] as const
const GREEN_LIGHT2 = [240, 247, 242] as const
const GREEN_BORDER = [201, 221, 204] as const
const DARK_TEXT = [43, 43, 43] as const
const GRAY_TEXT = [107, 107, 107] as const
const WHITE = [255, 255, 255] as const

interface OrcamentoItem {
  id: string
  descricao: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
  subtotal: number
  product_id: string | null
  marca?: string | null
  codigo?: string | null
  unidade?: string | null
}

interface OrcamentoData {
  id: string
  numero: number
  status: string
  criado_em: string
  responsavel: { nome: string } | null
  lead: { id: string; nome: string; telefone: string; email: string; endereco: string; cpf_cnpj: string } | null
  contato: {
    id: string
    nome: string
    telefone: string | null
    email: string | null
    cpf_cnpj: string | null
    cargo: string | null
    tipo_pessoa: string | null
    categoria_cliente: string | null
    especialidade: string | null
    tipo_conselho: string | null
    numero_conselho: string | null
    uf_conselho: string | null
    observacoes: string | null
    empresa_id: string | null
    empresa: { id: string; nome: string } | null
    endereco: string | null
    endereco_numero: string | null
    endereco_complemento: string | null
    endereco_bairro: string | null
    endereco_cidade: string | null
    endereco_estado: string | null
    endereco_cep: string | null
  } | null
  deal: { id: string; titulo: string; contato_id: string } | null
  aprovador: { nome: string } | null
  fornecedor: {
    id: string
    nome: string
    hub_id: string | null
    health_hubs: { id: string; nome: string; logo_url: string | null } | null
  } | null
  carrier: { nome: string } | null
  organizacao: {
    nome: string
    nome_fantasia: string | null
    cnpj: string | null
    telefone: string | null
    email: string | null
    endereco: string | null
    logo_url: string | null
    site: string | null
    instagram: string | null
  } | null
  itens: OrcamentoItem[]
  valor_subtotal: number
  desconto_geral: number
  frete: number
  frete_regiao: string | null
  endereco_entrega: string | null
  forma_pagamento: string | null
  valor_total: number
  observacoes: string | null
  nota_tipo_pessoa: string | null
  nota_nome: string | null
  nota_documento: string | null
  nota_razao_social: string | null
  nota_nome_fantasia: string | null
  nota_endereco: string | null
  nota_ie: string | null
  nota_im: string | null
}

// Quebra inteligente de endereço
function quebrarEnderecoInteligente(text: string): string {
  if (!text) return ''
  return text
    .replace(/,\s*(\d+)/g, ',\n$1')
    .replace(/\s+-\s+/g, '\n')
}

export async function gerarPdf(orcamento: OrcamentoData) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  const setFill = (color: readonly number[]) => doc.setFillColor(color[0], color[1], color[2])
  const setText = (color: readonly number[]) => doc.setTextColor(color[0], color[1], color[2])
  const setDraw = (color: readonly number[]) => doc.setDrawColor(color[0], color[1], color[2])

  // Timeout para carregamento de logos
  async function loadLogo(url: string, timeoutMs = 5000): Promise<string | null> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (!response.ok) return null
      const buffer = await response.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const contentType = response.headers.get('content-type') || 'image/png'
      return `data:${contentType};base64,${base64}`
    } catch {
      return null
    }
  }

  // ==========================================================
  // 1. HEADER PDF — SIMPLES E ESTÁVEL
  // ==========================================================

  // Helper para ajustar logo proporcionalmente
  function getLogoDimensions(originalWidth: number, originalHeight: number, maxW: number, maxH: number) {
    const ratio = originalWidth / originalHeight
    if (ratio > maxW / maxH) {
      return { width: maxW, height: maxW / ratio }
    } else {
      return { width: maxH * ratio, height: maxH }
    }
  }

  const org = orcamento.organizacao
  const headerY = 10
  const logoMaxW = 45
  const logoMaxH = 22

  // Logo à esquerda
  if (org?.logo_url) {
    const logoData = await loadLogo(org.logo_url)
    if (logoData) {
      try {
        const logoDims = getLogoDimensions(200, 80, logoMaxW, logoMaxH)
        doc.addImage(logoData, 'PNG', margin, headerY, logoDims.width, logoDims.height)
      } catch {
        // Logo falhou
      }
    }
  }

  // Nome da empresa abaixo do logo
  setText(DARK_TEXT)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(org?.nome_fantasia || org?.nome || 'DPRIME', margin, headerY + 26)

  // Subtítulo
  setText(GREEN)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Representacao Farmaceutica', margin, headerY + 33)

  // CNPJ
  if (org?.cnpj) {
    setText(DARK_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`CNPJ: ${org.cnpj}`, margin, headerY + 40)
  }

  // Contatos no centro
  const centerX = 95
  let contactY = headerY + 5

  setText(DARK_TEXT)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')

  if (org?.telefone) {
    doc.text(org.telefone, centerX, contactY)
    contactY += 12
  }

  if (org?.email) {
    doc.text(org.email, centerX, contactY)
    contactY += 12
  }

  if (org?.site) {
    doc.text(org.site, centerX, contactY)
    contactY += 12
  }

  if (org?.instagram) {
    doc.text(org.instagram, centerX, contactY)
  }

  // Proposta à direita
  const rightX = pageWidth - margin

  setText(GREEN)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('PROPOSTA', rightX, headerY + 10, { align: 'right' })
  doc.setFontSize(14)
  doc.text('COMERCIAL', rightX, headerY + 20, { align: 'right' })

  // Número da proposta (texto simples)
  setText(DARK_TEXT)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Proposta N. ${orcamento.numero.toString().padStart(3, '0')}`, rightX, headerY + 32, { align: 'right' })

  // Data
  const dataFormatada = new Date(orcamento.criado_em).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
  setText(DARK_TEXT)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(dataFormatada, rightX, headerY + 42, { align: 'right' })

  // Responsável
  if (orcamento.responsavel?.nome) {
    doc.text(orcamento.responsavel.nome, rightX, headerY + 50, { align: 'right' })
  }

  // Linha separadora
  const headerBottom = headerY + 58
  setDraw(GREEN)
  doc.setLineWidth(1)
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom)

  // ==========================================================
  // 2. DADOS DO CLIENTE
  // ==========================================================
  const cliente = orcamento.contato || orcamento.lead
  let currentY = headerBottom + 10

  // Título da seção
  setText(GREEN)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('DADOS DO CLIENTE', margin, currentY)
  currentY += 8

  // Montar endereço
  function montarEnderecoContato(): string | null {
    if (!cliente) return null
    if (orcamento.contato) {
      const partes: string[] = []
      if (orcamento.contato.endereco) partes.push(orcamento.contato.endereco)
      if (orcamento.contato.endereco_numero) partes.push(orcamento.contato.endereco_numero)
      if (orcamento.contato.endereco_complemento) partes.push(orcamento.contato.endereco_complemento)
      if (orcamento.contato.endereco_bairro) partes.push(orcamento.contato.endereco_bairro)
      const cidadeUFCEP: string[] = []
      if (orcamento.contato.endereco_cidade) cidadeUFCEP.push(orcamento.contato.endereco_cidade)
      if (orcamento.contato.endereco_estado) cidadeUFCEP.push(orcamento.contato.endereco_estado)
      if (orcamento.contato.endereco_cep) cidadeUFCEP.push(orcamento.contato.endereco_cep)
      if (cidadeUFCEP.length > 0) partes.push(cidadeUFCEP.join(' - '))
      return partes.length > 0 ? partes.join(', ') : null
    }
    return orcamento.lead?.endereco || null
  }

  const endereco = montarEnderecoContato()

  // Card do cliente - altura dinâmica
  const cardW = contentWidth
  let cardH = 20

  // Calcular altura necessária
  let tempY = 0
  if (cliente?.nome) tempY += 18
  if (orcamento.contato?.cpf_cnpj || orcamento.lead?.cpf_cnpj) tempY += 18
  if (orcamento.contato?.tipo_pessoa) tempY += 18
  if (cliente?.telefone) tempY += 18
  if (cliente?.email) tempY += 18
  if (orcamento.contato?.tipo_conselho) tempY += 18
  if (orcamento.contato?.empresa?.nome || orcamento.contato?.categoria_cliente) tempY += 18
  if (orcamento.contato?.especialidade) tempY += 18
  if (endereco) tempY += 36

  cardH = Math.max(cardH, tempY + 20)

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  setFill(WHITE)
  doc.roundedRect(margin, currentY, cardW, cardH, 2, 2, 'FD')

  const cardPadding = 8
  let cardY = currentY + cardPadding

  // Nome / Razão Social
  setText(GRAY_TEXT)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('NOME / RAZAO SOCIAL', margin + cardPadding, cardY)
  cardY += 7
  setText(DARK_TEXT)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(cliente?.nome || '—', margin + cardPadding, cardY)
  cardY += 18

  // CPF/CNPJ
  const docCliente = orcamento.contato?.cpf_cnpj || orcamento.lead?.cpf_cnpj
  if (docCliente) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('CPF / CNPJ', margin + cardPadding, cardY)
    cardY += 7
    setText(DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(docCliente, margin + cardPadding, cardY)
    cardY += 18
  }

  // Tipo de pessoa
  if (orcamento.contato?.tipo_pessoa) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('TIPO', margin + cardPadding, cardY)
    cardY += 7
    setText(DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(orcamento.contato.tipo_pessoa, margin + cardPadding, cardY)
    cardY += 18
  }

  // Telefone
  if (cliente?.telefone) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('TELEFONE', margin + cardPadding, cardY)
    cardY += 7
    setText(DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(cliente.telefone, margin + cardPadding, cardY)
    cardY += 18
  }

  // Email
  if (cliente?.email) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('E-MAIL', margin + cardPadding, cardY)
    cardY += 7
    setText(DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(cliente.email, margin + cardPadding, cardY)
    cardY += 18
  }

  // Conselho
  if (orcamento.contato?.tipo_conselho && orcamento.contato?.numero_conselho) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`${orcamento.contato.tipo_conselho} / NUMERO`, margin + cardPadding, cardY)
    cardY += 7
    setText(DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const conselhoUF = orcamento.contato.uf_conselho ? `/${orcamento.contato.uf_conselho}` : ''
    doc.text(`${orcamento.contato.numero_conselho}${conselhoUF}`, margin + cardPadding, cardY)
    cardY += 18
  }

  // Empresa / Categoria
  if (orcamento.contato?.empresa?.nome || orcamento.contato?.categoria_cliente) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('EMPRESA / CATEGORIA', margin + cardPadding, cardY)
    cardY += 7
    setText(DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    const empresaNome = orcamento.contato?.empresa?.nome || orcamento.contato?.categoria_cliente || ''
    doc.text(empresaNome, margin + cardPadding, cardY)
    cardY += 18
  }

  // Especialidade
  if (orcamento.contato?.especialidade) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ESPECIALIDADE', margin + cardPadding, cardY)
    cardY += 7
    setText(DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    doc.text(orcamento.contato.especialidade, margin + cardPadding, cardY)
    cardY += 18
  }

  // Endereço
  if (endereco) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ENDERECO', margin + cardPadding, cardY)
    cardY += 7
    setText(DARK_TEXT)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const endLines = doc.splitTextToSize(endereco, cardW - cardPadding * 2)
    doc.text(endLines, margin + cardPadding, cardY)
    cardY += endLines.length * 6 + 10
  }

  currentY += cardH + 8

  // ==========================================================
  // 3. DADOS PARA EMISSÃO DA NOTA
  // ==========================================================
  const isPF = orcamento.nota_tipo_pessoa === 'PF'
  const temNota = !!(orcamento.nota_nome || orcamento.nota_documento)

  if (temNota) {
    setText(GREEN)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS PARA EMISSAO DA NOTA', margin, currentY)
    currentY += 8

    // Card de nota - altura dinâmica
    let notaCardH = 20
    if (orcamento.nota_nome) notaCardH += 18
    if (orcamento.nota_nome_fantasia) notaCardH += 18
    if (orcamento.nota_ie || orcamento.nota_im) notaCardH += 18
    if (orcamento.nota_endereco) notaCardH += 36
    notaCardH += 20

    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.5)
    setFill(WHITE)
    doc.roundedRect(margin, currentY, cardW, notaCardH, 2, 2, 'FD')

    const notaPadding = 8
    let notaY = currentY + notaPadding

    // Tipo de pessoa
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('TIPO DE PESSOA', margin + notaPadding, notaY)
    notaY += 7
    setText(DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(isPF ? 'Pessoa Fisica' : 'Pessoa Juridica', margin + notaPadding, notaY)
    notaY += 18

    // CPF/CNPJ
    if (orcamento.nota_documento) {
      setText(GRAY_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(isPF ? 'CPF' : 'CNPJ', margin + notaPadding, notaY)
      notaY += 7
      setText(DARK_TEXT)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(orcamento.nota_documento, margin + notaPadding, notaY)
      notaY += 18
    }

    // Nome / Razão Social
    if (orcamento.nota_nome) {
      setText(GRAY_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(isPF ? 'NOME' : 'RAZAO SOCIAL', margin + notaPadding, notaY)
      notaY += 7
      setText(DARK_TEXT)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.nota_nome, margin + notaPadding, notaY)
      notaY += 18
    }

    // Nome Fantasia (para PJ)
    if (!isPF && orcamento.nota_nome_fantasia) {
      setText(GRAY_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('NOME FANTASIA', margin + notaPadding, notaY)
      notaY += 7
      setText(DARK_TEXT)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(orcamento.nota_nome_fantasia, margin + notaPadding, notaY)
      notaY += 18
    }

    // IE / IM (para PJ)
    if (!isPF && (orcamento.nota_ie || orcamento.nota_im)) {
      setText(GRAY_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const inscLabel = orcamento.nota_ie && orcamento.nota_im ? 'IE / IM' : (orcamento.nota_ie ? 'IE' : 'IM')
      doc.text(inscLabel, margin + notaPadding, notaY)
      notaY += 7
      setText(DARK_TEXT)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      const inscValue = orcamento.nota_ie && orcamento.nota_im
        ? `${orcamento.nota_ie} / ${orcamento.nota_im}`
        : (orcamento.nota_ie || orcamento.nota_im || '')
      doc.text(inscValue, margin + notaPadding, notaY)
      notaY += 18
    }

    // Endereço fiscal
    if (orcamento.nota_endereco) {
      setText(GRAY_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('ENDERECO FISCAL', margin + notaPadding, notaY)
      notaY += 7
      setText(DARK_TEXT)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const endLines = doc.splitTextToSize(orcamento.nota_endereco, cardW - notaPadding * 2)
      doc.text(endLines, margin + notaPadding, notaY)
      notaY += endLines.length * 6 + 10
    }

    currentY += notaCardH + 8
  }

  // ==========================================================
  // 4. ENDEREÇO DE ENTREGA (padrão visual)
  // ==========================================================
  const temEntrega = !!(orcamento.endereco_entrega && orcamento.endereco_entrega.trim().length > 0)

  if (temEntrega) {
    setText(GREEN)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ENDERECO DE ENTREGA', margin, currentY)
    currentY += 6

    // Calcular altura dinâmica
    const entregaLines = orcamento.endereco_entrega!.split('\n').filter(l => l.trim()).length
    const temComplementos = !!(orcamento.contato?.endereco_bairro || orcamento.contato?.endereco_cidade)
    const entregaH = Math.max(28, 20 + (entregaLines * 5) + (temComplementos ? 6 : 0))

    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.5)
    setFill(GREEN_LIGHT2)
    doc.roundedRect(margin, currentY, cardW, entregaH, 2, 2, 'FD')

    let entregaY = currentY + 6
    const entregaX = margin + 6

    // Destinatário
    setText(GRAY_TEXT)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('DESTINATARIO', entregaX, entregaY)
    entregaY += 4
    setText(DARK_TEXT)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(cliente?.nome || '—', entregaX, entregaY)
    entregaY += 8

    // Endereço
    setText(GRAY_TEXT)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('ENDERECO', entregaX, entregaY)
    entregaY += 4
    setText(DARK_TEXT)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    const entregaLinesContent = orcamento.endereco_entrega!.split('\n')
    entregaLinesContent.forEach((line) => {
      if (line.trim()) {
        doc.text(line.trim(), entregaX, entregaY)
        entregaY += 4
      }
    })

    // Complementos
    if (temComplementos) {
      setText(GRAY_TEXT)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text('BAIRRO / CIDADE / CEP', entregaX, entregaY)
      entregaY += 4
      setText(DARK_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const compParts: string[] = []
      if (orcamento.contato?.endereco_bairro) compParts.push(orcamento.contato.endereco_bairro)
      if (orcamento.contato?.endereco_cidade) {
        const cidadeUF = orcamento.contato.endereco_estado
          ? `${orcamento.contato.endereco_cidade} - ${orcamento.contato.endereco_estado}`
          : orcamento.contato.endereco_cidade
        compParts.push(cidadeUF)
      }
      if (orcamento.contato?.endereco_cep) compParts.push(`CEP: ${orcamento.contato.endereco_cep}`)
      if (compParts.length > 0) {
        doc.text(compParts.join(' | '), entregaX, entregaY)
      }
    }

    currentY += entregaH + 5
  }

  // ==========================================================
  // 5. DADOS COMERCIAIS (Fornecedor, Hub, Transportadora, Pagamento)
  // ==========================================================
  const temFornecedor = !!(orcamento.fornecedor?.nome)
  const temTransportadora = !!(orcamento.carrier?.nome)
  const temFormaPagamento = !!(orcamento.forma_pagamento)
  const temObs = !!(orcamento.observacoes)
  const temHub = !!(orcamento.fornecedor?.health_hubs?.nome)

  if (temFornecedor || temTransportadora || temFormaPagamento) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS COMERCIAIS', margin, currentY)
    currentY += 5

    // Cards na mesma linha
    const cardComH = 16
    let cardX = margin

    // Card Fornecedor
    if (temFornecedor) {
      const fornW = 65
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(cardX, currentY, fornW, cardComH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text('FORNECEDOR', cardX + 3, currentY + 4)

      setText(DARK_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.fornecedor!.nome, cardX + 3, currentY + 10)

      // Hub (se existir)
      if (temHub) {
        setText(GRAY_TEXT)
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.text(`Hub: ${orcamento.fornecedor!.health_hubs!.nome}`, cardX + 3, currentY + 14)
      }

      cardX += fornW + 3
    }

    // Card Transportadora
    if (temTransportadora) {
      const transW = 55
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(cardX, currentY, transW, cardComH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text('TRANSPORTADORA', cardX + 3, currentY + 4)

      setText(DARK_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.carrier!.nome, cardX + 3, currentY + 10)

      cardX += transW + 3
    }

    // Card Forma de Pagamento
    if (temFormaPagamento) {
      const pagW = 55
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(cardX, currentY, pagW, cardComH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text('PAGAMENTO', cardX + 3, currentY + 4)

      setText(DARK_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.forma_pagamento!, cardX + 3, currentY + 10)
    }

    currentY += cardComH + 5

    // Observações (se existirem)
    if (temObs) {
      const obsH = Math.max(12, 6 + (Math.min(orcamento.observacoes!.split('\n').length, 2) * 4))

      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(margin, currentY, cardW, obsH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text('OBSERVACOES', margin + 3, currentY + 4)

      setText(DARK_TEXT)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      const obsLines = orcamento.observacoes!.split('\n').slice(0, 2)
      const obsText = obsLines.join(' | ')
      const wrappedObs = doc.splitTextToSize(obsText, cardW - 10)
      doc.text(wrappedObs.slice(0, 2), margin + 3, currentY + 9)

      currentY += obsH + 5
    }
  }

  // ==========================================================
  // 6. TABELA DE PRODUTOS
  // ==========================================================
  const prodY = currentY
  const prodH = 12

  // Barra de título
  setFill(GREEN)
  doc.roundedRect(margin, prodY, contentWidth, prodH, 2, 2, 'F')
  doc.rect(margin, prodY + prodH - 2, contentWidth, 2, 'F')

  setText(WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTOS', margin + 4, prodY + prodH / 2 + 1)

  currentY = prodY + prodH + 2

  // Dados da tabela
  const tableBody = orcamento.itens.map((item, i) => {
    return [
      (i + 1).toString(),
      item.descricao,
      item.unidade || '—',
      item.quantidade.toString(),
      formatarMoeda(item.preco_unitario),
      item.desconto_item > 0 ? `${item.desconto_item}%` : '—',
      formatarMoeda(item.subtotal),
    ]
  })

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'DESCRICAO', 'APRESENTACAO', 'QTD', 'VALOR UNIT.', 'DESC.', 'VALOR TOTAL']],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2]],
      lineWidth: 0.2,
      textColor: [DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]],
      valign: 'middle',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [GREEN[0], GREEN[1], GREEN[2]],
      textColor: [WHITE[0], WHITE[1], WHITE[2]],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 8,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', minCellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 30, fontSize: 6, textColor: [GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]], fontStyle: 'normal' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    pageBreak: 'avoid',
    showHead: 'everyPage',
    margin: { left: margin, right: margin, bottom: 45 },
  })

  // ==========================================================
  // 7. RESUMO FINANCEIRO
  // ==========================================================
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 20
  let ry = finalY + 5

  // Verificar espaço
  if (ry + 35 > pageHeight - 25) {
    doc.addPage()
    ry = 15
  }

  const rightAlign = pageWidth - margin
  const resumoW = 85
  const resumoX = rightAlign - resumoW
  const resumoH = 36

  // Card resumo
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  setFill(WHITE)
  doc.roundedRect(resumoX, ry, resumoW, resumoH, 3, 3, 'FD')

  let ryi = ry + 6
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  // Subtotal
  setText(DARK_TEXT)
  doc.text('Subtotal:', resumoX + 5, ryi)
  doc.text(formatarMoeda(orcamento.valor_subtotal), rightAlign - 3, ryi, { align: 'right' })
  ryi += 5

  // Desconto
  doc.text('Desconto:', resumoX + 5, ryi)
  if (orcamento.desconto_geral > 0) {
    doc.setTextColor(200, 50, 50)
    doc.text(`-${formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}`, rightAlign - 3, ryi, { align: 'right' })
  } else {
    setText(DARK_TEXT)
    doc.text('R$ 0,00', rightAlign - 3, ryi, { align: 'right' })
  }
  ryi += 5

  // Frete
  setText(DARK_TEXT)
  doc.text('Frete:', resumoX + 5, ryi)
  doc.text(`+${formatarMoeda(orcamento.frete)}`, rightAlign - 3, ryi, { align: 'right' })
  ryi += 5

  // Linha separadora
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.3)
  doc.line(resumoX + 5, ryi, rightAlign - 3, ryi)
  ryi += 6

  // Total
  setFill(GREEN)
  doc.roundedRect(resumoX, ryi - 3, resumoW, 12, 2, 2, 'F')
  setText(WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('VALOR TOTAL', resumoX + 5, ryi + 4)
  doc.setFontSize(12)
  doc.text(formatarMoeda(orcamento.valor_total), rightAlign - 3, ryi + 4, { align: 'right' })

  // ==========================================================
  // 8. RODAPÉ
  // ==========================================================
  const footerY = pageHeight - 8

  // Linha
  setDraw(GREEN)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  // Data e hora
  setText(GRAY_TEXT)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  doc.text(`Proposta gerada em ${dataGeracao} as ${horaGeracao}`, margin, footerY - 1)

  // Disclaimer
  doc.setFontSize(6)
  doc.setFont('helvetica', 'italic')
  const disclaimer = 'Medicamentos requerem prescricao medica. DPRIME - Representacao Farmaceutica.'
  doc.text(disclaimer, margin, footerY + 3)

  return Buffer.from(doc.output('arraybuffer'))
}