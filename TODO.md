# Bible Progress - Development Roadmap & TODO

This document provides a strategic roadmap for the Bible Progress application, organized by priority and timeline.

**Last Updated:** 2026-01-18
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
- [ ] **🔴 Replace native alerts with custom modals** - 19 instances found
  - **Impact**: Poor UX, breaks mobile flow, looks unprofessional
  - **Effort**: High (4-5 hours)
  - **Locations**:
    - `index.html:953` - Auth errors
    - `index.html:1369-1497` - Profile management (8 alerts)
    - `index.html:1583-1642` - Sync operations (6 alerts)
    - `index.html:1850-1925` - Backup/restore (3 alerts)
  - **Solution**: Create reusable modal component matching auth-modal styling
  - **Priority reasoning**: This is the #1 UX complaint from users

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
  - [ ] Implement timestamp-based merging
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

- [ ] **Reading heatmap enhancement** - `index.html:389`
  - [ ] GitHub-style contribution heatmap
  - [ ] Show reading intensity over time (daily/weekly/monthly views)
  - [ ] Highlight longest/current streaks visually
  - [ ] Export heatmap as image

- [ ] **Reading estimates and projections**
  - [ ] Calculate "finish date" based on current pace
  - [ ] Show average chapters/day
  - [ ] Project completion date for each reading plan
  - [ ] Weekly/monthly progress reports

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
  - [ ] Generate shareable progress cards (social media)
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
- [ ] **Remove production console.log statements** - 22+ instances
  - `index.html:1839, 1896` - Backup/restore logging
  - `service-worker.js` - Registration logs
  - **Action**: Keep only error logging, remove debug logs
  - **Consider**: Implementing proper error tracking (Sentry, LogRocket)

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

**Current Status**: `index.html` is 3,847 lines
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

**Recommendation**: Review at 5,000 lines or when adding team members

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
  - **Location**: `service-worker.js:2-8`
  - **Impact**: Users may see outdated Tailwind/Chart.js after CDN updates
  - **Solution**: Version cache name or use network-first for CDNs
  - **Priority**: High (affects all users on update)

- [ ] **🟡 MEDIUM: Long profile names overflow UI**
  - **Location**: Profile dropdown
  - **Impact**: Names 50+ characters break layout
  - **Solution**: Truncate with ellipsis + tooltip
  - **Priority**: Medium (edge case)

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

- [x] **Search results don't show count** ✅ **COMPLETED 2026-01-17**
  - Added "X books found" counter below search box
  - Location: `index.html:295, 1810-1822`

- [x] **Horner plan showing chapters as read incorrectly** ✅ **COMPLETED 2026-01-18** (#69)
  - Fixed list completion vs. chapter read status confusion
  - Separated daily tracking from individual chapter completion

- [x] **Daily plan "Mark as Read" button broken for ranges** ✅ **COMPLETED 2026-01-18** (#68)
  - Fixed event parameter forwarding in wrapper functions

---

## 📊 Refactoring Opportunities (Q3-Q4 2026)

### Module Extraction

**Goal**: Improve code organization without breaking single-file philosophy

- [ ] **Extract profile management**
  - **Location**: `index.html:461-477` + related functions
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
  - Location: `index.html:2596-3000`

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
  - Location: `index.html:71-136`

- [x] **Dark mode (dual access)** ✅
  - Settings toggle + triple-click logo easter egg

- [x] **User scaling on mobile** ✅
  - Removed viewport restrictions for accessibility

- [x] **Verse memory helper** ✅
  - Separate memorize.html page with spaced repetition

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

**Last Updated:** 2026-01-18
**Document Owner:** Shane (with AI assistance)
**Codebase Version:** kjv_v6_data
**Next Review:** End of Q1 2026 (March 31, 2026)
