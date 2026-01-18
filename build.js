#!/usr/bin/env node

/**
 * Build Script for Bible Progress
 *
 * Combines source files (HTML, CSS, JS) into a single index.html for deployment.
 * This maintains the single-file deployment model while allowing modular development.
 */

const fs = require('fs')
const path = require('path')

// Configuration
const CONFIG = {
  src: {
    html: 'src/index.html',
    styles: 'src/styles',
    js: 'src/js',
  },
  output: 'index.html',
  watch: process.argv.includes('--watch'),
}

// JavaScript files in dependency order
const JS_FILES = [
  'config.js',       // Firebase config (no dependencies)
  'security.js',     // Security utilities (no dependencies)
  'data.js',         // Bible data and constants (no dependencies)
  'state.js',        // State management (depends on: security, data)
  'auth.js',         // Authentication (depends on: config, state)
  'profiles.js',     // Profile management (depends on: state, auth)
  'progress.js',     // Progress calculations (depends on: data, state)
  'streaks.js',      // Streak tracking (depends on: state, progress)
  'plans.js',        // Reading plans (depends on: data, state, progress)
  'ui.js',           // UI rendering (depends on: data, state, progress, plans)
  'dark-mode.js',    // Dark mode (depends on: state)
  'easter-eggs.js',  // Easter eggs (depends on: state, progress, ui)
  'main.js',         // Main initialization (depends on: all modules)
]

// CSS files in order
const CSS_FILES = [
  'base.css',
  'components.css',
  'animations.css',
  'dark-mode.css',
  'responsive.css',
]

/**
 * Read and combine all CSS files
 */
function buildCSS() {
  console.log('📦 Building CSS...')

  const styles = CSS_FILES.map(file => {
    const filepath = path.join(CONFIG.src.styles, file)
    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️  Warning: CSS file not found: ${file}`)
      return ''
    }
    return fs.readFileSync(filepath, 'utf8')
  }).filter(content => content.trim().length > 0)

  console.log(`✓ Combined ${styles.length} CSS files`)
  return styles.join('\n\n')
}

/**
 * Read and combine all JavaScript files
 */
function buildJS() {
  console.log('📦 Building JavaScript...')

  const scripts = JS_FILES.map(file => {
    const filepath = path.join(CONFIG.src.js, file)
    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️  Warning: JS file not found: ${file}`)
      return ''
    }
    const content = fs.readFileSync(filepath, 'utf8')

    // Wrap each module to prevent global scope pollution
    // But preserve window assignments for inline event handlers
    return `
// ===== ${file} =====
(function() {
${content}
})();
`
  }).filter(content => content.trim().length > 0)

  console.log(`✓ Combined ${scripts.length} JavaScript files`)
  return scripts.join('\n\n')
}

/**
 * Build the final index.html
 */
function build() {
  console.log('🔨 Building Bible Progress...')
  console.log('')

  try {
    // Read template
    const template = fs.readFileSync(CONFIG.src.html, 'utf8')

    // Build CSS and JS
    const css = buildCSS()
    const js = buildJS()

    // Replace placeholders
    let html = template
      .replace('<!-- CSS_PLACEHOLDER -->', css)
      .replace('<!-- JS_PLACEHOLDER -->', js)

    // Add build timestamp comment
    const timestamp = new Date().toISOString()
    html = html.replace(
      '</head>',
      `    <!-- Built: ${timestamp} -->\n</head>`
    )

    // Write output
    fs.writeFileSync(CONFIG.output, html, 'utf8')

    // Calculate sizes
    const htmlSize = (fs.statSync(CONFIG.output).size / 1024).toFixed(2)
    const cssSize = (new Blob([css]).size / 1024).toFixed(2)
    const jsSize = (new Blob([js]).size / 1024).toFixed(2)

    console.log('')
    console.log('✨ Build complete!')
    console.log(`   Output: ${CONFIG.output}`)
    console.log(`   Size: ${htmlSize} KB (CSS: ${cssSize} KB, JS: ${jsSize} KB)`)
    console.log(`   Built: ${timestamp}`)
    console.log('')

  } catch (error) {
    console.error('❌ Build failed:', error.message)
    process.exit(1)
  }
}

/**
 * Watch mode
 */
function watch() {
  console.log('👀 Watching for changes...')
  console.log('')

  const watchDirs = [
    CONFIG.src.html,
    CONFIG.src.styles,
    CONFIG.src.js,
  ]

  watchDirs.forEach(target => {
    fs.watch(target, { recursive: true }, (eventType, filename) => {
      if (filename && !filename.startsWith('.')) {
        console.log(`📝 Changed: ${filename}`)
        build()
      }
    })
  })

  // Initial build
  build()
}

// Main execution
if (CONFIG.watch) {
  watch()
} else {
  build()
}
