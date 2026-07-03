// DEC-019 / Sprint 2 — Motor de Regras.
// Determinístico, auditável, reproduzível e INDEPENDENTE do provedor de IA.
// A IA só extrai/explica; AQUI ficam TODAS as regras de negócio: pendências,
// motivos normalizados, score (0..100) e status_analise. NUNCA aprova (isso é
// decisão humana — Sprint 6). Sem Date.now interno: `hoje` é injetado.

import type {
  EntradaMotor,
  ResultadoConferencia,
  Pendencia,
  Severidade,
  ChecklistItem,
  ExtracaoReceita,
  OrcamentoContexto,
} from './tipos'

const PENALIDADE_BASE: Record<Severidade, number> = { critico: 40, aviso: 15, info: 5 }
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')

// --- helpers de normalização/parse (puros) ---
function norm(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function vazio(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === ''
}

// Aceita 'YYYY-MM-DD' e 'DD/MM/YYYY'. Retorna dias desde epoch (UTC) ou null.
function parseDataDias(v: unknown): number | null {
  const s = String(v ?? '').trim()
  let y: number, m: number, d: number
  let mt = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (mt) { y = +mt[1]; m = +mt[2]; d = +mt[3] }
  else {
    mt = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!mt) return null
    d = +mt[1]; m = +mt[2]; y = +mt[3]
  }
  const ms = Date.UTC(y, m - 1, d)
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / 86_400_000)
}

function nomesBatem(a: unknown, b: unknown): boolean {
  const x = norm(a), y = norm(b)
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x))
}

function itensBatemPorNome(ext: ExtracaoReceita, orc: OrcamentoContexto): boolean {
  // todo item do orçamento precisa ter correspondente na extração (por nome normalizado)
  return orc.itens.every((oi) => ext.itens.some((ei) => nomesBatem(ei.descricao, oi.descricao)))
}

export function conferir(entrada: EntradaMotor): ResultadoConferencia {
  const { checklist, extracao, orcamento, hoje } = entrada
  const limiar = entrada.limiarConfianca ?? 0.5
  const limiarIlegivel = entrada.limiarIlegivel ?? 0.3

  const pendencias: Pendencia[] = []
  let penalidade = 0

  const registrar = (p: Pendencia, item?: ChecklistItem) => {
    pendencias.push(p)
    const peso = item?.peso ?? 1
    penalidade += peso * PENALIDADE_BASE[p.severidade]
  }

  const getCampo = (item: ChecklistItem) => extracao.campos[item.config.campo ?? item.chave]

  for (const item of checklist.itens) {
    const valor = getCampo(item)

    switch (item.tipoRegra) {
      case 'presenca': {
        if (vazio(valor) && item.obrigatorio) {
          registrar({
            origem: 'regra', chave: item.chave, motivo: item.motivo, tipo: 'campo_ausente',
            severidade: item.severidade, mensagem: `${item.rotulo} ausente`,
          }, item)
        }
        break
      }

      case 'formato': {
        if (vazio(valor)) {
          if (item.obrigatorio) {
            registrar({
              origem: 'regra', chave: item.chave, motivo: item.motivo ?? 'data_ausente', tipo: 'campo_ausente',
              severidade: item.severidade, mensagem: `${item.rotulo} ausente`,
            }, item)
          }
          break
        }
        if (typeof item.config.validadeDias === 'number') {
          const emitida = parseDataDias(valor)
          const ref = parseDataDias(hoje)
          if (emitida !== null && ref !== null && ref - emitida > item.config.validadeDias) {
            registrar({
              origem: 'regra', chave: item.chave, motivo: 'receita_vencida', tipo: 'formato_invalido',
              severidade: item.severidade, mensagem: `${item.rotulo} vencida (> ${item.config.validadeDias} dias)`,
              esperado: `<= ${item.config.validadeDias} dias`, encontrado: String(valor),
            }, item)
          }
        }
        if (item.config.regex && !new RegExp(item.config.regex, 'i').test(String(valor))) {
          registrar({
            origem: 'regra', chave: item.chave, motivo: item.motivo, tipo: 'formato_invalido',
            severidade: item.severidade, mensagem: `${item.rotulo} em formato inválido`,
            esperado: item.config.regex, encontrado: String(valor),
          }, item)
        }
        break
      }

      case 'valor_esperado': {
        if (vazio(valor)) {
          if (item.obrigatorio) {
            registrar({
              origem: 'regra', chave: item.chave, motivo: item.motivo, tipo: 'campo_ausente',
              severidade: item.severidade, mensagem: `${item.rotulo} ausente`,
            }, item)
          }
          break
        }
        const permitidos = (item.config.valores ?? []).map(norm)
        const val = norm(valor)
        // Modo padrão: igualdade exata. Modo 'contem' (opt-in): casa por TOKEN ou substring —
        // útil p/ campos compostos (ex.: "via sc / subcutânea", "S.C."). Não altera as demais regras.
        let bate: boolean
        if (item.config.contem) {
          const compact = val.replace(/[^a-z0-9]/g, '')
          const tokens = val.split(/[^a-z0-9]+/).filter(Boolean)
          bate = permitidos.some((p) => {
            const pc = p.replace(/[^a-z0-9]/g, '')
            return !!pc && (compact === pc || tokens.includes(p) || (pc.length >= 3 && compact.includes(pc)))
          })
        } else {
          bate = permitidos.includes(val)
        }
        if (permitidos.length > 0 && !bate) {
          registrar({
            origem: 'regra', chave: item.chave, motivo: item.motivo, tipo: 'formato_invalido',
            severidade: item.severidade, mensagem: `${item.rotulo} fora do conjunto esperado`,
            esperado: (item.config.valores ?? []).join(' | '), encontrado: String(valor),
          }, item)
        }
        break
      }

      case 'limite_maximo': {
        // DOCUMENTAL: quantidade prescrita vs. limite máximo por receita do produto.
        // Não compara com orçamento. Quantidade vem do campo configurado ou do 1º item extraído.
        const limite = item.config.limiteMaximo
        if (typeof limite !== 'number') break
        const bruto = item.config.campo != null ? valor : extracao.itens[0]?.quantidade
        const qtd = typeof bruto === 'number' ? bruto : Number(String(bruto ?? '').replace(',', '.'))
        if (Number.isFinite(qtd) && qtd > limite) {
          registrar({
            origem: 'regra', chave: item.chave, motivo: item.motivo ?? 'limite_maximo_excedido',
            tipo: 'formato_invalido', severidade: item.severidade,
            mensagem: `${item.rotulo} acima do limite máximo por receita (${qtd} > ${limite})`,
            esperado: `<= ${limite}`, encontrado: String(qtd),
          }, item)
        }
        break
      }

      case 'comparacao_orcamento': {
        const alvo = item.config.alvo ?? 'produto'
        if (alvo === 'produto') {
          if (!itensBatemPorNome(extracao, orcamento)) {
            registrar({
              origem: 'regra', chave: item.chave, motivo: 'produto_divergente', tipo: 'divergencia',
              severidade: item.severidade, mensagem: 'Produto da receita não confere com o orçamento',
            }, item)
          }
        } else if (alvo === 'quantidade') {
          const tol = item.config.tolerancia ?? 0
          const diverge = orcamento.itens.some((oi) => {
            const ei = extracao.itens.find((e) => nomesBatem(e.descricao, oi.descricao))
            return ei != null && ei.quantidade != null && Math.abs(ei.quantidade - oi.quantidade) > tol
          })
          if (diverge) {
            registrar({
              origem: 'regra', chave: item.chave, motivo: 'quantidade_divergente', tipo: 'divergencia',
              severidade: item.severidade, mensagem: 'Quantidade da receita diverge do orçamento',
            }, item)
          }
        } else if (alvo === 'concentracao') {
          const diverge = orcamento.itens.some((oi) => {
            const ei = extracao.itens.find((e) => nomesBatem(e.descricao, oi.descricao))
            return ei != null && !vazio(oi.concentracao) && norm(ei.concentracao) !== norm(oi.concentracao)
          })
          if (diverge) {
            registrar({
              origem: 'regra', chave: item.chave, motivo: 'concentracao_divergente', tipo: 'divergencia',
              severidade: item.severidade, mensagem: 'Concentração/dose diverge do orçamento',
            }, item)
          }
        } else if (alvo === 'paciente') {
          if (!vazio(orcamento.nomeCliente) && !nomesBatem(valor, orcamento.nomeCliente)) {
            registrar({
              origem: 'regra', chave: item.chave, motivo: item.motivo ?? 'paciente_ausente', tipo: 'divergencia',
              severidade: item.severidade, mensagem: 'Paciente da receita diverge do cliente do orçamento',
              esperado: String(orcamento.nomeCliente), encontrado: String(valor ?? ''),
            }, item)
          }
        }
        break
      }
    }
  }

  // Confiança de extração
  const ilegivel = extracao.confianca < limiarIlegivel
  const baixaConfianca = extracao.confianca < limiar
  if (ilegivel) {
    registrar({
      origem: 'extracao', chave: null, motivo: 'documento_ilegivel', tipo: 'ilegivel',
      severidade: 'critico', mensagem: `Confiança de extração muito baixa (${extracao.confianca})`,
    })
  } else if (baixaConfianca) {
    registrar({
      origem: 'extracao', chave: null, motivo: null, tipo: 'suspeita',
      severidade: 'aviso', mensagem: `Confiança de extração abaixo do limiar (${extracao.confianca})`,
    })
  }

  const score = Math.max(0, Math.min(100, 100 - Math.round(penalidade)))

  // Precedência de status (rótulo de triagem; NUNCA aprova):
  // ilegivel > precisa_de_revisao_humana (baixa confiança) > divergente_do_orcamento
  // > pendencias_encontradas > sem_pendencias_aparentes
  const temDivergenciaOrcamento = pendencias.some((p) => p.tipo === 'divergencia')
  let status: ResultadoConferencia['status']
  if (ilegivel) status = 'ilegivel'
  else if (baixaConfianca) status = 'precisa_de_revisao_humana'
  else if (temDivergenciaOrcamento) status = 'divergente_do_orcamento'
  else if (pendencias.length > 0) status = 'pendencias_encontradas'
  else status = 'sem_pendencias_aparentes'

  return { status, score, pendencias }
}
