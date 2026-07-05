import type { CSSProperties } from 'react'

// Estilo inline com as variáveis de marca (white-label — DEC-021 Config-2).
// Retorna {} quando não há cor válida → os componentes usam o default (verde do sistema).
export function estiloMarca(corPrimaria?: string | null): CSSProperties {
  const cor = (corPrimaria ?? '').trim()
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cor)) return {}
  return {
    // Realces da navegação
    '--brand-primary': cor,
    '--brand-accent': `color-mix(in srgb, ${cor} 12%, white)`,
    // Tokens do design system (botões primários, ring, ícones, etc.)
    '--primary': cor,
    '--ring': cor,
    '--color-primary': cor,
    '--color-primary-soft': `color-mix(in srgb, ${cor} 12%, white)`,
    '--color-primary-hover': `color-mix(in srgb, ${cor} 85%, black)`,
  } as CSSProperties
}
