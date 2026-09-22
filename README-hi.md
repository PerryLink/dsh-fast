<div align="center">

# ⚡ dsh-fast
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-fast` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

**DeepSeek Harness के लिए केवल-पठन प्रदर्शन निदान।**

*सत्र घटना-धारा का अवलोकन करता है — मॉडल के हॉट पाथ को कभी नहीं — और बताता है कि विलंबता और संदर्भ बजट कहाँ जा रहा है।*

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

- DeepSeek Harness `dsh-v0.1.7-alpha.1` (2026-09-18 को अनुकूलित): सत्र सतह अब वैकल्पिक `sessionQuery` सेवा से पढ़ी जाती है — पदावनत सिंक्रोनस `Session.eventAt(seq)` एक्सेसर हट गया और उसकी जगह समतुल्य सिंक्रोनस रीड fallback है — और सभी रजिस्ट्रेशन अब एक ही lifecycle effect में रहते हैं जो उन्हें उल्टे क्रम में मुक्त करता है। आंतरिक बदलाव: एक ही लॉग पर मेट्रिक्स बिल्कुल समान रहते हैं। 2026-09-18 को स्थानीय गेट शृंखला (दोहरा typecheck + 70 टेस्ट) से सत्यापित; compat workflow प्रकाशित pins के साथ profile इंस्टॉल स्मोक दोहराता है।
- Node `^22.19.0 || >=24.0.0`, केवल ESM (`"type": "module"`)।
- Peers: `@deepseek-ai/cordis ^4.0.2`, `@deepseek-ai/schemastery ^3.18.2`, और `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-compaction`, `@deepseek-ai/dsh-session-query`, `@deepseek-ai/dsh-storage-domain` (`>=0.1.2-rc.1 <0.2.0 || >=0.1.5-alpha.1 <0.2.0 || >=0.1.6-0 <0.2.0`; devDependencies `0.1.5-rc.2` पर पिन); `0.1.2-rc.1` पंक्ति रनटाइम पर pre-0.1.5 `header.system` के संरचनात्मक fallback से अभी भी समर्थित है।

## What you get

- **सत्र लोड समय** — प्रकाशन→पहली अनुरोध विलंबता, `open` (नया) बनाम `restore` (seed/पुनः आरंभ) में वर्गीकृत, साथ में seed घटना गणना।
- **spill हिट गणना** — कितने टूल परिणाम सत्र-स्कोप artifact में spill हुए (स्थायी spill सूचना से पता लगाया गया)।
- **compaction गणना और कारण** — कुल, `manual` (कमांड) बनाम `automatic` (दबाव) में विभाजित, और कुल shadowed टोकन।
- **इंजेक्ट किए गए संदर्भ की मात्रा** — system-prompt (AGENTS.md + skills + persona), टूल schema और सतह टोकन, उनके हिस्सों के साथ; सतह केवल बातचीत इतिहास है (`0.1.5-alpha.1` में meter की सतह में system नोड शामिल होता है, जिसे dsh-fast घटा देता है)।
- **LLM कैश हिट दर** — provider usage से एकत्र input / cache-read / cache-write / output टोकन और व्युत्पन्न दर।
- **अनुकूलन सुझाव** — थ्रेशोल्ड-आधारित (skills छाँटें, टूल schema कसें, पहले compact करें, प्रॉम्प्ट कैश सक्षम करें, spill-policy सक्षम करें…)।
- **अतुल्यकालिक नमूनाकरण** — प्रति घटना O(1) fold; नमूनाकरण टाइमर पर चलता है, append पाथ पर कभी नहीं।

## Quick start

### git channel

```sh
# एक अस्थायी profile से (commit पिन करता है; स्व-निहित `prepare` बिल्ड चलाता है)
dsh plugin --profile demo add "github:YOUR_ORG/dsh-fast#<sha>"
# पहले add पर profile का pnpm-workspace.yaml dsh-fast के लिए allowBuilds प्रविष्टि पाता है।
```

### npm channel

```sh
dsh plugin --profile demo add dsh-fast
```

दोनों चैनल bundle पंक्ति (`cordis.patch.yml` देखें) को profile के `dsh.profile.bundles` स्टैक में स्थापित करते हैं और पुनः आरंभ पर प्रभावी होते हैं।

## Install & uninstall

```sh
dsh plugin --profile demo add dsh-fast       # स्थापित करें
dsh plugin --profile demo remove dsh-fast    # हटाएँ
```

माउंट की जाँच: `dsh --profile demo --dump-config | grep dsh-fast`।

## Configuration

सभी ट्यूनेबल Schemastery `Config` फ़ील्ड हैं; अमान्य मान profile लोड को ज़ोर से विफल करते हैं।

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | मुख्य स्विच; `false` पर कुछ नहीं माउंट होता। |
| `privacy.includeCwd` | `false` | रिपोर्ट में सैनिटाइज़्ड कार्य निर्देशिका शामिल करें। |
| `sampling.snapshotIntervalMs` | `60000` | सक्रिय सत्रों का नमूना कितनी बार लिया जाए (ms)। |
| `sampling.maxHistorySamples` | `20` | प्रति सत्र स्थायी इतिहास में रखे गए नमूने। |
| `thresholds.systemPromptTokens` | `20000` | system prompt इन टोकन से अधिक होने पर चेतावनी। |
| `thresholds.toolSchemaTokens` | `8000` | टूल schema इन टोकन से अधिक होने पर चेतावनी। |
| `thresholds.surfaceTokens` | `60000` | सतह इन टोकन से अधिक होने पर चेतावनी। |
| `thresholds.cacheHitRateFloor` | `0.1` | कैश दर इससे (0..1) नीचे जाने पर चेतावनी। |
| `thresholds.compactionCountWarn` | `10` | इतने compaction के बाद चेतावनी। |
| `thresholds.compactionShadowTokens` | `40000` | प्रति summary औसत shadowed टोकन इससे अधिक होने पर चेतावनी। |
| `spill.detectSpilledResults` | `true` | स्थायी सूचना मार्कर से spill हुए परिणामों का पता लगाना। |

## Tools & surfaces

- **`/fast`** — मानव स्लैश कमांड जो सत्र की स्वास्थ्य रिपोर्ट छापता है: लोड, spill, compaction, संदर्भ-मात्रा रैंकिंग, कैश दर और सुझाव।
- **`fast_report`** — मॉडल टूल जो वही रिपोर्ट संरचित JSON के रूप में लौटाता है (ताकि मॉडल तर्क कर सके), पठनीय टेक्स्ट render के साथ।

## Permissions & data

`dsh-fast` केवल सार्वजनिक seams उपभोग करता है: `session/*` और `agent/*` घटनाएँ, वैकल्पिक `ctx.tokenMeter`, `ctx.storageDomain`, `ctx.commands` और `ctx.tools`। यह सत्र लॉग पर पूर्णतः केवल-पठन है — मॉडल अनुरोध, टूल परिणाम या सतह को कभी नहीं बदलता। मेट्रिक्स `dsh_fast` डोमेन (प्रति सत्र एक सीमित इतिहास) में सहेजे जाते हैं, सत्र लॉग में नहीं। रिपोर्ट पहचान और वैकल्पिक निर्देशिका किसी भी प्रदर्शन या स्थायी लेखन से पहले सैनिटाइज़ की जाती हैं।

## Security boundaries

- **केवल-पठन, मॉडल पाथ पर शून्य ओवरहेड** — प्रति घटना O(1) fold; नमूनाकरण टाइमर पर।
- **कोई नेटवर्क नहीं, कोई क्रेडेंशियल संचालन नहीं** — कोई आउटबाउंड अनुरोध या संवेदनशील भंडारण नहीं।
- **ज़ोर से विफल विन्यास** — हर ट्यूनेबल माउंट पर मान्य होता है; अमान्य सीमाएँ त्रुटि देती हैं।
- **सैनिटाइज़्ड प्रदर्शन/स्थायी डेटा** — नियंत्रण वर्ण हटाए जाते हैं और लंबाई सीमित होती है; `cwd` डिफ़ॉल्ट रूप से बंद है।
- **प्रतिवर्ती पंजीकरण** — सब कुछ `ctx.effect()` / `ctx.on()` / `register()` से गुज़रता है।

## Known limitations

- **स्टोरेज डोमेन, सत्र घटनाएँ नहीं** — rc.2 का `Session.append` `ignorable` मार्कर या बाहरी घटना-पंजीकरण सतह नहीं देता; कस्टम `fast/*` घटना पुनर्स्थापना पर लॉग को अस्वीकार करवा देती। इसलिए मेट्रिक्स स्टोरेज डोमेन में जाते हैं; कच्ची घटनाएँ पुनर्निर्माण-योग्य स्रोत बनी रहती हैं।
- **spill पहचान अनुमानी है** — यह स्थायी सूचना (`Full … stored at:`) पढ़ती है; कोई समर्पित सत्र घटना नहीं है।
- **system prompt एक ही बकेट है** — AGENTS.md, skills और persona असेंबल किए गए system prompt का हिस्सा हैं; `0.1.5-alpha.1` से यह सतह का नोड 0 (एक `system/message`) है और प्रति-अनुभाग गणना नहीं रखता, इसलिए इन्हें एक साथ रिपोर्ट किया जाता है।
- **लोड समय प्रकाशन से शुरू होता है** — पुनर्स्थापना का डिस्क-रीड `session/created` से पहले होता है; रिपोर्ट की गई अवधि प्रकाशन→पहली अनुरोध है।
- **गिरावट की सूचना एक बार दी जाती है** — `tokenMeter` न होने पर ह्यूरिस्टिक टोकन मूल्यांकन, `systemPrompt` न होने पर पूरा प्रॉम्प्ट एक ही बाल्टी में, और विफल `inspector` आउटलेट अनदेखा; अब इनमें से प्रत्येक प्रति प्रक्रिया एक बार बताता है, चुपचाप संख्याओं का अर्थ नहीं बदलता।

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

`dsh-fast` में योगदान देने वाले सभी लोगों का धन्यवाद:

- **[PerryLink](https://github.com/PerryLink)** — लेखक और अनुरक्षक: रीड-ओनली डायग्नोस्टिक्स (सेशन-लोड विलंब, स्पिल-हिट गणना, कम्पैक्शन मीट्रिक्स, कॉन्टेक्स्ट-इंजेक्शन वॉल्यूम, LLM कैश हिट रेट), `/fast` कमांड और `fast_report` टूल, `dsh_fast` स्टोरेज डोमेन तथा पाँच-भाषा दस्तावेज़ का डिज़ाइन व निर्माण किया।

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

Apache-2.0 — देखें [LICENSE](LICENSE)।

### DSH Desktop मार्केट से इंस्टॉल करें

सभी PerryLink प्लगइन DSH Desktop के बिल्ट-इन मार्केट में देखे जा सकते हैं: **Market → Sources → add source → पेस्ट करें** `https://perrylink-dsh-catalog.perrylink.workers.dev/catalog-source.json` **→ चुनें**। इंस्टॉलेशन मार्केट के npm-identity सत्यापन और आपकी पुष्टि से ही होता है।
