import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

// Helper compartilhado para alterar credenciais (e-mail/senha) no Supabase Auth.
// Centraliza a chamada admin + o tratamento de erro (mensagens consistentes) usado
// tanto pela Indústria (proprietário do Hub) quanto pelo Proprietário (assistente).
// - Passe `email` APENAS quando ele mudou (a checagem de "mudou" é do chamador).
// - Passe `senha` apenas quando o usuário informou uma nova.
// - `email_confirm: true` confirma o e-mail na hora (sem enviar e-mail de confirmação).
// A sincronização em profiles/hubs e a auditoria permanecem no chamador (variam por entidade).
export async function atualizarCredenciaisAuth(
  admin: AdminClient,
  userId: string,
  { email, senha }: { email?: string; senha?: string }
): Promise<void> {
  if (email) {
    const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true })
    if (error) {
      if (/already|registered|exist/i.test(error.message)) throw new Error('E-mail já cadastrado.')
      throw new Error('Não foi possível alterar o e-mail.')
    }
  }
  if (senha) {
    const { error } = await admin.auth.admin.updateUserById(userId, { password: senha })
    if (error) throw new Error('Não foi possível alterar a senha.')
  }
}
