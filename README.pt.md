<div align="center">

# ⚡ dsh-fast
- **Canal 1024 store**: `npm i -g dsh1024` uma vez, depois `dsh1024 plugin --profile web add dsh-fast` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com)).

**Diagnóstico de desempenho somente leitura para DeepSeek Harness.**

*Observa o fluxo de eventos da sessão — nunca o caminho quente do modelo — e informa para onde vão a latência e o orçamento de contexto.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-fast/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-fast/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-fast?label=version)](https://github.com/PerryLink/dsh-fast/releases)
[![npm version](https://img.shields.io/npm/v/dsh-fast)](https://www.npmjs.com/package/dsh-fast)
[![npm downloads](https://img.shields.io/npm/dm/dsh-fast)](https://www.npmjs.com/package/dsh-fast)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

- DeepSeek Harness `dsh-v0.1.3-alpha.1` (peers fixados em `0.1.2-rc.1`).
0.1.2-rc.1 (adaptado em 2026-09-02): o envelope de sessão mantém seu campo ignorable apenas para compatibilidade de leitura de logs armazenados - o Session.append ainda não consegue estampá-lo, então o comportamento da porta não muda. Verificado em 2026-09-06 contra o checkout master do dsh-v0.1.3-alpha.1 (cadeia completa de portas + smoke de instalação de profile).
- Node `^22.19.0 || >=24.0.0`, somente ESM (`"type": "module"`).
- Peers: `@deepseek-ai/cordis ^4.0.2`, `@deepseek-ai/schemastery ^3.18.2`, e `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-compaction`, `@deepseek-ai/dsh-storage-domain` em `>=0.1.2-rc.1 <0.2.0`.

## What you get

- **Tempo de carga da sessão** — latência publicação→primeira requisição, classificada `open` (nova) ou `restore` (com semente/retomada), mais a contagem de eventos de semente.
- **Contagem de spill** — quantos resultados de ferramenta foram descarregados em um artefato de sessão (detectado pelo aviso persistente de spill).
- **Contagem e motivo de compaction** — total, separado `manual` (comando) vs `automatic` (pressão), e total de tokens sombreados.
- **Volume de contexto injetado** — tokens de system-prompt (AGENTS.md + skills + persona), schema de ferramentas e superfície, com suas proporções.
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
- **O system prompt é um único balde** — AGENTS.md, skills e persona formam o system prompt montado; não há contagem por seção.
- **O tempo de carga começa na publicação** — a leitura de disco de uma restauração ocorre antes de `session/created`; a duração reportada é publicação→primeira requisição.

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

Este projeto é um dos [37 plugins de DeepSeek Harness](https://github.com/PerryLink) mantidos por [PerryLink](https://github.com/PerryLink). Se este ajuda você, os outros provavelmente também:

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | Auto-revisão de segundo modelo na cadeia de aprovação, com falha fechada por padrão | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | Agentes filhos em segundo plano duráveis com barra lateral de UI web, mensagens e interrupção | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | Governança de custos para DeepSeek Harness: orçamentos, carbono e latência em um painel. | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Equivalente ao /rewind do Claude Code: instantâneos, bifurcações de sessão, restauração de uso único | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | Migre sessões, memória, habilidades e CLAUDE.md do Claude Code para o DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | Controle de desktop nativo multiplataforma para DeepSeek Harness — Windows primeiro. | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Histórico de entrada estilo terminal para o compositor web: setas, busca Ctrl+R | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | Verificações de qualidade de datasets e verificação de citações (a ponte numérica opcional consumida aqui) | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | Defesa contra injeção de prompt, jailbreak e vazamento de segredos para DeepSeek Harness. | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | Guardião de disciplina de engenharia: sabatina de requisitos, portões de teste, revisão adversária | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | Roteamento unificado de geração de imagens estáticas para DeepSeek Harness. | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | Relatórios de pesquisa deterministas para fundos mútuos públicos chineses | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | Integração de PR/issues do GitHub para o DSH, cada escrita controlada por aprovação | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | Orquestração de pesquisa setorial que sela as suas entregas através do `ctx.researchReport.assemble` deste plugin | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | Base de conhecimento documental local para DeepSeek Harness. | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | Integração de modelos locais (Ollama) para DeepSeek Harness. | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | Diagnósticos, formatação, autocompletar, ações de código e renomeação LSP sobre servidores de linguagem | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | Middleware de mascaramento de PII: anonimiza no limite do modelo, restaura na camada de exibição | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | Painel de tempo de execução MCP somente leitura: comando /mcp + aba Settings com status, ferramentas e erros | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | Memória entre sessões controlada por aprovação: costura ctx.memory + SQLite + ferramenta de memória | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | Exportador de observabilidade OpenTelemetry e Langfuse para DeepSeek Harness. | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Troca de estilo em tempo de execução equivalente ao outputStyles do Claude Code | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | Ponte multicanal de aprovação/perguntas: WeChat/Telegram/Feishu, console de sessão |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Regras de permissão declarativas allow/deny/ask estilo Claude Code com auditoria | |
| **[dsh-personal-directive](https://github.com/PerryLink/dsh-personal-directive)** | Injetor de diretivas pessoais com alternância na barra superior (edição framework) |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | Base de conhecimento de desenvolvimento de plugins como habilidade de agente sob demanda | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | Motor de relatórios de pesquisa verificáveis com evidência endereçada por conteúdo | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | Pontuação de qualidade multidimensional para plugins de DeepSeek Harness. | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | Fixe sessões na barra lateral web com ordenação durável | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | Sincronização de sessões entre dispositivos para DeepSeek Harness — um espelho git dedicado do seu armazenamento de sessões. | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | Pacote de habilidades de auditoria de segurança: varredura de segredos, revisão de dependências e cadeia de suprimentos | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | Loop de sessão com voz para DeepSeek Harness: fale e ouça a resposta. | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | Test drives isolados de instalação e smoke para plugins de DeepSeek Harness. | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | Ponte de tarefas TickTick/Dida365: painel no cabeçalho da sessão + 11 ferramentas |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | Tradução de parâmetros entre fornecedores e reparo determinístico de JSON para DeepSeek Harness. | |
| **[dsh-wechat](https://github.com/PerryLink/dsh-wechat)** | Ponte WeChat ↔ DSH (bot Tencent iLink): texto/imagem/arquivo/voz, aprovações no chat |

## License

Apache-2.0 — ver [LICENSE](LICENSE).

### Instalar a partir do mercado do DSH Desktop

Todos os plugins PerryLink podem ser explorados no mercado integrado do DSH Desktop: **Market → Sources → add source → colar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ selecionar**. A instalação continua passando pela verificação de identidade npm do mercado e pela sua confirmação.
