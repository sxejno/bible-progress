# Bible Progress

A word-weighted Bible reading tracker. Unlike trackers that treat every chapter equally, Bible Progress measures by **word count** — so Psalm 119 (2,423 words) counts for more than Psalm 117 (33 words).

**Live:** [bibleprogress.com](https://bibleprogress.com) · **Free, open source, no ads.**

## Features

- **Word-weighted progress** — True completion percentage based on 789,634 total KJV words
- **Built-in Bible reader** — Read KJV text with pronunciation guides, chapter summaries, and mark-as-read in one flow
- **6 reading plans** — Sequential, One Year (OT+NT daily), M'Cheyne (365-day), Horner (10-list rotation), Five-Day (weekends off), and Custom
- **Reading streaks** — Streak tracking with heatmap, milestones, and grace period
- **Multi-profile** — Separate profiles for family members or different reading goals
- **Cloud sync** — Optional Google/email sign-in via Firebase; local-first by default
- **Verse memorization** — Spaced repetition tools for scripture memory
- **Bible books game** — Learn book order and locations
- **Reading speed calibration** — Time yourself on a chapter to get personalized estimates
- **Offline PWA** — Installable, works without internet
- **Dark mode, animations, easter eggs** — 7 hidden surprises to find

## Quick Start

Visit [bibleprogress.com](https://bibleprogress.com) — no account required.

**Install as app:** Use "Add to Home Screen" (mobile) or the install icon in Chrome/Edge (desktop).

## Tech Stack

- Vanilla HTML/JS — no frameworks, no build step
- Tailwind CSS + Chart.js (CDN)
- Firebase Auth + Firestore (optional cloud sync)
- Single-file architecture (~13,000 lines)

## Data

- **Version:** King James Version (KJV)
- **Word counts:** Per-chapter verified totals in `kjv_chapter_word_counts.csv`
- **Totals:** 789,634 words (OT: 609,252 · NT: 180,382)

## Contributing

See [CLAUDE.md](CLAUDE.md) for developer docs, [TODO.md](TODO.md) for the roadmap, and [SECURITY.md](SECURITY.md) for security guidelines.

## License

Open source. See [LICENSE](LICENSE).

---

**Maintained by:** Shane (with AI assistance)
