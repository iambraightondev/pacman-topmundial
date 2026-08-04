/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/ranking.js
 * Top mundial de partidas de dos jugadores.
 * Define window.PM.Ranking
 *
 * Habla directamente con PostgREST (la API REST de Supabase) con
 * la clave anónima, sin librerías. La tabla y sus permisos están
 * en supabase/ranking.sql: lectura e inserción públicas, nada de
 * borrar ni modificar.
 *
 * Ojo: al enviarse desde el navegador, una puntuación se puede
 * falsear. Para el uso de este juego se asume; endurecerlo pide
 * validar la partida en una Edge Function.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

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

  function base() {
    return String(cfg().SUPABASE_URL || '').replace(/\/+$/, '') +
      '/rest/v1/' + CFG.RANKING.TABLE;
  }

  var Ranking = {
    lastError: null,

    configured: function () {
      var c = cfg();
      return !!(c.SUPABASE_URL && c.SUPABASE_KEY && window.fetch);
    },

    /* Top de puntuaciones de una clasificación (players: 1 individual,
     * 2 dúo). cb(err, filas) */
    top: function (players, cb) {
      var self = this;
      if (!this.configured()) { cb('SIN CONFIGURAR', null); return; }
      var n = (players === 1) ? 1 : 2;
      var url = base() +
        '?select=nombre1,nombre2,puntos,nivel,modo,creado_en' +
        '&jugadores=eq.' + n +
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
    },

    /* Envía una partida terminada. Silencioso: si falla, el juego sigue.
     * o: { jugadores, modo, nombre1, nombre2, puntos, nivel }
     * Sin nombre no hay récord: se descarta antes de mandar nada. */
    submit: function (o, cb) {
      if (!this.configured()) { if (cb) cb('SIN CONFIGURAR'); return; }
      var pts = Math.floor(o.puntos || 0);
      if (!(pts > 0) || pts > CFG.RANKING.MAX_POINTS) {
        if (cb) cb('PUNTUACIÓN NO VÁLIDA');
        return;
      }
      var players = (o.jugadores === 1) ? 1 : 2;
      var n1 = String(o.nombre1 == null ? '' : o.nombre1).slice(0, CFG.NICK_MAX);
      var n2 = String(o.nombre2 == null ? '' : o.nombre2).slice(0, CFG.NICK_MAX);
      if (!n1 || (players === 2 && !n2)) {
        if (cb) cb('SIN NOMBRE');
        return;
      }
      var row = {
        jugadores: players,
        modo: (o.modo === 'online') ? 'online' : 'local',
        nombre1: n1,
        nombre2: (players === 2) ? n2 : null,
        puntos: pts,
        nivel: Math.max(1, Math.min(999, Math.floor(o.nivel || 1)))
      };
      var h = headers();
      h['Prefer'] = 'return=minimal';
      fetch(base(), { method: 'POST', headers: h, body: JSON.stringify(row) })
        .then(function (res) {
          if (cb) cb(res.ok ? null : 'ERROR ' + res.status);
        })
        .catch(function (e) { if (cb) cb(e.message || 'SIN CONEXIÓN'); });
    }
  };

  window.PM.Ranking = Ranking;
})();
