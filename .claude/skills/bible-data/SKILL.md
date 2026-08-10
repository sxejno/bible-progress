---
name: bible-data
description: The inline Bible word-count array, the 789,634-word invariant and how to verify it, the in-app KJV/BSB reader, verse memorization, and which data files are fetched vs inlined. Use before touching the bible array, word counts, reader, or any *.json/*.txt data file.
---

# Bible data, word counts & reader

## The `bible` array (runtime source of truth)

- One giant line in index.html: grep `const bible = [{"name":"Genesis"`.
- Entry: `{"name": "Genesis", "testament": "OT"|"NT", "ch": [797, 632, ...]}` —
  `ch[i]` = word count of chapter `i+1`. 66 books. (Book categories come from
  `OT_CATS`/`NT_CATS` constants elsewhere, not from this array.)
- Chapter keys everywhere are `"BookName-ChapterNumber"`, book name exactly as in
  the array (`"Psalms-119"`, not `"Psalm-119"`).
- Fast lookup: `getWordCountForChapter(key)` — lazily-built Map; use it in loops
  instead of `bible.find`.

## The invariant: 789,634 total words (OT 609,252 · NT 180,382)

Hardcoded in TWO places that must stay in sync with the array:
`CONFIG.TOTAL_WORD_COUNT/OT_WORD_COUNT/NT_WORD_COUNT` and
`const WORD_TOTALS = { GLOBAL: 789634, OT: 609252, NT: 180382 }` (the one stats
actually uses).

**Verify after ANY change near the array** (run from repo root; passes today):

```bash
node -e "
const line = require('fs').readFileSync('index.html','utf8').split('\n').find(l => l.includes('const bible = [{\"name\":\"Genesis\"'));
const bible = JSON.parse(line.slice(line.indexOf('['), line.lastIndexOf(']')+1));
const sum = t => bible.filter(b=>!t||b.testament===t).reduce((a,b)=>a+b.ch.reduce((x,y)=>x+y,0),0);
console.log('books:', bible.length, 'total:', sum(), 'OT:', sum('OT'), 'NT:', sum('NT'));"
# expect: books: 66 total: 789634 OT: 609252 NT: 180382
```

⚠️ `kjv_chapter_word_counts.csv` is **reference-only and does NOT match the app**:
it sums to 790,686 (±1 on ~49 chapters, and it uses "Psalm" while the app uses
"Psalms"). Never "fix" the array from the CSV; the inline array is authoritative.
`kjvwordcount` is likewise an unused source artifact.

## Data files: fetched vs inlined

| File | Runtime fetch? | Used by |
|---|---|---|
| `kjv_bible.json` (6.6 MB) | yes — `loadBibleText('KJV')`, also learn.html, memorize.html | full KJV text |
| `bsb.txt` (4.3 MB) | yes — BSB version (tab-separated `ref\ttext`, parsed into KJV-like shape) | reader version toggle |
| `bible_chapter_summaries_concise.json` | yes — index.html + chapter-recall.html | per-chapter summaries |
| `fivedayplan.json` | **no** — inlined as `const PLAN_FIVE_DAY` | source data; precached for satellite pages |
| `pronunciations.json` | **no** — dictionary inlined into index.html | source data |
| `kjv_chapter_word_counts.csv`, `kjvwordcount` | no | reference artifacts only |

Neither large text file is precached by the service worker (`LARGE_DATA_ASSETS`) —
they're cached only via Settings → "download offline".

## In-app reader

- `loadBibleText(version)` fetches + caches into `bibleTextData` keyed by version;
  offline-aware error UI if fetch fails.
- `window.openBibleReader(book, ch)` / `openBibleReaderAtVerse` / 
  `navigateBibleChapter(dir)` / `closeBibleReader`. Modal `bible-reader-modal`,
  focus-trapped; subtitle shows words + reading time; "mark as read" flows through
  the normal `toggleChapter`.
- `setBibleVersion` saves IMMEDIATELY (`saveProgress(true)`) — a past bug lost the
  preference on quick close; keep it immediate.

## Verse memorization

- Star per verse → `window.toggleMemorizeVerse(id, ref, text)` toggles in
  `appData.memorizedVerses[profileId]` (`{id:"Book-Ch:Verse", ref, text, addedDate}`),
  saves immediately, re-renders preserving scroll.
- `normalizeAppData` caps fields (`id`/`ref` ≤100 chars, `text` ≤1000) on every
  load path — this was a stored-XSS fix; keep the caps if you touch the shape.
- Listing modal (`showMemorizedVerses`) wires remove buttons via
  `data-remove-verse` attributes, NOT inline onclick with user text — copy that
  pattern for any user-content actions.
- `memorize.html` (satellite, spaced repetition) imports starred verses by reading
  `kjv_v6_data` directly.
