# RISCOS — Hub Plataforma

> Riscos arquiteturais conhecidos, classificados por categoria, com mitigação.
> Atualizado em 2026-06-26.
> **Severidade:** 🔴 alta · 🟠 média · 🟡 baixa

---

## Infraestrutura

| ID | Risco | Sev. | Mitigação |
|---|---|---|---|
| R-INFRA-01 | **CLI Supabase linkado ao projeto errado** (`supabase/.temp/project-ref = zjhapezbcqoqwrwolcju` ≠ HUB DEV). `supabase db push/execute` atingiria o projeto legado. | 🔴 | **Não usar o CLI** para DDL; aplicar via **SQL Editor** do HUB DEV. Confirmar Project Ref antes de qualquer operação (DEC-007). |
| R-INFRA-02 | `next dev` (Turbopack) satura `fork` no sandbox e trava o shell (AUDIT-E1-01). | 🟠 | Subir sempre via **build + start** (DEC-009). |

## Banco

| ID | Risco | Sev. | Mitigação |
|---|---|---|---|
| R-DB-01 | Tabelas novas (`hubs`, `carteiras`) sem policies de RLS próprias num projeto que usa RLS. | 🟠 | Definir RLS dessas tabelas na fase **Migrate**; até lá, acesso apenas por `service_role`/escopo controlado. |
| R-DB-02 | Estruturas legadas (`leads`, `deals`, `health_hubs`, `supplier_categories`) ainda consumidas pelo código. | 🟠 | Remoção apenas na fase **Contract**, após substituição completa (DEC-001/002/003/006). |
| R-DB-03 | Migrations legadas (`supabase/migrations/`, 55 arquivos) não refletem o HUB DEV. | 🟡 | Tratadas como referência; HUB DEV usa `hubdev/bootstrap/`. Baseline 001 só ao fim do Contract. |

## Domínio

| ID | Risco | Sev. | Mitigação |
|---|---|---|---|
| R-DOM-01 | Dupla nomenclatura durante a transição (Lead/Solicitação de Novo Cliente; Deal/Atendimento Comercial; Catálogo removido) pode gerar confusão. | 🟠 | [`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md) + [`DECISIONS.md`](DECISIONS.md) como fonte única; código legado documentado como compat temporária. |
| R-DOM-02 | Entidades oficiais ainda não implementadas (Categoria, Subcategoria, Atendimento Comercial, Pré-pedido). | 🟡 | Implementação planejada em Sprints Expand futuras; situação registrada em [`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md) §5. |

## Segurança

| ID | Risco | Sev. | Mitigação |
|---|---|---|---|
| R-SEC-01 | Senha do usuário de teste exposta em chat (`HubDev@2026` revogada; senha atual também trafegou por chat). | 🟠 | Tratar como exposta/descartável; **trocar por uma senha nunca compartilhada** e não reutilizar em outros ambientes. |
| R-SEC-02 | Uso de `service_role` em sessão (autorizado pelo usuário). | 🟡 | Nunca exibir/versionar o valor; manter em `.env.local.hubdev` (gitignored); usar apenas no HUB DEV. |
| R-SEC-03 | Vazamento de PII entre Hubs no Cadastro de Clientes (DEC-020): `onboarding_detalhe`/RLS autorizavam o Hub por `industry_id`, expondo pré-cadastros (CPF, endereço, documentos) de outros Hubs da mesma Indústria via URL direta. | 🔴→✅ | **Corrigido** na migration `065` (escopo por perfil: Hub por `hub_id`, Indústria por `fn_hco_is_industria()`); validado ao vivo no HUB DEV. Ver [`CHANGELOG.md`](CHANGELOG.md) 2026-07-05. |
| R-SEC-04 | Acesso cross-hub a Orçamentos: detalhe `/orcamentos/[id]`, API de PDF e página de preview escopavam só por `organization_id` — um usuário do Hub B podia ver/baixar o orçamento de outro Hub da mesma org (RLS de `quotes` é permissiva por org). | 🔴→✅ | **Corrigido**: guard por `hub_id` para perfis do Hub nas três superfícies (`/orcamentos/[id]`, `api/orcamentos/[id]/pdf`, `preview-pdf`). Indústria (admin/gestor) segue por org. RLS de `quotes` ainda permissiva por org — endurecer em RLS é trabalho futuro. |

## Operação

| ID | Risco | Sev. | Mitigação |
|---|---|---|---|
| R-OPS-01 | Operar inadvertidamente fora do HUB DEV. | 🔴 | Confirmar Project Ref `pnkgwfgjhijksfmofiot` antes de cada operação de banco; em dúvida, **parar e reportar** (DEC-007). |
| R-OPS-02 | Conclusão de Sprint sem reflexo na documentação oficial. | 🟡 | Princípio "sem documentação, sem conclusão" ([`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md) §3); atualizar `SPRINTS.md`/`CHANGELOG.md`/`CHECKPOINTS.md` ao concluir. |

---

## Mitigação (resumo de governança)

- Todo erro encontrado vira **item de auditoria**: parar, reportar causa/arquivos/impacto/sugestão, aguardar aprovação.
- Nenhuma alteração de domínio/banco/arquitetura/regra sem autorização explícita.
- Evolução somente pela ordem **Expand → Migrate → Contract**.
