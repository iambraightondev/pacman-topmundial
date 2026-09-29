/* ============================================================
 * PAC-MAN TOP MUNDIAL — publicar.js
 *
 * Lo que corre Vercel al publicar (vercel.json → buildCommand), y
 * NADA más lo usa: para jugar y probar en local se sirve la carpeta tal
 * cual, sin paso previo.
 *
 *   node publicar.js [carpeta] [--con-pruebas]      (publicado/ si no se dice)
 *
 * Copia a la carpeta de salida lo que el juego necesita en el navegador
 * y minifica con esbuild cada .js y cada .css POR SEPARADO, con el mismo
 * nombre y en la misma ruta:
 *  - sin juntar ficheros: los scripts dependen del orden de carga de
 *    index.html y se hablan por window.PM;
 *  - sin renombrar nada del primer nivel (esbuild, sin `format`, no lo
 *    toca: podría usarlo otro script), solo lo de dentro de cada función;
 *  - sin estrenar sintaxis: la salida no pasa de ES2015, y el CSS no usa
 *    nada que no entiendan navegadores de 2017.
 *
 * Lo demás del repositorio (tests.html, tests/, propuestas/, supabase/,
 * capturas/, los .md...) no se publica. --con-pruebas añade tests.html y
 * js/tests.js (sin minificar: es la batería, no lo que se prueba) para
 * correr las pruebas contra el código minificado.
 *
 * Antes de dar la publicación por buena comprueba que están todos los
 * ficheros del SHELL de sw.js, los <script>/<link> de index.html y los
 * iconos del manifest, y que ningún nombre del primer nivel ha cambiado.
 * Si algo falla sale con código 1 y Vercel no publica.
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var esbuild = require('esbuild');

var raiz = __dirname;
var args = process.argv.slice(2);
var conPruebas = args.indexOf('--con-pruebas') >= 0;
var salida = path.resolve(raiz, args.filter(function (a) { return a.indexOf('--') !== 0; })[0] || 'publicado');

/* Lo que se publica: el juego y nada más */
var PUBLICO = ['index.html', 'manifest.json', 'sw.js', 'css', 'js', 'fonts', 'icons', 'audio'];
var PRUEBAS = ['tests.html', 'js/tests.js'];
var JS_TARGET = 'es2015';
var CSS_TARGET = ['chrome58', 'edge16', 'firefox57', 'safari11', 'ios11'];

var fallos = [];
function falla(m) { fallos.push(m); }

/* La salida se borra entera antes de empezar: dentro del repositorio solo
 * vale publicado/, para no llevarse por delante js/ o lo que sea por un
 * argumento mal puesto */
var dentro = path.relative(raiz, salida);
if (salida === raiz || raiz.indexOf(salida + path.sep) === 0 ||
    (dentro.indexOf('..') !== 0 && !path.isAbsolute(dentro) && dentro.split(path.sep)[0] !== 'publicado')) {
  console.error('publicar: dentro del repositorio la salida solo puede ser publicado/ (o una carpeta de fuera)');
  process.exit(1);
}
fs.rmSync(salida, { recursive: true, force: true });
fs.mkdirSync(salida, { recursive: true });

/* Todos los ficheros (rutas relativas, con /) de lo que se publica */
function listar(rel, out) {
  var abs = path.join(raiz, rel);
  if (fs.statSync(abs).isDirectory()) {
    fs.readdirSync(abs).sort().forEach(function (n) { listar(rel + '/' + n, out); });
  } else out.push(rel);
  return out;
}
var ficheros = [];
PUBLICO.forEach(function (r) { listar(r, ficheros); });
ficheros = ficheros.filter(function (f) { return conPruebas || PRUEBAS.indexOf(f) < 0; });
if (conPruebas) PRUEBAS.forEach(function (f) { if (ficheros.indexOf(f) < 0) ficheros.push(f); });

/* Nombres declarados en el primer nivel (columna 0): no pueden cambiar */
function primerNivel(src) {
  var out = [], re = /^(?:var|let|const|function)\s+([A-Za-z_$][\w$]*)/gm, m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

var cuenta = { js: [0, 0, 0, 0], css: [0, 0, 0, 0], otros: [0, 0, 0, 0] };
function br(buf) {
  return zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
}

ficheros.forEach(function (rel) {
  var src = fs.readFileSync(path.join(raiz, rel));
  var dst = path.join(salida, rel);
  var ext = path.extname(rel).toLowerCase();
  var out = src, tipo = 'otros';
  var sinTocar = conPruebas && PRUEBAS.indexOf(rel) >= 0;
  if (!sinTocar && (ext === '.js' || ext === '.css')) {
    tipo = ext.slice(1);
    var texto = src.toString('utf8');
    try {
      var r = esbuild.transformSync(texto, {
        loader: tipo, minify: true, charset: 'utf8', legalComments: 'none',
        target: tipo === 'js' ? JS_TARGET : CSS_TARGET, sourcefile: rel, logLevel: 'silent'
      });
      r.warnings.forEach(function (w) { console.warn('aviso en ' + rel + ': ' + w.text); });
      out = Buffer.from(r.code, 'utf8');
    } catch (e) {
      falla(rel + ': ' + ((e.errors && e.errors[0] && e.errors[0].text) || e.message));
      return;
    }
    if (tipo === 'js') {
      var min = r.code;
      primerNivel(texto).forEach(function (n) {
        // esbuild junta las declaraciones (var a=1,b=2): basta con que el
        // nombre siga ahí; si lo hubiera renombrado, no quedaría ni rastro
        if (!new RegExp('(?:^|[^\\w$.])' + n.replace(/\$/g, '\\$') + '(?![\\w$])').test(min)) {
          falla(rel + ': el nombre de primer nivel "' + n + '" no ha llegado igual');
        }
      });
    }
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, out);
  var c = cuenta[tipo];
  c[0] += src.length; c[1] += out.length;
  if (tipo !== 'otros') { c[2] += br(src); c[3] += br(out); }
});

/* Que no falte nada de lo que el juego pide */
function existe(rel) {
  rel = rel.replace(/^\.\//, '').split('?')[0].split('#')[0];
  if (rel === '') rel = 'index.html';
  return fs.existsSync(path.join(salida, rel));
}
var sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
var shell = sw.match(/var SHELL = \[([\s\S]*?)\];/);
if (!shell) falla('sw.js: no se encuentra la lista SHELL');
else (shell[1].match(/'[^']*'/g) || []).forEach(function (q) {
  var f = q.slice(1, -1);
  if (!existe(f)) falla('sw.js pide ' + f + ' y no se publica');
});
var html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8'), m;
var reHtml = /<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g;
while ((m = reHtml.exec(html))) {
  if (/^(?:data:|https?:|\/\/)/.test(m[1])) continue;
  if (!existe(m[1])) falla('index.html pide ' + m[1] + ' y no se publica');
}
if (!existe('sw.js')) falla('falta sw.js');
JSON.parse(fs.readFileSync(path.join(raiz, 'manifest.json'), 'utf8')).icons.forEach(function (i) {
  if (!existe(i.src)) falla('manifest.json pide ' + i.src + ' y no se publica');
});

if (fallos.length) {
  console.error('publicar: NO se publica —\n  ' + fallos.join('\n  '));
  process.exit(1);
}

function kb(n) { return (n / 1024).toFixed(1) + ' KB'; }
console.log('publicado en ' + path.relative(raiz, salida) + '/ (' + ficheros.length + ' ficheros' +
  (conPruebas ? ', con las pruebas' : '') + ')');
['js', 'css'].forEach(function (t) {
  var c = cuenta[t];
  console.log('  ' + t + ': ' + kb(c[0]) + ' -> ' + kb(c[1]) + '  (brotli ' + kb(c[2]) + ' -> ' + kb(c[3]) + ')');
});
console.log('  resto, sin tocar: ' + kb(cuenta.otros[0]));
