/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/versus.js
 * PAC-MAN VS.: un jugador de la party lleva un fantasma.
 * Define window.PM.Versus
 *
 * La idea es que el fantasma humano sea UN FANTASMA MÁS: cambia
 * quién decide el giro y nada más. Todo lo que hace que un
 * fantasma sea un fantasma se queda tal cual —paredes, puerta de
 * la casa, zonas sin subir, velocidades por nivel, el frenazo del
 * túnel, el modo asustado y volver a casa hecho ojos—, porque eso
 * vive en ghost.js y aquí no se toca.
 *
 * Reparto
 *   Cada miembro de la sala pide un fantasma (o Pac-Man). El líder
 *   es quien reparte: si dos piden el mismo, el segundo se queda
 *   sin él (party.js). Al empezar, el orden de juego trae el
 *   fantasma de cada uno y Game.newGame lo aplica aquí.
 *
 * Quién simula qué (online)
 *   El anfitrión sigue siendo el que manda, como en cualquier otra
 *   partida. El que lleva el fantasma NO manda posiciones: manda
 *   una INTENCIÓN de rumbo por 'gevt' y el anfitrión la aplica. Si
 *   el mensaje tarda, el fantasma sigue recto un poco más y gira
 *   luego; nunca se le mueve de sitio a la fuerza, así que no hay
 *   tirones ni saltos. En su propia pantalla el fantasma se simula
 *   en local (igual que el Pac-Man propio del invitado) y solo se
 *   acepta la posición del anfitrión si los dos se han separado
 *   más de CFG.VS.RESYNC_PX, que es menos de una casilla: corrigiendo
 *   pronto la corrección es pequeña, y esperando se convierte en un
 *   salto de dos o tres casillas.
 *
 * Puntuación
 *   Los Pac-Man puntúan como siempre (marcador de equipo). Cada
 *   fantasma tiene EL SUYO PROPIO: CFG.VS.CATCH_POINTS por cada
 *   Pac-Man que caza, y cobra el que lo caza. Se puede llevar más
 *   de un fantasma en la misma partida (el reparto lo permite;
 *   solo exige que quede algún Pac-Man), así que un marcador
 *   común no valdría: dos cazadores no sabrían quién ha hecho qué
 *   y el nivel de jugador les daría lo mismo a los dos.
 *   Ganan la ronda si entre todos acaban con las vidas de todos
 *   los Pac-Man; si la partida termina de cualquier otra forma,
 *   ganan los Pac-Man. Estas partidas no cuentan para el top
 *   mundial ni para los récords (los ajustes no son comparables),
 *   pero sí para el nivel de jugador, que mide cuánto juegas.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var T = CFG.TILE;

  var Versus = {

    /* ---------------------------------------------------------
     * Reparto
     * --------------------------------------------------------- */
    /* Deja la lista en limpio: un id de fantasma (0..3) por jugador, o -1 si
     * lleva Pac-Man. Nadie repite fantasma (se queda el primero de la lista,
     * que es el orden de la party) y siempre queda al menos un Pac-Man: sin
     * nadie a quien comer no hay partida que jugar. */
    clean: function (list, n) {
      var out = [], usados = {}, i, g, hayPac = false;
      for (i = 0; i < n; i++) {
        g = parseInt(list && list[i], 10);
        if (!(g >= 0 && g < 4) || usados[g]) g = -1;
        else usados[g] = 1;
        if (g < 0) hayPac = true;
        out.push(g);
      }
      if (!hayPac && out.length) out[0] = -1;
      return out;
    },

    /* Aplica el reparto a una partida recién creada */
    setup: function (g, list) {
      var i, gid;
      g.vsGhosts = this.clean(list, g.pacs.length);
      g.vsScores = [];                 // un marcador por jugador (el suyo)
      for (i = 0; i < g.pacs.length; i++) g.vsScores.push(0);
      g.vsDirTimer = 0;
      g.vsLastDir = -2;
      for (i = 0; i < 4; i++) {
        g.ghosts[i].human = false;
        g.ghosts[i].wishDir = -1;
        g.ghosts[i].taken = false;
      }
      for (i = 0; i < g.vsGhosts.length; i++) {
        gid = g.vsGhosts[i];
        if (gid < 0) continue;
        g.ghosts[gid].human = true;
        /* Quien lleva un fantasma no tiene Pac-Man. Su ficha se marca como
         * fuera de juego, que es justo lo que hacía falta: ni se dibuja, ni
         * la persiguen, ni gasta vidas, ni cuenta para el GAME OVER. */
        if (g.pacs[i]) {
          g.pacs[i].out = true;
          g.pacs[i].lives = 0;
        }
      }
    },

    /* ---------------------------------------------------------
     * Mando
     * --------------------------------------------------------- */
    /* Teclas, cruceta o deslizamiento de un jugador que lleva fantasma.
     * Devuelve true si se ha quedado con la pulsación (y entonces game.js no
     * toca ningún Pac-Man, que ese jugador no tiene). */
    steer: function (g, idx, d) {
      var gid = g.vsGhostOf(idx);
      if (gid < 0) return false;
      if (!(d >= 0 && d < 4)) return true;
      // en online solo se lleva el fantasma propio: el de otro no se toca
      if (g.netRole && idx !== g.localIdx) return true;
      var gh = g.ghosts[gid];
      gh.taken = true;          // a partir de aquí lo lleva él, no la máquina
      if (gh.wishDir === d) return true;
      gh.wishDir = d;
      this.flushDir(g);          // el giro sale hacia el anfitrión al momento
      return true;
    },

    /* El invitado que lleva un fantasma no manda posiciones: manda su rumbo.
     * Sustituye al 'pos' de siempre y vale igual de señal de vida.
     * Devuelve true si se ha encargado del envío de este tick. */
    sendDir: function (g) {
      if (g.netRole !== 'guest') return false;
      if (g.vsGhostOf(g.localIdx) < 0) return false;
      g.vsDirTimer = (g.vsDirTimer || 0) + 1;
      this.flushDir(g);
      return true;
    },

    /* Sale al cambiar de rumbo y, si no, cada CFG.VS.DIR_EVERY ticks: como es
     * una intención permanente y no un evento, un mensaje perdido lo arregla
     * solo el siguiente. */
    flushDir: function (g) {
      if (g.netRole !== 'guest') return;
      var gid = g.vsGhostOf(g.localIdx);
      if (gid < 0) return;
      var d = g.ghosts[gid].wishDir;
      if (d === g.vsLastDir && (g.vsDirTimer || 0) < CFG.VS.DIR_EVERY) return;
      g.vsDirTimer = 0;
      g.vsLastDir = d;
      g.netSend('gevt', { t: 'gdir', d: d, i: g.localIdx });
    },

    /* El anfitrión recibe el rumbo del jugador que lleva el fantasma */
    setWish: function (g, who, d) {
      var gid = g.vsGhostOf(who);
      if (gid < 0) return;
      g.ghosts[gid].wishDir = (d >= 0 && d < 4) ? d : -1;
      if (d >= 0 && d < 4) g.ghosts[gid].taken = true;
    },

    /* ---------------------------------------------------------
     * Instantáneas: el fantasma propio se simula aquí
     * --------------------------------------------------------- */
    /* ¿El fantasma i lo lleva ESTE navegador? */
    drivenHere: function (g, i) {
      if (!g.ghosts[i].human) return false;
      return g.vsPlayerOf(i) === g.localIdx;
    },

    /* Separación con el anfitrión que ya no se puede disimular. Se mira con
     * el túnel en cuenta: dar la vuelta al mapa son 224 px de diferencia y no
     * significa que nadie se haya desviado. */
    tooFar: function (a, b) {
      var ancho = CFG.COLS * T;
      var dx = Math.abs(a.x - b.x);
      if (dx > ancho / 2) dx = ancho - dx;
      var dy = Math.abs(a.y - b.y);
      return dx > CFG.VS.RESYNC_PX || dy > CFG.VS.RESYNC_PX;
    },

    /* ---------------------------------------------------------
     * Puntuación y final
     * --------------------------------------------------------- */
    /* Un fantasma de jugador se ha llevado por delante a un Pac-Man. Cobra
     * QUIEN LO CAZA, no "los fantasmas": con dos cazadores en la misma
     * partida, un marcador común no diría quién ha hecho qué. */
    onCatch: function (g, who, byGhost) {
      if (!(byGhost >= 0) || !g.ghosts[byGhost]) return;
      var quien = g.vsPlayerOf(byGhost);
      if (quien < 0 || quien === who) return;
      g.addVsScore(quien, CFG.VS.CATCH_POINTS);
      g.addPopup(g.ghosts[byGhost].x, g.ghosts[byGhost].y,
        CFG.VS.CATCH_POINTS, CFG.EAT_FREEZE_TICKS);
    },

    /* Pac-Man que ha cazado el jugador i (sale de sus puntos, así que también
     * cuadra en la pantalla del invitado, que solo recibe el marcador) */
    catches: function (g, i) {
      return Math.round(g.vsScoreOf(i) / CFG.VS.CATCH_POINTS);
    },

    /* Los que llevan fantasma, con lo suyo. En el orden de la party. */
    hunters: function (g) {
      var out = [];
      for (var i = 0; i < g.pacs.length; i++) {
        if (g.vsGhostOf(i) < 0) continue;
        out.push({ idx: i, name: g.nameFor(i), ghost: g.vsGhostOf(i),
                   score: g.vsScoreOf(i), catches: this.catches(g, i) });
      }
      return out;
    },

    /* 'ghost' si los fantasmas acabaron con las vidas de todos los Pac-Man;
     * 'pacs' en cualquier otro final (rendición, desconexión, salirse). */
    winner: function (g) {
      for (var i = 0; i < g.pacs.length; i++) {
        if (g.vsGhostOf(i) >= 0) continue;
        if (!g.pacs[i].out) return 'pacs';
      }
      return 'ghost';
    },

    /* Nombre del jugador que lleva fantasma (el primero que aparezca) */
    ghostName: function (g) {
      for (var i = 0; i < g.pacs.length; i++) {
        if (g.vsGhostOf(i) >= 0) return g.nameFor(i);
      }
      return '';
    },

    /* El que más ha cazado (para el titular del final). Empate: el primero. */
    topHunter: function (g) {
      var lista = this.hunters(g), mejor = null;
      for (var i = 0; i < lista.length; i++) {
        if (!mejor || lista[i].score > mejor.score) mejor = lista[i];
      }
      return mejor;
    },

    /* ---------------------------------------------------------
     * Que se vea quién es quién
     * --------------------------------------------------------- */
    /* Marca permanente sobre el fantasma de cada jugador. El nombre solo sale
     * en el "¡LISTO!", como con los Pac-Man, así que hace falta algo que
     * aguante toda la partida: un triángulo encima que late despacio, blanco
     * si el fantasma es tuyo y rosa pálido si lo lleva otro. */
    drawMarks: function (g, ctx) {
      if (!g.isVersus()) return;
      var yo = g.netRole ? g.localIdx : g.vsPlayerOf(this.firstGhost(g));
      var A = window.PM.Hab;
      for (var i = 0; i < 4; i++) {
        if (!g.ghosts[i].human) continue;
        if (g.eatFreezeTicks > 0 && i === g.hiddenGhost) continue;
        /* ACECHO (modo DESATADO): mientras dura, al fantasma se le quita la
         * marca. Es la mitad que de verdad importa del poder —volverse
         * translúcido con un triángulo blanco encima no esconde a nadie—, y
         * quien lo lleva sigue viendo la suya para no perderse a sí mismo. */
        if (g.hab && A && !A.marcaVisible(g, i)) continue;
        var gh = g.ghosts[i];
        this.mark(ctx, gh.x, gh.y + CFG.MAZE_Y, g.tick, g.vsPlayerOf(i) === yo);
      }
    },

    /* Primer fantasma repartido (en local no hay "jugador propio": el de al
     * lado es tan tuyo como el tuyo, así que la marca llena es para él) */
    firstGhost: function (g) {
      for (var i = 0; i < 4; i++) {
        if (g.ghosts[i].human) return i;
      }
      return -1;
    },

    mark: function (ctx, x, y, tick, propio) {
      var sube = (Math.floor(tick / 15) % 2) ? 1 : 0;
      var top = y - 12 - sube;
      ctx.save();
      ctx.fillStyle = propio ? '#ffffff' : '#ffb8ae';
      ctx.beginPath();
      ctx.moveTo(x, top + 4);
      ctx.lineTo(x - 3.5, top);
      ctx.lineTo(x + 3.5, top);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };

  window.PM.Versus = Versus;
})();
