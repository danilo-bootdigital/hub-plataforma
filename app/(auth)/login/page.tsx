import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { entrar } from './actions'

const mensagensErro: Record<string, string> = {
  'credenciais-invalidas': 'E-mail ou senha incorretos. Tente novamente.',
  'erro-inesperado': 'Ocorreu um erro inesperado. Tente novamente.',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">BOOT CRM</CardTitle>
        <CardDescription>
          Entre com seu e-mail e senha para acessar o sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={entrar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <ErroLogin searchParams={searchParams} />
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

async function ErroLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const params = await searchParams
  if (!params.erro) return null
  const mensagem = mensagensErro[params.erro] ?? 'Erro ao fazer login.'
  return (
    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
      {mensagem}
    </div>
  )
}
