/**
 * Formata telefone normalizado para exibição
 * 5511999998888 → (11) 99999-8888
 * 551199998888 → (11) 9999-8888
 */
export function formatarTelefone(tel: string): string {
  if (!tel) return ''
  // Remove tudo que não é dígito
  const digits = tel.replace(/\D/g, '')

  // Remover código do país (55) se presente
  const semPais = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits

  if (semPais.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 7)}-${semPais.slice(7)}`
  }
  if (semPais.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${semPais.slice(0, 2)}) ${semPais.slice(2, 6)}-${semPais.slice(6)}`
  }
  // Fallback: retorna como está
  return tel
}

/**
 * Retorna nome para exibição. Nunca retorna número cru.
 */
export function nomeExibicao(nome: string | null | undefined, telefone: string): string {
  if (nome && nome.trim() && !pareceTelefone(nome)) {
    return nome.trim()
  }
  const formatado = formatarTelefone(telefone)
  return formatado ? `Contato ${formatado}` : 'Contato sem identificação'
}

/**
 * Gera iniciais para avatar (2 letras)
 */
export function iniciais(nome: string): string {
  if (!nome || pareceTelefone(nome)) return '?'
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) {
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  }
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase()
  }
  return '?'
}

/**
 * Verifica se uma string parece ser um telefone (só dígitos ou formato +XX)
 */
function pareceTelefone(str: string): boolean {
  const limpo = str.replace(/[\s\-\(\)\+]/g, '')
  return /^\d{8,15}$/.test(limpo)
}

/**
 * Extrai DDD+número (sem DDI 55) para comparação normalizada
 */
export function normalizarParaBusca(tel: string): string {
  const digits = tel.replace(/\D/g, '')
  if (digits.length >= 12 && digits.startsWith('55')) {
    return digits.slice(2)
  }
  return digits
}

/**
 * Compara dois telefones considerando variações de formato e nono dígito
 */
export function telefonesIguais(tel1: string, tel2: string): boolean {
  const a = normalizarParaBusca(tel1)
  const b = normalizarParaBusca(tel2)
  if (a === b) return true
  // Nono dígito: 11 dígitos vs 10 (celular com/sem 9)
  if (a.length === 11 && b.length === 10 && a.slice(0, 2) === b.slice(0, 2) && a.slice(3) === b.slice(2)) return true
  if (b.length === 11 && a.length === 10 && b.slice(0, 2) === a.slice(0, 2) && b.slice(3) === a.slice(2)) return true
  return false
}
