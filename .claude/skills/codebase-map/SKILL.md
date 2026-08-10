---
name: codebase-map
description: Navigate index.html (~15,000-line single-file PWA) — section layout, grep anchors for every subsystem, tab/render dispatch, window-handler conventions. Use FIRST when locating code, before editing anything, or when asked "where does X live".
---

# Codebase map — index.html

Everything lives in one file. Line numbers below are hints (accurate as of 2026-07,
15,089 lines) and WILL drift — always grep the anchor strings instead; each appears
exactly once unless noted.

## Top-level layout

| Lines (approx) | Section |
|---|---|
| 1–436 | `<head>`: SEO metas, JSON-LD (`application/ld+json`), CDN scripts (Tailwind, Chart.js 4.5.1), inline `<style>` at 75 |
| 437–2185 | `<body>` markup: skip link (438), modals, header (705–820), tab bar (821), tab views |
| 2186–14954 | `<script type="module">` — ALL app JS (Firebase ESM imports first; if they fail, **no JS runs at all**) |
| 14957–15085 | Post-script HTML: `plan-builder-modal`, bottom nav (`bnav-*`) |

Tab views: `view-dashboard` · `view-books` · `view-plan` · `view-stats` · `view-tools`
· `view-about` · `view-settings` · `view-chapters` (book drill-down). All except
dashboard start `.hidden`.

## JS sections in order (grep the `// ---` banner comments)

| Anchor comment | Contents |
|---|---|
| `// --- FIREBASE IMPORTS ---` | ESM imports, firebase 10.8.0 |
| `const CONFIG = {` | `STORAGE_KEY_DATA: 'kjv_v6_data'`, debounce ms, `TOTAL_WORD_COUNT: 789634` |
| `// --- CUSTOM MODAL SYSTEM ---` | `showCustomModal`, `showAlert/showConfirm/showPrompt/showProfilePicker`, `createFocusTrap`, `enhanceDynamicModal` |
| `// --- VALIDATE APP DATA ---` | `FORBIDDEN_KEYS`, `validateAppData`, `normalizeAppData` |
| `// --- APP STATE & MIGRATION ---` | `let appData = savedData \|\|`, all migrations |
| `// --- UTILITY FUNCTIONS ---` | `getLocalDateString` (device-local day boundary) |
| `// --- HORNER DAILY PROGRESS HELPERS ---` / `// --- HORNER CYCLE (READ-THROUGH) TRACKING ---` | Horner state |
| `// --- AUTH LOGIC ---` | login/logout, `onAuthStateChanged`, `processCloudSnapshot` |
| `// --- TOAST NOTIFICATIONS (ENHANCED) ---` | `window.showToast`, `showMicroToast` |
| `// --- GLOBAL FUNCTIONS ---` | `window.saveProgress` — THE save function |
| `// --- PROFILE MANAGEMENT ---` | switch/create/delete/rename profile |
| `// --- CORE DATA ---` | `const bible = [{"name":"Genesis"...` — one giant line, 66 books |
| `// --- READING PLANS ---` | `PLAN_HORNER`, `PLAN_MCHEYNE`, `PLAN_FIVE_DAY`, `WORD_TOTALS`, `changePlan` |
| `// --- BIBLE READER ---` | `loadBibleText`, `openBibleReader`, `renderBibleChapter`, memorization |
| `// --- GLOBAL EXPORTS ---` | bulk `window.*` assignments incl. `setTab`, `toggleChapter`, exports (CSV/Obsidian/PDF/backup) |
| `// --- RENDER FUNCTIONS ---` | render region begins; goals, grids, heatmap, streaks |
| `// --- CUSTOM PLAN BUILDER ---` | plan-builder modal logic |
| `// --- DASHBOARD RENDERING ---` | `renderDashboard`, `getDashboardPlanChapters` |
| `// --- DEEP STATS: VELOCITY + ETA + RECORDS ---` | `renderDeepStats`, `renderStatsPage` |
| (easter-egg region, ~14059–14425) | EE1 Konami · EE2 rainbow (7× profile dot) · EE3 Psalm 119 · EE4 completion · EE5 creator-name (wraps setTab) · EE6 seasonal. **`escapeHtml` is defined here** (`function escapeHtml(s)`) though used globally |
| `// --- DARK MODE FEATURE ---` | `toggleDarkMode`, settings toggles, `downloadOfflineData` |
| `// --- READING SPEED CALIBRATION ---` | WPM calibration modal |
| `// --- SERVICE WORKER REGISTRATION FOR PWA ---` | SW register + update toast |

## Tabs & rendering

- `window.setTab(t)` — tabs: `DASHBOARD, ALL, PLAN, STATS, TOOLS, SETTINGS, ABOUT`.
  Hides all `view-*`, shows the target, then dispatches: DASHBOARD→`renderDashboard()`,
  STATS→`renderStatsPage()`, PLAN→`renderDailyPlan()` + `renderGoals()`, ALL→book grid.
- ⚠️ **`window.setTab` and `window.toggleChapter` are each defined twice**: the real
  implementation first, then re-wrapped by easter-egg code (grep `originalSetTab` /
  `originalToggleChapter`). When patching, edit the original, not the wrapper.
- Init kick-off: `window.setTab(appData.defaultTab || 'DASHBOARD')` near the end of
  the script.

## Handler conventions

- HTML uses inline `onclick="window.foo(...)"`; every handler is attached to `window`
  (`window.foo = ...`), mostly in/after `// --- GLOBAL EXPORTS ---`.
- Core handlers: `toggleChapter` (mark/unmark one chapter — the heart of the app),
  `markChaptersAsRead`, `toggleAllInBook`, `openBook`, `changePlan`,
  `openBibleReader`, `toggleMemorizeVerse`, `switchProfile`, `backupData`/`restoreData`.

## Core utilities (grep-able signatures)

- `function escapeHtml(s)` — escape ALL user data before innerHTML.
- `function isValidHttpsUrl(` — validate any URL used as src/href.
- `function validateAppData(data)` / `function normalizeAppData(data)` — run on all
  three load paths (localStorage, cloud snapshot, JSON import).
- `function getLocalDateString(timestamp)` — the ONLY correct way to get a day key
  (device-local). Never use `new Date("YYYY-MM-DD").getDay()` (UTC parse bug).
- `function createFocusTrap(container)` + `enhanceDynamicModal(modal)` — required for
  any new modal (Escape-to-close, focus restore).

## Related skills

`data-model` (appData/schema changes) · `cloud-sync` (Firebase) · `reading-plans` ·
`stats-streaks` · `bible-data` (word counts, reader) · `add-feature` (conventions) ·
`ship` (deploy/SW) · `security-audit` · `troubleshoot` · `verify` (headless testing).
