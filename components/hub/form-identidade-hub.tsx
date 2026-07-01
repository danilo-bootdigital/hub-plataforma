'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { atualizarIdentidadeHub, type IdentidadeHub } from '@/app/(dashboard)/hub/identidade/actions'

export function FormIdentidadeHub({ hubNome, inicial }: { hubNome: string; inicial: IdentidadeHub }) {
  const router = useRouter()
  const [saving, startSaving] = useTransition()
  const [logoUrl, setLogoUrl] = useState(inicial.logo_url ?? '')
  const [telefone, setTelefone] = useState(inicial.telefone ?? '')
  const [email, setEmail] = useState(inicial.email ?? '')
  const [site, setSite] = useState(inicial.site ?? '')
  const [instagram, setInstagram] = useState(inicial.instagram ?? '')
  const [cnpj, setCnpj] = useState(inicial.cnpj ?? '')
  const [endereco, setEndereco] = useState(inicial.endereco ?? '')

  function salvar() {
    startSaving(async () => {
      try {
        await atualizarIdentidadeHub({
          logo_url: logoUrl || null,
          telefone: telefone || null,
          email: email || null,
          site: site || null,
          instagram: instagram || null,
          cnpj: cnpj || null,
          endereco: endereco || null,
        })
        toast.success('Identidade do Hub salva.')
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Identidade do Hub</CardTitle>
          <p className="text-sm text-slate-500">
            Estes dados aparecem no cabeçalho e rodapé do PDF de orçamento enviado ao cliente. Hub: <span className="font-medium text-slate-700">{hubNome}</span>
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="logo">Logo (URL da imagem)</Label>
            <Input id="logo" inputMode="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
            {logoUrl.trim() && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt="Prévia do logo" className="mt-2 h-12 w-auto object-contain" />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="site">Site</Label>
            <Input id="site" value={site} onChange={(e) => setSite(e.target.value)} placeholder="www.seuhub.com.br" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seuhub" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" disabled={saving} onClick={salvar}>
          {saving ? 'Salvando…' : 'Salvar identidade'}
        </Button>
      </div>
    </div>
  )
}
