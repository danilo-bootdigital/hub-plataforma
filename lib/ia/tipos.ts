// DEC-019 / MVP-4 — Camada de IA (provider-agnostic).
// A IA APENAS extrai dados. Não decide, não calcula score, não aprova, não altera
// regra. A saída (ExtracaoReceita) é exatamente a ENTRADA do motor de regras (S2),
// de modo que a IA só "alimenta" o motor. Nenhuma dependência de UI/DB/fluxo.

import type { ExtracaoReceita } from '../conferencia/tipos'
export type { ExtracaoReceita }

export type ProvedorIA = 'claude' | 'openai' | 'gemini' | 'azure' | 'local'

export type MimeReceita = 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp'

export interface ArquivoReceita {
  base64: string
  mime: MimeReceita
}

export interface EntradaExtracao {
  arquivo?: ArquivoReceita // PDF/imagem (multimodal)
  texto?: string // texto já OCRizado (opcional; OCR é etapa separada)
  camposEsperados?: readonly string[] // dica: chaves do checklist a extrair
}

// Contrato único que qualquer provedor (Claude/OpenAI/Gemini/Azure/local) implementa.
export interface ExtratorReceita {
  readonly id: ProvedorIA
  extrair(entrada: EntradaExtracao): Promise<ExtracaoReceita>
}
