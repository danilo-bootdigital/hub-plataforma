import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPromptIa } from '../validacao-receita/actions'
import { EditorPromptIa } from './editor-prompt-ia'

// Editor do prompt da IA — apenas Proprietário do Hub.
export default async function ConfiguracoesIaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub') redirect('/painel')

  const prompt = await getPromptIa()

  return (
    <div className="mx-auto w-[90%] max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">IA — Prompt de extração</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ajuste como a IA lê as receitas na Validação de Receita. As mudanças valem na próxima análise (ou ao reexecutar). A IA continua apenas extraindo — o motor decide.
        </p>
      </div>
      <EditorPromptIa
        systemInicial={prompt.system}
        instrucaoInicial={prompt.instrucao}
        usandoPadrao={prompt.usandoPadrao}
      />
    </div>
  )
}
