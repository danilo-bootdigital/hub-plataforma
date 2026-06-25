'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navegacao } from '@/lib/navegacao'

type Props = {
  logoUrl?: string | null
}

export function Sidebar({ logoUrl }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex h-screen w-[248px] flex-col border-r bg-white shrink-0">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-5">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
        ) : (
          <span className="text-xl font-bold text-slate-800">BOOT CRM</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navegacao.map((item) => {
            const Icone = item.icone
            const ativo = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
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
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-slate-400 text-center">
          DPRIME Premium CRM
        </p>
      </div>
    </aside>
  )
}
