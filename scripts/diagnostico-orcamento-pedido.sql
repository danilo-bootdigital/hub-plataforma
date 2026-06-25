-- ============================================================
-- SCRIPT DE DIAGNÓSTICO - FLUXO DE ORÇAMENTO PARA PEDIDO
-- ============================================================

-- Execute este script no SQL Editor do Supabase para diagnosticar o problema

-- 1. Verificar se há orçamentos com status 'aprovado_pelo_cliente'
-- (esses são os orçamentos que deveriam ter pedidos gerados)
SELECT
  q.id as orcamento_id,
  q.numero as orcamento_numero,
  q.status,
  q.valor_total,
  q.aprovado_cliente_em,
  q.aprovado_cliente_por,
  p.nome as responsavel,
  l.nome as cliente_lead,
  c.nome as cliente_contato,
  q.criado_em,
  q.atualizado_em
FROM quotes q
LEFT JOIN profiles p ON q.responsavel_id = p.id
LEFT JOIN leads l ON q.lead_id = l.id
LEFT JOIN contacts c ON q.contato_id = c.id
WHERE q.organization_id = 'boot-digital'
  AND q.status = 'aprovado_pelo_cliente'
ORDER BY q.criado_em DESC
LIMIT 20;

-- 2. Verificar se esses orçamentos têm pedidos vinculados
-- (se a linha acima retornar resultados, execute esta query para cada um)
SELECT
  q.id as orcamento_id,
  q.numero as orcamento_numero,
  o.id as pedido_id,
  o.numero as pedido_numero,
  o.status as pedido_status,
  o.criado_em as pedido_criado_em,
  o.valor_total as pedido_valor_total
FROM quotes q
LEFT JOIN orders o ON q.id = o.quote_id
WHERE q.organization_id = 'boot-digital'
  AND q.status = 'aprovado_pelo_cliente'
ORDER BY q.criado_em DESC
LIMIT 20;

-- 3. Listar TODOS os pedidos recentes (últimos 30 dias)
-- (para ver se algum pedido foi criado sem vínculo correto)
SELECT
  o.id,
  o.numero,
  o.status,
  o.valor_total,
  o.criado_em,
  o.quote_id,
  q.numero as quote_numero,
  q.status as quote_status,
  CASE
    WHEN o.quote_id IS NULL THEN 'SEM VÍNCULO'
    WHEN q.status IS NULL THEN 'ORÇAMENTO EXCLUIDO'
    WHEN q.status != 'aprovado_pelo_cliente' THEN 'ORÇAMENTO NÃO APROVADO'
    ELSE 'VÍNCULO CORRETO'
  END as status_vinculo
FROM orders o
LEFT JOIN quotes q ON o.quote_id = q.id
WHERE o.organization_id = 'boot-digital'
  AND o.criado_em > NOW() - INTERVAL '30 days'
ORDER BY o.criado_em DESC
LIMIT 50;

-- 4. Verificar se há múltiplos pedidos para o mesmo orçamento
-- (o sistema não deve permitir isso, mas bom verificar)
SELECT
  q.id,
  q.numero,
  COUNT(o.id) as total_pedidos,
  STRING_AGG(o.numero::text, ', ') as numeros_pedidos
FROM quotes q
LEFT JOIN orders o ON q.id = o.quote_id
WHERE q.organization_id = 'boot-digital'
GROUP BY q.id, q.numero
HAVING COUNT(o.id) > 1
ORDER BY total_pedidos DESC;

-- 5. Verificar histórico de atividades relacionadas a orçamentos
-- (para ver se a ação "Transformar em Pedido" foi executada)
SELECT
  a.id,
  a.tipo,
  a.descricao,
  a.criado_em,
  p.nome as usuario,
  q.numero as orcamento_numero
FROM activities a
LEFT JOIN profiles p ON a.autor_id = p.id
LEFT JOIN quotes q ON a.descricao::text LIKE '%' || q.id::text || '%'
WHERE a.organization_id = 'boot-digital'
  AND (a.tipo = 'pedido_gerado' OR a.descricao LIKE '%pedido%' OR a.descricao LIKE '%orçamento%')
  AND a.criado_em > NOW() - INTERVAL '7 days'
ORDER BY a.criado_em DESC
LIMIT 20;

-- ============================================================
-- COMO INTERPRETAR OS RESULTADOS:
-- ============================================================
--
-- SE O PROBLEMA FOR A) Pedido não está sendo criado:
--   - A query 1 deve retornar orçamentos com status 'aprovado_pelo_cliente'
--   - A query 2 deve retornar NULL na coluna pedido_id para esses orçamentos
--
-- SE O PROBLEMA FOR B) Pedido existe mas não aparece na tela:
--   - A query 2 deve retornar um pedido_id
--   - A query 3 deve mostrar o pedido com status 'VÍNCULO CORRETO'
--
-- SE O PROBLEMA FOR C) Status do orçamento não permite exibir o botão:
--   - A query 1 NÃO deve retornar nenhum registro
--   - O orçamento deve estar com status diferente de 'aprovado_pelo_cliente'
--
-- SE O PROBLEMA FOR D) Pedido foi criado sem vínculo:
--   - A query 3 deve mostrar registros com status 'SEM VÍNCULO'
--