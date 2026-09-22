/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/maestria.js
 * MAESTRÍAS DE ROL. Define window.PM.Maestria
 *
 * Una por rol de DESATADO (ASESINO, TANQUE, MAGO, SOPORTE), como las de
 * campeón en League of Legends: miden lo que has JUGADO con ese rol, no tu
 * mejor marca (eso son los TROFEOS, js/badges.js). Llevan los emblemas de
 * siempre, del APRENDIZ al TOP MUNDIAL (js/emblemas.js).
 *
 * Cómo se gana
 *   Cada partida de DESATADO de al menos CFG.MAESTRIA.MIN_SEGUNDOS da puntos
 *   a tu rol según la NOTA (S, A, B, C, D). La nota mide lo que ese rol
 *   tiene que hacer, por minuto EN PIE (el rato de cadáver no cuenta):
 *     ASESINO  fantasmas que se come
 *     MAGO     fantasmas que mata, a distancia o de cerca
 *     TANQUE   golpes que aguanta (x3) y lo que mata
 *     SOPORTE  compañeros que levanta (x3), escudos y vidas que da, y lo
 *              que mata
 *   y cada muerte propia la rebaja un poco. Los tres escalones de arriba
 *   piden además notas S con ese rol: con horas solas no se llega.
 *
 *   Cuenta también la PRÁCTICA (a uno con otro rol que no sea el Asesino):
 *   no da récords ni trofeos, pero es justo donde se aprende un rol.
 *
 * De dónde salen los números
 *   La libreta de la partida (Game.marcador) trae los fantasmas, los
 *   rescates, las muertes y el tiempo en pie de cada jugador; es la misma en
 *   todas las máquinas porque el anfitrión la reparte al acabar. Los ESCUDOS
 *   Y VIDAS del Soporte también van en ella (los ejecuta quien manda). Los
 *   GOLPES AGUANTADOS no: los decide la máquina de cada uno, así que se
 *   cuentan aparte en la tuya (Game.salvasMias).
 *
 * Dónde se guarda
 *   En los contadores de los logros (mae_<rol>, maes_<rol>, maep_<rol>,
 *   maesem_<rol>), que ya viajan a la cuenta y se funden quedándose con lo
 *   más alto de cada lado. No hace falta ninguna columna nueva.
 *
 * Lo ya jugado
 *   Al llegar, se siembra UNA vez con lo que se puede demostrar
 *   (sembrar): cada partida de DESATADO del contador `hab:partidas` cuenta
 *   como una B (CFG.MAESTRIA.SEMBRADA). El rol sale de las repeticiones
 *   guardadas, que lo llevan apuntado; las que no están —y todas las de
 *   antes del 17 de septiembre, cuando el único kit era el del Asesino— van
 *   al ASESINO. Se repite al entrar en la cuenta, que puede traer más
 *   historial, sumando solo la diferencia (maesem_<rol>).
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var M = CFG.MAESTRIA;
  var ROLES = (CFG.HAB && CFG.HAB.ROL_IDS) || ['asesino', 'tanque', 'mago', 'soporte'];

  function A() { return window.PM.Achievements; }

  function stat(c, k) { return Math.max(0, Math.floor((c && c[k]) || 0)); }

  function esRol(r) { return ROLES.indexOf(r) !== -1; }

  /* Índice del escalón (−1 si aún ninguno) para esos puntos y esas S */
  function nivelDe(puntos, eses) {
    var n = -1;
    for (var i = 0; i < M.NIVELES.length; i++) {
      var L = M.NIVELES[i];
      if (puntos >= L.puntos && eses >= L.eses) n = i;
      else break;
    }
    return n;
  }

  /* El VALOR de una partida con ese rol: lo que el rol tiene que hacer, por
   * minuto en pie, rebajado por las muertes. */
  function valor(rol, m, salvas, minutos) {
    var kills = m.kills || 0, v;
    if (rol === 'tanque') v = salvas * 3 + kills;
    else if (rol === 'soporte') v = (m.rescates || 0) * 3 + (m.apoyos || 0) + kills;
    else v = kills;                                   // asesino y mago
    v = v / Math.max(0.75, minutos);
    return v / (1 + (m.muertes || 0) * M.CASTIGO_MUERTE);
  }

  function notaDe(rol, v) {
    var t = M.NOTAS[rol] || M.NOTAS.asesino;
    var letras = ['S', 'A', 'B', 'C'];
    for (var i = 0; i < t.length; i++) if (v >= t[i]) return letras[i];
    return 'D';
  }

  /* Rol que jugaba el jugador idx de una repetición online, buscándome por
   * el nombre: la cabecera guarda los nombres y los roles en el mismo orden */
  function miNombre() {
    var Ac = window.PM.Account;
    var n = (Ac && Ac.logged && Ac.logged() && Ac.name) ? Ac.name() : '';
    if (!n) n = (window.PM.settings && window.PM.settings.nick1) || '';
    return String(n || '').toUpperCase();
  }

  var Maestria = {
    ROLES: ROLES,
    nivelDe: nivelDe,
    notaDe: notaDe,
    valor: valor,

    /* Todo lo de un rol:
     *   { rol, puntos, eses, partidas, sembradas, nivel (−1..5),
     *     sig (el escalón siguiente o null), falta (puntos), faltaS } */
    datos: function (rol) {
      var c = A() ? A().stats() : {};
      var puntos = stat(c, 'mae_' + rol), eses = stat(c, 'maes_' + rol);
      var nivel = nivelDe(puntos, eses);
      var sig = M.NIVELES[nivel + 1] || null;
      return {
        rol: rol, puntos: puntos, eses: eses,
        partidas: stat(c, 'maep_' + rol), sembradas: stat(c, 'maesem_' + rol),
        nivel: nivel, sig: sig,
        falta: sig ? Math.max(0, sig.puntos - puntos) : 0,
        faltaS: sig ? Math.max(0, sig.eses - eses) : 0
      };
    },

    /* El escalón que se enseña con Ctrl+Espacio (−1 si ninguno) */
    nivel: function (rol) { return esRol(rol) ? this.datos(rol).nivel : -1; },

    /* ¿Esta partida cuenta para la maestría? DESATADO de verdad, jugado
     * aquí: ni mirando, ni viendo una repetición, ni en PAC-MAN VS. (ahí
     * medio equipo lleva fantasmas y no hay roles que medir). */
    cuenta: function (G) {
      if (!G || !G.hab || !G.roles) return false;
      if (G.replaying || (G.isSpec && G.isSpec())) return false;
      if (G.isVersus && G.isVersus()) return false;
      if (G.caza || G.superv) return false;
      var yo = G.netRole ? G.localIdx : 0;
      return yo >= 0 && esRol(G.roles[yo]);
    },

    /* Al cerrar la partida (Game.closeRun): calcula la nota, apunta los
     * puntos y devuelve el resumen para el GAME OVER, o null si no contaba.
     *   { rol, nota, valor, puntos, total, nivelAntes, nivel, sig, falta,
     *     faltaS, corta } */
    cerrar: function (G) {
      if (!this.cuenta(G) || !A()) return null;
      var yo = G.netRole ? G.localIdx : 0;
      var rol = G.roles[yo];
      var antes = this.datos(rol);
      var seg = (G.timeTicks || 0) / 60;
      if (seg < M.MIN_SEGUNDOS) {
        return { rol: rol, corta: true, puntos: 0, total: antes.puntos,
                 nivelAntes: antes.nivel, nivel: antes.nivel, sig: antes.sig,
                 falta: antes.falta, faltaS: antes.faltaS };
      }
      var m = (G.marcador && G.marcador[yo]) || {};
      var minutos = (m.vivo || 0) / 3600;
      var v = valor(rol, m, G.salvasMias || 0, minutos);
      var nota = notaDe(rol, v);
      var pts = M.PUNTOS[nota] || 0;
      var o = {};
      o['mae_' + rol] = pts;
      o['maep_' + rol] = 1;
      if (nota === 'S') o['maes_' + rol] = 1;
      A().recordAll(o);
      var ahora = this.datos(rol);
      return {
        rol: rol, nota: nota, valor: Math.round(v * 10) / 10, puntos: pts,
        total: ahora.puntos, nivelAntes: antes.nivel, nivel: ahora.nivel,
        sig: ahora.sig, falta: ahora.falta, faltaS: ahora.faltaS
      };
    },

    /* ---------- lo ya jugado ----------
     * Cuántas partidas de DESATADO hay de cada rol en lo que se puede
     * demostrar. Devuelve { asesino: n, ... }. */
    contarPasadas: function () {
      var out = {}, i;
      for (i = 0; i < ROLES.length; i++) out[ROLES[i]] = 0;
      var R = window.PM.Replay;
      var otros = 0;              // partidas con un rol que no es el Asesino
      var desde = this.desde();   // lo de después ya lo contó la maestría
      if (R) {
        /* las de este aparato: el jugador 1 es quien jugaba aquí */
        var loc = R.guardadas ? R.guardadas() : [];
        for (i = 0; i < loc.length; i++) {
          if (!(loc[i].t < desde)) continue;
          var rep = R.leer ? R.leer(loc[i].s) : null;
          if (!rep || !/^hab/.test(rep.modo) || rep.modo === 'habvs') continue;
          var r = (rep.ajustes && rep.ajustes.roles && rep.ajustes.roles[0]) || 'asesino';
          if (esRol(r) && r !== 'asesino') { out[r]++; otros++; }
        }
        /* las online: me busco por el nombre en la cabecera */
        var yo = miNombre();
        var red = R.guardadasRed ? R.guardadasRed() : [];
        for (i = 0; yo && i < red.length; i++) {
          if (!(red[i].t < desde)) continue;
          var cab = null;
          try { cab = JSON.parse(String(red[i].s || '').split('\n')[0]); } catch (e) { cab = null; }
          if (!cab || !cab.hb || !cab.rl || !cab.nm) continue;
          var idx = -1;
          for (var k = 0; k < cab.nm.length; k++) {
            if (String(cab.nm[k] || '').toUpperCase() === yo) idx = k;
          }
          var rr = idx >= 0 ? cab.rl[idx] : null;
          if (esRol(rr) && rr !== 'asesino') { out[rr]++; otros++; }
        }
      }
      /* Todo lo demás de DESATADO, al Asesino: era el único kit hasta el 17 de
       * septiembre, y es el que lleva quien no elige */
      var c = A() ? A().stats() : {};
      var antes = stat(c, 'hab:partidas') - stat(c, 'maevivas');
      out.asesino = Math.max(0, antes - otros);
      return out;
    },

    /* Desde cuándo cuentan las maestrías EN ESTE APARATO (las repeticiones son
     * de cada aparato): lo grabado antes se siembra, lo de después ya lo contó
     * cerrar(). Se apunta la primera vez que se mira. */
    desde: function () {
      var K = 'pacman-topmundial-maestria-desde';
      var t = 0;
      try { t = parseInt(localStorage.getItem(K), 10) || 0; } catch (e) { t = 0; }
      if (!t) {
        t = Date.now();
        try { localStorage.setItem(K, String(t)); } catch (e) { /* sin almacén */ }
      }
      return t;
    },

    /* Una partida de DESATADO cerrada con las maestrías en marcha, cuente o
     * no (las cortas también suben hab:partidas). Game.closeRun la apunta en
     * la misma jugada que hab:partidas. */
    anotarViva: function () { if (A()) A().record('maevivas', 1); },

    /* Siembra (o completa) lo ya jugado. Solo suma lo que no se hubiera
     * sembrado ya (maesem_<rol>), así que se puede llamar las veces que haga
     * falta: al arrancar y al entrar en la cuenta. */
    sembrar: function () {
      if (!A()) return false;
      var n = this.contarPasadas();
      var c = A().stats();
      var o = {}, algo = false;
      for (var i = 0; i < ROLES.length; i++) {
        var r = ROLES[i];
        var ya = stat(c, 'maesem_' + r);
        var dif = (n[r] || 0) - ya;
        if (dif <= 0) continue;
        o['mae_' + r] = dif * M.SEMBRADA;
        o['maep_' + r] = dif;
        o['maesem_' + r] = n[r];
        algo = true;
      }
      if (algo) A().recordAll(o);
      return algo;
    }
  };

  window.PM.Maestria = Maestria;
})();
