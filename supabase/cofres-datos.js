/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/cofres-datos.js
 *
 * Deja la Edge Function `cofres` al día con el juego:
 *
 *   node supabase/cofres-datos.js
 *
 *   · copia js/cofres-gen.js en supabase/functions/cofres/gen.js (el
 *     generador tiene que ser EL MISMO en los dos sitios);
 *   · escribe supabase/functions/cofres/datos.js con lo que el generador
 *     necesita de js/config.js (CFG.COFRES, los catálogos, el nivel, las
 *     maestrías y el rango), sacado con el propio datosDe() del generador.
 *
 * Después hay que desplegarla (supabase/desplegar-funcion.js cofres).
 * pruebas-node.js tiene un guardián que falla si alguno de los dos ficheros
 * no está al día, así que no se puede olvidar sin enterarse.
 * ============================================================ */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var RAIZ = path.join(__dirname, '..');
var DIR = path.join(__dirname, 'functions', 'cofres');

/* js/config.js y js/cofres-gen.js en un mundo aparte, sin navegador */
function cargar(raiz) {
  var sb = { console: console, Math: Math, JSON: JSON, Date: Date, Object: Object,
             Array: Array, String: String, Number: Number, RegExp: RegExp,
             parseInt: parseInt, parseFloat: parseFloat, isFinite: isFinite };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  ['config', 'cofres-gen'].forEach(function (n) {
    vm.runInContext(fs.readFileSync(path.join(raiz, 'js', n + '.js'), 'utf8'), sb,
      { filename: 'js/' + n + '.js' });
  });
  return sb.PM;
}

/* El texto de datos.js tal como debe estar */
function textoDatos(raiz) {
  var PM = cargar(raiz || RAIZ);
  var D = PM.CofresGen.datosDe(PM.CFG);
  return '/* GENERADO por supabase/cofres-datos.js desde js/config.js: no se toca a mano.\n' +
    ' * Lo que el generador de los cofres (gen.js) necesita del juego. */\n' +
    'export const DATOS = ' + JSON.stringify(D, null, 2) + ';\n';
}

/* El generador, sin diferencias de fin de línea (git puede cambiarlas) */
function textoGen(raiz) {
  return fs.readFileSync(path.join(raiz || RAIZ, 'js', 'cofres-gen.js'), 'utf8').replace(/\r\n/g, '\n');
}

module.exports = { cargar: cargar, textoDatos: textoDatos, textoGen: textoGen, DIR: DIR };

if (require.main === module) {
  fs.writeFileSync(path.join(DIR, 'gen.js'), textoGen());
  fs.writeFileSync(path.join(DIR, 'datos.js'), textoDatos());
  console.log('Al día: supabase/functions/cofres/gen.js y datos.js');
}
