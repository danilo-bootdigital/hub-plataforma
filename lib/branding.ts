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

// Tema fixo do acesso da INDÚSTRIA (admin/gestor/legado): azul-marinho +
// salmão claro como cores principais. Diferente do white-label do Hub
// (estiloMarca), aqui o tom "soft"/accent é o salmão da marca — não um
// derivado do primário.
const INDUSTRIA_PRIMARIA = '#1a4873'
const INDUSTRIA_ACCENT = '#F2D0C7'

export function estiloIndustria(): CSSProperties {
  return {
    // Realces da navegação (sidebar consome --brand-primary / --brand-accent)
    '--brand-primary': INDUSTRIA_PRIMARIA,
    '--brand-accent': INDUSTRIA_ACCENT,
    // Tokens do design system (botões primários, ring, ícones, etc.)
    '--primary': INDUSTRIA_PRIMARIA,
    '--primary-foreground': '#FFFFFF',
    '--ring': INDUSTRIA_PRIMARIA,
    '--color-primary': INDUSTRIA_PRIMARIA,
    '--color-primary-soft': INDUSTRIA_ACCENT,
    '--color-primary-hover': `color-mix(in srgb, ${INDUSTRIA_PRIMARIA} 85%, black)`,
    // Accent do shadcn (hover de itens/menus) e sidebar coesos com a marca
    '--accent': INDUSTRIA_ACCENT,
    '--accent-foreground': INDUSTRIA_PRIMARIA,
    '--sidebar-primary': INDUSTRIA_PRIMARIA,
    '--sidebar-accent': INDUSTRIA_ACCENT,
    '--sidebar-accent-foreground': INDUSTRIA_PRIMARIA,
    '--sidebar-ring': INDUSTRIA_PRIMARIA,
  } as CSSProperties
}
