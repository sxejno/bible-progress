        function addPronunciationIndicators(text) {
            if (!text) return '';

            // Create a map for case-insensitive matching
            const pronunciationMap = {};
            Object.keys(PRONUNCIATION_GUIDE).forEach(word => {
                pronunciationMap[word.toLowerCase()] = {
                    original: word,
                    pronunciation: PRONUNCIATION_GUIDE[word]
                };
            });

            // Helper function to check if a word should get pronunciation help
            // Only matches capitalized words (proper nouns like Bible names/places)
            const shouldMatchPronunciation = (word) => {
                if (!word) return false;
                // Find the first letter in the word (skip apostrophes/hyphens at start)
                const firstLetter = word.match(/[a-zA-Z]/);
                if (!firstLetter) return false;
                // Only show pronunciation for capitalized words (proper nouns)
                return firstLetter[0] === firstLetter[0].toUpperCase();
            };

            // Split text into words while preserving punctuation and spaces
            let result = '';
            let currentWord = '';

            for (let i = 0; i < text.length; i++) {
                const char = text[i];

                // Check if character is a letter, hyphen, or apostrophe (part of a word)
                if (/[a-zA-Z'-]/.test(char)) {
                    currentWord += char;
                } else {
                    // We hit a non-word character, process the accumulated word
                    if (currentWord) {
                        const lowerWord = currentWord.toLowerCase();
                        const wordWithoutPunctuation = currentWord.replace(/['-]/g, '').toLowerCase();

                        // Only match if word is capitalized (proper noun)
                        if (shouldMatchPronunciation(currentWord)) {
                            // Check if word has pronunciation (try exact match first, then without punctuation)
                            if (pronunciationMap[lowerWord]) {
                                const { pronunciation } = pronunciationMap[lowerWord];
                                result += `<span class="pronunciation-word" aria-label="Pronunciation: ${pronunciation}">${escapeHtml(currentWord)}<span class="pronunciation-tooltip" aria-hidden="true">${escapeHtml(pronunciation)}</span></span>`;
                            } else if (pronunciationMap[wordWithoutPunctuation]) {
                                const { pronunciation } = pronunciationMap[wordWithoutPunctuation];
                                result += `<span class="pronunciation-word" aria-label="Pronunciation: ${pronunciation}">${escapeHtml(currentWord)}<span class="pronunciation-tooltip" aria-hidden="true">${escapeHtml(pronunciation)}</span></span>`;
                            } else {
                                result += escapeHtml(currentWord);
                            }
                        } else {
                            result += escapeHtml(currentWord);
                        }
                        currentWord = '';
                    }
                    result += char; // Add the non-word character
                }
            }

            // Process any remaining word at the end
            if (currentWord) {
                const lowerWord = currentWord.toLowerCase();
                const wordWithoutPunctuation = currentWord.replace(/['-]/g, '').toLowerCase();

                // Only match if word is capitalized (proper noun)
                if (shouldMatchPronunciation(currentWord)) {
                    if (pronunciationMap[lowerWord]) {
                        const { pronunciation } = pronunciationMap[lowerWord];
                        result += `<span class="pronunciation-word" aria-label="Pronunciation: ${pronunciation}">${escapeHtml(currentWord)}<span class="pronunciation-tooltip" aria-hidden="true">${escapeHtml(pronunciation)}</span></span>`;
                    } else if (pronunciationMap[wordWithoutPunctuation]) {
                        const { pronunciation } = pronunciationMap[wordWithoutPunctuation];
                        result += `<span class="pronunciation-word" aria-label="Pronunciation: ${pronunciation}">${escapeHtml(currentWord)}<span class="pronunciation-tooltip" aria-hidden="true">${escapeHtml(pronunciation)}</span></span>`;
                    } else {
                        result += escapeHtml(currentWord);
                    }
                } else {
                    result += escapeHtml(currentWord);
                }
            }

            return result;
        }

        // Load KJV Bible text from JSON file
        async function loadBibleText() {
            if (kjvBibleData) return kjvBibleData;  // Already loaded

            try {
                const response = await fetch('kjv_bible.json');

                if (!response.ok) {
                    throw new Error(`Failed to fetch Bible text: ${response.status} ${response.statusText}`);
                }

                kjvBibleData = await response.json();
                console.log('✅ KJV Bible text loaded');
                return kjvBibleData;
            } catch (error) {
                console.error('❌ Failed to load Bible text:', error);
                return null;
            }
        }

        // Open Bible reader modal with specific book and chapter
        window.openBibleReader = async (bookName, chapterNumber) => {
            const modal = document.getElementById('bible-reader-modal');
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';  // Prevent background scrolling

            currentReaderBook = bookName;
            currentReaderChapter = chapterNumber;

            // Show loading state
            document.getElementById('bible-reader-verses').innerHTML = `
                <div class="flex items-center justify-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            `;

            // Load Bible data if not already loaded
            if (!kjvBibleData) {
                const result = await loadBibleText();

                // If loading failed, show error message
                if (!result) {
                    document.getElementById('bible-reader-verses').innerHTML = `
                        <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
                            <svg class="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            <h3 class="text-xl font-bold text-slate-800 mb-2">Unable to Load Bible Text</h3>
                            <p class="text-sm text-slate-600 mb-6 max-w-md">
                                We couldn't load the Bible text. This might be due to a network issue or the file being unavailable.
                                Please check your internet connection and try again.
                            </p>
                            <button onclick="window.openBibleReader('${bookName}', ${chapterNumber})"
                                class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm hover:shadow-md">
                                Try Again
                            </button>
                        </div>
                    `;
                    return;
                }
            }

            // Render the chapter
            renderBibleChapter(bookName, chapterNumber);
        };

        // Close Bible reader modal
        window.closeBibleReader = () => {
            const modal = document.getElementById('bible-reader-modal');
            modal.classList.add('hidden');
            document.body.style.overflow = '';  // Restore scrolling
            currentReaderBook = null;
            currentReaderChapter = null;
        };

        // Navigate to previous/next chapter
        window.navigateBibleChapter = (direction) => {
            if (!currentReaderBook || !currentReaderChapter) return;

            const bookIndex = bible.findIndex(b => b.name === currentReaderBook);
            if (bookIndex === -1) return;

            const book = bible[bookIndex];
            const newChapter = currentReaderChapter + direction;

            // Check if we can navigate within this book
            if (newChapter >= 1 && newChapter <= book.ch.length) {
                renderBibleChapter(currentReaderBook, newChapter);
                currentReaderChapter = newChapter;
            } else if (direction === 1 && bookIndex < bible.length - 1) {
                // Move to next book, first chapter
                const nextBook = bible[bookIndex + 1];
                renderBibleChapter(nextBook.name, 1);
                currentReaderBook = nextBook.name;
                currentReaderChapter = 1;
            } else if (direction === -1 && bookIndex > 0) {
                // Move to previous book, last chapter
                const prevBook = bible[bookIndex - 1];
                const lastChapter = prevBook.ch.length;
                renderBibleChapter(prevBook.name, lastChapter);
                currentReaderBook = prevBook.name;
                currentReaderChapter = lastChapter;
            }
        };

        // Mark current chapter as read
        window.markCurrentChapterAsRead = () => {
            if (!currentReaderBook || !currentReaderChapter) return;

            const chapterId = `${currentReaderBook}-${currentReaderChapter}`;
            window.toggleChapter(chapterId);

            // Update the button state
            updateMarkReadButton();
        };

        // Render a Bible chapter in the reader
        function renderBibleChapter(bookName, chapterNumber) {
            if (!kjvBibleData) {
                console.error('Bible data not loaded');
                document.getElementById('bible-reader-verses').innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <svg class="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <h3 class="text-xl font-bold text-slate-800 mb-2">Bible Data Not Loaded</h3>
                        <p class="text-sm text-slate-600 mb-6 max-w-md">
                            The Bible text data is not available. Please refresh the page and try again.
                        </p>
                    </div>
                `;
                return;
            }

            // Update current position
            currentReaderBook = bookName;
            currentReaderChapter = chapterNumber;

            // Find the book and chapter in the JSON
            const bookData = kjvBibleData.find(b => b.book === bookName);
            if (!bookData) {
                console.error(`Book not found: ${bookName}`);
                document.getElementById('bible-reader-verses').innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <svg class="w-16 h-16 text-amber-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <h3 class="text-xl font-bold text-slate-800 mb-2">Book Not Found</h3>
                        <p class="text-sm text-slate-600 mb-6 max-w-md">
                            We couldn't find "${bookName}" in the Bible data.
                        </p>
                    </div>
                `;
                return;
            }

            const chapterData = bookData.chapters.find(c => c.chapter === chapterNumber);
            if (!chapterData) {
                console.error(`Chapter not found: ${bookName} ${chapterNumber}`);
                document.getElementById('bible-reader-verses').innerHTML = `
                    <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <svg class="w-16 h-16 text-amber-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <h3 class="text-xl font-bold text-slate-800 mb-2">Chapter Not Found</h3>
                        <p class="text-sm text-slate-600 mb-6 max-w-md">
                            We couldn't find ${bookName} chapter ${chapterNumber} in the Bible data.
                        </p>
                    </div>
                `;
                return;
            }

            // Update title
            document.getElementById('bible-reader-title').textContent = `${bookName} ${chapterNumber}`;

            // Get word count for this chapter
            const bookIndex = bible.findIndex(b => b.name === bookName);
            const wordCount = bible[bookIndex].ch[chapterNumber - 1];
            const readingTime = calculateReadingTime(wordCount);
            document.getElementById('bible-reader-subtitle').textContent = `King James Version • ${wordCount} words • ${readingTime}`;

            // Render verses
            let html = '<div class="space-y-3">';
            const memorizedForProfile = (appData.memorizedVerses && appData.memorizedVerses[appData.activeProfileId]) || [];
            chapterData.verses.forEach(verseData => {
                const verseId = `${bookName}-${chapterNumber}:${verseData.verse}`;
                const isMemorized = memorizedForProfile.some(v => v.id === verseId);
                const memorizedClass = isMemorized ? 'bg-amber-50 border-l-4 border-amber-400' : '';
                const memorizedIcon = isMemorized ? '<span class="text-amber-500 text-sm" title="Memorized">⭐</span>' : '';
                html += `
                    <div class="bible-verse flex gap-3 p-2 rounded-lg ${memorizedClass} cursor-pointer hover:bg-indigo-50 transition-colors group"
                         onclick="window.toggleVerseSelection('${verseId}', this)"
                         data-verse-id="${verseId}"
                         data-verse-text="${escapeHtml(verseData.text)}"
                         data-verse-ref="${bookName} ${chapterNumber}:${verseData.verse}">
                        <span class="verse-number text-sm font-bold text-indigo-600 flex items-center gap-1">
                            ${verseData.verse}
                            ${memorizedIcon}
                        </span>
                        <p class="flex-1 text-slate-800 leading-relaxed">${addPronunciationIndicators(verseData.text)}</p>
                        <button onclick="event.stopPropagation(); window.toggleMemorizeVerse('${verseId}', '${bookName} ${chapterNumber}:${verseData.verse}', \`${verseData.text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)"
                                class="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg ${isMemorized ? 'text-amber-500 hover:bg-amber-100' : 'text-slate-400 hover:bg-slate-100'}"
                                title="${isMemorized ? 'Remove from memorization' : 'Add to memorization'}">
                            ${isMemorized ? '⭐' : '☆'}
                        </button>
                    </div>
                `;
            });
            html += '</div>';

            document.getElementById('bible-reader-verses').innerHTML = html;

            // Scroll to top
            document.getElementById('bible-reader-verses').scrollTop = 0;

            // Update navigation buttons
            updateNavigationButtons();

            // Update mark as read button
            updateMarkReadButton();
        }

        // Update navigation button states
        function updateNavigationButtons() {
            const bookIndex = bible.findIndex(b => b.name === currentReaderBook);
            const book = bible[bookIndex];

            const prevBtn = document.getElementById('bible-reader-prev');
            const nextBtn = document.getElementById('bible-reader-next');

            // Disable previous if at Genesis 1
            if (bookIndex === 0 && currentReaderChapter === 1) {
                prevBtn.disabled = true;
                prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                prevBtn.disabled = false;
                prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }

            // Disable next if at Revelation 22
            if (bookIndex === bible.length - 1 && currentReaderChapter === book.ch.length) {
                nextBtn.disabled = true;
                nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                nextBtn.disabled = false;
                nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }

        // Update mark as read button state
        function updateMarkReadButton() {
            const chapterId = `${currentReaderBook}-${currentReaderChapter}`;
            const currentProg = getProgress();
            const isRead = currentProg[chapterId];

            const btn = document.getElementById('bible-reader-mark-read');
            if (isRead) {
                btn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    Marked as Read
                `;
                btn.classList.remove('bg-emerald-500', 'hover:bg-emerald-600');
                btn.classList.add('bg-slate-300', 'cursor-default');
            } else {
                btn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    Mark as Read
                `;
                btn.classList.remove('bg-slate-300', 'cursor-default');
                btn.classList.add('bg-emerald-500', 'hover:bg-emerald-600');
            }
        }

        // Add keyboard navigation for Bible reader
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('bible-reader-modal');
            if (modal.classList.contains('hidden')) return;

            if (e.key === 'Escape') {
                window.closeBibleReader();
            } else if (e.key === 'ArrowLeft') {
                window.navigateBibleChapter(-1);
            } else if (e.key === 'ArrowRight') {
                window.navigateBibleChapter(1);
            }
        });

        // Pre-load Bible text on page load (for offline use)
        window.addEventListener('load', () => {

        window.toggleMemorizeVerse = (verseId, verseRef, verseText) => {
            if(!appData.memorizedVerses) {
                appData.memorizedVerses = {};
            }
            if(!appData.memorizedVerses[appData.activeProfileId]) {
                appData.memorizedVerses[appData.activeProfileId] = [];
            }

            const memorizedList = appData.memorizedVerses[appData.activeProfileId];
            const existingIndex = memorizedList.findIndex(v => v.id === verseId);

            if(existingIndex >= 0) {
                // Remove from memorization
                memorizedList.splice(existingIndex, 1);
            } else {
                // Add to memorization
                memorizedList.push({
                    id: verseId,
                    ref: verseRef,
                    text: verseText,
                    addedDate: Date.now()
                });
            }

            window.saveProgress();
            // Re-render the chapter to update the UI
            if(currentReaderBook && currentReaderChapter) {
                renderBibleChapter(currentReaderBook, currentReaderChapter);
            }
        };

        window.toggleVerseSelection = (verseId, element) => {
            // Toggle selection styling
            element.classList.toggle('selected-verse');
            if(element.classList.contains('selected-verse')) {
                element.style.backgroundColor = '#dbeafe';
                element.style.borderLeft = '4px solid #3b82f6';
            } else {
                element.style.backgroundColor = '';
                element.style.borderLeft = '';
            }
        };

        window.showMemorizedVerses = () => {
            const memorizedList = (appData.memorizedVerses && appData.memorizedVerses[appData.activeProfileId]) || [];

            if(memorizedList.length === 0) {
                alert('📝 No verses memorized yet!\n\nOpen the Bible reader and click the ☆ icon next to any verse to add it to your memorization list.');
                return;
            }

            // Create a modal to show memorized verses
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl modal-in border border-white/50 flex flex-col" style="max-height: 85vh;">
                    <div class="flex justify-between items-center p-6 border-b border-slate-200">
                        <div>
                            <h2 class="text-2xl font-black text-slate-900 tracking-tight">Memorized Verses ⭐</h2>
                            <p class="text-sm text-slate-500 mt-1">${memorizedList.length} verse${memorizedList.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" class="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600" aria-label="Close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-6">
                        <div class="space-y-4">
                            ${memorizedList.map(verse => `
                                <div class="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 class="font-bold text-indigo-900">${verse.ref}</h3>
                                        <button onclick="window.toggleMemorizeVerse('${verse.id}', '${verse.ref}', \`${verse.text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`); this.closest('.fixed').remove(); window.showMemorizedVerses();"
                                                class="text-amber-500 hover:text-amber-700 transition-colors"
                                                title="Remove from memorization">
                                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                        </button>
                                    </div>
                                    <p class="text-slate-700 leading-relaxed">${verse.text}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        };

        const OT_CATS = [
            { name: "Pentateuch", count: 5, style: "bg-green-100 border-green-200 text-green-900", chartColor: "#16a34a" },
            { name: "History (OT)", count: 12, style: "bg-orange-100 border-orange-200 text-orange-900", chartColor: "#ea580c" },
            { name: "Wisdom", count: 5, style: "bg-indigo-100 border-indigo-200 text-indigo-900", chartColor: "#4f46e5" },
            { name: "Major Prophets", count: 5, style: "bg-red-100 border-red-200 text-red-900", chartColor: "#dc2626" },
            { name: "Minor Prophets", count: 12, style: "bg-cyan-100 border-cyan-200 text-cyan-900", chartColor: "#0891b2" }
        ];

        const NT_CATS = [
            { name: "Gospels", count: 4, style: "bg-emerald-100 border-emerald-200 text-emerald-900", chartColor: "#059669" },
            { name: "History (NT)", count: 1, style: "bg-amber-100 border-amber-200 text-amber-900", chartColor: "#d97706" },
            { name: "Pauline Epistles", count: 13, style: "bg-blue-100 border-blue-200 text-blue-900", chartColor: "#2563eb" },
            { name: "General Epistles", count: 8, style: "bg-teal-100 border-teal-200 text-teal-900", chartColor: "#0d9488" },
            { name: "Prophecy", count: 1, style: "bg-purple-100 border-purple-200 text-purple-900", chartColor: "#a855f7" }
        ];

        function assignCategories() {
