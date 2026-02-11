# Contributing to Bible Progress

Thanks for your interest in contributing! This guide will help you get started.

## Getting Started

1. **Fork** this repository
2. **Clone** your fork locally
3. **Open** `index.html` in a browser — that's the entire app
4. Make your changes and test thoroughly
5. **Submit** a pull request

## Architecture

Bible Progress is a **single-file PWA**. The entire application lives in `index.html` (~3,900 lines). There is no build process, no bundler, no framework — just vanilla HTML, CSS, and JavaScript.

**Key files:**
- `index.html` — The app (HTML + CSS + JS, all-in-one)
- `CLAUDE.md` — Detailed developer documentation and code reference
- `TODO.md` — Roadmap and feature ideas
- `SECURITY.md` — Security guidelines

## Development Guidelines

### Do
- Preserve the single-file architecture
- Match existing code style (template literals, arrow functions, Tailwind utilities)
- Use `escapeHtml()` for any user data rendered as HTML
- Use `isValidHttpsUrl()` for URL validation
- Test across all three reading plans (Sequential, M'Cheyne, Horner)
- Test on mobile and desktop
- Keep the total Bible word count at **789,634** (OT: 609,252 | NT: 180,382)

### Don't
- Add build tools or split into multiple JS files
- Use `innerHTML` with unsanitized user data
- Modify Bible word counts without verification
- Break localStorage compatibility (key: `kjv_v6_data`)
- Remove easter eggs — users love them!

## Testing Checklist

Before submitting a PR, verify:

- [ ] App loads without console errors
- [ ] Chapter marking works (click to mark read/unread)
- [ ] Progress percentages update correctly
- [ ] All reading plans render properly
- [ ] Dark mode works (Settings toggle or triple-click logo)
- [ ] Mobile layout is responsive
- [ ] No regressions in existing features

## Code Style

- **Indigo** is the primary color throughout the UI
- Use Tailwind CSS utilities for styling
- Attach event handlers to `window` object for global functions
- Use `CONFIG` constants instead of magic numbers

## Reporting Issues

Open a GitHub issue with:
- What you expected to happen
- What actually happened
- Browser and device info
- Screenshots if applicable

## Questions?

Check `CLAUDE.md` for detailed architecture docs, or open an issue to ask.
