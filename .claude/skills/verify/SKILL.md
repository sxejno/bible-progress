---
name: verify
description: Launch and drive bibleprogress.com (single-file PWA, index.html) in headless Chromium to verify changes end-to-end.
---

# Verifying bible-progress changes

Static single-file PWA — no build step. Serve the repo root and drive it with
Playwright (`playwright` is installed globally; browser at `/opt/pw-browsers`).

## Launch recipe

1. Serve: `python3 -m http.server 8471 --bind 127.0.0.1` from the repo root (background).
2. Launch Chromium with the agent proxy but bypass loopback — Playwright's
   `proxy:` option forces even 127.0.0.1 through the proxy (`<-loopback>`), so
   pass raw args instead:
   ```js
   chromium.launch({ args: [`--proxy-server=${process.env.HTTPS_PROXY}`,
                            '--proxy-bypass-list=127.0.0.1;localhost'] })
   ```
3. `newContext({ ignoreHTTPSErrors: true, serviceWorkers: 'block', ... })`.
   **`serviceWorkers: 'block'` is required**: after first load the SW controls
   the page and its fetches bypass `page.route`, so the CDN stubs stop working
   and the app module dies silently on reload.
4. The environment's network policy 403-blocks the CDNs (`cdn.tailwindcss.com`,
   `cdn.jsdelivr.net`, `www.gstatic.com/firebasejs/*`, `fonts.googleapis.com`).
   The main script is a `type="module"` with static Firebase imports — if they
   fail, **no JS runs at all**. Stub via `page.route`:
   - Tailwind: `npm pack @tailwindcss/browser@4` → serve `dist/index.global.js`
   - Chart.js: `npm pack chart.js@4` → serve `dist/chart.umd.js`
   - Firebase app/auth/firestore/analytics: tiny ES-module stubs exporting the
     names index.html imports (`initializeApp`, `getAuth`, `onAuthStateChanged`
     → call back with `null`, `getFirestore`, `getDoc` → `{ exists: () => false }`,
     `onSnapshot` → unsubscribe fn, etc.)
   (`registry.npmjs.org` is allowlisted; jsdelivr/unpkg are not.)

## Driving the app

- Fresh profile shows an intro overlay: click a plan button (e.g. text
  `Prof. Horner`), then `Start Reading`.
- Jump around via `window.setTab('PLAN'|'HOME'|...)`; change plan via the
  `#plan-selector` select + `window.changePlan()`.
- App state: `localStorage['kjv_v6_data']`. `appData` is module-scoped — NOT
  reachable from `page.evaluate`; read localStorage instead, and wait ~3s after
  an action for the debounced save to flush.
- **Seeding state**: the app flushes a debounced save on unload, clobbering
  anything you wrote to localStorage from the app page. Navigate to a non-app
  page on the same origin first (e.g. `/robots.txt`), write localStorage there,
  then `goto` index.html.

## Gotchas

- The blocked-SW console error `Service Worker registration failed ... 'scope'`
  is a harness artifact, ignore it.
- The fixed bottom tab bar overlaps force-clicks; use normal (non-force) clicks
  so Playwright scrolls elements into an actionable position.
