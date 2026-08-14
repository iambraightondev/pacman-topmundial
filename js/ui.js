/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/ui.js
 * Menús, panel de opciones, selector de color, lobby online
 * y entrada (teclado/táctil).
 * Define window.PM.UI y window.PM.settings
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var D = CFG.DIR;

  /* ---------- Ajustes: carga / persistencia ---------- */
  /* Rangos documentados en el SPEC (contract PM.settings). Un valor
   * corrupto/editado a mano en localStorage se corrige aquí para que
   * nunca llegue crudo a Game.newGame() ni al <input type="color">. */
  var NUM_RANGES = {
    ghostSpeedMult: { min: 0.5, max: 1.2, int: false },
    pacSpeedMult:   { min: 0.8, max: 1.3, int: false },
    frightMult:     { min: 0,   max: 2,   int: false },
    startLives:     { min: 1,   max: 5,   int: true },
    startLevel:     { min: 1,   max: 21,  int: true },
    volMaster:      { min: 0,   max: 1,   int: false },
    volMusic:       { min: 0,   max: 1,   int: false },
    volSfx:         { min: 0,   max: 1,   int: false },
    volLoops:       { min: 0,   max: 1,   int: false },
    volVoices:      { min: 0,   max: 1,   int: false }
  };
  var PRESET_NAMES = ['facil', 'normal', 'dificil', 'custom'];
  var LIVES_MODES = ['shared', 'individual'];

  /* Nombres: mayúsculas, sin acentos raros ni caracteres de control, y
   * recortados a CFG.NICK_MAX para que quepan en el marcador. */
  function filterNick(value) {
    return String(value == null ? '' : value)
      .toUpperCase()
      .replace(/[^A-Z0-9 ._-]/g, '')
      .slice(0, CFG.NICK_MAX);
  }

  function sanitizeNick(value) {
    return filterNick(value).replace(/ +/g, ' ').replace(/^ +| +$/g, '');
  }

  function sanitizeSetting(key, value, def) {
    if (key === 'nick1' || key === 'nick2') return sanitizeNick(value);
    if (NUM_RANGES.hasOwnProperty(key)) {
      var r = NUM_RANGES[key];
      var n = r.int ? parseInt(value, 10) : parseFloat(value);
      if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return def;
      if (n < r.min) n = r.min;
      if (n > r.max) n = r.max;
      return n;
    }
    if (key === 'pacColor' || key === 'pac2Color') {
      return (/^#[0-9a-f]{6}$/i).test(String(value)) ? String(value) : def;
    }
    if (key === 'muted') return !!value;
    if (key === 'difficultyPreset') {
      return PRESET_NAMES.indexOf(value) !== -1 ? value : def;
    }
    if (key === 'livesMode') {
      return LIVES_MODES.indexOf(value) !== -1 ? value : def;
    }
    if (key === 'vsGhost2') {
      var g = parseInt(value, 10);
      return (g >= 0 && g < 4) ? g : -1;
    }
    if (key === 'skin1' || key === 'skin2') {
      return CFG.SKIN_IDS.indexOf(value) !== -1 ? value : def;
    }
    if (key === 'avatar') {
      return CFG.AVATAR_IDS.indexOf(value) !== -1 ? value : def;
    }
    return def;
  }

  /* Nombre de invitado al azar: dos trozos pegados, recortado a lo que
   * cabe en el marcador. Se usa desde PERFIL. */
  function randomNick() {
    var R = CFG.RANDOM_NAMES;
    var a = R.a[Math.floor(Math.random() * R.a.length)];
    var b = R.b[Math.floor(Math.random() * R.b.length)];
    return (a + b).slice(0, CFG.NICK_MAX);
  }

  function loadSettings() {
    var s = {};
    var def = CFG.DEFAULT_SETTINGS;
    for (var k in def) if (def.hasOwnProperty(k)) s[k] = def[k];
    try {
      var raw = localStorage.getItem(CFG.SETTINGS_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        for (var k2 in def) {
          if (def.hasOwnProperty(k2) && saved && saved.hasOwnProperty(k2)) {
            s[k2] = sanitizeSetting(k2, saved[k2], def[k2]);
          }
        }
      }
    } catch (e) { /* sin almacenamiento o JSON corrupto */ }
    return s;
  }

  function saveSettings() {
    try {
      localStorage.setItem(CFG.SETTINGS_KEY, JSON.stringify(window.PM.settings));
    } catch (e) { /* sin almacenamiento */ }
  }

  window.PM.settings = loadSettings();

  /* Subconjunto de ajustes que el anfitrión impone en una partida online */
  var NET_CFG_KEYS = ['ghostSpeedMult', 'pacSpeedMult', 'frightMult',
    'startLives', 'startLevel', 'livesMode'];

  var UI = {
    els: {},
    audioResumed: false,
    touchDevice: false,
    promptOpen: false,  // hay un diálogo (rendición / revancha / game over) abierto
    nickInputs: {},     // ajuste -> campos de texto (portada y opciones)
    lobby: null,        // { mode:'host'|'join', code, locked, peerColor, peerName,
                        //   hostCfg, hostColor, hostName, timer }

    /* Guardar ajustes desde fuera de este módulo (lo usa la cuenta al
     * traerse el nombre y el avatar de la nube) */
    saveSettings: saveSettings,

    init: function () {
      this.touchDevice = ('ontouchstart' in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      this.els.menu = document.getElementById('menu');
      this.els.options = document.getElementById('options');
      this.els.online = document.getElementById('online');
      this.els.badges = document.getElementById('badges');
      this.els.ranking = document.getElementById('ranking');
      this.els.mazes = document.getElementById('mazes');
      this.els.friends = document.getElementById('friends');
      this.els.profile = document.getElementById('profile');
      this.els.mate = document.getElementById('mate');
      this.els.prompt = document.getElementById('prompt');
      if (window.PM.Badges) window.PM.Badges.syncSeen();
      if (window.PM.Achievements) window.PM.Achievements.syncSeen();
      this.buildMenu();
      this.buildOptions();
      this.buildOnline();
      this.buildBadges();
      this.buildRanking();
      this.buildMazes();
      this.buildFriends();
      this.buildProfile();
      this.buildMate();
      this.accountHooks();
      this.buildGameButtons();
      this.buildDpads();
      this.bindKeyboard();
      this.bindTouch();
      this.applyMute();
      this.fitCanvas();
      var self = this;
      window.addEventListener('resize', function () { self.fitCanvas(); });
      this.showMenu();

      this.partyHooks();

      /* enlace compartido ?rep=<texto>: abre directo la repetición (y si
       * viene rota, avisa y el juego sigue como si nada) */
      if (window.PM.Replay && window.PM.Replay.desdeUrl()) return;

      /* enlace compartido ?sala=CODE: entrar directo a la party */
      var rc = window.PM.Net && window.PM.Net.roomFromUrl();
      if (rc) {
        this.showOnline();
        if (window.PM.Net.configured()) {
          this.codeInput.value = rc;
          this.partyJoin(rc);
        }
      }
    },

    /* ------------------------------------------------------
     * Escalado nítido: ajusta el tamaño CSS del canvas al mayor
     * múltiplo de 0.5 de la resolución nativa (224x288) que quepa
     * en el 96% del viewport, para que cada píxel del juego ocupe
     * un número uniforme de píxeles CSS (píxeles nítidos y parejos).
     * Si ni siquiera cabe a x1, se usa el ajuste exacto como último
     * recurso (pantallas minúsculas).
     * ------------------------------------------------------ */
    fitCanvas: function () {
      var canvas = document.getElementById('game');
      if (!canvas) return;
      var s = Math.min(window.innerWidth * 0.96 / CFG.NATIVE_W,
                       window.innerHeight * 0.96 / CFG.NATIVE_H);
      if (s >= 1) s = Math.floor(s * 2) / 2;   // saltos de 0.5 (x2.5, x3, ...)
      canvas.style.width = Math.floor(CFG.NATIVE_W * s) + 'px';
      canvas.style.height = Math.floor(CFG.NATIVE_H * s) + 'px';
    },

    /* ------------------------------------------------------
     * Menú principal
     * ------------------------------------------------------ */
    buildMenu: function () {
      var self = this;
      var m = this.els.menu;
      m.innerHTML = '';

      /* La portada se reparte en cuatro bloques. En pantalla ancha van en
       * rejilla —reparto a la izquierda, lo de jugar en el centro y el resto
       * de paneles a la derecha— y en estrecha se apilan en este mismo orden.
       * El orden del DOM manda en la navegación con flechas, así que lo de
       * jugar va ANTES que los botones secundarios aunque en pantalla queden
       * a la izquierda: la rejilla los coloca por su nombre de área. */
      var head = document.createElement('div');
      head.className = 'menu-head';
      m.appendChild(head);

      var main = document.createElement('div');
      main.className = 'menu-main';
      m.appendChild(main);

      var side = document.createElement('div');
      side.className = 'menu-side';
      m.appendChild(side);

      var cast = document.createElement('div');
      cast.className = 'menu-cast';
      m.appendChild(cast);

      var title = document.createElement('div');
      title.className = 'title';
      title.textContent = 'PAC-MAN';
      head.appendChild(title);

      var sub = document.createElement('div');
      sub.className = 'subtitle';
      sub.textContent = 'TOP MUNDIAL';
      head.appendChild(sub);

      /* presentación de fantasmas (clásica, opcional) */
      var roster = document.createElement('div');
      roster.className = 'roster';
      var names = [
        ['SHADOW', '"BLINKY"', '#ff0000'],
        ['SPEEDY', '"PINKY"', '#ffb8ff'],
        ['BASHFUL', '"INKY"', '#00ffff'],
        ['POKEY', '"CLYDE"', '#ffb852']
      ];
      for (var i = 0; i < names.length; i++) {
        var row = document.createElement('div');
        row.className = 'roster-row';
        row.style.color = names[i][2];
        var dot = document.createElement('span');
        dot.className = 'roster-ghost';
        dot.style.background = names[i][2];
        row.appendChild(dot);
        var t = document.createElement('span');
        t.textContent = names[i][0] + '  ' + names[i][1];
        row.appendChild(t);
        roster.appendChild(row);
      }
      cast.appendChild(this.sectionTitle('EL REPARTO'));
      cast.appendChild(roster);

      /* nombre en la portada, estilo arcade moderno: se escribe y a jugar */
      main.appendChild(this.makeNickRow('nick1', 'TU NOMBRE', 'menu'));

      /* nivel de jugador con su barra de progreso */
      var lvl = document.createElement('div');
      lvl.className = 'level-box';
      this.levelLabel = document.createElement('div');
      this.levelLabel.className = 'level-label';
      lvl.appendChild(this.levelLabel);
      var bar = document.createElement('div');
      bar.className = 'level-bar';
      this.levelFill = document.createElement('div');
      this.levelFill.className = 'level-fill';
      bar.appendChild(this.levelFill);
      lvl.appendChild(bar);
      main.appendChild(lvl);

      var play = this.makeButton('UN JUGADOR', function () {
        self.resumeAudio();
        self.hideAll();
        window.PM.Game.newGame({ players: 1 });
      });
      play.classList.add('btn-primary');
      main.appendChild(play);

      /* El reto del día: la misma partida para todo el mundo, un intento.
       * Va aquí arriba, pegado a UN JUGADOR, porque es de un jugador. */
      this.retoBtn = this.makeButton('RETO DE HOY', function () {
        self.resumeAudio();
        self.showRetoPrompt();
      });
      main.appendChild(this.retoBtn);

      main.appendChild(this.makeButton('DOS JUGADORES', function () {
        self.resumeAudio();
        self.hideAll();
        // PAC-MAN VS. en el mismo teclado: el J2 puede llevar un fantasma
        // (se elige en OPCIONES · PARTIDA; -1 = Pac-Man de siempre)
        window.PM.Game.newGame({
          players: 2,
          ghosts: [-1, window.PM.settings.vsGhost2]
        });
      }));

      /* HABILIDADES: el mismo laberinto con cuatro poderes. Va debajo de las
       * partidas normales porque es un modo aparte, no un ajuste de las de
       * siempre (igual que LABERINTOS). */
      main.appendChild(this.makeButton('HABILIDADES', function () {
        self.resumeAudio();
        self.showHabPrompt();
      }));

      this.onlineMenuBtn = this.makeButton('JUGAR ONLINE', function () {
        self.resumeAudio();
        self.showOnline();
      });
      main.appendChild(this.onlineMenuBtn);

      side.appendChild(this.sectionTitle('TU CUARTEL'));
      var extras = document.createElement('div');
      extras.className = 'menu-extras';
      extras.appendChild(this.makeButton('TOP MUNDIAL', function () {
        self.resumeAudio();
        self.showRanking();
      }));
      extras.appendChild(this.makeButton('PERFIL', function () {
        self.resumeAudio();
        self.showProfile();
      }));
      extras.appendChild(this.makeButton('LABERINTOS', function () {
        self.resumeAudio();
        self.showMazes();
      }));
      extras.appendChild(this.makeButton('MAESTRÍAS', function () {
        self.resumeAudio();
        self.showBadges();
      }));
      extras.appendChild(this.makeButton('AMIGOS', function () {
        self.resumeAudio();
        self.showFriends();
      }));
      extras.appendChild(this.makeButton('OPCIONES', function () {
        self.resumeAudio();
        self.showOptions();
      }));
      for (var e = 0; e < extras.childNodes.length; e++) {
        extras.childNodes[e].classList.add('btn-preset');
      }
      side.appendChild(extras);

      /* Ayuda de controles: en la columna del reparto, que es donde sobra
       * sitio, en vez de tres renglones cruzando toda la portada. */
      cast.appendChild(this.sectionTitle('CONTROLES'));
      var ayudas = [
        'J1: FLECHAS O WASD',
        'PAUSA: P O ESC (REANUDAR · REINICIAR R · SALIR Q)',
        'DOS JUGADORES: J1 FLECHAS · J2 WASD, CONTRA LOS FANTASMAS',
        'HABILIDADES: SOLO FLECHAS PARA MOVERSE · Q W E R PARA LOS PODERES',
        'RENDIRSE: BOTÓN DE ARRIBA A LA DERECHA (EN DÚO, LOS DOS)'
      ];
      if (this.touchDevice) {
        ayudas.push('TÁCTIL: DESLIZA PARA MOVERTE · EN DÚO, CADA UNO SU MITAD');
      }
      for (var a = 0; a < ayudas.length; a++) {
        var hint = document.createElement('div');
        hint.className = 'hint';
        hint.textContent = ayudas[a];
        cast.appendChild(hint);
      }
    },

    makeButton: function (label, onClick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = label;
      b.addEventListener('click', onClick);
      return b;
    },

    /* ------------------------------------------------------
     * Panel de opciones
     * ------------------------------------------------------ */
    buildOptions: function () {
      var self = this;
      var o = this.els.options;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'OPCIONES';
      o.appendChild(h);

      /* --- pestañas: el panel entero de golpe se ve abarrotado, aquí y en
       * pantalla ancha. Lo que cambia con sitio de sobra es que las secciones
       * de la pestaña abierta se reparten en columnas (ver .opt-group). --- */
      var TABS = [
        ['dificultad', 'DIFICULTAD'],
        ['jugadores', 'JUGADORES'],
        ['partida', 'PARTIDA'],
        ['sonido', 'SONIDO']
      ];
      var bar = document.createElement('div');
      bar.className = 'tab-row';
      this.tabBtns = {};
      this.tabPanes = {};
      TABS.forEach(function (t) {
        var b = self.makeButton(t[1], function () { self.showOptionsTab(t[0]); });
        b.classList.add('tab');
        self.tabBtns[t[0]] = b;
        bar.appendChild(b);
      });
      o.appendChild(bar);
      TABS.forEach(function (t) {
        var pane = document.createElement('div');
        pane.className = 'tab-pane pane-' + t[0];
        self.tabPanes[t[0]] = pane;
        o.appendChild(pane);
      });

      var dif = this.tabPanes.dificultad;
      var jug = this.tabPanes.jugadores;
      var par = this.tabPanes.partida;
      var son = this.tabPanes.sonido;

      /* ===== pestaña DIFICULTAD ===== */
      var difA = this.optGroup(dif, 'DIFICULTAD');
      var presetRow = document.createElement('div');
      presetRow.className = 'preset-row';
      var presets = [['facil', 'FÁCIL'], ['normal', 'NORMAL'], ['dificil', 'DIFÍCIL']];
      this.presetButtons = {};
      presets.forEach(function (p) {
        var b = self.makeButton(p[1], function () {
          self.applyPreset(p[0]);
        });
        b.classList.add('btn-preset');
        self.presetButtons[p[0]] = b;
        presetRow.appendChild(b);
      });
      difA.appendChild(presetRow);

      this.customTag = document.createElement('div');
      this.customTag.className = 'custom-tag';
      this.customTag.textContent = 'PERSONALIZADA';
      difA.appendChild(this.customTag);
      var difNote = document.createElement('div');
      difNote.className = 'note';
      difNote.textContent = 'VELOCIDAD, VIDAS Y NIVEL SE APLICAN EN LA PRÓXIMA PARTIDA';
      difA.appendChild(difNote);

      var difB = this.optGroup(dif, 'A TU MEDIDA');
      this.sliders = {};
      difB.appendChild(this.makeSlider('ghostSpeedMult', 'VELOCIDAD FANTASMAS',
        0.5, 1.2, 0.05, function (v) { return '×' + v.toFixed(2); }));
      difB.appendChild(this.makeSlider('pacSpeedMult', 'VELOCIDAD PAC-MAN',
        0.8, 1.3, 0.05, function (v) { return '×' + v.toFixed(2); }));
      difB.appendChild(this.makeSlider('frightMult', 'DURACIÓN POWER PELLET',
        0, 2, 0.25, function (v) { return '×' + v.toFixed(2); }));
      difB.appendChild(this.makeSlider('startLives', 'VIDAS',
        1, 5, 1, function (v) { return String(v); }));
      difB.appendChild(this.makeSlider('startLevel', 'NIVEL INICIAL',
        1, 21, 1, function (v) { return String(v); }));

      /* ===== pestaña JUGADORES ===== */
      var jugN = this.optGroup(jug, 'NOMBRES', true);
      jugN.appendChild(this.makeNickRow('nick1', 'TU NOMBRE (J1 Y ONLINE)'));
      jugN.appendChild(this.makeNickRow('nick2', 'JUGADOR 2 (LOCAL)'));
      var nkNote = document.createElement('div');
      nkNote.className = 'note';
      nkNote.textContent = 'SE VEN EN EL MARCADOR, SOBRE CADA PAC-MAN Y EN LAS SALAS ONLINE';
      jugN.appendChild(nkNote);

      /* La skin propia NO está aquí: es cosa de uno, como el avatar, y vive
       * en PERFIL. Aquí se queda el color (que también hay que elegírselo al
       * jugador 2 local) y la skin del segundo, que no es de nadie en
       * concreto: es el aspecto del que se sienta al lado. */
      this.colorRows = {};
      this.skinRows = {};
      var jug1 = this.optGroup(jug, 'TU COLOR');
      jug1.appendChild(this.makeColorRow('pacColor'));
      var skNote = document.createElement('div');
      skNote.className = 'note';
      skNote.textContent = 'TU SKIN ESTÁ EN PERFIL, CON TU AVATAR';
      jug1.appendChild(skNote);
      var jug2 = this.optGroup(jug, 'JUGADOR 2 (LOCAL)');
      jug2.appendChild(this.makeColorRow('pac2Color'));
      jug2.appendChild(this.makeSkinRow('skin2', 'pac2Color'));
      this.optMsgEl = document.createElement('div');
      this.optMsgEl.className = 'lobby-status';
      jugN.appendChild(this.optMsgEl);

      /* ===== pestaña PARTIDA ===== */
      par = this.optGroup(par, 'VIDAS EN 2 JUGADORES');
      var lmRow = document.createElement('div');
      lmRow.className = 'preset-row';
      this.livesModeBtns = {};
      [['shared', 'COMPARTIDAS'], ['individual', 'INDIVIDUALES']].forEach(function (p) {
        var b = self.makeButton(p[1], function () {
          window.PM.settings.livesMode = p[0];
          saveSettings();
          self.refreshOptions();
        });
        b.classList.add('btn-preset');
        self.livesModeBtns[p[0]] = b;
        lmRow.appendChild(b);
      });
      par.appendChild(lmRow);
      var lmNote = document.createElement('div');
      lmNote.className = 'note';
      lmNote.textContent = 'COMPARTIDAS: UN FONDO COMÚN PARA EL EQUIPO · INDIVIDUALES: QUIEN LAS PIERDE, MIRA';
      par.appendChild(lmNote);

      var ctrlNote = document.createElement('div');
      ctrlNote.className = 'note';
      ctrlNote.textContent = 'EN PARTIDA: P O ESC PAUSA · 1-6 EMOTES · ' +
        'CTRL+ESPACIO TU MAESTRÍA · T CHAT (ONLINE)';
      par.appendChild(ctrlNote);

      /* PAC-MAN VS. en la misma máquina: el jugador 2 lleva un fantasma */
      var vsg = this.optGroup(this.tabPanes.partida, 'PAC-MAN VS. (MISMO TECLADO)');
      var vsRowL = document.createElement('div');
      vsRowL.className = 'preset-row';
      this.vsLocalBtns = {};
      this.vsChoices().forEach(function (op) {
        var b = self.makeButton(op[1], function () {
          window.PM.settings.vsGhost2 = op[0];
          saveSettings();
          self.refreshOptions();
        });
        b.classList.add('btn-preset');
        if (op[0] >= 0) b.style.color = CFG.GHOSTS[op[0]].color;
        self.vsLocalBtns[op[0]] = b;
        vsRowL.appendChild(b);
      });
      vsg.appendChild(vsRowL);
      var vsNoteL = document.createElement('div');
      vsNoteL.className = 'note';
      vsNoteL.textContent = 'EN DOS JUGADORES, EL J2 (WASD) LLEVA ESE FANTASMA ' +
        'EN VEZ DE UN PAC-MAN. GANA SI SE QUEDA CON TODAS TUS VIDAS';
      vsg.appendChild(vsNoteL);

      /* ===== pestaña SONIDO ===== */
      var sonA = this.optGroup(son, 'SONIDO');
      var sndRow = document.createElement('div');
      sndRow.className = 'preset-row';
      this.soundBtns = {};
      [['si', 'SÍ'], ['no', 'NO']].forEach(function (p) {
        var b = self.makeButton(p[1], function () {
          window.PM.settings.muted = (p[0] === 'no');
          self.applyMute();
          saveSettings();
          self.refreshOptions();
        });
        b.classList.add('btn-preset');
        self.soundBtns[p[0]] = b;
        sndRow.appendChild(b);
      });
      sonA.appendChild(sndRow);

      /* prueba rápida de las voces de racha */
      sonA.appendChild(this.sectionTitle('VOCES DE RACHA'));
      var vRow = document.createElement('div');
      vRow.className = 'preset-row';
      CFG.VOICE_NAMES.forEach(function (name, i) {
        var b = self.makeButton((i + 1) + ' ' + name, function () {
          self.resumeAudio();
          if (window.AudioSys) AudioSys.playVoice(i);
        });
        b.classList.add('btn-preset');
        vRow.appendChild(b);
      });
      sonA.appendChild(vRow);
      this.voicesNote = document.createElement('div');
      this.voicesNote.className = 'note';
      sonA.appendChild(this.voicesNote);

      var sonB = this.optGroup(son, 'VOLUMEN POR TIPO');
      CFG.SOUND_CATS.forEach(function (c) {
        sonB.appendChild(self.makeSlider(c.key, c.name, 0, 1, 0.1,
          function (v) { return Math.round(v * 100) + '%'; }, true));
      });
      var volNote = document.createElement('div');
      volNote.className = 'note';
      volNote.textContent = 'EFECTOS: WAKA, FANTASMAS, FRUTA... · ' +
        'AMBIENTE: SIRENA Y MODO AZUL · VOCES: RACHA AL COMER FANTASMAS';
      sonB.appendChild(volNote);

      /* --- VOLVER (fuera de las pestañas) --- */
      var back = this.makeButton('VOLVER', function () {
        self.showMenu();
      });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);

      this.showOptionsTab('dificultad');
      this.refreshOptions();
    },

    showOptionsTab: function (name) {
      if (!this.tabPanes || !this.tabPanes[name]) return;
      this.optionsTab = name;
      for (var k in this.tabPanes) {
        if (!this.tabPanes.hasOwnProperty(k)) continue;
        this.tabPanes[k].style.display = (k === name) ? 'flex' : 'none';
        this.tabBtns[k].classList.toggle('active', k === name);
      }
      this.els.options.scrollTop = 0;
    },

    sectionTitle: function (text) {
      var d = document.createElement('div');
      d.className = 'section-title';
      d.textContent = text;
      return d;
    },

    /* Ficha de una sección de OPCIONES: su título y su contenido dentro de un
     * recuadro. En pantalla ancha las fichas de una pestaña se reparten en
     * columnas, en vez de irse todas una debajo de otra por el centro. */
    optGroup: function (pane, titulo, ancha) {
      var g = document.createElement('div');
      g.className = 'opt-group' + (ancha ? ' opt-wide' : '');
      if (titulo) g.appendChild(this.sectionTitle(titulo));
      pane.appendChild(g);
      return g;
    },

    /* Fila etiqueta + campo de texto para un nombre de jugador.
     * variant 'menu': versión grande de la portada. El mismo ajuste puede
     * tener varios campos (portada y opciones); se sincronizan entre sí. */
    makeNickRow: function (key, label, variant) {
      var self = this;
      var big = (variant === 'menu');
      var row = document.createElement('div');
      row.className = 'nick-row' + (big ? ' nick-row-menu' : '');

      var lab = document.createElement('label');
      lab.className = 'nick-label';
      lab.textContent = label;
      row.appendChild(lab);

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'nick-input' + (big ? ' nick-input-menu' : '');
      input.maxLength = CFG.NICK_MAX;
      input.placeholder = (key === 'nick2') ? 'J2' : 'J1';
      input.setAttribute('aria-label', label);
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('autocapitalize', 'characters');
      input.addEventListener('keydown', function (ev) {
        ev.stopPropagation();     // escribir no debe mover a Pac-Man
        if (ev.key === 'Enter') input.blur();
      });
      input.addEventListener('input', function () {
        var v = filterNick(input.value);
        if (v !== input.value) input.value = v;
        window.PM.settings[key] = v;
        saveSettings();
        self.refreshNicks(input);
      });
      input.addEventListener('blur', function () {
        var v = sanitizeNick(input.value);
        input.value = v;
        window.PM.settings[key] = v;
        saveSettings();
        self.refreshNicks();
      });
      row.appendChild(input);

      if (!this.nickInputs[key]) this.nickInputs[key] = [];
      this.nickInputs[key].push(input);
      return row;
    },

    /* Refresca los campos de nombre (todos menos el que se está escribiendo).
     * Con la sesión abierta, el nombre del jugador 1 ES el de la cuenta: el
     * campo se enseña bloqueado para que no haya dos nombres que cuadrar. */
    refreshNicks: function (skip) {
      var s = window.PM.settings;
      var Ac = window.PM.Account;
      var fijo = !!(Ac && Ac.logged());
      if (fijo && Ac.name()) s.nick1 = Ac.name();
      for (var k in this.nickInputs) {
        if (!this.nickInputs.hasOwnProperty(k)) continue;
        var list = this.nickInputs[k];
        var bloquea = fijo && k === 'nick1';
        for (var i = 0; i < list.length; i++) {
          list[i].disabled = bloquea;
          list[i].title = bloquea ? 'TU NOMBRE ES EL DE TU CUENTA' : '';
          if (list[i] === skip || list[i] === document.activeElement) continue;
          list[i].value = s[k] || '';
        }
      }
    },

    /* Fila de skins: cada una se dibuja de verdad en un mini canvas,
     * con el color elegido para ese jugador (se repinta al cambiarlo). */
    makeSkinRow: function (key, colorKey) {
      var self = this;
      var row = document.createElement('div');
      row.className = 'skins';
      var items = [];
      CFG.SKINS.forEach(function (sk) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'skin';
        b.title = sk.name;
        b.setAttribute('aria-label', 'Skin ' + sk.name);
        var cv = document.createElement('canvas');
        cv.width = 48; cv.height = 48;       // grandes: a 22 px no se distinguían
        b.appendChild(cv);
        var lab = document.createElement('span');
        lab.textContent = sk.name;
        b.appendChild(lab);
        b.addEventListener('click', function () {
          // bloqueada: en vez de no hacer nada, se dice qué falta
          if (b.classList.contains('locked')) {
            self.optionsMsg('LA SKIN ' + sk.name + ' SE ABRE EN EL NIVEL ' +
                            (sk.level || 1));
            return;
          }
          window.PM.settings[key] = sk.id;
          saveSettings();
          self.refreshOptions();
        });
        row.appendChild(b);
        items.push({ id: sk.id, btn: b, canvas: cv, label: lab, info: sk });
      });
      this.skinRows[key] = { items: items, colorKey: colorKey };
      return row;
    },

    /* Repinta las miniaturas de skins con el color actual y marca las que
     * todavía no están abiertas. La que ya llevas puesta nunca se bloquea:
     * si el requisito la dejara fuera, se respeta lo que ya tenías. */
    refreshSkins: function () {
      var s = window.PM.settings;
      var L = window.PM.Level;
      var lvl = L ? L.level() : 1;
      for (var k in this.skinRows) {
        if (!this.skinRows.hasOwnProperty(k)) continue;
        var row = this.skinRows[k];
        var color = s[row.colorKey] || '#ffff00';
        for (var i = 0; i < row.items.length; i++) {
          var it = row.items[i];
          var pide = it.info.level || 1;
          var abierta = (lvl >= pide) || (s[k] === it.id);
          it.btn.classList.toggle('active', s[k] === it.id);
          it.btn.classList.toggle('locked', !abierta);
          it.label.textContent = abierta ? it.info.name : ('NIVEL ' + pide);
          it.btn.title = abierta ? it.info.name
            : (it.info.name + ' · SE ABRE EN EL NIVEL ' + pide);
          var c = it.canvas.getContext('2d');
          c.setTransform(1, 0, 0, 1, 0, 0);
          c.clearRect(0, 0, 48, 48);
          c.imageSmoothingEnabled = false;
          // el sprite mide r=6.5; se amplía para que la skin se lea bien
          c.setTransform(3, 0, 0, 3, 24, 24);
          window.PM.Sprites.drawPacman(c, 0, 0, CFG.DIR.RIGHT, 2,
            abierta ? color : '#3a3a3a', it.id);
          c.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
    },

    /* Aviso corto dentro de OPCIONES (por ahora, skins bloqueadas) */
    /* Aviso corto de OPCIONES. Se escribe en los dos sitios que enseñan
     * skins (OPCIONES y PERFIL) porque el mismo clic puede venir de
     * cualquiera de ellos y solo se ve el del panel abierto. */
    optionsMsg: function (text) {
      var self = this;
      var cajas = [this.optMsgEl, this.profSkinMsg];
      for (var i = 0; i < cajas.length; i++) {
        if (cajas[i]) cajas[i].textContent = text || '';
      }
      if (this.optMsgTimer) clearTimeout(this.optMsgTimer);
      this.optMsgTimer = setTimeout(function () {
        if (self.optMsgEl) self.optMsgEl.textContent = '';
        if (self.profSkinMsg) self.profSkinMsg.textContent = '';
      }, 3000);
    },

    /* Fila de muestras + selector libre para un ajuste de color */
    makeColorRow: function (key) {
      var self = this;
      var row = document.createElement('div');
      row.className = 'swatches';
      var swatches = [];
      CFG.PAC_SWATCHES.forEach(function (hex) {
        var s = document.createElement('button');
        s.type = 'button';
        s.className = 'swatch';
        s.style.background = hex;
        s.setAttribute('data-color', hex);
        s.setAttribute('aria-label', 'Color ' + hex);
        s.addEventListener('click', function () {
          self.setColor(key, hex);
        });
        swatches.push(s);
        row.appendChild(s);
      });
      var input = document.createElement('input');
      input.type = 'color';
      input.className = 'color-input';
      input.addEventListener('input', function () {
        self.setColor(key, input.value);
      });
      row.appendChild(input);
      this.colorRows[key] = { swatches: swatches, input: input };
      return row;
    },

    /* plain: ajuste suelto (volúmenes); si no, tocarlo pasa la dificultad
     * a PERSONALIZADA */
    makeSlider: function (key, label, min, max, step, fmt, plain) {
      var self = this;
      var wrap = document.createElement('div');
      wrap.className = 'slider-row';

      var lab = document.createElement('label');
      lab.className = 'slider-label';
      lab.textContent = label;
      wrap.appendChild(lab);

      var input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      wrap.appendChild(input);

      var val = document.createElement('span');
      val.className = 'slider-value';
      wrap.appendChild(val);

      input.addEventListener('input', function () {
        var v = parseFloat(input.value);
        window.PM.settings[key] = v;
        if (plain) {
          self.applyVolumes();
        } else {
          window.PM.settings.difficultyPreset = 'custom';
          self.refreshPresetButtons();
        }
        saveSettings();
        val.textContent = fmt(v);
      });

      this.sliders[key] = { input: input, val: val, fmt: fmt };
      return wrap;
    },

    applyPreset: function (name) {
      var s = window.PM.settings;
      var p = CFG.PRESETS[name];
      s.difficultyPreset = name;
      s.ghostSpeedMult = p.ghostSpeedMult;
      s.pacSpeedMult = p.pacSpeedMult;
      s.frightMult = p.frightMult;
      s.startLives = p.startLives;
      s.startLevel = p.startLevel;
      saveSettings();
      this.refreshOptions();
    },

    setColor: function (key, hex) {
      window.PM.settings[key] = hex;   // se aplica en vivo (game lee cada frame)
      saveSettings();
      this.refreshOptions();
    },

    applyMute: function () {
      if (window.AudioSys) AudioSys.setMuted(!!window.PM.settings.muted);
      this.applyVolumes();
    },

    /* Vuelca los volúmenes guardados a los buses del sistema de audio */
    applyVolumes: function () {
      if (!window.AudioSys || !AudioSys.setVolume) return;
      var s = window.PM.settings;
      AudioSys.setVolume('master', s.volMaster);
      AudioSys.setVolume('music', s.volMusic);
      AudioSys.setVolume('sfx', s.volSfx);
      AudioSys.setVolume('loops', s.volLoops);
      AudioSys.setVolume('voices', s.volVoices);
    },

    refreshPresetButtons: function () {
      var cur = window.PM.settings.difficultyPreset;
      for (var k in this.presetButtons) {
        if (this.presetButtons.hasOwnProperty(k)) {
          this.presetButtons[k].classList.toggle('active', k === cur);
        }
      }
      this.customTag.style.display = (cur === 'custom') ? 'block' : 'none';
    },

    refreshOptions: function () {
      var s = window.PM.settings;
      var i, k;
      this.refreshPresetButtons();
      for (k in this.sliders) {
        if (!this.sliders.hasOwnProperty(k)) continue;
        var sl = this.sliders[k];
        sl.input.value = String(s[k]);
        sl.val.textContent = sl.fmt(parseFloat(s[k]));
      }
      this.refreshNicks();
      for (k in this.colorRows) {
        if (!this.colorRows.hasOwnProperty(k)) continue;
        var cr = this.colorRows[k];
        for (i = 0; i < cr.swatches.length; i++) {
          var el = cr.swatches[i];
          el.classList.toggle('active',
            el.getAttribute('data-color').toLowerCase() === String(s[k]).toLowerCase());
        }
        try { cr.input.value = s[k]; } catch (e) { /* color inválido */ }
      }
      this.refreshSkins();
      this.livesModeBtns.shared.classList.toggle('active', s.livesMode !== 'individual');
      this.livesModeBtns.individual.classList.toggle('active', s.livesMode === 'individual');
      var vsl = (s.vsGhost2 >= 0 && s.vsGhost2 < 4) ? s.vsGhost2 : -1;
      for (i = -1; i < 4; i++) {
        if (this.vsLocalBtns[i]) this.vsLocalBtns[i].classList.toggle('active', i === vsl);
      }
      this.soundBtns.si.classList.toggle('active', !s.muted);
      this.soundBtns.no.classList.toggle('active', !!s.muted);
      if (this.voicesNote) {
        var ready = window.AudioSys && AudioSys.voicesReady && AudioSys.voicesReady();
        this.voicesNote.textContent = ready
          ? 'SUENAN AL COMER FANTASMAS SEGUIDOS CON EL MISMO ENERGIZANTE'
          : 'SI NO SUENAN, ABRE EL JUEGO DESDE UN SERVIDOR (JUGAR.BAT), NO CON DOBLE CLIC';
      }
    },

    /* Opciones del selector de PAC-MAN VS.: Pac-Man y los cuatro fantasmas.
     * Se usa igual en OPCIONES (local) y en la sala online. */
    vsChoices: function () {
      var out = [[-1, 'PAC-MAN']];
      for (var i = 0; i < 4; i++) out.push([i, CFG.VS.NAMES[i]]);
      return out;
    },

    /* ------------------------------------------------------
     * Lobby online: crear sala / unirse con código
     * ------------------------------------------------------ */
    buildOnline: function () {
      var self = this;
      var o = this.els.online;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'MODO ONLINE';
      o.appendChild(h);

      var sub = document.createElement('div');
      sub.className = 'note';
      sub.textContent = 'HASTA ' + CFG.MAX_PLAYERS +
        ' JUGADORES CONTRA LOS FANTASMAS · PUNTUACIÓN DE EQUIPO';
      o.appendChild(sub);

      /* --- vista inicial --- */
      var idle = document.createElement('div');
      idle.className = 'online-view';
      this.onlineIdle = idle;

      this.onlineWarn = document.createElement('div');
      this.onlineWarn.className = 'online-warn';
      this.onlineWarn.style.display = 'none';
      idle.appendChild(this.onlineWarn);

      var create = this.makeButton('CREAR PARTY', function () { self.partyCreate(); });
      create.classList.add('btn-primary');
      this.createBtn = create;
      idle.appendChild(create);

      var div1 = document.createElement('div');
      div1.className = 'section-title';
      div1.textContent = '— O ÚNETE CON UN CÓDIGO —';
      idle.appendChild(div1);

      var joinRow = document.createElement('div');
      joinRow.className = 'preset-row';
      this.codeInput = document.createElement('input');
      this.codeInput.type = 'text';
      this.codeInput.className = 'code-input';
      this.codeInput.maxLength = CFG.NET.ROOM_LEN;
      this.codeInput.placeholder = 'CÓDIGO';
      this.codeInput.setAttribute('autocomplete', 'off');
      this.codeInput.setAttribute('spellcheck', 'false');
      this.codeInput.setAttribute('autocapitalize', 'characters');
      this.codeInput.addEventListener('input', function () {
        var v = self.codeInput.value.toUpperCase().replace(/[^A-Z]/g, '');
        if (v !== self.codeInput.value) self.codeInput.value = v;
        else self.codeInput.value = v;
      });
      this.codeInput.addEventListener('keydown', function (ev) {
        ev.stopPropagation();   // que WASD no mueva el juego mientras se escribe
        if (ev.key === 'Enter') self.partyJoin(self.codeInput.value);
      });
      joinRow.appendChild(this.codeInput);
      this.joinBtn = this.makeButton('UNIRSE', function () {
        self.partyJoin(self.codeInput.value);
      });
      this.joinBtn.classList.add('btn-preset');
      joinRow.appendChild(this.joinBtn);
      idle.appendChild(joinRow);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.style.marginTop = '14px';
      idle.appendChild(back);
      o.appendChild(idle);

      /* --- vista de sala --- */
      var room = document.createElement('div');
      room.className = 'online-view';
      room.style.display = 'none';
      this.onlineRoom = room;

      var lab = document.createElement('div');
      lab.className = 'section-title';
      lab.textContent = 'CÓDIGO DE LA PARTY';
      room.appendChild(lab);

      this.roomCodeEl = document.createElement('div');
      this.roomCodeEl.className = 'online-code';
      room.appendChild(this.roomCodeEl);

      this.roomLinkEl = document.createElement('div');
      this.roomLinkEl.className = 'online-link';
      room.appendChild(this.roomLinkEl);

      this.copyBtn = this.makeButton('COPIAR ENLACE', function () {
        self.copyLink();
      });
      this.copyBtn.classList.add('btn-preset');
      room.appendChild(this.copyBtn);

      var lab2 = document.createElement('div');
      lab2.className = 'section-title';
      lab2.textContent = 'EN LA PARTY';
      room.appendChild(lab2);

      this.partyList = document.createElement('div');
      this.partyList.className = 'friend-list';
      room.appendChild(this.partyList);

      /* PAC-MAN VS.: uno de la party puede llevar un fantasma en vez de un
       * Pac-Man. Los que ya lleva otro salen apagados. */
      var lab3 = document.createElement('div');
      lab3.className = 'section-title';
      lab3.textContent = 'JUGAR COMO FANTASMA';
      room.appendChild(lab3);

      var vsRow = document.createElement('div');
      vsRow.className = 'preset-row';
      this.vsBtns = {};
      this.vsChoices().forEach(function (op) {
        var b = self.makeButton(op[1], function () { self.pickVsGhost(op[0]); });
        b.classList.add('btn-preset');
        if (op[0] >= 0) b.style.color = CFG.GHOSTS[op[0]].color;
        self.vsBtns[op[0]] = b;
        vsRow.appendChild(b);
      });
      room.appendChild(vsRow);

      var vsNote = document.createElement('div');
      vsNote.className = 'note';
      vsNote.textContent = 'LO LLEVAS TÚ, NO LA MÁQUINA: CAZA A LOS PAC-MAN. ' +
        'ALGUIEN TIENE QUE QUEDARSE DE PAC-MAN';
      room.appendChild(vsNote);

      /* Modo HABILIDADES para toda la party. Solo lo ve y lo toca quien
       * manda: es una regla de la partida, no un gusto de cada uno, y con
       * medio grupo con poderes no habría partida que valiera. */
      this.habRoomBox = document.createElement('div');
      this.habRoomBtn = this.makeButton('HABILIDADES: NO', function () {
        self.togglePartyHab();
      });
      this.habRoomBtn.classList.add('btn-preset');
      this.habRoomBox.appendChild(this.habRoomBtn);
      var habNote = document.createElement('div');
      habNote.className = 'note';
      habNote.textContent = 'Q MORDISCO · W TURBO · E FLASH · R GRITO. ' +
        'AQUÍ SE MUEVE SOLO CON LAS FLECHAS, Y ESTAS PARTIDAS NO ENTRAN EN ' +
        'EL TOP MUNDIAL';
      this.habRoomBox.appendChild(habNote);
      room.appendChild(this.habRoomBox);

      this.lobbyStatusEl = document.createElement('div');
      this.lobbyStatusEl.className = 'lobby-status';
      room.appendChild(this.lobbyStatusEl);

      this.startPartyBtn = this.makeButton('EMPEZAR PARTIDA', function () {
        self.partyStart();
      });
      this.startPartyBtn.classList.add('btn-primary');
      room.appendChild(this.startPartyBtn);

      this.inviteBtn = this.makeButton('INVITAR AMIGO', function () {
        self.askInviteWho();
      });
      this.inviteBtn.classList.add('btn-preset');
      room.appendChild(this.inviteBtn);

      var volver = this.makeButton('VOLVER AL MENÚ', function () {
        self.showMenu();      // la party sigue conectada
      });
      volver.style.marginTop = '10px';
      room.appendChild(volver);

      var salir = this.makeButton('SALIR DE LA PARTY', function () {
        self.partyLeave();
      });
      room.appendChild(salir);
      o.appendChild(room);
    },

    setLobbyStatus: function (text, isError) {
      this.lobbyStatusEl.textContent = text;
      this.lobbyStatusEl.classList.toggle('error', !!isError);
    },

    showOnlineIdle: function () {
      this.onlineIdle.style.display = 'flex';
      this.onlineRoom.style.display = 'none';
      var ok = window.PM.Net.configured();
      this.onlineWarn.style.display = ok ? 'none' : 'block';
      if (!ok) {
        this.onlineWarn.textContent =
          'EL MODO ONLINE AÚN NO ESTÁ CONFIGURADO: FALTAN LAS CREDENCIALES DE SUPABASE EN js/net-config.js';
      }
      this.createBtn.disabled = !ok;
      this.joinBtn.disabled = !ok;
      this.codeInput.disabled = !ok;
    },

    copyLink: function () {
      var self = this;
      var P = window.PM.Party;
      var text = window.PM.Net.roomLink((P && P.code()) || '');
      function done() {
        self.copyBtn.textContent = '¡COPIADO!';
        setTimeout(function () { self.copyBtn.textContent = 'COPIAR ENLACE'; }, 1500);
      }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); }
        catch (e) { /* sin permiso: el enlace queda visible para copiar a mano */ }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    },

    /* Ajustes que impone el anfitrión, saneados en ambos extremos */
    netCfgSubset: function () {
      var s = window.PM.settings, out = {}, i;
      for (i = 0; i < NET_CFG_KEYS.length; i++) {
        out[NET_CFG_KEYS[i]] = s[NET_CFG_KEYS[i]];
      }
      return out;
    },

    sanitizeNetCfg: function (raw) {
      var def = CFG.DEFAULT_SETTINGS, out = {}, i, k;
      raw = raw || {};
      for (i = 0; i < NET_CFG_KEYS.length; i++) {
        k = NET_CFG_KEYS[i];
        out[k] = sanitizeSetting(k, raw[k], def[k]);
      }
      return out;
    },

    /* ----- party: crear, unirse, invitar y empezar -----
     * La party no se cierra al volver al menú ni al acabar la partida: el
     * grupo sigue junto y el líder puede echar otra sin pasar el código. */
    partyHooks: function () {
      var self = this;
      var P = window.PM.Party;
      if (!P) return;
      P.onchange = function () {
        self.refreshParty();
        self.refreshOnlineBtn();
      };
      P.onerror = function (msg) { self.partyError(msg); };
      P.oninvite = function (from, code) { self.askInvite(from, code); };
      P.onstart = function (order, idx, cfg, role, hab) {
        self.startPartyGame(order, idx, cfg, role, hab);
      };
      P.listen();
    },

    partyCreate: function () {
      var P = window.PM.Party;
      if (!P || !window.PM.Net.configured()) return;
      this.onlineWarn.style.display = 'none';
      P.create();
    },

    partyJoin: function (code) {
      var P = window.PM.Party;
      if (!P || !window.PM.Net.configured()) return;
      code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
      if (code.length !== CFG.NET.ROOM_LEN) {
        this.onlineWarn.style.display = 'block';
        this.onlineWarn.textContent = 'EL CÓDIGO TIENE ' + CFG.NET.ROOM_LEN + ' LETRAS';
        return;
      }
      this.onlineWarn.style.display = 'none';
      P.join(code);
    },

    partyLeave: function () {
      var P = window.PM.Party;
      if (P) P.leave();
      this.showOnlineIdle();
    },

    partyStart: function () {
      var P = window.PM.Party;
      if (P) P.startGame();
    },

    /* Modo HABILIDADES de la party: lo enciende y lo apaga quien manda */
    togglePartyHab: function () {
      var P = window.PM.Party;
      if (!P || !P.isLeader()) return;
      P.setHab(!P.habPick);      // se reparte a la sala y vuelve por onchange
    },

    /* PAC-MAN VS.: pedir un fantasma (o volver a Pac-Man con -1) */
    pickVsGhost: function (gid) {
      var P = window.PM.Party;
      if (P) P.setGhost(gid);
    },

    partyError: function (msg) {
      this.showOnlineIdle();
      this.onlineWarn.style.display = 'block';
      this.onlineWarn.textContent = msg || 'SIN CONEXIÓN';
    },

    /* Lista de miembros y estado de los botones */
    refreshParty: function () {
      var P = window.PM.Party;
      if (!this.onlineRoom || !P) return;
      if (!P.inParty()) {
        if (this.els.online.style.display !== 'none') this.showOnlineIdle();
        return;
      }
      this.onlineIdle.style.display = 'none';
      this.onlineRoom.style.display = 'flex';
      var code = P.code() || '';
      this.roomCodeEl.textContent = code.split('').join(' ');
      this.roomLinkEl.textContent = window.PM.Net.roomLink(code);

      var ms = P.members();
      this.partyList.innerHTML = '';
      for (var i = 0; i < ms.length; i++) {
        var row = document.createElement('div');
        row.className = 'party-row';

        var dot = document.createElement('span');
        dot.className = 'party-dot';
        dot.style.background = ms[i].c || CFG.PLAYER_COLORS[i];
        row.appendChild(dot);

        var n = document.createElement('span');
        n.className = 'friend-name';
        n.textContent = ms[i].n || ('J' + (i + 1));
        row.appendChild(n);

        var tag = document.createElement('span');
        tag.className = 'party-tag';
        tag.textContent = (i === 0 ? 'LÍDER' : '') +
          (ms[i].s === window.PM.Net.sid ? (i === 0 ? ' · TÚ' : 'TÚ') : '');
        row.appendChild(tag);

        // PAC-MAN VS.: se ve de un vistazo quién lleva fantasma y cuál
        if (ms[i].g >= 0 && ms[i].g < 4) {
          var gt = document.createElement('span');
          gt.className = 'party-tag';
          gt.style.color = CFG.GHOSTS[ms[i].g].color;
          gt.textContent = CFG.VS.NAMES[ms[i].g];
          row.appendChild(gt);
        }

        this.partyList.appendChild(row);
      }

      /* selector de fantasma: apagados los que ya lleva otro */
      var mio = P.myGhost();
      for (var v = -1; v < 4; v++) {
        var vb = this.vsBtns[v];
        if (!vb) continue;
        var duenyo = (v >= 0) ? P.ghostOwner(v) : null;
        vb.disabled = !!(duenyo && duenyo !== window.PM.Net.sid);
        vb.classList.toggle('active', v === mio);
      }

      var lider = P.isLeader();
      /* HABILIDADES: el interruptor es solo del líder, pero el estado lo ve
       * todo el mundo — entrar a una party y descubrir los poderes al empezar
       * la partida sería una encerrona. */
      if (this.habRoomBox) {
        this.habRoomBtn.disabled = !lider;
        this.habRoomBtn.classList.toggle('active', !!P.habPick);
        this.habRoomBtn.childNodes[0].nodeValue =
          'HABILIDADES: ' + (P.habPick ? 'SÍ' : 'NO');
      }
      this.startPartyBtn.style.display = lider ? '' : 'none';
      this.startPartyBtn.disabled = !P.canStart();
      this.startPartyBtn.textContent = 'EMPEZAR PARTIDA (' + P.count() + ')';
      this.inviteBtn.disabled = !P.active();
      this.setLobbyStatus(
        P.connecting() ? 'CONECTANDO...'
        : !P.anyPac() ? 'ALGUIEN TIENE QUE LLEVAR UN PAC-MAN'
        : lider ? (P.count() < 2 ? 'ESPERANDO A MÁS JUGADORES...'
                                 : 'CUANDO QUIERAS, EMPEZAD')
                : 'ESPERANDO A QUE EL LÍDER EMPIECE...');
    },

    /* Invitar: se le manda el código a su canal personal (su nombre) */
    askInviteWho: function () {
      var self = this;
      var F = window.PM.Friends;
      var list = F ? F.all() : [];
      var btns = [];
      list.slice(0, 3).forEach(function (name) {
        btns.push({
          label: name,
          onClick: function () { self.hidePrompt(); self.sendInvite(name); }
        });
      });
      btns.push({
        label: 'OTRO NOMBRE',
        onClick: function () { self.hidePrompt(); self.askInviteName(); }
      });
      btns.push({ label: 'VOLVER', onClick: function () { self.hidePrompt(); } });
      this.showPrompt({
        title: 'INVITAR A LA PARTY',
        lines: list.length ? ['ELIGE A QUIÉN AVISAR']
                           : ['NO TIENES AMIGOS GUARDADOS TODAVÍA'],
        buttons: btns
      });
    },

    askInviteName: function () {
      var self = this;
      function enviar() {
        var v = self.promptInput ? self.promptInput.value : '';
        self.hidePrompt();
        self.sendInvite(v);
      }
      this.showPrompt({
        title: 'INVITAR A LA PARTY',
        lines: ['ESCRIBE SU NOMBRE DE JUGADOR'],
        input: { placeholder: 'NOMBRE', onAccept: function () { enviar(); } },
        buttons: [
          { label: 'INVITAR', primary: true, onClick: enviar },
          { label: 'VOLVER', keys: ['Escape'], hint: 'ESC',
            onClick: function () { self.hidePrompt(); } }
        ]
      });
      if (this.promptInput) this.promptInput.focus();
    },

    sendInvite: function (name) {
      var self = this;
      var P = window.PM.Party;
      if (!P) return;
      this.setLobbyStatus('ENVIANDO INVITACIÓN...');
      P.invite(name, function (ok, msg) {
        self.setLobbyStatus(msg || '', !ok);
      });
    },

    /* Nos invitan: preguntar antes de mover a nadie de sitio */
    askInvite: function (from, code) {
      var self = this;
      if (window.PM.Game && window.PM.Game.inGame()) return;   // en partida, no
      this.showPrompt({
        title: 'INVITACIÓN',
        lines: [(from || 'ALGUIEN') + ' TE INVITA A SU PARTY',
                { text: code.split('').join(' '), big: true }],
        buttons: [
          { label: 'ENTRAR', primary: true, keys: ['Enter'], hint: 'ENTER',
            onClick: function () {
              self.hidePrompt();
              self.showOnline();
              self.partyJoin(code);
            } },
          { label: 'AHORA NO', keys: ['Escape'], hint: 'ESC',
            onClick: function () { self.hidePrompt(); } }
        ]
      });
    },

    startPartyGame: function (order, idx, cfg, role, hab) {
      this.hidePrompt();
      this.hideAll();
      this.resumeAudio();
      var colors = [], names = [], skins = [], ghosts = [];
      for (var i = 0; i < order.length; i++) {
        colors.push(sanitizeSetting('pacColor', order[i].c, CFG.PLAYER_COLORS[i]));
        names.push(sanitizeNick(order[i].n) || ('J' + (i + 1)));
        skins.push(sanitizeSetting('skin1', order[i].k, 'clasico'));
        ghosts.push(sanitizeSetting('vsGhost2', order[i].g, -1));
      }
      window.PM.Game.newGame({
        players: order.length, net: role, localIdx: idx,
        cfg: (role === 'guest') ? this.sanitizeNetCfg(cfg) : null,
        colors: colors, names: names, skins: skins, ghosts: ghosts,
        hab: !!hab            // lo enciende quien manda, y vale para todos
      });
    },

    cancelLobby: function () {
      var P = window.PM.Party;
      if (P) P.leave();
    },

    /* ------------------------------------------------------
     * Panel de maestrías (insignias por récord personal)
     * ------------------------------------------------------ */
    buildBadges: function () {
      var self = this;
      var o = this.els.badges;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'MAESTRÍAS';
      o.appendChild(h);

      /* cuatro rutas independientes, una por formato de partida */
      var bar = document.createElement('div');
      bar.className = 'tab-row';
      this.badgeTabBtns = {};
      [['solo', 'EN SOLO'], ['duo', 'EN DÚO'],
       ['trio', 'EN TRÍO'], ['escuadra', 'EN ESCUADRA']].forEach(function (t) {
        var b = self.makeButton(t[1], function () { self.showBadgeTab(t[0]); });
        b.classList.add('tab');
        self.badgeTabBtns[t[0]] = b;
        bar.appendChild(b);
      });
      o.appendChild(bar);

      this.badgesSub = document.createElement('div');
      this.badgesSub.className = 'note';
      o.appendChild(this.badgesSub);

      /* Lista a la izquierda, la elegida en grande a la derecha (en estrecho,
       * el escenario va arriba y la lista debajo). No hay botón VER: se pulsa
       * la maestría y ya se ve. */
      var split = document.createElement('div');
      split.className = 'badge-split';
      o.appendChild(split);

      this.badgesList = document.createElement('div');
      this.badgesList.className = 'badge-list';
      split.appendChild(this.badgesList);

      var stage = document.createElement('div');
      stage.className = 'badge-stage';
      split.appendChild(stage);

      /* lienzo para ver la chapa sin tener que jugar: es la misma animación
       * de la partida (Ctrl+Espacio), con tu propio Pac-Man debajo */
      /* 130 x 54 lógicos a triple escala. El alto no es el de la partida: la
       * chapa y el jugador viven entre y=30 e y=58, así que se recorta lo de
       * arriba (badgeTop) en vez de dejar una franja negra muerta. Lo que se
       * deja por encima es para los rayos y el fogonazo de los rangos altos,
       * que se salen de la chapa. */
      this.badgeScale = 3;
      this.badgeTop = 12;
      this.badgeDemo = document.createElement('canvas');
      this.badgeDemo.width = 130 * this.badgeScale;
      this.badgeDemo.height = 54 * this.badgeScale;
      this.badgeDemo.className = 'badge-demo';
      stage.appendChild(this.badgeDemo);

      this.badgeStageName = document.createElement('div');
      this.badgeStageName.className = 'badge-stage-name';
      stage.appendChild(this.badgeStageName);

      this.badgeStageState = document.createElement('div');
      this.badgeStageState.className = 'badge-stage-state';
      stage.appendChild(this.badgeStageState);

      var hint = document.createElement('div');
      hint.className = 'badge-stage-hint';
      hint.textContent = 'PULSA UNA MAESTRÍA DE LA LISTA PARA VERLA';
      stage.appendChild(hint);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);

      this.badgeTab = 'solo';
      this.badgePick = null;
    },

    showBadgeTab: function (mode) {
      var B = window.PM.Badges;
      this.badgeTab = (B && B.MODES.indexOf(mode) !== -1) ? mode : 'solo';
      this.badgePick = null;      // cada ruta empieza por la suya
      this.refreshBadges();
    },

    refreshBadges: function () {
      var B = window.PM.Badges;
      var mode = this.badgeTab || 'solo';
      for (var k in this.badgeTabBtns) {
        if (this.badgeTabBtns.hasOwnProperty(k)) {
          this.badgeTabBtns[k].classList.toggle('active', k === mode);
        }
      }
      var best = B ? B.best(mode) : 0;
      var next = B ? B.next(mode) : null;
      /* Cada formato es su propia liga: su récord, sus insignias y su listón.
       * Cuanta más gente juega, más puntos pide cada escalón (el marcador de
       * un equipo es de todos, y con cuatro se llega al mismo número con
       * mucho menos mérito de cada uno). */
      var meta = function (b) { return B ? B.goal(b, mode) : b.points; };
      this.badgesSub.textContent =
        'RÉCORD EN ' + (B ? B.modeName(mode) : 'SOLO') + ': ' + best +
        (next ? ('  ·  SIGUIENTE: ' + next.name + ' A ' + meta(next))
              : '  ·  ¡TODAS CONSEGUIDAS!') +
        (mode === 'solo'
          ? ''
          : '  ·  CADA FORMATO ES UNA LIGA APARTE Y PIDE MÁS PUNTOS CUANTOS ' +
            'MÁS SEÁIS');
      this.badgesList.innerHTML = '';
      this.badgeRows = {};
      var self = this;
      CFG.BADGES.forEach(function (b) {
        var puntos = meta(b);
        var got = best >= puntos;
        /* la fila ES el botón: pulsarla la enseña en el escenario. Siendo
         * <button> entra sola en la navegación con flechas. */
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'badge-row badge-pick' + (got ? ' got' : '');

        var cv = document.createElement('canvas');
        cv.width = 34; cv.height = 34;
        cv.className = 'badge-medal';
        var c = cv.getContext('2d');
        c.imageSmoothingEnabled = false;
        window.PM.Sprites.drawBadge(c, 17, 17, 14, b.color, !got);
        row.appendChild(cv);

        var txt = document.createElement('div');
        txt.className = 'badge-text';
        var nm = document.createElement('div');
        nm.className = 'badge-name';
        nm.style.color = got ? b.color : '#666';
        nm.textContent = b.name;
        txt.appendChild(nm);
        var st = document.createElement('div');
        st.className = 'badge-state';
        st.textContent = got
          ? ('CONSEGUIDA · ' + puntos + ' PUNTOS')
          : ('TE FALTAN ' + (puntos - best) + ' PUNTOS');
        txt.appendChild(st);
        row.appendChild(txt);

        // pulsarla es verla: se celebra igual que en partida, sin esperar a
        // conseguirla
        row.addEventListener('click', function () { self.pickBadge(b.id, true); });

        self.badgeRows[b.id] = row;
        self.badgesList.appendChild(row);
      });

      /* De entrada, la que tienes: la más alta conseguida en esta ruta. Si
       * aún no hay ninguna, la primera por conseguir. Al abrir el panel se
       * celebra sola; al cambiar de pestaña, quieta (no se ha pulsado nada). */
      var top = B ? B.top(mode) : null;
      var pick = (this.badgePick && this.badgeRows[this.badgePick])
        ? this.badgePick
        : (top ? top.id : CFG.BADGES[0].id);
      this.pickBadge(pick, false);
    },

    /* Elige una maestría: la marca en la lista y la enseña en el escenario.
     * play=true reproduce la chapa; si no, se queda quieta con su medalla. */
    pickBadge: function (id, play) {
      var B = window.PM.Badges;
      var mode = this.badgeTab || 'solo';
      var badge = null;
      for (var i = 0; i < CFG.BADGES.length; i++) {
        if (CFG.BADGES[i].id === id) badge = CFG.BADGES[i];
      }
      if (!badge || !this.badgeStageName) return;
      this.badgePick = badge.id;

      var best = B ? B.best(mode) : 0;
      var top = B ? B.top(mode) : null;
      var puntos = B ? B.goal(badge, mode) : badge.points;
      var got = best >= puntos;

      for (var k in this.badgeRows) {
        if (this.badgeRows.hasOwnProperty(k)) {
          var sel = (k === badge.id);
          this.badgeRows[k].classList.toggle('sel', sel);
          this.badgeRows[k].setAttribute('aria-pressed', sel ? 'true' : 'false');
        }
      }

      this.badgeStageName.textContent = badge.name;
      this.badgeStageName.style.color = got ? badge.color : '#666';
      this.badgeStageState.textContent = got
        ? (((top && top.id === badge.id) ? 'TU MAESTRÍA · ' : 'CONSEGUIDA · ') +
           puntos + ' PUNTOS')
        : ('TE FALTAN ' + (puntos - best) + ' PUNTOS PARA CONSEGUIRLA');

      if (play) this.playBadgeDemo(badge, got);
      else this.badgeRest(badge, got);
    },

    /* Reposo del escenario: tu Pac-Man con la medalla de la elegida flotando
     * encima (apagada si aún no es tuya). Así el lado derecho siempre enseña
     * algo, en vez de un hueco vacío hasta que se pulsa. */
    badgeRest: function (badge, got) {
      if (!this.badgeDemo) return;
      this.badgeDemoRun = (this.badgeDemoRun || 0) + 1;   // corta la demo en curso
      this.drawBadgeRest(badge, got);
    },

    drawBadgeRest: function (badge, got) {
      var cv = this.badgeDemo;
      if (!cv) return;
      var ctx = cv.getContext('2d');
      var k = this.badgeScale || 2;
      var s = window.PM.settings || {};
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(k, 0, 0, k, 0, -(this.badgeTop || 0) * k);
      window.PM.Sprites.drawPacman(ctx, 65, 52, CFG.DIR.RIGHT, 2,
        s.pacColor || CFG.PLAYER_COLORS[0], s.skin1 || 'clasico');
      if (badge) {
        window.PM.Sprites.drawBadge(ctx, 65, 32, 9, badge.color, !got);
      }
    },

    /* Reproduce dentro del panel la MISMA chapa de la partida: la medalla
     * sube girando desde tu Pac-Man, la chapa se despliega con un chispazo
     * y al final se encoge de vuelta. Antes aquí salía el cartel grande, que
     * no es lo que se ve jugando. */
    playBadgeDemo: function (badge, got) {
      var self = this;
      var cv = this.badgeDemo;
      if (!cv) return;
      var ctx = cv.getContext('2d');
      var total = CFG.BADGE_ANIM_TICKS;
      var S = window.PM.Sprites;
      var s = window.PM.settings || {};
      var color = s.pacColor || CFG.PLAYER_COLORS[0];
      var skin = s.skin1 || 'clasico';
      var k = this.badgeScale || 2;
      var ty = -(this.badgeTop || 0) * k;
      var PX = 65, PY = 52;                 // el jugador, en coordenadas lógicas
      // el escalón manda cuánta pompa gasta la chapa: aquí se ve la de verdad
      var rango = 0;
      for (var bi = 0; bi < CFG.BADGES.length; bi++) {
        if (CFG.BADGES[bi].id === badge.id) rango = bi;
      }
      this.badgeDemoRun = (this.badgeDemoRun || 0) + 1;
      var run = this.badgeDemoRun;
      var prev = null;
      var ticks = 0;

      function fondo() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.setTransform(k, 0, 0, k, 0, ty);  // escalado, como el juego
      }

      function frame(now) {
        if (self.badgeDemoRun !== run) return;      // otra demo la sustituyó
        if (prev === null) prev = now;
        // Avance por frame acotado: si el navegador ralentiza los frames
        // (pestaña de fondo, equipo lento) la chapa se ve entera igual,
        // sólo que más despacio, en vez de saltarse la animación.
        ticks += Math.min(6, (now - prev) / (1000 / 60));
        prev = now;
        var t = ticks / total;
        fondo();
        S.drawPacman(ctx, PX, PY, CFG.DIR.RIGHT,
          [0, 1, 2, 1][Math.floor(ticks / 4) % 4], color, skin);
        // al acabar, la medalla se queda puesta: el escenario enseña siempre
        // cuál está elegida
        if (t >= 1) { self.drawBadgeRest(badge, got); return; }
        S.drawBadgeTag(ctx, PX, PY - 11, badge.name, badge.color, t, ticks,
          rango);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    },

    /* ======================================================
     * PERFIL: avatar, nombre, nivel, logros y cuenta
     * ====================================================== */
    /* ------------------------------------------------------
     * Perfil de un amigo (solo mirar)
     * La tabla `perfiles` es de lectura pública, así que con el nombre basta
     * para enseñar su avatar, su nivel, sus récords y sus logros. Los logros
     * no se guardan como "conseguido sí/no" sino como contadores, y son esos
     * los que viajan: aquí se vuelven a deducir con las mismas reglas que los
     * propios, así que la lista sale igualita a la de PERFIL.
     * ------------------------------------------------------ */
    buildMate: function () {
      var self = this;
      var o = this.els.mate;
      if (!o) return;
      o.innerHTML = '';

      this.mateTitle = document.createElement('div');
      this.mateTitle.className = 'panel-title';
      this.mateTitle.textContent = 'PERFIL';
      o.appendChild(this.mateTitle);

      this.mateMsg = document.createElement('div');
      this.mateMsg.className = 'lobby-status';
      o.appendChild(this.mateMsg);

      this.mateBody = document.createElement('div');
      this.mateBody.className = 'tab-pane';
      o.appendChild(this.mateBody);

      var cab = document.createElement('div');
      cab.className = 'perfil-cab';
      this.mateAvatar = document.createElement('canvas');
      this.mateAvatar.width = 72;
      this.mateAvatar.height = 72;
      this.mateAvatar.className = 'perfil-avatar';
      cab.appendChild(this.mateAvatar);
      var datos = document.createElement('div');
      datos.className = 'perfil-datos';
      this.mateName = document.createElement('div');
      this.mateName.className = 'perfil-nombre';
      datos.appendChild(this.mateName);
      this.mateLevel = document.createElement('div');
      this.mateLevel.className = 'level-label';
      datos.appendChild(this.mateLevel);
      var mbar = document.createElement('div');
      mbar.className = 'level-bar';
      this.mateFill = document.createElement('div');
      this.mateFill.className = 'level-fill';
      mbar.appendChild(this.mateFill);
      datos.appendChild(mbar);
      this.mateResumen = document.createElement('div');
      this.mateResumen.className = 'note';
      datos.appendChild(this.mateResumen);
      cab.appendChild(datos);
      this.mateBody.appendChild(cab);

      this.mateBody.appendChild(this.sectionTitle('RÉCORDS'));
      this.mateStats = document.createElement('div');
      this.mateStats.className = 'resumen';
      this.mateBody.appendChild(this.mateStats);

      this.mateBody.appendChild(this.sectionTitle('LOGROS'));
      this.mateAchSub = document.createElement('div');
      this.mateAchSub.className = 'note';
      this.mateBody.appendChild(this.mateAchSub);
      this.mateAchList = document.createElement('div');
      this.mateAchList.className = 'badge-list';
      this.mateBody.appendChild(this.mateAchList);

      var back = this.makeButton('VOLVER', function () { self.showFriends(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);
    },

    showFriendProfile: function (name) {
      var self = this;
      var Ac = window.PM.Account;
      this.mateWho = String(name || '');
      this.mateTitle.textContent = this.mateWho;
      this.mateBody.style.display = 'none';
      this.mateMsg.classList.remove('error');
      this.mateMsg.textContent = 'CARGANDO EL PERFIL DE ' + this.mateWho + '...';
      this.showPanel('mate');
      if (!Ac) return;
      Ac.fetchProfile(name, function (err, fila) {
        if (self.mateWho !== String(name || '')) return;   // ya se pidió otro
        if (err) {
          self.mateMsg.classList.add('error');
          self.mateMsg.textContent = err;
          return;
        }
        if (!fila) {
          self.mateMsg.classList.add('error');
          self.mateMsg.textContent = self.mateWho + ' TODAVÍA NO TIENE CUENTA';
          return;
        }
        self.mateMsg.textContent = '';
        self.mateBody.style.display = 'flex';
        self.renderMate(fila);
      });
    },

    renderMate: function (fila) {
      var L = window.PM.Level, A = window.PM.Achievements, R = window.PM.Ranking;
      var st = L ? L.stateFor(fila.xp) : { level: 1, inLevel: 0, needed: 0, pct: 0 };

      var c = this.mateAvatar.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, 72, 72);
      c.imageSmoothingEnabled = false;
      var av = fila.avatar;
      if (CFG.AVATAR_IDS.indexOf(av) === -1) av = 'pac';
      window.PM.Sprites.drawAvatar(c, 36, 36, 30, av, '#ffff00');

      this.mateName.textContent = fila.usuario || '';
      this.mateLevel.textContent = 'NIVEL ' + st.level + ' · ' + st.inLevel +
        ' / ' + st.needed;
      this.mateFill.style.width = Math.round(st.pct * 100) + '%';
      this.mateResumen.textContent = 'EXPERIENCIA TOTAL ' + (fila.xp || 0);

      /* récords: uno por formato. Trío y escuadra solo salen si ha jugado
       * alguna, que si no son dos ceros que no dicen nada. */
      var stats = [
        ['RÉCORD EN SOLO', String(fila.record1 || 0)],
        ['RÉCORD EN DÚO', String(fila.record2 || 0)]
      ];
      if (fila.record3 > 0) stats.push(['RÉCORD EN TRÍO', String(fila.record3)]);
      if (fila.record4 > 0) stats.push(['RÉCORD EN ESCUADRA', String(fila.record4)]);
      stats.push(['NIVEL 1 MÁS RÁPIDO',
        (fila.tiempo1 > 0 && R) ? R.fmtTime(fila.tiempo1) : '—']);
      var cont = fila.logros || {};
      stats.push(['FANTASMAS COMIDOS', String(cont.fantasmas || 0)]);
      stats.push(['PARTIDAS JUGADAS', String(cont.partidas || 0)]);
      stats.push(['NIVEL MÁS LEJOS', String(cont.nivelMax || 0)]);
      this.mateStats.innerHTML = '';
      var self2 = this;
      stats.forEach(function (p) {
        var row = document.createElement('div');
        row.className = 'mate-stat';
        var k = document.createElement('span');
        k.textContent = p[0];
        var v = document.createElement('b');
        v.textContent = p[1];
        row.appendChild(k);
        row.appendChild(v);
        self2.mateStats.appendChild(row);
      });

      /* logros: se deducen de sus contadores, igual que los propios */
      this.mateAchList.innerHTML = '';
      if (!A) return;
      var hechos = 0;
      CFG.ACHIEVEMENTS.forEach(function (a) {
        if (A.progress(a, cont).hecho) hechos++;
      });
      this.mateAchSub.textContent = 'CONSEGUIDOS ' + hechos + ' DE ' +
        CFG.ACHIEVEMENTS.length;
      CFG.ACHIEVEMENTS.forEach(function (a) {
        var p = A.progress(a, cont);
        self2.mateAchList.appendChild(self2.achRow(a, p));
      });
    },

    buildProfile: function () {
      var self = this;
      var o = this.els.profile;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'PERFIL';
      o.appendChild(h);

      var bar = document.createElement('div');
      bar.className = 'tab-row';
      this.profTabBtns = {};
      [['perfil', 'PERFIL'], ['logros', 'LOGROS']].forEach(function (t) {
        var b = self.makeButton(t[1], function () { self.showProfileTab(t[0]); });
        b.classList.add('tab');
        self.profTabBtns[t[0]] = b;
        bar.appendChild(b);
      });
      o.appendChild(bar);

      /* ---- pestaña PERFIL ---- */
      this.profPane = document.createElement('div');
      this.profPane.className = 'tab-pane';

      var cab = document.createElement('div');
      cab.className = 'perfil-cab';
      this.profAvatar = document.createElement('canvas');
      this.profAvatar.width = 72;
      this.profAvatar.height = 72;
      this.profAvatar.className = 'perfil-avatar';
      cab.appendChild(this.profAvatar);
      var datos = document.createElement('div');
      datos.className = 'perfil-datos';
      this.profName = document.createElement('div');
      this.profName.className = 'perfil-nombre';
      datos.appendChild(this.profName);
      this.profLevel = document.createElement('div');
      this.profLevel.className = 'level-label';
      datos.appendChild(this.profLevel);
      var barra = document.createElement('div');
      barra.className = 'level-bar';
      this.profFill = document.createElement('div');
      this.profFill.className = 'level-fill';
      barra.appendChild(this.profFill);
      datos.appendChild(barra);
      this.profResumen = document.createElement('div');
      this.profResumen.className = 'note';
      datos.appendChild(this.profResumen);
      cab.appendChild(datos);
      var ficha = this.optGroup(this.profPane, null, true);
      ficha.appendChild(cab);

      /* nombre de invitado: se puede cambiar y sortear */
      this.profGuestRow = document.createElement('div');
      this.profGuestRow.className = 'preset-row';
      var azar = this.makeButton('NOMBRE AL AZAR', function () {
        var s = window.PM.settings;
        s.nick1 = randomNick();
        saveSettings();
        self.refreshNicks();
        self.refreshProfile();
      });
      azar.classList.add('btn-preset');
      this.profGuestRow.appendChild(azar);
      ficha.appendChild(this.profGuestRow);

      /* avatares */
      var gAvatar = this.optGroup(this.profPane, 'TU AVATAR', true);
      this.profAvatarRow = document.createElement('div');
      this.profAvatarRow.className = 'skins avatares';
      this.avatarItems = [];
      CFG.AVATARS.forEach(function (av) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'skin';
        b.title = av.name;
        b.setAttribute('aria-label', 'Avatar ' + av.name);
        var cv = document.createElement('canvas');
        cv.width = 40;
        cv.height = 40;
        b.appendChild(cv);
        b.addEventListener('click', function () {
          window.PM.settings.avatar = av.id;
          saveSettings();
          if (window.PM.Account && window.PM.Account.logged()) {
            window.PM.Account.pushQuiet();
          }
          self.refreshProfile();
        });
        self.profAvatarRow.appendChild(b);
        self.avatarItems.push({ id: av.id, btn: b, canvas: cv });
      });
      gAvatar.appendChild(this.profAvatarRow);

      /* Tu skin: es tan tuya como el avatar, así que va aquí y no en
       * OPCIONES (allí solo queda la del jugador 2 local). */
      var gSkin = this.optGroup(this.profPane, 'TU SKIN');
      this.skinRows = this.skinRows || {};
      gSkin.appendChild(this.makeSkinRow('skin1', 'pacColor'));
      var skinNota = document.createElement('div');
      skinNota.className = 'note';
      skinNota.textContent = 'SE ABREN SUBIENDO DE NIVEL DE JUGADOR';
      gSkin.appendChild(skinNota);
      this.profSkinMsg = document.createElement('div');
      this.profSkinMsg.className = 'lobby-status';
      gSkin.appendChild(this.profSkinMsg);

      /* cuenta */
      var gCuenta = this.optGroup(this.profPane, 'TU CUENTA');
      this.profAccountMsg = document.createElement('div');
      this.profAccountMsg.className = 'lobby-status';
      gCuenta.appendChild(this.profAccountMsg);
      this.profAccountRow = document.createElement('div');
      this.profAccountRow.className = 'preset-row';
      gCuenta.appendChild(this.profAccountRow);
      this.profAccountNote = document.createElement('div');
      this.profAccountNote.className = 'note';
      gCuenta.appendChild(this.profAccountNote);

      o.appendChild(this.profPane);

      /* ---- pestaña LOGROS ---- */
      this.achPane = document.createElement('div');
      this.achPane.className = 'tab-pane';
      this.achSub = document.createElement('div');
      this.achSub.className = 'note';
      this.achPane.appendChild(this.achSub);
      this.achList = document.createElement('div');
      this.achList.className = 'badge-list';
      this.achPane.appendChild(this.achList);
      o.appendChild(this.achPane);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);

      this.profTab = 'perfil';
    },

    showProfileTab: function (tab) {
      this.profTab = (tab === 'logros') ? 'logros' : 'perfil';
      this.refreshProfile();
    },

    showProfile: function () {
      this.refreshProfile();
      this.showPanel('profile');
    },

    refreshProfile: function () {
      var s = window.PM.settings;
      var A = window.PM.Achievements;
      var L = window.PM.Level;
      var Ac = window.PM.Account;
      var logged = !!(Ac && Ac.logged());
      var tab = this.profTab || 'perfil';

      for (var k in this.profTabBtns) {
        if (this.profTabBtns.hasOwnProperty(k)) {
          this.profTabBtns[k].classList.toggle('active', k === tab);
        }
      }
      this.profPane.style.display = (tab === 'perfil') ? 'flex' : 'none';
      this.achPane.style.display = (tab === 'logros') ? 'flex' : 'none';

      /* cabecera */
      var ctx = this.profAvatar.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, 72, 72);
      ctx.imageSmoothingEnabled = false;
      window.PM.Sprites.drawAvatar(ctx, 36, 36, 30, s.avatar, s.pacColor);

      this.profName.textContent = sanitizeNick(s.nick1) || 'SIN NOMBRE';
      this.profName.style.color = logged ? '#ffff00' : '#ddd';

      var st = L ? L.state() : { level: 1, inLevel: 0, needed: 1, pct: 0 };
      this.profLevel.textContent = 'NIVEL ' + st.level + ' · ' +
        st.inLevel + ' / ' + st.needed;
      this.profFill.style.width = Math.round(st.pct * 100) + '%';

      var B = window.PM.Badges;
      var top = B ? B.top('solo') : null;
      this.profResumen.textContent =
        'LOGROS ' + (A ? A.count() : 0) + '/' + (A ? A.total() : 0) +
        ' · MAESTRÍA ' + (top ? top.name : 'NINGUNA') +
        ' · RÉCORD ' + ((window.PM.Game && window.PM.Game.highScore1) || 0);

      /* de invitado el nombre se puede sortear; con cuenta, es el usuario */
      this.profGuestRow.style.display = logged ? 'none' : 'flex';

      /* avatares: el elegido se marca */
      for (var i = 0; i < this.avatarItems.length; i++) {
        var it = this.avatarItems[i];
        it.btn.classList.toggle('active', it.id === s.avatar);
        var c = it.canvas.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, 40, 40);
        c.imageSmoothingEnabled = false;
        window.PM.Sprites.drawAvatar(c, 20, 20, 16, it.id, s.pacColor);
      }

      this.refreshSkins();          // la skin propia se elige aquí
      this.refreshAccountBox();
      this.refreshAchievements();
    },

    refreshAccountBox: function () {
      var self = this;
      var Ac = window.PM.Account;
      var row = this.profAccountRow;
      row.innerHTML = '';
      if (!Ac || !Ac.configured()) {
        this.profAccountMsg.classList.add('error');
        this.profAccountMsg.textContent = 'LAS CUENTAS NECESITAN CONEXIÓN';
        this.profAccountNote.textContent = '';
        return;
      }
      this.profAccountMsg.classList.remove('error');
      if (Ac.logged()) {
        this.profAccountMsg.textContent = 'SESIÓN DE ' + Ac.name();
        var guardar = this.makeButton('GUARDAR AHORA', function () {
          self.profAccountMsg.classList.remove('error');
          self.profAccountMsg.textContent = 'GUARDANDO...';
          Ac.push(false, function (err) {
            self.profAccountMsg.classList.toggle('error', !!err);
            self.profAccountMsg.textContent = err || 'GUARDADO';
          });
        });
        guardar.classList.add('btn-preset');
        row.appendChild(guardar);
        var salir = this.makeButton('CERRAR SESIÓN', function () {
          Ac.signOut(function () { self.refreshProfile(); });
        });
        salir.classList.add('btn-preset');
        row.appendChild(salir);
        this.profAccountNote.textContent =
          'TU NIVEL, LOGROS, MAESTRÍAS, RÉCORDS Y AMIGOS SE GUARDAN EN LA CUENTA';
      } else {
        this.profAccountMsg.textContent = 'JUEGAS COMO INVITADO';
        var entrar = this.makeButton('ENTRAR', function () {
          self.showAccountPrompt('entrar');
        });
        entrar.classList.add('btn-preset');
        row.appendChild(entrar);
        var crear = this.makeButton('CREAR CUENTA', function () {
          self.showAccountPrompt('crear');
        });
        crear.classList.add('btn-preset');
        row.appendChild(crear);
        this.profAccountNote.textContent =
          'DE INVITADO JUEGAS IGUAL, PERO TODO SE QUEDA EN ESTE NAVEGADOR ' +
          'Y NO PUEDES TENER AMIGOS';
      }
    },

    /* Una fila de logro con su estrella, su estado y su barra. La usan la
     * pestaña LOGROS y el perfil de un amigo, que se pinta igual. */
    achRow: function (a, p) {
      var R = window.PM.Ranking;
      var row = document.createElement('div');
      row.className = 'badge-row' + (p.hecho ? ' got' : '');

      var cv = document.createElement('canvas');
      cv.width = 34; cv.height = 34;
      cv.className = 'badge-medal';
      var c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      window.PM.Sprites.drawAchStar(c, 17, 17, 15, p.hecho ? a.color : '#333');
      row.appendChild(cv);

      var txt = document.createElement('div');
      txt.className = 'badge-text';
      var nm = document.createElement('div');
      nm.className = 'badge-name';
      nm.style.color = p.hecho ? a.color : '#666';
      nm.textContent = a.name;
      txt.appendChild(nm);
      var stt = document.createElement('div');
      stt.className = 'badge-state';
      if (p.hecho) {
        stt.textContent = 'CONSEGUIDO · ' + a.desc;
      } else if (a.fmt === 'tiempo') {
        stt.textContent = a.desc +
          (p.valor > 0 && R ? (' · MEJOR: ' + R.fmtTime(p.valor)) : '');
      } else {
        stt.textContent = a.desc + ' · ' + Math.min(p.valor, a.goal) +
          '/' + a.goal;
      }
      txt.appendChild(stt);
      var barra = document.createElement('div');
      barra.className = 'level-bar ach-bar';
      var fill = document.createElement('div');
      fill.className = 'level-fill';
      fill.style.width = Math.round(p.pct * 100) + '%';
      if (p.hecho) fill.style.background = a.color;
      barra.appendChild(fill);
      txt.appendChild(barra);
      row.appendChild(txt);
      return row;
    },

    refreshAchievements: function () {
      var A = window.PM.Achievements;
      this.achList.innerHTML = '';
      if (!A) return;
      var stats = A.stats();
      this.achSub.textContent = 'CONSEGUIDOS ' + A.count() + ' DE ' + A.total();
      CFG.ACHIEVEMENTS.forEach(function (a) {
        this.achList.appendChild(this.achRow(a, A.progress(a, stats)));
      }, this);
    },

    /* Diálogo de entrar / crear cuenta */
    showAccountPrompt: function (modo) {
      var self = this;
      var Ac = window.PM.Account;
      var crear = (modo === 'crear');
      var usuario = '', pass = '';

      function enviar() {
        if (!usuario || !pass) {
          self.setPromptStatus('ESCRIBE USUARIO Y CONTRASEÑA', true);
          return;
        }
        self.setPromptStatus(crear ? 'CREANDO...' : 'ENTRANDO...', false);
        var fn = crear ? Ac.signUp : Ac.signIn;
        fn.call(Ac, usuario, pass, function (err) {
          if (err) { self.setPromptStatus(err, true); return; }
          self.hidePrompt();
          self.refreshNicks();
          self.refreshProfile();
          self.refreshFriends();
        });
      }

      this.showPrompt({
        title: crear ? 'CREAR CUENTA' : 'ENTRAR',
        lines: crear
          ? ['ELIGE UN USUARIO Y UNA CONTRASEÑA',
             'EL USUARIO SERÁ TU NOMBRE EN EL JUEGO']
          : ['ENTRA CON TU USUARIO Y CONTRASEÑA'],
        fields: [
          { placeholder: 'USUARIO', maxLength: CFG.NICK_MAX,
            onInput: function (v) { usuario = v; } },
          { placeholder: 'CONTRASEÑA', password: true, maxLength: 40,
            onInput: function (v) { pass = v; }, onAccept: enviar }
        ],
        status: '',
        buttons: [
          { label: crear ? 'CREAR' : 'ENTRAR', primary: true, onClick: enviar },
          { label: 'VOLVER', keys: ['Escape'], hint: 'ESC',
            onClick: function () { self.hidePrompt(); } }
        ]
      });
    },

    /* La cuenta ha cambiado (entrar, salir, sincronizar) */
    accountHooks: function () {
      var self = this;
      var Ac = window.PM.Account;
      if (!Ac) return;
      Ac.onchange = function () {
        self.refreshNicks();
        self.refreshLevel();
        self.refreshSkins();      // el nivel de la cuenta puede abrir skins
        if (self.els.profile && self.els.profile.style.display !== 'none') {
          self.refreshProfile();
        }
        if (self.els.friends && self.els.friends.style.display !== 'none') {
          self.refreshFriends();
        }
      };
      // sesión de la última vez: se recupera sola y sin molestar
      Ac.restore(function () { /* si falla, se sigue de invitado */ });
    },

    /* ------------------------------------------------------
     * Amigos (lista guardada en este navegador)
     * ------------------------------------------------------ */
    buildFriends: function () {
      var self = this;
      var o = this.els.friends;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'AMIGOS';
      o.appendChild(h);

      var sub = document.createElement('div');
      sub.className = 'note';
      sub.textContent = 'GUARDA AQUÍ CON QUIÉN SUELES JUGAR';
      o.appendChild(sub);

      /* de invitado no hay lista: los amigos van con la cuenta */
      this.friendsGate = document.createElement('div');
      this.friendsGate.className = 'tab-pane';
      var gnote = document.createElement('div');
      gnote.className = 'note';
      gnote.textContent = 'LOS AMIGOS SE GUARDAN EN TU CUENTA, ASÍ LOS TIENES ' +
        'EN CUALQUIER SITIO. DE INVITADO NO HAY LISTA.';
      this.friendsGate.appendChild(gnote);
      var goProf = this.makeButton('IR A PERFIL', function () {
        self.showProfile();
      });
      goProf.classList.add('btn-primary');
      goProf.style.marginTop = '10px';
      this.friendsGate.appendChild(goProf);
      o.appendChild(this.friendsGate);

      this.friendsBody = document.createElement('div');
      this.friendsBody.className = 'tab-pane';
      o.appendChild(this.friendsBody);

      var row = document.createElement('div');
      row.className = 'preset-row';
      row.style.marginTop = '10px';
      this.friendInput = document.createElement('input');
      this.friendInput.type = 'text';
      this.friendInput.className = 'nick-input';
      this.friendInput.maxLength = CFG.NICK_MAX;
      this.friendInput.placeholder = 'NOMBRE';
      this.friendInput.setAttribute('autocomplete', 'off');
      this.friendInput.addEventListener('keydown', function (ev) {
        ev.stopPropagation();
        if (ev.key === 'Enter') self.addFriend();
      });
      row.appendChild(this.friendInput);
      var add = this.makeButton('AÑADIR', function () { self.addFriend(); });
      add.classList.add('btn-preset');
      row.appendChild(add);
      this.friendsBody.appendChild(row);

      this.friendsMsg = document.createElement('div');
      this.friendsMsg.className = 'lobby-status';
      this.friendsBody.appendChild(this.friendsMsg);

      this.friendsList = document.createElement('div');
      this.friendsList.className = 'friend-list';
      this.friendsBody.appendChild(this.friendsList);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);
    },

    addFriend: function () {
      var self = this;
      var Ac = window.PM.Account;
      if (!Ac || !Ac.logged()) return;
      var nombre = this.friendInput.value;
      this.friendsMsg.classList.remove('error');
      this.friendsMsg.textContent = 'AÑADIENDO...';
      Ac.addFriend(nombre, function (err) {
        self.friendsMsg.classList.toggle('error', !!err);
        self.friendsMsg.textContent = err || '';
        if (!err) {
          self.friendInput.value = '';
          if (window.PM.Friends) window.PM.Friends.add(nombre);   // copia local
        }
        self.refreshFriends();
      });
    },

    /* La lista vive en la cuenta; aquí se guarda una copia para poder
     * enseñarla al instante y seguir viéndola sin conexión. */
    refreshFriends: function () {
      var F = window.PM.Friends;
      var Ac = window.PM.Account;
      var logged = !!(Ac && Ac.logged());
      if (!this.friendsList || !F) return;

      if (this.friendsGate) this.friendsGate.style.display = logged ? 'none' : 'flex';
      if (this.friendsBody) this.friendsBody.style.display = logged ? 'flex' : 'none';
      if (!logged) return;

      this.pullFriends();
      this.renderFriends();
    },

    /* Traer la lista de verdad desde la cuenta.
     *
     * Antes esto vivía dentro de refreshFriends() y, al llegar la respuesta,
     * volvía a llamarlo: refrescar pedía la lista, la lista refrescaba, y
     * vuelta a empezar. La consecuencia era una petición detrás de otra sin
     * parar y la lista rehaciéndose entera todo el rato, así que los botones
     * parpadeaban y a veces se comían el clic (el botón que pulsabas ya no
     * era el que estaba en pantalla al soltar). Ahora la respuesta solo
     * REPINTA, y solo si la lista ha cambiado de verdad. */
    pullFriends: function () {
      var self = this;
      var Ac = window.PM.Account;
      var F = window.PM.Friends;
      if (this._friendsPulling || !Ac || !Ac.logged()) return;
      this._friendsPulling = true;
      Ac.listFriends(function (err, list) {
        self._friendsPulling = false;
        if (err || !list) return;
        var antes = F.all().join(',');
        F.replace(list);
        if (F.all().join(',') !== antes) self.renderFriends();
      });
    },

    /* Los avatares de la lista: los guarda la cuenta de cada uno, así que se
     * piden todos de una vez y se pintan cuando llegan. Quien no tenga cuenta
     * se queda con el Pac-Man de siempre. */
    pullFriendAvatars: function () {
      var self = this;
      var Ac = window.PM.Account;
      var F = window.PM.Friends;
      if (!Ac || !Ac.fetchProfiles || !F) return;
      var lista = F.all();
      if (!lista.length) return;
      Ac.fetchProfiles(lista, function (err, mapa) {
        if (err || !mapa) return;
        self.friendProfiles = mapa;
        self.paintFriendAvatars();
      });
    },

    paintFriendAvatars: function () {
      var mapa = this.friendProfiles || {};
      if (!this.friendAvatars) return;
      for (var i = 0; i < this.friendAvatars.length; i++) {
        var it = this.friendAvatars[i];
        var fila = mapa[it.name];
        var av = (fila && CFG.AVATAR_IDS.indexOf(fila.avatar) !== -1)
          ? fila.avatar : 'pac';
        var c = it.canvas.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, 44, 44);
        c.imageSmoothingEnabled = false;
        window.PM.Sprites.drawAvatar(c, 22, 22, 18, av, '#ffff00');
      }
    },

    renderFriends: function () {
      var self = this;
      var F = window.PM.Friends;
      if (!this.friendsList || !F) return;
      var list = F.all();
      this.friendsList.innerHTML = '';
      this.friendAvatars = [];
      if (!list.length) {
        var vacio = document.createElement('div');
        vacio.className = 'note';
        vacio.textContent = 'TODAVÍA NO HAS AÑADIDO A NADIE';
        this.friendsList.appendChild(vacio);
        return;
      }
      /* Cada amigo es una ficha: su avatar, su nombre y un botón que despliega
       * lo que se puede hacer con él. Antes salían los cuatro botones de
       * frente, y una lista de amigos parecía una barra de herramientas. */
      list.forEach(function (name) {
        var row = document.createElement('div');
        row.className = 'friend-row';

        var cab = document.createElement('div');
        cab.className = 'friend-cab';
        row.appendChild(cab);

        var av = document.createElement('canvas');
        av.width = 44; av.height = 44;
        av.className = 'friend-avatar';
        cab.appendChild(av);

        var n = document.createElement('span');
        n.className = 'friend-name';
        n.textContent = name;
        cab.appendChild(n);

        var btns = document.createElement('div');
        btns.className = 'friend-btns';
        row.appendChild(btns);

        var abrir = self.makeButton('OPCIONES ▾', function () {
          var on = row.classList.toggle('open');
          abrir.textContent = on ? 'OPCIONES ▴' : 'OPCIONES ▾';
          abrir.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
        abrir.classList.add('btn-preset', 'friend-toggle');
        abrir.setAttribute('aria-expanded', 'false');
        cab.appendChild(abrir);

        self.friendAvatars.push({ name: name, canvas: av });

        function boton(txt, fn, red) {
          var b = self.makeButton(txt, fn);
          b.classList.add('btn-preset');
          if (red) b.disabled = !window.PM.Net.configured();
          btns.appendChild(b);
          return b;
        }

        boton('VER PERFIL', function () { self.showFriendProfile(name); });

        boton('VER PARTIDA', function () { self.watchFriend(name); }, true);

        boton('INVITAR', function () {
          var P = window.PM.Party;
          if (!P || !P.active()) {
            self.friendsMsg.classList.add('error');
            self.friendsMsg.textContent = 'PRIMERO CREA UNA PARTY';
            return;
          }
          P.invite(name, function (ok, msg) {
            self.friendsMsg.classList.toggle('error', !ok);
            self.friendsMsg.textContent = msg || '';
          });
        }, true);

        boton('QUITAR', function () {
          F.remove(name);                       // fuera de la copia local
          self.friendsMsg.classList.remove('error');
          self.friendsMsg.textContent = '';
          self.renderFriends();                 // se va de la lista al momento
          if (window.PM.Account) {
            window.PM.Account.removeFriend(name, function () {
              self.refreshFriends();            // y se confirma con la nube
            });
          }
        });

        self.friendsList.appendChild(row);
      });
      this.paintFriendAvatars();     // con lo que ya se sepa
      this.pullFriendAvatars();      // y se repinta cuando lleguen
    },

    /* ------------------------------------------------------
     * Ver la partida de un amigo
     * Se le pregunta por su canal personal dónde está jugando y se
     * entra en su sala solo a mirar, por un canal aparte: la party
     * propia sigue en pie mientras tanto, no hay que salirse.
     * ------------------------------------------------------ */
    watchFriend: function (name) {
      if (!window.PM.Party || !window.PM.Net.configured()) return;
      this.findAndWatch(name);
    },

    findAndWatch: function (name) {
      var self = this;
      this.friendsMsg.classList.remove('error');
      this.friendsMsg.textContent = 'BUSCANDO A ' + name + '...';
      window.PM.Party.locate(name, function (res) {
        if (!res) {
          self.friendsMsg.classList.add('error');
          self.friendsMsg.textContent = name + ' NO ESTÁ CONECTADO';
          return;
        }
        // primero lo de siempre: si no está jugando, no hay nada que ver
        if (!res.jugando) {
          self.friendsMsg.classList.add('error');
          self.friendsMsg.textContent = name + ' AÚN NO HA EMPEZADO A JUGAR';
          return;
        }
        // jugando pero sin canal: se quedó sin nombre o sin conexión
        if (!res.code) {
          self.friendsMsg.classList.add('error');
          self.friendsMsg.textContent = 'NO SE PUEDE VER LA PARTIDA DE ' + name;
          return;
        }
        self.joinAsSpec(res.code, name);
      });
    },

    joinAsSpec: function (code, name) {
      var self = this;
      this.spec = { code: code, name: name, timer: null };
      this.friendsMsg.textContent = 'ENTRANDO A VER A ' + name + '...';
      window.PM.Net.openView(code, {
        // van dentro: openView empieza cerrando la vista anterior, y eso
        // borraba estos dos enganches si se ponían antes de llamar
        onMsg: function (n, d, sid) { self.specData(n, d, sid); },
        onGone: function () { self.specFail('SE PERDIÓ LA CONEXIÓN'); },
        onOpen: function () {
          if (!self.spec) return;
          window.PM.Net.gameSend('hello', { v: CFG.NET.PROTO, spec: 1 });
          self.spec.timer = setTimeout(function () {
            if (self.spec) self.specFail('NO SE PUDO VER LA PARTIDA');
          }, CFG.NET.HELLO_TIMEOUT_MS);
        },
        onError: function (m) { self.specFail(m || 'SIN CONEXIÓN'); }
      });
    },

    specData: function (name, d) {
      if (!this.spec) return;
      if (name === 'svista') {
        if (!d || d.to !== window.PM.Net.sid) return;
        if (d.v !== CFG.NET.PROTO) {
          this.specFail('TIENE OTRA VERSIÓN DEL JUEGO');
          return;
        }
        clearTimeout(this.spec.timer);
        this.spec = null;
        var n = parseInt(d.n, 10);
        if (!(n >= 1 && n <= CFG.MAX_PLAYERS)) n = 2;
        var colors = [], names = [], skins = [], ghosts = [];
        for (var i = 0; i < n; i++) {
          colors.push(sanitizeSetting('pacColor', (d.co || [])[i], CFG.PLAYER_COLORS[i]));
          names.push(sanitizeNick((d.nm || [])[i]) || ('J' + (i + 1)));
          skins.push(sanitizeSetting('skin1', (d.sk || [])[i], 'clasico'));
          // PAC-MAN VS.: el mirón también tiene que ver quién lleva fantasma
          ghosts.push(sanitizeSetting('vsGhost2', (d.gh || [])[i], -1));
        }
        this.hideAll();
        this.resumeAudio();
        window.PM.Game.newGame({
          players: n, net: 'spec', localIdx: -1,
          cfg: this.sanitizeNetCfg(d.cfg),
          colors: colors, names: names, skins: skins, ghosts: ghosts,
          hab: !!(d && d.hab)   // el mirón tiene que ver dientes y chispas
        });
      } else if (name === 'full') {
        if (d && d.to === window.PM.Net.sid) this.specFail('LA PARTIDA NO ADMITE MIRONES');
      }
    },

    specFail: function (msg) {
      if (this.spec && this.spec.timer) clearTimeout(this.spec.timer);
      this.spec = null;
      window.PM.Net.closeView();     // la party propia no se toca
      this.friendsMsg.classList.add('error');
      this.friendsMsg.textContent = msg;
      this.showFriends();
    },

    /* ------------------------------------------------------
     * Top mundial (ranking de partidas de dúo, desde Supabase)
     * ------------------------------------------------------ */
    buildRanking: function () {
      var self = this;
      var o = this.els.ranking;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'TOP MUNDIAL';
      o.appendChild(h);

      /* Clasificaciones separadas. Los identificadores 1..4 son EL NÚMERO DE
       * JUGADORES (una clasificación por formato, como las maestrías); el 5 y
       * el 6 son las otras dos tablas y el 0 es tu historial de este
       * navegador, que no toca la red. */
      var bar = document.createElement('div');
      bar.className = 'tab-row';
      this.rankTabBtns = {};
      [[1, 'INDIVIDUAL'], [2, 'DÚO'], [3, 'TRÍO'], [4, 'ESCUADRA'],
       [5, 'NIVEL 1'], [6, 'RETO DE HOY'], [0, 'TUS PARTIDAS']].forEach(function (t) {
        var b = self.makeButton(t[1], function () { self.showRankTab(t[0]); });
        b.classList.add('tab');
        self.rankTabBtns[t[0]] = b;
        bar.appendChild(b);
      });
      o.appendChild(bar);

      /* Segunda fila: la temporada. Solo pinta en las clasificaciones por
       * puntos (1..4), que son las que se reparten por meses; el resto no
       * tiene temporada que valga (el reto es de hoy y el nivel 1 es de
       * siempre). */
      this.seasonRow = document.createElement('div');
      this.seasonRow.className = 'tab-row';
      this.seasonBtns = {};
      [['ahora', 'ESTA TEMPORADA'], ['historico', 'HISTÓRICO']].forEach(function (t) {
        var b = self.makeButton(t[1], function () { self.showSeasonTab(t[0]); });
        b.classList.add('tab');
        self.seasonBtns[t[0]] = b;
        self.seasonRow.appendChild(b);
      });
      o.appendChild(this.seasonRow);
      this.seasonTab = 'ahora';

      this.rankSub = document.createElement('div');
      this.rankSub.className = 'note';
      o.appendChild(this.rankSub);

      this.rankStatus = document.createElement('div');
      this.rankStatus.className = 'lobby-status';
      o.appendChild(this.rankStatus);

      this.rankList = document.createElement('div');
      this.rankList.className = 'rank-list';
      o.appendChild(this.rankList);

      var row = document.createElement('div');
      row.className = 'preset-row';
      row.style.marginTop = '12px';
      var reload = this.makeButton('ACTUALIZAR', function () { self.loadRanking(); });
      reload.classList.add('btn-preset');
      row.appendChild(reload);
      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-preset');
      row.appendChild(back);
      o.appendChild(row);

      this.rankTab = 1;
    },

    showRankTab: function (players) {
      this.rankTab = ([0, 2, 3, 4, 5, 6].indexOf(players) !== -1) ? players : 1;
      this.loadRanking();
    },

    /* ESTA TEMPORADA / HISTÓRICO (solo en las clasificaciones por puntos) */
    showSeasonTab: function (name) {
      this.seasonTab = (name === 'historico') ? 'historico' : 'ahora';
      this.loadRanking();
    },

    loadRanking: function () {
      var self = this;
      var R = window.PM.Ranking;
      var S = window.PM.Season;
      var Rt = window.PM.Reto;
      var players = this.rankTab;
      if ([0, 2, 3, 4, 5, 6].indexOf(players) === -1) players = 1;
      for (var k in this.rankTabBtns) {
        if (this.rankTabBtns.hasOwnProperty(k)) {
          this.rankTabBtns[k].classList.toggle('active', +k === players);
        }
      }
      /* la fila de temporada solo tiene sentido en las de puntos (1..4) */
      var porTemporada = (players >= 1 && players <= 4);
      var enTemporada = porTemporada && this.seasonTab === 'ahora' && S;
      if (this.seasonRow) {
        this.seasonRow.style.display = porTemporada ? 'flex' : 'none';
        for (var s in this.seasonBtns) {
          if (this.seasonBtns.hasOwnProperty(s)) {
            this.seasonBtns[s].classList.toggle('active', s === this.seasonTab);
          }
        }
      }
      var temporada = S ? S.nombre(S.actual()) : '';
      var EQUIPO = { 2: 'DÚO', 3: 'TRÍO', 4: 'ESCUADRA' };
      var H = window.PM.History;
      var conCuenta = !!(H && H.cuenta && H.cuenta());
      this.rankSub.textContent =
        players === 0 ? ('TUS ÚLTIMAS PARTIDAS · ' + (conCuenta
          ? 'TAMBIÉN LAS DE OTROS APARATOS' : 'SOLO LAS DE ESTE NAVEGADOR')) :
        players === 6 ? ('LA MISMA PARTIDA PARA TODOS · ' +
          (Rt ? Rt.fmtFecha(Rt.hoy()) : '')) :
        players === 5 ? 'LO MÁS RÁPIDO EN DESPEJAR EL NIVEL 1 · A UN JUGADOR Y CON LOS AJUSTES DE SIEMPRE' :
        (players === 1 ? 'MEJOR MARCA DE CADA JUGADOR'
          : ('MEJOR MARCA DE CADA ' + EQUIPO[players] +
             ' · PUNTUACIÓN DE EQUIPO')) +
        (enTemporada ? (' · ' + temporada) : ' · DESDE EL PRINCIPIO');
      this.rankList.innerHTML = '';
      this.rankReq = (this.rankReq || 0) + 1;   // corta respuestas en vuelo

      /* TUS PARTIDAS: primero las de este navegador, que están ya y no
       * dependen de nada. Con cuenta se piden además las que quedaron en el
       * top mundial —las que jugaste en otro aparato— y la lista se rehace
       * con las dos mezcladas. Sin cuenta, ni se intenta: un nombre suelto no
       * identifica a nadie y traeríamos las partidas de otro. */
      if (players === 0) {
        var hist = H ? H.all() : [];
        var reqLocal = this.rankReq;
        this.rankStatus.classList.remove('error');
        this.rankStatus.textContent = hist.length
          ? '' : 'AÚN NO HAS JUGADO NINGUNA PARTIDA';
        this.renderHistory(hist);
        if (conCuenta && H.configured()) {
          if (!hist.length) this.rankStatus.textContent = 'CARGANDO...';
          H.list(function (err, lista) {
            if (self.rankReq !== reqLocal) return;    // se cambió de pestaña
            self.renderHistory(lista);
            self.rankStatus.classList.toggle('error', !!err);
            self.rankStatus.textContent =
              err ? ('SOLO LAS DE ESTE NAVEGADOR: ' + err) :
              lista.length ? '' : 'AÚN NO HAS JUGADO NINGUNA PARTIDA';
          });
        }
        return;
      }
      if (!R || !R.configured()) {
        this.rankStatus.classList.add('error');
        this.rankStatus.textContent = 'EL TOP MUNDIAL NECESITA LAS CREDENCIALES DE SUPABASE';
        return;
      }
      this.rankStatus.classList.remove('error');
      this.rankStatus.textContent = 'CARGANDO...';
      /* testigo de petición: al cambiar de pestaña rápido, la respuesta de la
       * anterior puede llegar después y pisar la lista o el mensaje */
      var req = (this.rankReq || 0) + 1;
      this.rankReq = req;
      function llegaron(err, rows) {
        if (self.rankReq !== req) return;      // respuesta caducada
        if (err) {
          self.rankStatus.classList.add('error');
          self.rankStatus.textContent = err === 'FALTA LA TABLA EN SUPABASE'
            ? ('FALTA LA TABLA: EJECUTA supabase/' +
               (players === 6 ? 'reto.sql'
                 : enTemporada ? 'temporadas.sql' : 'ranking.sql') +
               ' EN TU PROYECTO')
            : ('NO SE PUDO CARGAR: ' + err);
          if (players === 6) self.retoTuMarca();
          return;
        }
        self.rankStatus.classList.remove('error');
        if (!rows.length) {
          self.rankStatus.textContent =
            (players === 6) ? 'AÚN NADIE HA JUGADO EL RETO DE HOY · ¡SÉ EL PRIMERO!' :
            (players === 5) ? 'AÚN NADIE HA CRONOMETRADO EL NIVEL 1 · ¡SÉ EL PRIMERO!' :
            enTemporada ? 'AÚN NO HAY PARTIDAS ESTA TEMPORADA · ¡SÉ EL PRIMERO!'
                        : 'AÚN NO HAY PARTIDAS · ¡SÉ EL PRIMERO!';
          if (players === 6) self.retoTuMarca();
          return;
        }
        self.rankStatus.textContent = '';
        if (players === 6) { self.renderReto(rows); self.retoTuMarca(rows); }
        else if (players === 5) self.renderTimes(rows);
        else self.renderRanking(rows);
      }
      if (players === 6) {
        if (!Rt) return;
        Rt.enviarPendiente();          // por si la marca se hizo sin red
        /* Antes de pintar, saber si el intento de hoy está gastado en otro
         * aparato: si no, la línea de abajo diría "HOY AÚN NO LO HAS JUGADO"
         * teniendo tu marca delante, en la propia lista. */
        var pedirTop = function () {
          if (Rt.marca()) self.refreshReto();   // y el botón de la portada
          Rt.top(Rt.hoy(), llegaron);
        };
        if (Rt.sincronizar && !Rt.marca()) Rt.sincronizar(pedirTop);
        else pedirTop();
      } else if (players === 5) R.topTime(llegaron);
      else if (enTemporada) S.top(S.actual(), players, llegaron);
      else R.top(players, llegaron);
    },

    /* Debajo de la clasificación del reto: tu marca y tu puesto. Se enseña
     * también cuando no hay red, que es justo cuando más falta hace. */
    retoTuMarca: function (rows) {
      var Rt = window.PM.Reto;
      if (!Rt) return;
      var m = Rt.marca();
      var linea = document.createElement('div');
      linea.className = 'note';
      if (!m) {
        linea.textContent = 'HOY AÚN NO LO HAS JUGADO · TIENES UN INTENTO';
      } else {
        var puesto = rows ? Rt.puestoEn(rows) : 0;
        /* Sin puesto y sin enviar hay dos motivos muy distintos: que no haya
         * habido red todavía, o que el hueco de hoy ya estuviera ocupado (la
         * jugaste en otro aparato). Decirlo evita el "¿y por qué no sale?". */
        var cola = puesto ? (' · PUESTO ' + puesto)
          : m.otro ? ' · JUGADA EN OTRO APARATO'
          : m.e ? '' : ' · SIN ENVIAR';
        linea.textContent = 'TU MARCA DE HOY: ' + m.p + ' PUNTOS · NIVEL ' + m.n +
          cola;
      }
      this.rankList.appendChild(linea);
    },

    /* Clasificación del reto del día */
    renderReto: function (rows) {
      var mine = String(window.PM.settings.nick1 || '').toUpperCase();
      this.rankList.innerHTML = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var n1 = String(r.nombre || '').toUpperCase();
        var row = document.createElement('div');
        row.className = 'rank-row';
        if (mine && n1 === mine) row.classList.add('mine');

        var pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = (i + 1) + '.';
        row.appendChild(pos);

        var who = document.createElement('span');
        who.className = 'rank-who';
        who.textContent = n1;
        row.appendChild(who);

        var pts = document.createElement('span');
        pts.className = 'rank-pts';
        pts.textContent = String(r.puntos);
        row.appendChild(pts);

        var lvl = document.createElement('span');
        lvl.className = 'rank-lvl';
        lvl.textContent = 'NIV ' + r.nivel;
        row.appendChild(lvl);

        this.rankList.appendChild(row);
      }
    },

    /* Los más rápidos en despejar el nivel 1 */
    renderTimes: function (rows) {
      var R = window.PM.Ranking;
      var mine = String(window.PM.settings.nick1 || '').toUpperCase();
      this.rankList.innerHTML = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var n1 = String(r.nombre1 || '').toUpperCase();
        var row = document.createElement('div');
        row.className = 'rank-row';
        if (mine && n1 === mine) row.classList.add('mine');

        var pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = (i + 1) + '.';
        row.appendChild(pos);

        var who = document.createElement('span');
        who.className = 'rank-who';
        who.textContent = n1;
        row.appendChild(who);

        var t = document.createElement('span');
        t.className = 'rank-pts';
        t.textContent = R.fmtTime(r.tiempo1);
        row.appendChild(t);

        var pts = document.createElement('span');
        pts.className = 'rank-lvl';
        pts.textContent = r.puntos + ' PTS';
        row.appendChild(pts);

        this.rankList.appendChild(row);
      }
    },

    /* Tus últimas partidas (localStorage), lo más reciente primero */
    renderHistory: function (list) {
      var H = window.PM.History;
      this.rankList.innerHTML = '';
      for (var i = 0; i < list.length; i++) {
        var h = list[i];
        var row = document.createElement('div');
        row.className = 'rank-row';

        var pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = H ? H.fmtDate(h.t) : '';
        pos.style.textAlign = 'left';
        pos.style.width = 'auto';
        row.appendChild(pos);

        var who = document.createElement('span');
        who.className = 'rank-who';
        // con tres y cuatro no caben todos los nombres: el tuyo y cuántos erais
        who.textContent = (h.j === 2) ? (h.n1 + ' + ' + h.n2)
          : (h.j > 2) ? (h.n1 + ' +' + (h.j - 1)) : h.n1;
        row.appendChild(who);

        var pts = document.createElement('span');
        pts.className = 'rank-pts';
        pts.textContent = String(h.p);
        row.appendChild(pts);

        var lvl = document.createElement('span');
        lvl.className = 'rank-lvl';
        lvl.textContent = 'NIV ' + h.lv + (h.m === 'online' ? ' · ONLINE' : '');
        row.appendChild(lvl);

        /* si esa partida dejó repetición guardada, se puede volver a ver.
         * Las de online se graban de otra manera (el flujo del anfitrión) y
         * viven en su propio almacén, pero desde aquí se ven igual. */
        var R = window.PM.Replay;
        var reg = (R && R.paraPartida) ? R.paraPartida(h) : null;
        if (reg) row.appendChild(this.makeReplayBtn(reg.id, false));
        else {
          var red = (R && R.paraPartidaRed) ? R.paraPartidaRed(h) : null;
          if (red) row.appendChild(this.makeReplayBtn(red.id, true));
        }

        this.rankList.appendChild(row);
      }
    },

    /* Botón VER de una partida con repetición guardada (js/replay.js) */
    makeReplayBtn: function (id, deRed) {
      var b = this.makeButton('VER', function () {
        if (deRed) window.PM.Replay.verRedGuardada(id);
        else window.PM.Replay.verGuardada(id);
      });
      b.classList.add('tab');
      b.style.padding = '4px 10px';
      b.style.fontSize = '10px';
      return b;
    },

    renderRanking: function (rows) {
      var R = window.PM.Ranking;
      var mine = String(window.PM.settings.nick1 || '').toUpperCase();
      this.rankList.innerHTML = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        // los que jugaron, sean uno o cuatro
        var nombres = R ? R.nombresDe(r) : [String(r.nombre1 || '').toUpperCase()];
        var row = document.createElement('div');
        row.className = 'rank-row';
        if (mine && nombres.indexOf(mine) !== -1) row.classList.add('mine');

        var pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = (i + 1) + '.';
        row.appendChild(pos);

        var who = document.createElement('span');
        who.className = 'rank-who';
        who.textContent = nombres.join(' + ');
        row.appendChild(who);

        var pts = document.createElement('span');
        pts.className = 'rank-pts';
        pts.textContent = String(r.puntos);
        row.appendChild(pts);

        var lvl = document.createElement('span');
        lvl.className = 'rank-lvl';
        lvl.textContent = 'NIV ' + r.nivel + (r.modo === 'online' ? ' · ONLINE' : '');
        row.appendChild(lvl);

        this.rankList.appendChild(row);
      }
    },

    /* ------------------------------------------------------
     * Laberintos alternativos (modo aparte)
     * ------------------------------------------------------ */
    buildMazes: function () {
      var self = this;
      var o = this.els.mazes;
      if (!o) return;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'LABERINTOS';
      o.appendChild(h);

      var nota = document.createElement('div');
      nota.className = 'note';
      nota.textContent = 'OTROS LABERINTOS, LOS MISMOS FANTASMAS. ES UN MODO ' +
        'APARTE: EL LABERINTO DE 1980 NO SE TOCA, ASÍ QUE ESTAS PARTIDAS NO ' +
        'ENTRAN EN EL TOP MUNDIAL — PERO SÍ SUMAN EXPERIENCIA.';
      o.appendChild(nota);

      var lista = document.createElement('div');
      lista.className = 'maze-list';
      var M = window.PM.Mazes;
      (M ? M.LIST : []).forEach(function (m) {
        lista.appendChild(self.mazeRow(m));
      });
      o.appendChild(lista);

      var row = document.createElement('div');
      row.className = 'preset-row';
      row.style.marginTop = '12px';
      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-preset');
      row.appendChild(back);
      o.appendChild(row);
    },

    /* Una ficha: el dibujo del laberinto, su nombre y el botón de jugar */
    mazeRow: function (m) {
      var self = this;
      var fila = document.createElement('div');
      fila.className = 'maze-row';

      var mini = this.mazeThumb(m);
      if (mini) fila.appendChild(mini);

      var info = document.createElement('div');
      info.className = 'maze-info';
      var nm = document.createElement('div');
      nm.className = 'maze-name';
      nm.textContent = m.name;
      info.appendChild(nm);
      var ds = document.createElement('small');
      ds.textContent = m.desc + ' · ' + m.pellets + ' PASTILLAS';
      info.appendChild(ds);
      fila.appendChild(info);

      var b = this.makeButton('JUGAR', function () {
        self.resumeAudio();
        self.hideAll();
        window.PM.Game.newGame({ players: 1, maze: m.id });
      });
      b.classList.add('btn-preset');
      fila.appendChild(b);
      return fila;
    },

    /* Miniatura de los muros. Se dibuja con el mismo código que la partida
     * (Game.buildMazeCanvas) cambiando CFG.MAZE un momento y devolviéndolo:
     * así el dibujo del panel no puede desviarse del de verdad. */
    mazeThumb: function (m) {
      var G = window.PM.Game;
      if (!G || !G.buildMazeCanvas) return null;
      var cv = document.createElement('canvas');
      cv.width = 112;
      cv.height = Math.round(CFG.ROWS * CFG.TILE / 2);
      var c = cv.getContext('2d');
      if (!c) return null;
      c.imageSmoothingEnabled = false;
      var antes = CFG.MAZE;
      CFG.setMaze(m.rows);
      var full = G.buildMazeCanvas(CFG.COLORS.wall);
      CFG.setMaze(antes);
      c.drawImage(full, 0, 0, cv.width, cv.height);
      return cv;
    },

    showMazes: function () {
      this.showPanel('mazes');
    },

    /* ------------------------------------------------------
     * Controles en pantalla: barra de botones y cruceta(s)
     * ------------------------------------------------------ */
    /* Barra superior de la partida: RENDIRSE (siempre) y pausa (táctil) */
    buildGameButtons: function () {
      var self = this;
      var bar = document.createElement('div');
      bar.id = 'gameBtns';

      var em = document.createElement('button');
      em.type = 'button';
      em.id = 'emoteBtn';
      em.className = 'game-btn';
      em.textContent = 'EMOTES';
      em.setAttribute('aria-label', 'Emotes');
      em.addEventListener('click', function () {
        self.resumeAudio();
        self.toggleEmoteBar();
      });
      bar.appendChild(em);
      this.emoteBtn = em;

      var ch = document.createElement('button');
      ch.type = 'button';
      ch.id = 'chatBtn';
      ch.className = 'game-btn';
      ch.textContent = 'CHAT';
      ch.setAttribute('aria-label', 'Chat');
      ch.addEventListener('click', function () {
        self.resumeAudio();
        self.openChat();
      });
      bar.appendChild(ch);
      this.chatBtn = ch;

      var sur = document.createElement('button');
      sur.type = 'button';
      sur.id = 'surrenderBtn';
      sur.className = 'game-btn';
      sur.textContent = 'RENDIRSE';
      sur.setAttribute('aria-label', 'Rendirse');
      sur.addEventListener('click', function () {
        self.resumeAudio();
        window.PM.Game.requestVote('surrender');
      });
      bar.appendChild(sur);

      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'pauseBtn';
      b.className = 'game-btn';
      b.setAttribute('aria-label', 'Pausa');
      b.textContent = '❚❚';
      b.style.display = this.touchDevice ? '' : 'none';
      b.addEventListener('click', function () {
        self.resumeAudio();
        window.PM.Game.requestPause();
      });
      bar.appendChild(b);

      document.getElementById('stage').appendChild(bar);
      this.gameBtns = bar;
      this.pauseBtn = b;
      this.surrenderBtn = sur;
      this.buildEmoteBar();
      this.buildChatInput();
    },

    /* Fila de emotes (se abre con el botón; en teclado van con 1..6) */
    buildEmoteBar: function () {
      var self = this;
      var bar = document.createElement('div');
      bar.id = 'emoteBar';
      /* cada botón enseña la cara y su número (el mismo atajo de teclado) */
      this.emoteFaces = [];
      CFG.EMOTES.forEach(function (e, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'emote-btn';
        b.title = (i + 1) + ' · ' + e.name;
        b.setAttribute('aria-label', 'Emote ' + (i + 1) + ' ' + e.name);
        var cv = document.createElement('canvas');
        cv.width = 26; cv.height = 26;
        b.appendChild(cv);
        var num = document.createElement('span');
        num.className = 'emote-num';
        num.textContent = String(i + 1);
        b.appendChild(num);
        b.addEventListener('click', function () {
          self.resumeAudio();
          window.PM.Game.sendEmote(i);
          self.toggleEmoteBar(false);
        });
        bar.appendChild(b);
        self.emoteFaces.push({ canvas: cv, id: e.id });
      });
      /* misma acción que Ctrl+Espacio, para quien juega sin teclado */
      var mb = document.createElement('button');
      mb.type = 'button';
      mb.className = 'emote-btn badge-emote';
      mb.textContent = 'MI MAESTRÍA';
      mb.addEventListener('click', function () {
        self.resumeAudio();
        window.PM.Game.sendBadgeTag();
        self.toggleEmoteBar(false);
      });
      bar.appendChild(mb);
      document.getElementById('stage').appendChild(bar);
      this.emoteBar = bar;
    },

    toggleEmoteBar: function (on) {
      if (!this.emoteBar) return;
      var show = (on === undefined) ? !this.emoteBarOpen : !!on;
      this.emoteBarOpen = show;
      this.emoteBar.classList.toggle('on', show);
      if (show) this.refreshEmoteFaces();
    },

    /* Las caras de la barra, con el color del jugador local */
    drawEmoteFaces: function (tick) {
      if (!this.emoteFaces) return;
      var g = window.PM.Game;
      var color = g.colorFor(g.netRole ? g.localIdx : 0);
      for (var i = 0; i < this.emoteFaces.length; i++) {
        var it = this.emoteFaces[i];
        var c = it.canvas.getContext('2d');
        c.clearRect(0, 0, 26, 26);
        c.imageSmoothingEnabled = false;
        window.PM.Sprites.drawPacFace(c, 13, 14, 9, color, it.id, tick);
      }
    },

    /* Con la barra abierta las caras se mueven, igual que se verán sobre el
     * jugador: así se elige por lo que hace el emote, no por una foto fija.
     * El bucle se para solo al cerrar la barra. */
    refreshEmoteFaces: function () {
      var self = this;
      if (this.emoteRaf) return;
      var ms0 = null;
      var paso = function (ms) {
        if (!self.emoteBarOpen) { self.emoteRaf = 0; return; }
        if (ms0 === null) ms0 = ms;
        self.drawEmoteFaces((ms - ms0) * 0.06);   // 60 pasos por segundo
        self.emoteRaf = window.requestAnimationFrame(paso);
      };
      this.emoteRaf = window.requestAnimationFrame(paso);
    },

    /* Entrada de chat (solo online) */
    buildChatInput: function () {
      var self = this;
      var wrap = document.createElement('div');
      wrap.id = 'chatBox';
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'chat-input';
      input.maxLength = CFG.CHAT_MAX;
      input.placeholder = 'ESCRIBE Y PULSA ENTER';
      input.setAttribute('autocomplete', 'off');
      input.addEventListener('keydown', function (ev) {
        ev.stopPropagation();          // que no llegue al juego
        if (ev.key === 'Enter') {
          window.PM.Game.sendChat(input.value);
          input.value = '';
          self.closeChat();
        } else if (ev.key === 'Escape') {
          self.closeChat();
        }
      });
      wrap.appendChild(input);
      document.getElementById('stage').appendChild(wrap);
      this.chatBox = wrap;
      this.chatInput = input;
    },

    openChat: function () {
      if (!this.chatBox || !window.PM.Game.canChat()) return;
      this.chatBox.classList.add('on');
      this.chatOpen = true;
      this.chatInput.focus();
    },

    closeChat: function () {
      if (!this.chatBox) return;
      this.chatBox.classList.remove('on');
      this.chatOpen = false;
      this.chatInput.blur();
    },

    onChat: function () { /* enganche para futuros avisos de chat */ },

    /* ------------------------------------------------------
     * Diálogos sobre la partida: rendición, revancha y GAME OVER.
     * syncPrompt() reconstruye el diálogo a partir del estado del
     * juego (Game.vote / Game.overIdle), así nunca se descuadran.
     * ------------------------------------------------------ */
    showPrompt: function (o) {
      var self = this;
      var p = this.els.prompt;
      p.innerHTML = '';
      /* De qué es el diálogo que hay puesto. Lo usa quien pregunta algo por
       * red y quiere rehacerlo al llegar la respuesta, sin pisar otro que
       * haya salido entretanto. Lo pone quien lo necesita, después de esto. */
      this.promptTag = null;

      var t = document.createElement('div');
      t.className = 'panel-title';
      if (o.color) t.style.color = o.color;
      t.textContent = o.title;
      p.appendChild(t);

      /* cada línea: texto suelto u objeto { text, big } */
      (o.lines || []).forEach(function (line) {
        if (!line) return;
        var obj = (typeof line === 'object');
        var d = document.createElement('div');
        d.className = 'prompt-line' + (obj && line.big ? ' big' : '');
        d.textContent = obj ? line.text : line;
        p.appendChild(d);
      });

      /* resumen de la partida (lo que te llevas al acabar) */
      if (o.summary) p.appendChild(this.buildRunSummary(o.summary));

      /* campo de texto opcional (invitar a alguien por su nombre) */
      this.promptInput = null;
      if (o.input) {
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'nick-input';
        inp.maxLength = o.input.maxLength || CFG.NICK_MAX;
        inp.placeholder = o.input.placeholder || '';
        inp.setAttribute('autocomplete', 'off');
        inp.addEventListener('keydown', function (ev) {
          ev.stopPropagation();
          if (ev.key === 'Enter' && o.input.onAccept) o.input.onAccept(inp.value);
        });
        p.appendChild(inp);
        this.promptInput = inp;
      }

      /* varios campos (usuario + contraseña de las cuentas) */
      if (o.fields) {
        o.fields.forEach(function (f) {
          var el = document.createElement('input');
          el.type = f.password ? 'password' : 'text';
          el.className = 'nick-input';
          el.maxLength = f.maxLength || CFG.NICK_MAX;
          el.placeholder = f.placeholder || '';
          el.setAttribute('autocomplete', f.password ? 'current-password' : 'off');
          el.setAttribute('spellcheck', 'false');
          el.addEventListener('keydown', function (ev) {
            ev.stopPropagation();          // escribir no mueve a Pac-Man
            if (ev.key === 'Enter' && f.onAccept) f.onAccept(el.value);
          });
          el.addEventListener('input', function () {
            // el usuario se filtra como un nombre del juego; la clave, tal cual
            if (!f.password) {
              var v = filterNick(el.value).replace(/[^A-Z0-9]/g, '');
              if (v !== el.value) el.value = v;
            }
            if (f.onInput) f.onInput(el.value);
          });
          p.appendChild(el);
        });
      }

      this.promptStatusEl = null;
      this.promptStatusOwn = false;
      if (typeof o.status === 'string') {
        var st = document.createElement('div');
        st.className = 'lobby-status' + (o.statusError ? ' error' : '');
        st.textContent = o.status;
        p.appendChild(st);
        this.promptStatusEl = st;
      }

      /* botones, con su atajo de teclado (b.keys) y la tecla a la vista */
      var row = document.createElement('div');
      row.className = 'prompt-btns';
      this.promptKeys = [];
      (o.buttons || []).forEach(function (b) {
        var el = self.makeButton(b.label, b.onClick);
        if (b.primary) el.classList.add('btn-primary');
        if (b.hint) {
          var k = document.createElement('span');
          k.className = 'btn-key';
          k.textContent = b.hint;
          el.appendChild(k);
        }
        if (b.keys) self.promptKeys.push({ keys: b.keys, el: el });
        row.appendChild(el);
      });
      p.appendChild(row);

      p.classList.toggle('solid', !!o.solid);
      // sobre un menú el velo tiene que tapar; sobre la partida, no (el
      // laberinto se sigue viendo por detrás a propósito)
      p.classList.toggle('over-panel', !!this.visiblePanel());
      p.style.display = 'flex';
      this.promptOpen = true;
      this.refreshControls();
      // foco en el botón principal: las flechas y Enter funcionan de inmediato
      var first = p.querySelector('.btn-primary') || p.querySelector('.btn');
      if (first) { try { first.focus(); } catch (e) { /* sin foco */ } }
    },

    /* ------------------------------------------------------
     * Navegación con flechas por menús y diálogos
     * ------------------------------------------------------ */
    /* Panel visible ahora mismo (null si estamos en partida) */
    visiblePanel: function () {
      var names = ['menu', 'options', 'online', 'badges', 'ranking',
                   'mazes', 'friends', 'profile', 'mate'];
      for (var i = 0; i < names.length; i++) {
        var el = this.els[names[i]];
        if (el && el.style.display !== 'none') return el;
      }
      return null;
    },

    /* Controles enfocables del panel/diálogo abierto, en orden de aparición
     * (los de una pestaña oculta no cuentan: no tienen caja de dibujo) */
    navItems: function (host) {
      if (!host) return [];
      var sel = 'button:not([disabled]), input[type="range"], ' +
        'input[type="text"]:not([disabled]), input[type="color"]';
      var all = host.querySelectorAll(sel);
      var out = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].offsetParent !== null) out.push(all[i]);
      }
      return out;
    },

    navMove: function (host, delta) {
      var items = this.navItems(host);
      if (!items.length) return false;
      var cur = -1;
      for (var i = 0; i < items.length; i++) {
        if (items[i] === document.activeElement) { cur = i; break; }
      }
      var next = (cur === -1)
        ? (delta > 0 ? 0 : items.length - 1)
        : (cur + delta + items.length) % items.length;
      var el = items[next];
      try {
        el.focus();
        if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      } catch (e) { /* sin foco */ }
      return true;
    },

    /* Devuelve true si la tecla la consume la navegación */
    handleNavKey: function (ev) {
      var host = this.promptOpen ? this.els.prompt : this.visiblePanel();
      if (!host) return false;
      var ae = document.activeElement;
      var inHost = ae && host.contains(ae);
      var tag = ae ? ae.tagName : '';
      var typing = inHost && tag === 'INPUT' &&
        (ae.type === 'text' || ae.type === 'color');
      var k = ev.key;

      if (ev.ctrlKey || ev.altKey || ev.metaKey) return false;   // combinaciones
      if (k === 'Enter' || k === ' ') {
        if (typing) return false;             // lo gestiona el propio campo
        if (inHost && tag === 'BUTTON') { ae.click(); return true; }
        return false;                          // que sigan los atajos del diálogo
      }
      if (k !== 'ArrowUp' && k !== 'ArrowDown' &&
          k !== 'ArrowLeft' && k !== 'ArrowRight') return false;

      var horiz = (k === 'ArrowLeft' || k === 'ArrowRight');
      // escribiendo: izquierda/derecha mueven el cursor del texto
      if (typing && horiz) return false;
      // deslizador enfocado: izquierda/derecha ajustan el valor (nativo)
      if (inHost && tag === 'INPUT' && ae.type === 'range' && horiz) return false;

      return this.navMove(host, (k === 'ArrowDown' || k === 'ArrowRight') ? 1 : -1);
    },

    /* Atajos del diálogo abierto. Devuelve true si la tecla era suya. */
    handlePromptKey: function (ev) {
      if (!this.promptKeys) return false;
      var key = (ev.key && ev.key.length === 1) ? ev.key.toLowerCase() : ev.key;
      for (var i = 0; i < this.promptKeys.length; i++) {
        var pk = this.promptKeys[i];
        if (pk.keys.indexOf(key) === -1) continue;
        if (pk.el.disabled) return true;
        pk.el.click();
        return true;
      }
      return false;
    },

    hidePrompt: function () {
      if (!this.els.prompt) return;
      this.els.prompt.style.display = 'none';
      this.els.prompt.innerHTML = '';
      this.promptTag = null;
      this.promptStatusEl = null;
      this.promptStatusOwn = false;
      this.promptKeys = [];
      this.promptOpen = false;
    },

    /* Mensaje dentro del diálogo abierto (cuentas: "entrando...", errores) */
    setPromptStatus: function (text, error) {
      if (!this.promptStatusEl) return;
      // este diálogo se encarga de su propio mensaje: que tickPrompt no lo pise
      this.promptStatusOwn = true;
      this.promptStatusEl.classList.toggle('error', !!error);
      this.promptStatusEl.textContent = text || '';
    },

    voteStatusText: function (vote) {
      var secs = Math.ceil(vote.ticks / 60);
      if (vote.role === 'from') return 'ESPERANDO RESPUESTA... ' + secs;
      return vote.local ? '' : ('QUEDAN ' + secs + ' S');
    },

    /* Cuenta atrás: se reescribe solo el texto, sin rehacer el diálogo
     * (rehacerlo cada segundo se comería alguna pulsación de los botones) */
    tickPrompt: function () {
      var g = window.PM.Game;
      if (!this.promptOpen || !this.promptStatusEl) return;
      if (this.promptStatusOwn) return;      // lo lleva el propio diálogo
      this.promptStatusEl.textContent = g.vote
        ? this.voteStatusText(g.vote)
        : (g.flash ? g.flash.text : '');
    },

    syncPrompt: function () {
      var g = window.PM.Game;
      if (!this.els.prompt) return;
      if (g.state === 'MENU' || g.netNotice) {
        this.hidePrompt();
        this.refreshControls();
        return;
      }
      if (g.vote) this.showVotePrompt(g.vote);
      // g.overWait: aún se están celebrando logros o subida de nivel sobre el
      // laberinto, y el panel del resumen no debe taparlos
      else if (g.overIdle && !g.overWait) this.showGameOverPrompt();
      else if (g.paused && g.inGame() && g.state !== 'GAME_OVER') this.showPausePrompt();
      else {
        this.hidePrompt();
        this.refreshControls();
      }
    },

    /* Menú de pausa: reanudar / reiniciar / salir, con atajos de teclado */
    showPausePrompt: function () {
      var self = this;
      var g = window.PM.Game;
      /* viendo una repetición: el menú de pausa es el suyo (js/replay.js) */
      if (g.replaying && window.PM.Replay && window.PM.Replay.pausaPrompt()) return;
      var lines = [];
      /* de espectador solo se puede seguir viendo o irse: la partida es
       * de otros y aquí nada de reiniciarla */
      if (g.isSpec()) {
        this.showPrompt({
          title: 'VIENDO LA PARTIDA',
          color: '#7ec8ff',
          lines: ['ESTÁS VIENDO LA PARTIDA DE ' + g.nameFor(0) + '.'],
          buttons: [
            { label: 'SEGUIR VIENDO', hint: 'P · ESC', primary: true,
              keys: ['p', 'Escape', 'Enter'],
              onClick: function () { self.resumeAudio(); g.requestPause(); } },
            { label: 'SALIR', hint: 'Q', keys: ['q'],
              onClick: function () { g.toMenu(); } }
          ]
        });
        return;
      }
      if (g.netRole) {
        lines.push('LA PARTIDA ESTÁ EN PAUSA PARA LOS DOS.');
        lines.push('REINICIAR TIENE QUE ACEPTARLO ' + g.nameFor(g.peerIdx()) + '.');
      } else if (g.playerCount === 2) {
        lines.push('REINICIAR EMPIEZA UNA PARTIDA NUEVA PARA LOS DOS.');
      }
      this.showPrompt({
        title: 'PAUSA',
        color: '#ffff00',
        lines: lines,
        status: g.flash ? g.flash.text : '',
        buttons: [
          { label: 'REANUDAR', hint: 'P · ESC', primary: true,
            keys: ['p', 'Escape', 'Enter'],
            onClick: function () { self.resumeAudio(); g.requestPause(); } },
          { label: 'REINICIAR', hint: 'R', keys: ['r'],
            onClick: function () {
              self.resumeAudio();
              if (g.netRole) g.requestVote('restart');
              else g.restartGame();
            } },
          { label: 'SALIR', hint: 'Q', keys: ['q'],
            onClick: function () { g.toMenu(); } }
        ]
      });
    },

    /* Textos de cada tipo de votación: rendirse / revancha / reiniciar */
    VOTE_TEXT: {
      surrender: {
        color: '#ff8c00', from: 'RENDIRSE', ask: '¿RENDIRSE?',
        mine: 'HAS PROPUESTO ABANDONAR LA PARTIDA.',
        theirs: ' QUIERE ABANDONAR LA PARTIDA.',
        extra: 'SI ACEPTAS, TERMINA PARA LOS DOS.',
        yes: 'SÍ, RENDIRSE', no: 'SEGUIR JUGANDO'
      },
      rematch: {
        color: '#ffff00', from: 'REVANCHA', ask: '¿REVANCHA?',
        mine: 'HAS PROPUESTO JUGAR OTRA PARTIDA.',
        theirs: ' QUIERE LA REVANCHA.',
        yes: 'SÍ, JUGAR', no: 'NO, GRACIAS'
      },
      restart: {
        color: '#ffff00', from: 'REINICIAR', ask: '¿REINICIAR?',
        mine: 'HAS PROPUESTO EMPEZAR LA PARTIDA DE NUEVO.',
        theirs: ' QUIERE EMPEZAR LA PARTIDA DE NUEVO.',
        extra: 'SE PIERDE LA PUNTUACIÓN DE ESTA PARTIDA.',
        yes: 'SÍ, REINICIAR', no: 'SEGUIR JUGANDO'
      }
    },

    showVotePrompt: function (vote) {
      var self = this;
      var g = window.PM.Game;
      var tx = this.VOTE_TEXT[vote.kind] || this.VOTE_TEXT.surrender;
      var peer = g.playerCount === 2 ? g.nameFor(g.peerIdx()) : '';

      if (vote.role === 'from') {
        this.showPrompt({
          title: tx.from,
          color: tx.color,
          lines: [tx.mine, 'TIENE QUE ACEPTARLO ' + (peer || 'EL OTRO JUGADOR') + '.'],
          status: this.voteStatusText(vote),
          buttons: []
        });
        return;
      }

      /* nos toca decidir (o confirmar, en local) */
      var lines;
      if (vote.local) {
        lines = (vote.kind === 'surrender' && g.playerCount === 1)
          ? ['LA PARTIDA TERMINA Y SE GUARDA LA PUNTUACIÓN.']
          : [tx.extra || tx.mine];
      } else {
        lines = [(peer || 'EL OTRO JUGADOR') + tx.theirs];
        if (tx.extra) lines.push(tx.extra);
      }
      this.showPrompt({
        title: tx.ask,
        color: tx.color,
        lines: lines,
        status: this.voteStatusText(vote),
        buttons: [
          { label: tx.yes, primary: true, hint: 'ENTER', keys: ['Enter'],
            onClick: function () { self.resumeAudio(); g.answerVote(true); } },
          { label: tx.no, hint: 'ESC', keys: ['Escape'],
            onClick: function () { g.answerVote(false); } }
        ]
      });
    },

    /* Bloque "lo que te llevas" del final de la partida: la experiencia
     * ganada con la barra del nivel de jugador y los logros conseguidos en
     * esta partida. Los puntos y el nivel del laberinto ya salen arriba, en
     * las líneas del panel. */
    buildRunSummary: function (s) {
      var box = document.createElement('div');
      box.className = 'resumen';

      var lvlRow = document.createElement('div');
      lvlRow.className = 'resumen-lvl';
      var subio = s.lvl > s.lvlAntes;
      lvlRow.textContent = subio
        ? ('¡SUBES AL NIVEL DE JUGADOR ' + s.lvl + '!')
        : ('NIVEL DE JUGADOR ' + s.lvl);
      if (subio) lvlRow.classList.add('sube');
      box.appendChild(lvlRow);

      var exp = document.createElement('div');
      exp.className = 'resumen-exp';
      exp.textContent = '+' + (s.exp || 0) + ' DE EXPERIENCIA · TE FALTAN ' +
        Math.max(0, (s.lvlPide || 0) - (s.lvlEn || 0)) +
        ' PARA EL NIVEL ' + (s.lvl + 1);
      box.appendChild(exp);

      var barra = document.createElement('div');
      barra.className = 'level-bar';
      var fill = document.createElement('div');
      fill.className = 'level-fill';
      fill.style.width = Math.round((s.lvlPct || 0) * 100) + '%';
      barra.appendChild(fill);
      box.appendChild(barra);

      var logros = s.logros || [];
      var tit = document.createElement('div');
      tit.className = 'resumen-tit';
      tit.textContent = logros.length
        ? ('LOGROS DE ESTA PARTIDA (' + logros.length + ')')
        : 'SIN LOGROS NUEVOS ESTA VEZ';
      box.appendChild(tit);

      logros.forEach(function (a) {
        var row = document.createElement('div');
        row.className = 'resumen-logro';
        var cv = document.createElement('canvas');
        cv.width = 18; cv.height = 18;
        var c = cv.getContext('2d');
        c.imageSmoothingEnabled = false;
        window.PM.Sprites.drawAchStar(c, 9, 9, 8, a.color);
        row.appendChild(cv);
        var nm = document.createElement('span');
        nm.style.color = a.color || '#ffff00';
        nm.textContent = a.name;
        row.appendChild(nm);
        var ds = document.createElement('small');
        ds.textContent = a.desc || '';
        row.appendChild(ds);
        box.appendChild(row);
      });

      return box;
    },

    /* Panel de PAC-MAN VS.: aquí lo primero es QUIÉN HA GANADO, que si no
     * la partida no se entiende: hay dos marcadores y no compiten entre sí. */
    versusLines: function () {
      var g = window.PM.Game;
      var V = window.PM.Versus;
      var gana = V.winner(g);
      var cazadores = V.hunters(g);
      /* Con un solo cazador gana él; con varios, el titular se lo lleva el
       * que más ha cazado, pero abajo salen todos con lo suyo: cada uno
       * tiene su marcador, así que el final tiene que decir quién hizo qué. */
      var mejor = V.topHunter(g);
      var lines = [
        { text: gana === 'ghost'
            ? ('¡GANA ' + (mejor ? mejor.name : V.ghostName(g)) + '!')
            : '¡GANAN LOS PAC-MAN!',
          big: true },
        'PAC-MAN ' + (g.score || 0)
      ];
      for (var i = 0; i < cazadores.length; i++) {
        var c = cazadores[i];
        // las cazas salen de los puntos: así también cuadran en la pantalla
        // del invitado, al que solo le llegan los marcadores
        lines.push(c.name + ' ' + c.score + '  ·  ' +
          (c.catches === 1 ? '1 PAC-MAN CAZADO' : (c.catches + ' PAC-MAN CAZADOS')));
      }
      lines.push('NIVEL ' + g.level + ' · PAC-MAN VS. NO CUENTA PARA EL TOP MUNDIAL');
      return lines;
    },

    /* Panel de siempre: puntuación, récord y por qué no entra en el top */
    classicOverLines: function () {
      var g = window.PM.Game;
      /* viendo una repetición: el final es el suyo (js/replay.js) */
      if (g.replaying && window.PM.Replay && window.PM.Replay.finPrompt()) return;
      var lines = [{ text: 'PUNTUACIÓN ' + (g.score || 0), big: true }];
      // el equipo, sea de dos, de tres o de cuatro
      if (g.playerCount > 1) {
        var equipo = [];
        for (var q = 0; q < g.playerCount; q++) equipo.push(g.nameFor(q));
        lines.unshift(equipo.join('  +  '));
      }
      if (g.reto) lines.unshift('RETO DE HOY');
      lines.push('RÉCORD ' + (g.highScore || 0) + ' · NIVEL ' + g.level);
      // el reto se cierra con la partida: conviene decir dónde mirarlo
      if (g.reto) lines.push('TU MARCA DEL DÍA QUEDA REGISTRADA · MÍRALA EN TOP MUNDIAL → RETO DE HOY');
      // tiempo del primer nivel, que es lo que corre en su clasificación
      if (g.lvl1Cs > 0 && window.PM.Ranking) {
        lines.push('NIVEL 1 EN ' + window.PM.Ranking.fmtTime(g.lvl1Cs) +
          (g.canTimeRecord() ? '' : ' · NO CUENTA PARA EL TOP MUNDIAL'));
      }
      // por qué esta partida no entra en el top mundial, si es el caso
      if (g.score > 0 && window.PM.Ranking && window.PM.Ranking.configured()) {
        if (g.missingRankingName()) {
          lines.push(g.playerCount > 1
            ? 'PARA ENTRAR EN EL TOP MUNDIAL, TODOS NECESITÁIS NOMBRE'
            : 'PON TU NOMBRE PARA ENTRAR EN EL TOP MUNDIAL');
        } else if (g.badRankingName()) {
          lines.push('ESE NOMBRE NO ENTRA EN EL TOP MUNDIAL: ELIGE OTRO');
        }
      }
      return lines;
    },

    showGameOverPrompt: function () {
      var self = this;
      var g = window.PM.Game;
      var duo = (g.playerCount > 1);      // "otra partida" con la misma gente
      var versus = !!(g.isVersus && g.isVersus() && window.PM.Versus);
      var lines = versus ? this.versusLines() : this.classicOverLines();
      this.showPrompt({
        title: versus ? 'FIN DE LA RONDA' : 'GAME OVER',
        color: '#ff0000',
        solid: true,
        lines: lines,
        summary: g.runSummary,
        status: g.flash ? g.flash.text : '',
        statusError: !!g.flash,
        buttons: [
          { label: duo ? 'OTRA PARTIDA' : 'JUGAR OTRA VEZ', primary: true,
            hint: 'R', keys: ['r', 'Enter'],
            onClick: function () {
              self.resumeAudio();
              if (g.netRole) g.requestVote('rematch');
              else g.restartGame();
            } },
          { label: 'MENÚ', hint: 'Q · ESC', keys: ['q', 'Escape'],
            onClick: function () { g.toMenu(); } }
        ]
      });
    },

    /* Cruceta de dirección. En un jugador y online hay una sola
     * (centrada) que controla al jugador local; en dos jugadores
     * locales hay dos, en las esquinas: izquierda J1, derecha J2. */
    buildDpads: function () {
      this.dpad1 = this.makeDpad('dpad1', 0);
      this.dpad2 = this.makeDpad('dpad2', 1);
      this.buildHabBar();
    },

    /* ------------------------------------------------------
     * Modo HABILIDADES: la barra de Q/W/E/R
     *
     * Va en el DOM y no en el lienzo porque la fila de abajo del lienzo ya
     * está llena (vidas, cronómetro y frutas) y porque así el mismo trozo
     * sirve de dos cosas: enseña la recarga en el ordenador y se pulsa con
     * el dedo en el móvil. Ver js/habilidades.js.
     * ------------------------------------------------------ */
    buildHabBar: function () {
      var self = this;
      var bar = document.createElement('div');
      bar.id = 'habBar';
      bar.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
      this.habBtns = [];
      CFG.HAB.LIST.forEach(function (h, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'hab-b';
        b.setAttribute('aria-label', h.name);
        /* el relleno es un hijo con altura variable: sube como un vaso que
         * se llena, y a tope significa "lista" */
        var fill = document.createElement('span');
        fill.className = 'hab-fill';
        b.appendChild(fill);
        var lab = document.createElement('span');
        lab.className = 'hab-key';
        lab.textContent = h.key;
        b.appendChild(lab);
        var nom = document.createElement('small');
        nom.className = 'hab-name';
        nom.textContent = h.name;
        b.appendChild(nom);
        b.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          self.resumeAudio();
          var g = window.PM.Game;
          if (!g.hab || !window.PM.Hab) return;
          window.PM.Hab.pulsar(g, g.localIdx, k);
        });
        bar.appendChild(b);
        self.habBtns.push({ b: b, fill: fill, ultimo: -1, listo: null });
      });
      document.body.appendChild(bar);
      this.habBar = bar;
    },

    /* Refresco por fotograma (lo llama Game.render). Solo toca el DOM cuando
     * el número cambia de verdad: son 60 vueltas por segundo y escribir
     * estilos a ciegas en cada una se nota en un móvil modesto. */
    refreshHabBar: function () {
      var g = window.PM.Game;
      var A = window.PM.Hab;
      if (!this.habBar || !this.habBtns) return;
      var ver = !!(g.hab && A && !g.isSpec() && g.inGame() &&
                   g.state !== 'GAME_OVER' && !this.promptOpen);
      this.habBar.classList.toggle('on', ver);
      if (!ver) return;
      var idx = g.localIdx;
      for (var k = 0; k < this.habBtns.length; k++) {
        var o = this.habBtns[k];
        var pct = Math.round(A.carga(idx, k) * 100);
        if (pct !== o.ultimo) {
          o.fill.style.height = pct + '%';
          o.ultimo = pct;
        }
        var listo = (pct >= 100);
        if (listo !== o.listo) {
          o.b.classList.toggle('listo', listo);
          o.listo = listo;
        }
      }
      // el turbo activo se marca aparte: recargando y encendida son cosas
      // distintas y en la misma casilla se confundirían
      var st = A.estado(idx);
      if (st && this.habBtns[1]) {
        this.habBtns[1].b.classList.toggle('activa', st.turbo > 0);
      }
    },

    makeDpad: function (id, playerIdx) {
      var self = this;
      var wrap = document.createElement('div');
      wrap.className = 'dpad';
      wrap.id = id;
      wrap.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
      var defs = [
        [D.UP, '▲', 'dpad-up', 'Arriba'],
        [D.LEFT, '◀', 'dpad-left', 'Izquierda'],
        [D.RIGHT, '▶', 'dpad-right', 'Derecha'],
        [D.DOWN, '▼', 'dpad-down', 'Abajo']
      ];
      defs.forEach(function (df) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dpad-b ' + df[2];
        b.textContent = df[1];
        b.setAttribute('aria-label', df[3]);
        b.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          self.resumeAudio();
          var g = window.PM.Game;
          if (g.state !== 'PLAYING' && g.state !== 'READY') return;
          var idx = (g.playerCount === 2 && !g.netRole) ? playerIdx : g.localIdx;
          g.setPacDir(idx, df[0]);
        });
        wrap.appendChild(b);
      });
      document.body.appendChild(wrap);
      return wrap;
    },

    /* Botones y crucetas: solo con la partida en marcha y sin diálogos */
    refreshControls: function () {
      var g = window.PM.Game;
      // de espectador (o viendo una repetición) no se juega: ni crucetas,
      // ni emotes, ni chat
      var playable = g.inGame() && g.state !== 'GAME_OVER' && !g.isSpec() &&
        !g.replaying && !this.promptOpen && !g.netNotice;
      if (this.gameBtns) this.gameBtns.classList.toggle('on', playable);
      if (this.surrenderBtn) this.surrenderBtn.disabled = !g.canSurrender();
      // la barra lleva también MI MAESTRÍA, útil en cualquier modo
      if (this.emoteBtn) this.emoteBtn.style.display = playable ? '' : 'none';
      if (this.chatBtn) {
        this.chatBtn.style.display = (playable && g.netRole) ? '' : 'none';
      }
      if (!playable) {
        this.toggleEmoteBar(false);
        this.closeChat();
      }
      /* La barra de habilidades se refresca por fotograma desde Game.render,
       * pero ese camino solo existe DENTRO del modo: al volver al menú hay
       * que apagarla desde aquí o se quedaría colgada en la pantalla. */
      if (this.habBar && !(playable && g.hab)) this.habBar.classList.remove('on');
      if (!this.dpad1) return;
      var show = playable && this.touchDevice;
      var dual = show && g.playerCount === 2 && !g.netRole;
      this.dpad1.style.display = show ? 'grid' : 'none';
      this.dpad1.classList.toggle('dual', dual);
      this.dpad2.style.display = dual ? 'grid' : 'none';
    },

    /* ------------------------------------------------------
     * Visibilidad de paneles
     * ------------------------------------------------------ */
    /* Muestra un solo panel (o ninguno si name es null) */
    showPanel: function (name) {
      this.hidePrompt();
      var panels = ['menu', 'options', 'online', 'badges', 'ranking',
                    'mazes', 'friends', 'profile', 'mate'];
      for (var i = 0; i < panels.length; i++) {
        var el = this.els[panels[i]];
        if (el) el.style.display = (panels[i] === name) ? 'flex' : 'none';
      }
      this.refreshControls();
    },

    showMenu: function () {
      this.refreshNicks();
      this.refreshLevel();
      this.refreshOnlineBtn();
      this.refreshReto();
      // el canal personal va atado al nombre: si se ha cambiado, se rehace
      if (window.PM.Party) window.PM.Party.listen();
      this.showPanel('menu');
      // si el nivel subió justo al salirse de la partida, el aviso no se
      // llegó a ver: se celebra aquí
      var g = window.PM.Game;
      if (g && g.pendingLevelUp) {
        var lv = g.pendingLevelUp;
        g.pendingLevelUp = null;
        this.showLevelUpPrompt(lv);
      }
    },

    showLevelUpPrompt: function (lv) {
      var self = this;
      var s = window.PM.Level ? window.PM.Level.state() : null;
      this.showPrompt({
        title: '¡SUBES DE NIVEL!',
        color: '#00ffff',
        lines: [
          { text: 'NIVEL ' + lv, big: true },
          s ? ('SIGUIENTE: ' + s.inLevel + ' / ' + s.needed + ' PUNTOS') : ''
        ],
        buttons: [
          { label: 'SEGUIR', primary: true, keys: ['Enter', 'Escape', ' '],
            hint: 'ENTER', onClick: function () { self.hidePrompt(); } }
        ]
      });
    },

    /* ------------------------------------------------------
     * Reto de hoy
     * ------------------------------------------------------ */
    /* El botón de la portada dice si el de hoy ya está jugado */
    refreshReto: function () {
      var self = this;
      var R = window.PM.Reto;
      if (!this.retoBtn || !R) return;
      var m = R.marca();
      this.retoBtn.childNodes[0].nodeValue = m
        ? ('RETO DE HOY · ' + m.p) : 'RETO DE HOY';
      this.retoBtn.classList.toggle('hecho', !!m);
      if (m) {
        // si la marca se hizo sin conexión, este es buen momento para mandarla
        if (!m.e) R.enviarPendiente();
        return;
      }
      /* Aquí no hay marca, pero el intento de hoy puede estar gastado en otro
       * aparato: eso lo sabe el servidor. Se pregunta sin bloquear nada y, si
       * resulta que sí, el botón se pone al día solo. */
      if (R.sincronizar) {
        R.sincronizar(function (err, marca) {
          if (marca) self.refreshReto();
        });
      }
    },

    /* Antes de jugarlo se avisa de las reglas: un intento y se acabó. Si ya
     * está jugado, en vez del aviso sale tu marca y la clasificación. */
    showRetoPrompt: function () {
      var self = this;
      var R = window.PM.Reto;
      if (!R) return;
      var m = R.marca();
      var fecha = R.fmtFecha(R.hoy());
      if (m) {
        this.showPrompt({
          title: 'RETO DE HOY',
          color: '#00ffff',
          lines: [
            fecha,
            { text: 'TU MARCA ' + m.p, big: true },
            (m.otro ? 'LA JUGASTE EN OTRO APARATO · EL INTENTO ES UNO PARA TODOS'
                    : 'LLEGASTE AL NIVEL ' + m.n),
            'YA HAS GASTADO TU INTENTO · VUELVE MAÑANA CON OTRO LABERINTO DE FANTASMAS'
          ],
          status: (m.e || !R.configured()) ? '' : 'TU MARCA AÚN NO ESTÁ EN LA CLASIFICACIÓN: SE MANDARÁ SOLA CUANDO HAYA RED',
          buttons: [
            { label: 'VER CLASIFICACIÓN', primary: true, keys: ['Enter'],
              hint: 'ENTER',
              onClick: function () { self.hidePrompt(); self.showRanking(6); } },
            { label: 'VOLVER', keys: ['Escape'], hint: 'ESC',
              onClick: function () { self.hidePrompt(); } }
          ]
        });
        this.promptTag = 'reto';
        return;
      }
      /* Sin marca aquí, se pregunta al servidor si el intento de hoy ya está
       * gastado en otro aparato. Mientras tanto el diálogo sale entero: la
       * respuesta suele llegar antes de que nadie lea las reglas, y si dice
       * que sí, este mismo diálogo se rehace con la marca de allí. */
      if (R.sincronizar) {
        R.sincronizar(function (err, marca) {
          if (marca && self.promptOpen && self.promptTag === 'reto') {
            self.showRetoPrompt();
            self.refreshReto();
          }
        });
      }
      this.showPrompt({
        title: 'RETO DE HOY',
        color: '#ffff00',
        lines: [
          fecha,
          'LA MISMA PARTIDA PARA TODO EL MUNDO: MISMOS AJUSTES Y LOS MISMOS FANTASMAS, QUE HUYEN IGUAL EN LA PARTIDA DE CUALQUIERA',
          'UN SOLO INTENTO AL DÍA · CUENTA LO QUE HAGAS, TE RINDAS O TE SALGAS',
          'SUMA EXPERIENCIA COMO CUALQUIER PARTIDA'
        ],
        buttons: [
          { label: 'JUGAR', primary: true, keys: ['Enter'], hint: 'ENTER',
            onClick: function () { self.playReto(); } },
          { label: 'CLASIFICACIÓN', keys: ['c'], hint: 'C',
            onClick: function () { self.hidePrompt(); self.showRanking(6); } },
          { label: 'VOLVER', keys: ['Escape'], hint: 'ESC',
            onClick: function () { self.hidePrompt(); } }
        ]
      });
      this.promptTag = 'reto';
    },

    /* ------------------------------------------------------
     * Modo HABILIDADES: reglas y salida a jugar
     * ------------------------------------------------------ */
    showHabPrompt: function () {
      var self = this;
      var H = CFG.HAB;
      this.showPrompt({
        title: 'HABILIDADES',
        color: '#ff66cc',
        lines: [
          'EL LABERINTO DE SIEMPRE CON CUATRO PODERES. CADA UNO CON SU TECLA Y SU RECARGA',
          'Q MORDISCO · TE COMES AL FANTASMA QUE TENGAS PEGADO, MIRES HACIA DONDE MIRES (' +
            H.segs(0) + 'S)',
          'W TURBO · X1.5 DE VELOCIDAD DURANTE ' + (H.TURBO_TICKS / 60) +
            'S (' + H.segs(1) + 'S)',
          'E FLASH · ' + H.FLASH_TILES +
            ' CASILLAS ATRAVESANDO MUROS HACIA LA ÚLTIMA FLECHA QUE PULSES, MIRE PAC-MAN DONDE MIRE, COMIENDO LO QUE PILLES (' +
            H.segs(2) + 'S)',
          'R GRITO · LOS CUATRO FANTASMAS SE ASUSTAN ' + H.SHOUT_SECS +
            'S SIN SUPERPASTILLA (' + H.segs(3) + 'S)',
          'AQUÍ SE MUEVE SOLO CON LAS FLECHAS: LA W ES EL TURBO',
          'ES UN MODO APARTE, ASÍ QUE ESTAS PARTIDAS NO ENTRAN EN EL TOP MUNDIAL NI HACEN RÉCORD — PERO SÍ SUMAN EXPERIENCIA Y LOGROS',
          'EN PARTY LO JUEGA TODO EL GRUPO: LO ENCIENDE QUIEN MANDA, EN EL PANEL DE ONLINE'
        ],
        buttons: [
          { label: 'JUGAR SOLO', primary: true, keys: ['Enter'], hint: 'ENTER',
            onClick: function () {
              self.resumeAudio();
              self.hidePrompt();
              self.hideAll();
              window.PM.Game.newGame({ players: 1, hab: true });
            } },
          { label: 'VOLVER', keys: ['Escape'], hint: 'ESC',
            onClick: function () { self.hidePrompt(); } }
        ]
      });
      this.promptTag = 'hab';
    },

    playReto: function () {
      var R = window.PM.Reto;
      if (!R) return;
      /* Por si el intento se gastó en otro aparato mientras se leían las
       * reglas: más vale enseñar la marca que dejar jugar una partida que el
       * servidor no iba a admitir. */
      if (R.marca()) { this.showRetoPrompt(); return; }
      this.resumeAudio();
      this.hidePrompt();
      this.hideAll();
      window.PM.Game.newGame(R.opts());
    },

    /* El botón del menú avisa de si ya estamos en una party */
    refreshOnlineBtn: function () {
      var P = window.PM.Party;
      if (!this.onlineMenuBtn) return;
      var txt = 'JUGAR ONLINE';
      if (P && P.inParty()) {
        txt = 'PARTY (' + P.count() + '/' + CFG.MAX_PLAYERS + ')';
      }
      this.onlineMenuBtn.childNodes[0].nodeValue = txt;
    },

    /* Nivel de jugador en la portada */
    refreshLevel: function () {
      if (!this.levelLabel || !window.PM.Level) return;
      var s = window.PM.Level.state();
      this.levelLabel.textContent = 'NIVEL ' + s.level + ' · ' +
        s.inLevel + ' / ' + s.needed;
      this.levelFill.style.width = Math.round(s.pct * 100) + '%';
    },

    showFriends: function () {
      this.refreshFriends();
      this.showPanel('friends');
    },
    showOptions: function () {
      this.refreshOptions();
      this.showPanel('options');
    },
    showOnline: function () {
      var P = window.PM.Party;
      this.showPanel('online');
      if (P && P.inParty()) this.refreshParty();
      else this.showOnlineIdle();
    },
    showBadges: function () {
      this.badgePick = null;          // al entrar, siempre la que tienes
      this.refreshBadges();
      this.showPanel('badges');
      // y si tienes alguna, se celebra sola al abrir el panel
      var top = window.PM.Badges ? window.PM.Badges.top(this.badgeTab) : null;
      if (top) this.pickBadge(top.id, true);
    },
    showRanking: function (tab) {
      if (tab != null) this.rankTab = tab;
      this.showPanel('ranking');
      this.loadRanking();
    },
    hideAll: function () {
      this.showPanel(null);   // se actualiza de nuevo al arrancar la partida
    },

    resumeAudio: function () {
      if (window.AudioSys) {
        AudioSys.init();
        AudioSys.resume();
        this.applyMute();
      }
      this.audioResumed = true;
    },

    /* ------------------------------------------------------
     * Entrada: teclado y gestos táctiles
     * J1: flechas (y WASD en 1 jugador) · J2: WASD
     *
     * En el modo HABILIDADES, WASD DEJA DE MOVER: la W es el turbo, y no se
     * puede tener la misma tecla haciendo dos cosas. Se avisa en la portada
     * y en el rótulo del propio modo. Por eso ese modo no se ofrece en dos
     * jugadores en el mismo teclado, que es donde el J2 se quedaría sin
     * manera de moverse.
     * ------------------------------------------------------ */
    bindKeyboard: function () {
      var self = this;
      var ARROWS = {
        'ArrowUp': D.UP, 'ArrowLeft': D.LEFT,
        'ArrowDown': D.DOWN, 'ArrowRight': D.RIGHT
      };
      var WASD = {
        'w': D.UP, 'a': D.LEFT, 's': D.DOWN, 'd': D.RIGHT,
        'W': D.UP, 'A': D.LEFT, 'S': D.DOWN, 'D': D.RIGHT
      };
      var HAB_KEYS = { q: 0, w: 1, e: 2, r: 3, Q: 0, W: 1, E: 2, R: 3 };
      document.addEventListener('keydown', function (ev) {
        var g = window.PM.Game;
        if (self.chatOpen) return;       // escribiendo: lo lleva el propio campo

        /* flechas y Enter recorren los menús y diálogos abiertos */
        if (self.handleNavKey(ev)) { ev.preventDefault(); return; }

        /* con un diálogo abierto mandan sus atajos (REANUDAR, R, Q, ...) */
        if (self.promptOpen) {
          if (self.handlePromptKey(ev)) ev.preventDefault();
          return;
        }
        var canControl = (g.state === 'PLAYING' || g.state === 'READY');

        /* Ctrl+Espacio: enseña tu maestría sobre tu Pac-Man */
        if (canControl && ev.ctrlKey &&
            (ev.code === 'Space' || ev.key === ' ' || ev.key === 'Spacebar')) {
          self.resumeAudio();
          g.sendBadgeTag();
          self.toggleEmoteBar(false);
          ev.preventDefault();
          return;
        }

        /* emotes 1..6 */
        if (canControl && /^[1-9]$/.test(ev.key)) {
          var ei = parseInt(ev.key, 10) - 1;
          if (ei < CFG.EMOTES.length) {
            self.resumeAudio();
            g.sendEmote(ei);
            self.toggleEmoteBar(false);
            ev.preventDefault();
            return;
          }
        }
        /* chat online con T */
        if (canControl && (ev.key === 't' || ev.key === 'T') && g.canChat()) {
          self.openChat();
          ev.preventDefault();
          return;
        }

        /* HABILIDADES: Q/W/E/R. Va ANTES que WASD a propósito, porque en este
         * modo la W es el turbo y no el "arriba" de siempre. */
        if (g.hab && (ev.key in HAB_KEYS)) {
          if (canControl && window.PM.Hab) {
            self.resumeAudio();
            window.PM.Hab.pulsar(g, g.localIdx, HAB_KEYS[ev.key]);
            ev.preventDefault();
          }
          return;
        }

        var isArrow = (ev.key in ARROWS);
        /* En HABILIDADES se mueve SOLO con flechas. Dejar la A, la S y la D
         * moviendo mientras la W hace otra cosa sería el peor de los dos
         * mundos: medio mando que a veces responde y a veces no. */
        var isWasd = !g.hab && (ev.key in WASD);
        if (isArrow || isWasd) {
          if (canControl) {
            self.resumeAudio();
            if (g.playerCount === 2 && !g.netRole) {
              // dos jugadores locales: controles separados
              if (isArrow) g.setPacDir(0, ARROWS[ev.key]);
              else g.setPacDir(1, WASD[ev.key]);
            } else {
              g.setPacDir(g.localIdx, isArrow ? ARROWS[ev.key] : WASD[ev.key]);
            }
            ev.preventDefault();
          }
          return;
        }
        if (ev.key === 'p' || ev.key === 'P' || ev.key === 'Escape') {
          if (g.canPause()) {           // también mientras mueres o cambia el nivel
            g.requestPause();
            ev.preventDefault();
          } else if (ev.key === 'Escape') {
            if (self.els.online.style.display !== 'none') {
              self.showMenu();      // salir del panel no deshace la party
            } else if (self.els.options.style.display !== 'none' ||
                       self.els.badges.style.display !== 'none' ||
                       self.els.ranking.style.display !== 'none' ||
                       self.els.friends.style.display !== 'none') {
              self.showMenu();
            }
          }
        }
      });
    },

    /* Deslizar sobre el laberinto para moverse. Multitáctil: en dos
     * jugadores locales, la mitad izquierda de la pantalla controla a J1
     * y la derecha a J2 (cada pulgar con su zona, simultáneos). En un
     * jugador y online, cualquier deslizamiento controla al jugador local. */
    bindTouch: function () {
      var canvas = document.getElementById('game');
      var tracks = {};       // identifier -> { sx, sy, zone }
      var THRESH = 22;       // px de deslizamiento para registrar un giro
      var self = this;

      function zoneFor(clientX) {
        var g = window.PM.Game;
        if (g.playerCount === 2 && !g.netRole) {
          var r = canvas.getBoundingClientRect();
          return (clientX - r.left) < r.width / 2 ? 0 : 1;
        }
        return g.localIdx;
      }

      canvas.addEventListener('touchstart', function (ev) {
        self.resumeAudio();
        for (var i = 0; i < ev.changedTouches.length; i++) {
          var t = ev.changedTouches[i];
          tracks[t.identifier] = { sx: t.clientX, sy: t.clientY, zone: zoneFor(t.clientX) };
        }
      }, { passive: true });

      canvas.addEventListener('touchmove', function (ev) {
        var g = window.PM.Game;
        if (g.state !== 'PLAYING' && g.state !== 'READY') return;
        for (var i = 0; i < ev.changedTouches.length; i++) {
          var t = ev.changedTouches[i];
          var tr = tracks[t.identifier];
          if (!tr) continue;
          var dx = t.clientX - tr.sx;
          var dy = t.clientY - tr.sy;
          if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) continue;
          var d;
          if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? D.RIGHT : D.LEFT;
          else d = dy > 0 ? D.DOWN : D.UP;
          g.setPacDir(tr.zone, d);
          // reanclar: el mismo dedo puede encadenar giros sin levantarse
          tr.sx = t.clientX;
          tr.sy = t.clientY;
        }
      }, { passive: true });

      function endTouches(ev) {
        for (var i = 0; i < ev.changedTouches.length; i++) {
          delete tracks[ev.changedTouches[i].identifier];
        }
      }
      canvas.addEventListener('touchend', endTouches, { passive: true });
      canvas.addEventListener('touchcancel', endTouches, { passive: true });
    }
  };

  window.PM.UI = UI;

  /* Arranque */
  function boot() {
    window.PM.Game.init('game');
    UI.init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
