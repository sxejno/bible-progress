---
name: troubleshoot
description: Symptom → cause playbook for the app's classic failure modes — blank/unresponsive app, stale deploys, sync weirdness, timezone bugs, double-defined functions, console debugging of module-scoped state. Use when debugging any misbehavior before diving into code.
---

# Troubleshooting playbook

## App loads but nothing works (no JS at all)

The entire app is ONE `<script type="module">` whose first lines are static
Firebase imports from `www.gstatic.com`. If any import fails (network filter, CDN
outage), **zero JS executes** — buttons dead, no console errors beyond the failed
import. Check the Network tab for the firebasejs requests first. (The `verify`
skill stubs these for headless testing.)

## Users see an old version

- HTML is network-first, so a hard refresh usually fixes it; the real fix is
  bumping `CACHE_NAME` in service-worker.js when precached assets change (see
  `ship` skill).
- New SW shows a "New version available!" toast with a Refresh action; update
  check runs every 60s.
- Debugging locally: DevTools → Application → Service Workers → "Update on
  reload" / "Bypass for network"; delete `bible-progress-v*` caches.

## Inspecting state (appData is NOT on window)

`appData` is module-scoped — unreachable from the console. Instead:

```js
JSON.parse(localStorage.kjv_v6_data)          // current persisted state
```

Saves are debounced (1s local, 3s cloud) — wait ~3s after an action before reading
localStorage, or trigger a flush by backgrounding the tab (visibilitychange →
immediate save). ⚠️ Writing localStorage from an open app page is futile: unload
flushes the in-memory state over it (seed from another same-origin page — recipe
in the `verify` skill).

## Sync symptoms

| Symptom | Likely cause |
|---|---|
| Field vanishes after login | missing merge-back block in `processCloudSnapshot` (see `cloud-sync`) |
| Unmarked chapters resurrect | tombstone missing/older than read ts — inspect `deletedChapters` in both devices' blobs |
| Amber "Sync Issue" pill | onSnapshot/write error — console + Firestore rules |
| Edits flicker back | edit gating (`userIsEditing`, 2s `EDIT_COOLDOWN_MS`) — expected within 2s |
| Old device overwrites new | `lastModified` not stamped by some save path |

## Date/timezone bugs

Wrong weekday/day attribution almost always means someone used
`new Date("YYYY-MM-DD")` (parses UTC) instead of `getDayOfWeekFromDateString`, or
bypassed `getLocalDateString`. Day boundaries are device-local (TODO.md's
"Eastern Time" notes are stale). Test by faking the system TZ:
`TZ=Pacific/Kiritimati` vs `TZ=America/Los_Angeles`.

## "I patched setTab/toggleChapter and nothing changed"

Both are re-wrapped by easter-egg code after definition (grep `originalSetTab`,
`originalToggleChapter`). Patch the original; the wrapper delegates.

## Rendering quirks

- Dark mode is a global CSS invert filter — distorted images/canvases need
  `data-no-invert` (charts already re-inverted). True-dark redesign is a roadmap
  item; don't fight the filter per-element.
- Charts look stale/duplicated: chart instances are cached (`mainChart`,
  `miniCharts`, `velocityChart`) — mutate + `.update('none')`, never `new Chart`
  on every render.
- "Today's plan" stale after changing data by hand: clear the pinned cache
  `appData.dailyPlanProgress[profile]` (see `reading-plans`).
- Horner cycle count didn't increment: by design — a read-through only counts when
  the OLDEST chapter timestamp in the list exceeds the watermark (`hornerCycleLastAt`).

## Storage quota

`saveToLocalStorage` catches `QuotaExceededError` and toasts. If hit: usual
culprit is enormous memorizedVerses/import blobs; check blob size
`localStorage.kjv_v6_data.length`.

## Streak milestone fired twice / never

Milestone flags live in bare localStorage keys (`streakMilestone_<profile>_<days>`),
outside appData — they don't sync or export; clearing site data re-arms them.
