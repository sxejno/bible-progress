/**
 * dark-mode.js
 *
 * Dark mode toggle and persistence
 * Handles theme switching via Settings or triple-click logo easter egg
 */

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    const isDark = document.body.classList.contains('dark-mode');

    if (isDark) {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
    } else {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
    }

    // Update toggle button state if present
    updateDarkModeButton();
}

/**
 * Initialize dark mode from localStorage
 */
function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode');

    if (savedMode === 'true') {
        document.body.classList.add('dark-mode');
    }

    updateDarkModeButton();
}

/**
 * Update dark mode button state
 */
function updateDarkModeButton() {
    const toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) return;

    const isDark = document.body.classList.contains('dark-mode');

    if (isDark) {
        toggle.innerHTML = '🌙 Dark Mode: ON';
        toggle.classList.add('active');
    } else {
        toggle.innerHTML = '🌞 Dark Mode: OFF';
        toggle.classList.remove('active');
    }
}

/**
 * Handle triple-click logo easter egg for dark mode
 */
function initLogoTripleClick() {
    const logo = document.getElementById('app-logo');
    if (!logo) return;

    let clickCount = 0;
    let clickTimer = null;

    logo.addEventListener('click', () => {
        clickCount++;

        if (clickCount === 1) {
            clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 500); // Reset after 500ms
        }

        if (clickCount === 3) {
            clearTimeout(clickTimer);
            clickCount = 0;

            // Toggle dark mode
            toggleDarkMode();

            // Show celebration notification
            showNotification('🎨 Dark mode toggled!');
        }
    });
}

/**
 * Show notification toast
 */
function showNotification(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-2xl z-50 modal-in';
    toast.innerText = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

export {
    toggleDarkMode,
    initDarkMode,
    updateDarkModeButton,
    initLogoTripleClick
};
