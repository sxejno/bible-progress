/**
 * main.js
 *
 * Main application initialization
 * Imports all modules and sets up the application on page load
 */

// Import all modules
import { analytics } from './config.js';
import { logEvent } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { assignCategories } from './data.js';
import { initializeAppData } from './state.js';
import { setupAuthListener, toggleAuthModal, handleGoogleLogin, handleEmailAuth, handleLogout } from './auth.js';
import { toggleProfileMenu, createNewProfile, renderProfileList, updateProfileColor } from './profiles.js';
import { saveProgress, updateStats, toggleChapter, markChaptersAsRead, toggleAllInBook } from './progress.js';
import { updateStreakBadge } from './streaks.js';
import { setTab, renderBookGrid, renderSubdivisionStats, renderStatsPage, openBook, showBooks, handleSearch, debounce, createConfetti } from './ui.js';
import { renderDailyPlan } from './plans.js';
import { initDarkMode, toggleDarkMode, initLogoTripleClick } from './dark-mode.js';
import { initAllEasterEggs } from './easter-eggs.js';

// Global error handler
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error('❌ Global Error:', {
        message: msg,
        url: url,
        line: lineNo,
        column: columnNo,
        error: error,
        stack: error?.stack
    });

    // Log to analytics if available
    try {
        if (typeof analytics !== 'undefined') {
            logEvent(analytics, 'exception', {
                description: msg,
                fatal: false
            });
        }
    } catch (analyticsError) {
        console.warn('Failed to log error to analytics:', analyticsError);
    }

    return false; // Allow default error handling
};

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function (event) {
    console.error('❌ Unhandled Promise Rejection:', {
        reason: event.reason,
        promise: event.promise
    });

    try {
        if (typeof analytics !== 'undefined') {
            logEvent(analytics, 'exception', {
                description: `Unhandled Promise: ${event.reason}`,
                fatal: false
            });
        }
    } catch (analyticsError) {
        console.warn('Failed to log error to analytics:', analyticsError);
    }
});

// Application state
let appData = null;
let currentUser = null;
let unsubscribe = null;
let saveTimeout = null;
let userIsEditing = false;

/**
 * Main initialization function
 */
function init() {
    console.log('🚀 Bible Progress - Initializing...');

    // Initialize Bible data categories
    assignCategories();

    // Initialize app data from localStorage
    appData = initializeAppData();
    console.log('✅ App data initialized:', {
        profiles: Object.keys(appData.profiles).length,
        activeProfile: appData.activeProfileId
    });

    // Initialize UI
    updateProfileColor(appData);
    updateStats(appData);
    updateStreakBadge(appData);

    // Set up event listeners and initial render
    renderBookGrid(appData);
    renderSubdivisionStats(appData);

    // Initialize dark mode
    initDarkMode();

    // Initialize easter eggs
    initAllEasterEggs(appData);
    initLogoTripleClick();

    // Set up authentication
    setupAuthListener(appData, refreshUI);

    // Attach global functions to window for inline event handlers
    attachGlobalFunctions();

    // Check for first visit and show intro modal
    checkFirstVisit();

    console.log('✅ Bible Progress - Ready!');
}

/**
 * Refresh UI after data changes
 */
function refreshUI() {
    const currentProfileName = document.getElementById('current-profile-name');
    if (currentProfileName) {
        currentProfileName.innerText = appData.activeProfileId;
    }

    updateProfileColor(appData);

    // Update active plan for current profile
    const planSelector = document.getElementById('plan-selector');
    if (planSelector) {
        const activePlan = appData.profilePlans[appData.activeProfileId] || 'MCHEYNE';
        planSelector.value = activePlan;
    }

    // Re-render current view
    const activeTab = window.activeTab || 'ALL';
    if (activeTab === 'STATS') {
        renderStatsPage(appData);
    } else if (activeTab === 'PLAN') {
        renderDailyPlan(appData, appData.profilePlans[appData.activeProfileId] || 'MCHEYNE');
    } else {
        renderBookGrid(appData);
        renderSubdivisionStats(appData);
    }

    updateStats(appData);
    updateStreakBadge(appData);
}

/**
 * Attach global functions to window for inline event handlers
 */
function attachGlobalFunctions() {
    // Auth functions
    window.toggleAuthModal = toggleAuthModal;
    window.handleGoogleLogin = handleGoogleLogin;
    window.handleEmailAuth = handleEmailAuth;
    window.handleLogout = handleLogout;

    // Profile functions
    window.toggleProfileMenu = () => toggleProfileMenu(appData);
    window.createNewProfile = () => createNewProfile(appData);
    window.renderProfileList = () => renderProfileList(appData);

    // Progress functions
    window.saveProgress = (immediate = false) => saveProgress(appData, currentUser, null, immediate);
    window.toggleChapter = (id, event) => {
        const timestamp = toggleChapter(appData, id, event);
        if (timestamp) createConfetti(event);
        saveProgress(appData, currentUser, null);
        refreshUI();
    };
    window.markChaptersAsRead = (bookName, chapters, event) => {
        markChaptersAsRead(appData, bookName, chapters);
        if (event) createConfetti(event);
        saveProgress(appData, currentUser, null);
        refreshUI();
    };
    window.toggleAllInBook = (val) => {
        toggleAllInBook(appData, window.activeBookIdx, val);
        saveProgress(appData, currentUser, null);
        refreshUI();
    };

    // UI functions
    window.setTab = (t) => setTab(t, appData, renderBookGrid, renderSubdivisionStats, renderStatsPage, null, null);
    window.renderBookGrid = () => renderBookGrid(appData);
    window.renderDailyPlan = () => renderDailyPlan(appData, appData.profilePlans[appData.activeProfileId] || 'MCHEYNE');
    window.renderStatsPage = () => renderStatsPage(appData);
    window.openBook = openBook;
    window.showBooks = showBooks;
    window.handleSearch = handleSearch;
    window.debouncedHandleSearch = debounce(handleSearch, 300);
    window.createConfetti = createConfetti;

    // Dark mode functions
    window.toggleDarkMode = toggleDarkMode;

    // Backup/restore functions
    window.backupData = () => {
        const dataStr = JSON.stringify(appData);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        const timestamp = new Date().toISOString().split('T')[0];
        linkElement.setAttribute('download', `bibleprogress_backup_${timestamp}.json`);
        linkElement.click();
    };

    window.restoreData = (input) => {
        const file = input.files[0];
        if (!file) return;

        // Validation and restore logic
        // (Full implementation would be here)
        console.log('Restore function called');
    };

    // Intro modal functions
    window.showIntroModal = () => {
        const modal = document.getElementById('intro-modal');
        if (modal) modal.classList.remove('hidden');
    };

    window.closeIntroModal = () => {
        const modal = document.getElementById('intro-modal');
        if (modal) modal.classList.add('hidden');
        localStorage.setItem('kjv_intro_seen', 'true');
    };
}

/**
 * Check if this is the user's first visit
 */
function checkFirstVisit() {
    const hasSeenIntro = localStorage.getItem('kjv_intro_seen');
    if (!hasSeenIntro) {
        setTimeout(() => {
            if (window.showIntroModal) window.showIntroModal();
        }, 500);
    }
}

/**
 * Offline/Online detection
 */
function setupOfflineDetection() {
    window.addEventListener('offline', () => {
        console.log('📡 Connection lost - entering offline mode');
        showToast('You are offline. All changes are saved locally and will sync when you\'re back online.', 'offline');
    });

    window.addEventListener('online', () => {
        console.log('✅ Connection restored - back online');
        showToast('Connection restored! Your progress is syncing to the cloud.', 'online');
        if (currentUser) {
            window.saveProgress(true);
        }
    });

    if (!navigator.onLine) {
        console.log('📡 Starting in offline mode');
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const existingToast = document.getElementById('connection-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'connection-toast';
    toast.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[150] transition-all duration-300';

    const bgColors = {
        'offline': 'bg-amber-50 border-amber-200',
        'online': 'bg-emerald-50 border-emerald-200',
        'info': 'bg-slate-50 border-slate-200'
    };

    const textColors = {
        'offline': 'text-amber-900',
        'online': 'text-emerald-900',
        'info': 'text-slate-900'
    };

    const icons = {
        'offline': '📡',
        'online': '✅',
        'info': 'ℹ️'
    };

    toast.innerHTML = `
        <div class="${bgColors[type]} ${textColors[type]} px-6 py-4 rounded-2xl shadow-2xl border-2 flex items-center gap-3 modal-in max-w-md">
            <span class="text-2xl">${icons[type]}</span>
            <p class="text-sm font-bold leading-relaxed">${message}</p>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Setup offline detection
setupOfflineDetection();

export { init, refreshUI, appData, currentUser };
