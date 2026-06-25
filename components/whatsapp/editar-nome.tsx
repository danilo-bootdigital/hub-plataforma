'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit2, Check, X } from 'lucide-react'
import { editarNomeConversa } from '@/app/(dashboard)/whatsapp/actions-conversa'

interface EditarNomeProps {
  conversaId: string
  nomeAtual: string
  telefone: string
  onEditComplete?: (novoNome: string) => void
}

export function EditarNome({ conversaId, nomeAtual, telefone, onEditComplete }: EditarNomeProps) {
  const [editando, setEditando] = useState(false)
  const [novoNome, setNovoNome] = useState(nomeAtual)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSalvar = async () => {
    if (!novoNome.trim()) {
      setErro('Nome não pode estar vazio')
      return
    }

    setSalvando(true)
    setErro(null)

    try {
      await editarNomeConversa(conversaId, novoNome.trim())
      setEditando(false)
      onEditComplete?.(novoNome.trim())
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const handleCancelar = () => {
    setNovoNome(nomeAtual)
    setEditando(false)
    setErro(null)
  }

  if (editando) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nome do contato"
          className="text-sm"
          maxLength={50}
          autoFocus
        />
        <Button size="sm" variant="ghost" onClick={handleSalvar} disabled={salvando}>
          {salvando ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancelar} disabled={salvando}>
          <X className="h-4 w-4" />
        </Button>
        {erro && <span className="text-xs text-red-500">{erro}</span>}
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setEditando(true)}
      className="h-6 w-6 p-0"
      title="Editar nome"
    >
      <Edit2 className="h-4 w-4" />
    </Button>
  )
}