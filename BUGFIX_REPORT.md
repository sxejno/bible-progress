# Bugfix Report: "Today already read" shows for a chapter read days ago

## User report

> "The site does not seem to be tracking progress properly. It shows as if TODAY
> has already been read, but I have NOT read today — although what it thinks I
> 'just read today' is actually a chapter I read SEVERAL DAYS AGO."

## Root cause (precise)

The shared date helper `getLocalDateString(timestamp)` **ignored its `timestamp`
argument**. Instead of converting the supplied timestamp to a local calendar
date, it constructed `new Date()` (the current moment). As a result the function
returned **today's** date string for *every* input.

Every place that decides "was this chapter read today?" does so by comparing
`getLocalDateString(storedTimestamp) === todayStr`. Because the helper always
returned today's date, that comparison was `true` for **any** chapter that had a
non-zero read timestamp — including one read several days ago. This is exactly
the reported symptom: a chapter read days ago is treated as "read today."

This was confirmed (not guessed). It is cause **(a)** from the investigation
brief. Cause (b) (UTC vs local via `toISOString`) was ruled out: there is no
`toISOString()` anywhere in the file, and both `getTodaysDate()` and the fixed
`getLocalDateString()` use the same local `getFullYear/getMonth/getDate` path,
so they are now consistent. Cause (c) (stale daily cache) was not the trigger.

Corroborating evidence: an adjacent, **never-called** helper
`getActivityDateString(timestamp)` (line 10822) contains the *correct*
implementation using `new Date(timestamp)`. This strongly indicates
`getLocalDateString` was meant to be identical but shipped with a copy/paste
defect that dropped the `timestamp` argument.

## Evidence (file:line, verbatim BEFORE)

`/home/user/bible-progress/index.html`

The defective helper (note `new Date()` with no argument, despite the function
taking `timestamp`):

```
10814			const getLocalDateString = (timestamp) => {
10815				const date = new Date()
10816				const year = date.getFullYear()
10817				const month = String(date.getMonth() + 1).padStart(2, '0')
10818				const day = String(date.getDate()).padStart(2, '0')
10819				return `${year}-${month}-${day}`
10820			}
```

The correct sibling helper, for comparison (line 10822, uses `new Date(timestamp)`):

```
10822			const getActivityDateString = (timestamp) => {
10823				const date = new Date(timestamp)
```

`getTodaysDate()` (line 10806) is correct as-is — it intentionally takes no
argument and represents "now" via local date parts, so it was left unchanged.

## The exact change

One line, in `getLocalDateString` (line 10815):

- Before: `const date = new Date()`
- After:  `const date = new Date(timestamp)`

This is the minimal, surgical fix. Fixing the shared helper repairs every call
site at once; no call site needed changing because each one already passes a
timestamp and expects it to be honored.

## Affected call sites (all reviewed)

All five callers pass a timestamp and rely on it being converted to that
timestamp's local date. All were broken before and are corrected by this fix:

1. **Line 10841** — `completedToday = !!(ts && getLocalDateString(ts) === todayStr)`
   Plan's "today's reading complete" state.
2. **Line 10842** — `const completedDates = Object.values(profileData).map(ts => getLocalDateString(ts))`
   Maps every stored timestamp to its date (previously mapped *all* timestamps
   to today).
3. **Line 11079** — `const dateString = getLocalDateString(timestamp)` then
   `if (dateString === todayStr) todayWords += wordCount`
   Dashboard "Today's Words / Today's Chapters" counters
   (`dash-today-words`, `dash-today-chapters`).
4. **Line 11218** — `return getLocalDateString(timestamp)`
   Streak activity / "read today" (`hasReadToday`) path.
5. **Line 11280** — `const completedToday = !!(currentChapterTimestamp && getLocalDateString(currentChapterTimestamp) === todayStr)`
   Horner plan "read TODAY" state.

`getTodaysDate` (10806) and `getActivityDateString` (10822) were inspected and
left unchanged (correct as written). No other definitions of
`getLocalDateString` exist.

## Verification performed

A throwaway Node snippet (in `/tmp`, since removed — no test files added to the
repo) copied the exact bodies of `getTodaysDate`, the buggy
`getLocalDateString`, and the fixed `getLocalDateString`, then exercised the
`completedToday(ts) = !!(ts && getLocalDateString(ts) === todayStr)` logic for
two inputs: a timestamp 3 days old and a timestamp from today.

Output (today = 2026-05-28):

```
--- BEFORE FIX (buggy) ---
3-days-ago -> dateStr: 2026-05-28 | completedToday: true
today      -> dateStr: 2026-05-28 | completedToday: true

--- AFTER FIX ---
3-days-ago -> dateStr: 2026-05-25 | completedToday: false
today      -> dateStr: 2026-05-28 | completedToday: true

RESULT: PASS
```

This confirms:
- The bug reproduced: before the fix, a 3-day-old timestamp evaluated as
  "completed today" (`true`).
- The fix is correct: after the fix, a 3-day-old timestamp evaluates `false`
  and a today timestamp evaluates `true`.

Because all five call sites funnel through this single helper, the dashboard
"today complete" banner, today's words/chapters counters, the streak
"read today" state, and the Horner "read today" state will all now reflect the
real local calendar date of each chapter's read timestamp.

## Notes / non-impact

- No change to Bible word counts (total remains 789,634).
- No change to the `kjv_v6_data` localStorage key, data model, Firebase config,
  or color scheme — so no migration is required and stored data is unaffected.
  Existing data was never corrupted; only the *display/derivation* logic was
  wrong, so this fix retroactively corrects what users see.
- Single-file architecture preserved; no new dependencies or build steps.
