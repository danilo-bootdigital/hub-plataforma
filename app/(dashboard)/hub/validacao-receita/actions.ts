'use server'

// DEC-019 / MVP-5′ + MVP-6 — Validação de Receita STANDALONE (área do HUB).
// Write actions (criar/pré-análise/decisão) — lógica INALTERADA desde a MVP-5′.
// Reads adicionados para a UI (MVP-6): consomem a estrutura existente, sem alterá-la.
// A IA SÓ extrai; o motor decide (pendências/score/resultado); a DECISÃO é humana.
// RBAC reusa DEC-015: receita:conferir (criar/rodar) e receita:aprovar (decidir).

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { resolverPermissoes, podeAcao } from '@/lib/rbac'
import { mapChecklistRows, type ChecklistRow, type ChecklistItemRow } from '@/lib/conferencia/mapear-checklist'
import { resolverChecklist } from '@/lib/conferencia/resolver-checklist'
import { hidratarChecklistComMetadadosProduto, type MetadadoValidacao } from '@/lib/conferencia/hidratar-checklist'
import { conferir } from '@/lib/conferencia/motor-regras'
import { montarDiagnostico, type DiagnosticoReceita } from '@/lib/conferencia/diagnostico'
import { montarPendencias } from '@/lib/conferencia/persistencia'
import {
  montarAtualizacaoPreAnalise,
  montarDecisao,
  type DecisaoHumana,
} from '@/lib/conferencia/persistencia-standalone'
import type { Pendencia, ResultadoConferencia } from '@/lib/conferencia/tipos'
import { criarExtrator, criarComparador } from '@/lib/ia/provedores'
import { CAMPOS_EXTRACAO, PROMPT_EXTRACAO_SYSTEM_DEFAULT, PROMPT_EXTRACAO_INSTRUCAO_DEFAULT } from '@/lib/ia/schema-extracao'
import type { ComparacaoPosologia } from '@/lib/ia/comparar-posologia'
import type { MimeReceita, ProvedorIA } from '@/lib/ia/tipos'
import { listarProdutosHub } from '../produtos/actions'

const BUCKET = 'orcamento-receitas'
const PREFIXO = 'conferencia'
const ROTA = '/hub/validacao-receita'
const TAMANHO_MAX = 10 * 1024 * 1024 // 10MB
const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
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
    .from('profiles').select('id, organization_id, cargo, hub_id').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  return { supabase, perfil, user }
}

async function exigirPermissao(acao: 'conferir' | 'aprovar') {
  const perm = await resolverPermissoes()
  if (!podeAcao(perm, 'receita', acao)) throw new Error(`Sem permissão para receita:${acao}`)
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function mimeDoTipo(tipo: string | null, path: string): MimeReceita {
  if (tipo && TIPOS_PERMITIDOS.includes(tipo)) {
    return (tipo === 'image/jpg' ? 'image/jpeg' : tipo) as MimeReceita
  }
  const ext = (path.split('.').pop() || '').toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  return 'application/pdf'
}

// ===================== WRITE (MVP-5′ — inalterado) =====================

export async function criarConferencia(formData: FormData): Promise<{ id: string }> {
  const { supabase, perfil, user } = await getUsuarioEOrg()
  await exigirPermissao('conferir')

  const productId = (formData.get('productId') as string) || null // OPCIONAL
  const file = formData.get('file') as File

  if (!file || file.size === 0) throw new Error('Anexe a receita (arquivo).')
  if (!TIPOS_PERMITIDOS.includes(file.type)) throw new Error('Arquivo deve ser PDF ou imagem (PNG/JPG/WEBP).')
  if (file.size > TAMANHO_MAX) throw new Error('Arquivo deve ter no máximo 10MB.')

  // Produto é OPCIONAL; se informado, precisa pertencer à organização.
  if (productId) {
    const { data: prod } = await supabase
      .from('products').select('id').eq('id', productId).eq('organization_id', perfil.organization_id).single()
    if (!prod) throw new Error('Produto não encontrado.')
  }

  const { data: conf, error: eIns } = await supabase
    .from('conferencias_receita')
    .insert({ organization_id: perfil.organization_id, hub_id: perfil.hub_id ?? null, product_id: productId, criado_por: user.id })
    .select('id').single()
  if (eIns || !conf) throw new Error(`Erro ao criar conferência: ${eIns?.message ?? 'desconhecido'}`)

  const admin = createAdminClient()
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${PREFIXO}/${perfil.organization_id}/${conf.id}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: eUp } = await admin.storage.from(BUCKET).upload(path, buffer, { upsert: false, contentType: file.type })
  if (eUp) {
    await supabase.from('conferencias_receita').delete().eq('id', conf.id).eq('organization_id', perfil.organization_id)
    throw new Error(`Erro no upload: ${eUp.message}`)
  }

  const { error: eUpd } = await supabase
    .from('conferencias_receita')
    .update({ storage_path: path, arquivo_nome: file.name, arquivo_tipo: file.type, arquivo_tamanho: file.size })
    .eq('id', conf.id).eq('organization_id', perfil.organization_id)
  if (eUpd) {
    await admin.storage.from(BUCKET).remove([path])
    await supabase.from('conferencias_receita').delete().eq('id', conf.id).eq('organization_id', perfil.organization_id)
    throw new Error(`Erro ao registrar arquivo: ${eUpd.message}`)
  }

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id, usuario_id: user.id,
    acao: 'conferencia_receita_criada', tabela_afetada: 'conferencias_receita',
    registro_id: conf.id, dados_novos: { product_id: productId, arquivo_nome: file.name },
  })

  revalidatePath(ROTA)
  return { id: conf.id }
}

/**
 * Substitui o arquivo da receita numa conferência existente (novo upload no bucket).
 * Não roda a análise — a UI chama rodarPreAnalise em seguida. RBAC: receita:conferir.
 */
export async function substituirReceitaConferencia(conferenciaId: string, formData: FormData): Promise<{ ok: true }> {
  const { supabase, perfil, user } = await getUsuarioEOrg()
  await exigirPermissao('conferir')

  const file = formData.get('file') as File
  if (!file || file.size === 0) throw new Error('Anexe a nova receita (arquivo).')
  if (!TIPOS_PERMITIDOS.includes(file.type)) throw new Error('Arquivo deve ser PDF ou imagem (PNG/JPG/WEBP).')
  if (file.size > TAMANHO_MAX) throw new Error('Arquivo deve ter no máximo 10MB.')

  const { data: conf } = await supabase
    .from('conferencias_receita').select('id, storage_path')
    .eq('id', conferenciaId).eq('organization_id', perfil.organization_id).single()
  if (!conf) throw new Error('Conferência não encontrada')

  const admin = createAdminClient()
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${PREFIXO}/${perfil.organization_id}/${conf.id}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: eUp } = await admin.storage.from(BUCKET).upload(path, buffer, { upsert: false, contentType: file.type })
  if (eUp) throw new Error(`Erro no upload: ${eUp.message}`)

  const { error: eUpd } = await supabase
    .from('conferencias_receita')
    .update({ storage_path: path, arquivo_nome: file.name, arquivo_tipo: file.type, arquivo_tamanho: file.size })
    .eq('id', conf.id).eq('organization_id', perfil.organization_id)
  if (eUpd) {
    await admin.storage.from(BUCKET).remove([path])
    throw new Error(`Erro ao registrar novo arquivo: ${eUpd.message}`)
  }

  // Remove o arquivo anterior (evita órfão no Storage).
  if (conf.storage_path && conf.storage_path !== path) {
    await admin.storage.from(BUCKET).remove([conf.storage_path as string])
  }

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id, usuario_id: user.id,
    acao: 'conferencia_receita_arquivo_substituido', tabela_afetada: 'conferencias_receita',
    registro_id: conf.id, dados_novos: { arquivo_nome: file.name },
  })

  revalidatePath(`${ROTA}/${conferenciaId}`)
  return { ok: true }
}

export async function rodarPreAnalise(conferenciaId: string, posologiaEsperada?: string): Promise<DiagnosticoReceita> {
  const { supabase, perfil, user } = await getUsuarioEOrg()
  await exigirPermissao('conferir')

  const { data: conf, error: eConf } = await supabase
    .from('conferencias_receita')
    .select('id, product_id, storage_path, arquivo_tipo, extracao_json')
    .eq('id', conferenciaId).eq('organization_id', perfil.organization_id).single()
  if (eConf || !conf) throw new Error('Conferência não encontrada')
  if (!conf.storage_path) throw new Error('Nenhuma receita anexada para conferir')

  let etapa = 'inicio'
  try {
    await supabase.from('conferencias_receita')
      .update({ status_processamento: 'processando' })
      .eq('id', conf.id).eq('organization_id', perfil.organization_id)

    etapa = 'resolver_checklist'
    const { data: clRows } = await supabase
      .from('receita_checklists')
      .select('id, escopo, portfolio_id, produto_id, versao, ativo')
      .eq('organization_id', perfil.organization_id).eq('ativo', true)
    const ids = (clRows ?? []).map((c) => c.id)
    const { data: itRows } = ids.length
      ? await supabase.from('receita_checklist_itens')
          .select('checklist_id, chave, rotulo, obrigatorio, tipo_regra, config_json, motivo, severidade, peso, ordem')
          .in('checklist_id', ids)
      : { data: [] }
    const checklists = mapChecklistRows((clRows ?? []) as ChecklistRow[], (itRows ?? []) as ChecklistItemRow[])
    const checklist = resolverChecklist(checklists, { produtoId: conf.product_id, portfolioId: null })
    if (!checklist) throw new Error('Nenhum checklist aplicável (cadastre ao menos um Checklist Genérico).')

    // Produto é OPCIONAL: só hidrata metadados quando há produto. Sem produto → checklist Genérico como está.
    let checklistHidratado = checklist
    if (conf.product_id) {
      const { data: prod } = await supabase
        .from('products').select('nome')
        .eq('id', conf.product_id).eq('organization_id', perfil.organization_id).single()
      const { data: metaRows } = await supabase
        .from('product_validation_metadata')
        .select('chave, tipo, valores, valor_num, valor_texto, ativo')
        .eq('product_id', conf.product_id).eq('organization_id', perfil.organization_id)
      const metadados: MetadadoValidacao[] = ((metaRows ?? []) as Array<{
        chave: string; tipo: 'lista' | 'numero' | 'texto'
        valores: string[] | null; valor_num: number | null; valor_texto: string | null; ativo: boolean
      }>).map((m) => ({ chave: m.chave, tipo: m.tipo, valores: m.valores, valorNum: m.valor_num, valorTexto: m.valor_texto, ativo: m.ativo }))
      checklistHidratado = hidratarChecklistComMetadadosProduto(checklist, { nome: prod?.nome ?? null }, metadados)
    }

    etapa = 'baixar_arquivo'
    const admin = createAdminClient()
    const { data: blob, error: eDl } = await admin.storage.from(BUCKET).download(conf.storage_path)
    if (eDl || !blob) throw new Error('Falha ao baixar a receita do Storage')
    const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
    const mime = mimeDoTipo(conf.arquivo_tipo, conf.storage_path)

    etapa = 'extracao_ia'
    const provedor = ((process.env.IA_PROVEDOR as ProvedorIA) || 'claude')
    const extrator = criarExtrator(provedor)
    // Override do prompt (editor de IA); vazio → padrão do código.
    const { data: promptRow } = await supabase
      .from('ia_prompts').select('extracao_system, extracao_instrucao')
      .eq('organization_id', perfil.organization_id).maybeSingle()
    const extracao = await extrator.extrair({
      arquivo: { base64, mime },
      camposEsperados: CAMPOS_EXTRACAO,
      prompt: { system: promptRow?.extracao_system ?? null, instrucao: promptRow?.extracao_instrucao ?? null },
    })

    etapa = 'motor'
    const resultado = conferir({ checklist: checklistHidratado, extracao, orcamento: { itens: [] }, hoje: hojeISO() })
    const diag = montarDiagnostico(resultado, { documentalOnly: true })

    // Etapa CONSULTIVA (opcional): comparação semântica de posologia. NÃO altera motor/score/resultado.
    const esperada = (posologiaEsperada ?? '').trim()
    let posologiaComparacao: ComparacaoPosologia | null = null
    if (esperada) {
      try {
        const comparador = criarComparador(provedor)
        posologiaComparacao = await comparador.comparar({ esperada, extraida: String(extracao.campos.posologia ?? '') })
      } catch {
        posologiaComparacao = { resultado: 'nao_foi_possivel_comparar', justificativa: 'Falha ao comparar a posologia.' }
      }
    }

    etapa = 'persistir_preanalise'
    const atualizacao = montarAtualizacaoPreAnalise(extracao, resultado, {
      checklist_id: checklist.id ?? null, checklist_versao: checklist.versao ?? null,
      provedor_ia: extrator.id, modelo_ia: extrator.id === 'claude' ? MODELO_CLAUDE : null, prompt_versao: PROMPT_VERSAO,
    })
    // Posologia esperada + comparação vivem no extracao_json (jsonb) — sem migration.
    // erro_processamento fica de fora (extração bem-sucedida limpa erro anterior).
    const extracaoJsonFinal = { ...atualizacao.extracao_json, posologia_esperada: esperada || null, posologia_comparacao: posologiaComparacao }
    const { error: eUpd } = await supabase
      .from('conferencias_receita').update({ ...atualizacao, extracao_json: extracaoJsonFinal })
      .eq('id', conf.id).eq('organization_id', perfil.organization_id)
    if (eUpd) throw new Error(`Erro ao gravar pré-análise: ${eUpd.message}`)

    etapa = 'gravar_pendencias'
    await supabase.from('conferencia_receita_pendencias').delete().eq('conferencia_id', conf.id)
    const pendencias = montarPendencias(resultado).map((p) => ({ ...p, conferencia_id: conf.id }))
    if (pendencias.length) {
      const { error: ePend } = await supabase.from('conferencia_receita_pendencias').insert(pendencias)
      if (ePend) throw new Error(`Erro ao gravar pendências: ${ePend.message}`)
    }

    await supabase.from('audit_logs').insert({
      organization_id: perfil.organization_id, usuario_id: user.id,
      acao: 'conferencia_receita_preanalisada', tabela_afetada: 'conferencias_receita',
      registro_id: conf.id, dados_novos: { resultado: diag.statusAnalise, score: diag.score, provedor: extrator.id },
    })

    revalidatePath(`${ROTA}/${conf.id}`)
    return diag
  } catch (err) {
    // Persiste o MOTIVO REAL da falha (etapa + mensagem) no extracao_json — visível em Detalhes técnicos.
    const mensagem = err instanceof Error ? err.message : String(err)
    const jsonAtual = (conf.extracao_json as Record<string, unknown> | null) ?? {}
    await supabase.from('conferencias_receita')
      .update({
        status_processamento: 'erro',
        status_atual: 'erro',
        extracao_json: { ...jsonAtual, erro_processamento: { etapa, mensagem } },
      })
      .eq('id', conf.id).eq('organization_id', perfil.organization_id)
    revalidatePath(`${ROTA}/${conf.id}`)
    throw err
  }
}

async function registrarDecisao(conferenciaId: string, decisao: DecisaoHumana, observacao?: string): Promise<void> {
  const { supabase, perfil, user } = await getUsuarioEOrg()
  await exigirPermissao('aprovar')

  const { atualizacao, historico } = montarDecisao(decisao, user.id, new Date().toISOString(), observacao)

  const { data: conf, error: eUpd } = await supabase
    .from('conferencias_receita').update(atualizacao)
    .eq('id', conferenciaId).eq('organization_id', perfil.organization_id).select('id').single()
  if (eUpd || !conf) throw new Error(`Erro ao registrar decisão: ${eUpd?.message ?? 'não encontrado'}`)

  const { error: eHist } = await supabase
    .from('historico_decisoes_conferencia_receita').insert({ ...historico, conferencia_id: conferenciaId })
  if (eHist) throw new Error(`Erro ao gravar histórico da decisão: ${eHist.message}`)

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id, usuario_id: user.id,
    acao: `conferencia_receita_${decisao}`, tabela_afetada: 'conferencias_receita',
    registro_id: conferenciaId, dados_novos: { decisao, observacao: observacao ?? null },
  })

  revalidatePath(`${ROTA}/${conferenciaId}`)
  revalidatePath(ROTA)
}

export async function aprovarConferencia(conferenciaId: string, observacao?: string) {
  return registrarDecisao(conferenciaId, 'aprovada', observacao)
}
export async function reprovarConferencia(conferenciaId: string, observacao?: string) {
  return registrarDecisao(conferenciaId, 'reprovada', observacao)
}
export async function devolverConferenciaParaCorrecao(conferenciaId: string, observacao?: string) {
  return registrarDecisao(conferenciaId, 'devolvida_para_correcao', observacao)
}

/**
 * Comparação de posologia SOB DEMANDA (opção B — também na tela de Resultado).
 * NÃO refaz extração nem roda o motor: compara a posologia ESPERADA (input) com a
 * posologia JÁ EXTRAÍDA (extracao_json.campos.posologia). Grava posologia_esperada +
 * posologia_comparacao no extracao_json e retorna o veredito. CONSULTIVO: não altera
 * resultado_analise, score, pendências (checklist) nem a decisão.
 */
export async function compararPosologiaConferencia(
  conferenciaId: string,
  posologiaEsperada: string
): Promise<ComparacaoPosologia | null> {
  const { supabase, perfil } = await getUsuarioEOrg()
  await exigirPermissao('conferir')

  const esperada = (posologiaEsperada ?? '').trim()
  if (!esperada) return null

  const { data: conf } = await supabase
    .from('conferencias_receita').select('id, extracao_json')
    .eq('id', conferenciaId).eq('organization_id', perfil.organization_id).single()
  if (!conf) throw new Error('Conferência não encontrada')

  const extracaoJson = ((conf.extracao_json as Record<string, unknown> | null) ?? {}) as Record<string, unknown>
  const extraida = String((extracaoJson.campos as Record<string, string> | undefined)?.posologia ?? '')

  // Não compara vazio: se não há posologia extraída (ex.: análise falhou), orienta a reexecutar.
  if (!extraida.trim()) {
    return { resultado: 'nao_foi_possivel_comparar', justificativa: 'Não há posologia extraída para comparar. Reexecute a análise primeiro.' }
  }

  const provedor = ((process.env.IA_PROVEDOR as ProvedorIA) || 'claude')
  let comparacao: ComparacaoPosologia
  try {
    comparacao = await criarComparador(provedor).comparar({ esperada, extraida })
  } catch {
    comparacao = { resultado: 'nao_foi_possivel_comparar', justificativa: 'Falha ao comparar a posologia.' }
  }

  // Grava APENAS o extracao_json (posologia_esperada + posologia_comparacao). Nada mais muda.
  const extracaoJsonFinal = { ...extracaoJson, posologia_esperada: esperada, posologia_comparacao: comparacao }
  const { error } = await supabase
    .from('conferencias_receita').update({ extracao_json: extracaoJsonFinal })
    .eq('id', conferenciaId).eq('organization_id', perfil.organization_id)
  if (error) throw new Error(`Erro ao gravar comparação: ${error.message}`)

  revalidatePath(`${ROTA}/${conferenciaId}`)
  return comparacao
}

// ===================== ADMIN — Editor de prompt da IA (Proprietário do Hub) =====================

// Retorna o prompt EFETIVO (override salvo OU o padrão do código).
export async function getPromptIa(): Promise<{ system: string; instrucao: string; usandoPadrao: boolean }> {
  const { supabase, perfil } = await getUsuarioEOrg()
  const { data } = await supabase
    .from('ia_prompts').select('extracao_system, extracao_instrucao')
    .eq('organization_id', perfil.organization_id).maybeSingle()
  const sysOv = data?.extracao_system?.trim() || ''
  const instOv = data?.extracao_instrucao?.trim() || ''
  return {
    system: sysOv || PROMPT_EXTRACAO_SYSTEM_DEFAULT,
    instrucao: instOv || PROMPT_EXTRACAO_INSTRUCAO_DEFAULT,
    usandoPadrao: !sysOv && !instOv,
  }
}

// Salva o override do prompt de extração. Só o Proprietário do Hub. Salvar vazio → volta ao padrão.
export async function salvarPromptIa(system: string, instrucao: string): Promise<{ ok: true }> {
  const { supabase, perfil, user } = await getUsuarioEOrg()
  if (perfil.cargo !== 'proprietario_hub') throw new Error('Somente o Proprietário do Hub pode editar o prompt da IA.')
  const { error } = await supabase.from('ia_prompts').upsert({
    organization_id: perfil.organization_id,
    extracao_system: system.trim() || null,
    extracao_instrucao: instrucao.trim() || null,
    atualizado_por: user.id,
    atualizado_em: new Date().toISOString(),
  })
  if (error) throw new Error(`Erro ao salvar o prompt: ${error.message}`)
  revalidatePath('/hub/configuracoes-ia')
  return { ok: true }
}

// ===================== READS (MVP-6 — só consomem a estrutura) =====================

// Busca produtos para o seletor da Nova Validação — RESPEITANDO o escopo do Hub.
// Reusa a RPC autorizada `hub_produtos_listar` (SECURITY DEFINER): só retorna produtos
// dos Portfólios AUTORIZADOS ao Hub do usuário. Dedup por product_id (aparece por vínculo).
export async function buscarProdutosParaValidacao(busca: string): Promise<Array<{ id: string; nome: string }>> {
  await getUsuarioEOrg() // garante sessão (senão redireciona ao login)
  // limit 50: a busca do RPC casa vários campos (nome/apresentação/via/volume/portfólio…)
  // e o resultado é deduplicado por product_id — um teto baixo poderia empurrar o produto
  // procurado (que casa pelo nome) para fora da janela ordenada por nome.
  const { rows } = await listarProdutosHub({
    busca: busca?.trim() || undefined, limit: 50, orderBy: 'nome', orderDir: 'asc',
  })
  const vistos = new Set<string>()
  const out: Array<{ id: string; nome: string }> = []
  for (const r of rows ?? []) {
    if (r.product_id && !vistos.has(r.product_id)) {
      vistos.add(r.product_id)
      out.push({ id: r.product_id, nome: r.nome })
    }
  }
  return out
}

// Lista para a tabela principal. Buscas EXPLÍCITAS (sem embeds PostgREST).
export async function listarValidacoes() {
  const { supabase, perfil } = await getUsuarioEOrg()
  const { data } = await supabase
    .from('conferencias_receita')
    .select('id, criado_em, atualizado_em, status_atual, status_processamento, resultado_analise, score, extracao_json, product_id, criado_por')
    .eq('organization_id', perfil.organization_id)
    .order('atualizado_em', { ascending: false })
    .limit(200)
  const rows = (data ?? []) as Array<Record<string, unknown>>

  const prodIds = [...new Set(rows.map((r) => r.product_id as string).filter(Boolean))]
  const userIds = [...new Set(rows.map((r) => r.criado_por as string | null).filter((v): v is string => !!v))]
  const [{ data: prods }, { data: users }] = await Promise.all([
    prodIds.length ? supabase.from('products').select('id, nome').in('id', prodIds) : Promise.resolve({ data: [] }),
    userIds.length ? supabase.from('profiles').select('id, nome').in('id', userIds) : Promise.resolve({ data: [] }),
  ])
  const nomeProduto = new Map((prods ?? []).map((p) => [p.id as string, p.nome as string]))
  const nomeUsuario = new Map((users ?? []).map((u) => [u.id as string, u.nome as string]))

  return rows.map((r) => {
    const campos = ((r.extracao_json as { campos?: Record<string, string> } | null)?.campos) ?? {}
    return {
      id: r.id as string,
      criado_em: r.criado_em as string,
      atualizado_em: r.atualizado_em as string,
      status_atual: r.status_atual as string,
      status_processamento: r.status_processamento as string,
      resultado_analise: (r.resultado_analise as string | null) ?? null,
      score: (r.score as number | null) ?? null,
      paciente: campos.nome_paciente ?? null,
      produto: nomeProduto.get(r.product_id as string) ?? null,
      responsavel: r.criado_por ? nomeUsuario.get(r.criado_por as string) ?? null : null,
    }
  })
}

// Detalhe para a tela de resultado (reconstrói o Diagnóstico a partir do persistido).
export async function getValidacaoDetalhe(id: string) {
  const { supabase, perfil } = await getUsuarioEOrg()
  const perm = await resolverPermissoes()
  const podeAprovar = podeAcao(perm, 'receita', 'aprovar')

  const { data: conf } = await supabase
    .from('conferencias_receita').select('*')
    .eq('id', id).eq('organization_id', perfil.organization_id).single()
  if (!conf) return null

  // Buscas EXPLÍCITAS (sem embeds PostgREST): produto (opcional) + pessoas por id.
  const { data: prodRow } = conf.product_id
    ? await supabase.from('products').select('nome').eq('id', conf.product_id as string).single()
    : { data: null }
  const pessoaIds = [conf.criado_por as string | null, conf.decidido_por as string | null].filter((v): v is string => !!v)
  const { data: pessoas } = pessoaIds.length
    ? await supabase.from('profiles').select('id, nome').in('id', pessoaIds)
    : { data: [] }
  const nomePorId = new Map((pessoas ?? []).map((p) => [p.id as string, p.nome as string]))

  const { data: pendRows } = await supabase
    .from('conferencia_receita_pendencias')
    .select('origem, chave, motivo, tipo, severidade, mensagem, esperado, encontrado')
    .eq('conferencia_id', id)

  const pendencias: Pendencia[] = ((pendRows ?? []) as Array<Record<string, unknown>>).map((p) => ({
    origem: p.origem as Pendencia['origem'],
    chave: (p.chave as string | null) ?? null,
    motivo: (p.motivo as Pendencia['motivo']) ?? null,
    tipo: p.tipo as Pendencia['tipo'],
    severidade: p.severidade as Pendencia['severidade'],
    mensagem: (p.mensagem as string) ?? '',
    esperado: (p.esperado as string | null) ?? null,
    encontrado: (p.encontrado as string | null) ?? null,
  }))

  // Reconstrói o Diagnóstico da Receita (função PURA existente — não altera nada).
  let diagnostico: DiagnosticoReceita | null = null
  if (conf.resultado_analise) {
    const resultado: ResultadoConferencia = {
      status: conf.resultado_analise as ResultadoConferencia['status'],
      score: (conf.score as number | null) ?? 0,
      pendencias,
    }
    diagnostico = montarDiagnostico(resultado, { documentalOnly: true })
  }

  // Arquivo (URL assinada temporária).
  let arquivoUrl: string | null = null
  if (conf.storage_path) {
    const admin = createAdminClient()
    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(conf.storage_path as string, 3600)
    arquivoUrl = signed?.signedUrl ?? null
  }

  const extracaoJson = (conf.extracao_json as {
    campos?: Record<string, string>
    posologia_esperada?: string | null
    posologia_comparacao?: ComparacaoPosologia | null
    erro_processamento?: { etapa?: string; mensagem?: string } | null
  } | null)
  const campos = extracaoJson?.campos ?? {}

  return {
    id: conf.id as string,
    posologiaEsperada: extracaoJson?.posologia_esperada ?? null,
    posologiaComparacao: extracaoJson?.posologia_comparacao ?? null,
    posologiaExtraida: (campos.posologia ?? '').trim() || null,
    erroProcessamento: extracaoJson?.erro_processamento ?? null,
    produto: (prodRow?.nome as string | undefined) ?? null,
    responsavel: conf.criado_por ? nomePorId.get(conf.criado_por as string) ?? null : null,
    decisor: conf.decidido_por ? nomePorId.get(conf.decidido_por as string) ?? null : null,
    status_atual: conf.status_atual as string,
    status_processamento: conf.status_processamento as string,
    resultado_analise: (conf.resultado_analise as string | null) ?? null,
    score: (conf.score as number | null) ?? null,
    confianca_extracao: (conf.confianca_extracao as number | null) ?? null,
    decidido_em: (conf.decidido_em as string | null) ?? null,
    observacao_decisao: (conf.observacao_decisao as string | null) ?? null,
    criado_em: conf.criado_em as string,
    atualizado_em: conf.atualizado_em as string,
    arquivo_nome: (conf.arquivo_nome as string | null) ?? null,
    arquivo_tipo: (conf.arquivo_tipo as string | null) ?? null,
    arquivoUrl,
    campos,
    pendencias,
    diagnostico,
    podeAprovar,
  }
}
