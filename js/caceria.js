/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/caceria.js
 * Modo CACERÍA: todos de fantasma contra un Pac-Man de máquina.
 * Define window.PM.Caza
 *
 * Es PAC-MAN VS. dado la vuelta. De uno a cuatro jugadores llevan
 * cada uno un fantasma —con las mismas reglas que en VS., que
 * viven en js/versus.js y js/ghost.js— y el Pac-Man lo lleva la
 * máquina. Lo que hay aquí es lo único nuevo:
 *
 *   1. EL PAC-MAN DE MÁQUINA. Es un asiento más de la partida
 *      (el último de `Game.pacs`, con `bot = true`), así que come,
 *      muere, reaparece y gasta las vidas del fondo común igual
 *      que uno de carne: game.js no distingue. Solo cambia quién
 *      le pide el rumbo, y eso se decide en decidir().
 *
 *   2. EL PODER. En el laberinto no hay superpastillas (se sirven
 *      como puntos normales). Cada cierto tiempo Pac-Man se vuelve
 *      peligroso él solo: los fantasmas se ponen azules y se los
 *      come. Se avisa unos segundos antes con un aro sobre él y un
 *      pitido por segundo, que la gracia no es la sorpresa sino
 *      tener que soltar la presa y salir corriendo. Los tiempos
 *      están en CFG.CAZA, con el porqué.
 *
 *   3. LAS RONDAS. Una partida son CFG.CAZA.NIVELES niveles. Si
 *      Pac-Man los despeja todos, gana él; si antes se queda sin
 *      vidas, ganan los fantasmas, y el titular se lo lleva quien
 *      más veces lo cazó (cada caza son CFG.VS.CATCH_POINTS, como
 *      en VS.). Cada ronda el poder dura más y llega antes.
 *
 * Cómo piensa Pac-Man
 *   Decide UNA vez por casilla, al llegar a su centro (como pide
 *   Pacman.update para girar), y solo entre las salidas legales:
 *
 *   - Mapa de amenaza: distancia por pasillos desde cada fantasma
 *     que pueda matar (los azules con poco poder por delante
 *     también cuentan; los ojos no; los de la casa cuentan como si
 *     estuvieran sobre la puerta, un poco más lejos).
 *   - Una casilla es SEGURA si Pac-Man llega a ella con margen
 *     antes que cualquier fantasma. Se explora el laberinto SOLO
 *     por casillas seguras, así que un camino que cruza por
 *     delante de un fantasma no existe para él.
 *   - Con poder: si algún fantasma azul está al alcance antes de
 *     que se acabe, va a por el más cercano.
 *   - Sin poder: el punto (o la fruta) más cercano por casillas
 *     seguras. Si no queda ninguno seguro, la salida que le deja
 *     más laberinto seguro por delante; y si nada es seguro, la
 *     que le aleja más del fantasma más cercano.
 *
 *   Los empates se resuelven siempre igual —recto primero, luego
 *   el orden arriba/izquierda/abajo/derecha, marcha atrás la
 *   última— y no se sortea nada: la partida sigue siendo
 *   determinista, que es lo que sostiene las repeticiones.
 *
 *   El margen de una casilla y decidir solo en el centro son lo
 *   que lo hace CAZABLE: sabe huir de lo que ve venir, pero no
 *   lee intenciones. Cuatro personas que cierran un pasillo por
 *   los dos lados lo pillan; una sola, corriendo detrás, no.
 *
 * Red
 *   El anfitrión lo simula todo, como siempre: el rumbo del bot lo
 *   decide él y su posición viaja en la instantánea como la de
 *   cualquier otro jugador (`ps`). El reloj del poder va también
 *   en la foto (`cz`) y el invitado lo hace correr entre foto y
 *   foto para que la cuenta atrás y los pitidos no vayan a saltos.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var C = CFG.CAZA;
  var T = CFG.TILE;
  var D = CFG.DIR;

  /* ---------------------------------------------------------
   * El laberinto como grafo: vecinos de cada casilla transitable
   * (con el túnel envuelto). Se monta una vez por trazado.
   * --------------------------------------------------------- */
  var grafo = null;

  function idxDe(c, r) { return r * CFG.COLS + c; }

  function montarGrafo() {
    var key = CFG.MAZE.join('\n');
    if (grafo && grafo.key === key) return grafo;
    var n = CFG.ROWS * CFG.COLS;
    var abierta = new Array(n), vec = new Array(n);
    var r, c, i, d, v, nc, nr;
    for (r = 0; r < CFG.ROWS; r++) {
      for (c = 0; c < CFG.COLS; c++) {
        abierta[idxDe(c, r)] = CFG.isOpen(c, r, false);
      }
    }
    for (i = 0; i < n; i++) {
      vec[i] = [];
      if (!abierta[i]) continue;
      c = i % CFG.COLS; r = (i - c) / CFG.COLS;
      for (d = 0; d < 4; d++) {
        v = CFG.DIR_V[d];
        nc = c + v.x; nr = r + v.y;
        if (nc < 0 || nc >= CFG.COLS) {
          if (r !== CFG.TUNNEL_ROW) continue;
          nc = CFG.wrapCol(nc);
        }
        if (nr < 0 || nr >= CFG.ROWS) continue;
        if (abierta[idxDe(nc, nr)]) vec[i].push([idxDe(nc, nr), d]);
      }
    }
    grafo = { key: key, n: n, vec: vec, abierta: abierta };
    return grafo;
  }

  /* Anchura desde `inicio`. Devuelve { dist, prim }: distancia en casillas
   * (-1 si no se llega) y con qué PRIMER paso se llega. `orden` es el orden
   * en que se prueban las salidas del inicio: el primero que se pone en cola
   * es el que gana los empates. `ok(idx, dist)` puede vetar casillas. */
  function anchura(g, inicio, orden, ok) {
    var dist = new Array(g.n), prim = new Array(g.n);
    var cola = [], cab = 0, i, cur, sal, k, nx, nd;
    for (i = 0; i < g.n; i++) { dist[i] = -1; prim[i] = -1; }
    dist[inicio] = 0;
    /* las salidas del inicio, en el orden pedido */
    sal = g.vec[inicio];
    for (k = 0; k < orden.length; k++) {
      for (i = 0; i < sal.length; i++) {
        if (sal[i][1] !== orden[k]) continue;
        nx = sal[i][0];
        if (dist[nx] >= 0) continue;
        if (ok && !ok(nx, 1)) continue;
        dist[nx] = 1; prim[nx] = sal[i][1];
        cola.push(nx);
      }
    }
    while (cab < cola.length) {
      cur = cola[cab++];
      sal = g.vec[cur];
      nd = dist[cur] + 1;
      for (i = 0; i < sal.length; i++) {
        nx = sal[i][0];
        if (dist[nx] >= 0) continue;
        if (ok && !ok(nx, nd)) continue;
        dist[nx] = nd; prim[nx] = prim[cur];
        cola.push(nx);
      }
    }
    return { dist: dist, prim: prim };
  }

  /* Orden de las salidas para los empates: recto, luego la prioridad de
   * siempre, y la marcha atrás la última. */
  function ordenDesde(dir) {
    var out = [], i;
    if (dir >= 0) out.push(dir);
    for (i = 0; i < CFG.DIR_PRIORITY.length; i++) {
      var d = CFG.DIR_PRIORITY[i];
      if (d !== dir && d !== CFG.OPP[dir]) out.push(d);
    }
    if (dir >= 0) out.push(CFG.OPP[dir]);
    return out;
  }

  /* Lo mismo SIN la marcha atrás: un fantasma no se da la vuelta (salvo al
   * cambiar de modo), así que lo que tiene detrás no lo amenaza de primeras */
  function ordenSinAtras(dir) {
    var out = ordenDesde(dir);
    if (dir >= 0) out.pop();
    return out;
  }

  var Caza = {

    /* ---------------------------------------------------------
     * Reparto y arranque
     * --------------------------------------------------------- */
    /* Cada jugador lleva el fantasma de su asiento: el 0 a Blinky (que
     * empieza fuera), el 1 a Pinky... Los que no tengan dueño los lleva la
     * máquina, como en VS. */
    reparto: function (n) {
      var out = [];
      for (var i = 0; i < n && i < 4; i++) out.push(i);
      return out;
    },

    /* Índice del asiento de Pac-Man (el último), o -1 si no es CACERÍA */
    botIdx: function (G) {
      if (!G.caza) return -1;
      for (var i = G.pacs.length - 1; i >= 0; i--) {
        if (G.pacs[i].bot) return i;
      }
      return -1;
    },

    bot: function (G) {
      var i = this.botIdx(G);
      return (i >= 0) ? G.pacs[i] : null;
    },

    /* Ronda en curso, de 0 en adelante (el poder escala por ronda) */
    ronda: function (G) {
      return Math.max(0, (G.level | 0) - (G.startLevel | 0));
    },

    esUltimaRonda: function (G) {
      return this.ronda(G) + 1 >= C.NIVELES;
    },

    /* Segundos que dura el poder en esta ronda, con el ajuste del anfitrión */
    duracionSegs: function (G) {
      var m = (typeof G.frightMult === 'number') ? G.frightMult : 1;
      return Math.max(C.MIN_DURACION, C.duracion(this.ronda(G)) * m);
    },

    /* Reloj a cero: empieza a contar un periodo entero. Se llama al empezar
     * cada nivel y al reaparecer, que es cuando todo vuelve a su sitio. */
    reiniciar: function (G) {
      G.cazaTicks = Math.round(C.periodo(this.ronda(G)) * 60);
      this.ultimoTile = -1;
      this.aviso = -1;
    },

    ultimoTile: -1,   // casilla en la que Pac-Man decidió por última vez
    aviso: -1,        // último segundo de aviso que ya pitó

    /* ---------------------------------------------------------
     * Un tick. El anfitrión (y la partida local) mueve el reloj y
     * decide el rumbo del bot; el invitado solo hace correr el reloj
     * entre instantáneas, para que la cuenta atrás se vea seguida.
     * --------------------------------------------------------- */
    paso: function (G) {
      if (!G.caza) return;
      var p = this.bot(G);
      if (!p) return;
      var manda = (G.netRole !== 'guest' && !G.isSpec());
      if (manda && !p.out && !p.dying) this.pilotar(G, p);
      this.reloj(G, manda);
    },

    /* Cuenta atrás hasta el poder. Se para mientras el poder está en marcha
     * (y mientras la partida no está en PLAYING, que es cuando se llama). */
    reloj: function (G, manda) {
      if (G.frightTicks > 0) { this.aviso = -1; return; }
      if (!(G.cazaTicks > 0)) G.cazaTicks = 0;
      if (G.cazaTicks > 0) G.cazaTicks--;
      var seg = Math.ceil(G.cazaTicks / 60);
      if (G.cazaTicks > 0 && seg <= C.AVISO && seg !== this.aviso) {
        this.aviso = seg;
        if (window.AudioSys && AudioSys.playPowerWarn) AudioSys.playPowerWarn(seg);
      }
      if (G.cazaTicks > 0 || !manda) return;
      /* llega el poder: los fantasmas se dan la vuelta y se ponen azules */
      G.triggerFright(this.duracionSegs(G));
      G.cazaTicks = Math.round(C.periodo(this.ronda(G)) * 60);
      this.ultimoTile = -1;            // que vuelva a pensar: ahora caza él
      if (window.AudioSys && AudioSys.playPowerOn) AudioSys.playPowerOn();
    },

    /* ---------------------------------------------------------
     * Pilotar al bot: decide al llegar al centro de cada casilla
     * --------------------------------------------------------- */
    pilotar: function (G, p) {
      var sp = G.pacSpeedPx(p);
      var cx = p.tileX(), cy = p.tileY();
      var tid = idxDe(cx, cy);
      var v = CFG.DIR_V[p.dir];
      var horizontal = (v.x !== 0);
      var pos = horizontal ? p.x : p.y;
      var ctr = horizontal ? (cx * T + T / 2) : (cy * T + T / 2);
      var toward = horizontal ? v.x : v.y;
      var dist = (ctr - pos) * toward;       // >0: el centro está delante
      var nueva = (tid !== this.ultimoTile);
      /* al centro (o a un paso de él) de una casilla nueva; o parado contra
       * un muro, que es la única forma de quedarse sin decisión que valga */
      if (!((nueva && dist <= sp) || (!p.moving && dist === 0))) return;
      this.ultimoTile = tid;
      var d = this.decidir(G, p);
      if (d >= 0) p.setDesiredDir(d);
    },

    /* Mapa de amenaza: distancia desde el fantasma peligroso más cercano a
     * cada casilla (null si no hay ninguno suelto). Un fantasma azul con
     * poco poder por delante también amenaza. */
    amenaza: function (G, g) {
      var mapa = null, i, gh, src, extra, res, k, orden;
      var puerta = idxDe(Math.floor(CFG.HOUSE.exitX / T), Math.floor(CFG.HOUSE.exitY / T));
      for (i = 0; i < 4; i++) {
        gh = G.ghosts[i];
        if (gh.mode === 'eyes' || gh.mode === 'entering') continue;
        extra = 0;
        orden = CFG.DIR_PRIORITY;
        if (gh.mode === 'house') { src = puerta; extra = C.CASA_EXTRA; }
        else if (gh.mode === 'leaving') { src = puerta; extra = 1; }
        else {
          if (gh.frightened && G.frightTicks > C.AZUL_MARGEN) continue;
          src = idxDe(gh.tileX(), gh.tileY());
          if (!g.abierta[src]) continue;    // en el túnel fuera del mapa, etc.
          // por los pasillos un fantasma no da marcha atrás: lo que deja a
          // su espalda solo lo alcanza dando la vuelta a la manzana
          orden = ordenSinAtras(gh.dir);
        }
        res = anchura(g, src, orden, null);
        if (!mapa) {
          mapa = new Array(g.n);
          for (k = 0; k < g.n; k++) mapa[k] = Infinity;
        }
        for (k = 0; k < g.n; k++) {
          if (res.dist[k] >= 0 && res.dist[k] + extra < mapa[k]) {
            mapa[k] = res.dist[k] + extra;
          }
        }
      }
      return mapa;
    },

    /* La dirección que toca desde la casilla actual (-1 si no hay salida) */
    decidir: function (G, p) {
      var g = montarGrafo();
      var inicio = idxDe(p.tileX(), p.tileY());
      var sal = g.vec[inicio];
      if (!sal || !sal.length) return -1;
      var orden = ordenDesde(p.dir);
      var amen = this.amenaza(G, g);
      var i, k, mejor, mejorD, t;

      /* solo por casillas seguras: se llega antes que cualquier fantasma */
      var segura = anchura(g, inicio, orden, function (idx, d) {
        return !amen || d + C.MARGEN < amen[idx];
      });

      /* 1. con poder: a por el fantasma azul más cercano, si da tiempo. Solo
       * por casillas seguras: los que ya se comió vuelven a salir de la casa
       * SIN estar azules, y un camino que pasa por la puerta se paga. */
      if (G.frightTicks > 0) {
        mejor = -1; mejorD = Infinity;
        for (i = 0; i < 4; i++) {
          var gh = G.ghosts[i];
          if (!gh.frightened || gh.mode !== 'normal') continue;
          t = idxDe(gh.tileX(), gh.tileY());
          if (!g.abierta[t]) continue;
          var dd = segura.dist[t];
          if (dd < 0) continue;
          if (dd * C.TICKS_CASILLA + C.AZUL_MARGEN >= G.frightTicks) continue;
          if (dd < mejorD) { mejorD = dd; mejor = t; }
        }
        if (mejor >= 0 && segura.prim[mejor] >= 0) return segura.prim[mejor];
      }

      /* 2. la fruta, si está y cae cerca por camino seguro */
      if (G.fruitActive) {
        var fy = CFG.START.fruit.y;
        var f1 = idxDe(13, fy), f2 = idxDe(14, fy);
        var df = -1, ft = -1;
        if (segura.dist[f1] >= 0) { df = segura.dist[f1]; ft = f1; }
        if (segura.dist[f2] >= 0 && (df < 0 || segura.dist[f2] < df)) {
          df = segura.dist[f2]; ft = f2;
        }
        if (ft >= 0 && df <= 12) return segura.prim[ft];
      }

      /* cuánto laberinto seguro queda, y por qué salida: si es poco, lo
       * están acorralando y comer puede esperar */
      var cuenta = [0, 0, 0, 0], hay = false, seguras = 0;
      for (k = 0; k < g.n; k++) {
        if (segura.dist[k] > 0) { cuenta[segura.prim[k]]++; hay = true; seguras++; }
      }
      var acorralado = !!amen && seguras < C.MIN_SEGURAS;
      /* Una salida que solo lleva a un bolsillo de dos casillas seguras no
       * vale aunque tenga un punto al lado: es donde te encierran. Solo se
       * come por las salidas que dejan sitio detrás (tanto como MIN_SEGURAS,
       * o al menos tanto como la que más). Sin esto, con dos fantasmas
       * cerrando un pasillo por los dos lados, Pac-Man iba y venía dos
       * casillas comiendo hasta que lo pillaban en medio. */
      var maxCuenta = Math.max(cuenta[0], cuenta[1], cuenta[2], cuenta[3]);
      var minima = Math.min(C.MIN_SEGURAS, maxCuenta);

      /* 3. el punto más cercano por casillas seguras */
      if (!acorralado) {
        mejor = -1; mejorD = Infinity;
        for (k = 0; k < g.n; k++) {
          if (segura.dist[k] <= 0) continue;
          if (cuenta[segura.prim[k]] < minima) continue;
          var col = k % CFG.COLS, row = (k - col) / CFG.COLS;
          if (!G.pellets[row] || !G.pellets[row][col]) continue;
          if (segura.dist[k] < mejorD) { mejorD = segura.dist[k]; mejor = k; }
        }
        if (mejor >= 0) return segura.prim[mejor];
      }

      /* 4. sin puntos a salvo (o acorralado): la salida con más laberinto
       * seguro detrás */
      if (hay) {
        mejor = -1; mejorD = -1;
        for (i = 0; i < orden.length; i++) {
          if (cuenta[orden[i]] > mejorD) { mejorD = cuenta[orden[i]]; mejor = orden[i]; }
        }
        if (mejor >= 0) return mejor;
      }

      /* 5. nada es seguro: la salida que más aleja del fantasma más cercano */
      mejor = -1; mejorD = -1;
      for (i = 0; i < orden.length; i++) {
        for (k = 0; k < sal.length; k++) {
          if (sal[k][1] !== orden[i]) continue;
          var lejos = amen ? amen[sal[k][0]] : Infinity;
          if (lejos > mejorD) { mejorD = lejos; mejor = orden[i]; }
        }
      }
      return mejor;
    },

    /* ---------------------------------------------------------
     * Final de ronda
     * --------------------------------------------------------- */
    /* ¿Con este nivel despejado se acaba la partida? */
    partidaGanada: function (G) {
      return !!G.caza && this.esUltimaRonda(G);
    },

    /* ---------------------------------------------------------
     * Que se vea: aro de aviso sobre Pac-Man y reloj en el marcador
     * --------------------------------------------------------- */
    segundosPoder: function (G) {
      if (G.frightTicks > 0) return Math.ceil(G.frightTicks / 60);
      return Math.ceil((G.cazaTicks || 0) / 60);
    },

    avisando: function (G) {
      return !!G.caza && G.frightTicks <= 0 && G.cazaTicks > 0 &&
        G.cazaTicks <= C.AVISO * 60;
    },

    /* Aro que late alrededor de Pac-Man durante el aviso, y otro fijo
     * mientras tiene el poder: la señal para apartarse y la de que ya es
     * tarde. Solo sobre el laberinto (con la partida en marcha). */
    draw: function (G, ctx) {
      var p = this.bot(G);
      if (!p || p.out || p.dying) return;
      if (G.state !== 'PLAYING' && G.state !== 'READY') return;
      var avisa = this.avisando(G);
      var poder = G.frightTicks > 0;
      if (!avisa && !poder) return;
      var r = poder ? 9 : (8 + ((Math.floor(G.tick / 6) % 2) ? 2 : 0));
      ctx.save();
      ctx.strokeStyle = poder ? '#ffffff' : '#ffb8ff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = poder ? 0.8 : 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y + CFG.MAZE_Y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },

    /* El hueco del HIGH SCORE del marcador, que aquí no pinta nada: en su
     * lugar, cuánto queda para el poder (o cuánto le queda al poder). */
    hud: function (G, ctx) {
      var s = this.segundosPoder(G);
      var poder = G.frightTicks > 0;
      ctx.font = window.PM.Letra.lienzo(8);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillStyle = poder ? '#ffffff' : (this.avisando(G) ? '#ffb8ff' : CFG.COLORS.text);
      ctx.fillText(poder ? '¡PODER!' : 'PODER EN', 112, 0);
      ctx.textAlign = 'right';
      ctx.fillText(s + 'S', 136, 9);
    }
  };

  window.PM.Caza = Caza;
})();
