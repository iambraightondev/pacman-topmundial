/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/habilidades.js
 * Modo HABILIDADES. Define window.PM.Hab
 *
 * Cuatro poderes con tecla propia y recarga independiente:
 *
 *   Q  MORDISCO  se merienda al fantasma que tenga a una casilla,
 *                mire hacia donde mire, y se gira hacia él.
 *   W  TURBO     x1.5 de velocidad durante 5 s, echando chispas.
 *   E  FLASH     tres casillas hacia delante ATRAVESANDO MUROS,
 *                comiéndose lo que haya por el camino.
 *   R  GRITO     los cuatro fantasmas se asustan 4 s, sin haber
 *                tocado una superpastilla.
 *
 * Es un MODO APARTE, como LABERINTOS: se juega el laberinto de
 * 1980 con otras reglas, así que estas partidas NO entran en el
 * top mundial. Sí suman experiencia y logros, que son tuyos.
 *
 * Dónde se juega
 *   En SOLO y en PARTY (online). En dos jugadores en el mismo
 *   teclado no, y es a propósito: el J2 se mueve con WASD y la W
 *   es el turbo. Antes que dejar a alguien con medio mando, el
 *   modo no se ofrece ahí. Tampoco en PAC-MAN VS.: morder de un
 *   golpe a un fantasma que lleva una persona, sin que pueda
 *   hacer nada, no es una pelea.
 *
 * Quién manda (online)
 *   Lo que solo te toca a ti —TURBO y FLASH— se aplica en tu
 *   máquina en el acto, sin esperar a nadie: tu Pac-Man ya lo
 *   simulas tú, y su posición viaja como siempre. Lo que toca a
 *   los fantasmas —MORDISCO y GRITO— lo ejecuta el ANFITRIÓN,
 *   igual que comerse un fantasma azul: tú pides, él decide y lo
 *   reparte. Así dos jugadores no pueden morder al mismo fantasma
 *   ni contarlo dos veces.
 *
 *   Si el anfitrión rechaza la petición (por recarga), la tecla
 *   se pierde y la recarga de tu pantalla ya ha empezado. Es el
 *   lado seguro: nunca da de más, como mucho da de menos.
 *
 * Determinismo
 *   Una habilidad es una ENTRADA, como un giro. Se graba en la
 *   repetición con su tick y se vuelve a inyectar al verla, así
 *   que una partida de este modo se reconstruye igual de exacta
 *   que una clásica (js/replay.js).
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var H = CFG.HAB;
  var T = CFG.TILE;

  /* Índices de las cuatro, por si alguien lee esto de arriba abajo */
  var MORDISCO = 0, TURBO = 1, FLASH = 2, GRITO = 3;

  /* Estado limpio de un jugador. Las recargas empiezan a CERO: la primera
   * de cada partida está lista desde el "¡LISTO!". */
  function nuevoEstado() {
    return {
      cd: [0, 0, 0, 0],   // ticks que faltan para cada habilidad
      turbo: 0,           // ticks de turbo que quedan
      dientes: 0,         // ticks con los dientes fuera (MORDISCO)
      flash: 0,           // ticks translúcido (FLASH)
      chispa: 0           // contador para sembrar las chispas del turbo
    };
  }

  /* Distancia en casillas por el eje X teniendo en cuenta el túnel: las
   * columnas 0 y 27 son vecinas en la fila del túnel, y sin esto el
   * mordisco no llegaría de un extremo al otro aunque se estén tocando. */
  function distCol(a, b) {
    var d = Math.abs(a - b);
    return Math.min(d, CFG.COLS - d);
  }

  /* ¿Esa casilla es la casa de los fantasmas? El FLASH atraviesa muros, y
   * sin este freno se podría aterrizar dentro de la casa, que es un sitio
   * del que Pac-Man no sabe salir (no hay puerta para él). */
  function esCasa(col, row) {
    var C = CFG.HOUSE;
    return row >= C.top && row <= C.bottom && col >= C.left && col <= C.right;
  }

  /* ¿Se puede aterrizar ahí? Ni muro, ni puerta, ni casa. */
  function aterrizable(col, row) {
    if (row < 0 || row >= CFG.ROWS) return false;
    if (esCasa(col, row)) return false;
    return CFG.isOpen(col, row, false);
  }

  var Hab = {
    on: false,       // ¿la partida en curso es de habilidades?
    st: [],          // estado por jugador

    /* ---------- ciclo de vida ---------- */
    /* Desde Game.newGame. n = cuántos jugadores hay en la mesa. */
    empezar: function (on, n) {
      this.on = !!on;
      this.st = [];
      for (var i = 0; i < (n || 0); i++) this.st.push(nuevoEstado());
    },

    /* Al morir o al cambiar de nivel se cortan los EFECTOS, pero no las
     * recargas: perder una vida ya es bastante castigo sin encima
     * devolverte las cuatro teclas de golpe. */
    limpiarEfectos: function () {
      for (var i = 0; i < this.st.length; i++) {
        this.st[i].turbo = 0;
        this.st[i].dientes = 0;
        this.st[i].flash = 0;
      }
    },

    estado: function (idx) {
      if (!this.on) return null;
      return this.st[idx] || null;
    },

    /* ---------- consultas para el HUD y el dibujo ---------- */
    /* Fracción de recarga cumplida, 0..1 (1 = lista). */
    carga: function (idx, k) {
      var s = this.estado(idx);
      if (!s) return 1;
      var tot = H.LIST[k] ? H.LIST[k].cd : 1;
      return 1 - (s.cd[k] / tot);
    },

    lista: function (idx, k) {
      var s = this.estado(idx);
      return !!s && s.cd[k] <= 0;
    },

    conTurbo: function (idx) {
      var s = this.estado(idx);
      return !!s && s.turbo > 0;
    },

    conDientes: function (idx) {
      var s = this.estado(idx);
      return !!s && s.dientes > 0;
    },

    /* Alfa del Pac-Man: translúcido justo después de un FLASH */
    alfa: function (idx) {
      var s = this.estado(idx);
      if (!s || s.flash <= 0) return 1;
      // de 0.35 a 1 según se va posando
      return 0.35 + 0.65 * (1 - s.flash / H.FLASH_SHOW);
    },

    /* ---------- un paso ---------- */
    /* Solo corre con la partida en marcha: las recargas no avanzan durante
     * el "¡LISTO!", ni en pausa, ni mientras alguien muere. */
    paso: function (G) {
      if (!this.on) return;
      var corre = (G.state === 'PLAYING' && !G.paused && G.eatFreezeTicks <= 0);
      for (var i = 0; i < this.st.length; i++) {
        var s = this.st[i];
        if (s.dientes > 0) s.dientes--;
        if (s.flash > 0) s.flash--;
        if (!corre) continue;
        for (var k = 0; k < 4; k++) if (s.cd[k] > 0) s.cd[k]--;
        if (s.turbo > 0) {
          s.turbo--;
          s.chispa++;
        }
      }
    },

    /* ---------- ¿se puede usar ahora mismo? ---------- */
    puede: function (G, idx, k) {
      if (!this.on) return false;
      if (!(k >= 0 && k < 4)) return false;
      if (G.state !== 'PLAYING' || G.paused) return false;
      if (G.eatFreezeTicks > 0) return false;
      if (G.netNotice || (G.netStalled && G.netStalled())) return false;
      if (G.isSpec && G.isSpec()) return false;
      var p = G.pacs[idx];
      if (!p || p.out || p.dying) return false;
      // a quien lleva un fantasma no le tocan: no tiene Pac-Man que potenciar
      if (G.vsGhostOf && G.vsGhostOf(idx) >= 0) return false;
      return this.lista(idx, k);
    },

    /* ---------- pulsación local (teclado o botón) ----------
     * Es el único embudo de la entrada, igual que Game.setPacDir lo es del
     * rumbo: por aquí pasan el teclado, los botones táctiles y la
     * repetición cuando se está viendo una. */
    pulsar: function (G, idx, k) {
      if (!this.puede(G, idx, k)) return false;
      var R = window.PM.Replay;
      // mientras se ve una repetición manda ella: la tecla del que mira no
      // pinta nada, igual que con los giros (js/replay.js)
      if (R && R.habBloqueada && R.habBloqueada()) return false;
      if (!this.lanzar(G, idx, k)) return false;
      /* Se apunta DESPUÉS y solo si salió: un mordisco al aire o un flash
       * contra el borde no cambian nada, así que meterlos en la repetición
       * sería engordarla por gusto. */
      if (R && R.apuntaHab) R.apuntaHab(idx, k);
      return true;
    },

    /* Lanza la habilidad del jugador idx. Devuelve si llegó a salir: hay
     * dos que se niegan a gastarse en balde (MORDISCO sin nadie cerca,
     * FLASH contra el borde del laberinto). */
    lanzar: function (G, idx, k) {
      var deRed = (G.netRole === 'guest');
      var ok;
      switch (k) {
        case MORDISCO: ok = this.mordisco(G, idx, deRed); break;
        case TURBO:    ok = this.turbo(G, idx); break;
        case FLASH:    ok = this.flash(G, idx); break;
        case GRITO:    ok = this.grito(G, idx, deRed); break;
        default:       ok = false;
      }
      if (!ok) return false;
      this.gastar(idx, k);
      this.avisar(G, idx, k);
      return true;
    },

    gastar: function (idx, k) {
      var s = this.estado(idx);
      if (s) s.cd[k] = H.LIST[k].cd;
    },

    /* Contarlo al resto de la sala. El invitado pide, el anfitrión reparte;
     * jugando en local se lo cuenta a los mirones (hostEvt ya lo sabe). */
    avisar: function (G, idx, k) {
      if (G.netRole === 'guest') G.netSend('gevt', { t: 'hab', k: k });
      else G.hostEvt({ t: 'hab', w: idx, k: k });
    },

    /* ---------- lo que llega de fuera ----------
     * Anfitrión: un invitado pide una habilidad (gevt). Se valida su
     * recarga aquí, que es la copia que no puede tocar nadie desde su
     * navegador, y se ejecuta lo que sea cosa del anfitrión. */
    peticion: function (G, who, k) {
      if (!this.on) return;
      if (!this.puede(G, who, k)) return;
      var ok;
      if (k === MORDISCO) ok = this.mordisco(G, who, false);
      else if (k === GRITO) ok = this.grito(G, who, false);
      else {
        /* TURBO y FLASH ya se los ha aplicado él en su máquina; aquí solo
         * se anota para que su Pac-Man se vea con chispas y translúcido, y
         * para llevar su recarga. Su POSICIÓN llega por 'pos' como siempre. */
        if (k === TURBO) this.marcarTurbo(who);
        else this.marcarFlash(who);
        ok = true;
      }
      if (!ok) return;
      this.gastar(who, k);
      G.hostEvt({ t: 'hab', w: who, k: k });
    },

    /* Cualquiera (invitado o mirón): el anfitrión dice que fulano usó una
     * habilidad. Aquí NO se ejecuta nada que toque a los fantasmas —eso ya
     * llega por sus propios eventos ('eatGhost', 'fright')—, solo se pinta.
     * De lo contrario, quien la lanzó la aplicaría dos veces. */
    evento: function (G, who, k) {
      if (!this.on) return;
      if (!(who >= 0 && who < this.st.length)) return;
      if (!(k >= 0 && k < 4)) return;
      if (who === G.localIdx && !G.isSpec()) {
        // es el eco de la mía: ya está aplicada, no se toca
        return;
      }
      if (k === MORDISCO) this.marcarDientes(who);
      else if (k === TURBO) this.marcarTurbo(who);
      else if (k === FLASH) this.marcarFlash(who);
      this.gastar(who, k);
    },

    marcarTurbo: function (idx) {
      var s = this.estado(idx);
      if (s) { s.turbo = H.TURBO_TICKS; s.chispa = 0; }
    },

    marcarFlash: function (idx) {
      var s = this.estado(idx);
      if (s) s.flash = H.FLASH_SHOW;
    },

    marcarDientes: function (idx) {
      var s = this.estado(idx);
      if (s) s.dientes = H.BITE_SHOW;
    },

    /* =========================================================
     * Q — MORDISCO
     * ========================================================= */
    /* El fantasma mordible más cercano, o null. No entran los que están en
     * la casa, los que están saliendo por la puerta ni los que ya son un
     * par de ojos volviendo: a esos no hay nada que morder. */
    presa: function (G, idx) {
      var p = G.pacs[idx];
      if (!p) return null;
      var px = p.tileX(), py = p.tileY();
      var mejor = null, mejorD = Infinity;
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!g) continue;
        if (g.mode === 'house' || g.mode === 'entering' || g.mode === 'eyes') continue;
        var dx = distCol(g.tileX(), px);
        var dy = Math.abs(g.tileY() - py);
        if (dx > H.BITE_TILES || dy > H.BITE_TILES) continue;
        var d = dx * dx + dy * dy;      // el más pegado, si hay dos a tiro
        if (d < mejorD) { mejorD = d; mejor = g; }
      }
      return mejor;
    },

    /* Gira a Pac-Man hacia lo que acaba de morder. Con el fantasma en la
     * misma casilla no hay hacia dónde mirar, así que se queda como está.
     * Se toca también nextDir: si no, el rumbo pedido de antes le daría la
     * vuelta al tick siguiente y el mordisco no se vería. */
    mirarHacia: function (p, g) {
      var dx = g.x - p.x, dy = g.y - p.y;
      // por el túnel el fantasma puede estar "al otro lado" del laberinto
      var ancho = CFG.COLS * T;
      if (dx > ancho / 2) dx -= ancho;
      else if (dx < -ancho / 2) dx += ancho;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      if (Math.abs(dx) >= Math.abs(dy)) {
        p.dir = (dx > 0) ? CFG.DIR.RIGHT : CFG.DIR.LEFT;
      } else {
        p.dir = (dy > 0) ? CFG.DIR.DOWN : CFG.DIR.UP;
      }
      p.nextDir = p.dir;
    },

    /* soloVisual: el invitado enseña los dientes al instante y deja que el
     * anfitrión decida de verdad; así no se ven fantasmas que resucitan. */
    mordisco: function (G, idx, soloVisual) {
      var g = this.presa(G, idx);
      if (!g) return false;                 // sin nadie a tiro no se gasta
      var p = G.pacs[idx];
      this.mirarHacia(p, g);
      this.marcarDientes(idx);
      if (soloVisual) return true;
      /* Fuera del modo azul cada mordisco vale lo mismo (200): la escalera
       * de 200-400-800-1600 es de la superpastilla, y encadenarla a golpe
       * de tecla convertiría la partida en una cuenta de puntos regalados.
       * Con los fantasmas ya azules, el mordisco entra en la cadena que
       * hubiera, que para eso te has ganado la superpastilla. */
      if (G.frightTicks <= 0) G.chainIndex = 0;
      G.eatGhost(g, idx);
      return true;
    },

    /* =========================================================
     * W — TURBO
     * ========================================================= */
    turbo: function (G, idx) {
      this.marcarTurbo(idx);
      return true;
    },

    /* Multiplicador de velocidad del jugador idx (1 si no hay turbo).
     * Lo consulta Game.pacSpeedPx. */
    multVel: function (idx) {
      return this.conTurbo(idx) ? H.TURBO_MULT : 1;
    },

    /* =========================================================
     * E — FLASH
     * ========================================================= */
    /* Casilla de aterrizaje: la más lejana de las FLASH_TILES de delante
     * que sea pisable. Si ninguna lo es (de cara a la pared del borde, por
     * ejemplo), devuelve null y la habilidad ni sale ni se gasta. */
    destino: function (G, idx) {
      var p = G.pacs[idx];
      if (!p) return null;
      var v = CFG.DIR_V[p.dir];
      if (!v) return null;
      var cx = p.tileX(), cy = p.tileY();
      var elegido = null;
      for (var n = 1; n <= H.FLASH_TILES; n++) {
        var col = CFG.wrapCol(cx + v.x * n);
        var row = cy + v.y * n;
        if (row < 0 || row >= CFG.ROWS) break;      // por arriba y por abajo no hay túnel
        if (aterrizable(col, row)) elegido = { col: col, row: row, n: n };
      }
      return elegido;
    },

    flash: function (G, idx) {
      var d = this.destino(G, idx);
      if (!d) return false;
      var p = G.pacs[idx];
      var v = CFG.DIR_V[p.dir];
      var cx = p.tileX(), cy = p.tileY();
      /* Se come lo que haya por el camino, casilla a casilla y en orden:
       * si en medio hay una superpastilla, los fantasmas se asustan ahí
       * mismo, no al aterrizar. Solo cuenta lo que se simula aquí: el
       * Pac-Man ajeno se lo come su dueño y llega por red. */
      if (G.isLocalAuth(idx)) {
        for (var n = 1; n <= d.n; n++) {
          G.eatAt(CFG.wrapCol(cx + v.x * n), cy + v.y * n, p);
        }
      }
      p.x = d.col * T + T / 2;
      p.y = d.row * T + T / 2;
      /* El frenazo de haber comido no se arrastra al otro lado: el flash es
       * un salto, y salir del salto parado se siente roto. */
      p.pauseTicks = 0;
      this.marcarFlash(idx);
      return true;
    },

    /* =========================================================
     * R — GRITO
     * ========================================================= */
    grito: function (G, idx, soloVisual) {
      if (soloVisual) return true;      // lo reparte el anfitrión
      G.triggerFright(H.SHOUT_SECS);
      return true;
    }
  };

  /* Nombres largos, por si hacen falta fuera */
  Hab.MORDISCO = MORDISCO;
  Hab.TURBO = TURBO;
  Hab.FLASH = FLASH;
  Hab.GRITO = GRITO;

  window.PM.Hab = Hab;
})();
