import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Quote } from '@/types/database'
import { aprovarPropostaPublica, recusarPropostaPublica } from '@/app/actions/proposta-publica'

interface TokenData {
  quote: Quote
  token: string
  expiresAt: string
}

interface Props {
  params: { token: string }
}

export const dynamic = 'force-dynamic'

async function fetchProposalData(token: string): Promise<TokenData | null> {
  try {
    // Buscar token válido completo
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quote_tokens?token_hash=eq.${token}&status=eq.pendente&select=*`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const tokens = await response.json()
    if (!tokens || tokens.length === 0) {
      return null
    }

    const tokenData = tokens[0]

    // Verificar expiração
    const agora = new Date()
    if (new Date(tokenData.expira_em) < agora) {
      return null
    }

    // Buscar orçamento vinculado ao token
    const quoteResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quotes?id=eq.${tokenData.quote_id}&select=*`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!quoteResponse.ok) {
      return null
    }

    const quotes = await quoteResponse.json()
    if (!quotes || quotes.length === 0) {
      return null
    }

    const quote = quotes[0]

    // Validar status e validade
    if (quote.status !== 'enviado_ao_cliente') {
      return null
    }

    if (!quote.validade_em) {
      return null
    }

    const validadeOrcamento = new Date(quote.validade_em)
    if (validadeOrcamento < agora) {
      return null
    }

    return {
      quote,
      token: token,
      expiresAt: tokenData.expira_em,
    }
  } catch (error) {
    console.error('Erro ao buscar dados da proposta:', error)
    return null
  }
}

function AcaoAprovar({ token }: { token: string }) {
  const handleSubmit = async (formData: FormData) => {
    'use server'

    try {
      await aprovarPropostaPublica(token)
    } catch (error) {
      console.error('Erro ao aprovar:', error)
      throw new Error('Não foi possível aprovar a proposta.')
    }
  }

  return (
    <form action={handleSubmit}>
      <Button
        type="submit"
        className="flex-1 bg-green-600 hover:bg-green-700"
      >
        Aprovar Proposta
      </Button>
    </form>
  )
}

function AcaoRecusar({ token }: { token: string }) {
  const handleSubmit = async (formData: FormData) => {
    'use server'

    try {
      await recusarPropostaPublica(token)
    } catch (error) {
      console.error('Erro ao recusar:', error)
      throw new Error('Não foi possível recusar a proposta.')
    }
  }

  return (
    <form action={handleSubmit}>
      <Button
        type="submit"
        variant="outline"
        className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
      >
        Recusar Proposta
      </Button>
    </form>
  )
}

export default async function PropostaPublicaPage({ params }: Props) {
  const data = await fetchProposalData(params.token)

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Proposta não encontrada
            </h2>
            <p className="text-gray-600 mb-4">
              Esta proposta não está mais disponível para aprovação.
            </p>
            <Button className="w-full">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Proposta Comercial
          </h1>
          <p className="text-gray-600">
            Nº {data.quote.numero} - Validade até {formatDate(data.quote.validade_em || '')}
          </p>
        </div>

        <div className="grid gap-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Detalhes da Proposta</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  Aguardando Aprovação
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="text-lg font-semibold">{formatCurrency(data.quote.valor_total)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Desconto Geral</p>
                  <p className="text-lg font-semibold">{formatCurrency(data.quote.desconto_geral)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Frete</p>
                  <p className="text-lg font-semibold">{formatCurrency(data.quote.frete)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Itens */}
          <Card>
            <CardHeader>
              <CardTitle>Itens da Proposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Items da proposta - ajuste conforme estrutura real */}
                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex-1">
                    <p className="font-medium">Item de exemplo</p>
                    <p className="text-sm text-gray-500">1 x R$ 100,00</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">R$ 100,00</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>Informações de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Forma de Pagamento</p>
                  <p className="font-medium">{data.quote.forma_pagamento || 'Não especificado'}</p>
                </div>
                {data.quote.endereco_entrega && (
                  <div>
                    <p className="text-sm text-gray-500">Endereço de Entrega</p>
                    <p className="font-medium">{data.quote.endereco_entrega}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <Card>
            <CardContent className="pt-6">
              <Suspense fallback={<div className="animate-pulse h-12 bg-gray-200 rounded"></div>}>
                <div className="flex gap-4">
                  <AcaoAprovar token={params.token} />
                  <AcaoRecusar token={params.token} />
                </div>
              </Suspense>
              <p className="text-xs text-gray-500 mt-4 text-center">
                Clique em &ldquo;Aprovar Proposta&rdquo; para aceitar ou &ldquo;Recusar Proposta&rdquo; para recusar esta proposta comercial.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}