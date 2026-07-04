// DEC-019 / MVP-4 — Provider Claude (implementação inicial do ExtratorReceita).
// Usa o SDK oficial (@anthropic-ai/sdk), modelo claude-opus-4-8, entrada multimodal
// (PDF/imagem) e SAÍDA ESTRUTURADA via tool forçada (garante JSON no formato do schema).
// A IA APENAS extrai: a tool não tem score/status/aprovação. O resultado é validado
// por parseExtracao (puro) antes de sair — e alimenta o motor de regras (S2).

import Anthropic from '@anthropic-ai/sdk'
import type { ExtratorReceita, EntradaExtracao } from '../tipos'
import type { ExtracaoReceita } from '../../conferencia/tipos'
import { SCHEMA_EXTRACAO, parseExtracao, construirPromptExtracao } from '../schema-extracao'

const MODELO = 'claude-opus-4-8'

export class ClaudeExtrator implements ExtratorReceita {
  readonly id = 'claude' as const
  private readonly client: Anthropic

  constructor(client?: Anthropic) {
    // Sem client injetado → lê ANTHROPIC_API_KEY do ambiente.
    this.client = client ?? new Anthropic()
  }

  async extrair(entrada: EntradaExtracao): Promise<ExtracaoReceita> {
    const { system, instrucao } = construirPromptExtracao(entrada.camposEsperados, entrada.prompt)

    const conteudo: Anthropic.ContentBlockParam[] = []
    if (entrada.arquivo) {
      if (entrada.arquivo.mime === 'application/pdf') {
        conteudo.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: entrada.arquivo.base64 },
        })
      } else {
        conteudo.push({
          type: 'image',
          source: { type: 'base64', media_type: entrada.arquivo.mime, data: entrada.arquivo.base64 },
        })
      }
    }
    if (entrada.texto) {
      conteudo.push({ type: 'text', text: 'Texto (OCR) da receita:\n' + entrada.texto })
    }
    conteudo.push({ type: 'text', text: instrucao })

    const resp = await this.client.messages.create({
      model: MODELO,
      max_tokens: 4096,
      system,
      tools: [
        {
          name: 'registrar_extracao',
          description: 'Registra os dados extraídos da receita (apenas extração — não decide nem aprova).',
          input_schema: SCHEMA_EXTRACAO as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: 'registrar_extracao' },
      messages: [{ role: 'user', content: conteudo }],
    })

    const bloco = resp.content.find((b) => b.type === 'tool_use')
    if (!bloco || bloco.type !== 'tool_use') {
      throw new Error('IA não retornou extração estruturada (tool_use ausente)')
    }
    return parseExtracao(bloco.input) // validação pura; nunca confia cegamente no retorno
  }
}
