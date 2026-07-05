'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RotateCcw, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { salvarIaComercial } from './actions'
import { IA_COMERCIAL_VAZIO, type IaComercial } from './ia-comercial'

type CampoDef = { chave: keyof IaComercial; label: string; ajuda: string; rows: number }

const CAMPOS: CampoDef[] = [
  { chave: 'prompt_mestre', label: 'Prompt mestre', ajuda: 'Instrução principal que define quem é o assistente do seu Hub.', rows: 6 },
  { chave: 'objetivo', label: 'Objetivo da IA', ajuda: 'O que o assistente deve alcançar em cada conversa.', rows: 3 },
  { chave: 'regras', label: 'Regras da IA', ajuda: 'Regras de conduta e limites do atendimento.', rows: 5 },
  { chave: 'tom_de_voz', label: 'Tom de voz', ajuda: 'Como o assistente deve se comunicar (formal, próximo, técnico…).', rows: 2 },
  { chave: 'restricoes', label: 'Restrições', ajuda: 'O que o assistente NÃO deve fazer.', rows: 3 },
  { chave: 'contexto_negocio', label: 'Contexto do negócio', ajuda: 'Sobre o Hub, público, diferenciais e forma de atender.', rows: 5 },
  { chave: 'produtos_prioritarios', label: 'Produtos prioritários', ajuda: 'Produtos/linhas a destacar quando fizer sentido.', rows: 3 },
  { chave: 'informacoes_proibidas', label: 'Informações proibidas', ajuda: 'Assuntos/dados que nunca devem ser mencionados.', rows: 3 },
  { chave: 'observacoes', label: 'Observações', ajuda: 'Qualquer instrução adicional.', rows: 3 },
]

export function EditorIaComercial({ inicial }: { inicial: IaComercial }) {
  const router = useRouter()
  const [f, setF] = useState<IaComercial>(inicial)
  const [pending, start] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function set(k: keyof IaComercial, v: string) {
    setF((prev) => ({ ...prev, [k]: v }))
    setOk(false)
  }

  function salvar(dados: IaComercial) {
    setErro(null); setOk(false)
    start(async () => {
      try {
        await salvarIaComercial(dados)
        setOk(true)
        router.refresh()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha ao salvar.')
      }
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Configure o assistente de IA do seu Hub. Estes campos formam as instruções do assistente comercial.
      </p>

      {CAMPOS.map((c) => (
        <div key={c.chave} className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="text-sm font-semibold text-slate-700">{c.label}</label>
          <p className="mb-2 text-xs text-slate-400">{c.ajuda}</p>
          <Textarea value={f[c.chave]} onChange={(e) => set(c.chave, e.target.value)} rows={c.rows} />
        </div>
      ))}

      {erro && <p className="text-sm text-red-700">{erro}</p>}
      {ok && <p className="flex items-center gap-1.5 text-sm text-emerald-700"><Check className="size-4" /> Configuração salva.</p>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => salvar(f)} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Salvar
        </Button>
        <Button variant="outline" onClick={() => { setF(IA_COMERCIAL_VAZIO); salvar(IA_COMERCIAL_VAZIO) }} disabled={pending}
          title="Limpa todos os campos e salva">
          <RotateCcw /> Restaurar padrão
        </Button>
      </div>
    </div>
  )
}
