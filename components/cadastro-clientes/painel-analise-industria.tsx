'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, AlertTriangle, UserPlus, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { solicitarCorrecao, aprovarCadastro, reprovarCadastro, converterEmCliente } from '@/app/(dashboard)/configuracoes/cadastro-clientes/actions'
import type { DetalheCadastro } from '@/lib/cadastro-clientes/documentos'

export function PainelAnaliseIndustria({ detalhe }: { detalhe: DetalheCadastro }) {
  const router = useRouter()
  const c = detalhe.cadastro
  const [pendente, startTransition] = useTransition()
  const [dialogo, setDialogo] = useState<null | 'correcao' | 'reprovar'>(null)
  const [texto, setTexto] = useState('')

  const podeDecidir = c.status === 'enviado' || c.status === 'em_analise'

  function aprovar() {
    startTransition(async () => {
      try { await aprovarCadastro(c.id); toast.success('Cadastro aprovado.'); router.refresh() }
      catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao aprovar.') }
    })
  }

  function converter() {
    startTransition(async () => {
      try { await converterEmCliente(c.id); toast.success('Cliente ativo criado a partir do pré-cadastro.'); router.refresh() }
      catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao converter.') }
    })
  }

  function confirmarDialogo() {
    const t = texto.trim()
    if (!t) { toast.error('Informe o texto.'); return }
    startTransition(async () => {
      try {
        if (dialogo === 'correcao') { await solicitarCorrecao(c.id, t); toast.success('Correção solicitada ao Hub.') }
        else if (dialogo === 'reprovar') { await reprovarCadastro(c.id, t); toast.success('Cadastro reprovado.') }
        setDialogo(null); setTexto(''); router.refresh()
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha na operação.') }
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Análise da Indústria</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {podeDecidir && (
          <div className="flex flex-col gap-2">
            <Button onClick={aprovar} disabled={pendente} className="bg-emerald-600 hover:bg-emerald-700">
              {pendente ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
              Aprovar
            </Button>
            <Button variant="outline" onClick={() => { setTexto(''); setDialogo('correcao') }} disabled={pendente}>
              <AlertTriangle className="mr-1.5 h-4 w-4 text-orange-500" /> Solicitar Correção
            </Button>
            <Button variant="outline" onClick={() => { setTexto(''); setDialogo('reprovar') }} disabled={pendente}
              className="border-rose-200 text-rose-700 hover:bg-rose-50">
              <XCircle className="mr-1.5 h-4 w-4" /> Reprovar
            </Button>
          </div>
        )}

        {c.status === 'correcao_solicitada' && (
          <div className="flex gap-2 rounded-md bg-orange-50 p-3 text-sm text-orange-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /> Aguardando o Hub reapresentar o cadastro corrigido.
          </div>
        )}
        {c.status === 'reprovado' && (
          <div className="flex gap-2 rounded-md bg-rose-50 p-3 text-sm text-rose-700">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> Cadastro reprovado.
          </div>
        )}

        {c.status === 'aprovado' && (
          c.converted_contact_id ? (
            <div className="flex gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Cliente ativo já criado a partir deste pré-cadastro.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Cadastro aprovado. Converta em Cliente ativo.
              </div>
              <Button onClick={converter} disabled={pendente} className="w-full">
                {pendente ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                Converter em Cliente
              </Button>
            </div>
          )
        )}

        {c.status === 'rascunho' && (
          <p className="text-sm text-slate-500">Cadastro ainda em rascunho no Hub — sem ações disponíveis.</p>
        )}
      </CardContent>

      <Dialog open={dialogo !== null} onOpenChange={(o) => { if (!o) { setDialogo(null); setTexto('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogo === 'correcao' ? 'Solicitar correção' : 'Reprovar cadastro'}</DialogTitle>
            <DialogDescription>
              {dialogo === 'correcao'
                ? 'Descreva o que o Hub precisa corrigir. O cadastro voltará para correção.'
                : 'Informe o motivo da reprovação. Esta decisão é registrada no histórico.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder={dialogo === 'correcao' ? 'Ex.: comprovante de endereço ilegível...' : 'Ex.: documentação inconsistente...'}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogo(null); setTexto('') }} disabled={pendente}>Cancelar</Button>
            <Button onClick={confirmarDialogo} disabled={pendente}>
              {pendente ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {dialogo === 'correcao' ? 'Enviar solicitação' : 'Confirmar reprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
