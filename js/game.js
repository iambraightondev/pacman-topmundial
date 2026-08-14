/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/game.js
 * Máquina de estados + bucle de paso fijo (60 Hz, acumulador).
 * Define window.PM.Game
 *
 * Modos de juego:
 *  - 1 jugador (clásico).
 *  - HABILIDADES: el mismo juego con cuatro poderes en Q/W/E/R.
 *    Es un modo aparte (como LABERINTOS) y no entra en el top
 *    mundial. Todo lo suyo vive en js/habilidades.js; aquí solo
 *    quedan los enganches.
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

  function esLista(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
  }

  var Game = {
    /* estado general */
    state: 'MENU',    // MENU | READY | PLAYING | DYING | LEVEL_DONE | GAME_OVER
    paused: false,

    /* partida */
    level: 1,
    score: 0,
    highScore: 0,      // récord del modo en curso (1 jugador o equipo)
    /* Un récord por formato: cada uno es su propia liga (y su propia ruta de
     * maestrías). Se leen y se escriben con recordFor/setRecordFor. */
    highScore1: 0,     // récord persistido de 1 jugador
    highScore2: 0,     // récord persistido de dúo
    highScore3: 0,     // récord persistido de trío
    highScore4: 0,     // récord persistido de escuadra
    lives: 3,          // fondo común (modo 'shared')
    livesMode: 'shared',
    extraLifeAwarded: false,

    /* jugadores */
    playerCount: 1,
    pacs: [],
    localIdx: 0,       // índice del jugador local (1 solo para el invitado online)
    dyingPlayer: 0,
    eaterIdx: 0,       // quién comió el último fantasma (queda oculto en la pausa)

    /* PAC-MAN VS. (js/versus.js): fantasma que lleva cada jugador (-1 = Pac-Man) */
    vsGhosts: null,
    vsScores: null,    // PAC-MAN VS.: marcador de cada cazador, por jugador

    /* red */
    netRole: null,     // null | 'host' | 'guest'
    netColors: null,   // colores online [J1, J2]
    netNames: null,    // nombres online [J1, J2]
    netSkins: null,    // skins online [J1, J2]
    netQueue: [],
    netWatch: 0,
    showCh: null,      // escaparate: canal para que un amigo mire la partida local
    showCode: null,    // código de ese canal (lo reparte el canal personal)
    showTimer: 0, showCount: 0,
    posWatch: [],      // por jugador: ticks sin noticias suyas (anfitrión)
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

    /* Azar reproducible. El original tampoco sortea de verdad: lleva un
     * contador que se reinicia con cada nivel, y por eso los patrones
     * memorizados salen siempre igual. Con Math.random los fantasmas azules
     * huían distinto en cada intento y no había patrón que valiera. */
    rndState: 1,
    /* Desplazamiento de la semilla, para que una partida se pueda repartir
     * igual a todo el mundo (RETO DE HOY). A 0 el azar es el de siempre. */
    seedBase: 0,
    reto: false,         // ¿esta partida es el reto del día?
    retoFecha: null,     // ...y de qué día (UTC)
    mazeId: null,        // laberinto alternativo en juego (null = el clásico)
    mazeLoaded: null,    // el que está puesto de verdad en CFG.MAZE
    hab: false,          // ¿esta partida es del modo HABILIDADES?

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

    /* emotes, chat y maestrías */
    emotes: [],          // por jugador: { e: idx, ticks } | null
    emoteCooldown: 0,
    chat: [],            // { name, color, text, ticks }
    chatCooldown: 0,
    /* logros: contadores de ESTA partida y avisos pendientes de enseñar */
    runGhosts: 0,        // fantasmas que me he comido yo
    runFrutas: 0,
    runRacha: 0,         // mejor racha con un mismo energizante
    limpiosSeguidos: 0,  // niveles seguidos despejados sin morir
    achNotices: [],      // cola de logros por celebrar
    achNotice: null,     // { name, desc, color, ticks, total }
    runAch: [],          // logros conseguidos en ESTA partida (para el resumen)

    badgeNotice: null,   // { name, color, mode, ticks, total } — maestría
    levelNotice: null,   // { level, ticks } — nivel de jugador recién subido
    rankingSent: false,  // una sola subida por partida
    xpSent: false,       // la experiencia de la partida ya está sumada
    pendingLevelUp: null,// nivel recién subido al salirse: lo celebra el menú
    timeTicks: 0,        // cronómetro de la partida (solo mientras se juega)

    /* rendición y revancha (deben aceptar los dos jugadores) */
    vote: null,          // { kind:'surrender'|'rematch', role:'from'|'to', local, ticks }
    dlgPaused: false,    // la pausa la puso un diálogo, no un jugador
    overIdle: false,     // GAME OVER terminado: panel de revancha en pantalla
    overWait: false,     // ...pero aún se están celebrando logros o nivel
    runSummary: null,    // lo que te llevas de la partida (lo enseña el panel)
    lastOpts: null,      // opciones de la partida en curso (para la revancha)
    replaying: false,    // se está viendo una repetición (js/replay.js): no cuenta para nada
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
    timeScale: 1,        // x2 al ver una repetición (js/replay.js)

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
      this.highScore3 = 0;
      this.highScore4 = 0;
      try {
        for (var n = 1; n <= CFG.MAX_PLAYERS; n++) {
          var v = localStorage.getItem(this.recordKey(n));
          if (v !== null) this.setRecordFor(n, parseInt(v, 10) || 0);
        }
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

    /* Hueco de emotes con una casilla por jugador */
    emptyEmotes: function () {
      var out = [];
      for (var i = 0; i < CFG.MAX_PLAYERS; i++) out.push(null);
      return out;
    },

    /* ---------------------------------------------------------
     * PAC-MAN VS.: quién lleva qué (el resto vive en versus.js)
     * --------------------------------------------------------- */
    /* Fantasma que lleva el jugador i (-1 si lleva un Pac-Man) */
    vsGhostOf: function (i) {
      if (!this.vsGhosts || !(i >= 0)) return -1;
      var g = this.vsGhosts[i];
      return (g >= 0 && g < 4) ? g : -1;
    },

    /* Jugador que lleva el fantasma g (-1 si lo lleva la máquina) */
    vsPlayerOf: function (g) {
      if (!this.vsGhosts) return -1;
      for (var i = 0; i < this.vsGhosts.length; i++) {
        if (this.vsGhosts[i] === g) return i;
      }
      return -1;
    },

    isVersus: function () {
      if (!this.vsGhosts) return false;
      for (var i = 0; i < this.vsGhosts.length; i++) {
        if (this.vsGhosts[i] >= 0) return true;
      }
      return false;
    },

    /* Lo que lleva cazado el jugador i. Cada cazador tiene el suyo: en una
     * partida con dos fantasmas humanos, un marcador común no diría quién ha
     * hecho qué (ni al nivel de jugador, que reparte experiencia). */
    vsScoreOf: function (i) {
      return (this.vsScores && this.vsScores[i]) || 0;
    },

    addVsScore: function (i, pts) {
      if (!this.vsScores || !(i >= 0)) return;
      this.vsScores[i] = (this.vsScores[i] || 0) + pts;
    },

    /* Pac-Man que ha cazado QUIEN JUEGA AQUÍ en esta partida de VS. (0 si no
     * es una de VS.). Online es el propio; en local, la suma de los
     * cazadores, porque los dos están en este teclado y los contadores de
     * logros son de esta máquina. */
    myCatches: function () {
      var V = window.PM.Versus;
      if (!V || !this.isVersus()) return 0;
      if (this.netRole) {
        return (this.localIdx >= 0) ? V.catches(this, this.localIdx) : 0;
      }
      var n = 0;
      for (var i = 0; i < this.pacs.length; i++) {
        if (this.vsGhostOf(i) >= 0) n += V.catches(this, i);
      }
      return n;
    },

    /* Ficha visible del jugador i: su fantasma si lleva uno y si no su
     * Pac-Man (null si ya no está en juego). La usan el nombre del "¡LISTO!"
     * y los emotes, que antes daban por hecho que todo el mundo lleva pac. */
    actorFor: function (i) {
      var gid = this.vsGhostOf(i);
      if (gid >= 0) return this.ghosts[gid];
      var p = this.pacs[i];
      return (p && !p.out) ? p : null;
    },

    /* Color del jugador i (online: colores intercambiados en el saludo).
     * Los jugadores 3 y 4 usan la paleta por defecto. */
    colorFor: function (i) {
      // quien lleva un fantasma se identifica con el color de SU fantasma:
      // el amarillo de su Pac-Man ya no pinta nada en la pantalla
      var gid = this.vsGhostOf(i);
      if (gid >= 0) return CFG.GHOSTS[gid].color;
      if (this.netColors && this.netColors[i]) return this.netColors[i];
      var s = this.settings();
      if (i === 0) return s.pacColor;
      if (i === 1) return s.pac2Color || CFG.PLAYER_COLORS[1];
      return CFG.PLAYER_COLORS[i] || '#ffffff';
    },

    /* Skin del jugador i (online: intercambiadas en el saludo) */
    skinFor: function (i) {
      var s = this.netSkins && this.netSkins[i];
      if (!s) {
        var st = this.settings();
        s = (i === 1) ? st.skin2 : st.skin1;
      }
      return (CFG.SKIN_IDS.indexOf(s) !== -1) ? s : 'clasico';
    },

    /* Nombre elegido para el jugador i ('' si no ha puesto ninguno).
     * En online los nombres se intercambian en el saludo (netNames). */
    rawName: function (i) {
      var n = this.netNames && this.netNames[i];
      if (!n) {
        var s = this.settings();
        // en local solo hay nombre propio para J1 y J2; el resto usa J3/J4
        if (i === 0) n = s.nick1;
        else if (i === 1) n = s.nick2;
        else n = '';
      }
      return String(n || '').replace(/^ +| +$/g, '');
    },

    /* Nombre visible, con J1/J2 como respaldo */
    nameFor: function (i) {
      return this.rawName(i) || ('J' + (i + 1));
    },

    /* Etiqueta del jugador i en el marcador. Quien lleva un fantasma va con
     * sus propios puntos al lado: el marcador grande es el del equipo
     * Pac-Man y ahí no tiene nada que hacer. */
    hudNameFor: function (i) {
      return (this.vsGhostOf(i) >= 0)
        ? (this.nameFor(i) + ' ' + this.vsScoreOf(i))
        : this.nameFor(i);
    },

    /* Escribe un texto encogiendo la letra hasta que quepa en ancho píxeles.
     * Los nombres pueden llegar a CFG.NICK_MAX letras y el lienzo solo mide
     * 224: con cuatro jugadores cada nombre tiene poco más de 50 px, así que
     * en vez de recortarlo (que deja al jugador sin reconocer su nombre) se
     * baja el cuerpo de la letra hasta 4 px, que sigue leyéndose. */
    fitText: function (ctx, text, x, y, ancho, cuerpo) {
      var px = cuerpo;
      ctx.font = 'bold ' + px + 'px monospace';
      while (px > 4 && ctx.measureText(text).width > ancho) {
        px--;
        ctx.font = 'bold ' + px + 'px monospace';
      }
      ctx.fillText(text, x, y);
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
      var n = parseInt(opts.players, 10);
      this.playerCount = (n >= 1 && n <= CFG.MAX_PLAYERS) ? n : 1;
      this.netRole = opts.net || null;
      // en una sala de grupo cada uno lleva su propio índice; en el dúo
      // clásico el anfitrión es el 0 y el invitado el 1
      var li = parseInt(opts.localIdx, 10);
      this.localIdx = (this.netRole === 'spec') ? -1        // mirón: ningún pac
        : (li >= 0 && li < this.playerCount) ? li
        : ((this.netRole === 'guest') ? 1 : 0);
      this.netColors = opts.colors || null;
      this.netNames = opts.names || null;
      this.netSkins = opts.skins || null;
      this.vote = null;
      this.dlgPaused = false;
      this.overIdle = false;
      this.flash = null;
      this.emotes = this.emptyEmotes();
      this.emoteCooldown = 0;
      this.chat = [];
      this.chatCooldown = 0;
      this.badgeNotice = null;
      this.levelNotice = null;
      this.rankingSent = false;
      this.xpSent = false;
      this.timeTicks = 0;
      this.timeSent = false;
      this.lvl1Cs = 0;         // centésimas que costó despejar el nivel 1
      /* reto del día: la semilla viene de fuera, así que la partida sale
       * igual en todas las máquinas (ver js/reto.js) */
      this.reto = !!opts.reto;
      this.retoFecha = opts.retoFecha || null;
      this.seedBase = (opts.seed | 0) || 0;
      /* laberinto alternativo (modo LABERINTOS). Se pone ANTES de
       * resetLevel(), que es quien reparte las pastillas. */
      this.mazeId = opts.maze || null;
      this.applyMaze(this.mazeId);
      /* modo HABILIDADES: Q/W/E/R. Se monta antes que los Pac-Man porque
       * reparte un juego de recargas por jugador (js/habilidades.js). */
      this.hab = !!opts.hab;
      if (window.PM.Hab) window.PM.Hab.empezar(this.hab, this.playerCount);
      this.runGhosts = 0;
      this.runFrutas = 0;
      this.runRacha = 0;
      this.limpiosSeguidos = 0;
      this.achNotices = [];
      this.achNotice = null;
      this.runAch = [];
      this.runSummary = null;
      this.overWait = false;

      var s = opts.cfg || this.settings();
      this.ghostSpeedMult = s.ghostSpeedMult;
      this.pacSpeedMult = s.pacSpeedMult;
      this.frightMult = s.frightMult;
      this.startLevel = s.startLevel;      // para el récord de velocidad
      this.startLives = s.startLives;      // viaja con la partida al top mundial
      this.livesMode = (this.playerCount > 1 && s.livesMode === 'individual')
        ? 'individual' : 'shared';
      this.level = s.startLevel;
      this.score = 0;
      this.extraLifeAwarded = false;
      this.paused = false;

      this.pacs = [];
      for (var i = 0; i < this.playerCount; i++) {
        this.pacs.push(new window.PM.Pacman(i));
      }
      /* PAC-MAN VS.: reparto de fantasmas. Va antes de las vidas porque a
       * quien lleva fantasma se le deja el Pac-Man fuera de juego. */
      this.vsGhosts = null;
      this.vsScores = null;
      if (window.PM.Versus) window.PM.Versus.setup(this, opts.ghosts);
      if (this.livesMode === 'individual') {
        // al que lleva fantasma no se le pintan vidas: no tiene Pac-Man
        for (i = 0; i < this.pacs.length; i++) {
          this.pacs[i].lives = this.pacs[i].out ? 0 : s.startLives;
        }
        this.lives = 0;
      } else {
        this.lives = s.startLives;
      }
      // el HIGH SCORE de la partida es el de SU formato: en trío se compite
      // contra la mejor marca de trío, no contra la de dúo
      this.highScore = this.recordFor(this.playerCount);

      /* red */
      this.netQueue = [];
      this.netWatch = 0;
      this.posWatch = [];       // silencio de cada jugador (anfitrión, 3 y 4)
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
        var recibe = function (n, d, sid) { self.netQueue.push([n, d, sid]); };
        var cerrado = function () { self.onNetClosed(); };
        if (this.isSpec()) {
          // de mirón la partida va por el canal de la sala ajena; el
          // principal se queda para la party propia, que sigue en pie
          window.PM.Net.viewHandler = recibe;
          window.PM.Net.viewOnClose = cerrado;
        } else {
          window.PM.Net.handler = recibe;
          window.PM.Net.onclose = cerrado;
        }
      }
      this.openShowcase();      // sin red: canal para que un amigo pueda mirar

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
      // desde aquí se graba la repetición de la partida (o se vuelve a
      // empezar la que se esté viendo). Ver js/replay.js
      if (window.PM.Replay) window.PM.Replay.alEmpezar(opts);
      // controles en pantalla: una cruceta o dos según el modo recién arrancado
      this.syncUI();
    },

    /* Pone (o quita) un laberinto alternativo. Los muros van precocinados en
     * dos lienzos, así que al cambiar de laberinto hay que rehacerlos; se
     * lleva la cuenta de cuál está puesto para no repintarlos por nada. */
    applyMaze: function (id) {
      var M = window.PM.Mazes;
      if (!M) return;
      id = id || null;
      if (this.mazeLoaded === id) return;
      this.mazeLoaded = id;
      M.apply(id);
      this.mazeBlue = this.buildMazeCanvas(CFG.COLORS.wall);
      this.mazeWhite = this.buildMazeCanvas(CFG.COLORS.wallFlash);
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
      if (window.PM.Hab) window.PM.Hab.limpiarEfectos();
      this.globalActive = false;
      this.globalCounter = 0;
      this.failsafeTicks = 0;
      this.elroy = 0;
      this.elroyBlocked = false;
      this.seedRnd(this.level);      // el nivel se juega siempre igual
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
      var tabla = CFG.STARTS[this.playerCount];
      if (tabla && tabla[i]) return tabla[i];
      return CFG.START.pac;
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
      // el turbo y el rastro del flash no sobreviven a la muerte (las
      // recargas sí: morir ya es castigo de sobra)
      if (window.PM.Hab) window.PM.Hab.limpiarEfectos();
      for (var g = 0; g < 4; g++) this.ghosts[g].resetAfterDeath();
      this.schedIndex = 0;
      this.schedTicks = 0;
      this.globalMode = 'scatter';
      this.frightTicks = 0;
      this.chainIndex = 0;
      this.globalActive = true;
      this.globalCounter = 0;
      this.failsafeTicks = 0;
      this.seedRnd(this.level * 31 + this.lives);   // el reintento, también
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
      // salirse a medias no tira lo jugado: la experiencia se lleva igual
      var subida = this.inGame() ? this.closeRun() : null;
      this.closeShowcase();
      if (subida) this.pendingLevelUp = subida;   // lo celebra el menú
      if (this.netRole) {
        var mirando = this.isSpec();
        try { window.PM.Net.gameSend('bye', {}); } catch (e) { /* canal cerrado */ }
        // De mirón solo se cierra la sala ajena: la party propia ni se entera.
        if (mirando) window.PM.Net.closeView();
        // Si venimos de una party el canal NO se cierra: el grupo sigue junto
        // en el menú y el líder puede echar otra sin volver a pasar el código.
        var P = window.PM.Party;
        if (P && P.inParty()) P.resume();
        else if (!mirando) window.PM.Net.leave();
        this.netRole = null;
        this.netColors = null;
        this.netNames = null;
        this.netSkins = null;
      }
      this.netNotice = null;
      this.emotes = this.emptyEmotes();
      this.chat = [];
      this.badgeNotice = null;
      this.levelNotice = null;
      this.vote = null;
      this.dlgPaused = false;
      this.overIdle = false;
      this.overWait = false;
      this.flash = null;
      this.lastOpts = null;
      this.reto = false;
      this.retoFecha = null;
      this.seedBase = 0;        // el azar vuelve a ser el de siempre
      this.playerCount = 1;
      this.vsGhosts = null;      // se acabó el PAC-MAN VS. de esta partida
      this.state = 'MENU';
      this.paused = false;
      this.stopAllLoops();
      this.mazeId = null;
      this.hab = false;
      if (window.PM.Hab) window.PM.Hab.empezar(false, 0);
      this.applyMaze(null);     // el clásico vuelve antes de repartir puntos
      this.loadPellets();
      if (window.PM.UI) window.PM.UI.showMenu();
    },

    /* Se puede pausar en cualquier momento de la partida, también durante la
     * animación de muerte o el cambio de nivel: quedarse sin poder abrir el
     * menú justo cuando te matan era desesperante. */
    canPause: function () {
      return this.inGame() && this.state !== 'GAME_OVER' && !this.netNotice;
    },

    togglePause: function () {
      if (!this.canPause()) return;
      this.setPaused(!this.paused);
    },

    /* La pausa abre/cierra el menú de pausa (ui.js lo pinta según el estado) */
    setPaused: function (on) {
      on = !!on;
      if (this.paused === on) return;
      this.paused = on;
      if (on) this.stopAllLoops();
      this.syncUI();
    },

    /* Viendo la partida de otro: ni se juega ni se manda nada */
    isSpec: function () { return this.netRole === 'spec'; },

    /* Pausa pedida por el jugador local (en online se coordina en red) */
    requestPause: function () {
      if (!this.canPause()) return;
      if (this.vote) return;   // hay un diálogo abierto: la pausa la lleva él
      if (this.isSpec()) { this.togglePause(); return; }   // solo su pantalla
      if (this.netRole === 'guest') {
        this.netSend('gevt', { t: 'pauseReq', on: !this.paused });
        return;
      }
      this.togglePause();
      this.hostEvt({ t: 'pause', on: this.paused });
    },

    /* Único embudo de la dirección: teclado, cruceta y deslizamiento pasan por
     * aquí. En PAC-MAN VS. quien lleva fantasma se queda con la pulsación. */
    setPacDir: function (idx, d) {
      if (window.PM.Versus && window.PM.Versus.steer(this, idx, d)) return;
      var p = this.pacs[idx];
      if (!p || p.out) return;
      /* Aquí es donde la repetición apunta cada giro; y mientras se ve una,
       * es ella quien los manda y el teclado no pinta nada (js/replay.js). */
      if (window.PM.Replay && !window.PM.Replay.entrada(idx, d)) return;
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
        if (p.out || p.dying) continue;   // a un muerto no se le persigue
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
        // timeScale acelera el reloj sin tocar la simulación: los pasos
        // siguen siendo de 1/60 s, solo que caben más en cada fotograma
        self.loopAcc += dt * (self.timeScale || 1);
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
      /* repeticiones: lleva su propio reloj y, si se está viendo una, mete
       * los giros que tocan en este tick antes de simular (js/replay.js) */
      if (window.PM.Replay) window.PM.Replay.paso();
      this.energizerTicks++;
      if (this.energizerTicks >= 12) {          // parpadeo ~0.2 s
        this.energizerTicks = 0;
        this.energizerOn = !this.energizerOn;
      }

      if (this.netRole) this.processNetQueue();
      this.stepVote();
      this.stepFlash();
      this.stepEmotes();
      this.stepChat();
      this.stepBadgeNotice();
      this.stepOverWait();
      // recargas y efectos de las habilidades (no hace nada fuera del modo)
      if (window.PM.Hab) window.PM.Hab.paso(this);

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
        this.stepClock();
        if (this.netRole === 'guest' || this.isSpec()) {
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
      else this.stepShowcase();       // partida local: se emite para los mirones
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
        if (p2 && p2.dotCounter >= this.houseLimitFor(p2)) {
          this.releaseGhost(p2);
        }
      }

      /* Elroy */
      this.updateElroy();

      /* contexto de IA (Inky necesita la casilla de Blinky) */
      this.blinkyTile = { x: this.ghosts[0].tileX(), y: this.ghosts[0].tileY() };

      /* muertes en curso: solo se congela quien muere, la partida sigue */
      this.stepPacDeaths(true);

      /* jugadores */
      for (i = 0; i < this.pacs.length; i++) {
        p = this.pacs[i];
        if (p.out || p.dying) continue;
        p.update(this.pacSpeedPx(p));
        // el pac remoto (invitado online) avanza por estima; sus puntos
        // comidos llegan por red dentro de los mensajes 'pos'
        if (this.isLocalAuth(i)) this.eatAt(p.tileX(), p.tileY(), p);
      }

      /* fantasmas */
      for (i = 0; i < 4; i++) {
        this.ghosts[i].update(this);
      }

      /* fruta */
      if (this.fruitActive) {
        this.fruitTicks--;
        if (this.fruitTicks <= 0) this.fruitActive = false;
        else {
          for (i = 0; i < this.pacs.length; i++) {
            p = this.pacs[i];
            if (p.out || p.dying || !this.isLocalAuth(i)) continue;
            if (p.tileY() === CFG.START.fruit.y &&
                (p.tileX() === 13 || p.tileX() === 14)) {
              this.fruitActive = false;
              if (!this.netRole || i === this.localIdx) {
                this.runFrutas++;
                this.bumpAch({ frutas: 1 });
              }
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

      /* Colisiones con fantasmas (el invitado decide las suyas): MISMA
       * CASILLA y nada más, como el arcade. Si Pac-Man y un fantasma
       * intercambian casillas en el mismo tick (cruzarse de frente) se
       * atraviesan sin tocarse — el original de 1980 hacía exactamente eso, y
       * aquí se respeta a propósito para no desviarse de sus patrones. */
      for (i = 0; i < this.pacs.length; i++) {
        p = this.pacs[i];
        if (p.out || p.dying || !this.isLocalAuth(i)) continue;
        var px = p.tileX(), py = p.tileY();
        for (j = 0; j < 4; j++) {
          g = this.ghosts[j];
          if (g.mode === 'house' || g.mode === 'entering') continue;
          if (g.tileX() !== px || g.tileY() !== py) continue;
          if (g.mode === 'eyes') continue;
          if (g.frightened) {
            this.eatGhost(g, i);
          } else {
            if (p.safeTicks > 0) continue;   // margen tras reaparecer en marcha
            this.startDeath(i, g.id);        // g.id: por si lo lleva un jugador
            break;                           // el otro jugador sigue a lo suyo
          }
        }
      }
      if (this.state !== 'PLAYING') return;  // el último ha muerto: parón clásico

      /* puntuaciones emergentes */
      for (i = this.popups.length - 1; i >= 0; i--) {
        if (--this.popups[i].ticks <= 0) this.popups.splice(i, 1);
      }

      /* nivel completado */
      if (this.dotsLeft <= 0) {
        if (this.level === 1) this.submitLevel1Time();
        this.limpiosSeguidos++;          // despejado, y sin morir por el camino
        this.bumpAch({ limpios: this.limpiosSeguidos });
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

    /* Al pasar de dispersión a persecución (y al revés) los fantasmas se dan
     * la vuelta donde estén. Al de un jugador no: para él no hay modos que
     * cambiar, así que darle la vuelta sería quitarle el mando de las manos.
     * La inversión del energizante sí le toca (forceReversalFright). */
    forceReversal: function () {
      for (var i = 0; i < 4; i++) {
        if (!this.ghosts[i].human) this.ghosts[i].forceReverse();
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
          (CFG.FRUIT_MIN_S + this.rndUnit() * (CFG.FRUIT_MAX_S - CFG.FRUIT_MIN_S)) * 60);
      }
    },

    /* segsFijos: el GRITO (R) del modo HABILIDADES asusta lo mismo en el
     * nivel 1 que en el 18, donde la superpastilla ya no dura nada. Sin eso
     * la habilidad se apagaría sola justo cuando más falta hace. */
    triggerFright: function (segsFijos) {
      var fr = CFG.fright(this.level);
      var secs = (segsFijos > 0) ? segsFijos : fr.seconds * this.frightMult;
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

    /* Con el energizante solo se dan la vuelta los que están por el
     * laberinto; a los de la casa no les toca */
    forceReversalFright: function () {
      for (var i = 0; i < 4; i++) {
        if (this.ghosts[i].mode === 'normal') this.ghosts[i].forceReverse();
      }
    },

    /* ---------------------------------------------------------
     * Casa de fantasmas: contadores de puntos
     * --------------------------------------------------------- */
    preferredInside: function () {
      var i;
      /* El fantasma de un jugador sale el primero: quedarse sesenta puntos
       * botando dentro de la casa sin poder hacer nada no es jugar a nada. */
      for (i = 1; i < 4; i++) {
        if (this.ghosts[i].human && this.ghosts[i].mode === 'house') return this.ghosts[i];
      }
      // orden de preferencia: Pinky -> Inky -> Clyde
      for (i = 1; i < 4; i++) {
        if (this.ghosts[i].mode === 'house') return this.ghosts[i];
      }
      return null;
    },

    /* Puntos que le hacen falta a un fantasma para salir de la casa. Al de un
     * jugador tampoco se le hace esperar: sale en cuanto le toca el turno. */
    houseLimitFor: function (g) {
      return g.human ? 0 : CFG.houseDotLimit(g.name, this.level);
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
    /* ---------------------------------------------------------
     * Azar reproducible (mismo nivel => misma tirada)
     * --------------------------------------------------------- */
    seedRnd: function (n) {
      // seedBase mueve TODAS las tiradas de la partida de golpe: es lo que
      // permite repartir el mismo azar a todo el mundo en el reto del día
      // sin tocar ni una regla del juego. A 0 sale lo de siempre.
      var s = (n | 0) + (this.seedBase | 0);
      this.rndState = (s * 2654435761 + 1013904223) >>> 0 || 1;
    },

    /* entero 0..3, que es lo único que se le pide: hacia dónde huye un
     * fantasma azul en un cruce */
    rndDir: function () {
      this.rndState = (this.rndState * 1103515245 + 12345) >>> 0;
      return (this.rndState >>> 16) & 3;
    },

    /* 0 <= x < 1, para la duración de la fruta */
    rndUnit: function () {
      this.rndState = (this.rndState * 1103515245 + 12345) >>> 0;
      return (this.rndState >>> 8) / 16777216;
    },

    /* Como en el arcade: una sola velocidad, y el freno de los puntos lo pone
     * la pausa de un tick al comerlos (ver la nota de CFG.speedRow). */
    pacSpeedPx: function (pac) {
      var row = this.speedRow;
      var pct = (this.frightTicks > 0) ? row.pacFright : row.pac;
      pct = Math.min(pct * this.pacSpeedMult, CFG.SPEED_CLAMP * 100);
      /* TURBO (W) va DESPUÉS del tope. El tope existe para que las partidas
       * clásicas se puedan comparar entre sí, y el modo HABILIDADES no
       * compite con nadie: aquí el x1.5 tiene que notarse entero o no vale
       * para nada. */
      if (this.hab && window.PM.Hab && pac) {
        pct *= window.PM.Hab.multVel(pac.id | 0);
      }
      return pct / 100 * CFG.BASE_SPEED;
    },

    /* ---------------------------------------------------------
     * Comer fantasmas / morir
     * --------------------------------------------------------- */
    eatGhost: function (g, who) {
      var streak = Math.min(this.chainIndex, 3);   // 0..3 dentro de la racha
      var pts = CFG.GHOST_CHAIN[streak];
      this.chainIndex++;
      /* logros: solo los que me como yo (en online, `who` dice quién fue) */
      if (!this.netRole || (who || 0) === this.localIdx) {
        this.runGhosts++;
        this.runRacha = Math.max(this.runRacha, this.chainIndex);
        this.bumpAch({ fantasmas: 1, racha: this.chainIndex });
      }
      this.addScore(pts);
      this.addPopup(g.x, g.y, pts, CFG.EAT_FREEZE_TICKS);
      g.eaten();
      this.eatFreezeTicks = CFG.EAT_FREEZE_TICKS;
      this.hiddenGhost = g.id;
      this.eaterIdx = who || 0;
      this.hostEvt({ t: 'eatGhost', g: g.id, pts: pts,
        x: Math.round(g.x), y: Math.round(g.y), w: this.eaterIdx, c: streak });
      window.AudioSys && AudioSys.playEatGhost();
      this.playStreakVoice(streak);
    },

    /* Voz de racha: 1.º "el hueso", 2.º "el diablo", 3.º "el huesaso",
     * 4.º "el diablo coño". La racha es del equipo, así que en dúo cuentan
     * los fantasmas que se coman entre los dos con el mismo energizante. */
    playStreakVoice: function (streak) {
      if (window.AudioSys && AudioSys.playVoice) AudioSys.playVoice(streak | 0);
    },

    /* Corta las animaciones de muerte a medias (al entrar en GAME OVER) */
    clearDeathAnims: function () {
      for (var i = 0; i < this.pacs.length; i++) {
        var p = this.pacs[i];
        p.dying = false;
        p.deathPhase = 0;
        p.deathTicks = 0;
      }
      this.predictFreeze = 0;
    },

    /* ¿hay alguna animación de muerte en marcha? */
    deathAnimating: function () {
      for (var i = 0; i < this.pacs.length; i++) {
        if (this.pacs[i].dying && this.pacs[i].deathPhase === 1) return true;
      }
      return false;
    },

    /* ¿queda algún jugador en danza, sin contar a exceptIdx? */
    anyPlaying: function (exceptIdx) {
      for (var i = 0; i < this.pacs.length; i++) {
        if (i === exceptIdx) continue;
        var p = this.pacs[i];
        if (!p.out && !p.dying) return true;
      }
      return false;
    },

    /* Muerte de un jugador. Si queda otro jugando, la partida NO se detiene:
     * solo ese Pac-Man se congela, hace su animación y reaparece. El parón
     * clásico (con reinicio de fantasmas y "¡LISTO!") es para el último.
     * byGhost: qué fantasma lo pilló, para apuntarle los puntos si lo lleva
     * un jugador (PAC-MAN VS.). */
    startDeath: function (who, byGhost) {
      var i = who || 0;
      var p = this.pacs[i];
      if (!p || p.out || p.dying) return;
      var last = !this.anyPlaying(i);
      // se acabó la racha de niveles limpios (solo cuenta la muerte propia)
      if (!this.netRole || i === this.localIdx) this.limpiosSeguidos = 0;
      if (window.PM.Versus) window.PM.Versus.onCatch(this, i, byGhost);
      this.startPacDeath(i);
      this.dyingPlayer = i;
      this.hostEvt({ t: 'death', w: i, g: last ? 1 : 0 });
      if (last) {
        this.state = 'DYING';
        this.dyingPhase = 0;
        this.phaseTicks = CFG.DEATH_FREEZE_TICKS;
        this.stopAllLoops();
      }
    },

    startPacDeath: function (i) {
      var p = this.pacs[i];
      if (!p || p.dying) return;
      p.dying = true;
      p.deathPhase = 0;
      p.deathTicks = CFG.DEATH_FREEZE_TICKS;
      p.deathOk = false;
      p.safeTicks = 0;
    },

    /* Avanza las muertes en curso. finish: si la partida sigue, el jugador
     * reaparece (o queda de espectador) al acabar su animación; si no, se
     * queda quieto y lo resuelve stepDying(). Devuelve true si alguna
     * animación sigue en marcha. */
    stepPacDeaths: function (finish) {
      var active = false;
      for (var i = 0; i < this.pacs.length; i++) {
        var p = this.pacs[i];
        if (p.safeTicks > 0) p.safeTicks--;
        if (!p.dying) continue;
        if (p.deathTicks > 0) {
          p.deathTicks--;
          active = true;
          if (p.deathTicks <= 0 && p.deathPhase === 0) {
            p.deathPhase = 1;
            p.deathTicks = CFG.DEATH_ANIM_TICKS;
            window.AudioSys && AudioSys.playDeath();
          }
          continue;
        }
        if (finish) this.finishPacDeath(i);
      }
      return active;
    },

    /* Fin de la animación: descuenta la vida y reaparece en su salida.
     * El invitado hace lo mismo (la instantánea siguiente lo confirma). */
    finishPacDeath: function (i) {
      var p = this.pacs[i];
      var left;
      p.dying = false;
      p.deathPhase = 0;
      p.deathTicks = 0;
      if (this.livesMode === 'individual') {
        p.lives = Math.max(0, p.lives - 1);
        left = p.lives;
      } else {
        this.lives = Math.max(0, this.lives - 1);
        left = this.lives;
      }
      if (left <= 0) {
        p.out = true;               // sin vidas: de espectador
      } else {
        p.reset(this.pacStart(i));
        p.safeTicks = CFG.RESPAWN_SAFE_TICKS;
      }
    },

    /* Parón clásico: ya no queda nadie jugando */
    stepDying: function () {
      if (this.stepPacDeaths(false)) return;
      for (var i = 0; i < this.pacs.length; i++) {
        if (this.pacs[i].dying) this.finishPacDeath(i);
      }
      var survivors = false;
      for (i = 0; i < this.pacs.length; i++) {
        if (!this.pacs[i].out) survivors = true;
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

    /* El panel del resumen sale cuando ya no queda nada celebrándose. Va en
     * step(), junto a los propios avisos, y no en stepGameOver: así sigue
     * saliendo aunque alguien pulse pausa justo en ese momento. */
    stepOverWait: function () {
      if (!this.overWait || this.celebrating()) return;
      this.overWait = false;
      this.syncUI();
    },

    /* ¿Hay algo celebrándose encima del laberinto? (logro, maestría o subida
     * de nivel). El resumen del final espera a que no quede nada. */
    celebrating: function () {
      return !!(this.achNotice || this.achNotices.length ||
                this.badgeNotice || this.levelNotice);
    },

    /* Cerrar la partida dispara los últimos logros y la subida de nivel, que
     * salen animados sobre el laberinto. El panel con el resumen no aparece
     * hasta que acaban: si saliera antes, taparía justo lo que celebra. */
    enterGameOverIdle: function () {
      this.overIdle = true;
      this.stopAllLoops();
      this.submitRanking();     // partidas de dúo van al top mundial
      this.overWait = this.celebrating();
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
      this.bumpAch({ nivelMax: this.level });
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
        if (this.playerCount > 1 && this.livesMode === 'individual') {
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
      this.checkBadges();        // ¿se ha cruzado un escalón de maestría?
    },

    /* ---------- Un récord por formato de partida ----------
     * Solo, dúo, trío y escuadra son ligas distintas: la misma puntuación no
     * cuesta lo mismo con una boca que con cuatro. De aquí salen también las
     * cuatro rutas de maestrías (js/badges.js). */
    recordKey: function (n) {
      if (n >= 4) return CFG.HIGHSCORE4_KEY;
      if (n === 3) return CFG.HIGHSCORE3_KEY;
      if (n === 2) return CFG.HIGHSCORE2_KEY;
      return CFG.HIGHSCORE_KEY;
    },

    recordFor: function (n) {
      if (n >= 4) return this.highScore4 || 0;
      if (n === 3) return this.highScore3 || 0;
      if (n === 2) return this.highScore2 || 0;
      return this.highScore1 || 0;
    },

    setRecordFor: function (n, v) {
      v = parseInt(v, 10) || 0;
      if (n >= 4) this.highScore4 = v;
      else if (n === 3) this.highScore3 = v;
      else if (n === 2) this.highScore2 = v;
      else this.highScore1 = v;
    },

    /* Escribe los cuatro récords tal cual están. Lo usa la cuenta al traerse
     * marcas mejores de otro sitio (persistHighScore solo sabe guardar el de
     * la partida en curso). */
    saveHighScores: function () {
      try {
        for (var n = 1; n <= CFG.MAX_PLAYERS; n++) {
          localStorage.setItem(this.recordKey(n), String(this.recordFor(n)));
        }
      } catch (e) { /* sin almacenamiento */ }
      // si no se está jugando, el marcador de la portada enseña el de 1 jugador
      if (this.state === 'MENU') this.highScore = this.highScore1;
    },

    /* En PAC-MAN VS. no se guarda récord: son otros ajustes (un fantasma que
     * piensa) y la marca no sería comparable con la de nadie. */
    persistHighScore: function () {
      if (this.replaying) return;    // una repetición no vuelve a hacer el récord
      if (this.isVersus()) return;   // ni una partida contra un fantasma humano
      /* Ni una de HABILIDADES. El récord de cada formato no es solo un número
       * en pantalla: viaja a la cuenta (perfiles.recordN) y de él salen las
       * maestrías. Una marca hecha mordiendo fantasmas daría una insignia que
       * no se ha ganado en el juego que la insignia dice. */
      if (this.hab) return;
      // cada formato guarda el suyo: el récord de escuadra no pisa el de dúo
      var n = this.playerCount;
      if (this.highScore > this.recordFor(n)) this.setRecordFor(n, this.highScore);
      try {
        localStorage.setItem(this.recordKey(n), String(this.recordFor(n)));
      } catch (e) { /* sin almacenamiento */ }
    },

    addPopup: function (x, y, text, ticks) {
      this.popups.push({ x: x, y: y, text: text, ticks: ticks });
    },

    /* =========================================================
     * EMOTES, CHAT Y MAESTRÍAS
     * ========================================================= */
    canEmote: function () {
      return this.inGame() && this.state !== 'GAME_OVER' && !this.isSpec() &&
        !this.netNotice && this.emoteCooldown <= 0;
    },

    /* Emote del jugador local (teclas 1..6 o botones en pantalla) */
    sendEmote: function (idx) {
      idx = parseInt(idx, 10);
      if (!(idx >= 0 && idx < CFG.EMOTES.length)) return;
      if (!this.canEmote()) return;
      var who = this.netRole ? this.localIdx : 0;
      this.emoteCooldown = CFG.EMOTE_COOLDOWN;
      this.showEmote(who, idx);
      if (this.netRole === 'guest') this.netSend('gevt', { t: 'emote', e: idx });
      else this.hostEvt({ t: 'emote', w: who, e: idx });
    },

    showEmote: function (who, idx) {
      if (!(idx >= 0 && idx < CFG.EMOTES.length)) return;
      if (!this.pacs[who]) return;
      this.emotes[who] = { e: idx, ticks: CFG.EMOTE_TICKS };
      window.AudioSys && AudioSys.playEmote && AudioSys.playEmote();
    },

    /* ---------- Enseñar la maestría (Ctrl+Espacio) ----------
     * La insignia es propia de cada máquina (sale del récord local), así que
     * por red viaja su id y el otro extremo la busca en la tabla. */
    badgeById: function (id) {
      for (var i = 0; i < CFG.BADGES.length; i++) {
        if (CFG.BADGES[i].id === id) return CFG.BADGES[i];
      }
      return null;
    },

    /* Escalón de la maestría (0 la primera … 5 la última). Manda cuánta
     * pompa gasta la animación de la chapa; sin maestría, la más sobria. */
    badgeRank: function (id) {
      for (var i = 0; i < CFG.BADGES.length; i++) {
        if (CFG.BADGES[i].id === id) return i;
      }
      return 0;
    },

    showBadgeTag: function (who, id) {
      if (!this.pacs[who]) return;
      var b = this.badgeById(id);
      this.emotes[who] = {
        tag: b ? b.name : 'SIN MAESTRÍA',
        color: b ? b.color : '#888888',
        rango: this.badgeRank(id),
        ticks: CFG.EMOTE_TICKS,
        total: CFG.EMOTE_TICKS      // para animar la chapa
      };
    },

    sendBadgeTag: function () {
      if (!this.canEmote()) return;
      var who = this.netRole ? this.localIdx : 0;
      // la del modo en curso: en una partida de dúo se enseña la de dúo
      var B = window.PM.Badges;
      var top = B && B.top(this.badgeMode());
      var id = top ? top.id : '';
      this.emoteCooldown = CFG.EMOTE_COOLDOWN;
      this.showBadgeTag(who, id);
      if (this.netRole === 'guest') this.netSend('gevt', { t: 'badge', b: id });
      else this.hostEvt({ t: 'badge', w: who, b: id });
    },

    stepEmotes: function () {
      if (this.emoteCooldown > 0) this.emoteCooldown--;
      for (var i = 0; i < this.emotes.length; i++) {
        var e = this.emotes[i];
        if (e && --e.ticks <= 0) this.emotes[i] = null;
      }
    },

    /* ---------- Chat (solo online) ---------- */
    canChat: function () {
      return !!this.netRole && !this.isSpec() && this.inGame() && !this.netNotice;
    },

    cleanChat: function (text) {
      return String(text == null ? '' : text)
        .replace(/[\x00-\x1f\x7f]/g, ' ')
        .replace(/ +/g, ' ')
        .replace(/^ +| +$/g, '')
        .slice(0, CFG.CHAT_MAX);
    },

    sendChat: function (text) {
      text = this.cleanChat(text);
      if (!text || !this.canChat() || this.chatCooldown > 0) return false;
      this.chatCooldown = CFG.CHAT_COOLDOWN;
      var who = this.netRole ? this.localIdx : 0;
      this.addChat(who, text);
      if (this.netRole === 'guest') this.netSend('gevt', { t: 'chat', m: text });
      else this.hostEvt({ t: 'chat', w: who, m: text });
      return true;
    },

    addChat: function (who, text) {
      text = this.cleanChat(text);
      if (!text) return;
      this.chat.push({
        name: this.nameFor(who),
        color: this.colorFor(who),
        text: text,
        ticks: CFG.CHAT_TICKS
      });
      while (this.chat.length > CFG.CHAT_KEEP) this.chat.shift();
      if (window.PM.UI && window.PM.UI.onChat) window.PM.UI.onChat();
    },

    stepChat: function () {
      if (this.chatCooldown > 0) this.chatCooldown--;
      for (var i = this.chat.length - 1; i >= 0; i--) {
        if (--this.chat[i].ticks <= 0) this.chat.splice(i, 1);
      }
    },

    /* ---------- Maestrías ----------
     * Cada formato tiene su propia ruta —solo, dúo, trío y escuadra—, con su
     * récord y sus insignias: una gran partida en escuadra no entrega las de
     * dúo ni las de solo. Y cada ruta pide más puntos cuanta más gente juega
     * (el escalón por los jugadores), porque el marcador de un equipo es de
     * todos y con cuatro se llega al mismo número con mucho menos mérito. */
    badgeMode: function () {
      var B = window.PM.Badges;
      return B ? B.modeFor(this.playerCount) : 'solo';
    },

    /* Solo se celebra lo que NO se tenía: una maestría ya conseguida no se
     * vuelve a anunciar partida tras partida (y menos aún en una party, donde
     * el cartel les tapa el laberinto a todos los de la sala). */
    checkBadges: function () {
      var B = window.PM.Badges;
      if (!B) return;
      if (this.isVersus()) return;   // maestrías = récord: aquí no cuentan
      var mode = this.badgeMode();
      var fresh = B.claim(this.score, mode);
      if (!fresh) return;
      this.badgeNotice = {
        name: fresh.name, color: fresh.color, mode: B.modeName(mode),
        ticks: CFG.BADGE_ANIM_TICKS, total: CFG.BADGE_ANIM_TICKS
      };
      window.AudioSys && AudioSys.playExtraLife();
    },

    stepBadgeNotice: function () {
      /* Con varios jugadores, la maestría y el logro comparten la banda de
       * arriba (ninguna de las dos entra ya en el laberinto), así que la
       * maestría espera a que el logro termine en vez de pisarlo. Mientras
       * espera no se le gasta el tiempo: se ve entera igual. */
      var espera = !this.bigNotices() && !!this.achNotice;
      if (this.badgeNotice && !espera && --this.badgeNotice.ticks <= 0) {
        this.badgeNotice = null;
      }
      if (this.levelNotice && --this.levelNotice.ticks <= 0) {
        this.levelNotice = null;
      }
      this.stepAchNotice();
    },

    /* ---------- Nivel de jugador ----------
     * El nivel mide CUÁNTO juegas, no lo bueno que eres: todos los puntos
     * de la partida suman, hagas 500 o 50 000, y no hace falta batir ningún
     * récord. Devuelve el nivel nuevo si se ha subido. */
    /* Puntos que se lleva ESTE jugador: el marcador del equipo si lleva un
     * Pac-Man, y los suyos de cazador si lleva un fantasma. En local manda
     * el jugador 1, que es de quien es el navegador. */
    myPoints: function () {
      var yo = this.netRole ? this.localIdx : 0;
      return (this.vsGhostOf(yo) >= 0) ? this.vsScoreOf(yo) : this.score;
    },

    awardLevelXp: function (pts) {
      if (pts === undefined) pts = this.score;
      if (!window.PM.Level || !(pts > 0)) return null;
      var nuevo = window.PM.Level.add(pts);
      if (nuevo) {
        this.levelNotice = { level: nuevo, ticks: 260 };
        window.AudioSys && AudioSys.playExtraLife();
      }
      return nuevo;
    },

    /* Cierre de partida: la experiencia se lleva UNA vez, acabe como acabe
     * (game over, rendición, reinicio o salir al menú a medias). Antes solo
     * contaba al llegar al GAME OVER, así que quien se salía antes no
     * sumaba nada de lo jugado. */
    closeRun: function () {
      if (this.xpSent || this.isSpec()) return null;
      this.xpSent = true;
      // la repetición se cierra y se guarda aquí, acabe como acabe la partida
      if (window.PM.Replay) window.PM.Replay.alAcabar();
      var L = window.PM.Level;
      var antes = L ? L.state() : null;
      // lo que ha hecho uno mismo: en PAC-MAN VS. el cazador tiene sus puntos
      var pts = this.myPoints();
      /* Logros de cierre: una partida más, la mejor puntuación y —en
       * PAC-MAN VS.— los Pac-Man cazados. Los cazados se cuentan AQUÍ y no
       * al cazar porque el marcador del cazador viaja en las instantáneas:
       * así le cuadra igual al anfitrión que al invitado, que es quien no se
       * entera de sus propias cazas (las decide el anfitrión). */
      this.bumpAch({ partidas: 1, puntosMax: pts, cazas: this.myCatches() });
      var subida = this.awardLevelXp(pts);
      /* Lo que te llevas de la partida, para el aviso del final. Se guarda
       * aquí porque es el único sitio donde se sabe el antes y el después:
       * después de esto la experiencia ya está sumada. */
      var ahora = L ? L.state() : null;
      this.runSummary = {
        puntos: pts,
        nivel: this.level,                          // nivel del laberinto
        exp: pts,                                   // la experiencia son los puntos
        lvlAntes: antes ? antes.level : 0,
        lvl: ahora ? ahora.level : 0,
        lvlPct: ahora ? ahora.pct : 0,
        lvlEn: ahora ? ahora.inLevel : 0,
        lvlPide: ahora ? ahora.needed : 0,
        logros: this.runAch.slice()
      };
      /* El reto del día se cierra aquí, acabe como acabe la partida: un
       * intento y lo que hayas hecho. Cerrarlo solo en el GAME OVER dejaría
       * que cualquiera se saliera al ver que la cosa iba mal. */
      if (this.reto && window.PM.Reto) {
        window.PM.Reto.cerrar(this.score, this.level, this.retoFecha);
      }
      // la cuenta se queda con lo último, si hay sesión
      if (window.PM.Account) window.PM.Account.pushQuiet();
      return subida;
    },

    /* ---------- Cronómetro ---------- */
    stepClock: function () {
      if (this.state === 'PLAYING' || this.state === 'DYING') this.timeTicks++;
    },

    /* mm:ss de la partida en curso */
    clockText: function () {
      var s = Math.floor(this.timeTicks / 60);
      var m = Math.floor(s / 60);
      s = s % 60;
      return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    },

    /* ---------------------------------------------------------
     * Logros
     * Se apuntan contadores según pasan las cosas (no al final), así el
     * aviso sale en el momento. Mirar la partida de otro no cuenta para
     * nada, y en online solo cuenta lo que hace uno mismo.
     * --------------------------------------------------------- */
    /* Etiquetas de la partida en curso, para los logros por modo.
     *
     * Son dos cosas a la vez y por eso es una lista: el FORMATO (solo o
     * acompañado) y el MODO (clásico, reto, laberinto, VS. o habilidades).
     * Una party de habilidades cuenta para las dos, que es lo que la gente
     * espera. El modo sí es uno solo: no se pueden mezclar entre ellos.
     *
     * 'clasico' es el laberinto de 1980 sin inventos, y ahí NO entra el reto
     * ni un laberinto alternativo: cada uno tiene sus propios logros y su
     * propia descripción, así que contarlos dos veces sería mentir en una
     * de las dos. */
    achTags: function () {
      var t = [(this.playerCount > 1) ? 'party' : 'solo'];
      if (this.hab) t.push('hab');
      else if (this.isVersus()) t.push('vs');
      else if (this.mazeId) t.push('lab');
      else if (this.reto) t.push('reto');
      else t.push('clasico');
      return t;
    },

    bumpAch: function (o) {
      // mirar la partida de otro (o ver una repetición ya jugada) no cuenta
      if (this.isSpec() || this.replaying) return;
      var A = window.PM.Achievements;
      if (!A) return;
      A.recordFor(this.achTags(), o);
      var fresh = A.claim();
      for (var i = 0; i < fresh.length; i++) {
        this.achNotices.push({
          name: fresh[i].name, desc: fresh[i].desc, color: fresh[i].color,
          ticks: CFG.ACH_NOTICE_TICKS, total: CFG.ACH_NOTICE_TICKS
        });
        // y quedan apuntados para el resumen del final de la partida
        this.runAch.push({
          name: fresh[i].name, desc: fresh[i].desc, color: fresh[i].color
        });
      }
      if (fresh.length && window.PM.Account) window.PM.Account.pushQuiet();
    },

    /* Va sacando los avisos de logro de uno en uno */
    stepAchNotice: function () {
      if (!this.achNotice) {
        if (!this.achNotices.length) return;
        this.achNotice = this.achNotices.shift();
      }
      if (--this.achNotice.ticks <= 0) this.achNotice = null;
    },

    /* ---------- Récord de velocidad del primer nivel ----------
     * Se manda al despejar el nivel 1, no al acabar la partida: así cuenta
     * aunque después te salgas o te maten. Solo vale a un jugador, sin red y
     * con los ajustes de siempre; con los fantasmas frenados o Pac-Man
     * acelerado la marca no sería comparable con la de nadie. */
    canTimeRecord: function () {
      if (this.playerCount !== 1 || this.netRole) return false;
      if (this.mazeId) return false;      // otro laberinto, otro tiempo
      // con FLASH y TURBO el nivel 1 se despeja por otro camino: esa marca no
      // se puede poner al lado de una hecha corriendo lo que corre Pac-Man
      if (this.hab) return false;
      // el reto del día mueve el azar entero: los fantasmas azules huyen por
      // otro lado, así que el patrón es otro y el tiempo no se compara con el
      // de nadie. Tiene su propia clasificación, que es donde cuenta.
      if (this.seedBase) return false;
      var r = CFG.TIME_RULES;
      return this.startLevel === r.startLevel &&
        this.pacSpeedMult === r.pacSpeedMult &&
        this.ghostSpeedMult === r.ghostSpeedMult &&
        this.frightMult === r.frightMult;
    },

    submitLevel1Time: function () {
      if (this.timeSent) return;
      this.timeSent = true;               // una sola vez por partida
      var cs = Math.round(this.timeTicks * 100 / 60);
      if (!(cs > 0) || cs > CFG.RANKING.MAX_TIME) return;
      this.lvl1Cs = cs;                   // el panel final lo enseña igual
      if (!this.canTimeRecord()) return;
      this.bumpAch({ mejorT1: cs });      // logro de velocidad, con las mismas reglas
      var R = window.PM.Ranking;
      if (!R || !R.configured()) return;
      var nombre = this.rawName(0);
      if (!nombre) return;                // sin nombre no hay récord
      R.submit({ jugadores: 1, modo: 'local', nombre1: nombre,
                 puntos: this.score, nivel: 1, tiempo1: cs,
                 nivelInicio: this.startLevel,
                 ajustes: this.rankAjustes(),
                 fantasmas: this.runGhosts,
                 tiempoMs: this.playedMs() });
    },

    /* Con qué se jugó, tal como lo esperan el top mundial y las repeticiones
     * (formato v1). La función de Supabase no admite la partida si esto hace
     * el juego más fácil de lo normal: es el mismo criterio que ya tenía la
     * marca de velocidad del nivel 1. */
    rankAjustes: function () {
      return {
        velFantasmas: this.ghostSpeedMult,
        velPac: this.pacSpeedMult,
        powerS: this.frightMult,
        vidas: this.startLives
      };
    },

    /* Milisegundos jugados (el cronómetro va a 60 ticks por segundo) */
    playedMs: function () {
      return Math.round(this.timeTicks * 1000 / 60);
    },

    /* ---------- Ranking mundial ----------
     * Dos clasificaciones: individual y dúo. Sin nombre no hay récord:
     * rawName() devuelve '' si el jugador no puso ninguno (nameFor() daría
     * el J1/J2 de relleno). */
    missingRankingName: function () {
      for (var i = 0; i < this.playerCount; i++) {
        if (!this.rawName(i)) return true;
      }
      return false;
    },

    /* ¿los nombres servirían para una clasificación pública? */
    badRankingName: function () {
      var R = window.PM.Ranking;
      if (!R || !R.nameAllowed) return false;
      for (var i = 0; i < this.playerCount; i++) {
        var n = this.rawName(i);
        if (n && !R.nameAllowed(n)) return true;
      }
      return false;
    },

    submitRanking: function () {
      if (this.rankingSent) return;
      this.rankingSent = true;      // una sola vez por partida
      if (this.isSpec()) return;    // mirar no da puntos ni historial
      this.closeRun();              // la experiencia también cuenta una vez
      // el historial local guarda todas las partidas, con nombre o sin él.
      // En PAC-MAN VS. se apuntan los puntos de uno, no los del equipo rival.
      if (this.myPoints() > 0 && window.PM.History) {
        window.PM.History.add({
          jugadores: this.playerCount,
          modo: this.netRole ? 'online' : 'local',
          nombre1: this.nameFor(0),
          nombre2: (this.playerCount === 2) ? this.nameFor(1) : '',
          puntos: this.myPoints(),
          nivel: this.level
        });
      }
      if (this.netRole === 'guest') return;     // online: sube solo el anfitrión
      // El top mundial es del laberinto de 1980, con su azar y con los cuatro
      // fantasmas de la máquina. En otro laberinto, con el azar del reto del
      // día o con un fantasma que piensa, no se compara nada: el reto tiene
      // su propia clasificación y VS. no compite con nadie.
      //
      // Y con HABILIDADES tampoco: morder fantasmas a golpe de tecla regala
      // puntos que en el arcade no existen, así que una partida así al lado
      // de una clásica no diría nada de nadie. Suma experiencia y logros,
      // que son tuyos, pero la tabla mundial se queda limpia.
      if (this.mazeId || this.seedBase || this.isVersus() || this.hab) return;
      if (!window.PM.Ranking || !window.PM.Ranking.configured()) return;
      if (!(this.score > 0)) return;
      if (this.missingRankingName()) return;    // se avisa en el panel final
      var self = this;
      /* Una clasificación por formato: individual, dúo, trío y escuadra.
       * Van todos los nombres de los que jugaron, que es lo que identifica
       * al equipo en la tabla. */
      window.PM.Ranking.submit({
        jugadores: this.playerCount,
        modo: this.netRole ? 'online' : 'local',
        nombre1: this.rawName(0),
        nombre2: (this.playerCount >= 2) ? this.rawName(1) : '',
        nombre3: (this.playerCount >= 3) ? this.rawName(2) : '',
        nombre4: (this.playerCount >= 4) ? this.rawName(3) : '',
        puntos: this.score,
        nivel: this.level,
        // lo que necesita la Edge Function para saber si la partida cuadra
        nivelInicio: this.startLevel,
        ajustes: this.rankAjustes(),
        fantasmas: this.runGhosts,
        tiempoMs: this.playedMs()
      }, function (err) {
        // si no entró, se dice en el panel de GAME OVER, que es donde el
        // jugador está mirando. La partida ya terminó: no rompe nada.
        if (err) self.setFlash('TOP MUNDIAL: ' + err);
      });
    },

    /* =========================================================
     * RENDICIÓN Y REVANCHA
     * Ambas son votaciones: en dos jugadores tienen que aceptarlo
     * los dos. En online el anfitrión es quien las ejecuta y avisa;
     * en local basta con confirmar en el diálogo.
     * ========================================================= */
    canSurrender: function () {
      return this.inGame() && this.state !== 'GAME_OVER' && !this.isSpec() &&
        !this.netNotice && !this.vote;
    },

    /* kind: 'surrender' (abandonar) | 'rematch' (otra tras el game over)
     *     | 'restart' (empezar de nuevo desde el menú de pausa) */
    voteAllowed: function (kind) {
      if (kind === 'rematch') return this.state === 'GAME_OVER' && !!this.lastOpts;
      if (kind === 'restart') return this.canSurrender() && !!this.lastOpts;
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
      if (ok) { this.execVote(kind); return; }
      this.setFlash(kind === 'surrender' ? 'RENDICIÓN RECHAZADA'
        : (kind === 'restart' ? 'REINICIO RECHAZADO' : 'REVANCHA RECHAZADA'));
    },

    /* El invitado no ejecuta nada: espera el evento del anfitrión.
     * 'rematch' y 'restart' acaban en lo mismo: partida nueva para los dos. */
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
      this.clearDeathAnims();
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
      this.closeRun();          // lo jugado hasta aquí también cuenta
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
      if (this.netRole && window.PM.Net) window.PM.Net.gameSend(name, data);
    },

    hostEvt: function (o) {
      if (this.netRole === 'host') {
        this.netSend('evt', o);
        // va también a la repetición de la partida online, si se está grabando
        if (window.PM.Replay) window.PM.Replay.redEvento(o);
      } else if (this.showCh) {
        this.showSend('evt', o);   // partida local, mirones
      }
    },

    /* =========================================================
     * ESCAPARATE — que un amigo pueda ver tu partida en local
     *
     * Jugando sin red no hay sala, así que hasta ahora a un amigo le salía
     * "NO ESTÁ EN NINGUNA PARTY" y no había forma de mirar una partida en
     * solo (ni de dos en el mismo teclado). Se abre un canal con un código al
     * azar que va SOLO HACIA FUERA: reparte el mismo saludo y las mismas
     * instantáneas que el anfitrión de una partida online, pero aquí no se
     * escucha a nadie —salvo el "hola, vengo a mirar"— y la partida no
     * depende de él para nada: si el canal falla, se cierra y a seguir
     * jugando. Quien mira usa exactamente el mismo camino de siempre.
     * ========================================================= */
    openShowcase: function () {
      this.closeShowcase();
      var N = window.PM.Net;
      if (this.netRole || !N || !N.configured()) return;
      if (!this.rawName(0)) return;      // sin nombre nadie puede encontrarte
      var self = this;
      this.showCode = N.randomCode();
      this.showCh = N.openChannel('sala:' + this.showCode, {
        onData: function (name, d, sid) {
          if (name === 'hello' && d && d.spec) self.sendShowView(sid);
        },
        onError: function () { self.closeShowcase(); }
      });
    },

    closeShowcase: function () {
      if (this.showCh) {
        try { this.showCh.close(); } catch (e) { /* ya estaba cerrado */ }
      }
      this.showCh = null;
      this.showCode = null;
      this.showTimer = 0;
      this.showCount = 0;
    },

    showSend: function (name, data) {
      if (!this.showCh) return;
      try { this.showCh.send(name, data); }
      catch (e) { this.closeShowcase(); }
    },

    sendShowView: function (sid) {
      this.showSend('svista', this.specView(sid));
      this.showSend('snap', this.buildSnapshot(true));
    },

    stepShowcase: function () {
      if (!this.showCh || !this.inGame()) return;
      this.showTimer++;
      if (this.showTimer < CFG.NET.SNAP_EVERY) return;
      this.showTimer = 0;
      this.showCount++;
      this.showSend('snap',
        this.buildSnapshot((this.showCount % CFG.NET.PELLET_SYNC_EVERY) === 0));
    },

    processNetQueue: function () {
      var q = this.netQueue;
      if (!q.length) return;
      this.netQueue = [];
      for (var i = 0; i < q.length; i++) {
        this.netWatch = 0;
        if (this.netRole === 'host') {
          var quien = this.idxOfSender(q[i][1], q[i][2]);
          if (quien > 0) this.posWatch[quien] = 0;
        }
        if (this.netRole === 'host') this.hostMsg(q[i][0], q[i][1], q[i][2]);
        else this.guestMsg(q[i][0], q[i][1], q[i][2]);   // invitado o espectador
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
        /* Con más de dos, el vigilante general no basta: mientras uno hable
         * los demás podrían estar callados y sus Pac-Man quedarse clavados.
         * Cada jugador tiene el suyo y al que calla se le deja de espectador. */
        if (this.playerCount > 2) {
          for (var w = 1; w < this.pacs.length; w++) {
            if (this.pacs[w].out) continue;
            this.posWatch[w] = (this.posWatch[w] || 0) + 1;
            if (this.posWatch[w] > CFG.NET.DROP_TICKS) this.dropPlayer(w);
          }
        }
        this.snapTimer++;
        if (this.snapTimer >= CFG.NET.SNAP_EVERY) {
          this.snapTimer = 0;
          this.snapCount++;
          var withPellets = (this.snapCount % CFG.NET.PELLET_SYNC_EVERY) === 0;
          var snap = this.buildSnapshot(withPellets);
          this.netSend('snap', snap);
          // y de paso queda grabada: una repetición de partida online es
          // justo este flujo (js/replay.js)
          if (window.PM.Replay) window.PM.Replay.redCuadro(snap);
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

    /* Con 3 y 4 jugadores, que uno se vaya no puede cargarse la partida de
     * los demás: se queda de espectador y los otros siguen. */
    dropPlayer: function (i) {
      var p = this.pacs[i];
      if (!p || p.out) return;
      p.out = true;
      p.lives = 0;
      p.dying = false;
      if (this.livesMode !== 'individual' && this.lives > 0) {
        // vidas compartidas: no se le regalan al resto las que no gastó
      }
      this.setFlash((this.rawName(i) || ('J' + (i + 1))) + ' SE HA IDO');
      if (this.netRole === 'host') this.hostEvt({ t: 'left', i: i });
      if (this.netRole === 'host' && !this.anyPlaying() && this.state === 'PLAYING') {
        this.state = 'GAME_OVER';
        this.phaseTicks = CFG.GAMEOVER_TICKS;
        this.overIdle = false;
        this.persistHighScore();
        this.hostEvt({ t: 'gameOver' });
        this.syncUI();
      }
    },

    /* Alguien deja la partida: uno menos si el grupo era grande */
    playerGone: function (i) {
      if (this.playerCount > 2 && i >= 0 && i < this.pacs.length) this.dropPlayer(i);
      else this.peerLeft();
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
    /* Qué jugador es quien manda (con 3 y 4 el mensaje trae su índice) */
    idxOfSender: function (data, sid) {
      var i = data && parseInt(data.i, 10);
      if (i >= 1 && i < this.pacs.length) return i;
      if (window.PM.Party && window.PM.Party.indexOf) {
        var pi = window.PM.Party.indexOf(sid);
        if (pi >= 1 && pi < this.pacs.length) return pi;
      }
      return 1;                      // dúo clásico: el invitado es el J2
    },

    hostMsg: function (name, data, sid) {
      switch (name) {
        case 'pos': {
          var idx = this.idxOfSender(data, sid);
          var p = this.pacs[idx];
          if (!p || !data) return;
          // dy = el invitado está muriendo: el mensaje solo sirve de señal de
          // vida (y para las pastillas), la posición la lleva el anfitrión
          if (!p.dying && !data.dy) {
            p.x = data.x; p.y = data.y;
            p.dir = data.d; p.nextDir = data.nd;
          }
          if (data.e && this.state === 'PLAYING') {
            for (var i = 0; i < data.e.length; i++) {
              var cell = data.e[i];
              var col = cell % CFG.COLS, row = (cell - col) / CFG.COLS;
              this.eatAt(col, row, p);
            }
          }
          break;
        }
        case 'gevt':
          if (data) this.hostGuestEvent(data, this.idxOfSender(data, sid));
          break;
        case 'hello':
          // los que vienen a mirar sí caben; a jugar ya no
          if (data && data.spec) this.sendSpecView(sid);
          else this.netSend('full', { to: sid });
          break;
        case 'bye':
          this.playerGone(this.idxOfSender(data, sid));
          break;
      }
    },

    /* who: qué jugador manda el evento (1..3 según la sala) */
    hostGuestEvent: function (d, who) {
      who = (who >= 1 && who < this.pacs.length) ? who : 1;
      switch (d.t) {
        case 'died':
          if (this.state === 'PLAYING' && this.pacs[who] &&
              !this.pacs[who].out && !this.pacs[who].dying) {
            this.startDeath(who, d.g);       // d.g: el fantasma que lo pilló
          }
          break;
        /* PAC-MAN VS.: el rumbo del jugador que lleva un fantasma. Es una
         * intención permanente, no un evento: si un mensaje se pierde, el
         * siguiente lo arregla y no se nota. */
        case 'gdir':
          if (window.PM.Versus) window.PM.Versus.setWish(this, who, d.d);
          break;
        case 'ateGhost': {
          var g = this.ghosts[d.g];
          if (this.state === 'PLAYING' && g && g.frightened &&
              (g.mode === 'normal' || g.mode === 'leaving')) {
            this.eatGhost(g, who);
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
            this.hostEvt({ t: 'fruitEat', pts: this.fruitInfo.points, w: who });
            window.AudioSys && AudioSys.playEatFruit();
          }
          break;
        case 'pauseReq':
          if (this.canPause() && !this.vote) {
            this.dlgPaused = false;
            this.setPaused(!!d.on);
            this.hostEvt({ t: 'pause', on: this.paused });
          }
          break;
        case 'vote':
          this.onVoteRequest(d.k);
          break;
        case 'voteRes':
          this.onVoteResult(d.k, !!d.ok);
          break;
        /* Modo HABILIDADES: un invitado pide un poder. La recarga que vale
         * es la de aquí —la suya vive en su navegador y no es de fiar—, y
         * lo que toca a los fantasmas (morder, gritar) lo ejecuta el
         * anfitrión. Ver js/habilidades.js. */
        case 'hab':
          if (window.PM.Hab) window.PM.Hab.peticion(this, who, d.k | 0);
          break;
        case 'emote':
          this.showEmote(who, d.e);
          this.hostEvt({ t: 'emote', w: who, e: d.e });
          break;
        case 'badge':
          this.showBadgeTag(who, d.b);
          this.hostEvt({ t: 'badge', w: who, b: d.b });
          break;
        case 'chat':
          this.addChat(who, d.m);
          this.hostEvt({ t: 'chat', w: who, m: this.cleanChat(d.m) });
          break;
      }
    },

    /* Alguien viene a ver la partida: se le manda el reparto (cuántos son,
     * nombres, colores y skins) y una instantánea completa con las pastillas,
     * para que pueda pintar desde el primer momento. */
    sendSpecView: function (sid) {
      if (this.netRole !== 'host') return;
      this.netSend('svista', this.specView(sid));
      this.netSend('snap', this.buildSnapshot(true));
    },

    /* El saludo que recibe quien viene a mirar: cuántos son, con qué nombre,
     * color y skin, y con qué ajustes se está jugando. Lo comparten la
     * partida online (sendSpecView) y la local (sendShowView). */
    specView: function (sid) {
      var nm = [], co = [], sk = [], i;
      for (i = 0; i < this.pacs.length; i++) {
        nm.push(this.rawName(i));
        co.push(this.colorFor(i));
        sk.push(this.skinFor(i));
      }
      return {
        v: CFG.NET.PROTO, to: sid, n: this.pacs.length,
        nm: nm, co: co, sk: sk,
        gh: this.vsGhosts,          // PAC-MAN VS.: quién lleva qué fantasma
        hab: !!this.hab,            // modo HABILIDADES: el mirón tiene que verlo
        cfg: {
          ghostSpeedMult: this.ghostSpeedMult,
          pacSpeedMult: this.pacSpeedMult,
          frightMult: this.frightMult,
          livesMode: this.livesMode,
          startLevel: this.level,
          startLives: 3
        }
      };
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
        tm: this.timeTicks,           // cronómetro: manda el anfitrión
        vs: this.vsScores || null,    // PAC-MAN VS.: marcador de cada cazador
        he: this.snapEaten,
        p0: { x: r1(p0.x), y: r1(p0.y), d: p0.dir, nd: p0.nextDir },
        /* posiciones de TODOS los jugadores: con 3 y 4 cada uno solo conoce
         * la suya, así que el anfitrión reparte las demás. Cada cliente
         * ignora la propia (la suya la simula él). */
        ps: [],
        g: []
      };
      for (i = 0; i < this.pacs.length; i++) {
        var pp = this.pacs[i];
        s.ps.push({ x: r1(pp.x), y: r1(pp.y), d: pp.dir, nd: pp.nextDir });
      }
      for (i = 0; i < 4; i++) {
        var g = this.ghosts[i];
        s.g.push({ x: r1(g.x), y: r1(g.y), d: g.dir, m: g.mode,
          f: g.frightened ? 1 : 0, lp: g.leavePhase, w: g.wishDir });
      }
      if (this.playerCount > 1 && this.livesMode === 'individual') {
        s.lv = [];
        for (i = 0; i < this.pacs.length; i++) s.lv.push(this.pacs[i].lives);
      } else {
        s.lv = this.lives;
      }
      /* espectadores y muertes en curso de cada jugador */
      s.out = [];
      s.pd = [];
      for (i = 0; i < this.pacs.length; i++) {
        var pp = this.pacs[i];
        s.out.push(pp.out ? 1 : 0);
        s.pd.push(pp.dying ? [pp.deathPhase, Math.round(pp.deathTicks)] : 0);
      }
      if (withPellets) s.pm = this.pelletHex();
      this.snapEaten = [];
      return s;
    },

    /* =========================================================
     * RED — invitado
     * ========================================================= */
    guestMsg: function (name, data, sid) {
      switch (name) {
        case 'snap': if (data) this.applySnapshot(data); break;
        case 'evt':  if (data) this.applyEvt(data); break;
        case 'bye': {
          if (this.isSpec()) { this.netFail('SE ACABÓ LA PARTIDA'); break; }
          // si se va el anfitrión se acabó; si se va otro invitado, sigue
          var i = this.idxOfSender(data, sid);
          if (i <= 0) this.peerLeft();
          else this.playerGone(i);
          break;
        }
      }
    },

    stepGuest: function () {
      this.stepDeathConfirm();
      switch (this.state) {
        case 'READY':
          // el paso a PLAYING lo decide el anfitrión (llega por red)
          if (this.readyTicks > 0) this.readyTicks--;
          break;
        case 'PLAYING':
          this.stepGuestPlaying();
          break;
        case 'DYING':
          // animación local; el reinicio lo manda el anfitrión ('ready')
          this.stepPacDeaths(false);
          if (this.phaseTicks > 0) this.phaseTicks--;
          break;
        case 'LEVEL_DONE':
          // animaciones suaves entre instantáneas
          if (this.phaseTicks > 0) this.phaseTicks--;
          break;
        case 'GAME_OVER':
          this.stepGameOver();
          break;
      }
    },

    /* Invitado: su muerte es una predicción; si el anfitrión no la confirma
     * a tiempo, se deshace y se sigue jugando. */
    stepDeathConfirm: function () {
      if (this.predictFreeze <= 0) return;
      this.predictFreeze--;
      if (this.predictFreeze > 0) return;
      var me = this.pacs[this.localIdx] || null;
      if (!me) return;
      if (me && me.dying && !me.deathOk) {
        me.dying = false;
        me.deathPhase = 0;
        me.deathTicks = 0;
        if (this.state === 'DYING') this.state = 'PLAYING';
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

      /* muertes en curso (propia o del compañero): la partida no se para */
      this.stepPacDeaths(true);

      if (this.frightTicks > 0) this.stepFright();

      // de espectador no hay pac propio: todos van por estima
      var me = this.pacs[this.localIdx] || null;

      /* los demás jugadores avanzan por estima entre instantáneas */
      for (i = 0; i < this.pacs.length; i++) {
        if (i === this.localIdx) continue;
        var otro = this.pacs[i];
        if (!otro.out && !otro.dying) otro.update(this.pacSpeedPx(otro));
      }

      /* pac propio: simulación local completa (sin lag de entrada) */
      if (me && !me.out && !me.dying) {
        me.update(this.pacSpeedPx(me));
        this.guestEatAt(me);
      }

      /* fantasmas: simulación local corregida por las instantáneas */
      this.blinkyTile = { x: this.ghosts[0].tileX(), y: this.ghosts[0].tileY() };
      for (i = 0; i < 4; i++) {
        this.ghosts[i].update(this);
      }

      /* fruta: la gestiona el anfitrión; aquí solo la recogida propia */
      if (this.fruitActive && me && !me.out && !me.dying) {
        if (me.tileY() === CFG.START.fruit.y &&
            (me.tileX() === 13 || me.tileX() === 14)) {
          this.fruitActive = false;               // el evt trae los puntos
          this.runFrutas++;
          this.bumpAch({ frutas: 1 });
          this.netSend('gevt', { t: 'ateFruit' });
        }
      }

      if (me && !me.out && !me.dying) this.guestCollisions(me);

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

    /* Igual que en el anfitrión: solo cuenta compartir casilla */
    guestCollisions: function (me) {
      var px = me.tileX(), py = me.tileY();
      for (var i = 0; i < 4; i++) {
        var g = this.ghosts[i];
        if (g.mode === 'house' || g.mode === 'entering') continue;
        if (g.tileX() !== px || g.tileY() !== py) continue;
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
          if (me.safeTicks > 0) continue;      // margen tras reaparecer
          /* predicción: se congela este Pac-Man (no la partida) y el
           * anfitrión confirma con 'death'; si es el último, parón clásico */
          this.startPacDeath(me.id);
          this.predictFreeze = CFG.DEATH_CONFIRM_TICKS;
          if (!this.anyPlaying(me.id)) {
            this.state = 'DYING';
            this.dyingPhase = 0;
            this.stopAllLoops();
          }
          this.netSend('gevt', { t: 'died', g: g.id });
        }
        return;
      }
    },

    sendGuestUpdates: function () {
      /* PAC-MAN VS.: el que lleva fantasma no tiene posición que reportar.
       * Manda su rumbo, que además vale de señal de vida. */
      if (window.PM.Versus && window.PM.Versus.sendDir(this)) return;
      var me = this.pacs[this.localIdx];
      if (!me) return;
      /* Mientras muere se sigue enviando al mismo ritmo (si no, el vigilante
       * del anfitrión lo daría por desconectado y congelaría la partida al
       * otro jugador), pero marcado con dy: su posición la manda el
       * anfitrión, que si no lo devolvería al sitio tras reaparecer. */
      var dying = !!me.dying;
      this.posTimer++;
      var turned = !dying &&
        (me.dir !== this._lastSentDir || me.nextDir !== this._lastSentNext);
      var dirty = this.outEaten.length > 0 || turned;
      if (!dirty && this.posTimer < CFG.NET.POS_EVERY) return;
      this.posTimer = 0;
      this._lastSentDir = me.dir;
      this._lastSentNext = me.nextDir;
      var msg = {
        x: r1(me.x), y: r1(me.y), d: me.dir, nd: me.nextDir,
        e: this.outEaten,
        i: this.localIdx        // con 3 y 4 jugadores hace falta saber quién es
      };
      if (dying) msg.dy = 1;
      this.netSend('pos', msg);
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
        case 'left':                 // el anfitrión avisa de quién se ha ido
          if (e.i !== this.localIdx) this.dropPlayer(e.i);
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
          // la racha la lleva el anfitrión: la voz sale con su número
          this.playStreakVoice(e.c || 0);
          /* Y aquí es donde el INVITADO se apunta sus propios fantasmas.
           * Se hace con el evento confirmado y no con la predicción, para no
           * contar uno que el anfitrión acabe rechazando. `e.c` es el escalón
           * de la cadena empezando en 0, así que la racha es uno más. */
          if ((e.w || 0) === this.localIdx) {
            this.runGhosts++;
            var rch = (e.c | 0) + 1;
            this.runRacha = Math.max(this.runRacha, rch);
            this.bumpAch({ fantasmas: 1, racha: rch });
          }
          break;
        }
        case 'death': {
          var w = e.w || 0;
          var pw = this.pacs[w];
          if (pw) {
            if (!pw.dying) this.startPacDeath(w);
            pw.deathOk = true;
          }
          if (w === this.localIdx) this.predictFreeze = 0;
          this.dyingPlayer = w;
          if (e.g) {                 // era el último: parón clásico
            this.state = 'DYING';
            this.dyingPhase = 0;
            this.phaseTicks = CFG.DEATH_FREEZE_TICKS;
            this.stopAllLoops();
          }
          break;
        }
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
          this.clearDeathAnims();
          this.state = 'GAME_OVER';
          this.phaseTicks = CFG.GAMEOVER_TICKS;
          this.overIdle = false;
          this.highScore = Math.max(this.highScore, this.score);
          this.persistHighScore();
          this.stopAllLoops();
          this.syncUI();
          break;
        case 'pause':
          this.setPaused(!!e.on);
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
        /* Habilidad de otro: aquí solo se PINTA (dientes, chispas, el
         * translúcido del flash). Lo que cambia la partida ya viene por su
         * propio evento —'eatGhost' para el mordisco, 'fright' para el
         * grito—, así que aplicarlo otra vez sería contarlo dos veces. */
        case 'hab':
          if (window.PM.Hab) window.PM.Hab.evento(this, e.w || 0, e.k | 0);
          break;
        case 'emote':
          if ((e.w || 0) !== this.localIdx) this.showEmote(e.w || 0, e.e);
          break;
        case 'badge':
          if ((e.w || 0) !== this.localIdx) this.showBadgeTag(e.w || 0, e.b);
          break;
        case 'chat':
          if ((e.w || 0) !== this.localIdx) this.addChat(e.w || 0, e.m);
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
        this.overIdle = false;
        if (s.st === 'GAME_OVER') {
          this.clearDeathAnims();
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

      this.setPaused(!!s.pz);   // solo refresca el menú de pausa si cambia

      // el sonido de muerte lo dispara la animación local de cada Pac-Man

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
      this.checkBadges();        // el invitado también ve su cartel
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
      if (typeof s.tm === 'number') this.timeTicks = s.tm;
      if (esLista(s.vs)) this.vsScores = s.vs.slice();

      /* vidas y espectadores */
      if (this.livesMode === 'individual' && s.lv && s.lv.length) {
        for (i = 0; i < this.pacs.length && i < s.lv.length; i++) {
          this.pacs[i].lives = s.lv[i];
        }
      } else {
        this.lives = s.lv;
      }
      if (s.out) {
        for (i = 0; i < this.pacs.length && i < s.out.length; i++) {
          this.pacs[i].out = !!s.out[i];
        }
      }

      /* Muertes en curso del OTRO jugador. La propia no se toca: nace de la
       * predicción local, la confirma el evento 'death' y su animación va por
       * libre; el anfitrión siempre la ve empezar y acabar más tarde, así que
       * copiarla de aquí la reiniciaría en bucle. */
      if (s.pd) {
        for (i = 0; i < this.pacs.length && i < s.pd.length; i++) {
          if (i === this.localIdx) continue;
          var pdi = this.pacs[i], d = s.pd[i];
          if (d) {
            if (!pdi.dying) {              // se perdió el evento 'death'
              this.startPacDeath(i);
              pdi.deathPhase = d[0];
              pdi.deathTicks = d[1];
              pdi.deathOk = true;
            }
          } else if (pdi.dying) {
            pdi.dying = false;             // el anfitrión ya la dio por acabada
            pdi.deathPhase = 0;
            pdi.deathTicks = 0;
          }
        }
      }

      /* celdas comidas en el anfitrión desde la última instantánea */
      if (s.he) {
        for (i = 0; i < s.he.length; i++) this.removePellet(s.he[i]);
      }

      /* pac del anfitrión */
      /* jugadores: todos menos el propio, que se simula en local */
      if (s.ps && s.ps.length) {
        for (i = 0; i < this.pacs.length && i < s.ps.length; i++) {
          if (i === this.localIdx) continue;
          var pd = s.ps[i], pj = this.pacs[i];
          pj.x = pd.x; pj.y = pd.y;
          pj.dir = pd.d; pj.nextDir = pd.nd;
        }
      } else if (s.p0 && this.localIdx !== 0) {
        var h = this.pacs[0];
        h.x = s.p0.x; h.y = s.p0.y;
        h.dir = s.p0.d; h.nextDir = s.p0.nd;
      }

      /* fantasmas */
      var V = window.PM.Versus;
      if (s.g) {
        for (i = 0; i < 4 && i < s.g.length; i++) {
          var gd = s.g[i], g = this.ghosts[i];
          /* PAC-MAN VS.: el fantasma que lleva uno mismo se simula aquí con
           * autoridad, igual que el Pac-Man propio. Copiarle la posición cada
           * instantánea sería un tirón por cada mensaje: el anfitrión va un
           * viaje de red por detrás. Solo se acepta la suya si cambia de modo
           * (le han comido, sale de casa...) o si los dos empiezan a separarse
           * (ver CFG.VS.RESYNC_PX: se corta pronto para que la corrección no
           * llegue a ser un salto de pasillo a pasillo). */
          var mio = !!(V && V.drivenHere(this, i));
          if (!mio || g.mode !== gd.m || V.tooFar(g, gd)) {
            g.x = gd.x; g.y = gd.y; g.dir = gd.d;
          }
          g.mode = gd.m;
          g.frightened = protFright ? (g.frightened || !!gd.f) : !!gd.f;
          g.leavePhase = gd.lp || 0;
          // el rumbo del fantasma ajeno viene del anfitrión: así los demás
          // clientes lo simulan igual entre instantánea e instantánea
          if (!mio && typeof gd.w === 'number') g.wishDir = gd.w;
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
      c.lineCap = 'butt';
      c.beginPath();
      for (var r = 0; r < CFG.ROWS; r++) {
        for (var col = 0; col < CFG.COLS; col++) {
          if (CFG.MAZE[r].charAt(col) !== '#') continue;
          // arista por cada lado que da a un pasillo
          if (this.isPath(col, r - 1)) this.wallSide(c, col, r, 0, -1);
          if (this.isPath(col, r + 1)) this.wallSide(c, col, r, 0, 1);
          if (this.isPath(col - 1, r)) this.wallSide(c, col, r, -1, 0);
          if (this.isPath(col + 1, r)) this.wallSide(c, col, r, 1, 0);
        }
      }
      c.stroke();
      /* puerta de la casa (rosa), a la altura del trazo de los muros vecinos */
      var IN = CFG.WALL_INSET;
      c.fillStyle = CFG.COLORS.door;
      c.fillRect(13 * T - IN, 12 * T + T - IN - 1, 2 * T + IN * 2, 2);
      return cv;
    },

    /* Un lado del muro, retranqueado WALL_INSET px hacia el interior de la
     * casilla (muros finos, pasillos anchos). Los extremos se recortan en las
     * esquinas convexas —donde también se dibuja el lado perpendicular— y se
     * alargan en las cóncavas, donde el contorno gira en la casilla vecina. */
    wallSide: function (ctx, col, row, sx, sy) {
      var IN = CFG.WALL_INSET;
      var x = col * T, y = row * T;
      var horiz = (sy !== 0);            // lado superior/inferior: trazo horizontal
      var v = horiz
        ? (sy < 0 ? y + IN + 0.5 : y + T - IN - 0.5)
        : (sx < 0 ? x + IN + 0.5 : x + T - IN - 0.5);
      var ax = horiz ? -1 : 0, ay = horiz ? 0 : -1;   // hacia el extremo menor
      var a = (horiz ? x : y);
      var b = a + T;
      /* extremo menor */
      if (this.isPath(col + ax, row + ay)) a += IN;
      else if (!this.isPath(col + ax + sx, row + ay + sy)) a -= IN + 1;
      /* extremo mayor */
      if (this.isPath(col - ax, row - ay)) b -= IN;
      else if (!this.isPath(col - ax + sx, row - ay + sy)) b += IN + 1;

      if (horiz) { ctx.moveTo(a, v); ctx.lineTo(b, v); }
      else { ctx.moveTo(v, a); ctx.lineTo(v, b); }
    },

    /* ¿la casilla es pasillo visible? (para dibujar aristas) */
    isPath: function (col, row) {
      if (row < 0 || row >= CFG.ROWS) return false;
      if (col < 0 || col >= CFG.COLS) return row === CFG.TUNNEL_ROW;
      var ch = CFG.MAZE[row].charAt(col);
      return ch !== '#';
    },

    /* Un Pac-Man vivo, con lo que le haya puesto el modo HABILIDADES encima.
     * Fuera del modo es exactamente el dibujo de siempre. */
    drawPac: function (ctx, pc, i) {
      var color = this.colorFor(i);
      var A = window.PM.Hab;
      if (!this.hab || !A) {
        pc.draw(ctx, color, this.skinFor(i));
        return;
      }
      var y = pc.y + CFG.MAZE_Y;
      var S = window.PM.Sprites;
      var st = A.estado(i);
      // las chispas del turbo van DEBAJO, que son estela y no adorno
      if (st && st.turbo > 0) S.drawTurboSparks(ctx, pc.x, y, pc.dir, color, st.chispa);
      if (st && st.flash > 0) {
        // el rastro va detrás del SALTO, que puede no ir hacia donde se mira
        var dFl = (st.flashDir >= 0) ? st.flashDir : pc.dir;
        S.drawFlashTrail(ctx, pc.x, y, dFl, color, st.flash / CFG.HAB.FLASH_SHOW);
      }
      var alfa = A.alfa(i);
      if (alfa < 1) { ctx.save(); ctx.globalAlpha = alfa; }
      pc.draw(ctx, color, this.skinFor(i));
      if (st && st.dientes > 0) {
        S.drawPacTeeth(ctx, pc.x, y, pc.dir, pc.visibleMouth(), color);
      }
      if (alfa < 1) ctx.restore();
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
        // los fantasmas solo desaparecen en el parón clásico del último jugador
        var hideGhosts = (this.state === 'DYING' && this.deathAnimating()) ||
                         (this.state === 'LEVEL_DONE' && this.levelPhase === 1);
        if (!hideGhosts) {
          for (i = 0; i < 4; i++) {
            if (this.eatFreezeTicks > 0 && i === this.hiddenGhost) continue;
            this.ghosts[i].draw(ctx, this);
          }
          /* PAC-MAN VS.: marca sobre el fantasma que lleva un jugador. Sin
           * ella no hay quien sepa cuál de los cuatro piensa por su cuenta. */
          if (window.PM.Versus) window.PM.Versus.drawMarks(this, ctx);
        }
        for (i = this.pacs.length - 1; i >= 0; i--) {
          var pc = this.pacs[i];
          if (pc.out) continue;
          if (pc.dying) {
            if (pc.deathPhase === 1) {
              var t = 1 - pc.deathTicks / CFG.DEATH_ANIM_TICKS;
              window.PM.Sprites.drawPacmanDeath(ctx, pc.x,
                pc.y + CFG.MAZE_Y, t, this.colorFor(i));
            } else {
              pc.draw(ctx, this.colorFor(i));   // congelado antes de la animación
            }
            continue;
          }
          if (this.eatFreezeTicks > 0 && i === this.eaterIdx) continue;
          // parpadeo del margen de gracia al reaparecer con la partida en marcha
          if (pc.safeTicks > 0 && Math.floor(this.tick / 6) % 2 === 0) continue;
          this.drawPac(ctx, pc, i);
        }
        /* nombre (o J1/J2) sobre cada jugador durante el "¡LISTO!" */
        if (this.playerCount > 1 && this.state === 'READY') {
          ctx.font = 'bold 7px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (i = 0; i < this.pacs.length; i++) {
            // actorFor: el fantasma de quien lleva uno, si no su Pac-Man
            var act = this.actorFor(i);
            if (!act) continue;
            ctx.fillStyle = this.colorFor(i);
            this.fitText(ctx, this.nameFor(i), act.x,
              act.y + CFG.MAZE_Y - 10, 64, 7);
          }
        }
        /* emotes y maestrías sobre cada jugador */
        for (i = 0; i < this.pacs.length; i++) {
          var em = this.emotes[i];
          var ac2 = em ? this.actorFor(i) : null;
          if (!ac2) continue;
          var ex = ac2.x, ey = ac2.y + CFG.MAZE_Y - 11;
          if (em.tag) {
            var et = 1 - (em.ticks / (em.total || CFG.EMOTE_TICKS));
            window.PM.Sprites.drawBadgeTag(ctx, ex, ey, em.tag, em.color,
              et, this.tick, em.rango);
          } else {
            window.PM.Sprites.drawEmote(ctx, ex, ey, em.e, this.colorFor(i),
              this.tick);
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
      var team = (this.playerCount > 1 && this.state !== 'MENU');
      ctx.font = 'bold 8px monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = CFG.COLORS.text;

      ctx.textAlign = 'left';
      var leftLabel = team ? 'EQUIPO'
        : ((this.state !== 'MENU' && this.rawName(0)) || '1UP');
      // hasta donde empieza "HIGH SCORE" (centrado en 112, unos 48 px de ancho)
      this.fitText(ctx, leftLabel, 20, 0, 66, 8);
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HIGH SCORE', 112, 0);

      ctx.textAlign = 'right';
      var sc = (this.state === 'MENU') ? 0 : this.score;
      var hs = (this.state === 'MENU') ? this.highScore1 : this.highScore;
      ctx.fillText(String(sc || 0), 56, 9);
      ctx.fillText(String(hs || 0), 136, 9);

      /* nombres del equipo en la tercera línea: dos a los lados, y con 3 o 4
       * jugadores repartidos por igual para que quepan todos */
      if (team) {
        ctx.textBaseline = 'top';
        var n = this.pacs.length;
        if (n === 2) {
          ctx.textAlign = 'left';
          ctx.fillStyle = this.colorFor(0);
          this.fitText(ctx, this.hudNameFor(0), 20, 16, 88, 7);
          ctx.textAlign = 'right';
          ctx.fillStyle = this.colorFor(1);
          this.fitText(ctx, this.hudNameFor(1), 204, 16, 88, 7);
        } else {
          ctx.textAlign = 'center';
          var ancho = (CFG.NATIVE_W - 16) / n;
          for (i = 0; i < n; i++) {
            ctx.fillStyle = this.colorFor(i);
            // el que lleva fantasma tiene el pac fuera de juego a propósito:
            // ese nombre no va apagado, que sigue jugando
            ctx.globalAlpha = (this.pacs[i].out && this.vsGhostOf(i) < 0) ? 0.4 : 1;
            this.fitText(ctx, this.hudNameFor(i), 8 + ancho * (i + 0.5), 16,
              ancho - 3, 7);
          }
          ctx.globalAlpha = 1;
        }
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = CFG.COLORS.text;
      }

      /* vidas (mini Pac-Mans) */
      if (this.state !== 'MENU') {
        if (team && this.livesMode === 'individual') {
          // una tira corta por jugador, cada una de su color
          var hueco = Math.floor(96 / this.pacs.length);
          for (p = 0; p < this.pacs.length; p++) {
            var quedan = Math.min(Math.max(this.pacs[p].lives - 1, 0),
                                  this.pacs.length > 2 ? 2 : 3);
            for (i = 0; i < quedan; i++) {
              window.PM.Sprites.drawPacman(ctx, 18 + p * hueco + i * 11, 278,
                D.LEFT, 2, this.colorFor(p), this.skinFor(p));
            }
          }
        } else {
          // fondo común: iconos blancos (vidas del equipo)
          var color = team ? '#ffffff' : this.colorFor(0);
          var skin = team ? 'clasico' : this.skinFor(0);
          var livesShown = Math.max(0, this.lives - 1);
          for (i = 0; i < livesShown && i < 5; i++) {
            window.PM.Sprites.drawPacman(ctx, 18 + i * 16, 278, D.LEFT, 2, color, skin);
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

      /* cronómetro, en el hueco central de la fila de abajo */
      if (this.state !== 'MENU') {
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#00ffff';
        ctx.fillText(this.clockText(), 112, 279);
        // de mirón conviene recordar que esta partida no es tuya
        if (this.isSpec()) {
          ctx.font = 'bold 6px monospace';
          ctx.fillStyle = '#7ec8ff';
          ctx.fillText('VIENDO LA PARTIDA', 112, 270);
        }
        ctx.textBaseline = 'top';
      }

      /* La barra de habilidades no cabe en el lienzo (la fila de abajo ya la
       * llenan las vidas, el cronómetro y las frutas), así que vive en el DOM
       * junto a las crucetas y se refresca desde aquí. Ver js/ui.js. */
      if (this.hab && window.PM.UI && window.PM.UI.refreshHabBar) {
        window.PM.UI.refreshHabBar();
      }
    },

    /* ¿Se puede celebrar a lo grande? Jugando solo, sí: el laberinto es tuyo
     * y no hay nadie a quien tapárselo. Con más gente (dúo en el mismo teclado
     * o una party) no: el cartel cruza el centro de la pantalla cinco segundos
     * y los demás están jugando —y encima la maestría no es suya—. Ahí se
     * celebra en una banda estrecha, arriba y fuera del laberinto. */
    bigNotices: function () { return this.playerCount <= 1; },

    /* Aviso de maestría: el dibujo vive en sprites.js para poder enseñarlo
     * también en el panel MAESTRÍAS, fuera de la partida. */
    renderBadgeNotice: function (ctx) {
      var n = this.badgeNotice;
      var total = n.total || CFG.BADGE_ANIM_TICKS;
      var t = 1 - (n.ticks / total);
      if (this.bigNotices()) {
        window.PM.Sprites.drawBadgeBanner(ctx, 112, 9 * T + CFG.MAZE_Y,
          CFG.NATIVE_W - 24, 44, t, n, this.tick);
      } else {
        window.PM.Sprites.drawBadgeStrip(ctx, 112, 11, CFG.NATIVE_W - 20,
          t, n, this.tick);
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

      /* maestría recién ganada: entra, se luce y se va. Con más jugadores
       * espera turno detrás del logro (comparten banda), así que mientras haya
       * uno en pantalla esta no se dibuja. */
      if (this.badgeNotice && (this.bigNotices() || !this.achNotice)) {
        this.renderBadgeNotice(ctx);
      }

      /* Logro recién conseguido. Va ARRIBA DEL TODO, sobre el marcador y
       * fuera del laberinto: antes cruzaba el centro de la pantalla justo por
       * la casa de los fantasmas y tapaba la partida durante dos segundos y
       * medio. Aquí solo esconde la puntuación un momento, que se puede mirar
       * después, y ni siquiera se cruza con el cartel de maestría. */
      if (this.achNotice) {
        var an = this.achNotice;
        window.PM.Sprites.drawAchNotice(ctx, 112, 11,
          CFG.NATIVE_W - 20, 1 - (an.ticks / an.total), an, this.tick);
      }

      /* nivel de jugador subido */
      if (this.levelNotice) {
        var ly = 6 * T + CFG.MAZE_Y;
        var lt = this.levelNotice.ticks;
        var lin = Math.min(1, (260 - lt) / 20);          // entrada rápida
        var lout = Math.min(1, lt / 30);                 // salida suave
        ctx.save();
        ctx.globalAlpha = Math.min(lin, lout);
        ctx.font = 'bold 7px monospace';
        ctx.fillStyle = '#00ffff';
        ctx.fillText('NIVEL DE JUGADOR', 112, ly - 5);
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(this.levelNotice.level), 112, ly + 7);
        ctx.restore();
      }

      /* chat: últimos mensajes sobre la parte baja del laberinto */
      if (this.chat.length) {
        ctx.textAlign = 'left';
        ctx.font = 'bold 7px monospace';
        var cy = CFG.MAZE_Y + 30 * T - 2;
        for (var ci = this.chat.length - 1; ci >= 0; ci--) {
          var m = this.chat[ci];
          var label = m.name + ': ';
          // nombre largo + frase larga no caben en 224 px: se encoge la línea
          var cpx = 7;
          ctx.font = 'bold 7px monospace';
          while (cpx > 4 &&
                 ctx.measureText(label + m.text).width > CFG.NATIVE_W - 14) {
            cpx--;
            ctx.font = 'bold ' + cpx + 'px monospace';
          }
          var lw = ctx.measureText(label).width;
          var tw = ctx.measureText(m.text).width;
          ctx.fillStyle = 'rgba(0,0,0,0.75)';
          ctx.fillRect(4, cy - 5, Math.min(lw + tw + 6, CFG.NATIVE_W - 8), 10);
          ctx.fillStyle = m.color;
          ctx.fillText(label, 7, cy);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(m.text, 7 + lw, cy);
          cy -= 11;
        }
        ctx.textAlign = 'center';
      }
      if (this.paused) {
        // con el menú de pausa delante basta con su propio velo: así el
        // laberinto se sigue viendo y no se oscurece dos veces
        var menuUp = !!(window.PM.UI && window.PM.UI.promptOpen);
        ctx.fillStyle = menuUp ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, CFG.NATIVE_W, CFG.NATIVE_H);
        if (!menuUp) {
          ctx.font = 'bold 12px monospace';
          ctx.fillStyle = CFG.COLORS.text;
          ctx.fillText('PAUSA', 112, CFG.NATIVE_H / 2);
        }
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
