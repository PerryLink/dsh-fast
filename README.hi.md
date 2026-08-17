<div align="center">

# ⚡ dsh-fast

**DeepSeek Harness के लिए केवल-पठन प्रदर्शन निदान।**

*सत्र घटना-धारा का अवलोकन करता है — मॉडल के हॉट पाथ को कभी नहीं — और बताता है कि विलंबता और संदर्भ बजट कहाँ जा रहा है।*

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

- DeepSeek Harness `0.1.0-rc.6` (peers `0.1.0-rc.6` पर पिन किए गए)।
- Node `^22.19.0 || >=24.0.0`, केवल ESM (`"type": "module"`)।
- Peers: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/schemastery ^3.18.0`, और `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-compaction`, `@deepseek-ai/dsh-storage-domain` (`0.1.0-rc.6`)।

## What you get

- **सत्र लोड समय** — प्रकाशन→पहली अनुरोध विलंबता, `open` (नया) बनाम `restore` (seed/पुनः आरंभ) में वर्गीकृत, साथ में seed घटना गणना।
- **spill हिट गणना** — कितने टूल परिणाम सत्र-स्कोप artifact में spill हुए (स्थायी spill सूचना से पता लगाया गया)।
- **compaction गणना और कारण** — कुल, `manual` (कमांड) बनाम `automatic` (दबाव) में विभाजित, और कुल shadowed टोकन।
- **इंजेक्ट किए गए संदर्भ की मात्रा** — system-prompt (AGENTS.md + skills + persona), टूल schema और सतह टोकन, उनके हिस्सों के साथ।
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

- **स्टोरेज डोमेन, सत्र घटनाएँ नहीं** — rc.6 का `Session.append` `ignorable` मार्कर या बाहरी घटना-पंजीकरण सतह नहीं देता; कस्टम `fast/*` घटना पुनर्स्थापना पर लॉग को अस्वीकार करवा देती। इसलिए मेट्रिक्स स्टोरेज डोमेन में जाते हैं; कच्ची घटनाएँ पुनर्निर्माण-योग्य स्रोत बनी रहती हैं।
- **spill पहचान अनुमानी है** — यह स्थायी सूचना (`Full … stored at:`) पढ़ती है; कोई समर्पित सत्र घटना नहीं है।
- **system prompt एक ही बकेट है** — AGENTS.md, skills और persona असेंबल किए गए system prompt का हिस्सा हैं; header में प्रति-अनुभाग गणना नहीं होती।
- **लोड समय प्रकाशन से शुरू होता है** — पुनर्स्थापना का डिस्क-रीड `session/created` से पहले होता है; रिपोर्ट की गई अवधि प्रकाशन→पहली अनुरोध है।

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

## PerryLink DSH Plugin Family

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) द्वारा अनुरक्षित [29 DeepSeek Harness प्लगइनों](https://github.com/PerryLink) में से एक है। अगर यह आपकी मदद करता है, तो बाकी भी करेंगे:

| Plugin | One-liner |
|---|---|
| [dsh-auto-review](https://github.com/PerryLink/dsh-auto-review) | अनुमोदन श्रृंखला पर दूसरे मॉडल से स्वतः-समीक्षा, डिफ़ॉल्ट रूप से असफल-बंद |
| [dsh-background-agents](https://github.com/PerryLink/dsh-background-agents) | Web UI साइडबार, संदेश और रुकावट के साथ स्थायी पृष्ठभूमि चाइल्ड एजेंट |
| [dsh-budget](https://github.com/PerryLink/dsh-budget) | DeepSeek Harness के लिए लागत प्रशासन: बजट, कार्बन और विलंबता एक पैनल में। |
| [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind) | Claude Code /rewind-समतुल्य: स्नैपशॉट, सत्र फोर्क, एक-बार पुनर्स्थापन |
| [dsh-claude-move](https://github.com/PerryLink/dsh-claude-move) | Claude Code सत्र, स्मृति, skills और CLAUDE.md को DSH में स्थानांतरित करें |
| [dsh-click](https://github.com/PerryLink/dsh-click) | DeepSeek Harness के लिए क्रॉस-प्लेटफ़ॉर्म नेटिव डेस्कटॉप नियंत्रण — Windows पहले। |
| [dsh-composer-history](https://github.com/PerryLink/dsh-composer-history) | Web कंपोज़र के लिए टर्मिनल-शैली इनपुट इतिहास: तीर, Ctrl+R खोज |
| [dsh-defend](https://github.com/PerryLink/dsh-defend) | DeepSeek Harness के लिए प्रॉम्प्ट-इंजेक्शन, जेलब्रेक और सीक्रेट-लीक रक्षा। |
| [dsh-doublecheck](https://github.com/PerryLink/dsh-doublecheck) | इंजीनियरिंग-अनुशासन गार्ड: आवश्यकताएँ पूछताछ, परीक्षण द्वार, विरोधी समीक्षा |
| [dsh-draw](https://github.com/PerryLink/dsh-draw) | DeepSeek Harness के लिए एकीकृत स्थैतिक-छवि निर्माण रूटिंग। |
| **[dsh-fast](https://github.com/PerryLink/dsh-fast)** | DeepSeek Harness के लिए केवल-पठन प्रदर्शन निदान। |
| [dsh-github](https://github.com/PerryLink/dsh-github) | DSH के लिए GitHub PR/issues एकीकरण, हर लेखन अनुमोदन-द्वारित |
| [dsh-library](https://github.com/PerryLink/dsh-library) | DeepSeek Harness के लिए स्थानीय दस्तावेज़ ज्ञानकोश। |
| [dsh-local-ai](https://github.com/PerryLink/dsh-local-ai) | DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण। |
| [dsh-lsp-actions](https://github.com/PerryLink/dsh-lsp-actions) | भाषा सर्वरों पर LSP निदान, फ़ॉर्मेटिंग, पूर्णता, कोड क्रियाएँ और नाम बदलना |
| [dsh-mask](https://github.com/PerryLink/dsh-mask) | DeepSeek Harness के लिए PII मास्किंग मिडलवेयर — मॉडल तक पहुँचने से पहले व्यक्तिगत डेटा अनाम करता है, प्रदर्शन परत पर बहाल करता है। |
| [dsh-mcp-panel](https://github.com/PerryLink/dsh-mcp-panel) | केवल-पठन MCP रनटाइम पैनल: /mcp कमांड + स्थिति, टूल और त्रुटियों वाला सेटिंग टैब |
| [dsh-memento](https://github.com/PerryLink/dsh-memento) | अनुमोदन-द्वारित क्रॉस-सत्र स्मृति: ctx.memory seam + SQLite + memory टूल |
| [dsh-observe](https://github.com/PerryLink/dsh-observe) | DeepSeek Harness के लिए OpenTelemetry और Langfuse अवलोकनीयता निर्यातक। |
| [dsh-output-styles](https://github.com/PerryLink/dsh-output-styles) | Claude Code outputStyles-समतुल्य रनटाइम शैली स्विचिंग |
| [dsh-permission-rules](https://github.com/PerryLink/dsh-permission-rules) | Claude Code-शैली घोषणात्मक allow/deny/ask अनुमति नियम, ऑडिट के साथ |
| [dsh-plugin-guide](https://github.com/PerryLink/dsh-plugin-guide) | माँग-पर एजेंट स्किल के रूप में प्लगइन-विकास ज्ञानकोश |
| [dsh-score](https://github.com/PerryLink/dsh-score) | DeepSeek Harness प्लगइनों के लिए बहु-आयामी गुणवत्ता स्कोरिंग। |
| [dsh-session-pin](https://github.com/PerryLink/dsh-session-pin) | Web साइडबार में सत्र पिन करें, स्थायी क्रम के साथ |
| [dsh-session-sync](https://github.com/PerryLink/dsh-session-sync) | DeepSeek Harness के लिए क्रॉस-डिवाइस सत्र सिंक — आपके सत्र स्टोर का एक समर्पित git मिरर। |
| [dsh-skill-pack-security](https://github.com/PerryLink/dsh-skill-pack-security) | सुरक्षा-ऑडिट स्किल पैक: सीक्रेट स्कैन, निर्भरता और आपूर्ति-श्रृंखला समीक्षा |
| [dsh-talk](https://github.com/PerryLink/dsh-talk) | DeepSeek Harness के लिए आवाज़-प्रथम सत्र लूप: बोलें और उत्तर सुनें। |
| [dsh-test-drive](https://github.com/PerryLink/dsh-test-drive) | DeepSeek Harness प्लगइनों के लिए पृथक इंस्टॉल-और-स्मोक परीक्षण। |
| [dsh-translate](https://github.com/PerryLink/dsh-translate) | DeepSeek Harness के लिए वेंडर पैरामीटर अनुवाद और नियतात्मक JSON मरम्मत। |

## License

Apache-2.0 — देखें [LICENSE](LICENSE)।
