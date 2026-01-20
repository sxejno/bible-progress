        // --- UPDATE PROFILE COLOR ---
        function updateProfileColor() {
            const color = stringToColor(appData.activeProfileId);
            if(currentProfileDot) {
                currentProfileDot.style.backgroundColor = color.solid;
            }
        }

        // --- HELPER FOR CURRENT PROGRESS ---
        function getProgress() {
            return appData.profiles[appData.activeProfileId] || {};
        }
        function setProgress(newProg) {
            appData.profiles[appData.activeProfileId] = newProg;
        }

        window.toggleProfileMenu = () => {
            const menu = document.getElementById('profile-menu');
            menu.classList.toggle('hidden');
            if(!menu.classList.contains('hidden')) renderProfileList();
        };

        function renderProfileList() {
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
                const color = stringToColor(name);

                const itemDiv = document.createElement('div');
                itemDiv.className = `flex items-center justify-between group/item px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors ${isActive ? 'bg-indigo-50/50' : ''}`;

                const btn = document.createElement('button');
                btn.className = `text-left flex-1 text-sm font-bold ${isActive ? 'text-indigo-600' : 'text-slate-600'} flex items-center gap-2`;
                btn.onclick = () => window.switchProfile(name);

                const dot = document.createElement('div');
                dot.className = 'w-3 h-3 rounded-full profile-dot flex-shrink-0';
                dot.style.backgroundColor = color.solid;

                const nameSpan = document.createElement('span');
                nameSpan.className = 'truncate';
                nameSpan.textContent = name;

                btn.appendChild(dot);
                btn.appendChild(nameSpan);

                // Show "Active" badge for active profile
                if(isActive) {
                    const badge = document.createElement('span');
                    badge.className = 'ml-2 text-[8px] text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0';
                    badge.textContent = 'Active';
                    btn.appendChild(badge);
                }

                // Show "Default" badge for default profile
                const isDefault = name === appData.defaultProfileId;
                if(isDefault && !isActive) {
                    const defaultBadge = document.createElement('span');
                    defaultBadge.className = 'ml-2 text-[8px] text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0';
                    defaultBadge.textContent = 'Default';
                    btn.appendChild(defaultBadge);
                }

                // Show both badges if profile is both active and default
                if(isActive && isDefault) {
                    const defaultBadge = document.createElement('span');
                    defaultBadge.className = 'ml-2 text-[8px] text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0';
                    defaultBadge.textContent = 'Default';
                    btn.appendChild(defaultBadge);
                }

                itemDiv.appendChild(btn);

                // Show rename button for all profiles
                const renameBtn = document.createElement('button');
                renameBtn.className = 'text-slate-300 hover:text-indigo-500 p-1 ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity';
                renameBtn.onclick = () => window.renameProfile(name);
                renameBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>';
                renameBtn.title = 'Rename profile';
                itemDiv.appendChild(renameBtn);

                // Show "Set as Default" button for non-default profiles
                if(!isDefault) {
                    const setDefaultBtn = document.createElement('button');
                    setDefaultBtn.className = 'text-slate-300 hover:text-emerald-500 p-1 ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity';
                    setDefaultBtn.onclick = () => window.setDefaultProfile(name);
                    setDefaultBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                    setDefaultBtn.title = 'Set as default profile';
                    itemDiv.appendChild(setDefaultBtn);
                }

                // Show delete button for all non-active profiles
                if(!isActive) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'text-slate-300 hover:text-red-500 p-1 ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity';
                    deleteBtn.onclick = () => window.deleteProfile(name);
                    deleteBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
                    deleteBtn.title = 'Delete profile';
                    itemDiv.appendChild(deleteBtn);
                }

                list.appendChild(itemDiv);
            });
        }

        window.switchProfile = (name) => {
            userIsEditing = true;
            appData.activeProfileId = name;
            window.saveProgress(true); // Immediate save
            document.getElementById('profile-menu').classList.add('hidden');

            // Re-render current view to show new profile's data
            const viewChapters = document.getElementById('view-chapters');
            const viewBooks = document.getElementById('view-books');
            const viewStats = document.getElementById('view-stats');
            const viewPlan = document.getElementById('view-plan');

            if (!viewChapters.classList.contains('hidden')) {
                // In chapter view - update chapter checkboxes
                window.renderChapterGrid();
            } else if (!viewBooks.classList.contains('hidden')) {
                // In book grid view - update book grid and stats
                window.renderBookGrid();
                window.renderSubdivisionStats();
            } else if (!viewStats.classList.contains('hidden')) {
                // In stats view - update stats
                window.renderStatsPage();
            } else if (!viewPlan.classList.contains('hidden')) {
                // In plan view - update plan
                window.renderDailyPlan();
            }

            setTimeout(() => { userIsEditing = false; }, 2000);
        };

        window.createNewProfile = () => {
            const rawName = prompt("Enter new profile name (alphanumeric only, max 20 characters):\nExamples: Family, Kids, Personal2024");
            if(!rawName || rawName.trim() === "") return;
            
            const sanitized = sanitizeProfileName(rawName);
            
            if(sanitized === "") {
                alert("Profile name must contain at least one alphanumeric character.");
                return;
            }
            
            if(appData.profiles[sanitized]) { 
                alert(`Profile "${sanitized}" already exists!`); 
                return; 
            }
            
            if(Object.keys(appData.profiles).length >= 10) {
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
            // Initialize memorizedVerses for new profile
            if(!appData.memorizedVerses) appData.memorizedVerses = {};
            appData.memorizedVerses[sanitized] = [];
            window.switchProfile(sanitized);
        };

        window.deleteProfile = (name) => {
            if(name === appData.activeProfileId) {
                alert("⚠️ Cannot delete the active profile.\n\nPlease switch to another profile first.");
                return;
            }

            if(Object.keys(appData.profiles).length <= 1) {
                alert("⚠️ Cannot delete the last profile.\n\nYou must have at least one profile.");
                return;
            }

            const confirmMsg = `⚠️ DELETE PROFILE: "${name}"?\n\nThis will permanently delete:\n• All reading progress\n• Reading plan settings\n\nThis action CANNOT be undone.\n\nType the profile name to confirm:`;
            const userInput = prompt(confirmMsg);

            if(userInput === name) {
                delete appData.profiles[name];
                delete appData.profilePlans[name];
                delete appData.hornerDailyProgress[name];
                if(appData.memorizedVerses) delete appData.memorizedVerses[name];

                // If this was the default profile, set default to the active profile
                if(appData.defaultProfileId === name) {
                    appData.defaultProfileId = appData.activeProfileId;
                }

                // Clean up sync rules involving this profile
                if(appData.profileSyncRules) {
                    // Remove if this profile is a source
                    delete appData.profileSyncRules[name];

                    // Remove if this profile is a target
                    Object.keys(appData.profileSyncRules).forEach(sourceProfile => {
                        if(appData.profileSyncRules[sourceProfile] === name) {
                            delete appData.profileSyncRules[sourceProfile];
                        }
                    });
                }

                window.saveProgress(true); // Immediate save
                renderProfileList(); // Re-render the list
                alert(`✅ Profile "${name}" has been deleted.`);
            } else if(userInput !== null) {
                alert("❌ Profile name did not match. Deletion cancelled.");
            }
        };

        window.renameProfile = (oldName) => {
            const rawName = prompt(`Enter new name for "${oldName}":\n(alphanumeric only, max 20 characters)`, oldName);
            if(!rawName || rawName.trim() === "") return;

            const newName = sanitizeProfileName(rawName);

            if(newName === "") {
                alert("Profile name must contain at least one alphanumeric character.");
                return;
            }

            if(newName === oldName) {
                return; // No change
            }

            if(appData.profiles[newName]) {
                alert(`Profile "${newName}" already exists!`);
                return;
            }

            // Rename the profile
            appData.profiles[newName] = appData.profiles[oldName];
            delete appData.profiles[oldName];

            // Rename in profilePlans if exists
            if(appData.profilePlans[oldName]) {
                appData.profilePlans[newName] = appData.profilePlans[oldName];
                delete appData.profilePlans[oldName];
            }

            // Update activeProfileId if this was the active profile
            if(appData.activeProfileId === oldName) {
                appData.activeProfileId = newName;
                currentProfileName.innerText = newName;
                updateProfileColor();
            }

            // Update defaultProfileId if this was the default profile
            if(appData.defaultProfileId === oldName) {
                appData.defaultProfileId = newName;
            }

            // Update sync rules if this profile is involved
            if(appData.profileSyncRules) {
                // Update if this profile is a source
                if(appData.profileSyncRules[oldName]) {
                    appData.profileSyncRules[newName] = appData.profileSyncRules[oldName];
                    delete appData.profileSyncRules[oldName];
                }

                // Update if this profile is a target
                Object.keys(appData.profileSyncRules).forEach(sourceProfile => {
                    if(appData.profileSyncRules[sourceProfile] === oldName) {
                        appData.profileSyncRules[sourceProfile] = newName;
                    }
                });
            }

            window.saveProgress(true); // Immediate save
            renderProfileList(); // Re-render the list
            alert(`✅ Profile renamed from "${oldName}" to "${newName}".`);
        };

        window.setDefaultProfile = (name) => {
            if(!appData.profiles[name]) {
                alert("⚠️ Profile not found.");
                return;
            }

            appData.defaultProfileId = name;
            window.saveProgress(true); // Immediate save
            renderProfileList(); // Re-render the list
        };

        // --- PROFILE SYNC FUNCTIONS ---
        window.renderProfileSyncSettings = () => {
            const container = document.getElementById('advanced-settings-container');
            const rulesContainer = document.getElementById('profile-sync-rules');

            if(!container || !rulesContainer) return;

            const profileCount = Object.keys(appData.profiles).length;

            // Only show if there are 2+ profiles
            if(profileCount < 2) {
                container.style.display = 'none';
                return;
            }

            container.style.display = 'block';

            // Render existing sync rules
            rulesContainer.innerHTML = '';

            const syncRules = appData.profileSyncRules || {};
            const allProfileNames = Object.keys(appData.profiles).sort();

            if(Object.keys(syncRules).length === 0) {
                rulesContainer.innerHTML = '<p class="text-xs text-slate-400 italic p-4 text-center bg-slate-50 rounded-lg border border-slate-200">No sync rules configured. Click "Add Sync Rule" to create one.</p>';
                return;
            }

            Object.entries(syncRules).forEach(([sourceProfile, targetProfile]) => {
                // Skip if either profile no longer exists
                if(!appData.profiles[sourceProfile] || !appData.profiles[targetProfile]) {
                    delete appData.profileSyncRules[sourceProfile];
                    return;
                }

                const ruleDiv = document.createElement('div');
                ruleDiv.className = 'flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200';

                const ruleText = document.createElement('div');
                ruleText.className = 'flex-1 flex items-center gap-2 text-sm';

                const sourceSpan = document.createElement('span');
                sourceSpan.className = 'font-bold text-slate-700';
                sourceSpan.textContent = sourceProfile;

                const arrow = document.createElement('span');
                arrow.className = 'text-indigo-500 font-black';
                arrow.innerHTML = '→';

                const targetSpan = document.createElement('span');
                targetSpan.className = 'font-bold text-indigo-600';
                targetSpan.textContent = targetProfile;

                ruleText.appendChild(sourceSpan);
                ruleText.appendChild(arrow);
                ruleText.appendChild(targetSpan);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'text-slate-400 hover:text-red-500 p-1 transition-colors';
                deleteBtn.onclick = () => window.removeProfileSyncRule(sourceProfile);
                deleteBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
                deleteBtn.title = 'Remove sync rule';

                ruleDiv.appendChild(ruleText);
                ruleDiv.appendChild(deleteBtn);
                rulesContainer.appendChild(ruleDiv);
            });
        };

        window.addProfileSyncRule = () => {
            const allProfileNames = Object.keys(appData.profiles).sort();
            const syncRules = appData.profileSyncRules || {};

            // Find profiles that don't already have a sync rule as source
            const availableSourceProfiles = allProfileNames.filter(name => !syncRules[name]);

            if(availableSourceProfiles.length === 0) {
                alert("⚠️ All profiles already have sync rules.\n\nEach profile can only be the source for one sync rule. Remove an existing rule to create a new one.");
                return;
            }

            let sourceProfile = availableSourceProfiles[0];
            if(availableSourceProfiles.length > 1) {
                const sourceMsg = "Select SOURCE profile (chapters marked here will sync):\n\n" +
                    availableSourceProfiles.map((name, i) => `${i + 1}. ${name}`).join('\n');
                const sourceInput = prompt(sourceMsg, '1');

                if(!sourceInput) return;

                const sourceIdx = parseInt(sourceInput) - 1;
                if(sourceIdx < 0 || sourceIdx >= availableSourceProfiles.length) {
                    alert("❌ Invalid selection.");
                    return;
                }
                sourceProfile = availableSourceProfiles[sourceIdx];
            }

            // Find profiles that can be targets (all except the source and existing targets)
            const existingTargets = Object.values(syncRules);
            const availableTargetProfiles = allProfileNames.filter(name =>
                name !== sourceProfile && !existingTargets.includes(name)
            );

            if(availableTargetProfiles.length === 0) {
                alert("⚠️ No available target profiles.\n\nAll other profiles are already targets of existing sync rules.");
                return;
            }

            let targetProfile = availableTargetProfiles[0];
            if(availableTargetProfiles.length > 1) {
                const targetMsg = `Select TARGET profile (will receive synced chapters from "${sourceProfile}"):\n\n` +
                    availableTargetProfiles.map((name, i) => `${i + 1}. ${name}`).join('\n');
                const targetInput = prompt(targetMsg, '1');

                if(!targetInput) return;

                const targetIdx = parseInt(targetInput) - 1;
                if(targetIdx < 0 || targetIdx >= availableTargetProfiles.length) {
                    alert("❌ Invalid selection.");
                    return;
                }
                targetProfile = availableTargetProfiles[targetIdx];
            }

            // Confirm the rule
            const confirmMsg = `Create sync rule?\n\n${sourceProfile} → ${targetProfile}\n\nChapters marked in "${sourceProfile}" will automatically be marked in "${targetProfile}".`;
            if(!confirm(confirmMsg)) return;

            appData.profileSyncRules[sourceProfile] = targetProfile;
            window.saveProgress(true);
            window.renderProfileSyncSettings();
        };

        window.removeProfileSyncRule = (sourceProfile) => {
            const targetProfile = appData.profileSyncRules[sourceProfile];

            if(!confirm(`Remove sync rule?\n\n${sourceProfile} → ${targetProfile}\n\nChapters will no longer sync automatically.`)) {
                return;
            }

            delete appData.profileSyncRules[sourceProfile];
            window.saveProgress(true);
            window.renderProfileSyncSettings();
        };

        document.addEventListener('click', (e) => {
            const menu = document.getElementById('profile-menu');
            const btn = document.getElementById('profile-menu-btn');
            if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });
