/* Arma la vitrina nueva: cabecera y primitivas del artifact original,
 * y solo las piezas de la tanda del 18 de septiembre. */
const fs = require('fs');
const ORIG = process.argv[2];
const src = fs.readFileSync(ORIG, 'utf8').split('\n');
function slice(a, b) { return src.slice(a - 1, b).join('\n'); }

const partes = [
  slice(1, 183),                                       // doctype, título, estilos
  fs.readFileSync('v-html.html', 'utf8'),              // cabecera, barra, secciones, <script>
  slice(342, 538),                                     // medidas y primitivas
  fs.readFileSync('v-skins.js', 'utf8'),               // las ocho skins
  slice(2665, 2729),                                   // corazón, gota, estrella4, nota, globoEmote
  fs.readFileSync('v-resto.js', 'utf8'),               // emotes, efectos y accesorios
  slice(4214, 4312),                                   // la maquinaria de las muertes
  fs.readFileSync('v-muertes.js', 'utf8'),             // las ocho muertes
  fs.readFileSync('v-ui.js', 'utf8'),                  // catálogo, controles y dibujo
  '</script>\n</body></html>'
];
fs.writeFileSync('vitrina.html', partes.join('\n'));
console.log('vitrina.html', fs.statSync('vitrina.html').size, 'bytes');
