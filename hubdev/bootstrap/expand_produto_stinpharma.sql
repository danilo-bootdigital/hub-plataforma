-- =============================================================================
-- Ficha de Produto StinPharma — campos da apresentação comercial
-- [ADITIVO PURO / IDEMPOTENTE] — Expand.
-- =============================================================================
-- Objetivo: refletir em `products` os campos presentes nos portfólios/PDFs da
-- StinPharma, para a Ficha de Produto manual (versão de apresentação, NÃO o
-- modelo farmacêutico definitivo).
--
-- Regras desta migration (não violar):
--   - Apenas ADICIONAR colunas. NÃO remover, NÃO renomear, NÃO alterar tipos.
--   - Todas as colunas novas NULLABLE/opcionais (campos vazios são permitidos).
--   - NÃO altera RLS, Portfólios, Orçamentos, triggers ou dados existentes.
--   - Reaproveita colunas já existentes: nome, preco_unitario, via_administracao,
--     apresentacao (NÃO recriadas aqui).
--
-- Mapeamento StinPharma → coluna:
--   Produto              → nome              (já existe)
--   Valor unitário/Preço → preco_unitario    (já existe)
--   Via de administração → via_administracao (já existe)
--   Apresentação         → apresentacao      (já existe)
--   Volume               → volume               (NOVO, text — "10 ml", "60 mg", "1 frasco")
--   Quantidade por caixa → quantidade_por_caixa (NOVO, integer)
--   Valor da caixa       → valor_caixa          (NOVO, numeric(12,2))
--   Aplicadores          → aplicadores          (NOVO, text — número, texto ou descrição)
--   Via de apresentação  → via_apresentacao     (NOVO, text — separado de via_administracao)
--   (apoio à Receita)    → exige_receita        (NOVO, boolean default false)
--   (apoio à Receita)    → observacoes_receita  (NOVO, text)
--
-- Alvo: HUB DEV / Homologação (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

alter table products add column if not exists volume               text;
alter table products add column if not exists quantidade_por_caixa integer;
alter table products add column if not exists valor_caixa          numeric(12,2);
alter table products add column if not exists aplicadores          text;
alter table products add column if not exists via_apresentacao     text;
alter table products add column if not exists exige_receita        boolean default false;
alter table products add column if not exists observacoes_receita  text;
