'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WhatsAppMonitor } from '@/components/whatsapp/whatsapp-monitor'
import { BarChart3, Activity, AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function WhatsAppMonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <BarChart3 className="h-8 w-8" />
              <span>Monitoramento WhatsApp</span>
            </h1>
            <p className="text-muted-foreground">
              Dashboard em tempo real com status das instâncias e estatísticas
            </p>
          </div>
          <Link href="/configuracoes-whatsapp">
            <Button variant="outline">
              Configurações
            </Button>
          </Link>
        </div>
      </div>

      {/* Alertas rápidos */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-lg font-semibold">Operacional</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Todas as instâncias funcionando normalmente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Hoje</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              +12% em relação a ontem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">2 pendentes</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requer atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monitoramento principal */}
      <WhatsAppMonitor />
    </div>
  )
}