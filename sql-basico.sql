-- QUERY 1: Verificar orçamentos aprovados
SELECT q.id, q.numero, q.status, q.valor_total
FROM quotes q
WHERE q.organization_id = 'boot-digital'
  AND q.status = 'aprovado_pelo_cliente'
ORDER BY q.criado_em DESC
LIMIT 10;

-- QUERY 2: Verificar se esses orçamentos têm pedidos
SELECT q.id, q.numero, o.id as pedido_id, o.numero as pedido_numero
FROM quotes q
LEFT JOIN orders o ON q.id = o.quote_id
WHERE q.organization_id = 'boot-digital'
  AND q.status = 'aprovado_pelo_cliente'
ORDER BY q.criado_em DESC
LIMIT 10;

-- QUERY 3: Listar todos os pedidos recentes
SELECT o.id, o.numero, o.status, o.quote_id, q.numero as quote_numero
FROM orders o
LEFT JOIN quotes q ON o.quote_id = q.id
WHERE o.organization_id = 'boot-digital'
  AND o.criado_em > NOW() - INTERVAL '30 days'
ORDER BY o.criado_em DESC
LIMIT 20;