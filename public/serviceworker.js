importScripts('/js/idb.js');
importScripts('/js/store.js');

var cacheName     = 'TodoPWA';
var dataCacheName = 'TodoPWAData';
var filesToCache  = [
    '/index.html',
    '/app.js',
    '/js/idb.js',
    '/js/store.js',
    '/favicon.ico',
    '/style.css',
    '/images/TodoPWA.png',
    '/manifest.json'
];

/**
 * Get the "list" response from cache, loop through it and request
 * and cache each item.
 * @param url the URL for the list request (aka the cache key)
 */
var cacheAllItems = function cacheAllItems(url) {
    caches.open(dataCacheName).then(function(cache) {
        cache.match(url).then(function (cachedResponse) {
            cachedResponse.json().then(function (json) {
                var itemsToCache = [];
                json.forEach(function (item) {
                    itemsToCache.push('/todo/' + item._id);
                });
                console.log('[ServiceWorker] Caching items');
                return cache.addAll(itemsToCache);
            });
        });
    });
};

/**
 * Cache all the essential files.
 */
self.addEventListener('install', function(e) {
    console.log('[ServiceWorker] Install');
    e.waitUntil(
        caches.open(cacheName).then(function(cache) {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll(filesToCache);
        })
    );
});


/**
 * Activate. If this is a new version of the service worker, clear
 * the old caches.
 */
self.addEventListener('activate', function(e) {
    console.log('[ServiceWorker] Activate');
    e.waitUntil(
        caches.keys().then(function(keyList) {
            return Promise.all(keyList.map(function(key) {
                if (key !== cacheName && key !== dataCacheName) {
                    console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});


/**
 * Handle fetching cached resources or call server
 */
self.addEventListener('fetch', function(e) {
    var url = e.request.url;
    console.log('[Service Worker] Fetch', url);

    // if list/item, check cache
    var isList = url.match(/\/todos\//);
    var isItem = url.match(/\/todo\/\w*$/);

    // I noticed this was executing on a 'PUT', which caused some issues.
    // Limit to only 'GET' requests.
    if (e.request.method === 'GET') {

        if (isList || isItem) {

            // Getting the list of "to do" items, or a single item...
            e.respondWith(
                // open our data cache
                caches.open(dataCacheName).then(function (cache) {

                    // Attempt a network call. If it succeeds, cache the response
                    // and return. Otherwise, attempt a cache lookup.
                    return fetch(e.request).then(function (response) {
                        console.log('[Service Worker] retrieved ' + url + ' from server. Caching.');
                        cache.put(url, response.clone()).then(function () {
                            if (isList) {
                                cacheAllItems(url);
                            }
                        });
                        return response;

                    }).catch(function () {
                        console.log('[Service Worker] returning ' + url + ' from cache');

                        // What happens when there's a cache miss, too?
                        return cache.match(url);
                    });
                })
            );

        } else {

            // check cache for static resources
            e.respondWith(
                caches.match(e.request).then(function (response) {
                    return response || fetch(e.request);
                })
            );
        }
    }
});


/**
 * background sync events.
 * If a sync fails, the browser should retry.
 * Only Chrome supports this, but it doesn't seem to be working =(
 */
self.addEventListener('sync', function(event) {
    if (event.tag === 'outbox') {
        console.log('[Service Worker] - sync event');
        event.waitUntil(
            store.outbox('readonly').then(function (outbox) {
                return outbox.getAll();
            }).then(function (messages) {
                return Promise.all(messages.map(function (message) {
                    return fetch(message.url, {
                        credential : 'include',
                        method     : message.method,
                        body       : JSON.stringify(message.item),
                        headers    : {
                            'Accept'           : 'application/json',
                            'X-Requested-With' : 'XMLHttpRequest',
                            'Content-Type'     : 'application/json'
                        }
                    }).then(function (response) {
                        console.log('[Service Worker] - returning response');
                        return response.json();
                    }).then(function (data) {

                        console.log('[Service Worker] - background sync complete');

                        if (Notification.permission === 'granted') {
                            self.registration.showNotification('Todo PWA', {
                                icon : '/images/TodoPWA.png',
                                body : 'Saved ' + message.item.name + '!'
                            });
                        }

                        self.clients.matchAll().then(function(clients) {
                            var i;
                            if (clients && clients.length) {
                                for (i = 0; i < clients.length; i++) {
                                    console.log('[Service Worker] - Client : ' + JSON.stringify(clients[i]));
                                    clients[i].postMessage('complete');
                                }
                            }
                        });
                        return store.outbox('readwrite').then(function (outbox) {
                            return outbox.delete(message.id);
                        });
                    });
                }));
            })
        );
    }
});