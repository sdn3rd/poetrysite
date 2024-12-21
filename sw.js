// sw.js

const STATIC_CACHE_NAME = 'site-cache-v4'; // Update version as needed
const AUDIO_CACHE_NAME = 'audio-cache-v3';
const IMAGE_CACHE_NAME = 'image-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/contact.html',
    '/style.css',
    '/script.js',
    '/contact.js',
    '/fonts/roboto-v32-latin-regular.woff',
    '/fonts/roboto-v32-latin-500.woff',
    '/fonts/roboto-v32-latin-regular.woff2',
    '/fonts/roboto-v32-latin-500.woff2',
    '/sections.json',
    // Icons
    '/icons/favicon.ico',
    '/icons/darkmode.png',
    '/icons/lightmode.png',
    '/icons/patreon.png',
    '/icons/patreon_alt.png',
    '/icons/menu.png',
    '/icons/menu_alt.png',
    '/icons/home.png',
    '/icons/home_alt.png',
    '/icons/caliope.png',
    '/icons/caliope_alt.png',
    '/icons/lupa.png',
    '/icons/lupa_alt.png',
    '/icons/experiments.png',
    '/icons/experiments_alt.png',
    '/icons/play.png',
    '/icons/play_alt.png',
    '/icons/pause.png',
    '/icons/pause_alt.png',
    '/icons/cloud.png',
    '/icons/cloud_alt.png',
    // Images
    '/images/patreon.png',
    '/images/sitepreview.jpg',
    '/images/skipping.jpg',
    '/images/skipping_alt.jpg',
    '/images/wallet.jpg',
    '/images/wallet_alt.jpg',
    '/images/sewing.jpg',
    '/images/sewing_alt.jpg',
    '/images/tristanlogo.png',
    '/images/tristanlogo_alt.png',
    '/images/amnesia.jpg',
    '/images/amnesia_alt.jpg',
    // Fallback image for offline scenarios
    '/images/fallback.png'
];

const MAX_IMAGE_CACHE_SIZE = 50;

// Install Event: Cache static assets
self.addEventListener('install', event => {
    console.log('[Service Worker] Install Event');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            console.log('[Service Worker] Caching static assets');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

// Activate Event: Clean up old caches and check if caches should be cleared
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate Event');
    event.waitUntil(
        (async () => {
            // Delete old caches
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cache => {
                    if (![STATIC_CACHE_NAME, AUDIO_CACHE_NAME, IMAGE_CACHE_NAME].includes(cache)) {
                        console.log('[Service Worker] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );

            // Check with worker.js if caches should be cleared
            try {
                const response = await fetch('/sig', { method: 'GET' });
                if (response.ok) {
                    const data = await response.json();
                    if (data.shouldClearCaches) {
                        console.log('[Service Worker] Clearing all caches as per worker.js directive');
                        await caches.keys().then(names => Promise.all(
                            names.map(name => caches.delete(name))
                        ));
                        // Notify all clients to reload and clear localStorage
                        const clientsList = await self.clients.matchAll();
                        clientsList.forEach(client => {
                            client.postMessage({ action: 'cachesCleared' });
                        });
                    }
                } else {
                    console.error('[Service Worker] Failed to fetch /sig:', response.status);
                }
            } catch (error) {
                console.error('[Service Worker] Error fetching /sig:', error);
            }

            return self.clients.claim();
        })()
    );
});

// Fetch Event: Handle different caching strategies
self.addEventListener('fetch', event => {
    const requestURL = new URL(event.request.url);

    // Ignore non-HTTP(S) requests
    if (requestURL.protocol !== 'http:' && requestURL.protocol !== 'https:') {
        return;
    }

    // Handle navigation requests
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response.ok) {
                        caches.open(STATIC_CACHE_NAME).then(cache => {
                            cache.put(event.request, response.clone());
                        });
                        return response;
                    }
                    throw new Error('Network response was not ok.');
                })
                .catch(() => {
                    return caches.match('/').then(cachedResponse => {
                        return cachedResponse || caches.match('/contact.html') || fetch('/');
                    });
                })
        );
        return;
    }

    // Handle JSON files with a network-first strategy
    if (requestURL.pathname.endsWith('.json')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    return caches.open(STATIC_CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Handle image files with a cache-first strategy and size limit
    if (/\.(png|jpg|jpeg|gif)$/i.test(requestURL.pathname)) {
        event.respondWith(
            caches.open(IMAGE_CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request).then(networkResponse => {
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                            limitCacheSize(IMAGE_CACHE_NAME, MAX_IMAGE_CACHE_SIZE);
                        }
                        return networkResponse;
                    }).catch(error => {
                        console.error('[Service Worker] Fetch failed for image:', error);
                        return caches.match('/images/fallback.png') || new Response('', { status: 204 });
                    });
                });
            })
        );
        return;
    }

    // Handle audio files with a cache-first strategy
    if (requestURL.pathname.startsWith('/audio/')) {
        event.respondWith(
            caches.open(AUDIO_CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    return response || fetch(event.request).then(networkResponse => {
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                            limitCacheSize(AUDIO_CACHE_NAME, MAX_IMAGE_CACHE_SIZE);
                        }
                        return networkResponse;
                    }).catch(error => {
                        console.error('[Service Worker] Fetch failed for audio:', error);
                        return new Response('', { status: 204, statusText: 'No Content' });
                    });
                });
            })
        );
        return;
    }

    // Handle all other requests with a cache-first strategy
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request)
                .then(networkResponse => {
                    if (networkResponse.ok) {
                        return caches.open(STATIC_CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                    }
                    return networkResponse;
                })
                .catch(error => {
                    console.error('[Service Worker] Fetch failed:', error);
                });
        })
    );
});

// Message Event: Handle messages from the main site script
self.addEventListener('message', event => {
    if (event.data && event.data.action === 'cacheAudioFiles') {
        const audioFiles = event.data.files;
        cacheAudioFiles(audioFiles).then(() => {
            event.source.postMessage({ action: 'cacheAudioFilesComplete' });
        });
    } else if (event.data && event.data.action === 'clearCaches') {
        clearAllCaches().then(() => {
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({ action: 'cachesCleared' });
            }
        });
    } else if (event.data && event.data.action === 'updateContent') {
        updateContent().then(() => {
            event.source.postMessage({ action: 'updateContentComplete' });
        });
    }
});

// Function to cache audio files
function cacheAudioFiles(audioFiles) {
    console.log('[Service Worker] Caching Audio Files:', audioFiles);
    return caches.open(AUDIO_CACHE_NAME).then(cache => {
        return Promise.all(audioFiles.map(file => {
            console.log(`[Service Worker] Fetching audio file: ${file}`);
            return fetch(file).then(response => {
                if (response.ok) {
                    console.log(`[Service Worker] Caching audio file: ${file}`);
                    return cache.put(file, response.clone());
                } else {
                    console.warn(`[Service Worker] Failed to fetch ${file}: ${response.status}`);
                }
            }).catch(error => {
                console.warn(`[Service Worker] Error fetching ${file}:`, error);
            });
        }));
    });
}

// Function to clear all caches
function clearAllCaches() {
    console.log('[Service Worker] Clearing all caches');
    return caches.keys().then(cacheNames => {
        return Promise.all(
            cacheNames.map(cache => {
                console.log('[Service Worker] Deleting cache:', cache);
                return caches.delete(cache);
            })
        );
    });
}

// Function to limit cache size
function limitCacheSize(cacheName, maxSize) {
    caches.open(cacheName).then(cache => {
        cache.keys().then(keys => {
            if (keys.length > maxSize) {
                cache.delete(keys[0]).then(() => {
                    console.log(`[Service Worker] Deleted oldest cache entry from ${cacheName}`);
                    limitCacheSize(cacheName, maxSize);
                });
            }
        });
    });
}

// Periodic Sync Event: Update content periodically
self.addEventListener('periodicsync', event => {
    if (event.tag === 'content-sync') {
        console.log('[Service Worker] Periodic Sync: Content Sync');
        event.waitUntil(updateContent());
    }
});

// Function to update content by fetching JSON files
function updateContent() {
    console.log('[Service Worker] Updating Content');
    const jsonFiles = [
        '/json/poetry.json',
        '/json/caliope.json',
        '/json/lupa.json',
        '/json/experiments.json',
        '/json/strands.json'
    ];

    return caches.open(STATIC_CACHE_NAME).then(cache => {
        return Promise.all(jsonFiles.map(url => {
            console.log(`[Service Worker] Fetching updated content: ${url}`);
            return fetch(url).then(response => {
                if (response.ok) {
                    console.log(`[Service Worker] Caching updated content: ${url}`);
                    return cache.put(url, response.clone());
                } else {
                    console.warn(`[Service Worker] Failed to fetch ${url}: ${response.status}`);
                }
            }).catch(error => {
                console.warn(`[Service Worker] Error fetching ${url}:`, error);
            });
        }));
    });
}
