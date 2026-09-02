<div align="center">

# ⚡ dsh-fast
- **1024 स्टोर चैनल**: एक बार `npm i -g dsh1024`, फिर `dsh1024 plugin --profile web add dsh-fast` ([deepseek1024.com](https://deepseek1024.com) इंस्टॉल रैंकिंग में गिना जाता है)।

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

- DeepSeek Harness `0.1.1-rc.2` (peers `0.1.1-rc.2` पर पिन किए गए)।
0.1.2-alpha.5 (2026-09-02 को अनुकूलित): सत्र लिफ़ाफ़ा अपना ignorable फ़ील्ड केवल संग्रहीत-लॉग पठन संगतता के लिए रखता है - Session.append अभी भी इसे स्टैम्प नहीं कर सकता, इसलिए गेट व्यवहार अपरिवर्तित है।
- Node `^22.19.0 || >=24.0.0`, केवल ESM (`"type": "module"`)।
- Peers: `@deepseek-ai/cordis ^4.0.1`, `@deepseek-ai/schemastery ^3.18.0`, और `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-commands`, `@deepseek-ai/dsh-compaction`, `@deepseek-ai/dsh-storage-domain` (`0.1.1-rc.2`)।

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

- **स्टोरेज डोमेन, सत्र घटनाएँ नहीं** — rc.2 का `Session.append` `ignorable` मार्कर या बाहरी घटना-पंजीकरण सतह नहीं देता; कस्टम `fast/*` घटना पुनर्स्थापना पर लॉग को अस्वीकार करवा देती। इसलिए मेट्रिक्स स्टोरेज डोमेन में जाते हैं; कच्ची घटनाएँ पुनर्निर्माण-योग्य स्रोत बनी रहती हैं।
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

`dsh-fast` में योगदान देने वाले सभी लोगों का धन्यवाद:

- **[PerryLink](https://github.com/PerryLink)** — लेखक और अनुरक्षक: रीड-ओनली डायग्नोस्टिक्स (सेशन-लोड विलंब, स्पिल-हिट गणना, कम्पैक्शन मीट्रिक्स, कॉन्टेक्स्ट-इंजेक्शन वॉल्यूम, LLM कैश हिट रेट), `/fast` कमांड और `fast_report` टूल, `dsh_fast` स्टोरेज डोमेन तथा पाँच-भाषा दस्तावेज़ का डिज़ाइन व निर्माण किया।

## PerryLink DSH Plugin Family

यह प्रोजेक्ट [PerryLink](https://github.com/PerryLink) द्वारा अनुरक्षित [33 DeepSeek Harness प्लगइनों](https://github.com/PerryLink) में से एक है। अगर यह आपकी मदद करता है, तो बाकी भी करेंगे:

| Plugin | One-liner |
|---|---|
| **[dsh-dsh-auto-review](https://github.com/PerryLink/dsh-dsh-auto-review)** | अनुमोदन श्रृंखला पर द्वितीय-मॉडल स्वतः-समीक्षा, डिफ़ॉल्ट रूप से विफल-बंद | |
| **[dsh-dsh-background-agents](https://github.com/PerryLink/dsh-dsh-background-agents)** | वेब UI साइडबार, संदेश और अवरोधन के साथ टिकाऊ पृष्ठभूमि चाइल्ड एजेंट | |
| **[dsh-dsh-budget](https://github.com/PerryLink/dsh-dsh-budget)** | DeepSeek Harness के लिए लागत प्रशासन: बजट, कार्बन और विलंबता एक पैनल में। | |
| **[dsh-dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-dsh-checkpoint-rewind)** | Claude Code /rewind-समतुल्य: स्नैपशॉट, सत्र फ़ॉर्क, एक-बार पुनर्स्थापना | |
| **[dsh-dsh-claude-move](https://github.com/PerryLink/dsh-dsh-claude-move)** | Claude Code सत्र, मेमोरी, कौशल और CLAUDE.md को DSH में स्थानांतरित करें | |
| **[dsh-dsh-click](https://github.com/PerryLink/dsh-dsh-click)** | DeepSeek Harness के लिए क्रॉस-प्लेटफ़ॉर्म नेटिव डेस्कटॉप नियंत्रण — Windows पहले। | |
| **[dsh-dsh-composer-history](https://github.com/PerryLink/dsh-dsh-composer-history)** | वेब कंपोज़र के लिए टर्मिनल-शैली इनपुट इतिहास: तीर, Ctrl+R खोज | |
| **[dsh-dsh-data-quality](https://github.com/PerryLink/dsh-dsh-data-quality)** | डेटासेट गुणवत्ता जाँच व उद्धरण सत्यापन (यहाँ उपभोग किया गया वैकल्पिक संख्या-सेतु) | |
| **[dsh-dsh-defend](https://github.com/PerryLink/dsh-dsh-defend)** | DeepSeek Harness के लिए प्रॉम्प्ट-इंजेक्शन, जेलब्रेक और सीक्रेट-लीक रक्षा। | |
| **[dsh-dsh-doublecheck](https://github.com/PerryLink/dsh-dsh-doublecheck)** | इंजीनियरिंग-अनुशासन रक्षक: आवश्यकताओं की पूछताछ, परीक्षण द्वार, प्रतिद्वंद्वी समीक्षा | |
| **[dsh-dsh-draw](https://github.com/PerryLink/dsh-dsh-draw)** | DeepSeek Harness के लिए एकीकृत स्थैतिक-छवि निर्माण रूटिंग। | |
| **[dsh-dsh-fund-research](https://github.com/PerryLink/dsh-dsh-fund-research)** | चीनी सार्वजनिक म्यूचुअल फंड के लिए नियतात्मक अनुसंधान रिपोर्ट | |
| **[dsh-dsh-github](https://github.com/PerryLink/dsh-dsh-github)** | DSH के लिए GitHub PR/issues एकीकरण, हर लेखन अनुमोदन-द्वारित | |
| **[dsh-dsh-industry-research](https://github.com/PerryLink/dsh-dsh-industry-research)** | उद्योग-अनुसंधान ऑर्केस्ट्रेशन जो इस प्लगिन के `ctx.researchReport.assemble` से डिलीवरेबल सील करता है | |
| **[dsh-dsh-library](https://github.com/PerryLink/dsh-dsh-library)** | DeepSeek Harness के लिए स्थानीय दस्तावेज़ ज्ञानकोश। | |
| **[dsh-dsh-local-ai](https://github.com/PerryLink/dsh-dsh-local-ai)** | DeepSeek Harness के लिए स्थानीय-मॉडल (Ollama) एकीकरण। | |
| **[dsh-dsh-lsp-actions](https://github.com/PerryLink/dsh-dsh-lsp-actions)** | भाषा सर्वरों पर LSP निदान, फ़ॉर्मेटिंग, पूर्णता, कोड क्रियाएँ और नाम बदलना | |
| **[dsh-dsh-mask](https://github.com/PerryLink/dsh-dsh-mask)** | PII मास्किंग मिडलवेयर: मॉडल सीमा पर अनाम करें, डिस्प्ले लेयर पर पुनर्स्थापित करें | |
| **[dsh-dsh-mcp-panel](https://github.com/PerryLink/dsh-dsh-mcp-panel)** | केवल-पढ़ने वाला MCP रनटाइम पैनल: /mcp कमांड + स्थिति, टूल और त्रुटियों वाला Settings टैब | |
| **[dsh-dsh-memento](https://github.com/PerryLink/dsh-dsh-memento)** | अनुमोदन-द्वारित क्रॉस-सत्र मेमोरी: ctx.memory सीम + SQLite + मेमोरी टूल | |
| **[dsh-dsh-observe](https://github.com/PerryLink/dsh-dsh-observe)** | DeepSeek Harness के लिए OpenTelemetry और Langfuse अवलोकनीयता निर्यातक। | |
| **[dsh-dsh-output-styles](https://github.com/PerryLink/dsh-dsh-output-styles)** | Claude Code outputStyles-समतुल्य रनटाइम शैली बदलाव | |
| **[dsh-dsh-permission-rules](https://github.com/PerryLink/dsh-dsh-permission-rules)** | ऑडिट के साथ Claude Code-शैली घोषणात्मक allow/deny/ask अनुमति नियम | |
| **[dsh-dsh-plugin-guide](https://github.com/PerryLink/dsh-dsh-plugin-guide)** | माँग पर एजेंट कौशल के रूप में प्लगइन-विकास ज्ञान आधार | |
| **[dsh-dsh-research-report](https://github.com/PerryLink/dsh-dsh-research-report)** | सामग्री-पता साक्ष्य और सीलबंद संस्करणों वाला सत्यापन-योग्य अनुसंधान-रिपोर्ट इंजन | |
| **[dsh-dsh-score](https://github.com/PerryLink/dsh-dsh-score)** | DeepSeek Harness प्लगिनों की बहु-आयामी गुणवत्ता स्कोरिंग। | |
| **[dsh-dsh-session-pin](https://github.com/PerryLink/dsh-dsh-session-pin)** | टिकाऊ क्रम के साथ वेब साइडबार में सत्र पिन करें | |
| **[dsh-dsh-session-sync](https://github.com/PerryLink/dsh-dsh-session-sync)** | DeepSeek Harness के लिए क्रॉस-डिवाइस सत्र सिंक — आपके सत्र स्टोर का एक समर्पित git मिरर। | |
| **[dsh-dsh-skill-pack-security](https://github.com/PerryLink/dsh-dsh-skill-pack-security)** | सुरक्षा-ऑडिट कौशल पैक: गुप्त स्कैन, निर्भरता और आपूर्ति-श्रृंखला समीक्षा | |
| **[dsh-dsh-talk](https://github.com/PerryLink/dsh-dsh-talk)** | DeepSeek Harness के लिए आवाज़-प्रथम सत्र लूप: बोलें और उत्तर सुनें। | |
| **[dsh-dsh-test-drive](https://github.com/PerryLink/dsh-dsh-test-drive)** | DeepSeek Harness प्लगिनों के लिए पृथक इंस्टॉल-एंड-स्मोक टेस्ट ड्राइव। | |
| **[dsh-dsh-translate](https://github.com/PerryLink/dsh-dsh-translate)** | DeepSeek Harness के लिए वेंडर पैरामीटर अनुवाद और नियतात्मक JSON मरम्मत। | |

## License

Apache-2.0 — देखें [LICENSE](LICENSE)।
