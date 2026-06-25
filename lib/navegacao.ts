import {
  LayoutDashboard, Users, TrendingUp, UserCheck,
  MessageCircle, CheckSquare, FileText, Inbox,
  BarChart3, Settings, Package, type LucideIcon
} from 'lucide-react'

export type ItemNavegacao = {
  label: string
  href: string
  icone: LucideIcon
}

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
]
