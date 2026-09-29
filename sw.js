/* ============================================================
 * PAC-MAN TOP MUNDIAL â€” sw.js (service worker)
 *
 * Deja el juego instalable y jugable sin conexiÃ³n. Estrategia:
 *  - HTML, CSS y JS: red primero, y si falla, la copia guardada.
 *    Es lo que cambia en cada despliegue, asÃ­ que servir la copia
 *    primero dejaba el juego una visita entera con la versiÃ³n vieja.
 *  - audio e iconos: la copia al instante (no cambian nunca) y
 *    refresco por detrÃ¡s.
 *  - lo de fuera del dominio (Supabase: salas online y ranking)
 *    no se toca nunca: siempre va a la red.
 * ============================================================ */
'use strict';

var VERSION = 'pm-v319';
var SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './fonts/press-start-2p.woff2',
  './js/config.js',
  './js/letra.js',
  './js/audio.js',
  './js/sprites.js',
  './js/skins.js',
  './js/insignias.js',
  './js/emblemas.js',
  './js/trofeos.js',
  './js/portadas.js',
  './js/iconos.js',
  './js/pacman.js',
  './js/ghost.js',
  './js/net-config.js',
  './js/net-directo.js',
  './js/net.js',
  './js/party.js',
  './js/badges.js',
  './js/history.js',
  './js/level.js',
  './js/friends.js',
  './js/conectados.js',
  './js/ranking.js',
  './js/temporadas.js',
  './js/daily.js',
  './js/mazes.js',
  './js/achievements.js',
  './js/maestria.js',
  './js/celebrar.js',
  './js/rango.js',
  './js/stats.js',
  './js/tienda.js',
  './js/cofres-gen.js',
  './js/cofres.js',
  './js/pasos.js',
  './js/regalos.js',
  './js/pase.js',
  './js/ficha.js',
  './js/account.js',
  './js/retos.js',
  './js/versus.js',
  './js/habilidades.js',
  './js/jefe.js',
  './js/supervivencia.js',
  './js/caceria.js',
  './js/game.js',
  './js/replay.js',
  './js/clip.js',
  './js/guardado.js',
  './js/ui.js',
  './audio/desatado-intro.mp3',
  './audio/otra-alma.m4a',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* si algo no estÃ¡, se cachea al vuelo */ })
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
  if (url.origin !== self.location.origin) return;   // Supabase y demÃ¡s

  // CÃ³digo del juego (HTML, CSS, JS): red primero, copia como respaldo.
  // Con la copia primero, tras un despliegue seguÃ­as viendo la versiÃ³n
  // anterior hasta la siguiente visita.
  var esCodigo = (req.mode === 'navigate') ||
    /\.(?:html|css|js|json)(?:$|\?)/i.test(url.pathname);

  if (esCodigo) {
    /* Red primero, pero con PLAZO (28 sep): con una red que ni contesta ni
     * falla (la wifi de un bar, el metro) el juego se quedaba en negro hasta
     * que el navegador se rendía. Si la red no ha empezado a contestar en
     * ESPERA_RED_MS se sirve la copia; lo que llegue después se guarda igual
     * para la próxima vez. El plazo es hasta que llegan las cabeceras, no el
     * archivo entero: una red lenta pero viva sigue sirviendo lo nuevo.
     * Sin copia guardada se espera a la red lo que haga falta. */
    var red = fetch(req);
    // se clona ANTES de que la página lea el cuerpo (este then va primero)
    ev.waitUntil(red.then(function (res) {
      return (res && res.ok) ? guardar(req, res.clone()) : null;
    }).catch(function () { /* sin red: ya se sirvió la copia */ }));
    ev.respondWith(conPlazo(red, req));
    return;
  }

  // Audio e iconos: no cambian, asÃ­ que la copia al instante
  ev.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) guardar(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});

/* Cuánto se espera a que la red empiece a contestar antes de tirar de la
 * copia guardada */
var ESPERA_RED_MS = 2500;

/* La copia de respaldo: la del archivo, y para una página, el juego */
function respaldo(req) {
  return caches.match(req).then(function (hit) {
    return hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined);
  });
}

/* Lo primero que llegue: la red, o la copia si la red se pasa del plazo. Si
 * la red falla, la copia; si tampoco hay copia, el error de siempre. */
function conPlazo(red, req) {
  return new Promise(function (resolve) {
    var hecho = false;
    function dar(r) { if (!hecho && r) { hecho = true; resolve(r); } }
    var plazo = setTimeout(function () {
      respaldo(req).then(dar).catch(function () { /* sin copia: a esperar */ });
    }, ESPERA_RED_MS);
    red.then(function (res) {
      clearTimeout(plazo);
      dar(res);
    }, function () {
      clearTimeout(plazo);
      respaldo(req).then(function (hit) { dar(hit || Response.error()); },
        function () { dar(Response.error()); });
    });
  });
}

/* ¿Es la misma versión que la ya guardada? Por ETag, o si no hay, por
 * Last-Modified. Sin ninguna de las dos no se sabe: se guarda. */
function mismaVersion(guardada, nueva) {
  if (!guardada) return false;
  var a = guardada.headers.get('ETag'), b = nueva.headers.get('ETag');
  if (a && b) return a === b;
  a = guardada.headers.get('Last-Modified');
  b = nueva.headers.get('Last-Modified');
  return !!(a && b && a === b);
}

/* Guarda la respuesta, salvo que sea la misma que ya está: reescribir en
 * cada visita los ~50 archivos del juego sin que hayan cambiado era gastar
 * disco (y batería) para nada. */
function guardar(req, copia) {
  return caches.open(VERSION).then(function (c) {
    return c.match(req).then(function (hit) {
      if (mismaVersion(hit, copia)) {
        if (copia.body && copia.body.cancel) copia.body.cancel();   // no se lee
        return null;
      }
      return c.put(req, copia);
    });
  }).catch(function () { /* sin sitio en la caché: no pasa nada */ });
}
