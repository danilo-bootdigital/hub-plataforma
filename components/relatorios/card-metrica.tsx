import { Card, CardContent } from '@/components/ui/card'

type Props = {
  label: string
  valor: string
  subtexto?: string
}

export function CardMetrica({ label, valor, subtexto }: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{valor}</p>
        {subtexto && <p className="mt-0.5 text-xs text-slate-400">{subtexto}</p>}
      </CardContent>
    </Card>
  )
}
