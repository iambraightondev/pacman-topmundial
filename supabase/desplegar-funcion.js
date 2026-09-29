/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/desplegar-funcion.js
 *
 * Sube una Edge Function al proyecto del juego sin la CLI de Supabase
 * (que en este Windows no está), por la API de gestión:
 *
 *   SBP=<personal access token> node supabase/desplegar-funcion.js enviar-record
 *   SBP=<token> node supabase/desplegar-funcion.js cuenta
 *   SBP=<token> node supabase/desplegar-funcion.js cofres   (sube también gen.js y datos.js)
 *   SBP=<token> node supabase/desplegar-funcion.js regalos
 *
 * Con un tercer argumento sube ESE archivo en vez del del repositorio (para
 * volver a una versión anterior):
 *   git show e5ac575:supabase/functions/cuenta/index.ts > cuenta-vieja.ts
 *   SBP=<token> node supabase/desplegar-funcion.js cuenta cuenta-vieja.ts
 *
 * Las dos funciones del juego van con verify_jwt en FALSE a propósito: a
 * `cuenta` se llega sin sesión (esa es la gracia) y `enviar-record` mira el
 * token ella misma.
 * ============================================================ */
'use strict';

var fs = require('fs');
var path = require('path');

var REF = 'yghnwkifbmmhrpvtjjit';
var SBP = process.env.SBP;
var slug = process.argv[2];
var archivo = process.argv[3] ||
  path.join(__dirname, 'functions', String(slug || ''), 'index.ts');

if (!SBP || !slug) {
  console.log('Uso: SBP=<personal access token> node supabase/desplegar-funcion.js <funcion> [archivo]');
  process.exit(1);
}

var codigo = fs.readFileSync(archivo, 'utf8');
var form = new FormData();
form.append('metadata', JSON.stringify({
  name: slug, entrypoint_path: 'index.ts', verify_jwt: false
}));
form.append('file', new Blob([codigo], { type: 'application/typescript' }), 'index.ts');
/* Una función de VARIOS ficheros (la de `cofres` lleva el generador del
 * juego y sus datos al lado: gen.js y datos.js) sube también los demás .js y
 * .ts de su carpeta, con su nombre, para que el import './gen.js' encuentre
 * el suyo. Las de un solo fichero siguen igual. */
var carpeta = path.join(__dirname, 'functions', String(slug));
if (!process.argv[3] && fs.existsSync(carpeta)) {
  fs.readdirSync(carpeta).filter(function (f) {
    return /\.(js|ts)$/.test(f) && f !== 'index.ts';
  }).forEach(function (f) {
    form.append('file', new Blob([fs.readFileSync(path.join(carpeta, f), 'utf8')],
      { type: /\.ts$/.test(f) ? 'application/typescript' : 'application/javascript' }), f);
  });
}

fetch('https://api.supabase.com/v1/projects/' + REF + '/functions/deploy?slug=' +
      encodeURIComponent(slug), {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + SBP },
  body: form
}).then(function (res) {
  return res.text().then(function (t) {
    var d = null;
    try { d = JSON.parse(t); } catch (e) { d = null; }
    if (!res.ok) {
      console.log('NO SE PUDO (' + res.status + '): ' + t.slice(0, 500));
      process.exit(1);
    }
    console.log('Subida ' + slug + ': versión ' + (d && d.version) + ', estado ' + (d && d.status));
  });
}).catch(function (e) {
  console.log('NO SE PUDO: ' + e.message);
  process.exit(1);
});
