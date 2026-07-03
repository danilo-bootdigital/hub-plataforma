// DEC-019 — Comparador de posologia via OpenAI (ChatGPT). A IA só COMPARA.
// Responses API + saída estruturada (json_schema strict); validado por parseComparacao (puro).

import OpenAI from 'openai'
import type { ComparadorPosologia, EntradaComparacaoPosologia } from '../tipos'
import { SCHEMA_COMPARACAO, parseComparacao, construirPromptComparacao, type ComparacaoPosologia } from '../comparar-posologia'

const MODELO = process.env.OPENAI_MODEL || 'gpt-4o'

export class OpenAiComparador implements ComparadorPosologia {
  readonly id = 'openai' as const
  private readonly client: OpenAI

  constructor(client?: OpenAI) {
    this.client = client ?? new OpenAI()
  }

  async comparar(entrada: EntradaComparacaoPosologia): Promise<ComparacaoPosologia> {
    const { system, instrucao } = construirPromptComparacao(entrada.esperada, entrada.extraida)
    const resp = await this.client.responses.create({
      model: MODELO,
      instructions: system,
      input: instrucao,
      text: {
        format: {
          type: 'json_schema',
          name: 'comparacao_posologia',
          strict: true,
          schema: SCHEMA_COMPARACAO as Record<string, unknown>,
        },
      },
    })
    const txt = resp.output_text
    if (!txt) throw new Error('OpenAI não retornou comparação estruturada (output_text vazio)')
    return parseComparacao(JSON.parse(txt))
  }
}
