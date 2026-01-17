# Bible Progress: Word-Weighted KJV Reading Tracker

A modern, mathematically accurate progress tracker for reading the King James Version (KJV) Bible. Unlike standard trackers that treat every chapter equally (where Psalm 117's 33 words count the same as Psalm 119's 2,423 words), this app tracks your progress based on **word count** — giving you a true representation of how much of the Bible you've actually read.

**Total Word Count:** 789,634 words (OT: 609,252 | NT: 180,382)

## ✨ Features

### 📊 Word-Weighted Progress Tracking
- **Mathematically Accurate:** Progress calculated by word count, not chapter count
- **Precision Metrics:** See your completion percentage down to 4 decimal places
- **Category Breakdown:** Beautiful donut charts for Bible sections (Pentateuch, Gospels, Wisdom Books, Epistles, etc.)
- **Testament Views:** Separate Old Testament and New Testament progress tracking

### 👥 Multi-Profile Support
- **Multiple Users:** Create separate profiles for family members or different reading goals
- **Profile Colors:** Each profile gets a unique auto-generated color theme
- **Quick Switching:** Easily switch between profiles with independent progress tracking
- **Profile Management:** Rename or delete profiles as needed

### 📖 Three Reading Plans
1. **Sequential:** Read from Genesis to Revelation in canonical order
2. **M'Cheyne's Plan:** Classic 365-day plan with 4 chapters per day
3. **Horner's Plan:** Unique 10-list system rotating through different Bible sections
   - Daily progress tracking for completed lists
   - Visual checkmarks for today's accomplishments

### 🔥 Reading Streak Tracker
- **Streak Counter:** Track consecutive days of Bible reading
- **Grace Period:** 1-day buffer so missing one day doesn't break your streak
- **Milestone Celebrations:** Special achievements at 7, 14, 30, 50, 100, 180, and 365 days
- **Activity Heatmap:** GitHub-style calendar showing your reading history
- **Dynamic Badges:** Emoji progression (🔥 → ⚡ → 💎 → 👑) as your streak grows

### ☁️ Cloud Sync & Authentication
- **Firebase Integration:** Sync your progress across devices
- **Google Sign-In:** Quick authentication with your Google account
- **Email/Password:** Traditional authentication option available
- **Local-First:** Data stored locally for speed, cloud backup for safety

### 🎨 Modern Design
- **Glass-Morphism UI:** Beautiful, modern interface with backdrop blur effects
- **Dark Mode:** Toggle dark mode in Settings or discover the triple-click logo easter egg
- **Responsive Design:** Works beautifully on mobile, tablet, and desktop
- **Smooth Animations:** Delightful transitions and visual feedback

### ♿ Accessibility
- **Screen Reader Support:** 35+ comprehensive ARIA labels
- **Keyboard Navigation:** Full keyboard accessibility
- **Mobile Optimized:** User scaling enabled for better readability

### 💾 Data Management
- **Auto-Save:** Progress saved automatically to your browser's local storage
- **Backup & Restore:** Export/import your data as JSON
- **Cloud Backup:** Automatic cloud sync when signed in
- **Data Privacy:** Your reading progress stays private and secure

### 🎁 Hidden Features
Discover 7 easter eggs hidden throughout the app, including:
- Konami Code surprise
- Special celebrations for milestones
- Holiday greetings
- And more secrets to uncover!

## 🚀 How to Use

### Option 1: Use Online (Recommended)
Simply visit: **[bibleprogress.com](https://bibleprogress.com)**

No installation required. Works instantly in any modern web browser.

### Option 2: Install as Progressive Web App
Get an app-like experience on your device:

**📱 Mobile (iOS):**
1. Open [bibleprogress.com](https://bibleprogress.com) in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add" to install

**📱 Mobile (Android):**
1. Open [bibleprogress.com](https://bibleprogress.com) in Chrome
2. Tap the menu (⋮)
3. Select "Add to Home Screen" or "Install App"
4. Tap "Add" to install

**💻 Desktop (Chrome/Edge):**
1. Visit [bibleprogress.com](https://bibleprogress.com)
2. Click the install icon (⊕) in the address bar
3. Click "Install" to add to your desktop

### Option 3: Run Locally
1. Download the `index.html` file from this repository
2. Open it in any modern web browser (Chrome, Safari, Edge, Firefox)
3. All features work offline after initial load

## 🛠 Technologies

### Core Stack
- **HTML5 & JavaScript (ES6)** - Pure vanilla JavaScript, no frameworks
- **Tailwind CSS** - Modern utility-first styling
- **Chart.js** - Beautiful donut chart visualizations
- **LocalStorage API** - Fast, local data persistence

### Cloud Services
- **Firebase Authentication** - Google OAuth & email/password sign-in
- **Cloud Firestore** - Cross-device sync and backup
- **Firebase Analytics** - Usage insights and improvements

### Architecture
- **Single-File Application** - Entire app in one HTML file (3,847 lines)
- **Progressive Web App** - Installable, works offline, fast loading
- **No Build Process** - Simple, maintainable, no dependencies to install

## 📊 Data Accuracy

- **Bible Version:** King James Version (KJV)
- **Word Counts:** Verified counts per chapter for mathematical precision
- **Total Words:** 789,634 (Old Testament: 609,252 | New Testament: 180,382)
- **Source Data:** `kjv_chapter_word_counts.csv` included in repository

## 🔐 Privacy & Security

- **Local-First:** All data stored primarily on your device
- **Optional Cloud Sync:** Sign in only if you want cross-device sync
- **Secure Authentication:** Firebase Auth with industry-standard security
- **No Tracking:** Your reading progress is private
- **Open Source:** Code is transparent and auditable

## 📸 Screenshots

Visit [bibleprogress.com](https://bibleprogress.com) to see the app in action!

## 🤝 Contributing

This project welcomes contributions! Check out:
- **CLAUDE.md** - Comprehensive developer documentation
- **TODO.md** - Development roadmap and feature ideas
- **SECURITY.md** - Security guidelines and best practices

## 📜 License

This project is open source. Feel free to fork, modify, or use it for your own Bible reading journey.

---

**Live Site:** [bibleprogress.com](https://bibleprogress.com)
**Maintained by:** Shane (with AI assistance)
**Last Updated:** January 2026
