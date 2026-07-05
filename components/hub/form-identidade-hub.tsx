'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { atualizarIdentidadeHub, uploadBrandingAsset, type IdentidadeHub } from '@/app/(dashboard)/hub/identidade/actions'

export function FormIdentidadeHub({ inicial }: { inicial: IdentidadeHub }) {
  const router = useRouter()
  const [saving, startSaving] = useTransition()
  const [f, setF] = useState<IdentidadeHub>({ ...inicial, redes_sociais: inicial.redes_sociais ?? {} })

  function set<K extends keyof IdentidadeHub>(k: K, v: IdentidadeHub[K]) {
    setF((prev) => ({ ...prev, [k]: v }))
  }
  function setRede(k: keyof NonNullable<IdentidadeHub['redes_sociais']>, v: string) {
    setF((prev) => ({ ...prev, redes_sociais: { ...prev.redes_sociais, [k]: v } }))
  }

  function salvar() {
    startSaving(async () => {
      try {
        await atualizarIdentidadeHub(f)
        toast.success('Identidade do Hub salva.')
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      {/* Marca */}
      <Card>
        <CardHeader>
          <CardTitle>Identidade do Hub</CardTitle>
          <p className="text-sm text-slate-500">
            Nome, marca e cores do seu Hub. Estes dados aparecem no PDF de orçamento e passarão a personalizar a aparência da plataforma.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nome do Hub" className="sm:col-span-2">
            <Input value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome do seu Hub" />
          </Campo>
          <Campo label="Nome fantasia" className="sm:col-span-2">
            <Input value={f.nome_fantasia ?? ''} onChange={(e) => set('nome_fantasia', e.target.value)} />
          </Campo>

          <UploadImagem
            label="Logotipo" tipo="logo" url={f.logo_url}
            onEnviado={(url) => set('logo_url', url)}
            previewClass="h-12 w-auto object-contain"
          />
          <UploadImagem
            label="Favicon" tipo="favicon" url={f.favicon_url}
            onEnviado={(url) => set('favicon_url', url)}
            previewClass="h-8 w-8 object-contain"
          />

          <CampoCor label="Cor primária" value={f.cor_primaria} onChange={(v) => set('cor_primaria', v)} />
          <CampoCor label="Cor secundária" value={f.cor_secundaria} onChange={(v) => set('cor_secundaria', v)} />
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo label="WhatsApp principal">
            <Input value={f.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(11) 99999-9999" />
          </Campo>
          <Campo label="Telefone">
            <Input value={f.telefone ?? ''} onChange={(e) => set('telefone', e.target.value)} />
          </Campo>
          <Campo label="E-mail">
            <Input inputMode="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </Campo>
          <Campo label="Site">
            <Input value={f.site ?? ''} onChange={(e) => set('site', e.target.value)} placeholder="www.seuhub.com.br" />
          </Campo>
        </CardContent>
      </Card>

      {/* Redes sociais */}
      <Card>
        <CardHeader><CardTitle>Redes sociais</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo label="Instagram">
            <Input value={f.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} placeholder="@seuhub" />
          </Campo>
          <Campo label="Facebook">
            <Input value={f.redes_sociais?.facebook ?? ''} onChange={(e) => setRede('facebook', e.target.value)} />
          </Campo>
          <Campo label="LinkedIn">
            <Input value={f.redes_sociais?.linkedin ?? ''} onChange={(e) => setRede('linkedin', e.target.value)} />
          </Campo>
          <Campo label="YouTube">
            <Input value={f.redes_sociais?.youtube ?? ''} onChange={(e) => setRede('youtube', e.target.value)} />
          </Campo>
        </CardContent>
      </Card>

      {/* Dados fiscais */}
      <Card>
        <CardHeader><CardTitle>Dados fiscais</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo label="CNPJ">
            <Input value={f.cnpj ?? ''} onChange={(e) => set('cnpj', e.target.value)} />
          </Campo>
          <Campo label="Endereço" className="sm:col-span-2">
            <Input value={f.endereco ?? ''} onChange={(e) => set('endereco', e.target.value)} />
          </Campo>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" disabled={saving} onClick={salvar}>
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  )
}

function Campo({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )
}

function CampoCor({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  const cor = value && /^#/.test(value) ? value : '#0f766e'
  return (
    <Campo label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color" value={cor} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-slate-200 bg-white p-1"
          aria-label={label}
        />
        <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="#0F766E" />
      </div>
    </Campo>
  )
}

function UploadImagem({
  label, tipo, url, onEnviado, previewClass,
}: {
  label: string
  tipo: 'logo' | 'favicon'
  url: string | null
  onEnviado: (url: string) => void
  previewClass: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)

  async function aoSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviando(true)
    try {
      const fd = new FormData()
      fd.set('tipo', tipo)
      fd.set('file', file)
      const novaUrl = await uploadBrandingAsset(fd)
      onEnviado(novaUrl)
      toast.success(`${label} enviado.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no upload.')
    } finally {
      setEnviando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Campo label={label}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-200 bg-slate-50">
          {url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={url} alt={`Prévia do ${label.toLowerCase()}`} className={previewClass} />
          ) : (
            <span className="text-[10px] text-slate-400">sem imagem</span>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*,.ico" className="hidden" onChange={aoSelecionar} />
        <Button type="button" variant="outline" size="sm" disabled={enviando} onClick={() => inputRef.current?.click()}>
          {enviando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
          Enviar
        </Button>
      </div>
    </Campo>
  )
}
