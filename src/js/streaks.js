/**
 * streaks.js
 *
 * Reading streak tracking and heatmap visualization
 * Calculates consecutive reading days, displays heatmaps, and handles milestone celebrations
 */

import { getProgress, getLocalDateString } from './state.js';

/**
 * Get reading activity map (date -> chapter count)
 */
function getReadingActivity(appData) {
    const currentProg = getProgress(appData);
    const activityMap = {};

    Object.keys(currentProg).forEach(chapterKey => {
        const timestamp = currentProg[chapterKey];
        if (timestamp && typeof timestamp === 'number') {
            const dateStr = getLocalDateString(timestamp);
            activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
        }
    });

    return activityMap;
}

/**
 * Calculate reading streaks (current and longest)
 */
function calculateStreaks(appData) {
    const activityMap = getReadingActivity(appData);
    const dates = Object.keys(activityMap).sort();

    if (dates.length === 0) {
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
    for (let i = 0; i < dates.length; i++) {
        if (i === 0) {
            tempStreak = 1;
        } else {
            const prevDate = new Date(dates[i - 1]);
            const currDate = new Date(dates[i]);
            const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }
        }

        longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Calculate current streak (only if recent activity)
    if (hasRecentActivity) {
        let checkDate = new Date(today);
        currentStreak = 0;

        for (let i = 0; i < 365; i++) {
            const checkStr = getLocalDateString(checkDate.getTime());
            if (activityMap[checkStr]) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (i > 0) {
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

/**
 * Render the reading activity heatmap (GitHub-style)
 */
function renderHeatmap(appData) {
    const activityMap = getReadingActivity(appData);
    const container = document.getElementById('heatmap-container');

    if (!container) return;

    // Find the earliest reading date
    const activityDates = Object.keys(activityMap);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysToShow = 365; // Default to 365 days

    if (activityDates.length > 0) {
        // Find earliest date
        const earliestDate = new Date(Math.min(...activityDates.map(d => new Date(d))));
        earliestDate.setHours(0, 0, 0, 0);

        // Calculate days between earliest and today
        const daysSinceEarliest = Math.floor((today - earliestDate) / (1000 * 60 * 60 * 24));
        daysToShow = Math.min(365, daysSinceEarliest + 1);
    }

    // Create heatmap grid
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-7 gap-1';

    // Generate last N days
    for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getLocalDateString(date.getTime());

        const count = activityMap[dateStr] || 0;
        const cell = document.createElement('div');
        cell.className = 'w-3 h-3 rounded-sm';

        // Color intensity based on activity
        if (count === 0) {
            cell.className += ' bg-slate-100';
        } else if (count <= 2) {
            cell.className += ' bg-indigo-200';
        } else if (count <= 5) {
            cell.className += ' bg-indigo-400';
        } else {
            cell.className += ' bg-indigo-600';
        }

        cell.title = `${dateStr}: ${count} chapter${count !== 1 ? 's' : ''}`;
        grid.appendChild(cell);
    }

    container.appendChild(grid);
}

/**
 * Update the streak badge in the header
 */
function updateStreakBadge(appData) {
    const streaks = calculateStreaks(appData);
    const badge = document.getElementById('streak-badge');

    if (!badge) return;

    if (streaks.current > 0) {
        badge.classList.remove('hidden');
        const icon = getStreakIcon(streaks.current);
        const streakText = document.getElementById('streak-text');
        const streakIcon = document.getElementById('streak-icon');

        if (streakText) streakText.innerText = streaks.current;
        if (streakIcon) streakIcon.innerText = icon;
    } else {
        badge.classList.add('hidden');
    }
}

/**
 * Get streak icon based on current streak length
 */
function getStreakIcon(streak) {
    if (streak >= 365) return '👑'; // Crown
    if (streak >= 100) return '💎'; // Diamond
    if (streak >= 30) return '🔥'; // Fire
    if (streak >= 7) return '⚡'; // Lightning
    return '🔥'; // Fire (default)
}

/**
 * Check and celebrate milestones
 */
function checkMilestones(appData) {
    const streaks = calculateStreaks(appData);
    const milestones = [7, 14, 30, 50, 100, 180, 365];

    milestones.forEach(milestone => {
        if (streaks.current === milestone) {
            // Check if already celebrated
            if (!appData.celebratedMilestones) {
                appData.celebratedMilestones = {};
            }

            const key = `streak_${milestone}`;
            if (!appData.celebratedMilestones[key]) {
                celebrateMilestone(milestone);
                appData.celebratedMilestones[key] = Date.now();
                localStorage.setItem('kjv_v6_data', JSON.stringify(appData));
            }
        }
    });
}

/**
 * Display milestone celebration
 */
function celebrateMilestone(days) {
    const messages = {
        7: '🎉 7-Day Streak! You\'re building a habit!',
        14: '⭐ 2-Week Streak! Incredible consistency!',
        30: '🔥 30-Day Streak! You\'re on fire!',
        50: '💪 50-Day Streak! Unstoppable!',
        100: '💎 100-Day Streak! Diamond level!',
        180: '🏆 Half-Year Streak! Amazing dedication!',
        365: '👑 1-Year Streak! You\'re a champion!'
    };

    const message = messages[days] || `🎊 ${days}-Day Streak!`;

    // Show notification (implementation depends on UI framework)
    console.log('🎊 MILESTONE:', message);

    // Optional: Show confetti or modal
    // This would integrate with the UI's notification system
}

export {
    getReadingActivity,
    calculateStreaks,
    renderHeatmap,
    updateStreakBadge,
    getStreakIcon,
    checkMilestones,
    celebrateMilestone
};
