import {
  LayoutDashboard, Users, TrendingUp, UserCheck,
  MessageCircle, CheckSquare, FileText, Inbox,
  BarChart3, Settings, Package, Building2, Briefcase, Network, Wallet, Contact, ClipboardList, PackageCheck, Layers, ShieldCheck, type LucideIcon
} from 'lucide-react'
import type { UserRole } from '@/types/database'

export type ItemNavegacao = {
  label: string
  href: string
  icone: LucideIcon
  // Se omitido, o item pertence aos perfis legados (operação da Indústria).
  // Se preenchido, o item só aparece para os perfis listados.
  perfis?: UserRole[]
  // Módulo RBAC (DEC-015). Quando definido, o item só aparece ao Assistente se a
  // Função conceder 'visualizar' nesse módulo. Ignorado para os demais perfis.
  modulo?: string
}

// Permissões resolvidas (forma estrutural — evita importar código de servidor).
type PermInput = { total?: boolean; permissoes?: Record<string, string[]> } | null | undefined

// Perfis legados (operação atual da Indústria) — comportamento inalterado.
const PERFIS_LEGADOS: UserRole[] = ['admin', 'gestor', 'vendedor', 'atendimento', 'financeiro', 'suporte']

export const navegacao: ItemNavegacao[] = [
  { label: 'Caixa de Entrada', href: '/caixa-de-entrada', icone: Inbox },
  { label: 'Painel Principal', href: '/painel', icone: LayoutDashboard },
  { label: 'Leads', href: '/leads', icone: Users },
  { label: 'Pipeline de Vendas', href: '/pipeline', icone: TrendingUp },
  { label: 'Clientes', href: '/clientes', icone: UserCheck },
  { label: 'WhatsApp', href: '/whatsapp', icone: MessageCircle },
  { label: 'Tarefas', href: '/tarefas', icone: CheckSquare },
  { label: 'Orçamentos', href: '/orcamentos', icone: FileText },
  { label: 'Pedidos', href: '/pedidos', icone: Package },
  { label: 'Relatórios', href: '/relatorios', icone: BarChart3 },
  { label: 'Configurações', href: '/configuracoes', icone: Settings },
  // Hubs — gestão pela Indústria (Fatia 04)
  { label: 'Hubs', href: '/configuracoes/hubs', icone: Network, perfis: ['admin', 'gestor'] },
  // Carteiras — gestão pela Indústria (Fatia 05)
  { label: 'Carteiras', href: '/configuracoes/carteiras', icone: Wallet, perfis: ['admin', 'gestor'] },
  // Portfólios — catálogo da Indústria (DEC-012 / Expand E4)
  { label: 'Portfólios', href: '/configuracoes/portfolios', icone: Layers, perfis: ['admin', 'gestor'] },
  // Áreas iniciais dos novos perfis (placeholder — Fatia 03)
  { label: 'Área do Hub', href: '/hub', icone: Building2, perfis: ['proprietario_hub'] },
  // Consulta operacional de Produtos (Hub) — DEC-013/014; sem CRUD
  { label: 'Produtos', href: '/hub/produtos', icone: Package, perfis: ['proprietario_hub', 'assistente'], modulo: 'produtos' },
  // Orçamentos — área operacional do Hub (DEC-017); escopo por hub_id no servidor.
  { label: 'Orçamentos', href: '/hub/orcamentos', icone: FileText, perfis: ['proprietario_hub', 'assistente'], modulo: 'orcamentos' },
  { label: 'Identidade', href: '/hub/identidade', icone: Building2, perfis: ['proprietario_hub'] },
  { label: 'Assistentes', href: '/hub/assistentes', icone: Users, perfis: ['proprietario_hub'] },
  { label: 'Funções', href: '/hub/funcoes', icone: ShieldCheck, perfis: ['proprietario_hub'] },
  { label: 'Carteiras', href: '/hub/carteiras', icone: Wallet, perfis: ['proprietario_hub'] },
  { label: 'Clientes', href: '/hub/clientes', icone: Contact, perfis: ['proprietario_hub'] },
  { label: 'Minha Área', href: '/assistente', icone: Briefcase, perfis: ['assistente'], modulo: 'dashboard' },
  { label: 'Clientes', href: '/assistente/clientes', icone: Contact, perfis: ['assistente'], modulo: 'clientes' },
  { label: 'Atendimentos', href: '/assistente/atendimentos', icone: ClipboardList, perfis: ['assistente'] },
  // Orçamentos do assistente agora vivem em /hub/orcamentos (fluxo por Portfólio).
  // A rota legada /assistente/orcamentos permanece acessível por URL, fora do menu.
  { label: 'Pré-pedidos', href: '/assistente/prepedidos', icone: PackageCheck, perfis: ['assistente'], modulo: 'pedidos' },
]

// Retorna os itens de menu visíveis para o cargo informado.
// Itens sem `perfis` são exibidos aos perfis legados (comportamento atual preservado).
// Para o Assistente (DEC-015), aplica ainda o filtro por permissões da Função:
// itens com `modulo` só aparecem se a Função conceder 'visualizar' nele.
export function navegacaoParaPerfil(cargo?: string | null, permissoes?: PermInput): ItemNavegacao[] {
  const base = !cargo
    ? navegacao.filter((item) => !item.perfis)
    : navegacao.filter((item) =>
        item.perfis
          ? item.perfis.includes(cargo as UserRole)
          : PERFIS_LEGADOS.includes(cargo as UserRole)
      )

  // Filtro por Função — só Assistente; demais perfis inalterados. Fail-open:
  // sem permissões (ou total), não filtra.
  if (cargo === 'assistente' && permissoes && !permissoes.total) {
    return base.filter((item) =>
      !item.modulo || (permissoes.permissoes?.[item.modulo] ?? []).includes('visualizar')
    )
  }
  return base
}
