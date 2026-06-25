-- Vínculo conversa → deal (oportunidade)
ALTER TABLE conversations
  ADD COLUMN deal_id UUID REFERENCES deals(id);

CREATE INDEX ON conversations(deal_id);
