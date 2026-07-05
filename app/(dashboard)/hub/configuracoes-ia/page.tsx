import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getPromptIa } from '../validacao-receita/actions'
import { EditorPromptIa } from './editor-prompt-ia'
import { getIaComercial } from './actions'
import { EditorIaComercial } from './editor-ia-comercial'

// IA / Prompt (DEC-021) — apenas Proprietário do Hub.
// Aba 1: assistente comercial (hub_ia_config). Aba 2: extração de receita (DEC-019).
export default async function ConfiguracoesIaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub') redirect('/painel')

  const [prompt, iaComercial] = await Promise.all([getPromptIa(), getIaComercial()])

  return (
    <div className="mx-auto w-[90%] max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">IA / Prompt</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure o assistente de IA do seu Hub e o prompt de extração de receitas.
        </p>
      </div>

      <Tabs defaultValue="assistente">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="assistente">Assistente Comercial</TabsTrigger>
          <TabsTrigger value="extracao">Extração de Receita</TabsTrigger>
        </TabsList>
        <TabsContent value="assistente" className="pt-4">
          <EditorIaComercial inicial={iaComercial} />
        </TabsContent>
        <TabsContent value="extracao" className="pt-4">
          <p className="mb-4 text-sm text-slate-500">
            Ajuste como a IA lê as receitas na Validação de Receita. A IA continua apenas extraindo — o motor decide.
          </p>
          <EditorPromptIa
            systemInicial={prompt.system}
            instrucaoInicial={prompt.instrucao}
            usandoPadrao={prompt.usandoPadrao}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
