-- Enum de status operacional do pedido
CREATE TYPE order_status AS ENUM (
  'pendente',
  'em_producao',
  'pronto',
  'enviado',
  'entregue',
  'concluido',
  'cancelado'
);

-- Tabela de pedidos
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  numero SERIAL,
  quote_id UUID NOT NULL REFERENCES quotes(id),
  lead_id UUID REFERENCES leads(id),
  contato_id UUID REFERENCES contacts(id),
  deal_id UUID REFERENCES deals(id),
  responsavel_id UUID NOT NULL REFERENCES profiles(id),
  status order_status NOT NULL DEFAULT 'pendente',
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_geral NUMERIC(5,2) NOT NULL DEFAULT 0,
  frete NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  endereco_entrega TEXT,
  forma_pagamento TEXT,
  motivo_cancelamento TEXT,
  cancelado_por UUID REFERENCES profiles(id),
  cancelado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens do pedido (cópia congelada do orçamento)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  descricao TEXT NOT NULL,
  quantidade NUMERIC(10,3) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL,
  desconto_item NUMERIC(5,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL
);

-- Histórico de mudanças de status do pedido
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status_anterior order_status,
  status_novo order_status NOT NULL,
  observacao TEXT,
  autor_id UUID NOT NULL REFERENCES profiles(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX ON orders(organization_id, status);
CREATE INDEX ON orders(organization_id, responsavel_id);
CREATE INDEX ON orders(organization_id, criado_em DESC);
CREATE INDEX ON orders(quote_id);
CREATE INDEX ON orders(lead_id);
CREATE INDEX ON orders(contato_id);
CREATE INDEX ON order_items(order_id);
CREATE INDEX ON order_status_history(order_id);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedidos da org" ON orders
  FOR ALL USING (organization_id = get_organization_id());

CREATE POLICY "itens pedido da org" ON order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.organization_id = get_organization_id())
  );

CREATE POLICY "historico pedido da org" ON order_status_history
  FOR ALL USING (organization_id = get_organization_id());
