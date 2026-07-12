---
name: add-feature
description: Playbook for adding or changing a feature in the single-file app — code conventions, UI building blocks (modals, toasts, focus traps), where new code goes, and the pre-commit checklist. Use for any feature work, UI change, or refactor in index.html.
---

# Adding a feature

Read `codebase-map` first to locate the right region. All code goes into
`index.html` — never split files, never add a build step or heavy dependency.

## Code conventions (match exactly)

- Vanilla ES6 inside the one `<script type="module">`: arrow functions, template
  literals, no semicolon requirement (match neighboring code).
- Handlers: attach to `window` (`window.myFeature = () => {...}`), wire from HTML
  with inline `onclick="window.myFeature()"`. Add near related handlers or in the
  `// --- GLOBAL EXPORTS ---` region.
- Styling: Tailwind utility classes only; **indigo** is the primary color
  (`indigo-600` buttons, `slate` neutrals). Rounded-2xl cards, shadow patterns —
  copy an existing card.
- Section banner comments: `// --- MY NEW SECTION ---` so the map stays greppable.
- New render logic goes in a `renderX()` function; call it from `setTab`'s dispatch
  (edit the ORIGINAL `setTab`, not the easter-egg wrapper — grep `originalSetTab`).

## Non-negotiable rules

1. **`escapeHtml()` every user-controlled string** before it enters a template
   literal that lands in innerHTML (profile names, verse text, goal names, imported
   data). Never put user text inside inline `onclick="..."` attributes — use
   `data-*` attributes + a delegated listener (see `data-remove-verse` pattern in
   `showMemorizedVerses`).
2. **State changes must call `window.saveProgress()`** (debounced) or
   `saveProgress(true)` (immediate — use for switches/preferences that must survive
   a quick close). Never write `localStorage` directly for app state.
3. **New appData fields need the full data-model checklist** — see the `data-model`
   skill (12 code sites: defaults, migration, normalize, cloud merge, profile
   create/delete/rename, import, exports). Skipping the cloud-merge step is the #1
   source of "my field vanishes after sync" bugs.
4. No native `alert()`/`confirm()`/`prompt()` — use `window.showAlert` /
   `showConfirm` / `showPrompt` / `showCustomModal`.
5. Keep the 789,634 word-count invariant — never touch the `bible` array without
   the verification in the `bible-data` skill.

## UI building blocks (reuse, don't reinvent)

| Need | Use |
|---|---|
| Toast / notification | `window.showToast(msg, 'success'\|'error'\|'warning'\|'info', durationMs, {label, onAction})` — message is escaped centrally; the action object powers Undo buttons |
| Tiny confirmation | `window.showMicroToast(msg)` |
| Modal dialog | `showAlert/showConfirm/showPrompt`, or build a dynamic modal and call `window.enhanceDynamicModal(modal)` (adds focus trap, Escape-close, focus restore) |
| Choose profile(s) | `window.showProfilePicker(...)` (used by all exports) |
| Error wrapping | `withErrorHandling(fn, 'User-friendly message')` |
| Day keys / dates | `getLocalDateString(ts)`, `getTodaysDate()`, `getDayOfWeekFromDateString(str)` — never `new Date("YYYY-MM-DD")` for weekday math |
| Per-chapter word count | `getWordCountForChapter("Genesis-1")` (cached Map — don't `bible.find` in loops) |

## Accessibility & dark mode (required for new UI)

- Icon-only buttons need `aria-label`; toggles need `role="switch"` + `aria-checked`;
  touch targets ≥ 44×44px.
- Dark mode is CSS `filter: invert(0.9) hue-rotate(180deg)` on `body.dark-mode`,
  with `img`, `canvas`, `[data-no-invert]` re-inverted. If your feature adds images
  or true-color elements, add `data-no-invert` and check both themes.
- Live announcements: toasts already set `aria-live` — prefer them over custom regions.

## Pre-commit checklist

- [ ] Ran the `verify` skill (headless Chromium) and exercised the feature end-to-end
- [ ] User strings escaped; no user text in inline handlers
- [ ] `saveProgress()` called; state survives reload (check `localStorage.kjv_v6_data`)
- [ ] Tested with a Horner profile AND a Sequential profile (plan-dependent rendering)
- [ ] Dark mode + mobile width (390px) look right
- [ ] If assets/pages changed: bump `CACHE_NAME` in service-worker.js (see `ship` skill)
- [ ] Updated CLAUDE.md data model / TODO.md if structure changed
