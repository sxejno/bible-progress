---
name: reading-plans
description: How the six reading plans work (Sequential, One Year, M'Cheyne, Horner, Five-Day, Custom) — plan data, today's-reading computation, daily pinning, Horner cycle tracking, custom plan builder. Use when modifying plan logic, adding a plan, or debugging "wrong reading shown today".
---

# Reading plans

Six plans; the exact IDs (from the `#plan-selector` `<option>` values) are:
`SEQUENTIAL`, `ONE_YEAR`, `MCHEYNE`, `HORNER`, `FIVE_DAY`, `CUSTOM`.
⚠️ It's `ONE_YEAR` with underscore — older docs said `ONEYEAR`.
Active plan: module-scoped `activePlan`, persisted per profile in
`appData.profilePlans[activeProfileId]`. Grep anchors; line numbers drift.

## Shared machinery

- **One render entry point**: `window.renderDailyPlan()` — a branch per plan builds
  a `computeFn` returning today's chapter cards, wrapped by
  `getPinnedDailyChapters(profileId, planType, computeFn)`.
- **Pinning**: `appData.dailyPlanProgress[pid] = {date, plan, chapters}` caches
  today's computed reading so marking a chapter doesn't shuffle the list mid-day.
  Cleared (`{date:'', plan:'', chapters:[]}`) by `changePlan`, `saveCustomPlan`,
  `activateCustomPlan` to force recompute. If "today's reading looks stale", this
  cache is the first suspect.
- **Progress attribution is plan-independent**: cards call
  `window.markChaptersAsRead(...)` / `window.toggleChapter(id)` which write
  `prog["Book-Ch"] = Date.now()` into `appData.profiles[activeProfileId]`. No plan
  has its own read-ledger except Horner's daily/cycle extras. "Done today" =
  `getLocalDateString(ts) === getTodaysDate()`.
- Dashboard mirror: `getDashboardPlanChapters()` (compact copy of the same logic —
  keep in sync when changing a plan's rules).

## Per-plan notes

| Plan | Data | Today's reading |
|---|---|---|
| SEQUENTIAL | canonical `bible` order | next 3 unread (or read-today) chapters |
| ONE_YEAR | `bible` split by testament | next 3 OT + 1 NT; "Day N" ≈ `ceil(read/4)` of 365 |
| MCHEYNE | `const PLAN_MCHEYNE=[{d,r:[refs]}]` (inline, 365 days) | first day with an unread ref; refs parsed by `normalizeBookName` + `getChaptersFromStr`; first 2 refs = "Family", rest "Secret" |
| HORNER | `const PLAN_HORNER = [` (10 lists) + `HORNER_LIST_NAMES` | one chapter per list via `getNextHornerChapter` |
| FIVE_DAY | `const PLAN_FIVE_DAY =` (inline; comment "from fivedayplan.json" — the JSON file is NOT fetched at runtime) | first week with an unread ref, weekday 1–5 (weekend → day 1) |
| CUSTOM | `appData.customPlans[pid]`, `getActiveCustomPlan()` | four streams: `config.ot` (OT minus Psalms/Proverbs), `config.nt`, `config.psalms`, `config.proverbs` — N chapters each |

## Horner details (the tricky one)

Per-profile state:
- `hornerDailyProgress[pid] = {date, completedLists:[idx]}` — which of the 10 lists
  were completed today. `resetHornerDailyProgressIfNeeded()` replaces it when
  `date !== getTodaysDate()` (called on load and in the render branch).
- `hornerCycleCount[pid][listIdx]` — completed read-throughs per list.
- `hornerCycleLastAt[pid][listIdx]` — watermark timestamp.

Cycle counting (`checkHornerCycleCompletion`): a read-through counts only when the
OLDEST timestamp across the whole list (`minTs`) is newer than the watermark —
order-independent, so re-marking one chapter can never inflate the count.
`ensureHornerCycleCount` back-fills watermarks for existing users to avoid a
spurious +1. `getNextHornerChapter` returns the first unread chapter, or rotates
from the most-recently-read index once a list is fully read (`isNewCycle: true`).
`toggleChapter` has a HORNER branch: mark → `getHornerListForChapter` +
`markHornerListComplete` + cycle check; unmark → splice from `completedLists`.
The satellite page `horner.html` reads `kjv_v6_data` directly for analytics.

## Changing plans — `window.changePlan()`

Sets `userIsEditing` (2s cloud-sync gate) → updates `activePlan` +
`profilePlans[pid]` → clears `dailyPlanProgress[pid]` → `trackPlanChange`
(appends to `appData.planHistory`) → if CUSTOM with no active plan, opens the
builder → `saveProgress(true)` → re-render. Chapter timestamps, Horner state and
custom plans are NOT reset by a plan change.

## Adding a new plan (recipe)

1. Add `<option>` to `#plan-selector` and a description entry where the other plans
   have theirs (grep an existing plan's description text).
2. Add inline data constant near `// --- READING PLANS ---` (inline, no fetch).
3. Add a branch in `renderDailyPlan` building a `computeFn` (copy SEQUENTIAL as the
   minimal template) AND a matching case in `getDashboardPlanChapters`.
4. Add the ID to `planLabels` used by Obsidian/PDF exports (a missing label was a
   past bug — grep `planLabels`).
5. Test: plan selector switch, mark/unmark from card, dashboard tile, next-day
   rollover (pinning), export labels.
