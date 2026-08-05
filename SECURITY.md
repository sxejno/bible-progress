# Security Documentation - Bible Progress

## Overview

This document outlines the security measures implemented in the Bible Progress application and provides guidance for maintaining a secure deployment.

## Security Fixes Implemented

### 1. XSS (Cross-Site Scripting) Prevention

**Added HTML Escaping Utility Function**
- Function: `escapeHtml(text)` - Safely escapes user-provided text before rendering in DOM
- Usage: Use this function when rendering any user-generated content

**Replaced innerHTML with textContent**
- All sync status messages now use `textContent` instead of `innerHTML` to prevent XSS injection

### 2. URL Validation

**HTTPS URL Validation for User Photos**
- Function: `isValidHttpsUrl(urlString)` - Validates URLs are HTTPS before using as image sources
- Applied to Firebase user photoURL to prevent:
  - JavaScript injection via `javascript:` URLs
  - Data URL exploits
  - Open redirect attacks

### 3. File Upload Security

**Backup File Restoration Validation**
- Implemented security checks:
  - ✅ File type validation (must be `.json`)
  - ✅ File size limit (5MB maximum)
  - ✅ Improved JSON parsing with better error handling
  - ✅ Input clearing after processing to prevent re-uploads
  - ✅ Validation of data structure before applying

### 4. Improved Error Handling

**JSON Parsing Protection**
- All `JSON.parse()` calls wrapped in try-catch blocks
- Prevents application crashes from malformed data
- Logs errors for debugging without exposing sensitive info

## Firebase Security Configuration

### CRITICAL: Firebase Security Rules

The Firebase API key exposed in the client-side code is **expected and normal** for web applications. However, you **MUST** implement proper Firestore Security Rules to protect your data.

#### Recommended Firestore Security Rules

Add these rules in the Firebase Console (Firestore Database → Rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read and write their own documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

#### Firebase Authentication Security

Add these rules in the Firebase Console (Authentication → Settings):

1. **Email Enumeration Protection**: Enable to prevent attackers from discovering valid email addresses
2. **Password Policy**: Enforce strong passwords (minimum 8 characters recommended)
3. **Authorized Domains**: Only allow your domain (bibleprogress.com) and localhost for testing

### Firebase App Check (Recommended)

For additional protection against abuse:

1. Enable Firebase App Check in Firebase Console
2. Register your web app
3. Add reCAPTCHA v3 for web verification

## Security Headers

### GitHub Pages Limitations

GitHub Pages doesn't allow custom HTTP headers, but you should be aware of these security headers for future hosting:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Known Security Limitations

### 1. Client-Side Only Architecture

**Limitation**: All validation and logic happens client-side
- **Risk**: Skilled attackers can bypass client-side validations
- **Mitigation**: Firebase Security Rules provide server-side enforcement
- **Impact**: Low for a personal Bible tracker (no sensitive data)

### 2. LocalStorage Security

**Limitation**: Data stored in localStorage is accessible to JavaScript
- **Risk**: XSS vulnerabilities could expose data
- **Mitigation**:
  - Strict XSS prevention (implemented)
  - Regular security audits
  - No sensitive personal data stored
- **Impact**: Low (Bible reading progress is not highly sensitive)

### 3. CDN Dependencies

**Current Status**: Using CDN without Subresource Integrity (SRI) hashes

**Recommendation for Future**:
```html
<!-- Replace current CDN imports with versioned + SRI -->
<script
  src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
  integrity="sha384-[HASH-HERE]"
  crossorigin="anonymous">
</script>
```

**Note**: Tailwind CDN (JIT mode) is incompatible with SRI. Consider migrating to Tailwind CLI build process for production.

### 4. Service Worker CORS

**Current**: Service worker caches all origins without validation
- **Risk**: Could serve cached content to cross-origin requests
- **Impact**: Low (all content is public Bible data)
- **Future Fix**: Add origin validation in service worker

## Security Best Practices for Developers

### When Modifying Code

1. **Never use innerHTML with user data**
   - ✅ Use `textContent` for plain text
   - ✅ Use `escapeHtml()` function if HTML is needed
   - ❌ Never directly insert user input into DOM

2. **Always validate external URLs**
   ```javascript
   // Good
   if (isValidHttpsUrl(url)) {
     img.src = url;
   }

   // Bad
   img.src = userProvidedUrl; // Could be javascript:alert(1)
   ```

3. **Wrap JSON.parse in try-catch**
   ```javascript
   // Good
   try {
     const data = JSON.parse(input);
   } catch (e) {
     console.error('Parse error:', e);
   }

   // Bad
   const data = JSON.parse(input); // Will crash on malformed JSON
   ```

4. **Validate file uploads**
   - Check file type
   - Enforce size limits
   - Validate content structure

### Code Review Checklist

Before committing changes, verify:

- [ ] No new innerHTML usage with dynamic content
- [ ] All user inputs are validated/sanitized
- [ ] All JSON.parse calls are wrapped in try-catch
- [ ] No secrets or API keys added (Firebase config is expected)
- [ ] External URLs are validated before use
- [ ] File uploads are properly validated

## Reporting Security Vulnerabilities

If you discover a security vulnerability:

1. **Do NOT** open a public GitHub issue
2. Email the maintainer directly (Shane)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if applicable)

## Security Audit History

| Date | Type | Findings | Status |
|------|------|----------|--------|
| 2026-01-08 | Comprehensive Security Review | 10 issues identified | Fixed (see above) |
| 2026-08-05 | Stored-XSS / import-hardening review | 6 issues across 4 pages | Fixed (see below) |

### 2026-08-05 Review — Stored XSS via imported / cloud-synced data

The theme of this review was **untrusted `appData`**: a malicious JSON backup a
user is tricked into importing, or a tampered/compromised Firestore document that
syncs down, can carry attacker-shaped strings. `validateAppData()` only checks the
top-level shape, so any field it doesn't cover reaches render code unescaped. Fixes:

1. **`index.html` — `planHistory` stored XSS (primary).** The plan-history list
   rendered the plan label with `${name}` (raw) where `name` falls back to the raw
   `entry.plan` string, and `planHistory` was never sanitized. A crafted
   `planHistory` entry executed script when the user viewed their plan history.
   Fixed by (a) validating `planHistory` and `profilePlans` against the known plan
   IDs in `normalizeAppData()`, and (b) escaping the label at the render site.
2. **`index.html` — profile-name stored XSS.** Profile names are alphanumeric-only
   when created (`sanitizeProfileName`) but are **not** re-sanitized on import/sync.
   The delete/rename modal titles and the profile-sync-rule prompts interpolated
   names raw into `showCustomModal` (which renders via `innerHTML`). Escaped every
   such site with `escapeHtml()`. (The always-on displays — profile list, header —
   already used `textContent`/`innerText` and were safe.)
3. **`index.html` — `profilePlans` in exports.** Plan IDs were rendered raw into the
   PDF / visual-report export HTML via `getPlanDisplayName()`'s raw fallback; the new
   `normalizeAppData()` whitelist closes this.
4. **`biblical-languages-trainer.html` — `blt2-lang` → `innerHTML`.** The language
   value (writable from an imported backup or cloud doc) was concatenated into
   `innerHTML` unescaped. Now whitelisted to `greek`/`hebrew` at the sink and at the
   cloud-write. State scalars (`streak`, `xp`, `xpToday`, `goal`) are now escaped at
   render, and the backup-import loop is restricted to this app's own keys (a crafted
   backup could previously write **any** localStorage key on the origin, e.g. the main
   app's `kjv_v6_data`).
5. **`prophecy.html` — `javascript:` link.** Article links from the third-party
   rss2json API were bound to a React `href` (React does not block `javascript:`/`data:`
   URLs). Added a `safeUrl()` guard that only allows `http(s)`.
6. **`memorize.html` — quote-unsafe `escapeHtml`.** Its DOM-based escaper left `"`/`'`
   intact (unsafe if an escaped value is ever placed in an HTML attribute). Replaced
   with the quote-escaping regex version used elsewhere. Defense-in-depth.

All fixes were verified end-to-end in headless Chromium by seeding malicious
`appData`/state and confirming (a) the app still boots and functions and (b) no
script executes and no attacker element is injected into the DOM.

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Web Security Checklist](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## Future Security Enhancements

Priority improvements for consideration:

1. **HIGH**: Migrate to Tailwind CLI with SRI hashes for production
2. **MEDIUM**: Implement Firebase App Check
3. **MEDIUM**: Add rate limiting for API calls
4. **LOW**: Consider encryption for localStorage (if sensitive features added)
5. **LOW**: Add security headers (requires migration from GitHub Pages)

---

> **Most important control — verify it is actually deployed.** Because the app is
> client-side only, the Firestore Security Rules above are the *only* server-side
> boundary protecting one user's cloud data from another. Client-side validation
> (`validateAppData`/`normalizeAppData`) protects the local device from malicious
> imports/snapshots, but it cannot stop a determined attacker from writing to the
> database directly. Confirm in the Firebase Console that the per-user rules are
> published and that the catch-all `allow read, write: if false;` is present.

**Last Updated**: 2026-08-05
**Security Level**: Good (for a client-side Bible tracker)
**Compliance**: OWASP Top 10 addressed
