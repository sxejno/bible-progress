/**
 * auth.js
 *
 * Authentication functions
 * Handles Firebase authentication (Google OAuth and Email/Password)
 * and cloud synchronization
 */

import { auth, db, provider } from './config.js';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { isValidHttpsUrl, validateAppData } from './security.js';
import { resetHornerDailyProgressIfNeeded } from './state.js';

/**
 * Toggle authentication modal
 */
function toggleAuthModal(show) {
    const modal = document.getElementById('auth-modal');
    const errBox = document.getElementById('auth-error');
    if (show) {
        modal.classList.remove('hidden');
        errBox.classList.add('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

/**
 * Handle Google login
 */
function handleGoogleLogin() {
    signInWithPopup(auth, provider)
        .then((result) => {
            toggleAuthModal(false);
        })
        .catch((error) => {
            alert("Google Login Failed: " + error.message);
        });
}

/**
 * Handle email/password authentication (login or register)
 */
async function handleEmailAuth(mode) {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('pass-input').value;
    const errBox = document.getElementById('auth-error');

    if (!email || !pass) {
        errBox.innerText = "Please enter both email and password.";
        errBox.classList.remove('hidden');
        return;
    }

    try {
        if (mode === 'REGISTER') {
            await createUserWithEmailAndPassword(auth, email, pass);
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
        toggleAuthModal(false);
    } catch (error) {
        let msg = error.message;
        if (error.code === 'auth/invalid-credential') msg = "Incorrect email or password.";
        if (error.code === 'auth/email-already-in-use') msg = "That email is already registered.";
        if (error.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
        errBox.innerText = msg;
        errBox.classList.remove('hidden');
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    signOut(auth).then(() => window.location.reload());
}

/**
 * Initialize cloud sync with Firebase
 */
function initCloudSync(uid, appData, userIsEditing, refreshUI) {
    const userDocRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        // Skip sync if user is actively editing
        if (userIsEditing) {
            console.log('⏸️ Skipping sync - user editing');
            return;
        }

        if (docSnap.exists()) {
            const cloudData = docSnap.data().appData || {};
            if (Object.keys(cloudData).length > 0 && validateAppData(cloudData)) {
                // Merge cloud data
                Object.assign(appData, cloudData);

                // Ensure data integrity
                if (!appData.profilePlans) {
                    appData.profilePlans = {};
                    Object.keys(appData.profiles).forEach(name => {
                        appData.profilePlans[name] = 'MCHEYNE';
                    });
                }

                if (!appData.profileSyncRules) {
                    appData.profileSyncRules = {};
                }

                if (!appData.hornerDailyProgress) {
                    appData.hornerDailyProgress = {};
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

                // Ensure reading time settings exist
                if (appData.showReadingTime === undefined) {
                    appData.showReadingTime = true;
                }
                if (!appData.wordsPerMinute) {
                    appData.wordsPerMinute = 250;
                }

                // Ensure active profile exists
                if (!appData.profiles[appData.activeProfileId]) {
                    appData.activeProfileId = Object.keys(appData.profiles)[0];
                }

                // Reset daily progress if needed after loading from cloud
                resetHornerDailyProgressIfNeeded(appData);

                localStorage.setItem('kjv_v6_data', JSON.stringify(appData));
                refreshUI();
            } else {
                setDoc(userDocRef, { appData: appData }, { merge: true });
            }
        } else {
            setDoc(userDocRef, { appData: appData }, { merge: true });
        }
    });

    return unsubscribe;
}

/**
 * Setup authentication state listener
 */
function setupAuthListener(appData, updateUI) {
    let currentUser = null;
    let unsubscribe = null;

    onAuthStateChanged(auth, (user) => {
        const loginBtn = document.getElementById('login-btn');
        const userProfile = document.getElementById('user-profile');
        const userPhoto = document.getElementById('user-photo');
        const syncStatus = document.getElementById('sync-status');

        if (user) {
            currentUser = user;
            loginBtn.classList.add('hidden');
            userProfile.classList.remove('hidden');

            // Validate photoURL is HTTPS before using it
            if (user.photoURL && isValidHttpsUrl(user.photoURL)) {
                userPhoto.src = user.photoURL;
            } else {
                const encodedEmail = encodeURIComponent(user.email);
                userPhoto.src = `https://ui-avatars.com/api/?name=${encodedEmail}&background=e0e7ff&color=4f46e5`;
            }

            syncStatus.className = "flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200";
            syncStatus.title = "Cloud Synced";
            syncStatus.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/><path d="M9 16.2L5.5 12.7l1.4-1.4L9 13.4l4.1-4.1 1.4 1.4z" fill="white"/></svg>';

            unsubscribe = initCloudSync(user.uid, appData, false, updateUI);
        } else {
            currentUser = null;
            loginBtn.classList.remove('hidden');
            userProfile.classList.add('hidden');
            syncStatus.className = "flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400 border border-slate-200";
            syncStatus.title = "Local Only";
            syncStatus.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>';

            if (unsubscribe) unsubscribe();
        }
    });

    return currentUser;
}

export {
    toggleAuthModal,
    handleGoogleLogin,
    handleEmailAuth,
    handleLogout,
    initCloudSync,
    setupAuthListener
};
