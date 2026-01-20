        // --- DARK MODE UI HELPER ---
        // Updates the settings page toggle button to reflect current dark mode state
        function updateDarkModeToggleUI(isDark) {
            const toggle = document.getElementById('dark-mode-toggle');
            const circle = document.getElementById('dark-mode-toggle-circle');

            if(toggle && circle) {
                if(isDark) {
                    toggle.classList.remove('bg-slate-300');
                    toggle.classList.add('bg-indigo-600');
                    circle.classList.remove('translate-x-1');
                    circle.classList.add('translate-x-7');
                } else {
                    toggle.classList.remove('bg-indigo-600');
                    toggle.classList.add('bg-slate-300');
                    circle.classList.remove('translate-x-7');
                    circle.classList.add('translate-x-1');
                }
            }
        }

        // --- INITIALIZE DARK MODE FROM LOCALSTORAGE ---
        // Restore user's dark mode preference on page load
        const darkModePreference = localStorage.getItem('darkMode');
        if (darkModePreference === 'enabled') {
            document.body.classList.add('dark-mode');
            updateDarkModeToggleUI(true);

            // Add dark mode styles if not already present
            if(!document.getElementById('dark-mode-style')) {
                const style = document.createElement('style');
                style.id = 'dark-mode-style';
                style.textContent = `
                    .dark-mode {
                        filter: invert(0.9) hue-rotate(180deg);
                        background: #1a1a1a !important;
                    }
                    .dark-mode img { filter: invert(1) hue-rotate(180deg); }
                `;
                document.head.appendChild(style);
            }
        }

        // --- TAB SCROLL INDICATOR ---
        function updateTabScrollIndicator() {
            const container = document.getElementById('tab-scroll-container');
            const indicator = document.getElementById('tab-scroll-indicator');

            if (!container || !indicator) return;

            const isScrollable = container.scrollWidth > container.clientWidth;
            const isScrolledToEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;

            if (isScrollable && !isScrolledToEnd) {
                indicator.classList.remove('hidden');
            } else {
                indicator.classList.add('hidden');
            }
        }

        // Update indicator on scroll
        const tabScrollContainer = document.getElementById('tab-scroll-container');
        if (tabScrollContainer) {
            tabScrollContainer.addEventListener('scroll', updateTabScrollIndicator);
        }

        // Update on load and resize
        updateTabScrollIndicator();
        window.addEventListener('resize', updateTabScrollIndicator);

		window.toggleDarkModeSetting = () => {
			toggleDarkMode(false); // No notification for regular settings toggle
		};

		// Reading time estimate functions
		window.toggleReadingTime = () => {
			appData.showReadingTime = !appData.showReadingTime;
			updateReadingTimeToggleUI();
			window.saveProgress();
			// Re-render daily plan if currently viewing it
			if(window.activeTab === 'PLAN') {
				window.renderDailyPlan();
			}
		};

		window.updateWPM = (value) => {
			const wpm = parseInt(value);
			if(wpm >= 100 && wpm <= 500) {
				appData.wordsPerMinute = wpm;
				window.saveProgress();
				// Re-render daily plan if currently viewing it
				if(window.activeTab === 'PLAN') {
					window.renderDailyPlan();
				}
			}
		};

		// Default tab setting
		window.setDefaultTab = (tab) => {
			appData.defaultTab = tab;
			window.saveProgress();
		};

		// Update default tab selector in settings
		function updateDefaultTabSelector() {
			const selector = document.getElementById('default-tab-selector');
			if(selector && appData.defaultTab) {
				selector.value = appData.defaultTab;
			}
		}

		function updateReadingTimeToggleUI() {
			const toggle = document.getElementById('reading-time-toggle');
			const circle = document.getElementById('reading-time-toggle-circle');
			const wpmContainer = document.getElementById('wpm-setting-container');
			const wpmInput = document.getElementById('wpm-input');

			if(appData.showReadingTime) {
				toggle.classList.remove('bg-slate-300');
				toggle.classList.add('bg-indigo-500');
				circle.classList.remove('translate-x-1');
				circle.classList.add('translate-x-7');
				if(wpmContainer) wpmContainer.style.display = 'block';
			} else {
				toggle.classList.remove('bg-indigo-500');
				toggle.classList.add('bg-slate-300');
				circle.classList.remove('translate-x-7');
				circle.classList.add('translate-x-1');
				if(wpmContainer) wpmContainer.style.display = 'none';
			}

			// Update WPM input value
			if(wpmInput) {
				wpmInput.value = appData.wordsPerMinute || 250;
			}
		}

		// Calculate reading time from word count
		function calculateReadingTime(wordCount) {
			const wpm = appData.wordsPerMinute || 250;
			const minutes = Math.ceil(wordCount / wpm);
			if(minutes < 1) return '<1 min';
			if(minutes === 1) return '1 min';
			return `${minutes} min`;
		}

		console.log('🥚 Easter eggs loaded! Try: Konami Code, click profile dot 7x, complete Psalm 119, finish the Bible, type SHANE/MOM/DAD/SETH, triple-click logo, or visit on Christmas/Easter!');

		// --- COOKIE CONSENT FUNCTIONS (Temporarily Disabled) ---
		/*
		window.showCookieConsent = () => {
			const cookieConsentDismissed = localStorage.getItem('cookieConsentDismissed');
			if (!cookieConsentDismissed) {
				const banner = document.getElementById('cookie-consent-banner');
				if (banner) {
					setTimeout(() => {
						banner.classList.remove('hidden');
					}, 2000); // Show after 2 seconds
				}
			}
		};

		window.dismissCookieConsent = () => {
			const banner = document.getElementById('cookie-consent-banner');
			if (banner) {
				banner.classList.add('hidden');
				localStorage.setItem('cookieConsentDismissed', 'true');
			}
		};

		// Show cookie consent banner on page load
		window.showCookieConsent();
		*/
