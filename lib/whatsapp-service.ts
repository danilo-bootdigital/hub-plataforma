import { createClient } from '@/lib/supabase/server'
import { WhatsAppCache } from './whatsapp-cache'
import { normalizarTelefoneParaComparacao } from './nome-contato'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export class WhatsAppService {
  private static supabase: any = null

  private static async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Busca contato com cache inteligente
   */
  static async getContactWithCache(
    organizationId: string,
    phone: string
  ): Promise<{ id: string; nome: string; telefone: string } | null> {
    // Primeiro tentar cache
    const cached = WhatsAppCache.getContact(organizationId, phone)
    if (cached) {
      return cached
    }

    // Buscar no banco
    const supabase = await this.getSupabase()
    const { data } = await supabase
      .from('contacts')
      .select('id, nome, telefone')
      .eq('organization_id', organizationId)
      .or(`telefone.ilike.%${phone},telefone.ilike.%${phone.replace(/^(\d{2})/, '$19$')}`)
      .limit(1)
      .single()

    if (data?.nome && !/^\d{8,15}$/.test(data.nome.replace(/\D/g, ''))) {
      // Armazenar em cache
      WhatsAppCache.setContact(organizationId, phone, data)
      return data
    }

    return null
  }

  /**
   * Busca lead com cache
   */
  static async getLeadWithCache(
    organizationId: string,
    phone: string
  ): Promise<{ id: string; nome: string; telefone: string } | null> {
    // Primeiro tentar cache de nome resolvido
    const cachedName = WhatsAppCache.getResolvedName(organizationId, phone)
    if (cachedName && !cachedName.isPhoneFallback) {
      return {
        id: 'cached', // ID virtual para cache
        nome: cachedName.display,
        telefone: phone
      }
    }

    // Buscar no banco
    const supabase = await this.getSupabase()
    const { data } = await supabase
      .from('leads')
      .select('id, nome, telefone')
      .eq('organization_id', organizationId)
      .or(`telefone.ilike.%${phone},telefone.ilike.%${phone.replace(/^(\d{2})/, '$19$')}`)
      .limit(1)
      .single()

    if (data?.nome && !/^\d{8,15}$/.test(data.nome.replace(/\D/g, ''))) {
      // Armazenar em cache
      WhatsAppCache.setResolvedName(organizationId, phone, {
        display: data.nome,
        source: 'lead',
        isPhoneFallback: false
      })
      return data
    }

    return null
  }

  /**
   * Atualiza cache de contato quando nome é editado
   */
  static async updateContactNameCache(
    organizationId: string,
    phone: string,
    newName: string
  ): Promise<void> {
    // Invalidar cache antigo
    WhatsAppCache.invalidateContact(organizationId, phone)

    // Atualizar cache com novo nome
    WhatsAppCache.setResolvedName(organizationId, phone, {
      display: newName,
      source: 'manual',
      isPhoneFallback: false
    })
  }

  /**
   * Busca conversa com cache de status
   */
  static async getConversationWithCache(
    organizationId: string,
    phone: string
  ) {
    const supabase = await this.getSupabase()
    return await supabase
      .from('conversations')
      .select(`
        id,
        telefone_externo,
        ultima_mensagem_em,
        status,
        responsavel_id,
        responsavel:profiles!responsavel_id(nome),
        lead_id,
        nome_contato,
        name_source,
        whatsapp_push_name,
        is_name_manually_edited
      `)
      .eq('organization_id', organizationId)
      .eq('telefone_externo', phone)
      .order('ultima_mensagem_em', { ascending: false })
      .limit(1)
      .single()
  }

  /**
   * Atualiza status da instância com cache
   */
  static async updateInstanceStatusCache(
    instanceName: string,
    status: string
  ): Promise<void> {
    WhatsAppCache.setInstanceStatus(instanceName, status)
  }

  /**
   * Busca status da instância com cache
   */
  static async getInstanceStatusWithCache(
    instanceName: string
  ): Promise<string | null> {
    return WhatsAppCache.getInstanceStatus(instanceName)
  }

  /**
   * Registra atividade com cache de usuário
   */
  static async logActivity(
    organizationId: string,
    userId: string,
    type: string,
    description: string,
    conversationId?: string,
    leadId?: string,
    dealId?: string
  ): Promise<void> {
    const supabase = await this.getSupabase()

    await supabase.from('activities').insert({
      organization_id: organizationId,
      tipo: type,
      descricao: description,
      conversation_id: conversationId,
      lead_id: leadId,
      deal_id: dealId,
      autor_id: userId,
    })
  }

  /**
   * Busca vendedores com cache
   */
  static async getSellersWithCache(organizationId: string) {
    const supabase = await this.getSupabase()
    const { data } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('organization_id', organizationId)
      .eq('cargo', 'vendedor')
      .order('nome')

    return data || []
  }

  /**
   * Valida permissões do usuário
   */
  static async checkUserPermissions(
    userId: string,
    organizationId: string,
    requiredRole?: string
  ): Promise<boolean> {
    const supabase = await this.getSupabase()
    const { data: profile } = await supabase
      .from('profiles')
      .select('cargo')
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .single()

    if (!profile) return false

    if (!requiredRole) return true
    return profile.cargo === requiredRole
  }

  /**
   * Formata telefone para exibição
   */
  static formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '')

    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    } else if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    }

    return phone
  }

  /**
   * Normaliza telefone para comparação
   */
  static normalizePhoneNumber(phone: string): string {
    return normalizarTelefoneParaComparacao(phone)
  }
}