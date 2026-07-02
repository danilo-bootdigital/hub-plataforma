# AI-ARCHITECTURE — Arquitetura da Camada de Inteligência Artificial

> **Documento oficial e transversal.** Referência **suprema** para **qualquer** funcionalidade da plataforma que utilize IA — não pertence ao módulo de Receitas. Em qualquer divergência sobre uso de IA, este documento prevalece (subordinado apenas à [`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md)).
>
> **Aplica-se a (exemplos, não exaustivo):** Conferência de Receitas, OCR, leitura de documentos, laudos, contratos, notas fiscais, classificação de arquivos, chat interno, assistentes inteligentes e automações futuras.
>
> **Status:** Aprovada / vigente · **Data:** 2026-07-02 · **Relacionado:** DEC-019 (primeiro consumidor desta arquitetura).

---

## Objetivo

Definir o **papel da IA** na plataforma e a arquitetura oficial da camada de inteligência, de forma que **qualquer módulo futuro** a utilize do mesmo modo, com as mesmas garantias.

A IA é uma **camada de inteligência auxiliar**. Regra fundamental:

- **A IA auxilia** — fornece extração, organização e explicação.
- **A IA não toma decisões operacionais.**
- **A IA não substitui regras de negócio.**
- **A IA nunca substitui a autorização humana.**

Toda decisão que altere estado operacional (aprovar, bloquear, avançar etapa, emitir) pertence ao **sistema (motor de regras)** e ao **usuário autorizado** — nunca ao modelo.

---

## Princípios (permanentes)

1. **A IA apenas extrai informações.**
2. **A IA organiza dados** (em JSON estruturado).
3. **A IA explica inconsistências** (texto de apoio à leitura humana).
4. **A IA nunca define regras.**
5. **A IA nunca altera o fluxo operacional.**
6. **Toda decisão pertence ao sistema** (motor de regras determinístico).
7. **Toda decisão operacional pertence ao usuário autorizado** (RBAC).

Estes princípios são **invariantes**: nenhuma implementação, prompt ou provedor pode violá-los. Qualquer PR que coloque regra de negócio ou decisão dentro da IA deve ser rejeitado.

---

## Arquitetura

Fluxo oficial (canônico) de qualquer funcionalidade com IA:

```
Documento
   ↓
OCR (quando necessário)
   ↓
Camada de Extração
   ↓
Provider IA
   ↓
JSON Estruturado
   ↓
Motor de Regras
   ↓
Score
   ↓
Alertas
   ↓
Usuário
   ↓
Aprovação Operacional
```

Leitura do fluxo:
- **Documento → OCR → Extração → Provider IA → JSON**: caminho da **inteligência** (converter e entender). Só produz **dados** — nunca decisões.
- **JSON → Motor de Regras → Score → Alertas**: caminho da **decisão determinística** do sistema.
- **Usuário → Aprovação Operacional**: a **decisão final humana**, sempre.

A fronteira entre "IA" e "decisão" é dura: tudo à esquerda do Motor de Regras é sugestão/dado; tudo a partir dele é responsabilidade do sistema + humano.

---

## Providers

A plataforma **nunca** pode depender de um único fornecedor de IA.

- Existe uma **interface genérica** de provider. Nenhum módulo acessa diretamente um SDK específico (`@anthropic-ai/sdk`, SDK da OpenAI, etc.) — **sempre** através da camada intermediária.
- Provedores suportados por design (plugáveis): **Claude**, **OpenAI**, **Gemini**, **Azure OpenAI**, **modelos locais** e **outros futuros**.
- A implementação inicial de referência é **Claude** (`claude-opus-4-8`), mas trocar/combinar provedores **não** exige mudança nos módulos consumidores nem no motor de regras.

Contrato de referência (ilustrativo — não é implementação):

```
interface ProviderIA {
  id: 'claude' | 'openai' | 'gemini' | 'azure' | 'local' | string
  extrair(input: EntradaExtracao): Promise<SaidaExtracao>   // só extrai/explica
}
// SaidaExtracao = { dados: JSON, explicacao: string, confianca: number }
// NÃO existe método/campo de "decisão" ou "aprovação" no contrato.
```

Uma **factory** resolve o provider por configuração (env/feature flag), permitindo troca sem redeploy de lógica. O provider e o modelo utilizados são **sempre registrados** (ver Observabilidade e Versionamento).

---

## OCR

OCR é uma **responsabilidade separada da IA**.

- **OCR apenas converte imagem em texto** (e, opcionalmente, coordenadas/layout).
- **A IA interpreta** o conteúdo (texto do OCR e/ou o documento original).
- OCR tem sua própria interface e seus próprios provedores plugáveis (motor externo, serviço em nuvem, OCR local futuro) — independentes do provider de IA.
- OCR pode ser dispensado quando o provider de IA lê o documento nativamente (ex.: PDF/imagem multimodal); ainda assim, a **etapa** OCR permanece um ponto de extensão explícito da arquitetura.

Contrato de referência (ilustrativo):

```
interface LeitorDocumento {
  id: string
  ler(arquivo: Arquivo): Promise<{ texto: string, blocos?: BlocoTexto[], confianca: number }>
}
```

---

## Prompts

Política oficial de prompts (para todos os módulos):

- Todo prompt é um **artefato versionado**. Metadados obrigatórios: **versão**, **autor**, **data**, **objetivo**, **módulo**, **histórico**.
- **Nunca alterar um prompt em uso diretamente.** Toda mudança **cria uma nova versão** (imutabilidade do histórico).
- A **versão do prompt** usada em cada execução é registrada na análise (ver Observabilidade/Versionamento) — garantindo reprodutibilidade.
- Prompts residem em local versionado no repositório (ex.: `lib/ia/prompts/<modulo>/<nome>.vN.ts`), com cabeçalho de metadados.

Cabeçalho de referência (ilustrativo):

```
// prompt: conferencia-receita/extracao
// versao: 3
// autor:  <responsável>
// data:   2026-07-02
// objetivo: extrair campos da receita e explicar inconsistências (NÃO decidir)
// modulo: conferencia-receita
// historico: v1 base · v2 add posologia · v3 add via_administracao
```

---

## JSON Estruturado

- **Toda** resposta da IA retorna **JSON estruturado** — **nunca** texto livre como fonte de dados.
- O schema é **explícito** e a saída é **forçada** pelo provider quando suportado (ex.: structured output / `json_schema` estrito).
- O JSON é **validado** (schema + tipos) **antes** de entrar no sistema. JSON inválido é tratado como erro (ver Tratamento de Erros) — nunca é consumido "na melhor tentativa".
- O JSON contém **apenas dados extraídos + explicação + confiança**. **Não** contém veredito/decisão/aprovação (garantia arquitetural contra IA decisória).

---

## Motor de Regras

- **Toda regra de negócio pertence ao sistema — nunca à IA.**
- O motor de regras é **determinístico, auditável, reproduzível e totalmente independente do modelo** de IA utilizado.
- Recebe o **JSON estruturado** (dado extraído) + contexto do sistema (checklists, cadastros, dados do negócio) e produz **score, alertas e pendências**.
- É idealmente uma **função pura** (mesma entrada ⇒ mesma saída), o que o torna testável por testes unitários e independente de provider.
- Trocar o provider de IA **não pode** alterar a lógica de decisão. A decisão vive **fora** da IA.

---

## Segurança

- **Armazenamento privado** para todo documento sensível (buckets privados; sem leitura pública).
- **Criptografia quando aplicável** (em trânsito sempre; em repouso conforme o provedor de armazenamento).
- **Controle de acesso** por RBAC + RLS por organização/escopo; acesso a documentos via **signed URL** temporária, nunca URL pública.
- **Logs e auditoria** de toda operação de IA e de toda decisão operacional.
- **Retenção** definida e minimização de dados: guardar apenas o necessário; expurgo por prazo.
- **Anonimização quando possível** antes do envio a provedores externos (mascarar dados pessoais/sensíveis que não sejam necessários à extração).
- **Segredos** (chaves de provider) apenas em variáveis de ambiente/secret manager; nunca em código, prompt ou payload persistido.

---

## Observabilidade

Toda chamada de IA registra, no mínimo:

- **provider**
- **modelo**
- **versão do prompt**
- **tempo de resposta**
- **tokens de entrada**
- **tokens de saída**
- **custo estimado**
- **usuário responsável**
- **data**
- **resultado** (sucesso/erro; e o `confianca` da extração)

Esses registros alimentam custo por módulo/provider, latência, taxa de erro e reprodutibilidade. Nenhuma chamada de IA pode ocorrer "silenciosa".

---

## Tratamento de Erros

Comportamento padronizado (para todos os módulos):

- **Timeout:** limite explícito por chamada; excedido → erro tratado (não trava o fluxo do usuário).
- **Retry:** re-tentativa com backoff para falhas transitórias (rede/5xx/rate limit), com limite máximo.
- **Fallback:** provider alternativo configurável quando o primário falha/está indisponível (a troca não muda a lógica de decisão).
- **Provider indisponível:** degradar com mensagem clara; permitir conferência manual sem IA.
- **Resposta inválida / JSON inválido:** rejeitar, registrar e **não** consumir; oferecer reprocessar.
- **Confiança baixa:** abaixo de um limiar → marcar para **revisão humana obrigatória** (nunca "passar" automaticamente).

Em qualquer erro, o princípio permanece: **na dúvida, decisão humana** — a IA nunca "resolve sozinha".

---

## Versionamento

Toda análise deve informar **exatamente** quais versões foram utilizadas:

- **provider**
- **modelo**
- **prompt**
- **regras** (versão do motor/checklist de negócio)
- **OCR** (provider/versão)
- **checklist** (quando aplicável ao módulo)

Isso garante **reprodutibilidade**: qualquer resultado passado pode ser explicado pelas versões que o produziram. Alterações geram novas versões (imutabilidade); execuções antigas mantêm suas referências.

---

## Escalabilidade

- A arquitetura é projetada para que **dezenas de módulos** a utilizem no futuro (receitas, laudos, contratos, notas fiscais, classificação, chat, assistentes, automações).
- Este documento é **totalmente desacoplado de qualquer módulo específico**: cada módulo implementa seu **checklist/motor de regras** e seus **prompts versionados**, mas consome **as mesmas** interfaces de OCR, Provider IA, validação de JSON, observabilidade, erros e versionamento.
- Novos provedores e novos módulos entram **sem** reescrever a camada — apenas adicionando implementações atrás das interfaces existentes.

---

## Princípios Finais

- A IA é uma **camada de inteligência** da plataforma.
- Ela **nunca** será responsável pelas **regras de negócio**.
- Ela **nunca** será responsável por **decisões operacionais**.
- Ela **nunca** substituirá o **julgamento humano**.
- O **sistema** continua responsável por **aplicar regras, gerar alertas, controlar fluxos e registrar auditoria**.
- A IA **apenas fornece inteligência** para **auxiliar** essas decisões.
