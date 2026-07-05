import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isWebhookRoute = request.nextUrl.pathname.startsWith('/api/webhook')
  const isStaticAsset = request.nextUrl.pathname.startsWith('/_next') ||
                       request.nextUrl.pathname.startsWith('/favicon.ico') ||
                       request.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  const isTestRoute = request.nextUrl.pathname.startsWith('/whatsapp/test')

  // Rotas públicas que não requerem verificação
  if (isStaticAsset || isWebhookRoute || isTestRoute) {
    return NextResponse.next({ request })
  }

  // Se for login, permite o acesso sem verificação
  if (isLoginPage) {
    return NextResponse.next({ request })
  }

  try {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Usuário autenticado tentando acessar login - redirecionar para dashboard
    if (user && isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Usuário não autenticado tentando acessar rotas protegidas
    if (!user) {
      console.log('Usuário não autenticado, redirecionando para login')
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // RBAC (DEC-015): guard de rota por permissão da Função — SÓ Assistente.
    // Fail-open: erro/sem dado não bloqueia; rotas não mapeadas passam.
    const path = request.nextUrl.pathname

    // DEC-022 — Separação Administração (Indústria) × Operação (Hub).
    // Indústria (admin/gestor) NÃO acessa operação; Hub (proprietario_hub/assistente)
    // NÃO acessa administração. Enforcement por path: cobre páginas, Server Actions
    // (POST na própria rota) e APIs (/api/*). Bloqueio direto — não confia no menu.
    const { data: perfilCargo } = await supabase
      .from('profiles').select('cargo').eq('id', user.id).single()
    const cargo = perfilCargo?.cargo
    const ehIndustria = cargo === 'admin' || cargo === 'gestor'
    const ehHub = cargo === 'proprietario_hub' || cargo === 'assistente'
    const OPERACIONAL = [
      '/caixa-de-entrada', '/leads', '/pipeline', '/tarefas', '/pedidos',
      '/whatsapp', '/monitoramento-whatsapp', '/configuracoes-whatsapp', '/configuracoes/whatsapp',
      '/orcamentos', '/hub', '/assistente', '/api/orcamentos', '/api/whatsapp',
    ]
    const ADMIN = [
      '/painel', '/relatorios', '/clientes',
      '/configuracoes/hubs', '/configuracoes/carteiras', '/configuracoes/portfolios',
      '/configuracoes/produtos', '/configuracoes/usuarios', '/configuracoes/cadastro-clientes',
      '/configuracoes/empresa', '/configuracoes/distribuicao', '/configuracoes/fornecedores',
    ]
    const bate = (lista: string[]) => lista.some((p) => path === p || path.startsWith(p + '/'))
    if (ehIndustria && bate(OPERACIONAL)) {
      const url = request.nextUrl.clone(); url.pathname = '/painel'
      return NextResponse.redirect(url)
    }
    if (ehHub && (path === '/configuracoes' || bate(ADMIN))) {
      const url = request.nextUrl.clone(); url.pathname = '/hub'
      return NextResponse.redirect(url)
    }

    const ROTA_MODULO: Array<[string, string]> = [
      ['/assistente/clientes', 'clientes'],
      ['/assistente/orcamentos', 'orcamentos'],
      ['/hub/orcamentos', 'orcamentos'],
      ['/assistente/prepedidos', 'pedidos'],
      ['/hub/produtos', 'produtos'],
    ]
    const alvo = ROTA_MODULO.find(([p]) => path === p || path.startsWith(p + '/'))
    if (alvo) {
      const { data: perm } = await supabase.rpc('minhas_permissoes')
      if (perm && perm.perfil === 'assistente' && !perm.total) {
        const acoes: string[] = perm.permissoes?.[alvo[1]] ?? []
        if (!acoes.includes('visualizar')) {
          const url = request.nextUrl.clone()
          url.pathname = '/assistente'
          return NextResponse.redirect(url)
        }
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}