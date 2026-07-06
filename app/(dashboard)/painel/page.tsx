import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CabecalhoPagina } from '@/components/layout/listagem'
import { carregarPainelGerencial } from './dados'
import { BlocoResumo } from '@/components/painel-gerencial/bloco-resumo'
import { BlocoRede } from '@/components/painel-gerencial/bloco-rede'
import { BlocoComercial } from '@/components/painel-gerencial/bloco-comercial'
import { BlocoOperacao } from '@/components/painel-gerencial/bloco-operacao'
import { BlocoAlertas } from '@/components/painel-gerencial/bloco-alertas'
import { BlocoAtividade } from '@/components/painel-gerencial/bloco-atividade'

/**
 * PAINEL GERENCIAL da Indústria — Executive Dashboard (DEC-022).
 *
 * A Indústria ADMINISTRA a rede de Hubs; ela NÃO opera (não cria orçamentos,
 * não acompanha pipeline, não aprova, não atende). Esta página apresenta apenas
 * inteligência de negócio e a visão consolidada da rede, em seis blocos:
 *   1. Resumo Executivo   2. Performance da Rede   3. Performance Comercial
 *   4. Operação (leitura) 5. Alertas               6. Atividade recente
 */
export default async function PainelPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const dados = await carregarPainelGerencial(perfil.organization_id)

  return (
    <div className="space-y-10">
      <CabecalhoPagina
        titulo="Painel Gerencial"
        descricao="Visão consolidada e inteligência de negócio da rede de Hubs"
      />

      <BlocoResumo resumo={dados.resumo} />
      <BlocoRede rede={dados.rede} />
      <BlocoComercial comercial={dados.comercial} />
      <BlocoOperacao operacao={dados.operacao} />
      <BlocoAlertas alertas={dados.alertas} />
      <BlocoAtividade atividades={dados.atividades} />
    </div>
  )
}
