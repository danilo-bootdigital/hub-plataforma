'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navegacao } from '@/lib/navegacao'

type Props = {
  logoUrl?: string | null
}

export function SidebarMobile({ logoUrl }: Props) {
  const [aberto, setAberto] = useState(false)
  const pathname = usePathname()

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
            <SheetTitle className="text-xl font-bold text-slate-900">BOOT CRM</SheetTitle>
          )}
        </SheetHeader>
        <nav className="overflow-y-auto p-4">
          <ul className="space-y-1">
            {navegacao.map((item) => {
              const Icone = item.icone
              const ativo = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setAberto(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      ativo
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <Icone className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
