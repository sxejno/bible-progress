---
name: data-model
description: The appData schema, localStorage persistence, migrations, and the 12-site checklist for adding/changing any field. Use when touching appData, adding a per-profile field, writing a migration, or debugging "data disappeared / reset" bugs.
---

# Data model & persistence

Primary store: `localStorage['kjv_v6_data']` (key constant `STORAGE_KEY_DATA` in
`CONFIG`). Firestore is a secondary mirror of the whole blob. Line numbers are
2026-07 hints — grep the anchors.

## Full appData schema (authoritative; CLAUDE.md is a summary)

```javascript
{
  // per-profile maps, keyed by profile NAME (e.g. "Default")
  profiles:            { [id]: { "Genesis-1": timestamp_ms, ... } }, // unread = key ABSENT, never false
  profilePlans:        { [id]: "SEQUENTIAL"|"ONE_YEAR"|"MCHEYNE"|"HORNER"|"FIVE_DAY"|"CUSTOM" },
  deletedChapters:     { [id]: { "Genesis-1": deletion_ts } },   // unmark tombstones (30-day TTL)
  dailyPlanProgress:   { [id]: { date:"YYYY-MM-DD", plan, chapters:[] } }, // pins today's reading
  hornerDailyProgress: { [id]: { date:"YYYY-MM-DD", completedLists:[0..9] } },
  hornerCycleCount:    { [id]: [0 x10] },      // read-throughs per Horner list
  hornerCycleLastAt:   { [id]: [ts x10] },     // watermark per list
  memorizedVerses:     { [id]: [{ id, ref, text, addedDate }] },
  goals:               { [id]: [{ name, type, target, deadline, createdDate }] },
  customPlans:         { [id]: [{ name, config:{ot,nt,psalms,proverbs}, active, createdDate }] },
  planHistory:         { [id]: [...] },        // plan-change tracking
  profileColors:       { [id]: color },
  profileSyncRules:    { [source]: target },   // cross-profile mirroring
  // globals
  activeProfileId, defaultProfileId,           // default = auto-activated on load
  showReadingTime: bool, wordsPerMinute: number, bibleVersion: "KJV"|"BSB",
  defaultTab, lastModified: timestamp_ms       // lastModified drives sync conflict guard
}
```

Progress values are **timestamps** (ms). Legacy `true` migrates to `1`;
`false`/`0`/`null` are deleted. ⚠️ The plan IDs above are the real `<option>`
values (`ONE_YEAR`, `FIVE_DAY`) — older docs said `ONEYEAR`.

## Lifecycle

- **Load** (top-level module code, anchor `// --- APP STATE & MIGRATION ---`):
  read key → `validateAppData` → `normalizeAppData` → `let appData = savedData || {default shape}`
  → migration block (anchor `// Migrate existing users`) initializes every missing
  field → boolean→timestamp migration (anchor `// Migrate boolean progress values to timestamps`)
  → persisted immediately.
- **Save**: `window.saveProgress(immediate=false)` — stamps `appData.lastModified`,
  debounced localStorage write (`SAVE_DEBOUNCE_MS: 1000`) + Firestore write
  (`FIREBASE_DEBOUNCE_MS: 3000`, only if signed in). `saveProgress(true)` flushes now.
- **Flush guards**: `visibilitychange`→hidden calls `saveProgress(true)`;
  `beforeunload` synchronously writes localStorage (anchor `// Last-resort save`).
  Consequence: anything you write to localStorage from an open app page gets
  clobbered on unload (the `verify` skill has the workaround for tests).
- **Sanitizers**: `validateAppData` (reject: non-object, prototype-pollution keys,
  bad profiles) and `normalizeAppData` (coerce/strip: caps memorizedVerses field
  lengths, whitelists goal types, defaults customPlans psalms/proverbs) run on ALL
  THREE load paths: localStorage load, cloud snapshot, JSON import.

## Checklist: adding a per-profile field `appData.newField[profileId]`

Touch ALL of these (grep anchors given). Missing 2, 5, 7, 8 or 9 causes the classic
bugs: field vanishes after cloud sync, orphaned after delete, lost on rename.

1. Default shape — `let appData = savedData ||` literal.
2. Load migration — add `if (!appData.newField) {...}` + per-profile init beside the
   existing blocks under `// Migrate existing users`.
3. `normalizeAppData` — sanitize shape/lengths (copy the memorizedVerses block).
4. `validateAppData` — only if structurally required; usually leave permissive.
5. **Cloud merge** — `processCloudSnapshot`: (a) snapshot the local copy before
   `appData = cloudData`; (b) add a merge-back block beside goals/customPlans
   (decide union vs restore-if-missing); (c) re-init in the integrity pass.
6. `saveProgress` — no change (whole blob serialized), but Firestore drops
   `undefined` values; use `null` or omit.
7. `createNewProfile` — initialize the bucket.
8. `deleteProfile` — delete the bucket.
9. `renameProfile` — re-key old→new (copy the existing re-key list).
10. `restoreData` (JSON import) — same init/fixup as step 2.
11. Exports — `exportProgressCSV` (new `=== SECTION ===`), `exportProgressObsidian`,
    `exportProgressPDF` if user-visible.
12. If deletions must sync across devices — mirror the tombstone pattern
    (`recordChapterDeletion` / `clearChapterDeletion`).

## Versioning rule

Additive changes: keep `kjv_v6_data` and migrate in place (steps above). Breaking
shape changes: bump to `kjv_v7_data`, read-and-convert the v6 key on load, never
delete the old key in the same release. Test migration by seeding an old-shape blob
via the `verify` skill's localStorage-seeding recipe.
