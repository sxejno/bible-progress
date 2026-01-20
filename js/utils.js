        // --- HASH-BASED COLOR GENERATOR ---
        window.stringToColor = function(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash % 360);
            return {
                bg: `hsl(${hue}, 70%, 92%)`,
                border: `hsl(${hue}, 50%, 70%)`,
                text: `hsl(${hue}, 60%, 35%)`,
                solid: `hsl(${hue}, 65%, 55%)`
            };
        }

        // --- SANITIZE PROFILE NAME (ALPHANUMERIC ONLY, MAX 20 CHARS) ---
        window.sanitizeProfileName = function(name) {
            const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
            return cleaned;
        }

        // --- VALIDATE URL (MUST BE HTTPS) ---
        window.isValidHttpsUrl = function(urlString) {
            try {
                const url = new URL(urlString);
                return url.protocol === 'https:';
            } catch (e) {
                return false;
            }
        }

        // --- VALIDATE APP DATA ---
        window.validateAppData = function(data) {
            if(!data || typeof data !== 'object') return false;
            if(!data.profiles || typeof data.profiles !== 'object') return false;
            // Must have at least one profile
            if(Object.keys(data.profiles).length === 0) return false;
            // activeProfileId should be a string (but doesn't need to exist in profiles - we'll fix that in migration)
            if(!data.activeProfileId || typeof data.activeProfileId !== 'string') return false;
            // Validate each profile contains valid chapter data
            for(const profileName in data.profiles) {
                const profile = data.profiles[profileName];
                if(typeof profile !== 'object') return false;
            }
            return true;
        }

        // Helper function to get Eastern Time date string (YYYY-MM-DD) from timestamp
        window.getLocalDateString = function(timestamp) {
            // Convert to Eastern Time (handles both EST and EDT automatically)
            const date = new Date(timestamp);
            const easternDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
            const year = easternDate.getFullYear();
            const month = String(easternDate.getMonth() + 1).padStart(2, '0');
            const day = String(easternDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // --- HORNER DAILY PROGRESS HELPERS ---
        window.getTodaysDate = () => getLocalDateString(Date.now());

        window.resetHornerDailyProgressIfNeeded = () => {
            const today = getTodaysDate();
            const profileId = appData.activeProfileId;

            // Ensure the profile has hornerDailyProgress initialized
            if(!appData.hornerDailyProgress[profileId]) {
                appData.hornerDailyProgress[profileId] = {
                    date: today,
                    completedLists: []
                };
            }

            // Reset if it's a new day
            if(appData.hornerDailyProgress[profileId].date !== today) {
                appData.hornerDailyProgress[profileId] = {
                    date: today,
                    completedLists: []
                };
            }
        };

        window.getHornerListForChapter = (chapterId) => {
            const [bookName] = chapterId.split('-');
            for(let i = 0; i < PLAN_HORNER.length; i++) {
                if(PLAN_HORNER[i].includes(bookName)) {
                    return i;
                }
            }
            return -1;
        };

        window.markHornerListComplete = (listIndex) => {
            resetHornerDailyProgressIfNeeded();
            const profileId = appData.activeProfileId;
            if(!appData.hornerDailyProgress[profileId].completedLists.includes(listIndex)) {
                appData.hornerDailyProgress[profileId].completedLists.push(listIndex);
            }
        };

        window.isHornerListComplete = (listIndex) => {
            resetHornerDailyProgressIfNeeded();
            const profileId = appData.activeProfileId;
            return appData.hornerDailyProgress[profileId].completedLists.includes(listIndex);
        };

