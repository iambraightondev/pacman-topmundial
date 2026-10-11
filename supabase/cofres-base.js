/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/cofres-base.js
 *
 * LA BASE DE LOS COFRES de las cuentas que ya existían (se corre UNA vez, al
 * poner los cofres en producción; repetirlo no hace nada):
 *
 *   SBP=<personal access token> node supabase/cofres-base.js [--probar]
 *
 * Los cofres NO se dan por lo jugado antes de que existieran (decidido el 28
 * sep): cada cuenta cuenta desde lo que tenía ese día. Esto lee todos los
 * perfiles, calcula su base con el MISMO generador que el juego y el servidor
 * (js/cofres-gen.js, baseAhora: partidas, semanas del DAILY, nivel de
 * jugador y escalones de maestría) y la escribe en `logros` (cofre_b_*),
 * solo en las cuentas que aún no la tienen. Las cuentas nuevas la reciben
 * del trigger al darse de alta (a cero: todo lo que suban cuenta).
 *
 * Con --probar no escribe nada: dice cuántas cuentas tocaría.
 * ============================================================ */
'use strict';

var datos = require('./cofres-datos.js');

var REF = 'uamaukghqakuhacfpdsf';
var SBP = process.env.SBP;
var PROBAR = process.argv.indexOf('--probar') !== -1;
if (!SBP) {
  console.log('Uso: SBP=<personal access token> node supabase/cofres-base.js [--probar]');
  process.exit(1);
}

function sql(q) {
  return fetch('https://api.supabase.com/v1/projects/' + REF + '/database/query', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + SBP, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q })
  }).then(function (res) {
    return res.text().then(function (t) {
      if (!res.ok) throw new Error(res.status + ' ' + t.slice(0, 300));
      return JSON.parse(t);
    });
  });
}

var PM = datos.cargar();
var G = PM.CofresGen, D = G.datosDe(PM.CFG);
var hoy = G.dia(Date.now());

sql("select id, usuario, xp, logros from public.perfiles " +
    "where coalesce(public.num(logros, 'cofre_b_dia'), 0) <= 0").then(function (filas) {
  console.log('Cuentas sin base: ' + filas.length);
  if (!filas.length || PROBAR) return null;
  var valores = filas.map(function (f) {
    var lg = (f.logros && typeof f.logros === 'object') ? f.logros : {};
    var b = G.baseAhora(lg, f.xp, hoy, D, f.usuario);
    var j = { cofre_b_dia: b.dia, cofre_b_partidas: b.partidas, cofre_b_semana: b.semana,
              cofre_b_nivel: b.nivel, cofre_b_mae: b.mae };
    return "('" + String(f.id).replace(/[^0-9a-f-]/gi, '') + "'::uuid, '" +
      JSON.stringify(j).replace(/'/g, "''") + "'::jsonb)";
  });
  /* de una vez; el where vuelve a mirar que no la tenga (por si en medio
   * alguien abrió un cofre y la función se la puso) */
  return sql('update public.perfiles p set logros = ' +
    "(case when jsonb_typeof(p.logros) = 'object' then p.logros else '{}'::jsonb end) || v.b " +
    'from (values ' + valores.join(', ') + ') as v(id, b) ' +
    "where p.id = v.id and coalesce(public.num(p.logros, 'cofre_b_dia'), 0) <= 0 " +
    'returning p.id').then(function (r) {
    console.log('Base puesta en ' + r.length + ' cuentas (día ' + hoy + ').');
  });
}).catch(function (e) {
  console.log('NO SE PUDO: ' + e.message);
  process.exit(1);
});
