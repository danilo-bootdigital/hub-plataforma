# CONTRIBUINDO — Hub Plataforma

> Guia para qualquer pessoa desenvolvedora trabalhar dentro deste projeto.
> Subordinado à Constituição ([`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md)) — em qualquer divergência, ela prevalece.

---

## 1. Ordem obrigatória de leitura

1. [`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md) — **Constituição**: o que é permitido, entidades oficiais, isolamento, ambiente, nomenclatura.
2. [`CONTRIBUINDO.md`](CONTRIBUINDO.md) — este guia.
3. [`DECISIONS.md`](DECISIONS.md) — decisões vigentes (DEC-001…), imutáveis.
4. [`ROADMAP.md`](ROADMAP.md) — em que fase o projeto está.
5. [`SPRINTS.md`](SPRINTS.md) — o que já foi executado e como.
6. [`RISCOS.md`](RISCOS.md) — riscos conhecidos e mitigações.
7. [`CHECKPOINTS.md`](CHECKPOINTS.md) e [`CHANGELOG.md`](CHANGELOG.md) — histórico de estado e de implementações.

## 2. Fluxo de evolução: Arquitetura → DEC → Sprint → Checkpoint → Changelog

```
Arquitetura → DEC → Sprint → Checkpoint → Changelog
```

1. **Arquitetura** — a Constituição define o que é permitido; nada pode contrariá-la.
2. **DEC** — toda mudança de domínio/arquitetura nasce como uma nova decisão em [`DECISIONS.md`](DECISIONS.md).
3. **Sprint** — a DEC é executada por uma Sprint, dentro de Expand → Migrate → Contract.
4. **Checkpoint** — ao concluir, registra-se o estado do sistema.
5. **Changelog** — registra-se o que foi efetivamente implementado.

> Nenhuma etapa pode ser pulada. Sem DEC não há Sprint de domínio; sem Checkpoint **e** Changelog não há conclusão.

## 3. Padrão para criação de novas Sprints

- Declarar, no formato de [`SPRINTS.md`](SPRINTS.md): **Identificador · Objetivo · Escopo · Dependências · Critérios de Aceite · Resultado · Checkpoint Relacionado · Changelog Relacionado**.
- Identificadores: `E#` (fundação), `Expand E#`/`M#`/`C#` (fases), `G#` (governança).
- Conclusão exige: critérios de aceite atendidos **e** registro em `SPRINTS.md`, `CHECKPOINTS.md` e (se houver implementação) `CHANGELOG.md`.
- Nenhuma Sprint de desenvolvimento inicia sem **autorização explícita**.

## 4. Padrão para criação de novas DEC

- Decisões são **imutáveis**: nenhuma DEC existente é editada.
- Mudança = **nova DEC sequencial** (DEC-011, DEC-012, …) que substitui a anterior; a antiga fica com status "Substituída por DEC-XXX". A **próxima** é a DEC-011.
- Cada DEC contém: **identificador · descrição · motivo · impacto · data · status**.
- Renomear/remover/substituir entidade do domínio **exige** uma DEC.

## 5. Estratégia Expand → Migrate → Contract

- **Expand** — apenas **aditivo**: novas tabelas/colunas (nullable), sem migrar dados, sem alterar código/RLS existente, sem remover nada.
- **Migrate** — popular/migrar dados, ajustar código, definir RLS das estruturas novas.
- **Contract** — remover estruturas legadas de compatibilidade já sem uso.
- Estruturas de compatibilidade atuais (`leads`, `deals`, `health_hubs`, `supplier_categories`) só são removidas no **Contract**.
- A **Baseline 001** só é gerada ao fim do Contract.

## 6. Política de governança

- Qualquer erro encontrado vira **item de auditoria**: parar, reportar causa/arquivos/impacto/sugestão e aguardar aprovação.
- Não alterar domínio/banco/arquitetura/regra sem autorização explícita (e, para domínio/arquitetura, sem nova DEC).
- "Sem documentação, sem conclusão": nenhuma Sprint é concluída sem refletir o status na documentação oficial.
- Em dúvida sobre projeto/ambiente: **parar e confirmar** antes de executar.

## 7. Ambiente oficial de desenvolvimento

- **HUB DEV / Homologação** é o **único** ambiente oficial: Project Ref **`pnkgwfgjhijksfmofiot`** (`https://pnkgwfgjhijksfmofiot.supabase.co`).
- Toda operação de banco é direcionada **exclusivamente** a esse projeto; o legado e qualquer outro são **proibidos** (ver [`RISCOS.md`](RISCOS.md), R-INFRA-01).
- DDL no HUB DEV é aplicado via **SQL Editor** (o CLI está linkado a projeto divergente — não usar).
- A Aplicação Web sobe sempre por **build + start**; nunca `next dev` (DEC-009).

## 8. Nomenclatura oficial da Plataforma

A tabela canônica de nomenclatura oficial é mantida em **um único local**: [`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md) §10.

Regra-base: é **proibido** usar "App"/"Aplicativo"; utilizar sempre os termos oficiais definidos nessa tabela.

## 9. Regras para qualquer novo desenvolvedor

1. Ler a documentação na ordem do §1 antes de tocar em qualquer coisa.
2. Responder e documentar em **português do Brasil (pt-BR)**.
3. Nunca contrariar a Constituição; em divergência, ela prevalece.
4. Mudança de domínio só com **nova DEC**; execução só via **Sprint**.
5. Banco apenas no **HUB DEV** (`pnkgwfgjhijksfmofiot`), via **SQL Editor**, de forma **aditiva** na fase Expand.
6. Atualizar `SPRINTS.md` + `CHECKPOINTS.md` + `CHANGELOG.md` ao concluir trabalho.
7. Não iniciar nenhuma Sprint de desenvolvimento sem **autorização explícita**.

## 10. Manutenção de documentos (reconstruir, não patch)

Quando um documento precisar de reorganização estrutural, consolidação, padronização ou revisão completa, **não usar edição incremental**:

1. Ler integralmente o documento atual.
2. Reconstruir a estrutura usando apenas informações oficialmente aprovadas.
3. Gerar uma versão completa nova e **substituir integralmente** o conteúdo do arquivo.
4. Nunca preservar trechos antigos "por segurança"; nunca acumular conteúdo histórico dentro do documento.
5. O resultado deve ter uma única estrutura coerente, limpa e sem duplicações.

**Auditoria obrigatória antes de finalizar** — verificar: títulos duplicados · seções duplicadas · campos duplicados · Sprints repetidas · DEC repetidas · Checkpoints repetidos · inconsistências de formatação · referências quebradas entre documentos. Se encontrar qualquer duplicação/inconsistência, **reconstruir novamente** antes de concluir.
