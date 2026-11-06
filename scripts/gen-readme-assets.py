#!/usr/bin/env python3
"""Generate the dsh-fast README assets (docs/assets/).

Outputs (idempotent overwrite):
  docs/assets/dsh-fast-hero-zh-light.webp
  docs/assets/dsh-fast-hero-zh-dark.webp
  docs/assets/dsh-fast-hero-en-light.webp
  docs/assets/dsh-fast-hero-en-dark.webp
  docs/assets/dsh-fast-flow-v5-light.svg
  docs/assets/dsh-fast-flow-v5-dark.svg

Hero (Pillow, 1440x576): left column = kicker / title / two-line value /
subtitle / meta / footer; right = the plugin's own object, a `/fast` report
sheet (session load, spill hits, compaction, context volume with a stacked
budget bar, LLM cache hit rate, suggestions), built from the real snapshot
fields in src/model.ts.

Flow (hand-written SVG, 1100x660): the pipeline as it actually runs — the
event channel folds counters at append time, the sampling channel reads the
optional services on a timer, the two merge into one five-section snapshot,
which then has two downstreams (timer persist into the `dsh_fast` domain, and
the on-demand report build) and three surfaces (/fast text, fast_report JSON,
/fast --history reading the domain back). English labels keep one asset pair
valid for all five README languages.

Palette: family accent #4B67B4 (dark #8496f5), light page #f9f6fd -> #e4eaf8,
dark page #131a2a -> #0c1016, radius 18-22, soft shadows.
Fonts: msyh.ttc / msyhbd.ttc / consola.ttf / consolab.ttf (Windows).

Run:  python scripts/gen-readme-assets.py
"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

FONT_CJK = r"C:\Windows\Fonts\msyh.ttc"
FONT_CJK_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
FONT_MONO = r"C:\Windows\Fonts\consola.ttf"
FONT_MONO_BOLD = r"C:\Windows\Fonts\consolab.ttf"
for _path in (FONT_CJK, FONT_CJK_BOLD, FONT_MONO, FONT_MONO_BOLD):
    if not os.path.exists(_path):
        raise SystemExit(f"FATAL: font missing: {_path}")

FONT_FILES = {
    "cjk": FONT_CJK,
    "cjk_bold": FONT_CJK_BOLD,
    "mono": FONT_MONO,
    "mono_bold": FONT_MONO_BOLD,
}

SKIN = {
    "light": dict(
        bg_from="#f9f6fd", bg_to="#e4eaf8",
        panel="#ffffff", panel_border="#e6e2ef",
        soft="#f5f3fb", soft_border="#d9d5e8",
        band="#f1eefa",
        text="#161a26", sub="#4d5261", faint="#8a90a4",
        accent="#4B67B4", accent_soft="#eaeefa", accent_line="#c2ccea",
        accent_mid="#7c90d6", accent_pale="#c3cdec",
        green="#1f7a4d",
        track="#e8e6f2",
        shadow=(38, 30, 74), glow="#7a68c9", glow2="#8fa2dd",
        dashed="#b9c3dd",
    ),
    "dark": dict(
        bg_from="#131a2a", bg_to="#0c1016",
        panel="#19223a", panel_border="#2b3752",
        soft="#1e2840", soft_border="#33405e",
        band="#1c2740",
        text="#eef2ff", sub="#a7b3cd", faint="#6f7d9b",
        accent="#8496f5", accent_soft="#1e2a49", accent_line="#3a4a72",
        accent_mid="#5f74c9", accent_pale="#39466d",
        green="#4ec98a",
        track="#222c44",
        shadow=(0, 0, 0), glow="#3a4a8f", glow2="#2a5f8a",
        dashed="#46567f",
    ),
}

RADIUS = 22
SHADOW = 24


def font(size: int, kind: str = "cjk") -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_FILES[kind], size)


def hx(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


_SCRATCH = ImageDraw.Draw(Image.new("RGB", (8, 8)))


def measure(text: str, size: int, kind: str) -> float:
    return _SCRATCH.textlength(text, font=font(size, kind))


def require_w(text: str, size: int, kind: str, max_w: float, what: str) -> None:
    got = measure(text, size, kind)
    if got > max_w:
        raise SystemExit(f"FATAL: {what} overflows: {got:.0f}px > {max_w:.0f}px :: {text!r}")


def fit(text: str, kind: str, max_w: float, start: int, minimum: int) -> int:
    for size in range(start, minimum - 1, -1):
        if measure(text, size, kind) <= max_w:
            return size
    raise SystemExit(f"FATAL: cannot fit {text!r} into {max_w:.0f}px (min {minimum}px)")


def fit_lines(lines: list[str], kind: str, max_w: float, start: int, minimum: int) -> int:
    return min(fit(line, kind, max_w, start, minimum) for line in lines)


def gradient(w: int, h: int, c1: str, c2: str) -> Image.Image:
    top, bottom = hx(c1), hx(c2)
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        draw.line(
            [(0, y), (w, y)],
            fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)),
        )
    return img


def glow(img: Image.Image, cx: int, cy: int, rx: int, ry: int, color: str,
         alpha: int = 40) -> Image.Image:
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([cx - rx, cy - ry, cx + rx, cy + ry],
                                  fill=hx(color) + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(max(rx, ry) // 2))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def card(img: Image.Image, box: tuple[int, int, int, int], s: dict,
         radius: int = RADIUS, shadow: int = SHADOW, fill: str | None = None,
         border: str | None = None) -> Image.Image:
    """A soft-shadowed rounded card on the gradient background."""
    x0, y0, x1, y1 = box
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    alpha_scale = 0.05 if s["shadow"] != (0, 0, 0) else 0.20
    for i in range(shadow, 0, -3):
        draw.rounded_rectangle(
            [x0 - i // 6, y0 + i // 3, x1 + i // 6, y1 + i],
            radius=radius + i // 3,
            fill=s["shadow"] + (int(255 * alpha_scale * (1 - i / shadow)),),
        )
    layer = layer.filter(ImageFilter.GaussianBlur(9))
    base = Image.alpha_composite(img.convert("RGBA"), layer)
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle(box, radius=radius, fill=hx(fill or s["panel"]),
                           outline=hx(border or s["panel_border"]), width=1)
    return base.convert("RGB")


def pill(img: Image.Image, xy: tuple[int, int], text: str, s: dict, size: int = 16,
         kind: str = "cjk", fg: str | None = None, bg: str | None = None,
         padx: int = 18, height: int | None = None) -> Image.Image:
    d = ImageDraw.Draw(img)
    f = font(size, kind)
    w = d.textlength(text, font=f)
    h = height or int(size * 2.2)
    x, y = xy
    d.rounded_rectangle([x, y, x + w + padx * 2, y + h], radius=h // 2,
                        fill=hx(bg or s["accent_soft"]),
                        outline=hx(s["accent_line"]), width=1)
    d.text((x + padx, y + h / 2), text, font=f, fill=hx(fg or s["accent"]),
           anchor="lm")
    return img


def text_right(img: Image.Image, x: int, baseline: int, text: str, size: int,
               kind: str, color: str) -> None:
    ImageDraw.Draw(img).text((x, baseline), text, font=font(size, kind),
                             fill=hx(color), anchor="rs")


def hairline(img: Image.Image, x0: int, x1: int, y: int, color: str,
             width: int = 1) -> None:
    ImageDraw.Draw(img).line([x0, y, x1, y], fill=hx(color), width=width)


# --------------------------------------------------------------------------- #
# Hero copy: zh / en. Numbers come from the README's own example /fast output. #
# --------------------------------------------------------------------------- #
HERO = {
    "zh": dict(
        kicker="DeepSeek Harness 插件 · 只读性能诊断",
        value=["会话慢在哪，一屏读完", "加载 · 溢出 · 压缩 · 预算 · 缓存"],
        sub=["只读监听 session 事件流，不碰模型热路径；",
             "把加载、spill、compaction 与上下文预算拆开来看。"],
        meta="/fast · fast_report · 6 个阈值建议 · dsh_fast 历史 · 无网络",
        foot="Apache-2.0 · PerryLink DSH plugin family",
        card=dict(
            title="performance report",
            chip="只读快照",
            session="session 9f3c…a2 · kind open · seed 0",
            rows=[
                ("会话加载", "150", "ms", "发布 → 首次请求"),
                ("溢出命中", "0", "", "检测到的溢出结果 · 启发式"),
                ("压缩次数", "0", "", "手动 0 · 自动 0 · shadow 0"),
                ("上下文预算", "1,000", "tokens", None),
                ("LLM 缓存", "20", "%", "input 800 · cache read 200 · write 50 · output 100"),
            ],
            legend=["系统 400 · 40%", "工具 schema 200 · 20%", "会话表面 400 · 40%"],
            foot="6 个阈值均未触发 · 建议 0 条",
            ver="dsh-fast 0.2.28",
        ),
    ),
    "en": dict(
        kicker="DeepSeek Harness plugin · read-only diagnostics",
        value=["Where a session slows down,", "five numbers on one screen."],
        sub=["It only watches session events, never the model path:",
             "load, spill, compaction and context budget, split apart."],
        meta="/fast · fast_report · thresholds · dsh_fast history · no network",
        foot="Apache-2.0 · PerryLink DSH plugin family",
        card=dict(
            title="performance report",
            chip="read-only snapshot",
            session="session 9f3c…a2 · kind open · seed 0",
            rows=[
                ("Session load", "150", "ms", "publish → first request"),
                ("Spill hits", "0", "", "detected results · heuristic"),
                ("Compaction", "0", "", "manual 0 · automatic 0 · shadow 0"),
                ("Context volume", "1,000", "tokens", None),
                ("LLM cache", "20", "%", "input 800 · cache read 200 · write 50 · output 100"),
            ],
            legend=["system 400 · 40%", "tool schema 200 · 20%", "surface 400 · 40%"],
            foot="no threshold crossed · suggestions: none",
            ver="dsh-fast 0.2.28",
        ),
    ),
}


def hero(lang: str, skin: str) -> None:
    s = SKIN[skin]
    h = HERO[lang]
    c = h["card"]
    w, ht = 1440, 576
    img = gradient(w, ht, s["bg_from"], s["bg_to"])
    img = glow(img, 1180, 40, 420, 300, s["accent"],
               26 if skin == "light" else 40)
    img = glow(img, 120, 600, 320, 220, s["glow2"],
               12 if skin == "light" else 18)

    d = ImageDraw.Draw(img)
    m = 64
    col_w = 596

    # ---- left column: kicker / title / value / sub / meta / footer ----------
    pill(img, (m, 50), h["kicker"], s, size=17)
    d = ImageDraw.Draw(img)

    title = "dsh-fast"
    title_size = fit(title, "mono_bold", col_w, 82, 64)
    d.text((m - 2, 110), title, font=font(title_size, "mono_bold"),
           fill=hx(s["text"]))

    vf = fit_lines(h["value"], "cjk_bold", col_w, 40, 30)
    for i, line in enumerate(h["value"]):
        d.text((m, 208 + i * 54), line, font=font(vf, "cjk_bold"),
               fill=hx(s["text"]))

    sf = font(21, "cjk")
    for i, line in enumerate(h["sub"]):
        require_w(line, 21, "cjk", col_w, "hero sub")
        d.text((m + 1, 326 + i * 32), line, font=sf, fill=hx(s["sub"]))

    require_w(h["meta"], 18, "cjk", col_w, "hero meta")
    require_w(h["foot"], 15, "cjk", col_w, "hero footer")
    d.text((m + 1, 424), h["meta"], font=font(18, "cjk"), fill=hx(s["faint"]))
    hairline(img, m + 1, m + col_w - 6, 466, s["soft_border"], 1)
    d = ImageDraw.Draw(img)
    d.text((m + 1, 484), h["foot"], font=font(15, "cjk"), fill=hx(s["faint"]))

    # ---- right: the /fast report sheet --------------------------------------
    box = (690, 36, 1376, 540)
    img = card(img, box, s, radius=RADIUS, shadow=SHADOW)
    d = ImageDraw.Draw(img)
    ix, rx = 716, 1350

    d.text((ix, 66), c["title"], font=font(14, "mono_bold"), fill=hx(s["accent"]))
    chip_w = measure(c["chip"], 11, "cjk")
    pill(img, (rx - int(chip_w) - 34, 46), c["chip"], s, size=11, padx=16,
         height=26)
    d = ImageDraw.Draw(img)
    d.text((ix, 92), c["session"], font=font(12, "cjk"), fill=hx(s["sub"]))
    hairline(img, ix, rx, 106, s["panel_border"], 1)

    num_font = font(26, "mono_bold")
    unit_font = font(13, "cjk")

    baselines = [132, 202, 272]
    for i, (label, number, unit, note) in enumerate(c["rows"][:3]):
        by = baselines[i]
        d = ImageDraw.Draw(img)
        d.ellipse([ix, by - 9, ix + 7, by - 2], fill=hx(s["accent"]))
        d.text((ix + 16, by), label, font=font(13, "cjk"), fill=hx(s["text"]))
        unit_w = d.textlength(unit, font=unit_font) + (6 if unit else 0)
        d.text((rx - unit_w, by), number, font=num_font, fill=hx(s["accent"]),
               anchor="rs")
        if unit:
            d.text((rx, by), unit, font=unit_font, fill=hx(s["faint"]),
                   anchor="rs")
        if note:
            d.text((ix + 16, by + 22), note, font=font(11, "cjk"),
                   fill=hx(s["faint"]))

    # row 4: context volume with the stacked budget bar. The 40/20/40 split and
    # the token counts below are the example /fast output in README.md.
    label, number, unit, _ = c["rows"][3]
    by = 330
    d = ImageDraw.Draw(img)
    d.ellipse([ix, by - 9, ix + 7, by - 2], fill=hx(s["accent"]))
    d.text((ix + 16, by), label, font=font(13, "cjk"), fill=hx(s["text"]))
    unit_w = d.textlength(unit, font=unit_font) + 6
    d.text((rx - unit_w, by), number, font=num_font,
           fill=hx(s["accent"]), anchor="rs")
    d.text((rx, by), unit, font=unit_font, fill=hx(s["faint"]), anchor="rs")

    bar_y, bar_h = 352, 28
    bar_w = rx - ix
    gap = 4
    usable = bar_w - gap * 2
    shares = (0.4, 0.2, 0.4)
    widths = [int(usable * share) for share in shares]
    widths[2] = usable - widths[0] - widths[1]
    colors = (s["accent"], s["accent_mid"], s["accent_pale"])
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([ix, bar_y, rx, bar_y + bar_h], radius=8, fill=hx(s["track"]))
    cursor = ix
    for i, seg_w in enumerate(widths):
        d.rounded_rectangle([cursor, bar_y, cursor + seg_w, bar_y + bar_h],
                            radius=7, fill=hx(colors[i]))
        cursor += seg_w + gap

    legend_y = 402
    cursor = ix
    for i, item in enumerate(c["legend"]):
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([cursor, legend_y - 9, cursor + 9, legend_y],
                            radius=3, fill=hx(colors[i]))
        d.text((cursor + 16, legend_y), item, font=font(11, "cjk"),
               fill=hx(s["sub"]))
        cursor += 16 + measure(item, 11, "cjk") + 26

    # row 5: LLM cache hit rate
    label, number, unit, note = c["rows"][4]
    by = 456
    d = ImageDraw.Draw(img)
    d.ellipse([ix, by - 9, ix + 7, by - 2], fill=hx(s["accent"]))
    d.text((ix + 16, by), label, font=font(13, "cjk"), fill=hx(s["text"]))
    unit_w = d.textlength(unit, font=unit_font) + 6
    d.text((rx - unit_w, by), number, font=num_font,
           fill=hx(s["accent"]), anchor="rs")
    d.text((rx, by), unit, font=unit_font, fill=hx(s["faint"]), anchor="rs")
    d.text((ix + 16, by + 22), note, font=font(11, "cjk"), fill=hx(s["faint"]))

    hairline(img, ix, rx, 500, s["panel_border"], 1)
    d = ImageDraw.Draw(img)
    d.text((ix, 518), c["foot"], font=font(11, "cjk"), fill=hx(s["faint"]))
    d.text((rx, 518), c["ver"], font=font(11, "mono"), fill=hx(s["faint"]),
           anchor="rs")

    path = os.path.join(OUT, f"dsh-fast-hero-{lang}-{skin}.webp")
    img.save(path, "WEBP", quality=92, method=6)
    print(f"wrote {os.path.relpath(path, ROOT)}")


# --------------------------------------------------------------------------- #
# Flow diagram: hand-written SVG. English labels -> one pair for five READMEs. #
# --------------------------------------------------------------------------- #
FLOW = dict(
    title="dsh-fast",
    subtitle=("two channels — event fold and timer sampling — merge into one snapshot, "
              "then split into command, tool and storage"),
    badge="read-only · off the model path",
    channel_a=dict(
        head="Event channel",
        note="append-time · O(1) per event",
        rows=[
            ("request/header", "time to first request (ms)"),
            ("assistant/message", "usage: input / cache read·write / output"),
            ("compaction/start", "count + manual | automatic"),
            ("compaction/summary", "shadowedTokenCount (summed)"),
            ("tool/result", "spill notice marker (heuristic)"),
        ],
    ),
    channel_b=dict(
        head="Sampling channel",
        note="setInterval(60s) · async",
        line="live sessions → skip clean → assemble",
        chips=[("tokenMeter", "total / surface", True),
               ("systemPrompt", "four buckets", True),
               ("sessionQuery", "system node", True),
               ("header.tools", "tool schema", False)],
        foot="optional: missing ⇒ heuristic / one bucket / sync read — warned once",
    ),
    hub=dict(
        head="snapshot() — five sections",
        note="the only place tokenMeter is read",
        sub="surface = meter.surface − system · nothing is measured on the append path",
        chips=[("load", "kind · seed · TTFR"),
               ("spill", "hits (heuristic)"),
               ("compaction", "count · manual/auto"),
               ("context", "system · schema · surface"),
               ("cache", "usage · hit rate")],
    ),
    domain=dict(
        head="dsh_fast · sessions",
        note="storage domain",
        sub="one bounded history per session · maxHistorySamples = 20",
        caption="written by the timer, not the session log",
    ),
    report=dict(
        head="buildReport()",
        note="pure · no I/O",
        rows=["thresholds: system 20k · schema 8k · surface 60k · cache 10%",
              "crossed line → one suggestion; sanitize sessionId / cwd",
              "report = snapshot + generator · version · generatedAt"],
    ),
    exits=dict(
        left=("/fast", "text report for humans · --history [n] reads the domain"),
        right=("fast_report", "JSON for the model · same numbers, rendered as text"),
    ),
    foot="read-only · no network · no waterfall listeners · sampling stays off the append path",
)

SVG_SANS = "'Microsoft YaHei','PingFang SC','Noto Sans CJK SC','Segoe UI',sans-serif"
SVG_MONO = "'Consolas','SFMono-Regular','Menlo',ui-monospace,monospace"


def esc(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;"))


def svg_measure(text: str, size: float, mono: bool = False) -> float:
    return _SCRATCH.textlength(text, font=font(int(round(size)),
                                              "mono" if mono else "cjk"))


class Svg:
    def __init__(self, skin: str):
        self.s = dict(SKIN[skin])
        self.skin_name = skin
        self.parts: list[str] = []

    def color(self, key: str) -> str:
        return self.s.get(key, key) if isinstance(key, str) else str(key)

    def add(self, part: str) -> None:
        self.parts.append(part)

    def text(self, x: float, y: float, body: str, size: float = 12,
             weight: int = 400, fill: str = "text", anchor: str = "start",
             mono: bool = False, opacity: float | None = None) -> None:
        extra = ""
        if weight >= 600:
            extra += ' font-weight="700"'
        if opacity is not None:
            extra += f' opacity="{opacity:g}"'
        self.add(
            f'<text x="{x:g}" y="{y:g}" fill="{self.color(fill)}" '
            f'font-family="{SVG_MONO if mono else SVG_SANS}" '
            f'font-size="{size:g}"{extra} text-anchor="{anchor}">{esc(body)}</text>'
        )

    def rect(self, x: float, y: float, w: float, h: float, r: float = 0,
             fill: str | None = None, stroke: str | None = None,
             sw: float = 1, dash: str | None = None,
             opacity: float | None = None, shadow: bool = False) -> None:
        bits = [f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}"',
                f' rx="{r:g}"']
        bits.append(f' fill="{self.color(fill)}"' if fill else ' fill="none"')
        if stroke:
            bits.append(f' stroke="{self.color(stroke)}" stroke-width="{sw:g}"')
        if dash:
            bits.append(f' stroke-dasharray="{dash}"')
        if opacity is not None:
            bits.append(f' opacity="{opacity:g}"')
        if shadow:
            bits.append(' filter="url(#soft)"')
        bits.append("/>")
        self.add("".join(bits))

    def line(self, x1: float, y1: float, x2: float, y2: float,
             stroke: str = "panel_border", sw: float = 1,
             dash: str | None = None, opacity: float | None = None) -> None:
        bits = [f'<path d="M{x1:g} {y1:g}L{x2:g} {y2:g}" fill="none"',
                f' stroke="{self.color(stroke)}" stroke-width="{sw:g}"',
                ' stroke-linecap="round"']
        if dash:
            bits.append(f' stroke-dasharray="{dash}"')
        if opacity is not None:
            bits.append(f' opacity="{opacity:g}"')
        bits.append("/>")
        self.add("".join(bits))

    def arrow(self, d: str, stroke: str = "accent", sw: float = 1.6,
              dash: str | None = None, opacity: float | None = None,
              marker: str = "arr") -> None:
        bits = [f'<path d="{d}" fill="none" stroke="{self.color(stroke)}"',
                f' stroke-width="{sw:g}" stroke-linecap="round"',
                f' marker-end="url(#{marker})"']
        if dash:
            bits.append(f' stroke-dasharray="{dash}"')
        if opacity is not None:
            bits.append(f' opacity="{opacity:g}"')
        bits.append("/>")
        self.add("".join(bits))

    def render(self, aria: str, title: str) -> str:
        s = self.s
        flood = "#2a2350" if self.skin_name == "light" else "#000000"
        flood_opacity = 0.10 if self.skin_name == "light" else 0.45
        head = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="660" '
            'viewBox="0 0 1100 660" role="img" aria-label="' + esc(aria) + '">',
            f"<title>{esc(title)}</title>",
            "<defs>",
            '<linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">'
            f'<stop offset="0" stop-color="{s["bg_from"]}"/>'
            f'<stop offset="1" stop-color="{s["bg_to"]}"/></linearGradient>',
            '<filter id="soft" x="-30%" y="-30%" width="160%" height="180%">'
            f'<feDropShadow dx="0" dy="7" stdDeviation="9" '
            f'flood-color="{flood}" flood-opacity="{flood_opacity}"/>'
            "</filter>",
            '<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" '
            'markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
            f'<path d="M0 0 L10 5 L0 10 z" fill="{s["accent"]}"/></marker>',
            '<marker id="arr-soft" viewBox="0 0 10 10" refX="9" refY="5" '
            'markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
            f'<path d="M0 0 L10 5 L0 10 z" fill="{s["faint"]}"/></marker>',
            "</defs>",
            '<rect width="1100" height="660" fill="url(#bg)"/>',
        ]
        return "\n".join(head + self.parts + ["</svg>"]) + "\n"


def flow_svg(skin: str) -> str:
    g = Svg(skin)
    f = FLOW
    m, rx = 44, 1056

    def need(x0: float, body: str, size: float, limit: float,
             mono: bool = False, what: str = "") -> float:
        """Fail loud when a label would run past its container (no silent overlap)."""
        w = svg_measure(body, size, mono=mono)
        if x0 + w > limit:
            raise SystemExit(
                f"FATAL: flow text overflows ({x0 + w:.0f} > {limit:.0f}) "
                f"[{what}]: {body!r}")
        return w

    # ---- header ------------------------------------------------------------
    g.text(m, 56, f["title"], 27, 700, "text", mono=True)
    need(m, f["subtitle"], 13.5, 1000, what="subtitle")
    g.text(m, 84, f["subtitle"], 13.5, 400, "sub")

    badge_w = svg_measure(f["badge"], 11) + 34
    g.rect(rx - badge_w, 30, badge_w, 28, 14, fill="accent_soft",
           stroke="accent_line", sw=1)
    g.text(rx - badge_w / 2, 48.5, f["badge"], 11, 400, "accent", "middle")

    def panel(x, y, w, h, head, note):
        g.rect(x, y, w, h, 20, fill="panel", stroke="panel_border", sw=1,
               shadow=True)
        g.rect(x + 20, y + 10, 4, 16, 2, fill="accent")
        g.text(x + 33, y + 23, head, 14, 700, "text")
        if note:
            g.text(x + w - 20, y + 22.5, note, 11, 400, "faint", "end", mono=True)

    # ---- channel A: the append-time fold ----------------------------------
    ax, ay, aw, ah = m, 104, 492, 164
    panel(ax, ay, aw, ah, f["channel_a"]["head"], f["channel_a"]["note"])
    g.line(ax + 20, ay + 34, ax + aw - 20, ay + 34, "panel_border", 1)
    row_y = 152
    for name, outcome in f["channel_a"]["rows"]:
        need(ax + 20, name, 13, ax + 200, mono=True, what="event name")
        need(ax + 226, outcome, 11.5, ax + aw - 20, what="fold outcome")
        g.text(ax + 20, row_y, name, 13, 400, "text", mono=True)
        g.text(ax + 208, row_y, "→", 11.5, 400, "accent")
        g.text(ax + 226, row_y, outcome, 11.5, 400, "sub")
        row_y += 24

    # ---- channel B: the timer + the optional reads ------------------------
    bx, by_, bw, bh = 564, 104, 492, 164
    panel(bx, by_, bw, bh, f["channel_b"]["head"], f["channel_b"]["note"])
    g.line(bx + 20, by_ + 34, bx + bw - 20, by_ + 34, "panel_border", 1)
    need(bx + 20, f["channel_b"]["line"], 11, bx + bw - 20, what="sampling line")
    g.text(bx + 20, 152, f["channel_b"]["line"], 11, 400, "sub")

    chips = f["channel_b"]["chips"]
    pad = 10
    widths = [svg_measure(name, 13, mono=True) + pad * 2 for name, _, _ in chips]
    gap = ((bw - 40) - sum(widths)) / (len(chips) - 1)
    if gap < 6:
        raise SystemExit(f"FATAL: sampling chips do not fit (gap {gap:.1f}px)")
    cx = bx + 20
    for (name, caption, optional), w in zip(chips, widths):
        g.rect(cx, 160, w, 36, 10, fill="soft",
               stroke="dashed" if optional else "accent_line", sw=1.2,
               dash="4 3" if optional else None)
        g.text(cx + w / 2, 184, name, 13, 400, "text", "middle", mono=True)
        if svg_measure(caption, 11) > w + gap:
            raise SystemExit(f"FATAL: chip caption too wide: {caption!r}")
        g.text(cx + w / 2, 216, caption, 11, 400, "faint", "middle")
        cx += w + gap
    need(bx + 20, f["channel_b"]["foot"], 11, bx + bw - 20, what="fallback note")
    g.text(bx + 20, 244, f["channel_b"]["foot"], 11, 400, "faint")

    # ---- conflux: both channels feed the one snapshot ----------------------
    g.arrow(f"M{ax + 356:g} {ay + ah:g}C{ax + 356:g} 274 470 278 546 278",
            marker="none")
    g.arrow(f"M{720} {by_ + bh:g}C720 274 640 278 554 278", marker="none")
    g.add(f'<circle cx="550" cy="278" r="4.2" fill="{g.color("accent")}"/>')
    g.arrow("M550 280L550 291")

    # ---- hub: the five-section snapshot -----------------------------------
    hx0, hy, hw, hh = m, 292, 1012, 104
    g.rect(hx0, hy, hw, hh, 20, fill="panel", stroke="accent_line", sw=1.4,
           shadow=True)
    g.rect(hx0 + 20, hy + 10, 4, 16, 2, fill="accent")
    g.text(hx0 + 33, hy + 23, f["hub"]["head"], 14, 700, "accent")
    g.text(hx0 + hw - 20, hy + 22.5, f["hub"]["note"], 11, 400, "faint", "end")
    need(hx0 + 20, f["hub"]["sub"], 11, hx0 + hw - 20, what="hub sub")
    g.text(hx0 + 20, hy + 46, f["hub"]["sub"], 11, 400, "sub")

    chip_w = 180
    cgap = (hw - 40 - chip_w * 5) / 4
    cx = hx0 + 20
    for name, note in f["hub"]["chips"]:
        need(cx + 14, note, 11, cx + chip_w - 10, what="hub chip note")
        need(cx + 14, name, 13, cx + chip_w - 10, mono=True,
             what="hub chip name")
        g.rect(cx, hy + 58, chip_w, 38, 10, fill="soft", stroke="panel_border",
               sw=1)
        g.text(cx + 14, hy + 76, name, 13, 700, "accent", mono=True)
        g.text(cx + 14, hy + 90, note, 11, 400, "faint")
        cx += chip_w + cgap

    # ---- downstream 1: the durable domain ---------------------------------
    dx, dy, dw, dh = m, 416, 492, 124
    panel(dx, dy, dw, dh, f["domain"]["head"], f["domain"]["note"])
    g.line(dx + 20, dy + 34, dx + dw - 20, dy + 34, "panel_border", 1)
    need(dx + 20, f["domain"]["sub"], 11, dx + dw - 20, what="domain sub")
    g.text(dx + 20, dy + 50, f["domain"]["sub"], 11, 400, "sub")

    heights = [10, 16, 22, 18, 26, 20, 30, 24, 34, 28, 38, 32, 42, 36]
    bar_w, step = 20, 33
    base_y = dy + 96
    g.line(dx + 20, base_y, dx + dw - 20, base_y, "panel_border", 1, dash="3 4")
    for i, value in enumerate(heights):
        g.rect(dx + 20 + i * step, base_y - value, bar_w, value, 4,
               fill="accent", opacity=0.28 + 0.045 * i)
    need(dx + 20, f["domain"]["caption"], 11, dx + dw - 20, what="domain caption")
    g.text(dx + 20, dy + 114, f["domain"]["caption"], 11, 400, "faint")

    # ---- downstream 2: the pure report assembly ---------------------------
    px, py, pw, ph = 564, 416, 492, 124
    panel(px, py, pw, ph, f["report"]["head"], f["report"]["note"])
    g.line(px + 20, py + 34, px + pw - 20, py + 34, "panel_border", 1)
    row_y = py + 50
    for row in f["report"]["rows"]:
        need(px + 20, row, 11, px + pw - 20, what="report row")
        g.text(px + 20, row_y, row, 11, 400, "sub")
        row_y += 24

    # ---- persist / on-demand arrows --------------------------------------
    g.arrow(f"M{dx + 250:g} {hy + hh:g}L{dx + 250:g} {dy:g}")
    g.text(dx + 262, dy - 6, "persist · timer", 11, 400, "faint")
    g.arrow(f"M{px + 250:g} {hy + hh:g}L{px + 250:g} {py:g}")
    g.text(px + 262, py - 6, "on demand", 11, 400, "faint")

    # ---- surfaces: /fast and fast_report ----------------------------------
    ox, oy, ow, oh = m, 560, 1012, 64
    g.rect(ox, oy, ow, oh, 18, fill="panel", stroke="panel_border", sw=1,
           shadow=True)
    g.line(730, oy + 12, 730, oy + oh - 12, "panel_border", 1)
    left_title, left_note = f["exits"]["left"]
    right_title, right_note = f["exits"]["right"]
    need(ox + 20, left_note, 11, 700, what="exit note")
    need(750, right_note, 11, rx - 20, what="exit note")
    g.text(ox + 20, oy + 28, left_title, 14.5, 700, "accent", mono=True)
    g.text(ox + 20, oy + 48, left_note, 11, 400, "sub")
    g.text(750, oy + 28, right_title, 14.5, 700, "accent", mono=True)
    g.text(750, oy + 48, right_note, 11, 400, "sub")

    # domain read-back feeds --history; the report feeds both surfaces
    g.arrow(f"M{dx + 356:g} {dy + dh:g}L{dx + 356:g} {oy:g}", "accent", 1.6,
            dash="5 4")
    g.text(dx + 368, oy - 6, "--history [n] read-back", 11, 400, "faint")
    g.arrow(f"M{px + 76:g} {py + ph:g}L{px + 76:g} {oy:g}")
    g.arrow(f"M{px + 336:g} {py + ph:g}L{px + 336:g} {oy:g}")

    need(m, f["foot"], 11, rx, what="footer")
    g.text(m, 648, f["foot"], 11, 400, "faint")

    aria = ("dsh-fast pipeline: the append-time event channel folds counters for "
            "request/header, assistant/message, compaction and tool/result; the "
            "setInterval sampling channel reads the optional tokenMeter, "
            "systemPrompt and sessionQuery services; both merge into one "
            "five-section snapshot (load, spill, compaction, context, cache), "
            "which the timer persists into the dsh_fast storage domain and the "
            "on-demand report builds into /fast text and fast_report JSON; "
            "/fast --history reads the domain back")
    return g.render(aria, "dsh-fast: two channels, one snapshot, three surfaces")


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for lang in ("zh", "en"):
        for skin in ("light", "dark"):
            hero(lang, skin)
    for skin in ("light", "dark"):
        path = os.path.join(OUT, f"dsh-fast-flow-v5-{skin}.svg")
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(flow_svg(skin))
        print(f"wrote {os.path.relpath(path, ROOT)}")


if __name__ == "__main__":
    main()
