/**
 * Helpers de formatação exclusivos do Painel Gerencial da Indústria.
 * `formatarMoeda` continua vindo de lib/utils.ts (fonte única); aqui ficam
 * apenas os formatos ainda inexistentes no projeto (número, percentual, data).
 */

/** Número inteiro no padrão pt-BR (ex.: 1234 → "1.234"). */
export function formatarNumero(valor: number | null | undefined): string {
  return (valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/**
 * Variação percentual com sinal (ex.: 12 → "+12%", -3 → "-3%").
 * Retorna undefined quando não há base de comparação, para o card ocultar o selo.
 */
export function formatarPercentual(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—'
  const arred = Math.round(valor)
  return `${arred > 0 ? '+' : ''}${arred}%`
}

/** Data curta pt-BR (ex.: "05/07/2026"). */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

/**
 * Data relativa amigável (ex.: "há 3 dias", "há 2 h", "agora").
 * Base para timeline e coluna "Último acesso".
 */
export function formatarDataRelativa(iso: string | null | undefined): string {
  if (!iso) return 'nunca'
  const agora = Date.now()
  const alvo = new Date(iso).getTime()
  const seg = Math.floor((agora - alvo) / 1000)

  if (seg < 60) return 'agora'
  const min = Math.floor(seg / 60)
  if (min < 60) return `há ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(meses / 12)
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`
}

/** Diferença em dias inteiros entre agora e a data (null → Infinity). */
export function diasDesde(iso: string | null | undefined): number {
  if (!iso) return Infinity
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

/**
 * Variação percentual entre período atual e anterior.
 * Convenção: sem base anterior (0) e com atual > 0 → +100%; ambos 0 → 0%.
 */
export function calcularVariacao(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0
  return ((atual - anterior) / anterior) * 100
}
