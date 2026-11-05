<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-fast-flow-dark.svg">
  <img src="docs/assets/dsh-fast-flow-light.svg" width="100%" alt="dsh-fast 数据流：session/event → collector O(1) 折叠 → snapshot() 定时采样 → /fast 与 fast_report；快照写入 dsh_fast 存储域">
</picture>

# dsh-fast

**三分钟看清一次会话慢在哪——延迟、上下文预算与缓存命中率，一屏读完。**

面向 DeepSeek Harness 的只读性能诊断插件：只观察会话事件流，不碰模型热路径，把会话加载、spill、compaction、上下文注入与 LLM 缓存的开销拆开给你看。

[安装](#三步上手) · [配置](#配置) · [FAQ](#faq) · [简体中文](README.md) · [English](README.en.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

[![License](https://img.shields.io/badge/license-Apache--2.0-3366CC?style=flat-square&labelColor=2B3245)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%E2%89%A50.1.2%20%3C0.3.0-4B67B4?style=flat-square&labelColor=2B3245)](#兼容性)
[![npm](https://img.shields.io/npm/v/dsh-fast?style=flat-square&labelColor=2B3245&color=CB3837)](https://www.npmjs.com/package/dsh-fast)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-fast/ci.yml?branch=main&label=CI&style=flat-square&labelColor=2B3245)](https://github.com/PerryLink/dsh-fast/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933?style=flat-square&labelColor=2B3245)](#兼容性)

[![Stars](https://img.shields.io/github/stars/PerryLink/dsh-fast?style=flat-square&labelColor=2B3245)](https://github.com/PerryLink/dsh-fast/stargazers)
[![npm downloads](https://img.shields.io/npm/dm/dsh-fast?style=flat-square&labelColor=2B3245&color=CB3837)](https://www.npmjs.com/package/dsh-fast)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-fast?metric=downloads)](https://dshfind.com/plugins/PerryLink/dsh-fast?ref=badge)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/PerryLink/dsh-fast/badge)](https://securityscorecards.dev/viewer/?uri=github.com/PerryLink/dsh-fast)
[![DSH Market](https://img.shields.io/badge/DSH_Market-listed-4B67B4?style=flat-square&labelColor=2B3245)](https://dsh.market/)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-C71D23?style=flat-square&labelColor=2B3245&logo=gitee)](https://gitee.com/perrylink/dsh-fast)

```sh
dsh plugin --profile <name> add dsh-fast
```

</div>

<sub>社区插件，与 DeepSeek 官方无关。唯一仓库：<https://github.com/PerryLink/dsh-fast>（Gitee 为镜像）。</sub>

## 它是什么

`dsh-fast` 是给 DeepSeek Harness 会话做的一次体检：一条 `/fast` 就能看到这次会话的加载耗时、有多少工具结果被 spill、compaction 触发了几次、上下文预算被系统提示词 / 工具 schema / 对话历史各吃掉多少，以及 LLM 缓存命中率。它严格只读：监听 `session/created`、`session/event`、`session/disposed`，每个事件做 O(1) 折叠，快照在定时器上采样，绝不进入模型请求或工具结果的任何 waterfall。度量写入 `dsh_fast` 存储域（每会话一段有界历史），不写会话日志；报告里的会话标识与可选工作目录在展示前已脱敏。

## 三步上手

1. **安装**（两条通道）：

   ```sh
   # git 通道（最新 main；钉版本用 #v0.2.28）
   dsh plugin --profile web add github:PerryLink/dsh-fast
   dsh plugin --profile web add github:PerryLink/dsh-fast#v0.2.28
   # npm 通道（已发布版本）
   dsh plugin --profile web add dsh-fast
   ```

   两条通道都会把 bundle 行（见 [`cordis.patch.yml`](cordis.patch.yml)）装进 profile 的 `dsh.profile.bundles` 栈，重启后生效。

2. **最小配置**（默认即可用；要改阈值就在 profile patch 的 `dsh-fast` 行里覆盖）：

   ```yaml
   - insert:
       - id: dsh-fast
         name: dsh-fast
         config:
           enabled: true
           thresholds:
             surfaceTokens: 60000
   ```

   所有键的默认值与含义见 [`cordis.patch.yml`](cordis.patch.yml) 内联注释与下方配置表。

3. **验证已生效**：

   ```sh
   dsh --profile demo --dump-config | grep -A2 'id: dsh-fast'
   ```

   重启后在任意会话里执行 `/fast`，首行出现 `performance report` 即已挂载。

**卸载**：`dsh plugin --profile demo remove dsh-fast`（或从 profile patch 删掉该行）。

<details>
<summary>从 DSH Desktop 市场安装</summary>

所有 PerryLink 插件均可在 DSH Desktop 内置市场中浏览：**市场 → 来源 → 添加来源 → 粘贴** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ 选中**。安装仍需通过市场的 npm 身份校验与你的确认。

</details>

## 核心能力

`dsh-fast` 把「这次会话到底慢在哪」拆成可读的数字：

- **会话加载耗时** —— 发布到首次请求的延迟，按 `open`（全新）/`restore`（带 seed/恢复）分类，并给出恢复时的 seed 事件数。
- **spill 命中统计** —— 有多少工具结果被溢出到会话级工件（从持久化的 spill 提示标记检测）。
- **compaction 次数与触发原因** —— 总次数，按 `manual`（斜杠命令）/`automatic`（压力）区分，以及总 shadow token 数。
- **上下文注入体量** —— 系统提示词（AGENTS.md + 技能 + 人设）、工具 schema、会话表面的 token 数及其占比；其中“会话表面”只含对话历史（`0.1.5-alpha.1` 的 meter surface 含系统节点，dsh-fast 已扣除）。
- **LLM 缓存命中率** —— 由 provider usage 聚合的 input / cache-read / cache-write / output token 与命中率。
- **优化建议** —— 阈值驱动的建议（精简技能、收紧工具 schema、更早压缩、启用提示词缓存、启用 spill-policy 等）。
- **历史回看** —— `/fast --history [n]` 打印该会话在 `dsh_fast` 域里的最近 n 个采样（默认 10），看趋势而不是单点。
- **异步采样** —— 每个事件 O(1) 折叠，定时器采样，绝不在追加路径上执行。

### 命令与工具面

| 表面 | 输出形态 | 说明 |
|---|---|---|
| `/fast` | 文本报告 | 打印当前会话的健康报告：加载耗时、spill、compaction、上下文体量排名、缓存命中率与建议 |
| `/fast --history [n]` | 文本历史 | 打印 `dsh_fast` 域中的持久化采样历史（每会话由采样定时器写入） |
| `fast_report` | 结构化 JSON | 返回同一份报告（供模型推理），并带人类可读的文本渲染 |

### 示例

以下为插件真实入口；安装后调用一个即可。

**详细示例** — 命令 `/fast`：

```sh
/fast
```

输出：

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

*Observed from `plugins/dsh-fast/src/analyze.ts:88-131; baseline fixture at test/analyze.spec.ts:12-35, 82-100`*

**失败分支** — 输入 `/fast --history nope`，输出：

~~~text
Usage: /fast [--history [n]]
~~~

*Observed from `plugins/dsh-fast/src/index.ts:241-245`*

**简短示例**：`fast_report`

## 配置

所有可调参数都是 Schemastery `Config` 字段；非法值会在 profile 加载时响亮失败（正整数边界与 `0..1` 比例都校验）。[`cordis.patch.yml`](cordis.patch.yml) 逐键内联注释。

最常用键：

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `true` | 主开关；`false` 则什么都不挂载。 |
| `privacy.includeCwd` | `false` | 是否在报告中包含脱敏后的会话工作目录。 |
| `sampling.snapshotIntervalMs` | `60000` | 活跃会话的采样间隔（毫秒）。 |
| `sampling.maxHistorySamples` | `20` | 每个会话在持久化历史中保留的样本数。 |
| `thresholds.systemPromptTokens` | `20000` | 系统提示词超过该 token 数时告警。 |
| `thresholds.surfaceTokens` | `60000` | 会话表面超过该 token 数时告警。 |
| `spill.detectSpilledResults` | `true` | 从持久化提示标记检测被溢出的工具结果。 |

<details>
<summary>完整配置表（11 个键）</summary>

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `true` | 主开关；`false` 则什么都不挂载。 |
| `privacy.includeCwd` | `false` | 是否在报告中包含脱敏后的会话工作目录。 |
| `sampling.snapshotIntervalMs` | `60000` | 活跃会话的采样间隔（毫秒）。 |
| `sampling.maxHistorySamples` | `20` | 每个会话在持久化历史中保留的样本数。 |
| `thresholds.systemPromptTokens` | `20000` | 系统提示词超过该 token 数时告警。 |
| `thresholds.toolSchemaTokens` | `8000` | 工具 schema 超过该 token 数时告警。 |
| `thresholds.surfaceTokens` | `60000` | 会话表面超过该 token 数时告警。 |
| `thresholds.cacheHitRateFloor` | `0.1` | 缓存命中率低于该值（0..1）时告警。 |
| `thresholds.compactionCountWarn` | `10` | 触发这么多 compaction 后告警。 |
| `thresholds.compactionShadowTokens` | `40000` | 每次 summary 平均 shadow token 超过该值时告警。 |
| `spill.detectSpilledResults` | `true` | 从持久化提示标记检测被溢出的工具结果。 |

</details>

profile patch 覆盖示例：

```yaml
- insert:
    - id: dsh-fast
      name: dsh-fast
      config:
        thresholds:
          cacheHitRateFloor: 0.2
        sampling:
          snapshotIntervalMs: 30000
```

## FAQ

<details>
<summary>会不会拖慢模型？开销有多大？</summary>

不会。折叠挂在 `session/event` 上，每个事件 O(1)；快照在 `snapshotIntervalMs`（默认 60 秒）的定时器上生成，绝不在 append 路径或模型请求路径上执行；`/fast` 与 `fast_report` 只在被调用时组装报告。它不注册任何 waterfall 监听器，也不改模型请求、工具结果或会话表面。

</details>

<details>
<summary>指标存在哪？会不会写进会话日志、带出敏感信息？</summary>

快照写入 `dsh_fast` 存储域（每会话一段有界历史，`maxHistorySamples` 默认 20），**不写会话日志**；原始会话事件仍是可重建的事实来源。报告里的 `sessionId` 会脱敏；`cwd` 默认不出现，`privacy.includeCwd: true` 时也只输出截断后的路径；控制字符在展示与持久化前都会被剥离。插件不发网络请求、不处理凭据。

</details>

<details>
<summary>宿主缺少可选服务时会怎样？会静默改变数字含义吗？</summary>

不会静默。没有 `tokenMeter` 时退回启发式 token 计价，没有 `systemPrompt` 时整段系统提示词归入一个桶，`inspector` 出口失败则忽略——这三种降级各在每进程播报一次。`sessionQuery` 不可用时退回等价的同步读取；读取失败会告警并走回退路径。

</details>

<details>
<summary>为什么用存储域而不是 `fast/*` 会话事件？</summary>

rc.2 的 `Session.append` 没有 `ignorable` 标记能力，也没有外部事件注册面；写自定义 `fast/*` 会话事件会让持久化协调器在恢复时拒绝日志。所以度量放存储域，原始会话事件仍是可重建的事实来源（见「已知限制」）。

</details>

<details>
<summary>会和其他插件抢命令名或事件吗？</summary>

只有一种已知冲突：另一个插件注册了同名 `fast` 的 **client** `commandUi` 贡献时，宿主的斜杠命令菜单可能整组丢弃 `/` 来源。冲突在宿主 client 命名空间，本插件无法运行时改名；禁用/重命名对方的 `fast` client 命令，或移除其中一个插件即可。除此之外，它只注册一个命令、一个工具、三个只读 `session/*` 监听器与一块存储域，不提供 service、不注册 client slot、不注册 HTTP 路由。

</details>

## 安全边界

- **只读、零模型路径开销** —— 每个事件 O(1) 折叠，定时器采样。
- **无网络、无凭据处理** —— 插件不发任何出站请求，也不存储敏感信息。
- **配置响亮失败** —— 每个可调参数在挂载时校验；非法边界抛错。
- **展示/持久化数据脱敏** —— 剥离控制字符、限制字符串长度；`cwd` 默认关闭，开启时按路径截断。
- **注册可逆** —— 一切贡献都经 `ctx.effect()` / `ctx.on()` / `register()`，卸载与热重载干净。

## 权限与数据

`dsh-fast` 只消费公开接缝：`session/*` 与 `agent/*` 事件、可选的 `ctx.tokenMeter`、`ctx.storageDomain`、`ctx.commands` 与 `ctx.tools`。它对会话日志严格只读——绝不改动模型请求、工具结果或会话表面。度量持久化到 `dsh_fast` 存储域（每会话一段有界历史），不写会话日志。报告身份与可选的工作目录在任何展示或持久化写入前都会脱敏。

## 已知限制

- **用存储域而非会话事件** —— rc.2 的 `Session.append` 没有 `ignorable` 标记能力，也没有外部事件注册面，写自定义 `fast/*` 会话事件会让持久化协调器在恢复时拒绝日志。因此度量改为持久化到存储域；原始事件仍是可重建的事实来源。
- **spill 检测是启发式** —— 读取持久化的 spill 提示（`Full … stored at:`）；没有专门的会话事件。
- **系统提示词是单个桶** —— AGENTS.md、技能目录与人设都属于组装后的系统提示词；自 `0.1.5-alpha.1` 起它是 surface 节点 0（`system/message`），本身不携带分段 token 统计，因此合并上报。
- **加载耗时从发布时刻起算** —— 恢复时的磁盘读取发生在 `session/created` 之前（由 `sessionPersistence` 负责），本插件允许的事件观察不到；上报的时长是发布到首次请求的延迟。
- **降级路径只播报一次** —— 无 `tokenMeter` 的宿主回退到启发式 token 计价，无 `systemPrompt` 的宿主把整段提示词并入一个桶，`inspector` 出口失败则被忽略；这三者现在各在每进程播报一次，而不是静默改变数字的含义。

## 与其他 DSH 插件的互操作性

本 README 面向 DeepSeek Harness `0.2.1-alpha.1`（运行时兼容面见「兼容性」）。本插件只注册一个命令（`/fast`）、一个工具（`fast_report`）、三个只读监听器（`session/created`、`session/event`、`session/disposed`）与一块 `dsh_fast` 存储域：不提供任何 service、不注册 client slot、不注册 `webServer` 路由、不监听任何 waterfall——因此不会改写模型请求、工具结果或会话表面，也不参与其他插件的热点路径。

唯一的已知冲突在宿主的 client 命令命名空间：`/fast` 是宿主命令名，如果另一个插件也注册了名为 `fast` 的 **client** `commandUi` 贡献，宿主的斜杠命令菜单可能整组丢弃 `/` 来源。该冲突无法由本插件在运行时改名规避。处理方式：禁用/重命名另一个插件的 `fast` client 命令，或移除其中一个插件。没有重复 client 贡献时，`/fast` 与 `fast_report` 正常工作。

## 兼容性

| 维度 | 状态 |
|---|---|
| Harness | DeepSeek Harness `dsh-v0.2.1-alpha.1`（2026-09-18 已适配）：会话表面改经可选的 `sessionQuery` 服务读取——已弃用的同步 `Session.eventAt(seq)` 访问器退役，改由等价的同步回退读兜底；所有注册收进同一个 lifecycle effect 并按逆序释放。属内部实现变更：同一日志下上报指标逐字相同。已于 2026-10-04 核验本地门控链（三把 typecheck 尺子 + 71 项测试）；compat workflow 用已发布钉号重跑 profile 安装冒烟。 |
| Node | `^22.19.0 \|\| >=24.0.0`，纯 ESM（`"type": "module"`）。 |
| 平台 | 任何 DSH 可运行处（纯 host；无网络、无浏览器半）。 |
| 模型 | 文本模型即可；`fast_report` 以结构化 JSON 返回，无需额外模型能力。 |

peer 依赖：`@deepseek-ai/cordis ^4.0.2`、`@deepseek-ai/schemastery ^3.18.4`，以及 `@deepseek-ai/dsh-session`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-commands`、`@deepseek-ai/dsh-compaction`、`@deepseek-ai/dsh-session-query`、`@deepseek-ai/dsh-storage-domain`（`>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0 || >=0.1.6-0 <0.2.0 || >=0.1.7-0 <0.2.0 || >=0.2.0-0 <0.3.0 || >=0.2.1-0 <0.3.0`；devDependencies 钉 `0.2.1-rc.2`）；`0.1.2-rc.1` 旧线仍通过结构式回退读取 pre-0.1.5 的 `header.system` 在运行时受支持。

## 生态与质量

- [Gitee 镜像](https://gitee.com/perrylink/dsh-fast)（同步镜像，以 GitHub 为准）
- [dshfind 插件页](https://dshfind.com/plugins/PerryLink/dsh-fast)（安装量与排名）
- [OpenSSF Scorecard 报告](https://securityscorecards.dev/viewer/?uri=github.com/PerryLink/dsh-fast)（由 [.github/workflows/scorecard.yml](.github/workflows/scorecard.yml) 驱动）
- [dsh-plugin-doctor 验证报告](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
- [DSH Market](https://dsh.market/)（已上架）
- **1024 商店渠道**：先 `npm i -g dsh1024`，再 `dsh1024 plugin --profile web add dsh-fast`（计入 [deepseek1024.com](https://deepseek1024.com) 安装排行）
- [生态实测知识库](https://perrylink.github.io/dsh-plugin-guide/)：插件开发指南 · 选型实测数据 · 维护取舍判据

## 开发

```sh
pnpm install
pnpm run typecheck && pnpm run typecheck:ci && pnpm run typecheck:checkout
pnpm test
pnpm run build
pnpm run verify:self-contained && pnpm run verify:artifacts
node scripts/check-readme-sync.mjs
pnpm pack
```

配图由 [`scripts/gen-readme-assets.py`](scripts/gen-readme-assets.py) 程序化生成（Python 3 标准库，无需 Pillow），输出 `docs/assets/dsh-fast-flow-{light,dark}.svg` 深浅双版，可重复执行。旧的单版 `docs/assets/dsh-fast-flow.svg`、`dsh-fast-hero.png` 与 `dsh-fast-demo.*` 保留在原处以防外链失效，README 不再引用。

Topics：`dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `cordis`, `performance`, `diagnostics`, `profiling`, `context-engineering`, `llm-cache`

## 家族与致谢

本项目是 [PerryLink](https://github.com/PerryLink) 维护的 DeepSeek Harness 插件家族成员（全部 Apache-2.0）。如果这个插件帮到了你，**给个 star**——它不解锁任何功能，但会让下一个人更容易找到它。

- [@PerryLink](https://github.com/PerryLink) —— 作者与维护者：设计并实现了只读诊断（会话加载耗时、spill 命中统计、compaction 指标、上下文注入体量、LLM 缓存命中率）、`/fast` 命令与 `fast_report` 工具、`dsh_fast` 存储域以及五语文档。

<details>
<summary>展开全部插件</summary>

| 插件 | 状态 |
|---|---|
| **[dsh-aqua-input-check](https://github.com/PerryLink/dsh-aqua-input-check)** |  |
| **[dsh-archive-check](https://github.com/PerryLink/dsh-archive-check)** |  |
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** |  |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-bid-ca-precheck](https://github.com/PerryLink/dsh-bid-ca-precheck)** |  |
| **[dsh-bid-qual-check](https://github.com/PerryLink/dsh-bid-qual-check)** |  |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** |  |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** |  |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** |  |
| **[dsh-contract-stance](https://github.com/PerryLink/dsh-contract-stance)** |  |
| **[dsh-customs-doc-check](https://github.com/PerryLink/dsh-customs-doc-check)** |  |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | 🧊 已冻结 — 见仓库 README |
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
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | 🧊 已冻结 — 见仓库 README |
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
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | 🚫 已退役（仓库已归档） |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** |  |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | 🚫 已退役（仓库已归档） |
| **[dsh-plugin-upgrade](https://github.com/PerryLink/dsh-plugin-upgrade)** | 🚫 已退役（仓库已归档） |
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
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | 🧊 已冻结 — 见仓库 README |
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
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | 🚫 已退役（仓库已归档） |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** |  |
| **[dsh-warranty-calc](https://github.com/PerryLink/dsh-warranty-calc)** |  |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 🧊 已冻结 — 见仓库 README |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 🚫 已退役（仓库已归档） |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 🚫 已退役（仓库已归档） |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | 🚫 已退役（仓库已归档） |

</details>

## License

[LICENSE](LICENSE)（Apache License 2.0）© 2026 dsh-fast contributors

<p align="center"><sub>Apache-2.0 · 社区插件，与 DeepSeek 无关。</sub></p>
