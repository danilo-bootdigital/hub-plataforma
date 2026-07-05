'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ChevronDown, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navegacaoParaPerfil, type ItemNavegacao } from '@/lib/navegacao'
import { itemAtivo, useGrupoAberto } from './menu-shared'

type Perm = { total?: boolean; permissoes?: Record<string, string[]> } | null

type Props = {
  logoUrl?: string | null
  cargo?: string | null
  permissoes?: Perm
}

// Link de menu (1º nível ou subitem). `aninhado` reduz o padding vertical.
function LinkMenu({
  item,
  pathname,
  aninhado,
  onNavegar,
}: {
  item: ItemNavegacao
  pathname: string
  aninhado?: boolean
  onNavegar: () => void
}) {
  const Icone = item.icone
  const ativo = itemAtivo(item.href, pathname)
  return (
    <Link
      href={item.href!}
      onClick={onNavegar}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        aninhado && 'py-1.5',
        ativo
          ? 'bg-slate-100 text-slate-900'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      )}
    >
      <Icone className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  )
}

// Grupo expansível no menu mobile. Abre automaticamente se um filho estiver ativo.
function GrupoMenu({
  item,
  pathname,
  onNavegar,
}: {
  item: ItemNavegacao
  pathname: string
  onNavegar: () => void
}) {
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
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          algumAtivo ? 'text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        )}
      >
        <Icone className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200', aberto && 'rotate-180')} />
      </button>
      {aberto && (
        <ul className="mt-1 ml-3 space-y-1 border-l border-slate-100 pl-2">
          {filhos.map((filho) => (
            <li key={filho.href}>
              <LinkMenu item={filho} pathname={pathname} aninhado onNavegar={onNavegar} />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function SidebarMobile({ logoUrl, cargo, permissoes }: Props) {
  const [aberto, setAberto] = useState(false)
  const pathname = usePathname()
  const itens = navegacaoParaPerfil(cargo, permissoes)
  const fechar = () => setAberto(false)

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" />
        }
      >
        {/* Botão hambúrguer: só aparece em mobile (oculto em md+) */}
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="flex h-16 justify-center border-b px-6">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
          ) : (
            <SheetTitle className="text-xl font-bold text-slate-900">Hub Plataforma</SheetTitle>
          )}
        </SheetHeader>
        <nav className="overflow-y-auto p-4">
          <ul className="space-y-1">
            {itens.map((item) =>
              item.children ? (
                <GrupoMenu key={item.label} item={item} pathname={pathname} onNavegar={fechar} />
              ) : (
                <li key={item.href}>
                  <LinkMenu item={item} pathname={pathname} onNavegar={fechar} />
                </li>
              )
            )}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
