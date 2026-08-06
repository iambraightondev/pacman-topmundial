/* ============================================================
 * PAC-MAN TOP MUNDIAL — sw.js (service worker)
 *
 * Deja el juego instalable y jugable sin conexión. Estrategia:
 *  - HTML, CSS y JS: red primero, y si falla, la copia guardada.
 *    Es lo que cambia en cada despliegue, así que servir la copia
 *    primero dejaba el juego una visita entera con la versión vieja.
 *  - audio e iconos: la copia al instante (no cambian nunca) y
 *    refresco por detrás.
 *  - lo de fuera del dominio (Supabase: salas online y ranking)
 *    no se toca nunca: siempre va a la red.
 * ============================================================ */
'use strict';

var VERSION = 'pm-v19';
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
  './js/party.js',
  './js/badges.js',
  './js/history.js',
  './js/level.js',
  './js/friends.js',
  './js/ranking.js',
  './js/temporadas.js',
  './js/reto.js',
  './js/mazes.js',
  './js/achievements.js',
  './js/account.js',
  './js/versus.js',
  './js/game.js',
  './js/replay.js',
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

  // Código del juego (HTML, CSS, JS): red primero, copia como respaldo.
  // Con la copia primero, tras un despliegue seguías viendo la versión
  // anterior hasta la siguiente visita.
  var esCodigo = (req.mode === 'navigate') ||
    /\.(?:html|css|js|json)(?:$|\?)/i.test(url.pathname);

  if (esCodigo) {
    ev.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || (req.mode === 'navigate'
            ? caches.match('./index.html') : undefined);
        });
      })
    );
    return;
  }

  // Audio e iconos: no cambian, así que la copia al instante
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
