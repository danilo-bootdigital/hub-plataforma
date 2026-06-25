'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { adicionarObservacaoContato } from '@/app/(dashboard)/contatos/actions'

export function FormObservacaoContato({ contatoId }: { contatoId: string }) {
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit() {
    if (!texto.trim()) return
    setCarregando(true)
    setErro(null)
    try {
      await adicionarObservacaoContato(contatoId, texto.trim())
      setTexto('')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar observação.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escreva uma observação sobre este contato..."
        rows={3}
      />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button onClick={handleSubmit} disabled={carregando || !texto.trim()} size="sm">
        {carregando ? 'Salvando...' : 'Adicionar'}
      </Button>
    </div>
  )
}
