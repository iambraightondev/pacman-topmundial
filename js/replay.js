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

  /* ---------- el aspecto de quien jugó ----------
   * Una repetición se ve como SE JUGÓ, así que el aspecto viaja con ella:
   * skin, color y lo puesto de la TIENDA (accesorio y efecto), por jugador.
   * Antes se pintaba con lo que llevara puesto QUIEN MIRA, y una partida
   * ajena salía con tu skin y tu color, que es como ver la grabación de otro
   * con tu cara puesta.
   *
   * Va en un campo aparte y AL FINAL del texto, así que las repeticiones de
   * antes (diez campos) se siguen leyendo igual: simplemente no traen
   * aspecto, y entonces se pintan como se pintaban.
   *
   * Formato: un jugador por coma, y dentro `skin.color.accesorio.efecto`
   * (el color en hexadecimal sin la almohadilla). Lo que falte va vacío. */
  function codAspectos(lista) {
    var out = [];
    for (var i = 0; i < lista.length; i++) {
      var a = lista[i] || {};
      out.push([
        String(a.s || '').replace(/[^a-z0-9_-]/gi, ''),
        String(a.c || '').replace(/[^0-9a-f]/gi, '').slice(0, 6),
        String(a.a || '').replace(/[^a-z0-9_-]/gi, ''),
        String(a.x || '').replace(/[^a-z0-9_-]/gi, '')
      ].join('.'));
    }
    return out.join(',');
  }

  /* Estricto a propósito: cada jugador son CUATRO trozos separados por
   * puntos, y si el campo no es exactamente eso la repetición se da por rota.
   * Un texto que llega por una URL puede venir con cualquier cosa pegada
   * detrás, y pegar basura al final no puede colar como aspecto. */
  var RE_ASPECTO = /^[a-z0-9_-]*\.[0-9a-f]{0,6}\.[a-z0-9_-]*\.[a-z0-9_-]*$/i;

  function decAspectos(texto) {
    if (!texto) return null;
    var trozos = String(texto).split(','), out = [];
    for (var v = 0; v < trozos.length; v++) {
      if (!RE_ASPECTO.test(trozos[v])) return false;   // false = viene roto
    }
    for (var i = 0; i < trozos.length; i++) {
      var p = trozos[i].split('.');
      /* El color vuelve con su almohadilla, que es como lo usa el juego (y
       * como estaba antes de serializarlo: leer(serializar(x)) tiene que dar
       * exactamente x, y hay una prueba que lo exige). */
      var c = /^[0-9a-f]{6}$/i.test(p[1] || '') ? ('#' + p[1]) : '';
      out.push({ s: p[0] || '', c: c, a: p[2] || '', x: p[3] || '' });
    }
    return out;
  }

  /* Lo que llegue de fuera no se pinta a ciegas: una skin que no existe
   * (repetición de una versión más nueva, o texto trasteado) sale como el
   * Pac-Man de siempre en vez de no dibujar nada. */
  function limpiaAspecto(a) {
    var out = { s: '', c: '', a: '', x: '' };
    if (!a) return out;
    if (CFG.SKIN_IDS.indexOf(a.s) !== -1) out.s = a.s;
    if (/^#?[0-9a-f]{6}$/i.test(a.c || '')) {
      out.c = (a.c.charAt(0) === '#') ? a.c : ('#' + a.c);
    }
    if (CFG.ACCESORIO_IDS && CFG.ACCESORIO_IDS.indexOf(a.a) !== -1) out.a = a.a;
    if (CFG.EFECTO_IDS && CFG.EFECTO_IDS.indexOf(a.x) !== -1) out.x = a.x;
    return out;
  }

  /* De la repetición a lo que newGame espera: tres listas sueltas */
  function repartoAspectos(rep) {
    if (!rep || !esLista(rep.aspectos) || !rep.aspectos.length) return null;
    var colores = [], skins = [], looks = [], hay = false;
    for (var i = 0; i < rep.jugadores; i++) {
      var a = limpiaAspecto(rep.aspectos[i]);
      colores.push(a.c || null);
      skins.push(a.s || null);
      looks.push({ a: a.a, x: a.x });
      if (a.c || a.s || a.a || a.x) hay = true;
    }
    return hay ? { colors: colores, skins: skins, looks: looks } : null;
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
   * grabado antes de que existiera el dúo se sigue leyendo igual.
   *
   *   E         CONTINUAR pagado (qué = 8; desde el 17 sep 2026)
   *
   * La E estaba libre (entre los poderes del J1 y los giros). Una versión
   * del juego de antes no la conoce y da la repetición por rota, que es lo
   * que tiene que pasar: sin revivir, la partida no cuadraría. */
  function codHab(e) {
    var base = (e[1] === 1) ? 87 : 65;      // 'W' para el J2, 'A' para el J1
    return String.fromCharCode(base + ((e[2] - 4) & 3));
  }

  function esHab(e) { return e[2] >= 4 && e[2] <= 7; }

  function codEntradas(arr) {
    var out = '', prev = 0, i = 0;
    while (i < arr.length) {
      var e = arr[i];
      var delta = e[0] - prev;
      var code = (e[2] === 8) ? 'E'
        : esHab(e) ? codHab(e)
        : String.fromCharCode(71 + ((e[1] & 3) << 2) + (e[2] & 3));
      var n = 1;
      while (i + n < arr.length) {
        var f = arr[i + n];
        if (f[1] !== e[1] || f[2] !== e[2]) break;
        if (f[0] - arr[i + n - 1][0] !== delta) break;
        n++;
      }
      /* la cuenta del RLE se cierra con un punto: sin él, '5A*8' seguido de
       * '5G' se leía '5A*85' y una 'G' sin delta (repetición rota) */
      out += b36(delta) + code + (n > 1 ? '*' + b36(n) + '.' : '');
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
    // el punto que cierra la cuenta es opcional: los textos de antes no lo llevan
    var re = /([0-9a-z]+)([A-EG-Z])(?:\*([0-9a-z]+)\.?)?/g;
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
        if (cod === 69) out.push([tick, 0, 8]);            // E: continuar
        else if (poderDe >= 0) out.push([tick, poderDe, 4 + c]);
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
  // CONTINUE va al final: el orden es el contrato y los de antes no se mueven
  var ESTADOS = ['MENU', 'READY', 'PLAYING', 'DYING', 'LEVEL_DONE', 'GAME_OVER', 'CONTINUE', 'REVIVIR'];
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
    montaje: null,       // lo que la repetición no lleva dentro (el laberinto)
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
      /* Un laberinto que este juego no conoce —de una versión más nueva, o
       * uno que se quitó— no se puede reproducir: se vería la partida en un
       * trazado que no es y nada cuadraría. Es la misma regla que en las
       * repeticiones de red. */
      if (a.maze) {
        var M = window.PM.Mazes;
        if (typeof a.maze !== 'string' || (M && !M.conocido(a.maze))) return false;
      }
      if (!esLista(rep.nombres) || !rep.nombres.length) return false;
      /* El aspecto es opcional (las repeticiones de antes no lo traen), pero
       * si viene tiene que ser una lista: lo que lleve dentro ya se sanea al
       * repartirlo, que un accesorio raro no puede tumbar una repetición. */
      if (rep.aspectos != null && !esLista(rep.aspectos)) return false;
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
        if (!esNum(e[2]) || e[2] < 0 || e[2] > 8) return false;
        /* 8: CONTINUAR pagado. Siempre del J1 (en local un pago revive al
         * equipo del teclado) y nunca en PAC-MAN VS., que no tiene continuar. */
        if (e[2] === 8) {
          if (e[1] !== 0 || esVersus(rep.modo)) return false;
          continue;
        }
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
      if (a.qArmada) aj.push('q');
      // 'm' + el laberinto (los ids no llevan ni comas ni virgulillas)
      if (a.maze) aj.push('m' + String(a.maze).replace(/[^a-z0-9_-]/gi, ''));
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
      ].join(SEP) +
        /* El aspecto va al final y solo si lo hay: así el texto de una
         * repetición vieja sigue siendo exactamente el mismo. */
        (esLista(rep.aspectos) && rep.aspectos.length
          ? (SEP + codAspectos(rep.aspectos)) : '');
    },

    /* Texto -> repetición, o null si viene rota. Nunca lanza: el texto
     * puede llegar de una URL que ha pasado por WhatsApp. */
    leer: function (texto) {
      try {
        if (typeof texto !== 'string') return null;
        var t = texto.replace(/^\s+|\s+$/g, '');
        if (!t) return null;
        var p = t.split(SEP);
        // once campos desde que el aspecto viaja con la repetición; las de
        // antes traen diez y se leen igual
        if (p.length !== 10 && p.length !== 11) return null;
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
          else if (aj[b] === 'q') ajustes.qArmada = true;
          else if (aj[b].charAt(0) === 'm') ajustes.maze = aj[b].slice(1);
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
        if (p.length === 11) {
          var asp = decAspectos(p[10]);
          if (asp === false || !asp || asp.length !== rep.jugadores) return null;
          rep.aspectos = asp;
        }
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

    /* =========================================================
     * TODAS EN LA NUBE
     *
     * El navegador solo aguanta unas pocas repeticiones (CFG.REPLAY_MAX y
     * REPLAY_NET_MAX) y las viejas se iban borrando: TUS PARTIDAS enseñaba
     * filas sin VER ni COMPARTIR. Ahora cada repetición se SUBE SOLA al
     * acabar la partida a la tabla `repeticiones` (supabase/
     * repeticiones-todas.sql), con su tipo ('local' o 'red') y, si hay cuenta,
     * a nombre de esa cuenta. El código que devuelve es a la vez lo que abre
     * el enlace compartido (?rn=) y lo que permite verla cuando el navegador
     * ya la soltó.
     *
     * Para no perder la pista, se apunta en un índice pequeño aparte
     * (CFG.REPLAY_NUBE_KEY): hora, jugadores, puntos y código. Ocupa nada, así
     * que caben cientos. Con cuenta, además, se piden a la nube las tuyas, que
     * es lo que hace que se vean también las jugadas en otro aparato.
     * ========================================================= */
    nubeHeaders: function () {
      var h = this.restHeaders();
      var Ac = window.PM.Account;
      if (Ac && Ac.logged && Ac.logged() && Ac.token) h['Authorization'] = 'Bearer ' + Ac.token;
      return h;
    },

    /* El índice, sin las que ya caducaron en la nube (no destacadas y de
     * hace más de CFG.REPLAY_CADUCA_DIAS): esas ya no se pueden ver. */
    indiceNube: function () {
      var arr;
      try {
        var raw = localStorage.getItem(CFG.REPLAY_NUBE_KEY);
        arr = raw ? JSON.parse(raw) : [];
      } catch (e) { arr = []; }
      if (!esLista(arr)) return [];
      var self = this;
      return arr.filter(function (x) { return x && x.rn && self.diasQueQuedan(x) >= 0; });
    },

    /* Días que le quedan en la nube: -1 si ya caducó, Infinity si es destacada */
    diasQueQuedan: function (x) {
      if (!x) return -1;
      if (x.d) return Infinity;
      var desde = x.c || x.t || 0;
      var dias = CFG.REPLAY_CADUCA_DIAS - Math.floor((Date.now() - desde) / 86400000);
      return dias < 0 ? -1 : dias;
    },

    apuntarNube: function (entrada) {
      var previa = null;
      var lista = this.indiceNube().filter(function (x) {
        if (x.rn === entrada.rn) { previa = x; return false; }
        return true;
      });
      // lo que no traiga la entrada nueva (nombres, título...) se conserva
      if (previa) {
        for (var k in previa) {
          if (previa.hasOwnProperty(k) && entrada[k] === undefined) entrada[k] = previa[k];
        }
      }
      lista.unshift(entrada);
      lista.sort(function (a, b) { return b.t - a.t; });
      while (lista.length > CFG.REPLAY_NUBE_MAX) lista.pop();
      try { localStorage.setItem(CFG.REPLAY_NUBE_KEY, JSON.stringify(lista)); }
      catch (e) { /* sin almacenamiento: la próxima vez se vuelven a pedir */ }
    },

    /* ¿Esta fila del historial tiene repetición en la nube? */
    paraPartidaNube: function (h) {
      if (!h) return null;
      var lista = this.indiceNube();
      for (var i = 0; i < lista.length; i++) {
        var r = lista[i];
        if (r.j === h.j && Math.abs(r.t - h.t) < 15000 && (r.p === h.p || r.tipo === 'red')) return r;
      }
      return null;
    },

    /* Deja apuntado el código en la ficha del navegador (de una lista u otra) */
    apuntarCodigo: function (id, codigo, tipo) {
      var clave = (tipo === 'local') ? CFG.REPLAY_KEY : CFG.REPLAY_NET_KEY;
      var lista = (tipo === 'local') ? this.guardadas() : this.guardadasRed();
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id !== id) continue;
        lista[i].rn = codigo;
        try { localStorage.setItem(clave, JSON.stringify(lista)); }
        catch (e) { /* si no cabe, el índice de la nube ya lo tiene */ }
        return;
      }
    },

    /* Sube una ficha guardada. cb(err, codigo). Si ya estaba subida, no se
     * vuelve a subir: el mismo código de siempre. */
    subirReg: function (reg, tipo, cb) {
      var self = this;
      cb = cb || function () {};
      if (!reg || !reg.s) { cb('ESA REPETICIÓN YA NO ESTÁ', null); return; }
      if (reg.rn) { cb(null, reg.rn); return; }
      if (!this.compartirConfigurado()) { cb('COMPARTIR NECESITA CONEXIÓN', null); return; }
      if (reg.s.length > CFG.REPLAY_SHARE.MAX_CHARS) {
        cb('ESA PARTIDA ES DEMASIADO LARGA PARA SUBIRLA', null);
        return;
      }
      var rep = (tipo === 'local') ? this.leer(reg.s) : this.leerRed(reg.s);
      if (!rep) { cb('ESA REPETICIÓN ESTÁ ROTA', null); return; }
      var fila = {
        jugadores: rep.jugadores,
        puntos: (rep.final && rep.final.puntos) || reg.p || 0,
        nivel: Math.max(1, (rep.final && rep.final.nivel) || reg.lv || 1),
        nombres: (rep.nombres || []).join(' + ').slice(0, 64),
        datos: reg.s,
        tipo: (tipo === 'local') ? 'local' : 'red',
        t_partida: reg.t || Date.now()
      };
      var h = this.nubeHeaders();
      h['Prefer'] = 'return=minimal';
      function intenta(quedan) {
        var codigo = self.codigoNuevo();
        fila.id = codigo;
        fetch(self.restUrl('/rest/v1/' + CFG.REPLAY_SHARE.TABLE), {
          method: 'POST', headers: h, body: JSON.stringify(fila)
        }).then(function (res) {
          if (res.ok) {
            reg.rn = codigo;
            self.apuntarCodigo(reg.id, codigo, fila.tipo);
            self.apuntarNube({ t: fila.t_partida, j: reg.j, p: reg.p, lv: reg.lv, rn: codigo,
              tipo: fila.tipo, n: fila.nombres, c: Date.now(), d: false });
            cb(null, codigo);
            return;
          }
          return res.text().then(function (t) {
            if (/duplicate|unique/i.test(t) && quedan > 1) { intenta(quedan - 1); return; }
            if (/demasiadas repeticiones/i.test(t)) {
              cb('DEMASIADAS SUBIDAS SEGUIDAS: ESPERA UN MINUTO', null);
              return;
            }
            cb('NO SE PUDO SUBIR LA REPETICIÓN', null);
          });
        }).catch(function () { cb('NO SE PUDO SUBIR LA REPETICIÓN', null); });
      }
      intenta(CFG.REPLAY_SHARE.INTENTOS);
    },

    /* Sube, una detrás de otra, las guardadas que aún no están en la nube. Se
     * llama al acabar cada partida y al arrancar el juego: así se suben
     * también las que ya había antes de que existiera esto. */
    subirPendientes: function (cb) {
      var self = this;
      // la página de pruebas no sube nada: sus partidas son de mentira
      if (window.PM_PRUEBAS || this.subiendo || !this.compartirConfigurado()) { if (cb) cb(); return; }
      var cola = [];
      this.guardadas().forEach(function (r) { if (!r.rn) cola.push([r, 'local']); });
      this.guardadasRed().forEach(function (r) { if (!r.rn) cola.push([r, 'red']); });
      if (!cola.length) { if (cb) cb(); return; }
      this.subiendo = true;
      (function siguiente() {
        var x = cola.shift();
        if (!x) { self.subiendo = false; if (cb) cb(); return; }
        self.subirReg(x[0], x[1], function (err) {
          if (err && /DEMASIADAS|CONEXIÓN/.test(err)) { self.subiendo = false; if (cb) cb(); return; }
          siguiente();
        });
      })();
    },

    /* Con cuenta: las tuyas que están en la nube, al índice. cb(err) */
    traerMias: function (cb) {
      var self = this;
      var Ac = window.PM.Account;
      if (!Ac || !Ac.logged || !Ac.logged() || !Ac.user || !this.compartirConfigurado()) {
        if (cb) cb('SIN CUENTA');
        return;
      }
      fetch(this.restUrl('/rest/v1/' + CFG.REPLAY_SHARE.TABLE +
              '?select=id,jugadores,puntos,nivel,tipo,t_partida,creado_en,nombres,destacada,titulo' +
              '&dueno=eq.' + encodeURIComponent(Ac.user.id) +
              '&order=creado_en.desc&limit=' + CFG.REPLAY_NUBE_MAX),
            { headers: this.nubeHeaders() })
        .then(function (res) { if (!res.ok) throw new Error('no'); return res.json(); })
        .then(function (filas) {
          (filas || []).forEach(function (f) {
            self.apuntarNube({
              t: f.t_partida || Date.parse(f.creado_en) || 0,
              c: Date.parse(f.creado_en) || 0,
              j: f.jugadores, p: f.puntos, lv: f.nivel, rn: f.id, tipo: f.tipo || 'red',
              n: f.nombres || '', d: !!f.destacada, ti: f.titulo || ''
            });
          });
          if (cb) cb(null);
        })
        .catch(function () { if (cb) cb('SIN CONEXIÓN'); });
    },

    /* =========================================================
     * DESTACADAS: las que se quedan para siempre, con nombre
     * Solo con cuenta. La función de la base de datos (destacar_repeticion)
     * solo toca destacada y titulo, y hace tuya una repetición que subiste
     * antes de entrar. cb(err, entrada del índice)
     * ========================================================= */
    destacar: function (codigo, activa, titulo, cb) {
      var self = this;
      var Ac = window.PM.Account;
      cb = cb || function () {};
      if (!Ac || !Ac.logged || !Ac.logged()) { cb('NECESITAS UNA CUENTA', null); return; }
      if (!this.compartirConfigurado()) { cb('SIN CONEXIÓN', null); return; }
      var t = String(titulo || '').toUpperCase().trim().slice(0, CFG.REPLAY_TITULO_MAX);
      var R = window.PM.Ranking;
      if (activa && t && R && R.nameAllowed && !R.nameAllowed(t)) { cb('ESE NOMBRE NO VALE', null); return; }
      fetch(this.restUrl('/rest/v1/rpc/destacar_repeticion'), {
        method: 'POST', headers: this.nubeHeaders(),
        body: JSON.stringify({ p_id: codigo, p_destacada: !!activa, p_titulo: activa ? t : null })
      }).then(function (res) {
        if (!res.ok) throw new Error(res.status === 401 ? 'NECESITAS UNA CUENTA' : 'NO SE PUDO GUARDAR');
        return res.json();
      }).then(function (filas) {
        if (!filas || !filas.length) { cb('ESA REPETICIÓN NO ES TUYA O YA NO ESTÁ', null); return; }
        var entrada = null;
        self.indiceNube().forEach(function (x) { if (x.rn === codigo) entrada = x; });
        entrada = entrada || { rn: codigo, t: Date.now() };
        entrada.d = !!filas[0].destacada;
        entrada.ti = filas[0].titulo || '';
        self.apuntarNube(entrada);
        cb(null, entrada);
      }).catch(function (e) { cb(e.message || 'NO SE PUDO GUARDAR', null); });
    },

    /* Destacar desde una fila de TUS PARTIDAS: si la repetición aún no está en
     * la nube (tipo 'local' o 'red' sin código), primero se sube */
    destacarFila: function (tipo, id, activa, titulo, cb) {
      var self = this;
      if (tipo === 'nube') { this.destacar(id, activa, titulo, cb); return; }
      var reg = (tipo === 'red') ? this.porIdRed(id) : this.porId(id);
      this.subirReg(reg, tipo, function (err, codigo) {
        if (err) { cb(err, null); return; }
        self.destacar(codigo, activa, titulo, cb);
      });
    },

    /* Las destacadas del índice, de la más nueva a la más vieja */
    destacadas: function () {
      return this.indiceNube().filter(function (x) { return x.d; });
    },

    /* COMPARTIR una de red: se sube (si no lo estaba) y se da su enlace */
    compartirRed: function (id, cb) {
      var self = this;
      this.subirReg(this.porIdRed(id), 'red', function (err, codigo) {
        cb(err, err ? null : self.enlaceRed(codigo));
      });
    },

    /* COMPARTIR una local: con código si está en la nube (el enlace corto);
     * si no se puede subir, la de siempre con la partida dentro de la URL. */
    compartirLocal: function (id, cb) {
      var self = this;
      var reg = this.porId(id);
      if (!reg) { cb('ESA REPETICIÓN YA NO ESTÁ', null); return; }
      this.subirReg(reg, 'local', function (err, codigo) {
        if (!err) { cb(null, self.enlaceRed(codigo)); return; }
        var url = self.enlace(reg.s);
        cb(url ? null : err, url || null);
      });
    },

    enlaceRed: function (codigo) {
      return this.baseUrl() + '?' + CFG.REPLAY_SHARE.PARAM + '=' + codigo;
    },

    /* Abrir un enlace ?rn=<codigo>: se descarga y se ve. Es asíncrono, así que
     * devuelve true en cuanto se pone a ello (quien llama tiene que dejar de
     * hacer otras cosas con la URL) y avisa por pantalla si sale mal. */
    verCompartida: function (codigo) {
      var self = this;
      var UI = window.PM.UI;
      var c = String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!c || !this.compartirConfigurado()) { this.avisoRoto(); return false; }
      this.origen = null;
      this.rnActual = c;
      if (UI && UI.showPrompt) {
        UI.showPrompt({
          title: 'REPETICIÓN COMPARTIDA',
          color: '#7ec8ff',
          lines: ['DESCARGANDO LA PARTIDA...'],
          buttons: []
        });
      }
      fetch(this.restUrl('/rest/v1/' + CFG.REPLAY_SHARE.TABLE +
              '?id=eq.' + encodeURIComponent(c) + '&select=datos,tipo&limit=1'),
            { headers: this.restHeaders() })
        .then(function (res) {
          if (!res.ok) throw new Error('no');
          return res.json();
        })
        .then(function (filas) {
          var texto = (filas && filas.length) ? filas[0].datos : '';
          /* las locales se suben tal cual se meten en ?rep=: se ven igual */
          if (texto && filas[0].tipo === 'local') {
            if (UI && UI.hidePrompt) UI.hidePrompt();
            self.verTexto(texto);
            return;
          }
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
      /* CACERÍA no se graba en local: el formato de entradas guarda un
       * asiento por jugador y aquí hay uno más (la máquina). Las de red sí,
       * que van por instantáneas y no necesitan reconstruir nada. */
      if (G.caza) return;

      var s = (opts && opts.cfg) || G.settings();
      var nombres = [], aspectos = [];
      for (var i = 0; i < G.playerCount; i++) {
        nombres.push(G.rawName(i));
        /* Cómo iba vestido cada uno: es lo que hace que la repetición se vea
         * como se jugó y no como vaya vestido quien la abra. */
        var lk = G.lookFor(i) || {};
        aspectos.push({ s: G.skinFor(i), c: G.colorFor(i),
                        a: lk.a || '', x: lk.x || '' });
      }
      var ajustes = {
        velFantasmas: G.ghostSpeedMult,
        velPac: G.pacSpeedMult,
        powerS: G.frightMult,
        vidas: s.startLives
      };
      // el reparto de vidas cambia la simulación en dúo, así que viaja
      // con los ajustes cuando no es el de siempre
      if (G.livesMode === 'individual') ajustes.vidasModo = 'individual';
      /* LABERINTOS: en cuál se jugaba. Es lo que más cambia la simulación de
       * todo lo que hay aquí —el trazado entero— y hasta ahora no se grababa:
       * una repetición de un laberinto alternativo se reproducía en el de
       * 1980 y se veía a Pac-Man atravesando muros. */
      if (G.mazeId) ajustes.maze = G.mazeId;
      /* PAC-MAN VS.: quién lleva qué fantasma. Es lo que más cambia la
       * simulación de todo lo que hay aquí —uno de los cuatro deja de pensar
       * por su cuenta— así que sin esto la repetición no se puede montar. */
      var vs = !!(G.isVersus && G.isVersus());
      if (vs) ajustes.ghosts = G.vsGhosts.slice();
      /* DESATADO: se graba la pulsación que ARMA la Q y no el mordisco que
       * sale solo después (js/habilidades.js, pulsar). Las grabadas antes de
       * esto no llevan la bandera y se recomponen al verlas (recomponer). */
      if (G.hab) ajustes.qArmada = true;

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
        aspectos: aspectos,
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

    /* CONTINUAR pagado (Game.pedirContinuar): se apunta en el tick en que
     * está parada la partida, y al verla revive en el mismo punto. */
    apuntaCont: function () {
      if (!this.grabando) return;
      this.grabando.entradas.push([this.t, 0, 8]);
      if (this.grabando.entradas.length > CFG.REPLAY_MAX_ENTRADAS) {
        this.grabando = null;
      }
    },

    /* Viendo una repetición: ¿lo siguiente es un CONTINUAR que ya toca? */
    contEnEspera: function () {
      var ent = this.rep && this.rep.entradas;
      if (this.modo !== 'ver' || !ent) return false;
      var e = ent[this.cursor];
      return !!(e && e[2] === 8 && e[0] <= this.t);
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
      if (this.modo === 'verRed') { this.t++; this.inyectarRed(); this.latido(); return; }
      if (this.red) { this.t++; return; }
      if (this.modo === 'ver') this.inyectar();
      var s = G.state;
      if (s === 'PLAYING' || s === 'DYING' || s === 'LEVEL_DONE') this.t++;
      this.latido();      // la línea de tiempo se mueve sola
    },

    inyectar: function () {
      var ent = this.rep && this.rep.entradas;
      if (!ent) return;
      var rc = this.recomp;
      this.enviando = true;
      while (this.cursor < ent.length && ent[this.cursor][0] <= this.t) {
        var i = this.cursor++, e = ent[i];
        if (e[2] === 8) {
          /* CONTINUAR: solo cuando hay alguien a quien revivir. Si todavía no
           * (la muerte no ha acabado), se espera sin gastar la entrada. */
          var hayFuera = false;
          for (var pf = 0; pf < G.pacs.length; pf++) {
            if (G.pacs[pf].out && !G.pacs[pf].bot) hayFuera = true;
          }
          if (!hayFuera) { this.cursor--; break; }
          G.revivir(-1);
          continue;
        }
        if (e[2] >= 4) {
          // habilidad: se relanza igual que la lanzó el jugador aquel día
          var ok = window.PM.Hab ? window.PM.Hab.pulsar(G, e[1], e[2] - 4) : true;
          if (rc) {
            if (e[2] === 4) rc.elegido[i] = 'normal';
            // en una grabación vieja todo poder apuntado SALIÓ: si aquí no sale,
            // la repetición ya se ha torcido
            if (!ok && rc.fallo < 0) rc.fallo = i;
          }
        } else {
          G.setPacDir(e[1], e[2]);
        }
      }
      this.enviando = false;
    },

    /* ---------- la Q armada de las grabaciones VIEJAS ----------
     * Hasta el 15 sep se grababa el MORDISCO de la Q armada (la que se pide
     * un poco antes de tiempo y muerde sola en cuanto hay alguien a tiro) en
     * vez de la pulsación que la armó. Ese mordisco ocurre dentro de
     * Hab.paso(), a mitad de un tick, y la repetición lo aplicaba al
     * principio del siguiente: un tick tarde, justo el que tarda el fantasma
     * en tocar a Pac-Man. Desde entonces se graba la pulsación (bandera
     * qArmada) y no hace falta nada de esto.
     *
     * Para las viejas no hay forma de saber, mirando solo el texto, qué Q fue
     * de teclado y cuál fue un reintento. Se deduce SIMULANDO: cada Q grabada
     * se prueba en el tick de antes, justo después de Hab.paso (donde muerde
     * el reintento), si ahí ya había alguien a tiro. Como todo poder grabado
     * salió de verdad, en cuanto uno no sale se sabe que una decisión de
     * antes estaba mal, y se le da la vuelta (recomponer). Lo que se decide
     * (rep.dq: índice -> 'temprano' | 'normal') se guarda con la repetición
     * para no volver a buscarlo. Game.step llama a trasHab(). */
    reintentoVale: function () {
      return this.modo === 'ver' && !!(this.rep && this.rep.ajustes && this.rep.ajustes.qArmada);
    },

    necesitaRecomponer: function (rep) {
      if (!rep || !esDesatado(rep.modo) || (rep.ajustes && rep.ajustes.qArmada)) return false;
      for (var i = 0; i < rep.entradas.length; i++) if (rep.entradas[i][2] === 4) return true;
      return false;
    },

    trasHab: function () {
      if (this.modo !== 'ver' || !this.rep) return;
      var rep = this.rep, rc = this.recomp;
      if (!rc && !rep.dq) return;
      var e = rep.entradas[this.cursor];
      if (!e || e[2] !== 4 || e[0] !== this.t) return;
      var H = window.PM.Hab;
      if (!H) return;
      var i = this.cursor;
      var d = rc ? rc.decision[i] : rep.dq[i];
      if (d === 'normal') return;
      if (!d || d === 'auto') {
        if (!(H.puede(G, e[1], 0) && H.presa(G, e[1]))) return;
      }
      this.cursor++;
      this.enviando = true;
      var ok = H.pulsar(G, e[1], 0);
      this.enviando = false;
      if (rc) {
        rc.elegido[i] = 'temprano';
        if (!ok && rc.fallo < 0) rc.fallo = i;
      }
    },

    /* Simula la repetición con unas decisiones, a trozos para no congelar la
     * pantalla. hecho({ fallo, elegido, cuadra }) */
    simularCon: function (rep, decision, hecho) {
      var self = this;
      var tope = Math.round((rep.final.tiempoMs || 0) * 60 / 1000) * 2 + 36000;
      this.recomp = { decision: decision, elegido: {}, fallo: -1 };
      G.simulandoFuera = true;
      this.montar(rep);
      var pasos = 0;
      function trozo() {
        var rc = self.recomp;
        if (!rc) return;                               // cancelada
        for (var n = 0; n < 3000; n++) {
          if (G.state === 'GAME_OVER' || G.state === 'MENU' || rc.fallo >= 0 || pasos > tope) break;
          G.step();
          pasos++;
        }
        if (G.state === 'GAME_OVER' || G.state === 'MENU' || rc.fallo >= 0 || pasos > tope) {
          var r = { fallo: rc.fallo, elegido: rc.elegido,
                    cuadra: rc.fallo < 0 && G.score === rep.final.puntos && G.state === 'GAME_OVER' };
          hecho(r);
          return;
        }
        if (self.recompProgreso) self.recompProgreso(Math.min(0.99, pasos / (tope / 2)));
        setTimeout(trozo, 0);
      }
      trozo();
    },

    /* Busca las decisiones que reconstruyen la partida. hecho(dq | null) */
    recomponer: function (rep, hecho) {
      var self = this;
      var decision = {}, intentos = 0, MAX = 160;
      var mejor = null;
      var sonido = window.PM.settings ? !!window.PM.settings.muted : false;
      if (window.AudioSys && AudioSys.setMuted) AudioSys.setMuted(true);
      function fin(dq) {
        self.recomp = null;
        G.simulandoFuera = false;
        if (window.AudioSys && AudioSys.setMuted) AudioSys.setMuted(sonido);
        if (G.inGame()) G.toMenu();
        self.modo = null;
        self.rep = null;
        self.mostrarBarra(false);
        hecho(dq);
      }
      function copia(o) { var x = {}; for (var k in o) if (o.hasOwnProperty(k)) x[k] = o[k]; return x; }
      function voltea(dec, elegido, q) {
        var x = copia(dec);
        x[q] = (elegido[q] === 'temprano') ? 'normal' : 'temprano';
        return x;
      }
      function aDq(dec, elegido) {
        var dq = {};
        for (var k in elegido) if (elegido.hasOwnProperty(k)) dq[k] = elegido[k];
        return dq;
      }
      /* Ante un fallo se prueba a dar la vuelta a las Q de antes, la más
       * cercana primero (hasta 25), y si ninguna sola lo arregla, parejas de
       * las 8 más cercanas. Se acepta el cambio que lleve el fallo más lejos. */
      function tras(r) {
        mejor = r;
        if (r.cuadra) { fin(aDq(decision, r.elegido)); return; }
        if (r.fallo < 0) { fin(null); return; }
        var qs = Object.keys(r.elegido).map(Number)
          .filter(function (i) { return i <= r.fallo; })
          .sort(function (a, b) { return b - a; });
        var pruebas = [];
        qs.slice(0, 25).forEach(function (q) { pruebas.push(voltea(decision, r.elegido, q)); });
        var cerca = qs.slice(0, 8);
        for (var a = 0; a < cerca.length; a++) {
          for (var b = a + 1; b < cerca.length; b++) {
            pruebas.push(voltea(voltea(decision, r.elegido, cerca[a]), r.elegido, cerca[b]));
          }
        }
        var p = 0;
        function siguiente() {
          if (!self.recompVivo) return;
          if (p >= pruebas.length || intentos >= MAX) { fin(null); return; }
          var prueba = pruebas[p++];
          intentos++;
          self.simularCon(rep, prueba, function (r2) {
            if (r2.cuadra || r2.fallo < 0 || r2.fallo > r.fallo) {
              decision = prueba;
              tras(r2);
            } else siguiente();
          });
        }
        siguiente();
      }
      this.recompVivo = true;
      this.simularCon(rep, decision, tras);
    },

    cancelarRecomponer: function () {
      this.recompVivo = false;
      if (this.recomp) {
        this.recomp = null;
        G.simulandoFuera = false;
        if (window.AudioSys && AudioSys.setMuted) {
          AudioSys.setMuted(!!(window.PM.settings && window.PM.settings.muted));
        }
        if (G.inGame()) G.toMenu();
        this.modo = null;
        this.rep = null;
        this.mostrarBarra(false);
      }
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
      var nombres = [], colores = [], skins = [], looks = [], i;
      for (i = 0; i < G.playerCount; i++) {
        nombres.push(G.rawName(i));
        colores.push(G.colorFor(i));
        skins.push(G.skinFor(i));
        // el accesorio y el efecto de cada uno: sin esto la repetición
        // sale con la skin buena pero sin las gafas ni la estela
        looks.push(G.lookFor(i));
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
        looks: looks,
        ghosts: G.vsGhosts ? G.vsGhosts.slice() : null,
        hab: !!G.hab,          // modo DESATADO: dientes, chispas y flash
        caza: !!G.caza,        // CACERÍA: el Pac-Man de la máquina y su reloj
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
        lk: rep.looks || null,
        gh: rep.ghosts || null, hb: !!rep.hab, cz: !!rep.caza,
        fe: rep.fecha, pm: rep.pm || null,
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
          skins: cab.sk || [], looks: cab.lk || null,
          ghosts: cab.gh || null, hab: !!cab.hb,
          caza: !!cab.cz, fecha: cab.fe || '',
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
          this.subirPendientes();   // a la nube, para que no se pierda al podar
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
        looks: rep.looks ? rep.looks.slice() : null,
        ghosts: rep.ghosts ? rep.ghosts.slice() : null,
        maze: rep.maze || null,
        hab: !!rep.hab,
        caza: !!rep.caza
      });
      if (rep.pm && rep.pm.hex && G.applyPelletHex) G.applyPelletHex(rep.pm.hex);
      this.prepararConAviso();
      return true;
    },

    verRedGuardada: function (id) {
      var reg = this.porIdRed(id);
      if (!reg) { this.avisoRoto(); return false; }
      this.origen = { tipo: 'red', id: id };
      this.rnActual = reg.rn || null;
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
      this.subirPendientes();     // a la nube, para que no se pierda al podar
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
     * VERLA COMO UN VÍDEO — preparar, saltar y rebobinar
     *
     * Una repetición no guarda dónde estaba cada uno: guarda los giros (o,
     * en las de red, las instantáneas) y la partida se vuelve a montar sobre
     * la marcha. Ir hacia delante es barato —se sigue— pero ir HACIA ATRÁS
     * obligaría a rehacerla entera cada vez, y arrastrar una barra serían
     * tirones de un segundo.
     *
     * Así que al abrirla se juega una vez a toda velocidad, sin pintar y sin
     * sonido, dejando una FOTO de la partida (Game.foto) cada pocos segundos.
     * Con eso se sabe además cuánto dura, que es lo que la barra necesita
     * para tener un final. A partir de ahí, saltar a cualquier momento es
     * restaurar la foto de antes y simular lo que falte: nunca más de
     * CFG.REPLAY_FOTO_CADA pasos, que se hacen en un suspiro.
     *
     * Vale para las dos clases de repetición sin distinguirlas: las de
     * teclas vuelven a simularse y las de red vuelven a aplicarse, pero las
     * dos avanzan con Game.step() y las dos se fotografían igual.
     * ========================================================= */
    fotos: [],           // [{ t, cursor, cursorEv, foto, mini }]
    momentos: [],        // [{ t, tipo: 'nivel'|'muerte'|'cadena', label }]
    tTotal: 0,           // último tick de la repetición (se sabe al prepararla)
    prep: null,          // preparación en marcha (para poder cancelarla)

    /* Deja la repetición lista para verse como un vídeo. hecho(ok)
     *
     * El primer trozo va DIFERIDO, no de corrido: así montar una repetición
     * sigue dejando el juego exactamente donde lo dejaba antes (en su primer
     * tick, sin nada simulado por delante) y quien solo quiera reproducirla
     * a pelo —las pruebas, sin ir más lejos— no se encuentra media partida ya
     * jugada al volver de aquí. Los pocos milisegundos que tarda en arrancar
     * no los ve nadie. */
    preparar: function (hecho) {
      var self = this;
      if (this.modo !== 'ver' && this.modo !== 'verRed') { hecho(false); return; }
      this.fotos = [];
      this.tTotal = 0;
      this.momentos = [];
      this.det = null;
      var tarea = { vivo: true };
      this.prep = tarea;
      var pasos = 0, avisado = 0, arrancada = false;

      function acabar(ok) {
        self.prep = null;
        if (arrancada) {
          G.simulandoFuera = false;
          self.mudo(false);
        }
        hecho(ok);
      }

      function trozo() {
        if (!tarea.vivo) { acabar(false); return; }
        if (!arrancada) {
          arrancada = true;
          self.mudo(true);
          G.simulandoFuera = true;      // el bucle del juego no mete pasos
          self.detectaMomento();        // el nivel en que empieza
          self.guardaFoto();            // el momento cero, para poder volver
          if (self.prepProgreso) self.prepProgreso();
        }
        var hasta = Date.now() + CFG.REPLAY_PREP_MS;
        while (pasos < CFG.REPLAY_PREP_MAX) {
          G.step();
          pasos++;
          self.detectaMomento();
          if (self.acabada()) break;
          if (self.t - self.ultimaFoto() >= CFG.REPLAY_FOTO_CADA) self.guardaFoto();
          if ((pasos & 511) === 0 && Date.now() >= hasta) break;
        }
        if (self.acabada() || pasos >= CFG.REPLAY_PREP_MAX) {
          self.tTotal = self.t;
          self.irA(0);                  // y a verla desde el principio
          acabar(true);
          return;
        }
        /* El aviso se reescribe como mucho seis veces por segundo: a cada
         * trozo (12 ms) serían ochenta reconstrucciones del diálogo por
         * segundo, y eso sí que frena la preparación. */
        var ahora = Date.now();
        if (self.prepProgreso && ahora - avisado > 150) {
          avisado = ahora;
          self.prepProgreso();
        }
        self.luego(trozo);
      }
      this.luego(trozo);
    },

    /* Cómo se encadena el siguiente trozo. Es un método para que las pruebas
     * puedan prepararla de un tirón (`function (fn) { fn(); }`), que allí no
     * hay reloj que dispare nada. */
    luego: function (fn) { setTimeout(fn, 0); },

    cancelarPreparar: function () {
      if (this.prep) this.prep.vivo = false;
    },

    /* ¿La repetición ha llegado a su final? */
    acabada: function () {
      if (this.modo === 'verRed') return !!this.redFin;
      return G.state === 'GAME_OVER' || G.state === 'MENU';
    },

    ultimaFoto: function () {
      return this.fotos.length ? this.fotos[this.fotos.length - 1].t : -999999;
    },

    guardaFoto: function () {
      this.fotos.push({ t: this.t, cursor: this.cursor, cursorEv: this.cursorEv,
                        redFin: !!this.redFin, foto: G.foto(),
                        mini: this.guardaMiniatura() });
    },

    /* La foto más cercana por debajo (o igual) de ese tick */
    fotoPara: function (t) {
      var mejor = null;
      for (var i = 0; i < this.fotos.length; i++) {
        if (this.fotos[i].t <= t) mejor = this.fotos[i];
        else break;
      }
      return mejor || this.fotos[0] || null;
    },

    /* Saltar a un momento cualquiera. Es lo que usan la barra, los botones de
     * ±10 s y REINICIAR. */
    irA: function (destino) {
      if (this.modo !== 'ver' && this.modo !== 'verRed') return;
      if (!this.fotos.length) return;
      destino = Math.round(destino);
      if (destino < 0) destino = 0;
      if (this.tTotal && destino > this.tTotal) destino = this.tTotal;
      var f = this.fotoPara(destino);
      if (!f) return;
      var fuera = G.simulandoFuera, mudoYa = !!this.enMudo;
      G.simulandoFuera = true;
      if (!mudoYa) this.mudo(true);
      G.ponerFoto(f.foto);
      this.t = f.t;
      this.cursor = f.cursor;
      this.cursorEv = f.cursorEv;
      this.redFin = f.redFin;
      var tope = CFG.REPLAY_FOTO_CADA * 4;       // red de seguridad
      while (this.t < destino && tope-- > 0 && !this.acabada()) G.step();
      G.simulandoFuera = fuera;
      if (!mudoYa) this.mudo(false);
      /* Los bucles de sonido venían del momento del que se ha saltado: se
       * cortan y el juego los vuelve a encender solo si tocan. */
      G.stopAllLoops();
      G.syncUI();
      this.pintaBarra();
    },

    salta: function (ticks) { this.irA(this.t + ticks); },

    /* Silenciar mientras se salta o se prepara: se están jugando minutos en
     * un segundo y sonaría a ametralladora. Al soltar se deja como lo tenga
     * puesto quien mira. */
    mudo: function (on) {
      if (!window.AudioSys || !AudioSys.setMuted) return;
      this.enMudo = !!on;
      var s = window.PM.settings;
      AudioSys.setMuted(on ? true : !!(s && s.muted));
    },

    /* Preparar con su aviso en pantalla, que es lo que ve quien abre una
     * repetición: unos segundos con un contador y un CANCELAR. */
    prepararConAviso: function () {
      var self = this, UI = window.PM.UI;
      this.avisoPreparando();
      this.prepProgreso = function () { self.avisoPreparando(); };
      this.preparar(function (ok) {
        self.prepProgreso = null;
        if (UI && UI.hidePrompt) UI.hidePrompt();
        if (!ok) { self.salir(); return; }      // la han cancelado
        if (self.tInicial > 0) { self.irA(self.tInicial * 60); self.tInicial = 0; }
        self.mostrarBarra(true);
        G.syncUI();
      });
    },

    avisoPreparando: function () {
      var self = this, UI = window.PM.UI;
      if (!UI || !UI.showPrompt) return;
      UI.showPrompt({
        title: 'PREPARANDO LA REPETICIÓN',
        color: '#7ec8ff',
        lines: [
          'SE ESTÁ REHACIENDO LA PARTIDA PARA PODER ADELANTARLA Y REBOBINARLA COMO UN VÍDEO.',
          { text: self.reloj(self.t), big: true }
        ],
        buttons: [
          { label: 'CANCELAR', hint: 'ESC', keys: ['Escape'],
            onClick: function () { self.cancelarPreparar(); } }
        ]
      });
    },

    /* Ticks -> m:ss. El reloj de la repetición no corre durante el '¡LISTO!',
     * así que esto es el tiempo de VÍDEO, que es justo lo que hace falta para
     * una barra: lo que se tarda en verla. */
    reloj: function (t) {
      var s = Math.floor(Math.max(0, t) / 60);
      var m = Math.floor(s / 60);
      s = s % 60;
      return m + ':' + (s < 10 ? '0' : '') + s;
    },


    /* =========================================================
     * REPRODUCCIÓN
     * ========================================================= */
    /* reg: el registro guardado de donde sale (para apuntarle lo recompuesto) */
    ver: function (rep, reg) {
      if (!this.valida(rep)) return false;
      var self = this, UI = window.PM.UI;
      /* grabada antes del arreglo de la Q armada: primero se recompone */
      if (!rep.dq && reg && reg.dq) rep.dq = reg.dq;
      if (!rep.dq && this.necesitaRecomponer(rep)) {
        if (G.inGame()) G.toMenu();
        this.avisoRecomponer(0);
        this.recompProgreso = function (x) { self.avisoRecomponer(x); };
        this.recomponer(rep, function (dq) {
          self.recompProgreso = null;
          if (UI) UI.hidePrompt();
          rep.dq = dq || {};                   // sin arreglo, se ve tal cual
          if (dq && reg) self.apuntarDq(reg.id, dq);
          self.ver(rep, reg);
        });
        return true;
      }
      this.montar(rep);
      this.prepararConAviso();
      return true;
    },

    /* Pone el juego a reproducir la repetición (sin recomponer nada).
     *
     * `extra` es lo que la repetición NO lleva dentro y aun así cambia la
     * simulación. Hoy solo el laberinto alternativo (modo LABERINTOS): el
     * formato no tiene hueco para él, así que quien monta la repetición lo
     * pasa por aquí si lo sabe. Lo usa js/guardado.js al retomar una partida
     * a medias, que sí se lo apunta. */
    montar: function (rep, extra) {
      var UI = window.PM.UI;
      if (G.inGame()) G.toMenu();      // lo que hubiera se cierra y se guarda
      this.modo = 'ver';
      this.rep = rep;
      this.montaje = extra || null;
      this.cursor = 0;
      this.t = 0;
      if (UI) {
        if (UI.resumeAudio) UI.resumeAudio();
        UI.hideAll();
      }
      /* El aspecto de quien la jugó entra por la misma puerta que en una
       * partida online (los colores, las skins y lo puesto de la TIENDA
       * viajan en el saludo), así que no hay que tocar nada del pintado. Una
       * repetición de antes no lo trae y se pinta como se pintaba. */
      var look = repartoAspectos(rep);
      G.newGame({
        players: rep.jugadores,
        cfg: this.cfgDe(rep),
        names: rep.nombres.slice(),
        colors: look ? look.colors : null,
        skins: look ? look.skins : null,
        looks: look ? look.looks : null,
        // sin esto las habilidades grabadas no tendrían dónde aplicarse
        hab: esDesatado(rep.modo),
        // ni los giros del que llevaba fantasma, a quién moverle
        ghosts: (rep.ajustes && rep.ajustes.ghosts)
          ? rep.ajustes.ghosts.slice() : null,
        maze: (extra && extra.maze) ||
          ((rep.ajustes && rep.ajustes.maze) || null)
      });
    },

    /* ---------- Retomar una partida a medias (js/guardado.js) ----------
     * La repetición se ha reproducido a toda velocidad hasta donde se dejó
     * la partida y ahora hay que devolver el mando: lo que era 'ver' pasa a
     * ser 'grabar' con las entradas que ya tenía, y el juego deja de ser una
     * repetición para volver a ser una partida de verdad.
     *
     * Ojo con las tres banderas de "ya enviado": al montar la repetición se
     * pusieron a true para que mirar una partida vieja no diera experiencia
     * ni récord (alEmpezar). Aquí se vuelven atrás, porque esto sí es una
     * partida que cuenta, y lo que cuente se cobrará UNA vez cuando acabe
     * de verdad (Game.closeRun). */
    retomarMando: function () {
      if (this.modo !== 'ver' || !this.rep) return false;
      var rep = this.rep;
      rep.final = null;                  // se rellena cuando termine
      this.modo = 'grabar';
      this.grabando = rep;
      this.rep = null;
      this.montaje = null;
      this.cursor = 0;
      this.recomp = null;
      this.mostrarBarra(false);
      G.timeScale = 1;
      G.replaying = false;
      G.xpSent = false;
      G.rankingSent = false;
      G.timeSent = false;
      G.openShowcase();     // vuelve a ser una partida en vivo: que puedan mirarla
      return true;
    },

    avisoRecomponer: function (x) {
      var self = this, UI = window.PM.UI;
      if (!UI || !UI.showPrompt) return;
      UI.showPrompt({
        title: 'PREPARANDO LA REPETICIÓN',
        color: '#7ec8ff',
        lines: [
          'ESTA PARTIDA SE GRABÓ ANTES DE UN ARREGLO DE LA Q ARMADA.',
          'SE ESTÁ RECOMPONIENDO PARA QUE SE VEA TAL CUAL LA JUGASTE. SOLO PASA LA PRIMERA VEZ.',
          { text: Math.round((x || 0) * 100) + ' %', big: true }
        ],
        buttons: [
          { label: 'CANCELAR', hint: 'ESC', keys: ['Escape'],
            onClick: function () { self.cancelarRecomponer(); UI.hidePrompt(); } }
        ]
      });
    },

    /* Guarda en el registro lo recompuesto, para no volver a buscarlo */
    apuntarDq: function (id, dq) {
      var lista = this.guardadas();
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id) { lista[i].dq = dq; this.escribir(lista); return; }
      }
    },

    verTexto: function (texto, reg) {
      var rep = this.leer(texto);
      if (!rep) { this.avisoRoto(); return false; }
      return this.ver(rep, reg);
    },

    verGuardada: function (id) {
      var reg = this.porId(id);
      if (!reg) { this.avisoRoto(); return false; }
      this.origen = { tipo: 'local', id: id };
      this.rnActual = reg.rn || null;
      return this.verTexto(reg.s, reg);
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
      /* &t=<segundos>: el enlace de "compartir desde este segundo" */
      var mt = /[?&]t=(\d{1,6})/.exec(busca);
      this.tInicial = mt ? parseInt(mt[1], 10) : 0;
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
      /* Con las fotos delante, volver al principio es un salto mas: ni se
       * vuelve a montar la partida ni se vuelve a preparar nada. */
      if (this.fotos.length) { this.irA(0); return; }
      // la de red se vuelve a montar entera: su reloj y sus cursores van
      // con la reproducción, no con la partida
      if (this.modo === 'verRed') { this.verRed(rep); return; }
      if (this.modo !== 'ver') return;
      if (G.lastOpts) G.restartGame();     // pasa por newGame -> alEmpezar
      else this.montar(rep, this.montaje);
    },

    /* yaEnMenu: la partida ya se cerró por su cuenta (SALIR del menú de
     * pausa, por ejemplo) y aquí solo hay que recoger. */
    salir: function (yaEnMenu) {
      var estaba = (this.modo === 'ver' || this.modo === 'verRed');
      this.modo = null;
      this.rep = null;
      this.montaje = null;
      this.grabando = null;
      this.red = null;
      this.cancelarPreparar();
      this.fotos = [];        // un megabyte largo: no se queda ahi colgado
      this.momentos = [];
      this.origen = null;
      this.rnActual = null;
      this.tTotal = 0;
      this.cursor = 0;
      this.cursorEv = 0;
      this.t = 0;
      G.replaying = false;
      G.timeScale = 1;
      this.mostrarBarra(false);
      if (!estaba) return;
      /* El nombre y el aspecto eran los de quien la jugó, no los de quien
       * mira: si se quedaran puestos, la siguiente partida de aquí saldría
       * con la skin y el color de otro. */
      G.netNames = null;
      G.netColors = null;
      G.netSkins = null;
      G.netLooks = null;
      if (!yaEnMenu && G.inGame()) G.toMenu();
    },

    /* Velocidad de reproducción. Solo se aceptan las de la lista: el bucle
     * del juego multiplica su acumulador por esto, así que un número
     * cualquiera saldría del mismo paso fijo de 1/60 s pero con un reparto
     * raro de pasos por fotograma. */
    velocidad: function (x) {
      var lista = CFG.REPLAY_VELOCIDADES;
      G.timeScale = (lista.indexOf(x) !== -1) ? x : 1;
      this.pintaBarra();
    },

    /* La siguiente de la lista, dando la vuelta al llegar al final */
    otraVelocidad: function () {
      var lista = CFG.REPLAY_VELOCIDADES;
      var i = lista.indexOf(G.timeScale || 1);
      this.velocidad(lista[(i + 1) % lista.length]);
      if (window.PM.UI && window.PM.UI.promptOpen && window.PM.UI.syncPrompt) {
        window.PM.UI.syncPrompt();
      }
    },

    pausar: function (on) {
      if (!G.canPause()) return;
      G.setPaused(arguments.length ? !!on : !G.paused);
      this.pintaBarra();
    },

    /* =========================================================
     * EL REPRODUCTOR — como el de cualquier vídeo
     *
     * Se eligió la propuesta A de <https://claude.ai/artifact/Fb5NwxBBeyFgwRak3GuDRv>:
     * la partida a pantalla completa y, por encima, lo de un reproductor de
     * vídeo de toda la vida:
     *   - arriba, el título (el nombre si está DESTACADA), quién, puntos y
     *     fecha, y la X para salir;
     *   - abajo, la barra con las MARCAS de lo que pasó (rojo muerte, amarillo
     *     nivel, cian cadena de fantasmas) y, al pasar por ella, la VISTA
     *     PREVIA de ese momento con su nombre;
     *   - los mandos: pausa, ±10 s, tiempo, el MOMENTO en que se está (lleva
     *     al siguiente), velocidad, compartir desde este segundo y pantalla
     *     completa;
     *   - pausar y saltar dan su aviso grande, y con la partida en marcha
     *     todo se esconde a los dos segundos sin mover el ratón.
     * Los estilos están en css/style.css (#repVideo).
     * ========================================================= */
    mostrarBarra: function (on) {
      if (!on) {
        if (this.barra) this.barra.style.display = 'none';
        return;
      }
      if (!this.barra) this.construirBarra();
      if (!this.barra) return;
      this.barra.style.display = '';
      this.marcarMomentos();
      this.despierta();
      this.pintaBarra();
    },

    construirBarra: function () {
      if (typeof document === 'undefined' || !document.body) return;
      var self = this;
      function el(tag, cls, txt) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
      }
      function boton(cls, txt, titulo, fn) {
        var b = el('button', cls, txt);
        b.type = 'button';
        b.title = titulo || '';
        b.setAttribute('aria-label', titulo || txt);
        b.addEventListener('click', function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          fn();
          self.despierta();
        });
        return b;
      }
      var raiz = el('div', 'rv');
      raiz.id = 'repVideo';
      raiz.style.display = 'none';

      /* ---- arriba ---- */
      var arriba = el('div', 'rv-arriba');
      this.rvTitulo = el('div', 'rv-titulo', 'REPETICIÓN');
      this.rvSub = el('div', 'rv-sub', '');
      var textos = el('div', 'rv-textos');
      textos.appendChild(this.rvTitulo);
      textos.appendChild(this.rvSub);
      arriba.appendChild(textos);
      this.rvDestacada = el('span', 'rv-destacada', '★ DESTACADA');
      arriba.appendChild(this.rvDestacada);
      arriba.appendChild(boton('rv-ib rv-cerrar', '✕', 'SALIR · Q', function () { self.salir(); }));
      raiz.appendChild(arriba);

      /* ---- avisos del centro ---- */
      this.rvGrande = el('div', 'rv-grande', '▶');
      raiz.appendChild(this.rvGrande);
      this.rvSaltoI = el('div', 'rv-salto izq', '« ' + Math.round(CFG.REPLAY_SALTO / 60) + ' S');
      this.rvSaltoD = el('div', 'rv-salto der', Math.round(CFG.REPLAY_SALTO / 60) + ' S »');
      raiz.appendChild(this.rvSaltoI);
      raiz.appendChild(this.rvSaltoD);

      /* ---- abajo ---- */
      var abajo = el('div', 'rv-abajo');
      var pista = el('div', 'rv-pista');
      pista.id = 'replayPista';
      pista.appendChild(el('div', 'rv-riel'));
      this.rvSombra = el('div', 'rv-sombra');
      pista.appendChild(this.rvSombra);
      this.relleno = el('div', 'rv-relleno');
      pista.appendChild(this.relleno);
      this.rvMarcas = el('div', 'rv-marcas');
      pista.appendChild(this.rvMarcas);
      this.tirador = el('div', 'rv-tirador');
      pista.appendChild(this.tirador);
      this.rvPrevia = el('div', 'rv-previa');
      this.rvPreviaCv = document.createElement('canvas');
      this.rvPreviaCv.width = CFG.REPLAY_MINI_W;
      this.rvPreviaCv.height = CFG.REPLAY_MINI_H;
      this.rvPrevia.appendChild(this.rvPreviaCv);
      this.rvPreviaTxt = el('div', 'rv-previa-txt', '');
      this.rvPrevia.appendChild(this.rvPreviaTxt);
      pista.appendChild(this.rvPrevia);
      abajo.appendChild(pista);

      var mandos = el('div', 'rv-mandos');
      this.btnPausa = boton('rv-ib', '❚❚', 'PAUSA · ESPACIO', function () { self.pausar(); self.avisoGrande(G.paused ? '❚❚' : '▶'); });
      mandos.appendChild(this.btnPausa);
      mandos.appendChild(boton('rv-ib', '↺', 'ATRÁS ' + Math.round(CFG.REPLAY_SALTO / 60) + ' S · ←',
        function () { self.salta(-CFG.REPLAY_SALTO); self.avisoSalto(-1); }));
      mandos.appendChild(boton('rv-ib', '↻', 'ADELANTE ' + Math.round(CFG.REPLAY_SALTO / 60) + ' S · →',
        function () { self.salta(CFG.REPLAY_SALTO); self.avisoSalto(1); }));
      this.tAhora = el('span', 'rv-tiempo', '0:00');
      this.tTotalTxt = el('span', 'rv-total', '/ 0:00');
      var reloj = el('span', 'rv-reloj');
      reloj.appendChild(this.tAhora);
      reloj.appendChild(this.tTotalTxt);
      mandos.appendChild(reloj);
      this.rvMomento = boton('rv-momento', '', 'IR AL SIGUIENTE MOMENTO', function () { self.siguienteMomento(); });
      mandos.appendChild(this.rvMomento);
      mandos.appendChild(el('span', 'rv-hueco'));
      this.btnVel = boton('rv-vel', '1×', 'VELOCIDAD · X', function () { self.otraVelocidad(); });
      mandos.appendChild(this.btnVel);
      mandos.appendChild(boton('rv-ib', '⤴', 'COMPARTIR DESDE ESTE SEGUNDO', function () { self.compartirAqui(); }));
      mandos.appendChild(boton('rv-ib', '⛶', 'PANTALLA COMPLETA · F', function () { self.pantallaCompleta(); }));
      abajo.appendChild(mandos);
      raiz.appendChild(abajo);

      /* moverse despierta los mandos; quedarse quieto los esconde */
      var despertar = function () { if (raiz.style.display !== 'none') self.despierta(); };
      document.addEventListener('mousemove', despertar);
      /* pulsar la partida la pausa, como en un vídeo */
      var lienzo = document.getElementById('game');
      if (lienzo) {
        lienzo.addEventListener('click', function () {
          if (raiz.style.display === 'none' || !self.fotos.length) return;
          self.pausar();
          self.avisoGrande(G.paused ? '❚❚' : '▶');
          self.despierta();
        });
      }
      document.addEventListener('touchstart', despertar);

      this.pista = pista;
      this.activarArrastre(pista);
      this.activarPrevia(pista);
      document.body.appendChild(raiz);
      this.barra = raiz;
    },

    /* Mandos a la vista; se esconden a los CFG.REPLAY_OCULTAR_MS si la
     * partida va y nadie toca nada. En pausa se quedan. */
    despierta: function () {
      if (!this.barra) return;
      this.rvUltimoToque = Date.now();
      this.barra.classList.remove('dormido');
    },

    vigilaDormir: function () {
      if (!this.barra || this.barra.style.display === 'none') return;
      var arrastra = this.pista && this.pista.classList.contains('arrastra');
      var dormir = !G.paused && !arrastra &&
        Date.now() - (this.rvUltimoToque || 0) > CFG.REPLAY_OCULTAR_MS;
      this.barra.classList.toggle('dormido', dormir);
    },

    avisoGrande: function (txt) {
      var g = this.rvGrande;
      if (!g) return;
      g.textContent = txt;
      g.classList.remove('pulso');
      void g.offsetWidth;          // reinicia la animación
      g.classList.add('pulso');
    },

    avisoSalto: function (lado) {
      var e = lado < 0 ? this.rvSaltoI : this.rvSaltoD;
      if (!e) return;
      e.classList.add('ver');
      clearTimeout(e._t);
      e._t = setTimeout(function () { e.classList.remove('ver'); }, 550);
    },

    pantallaCompleta: function () {
      var d = document;
      try {
        if (d.fullscreenElement) d.exitFullscreen();
        else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen();
      } catch (e) { /* sin pantalla completa */ }
    },

    /* Arrastrar la línea de tiempo. Mientras se arrastra se salta de verdad
     * —que para eso están las fotos— pero como mucho cada 80 ms: cada salto
     * cuesta unos cientos de pasos de simulación y a sesenta por segundo se
     * notaría. Al soltar se va exactamente a donde se dejó el dedo. */
    activarArrastre: function (pista) {
      var self = this;
      var arrastrando = false, ultimo = 0, pendiente = -1;

      function tickDe(ev) {
        var r = pista.getBoundingClientRect ? pista.getBoundingClientRect() : null;
        if (!r || !r.width) return 0;
        var x = (ev.clientX === undefined && ev.touches) ? ev.touches[0].clientX
                                                         : ev.clientX;
        var p = (x - r.left) / r.width;
        if (p < 0) p = 0;
        if (p > 1) p = 1;
        return Math.round(p * (self.tTotal || 0));
      }

      function empieza(ev) {
        if (!self.fotos.length) return;
        arrastrando = true;
        pista.classList.add('arrastra');
        pendiente = tickDe(ev);
        ultimo = 0;
        mueve(ev);
        if (pista.setPointerCapture && ev.pointerId !== undefined) {
          try { pista.setPointerCapture(ev.pointerId); } catch (e) { /* da igual */ }
        }
        if (ev.preventDefault) ev.preventDefault();
      }

      function mueve(ev) {
        if (!arrastrando) return;
        pendiente = tickDe(ev);
        var ahora = Date.now();
        if (ahora - ultimo < 80) { self.pintaBarra(pendiente); return; }
        ultimo = ahora;
        self.irA(pendiente);
        pendiente = -1;
      }

      function suelta(ev) {
        if (!arrastrando) return;
        arrastrando = false;
        pista.classList.remove('arrastra');
        if (pendiente >= 0) self.irA(pendiente);
        pendiente = -1;
        if (ev && ev.preventDefault) ev.preventDefault();
      }

      if (typeof window !== 'undefined' && window.PointerEvent) {
        pista.addEventListener('pointerdown', empieza);
        pista.addEventListener('pointermove', mueve);
        pista.addEventListener('pointerup', suelta);
        pista.addEventListener('pointercancel', suelta);
      } else {
        pista.addEventListener('mousedown', empieza);
        document.addEventListener('mousemove', mueve);
        document.addEventListener('mouseup', suelta);
        pista.addEventListener('touchstart', empieza);
        pista.addEventListener('touchmove', mueve);
        pista.addEventListener('touchend', suelta);
      }
    },

    /* ---------- los MOMENTOS ----------
     * Se apuntan al preparar la repetición (detectaMomento, a cada paso):
     * cada nivel, cada muerte y cada cadena de dos o más fantasmas (de una
     * misma cadena se queda la más larga). Son las marcas de la barra, el
     * nombre de la vista previa y el botón del momento. */
    detectaMomento: function () {
      var d = this.det;
      if (!d) {
        d = this.det = { nivel: G.level, muertos: [], cadena: 0 };
        this.momentos.push({ t: this.t, tipo: 'nivel', label: 'NIVEL ' + G.level });
      }
      if (G.level > d.nivel) {
        this.momentos.push({ t: this.t, tipo: 'nivel', label: 'NIVEL ' + G.level });
      }
      d.nivel = G.level;
      for (var i = 0; i < G.pacs.length; i++) {
        var p = G.pacs[i];
        var muere = !!(p && p.dying);
        if (muere && !d.muertos[i]) {
          this.momentos.push({ t: this.t, tipo: 'muerte',
            label: G.playerCount > 1 ? ('MUERTE · ' + G.nameFor(i)) : 'MUERTE' });
        }
        d.muertos[i] = muere;
      }
      var c = G.chainIndex || 0;
      if (c >= 2 && c > d.cadena) {
        var ult = this.momentos[this.momentos.length - 1];
        var etiqueta = 'CADENA ×' + c;
        if (ult && ult.tipo === 'cadena' && this.t - ult.t < 8 * 60) ult.label = etiqueta;
        else this.momentos.push({ t: this.t, tipo: 'cadena', label: etiqueta });
      }
      d.cadena = c;
    },

    /* El momento en que se está: el último que ya pasó */
    momentoEn: function (t) {
      var m = null;
      for (var i = 0; i < this.momentos.length; i++) {
        if (this.momentos[i].t <= t) m = this.momentos[i];
        else break;
      }
      return m;
    },

    siguienteMomento: function () {
      for (var i = 0; i < this.momentos.length; i++) {
        /* un segundo antes, para verlo venir */
        if (this.momentos[i].t > this.t + 90) { this.irA(this.momentos[i].t - 60); return; }
      }
    },

    marcarMomentos: function () {
      var cont = this.rvMarcas;
      if (!cont) return;
      cont.innerHTML = '';
      var total = this.tTotal || 0;
      if (!total) return;
      for (var i = 0; i < this.momentos.length; i++) {
        var m = this.momentos[i];
        if (m.t <= 0) continue;
        var mk = document.createElement('i');
        mk.className = 'rv-marca ' + m.tipo;
        mk.style.left = (m.t / total * 100) + '%';
        cont.appendChild(mk);
      }
    },

    /* ---------- la vista previa ----------
     * Al preparar se guarda una MINIATURA con cada foto (cada 10 s): pintar
     * la partida entera para cada punto de la barra costaría una simulación
     * por movimiento del ratón. Aquí se enseña la de antes de ese momento. */
    guardaMiniatura: function () {
      if (typeof document === 'undefined' || !G.canvas || !G.render) return null;
      try {
        var cv = document.createElement('canvas');
        cv.width = CFG.REPLAY_MINI_W;
        cv.height = CFG.REPLAY_MINI_H;
        G.render();
        var c = cv.getContext('2d');
        c.imageSmoothingEnabled = false;
        c.fillStyle = '#000';
        c.fillRect(0, 0, cv.width, cv.height);
        var k = Math.min(cv.width / G.canvas.width, cv.height / G.canvas.height);
        var w = G.canvas.width * k, h = G.canvas.height * k;
        c.drawImage(G.canvas, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
        return cv;
      } catch (e) { return null; }
    },

    activarPrevia: function (pista) {
      var self = this;
      function mueve(ev) {
        if (!self.tTotal || !pista.getBoundingClientRect) return;
        var r = pista.getBoundingClientRect();
        if (!r.width) return;
        var p = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
        var t = Math.round(p * self.tTotal);
        var x = Math.max(90, Math.min(r.width - 90, ev.clientX - r.left));
        self.rvPrevia.style.left = x + 'px';
        self.rvSombra.style.width = (p * 100) + '%';
        var f = self.fotoPara(t);
        var c = self.rvPreviaCv.getContext('2d');
        c.fillStyle = '#000';
        c.fillRect(0, 0, self.rvPreviaCv.width, self.rvPreviaCv.height);
        if (f && f.mini) c.drawImage(f.mini, 0, 0);
        var m = self.momentoEn(t);
        self.rvPreviaTxt.textContent = self.reloj(t) + (m ? ' · ' + m.label : '');
        pista.classList.add('encima');
      }
      pista.addEventListener('mousemove', mueve);
      pista.addEventListener('pointermove', mueve);
      pista.addEventListener('mouseleave', function () {
        pista.classList.remove('encima');
        self.rvSombra.style.width = '0';
      });
    },

    /* ---------- compartir desde aquí ----------
     * El enlace de siempre (?rn=) con el segundo: al abrirlo, la repetición
     * empieza ahí. Si aún no está en la nube, se sube primero. */
    compartirAqui: function () {
      var self = this, UI = window.PM.UI;
      var seg = Math.floor(this.t / 60);
      if (G.paused === false && G.canPause()) G.setPaused(true);
      function listo(err, codigo) {
        if (err || !codigo) { if (UI && UI.showShareError) UI.showShareError(err || 'NO SE PUDO COMPARTIR'); return; }
        self.rnActual = codigo;
        var url = self.enlaceRed(codigo) + (seg > 0 ? '&t=' + seg : '');
        if (UI && UI.showSharePrompt) UI.showSharePrompt(url, true);
      }
      if (this.rnActual) { listo(null, this.rnActual); return; }
      var o = this.origen;
      if (!o) { listo('ESTA REPETICIÓN NO SE PUEDE COMPARTIR', null); return; }
      if (UI && UI.showPrompt) {
        UI.showPrompt({ title: 'COMPARTIR REPETICIÓN', color: '#7ec8ff',
          lines: ['PREPARANDO EL ENLACE...'], buttons: [] });
      }
      var reg = (o.tipo === 'red') ? this.porIdRed(o.id) : this.porId(o.id);
      this.subirReg(reg, o.tipo, listo);
    },

    /* `donde` (opcional) pinta la barra en otro punto sin haber saltado
     * todavía: es lo que se ve mientras se arrastra entre salto y salto. */
    pintaBarra: function (donde) {
      if (!this.barra || !this.rep) return;
      var r = this.rep;
      var quien = (r.nombres || []).join(' + ') || 'ANÓNIMO';
      var f = new Date(Date.parse(r.fecha) || 0);
      function dd(n) { return (n < 10 ? '0' : '') + n; }
      var puntos = (r.final && r.final.puntos) || (r.final === undefined ? 0 : 0);
      var nube = null;
      if (this.rnActual && this.indiceNube) {
        var idx = this.indiceNube();
        for (var i = 0; i < idx.length; i++) if (idx[i].rn === this.rnActual) nube = idx[i];
      }
      this.rvTitulo.textContent = (nube && nube.d && nube.ti) ? nube.ti : 'REPETICIÓN';
      this.rvSub.textContent = quien + (puntos ? ' · ' + puntos + ' PUNTOS' : '') +
        (r.fecha ? ' · ' + dd(f.getDate()) + '/' + dd(f.getMonth() + 1) + '/' + f.getFullYear() : '');
      this.rvDestacada.style.display = (nube && nube.d) ? '' : 'none';
      if (this.btnPausa) {
        this.btnPausa.textContent = G.paused ? '▶' : '❚❚';
        this.btnPausa.title = G.paused ? 'SEGUIR · ESPACIO' : 'PAUSA · ESPACIO';
      }
      var v = G.timeScale || 1;
      if (this.btnVel) this.btnVel.textContent = (v === 0.5 ? '½' : v) + '×';
      var t = (donde >= 0 && donde !== undefined) ? donde : this.t;
      var total = this.tTotal || 0;
      var pct = total ? Math.max(0, Math.min(1, t / total)) : 0;
      if (this.relleno) this.relleno.style.width = (pct * 100) + '%';
      if (this.tirador) this.tirador.style.left = (pct * 100) + '%';
      if (this.tAhora) this.tAhora.textContent = this.reloj(t);
      if (this.tTotalTxt) this.tTotalTxt.textContent = ' / ' + this.reloj(total);
      if (this.rvMomento) {
        var m = this.momentoEn(t);
        this.rvMomento.textContent = m ? (m.label + ' ›') : '';
        this.rvMomento.style.display = m ? '' : 'none';
      }
      this.vigilaDormir();
    },

    /* La barra se repinta sola con el reloj de la repetición: sin esto, el
     * tirador solo se movería al tocar un botón. Lo llama Replay.paso(). */
    latido: function () {
      if (!this.barra || this.barra.style.display === 'none') return;
      if ((this.t & 7) !== 0) return;      // ~8 veces por segundo, de sobra
      this.pintaBarra();
    },

    /* Teclas de vídeo mientras se ve una repetición. Devuelve true si la
     * tecla era suya (ui.js no la pasa al juego). */
    teclaVideo: function (ev) {
      if (this.modo !== 'ver' && this.modo !== 'verRed') return false;
      if (!this.fotos.length) return false;
      var k = ev.key;
      this.despierta();
      if (k === 'ArrowLeft') { this.salta(-CFG.REPLAY_SALTO); this.avisoSalto(-1); return true; }
      if (k === 'ArrowRight') { this.salta(CFG.REPLAY_SALTO); this.avisoSalto(1); return true; }
      if (k === 'Home') { this.irA(0); return true; }
      if (k === 'End') { this.irA(this.tTotal); return true; }
      if (k === ' ' || k === 'Spacebar' || ev.code === 'Space') {
        this.pausar();
        this.avisoGrande(G.paused ? '❚❚' : '▶');
        return true;
      }
      if (k === 'x' || k === 'X') { this.otraVelocidad(); return true; }
      if (k === 'f' || k === 'F') { this.pantallaCompleta(); return true; }
      if (k === 'm' || k === 'M') { this.siguienteMomento(); return true; }
      var n = ['1', '2', '3', '4'].indexOf(k);
      if (n !== -1) { this.velocidad(CFG.REPLAY_VELOCIDADES[n]); return true; }
      if ((k === 'q' || k === 'Q' || k === 'Escape') && this.barra && this.barra.style.display !== 'none') {
        this.salir();
        return true;
      }
      return false;
    },

    /* ---------- diálogos, los pide ui.js ---------- */
    /* Pausar una repetición ya preparada NO abre menú: es un vídeo, se para
     * y se ve el aviso. Sin preparar (en las pruebas) queda el de siempre. */
    pausaPrompt: function () {
      var self = this, UI = window.PM.UI;
      if (this.modo !== 'ver' || !UI || !UI.showPrompt) return false;
      if (this.barra && this.barra.style.display !== 'none' && this.fotos.length) {
        if (UI.hidePrompt) UI.hidePrompt();
        this.pintaBarra();
        return true;
      }
      this.pintaBarra();
      var segs = Math.round(CFG.REPLAY_SALTO / 60);
      var lineas = ['ESTÁS VIENDO UNA PARTIDA YA JUGADA.',
                    'NO CUENTA PARA NADA: NI PUNTOS, NI LOGROS, NI RÉCORD.'];
      var botones = [
        { label: 'SEGUIR', primary: true, hint: 'P · ESC',
          keys: ['p', 'Escape', 'Enter'],
          onClick: function () { self.pausar(false); } }
      ];
      botones.push({ label: 'VELOCIDAD x' + (G.timeScale || 1),
        hint: 'X', keys: ['x'],
        onClick: function () {
          self.otraVelocidad();
          if (UI.syncPrompt) UI.syncPrompt();
        } });
      botones.push({ label: 'DESDE EL PRINCIPIO', hint: 'R', keys: ['r'],
        onClick: function () { self.reiniciar(); } });
      botones.push({ label: 'SALIR', hint: 'Q', keys: ['q'],
        onClick: function () { self.salir(); } });
      UI.showPrompt({
        title: 'REPETICIÓN EN PAUSA',
        color: '#7ec8ff',
        lines: lineas.concat(segs ? [] : []),
        buttons: botones
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
          /* Lo que uno quiere ver otra vez casi siempre es el último medio
           * minuto, no la partida entera. */
          { label: 'ATRÁS ' + Math.round(CFG.REPLAY_SALTO / 60) + ' S',
            hint: '<', keys: ['ArrowLeft'],
            onClick: function () {
              if (UI.hidePrompt) UI.hidePrompt();
              self.salta(-CFG.REPLAY_SALTO);
              self.pausar(true);
            } },
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
