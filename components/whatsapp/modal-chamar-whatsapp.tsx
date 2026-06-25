'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageCircle } from 'lucide-react'
import { iniciarConversa } from '@/app/(dashboard)/whatsapp/actions'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

type Instancia = {
  id: string
  nome: string
  numero: string | null
  status_conexao: string
}

type Props = {
  nome: string
  telefone: string | null
  leadId?: string | null
  contatoId?: string | null
  instancias: Instancia[]
  trigger?: React.ReactElement
}

export function ModalChamarWhatsapp({ nome, telefone, leadId, contatoId, instancias, trigger }: Props) {
  const [aberto, setAberto] = useState(false)
  const [tel, setTel] = useState(telefone ?? '')
  const [instanciaId, setInstanciaId] = useState(instancias[0]?.id ?? '')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleEnviar() {
    if (!texto.trim() || !tel.trim() || !instanciaId) return
    setErro(null)
    startTransition(async () => {
      try {
        const id = await iniciarConversa({
          telefone: tel.trim(),
          instanciaId,
          texto: texto.trim(),
          leadId: leadId ?? null,
          contatoId: contatoId ?? null,
        })
        setConversaId(id)
        setTexto('')
      } catch (e: unknown) {
        if (isRedirectError(e)) throw e
        setErro(e instanceof Error ? e.message : 'Erro ao enviar mensagem.')
      }
    })
  }

  function handleAbrirConversa() {
    if (conversaId) {
      router.push(`/whatsapp/${conversaId}`)
    }
  }

  const botaoDefault = (
    <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
      <MessageCircle className="h-4 w-4" />
      Chamar no WhatsApp
    </Button>
  )

  if (instancias.length === 0) {
    return (
      <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white opacity-50 cursor-not-allowed" disabled>
        <MessageCircle className="h-4 w-4" />
        Nenhum WhatsApp conectado
      </Button>
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => { setAberto(v); if (!v) setConversaId(null) }}>
      <DialogTrigger>
        {trigger ?? botaoDefault}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar WhatsApp
          </DialogTitle>
        </DialogHeader>

        {conversaId ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 text-center">
              <p className="text-sm font-medium text-green-800">Mensagem enviada com sucesso!</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setConversaId(null); setAberto(false) }}>
                Fechar
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleAbrirConversa}>
                Abrir conversa completa
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={nome} disabled className="bg-slate-50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone-wpp">Telefone</Label>
              <Input
                id="telefone-wpp"
                value={tel}
                onChange={(e) => setTel(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label>Número remetente</Label>
              <Select value={instanciaId} onValueChange={(v: string | null) => setInstanciaId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o número" />
                </SelectTrigger>
                <SelectContent>
                  {instancias.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.nome}{inst.numero ? ` (${inst.numero})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensagem-wpp">Mensagem</Label>
              <Textarea
                id="mensagem-wpp"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={4}
              />
            </div>

            {erro && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
            )}

            <Button
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
              onClick={handleEnviar}
              disabled={isPending || !texto.trim() || !tel.trim() || !instanciaId}
            >
              <MessageCircle className="h-4 w-4" />
              {isPending ? 'Enviando...' : 'Enviar mensagem'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
