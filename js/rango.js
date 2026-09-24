/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/rango.js
 * RANGO DE TEMPORADA y partidas CLASIFICATORIAS. Define window.PM.Rango
 *
 * Qué es
 *   Un rango que SUBE Y BAJA partida a partida, como en League of Legends,
 *   para DESATADO. El top mundial dice quién tiene la mejor marca; esto dice
 *   cómo juegas este mes. UNO SOLO por jugador (24 sep): se juega a solo o
 *   en party y es el mismo rango; en party la marca a superar se multiplica
 *   como la de los trofeos (x1,25 dúo, x1,5 trío, x1,75 escuadra).
 *
 * Cómo funciona
 *   · Las divisiones son las ocho frutas (CEREZA … LLAVE), partidas en
 *     ESCALONES (CEREZA IV … CEREZA I) que piden cada vez más (CFG.RANGO).
 *   · Las cinco primeras partidas del mes son de COLOCACIÓN: no mueven nada,
 *     y al acabar la quinta te colocan según tu media.
 *   · Después, cada partida da o quita PR según tu marca contra la de tu
 *     escalón: el doble da +20, igualarla nada, la mitad −20. Sin llegar al
 *     nivel que pide tu fruta, no se gana.
 *   · Cada mes se vuelve a empezar (la temporada es la de Season.actual()).
 *
 * Qué cuenta
 *   Las partidas del modo CLASIFICATORIA, a solo o en party. En party cuenta
 *   la marca del EQUIPO contra la de tu escalón multiplicada por el formato,
 *   y a cada uno le mueve SU rango.
 *   Además: DESATADO de verdad (ni PAC-MAN VS., ni CACERÍA, ni
 *   supervivencia), ajustes de siempre, sin semilla de fuera y CON CUENTA,
 *   que es lo que te pone en la tabla. Salirse a medias también cuenta: si
 *   no, abandonar sería la forma de no perder nunca.
 *
 * Dónde se guarda
 *   En contadores sueltos de los logros (como los del pase), que viajan a la
 *   cuenta y se funden quedándose con lo más alto de cada lado. Por eso el PR
 *   no se guarda tal cual —bajar no se podría fundir—, sino como lo ganado y
 *   lo perdido, que solo crecen:
 *     rc4_<temporada>  partidas clasificatorias jugadas
 *     rt4_<temporada>  suma de las marcas de colocación, pasadas a SOLO
 *                      (en party, los puntos entre el multiplicador)
 *     rg4_<temporada>  PR ganado · rl4_… PR perdido
 *     rm4_<temporada>  mejor escalón alcanzado, +1 (0 = ninguno)
 *   El número es la versión de las reglas (CFG.RANGO.VERSION): al cambiarlas
 *   se sube, y los contadores de antes dejan de leerse.
 *   PR = colocación + ganado − perdido.
 *
 * La tabla
 *   Se arma leyendo los perfiles (lectura pública) y aplicando esta misma
 *   cuenta a los contadores de cada uno. Con pocas cuentas es lo más sencillo;
 *   si algún día son miles, habrá que pasarlo a una vista en el servidor.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var RG = CFG.RANGO;
  var DIV = RG.DIVISIONES;
  var ROMANOS = ['I', 'II', 'III', 'IV'];

  function A() { return window.PM.Achievements; }
  function num(v) { var n = Math.floor(v || 0); return n > 0 ? n : 0; }

  function temporada() {
    return window.PM.Season ? window.PM.Season.actual() : '';
  }
  /* rc4_2026-09: la VERSIÓN de las reglas va en la clave. Los contadores
   * de las de antes (rc_…) se quedan donde están y no se leen: si no, un
   * aparato que aún los tuviera los devolvería al fundir con la cuenta. */
  /* Hasta la versión 3 había un rango por formato (…_1 a …_4); desde la 4
   * es uno solo y la clave ya no lleva formato. */
  function clave(tipo, t) {
    var v = RG.VERSION > 1 ? RG.VERSION : '';
    return tipo + v + '_' + t + (RG.VERSION >= 4 ? '' : '_1');
  }

  /* multiplicador del formato (el de los trofeos: equipo x1,25 / 1,5 / 1,75) */
  function mult(n) {
    var B = window.PM.Badges;
    var f = B && B.FORMATOS && B.FORMATOS[(n | 0) - 1];
    return f ? f.mult : 1;
  }

  /* LOS ESCALONES, de abajo arriba: CEREZA IV, CEREZA III … CAMPANA I,
   * LLAVE. Cada uno sabe de qué fruta es, desde qué PR empieza, cuántos
   * ocupa (0 en LLAVE: no tiene techo) y su marca, que sube a pasos iguales
   * (en proporción) desde la de su fruta hasta la de la siguiente. */
  var TRAMOS = (function () {
    var out = [], desde = 0;
    for (var d = 0; d < DIV.length; d++) {
      var D = DIV[d], k = D.escalones || 1, sig = DIV[d + 1];
      var r = sig ? Math.pow(sig.par / D.par, 1 / k) : 1;
      for (var j = 0; j < k; j++) {
        var rom = k > 1 ? ROMANOS[k - 1 - j] : '';
        out.push({ d: d, j: j, rom: rom, nombre: D.name + (rom ? ' ' + rom : ''),
                   desde: desde, ancho: sig ? D.prEscalon : 0,
                   par: Math.round(D.par * Math.pow(r, j) / 100) * 100 });
        if (sig) desde += D.prEscalon;
      }
    }
    return out;
  })();

  function tramo(pr) {
    pr = num(pr);
    for (var i = TRAMOS.length - 1; i > 0; i--) if (pr >= TRAMOS[i].desde) return i;
    return 0;
  }
  function division(pr) { return TRAMOS[tramo(pr)].d; }
  /* la marca de la fruta (la de su primer escalón) y la de un escalón */
  function par(d, n) { return DIV[Math.max(0, Math.min(DIV.length - 1, d))].par * mult(n); }
  function parTramo(t, n) { return TRAMOS[Math.max(0, Math.min(TRAMOS.length - 1, t))].par * mult(n); }

  /* PR de colocación para una media de puntos. Estricta (24 sep): un
   * escalón POR DEBAJO del más alto cuya marca alcanzas, al principio de él
   * y nunca por encima de TOPE_COLOCACION. Colocarse no regala nada: lo de
   * arriba se gana jugando. */
  function colocar(media, n) {
    var t = -1;
    for (var i = 0; i < TRAMOS.length; i++) if (media >= parTramo(i, n)) t = i;
    t = Math.min(t - 1, RG.TOPE_COLOCACION != null ? RG.TOPE_COLOCACION : TRAMOS.length - 1);
    return t < 0 ? 0 : TRAMOS[t].desde;
  }

  /* Lo que mueve una partida de `puntos` a quien está en `pr`. Sin llegar
   * al `nivel` de su fruta no se gana nada (restar, sí). */
  function cambio(puntos, pr, n, nivel) {
    var t = tramo(pr), D = DIV[TRAMOS[t].d];
    var r = Math.max(1, puntos) / parTramo(t, n);
    var d = Math.round(RG.PASO * Math.log(r) / Math.LN2);
    if (d > 0 && nivel != null && nivel < (D.nivel || 1)) d = 0;
    return Math.max(-D.pierde, Math.min(D.gana, d));
  }

  /* El rango a partir de unos contadores (los tuyos o los de otro perfil,
   * que para la tabla es lo mismo) */
  function estadoDe(c, t) {
    var jugadas = num(c[clave('rc', t)]);
    var mejor = num(c[clave('rm', t)]) - 1;
    var out = { temporada: t, jugadas: jugadas,
                colocacion: Math.min(jugadas, RG.COLOCACION), pr: null,
                division: -1, tramo: -1, nombre: '',
                mejor: mejor, mejorNombre: mejor >= 0 && TRAMOS[mejor] ? TRAMOS[mejor].nombre : '' };
    if (jugadas < RG.COLOCACION) return out;
    // la colocación se guarda ya pasada a SOLO: se coloca con la marca de solo
    var base = colocar(num(c[clave('rt', t)]) / RG.COLOCACION, 1);
    out.pr = Math.max(0, base + num(c[clave('rg', t)]) - num(c[clave('rl', t)]));
    var i = tramo(out.pr), T = TRAMOS[i];
    out.tramo = i;
    out.division = T.d;
    out.nombre = T.nombre;
    out.enTramo = out.pr - T.desde;
    out.anchoTramo = T.ancho;                                   // 0 en LLAVE
    out.faltan = T.ancho ? (T.ancho - out.enTramo) : 0;
    out.siguiente = TRAMOS[i + 1] ? TRAMOS[i + 1].nombre : '';
    return out;
  }

  var Rango = {
    DIVISIONES: DIV,
    TRAMOS: TRAMOS,
    tramo: tramo,
    division: division,
    colocar: colocar,
    cambio: cambio,
    par: par,
    parTramo: parTramo,
    clave: clave,
    temporada: temporada,
    estadoDe: estadoDe,

    /* ¿Esta partida es CLASIFICATORIA? Es un modo desde el 23 sep (antes,
     * un interruptor de cada jugador en los ajustes) */
    activa: function (G) { return !!(G && G.clasif); },

    /* EN VIVO (24 sep): lo que te llevarías si la partida acabara ahora
     * mismo, para el contador de la barra (UI.refreshRangoVivo). null si no
     * es una CLASIFICATORIA que cuente para ti. Sale del rango que tenías al
     * empezar (G.rangoInicio) y de los puntos y el nivel de ahora. */
    enVivo: function (G) {
      var e = G && G.clasif && G.rangoInicio;
      if (!e || G.replaying || (G.isSpec && G.isSpec())) return null;
      var n = G.playerCount || 1, puntos = Math.max(0, G.score || 0), nivel = G.level || 1;
      if (e.pr === null) {
        return { colocando: true, jugada: Math.min(e.jugadas + 1, RG.COLOCACION),
                 de: RG.COLOCACION, puntos: puntos };
      }
      var D = DIV[e.division], marca = parTramo(e.tramo, n);
      var d = cambio(puntos, e.pr, n, nivel);
      if (d < 0) d = -Math.min(-d, e.pr);       // en el suelo no se pierde
      return { colocando: false, nombre: e.nombre, color: D.color, cambio: d,
               puntos: puntos, marca: marca, pct: Math.min(1, puntos / marca),
               nivelPide: D.nivel || 1, nivelOk: nivel >= (D.nivel || 1) };
    },

    /* Tu rango en un formato (1..4) esta temporada */
    /* Tu rango esta temporada (el único: vale para solo y para party) */
    estado: function (t) {
      if (typeof t !== 'string') t = null;      // antes se pasaba el formato
      return estadoDe(A() ? A().stats() : {}, t || temporada());
    },

    /* Por qué esta partida NO cuenta (o null si cuenta). Sirve para decírselo
     * a quien la juega antes de empezar y en el GAME OVER. */
    porQueNo: function (G) {
      if (!G || !G.hab) return 'SOLO EN DESATADO';
      if (!this.activa(G)) return 'NO ES CLASIFICATORIA';
      if (G.replaying || (G.isSpec && G.isSpec())) return 'MIRANDO';
      if ((G.isVersus && G.isVersus()) || G.caza || G.superv) return 'ESTE MODO NO CUENTA';
      if (G.seedBase) return 'CON SEMILLA DE FUERA NO CUENTA';
      var r = CFG.TIME_RULES;
      if (G.startLevel !== r.startLevel || G.pacSpeedMult !== r.pacSpeedMult ||
          G.ghostSpeedMult !== r.ghostSpeedMult || G.frightMult !== r.frightMult) {
        return 'CON AJUSTES CAMBIADOS NO CUENTA';
      }
      if (!this.conCuenta()) return 'HACE FALTA CUENTA';
      return null;
    },

    /* ¿Hay sesión? Aparte para que las pruebas puedan fingirla sin montar
     * una cuenta entera (con sesión, media partida mira el usuario). */
    conCuenta: function () {
      var Ac = window.PM.Account;
      return !!(Ac && Ac.logged && Ac.logged());
    },

    /* Al cerrar la partida (Game.closeRun). Devuelve el resumen para el GAME
     * OVER, o null si no contaba:
     *   { n, puntos, colocando (true si aún no hay rango), jugadas,
     *     antes, despues (PR), cambio, division, divisionAntes, sube, baja } */
    cerrar: function (G) {
      if (this.porQueNo(G) || !A()) return null;
      // la del equipo: es la que compite
      return this.apuntar(Math.max(0, G.score || 0), G.playerCount || 1, G.level || 1);
    },

    /* Apunta una partida de `puntos` en el formato `n` y devuelve el resumen.
     * La usa cerrar() y también la CLASIFICATORIA guardada que se descarta
     * sin terminarla (js/guardado.js): dejarla a medias no libra de contar. */
    apuntar: function (puntos, n, nivel) {
      if (!A()) return null;
      var t = temporada();
      var antes = this.estado(t);
      var o = {};
      o[clave('rc', t)] = 1;
      var res = { n: n, puntos: puntos, nivel: nivel, antes: antes.pr,
                  divisionAntes: antes.division, tramoAntes: antes.tramo };
      if (antes.jugadas < RG.COLOCACION) {
        // pasada a SOLO: en party se divide entre el multiplicador del equipo
        o[clave('rt', t)] = Math.round(puntos / mult(n));
        A().recordAll(o);
        var tras = this.estado(t);
        res.colocando = tras.pr === null;
        res.jugadas = tras.colocacion;
        res.despues = tras.pr;
        res.division = tras.division;
        res.tramo = tras.tramo;
        res.nombre = tras.nombre;
        res.cambio = 0;
      } else {
        var d = cambio(puntos, antes.pr, n, nivel);
        /* ¿se quedó sin ganar por no llegar al nivel? (para decirlo) */
        var D = DIV[antes.division];
        res.sinNivel = nivel != null && nivel < (D.nivel || 1) && d === 0 &&
          cambio(puntos, antes.pr, n) > 0;
        res.nivelPide = D.nivel || 1;
        /* en el suelo no se acumula deuda: lo que no se puede perder no se
         * apunta como perdido */
        if (d < 0) d = -Math.min(-d, antes.pr);
        if (d > 0) o[clave('rg', t)] = d;
        else if (d < 0) o[clave('rl', t)] = -d;
        A().recordAll(o);
        var ya = this.estado(t);
        res.cambio = d;
        res.despues = ya.pr;
        res.division = ya.division;
        res.tramo = ya.tramo;
        res.nombre = ya.nombre;
        res.jugadas = ya.jugadas;
      }
      // lo más alto, por ESCALÓN (+1; 0 = ninguno)
      if (res.tramo >= 0) A().record(clave('rm', t), res.tramo + 1);
      res.sube = res.tramo > res.tramoAntes && res.tramoAntes >= 0;
      res.baja = res.tramo < res.tramoAntes;
      res.colocado = antes.pr === null && res.despues !== null;
      return res;
    },

    /* La tabla de un formato: cb(err, [{ usuario, avatar, pr, division,
     * jugadas }]) ordenada por PR. Los que aún se están colocando van al
     * final, con su cuenta de partidas. */
    tabla: function (cb, t) {
      t = t || temporada();
      var c = window.PM.NET_CFG || {};
      if (!(c.SUPABASE_URL && c.SUPABASE_KEY && window.fetch)) { cb('SIN CONFIGURAR', null); return; }
      var url = String(c.SUPABASE_URL).replace(/\/+$/, '') +
        '/rest/v1/' + (CFG.ACCOUNT && CFG.ACCOUNT.TABLE || 'perfiles') +
        '?select=usuario,avatar,logros';
      fetch(url, { method: 'GET', headers: {
        'apikey': c.SUPABASE_KEY, 'Authorization': 'Bearer ' + c.SUPABASE_KEY,
        'Accept': 'application/json' } })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
        .then(function (filas) {
          var out = [];
          (filas || []).forEach(function (f) {
            var lg = f && f.logros;
            var cc = (lg && lg.c) || lg || {};
            var e = estadoDe(cc, t);
            if (!e.jugadas) return;
            out.push({ usuario: String(f.usuario || ''), avatar: f.avatar || '',
                       pr: e.pr, division: e.division, tramo: e.tramo, nombre: e.nombre,
                       jugadas: e.jugadas,
                       colocacion: e.colocacion });
          });
          out.sort(function (a, b) {
            if ((a.pr === null) !== (b.pr === null)) return a.pr === null ? 1 : -1;
            if (a.pr !== b.pr) return (b.pr || 0) - (a.pr || 0);
            return b.jugadas - a.jugadas;
          });
          cb(null, out);
        })
        .catch(function (e) { cb((e && e.message) || 'SIN CONEXIÓN', null); });
    }
  };

  window.PM.Rango = Rango;
})();
