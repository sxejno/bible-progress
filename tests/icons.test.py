#!/usr/bin/env python3
"""Icon-set invariants. Run: python3 tests/icons.test.py

Guards the things that break silently in production: a manifest entry whose
declared size doesn't match the file, a service-worker precache list pointing at
a file that isn't there (install() aborts atomically), a page linking a deleted
icon, and maskable icons whose art spills outside the safe circle.
"""
import json
import math
import pathlib
import re
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SAFE = 0.4          # maskable safe circle: centre 80% of the canvas


def check():
    fail = []

    manifest = json.loads((ROOT / 'manifest.json').read_bytes())
    for icon in manifest['icons']:
        path = ROOT / icon['src']
        if not path.exists():
            fail.append(f'manifest icon missing: {icon["src"]}')
            continue
        if icon['sizes'] != 'any':
            w, h = Image.open(path).size
            if f'{w}x{h}' != icon['sizes']:
                fail.append(f'{icon["src"]}: real {w}x{h} != declared {icon["sizes"]}')
        if 'maskable' in icon['purpose'] and path.suffix == '.png':
            im = Image.open(path).convert('RGBA')
            w = im.width
            px, bg = im.load(), im.getpixel((0, 0))
            reach = max((math.hypot(x - w / 2, y - w / 2)
                         for y in range(w) for x in range(w) if px[x, y] != bg),
                        default=0)
            if reach > w * SAFE:
                fail.append(f'{icon["src"]}: art reaches r={reach:.0f} > safe {w * SAFE:.0f}')

    sw = (ROOT / 'service-worker.js').read_bytes().decode()
    listed = re.search(r'ASSETS_TO_CACHE = \[(.*?)\];', sw, re.S).group(1)
    for asset in re.findall(r"'/([^']+\.(?:png|ico|svg))'", listed):
        if not (ROOT / asset).exists():
            fail.append(f'service-worker precaches missing file: {asset}')

    for page in sorted(ROOT.glob('*.html')):
        html = page.read_bytes().decode('utf-8', 'replace')
        for ref in re.findall(
                r'(?:href|src|content)="(?:https://bibleprogress\.com/)?/?'
                r'([\w.-]+\.(?:png|ico|svg))"', html):
            if not (ROOT / ref).exists():
                fail.append(f'{page.name} references missing {ref}')

    return fail


if __name__ == '__main__':
    problems = check()
    for p in problems:
        print('FAIL', p)
    print(f'{len(problems)} problem(s)' if problems else 'OK — icon set is consistent')
    sys.exit(1 if problems else 0)
