const CACHE = 'lista-compras-v1';
const ASSETS = [
  '/Lista-de-Compras/',
  '/Lista-de-Compras/index.html',
  '/Lista-de-Compras/importar.html',
  '/Lista-de-Compras/historico.html',
  '/Lista-de-Compras/js/db.js',
  '/Lista-de-Compras/js/padroes.js',
  '/Lista-de-Compras/js/app.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
