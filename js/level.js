/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/level.js
 * Nivel de jugador: sube con los puntos de todas las partidas.
 * Define window.PM.Level
 *
 * No tiene tope: cada nivel pide más puntos que el anterior
 *   coste(n) = BASE * n^EXP     (n = nivel que se deja atrás)
 * Se guarda solo la experiencia total; el nivel se deduce de ella,
 * así que nunca puede quedar descuadrado.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  function loadXp() {
    try {
      var v = parseInt(localStorage.getItem(CFG.LEVEL_KEY), 10);
      return (isFinite(v) && v > 0) ? v : 0;
    } catch (e) { return 0; }
  }

  function saveXp(v) {
    try { localStorage.setItem(CFG.LEVEL_KEY, String(Math.floor(v))); }
    catch (e) { /* sin almacenamiento */ }
  }

  var Level = {
    /* Puntos que cuesta pasar del nivel n al n+1 */
    cost: function (n) {
      return Math.round(CFG.LEVEL_BASE * Math.pow(n, CFG.LEVEL_EXP));
    },

    xp: function () { return loadXp(); },

    /* Estado completo a partir de la experiencia: nivel, lo que llevas
     * dentro de él y lo que pide para el siguiente. */
    stateFor: function (xp) {
      var lvl = 1, resto = Math.max(0, Math.floor(xp || 0));
      var coste = this.cost(1);
      // el bucle avanza siempre (coste creciente), pero se acota por si acaso
      while (resto >= coste && lvl < 9999) {
        resto -= coste;
        lvl++;
        coste = this.cost(lvl);
      }
      return {
        level: lvl,
        inLevel: resto,
        needed: coste,
        pct: coste > 0 ? Math.min(1, resto / coste) : 0
      };
    },

    state: function () { return this.stateFor(loadXp()); },

    level: function () { return this.state().level; },

    /* Suma los puntos de una partida. Devuelve el nivel nuevo si ha subido
     * (para el aviso), o null si sigue igual. */
    add: function (points) {
      points = Math.floor(points || 0);
      if (!(points > 0)) return null;
      var antes = this.state().level;
      var xp = loadXp() + points;
      saveXp(xp);
      var ahora = this.stateFor(xp).level;
      return (ahora > antes) ? ahora : null;
    },

    reset: function () { saveXp(0); }
  };

  window.PM.Level = Level;
})();
