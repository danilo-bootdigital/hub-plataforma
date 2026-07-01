import { Badge } from '@/components/ui/badge'
import type { UserRole } from '@/types/database'

// Perfis oficiais (DEC-015). Legados mantidos até o Contract (relabelados).
const configuracoes: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  admin: { label: 'Administrador da Indústria', variant: 'destructive' },
  gestor: { label: 'Gestor da Indústria', variant: 'default' },
  proprietario_hub: { label: 'Proprietário do Hub', variant: 'default' },
  assistente: { label: 'Assistente', variant: 'secondary' },
  // Legados (Contract remove)
  vendedor: { label: 'Assistente (legado: vendedor)', variant: 'outline' },
  atendimento: { label: 'Atendimento (legado)', variant: 'outline' },
  financeiro: { label: 'Financeiro (legado)', variant: 'outline' },
  suporte: { label: 'Suporte (legado)', variant: 'outline' },
}

export function BadgePerfil({ perfil }: { perfil: UserRole }) {
  const config = configuracoes[perfil]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
