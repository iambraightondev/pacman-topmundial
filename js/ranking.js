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

  function base(what) {
    return String(cfg().SUPABASE_URL || '').replace(/\/+$/, '') +
      '/rest/v1/' + (what || CFG.RANKING.TABLE);
  }

  /* Nombre normalizado para el filtro: sin espacios ni signos, y con las
   * sustituciones típicas (0 por O, 3 por E...) para que no se cuele. */
  function flatten(name) {
    return String(name || '').toUpperCase()
      .replace(/[0]/g, 'O').replace(/[1|!]/g, 'I').replace(/[3]/g, 'E')
      .replace(/[4@]/g, 'A').replace(/[5$]/g, 'S').replace(/[7]/g, 'T')
      .replace(/[^A-Z]/g, '');
  }

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  var Ranking = {
    lastError: null,

    /* Centésimas de segundo -> mm:ss.cc */
    fmtTime: function (cs) {
      cs = Math.max(0, Math.floor(cs || 0));
      var s = Math.floor(cs / 100);
      return dos(Math.floor(s / 60)) + ':' + dos(s % 60) + '.' + dos(cs % 100);
    },

    /* ¿este nombre puede aparecer en una clasificación pública? */
    nameAllowed: function (name) {
      var flat = flatten(name);
      if (!flat) return false;
      for (var i = 0; i < CFG.BAD_WORDS.length; i++) {
        if (flat.indexOf(CFG.BAD_WORDS[i]) !== -1) return false;
      }
      return true;
    },

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
      // la vista ya trae solo la mejor marca de cada jugador/dúo
      var url = base(CFG.RANKING.VIEW) +
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

    /* Los más rápidos en despejar el NIVEL 1 (solo individual). cb(err, filas)
     * Cada fila: { nombre1, tiempo1 (centésimas), puntos, creado_en } */
    topTime: function (cb) {
      var self = this;
      if (!this.configured()) { cb('SIN CONFIGURAR', null); return; }
      var url = base(CFG.RANKING.VIEW_TIME) +
        '?select=nombre1,tiempo1,puntos,creado_en' +
        '&order=tiempo1.asc,creado_en.asc' +
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
      if (!this.nameAllowed(n1) || (players === 2 && !this.nameAllowed(n2))) {
        if (cb) cb('NOMBRE NO PERMITIDO');
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
      // tiempo del primer nivel (centésimas): opcional, solo en individual
      if (o.tiempo1 != null) {
        var cs = Math.floor(o.tiempo1);
        if (players === 1 && cs > 0 && cs <= CFG.RANKING.MAX_TIME) row.tiempo1 = cs;
      }
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
