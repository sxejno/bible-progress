        // --- APP STATE & MIGRATION ---
        let savedData = null;
        try {
            const rawData = localStorage.getItem('kjv_v6_data');
            if (rawData) {
                savedData = JSON.parse(rawData);
                if(savedData && !validateAppData(savedData)) {
                    console.warn('Invalid saved data, resetting to defaults');
                    savedData = null;
                }
            }
        } catch (e) {
            console.error('Failed to parse saved data:', e);
            savedData = null;
        }

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

        let appData = savedData || {
            profiles: { "Default": oldProgress || {} },
            activeProfileId: "Default",
            profilePlans: { "Default": oldPlan },
            defaultProfileId: "Default",
            profileSyncRules: {}
        };

        // Ensure data structure is valid
        if(!appData.profiles || Object.keys(appData.profiles).length === 0) {
            appData.profiles = { "Default": {} };
            appData.activeProfileId = "Default";
            appData.defaultProfileId = "Default";
        }

        // Migrate existing users to have profilePlans
        if(!appData.profilePlans) {
            appData.profilePlans = {};
            Object.keys(appData.profiles).forEach(name => {
                appData.profilePlans[name] = oldPlan;
            });
        }

        // Migrate existing users to have defaultProfileId
        if(!appData.defaultProfileId) {
            // Set the first profile as default (or current active profile)
            appData.defaultProfileId = appData.activeProfileId || Object.keys(appData.profiles)[0];
        }

        // Migrate existing users to have profileSyncRules
        if(!appData.profileSyncRules) {
            appData.profileSyncRules = {};
        }

        // Migrate existing users to have hornerDailyProgress (now per-profile)
        if(!appData.hornerDailyProgress) {
            appData.hornerDailyProgress = {};
        }
        // Migrate old global hornerDailyProgress to per-profile structure
        if(appData.hornerDailyProgress.date && appData.hornerDailyProgress.completedLists) {
            // Old global structure detected - migrate to current active profile
            const oldData = { ...appData.hornerDailyProgress };
            appData.hornerDailyProgress = {};
            appData.hornerDailyProgress[appData.activeProfileId] = oldData;
        }
        // Ensure each profile has hornerDailyProgress initialized
        Object.keys(appData.profiles).forEach(profileId => {
            if(!appData.hornerDailyProgress[profileId]) {
                appData.hornerDailyProgress[profileId] = {
                    date: new Date().toISOString().split('T')[0],
                    completedLists: []
                };
            }
        });

        // Migrate existing users to have reading time settings
        if(appData.showReadingTime === undefined) {
            appData.showReadingTime = true;
        }
        if(!appData.wordsPerMinute) {
            appData.wordsPerMinute = 250; // Average adult reading speed
        }

        // Migrate existing users to have verse memorization (per-profile)
        if(!appData.memorizedVerses) {
            appData.memorizedVerses = {};
            Object.keys(appData.profiles).forEach(profileId => {
                appData.memorizedVerses[profileId] = [];
            });
        }
        // Ensure each profile has memorizedVerses array
        Object.keys(appData.profiles).forEach(profileId => {
            if(!appData.memorizedVerses[profileId]) {
                appData.memorizedVerses[profileId] = [];
            }
        });

        // On app load, use defaultProfileId if it exists and is valid
        if(appData.defaultProfileId && appData.profiles[appData.defaultProfileId]) {
            appData.activeProfileId = appData.defaultProfileId;
        }

        // Ensure active profile exists
        if(!appData.profiles[appData.activeProfileId]) {
            appData.activeProfileId = Object.keys(appData.profiles)[0];
        }

        // Ensure default profile exists, otherwise set it to active profile
        if(!appData.profiles[appData.defaultProfileId]) {
            appData.defaultProfileId = appData.activeProfileId;
        }

        // Migrate boolean progress values to timestamps (for heatmap/streak tracking)
        Object.keys(appData.profiles).forEach(profileName => {
            const profile = appData.profiles[profileName];
            Object.keys(profile).forEach(chapterKey => {
                if(profile[chapterKey] === true) {
                    // Convert true to current timestamp (one-time migration)
                    profile[chapterKey] = Date.now();
                }
            });
        });

        // If "Default" is active/default but other profiles exist, switch away from it
        const allProfileNames = Object.keys(appData.profiles);
        if(allProfileNames.length > 1 && appData.activeProfileId === 'Default') {
            // Switch to the first non-Default profile
            const nonDefaultProfile = allProfileNames.find(name => name !== 'Default');
            if(nonDefaultProfile) {
                appData.activeProfileId = nonDefaultProfile;
                appData.defaultProfileId = nonDefaultProfile;
            }
        }

        // Ensure all profiles have a plan
        Object.keys(appData.profiles).forEach(name => {
            if(!appData.profilePlans[name]) {
                appData.profilePlans[name] = 'MCHEYNE';
            }
        });

        // Save any migration fixes to localStorage immediately
        // This prevents the "Default" profile from being recreated on reload
        localStorage.setItem('kjv_v6_data', JSON.stringify(appData));

        window.saveProgress = (immediate = false) => {
			// Always save to localStorage first (never fails)
			localStorage.setItem('kjv_v6_data', JSON.stringify(appData));
			localStorage.setItem('kjv_v6_progress', JSON.stringify(getProgress())); 
			
			// Try to save to Firebase if user is logged in
			if (currentUser) {
				if(immediate) {
					// Immediate save for plan changes - no debounce
					const userDocRef = doc(db, "users", currentUser.uid);
					setDoc(userDocRef, { appData: appData }, { merge: true })
						.then(() => {
							console.log('✅ Saved immediately to Firebase');
						})
						.catch(err => {
							console.warn('⚠️ Firebase save failed (data saved locally):', err.message);
							// Update sync status to show warning
							if(syncStatus) {
								syncStatus.className = "flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 border border-amber-200";
								syncStatus.title = "⚠️ Sync Issue";
								syncStatus.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/><path d="M12 8v4M12 16h.01" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
							}
						});
				} else {
					// Debounced save for chapter toggles
					clearTimeout(saveTimeout);
					saveTimeout = setTimeout(() => {
						const userDocRef = doc(db, "users", currentUser.uid);
						setDoc(userDocRef, { appData: appData }, { merge: true })
							.then(() => {
								console.log('✅ Saved to Firebase');
								if(syncStatus) {
									syncStatus.className = "flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200";
									syncStatus.title = "Cloud Synced";
									syncStatus.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/><path d="M9 16.2L5.5 12.7l1.4-1.4L9 13.4l4.1-4.1 1.4 1.4z" fill="white"/></svg>';
								}
							})
							.catch(err => {
								console.warn('⚠️ Firebase save failed (data saved locally):', err.message);
								if(syncStatus) {
									syncStatus.className = "flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 border border-amber-200";
									syncStatus.title = "⚠️ Sync Issue";
									syncStatus.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/><path d="M12 8v4M12 16h.01" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
								}
							});
					}, 1000);
				}
			}
			refreshUI();
		};

        window.backupData = () => {
            const dataStr = JSON.stringify(appData);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);

            // Add timestamp to filename
            const timestamp = new Date().toISOString().split('T')[0];
            linkElement.setAttribute('download', `bibleprogress_backup_${timestamp}.json`);
            linkElement.click();

            // Log backup details for debugging
            const profileCount = Object.keys(appData.profiles).length;
            console.log(`✅ Backed up ${profileCount} profile(s):`, Object.keys(appData.profiles).join(', '));
        };

        window.restoreData = (input) => {
            const file = input.files[0];
            if (!file) return;

            // Security: Validate file type
            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                alert("Invalid file type. Please upload a .json file.");
                input.value = ''; // Clear the input
                return;
            }

            // Security: Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if (file.size > maxSize) {
                alert("File too large. Maximum size is 5MB.");
                input.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (typeof data === 'object' && data !== null) {
                        if(data.profiles && validateAppData(data)) {
                            appData = data;

                            // Ensure profilePlans exists for all profiles
                            if(!appData.profilePlans) {
                                appData.profilePlans = {};
                            }
                            Object.keys(appData.profiles).forEach(profileName => {
                                if(!appData.profilePlans[profileName]) {
                                    appData.profilePlans[profileName] = 'SEQUENTIAL';
                                }
                            });

                            // Ensure profileSyncRules exists (migration for existing backups)
                            if(!appData.profileSyncRules) {
                                appData.profileSyncRules = {};
                            }

                            // Ensure reading time settings exist (migration for existing backups)
                            if(appData.showReadingTime === undefined) {
                                appData.showReadingTime = false;
                            }
