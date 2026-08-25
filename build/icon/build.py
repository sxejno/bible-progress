#!/usr/bin/env python3
"""Rasterise build/icon/icon.svg into the icon set the site ships.

    python3 build/icon/icon.py && python3 build/icon/build.py

Renders once at 2048px through headless Chromium, trims to the artwork's alpha
bounds, then downsamples (Lanczos) into every target. Outputs are re-encoded
with oxipng at max effort, and the small ones are palette-quantised first.
"""
import io
import pathlib
import re
import sys

import oxipng
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
# the sandbox ships Chromium out-of-band, so point Playwright at it directly
CHROME = pathlib.Path('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
SRC = pathlib.Path(__file__).with_name('icon.svg')
MASTER = 2048
WHITE = (255, 255, 255, 255)

# name, size, margin (share of the canvas left empty on every side), background
TARGETS = [
    ('favicon.png', 96, 0.02, None),
    ('icon-192.png', 192, 0.02, None),
    ('icon-512.png', 512, 0.02, None),
    # 0.18 keeps every pixel inside the maskable safe circle (centre 80%),
    # allowing for the artwork's corners, not just its width
    ('icon-192-maskable.png', 192, 0.18, WHITE),
    ('icon-512-maskable.png', 512, 0.18, WHITE),
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


def fit(master: Image.Image, size: int, margin: float, bg):
    """Centre the trimmed artwork in a `size` square with `margin` breathing room."""
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
