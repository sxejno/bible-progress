        // --- VERSE OF THE DAY ---
        // Local verse list - no API needed, works offline
        const LOCAL_VERSES = [
            {
                "reference": "Psalm 119:105",
                "text": "Thy word is a lamp unto my feet, and a light unto my path.",
                "theme": "Guidance"
            },
            {
                "reference": "Proverbs 3:5",
                "text": "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
                "theme": "Trust"
            },
            {
                "reference": "Psalm 119:11",
                "text": "Thy word have I hid in mine heart, that I might not sin against thee.",
                "theme": "Devotion"
            },
            {
                "reference": "Psalm 19:7",
                "text": "The law of the LORD is perfect, converting the soul: the testimony of the LORD is sure, making wise the simple.",
                "theme": "Wisdom"
            },
            {
                "reference": "Psalm 23:1",
                "text": "The LORD is my shepherd; I shall not want.",
                "theme": "Trust"
            },
            {
                "reference": "Matthew 4:4",
                "text": "Man shall not live by bread alone, but by every word that proceedeth out of the mouth of God.",
                "theme": "Scripture Necessity"
            },
            {
                "reference": "Colossians 3:16",
                "text": "Let the word of Christ dwell in you richly in all wisdom; teaching and admonishing one another in psalms and hymns and spiritual songs, singing with grace in your hearts to the Lord.",
                "theme": "Indwelling Word"
            },
            {
                "reference": "James 1:22",
                "text": "But be ye doers of the word, and not hearers only, deceiving your own selves.",
                "theme": "Application"
            },
            {
                "reference": "Psalm 46:1",
                "text": "God is our refuge and strength, a very present help in trouble.",
                "theme": "Trust"
            },
            {
                "reference": "Proverbs 4:7",
                "text": "Wisdom is the principal thing; therefore get wisdom: and with all thy getting get understanding.",
                "theme": "Wisdom"
            },
            {
                "reference": "Acts 17:11",
                "text": "These were more noble than those in Thessalonica, in that they received the word with all readiness of mind, and searched the scriptures daily, whether those things were so.",
                "theme": "Study"
            },
            {
                "reference": "John 5:39",
                "text": "Search the scriptures; for in them ye think ye have eternal life: and they are they which testify of me.",
                "theme": "Christ in Scripture"
            },
            {
                "reference": "Isaiah 40:8",
                "text": "The grass withereth, the flower fadeth: but the word of our God shall stand for ever.",
                "theme": "Eternal Word"
            },
            {
                "reference": "Romans 10:17",
                "text": "So then faith cometh by hearing, and hearing by the word of God.",
                "theme": "Faith"
            },
            {
                "reference": "1 Peter 2:2",
                "text": "As newborn babes, desire the sincere milk of the word, that ye may grow thereby.",
                "theme": "Desire for the Word"
            }
        ];

        async function loadVerseOfDay() {
            const verseContent = document.getElementById('verse-content');

            try {
                // Pick a random verse from local list (no API needed - works offline!)
                const randomVerse = LOCAL_VERSES[Math.floor(Math.random() * LOCAL_VERSES.length)];

                // Display the verse directly from local data
                displayVerse(randomVerse.text, randomVerse.reference);

                /* COMMENTED OUT - OLD API CODE (kept for reference)
                // Pick a random popular verse
                const randomVerse = POPULAR_VERSES[Math.floor(Math.random() * POPULAR_VERSES.length)];

                // Fetch from bible-api.com (KJV version)
                const response = await fetch(`https://bible-api.com/${encodeURIComponent(randomVerse)}?translation=kjv`);

                if (!response.ok) {
                    throw new Error('Failed to fetch verse');
                }

                const data = await response.json();

                // Display the verse
                displayVerse(data.text, data.reference);
                */
            } catch (error) {
                console.error('Error loading verse of the day:', error);
                displayFallbackVerse();
            }
        }

        function displayVerse(text, reference) {
            const verseContent = document.getElementById('verse-content');

            // Clean up the verse text (remove extra whitespace and newlines)
            const cleanText = text.trim().replace(/\s+/g, ' ');

            // Fade out the old verse first
            verseContent.classList.remove('verse-fade-in');
            verseContent.classList.add('verse-fade-out');

            // After fade out completes, update content and fade in
            setTimeout(() => {
                verseContent.innerHTML = `
                    <div class="text-xs text-slate-400 italic leading-relaxed text-center">
                        "${cleanText}" <span class="text-slate-300 font-semibold">— ${reference}</span>
                    </div>
                `;

                verseContent.classList.remove('verse-fade-out');
                verseContent.classList.add('verse-fade-in');
            }, 2000);
        }

        function displayFallbackVerse() {
            displayVerse(
                'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
                'John 3:16'
            );
        }

        window.refreshVerseOfDay = function() {
            loadVerseOfDay();
        };

        // Auto-rotate verses every 15 seconds
        setInterval(() => {
            loadVerseOfDay();
        }, 15000);

        assignCategories();
        window.setTab(appData.defaultTab || 'PLAN');
        window.updateStats();
        updateProfileColor();
        checkFirstVisit();
        loadVerseOfDay();
