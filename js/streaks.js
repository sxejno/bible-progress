        // --- HEATMAP & STREAK FUNCTIONS ---

        function updateHeaderStreakBadge() {
            const badge = document.getElementById('header-streak-badge');
            const countEl = document.getElementById('header-streak-count');
            const emojiEl = document.getElementById('header-streak-emoji');

            if(!badge || !countEl || !emojiEl) return;

            const streaks = calculateStreaks();
            const currentStreak = streaks.current;

            if(currentStreak > 0) {
                // Show badge
                badge.classList.remove('hidden');
                countEl.innerText = currentStreak;

                // Update emoji based on streak level
                if(currentStreak >= 365) emojiEl.innerText = '👑';
                else if(currentStreak >= 100) emojiEl.innerText = '💎';
                else if(currentStreak >= 30) emojiEl.innerText = '🔥';
                else if(currentStreak >= 7) emojiEl.innerText = '⚡';
                else emojiEl.innerText = '🔥';
            } else {
                // Hide badge when no streak
                badge.classList.add('hidden');
            }
        }

        function getReadingActivity() {
            // Returns a map of date string (YYYY-MM-DD) to chapter count
            const currentProg = getProgress();
            const activityMap = {};

            Object.keys(currentProg).forEach(chapterKey => {
                const timestamp = currentProg[chapterKey];
                if(timestamp && typeof timestamp === 'number') {
                    const dateStr = getLocalDateString(timestamp);
                    activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
                }
            });

            return activityMap;
        }

        function calculateStreaks() {
            const activityMap = getReadingActivity();
            const dates = Object.keys(activityMap).sort();

            if(dates.length === 0) {
                return { current: 0, longest: 0 };
            }

            let currentStreak = 0;
            let longestStreak = 0;
            let tempStreak = 0;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check if there's activity today or yesterday (using local timezone)
            const todayStr = getLocalDateString(today.getTime());
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = getLocalDateString(yesterday.getTime());

            const hasRecentActivity = activityMap[todayStr] || activityMap[yesterdayStr];

            // Calculate longest streak and current streak
            for(let i = 0; i < dates.length; i++) {
                if(i === 0) {
                    tempStreak = 1;
                } else {
                    const prevDate = new Date(dates[i-1]);
                    const currDate = new Date(dates[i]);
                    const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

                    if(diffDays === 1) {
                        tempStreak++;
                    } else {
                        tempStreak = 1;
                    }
                }

                longestStreak = Math.max(longestStreak, tempStreak);
            }

            // Calculate current streak (only if recent activity)
            if(hasRecentActivity) {
                let checkDate = new Date(today);
                currentStreak = 0;

                for(let i = 0; i < 365; i++) {
                    const checkStr = getLocalDateString(checkDate.getTime());
                    if(activityMap[checkStr]) {
                        currentStreak++;
                        checkDate.setDate(checkDate.getDate() - 1);
                    } else if(i > 0) {
                        // Allow one day grace (yesterday), but break if older
                        break;
                    } else {
                        // No activity today, check yesterday
                        checkDate.setDate(checkDate.getDate() - 1);
                    }
                }
            }

            return { current: currentStreak, longest: longestStreak };
        }

        function renderHeatmap() {
            const activityMap = getReadingActivity();
            const container = document.getElementById('heatmap-container');

            if(!container) return;

            // Find the earliest reading date
            const activityDates = Object.keys(activityMap);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let daysToShow = 365; // Default to 365 days

            if(activityDates.length > 0) {
                // Find earliest date
                const earliestDate = new Date(Math.min(...activityDates.map(d => new Date(d))));
                earliestDate.setHours(0, 0, 0, 0);

                // Calculate days between earliest and today
                const daysSinceFirst = Math.floor((today - earliestDate) / (1000 * 60 * 60 * 24)) + 1;

                // Use adaptive range: minimum 30 days, maximum 365 days
                daysToShow = Math.min(Math.max(daysSinceFirst, 30), 365);
            } else {
                // No reading activity yet, show last 30 days
                daysToShow = 30;
            }

            // Generate days based on adaptive range
            const days = [];
            for(let i = daysToShow - 1; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = getLocalDateString(date.getTime());
                const count = activityMap[dateStr] || 0;
                days.push({ date: dateStr, count, dayOfWeek: date.getDay() });
            }

            // Group by week
            const weeks = [];
            let currentWeek = [];

            // Pad start to align with Sunday
            const firstDayOfWeek = days[0].dayOfWeek;
            for(let i = 0; i < firstDayOfWeek; i++) {
                currentWeek.push({ empty: true });
            }

            days.forEach((day, idx) => {
                currentWeek.push(day);
                if(currentWeek.length === 7 || idx === days.length - 1) {
                    // Pad end of last week
                    while(currentWeek.length < 7) {
                        currentWeek.push({ empty: true });
                    }
                    weeks.push(currentWeek);
                    currentWeek = [];
                }
            });

            // Determine max count for statistics
            const maxCount = Math.max(...days.map(d => d.count), 1);

            // Generate HTML with improved color scale based on meaningful thresholds
            const getColor = (count) => {
                if(count === 0) return '#f1f5f9'; // slate-100 (no reading)
                if(count <= 2) return '#bfdbfe'; // blue-200 (light day: 1-2 chapters)
                if(count <= 5) return '#60a5fa'; // blue-400 (standard day: 3-5 chapters, M'Cheyne plan)
                if(count <= 10) return '#3b82f6'; // blue-500 (intensive day: 6-10 chapters)
                return '#1e40af'; // blue-800 (very intensive: 11+ chapters)
            };

            const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            let html = '<div class="flex gap-1">';

            // Day labels (S M T W T F S)
            html += '<div class="flex flex-col gap-1 text-[10px] text-slate-400 font-medium pr-1 justify-around" style="height: 105px;">';
            ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
                html += `<div style="height: 11px; line-height: 11px;">${day}</div>`;
            });
            html += '</div>';

            // Weeks
            html += '<div class="flex-1 relative"><div class="flex gap-1">';

            weeks.forEach((week, weekIdx) => {
                html += '<div class="flex flex-col gap-1">';
                week.forEach(day => {
                    if(day.empty) {
                        html += '<div style="width: 11px; height: 11px;"></div>';
                    } else {
                        const color = getColor(day.count);
                        const title = `${day.date}: ${day.count} chapter${day.count !== 1 ? 's' : ''}`;
                        html += `<div style="width: 11px; height: 11px; background-color: ${color}; border-radius: 2px;" title="${title}" class="cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"></div>`;
                    }
                });
                html += '</div>';
            });

            html += '</div></div></div>';

            // Legend with meaningful labels
            html += '<div class="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">';
            [
                { count: 0, label: 'None' },
                { count: 1, label: '1-2' },
                { count: 3, label: '3-5' },
                { count: 6, label: '6-10' },
                { count: 11, label: '11+' }
            ].forEach(({ count, label }) => {
                const color = getColor(count);
                html += `<div class="flex items-center gap-1.5">`;
                html += `<div style="width: 11px; height: 11px; background-color: ${color}; border-radius: 2px;" class="border border-slate-200"></div>`;
                html += `<span class="text-[10px] font-medium">${label}</span>`;
                html += `</div>`;
            });
            html += '</div>';

            container.innerHTML = html;
        }

        // --- STREAK ENHANCEMENT FUNCTIONS ---

        function updateStreakMilestone(currentStreak) {
            const milestones = [7, 14, 30, 50, 100, 180, 365];
            const progressEl = document.getElementById('streak-milestone-progress');
            const emojiEl = document.getElementById('streak-emoji');

            if(!progressEl || !emojiEl) return;

            if(currentStreak === 0) {
                progressEl.innerText = '';
                emojiEl.innerText = '💤';
                return;
            }

            // Find next milestone
            let nextMilestone = milestones.find(m => m > currentStreak);

            if(!nextMilestone) {
                // Past all milestones!
                progressEl.innerText = 'LEGENDARY! 🏆';
                emojiEl.innerText = '👑';
                return;
            }

            const daysToGo = nextMilestone - currentStreak;
            progressEl.innerText = `${daysToGo} to ${nextMilestone}-day`;

            // Update emoji based on streak level
            if(currentStreak >= 365) emojiEl.innerText = '👑';
            else if(currentStreak >= 100) emojiEl.innerText = '💎';
            else if(currentStreak >= 30) emojiEl.innerText = '🔥';
            else if(currentStreak >= 7) emojiEl.innerText = '⚡';
            else emojiEl.innerText = '🔥';
        }

        function updateStreakStatus(currentStreak, activityMap) {
            const banner = document.getElementById('streak-status-banner');
            if(!banner) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = getLocalDateString(today.getTime());
            const hasReadToday = activityMap[todayStr];

            // Determine status and message
            let html = '';

            if(currentStreak === 0) {
                // No active streak
                html = `
                    <div class="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 rounded-2xl border border-slate-200">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📖</span>
                            <div class="flex-1">
                                <div class="text-sm font-bold text-slate-700">Start your reading streak today!</div>
                                <div class="text-xs text-slate-500">"This book of the law shall not depart out of thy mouth" - Joshua 1:8</div>
                            </div>
                        </div>
                    </div>
                `;
            } else if(!hasReadToday && currentStreak > 0) {
                // At risk - haven't read today
                html = `
                    <div class="bg-gradient-to-r from-orange-50 to-amber-100/50 px-6 py-4 rounded-2xl border border-orange-200 animate-pulse">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">⚠️</span>
                            <div class="flex-1">
                                <div class="text-sm font-bold text-orange-800">Don't lose your ${currentStreak}-day streak!</div>
                                <div class="text-xs text-orange-600">Read at least one chapter today to keep it alive</div>
                            </div>
                        </div>
                    </div>
                `;
            } else if(hasReadToday && currentStreak >= 7) {
                // On fire!
                const messages = [
                    { min: 365, msg: "You're a Bible reading champion!", emoji: "👑", verse: "Blessed is he that readeth" },
                    { min: 100, msg: "Your dedication is incredible!", emoji: "💎", verse: "Continue thou in the things which thou hast learned" },
                    { min: 50, msg: "You're on fire!", emoji: "🔥", verse: "Study to shew thyself approved" },
                    { min: 30, msg: "You're building a powerful habit!", emoji: "⚡", verse: "Meditate therein day and night" },
                    { min: 14, msg: "Two weeks strong!", emoji: "💪", verse: "Thy word have I hid in mine heart" },
                    { min: 7, msg: "One week streak!", emoji: "🎯", verse: "Desire the sincere milk of the word" }
                ];

                const status = messages.find(m => currentStreak >= m.min) || messages[messages.length - 1];

                html = `
                    <div class="bg-gradient-to-r from-indigo-50 to-purple-100/50 px-6 py-4 rounded-2xl border border-indigo-200">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">${status.emoji}</span>
                            <div class="flex-1">
                                <div class="text-sm font-bold text-indigo-900">${status.msg}</div>
                                <div class="text-xs text-indigo-600">${status.verse}</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            if(html) {
                banner.innerHTML = html;
                banner.classList.remove('hidden');
            } else {
                banner.classList.add('hidden');
            }
        }

        function checkStreakMilestones(currentStreak) {
            // Check if just hit a milestone (need to track last checked streak)
            const lastStreak = parseInt(localStorage.getItem(`lastStreakCheck_${appData.activeProfileId}`)) || 0;
            localStorage.setItem(`lastStreakCheck_${appData.activeProfileId}`, currentStreak);

            const milestones = [
                { days: 7, title: "Week Warrior", emoji: "⚡", message: "Seven days of faithful reading!", verse: "Proverbs 2:4-5" },
                { days: 14, title: "Two Week Champion", emoji: "💪", message: "Two weeks of consistent devotion!", verse: "Psalm 1:2" },
                { days: 30, title: "Monthly Master", emoji: "🔥", message: "30 days! You've built a lasting habit!", verse: "Joshua 1:8" },
                { days: 50, title: "Persistent Reader", emoji: "📚", message: "50 days of dedication!", verse: "2 Timothy 2:15" },
