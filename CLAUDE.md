# CLAUDE.md - Bible Progress

## Overview

Word-weighted KJV Bible reading tracker. Progress by word count, not just chapters.

- **Site**: [bibleprogress.com](https://bibleprogress.com)
- **Architecture**: Single-file PWA (`index.html` ~15,000 lines). No build process.
  Companion tools are their own single files (`memorize.html`, `lamp.html`, `horner.html`, …).
- **Stack**: HTML5, Tailwind CSS (CDN), Chart.js (CDN), Vanilla JS (ES6), Firebase Auth + Firestore
- **Storage**: localStorage (`kjv_v6_data`) is primary; Firestore is secondary backup
- **Total Words**: 789,634 (OT: 609,252 | NT: 180,382)

## Data Model (`appData`)

```javascript
{
    profiles: { [id]: { "Genesis-1": timestamp_ms, ... } },  // chapter progress
    profilePlans: { [id]: "SEQUENTIAL"|"MCHEYNE"|"HORNER"|"ONEYEAR"|"FIVE_DAY"|"CUSTOM" },
    activeProfileId: string,
    defaultProfileId: string,
    hornerDailyProgress: { [id]: { date: "YYYY-MM-DD", completedLists: [0,1,...] } },
    hornerCycleCount: { [id]: [0,0,0,0,0,0,0,0,0,0] },  // read-throughs per Horner list
    hornerCycleLastAt: { [id]: [timestamp_ms x10] },  // watermark: when each list's read-through was last counted
    memorizedVerses: { [id]: [{ id, ref, text, addedDate }] },
    goals: { [id]: [{ name, type, target, deadline, createdDate }] },
    customPlans: { [id]: { name, ot_chapters, nt_chapters } },
    deletedChapters: { [id]: { "Genesis-1": deletion_timestamp_ms } },  // unmark tombstones for multi-device sync
    showReadingTime: boolean,
    wordsPerMinute: number
}
```

Progress values are **timestamps** (not booleans). Auto-migrated on load.
Day boundaries (streaks, heatmap, daily plan reset) use the **device-local timezone**, computed at render time via `getLocalDateString()`.
Un-marking a chapter records a tombstone in `deletedChapters` (cleared on re-mark, purged after 30 days) so cloud sync can propagate deletions instead of resurrecting them.

## Key Features

- **Profiles**: Multi-user with per-profile plans, colors, goals, memorized verses
- **Reading Plans**: Sequential, One Year (OT+NT Daily), M'Cheyne (4/day), Horner (10 rotating lists), Five-Day (weekends off), Custom
- **Streaks**: Consecutive reading days with 1-day grace, heatmap, milestone celebrations
- **Bible Reader**: In-app KJV text with verse memorization (star icon)
- **Goals**: Deadline-based reading goals (whole Bible, testament, books, category)
- **Export**: CSV, Obsidian (MD with YAML frontmatter), PDF, JSON backup — all include full user data
- **Dark Mode**: Settings toggle + triple-click logo easter egg
- **Easter Eggs**: 7 hidden features (Konami code, profile dot clicks, Psalm 119, etc.)
- **Accessibility**: 35+ ARIA labels for screen readers
- **Lamp Room** (`lamp.html`): whole-Bible retention game over all 1,189 chapters — Leitner boxes drawn as lamp brightness, verse roads, sword drill. Reads the tracker's read chapters and profile list one-way; stores its own state in `users/{uid}.lampData`. See `LAMP.md`.

## Rules

**DO:**
- Preserve single-file architecture
- Match existing code style (no semicolons required, arrow functions, template literals)
- Use `escapeHtml()` for user data in HTML; `isValidHttpsUrl()` for URLs
- Keep `kjv_v6_data` localStorage key (add migration if data model changes)
- Attach event handlers to `window` object
- Use Tailwind CSS utilities; indigo is primary color

**DON'T:**
- Split into multiple files or add build tools
- Modify Bible word counts without verification (total must remain 789,634)
- Use `innerHTML` with unsanitized user data
- Break localStorage compatibility without migration path
- Change Firebase config or color scheme without authorization
- Add heavy dependencies

## Quick Reference

- **Firebase**: Project `bibleprogress-48cfd`, Firestore per-user docs. `users/{uid}` carries one field per app — `appData` (tracker), `trainerData` (languages trainer), `lampData` (Lamp Room). Every writer uses `{merge:true}` and touches only its own field; never write another app's field.
- **Bible data**: Minified array near top of JS section (66 books with word counts per chapter)
- **Chapter key format**: `"BookName-ChapterNumber"` (e.g., `"Genesis-1"`, `"Psalms-119"`)
- **Security functions**: `escapeHtml()`, `isValidHttpsUrl()`, `validateAppData()`, `normalizeAppData()` (deep sanitation of imported/cloud data; toasts escape messages centrally)
- **Lamp Room data**: `content/packs/*.json` (chapter gists + KJV key-verse anchors, canonical counts asserted at load), `content/roads.json`; chapter keys are `"Gen.1"` style, translated from the tracker's `"Genesis-1"` on read
- **Deployment**: GitHub Pages from main branch, domain via CNAME
- **Tests**: `tests/lamp-sync.test.html` — open in a browser; 30 assertions on the Lamp Room's sync-merge invariants
- **App icon**: vector source is `build/icon/icon.py` → `build/icon/icon.svg`. Regenerate the shipped set with `python3 build/icon/icon.py && python3 build/icon/build.py` (renders through headless Chromium, then quantises + oxipng). Never hand-edit the root PNGs. Bump `CACHE_NAME` in `service-worker.js` whenever icon files change, or installed PWAs keep the old ones.
- **Icon tests**: `python3 tests/icons.test.py` — manifest sizes, service-worker precache list, per-page references, and the maskable safe circle
- **See also**: `SECURITY.md`, `TODO.md`, `LAMP.md`
