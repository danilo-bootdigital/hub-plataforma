'use client'

import { Check, X, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AcoesDecisao } from './acoes-decisao'
import { BlocoCompararPosologia } from './bloco-comparar-posologia'
import { BotaoReexecutar } from './botao-reexecutar'
import type { getValidacaoDetalhe } from './actions'
import {
  STATUS_LABEL, STATUS_BADGE, SEVERIDADE_ICONE, CAMPOS_ORDEM, fmtData, fmtConfianca,
  receitaAprovavel, tituloResultado, montarChecklistVisual,
  GRUPOS_CAMPOS, CAMPOS_MEDICAMENTO,
} from './ui'

type Detalhe = NonNullable<Awaited<ReturnType<typeof getValidacaoDetalhe>>>
const DECIDIDA = ['aprovada', 'reprovada', 'devolvida_para_correcao']

function GrupoCampos({ titulo, itens }: { titulo: string; itens: Array<{ label: string; valor: string | null }> }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      <dl className="space-y-1.5">
        {itens.map((i) => (
          <div key={i.label} className="flex justify-between gap-2">
            <dt className="text-xs text-slate-400">{i.label}</dt>
            <dd className="truncate text-right text-sm text-slate-800">{i.valor && i.valor.trim() !== '' ? i.valor : '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function PainelResultado({ detalhe: v, onAtualizado }: { detalhe: Detalhe; onAtualizado?: () => void }) {
  const campos = v.campos as Record<string, string>
  const falhou = v.status_processamento === 'erro'
  const aprovavel = receitaAprovavel(v.resultado_analise)
  const jaDecidida = DECIDIDA.includes(v.status_atual)
  const { aprovados, reprovados } = montarChecklistVisual(campos, v.pendencias)
  const orientacoes = v.diagnostico?.orientacaoOperacional.itens ?? []

  return (
    <div className="space-y-4">
      {/* Produto + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-400">Produto</p>
          <p className="truncate text-base font-semibold text-slate-900">{v.produto ?? '—'}</p>
        </div>
        <Badge variant={STATUS_BADGE[v.status_atual] ?? 'secondary'}>{STATUS_LABEL[v.status_atual] ?? v.status_atual}</Badge>
      </div>

      {falhou ? (
        /* ---- Estado de ERRO: motivo real + reexecutar; sem decisão/checklist/resultado ---- */
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-base font-bold text-red-800"><AlertTriangle className="size-5 shrink-0" /> Não foi possível concluir a análise</p>
          {v.erroProcessamento?.mensagem && (
            <p className="mt-1 text-sm text-red-700">
              Motivo{v.erroProcessamento.etapa ? ` (etapa: ${v.erroProcessamento.etapa})` : ''}: {v.erroProcessamento.mensagem}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-600">A receita anexada foi mantida. Você pode reexecutar sem criar uma nova validação.</p>
          <div className="mt-3"><BotaoReexecutar conferenciaId={v.id} onFeito={onAtualizado} /></div>
        </div>
      ) : (
        <>
          {/* Resultado principal */}
          {v.resultado_analise && (
            <div className={`rounded-xl px-5 py-4 text-lg font-bold ${aprovavel ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
              {aprovavel ? '🟢' : '🟡'} {tituloResultado(v.resultado_analise)}
            </div>
          )}

          {/* Checklist visual */}
          {v.resultado_analise && (
            <ul className="space-y-1.5">
              {aprovados.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-slate-700"><Check className="size-4 shrink-0 text-emerald-600" /> {t}</li>
              ))}
              {reprovados.map((r, i) => (
                <li key={`r${i}`} className="flex items-start gap-2 text-sm text-slate-700">
                  <X className="mt-0.5 size-4 shrink-0 text-red-600" />
                  <span>{SEVERIDADE_ICONE[r.severidade] ?? ''} {r.texto}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Orientação operacional */}
          {!aprovavel && orientacoes.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">O que precisa ser corrigido</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                {orientacoes.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}

          {/* Decisão humana — só quando a análise concluiu */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {jaDecidida && (
              <div className="mb-3 text-sm text-slate-600">
                <Badge variant={STATUS_BADGE[v.status_atual] ?? 'secondary'}>{STATUS_LABEL[v.status_atual] ?? v.status_atual}</Badge>
                <span className="ml-2 text-slate-500">por {v.decisor ?? '—'} · {fmtData(v.decidido_em)}</span>
                {v.observacao_decisao && <p className="mt-1">“{v.observacao_decisao}”</p>}
              </div>
            )}
            {v.podeAprovar
              ? <AcoesDecisao conferenciaId={v.id} onDecidido={onAtualizado} />
              : <p className="text-sm text-slate-400">Somente o Proprietário do Hub pode registrar a decisão.</p>}
          </div>
        </>
      )}

      {/* Comparar Posologia — sempre visível; se não há posologia extraída, orienta a reexecutar */}
      <BlocoCompararPosologia
        conferenciaId={v.id}
        esperadaInicial={v.posologiaEsperada}
        comparacaoInicial={v.posologiaComparacao}
        posologiaExtraida={v.posologiaExtraida}
      />

      {/* Dados agrupados — só quando há extração */}
      {!falhou && (
        <div className="grid gap-4 sm:grid-cols-3">
          {GRUPOS_CAMPOS.map((g) => (
            <GrupoCampos key={g.titulo} titulo={g.titulo} itens={g.campos.map((c) => ({ label: c.label, valor: campos[c.chave] ?? null }))} />
          ))}
          <GrupoCampos titulo="Medicamento" itens={[{ label: 'Produto', valor: v.produto }, ...CAMPOS_MEDICAMENTO.map((c) => ({ label: c.label, valor: campos[c.chave] ?? null }))]} />
        </div>
      )}

      {/* Detalhes técnicos (recolhível) — inclui o erro real quando houver */}
      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">Detalhes técnicos</summary>
        <div className="border-t border-slate-100 px-4 py-3">
          {v.erroProcessamento && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <b>Erro de processamento</b> — etapa: <code>{v.erroProcessamento.etapa ?? '—'}</code><br />
              {v.erroProcessamento.mensagem ?? '—'}
            </div>
          )}
          <div className="mb-3 flex gap-6 text-sm">
            <span className="text-slate-500">Score: <span className="text-slate-800">{v.score ?? '—'}</span></span>
            <span className="text-slate-500">Confiança da IA: <span className="text-slate-800">{fmtConfianca(v.confianca_extracao)}</span></span>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {CAMPOS_ORDEM.map((c) => (
              <div key={c.chave}>
                <dt className="text-xs uppercase tracking-wide text-slate-400">{c.label}</dt>
                <dd className="text-sm text-slate-700">{campos[c.chave] || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </details>
    </div>
  )
}
