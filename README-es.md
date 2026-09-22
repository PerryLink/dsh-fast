<div align="center">

# ⚡ dsh-fast
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-fast` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Diagnóstico de rendimiento de solo lectura para DeepSeek Harness.**

*Observa el flujo de eventos de sesión —nunca la ruta caliente del modelo— e informa de dónde se van la latencia y el presupuesto de contexto.*

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

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## Compatibility

- DeepSeek Harness `dsh-v0.1.7-alpha.1` (adaptado el 2026-09-18): la superficie de sesión se lee a través del servicio opcional `sessionQuery` — el accesor síncrono obsoleto `Session.eventAt(seq)` desaparece y queda una lectura síncrona equivalente como respaldo — y todos los registros viven ahora en un único efecto de ciclo de vida que los libera en orden inverso. Cambio interno: las métricas son idénticas para el mismo log. Verificado el 2026-09-18 con la cadena de puertas local (doble typecheck + 70 pruebas); el workflow compat repite el smoke de instalación de profile con los pines publicados.
- Node `^22.19.0 || >=24.0.0`, solo ESM (`"type": "module"`).
- Peers: `@deepseek-ai/cordis ^4.0.2`, `@deepseek-ai/schemastery ^3.18.2`, y `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-compaction`, `@deepseek-ai/dsh-session-query`, `@deepseek-ai/dsh-storage-domain` en `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0 || >=0.1.6-0 <0.2.0` (devDependencies fijan `0.1.5-rc.2`); la línea `0.1.2-rc.1` sigue soportada en ejecución mediante un fallback estructural al `header.system` anterior a 0.1.5.

## What you get

- **Tiempo de carga de sesión** — latencia publicación→primera petición, clasificada `open` (nueva) o `restore` (con semilla/reanudada), más el número de eventos semilla.
- **Recuento de spill** — cuántos resultados de herramienta se volcaron a un artefacto de sesión (detectado por el aviso persistente de spill).
- **Recuento y motivo de compaction** — total, separado `manual` (comando) vs `automatic` (presión), y tokens sombreados totales.
- **Volumen de contexto inyectado** — tokens de system-prompt (AGENTS.md + skills + persona), schema de herramientas y superficie, con sus porcentajes; la superficie es solo historial de conversación (en `0.1.5-alpha.1` la superficie del meter incluye el nodo de sistema, que dsh-fast descuenta).
- **Tasa de aciertos de caché LLM** — tokens input / cache-read / cache-write / output agregados y la tasa derivada.
- **Sugerencias de optimización** — basadas en umbrales (recortar skills, ajustar schemas, compactar antes, activar caché de prompts, activar spill-policy…).
- **Muestreo asíncrono** — plegado O(1) por evento; el muestreo corre en un temporizador, nunca en la ruta de append.

## Quick start

### git channel

```sh
# Desde un profile temporal (fija el commit; ejecuta el build `prepare` autocontenido)
dsh plugin --profile demo add "github:YOUR_ORG/dsh-fast#<sha>"
# El pnpm-workspace.yaml del profile gana una entrada allowBuilds para dsh-fast en el primer add.
```

### npm channel

```sh
dsh plugin --profile demo add dsh-fast
```

Ambos canales instalan la fila del bundle (ver `cordis.patch.yml`) en la pila `dsh.profile.bundles` y surten efecto al reiniciar.

## Install & uninstall

```sh
dsh plugin --profile demo add dsh-fast       # instalar
dsh plugin --profile demo remove dsh-fast    # desinstalar
```

Verifica el montaje: `dsh --profile demo --dump-config | grep dsh-fast`.

## Configuration

Todos los ajustes son campos Schemastery `Config`; valores inválidos fallan la carga del profile de forma audible.

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Interruptor maestro; `false` no monta nada. |
| `privacy.includeCwd` | `false` | Incluir el directorio de trabajo saneado en los informes. |
| `sampling.snapshotIntervalMs` | `60000` | Cada cuánto se muestrean las sesiones activas (ms). |
| `sampling.maxHistorySamples` | `20` | Muestras retenidas por sesión en el historial durable. |
| `thresholds.systemPromptTokens` | `20000` | Avisar si el system prompt supera estos tokens. |
| `thresholds.toolSchemaTokens` | `8000` | Avisar si el schema de herramientas supera estos tokens. |
| `thresholds.surfaceTokens` | `60000` | Avisar si la superficie supera estos tokens. |
| `thresholds.cacheHitRateFloor` | `0.1` | Avisar si la tasa de caché cae por debajo (0..1). |
| `thresholds.compactionCountWarn` | `10` | Avisar tras tantas compactions. |
| `thresholds.compactionShadowTokens` | `40000` | Avisar si el promedio de tokens sombreados por summary supera esto. |
| `spill.detectSpilledResults` | `true` | Detectar resultados volcados por el marcador de aviso persistente. |

## Tools & surfaces

- **`/fast`** — comando humano que imprime el informe de salud de la sesión: carga, spill, compaction, ranking de volumen de contexto, tasa de caché y sugerencias.
- **`fast_report`** — herramienta de modelo que devuelve el mismo informe como JSON estructurado (para que el modelo razone), con render de texto legible.

## Permissions & data

`dsh-fast` consume solo seams públicos: eventos `session/*` y `agent/*`, el opcional `ctx.tokenMeter`, `ctx.storageDomain`, `ctx.commands` y `ctx.tools`. Es estrictamente de solo lectura sobre el log de sesión — nunca muta la petición del modelo, los resultados de herramientas ni la superficie. Las métricas se persisten en el dominio `dsh_fast` (una historia acotada por sesión), no en el log. La identidad del informe y el directorio opcional se sanean antes de mostrarse o escribirse.

## Security boundaries

- **Solo lectura, cero sobrecarga en la ruta del modelo** — plegado O(1) por evento; muestreo por temporizador.
- **Sin red, sin manejo de credenciales** — no hay peticiones salientes ni almacenamiento sensible.
- **Configuración que falla audible** — cada ajuste se valida al montar; límites inválidos lanzan error.
- **Datos de pantalla/duraderos saneados** — se eliminan caracteres de control y se acotan longitudes; `cwd` está desactivado por defecto.
- **Registros reversibles** — todo pasa por `ctx.effect()` / `ctx.on()` / `register()`.

## Known limitations

- **Dominio de almacenamiento, no eventos de sesión** — el `Session.append` de rc.2 no ofrece marcador `ignorable` ni superficie de registro de eventos externa; un evento `fast/*` haría que el coordinador de persistencia rechace el log al restaurar. Las métricas van al dominio de almacenamiento; los eventos crudos siguen siendo la fuente reconstruible.
- **La detección de spill es heurística** — lee el aviso persistente (`Full … stored at:`); no hay evento de sesión dedicado.
- **El system prompt es un solo cajón** — AGENTS.md, skills y persona forman el system prompt ensamblado; desde `0.1.5-alpha.1` es el nodo 0 de la superficie (un `system/message`) y no trae contabilidad por sección, así que se reportan juntos.
- **El tiempo de carga empieza en la publicación** — la lectura de disco de una restauración ocurre antes de `session/created`; la duración reportada es publicación→primera petición.
- **Las degradaciones se anuncian una vez** — un host sin `tokenMeter` cae al precio heurístico de tokens, un host sin `systemPrompt` atribuye todo el prompt a un solo cajón, y una salida `inspector` que falla se ignora; cada caso lo dice ahora una vez por proceso en lugar de cambiar el significado de las cifras en silencio.

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

Gracias a todas las personas que han contribuido a `dsh-fast`:

- **[PerryLink](https://github.com/PerryLink)** — autor y mantenedor: diseñó y construyó los diagnósticos de solo lectura (latencia de carga de sesión, recuentos de spill, métricas de compactación, volumen de inyección de contexto, tasa de aciertos de la caché LLM), el comando `/fast` y la herramienta `fast_report`, el dominio de almacenamiento `dsh_fast` y la documentación en cinco idiomas.

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

### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.
