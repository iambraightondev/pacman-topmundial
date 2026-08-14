/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/achievements.js
 * Logros. Define window.PM.Achievements
 *
 * No se guarda "logro conseguido sí/no": se guardan CONTADORES
 * (fantasmas comidos, mejor racha, frutas, partidas, nivel más
 * lejos, niveles seguidos sin morir, mejor puntuación y mejor
 * tiempo del nivel 1) y los logros se deducen de ellos con
 * CFG.ACHIEVEMENTS. Así se pueden recalcular en cualquier momento
 * —al entrar en una cuenta, por ejemplo— sin depender de cuándo
 * pasó cada cosa.
 *
 * LOGROS POR MODO
 * Cada contador se lleva DOS veces: uno global y otro por modo,
 * con la clave `modo:stat` (por ejemplo `hab:fantasmas`). Las
 * claves por modo no se escriben a mano en ninguna parte: salen de
 * la propia CFG.ACHIEVEMENTS, así que añadir un logro de un modo
 * nuevo crea su contador solo. Los guardados de antes siguen
 * valiendo tal cual: sus claves son las globales de siempre y las
 * nuevas simplemente empiezan a cero.
 *
 * Aparte se anota qué logros ya se han anunciado, para no volver
 * a celebrarlos en cada partida.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  /* Contadores base y su tipo de acumulación:
   *   suma  — se van sumando
   *   mayor — se queda con el récord
   *   menor — se queda con la mejor marca (tiempos), 0 = todavía nada */
  var BASE = {
    fantasmas: 'suma',
    frutas:    'suma',
    partidas:  'suma',
    mordiscos: 'suma',   // fantasmas comidos con la Q (modo HABILIDADES)
    muros:     'suma',   // muros atravesados con la E (modo HABILIDADES)
    cazas:     'suma',   // Pac-Man cazados llevando un fantasma (PAC-MAN VS.)
    racha:     'mayor',
    nivelMax:  'mayor',
    limpios:   'mayor',
    puntosMax: 'mayor',
    mejorT1:   'menor'
  };

  /* Clave de un contador: la global es el nombre pelado, la de un modo va
   * con su prefijo. Es la misma cuenta en los dos sitios. */
  function claveDe(modo, stat) {
    return modo ? (modo + ':' + stat) : stat;
  }

  /* Contador que mira un logro */
  function claveLogro(a) {
    return claveDe(a.modo, a.stat);
  }

  /* Tipo de acumulación de una clave, venga con modo o sin él */
  function tipoDe(key) {
    var i = String(key).indexOf(':');
    var base = (i < 0) ? key : key.slice(i + 1);
    return BASE.hasOwnProperty(base) ? BASE[base] : null;
  }

  /* Todas las claves que se guardan: las globales y las que pide algún
   * logro por modo. Se calcula una vez, al cargar. */
  var STATS = (function () {
    var o = {}, k, i, a;
    for (k in BASE) if (BASE.hasOwnProperty(k)) o[k] = BASE[k];
    for (i = 0; i < CFG.ACHIEVEMENTS.length; i++) {
      a = CFG.ACHIEVEMENTS[i];
      if (!a.modo) continue;
      var c = claveLogro(a);
      if (tipoDe(c)) o[c] = tipoDe(c);
    }
    return o;
  })();

  function vacio() {
    var o = {};
    for (var k in STATS) if (STATS.hasOwnProperty(k)) o[k] = 0;
    return o;
  }

  function isArray(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
  }

  function load() {
    var out = { c: vacio(), v: [] };
    try {
      var raw = localStorage.getItem(CFG.ACH_KEY);
      var d = raw ? JSON.parse(raw) : null;
      if (d && d.c) {
        for (var k in STATS) {
          if (!STATS.hasOwnProperty(k)) continue;
          var n = parseInt(d.c[k], 10);
          if (isFinite(n) && n > 0) out.c[k] = n;
        }
      }
      if (d && isArray(d.v)) out.v = d.v.slice();
    } catch (e) { /* sin almacenamiento */ }
    return out;
  }

  function save(d) {
    try { localStorage.setItem(CFG.ACH_KEY, JSON.stringify(d)); }
    catch (e) { /* sin almacenamiento */ }
  }

  function infoDe(id) {
    for (var i = 0; i < CFG.ACHIEVEMENTS.length; i++) {
      if (CFG.ACHIEVEMENTS[i].id === id) return CFG.ACHIEVEMENTS[i];
    }
    return null;
  }

  /* ¿este contador cumple la meta del logro? */
  function cumple(a, c) {
    var v = c[claveLogro(a)] || 0;
    if (a.menor) return v > 0 && v <= a.goal;
    return v >= a.goal;
  }

  var Achievements = {
    STATS: STATS,
    BASE: BASE,
    clave: claveDe,
    claveLogro: claveLogro,

    stats: function () { return load().c; },

    seen: function () { return load().v; },

    /* ---------- acumular ---------- */
    /* n puede venir de una partida entera; se ignora lo que no mejore */
    record: function (key, value) {
      if (!STATS.hasOwnProperty(key)) return;
      var n = Math.floor(value || 0);
      if (!(n > 0)) return;
      var d = load();
      // `tipo` es cómo acumula (suma/mayor/menor), no el modo de juego
      var tipo = STATS[key];
      if (tipo === 'suma') d.c[key] += n;
      else if (tipo === 'mayor') { if (n <= d.c[key]) return; d.c[key] = n; }
      else { if (d.c[key] > 0 && n >= d.c[key]) return; d.c[key] = n; }
      save(d);
    },

    /* Varias de golpe: { fantasmas: 3, racha: 4, ... } */
    recordAll: function (o) {
      if (!o) return;
      for (var k in o) if (o.hasOwnProperty(k)) this.record(k, o[k]);
    },

    /* Lo mismo, pero apuntándolo ADEMÁS en los contadores de cada modo que
     * esté en juego. `tags` es lo que devuelve Game.achTags(): una partida
     * de habilidades en party cuenta para los dos. Solo se guarda lo que
     * algún logro mire, así que esto no engorda el almacén por gusto. */
    recordFor: function (tags, o) {
      if (!o) return;
      this.recordAll(o);
      if (!tags || !tags.length) return;
      for (var i = 0; i < tags.length; i++) {
        for (var k in o) {
          if (!o.hasOwnProperty(k)) continue;
          var c = claveDe(tags[i], k);
          if (STATS.hasOwnProperty(c)) this.record(c, o[k]);
        }
      }
    },

    /* ---------- consulta ---------- */
    has: function (id) {
      var a = infoDe(id);
      return !!a && cumple(a, load().c);
    },

    earned: function () {
      var c = load().c, out = [];
      for (var i = 0; i < CFG.ACHIEVEMENTS.length; i++) {
        if (cumple(CFG.ACHIEVEMENTS[i], c)) out.push(CFG.ACHIEVEMENTS[i]);
      }
      return out;
    },

    count: function () { return this.earned().length; },
    total: function () { return CFG.ACHIEVEMENTS.length; },

    /* Progreso de un logro, para la barra del panel */
    progress: function (a, c) {
      c = c || load().c;
      var v = c[claveLogro(a)] || 0;
      var hecho = cumple(a, c);
      var pct;
      if (a.menor) pct = hecho ? 1 : (v > 0 ? Math.min(1, a.goal / v) : 0);
      else pct = Math.min(1, a.goal > 0 ? v / a.goal : 0);
      return { valor: v, meta: a.goal, pct: pct, hecho: hecho };
    },

    /* ---------- avisos ---------- */
    /* Logros conseguidos que aún no se han anunciado; los marca de paso */
    claim: function () {
      var d = load();
      var fresh = [];
      for (var i = 0; i < CFG.ACHIEVEMENTS.length; i++) {
        var a = CFG.ACHIEVEMENTS[i];
        if (!cumple(a, d.c)) continue;
        if (d.v.indexOf(a.id) !== -1) continue;
        d.v.push(a.id);
        fresh.push(a);
      }
      if (fresh.length) save(d);
      return fresh;
    },

    /* Al arrancar (o al entrar en una cuenta): lo ya conseguido no se anuncia */
    syncSeen: function () {
      var d = load();
      var changed = false;
      for (var i = 0; i < CFG.ACHIEVEMENTS.length; i++) {
        var a = CFG.ACHIEVEMENTS[i];
        if (cumple(a, d.c) && d.v.indexOf(a.id) === -1) {
          d.v.push(a.id);
          changed = true;
        }
      }
      if (changed) save(d);
    },

    /* ---------- cuentas ---------- */
    /* Junta unos contadores de fuera (los de la cuenta) con los de aquí,
     * quedándose con lo mejor de cada uno. No se pierde nada por entrar. */
    merge: function (otros) {
      if (!otros) return this.stats();
      var d = load();
      for (var k in STATS) {
        if (!STATS.hasOwnProperty(k)) continue;
        var n = Math.floor(otros[k] || 0);
        if (!(n > 0)) continue;
        var tipo = STATS[k];
        if (tipo === 'suma') d.c[k] = Math.max(d.c[k], n);
        else if (tipo === 'mayor') d.c[k] = Math.max(d.c[k], n);
        else d.c[k] = (d.c[k] > 0) ? Math.min(d.c[k], n) : n;
      }
      save(d);
      return d.c;
    },

    reset: function () { save({ c: vacio(), v: [] }); }
  };

  window.PM.Achievements = Achievements;
})();
