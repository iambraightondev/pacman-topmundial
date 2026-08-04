/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/badges.js
 * Maestrías: insignias que se entregan al alcanzar cierta
 * puntuación como récord personal. Define window.PM.Badges
 *
 * Hay DOS rutas independientes con los mismos escalones:
 *   'solo' — récord de un jugador   (Game.highScore1)
 *   'duo'  — récord de equipo       (Game.highScore2)
 * Así una gran partida en dúo no regala las insignias de solo.
 *
 * Las insignias conseguidas se deducen del récord (no hace falta
 * guardarlas); en localStorage solo se anota cuáles se han
 * anunciado ya, para no repetir el aviso en cada partida.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  function isArray(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
  }

  function norm(mode) { return (mode === 'duo') ? 'duo' : 'solo'; }

  function loadSeen() {
    try {
      var raw = localStorage.getItem(CFG.BADGES_KEY);
      var v = raw ? JSON.parse(raw) : null;
      if (!v) return { solo: [], duo: [] };
      // formato antiguo (una sola lista): vale para las dos rutas, así no se
      // vuelve a anunciar nada que ya se hubiera conseguido
      if (isArray(v)) return { solo: v.slice(), duo: v.slice() };
      return {
        solo: isArray(v.solo) ? v.solo : [],
        duo: isArray(v.duo) ? v.duo : []
      };
    } catch (e) { return { solo: [], duo: [] }; }
  }

  function saveSeen(seen) {
    try { localStorage.setItem(CFG.BADGES_KEY, JSON.stringify(seen)); }
    catch (e) { /* sin almacenamiento */ }
  }

  var Badges = {
    MODES: ['solo', 'duo'],

    modeName: function (mode) { return norm(mode) === 'duo' ? 'DÚO' : 'SOLO'; },

    /* Modo de maestría al que cuenta una partida */
    modeFor: function (players) { return (players === 2) ? 'duo' : 'solo'; },

    /* Mejor marca personal de esa ruta */
    best: function (mode) {
      var g = window.PM.Game;
      if (!g) return 0;
      return (norm(mode) === 'duo') ? (g.highScore2 || 0) : (g.highScore1 || 0);
    },

    earnedAt: function (points) {
      var out = [];
      for (var i = 0; i < CFG.BADGES.length; i++) {
        if (points >= CFG.BADGES[i].points) out.push(CFG.BADGES[i]);
      }
      return out;
    },

    earned: function (mode) { return this.earnedAt(this.best(mode)); },

    /* Insignia más alta de esa ruta (null si aún ninguna) */
    top: function (mode) {
      var e = this.earned(mode);
      return e.length ? e[e.length - 1] : null;
    },

    /* Siguiente insignia por conseguir en esa ruta (null si están todas) */
    next: function (mode) {
      var b = this.best(mode);
      for (var i = 0; i < CFG.BADGES.length; i++) {
        if (b < CFG.BADGES[i].points) return CFG.BADGES[i];
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
      var got = this.earnedAt(points);
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
