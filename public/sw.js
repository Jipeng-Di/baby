const CACHE='baby-feeding-shell-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/icon-192.png','/icon-512.png','/manifest.webmanifest'])));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{const request=event.request;if(request.mode!=='navigate'||request.method!=='GET')return;event.respondWith(fetch(request).catch(async()=>{const cache=await caches.open(CACHE);return await cache.match('/offline.html')||Response.error();}));});
