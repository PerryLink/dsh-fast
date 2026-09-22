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

</div>

---

## Compatibility

- DeepSeek Harness `dsh-v0.1.7-alpha.1` (adaptado em 2026-09-18): a superfície da sessão é lida pelo serviço opcional `sessionQuery` — o acessor síncrono obsoleto `Session.eventAt(seq)` sai de cena, com uma leitura síncrona equivalente como fallback — e todos os registros agora vivem em um único efeito de ciclo de vida que os libera em ordem inversa. Mudança interna: as métricas são idênticas para o mesmo log. Verificado em 2026-09-18 com a cadeia de portas local (typecheck duplo + 70 testes); o workflow compat repete o smoke de instalação de profile com os pins publicados.
- Node `^22.19.0 || >=24.0.0`, somente ESM (`"type": "module"`).
- Peers: `@deepseek-ai/cordis ^4.0.2`, `@deepseek-ai/schemastery ^3.18.2`, e `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-compaction`, `@deepseek-ai/dsh-session-query`, `@deepseek-ai/dsh-storage-domain` em `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0 || >=0.1.6-0 <0.2.0` (devDependencies fixam `0.1.5-rc.2`); a linha `0.1.2-rc.1` continua suportada em execução por um fallback estrutural ao `header.system` anterior ao 0.1.5.

## What you get

- **Tempo de carga da sessão** — latência publicação→primeira requisição, classificada `open` (nova) ou `restore` (com semente/retomada), mais a contagem de eventos de semente.
- **Contagem de spill** — quantos resultados de ferramenta foram descarregados em um artefato de sessão (detectado pelo aviso persistente de spill).
- **Contagem e motivo de compaction** — total, separado `manual` (comando) vs `automatic` (pressão), e total de tokens sombreados.
- **Volume de contexto injetado** — tokens de system-prompt (AGENTS.md + skills + persona), schema de ferramentas e superfície, com suas proporções; a superfície é apenas histórico de conversa (no `0.1.5-alpha.1` a superfície do meter inclui o nó de sistema, que o dsh-fast desconta).
- **Taxa de acertos do cache LLM** — tokens input / cache-read / cache-write / output agregados e a taxa derivada.
- **Sugestões de otimização** — baseadas em limiares (cortar skills, ajustar schemas, compactar antes, ativar cache de prompts, ativar spill-policy…).
- **Amostragem assíncrona** — dobra O(1) por evento; a amostragem roda em um timer, nunca no caminho de append.

## Quick start

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

## Install & uninstall

```sh
dsh plugin --profile demo add dsh-fast       # instalar
dsh plugin --profile demo remove dsh-fast    # desinstalar
```

Verifique a montagem: `dsh --profile demo --dump-config | grep dsh-fast`.

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
pnpm run typecheck && pnpm run typecheck:ci
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

This project is one of the **45 DeepSeek Harness plugins** maintained by [PerryLink](https://github.com/PerryLink). If this one helps you, the others likely will too:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Second-model auto-review on the approval chain, fail-closed by default | |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Durable background child agents with a Web UI sidebar, messaging and interrupt | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Cost governance for DeepSeek Harness: budgets, carbon, and latency in one panel. | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind-equivalent: snapshots, session forks, one-shot restore | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migrate Claude Code sessions, memory, skills and CLAUDE.md into DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Cross-platform native desktop control for DeepSeek Harness — Windows first. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Terminal-style input history for the web composer: arrows, Ctrl+R search | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Dataset quality checks and citation cross-checks (the optional numeric bridge consumed here) | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Prompt-injection, jailbreak, and secret-leak defense for DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Engineering-discipline guard: requirements grill, test gates, adversary review | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Unified static-image generation routing for DeepSeek Harness. | |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | Read-only performance diagnostics for DeepSeek Harness. | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Deterministic research reports for Chinese public mutual funds | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | GitHub PR/issues integration for DSH, every write gated by approval | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Industry research orchestration that seals its deliverables through this plugin's `ctx.researchReport.assemble` | |
| **[dsh-laya](https://github.com/PerryLink/dsh-laya)** | Laya typed decisions (`noul`/`choice`/`score`) as a first-class Cordis service and model-visible tools | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Local document knowledge base for DeepSeek Harness. | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Local-model (Ollama) integration for DeepSeek Harness. | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | LSP diagnostics, formatting, completion, code actions and rename over language servers | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII masking middleware: anonymize at the model boundary, restore at the display layer | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Read-only MCP runtime panel: /mcp command + Settings tab with status, tools and errors | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Approval-gated cross-session memory: ctx.memory seam + SQLite + memory tool | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | OpenTelemetry and Langfuse observability exporter for DeepSeek Harness. | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles-equivalent runtime style switching | |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code-style declarative allow/deny/ask permission rules with audit | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Plugin-development knowledge base as an on-demand agent skill | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | One-package, one-corridor-index plugin upgrade skill: routes a repository to the matching closed corridor card | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Multi-channel approval/question bridge: WeChat/Telegram/Feishu, session console | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Verifiable research-report engine: content-addressed evidence ledger and sealed versions | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Multi-dimensional quality scoring for DeepSeek Harness plugins. | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Pin sessions in the Web sidebar with durable ordering | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Cross-device session sync for DeepSeek Harness — a dedicated git mirror of your session store. | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Security-audit skill pack: secret scan, dependency and supply-chain review | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Voice-first session loop for DeepSeek Harness: talk to it, hear it answer. | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Isolated install-and-smoke test drives for DeepSeek Harness plugins. | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/Dida365 task bridge: session-header panel + 11 tools | |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Vendor parameter translation and deterministic JSON repair for DeepSeek Harness. | |


## License

Apache-2.0 — ver [LICENSE](LICENSE).

### Instalar a partir do mercado do DSH Desktop

Todos os plugins PerryLink podem ser explorados no mercado integrado do DSH Desktop: **Market → Sources → add source → colar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ selecionar**. A instalação continua passando pela verificação de identidade npm do mercado e pela sua confirmação.
