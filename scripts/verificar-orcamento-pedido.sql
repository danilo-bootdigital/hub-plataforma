-- Script para verificar o estado atual do fluxo de orçamento para pedido
-- Execute no Supabase SQL Editor

-- 1. Listar orçamentos com status 'aprovado_pelo_cliente'
SELECT
  q.id,
  q.numero,
  q.status,
  q.valor_total,
  q.criado_em,
  q.atualizado_em,
  q.aprovado_cliente_em,
  q.aprovado_cliente_por,
  p.nome as responsavel_nome,
  l.nome as lead_nome,
  c.nome as contato_nome
FROM quotes q
LEFT JOIN profiles p ON q.responsavel_id = p.id
LEFT JOIN leads l ON q.lead_id = l.id
LEFT JOIN contacts c ON q.contato_id = c.id
WHERE q.organization_id = 'boot-digital'
  AND q.status = 'aprovado_pelo_cliente'
ORDER BY q.criado_em DESC
LIMIT 10;

-- 2. Verificar se existe pedido vinculado a esses orçamentos
SELECT
  q.id as quote_id,
  q.numero as quote_numero,
  o.id as order_id,
  o.numero as order_numero,
  o.status as order_status,
  o.criado_em as order_criado_em
FROM quotes q
LEFT JOIN orders o ON q.id = o.quote_id
WHERE q.organization_id = 'boot-digital'
  AND q.status = 'aprovado_pelo_cliente'
ORDER BY q.criado_em DESC
LIMIT 10;

-- 3. Listar todos os pedidos recentes
SELECT
  o.id,
  o.numero,
  o.status,
  o.valor_total,
  o.criado_em,
  o.quote_id,
  q.numero as quote_numero,
  q.status as quote_status
FROM orders o
LEFT JOIN quotes q ON o.quote_id = q.id
WHERE o.organization_id = 'boot-digital'
ORDER BY o.criado_em DESC
LIMIT 20;

-- 4. Verificar se há orçamentos com múltiplos pedidos
SELECT
  q.id,
  q.numero,
  COUNT(o.id) as num_pedidos
FROM quotes q
LEFT JOIN orders o ON q.id = o.quote_id
WHERE q.organization_id = 'boot-digital'
GROUP BY q.id, q.numero
HAVING COUNT(o.id) > 1
ORDER BY num_pedidos DESC;