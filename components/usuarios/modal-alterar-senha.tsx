'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { alterarSenhaUsuario } from '@/app/(dashboard)/configuracoes/usuarios/actions'
import { KeyRound } from 'lucide-react'

export function ModalAlterarSenha({ usuarioId, nomeUsuario }: { usuarioId: string; nomeUsuario: string }) {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    const novaSenha = formData.get('nova_senha') as string
    const confirmarSenha = formData.get('confirmar_senha') as string

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setCarregando(true)
    setErro(null)
    setSucesso(false)
    try {
      await alterarSenhaUsuario(usuarioId, novaSenha)
      setSucesso(true)
      setTimeout(() => {
        setAberto(false)
        setSucesso(false)
      }, 1500)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao alterar senha.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { setAberto(open); setErro(null); setSucesso(false) }}>
      <DialogTrigger render={<Button variant="outline" size="sm"><KeyRound className="mr-1 h-3.5 w-3.5" />Senha</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Definir nova senha para <span className="font-medium text-slate-700">{nomeUsuario}</span>.
        </p>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nova_senha">Nova senha</Label>
            <Input id="nova_senha" name="nova_senha" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar_senha">Confirmar senha</Label>
            <Input id="confirmar_senha" name="confirmar_senha" type="password" placeholder="Repita a senha" required minLength={6} />
          </div>
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          {sucesso && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">Senha alterada com sucesso!</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Salvando...' : 'Alterar Senha'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
