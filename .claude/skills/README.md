# Skill library — bible-progress

Handoff documentation for maintaining this project without prior context. Each
skill is self-contained; `codebase-map` is the entry point.

| Skill | Use when |
|---|---|
| `codebase-map` | Locating anything in the 15k-line index.html — read FIRST |
| `add-feature` | Building/changing features: conventions, UI blocks, checklist |
| `data-model` | Touching appData: schema, migrations, the 12-site field checklist |
| `cloud-sync` | Firebase auth/Firestore, merge algorithm, tombstones, sync bugs |
| `reading-plans` | The six plans, Horner cycles, daily pinning, adding a plan |
| `stats-streaks` | Streak rules, heatmap, charts, goals, date/timezone pitfalls |
| `bible-data` | The word-count array + 789,634 invariant, reader, data files |
| `ship` | Deploying: SW cache bumps, new-page checklist, update flow |
| `security-audit` | Reviewing diffs: XSS choke points, input validation rules |
| `troubleshoot` | Symptom → cause playbook for classic failure modes |
| `verify` | Driving the app headlessly (Playwright + CDN stubs) to test changes |

## Ground rules the whole library assumes

- Single-file architecture (`index.html`), no build step, deploy = push to main
  (GitHub Pages).
- `localStorage['kjv_v6_data']` is primary storage; Firestore is a mirror.
- Progress values are timestamps; unread = key absent.
- Word-count invariant: 789,634 total (OT 609,252 · NT 180,382).
- Plan IDs: `SEQUENTIAL, ONE_YEAR, MCHEYNE, HORNER, FIVE_DAY, CUSTOM`.

## Maintaining this library

Line numbers in skills are hints (dated 2026-07); the grep anchors are the real
references. When you rename a function or banner comment in index.html, grep
`.claude/skills/` for the old anchor and update it. When you change architecture
(new storage key, new plan, split files), update the affected skill in the same PR
— stale docs are worse than none.
