/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/reto.js
 * El RETO DE HOY: una partida idéntica para todo el mundo.
 * Define window.PM.Reto
 *
 * La gracia es que el azar del juego es reproducible
 * (Game.seedRnd): dándole la misma semilla a todos, los fantasmas
 * azules huyen igual y la fruta dura lo mismo en la partida de
 * cualquiera. Con los ajustes de siempre encima, dos marcas del
 * mismo día se pueden comparar de verdad.
 *
 * La fecha se saca en UTC a propósito: así el reto cambia a la vez
 * en todo el planeta y no hay quien lo juegue "dos veces" cruzando
 * la medianoche de su huso.
 *
 * Un intento al día: la marca se cierra en cuanto la partida
 * termina (o te sales), y a partir de ahí solo se puede mirar. Sin
 * conexión se juega igual y la marca se queda guardada aquí; se
 * envía sola la próxima vez que haya red.
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
      '/rest/v1/' + what;
  }

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  /* Lo guardado en este navegador: { f: fecha, p: puntos, n: nivel,
   * e: 1 si ya está en la clasificación del día } */
  function cargar() {
    try {
      var o = JSON.parse(localStorage.getItem(CFG.RETO.KEY));
      return (o && typeof o === 'object') ? o : null;
    } catch (e) { return null; }
  }

  function guardar(o) {
    try { localStorage.setItem(CFG.RETO.KEY, JSON.stringify(o)); }
    catch (e) { /* sin almacenamiento */ }
  }

  /* Nombre con el que se firma la marca (el mismo del resto del juego) */
  function miNombre() {
    var s = window.PM.settings || {};
    return String(s.nick1 || '').replace(/^ +| +$/g, '');
  }

  var Reto = {
    lastError: null,

    /* ---------- La fecha y su semilla ---------- */

    /* Fecha del reto (YYYY-MM-DD) en UTC */
    hoy: function (d) {
      d = d || new Date();
      return d.getUTCFullYear() + '-' + dos(d.getUTCMonth() + 1) + '-' +
        dos(d.getUTCDate());
    },

    /* Cómo se lee una fecha en pantalla (DD/MM/AAAA) */
    fmtFecha: function (fecha) {
      var p = String(fecha || '').split('-');
      return (p.length === 3) ? (p[2] + '/' + p[1] + '/' + p[0]) : String(fecha || '');
    },

    /* Semilla de un día. Es un revoltijo de las letras de la fecha acotado a
     * un millón: Game.seedRnd la multiplica por un número grande, y pasarse
     * de ahí perdería precisión y dejaría de ser reproducible. */
    semilla: function (fecha) {
      var s = String(fecha || this.hoy()), h = 2166136261;
      for (var i = 0; i < s.length; i++) {
        h = (h ^ s.charCodeAt(i)) >>> 0;
        h = (h * 16777619) >>> 0;
      }
      return (h % 1000000) + 1;
    },

    /* ---------- La partida del día ---------- */

    /* Opciones de la partida: un jugador, ajustes de siempre (los mismos
     * para todos) y la semilla del día. No se tocan velocidades ni vidas:
     * si cada uno jugara con los suyos, las marcas no valdrían nada. */
    opts: function (fecha) {
      fecha = fecha || this.hoy();
      var p = CFG.PRESETS.normal;
      return {
        players: 1,
        reto: true,
        retoFecha: fecha,
        seed: this.semilla(fecha),
        cfg: {
          ghostSpeedMult: p.ghostSpeedMult,
          pacSpeedMult: p.pacSpeedMult,
          frightMult: p.frightMult,
          startLives: p.startLives,
          startLevel: p.startLevel,
          livesMode: 'shared'
        }
      };
    },

    /* ---------- Tu intento de hoy ---------- */

    /* Tu marca de hoy, o null si aún no lo has jugado. Lo de otros días no
     * sirve para nada: el reto es el de hoy. */
    marca: function () {
      var o = cargar();
      return (o && o.f === this.hoy()) ? o : null;
    },

    hecho: function () { return !!this.marca(); },

    /* Cierra el intento del día con lo que se haya hecho. Solo la primera
     * vez: un reto, un intento. Devuelve la marca guardada o null si ya
     * estaba cerrada. */
    cerrar: function (puntos, nivel) {
      if (this.hecho()) return null;
      var o = {
        f: this.hoy(),
        p: Math.max(0, Math.floor(puntos || 0)),
        n: Math.max(1, Math.floor(nivel || 1)),
        e: 0
      };
      guardar(o);
      this.enviarPendiente();
      return o;
    },

    /* Borra el intento (solo lo usan las pruebas) */
    olvidar: function () {
      try { localStorage.removeItem(CFG.RETO.KEY); }
      catch (e) { /* sin almacenamiento */ }
    },

    /* ---------- Clasificación del día (Supabase) ---------- */

    configured: function () {
      var c = cfg();
      return !!(c.SUPABASE_URL && c.SUPABASE_KEY && window.fetch);
    },

    /* Manda tu marca si aún no está puesta. Silencioso: sin red, sin nombre
     * o sin credenciales la marca se queda aquí y ya se enviará. */
    enviarPendiente: function (cb) {
      var m = this.marca();
      if (!m || m.e || !(m.p > 0)) { if (cb) cb('NADA QUE ENVIAR'); return; }
      if (!this.configured()) { if (cb) cb('SIN CONFIGURAR'); return; }
      var nombre = miNombre();
      if (!nombre) { if (cb) cb('SIN NOMBRE'); return; }
      var R = window.PM.Ranking;
      if (R && R.nameAllowed && !R.nameAllowed(nombre)) {
        if (cb) cb('NOMBRE NO PERMITIDO');
        return;
      }
      this.submit({ fecha: m.f, nombre: nombre, puntos: m.p, nivel: m.n },
        function (err) {
          if (!err) { m.e = 1; guardar(m); }
          if (cb) cb(err);
        });
    },

    /* Envía una marca del día. cb(err) */
    submit: function (o, cb) {
      if (!this.configured()) { if (cb) cb('SIN CONFIGURAR'); return; }
      var pts = Math.floor(o.puntos || 0);
      if (!(pts > 0) || pts > CFG.RANKING.MAX_POINTS) {
        if (cb) cb('PUNTUACIÓN NO VÁLIDA');
        return;
      }
      var nombre = String(o.nombre == null ? '' : o.nombre).slice(0, CFG.NICK_MAX);
      if (!nombre) { if (cb) cb('SIN NOMBRE'); return; }
      var R = window.PM.Ranking;
      if (R && R.nameAllowed && !R.nameAllowed(nombre)) {
        if (cb) cb('NOMBRE NO PERMITIDO');
        return;
      }
      var row = {
        fecha: String(o.fecha || this.hoy()),
        nombre: nombre,
        puntos: pts,
        nivel: Math.max(1, Math.min(999, Math.floor(o.nivel || 1)))
      };
      var h = headers();
      h['Prefer'] = 'return=minimal';
      fetch(base(CFG.RETO.TABLE),
            { method: 'POST', headers: h, body: JSON.stringify(row) })
        .then(function (res) { if (cb) cb(res.ok ? null : 'ERROR ' + res.status); })
        .catch(function (e) { if (cb) cb(e.message || 'SIN CONEXIÓN'); });
    },

    /* Clasificación de un día. cb(err, filas) con
     * { nombre, puntos, nivel, creado_en } */
    top: function (fecha, cb) {
      var self = this;
      if (!this.configured()) { cb('SIN CONFIGURAR', null); return; }
      var url = base(CFG.RETO.VIEW) +
        '?select=nombre,puntos,nivel,creado_en' +
        '&fecha=eq.' + encodeURIComponent(fecha || this.hoy()) +
        '&order=puntos.desc,creado_en.asc' +
        '&limit=' + CFG.RETO.LIMIT;
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

    /* Tu puesto dentro de una lista ya ordenada (1..n), o 0 si no sales */
    puestoEn: function (rows, nombre) {
      nombre = String(nombre == null ? miNombre() : nombre).toUpperCase();
      if (!nombre) return 0;
      for (var i = 0; i < (rows || []).length; i++) {
        if (String(rows[i].nombre || '').toUpperCase() === nombre) return i + 1;
      }
      return 0;
    }
  };

  window.PM.Reto = Reto;
})();
