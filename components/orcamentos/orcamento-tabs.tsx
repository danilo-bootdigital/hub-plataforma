'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { OrcamentoDetalhe } from './orcamento-detalhe'
import { ReceitaTab } from './receita-tab'
import { RastreamentoTab } from './rastreamento-tab'
import { FileText, Stethoscope, History } from 'lucide-react'

type Props = {
  orcamento: React.ComponentProps<typeof OrcamentoDetalhe>['orcamento']
  quoteId: string
}

export function OrcamentoTabs({ orcamento, quoteId }: Props) {
  const [tab, setTab] = useState('orcamento')
  // Abas com carregamento sob demanda: montam na 1ª abertura e permanecem montadas.
  const [receitaMontada, setReceitaMontada] = useState(false)
  const [rastreamentoMontado, setRastreamentoMontado] = useState(false)

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        setTab(v)
        if (v === 'receita') setReceitaMontada(true)
        if (v === 'rastreamento') setRastreamentoMontado(true)
      }}
    >
      <TabsList>
        <TabsTrigger value="orcamento" className="gap-1.5">
          <FileText className="h-4 w-4" />
          Orçamento
        </TabsTrigger>
        <TabsTrigger value="receita" className="gap-1.5">
          <Stethoscope className="h-4 w-4" />
          Receita
        </TabsTrigger>
        <TabsTrigger value="rastreamento" className="gap-1.5">
          <History className="h-4 w-4" />
          Rastreamento
        </TabsTrigger>
      </TabsList>

      <TabsContent value="orcamento" className="mt-4">
        <OrcamentoDetalhe orcamento={orcamento} />
      </TabsContent>

      {/* forceMount + gate: monta o ReceitaTab apenas após a 1ª abertura e o mantém montado depois */}
      <TabsContent value="receita" forceMount className={`mt-4 ${tab === 'receita' ? '' : 'hidden'}`}>
        {receitaMontada ? <ReceitaTab quoteId={quoteId} /> : null}
      </TabsContent>

      <TabsContent value="rastreamento" forceMount className={`mt-4 ${tab === 'rastreamento' ? '' : 'hidden'}`}>
        {rastreamentoMontado ? <RastreamentoTab quoteId={quoteId} /> : null}
      </TabsContent>
    </Tabs>
  )
}
