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
 * Post a message to all clients for this service worker.
 * In the future, events to the service worker will include a clientId, so we will be
 * able to target only the initiating client. For now, this sends to all (which means
 * if the user has multiple tabs of the site open, the message will go to all of them).
 *
 * @param message The message
 */
var postMessageToClients = function postMessageToClients(message) {
    self.clients.matchAll().then(function(clients) {
        var i;
        if (clients && clients.length) {
            for (i = 0; i < clients.length; i++) {
                clients[i].postMessage(message);
            }
        }
    });
};


var processOutbox = function clearOutbox(event) {
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

                    // show a notification, if the user has granted permission
                    if (Notification.permission === 'granted') {
                        self.registration.showNotification('Todo PWA', {
                            icon : '/images/TodoPWA.png',
                            body : 'Saved ' + message.item.name + '!'
                        });
                    }

                    // Post a message to the client(s) to update
                    postMessageToClients({
                        name : 'syncComplete',
                        item : message.item
                    });

                    // Clear the message from the outbox so it doesn't get processed again.
                    return store.outbox('readwrite').then(function (outbox) {
                        return outbox.delete(message.id);
                    });
                }).catch(function (error) {
                    console.log('[Service Worker] - sync failed', message.item);
                    postMessageToClients({
                        name : 'syncFailed',
                        item : message.item
                    });
                });
            }));
        })
    );
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

    // I noticed this was executing on a 'PUT', which caused some issues.
    // Limit to only 'GET' requests.
    if (e.request.method === 'GET') {

        if (isList) {

            // For the list request, let's go to the network first, and fall back to cache.
            // When the network request is complete, request and cache all of the individual
            // items.
            caches.open(dataCacheName).then(function (cache) {
                return fetch(e.request).then(function (response) {
                    console.log('[Service Worker] retrieved ' + url + ' from server. Caching.');
                    cache.put(url, response.clone()).then(function () {
                        cacheAllItems(url);
                    });
                    return response;

                }).catch(function () {
                    console.log('[Service Worker] returning ' + url + ' from cache');

                    // What happens when there's a cache miss, too?
                    return cache.match(url);
                });
            });

        } else {

            // For everything else, let's look in the cache first and then fall back to
            // the network. The static files and individual "to do" items should already
            // be in cache.
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
        console.log('[Service Worker] - syn initiated, processing outbox.')
        processOutbox(event);
    }
});

self.addEventListener('message', function(event) {
    if (event.data && event.data.name === 'clearOutbox') {
        console.log('[Service Worker] - message received, processing outbox.')
        processOutbox(event);
    }
});