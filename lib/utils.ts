import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatarMoeda(valor: number | null | undefined) {
  return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Valida e normaliza telefone para formato internacional (5511999999999).
 * Aceita: (11)99999-9999, 11999999999, 5511999999999, +5511999999999
 */
export function validarTelefone(tel: string): { valido: boolean; formatado: string } {
  // Remove tudo que não é dígito
  const digitos = tel.replace(/\D/g, '')

  // Se já tem 55 + DDD + número (12 ou 13 dígitos)
  if (digitos.length === 12 || digitos.length === 13) {
    if (digitos.startsWith('55')) {
      return { valido: true, formatado: digitos }
    }
  }

  // Se tem DDD + número (10 ou 11 dígitos)
  if (digitos.length === 10 || digitos.length === 11) {
    const ddd = digitos.slice(0, 2)
    const numero = digitos.slice(2)
    if (parseInt(ddd) >= 11 && parseInt(ddd) <= 99 && (numero.length === 8 || numero.length === 9)) {
      return { valido: true, formatado: `55${digitos}` }
    }
  }

  return { valido: false, formatado: '' }
}
