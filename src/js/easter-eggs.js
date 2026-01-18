/**
 * easter-eggs.js
 *
 * Hidden easter eggs and celebrations
 * Includes Konami code, profile dot clicks, milestone celebrations, and more
 */

/**
 * Initialize Konami Code easter egg (↑↑↓↓←→←→BA)
 */
function initKonamiCode() {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();

        if (key === konamiCode[konamiIndex].toLowerCase()) {
            konamiIndex++;

            if (konamiIndex === konamiCode.length) {
                triggerKonamiEasterEgg();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });
}

/**
 * Trigger Konami Code celebration
 */
function triggerKonamiEasterEgg() {
    showCelebration('🎮 Konami Code Activated!', 'You found the secret! May your Bible reading be blessed! 🙏');
    createFullScreenConfetti();
}

/**
 * Initialize profile dot click easter egg (7 clicks)
 */
function initProfileDotEasterEgg() {
    const profileDot = document.getElementById('current-profile-dot');
    if (!profileDot) return;

    let clickCount = 0;
    let resetTimer = null;

    profileDot.addEventListener('click', (e) => {
        e.stopPropagation();
        clickCount++;

        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
            clickCount = 0;
        }, 1000);

        if (clickCount === 7) {
            showCelebration('🎨 Colorful Discovery!', 'You\'ve unlocked the rainbow! Keep reading! 🌈');
            clickCount = 0;
        }
    });
}

/**
 * Check for Psalm 119 completion easter egg
 */
function checkPsalm119Completion(appData) {
    const progress = appData.profiles[appData.activeProfileId];

    // Check if all 176 chapters of Psalm 119 are read
    let allRead = true;
    for (let i = 1; i <= 176; i++) {
        if (!progress[`Psalms-${i}`]) {
            allRead = false;
            break;
        }
    }

    if (allRead && !appData.psalm119Celebrated) {
        showCelebration('📖 Psalm 119 Complete!', 'You\'ve read the longest chapter in the Bible! Amazing dedication! 🎉');
        appData.psalm119Celebrated = true;
        localStorage.setItem('kjv_v6_data', JSON.stringify(appData));
    }
}

/**
 * Check for Bible completion easter egg
 */
function checkBibleCompletion(appData) {
    const progress = appData.profiles[appData.activeProfileId];
    const totalChapters = 1189; // Total chapters in the Bible

    const readChapters = Object.keys(progress).filter(k => progress[k]).length;

    if (readChapters >= totalChapters && !appData.bibleCompleteCelebrated) {
        showCelebration('🎊 BIBLE COMPLETE! 🎊', 'You\'ve read the entire Bible! What an incredible accomplishment! 👑');
        appData.bibleCompleteCelebrated = true;
        localStorage.setItem('kjv_v6_data', JSON.stringify(appData));
        createFullScreenConfetti();
    }
}

/**
 * Initialize name typing easter eggs
 */
function initNameEasterEggs() {
    const names = ['SHANE', 'MEGAN', 'DOM', 'DAVID'];
    let typed = '';
    let resetTimer = null;

    document.addEventListener('keydown', (e) => {
        typed += e.key.toUpperCase();

        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
            typed = '';
        }, 2000);

        for (const name of names) {
            if (typed.includes(name)) {
                showCelebration(`👋 Hello ${name}!`, `Thanks for using Bible Progress! Keep reading! 📖`);
                typed = '';
                break;
            }
        }
    });
}

/**
 * Check for holiday greetings (Christmas, Easter)
 */
function checkHolidayGreetings() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Christmas (December 25)
    if (month === 12 && day === 25) {
        const shown = sessionStorage.getItem('christmas_shown');
        if (!shown) {
            showCelebration('🎄 Merry Christmas!', 'Celebrating the birth of our Savior! 🌟');
            sessionStorage.setItem('christmas_shown', 'true');
        }
    }

    // Easter (varies each year - simplified check for Easter Sunday)
    // This would need a proper Easter date calculation
    // For now, showing a generic spring message
}

/**
 * Show celebration modal
 */
function showCelebration(title, message) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 flex items-center justify-center z-[200] modal-in';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';

    modal.innerHTML = `
        <div class="bg-white rounded-3xl p-8 max-w-md mx-4 shadow-2xl text-center modal-in">
            <h2 class="text-3xl font-black text-indigo-600 mb-4">${title}</h2>
            <p class="text-lg text-slate-700 mb-6">${message}</p>
            <button onclick="this.closest('.fixed').remove()" class="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">
                Awesome! 🎉
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (modal.parentNode) modal.remove();
    }, 10000);
}

/**
 * Create full-screen confetti explosion
 */
function createFullScreenConfetti() {
    const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.className = 'confetti-particle';
            particle.style.left = Math.random() * window.innerWidth + 'px';
            particle.style.top = '-20px';
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];

            const xDist = (Math.random() - 0.5) * 200;
            const yDist = window.innerHeight + 100;

            particle.style.setProperty('--tx', xDist + 'px');
            particle.style.setProperty('--ty', yDist + 'px');

            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 3000);
        }, i * 30);
    }
}

/**
 * Initialize all easter eggs
 */
function initAllEasterEggs(appData) {
    initKonamiCode();
    initProfileDotEasterEgg();
    initNameEasterEggs();
    checkHolidayGreetings();

    // Check progress-based easter eggs
    checkPsalm119Completion(appData);
    checkBibleCompletion(appData);
}

export {
    initKonamiCode,
    initProfileDotEasterEgg,
    checkPsalm119Completion,
    checkBibleCompletion,
    initNameEasterEggs,
    checkHolidayGreetings,
    initAllEasterEggs,
    showCelebration,
    createFullScreenConfetti
};
