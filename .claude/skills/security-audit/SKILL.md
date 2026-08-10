---
name: security-audit
description: Project-specific security rules and review checklist — XSS choke points, escapeHtml/isValidHttpsUrl usage, prototype-pollution guards, import/upload validation, what's safe to expose. Use when reviewing a diff for security, handling user input, or touching import/export/sync code.
---

# Security review (project-specific)

Threat model: client-side-only app; XSS → localStorage/Firestore data exposure.
Firebase API key in source is EXPECTED (server-side enforcement lives in Firestore
rules, managed in the Firebase console — canonical rules in SECURITY.md).

## Choke points (know these before reviewing)

| Function | Anchor | Role |
|---|---|---|
| `escapeHtml(s)` | `function escapeHtml(s)` (defined in the easter-egg region, used globally) | escape ALL user strings before innerHTML |
| `isValidHttpsUrl` | `function isValidHttpsUrl(` | any URL used as `src`/`href` (blocks `javascript:`/`data:`) |
| `validateAppData` | `function validateAppData(data)` | reject: non-object, `__proto__`/`constructor`/`prototype` keys (`FORBIDDEN_KEYS` + `hasForbiddenKeys`), malformed profiles |
| `normalizeAppData` | `function normalizeAppData(data)` | deep-strip forbidden keys (depth ≤4), cap memorizedVerses lengths (id/ref ≤100, text ≤1000), whitelist goal types, sanitize customPlans |
| `showToast` | `window.showToast = function` | messages escaped centrally at the single insertion point — pass raw text, never pre-built HTML |
| `sanitizeProfileName` | grep it | alphanumeric, ≤20 chars |

The three untrusted-data entry points ALL run validate + normalize: localStorage
load, cloud snapshot (`processCloudSnapshot`), JSON import (`restoreData`).
If you add a fourth entry point (new import format, URL params into state), it
must run both too.

## Rules for any diff

1. No `innerHTML` with unescaped user data — user data = profile names, verse
   text, goal names, custom plan names, anything from import/cloud. Prefer
   `textContent`; if HTML is needed, `escapeHtml()` every interpolation.
2. **No user text inside inline `onclick="..."` attributes** — even escaped,
   quoting is fragile. Use `data-*` attributes + a listener wired after render
   (existing pattern: `data-remove-verse` in `showMemorizedVerses`).
3. File uploads: `.json` type check + 5 MB cap (`MAX_BACKUP_SIZE_MB`) +
   `validateAppData` before applying — keep all three for any new upload.
4. `JSON.parse` always in try/catch.
5. New appData fields must be sanitized in `normalizeAppData` (length caps, type
   whitelists) — remember imports and cloud docs are attacker-controllable in
   principle.
6. No secrets in the repo. Firebase config is fine; nothing else is.
7. Don't relax the Firestore rules pattern (`users/{uid}` owner-only).

## Review checklist (per diff)

- [ ] grep the diff for `innerHTML` — each hit either static or escaped
- [ ] new user inputs validated/normalized on ALL load paths
- [ ] no user data in inline event handlers or `javascript:`-able sinks
- [ ] URLs through `isValidHttpsUrl` before assignment to src/href
- [ ] imports/cloud data can't smuggle `__proto__` into new structures
- [ ] error messages don't leak internals (paths, config)

Known accepted limitations (don't re-flag): CDN scripts without SRI (Tailwind JIT
is SRI-incompatible; migration is a roadmap item), no CSP headers (GitHub Pages
can't set headers; meta-tag equivalents present), localStorage readable by any JS
on the origin.

Vulnerability reports: email the maintainer (Shane) — never a public issue.
