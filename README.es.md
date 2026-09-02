<div align="center">

# ⚡ dsh-fast
- **Canal 1024 store**: `npm i -g dsh1024` una vez, luego `dsh1024 plugin --profile web add dsh-fast` (cuenta para el ranking de instalaciones de [deepseek1024.com](https://deepseek1024.com)).

**Diagnóstico de rendimiento de solo lectura para DeepSeek Harness.**

*Observa el flujo de eventos de sesión —nunca la ruta caliente del modelo— e informa de dónde se van la latencia y el presupuesto de contexto.*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/dsh-plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-fast/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-fast/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-fast?label=version)](https://github.com/PerryLink/dsh-fast/releases)
[![npm version](https://img.shields.io/npm/v/dsh-fast)](https://www.npmjs.com/package/dsh-fast)
[![npm downloads](https://img.shields.io/npm/dm/dsh-fast)](https://www.npmjs.com/package/dsh-fast)

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

</div>

---

## Compatibility

- DeepSeek Harness `0.1.1-rc.2` (peers fijados a `0.1.1-rc.2`).
0.1.2-alpha.5 (adaptado el 2026-09-02): el sobre de sesión conserva su campo ignorable solo para compatibilidad de lectura de logs almacenados - Session.append aún no puede estamparlo, por lo que el comportamiento de la puerta no cambia.
- Node `^22.19.0 || >=24.0.0`, solo ESM (`"type": "module"`).
- Peers: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/schemastery ^3.18.0`, y `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-compaction`, `@deepseek-ai/dsh-storage-domain` en `0.1.1-rc.2`.

## What you get

- **Tiempo de carga de sesión** — latencia publicación→primera petición, clasificada `open` (nueva) o `restore` (con semilla/reanudada), más el número de eventos semilla.
- **Recuento de spill** — cuántos resultados de herramienta se volcaron a un artefacto de sesión (detectado por el aviso persistente de spill).
- **Recuento y motivo de compaction** — total, separado `manual` (comando) vs `automatic` (presión), y tokens sombreados totales.
- **Volumen de contexto inyectado** — tokens de system-prompt (AGENTS.md + skills + persona), schema de herramientas y superficie, con sus porcentajes.
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
- **El system prompt es un solo cajón** — AGENTS.md, skills y persona forman el system prompt ensamblado; no hay contabilidad por sección.
- **El tiempo de carga empieza en la publicación** — la lectura de disco de una restauración ocurre antes de `session/created`; la duración reportada es publicación→primera petición.

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

Este proyecto es uno de los [33 complementos de DeepSeek Harness](https://github.com/PerryLink) mantenidos por [PerryLink](https://github.com/PerryLink). Si este te ayuda, probablemente los demás también:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | Auto-revisión de segundo modelo en la cadena de aprobación, con cierre en fallo por defecto | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | Agentes hijos en segundo plano durables con barra lateral de UI web, mensajería e interrupción | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | Gobernanza de costes para DeepSeek Harness: presupuestos, carbono y latencia en un panel. | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Equivalente a /rewind de Claude Code: instantáneas, bifurcaciones de sesión, restauración de un solo uso | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Migra sesiones, memoria, habilidades y CLAUDE.md de Claude Code a DSH | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | Control de escritorio nativo multiplataforma para DeepSeek Harness — Windows primero. | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | Historial de entrada estilo terminal para el compositor web: flechas, búsqueda Ctrl+R | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | Comprobaciones de calidad de datasets y verificación de citas (el puente numérico opcional consumido aquí) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | Defensa contra inyección de prompts, jailbreak y fuga de secretos para DeepSeek Harness. | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | Guardián de disciplina de ingeniería: interrogatorio de requisitos, puertas de pruebas, revisión adversaria | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | Enrutamiento unificado de generación de imágenes estáticas para DeepSeek Harness. | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | Informes de investigación deterministas para fondos mutuos públicos chinos | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | Integración de PR/issues de GitHub para DSH, cada escritura controlada por aprobación | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | Orquestación de investigación sectorial que sella sus entregables mediante el `ctx.researchReport.assemble` de este plugin | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | Base de conocimiento documental local para DeepSeek Harness. | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | Integración de modelos locales (Ollama) para DeepSeek Harness. | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | Diagnósticos, formato, autocompletado, acciones de código y renombrado LSP sobre servidores de lenguaje | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | Middleware de enmascaramiento de PII: anonimiza en el límite del modelo, restaura en la capa de visualización | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | Panel de tiempo de ejecución MCP de solo lectura: comando /mcp + pestaña Settings con estado, herramientas y errores | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | Memoria entre sesiones controlada por aprobación: costura ctx.memory + SQLite + herramienta de memoria | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | Exportador de observabilidad OpenTelemetry y Langfuse para DeepSeek Harness. | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Cambio de estilo en tiempo de ejecución equivalente a outputStyles de Claude Code | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | Reglas de permisos declarativas allow/deny/ask estilo Claude Code con auditoría | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | Base de conocimiento de desarrollo de plugins como habilidad de agente bajo demanda | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | Motor de informes de investigación verificables con evidencia direccionada por contenido | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | Puntuación de calidad multidimensional para plugins de DeepSeek Harness. | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | Fija sesiones en la barra lateral web con orden durable | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | Sincronización de sesiones entre dispositivos para DeepSeek Harness — un espejo git dedicado de tu almacén de sesiones. | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | Paquete de habilidades de auditoría de seguridad: escaneo de secretos, revisión de dependencias y cadena de suministro | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | Bucle de sesión con voz para DeepSeek Harness: háblale y escucha su respuesta. | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | Pruebas de instalación y humo aisladas para plugins de DeepSeek Harness. | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | Traducción de parámetros entre proveedores y reparación determinista de JSON para DeepSeek Harness. | |

## License

Apache-2.0 — ver [LICENSE](LICENSE).
