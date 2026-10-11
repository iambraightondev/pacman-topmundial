/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/correos-imagenes.js
 *
 * Las piezas de los correos con la pinta del juego: el marco de
 * recreativa (bombillas, líneas de tubo), el título a rayas y el
 * botón amarillo con su canto. Van como IMÁGENES porque Gmail no
 * carga letras propias: sin esto, la letra de máquina se queda en
 * Courier y el correo no parece del juego.
 *
 *   node supabase/correos-imagenes.js
 *
 * Deja los PNG en icons/correo/ (se publican con el juego y los
 * correos los piden a producción). Solo hay que volver a lanzarlo
 * si cambia un rótulo o el diseño; después, publicar y lanzar
 * supabase/correos.js.
 *
 * Los estilos son los de css/style.css (#prompt.arcade, tono
 * amarillo): si allí cambia el marco, se copia aquí.
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var chromium = require('playwright').chromium;
var P = require('./correos-piezas.js');

var raiz = path.join(__dirname, '..');
var salida = path.join(raiz, 'icons', 'correo');
var letra = fs.readFileSync(path.join(raiz, 'fonts', 'press-start-2p.woff2')).toString('base64');

var A = P.ANCHO;                    /* ancho del correo */
var B = 22;                         /* paso de las bombillas, como en el juego */
var M = (A - Math.floor(A / B) * B) / 2;   /* margen para que quepan enteras */

var css = '@font-face{font-family:"Press Start 2P";src:url(data:font/woff2;base64,' + letra + ') format("woff2");}' +
  '*{box-sizing:border-box;margin:0;padding:0}' +
  'body{background:transparent;font-family:"Press Start 2P",monospace;-webkit-font-smoothing:none}' +
  ':root{--bombilla:radial-gradient(circle,#ffe46b 0 3px,rgba(255,228,107,.25) 4px,transparent 6px);' +
  '--tubo:repeating-linear-gradient(0deg,rgba(0,0,0,.25) 0 2px,transparent 2px 4px)}' +
  '.pieza{width:' + A + 'px;position:relative;background:var(--tubo),' + P.FONDO + '}' +
  /* cabecera: resplandor azul arriba, bombillas arriba y a los lados */
  '#cabecera{height:' + (M + B * 8) + 'px;background:var(--tubo),' +
  'radial-gradient(ellipse at 50% 55%,rgba(22,22,96,.95) 0,rgba(5,5,26,0) 68%),' + P.FONDO + ';' +
  'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding-top:' + (M + B) + 'px}' +
  '#cabecera::before,#lado::before,#pie::before{content:"";position:absolute;inset:0;pointer-events:none}' +
  '#cabecera::before{background:var(--bombilla) ' + M + 'px ' + M + 'px/' + B + 'px ' + B + 'px repeat-x,' +
  'var(--bombilla) ' + M + 'px ' + M + 'px/' + B + 'px ' + B + 'px repeat-y,' +
  'var(--bombilla) ' + (A - M - B) + 'px ' + M + 'px/' + B + 'px ' + B + 'px repeat-y;' +
  'clip-path:inset(0 ' + M + 'px 0 ' + M + 'px)}' +
  '.logo{font-size:52px;letter-spacing:.06em;background:repeating-linear-gradient(180deg,#ffff00 0 .07em,#c9b600 .07em .1em);' +
  '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;' +
  'filter:drop-shadow(.06em .06em 0 #b8860b) drop-shadow(0 0 .35em rgba(255,255,0,.35))}' +
  '.sub{font-size:13px;letter-spacing:8px;color:#00ffff;text-shadow:0 0 10px rgba(0,255,255,.5);padding-left:8px}' +
  '#lado{height:' + (B * 2) + 'px}' +
  '#lado::before{background:var(--bombilla) ' + M + 'px 0/' + B + 'px ' + B + 'px repeat-y,' +
  'var(--bombilla) ' + (A - M - B) + 'px 0/' + B + 'px ' + B + 'px repeat-y}' +
  '#pie{height:' + (M + B * 2) + 'px}' +
  '#pie::before{background:var(--bombilla) ' + M + 'px ' + B + 'px/' + B + 'px ' + B + 'px repeat-x,' +
  'var(--bombilla) ' + M + 'px 0/' + B + 'px ' + B + 'px repeat-y,' +
  'var(--bombilla) ' + (A - M - B) + 'px 0/' + B + 'px ' + B + 'px repeat-y;' +
  'clip-path:inset(0 ' + M + 'px ' + M + 'px ' + M + 'px)}' +
  /* rótulos y botones: sueltos, con el fondo transparente */
  '.suelto{display:inline-block;padding:26px 30px 30px}' +
  '.rotulo{display:inline-block;padding:6px 4px;font-size:17px;letter-spacing:2px;line-height:1.7;color:#fff;text-align:center;' +
  'max-width:' + (A - 120) + 'px;text-shadow:0 0 12px rgba(255,255,255,.25)}' +
  '.rotulo.aviso{color:#ffb852;text-shadow:0 0 12px rgba(255,184,82,.35)}' +
  '.boton{display:inline-block;font-size:15px;letter-spacing:3px;color:#000;background:#ffff00;border:3px solid #ffff00;' +
  'padding:18px 26px 14px;box-shadow:0 6px 0 #b8860b,0 0 34px rgba(255,255,0,.5);white-space:nowrap}';

var cuerpo = '<div class="pieza" id="cabecera"><div class="logo">PAC-MAN</div><div class="sub">TOP MUNDIAL</div></div>' +
  '<div class="pieza" id="lado"></div><div class="pieza" id="pie"></div>' +
  Object.keys(P.ROTULOS).map(function (k) {
    return '<div><span class="rotulo' + (P.ROTULOS[k].aviso ? ' aviso' : '') + '" id="rotulo-' + k + '">' + P.ROTULOS[k].texto + '</span></div>';
  }).join('') +
  Object.keys(P.BOTONES).map(function (k) {
    return '<div><span class="suelto" id="boton-' + k + '"><span class="boton">' + P.BOTONES[k] + '</span></span></div>';
  }).join('');

(async function () {
  fs.mkdirSync(salida, { recursive: true });
  var nav = await chromium.launch();
  var pag = await nav.newPage({ viewport: { width: A + 80, height: 900 }, deviceScaleFactor: 2 });
  await pag.setContent('<!doctype html><meta charset="utf-8"><style>' + css + '</style>' + cuerpo);
  await pag.evaluate(function () { return document.fonts.ready; });
  var medidas = {};
  var ids = ['cabecera', 'lado', 'pie']
    .concat(Object.keys(P.ROTULOS).map(function (k) { return 'rotulo-' + k; }))
    .concat(Object.keys(P.BOTONES).map(function (k) { return 'boton-' + k; }));
  for (var i = 0; i < ids.length; i++) {
    var el = pag.locator('#' + ids[i]);
    var caja = await el.boundingBox();
    await el.screenshot({ path: path.join(salida, ids[i] + '.png'), omitBackground: !/^(cabecera|lado|pie)$/.test(ids[i]) });
    medidas[ids[i]] = { w: Math.round(caja.width), h: Math.round(caja.height) };
    console.log(ids[i], medidas[ids[i]].w + 'x' + medidas[ids[i]].h);
  }
  await nav.close();
  /* correos.js necesita el tamaño de cada pieza para ponerlo en el <img> */
  fs.writeFileSync(path.join(__dirname, 'correos-medidas.json'), JSON.stringify(medidas, null, 2) + '\n');
})();
