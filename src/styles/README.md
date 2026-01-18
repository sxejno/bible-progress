# CSS Organization

This directory contains all CSS code extracted from `/home/user/bible-progress/index.html` (lines 42-228), organized into separate files for better maintainability.

## File Structure

### 1. base.css (14 lines)
**Purpose**: Base styles, fonts, and foundational styles

**Contains**:
- Google Fonts import (@import for 'Inter' font family)
- Body styles (font-family, background-color, color, font-smoothing)
- Scrollbar hiding utilities (.no-scrollbar)

### 2. components.css (116 lines)
**Purpose**: Component-specific styles

**Contains**:
- `.tab-active` - Active tab state styling
- `.glass` - Glass morphism effect
- `.book-card` - Book card component with hover effects
- `.profile-dot` - Profile color dot with hover animation
- `.tab-scroll-wrapper` - Tab scroll container
- `.tab-scroll-indicator` - Scroll indicator for tab bar
- `.progress-bar` - Progress bar transitions
- `.btn-press` - Button press effect
- `.confetti-particle` - Confetti celebration particles
- `.progress-bar-shine` - Progress bar with gradient shine effect
- `.gradient-card` - Gradient background cards
- `.shadow-lift` - Enhanced shadow transitions on hover
- `.tab-indicator` - Tab indicator animation

### 3. animations.css (100 lines)
**Purpose**: All @keyframes and animation-related styles

**Contains**:
- `fadeIn` keyframes + `.animate-in` class
- `verseFadeIn` & `verseFadeOut` keyframes + `.verse-fade-in` & `.verse-fade-out` classes
- `slideInRight` keyframes + `.slide-in-right` class
- `checkboxCelebrate` keyframes + `.checkbox-celebrate` class
- `confetti` keyframes
- `modalIn` keyframes + `.modal-in` class
- `shimmer` keyframes + `.shimmer` class
- `progress-shine` keyframes
- `pulse-subtle` keyframes + `.pulse-badge` class

### 4. dark-mode.css (10 lines)
**Purpose**: Dark mode styles

**Contains**:
- `.dark-mode` - Inverted color scheme
- `.dark-mode img` - Image inversion for dark mode

**Note**: These styles are dynamically injected via JavaScript in the original application (lines ~3656-3690 and ~4088-4106).

### 5. responsive.css (18 lines)
**Purpose**: Media queries and responsive design rules

**Contains**:
- Currently empty with commented examples
- Placeholder for future custom media queries
- The application currently uses Tailwind CSS utility classes for responsive design

## Original Source

All CSS was extracted from:
- **File**: `/home/user/bible-progress/index.html`
- **Lines**: 42-228 (within `<style>` tag)
- **Total**: 186 lines of CSS

## Integration Notes

To use these CSS files in the application, they would need to be:
1. Linked in the HTML `<head>` section using `<link>` tags, OR
2. Imported in a main CSS file, OR
3. Bundled using a build process

**Current State**: The CSS remains in the inline `<style>` tag in index.html. These files are organized references that can be used for a future refactoring to external stylesheets.

## Preservation

All existing styles have been preserved without modification. No CSS rules were removed or altered during the extraction process.
