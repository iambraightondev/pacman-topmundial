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
    mordiscos: 'suma',   // fantasmas comidos con la Q (modo DESATADO)
    muros:     'suma',   // muros atravesados con la E (modo DESATADO)
    cazas:     'suma',   // Pac-Man cazados llevando un fantasma (PAC-MAN VS.)
    dailyOk:   'suma',   // retos diarios cumplidos (js/daily.js)
    dailySemana: 'suma', // semanas con los siete cumplidos
    dailyRacha: 'mayor', // días seguidos cumpliendo alguno
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
    var out = { c: vacio(), v: [], m: 0, d: 0 };
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
      if (d && d.m) out.m = 1;          // los contadores por modo, ya sembrados
      if (d && d.d) out.d = 1;          // y los del DAILY, sembrados del reto
    } catch (e) { /* sin almacenamiento */ }
    return out;
  }

  /* Un contador GUARDADO tal cual está en el almacén, esté o no en STATS.
   * Hace falta para sembrar desde claves retiradas: load() solo se trae las
   * que algún logro mira hoy, así que lo que se quitó de CFG.ACHIEVEMENTS es
   * invisible desde ahí (y se pierde en el primer save). */
  function crudo(key) {
    try {
      var raw = localStorage.getItem(CFG.ACH_KEY);
      var d = raw ? JSON.parse(raw) : null;
      var n = (d && d.c) ? parseInt(d.c[key], 10) : 0;
      return (isFinite(n) && n > 0) ? n : 0;
    } catch (e) { return 0; }
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
     * de poderes en party cuenta para los dos. Solo se guarda lo que
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

    /* ---------- lo jugado ANTES de que hubiera logros por modo ----------
     * Los contadores por modo son nuevos y nacían a cero, así que a quien ya
     * llevaba cien partidas le salía "JUEGA 50 PARTIDAS EN CLÁSICO · 0/50".
     * Eso es tirar a la basura lo que esa persona ya había jugado, y no se
     * puede hacer: los logros son suyos.
     *
     * Lo jugado antes solo existe en los contadores GLOBALES, y ahí no consta
     * en qué modo fue. Así que se reparte con lo único que se puede demostrar:
     *
     *  - CLÁSICO se lleva lo global. Es el modo por defecto y el grueso de
     *    cualquier historial; además el contador de un modo nunca puede ser
     *    mayor que el global, así que esto como mucho se pasa de generoso,
     *    nunca se queda corto. Errar a favor del jugador es lo correcto
     *    cuando el dato se perdió.
     *  - PARTY solo si hay PRUEBA de haber jugado acompañado: un récord de
     *    dúo, trío o escuadra. Sin esa prueba se queda a cero, que regalar
     *    "JUEGA 20 PARTIDAS ACOMPAÑADO" a quien siempre jugó solo sería
     *    mentira.
     *  - RETO, LABERINTOS, VS. y DESATADO se quedan a cero: de esos no hay
     *    ni rastro en los contadores, y no se inventa nada.
     *
     * Se hace UNA vez (bandera `m`), no en cada arranque: si se repitiera,
     * las partidas de party seguirían engordando el contador de clásico para
     * siempre. La única repetición es a propósito: al entrar en una cuenta,
     * merge() baja la bandera para volver a sembrar con lo que venga de la
     * nube, que puede ser un historial mucho más largo que el de aquí. */
    sembrarModos: function () {
      var d = load();
      if (d.m) return d.c;
      d.m = 1;
      var G = window.PM.Game;
      var hayParty = !!(G && G.recordFor &&
        (G.recordFor(2) > 0 || G.recordFor(3) > 0 || G.recordFor(4) > 0));
      for (var k in STATS) {
        if (!STATS.hasOwnProperty(k)) continue;
        var i = String(k).indexOf(':');
        if (i < 0) continue;                       // este ya es el global
        var modo = k.slice(0, i), base = k.slice(i + 1);
        var v = 0;
        if (modo === 'clasico') v = d.c[base] || 0;
        else if (modo === 'party' && hayParty) v = d.c[base] || 0;
        if (v > 0) d.c[k] = Math.max(d.c[k] || 0, v);
      }
      save(d);
      return d.c;
    },

    /* ---------- lo que se jugó al RETO DE HOY, que ya no existe ----------
     * El reto era un modo aparte (una partida con la misma semilla para todo
     * el mundo, un intento al día) y se retiró en favor del DAILY, que son
     * siete retos por semana que se cumplen jugando a lo que sea. Sus tres
     * logros siguen ahí con el mismo identificador, pero ahora miran
     * contadores nuevos, así que a quien tenía CONSTANTE se le habría
     * borrado de un día para otro. Eso no se hace.
     *
     * Cada día que se jugaba el reto se cumplía el reto de ese día, así que
     * `reto:partidas` se traduce uno a uno a retos diarios cumplidos. Los
     * otros dos (racha y semanas) empiezan a cero: de eso no hay ni rastro y
     * no se inventa nada.
     *
     * Se lee del almacén EN CRUDO porque `reto:partidas` ya no está en STATS
     * —ningún logro la mira— y load() no se la trae. Una vez (bandera `d`). */
    sembrarDaily: function () {
      var d = load();
      if (d.d) return d.c;
      d.d = 1;
      var jugados = crudo('reto:partidas');
      if (jugados > 0) {
        d.c.dailyOk = Math.max(d.c.dailyOk || 0, jugados);
        if (STATS.hasOwnProperty('daily:dailyOk')) {
          d.c['daily:dailyOk'] = Math.max(d.c['daily:dailyOk'] || 0, jugados);
        }
      }
      save(d);
      return d.c;
    },

    /* Al arrancar (o al entrar en una cuenta): lo ya conseguido no se anuncia */
    syncSeen: function () {
      // antes de nada, que lo jugado de antes cuente en su modo
      this.sembrarModos();
      this.sembrarDaily();
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
      /* Lo del RETO DE HOY que venga de la nube: es una clave retirada, así
       * que el bucle de abajo (que solo mira STATS) la tiraría. Cada día
       * jugado al reto era un reto de ese día cumplido, y de otro aparato
       * puede venir un historial que aquí no existe. */
      var retoNube = Math.floor(otros['reto:partidas'] || 0);
      if (retoNube > 0) {
        d.c.dailyOk = Math.max(d.c.dailyOk || 0, retoNube);
        if (STATS.hasOwnProperty('daily:dailyOk')) {
          d.c['daily:dailyOk'] = Math.max(d.c['daily:dailyOk'] || 0, retoNube);
        }
      }
      for (var k in STATS) {
        if (!STATS.hasOwnProperty(k)) continue;
        var n = Math.floor(otros[k] || 0);
        if (!(n > 0)) continue;
        var tipo = STATS[k];
        if (tipo === 'suma') d.c[k] = Math.max(d.c[k], n);
        else if (tipo === 'mayor') d.c[k] = Math.max(d.c[k], n);
        else d.c[k] = (d.c[k] > 0) ? Math.min(d.c[k], n) : n;
      }
      /* Lo que baja de la nube puede ser un historial mucho más largo que el
       * de este navegador, así que se vuelve a sembrar por modo con él: si no,
       * entrar en tu cuenta en un aparato nuevo te dejaba los logros por modo
       * a cero teniendo cien partidas a la espalda. */
      d.m = 0;
      save(d);
      this.sembrarModos();
      return this.stats();
    },

    reset: function () { save({ c: vacio(), v: [], m: 0, d: 0 }); }
  };

  window.PM.Achievements = Achievements;
})();
