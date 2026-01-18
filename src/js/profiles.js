/**
 * profiles.js
 *
 * Profile management functions
 * Handles creation, deletion, renaming, and switching between user profiles
 */

import { stringToColor, sanitizeProfileName } from './security.js';
import { saveProgress } from './progress.js';

/**
 * Update profile color indicator
 */
function updateProfileColor(appData) {
    const color = stringToColor(appData.activeProfileId);
    const currentProfileDot = document.getElementById('current-profile-dot');
    if (currentProfileDot) {
        currentProfileDot.style.backgroundColor = color.solid;
    }
}

/**
 * Render the profile list dropdown
 */
function renderProfileList(appData) {
    const list = document.getElementById('profile-list');
    list.innerHTML = '';

    const allProfileNames = Object.keys(appData.profiles);
    const hasMultipleProfiles = allProfileNames.length > 1;

    // Hide "Default" profile from dropdown if other profiles exist
    const visibleProfiles = hasMultipleProfiles
        ? allProfileNames.filter(name => name !== 'Default')
        : allProfileNames;

    visibleProfiles.forEach(name => {
        const isActive = name === appData.activeProfileId;
        const isDefault = name === appData.defaultProfileId;
        const color = stringToColor(name);

        const itemDiv = document.createElement('div');
        itemDiv.className = `flex items-center justify-between group/item px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors ${isActive ? 'bg-indigo-50/50' : ''}`;

        const btn = document.createElement('button');
        btn.className = `text-left flex-1 text-sm font-bold ${isActive ? 'text-indigo-600' : 'text-slate-600'} flex items-center gap-2`;
        btn.onclick = () => switchProfile(appData, name);

        const dot = document.createElement('div');
        dot.className = 'w-3 h-3 rounded-full profile-dot flex-shrink-0';
        dot.style.backgroundColor = color.solid;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'truncate';
        nameSpan.textContent = name;

        btn.appendChild(dot);
        btn.appendChild(nameSpan);

        // Show "Active" badge for active profile
        if (isActive) {
            const badge = document.createElement('span');
            badge.className = 'ml-2 text-[8px] text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0';
            badge.textContent = 'Active';
            btn.appendChild(badge);
        }

        // Show "Default" badge for default profile
        if (isDefault && !isActive) {
            const defaultBadge = document.createElement('span');
            defaultBadge.className = 'ml-2 text-[8px] text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0';
            defaultBadge.textContent = 'Default';
            btn.appendChild(defaultBadge);
        }

        // Show both badges if profile is both active and default
        if (isActive && isDefault) {
            const defaultBadge = document.createElement('span');
            defaultBadge.className = 'ml-2 text-[8px] text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0';
            defaultBadge.textContent = 'Default';
            btn.appendChild(defaultBadge);
        }

        itemDiv.appendChild(btn);

        // Show rename button for all profiles
        const renameBtn = document.createElement('button');
        renameBtn.className = 'text-slate-300 hover:text-indigo-500 p-1 ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity';
        renameBtn.onclick = () => renameProfile(appData, name);
        renameBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>';
        renameBtn.title = 'Rename profile';
        itemDiv.appendChild(renameBtn);

        // Show "Set as Default" button for non-default profiles
        if (!isDefault) {
            const setDefaultBtn = document.createElement('button');
            setDefaultBtn.className = 'text-slate-300 hover:text-emerald-500 p-1 ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity';
            setDefaultBtn.onclick = () => setDefaultProfile(appData, name);
            setDefaultBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            setDefaultBtn.title = 'Set as default profile';
            itemDiv.appendChild(setDefaultBtn);
        }

        // Show delete button for all non-active profiles
        if (!isActive) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-slate-300 hover:text-red-500 p-1 ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity';
            deleteBtn.onclick = () => deleteProfile(appData, name);
            deleteBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
            deleteBtn.title = 'Delete profile';
            itemDiv.appendChild(deleteBtn);
        }

        list.appendChild(itemDiv);
    });
}

/**
 * Toggle profile menu
 */
function toggleProfileMenu(appData) {
    const menu = document.getElementById('profile-menu');
    menu.classList.toggle('hidden');
    if (!menu.classList.contains('hidden')) renderProfileList(appData);
}

/**
 * Switch to a different profile
 */
function switchProfile(appData, name, refreshUI) {
    appData.activeProfileId = name;
    saveProgress(appData, null, null, true); // Immediate save
    document.getElementById('profile-menu').classList.add('hidden');

    if (refreshUI) refreshUI();
}

/**
 * Create a new profile
 */
function createNewProfile(appData) {
    const rawName = prompt("Enter new profile name (alphanumeric only, max 20 characters):\nExamples: Family, Kids, Personal2024");
    if (!rawName || rawName.trim() === "") return;

    const sanitized = sanitizeProfileName(rawName);

    if (sanitized === "") {
        alert("Profile name must contain at least one alphanumeric character.");
        return;
    }

    if (appData.profiles[sanitized]) {
        alert(`Profile "${sanitized}" already exists!`);
        return;
    }

    if (Object.keys(appData.profiles).length >= 10) {
        alert("Maximum 10 profiles allowed.");
        return;
    }

    appData.profiles[sanitized] = {};
    appData.profilePlans[sanitized] = 'MCHEYNE';
    // Initialize hornerDailyProgress for new profile
    appData.hornerDailyProgress[sanitized] = {
        date: new Date().toISOString().split('T')[0],
        completedLists: []
    };

    switchProfile(appData, sanitized);
}

/**
 * Delete a profile
 */
function deleteProfile(appData, name) {
    if (name === appData.activeProfileId) {
        alert("⚠️ Cannot delete the active profile.\n\nPlease switch to another profile first.");
        return;
    }

    if (Object.keys(appData.profiles).length <= 1) {
        alert("⚠️ Cannot delete the last profile.\n\nYou must have at least one profile.");
        return;
    }

    const confirmMsg = `⚠️ DELETE PROFILE: "${name}"?\n\nThis will permanently delete:\n• All reading progress\n• Reading plan settings\n\nThis action CANNOT be undone.\n\nType the profile name to confirm:`;
    const userInput = prompt(confirmMsg);

    if (userInput === name) {
        delete appData.profiles[name];
        delete appData.profilePlans[name];
        delete appData.hornerDailyProgress[name];

        // If this was the default profile, set default to the active profile
        if (appData.defaultProfileId === name) {
            appData.defaultProfileId = appData.activeProfileId;
        }

        // Clean up sync rules involving this profile
        if (appData.profileSyncRules) {
            delete appData.profileSyncRules[name];
            Object.keys(appData.profileSyncRules).forEach(sourceProfile => {
                if (appData.profileSyncRules[sourceProfile] === name) {
                    delete appData.profileSyncRules[sourceProfile];
                }
            });
        }

        saveProgress(appData, null, null, true); // Immediate save
        renderProfileList(appData);
        alert(`✅ Profile "${name}" has been deleted.`);
    } else if (userInput !== null) {
        alert("❌ Profile name did not match. Deletion cancelled.");
    }
}

/**
 * Rename a profile
 */
function renameProfile(appData, oldName) {
    const rawName = prompt(`Enter new name for "${oldName}":\n(alphanumeric only, max 20 characters)`, oldName);
    if (!rawName || rawName.trim() === "") return;

    const newName = sanitizeProfileName(rawName);

    if (newName === "") {
        alert("Profile name must contain at least one alphanumeric character.");
        return;
    }

    if (newName === oldName) {
        return; // No change
    }

    if (appData.profiles[newName]) {
        alert(`Profile "${newName}" already exists!`);
        return;
    }

    // Rename the profile
    appData.profiles[newName] = appData.profiles[oldName];
    delete appData.profiles[oldName];

    // Rename in profilePlans if exists
    if (appData.profilePlans[oldName]) {
        appData.profilePlans[newName] = appData.profilePlans[oldName];
        delete appData.profilePlans[oldName];
    }

    // Update activeProfileId if this was the active profile
    if (appData.activeProfileId === oldName) {
        appData.activeProfileId = newName;
        const currentProfileName = document.getElementById('current-profile-name');
        if (currentProfileName) currentProfileName.innerText = newName;
        updateProfileColor(appData);
    }

    // Update defaultProfileId if this was the default profile
    if (appData.defaultProfileId === oldName) {
        appData.defaultProfileId = newName;
    }

    // Update sync rules if this profile is involved
    if (appData.profileSyncRules) {
        if (appData.profileSyncRules[oldName]) {
            appData.profileSyncRules[newName] = appData.profileSyncRules[oldName];
            delete appData.profileSyncRules[oldName];
        }
        Object.keys(appData.profileSyncRules).forEach(sourceProfile => {
            if (appData.profileSyncRules[sourceProfile] === oldName) {
                appData.profileSyncRules[sourceProfile] = newName;
            }
        });
    }

    saveProgress(appData, null, null, true); // Immediate save
    renderProfileList(appData);
    alert(`✅ Profile renamed from "${oldName}" to "${newName}".`);
}

/**
 * Set a profile as default
 */
function setDefaultProfile(appData, name) {
    if (!appData.profiles[name]) {
        alert("⚠️ Profile not found.");
        return;
    }

    appData.defaultProfileId = name;
    saveProgress(appData, null, null, true); // Immediate save
    renderProfileList(appData);
}

export {
    updateProfileColor,
    renderProfileList,
    toggleProfileMenu,
    switchProfile,
    createNewProfile,
    deleteProfile,
    renameProfile,
    setDefaultProfile
};
