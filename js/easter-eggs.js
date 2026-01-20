		// ============================================
		// 🥚 EASTER EGGS - Add fun secrets to discover!
		// ============================================

		// --- EASTER EGG 1: Konami Code Achievement ---
		let konamiCode = [];
		const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

		document.addEventListener('keydown', (e) => {
			konamiCode.push(e.key);
			konamiCode = konamiCode.slice(-10);
			
			if(JSON.stringify(konamiCode) === JSON.stringify(konamiSequence)) {
				unlockSecretAchievement();
			}
		});

		function unlockSecretAchievement() {
			const modal = document.createElement('div');
			modal.className = 'fixed inset-0 z-[200] bg-gradient-to-br from-purple-900/95 to-indigo-900/95 flex items-center justify-center p-4 animate-in';
			modal.innerHTML = `
				<div class="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
					<div class="text-6xl mb-4">🏆</div>
					<h2 class="text-2xl font-black text-indigo-900 mb-2">SECRET UNLOCKED!</h2>
					<p class="text-slate-600 mb-4">"For nothing is secret, that shall not be made manifest" - Luke 8:17</p>
					<p class="text-sm text-indigo-600 font-bold">You've discovered the Konami Code blessing!</p>
					<button onclick="this.parentElement.parentElement.remove()" class="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Amen! ✨</button>
				</div>
			`;
			document.body.appendChild(modal);
		}

		// --- EASTER EGG 2: Rainbow Mode (Click profile dot 7 times) ---
		let profileDotClicks = 0;
		let clickTimeout;

		if(currentProfileDot) {
			currentProfileDot.addEventListener('click', (e) => {
				e.stopPropagation();
				profileDotClicks++;
				
				clearTimeout(clickTimeout);
				clickTimeout = setTimeout(() => profileDotClicks = 0, 2000);
				
				if(profileDotClicks === 7) {
					activateRainbowMode();
					profileDotClicks = 0;
				}
			});
		}

		function activateRainbowMode() {
			document.body.style.animation = 'rainbow 10s linear infinite';
			const style = document.createElement('style');
			style.textContent = `
				@keyframes rainbow {
					0% { filter: hue-rotate(0deg); }
					100% { filter: hue-rotate(360deg); }
				}
			`;
			document.head.appendChild(style);
			
			const modal = document.createElement('div');
			modal.className = 'fixed top-4 right-4 z-[200] bg-white rounded-2xl p-4 shadow-2xl border-2 border-indigo-400 animate-in';
			modal.innerHTML = `
				<div class="text-center">
					<div class="text-4xl mb-2">🌈</div>
					<p class="text-sm font-bold text-indigo-900">Rainbow Mode Activated!</p>
					<p class="text-xs text-slate-600 mt-1">"I do set my bow in the cloud" - Genesis 9:13</p>
				</div>
			`;
			document.body.appendChild(modal);
			
			setTimeout(() => {
				document.body.style.animation = '';
				style.remove();
				modal.remove();
			}, 10000);
		}

		// --- EASTER EGG 3: Psalm 119 Achievement ---
		const originalToggleChapter = window.toggleChapter;
		window.toggleChapter = (id, event) => {
			const prog = getProgress();
			const wasRead = prog[id];

			originalToggleChapter(id, event);
			
			// Check if just completed Psalm 119
			if(id === 'Psalms-119' && !wasRead && getProgress()[id]) {
				setTimeout(() => showPsalm119Achievement(), 500);
			}
		};

		function showPsalm119Achievement() {
			const modal = document.createElement('div');
			modal.className = 'fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4';
			modal.innerHTML = `
				<div class="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-3xl p-8 max-w-lg text-center shadow-2xl border-4 border-amber-400 modal-in">
					<div class="text-7xl mb-4">📜</div>
					<h2 class="text-3xl font-black text-amber-900 mb-3">MIGHTY ACHIEVEMENT!</h2>
					<p class="text-lg font-bold text-amber-800 mb-4">You've conquered Psalm 119!</p>
					<p class="text-sm text-slate-600 leading-relaxed mb-2">The longest chapter in the Bible with 2,423 words across 176 verses.</p>
					<p class="text-xs text-amber-600 italic">"Thy word is a lamp unto my feet, and a light unto my path" - Psalm 119:105</p>
					<button onclick="this.parentElement.parentElement.remove()" class="mt-6 px-8 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 shadow-lg">Glory to God! 🙏</button>
				</div>
			`;
			document.body.appendChild(modal);
		}

		// --- EASTER EGG 4: Bible Completion Celebration ---
		const originalUpdateStats = window.updateStats;
		window.updateStats = () => {
			originalUpdateStats();
			
			// Check for Bible completion
			const currentProg = getProgress();
			let finishedBooks = 0;
			bible.forEach(book => {
				let bookChaptersRead = 0;
				book.ch.forEach((words, cIdx) => {
					if (currentProg[`${book.name}-${cIdx+1}`]) bookChaptersRead++;
				});
				if (bookChaptersRead === book.ch.length) finishedBooks++;
			});
			
			if(finishedBooks === 66 && !localStorage.getItem(`bibleCompleted_${appData.activeProfileId}`)) {
				localStorage.setItem(`bibleCompleted_${appData.activeProfileId}`, 'true');
				setTimeout(() => celebrateBibleCompletion(), 1000);
			}
		};

		function celebrateBibleCompletion() {
			// Confetti effect
			const confetti = document.createElement('div');
			confetti.className = 'fixed inset-0 z-[300] pointer-events-none';
			let confettiHTML = '';
			for(let i = 0; i < 50; i++) {
				const emoji = ['🎉','✨','📖','✝️','🙏'][Math.floor(Math.random()*5)];
				confettiHTML += `<div style="position:absolute;left:${Math.random()*100}%;top:-50px;font-size:${20+Math.random()*30}px;animation:fall ${3+Math.random()*2}s linear forwards;animation-delay:${Math.random()}s">${emoji}</div>`;
			}
			confetti.innerHTML = confettiHTML;
			
			const style = document.createElement('style');
			style.textContent = `@keyframes fall { to { top: 110vh; transform: rotate(${Math.random()*360}deg); } }`;
			document.head.appendChild(style);
			document.body.appendChild(confetti);
			
			setTimeout(() => {
				const modal = document.createElement('div');
				modal.className = 'fixed inset-0 z-[400] bg-gradient-to-br from-indigo-900/98 to-purple-900/98 flex items-center justify-center p-4';
				modal.innerHTML = `
					<div class="bg-white rounded-[3rem] p-12 max-w-2xl text-center shadow-2xl modal-in">
						<div class="text-8xl mb-6">✨📖✨</div>
						<h1 class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">BIBLE COMPLETE!</h1>
						<p class="text-2xl font-bold text-slate-700 mb-6">All 66 books. 789,634 words. One amazing accomplishment!</p>
						<p class="text-lg text-slate-600 mb-4">"Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth."</p>
						<p class="text-sm font-bold text-indigo-600 mb-8">- 2 Timothy 2:15</p>
						<button onclick="this.parentElement.parentElement.remove()" class="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg text-lg">Continue in the Word 📖</button>
					</div>
				`;
				document.body.appendChild(modal);
			}, 500);
			
			setTimeout(() => confetti.remove(), 6000);
		}

		// --- EASTER EGG 5: Type a creator name for Creator Message ---
		const creator_profiles = {
		  SHANE: {
			headline: 'Hey there!',
			body: 'Thanks for using Bible Progress!',
			verse: '"Thy word have I hid in mine heart, that I might not sin against thee." - Psalm 119:11',
			signoff: '- Shane',
			button: 'God bless! ✨'
		  },
		  MEGAN: {
			headline: 'Hey Megan!',
			body: 'Thanks for using Bible Progress! Keep going — one chapter at a time adds up fast.',
			verse: '"Trust in the LORD with all thine heart; and lean not unto thine own understanding." - Proverbs 3:5',
			signoff: '- Shane',
			button: 'I love you! 💞'
		  },
		  DOM: {
			headline: 'Hey Dom!',
			body: 'This Bible stuff is actually pretty important...',
			verse: '"Iron sharpeneth iron; so a man sharpeneth the countenance of his friend." - Proverbs 27:17',
			signoff: '- Shane',
			button: '0/Time! ⌛'
		  },
		  DAVID: {
			headline: 'Hey David!',
			body: 'My favorite uncle!',
			verse: '"Delight thyself also in the LORD; and he shall give thee the desires of thine heart." - Psalm 37:4',
			signoff: '- Shane',
			button: 'God bless! ✨'
		  },
		  MOM: {
			headline: 'Hey Mom!',
			body: 'I love you mom!',
			verse: '"Her children arise up, and call her blessed; her husband also, and he praiseth her." - Proverbs 31:28',
			signoff: '- Shane',
			button: 'Love you! ❤️'
		  },
		  DAD: {
			headline: 'Hey Dad!',
			body: 'I love you dad!',
			verse: '"The just man walketh in his integrity: his children are blessed after him." - Proverbs 20:7',
			signoff: '- Shane',
			button: 'Love you! 💙'
		  },
		  SETH: {
			headline: 'Hey Seth!',
			body: 'You are my brother.',
			verse: '"A friend loveth at all times, and a brother is born for adversity." - Proverbs 17:17',
			signoff: '- Shane',
			button: 'Love you bro! 🤜🤛'
		  }
		};

		const creator_triggers = Object.keys(creator_profiles);
		const max_trigger_len = Math.max(...creator_triggers.map((s) => s.length));

		let typed_sequence = '';

		document.addEventListener('keydown', (e) => {
		  const tag = e.target?.tagName;
		  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

		  const key = String(e.key || '').toUpperCase();

		  // Ignore non-letters so Shift/Arrow/etc don't pollute the sequence
		  if (!/^[A-Z]$/.test(key)) return;

		  typed_sequence += key;
		  typed_sequence = typed_sequence.slice(-max_trigger_len);

		  for (const name of creator_triggers) {
			if (typed_sequence.endsWith(name)) {
			  showCreatorMessage(name);
			  typed_sequence = '';
			  break;
			}
		  }
		});

		function showCreatorMessage(name) {
		  const p = creator_profiles[name] ?? {
			headline: `Hey ${name}!`,
			body: 'Thanks for using Bible Progress!',
			verse: '"Thy word is a lamp unto my feet, and a light unto my path." - Psalm 119:105',
			signoff: `- ${name}`,
			button: 'God bless! ✨'
		  };

		  const modal = document.createElement('div');
		  modal.className = 'fixed inset-0 z-[200] bg-slate-900/90 flex items-center justify-center p-4';

		  modal.innerHTML = `
			<div class="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl modal-in">
			  <div class="text-6xl mb-4">👋</div>
			  <h2 class="text-2xl font-black text-indigo-900 mb-3">${escapeHtml(p.headline)}</h2>
			  <p class="text-slate-600 mb-4">${escapeHtml(p.body)}</p>
			  <p class="text-sm text-slate-500 italic mb-6">${escapeHtml(p.verse)}</p>
			  <p class="text-xs text-slate-400 mb-6">${escapeHtml(p.signoff)}</p>
			  <button class="creator-close px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">${escapeHtml(p.button)}</button>
			</div>
		  `;

		  // Close on button click or backdrop click
		  modal.querySelector('.creator-close')?.addEventListener('click', () => modal.remove());
		  modal.addEventListener('click', (ev) => {
			if (ev.target === modal) modal.remove();
		  });

		  document.body.appendChild(modal);
		}

		function escapeHtml(s) {
		  return String(s).replace(/[&<>"']/g, (c) => ({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;'
		  }[c]));
		}


		// --- EASTER EGG 6: Christmas/Easter Greetings ---
		const originalSetTab = window.setTab;
		window.setTab = (t) => {
			// Check for holidays BEFORE calling original
			const today = new Date();
			const month = today.getMonth() + 1;
			const day = today.getDate();
			const shouldShowChristmas = (t === 'ABOUT' && month === 12 && day === 25 && !sessionStorage.getItem('christmasShown'));
			const shouldShowEaster = (t === 'ABOUT' && isEaster(today) && !sessionStorage.getItem('easterShown'));
			
			// Call original setTab
			originalSetTab(t);
			
			// Show holiday messages AFTER tab is set
			if(shouldShowChristmas) {
				sessionStorage.setItem('christmasShown', 'true');
				setTimeout(() => showChristmasMessage(), 500);
			} else if(shouldShowEaster) {
				sessionStorage.setItem('easterShown', 'true');
				setTimeout(() => showEasterMessage(), 500);
			}
		};

		function isEaster(date) {
			const easterDates = {
				2025: '04-20',
				2026: '04-05',
				2027: '03-28',
				2028: '04-16',
				2029: '04-01',
				2030: '04-21'
			};
			const year = date.getFullYear();
			const monthDay = `${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
			return easterDates[year] === monthDay;
		}

		function showChristmasMessage() {
			const modal = document.createElement('div');
			modal.className = 'fixed top-4 right-4 z-[200] bg-gradient-to-br from-red-50 to-green-50 rounded-2xl p-6 shadow-2xl border-2 border-red-400 animate-in max-w-sm';
			modal.innerHTML = `
				<div class="text-center">
					<div class="text-5xl mb-3">🎄</div>
					<p class="text-lg font-black text-red-900 mb-2">Merry Christmas!</p>
					<p class="text-sm text-slate-700 italic">"For unto you is born this day in the city of David a Saviour, which is Christ the Lord."</p>
					<p class="text-xs text-slate-500 mt-2">- Luke 2:11</p>
					<button onclick="this.parentElement.parentElement.remove()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700">Amen! 🎅</button>
				</div>
			`;
			document.body.appendChild(modal);
			setTimeout(() => modal.remove(), 10000);
		}

		function showEasterMessage() {
			const modal = document.createElement('div');
			modal.className = 'fixed top-4 right-4 z-[200] bg-gradient-to-br from-purple-50 to-yellow-50 rounded-2xl p-6 shadow-2xl border-2 border-purple-400 animate-in max-w-sm';
			modal.innerHTML = `
				<div class="text-center">
					<div class="text-5xl mb-3">✝️</div>
					<p class="text-lg font-black text-purple-900 mb-2">He is Risen!</p>
