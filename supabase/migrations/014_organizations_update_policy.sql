-- Permitir update na organização pelo próprio membro
CREATE POLICY "atualizar organizacao" ON organizations
  FOR UPDATE USING (id = get_organization_id());
