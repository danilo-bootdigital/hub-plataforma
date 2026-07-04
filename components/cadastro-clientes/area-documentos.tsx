'use client'

import { useRef, useState, useTransition } from 'react'
import { FileText, Upload, Eye, RefreshCw, Trash2, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { anexarDocumento, removerDocumento, urlAssinadaDocumento } from '@/app/(dashboard)/hub/cadastro-clientes/actions'
import { TIPOS_ARQUIVO_ACEITOS, TAMANHO_MAX_ARQUIVO, type DocumentoDef, type DetalheCadastro } from '@/lib/cadastro-clientes/documentos'

type ArquivoExistente = DetalheCadastro['arquivos'][number]

export function AreaDocumentos({
  onboardingId,
  documentos,
  arquivos,
  editavel,
  onMudou,
}: {
  onboardingId: string
  documentos: DocumentoDef[]
  arquivos: ArquivoExistente[]
  editavel: boolean
  onMudou?: () => void
}) {
  return (
    <div className="space-y-3">
      {documentos.map((doc) => (
        <LinhaDocumento
          key={doc.tipo}
          onboardingId={onboardingId}
          doc={doc}
          arquivo={arquivos.find((a) => a.tipo_documento === doc.tipo) ?? null}
          editavel={editavel}
          onMudou={onMudou}
        />
      ))}
    </div>
  )
}

function LinhaDocumento({
  onboardingId, doc, arquivo, editavel, onMudou,
}: {
  onboardingId: string
  doc: DocumentoDef
  arquivo: ArquivoExistente | null
  editavel: boolean
  onMudou?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendente, startTransition] = useTransition()
  const [abrindo, setAbrindo] = useState(false)
  const enviado = !!arquivo

  function escolher(file: File | null) {
    if (!file) return
    if (!TIPOS_ARQUIVO_ACEITOS.includes(file.type)) { toast.error('Arquivo deve ser PDF ou imagem (PNG/JPG/WEBP).'); return }
    if (file.size > TAMANHO_MAX_ARQUIVO) { toast.error('Arquivo deve ter no máximo 10MB.'); return }
    const fd = new FormData()
    fd.set('onboardingId', onboardingId)
    fd.set('tipoDocumento', doc.tipo)
    fd.set('file', file)
    startTransition(async () => {
      try {
        await anexarDocumento(fd)
        toast.success(`${doc.rotulo} enviado.`)
        onMudou?.()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao enviar documento.')
      }
    })
  }

  async function visualizar() {
    if (!arquivo) return
    setAbrindo(true)
    try {
      const url = await urlAssinadaDocumento(onboardingId, arquivo.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao abrir documento.')
    } finally {
      setAbrindo(false)
    }
  }

  function remover() {
    if (!arquivo) return
    startTransition(async () => {
      try {
        await removerDocumento(onboardingId, arquivo.id)
        toast.success(`${doc.rotulo} removido.`)
        onMudou?.()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao remover documento.')
      }
    })
  }

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border p-3',
      enviado ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'
    )}>
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
        enviado ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
        <FileText className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{doc.rotulo}</p>
        <span className="inline-flex items-center gap-1 text-xs">
          {enviado ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-600">Enviado</span>
              <span className="truncate text-slate-400"> · {arquivo!.nome_arquivo}</span></>
          ) : (
            <><Circle className="h-3.5 w-3.5 text-amber-400" /><span className="text-amber-600">Pendente · obrigatório</span></>
          )}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ARQUIVO_ACEITOS.join(',')}
        className="hidden"
        onChange={(e) => { escolher(e.target.files?.[0] ?? null); e.target.value = '' }}
      />

      <div className="flex shrink-0 items-center gap-1">
        {enviado && (
          <Button type="button" variant="ghost" size="sm" onClick={visualizar} disabled={abrindo}>
            {abrindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Visualizar</span>
          </Button>
        )}
        {editavel && (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()} disabled={pendente}>
              {pendente ? <Loader2 className="h-4 w-4 animate-spin" /> : (enviado ? <RefreshCw className="h-4 w-4" /> : <Upload className="h-4 w-4" />)}
              <span className="ml-1 hidden sm:inline">{enviado ? 'Substituir' : 'Enviar'}</span>
            </Button>
            {enviado && (
              <Button type="button" variant="ghost" size="sm" onClick={remover} disabled={pendente} className="text-rose-600 hover:text-rose-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
