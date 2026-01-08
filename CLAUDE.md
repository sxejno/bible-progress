# CLAUDE.md - AI Assistant Guide for Bible Progress

## Project Overview

**Bible Progress** is a word-weighted King James Version (KJV) Bible reading tracker. Unlike traditional chapter-based trackers, this application tracks progress by word count, providing mathematically accurate progress metrics. For example, Psalm 117 (33 words) is weighted differently than Psalm 119 (2,423 words).

- **Live Site**: [bibleprogress.com](https://bibleprogress.com)
- **Type**: Single-page Progressive Web Application (PWA)
- **Bible Version**: King James Version (KJV)
- **Total Word Count**: 789,634 words (OT: 609,252 | NT: 180,382)

## Architecture

### Application Type
- **Single-File Architecture**: Entire application in `index.html`
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
├── index.html           # Main application (1,612 lines)
│                        # Contains all HTML, CSS, and JavaScript
├── manifest.json        # PWA manifest for app installation
├── service-worker.js    # Service worker for offline capabilities
├── README.md            # User-facing documentation
├── CNAME               # GitHub Pages domain config
├── favicon.png         # App icon (used as favicon and apple-touch-icon)
├── icon-192.png        # PWA icon (192x192)
└── icon-512.png        # PWA icon (512x512)
```

## Core Data Model

### Main Data Structure (appData)

```javascript
appData = {
    profiles: {
        [profileId]: {
            [chapterKey]: boolean  // e.g., "Genesis-1": true
        }
    },
    profilePlans: {
        [profileId]: "SEQUENTIAL" | "MCHEYNE" | "HORNER"
    },
    activeProfileId: string,
    profileColors: {
        [profileId]: string  // hex color
    }
}
```

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

### 5. Easter Eggs
Seven hidden features (lines ~1271-1608):
1. Konami Code (↑↑↓↓←→←→BA)
2. Click profile dot 7 times
3. Complete Psalm 119
4. Finish entire Bible
5. Type creator names (SHANE, MEGAN, DOM, DAVID)
6. Christmas/Easter greetings (date-based)
7. Triple-click logo for dark mode

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
- **Production**: Deployed directly from repository root
- **Feature branches**: `claude/*` prefix (for AI-assisted development)
- **Current branch**: `claude/claude-md-mk4vug4xir7lfy2e-UCXpo`

### Recent Development Focus (Last 20 commits)
1. Plan persistence per profile
2. Easter eggs implementation
3. Profile color picker
4. Email/password authentication
5. Google OAuth integration
6. Profile system
7. Achievement system (added then reverted)

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
3. **Implement logic** in `renderDailyPlan()` function (~line 964)

### Styling Changes

- **Inline styles**: In `<style>` tag (lines 17-38)
- **Tailwind classes**: Applied directly to HTML elements
- **Custom animations**: Defined in `@keyframes` blocks

## Data Migration

### Version History
- `kjv_v1` - `kjv_v5`: Previous iterations
- `kjv_v6_data`: Current version (multi-profile support)

### Migration Strategy
```javascript
// Always check for old data on load
let oldProgress = JSON.parse(localStorage.getItem('kjv_v6_progress'));
if (oldProgress && !savedData) {
    // Migrate to new structure
    appData.profiles[appData.activeProfileId] = oldProgress;
}
```

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

### Data Persistence
- [ ] Changes save to localStorage immediately
- [ ] Refresh page preserves state
- [ ] Backup/restore JSON works
- [ ] Cloud sync (if logged in) works

### Reading Plans
- [ ] Plan selector shows correct next chapters
- [ ] Plan persists per profile
- [ ] All three plans function correctly

### Responsive Design
- [ ] Mobile layout (< 640px)
- [ ] Tablet layout (640-1024px)
- [ ] Desktop layout (> 1024px)
- [ ] PWA installation works

## Performance Considerations

### Optimization Strategies
1. **Debouncing**: Search input could benefit from debouncing (currently updates on every keystroke)
2. **Chart rendering**: Charts re-render on every tab switch (could cache)
3. **LocalStorage**: Writes happen on every checkbox toggle (acceptable for this use case)

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

// Force save
window.saveProgress()

// Clear all data (⚠️ destructive)
localStorage.clear()
```

## Code Location Reference

Quick reference for common code locations in `index.html`:

| Feature | Line Range |
|---------|-----------|
| Firebase Config | 348-362 |
| Bible Data | 800-801 |
| Reading Plans | 804-818 |
| Word Count Totals | 820 |
| Category Definitions | 827-841 |
| Profile Functions | 461-477 |
| Auth Functions | 478-552 |
| Cloud Sync | 553-590 |
| Rendering Functions | 935-1270 |
| Easter Eggs | 1271-1608 |

## Best Practices for AI Assistants

### DO:
✅ Preserve the single-file architecture
✅ Match existing code style and conventions
✅ Test all changes in browser before committing
✅ Maintain word count accuracy in bible data
✅ Keep localStorage version consistent
✅ Follow Tailwind CSS utility patterns
✅ Preserve existing easter eggs (users love them!)
✅ Update this CLAUDE.md file when making structural changes

### DON'T:
❌ Split into multiple files (defeats the purpose)
❌ Add build tools or bundlers
❌ Modify total word counts without verification
❌ Break localStorage compatibility without migration
❌ Remove or modify Firebase config without authorization
❌ Change the color scheme without discussion
❌ Add heavy dependencies (keep it lightweight)
❌ Introduce breaking changes to the data model

## Future Enhancement Ideas

Based on code structure and commit history:

1. **Achievements system** (was added, then reverted - could be reintroduced)
2. **Search debouncing** for better performance
3. **Reading streaks** tracking
4. **Daily reading reminders** (PWA notifications)
5. **Custom reading plans** (user-defined)
6. **Reading notes** per chapter
7. **Multiple Bible versions** (currently only KJV)
8. **Audio integration** (link to audio Bible)
9. **Social features** (share progress)
10. **Dark mode toggle** (currently hidden easter egg)

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

**Last Updated**: 2026-01-08
**Maintained By**: Shane (with AI assistance)
**License**: Open source (implied from README)
