import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaDocumentos } from './area-documentos'
import { documentosObrigatorios, type DetalheCadastro } from '@/lib/cadastro-clientes/documentos'

function Linha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{valor?.trim() ? valor : '—'}</dd>
    </div>
  )
}

// Visualização somente-leitura dos dados cadastrais + documentos (com signed URL).
export function DetalheCadastroView({ detalhe }: { detalhe: DetalheCadastro }) {
  const c = detalhe.cadastro
  const pf = c.tipo_pessoa === 'fisica'
  const telefones = (c.telefones ?? []).filter(Boolean).join(' · ') || '—'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Dados cadastrais</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pf ? (
              <>
                <Linha rotulo="Nome completo" valor={c.nome_completo} />
                <Linha rotulo="CPF" valor={c.cpf} />
                <Linha rotulo="Data de nascimento" valor={c.data_nascimento} />
              </>
            ) : (
              <>
                <Linha rotulo="Razão Social" valor={c.razao_social} />
                <Linha rotulo="Nome Fantasia" valor={c.nome_fantasia} />
                <Linha rotulo="CNPJ" valor={c.cnpj} />
                <Linha rotulo="Responsável" valor={c.nome_completo} />
                <Linha rotulo="CPF do responsável" valor={c.cpf} />
                <Linha rotulo="Nascimento do responsável" valor={c.data_nascimento} />
              </>
            )}
            <Linha rotulo="Registro (Conselho)" valor={c.registro_conselho} />
            <Linha rotulo="E-mail" valor={c.email} />
            <Linha rotulo="Telefones" valor={telefones} />
            <Linha rotulo="Endereço" valor={c.endereco_completo} />
            <Linha rotulo="CEP" valor={c.cep} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Documentos</CardTitle></CardHeader>
        <CardContent>
          <AreaDocumentos
            onboardingId={c.id}
            documentos={documentosObrigatorios(c.tipo_pessoa)}
            arquivos={detalhe.arquivos}
            editavel={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
