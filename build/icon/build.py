#!/usr/bin/env python3
"""Rasterise build/icon/icon.svg into the icon set the site ships.

    python3 build/icon/icon.py && python3 build/icon/build.py

Dependencies: pip install numpy pillow playwright fonttools pyoxipng

Renders once at 2048px through headless Chromium, then downsamples (Lanczos)
into every target. Square targets trim to the artwork's alpha bounds and centre
that box; maskable targets instead find the artwork's smallest enclosing circle
and scale it to fill the safe zone exactly, so launchers that crop to a circle
show as little dead space as the spec allows. Outputs are re-encoded with
oxipng at max effort, and the small ones are palette-quantised first.
"""
import io
import math
import pathlib
import re
import sys

import numpy as np
import oxipng
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
# the sandbox ships Chromium out-of-band, so point Playwright at it directly
CHROME = pathlib.Path('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
SRC = pathlib.Path(__file__).with_name('icon.svg')
MASTER = 2048
WHITE = (255, 255, 255, 255)
SAFE = 0.4      # maskable safe circle: radius as a share of the canvas (centre 80%)
GUARD = 0.01    # share of the canvas kept between the art and that circle, for
                # resampling halo — tests/icons.test.py rejects a single pixel over

# name, size, margin (share of the canvas left empty on every side, or
# 'circle' for the enclosing-circle fit into the maskable safe zone), background
TARGETS = [
    ('favicon.png', 96, 0.02, None),
    ('icon-192.png', 192, 0.02, None),
    ('icon-512.png', 512, 0.02, None),
    ('icon-192-maskable.png', 192, 'circle', WHITE),
    ('icon-512-maskable.png', 512, 'circle', WHITE),
    ('apple-touch-icon.png', 180, 0.06, WHITE),
    ('og-image.png', 512, 0.06, WHITE),   # social cards choke on transparency
]
ICO_SIZES = [16, 32, 48]   # legacy fallback only; favicon.svg carries the rest


def render_master() -> Image.Image:
    svg = SRC.read_text()
    html = ('<body style="margin:0;background:transparent">'
            f'<div style="width:{MASTER}px;height:{MASTER}px">{svg}</div>')
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=str(CHROME) if CHROME.exists() else None,
            args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': MASTER, 'height': MASTER},
                                device_scale_factor=1)
        page.set_content(html)
        shot = page.screenshot(omit_background=True, type='png')
        browser.close()
    return Image.open(io.BytesIO(shot)).convert('RGBA')


def enclosing_circle(master: Image.Image):
    """Smallest circle around every opaque pixel: (cx, cy, r) in master pixels.

    Bădoiu–Clarkson iteration over the alpha outline — each step walks the
    centre toward the farthest point by a shrinking fraction, converging on the
    true minimum enclosing circle to within 1/steps of its radius.
    """
    alpha = np.asarray(master)[:, :, 3] > 0
    inner = np.zeros_like(alpha)
    inner[1:-1, 1:-1] = (alpha[1:-1, 1:-1] & alpha[:-2, 1:-1] & alpha[2:, 1:-1]
                         & alpha[1:-1, :-2] & alpha[1:-1, 2:])
    ys, xs = np.nonzero(alpha & ~inner)
    pts = np.stack([xs, ys], axis=1).astype(float) + 0.5
    c = pts.mean(axis=0)
    steps = 4000
    for i in range(1, steps + 1):
        far = pts[np.argmax(((pts - c) ** 2).sum(axis=1))]
        c += (far - c) / (i + 1)
    r = math.sqrt(((pts - c) ** 2).sum(axis=1).max())
    return c[0], c[1], r * (1 + 1 / steps)


def fit_circle(master: Image.Image, size: int, bg):
    """Scale the artwork so its enclosing circle fills the maskable safe zone,
    and put that circle's centre on the canvas centre."""
    cx, cy, r = enclosing_circle(master)
    scale = size * (SAFE - GUARD) / r
    art = master.resize((max(1, round(master.width * scale)),
                         max(1, round(master.height * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), bg or (0, 0, 0, 0))
    canvas.alpha_composite(art, (round(size / 2 - cx * scale),
                                 round(size / 2 - cy * scale)))
    return canvas


def fit(master: Image.Image, size: int, margin, bg):
    """Centre the trimmed artwork in a `size` square with `margin` breathing room."""
    if margin == 'circle':
        return fit_circle(master, size, bg)
    art = master.crop(master.getbbox())
    inner = round(size * (1 - 2 * margin))
    scale = inner / max(art.size)
    art = art.resize((max(1, round(art.width * scale)),
                      max(1, round(art.height * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), bg or (0, 0, 0, 0))
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas


def encode(img: Image.Image, path: pathlib.Path, quantise: bool):
    # a 256-colour palette costs a trace of gradient banding and saves ~6x;
    # FASTOCTREE is the only Pillow method that keeps the alpha channel
    if quantise:
        img = img.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.NONE)
    buf = io.BytesIO()
    img.save(buf, 'PNG', optimize=True)
    data = oxipng.optimize_from_memory(
        buf.getvalue(), level=6, strip=oxipng.StripChunks.safe(),
        optimize_alpha=True, interlace=oxipng.Interlacing.Off)
    path.write_bytes(data)
    return len(data)


def minify_svg() -> int:
    """Ship the vector itself as the primary favicon — sharp at any tab size."""
    svg = SRC.read_text()
    svg = re.sub(r'<!--.*?-->', '', svg, flags=re.S)
    svg = re.sub(r'(\d+\.\d+)', lambda m: f'{float(m.group(1)):g}', svg)
    svg = re.sub(r'>\s+<', '><', svg).strip()
    out = ROOT / 'favicon.svg'
    out.write_text(svg)
    return len(svg)


def main():
    master = render_master()
    for name, size, margin, bg in TARGETS:
        img = fit(master, size, margin, bg)
        n = encode(img, ROOT / name, quantise=True)
        print(f'{name:26} {size:>4}px  {n / 1024:6.1f} KB')

    print(f'{"favicon.svg":26} {"vector":>7}  {minify_svg() / 1024:6.1f} KB')

    frames = [fit(master, s, 0.02, None).quantize(
        colors=256, method=Image.FASTOCTREE, dither=Image.NONE).convert('RGBA')
        for s in ICO_SIZES]
    ico = ROOT / 'favicon.ico'
    frames[-1].save(ico, format='ICO',
                    sizes=[(s, s) for s in ICO_SIZES], append_images=frames[:-1])
    print(f'{"favicon.ico":26} {"multi":>7}  {ico.stat().st_size / 1024:6.1f} KB')


if __name__ == '__main__':
    sys.exit(main())
