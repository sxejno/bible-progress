        window.toggleChapter = (id, event) => {
            const prog = getProgress();
            // Store timestamp when marking as read, false when unmarking
            const timestamp = prog[id] ? false : Date.now();
            prog[id] = timestamp;
            setProgress(prog);

            // Show celebration animation when marking as read
            if (timestamp && event) {
                window.createConfetti(event);
            }

            // Apply cross-profile sync if rule exists and chapter is being marked as read
            if(timestamp && appData.profileSyncRules && appData.profileSyncRules[appData.activeProfileId]) {
                const targetProfile = appData.profileSyncRules[appData.activeProfileId];
                if(appData.profiles[targetProfile]) {
                    // Mark the same chapter in the target profile with the same timestamp
                    appData.profiles[targetProfile][id] = timestamp;
                }
            }

            // If using Horner plan and marking as read, track daily completion
            if(timestamp && activePlan === 'HORNER') {
                const listIndex = getHornerListForChapter(id);
                if(listIndex >= 0) {
                    markHornerListComplete(listIndex);
                }
            }

            window.saveProgress();
            window.renderChapterGrid();
        };

        // Mark multiple chapters as read (for daily plans with chapter ranges)
        window.markChaptersAsRead = (bookName, chapters, event) => {
            const prog = getProgress();
            const timestamp = Date.now();

            // Mark all chapters in the range
            chapters.forEach(chapterNum => {
                const chapterId = `${bookName}-${chapterNum}`;
                prog[chapterId] = timestamp;

                // Apply cross-profile sync if rule exists
                if(appData.profileSyncRules && appData.profileSyncRules[appData.activeProfileId]) {
                    const targetProfile = appData.profileSyncRules[appData.activeProfileId];
                    if(appData.profiles[targetProfile]) {
                        appData.profiles[targetProfile][chapterId] = timestamp;
                    }
                }

                // If using Horner plan, track daily completion
                if(activePlan === 'HORNER') {
                    const listIndex = getHornerListForChapter(chapterId);
                    if(listIndex >= 0) {
                        markHornerListComplete(listIndex);
                    }
                }
            });

            setProgress(prog);

            // Show celebration animation
            if (event) {
                window.createConfetti(event);
            }

            window.saveProgress();
            window.renderChapterGrid();
        };

        window.toggleAllInBook = (val) => {
            const book = bible[activeBookIdx];

            // Add confirmation for resetting book progress
            if (!val) {
                const readChapters = book.ch.filter((_, i) => getProgress()[`${book.name}-${i+1}`]).length;
                if (readChapters > 0) {
                    const confirmReset = confirm(
                        `⚠️ RESET ${book.name.toUpperCase()}?\n\n` +
                        `This will unmark ${readChapters} chapter${readChapters !== 1 ? 's' : ''} as unread.\n\n` +
                        `This action cannot be undone.\n\n` +
                        `Are you sure?`
                    );
                    if (!confirmReset) return;
                }
            }

            const prog = getProgress();
            // Store timestamp when marking as read (val=true), false when clearing (val=false)
            const timestamp = val ? Date.now() : false;
            book.ch.forEach((_, i) => {
                const chapterId = `${book.name}-${i+1}`;
                prog[chapterId] = timestamp;

                // Apply cross-profile sync if rule exists and chapters are being marked as read
                if(timestamp && appData.profileSyncRules && appData.profileSyncRules[appData.activeProfileId]) {
                    const targetProfile = appData.profileSyncRules[appData.activeProfileId];
                    if(appData.profiles[targetProfile]) {
                        appData.profiles[targetProfile][chapterId] = timestamp;
                    }
                }
            });
            setProgress(prog);
            window.saveProgress();
            window.renderChapterGrid();
