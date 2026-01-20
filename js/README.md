# JavaScript Module Structure

This directory contains the modularized JavaScript code for Bible Progress.

## Loading Order (Critical!)

The modules must be loaded in this specific order to ensure dependencies are met:

1. **data.js** - Bible data, reading plans, constants (no dependencies)
2. **utils.js** - Utility functions (no dependencies)
3. **storage.js** - Data persistence (depends on: utils, data)
4. **progress.js** - Progress operations (depends on: storage)
5. **profiles.js** - Profile management (depends on: storage, progress, utils)
6. **categories.js** - Bible categories (depends on: data)
7. **ui-core.js** - Core UI (depends on: profiles, storage)
8. **ui-render.js** - Rendering (depends on: data, progress, categories, ui-core)
9. **streaks.js** - Streak tracking (depends on: progress, ui-core)
10. **bible-reader.js** - Bible text reader (depends on: data, progress)
11. **verse-of-day.js** - Verse rotation (depends on: ui-core)
12. **settings.js** - Settings & dark mode (depends on: storage)
13. **easter-eggs.js** - Easter eggs (depends on: ui-core, progress)
14. **firebase-init.js** - Firebase module (ES6 module, loads last)

## File Sizes

Total: ~360KB of JavaScript code
- Largest: data.js (~84KB) - Contains all Bible data
- Firebase: ~12KB - ES6 module with imports

## Notes

- All modules except firebase-init.js are loaded as regular scripts
- Functions are attached to the `window` object for cross-module access
- firebase-init.js uses ES6 module syntax with Firebase CDN imports
