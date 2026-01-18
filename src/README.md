# Source Directory

This directory contains the modular source code for Bible Progress. The build process combines these files into a single `index.html` for deployment.

## Directory Structure

```
src/
├── index.html          # HTML template with placeholders
├── styles/             # CSS modules
│   ├── base.css       # Base styles and fonts
│   ├── components.css # Component styles
│   ├── animations.css # Keyframe animations
│   ├── dark-mode.css  # Dark mode styles
│   └── responsive.css # Responsive design
└── js/                 # JavaScript modules
    ├── config.js      # Firebase configuration
    ├── security.js    # Security utilities
    ├── data.js        # Bible data and constants
    ├── state.js       # State management
    ├── auth.js        # Authentication
    ├── profiles.js    # Profile management
    ├── progress.js    # Progress tracking
    ├── streaks.js     # Streak tracking
    ├── plans.js       # Reading plans
    ├── ui.js          # UI rendering
    ├── dark-mode.js   # Dark mode toggle
    ├── easter-eggs.js # Easter eggs
    └── main.js        # App initialization
```

## Development Workflow

### Making Changes

1. **Edit source files** in `src/` directory
2. **Run build** to generate `index.html`:
   ```bash
   npm run build
   ```
3. **Test locally** (or use watch mode):
   ```bash
   npm run watch
   ```

### Build Process

The build script (`build.js`):
1. Reads HTML template from `src/index.html`
2. Combines CSS files from `src/styles/`
3. Combines JS files from `src/js/` (in dependency order)
4. Replaces `<!-- CSS_PLACEHOLDER -->` and `<!-- JS_PLACEHOLDER -->`
5. Writes final `index.html` to root directory

### Module Dependencies

JavaScript files are loaded in this order to respect dependencies:

1. `config.js` - No dependencies
2. `security.js` - No dependencies
3. `data.js` - No dependencies
4. `state.js` - Depends on: security, data
5. `auth.js` - Depends on: config, state
6. `profiles.js` - Depends on: state, auth
7. `progress.js` - Depends on: data, state
8. `streaks.js` - Depends on: state, progress
9. `plans.js` - Depends on: data, state, progress
10. `ui.js` - Depends on: data, state, progress, plans
11. `dark-mode.js` - Depends on: state
12. `easter-eggs.js` - Depends on: state, progress, ui
13. `main.js` - Depends on: all modules

## Best Practices

### When Adding Features

1. **Choose the right module** - Put code where it logically belongs
2. **Maintain dependencies** - Don't create circular dependencies
3. **Test after building** - Always test the built `index.html`
4. **Update documentation** - Keep module comments current

### Code Organization

- **One concern per module** - Keep modules focused
- **Export to window** - Functions used by inline event handlers must be on `window`
- **Document dependencies** - Note which modules you depend on
- **Preserve functionality** - Don't break existing features

### Testing Checklist

After making changes:
- [ ] Run `npm run build` successfully
- [ ] Test core functionality (mark chapters, switch profiles, etc.)
- [ ] Verify reading plans work
- [ ] Check streak tracking
- [ ] Test on mobile (responsive design)
- [ ] Verify Firebase sync (if applicable)

## Deployment

The built `index.html` is deployed via GitHub Pages. CI/CD automatically builds on push to main branch.

See `../CLAUDE.md` for complete development documentation.
