/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/pacman.js
 * Entidad del jugador. Define window.PM.Pacman
 * Movimiento por centros de casilla, búfer de giro y giro
 * anticipado (cornering) al estilo arcade.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var T = CFG.TILE;

  /* id: 0 = jugador 1, 1 = jugador 2 (en modos de dos jugadores) */
  function Pacman(id) {
    this.id = id || 0;
    this.lives = 0;      // vidas propias (modo 'individual'; las gestiona game.js)
    this.out = false;    // sin vidas: queda de espectador
    this.reset();
  }

  /* start opcional: { x, y (casillas), dir }; por defecto la posición clásica */
  Pacman.prototype.reset = function (start) {
    var s = start || CFG.START.pac;
    this.x = s.x * T + T / 2;      // px (coordenadas del laberinto)
    this.y = s.y * T + T / 2;
    this.dir = (s.dir === undefined) ? CFG.DIR.LEFT : s.dir;
    this.nextDir = this.dir;       // búfer del último rumbo pedido
    this.moving = false;
    this.pauseTicks = 0;           // pausa por comer (1 punto / 3 energizante)
    this.mouthCounter = 0;
    this.mouthPhase = 2;           // 0 cerrada, 1 media, 2 abierta
    /* muerte propia: en dos jugadores solo se congela este Pac-Man,
     * la partida sigue para el otro (lo lleva game.js) */
    this.dying = false;
    this.deathPhase = 0;           // 0 congelado, 1 animación
    this.deathTicks = 0;
    this.deathOk = false;          // invitado: el anfitrión confirmó la muerte
    this.safeTicks = 0;            // invulnerable al reaparecer en marcha
    /* Por dónde ha pasado, para las skins con estela (COMETA, RASTRO,
     * ESCUADRA): así la estela dobla las esquinas con él en vez de salir
     * recta hacia atrás. Y la velocidad suavizada, para que la estela crezca
     * al correr más (turbo, niveles altos) y se recoja al pararse. */
    this.huella = [];
    this.velPx = 0;
    /* Lo andado en total y dónde fue el último giro, en la misma medida que
     * la huella: los EFECTOS de la tienda dejan sus partículas en puntos fijos
     * del camino (recorrido) y CHISPAS estalla al girar (giroEn). */
    this.recorrido = 0;
    this.giroEn = -1;
  };

  /* Cuánto cabe en la huella: ~1 tick por punto, sobra para la estela más
   * larga (RASTRO a toda velocidad) */
  var HUELLA_MAX = 160;
  /* Un salto de más de esto entre dos ticks no es andar: es el túnel, el
   * FLASH o una corrección de red. Ahí la huella se tira, que si no la
   * estela cruzaría el laberinto de lado a lado. */
  var HUELLA_SALTO = 12;

  Pacman.prototype.anotarHuella = function () {
    var h = this.huella;
    var ult = h.length ? h[h.length - 1] : null;
    if (ult) {
      var dd = Math.abs(this.x - ult.x) + Math.abs(this.y - ult.y);
      if (dd > HUELLA_SALTO) h.length = 0;
      else if (dd < 0.25) {
        if (ult.d !== this.dir) this.giroEn = this.recorrido;
        ult.d = this.dir;
        return;
      } else {
        this.recorrido += dd;
        if (ult.d !== this.dir) this.giroEn = this.recorrido;
      }
    }
    h.push({ x: this.x, y: this.y, d: this.dir });
    if (h.length > HUELLA_MAX) h.shift();
  };

  /* Punto del camino a `dist` px por detrás (coordenadas del laberinto).
   * Si la huella no llega tan lejos, se queda en lo más viejo que recuerda:
   * la estela nace con Pac-Man parado encima (al salir, tras el túnel) y se
   * va alargando según anda, en vez de aparecer ya estirada hacia la nada. */
  Pacman.prototype.atras = function (dist) {
    var h = this.huella;
    var cx = this.x, cy = this.y, cd = this.dir;
    var llevo = 0;
    for (var i = h.length - 1; i >= 0; i--) {
      var p = h[i];
      var seg = Math.abs(cx - p.x) + Math.abs(cy - p.y);
      if (seg > 0 && llevo + seg >= dist) {
        var k = (dist - llevo) / seg;
        return { x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k, d: p.d };
      }
      llevo += seg;
      cx = p.x; cy = p.y; cd = p.d;
    }
    return { x: cx, y: cy, d: cd };
  };

  Pacman.prototype.tileX = function () { return Math.floor(this.x / T); };
  Pacman.prototype.tileY = function () { return Math.floor(this.y / T); };

  /* Centro de la casilla actual */
  function centerOf(v) { return Math.floor(v / T) * T + T / 2; }

  /* ¿Puede avanzar desde la casilla (cx,cy) en la dirección d? */
  function canGo(cx, cy, d) {
    var v = CFG.DIR_V[d];
    var nx = cx + v.x, ny = cy + v.y;
    if (nx < 0 || nx >= CFG.COLS) {
      if (cy === CFG.TUNNEL_ROW) nx = CFG.wrapCol(nx);   // túnel: envolver
      else return false;
    }
    return CFG.isOpen(nx, ny, false);
  }

  Pacman.prototype.setDesiredDir = function (d) {
    this.nextDir = d;
  };

  /* speedPx: px por tick, ya resuelto por game.js (tablas + multiplicadores) */
  Pacman.prototype.update = function (speedPx) {
    if (this.pauseTicks > 0) {
      this.pauseTicks--;
      return;
    }
    this.pasoHuella(speedPx);
  };

  /* El movimiento de verdad; update() lo envuelve para apuntar la huella */
  Pacman.prototype.mover = function (speedPx) {
    var d = this.dir, nd = this.nextDir;
    var cx = this.tileX(), cy = this.tileY();
    var ccx = centerOf(this.x), ccy = centerOf(this.y);
    var distC;

    // --- Intento de giro ---
    if (nd !== d && nd !== CFG.DIR.NONE) {
      var reverse = (nd === CFG.OPP[d]);
      if (reverse) {
        // marcha atrás: siempre permitida al instante
        this.dir = nd;
        d = nd;
      } else if (canGo(cx, cy, nd)) {
        // giro perpendicular: legal en el centro; anticipado hasta 4 px antes
        var axisPos = (d === CFG.DIR.LEFT || d === CFG.DIR.RIGHT) ? this.x : this.y;
        var axisCtr = (d === CFG.DIR.LEFT || d === CFG.DIR.RIGHT) ? ccx : ccy;
        var v = CFG.DIR_V[d];
        var toward = (d === CFG.DIR.LEFT || d === CFG.DIR.RIGHT) ? v.x : v.y;
        distC = (axisCtr - axisPos) * toward;   // >0: aún no llega al centro
        if (distC <= CFG.CORNER_PX) {
          // gira: encaja en el centro de la casilla (ventaja de esquina)
          this.x = ccx;
          this.y = ccy;
          this.dir = nd;
          d = nd;
        }
      }
    }

    // --- Avance ---
    var vv = CFG.DIR_V[d];
    var blocked = false;
    if (!canGo(cx, cy, d)) {
      // no cruzar el centro de la casilla hacia un muro
      var pos = (d === CFG.DIR.LEFT || d === CFG.DIR.RIGHT) ? this.x : this.y;
      var ctr = (d === CFG.DIR.LEFT || d === CFG.DIR.RIGHT) ? ccx : ccy;
      var t2 = (d === CFG.DIR.LEFT || d === CFG.DIR.RIGHT) ? vv.x : vv.y;
      var remain = (ctr - pos) * t2;
      if (remain <= 0) {
        this.x = ccx; this.y = ccy;
        blocked = true;
      } else if (remain <= speedPx) {
        this.x = ccx; this.y = ccy;
        blocked = true;
      }
    }
    if (!blocked) {
      this.x += vv.x * speedPx;
      this.y += vv.y * speedPx;
      // encarrilar el eje perpendicular
      if (vv.x !== 0) this.y = ccy; else this.x = ccx;
      // túnel: envolver
      if (this.x < 0) this.x += CFG.COLS * T;
      else if (this.x >= CFG.COLS * T) this.x -= CFG.COLS * T;
      this.moving = true;
    } else {
      this.moving = false;
    }

    // --- Boca: anima ~cada 2 ticks mientras se mueve ---
    if (this.moving) {
      this.mouthCounter++;
      if (this.mouthCounter >= 2) {
        this.mouthCounter = 0;
        this.mouthPhase = (this.mouthPhase + 1) % 4;
      }
    }
  };

  Pacman.prototype.pasoHuella = function (speedPx) {
    this.mover(speedPx);
    // velocidad suavizada: al pararse cae a cero poco a poco
    this.velPx += ((this.moving ? speedPx : 0) - this.velPx) * 0.25;
    this.anotarHuella();
  };

  /* Fase visible de la boca (0,1,2,1 cíclico) */
  Pacman.prototype.visibleMouth = function () {
    return [0, 1, 2, 1][this.mouthPhase];
  };

  /* extra (opcional): lo que necesitan las skins animadas, ver
   * Sprites.drawPacman */
  Pacman.prototype.draw = function (ctx, color, skin, extra) {
    window.PM.Sprites.drawPacman(ctx, this.x, this.y + CFG.MAZE_Y,
      this.dir, this.visibleMouth(), color, skin, extra);
  };

  window.PM.Pacman = Pacman;
})();
