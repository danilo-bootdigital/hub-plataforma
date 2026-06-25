'use client'

import { useState, useEffect, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Plus, AlertCircle, RefreshCw } from 'lucide-react'
import ConfiguracaoAvancada from './config-avancada'
import { CardInstancia } from '@/components/whatsapp/card-instancia'
import { AdicionarInstanciaButton } from '@/components/whatsapp/adicionar-instancia-button'

type Instancia = {
  id: string
  nome: string | null
  numero: string | null
  status_conexao: string
  compartilhado: boolean | null
  vendedor: { nome: string | null } | { nome: string | null }[] | null
}

type Vendedor = { id: string; nome: string }

// Componente de erro
function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Erro ao carregar configurações</h3>
          <p className="text-sm text-red-700 mb-4">{error.message}</p>
          <Button onClick={onRetry} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function WhatsappConfigContent() {
  const [activeTab, setActiveTab] = useState('conexoes')
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      setError(null)

      const [respInst, respVend] = await Promise.all([
        fetch('/api/whatsapp/instances').catch((e) => {
          console.error('Erro ao buscar instâncias:', e)
          return { ok: false, status: 500, json: () => Promise.resolve({ error: 'Falha ao conectar ao servidor' }) }
        }),
        fetch('/api/whatsapp/vendedores').catch((e) => {
          console.error('Erro ao buscar vendedores:', e)
          return { ok: false, status: 500, json: () => Promise.resolve({ error: 'Falha ao conectar ao servidor' }) }
        }),
      ])

      // Tratar respostas com segurança
      let dataInst = { instancias: [] as any[] }
      let dataVend = { vendedores: [] as any[] }

      if (respInst.ok) {
        try {
          const temp = await respInst.json()
          dataInst = { instancias: temp.instancias || [] }
        } catch (e) {
          console.error('Erro ao parsear instâncias:', e)
          dataInst = { instancias: [] }
        }
      }

      if (respVend.ok) {
        try {
          const temp = await respVend.json()
          dataVend = { vendedores: temp.vendedores || [] }
        } catch (e) {
          console.error('Erro ao parsear vendedores:', e)
          dataVend = { vendedores: [] }
        }
      }

      // Normalizar dados para segurança
      setInstancias(dataInst.instancias)
      setVendedores(dataVend.vendedores)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError(err instanceof Error ? err : new Error('Erro desconhecido'))
      // Mesmo em erro, definir arrays vazios para evitar quebra
      setInstancias([])
      setVendedores([])
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return <ErrorFallback error={error} onRetry={carregarDados} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações WhatsApp</h1>
          <p className="mt-0.5 text-sm text-slate-500">Gerencie instâncias e configurações avançadas.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="conexoes" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Instâncias
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações Avançadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conexoes">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Conexões WhatsApp</h2>
                <p className="mt-0.5 text-sm text-slate-500">Gerencie as instâncias conectadas ao sistema.</p>
              </div>
              <AdicionarInstanciaButton vendedores={vendedores} />
            </div>

            {loading ? (
              <Card>
                <CardContent className="pt-6 text-center text-sm text-slate-500">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Carregando instâncias...
                </CardContent>
              </Card>
            ) : instancias.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-400 mb-4">Nenhuma instância configurada</p>
                    <AdicionarInstanciaButton vendedores={vendedores} />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {instancias.map((inst) => (
                  <CardInstancia key={inst.id} instancia={inst} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="configuracoes">
          <ConfiguracaoAvancada />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function WhatsappConfigPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="pt-6 text-center text-sm text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Carregando configurações...
        </CardContent>
      </Card>
    }>
      <WhatsappConfigContent />
    </Suspense>
  )
}