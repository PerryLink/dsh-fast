<div align="center">

# ⚡ dsh-fast
- **1024 商店渠道**：先 `npm i -g dsh1024`，再 `dsh1024 plugin --profile web add dsh-fast`（计入 [deepseek1024.com](https://deepseek1024.com) 安装排行）。

**DeepSeek Harness 的只读性能诊断插件。**

*观察会话事件流——绝不触碰模型热路径——并报告延迟与上下文预算究竟花在哪里。*

> **官方仓库。** 本仓库是 dsh-fast 的唯一官方仓库，由 PerryLink 维护。其他账号下的同名仓库与本项目无关。

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-c71d23?logo=gitee)](https://gitee.com/perrylink/dsh-fast)
[![DSH plugin](https://img.shields.io/badge/dsh--plugin-✅-green)](https://github.com/topics/dsh-plugin)
[![dsh-doctor](https://raw.githubusercontent.com/PerryLink/dsh-plugin-doctor/main/badges/PerryLink__dsh-fast.svg)](https://github.com/PerryLink/dsh-plugin-doctor#verified-徽章)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-brightgreen.svg)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-fast/ci.yml?branch=main&label=CI)](https://github.com/PerryLink/dsh-fast/actions)
[![Version](https://img.shields.io/github/v/tag/PerryLink/dsh-fast?label=version)](https://github.com/PerryLink/dsh-fast/releases)
[![npm version](https://img.shields.io/npm/v/dsh-fast)](https://www.npmjs.com/package/dsh-fast)
[![npm downloads](https://img.shields.io/npm/dm/dsh-fast)](https://www.npmjs.com/package/dsh-fast)

[English](README.md) · [简体中文](README-zh.md) · [Español](README-es.md) · [Português](README-pt.md) · [हिन्दी](README-hi.md)

</div>

---

## Compatibility

- DeepSeek Harness `dsh-v0.1.5-rc.2`（2026-09-09 已适配；公开 tag commit `fb2c4b9e69`）：系统提示词改为 surface 节点 0（`system/message`）而不再放在请求信封里，因此报告从会话表面读取它，并把 token meter 的 surface 计价扣除系统提示词后再上报。已于 2026-09-11 用已发布的 `0.1.5-rc.2` peers 核验（本地全门控链）；每月的 compat workflow 用同一钉号重跑 profile 安装冒烟。
- Node `^22.19.0 || >=24.0.0`，纯 ESM（`"type": "module"`）。
- peer 依赖：`@deepseek-ai/cordis ^4.0.2`、`@deepseek-ai/schemastery ^3.18.2`，以及 `@deepseek-ai/dsh-session`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-commands`、`@deepseek-ai/dsh-compaction`、`@deepseek-ai/dsh-storage-domain`（`>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0`；devDependencies 钉 `0.1.5-rc.2`）；`0.1.2-rc.1` 旧线仍通过结构式回退读取 pre-0.1.5 的 `header.system` 在运行时受支持。

## What you get

- **会话加载耗时** —— 发布到首次请求的延迟，按 `open`（全新）/`restore`（带 seed/恢复）分类，并给出恢复时的 seed 事件数。
- **spill 命中统计** —— 有多少工具结果被溢出到会话级工件（从持久化的 spill 提示标记检测）。
- **compaction 次数与触发原因** —— 总次数，按 `manual`（斜杠命令）/`automatic`（压力）区分，以及总 shadow token 数。
- **上下文注入体量** —— 系统提示词（AGENTS.md + 技能 + 人设）、工具 schema、会话表面的 token 数及其占比；其中“会话表面”只含对话历史（`0.1.5-alpha.1` 的 meter surface 含系统节点，dsh-fast 已扣除）。
- **LLM 缓存命中率** —— 由 provider usage 聚合的 input / cache-read / cache-write / output token 与命中率。
- **优化建议** —— 阈值驱动的建议（精简技能、收紧工具 schema、更早压缩、启用提示词缓存、启用 spill-policy 等）。
- **异步采样** —— 每个事件 O(1) 折叠，定时器采样，绝不在追加路径上执行。

## Quick start

### git 通道

```sh
# 在临时 profile 上（钉住 commit；运行自包含的 `prepare` 构建）
dsh plugin --profile demo add "github:YOUR_ORG/dsh-fast#<sha>"
# 首次 add 后，profile 的 pnpm-workspace.yaml 会新增针对 dsh-fast 的 allowBuilds 项。
```

### npm 通道

```sh
dsh plugin --profile demo add dsh-fast
```

两条通道都会把 bundle 行（见 `cordis.patch.yml`）装进 profile 的 `dsh.profile.bundles` 栈，重启后生效。

## Install & uninstall

```sh
dsh plugin --profile demo add dsh-fast       # 安装
dsh plugin --profile demo remove dsh-fast    # 卸载
```

验证行已挂载：`dsh --profile demo --dump-config | grep dsh-fast`。

## Configuration

所有可调参数都是 Schemastery `Config` 字段；非法值会在 profile 加载时响亮失败。

| Key | Default | Description |
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

## Tools & surfaces

- **`/fast`** —— 人类斜杠命令，打印当前会话的健康报告：加载耗时、spill、compaction、上下文体量排名、缓存命中率与建议。
- **`fast_report`** —— 模型工具，以结构化 JSON 返回同一份报告（供模型推理），并带人类可读的文本渲染。

## Permissions & data

`dsh-fast` 只消费公开接缝：`session/*` 与 `agent/*` 事件、可选的 `ctx.tokenMeter`、`ctx.storageDomain`、`ctx.commands` 与 `ctx.tools`。它对会话日志严格只读——绝不改动模型请求、工具结果或会话表面。度量持久化到 `dsh_fast` 存储域（每会话一段有界历史），不写会话日志。报告身份与可选的工作目录在任何展示或持久化写入前都会脱敏。

## Security boundaries

- **只读、零模型路径开销** —— 每个事件 O(1) 折叠，定时器采样。
- **无网络、无凭据处理** —— 插件不发任何出站请求，也不存储敏感信息。
- **配置响亮失败** —— 每个可调参数在挂载时校验；非法边界抛错。
- **展示/持久化数据脱敏** —— 剥离控制字符、限制字符串长度；`cwd` 默认关闭，开启时按路径截断。
- **注册可逆** —— 一切贡献都经 `ctx.effect()` / `ctx.on()` / `register()`，卸载与热重载干净。

## Known limitations

- **用存储域而非会话事件** —— rc.2 的 `Session.append` 没有 `ignorable` 标记能力，也没有外部事件注册面，写自定义 `fast/*` 会话事件会让持久化协调器在恢复时拒绝日志。因此度量改为持久化到存储域；原始事件仍是可重建的事实来源。
- **spill 检测是启发式** —— 读取持久化的 spill 提示（`Full … stored at:`）；没有专门的会话事件。
- **系统提示词是单个桶** —— AGENTS.md、技能目录与人设都属于组装后的系统提示词；自 `0.1.5-alpha.1` 起它是 surface 节点 0（`system/message`），本身不携带分段 token 统计，因此合并上报。
- **加载耗时从发布时刻起算** —— 恢复时的磁盘读取发生在 `session/created` 之前（由 `sessionPersistence` 负责），本插件允许的事件观察不到；上报的时长是发布到首次请求的延迟。

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

感谢所有为 `dsh-fast` 做出贡献的人：

- **[PerryLink](https://github.com/PerryLink)** —— 作者与维护者：设计并实现了只读诊断（会话加载耗时、spill 命中统计、compaction 指标、上下文注入体量、LLM 缓存命中率）、`/fast` 命令与 `fast_report` 工具、`dsh_fast` 存储域以及五语文档。

## PerryLink DSH Plugin Family

这是 [PerryLink](https://github.com/PerryLink) 维护的 [40 个 DeepSeek Harness 插件](https://github.com/PerryLink) 之一。如果它能帮到你，其他的也会：

| Plugin | One-liner |
|---|---|
| **[dsh-auto-review](https://github.com/PerryLink/dsh-auto-review)** | 审批链上的第二模型自动审查，默认失败关闭 | |
| **[dsh-background-agents](https://github.com/PerryLink/dsh-background-agents)** | 带 Web UI 侧栏、消息与中断的持久后台子代理 | |
| **[dsh-budget](https://github.com/PerryLink/dsh-budget)** | DeepSeek Harness 的成本治理：预算、碳排与延迟一屏呈现。 | |
| **[dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)** | Claude Code /rewind 等价：快照、会话 fork、一次性恢复 | |
| **[dsh-claude-move](https://github.com/PerryLink/dsh-claude-move)** | 把 Claude Code 会话、记忆、技能与 CLAUDE.md 迁入 DSH | |
| **[dsh-click](https://github.com/PerryLink/dsh-click)** | 跨平台原生桌面控制（DeepSeek Harness），Windows 优先。 | |
| **[dsh-composer-history](https://github.com/PerryLink/dsh-composer-history)** | Web 输入框的终端式历史：方向键、Ctrl+R 搜索 | |
| **[dsh-data-quality](https://github.com/PerryLink/dsh-data-quality)** | 数据集质量检查与引文核查（本插件可选消费的数字核查桥） | |
| **[dsh-defend](https://github.com/PerryLink/dsh-defend)** | DeepSeek Harness 的提示注入、越狱与密钥泄露防护。 | |
| **[dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck)** | 工程纪律守卫：需求质询、测试门禁、对手评审 | |
| **[dsh-draw](https://github.com/PerryLink/dsh-draw)** | DeepSeek Harness 的统一静态图像生成路由。 | |
| **[dsh-fund-research](https://github.com/PerryLink/dsh-fund-research)** | 面向中国公募基金的确定性研究报告 | |
| **[dsh-github](https://github.com/PerryLink/dsh-github)** | 面向 DSH 的 GitHub PR/issues 集成，每次写入经审批门控 | |
| **[dsh-industry-research](https://github.com/PerryLink/dsh-industry-research)** | 行业研究编排，经本插件的 `ctx.researchReport.assemble` 封存交付物 | |
| **[dsh-library](https://github.com/PerryLink/dsh-library)** | DeepSeek Harness 的本地文档知识库。 | |
| **[dsh-local-ai](https://github.com/PerryLink/dsh-local-ai)** | DeepSeek Harness 的本地模型（Ollama）接入。 | |
| **[dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions)** | 通过语言服务器的 LSP 诊断、格式化、补全、代码操作与重命名 | |
| **[dsh-mask](https://github.com/PerryLink/dsh-mask)** | PII 脱敏中间件：模型边界匿名化、展示层还原 | |
| **[dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel)** | 只读 MCP 运行时面板：/mcp 命令 + 带状态、工具与错误的 Settings 标签页 | |
| **[dsh-memento](https://github.com/PerryLink/dsh-memento)** | 审批门控的跨会话记忆：ctx.memory 接缝 + SQLite + 记忆工具 | |
| **[dsh-observe](https://github.com/PerryLink/dsh-observe)** | DeepSeek Harness 的 OpenTelemetry 与 Langfuse 可观测导出器。 | |
| **[dsh-output-styles](https://github.com/PerryLink/dsh-output-styles)** | Claude Code outputStyles 等价的运行时风格切换 | |
| **[dsh-reach](https://github.com/PerryLink/dsh-reach)** | 多渠道审批/提问桥接:微信/Telegram/飞书,会话控制台 |
| **[dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules)** | Claude Code 风格声明式 allow/deny/ask 权限规则，带审计 | |
| **[dsh-personal-directive](https://github.com/PerryLink/dsh-personal-directive)** | 个人指令注入器:顶栏开关(框架版) |
| **[dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide)** | 作为按需代理技能的插件开发知识库 | |
| **[dsh-plugin-doctor](https://github.com/PerryLink/dsh-plugin-doctor)** | Zero-dependency static + sandbox smoke detector for DSH plugins | |
| **[dsh-research-report](https://github.com/PerryLink/dsh-research-report)** | 可验证研究报告引擎：内容寻址证据账本与封存版本 | |
| **[dsh-score](https://github.com/PerryLink/dsh-score)** | DeepSeek Harness 插件的多维质量评分。 | |
| **[dsh-session-pin](https://github.com/PerryLink/dsh-session-pin)** | 在 Web 侧栏置顶会话，带持久排序 | |
| **[dsh-session-sync](https://github.com/PerryLink/dsh-session-sync)** | DeepSeek Harness 的跨设备会话同步——会话存储的专用 git 镜像。 | |
| **[dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security)** | 安全审计技能包：密钥扫描、依赖与供应链审查 | |
| **[dsh-talk](https://github.com/PerryLink/dsh-talk)** | DeepSeek Harness 的语音优先会话闭环：对它说，听它答。 | |
| **[dsh-test-drive](https://github.com/PerryLink/dsh-test-drive)** | DeepSeek Harness 插件的隔离试装冒烟。 | |
| **[dsh-ticktick](https://github.com/PerryLink/dsh-ticktick)** | TickTick/滴答清单任务桥接:会话头面板 + 11 个工具 |
| **[dsh-translate](https://github.com/PerryLink/dsh-translate)** | DeepSeek Harness 的厂商参数翻译与确定性 JSON 修复。 | |
| **[dsh-wechat](https://github.com/pan17/dsh-wechat)** | 微信 ↔ DSH 桥接(Tencent iLink 机器人):文本/图片/文件/语音,聊天内审批卡片 |
| **[dsh-autotier](https://github.com/PerryLink/dsh-autotier)** | Automatic strong/cheap model-tier routing with deterministic risk guards and a `/tier` command | |
| **[dsh-catalog](https://github.com/PerryLink/dsh-catalog)** | DSH Desktop Market standard catalog source for the PerryLink family | |
| **[dsh-cert-mcp](https://github.com/PerryLink/dsh-cert-mcp)** | Read-only MCP server exposing the certification registry: grades, snapshots and five-dimension evidence | |
| **[dsh-kit](https://github.com/PerryLink/dsh-kit)** | One-command starter pack that installs the core family | |
| **[dsh-plugin-certification](https://github.com/PerryLink/dsh-plugin-certification)** | Community certification registry with repro-checkable grades and badges | |
| **[dsh-plugin-kit](https://github.com/PerryLink/dsh-plugin-kit)** | Shared zero-runtime-dependency toolkit for the PerryLink DSH plugins | |
| **[dsh-plugin-portal](https://github.com/PerryLink/dsh-plugin-portal)** | Zero-dependency static portal rendering the whole plugin family as one page | |
| **[dsh-plugin-upgrade-015](https://github.com/PerryLink/dsh-plugin-upgrade-015)** | Merged `0.1.3-alpha.1` → `0.1.5-rc.1` upgrade corridor card plus a zero-dependency seam scanner | |
| **[dsh-team-rooms](https://github.com/PerryLink/dsh-team-rooms)** | Cross-session team rooms: shared message bus, task board and timeline | |

## License

Apache-2.0 —— 见 [LICENSE](LICENSE)。

### 从 DSH Desktop 市场安装

所有 PerryLink 插件均可在 DSH Desktop 内置市场中浏览：**市场 → 来源 → 添加来源 → 粘贴** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ 选中**。安装仍需通过市场的 npm 身份校验与你的确认。
