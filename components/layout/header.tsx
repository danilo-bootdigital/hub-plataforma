import { createClient } from '@/lib/supabase/server'
import { BadgePerfil } from '@/components/usuarios/badge-perfil'
import { SidebarMobile } from '@/components/layout/sidebar-mobile'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BotaoSair } from '@/components/layout/botao-sair'
import { BotaoDisponibilidade } from '@/components/distribuicao/botao-disponibilidade'
import type { UserRole } from '@/types/database'

export async function Header({ logoUrl }: { logoUrl?: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, cargo, disponivel')
    .eq('id', user?.id ?? '')
    .single()

  const iniciais = profile?.nome
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() ?? '?'

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
      <SidebarMobile logoUrl={logoUrl} />

      <div className="flex items-center gap-3 md:gap-4">
        {profile?.cargo && (
          <BotaoDisponibilidade
            disponivel={profile.disponivel ?? true}
            cargo={profile.cargo as UserRole}
          />
        )}
        {profile?.cargo && (
          <span className="hidden sm:block">
            <BadgePerfil perfil={profile.cargo as UserRole} />
          </span>
        )}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-700 leading-tight">
              {profile?.nome ?? user?.email}
            </p>
            <p className="text-xs text-slate-400">Online</p>
          </div>
          <Avatar className="h-9 w-9 border-2 border-slate-100">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
              {iniciais}
            </AvatarFallback>
          </Avatar>
        </div>
        <BotaoSair />
      </div>
    </header>
  )
}
