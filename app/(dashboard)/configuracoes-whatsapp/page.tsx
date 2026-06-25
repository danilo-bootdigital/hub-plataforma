'use client'

import { useState, useEffect, Component, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Smartphone, BarChart3, FileText, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Carregamento dinâmico para isolar erros nos componentes pesados
const WhatsAppInstanceManager = dynamic(
  () => import('@/components/whatsapp/whatsapp-instance-manager').then(m => {
    console.log('[configuracoes-whatsapp] WhatsAppInstanceManager carregado')
    return m.WhatsAppInstanceManager
  }).catch(err => {
    console.error('[configuracoes-whatsapp] Falha ao carregar WhatsAppInstanceManager:', err)
    throw err
  }),
  {
    ssr: false,
    loading: () => <div className="p-4 text-sm text-muted-foreground">Carregando gerenciador de instâncias...</div>
  }
)

const WhatsAppMonitor = dynamic(
  () => import('@/components/whatsapp/whatsapp-monitor').then(m => {
    console.log('[configuracoes-whatsapp] WhatsAppMonitor carregado')
    return m.WhatsAppMonitor
  }).catch(err => {
    console.error('[configuracoes-whatsapp] Falha ao carregar WhatsAppMonitor:', err)
    throw err
  }),
  {
    ssr: false,
    loading: () => <div className="p-4 text-sm text-muted-foreground">Carregando monitor...</div>
  }
)

// ErrorBoundary para capturar erros de renderização
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  componentStack: string | null
}

class ErrorBoundary extends Component<{ children: ReactNode, name: string }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode, name: string }) {
    super(props)
    this.state = { hasError: false, error: null, componentStack: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error(`[ErrorBoundary-${this.props.name}] ERRO CAPTURADO:`, error)
    console.error(`[ErrorBoundary-${this.props.name}] MENSAGEM:`, error.message)
    console.error(`[ErrorBoundary-${this.props.name}] STACK:`, error.stack)
    console.error(`[ErrorBoundary-${this.props.name}] COMPONENT_STACK:`, errorInfo.componentStack)
    this.setState({ componentStack: errorInfo.componentStack })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-300 bg-red-50 rounded-lg">
          <h3 className="font-bold text-red-700 mb-2">Erro no componente &quot;{this.props.name}&quot;:</h3>
          <pre className="text-xs text-red-700 whitespace-pre-wrap mb-2">
            {this.state.error?.message}
          </pre>
          <details className="mt-2" open>
            <summary className="cursor-pointer text-red-600 font-medium">Stack trace</summary>
            <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap bg-white p-2 rounded">
              {this.state.error?.stack}
            </pre>
          </details>
          <details className="mt-2">
            <summary className="cursor-pointer text-red-600 font-medium">Component stack</summary>
            <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap bg-white p-2 rounded">
              {this.state.componentStack || ''}
            </pre>
          </details>
        </div>
      )
    }
    return this.props.children
  }
}

export default function WhatsAppSettingsPage() {
  const [activeTab, setActiveTab] = useState('instances')
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Obter organizationId do usuário logado
  useEffect(() => {
    const getOrganization = async () => {
      try {
        console.log('[configuracoes-whatsapp] Obtendo organizationId...')
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          console.error('[configuracoes-whatsapp] Erro de autenticação:', authError)
          throw new Error('Usuário não autenticado')
        }

        const { data: perfil, error: perfilError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (perfilError || !perfil) {
          console.error('[configuracoes-whatsapp] Erro ao obter perfil:', perfilError)
          throw new Error('Perfil não encontrado')
        }

        console.log('[configuracoes-whatsapp] Organization ID:', perfil.organization_id)
        setOrganizationId(perfil.organization_id)
      } catch (error) {
        console.error('[configuracoes-whatsapp] Erro ao obter organizationId:', error)
        toast.error(error instanceof Error ? error.message : 'Erro desconhecido', { description: 'Erro ao carregar configurações' })
      } finally {
        setLoading(false)
      }
    }

    getOrganization()
  }, [])

  const handleEnvironmentTest = async () => {
    try {
      console.log('[configuracoes-whatsapp] Testando conexão...')
      const response = await fetch('/api/whatsapp/debug-env')
      console.log('[configuracoes-whatsapp] Resposta status:', response.status)
      const data = await response.json()
      console.log('[configuracoes-whatsapp] Data:', data)

      if (data.success && data.envVars?.EVOLUTION_API_URL === 'OK' && data.envVars?.EVOLUTION_API_KEY === 'OK') {
        toast.success('A conexão com a API está funcionando corretamente.', { description: 'API Evolution acessível' })
      } else {
        const missingVars = []
        if (data.envVars?.EVOLUTION_API_URL === 'Faltando') missingVars.push('EVOLUTION_API_URL')
        if (data.envVars?.EVOLUTION_API_KEY === 'Faltando') missingVars.push('EVOLUTION_API_KEY')
        if (data.envVars?.EVOLUTION_WEBHOOK_SECRET === 'Faltando') missingVars.push('EVOLUTION_WEBHOOK_SECRET')

        toast.error(`Configure: ${missingVars.join(', ')}`, { description: 'Variáveis de ambiente faltando' })
      }
    } catch (error) {
      console.error('[configuracoes-whatsapp] Erro no teste:', error)
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido', { description: 'Erro ao testar conexão' })
    }
  }

  // Se estiver carregando ou sem organizationId, mostrar loading
  if (loading || !organizationId) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando configurações...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Configurações WhatsApp</h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie suas instâncias, monitore o status e configure integrações
        </p>
      </div>

      {/* Alertas iniciais */}
      <div className="mb-6 space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Antes de configurar as instâncias, certifique-se de que todas as variáveis de ambiente
            estão configuradas no arquivo <code className="bg-muted px-1 rounded">.env.local</code>.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Verificação Rápida</span>
            </CardTitle>
            <CardDescription>
              Teste se as configurações básicas estão funcionando
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>API URL</Label>
                <Input
                  placeholder="Configure no servidor"
                  defaultValue=""
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  placeholder="Configure no servidor"
                  defaultValue=""
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <Input
                  placeholder="Configure no servidor"
                  defaultValue=""
                  readOnly
                />
              </div>
            </div>
            <Button onClick={handleEnvironmentTest} className="w-full md:w-auto">
              Testar Conexão
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Abas principais - envolvidas por ErrorBoundary */}
      <ErrorBoundary name="TabsContainer">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="instances" className="flex items-center space-x-2">
              <Smartphone className="h-4 w-4" />
              <span>Instâncias</span>
            </TabsTrigger>
            <TabsTrigger value="monitor" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Monitoramento</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Logs</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Documentação</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instances" className="mt-6">
            <ErrorBoundary name="WhatsAppInstanceManager">
              <WhatsAppInstanceManager
                organizationId={organizationId}
                onInstanceUpdate={() => setActiveTab('monitor')}
              />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="monitor" className="mt-6">
            <ErrorBoundary name="WhatsAppMonitor">
              <WhatsAppMonitor />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Logs do Sistema</CardTitle>
                <CardDescription>
                  Veja os logs detalhados do WhatsApp e do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full">
                    Baixar Logs Completos
                  </Button>
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Logs Recentes</h4>
                    <div className="text-sm space-y-1 font-mono">
                      <div>[2024-01-15 14:30:15] INFO: Instância &quot;WhatsApp Principal&quot; conectada</div>
                      <div>[2024-01-15 14:28:32] INFO: Webhook recebido com sucesso</div>
                      <div>[2024-01-15 14:25:10] WARN: Instância &quot;WhatsApp Secundário&quot; desconectada</div>
                      <div>[2024-01-15 14:20:45] ERROR: Falha ao enviar mensagem para +5511999999999</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Primeiros Passos</CardTitle>
                  <CardDescription>
                    Como configurar e usar o WhatsApp Integration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">1. Configure as variáveis de ambiente</h4>
                    <p className="text-sm text-muted-foreground">
                      Adicione ao seu arquivo <code className="bg-muted px-1 rounded">.env.local</code>:
                    </p>
                    <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`EVOLUTION_API_URL=https://api.evolution-api.com
EVOLUTION_API_KEY=sua-chave-api
EVOLUTION_WEBHOOK_SECRET=seu-secret`}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">2. Crie uma instância</h4>
                    <p className="text-sm text-muted-foreground">
                      Vá para a aba &quot;Instâncias&quot; e crie uma nova instância com um nome único.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">3. Conecte o WhatsApp</h4>
                    <p className="text-sm text-muted-foreground">
                      Clique em &quot;QR Code&quot; e escaneie com o WhatsApp do seu celular.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Solução de Problemas</CardTitle>
                  <CardDescription>
                    Problemas comuns e suas soluções
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">QR Code não aparece</h4>
                    <p className="text-sm text-muted-foreground">
                      Verifique se a API Evolution está online e a chave está correta.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Mensagens não são recebidas</h4>
                    <p className="text-sm text-muted-foreground">
                      Verifique se o webhook está acessível e o secret está correto.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Instância desconectada</h4>
                    <p className="text-sm text-muted-foreground">
                      A instância pode ter expirado. Crie uma nova instância.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </ErrorBoundary>
    </div>
  )
}
