// DEC-019 / MVP-4 — Extrator MOCK (para testes/fixtures e dev local, sem IA real).
// Devolve uma extração fixa; útil para exercitar o pipeline IA→motor→diagnóstico.

import type { ExtratorReceita, EntradaExtracao } from '../tipos'
import type { ExtracaoReceita } from '../../conferencia/tipos'

export class MockExtrator implements ExtratorReceita {
  readonly id = 'local' as const
  constructor(private readonly fixture: ExtracaoReceita) {}
  async extrair(_entrada: EntradaExtracao): Promise<ExtracaoReceita> {
    return this.fixture
  }
}
