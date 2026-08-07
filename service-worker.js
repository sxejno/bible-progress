const CACHE_NAME = 'bible-progress-v13';
// CDN copies live in their own version-independent cache so bumping
// CACHE_NAME no longer wipes offline CDN resources (old HIGH-priority bug)
const CDN_CACHE = 'bible-progress-cdn-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/404.html',
    '/learn.html',
    '/chapter-recall.html',
    '/bible-books-game.html',
    '/cause-of-god-and-truth.html',
    '/memorize.html',
    '/horner.html',
    '/prophecy.html',
    '/millennial-day-theory.html',
    '/biblical-language-insights.html',
    '/biblical-name-meanings.html',
    '/biblical-number-meanings.html',
    '/accessibility.html',
    '/privacy.html',
    '/terms.html',
    '/manifest.json',
    '/favicon.png',
    '/favicon.ico',
    '/icon-192.png',
    '/icon-512.png',
    '/apple-touch-icon.png',
    '/fivedayplan.json',
    '/pronunciations.json',
    '/bible_chapter_summaries_concise.json'
];

// Large data files cached only via the explicit "download offline" flow
// (too heavy for install, and cache.addAll fails atomically if any request fails)
const LARGE_DATA_ASSETS = [
    '/kjv_bible.json',
    '/bsb.txt',
    '/biblical-languages-trainer.html',
    '/bible-explorer.html'
];

// CDN resources to cache for offline use (keep URLs in sync with index.html)
const CDN_RESOURCES = [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js'
];

// Hosts whose responses are kept in the CDN cache by the runtime fetch handler
const CDN_HOSTS = ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];

// Install Event: Cache files immediately and skip waiting
self.addEventListener('install', (event) => {
    // Activate worker immediately
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Fetch Event: Network first for HTML, cache first for everything else
self.addEventListener('fetch', (event) => {
    // Cross-origin: network first; keep a fresh copy of known CDN resources in
    // the version-independent CDN cache and fall back to any cached copy offline
    if (!event.request.url.startsWith(self.location.origin)) {
        const isCdn = CDN_HOSTS.includes(new URL(event.request.url).hostname);
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Opaque responses (no-cors script/style fetches) are cacheable too
                    if (isCdn && response && (response.ok || response.type === 'opaque')) {
                        const responseClone = response.clone();
                        caches.open(CDN_CACHE).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // If CDN fails and it's cached (either cache), serve from cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Network-first strategy for HTML to ensure updates
    if ((event.request.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Cache the new version
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(event.request);
                })
        );
    } else {
        const url = new URL(event.request.url);
        const isDataFile = url.pathname.endsWith('.json') || url.pathname.endsWith('.txt');

        if (isDataFile) {
            // Stale-while-revalidate for data files: serve cached copy instantly,
            // refresh it in the background so updates arrive without a cache bump
            event.respondWith(
                caches.open(CACHE_NAME).then((cache) =>
                    cache.match(event.request).then((cachedResponse) => {
                        const networkFetch = fetch(event.request)
                            .then((response) => {
                                if (response && response.ok) {
                                    cache.put(event.request, response.clone());
                                }
                                return response;
                            })
                            .catch(() => cachedResponse);
                        if (cachedResponse) {
                            event.waitUntil(networkFetch);
                            return cachedResponse;
                        }
                        return networkFetch;
                    })
                )
            );
        } else {
            // Cache-first strategy for other assets
            event.respondWith(
                caches.match(event.request).then((cachedResponse) => {
                    return cachedResponse || fetch(event.request).then((response) => {
                        // Cache new resources
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                        return response;
                    });
                })
            );
        }
    }
});

// Activate Event: Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cache) => {
                        if (cache !== CACHE_NAME && cache !== CDN_CACHE) {
                            return caches.delete(cache);
                        }
                    })
                );
            }),
            // Take control of all pages immediately
            self.clients.claim()
        ])
    );
});

// Message handler for downloading offline resources
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DOWNLOAD_OFFLINE') {
        event.waitUntil(
            downloadOfflineResources(event.source)
        );
    }
});

// Download all resources for offline use
async function downloadOfflineResources(client) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const localAssets = ASSETS_TO_CACHE.concat(LARGE_DATA_ASSETS);
        const totalResources = localAssets.length + CDN_RESOURCES.length;
        let downloaded = 0;

        // Send progress update
        const sendProgress = (message, progress) => {
            client.postMessage({
                type: 'DOWNLOAD_PROGRESS',
                message,
                progress
            });
        };

        sendProgress('Downloading app files...', 0);

        // Cache local assets (including large Bible data files for full offline use)
        for (const url of localAssets) {
            try {
                await cache.add(url);
                downloaded++;
                sendProgress(`Downloading app files... (${downloaded}/${localAssets.length})`,
                    Math.floor((downloaded / totalResources) * 100));
            } catch (error) {
                console.warn(`Failed to cache ${url}:`, error);
            }
        }

        sendProgress('Downloading external resources...',
            Math.floor((downloaded / totalResources) * 100));

        // Cache CDN resources into the version-independent CDN cache
        const cdnCache = await caches.open(CDN_CACHE);
        for (const url of CDN_RESOURCES) {
            try {
                const response = await fetch(url, { mode: 'cors' });
                if (response.ok) {
                    await cdnCache.put(url, response);
                    downloaded++;
                    sendProgress(`Downloading external resources... (${downloaded - localAssets.length}/${CDN_RESOURCES.length})`,
                        Math.floor((downloaded / totalResources) * 100));
                }
            } catch (error) {
                console.warn(`Failed to cache CDN resource ${url}:`, error);
                downloaded++; // Still increment to show progress
            }
        }

        sendProgress('Download complete! App ready for offline use.', 100);

        // Send completion message
        setTimeout(() => {
            client.postMessage({
                type: 'DOWNLOAD_COMPLETE'
            });
        }, 1000);

    } catch (error) {
        console.error('Error downloading offline resources:', error);
        client.postMessage({
            type: 'DOWNLOAD_ERROR',
            error: error.message
        });
    }
}
