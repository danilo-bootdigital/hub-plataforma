'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navegacaoParaPerfil, type ItemNavegacao } from '@/lib/navegacao'
import { itemAtivo, useGrupoAberto } from './menu-shared'

type Perm = { total?: boolean; permissoes?: Record<string, string[]> } | null

type Props = {
  logoUrl?: string | null
  cargo?: string | null
  permissoes?: Perm
}

// Link de menu (1º nível ou subitem de grupo). `aninhado` reduz o padding vertical.
function LinkMenu({ item, pathname, aninhado }: { item: ItemNavegacao; pathname: string; aninhado?: boolean }) {
  const Icone = item.icone
  const ativo = itemAtivo(item.href, pathname)
  return (
    <Link
      href={item.href!}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200',
        aninhado ? 'py-2' : 'py-2.5',
        ativo
          ? 'bg-emerald-50 text-emerald-700 font-medium'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      )}
    >
      {/* Active indicator bar */}
      {ativo && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-600" />
      )}
      <Icone className={cn(
        'h-[18px] w-[18px] shrink-0 transition-colors',
        ativo ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-700'
      )} />
      <span className="flex-1">{item.label}</span>
      {/* Badge placeholder for future notifications */}
      {item.href === '/caixa-de-entrada' && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[11px] font-semibold text-emerald-700">
          12
        </span>
      )}
      {item.href === '/whatsapp' && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[11px] font-semibold text-blue-700">
          5
        </span>
      )}
    </Link>
  )
}

// Grupo recolhível (ex.: "Configurações"). Começa aberto quando um filho está ativo.
function GrupoMenu({ item, pathname }: { item: ItemNavegacao; pathname: string }) {
  const Icone = item.icone
  const filhos = item.children ?? []
  const { aberto, alternar, algumAtivo } = useGrupoAberto(item, pathname)

  return (
    <li>
      <button
        type="button"
        aria-expanded={aberto}
        onClick={alternar}
        className={cn(
          'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          algumAtivo ? 'text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        )}
      >
        <Icone className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors',
          algumAtivo ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-700'
        )} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn(
          'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
          aberto && 'rotate-180'
        )} />
      </button>
      {aberto && (
        <ul className="mt-1 ml-4 space-y-1 border-l border-slate-100 pl-2">
          {filhos.map((filho) => (
            <li key={filho.href}>
              <LinkMenu item={filho} pathname={pathname} aninhado />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function Sidebar({ logoUrl, cargo, permissoes }: Props) {
  const pathname = usePathname()
  const itens = navegacaoParaPerfil(cargo, permissoes)

  return (
    <aside className="hidden md:flex h-screen w-[248px] flex-col border-r bg-white shrink-0">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-5">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
        ) : (
          <span className="text-xl font-bold text-slate-800">Hub Plataforma</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {itens.map((item) =>
            item.children ? (
              <GrupoMenu key={item.label} item={item} pathname={pathname} />
            ) : (
              <li key={item.href}>
                <LinkMenu item={item} pathname={pathname} />
              </li>
            )
          )}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-slate-400 text-center">
          Hub Plataforma
        </p>
      </div>
    </aside>
  )
}
