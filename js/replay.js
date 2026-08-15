/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/replay.js
 * Repeticiones de partida. Define window.PM.Replay
 *
 * ¿Por qué se puede hacer esto? Porque el juego ya era determinista:
 * Game.seedRnd(nivel) hace que cada nivel salga siempre igual, que es
 * justo lo que sostiene los patrones memorizados del arcade. Si el
 * laberinto se comporta siempre igual, una partida entera cabe en tres
 * cosas: los ajustes con los que se jugó, el nivel de salida y la lista
 * de giros con el tick en el que se pidió cada uno. Nada de grabar
 * posiciones ni vídeo: unos cuantos cientos de bytes.
 *
 * El reloj de la repetición NO es Game.tick. Solo corre mientras la
 * partida avanza de verdad (PLAYING, la muerte y el cambio de nivel);
 * durante el "¡LISTO!" se para, porque la duración de ese rótulo la
 * marca la melodía de inicio y puede cambiar de una vez a otra. Como
 * ahí no se mueve nadie, congelar el reloj no cambia nada y a cambio
 * los ticks cuadran siempre.
 *
 * Formato de intercambio (versión 1), el mismo que valida el resto:
 *   { v, modo, semilla, nivel, jugadores, ajustes, nombres, fecha,
 *     entradas: [[tick, jugador, dir], ...], final }
 * serializar() lo deja en un texto compacto (base36 + deltas + RLE) que
 * cabe en una URL, y leer() lo deshace.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var G = window.PM.Game;

  /* ---------- utilidades del formato ---------- */
  var SEP = '~';                       // separador de campos (fuera del juego de caracteres de los nombres)
  /* 'hab' es el modo DESATADO a un jugador y 'habduo' el mismo con dos en el
   * mismo teclado (en party las repeticiones son las de red). Un texto con una
   * letra que una versión vieja del juego no conozca no cuela como partida
   * normal: MODOS_INV no la tiene, leer() devuelve null y sale el aviso de
   * repetición rota, que es justamente lo que tiene que pasar. */
  var MODOS = { solo: 's', duo: 'd', reto: 'r', hab: 'h', habduo: 'j',
                vs: 'v', habvs: 'k' };
  var MODOS_INV = { s: 'solo', d: 'duo', r: 'reto', h: 'hab', j: 'habduo',
                    v: 'vs', k: 'habvs' };

  /* ¿Ese modo es DESATADO, juegue quien juegue? */
  function esDesatado(modo) {
    return modo === 'hab' || modo === 'habduo' || modo === 'habvs';
  }

  /* ¿Y de los que llevan un fantasma humano (PAC-MAN VS.)? */
  function esVersus(modo) { return modo === 'vs' || modo === 'habvs'; }

  /* Reparto de fantasmas -> texto, un carácter por jugador: '-' si lleva
   * Pac-Man y la cifra del fantasma si lleva uno. 'g-1' es "el J1 con Pac-Man
   * y el J2 con BLINKY". Va dentro de los ajustes porque es lo que cambia la
   * simulación, igual que el reparto de vidas. */
  function codGhosts(lista) {
    var out = 'g';
    for (var i = 0; i < lista.length; i++) {
      var n = parseInt(lista[i], 10);
      out += (n >= 0 && n < 4) ? String(n) : '-';
    }
    return out;
  }

  function decGhosts(texto) {
    var out = [];
    for (var i = 1; i < texto.length; i++) {
      var c = texto.charAt(i);
      out.push((c === '-') ? -1 : parseInt(c, 10));
    }
    return out;
  }

  function b36(n) { return Math.round(n).toString(36); }
  function d36(s) { return parseInt(s, 36); }
  function esNum(n) { return typeof n === 'number' && isFinite(n); }
  function esLista(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
  }

  /* Los nombres viajan tal cual, así que se les pasa el mismo filtro que
   * usa el juego: solo A-Z, cifras y ' ._-'. De paso nadie puede colar un
   * separador dentro de un nombre y romper el texto. */
  function limpiaNombre(v) {
    return String(v == null ? '' : v).toUpperCase()
      .replace(/[^A-Z0-9 ._\-]/g, '').slice(0, CFG.NICK_MAX);
  }

  /* Entradas -> texto. Cada giro se guarda como la DIFERENCIA de ticks con
   * el anterior (casi siempre un número pequeño) en base 36, más una letra
   * G..V que empaqueta jugador y dirección en un solo carácter. Si el mismo
   * giro se repite con la misma separación, se resume con *veces (RLE). */
  /* Una entrada es [tick, jugador, qué]. En `qué`, 0..3 es un giro y 4..7 es
   * un poder del modo DESATADO (los cuatro, por su orden en CFG.HAB.LIST).
   *
   * Los giros se empaquetan en las letras G..V, que son las 16 parejas de
   * jugador y dirección. A los poderes les quedan las letras de los dos
   * extremos, y con eso hay de sobra: este formato solo graba partidas de UNO
   * O DOS en el mismo teclado (en party manda el formato de red), así que son
   * ocho combinaciones y no dieciséis.
   *
   *   A B C D   poderes del jugador 1   (65..68, por debajo de la G)
   *   W X Y Z   poderes del jugador 2   (87..90, por encima de la V)
   *
   * Ninguna de las dos tandas pisa el rango de los giros, así que un texto
   * grabado antes de que existiera el dúo se sigue leyendo igual. */
  function codHab(e) {
    var base = (e[1] === 1) ? 87 : 65;      // 'W' para el J2, 'A' para el J1
    return String.fromCharCode(base + ((e[2] - 4) & 3));
  }

  function esHab(e) { return e[2] >= 4; }

  function codEntradas(arr) {
    var out = '', prev = 0, i = 0;
    while (i < arr.length) {
      var e = arr[i];
      var delta = e[0] - prev;
      var code = esHab(e)
        ? codHab(e)
        : String.fromCharCode(71 + ((e[1] & 3) << 2) + (e[2] & 3));
      var n = 1;
      while (i + n < arr.length) {
        var f = arr[i + n];
        if (f[1] !== e[1] || f[2] !== e[2]) break;
        if (f[0] - arr[i + n - 1][0] !== delta) break;
        n++;
      }
      out += b36(delta) + code + (n > 1 ? '*' + b36(n) : '');
      prev = arr[i + n - 1][0];
      i += n;
    }
    return out;
  }

  /* Texto -> entradas. Devuelve null si sobra o falta algo: un enlace
   * manipulado no debe colarse como repetición buena. */
  function decEntradas(s) {
    var out = [];
    if (s === '') return out;
    var re = /([0-9a-z]+)([A-DG-Z])(?:\*([0-9a-z]+))?/g;
    var pos = 0, m, tick = 0;
    while ((m = re.exec(s)) !== null) {
      if (m.index !== pos) return null;          // basura entre medias
      pos = re.lastIndex;
      var delta = parseInt(m[1], 36);
      var letra = m[2];
      var veces = m[3] ? parseInt(m[3], 36) : 1;
      if (!isFinite(delta) || delta < 0) return null;
      if (!(veces >= 1) || veces > CFG.REPLAY_MAX_ENTRADAS) return null;
      if (out.length + veces > CFG.REPLAY_MAX_ENTRADAS) return null;
      /* A..D poder del J1 · W..Z poder del J2 · G..V giro (ver codHab) */
      var cod = letra.charCodeAt(0);
      var poderDe = (cod <= 68) ? 0 : ((cod >= 87) ? 1 : -1);
      var c = cod - (poderDe === 0 ? 65 : (poderDe === 1 ? 87 : 71));
      for (var i = 0; i < veces; i++) {
        tick += delta;
        if (poderDe >= 0) out.push([tick, poderDe, 4 + c]);
        else out.push([tick, (c >> 2) & 3, c & 3]);
      }
    }
    if (pos !== s.length) return null;
    return out;
  }

  /* ============================================================
   * FORMATO DE RED (v2) — repeticiones de partidas online
   *
   * Una repetición local son las TECLAS: el juego es determinista y con eso
   * se reconstruye la partida entera en unos cientos de bytes. Online eso no
   * vale: el anfitrión simula, los invitados le mandan POSICIONES, y repetir
   * las teclas de nadie reconstruye nada.
   *
   * Lo que sí hay online es un flujo que ya lo cuenta todo: las instantáneas
   * y los eventos que el anfitrión reparte doce veces por segundo. Se graban
   * tal cual, y al verlas el juego se pone de ESPECTADOR de un archivo en vez
   * de una sala. Reproducir es entonces el mismo camino que mirar la partida
   * de un amigo, que ya estaba hecho y probado.
   *
   * El peso es el único problema: en JSON son ~470 KB por minuto. Cada
   * instantánea se aplana a una lista de números en orden fijo (sin claves) y
   * se guarda la DIFERENCIA con la anterior en base 36, con los ceros
   * agrupados; casi todo lo que hay en una instantánea no cambia de una a la
   * siguiente. Eso lo deja en ~12 KB por minuto, y se graba 1 de cada
   * CFG.REPLAY_NET_EVERY (6 Hz): entre instantánea e instantánea, el
   * espectador ya avanza por estima, igual que en una partida de verdad.
   * ============================================================ */

  /* Los textos que viajan en una instantánea, como índices */
  var ESTADOS = ['MENU', 'READY', 'PLAYING', 'DYING', 'LEVEL_DONE', 'GAME_OVER'];
  var MODOS_G = ['house', 'leaving', 'normal', 'eyes', 'entering'];

  function idx(lista, v, porDefecto) {
    var i = lista.indexOf(v);
    return (i === -1) ? porDefecto : i;
  }

  /* Instantánea -> lista de números. El ORDEN ES EL CONTRATO: si algún día se
   * añade un campo, va AL FINAL y sube CFG.REPLAY_NET_V. n = jugadores. */
  function aplanaSnap(s, n) {
    var v = [
      idx(ESTADOS, s.st, 2), s.pz ? 1 : 0, s.ph | 0, s.dph | 0, s.lph | 0,
      s.dp | 0, s.rt | 0, s.lvl | 0, s.sc | 0, s.hs | 0,
      (s.gm === 'chase') ? 1 : 0, s.el | 0, s.ft | 0, s.ffl | 0, s.ch | 0,
      s.fz | 0, (s.hg == null ? -1 : s.hg | 0), s.ei | 0, s.dl | 0, s.de | 0,
      s.fa ? 1 : 0, s.tm | 0
    ];
    var i;
    // vidas: un fondo común o una tira por jugador (siempre n huecos)
    var lv = esLista(s.lv) ? s.lv : null;
    v.push(lv ? 1 : 0);
    for (i = 0; i < n; i++) v.push(lv ? (lv[i] | 0) : (s.lv | 0));
    // jugadores: posición (x10, como llegan redondeadas), rumbo y siguiente
    for (i = 0; i < n; i++) {
      var p = (s.ps && s.ps[i]) || { x: 0, y: 0, d: 0, nd: -1 };
      v.push(Math.round(p.x * 10), Math.round(p.y * 10), p.d | 0, p.nd | 0);
    }
    // fantasmas: siempre cuatro
    for (i = 0; i < 4; i++) {
      var g = (s.g && s.g[i]) || { x: 0, y: 0, d: 0, m: 'normal', f: 0, lp: 0 };
      v.push(Math.round(g.x * 10), Math.round(g.y * 10), g.d | 0,
             idx(MODOS_G, g.m, 2), g.f ? 1 : 0, g.lp | 0);
    }
    // fuera de juego, muerte en curso y marcador de cazador, por jugador
    for (i = 0; i < n; i++) v.push((s.out && s.out[i]) ? 1 : 0);
    for (i = 0; i < n; i++) {
      var pd = s.pd && s.pd[i];
      v.push(esLista(pd) ? (pd[0] | 0) : 0, esLista(pd) ? Math.round(pd[1]) : -1);
    }
    for (i = 0; i < n; i++) v.push((s.vs && s.vs[i]) | 0);
    return v;
  }

  /* Y la vuelta: lista de números -> instantánea como la espera applySnapshot */
  function montaSnap(v, n) {
    var k = 0, i;
    function num() { return v[k++] | 0; }
    var s = {
      st: ESTADOS[num()] || 'PLAYING', pz: num(), ph: num(), dph: num(),
      lph: num(), dp: num(), rt: num(), lvl: num(), sc: num(), hs: num(),
      gm: num() ? 'chase' : 'scatter', el: num(), ft: num(), ffl: num(),
      ch: num(), fz: num(), hg: num(), ei: num(), dl: num(), de: num(),
      fa: num(), tm: num()
    };
    var porJugador = num();
    var vidas = [];
    for (i = 0; i < n; i++) vidas.push(num());
    s.lv = porJugador ? vidas : vidas[0];
    s.ps = [];
    for (i = 0; i < n; i++) {
      s.ps.push({ x: num() / 10, y: num() / 10, d: num(), nd: num() });
    }
    s.p0 = s.ps[0];
    s.g = [];
    for (i = 0; i < 4; i++) {
      s.g.push({ x: num() / 10, y: num() / 10, d: num(),
                 m: MODOS_G[num()] || 'normal', f: num(), lp: num() });
    }
    s.out = [];
    for (i = 0; i < n; i++) s.out.push(num());
    s.pd = [];
    for (i = 0; i < n; i++) {
      var fase = num(), ticks = num();
      s.pd.push(ticks < 0 ? 0 : [fase, ticks]);
    }
    s.vs = [];
    for (i = 0; i < n; i++) s.vs.push(num());
    return s;
  }

  /* Números con signo en base 36 */
  function n36(n) {
    return (n < 0 ? '-' : '') + Math.abs(n).toString(36);
  }
  function d36s(t) {
    var neg = t.charAt(0) === '-';
    var n = parseInt(neg ? t.slice(1) : t, 36);
    return isFinite(n) ? (neg ? -n : n) : 0;
  }

  /* Una lista de números como diferencia con la anterior. Los ceros seguidos
   * (que son la mayoría: casi nada cambia de una instantánea a la siguiente)
   * se resumen en '*' o '*<n>'.
   *
   * La marca de los ceros NO puede ser una letra: en base 36 un número puede
   * empezar por cualquiera de ellas —'z' es 35 y 'z0' es 1260—, así que una
   * marca de letra se confunde con un valor. Por eso '*', que es lo que ya
   * usa el formato de las repeticiones locales para lo mismo. */
  function codVector(v, previa) {
    var trozos = [], ceros = 0;
    for (var i = 0; i < v.length; i++) {
      var d = previa ? (v[i] - previa[i]) : v[i];
      if (d === 0) { ceros++; continue; }
      if (ceros) { trozos.push(ceros > 1 ? ('*' + n36(ceros)) : '*'); ceros = 0; }
      trozos.push(n36(d));
    }
    if (ceros) trozos.push(ceros > 1 ? ('*' + n36(ceros)) : '*');
    return trozos.join(',');
  }

  function decVector(texto, previa, largo) {
    var v = [], partes = texto ? texto.split(',') : [];
    for (var i = 0; i < partes.length; i++) {
      var p = partes[i];
      if (p.charAt(0) === '*') {
        var veces = (p.length > 1) ? d36s(p.slice(1)) : 1;
        if (!(veces >= 1) || v.length + veces > largo) return null;
        for (var j = 0; j < veces; j++) v.push(previa ? previa[v.length] : 0);
      } else {
        if (v.length >= largo) return null;
        v.push((previa ? previa[v.length] : 0) + d36s(p));
      }
    }
    return (v.length === largo) ? v : null;
  }

  var Replay = {
    V: 1,
    V_RED: 2,

    /* Las tripas del formato de red, para poder probarlas sueltas: es la
     * pieza con más riesgo (un campo mal puesto se ve como una repetición
     * torcida, no como un error), así que las pruebas la atacan directamente
     * con instantánea -> texto -> instantánea. */
    _codec: {
      aplana: aplanaSnap, monta: montaSnap,
      cod: codVector, dec: decVector,
      largo: function (n) { return aplanaSnap({ ps: [], g: [] }, n).length; }
    },

    /* estado interno */
    modo: null,          // null | 'grabar' | 'ver'
    grabando: null,      // repetición en construcción
    rep: null,           // repetición que se está viendo
    t: 0,                // reloj de la repetición (ticks simulados)
    cursor: 0,           // siguiente entrada por inyectar
    enviando: false,     // el giro lo manda la repetición, no el teclado
    barra: null,

    /* =========================================================
     * FORMATO
     * ========================================================= */
    valida: function (rep) {
      if (!rep || typeof rep !== 'object') return false;
      if (rep.v !== this.V) return false;
      if (!MODOS[rep.modo]) return false;
      if (!(rep.semilla === null || esNum(rep.semilla))) return false;
      if (!esNum(rep.nivel) || rep.nivel < 1 || rep.nivel > 999) return false;
      if (!esNum(rep.jugadores) ||
          rep.jugadores < 1 || rep.jugadores > CFG.MAX_PLAYERS) return false;
      var a = rep.ajustes;
      if (!a || !esNum(a.velFantasmas) || !esNum(a.velPac) ||
          !esNum(a.powerS) || !esNum(a.vidas)) return false;
      /* Reparto de fantasmas: obligatorio en los modos de PAC-MAN VS. (sin él
       * la repetición no se puede montar) y prohibido en los demás, que no
       * tienen fantasmas humanos que repartir. */
      if (esVersus(rep.modo)) {
        if (!esLista(a.ghosts) || a.ghosts.length !== rep.jugadores) return false;
        var hayPac = false, hayFantasma = false;
        for (var gi = 0; gi < a.ghosts.length; gi++) {
          var gv = a.ghosts[gi];
          if (!esNum(gv) || gv < -1 || gv > 3) return false;
          if (gv < 0) hayPac = true; else hayFantasma = true;
        }
        // sin Pac-Man no hay partida, y sin fantasma humano no es de VS.
        if (!hayPac || !hayFantasma) return false;
      } else if (a.ghosts) return false;
      if (!esLista(rep.nombres) || !rep.nombres.length) return false;
      if (typeof rep.fecha !== 'string' || !rep.fecha) return false;
      if (!esLista(rep.entradas)) return false;
      if (rep.entradas.length > CFG.REPLAY_MAX_ENTRADAS) return false;
      var t = -1;
      for (var i = 0; i < rep.entradas.length; i++) {
        var e = rep.entradas[i];
        if (!esLista(e) || e.length !== 3) return false;
        if (!esNum(e[0]) || e[0] < 0 || e[0] < t) return false;   // ordenadas por tick
        t = e[0];
        if (!esNum(e[1]) || e[1] < 0 || e[1] >= CFG.MAX_PLAYERS) return false;
        /* 0..3 giro · 4..7 poder. Los poderes solo existen en DESATADO, y solo
         * de los dos primeros jugadores: es lo único que sabe grabar este
         * formato (de tres en adelante la partida es de red y se graba de
         * otra manera). */
        if (!esNum(e[2]) || e[2] < 0 || e[2] > 7) return false;
        if (e[2] > 3 && (!esDesatado(rep.modo) || e[1] > 1)) return false;
        if (e[2] > 3 && rep.modo === 'hab' && e[1] !== 0) return false;
      }
      var f = rep.final;
      if (!f || !esNum(f.puntos) || !esNum(f.nivel) ||
          !esNum(f.fantasmas) || !esNum(f.tiempoMs)) return false;
      return true;
    },

    /* Repetición -> texto compacto. Devuelve '' si la repetición no vale. */
    serializar: function (rep) {
      if (!this.valida(rep)) return '';
      var a = rep.ajustes, f = rep.final, i;
      /* los multiplicadores van a centésimas enteras: 1.05 -> 105 -> '2x' */
      var aj = [b36(a.velFantasmas * 100), b36(a.velPac * 100),
                b36(a.powerS * 100), b36(a.vidas)];
      if (a.vidasModo === 'individual') aj.push('i');
      if (esLista(a.ghosts)) aj.push(codGhosts(a.ghosts));
      var nombres = [];
      for (i = 0; i < rep.nombres.length; i++) {
        nombres.push(limpiaNombre(rep.nombres[i]));
      }
      return [
        'R' + rep.v,
        MODOS[rep.modo],
        (rep.semilla === null || rep.semilla === undefined) ? '' : b36(rep.semilla),
        b36(rep.nivel),
        b36(rep.jugadores),
        aj.join(','),
        nombres.join(','),
        b36(Date.parse(rep.fecha) || 0),
        codEntradas(rep.entradas),
        [b36(f.puntos), b36(f.nivel), b36(f.fantasmas), b36(f.tiempoMs)].join(',')
      ].join(SEP);
    },

    /* Texto -> repetición, o null si viene rota. Nunca lanza: el texto
     * puede llegar de una URL que ha pasado por WhatsApp. */
    leer: function (texto) {
      try {
        if (typeof texto !== 'string') return null;
        var t = texto.replace(/^\s+|\s+$/g, '');
        if (!t) return null;
        var p = t.split(SEP);
        if (p.length !== 10) return null;
        var mv = /^R(\d+)$/.exec(p[0]);
        if (!mv || parseInt(mv[1], 10) !== this.V) return null;
        var modo = MODOS_INV[p[1]];
        if (!modo) return null;

        var semilla = (p[2] === '') ? null : d36(p[2]);
        var aj = p[5].split(',');
        if (aj.length < 4) return null;
        var ajustes = {
          velFantasmas: d36(aj[0]) / 100,
          velPac: d36(aj[1]) / 100,
          powerS: d36(aj[2]) / 100,
          vidas: d36(aj[3])
        };
        /* Lo que va detrás de los cuatro fijos son banderas, y se leen por lo
         * que son y no por su posición: así se puede añadir otra sin que la de
         * al lado se descoloque. */
        for (var b = 4; b < aj.length; b++) {
          if (aj[b] === 'i') ajustes.vidasModo = 'individual';
          else if (aj[b].charAt(0) === 'g') ajustes.ghosts = decGhosts(aj[b]);
        }

        var crudos = p[6].split(','), nombres = [];
        for (var i = 0; i < crudos.length; i++) nombres.push(limpiaNombre(crudos[i]));

        var ms = d36(p[7]);
        if (!isFinite(ms) || ms < 0) return null;
        var entradas = decEntradas(p[8]);
        if (!entradas) return null;
        var fin = p[9].split(',');
        if (fin.length !== 4) return null;

        var rep = {
          v: this.V,
          modo: modo,
          semilla: semilla,
          nivel: d36(p[3]),
          jugadores: d36(p[4]),
          ajustes: ajustes,
          nombres: nombres,
          fecha: new Date(ms).toISOString(),
          entradas: entradas,
          final: {
            puntos: d36(fin[0]), nivel: d36(fin[1]),
            fantasmas: d36(fin[2]), tiempoMs: d36(fin[3])
          }
        };
        return this.valida(rep) ? rep : null;
      } catch (e) {
        return null;
      }
    },

    /* Dirección del juego, sin lo que llevara pegado detrás */
    baseUrl: function () {
      try {
        return window.location.href.split('?')[0].split('#')[0];
      } catch (e) { return 'index.html'; }   // sin location (pruebas)
    },

    /* Enlace para compartir: el juego se abre directo en la repetición */
    enlace: function (repOTexto) {
      var texto = (typeof repOTexto === 'string')
        ? repOTexto : this.serializar(repOTexto);
      if (!texto) return '';
      return this.baseUrl() + '?rep=' + encodeURIComponent(texto);
    },

    /* =========================================================
     * COMPARTIR UNA PARTIDA ONLINE POR ENLACE
     *
     * La local cabe entera en la URL. La de red no —son ~12 KB por minuto de
     * partida— y comprimirla mejor no arregla nada: a los tres minutos ya no
     * pasa por un chat. Así que el enlace lleva un CÓDIGO y la repetición se
     * sube a la tabla `repeticiones` (supabase/repeticiones.sql).
     *
     * Cambia dónde vive el contenido, no lo que ve quien abre el enlace: llega,
     * se descarga y se reproduce por el mismo camino de siempre (espectador de
     * un archivo en vez de espectador de una sala).
     * ========================================================= */
    cfgNet: function () { return window.PM.NET_CFG || {}; },

    compartirConfigurado: function () {
      var c = this.cfgNet();
      return !!(c.SUPABASE_URL && c.SUPABASE_KEY && window.fetch);
    },

    /* Código de 8 caracteres. Con azar de verdad si lo hay: dos partidas
     * subidas en el mismo segundo no pueden salir con el mismo código. */
    codigoNuevo: function () {
      var S = CFG.REPLAY_SHARE;
      var n = S.ID_LEN, out = '', i;
      var c = (typeof window !== 'undefined') ? window.crypto : null;
      if (c && c.getRandomValues) {
        var bytes = new Uint8Array(n);
        c.getRandomValues(bytes);
        for (i = 0; i < n; i++) out += S.ALPHABET.charAt(bytes[i] % S.ALPHABET.length);
        return out;
      }
      for (i = 0; i < n; i++) {
        out += S.ALPHABET.charAt(Math.floor(Math.random() * S.ALPHABET.length));
      }
      return out;
    },

    restUrl: function (path) {
      return String(this.cfgNet().SUPABASE_URL || '').replace(/\/+$/, '') + path;
    },

    restHeaders: function () {
      var k = this.cfgNet().SUPABASE_KEY;
      return {
        'apikey': k,
        'Authorization': 'Bearer ' + k,
        'Content-Type': 'application/json'
      };
    },

    /* Sube una repetición de red guardada y devuelve su enlace. cb(err, url).
     *
     * El código se guarda en la ficha local: volver a darle a COMPARTIR la
     * misma partida devuelve EL MISMO enlace en vez de subirla otra vez. Sin
     * esto, compartir dos veces dejaría dos copias en el servidor y dos
     * enlaces distintos rodando por el chat de la misma partida. */
    compartirRed: function (id, cb) {
      var self = this;
      var reg = this.porIdRed(id);
      if (!reg || !reg.s) { cb('ESA REPETICIÓN YA NO ESTÁ', null); return; }
      if (reg.rn) { cb(null, this.enlaceRed(reg.rn)); return; }
      if (!this.compartirConfigurado()) { cb('COMPARTIR NECESITA CONEXIÓN', null); return; }
      if (reg.s.length > CFG.REPLAY_SHARE.MAX_CHARS) {
        cb('ESA PARTIDA ES DEMASIADO LARGA PARA COMPARTIRLA', null);
        return;
      }
      var rep = this.leerRed(reg.s);
      if (!rep) { cb('ESA REPETICIÓN ESTÁ ROTA', null); return; }
      var fila = {
        jugadores: rep.jugadores,
        puntos: (rep.final && rep.final.puntos) || 0,
        nivel: (rep.final && rep.final.nivel) || 1,
        nombres: rep.nombres.join(' + ').slice(0, 64),
        datos: reg.s
      };
      var h = this.restHeaders();
      h['Prefer'] = 'return=minimal';

      /* Si el código sorteado ya existe (que con 32^8 no va a pasar, pero el
       * día que pase sería un enlace que enseña la partida de otro), se
       * sortea otro. Cuatro intentos y a otra cosa. */
      function intenta(quedan) {
        var codigo = self.codigoNuevo();
        fila.id = codigo;
        fetch(self.restUrl('/rest/v1/' + CFG.REPLAY_SHARE.TABLE), {
          method: 'POST', headers: h, body: JSON.stringify(fila)
        }).then(function (res) {
          if (res.ok) {
            self.apuntarCodigo(id, codigo);
            cb(null, self.enlaceRed(codigo));
            return;
          }
          return res.text().then(function (t) {
            if (/duplicate|unique/i.test(t) && quedan > 1) { intenta(quedan - 1); return; }
            if (/demasiadas repeticiones/i.test(t)) {
              cb('DEMASIADAS SUBIDAS SEGUIDAS: ESPERA UN MINUTO', null);
              return;
            }
            cb(/relation|does not exist|schema cache/i.test(t)
              ? 'EL SERVIDOR TODAVÍA NO ADMITE ENLACES DE REPETICIÓN'
              : 'NO SE PUDO SUBIR LA REPETICIÓN', null);
          });
        }).catch(function () { cb('NO SE PUDO SUBIR LA REPETICIÓN', null); });
      }
      intenta(CFG.REPLAY_SHARE.INTENTOS);
    },

    enlaceRed: function (codigo) {
      return this.baseUrl() + '?' + CFG.REPLAY_SHARE.PARAM + '=' + codigo;
    },

    /* Deja apuntado en la ficha local que esa partida ya está subida */
    apuntarCodigo: function (id, codigo) {
      var lista = this.guardadasRed();
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id !== id) continue;
        lista[i].rn = codigo;
        try {
          localStorage.setItem(CFG.REPLAY_NET_KEY, JSON.stringify(lista));
        } catch (e) { /* si no cabe, se volverá a subir: no es grave */ }
        return;
      }
    },

    /* Abrir un enlace ?rn=<codigo>: se descarga y se ve. Es asíncrono, así que
     * devuelve true en cuanto se pone a ello (quien llama tiene que dejar de
     * hacer otras cosas con la URL) y avisa por pantalla si sale mal. */
    verCompartida: function (codigo) {
      var self = this;
      var UI = window.PM.UI;
      var c = String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!c || !this.compartirConfigurado()) { this.avisoRoto(); return false; }
      if (UI && UI.showPrompt) {
        UI.showPrompt({
          title: 'REPETICIÓN COMPARTIDA',
          color: '#7ec8ff',
          lines: ['DESCARGANDO LA PARTIDA...'],
          buttons: []
        });
      }
      fetch(this.restUrl('/rest/v1/' + CFG.REPLAY_SHARE.TABLE +
              '?id=eq.' + encodeURIComponent(c) + '&select=datos&limit=1'),
            { headers: this.restHeaders() })
        .then(function (res) {
          if (!res.ok) throw new Error('no');
          return res.json();
        })
        .then(function (filas) {
          var texto = (filas && filas.length) ? filas[0].datos : '';
          var rep = texto ? self.leerRed(texto) : null;
          if (!rep) { self.avisoRoto(); return; }
          if (UI && UI.hidePrompt) UI.hidePrompt();
          self.verRed(rep);
        })
        .catch(function () { self.avisoRoto(); });
      return true;
    },

    /* =========================================================
     * GRABACIÓN — game.js llama a estas cuatro y a nada más
     * ========================================================= */
    /* Partida nueva. Si estábamos viendo una repetición, esto es un
     * "otra vez desde el principio" (REINICIAR y la revancha pasan por
     * aquí), así que solo hay que poner el reloj a cero. */
    alEmpezar: function (opts) {
      this.t = 0;
      this.cursor = 0;
      this.cursorEv = 0;
      G.timeScale = 1;

      // sin repetición cargada no hay nada que ver: es una partida normal
      if ((this.modo === 'ver' || this.modo === 'verRed') && !this.rep) {
        this.modo = null;
      }

      /* Repetición de una partida ONLINE: el juego se pone de espectador y
       * los cuadros se los da inyectarRed(). Cuenta lo mismo que ver una
       * local: nada (ni experiencia, ni logros, ni récord). */
      if (this.modo === 'verRed') {
        G.replaying = true;
        G.xpSent = true;
        G.rankingSent = true;
        G.timeSent = true;
        this.redFin = false;
        G.closeShowcase();
        this.mostrarBarra(true);
        return;
      }

      if (this.modo === 'ver') {
        G.replaying = true;
        /* ver una partida vieja no da experiencia, ni logros, ni récord,
         * ni entra en el historial ni en el top mundial: se marca como ya
         * enviado todo lo que se envía una vez por partida */
        G.xpSent = true;
        G.rankingSent = true;
        G.timeSent = true;
        G.closeShowcase();     // no es una partida en vivo: nadie viene a mirarla
        this.mostrarBarra(true);
        return;
      }

      G.replaying = false;
      this.mostrarBarra(false);
      this.grabando = null;
      this.modo = null;
      /* Online se graba de otra manera: no las teclas (que allí no
       * reconstruyen nada, porque la partida la simula el anfitrión con lo
       * que le llega por la red), sino lo que el anfitrión ya emite. */
      this.redEmpezar();
      if (!G || G.netRole || G.isSpec()) return;
      if (!(G.playerCount === 1 || G.playerCount === 2)) return;

      var s = (opts && opts.cfg) || G.settings();
      var nombres = [];
      for (var i = 0; i < G.playerCount; i++) nombres.push(G.rawName(i));
      var ajustes = {
        velFantasmas: G.ghostSpeedMult,
        velPac: G.pacSpeedMult,
        powerS: G.frightMult,
        vidas: s.startLives
      };
      // el reparto de vidas cambia la simulación en dúo, así que viaja
      // con los ajustes cuando no es el de siempre
      if (G.livesMode === 'individual') ajustes.vidasModo = 'individual';
      /* PAC-MAN VS.: quién lleva qué fantasma. Es lo que más cambia la
       * simulación de todo lo que hay aquí —uno de los cuatro deja de pensar
       * por su cuenta— así que sin esto la repetición no se puede montar. */
      var vs = !!(G.isVersus && G.isVersus());
      if (vs) ajustes.ghosts = G.vsGhosts.slice();

      this.modo = 'grabar';
      this.grabando = {
        v: this.V,
        /* Cada combinación tiene su propio modo, y no es solo una etiqueta:
         * en 'habduo' hay poderes de dos jugadores en las entradas, y en los
         * de VS. hay giros de alguien que no lleva Pac-Man. Una versión vieja
         * del juego no conoce estas letras y da la repetición por rota, que es
         * exactamente lo que tiene que pasar. */
        modo: G.hab ? (vs ? 'habvs' : ((G.playerCount === 2) ? 'habduo' : 'hab'))
                    : (vs ? 'vs' : ((G.playerCount === 2) ? 'duo' : 'solo')),
        semilla: null,              // la deriva el propio juego del nivel
        nivel: G.level,
        jugadores: G.playerCount,
        ajustes: ajustes,
        nombres: nombres,
        fecha: new Date().toISOString(),
        entradas: [],
        final: null
      };
    },

    /* Rumbo que ese jugador YA tenía pedido: el de su Pac-Man, o el de su
     * fantasma si lleva uno (PAC-MAN VS.). null cuando no tiene ficha, y
     * entonces no hay nada que apuntar. */
    rumboDe: function (idx) {
      var gid = G.vsGhostOf ? G.vsGhostOf(idx) : -1;
      if (gid >= 0) {
        var gh = G.ghosts && G.ghosts[gid];
        return gh ? gh.wishDir : null;
      }
      var p = G.pacs[idx];
      return p ? p.nextDir : null;
    },

    /* Cada giro pasa por aquí (Game.setPacDir). Devuelve false cuando el
     * giro NO debe aplicarse: mientras se ve una repetición manda ella y el
     * teclado no pinta nada. */
    entrada: function (idx, d) {
      if (this.modo === 'ver') return !!this.enviando;
      if (!this.grabando) return true;
      if (!(idx >= 0 && idx < CFG.MAX_PLAYERS) || !(d >= 0 && d <= 3)) return true;
      /* Pedir el rumbo que ya estaba pedido no cambia nada (ni setDesiredDir
       * ni el wishDir del fantasma hacen otra cosa que apuntar el deseo), así
       * que no se guarda. Esto es lo que hace que tener una tecla pulsada —el
       * teclado repite el evento cada pocas centésimas— deje UNA entrada y no
       * doscientas. */
      var actual = this.rumboDe(idx);
      if (actual === null || actual === d) return true;
      this.grabando.entradas.push([this.t, idx, d]);
      // una partida normal no llega ni de lejos; si alguien lo revienta, se
      // deja de grabar y a jugar tranquilo
      if (this.grabando.entradas.length > CFG.REPLAY_MAX_ENTRADAS) {
        this.grabando = null;
      }
      return true;
    },

    /* ---------- habilidades (modo DESATADO, js/habilidades.js) ----------
     * Van en las mismas `entradas` que los giros, con el "qué" de 4 a 7. La
     * pareja es como la de los giros pero al revés: primero se pregunta si
     * la tecla vale (viendo una repetición manda ella), y se apunta después,
     * porque una habilidad puede no llegar a salir. */
    habBloqueada: function () {
      return this.modo === 'ver' && !this.enviando;
    },

    /* Una habilidad que SÍ salió. No hay nada que descartar por repetido:
     * es un suceso, no una intención que se pueda pedir dos veces (de eso ya
     * se encarga la recarga). */
    apuntaHab: function (idx, k) {
      if (!this.grabando) return;
      // los dos primeros: es lo que sabe codificar codHab (A..D y W..Z)
      if (!(idx === 0 || idx === 1) || !(k >= 0 && k < 4)) return;
      this.grabando.entradas.push([this.t, idx, 4 + k]);
      if (this.grabando.entradas.length > CFG.REPLAY_MAX_ENTRADAS) {
        this.grabando = null;
      }
    },

    /* Un paso del juego (Game.step). Mete los giros que tocan y adelanta el
     * reloj de la repetición. */
    paso: function () {
      if (!this.modo && !this.red) return;
      if ((this.modo === 'ver' || this.modo === 'verRed') &&
          G.state === 'MENU') {                          // se ha salido
        this.salir(true);
        return;
      }
      if (G.paused || G.netNotice) return;               // el tiempo no corre
      /* Las de red llevan reloj de PARED: se graban y se ven instantáneas que
       * el anfitrión emite todo el rato, también durante el "¡LISTO!". Las
       * locales solo cuentan mientras la partida avanza de verdad, porque el
       * rótulo de inicio dura lo que dure la melodía y puede cambiar. */
      if (this.modo === 'verRed') { this.t++; this.inyectarRed(); return; }
      if (this.red) { this.t++; return; }
      if (this.modo === 'ver') this.inyectar();
      var s = G.state;
      if (s === 'PLAYING' || s === 'DYING' || s === 'LEVEL_DONE') this.t++;
    },

    inyectar: function () {
      var ent = this.rep && this.rep.entradas;
      if (!ent) return;
      this.enviando = true;
      while (this.cursor < ent.length && ent[this.cursor][0] <= this.t) {
        var e = ent[this.cursor++];
        if (e[2] >= 4) {
          // habilidad: se relanza igual que la lanzó el jugador aquel día
          if (window.PM.Hab) window.PM.Hab.pulsar(G, e[1], e[2] - 4);
        } else {
          G.setPacDir(e[1], e[2]);
        }
      }
      this.enviando = false;
    },

    /* Fin de la partida (Game.closeRun): se cierra la repetición y se
     * guarda. Pasa igual si se acaba en GAME OVER, si te rindes, si
     * reinicias o si te sales al menú a medias. */
    alAcabar: function () {
      var deRed = this.redAcabar();      // partidas online, si las había
      var rep = this.grabando;
      this.grabando = null;
      this.modo = null;
      if (!rep) return deRed;
      rep.final = {
        puntos: G.score,
        nivel: G.level,
        fantasmas: G.runGhosts,
        tiempoMs: Math.round(G.timeTicks * 1000 / 60)
      };
      if (!(rep.final.puntos > 0)) return null;   // una partida de cero no interesa
      return this.guardar(rep);
    },

    /* La repetición que se está grabando ahora mismo (o null) */
    enCurso: function () { return this.grabando; },

    /* =========================================================
     * PARTIDAS ONLINE — grabar lo que emite el anfitrión
     * game.js llama a redCuadro() y redEvento(); lo demás vive aquí.
     * ========================================================= */
    /* ¿Esta partida se está grabando como repetición de red? */
    grabandoRed: function () { return !!this.red; },

    redEmpezar: function () {
      this.red = null;
      this.redPend = [];
      this.redSalto = 0;
      this.redNivelPm = -1;
      /* Solo el anfitrión: es el único que tiene la partida entera. El
       * invitado ve lo que le llega, y un mirón ni eso. */
      if (!G || G.netRole !== 'host') return;
      var s = G.settings();
      var nombres = [], colores = [], skins = [], i;
      for (i = 0; i < G.playerCount; i++) {
        nombres.push(G.rawName(i));
        colores.push(G.colorFor(i));
        skins.push(G.skinFor(i));
      }
      var ajustes = {
        velFantasmas: G.ghostSpeedMult,
        velPac: G.pacSpeedMult,
        powerS: G.frightMult,
        vidas: s.startLives
      };
      if (G.livesMode === 'individual') ajustes.vidasModo = 'individual';
      this.red = {
        v: this.V_RED,
        jugadores: G.playerCount,
        nivel: G.level,
        maze: G.mazeId || null,
        ajustes: ajustes,
        nombres: nombres,
        colores: colores,
        skins: skins,
        ghosts: G.vsGhosts ? G.vsGhosts.slice() : null,
        hab: !!G.hab,          // modo DESATADO: dientes, chispas y flash
        fecha: new Date().toISOString(),
        pm: null,              // mapa de pastillas del arranque
        cuadros: [],           // [tick, vector]
        eventos: [],           // [tick, evento]
        final: null
      };
    },

    /* Cada instantánea del anfitrión pasa por aquí. Se guarda 1 de cada
     * CFG.REPLAY_NET_EVERY, pero las pastillas comidas de las que se saltan
     * NO se pierden: se acumulan y viajan con la siguiente que sí se guarda.
     * Si no, al verla quedarían puntos en el laberinto que ya nadie se come. */
    redCuadro: function (s) {
      if (!this.red || !s) return;
      var i;
      if (esLista(s.he)) {
        for (i = 0; i < s.he.length; i++) this.redPend.push(s.he[i]);
      }
      // el mapa completo de pastillas, una vez por nivel: con eso y las
      // comidas de cada cuadro, el laberinto de la repetición cuadra siempre
      if (s.pm && this.redNivelPm !== s.lvl) {
        this.redNivelPm = s.lvl;
        if (!this.red.pm) this.red.pm = { lvl: s.lvl, hex: s.pm };
        else this.red.eventos.push([this.t, { t: 'pm', lvl: s.lvl, hex: s.pm }]);
      }
      if (++this.redSalto < CFG.REPLAY_NET_EVERY) return;
      this.redSalto = 0;
      var copia = aplanaSnap(s, this.red.jugadores);
      this.red.cuadros.push([this.t, copia, this.redPend]);
      this.redPend = [];
      // una partida normal no llega; si alguien la deja corriendo un día
      // entero, se deja de grabar antes que reventar el almacenamiento
      if (this.red.cuadros.length > 60000) this.red = null;
    },

    /* Los eventos del anfitrión (muertes, frutas, subir de nivel, emotes...) */
    redEvento: function (o) {
      if (!this.red || !o) return;
      this.red.eventos.push([this.t, o]);
      if (this.red.eventos.length > 20000) this.red = null;
    },

    /* Fin de la partida: se cierra y se guarda en su propio almacén */
    redAcabar: function () {
      var rep = this.red;
      this.red = null;
      if (!rep || !rep.cuadros.length) return null;
      rep.final = {
        puntos: G.score,
        nivel: G.level,
        tiempoMs: Math.round(G.timeTicks * 1000 / 60)
      };
      if (!(rep.final.puntos > 0)) return null;
      return this.guardarRed(rep);
    },

    /* ---------- formato de texto ---------- */
    serializarRed: function (rep) {
      if (!rep || !rep.cuadros || !rep.cuadros.length) return null;
      var cab = {
        v: this.V_RED, j: rep.jugadores, nv: rep.nivel, mz: rep.maze || null,
        aj: rep.ajustes, nm: rep.nombres, co: rep.colores, sk: rep.skins,
        gh: rep.ghosts || null, hb: !!rep.hab, fe: rep.fecha, pm: rep.pm || null,
        fin: rep.final
      };
      var previa = null, filas = [];
      for (var i = 0; i < rep.cuadros.length; i++) {
        var c = rep.cuadros[i];
        var comidas = c[2] && c[2].length ? c[2].map(b36).join('.') : '';
        filas.push(c[0] + '|' + codVector(c[1], previa) + '|' + comidas);
        previa = c[1];
      }
      var evs = [];
      for (i = 0; i < rep.eventos.length; i++) {
        evs.push(rep.eventos[i][0] + '|' + JSON.stringify(rep.eventos[i][1]));
      }
      return JSON.stringify(cab) + '\n' + filas.join(';') + '\n' + evs.join(';');
    },

    leerRed: function (texto) {
      try {
        var partes = String(texto || '').split('\n');
        if (partes.length < 3) return null;
        var cab = JSON.parse(partes[0]);
        if (!cab || cab.v !== this.V_RED) return null;
        var n = parseInt(cab.j, 10);
        if (!(n >= 1 && n <= CFG.MAX_PLAYERS)) return null;
        var largo = aplanaSnap({ ps: [], g: [] }, n).length;
        var cuadros = [], previa = null;
        var filas = partes[1] ? partes[1].split(';') : [];
        for (var i = 0; i < filas.length; i++) {
          var trozos = filas[i].split('|');
          var v = decVector(trozos[1], previa, largo);
          if (!v) return null;
          var comidas = trozos[2] ? trozos[2].split('.').map(d36) : [];
          cuadros.push([parseInt(trozos[0], 10) || 0, v, comidas]);
          previa = v;
        }
        if (!cuadros.length) return null;
        /* Laberinto que ya no existe (o uno rehecho): la repetición ya no
         * cuadra con el trazado y se vería a Pac-Man atravesando muros.
         * Mejor darla por rota, que es lo que es. */
        var M = window.PM.Mazes;
        if (cab.mz && M && !M.conocido(cab.mz)) return null;
        var eventos = [];
        var evs = partes[2] ? partes[2].split(';') : [];
        for (i = 0; i < evs.length; i++) {
          if (!evs[i]) continue;
          var corte = evs[i].indexOf('|');
          if (corte < 0) continue;
          eventos.push([parseInt(evs[i].slice(0, corte), 10) || 0,
                        JSON.parse(evs[i].slice(corte + 1))]);
        }
        return {
          v: cab.v, jugadores: n, nivel: cab.nv || 1, maze: cab.mz || null,
          ajustes: cab.aj || {}, nombres: cab.nm || [], colores: cab.co || [],
          skins: cab.sk || [], ghosts: cab.gh || null, hab: !!cab.hb,
          fecha: cab.fe || '',
          pm: cab.pm || null, cuadros: cuadros, eventos: eventos,
          final: cab.fin || null
        };
      } catch (e) { return null; }
    },

    /* ---------- almacén propio ----------
     * Aparte de las locales: pesan mucho más (kilobytes por minuto, no por
     * partida) y no caben en un enlace, así que ni compiten por el hueco ni
     * se podan con las mismas reglas. */
    guardadasRed: function () {
      try {
        var raw = localStorage.getItem(CFG.REPLAY_NET_KEY);
        var arr = raw ? JSON.parse(raw) : [];
        return esLista(arr) ? arr : [];
      } catch (e) { return []; }
    },

    guardarRed: function (rep) {
      var texto = this.serializarRed(rep);
      if (!texto || texto.length > CFG.REPLAY_NET_MAX_CHARS) return null;
      var lista = this.guardadasRed();
      var ahora = Date.now();
      /* La ficha lleva TUS puntos, no los del equipo: es con lo que la busca
       * el historial (js/history.js guarda myPoints), y en PAC-MAN VS. el
       * cazador tiene los suyos. La repetición sí guarda el marcador entero. */
      var mios = G.myPoints ? G.myPoints() : rep.final.puntos;
      var reg = {
        id: 'r' + ahora + '-' + b36(mios),
        t: ahora, j: rep.jugadores, p: mios,
        lv: rep.final.nivel, red: 1, s: texto
      };
      lista.unshift(reg);
      var total = function (l) {
        var n = 0;
        for (var i = 0; i < l.length; i++) n += (l[i].s || '').length;
        return n;
      };
      while (lista.length > 1 &&
             (lista.length > CFG.REPLAY_NET_MAX ||
              total(lista) > CFG.REPLAY_NET_TOTAL_CHARS)) {
        lista.pop();
      }
      for (var intento = 0; intento < 4; intento++) {
        try {
          localStorage.setItem(CFG.REPLAY_NET_KEY, JSON.stringify(lista));
          return reg;
        } catch (e) {
          if (lista.length <= 1) return null;
          lista.pop();
        }
      }
      return null;
    },

    porIdRed: function (id) {
      var lista = this.guardadasRed();
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id) return lista[i];
      }
      return null;
    },

    /* ¿Esta fila del historial es una partida online con repetición? Se
     * cruzan igual que las locales: por puntuación, jugadores y hora. */
    paraPartidaRed: function (h) {
      if (!h) return null;
      var lista = this.guardadasRed();
      for (var i = 0; i < lista.length; i++) {
        var r = lista[i];
        if (r.p === h.p && r.j === h.j && Math.abs(r.t - h.t) < 15000) return r;
      }
      return null;
    },

    /* ---------- reproducción ----------
     * Ver una repetición de red es ser ESPECTADOR de un archivo: el juego se
     * pone en modo mirón (que ya sabe avanzar por estima entre instantánea e
     * instantánea) y aquí se le van dando los cuadros y los eventos grabados
     * cuando les toca por reloj. */
    verRed: function (rep) {
      if (!rep || !rep.cuadros || !rep.cuadros.length) return false;
      var UI = window.PM.UI;
      if (G.inGame()) G.toMenu();
      this.modo = 'verRed';
      this.rep = rep;
      this.cursor = 0;
      this.cursorEv = 0;
      this.t = 0;
      if (UI) {
        if (UI.resumeAudio) UI.resumeAudio();
        UI.hideAll();
      }
      G.newGame({
        players: rep.jugadores,
        net: 'spec',
        localIdx: -1,
        cfg: this.cfgDe({ ajustes: rep.ajustes, nivel: rep.nivel }),
        names: rep.nombres.slice(),
        colors: rep.colores.slice(),
        skins: rep.skins.slice(),
        ghosts: rep.ghosts ? rep.ghosts.slice() : null,
        maze: rep.maze || null,
        hab: !!rep.hab
      });
      if (rep.pm && rep.pm.hex && G.applyPelletHex) G.applyPelletHex(rep.pm.hex);
      return true;
    },

    verRedGuardada: function (id) {
      var reg = this.porIdRed(id);
      if (!reg) { this.avisoRoto(); return false; }
      var rep = this.leerRed(reg.s);
      if (!rep) { this.avisoRoto(); return false; }
      return this.verRed(rep);
    },

    /* Un tick de reproducción: los cuadros y eventos que ya tocan */
    inyectarRed: function () {
      var rep = this.rep;
      if (!rep) return;
      /* el vigilante de red daría la partida por caída: aquí no hay red que
       * vigilar, la "conexión" es el archivo */
      G.netWatch = 0;
      var n = rep.jugadores;
      while (this.cursorEv < rep.eventos.length &&
             rep.eventos[this.cursorEv][0] <= this.t) {
        var ev = rep.eventos[this.cursorEv++][1];
        if (ev && ev.t === 'pm') {
          if (G.applyPelletHex) G.applyPelletHex(ev.hex);
        } else {
          G.applyEvt(ev);
        }
      }
      while (this.cursor < rep.cuadros.length &&
             rep.cuadros[this.cursor][0] <= this.t) {
        var c = rep.cuadros[this.cursor++];
        var s = montaSnap(c[1], n);
        s.he = c[2] || [];
        G.applySnapshot(s);
      }
      // se acabó la grabación: se queda el final en pantalla
      if (this.cursor >= rep.cuadros.length &&
          this.cursorEv >= rep.eventos.length && !this.redFin) {
        this.redFin = true;
        if (window.PM.UI && window.PM.UI.showGameOverPrompt &&
            G.state !== 'GAME_OVER') {
          G.state = 'GAME_OVER';
          G.syncUI();
        }
      }
    },

    /* =========================================================
     * ALMACÉN — las últimas de este navegador
     * Cada registro: { id, t, j, p, lv, b, s }
     *   b = 1 -> es la de tu mejor récord y no se poda nunca
     *   s     -> la repetición ya serializada
     * ========================================================= */
    guardadas: function () {
      try {
        var raw = localStorage.getItem(CFG.REPLAY_KEY);
        var arr = raw ? JSON.parse(raw) : [];
        return esLista(arr) ? arr : [];
      } catch (e) { return []; }
    },

    escribir: function (lista) {
      // si no cabe, se van soltando las más viejas antes que perderlo todo
      for (var intento = 0; intento < 6; intento++) {
        try {
          localStorage.setItem(CFG.REPLAY_KEY, JSON.stringify(lista));
          return true;
        } catch (e) {
          if (!lista.length) return false;
          lista.pop();
        }
      }
      return false;
    },

    /* Poda: se quedan las más recientes, y la del mejor récord no se toca
     * mientras haya otra cosa que soltar. localStorage es pequeño y una
     * repetición larga ocupa varios kilobytes. */
    podar: function (lista) {
      function total(l) {
        var n = 0;
        for (var i = 0; i < l.length; i++) n += (l[i].s || '').length;
        return n;
      }
      function sueltaUna() {
        for (var i = lista.length - 1; i >= 0; i--) {
          if (!lista[i].b) { lista.splice(i, 1); return true; }
        }
        // solo quedan récords: se suelta el más viejo igualmente
        if (lista.length > 1) { lista.pop(); return true; }
        return false;
      }
      while ((lista.length > CFG.REPLAY_MAX ||
              total(lista) > CFG.REPLAY_TOTAL_CHARS) && sueltaUna()) { /* poda */ }
      return lista;
    },

    guardar: function (rep) {
      var texto = this.serializar(rep);
      if (!texto || texto.length > CFG.REPLAY_MAX_CHARS) return null;
      var lista = this.guardadas();
      var j = rep.jugadores;
      /* ¿es la de tu mejor marca? El récord ya está persistido cuando se
       * cierra la partida, así que basta con empatarlo */
      var tope = G.recordFor(j);
      var esRecord = rep.final.puntos > 0 && rep.final.puntos >= (tope || 0);
      if (esRecord) {
        for (var i = 0; i < lista.length; i++) {
          if (lista[i].j === j) lista[i].b = 0;
        }
      }
      var ahora = Date.now();
      var reg = {
        id: String(ahora) + '-' + b36(rep.final.puntos),
        t: ahora, j: j, p: rep.final.puntos, lv: rep.final.nivel,
        b: esRecord ? 1 : 0, s: texto
      };
      lista.unshift(reg);
      this.podar(lista);
      this.escribir(lista);
      return reg;
    },

    porId: function (id) {
      var lista = this.guardadas();
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id) return lista[i];
      }
      return null;
    },

    /* ¿Esta fila del historial (js/history.js) tiene repetición guardada?
     * Se cruzan por puntuación y por hora: las dos cosas se escriben en el
     * mismo cierre de partida, con milisegundos de diferencia. */
    paraPartida: function (h) {
      if (!h) return null;
      var lista = this.guardadas();
      for (var i = 0; i < lista.length; i++) {
        var r = lista[i];
        if (r.p === h.p && r.j === h.j && Math.abs(r.t - h.t) < 15000) return r;
      }
      return null;
    },

    borrarTodo: function () {
      try { localStorage.removeItem(CFG.REPLAY_KEY); }
      catch (e) { /* sin almacenamiento */ }
    },

    /* =========================================================
     * REPRODUCCIÓN
     * ========================================================= */
    ver: function (rep) {
      if (!this.valida(rep)) return false;
      var UI = window.PM.UI;
      if (G.inGame()) G.toMenu();      // lo que hubiera se cierra y se guarda
      this.modo = 'ver';
      this.rep = rep;
      this.cursor = 0;
      this.t = 0;
      if (UI) {
        if (UI.resumeAudio) UI.resumeAudio();
        UI.hideAll();
      }
      G.newGame({
        players: rep.jugadores,
        cfg: this.cfgDe(rep),
        names: rep.nombres.slice(),
        // sin esto las habilidades grabadas no tendrían dónde aplicarse
        hab: esDesatado(rep.modo),
        // ni los giros del que llevaba fantasma, a quién moverle
        ghosts: (rep.ajustes && rep.ajustes.ghosts)
          ? rep.ajustes.ghosts.slice() : null
      });
      return true;
    },

    verTexto: function (texto) {
      var rep = this.leer(texto);
      if (!rep) { this.avisoRoto(); return false; }
      return this.ver(rep);
    },

    verGuardada: function (id) {
      var reg = this.porId(id);
      if (!reg) { this.avisoRoto(); return false; }
      return this.verTexto(reg.s);
    },

    /* ---------- Puerta para el TOP MUNDIAL ----------
     * El ranking mundial guardará la repetición de cada marca en una columna
     * de texto (el mismo texto que devuelve serializar). Cuando esté, la
     * fila del ranking se pasa TAL CUAL aquí y se ve; no hay que tocar nada
     * más de este módulo. Se aceptan las columnas 'rep', 'repeticion' y
     * 'replay' para no atarse al nombre que acabe teniendo.
     *   if (Replay.hayRepeticion(fila)) -> pintar el botón VER
     *   Replay.verDelRanking(fila)      -> reproducirla
     * Devuelve false si la fila no trae repetición o si viene rota. */
    hayRepeticion: function (fila) {
      return !!(fila && (fila.rep || fila.repeticion || fila.replay));
    },

    verDelRanking: function (fila) {
      if (!this.hayRepeticion(fila)) return false;
      return this.verTexto(String(fila.rep || fila.repeticion || fila.replay));
    },

    /* Enlace compartido: se abre directo en la repetición.
     *   ?rep=<texto>   la partida entera dentro de la URL (partidas locales)
     *   ?rn=<codigo>   solo el código; la partida se descarga (online)
     * Se mira primero el de red porque es el nuevo y el más corto: si alguien
     * pega los dos, gana el que señala a una partida de verdad. */
    desdeUrl: function () {
      var busca = '';
      try { busca = window.location.search || ''; } catch (e) { busca = ''; }
      var mr = new RegExp('[?&]' + CFG.REPLAY_SHARE.PARAM + '=([A-Za-z0-9]+)')
        .exec(busca);
      if (mr) return this.verCompartida(mr[1]);
      var m = /[?&]rep=([^&#]*)/.exec(busca);
      if (!m) return false;
      var texto = m[1];
      try { texto = decodeURIComponent(texto); } catch (e) { /* tal cual */ }
      return this.verTexto(texto);
    },

    /* Ajustes con los que se jugó: son los que cambian la simulación, el
     * resto (colores, sonido) se queda como lo tenga cada uno. */
    cfgDe: function (rep) {
      var base = window.PM.settings || CFG.DEFAULT_SETTINGS;
      var s = {}, k;
      for (k in base) { if (base.hasOwnProperty(k)) s[k] = base[k]; }
      var a = rep.ajustes;
      s.ghostSpeedMult = a.velFantasmas;
      s.pacSpeedMult = a.velPac;
      s.frightMult = a.powerS;
      s.startLives = a.vidas;
      s.startLevel = rep.nivel;
      s.livesMode = (a.vidasModo === 'individual') ? 'individual' : 'shared';
      return s;
    },

    reiniciar: function () {
      if (!this.rep) return;
      var rep = this.rep;
      if (window.PM.UI) window.PM.UI.hidePrompt();
      G.paused = false;
      // la de red se vuelve a montar entera: su reloj y sus cursores van
      // con la reproducción, no con la partida
      if (this.modo === 'verRed') { this.verRed(rep); return; }
      if (this.modo !== 'ver') return;
      if (G.lastOpts) G.restartGame();     // pasa por newGame -> alEmpezar
      else this.ver(rep);
    },

    /* yaEnMenu: la partida ya se cerró por su cuenta (SALIR del menú de
     * pausa, por ejemplo) y aquí solo hay que recoger. */
    salir: function (yaEnMenu) {
      var estaba = (this.modo === 'ver' || this.modo === 'verRed');
      this.modo = null;
      this.rep = null;
      this.grabando = null;
      this.red = null;
      this.cursor = 0;
      this.cursorEv = 0;
      this.t = 0;
      G.replaying = false;
      G.timeScale = 1;
      this.mostrarBarra(false);
      if (!estaba) return;
      // los nombres eran los de la repetición, no los de nadie de aquí
      G.netNames = null;
      if (!yaEnMenu && G.inGame()) G.toMenu();
    },

    velocidad: function (x) {
      G.timeScale = (x === 2) ? 2 : 1;
      this.pintaBarra();
    },

    pausar: function (on) {
      if (!G.canPause()) return;
      G.setPaused(arguments.length ? !!on : !G.paused);
      this.pintaBarra();
    },

    /* =========================================================
     * INTERFAZ — cartel y controles
     * Todo se monta aquí, con estilos en línea, para no tocar la hoja de
     * estilos ni el HTML: la repetición es un añadido y se quita sola.
     * ========================================================= */
    mostrarBarra: function (on) {
      if (!on) {
        if (this.barra) this.barra.style.display = 'none';
        return;
      }
      if (!this.barra) this.construirBarra();
      if (!this.barra) return;
      this.barra.style.display = 'flex';
      this.pintaBarra();
    },

    construirBarra: function () {
      if (typeof document === 'undefined' || !document.body) return;
      var self = this;
      var bar = document.createElement('div');
      bar.id = 'replayBar';
      var st = bar.style;
      st.position = 'fixed';
      st.left = '0';
      st.right = '0';
      st.top = '0';
      st.zIndex = '30';
      st.display = 'none';
      st.alignItems = 'center';
      st.justifyContent = 'center';
      st.flexWrap = 'wrap';
      st.gap = '6px';
      st.padding = '5px 8px';
      st.background = 'rgba(0, 0, 0, 0.82)';
      st.borderBottom = '2px solid #7ec8ff';
      st.fontFamily = "'Courier New', Courier, monospace";
      st.fontSize = '11px';
      st.fontWeight = 'bold';
      st.letterSpacing = '2px';
      st.color = '#7ec8ff';
      st.lineHeight = '1';

      this.etiqueta = document.createElement('span');
      this.etiqueta.textContent = 'REPETICIÓN';
      bar.appendChild(this.etiqueta);

      function boton(texto, fn) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = texto;
        var s = b.style;
        s.fontFamily = 'inherit';
        s.fontSize = '11px';
        s.fontWeight = 'bold';
        s.letterSpacing = '1px';
        s.color = '#fff';
        s.background = 'rgba(0, 0, 0, 0.55)';
        s.border = '1px solid rgba(255, 255, 255, 0.45)';
        s.borderRadius = '4px';
        s.padding = '6px 9px';
        s.cursor = 'pointer';
        b.addEventListener('click', fn);
        bar.appendChild(b);
        return b;
      }

      this.btnPausa = boton('PAUSA', function () { self.pausar(); });
      this.btnVel = boton('x2', function () {
        self.velocidad(G.timeScale === 2 ? 1 : 2);
      });
      boton('REINICIAR', function () { self.reiniciar(); });
      boton('SALIR', function () { self.salir(); });

      document.body.appendChild(bar);
      this.barra = bar;
    },

    pintaBarra: function () {
      if (!this.barra || !this.rep) return;
      var r = this.rep;
      var quien = r.nombres.join(' + ') || 'ANÓNIMO';
      var f = new Date(Date.parse(r.fecha) || 0);
      function dd(n) { return (n < 10 ? '0' : '') + n; }
      this.etiqueta.textContent = 'REPETICIÓN · ' + quien + ' · ' +
        (r.final ? r.final.puntos + ' PTS' : '') + ' · ' +
        dd(f.getDate()) + '/' + dd(f.getMonth() + 1);
      if (this.btnPausa) this.btnPausa.textContent = G.paused ? 'SEGUIR' : 'PAUSA';
      if (this.btnVel) this.btnVel.textContent = (G.timeScale === 2) ? 'x1' : 'x2';
    },

    /* ---------- diálogos, los pide ui.js ---------- */
    /* Menú de pausa de una repetición (en vez del de la partida) */
    pausaPrompt: function () {
      var self = this, UI = window.PM.UI;
      if (this.modo !== 'ver' || !UI || !UI.showPrompt) return false;
      this.pintaBarra();
      UI.showPrompt({
        title: 'REPETICIÓN EN PAUSA',
        color: '#7ec8ff',
        lines: ['ESTÁS VIENDO UNA PARTIDA YA JUGADA.',
                'NO CUENTA PARA NADA: NI PUNTOS, NI LOGROS, NI RÉCORD.'],
        buttons: [
          { label: 'SEGUIR', primary: true, hint: 'P · ESC',
            keys: ['p', 'Escape', 'Enter'],
            onClick: function () { self.pausar(false); } },
          { label: (G.timeScale === 2) ? 'VELOCIDAD x1' : 'VELOCIDAD x2',
            hint: 'X', keys: ['x'],
            onClick: function () {
              self.velocidad(G.timeScale === 2 ? 1 : 2);
              if (UI.syncPrompt) UI.syncPrompt();
            } },
          { label: 'REINICIAR', hint: 'R', keys: ['r'],
            onClick: function () { self.reiniciar(); } },
          { label: 'SALIR', hint: 'Q', keys: ['q'],
            onClick: function () { self.salir(); } }
        ]
      });
      return true;
    },

    /* Final de una repetición (en vez del GAME OVER de la partida) */
    finPrompt: function () {
      var self = this, UI = window.PM.UI;
      if (this.modo !== 'ver' || !this.rep || !UI || !UI.showPrompt) return false;
      var f = this.rep.final || {};
      var cuadra = (G.score === f.puntos);
      UI.showPrompt({
        title: 'FIN DE LA REPETICIÓN',
        color: '#7ec8ff',
        solid: true,
        lines: [
          { text: 'PUNTUACIÓN ' + (G.score || 0), big: true },
          'LA PARTIDA GRABADA HIZO ' + (f.puntos || 0) + ' · NIVEL ' + (f.nivel || 1),
          cuadra ? '' : 'NO CUADRA CON LA GRABADA: EL JUEGO HA CAMBIADO'
        ],
        buttons: [
          { label: 'VER OTRA VEZ', primary: true, hint: 'R', keys: ['r', 'Enter'],
            onClick: function () { self.reiniciar(); } },
          { label: 'SALIR', hint: 'Q · ESC', keys: ['q', 'Escape'],
            onClick: function () { self.salir(); } }
        ]
      });
      return true;
    },

    /* Un enlace manipulado no debe dejar el juego colgado: se avisa y a
     * jugar como siempre. */
    avisoRoto: function () {
      var UI = window.PM.UI;
      if (!UI || !UI.showPrompt) return;
      UI.showPrompt({
        title: 'REPETICIÓN NO VÁLIDA',
        color: '#ff8c00',
        lines: ['ESE ENLACE ESTÁ ROTO O ES DE OTRA VERSIÓN DEL JUEGO.',
                'EL RESTO DEL JUEGO FUNCIONA CON NORMALIDAD.'],
        buttons: [
          { label: 'SEGUIR', primary: true, hint: 'ENTER',
            keys: ['Enter', 'Escape', ' '],
            onClick: function () { UI.hidePrompt(); } }
        ]
      });
    }
  };

  window.PM.Replay = Replay;
})();
