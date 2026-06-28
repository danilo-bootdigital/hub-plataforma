'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'

// Campo de senha com botão mostrar/ocultar (ícone do olho).
// Controlado pelo pai (value/onChange); `name` garante envio via FormData quando
// usado dentro de <form action>. A senha NUNCA é persistida fora do Supabase Auth.
export function CampoSenha({
  id,
  name,
  value,
  onChange,
  placeholder,
}: {
  id: string
  name?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [mostrar, setMostrar] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={mostrar ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className="pr-9"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setMostrar((m) => !m)}
        aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
