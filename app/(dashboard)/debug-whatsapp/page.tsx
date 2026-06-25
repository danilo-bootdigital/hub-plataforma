'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, AlertCircle, CheckCircle, Loader2, Smartphone } from 'lucide-react'

export default function DebugWhatsAppPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [dados, setDados] = useState<any>(null)

  const verificarConexao = async () => {
    try {
      setStatus('loading')

      // Chamar a rota API server-side
      const response = await fetch('/api/whatsapp/debug-env')
      const data = await response.json()

      if (data.success) {
        setDados({
          user: data.user,
          perfil: data.perfil,
          instancias: data.instancias,
          envVars: data.envVars,
          evolutionStatus: data.evolutionStatus,
          timestamp: data.timestamp
        })
        setStatus('success')
      } else {
        setError(data.error || 'Erro ao verificar configuração')
        setStatus('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
    }
  }

  useEffect(() => {
    verificarConexao()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Depuração WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Verifique a configuração atual do módulo WhatsApp
          </p>
        </div>
        <Button onClick={verificarConexao} disabled={status === 'loading'}>
          <RefreshCw className={`h-4 w-4 mr-2 ${status === 'loading' ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {status === 'loading' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Carregando dados...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'error' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Erro ao verificar configuração:</span>
            </div>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {status === 'success' && dados && (
        <div className="space-y-6">
          {/* Status geral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Sistema Operacional
              </CardTitle>
              <CardDescription>
                Verificação básica do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Usuário autenticado</span>
                <Badge variant="default">OK</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Perfil encontrado</span>
                <Badge variant="default">OK</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Organização</span>
                <Badge variant="default">{dados.perfil.organization_id}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Variáveis de ambiente */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Ambiente</CardTitle>
              <CardDescription>
                Verifique se as variáveis de ambiente estão configuradas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(dados.envVars).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="font-mono text-sm">{key}</span>
                  <Badge variant={value === 'OK' ? 'default' : 'destructive'}>
                    {value === 'OK' ? 'OK' : 'Faltando'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Status da Evolution API */}
          {dados.evolutionStatus && dados.evolutionStatus !== 'Não testado' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Status da Evolution API
                </CardTitle>
                <CardDescription>
                  Teste de conexão com a API Evolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span>Conexão com API</span>
                  <Badge variant={
                    dados.evolutionStatus === 'OK' ? 'default' : 'destructive'
                  }>
                    {dados.evolutionStatus === 'OK' ? 'OK' : dados.evolutionStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instâncias WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle>Instâncias WhatsApp</CardTitle>
              <CardDescription>
                Lista de instâ configuradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dados.instancias.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma instância configurada</p>
              ) : (
                <div className="space-y-3">
                  {dados.instancias.map((inst: any) => (
                    <div key={inst.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{inst.nome || 'Sem nome'}</p>
                        <p className="text-sm text-muted-foreground">{inst.evolution_instance_name}</p>
                      </div>
                      <Badge variant={
                        inst.status_conexao === 'conectado' ? 'default' :
                        inst.status_conexao === 'desconectado' ? 'secondary' :
                        'destructive'
                      }>
                        {inst.status_conexao}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamp */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">
                Última verificação: {new Date(dados.timestamp).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}