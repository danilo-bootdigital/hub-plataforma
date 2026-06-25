import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { FormImportacao } from '@/components/contatos/form-importacao'

export default function ImportarContatosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contatos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Contatos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Faça upload de uma planilha XLSX ou CSV para importar contatos em lote.
          </p>
        </div>
      </div>
      <FormImportacao />
    </div>
  )
}
