-- Campos extras para produtos (catálogo de estéreis)
ALTER TABLE products ADD COLUMN IF NOT EXISTS composicao text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS apresentacao text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS via_administracao text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS embalagem text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS grupo text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS modo_uso text;
