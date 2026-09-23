/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/rango.js
 * RANGO DE TEMPORADA y partidas CLASIFICATORIAS. Define window.PM.Rango
 *
 * Qué es
 *   Un rango que SUBE Y BAJA partida a partida, como en League of Legends,
 *   para DESATADO. El top mundial dice quién tiene la mejor marca; esto dice
 *   cómo juegas este mes. Uno por FORMATO (solo, dúo, trío, escuadra): las
 *   cuatro ligas no se mezclan nunca.
 *
 * Cómo funciona
 *   · Las divisiones son las ocho frutas (CEREZA … LLAVE), 100 puntos de
 *     rango (PR) cada una (CFG.RANGO).
 *   · Las cinco primeras partidas del mes son de COLOCACIÓN: no mueven nada,
 *     y al acabar la quinta te colocan según tu media.
 *   · Después, cada partida da o quita PR según tu marca contra el `par` de
 *     tu división: el doble da +30, igualarlo +5, la mitad −20.
 *   · Cada mes se vuelve a empezar (la temporada es la de Season.actual()).
 *
 * Qué cuenta
 *   Solo las partidas que TÚ juegas en CLASIFICATORIA (el interruptor vive en
 *   los ajustes, `clasif`, y es de cada jugador): en una party, cada uno
 *   decide si esa partida le mueve su rango, y la marca es la del equipo.
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
 *     rc_<temporada>_<n>  partidas clasificatorias jugadas
 *     rt_<temporada>_<n>  suma de las marcas de colocación
 *     rg_<temporada>_<n>  PR ganado · rl_… PR perdido
 *     rm_<temporada>_<n>  mejor división alcanzada, +1 (0 = ninguna)
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

  function A() { return window.PM.Achievements; }
  function num(v) { var n = Math.floor(v || 0); return n > 0 ? n : 0; }

  function temporada() {
    return window.PM.Season ? window.PM.Season.actual() : '';
  }
  function clave(tipo, t, n) { return tipo + '_' + t + '_' + n; }

  /* multiplicador del formato (el de los trofeos: equipo x1,25 / 1,5 / 1,75) */
  function mult(n) {
    var B = window.PM.Badges;
    var f = B && B.FORMATOS && B.FORMATOS[(n | 0) - 1];
    return f ? f.mult : 1;
  }

  function par(d, n) { return DIV[Math.max(0, Math.min(DIV.length - 1, d))].par * mult(n); }

  function division(pr) {
    return Math.max(0, Math.min(DIV.length - 1, Math.floor(num(pr) / RG.PR_DIVISION)));
  }

  /* PR de colocación para una media de puntos: la división más alta cuyo par
   * alcanzas, y dentro de ella la mitad baja o alta según lo cerca que estés
   * del par siguiente. */
  function colocar(media, n) {
    var d = -1;
    for (var i = 0; i < DIV.length; i++) if (media >= par(i, n)) d = i;
    if (d < 0) return Math.round(RG.PR_DIVISION / 2 * Math.max(0, media / par(0, n)));
    var sig = (d + 1 < DIV.length) ? par(d + 1, n) : par(d, n) * 2;
    var frac = Math.max(0, Math.min(1, (media - par(d, n)) / Math.max(1, sig - par(d, n))));
    return d * RG.PR_DIVISION + Math.round(frac * RG.PR_DIVISION * 0.5);
  }

  /* Lo que mueve una partida de `puntos` a quien está en `pr` */
  function cambio(puntos, pr, n) {
    var p = par(division(pr), n);
    var r = Math.max(1, puntos) / p;
    var d = Math.round(RG.PASO * Math.log(r) / Math.LN2) + RG.BASE;
    return Math.max(-RG.MAX_PIERDE, Math.min(RG.MAX_GANA, d));
  }

  /* El estado de un formato a partir de unos contadores (los tuyos o los de
   * otro perfil, que para la tabla es lo mismo) */
  function estadoDe(c, t, n) {
    var jugadas = num(c[clave('rc', t, n)]);
    var out = { temporada: t, n: n, jugadas: jugadas,
                colocacion: Math.min(jugadas, RG.COLOCACION), pr: null,
                division: -1, mejor: num(c[clave('rm', t, n)]) - 1 };
    if (jugadas < RG.COLOCACION) return out;
    var base = colocar(num(c[clave('rt', t, n)]) / RG.COLOCACION, n);
    out.pr = Math.max(0, base + num(c[clave('rg', t, n)]) - num(c[clave('rl', t, n)]));
    out.division = division(out.pr);
    out.enDivision = out.pr - out.division * RG.PR_DIVISION;
    return out;
  }

  var Rango = {
    DIVISIONES: DIV,
    division: division,
    colocar: colocar,
    cambio: cambio,
    par: par,
    temporada: temporada,
    estadoDe: estadoDe,

    /* ¿Esta partida es CLASIFICATORIA? Es un modo desde el 23 sep (antes,
     * un interruptor de cada jugador en los ajustes) */
    activa: function (G) { return !!(G && G.clasif); },

    /* Tu rango en un formato (1..4) esta temporada */
    estado: function (n, t) {
      return estadoDe(A() ? A().stats() : {}, t || temporada(), n || 1);
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
      var t = temporada(), n = G.playerCount || 1;
      var puntos = Math.max(0, G.score || 0);   // la del equipo: es la que compite
      var antes = this.estado(n, t);
      var o = {};
      o[clave('rc', t, n)] = 1;
      var res = { n: n, puntos: puntos, antes: antes.pr, divisionAntes: antes.division };
      if (antes.jugadas < RG.COLOCACION) {
        o[clave('rt', t, n)] = puntos;
        A().recordAll(o);
        var tras = this.estado(n, t);
        res.colocando = tras.pr === null;
        res.jugadas = tras.colocacion;
        res.despues = tras.pr;
        res.division = tras.division;
        res.cambio = 0;
      } else {
        var d = cambio(puntos, antes.pr, n);
        /* en el suelo no se acumula deuda: lo que no se puede perder no se
         * apunta como perdido */
        if (d < 0) d = -Math.min(-d, antes.pr);
        if (d > 0) o[clave('rg', t, n)] = d;
        else if (d < 0) o[clave('rl', t, n)] = -d;
        A().recordAll(o);
        var ya = this.estado(n, t);
        res.cambio = d;
        res.despues = ya.pr;
        res.division = ya.division;
        res.jugadas = ya.jugadas;
      }
      if (res.division >= 0) A().record(clave('rm', t, n), res.division + 1);
      res.sube = res.division > res.divisionAntes && res.divisionAntes >= 0;
      res.baja = res.division < res.divisionAntes;
      res.colocado = antes.pr === null && res.despues !== null;
      return res;
    },

    /* La tabla de un formato: cb(err, [{ usuario, avatar, pr, division,
     * jugadas }]) ordenada por PR. Los que aún se están colocando van al
     * final, con su cuenta de partidas. */
    tabla: function (n, cb, t) {
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
            var e = estadoDe(cc, t, n);
            if (!e.jugadas) return;
            out.push({ usuario: String(f.usuario || ''), avatar: f.avatar || '',
                       pr: e.pr, division: e.division, jugadas: e.jugadas,
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
