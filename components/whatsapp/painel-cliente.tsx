'use client'

// ============================================================
// PainelCliente: drawer lateral com detalhes + totais
// Sub-fase 2.2.1 (com paridade funcional restaurada)
// ============================================================
// - SEM fetch proprio. Todos os dados vem via props.
// - Renderiza nome_contato + name_source (nao lead.nome/contato.nome)
// - Totais vem do page.tsx via props
// - Reusa PainelDetalhesConversa original (status, tags, notas, deal)
// ============================================================

import { X, ShoppingCart, Package, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PainelDetalhesConversa } from './painel-detalhes-conversa'
import type { TotaisCliente } from '@/types/database'
import type { ConversaCompleta } from '@/types/whatsapp-central'
import type { TagConversa, UsuarioResumo } from '@/types/whatsapp-central'

type Props = {
  conversa: ConversaCompleta
  totais: TotaisCliente | null
  notas: Array<{ id: string; conteudo: string; criado_em: string; autor_nome: string | null }>
  deal: { id: string; titulo: string; valor_estimado: number | null; estagio_nome: string | null } | null
  tagsAtivas: TagConversa[]
  todasTags: TagConversa[]
  usuarios: UsuarioResumo[]
  onFechar: () => void
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(valor)
}

export function PainelCliente({
  conversa,
  totais,
  notas,
  deal,
  tagsAtivas,
  todasTags,
  usuarios,
  onFechar,
}: Props) {
  const nomeExibicao = conversa.nome_contato ?? conversa.telefone_externo
  const sourceLabel = conversa.name_source ?? 'desconhecido'

  // Mapear para formato esperado por PainelDetalhesConversa
  const responsavelObj = conversa.responsavel
    ? { id: conversa.responsavel.id, nome: conversa.responsavel.nome }
    : null

  const tagsParaPainel = tagsAtivas.map((t) => ({ id: t.id, nome: t.nome, cor: t.cor }))
  const todasTagsParaPainel = todasTags.map((t) => ({ id: t.id, nome: t.nome, cor: t.cor }))
  const notasParaPainel = notas.map((n) => ({
    id: n.id,
    conteudo: n.conteudo,
    criado_em: n.criado_em,
    autor: { id: '', nome: n.autor_nome ?? '' },
  }))
  const usuariosParaPainel = usuarios.map((u) => ({ id: u.id, nome: u.nome }))
  const dealParaPainel = deal
    ? { id: deal.id, titulo: deal.titulo, valor_estimado: deal.valor_estimado, estagio: deal.estagio_nome }
    : null

  return (
    <div className="w-96 border-l flex flex-col h-full bg-muted/5">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">Cliente</h3>
        <Button size="icon" variant="ghost" onClick={onFechar}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Identificacao */}
        <div>
          <h4 className="font-semibold text-base">{nomeExibicao}</h4>
          <p className="text-xs text-muted-foreground">{conversa.telefone_externo}</p>
          <p className="text-[10px] uppercase text-muted-foreground mt-1">
            Origem do nome: {sourceLabel}
          </p>
        </div>

        {/* Totais financeiros - via props, sem fetch */}
        {totais && (
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground uppercase">Totais</h5>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 p-2 rounded">
                <ShoppingCart className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <div className="text-[10px] text-green-600">Compras</div>
                <div className="font-bold text-sm text-green-700">
                  {formatarMoeda(totais.totalCompras)}
                </div>
              </div>
              <div className="bg-blue-50 p-2 rounded">
                <Package className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <div className="text-[10px] text-blue-600">Pedidos</div>
                <div className="font-bold text-sm text-blue-700">{totais.totalPedidos}</div>
              </div>
              <div className="bg-amber-50 p-2 rounded">
                <FileText className="h-4 w-4 text-amber-600 mx-auto mb-1" />
                <div className="text-[10px] text-amber-600">Orcamentos</div>
                <div className="font-bold text-sm text-amber-700">{totais.totalOrcamentos}</div>
              </div>
            </div>
          </div>
        )}

        {/* Detalhes da conversa - reusa componente original */}
        <div className="border-t pt-3">
          <PainelDetalhesConversa
            conversaId={conversa.id}
            status={conversa.status}
            responsavel={responsavelObj}
            tags={tagsParaPainel}
            todasTags={todasTagsParaPainel}
            notas={notasParaPainel as any}
            usuarios={usuariosParaPainel as any}
            dealVinculado={dealParaPainel as any}
            onClose={onFechar}
          />
        </div>
      </div>
    </div>
  )
}
