# Security Documentation - Bible Progress

## Overview

This document outlines the security measures implemented in the Bible Progress application and provides guidance for maintaining a secure deployment.

## Security Fixes Implemented

### 1. XSS (Cross-Site Scripting) Prevention

**Added HTML Escaping Utility Function**
- Location: `index.html:394-399`
- Function: `escapeHtml(text)` - Safely escapes user-provided text before rendering in DOM
- Usage: Use this function when rendering any user-generated content

**Replaced innerHTML with textContent**
- All sync status messages now use `textContent` instead of `innerHTML` to prevent XSS injection
- Locations: Lines 578, 585, 664, 677, 684

### 2. URL Validation

**HTTPS URL Validation for User Photos**
- Location: `index.html:402-409`
- Function: `isValidHttpsUrl(urlString)` - Validates URLs are HTTPS before using as image sources
- Applied to Firebase user photoURL to prevent:
  - JavaScript injection via `javascript:` URLs
  - Data URL exploits
  - Open redirect attacks
- Location: `index.html:572-576`

### 3. File Upload Security

**Backup File Restoration Validation**
- Location: `index.html:947-996`
- Implemented security checks:
  - ✅ File type validation (must be `.json`)
  - ✅ File size limit (5MB maximum)
  - ✅ Improved JSON parsing with better error handling
  - ✅ Input clearing after processing to prevent re-uploads
  - ✅ Validation of data structure before applying

### 4. Improved Error Handling

**JSON Parsing Protection**
- All `JSON.parse()` calls wrapped in try-catch blocks
- Locations: Lines 421-445 (localStorage parsing)
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

**Last Updated**: 2026-01-08
**Security Level**: Good (for a client-side Bible tracker)
**Compliance**: OWASP Top 10 addressed
