/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/game.js
 * Máquina de estados + bucle de paso fijo (60 Hz, acumulador).
 * Define window.PM.Game
 *
 * Modos de juego:
 *  - 1 jugador (clásico).
 *  - 2 jugadores en la misma máquina (J1 flechas, J2 WASD).
 *  - 2 jugadores online: el anfitrión (J1) simula la partida
 *    completa y emite instantáneas; el invitado (J2) simula su
 *    propio Pac-Man en local (sin lag de entrada) y refleja el
 *    resto del estado, con predicción para comer/morir.
 *
 * Reglas de dos jugadores: puntuación de EQUIPO (un marcador),
 * vidas compartidas (fondo común) o individuales según ajustes,
 * y cada fantasma persigue al jugador vivo más cercano
 * conservando su personalidad.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var T = CFG.TILE;
  var D = CFG.DIR;

  function r1(v) { return Math.round(v * 10) / 10; }

  var Game = {
    /* estado general */
    state: 'MENU',    // MENU | READY | PLAYING | DYING | LEVEL_DONE | GAME_OVER
    paused: false,

    /* partida */
    level: 1,
    score: 0,
    highScore: 0,      // récord del modo en curso (1 jugador o equipo)
    highScore1: 0,     // récord persistido de 1 jugador
    highScore2: 0,     // récord persistido de equipo (2 jugadores)
    lives: 3,          // fondo común (modo 'shared')
    livesMode: 'shared',
    extraLifeAwarded: false,

    /* jugadores */
    playerCount: 1,
    pacs: [],
    localIdx: 0,       // índice del jugador local (1 solo para el invitado online)
    dyingPlayer: 0,
    eaterIdx: 0,       // quién comió el último fantasma (queda oculto en la pausa)

    /* red */
    netRole: null,     // null | 'host' | 'guest'
    netColors: null,   // colores online [J1, J2]
    netNames: null,    // nombres online [J1, J2]
    netQueue: [],
    netWatch: 0,
    netNotice: null,   // { text, ticks } — aviso y vuelta al menú
    snapTimer: 0, snapCount: 0, posTimer: 0,
    outEaten: [],      // invitado: celdas comidas pendientes de enviar
    recentEaten: {},   // invitado: celdas comidas hace poco (conciliación)
    snapEaten: [],     // anfitrión: celdas comidas desde la última instantánea
    predictFreeze: 0,  // invitado: congelado esperando confirmación de muerte
    frightPredictTick: -9999,
    eatPredictTick: -9999,
    _lastSentDir: -2, _lastSentNext: -2,

    /* laberinto */
    pellets: null,      // matriz [fila][col] => '.'|'o'|null
    dotsLeft: 0,
    dotsEaten: 0,

    /* entidades */
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

    /* rendición y revancha (deben aceptar los dos jugadores) */
    vote: null,          // { kind:'surrender'|'rematch', role:'from'|'to', local, ticks }
    dlgPaused: false,    // la pausa la puso un diálogo, no un jugador
    overIdle: false,     // GAME OVER terminado: panel de revancha en pantalla
    lastOpts: null,      // opciones de la partida en curso (para la revancha)
    flash: null,         // { text, ticks } — aviso breve sobre el laberinto

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
    blinkyTile: { x: 0, y: 0 },

    /* render */
    canvas: null, ctx: null,
    mazeBlue: null, mazeWhite: null,
    wallFlashOn: false,

    /* bucle */
    loopLast: 0,
    loopAcc: 0,

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

      this.highScore1 = 0;
      this.highScore2 = 0;
      try {
        var hs = localStorage.getItem(CFG.HIGHSCORE_KEY);
        if (hs !== null) this.highScore1 = parseInt(hs, 10) || 0;
        var hs2 = localStorage.getItem(CFG.HIGHSCORE2_KEY);
        if (hs2 !== null) this.highScore2 = parseInt(hs2, 10) || 0;
      } catch (e) { /* almacenamiento no disponible */ }
      this.highScore = this.highScore1;

      this.pacs = [new window.PM.Pacman(0)];
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

    /* Color del jugador i (online: colores intercambiados en el saludo) */
    colorFor: function (i) {
      if (this.netColors && this.netColors[i]) return this.netColors[i];
      var s = this.settings();
      return (i === 1) ? (s.pac2Color || '#00ff00') : s.pacColor;
    },

    /* Nombre elegido para el jugador i ('' si no ha puesto ninguno).
     * En online los nombres se intercambian en el saludo (netNames). */
    rawName: function (i) {
      var n = this.netNames && this.netNames[i];
      if (!n) {
        var s = this.settings();
        n = (i === 1) ? s.nick2 : s.nick1;
      }
      return String(n || '').replace(/^ +| +$/g, '');
    },

    /* Nombre visible, con J1/J2 como respaldo */
    nameFor: function (i) {
      return this.rawName(i) || ('J' + (i + 1));
    },

    /* Índice del otro jugador (modos de dos jugadores) */
    peerIdx: function () {
      return this.localIdx === 1 ? 0 : 1;
    },

    /* ¿El jugador i se simula con autoridad en esta máquina? */
    isLocalAuth: function (i) {
      return !this.netRole || i === this.localIdx;
    },

    inGame: function () { return this.state !== 'MENU'; },

    /* ---------------------------------------------------------
     * Flujo de partida
     * opts: { players: 1|2, net: null|'host'|'guest',
     *         cfg: ajustes (el invitado recibe los del anfitrión),
     *         colors: ['#..','#..'], names: ['..','..'] en online }
     * Se guarda en lastOpts para poder repetir la partida (revancha).
     * --------------------------------------------------------- */
    newGame: function (opts) {
      opts = opts || {};
      this.lastOpts = opts;
      this.playerCount = (opts.players === 2) ? 2 : 1;
      this.netRole = opts.net || null;
      this.localIdx = (this.netRole === 'guest') ? 1 : 0;
      this.netColors = opts.colors || null;
      this.netNames = opts.names || null;
      this.vote = null;
      this.dlgPaused = false;
      this.overIdle = false;
      this.flash = null;

      var s = opts.cfg || this.settings();
      this.ghostSpeedMult = s.ghostSpeedMult;
      this.pacSpeedMult = s.pacSpeedMult;
      this.frightMult = s.frightMult;
      this.livesMode = (this.playerCount === 2 && s.livesMode === 'individual')
        ? 'individual' : 'shared';
      this.level = s.startLevel;
      this.score = 0;
      this.extraLifeAwarded = false;
      this.paused = false;

      this.pacs = [new window.PM.Pacman(0)];
      if (this.playerCount === 2) this.pacs.push(new window.PM.Pacman(1));
      if (this.livesMode === 'individual') {
        for (var i = 0; i < this.pacs.length; i++) this.pacs[i].lives = s.startLives;
        this.lives = 0;
      } else {
        this.lives = s.startLives;
      }
      this.highScore = (this.playerCount === 2) ? this.highScore2 : this.highScore1;

      /* red */
      this.netQueue = [];
      this.netWatch = 0;
      this.netNotice = null;
      this.snapTimer = 0; this.snapCount = 0; this.posTimer = 0;
      this.outEaten = []; this.recentEaten = {}; this.snapEaten = [];
      this.predictFreeze = 0;
      this.frightPredictTick = -9999;
      this.eatPredictTick = -9999;
      this._lastSentDir = -2; this._lastSentNext = -2;
      this.eaterIdx = 0; this.dyingPlayer = 0;
      if (this.netRole) {
        var self = this;
        window.PM.Net.handler = function (n, d, sid) { self.netQueue.push([n, d, sid]); };
        window.PM.Net.onclose = function () { self.onNetClosed(); };
      }

      this.resetLevel();
      // melodía de inicio (solo en partida nueva)
      var ms = CFG.INTRO_FALLBACK_MS;
      if (window.AudioSys) {
        var dur = AudioSys.playIntro();
        if (dur) ms = dur;
      }
      var rt = Math.round(ms / 1000 * 60);
      this.enterReady(rt);
      this.hostEvt({ t: 'ready', lvl: this.level, full: true, rt: rt });
      // controles en pantalla: una cruceta o dos según el modo recién arrancado
      this.syncUI();
    },

    /* Refresca los paneles y botones que dependen del estado (ui.js) */
    syncUI: function () {
      if (window.PM.UI && window.PM.UI.syncPrompt) window.PM.UI.syncPrompt();
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
      this.snapEaten = [];
      this.recentEaten = {};
      this.outEaten = [];
      for (var i = 0; i < 4; i++) this.ghosts[i].dotCounter = 0;
    },

    /* Posición inicial del jugador i según el número de jugadores */
    pacStart: function (i) {
      return (this.playerCount === 2) ? CFG.START2[i] : CFG.START.pac;
    },

    resetActors: function () {
      for (var i = 0; i < this.pacs.length; i++) {
        this.pacs[i].reset(this.pacStart(i));
      }
      for (var g = 0; g < 4; g++) this.ghosts[g].resetForLevel();
    },

    respawn: function () {
      // tras perder una vida: pastillas intactas, contador global activo
      for (var i = 0; i < this.pacs.length; i++) {
        this.pacs[i].reset(this.pacStart(i));
      }
      for (var g = 0; g < 4; g++) this.ghosts[g].resetAfterDeath();
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
      if (this.netRole) {
        try { window.PM.Net.send('bye', {}); } catch (e) { /* canal cerrado */ }
        window.PM.Net.leave();
        this.netRole = null;
        this.netColors = null;
        this.netNames = null;
      }
      this.netNotice = null;
      this.vote = null;
      this.dlgPaused = false;
      this.overIdle = false;
      this.flash = null;
      this.lastOpts = null;
      this.playerCount = 1;
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

    /* Pausa pedida por el jugador local (en online se coordina en red) */
    requestPause: function () {
      if (this.state !== 'PLAYING' && this.state !== 'READY') return;
      if (this.vote) return;   // hay un diálogo abierto: la pausa la lleva él
      if (this.netRole === 'guest') {
        this.netSend('gevt', { t: 'pauseReq', on: !this.paused });
        return;
      }
      this.togglePause();
      this.hostEvt({ t: 'pause', on: this.paused });
    },

    setPacDir: function (idx, d) {
      var p = this.pacs[idx];
      if (!p || p.out) return;
      p.setDesiredDir(d);
    },

    /* ---------------------------------------------------------
     * IA: contexto de objetivo para cada fantasma.
     * Devuelve casilla y dirección del jugador vivo más cercano,
     * de modo que cada fantasma conserva su personalidad.
     * --------------------------------------------------------- */
    pacContextFor: function (ghost) {
      var best = null, bd = Infinity;
      var gx = ghost.tileX(), gy = ghost.tileY();
      for (var i = 0; i < this.pacs.length; i++) {
        var p = this.pacs[i];
        if (p.out) continue;
        var dx = p.tileX() - gx, dy = p.tileY() - gy;
        var d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; best = p; }
      }
      if (!best) best = this.pacs[0];
      return { tile: { x: best.tileX(), y: best.tileY() }, dir: best.dir };
    },

    /* ---------------------------------------------------------
     * Bucle principal: paso fijo 60 Hz con acumulador
     * --------------------------------------------------------- */
    startLoop: function () {
      var self = this;
      this.loopLast = performance.now();
      this.loopAcc = 0;
      var STEP = 1000 / 60;

      function pump(now, doRender) {
        var dt = now - self.loopLast;
        self.loopLast = now;
        if (dt > 100) dt = 100;   // pestaña en segundo plano
        self.loopAcc += dt;
        while (self.loopAcc >= STEP) {
          self.step();
          self.loopAcc -= STEP;
        }
        if (doRender) self.render();
      }

      function frame(now) {
        pump(now, true);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);

      // Con la pestaña oculta, requestAnimationFrame se detiene; en una
      // partida online hay que seguir simulando para no dejar colgado
      // al otro jugador.
      setInterval(function () {
        if (!self.netRole) return;
        var now = performance.now();
        if (now - self.loopLast > 150) pump(now, false);
      }, 100);
    },

    step: function () {
      this.tick++;
      this.energizerTicks++;
      if (this.energizerTicks >= 12) {          // parpadeo ~0.2 s
        this.energizerTicks = 0;
        this.energizerOn = !this.energizerOn;
      }

      if (this.netRole) this.processNetQueue();
      this.stepVote();
      this.stepFlash();

      /* aviso de red: congela y vuelve al menú */
      if (this.netNotice) {
        this.netNotice.ticks--;
        if (this.netNotice.ticks <= 0) {
          this.netNotice = null;
          this.toMenu();
        }
        return;
      }

      var stalled = this.netStalled();
      if (!this.paused && !stalled) {
        if (this.netRole === 'guest') {
          this.stepGuest();
        } else {
          switch (this.state) {
            case 'READY':      this.stepReady(); break;
            case 'PLAYING':    this.stepPlaying(); break;
            case 'DYING':      this.stepDying(); break;
            case 'LEVEL_DONE': this.stepLevelDone(); break;
            case 'GAME_OVER':  this.stepGameOver(); break;
          }
        }
      }

      if (this.netRole) this.netMaintain();
    },

    stepReady: function () {
      this.readyTicks--;
      if (this.readyTicks <= 0) {
        this.state = 'PLAYING';
      }
    },

    /* ---------------------------------------------------------
     * PLAYING (1 jugador, 2 locales y anfitrión online)
     * --------------------------------------------------------- */
    stepPlaying: function () {
      var i, j, g, p;

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

      /* contexto de IA (Inky necesita la casilla de Blinky) */
      this.blinkyTile = { x: this.ghosts[0].tileX(), y: this.ghosts[0].tileY() };

      /* jugadores (se guarda la casilla previa para detectar cruces) */
      for (i = 0; i < this.pacs.length; i++) {
        p = this.pacs[i];
        if (p.out) continue;
        p.prevTX = p.tileX();
        p.prevTY = p.tileY();
        p.update(this.pacSpeedPx(p));
        // el pac remoto (invitado online) avanza por estima; sus puntos
        // comidos llegan por red dentro de los mensajes 'pos'
        if (this.isLocalAuth(i)) this.eatAt(p.tileX(), p.tileY(), p);
      }

      /* fantasmas */
      for (i = 0; i < 4; i++) {
        g = this.ghosts[i];
        g.prevTX = g.tileX();
        g.prevTY = g.tileY();
        g.update(this);
      }

      /* fruta */
      if (this.fruitActive) {
        this.fruitTicks--;
        if (this.fruitTicks <= 0) this.fruitActive = false;
        else {
          for (i = 0; i < this.pacs.length; i++) {
            p = this.pacs[i];
            if (p.out || !this.isLocalAuth(i)) continue;
            if (p.tileY() === CFG.START.fruit.y &&
                (p.tileX() === 13 || p.tileX() === 14)) {
              this.fruitActive = false;
              this.addScore(this.fruitInfo.points);
              this.addPopup(CFG.START.fruit.x * T + T / 2,
                CFG.START.fruit.y * T + T / 2,
                this.fruitInfo.points, CFG.FRUIT_SCORE_S * 60);
              this.hostEvt({ t: 'fruitEat', pts: this.fruitInfo.points, w: i });
              window.AudioSys && AudioSys.playEatFruit();
              break;
            }
          }
        }
      }

      /* colisiones con fantasmas (el invitado decide las suyas).
       * Cuenta la misma casilla Y TAMBIÉN el intercambio de casillas en
       * el mismo tick (cruzarse de frente): el arcade original dejaba
       * atravesarse en ese caso; aquí se corrige a propósito. */
      for (i = 0; i < this.pacs.length; i++) {
        p = this.pacs[i];
        if (p.out || !this.isLocalAuth(i)) continue;
        var px = p.tileX(), py = p.tileY();
        for (j = 0; j < 4; j++) {
          g = this.ghosts[j];
          if (g.mode === 'house' || g.mode === 'entering') continue;
          var sameTile = (g.tileX() === px && g.tileY() === py);
          var swapped = !sameTile &&
            g.tileX() === p.prevTX && g.tileY() === p.prevTY &&
            g.prevTX === px && g.prevTY === py;
          if (!sameTile && !swapped) continue;
          if (g.mode === 'eyes') continue;
          if (g.frightened) {
            this.eatGhost(g, i);
          } else {
            this.startDeath(i);
            return;
          }
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
        this.hostEvt({ t: 'levelDone' });
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
     * Comer pastillas (pac: quién come, para su pausa por comer)
     * --------------------------------------------------------- */
    eatAt: function (col, row, pac) {
      if (row < 0 || row >= CFG.ROWS || col < 0 || col >= CFG.COLS) return;
      var ch = this.pellets[row][col];
      if (!ch) return;
      this.pellets[row][col] = null;
      this.dotsLeft--;
      this.dotsEaten++;
      this.failsafeTicks = 0;
      this.houseDotEaten();
      if (this.netRole === 'host') this.snapEaten.push(row * CFG.COLS + col);

      if (ch === '.') {
        this.addScore(CFG.DOT_POINTS);
        pac.pauseTicks = CFG.DOT_PAUSE;
      } else {
        this.addScore(CFG.ENERGIZER_POINTS);
        pac.pauseTicks = CFG.ENERGIZER_PAUSE;
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
      if (secs <= 0) {                           // solo inversión, sin modo azul
        this.hostEvt({ t: 'fright', tk: 0, fl: 0 });
        return;
      }
      this.frightTicks = Math.round(secs * 60);
      this.frightFlashes = fr.flashes;
      this.frightFlashOn = false;
      for (var i = 0; i < 4; i++) {
        var g = this.ghosts[i];
        if (g.mode === 'eyes' || g.mode === 'entering') continue;
        g.frightened = true;
      }
      this.hostEvt({ t: 'fright', tk: this.frightTicks, fl: this.frightFlashes });
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
     * Velocidad de un Pac-Man (px/tick)
     * --------------------------------------------------------- */
    pacSpeedPx: function (pac) {
      var row = this.speedRow;
      var pct;
      if (this.frightTicks > 0) {
        pct = row.pacFright;
      } else {
        var col = pac.tileX(), fila = pac.tileY();
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
    eatGhost: function (g, who) {
      var pts = CFG.GHOST_CHAIN[Math.min(this.chainIndex, 3)];
      this.chainIndex++;
      this.addScore(pts);
      this.addPopup(g.x, g.y, pts, CFG.EAT_FREEZE_TICKS);
      g.eaten();
      this.eatFreezeTicks = CFG.EAT_FREEZE_TICKS;
      this.hiddenGhost = g.id;
      this.eaterIdx = who || 0;
      this.hostEvt({ t: 'eatGhost', g: g.id, pts: pts,
        x: Math.round(g.x), y: Math.round(g.y), w: this.eaterIdx });
      window.AudioSys && AudioSys.playEatGhost();
    },

    startDeath: function (who) {
      this.state = 'DYING';
      this.dyingPlayer = who || 0;
      this.dyingPhase = 0;
      this.phaseTicks = CFG.DEATH_FREEZE_TICKS;
      this.stopAllLoops();
      this.hostEvt({ t: 'death', w: this.dyingPlayer });
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
      /* animación terminada: descontar vida según el modo */
      var survivors;
      if (this.playerCount === 2 && this.livesMode === 'individual') {
        var p = this.pacs[this.dyingPlayer];
        p.lives--;
        if (p.lives <= 0) { p.lives = 0; p.out = true; }
        survivors = false;
        for (var i = 0; i < this.pacs.length; i++) {
          if (!this.pacs[i].out) survivors = true;
        }
      } else {
        this.lives--;
        survivors = this.lives > 0;
      }
      if (survivors) {
        this.respawn();
        this.hostEvt({ t: 'ready', lvl: this.level, full: false, rt: CFG.READY_TICKS });
      } else {
        this.state = 'GAME_OVER';
        this.phaseTicks = CFG.GAMEOVER_TICKS;
        this.overIdle = false;
        this.persistHighScore();
        this.hostEvt({ t: 'gameOver' });
        this.syncUI();
      }
    },

    /* Tras el rótulo GAME OVER ya no se vuelve solo al menú: se ofrece
     * repetir la partida con el mismo compañero (o salir). */
    stepGameOver: function () {
      if (this.phaseTicks > 0) this.phaseTicks--;
      if (this.phaseTicks <= 0 && !this.overIdle) this.enterGameOverIdle();
    },

    enterGameOverIdle: function () {
      this.overIdle = true;
      this.stopAllLoops();
      this.syncUI();
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
      this.hostEvt({ t: 'ready', lvl: this.level, full: true, rt: CFG.READY_TICKS });
    },

    /* ---------------------------------------------------------
     * Puntuación (de equipo en modos de dos jugadores)
     * --------------------------------------------------------- */
    addScore: function (pts) {
      var before = this.score;
      this.score += pts;
      if (!this.extraLifeAwarded && before < CFG.EXTRA_LIFE_AT &&
          this.score >= CFG.EXTRA_LIFE_AT) {
        this.extraLifeAwarded = true;
        if (this.playerCount === 2 && this.livesMode === 'individual') {
          for (var i = 0; i < this.pacs.length; i++) {
            if (!this.pacs[i].out) this.pacs[i].lives++;
          }
        } else {
          this.lives++;
        }
        this.hostEvt({ t: 'extraLife' });
        window.AudioSys && AudioSys.playExtraLife();
      }
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.persistHighScore();
      }
    },

    persistHighScore: function () {
      try {
        if (this.playerCount === 2) {
          if (this.highScore > this.highScore2) this.highScore2 = this.highScore;
          localStorage.setItem(CFG.HIGHSCORE2_KEY, String(this.highScore2));
        } else {
          if (this.highScore > this.highScore1) this.highScore1 = this.highScore;
          localStorage.setItem(CFG.HIGHSCORE_KEY, String(this.highScore1));
        }
      } catch (e) { /* sin almacenamiento */ }
    },

    addPopup: function (x, y, text, ticks) {
      this.popups.push({ x: x, y: y, text: text, ticks: ticks });
    },

    /* =========================================================
     * RENDICIÓN Y REVANCHA
     * Ambas son votaciones: en dos jugadores tienen que aceptarlo
     * los dos. En online el anfitrión es quien las ejecuta y avisa;
     * en local basta con confirmar en el diálogo.
     * ========================================================= */
    canSurrender: function () {
      return this.inGame() && this.state !== 'GAME_OVER' &&
        !this.netNotice && !this.vote;
    },

    voteAllowed: function (kind) {
      if (kind === 'rematch') return this.state === 'GAME_OVER' && !!this.lastOpts;
      return this.canSurrender();
    },

    /* Petición del jugador local (botón RENDIRSE / REVANCHA) */
    requestVote: function (kind) {
      if (this.vote || !this.voteAllowed(kind)) return;
      if (!this.netRole) {
        // sin red: el diálogo local hace de votación
        this.vote = { kind: kind, role: 'to', local: true, ticks: 0 };
        if (kind === 'surrender') this.votePause(true);
        this.syncUI();
        return;
      }
      this.vote = { kind: kind, role: 'from', local: false, ticks: CFG.NET.VOTE_TICKS };
      if (kind === 'surrender') this.votePause(true);
      this.voteSend({ t: 'vote', k: kind });
      this.syncUI();
    },

    /* Petición recibida del otro jugador */
    onVoteRequest: function (kind) {
      if (this.vote || !this.voteAllowed(kind)) {
        this.voteSend({ t: 'voteRes', k: kind, ok: 0 });
        return;
      }
      this.vote = { kind: kind, role: 'to', local: false, ticks: CFG.NET.VOTE_TICKS };
      if (kind === 'surrender') this.votePause(true);
      this.syncUI();
    },

    /* Respuesta del jugador local en el diálogo */
    answerVote: function (ok) {
      if (!this.vote || this.vote.role !== 'to') return;
      var kind = this.vote.kind;
      if (!this.vote.local) this.voteSend({ t: 'voteRes', k: kind, ok: ok ? 1 : 0 });
      this.clearVote();
      if (ok) this.execVote(kind);
      else if (kind === 'surrender' && this.netRole) this.setFlash('SE SIGUE JUGANDO');
    },

    /* Respuesta recibida del otro jugador */
    onVoteResult: function (kind, ok) {
      if (!this.vote || this.vote.role !== 'from' || this.vote.kind !== kind) return;
      this.clearVote();
      if (ok) this.execVote(kind);
      else this.setFlash(kind === 'surrender' ? 'RENDICIÓN RECHAZADA' : 'REVANCHA RECHAZADA');
    },

    /* El invitado no ejecuta nada: espera el evento del anfitrión */
    execVote: function (kind) {
      if (this.netRole === 'guest') return;
      if (kind === 'surrender') this.surrenderNow();
      else this.rematch();
    },

    voteSend: function (o) {
      if (this.netRole === 'host') this.hostEvt(o);
      else if (this.netRole === 'guest') this.netSend('gevt', o);
    },

    clearVote: function () {
      if (!this.vote) return;
      var kind = this.vote.kind;
      this.vote = null;
      if (kind === 'surrender') this.votePause(false);
      this.syncUI();
    },

    stepVote: function () {
      var v = this.vote;
      if (!v || v.ticks <= 0) return;
      v.ticks--;
      if (v.ticks <= 0) {
        var from = (v.role === 'from');
        this.clearVote();
        this.setFlash(from ? 'SIN RESPUESTA' : 'TIEMPO AGOTADO');
      } else if (v.ticks % 60 === 0 && window.PM.UI && window.PM.UI.tickPrompt) {
        window.PM.UI.tickPrompt();   // cuenta atrás visible en el diálogo
      }
    },

    /* Pausa mientras se decide una rendición (la marca el anfitrión) */
    votePause: function (on) {
      if (this.netRole === 'guest') return;   // la pausa online la fija el anfitrión
      if (on) {
        if (this.paused) return;
        this.paused = true;
        this.dlgPaused = true;
        this.stopAllLoops();
        this.hostEvt({ t: 'pause', on: true });
      } else if (this.dlgPaused) {
        this.dlgPaused = false;
        this.paused = false;
        this.hostEvt({ t: 'pause', on: false });
      }
    },

    surrenderNow: function () {
      if (!this.inGame() || this.state === 'GAME_OVER') return;
      this.clearVote();
      this.paused = false;
      this.dlgPaused = false;
      this.state = 'GAME_OVER';
      this.phaseTicks = CFG.GAMEOVER_TICKS;
      this.overIdle = false;
      this.persistHighScore();
      this.stopAllLoops();
      this.hostEvt({ t: 'gameOver' });
      this.syncUI();
    },

    /* Revancha: misma configuración, mismo compañero */
    rematch: function () {
      if (!this.lastOpts) { this.toMenu(); return; }
      this.hostEvt({ t: 'rematch' });
      this.restartGame();
    },

    restartGame: function () {
      if (!this.lastOpts) { this.toMenu(); return; }
      this.newGame(this.lastOpts);
    },

    setFlash: function (text) {
      this.flash = { text: text, ticks: 180 };
      this.syncFlashUI();
    },

    stepFlash: function () {
      if (!this.flash) return;
      this.flash.ticks--;
      if (this.flash.ticks <= 0) {
        this.flash = null;
        this.syncFlashUI();
      }
    },

    /* Con un diálogo abierto basta con reescribir su línea de estado */
    syncFlashUI: function () {
      var UI = window.PM.UI;
      if (!UI) return;
      if (UI.promptOpen) UI.tickPrompt();
      else UI.syncPrompt();
    },

    /* =========================================================
     * RED — común
     * ========================================================= */
    netSend: function (name, data) {
      if (this.netRole && window.PM.Net) window.PM.Net.send(name, data);
    },

    hostEvt: function (o) {
      if (this.netRole === 'host') this.netSend('evt', o);
    },

    processNetQueue: function () {
      var q = this.netQueue;
      if (!q.length) return;
      this.netQueue = [];
      for (var i = 0; i < q.length; i++) {
        this.netWatch = 0;
        if (this.netRole === 'host') this.hostMsg(q[i][0], q[i][1], q[i][2]);
        else if (this.netRole === 'guest') this.guestMsg(q[i][0], q[i][1]);
      }
    },

    netStalled: function () {
      return !!this.netRole && this.inGame() && this.state !== 'GAME_OVER' &&
        this.netWatch > CFG.NET.WAIT_TICKS;
    },

    netMaintain: function () {
      if (!this.inGame()) return;
      this.netWatch++;
      // también durante GAME OVER: ahí se espera la respuesta a la revancha
      if (this.netWatch > CFG.NET.DROP_TICKS) {
        this.netFail('CONEXIÓN PERDIDA');
        return;
      }
      if (this.netRole === 'host') {
        this.snapTimer++;
        if (this.snapTimer >= CFG.NET.SNAP_EVERY) {
          this.snapTimer = 0;
          this.snapCount++;
          var withPellets = (this.snapCount % CFG.NET.PELLET_SYNC_EVERY) === 0;
          this.netSend('snap', this.buildSnapshot(withPellets));
        }
      } else {
        this.sendGuestUpdates();
      }
    },

    netFail: function (msg) {
      if (this.netNotice) return;
      this.stopAllLoops();
      this.vote = null;
      this.overIdle = false;
      this.flash = null;
      this.netNotice = { text: msg, ticks: CFG.NET.NOTICE_TICKS };
      this.syncUI();
    },

    peerLeft: function () {
      this.netFail('EL OTRO JUGADOR HA SALIDO');
    },

    onNetClosed: function () {
      if (!this.netRole || !this.inGame()) return;
      this.netFail('CONEXIÓN PERDIDA');
    },

    removePellet: function (idx) {
      var col = idx % CFG.COLS, row = (idx - col) / CFG.COLS;
      if (row >= 0 && row < CFG.ROWS && this.pellets[row] && this.pellets[row][col]) {
        this.pellets[row][col] = null;
      }
    },

    /* Mapa de pastillas como cadena hexadecimal (1 bit por casilla) */
    pelletHex: function () {
      var hex = '', nibble = 0, count = 0;
      for (var r = 0; r < CFG.ROWS; r++) {
        for (var c = 0; c < CFG.COLS; c++) {
          nibble = (nibble << 1) | (this.pellets[r][c] ? 1 : 0);
          count++;
          if (count === 4) {
            hex += nibble.toString(16);
            nibble = 0;
            count = 0;
          }
        }
      }
      if (count > 0) hex += (nibble << (4 - count)).toString(16);
      return hex;
    },

    applyPelletHex: function (hex) {
      var idx = 0, total = CFG.ROWS * CFG.COLS;
      for (var i = 0; i < hex.length && idx < total; i++) {
        var v = parseInt(hex.charAt(i), 16);
        for (var b = 3; b >= 0 && idx < total; b--, idx++) {
          var present = (v >> b) & 1;
          var col = idx % CFG.COLS, row = (idx - col) / CFG.COLS;
          var local = this.pellets[row][col];
          if (present && !local) {
            // no restaurar lo que acabamos de comer (aún viaja hacia el anfitrión)
            if (!this.recentEaten[idx]) {
              var ch = CFG.MAZE[row].charAt(col);
              if (ch === '.' || ch === 'o') this.pellets[row][col] = ch;
            }
          } else if (!present && local) {
            this.pellets[row][col] = null;
          }
        }
      }
    },

    /* =========================================================
     * RED — anfitrión
     * ========================================================= */
    hostMsg: function (name, data, sid) {
      switch (name) {
        case 'pos': {
          var p = this.pacs[1];
          if (!p || !data) return;
          p.x = data.x; p.y = data.y;
          p.dir = data.d; p.nextDir = data.nd;
          if (data.e && this.state === 'PLAYING') {
            for (var i = 0; i < data.e.length; i++) {
              var idx = data.e[i];
              var col = idx % CFG.COLS, row = (idx - col) / CFG.COLS;
              this.eatAt(col, row, p);
            }
          }
          break;
        }
        case 'gevt':
          if (data) this.hostGuestEvent(data);
          break;
        case 'hello':
          // la sala ya está en juego: no cabe nadie más
          this.netSend('full', { to: sid });
          break;
        case 'bye':
          this.peerLeft();
          break;
      }
    },

    hostGuestEvent: function (d) {
      switch (d.t) {
        case 'died':
          if (this.state === 'PLAYING' && this.pacs[1] && !this.pacs[1].out) {
            this.startDeath(1);
          }
          break;
        case 'ateGhost': {
          var g = this.ghosts[d.g];
          if (this.state === 'PLAYING' && g && g.frightened &&
              (g.mode === 'normal' || g.mode === 'leaving')) {
            this.eatGhost(g, 1);
          }
          break;
        }
        case 'ateFruit':
          if (this.state === 'PLAYING' && this.fruitActive) {
            this.fruitActive = false;
            this.addScore(this.fruitInfo.points);
            this.addPopup(CFG.START.fruit.x * T + T / 2,
              CFG.START.fruit.y * T + T / 2,
              this.fruitInfo.points, CFG.FRUIT_SCORE_S * 60);
            this.hostEvt({ t: 'fruitEat', pts: this.fruitInfo.points, w: 1 });
            window.AudioSys && AudioSys.playEatFruit();
          }
          break;
        case 'pauseReq':
          if ((this.state === 'PLAYING' || this.state === 'READY') && !this.vote) {
            this.paused = !!d.on;
            this.dlgPaused = false;
            if (this.paused) this.stopAllLoops();
            this.hostEvt({ t: 'pause', on: this.paused });
          }
          break;
        case 'vote':
          this.onVoteRequest(d.k);
          break;
        case 'voteRes':
          this.onVoteResult(d.k, !!d.ok);
          break;
      }
    },

    buildSnapshot: function (withPellets) {
      var i;
      var p0 = this.pacs[0];
      var s = {
        st: this.state, pz: this.paused ? 1 : 0,
        ph: this.phaseTicks, dph: this.dyingPhase, lph: this.levelPhase,
        dp: this.dyingPlayer, rt: this.readyTicks,
        lvl: this.level, sc: this.score, hs: this.highScore,
        gm: this.globalMode, el: this.elroy,
        ft: this.frightTicks, ffl: this.frightFlashes, ch: this.chainIndex,
        fz: this.eatFreezeTicks, hg: this.hiddenGhost, ei: this.eaterIdx,
        dl: this.dotsLeft, de: this.dotsEaten,
        fa: this.fruitActive ? 1 : 0,
        he: this.snapEaten,
        p0: { x: r1(p0.x), y: r1(p0.y), d: p0.dir, nd: p0.nextDir },
        g: []
      };
      for (i = 0; i < 4; i++) {
        var g = this.ghosts[i];
        s.g.push({ x: r1(g.x), y: r1(g.y), d: g.dir, m: g.mode,
          f: g.frightened ? 1 : 0, lp: g.leavePhase });
      }
      if (this.playerCount === 2 && this.livesMode === 'individual') {
        s.lv = [this.pacs[0].lives, this.pacs[1].lives];
        s.out = [this.pacs[0].out ? 1 : 0, this.pacs[1].out ? 1 : 0];
      } else {
        s.lv = this.lives;
      }
      if (withPellets) s.pm = this.pelletHex();
      this.snapEaten = [];
      return s;
    },

    /* =========================================================
     * RED — invitado
     * ========================================================= */
    guestMsg: function (name, data) {
      switch (name) {
        case 'snap': if (data) this.applySnapshot(data); break;
        case 'evt':  if (data) this.applyEvt(data); break;
        case 'bye':  this.peerLeft(); break;
      }
    },

    stepGuest: function () {
      switch (this.state) {
        case 'READY':
          // el paso a PLAYING lo decide el anfitrión (llega por red)
          if (this.readyTicks > 0) this.readyTicks--;
          break;
        case 'PLAYING':
          this.stepGuestPlaying();
          break;
        case 'DYING':
        case 'LEVEL_DONE':
          // animaciones suaves entre instantáneas
          if (this.phaseTicks > 0) this.phaseTicks--;
          break;
        case 'GAME_OVER':
          this.stepGameOver();
          break;
      }
    },

    stepGuestPlaying: function () {
      var i;

      if (this.eatFreezeTicks > 0) {
        this.eatFreezeTicks--;
        for (i = this.popups.length - 1; i >= 0; i--) {
          if (--this.popups[i].ticks <= 0) this.popups.splice(i, 1);
        }
        if (this.eatFreezeTicks === 0) this.hiddenGhost = -1;
        return;
      }
      if (this.predictFreeze > 0) {   // muerte propia a la espera de confirmación
        this.predictFreeze--;
        return;
      }

      if (this.frightTicks > 0) this.stepFright();

      var me = this.pacs[this.localIdx];
      var host = this.pacs[0];

      /* pac del anfitrión: avanza por estima entre instantáneas */
      if (!host.out) host.update(this.pacSpeedPx(host));

      /* pac propio: simulación local completa (sin lag de entrada) */
      if (!me.out) {
        me.prevTX = me.tileX();
        me.prevTY = me.tileY();
        me.update(this.pacSpeedPx(me));
        this.guestEatAt(me);
      }

      /* fantasmas: simulación local corregida por las instantáneas
       * (la casilla previa se toma DESPUÉS de aplicar la instantánea,
       * así una corrección de red nunca simula un cruce falso) */
      this.blinkyTile = { x: this.ghosts[0].tileX(), y: this.ghosts[0].tileY() };
      for (i = 0; i < 4; i++) {
        var gh = this.ghosts[i];
        gh.prevTX = gh.tileX();
        gh.prevTY = gh.tileY();
        gh.update(this);
      }

      /* fruta: la gestiona el anfitrión; aquí solo la recogida propia */
      if (this.fruitActive && !me.out) {
        if (me.tileY() === CFG.START.fruit.y &&
            (me.tileX() === 13 || me.tileX() === 14)) {
          this.fruitActive = false;               // el evt trae los puntos
          this.netSend('gevt', { t: 'ateFruit' });
        }
      }

      if (!me.out) this.guestCollisions(me);

      for (i = this.popups.length - 1; i >= 0; i--) {
        if (--this.popups[i].ticks <= 0) this.popups.splice(i, 1);
      }

      this.updateLoops();
    },

    guestEatAt: function (pac) {
      var col = pac.tileX(), row = pac.tileY();
      if (row < 0 || row >= CFG.ROWS || col < 0 || col >= CFG.COLS) return;
      var ch = this.pellets[row][col];
      if (!ch) return;
      this.pellets[row][col] = null;
      this.dotsLeft--;                    // provisional; la instantánea lo corrige
      var idx = row * CFG.COLS + col;
      this.outEaten.push(idx);
      this.recentEaten[idx] = this.tick;
      pac.pauseTicks = (ch === '.') ? CFG.DOT_PAUSE : CFG.ENERGIZER_PAUSE;
      if (ch === 'o') this.predictFright();
      window.AudioSys && AudioSys.playWaka();
    },

    /* Energizante propio: reacción visual inmediata; el anfitrión confirma */
    predictFright: function () {
      this.frightPredictTick = this.tick;
      var fr = CFG.fright(this.level);
      var secs = fr.seconds * this.frightMult;
      for (var i = 0; i < 4; i++) {
        var g = this.ghosts[i];
        if (g.mode === 'normal') g.dir = CFG.OPP[g.dir];
        if (secs > 0 && g.mode !== 'eyes' && g.mode !== 'entering') {
          g.frightened = true;
        }
      }
      if (secs <= 0) return;
      this.frightTicks = Math.round(secs * 60);
      this.frightFlashes = fr.flashes;
      this.frightFlashOn = false;
    },

    guestCollisions: function (me) {
      var px = me.tileX(), py = me.tileY();
      for (var i = 0; i < 4; i++) {
        var g = this.ghosts[i];
        if (g.mode === 'house' || g.mode === 'entering') continue;
        var sameTile = (g.tileX() === px && g.tileY() === py);
        var swapped = !sameTile &&
          g.tileX() === me.prevTX && g.tileY() === me.prevTY &&
          g.prevTX === px && g.prevTY === py;
        if (!sameTile && !swapped) continue;
        if (g.mode === 'eyes') continue;
        if (g.frightened) {
          // predicción: congela y oculta; el anfitrión confirma con 'eatGhost'
          g.eaten();
          this.eatFreezeTicks = CFG.EAT_FREEZE_TICKS;
          this.hiddenGhost = g.id;
          this.eaterIdx = me.id;
          this.eatPredictTick = this.tick;
          this.netSend('gevt', { t: 'ateGhost', g: g.id });
          window.AudioSys && AudioSys.playEatGhost();
        } else {
          this.predictFreeze = CFG.DEATH_FREEZE_TICKS + 30;
          this.netSend('gevt', { t: 'died' });
        }
        return;
      }
    },

    sendGuestUpdates: function () {
      var me = this.pacs[this.localIdx];
      if (!me) return;
      this.posTimer++;
      var dirty = this.outEaten.length > 0 ||
        me.dir !== this._lastSentDir || me.nextDir !== this._lastSentNext;
      if (!dirty && this.posTimer < CFG.NET.POS_EVERY) return;
      this.posTimer = 0;
      this._lastSentDir = me.dir;
      this._lastSentNext = me.nextDir;
      this.netSend('pos', {
        x: r1(me.x), y: r1(me.y), d: me.dir, nd: me.nextDir,
        e: this.outEaten
      });
      this.outEaten = [];
      for (var k in this.recentEaten) {
        if (this.recentEaten.hasOwnProperty(k) &&
            this.tick - this.recentEaten[k] > 240) {
          delete this.recentEaten[k];
        }
      }
    },

    /* READY en el invitado (partida nueva, nivel nuevo o reaparición) */
    guestReady: function (d) {
      if (d.lvl !== this.level || d.full) {
        this.level = d.lvl;
        this.speedRow = CFG.speedRow(d.lvl);
        this.fruitInfo = CFG.fruitForLevel(d.lvl);
        this.loadPellets();
        this.recentEaten = {};
      }
      this.resetActors();
      this.state = 'READY';
      this.readyTicks = d.rt || CFG.READY_TICKS;
      this.popups = [];
      this.frightTicks = 0;
      this.frightFlashOn = false;
      this.eatFreezeTicks = 0;
      this.hiddenGhost = -1;
      this.predictFreeze = 0;
      this.fruitActive = false;
      this.paused = false;
      this.outEaten = [];
      // por si se perdió el evento de revancha: nunca seguir con el panel abierto
      this.overIdle = false;
      this.vote = null;
      this.stopAllLoops();
      this.syncUI();
    },

    applyEvt: function (e) {
      var i;
      switch (e.t) {
        case 'ready':
          this.guestReady(e);
          break;
        case 'fright':
          this.chainIndex = 0;
          if (e.tk > 0) {
            this.frightTicks = e.tk;
            this.frightFlashes = e.fl;
            this.frightFlashOn = false;
            for (i = 0; i < 4; i++) {
              var g = this.ghosts[i];
              if (g.mode === 'eyes' || g.mode === 'entering') continue;
              g.frightened = true;
            }
          }
          // inversión visual, salvo que ya la hiciéramos por predicción
          if (this.tick - this.frightPredictTick > 30) {
            for (i = 0; i < 4; i++) {
              if (this.ghosts[i].mode === 'normal') {
                this.ghosts[i].dir = CFG.OPP[this.ghosts[i].dir];
              }
            }
          }
          break;
        case 'eatGhost': {
          var predicted = (this.hiddenGhost === e.g && this.eatFreezeTicks > 0);
          var g2 = this.ghosts[e.g];
          if (g2) g2.eaten();
          this.eatFreezeTicks = Math.max(this.eatFreezeTicks, CFG.EAT_FREEZE_TICKS - 10);
          this.hiddenGhost = e.g;
          this.eaterIdx = e.w || 0;
          this.addPopup(e.x, e.y, e.pts, this.eatFreezeTicks);
          if (!predicted) window.AudioSys && AudioSys.playEatGhost();
          break;
        }
        case 'death':
          this.predictFreeze = 0;
          this.state = 'DYING';
          this.dyingPlayer = e.w || 0;
          this.dyingPhase = 0;
          this.phaseTicks = CFG.DEATH_FREEZE_TICKS;
          this.stopAllLoops();
          break;
        case 'levelDone':
          this.state = 'LEVEL_DONE';
          this.levelPhase = 0;
          this.phaseTicks = CFG.LEVEL_FREEZE_TICKS;
          this.stopAllLoops();
          break;
        case 'fruitEat':
          this.fruitActive = false;
          this.addPopup(CFG.START.fruit.x * T + T / 2,
            CFG.START.fruit.y * T + T / 2, e.pts, CFG.FRUIT_SCORE_S * 60);
          window.AudioSys && AudioSys.playEatFruit();
          break;
        case 'extraLife':
          window.AudioSys && AudioSys.playExtraLife();
          break;
        case 'gameOver':
          this.clearVote();
          this.state = 'GAME_OVER';
          this.phaseTicks = CFG.GAMEOVER_TICKS;
          this.overIdle = false;
          this.highScore = Math.max(this.highScore, this.score);
          this.persistHighScore();
          this.stopAllLoops();
          this.syncUI();
          break;
        case 'pause':
          this.paused = !!e.on;
          if (this.paused) this.stopAllLoops();
          break;
        case 'vote':
          this.onVoteRequest(e.k);
          break;
        case 'voteRes':
          this.onVoteResult(e.k, !!e.ok);
          break;
        case 'rematch':
          this.clearVote();
          this.restartGame();
          break;
      }
    },

    applySnapshot: function (s) {
      var i;

      /* transición de estado */
      if (s.st !== this.state) {
        var prev = this.state;
        this.state = s.st;
        if (s.st === 'DYING' || s.st === 'LEVEL_DONE' || s.st === 'GAME_OVER') {
          this.stopAllLoops();
        }
        if (s.st === 'DYING') this.predictFreeze = 0;
        this.overIdle = false;
        if (s.st === 'GAME_OVER') {
          this.highScore = Math.max(this.highScore, s.sc || 0);
          this.persistHighScore();
          this.clearVote();          // una rendición en curso ya no pinta nada
        }
        if (s.st === 'READY' && prev !== 'READY') {
          // respaldo por si el evt 'ready' no llegó
          this.guestReady({ lvl: s.lvl, full: false, rt: s.rt });
        }
        this.syncUI();
      }

      this.paused = !!s.pz;
      if (this.paused) this.stopAllLoops();

      /* sonido de muerte al ver empezar la fase 1 */
      if (s.st === 'DYING' && s.dph === 1 && this.dyingPhase !== 1) {
        window.AudioSys && AudioSys.playDeath();
      }

      this.phaseTicks = s.ph;
      this.dyingPhase = s.dph;
      this.levelPhase = s.lph;
      this.dyingPlayer = s.dp || 0;
      this.readyTicks = s.rt;

      if (s.lvl !== this.level) {   // respaldo por si 'ready' no llegó
        this.level = s.lvl;
        this.speedRow = CFG.speedRow(s.lvl);
        this.fruitInfo = CFG.fruitForLevel(s.lvl);
        this.loadPellets();
        this.recentEaten = {};
      }

      this.score = s.sc;
      this.highScore = Math.max(this.highScore, s.hs || 0, s.sc || 0);
      this.globalMode = s.gm;
      this.elroy = s.el;

      /* ventanas de protección para no pisar las predicciones locales */
      var protFright = (this.tick - this.frightPredictTick) < 60;
      var protEat = (this.tick - this.eatPredictTick) < 90;
      this.frightTicks = protFright ? Math.max(this.frightTicks, s.ft) : s.ft;
      this.frightFlashes = Math.max(this.frightFlashes, s.ffl || 0);
      if (!protFright) this.frightFlashes = s.ffl;
      this.chainIndex = s.ch;
      this.eatFreezeTicks = protEat ? Math.max(this.eatFreezeTicks, s.fz) : s.fz;
      if (!(protEat && s.hg < 0)) this.hiddenGhost = s.hg;
      this.eaterIdx = s.ei || 0;

      this.dotsLeft = s.dl;
      this.dotsEaten = s.de;
      this.fruitActive = !!s.fa;

      /* vidas */
      if (this.livesMode === 'individual' && s.lv && s.lv.length) {
        for (i = 0; i < this.pacs.length && i < s.lv.length; i++) {
          this.pacs[i].lives = s.lv[i];
          this.pacs[i].out = !!(s.out && s.out[i]);
        }
      } else {
        this.lives = s.lv;
      }

      /* celdas comidas en el anfitrión desde la última instantánea */
      if (s.he) {
        for (i = 0; i < s.he.length; i++) this.removePellet(s.he[i]);
      }

      /* pac del anfitrión */
      if (s.p0) {
        var h = this.pacs[0];
        h.x = s.p0.x; h.y = s.p0.y;
        h.dir = s.p0.d; h.nextDir = s.p0.nd;
      }

      /* fantasmas */
      if (s.g) {
        for (i = 0; i < 4 && i < s.g.length; i++) {
          var gd = s.g[i], g = this.ghosts[i];
          g.x = gd.x; g.y = gd.y; g.dir = gd.d;
          g.mode = gd.m;
          g.frightened = protFright ? (g.frightened || !!gd.f) : !!gd.f;
          g.leavePhase = gd.lp || 0;
        }
      }

      if (s.pm) this.applyPelletHex(s.pm);
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
        var deathAnim = (this.state === 'DYING' && this.dyingPhase === 1);
        var hideGhosts = deathAnim ||
                         (this.state === 'LEVEL_DONE' && this.levelPhase === 1);
        if (!hideGhosts) {
          for (i = 0; i < 4; i++) {
            if (this.eatFreezeTicks > 0 && i === this.hiddenGhost) continue;
            this.ghosts[i].draw(ctx, this);
          }
        }
        for (i = this.pacs.length - 1; i >= 0; i--) {
          var pc = this.pacs[i];
          if (pc.out) continue;
          if (deathAnim) {
            if (i === this.dyingPlayer) {
              var t = 1 - this.phaseTicks / CFG.DEATH_ANIM_TICKS;
              window.PM.Sprites.drawPacmanDeath(ctx, pc.x,
                pc.y + CFG.MAZE_Y, t, this.colorFor(i));
            }
            continue;   // los demás quedan ocultos durante la animación
          }
          if (this.eatFreezeTicks > 0 && i === this.eaterIdx) continue;
          pc.draw(ctx, this.colorFor(i));
        }
        /* nombre (o J1/J2) sobre cada jugador durante el "¡LISTO!" */
        if (this.playerCount === 2 && this.state === 'READY') {
          ctx.font = 'bold 7px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (i = 0; i < this.pacs.length; i++) {
            if (this.pacs[i].out) continue;
            ctx.fillStyle = this.colorFor(i);
            ctx.fillText(this.nameFor(i), this.pacs[i].x,
              this.pacs[i].y + CFG.MAZE_Y - 10);
          }
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
      var i, p;
      var twoP = (this.playerCount === 2 && this.state !== 'MENU');
      ctx.font = 'bold 8px monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = CFG.COLORS.text;

      ctx.textAlign = 'left';
      var leftLabel = twoP ? 'EQUIPO'
        : ((this.state !== 'MENU' && this.rawName(0)) || '1UP');
      ctx.fillText(leftLabel, 20, 0);
      ctx.textAlign = 'center';
      ctx.fillText('HIGH SCORE', 112, 0);

      ctx.textAlign = 'right';
      var sc = (this.state === 'MENU') ? 0 : this.score;
      var hs = (this.state === 'MENU') ? this.highScore1 : this.highScore;
      ctx.fillText(String(sc || 0), 56, 9);
      ctx.fillText(String(hs || 0), 136, 9);

      /* nombres del dúo, en la tercera línea del marcador */
      if (twoP) {
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = this.colorFor(0);
        ctx.fillText(this.nameFor(0), 20, 16);
        ctx.textAlign = 'right';
        ctx.fillStyle = this.colorFor(1);
        ctx.fillText(this.nameFor(1), 204, 16);
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = CFG.COLORS.text;
      }

      /* vidas (mini Pac-Mans) */
      if (this.state !== 'MENU') {
        if (twoP && this.livesMode === 'individual') {
          for (p = 0; p < this.pacs.length; p++) {
            var n = Math.min(Math.max(this.pacs[p].lives - 1, 0), 3);
            for (i = 0; i < n; i++) {
              window.PM.Sprites.drawPacman(ctx, 18 + p * 56 + i * 16, 278,
                D.LEFT, 2, this.colorFor(p));
            }
          }
        } else {
          // fondo común en 2 jugadores: iconos blancos (vidas del equipo)
          var color = twoP ? '#ffffff' : this.colorFor(0);
          var livesShown = Math.max(0, this.lives - 1);
          for (i = 0; i < livesShown && i < 5; i++) {
            window.PM.Sprites.drawPacman(ctx, 18 + i * 16, 278, D.LEFT, 2, color);
          }
        }
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
      /* aviso breve (rendición rechazada, sin respuesta, ...) */
      if (this.flash) {
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = CFG.COLORS.popup;
        ctx.fillText(this.flash.text, 112, 20 * T + T / 2 + CFG.MAZE_Y);
      }
      if (this.paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, CFG.NATIVE_W, CFG.NATIVE_H);
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = CFG.COLORS.text;
        ctx.fillText('PAUSA', 112, CFG.NATIVE_H / 2);
      }

      /* avisos de red */
      if (this.netRole && !this.netNotice && this.inGame() &&
          this.state !== 'GAME_OVER' && this.netWatch > CFG.NET.WAIT_TICKS) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, CFG.NATIVE_W, CFG.NATIVE_H);
        if (Math.floor(this.tick / 20) % 2 === 0) {
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = CFG.COLORS.text;
          ctx.fillText('ESPERANDO CONEXIÓN...', 112, CFG.NATIVE_H / 2);
        }
      }
      if (this.netNotice) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, CFG.NATIVE_W, CFG.NATIVE_H);
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = CFG.COLORS.ready;
        ctx.fillText(this.netNotice.text, 112, CFG.NATIVE_H / 2);
      }
    }
  };

  window.PM.Game = Game;
})();
