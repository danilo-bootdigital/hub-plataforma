// DEC-019 / MVP-4 — Factory de provedor de IA (provider-agnostic).
// Nenhum módulo acessa o SDK diretamente: sempre via ExtratorReceita.
// Inicial: Claude. openai/gemini/azure/local ficam para o futuro (interface pronta).

import type { ExtratorReceita, ComparadorPosologia, ProvedorIA } from '../tipos'
import { ClaudeExtrator } from './claude'
import { ClaudeComparador } from './comparador-claude'

export function criarExtrator(provedor: ProvedorIA = 'claude'): ExtratorReceita {
  switch (provedor) {
    case 'claude':
      return new ClaudeExtrator()
    case 'openai':
    case 'gemini':
    case 'azure':
    case 'local':
      throw new Error(`Provedor de IA ainda não implementado: ${provedor}`)
    default:
      throw new Error(`Provedor de IA desconhecido: ${provedor as string}`)
  }
}

export function criarComparador(provedor: ProvedorIA = 'claude'): ComparadorPosologia {
  switch (provedor) {
    case 'claude':
      return new ClaudeComparador()
    case 'openai':
    case 'gemini':
    case 'azure':
    case 'local':
      throw new Error(`Comparador de IA ainda não implementado: ${provedor}`)
    default:
      throw new Error(`Comparador de IA desconhecido: ${provedor as string}`)
  }
}
