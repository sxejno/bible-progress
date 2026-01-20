const CACHE_NAME = 'bible-progress-v3-modular';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './kjv_bible.json',
    './bible_chapter_summaries_concise.json',
    './css/styles.css',
    './js/data.js',
    './js/utils.js',
    './js/storage.js',
    './js/progress.js',
    './js/profiles.js',
    './js/categories.js',
    './js/ui-core.js',
    './js/ui-render.js',
    './js/streaks.js',
    './js/bible-reader.js',
    './js/verse-of-day.js',
    './js/settings.js',
    './js/easter-eggs.js',
    './js/firebase-init.js',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install Event: Cache files immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Fetch Event: Serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});
