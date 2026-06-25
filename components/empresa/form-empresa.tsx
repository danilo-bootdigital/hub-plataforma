'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { atualizarEmpresa, atualizarLogo } from '@/app/(dashboard)/configuracoes/empresa/actions'
import { Building2, Upload } from 'lucide-react'

type Props = {
  organizationId: string
  defaultValues: {
    nome_fantasia: string
    cnpj: string
    telefone: string
    email: string
    endereco: string
    logo_url: string
    site: string
    instagram: string
  }
}

export function FormEmpresa({ organizationId, defaultValues }: Props) {
  const [isPending, startTransition] = useTransition()
  const [logoUrl, setLogoUrl] = useState(defaultValues.logo_url)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await atualizarEmpresa(formData)
        toast.success('Dados da empresa atualizados.')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2MB.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await atualizarLogo(formData)
      setLogoUrl(result.url + '?t=' + Date.now())
      toast.success('Logo atualizado.')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao fazer upload.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logotipo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
            ) : (
              <Building2 className="h-12 w-12 text-slate-300" />
            )}
          </div>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
              <Upload className="h-4 w-4" />
              {uploading ? 'Enviando...' : 'Alterar logo'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          <p className="text-xs text-slate-400 text-center">PNG ou JPG, máx. 2MB</p>
        </CardContent>
      </Card>

      {/* Dados */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Dados da Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input id="nome_fantasia" name="nome_fantasia" defaultValue={defaultValues.nome_fantasia} placeholder="Nome que aparecerá nos documentos" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" name="cnpj" defaultValue={defaultValues.cnpj} placeholder="00.000.000/0000-00" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" defaultValue={defaultValues.telefone} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={defaultValues.email} placeholder="contato@empresa.com" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" defaultValue={defaultValues.endereco} placeholder="Rua, número, bairro, cidade - UF" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="site">Site</Label>
                <Input id="site" name="site" defaultValue={defaultValues.site} placeholder="https://www.seusite.com.br" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" name="instagram" defaultValue={defaultValues.instagram} placeholder="@seuinstagram" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
