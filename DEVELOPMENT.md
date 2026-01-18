# Development Guide

This guide explains the refactored architecture and how to work with the Bible Progress codebase.

## Architecture Overview

Bible Progress now uses a **modular source architecture** with a **single-file deployment** strategy:

- **Development**: Work with organized, modular files in `src/`
- **Deployment**: Automated build process combines everything into a single `index.html`
- **GitHub Pages**: Deploys the built `index.html` directly (no build step on server)

### Why This Architecture?

✅ **Best of both worlds**:
- Modular development experience (easy to find and edit code)
- Simple deployment (single HTML file for GitHub Pages)
- No runtime dependencies or bundlers needed in production

✅ **Developer benefits**:
- Better code organization
- Easier collaboration (multiple developers can work in parallel)
- Improved IDE support (autocomplete, go-to-definition, etc.)
- Unit testing capability
- Version control clarity (see what changed per file)

✅ **Performance benefits**:
- Same fast load times as before (single file, no module loading)
- Potential for minification and optimization
- Progressive Web App capabilities maintained

## Project Structure

```
bible-progress/
├── src/                    # Source files (EDIT THESE)
│   ├── index.html         # HTML template
│   ├── styles/            # CSS modules
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── animations.css
│   │   ├── dark-mode.css
│   │   └── responsive.css
│   └── js/                # JavaScript modules
│       ├── config.js      # Firebase configuration
│       ├── security.js    # Security utilities
│       ├── data.js        # Bible data
│       ├── state.js       # State management
│       ├── auth.js        # Authentication
│       ├── profiles.js    # Profile management
│       ├── progress.js    # Progress tracking
│       ├── streaks.js     # Streak tracking
│       ├── plans.js       # Reading plans
│       ├── ui.js          # UI rendering
│       ├── dark-mode.js   # Dark mode
│       ├── easter-eggs.js # Easter eggs
│       └── main.js        # App initialization
├── build.js               # Build script
├── package.json           # Node.js configuration
├── .github/workflows/     # CI/CD automation
│   └── build.yml          # Auto-build workflow
├── index.html             # Built output (AUTO-GENERATED)
├── manifest.json          # PWA manifest
├── service-worker.js      # Service worker for offline
└── [other static files]   # Icons, CNAME, etc.
```

## Development Workflow

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sxejno/bible-progress.git
   cd bible-progress
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start developing**:
   ```bash
   npm run watch
   ```

### Making Changes

#### 1. Edit Source Files

**Never edit `index.html` directly!** Always edit files in `src/`:

- **HTML changes**: Edit `src/index.html`
- **CSS changes**: Edit files in `src/styles/`
- **JavaScript changes**: Edit files in `src/js/`

#### 2. Build

After making changes, build the project:

```bash
npm run build
```

This generates `index.html` from the source files.

#### 3. Test

Open `index.html` in a browser to test your changes:

```bash
npm run dev
```

Or use any local server:
```bash
npx http-server -p 8080 -o
```

#### 4. Commit

Commit both source files AND the built `index.html`:

```bash
git add src/ index.html
git commit -m "Your commit message"
git push
```

**Note**: GitHub Actions will automatically rebuild `index.html` from sources if you forget to build locally.

### Watch Mode (Recommended)

For active development, use watch mode to automatically rebuild on file changes:

```bash
npm run watch
```

This monitors `src/` for changes and rebuilds automatically.

## Code Organization

### JavaScript Modules

The JavaScript is organized into 13 modules, loaded in dependency order:

| Module | Purpose | Dependencies |
|--------|---------|--------------|
| `config.js` | Firebase configuration | None |
| `security.js` | XSS prevention, URL validation | None |
| `data.js` | Bible data, reading plans, constants | None |
| `state.js` | App state, localStorage, migrations | security, data |
| `auth.js` | Firebase auth, cloud sync | config, state |
| `profiles.js` | Profile CRUD operations | state, auth |
| `progress.js` | Progress calculations | data, state |
| `streaks.js` | Streak tracking, heatmap | state, progress |
| `plans.js` | Reading plan logic | data, state, progress |
| `ui.js` | Tab switching, rendering | data, state, progress, plans |
| `dark-mode.js` | Dark mode toggle | state |
| `easter-eggs.js` | All 7 easter eggs | state, progress, ui |
| `main.js` | App initialization | All modules |

#### Module Best Practices

**✅ DO:**
- Keep each module focused on one concern
- Document dependencies at the top of each file
- Export functions to `window` if used by inline event handlers
- Use clear, descriptive function names
- Add comments for complex logic

**❌ DON'T:**
- Create circular dependencies
- Mix concerns (e.g., don't put UI code in data.js)
- Modify code in other modules' domains
- Remove `window` exports for functions used in HTML

### CSS Modules

CSS is organized by purpose:

- **base.css**: Fonts, body styles, scrollbar utilities
- **components.css**: UI component styles (tabs, cards, buttons, etc.)
- **animations.css**: All @keyframes and animation classes
- **dark-mode.css**: Dark mode specific styles
- **responsive.css**: Media queries (mostly handled by Tailwind)

### Adding New Features

#### New JavaScript Function

1. **Choose the right module** based on purpose
2. **Add the function** to that module
3. **Export if needed**:
   ```javascript
   // If used by inline event handlers:
   window.myNewFunction = function() { ... }

   // If only used internally:
   function myHelperFunction() { ... }
   ```
4. **Rebuild and test**

#### New Reading Plan

1. **Add plan data** to `src/js/data.js`:
   ```javascript
   const PLAN_MY_NEW_PLAN = [
     // ... plan structure
   ]
   ```
2. **Add plan logic** to `src/js/plans.js`:
   ```javascript
   function getMyNewPlan() { ... }
   ```
3. **Update UI** in `src/js/ui.js` to show the new plan
4. **Rebuild and test**

#### New Easter Egg

1. **Add implementation** to `src/js/easter-eggs.js`
2. **Follow existing patterns** (Konami code, click detection, etc.)
3. **Test thoroughly** (easter eggs should be delightful, not buggy!)

## Build System

### How the Build Works

The build script (`build.js`) performs these steps:

1. **Reads HTML template** from `src/index.html`
2. **Combines CSS** from all files in `src/styles/` (in order)
3. **Combines JavaScript** from all files in `src/js/` (in dependency order)
4. **Replaces placeholders**:
   - `<!-- CSS_PLACEHOLDER -->` → Combined CSS
   - `<!-- JS_PLACEHOLDER -->` → Combined JavaScript
5. **Adds build timestamp** as HTML comment
6. **Writes output** to `index.html` (root directory)

### Build Commands

```bash
# One-time build
npm run build

# Watch mode (rebuilds on file changes)
npm run watch

# Build and serve locally
npm run dev

# Check code formatting
npm run format:check

# Auto-fix formatting
npm run format

# Lint JavaScript
npm run lint
```

### GitHub Actions

The repository includes automated building via GitHub Actions (`.github/workflows/build.yml`):

**Triggers**:
- Push to `main` branch or any `claude/*` branch
- Pull requests to `main`
- Changes to `src/`, `build.js`, or `package.json`
- Manual workflow dispatch

**What it does**:
1. Checks out code
2. Installs dependencies
3. Runs build
4. Commits updated `index.html` if changed
5. Pushes back to the branch

**Benefits**:
- No need to remember to build before pushing
- Ensures `index.html` is always up-to-date
- Works for contributors who don't have Node.js installed

## Testing

### Manual Testing Checklist

After making changes, verify:

#### Core Functionality
- [ ] Mark/unmark chapters
- [ ] Switch between tabs (All Books, OT, NT, Daily Plan, Stats, Tools, Settings, About)
- [ ] Search for books
- [ ] Mark all/clear all in book view
- [ ] Progress percentages are accurate

#### Profile System
- [ ] Create new profile
- [ ] Switch profiles (data separates correctly)
- [ ] Rename profile
- [ ] Delete profile
- [ ] Profile colors display correctly

#### Data Persistence
- [ ] Changes save to localStorage
- [ ] Refresh page preserves state
- [ ] Backup/restore JSON works
- [ ] Cloud sync works (when logged in)

#### Reading Plans
- [ ] Sequential plan shows correct chapters
- [ ] M'Cheyne plan shows 4 chapters/day
- [ ] Horner plan shows 10 lists
- [ ] Horner daily progress tracks correctly
- [ ] One Year plan works
- [ ] Plan persists per profile

#### Streak Tracking
- [ ] Streak badge shows current streak
- [ ] Heatmap displays reading activity
- [ ] Milestone celebrations trigger correctly
- [ ] Streak calculations across midnight work

#### Visual & UX
- [ ] Dark mode toggles correctly
- [ ] Animations play smoothly
- [ ] Responsive on mobile (< 640px)
- [ ] Responsive on tablet (640-1024px)
- [ ] PWA installation works

#### Easter Eggs
- [ ] Konami code works
- [ ] Profile dot click (7 times) works
- [ ] Psalm 119 achievement triggers
- [ ] Bible completion celebration works
- [ ] Creator name typing works
- [ ] Christmas/Easter greetings work (if applicable)
- [ ] Triple-click logo triggers dark mode

### Automated Testing (Future)

The modular architecture enables unit testing:

```javascript
// Example: test progress calculation
import { getProgress } from './src/js/progress.js'

test('calculates progress correctly', () => {
  // ... test code
})
```

See `src/js/REFACTORING.md` for testing recommendations.

## Deployment

### GitHub Pages

The site deploys automatically to GitHub Pages from the `main` branch:

1. **Push to main**:
   ```bash
   git push origin main
   ```

2. **GitHub Actions builds** `index.html` (if needed)

3. **GitHub Pages serves** `index.html` at bibleprogress.com

### Manual Deployment

If you need to deploy manually:

1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Commit and push**:
   ```bash
   git add index.html
   git commit -m "Manual build"
   git push
   ```

3. **Verify deployment** at https://bibleprogress.com

## Troubleshooting

### Build Fails

**Error**: `Module not found: src/js/xyz.js`

**Solution**: Check that all JavaScript files exist and are named correctly.

**Error**: `Build failed: unexpected token`

**Solution**: Check for syntax errors in your JavaScript. Run `npm run lint` to find issues.

### Functionality Broken After Build

**Problem**: Feature works in `src/` but broken in built `index.html`

**Solution**:
1. Check browser console for errors
2. Verify function is exported to `window` if used by inline handlers:
   ```javascript
   window.myFunction = function() { ... }
   ```
3. Check module load order in `build.js`

### GitHub Actions Build Fails

**Problem**: CI/CD workflow fails on push

**Solution**:
1. Check the Actions tab on GitHub for error logs
2. Run `npm run build` locally to reproduce the error
3. Fix the error and push again

### Changes Not Appearing

**Problem**: Made changes but don't see them on the site

**Solution**:
1. **Did you build?** Run `npm run build`
2. **Did you edit the right file?** Edit `src/index.html`, not root `index.html`
3. **Hard refresh**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
4. **Clear service worker cache**: Dev Tools → Application → Clear storage

## Code Quality

### Linting

ESLint is configured for JavaScript files:

```bash
npm run lint
```

Configuration: `.eslintrc.json`

### Formatting

Prettier is configured for consistent formatting:

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format
```

Configuration: `.prettierrc.json`

### Pre-commit Hooks (Optional)

Consider adding Husky for automatic linting before commits:

```bash
npm install --save-dev husky
npx husky init
echo "npm run lint && npm run build" > .husky/pre-commit
```

## Contributing

### For External Contributors

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. **Make changes in `src/` directory**
4. **Build and test**:
   ```bash
   npm run build
   npm run dev
   ```
5. **Commit with descriptive message**
6. **Push and open a Pull Request**

### For AI Assistants (Claude Code)

Follow the same workflow:
1. Work in `claude/*` branches
2. Edit `src/` files (never root `index.html`)
3. Build before committing
4. GitHub Actions will rebuild if you forget

See `CLAUDE.md` for detailed AI assistant guidelines.

## Additional Resources

- **CLAUDE.md**: Complete AI assistant guide with feature documentation
- **TODO.md**: Development roadmap and issue tracking
- **SECURITY.md**: Security best practices and guidelines
- **README.md**: User-facing documentation
- **src/js/REFACTORING.md**: Detailed module documentation

## Questions?

For questions or issues:
- Check existing documentation first
- Review commit history for examples
- Open an issue on GitHub
- Refer to inline code comments

---

**Happy coding!** 🎉📖

This refactored architecture makes Bible Progress easier to maintain while preserving all its features and simplicity.
