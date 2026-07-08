import { createClient } from '@/lib/supabase/server'
import { BadgePerfil } from '@/components/usuarios/badge-perfil'
import { SidebarMobile } from '@/components/layout/sidebar-mobile'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BotaoSair } from '@/components/layout/botao-sair'
import { SinoNotificacoes } from '@/components/layout/sino-notificacoes'
import { BotaoDisponibilidade } from '@/components/distribuicao/botao-disponibilidade'
import type { UserRole } from '@/types/database'

type Perm = { total?: boolean; permissoes?: Record<string, string[]> } | null

export async function Header({ logoUrl, permissoes }: { logoUrl?: string | null; permissoes?: Perm }) {
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
    <header className="flex h-16 items-center border-b bg-white px-4 md:px-8">
      <SidebarMobile logoUrl={logoUrl} cargo={profile?.cargo} permissoes={permissoes} />

      {/* BLOCO 1 — Badge do perfil (largura fixa ~220px) */}
      <div className="hidden w-[220px] shrink-0 items-center sm:flex">
        {profile?.cargo && <BadgePerfil perfil={profile.cargo as UserRole} />}
      </div>

      <Divisor />

      {/* BLOCO 2 — Nome do usuário + status Online (largura flexível) */}
      <div className="flex flex-1 flex-col justify-center sm:px-2">
        <div className="hidden sm:block">
          <p className="text-sm font-medium leading-tight text-slate-700">
            {profile?.nome ?? user?.email}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </p>
        </div>
      </div>

      <Divisor />

      {/* BLOCO 3 — Notificações + Avatar (próximos, gap ~16px) */}
      <div className="flex items-center gap-4 sm:px-2">
        {profile?.cargo && (
          <BotaoDisponibilidade
            disponivel={profile.disponivel ?? true}
            cargo={profile.cargo as UserRole}
          />
        )}
        <SinoNotificacoes />
        <Avatar className="h-9 w-9 border-2 border-slate-100">
          <AvatarFallback className="bg-[var(--brand-accent)] text-[var(--brand-primary)] text-sm font-semibold">
            {iniciais}
          </AvatarFallback>
        </Avatar>
      </div>

      <Divisor />

      {/* BLOCO 4 — Botão Sair (totalmente à direita) */}
      <div className="flex items-center">
        <BotaoSair />
      </div>
    </header>
  )
}

/** Divisor vertical discreto entre os grupos do cabeçalho (#E5E7EB). */
function Divisor() {
  return <div className="mx-4 hidden h-8 w-px bg-[#E5E7EB] sm:block md:mx-6" />
}
