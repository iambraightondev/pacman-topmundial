/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/badges.js
 * TROFEOS: copas que se entregan al alcanzar cierta puntuación
 * como récord personal. Define window.PM.Badges
 *
 * Hasta el 22 de septiembre se llamaban MAESTRÍAS y llevaban los
 * emblemas; ahora «maestría» es la de cada ROL (js/maestria.js) y
 * esto son los trofeos (dibujo en js/trofeos.js). Por dentro no
 * cambió nada: mismos ids, mismas claves guardadas, mismo nombre de
 * módulo, para que lo ya ganado y lo ya anunciado sigan valiendo.
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
 *   · Por FORMATO: x1 solo, x1,25 dúo, x1,5 trío y x1,75 escuadra
 *     (APRENDIZ son 3.000, 3.750, 4.500 y 5.250). No es por
 *     jugadores: en equipo no se hacen más puntos, se aguanta más.
 *     Ver FORMATOS.
 *   · Por MUNDO, DESATADO no multiplica: tiene SU PROPIA TABLA de
 *     escalones, más alta que la del arcade (LEYENDA son 100.000 y
 *     no 60.000), porque morder fantasmas a golpe de tecla da
 *     puntos que en el arcade no existen y sin ese peaje su ruta se
 *     acabaría en dos tardes. Es una tabla y no un factor para que
 *     los números salgan redondos en vez de doblados. LABERINTOS sí
 *     usa la de siempre: otro trazado no es más generoso, es
 *     distinto.
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
   *   mult    cuánto multiplica el escalón por ser de ese mundo
   *   points  escalones propios, por id de insignia (si no los trae, se
   *           usan los de CFG.BADGES) */
  var MUNDOS = [
    { id: 'clasico', name: 'CLÁSICO',    mult: 1, color: '#ffff00' },
    { id: 'lab',     name: 'LABERINTOS', mult: 1, color: '#ffb852' },
    { id: 'hab',     name: 'DESATADO',   mult: 1, color: '#ff66cc',
      points: {
        aprendiz: 5000,   cazador: 15000,  experto: 30000,
        maestro:  55000,  leyenda: 100000, mundial: 175000
      } }
  ];

  /* Los cuatro formatos, en el orden de los botones del panel.
   *   mult  cuánto multiplica el escalón por jugar en ese formato.
   *
   * Antes era el número de jugadores (x2, x3, x4) y se demostró que no tenía
   * base: los puntos del laberinto son los mismos lo jueguen uno o cuatro, y
   * las marcas reales de equipo salían PARECIDAS a las de solo (en DESATADO,
   * 110.000 en solo contra 74.000 / 68.000 / 64.000 en dúo, trío y
   * escuadra). Lo que sí da un equipo es aguante —más vidas, compañeros que
   * reaparecen—, y eso es lo que pagan estos cuartos de más. */
  var FORMATOS = [
    { n: 1, name: 'SOLO',     mult: 1 },
    { n: 2, name: 'DÚO',      mult: 1.25 },
    { n: 3, name: 'TRÍO',     mult: 1.5 },
    { n: 4, name: 'ESCUADRA', mult: 1.75 }
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

  /* DESATADO POR ROL (23 sep): cada rol lleva SU récord y SUS copas en cada
   * formato, que el Tanque y el Asesino no hacen los mismos puntos. Son
   * rutas aparte ('hab_tanque', 'hab_tanque2'…); la de DESATADO de siempre
   * ('hab', 'hab2'…) sigue siendo la de TODOS LOS ROLES: su mejor marca es
   * la mejor de cualquiera de ellos.
   *
   * El récord de cada rol vive en los contadores de logros
   * (rhab_<rol>_<n>, «el mayor»), que ya viajan a la cuenta y se funden
   * quedándose con lo más alto: no hace falta ninguna columna nueva. */
  var ROLES_HAB = (CFG.HAB && CFG.HAB.ROL_IDS) || ['asesino', 'tanque', 'mago', 'soporte'];
  var MUNDO_HAB = MUNDOS[2];
  function rutaRol(rol, n) { return 'hab_' + rol + (n > 1 ? n : ''); }
  var ORDEN_ROL = [];
  ROLES_HAB.forEach(function (rol) {
    for (var fr = 0; fr < FORMATOS.length; fr++) {
      var idr = rutaRol(rol, FORMATOS[fr].n);
      RUTAS[idr] = { mundo: MUNDO_HAB, fmt: FORMATOS[fr], rol: rol };
      ORDEN_ROL.push(idr);
    }
  });
  function claveRol(rol, n) { return 'rhab_' + rol + '_' + n; }
  function recordRol(rol, n) {
    var A = window.PM.Achievements, c = A ? A.stats() : {};
    return Math.floor((c && c[claveRol(rol, n)]) || 0);
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
    MODES_ROL: ORDEN_ROL,
    MUNDOS: MUNDOS,
    FORMATOS: FORMATOS,
    ROLES: ROLES_HAB,

    /* ---------- DESATADO por rol ---------- */
    rutaRol: function (rol, players) {
      var n = Math.max(1, Math.min(CFG.MAX_PLAYERS, parseInt(players, 10) || 1));
      return ROLES_HAB.indexOf(rol) !== -1 ? rutaRol(rol, n) : this.ruta('hab', n);
    },
    /* El rol de una ruta, o null si no es de un rol */
    rolDe: function (mode) { return (RUTAS[norm(mode)] || {}).rol || null; },
    claveRol: claveRol,
    recordRol: recordRol,

    /* Apunta la puntuación en el récord de ese rol (solo sube) */
    apuntarRol: function (rol, n, puntos) {
      var A = window.PM.Achievements;
      if (!A || ROLES_HAB.indexOf(rol) === -1 || !(puntos > 0)) return;
      var o = {};
      o[claveRol(rol, Math.max(1, Math.min(CFG.MAX_PLAYERS, n | 0)))] = puntos;
      A.recordAll(o);
    },

    /* LO YA JUGADO, una vez por aparato: los récords por rol nacen hoy, pero
     * las copas de DESATADO que ya tenías no se pierden. Se miran las
     * repeticiones guardadas (llevan el rol de cada uno) y el récord de
     * DESATADO de siempre que ninguna repetición explique va al ASESINO: a
     * solas era el único que hacía récord, y en party casi siempre. */
    sembrarRoles: function () {
      var KEY = 'pacman-topmundial-rhab-sembrado';
      try { if (localStorage.getItem(KEY)) return; } catch (e) { return; }
      var R = window.PM.Replay, g = window.PM.Game, self = this, n, rol;
      var visto = {};          // 'rol|n' -> puntos, lo que explican las repeticiones
      function apunta(r, np, p) {
        if (ROLES_HAB.indexOf(r) === -1 || !(p > 0)) return;
        self.apuntarRol(r, np, p);
        var k = r + '|' + np;
        visto[k] = Math.max(visto[k] || 0, p);
      }
      try {
        /* las locales: a uno o dos en el mismo teclado, los roles son de aquí */
        (R && R.guardadas ? R.guardadas() : []).forEach(function (reg) {
          var rep = R.leer(reg.s);
          if (!rep || !/^hab/.test(rep.modo) || rep.modo === 'habvs') return;
          var roles = (rep.ajustes && rep.ajustes.roles) || ['asesino', 'asesino'];
          var p = (rep.final && rep.final.puntos) || 0;
          for (var i = 0; i < rep.jugadores; i++) {
            /* a uno con otro rol era práctica: también es su marca */
            apunta(roles[i] || 'asesino', rep.jugadores, p);
          }
        });
        /* las de party: solo la cabecera (el rol de cada nombre) */
        var yo = '';
        var Ac = window.PM.Account;
        if (Ac && Ac.logged && Ac.logged() && Ac.name) yo = String(Ac.name() || '').toUpperCase();
        if (!yo) yo = String((window.PM.settings && window.PM.settings.nick1) || '').toUpperCase();
        (R && R.guardadasRed ? R.guardadasRed() : []).forEach(function (reg) {
          var cab = null;
          try { cab = JSON.parse(String(reg.s || '').split(String.fromCharCode(10))[0]); } catch (e) { cab = null; }
          if (!cab || !cab.hb || !cab.rl) return;
          var idx = (cab.nm || []).map(function (x) { return String(x || '').toUpperCase(); }).indexOf(yo);
          if (idx < 0) return;
          apunta(cab.rl[idx], cab.j, (cab.fin && cab.fin.puntos) || 0);
        });
      } catch (e) { /* una repetición rota no para la siembra */ }
      /* y lo que falte por explicar del récord de siempre, al Asesino. Con
       * CUENTA no: ese reparto ya se hizo en la nube (23 sep) con TODAS sus
       * repeticiones subidas, y hacerlo aquí con solo las de este aparato le
       * regalaría al Asesino marcas que allí se atribuyeron a otro rol. */
      var Acc = window.PM.Account;
      var conCuenta = !!(Acc && Acc.logged && Acc.logged());
      for (n = 1; n <= CFG.MAX_PLAYERS && !conCuenta; n++) {
        var global = (g && g.recordModo) ? g.recordModo('hab', n) : 0;
        if (!(global > 0)) continue;
        var mejor = 0;
        for (var ri = 0; ri < ROLES_HAB.length; ri++) {
          rol = ROLES_HAB[ri];
          mejor = Math.max(mejor, visto[rol + '|' + n] || 0);
        }
        if (mejor < global) this.apuntarRol('asesino', n, global);
      }
      try { localStorage.setItem(KEY, '1'); } catch (e) { /* sin almacén */ }
      this.syncSeen();         // lo sembrado no se anuncia
    },

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
      if (r.rol && CFG.HAB && CFG.HAB.ROL_INFO[r.rol]) {
        return r.mundo.name + ' · ' + CFG.HAB.ROL_INFO[r.rol].name + ' · ' + r.fmt.name;
      }
      return r.mundo.name + ' · ' + r.fmt.name;
    },

    /* Ruta del CLÁSICO por número de jugadores (lo de siempre) */
    modeFor: function (players) { return this.ruta(null, players); },

    /* Cuánto multiplica el escalón esa ruta: el formato por el mundo */
    mult: function (mode) {
      var r = RUTAS[norm(mode)];
      return r.fmt.mult * r.mundo.mult;
    },

    /* Lo que hay que puntuar para esa insignia EN ESA RUTA. El escalón sale
     * de la tabla del mundo si la tiene (DESATADO la tiene) y, si no, de la
     * de siempre; después se multiplica por lo que pida la ruta. */
    goal: function (badge, mode) {
      var r = RUTAS[norm(mode)];
      var base = (r.mundo.points && r.mundo.points[badge.id]) || badge.points;
      return Math.round(base * this.mult(mode));
    },

    /* Mejor marca personal de esa ruta */
    best: function (mode) {
      var g = window.PM.Game;
      if (!g) return 0;
      var r = RUTAS[norm(mode)];
      if (r.mundo.id === 'clasico') {
        return (g.recordFor ? g.recordFor(r.fmt.n) : 0) || 0;
      }
      if (r.rol) return recordRol(r.rol, r.fmt.n);
      var base = (g.recordModo ? g.recordModo(r.mundo.id, r.fmt.n) : 0) || 0;
      /* DESATADO · TODOS LOS ROLES: lo mejor de cualquiera */
      if (r.mundo.id === 'hab') {
        for (var i = 0; i < ROLES_HAB.length; i++) base = Math.max(base, recordRol(ROLES_HAB[i], r.fmt.n));
      }
      return base;
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
      var todas = this.MODES.concat(this.MODES_ROL);
      for (var m = 0; m < todas.length; m++) {
        var mode = todas[m];
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
