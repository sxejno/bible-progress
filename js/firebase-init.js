    <script type="module">
        // --- FIREBASE IMPORTS ---
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

        // --- FIREBASE CONFIG ---
        const firebaseConfig = {
            apiKey: "AIzaSyBkQc0Hyw6zFu9s8QQz1KfEz-5lEkpPVd0",
            authDomain: "bibleprogress-48cfd.firebaseapp.com",
            projectId: "bibleprogress-48cfd",
            storageBucket: "bibleprogress-48cfd.firebasestorage.app",
            messagingSenderId: "400605616220",
            appId: "1:400605616220:web:ce3c6f7b3048c90b636e99",
            measurementId: "G-94H40H1FCR"
        };

        // --- INITIALIZE FIREBASE ---
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const analytics = getAnalytics(app);
        const provider = new GoogleAuthProvider();


        // --- GLOBAL ERROR HANDLER ---
        window.onerror = function(msg, url, lineNo, columnNo, error) {
            console.error('❌ Global Error:', {
                message: msg,
                url: url,
                line: lineNo,
                column: columnNo,
                error: error,
                stack: error?.stack
            });

            // Log to analytics if available
            try {
                if (typeof analytics !== 'undefined') {
                    logEvent(analytics, 'exception', {
                        description: msg,
                        fatal: false
                    });
                }
            } catch (analyticsError) {
                console.warn('Failed to log error to analytics:', analyticsError);
            }

            return false; // Allow default error handling
        };

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', function(event) {
            console.error('❌ Unhandled Promise Rejection:', {
                reason: event.reason,
                promise: event.promise
            });

            // Log to analytics if available
            try {
                if (typeof analytics !== 'undefined') {
                    logEvent(analytics, 'exception', {
                        description: `Unhandled Promise: ${event.reason}`,
                        fatal: false
                    });
                }
            } catch (analyticsError) {
                console.warn('Failed to log error to analytics:', analyticsError);
            }
        });

        window.toggleAuthModal = (show) => {
            const modal = document.getElementById('auth-modal');
            const errBox = document.getElementById('auth-error');
            if(show) {
                modal.classList.remove('hidden');
                errBox.classList.add('hidden');
            } else {
                modal.classList.add('hidden');
            }
        };

        // --- INTRO MODAL LOGIC ---
        window.showIntroModal = () => {
            const modal = document.getElementById('intro-modal');
            modal.classList.remove('hidden');
        };

        window.closeIntroModal = () => {
            const modal = document.getElementById('intro-modal');
            modal.classList.add('hidden');
            // Mark that user has seen the intro
            localStorage.setItem('kjv_intro_seen', 'true');
        };

        // Check if this is the user's first visit
        function checkFirstVisit() {
            const hasSeenIntro = localStorage.getItem('kjv_intro_seen');
            if (!hasSeenIntro) {
                // Show intro modal after a short delay for better UX
                setTimeout(() => {
                    window.showIntroModal();
                }, 500);
            }
        }

        window.handleGoogleLogin = () => {
            signInWithPopup(auth, provider)
                .then((result) => { window.toggleAuthModal(false); })
                .catch((error) => {
                    alert("Google Login Failed: " + error.message);
                });
        };

        window.handleEmailAuth = async (mode) => {
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
                window.toggleAuthModal(false);
            } catch (error) {
                let msg = error.message;
                if (error.code === 'auth/invalid-credential') msg = "Incorrect email or password.";
                if (error.code === 'auth/email-already-in-use') msg = "That email is already registered.";
                if (error.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
                errBox.innerText = msg;
                errBox.classList.remove('hidden');
            }
        };

        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => window.location.reload());
        });

        onAuthStateChanged(auth, (user) => {
            const loginBtn = document.getElementById('login-btn');
            if (user) {
                currentUser = user;
                loginBtn.classList.add('hidden');
                userProfile.classList.remove('hidden');
                // Validate photoURL is HTTPS before using it (prevent XSS/open redirect)
                if (user.photoURL && isValidHttpsUrl(user.photoURL)) {
                    userPhoto.src = user.photoURL;
                } else {
                    userPhoto.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=e0e7ff&color=4f46e5`;
                }
                
                syncStatus.className = "flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200";
                syncStatus.title = "Cloud Synced";
                syncStatus.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/><path d="M9 16.2L5.5 12.7l1.4-1.4L9 13.4l4.1-4.1 1.4 1.4z" fill="white"/></svg>';
                initCloudSync(user.uid);
            } else {
                currentUser = null;
                loginBtn.classList.remove('hidden');
                userProfile.classList.add('hidden');
                syncStatus.className = "flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400 border border-slate-200";
                syncStatus.title = "Local Only";
                syncStatus.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>';
                if(unsubscribe) unsubscribe(); 
            }
        });

        async function initCloudSync(uid) {
            const userDocRef = doc(db, "users", uid);
            unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                // Skip sync if user is actively editing
                if(userIsEditing) {
                    console.log('⏸️ Skipping sync - user editing');
                    return;
                }
                
                if (docSnap.exists()) {
                    const cloudData = docSnap.data().appData || {};
                    if (Object.keys(cloudData).length > 0 && validateAppData(cloudData)) {
                        appData = cloudData;

                        // Ensure data integrity
                        if(!appData.profilePlans) {
                            appData.profilePlans = {};
                            Object.keys(appData.profiles).forEach(name => {
                                appData.profilePlans[name] = 'MCHEYNE';
                            });
                        }

                        // Ensure profileSyncRules exists (migration for existing users)
                        if(!appData.profileSyncRules) {
                            appData.profileSyncRules = {};
                        }

                        // Ensure hornerDailyProgress exists (migration for existing users)
                        if(!appData.hornerDailyProgress) {
                            appData.hornerDailyProgress = {};
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

                        // Ensure reading time settings exist (migration for existing users)
                        if(appData.showReadingTime === undefined) {
                            appData.showReadingTime = true;
                        }
                        if(!appData.wordsPerMinute) {
                            appData.wordsPerMinute = 250;
                        }

                        // Ensure active profile exists
                        if(!appData.profiles[appData.activeProfileId]) {
                            appData.activeProfileId = Object.keys(appData.profiles)[0];
                        }

                        // Reset daily progress if needed after loading from cloud
                        resetHornerDailyProgressIfNeeded();

                        localStorage.setItem('kjv_v6_data', JSON.stringify(appData));
                        refreshUI();
                    } else {
                        setDoc(userDocRef, { appData: appData }, { merge: true });
                    }
                } else {
                    setDoc(userDocRef, { appData: appData }, { merge: true });
                }
            });
        }
