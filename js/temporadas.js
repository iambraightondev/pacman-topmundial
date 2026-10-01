/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/temporadas.js
 * El top mundial por temporadas. Define window.PM.Season
 *
 * Una temporada es un mes natural, y se calcula de la fecha de la
 * partida: no hay que abrir ni cerrar nada a mano, el 1 de cada mes
 * empieza sola. En la base de datos es una columna calculada de
 * `ranking.creado_en` (ver supabase/temporadas.sql), así que las
 * partidas de siempre entran solas en la temporada que les tocaba y
 * el HISTÓRICO (la vista de toda la vida) no pierde nada.
 *
 * El mes se saca en HORA DE PERÚ (CFG.RANKING.HUSO_H, UTC−5), igual
 * para todos y que en el servidor: si cada navegador lo calculara en su
 * huso, a fin de mes unos pedirían una temporada y otros otra. Hasta el
 * 30 sep iba en UTC y la temporada cambiaba a las 7 de la tarde en Perú.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  var MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO',
    'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  function cfg() { return window.PM.NET_CFG || {}; }

  function headers() {
    var k = cfg().SUPABASE_KEY;
    return {
      'apikey': k,
      'Authorization': 'Bearer ' + k,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  function base(what) {
    return String(cfg().SUPABASE_URL || '').replace(/\/+$/, '') +
      '/rest/v1/' + what;
  }

  /* la hora de Perú, para leerla con los getUTC… */
  function huso() { return ((CFG.RANKING && CFG.RANKING.HUSO_H) || 0) * 3600000; }
  function local(d) { return new Date((d ? d.getTime() : Date.now()) + huso()); }

  var Season = {
    lastError: null,

    /* Temporada en curso (AAAA-MM), en hora de Perú */
    actual: function (d) {
      var p = local(d);
      var m = p.getUTCMonth() + 1;
      return p.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m;
    },

    /* Cuándo empieza la temporada siguiente (ms): la medianoche del 1 en Perú */
    fin: function (d) {
      var p = local(d);
      return Date.UTC(p.getUTCFullYear(), p.getUTCMonth() + 1, 1) - huso();
    },

    /* La temporada de antes (AAAA-MM) */
    pasada: function (d) {
      var p = local(d);
      return this.actual(new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), 1) - huso() - 1));
    },

    /* Cómo se lee en pantalla: "AGOSTO 2026" */
    nombre: function (temporada) {
      var p = String(temporada || this.actual()).split('-');
      var m = parseInt(p[1], 10);
      if (!(m >= 1 && m <= 12)) return String(temporada || '');
      return MESES[m - 1] + ' ' + p[0];
    },

    configured: function () {
      var c = cfg();
      return !!(c.SUPABASE_URL && c.SUPABASE_KEY && window.fetch);
    },

    /* Mejor marca de cada jugador o equipo DENTRO de una temporada.
     * players: 1 individual, 2 dúo, 3 trío, 4 escuadra. cb(err, filas) con
     * las mismas columnas que el top de siempre, para que la lista se pinte
     * con el mismo código. */
    top: function (temporada, players, cb, mundo) {
      var self = this;
      var R = window.PM.Ranking;
      if (!this.configured()) { cb('SIN CONFIGURAR', null); return; }
      var n = R ? R.jugadores(players) : 1;
      var url = base(CFG.RANKING.VIEW_SEASON) +
        '?select=' + (R ? R.COLS : 'nombre1,nombre2,puntos,nivel,modo,creado_en') +
        '&jugadores=eq.' + n +
        '&mundo=eq.' + (R ? R.mundo(mundo) : 'clasico') +
        '&temporada=eq.' + encodeURIComponent(temporada || this.actual()) +
        '&order=puntos.desc,creado_en.asc' +
        '&limit=' + CFG.RANKING.LIMIT;
      fetch(url, { method: 'GET', headers: headers() })
        .then(function (res) {
          if (!res.ok) {
            return res.text().then(function (t) {
              throw new Error(res.status === 404 || /does not exist/i.test(t)
                ? 'FALTA LA TABLA EN SUPABASE'
                : 'ERROR ' + res.status);
            });
          }
          return res.json();
        })
        .then(function (rows) { self.lastError = null; cb(null, rows || []); })
        .catch(function (e) {
          self.lastError = e.message || 'SIN CONEXIÓN';
          cb(self.lastError, null);
        });
    }
  };

  window.PM.Season = Season;
})();
