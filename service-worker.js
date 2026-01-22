const CACHE_NAME = 'bible-progress-v4';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/bible-books-game.html',
    '/memorize.html',
    '/horner.html',
    '/accessibility.html',
    '/privacy.html',
    '/terms.html',
    '/manifest.json',
    '/favicon.png',
    '/icon-192.png',
    '/icon-512.png'
];

// CDN resources to cache for offline use
const CDN_RESOURCES = [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js'
];

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
    // Skip cross-origin requests (CDN resources will be fetched normally)
    if (!event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // If CDN fails and it's cached, serve from cache
                return caches.match(event.request);
            })
        );
        return;
    }

    // Network-first strategy for HTML to ensure updates
    if (event.request.headers.get('accept').includes('text/html')) {
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
});

// Activate Event: Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cache) => {
                        if (cache !== CACHE_NAME) {
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
        const totalResources = ASSETS_TO_CACHE.length + CDN_RESOURCES.length;
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

        // Cache local assets
        for (const url of ASSETS_TO_CACHE) {
            try {
                await cache.add(url);
                downloaded++;
                sendProgress(`Downloading app files... (${downloaded}/${ASSETS_TO_CACHE.length})`,
                    Math.floor((downloaded / totalResources) * 100));
            } catch (error) {
                console.warn(`Failed to cache ${url}:`, error);
            }
        }

        sendProgress('Downloading external resources...',
            Math.floor((downloaded / totalResources) * 100));

        // Cache CDN resources
        for (const url of CDN_RESOURCES) {
            try {
                const response = await fetch(url, { mode: 'cors' });
                if (response.ok) {
                    await cache.put(url, response);
                    downloaded++;
                    sendProgress(`Downloading external resources... (${downloaded - ASSETS_TO_CACHE.length}/${CDN_RESOURCES.length})`,
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
