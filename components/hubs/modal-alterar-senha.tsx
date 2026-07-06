'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CampoSenha } from '@/components/hubs/campo-senha'
import { alterarSenhaProprietario, alterarEmailProprietario } from '@/app/(dashboard)/configuracoes/hubs/actions'

// Modal de gestão de acesso do proprietário do Hub (ação administrativa da Indústria):
// altera o e-mail (login) e/ou a senha. Ambos atualizados apenas no Supabase Auth
// (e a senha nunca vai para banco/log). O e-mail é sincronizado em profiles/hubs.
export function ModalAlterarSenha({
  hubId,
  emailAtual,
  aberto,
  onOpenChange,
}: {
  hubId: string
  emailAtual?: string | null
  aberto: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState(emailAtual ?? '')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const router = useRouter()

  function limpar() {
    setEmail(emailAtual ?? ''); setSenha(''); setSenha2('')
  }

  function salvar() {
    const emailNovo = email.trim().toLowerCase()
    const emailMudou = emailNovo !== (emailAtual ?? '').toLowerCase()
    // Gate por AMBOS os campos: evita no-op silencioso se a senha for digitada só na confirmação.
    const trocarSenha = senha.length > 0 || senha2.length > 0

    // E-mail só é exigido quando o usuário o alterou (não bloqueia reset de senha em Hub sem e-mail).
    if (emailMudou && !emailNovo) { toast.error('O e-mail não pode ficar vazio.'); return }
    if (trocarSenha) {
      if (senha.length < 8) { toast.error('A senha deve ter no mínimo 8 caracteres.'); return }
      if (senha !== senha2) { toast.error('As senhas não coincidem.'); return }
    }
    if (!emailMudou && !trocarSenha) { toast.info('Nada para alterar.'); return }

    startTransition(async () => {
      try {
        if (emailMudou) await alterarEmailProprietario(hubId, emailNovo)
        if (trocarSenha) await alterarSenhaProprietario(hubId, senha)
        toast.success('Acesso do proprietário atualizado.')
        setSenha(''); setSenha2('')
        onOpenChange(false)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao atualizar o acesso.')
      }
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => { onOpenChange(v); if (!v) limpar() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar acesso do proprietário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="email_proprietario">E-mail (login) *</Label>
            <Input
              id="email_proprietario"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <Label htmlFor="nova_senha">Nova senha</Label>
            <CampoSenha id="nova_senha" value={senha} onChange={setSenha} placeholder="Deixe vazio para manter (mín. 8)" />
          </div>
          <div>
            <Label htmlFor="nova_senha_confirmacao">Confirmar nova senha</Label>
            <CampoSenha id="nova_senha_confirmacao" value={senha2} onChange={setSenha2} placeholder="Repita a nova senha" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button disabled={isPending} onClick={salvar}>{isPending ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
