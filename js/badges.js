/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/badges.js
 * Maestrías: insignias que se entregan al alcanzar cierta
 * puntuación como récord personal. Define window.PM.Badges
 *
 * Hay SEIS rutas independientes. Cuatro por formato de partida:
 *   'solo'     — 1 jugador   (Game.highScore1)
 *   'duo'      — 2 jugadores (Game.highScore2)
 *   'trio'     — 3 jugadores (Game.highScore3)
 *   'escuadra' — 4 jugadores (Game.highScore4)
 * ...y dos por los modos que se juegan con otras reglas:
 *   'lab'      — LABERINTOS   (Game.recordModo('lab'))
 *   'hab'      — HABILIDADES  (Game.recordModo('hab'))
 *
 * Cada una lleva su propio récord y sus propias insignias: una
 * gran partida en escuadra no regala las de dúo ni las de solo, y
 * una en otro laberinto no regala las del de 1980. Esto último era
 * un agujero: hasta ahora una partida en LABERINTOS escribía en el
 * récord de 1 jugador, así que un trazado más cómodo entregaba
 * maestrías del laberinto clásico.
 *
 * Y cada ruta pide MÁS puntos según lo que se regale: el escalón
 * de siempre multiplicado por su factor. Los formatos multiplican
 * por los jugadores (APRENDIZ son 3.000 en solo, 6.000 en dúo,
 * 9.000 en trío y 12.000 en escuadra), porque el marcador de un
 * equipo es de todos y con cuatro se llega al mismo número con
 * mucho menos mérito de cada uno. HABILIDADES multiplica por dos:
 * morder fantasmas a golpe de tecla da puntos que en el arcade no
 * existen, y sin ese peaje su ruta se acabaría en dos tardes.
 *
 * Las insignias conseguidas se deducen del récord (no hace falta
 * guardarlas); en localStorage solo se anota cuáles se han
 * anunciado ya, para no repetir el aviso en cada partida.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  /* ruta -> cómo se llama, de dónde sale su récord y cuánto multiplica
   *   n     jugadores del formato (y su multiplicador)
   *   slot  modo aparte: el récord sale de Game.recordModo(slot)
   *   mult  multiplicador del escalón, si no es el de los jugadores */
  var RUTAS = {
    solo:     { n: 1, name: 'SOLO' },
    duo:      { n: 2, name: 'DÚO' },
    trio:     { n: 3, name: 'TRÍO' },
    escuadra: { n: 4, name: 'ESCUADRA' },
    lab:      { n: 1, name: 'LABERINTOS',  slot: 'lab' },
    hab:      { n: 1, name: 'HABILIDADES', slot: 'hab', mult: 2 }
  };

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
    /* Los cuatro formatos primero y los dos modos aparte después: es el
     * orden de las pestañas del panel. */
    MODES: ['solo', 'duo', 'trio', 'escuadra', 'lab', 'hab'],

    /* Jugadores de esa ruta (1..4) */
    players: function (mode) { return RUTAS[norm(mode)].n; },

    modeName: function (mode) { return RUTAS[norm(mode)].name; },

    /* ¿Es una ruta de un modo aparte (LABERINTOS, HABILIDADES)? */
    slotOf: function (mode) { return RUTAS[norm(mode)].slot || null; },

    /* Ruta a la que cuenta una partida POR SU FORMATO. Los modos aparte no
     * salen de aquí: los decide Game.badgeMode(), que mira antes si la
     * partida es de laberintos o de habilidades. */
    modeFor: function (players) {
      var n = parseInt(players, 10);
      for (var k in RUTAS) {
        if (!RUTAS.hasOwnProperty(k) || RUTAS[k].slot) continue;
        if (RUTAS[k].n === n) return k;
      }
      return (n > 4) ? 'escuadra' : 'solo';
    },

    /* Cuánto multiplica el escalón esa ruta */
    mult: function (mode) {
      var r = RUTAS[norm(mode)];
      return r.mult || r.n;
    },

    /* Lo que hay que puntuar para esa insignia EN ESA RUTA */
    goal: function (badge, mode) {
      return badge.points * this.mult(mode);
    },

    /* Mejor marca personal de esa ruta */
    best: function (mode) {
      var g = window.PM.Game;
      if (!g) return 0;
      var slot = this.slotOf(mode);
      if (slot) return (g.recordModo ? g.recordModo(slot) : 0) || 0;
      if (!g.recordFor) return 0;
      return g.recordFor(this.players(mode)) || 0;
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
