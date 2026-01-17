# Bible Progress - TODO List

This document tracks known issues, improvements, and feature requests for the Bible Progress application.

**Last Updated:** 2026-01-17

---

## 🔴 High Priority Issues

### Performance

- [x] **Implement search debouncing** - `index.html:292, 1797-1825` ✅ **COMPLETED 2026-01-17**
  - ~~Debounce utility function exists but is not being used~~
  - Changed from `onkeyup` to `oninput` for better input handling (paste, cut, autocomplete)
  - Debounced search was already implemented, improved event handler for comprehensive input detection

- [ ] **Cache chart instances** - `index.html:~1741-1745`
  - Charts re-render completely on every tab switch
  - Consider caching Chart.js instances and only updating data
  - Potential 50-100ms performance improvement on tab switches

- [ ] **Optimize localStorage writes**
  - Every checkbox toggle writes entire appData object to localStorage
  - Consider implementing a debounced save mechanism
  - Risk: Balance between performance and data safety

### User Experience

- [ ] **Replace alert() and confirm() with custom modals** - Found 19 instances
  - `index.html:953` - Google login error
  - `index.html:1369-1497` - Profile management (8 alerts)
  - `index.html:1583-1642` - Sync rules (6 alerts)
  - `index.html:1850-1925` - Data backup/restore (3 alerts)
  - Custom modals would provide better UX and brand consistency
  - Should match existing auth-modal styling

- [x] **Fix dark mode inconsistency** ✅ **COMPLETED 2026-01-17**
  - ~~Settings UI shows dark mode toggle (`index.html:571-577`)~~
  - ~~But dark mode is currently an easter egg (triple-click logo)~~
  - **Resolution**: Both methods are now intentionally supported
    - Settings toggle is the primary, user-friendly access method (no notification)
    - Triple-click logo easter egg remains as a fun alternative (with notification)
    - Code comments clarified to document both access methods (`index.html:3238-3302`)
    - CLAUDE.md updated to document dark mode as a standard feature (Section 5)

- [x] **Enable user scaling on mobile** ✅ **COMPLETED 2026-01-17**
  - ~~`index.html:5` has `user-scalable=no` which is an accessibility issue~~
  - Updated viewport meta tag to allow pinch-to-zoom for better accessibility
  - Removed `maximum-scale=1.0` and `user-scalable=no` restrictions

### Accessibility

- [ ] **Add ARIA labels and roles** - Only 1 ARIA attribute found in entire app
  - Buttons need `aria-label` attributes
  - Checkbox inputs need proper labels
  - Tab navigation needs `role="tablist"` and `aria-selected`
  - Profile dropdown needs `aria-expanded` and `aria-haspopup`
  - Search input needs `aria-describedby` for results count

- [ ] **Improve keyboard navigation**
  - Tab navigation should support arrow keys
  - Chapter checkboxes need keyboard shortcuts
  - Modal dialogs need focus trapping
  - Add skip-to-content link

- [ ] **Add focus indicators**
  - Many interactive elements lack visible focus states
  - Important for keyboard-only users

---

## 🟡 Medium Priority Issues

### Code Quality

- [ ] **Remove production console.log statements** - 22+ instances found
  - `index.html:1839` - Backup details logging
  - `index.html:1896` - Restore details logging
  - Service worker registration logs (`service-worker.js`)
  - Keep only error logging, remove debug logs
  - Consider implementing proper error tracking (Sentry, LogRocket, etc.)

- [ ] **Add error boundaries and loading states**
  - Firebase operations have no loading indicators
  - Auth operations could show loading state
  - Backup/restore operations are silent until completion
  - Network errors have no user-friendly messaging

- [ ] **Standardize semicolon usage**
  - Code uses semicolons inconsistently
  - Pick a style (preferably with semicolons) and apply throughout

- [ ] **Convert inline event handlers to addEventListener**
  - Many `onclick=""` attributes in HTML
  - Should use proper event delegation
  - Better separation of concerns

### Security & Best Practices

- [ ] **Add Subresource Integrity (SRI) to CDN scripts**
  - `index.html:15` - Tailwind CSS CDN
  - `index.html:16` - Chart.js CDN
  - `index.html:18` - Google Fonts
  - Protects against CDN compromise attacks
  ```html
  <script src="https://cdn.jsdelivr.net/npm/chart.js"
          integrity="sha384-..."
          crossorigin="anonymous"></script>
  ```

- [ ] **Implement Content Security Policy (CSP)**
  - Add CSP meta tag or headers
  - Restrict script sources to trusted CDNs
  - Prevent XSS attacks

- [ ] **Add rate limiting to cloud sync**
  - No throttling on Firebase writes
  - Could hit quota limits with rapid clicking
  - Implement debounced sync (e.g., 2-5 seconds)

- [ ] **Sanitize error messages**
  - Some error messages might expose internal details
  - Review all `.catch()` blocks for information leakage

### PWA & Offline

- [ ] **Improve service worker cache strategy**
  - Current strategy: cache-first for everything
  - CDN resources (Tailwind, Chart.js) should have versioned caching
  - Consider network-first for index.html to get updates faster

- [ ] **Add offline indicator**
  - Users should know when they're offline
  - Show banner when IndexedDB/localStorage is being used
  - Indicate when cloud sync is unavailable

- [ ] **Handle service worker updates**
  - No "new version available" notification
  - Users might use stale cached version
  - Add update prompt with refresh button

### Data Management

- [ ] **Implement cloud sync conflict resolution**
  - CLAUDE.md notes: "No conflict resolution for simultaneous edits"
  - Last-write-wins is current behavior
  - Consider timestamp-based merging or manual conflict resolution

- [ ] **Add data migration strategy for Bible data changes**
  - Currently at `kjv_v6_data`
  - If Bible data is ever corrected, need migration path
  - Should validate total word count on load

- [ ] **Add data validation**
  - No validation when restoring from backup
  - Could corrupt data with malformed JSON
  - Should validate structure before accepting

---

## 🟢 Low Priority / Nice-to-Have

### Features (from CLAUDE.md Future Enhancements)

- [ ] **Implement reading streak tracking**
  - UI exists in stats page (`index.html:350-393`)
  - Shows "0 days" placeholders
  - Need to track dates and calculate streaks

- [ ] **Add reading notes per chapter**
  - Allow users to add personal notes to chapters
  - Store in appData structure
  - Display in chapter view

- [ ] **Custom reading plans**
  - Allow users to create their own plans
  - UI for plan builder
  - Store in appData structure

- [ ] **Daily reading reminders via PWA notifications**
  - Request notification permission
  - Use Notification API for daily reminders
  - Settings to configure time and frequency

- [ ] **Multiple Bible versions support**
  - Currently only KJV
  - Would require significant data structure changes
  - Could switch between versions or show parallel

- [ ] **Audio Bible integration**
  - Link to audio Bible resources
  - Integrate with Bible Gateway or similar
  - Play button next to each chapter

- [ ] **Social features**
  - Share progress on social media
  - Reading groups/communities
  - Progress comparisons with friends

- [ ] **Achievements system (reintroduce)**
  - Was added and then reverted according to commit history
  - Gamification for reading goals
  - Badges for milestones

### UI/UX Improvements

- [ ] **Add animations and transitions**
  - Smooth transitions between tabs
  - Animated progress bars
  - Celebratory animations for milestones

- [ ] **Improve mobile responsiveness**
  - Test on various screen sizes
  - Optimize touch targets (minimum 44x44px)
  - Better mobile menu/navigation

- [ ] **Add tutorial/onboarding**
  - First-time user guide
  - Highlight key features
  - Explain word-weighted tracking benefit

- [ ] **Category color customization**
  - Allow users to customize category colors
  - Store preferences in appData
  - Color picker interface

- [ ] **Reading heatmap enhancement**
  - Currently shows placeholder (`index.html:389`)
  - Implement GitHub-style contribution heatmap
  - Show reading intensity over time

### Developer Experience

- [ ] **Add JSDoc comments**
  - Document function parameters and return types
  - Helps with IDE autocomplete
  - Better code maintainability

- [ ] **Create constants file** (or section)
  - Magic numbers scattered throughout
  - Color codes, timeouts, limits should be constants
  - Easier to maintain and update

- [ ] **Add automated testing**
  - Unit tests for core functions
  - E2E tests for critical user flows
  - Prevent regressions

- [ ] **Add linting configuration**
  - ESLint for JavaScript
  - Consistent code style
  - Catch common errors

- [ ] **Create CONTRIBUTING.md**
  - Guidelines for contributors
  - Code style guide
  - PR process

### Documentation

- [ ] **Add API documentation**
  - Document Firebase structure
  - LocalStorage schema
  - Data model reference

- [ ] **Create troubleshooting guide**
  - Common issues and solutions
  - Browser compatibility notes
  - Data recovery procedures

- [ ] **Add LICENSE file**
  - Currently "open source (implied)" per README
  - Choose and add explicit license
  - Clarify usage rights

---

## 🐛 Known Bugs

- [ ] **Service worker may not update cached CDN resources**
  - `service-worker.js:2-8` caches CDN URLs without versioning
  - If Tailwind or Chart.js updates, users might get stale version
  - Solution: Add version to cache name or use network-first for CDNs

- [ ] **Profile color dot click counter persists across sessions**
  - Easter egg might trigger unexpectedly
  - Should reset counter on page load or profile switch

- [x] **Search results don't show count** ✅ **COMPLETED 2026-01-17**
  - ~~Users don't know how many results match~~
  - Added "X books found" counter below search box (`index.html:295, 1810-1822`)
  - Counter shows/hides automatically based on search query presence

- [ ] **Long profile names overflow UI**
  - Profile dropdown might not handle 50+ character names well
  - Add truncation with tooltip

- [ ] **Bible reading link might break for some chapters**
  - Blue Letter Bible URL format might change
  - Consider fallback to Bible Gateway or multiple sources

---

## 📊 Technical Debt

- [ ] **Single file architecture reaching limits**
  - `index.html` is 3,222 lines
  - Difficult to navigate and maintain
  - Consider splitting while maintaining "no build" philosophy
  - Possible solution: Multiple HTML files loaded via iframes or dynamic imports

- [ ] **Bible data is minified inline**
  - `index.html:~800-801` - Hard to audit or verify
  - Should extract to separate JSON file
  - Document source and verification process

- [ ] **No TypeScript or type checking**
  - Large codebase would benefit from types
  - Could use JSDoc for basic type hints
  - Or consider TypeScript with minimal build

- [ ] **Inconsistent naming conventions**
  - Mix of camelCase, PascalCase, UPPER_SNAKE_CASE
  - Should standardize per CLAUDE.md conventions

---

## 🎯 Refactoring Opportunities

- [ ] **Extract profile management into module**
  - `index.html:461-477` and related functions
  - Could be separate conceptual unit
  - Easier to test and maintain

- [ ] **Extract reading plan logic**
  - PLAN_MCHEYNE, PLAN_HORNER are large data structures
  - Plan calculation logic is complex
  - Could benefit from separation

- [ ] **Create utility functions module**
  - Color generation, hash functions, etc.
  - Debounce, throttle, etc.
  - Reusable across features

- [ ] **Separate rendering from business logic**
  - Currently mixed in same functions
  - Makes testing difficult
  - Consider simple MVC or similar pattern

---

## 📝 Notes

### CLAUDE.md Reminders for AI Assistants

When working on these items, remember to:

- ✅ Preserve single-file architecture (or minimal files)
- ✅ Match existing code style and conventions
- ✅ Test in browser before committing
- ✅ Maintain word count accuracy (789,634 total)
- ✅ Keep localStorage version consistent (or migrate)
- ✅ Update CLAUDE.md when making structural changes
- ❌ Don't add build tools or bundlers (unless absolutely necessary)
- ❌ Don't change color scheme without discussion
- ❌ Don't break localStorage compatibility

### Priority Guidelines

- **High Priority**: Affects user experience, performance, or accessibility significantly
- **Medium Priority**: Code quality, security best practices, technical improvements
- **Low Priority**: Nice-to-have features, polish, developer experience

### Contributing

When working on an item:

1. Update this TODO.md to mark item as in progress (add your name)
2. Create feature branch from main
3. Make changes following CLAUDE.md guidelines
4. Test thoroughly in browser
5. Update CLAUDE.md if structure changed
6. Mark item as complete with PR link

---

**Generated by:** AI Analysis
**Codebase Version:** kjv_v6_data
**Analysis Date:** 2026-01-17
