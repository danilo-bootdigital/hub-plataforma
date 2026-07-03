// DEC-019 — Comparador de posologia via Claude (tool forçada). A IA só COMPARA.
// Mesmo padrão do ClaudeExtrator: saída estruturada validada por parseComparacao (puro).

import Anthropic from '@anthropic-ai/sdk'
import type { ComparadorPosologia, EntradaComparacaoPosologia } from '../tipos'
import { SCHEMA_COMPARACAO, parseComparacao, construirPromptComparacao, type ComparacaoPosologia } from '../comparar-posologia'

const MODELO = 'claude-opus-4-8'

export class ClaudeComparador implements ComparadorPosologia {
  readonly id = 'claude' as const
  private readonly client: Anthropic

  constructor(client?: Anthropic) {
    this.client = client ?? new Anthropic()
  }

  async comparar(entrada: EntradaComparacaoPosologia): Promise<ComparacaoPosologia> {
    const { system, instrucao } = construirPromptComparacao(entrada.esperada, entrada.extraida)
    const resp = await this.client.messages.create({
      model: MODELO,
      max_tokens: 1024,
      system,
      tools: [
        {
          name: 'registrar_comparacao',
          description: 'Registra a comparação semântica de posologia (apenas comparação — não decide nem aprova).',
          input_schema: SCHEMA_COMPARACAO as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: 'registrar_comparacao' },
      messages: [{ role: 'user', content: [{ type: 'text', text: instrucao }] }],
    })
    const bloco = resp.content.find((b) => b.type === 'tool_use')
    if (!bloco || bloco.type !== 'tool_use') {
      throw new Error('IA não retornou comparação estruturada (tool_use ausente)')
    }
    return parseComparacao(bloco.input)
  }
}
