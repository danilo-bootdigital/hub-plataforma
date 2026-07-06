import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Base visual compartilhada dos módulos operacionais do Hub (Orçamentos,
 * Validação de Receita, Pedidos, Clientes, Atendimento). A ideia é que todos
 * usem exatamente a mesma estrutura de cabeçalho e card de tabela — a única
 * diferença entre eles deve ser o conteúdo da tabela.
 *
 * Referência oficial de layout: página de Orçamentos.
 */

/** Cabeçalho padrão: título + descrição à esquerda, ação (botão) à direita. */
export function CabecalhoPagina({
  titulo,
  descricao,
  acao,
}: {
  titulo: string
  descricao?: string
  acao?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}

/** Card que envolve a tabela — mesmo raio, borda, sombra e recorte em todos os módulos. */
export function CartaoTabela({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm', className)}>
      {children}
    </div>
  )
}

/** Classes padrão da tabela (cabeçalho, células, linhas, estado vazio). */
export const tabela = {
  /** <table> */
  root: 'w-full text-sm',
  /** <tr> do <thead> */
  theadTr: 'border-b border-slate-100 bg-slate-50/50 text-left',
  /** <th> do cabeçalho */
  th: 'px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500',
  /** <tr> de dados (o módulo adiciona cursor-pointer/onClick quando a linha for clicável) */
  tr: 'border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/50',
  /** <td> de dados */
  td: 'px-5 py-4',
  /** <td> do estado vazio (usar colSpan) */
  vazio: 'px-5 py-12 text-center text-slate-400',
} as const
