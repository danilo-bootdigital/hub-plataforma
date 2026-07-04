'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RotateCcw, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { salvarPromptIa } from '../validacao-receita/actions'

export function EditorPromptIa({
  systemInicial, instrucaoInicial, usandoPadrao,
}: {
  systemInicial: string
  instrucaoInicial: string
  usandoPadrao: boolean
}) {
  const router = useRouter()
  const [system, setSystem] = useState(systemInicial)
  const [instrucao, setInstrucao] = useState(instrucaoInicial)
  const [pending, start] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function salvar(sys: string, inst: string) {
    setErro(null); setOk(false)
    start(async () => {
      try {
        await salvarPromptIa(sys, inst)
        setOk(true)
        router.refresh()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha ao salvar o prompt.')
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {usandoPadrao
          ? <Badge variant="secondary">Usando prompt padrão</Badge>
          : <Badge variant="info">Prompt personalizado</Badge>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="text-sm font-semibold text-slate-700">Instruções (persona / regras do sistema)</label>
        <p className="mb-2 text-xs text-slate-400">Define o comportamento geral da IA na leitura da receita.</p>
        <Textarea value={system} onChange={(e) => setSystem(e.target.value)} rows={6} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="text-sm font-semibold text-slate-700">Regras de extração dos campos</label>
        <p className="mb-2 text-xs text-slate-400">
          Como extrair cada campo (CRM, assinatura, medicamento…). Use <code className="rounded bg-slate-100 px-1">{'{campos}'}</code> onde deve entrar a lista de campos.
        </p>
        <Textarea value={instrucao} onChange={(e) => setInstrucao(e.target.value)} rows={12} />
      </div>

      {erro && <p className="text-sm text-red-700">{erro}</p>}
      {ok && <p className="flex items-center gap-1.5 text-sm text-emerald-700"><Check className="size-4" /> Prompt salvo. Vale na próxima análise (ou ao reexecutar).</p>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => salvar(system, instrucao)} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Salvar prompt
        </Button>
        <Button variant="outline" onClick={() => salvar('', '')} disabled={pending}
          title="Volta ao prompt padrão do sistema">
          <RotateCcw /> Restaurar padrão
        </Button>
      </div>
    </div>
  )
}
