# Todo PWA


## Cache Strategy

Network falling back to cache.

https://jakearchibald.com/2014/offline-cookbook/#network-falling-back-to-cache

### No Connection

In the case that the client does not have a connection, the requests fail very quickly before falling back to cache.

### Server Unavailable

When the server is unavailable, either due to flaky network or because the server itself is offline, requests fail 
after a time. The app will load data from cache, but the experience is far from ideal due to the delay between the
request being initiated and the cached data being presented.