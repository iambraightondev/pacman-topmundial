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
 *
 * QUIÉN GUARDA EL INTENTO. Este navegador se acuerda de lo suyo,
 * pero el que manda es el SERVIDOR: la tabla tiene un único hueco
 * por nombre y día (índice único en supabase/reto.sql), así que la
 * segunda marca del día la rechaza la base de datos. Antes esto se
 * decidía solo aquí, y bastaba con jugar en el PC y otra vez en el
 * móvil para mandar la mejor de las dos: para una clasificación que
 * presume de ser la misma partida para todo el mundo, eso la vacía
 * por dentro.
 *
 * Y para no gastarle a nadie una partida que no iba a contar,
 * `sincronizar()` pregunta ANTES de jugar si el hueco de hoy ya está
 * ocupado; si lo está, la marca de allí se copia aquí y el juego se
 * comporta igual que si se hubiera jugado en este navegador.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  /* Lo que contesta el envío cuando el intento del día ya estaba gastado.
   * Es un aviso, no un fallo: la marca sigue guardada aquí. */
  var DUPLICADO = 'YA TIENES MARCA DE HOY';

  /* Y lo que contesta cuando el nombre es de una cuenta y quien manda la marca
   * no ha entrado en ella. Los nombres sin cuenta no dan este aviso nunca. */
  var AJENO = 'ESE NOMBRE ES DE UNA CUENTA: ENTRA PARA MANDAR TU MARCA';

  function cfg() { return window.PM.NET_CFG || {}; }

  /* Con sesión se habla con el token de la cuenta, no con la clave anónima:
   * así el servidor sabe QUIÉN manda la marca y puede impedir que alguien
   * firme con el nombre de otro (y le queme el intento del día). Sin cuenta
   * se sigue jugando igual, con la clave anónima de siempre. */
  function headers() {
    var k = cfg().SUPABASE_KEY;
    var A = window.PM.Account;
    var tok = (A && A.logged && A.logged()) ? A.token : null;
    return {
      'apikey': k,
      'Authorization': 'Bearer ' + (tok || k),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  function base(what) {
    return String(cfg().SUPABASE_URL || '').replace(/\/+$/, '') +
      '/rest/v1/' + what;
  }

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  /* ¿El servidor dice que el hueco de hoy ya estaba ocupado?
   *
   * El índice único (fecha, nombre) de supabase/reto.sql lo devuelve PostgREST
   * como 409. Se mira también el cuerpo: un proyecto que todavía no haya
   * corrido el SQL nuevo tiene el freno viejo (un trigger que levantaba una
   * excepción al tercer envío), y ahí el número que llega es otro. */
  function esDuplicado(status, cuerpo) {
    var t = String(cuerpo || '');
    return status === 409 || /23505|duplicate key|ya hay marcas/i.test(t);
  }

  /* ¿Y el nombre es de una cuenta ajena? La política de RLS lo corta antes de
   * escribir, y PostgREST lo devuelve como 403 (o 42501 en el cuerpo). */
  function esAjeno(status, cuerpo) {
    return status === 403 || /42501|row-level security/i.test(String(cuerpo || ''));
  }

  /* Lo guardado en este navegador: { f: fecha, p: puntos, n: nivel,
   * e: 1 si ya está en la clasificación del día,
   * otro: 1 si la marca de la clasificación se hizo en otro aparato } */
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
     * estaba cerrada.
     *
     * La fecha es la del RETO QUE SE JUGÓ, no la de ahora mismo: una
     * partida empezada a las 23:59 UTC termina ya en el día siguiente, y
     * apuntarla en el de hoy le colgaría al jugador una marca de un
     * laberinto de fantasmas que no es el de hoy (y le gastaría el
     * intento). */
    cerrar: function (puntos, nivel, fecha) {
      fecha = fecha || this.hoy();
      var previo = cargar();
      if (previo && previo.f === fecha) return null;
      var o = {
        f: fecha,
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
          else if (err === DUPLICADO) {
            /* El hueco del día ya estaba ocupado: o se jugó en otro aparato,
             * o es esta misma marca, que llegó y cuyo acuse se perdió. En los
             * dos casos se deja de reintentar; volver a mandarla no la va a
             * hacer entrar, y el aviso de "SIN ENVIAR" solo confundiría. */
            m.e = 1;
            m.otro = 1;
            guardar(m);
          }
          if (cb) cb(err);
        });
    },

    /* ---------- Tu intento de hoy, según el servidor ----------
     *
     * Un intento al día vale poco si lo decide cada navegador por su cuenta.
     * El hueco del día lo guarda la base de datos; aquí se pregunta si ya
     * está ocupado y, si lo está, la marca se copia a este navegador para que
     * el juego lo sepa antes de dejar jugar (y no gastar una partida que el
     * servidor iba a rechazar de todos modos).
     *
     * Silencioso a propósito: sin red, sin nombre o sin credenciales manda lo
     * de este navegador, que es como funcionaba antes. cb(err, marca).
     *
     * Sin candado de "ya estoy preguntando" a posta: es una consulta de
     * lectura y repetirla no cuesta nada, mientras que un candado que se
     * quedara puesto (una petición que no vuelve nunca, que en un móvil pasa)
     * dejaría el reto sin comprobar el resto de la sesión. */
    sincronizar: function (cb) {
      var m = this.marca();
      if (m) { if (cb) cb(null, m); return; }        // aquí ya se sabe
      if (!this.configured()) { if (cb) cb('SIN CONFIGURAR', null); return; }
      var nombre = miNombre().toUpperCase();
      if (!nombre) { if (cb) cb('SIN NOMBRE', null); return; }
      var fecha = this.hoy();
      /* La vista trae el nombre ya normalizado (`jugador`), que es por donde
       * mira el hueco la base de datos: así ANA y ana son el mismo jugador
       * aquí y allí. */
      var url = base(CFG.RETO.VIEW) + '?select=puntos,nivel' +
        '&fecha=eq.' + encodeURIComponent(fecha) +
        '&jugador=eq.' + encodeURIComponent(nombre) +
        '&limit=1';
      fetch(url, { method: 'GET', headers: headers() })
        .then(function (res) {
          if (!res.ok) throw new Error('ERROR ' + res.status);
          return res.json();
        })
        .then(function (rows) {
          if (!rows || !rows.length) { if (cb) cb(null, null); return; }
          var r = rows[0];
          var g = {
            f: fecha,
            p: Math.max(0, Math.floor(r.puntos || 0)),
            n: Math.max(1, Math.floor(r.nivel || 1)),
            e: 1,        // en la clasificación ya está
            otro: 1      // pero no se jugó en este navegador
          };
          guardar(g);
          if (cb) cb(null, g);
        })
        .catch(function (e) {
          if (cb) cb(e.message || 'SIN CONEXIÓN', null);
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
        .then(function (res) {
          if (res.ok) { if (cb) cb(null); return null; }
          /* El único hueco del día es de quien llegue primero: si ya hay marca
           * tuya, la base de datos rechaza esta y se dice con todas las letras
           * en vez de soltar un número. */
          return res.text().then(function (t) {
            if (!cb) return;
            cb(esDuplicado(res.status, t) ? DUPLICADO :
               esAjeno(res.status, t) ? AJENO :
               'ERROR ' + res.status);
          });
        })
        .catch(function (e) { if (cb) cb(e.message || 'SIN CONEXIÓN'); });
    },

    /* Los dos avisos con nombre, para quien los tenga que comparar */
    DUPLICADO: DUPLICADO,
    AJENO: AJENO,

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
