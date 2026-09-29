/* Monta el escaparate del pase de NOVIEMBRE reaprovechando el de octubre:
 * de aquel se quedan la hoja de estilos, las medidas y primitivas, los
 * ayudantes (globo, rastro, motor de muertes) y el pasillo; de aquí salen
 * la cabecera, las piezas, la muerte y el catálogo.
 *
 *   node build.js            -> vitrina-pase.html
 */
var fs = require('fs');
var path = require('path');
var AQUI = __dirname;
var OCT = path.join(AQUI, '..', 'pase-2026-10');

function leer(dir, f) { return fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n'); }

var css = leer(OCT, 'p-css.html').replace('<title>Pase de octubre</title>', '<title>Pase de noviembre</title>');
if (css.indexOf('<title>Pase de noviembre</title>') < 0) throw new Error('título');
/* un solo tema, el de la pantalla del juego: los controles nativos, en oscuro */
css = css.replace('  :root {\n', '  :root {\n    color-scheme: dark;\n');
if (css.indexOf('color-scheme: dark') < 0) throw new Error('color-scheme');

var salida = [
  css,
  leer(AQUI, 'p-html.html'),
  leer(OCT, 'p-base.js'),
  leer(OCT, 'p-helpers.js'),
  leer(AQUI, 'p-piezas.js'),
  leer(AQUI, 'p-muerte.js'),
  leer(AQUI, 'p-cat.js'),
  leer(OCT, 'p-motor.js')
].join('\n');

fs.writeFileSync(path.join(AQUI, 'vitrina-pase.html'), salida);
console.log('vitrina-pase.html', fs.statSync(path.join(AQUI, 'vitrina-pase.html')).size, 'bytes');
