'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageCircle, Plus, Search } from 'lucide-react'
import { iniciarConversa, buscarContatosParaConversa } from '@/app/(dashboard)/whatsapp/actions'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

type Instancia = {
  id: string
  nome: string
  numero: string | null
  status_conexao: string
}

type ResultadoBusca = {
  id: string
  nome: string | null
  telefone: string | null
  tipo: 'lead' | 'contato'
}

type Props = {
  instancias: Instancia[]
}

export function ModalNovaConversa({ instancias }: Props) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [selecionado, setSelecionado] = useState<ResultadoBusca | null>(null)
  const [telefone, setTelefone] = useState('')
  const [instanciaId, setInstanciaId] = useState(instancias[0]?.id ?? '')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleBuscar() {
    if (!busca.trim() || busca.trim().length < 2) return
    setBuscando(true)
    try {
      const res = await buscarContatosParaConversa(busca.trim())
      setResultados([...res.leads, ...res.contatos])
    } catch {
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }

  function handleSelecionar(item: ResultadoBusca) {
    setSelecionado(item)
    setTelefone(item.telefone ?? '')
    setResultados([])
    setBusca('')
  }

  function handleEnviar() {
    if (!texto.trim() || !telefone.trim() || !instanciaId) return
    setErro(null)
    startTransition(async () => {
      try {
        const conversaId = await iniciarConversa({
          telefone: telefone.trim(),
          instanciaId,
          texto: texto.trim(),
          leadId: selecionado?.tipo === 'lead' ? selecionado.id : null,
          contatoId: selecionado?.tipo === 'contato' ? selecionado.id : null,
        })
        setAberto(false)
        router.push(`/whatsapp/${conversaId}`)
      } catch (e: unknown) {
        if (isRedirectError(e)) throw e
        setErro(e instanceof Error ? e.message : 'Erro ao iniciar conversa.')
      }
    })
  }

  function handleReset() {
    setSelecionado(null)
    setTelefone('')
    setTexto('')
    setBusca('')
    setResultados([])
    setErro(null)
  }

  if (instancias.length === 0) {
    return (
      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" disabled title="Nenhuma instância encontrada">
        <Plus className="h-4 w-4" />
      </Button>
    )
  }

  // Verificar se há instâncias conectadas
  const hasConnectedInstance = instancias.some(inst => inst.status_conexao === 'conectado')

  return (
    <Dialog open={aberto} onOpenChange={(v) => { setAberto(v); if (!v) handleReset() }}>
      <DialogTrigger render={
        <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white" title="Nova conversa">
          <Plus className="h-4 w-4" />
        </Button>
      } />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Nova Conversa
          </DialogTitle>
        </DialogHeader>

        {!hasConnectedInstance && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
            ⚠️ Nenhuma instância está conectada no momento. As mensagens serão salvas mas não serão enviadas até que o WhatsApp esteja online.
          </div>
        )}

        <div className="space-y-4">
          {!selecionado ? (
            <>
              <div className="space-y-2">
                <Label>Buscar lead ou contato</Label>
                <div className="flex gap-2">
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                    placeholder="Nome, telefone ou empresa..."
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon" onClick={handleBuscar} disabled={buscando}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {resultados.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {resultados.map((r) => (
                    <button
                      key={`${r.tipo}-${r.id}`}
                      onClick={() => handleSelecionar(r)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{r.nome ?? 'Sem nome'}</p>
                        <p className="text-xs text-slate-500">{r.telefone ?? 'Sem telefone'}</p>
                      </div>
                      <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                        {r.tipo === 'lead' ? 'Lead' : 'Contato'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">ou digite o número</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tel-novo">Telefone</Label>
                <Input
                  id="tel-novo"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </>
          ) : (
            <div className="rounded-md bg-green-50 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">{selecionado.nome ?? 'Sem nome'}</p>
                <p className="text-xs text-green-700">{telefone} · {selecionado.tipo === 'lead' ? 'Lead' : 'Contato'}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
                Trocar
              </Button>
            </div>
          )}

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
            <Label htmlFor="msg-nova">Mensagem</Label>
            <Textarea
              id="msg-nova"
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
            disabled={isPending || !texto.trim() || !telefone.trim() || !instanciaId}
          >
            <MessageCircle className="h-4 w-4" />
            {isPending ? 'Enviando...' : 'Enviar mensagem'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
