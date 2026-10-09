/* ============================================================
 * PAC-MAN TOP MUNDIAL — laboratorio/servidor.js
 *
 * EL LABORATORIO: el juego servido en local para probar cosas, con un
 * panel de trucos encima (laboratorio/panel.js). Se abre con
 * laboratorio.bat, o con:   node laboratorio/servidor.js
 *
 * AISLADO DE PRODUCCIÓN, y no por un ajuste que haya que acordarse de
 * poner: este servidor entrega OTRO js/net-config.js, sin Supabase. El
 * juego que corre aquí no tiene a dónde subir repeticiones, récords ni
 * rango, ni al cargar ni al salir. Además:
 *   · va en su puerto (8265): su almacén no es el del juego de verdad;
 *   · nada se cachea (no-store) y el service worker que entrega se borra
 *     a sí mismo: siempre se ve el código que hay en disco;
 *   · la party funciona entre pestañas de este navegador (?red=local).
 *
 * No se publica: publicar.js solo copia lo del juego.
 * ============================================================ */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');

var RAIZ = path.resolve(__dirname, '..');
var PUERTO = parseInt(process.env.PUERTO, 10) || 8265;
var TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json'
};

/* Sin Supabase: nada sale de esta máquina */
var NET_CONFIG = "(function () {\n  'use strict';\n  window.PM = window.PM || {};\n" +
  "  window.PM.NET_CFG = { SUPABASE_URL: '', SUPABASE_KEY: '' };\n  window.PM_LABORATORIO = true;\n})();\n";

/* Un service worker que se quita de en medio (por si quedó uno de antes) */
var SW_NULO = "self.addEventListener('install', function () { self.skipWaiting(); });\n" +
  "self.addEventListener('activate', function (e) {\n" +
  "  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })\n" +
  "    .then(function () { return self.registration.unregister(); }));\n});\n";

function portada() {
  var html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  /* fuera el registro del service worker, y dentro el panel */
  html = html.replace(/navigator\.serviceWorker\.register\('sw\.js'\)/, 'Promise.resolve()');
  return html.replace(/<\/body>/i,
    '  <link rel="stylesheet" href="/laboratorio/panel.css">\n' +
    '  <script src="/laboratorio/panel.js"></script>\n</body>');
}

function enviar(res, codigo, tipo, cuerpo) {
  res.writeHead(codigo, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  res.end(cuerpo);
}

http.createServer(function (req, res) {
  var ruta;
  try { ruta = decodeURIComponent(req.url.split('?')[0]); } catch (e) { return enviar(res, 400, 'text/plain', 'mal'); }
  if (ruta === '/' || ruta === '/index.html') return enviar(res, 200, TIPOS['.html'], portada());
  if (ruta === '/js/net-config.js') return enviar(res, 200, TIPOS['.js'], NET_CONFIG);
  if (ruta === '/sw.js') return enviar(res, 200, TIPOS['.js'], SW_NULO);
  var abs = path.normalize(path.join(RAIZ, ruta));
  if (abs.indexOf(RAIZ + path.sep) !== 0) return enviar(res, 403, 'text/plain', 'fuera');
  fs.readFile(abs, function (err, datos) {
    if (err) return enviar(res, 404, 'text/plain', 'no existe');
    enviar(res, 200, TIPOS[path.extname(abs).toLowerCase()] || 'application/octet-stream', datos);
  });
}).on('error', function (e) {
  if (e.code === 'EADDRINUSE') {
    console.log('El laboratorio ya estaba abierto en http://localhost:' + PUERTO + '/?red=local');
    process.exit(0);
  }
  throw e;
}).listen(PUERTO, '127.0.0.1', function () {
  console.log('LABORATORIO en http://localhost:' + PUERTO + '/?red=local');
  console.log('Aislado de producción: aquí no hay Supabase. Cierra esta ventana para apagarlo.');
});
