/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/game.js
 * Máquina de estados + bucle de paso fijo (60 Hz, acumulador).
 * Define window.PM.Game
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var T = CFG.TILE;
  var D = CFG.DIR;

  var Game = {
    /* estado general */
    state: 'MENU',    // MENU | READY | PLAYING | DYING | LEVEL_DONE | GAME_OVER
    paused: false,

    /* partida */
    level: 1,
    score: 0,
    highScore: 0,
    lives: 3,
    extraLifeAwarded: false,

    /* laberinto */
    pellets: null,      // matriz [fila][col] => '.'|'o'|null
    dotsLeft: 0,
    dotsEaten: 0,

    /* entidades */
    pac: null,
    ghosts: [],

    /* calendario dispersión/persecución */
    schedule: [],
    schedIndex: 0,
    schedTicks: 0,
    globalMode: 'scatter',

    /* modo asustado */
    frightTicks: 0,
    frightFlashes: 0,
    frightFlashOn: false,
    chainIndex: 0,

    /* casa de fantasmas */
    globalActive: false,
    globalCounter: 0,
    failsafeTicks: 0,

    /* Elroy */
    elroy: 0,
    elroyBlocked: false,

    /* fruta */
    fruitActive: false,
    fruitTicks: 0,
    fruitInfo: null,

    /* congelaciones y fases */
    eatFreezeTicks: 0,
    hiddenGhost: -1,
    phaseTicks: 0,
    readyTicks: 0,
    dyingPhase: 0,
    levelPhase: 0,

    /* varios */
    popups: [],
    tick: 0,
    speedRow: null,
    ghostSpeedMult: 1,
    pacSpeedMult: 1,
    frightMult: 1,
    currentLoop: 'none',
    energizerOn: true,
    energizerTicks: 0,

    /* contexto para la IA (se rellena por tick) */
    pacTile: { x: 0, y: 0 },
    pacDir: D.LEFT,
    blinkyTile: { x: 0, y: 0 },

    /* render */
    canvas: null, ctx: null,
    mazeBlue: null, mazeWhite: null,
    wallFlashOn: false,

    /* ---------------------------------------------------------
     * Inicialización
     * --------------------------------------------------------- */
    init: function (canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.setTransform(CFG.SCALE, 0, 0, CFG.SCALE, 0, 0);

      this.assertPellets();
      this.mazeBlue = this.buildMazeCanvas(CFG.COLORS.wall);
      this.mazeWhite = this.buildMazeCanvas(CFG.COLORS.wallFlash);

      this.highScore = 0;
      try {
        var hs = localStorage.getItem(CFG.HIGHSCORE_KEY);
        if (hs !== null) this.highScore = parseInt(hs, 10) || 0;
      } catch (e) { /* almacenamiento no disponible */ }

      this.pac = new window.PM.Pacman();
      this.ghosts = [];
      for (var i = 0; i < 4; i++) this.ghosts.push(new window.PM.Ghost(i));
      this.loadPellets();

      this.startLoop();
    },

    assertPellets: function () {
      var n = 0;
      for (var r = 0; r < CFG.ROWS; r++) {
        for (var c = 0; c < CFG.COLS; c++) {
          var ch = CFG.MAZE[r].charAt(c);
          if (ch === '.' || ch === 'o') n++;
        }
      }
      if (n !== CFG.PELLET_TOTAL) {
        console.error('ERROR: el laberinto tiene ' + n +
          ' pastillas; se esperaban ' + CFG.PELLET_TOTAL);
      }
    },

    /* ---------------------------------------------------------
     * Ajustes activos (contrato PM.settings)
     * --------------------------------------------------------- */
    settings: function () {
      return window.PM.settings || CFG.DEFAULT_SETTINGS;
    },

    /* ---------------------------------------------------------
     * Flujo de partida
     * --------------------------------------------------------- */
    newGame: function () {
      var s = this.settings();
      this.ghostSpeedMult = s.ghostSpeedMult;
      this.pacSpeedMult = s.pacSpeedMult;
      this.frightMult = s.frightMult;
      this.lives = s.startLives;
      this.level = s.startLevel;
      this.score = 0;
      this.extraLifeAwarded = false;
      this.paused = false;
      this.resetLevel();
      // melodía de inicio (solo en partida nueva)
      var ms = CFG.INTRO_FALLBACK_MS;
      if (window.AudioSys) {
        var d = AudioSys.playIntro();
        if (d) ms = d;
      }
      this.enterReady(Math.round(ms / 1000 * 60));
    },

    resetLevel: function () {
      this.loadPellets();
      this.dotsEaten = 0;
      this.resetActors();
      this.schedule = CFG.schedule(this.level);
      this.speedRow = CFG.speedRow(this.level);
      this.schedIndex = 0;
      this.schedTicks = 0;
      this.globalMode = 'scatter';
      this.frightTicks = 0;
      this.chainIndex = 0;
      this.globalActive = false;
      this.globalCounter = 0;
      this.failsafeTicks = 0;
      this.elroy = 0;
      this.elroyBlocked = false;
      this.fruitActive = false;
      this.fruitInfo = CFG.fruitForLevel(this.level);
      this.popups = [];
      this.eatFreezeTicks = 0;
      this.hiddenGhost = -1;
      for (var i = 0; i < 4; i++) this.ghosts[i].dotCounter = 0;
    },

    resetActors: function () {
      this.pac.reset();
      for (var i = 0; i < 4; i++) this.ghosts[i].resetForLevel();
    },

    respawn: function () {
      // tras perder una vida: pastillas intactas, contador global activo
      this.pac.reset();
      for (var i = 0; i < 4; i++) this.ghosts[i].resetAfterDeath();
      this.schedIndex = 0;
      this.schedTicks = 0;
      this.globalMode = 'scatter';
      this.frightTicks = 0;
      this.chainIndex = 0;
      this.globalActive = true;
      this.globalCounter = 0;
      this.failsafeTicks = 0;
      this.elroyBlocked = true;    // Elroy en pausa hasta que Clyde salga
      this.fruitActive = false;
      this.popups = [];
      this.eatFreezeTicks = 0;
      this.hiddenGhost = -1;
      this.enterReady(CFG.READY_TICKS);
    },

    enterReady: function (ticks) {
      this.state = 'READY';
      this.readyTicks = ticks;
      this.stopAllLoops();
    },

    loadPellets: function () {
      this.pellets = [];
      this.dotsLeft = 0;
      for (var r = 0; r < CFG.ROWS; r++) {
        var row = [];
        for (var c = 0; c < CFG.COLS; c++) {
          var ch = CFG.MAZE[r].charAt(c);
          if (ch === '.' || ch === 'o') { row.push(ch); this.dotsLeft++; }
          else row.push(null);
        }
        this.pellets.push(row);
      }
    },

    toMenu: function () {
      this.state = 'MENU';
      this.paused = false;
      this.stopAllLoops();
      this.loadPellets();
      if (window.PM.UI) window.PM.UI.showMenu();
    },

    togglePause: function () {
      if (this.state !== 'PLAYING' && this.state !== 'READY') return;
      this.paused = !this.paused;
      if (this.paused) this.stopAllLoops();
    },

    setPacDir: function (d) {
      this.pac.setDesiredDir(d);
    },

    /* ---------------------------------------------------------
     * Bucle principal: paso fijo 60 Hz con acumulador
     * --------------------------------------------------------- */
    startLoop: function () {
      var self = this;
      var last = performance.now();
      var acc = 0;
      var STEP = 1000 / 60;
      function frame(now) {
        var dt = now - last;
        last = now;
        if (dt > 100) dt = 100;   // pestaña en segundo plano
        acc += dt;
        while (acc >= STEP) {
          self.step();
          acc -= STEP;
        }
        self.render();
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    },

    step: function () {
      this.tick++;
      this.energizerTicks++;
      if (this.energizerTicks >= 12) {          // parpadeo ~0.2 s
        this.energizerTicks = 0;
        this.energizerOn = !this.energizerOn;
      }
      if (this.paused) return;

      switch (this.state) {
        case 'READY':      this.stepReady(); break;
        case 'PLAYING':    this.stepPlaying(); break;
        case 'DYING':      this.stepDying(); break;
        case 'LEVEL_DONE': this.stepLevelDone(); break;
        case 'GAME_OVER':  this.stepGameOver(); break;
      }
    },

    stepReady: function () {
      this.readyTicks--;
      if (this.readyTicks <= 0) {
        this.state = 'PLAYING';
      }
    },

    /* ---------------------------------------------------------
     * PLAYING
     * --------------------------------------------------------- */
    stepPlaying: function () {
      var i, g;

      /* congelación por fantasma comido */
      if (this.eatFreezeTicks > 0) {
        this.eatFreezeTicks--;
        for (i = this.popups.length - 1; i >= 0; i--) {
          if (--this.popups[i].ticks <= 0) this.popups.splice(i, 1);
        }
        if (this.eatFreezeTicks === 0) this.hiddenGhost = -1;
        return;
      }

      /* calendario dispersión/persecución (pausado en modo asustado) */
      if (this.frightTicks <= 0) {
        this.stepSchedule();
      } else {
        this.stepFright();
      }

      /* temporizador de socorro de la casa */
      this.failsafeTicks++;
      if (this.failsafeTicks >= CFG.houseFailsafe(this.level) * 60) {
        this.failsafeTicks = 0;
        var pref = this.preferredInside();
        if (pref) this.releaseGhost(pref);
      }
      /* salida por contador personal (cubre límites 0) */
      if (!this.globalActive) {
        var p2 = this.preferredInside();
        if (p2 && p2.dotCounter >= CFG.houseDotLimit(p2.name, this.level)) {
          this.releaseGhost(p2);
        }
      }

      /* Elroy */
      this.updateElroy();

      /* contexto de IA */
      this.pacTile = { x: this.pac.tileX(), y: this.pac.tileY() };
      this.pacDir = this.pac.dir;
      this.blinkyTile = { x: this.ghosts[0].tileX(), y: this.ghosts[0].tileY() };

      /* Pac-Man */
      this.pac.update(this.pacSpeedPx());
      this.eatAt(this.pac.tileX(), this.pac.tileY());

      /* fantasmas */
      for (i = 0; i < 4; i++) this.ghosts[i].update(this);

      /* fruta */
      if (this.fruitActive) {
        this.fruitTicks--;
        if (this.fruitTicks <= 0) this.fruitActive = false;
        else {
          var pty = this.pac.tileY(), ptx = this.pac.tileX();
          if (pty === CFG.START.fruit.y && (ptx === 13 || ptx === 14)) {
            this.fruitActive = false;
            this.addScore(this.fruitInfo.points);
            this.addPopup(CFG.START.fruit.x * T + T / 2,
              CFG.START.fruit.y * T + T / 2,
              this.fruitInfo.points, CFG.FRUIT_SCORE_S * 60);
            window.AudioSys && AudioSys.playEatFruit();
          }
        }
      }

      /* colisiones con fantasmas */
      var px = this.pac.tileX(), py = this.pac.tileY();
      for (i = 0; i < 4; i++) {
        g = this.ghosts[i];
        if (g.mode === 'house' || g.mode === 'entering') continue;
        if (g.tileX() !== px || g.tileY() !== py) continue;
        if (g.mode === 'eyes') continue;
        if (g.frightened) {
          this.eatGhost(g);
        } else {
          this.startDeath();
          return;
        }
      }

      /* puntuaciones emergentes */
      for (i = this.popups.length - 1; i >= 0; i--) {
        if (--this.popups[i].ticks <= 0) this.popups.splice(i, 1);
      }

      /* nivel completado */
      if (this.dotsLeft <= 0) {
        this.state = 'LEVEL_DONE';
        this.levelPhase = 0;
        this.phaseTicks = CFG.LEVEL_FREEZE_TICKS;
        this.stopAllLoops();
        return;
      }

      this.updateLoops();
    },

    stepSchedule: function () {
      if (this.schedIndex >= this.schedule.length) return;  // persecución eterna
      this.schedTicks++;
      if (this.schedTicks >= this.schedule[this.schedIndex] * 60) {
        this.schedTicks = 0;
        this.schedIndex++;
        this.globalMode = (this.schedIndex % 2 === 0) ? 'scatter' : 'chase';
        if (this.schedIndex >= this.schedule.length) this.globalMode = 'chase';
        this.forceReversal();
      }
    },

    stepFright: function () {
      this.frightTicks--;
      var flashSpan = this.frightFlashes * 2 * CFG.FLASH_PERIOD;
      if (this.frightTicks <= flashSpan) {
        this.frightFlashOn =
          (Math.floor(this.frightTicks / CFG.FLASH_PERIOD) % 2) === 0;
      } else {
        this.frightFlashOn = false;
      }
      if (this.frightTicks <= 0) {
        this.frightTicks = 0;
        this.frightFlashOn = false;
        for (var i = 0; i < 4; i++) this.ghosts[i].frightened = false;
      }
    },

    forceReversal: function () {
      for (var i = 0; i < 4; i++) {
        var g = this.ghosts[i];
        if (g.mode === 'normal' || g.mode === 'house') g.pendingReverse = true;
      }
    },

    /* ---------------------------------------------------------
     * Comer pastillas
     * --------------------------------------------------------- */
    eatAt: function (col, row) {
      if (row < 0 || row >= CFG.ROWS || col < 0 || col >= CFG.COLS) return;
      var ch = this.pellets[row][col];
      if (!ch) return;
      this.pellets[row][col] = null;
      this.dotsLeft--;
      this.dotsEaten++;
      this.failsafeTicks = 0;
      this.houseDotEaten();

      if (ch === '.') {
        this.addScore(CFG.DOT_POINTS);
        this.pac.pauseTicks = CFG.DOT_PAUSE;
      } else {
        this.addScore(CFG.ENERGIZER_POINTS);
        this.pac.pauseTicks = CFG.ENERGIZER_PAUSE;
        this.triggerFright();
      }
      window.AudioSys && AudioSys.playWaka();

      /* fruta a los 70 y 170 puntos comidos */
      if (CFG.FRUIT_DOTS.indexOf(this.dotsEaten) !== -1) {
        this.fruitActive = true;
        this.fruitTicks = Math.round(
          (CFG.FRUIT_MIN_S + Math.random() * (CFG.FRUIT_MAX_S - CFG.FRUIT_MIN_S)) * 60);
      }
    },

    triggerFright: function () {
      var fr = CFG.fright(this.level);
      var secs = fr.seconds * this.frightMult;
      this.chainIndex = 0;                       // la cadena se reinicia
      this.forceReversalFright();
      if (secs <= 0) return;                     // solo inversión, sin modo azul
      this.frightTicks = Math.round(secs * 60);
      this.frightFlashes = fr.flashes;
      this.frightFlashOn = false;
      for (var i = 0; i < 4; i++) {
        var g = this.ghosts[i];
        if (g.mode === 'eyes' || g.mode === 'entering') continue;
        g.frightened = true;
      }
    },

    forceReversalFright: function () {
      for (var i = 0; i < 4; i++) {
        var g = this.ghosts[i];
        if (g.mode === 'normal') g.pendingReverse = true;
      }
    },

    /* ---------------------------------------------------------
     * Casa de fantasmas: contadores de puntos
     * --------------------------------------------------------- */
    preferredInside: function () {
      // orden de preferencia: Pinky -> Inky -> Clyde
      for (var i = 1; i < 4; i++) {
        if (this.ghosts[i].mode === 'house') return this.ghosts[i];
      }
      return null;
    },

    houseDotEaten: function () {
      if (this.globalActive) {
        this.globalCounter++;
        var pinky = this.ghosts[1], inky = this.ghosts[2], clyde = this.ghosts[3];
        if (this.globalCounter === CFG.GLOBAL_LIMITS.pinky && pinky.mode === 'house') {
          this.releaseGhost(pinky);
        } else if (this.globalCounter === CFG.GLOBAL_LIMITS.inky && inky.mode === 'house') {
          this.releaseGhost(inky);
        } else if (this.globalCounter === CFG.GLOBAL_LIMITS.clyde) {
          if (clyde.mode === 'house') this.releaseGhost(clyde);
          this.globalActive = false;     // vuelta a contadores personales
          this.globalCounter = 0;
        }
      } else {
        var pref = this.preferredInside();
        if (pref) pref.dotCounter++;
        // la comprobación de salida se hace en stepPlaying
      }
    },

    releaseGhost: function (g) {
      if (g.mode === 'house') g.mode = 'leaving';
    },

    /* ---------------------------------------------------------
     * Elroy
     * --------------------------------------------------------- */
    updateElroy: function () {
      if (this.elroyBlocked) {
        if (this.ghosts[3].mode !== 'house') this.elroyBlocked = false;
        else { this.elroy = 0; return; }
      }
      var th = CFG.elroy(this.level);
      if (this.dotsLeft <= th.d2) this.elroy = 2;
      else if (this.dotsLeft <= th.d1) this.elroy = 1;
      else this.elroy = 0;
    },

    /* ---------------------------------------------------------
     * Velocidad de Pac-Man (px/tick)
     * --------------------------------------------------------- */
    pacSpeedPx: function () {
      var row = this.speedRow;
      var pct;
      if (this.frightTicks > 0) {
        pct = row.pacFright;
      } else {
        var col = this.pac.tileX(), fila = this.pac.tileY();
        var hasPellet = (fila >= 0 && fila < CFG.ROWS && col >= 0 &&
          col < CFG.COLS && this.pellets[fila][col]);
        pct = hasPellet ? row.pacDots : row.pac;
      }
      pct = Math.min(pct * this.pacSpeedMult, CFG.SPEED_CLAMP * 100);
      return pct / 100 * CFG.BASE_SPEED;
    },

    /* ---------------------------------------------------------
     * Comer fantasmas / morir
     * --------------------------------------------------------- */
    eatGhost: function (g) {
      var pts = CFG.GHOST_CHAIN[Math.min(this.chainIndex, 3)];
      this.chainIndex++;
      this.addScore(pts);
      this.addPopup(g.x, g.y, pts, CFG.EAT_FREEZE_TICKS);
      g.eaten();
      this.eatFreezeTicks = CFG.EAT_FREEZE_TICKS;
      this.hiddenGhost = g.id;
      window.AudioSys && AudioSys.playEatGhost();
    },

    startDeath: function () {
      this.state = 'DYING';
      this.dyingPhase = 0;
      this.phaseTicks = CFG.DEATH_FREEZE_TICKS;
      this.stopAllLoops();
    },

    stepDying: function () {
      this.phaseTicks--;
      if (this.phaseTicks > 0) return;
      if (this.dyingPhase === 0) {
        this.dyingPhase = 1;
        this.phaseTicks = CFG.DEATH_ANIM_TICKS;
        window.AudioSys && AudioSys.playDeath();
        return;
      }
      /* animación terminada */
      this.lives--;
      if (this.lives > 0) {
        this.respawn();
      } else {
        this.state = 'GAME_OVER';
        this.phaseTicks = CFG.GAMEOVER_TICKS;
        this.persistHighScore();
      }
    },

    stepGameOver: function () {
      this.phaseTicks--;
      if (this.phaseTicks <= 0) this.toMenu();
    },

    stepLevelDone: function () {
      this.phaseTicks--;
      if (this.phaseTicks > 0) return;
      if (this.levelPhase === 0) {
        this.levelPhase = 1;
        this.phaseTicks = CFG.LEVEL_FLASH_TICKS;
        return;
      }
      this.level++;
      this.resetLevel();
      this.enterReady(CFG.READY_TICKS);
    },

    /* ---------------------------------------------------------
     * Puntuación
     * --------------------------------------------------------- */
    addScore: function (pts) {
      var before = this.score;
      this.score += pts;
      if (!this.extraLifeAwarded && before < CFG.EXTRA_LIFE_AT &&
          this.score >= CFG.EXTRA_LIFE_AT) {
        this.extraLifeAwarded = true;
        this.lives++;
        window.AudioSys && AudioSys.playExtraLife();
      }
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.persistHighScore();
      }
    },

    persistHighScore: function () {
      try { localStorage.setItem(CFG.HIGHSCORE_KEY, String(this.highScore)); }
      catch (e) { /* sin almacenamiento */ }
    },

    addPopup: function (x, y, text, ticks) {
      this.popups.push({ x: x, y: y, text: text, ticks: ticks });
    },

    /* ---------------------------------------------------------
     * Sonido: bucles (retirada > asustado > sirena)
     * --------------------------------------------------------- */
    updateLoops: function () {
      if (!window.AudioSys) return;
      var desired = 'none';
      if (this.state === 'PLAYING' && !this.paused) {
        var eyes = false;
        for (var i = 0; i < 4; i++) {
          if (this.ghosts[i].mode === 'eyes' || this.ghosts[i].mode === 'entering') {
            eyes = true; break;
          }
        }
        if (eyes) desired = 'retreat';
        else if (this.frightTicks > 0) desired = 'fright';
        else desired = 'siren' + CFG.sirenStage(this.dotsLeft);
      }
      if (desired === this.currentLoop) return;
      /* apagar el anterior */
      if (this.currentLoop.indexOf('siren') === 0) AudioSys.stopSiren();
      else if (this.currentLoop === 'fright') AudioSys.stopFright();
      else if (this.currentLoop === 'retreat') AudioSys.stopRetreat();
      /* encender el nuevo */
      if (desired.indexOf('siren') === 0) AudioSys.startSiren(parseInt(desired.charAt(5), 10));
      else if (desired === 'fright') AudioSys.startFright();
      else if (desired === 'retreat') AudioSys.startRetreat();
      this.currentLoop = desired;
    },

    stopAllLoops: function () {
      if (window.AudioSys) {
        AudioSys.stopSiren();
        AudioSys.stopFright();
        AudioSys.stopRetreat();
      }
      this.currentLoop = 'none';
    },

    /* =========================================================
     * RENDER
     * ========================================================= */
    buildMazeCanvas: function (wallColor) {
      var cv = document.createElement('canvas');
      cv.width = CFG.NATIVE_W;
      cv.height = CFG.ROWS * T;
      var c = cv.getContext('2d');
      c.fillStyle = '#000000';
      c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = wallColor;
      c.lineWidth = 1;
      c.lineCap = 'round';
      c.beginPath();
      for (var r = 0; r < CFG.ROWS; r++) {
        for (var col = 0; col < CFG.COLS; col++) {
          if (CFG.MAZE[r].charAt(col) !== '#') continue;
          var x = col * T, y = r * T;
          // arista por cada lado que da a un pasillo
          if (this.isPath(col, r - 1)) { c.moveTo(x, y + 0.5); c.lineTo(x + T, y + 0.5); }
          if (this.isPath(col, r + 1)) { c.moveTo(x, y + T - 0.5); c.lineTo(x + T, y + T - 0.5); }
          if (this.isPath(col - 1, r)) { c.moveTo(x + 0.5, y); c.lineTo(x + 0.5, y + T); }
          if (this.isPath(col + 1, r)) { c.moveTo(x + T - 0.5, y); c.lineTo(x + T - 0.5, y + T); }
        }
      }
      c.stroke();
      /* puerta de la casa (rosa) */
      c.fillStyle = CFG.COLORS.door;
      c.fillRect(13 * T, 12 * T + 3, 2 * T, 2);
      return cv;
    },

    /* ¿la casilla es pasillo visible? (para dibujar aristas) */
    isPath: function (col, row) {
      if (row < 0 || row >= CFG.ROWS) return false;
      if (col < 0 || col >= CFG.COLS) return row === CFG.TUNNEL_ROW;
      var ch = CFG.MAZE[row].charAt(col);
      return ch !== '#';
    },

    render: function () {
      var ctx = this.ctx;
      var i;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CFG.NATIVE_W, CFG.NATIVE_H);

      /* laberinto (parpadea en LEVEL_DONE fase 1) */
      var mazeImg = this.mazeBlue;
      if (this.state === 'LEVEL_DONE' && this.levelPhase === 1) {
        // 4 destellos en ~2 s: período de 30 ticks
        var tt = CFG.LEVEL_FLASH_TICKS - this.phaseTicks;
        if (Math.floor(tt / 15) % 2 === 0) mazeImg = this.mazeWhite;
      }
      ctx.drawImage(mazeImg, 0, CFG.MAZE_Y);

      /* pastillas */
      ctx.fillStyle = CFG.COLORS.pellet;
      for (var r = 0; r < CFG.ROWS; r++) {
        for (var c2 = 0; c2 < CFG.COLS; c2++) {
          var ch = this.pellets[r][c2];
          if (!ch) continue;
          var cx = c2 * T + T / 2, cy = r * T + T / 2 + CFG.MAZE_Y;
          if (ch === '.') {
            ctx.fillRect(cx - 1, cy - 1, 2, 2);
          } else if (this.energizerOn) {
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      /* fruta activa */
      if (this.fruitActive) {
        window.PM.Sprites.drawFruit(ctx,
          CFG.START.fruit.x * T + T / 2,
          CFG.START.fruit.y * T + T / 2 + CFG.MAZE_Y,
          this.fruitInfo.id);
      }

      /* entidades según estado */
      var showActors = (this.state === 'READY' || this.state === 'PLAYING' ||
                        this.state === 'DYING' || this.state === 'LEVEL_DONE');
      if (showActors) {
        var hidePac = (this.eatFreezeTicks > 0) ||
                      (this.state === 'DYING' && this.dyingPhase === 1);
        var hideGhosts = (this.state === 'DYING' && this.dyingPhase === 1) ||
                         (this.state === 'LEVEL_DONE' && this.levelPhase === 1);
        if (!hideGhosts) {
          for (i = 0; i < 4; i++) {
            if (this.eatFreezeTicks > 0 && i === this.hiddenGhost) continue;
            this.ghosts[i].draw(ctx, this);
          }
        }
        if (!hidePac) {
          this.pac.draw(ctx, this.settings().pacColor);
        } else if (this.state === 'DYING' && this.dyingPhase === 1) {
          var t = 1 - this.phaseTicks / CFG.DEATH_ANIM_TICKS;
          window.PM.Sprites.drawPacmanDeath(ctx, this.pac.x,
            this.pac.y + CFG.MAZE_Y, t, this.settings().pacColor);
        }
      }

      /* puntuaciones emergentes */
      for (i = 0; i < this.popups.length; i++) {
        var pp = this.popups[i];
        window.PM.Sprites.drawScorePopup(ctx, pp.x, pp.y + CFG.MAZE_Y, pp.text);
      }

      this.renderHUD(ctx);
      this.renderStateText(ctx);
    },

    renderHUD: function (ctx) {
      var i;
      ctx.font = 'bold 8px monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = CFG.COLORS.text;

      ctx.textAlign = 'left';
      ctx.fillText('1UP', 20, 0);
      ctx.textAlign = 'center';
      ctx.fillText('HIGH SCORE', 112, 0);

      ctx.textAlign = 'right';
      var sc = (this.state === 'MENU') ? 0 : this.score;
      ctx.fillText(String(sc || 0), 56, 9);
      ctx.fillText(String(this.highScore || 0), 136, 9);

      /* vidas (mini Pac-Mans del color elegido) */
      var color = this.settings().pacColor;
      var livesShown = Math.max(0, this.lives - 1);
      if (this.state === 'MENU') livesShown = 0;
      for (i = 0; i < livesShown && i < 5; i++) {
        window.PM.Sprites.drawPacman(ctx, 18 + i * 16, 278, D.LEFT, 2, color);
      }

      /* frutas de los últimos <=7 niveles (abajo a la derecha) */
      if (this.state !== 'MENU') {
        var first = Math.max(1, this.level - 6);
        var x = CFG.NATIVE_W - 12;
        for (i = this.level; i >= first; i--) {
          window.PM.Sprites.drawFruit(ctx, x, 278, CFG.fruitForLevel(i).id);
          x -= 16;
        }
      }
    },

    renderStateText: function (ctx) {
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      var y = 17 * T + T / 2 + CFG.MAZE_Y;   // fila clásica bajo la casa
      if (this.state === 'READY') {
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = CFG.COLORS.ready;
        ctx.fillText('¡LISTO!', 112, y);
      } else if (this.state === 'GAME_OVER') {
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = CFG.COLORS.gameOver;
        ctx.fillText('GAME OVER', 112, y);
      }
      if (this.paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, CFG.NATIVE_W, CFG.NATIVE_H);
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = CFG.COLORS.text;
        ctx.fillText('PAUSA', 112, CFG.NATIVE_H / 2);
      }
    }
  };

  window.PM.Game = Game;
})();
