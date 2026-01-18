/**
 * plans.js
 *
 * Reading plan logic (Sequential, M'Cheyne, Horner, One Year)
 * Renders daily reading plans and tracks plan-specific progress
 */

import { bible, PLAN_HORNER, PLAN_MCHEYNE } from './data.js';
import { getProgress } from './state.js';
import { resetHornerDailyProgressIfNeeded, getHornerListForChapter, isHornerListComplete, getTodaysDate, getLocalDateString } from './state.js';

/**
 * Normalize book name from M'Cheyne plan format
 * Converts "Genesis 1" to { bookName: "Genesis", chapterStr: "1" }
 */
function normalizeBookName(name) {
    let base = name.split(':')[0];
    const parts = base.split(' ');
    const last = parts[parts.length - 1];
    let chapterStr = null;

    if (!isNaN(last) && !last.includes('-')) {
        chapterStr = parts.pop();
    } else if (last.includes('-')) {
        chapterStr = parts.pop();
    }

    let bookName = parts.join(' ');
    if (bookName === "SongOfSongs") bookName = "Song of Songs";
    if (bookName === "Psalm") bookName = "Psalms";
    bookName = bookName.replace(/(\d)([A-Za-z])/g, '$1 $2');

    return { bookName, chapterStr };
}

/**
 * Get array of chapter numbers from string (e.g., "1-3" -> [1, 2, 3])
 */
function getChaptersFromStr(str) {
    if (!str) return [];
    if (str.includes('-')) {
        const [start, end] = str.split('-').map(Number);
        const arr = [];
        for (let i = start; i <= end; i++) arr.push(i);
        return arr;
    }
    return [parseInt(str)];
}

/**
 * Render the daily plan based on the active plan type
 */
function renderDailyPlan(appData, activePlan) {
    const list = document.getElementById('daily-plan-list');
    const footerMsg = document.getElementById('plan-footer-msg');
    const descBox = document.getElementById('plan-description-box');
    const currentProg = getProgress(appData);

    list.innerHTML = '';
    footerMsg.innerText = '';

    let nextChapters = [];
    let descText = "";

    if (activePlan === 'SEQUENTIAL') {
        descText = "<strong>Canonical:</strong> Genesis to Revelation. Next 3 unread chapters.";
        renderSequentialPlan(nextChapters, currentProg);
    } else if (activePlan === 'ONE_YEAR') {
        descText = "<strong>One Year:</strong> 3 OT + 1 NT chapters daily.";
        renderOneYearPlan(nextChapters, currentProg, footerMsg);
    } else if (activePlan === 'MCHEYNE') {
        descText = "<strong>M'Cheyne:</strong> 4 chapters daily. NT twice, OT once per year.";
        renderMcheynePlan(nextChapters, currentProg, footerMsg);
    } else if (activePlan === 'HORNER') {
        descText = "<strong>Horner:</strong> 1 chapter from each of 10 rotating lists.";
        renderHornerPlan(appData, nextChapters, currentProg);
    }

    // Update description
    if (descBox) {
        descBox.innerHTML = descText;
        descBox.classList.remove('hidden');
    }

    // Render chapter cards
    if (nextChapters.length > 0) {
        nextChapters.forEach(ch => {
            const card = createChapterCard(ch);
            list.appendChild(card);
        });
    }
}

/**
 * Render Sequential plan (Genesis -> Revelation)
 */
function renderSequentialPlan(nextChapters, currentProg) {
    let found = 0;
    const target = 3;

    for (let b = 0; b < bible.length; b++) {
        const book = bible[b];
        for (let c = 0; c < book.ch.length; c++) {
            if (!currentProg[`${book.name}-${c + 1}`]) {
                nextChapters.push({
                    book: book.name,
                    chapter: c + 1,
                    chapters: [c + 1],
                    words: book.ch[c],
                    label: `${book.name} ${c + 1}`
                });
                found++;
                if (found >= target) break;
            }
        }
        if (found >= target) break;
    }
}

/**
 * Render One Year plan (3 OT + 1 NT daily)
 */
function renderOneYearPlan(nextChapters, currentProg, footerMsg) {
    // Find next 3 unread OT chapters
    let otFound = 0;
    for (let b = 0; b < bible.length; b++) {
        const book = bible[b];
        if (book.testament !== 'OT') continue;
        for (let c = 0; c < book.ch.length; c++) {
            if (!currentProg[`${book.name}-${c + 1}`]) {
                nextChapters.push({
                    book: book.name,
                    chapter: c + 1,
                    chapters: [c + 1],
                    words: book.ch[c],
                    label: `${book.name} ${c + 1}`,
                    badge: "Old Testament"
                });
                otFound++;
                if (otFound >= 3) break;
            }
        }
        if (otFound >= 3) break;
    }

    // Find next 1 unread NT chapter
    let ntFound = 0;
    for (let b = 0; b < bible.length; b++) {
        const book = bible[b];
        if (book.testament !== 'NT') continue;
        for (let c = 0; c < book.ch.length; c++) {
            if (!currentProg[`${book.name}-${c + 1}`]) {
                nextChapters.push({
                    book: book.name,
                    chapter: c + 1,
                    chapters: [c + 1],
                    words: book.ch[c],
                    label: `${book.name} ${c + 1}`,
                    badge: "New Testament"
                });
                ntFound++;
                if (ntFound >= 1) break;
            }
        }
        if (ntFound >= 1) break;
    }

    const totalChaptersRead = Object.keys(currentProg).filter(k => currentProg[k]).length;
    const totalChapters = bible.reduce((sum, b) => sum + b.ch.length, 0);
    const daysElapsed = Math.ceil(totalChaptersRead / 4);
    footerMsg.innerText = `Approximately Day ${daysElapsed} of 365 • ${totalChapters - totalChaptersRead} chapters remaining`;
}

/**
 * Render M'Cheyne plan (4 chapters daily)
 */
function renderMcheynePlan(nextChapters, currentProg, footerMsg) {
    let currentDay = null;

    for (let i = 0; i < PLAN_MCHEYNE.length; i++) {
        const day = PLAN_MCHEYNE[i];
        let allRead = true;

        for (let r of day.r) {
            const { bookName, chapterStr } = normalizeBookName(r);
            const appBook = bible.find(b => b.name === bookName);
            if (!appBook) continue;

            const chs = getChaptersFromStr(chapterStr);
            for (let c of chs) {
                if (!currentProg[`${appBook.name}-${c}`]) {
                    allRead = false;
                    break;
                }
            }
            if (!allRead) break;
        }

        if (!allRead) {
            currentDay = day;
            break;
        }
    }

    if (!currentDay) return;

    footerMsg.innerText = `M'Cheyne Day ${currentDay.d} of 365`;

    currentDay.r.forEach((refStr, idx) => {
        const { bookName, chapterStr } = normalizeBookName(refStr);
        const appBook = bible.find(b => b.name === bookName);
        if (appBook) {
            const chs = getChaptersFromStr(chapterStr);
            const firstCh = chs[0];
            let isRead = true;
            chs.forEach(c => {
                if (!currentProg[`${appBook.name}-${c}`]) isRead = false;
            });

            const type = idx < 2 ? "Family" : "Secret";

            nextChapters.push({
                book: appBook.name,
                chapter: firstCh,
                chapters: chs,
                words: appBook.ch[firstCh - 1] * chs.length,
                label: refStr,
                badge: type,
                isComplete: isRead
            });
        }
    });
}

/**
 * Render Horner plan (10 rotating lists)
 */
function renderHornerPlan(appData, nextChapters, currentProg) {
    resetHornerDailyProgressIfNeeded(appData);
    const todayStr = getTodaysDate();

    PLAN_HORNER.forEach((listBooks, listIdx) => {
        const isListCompleteToday = isHornerListComplete(appData, listIdx);

        if (isListCompleteToday) {
            // List is complete today - find the chapter that was read TODAY
            for (let bName of listBooks) {
                const appBook = bible.find(b => b.name === bName);
                if (!appBook) continue;

                for (let c = 0; c < appBook.ch.length; c++) {
                    const chapterId = `${appBook.name}-${c + 1}`;
                    const timestamp = currentProg[chapterId];

                    if (timestamp && getLocalDateString(timestamp) === todayStr) {
                        nextChapters.push({
                            book: appBook.name,
                            chapter: c + 1,
                            chapters: [c + 1],
                            words: appBook.ch[c],
                            label: `${appBook.name} ${c + 1}`,
                            badge: `List ${listIdx + 1}`,
                            isComplete: true
                        });
                        break;
                    }
                }
            }
        } else {
            // Find next unread chapter in this list
            for (let bName of listBooks) {
                const appBook = bible.find(b => b.name === bName);
                if (!appBook) continue;

                for (let c = 0; c < appBook.ch.length; c++) {
                    const chapterId = `${appBook.name}-${c + 1}`;
                    if (!currentProg[chapterId]) {
                        nextChapters.push({
                            book: appBook.name,
                            chapter: c + 1,
                            chapters: [c + 1],
                            words: appBook.ch[c],
                            label: `${appBook.name} ${c + 1}`,
                            badge: `List ${listIdx + 1}`,
                            isComplete: false
                        });
                        break;
                    }
                }
            }
        }
    });
}

/**
 * Create a chapter card DOM element
 */
function createChapterCard(chapterData) {
    const card = document.createElement('div');
    card.className = 'bg-white/5 rounded-xl p-4 border border-white/10';

    // Implementation would create the full card HTML
    // This is a simplified version
    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h3 class="text-lg font-bold">${chapterData.label}</h3>
                <p class="text-sm text-slate-400">${chapterData.words} words</p>
            </div>
            ${chapterData.badge ? `<span class="badge">${chapterData.badge}</span>` : ''}
        </div>
    `;

    return card;
}

export {
    normalizeBookName,
    getChaptersFromStr,
    renderDailyPlan,
    renderSequentialPlan,
    renderOneYearPlan,
    renderMcheynePlan,
    renderHornerPlan
};
