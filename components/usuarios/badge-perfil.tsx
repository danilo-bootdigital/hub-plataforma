import { Badge } from '@/components/ui/badge'
import type { UserRole } from '@/types/database'

const configuracoes: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  admin: { label: 'Administrador', variant: 'destructive' },
  gestor: { label: 'Gestor Comercial', variant: 'default' },
  vendedor: { label: 'Vendedor', variant: 'secondary' },
  atendimento: { label: 'Atendimento', variant: 'outline' },
  financeiro: { label: 'Financeiro', variant: 'secondary' },
  suporte: { label: 'Suporte', variant: 'outline' },
  proprietario_hub: { label: 'Proprietário do Hub', variant: 'default' },
  assistente: { label: 'Assistente de Venda', variant: 'secondary' },
}

export function BadgePerfil({ perfil }: { perfil: UserRole }) {
  const config = configuracoes[perfil]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
