import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Upload, Download } from 'lucide-react'

export function BotaoImportarExportar() {
  return (
    <div className="flex gap-2">
      <a href="/contatos/exportar" download>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </a>
      <Link href="/contatos/importar">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
      </Link>
    </div>
  )
}
