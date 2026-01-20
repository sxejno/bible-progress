        // --- UI ELEMENTS ---
        const logoutBtn = document.getElementById('logout-btn');
        const userProfile = document.getElementById('user-profile');
        const userPhoto = document.getElementById('user-photo');
        const syncStatus = document.getElementById('sync-status');
        const currentProfileName = document.getElementById('current-profile-name');
        const currentProfileDot = document.getElementById('current-profile-dot');

        const planSelector = document.getElementById('plan-selector');
        if(planSelector) planSelector.value = activePlan;


        function refreshUI() {
            currentProfileName.innerText = appData.activeProfileId;
            updateProfileColor();

            // Update active plan for current profile
            activePlan = appData.profilePlans[appData.activeProfileId] || 'MCHEYNE';
            const planSelector = document.getElementById('plan-selector');
            if(planSelector) planSelector.value = activePlan;

            if(window.activeTab === 'STATS') window.renderStatsPage();
            else if(window.activeTab === 'PLAN') window.renderDailyPlan();
            else if(window.activeTab === 'ABOUT') { }
            else { window.renderBookGrid(); window.renderSubdivisionStats(); }
            window.updateStats();
        }

        // --- OFFLINE/ONLINE DETECTION & TOAST NOTIFICATIONS ---
        function showToast(message, type = 'info') {
            // Remove any existing toasts
            const existingToast = document.getElementById('connection-toast');
            if(existingToast) existingToast.remove();

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

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if(toast && toast.parentNode) {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 300);
                }
            }, 5000);
        }

        function updateOfflineStatus() {
            if(!navigator.onLine) {
                if(syncStatus) {
                    syncStatus.className = "flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 border border-amber-200";
                    syncStatus.title = "Offline Mode";
                    syncStatus.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/><path d="M12 5v8l5.5 3.5-1 1.5-6.5-4V5z" fill="white" opacity="0.6"/></svg>';
                }
            } else if(currentUser) {
                if(syncStatus) {
                    syncStatus.className = "flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200";
                    syncStatus.title = "Cloud Synced";
                    syncStatus.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/><path d="M9 16.2L5.5 12.7l1.4-1.4L9 13.4l4.1-4.1 1.4 1.4z" fill="white"/></svg>';
                }
            } else {
                if(syncStatus) {
                    syncStatus.className = "flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400 border border-slate-200";
                    syncStatus.title = "Local Only";
                    syncStatus.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>';
                }
            }
        }

        // Offline event listener
        window.addEventListener('offline', () => {
            console.log('📡 Connection lost - entering offline mode');
            updateOfflineStatus();
            showToast('You are offline. All changes are saved locally and will sync when you\'re back online.', 'offline');
        });

        // Online event listener
        window.addEventListener('online', () => {
            console.log('✅ Connection restored - back online');
            updateOfflineStatus();
            showToast('Connection restored! Your progress is syncing to the cloud.', 'online');

            // Trigger a save to sync any pending changes
            if(currentUser) {
                window.saveProgress(true);
            }
        });

        // Check initial offline status on load
        if(!navigator.onLine) {
            console.log('📡 Starting in offline mode');
            updateOfflineStatus();
        }

        window.setTab = (t) => {
            activeTab = t;
            window.activeTab = t;
            ['ALL', 'PLAN', 'STATS', 'TOOLS', 'ABOUT', 'SETTINGS'].forEach(tab => {
                const el = document.getElementById(`tab-${tab.toLowerCase()}`);
                if(el) el.className = (tab === t) ? "px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all tab-active whitespace-nowrap" : "px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all text-slate-500 hover:text-indigo-600 whitespace-nowrap";
            });

            // Remove slide-in class from all views first, then hide them
            ['view-books', 'view-stats', 'view-plan', 'view-chapters', 'view-tools', 'view-about', 'view-settings'].forEach(v => {
                const view = document.getElementById(v);
                view.classList.remove('slide-in-right');
                view.classList.add('hidden');
            });

            // Show the selected view with slide-in animation
            if (t === 'STATS') {
                const view = document.getElementById('view-stats');
                view.classList.remove('hidden');
                setTimeout(() => view.classList.add('slide-in-right'), 10);
                window.renderStatsPage();
            }
            else if (t === 'PLAN') {
                const view = document.getElementById('view-plan');
                view.classList.remove('hidden');
                setTimeout(() => view.classList.add('slide-in-right'), 10);
                window.renderDailyPlan();
            }
            else if (t === 'TOOLS') {
                const view = document.getElementById('view-tools');
                view.classList.remove('hidden');
                setTimeout(() => view.classList.add('slide-in-right'), 10);
            }
            else if (t === 'ABOUT') {
                const view = document.getElementById('view-about');
                view.classList.remove('hidden');
                setTimeout(() => view.classList.add('slide-in-right'), 10);
            }
            else if (t === 'SETTINGS') {
                const view = document.getElementById('view-settings');
                view.classList.remove('hidden');
                setTimeout(() => view.classList.add('slide-in-right'), 10);
                window.renderProfileSyncSettings();
                updateDefaultTabSelector();
            }
            else {
                const view = document.getElementById('view-books');
                view.classList.remove('hidden');
                setTimeout(() => view.classList.add('slide-in-right'), 10);
                window.renderBookGrid();
                window.renderSubdivisionStats();
            }
        };

        // Debounce utility function
        const debounce = (func, delay) => {
            let timeoutId;
            return function(...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        };

        window.handleSearch = () => {
            searchQuery = document.getElementById('book-search').value.toLowerCase();

            // Calculate and display search results count
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

            window.renderBookGrid();
        };

        // Debounced version of handleSearch (300ms delay)
        window.debouncedHandleSearch = debounce(window.handleSearch, 300);

        window.openBook = (idx) => {
            activeBookIdx = idx;
            const book = bible[idx];
            ['view-books', 'view-stats', 'view-plan', 'view-tools', 'view-about', 'view-settings'].forEach(id => document.getElementById(id).classList.add('hidden'));
            document.getElementById('view-chapters').classList.remove('hidden');
            document.getElementById('active-book-title').innerText = book.name;
            const bookLabel = document.getElementById('book-label');
            bookLabel.innerText = book.cat;
            bookLabel.className = `${getCategoryLabelStyle(book.cat)} text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-sm`;
            window.renderChapterGrid();
            window.scrollTo(0,0);
        };

        window.showBooks = () => window.setTab('ALL');


        window.updateStats = () => {
            let totalRead = 0; let otRead = 0; let ntRead = 0; let finishedBooks = 0;
            const currentProg = getProgress();
            bible.forEach(book => {
                let bookChaptersRead = 0;
                book.ch.forEach((words, cIdx) => {
                    if (currentProg[`${book.name}-${cIdx+1}`]) {
                        totalRead += words;
                        if(book.testament === 'OT') otRead += words; else ntRead += words;
                        bookChaptersRead++;
                    }
                });
                if (bookChaptersRead === book.ch.length) finishedBooks++;
            });
            const getPerc = (val, max) => ((val / max) * 100).toFixed(2);
            document.getElementById('total-progress-bar').style.width = (totalRead / WORD_TOTALS.GLOBAL * 100) + '%';
            document.getElementById('total-percent').innerText = getPerc(totalRead, WORD_TOTALS.GLOBAL) + '%';
            document.getElementById('ot-percent').innerText = getPerc(otRead, WORD_TOTALS.OT) + '%';
            document.getElementById('ot-progress-bar').style.width = (otRead / WORD_TOTALS.OT * 100) + '%';
            document.getElementById('nt-percent').innerText = getPerc(ntRead, WORD_TOTALS.NT) + '%';
            document.getElementById('nt-progress-bar').style.width = (ntRead / WORD_TOTALS.NT * 100) + '%';
            document.getElementById('books-completed-stat').innerText = `${finishedBooks} OF 66 BOOKS READ`;

            // Update header streak badge
            updateHeaderStreakBadge();
        }

        window.toggleProgressView = () => {
            const totalSection = document.getElementById('total-progress-section');
            const testamentSection = document.getElementById('testament-progress-section');

            if (testamentSection.classList.contains('hidden')) {
                // Show testament view, hide total
                totalSection.classList.add('hidden');
                testamentSection.classList.remove('hidden');
            } else {
                // Show total view, hide testament
                totalSection.classList.remove('hidden');
                testamentSection.classList.add('hidden');
            }
        }

        window.goToStreakSection = () => {
            // Switch to STATS tab
            window.setTab('STATS');

            // Scroll to streak section after a brief delay to allow tab rendering
            setTimeout(() => {
                const streakElement = document.getElementById('current-streak');
                if (streakElement) {
                    streakElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }

        window.renderSubdivisionStats = () => {
            const cats = [...OT_CATS, ...NT_CATS];
            const container = document.getElementById('subdivision-bar');
            const currentProg = getProgress();
            let catStats = cats.map(c => {
                let totalW = 0, readW = 0;
                bible.filter(b => b.cat === c.name).forEach(b => {
                    b.ch.forEach((w, idx) => { totalW += w; if(currentProg[`${b.name}-${idx+1}`]) readW += w; });
                });
                const catId = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return { ...c, percent: (readW/totalW*100).toFixed(1), id: catId };
            });
            container.innerHTML = catStats.map(c => `<div onclick="window.scrollToCategory('${c.id}')" class="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wide ${c.style} cursor-pointer hover:shadow-md transition-shadow" title="Jump to ${c.name}"><span class="opacity-70">${c.name}</span><span>${c.percent}%</span></div>`).join('');
        }

        window.scrollToCategory = (catId) => {
            const element = document.getElementById(`category-${catId}`);
            if(element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
