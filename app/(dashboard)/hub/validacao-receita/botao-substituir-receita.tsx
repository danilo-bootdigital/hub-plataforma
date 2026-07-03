'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { substituirReceitaConferencia, rodarPreAnalise } from './actions'

const TIPOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX = 10 * 1024 * 1024

// Troca o arquivo da receita e reexecuta a análise (mesma validação).
export function BotaoSubstituirReceita({ conferenciaId, onFeito }: { conferenciaId: string; onFeito?: () => void }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function escolher(f: File | null) {
    setErro(null)
    if (!f) return
    if (!TIPOS.includes(f.type)) { setErro('Arquivo deve ser PDF, JPG ou PNG.'); return }
    if (f.size > MAX) { setErro('Arquivo deve ter no máximo 10MB.'); return }
    start(async () => {
      try {
        const fd = new FormData()
        fd.set('file', f)
        await substituirReceitaConferencia(conferenciaId, fd)
        try { await rodarPreAnalise(conferenciaId) } catch { /* mostra estado de erro no detalhe */ }
        if (onFeito) onFeito()
        else router.refresh()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha ao substituir a receita.')
      }
    })
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*" className="hidden"
        onChange={(e) => escolher(e.target.files?.[0] ?? null)} />
      <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Upload />} Substituir receita
      </Button>
      {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
    </div>
  )
}
