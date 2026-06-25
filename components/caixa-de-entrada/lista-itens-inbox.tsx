'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ItemMensagemPendente } from './item-mensagem-pendente'
import { ItemTarefaPendente } from './item-tarefa-pendente'
import { ItemAtividadeRecente } from './item-atividade-recente'

type MensagemPendente = {
  conversa_id: string
  telefone_externo: string
  lead_nome: string | null
  lead_id: string | null
  conteudo: string | null
  enviado_em: string
}

type TarefaPendente = {
  id: string
  titulo: string
  data_vencimento: string | null
  responsavel: { nome: string } | null
  lead: { id: string; nome: string | null } | null
}

type AtividadeRecente = {
  id: string
  tipo: string
  descricao: string
  criado_em: string
  lead: { id: string; nome: string | null } | null
}

type Props = {
  mensagens: MensagemPendente[]
  tarefas: TarefaPendente[]
  atividades: AtividadeRecente[]
}

type Tab = 'tudo' | 'mensagens' | 'tarefas' | 'atividades'

export function ListaItensInbox({ mensagens, tarefas, atividades }: Props) {
  const [tab, setTab] = useState<Tab>('tudo')

  const tabs: { valor: Tab; label: string; contagem: number }[] = [
    { valor: 'tudo', label: 'Tudo', contagem: mensagens.length + tarefas.length + atividades.length },
    { valor: 'mensagens', label: 'Mensagens', contagem: mensagens.length },
    { valor: 'tarefas', label: 'Tarefas', contagem: tarefas.length },
    { valor: 'atividades', label: 'Atividades', contagem: atividades.length },
  ]

  const mostrarMensagens = tab === 'tudo' || tab === 'mensagens'
  const mostrarTarefas = tab === 'tudo' || tab === 'tarefas'
  const mostrarAtividades = tab === 'tudo' || tab === 'atividades'

  const temItens = (mostrarMensagens && mensagens.length > 0) ||
    (mostrarTarefas && tarefas.length > 0) ||
    (mostrarAtividades && atividades.length > 0)

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100/80 p-1.5">
        {tabs.map((t) => (
          <button
            key={t.valor}
            onClick={() => setTab(t.valor)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              tab === t.valor
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
            {t.contagem > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                tab === t.valor
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {t.contagem}
              </span>
            )}
          </button>
        ))}
      </div>

      {!temItens && (
        <div className="py-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <span className="text-2xl">🎉</span>
          </div>
          <p className="text-sm text-slate-500">Nenhum item pendente. Tudo em dia!</p>
        </div>
      )}

      <div className="space-y-2">
        {mostrarMensagens && mensagens.map((m) => (
          <ItemMensagemPendente
            key={m.conversa_id}
            conversaId={m.conversa_id}
            leadNome={m.lead_nome}
            telefone={m.telefone_externo}
            conteudo={m.conteudo}
            enviadoEm={m.enviado_em}
          />
        ))}

        {mostrarTarefas && tarefas.map((t) => (
          <ItemTarefaPendente
            key={t.id}
            id={t.id}
            titulo={t.titulo}
            dataVencimento={t.data_vencimento}
            responsavelNome={t.responsavel?.nome ?? null}
            leadNome={t.lead?.nome ?? null}
            leadId={t.lead?.id ?? null}
          />
        ))}

        {mostrarAtividades && atividades.map((a) => (
          <ItemAtividadeRecente
            key={a.id}
            id={a.id}
            tipo={a.tipo}
            descricao={a.descricao}
            criadoEm={a.criado_em}
            leadId={a.lead?.id ?? null}
            leadNome={a.lead?.nome ?? null}
          />
        ))}
      </div>
    </div>
  )
}
