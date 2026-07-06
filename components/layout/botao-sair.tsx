'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function BotaoSair() {
  const supabase = createClient()
  const [saindo, setSaindo] = useState(false)

  async function sair() {
    setSaindo(true)
    try {
      // scope 'local': limpa a sessão do navegador sem depender da chamada de
      // revogação no servidor (que pode falhar com token expirado e travar o logout).
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Mesmo se a revogação falhar, seguimos para o login — o essencial é
      // encerrar a sessão local. O redirect "hard" garante o estado limpo.
    }
    // Navegação "hard": força o middleware a reavaliar já sem os cookies de sessão.
    window.location.href = '/login'
  }

  return (
    <Button variant="ghost" size="sm" onClick={sair} disabled={saindo}>
      <LogOut className="h-4 w-4" />
      <span className="ml-2">{saindo ? 'Saindo…' : 'Sair'}</span>
    </Button>
  )
}
