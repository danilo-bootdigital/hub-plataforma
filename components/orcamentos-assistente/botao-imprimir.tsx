'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Fatia 13C: apenas window.print(). NÃO gera PDF, NÃO faz download.
export function BotaoImprimir() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer className="mr-2 h-4 w-4" />
      Imprimir
    </Button>
  )
}
