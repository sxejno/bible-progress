# LAMP.md — The Lamp Room (`lamp.html`)

Whole-Bible retention game layered on top of the reading tracker. The tracker asks
*have I read it?*; the Lamp Room asks *does it still burn?* Every one of the
1,189 chapters is a lamp whose brightness **is** its Leitner box, so the visual
state of the map is the state of your memory with nothing in between.

Built from the *Thy Word Is a Lamp — v2* PRD (Aug 2026). Phase 1 plus the
cheap parts of Phase 2; see [Status against the PRD](#status-against-the-prd).

---

## Files

| Path | What it is |
|---|---|
| `lamp.html` | The whole app — one page, ES module, no build step, no Tailwind (self-contained CSS from the PRD §8 tokens, so it renders even if the CDN is unreachable) |
| `content/packs/{nt,ot-law,ot-history,ot-poetry,ot-major,ot-minor}.json` | Chapter gists + key-verse anchors, one pack per section group |
| `content/roads.json` | Guided verse journeys (Roman Road, Comfort Ye) |
| `tests/lamp-sync.test.html` | Sync acceptance tests — open in a browser, 30 assertions, no runner needed |

Packs are generated from the site's existing `bible_chapter_summaries_concise.json`
(gists) and `kjv_bible.json` (anchor text, KJV, public domain) — the Lamp Room adds
no new scripture corpus and never fetches scripture at runtime.

## Content pack schema

```json
{ "version": 1, "id": "nt", "testament": "NT", "chapters": 260,
  "sections": ["Gospels & Acts", "Epistles", "Revelation"],
  "books": [ { "id": "Jas", "name": "James", "section": "Epistles",
               "gists": ["Rejoice in trials, seek God's wisdom, …", "…"],
               "anchors": [ { "cv": "1:22", "text": "But be ye doers of the word…" } ] } ] }
```

Chapter count is always derived from `gists.length`. On boot the loader asserts the
canonical totals before a single lamp is drawn and refuses to render if they drift:

```
Law 187 · History 249 · Poetry & Wisdom 243 · Major Prophets 183 · Minor Prophets 67
Gospels & Acts 117 · Epistles 121 · Revelation 22        →  OT 929 + NT 260 = 1,189
```

Chapter keys are `"<bookAbbr>.<chapter>"` — `Gen.1`, `Psa.119`, `Jas.1`. (The
tracker's own key format is different — `"Genesis-1"` — and is translated on read.)

## Firestore schema

```
users/{uid}
  ├── appData    — the reading tracker's document field. NEVER written by lamp.html.
  └── lampData   — the Lamp Room's document field.
        { v, profiles:[{id,name,color}], active, settings,
          p: { <profileId>: { oil, manna:{count,last}, jars, drillBest,
                              sessionsToday:{d,n}, roads:{ id:{a,b,c,d,doneAwarded} },
                              plates:[bookId], days:{ "YYYY-MM-DD": reviews },
                              ch:{ "Gen.1": {b,due,c,w,r} },
                              anchors:{ "Jhn.3": {s,r} }, updatedAt } } }
```

`b` box 1–5 · `due` epoch ms · `c`/`w` right/wrong tallies · `r` epoch ms of last
review — **`r` is the merge key.**

### Why a document field and not a `users/{uid}/lamp/*` subcollection

The PRD specifies a subcollection. A subcollection needs a matching
`match /users/{uid}/lamp/{doc}` security rule, and those rules live in the Firebase
console — there is no `firestore.rules` in this repo to deploy from. A sibling field
on the user document works under the rules already deployed, is one read per load
instead of several, and cannot collide with the tracker: the tracker only ever writes
`{ appData: … }` with `{merge:true}`, and the Lamp Room only ever writes
`{ lampData: … }` with `{merge:true}`. This is the same pattern
`biblical-languages-trainer.html` uses for `trainerData`.

If the subcollection is wanted later, add to the console rules:

```
match /users/{uid}/lamp/{doc} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Worst case document size for one profile with all 1,189 chapters is ~70 KB — well
inside the 1 MB limit, and `appData` is comfortably clear of it too.

## Sync invariants (PRD §7) — do not break these

The tracker's January 2026 plan-revert bug (debounced write racing a snapshot
listener, local edits reverted) is a *class* of bug. These four rules make it
impossible by construction rather than unlikely:

1. **Memory is the source of truth.** The UI renders only from the in-memory `LAMP`
   object. Firestore is a replica, never a render source.
2. **Only dirty fields are written.** Mutations mark dirty keys
   (`dirtyCh` / `dirtyField` / `dirtyMeta`); an 800 ms debounce flushes a *minimal
   nested object* with `{merge:true}`. Firestore deep-merges nested maps, so
   untouched chapters are never rewritten and cannot be clobbered by a stale local
   copy. Also flushes on `visibilitychange → hidden`.
3. **Own echoes are ignored.** Snapshots with `metadata.hasPendingWrites` are
   dropped. Genuine remote snapshots are **merged per chapter key**, never applied
   wholesale:
   - `b` and `due` come from the side with the greater `r` (later review wins)
   - `c`, `w`, `oil`, `jars`, `drillBest` take `max`
   - `manna` takes the entry with the later `last`; `days` takes `max` per day
   - `plates`, road stage flags and profile lists **union**
4. **Session shield.** While a trim / drill / road / chain session is running,
   remote merges queue in `queuedRemote` and apply at session end. A user's
   in-flight answers can never be yanked out from under them.

`mergeLamp`, `mergeCh` and `firstLetters` are exposed on `window` (`__lampMerge`,
`__lampMergeCh`, `__lampFirstLetters`) purely so `tests/lamp-sync.test.html` can
exercise the real code rather than a copy.

> Gotcha worth keeping: never coerce `due`/`r` with `|0`. They are epoch
> milliseconds and a bitwise op truncates them to 32 bits, silently corrupting
> every due date. The acceptance tests catch this.

## Study engine

- **Leitner**, boxes 1–5, intervals `[1,2,4,8,16]` days. Correct → up one box,
  re-due after that box's interval. Wrong → box 1, due immediately. Box number maps
  1:1 to lamp brightness; legibility is the point, which is why this is not FSRS.
- **Sessions** are 12 items: due (oldest `r` first) → never-seen → everything else
  by lowest box. New items get an intro card before their first question. Misses
  requeue once at session end.
- **Question directions**: `ref→gist`, `gist→ref`, and — for boxes ≥3 on chapters
  that have a key verse — `verse→chapter`. Learn items are always `ref→gist` first.
  Distractors are drawn from the same book, then the same section, so the gists have
  to be genuinely confusable.
- **Oil**: learn +5, review +3 (**correct answers only** — the PRD tables the
  amounts but oil is for kindling, not guessing), anchor step +8,
  chain `max(2, chapters − misses)`, drill `score + 2·⌊score/5⌋`, road stage +25,
  road complete +50, plate +20.
- **Manna** streak with a 1-day grace, plus the **sabbath jar**: two completed
  sessions in one day lays up one jar (max one held), and a single missed day spends
  the jar instead of resetting the streak. Ex. 16 in mechanic form.
- **Plates** engrave when every chapter of a book reaches box ≥3.
- **Ranks**: Novice · Disciple 250 · Berean 750 · Scribe 2,000 · Workman 4,500 ·
  Interpreter 9,000 · Valiant-for-Truth 16,000.

## First-letter reduction (PRD §5.5)

Used by road *Recite* and by anchors. Words in a punctuation group run together;
a space follows each punctuation mark; capitalisation is preserved.

```
My brethren, count it all joy when ye fall into divers temptations;
→ Mb, ciajwyfidt;
```

This is the same rule as `memorize.html` and the `bible-first-letter` skill. It is
pinned by a test.

## Reading-tracker integration (§5.10) — one-way, read-only

The Lamp Room reads the tracker's chapters-read data (from the same Firestore
document when signed in, otherwise from `localStorage["kjv_v6_data"]`) and never
writes to it. Effects:

- unlit lamps whose chapter is marked read get a thin **read ring**
- **“Light what you've read”** queues a learn session drawn from read ∩ unlit
- the household reader list **is** the tracker's profile list — profiles are created
  and renamed in the tracker only, so there is never a second list to keep in step

## Guest mode

Signed out, everything works and is kept in `localStorage["thy_word_lamp_v2"]` with
a persistent banner. On sign-in the local state is marked wholly dirty and flushed,
so guest progress is adopted into the account and merged with anything already
there — no branch of the code ever replaces state, only merges it.

## Export / import

Export writes a versioned envelope `{app, v, exported, data}`. Import **merges by
the §7 rules** rather than replacing, and accepts a v2 export, a bare v2 state, or a
v1 single-file save (`cards`/`boxes` keyed as `Jas.1`, `James 1` or `James-1`).

## Budgets (measured in headless Chromium)

| Budget | Target | Actual |
|---|---|---|
| Shell size | ≤150 KB gz | 84 KB uncompressed (~20 KB gz) |
| Packs | lazy / cached | 131 KB uncompressed total, SW-cached |
| Map render, 1,189 lamps | ≤100 ms | ~7 ms |
| Boot to interactive | ≤2 s | ~340 ms local |

Performance comes from plain nodes plus `content-visibility:auto` on book blocks,
one delegated click listener on the map, and targeted `refreshLamps()` updates
instead of re-rendering during a session.

## Accessibility

All 1,189 lamps are buttons with labels like `"Genesis 1, box 3, due"`; section
headers carry `aria-expanded`; a complete session is operable by keyboard alone
(number keys 1–4 answer, Enter advances, focus moves to Next); `prefers-reduced-motion`
and the in-app "steady flame" setting both swap the flicker for a dashed outline.
There is also a per-profile kid-copy toggle ("Not yet — try again" over "Not so").

## Tests

Open `tests/lamp-sync.test.html` in a browser (it loads `lamp.html?test=1` in a
hidden iframe, which skips boot so nothing touches storage or Firebase). 30
assertions covering both PRD §7 acceptance scenarios — two-device convergence, and
a local edit surviving a snapshot burst — plus the merge rules, profile union and
the first-letter rule. Green = 30 passed, 0 failed.

## Status against the PRD

**Shipped** — accounts and household profiles · guest mode and adoption · all six
packs (1,189 chapters, 238 key-verse anchors) · map with sections, collapse, read
rings · Leitner + trim sessions · anchors ("Drop anchor") · Roman Road and Comfort
Ye · solo Sword Drill · Chapter Chain · Folio with oil, ranks, manna, sabbath jar,
plates, year heatmap, 30-day due forecast, per-book mastery · sync per §7 with
acceptance tests · export/import incl. v1 migration · PWA via the site's existing
manifest and service worker · cross-navigation both ways.

**Not built (deliberately deferred)** — the Doctrines of Grace road (PRD §12: ships
only after Shane's sign-off; drop it into `content/roads.json` and it appears)
· weekly household drill · custom per-profile gist overrides · Book Chains (27/66)
· emblem plates · testament certificates.

**Deviations from the PRD, and why** — Firestore field instead of a subcollection
(security rules, above) · household profiles reuse the tracker's list instead of a
parallel one · gists come from the existing chapter-summary data, so they run a
little past the ≤64-char authoring guide · no separate lamp `manifest.json`, since a
second manifest inside the site's PWA scope would fight the installed app.
