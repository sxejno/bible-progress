---
name: ship
description: Deploy/release checklist — service-worker cache bumping, how updates reach users, adding a new page (SW + sitemap + links), git branch/PR conventions. Use before committing any change that ships, when adding an HTML page, or when users report stale versions.
---

# Shipping changes

Deployment = merge to `main` → GitHub Pages serves the repo as-is at
bibleprogress.com (domain via `CNAME`). No build step; what you commit is what
ships. Never push untested changes to main — branch (`claude/<feature>-<id>`),
PR, merge.

## Service worker: what to bump (service-worker.js)

| Constant (top of file) | Bump when |
|---|---|
| `CACHE_NAME = 'bible-progress-vN'` | **any change to precached HTML/assets** — old caches with other names are deleted on activate |
| `CDN_CACHE = 'bible-progress-cdn-v1'` | only if the CDN URL set changes and stale copies must die (it's version-independent by design — do NOT bump it routinely) |

Also keep in sync:
- `ASSETS_TO_CACHE` — precache list (lightweight pages + small JSON). Installed
  atomically: one bad path fails the whole install.
- `LARGE_DATA_ASSETS` — `kjv_bible.json`, `bsb.txt`, `bible-explorer.html`,
  `biblical-languages-trainer.html`: cached only via the Settings "download
  offline" flow. Heavy files go here, never in the precache.
- `CDN_RESOURCES` / `CDN_HOSTS` — must mirror the CDN `<script>`/font URLs in
  index.html (comment in file says so). Chart.js is pinned to an exact version in
  BOTH places — change together.

Fetch strategy (for reasoning about staleness): HTML = network-first (updates land
immediately when online); same-origin `.json`/`.txt` = stale-while-revalidate;
other same-origin = cache-first; cross-origin = network-first with CDN_CACHE
fallback.

## How an update reaches users

SW registration (index.html, grep `serviceWorker.register`) checks for updates
every 60s; a new SW `skipWaiting()`s and the `updatefound` handler shows a toast
("New version available!" with a Refresh action). If you change SW logic itself,
test the update path: load old, deploy new, wait/trigger update, click Refresh.

## Adding a new HTML page — do ALL of these together

1. Create the page (self-contained; share `darkMode` localStorage key for theme;
   only read `kjv_v6_data` if it needs progress data — see horner.html/memorize.html).
2. `service-worker.js`: add to `ASSETS_TO_CACHE` (or `LARGE_DATA_ASSETS` if heavy)
   AND bump `CACHE_NAME`.
3. `sitemap.xml`: add a `<url>` block (loc/lastmod/changefreq/priority); bump
   `<lastmod>` on pages you edited. Retired/noindex pages stay out.
4. Link it from index.html (study-tools list in `view-tools` or footer).
5. `robots.txt` is already allow-all — optional style-only `Allow:` line.
6. Retiring a page: keep a tiny redirect stub with `noindex` (pattern:
   `first-letter-method.html`, `index-classic.html`).

## Pre-merge checklist

- [ ] `verify` skill run (headless E2E) on the changed flows
- [ ] `CACHE_NAME` bumped if any precached asset changed
- [ ] Word-count invariant still holds if you were anywhere near the bible array
      (see `bible-data` skill for the one-liner)
- [ ] CLAUDE.md / TODO.md updated if structure or roadmap state changed
- [ ] Commit messages descriptive; PR describes user-visible impact

## Repo oddities worth knowing

- `build/` is NOT a site build — it's the offline data pipeline that regenerates
  `bible-explorer.html`'s embedded gzip+base64 bundle (`pipeline.py`,
  `pipeline2.py`, sources in `build/raw/`). Hardcoded old paths; run only if you
  must regenerate Explorer data.
- `404.html` is the GitHub Pages fallback; static, rarely needs changes.
