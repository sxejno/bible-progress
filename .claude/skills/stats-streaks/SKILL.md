---
name: stats-streaks
description: Streaks, heatmap, charts, goals, and date handling — the exact streak rules, day-boundary pitfalls, Chart.js instance caching, dark-mode chart quirk, and goal pace math. Use when touching stats/dashboard rendering, streak logic, or any date/timezone code.
---

# Stats, streaks, goals & dates

Grep anchors; line numbers drift.

## Date rules (source of most historical bugs)

- Day boundary = **device-local midnight**. `getLocalDateString(ts)` → `"YYYY-MM-DD"`
  is the ONLY correct day key. (History: day logic was once hardcoded US Eastern,
  then migrated to device-local — some TODO.md notes about "Eastern" are stale.)
- ⚠️ Never `new Date("YYYY-MM-DD").getDay()` — that parses as UTC midnight and
  shifts the weekday for western timezones. Use `getDayOfWeekFromDateString(str)`.
- `getTodaysDate()` = `getLocalDateString(Date.now())`; `getLocalDayOfWeek()` for
  the Five-Day plan.

## Streaks — `calculateStreaks()`

Built on `getReadingActivity()` → map of `dateStr → words read that day` (uses the
cached `getWordCountForChapter`, not `bible.find`).

- **Current streak**: alive if there's activity today OR yesterday (the "1-day
  grace"); walks backward ≤365 days allowing exactly one gap day
  (`consecutiveMisses > 1` breaks).
- **Longest streak**: strict calendar adjacency (`diffDays === 1`), no grace.
- Header badge (`updateHeaderStreakBadge`): 👑 ≥365 · 💎 ≥100 · 🔥 ≥30 · ⚡ ≥7.
- Milestones `[7,14,30,50,100,180,365]`: `checkStreakMilestones` persists
  once-only flags in localStorage (`streakMilestone_<profileId>_<days>`,
  `lastStreakCheck_<profileId>`) — these live OUTSIDE appData, so they don't sync
  and don't export (known quirk). Celebration modal via `celebrateStreakMilestone`
  → `enhanceDynamicModal`.

## Heatmap — `renderHeatmap()`

Adaptive 30–365-day window, Sunday-start padded weeks. Color by daily WORD count
(not chapters): 0 → `#f1f5f9`, ≤1500 → `#bfdbfe`, ≤3500 → `#60a5fa`,
≤7000 → `#3b82f6`, >7000 → `#1e40af`.

## Charts (Chart.js, CDN-pinned 4.5.1)

- `mainChart` (doughnut, overall %), `miniCharts[]` (per-category doughnuts),
  `velocityChart` (daily-words trend on `velocityTrendChart` canvas).
- **Instances are cached module globals** — rebuild only when the count changes
  (`needsRebuild`), otherwise mutate data + `.update('none')`. Don't create a new
  Chart per render; that leaks canvases and re-animates.
- **Dark mode**: there is no per-chart theming. `body.dark-mode` applies
  `filter: invert(0.9) hue-rotate(180deg)` globally and re-inverts `canvas`/`img`/
  `[data-no-invert]` so charts keep true colors. If a chart looks wrong in dark
  mode, check that re-inversion rule (`ensureDarkModeStyles`), not Chart.js config.

## Word-weighted percentages

`renderStatsPage` sums read words per category → `chartTotalRead`; overall % =
`chartTotalRead / WORD_TOTALS.GLOBAL` (789,634). Per-book/goal percentages sum
live from `bible[].ch`. See `bible-data` skill for the invariant.

## Goals

- Storage: `appData.goals[profileId]`; types `wholeBible | testament | books |
  category` (whitelisted in `normalizeAppData`).
- `calculateGoalProgress(goal)` → `{readWords, totalWords, percent}` (word-weighted).
- Pace math in `renderGoals`: `wordsPerDay = ceil(remaining/daysLeft)`,
  `minsPerDay = ceil(wordsPerDay / (wordsPerMinute||250))` → "~N min/day".
  Complete at `percent >= 99.999` (float-tolerant). `getDaysRemaining` uses
  local-midnight diff with `Math.ceil`.
- Presets (`getGoalPresets`) include a Gregorian Easter computus for "by Easter"
  deadlines. `checkGoalCompletions()` runs after every save.

## Reading-time estimates

`calculateReadingTime(words)`: `ceil(words / (appData.wordsPerMinute || 250))`,
gated by `appData.showReadingTime`. WPM settable in Settings (clamped 100–500) or
via the calibration modal (times you reading a real chapter).
