# Bible Progress - Development Roadmap & TODO

This document provides a strategic roadmap for the Bible Progress application, organized by priority and timeline.

**Last Updated:** 2026-02-17
**Current Version:** kjv_v6_data
**Application Status:** Production-ready with active feature development

---

## 🎯 Strategic Priorities

### Core Values
1. **User Experience First** - Smooth, delightful interactions
2. **Accessibility for All** - WCAG 2.1 AA compliance
3. **Performance** - Fast load times, responsive UI
4. **Data Integrity** - Never lose user progress
5. **Simplicity** - Maintain single-file architecture where possible

---

## 🚨 Critical Issues (Fix Immediately)

These issues significantly impact user experience and should be addressed ASAP.

### Accessibility Blockers
- [ ] **🔴 CRITICAL: Add comprehensive ARIA labels** - `index.html` (entire app)
  - **Impact**: Screen reader users cannot navigate effectively
  - **Effort**: Medium (2-3 hours)
  - **Locations**: Buttons, checkboxes, tabs, profiles, modals
  - **Requirements**:
    - Tab navigation: `role="tablist"`, `aria-selected`
    - Buttons: `aria-label` for icon-only buttons
    - Checkboxes: Proper label associations
    - Profile dropdown: `aria-expanded`, `aria-haspopup`
    - Search: `aria-describedby` for results count

- [ ] **🔴 Add keyboard navigation support**
  - **Impact**: Keyboard-only users cannot use app efficiently
  - **Effort**: Medium (3-4 hours)
  - **Tasks**:
    - Arrow key navigation for tabs
    - Keyboard shortcuts for chapter marking (space/enter)
    - Modal focus trapping
    - Skip-to-content link
    - Visible focus indicators throughout

### User Experience Issues
- [ ] **🔴 Replace remaining native confirm() with custom modal** - 1 instance remaining
  - **Impact**: Poor UX, breaks mobile flow, looks unprofessional
  - **Location**: `index.html:8004` - toggleAllInBook reset confirmation
  - **Solution**: Use existing `window.showConfirm()` custom modal system
  - **Note**: Most native alerts were already replaced with custom modal system (lines ~2052+)

---

## 📅 Q1 2026 Roadmap (Jan-Mar)

### Phase 1: Accessibility & Polish (Weeks 1-2)

**Goals**: Make app fully accessible, polish existing features
**Status**: 🟢 Ready to start

- [ ] **Week 1: Accessibility fundamentals**
  - [ ] Add comprehensive ARIA labels (all interactive elements)
  - [ ] Implement keyboard navigation (tabs, chapters, modals)
  - [ ] Add visible focus indicators
  - [ ] Test with NVDA/JAWS screen readers
  - **Deliverable**: WCAG 2.1 AA compliant navigation

- [ ] **Week 2: UX refinements**
  - [ ] Replace all 19 alert()/confirm() with custom modals
  - [ ] Add loading states for Firebase operations
  - [ ] Add error boundaries with user-friendly messages
  - [ ] Improve mobile touch targets (44x44px minimum)
  - **Deliverable**: Professional, consistent user experience

### Phase 2: Performance & Security (Weeks 3-4)

**Goals**: Optimize performance, harden security
**Status**: 🟢 Ready to start

- [ ] **Week 3: Performance optimization**
  - [ ] Debounce localStorage writes (batch saves every 500ms)
  - [ ] Add rate limiting to cloud sync (max 1 write/2 seconds)
  - [ ] Optimize PWA cache strategy (network-first for index.html)
  - [ ] Add offline indicator for users
  - **Deliverable**: 30% faster interactions, lower Firebase costs

- [ ] **Week 4: Security hardening**
  - [ ] Add Subresource Integrity (SRI) to CDN scripts
  - [ ] Implement Content Security Policy headers
  - [ ] Sanitize all error messages (prevent info leakage)
  - [ ] Add data validation for backup restore
  - **Deliverable**: Security audit clean report

### Phase 3: Data Reliability (Weeks 5-6)

**Goals**: Never lose user data, smooth synchronization
**Status**: 🟡 Requires planning

- [ ] **Cloud sync conflict resolution**
  - [x] Implement timestamp-based merging ✅ **COMPLETED 2026-06-11** — `appData.lastModified` stamped on every save; stale cloud snapshots are skipped and local state re-pushed
  - [ ] Add manual conflict resolution UI
  - [ ] Test simultaneous edits across devices
  - **Deliverable**: Robust multi-device sync

- [ ] **Data integrity improvements**
  - [ ] Validate total word count on load (789,634)
  - [ ] Add automatic backup before migrations
  - [ ] Implement data recovery UI for corrupted state
  - **Deliverable**: Zero data loss guarantee

---

## 📅 Q2 2026 Roadmap (Apr-Jun)

### Feature: Enhanced Reading Insights

**Goals**: Help users understand and improve reading habits
**Status**: 🟡 Design phase

- [ ] **Reading heatmap enhancement**
  - [ ] GitHub-style contribution heatmap
  - [ ] Show reading intensity over time (daily/weekly/monthly views)
  - [ ] Highlight longest/current streaks visually
  - [x] Export heatmap as image ✅ **COMPLETED 2026-06-12** — "Share Progress" button on Stats renders a 1080x1080 PNG card with %, streaks, and a 12-week heatmap strip (Web Share on mobile, download elsewhere)

- [ ] **Reading estimates and projections**
  - [x] Calculate "finish date" based on current pace ✅ **COMPLETED 2026-06-11** — "Projected Finish" card on Stats page (last-30-day pace with all-time fallback)
  - [x] Show average chapters/day ✅ **COMPLETED 2026-06-12** — Avg Ch/Day in the This Week & This Month report card
  - [ ] Project completion date for each reading plan
  - [x] Weekly/monthly progress reports ✅ **COMPLETED 2026-06-12** — Stats card with chapters/words/reading time/avg per current week and month, with % delta vs the same elapsed span of the previous period

- [ ] **Personal reading notes**
  - [ ] Add note-taking per chapter
  - [ ] Rich text editor (bold, italic, lists)
  - [ ] Search across all notes
  - [ ] Export notes as PDF/markdown

### Feature: Custom Reading Plans

**Goals**: Empower users to create personalized plans
**Status**: 🔴 Needs design

- [ ] **Plan builder UI**
  - [ ] Drag-and-drop interface for chapter ordering
  - [ ] Template system (based on M'Cheyne, Horner)
  - [ ] Share plans with others (export/import)
  - [ ] Calendar view for plan scheduling

- [ ] **Plan analytics**
  - [ ] Estimated completion time
  - [ ] Word count distribution visualization
  - [ ] Difficulty balance (based on chapter lengths)

---

## 📅 Q3-Q4 2026 Roadmap (Jul-Dec)

### Major Feature: Social & Community

**Goals**: Enable shared reading experiences
**Status**: 🔴 Research phase

- [ ] **Reading groups**
  - [ ] Create/join reading groups
  - [ ] Shared progress tracking
  - [ ] Group challenges and milestones
  - [ ] Discussion boards per chapter

- [ ] **Progress sharing**
  - [x] Generate shareable progress cards (social media) ✅ **COMPLETED 2026-06-12** — "Share Progress" PNG card (1080x1080) via Web Share API with download fallback
  - [ ] Embed progress widget on personal websites
  - [ ] Leaderboards (opt-in)

### Major Feature: Multiple Bible Versions

**Goals**: Support ESV, NIV, NASB, etc.
**Status**: 🔴 Research phase

- [ ] **Version support infrastructure**
  - [ ] Refactor data model for multi-version support
  - [ ] License acquisition for commercial versions
  - [ ] Parallel view (side-by-side comparison)
  - [ ] Version-specific word counts

### Major Feature: Audio Integration

**Goals**: Integrate listening with reading tracking
**Status**: 🔴 Research phase

- [ ] **Audio Bible integration**
  - [ ] Partner with Bible Gateway/YouVersion
  - [ ] Built-in audio player
  - [ ] Auto-mark chapters as "listened"
  - [ ] Playback speed controls

---

## 🔧 Technical Debt & Code Quality

### Ongoing Maintenance (No specific timeline)

**Priority**: 🟡 Medium - Address as time permits

#### Code Quality
- [ ] **Remove production console.log statements** - 9 instances
  - `index.html` - Debug mode, Bible load, backup, easter eggs, service worker registration
  - `service-worker.js` - Registration logs
  - **Action**: Keep only error logging, remove debug logs or gate behind DEBUG_MODE

- [ ] **Standardize code style**
  - [ ] Consistent semicolon usage (pick a style and apply)
  - [ ] Convert inline `onclick=""` to `addEventListener`
  - [ ] Add JSDoc comments for functions
  - [ ] Extract magic numbers to constants section

#### PWA Improvements
- [ ] **Service worker enhancements**
  - [ ] Version CDN resource caching (prevent stale Tailwind/Chart.js)
  - [ ] Network-first strategy for index.html
  - [ ] "New version available" notification with refresh button
  - [ ] Handle update failures gracefully

#### Developer Experience
- [ ] **Documentation**
  - [ ] Create CONTRIBUTING.md (contributor guidelines)
  - [ ] Add LICENSE file (choose explicit license)
  - [ ] Document Firebase schema in detail
  - [ ] Create troubleshooting guide

- [ ] **Testing infrastructure**
  - [ ] Add ESLint configuration
  - [ ] Implement unit tests for core functions
  - [ ] Add E2E tests for critical flows
  - [ ] Set up CI/CD pipeline

---

## 🏗️ Architecture Considerations

### Single-File Architecture Trade-offs

**Current Status**: `index.html` is ~13,000 lines
**Decision Point**: When to refactor?

**Pros of current approach:**
- ✅ No build step required
- ✅ Easy deployment (single file)
- ✅ Fast initial load
- ✅ Simple mental model

**Cons of current approach:**
- ❌ Difficult to navigate and maintain
- ❌ Hard to collaborate (merge conflicts)
- ❌ No proper separation of concerns
- ❌ Can't use modern tooling effectively

**Potential Solutions** (Q4 2026):
1. **Option A**: Extract to modules with dynamic imports
   - Keep no-build philosophy
   - Use ES6 modules natively
   - Split: `app.js`, `ui.js`, `data.js`, `firebase.js`

2. **Option B**: Minimal build with Vite
   - Fast dev server with HMR
   - Optimized production bundle
   - TypeScript support
   - Still deploy as static files

3. **Option C**: Stay single-file
   - Use better code organization (regions/sections)
   - Improve inline documentation
   - Better IDE navigation with landmarks

**Recommendation**: Already past 13,000 lines — review before adding team members

### Bible Data Extraction

**Current Status**: Minified inline at ~line 800
**Issue**: Hard to verify, audit, or update

**Proposed Solution** (Q2 2026):
- [ ] Extract to `bible-data.json`
- [ ] Document source and verification process
- [ ] Add checksum validation on load
- [ ] Keep in separate file but load statically (no build)

---

## 🗄️ Backlog (Future Ideas)

### Low Priority Features

**Status**: 🔵 Not planned - Revisit if requested

- [ ] **Category color customization**
  - Allow users to choose custom colors for Bible categories
  - Store in appData.customColors
  - Color picker UI in Settings

- [ ] **Tutorial/onboarding flow**
  - First-time user walkthrough
  - Highlight key features (word-weighted, plans, profiles)
  - Optional skip button

- [ ] **Achievements system v2**
  - Previously implemented and reverted
  - Gamification badges (read all gospels, finish OT, etc.)
  - Milestone celebrations beyond streaks

- [ ] **Daily reading reminders**
  - PWA push notifications
  - Customizable reminder time
  - Smart reminders (based on typical reading time)

- [ ] **Enhanced dark mode**
  - Currently uses CSS inversion
  - Custom color palette for true dark theme
  - Automatic switching based on time of day

- [ ] **Reading speed tracking**
  - Calculate average chapters/hour
  - Estimate time to complete remaining books
  - Personal reading statistics

### Experimental Ideas

**Status**: 🔵 Brainstorming - Needs validation

- [ ] **AI-powered insights**
  - Suggest reading plans based on habits
  - Identify patterns (favorite books, times, etc.)
  - Reading buddy chatbot for accountability

- [ ] **Gamification elements**
  - Reading challenges (30-day gospel challenge)
  - Progress-based unlockables
  - Friendly competitions with other users

- [ ] **Cross-platform apps**
  - Native iOS app (SwiftUI)
  - Native Android app (Kotlin)
  - Desktop app (Electron)
  - Shared backend with web app

---

## 🐛 Known Bugs & Issues

### Active Bugs (Need Fixes)

- [ ] **🔴 HIGH: Service worker caches stale CDN resources**
  - **Location**: `service-worker.js`
  - **Impact**: Users may see outdated Tailwind/Chart.js after CDN updates
  - **Solution**: Version cache name or use network-first for CDNs
  - **Priority**: High (affects all users on update)

- [ ] **🟡 MEDIUM: Blue Letter Bible links may break**
  - **Location**: External reading links
  - **Impact**: If BLB changes URL format, links fail
  - **Solution**: Add fallback to Bible Gateway, detect broken links
  - **Priority**: Medium (external dependency)

- [ ] **🟢 LOW: Profile color dot easter egg counter persists**
  - **Location**: Easter egg logic
  - **Impact**: Easter egg might trigger unexpectedly after page reload
  - **Solution**: Reset counter on page load or profile switch
  - **Priority**: Low (doesn't break functionality)

### Fixed Bugs (Recently Resolved)

- [x] **Timezone bugs in day-of-week logic** ✅ **COMPLETED 2026-06-11**
  - Day-of-week stats chart used `new Date("YYYY-MM-DD").getDay()` (UTC parse) — every reading attributed to the previous weekday for US users
  - Heatmap mixed Eastern date strings with local-timezone `getDay()` — misaligned grid
  - Five-Day plan used local day-of-week instead of Eastern — wrong day's reading shown
  - Added `getEasternDayOfWeek()` and `getDayOfWeekFromDateString()` helpers; all day boundaries now consistently Eastern Time

- [x] **Backup restore hardening** ✅ **COMPLETED 2026-06-11**
  - `validateAppData()` now rejects `__proto__`/`constructor`/`prototype` keys (prototype pollution)
  - Legacy single-profile import now validates entries look like chapter data instead of accepting any object
  - Restored custom plans get `psalms`/`proverbs` defaults (older backups rendered "undefined Ps")

- [x] **Service worker fixes** ✅ **COMPLETED 2026-06-11**
  - Crash when requests lack an `Accept` header (null dereference in fetch handler)
  - Data files (fivedayplan, pronunciations, chapter summaries) now pre-cached; `kjv_bible.json`/`bsb.txt` cached via "download offline" flow
  - Cache bumped to `bible-progress-v6`

- [x] **BSB reader showed blank page if bsb.txt failed to parse** ✅ **COMPLETED 2026-06-11**
  - Empty parse result now surfaces the "Unable to Load Bible Text" error UI

- [x] **Bible version preference could be lost on quick close** ✅ **COMPLETED 2026-06-11**
  - `setBibleVersion` now saves immediately instead of debounced

- [x] **Profile name truncation + misc escaping** ✅ **COMPLETED 2026-06-11**
  - Long profile names truncate with tooltip; book/category names escaped in onclick/title attributes
  - `processCloudSnapshot` uses `CONFIG.STORAGE_KEY_DATA` instead of hardcoded key

- [x] **Search results don't show count** ✅ **COMPLETED 2026-01-17**
  - Added "X books found" counter below search box

- [x] **Horner plan showing chapters as read incorrectly** ✅ **COMPLETED 2026-01-18** (#69)
  - Fixed list completion vs. chapter read status confusion
  - Separated daily tracking from individual chapter completion

- [x] **Daily plan "Mark as Read" button broken for ranges** ✅ **COMPLETED 2026-01-18** (#68)
  - Fixed event parameter forwarding in wrapper functions

### February 2026 Achievements

- [x] **Search clear button** ✅ **COMPLETED 2026-02-17**
  - Added X button to book search input for clearing search text
  - Shows/hides dynamically based on input content

- [x] **Replaced last native confirm() with custom modal** ✅ **COMPLETED 2026-02-17**
  - `toggleAllInBook` now uses `window.showConfirm()` instead of native `confirm()`

- [x] **Fixed planLabels missing FIVE_DAY and CUSTOM** ✅ **COMPLETED 2026-02-17**
  - Obsidian and PDF exports now show proper labels for all 6 plan types

- [x] **Updated all documentation** ✅ **COMPLETED 2026-02-17**
  - Fixed stale line references in TODO.md, SECURITY.md
  - Updated line count from ~3,900 to ~13,000 across CLAUDE.md, README.md, TODO.md
  - Updated reading plan count from 3/4 to 6 in CLAUDE.md, README.md
  - Added FIVE_DAY and CUSTOM to data model in CLAUDE.md

---

## 🎯 Top UX & Feature Improvements (Prioritized)

These are the highest-impact improvements identified from a Feb 2026 audit.

### Tier 1: High Impact, Low Effort

- [x] **1. Increase touch target sizes for close/action buttons** ✅ **COMPLETED 2026-06-11**
  - Enlarged modal close buttons, help button, and search clear button to ≥44x44px

- [x] **2. Add keyboard arrow-key navigation for main tabs** ✅ **COMPLETED 2026-06-11**
  - ArrowLeft/ArrowRight/Home/End on the main tab bar; `aria-selected` now kept in sync

- [x] **3. Add focus trap to modals** ✅ **COMPLETED 2026-06-11**
  - Shared `createFocusTrap()` helper wired into custom modals, profile-pick modal, and Bible reader; restores focus on close

### Tier 2: High Impact, Medium Effort

- [ ] **4. Proper dark mode with CSS custom properties**
  - Current: `filter: invert(0.9)` — causes image distortion, potential perf issues
  - Fix: Use CSS variables for background/text/accent colors per theme
  - Benefit: Better colors, better performance, no image distortion

- [ ] **5. Add loading indicator for Firebase sync operations**
  - Login shows "Logging in..." (good), but cloud sync has no visual feedback
  - Fix: Show spinner/toast during sync writes and reads

- [x] **6. Add scroll-to-top floating button** ✅ **COMPLETED 2026-06-11**
  - Floating button appears after scrolling past 600px, smooth-scrolls to top

### Tier 3: Nice-to-Have

- [x] **7. Add skip-to-main-content link** ✅ **COMPLETED 2026-06-11**
  - Hidden link at top of page, visible on keyboard focus

- [ ] **8. Empty state for dashboard when no chapters read**
  - Dashboard shows 0% but no helpful onboarding prompt
  - Fix: Show CTA to pick a reading plan or mark first chapter

- [x] **9. Profile name truncation for long names** ✅ **COMPLETED 2026-06-11**
  - Truncation + title tooltip in profile dropdown and header trigger

---

## 📊 Refactoring Opportunities (Q3-Q4 2026)

### Module Extraction

**Goal**: Improve code organization without breaking single-file philosophy

- [ ] **Extract profile management**
  - **Size**: ~300 lines
  - **Benefit**: Easier testing, clear boundaries
  - **Approach**: ES6 module with dynamic import

- [ ] **Extract reading plan logic**
  - **Location**: PLAN_MCHEYNE, PLAN_HORNER definitions + rendering
  - **Size**: ~500 lines
  - **Benefit**: Easier to add new plans
  - **Approach**: Plugin architecture

- [ ] **Extract Firebase integration**
  - **Location**: Auth + Firestore functions
  - **Size**: ~400 lines
  - **Benefit**: Could swap backends easily
  - **Approach**: Service abstraction layer

- [ ] **Create utility library**
  - **Functions**: debounce, throttle, color generation, hash
  - **Size**: ~200 lines
  - **Benefit**: Reusable, testable
  - **Approach**: Pure functions module

### Code Quality Improvements

- [ ] **Separate rendering from business logic**
  - **Issue**: render* functions mix data manipulation with DOM updates
  - **Solution**: View layer pattern (data → render)
  - **Benefit**: Easier testing, better performance

- [ ] **Standardize naming conventions**
  - **Issue**: Mix of camelCase, PascalCase, UPPER_SNAKE_CASE
  - **Solution**: Follow CLAUDE.md conventions consistently
  - **Benefit**: Better readability

- [ ] **Add TypeScript/JSDoc types**
  - **Issue**: No type safety in large codebase
  - **Solution**: JSDoc comments for gradual typing
  - **Benefit**: Better IDE support, fewer runtime errors

---

## 📋 Completed Features (Recent Wins)

### January 2026 Achievements

- [x] **Reading streak system** ✅
  - Heatmap visualization, milestone celebrations, dynamic emoji progression

- [x] **Comprehensive ARIA labels** ✅
  - 35+ labels for full screen reader support
  - WCAG 2.1 AA compliant

- [x] **Horner daily progress tracking** ✅
  - Per-profile list completion tracking
  - Resets daily at midnight

- [x] **Chart instance caching** ✅
  - 50-100ms performance improvement on tab switches

- [x] **Search debouncing** ✅
  - Smooth, responsive search with results counter

- [x] **Delightful animations** ✅
  - Tab transitions, progress bars, confetti celebrations

- [x] **Dark mode (dual access)** ✅
  - Settings toggle + triple-click logo easter egg

- [x] **User scaling on mobile** ✅
  - Removed viewport restrictions for accessibility

- [x] **Scripture memorization workspace** ✅
  - memorize.html: memorize verses, whole chapters, or entire books
  - Guided verse-by-verse cumulative "Learn" flow + freeform Practice canvas
  - First-letter hints, hidden recall, type-to-test, read-aloud
  - Per-verse mastery progress + Leitner spaced-repetition review scheduling
  - Imports starred verses from the app; migrates legacy custom-verse data
  - Consolidated first-letter-method.html into memorize.html (printable study
    sheets are now native; the old URL redirects and forwards deep-link params)
  - Auto-schedules the first spaced-repetition review when a passage is fully
    learned, plus a "review now" shortcut when items are due

- [x] **Security improvements** ✅
  - XSS prevention, HTTPS validation, file upload security
  - Comprehensive SECURITY.md documentation

---

## 📖 How to Use This Roadmap

### For Contributors

**Starting a task:**
1. Review the task description and requirements
2. Check dependencies (is there prerequisite work?)
3. Create feature branch: `claude/feature-name-{sessionId}`
4. Update this TODO.md - mark task as in progress
5. Follow CLAUDE.md development guidelines

**Completing a task:**
1. Test thoroughly in browser (see CLAUDE.md testing checklist)
2. Update CLAUDE.md if you changed structure/architecture
3. Mark task complete in TODO.md with completion date
4. Create PR with descriptive title and summary
5. Link PR in TODO.md notes

### For Project Planning

**Quarterly reviews** (Q1, Q2, Q3, Q4):
- Assess completed vs. planned work
- Adjust priorities based on user feedback
- Move items between roadmap phases as needed
- Retire or promote backlog items

**Priority indicators:**
- 🔴 **Critical**: Blocks users, accessibility issues, security risks
- 🟡 **High**: Significant UX/performance improvements
- 🟢 **Medium**: Code quality, nice-to-haves
- 🔵 **Low**: Future ideas, experimental

**Status indicators:**
- 🟢 **Ready**: Well-defined, can start immediately
- 🟡 **Planning**: Needs design/architecture decisions
- 🔴 **Blocked**: Waiting on dependencies or decisions
- ✅ **Done**: Completed and merged

### Development Principles

**When working on any item, always:**

✅ **DO:**
- Preserve single-file architecture (unless explicitly refactoring)
- Match existing code style and conventions
- Test in multiple browsers before committing
- Maintain Bible word count accuracy (789,634 total)
- Version localStorage data (`kjv_v6_data` → `kjv_v7_data` if breaking changes)
- Update CLAUDE.md for structural changes
- Use security utilities (`escapeHtml`, `isValidHttpsUrl`)
- Test across all three reading plans
- Verify mobile responsiveness

❌ **DON'T:**
- Add build tools without team discussion
- Change color scheme without user feedback
- Break localStorage compatibility (always migrate)
- Skip accessibility testing
- Remove easter eggs (users love them!)
- Use `innerHTML` with user data (XSS risk)
- Deploy untested changes directly to main

### Quick Links

- **Architecture docs**: See CLAUDE.md sections on "Architecture" and "File Structure"
- **Security guidelines**: See SECURITY.md
- **Testing checklist**: See CLAUDE.md section "Testing Checklist"
- **Code locations**: See CLAUDE.md "Code Location Reference" table

---

## 📊 Metrics & Success Criteria

### Performance Targets
- ⚡ Initial load: < 2 seconds (3G network)
- ⚡ Tab switch: < 100ms
- ⚡ localStorage write: < 50ms
- ⚡ Chart render: < 200ms

### Accessibility Targets
- ♿ WCAG 2.1 AA compliance: 100%
- ♿ Keyboard navigable: All features
- ♿ Screen reader compatible: Full experience
- ♿ Touch target size: ≥ 44x44px

### User Experience Targets
- 😊 Custom modals: 100% (replace all alerts)
- 😊 Loading states: All async operations
- 😊 Error messages: User-friendly (no technical jargon)
- 😊 Mobile responsive: All screen sizes

### Code Quality Targets
- 🧹 Console logs: Zero in production
- 🧹 ESLint errors: Zero
- 🧹 TypeScript coverage: 80%+ (via JSDoc)
- 🧹 Test coverage: 60%+ (core functions)

---

**Last Updated:** 2026-02-17
**Document Owner:** Shane (with AI assistance)
**Codebase Version:** kjv_v6_data
**Next Review:** End of Q1 2026 (March 2026)
