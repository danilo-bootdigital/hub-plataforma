'use client'

import { useEffect, useState } from 'react'
import { listarAuditLog } from '@/app/(dashboard)/whatsapp/actions-conversa'
import { History } from 'lucide-react'

type LogEntry = {
  id: string
  acao: string
  dados_novos: Record<string, unknown> | null
  criado_em: string
  usuario_nome: string
}

type Props = {
  conversaId: string
}

const ACAO_LABELS: Record<string, string> = {
  lead_criado: 'Lead criado',
  deal_criado: 'Oportunidade criada',
  conversa_status_alterado: 'Alterou status',
  conversa_transferida: 'Transferiu conversa',
  conversa_deal_vinculado: 'Vinculou oportunidade',
  mensagem_enviada: 'Enviou mensagem',
}

export function SecaoHistoricoAuditoria({ conversaId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [aberto, setAberto] = useState(false)
  const [status, setStatus] = useState<'idle' | 'carregando' | 'carregado'>('idle')

  const carregando = status === 'carregando'

  function handleToggleAberto() {
    setAberto((atual) => {
      const novoAberto = !atual

      if (novoAberto) {
        setStatus('carregando')
      }

      return novoAberto
    })
  }

  useEffect(() => {
    if (status !== 'carregando') return

    let cancelado = false

    listarAuditLog(conversaId)
      .then((resultado) => {
        if (!cancelado) {
          setLogs(resultado)
        }
      })
      .finally(() => {
        if (!cancelado) {
          setStatus('carregado')
        }
      })

    return () => {
      cancelado = true
    }
  }, [status, conversaId])

  return (
    <section>
      <button
        onClick={handleToggleAberto}
        className="flex items-center gap-1 text-xs font-medium text-slate-500 uppercase mb-2 hover:text-slate-700"
      >
        <History className="h-3.5 w-3.5" />
        Histórico de ações
        <span className="text-[12px] normal-case font-normal ml-1">
          {aberto ? '(fechar)' : '(abrir)'}
        </span>
      </button>

      {aberto && (
        <div className="max-h-48 overflow-y-auto space-y-1.5">
          {carregando ? (
            <p className="text-xs text-slate-400 text-center py-2">Carregando...</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">Nenhuma ação registrada.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded border px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    {ACAO_LABELS[log.acao] ?? log.acao}
                  </span>
                  <span className="text-[12px] text-slate-400">
                    {new Date(log.criado_em).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-[12px] text-slate-500">
                  por {log.usuario_nome}
                  {log.dados_novos?.status ? ` → ${String(log.dados_novos.status)}` : null}
                  {log.dados_novos?.para_usuario_id && log.dados_novos?.motivo
                    ? ` (${String(log.dados_novos.motivo)})`
                    : null}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}