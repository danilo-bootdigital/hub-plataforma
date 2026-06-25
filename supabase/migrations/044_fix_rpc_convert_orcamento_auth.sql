-- Migration: 044_fix_rpc_convert_orcamento_auth.sql
-- Corrige autenticação na RPC convert_orcamento_to_pedido
-- Problema: SECURITY DEFINER + auth.uid() retorna NULL
-- Solução: usar COALESCE(auth.uid(), p_user_id) com validação server-side

-- IMPORTANTE: DROP antes de criar para evitar overloads
DROP FUNCTION IF EXISTS public.convert_orcamento_to_pedido(uuid, text);
DROP FUNCTION IF EXISTS public.convert_orcamento_to_pedido(uuid, text, uuid);

-- Criar função com parâmetro p_user_id e validação segura
CREATE OR REPLACE FUNCTION public.convert_orcamento_to_pedido(
  p_quote_id uuid,
  p_motivo text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(success boolean, order_id uuid, order_numero integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_profile RECORD;
  v_order_id uuid;
  v_order_numero integer;
BEGIN
  -- 1. Obter user_id: priorizar auth.uid(), fallback para p_user_id
  v_user_id := COALESCE(auth.uid(), p_user_id);

  -- 2. Se ainda assim for NULL, retornar erro
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::integer, 'Usuario nao autenticado';
    RETURN;
  END IF;

  -- 3. Buscar profile do usuário para obter organization_id
  SELECT id, organization_id, cargo INTO v_profile
  FROM profiles
  WHERE id = v_user_id;

  IF v_profile IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::integer, 'Perfil nao encontrado';
    RETURN;
  END IF;

  -- 4. Verificar se orçamento existe e pertence à mesma organization
  IF NOT EXISTS (
    SELECT 1 FROM quotes
    WHERE id = p_quote_id
    AND organization_id = v_profile.organization_id
  ) THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::integer, 'Orcamento nao encontrado';
    RETURN;
  END IF;

  -- 5. Verificar status do orçamento
  IF (SELECT status FROM quotes WHERE id = p_quote_id) != 'aprovado_pelo_cliente' THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::integer,
      'Apenas orcamentos com status aprovado_pelo_cliente podem ser convertidos';
    RETURN;
  END IF;

  -- 6. Verificar se já existe pedido para este orçamento
  IF EXISTS (SELECT 1 FROM orders WHERE quote_id = p_quote_id) THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::integer,
      'Ja existe um pedido para este orcamento';
    RETURN;
  END IF;

  -- 7. Verificar se orçamento tem itens
  IF NOT EXISTS (SELECT 1 FROM quote_items WHERE quote_id = p_quote_id) THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::integer, 'Orcamento sem itens';
    RETURN;
  END IF;

  -- 8. LOCK no orçamento para evitar race condition
  PERFORM 1 FROM quotes WHERE id = p_quote_id FOR UPDATE;

  -- 9. Inserir pedido com RETURNING
  INSERT INTO orders (
    organization_id, quote_id, lead_id, contato_id, deal_id,
    responsavel_id, supplier_id, carrier_id, status,
    valor_total, desconto_geral, frete, frete_regiao,
    observacoes, endereco_entrega, forma_pagamento
  )
  SELECT
    v_profile.organization_id,
    p_quote_id,
    lead_id,
    contato_id,
    deal_id,
    responsavel_id,
    supplier_id,
    carrier_id,
    'pendente',
    valor_total,
    desconto_geral,
    COALESCE(frete, 0),
    frete_regiao,
    observacoes,
    endereco_entrega,
    forma_pagamento
  FROM quotes
  WHERE id = p_quote_id
  RETURNING id, numero INTO v_order_id, v_order_numero;

  -- 10. Copiar itens do orçamento
  INSERT INTO order_items (order_id, product_id, descricao, quantidade, preco_unitario, desconto_item, subtotal)
  SELECT
    v_order_id,
    product_id,
    descricao,
    quantidade,
    preco_unitario,
    desconto_item,
    subtotal
  FROM quote_items
  WHERE quote_id = p_quote_id;

  -- 12. Registrar histórico de status
  INSERT INTO order_status_history (organization_id, order_id, status_anterior, status_novo, observacao, autor_id)
  VALUES (
    v_profile.organization_id,
    v_order_id,
    NULL,
    'pendente',
    'Pedido gerado a partir do orcamento' || COALESCE(' - ' || p_motivo, ''),
    v_user_id
  );

  -- 13. Registrar atividade
  INSERT INTO activities (organization_id, tipo, descricao, lead_id, deal_id, contato_id, autor_id)
  SELECT
    v_profile.organization_id,
    'pedido_gerado',
    'Pedido gerado a partir do orcamento' || COALESCE('. Motivo: ' || p_motivo, ''),
    lead_id,
    deal_id,
    contato_id,
    v_user_id
  FROM quotes
  WHERE id = p_quote_id;

  -- 14. Atualizar orçamento com data de aprovação
  UPDATE quotes
  SET
    aprovado_cliente_em = COALESCE(aprovado_cliente_em, now()),
    aprovado_cliente_por = COALESCE(aprovado_cliente_por, v_user_id),
    atualizado_em = now()
  WHERE id = p_quote_id;

  -- 15. Retornar sucesso
  RETURN QUERY SELECT true, v_order_id, v_order_numero, 'Pedido gerado com sucesso';

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, NULL::uuid, NULL::integer, 'Erro: ' || SQLERRM;
END;
$function$;

-- 16. GRANT para a nova assinatura
GRANT EXECUTE ON FUNCTION public.convert_orcamento_to_pedido(uuid, text, uuid) TO authenticated;

-- 17. Comentário da função
COMMENT ON FUNCTION public.convert_orcamento_to_pedido IS
'Converte orçamento aprovado em pedido.
Parâmetros: p_quote_id (uuid), p_motivo (text), p_user_id (uuid opcional).
p_user_id é usado como fallback quando auth.uid() não está disponível.
A função valida que o orçamento pertence à organization do usuário.';
