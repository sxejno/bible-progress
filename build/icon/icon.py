#!/usr/bin/env python3
"""Source of truth for the Bible Progress app icon.

Emits an SVG (vector art, text converted to outlines) which is then rasterised
by build/icon/build.py into the PNG/ICO set the site ships.

Design: black leather Bible with gold "HOLY BIBLE" and gilt page edges, wrapped
by a teal progress ring that breaks for a gold-rimmed check badge, teal ribbon
bookmark hanging from the foot.
"""
import math

W = 512

# ---- palette -------------------------------------------------------------
TEAL_HI, TEAL_MID, TEAL_LO = '#3FE3DA', '#16C6C6', '#079C9F'
GOLD_HI, GOLD_MID, GOLD_LO = '#FFE9A8', '#F2B01E', '#B9760A'
INK_HI, INK_LO = '#333C47', '#0C1014'
CREAM = '#FFF7E6'

# ---- geometry ------------------------------------------------------------
RING_CX, RING_CY, RING_R, RING_W = 256.0, 262.0, 196.0, 25.0
GAP_A, GAP_B = 28.0, 66.0          # ring gap (degrees, CCW from east)
BADGE_A = 47.0                     # check badge sits in the gap
BADGE_R = 60.0

COVER = (128.0, 94.0, 386.0, 412.0)   # x0, y0, x1, y1
PAGES = (146.0, 112.0, 406.0, 434.0)  # gilt block, offset so its edge shows
SPINE = (84.0, 98.0, 134.0, 412.0)
CORNER = 14.0


def polar(deg, r=RING_R):
    a = math.radians(deg)
    return RING_CX + r * math.cos(a), RING_CY - r * math.sin(a)


def rounded(x0, y0, x1, y1, r, corners='all'):
    """Rounded rect path; `corners` selects which corners get the radius."""
    tl = corners in ('all', 'left', 'top')
    tr = corners in ('all', 'right', 'top')
    br = corners in ('all', 'right', 'bottom')
    bl = corners in ('all', 'left', 'bottom')
    p = [f'M{x0 + (r if tl else 0)},{y0}']
    p.append(f'H{x1 - (r if tr else 0)}')
    if tr:
        p.append(f'A{r},{r} 0 0 1 {x1},{y0 + r}')
    p.append(f'V{y1 - (r if br else 0)}')
    if br:
        p.append(f'A{r},{r} 0 0 1 {x1 - r},{y1}')
    p.append(f'H{x0 + (r if bl else 0)}')
    if bl:
        p.append(f'A{r},{r} 0 0 1 {x0},{y1 - r}')
    p.append(f'V{y0 + (r if tl else 0)}')
    if tl:
        p.append(f'A{r},{r} 0 0 1 {x0 + r},{y0}')
    return ' '.join(p) + ' Z'


def notched(x0, y0, x1, y1, c):
    """Rect with chamfered corners — the classic Bible cover rule."""
    return (f'M{x0 + c},{y0} H{x1 - c} L{x1},{y0 + c} V{y1 - c} '
            f'L{x1 - c},{y1} H{x0 + c} L{x0},{y1 - c} V{y0 + c} Z')


def wordmark():
    """'HOLY' / 'BIBLE' as filled outlines so the SVG needs no font."""
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen

    font = TTFont('/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf')
    upem = font['head'].unitsPerEm
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font['hmtx']

    def line(text, size, cx, baseline, tracking):
        names = [cmap[ord(ch)] for ch in text]
        adv = [hmtx[n][0] / upem * size for n in names]
        total = sum(adv) + tracking * (len(names) - 1)
        pen_x = cx - total / 2
        out = []
        for name, a in zip(names, adv):
            scale = size / upem
            tp = TransformPen(SVGPathPen(gs), (scale, 0, 0, -scale, pen_x, baseline))
            gs[name].draw(tp)
            out.append(tp._outPen.getCommands())
            pen_x += a + tracking
        return ' '.join(out)

    cx = (COVER[0] + COVER[2]) / 2
    return line('HOLY', 62, cx, 252, 3) + ' ' + line('BIBLE', 62, cx, 330, 3)


def build():
    (gx0, gy0), (gx1, gy1) = polar(GAP_B), polar(GAP_A)
    bx, by = polar(BADGE_A)

    # ring: one long arc that stops either side of the badge
    ring = (f'M{gx0:.1f},{gy0:.1f} A{RING_R},{RING_R} 0 1 0 {gx1:.1f},{gy1:.1f}')

    cx0, cy0, cx1, cy1 = COVER
    px0, py0, px1, py1 = PAGES
    sx0, sy0, sx1, sy1 = SPINE

    # striations across the exposed fore-edge and foot, so the gilt reads as leaves
    striations = []
    for i in range(1, 5):
        x = cx1 + (px1 - cx1) * i / 5
        striations.append(f'<path d="M{x:.1f},{cy0 + 24} V{py1 - CORNER}"/>')
    for i in range(1, 4):
        y = cy1 + (py1 - cy1) * i / 4
        striations.append(f'<path d="M{px0 + CORNER},{y:.1f} H{px1 - CORNER}"/>')

    bands = ''.join(
        f'<path d="M{sx0 + 6},{y} H{cx0 + 2}" stroke="{GOLD_MID}" stroke-width="5"/>'
        f'<path d="M{sx0 + 6},{y - 1} H{cx0 + 2}" stroke="{GOLD_HI}" stroke-width="1.4"/>'
        for y in (150, 208, 266, 324))

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" role="img" aria-label="Bible Progress">
<title>Bible Progress</title>
<defs>
<linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="{TEAL_HI}"/><stop offset=".5" stop-color="{TEAL_MID}"/><stop offset="1" stop-color="{TEAL_LO}"/>
</linearGradient>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="{GOLD_HI}"/><stop offset=".45" stop-color="{GOLD_MID}"/><stop offset="1" stop-color="{GOLD_LO}"/>
</linearGradient>
<linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="{GOLD_HI}"/><stop offset=".5" stop-color="{GOLD_MID}"/><stop offset="1" stop-color="{GOLD_LO}"/>
</linearGradient>
<linearGradient id="k" x1="0" y1="0" x2=".85" y2="1">
<stop offset="0" stop-color="{INK_HI}"/><stop offset="1" stop-color="{INK_LO}"/>
</linearGradient>
<linearGradient id="ks" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="{INK_LO}"/><stop offset=".55" stop-color="{INK_HI}"/><stop offset="1" stop-color="{INK_LO}"/>
</linearGradient>
</defs>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<!-- progress ring -->
<path d="{ring}" stroke="url(#t)" stroke-width="{RING_W}"/>
<!-- ribbon bookmark, tucked behind the book -->
<path d="M226,368 H274 V502 L250,476 226,502 Z" fill="url(#t)" stroke="none"/>
<!-- gilt page block -->
<path d="{rounded(px0, py0, px1, py1, CORNER)}" fill="url(#gv)" stroke="none"/>
<g stroke="{GOLD_LO}" stroke-width="1.4" opacity=".55" stroke-linecap="butt">{''.join(striations)}</g>
<!-- spine -->
<path d="{rounded(sx0, sy0, sx1, sy1, 16, 'left')}" fill="url(#ks)" stroke="none"/>
<g stroke-linecap="butt">{bands}</g>
<!-- front board -->
<path d="{rounded(cx0, cy0, cx1, cy1, CORNER)}" fill="url(#k)" stroke="none"/>
<!-- cover rule -->
<path d="{notched(cx0 + 24, cy0 + 24, cx1 - 24, cy1 - 24, 16)}" stroke="url(#g)" stroke-width="5"/>
<path d="{notched(cx0 + 34, cy0 + 34, cx1 - 34, cy1 - 34, 11)}" stroke="url(#g)" stroke-width="2" opacity=".8"/>
<!-- wordmark -->
<path d="{wordmark()}" fill="url(#gv)" stroke="none"/>
<!-- check badge -->
<circle cx="{bx:.1f}" cy="{by:.1f}" r="{BADGE_R}" fill="#0B4F55" stroke="url(#g)" stroke-width="9"/>
<path d="M{bx - 24:.1f},{by + 2:.1f} l16,17 l32,-35" stroke="{CREAM}" stroke-width="13"/>
</g>
</svg>
'''


if __name__ == '__main__':
    import pathlib
    out = pathlib.Path(__file__).with_name('icon.svg')
    out.write_text(build())
    print(f'wrote {out} ({out.stat().st_size} bytes)')
