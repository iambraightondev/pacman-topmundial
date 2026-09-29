/* Monta el escaparate de la tanda YŌKAI reaprovechando el de la tanda
 * extravagante: de aquel se quedan la página, las primitivas, el motor de las
 * muertes y la vitrina; se le cambian las piezas, el catálogo y la cabecera.
 *
 *   node build.js            -> vitrina.html (lo que se publica)
 *                               motor.js     (para render2.html)
 */
var fs = require('fs');
var path = require('path');
var AQUI = __dirname;
var VIEJA = path.join(AQUI, '..', 'vestuario-2026-09-18', 'vitrina.html');

function leer(f) { return fs.readFileSync(path.join(AQUI, f), 'utf8').replace(/\r\n/g, '\n'); }

var src = fs.readFileSync(VIEJA, 'utf8').replace(/\r\n/g, '\n').split('\n');
function linea(re, desde) {
  for (var i = (desde || 0); i < src.length; i++) if (re.test(src[i])) return i;
  throw new Error('no encuentro ' + re);
}
function trozo(a, b) { return src.slice(a, b).join('\n'); }

var iSkins  = linea(/^  var DRAW = \{\};$/) + 1;
var iCoraz  = linea(/^  function corazon\(/);
var iCaras  = linea(/^  \/\* Caras de los emotes nuevos/);
var iFoto   = linea(/^  var FOTO = 30, FH = FOTO \/ 2;$/);
var iMuert  = linea(/^  \/\* -+ Las ocho muertes/);
var iCat    = linea(/^  var CAT = \[$/);
var iFinCat = linea(/^  \];$/, iCat);
var iHash   = linea(/^  function hash\(n\)/);

/* ---- las piezas nuevas ---- */
var skins   = leer('y-skins.js') + '\n' + leer('y-skins2.js');
var resto   = leer('y-resto.js');
var puente  = leer('y-puente.js');
var muertes = leer('y-muertes.js');
var cat     = leer('y-cat.js');

var partes = [
  trozo(0, iSkins),          // página, estilos, primitivas y var DRAW = {}
  skins,
  trozo(iCoraz, iCaras),     // corazón, gota, estrella4, nota, globoEmote
  resto,
  puente,
  trozo(iFoto, iMuert),      // el motor de las muertes
  muertes,
  cat,
  trozo(iFinCat + 1, src.length)   // la vitrina: tarjetas, controles y dibujo
];

var salida = partes.join('\n');

/* La página vieja se descargó con el esqueleto que pone el publicador
 * (doctype, head, body): se quita, que lo vuelve a poner él. */
salida = salida.replace(/^<!doctype html>[\s\S]*?<body>\n/, '');

salida = salida
  .replace('<title>Vitrina de skins Top Mundial</title>', '<title>Tanda yōkai</title>')
  .replace('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap">\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@900&text=%E5%A6%96%E6%80%AA&display=swap">')
  .replace('    --mono: \'Courier Prime\', \'Courier New\', Courier, monospace;\n  }',
    '    --mono: \'Courier Prime\', \'Courier New\', Courier, monospace;\n' +
    '    --kanji: \'Noto Serif JP\', \'Yu Mincho\', \'Hiragino Mincho ProN\', serif;\n' +
    '    --shu: #ff4a3d;\n' +
    '    color-scheme: dark;\n  }\n' +
    '  h1 .kanji { font-family: var(--kanji); font-weight: 900; color: var(--shu); letter-spacing: 0; margin-left: .25em; font-size: .8em; }')
  .replace('position: sticky; top: 0; z-index: 5;', 'position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5;')
  .replace('<h1>Tanda extravagante</h1>', '<h1>Tanda yōkai<span class="kanji" lang="ja">妖怪</span></h1>')
  .replace(/<p class="lede">[\s\S]*?<\/p>/,
    '<p class="lede">Pac-Man nació en Japón, y esta tanda vuelve a casa: 28 piezas sacadas del folclore japonés. Diez yōkai que dejan la forma de Pac-Man, cada uno come a su manera, enseña su Q cada pocos segundos y, un poco después, cómo muere. Todo corre por un pasillo del juego a tamaño real, con lupa al lado. Cambie el color arriba para verlo con el de cualquier jugador.</p>')
  .replace(/<p class="tally">[\s\S]*?<\/p>/,
    '<p class="tally"><b>10</b> skins · <b>7</b> accesorios · <b>6</b> efectos · <b>5</b> emotes · <b>7</b> de ellas solo de cofre</p>')
  .replace(/<p>Las ocho son extravagantes[\s\S]*?<\/p>/,
    '<p>Diez yōkai: kitsune, tengu, kappa, oni, tanuki, daruma, maneki-neko, el paraguas y el farolillo encantados, y el namazu, el siluro de los terremotos. Siete se compran en la tienda y tres solo salen de un cofre. El dragón oriental se quedó fuera porque el juego ya tiene DRAGÓN.</p>')
  .replace(/<footer>[\s\S]*?<\/footer>/,
    '<footer>\n    <p>Dígame cuáles entran, cuáles se retocan y cuáles se descartan.</p>\n  </footer>')
  .replace('<p class="eyebrow">Pac-Man Top Mundial · vitrina de skins</p>',
    '<p class="eyebrow">Pac-Man Top Mundial · cuarta tanda de vestuario</p>');

if (/<!doctype/i.test(salida)) throw new Error('queda el esqueleto viejo');
if (salida.indexOf('Tanda yōkai<span') < 0) throw new Error('no se cambió la cabecera');

fs.writeFileSync(path.join(AQUI, 'vitrina.html'), salida);
console.log('vitrina.html', fs.statSync(path.join(AQUI, 'vitrina.html')).size, 'bytes');

/* motor.js: lo que render2.html necesita de la vitrina vieja */
var motor = [
  trozo(iHash, iHash + 1),
  trozo(iCoraz, iCaras),
  trozo(iFoto, iMuert)
].join('\n');
fs.writeFileSync(path.join(AQUI, 'motor.js'), motor);
