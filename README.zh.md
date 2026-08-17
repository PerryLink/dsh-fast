# dsh-fast

DeepSeek Harness 的只读性能诊断插件。`dsh-fast` 观察会话事件流——绝不触碰模型热路径——并告诉你会话的延迟与上下文预算究竟花在哪里：会话加载（打开/恢复）耗时、spill 命中统计、compaction 次数与触发原因、上下文注入体量（AGENTS.md / 技能目录 / 工具 schema / 会话表面的 token 占比）、以及 LLM 缓存命中率。它通过 `/fast` 斜杠命令与 `fast_report` 模型工具呈现结果，并在异步采样定时器上把度量持久化到 harness 的存储域。

## Compatibility

- DeepSeek Harness `0.1.0-rc.6`（peer 钉在 `0.1.0-rc.6`）。
- Node `^22.19.0 || >=24.0.0`，纯 ESM（`"type": "module"`）。
- peer 依赖：`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/schemastery ^3.18.0`，以及 `@deepseek-ai/dsh-session`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-commands`、`@deepseek-ai/dsh-compaction`、`@deepseek-ai/dsh-storage-domain`（`0.1.0-rc.6`）。

## What you get

- **会话加载耗时** —— 发布到首次请求的延迟，按 `open`（全新）/`restore`（带 seed/恢复）分类，并给出恢复时的 seed 事件数。
- **spill 命中统计** —— 有多少工具结果被溢出到会话级工件（从持久化的 spill 提示标记检测）。
- **compaction 次数与触发原因** —— 总次数，按 `manual`（斜杠命令）/`automatic`（压力）区分，以及总 shadow token 数。
- **上下文注入体量** —— 系统提示词（AGENTS.md + 技能 + 人设）、工具 schema、会话表面的 token 数及其占比。
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

- **用存储域而非会话事件** —— rc.6 的 `Session.append` 没有 `ignorable` 标记能力，也没有外部事件注册面，写自定义 `fast/*` 会话事件会让持久化协调器在恢复时拒绝日志。因此度量改为持久化到存储域；原始事件仍是可重建的事实来源。
- **spill 检测是启发式** —— 读取持久化的 spill 提示（`Full … stored at:`）；没有专门的会话事件。
- **系统提示词是单个桶** —— AGENTS.md、技能目录与人设都属于组装后的系统提示词；header 不携带分段 token 统计，因此合并上报。
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

`dsh-fast` contributors.

## License

Apache-2.0 —— 见 [LICENSE](LICENSE)。
