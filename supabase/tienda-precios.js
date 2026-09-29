/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/tienda-precios.js
 *
 * Deja los PRECIOS del servidor al día con el juego:
 *
 *   node supabase/tienda-precios.js
 *
 * Escribe supabase/tienda-precios.sql con lo que el servidor necesita de
 * js/config.js para calcular el saldo igual que Tienda.saldo():
 *   · tienda_precios: cada pieza que se VENDE (Tienda.VENTA: ni las de
 *     cofre, ni las del pase, ni las del rango) con su precio;
 *   · tienda_datos: las monedas de salida, lo que paga cada galón del pase
 *     (acumulado) y cada fruta del rango (acumulado, por temporada), el
 *     escalón -> fruta del rango y las cuentas con ajustes a mano del rango.
 *
 * Después hay que ejecutar ese .sql en el proyecto (es idempotente: borra
 * lo que ya no se vende y pone el resto). Una prueba de js/tests.js y un
 * guardián de pruebas-node.js fallan si el .sql no está al día con el
 * catálogo, así que un precio nuevo no se puede olvidar sin enterarse.
 * ============================================================ */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var RAIZ = path.join(__dirname, '..');
var SALIDA = path.join(__dirname, 'tienda-precios.sql');

/* js/config.js en un mundo aparte, sin navegador */
function cargar(raiz) {
  var sb = { console: console, Math: Math, JSON: JSON, Date: Date, Object: Object,
             Array: Array, String: String, Number: Number, RegExp: RegExp,
             parseInt: parseInt, parseFloat: parseFloat, isFinite: isFinite };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(raiz || RAIZ, 'js', 'config.js'), 'utf8'), sb,
    { filename: 'js/config.js' });
  return sb.PM.CFG;
}

/* Lo que se VENDE, con la misma regla que js/tienda.js (meter / VENTA) */
function venta(CFG) {
  var out = [];
  function meter(lista) {
    (lista || []).forEach(function (it) {
      var deCofre = !!(it.cofre || it.grupo === 'cofre');
      var dePase = !!(it.pase || it.grupo === 'pase');
      if (deCofre || dePase || it.rango) return;
      out.push({ id: it.id, precio: Math.floor(it.precio || 0) });
    });
  }
  meter(CFG.EMOTES_TIENDA);
  meter(CFG.EFECTOS);
  meter(CFG.ACCESORIOS);
  meter((CFG.SKINS || []).filter(function (sk) { return sk.grupo === 'tienda'; }));
  out.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  return out;
}

/* Los datos del saldo (ver la cabecera) */
function datos(CFG) {
  var P = CFG.PASE, R = CFG.RANGO;
  /* el pase: lo que llevas cobrado al llegar a cada galón, gratis y pago
   * (js/pase.js, calculaMonedas: las monedas son las mismas cada mes) */
  var gratis = [0], pago = [0], g;
  var cam = (P.CAMINO || []).filter(function (e) { return e && e.g >= 1 && e.g <= P.GALONES; })
    .sort(function (a, b) { return a.g - b.g; });
  for (g = 1; g <= P.GALONES; g++) {
    var sg = gratis[g - 1], sp = pago[g - 1];
    cam.forEach(function (e) {
      if (e.g !== g) return;
      sg += Math.floor((e.gratis && e.gratis.monedas) || 0);
      sp += Math.floor((e.pago && e.pago.monedas) || 0);
    });
    gratis.push(sg);
    pago.push(sp);
  }
  /* el rango: cada escalón (rm - 1) en qué fruta cae (js/rango.js, TRAMOS) */
  var tramoDiv = [];
  R.DIVISIONES.forEach(function (D, d) {
    for (var j = 0; j < (D.escalones || 1); j++) tramoDiv.push(d);
  });
  /* ...y lo que llevas cobrado al llegar a cada fruta, por temporada
   * (premiosHasta). Una temporada sin entrada usa la última de antes; una
   * anterior a todas, la primera (premiosDe). */
  var premios = {};
  Object.keys(R.PREMIOS_TEMPORADA || {}).sort().forEach(function (t) {
    var tabla = R.PREMIOS_TEMPORADA[t], acum = [], s = 0;
    R.DIVISIONES.forEach(function (D) {
      s += Math.floor(tabla[D.id] || 0);
      acum.push(s);
    });
    premios[t] = acum;
  });
  /* las cuentas con PR puestos a mano (CFG.AJUSTES_CUENTA.rango): pueden
   * llegar a una fruta más de la que dicen sus contadores */
  var ajustes = {};
  var AJ = CFG.AJUSTES_CUENTA || {};
  Object.keys(AJ).sort().forEach(function (u) {
    if (AJ[u] && AJ[u].rango) ajustes[u.toUpperCase()] = Object.keys(AJ[u].rango).sort();
  });
  return {
    iniciales: Math.floor(CFG.TIENDA.INICIALES || 0),
    pase: { desde: String(P.DESDE), porGalon: P.POR_GALON, galones: P.GALONES,
            gratis: gratis, pago: pago },
    rango: { tramoDiv: tramoDiv, premios: premios },
    ajustes: ajustes
  };
}

function lit(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }

/* El texto de tienda-precios.sql tal como debe estar */
function texto(raiz) {
  var CFG = cargar(raiz);
  var V = venta(CFG), D = datos(CFG);
  var filas = V.map(function (x) { return '  (' + lit(x.id) + ', ' + x.precio + ')'; });
  var dat = ['iniciales', 'pase', 'rango', 'ajustes'].map(function (k) {
    return '  (' + lit(k) + ', ' + lit(JSON.stringify(D[k])) + '::jsonb)';
  });
  return [
    '-- ============================================================',
    '-- GENERADO por supabase/tienda-precios.js desde js/config.js: no se toca a mano.',
    '-- Lo que el servidor necesita para calcular el saldo de la TIENDA igual que',
    '-- Tienda.saldo() (ver supabase/tienda.sql, que va antes). Idempotente.',
    '-- ============================================================',
    '',
    'insert into public.tienda_precios (id, precio) values',
    filas.join(',\n'),
    'on conflict (id) do update set precio = excluded.precio;',
    '',
    '-- lo que ya no se vende, fuera',
    'delete from public.tienda_precios where id not in (',
    V.map(function (x) { return '  ' + lit(x.id); }).join(',\n'),
    ');',
    '',
    'insert into public.tienda_datos (clave, valor) values',
    dat.join(',\n'),
    'on conflict (clave) do update set valor = excluded.valor;',
    ''
  ].join('\n');
}

module.exports = { cargar: cargar, venta: venta, datos: datos, texto: texto, SALIDA: SALIDA };

if (require.main === module) {
  fs.writeFileSync(SALIDA, texto());
  console.log('Al día: supabase/tienda-precios.sql (' + venta(cargar()).length + ' piezas a la venta)');
}
