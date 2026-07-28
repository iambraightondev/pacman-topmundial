/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/ghost.js
 * IA de fantasmas con fidelidad arcade. Define window.PM.Ghost
 *
 * - Decisión SOLO en centros de casilla: dirección legal (sin
 *   marcha atrás) que minimiza la distancia euclídea desde la
 *   casilla candidata al objetivo; desempate ARRIBA > IZQUIERDA >
 *   ABAJO > DERECHA.
 * - Inversión forzada al cambiar dispersión<->persecución o al
 *   entrar en modo asustado.
 * - Zonas sin ARRIBA en (12,13),(15,13),(12,25),(15,25)
 *   (ignoradas por asustado/ojos).
 * - Bug del desbordamiento de Pinky/Inky con Pac-Man mirando
 *   ARRIBA (objetivo también desplazado a la izquierda).
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var T = CFG.TILE;
  var D = CFG.DIR;

  /* id: 0 blinky, 1 pinky, 2 inky, 3 clyde */
  function Ghost(id) {
    this.id = id;
    this.name = CFG.GHOSTS[id].name;
    this.color = CFG.GHOSTS[id].color;
    this.scatter = CFG.GHOSTS[id].scatter;
    this.resetForLevel();
  }

  /* mode: 'house' (botando dentro), 'leaving' (saliendo),
   *       'normal' (dispersión/persecución según juego),
   *       'eyes' (vuelve a casa), 'entering' (bajando a casa) */
  Ghost.prototype.resetForLevel = function () {
    var s = CFG.START[this.name];
    this.x = s.x * T + T / 2;
    this.y = s.y * T + T / 2;
    this.homeX = this.x;                 // hueco propio dentro de la casa
    this.dir = (this.id === 0) ? D.LEFT : D.UP;
    this.mode = (this.id === 0) ? 'normal' : 'house';
    this.frightened = false;
    this.pendingReverse = false;
    this.dotCounter = 0;                 // contador personal de salida
    this.bobDir = (this.id === 2) ? 1 : -1;
    this.skirtCounter = 0;
    this.skirtPhase = 0;
    this.leavePhase = 0;                 // 0: centrar x, 1: subir
  };

  Ghost.prototype.tileX = function () { return Math.floor(this.x / T); };
  Ghost.prototype.tileY = function () { return Math.floor(this.y / T); };

  Ghost.prototype.inTunnelSlow = function () {
    if (this.tileY() !== CFG.TUNNEL_ROW) return false;
    var c = this.tileX();
    for (var i = 0; i < CFG.TUNNEL_SLOW.length; i++) {
      if (c >= CFG.TUNNEL_SLOW[i][0] && c <= CFG.TUNNEL_SLOW[i][1]) return true;
    }
    return false;
  };

  /* ---------- Objetivos (casillas; pueden quedar fuera del mapa) ---------- */
  /* game aporta: pacTile {x,y}, pacDir, blinkyTile {x,y}, globalMode
   * ('scatter'|'chase'), elroy (0|1|2) */
  Ghost.prototype.targetTile = function (game) {
    if (this.mode === 'eyes') {
      return { x: 13.5, y: 11 };   // sobre la puerta
    }
    var mode = game.globalMode;
    // Cruise Elroy: Blinky ignora la dispersión
    if (this.id === 0 && game.elroy > 0) mode = 'chase';
    if (mode === 'scatter') return this.scatter;

    var p = game.pacTile, pd = game.pacDir;
    var v = CFG.DIR_V[pd];
    switch (this.id) {
      case 0:  // Blinky: casilla de Pac-Man
        return { x: p.x, y: p.y };
      case 1: { // Pinky: 4 por delante; bug: ARRIBA => 4 arriba y 4 a la izq.
        var tx = p.x + v.x * 4, ty = p.y + v.y * 4;
        if (pd === D.UP) tx -= 4;
        return { x: tx, y: ty };
      }
      case 2: { // Inky: doble del vector Blinky->casilla 2 por delante (mismo bug)
        var mx = p.x + v.x * 2, my = p.y + v.y * 2;
        if (pd === D.UP) mx -= 2;
        var b = game.blinkyTile;
        return { x: b.x + 2 * (mx - b.x), y: b.y + 2 * (my - b.y) };
      }
      case 3: { // Clyde: lejos (>8) persigue; cerca, su esquina
        var dx = p.x - this.tileX(), dy = p.y - this.tileY();
        if (Math.sqrt(dx * dx + dy * dy) > CFG.CLYDE_SHY_DIST) return { x: p.x, y: p.y };
        return this.scatter;
      }
    }
    return this.scatter;
  };

  /* ---------- Legalidad de paso ---------- */
  Ghost.prototype.canEnter = function (col, row) {
    var allowDoor = (this.mode === 'eyes' || this.mode === 'entering' ||
                     this.mode === 'leaving');
    if (col < 0 || col >= CFG.COLS) {
      if (row === CFG.TUNNEL_ROW) col = CFG.wrapCol(col);
      else return false;
    }
    return CFG.isOpen(col, row, allowDoor);
  };

  /* ---------- Decisión en el centro de casilla ---------- */
  Ghost.prototype.decide = function (game) {
    var cx = this.tileX(), cy = this.tileY();
    var backDir = CFG.OPP[this.dir];
    var isFright = this.frightened && this.mode === 'normal';
    var candidates = [];
    var i, d, v, nx, ny;

    for (i = 0; i < CFG.DIR_PRIORITY.length; i++) {
      d = CFG.DIR_PRIORITY[i];                   // orden UP, LEFT, DOWN, RIGHT
      if (d === backDir) continue;               // prohibido invertir
      // Zonas sin ARRIBA (solo dispersión/persecución; no asustado/ojos)
      if (d === D.UP && !isFright && this.mode === 'normal' &&
          CFG.isNoUpTile(cx, cy)) continue;
      v = CFG.DIR_V[d];
      nx = cx + v.x; ny = cy + v.y;
      if (!this.canEnter(nx, ny)) continue;
      candidates.push(d);
    }
    if (candidates.length === 0) return backDir; // callejón: única salida

    if (isFright) {
      // pseudoaleatorio: prueba una dirección al azar; si no es válida,
      // recorre arriba, izquierda, abajo, derecha
      var r = Math.floor(Math.random() * 4);
      if (candidates.indexOf(r) !== -1) return r;
      for (i = 0; i < CFG.DIR_PRIORITY.length; i++) {
        if (candidates.indexOf(CFG.DIR_PRIORITY[i]) !== -1) return CFG.DIR_PRIORITY[i];
      }
      return candidates[0];
    }

    // Distancia euclídea mínima de la casilla candidata al objetivo;
    // el orden de iteración UP>LEFT>DOWN>RIGHT resuelve los empates.
    var target = this.targetTile(game);
    var best = candidates[0], bestDist = Infinity;
    for (i = 0; i < candidates.length; i++) {
      d = candidates[i];
      v = CFG.DIR_V[d];
      nx = cx + v.x; ny = cy + v.y;
      var ddx = nx - target.x, ddy = ny - target.y;
      var dist = ddx * ddx + ddy * ddy;
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    return best;
  };

  /* ---------- Velocidad (px/tick), resuelta con las tablas ---------- */
  Ghost.prototype.speedPx = function (game) {
    var row = game.speedRow;
    var pct;
    if (this.mode === 'eyes' || this.mode === 'entering') {
      pct = CFG.EYES_PCT;
      return pct / 100 * CFG.BASE_SPEED;   // los ojos ignoran multiplicadores
    }
    if (this.mode === 'house' || this.mode === 'leaving') {
      pct = CFG.HOUSE_PCT;
      return pct / 100 * CFG.BASE_SPEED;
    }
    if (this.inTunnelSlow()) {
      pct = row.ghostTunnel;
    } else if (this.frightened) {
      pct = row.ghostFright;
    } else if (this.id === 0 && game.elroy === 2) {
      pct = row.ghost + CFG.ELROY2_BONUS;
    } else if (this.id === 0 && game.elroy === 1) {
      pct = row.ghost + CFG.ELROY1_BONUS;
    } else {
      pct = row.ghost;
    }
    var mult = game.ghostSpeedMult;
    pct = Math.min(pct * mult, CFG.SPEED_CLAMP * 100);
    return pct / 100 * CFG.BASE_SPEED;
  };

  /* ---------- Actualización por tick ---------- */
  Ghost.prototype.update = function (game) {
    var sp = this.speedPx(game);
    this.skirtCounter++;
    if (this.skirtCounter >= 8) { this.skirtCounter = 0; this.skirtPhase ^= 1; }

    switch (this.mode) {
      case 'house':    this.updateHouse(sp); break;
      case 'leaving':  this.updateLeaving(sp); break;
      case 'entering': this.updateEntering(sp); break;
      default:         this.updatePath(game, sp); break;   // normal / eyes
    }
  };

  /* Botar arriba/abajo dentro de la casa */
  Ghost.prototype.updateHouse = function (sp) {
    if (this.pendingReverse) { this.pendingReverse = false; this.bobDir = -this.bobDir; }
    var cy = CFG.HOUSE.centerY;
    this.y += this.bobDir * sp;
    if (this.y < cy - 3) { this.y = cy - 3; this.bobDir = 1; }
    if (this.y > cy + 3) { this.y = cy + 3; this.bobDir = -1; }
    this.dir = this.bobDir < 0 ? D.UP : D.DOWN;
  };

  /* Salir: centrar la x, subir por la puerta hasta (13.5, 11) */
  Ghost.prototype.updateLeaving = function (sp) {
    this.pendingReverse = false;
    var ex = CFG.HOUSE.exitX, ey = CFG.HOUSE.exitY;
    if (this.leavePhase === 0) {
      // primero, alinear con el centro de la casa
      if (Math.abs(this.x - ex) <= sp) {
        this.x = ex;
        this.y = CFG.HOUSE.centerY;
        this.leavePhase = 1;
      } else {
        this.dir = (this.x < ex) ? D.RIGHT : D.LEFT;
        this.x += CFG.DIR_V[this.dir].x * sp;
      }
      return;
    }
    this.dir = D.UP;
    this.y -= sp;
    if (this.y <= ey) {
      this.y = ey;
      this.x = ex;
      this.mode = 'normal';
      this.leavePhase = 0;
      this.dir = D.LEFT;
    }
  };

  /* Ojos entrando: bajar por la puerta hasta el centro; luego re-salir */
  Ghost.prototype.updateEntering = function (sp) {
    var ex = CFG.HOUSE.exitX, cy = CFG.HOUSE.centerY;
    this.dir = D.DOWN;
    this.y += sp;
    this.x = ex;
    if (this.y >= cy) {
      this.y = cy;
      this.frightened = false;
      this.mode = 'leaving';       // vuelve a salir en el modo vigente
      this.leavePhase = 0;
    }
  };

  /* Movimiento por pasillos: normal y ojos */
  Ghost.prototype.updatePath = function (game, sp) {
    // Ojos llegando a la puerta => entrar
    if (this.mode === 'eyes') {
      var ex = CFG.HOUSE.exitX, ey = CFG.HOUSE.exitY;
      if (Math.abs(this.x - ex) <= sp + 0.5 && Math.abs(this.y - ey) <= sp + 0.5) {
        this.x = ex; this.y = ey;
        this.mode = 'entering';
        return;
      }
    }

    var remaining = sp;
    var guard = 0;
    while (remaining > 0.0001 && guard++ < 6) {
      var cx = this.tileX(), cy = this.tileY();
      var ccx = cx * T + T / 2, ccy = cy * T + T / 2;
      var v = CFG.DIR_V[this.dir];
      var horizontal = (v.x !== 0);
      var pos = horizontal ? this.x : this.y;
      var ctr = horizontal ? ccx : ccy;
      var toward = horizontal ? v.x : v.y;
      var distToCenter = (ctr - pos) * toward;   // >0 si el centro está delante

      if (distToCenter > 0) {
        // avanzar hasta el centro como máximo
        var step = Math.min(distToCenter, remaining);
        this.x += v.x * step;
        this.y += v.y * step;
        remaining -= step;
        if (step >= distToCenter) { this.x = ccx; this.y = ccy; }
        // la siguiente vuelta del bucle decidirá en el centro
      } else {
        // en el centro o pasado: decidir y avanzar hacia la casilla siguiente
        if (distToCenter === 0) this.applyDecision(game);
        v = CFG.DIR_V[this.dir];
        this.x += v.x * remaining;
        this.y += v.y * remaining;
        // encarrilar el eje perpendicular
        if (v.x !== 0) this.y = ccy; else this.x = ccx;
        remaining = 0;
      }
      // túnel: envolver
      if (this.x < 0) this.x += CFG.COLS * T;
      else if (this.x >= CFG.COLS * T) this.x -= CFG.COLS * T;
    }
  };

  Ghost.prototype.applyDecision = function (game) {
    if (this.pendingReverse && this.mode === 'normal') {
      this.dir = CFG.OPP[this.dir];
      this.pendingReverse = false;
      return;
    }
    this.dir = this.decide(game);
  };

  /* Comido: pasa a ojos */
  Ghost.prototype.eaten = function () {
    this.frightened = false;
    this.mode = 'eyes';
    this.pendingReverse = false;
  };

  /* Reaparición tras perder una vida (Blinky fuera, resto dentro) */
  Ghost.prototype.resetAfterDeath = function () {
    var s = CFG.START[this.name];
    this.x = s.x * T + T / 2;
    this.y = s.y * T + T / 2;
    this.dir = (this.id === 0) ? D.LEFT : D.UP;
    this.mode = (this.id === 0) ? 'normal' : 'house';
    this.frightened = false;
    this.pendingReverse = false;
    this.bobDir = (this.id === 2) ? 1 : -1;
    this.leavePhase = 0;
    // el contador personal NO se reinicia (regla arcade: se usa el global)
  };

  Ghost.prototype.draw = function (ctx, game) {
    var mode = 'normal';
    var flashOn = false;
    if (this.mode === 'eyes' || this.mode === 'entering') {
      mode = 'eyes';
    } else if (this.frightened) {
      mode = 'fright';
      flashOn = game.frightFlashOn;
    }
    window.PM.Sprites.drawGhost(ctx, this.x, this.y + CFG.MAZE_Y,
      this.dir, this.id, mode, this.skirtPhase, flashOn);
  };

  window.PM.Ghost = Ghost;
})();
