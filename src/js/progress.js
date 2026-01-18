/**
 * progress.js
 *
 * Progress calculation and tracking functions
 * Handles chapter progress, word counts, and statistics calculations
 */

import { bible, WORD_TOTALS } from './data.js';
import { getProgress, setProgress, getLocalDateString } from './state.js';

/**
 * Save progress to localStorage and Firebase
 */
function saveProgress(appData, currentUser, db, immediate = false) {
    // Always save to localStorage first (never fails)
    localStorage.setItem('kjv_v6_data', JSON.stringify(appData));
    localStorage.setItem('kjv_v6_progress', JSON.stringify(getProgress(appData)));
    
    // Try to save to Firebase if user is logged in
    if (currentUser) {
        const { doc, setDoc } = require('./config.js');
        const userDocRef = doc(db, "users", currentUser.uid);
        
        if (immediate) {
            // Immediate save for plan changes - no debounce
            setDoc(userDocRef, { appData: appData }, { merge: true })
                .then(() => {
                    console.log('✅ Saved immediately to Firebase');
                })
                .catch(err => {
                    console.warn('⚠️ Firebase save failed (data saved locally):', err.message);
                });
        } else {
            // Debounced save for chapter toggles
            // Note: Debounce logic handled in caller
            setDoc(userDocRef, { appData: appData }, { merge: true })
                .then(() => {
                    console.log('✅ Saved to Firebase');
                })
                .catch(err => {
                    console.warn('⚠️ Firebase save failed (data saved locally):', err.message);
                });
        }
    }
}

/**
 * Toggle a single chapter's read status
 */
function toggleChapter(appData, id, event) {
    const prog = getProgress(appData);
    // Store timestamp when marking as read, false when unmarking
    const timestamp = prog[id] ? false : Date.now();
    prog[id] = timestamp;
    setProgress(appData, prog);
    
    return timestamp; // Return timestamp for further processing
}

/**
 * Mark multiple chapters as read (for daily plans with chapter ranges)
 */
function markChaptersAsRead(appData, bookName, chapters) {
    const prog = getProgress(appData);
    const timestamp = Date.now();
    
    // Mark all chapters in the range
    chapters.forEach(chapterNum => {
        const chapterId = `${bookName}-${chapterNum}`;
        prog[chapterId] = timestamp;
    });
    
    setProgress(appData, prog);
    return timestamp;
}

/**
 * Toggle all chapters in a book
 */
function toggleAllInBook(appData, activeBookIdx, val) {
    const book = bible[activeBookIdx];
    const prog = getProgress(appData);
    // Store timestamp when marking as read (val=true), false when clearing (val=false)
    const timestamp = val ? Date.now() : false;
    
    book.ch.forEach((_, i) => {
        const chapterId = `${book.name}-${i + 1}`;
        prog[chapterId] = timestamp;
    });
    
    setProgress(appData, prog);
}

/**
 * Calculate reading statistics
 */
function calculateStats(appData) {
    const currentProg = getProgress(appData);
    
    // Calculate word counts
    let totalWords = 0;
    let readWords = 0;
    let otWords = 0;
    let otReadWords = 0;
    let ntWords = 0;
    let ntReadWords = 0;
    
    bible.forEach(book => {
        book.ch.forEach((wordCount, i) => {
            const chapterId = `${book.name}-${i + 1}`;
            const isRead = currentProg[chapterId];
            
            totalWords += wordCount;
            if (isRead) readWords += wordCount;
            
            if (book.testament === 'OT') {
                otWords += wordCount;
                if (isRead) otReadWords += wordCount;
            } else {
                ntWords += wordCount;
                if (isRead) ntReadWords += wordCount;
            }
        });
    });
    
    // Calculate percentages
    const globalPercent = ((readWords / WORD_TOTALS.GLOBAL) * 100).toFixed(4);
    const otPercent = ((otReadWords / WORD_TOTALS.OT) * 100).toFixed(4);
    const ntPercent = ((ntReadWords / WORD_TOTALS.NT) * 100).toFixed(4);
    
    // Calculate chapter counts
    const totalChapters = bible.reduce((sum, b) => sum + b.ch.length, 0);
    const readChapters = Object.keys(currentProg).filter(k => currentProg[k]).length;
    
    return {
        readWords,
        totalWords,
        globalPercent,
        otWords,
        otReadWords,
        otPercent,
        ntWords,
        ntReadWords,
        ntPercent,
        totalChapters,
        readChapters
    };
}

/**
 * Update stats display in UI
 */
function updateStats(appData) {
    const stats = calculateStats(appData);
    
    // Update global stats
    const globalEl = document.getElementById('global-percent');
    if (globalEl) globalEl.innerText = stats.globalPercent + '%';
    
    const wordCountEl = document.getElementById('word-count');
    if (wordCountEl) wordCountEl.innerText = `${stats.readWords.toLocaleString()} / ${stats.totalWords.toLocaleString()} words`;
    
    const chapterCountEl = document.getElementById('chapter-count');
    if (chapterCountEl) chapterCountEl.innerText = `${stats.readChapters} / ${stats.totalChapters} chapters`;
    
    // Update testament-specific stats
    const otPercentEl = document.getElementById('ot-percent');
    if (otPercentEl) otPercentEl.innerText = stats.otPercent + '%';
    
    const ntPercentEl = document.getElementById('nt-percent');
    if (ntPercentEl) ntPercentEl.innerText = stats.ntPercent + '%';
}

export {
    saveProgress,
    toggleChapter,
    markChaptersAsRead,
    toggleAllInBook,
    calculateStats,
    updateStats
};
