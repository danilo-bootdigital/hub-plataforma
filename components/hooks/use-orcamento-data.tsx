'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/auth-provider'

export function useOrcamentoData(id: string) {
  const { user, profile, loading: authLoading } = useAuth()
  const [orcamento, setOrcamento] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Se estiver carregando a autenticação, aguardar
    if (authLoading) {
      setLoading(true)
      return
    }

    // Se não houver usuário ou perfil, não carrega nada
    if (!user || !profile) {
      setLoading(false)
      setError('Usuário não autenticado')
      return
    }

    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()

        const { data: orcamentoData } = await supabase
          .from('quotes')
          .select(`
            *,
            responsavel:profiles!responsavel_id(nome),
            lead:leads!lead_id(id, nome, telefone, email, endereco, cpf_cnpj),
            deal:deals!deal_id(id, titulo, contato_id),
            aprovador:profiles!aprovacao_interna_por(nome),
            fornecedor:suppliers!supplier_id(nome)
          `)
          .eq('id', id)
          .eq('organization_id', profile!.organization_id)
          .single()

        if (!orcamentoData) {
          setError('Orçamento não encontrado')
          setLoading(false)
          return
        }

        setOrcamento(orcamentoData)
        setError(null)
      } catch (err) {
        console.error('Erro ao carregar dados do orçamento:', err)
        setError('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, user, profile, authLoading])

  return { orcamento, profile: profile, loading, error }
}