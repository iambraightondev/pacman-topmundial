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
  var MODOS = { solo: 's', duo: 'd', reto: 'r' };
  var MODOS_INV = { s: 'solo', d: 'duo', r: 'reto' };

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
  function codEntradas(arr) {
    var out = '', prev = 0, i = 0;
    while (i < arr.length) {
      var e = arr[i];
      var delta = e[0] - prev;
      var code = String.fromCharCode(71 + ((e[1] & 3) << 2) + (e[2] & 3));
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
    var re = /([0-9a-z]+)([G-V])(?:\*([0-9a-z]+))?/g;
    var pos = 0, m, tick = 0;
    while ((m = re.exec(s)) !== null) {
      if (m.index !== pos) return null;          // basura entre medias
      pos = re.lastIndex;
      var delta = parseInt(m[1], 36);
      var c = m[2].charCodeAt(0) - 71;
      var veces = m[3] ? parseInt(m[3], 36) : 1;
      if (!isFinite(delta) || delta < 0) return null;
      if (!(veces >= 1) || veces > CFG.REPLAY_MAX_ENTRADAS) return null;
      if (out.length + veces > CFG.REPLAY_MAX_ENTRADAS) return null;
      for (var i = 0; i < veces; i++) {
        tick += delta;
        out.push([tick, (c >> 2) & 3, c & 3]);
      }
    }
    if (pos !== s.length) return null;
    return out;
  }

  var Replay = {
    V: 1,

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
        if (!esNum(e[2]) || e[2] < 0 || e[2] > 3) return false;
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
        if (aj[4] === 'i') ajustes.vidasModo = 'individual';

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

    /* Enlace para compartir: el juego se abre directo en la repetición */
    enlace: function (repOTexto) {
      var texto = (typeof repOTexto === 'string')
        ? repOTexto : this.serializar(repOTexto);
      if (!texto) return '';
      var base = 'index.html';
      try {
        base = window.location.href.split('?')[0].split('#')[0];
      } catch (e) { /* sin location (pruebas) */ }
      return base + '?rep=' + encodeURIComponent(texto);
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
      G.timeScale = 1;

      // sin repetición cargada no hay nada que ver: es una partida normal
      if (this.modo === 'ver' && !this.rep) this.modo = null;

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
      /* Online no se graba: allí la partida la simula el anfitrión y lo que
       * ve cada uno depende de lo que llegue por la red, así que repetir las
       * teclas en local no reconstruiría la misma partida. */
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

      this.modo = 'grabar';
      this.grabando = {
        v: this.V,
        modo: (G.playerCount === 2) ? 'duo' : 'solo',
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

    /* Cada giro pasa por aquí (Game.setPacDir). Devuelve false cuando el
     * giro NO debe aplicarse: mientras se ve una repetición manda ella y el
     * teclado no pinta nada. */
    entrada: function (idx, d) {
      if (this.modo === 'ver') return !!this.enviando;
      if (!this.grabando) return true;
      if (!(idx >= 0 && idx < CFG.MAX_PLAYERS) || !(d >= 0 && d <= 3)) return true;
      var p = G.pacs[idx];
      /* Pedir el rumbo que ya estaba pedido no cambia nada (setDesiredDir
       * solo apunta el deseo), así que no se guarda. Esto es lo que hace que
       * tener una tecla pulsada —el teclado repite el evento cada pocas
       * centésimas— deje UNA entrada y no doscientas. */
      if (!p || p.nextDir === d) return true;
      this.grabando.entradas.push([this.t, idx, d]);
      // una partida normal no llega ni de lejos; si alguien lo revienta, se
      // deja de grabar y a jugar tranquilo
      if (this.grabando.entradas.length > CFG.REPLAY_MAX_ENTRADAS) {
        this.grabando = null;
      }
      return true;
    },

    /* Un paso del juego (Game.step). Mete los giros que tocan y adelanta el
     * reloj de la repetición. */
    paso: function () {
      if (!this.modo) return;
      if (this.modo === 'ver' && G.state === 'MENU') {   // se ha salido
        this.salir(true);
        return;
      }
      if (G.paused || G.netNotice) return;               // el tiempo no corre
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
        G.setPacDir(e[1], e[2]);
      }
      this.enviando = false;
    },

    /* Fin de la partida (Game.closeRun): se cierra la repetición y se
     * guarda. Pasa igual si se acaba en GAME OVER, si te rindes, si
     * reinicias o si te sales al menú a medias. */
    alAcabar: function () {
      var rep = this.grabando;
      this.grabando = null;
      this.modo = null;
      if (!rep) return null;
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
        names: rep.nombres.slice()
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

    /* Enlace ?rep=<texto> compartido: se abre directo en la repetición */
    desdeUrl: function () {
      var busca = '';
      try { busca = window.location.search || ''; } catch (e) { busca = ''; }
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
      if (this.modo !== 'ver' || !this.rep) return;
      var rep = this.rep;
      if (window.PM.UI) window.PM.UI.hidePrompt();
      G.paused = false;
      if (G.lastOpts) G.restartGame();     // pasa por newGame -> alEmpezar
      else this.ver(rep);
    },

    /* yaEnMenu: la partida ya se cerró por su cuenta (SALIR del menú de
     * pausa, por ejemplo) y aquí solo hay que recoger. */
    salir: function (yaEnMenu) {
      var estaba = (this.modo === 'ver');
      this.modo = null;
      this.rep = null;
      this.grabando = null;
      this.cursor = 0;
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
