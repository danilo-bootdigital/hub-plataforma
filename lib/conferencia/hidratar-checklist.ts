// DEC-019 / MVP-5′ — Hidratação do checklist a partir dos METADADOS de validação do PRODUTO.
// PURO (sem IO/DB). Onde uma regra declara `origemValores: "<chave>"`, o helper busca o
// metadado `<chave>` (product_validation_metadata) e injeta na config:
//   • tipo 'lista'  → config.valores      (valor_esperado)
//   • tipo 'numero' → config.limiteMaximo (limite_maximo)
//   • tipo 'texto'  → config.valores = [valorTexto]
// Para 'medicamento_aliases', product.nome entra como alias implícito (primeiro da lista).
// Metadado INATIVO é ignorado. Metadado ausente → não injeta (motor vira no-op seguro).
//
// O MOTOR NÃO MUDA e NÃO conhece product_validation_metadata: quem conhece o produto é a
// composição (server action), que chama este helper ANTES de conferir().

import type { Checklist } from './tipos'

export type MetadadoTipo = 'lista' | 'numero' | 'texto'

export interface MetadadoValidacao {
  chave: string
  tipo: MetadadoTipo
  valores?: string[] | null
  valorNum?: number | null
  valorTexto?: string | null
  ativo?: boolean // default true; inativo é ignorado
}

export interface ProdutoRef {
  nome: string | null
}

const CHAVE_ALIASES = 'medicamento_aliases'
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')

// Normalização apenas para DEDUP (o motor normaliza de novo na comparação).
function normChave(v: string): string {
  return v.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

function dedup(valores: string[]): string[] {
  const vistos = new Set<string>()
  const out: string[] = []
  for (const v of valores) {
    if (typeof v !== 'string' || v.trim() === '') continue
    const k = normChave(v)
    if (!vistos.has(k)) {
      vistos.add(k)
      out.push(v)
    }
  }
  return out
}

// Retorna um NOVO checklist com os itens `origemValores` hidratados a partir dos metadados
// ATIVOS do produto. Itens sem `origemValores` (ou sem metadado correspondente) ficam intactos.
export function hidratarChecklistComMetadadosProduto(
  checklist: Checklist,
  produto: ProdutoRef,
  metadados: MetadadoValidacao[]
): Checklist {
  const porChave = new Map<string, MetadadoValidacao>()
  for (const m of metadados) {
    if (m.ativo !== false) porChave.set(m.chave, m)
  }

  const itens = checklist.itens.map((item) => {
    const chave = item.config.origemValores
    if (!chave) return item
    const m = porChave.get(chave)
    if (!m) return item // metadado ausente/inativo → não injeta (motor vira no-op seguro)

    if (m.tipo === 'lista') {
      const base = chave === CHAVE_ALIASES && produto.nome ? [produto.nome] : []
      const valores = dedup([...base, ...(m.valores ?? [])])
      return { ...item, config: { ...item.config, valores } }
    }
    if (m.tipo === 'numero') {
      return typeof m.valorNum === 'number'
        ? { ...item, config: { ...item.config, limiteMaximo: m.valorNum } }
        : item
    }
    // tipo 'texto'
    return { ...item, config: { ...item.config, valores: m.valorTexto ? [m.valorTexto] : [] } }
  })

  return { ...checklist, itens }
}
