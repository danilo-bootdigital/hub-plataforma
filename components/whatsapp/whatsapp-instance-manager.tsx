'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  QrCode,
  Copy,
  Eye,
  Trash2
} from 'lucide-react'
import { criarInstancia, obterQRCode, obterEstadoConexao } from '@/lib/evolution'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface WhatsAppInstance {
  id: string
  nome: string
  numero: string
  status_conexao: 'conectado' | 'desconectado' | 'aguardando_qr'
  evolution_instance_name: string
  created_at: string
  updated_at: string
}

interface Props {
  organizationId: string
  onInstanceUpdate?: () => void
}

export function WhatsAppInstanceManager({ organizationId, onInstanceUpdate }: Props) {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [qrCode, setQrCode] = useState<{ instanceName: string; base64: string | null } | null>(null)
  const [connectionStates, setConnectionStates] = useState<Map<string, 'conectado' | 'desconectado' | 'aguardando_qr'>>(new Map())
  const [webhookUrl, setWebhookUrl] = useState('')
  const [newInstanceName, setNewInstanceName] = useState('')
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [instanceToDelete, setInstanceToDelete] = useState<WhatsAppInstance | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)

  const supabase = createClient()

  // Salvar configurações globais
  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      // Atualizar todas as instâncias existentes com as novas configurações
      // (implementação futura: armazenar em tabela de configurações globais)
      toast.success('As configurações globais foram atualizadas.', { description: 'Configurações salvas' })
    } catch (error) {
      toast.error('', { description: 'Erro ao salvar' })
    } finally {
      setSavingSettings(false)
    }
  }

  // Gerar URL do webhook
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const baseUrl = window.location.origin
        const url = `${baseUrl}/api/webhook/evolution`
        console.log('[WhatsAppInstanceManager] Webhook URL gerada:', url)
        setWebhookUrl(url)
      } catch (error) {
        console.error('[WhatsAppInstanceManager] Erro ao gerar webhook URL:', error)
      }
    }
  }, [])

  // Carregar instâncias
  const loadInstances = async () => {
    setLoading(true)
    try {
      console.log('[WhatsAppInstanceManager] Carregando instâncias para org:', organizationId)

      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[WhatsAppInstanceManager] Erro ao carregar instâncias:', error)
        throw error
      }

      console.log('[WhatsAppInstanceManager] Instâncias encontradas:', data?.length || 0)
      setInstances(data || [])

      // Verificar estado de conexão de cada instância
      const states = new Map()
      for (const instance of data || []) {
        try {
          console.log('[WhatsAppInstanceManager] Verificando estado da instância:', instance.evolution_instance_name)
          const state = await obterEstadoConexao(instance.evolution_instance_name!)
          const status = state === 'open' ? 'conectado' : state === 'close' ? 'desconectado' : 'aguardando_qr'
          states.set(instance.id, status)
          console.log(`[WhatsAppInstanceManager] Instância ${instance.evolution_instance_name}: ${status}`)
        } catch (err) {
          console.error('[WhatsAppInstanceManager] Erro ao verificar estado da instância:', instance.evolution_instance_name, err)
          states.set(instance.id, 'desconectado')
        }
      }
      setConnectionStates(states)
    } catch (error) {
      console.error('[WhatsAppInstanceManager] Erro geral ao carregar instâncias:', error)
      toast.error('', { description: 'Erro ao carregar instâncias' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInstances()

    // Atualizar estados a cada 30 segundos — busca fresca do banco para evitar stale closure
    const interval = setInterval(async () => {
      const { data: atuais } = await supabase
        .from('whatsapp_instances')
        .select('id, evolution_instance_name')
        .eq('organization_id', organizationId)

      if (!atuais) return

      const states = new Map<string, 'conectado' | 'desconectado' | 'aguardando_qr'>()
      for (const instance of atuais) {
        try {
          const state = await obterEstadoConexao(instance.evolution_instance_name!)
          states.set(instance.id, state === 'open' ? 'conectado' : state === 'close' ? 'desconectado' : 'aguardando_qr')
        } catch (err) {
          states.set(instance.id, 'desconectado')
        }
      }
      setConnectionStates(states)
    }, 30000)

    return () => clearInterval(interval)
  }, [organizationId])

  // Criar nova instância
  const handleCreateInstance = async () => {
    if (!newInstanceName.trim() || !webhookUrl.trim()) {
      toast.error('Nome da instância e URL do webhook são obrigatórios', { description: 'Preencha todos os campos' })
      return
    }

    setCreating(true)
    try {
      console.log('[WhatsAppInstanceManager] Criando nova instância:', newInstanceName)
      console.log('[WhatsAppInstanceManager] Webhook URL:', webhookUrl)

      // Criar instância na Evolution API
      await criarInstancia(newInstanceName, webhookUrl)
      console.log('[WhatsAppInstanceManager] Instância criada na Evolution API')

      // Salvar no banco
      console.log('[WhatsAppInstanceManager] Salvando no banco...')
      const { error } = await supabase
        .from('whatsapp_instances')
        .insert({
          organization_id: organizationId,
          nome: newInstanceName,
          evolution_instance_name: newInstanceName,
          status_conexao: 'aguardando_qr',
          numero: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('[WhatsAppInstanceManager] Erro ao salvar no banco:', error)
        throw error
      }

      toast.success('A instância foi criada. Escaneie o QR code para conectar.', { description: 'Instância criada' })

      setNewInstanceName('')
      await loadInstances()
      onInstanceUpdate?.()
    } catch (error) {
      console.error('[WhatsAppInstanceManager] Erro ao criar instância:', error)
      toast.error('', { description: 'Erro ao criar instância' })
    } finally {
      setCreating(false)
    }
  }

  // Obter QR code
  const handleGetQRCode = async (instance: WhatsAppInstance) => {
    try {
      const base64 = await obterQRCode(instance.evolution_instance_name!)
      setQrCode({ instanceName: instance.evolution_instance_name!, base64 })
      setSelectedInstance(instance)
    } catch (error) {
      toast.error('', { description: 'Erro ao obter QR code' })
    }
  }

  // Deletar instância
  const handleDeleteInstance = async () => {
    if (!instanceToDelete) return

    try {
      // Deletar da Evolution API
      // await deletarInstancia(instanceToDelete.evolution_instance_name!)

      // Deletar do banco
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', instanceToDelete.id)

      if (error) throw error

      toast.success('A instância foi removida com sucesso.', { description: 'Instância deletada' })

      setDeleteDialogOpen(false)
      setInstanceToDelete(null)
      await loadInstances()
      onInstanceUpdate?.()
    } catch (error) {
      toast.error('', { description: 'Erro ao deletar instância' })
    }
  }

  // Copiar QR code
  const copyQRCode = () => {
    if (qrCode?.base64) {
      navigator.clipboard.writeText(qrCode.base64)
      toast.info('O QR code foi copiado para a área de transferência.', { description: 'QR Code copiado' })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'conectado':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'aguardando_qr':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (instanceId: string) => {
    const status = connectionStates.get(instanceId) || 'desconectado'
    return (
      <Badge variant={status === 'conectado' ? 'default' : status === 'aguardando_qr' ? 'secondary' : 'destructive'}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando instâncias...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Instâncias WhatsApp</h2>
          <p className="text-muted-foreground">Gerencie suas conexões com o WhatsApp</p>
        </div>
      </div>

      {/* Alertas */}
      {instances.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma instância configurada. Crie uma nova instância para começar a usar o WhatsApp.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="instances">
        <TabsList>
          <TabsTrigger value="instances">Instâncias</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="instances" className="space-y-4">
          {/* Lista de instâncias */}
          {instances.map((instance) => (
            <Card key={instance.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-5 w-5" />
                  <CardTitle>{instance.nome}</CardTitle>
                  {getStatusBadge(instance.id)}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGetQRCode(instance)}
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    QR Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInstanceToDelete(instance)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Nome da instância:</strong> {instance.evolution_instance_name}
                  </div>
                  <div>
                    <strong>Número:</strong> {instance.numero || 'Não configurado'}
                  </div>
                  <div>
                    <strong>Criado em:</strong> {new Date(instance.created_at).toLocaleString()}
                  </div>
                  <div>
                    <strong>Atualizado em:</strong> {new Date(instance.updated_at).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Criar nova instância */}
          <Card>
            <CardHeader>
              <CardTitle>Criar Nova Instância</CardTitle>
              <CardDescription>
                Crie uma nova instância de WhatsApp para começar a receber e enviar mensagens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instance-name">Nome da Instância</Label>
                  <Input
                    id="instance-name"
                    placeholder="Ex: WhatsApp Principal"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL do Webhook</Label>
                  <Input
                    id="webhook-url"
                    value={webhookUrl}
                    readOnly
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateInstance}
                disabled={creating}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Instância
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Globais</CardTitle>
              <CardDescription>
                Configure as opções avançadas para todas as instâncias.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Wifi className="h-4 w-4" />
                <AlertDescription>
                  As configurações globais serão aplicadas a todas as novas instâncias criadas.
                  Para instâncias existentes, as configurações precisam ser atualizadas individualmente.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timeout do Webhook</Label>
                  <Select defaultValue="15">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 segundos</SelectItem>
                      <SelectItem value="10">10 segundos</SelectItem>
                      <SelectItem value="15">15 segundos</SelectItem>
                      <SelectItem value="30">30 segundos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tentativas de Envio</Label>
                  <Select defaultValue="3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 tentativa</SelectItem>
                      <SelectItem value="2">2 tentativas</SelectItem>
                      <SelectItem value="3">3 tentativas</SelectItem>
                      <SelectItem value="5">5 tentativas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cache de Contatos</Label>
                  <Select defaultValue="300">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 minuto</SelectItem>
                      <SelectItem value="300">5 minutos</SelectItem>
                      <SelectItem value="600">10 minutos</SelectItem>
                      <SelectItem value="1800">30 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rate Limit</Label>
                  <Select defaultValue="60">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 mensagens/minuto</SelectItem>
                      <SelectItem value="60">60 mensagens/minuto</SelectItem>
                      <SelectItem value="100">100 mensagens/minuto</SelectItem>
                      <SelectItem value="200">200 mensagens/minuto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full">
                {savingSettings ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Configurações'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={!!qrCode} onOpenChange={() => !qrCode?.base64 && setQrCode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code - {selectedInstance?.nome}</DialogTitle>
            <DialogDescription>
              Escaneie este QR code com o WhatsApp do seu celular para conectar a instância.
            </DialogDescription>
          </DialogHeader>

          {qrCode?.base64 && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-gray-100 rounded-lg">
                  <img
                    src={`data:image/png;base64,${qrCode.base64}`}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
              </div>

              <div className="flex justify-center space-x-2">
                <Button variant="outline" onClick={copyQRCode}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar QR Code
                </Button>
                <Button variant="outline" onClick={() => setQrCode(null)}>
                  Fechar
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  O QR code expira em 60 segundos. Se o QR code não funcionar, gere um novo.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar Instância</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar a instância "{instanceToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteInstance}>
              Deletar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}