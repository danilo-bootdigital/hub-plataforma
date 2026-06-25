'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeStatusOrcamento } from '@/components/orcamentos/badge-status-orcamento'
import { formatarMoeda } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import type { QuoteStatus } from '@/types/database'

interface OrcamentoSimplificadoProps {
  orcamento: {
    id: string
    numero: number
    status: QuoteStatus
    valor_total: number
    criado_em: string
    responsavel?: { nome: string }
    lead?: { nome: string; telefone?: string }
    fornecedor?: { nome: string }
    pedido_existente?: boolean
  }
}

export function OrcamentoSimplificado({ orcamento }: OrcamentoSimplificadoProps) {
  const [expandir, setExpandir] = useState(false)

  // Status com ações disponíveis
  const statusComAcao = ['rascunho', 'aguardando_aprovacao_interna', 'aprovado_internamente', 'enviado_ao_cliente', 'aprovado_pelo_cliente']

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Cabeçalho com informações principais */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Orçamento #{orcamento.numero}</h3>
              <p className="text-sm text-slate-500">
                {orcamento.fornecedor?.nome || 'Sem fornecedor'}
              </p>
            </div>
            <BadgeStatusOrcamento status={orcamento.status} />
          </div>

          <div className="flex items-center gap-2">
            {orcamento.pedido_existente && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Pedido Gerado
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandir(!expandir)}
              className="p-1 h-auto"
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${expandir ? 'rotate-90' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Conteúdo expandido */}
        {expandir && (
          <div className="p-4 space-y-4">
            {/* Cliente */}
            <div>
              <p className="text-xs text-slate-500 mb-1">Cliente</p>
              <p className="font-medium">
                {orcamento.lead?.nome || 'Sem cliente'}
                {orcamento.lead?.telefone && (
                  <span className="ml-2 text-sm text-slate-500">
                    ({orcamento.lead.telefone})
                  </span>
                )}
              </p>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Valor Total</p>
                <p className="font-semibold text-lg">{formatarMoeda(orcamento.valor_total)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Criado em</p>
                <p className="font-medium text-sm">
                  {format(new Date(orcamento.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Responsável */}
            {orcamento.responsavel?.nome && (
              <div>
                <p className="text-xs text-slate-500">Responsável</p>
                <p className="text-sm">{orcamento.responsavel.nome}</p>
              </div>
            )}

            {/* Ações disponíveis */}
            {statusComAcao.includes(orcamento.status) && (
              <div className="pt-2 border-t">
                <Link href={`/orcamentos/${orcamento.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Ver Detalhes
                  </Button>
                </Link>
              </div>
            )}

            {/* Link para pedido existente */}
            {orcamento.pedido_existente && (
              <div className="pt-2 border-t">
                <Link href={`/pedidos?quote_id=${orcamento.id}`}>
                  <Button variant="default" size="sm" className="w-full bg-green-600 hover:bg-green-700">
                    Ver Pedido Gerado
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}