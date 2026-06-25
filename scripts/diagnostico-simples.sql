-- ============================================================
-- SCRIPT DE DIAGNÓSTICO - FLUXO DE ORÇAMENTO PARA PEDIDO
-- Versão simplificada sem aliases com underline
-- ============================================================

-- 1. Verificar orçamentos aprovados (que deveriam ter pedidos)
SELECT
  q.id,
  q.numero,
  q.status,
  q.valor_total,
  q.aprovado_cliente_em,
  p.nome as responsavel
FROM quotes q
LEFT JOIN profiles p ON q.responsavel_id = p.id
WHERE q.organization_id = 'boot-digital'
  AND q.status = 'aprovado_pelo_cliente'
ORDER BY q.criado_em DESC
LIMIT 20;

-- 2. Verificar se esses orçamentos têm pedidos vinculados
SELECT
  q.id,
  q.numero,
  o.id as pedido_id,
  o.numero as pedido_numero,
  o.status
FROM quotes q
LEFT JOIN orders o ON q.id = o.quote_id
WHERE q.organization_id = 'boot-digital'
  AND q.status = 'aprovado_pelo_cliente'
ORDER BY q.criado_em DESC
LIMIT 20;

-- 3. Listar pedidos recentes com status do vínculo
SELECT
  o.id,
  o.numero,
  o.status,
  o.valor_total,
  o.criado_em,
  o.quote_id,
  q.numero as quote_numero
FROM orders o
LEFT JOIN quotes q ON o.quote_id = q.id
WHERE o.organization_id = 'boot-digital'
  AND o.criado_em > NOW() - INTERVAL '30 days'
ORDER BY o.criado_em DESC
LIMIT 50;

-- 4. Verificar múltiplos pedidos para mesmo orçamento
SELECT
  q.id,
  q.numero,
  COUNT(o.id) as total_pedidos
FROM quotes q
LEFT JOIN orders o ON q.id = o.quote_id
WHERE q.organization_id = 'boot-digital'
GROUP BY q.id, q.numero
HAVING COUNT(o.id) > 1
ORDER BY total_pedidos DESC;

-- 5. Histórico de atividades
SELECT
  a.id,
  a.tipo,
  a.descricao,
  a.criado_em,
  p.nome as usuario
FROM activities a
LEFT JOIN profiles p ON a.autor_id = p.id
WHERE a.organization_id = 'boot-digital'
  AND a.tipo = 'pedido_gerado'
  AND a.criado_em > NOW() - INTERVAL '7 days'
ORDER BY a.criado_em DESC
LIMIT 20;