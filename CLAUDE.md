# CLAUDE.md - AI Assistant Guide for Bible Progress

## Recent Updates (January 2026)

This documentation has been comprehensively updated to reflect the latest state of the codebase:

**New Features:**
- ✅ Horner plan daily progress tracking (tracks which of the 10 lists are completed each day)
- ✅ Reading streak system with heatmap visualization
- ✅ Comprehensive ARIA labels for accessibility
- ✅ Delightful animations and transitions
- ✅ Chart instance caching for better performance
- ✅ Dark mode (accessible via Settings or triple-click logo easter egg)

**Bug Fixes:**
- ✅ Fixed Horner plan incorrectly showing chapters as read (#69)
- ✅ Fixed daily plan "Mark as Read" button for chapter ranges (#68)
- ✅ Fixed popup background color flickering (#65)

**Security Improvements:**
- ✅ XSS prevention with HTML escaping utilities
- ✅ HTTPS-only URL validation for user photos
- ✅ File upload validation for JSON backups
- ✅ Comprehensive SECURITY.md documentation

**Documentation:**
- ✅ Added TODO.md for development tracking
- ✅ Added SECURITY.md for security guidelines
- ✅ Updated all line number references
- ✅ Documented Horner daily progress feature
- ✅ Updated testing checklist

---

## Project Overview

**Bible Progress** is a word-weighted King James Version (KJV) Bible reading tracker. Unlike traditional chapter-based trackers, this application tracks progress by word count, providing mathematically accurate progress metrics. For example, Psalm 117 (33 words) is weighted differently than Psalm 119 (2,423 words).

- **Live Site**: [bibleprogress.com](https://bibleprogress.com)
- **Type**: Single-page Progressive Web Application (PWA)
- **Bible Version**: King James Version (KJV)
- **Total Word Count**: 789,634 words (OT: 609,252 | NT: 180,382)

## Architecture

### Application Type
- **No Build Process**: Pure HTML/CSS/JavaScript (ES6)
- **Progressive Web App**: Installable on mobile devices via `manifest.json` and `service-worker.js`

### Tech Stack
- **HTML5**: Structure and content
- **Tailwind CSS** (CDN): Modern styling with glass-morphism design
- **Chart.js** (CDN): Donut chart visualizations
- **Vanilla JavaScript (ES6)**: All application logic
- **Firebase**: Authentication and cloud sync
  - Firebase Auth (Google OAuth + Email/Password)
  - Firestore Database
  - Firebase Analytics
- **LocalStorage API**: Primary data persistence (cloud is secondary backup)

## File Structure

```
bible-progress/
├── index.html           # Main application (3,847 lines)
│                        # Contains all HTML, CSS, and JavaScript
├── manifest.json        # PWA manifest for app installation
├── service-worker.js    # Service worker for offline capabilities
├── README.md            # User-facing documentation
├── CLAUDE.md           # AI assistant documentation (this file)
├── TODO.md             # Development roadmap and issue tracking
├── SECURITY.md         # Security documentation and best practices
├── CNAME               # GitHub Pages domain config
├── favicon.png         # App icon (used as favicon and apple-touch-icon)
├── icon-192.png        # PWA icon (192x192)
├── icon-512.png        # PWA icon (512x512)
├── kjv_chapter_word_counts.csv  # Source data for Bible word counts
└── kjvwordcount        # Word count verification data
```

## Core Data Model

### Main Data Structure (appData)

```javascript
appData = {
    profiles: {
        [profileId]: {
            [chapterKey]: number  // e.g., "Genesis-1": 1736985600000 (timestamp in ms)
        }
    },
    profilePlans: {
        [profileId]: "SEQUENTIAL" | "MCHEYNE" | "HORNER"
    },
    activeProfileId: string,
    defaultProfileId: string,
    profileColors: {
        [profileId]: string  // hex color
    },
    hornerDailyProgress: {  // Tracks Horner plan daily completion (per-profile)
        [profileId]: {
            date: string,       // YYYY-MM-DD format
            completedLists: number[]  // Array of list indices (0-9) completed today
        }
    }
}
```

**Important**: Progress values are stored as timestamps (not booleans) to enable streak tracking and heatmap features. The application automatically migrates old boolean values to timestamps on load.

### Chapter Key Format
- Pattern: `{BookName}-{ChapterNumber}`
- Examples: `"Genesis-1"`, `"Psalms-119"`, `"Matthew-5"`

### Bible Data Structure

Located at line ~800 in index.html:

```javascript
bible = [
    {
        name: "Genesis",
        testament: "OT",
        ch: [797, 632, ...],  // Word counts per chapter
        cat: "Pentateuch",    // Added by assignCategories()
        style: "...",         // CSS classes for category
        chartColor: "#..."   // Chart.js color
    },
    // ... 66 books total
]
```

## Key Features & Implementation

### 1. Profile System (Multi-User Support)
- **Location**: Lines ~443-470
- **Storage**: `localStorage` key: `kjv_v6_data`
- **Cloud Sync**: Firebase Firestore (per-user document)
- **Profile Management**: Create, switch, rename, delete profiles
- **Profile Colors**: Auto-generated from profile name hash

### 2. Reading Plans
Three built-in plans:
- **SEQUENTIAL**: Genesis → Revelation (canonical order)
- **MCHEYNE**: 365-day plan, 4 chapters/day (M'Cheyne's Bible Reading Plan)
- **HORNER**: 10 lists, rotating through different Bible sections
  - **Daily Progress Tracking**: Horner plan includes `hornerDailyProgress` feature
  - Tracks which lists have been completed today
  - Resets daily at midnight (local timezone)
  - Shows checkmarks next to completed lists in the plan view

### 3. Progress Tracking
- **Book Level**: 66 books with category groupings
- **Chapter Level**: Individual chapter checkboxes
- **Word-Weighted**: All percentages calculated by word count
- **Precision**: Progress shown to 4 decimal places

### 4. Data Persistence Strategy

**Primary**: LocalStorage (always authoritative)
```javascript
localStorage.setItem('kjv_v6_data', JSON.stringify(appData))
```

**Secondary**: Firebase Firestore (backup/sync)
```javascript
// Cloud sync only when user is logged in
setDoc(doc(db, "users", uid), { appData }, { merge: true })
```

**Important**: Local data always takes precedence. Cloud is only for backup/cross-device sync.

### 5. Reading Streak Tracking
- **Location**: Lines ~2596-3000
- **Components**:
  - **Header Badge**: Always-visible streak counter in top navigation
  - **Streak Status Banner**: Detailed stats in PLAN tab showing current and longest streaks
  - **Heatmap**: GitHub-style activity calendar showing reading days (last 30-365 days)
  - **Milestone Celebrations**: Confetti and notifications at 7, 14, 30, 50, 100, 180, 365 days
- **Streak Logic**:
  - Current streak counts consecutive days with at least one chapter read
  - Allows 1-day grace period (can skip one day without breaking streak)
  - Uses local timezone for consistent midnight calculations
  - Persists milestone achievements to avoid duplicate celebrations
- **Dynamic Emoji Progression**:
  - 🔥 Fire: 1-6 days
  - ⚡ Lightning: 7-29 days
  - 🔥 Fire: 30-99 days
  - 💎 Diamond: 100-364 days
  - 👑 Crown: 365+ days

### 6. Dark Mode
- **Location**: Lines ~571-577 (Settings UI), ~3200-3700 (Implementation)
- **Access Methods**:
  - **Primary**: Settings page toggle (user-friendly, no notification)
  - **Easter Egg**: Triple-click logo (fun alternative with celebration notification)
- **Persistence**: Saved to localStorage, restored on page load
- **Implementation**: CSS filter-based inversion with custom styles

### 7. Accessibility Features
- **ARIA Labels**: 35+ comprehensive labels for screen readers
- **Coverage**:
  - Navigation tabs with state indicators
  - Profile management controls
  - Reading plan selectors
  - Chapter checkboxes with book and chapter information
  - Progress indicators and statistics
  - Modal dialogs and popups
  - Action buttons (mark all, clear all, etc.)
- **Benefits**: Full screen reader support for visually impaired users

### 8. Easter Eggs
Seven hidden features (lines ~1271-1608):
1. Konami Code (↑↑↓↓←→←→BA)
2. Click profile dot 7 times
3. Complete Psalm 119
4. Finish entire Bible
5. Type creator names (SHANE, MEGAN, DOM, DAVID)
6. Christmas/Easter greetings (date-based)
7. Triple-click logo for dark mode (also accessible via Settings)

## Development Conventions

### Code Style
- **No semicolons** required (but used inconsistently)
- **Minimal comments**: Code is largely self-documenting
- **Global functions**: Attached to `window` object for event handlers
- **Arrow functions**: Preferred for callbacks
- **Template literals**: Used for all string interpolation

### Naming Conventions
- **Constants**: UPPER_SNAKE_CASE (`WORD_TOTALS`, `PLAN_MCHEYNE`)
- **Functions**: camelCase (`getProgress`, `renderBookGrid`)
- **Variables**: camelCase (`activeTab`, `currentUser`)
- **Global exports**: Attached to window (`window.setTab`)

### DOM Manipulation
- **Direct DOM access**: `getElementById`, `querySelector`
- **Class toggles**: Using `classList.add/remove/toggle`
- **innerHTML**: Used for rendering large blocks
- **Event handlers**: Inline `onclick` attributes pointing to window functions

### Color Scheme
- **Primary**: Indigo (`#4f46e5`)
- **Categories**: Color-coded by Bible section
  - Pentateuch: Lime
  - History (OT): Amber
  - Wisdom: Indigo
  - Major Prophets: Rose
  - Minor Prophets: Cyan
  - Gospels: Emerald
  - History (NT): Yellow
  - Pauline Epistles: Sky
  - General Epistles: Teal
  - Prophecy: Fuchsia

## Git Workflow

### Branching Strategy
- **Production**: Deployed directly from repository root (main branch)
- **Feature branches**: `claude/*` prefix (for AI-assisted development)
- **Current branch**: `claude/claude-md-mkilpns53p2gmhja-jNAWQ`

### Recent Development Focus (Last 20 commits)
1. **Fix Horner plan showing chapters as read incorrectly** (#69) - January 2026
2. **Fix daily plan mark as read bug for chapter ranges** (#68) - January 2026
3. **Update CLAUDE.md with recent features** (#67) - January 2026
4. **ARIA labels for accessibility** (#66) - January 2026
5. **Popup background color fix** (#65) - January 2026
6. **Copy progress updates and reading estimates** (#64) - January 2026
7. **Streak badge in header** (#63) - January 2026
8. **Reading streak tracking with milestones** (#62) - January 2026
9. **Delightful animations and transitions** (#59)
10. **Chart instance caching for performance** (#58)
11. **User scaling enabled on mobile** (#57)
12. **Easter eggs implementation**
13. **Profile color picker**
14. **Email/password authentication**
15. **Google OAuth integration**

### Deployment
- **Platform**: GitHub Pages
- **Domain**: bibleprogress.com (configured via CNAME)
- **Auto-deploy**: Pushes to main branch trigger deployment
- **No build step**: Static files served directly

## Common Development Tasks

### Adding a New Feature

1. **Locate the relevant section** in index.html (single file)
2. **Follow existing patterns** for consistency
3. **Test in browser** (no build required)
4. **Update localStorage structure** if data model changes (increment version: `kjv_v6_data` → `kjv_v7_data`)

### Modifying the Bible Data

⚠️ **WARNING**: Bible data is embedded as a minified array at line ~800. Exercise extreme caution when modifying:
- Verify total word count remains 789,634
- Update `WORD_TOTALS` constant if OT/NT split changes
- Test all progress calculations after changes

### Adding Reading Plans

1. **Define plan constant** (follow `PLAN_MCHEYNE` or `PLAN_HORNER` format)
2. **Add plan to selector** in HTML (search for `plan-selector`)
3. **Implement logic** in `renderDailyPlan()` function (~line 1750-1900)
4. **Consider daily tracking**: If plan needs daily progress (like Horner), add to `appData` structure

### Working with Horner Daily Progress

The Horner plan includes special daily tracking functionality:

```javascript
// Reset daily progress if date changed (call before rendering Horner plan)
resetHornerDailyProgressIfNeeded();

// Check if a list is completed today (uses active profile)
const profileId = appData.activeProfileId;
const isListCompleted = appData.hornerDailyProgress[profileId].completedLists.includes(listIndex);

// Mark a list as completed (when all chapters in that list are read today)
if(!appData.hornerDailyProgress[profileId].completedLists.includes(listIndex)) {
    appData.hornerDailyProgress[profileId].completedLists.push(listIndex);
}
```

**Important**:
- Horner daily progress is stored per-profile and syncs across devices via Firebase
- Progress resets at midnight (local timezone) and is independent of chapter completion timestamps
- A chapter can be marked as read without affecting list completion status
- Each profile maintains its own daily list completion tracking

### Styling Changes

- **Inline styles**: In `<style>` tag (lines 17-100+)
- **Tailwind classes**: Applied directly to HTML elements
- **Custom animations**: Defined in `@keyframes` blocks
- **Glass-morphism design**: Uses backdrop-blur and transparency

## Data Migration

### Version History
- `kjv_v1` - `kjv_v5`: Previous iterations
- `kjv_v6_data`: Current version (multi-profile support + timestamp-based progress)

### Migration Strategy
```javascript
// Migrate boolean progress values to timestamps (for heatmap/streak tracking)
Object.keys(appData.profiles).forEach(profileName => {
    const profile = appData.profiles[profileName];
    Object.keys(profile).forEach(chapterKey => {
        if(profile[chapterKey] === true) {
            // Convert true to current timestamp (one-time migration)
            profile[chapterKey] = Date.now();
        }
    });
});

// Ensure all profiles have a reading plan assigned
Object.keys(appData.profiles).forEach(name => {
    if(!appData.profilePlans[name]) {
        appData.profilePlans[name] = 'SEQUENTIAL';
    }
});

// Initialize Horner daily progress if not present
if(!appData.hornerDailyProgress) {
    appData.hornerDailyProgress = {
        date: getTodaysDate(),
        completedLists: []
    };
}
```

**Important**:
- The migration from boolean to timestamp values happens automatically on page load and is saved immediately to prevent re-migration
- All profiles are automatically assigned the SEQUENTIAL plan if they don't have one
- Horner daily progress is initialized on first use and resets daily at midnight
- Migration changes are saved to localStorage immediately (line ~974)

## Firebase Configuration

### Environment
- **Project ID**: bible-reading-d9286
- **Auth Domain**: bible-reading-d9286.firebaseapp.com
- **Database**: Cloud Firestore

### Security Rules (Recommended)
```javascript
// Users can only read/write their own documents
match /users/{userId} {
    allow read, write: if request.auth.uid == userId;
}
```

## Testing Checklist

When making changes, verify:

### Core Functionality
- [ ] Mark/unmark chapters
- [ ] Switch between OT/NT/STATS/PLAN/ABOUT tabs
- [ ] Search for books
- [ ] Mark all/clear all in book view
- [ ] Progress percentages calculate correctly

### Profile System
- [ ] Create new profile
- [ ] Switch profiles (data separates correctly)
- [ ] Rename profile
- [ ] Delete profile
- [ ] Profile colors apply correctly
- [ ] Streak data persists per profile

### Data Persistence
- [ ] Changes save to localStorage immediately
- [ ] Refresh page preserves state
- [ ] Backup/restore JSON works
- [ ] Cloud sync (if logged in) works

### Reading Plans
- [ ] Plan selector shows correct next chapters
- [ ] Plan persists per profile
- [ ] All three plans function correctly
- [ ] Sequential plan shows books in canonical order
- [ ] M'Cheyne plan shows 4 chapters per day
- [ ] Horner plan shows 10 lists with proper rotation
- [ ] Horner daily progress tracks completed lists correctly
- [ ] Horner daily progress resets at midnight (local time)
- [ ] Horner plan correctly shows chapter read status (independent of list completion)
- [ ] Daily plan "Mark as Read" button works for single chapters and ranges
- [ ] Heatmap displays reading activity correctly
- [ ] Streak calculations are accurate (test across midnight, multi-day gaps)

### Responsive Design
- [ ] Mobile layout (< 640px)
- [ ] Tablet layout (640-1024px)
- [ ] Desktop layout (> 1024px)
- [ ] PWA installation works
- [ ] User scaling works on mobile devices
- [ ] Heatmap scrolls horizontally on small screens

## Performance Considerations

### Optimization Strategies
1. **Debouncing**: Search input could benefit from debouncing (currently updates on every keystroke)
2. **Chart rendering**: ✅ Implemented - Chart instances are now cached and reused
3. **LocalStorage**: Writes happen on every checkbox toggle (acceptable for this use case)
4. **Mobile optimization**: User scaling enabled for better accessibility

### Known Limitations
- No backend validation (purely client-side)
- localStorage limit: ~5MB (current data well below limit)
- No conflict resolution for simultaneous edits across devices

## Debugging Tips

### Common Issues

**Progress not saving:**
- Check browser console for localStorage errors
- Verify `window.saveProgress()` is called
- Check if localStorage is disabled (private browsing)

**Cloud sync not working:**
- Verify user is logged in (`currentUser !== null`)
- Check Firestore rules
- Look for Firebase errors in console

**Charts not rendering:**
- Ensure Chart.js CDN is loading
- Check for canvas element with correct ID
- Verify data format matches Chart.js expectations

### Browser Console Commands
```javascript
// View current app data
console.log(appData)

// View current progress for active profile
console.log(getProgress())

// View streak data
console.log(calculateStreaks())

// View reading activity (heatmap data)
console.log(getReadingActivity())

// View Horner daily progress for active profile
console.log(appData.hornerDailyProgress[appData.activeProfileId])

// View Horner daily progress for all profiles
console.log(appData.hornerDailyProgress)

// Reset Horner daily progress (for testing)
resetHornerDailyProgressIfNeeded()

// Force save
window.saveProgress()

// Clear all data (⚠️ destructive)
localStorage.clear()

// Test security functions
console.log(isValidHttpsUrl('https://example.com'))  // Should return true
console.log(escapeHtml('<script>alert("xss")</script>'))  // Should return escaped HTML
```

## Code Location Reference

Quick reference for common code locations in `index.html`:

| Feature | Line Range |
|---------|-----------|
| Firebase Config | ~348-362 |
| Security Functions | ~394-409 |
| Bible Data | ~800-801 |
| Reading Plans | ~804-818 |
| Word Count Totals | ~820 |
| Category Definitions | ~827-841 |
| Data Migration | ~943-974 |
| Horner Daily Progress | ~989-1009 |
| Profile Functions | ~461-477 |
| Auth Functions | ~478-552 |
| Cloud Sync | ~553-590 |
| Heatmap & Streak Functions | ~2596-3000 |
| Streak Badge Update | ~2598-2623 |
| Streak Calculation | ~2641-2704 |
| Heatmap Rendering | ~2706-2829 |
| Milestone Celebrations | ~2936-2995 |
| Dark Mode (Settings UI) | ~571-577 |
| Dark Mode (Implementation) | ~3200-3700 |
| Rendering Functions | ~935-1270 |
| Easter Eggs | ~1271-1608 |
| Daily Plan Rendering | ~1750-1900 |

**Note**: Line numbers are approximate (~) due to ongoing development. Use search to locate specific functions.

## Best Practices for AI Assistants

### DO:
✅ Preserve the single-file architecture
✅ Match existing code style and conventions
✅ Test all changes in browser before committing
✅ Maintain word count accuracy in bible data
✅ Keep localStorage version consistent (currently `kjv_v6_data`)
✅ Follow Tailwind CSS utility patterns
✅ Preserve existing easter eggs (users love them!)
✅ Update this CLAUDE.md file when making structural changes
✅ Use security utilities (`escapeHtml()`, `isValidHttpsUrl()`) for user data
✅ Test across different reading plans (Sequential, M'Cheyne, Horner)
✅ Verify Horner daily progress resets at midnight correctly

### DON'T:
❌ Split into multiple files (defeats the purpose)
❌ Add build tools or bundlers
❌ Modify total word counts without verification
❌ Break localStorage compatibility without migration
❌ Remove or modify Firebase config without authorization
❌ Change the color scheme without discussion
❌ Add heavy dependencies (keep it lightweight)
❌ Introduce breaking changes to the data model
❌ Use `innerHTML` with user data (XSS risk)
❌ Skip security validation for external URLs or file uploads

## Future Enhancement Ideas

Based on code structure and commit history:

1. **Achievements system** (was added, then reverted - could be reintroduced)
2. **Search debouncing** for better performance
3. **Daily reading reminders** (PWA notifications)
4. **Custom reading plans** (user-defined)
5. **Reading notes** per chapter
6. **Multiple Bible versions** (currently only KJV)
7. **Audio integration** (link to audio Bible)
8. **Social features** (share progress)
9. **Enhanced dark mode** (currently basic CSS inversion, could add custom theme colors)
10. **Export streak data** (CSV/JSON download of reading history)
11. **Weekly/monthly progress reports** (summary emails or notifications)
12. **Reading goals** (chapters per day/week targets)

## Additional Documentation

The project includes comprehensive supporting documentation:

### SECURITY.md
Complete security documentation covering:
- **XSS Prevention**: HTML escaping utilities and safe DOM manipulation
- **URL Validation**: HTTPS-only validation for user photos
- **File Upload Security**: JSON backup file validation (type, size, structure)
- **Firebase Security**: Recommended Firestore security rules and auth configuration
- **Security Headers**: CSP and other security best practices
- **Known Limitations**: Client-side architecture security considerations
- **Code Review Checklist**: Security verification steps for developers

### TODO.md
Active development tracking with prioritized items:
- **High Priority**: Performance optimizations, UX improvements, accessibility
- **Medium Priority**: Code quality, security best practices, PWA enhancements
- **Low Priority**: Feature enhancements, UI polish, developer experience
- **Completed Items**: Tracks finished improvements with completion dates
- **Bug Tracking**: Known issues and their resolution status

## Support & Resources

- **Repository**: GitHub (inferred from GitHub Pages deployment)
- **Domain**: bibleprogress.com
- **Firebase Console**: console.firebase.google.com/project/bible-reading-d9286
- **Blue Letter Bible**: External resource for chapter reading links

## Version Information

- **Data Model**: v6 (`kjv_v6_data`)
- **Service Worker Cache**: `bible-progress-v1`
- **Last Major Update**: Profile system + Easter eggs
- **Browser Support**: Modern browsers (ES6 required)
- **PWA Compatibility**: iOS Safari, Chrome Android

---

**Last Updated**: 2026-01-17 (Comprehensive update reflecting recent bug fixes and security improvements)
**Maintained By**: Shane (with AI assistance)
**License**: Open source (implied from README)
**Current Line Count**: 3,847 lines (index.html)

## Recent Major Features

### Streak Tracking System (January 2026)
The reading streak system represents a major enhancement to user engagement:

- **Timestamp-based tracking**: Migrated from boolean chapter completion to timestamps, enabling precise activity tracking
- **Smart streak logic**: Includes 1-day grace period and local timezone support
- **Visual progression**: Dynamic emoji system provides immediate feedback
- **Gamification**: Milestone celebrations encourage consistent reading habits
- **Data visualization**: GitHub-style heatmap shows reading patterns at a glance

### Accessibility Improvements (January 2026)
Comprehensive ARIA labels make the application fully accessible to screen reader users, covering all interactive elements and providing context for navigation, progress tracking, and profile management.

### Recent Bug Fixes (January 2026)

**Horner Plan Chapter Display Bug (#69)**
- **Issue**: Horner plan was incorrectly showing chapters as read when they weren't
- **Root Cause**: List completion logic was interfering with individual chapter read status
- **Fix**: Separated daily list tracking from chapter completion status
- **Location**: `index.html:989-1009` (Horner daily progress helpers)

**Daily Plan Mark as Read Bug (#68)**
- **Issue**: Marking chapters as read from the daily plan wasn't working for chapter ranges
- **Root Cause**: Event parameter wasn't being forwarded correctly through wrapper functions
- **Fix**: Updated event handlers to properly pass the event object
- **Impact**: Improved reliability of the "Mark as Read" button in plan view

### Security Enhancements (January 2026)

Comprehensive security audit and improvements:
- **XSS Prevention**: Added `escapeHtml()` utility, replaced `innerHTML` with `textContent` for user data
- **URL Validation**: Implemented `isValidHttpsUrl()` for Firebase photo URLs
- **File Upload Security**: Added type, size, and structure validation for JSON backups
- **Error Handling**: Wrapped all `JSON.parse()` calls in try-catch blocks
- **Documentation**: Created SECURITY.md with complete security guidelines

