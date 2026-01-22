self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('aqhi-cache').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './js/main.js',
        './js/purpleair.js',
        './js/click_engine.js',
        './history/sensor_compare.html'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});
