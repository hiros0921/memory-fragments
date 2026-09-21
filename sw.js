// Retire the legacy offline app shell. Leave localStorage and IndexedDB diaries intact.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => /^memory-fragments-v\d+$/.test(key)).map(key => caches.delete(key)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
// No fetch handler: authenticated photos must never be cached by a worker.
