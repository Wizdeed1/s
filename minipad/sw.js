/* MiniPad offline cache. VERSION and ASSETS are written by test/stamp.cjs. */
var VERSION = 'minipad-b60edbd86f';
var ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'css/app.css',
  'js/core.js',
  'vendor/NoSleep.min.js',
  'apps/chess.js',
  'apps/claude.js',
  'apps/dashboard.js',
  'apps/draw.js',
  'apps/drums.js',
  'apps/facetime.js',
  'apps/family.js',
  'apps/flashcards.js',
  'apps/focus.js',
  'apps/habits.js',
  'apps/kids.js',
  'apps/kitchen.js',
  'apps/meds.js',
  'apps/nightclock.js',
  'apps/notebook.js',
  'apps/piano.js',
  'apps/prompter.js',
  'apps/settings.js',
  'apps/sleep.js',
  'apps/sounds.js',
  'apps/sudoku.js',
  'apps/tips.js',
  'apps/wordsearch.js',
  'icons/icon-152.png',
  'icons/icon-167.png',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Only this site's own files; the server functions and other sites always go to the network.
  if (url.origin !== self.location.origin || url.pathname.indexOf('/api/') === 0) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then(function (hit) {
        return hit || fetch(req);
      }).catch(function () { return fetch(req); })
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req);
    })
  );
});
