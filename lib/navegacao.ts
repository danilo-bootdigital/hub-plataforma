import {
  LayoutDashboard, Users, UserCheck,
  FileText,
  BarChart3, Settings, Package, Building2, Briefcase, Network, Wallet, Contact, ClipboardList, PackageCheck, Layers, ShieldCheck, ClipboardCheck, Sparkles, UserPlus, MessageCircle, type LucideIcon
} from 'lucide-react'
import type { UserRole } from '@/types/database'

export type ItemNavegacao = {
  label: string
  // Rota do item. Opcional em itens de grupo (que apenas abrem/fecham o submenu).
  href?: string
  icone: LucideIcon
  // Se omitido, o item pertence aos perfis legados (operação da Indústria).
  // Se preenchido, o item só aparece para os perfis listados.
  perfis?: UserRole[]
  // Módulo RBAC (DEC-015). Quando definido, o item só aparece ao Assistente se a
  // Função conceder 'visualizar' nesse módulo. Ignorado para os demais perfis.
  modulo?: string
  // Subitens de um grupo recolhível (ex.: "Configurações"). Cada filho segue as
  // mesmas regras de visibilidade (perfis/modulo). Grupo sem filhos visíveis some.
  children?: ItemNavegacao[]
}

// Permissões resolvidas (forma estrutural — evita importar código de servidor).
type PermInput = { total?: boolean; permissoes?: Record<string, string[]> } | null | undefined

// Perfis legados (operação atual da Indústria) — comportamento inalterado.
const PERFIS_LEGADOS: UserRole[] = ['admin', 'gestor', 'vendedor', 'atendimento', 'financeiro', 'suporte']

export const navegacao: ItemNavegacao[] = [
  // DEC-022 — Administração (Indústria): itens administrativos/gerenciais (admin/gestor).
  { label: 'Painel Gerencial', href: '/painel', icone: LayoutDashboard, perfis: ['admin', 'gestor'] },
  { label: 'Clientes', href: '/clientes', icone: UserCheck, perfis: ['admin', 'gestor'] },
  { label: 'Relatórios', href: '/relatorios', icone: BarChart3, perfis: ['admin', 'gestor'] },
  { label: 'Configurações', href: '/configuracoes', icone: Settings, perfis: ['admin', 'gestor'] },
  // DEC-022 — itens OPERACIONAIS NÃO pertencem à Indústria (Pipeline, Atendimento, WhatsApp,
  // Agenda, Orçamentos, Pedidos, Caixa de Entrada). São operados pelo Hub via /hub/** e
  // /assistente/**. As rotas legadas (/caixa-de-entrada, /leads, /pipeline, /whatsapp,
  // /tarefas, /orcamentos, /pedidos) saem do menu (código/rota preservados; acesso da
  // Indústria bloqueado no middleware). Remoção do legado = fase seguinte.
  // Hubs — gestão pela Indústria (Fatia 04)
  { label: 'Hubs', href: '/configuracoes/hubs', icone: Network, perfis: ['admin', 'gestor'] },
  // Carteiras — gestão pela Indústria (Fatia 05)
  { label: 'Carteiras', href: '/configuracoes/carteiras', icone: Wallet, perfis: ['admin', 'gestor'] },
  // Portfólios — catálogo da Indústria (DEC-012 / Expand E4)
  { label: 'Portfólios', href: '/configuracoes/portfolios', icone: Layers, perfis: ['admin', 'gestor'] },
  // Cadastro de Clientes — análise da Indústria (DEC-020)
  { label: 'Cadastro de Clientes', href: '/configuracoes/cadastro-clientes', icone: UserPlus, perfis: ['admin', 'gestor'] },
  // Áreas iniciais dos novos perfis (placeholder — Fatia 03)
  { label: 'Área do Hub', href: '/hub', icone: Building2, perfis: ['proprietario_hub'] },
  // Consulta operacional de Produtos (Hub) — DEC-013/014; sem CRUD
  { label: 'Produtos', href: '/hub/produtos', icone: Package, perfis: ['proprietario_hub', 'assistente'], modulo: 'produtos' },
  // Orçamentos — área operacional do Hub (DEC-017); escopo por hub_id no servidor.
  { label: 'Orçamentos', href: '/hub/orcamentos', icone: FileText, perfis: ['proprietario_hub', 'assistente'], modulo: 'orcamentos' },
  // Validação de Receita — módulo do Hub (DEC-019). Proprietário sempre; Assistente se a Função conceder 'visualizar' em 'receita'.
  { label: 'Validação de Receita', href: '/hub/validacao-receita', icone: ClipboardCheck, perfis: ['proprietario_hub', 'assistente'], modulo: 'receita' },
  // Cadastro de Clientes — pré-cadastro do Hub (DEC-020). Proprietário e Assistente
  // fazem o cadastro → item padrão do Hub (sem gate por Função).
  { label: 'Cadastro de Clientes', href: '/hub/cadastro-clientes', icone: UserPlus, perfis: ['proprietario_hub', 'assistente'] },
  { label: 'Assistentes', href: '/hub/assistentes', icone: Users, perfis: ['proprietario_hub'] },
  { label: 'Carteiras', href: '/hub/carteiras', icone: Wallet, perfis: ['proprietario_hub'] },
  { label: 'Clientes', href: '/hub/clientes', icone: Contact, perfis: ['proprietario_hub'] },
  // Mensageria (DEC-023 · E11) — UI operacional do Hub; escopo por hub_id via RLS.
  { label: 'Mensageria', href: '/mensageria', icone: MessageCircle, perfis: ['proprietario_hub', 'assistente'] },
  // Configurações — grupo recolhível do Proprietário do Hub. Reúne as telas
  // administrativas do HUB (identidade, IA e funções) num único item de 1º nível.
  // Rotas preservadas: nenhum caminho muda, apenas a organização do menu.
  {
    label: 'Configurações',
    icone: Settings,
    perfis: ['proprietario_hub'],
    children: [
      { label: 'Identidade', href: '/hub/identidade', icone: Building2, perfis: ['proprietario_hub'] },
      { label: 'IA / Prompt', href: '/hub/configuracoes-ia', icone: Sparkles, perfis: ['proprietario_hub'] },
      { label: 'Funções', href: '/hub/funcoes', icone: ShieldCheck, perfis: ['proprietario_hub'] },
    ],
  },
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
  // Visibilidade de um item isolado — mesma regra de sempre:
  // - com `perfis`: aparece se o cargo estiver na lista (sem cargo → oculto);
  // - sem `perfis`: pertence aos perfis legados (sem cargo → visível, como antes);
  // - Assistente com Função (DEC-015): itens com `modulo` exigem 'visualizar'.
  const filtroFuncao = cargo === 'assistente' && permissoes && !permissoes.total
  const visivel = (item: ItemNavegacao): boolean => {
    const perfilOk = item.perfis
      ? item.perfis.includes(cargo as UserRole)
      : !cargo || PERFIS_LEGADOS.includes(cargo as UserRole)
    if (!perfilOk) return false
    if (filtroFuncao && item.modulo) {
      return (permissoes!.permissoes?.[item.modulo] ?? []).includes('visualizar')
    }
    return true
  }

  const resultado: ItemNavegacao[] = []
  for (const item of navegacao) {
    if (!visivel(item)) continue
    if (item.children) {
      // Grupo recolhível: filtra os filhos e descarta o grupo se ficar vazio.
      const children = item.children.filter(visivel)
      if (children.length === 0) continue
      resultado.push({ ...item, children })
    } else {
      resultado.push(item)
    }
  }
  return resultado
}
