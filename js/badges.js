/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/badges.js
 * Maestrías: insignias que se entregan al alcanzar cierta
 * puntuación como récord personal. Define window.PM.Badges
 *
 * La lista de insignias ganadas se deduce del récord (no hace
 * falta guardarla); en localStorage solo se anota cuáles se han
 * anunciado ya, para no repetir el aviso en cada partida.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  function loadSeen() {
    try {
      var raw = localStorage.getItem(CFG.BADGES_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Object.prototype.toString.call(arr) === '[object Array]' ? arr : [];
    } catch (e) { return []; }
  }

  function saveSeen(list) {
    try { localStorage.setItem(CFG.BADGES_KEY, JSON.stringify(list)); }
    catch (e) { /* sin almacenamiento */ }
  }

  var Badges = {
    /* Mejor marca personal: el mayor de los dos récords guardados */
    best: function () {
      var g = window.PM.Game;
      if (!g) return 0;
      return Math.max(g.highScore1 || 0, g.highScore2 || 0, g.highScore || 0);
    },

    earnedAt: function (points) {
      var out = [];
      for (var i = 0; i < CFG.BADGES.length; i++) {
        if (points >= CFG.BADGES[i].points) out.push(CFG.BADGES[i]);
      }
      return out;
    },

    earned: function () { return this.earnedAt(this.best()); },

    /* Insignia más alta conseguida (null si aún ninguna) */
    top: function () {
      var e = this.earned();
      return e.length ? e[e.length - 1] : null;
    },

    /* Siguiente insignia por conseguir (null si están todas) */
    next: function () {
      var b = this.best();
      for (var i = 0; i < CFG.BADGES.length; i++) {
        if (b < CFG.BADGES[i].points) return CFG.BADGES[i];
      }
      return null;
    },

    has: function (id) {
      var e = this.earned();
      for (var i = 0; i < e.length; i++) if (e[i].id === id) return true;
      return false;
    },

    /* ¿Esta puntuación entrega alguna insignia nueva (aún sin anunciar)?
     * Devuelve la más alta y la marca como anunciada. */
    claim: function (points) {
      var seen = loadSeen();
      var got = this.earnedAt(points);
      var fresh = null;
      for (var i = 0; i < got.length; i++) {
        if (seen.indexOf(got[i].id) === -1) {
          seen.push(got[i].id);
          fresh = got[i];
        }
      }
      if (fresh) saveSeen(seen);
      return fresh;
    },

    /* Al arrancar: las insignias que ya se tenían no se anuncian */
    syncSeen: function () {
      var seen = loadSeen();
      var got = this.earned();
      var changed = false;
      for (var i = 0; i < got.length; i++) {
        if (seen.indexOf(got[i].id) === -1) { seen.push(got[i].id); changed = true; }
      }
      if (changed) saveSeen(seen);
    }
  };

  window.PM.Badges = Badges;
})();
