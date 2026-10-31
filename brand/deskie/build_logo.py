"""Builds the Deskie logo set (SVG) from one mascot definition. Run: python3 brand/deskie/build_logo.py
Wordmark is outlined from Poppins Bold (SIL OFL) so the SVGs render the same everywhere without the font installed."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = Path(__file__).parent
TEAL, DEEP, MINT, INK, WHITE, CORAL = "#12A594", "#0A5F5C", "#D9F4EC", "#0E2A2B", "#FFFFFF", "#FF8A6B"
FONT = TTFont("/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf")
GS, CMAP, UPM = FONT.getGlyphSet(), FONT.getBestCmap(), FONT["head"].unitsPerEm


def word(text, size, x0, baseline, tracking=0.0):
    """Outline `text` as one SVG path string; returns (d, end_x, positions)."""
    scale, x, d, pos = size / UPM, x0, [], []
    for ch in text:
        name = CMAP[ord(ch)]
        pen = SVGPathPen(GS)
        GS[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        d.append(pen.getCommands())
        pos.append((ch, x, GS[name].width * scale))
        x += GS[name].width * scale + tracking * size
    return " ".join(d), x - tracking * size, pos


# --- mascot, drawn on a 200 x 200 grid -------------------------------------------------
BUBBLE = "M64 34 H136 A44 44 0 0 1 180 78 V104 A44 44 0 0 1 136 148 H70 L40 176 L46 148 A44 44 0 0 1 20 104 V78 A44 44 0 0 1 64 34 Z"
BAND = "M24 92 A76 76 0 0 1 176 92"
CUPS = [(10, 78, 24, 42), (166, 78, 24, 42)]
MIC = "M172 118 Q172 150 132 152"


def mascot(body=TEAL, band=DEEP, face=INK, cheek=MINT, mono=None, uid="m"):
    if mono:  # single colour: face and the gap around the headset are cut out with a mask
        cut = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="none" stroke="#000" stroke-width="12"/>' for x, y, w, h in CUPS)
        cut += f'<path d="{BAND}" fill="none" stroke="#000" stroke-width="22" stroke-linecap="round"/>'
        cut += f'<path d="{MIC}" fill="none" stroke="#000" stroke-width="18" stroke-linecap="round"/><circle cx="130" cy="152" r="14" fill="#000"/>'
        feat = ('<ellipse cx="76" cy="94" rx="8" ry="10" fill="#000"/><ellipse cx="124" cy="94" rx="8" ry="10" fill="#000"/>'
                '<path d="M80 116 Q100 134 120 116" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round"/>')
        return (f'<defs><mask id="{uid}"><rect width="200" height="200" fill="#fff"/>{cut}{feat}</mask></defs>'
                f'<g fill="{mono}"><path d="{BUBBLE}" mask="url(#{uid})"/>'
                + "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9"/>' for x, y, w, h in CUPS)
                + f'<path d="{BAND}" fill="none" stroke="{mono}" stroke-width="10" stroke-linecap="round"/>'
                f'<path d="{MIC}" fill="none" stroke="{mono}" stroke-width="7" stroke-linecap="round"/><circle cx="130" cy="152" r="9"/></g>')
    cups = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="{band}"/>' for x, y, w, h in CUPS)
    return (f'<path d="{BUBBLE}" fill="{body}"/>'
            f'<circle cx="52" cy="120" r="9" fill="{cheek}" opacity=".55"/><circle cx="148" cy="120" r="9" fill="{cheek}" opacity=".55"/>'
            f'<ellipse cx="76" cy="94" rx="8" ry="10" fill="{face}"/><ellipse cx="124" cy="94" rx="8" ry="10" fill="{face}"/>'
            f'<circle cx="79" cy="90" r="2.6" fill="#fff"/><circle cx="127" cy="90" r="2.6" fill="#fff"/>'
            f'<path d="M80 116 Q100 134 120 116" fill="none" stroke="{face}" stroke-width="7" stroke-linecap="round"/>'
            f'<path d="{BAND}" fill="none" stroke="{band}" stroke-width="10" stroke-linecap="round"/>{cups}'
            f'<path d="{MIC}" fill="none" stroke="{band}" stroke-width="7" stroke-linecap="round"/><circle cx="130" cy="152" r="9" fill="{band}"/>')


def svg(w, h, inner, title, bg=None):
    rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{rect}{inner}</svg>\n')


def wordmark(color, dot, size, x0, baseline):
    """'deskie' with a dotless i and a round dot in `dot`, so the dot can carry the brand colour."""
    d, end, pos = word("deskıe", size, x0, baseline)  # dotless i (U+0131) at index 4
    ipos = pos[4]
    cx, r = ipos[1] + ipos[2] / 2, size * 0.075
    ydot = baseline - size * 0.70
    return f'<path d="{d}" fill="{color}" stroke="{color}" stroke-width="{size*0.012:.2f}" stroke-linejoin="round"/><circle cx="{cx:.1f}" cy="{ydot:.1f}" r="{r:.1f}" fill="{dot}"/>', end


def horizontal(mark_kw, text_color, dot, bg=None, mono=None, title="Deskie"):
    size, base, x0 = 118, 134, 238
    word_svg, end = wordmark(text_color, dot, size, x0, base)
    return svg(int(end + 20), 200, mascot(**mark_kw) + word_svg, title, bg)


files = {}
files["deskie-mark.svg"] = svg(200, 200, mascot(), "Deskie mascot")
files["deskie-logo.svg"] = horizontal({}, INK, TEAL)
files["deskie-logo-on-dark.svg"] = horizontal({"band": "#7FE0D2", "face": INK}, WHITE, CORAL, bg=INK)
files["deskie-logo-mono-black.svg"] = horizontal({"mono": "#000000", "uid": "mb"}, "#000000", "#000000", title="Deskie, one colour")
files["deskie-logo-mono-white.svg"] = horizontal({"mono": "#FFFFFF", "uid": "mw"}, "#FFFFFF", "#FFFFFF", bg="#000000", title="Deskie, one colour, white")
files["deskie-profile.svg"] = svg(400, 400, f'<circle cx="200" cy="200" r="200" fill="{MINT}"/><g transform="translate(60 52) scale(1.4)">{mascot()}</g>', "Deskie profile picture")

# favicon: white speech bubble with a teal face on a teal tile; legible at 16 px
fav = (f'<rect width="64" height="64" rx="14" fill="{TEAL}"/>'
       f'<path d="M20 15 H44 A11 11 0 0 1 55 26 V34 A11 11 0 0 1 44 45 H27 L16 55 L18 45 A11 11 0 0 1 9 34 V26 A11 11 0 0 1 20 15 Z" fill="#fff" transform="translate(0 -1)"/>'
       f'<ellipse cx="25" cy="28" rx="3.4" ry="4.2" fill="{DEEP}"/><ellipse cx="39" cy="28" rx="3.4" ry="4.2" fill="{DEEP}"/>'
       f'<path d="M26 36 Q32 42 38 36" fill="none" stroke="{DEEP}" stroke-width="3.2" stroke-linecap="round"/>')
files["favicon.svg"] = svg(64, 64, fav, "Deskie favicon")

for name, content in files.items():
    (OUT / name).write_text(content)
print("wrote", ", ".join(files))
