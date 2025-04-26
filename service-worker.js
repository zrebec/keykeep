self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('keykeep-v2.0').then((cache) => {
      return cache.addAll(['index.html']);
    }),
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => {
      return resp || fetch(event.request);
    }),
  );
});
