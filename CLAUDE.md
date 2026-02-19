# CLAUDE.md - Bible Progress

## Overview

Word-weighted KJV Bible reading tracker. Progress by word count, not just chapters.

- **Site**: [bibleprogress.com](https://bibleprogress.com)
- **Architecture**: Single-file PWA (`index.html` ~13,000 lines). No build process.
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
    memorizedVerses: { [id]: [{ id, ref, text, addedDate }] },
    goals: { [id]: [{ name, type, target, deadline, createdDate }] },
    customPlans: { [id]: { name, ot_chapters, nt_chapters } },
    showReadingTime: boolean,
    wordsPerMinute: number
}
```

Progress values are **timestamps** (not booleans). Auto-migrated on load.

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

- **Firebase**: Project `bible-reading-d9286`, Firestore per-user docs
- **Bible data**: Minified array near top of JS section (66 books with word counts per chapter)
- **Chapter key format**: `"BookName-ChapterNumber"` (e.g., `"Genesis-1"`, `"Psalms-119"`)
- **Security functions**: `escapeHtml()`, `isValidHttpsUrl()`, `validateAppData()`
- **Deployment**: GitHub Pages from main branch, domain via CNAME
- **See also**: `SECURITY.md`, `TODO.md`
