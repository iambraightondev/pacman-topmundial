/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/badges.js
 * Maestrías: insignias que se entregan al alcanzar cierta
 * puntuación como récord personal. Define window.PM.Badges
 *
 * Una ruta por MUNDO y FORMATO. DOCE en total.
 *
 *   MUNDOS (dónde se juega)
 *     'clasico' — el laberinto de 1980 (Game.recordFor(n))
 *     'lab'     — LABERINTOS, otros trazados
 *     'hab'     — DESATADO, los cuatro poderes
 *   FORMATOS (cuántos jugáis)
 *     1 SOLO · 2 DÚO · 3 TRÍO · 4 ESCUADRA
 *
 * Cada casilla de esa tabla lleva su propio récord y sus propias
 * insignias, y no se mezclan: una gran partida en escuadra no
 * regala las de dúo ni las de solo, y una en otro laberinto no
 * regala las del de 1980. Antes había seis rutas —los cuatro
 * formatos, más LABERINTOS y DESATADO enteros— y ahí quedaba un
 * agujero: un trío de LABERINTOS entregaba las mismas insignias
 * que una partida en solitario, cuando son tres bocas comiendo.
 *
 * Y cada ruta pide MÁS puntos según lo que se regale: el escalón
 * de siempre multiplicado por su factor, que es el del formato por
 * el del mundo.
 *   · Por FORMATO se multiplica por los jugadores (APRENDIZ son
 *     3.000 en solo, 6.000 en dúo, 9.000 en trío y 12.000 en
 *     escuadra), porque el marcador de un equipo es de todos.
 *   · Por MUNDO, DESATADO multiplica por dos: morder fantasmas a
 *     golpe de tecla da puntos que en el arcade no existen, y sin
 *     ese peaje su ruta se acabaría en dos tardes. LABERINTOS no
 *     multiplica: otro trazado no es más generoso, es distinto.
 *
 * Las insignias conseguidas se deducen del récord (no hace falta
 * guardarlas); en localStorage solo se anota cuáles se han
 * anunciado ya, para no repetir el aviso en cada partida.
 *
 * Los IDENTIFICADORES de las rutas se eligieron para no romper lo
 * ya guardado: los del clásico son los de siempre ('solo', 'duo',
 * 'trio', 'escuadra') y los de solo de cada mundo aparte se quedan
 * como estaban ('lab', 'hab'), que es donde casi todo el mundo lo
 * jugó. Solo son nuevos 'lab2'..'lab4' y 'hab2'..'hab4'.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  /* Los tres mundos, en el orden de los botones del panel.
   *   mult  cuánto multiplica el escalón por ser de ese mundo */
  var MUNDOS = [
    { id: 'clasico', name: 'CLÁSICO',    mult: 1, color: '#ffff00' },
    { id: 'lab',     name: 'LABERINTOS', mult: 1, color: '#ffb852' },
    { id: 'hab',     name: 'DESATADO',   mult: 2, color: '#ff66cc' }
  ];

  /* Los cuatro formatos, en el orden de los botones del panel */
  var FORMATOS = [
    { n: 1, name: 'SOLO' },
    { n: 2, name: 'DÚO' },
    { n: 3, name: 'TRÍO' },
    { n: 4, name: 'ESCUADRA' }
  ];

  /* Identificador de una ruta. Los del clásico y los de solo de cada mundo
   * son los de antes: así lo ya anunciado sigue estándolo. */
  var CLASICO_IDS = ['solo', 'duo', 'trio', 'escuadra'];
  function rutaId(mundo, n) {
    if (mundo === 'clasico') return CLASICO_IDS[n - 1];
    return (n <= 1) ? mundo : (mundo + n);
  }

  /* La tabla completa, montada de una vez: id -> { mundo, n } */
  var RUTAS = {};
  var ORDEN = [];
  for (var mi = 0; mi < MUNDOS.length; mi++) {
    for (var fi = 0; fi < FORMATOS.length; fi++) {
      var id = rutaId(MUNDOS[mi].id, FORMATOS[fi].n);
      RUTAS[id] = { mundo: MUNDOS[mi], fmt: FORMATOS[fi] };
      ORDEN.push(id);
    }
  }

  function isArray(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
  }

  function norm(mode) {
    return RUTAS.hasOwnProperty(mode) ? mode : 'solo';
  }

  function loadSeen() {
    var out = {}, k;
    for (k in RUTAS) if (RUTAS.hasOwnProperty(k)) out[k] = [];
    try {
      var raw = localStorage.getItem(CFG.BADGES_KEY);
      var v = raw ? JSON.parse(raw) : null;
      if (!v) return out;
      /* formato antiguo (una sola lista): vale para solo y dúo, que son las
       * rutas que existían, así que no se vuelve a anunciar nada que ya se
       * hubiera conseguido. Las demás empiezan limpias: son nuevas. */
      if (isArray(v)) {
        out.solo = v.slice();
        out.duo = v.slice();
        return out;
      }
      for (k in RUTAS) {
        if (RUTAS.hasOwnProperty(k) && isArray(v[k])) out[k] = v[k];
      }
    } catch (e) { /* sin almacenamiento */ }
    return out;
  }

  function saveSeen(seen) {
    try { localStorage.setItem(CFG.BADGES_KEY, JSON.stringify(seen)); }
    catch (e) { /* sin almacenamiento */ }
  }

  var Badges = {
    /* Las doce rutas, mundo a mundo y dentro de cada uno por formato */
    MODES: ORDEN,
    MUNDOS: MUNDOS,
    FORMATOS: FORMATOS,

    /* Ruta a la que cuenta una partida. mundo puede venir como null (el
     * clásico), que es justo lo que devuelve Game.recordSlot(). */
    ruta: function (mundo, players) {
      var n = parseInt(players, 10) || 1;
      if (n > CFG.MAX_PLAYERS) n = CFG.MAX_PLAYERS;
      if (n < 1) n = 1;
      var m = mundo || 'clasico';
      var id = rutaId((m === 'lab' || m === 'hab') ? m : 'clasico', n);
      return RUTAS.hasOwnProperty(id) ? id : 'solo';
    },

    /* Jugadores de esa ruta (1..4) */
    players: function (mode) { return RUTAS[norm(mode)].fmt.n; },

    /* Mundo de esa ruta ('clasico' | 'lab' | 'hab') */
    mundoDe: function (mode) { return RUTAS[norm(mode)].mundo.id; },

    mundoName: function (mode) { return RUTAS[norm(mode)].mundo.name; },
    mundoColor: function (mode) { return RUTAS[norm(mode)].mundo.color; },
    formatoName: function (mode) { return RUTAS[norm(mode)].fmt.name; },

    /* Nombre completo, el que sale en el cartel de la partida y en la chapa.
     * El clásico no dice su mundo: es el juego de siempre y decir "CLÁSICO ·
     * SOLO" en vez de "SOLO" solo añade ruido. */
    modeName: function (mode) {
      var r = RUTAS[norm(mode)];
      if (r.mundo.id === 'clasico') return r.fmt.name;
      return r.mundo.name + ' · ' + r.fmt.name;
    },

    /* Ruta del CLÁSICO por número de jugadores (lo de siempre) */
    modeFor: function (players) { return this.ruta(null, players); },

    /* Cuánto multiplica el escalón esa ruta: los jugadores por el mundo */
    mult: function (mode) {
      var r = RUTAS[norm(mode)];
      return r.fmt.n * r.mundo.mult;
    },

    /* Lo que hay que puntuar para esa insignia EN ESA RUTA */
    goal: function (badge, mode) {
      return badge.points * this.mult(mode);
    },

    /* Mejor marca personal de esa ruta */
    best: function (mode) {
      var g = window.PM.Game;
      if (!g) return 0;
      var r = RUTAS[norm(mode)];
      if (r.mundo.id === 'clasico') {
        return (g.recordFor ? g.recordFor(r.fmt.n) : 0) || 0;
      }
      return (g.recordModo ? g.recordModo(r.mundo.id, r.fmt.n) : 0) || 0;
    },

    earnedAt: function (points, mode) {
      var out = [];
      for (var i = 0; i < CFG.BADGES.length; i++) {
        if (points >= this.goal(CFG.BADGES[i], mode)) out.push(CFG.BADGES[i]);
      }
      return out;
    },

    earned: function (mode) { return this.earnedAt(this.best(mode), mode); },

    /* Insignia más alta de esa ruta (null si aún ninguna) */
    top: function (mode) {
      var e = this.earned(mode);
      return e.length ? e[e.length - 1] : null;
    },

    /* Siguiente insignia por conseguir en esa ruta (null si están todas) */
    next: function (mode) {
      var b = this.best(mode);
      for (var i = 0; i < CFG.BADGES.length; i++) {
        if (b < this.goal(CFG.BADGES[i], mode)) return CFG.BADGES[i];
      }
      return null;
    },

    has: function (id, mode) {
      var e = this.earned(mode);
      for (var i = 0; i < e.length; i++) if (e[i].id === id) return true;
      return false;
    },

    /* ¿Esta puntuación entrega alguna insignia nueva (aún sin anunciar) en
     * esa ruta? Devuelve la más alta y la marca como anunciada. */
    claim: function (points, mode) {
      mode = norm(mode);
      var seen = loadSeen();
      var got = this.earnedAt(points, mode);
      var fresh = null;
      for (var i = 0; i < got.length; i++) {
        if (seen[mode].indexOf(got[i].id) === -1) {
          seen[mode].push(got[i].id);
          fresh = got[i];
        }
      }
      if (fresh) saveSeen(seen);
      return fresh;
    },

    /* Al arrancar: lo que ya se tenía no se anuncia */
    syncSeen: function () {
      var seen = loadSeen();
      var changed = false;
      for (var m = 0; m < this.MODES.length; m++) {
        var mode = this.MODES[m];
        var got = this.earned(mode);
        for (var i = 0; i < got.length; i++) {
          if (seen[mode].indexOf(got[i].id) === -1) {
            seen[mode].push(got[i].id);
            changed = true;
          }
        }
      }
      if (changed) saveSeen(seen);
    }
  };

  window.PM.Badges = Badges;
})();
