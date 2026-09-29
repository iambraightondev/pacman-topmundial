/* Sirve el escaparate en local, como lo verá el Artifact:
 *   node servir.js        -> http://localhost:8765/
 * La página (aperturas.html) va sin <!doctype> porque el Artifact la envuelve
 * al publicar; aquí se envuelve igual. /js/* sale de los js del juego. */
var http = require('http');
var fs = require('fs');
var path = require('path');
var AQUI = __dirname;
var JUEGO = path.join(AQUI, '..', '..');
var PUERTO = +process.env.PUERTO || 8765;

http.createServer(function (req, res) {
  var url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/' || url === '/index.html') {
    var html = fs.readFileSync(path.join(AQUI, 'aperturas.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
      '</head><body>' + html + '</body></html>');
    return;
  }
  if (/^\/js\/[\w-]+\.js$/.test(url)) {
    var f = path.join(JUEGO, url);
    if (fs.existsSync(f)) {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(f));
      return;
    }
  }
  res.writeHead(404);
  res.end('no');
}).listen(PUERTO, function () { console.log('http://localhost:' + PUERTO + '/'); });
