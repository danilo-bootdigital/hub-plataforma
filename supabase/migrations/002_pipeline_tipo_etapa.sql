-- Adiciona coluna para identificar etapas especiais do pipeline
ALTER TABLE pipeline_stages
  ADD COLUMN IF NOT EXISTS tipo_especial text
  CHECK (tipo_especial IN ('fechado', 'perdido'));

-- Marca etapas padrão existentes
UPDATE pipeline_stages SET tipo_especial = 'fechado'
WHERE LOWER(nome) = 'fechado' AND tipo_especial IS NULL;

UPDATE pipeline_stages SET tipo_especial = 'perdido'
WHERE LOWER(nome) = 'perdido' AND tipo_especial IS NULL;
