/**
 * state.js
 *
 * Application state management and data migration
 * Handles localStorage operations, data migrations, and app state initialization
 */

import { validateAppData } from './security.js';

// Helper function to get local date string (YYYY-MM-DD) from timestamp
function getLocalDateString(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Initialize and migrate app data from localStorage
 * Handles all data migrations and ensures data integrity
 */
function initializeAppData() {
    // Load saved data
    let savedData = null;
    try {
        const rawData = localStorage.getItem('kjv_v6_data');
        if (rawData) {
            savedData = JSON.parse(rawData);
            if (savedData && !validateAppData(savedData)) {
                console.warn('Invalid saved data, resetting to defaults');
                savedData = null;
            }
        }
    } catch (e) {
        console.error('Failed to parse saved data:', e);
        savedData = null;
    }

    // Load old progress (for migration from v5 and earlier)
    let oldProgress = null;
    try {
        const rawProgress = localStorage.getItem('kjv_v6_progress');
        if (rawProgress) {
            oldProgress = JSON.parse(rawProgress);
        }
    } catch (e) {
        console.error('Failed to parse old progress:', e);
        oldProgress = null;
    }
    let oldPlan = localStorage.getItem('kjv_v6_active_plan') || 'MCHEYNE';

    // Initialize appData with defaults or loaded data
    let appData = savedData || {
        profiles: { "Default": oldProgress || {} },
        activeProfileId: "Default",
        profilePlans: { "Default": oldPlan },
        defaultProfileId: "Default",
        profileSyncRules: {}
    };

    // Ensure data structure is valid
    if (!appData.profiles || Object.keys(appData.profiles).length === 0) {
        appData.profiles = { "Default": {} };
        appData.activeProfileId = "Default";
        appData.defaultProfileId = "Default";
    }

    // Migrate existing users to have profilePlans
    if (!appData.profilePlans) {
        appData.profilePlans = {};
        Object.keys(appData.profiles).forEach(name => {
            appData.profilePlans[name] = oldPlan;
        });
    }

    // Migrate existing users to have defaultProfileId
    if (!appData.defaultProfileId) {
        appData.defaultProfileId = appData.activeProfileId || Object.keys(appData.profiles)[0];
    }

    // Migrate existing users to have profileSyncRules
    if (!appData.profileSyncRules) {
        appData.profileSyncRules = {};
    }

    // Migrate existing users to have hornerDailyProgress (now per-profile)
    if (!appData.hornerDailyProgress) {
        appData.hornerDailyProgress = {};
    }
    // Migrate old global hornerDailyProgress to per-profile structure
    if (appData.hornerDailyProgress.date && appData.hornerDailyProgress.completedLists) {
        const oldData = { ...appData.hornerDailyProgress };
        appData.hornerDailyProgress = {};
        appData.hornerDailyProgress[appData.activeProfileId] = oldData;
    }
    // Ensure each profile has hornerDailyProgress initialized
    Object.keys(appData.profiles).forEach(profileId => {
        if (!appData.hornerDailyProgress[profileId]) {
            appData.hornerDailyProgress[profileId] = {
                date: new Date().toISOString().split('T')[0],
                completedLists: []
            };
        }
    });

    // Migrate existing users to have reading time settings
    if (appData.showReadingTime === undefined) {
        appData.showReadingTime = true;
    }
    if (!appData.wordsPerMinute) {
        appData.wordsPerMinute = 250; // Average adult reading speed
    }

    // On app load, use defaultProfileId if it exists and is valid
    if (appData.defaultProfileId && appData.profiles[appData.defaultProfileId]) {
        appData.activeProfileId = appData.defaultProfileId;
    }

    // Ensure active profile exists
    if (!appData.profiles[appData.activeProfileId]) {
        appData.activeProfileId = Object.keys(appData.profiles)[0];
    }

    // Ensure default profile exists, otherwise set it to active profile
    if (!appData.profiles[appData.defaultProfileId]) {
        appData.defaultProfileId = appData.activeProfileId;
    }

    // Migrate boolean progress values to timestamps (for heatmap/streak tracking)
    Object.keys(appData.profiles).forEach(profileName => {
        const profile = appData.profiles[profileName];
        Object.keys(profile).forEach(chapterKey => {
            if (profile[chapterKey] === true) {
                // Convert true to current timestamp (one-time migration)
                profile[chapterKey] = Date.now();
            }
        });
    });

    // If "Default" is active/default but other profiles exist, switch away from it
    const allProfileNames = Object.keys(appData.profiles);
    if (allProfileNames.length > 1 && appData.activeProfileId === 'Default') {
        const nonDefaultProfile = allProfileNames.find(name => name !== 'Default');
        if (nonDefaultProfile) {
            appData.activeProfileId = nonDefaultProfile;
            appData.defaultProfileId = nonDefaultProfile;
        }
    }

    // Ensure all profiles have a plan
    Object.keys(appData.profiles).forEach(name => {
        if (!appData.profilePlans[name]) {
            appData.profilePlans[name] = 'MCHEYNE';
        }
    });

    // Save any migration fixes to localStorage immediately
    localStorage.setItem('kjv_v6_data', JSON.stringify(appData));

    return appData;
}

/**
 * Helper function to get current progress for active profile
 */
function getProgress(appData) {
    return appData.profiles[appData.activeProfileId] || {};
}

/**
 * Helper function to set progress for active profile
 */
function setProgress(appData, newProg) {
    appData.profiles[appData.activeProfileId] = newProg;
}

/**
 * Horner Daily Progress Helpers
 */
const getTodaysDate = () => getLocalDateString(Date.now());

const resetHornerDailyProgressIfNeeded = (appData) => {
    const today = getTodaysDate();
    const profileId = appData.activeProfileId;

    // Ensure the profile has hornerDailyProgress initialized
    if (!appData.hornerDailyProgress[profileId]) {
        appData.hornerDailyProgress[profileId] = {
            date: today,
            completedLists: []
        };
    }

    // Reset if it's a new day
    if (appData.hornerDailyProgress[profileId].date !== today) {
        appData.hornerDailyProgress[profileId] = {
            date: today,
            completedLists: []
        };
    }
};

const getHornerListForChapter = (chapterId, PLAN_HORNER) => {
    const [bookName] = chapterId.split('-');
    for (let i = 0; i < PLAN_HORNER.length; i++) {
        if (PLAN_HORNER[i].includes(bookName)) {
            return i;
        }
    }
    return -1;
};

const markHornerListComplete = (appData, listIndex) => {
    resetHornerDailyProgressIfNeeded(appData);
    const profileId = appData.activeProfileId;
    if (!appData.hornerDailyProgress[profileId].completedLists.includes(listIndex)) {
        appData.hornerDailyProgress[profileId].completedLists.push(listIndex);
    }
};

const isHornerListComplete = (appData, listIndex) => {
    resetHornerDailyProgressIfNeeded(appData);
    const profileId = appData.activeProfileId;
    return appData.hornerDailyProgress[profileId].completedLists.includes(listIndex);
};

export {
    initializeAppData,
    getProgress,
    setProgress,
    getLocalDateString,
    getTodaysDate,
    resetHornerDailyProgressIfNeeded,
    getHornerListForChapter,
    markHornerListComplete,
    isHornerListComplete
};
