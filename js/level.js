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

    reset: function () { saveXp(0); },

    /* Fija la experiencia sin sumar (al entrar en una cuenta con más que la
     * de este navegador). Nunca baja: lo jugado aquí no se tira. */
    setAtLeast: function (xp) {
      var n = Math.floor(xp || 0);
      if (n > loadXp()) saveXp(n);
      return this.state();
    },

    /* ---------- Skins por nivel ----------
     * El nivel que pide una skin (1 = desde el principio) */
    skinLevel: function (id) {
      for (var i = 0; i < CFG.SKINS.length; i++) {
        if (CFG.SKINS[i].id === id) return CFG.SKINS[i].level || 1;
      }
      return 1;
    },

    skinUnlocked: function (id) {
      return this.level() >= this.skinLevel(id);
    },

    /* Skins que se pueden elegir ahora mismo. `puesta` entra siempre aunque
     * el requisito la deje fuera: lo que ya llevas no se te quita. */
    skinsAllowed: function (puesta) {
      var lvl = this.level(), out = [];
      for (var i = 0; i < CFG.SKINS.length; i++) {
        var sk = CFG.SKINS[i];
        if (lvl >= (sk.level || 1) || sk.id === puesta) out.push(sk.id);
      }
      return out;
    }
  };

  window.PM.Level = Level;
})();
