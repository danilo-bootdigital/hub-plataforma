import { createAdminClient } from '@/lib/supabase/admin'

// Função para limpar mídia antiga do WhatsApp
export async function limparMidiaAntiga() {
  const supabase = createAdminClient()

  try {
    // Obter configuração de retenção
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('tempo_retencao_midia')
      .single()

    const diasRetencao = config?.tempo_retencao_midia || 30
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - diasRetencao)

    // Listar todos os arquivos no bucket de mídia
    const { data: files } = await supabase.storage
      .from('whatsapp-media')
      .list('', { limit: 1000 })

    if (!files) return

    const arquivosParaDeletar: string[] = []

    for (const file of files) {
      // Verificar se o arquivo foi modificado antes da data limite
      const dataModificacao = new Date(file.updated_at || file.created_at || Date.now())
      if (dataModificacao < dataLimite) {
        arquivosParaDeletar.push(file.name)
      }
    }

    // Deletar arquivos antigos em lotes
    if (arquivosParaDeletar.length > 0) {
      console.log(`Deletando ${arquivosParaDeletar.length} arquivos de mídia antiga...`)

      for (const arquivo of arquivosParaDeletar) {
        await supabase.storage
          .from('whatsapp-media')
          .remove([arquivo])
      }

      console.log(`Limpeza concluída: ${arquivosParaDeletar.length} arquivos removidos`)
    }
  } catch (error) {
    console.error('Erro ao limpar mídia antiga:', error)
  }
}

// Função para verificar saúde das instâncias
export async function verificarSaudeInstancias() {
  const supabase = createAdminClient()

  try {
    const { data: instancias } = await supabase
      .from('whatsapp_instances')
      .select('id, nome, status_conexao, atualizado_em, organization_id')

    if (!instancias) return

    const agora = new Date()
    const cincoMinutosAtras = new Date(agora.getTime() - 5 * 60 * 1000)

    const instanciasOffline = instancias.filter(i => {
      // Considerar offline se estiver desconectado ou não atualizada há mais de 5 minutos
      return i.status_conexao === 'desconectado' ||
             new Date(i.atualizado_em) < cincoMinutosAtras
    })

    if (instanciasOffline.length > 0) {
      console.warn(`Instâncias offline ou desatualizadas: ${instanciasOffline.map(i => i.nome).join(', ')}`)

      // Registrar no log de atividades
      for (const instancia of instanciasOffline) {
        await supabase.from('activities').insert({
          organization_id: instancia.organization_id,
          tipo: 'alerta_whatsapp',
          descricao: `Instância "${instancia.nome}" está offline ou desatualizada`,
          autor_id: 'system',
          metadata: {
            instancia_id: instancia.id,
            status: instancia.status_conexao,
            ultima_atualizacao: instancia.atualizado_em
          }
        })
      }
    }
  } catch (error) {
    console.error('Erro ao verificar saúde das instâncias:', error)
  }
}

// Função para monitorar uso de mídia
export async function monitorarUsoMidia() {
  const supabase = createAdminClient()

  try {
    // Calcular uso total de mídia
    const { data: storageInfo } = await supabase.storage
      .from('whatsapp-media')
      .list('', { limit: 1 })

    // Obter amostra de arquivos para estimativa
    const { data: sampleFiles } = await supabase.storage
      .from('whatsapp-media')
      .list('', { limit: 100 })

    const tamanhoMedio = sampleFiles?.length ?
      sampleFiles.reduce((acc, file) => acc + (file.metadata?.size || 0), 0) / sampleFiles.length : 0

    // Estimar total de arquivos (baseado na paginação)
    const { data: firstPage } = await supabase.storage
      .from('whatsapp-media')
      .list('', { limit: 1000 })

    const totalArquivos = firstPage?.length || 0
    const espacoEstimado = totalArquivos * tamanhoMedio

    console.log(`Uso de mídia WhatsApp: ${totalArquivos} arquivos, ~${(espacoEstimado / 1024 / 1024).toFixed(2)} MB`)

    // Registrar no log se exceder limite
    if (espacoEstimado > 5 * 1024 * 1024 * 1024) { // 5GB
      console.warn('Uso de mídia excede 5GB!')

      // Buscar organização para registrar alerta
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, nome')
        .limit(1)

      if (orgs?.[0]) {
        await supabase.from('activities').insert({
          organization_id: orgs[0].id,
          tipo: 'alerta_midia',
          descricao: 'Uso de mídia do WhatsApp está próximo do limite',
          autor_id: 'system',
          metadata: {
            espaco_estimado: espacoEstimado,
            limite_alerta: 5 * 1024 * 1024 * 1024
          }
        })
      }
    }
  } catch (error) {
    console.error('Erro ao monitorar uso de mídia:', error)
  }
}