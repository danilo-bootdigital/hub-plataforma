import {
  LayoutDashboard, Users, TrendingUp, UserCheck,
  MessageCircle, CheckSquare, FileText, Inbox,
  BarChart3, Settings, Package, Building2, Briefcase, Network, Wallet, Contact, ClipboardList, PackageCheck, type LucideIcon
} from 'lucide-react'
import type { UserRole } from '@/types/database'

export type ItemNavegacao = {
  label: string
  href: string
  icone: LucideIcon
  // Se omitido, o item pertence aos perfis legados (operação da Indústria).
  // Se preenchido, o item só aparece para os perfis listados.
  perfis?: UserRole[]
}

// Perfis legados (operação atual da Indústria) — comportamento inalterado.
const PERFIS_LEGADOS: UserRole[] = ['admin', 'gestor', 'vendedor', 'atendimento', 'financeiro', 'suporte']

export const navegacao: ItemNavegacao[] = [
  { label: 'Caixa de Entrada', href: '/caixa-de-entrada', icone: Inbox },
  { label: 'Painel Principal', href: '/painel', icone: LayoutDashboard },
  { label: 'Leads', href: '/leads', icone: Users },
  { label: 'Pipeline de Vendas', href: '/pipeline', icone: TrendingUp },
  { label: 'Contatos', href: '/contatos', icone: UserCheck },
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
  // Áreas iniciais dos novos perfis (placeholder — Fatia 03)
  { label: 'Área do Hub', href: '/hub', icone: Building2, perfis: ['proprietario_hub'] },
  { label: 'Assistentes', href: '/hub/assistentes', icone: Users, perfis: ['proprietario_hub'] },
  { label: 'Carteiras', href: '/hub/carteiras', icone: Wallet, perfis: ['proprietario_hub'] },
  { label: 'Clientes', href: '/hub/clientes', icone: Contact, perfis: ['proprietario_hub'] },
  { label: 'Minha Área', href: '/assistente', icone: Briefcase, perfis: ['assistente'] },
  { label: 'Clientes', href: '/assistente/clientes', icone: Contact, perfis: ['assistente'] },
  { label: 'Atendimentos', href: '/assistente/atendimentos', icone: ClipboardList, perfis: ['assistente'] },
  { label: 'Orçamentos', href: '/assistente/orcamentos', icone: FileText, perfis: ['assistente'] },
  { label: 'Pré-pedidos', href: '/assistente/prepedidos', icone: PackageCheck, perfis: ['assistente'] },
]

// Retorna os itens de menu visíveis para o cargo informado.
// Itens sem `perfis` são exibidos aos perfis legados (comportamento atual preservado).
export function navegacaoParaPerfil(cargo?: string | null): ItemNavegacao[] {
  if (!cargo) return navegacao.filter((item) => !item.perfis)
  return navegacao.filter((item) =>
    item.perfis
      ? item.perfis.includes(cargo as UserRole)
      : PERFIS_LEGADOS.includes(cargo as UserRole)
  )
}
