'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { criarHub } from '@/app/(dashboard)/configuracoes/hubs/actions'
import { CampoSenha } from '@/components/hubs/campo-senha'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ProprietarioDisponivel = { id: string; nome: string; email: string | null }

export function ModalNovoHub({ proprietariosDisponiveis = [] }: { proprietariosDisponiveis?: ProprietarioDisponivel[] }) {
  const [aberto, setAberto] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [modo, setModo] = useState<'novo' | 'existente'>('novo')
  const [propId, setPropId] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [obs, setObs] = useState('')
  const router = useRouter()

  function reset() {
    setModo('novo'); setPropId(''); setSenha(''); setSenha2(''); setObs('')
  }

  function handleSubmit(formData: FormData) {
    const nome = (formData.get('nome') as string)?.trim()
    const telefone = (formData.get('telefone') as string)?.trim()
    const cnpj = (formData.get('cnpj') as string)?.trim()

    if (!nome) { toast.error('Informe o nome do Hub.'); return }
    if (!telefone) { toast.error('Informe o telefone.'); return }
    if (!cnpj) { toast.error('Informe o CNPJ da empresa.'); return }
    if (obs.length > 3000) { toast.error('Observações: máximo de 3.000 caracteres.'); return }

    if (modo === 'existente') {
      if (!propId) { toast.error('Selecione o Proprietário.'); return }
      formData.set('proprietario_existente_id', propId)
    } else {
      const nomeRepresentante = (formData.get('nome_representante') as string)?.trim()
      const email = (formData.get('email') as string)?.trim()
      if (!nomeRepresentante) { toast.error('Informe o nome do representante.'); return }
      if (!email || !EMAIL_RE.test(email)) { toast.error('Informe um e-mail válido.'); return }
      if (senha.length < 8) { toast.error('A senha deve ter no mínimo 8 caracteres.'); return }
      if (senha !== senha2) { toast.error('As senhas não coincidem.'); return }
    }

    startTransition(async () => {
      try {
        await criarHub(formData)
        toast.success('Hub criado com sucesso.')
        reset(); setAberto(false); router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao criar Hub.')
      }
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => { setAberto(v); if (!v) reset() }}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="h-4 w-4" />
        Novo Hub
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Hub</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 pt-2">
          {/* Proprietário: novo ou existente (DEC-015/016 — Hub sempre com Proprietário) */}
          <div className="space-y-1">
            <Label>Proprietário do Hub *</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={modo === 'novo' ? 'default' : 'outline'} onClick={() => setModo('novo')}>
                Criar novo
              </Button>
              <Button type="button" size="sm" variant={modo === 'existente' ? 'default' : 'outline'}
                onClick={() => setModo('existente')} disabled={proprietariosDisponiveis.length === 0}>
                Usar existente
              </Button>
            </div>
            {proprietariosDisponiveis.length === 0 && (
              <p className="text-xs text-slate-400">Nenhum Proprietário disponível (sem Hub). Crie um novo.</p>
            )}
          </div>

          <div>
            <Label htmlFor="nome">Nome do Hub *</Label>
            <Input id="nome" name="nome" required autoComplete="off" />
          </div>

          {modo === 'existente' ? (
            <div>
              <Label htmlFor="prop">Selecionar Proprietário *</Label>
              <select id="prop" value={propId} onChange={(e) => setPropId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">Selecionar…</option>
                {proprietariosDisponiveis.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}{p.email ? ` — ${p.email}` : ''}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="nome_representante">Nome do representante *</Label>
                <Input id="nome_representante" name="nome_representante" autoComplete="off" />
              </div>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" name="email" type="email" autoComplete="off" />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="telefone">Telefone *</Label>
            <Input id="telefone" name="telefone" required autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="cnpj">CNPJ da empresa *</Label>
            <Input id="cnpj" name="cnpj" required autoComplete="off" />
          </div>

          {modo === 'novo' && (
            <>
              <div>
                <Label htmlFor="senha">Senha *</Label>
                <CampoSenha id="senha" name="senha" value={senha} onChange={setSenha} placeholder="Mínimo de 8 caracteres" />
              </div>
              <div>
                <Label htmlFor="senha_confirmacao">Confirmar senha *</Label>
                <CampoSenha id="senha_confirmacao" name="senha_confirmacao" value={senha2} onChange={setSenha2} placeholder="Repita a senha" />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
            <Input id="nome_fantasia" name="nome_fantasia" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="razao_social">Razão Social</Label>
            <Input id="razao_social" name="razao_social" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes" name="observacoes" rows={4} maxLength={3000}
              value={obs} onChange={(e) => setObs(e.target.value)}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Informações comerciais, condições, anotações…"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{obs.length}/3000</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={isPending} onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar Hub'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
