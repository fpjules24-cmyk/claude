// Donjons & Tractions — service worker : le jeu fonctionne hors connexion une fois chargé
const CACHE = 'dt-v2';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/util.js', 'js/data.js', 'js/data2.js', 'js/pixel.js', 'js/figure.js', 'js/audio.js', 'js/state.js', 'js/game.js', 'js/ui.js', 'js/battle.js',
  'js/scr_park.js', 'js/scr_sport.js', 'js/scr_skills.js', 'js/scr_hero.js', 'js/scr_dungeon.js', 'js/scr_market.js', 'js/scr_social.js', 'js/net.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // réseau d'abord (mises à jour), cache en secours (hors ligne)
  e.respondWith(
    fetch(e.request).then((res) => {
      const url = new URL(e.request.url);
      if ((res.ok && url.origin === location.origin) || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
