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
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-fast?metric=downloads&lang=es)](https://dshfind.com/es/plugins/PerryLink/dsh-fast?ref=badge)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

```sh
dsh plugin --profile <name> add dsh-fast
```


</div>

---


**📖 Base de conocimiento del ecosistema** — datos medidos, no marketing: [guía de desarrollo · datos de selección · criterios de mantenimiento](https://perrylink.github.io/dsh-plugin-guide/).

<!-- star-cta -->
## Install & uninstall

```sh
dsh plugin --profile demo add dsh-fast       # instalar
dsh plugin --profile demo remove dsh-fast    # desinstalar
```

Verifica el montaje: `dsh --profile demo --dump-config | grep dsh-fast`.

## ⭐ 如果它帮到了你

Este plugin forma parte de la [familia de plugins DSH](https://github.com/PerryLink) (más de 40, todos Apache-2.0). Si te resulta útil, **dale una estrella**: no desbloquea nada, pero ayuda a que la siguiente persona lo encuentre antes.

*English:* part of a 95 plugin family for DeepSeek Harness. If it is useful, **a star helps the next person find it** — nothing is gated behind it.

## What is dsh-fast?

Diagnóstico de rendimiento de solo lectura para DeepSeek Harness.

Observa el flujo de eventos de sesión —nunca la ruta caliente del modelo— e informa de dónde se van la latencia y el presupuesto de contexto.

![Diagrama de flujo de dsh-fast: solicitud → política/revisión → veredicto.](docs/assets/dsh-fast-flow.svg)

*Resumen del flujo: solicitud → política/revisión → veredicto. Los ejemplos siguientes usan la superficie de comandos real.*


*La misma ejecución, animada.*

## Compatibility

- DeepSeek Harness `dsh-v0.2.1-alpha.1` (adaptado el 2026-09-18): la superficie de sesión se lee a través del servicio opcional `sessionQuery` — el accesor síncrono obsoleto `Session.eventAt(seq)` desaparece y queda una lectura síncrona equivalente como respaldo — y todos los registros viven ahora en un único efecto de ciclo de vida que los libera en orden inverso. Cambio interno: las métricas son idénticas para el mismo log. Verificado el 2026-10-04 con la cadena de puertas local (tres typecheck + 71 pruebas); el workflow compat repite el smoke de instalación de profile con los pines publicados.
- Node `^22.19.0 || >=24.0.0`, solo ESM (`"type": "module"`).
- Peers: `@deepseek-ai/cordis ^4.0.2`, `@deepseek-ai/schemastery ^3.18.4`, y `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-compaction`, `@deepseek-ai/dsh-session-query`, `@deepseek-ai/dsh-storage-domain` en `>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0 || >=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0 || >=0.2.0-0 <0.3.0 || >=0.2.1-0 <0.3.0` (devDependencies fijan `0.2.0-rc.2`); la línea `0.1.2-rc.1` sigue soportada en ejecución mediante un fallback estructural al `header.system` anterior a 0.1.5.

## What you get

- **Tiempo de carga de sesión** — latencia publicación→primera petición, clasificada `open` (nueva) o `restore` (con semilla/reanudada), más el número de eventos semilla.
- **Recuento de spill** — cuántos resultados de herramienta se volcaron a un artefacto de sesión (detectado por el aviso persistente de spill).
- **Recuento y motivo de compaction** — total, separado `manual` (comando) vs `automatic` (presión), y tokens sombreados totales.
- **Volumen de contexto inyectado** — tokens de system-prompt (AGENTS.md + skills + persona), schema de herramientas y superficie, con sus porcentajes; la superficie es solo historial de conversación (en `0.1.5-alpha.1` la superficie del meter incluye el nodo de sistema, que dsh-fast descuenta).
- **Tasa de aciertos de caché LLM** — tokens input / cache-read / cache-write / output agregados y la tasa derivada.
- **Sugerencias de optimización** — basadas en umbrales (recortar skills, ajustar schemas, compactar antes, activar caché de prompts, activar spill-policy…).
- **Muestreo asíncrono** — plegado O(1) por evento; el muestreo corre en un temporizador, nunca en la ruta de append.

## Quick start

```sh
dsh plugin --profile web add github:PerryLink/dsh-fast
```

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

## `/fast` namespace collision

`/fast` es un comando del host. Si otro plugin registra una contribución **client**
`commandUi` con el mismo nombre `fast`, el menú de comandos puede perder toda la
fuente `/`. La colisión está en el espacio de nombres client del host; este plugin
no puede renombrarla en tiempo de ejecución. Solución: desactiva/renombra el
comando client `fast` del otro plugin, o elimina uno de los plugins. `/fast` y
`fast_report` siguen funcionando si no hay una contribución client duplicada.

### Ejemplos

Son los puntos de entrada reales; instala y llama a uno.

#### Ejemplo detallado

**Comando**

~~~sh
/fast
~~~

**Salida**

~~~text
dsh-fast 0.1.0 — performance report
session: abc

## Session load
kind: open
seed events: 0
time to first request: 150 ms

## Spill
detected spilled results: 0 (heuristic)

## Compaction
count: 0 (manual: 0, automatic: 0)
shadowed tokens: 0

## Context volume
total: 1000 tokens
system (AGENTS.md/skills/persona): 400 (40%)
tool schema: 200 (20%)
surface: 400 (40%)

## System prompt breakdown
persona: 100 tokens / 400 chars (25%)
skills: 0 tokens / 0 chars (0%)
AGENTS.md: 0 tokens / 0 chars (0%)
other (harness identity + tool guidance): 300 tokens / 1200 chars (75%)

## LLM cache
input: 800, cache read: 200, cache write: 50, output: 100
hit rate: 20%

## Suggestions
- none
~~~

*Observado en `plugins/dsh-fast/src/analyze.ts:88-131; baseline fixture at test/analyze.spec.ts:12-35, 82-100`*

#### Ejemplos breves

- `fast_report`

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

Gracias a todas las personas que han contribuido a `dsh-fast`:

- **[PerryLink](https://github.com/PerryLink)** — autor y mantenedor: diseñó y construyó los diagnósticos de solo lectura (latencia de carga de sesión, recuentos de spill, métricas de compactación, volumen de inyección de contexto, tasa de aciertos de la caché LLM), el comando `/fast` y la herramienta `fast_report`, el dominio de almacenamiento `dsh_fast` y la documentación en cinco idiomas.

## PerryLink DSH Plugin Family

Este proyecto forma parte de la familia de plugins de DeepSeek Harness de [PerryLink](https://github.com/PerryLink). El registro permanece plegado abajo para que cada README conserve una primera pantalla corta; expándelo para ver cada fila y su estado.

<details>
<summary>Expandir todos los plugins</summary>

| Plugin | Estado |
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
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 CONGELADO — ver el README del repositorio |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 RETIRADO — ver el README del repositorio |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 RETIRADO — ver el README del repositorio |

</details>

## License

Apache-2.0 — ver [LICENSE](LICENSE).

### Instalar desde el mercado de DSH Desktop

Todos los plugins de PerryLink pueden explorarse en el mercado integrado de DSH Desktop: **Market → Sources → add source → pegar** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ seleccionarlo**. La instalación sigue pasando por la verificación de identidad npm del mercado y tu confirmación.
