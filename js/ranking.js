/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/ranking.js
 * Top mundial: una clasificación por formato (1, 2, 3 y 4 jugadores).
 * Define window.PM.Ranking
 *
 * LEER: habla directamente con PostgREST (la API REST de Supabase)
 * con la clave anónima, sin librerías. La lectura es pública.
 *
 * ESCRIBIR: ya NO. Las partidas se mandan a la Edge Function
 * `enviar-record`, que las valida antes de guardarlas y es la
 * única que puede escribir en la tabla (supabase/ranking-integridad.sql
 * le quita el insert a la clave anónima). Antes cualquiera podía
 * abrir la consola del navegador y meterse 999999 puntos.
 *
 * Si la función todavía no está desplegada, el envío falla con un
 * aviso claro y la partida sigue igual: el top mundial es un extra,
 * no puede tumbar el juego.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  var FUNCION = 'enviar-record';   // Edge Function que valida y guarda

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

  /* Dirección de una Edge Function del mismo proyecto */
  function fnUrl(nombre) {
    return String(cfg().SUPABASE_URL || '').replace(/\/+$/, '') +
      '/functions/v1/' + nombre;
  }

  /* ---------- Techo de puntos ----------
   * Lo máximo que se puede sacar de un nivel, con las tablas de js/config.js:
   *   240 pastillas de 10 + 4 energizantes de 50            = 2600
   *   4 energizantes x cadena 200+400+800+1600              = 12000
   *   2 frutas del nivel (CFG.FRUIT_DOTS son dos apariciones)
   * Un fantasma comido vuelve a casa como ojos, así que dentro del mismo
   * energizante no se repite: cuatro como mucho.
   *
   * Es la MISMA cuenta que hace la Edge Function. Aquí sirve para no gastar
   * una petición en un envío que se va a rechazar; quien manda es el servidor.
   * El margen del 10% es para no tirar nunca una partida jugada de verdad. */
  var PUNTOS_NIVEL = 240 * 10 + 4 * 50 + 4 * (200 + 400 + 800 + 1600);
  var MARGEN = 1.1;

  function puntosFruta(nivel) {
    if (nivel === 1) return 100;
    if (nivel === 2) return 300;
    if (nivel <= 4) return 500;
    if (nivel <= 6) return 700;
    if (nivel <= 8) return 1000;
    if (nivel <= 10) return 2000;
    if (nivel <= 12) return 3000;
    return 5000;
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
    lastSubmitError: null,     // por qué no entró la última partida enviada

    /* Columnas de una fila de clasificación. Los nombres son cuatro porque
     * hay una clasificación por formato: individual, dúo, trío y escuadra. */
    COLS: 'nombre1,nombre2,nombre3,nombre4,puntos,nivel,modo,creado_en',

    /* Clasificación a la que va una partida (1..4) */
    jugadores: function (players) {
      var n = Math.floor(players || 1);
      return (n >= 1 && n <= CFG.MAX_PLAYERS) ? n : 1;
    },

    /* Nombre de un formato, para los rótulos */
    formato: function (players) {
      return ['INDIVIDUAL', 'DÚO', 'TRÍO', 'ESCUADRA'][this.jugadores(players) - 1];
    },

    /* Los nombres de una fila, en orden y sin los huecos */
    nombresDe: function (fila) {
      var out = [];
      for (var i = 1; i <= CFG.MAX_PLAYERS; i++) {
        var n = fila['nombre' + i];
        if (n) out.push(String(n).toUpperCase());
      }
      return out;
    },

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

    /* Techo de puntos de una partida que empezó en el nivel `desde` (1 si no
     * se dice) y llegó al `nivel`. Por encima de esto, o hay trampa o hay un
     * error: en ninguno de los dos casos entra en el top mundial. */
    maxPuntos: function (nivel, desde) {
      var hasta = Math.max(1, Math.floor(nivel || 1));
      var ini = Math.max(1, Math.min(hasta, Math.floor(desde || 1)));
      var total = 0;
      for (var n = ini; n <= hasta; n++) {
        total += PUNTOS_NIVEL + 2 * puntosFruta(n);
      }
      return Math.floor(total * MARGEN);
    },

    /* La respuesta de la función, en cristiano y CORTA: esto se enseña en el
     * panel del juego, que no da para un párrafo. El porqué largo (el campo
     * `detalle`) va a la consola, que es donde se mira cuando algo no cuadra.
     *
     * Si la función todavía no está desplegada, Supabase contesta 404 (o 401
     * en la puerta de entrada): se dice claro en vez de soltar un número. */
    submitError: function (status, cuerpo) {
      var d = null;
      try { d = JSON.parse(cuerpo || '{}'); } catch (e) { d = null; }
      var aviso = (window.console && console.warn)
        ? function (t) { console.warn('TOP MUNDIAL: ' + t); } : function () {};
      if (status === 404 || status === 401 || status === 403) {
        aviso('falta desplegar la Edge Function "' + FUNCION +
          '" (supabase functions deploy ' + FUNCION + ')');
        return 'NO ESTÁ DISPONIBLE';
      }
      if (d && d.detalle) aviso((d.error || status) + ' — ' + d.detalle);
      return (d && d.error) || ('ERROR ' + status);
    },

    configured: function () {
      var c = cfg();
      return !!(c.SUPABASE_URL && c.SUPABASE_KEY && window.fetch);
    },

    /* Top de puntuaciones de una clasificación (players: 1 individual,
     * 2 dúo, 3 trío, 4 escuadra). cb(err, filas) */
    top: function (players, cb) {
      var self = this;
      if (!this.configured()) { cb('SIN CONFIGURAR', null); return; }
      var n = this.jugadores(players);
      // la vista ya trae solo la mejor marca de cada jugador o equipo
      var url = base(CFG.RANKING.VIEW) +
        '?select=' + this.COLS +
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

    /* Envía una partida terminada a la Edge Function, que es quien decide si
     * entra. Silencioso: si falla, el juego sigue.
     *   o: { jugadores, modo, nombre1, nombre2, puntos, nivel,
     *        nivelInicio, fantasmas, tiempoMs, ajustes, tiempo1, repeticion }
     * Lo que se mira aquí (nombre, puntuación, techo del nivel) se vuelve a
     * mirar en el servidor: esto solo evita gastar una petición en algo que
     * ya se sabe que no vale. Sin nombre no hay récord. */
    submit: function (o, cb) {
      var self = this;
      if (!this.configured()) { if (cb) cb('SIN CONFIGURAR'); return; }
      var pts = Math.floor(o.puntos || 0);
      if (!(pts > 0) || pts > CFG.RANKING.MAX_POINTS) {
        if (cb) cb('PUNTUACIÓN NO VÁLIDA');
        return;
      }
      /* Hacen falta tantos nombres como jugadores: una escuadra entra con los
       * cuatro o no entra. Es lo mismo que mira el portero del servidor. */
      var players = this.jugadores(o.jugadores);
      var nombres = [];
      for (var i = 0; i < players; i++) {
        var n = String(o['nombre' + (i + 1)] == null ? '' : o['nombre' + (i + 1)])
          .slice(0, CFG.NICK_MAX);
        if (!n) { if (cb) cb('SIN NOMBRE'); return; }
        if (!this.nameAllowed(n)) { if (cb) cb('NOMBRE NO PERMITIDO'); return; }
        nombres.push(n);
      }
      var nivel = Math.max(1, Math.min(999, Math.floor(o.nivel || 1)));
      var ini = Math.max(1, Math.min(nivel, Math.floor(o.nivelInicio || 1)));
      if (pts > this.maxPuntos(nivel, ini)) {
        if (cb) cb('PUNTUACIÓN IMPOSIBLE');
        return;
      }
      var row = {
        jugadores: players,
        modo: (o.modo === 'online') ? 'online' : 'local',
        nombre1: nombres[0],
        nombre2: (players >= 2) ? nombres[1] : null,
        nombre3: (players >= 3) ? nombres[2] : null,
        nombre4: (players >= 4) ? nombres[3] : null,
        puntos: pts,
        nivel: nivel,
        nivelInicio: ini,
        // con qué se jugó: la función no admite la partida si los ajustes
        // hacían el juego más fácil de lo normal
        ajustes: o.ajustes || null,
        // para comprobar que la puntuación es alcanzable
        fantasmas: Math.max(0, Math.floor(o.fantasmas || 0)),
        tiempoMs: Math.max(0, Math.floor(o.tiempoMs || 0))
      };
      // tiempo del primer nivel (centésimas): opcional, solo en individual
      if (o.tiempo1 != null) {
        var cs = Math.floor(o.tiempo1);
        if (players === 1 && cs > 0 && cs <= CFG.RANKING.MAX_TIME) row.tiempo1 = cs;
      }
      // repetición de la partida (formato v1): opcional; si viene y cuadra,
      // la fila queda marcada como verificada
      if (o.repeticion) row.repeticion = o.repeticion;

      fetch(fnUrl(FUNCION), {
        method: 'POST', headers: headers(), body: JSON.stringify(row)
      })
        .then(function (res) {
          if (res.ok) {
            self.lastSubmitError = null;
            if (cb) cb(null);
            return null;
          }
          return res.text().then(function (t) {
            self.lastSubmitError = self.submitError(res.status, t);
            if (cb) cb(self.lastSubmitError);
          });
        })
        .catch(function (e) {
          self.lastSubmitError = e.message || 'SIN CONEXIÓN';
          if (cb) cb(self.lastSubmitError);
        });
    }
  };

  window.PM.Ranking = Ranking;
})();
