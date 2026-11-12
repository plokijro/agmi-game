// Agmi – działanie offline: wszystkie pliki gry są zapisywane w pamięci telefonu.
// Po każdej zmianie gry podnieś numer wersji, żeby telefon pobrał nowe pliki.
const VERSION = 'agmi-v1';
const FILES = [
  './', './index.html', './logic.js', './audio.js', './game.js', './manifest.json',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  './characters/malePerson.png', './characters/femalePerson.png', './characters/maleAdventurer.png',
  './characters/femaleAdventurer.png', './characters/robot.png', './characters/zombie.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// najpierw sieć (żeby aktualizacje docierały od razu), a bez internetu – pamięć telefonu
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
