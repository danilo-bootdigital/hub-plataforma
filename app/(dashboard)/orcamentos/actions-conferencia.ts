'use server'

// DEC-019 / MVP-5 — Integração da Conferência de Receita.
// Fluxo: receita anexada → extração IA → motor de regras → Diagnóstico → persistência.
// A IA SÓ extrai; o motor decide (pendências/score/status); a APROVAÇÃO é humana.
// Sem UI aqui (MVP-6). RBAC: receita:conferir (rodar) e receita:aprovar (decidir).

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { resolverPermissoes, podeAcao } from '@/lib/rbac'
import { mapChecklistRows, type ChecklistRow, type ChecklistItemRow } from '@/lib/conferencia/mapear-checklist'
import { resolverChecklist } from '@/lib/conferencia/resolver-checklist'
import { conferir } from '@/lib/conferencia/motor-regras'
import { montarDiagnostico, type DiagnosticoReceita } from '@/lib/conferencia/diagnostico'
import { montarLinhaConferencia, montarPendencias, resumoQuoteReceita } from '@/lib/conferencia/persistencia'
import { mapOrcamentoContexto, type QuoteItemRow } from '@/lib/conferencia/mapear-orcamento'
import { criarExtrator } from '@/lib/ia/provedores'
import { CAMPOS_EXTRACAO } from '@/lib/ia/schema-extracao'
import type { MimeReceita, ProvedorIA } from '@/lib/ia/tipos'

const BUCKET = 'orcamento-receitas'
const PROMPT_VERSAO = 'extracao/v1'
const MODELO_CLAUDE = 'claude-opus-4-8'

function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getUsuarioEOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles').select('id, organization_id, cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  return { supabase, perfil, user }
}

async function exigirPermissao(acao: 'conferir' | 'aprovar') {
  const perm = await resolverPermissoes()
  if (!podeAcao(perm, 'receita', acao)) {
    throw new Error(`Sem permissão para receita:${acao}`)
  }
}

// Data de hoje no boundary (server); injetada no motor, que permanece puro/determinístico.
function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Roda a pré-análise da receita anexada: extração (IA) → motor → Diagnóstico → persistência.
 * Retorna o Diagnóstico da Receita (a MVP-6 renderiza este objeto).
 */
export async function rodarPreAnalise(quoteReceitaId: string): Promise<DiagnosticoReceita> {
  const { supabase, perfil, user } = await getUsuarioEOrg()
  await exigirPermissao('conferir')

  // 1) Receita (RLS valida org). Precisa de arquivo assinado.
  const { data: qr, error: eQr } = await supabase
    .from('quote_receitas')
    .select('id, quote_id, arquivo_path, arquivo_tipo, checklist_id')
    .eq('id', quoteReceitaId)
    .eq('organization_id', perfil.organization_id)
    .single()
  if (eQr || !qr) throw new Error('Receita não encontrada')
  if (!qr.arquivo_path) throw new Error('Nenhuma receita assinada anexada para conferir')

  // 2) Orçamento + itens + cliente (contexto comercial p/ o motor).
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, portfolio_id, contato:contacts!contato_id(nome), itens:quote_items!quote_id(descricao, quantidade, product_id)')
    .eq('id', qr.quote_id)
    .eq('organization_id', perfil.organization_id)
    .single()
  if (!quote) throw new Error('Orçamento não encontrado')

  const itensQuote = (Array.isArray(quote.itens) ? quote.itens : []) as QuoteItemRow[]
  const { orcamento, produtoId, portfolioId } = mapOrcamentoContexto(
    {
      portfolio_id: (quote as { portfolio_id: string | null }).portfolio_id ?? null,
      contato: quote.contato as { nome?: string | null } | null,
    },
    itensQuote
  )

  // 3) Resolver checklist a partir do BANCO (Produto > Portfólio > Organização).
  const { data: clRows } = await supabase
    .from('receita_checklists')
    .select('id, escopo, portfolio_id, produto_id, versao, ativo')
    .eq('organization_id', perfil.organization_id)
    .eq('ativo', true)
  const ids = (clRows ?? []).map((c) => c.id)
  const { data: itRows } = ids.length
    ? await supabase
        .from('receita_checklist_itens')
        .select('checklist_id, chave, rotulo, obrigatorio, tipo_regra, config_json, motivo, severidade, peso, ordem')
        .in('checklist_id', ids)
    : { data: [] }
  const checklists = mapChecklistRows((clRows ?? []) as ChecklistRow[], (itRows ?? []) as ChecklistItemRow[])
  const checklist = resolverChecklist(checklists, { produtoId, portfolioId })
  if (!checklist) throw new Error('Nenhum checklist aplicável (cadastre ao menos um Checklist Genérico).')

  // 4) Baixar o arquivo do bucket privado (service role).
  const admin = createAdminClient()
  const { data: blob, error: eDl } = await admin.storage.from(BUCKET).download(qr.arquivo_path)
  if (eDl || !blob) throw new Error('Falha ao baixar a receita do Storage')
  const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
  const mime = (qr.arquivo_tipo ?? 'application/pdf') as MimeReceita

  // 5) IA extrai (APENAS extrai — não decide).
  const provedor = ((process.env.IA_PROVEDOR as ProvedorIA) || 'claude')
  const extrator = criarExtrator(provedor)
  const extracao = await extrator.extrair({ arquivo: { base64, mime }, camposEsperados: CAMPOS_EXTRACAO })

  // 6) Motor + Diagnóstico (toda a decisão vive aqui).
  const resultado = conferir({ checklist, extracao, orcamento, hoje: hojeISO() })
  const diag = montarDiagnostico(resultado)

  // 7) Persistir conferência (append-only) + pendências.
  const linha = montarLinhaConferencia(extracao, resultado, {
    organization_id: perfil.organization_id,
    quote_receita_id: qr.id,
    quote_id: qr.quote_id,
    checklist_id: checklist.id ?? qr.checklist_id ?? null,
    checklist_versao: checklist.versao ?? null,
    provedor_ia: extrator.id,
    modelo_ia: extrator.id === 'claude' ? MODELO_CLAUDE : null,
    prompt_versao: PROMPT_VERSAO,
    criado_por: user.id,
  })
  const { data: conf, error: eConf } = await supabase
    .from('receita_conferencias').insert(linha).select('id').single()
  if (eConf || !conf) throw new Error(`Erro ao gravar conferência: ${eConf?.message ?? 'desconhecido'}`)

  const pendencias = montarPendencias(resultado).map((p) => ({ ...p, conferencia_id: conf.id }))
  if (pendencias.length) {
    const { error: ePend } = await supabase.from('receita_conferencia_pendencias').insert(pendencias)
    if (ePend) throw new Error(`Erro ao gravar pendências: ${ePend.message}`)
  }

  // 8) Resumo em quote_receitas (status_analise_ia, score, em_conferencia).
  await supabase
    .from('quote_receitas')
    .update(resumoQuoteReceita(diag))
    .eq('id', qr.id)
    .eq('organization_id', perfil.organization_id)

  // 9) Auditoria.
  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: user.id,
    acao: 'receita_conferencia_executada',
    tabela_afetada: 'receita_conferencias',
    registro_id: conf.id,
    dados_novos: { status_analise: diag.statusAnalise, score: diag.score, provedor: extrator.id },
  })

  revalidatePath(`/orcamentos/${qr.quote_id}`)
  return diag
}

type DecisaoStatus = 'aprovada_operacionalmente' | 'devolvida_para_correcao' | 'rejeitada'

async function decisaoHumana(quoteReceitaId: string, novoStatus: DecisaoStatus, comentario?: string) {
  const { supabase, perfil, user } = await getUsuarioEOrg()
  await exigirPermissao('aprovar')

  const { data: qr, error } = await supabase
    .from('quote_receitas')
    .update({
      status_fluxo: novoStatus,
      validada_por: user.id, // satisfaz chk_receita_aprovacao_humana; registra QUEM decidiu
      validada_em: new Date().toISOString(),
      validacao_comentario: comentario ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', quoteReceitaId)
    .eq('organization_id', perfil.organization_id)
    .select('id, quote_id')
    .single()
  if (error || !qr) throw new Error(`Erro ao registrar decisão: ${error?.message ?? 'não encontrado'}`)

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: user.id,
    acao: `receita_${novoStatus}`,
    tabela_afetada: 'quote_receitas',
    registro_id: quoteReceitaId,
    dados_novos: { status_fluxo: novoStatus, comentario: comentario ?? null },
  })

  revalidatePath(`/orcamentos/${qr.quote_id}`)
}

export async function aprovarReceitaOperacionalmente(quoteReceitaId: string, comentario?: string) {
  return decisaoHumana(quoteReceitaId, 'aprovada_operacionalmente', comentario)
}
export async function devolverParaCorrecao(quoteReceitaId: string, comentario?: string) {
  return decisaoHumana(quoteReceitaId, 'devolvida_para_correcao', comentario)
}
export async function rejeitarReceita(quoteReceitaId: string, comentario?: string) {
  return decisaoHumana(quoteReceitaId, 'rejeitada', comentario)
}
