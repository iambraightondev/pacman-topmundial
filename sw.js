/* ============================================================
 * PAC-MAN TOP MUNDIAL — sw.js (service worker)
 *
 * Deja el juego instalable y jugable sin conexión. Estrategia:
 *  - navegaciones (el HTML): red primero, y si falla, la copia
 *    guardada. Así una versión nueva se ve al momento y sin red
 *    se sigue pudiendo jugar.
 *  - resto de archivos del juego: se sirve la copia al instante y
 *    se refresca por detrás (stale-while-revalidate).
 *  - lo de fuera del dominio (Supabase: salas online y ranking)
 *    no se toca nunca: siempre va a la red.
 * ============================================================ */
'use strict';

var VERSION = 'pm-v1';
var SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/audio.js',
  './js/sprites.js',
  './js/pacman.js',
  './js/ghost.js',
  './js/net-config.js',
  './js/net.js',
  './js/badges.js',
  './js/history.js',
  './js/ranking.js',
  './js/game.js',
  './js/ui.js',
  './audio/racha1-hueso.m4a',
  './audio/racha2-diablo.m4a',
  './audio/racha3-huesaso.m4a',
  './audio/racha4-diablocono.m4a',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* si algo no está, se cachea al vuelo */ })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return (k === VERSION) ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;   // Supabase y demás

  // El HTML: red primero para no servir una versión vieja del juego
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Resto: copia al instante y actualización por detrás
  ev.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
