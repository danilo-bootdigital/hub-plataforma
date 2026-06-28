# PERMISSÕES — Hub Plataforma

> Referência **oficial e funcional** de permissões da Plataforma. Base para RLS, menus, botões, APIs, fluxos, auditoria, permissões especiais e visibilidade de dados.
> **Exclusivamente funcional** — não trata de banco, tabelas, APIs ou código.
> Subordinado à Constituição ([`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md)); usa os perfis da **DEC-011** e as entidades de [`DOMINIO.md`](DOMINIO.md).

## Perfis (DEC-011)

| Abrev. | Perfil | Bloco |
|---|---|---|
| **ADM** | Administrador | Indústria |
| **GES** | Gestor | Indústria |
| **FIN** | Financeiro | Indústria |
| **PROP** | Proprietário do Hub | Hub |
| **ASS** | Assistente de Venda | Hub |

## Legenda das células

`✓` permitido · `—` não permitido · `P` apenas próprios/designados · `C` via **concessão** do Proprietário do Hub · `N/A` ação não se aplica à entidade.

## Ações avaliadas (16)
Visualizar · Criar · Editar · Excluir · Transferir · Bloquear · Reativar · Exportar · Importar · Alterar responsável · Alterar Hub · Alterar Carteira · Aprovar · Reprovar · Recebe auditoria · Recebe notificações.

---

## 1. Indústria

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | ✓ | P | P |
| Criar | N/A | N/A | N/A | N/A | N/A |
| Editar | ✓ | — | — | — | — |
| Excluir | N/A | N/A | N/A | N/A | N/A |
| Transferir | N/A | N/A | N/A | N/A | N/A |
| Bloquear | N/A | N/A | N/A | N/A | N/A |
| Reativar | N/A | N/A | N/A | N/A | N/A |
| Exportar | ✓ | ✓ | ✓ | — | — |
| Importar | N/A | N/A | N/A | N/A | N/A |
| Alterar responsável | N/A | N/A | N/A | N/A | N/A |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | — | — | — | — |
| Recebe notificações | ✓ | ✓ | — | — | — |

## 2. Representante

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | — | P | — |
| Criar | ✓ | ✓ | — | — | — |
| Editar | ✓ | ✓ | — | — | — |
| Excluir | ✓ | — | — | — | — |
| Transferir | N/A | N/A | N/A | N/A | N/A |
| Bloquear | ✓ | ✓ | — | — | — |
| Reativar | ✓ | ✓ | — | — | — |
| Exportar | ✓ | ✓ | — | — | — |
| Importar | — | — | — | — | — |
| Alterar responsável | N/A | N/A | N/A | N/A | N/A |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | ✓ | — | — | — |
| Recebe notificações | ✓ | ✓ | — | P | — |

## 3. Hub

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | ✓ | P | P |
| Criar | ✓ | ✓ | — | — | — |
| Editar | ✓ | ✓ | — | — | — |
| Excluir | ✓ | — | — | — | — |
| Transferir | N/A | N/A | N/A | N/A | N/A |
| Bloquear | ✓ | ✓ | — | — | — |
| Reativar | ✓ | ✓ | — | — | — |
| Exportar | ✓ | ✓ | — | — | — |
| Importar | — | — | — | — | — |
| Alterar responsável | ✓ | ✓ | — | — | — |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | ✓ | — | P | — |
| Recebe notificações | ✓ | ✓ | — | ✓ | — |

> **Estados do Hub** (Bloquear/Reativar = ATIVO/INATIVO/SUSPENSO/BLOQUEADO) são governados **exclusivamente pela Indústria** (ADM/GES).

## 4. Carteira

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | — | P | P |
| Criar | ✓ | ✓ | — | — | — |
| Editar | ✓ | ✓ | — | — | — |
| Excluir | ✓ | — | — | — | — |
| Transferir | ✓ | ✓ | — | — | — |
| Bloquear | ✓ | ✓ | — | — | — |
| Reativar | ✓ | ✓ | — | — | — |
| Exportar | ✓ | ✓ | — | P | — |
| Importar | — | — | — | — | — |
| Alterar responsável | — | — | — | ✓ | — |
| Alterar Hub | ✓ | ✓ | — | — | — |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | ✓ | — | P | — |
| Recebe notificações | ✓ | ✓ | — | ✓ | P |

> **Alterar Hub** (qual Hub opera a Carteira) é **exclusivo da Indústria**. **Modo (ABERTA/DISTRIBUIDA)** e **Responsável da Carteira** são definidos pelo **PROP** (responsabilidade operacional do Hub).

## 5. Cliente

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | ✓ | ✓ | P/C |
| Criar | ✓ | ✓ | — | — | — |
| Editar | ✓ | ✓ | — | ✓ | P/C |
| Excluir | ✓ | — | — | — | — |
| Transferir | ✓ | ✓ | — | ✓ | — |
| Bloquear | ✓ | ✓ | — | — | — |
| Reativar | ✓ | ✓ | — | — | — |
| Exportar | ✓ | ✓ | — | ✓ | — |
| Importar | ✓ | ✓ | — | — | — |
| Alterar responsável | — | — | — | ✓ | — |
| Alterar Hub | ✓ | ✓ | — | — | — |
| Alterar Carteira | ✓ | ✓ | — | — | — |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | ✓ | — | P | — |
| Recebe notificações | — | P | — | ✓ | P |

> **Cliente pertence à Indústria.** O Hub o opera conforme o **modo** da Carteira: `ASS` vê/edita por padrão **P** (designados em DISTRIBUIDA) ou todos da Carteira em ABERTA; **C** amplia por concessão. Atribuição de responsável (ASS) é do **PROP**.

## 6. Solicitação de Novo Cliente

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | — | ✓ | P |
| Criar | ✓ | ✓ | — | ✓ | ✓ |
| Editar | ✓ | ✓ | — | P | P |
| Excluir | ✓ | — | — | — | — |
| Transferir | — | — | — | ✓ | — |
| Bloquear | N/A | N/A | N/A | N/A | N/A |
| Reativar | N/A | N/A | N/A | N/A | N/A |
| Exportar | ✓ | ✓ | — | P | — |
| Importar | — | — | — | — | — |
| Alterar responsável | — | — | — | ✓ | — |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | ✓ | ✓ | — | — | — |
| Reprovar | ✓ | ✓ | — | — | — |
| Recebe auditoria | ✓ | ✓ | — | P | — |
| Recebe notificações | — | ✓ | — | ✓ | P |

> **Aprovação/Reprovação é da Indústria** (ADM/GES). Aprovada → vira Cliente (da Indústria).

## 7. Atendimento Comercial

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | — | ✓ | P/C |
| Criar | — | — | — | ✓ | ✓ |
| Editar | — | — | — | ✓ | P/C |
| Excluir | ✓ | — | — | — | — |
| Transferir | — | — | — | ✓ | — |
| Bloquear | N/A | N/A | N/A | N/A | N/A |
| Reativar | N/A | N/A | N/A | N/A | N/A |
| Exportar | ✓ | ✓ | — | ✓ | P |
| Importar | — | — | — | — | — |
| Alterar responsável | — | — | — | ✓ | — |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | — | ✓ | — | ✓ | — |
| Recebe notificações | — | — | — | ✓ | P |

## 8. Pipeline

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | — | ✓ | ✓ |
| Criar | ✓ | ✓ | — | — | — |
| Editar | ✓ | ✓ | — | — | — |
| Excluir | ✓ | — | — | — | — |
| Transferir | N/A | N/A | N/A | N/A | N/A |
| Bloquear | N/A | N/A | N/A | N/A | N/A |
| Reativar | N/A | N/A | N/A | N/A | N/A |
| Exportar | ✓ | ✓ | — | — | — |
| Importar | — | — | — | — | — |
| Alterar responsável | N/A | N/A | N/A | N/A | N/A |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | ✓ | — | — | — |
| Recebe notificações | — | ✓ | — | — | — |

## 9. Orçamento

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | ✓ | ✓ | P/C |
| Criar | — | — | — | ✓ | ✓ |
| Editar | — | — | — | ✓ | P/C |
| Excluir | ✓ | — | — | — | — |
| Transferir | — | — | — | ✓ | — |
| Bloquear | N/A | N/A | N/A | N/A | N/A |
| Reativar | N/A | N/A | N/A | N/A | N/A |
| Exportar | ✓ | ✓ | ✓ | ✓ | P |
| Importar | — | — | — | — | — |
| Alterar responsável | — | — | — | ✓ | — |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | — | ✓ | — | ✓ | — |
| Recebe notificações | — | ✓ | — | ✓ | P |

> **Não existe "aprovação" interna de Orçamento.** O Assistente **Emite** (Finalizar e Enviar) o próprio Orçamento; a **aprovação comercial é do Cliente** (externa). O **PROP edita qualquer** Orçamento (intervenção). Se o Cliente **recusa**, o **mesmo** Orçamento volta à edição e é **emitido novamente** (não se cria outro). Após **conversão em Pré-pedido**, o Orçamento fica **SOMENTE LEITURA** — alterar só via **cancelar o Pré-pedido → reabrir o Orçamento**.

## 10. Pré-pedido

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | ✓ | ✓ | P |
| Criar | — | — | — | ✓ | ✓ |
| Editar | — | — | — | ✓ | P |
| Excluir | ✓ | — | — | — | — |
| Transferir | — | — | — | ✓ | — |
| Bloquear | N/A | N/A | N/A | N/A | N/A |
| Reativar | N/A | N/A | N/A | N/A | N/A |
| Exportar | ✓ | ✓ | ✓ | ✓ | P |
| Importar | — | — | — | — | — |
| Alterar responsável | — | — | — | ✓ | — |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | P (converte) |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | — | ✓ | — | ✓ | — |
| Recebe notificações | — | ✓ | — | ✓ | P |

> **Conversão** do Orçamento **aceito pelo Cliente** em Pré-pedido é **autonomia do Assistente** (`P`) — sem aprovação hierárquica do PROP/Gestor. **Cancelar** o Pré-pedido **reabre o Orçamento** para edição. O PROP edita qualquer Pré-pedido (intervenção).

## 11. Pedido

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | ✓ | ✓ | P/C |
| Criar | — | — | — | ✓ | ✓ |
| Editar | — | ✓ | P(financeiro) | ✓ | P |
| Excluir | ✓ | — | — | — | — |
| Transferir | — | — | — | ✓ | — |
| Bloquear | ✓ | ✓ | — | — | — |
| Reativar | ✓ | ✓ | — | — | — |
| Exportar | ✓ | ✓ | ✓ | ✓ | P |
| Importar | — | — | — | — | — |
| Alterar responsável | — | — | — | ✓ | — |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | — | ✓ | — | — | — |
| Reprovar | — | ✓ | — | — | — |
| Recebe auditoria | ✓ | ✓ | ✓ | ✓ | — |
| Recebe notificações | — | ✓ | ✓ | ✓ | P |

> **Cancelar** = Bloquear (ADM/GES). Etapa **financeira** do Pedido é editável pelo **FIN**.

## 12. Produto

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | ✓ | ✓ | ✓ |
| Criar | ✓ | ✓ | — | — | — |
| Editar | ✓ | ✓ | — | — | — |
| Excluir | ✓ | — | — | — | — |
| Transferir | N/A | N/A | N/A | N/A | N/A |
| Bloquear | ✓ | ✓ | — | — | — |
| Reativar | ✓ | ✓ | — | — | — |
| Exportar | ✓ | ✓ | — | ✓ | — |
| Importar | ✓ | ✓ | — | — | — |
| Alterar responsável | N/A | N/A | N/A | N/A | N/A |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | ✓ | — | — | — |
| Recebe notificações | — | ✓ | — | — | — |

> **Produto pertence à Indústria** (ativar/desativar = Bloquear/Reativar pela Indústria).

## 13. Categoria

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | — | ✓ | ✓ |
| Criar | ✓ | ✓ | — | — | — |
| Editar | ✓ | ✓ | — | — | — |
| Excluir | ✓ | — | — | — | — |
| Transferir | N/A | N/A | N/A | N/A | N/A |
| Bloquear | ✓ | ✓ | — | — | — |
| Reativar | ✓ | ✓ | — | — | — |
| Exportar | ✓ | ✓ | — | — | — |
| Importar | ✓ | ✓ | — | — | — |
| Alterar responsável | N/A | N/A | N/A | N/A | N/A |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | ✓ | — | — | — |
| Recebe notificações | — | ✓ | — | — | — |

## 14. Subcategoria

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | — | ✓ | ✓ |
| Criar | ✓ | ✓ | — | — | — |
| Editar | ✓ | ✓ | — | — | — |
| Excluir | ✓ | — | — | — | — |
| Transferir | N/A | N/A | N/A | N/A | N/A |
| Bloquear | ✓ | ✓ | — | — | — |
| Reativar | ✓ | ✓ | — | — | — |
| Exportar | ✓ | ✓ | — | — | — |
| Importar | ✓ | ✓ | — | — | — |
| Alterar responsável | N/A | N/A | N/A | N/A | N/A |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | ✓ | — | — | — |
| Recebe notificações | — | ✓ | — | — | — |

## 15. Financeiro

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | ✓ | — | — |
| Criar | — | — | ✓ | — | — |
| Editar | — | — | ✓ | — | — |
| Excluir | ✓ | — | — | — | — |
| Transferir | N/A | N/A | N/A | N/A | N/A |
| Bloquear | ✓ | — | ✓ | — | — |
| Reativar | ✓ | — | ✓ | — | — |
| Exportar | ✓ | ✓ | ✓ | — | — |
| Importar | — | — | ✓ | — | — |
| Alterar responsável | N/A | N/A | N/A | N/A | N/A |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | — | — | ✓ | — | — |
| Reprovar | — | — | ✓ | — | — |
| Recebe auditoria | ✓ | ✓ | ✓ | — | — |
| Recebe notificações | — | ✓ | ✓ | — | — |

> **Financeiro** aqui é a etapa financeira do Pedido (faturamento/baixa), operada pelo perfil FIN; o Hub **não** acessa o Financeiro. *(Ver dúvida nº 1 — "Financeiro como entidade".)*

## 16. Transportadora

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | ✓ | — | — |
| Criar | ✓ | ✓ | — | — | — |
| Editar | ✓ | ✓ | — | — | — |
| Excluir | ✓ | — | — | — | — |
| Transferir | N/A | N/A | N/A | N/A | N/A |
| Bloquear | ✓ | ✓ | — | — | — |
| Reativar | ✓ | ✓ | — | — | — |
| Exportar | ✓ | ✓ | — | — | — |
| Importar | — | — | — | — | — |
| Alterar responsável | N/A | N/A | N/A | N/A | N/A |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | ✓ | — | — | — |
| Recebe notificações | — | ✓ | — | — | — |

## 17. Fornecedor

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | ✓ | — | — |
| Criar | ✓ | ✓ | — | — | — |
| Editar | ✓ | ✓ | — | — | — |
| Excluir | ✓ | — | — | — | — |
| Transferir | N/A | N/A | N/A | N/A | N/A |
| Bloquear | ✓ | ✓ | — | — | — |
| Reativar | ✓ | ✓ | — | — | — |
| Exportar | ✓ | ✓ | — | — | — |
| Importar | — | — | — | — | — |
| Alterar responsável | N/A | N/A | N/A | N/A | N/A |
| Alterar Hub | N/A | N/A | N/A | N/A | N/A |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | ✓ | — | — | — |
| Recebe notificações | — | ✓ | — | — | — |

## 18. Usuário

| Ação | ADM | GES | FIN | PROP | ASS |
|---|---|---|---|---|---|
| Visualizar | ✓ | ✓ | — | P (Assistentes) | P (próprio) |
| Criar | ✓ | — | — | P (Assistentes) | — |
| Editar | ✓ | — | — | P (Assistentes) | P (próprio) |
| Excluir | ✓ | — | — | P (Assistentes) | — |
| Transferir | N/A | N/A | N/A | N/A | N/A |
| Bloquear | ✓ | — | — | P (Assistentes) | — |
| Reativar | ✓ | — | — | P (Assistentes) | — |
| Exportar | ✓ | — | — | — | — |
| Importar | — | — | — | — | — |
| Alterar responsável | N/A | N/A | N/A | N/A | N/A |
| Alterar Hub | ✓ | ✓ | — | — | — |
| Alterar Carteira | N/A | N/A | N/A | N/A | N/A |
| Aprovar | N/A | N/A | N/A | N/A | N/A |
| Reprovar | N/A | N/A | N/A | N/A | N/A |
| Recebe auditoria | ✓ | — | — | P | — |
| Recebe notificações | ✓ | — | — | P | — |

> **ADM** gere usuários da Indústria; **PROP** gere **apenas os Assistentes do seu Hub**; vínculo de Usuário↔Hub é da Indústria.

---

## Permissões especiais — Concessões do Hub

**Poderes próprios do Proprietário do Hub** (gestão — não são concessões): administrar Assistentes · conceder permissões · redistribuir Clientes/Atendimentos · visualizar toda a operação · intervir · **editar qualquer Orçamento/Pedido do Hub** · **assumir um Atendimento quando desejar**. O PROP **não aprova** os Orçamentos do Assistente.

**Autonomia do Assistente** (não é concessão): criar/editar/**Emitir (Finalizar e Enviar)** os próprios Orçamentos e **converter** o Orçamento aceito pelo Cliente em Pré-pedido, acompanhando até a geração do Pedido.

**Concessões** que o Proprietário do Hub atribui a Assistentes específicos (`C` nas matrizes): ver/editar **todos** os Orçamentos do Hub · ver/editar **todos** os Pedidos do Hub · acessar Atendimentos/Clientes de outros Assistentes · redistribuir · acessar relatórios do Hub.
Toda concessão é **explícita, auditável e revogável**, válida **apenas no próprio Hub**, e registrada em auditoria (concedente, alvo, capacidade, antes→depois, data/hora).

## Visibilidade de dados (resumo)

- **Indústria (ADM/GES/FIN):** escopo `indústria` — enxerga tudo da sua Indústria conforme o perfil.
- **PROP:** escopo `hub` — tudo do seu Hub.
- **ASS:** escopo `próprio` — seus Clientes/Atendimentos/Orçamentos/Pedidos; em Carteira **ABERTA** vê todos os Clientes da Carteira; em **DISTRIBUIDA** apenas os designados; **concessões** ampliam.

## Auditoria (resumo)

Recebem trilha de auditoria: **ADM** (governança da Indústria) e **PROP** (no seu Hub, sobre Assistentes/concessões/distribuição). Ações de alta sensibilidade auditadas: estados do Hub, autorização/alteração de Hub da Carteira, modo da Carteira, distribuição/redistribuição, definição de Responsável, concessões/revogações, emissão/conversão de Orçamento, etapa financeira.

**Regra imutável:** após a conversão em Pré-pedido, o Orçamento é **somente leitura**; qualquer alteração exige **cancelar o Pré-pedido → reabrir → editar → emitir → converter novamente** (rastreabilidade obrigatória).

---

## Documentos relacionados
- [`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md) · [`DECISIONS.md`](DECISIONS.md) (DEC-011) · [`DOMINIO.md`](DOMINIO.md) · [`FUNCIONAL.md`](FUNCIONAL.md)
