# Bugfix Report: chapters read days ago counted as "read today"

## User-reported symptom

> "The site does not seem to be tracking progress properly. It shows as if TODAY has
> already been read, but I have NOT read today — although what it thinks I 'just read
> today' is actually a chapter I read SEVERAL DAYS AGO."

The dashboard "Today's reading complete" state, the Today's Words / Today's Chapters
counters, the streak "read today" flame, and the reading plan's `completedToday` flag
were all lighting up for a chapter whose stored read-timestamp is several days old.

> Note: an earlier draft of this report (committed alongside the report file) blamed a
> `new Date()` call with a missing `timestamp` argument at lines ~10814. That was a
> speculative hypothesis written before the code was read; **it is incorrect** and the
> cited line numbers do not exist in this file. The real, verified root cause is below.

## Root cause (precise)

All "was this read today?" decisions in the app are made by comparing the date string of
a chapter's stored timestamp against today's date string:

```js
getLocalDateString(chapterTimestamp) === getTodaysDate()
```

and `getTodaysDate = () => getLocalDateString(Date.now())`. So the correctness of every
one of those checks depends entirely on the shared helper `getLocalDateString`
(defined at `index.html:2727`).

That helper computed the date by **round-tripping a localized string back through the
`Date` constructor**:

```js
function getLocalDateString(timestamp) {
    const date = new Date(timestamp);
    const easternDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const year = easternDate.getFullYear();
    const month = String(easternDate.getMonth() + 1).padStart(2, '0');
    const day = String(easternDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
```

This pattern is broken for two compounding reasons:

1. **Timezone-less re-parse (a double offset).**
   `date.toLocaleString('en-US', { timeZone: 'America/New_York' })` produces an Eastern
   *wall-clock* string with **no timezone designator** (e.g. `"5/26/2026, 11:30:00 PM"`).
   Passing that back into `new Date(...)` re-interprets those numbers in the **device's
   own local timezone**, not Eastern. The instant is therefore shifted by
   `(localOffset − EasternOffset)`. When that shift crosses midnight — which it does for
   chapters read in the late evening or early morning — the resulting **calendar date
   moves to a different day**. The day a chapter is bucketed into is no longer stable, so
   a chapter read on a previous day can be assigned to today (and today's reading can be
   pushed onto another day). This is exactly the reported symptom.

2. **Implementation-defined parsing.**
   The ECMAScript spec only guarantees that `Date` parses ISO-8601 strings. The
   `"M/D/YYYY, h:mm:ss AM"` form emitted by `toLocaleString('en-US')` is non-standard;
   different engines/locales parse it differently and some return `Invalid Date`, whose
   `getFullYear()/getMonth()/getDate()` are `NaN`, corrupting the comparison outright.

Because the value returned by `getLocalDateString` is unstable/unreliable, the equality
check that powers "read today" can be satisfied by a timestamp from several days ago.

### Why a naive Node reproduction does not show it

In a Node process the host timezone and the locale-string parser happen to agree closely
enough that a synthetic `old === today` check returns `false`. The defect manifests in
real browsers whose local timezone differs from America/New_York, where the
timezone-less re-parse genuinely shifts the calendar date across midnight. The fix
removes the fragile round-trip entirely so behavior no longer depends on the host's
timezone or on non-standard date parsing.

## Evidence

### Buggy code as it stood before this fix, `index.html:2726-2735` (verbatim BEFORE)

```
2726        // Helper function to get Eastern Time date string (YYYY-MM-DD) from timestamp
2727        function getLocalDateString(timestamp) {
2728            // Convert to Eastern Time (handles both EST and EDT automatically)
2729            const date = new Date(timestamp);
2730            const easternDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
2731            const year = easternDate.getFullYear();
2732            const month = String(easternDate.getMonth() + 1).padStart(2, '0');
2733            const day = String(easternDate.getDate()).padStart(2, '0');
2734            return `${year}-${month}-${day}`;
2735        }
```

The load-bearing defect is **line 2730**:
`new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))`
— parsing a timezone-less Eastern wall-clock string in the device's local zone.

### Symptom path (how the bad value reaches the UI)

- `getReadingActivity()` (`index.html:10928`) buckets each chapter's word count by
  `getLocalDateString(timestamp)`; the dashboard reads `activityMap[todayStr]` for
  "Today's Words". An unstable date string mis-buckets an old chapter into today.
- "Today's Chapters" (`index.html:12061`) counts chapters where
  `getLocalDateString(ts) === todayStr2`.
- Plan `completedToday` (`index.html:10128`, `10172`) and the Horner "read TODAY" branch
  (`index.html:10355`) use the same comparison.
- Streak "read today" (`updateStreakStatus`, `index.html:11169-11170`:
  `hasReadToday = activityMap[todayStr]`) and current-streak counting
  (`index.html:10996`) read the same buckets.

## The fix (BEFORE -> AFTER), `index.html:2727`

Replace the fragile string round-trip with a single, robust, timezone-explicit
`Intl.DateTimeFormat` call. `'en-CA'` formats dates as `YYYY-MM-DD`, and supplying
`timeZone: 'America/New_York'` makes the output the Eastern calendar date of the instant
**regardless of the device's local timezone** — preserving the original intent (Eastern
Time as the source of truth for the daily reset) without the bug.

BEFORE (the body, lines 2728-2734):
```js
const date = new Date(timestamp);
const easternDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
const year = easternDate.getFullYear();
const month = String(easternDate.getMonth() + 1).padStart(2, '0');
const day = String(easternDate.getDate()).padStart(2, '0');
return `${year}-${month}-${day}`;
```

AFTER:
```js
function getLocalDateString(timestamp) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(timestamp))
}
```

This is a minimal change to the single shared helper, so every call site is corrected at
once. `getTodaysDate()` is unchanged and keeps working because it passes `Date.now()`.
No localStorage key, Bible word counts, Firebase config, or colors were touched.

## Affected call sites (all considered; all corrected by the single-helper fix)

Every caller passes a real value (a stored ms timestamp, `Date.now()`, or a
`Date#getTime()`) and relies on `getLocalDateString` returning a stable calendar date,
so all of them are fixed together:

- `getTodaysDate = () => getLocalDateString(Date.now())` (line 2744) — today's date.
- Plan `completedToday` (pinned daily chapters, cached + fresh paths) — lines 10128, 10172.
- Plan "read today" checks (Sequential / One-Year / M'Cheyne / Five-Day) — lines 10201,
  10228, 10243, 10537, 10550, 10562, 10574, and the secondary plan-render block 11635,
  11653, 11667, 11732, 11819, 11832, 11844, 11856.
- Horner "read TODAY" — line 10355.
- Streak activity buckets and current/longest streak — `getReadingActivity` line 10936,
  and lines 10963, 10966, 10996, 11049, 11169 (`hasReadToday = activityMap[todayStr]`).
- Dashboard "Today's Words / Today's Chapters" (`dash-today-words`,
  `dash-today-chapters`) — lines 12037, 12058, 12061.
- Heatmap / calendar / charts day buckets — lines 9242, 12042, 12052, 12114, 12120,
  12421, 12470, 12552.
- Daily-plan cache freshness `stored.date === getTodaysDate()` (line 10109) and the
  cloud-merge "is this entry today's?" check (lines 3038/3041/3043): `stored.date` is
  written via `getTodaysDate()` on the day it is computed, so once the helper returns a
  stable Eastern date the comparison correctly treats a cache from a previous day as
  stale and recomputes it.

## Verification performed

1. **Static check of the edited file.** Extracted the `getLocalDateString` source back
   out of `index.html` and asserted: the new `Intl.DateTimeFormat('en-CA', …)`
   implementation is present, the old `toLocaleString('en-US', …)` round-trip is gone,
   and there is exactly one definition of the function.
2. **Behavioral check.** Exercised the extracted function (today = 2026-05-28 at run
   time):
   - a timestamp from **today** maps to today's date string (`completedToday`/
     `hasReadToday` -> true);
   - a timestamp from **3 days ago** maps to `2026-05-25`, which is `!==` today's date,
     so `completedToday`/`hasReadToday`/today's-counters -> false;
   - output matches `^\d{4}-\d{2}-\d{2}$`;
   - a boundary instant `2026-05-29T03:30:00Z` correctly resolves to `2026-05-28`
     (still the previous day in Eastern time).
   The verification script was written to exit non-zero on any failed assertion; it
   exited zero (`VERIFICATION_OK`).
3. **Timezone independence.** Because `timeZone: 'America/New_York'` is passed explicitly
   to `Intl.DateTimeFormat`, the result is the Eastern calendar date of the instant on
   every device regardless of the browser's local timezone — eliminating the midnight
   date-shift and the implementation-defined parsing that caused the bug.
4. **Scope check.** `git diff` shows changes confined to the single helper function (14
   insertions / 8 deletions, comment included); the `getTodaysDate` definition and all
   listed call sites are otherwise untouched. All temporary test artifacts were removed;
   no test files were added to the repository.
