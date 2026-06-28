'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CampoSenha } from '@/components/hubs/campo-senha'
import { alterarSenhaProprietario } from '@/app/(dashboard)/configuracoes/hubs/actions'

// Modal de alteração de senha do proprietário do Hub (ação administrativa).
// A senha é enviada à action e atualizada apenas no Supabase Auth.
export function ModalAlterarSenha({
  hubId,
  aberto,
  onOpenChange,
}: {
  hubId: string
  aberto: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const router = useRouter()

  function salvar() {
    if (senha.length < 8) { toast.error('A senha deve ter no mínimo 8 caracteres.'); return }
    if (senha !== senha2) { toast.error('As senhas não coincidem.'); return }
    startTransition(async () => {
      try {
        await alterarSenhaProprietario(hubId, senha)
        toast.success('Senha do proprietário alterada com sucesso.')
        setSenha(''); setSenha2('')
        onOpenChange(false)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao alterar a senha.')
      }
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSenha(''); setSenha2('') } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar senha do proprietário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="nova_senha">Nova senha *</Label>
            <CampoSenha id="nova_senha" value={senha} onChange={setSenha} placeholder="Mínimo de 8 caracteres" />
          </div>
          <div>
            <Label htmlFor="nova_senha_confirmacao">Confirmar nova senha *</Label>
            <CampoSenha id="nova_senha_confirmacao" value={senha2} onChange={setSenha2} placeholder="Repita a nova senha" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button disabled={isPending} onClick={salvar}>{isPending ? 'Salvando...' : 'Alterar senha'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
