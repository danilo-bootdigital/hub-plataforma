'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function WhatsappTestPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setError('Usuário não autenticado')
          return
        }

        setUser(user)
        setError(null)
      } catch (err) {
        setError('Erro ao carregar usuário')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.href = '/login'} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Página de Teste - WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Usuário Logado:</h3>
              <p className="text-sm text-gray-600">ID: {user?.id}</p>
              <p className="text-sm text-gray-600">Email: {user?.email}</p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Próximos Passos:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Verificar se o Supabase está configurado corretamente</li>
                <li>• Testar a conexão com o banco de dados</li>
                <li>• Verificar as permissões do usuário</li>
                <li>• Testar as rotas do WhatsApp</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}