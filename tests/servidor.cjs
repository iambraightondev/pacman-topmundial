/* ============================================================
 * PAC-MAN TOP MUNDIAL — tests/servidor.cjs
 *
 * Servidor estático mínimo para abrir el juego y tests.html en local:
 *
 *   node tests/servidor.cjs [puerto]      (8264 si no se dice)
 *
 * Es el que arranca Playwright (playwright.config.cjs, webServer). Sirve
 * la raíz del repositorio con `Cache-Control: no-store`, para que el
 * navegador nunca pruebe una copia vieja de js/. No hace falta python:
 * en Windows el `python` del PATH suele ser el atajo de la tienda.
 * ============================================================ */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');

var raiz = path.resolve(__dirname, '..');
var puerto = parseInt(process.argv[2] || process.env.PORT || '8264', 10);
var TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

http.createServer(function (req, res) {
  var ruta;
  try { ruta = decodeURIComponent(req.url.split('?')[0]); } catch (e) { ruta = '/'; }
  if (ruta.endsWith('/')) ruta += 'index.html';
  var f = path.join(raiz, ruta);
  // nada fuera del repositorio
  if (f !== raiz && f.indexOf(raiz + path.sep) !== 0) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, function (err, datos) {
    if (err) { res.writeHead(404, { 'Cache-Control': 'no-store' }); res.end('no existe'); return; }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(datos);
  });
}).listen(puerto, '127.0.0.1', function () {
  console.log('sirviendo ' + raiz + ' en http://127.0.0.1:' + puerto + '/');
});
