ALTER TABLE quotes ADD COLUMN IF NOT EXISTS contato_id UUID REFERENCES contacts(id);
CREATE INDEX ON quotes(contato_id);
