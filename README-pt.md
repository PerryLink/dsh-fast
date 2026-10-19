<div align="center">

# ⚡ dsh-fast
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-fast` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Diagnóstico de desempenho somente leitura para DeepSeek Harness.**

*Observa o fluxo de eventos da sessão — nunca o caminho quente do modelo — e informa para onde vão a latência e o orçamento de contexto.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-fast)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-fast.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-fast/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-fast/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-fast?label=version)](https://github.com/PerryLink/dsh-fast/releases)
[![npm version](https://img.shields.io/npm/v/dsh-fast)](https://www.npmjs.com/package/dsh-fast)
[![npm downloads](https://img.shields.io/npm/dm/dsh-fast)](https://www.npmjs.com/package/dsh-fast)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-fast?metric=downloads&lang=pt)](https://dshfind.com/pt/plugins/PerryLink/dsh-fast?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-fast
```


</div>

---


**📖 Base de conhecimento do ecossistema** — dados medidos, não marketing: [guia de desenvolvimento · dados de seleção · critérios de manutenção](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Install & uninstall

```sh
dsh plugin --profile demo add dsh-fast       # instalar
dsh plugin --profile demo remove dsh-fast    # desinstalar
```

Verifique a montagem: `dsh --profile demo --dump-config | grep dsh-fast`.

## ⭐ 如果它帮到了你

Este plugin faz parte da [família de plugins DSH](https://github.com/PerryLink) (mais de 40, todos Apache-2.0). Se for útil, **deixe uma estrela**: não desbloqueia nada, mas ajuda a próxima pessoa a encontrá-lo.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-fast?

Diagnóstico de desempenho somente leitura para DeepSeek Harness.

Observa o fluxo de eventos da sessão — nunca o caminho quente do modelo — e informa para onde vão a latência e o orçamento de contexto.

![Diagrama de fluxo de dsh-fast: solicitação → política/revisão → veredito.](docs/assets/dsh-fast-flow.svg)

*Visão geral do fluxo: solicitação → política/revisão → veredito. Os exemplos abaixo usam a superfície real de comandos.*


*A mesma execução, animada.*

## Compatibility

- DeepSeek Harness `dsh-v0.2.1-alpha.1` (adaptado em 2026-09-18): a superfície da sessão é lida pelo serviço opcional `sessionQuery` — o acessor síncrono obsoleto `Session.eventAt(seq)` sai de cena, com uma leitura síncrona equivalente como fallback — e todos os registros agora vivem em um único efeito de ciclo de vida que os libera em ordem inversa. Mudança interna: as métricas são idênticas para o mesmo log. Verificado em 2026-10-04 com a cadeia de portas local (typecheck triplo + 71 testes); o workflow compat repete o smoke de instalação de profile com os pins publicados.
- Node `^22.19.0 || >=24.0.0`, somente ESM (`"type": "module"`).
- Peers: `@deepseek-ai/cordis ^4.0.2`, `@deepseek-ai/schemastery ^3.18.4`, e `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-compaction`, `@deepseek-ai/dsh-session-query`, `@deepseek-ai/dsh-storage-domain` em `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0 || >=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0 || >=0.2.0-0 <0.3.0 || >=0.2.1-0 <0.3.0` (devDependencies fixam `0.2.0-rc.2`); a linha `0.1.2-rc.1` continua suportada em execução por um fallback estrutural ao `header.system` anterior ao 0.1.5.

## What you get

- **Tempo de carga da sessão** — latência publicação→primeira requisição, classificada `open` (nova) ou `restore` (com semente/retomada), mais a contagem de eventos de semente.
- **Contagem de spill** — quantos resultados de ferramenta foram descarregados em um artefato de sessão (detectado pelo aviso persistente de spill).
- **Contagem e motivo de compaction** — total, separado `manual` (comando) vs `automatic` (pressão), e total de tokens sombreados.
- **Volume de contexto injetado** — tokens de system-prompt (AGENTS.md + skills + persona), schema de ferramentas e superfície, com suas proporções; a superfície é apenas histórico de conversa (no `0.1.5-alpha.1` a superfície do meter inclui o nó de sistema, que o dsh-fast desconta).
- **Taxa de acertos do cache LLM** — tokens input / cache-read / cache-write / output agregados e a taxa derivada.
- **Sugestões de otimização** — baseadas em limiares (cortar skills, ajustar schemas, compactar antes, ativar cache de prompts, ativar spill-policy…).
- **Amostragem assíncrona** — dobra O(1) por evento; a amostragem roda em um timer, nunca no caminho de append.

## Quick start

```sh
dsh plugin --profile web add github:PerryLink/dsh-fast
```

### git channel

```sh
# De um profile temporário (fixa o commit; roda o build `prepare` autocontido)
dsh plugin --profile demo add "github:YOUR_ORG/dsh-fast#<sha>"
# O pnpm-workspace.yaml do profile ganha uma entrada allowBuilds para dsh-fast no primeiro add.
```

### npm channel

```sh
dsh plugin --profile demo add dsh-fast
```

Ambos os canais instalam a linha do bundle (ver `cordis.patch.yml`) na pilha `dsh.profile.bundles` e surtem efeito ao reiniciar.

## `/fast` namespace collision

`/fast` é um comando do host. Se outro plugin registrar uma contribuição **client**
`commandUi` com o mesmo nome `fast`, o menu de comandos pode perder toda a fonte
`/`. A colisão está no namespace client do host; este plugin não consegue renomear
em runtime. Solução: desative/renomeie o comando client `fast` do outro plugin, ou
remova um dos plugins. `/fast` e `fast_report` continuam funcionando sem uma
contribuição client duplicada.

### Exemplos

São os pontos de entrada reais; instale e chame um.

#### Exemplo detalhado

- `/fast`

#### Exemplos breves

- `fast_report`

## Configuration

Todos os ajustes são campos Schemastery `Config`; valores inválidos falham a carga do profile de forma audível.

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Interruptor mestre; `false` não monta nada. |
| `privacy.includeCwd` | `false` | Incluir o diretório de trabalho saneado nos relatórios. |
| `sampling.snapshotIntervalMs` | `60000` | A cada quanto as sessões ativas são amostradas (ms). |
| `sampling.maxHistorySamples` | `20` | Amostras retidas por sessão no histórico durável. |
| `thresholds.systemPromptTokens` | `20000` | Avisar se o system prompt exceder esses tokens. |
| `thresholds.toolSchemaTokens` | `8000` | Avisar se o schema de ferramentas exceder esses tokens. |
| `thresholds.surfaceTokens` | `60000` | Avisar se a superfície exceder esses tokens. |
| `thresholds.cacheHitRateFloor` | `0.1` | Avisar se a taxa de cache cair abaixo disso (0..1). |
| `thresholds.compactionCountWarn` | `10` | Avisar após tantas compactions. |
| `thresholds.compactionShadowTokens` | `40000` | Avisar se a média de tokens sombreados por summary exceder isso. |
| `spill.detectSpilledResults` | `true` | Detectar resultados descarregados pelo marcador de aviso persistente. |

## Tools & surfaces

- **`/fast`** — comando humano que imprime o relatório de saúde da sessão: carga, spill, compaction, ranking de volume de contexto, taxa de cache e sugestões.
- **`fast_report`** — ferramenta de modelo que devolve o mesmo relatório como JSON estruturado (para o modelo raciocinar), com render de texto legível.

## Permissions & data

O `dsh-fast` consome apenas seams públicos: eventos `session/*` e `agent/*`, o opcional `ctx.tokenMeter`, `ctx.storageDomain`, `ctx.commands` e `ctx.tools`. É estritamente somente leitura sobre o log de sessão — nunca muta a requisição do modelo, os resultados de ferramentas nem a superfície. As métricas são persistidas no domínio `dsh_fast` (uma história limitada por sessão), não no log. A identidade do relatório e o diretório opcional são saneados antes de exibição ou escrita durável.

## Security boundaries

- **Somente leitura, zero sobrecarga no caminho do modelo** — dobra O(1) por evento; amostragem por timer.
- **Sem rede, sem manuseio de credenciais** — nenhuma requisição de saída nem armazenamento sensível.
- **Configuração que falha audível** — cada ajuste é validado na montagem; limites inválidos lançam erro.
- **Dados de exibição/duráveis saneados** — caracteres de controle são removidos e comprimentos limitados; `cwd` fica desativado por padrão.
- **Registros reversíveis** — tudo passa por `ctx.effect()` / `ctx.on()` / `register()`.

## Known limitations

- **Domínio de armazenamento, não eventos de sessão** — o `Session.append` do rc.2 não oferece marcador `ignorable` nem superfície de registro de eventos externa; um evento `fast/*` faria o coordenador de persistência recusar o log ao restaurar. As métricas vão ao domínio de armazenamento; os eventos brutos seguem como fonte reconstruível.
- **A detecção de spill é heurística** — lê o aviso persistente (`Full … stored at:`); não há evento de sessão dedicado.
- **O system prompt é um único balde** — AGENTS.md, skills e persona formam o system prompt montado; desde `0.1.5-alpha.1` é o nó 0 da superfície (um `system/message`) e não traz contagem por seção, então são reportados juntos.
- **O tempo de carga começa na publicação** — a leitura de disco de uma restauração ocorre antes de `session/created`; a duração reportada é publicação→primeira requisição.
- **As degradações são anunciadas uma vez** — um host sem `tokenMeter` cai no preço heurístico de tokens, um host sem `systemPrompt` atribui todo o prompt a um único balde, e uma saída `inspector` que falha é ignorada; cada caso agora avisa uma vez por processo em vez de mudar o significado dos números em silêncio.

## Development

```sh
pnpm install
pnpm run typecheck && pnpm run typecheck:ci && pnpm run typecheck:checkout
pnpm test
pnpm run build
pnpm run verify:self-contained && pnpm run verify:artifacts
node scripts/check-readme-sync.mjs
pnpm pack
```

## Topics

`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `performance`, `diagnostics`, `profiling`, `context-engineering`, `llm-cache`

## Contributors

Obrigado a todas as pessoas que contribuíram com o `dsh-fast`:

- **[PerryLink](https://github.com/PerryLink)** — autor e mantenedor: projetou e construiu os diagnósticos somente leitura (latência de carregamento de sessão, contagens de spill, métricas de compactação, volume de injeção de contexto, taxa de acertos de cache do LLM), o comando `/fast` e a ferramenta `fast_report`, o domínio de armazenamento `dsh_fast` e a documentação em cinco idiomas.

## PerryLink DSH Plugin Family

Este projeto faz parte da família de plugins do DeepSeek Harness da [PerryLink](https://github.com/PerryLink). O registro fica recolhido abaixo para que cada README mantenha uma primeira tela curta; expanda para ver cada linha e seu status.

<details>
<summary>Expandir todos os plugins</summary>

| Plugin | Status |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** |  |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** |  |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** |  |
| **[dsh-demurrage-ledger](https://github.com/PerryLink/dsh-demurrage-ledger)** |  |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** |  |
| **[dsh-drill-script-check](https://github.com/PerryLink/dsh-drill-script-check)** |  |
| **[dsh-eia-guide-check](https://github.com/PerryLink/dsh-eia-guide-check)** |  |
| **[dsh-emergency-plan](https://github.com/PerryLink/dsh-emergency-plan)** |  |
| **[dsh-essay-rubric-check](https://github.com/PerryLink/dsh-essay-rubric-check)** |  |
| **[dsh-evidence-check](https://github.com/PerryLink/dsh-evidence-check)** |  |
| **[dsh-export-ctl-check](https://github.com/PerryLink/dsh-export-ctl-check)** |  |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** |  |
| **[dsh-fmea-table-check](https://github.com/PerryLink/dsh-fmea-table-check)** |  |
| **[dsh-forecast-penalty](https://github.com/PerryLink/dsh-forecast-penalty)** |  |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** |  |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** |  |
| **[dsh-gongwen-flow-check](https://github.com/PerryLink/dsh-gongwen-flow-check)** |  |
| **[dsh-gongwen-word-check](https://github.com/PerryLink/dsh-gongwen-word-check)** |  |
| **[dsh-guard-plan-qc](https://github.com/PerryLink/dsh-guard-plan-qc)** |  |
| **[dsh-hazchem-check](https://github.com/PerryLink/dsh-hazchem-check)** |  |
| **[dsh-hazplan-check](https://github.com/PerryLink/dsh-hazplan-check)** |  |
| **[dsh-hidden-risk-map](https://github.com/PerryLink/dsh-hidden-risk-map)** |  |
| **[dsh-hs-classify](https://github.com/PerryLink/dsh-hs-classify)** |  |
| **[dsh-icd-rule-check](https://github.com/PerryLink/dsh-icd-rule-check)** |  |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** |  |
| **[dsh-lawcite-adapter](https://github.com/PerryLink/dsh-lawcite-adapter)** |  |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** |  |
| **[dsh-lc-doc-check](https://github.com/PerryLink/dsh-lc-doc-check)** |  |
| **[dsh-learning-gap-check](https://github.com/PerryLink/dsh-learning-gap-check)** |  |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** |  |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** |  |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** |  |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** |  |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** |  |
| **[dsh-medrec-qc](https://github.com/PerryLink/dsh-medrec-qc)** |  |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** |  |
| **[dsh-nsfc-form-check](https://github.com/PerryLink/dsh-nsfc-form-check)** |  |
| **[dsh-nurse-record-check](https://github.com/PerryLink/dsh-nurse-record-check)** |  |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** |  |
| **[dsh-origin-rvc-check](https://github.com/PerryLink/dsh-origin-rvc-check)** |  |
| **[dsh-ota-review-check](https://github.com/PerryLink/dsh-ota-review-check)** |  |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** |  |
| **[dsh-paper-doc-adapter](https://github.com/PerryLink/dsh-paper-doc-adapter)** |  |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** |  |
| **[dsh-permit-report-check](https://github.com/PerryLink/dsh-permit-report-check)** |  |
| **[dsh-pipeline-check](https://github.com/PerryLink/dsh-pipeline-check)** |  |
| **[dsh-pleading-draft](https://github.com/PerryLink/dsh-pleading-draft)** |  |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** |  |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** |  |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** |  |
| **[dsh-policy-brief-draft](https://github.com/PerryLink/dsh-policy-brief-draft)** |  |
| **[dsh-power-loss-split](https://github.com/PerryLink/dsh-power-loss-split)** |  |
| **[dsh-power-ticket-check](https://github.com/PerryLink/dsh-power-ticket-check)** |  |
| **[dsh-ppap-check](https://github.com/PerryLink/dsh-ppap-check)** |  |
| **[dsh-protest-deadline](https://github.com/PerryLink/dsh-protest-deadline)** |  |
| **[dsh-railway-window](https://github.com/PerryLink/dsh-railway-window)** |  |
| **[dsh-repair-order-qc](https://github.com/PerryLink/dsh-repair-order-qc)** |  |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** |  |
| **[dsh-review-reply-check](https://github.com/PerryLink/dsh-review-reply-check)** |  |
| **[dsh-rulefile-check](https://github.com/PerryLink/dsh-rulefile-check)** |  |
| **[dsh-safety-brief-check](https://github.com/PerryLink/dsh-safety-brief-check)** |  |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** |  |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** |  |
| **[dsh-site-log-check](https://github.com/PerryLink/dsh-site-log-check)** |  |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** |  |
| **[dsh-soe-decision-check](https://github.com/PerryLink/dsh-soe-decision-check)** |  |
| **[dsh-soilwater-check](https://github.com/PerryLink/dsh-soilwater-check)** |  |
| **[dsh-sop-sync-check](https://github.com/PerryLink/dsh-sop-sync-check)** |  |
| **[dsh-spc-gbt-adapter](https://github.com/PerryLink/dsh-spc-gbt-adapter)** |  |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** |  |
| **[dsh-tender-extract](https://github.com/PerryLink/dsh-tender-extract)** |  |
| **[dsh-tender-matrix](https://github.com/PerryLink/dsh-tender-matrix)** |  |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** |  |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** |  |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver o README do repositório |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver o README do repositório |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver o README do repositório |

</details>

## License

Apache-2.0 — ver [LICENSE](LICENSE).

### Instalar a partir do mercado do DSH Desktop

Todos os plugins PerryLink podem ser explorados no mercado integrado do DSH Desktop: **Market → Sources → add source → colar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ selecionar**. A instalação continua passando pela verificação de identidade npm do mercado e pela sua confirmação.
