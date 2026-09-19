/* Monta el escaparate de la tanda de OBJETOS reaprovechando el de la tanda
 * extravagante: de aquel se quedan la página, las primitivas, el motor de las
 * muertes y la vitrina; se le cambian las piezas y el catálogo.
 *
 *   node build.js            -> vitrina.html
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

/* ---- las piezas nuevas ---- */
var skins  = leer('m-skins.js') + '\n' + leer('m-skins2.js');
var resto  = leer('m-resto.js');
var muertes = leer('m-muertes.js');
var cat    = leer('m-cat.js');

/* Adaptadores: el resto está escrito como lo quiere el JUEGO (ACC.id, EFX.id,
 * caraMito) y la vitrina pinta por DRAW.id. Se enchufan aquí, que es de una vez
 * y así el día que entren al juego no hay que tocar nada. */
var puente = [
  '',
  '  /* ---- de la forma del juego a la de la vitrina ---- */',
  '  Object.keys(ACC).forEach(function (id) {',
  '    var dib = ACC[id];',
  '    DRAW[id] = function (ctx, o) {',
  '      body(ctx, o);',
  '      ctx.save(); frame(ctx, o.x, o.y, o.d); dib(ctx, o); ctx.restore();',
  '    };',
  '  });',
  '  Object.keys(EFX).forEach(function (id) {',
  '    var dib = EFX[id];',
  '    DRAW[id] = function (ctx, o) { dib(ctx, o, function () { body(ctx, o); }); };',
  '  });',
  "  ['oraculo', 'petrificado', 'divino', 'maldicion', 'invocando'].forEach(function (id) {",
  "    DRAW['emo_' + id] = function (ctx, o) {",
  '      body(ctx, o);',
  '      globoEmote(ctx, o.x, o.y - 11, o.c, o.t * 60, function (cx, cy, r) {',
  '        caraMito(ctx, cx, cy, r, o.c, id, o.t * 60);',
  '      });',
  '    };',
  '  });',
  ''
].join('\n');

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

/* la cabecera habla de la tanda anterior: se pone al día */
salida = salida
  .replace('<title>Vitrina de skins Top Mundial</title>',
           '<title>Vitrina de mitología Top Mundial</title>')
  .replace('<h1>Tanda extravagante</h1>', '<h1>Tanda de mitología</h1>')
  .replace(/<p class="lede">[\s\S]*?<\/p>/,
    '<p class=\'lede\'>Las 28 piezas de la tanda de mitología: diez criaturas sacadas de los mitos —dos de ellas solo en Halloween—, siete accesorios, seis efectos y cinco emotes. Cada skin deja la forma de Pac-Man, come a su manera, tiene su Q y su propia muerte. Todo corre por un pasillo del juego a tamaño real, con lupa al lado.</p>')
  .replace(/<p class="tally">[\s\S]*?<\/p>/,
    '<p class=\'tally\'><b>10</b> skins · <b>7</b> accesorios · <b>6</b> efectos · <b>5</b> emotes · <b>5</b> de cofre · <b>2</b> de Halloween</p>')
  .replace('<h2>Skins · 1.500</h2>', '<h2>Skins · 1.500</h2>')
  .replace(/<p>Las ocho son extravagantes[\s\S]*?<\/p>/,
    '<p>Diez criaturas de los mitos: medusa, cíclope, golem, esfinge, ícaro, fénix, genio y tritón, más LA PARCA y el JINETE SIN CABEZA, que solo salen en Halloween.</p>');

fs.writeFileSync(path.join(AQUI, 'vitrina.html'), salida);
console.log('vitrina.html', fs.statSync(path.join(AQUI, 'vitrina.html')).size, 'bytes');
