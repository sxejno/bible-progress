/**
 * ui.js
 *
 * Main UI rendering functions
 * Handles tab switching, book grid, chapter grid, stats page, and all UI updates
 */

import { bible, assignCategories, getCategoryLabelStyle } from './data.js';
import { getProgress } from './state.js';
import { calculateStats } from './progress.js';
import { renderDailyPlan } from './plans.js';
import { renderHeatmap, calculateStreaks } from './streaks.js';

// Initialize Bible categories
assignCategories();

// UI State
let activeTab = 'ALL';
let activeBookIdx = null;
let searchQuery = "";
let mainChart = null;
let miniCharts = [];

/**
 * Set active tab and update UI
 */
function setTab(t, appData, renderBookGrid, renderSubdivisionStats, renderStatsPage, renderProfileSyncSettings, updateDefaultTabSelector) {
    activeTab = t;
    window.activeTab = t;

    // Update tab buttons
    ['ALL', 'OT', 'NT', 'PLAN', 'STATS', 'TOOLS', 'ABOUT', 'SETTINGS'].forEach(tab => {
        const el = document.getElementById(`tab-${tab.toLowerCase()}`);
        if (el) {
            el.className = (tab === t)
                ? "px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all tab-active whitespace-nowrap"
                : "px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all text-slate-500 hover:text-indigo-600 whitespace-nowrap";
        }
    });

    // Hide all views
    ['view-books', 'view-stats', 'view-plan', 'view-chapters', 'view-tools', 'view-about', 'view-settings'].forEach(v => {
        const view = document.getElementById(v);
        view.classList.remove('slide-in-right');
        view.classList.add('hidden');
    });

    // Show selected view with animation
    if (t === 'STATS') {
        const view = document.getElementById('view-stats');
        view.classList.remove('hidden');
        setTimeout(() => view.classList.add('slide-in-right'), 10);
        renderStatsPage(appData);
    } else if (t === 'PLAN') {
        const view = document.getElementById('view-plan');
        view.classList.remove('hidden');
        setTimeout(() => view.classList.add('slide-in-right'), 10);
        const activePlan = appData.profilePlans[appData.activeProfileId] || 'MCHEYNE';
        renderDailyPlan(appData, activePlan);
    } else if (t === 'TOOLS') {
        const view = document.getElementById('view-tools');
        view.classList.remove('hidden');
        setTimeout(() => view.classList.add('slide-in-right'), 10);
    } else if (t === 'ABOUT') {
        const view = document.getElementById('view-about');
        view.classList.remove('hidden');
        setTimeout(() => view.classList.add('slide-in-right'), 10);
    } else if (t === 'SETTINGS') {
        const view = document.getElementById('view-settings');
        view.classList.remove('hidden');
        setTimeout(() => view.classList.add('slide-in-right'), 10);
        renderProfileSyncSettings();
        updateDefaultTabSelector();
    } else {
        const view = document.getElementById('view-books');
        view.classList.remove('hidden');
        setTimeout(() => view.classList.add('slide-in-right'), 10);
        renderBookGrid(appData);
        renderSubdivisionStats(appData);
    }
}

/**
 * Handle search input
 */
function handleSearch() {
    searchQuery = document.getElementById('book-search').value.toLowerCase();

    const resultsCountEl = document.getElementById('search-results-count');
    if (searchQuery) {
        const matchingBooks = bible.filter(b =>
            (activeTab === 'ALL' || b.testament === activeTab) &&
            b.name.toLowerCase().includes(searchQuery)
        );
        const count = matchingBooks.length;
        const bookText = count === 1 ? 'book' : 'books';
        resultsCountEl.textContent = `${count} ${bookText} found`;
        resultsCountEl.classList.remove('hidden');
    } else {
        resultsCountEl.classList.add('hidden');
    }
}

/**
 * Debounce utility
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Render book grid
 */
function renderBookGrid(appData) {
    const container = document.getElementById('book-grid');
    const currentProg = getProgress(appData);

    container.innerHTML = '';

    const booksToShow = bible.filter(b =>
        (activeTab === 'ALL' || b.testament === activeTab) &&
        (!searchQuery || b.name.toLowerCase().includes(searchQuery))
    );

    booksToShow.forEach((book, idx) => {
        const bookCard = createBookCard(book, idx, currentProg);
        container.appendChild(bookCard);
    });
}

/**
 * Create a book card DOM element
 */
function createBookCard(book, idx, currentProg) {
    const card = document.createElement('div');
    const totalWords = book.ch.reduce((sum, w) => sum + w, 0);
    let readWords = 0;

    book.ch.forEach((wordCount, i) => {
        if (currentProg[`${book.name}-${i + 1}`]) {
            readWords += wordCount;
        }
    });

    const percent = ((readWords / totalWords) * 100).toFixed(2);

    card.className = `${book.style} p-6 rounded-2xl border-2 cursor-pointer transition-all hover:scale-105`;
    card.onclick = () => openBook(idx);

    card.innerHTML = `
        <h3 class="text-lg font-bold mb-2">${book.name}</h3>
        <div class="text-sm font-bold">${percent}%</div>
        <div class="text-xs opacity-75">${book.ch.length} chapters</div>
    `;

    return card;
}

/**
 * Open a book to view chapters
 */
function openBook(idx) {
    activeBookIdx = idx;
    const book = bible[idx];

    ['view-books', 'view-stats', 'view-plan', 'view-tools', 'view-about', 'view-settings'].forEach(id =>
        document.getElementById(id).classList.add('hidden')
    );

    document.getElementById('view-chapters').classList.remove('hidden');
    document.getElementById('active-book-title').innerText = book.name;

    const bookLabel = document.getElementById('book-label');
    bookLabel.innerText = book.cat;
    bookLabel.className = `${getCategoryLabelStyle(book.cat)} text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-sm`;

    renderChapterGrid();
    window.scrollTo(0, 0);
}

/**
 * Render chapter grid for active book
 */
function renderChapterGrid(appData) {
    const container = document.getElementById('chapter-grid');
    const book = bible[activeBookIdx];
    const currentProg = getProgress(appData);

    container.innerHTML = '';

    book.ch.forEach((wordCount, i) => {
        const chapterId = `${book.name}-${i + 1}`;
        const isRead = currentProg[chapterId];

        const btn = document.createElement('button');
        btn.className = isRead
            ? 'px-4 py-3 rounded-xl font-bold bg-indigo-500 text-white'
            : 'px-4 py-3 rounded-xl font-bold bg-white/10 text-white border border-white/20';
        btn.innerText = i + 1;
        btn.onclick = (e) => toggleChapter(chapterId, e);

        container.appendChild(btn);
    });
}

/**
 * Render stats page with charts
 */
function renderStatsPage(appData) {
    const stats = calculateStats(appData);
    const streaks = calculateStreaks(appData);

    // Update stats display
    document.getElementById('stats-chapters-read').innerText = stats.readChapters;
    document.getElementById('stats-chapters-total').innerText = stats.totalChapters;
    document.getElementById('stats-words-read').innerText = stats.readWords.toLocaleString();
    document.getElementById('stats-words-total').innerText = stats.totalWords.toLocaleString();

    // Render heatmap
    renderHeatmap(appData);

    // Update streak display
    document.getElementById('stats-current-streak').innerText = streaks.current;
    document.getElementById('stats-longest-streak').innerText = streaks.longest;

    // Render charts (if Chart.js is available)
    // renderMainChart(appData);
    // renderCategoryCharts(appData);
}

/**
 * Show books view (return from chapter view)
 */
function showBooks() {
    return setTab(activeTab === 'STATS' || activeTab === 'PLAN' || activeTab === 'TOOLS' || activeTab === 'ABOUT' || activeTab === 'SETTINGS' ? 'ALL' : activeTab);
}

/**
 * Create confetti celebration animation
 */
function createConfetti(event) {
    const button = event.target.closest('button');
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];

        const angle = (i * 45) + Math.random() * 45;
        const distance = 60 + Math.random() * 40;
        const radians = angle * Math.PI / 180;
        particle.style.setProperty('--tx', Math.cos(radians) * distance + 'px');
        particle.style.setProperty('--ty', Math.sin(radians) * distance - 80 + 'px');

        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1000);
    }

    button.classList.add('checkbox-celebrate');
    setTimeout(() => button.classList.remove('checkbox-celebrate'), 500);
}

/**
 * Render subdivision statistics
 */
function renderSubdivisionStats(appData) {
    // Implementation for rendering testament/category breakdowns
    // This would calculate and display OT/NT progress, category progress, etc.
}

export {
    setTab,
    handleSearch,
    debounce,
    renderBookGrid,
    openBook,
    renderChapterGrid,
    renderStatsPage,
    showBooks,
    createConfetti,
    renderSubdivisionStats,
    activeTab,
    activeBookIdx,
    searchQuery
};
