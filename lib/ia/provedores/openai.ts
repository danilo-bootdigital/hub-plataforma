// DEC-019 — Provider OpenAI (ChatGPT) do ExtratorReceita.
// Usa a Responses API (multimodal: PDF via input_file, imagem via input_image) com
// SAÍDA ESTRUTURADA (json_schema strict) — reusa SCHEMA_EXTRACAO/parseExtracao (puros).
// A IA APENAS extrai: o schema não tem score/status/aprovação. Mesma fronteira do Claude.

import OpenAI from 'openai'
import type { ExtratorReceita, EntradaExtracao } from '../tipos'
import type { ExtracaoReceita } from '../../conferencia/tipos'
import { SCHEMA_EXTRACAO, parseExtracao, construirPromptExtracao } from '../schema-extracao'

const MODELO = process.env.OPENAI_MODEL || 'gpt-4o'

type ConteudoEntrada =
  | OpenAI.Responses.ResponseInputText
  | OpenAI.Responses.ResponseInputImage
  | OpenAI.Responses.ResponseInputFile

export class OpenAiExtrator implements ExtratorReceita {
  readonly id = 'openai' as const
  private readonly client: OpenAI

  constructor(client?: OpenAI) {
    // Sem client injetado → lê OPENAI_API_KEY do ambiente.
    this.client = client ?? new OpenAI()
  }

  async extrair(entrada: EntradaExtracao): Promise<ExtracaoReceita> {
    const { system, instrucao } = construirPromptExtracao(entrada.camposEsperados, entrada.prompt)

    const conteudo: ConteudoEntrada[] = []
    if (entrada.arquivo) {
      const dataUri = `data:${entrada.arquivo.mime};base64,${entrada.arquivo.base64}`
      if (entrada.arquivo.mime === 'application/pdf') {
        conteudo.push({ type: 'input_file', filename: 'receita.pdf', file_data: dataUri })
      } else {
        conteudo.push({ type: 'input_image', image_url: dataUri, detail: 'auto' })
      }
    }
    if (entrada.texto) {
      conteudo.push({ type: 'input_text', text: 'Texto (OCR) da receita:\n' + entrada.texto })
    }
    conteudo.push({ type: 'input_text', text: instrucao })

    const resp = await this.client.responses.create({
      model: MODELO,
      instructions: system,
      input: [{ role: 'user', content: conteudo }],
      text: {
        format: {
          type: 'json_schema',
          name: 'extracao_receita',
          strict: true,
          schema: SCHEMA_EXTRACAO as Record<string, unknown>,
        },
      },
    })

    const txt = resp.output_text
    if (!txt) throw new Error('OpenAI não retornou extração estruturada (output_text vazio)')
    return parseExtracao(JSON.parse(txt)) // validação pura; nunca confia cegamente no retorno
  }
}
