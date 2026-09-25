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
 *   · Cada mes se vuelve a empezar (la temporada es la de Season.actual()),
 *     pero no de cero (25 sep): quien tuvo rango el mes pasado arranca desde
 *     una parte de su PR (CFG.RANGO.ARRASTRE) y la colocación se juega desde
 *     ahí, moviendo el doble.
 *   · Cada rol cuenta con su FACTOR (CFG.RANGO.FACTOR_ROL): la marca de un
 *     SOPORTE vale más que la misma de un ASESINO, que puntúa más fácil.
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
 *     ru4_<temporada>  PR ganado en la colocación · rd4_… PR perdido en ella
 *                      (solo con temporada anterior: ver semillaDe)
 *   El número es la versión de las reglas (CFG.RANGO.VERSION): al cambiarlas
 *   se sube, y los contadores de antes dejan de leerse.
 *   PR = colocación + ganado − perdido; con temporada anterior, la
 *   colocación es la semilla + lo ganado en ella − lo perdido en ella.
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

  /* LOS AJUSTES A MANO de una cuenta (CFG.AJUSTES_CUENTA, rango): PR que se
   * suman a una temporada. Se aplican al LEER, sobre una copia de los
   * contadores —en la nube no se pueden tocar: los aparatos se funden
   * quedándose con lo más alto—, y lo más alto de esa temporada sube con
   * ellos (premios incluidos). */
  function ajustados(c, usuario) {
    var AJ = CFG.AJUSTES_CUENTA || {};
    var aj = usuario && AJ[String(usuario).toUpperCase()];
    var R = aj && aj.rango;
    if (!R) return c;
    var out = {}, k;
    for (k in c) if (c.hasOwnProperty(k)) out[k] = c[k];
    for (var t in R) {
      if (!R.hasOwnProperty(t) || !num(out[clave('rc', t)])) continue;
      out[clave('rg', t)] = num(out[clave('rg', t)]) + (R[t] | 0);
      var e = estadoDe(out, t);
      if (e.tramo >= 0) out[clave('rm', t)] = Math.max(num(out[clave('rm', t)]), e.tramo + 1);
    }
    return out;
  }
  /* los tuyos, ya ajustados */
  function mios() {
    var c = A() ? A().stats() : {}, Ac = window.PM.Account;
    var yo = '';
    try { yo = (Ac && Ac.logged && Ac.logged() && Ac.name) ? Ac.name() : ''; } catch (e) { yo = ''; }
    return ajustados(c, yo);
  }

  /* EL FACTOR DE LOS ROLES (CFG.RANGO.FACTOR_ROL): el de uno, o la media
   * de los del equipo. Sin roles (las de antes, o todos Asesino), 1. */
  function factorRoles(roles, n) {
    var F = RG.FACTOR_ROL || {}, suma = 0, k = 0;
    n = Math.max(1, n | 0);
    for (var i = 0; i < n; i++) {
      var r = roles && roles[i], f = F[r] > 0 ? F[r] : (F.asesino || 1);
      suma += f; k++;
    }
    return k ? suma / k : 1;
  }

  /* 'AAAA-MM' del mes de antes */
  function mesAnterior(t) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(t || ''));
    if (!m) return '';
    var a = m[1] | 0, n = (m[2] | 0) - 1;
    if (n < 1) { n = 12; a--; }
    return a + '-' + (n < 10 ? '0' : '') + n;
  }

  /* LA SEMILLA (el reinicio suave): desde dónde empieza la temporada quien
   * tuvo rango en la anterior. null si no lo tuvo (o no acabó de colocarse):
   * entonces se coloca como siempre. prof corta la cuenta hacia atrás, que
   * cada mes depende del anterior. */
  function semillaDe(c, t, prof) {
    prof = prof || 0;
    var ant = mesAnterior(t);
    if (!ant || prof >= 24 || !num(c[clave('rc', ant)])) return null;
    var e = estadoDe(c, ant, prof + 1);
    if (e.pr === null) return null;
    var conf = Math.min(1, e.jugadas / (RG.CONFIANZA || 1));
    return { pr: Math.max(0, Math.round(e.pr * RG.ARRASTRE * conf)), de: e.nombre, deTramo: e.tramo };
  }

  /* El rango a partir de unos contadores (los tuyos o los de otro perfil,
   * que para la tabla es lo mismo) */
  function estadoDe(c, t, prof) {
    var jugadas = num(c[clave('rc', t)]);
    var mejor = num(c[clave('rm', t)]) - 1;
    var out = { temporada: t, jugadas: jugadas,
                colocacion: Math.min(jugadas, RG.COLOCACION), pr: null,
                division: -1, tramo: -1, nombre: '',
                mejor: mejor, mejorNombre: mejor >= 0 && TRAMOS[mejor] ? TRAMOS[mejor].nombre : '' };
    var sem = semillaDe(c, t, prof);
    out.semilla = sem ? sem.pr : null;
    out.vieneDe = sem ? sem.de : '';
    out.semillaNombre = sem ? TRAMOS[tramo(sem.pr)].nombre : '';
    /* con semilla, la colocación va sumando y restando desde ella (sin verse
     * hasta la quinta): aquí, dónde vas */
    var coloca = sem ? Math.max(0, sem.pr + num(c[clave('ru', t)]) - num(c[clave('rd', t)])) : null;
    out.prColoca = coloca;
    if (jugadas < RG.COLOCACION) return out;
    /* sin semilla, la colocación se guarda ya pasada a SOLO: se coloca con la
     * marca de solo */
    var base = sem ? coloca : colocar(num(c[clave('rt', t)]) / RG.COLOCACION, 1);
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

  /* Lo más alto que se alcanzó en una temporada (índice de TRAMOS, -1 si
   * nada). Vale la clave de cualquier versión de las reglas desde la 4, la
   * del rango único: las de antes eran por formato y ya no se leen. */
  function mejorEn(c, t) {
    var mejor = 0, re = /^rm(\d+)_(\d{4}-\d{2})$/, m;
    for (var k in c) {
      if (!c.hasOwnProperty(k)) continue;
      m = re.exec(k);
      if (m && (m[1] | 0) >= 4 && m[2] === t) mejor = Math.max(mejor, num(c[k]));
    }
    return Math.min(mejor, TRAMOS.length) - 1;
  }

  /* índice de una fruta por su id ('manzana' -> 3) */
  function indiceFruta(id) {
    for (var i = 0; i < DIV.length; i++) if (DIV[i].id === id) return i;
    return -1;
  }

  var MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO',
               'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  function nombreMes(t) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(t || ''));
    return m ? (MESES[(m[2] | 0) - 1] + ' ' + m[1]) : String(t || '');
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
    semillaDe: semillaDe,
    ajustados: ajustados,
    factorRoles: factorRoles,

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
      /* la marca que cuenta, con el factor de los roles */
      var cuenta = puntos / factorRoles(G.roles, n);
      if (e.pr === null) {
        return { colocando: true, jugada: Math.min(e.jugadas + 1, RG.COLOCACION),
                 de: RG.COLOCACION, puntos: puntos };
      }
      var D = DIV[e.division], marca = parTramo(e.tramo, n);
      var d = cambio(cuenta, e.pr, n, nivel);
      if (d < 0) d = -Math.min(-d, e.pr);       // en el suelo no se pierde
      return { colocando: false, nombre: e.nombre, color: D.color, cambio: d,
               puntos: puntos, marca: marca, pct: Math.min(1, cuenta / marca),
               nivelPide: D.nivel || 1, nivelOk: nivel >= (D.nivel || 1) };
    },

    /* Tu rango en un formato (1..4) esta temporada */
    /* LAS MONEDAS DEL RANGO (24 sep): la primera vez que llegas a cada fruta
     * en una temporada te llevas su `premio` (CFG.RANGO). No se guardan: se
     * DEDUCEN de lo más alto alcanzado en cada temporada (rmN_<temporada>),
     * igual que las del pase, así que juntar dos aparatos no las cobra dos
     * veces y bajar después no las quita. */
    premiosHasta: function (d) {
      var n = 0;
      for (var i = 0; i <= d && i < DIV.length; i++) n += DIV[i].premio || 0;
      return n;
    },
    monedas: function () {
      var ahora = Date.now();
      if (ahora < (this._memoHasta || 0)) return this._memo;
      var c = mios(), mejor = {}, n = 0, k, m;
      for (k in c) {
        if (!c.hasOwnProperty(k)) continue;
        /* solo las de un rango único (versión 4 en adelante: sin formato) */
        m = /^rm(\d+)_(\d{4}-\d{2})$/.exec(k);
        if (!m || (m[1] | 0) < 4) continue;
        mejor[m[2]] = Math.max(mejor[m[2]] || 0, num(c[k]));
      }
      for (k in mejor) {
        if (!mejor.hasOwnProperty(k) || !(mejor[k] > 0)) continue;
        var T = TRAMOS[Math.min(TRAMOS.length, mejor[k]) - 1];
        if (T) n += this.premiosHasta(T.d);
      }
      this._memo = n;
      this._memoHasta = ahora + 1000;
      return n;
    },

    /* =========================================================
     * LOS PREMIOS DE FIN DE TEMPORADA (aprobados el 24 sep)
     * Se ganan con lo MÁS ALTO que alcanzaste en una temporada, y se
     * entregan al cerrarse (el primer día del mes siguiente):
     *   · la fruta junto al nombre durante el mes siguiente (todos)
     *   · un recuerdo para siempre en el perfil (todos)
     *   · MANZANA o más: los laureles de esa temporada (accesorio)
     *   · CAMPANA o más: el RASTRO DORADO (efecto)
     *   · LLAVE: la skin LLAVE DORADA
     * Nada se guarda aparte: se DEDUCE de rmN_<temporada>, que viaja con la
     * cuenta y solo crece. Así no hay entrega que se pueda perder, cobrar dos
     * veces o que dependa de abrir el juego un día concreto. Nada de esto da
     * ventaja en la partida.
     * ========================================================= */
    mesAnterior: mesAnterior,
    nombreMes: nombreMes,
    mejorEn: mejorEn,

    /* Las temporadas ya CERRADAS en las que llegaste a algo, de la más nueva
     * a la más vieja: { temporada, mes, tramo, division, nombre, color, fruta } */
    cerradas: function (c, hoy) {
      c = c || mios();
      hoy = hoy || temporada();
      var vistas = {}, out = [], re = /^rm(\d+)_(\d{4}-\d{2})$/, m;
      for (var k in c) {
        if (!c.hasOwnProperty(k)) continue;
        m = re.exec(k);
        if (!m || (m[1] | 0) < 4 || m[2] >= hoy || vistas[m[2]]) continue;
        vistas[m[2]] = 1;
        var tr = mejorEn(c, m[2]);
        if (tr < 0) continue;
        var T = TRAMOS[tr], D = DIV[T.d];
        out.push({ temporada: m[2], mes: nombreMes(m[2]), tramo: tr, division: T.d,
                   nombre: T.nombre, color: D.color, fruta: D.fruta });
      }
      out.sort(function (a, b) { return a.temporada < b.temporada ? 1 : -1; });
      return out;
    },

    /* La del mes pasado, que es la que va junto al nombre este mes (o null) */
    anterior: function (c, hoy) {
      hoy = hoy || temporada();
      var t = mesAnterior(hoy);
      var l = this.cerradas(c, hoy);
      for (var i = 0; i < l.length; i++) if (l[i].temporada === t) return l[i];
      return null;
    },

    /* ¿Tiene ganado un premio? req = { fruta: 'manzana', temporada?: 'AAAA-MM' }.
     * Con temporada, tiene que ser en ESA (y ya cerrada); sin ella, en
     * cualquiera ya cerrada. */
    ganado: function (req, c, hoy) {
      if (!req) return false;
      var pide = indiceFruta(req.fruta);
      if (pide < 0) return false;
      var l = this.cerradas(c, hoy);
      for (var i = 0; i < l.length; i++) {
        if (req.temporada && l[i].temporada !== req.temporada) continue;
        if (l[i].division >= pide) return true;
      }
      return false;
    },

    /* Cómo se consigue, para el vestuario */
    comoGanar: function (req, hoy) {
      if (!req) return '';
      var d = DIV[Math.max(0, indiceFruta(req.fruta))];
      hoy = hoy || temporada();
      var mas = d.id === 'llave' ? '' : ' O MÁS';
      if (req.temporada) {
        return (req.temporada < hoy ? 'SE REPARTIÓ A QUIEN LLEGÓ A ' : 'LLEGA A ') + d.name + mas +
          ' EN LA TEMPORADA DE ' + nombreMes(req.temporada) +
          (req.temporada < hoy ? '' : ' · SE ENTREGA AL CERRARLA');
      }
      return 'LLEGA A ' + d.name + mas + ' EN UNA TEMPORADA · SE ENTREGA AL CERRARLA';
    },

    /* Tu rango esta temporada (el único: vale para solo y para party) */
    estado: function (t) {
      if (typeof t !== 'string') t = null;      // antes se pasaba el formato
      return estadoDe(mios(), t || temporada());
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
      return this.apuntar(Math.max(0, G.score || 0), G.playerCount || 1, G.level || 1, G.roles);
    },

    /* Apunta una partida de `puntos` en el formato `n` y devuelve el resumen.
     * La usa cerrar() y también la CLASIFICATORIA guardada que se descarta
     * sin terminarla (js/guardado.js): dejarla a medias no libra de contar. */
    apuntar: function (puntos, n, nivel, roles) {
      if (!A()) return null;
      var t = temporada();
      var antes = this.estado(t);
      var o = {};
      o[clave('rc', t)] = 1;
      var res = { n: n, puntos: puntos, nivel: nivel, antes: antes.pr,
                  divisionAntes: antes.division, tramoAntes: antes.tramo };
      /* lo que cuenta es la marca entre el factor de los roles (CFG.RANGO) */
      var fr = factorRoles(roles, n);
      res.factor = fr;
      puntos = puntos / fr;
      if (antes.jugadas < RG.COLOCACION) {
        if (antes.prColoca !== null) {
          /* CON SEMILLA: la colocación se juega desde ella, y mueve más */
          var X = RG.COLOCACION_X || 1, Dc = DIV[division(antes.prColoca)];
          var dc = cambio(puntos, antes.prColoca, n, nivel) * X;
          dc = Math.max(-Dc.pierde * X, Math.min(Dc.gana * X, dc));
          if (dc < 0) dc = -Math.min(-dc, antes.prColoca);
          if (dc > 0) o[clave('ru', t)] = dc;
          else if (dc < 0) o[clave('rd', t)] = -dc;
        } else {
          // pasada a SOLO: en party se divide entre el multiplicador del equipo
          o[clave('rt', t)] = Math.round(puntos / mult(n));
        }
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
      /* monedas por llegar a una fruta NUEVA esta temporada (ver monedas()) */
      var fAntes = antes.mejor >= 0 && TRAMOS[antes.mejor] ? TRAMOS[antes.mejor].d : -1;
      var mejorYa = Math.max(antes.mejor, res.tramo);
      var fYa = mejorYa >= 0 && TRAMOS[mejorYa] ? TRAMOS[mejorYa].d : -1;
      res.monedas = fYa > fAntes ? this.premiosHasta(fYa) - this.premiosHasta(fAntes) : 0;
      res.frutaNueva = res.monedas > 0 ? DIV[fYa].name : '';
      this._memoHasta = 0;
      res.sube = res.tramo > res.tramoAntes && res.tramoAntes >= 0;
      res.baja = res.tramo < res.tramoAntes;
      res.colocado = antes.pr === null && res.despues !== null;
      /* la pantalla de SUBES DE DIVISIÓN / NUEVO RANGO (js/celebrar.js): se
       * apunta aquí, acabe como acabe la partida, y sale aunque se cierre */
      if (window.PM.Celebrar) window.PM.Celebrar.rango(res);
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
          var out = [], antes = {};
          (filas || []).forEach(function (f) {
            var lg = f && f.logros;
            var cc = ajustados((lg && lg.c) || lg || {}, f.usuario);
            /* la fruta del mes pasado de cada uno, para ir junto a su nombre */
            var pa = mejorEn(cc, mesAnterior(t));
            if (pa >= 0) antes[String(f.usuario || '').toUpperCase()] = TRAMOS[pa].d;
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
          cb(null, out, antes);
        })
        .catch(function (e) { cb((e && e.message) || 'SIN CONEXIÓN', null); });
    }
  };

  window.PM.Rango = Rango;
})();
