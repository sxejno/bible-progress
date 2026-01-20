        window.renderDailyPlan = () => {
            const list = document.getElementById('daily-plan-list');
            const footerMsg = document.getElementById('plan-footer-msg');
            const descBox = document.getElementById('plan-description-box');
            const currentProg = getProgress();
            
            list.innerHTML = '';
            footerMsg.innerText = '';
            
            let nextChapters = [];
            let descText = "";

            if (activePlan === 'SEQUENTIAL') {
                descText = "<strong>Canonical:</strong> Genesis to Revelation. Next 3 unread chapters.";
                let found = 0; const target = 3;
                for (let b = 0; b < bible.length; b++) {
                    const book = bible[b];
                    for (let c = 0; c < book.ch.length; c++) {
                        if (!currentProg[`${book.name}-${c+1}`]) {
                            nextChapters.push({ book: book.name, chapter: c + 1, chapters: [c + 1], words: book.ch[c], label: `${book.name} ${c+1}` });
                            found++;
                            if (found >= target) break;
                        }
                    }
                    if (found >= target) break;
                }
                if (nextChapters.length === 0) { list.innerHTML = `<div class="text-center p-8 bg-white/10 rounded-2xl font-bold text-lg">🎉 You have finished the entire Bible!</div>`; return; }
            }

            else if (activePlan === 'ONE_YEAR') {
                descText = "<strong>One Year:</strong> 3 OT + 1 NT chapters daily.";

                // Find next 3 unread OT chapters
                let otFound = 0;
                for (let b = 0; b < bible.length; b++) {
                    const book = bible[b];
                    if (book.testament !== 'OT') continue;
                    for (let c = 0; c < book.ch.length; c++) {
                        if (!currentProg[`${book.name}-${c+1}`]) {
                            nextChapters.push({
                                book: book.name,
                                chapter: c + 1,
                                chapters: [c + 1],
                                words: book.ch[c],
                                label: `${book.name} ${c+1}`,
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
                        if (!currentProg[`${book.name}-${c+1}`]) {
                            nextChapters.push({
                                book: book.name,
                                chapter: c + 1,
                                chapters: [c + 1],
                                words: book.ch[c],
                                label: `${book.name} ${c+1}`,
                                badge: "New Testament"
                            });
                            ntFound++;
                            if (ntFound >= 1) break;
                        }
                    }
                    if (ntFound >= 1) break;
                }

                if (nextChapters.length === 0) {
                    list.innerHTML = `<div class="text-center p-8 bg-white/10 rounded-2xl font-bold text-lg">🎉 You have finished the entire Bible!</div>`;
                    return;
                }

                const totalChaptersRead = Object.keys(currentProg).filter(k => currentProg[k]).length;
                const totalChapters = bible.reduce((sum, b) => sum + b.ch.length, 0);
                const daysElapsed = Math.ceil(totalChaptersRead / 4); // Approximate days (4 chapters/day)
                footerMsg.innerText = `Approximately Day ${daysElapsed} of 365 • ${totalChapters - totalChaptersRead} chapters remaining`;
            }

            else if (activePlan === 'MCHEYNE') {
                descText = "<strong>M'Cheyne:</strong> 4 chapters daily. NT twice, OT once per year.";
                let currentDay = null;
                
                for(let i=0; i<PLAN_MCHEYNE.length; i++) {
                    const day = PLAN_MCHEYNE[i];
                    let allRead = true;
                    for(let r of day.r) {
                        const { bookName, chapterStr } = normalizeBookName(r);
                        const appBook = bible.find(b => b.name === bookName);
                        if(!appBook) continue;
                        const chs = getChaptersFromStr(chapterStr);
                        for(let c of chs) {
                            if(!currentProg[`${appBook.name}-${c}`]) {
                                allRead = false;
                                break;
                            }
                        }
                        if(!allRead) break;
                    }
                    if(!allRead) {
                        currentDay = day;
                        break;
                    }
                }

                if(!currentDay) { list.innerHTML = `<div class="text-center p-8 bg-white/10 rounded-2xl font-bold text-lg">🎉 M'Cheyne Plan Completed!</div>`; return; }
                
                footerMsg.innerText = `M'Cheyne Day ${currentDay.d} of 365`;
                
                currentDay.r.forEach((refStr, idx) => {
                     const { bookName, chapterStr } = normalizeBookName(refStr);
                     const appBook = bible.find(b => b.name === bookName);
                     if(appBook) {
                         const chs = getChaptersFromStr(chapterStr);
                         const firstCh = chs[0];
                         let isRead = true;
                         chs.forEach(c => { if(!currentProg[`${appBook.name}-${c}`]) isRead = false; });
                         
                         const type = idx < 2 ? "Family" : "Secret";
                         
                         nextChapters.push({
                             book: appBook.name,
                             chapter: firstCh,
                             chapters: chs,
                             words: appBook.ch[firstCh-1] * chs.length,
                             label: refStr,
                             badge: type,
                             isComplete: isRead
                         });
                     }
                });
            }

            else if (activePlan === 'HORNER') {
                descText = "<strong>Horner:</strong> 1 chapter from each of 10 rotating lists. <a href='horner.html' target='_blank' class='inline-flex items-center gap-1 ml-2 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-200 border border-indigo-200' style='text-decoration: none;'><svg class='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'><path d='M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z'/></svg>Analytics</a>";
                resetHornerDailyProgressIfNeeded();
                const todayStr = getTodaysDate();

                PLAN_HORNER.forEach((listBooks, listIdx) => {
                    const isListCompleteToday = appData.hornerDailyProgress[appData.activeProfileId].completedLists.includes(listIdx);

                    let foundForList = false;

                    if(isListCompleteToday) {
                        // List is complete today - find the chapter that was read TODAY
                        for(let bName of listBooks) {
                            const appBook = bible.find(b => b.name === bName);
                            if(!appBook) continue;
                            for(let c=0; c<appBook.ch.length; c++) {
                                const chapterId = `${appBook.name}-${c+1}`;
                                const timestamp = currentProg[chapterId];

                                // Check if this chapter was read today
                                if(timestamp && getLocalDateString(timestamp) === todayStr) {
                                    nextChapters.push({
                                        book: appBook.name,
                                        chapter: c+1,
                                        chapters: [c+1],
                                        words: appBook.ch[c],
                                        label: `${appBook.name} ${c+1}`,
                                        badge: `List ${listIdx+1}`,
                                        isComplete: true  // This chapter was read today, show as complete
                                    });
                                    foundForList = true;
                                    break;
                                }
                            }
                            if(foundForList) break;
                        }
                    } else {
                        // List is NOT complete today - find the next unread chapter
                        for(let bName of listBooks) {
                            const appBook = bible.find(b => b.name === bName);
                            if(!appBook) continue;
                            for(let c=0; c<appBook.ch.length; c++) {
                                if(!currentProg[`${appBook.name}-${c+1}`]) {
                                    const chapterId = `${appBook.name}-${c+1}`;
                                    nextChapters.push({
                                        book: appBook.name,
                                        chapter: c+1,
                                        chapters: [c+1],
                                        words: appBook.ch[c],
                                        label: `${appBook.name} ${c+1}`,
                                        badge: `List ${listIdx+1}`,
                                        isComplete: false  // This is an unread chapter, show normally
                                    });
                                    foundForList = true;
                                    break;
                                }
                            }
                            if(foundForList) break;
                        }
                    }
                });
                const completedCount = appData.hornerDailyProgress[appData.activeProfileId].completedLists.length;
                footerMsg.innerText = `Professor Horner's System (${completedCount}/10 lists completed today)`;
            }

            else if (activePlan === 'FIVE_DAY') {
                descText = "<strong>Five-Day Plan:</strong> Read the entire Bible in one year, 5 days a week (weekends off!). <span class='inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold ml-2'>✨ Sustainable Pace</span><br><span class='text-xs opacity-90 mt-1 block'>Old Testament in chronological order • New Testament spread throughout the year</span>";

                // Get current day of week in Eastern Time (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
                const now = new Date();
                const easternDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                let dayOfWeek = easternDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

                // Map to plan days: Monday = 1, Tuesday = 2, ..., Friday = 5
                // On weekends (Sat/Sun), show Monday's reading
                let planDay = dayOfWeek;
                if(dayOfWeek === 0) planDay = 1; // Sunday -> show Monday
                else if(dayOfWeek === 6) planDay = 1; // Saturday -> show Monday
                else planDay = dayOfWeek; // Monday-Friday (1-5)

                // Find the current reading week position (first week with unread content)
                let currentWeek = null;
                for(let week of PLAN_FIVE_DAY.schedule) {
                    let allRead = true;
                    for(let reading of week.readings) {
                        for(let scriptureRef of reading.scriptures) {
                            const { bookName, chapterStr } = normalizeBookName(scriptureRef);
                            const appBook = bible.find(b => b.name === bookName);
                            if(!appBook) continue;
                            const chs = getChaptersFromStr(chapterStr);
                            for(let c of chs) {
                                if(!currentProg[`${appBook.name}-${c}`]) {
                                    allRead = false;
                                    break;
                                }
                            }
                            if(!allRead) break;
                        }
                        if(!allRead) break;
                    }
                    if(!allRead) {
                        currentWeek = week;
                        break;
                    }
                }

                if(!currentWeek) {
                    list.innerHTML = `<div class="text-center p-8 bg-white/10 rounded-2xl font-bold text-lg">🎉 Five-Day Plan Completed!</div>`;
                    return;
                }

                // Get the current day's reading
                const currentDayReading = currentWeek.readings.find(r => r.day === planDay);

                if(!currentDayReading) {
                    list.innerHTML = `<div class="text-center p-8 bg-white/10 rounded-2xl font-bold text-lg">No reading scheduled for today</div>`;
                    return;
                }

                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const todayName = dayNames[dayOfWeek];
                footerMsg.innerText = `Week ${currentWeek.week_number} of 52 • ${todayName} (Day ${planDay})`;

                // Show only today's reading
                currentDayReading.scriptures.forEach((scriptureRef) => {
                    const { bookName, chapterStr } = normalizeBookName(scriptureRef);
                    const appBook = bible.find(b => b.name === bookName);
                    if(appBook) {
                        const chs = getChaptersFromStr(chapterStr);
                        const firstCh = chs[0];
                        let isRead = true;
                        chs.forEach(c => { if(!currentProg[`${appBook.name}-${c}`]) isRead = false; });

                        // Calculate total words for this reading
                        let totalWordsForReading = 0;
                        chs.forEach(c => {
                            if(appBook.ch[c-1]) {
                                totalWordsForReading += appBook.ch[c-1];
                            }
                        });

                        nextChapters.push({
                            book: appBook.name,
                            chapter: firstCh,
                            chapters: chs,
                            words: totalWordsForReading,
                            label: scriptureRef,
                            badge: `Today`,
                            isComplete: isRead
                        });
                    }
                });
            }

            if(descBox) {
                descBox.innerHTML = descText;
                descBox.classList.remove('hidden');
            }

            // Calculate remaining reading time if enabled (only unread chapters)
            let totalWords = 0;
            if(appData.showReadingTime) {
                totalWords = nextChapters.reduce((sum, item) => sum + (item.isComplete ? 0 : (item.words || 0)), 0);
                const totalTime = calculateReadingTime(totalWords);
                // Add remaining reading time to footer message
                if(totalWords > 0) {
                    if(footerMsg.innerText) {
                        footerMsg.innerText += ` • ${totalTime} left`;
                    } else {
                        footerMsg.innerText = `${totalTime} left`;
                    }
                }
            }

            list.innerHTML = nextChapters.map(item => {
                const badgeHtml = item.badge ? `<span class="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ml-2 opacity-90">${item.badge}</span>` : '';
                const chapterId = `${item.book}-${item.chapter}`;

                const opacityClass = item.isComplete ? "opacity-60 grayscale" : "";
                const strikeClass = item.isComplete ? "line-through text-slate-400 decoration-slate-300" : "text-slate-800";
                const checkMark = item.isComplete ? `<span class="text-emerald-500 mr-2 font-black">✓</span>` : '';
                const bgClass = item.isComplete ? "bg-slate-50" : "bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:scale-[1.01] hover:shadow-md";

                // Calculate reading time and word count metadata for this chapter
                const metadataHtml = appData.showReadingTime ?
                    `<div class="text-[10px] font-bold text-slate-500 tracking-wide mt-1.5 flex items-center gap-2">
                        <span class="text-slate-400">~${item.words} words</span>
                        <span class="text-slate-300">•</span>
                        <span class="text-indigo-600">📖 ${calculateReadingTime(item.words)}</span>
                    </div>` :
                    `<div class="text-[10px] font-bold text-slate-400 tracking-wide mt-1.5">~${item.words} words</div>`;

                // Get chapter summary - normalize book name and chapter to match JSON format
                const summaryKey = `${item.book.toLowerCase().replace(/ /g, '-')}-${item.chapter}`;
                const summary = chapterSummaries[summaryKey];
                const summaryHtml = summary ?
                    `<div class="hidden sm:block mt-3 pt-3 border-t border-slate-200">
                        <div class="text-xs text-slate-600 leading-relaxed italic">"${summary}"</div>
                    </div>` : '';

                return `<button onclick="window.openBibleReader('${item.book}', ${item.chapter})" class="block ${bgClass} text-slate-800 p-5 rounded-2xl flex items-center justify-between transition-all duration-200 border border-slate-100 shadow-sm ${opacityClass} relative group w-full text-left cursor-pointer" aria-label="Read ${item.label}${item.isComplete ? ', completed' : ''}">
                    <div class="flex-1">
                        <div class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Read Now${badgeHtml}</div>
                        <div class="font-bold text-xl leading-tight ${strikeClass}">${checkMark}${item.label}</div>
                        ${metadataHtml}
                        ${summaryHtml}
                    </div>
                    ${!item.isComplete ? `
                    <button onclick="event.preventDefault(); event.stopPropagation(); window.markChaptersAsRead('${item.book}', ${JSON.stringify(item.chapters)}, event); window.renderDailyPlan();"
                        class="absolute top-2 right-2 bg-emerald-500/80 hover:bg-emerald-600 text-white p-2 sm:px-3 sm:py-2 rounded-lg text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1.5 z-10 opacity-0 group-hover:opacity-100"
                        title="Mark as Read" aria-label="Mark ${item.label} as read">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span class="hidden sm:inline">Mark Read</span>
                    </button>
                    ` : ''}
                    <div class="text-right flex items-center ${!item.isComplete ? 'opacity-0 group-hover:opacity-100' : ''}">
                        <div class="flex items-center gap-1">
                            <span class="text-xs font-bold text-indigo-500">Read</span>
                            <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                        </div>
                    </div>
                </button>`;
            }).join('');
        }


        window.renderBookGrid = () => {
            const grid = document.getElementById('book-grid');
            const currentProg = getProgress();
            const books = bible.filter(b => b.name.toLowerCase().includes(searchQuery));
            if (books.length === 0) { grid.innerHTML = `<div class="col-span-full text-center text-slate-400 font-bold py-12 bg-white/50 rounded-3xl border border-dashed border-slate-300">No books found.</div>`; return; }

            // Helper function to render a book card
            const renderBookCard = (book) => {
                const bookIdx = bible.indexOf(book);
                const readChapters = book.ch.filter((_, cIdx) => currentProg[`${book.name}-${cIdx + 1}`]).length;
                const readWords = book.ch.reduce((sum, words, cIdx) => {
                    return sum + (currentProg[`${book.name}-${cIdx + 1}`] ? words : 0);
                }, 0);
                const totalWords = book.ch.reduce((sum, words) => sum + words, 0);
                const progressPercent = (readWords / totalWords) * 100;
                const isComplete = readChapters === book.ch.length;
                const ringColor = isComplete ? 'ring-2 ring-emerald-400' : 'ring-1 ring-slate-100 hover:ring-indigo-300';
                return `<div onclick="window.openBook(${bookIdx})" class="book-card ${book.style} p-6 rounded-[1.5rem] cursor-pointer ${ringColor} bg-opacity-60 backdrop-blur-sm relative overflow-hidden" role="button" aria-label="Open ${book.name}, ${readChapters} of ${book.ch.length} chapters read" tabindex="0" onkeypress="if(event.key==='Enter'||event.key===' ')window.openBook(${bookIdx})">
                    <div class="flex justify-between items-start mb-4 relative z-10">
                        <h3 class="font-black text-sm uppercase tracking-tight leading-tight">${book.name}</h3>
                        ${isComplete ? '<span class="text-sm bg-white/80 rounded-full px-1.5 py-0.5 shadow-sm" aria-label="Book completed">✅</span>' : ''}
                    </div>
                    <div class="flex flex-col gap-2 relative z-10">
                         <span class="text-[10px] font-black opacity-60 uppercase tracking-wider">${readChapters} / ${book.ch.length} Ch</span>
                        <div class="w-full bg-white/60 h-2 rounded-full overflow-hidden" role="progressbar" aria-valuenow="${Math.round(progressPercent)}" aria-valuemin="0" aria-valuemax="100" aria-label="Book progress">
                            <div class="h-full transition-all duration-700 ${isComplete ? 'bg-emerald-500' : 'bg-current opacity-60'}" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                </div>`;
            };

            // Render with category dividers unless user is searching
            if (searchQuery === '') {
                const allCats = [...OT_CATS, ...NT_CATS];
                let html = '';

                allCats.forEach(cat => {
                    const categoryBooks = books.filter(b => b.cat === cat.name);
                    if (categoryBooks.length > 0) {
                        const catId = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        html += `<div id="category-${catId}" class="col-span-full mb-2 ${html ? 'mt-8 sm:mt-10' : ''}">
                            <div class="flex items-center gap-3 sm:gap-4">
                                <div class="h-0.5 flex-1 bg-gradient-to-r from-transparent via-slate-300 to-slate-400 rounded-full"></div>
                                <h2 class="text-sm sm:text-base font-black uppercase tracking-wider ${cat.style} px-4 sm:px-6 py-1.5 sm:py-2 rounded-full shadow-sm backdrop-blur-sm">
                                    ${cat.name}
                                </h2>
                                <div class="h-0.5 flex-1 bg-gradient-to-l from-transparent via-slate-300 to-slate-400 rounded-full"></div>
                            </div>
                        </div>`;
                        html += categoryBooks.map(renderBookCard).join('');
                    }
                });

                grid.innerHTML = html;
            } else {
                // When searching, show simple list
                grid.innerHTML = books.map(renderBookCard).join('');
            }
        }

        window.renderChapterGrid = () => {
            const book = bible[activeBookIdx];
            const grid = document.getElementById('chapter-grid');
            const currentProg = getProgress();
            let readInBook = 0;
            let readWordsInBook = 0;
            grid.innerHTML = book.ch.map((words, cIdx) => {
                const id = `${book.name}-${cIdx + 1}`;
                const isRead = currentProg[id];
                if (isRead) {
                    readInBook++;
                    readWordsInBook += words;
                }
                return `<div class="relative group">
                    <button onclick="window.toggleChapter('${id}', event)" class="h-20 w-full rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${isRead ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 scale-95' : 'bg-white text-slate-300 border-slate-100 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-lg hover:-translate-y-1'}" aria-label="Chapter ${cIdx + 1}, ${words} words, ${isRead ? 'read' : 'not read'}" aria-pressed="${isRead}">
                        <span class="text-xl sm:text-2xl font-black ${isRead ? 'text-white' : 'text-slate-700 group-hover:text-indigo-600'}">${cIdx + 1}</span>
                        <span class="text-[9px] font-bold uppercase tracking-wider ${isRead ? 'text-indigo-200' : 'text-slate-400'}">${words}w</span>
                    </button>
                    <button onclick="event.stopPropagation(); window.openBibleReader('${book.name}', ${cIdx + 1})" title="Read chapter" class="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm md:opacity-0 md:group-hover:opacity-100 z-10" aria-label="Read ${book.name} chapter ${cIdx + 1}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                    </button>
                </div>`;
            }).join('');
            const totalWordsInBook = book.ch.reduce((sum, words) => sum + words, 0);
            const unreadWordsInBook = totalWordsInBook - readWordsInBook;
            document.getElementById('book-inner-bar').style.width = (readWordsInBook / totalWordsInBook) * 100 + '%';

            // Calculate and display reading time estimate for remaining chapters
            const avgWordsPerMinute = appData.wordsPerMinute || 250;
            const minutesRemaining = Math.ceil(unreadWordsInBook / avgWordsPerMinute);
            let timeEstimate = '';
            let chaptersText = `${readInBook}/${book.ch.length} chapters`;

            if (unreadWordsInBook === 0) {
                timeEstimate = '✅ Complete!';
            } else if (minutesRemaining < 60) {
                timeEstimate = `⏱️ ~${minutesRemaining} min left`;
            } else {
                const hours = Math.floor(minutesRemaining / 60);
                const mins = minutesRemaining % 60;
                if (mins === 0) {
                    timeEstimate = `⏱️ ~${hours} hr left`;
                } else {
                    timeEstimate = `⏱️ ~${hours}h ${mins}m left`;
                }
            }

            document.getElementById('book-chapters-read').innerText = chaptersText;
            document.getElementById('book-time-left').innerText = timeEstimate;
            window.updateStats();
        }

        window.renderStatsPage = () => {
            const allCats = [...OT_CATS, ...NT_CATS];
            const dataset = []; const labels = []; const colors = []; let chartTotalRead = 0;
            const currentProg = getProgress();
            allCats.forEach(cat => {
                let catRead = 0; let catTotal = 0;
                bible.filter(b => b.cat === cat.name).forEach(b => {
                    b.ch.forEach((w, idx) => { catTotal += w; if (currentProg[`${b.name}-${idx+1}`]) catRead += w; });
                });
                dataset.push(catRead); labels.push(cat.name); colors.push(cat.chartColor); chartTotalRead += catRead;
                cat.stats = { read: catRead, total: catTotal, pct: (catTotal > 0 ? (catRead/catTotal*100).toFixed(1) : 0) };
            });
            const unreadWords = WORD_TOTALS.GLOBAL - chartTotalRead;
            dataset.push(unreadWords); labels.push("Unread"); colors.push("#cbd5e1");

            // Calculate chapter counts
            let totalChapters = 0;
            let chaptersRead = 0;
            bible.forEach(b => {
                totalChapters += b.ch.length;
                b.ch.forEach((w, idx) => {
                    if (currentProg[`${b.name}-${idx+1}`]) chaptersRead++;
                });
            });

            // Update or create main chart
            const ctx = document.getElementById('mainDonutChart').getContext('2d');
            if (mainChart) {
                // Update existing chart data
                mainChart.data.labels = labels;
                mainChart.data.datasets[0].data = dataset;
                mainChart.data.datasets[0].backgroundColor = colors;
                mainChart.update('none'); // 'none' mode = no animation for faster updates
            } else {
                // Create new chart only if it doesn't exist
                mainChart = new Chart(ctx, { type: 'doughnut', data: { labels: labels, datasets: [{ data: dataset, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }] }, options: { cutout: '75%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
            }
            document.getElementById('stats-page-total-percent').innerText = ((chartTotalRead / WORD_TOTALS.GLOBAL) * 100).toFixed(2) + '%';
            document.getElementById('stats-words-count').innerText = chartTotalRead.toLocaleString() + ' / ' + WORD_TOTALS.GLOBAL.toLocaleString() + ' words';
            document.getElementById('stats-chapters-count').innerText = chaptersRead + ' / ' + totalChapters + ' chapters';
            document.getElementById('legend-grid').innerHTML = allCats.map(cat => `<div class="flex items-center gap-3 text-sm p-2 bg-slate-50 rounded-lg"><div class="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" style="background-color: ${cat.chartColor}"></div><span class="text-slate-700 font-bold truncate">${cat.name}</span></div>`).join('');

            // Only rebuild mini chart HTML if number of categories changed
            const currentHTML = document.getElementById('category-stats-grid').innerHTML;
            const needsRebuild = miniCharts.length !== allCats.length;
            if (needsRebuild) {
                // Destroy old mini charts before rebuilding DOM
                miniCharts.forEach(c => c.destroy());
                miniCharts = [];
                document.getElementById('category-stats-grid').innerHTML = allCats.map((cat, i) => `<div class="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col items-center justify-center relative shadow-sm"><div class="h-24 w-24 relative mb-3"><canvas id="miniChart-${i}"></canvas><div class="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-400">${cat.stats.pct}%</div></div><span class="text-[10px] font-black uppercase text-center ${cat.style.split(' ')[2]}">${cat.name}</span></div>`).join('');
            }

            allCats.forEach((cat, i) => {
                // Update percentage text
                const percentDiv = document.querySelector(`#miniChart-${i}`).parentElement.querySelector('.text-xs');
                if (percentDiv) percentDiv.innerText = `${cat.stats.pct}%`;

                if (miniCharts[i]) {
                    // Update existing mini chart
                    miniCharts[i].data.datasets[0].data = [cat.stats.read, cat.stats.total - cat.stats.read];
                    miniCharts[i].update('none');
                } else {
                    // Create new mini chart
                    const miniCtx = document.getElementById(`miniChart-${i}`).getContext('2d');
                    miniCharts[i] = new Chart(miniCtx, { type: 'doughnut', data: { labels: ["Read", "Remaining"], datasets: [{ data: [cat.stats.read, cat.stats.total - cat.stats.read], backgroundColor: [cat.chartColor, "#cbd5e1"], borderWidth: 0 }] }, options: { cutout: '70%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, events: [] } });
                }
            });

            // Render heatmap and streak stats
            const streaks = calculateStreaks();
            const activityMap = getReadingActivity();

            // Update streak display
            document.getElementById('current-streak').innerText = `${streaks.current} day${streaks.current !== 1 ? 's' : ''}`;
            document.getElementById('longest-streak').innerText = `${streaks.longest} day${streaks.longest !== 1 ? 's' : ''}`;

            // Calculate additional statistics
            const yearStart = new Date(new Date().getFullYear(), 0, 1);
            let yearChapters = 0;
            let bestDayChapters = 0;
            let totalReadingDays = Object.keys(activityMap).length;
            let totalChaptersRead = 0;

            Object.keys(activityMap).forEach(dateStr => {
                const date = new Date(dateStr);
                if(date >= yearStart) {
                    yearChapters += activityMap[dateStr];
                }
                totalChaptersRead += activityMap[dateStr];
                bestDayChapters = Math.max(bestDayChapters, activityMap[dateStr]);
            });

            // Calculate averages
            const avgChaptersPerDay = totalReadingDays > 0 ? (totalChaptersRead / totalReadingDays).toFixed(1) : 0;

            // Update all stat cards
            document.getElementById('total-reading-days').innerText = totalReadingDays;
            document.getElementById('avg-chapters-day').innerText = `${avgChaptersPerDay} avg/day`;
            document.getElementById('best-day').innerText = `${bestDayChapters} ch`;
            document.getElementById('year-chapters').innerText = `${yearChapters} this year`;

            // Calculate and display time remaining statistics
            const wpm = appData.wordsPerMinute || 250;
            const unreadMinutes = Math.ceil(unreadWords / wpm);
            const unreadHours = (unreadMinutes / 60).toFixed(1);
            const unreadDays = Math.ceil(unreadMinutes / (60 * 2)); // Assuming 2 hours reading per day

            // Update time remaining displays if elements exist
            const timeRemainingEl = document.getElementById('time-remaining-stat');
            if (timeRemainingEl) {
                if (unreadWords === 0) {
                    timeRemainingEl.innerHTML = '🎉 <span class="text-emerald-600 font-black">Complete!</span>';
                } else if (unreadHours < 1) {
                    timeRemainingEl.innerHTML = `⏱️ ~${unreadMinutes} min left`;
                } else if (unreadHours < 24) {
                    timeRemainingEl.innerHTML = `⏱️ ~${unreadHours} hrs left`;
                } else {
                    timeRemainingEl.innerHTML = `⏱️ ~${Math.ceil(parseFloat(unreadHours) / 24)} days left`;
                }
            }

            // Generate playful guilt-trip comparisons
            const comparisonEl = document.getElementById('reading-comparison');
            if (comparisonEl && unreadWords > 0) {
                const comparisons = [
                    { activity: 'scrolling social media', emoji: '📱', avgMinPerDay: 145 },
                    { activity: 'watching Netflix', emoji: '📺', avgMinPerDay: 120 },
                    { activity: 'playing mobile games', emoji: '🎮', avgMinPerDay: 60 },
                    { activity: 'watching YouTube', emoji: '🎬', avgMinPerDay: 90 },
                    { activity: 'browsing the internet', emoji: '🌐', avgMinPerDay: 100 }
                ];

                const randomComparison = comparisons[Math.floor(Math.random() * comparisons.length)];
                const daysOfActivity = (unreadMinutes / randomComparison.avgMinPerDay).toFixed(1);

                let message = '';
                if (unreadMinutes < randomComparison.avgMinPerDay) {
                    message = `${randomComparison.emoji} You could finish in less time than you spend ${randomComparison.activity} today!`;
                } else if (daysOfActivity < 7) {
                    message = `${randomComparison.emoji} Finish in the time you'd spend ${randomComparison.activity} this week`;
                } else if (daysOfActivity < 30) {
                    message = `${randomComparison.emoji} That's ${daysOfActivity} days of ${randomComparison.activity}`;
                } else {
                    message = `${randomComparison.emoji} Trade ${Math.ceil(parseFloat(daysOfActivity) / 30)} month${Math.ceil(parseFloat(daysOfActivity) / 30) > 1 ? 's' : ''} of ${randomComparison.activity} for eternal wisdom`;
                }

                comparisonEl.innerHTML = `
                    <div class="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-4 text-center">
                        <div class="text-sm font-bold text-indigo-900">💡 Perspective Check</div>
                        <div class="text-xs text-indigo-500 mb-2 italic">Screen time vs Bible reading time</div>
                        <div class="text-xs text-indigo-700">${message}</div>
                    </div>
                `;
            }

            // Update streak milestone progress
            updateStreakMilestone(streaks.current);

            // Update streak status banner
            updateStreakStatus(streaks.current, activityMap);

            // Check for streak milestones and celebrate if just hit
            checkStreakMilestones(streaks.current);

            renderHeatmap();
        }
