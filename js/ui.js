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
    if (key === 'skin1' || key === 'skin2') {
      return CFG.SKIN_IDS.indexOf(value) !== -1 ? value : def;
    }
    return def;
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

    init: function () {
      this.touchDevice = ('ontouchstart' in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      this.els.menu = document.getElementById('menu');
      this.els.options = document.getElementById('options');
      this.els.online = document.getElementById('online');
      this.els.badges = document.getElementById('badges');
      this.els.ranking = document.getElementById('ranking');
      this.els.friends = document.getElementById('friends');
      this.els.prompt = document.getElementById('prompt');
      if (window.PM.Badges) window.PM.Badges.syncSeen();
      this.buildMenu();
      this.buildOptions();
      this.buildOnline();
      this.buildBadges();
      this.buildRanking();
      this.buildFriends();
      this.buildGameButtons();
      this.buildDpads();
      this.bindKeyboard();
      this.bindTouch();
      this.applyMute();
      this.fitCanvas();
      var self = this;
      window.addEventListener('resize', function () { self.fitCanvas(); });
      this.showMenu();

      /* enlace compartido ?sala=CODE: entrar directo al lobby */
      var rc = window.PM.Net && window.PM.Net.roomFromUrl();
      if (rc) {
        this.showOnline();
        if (window.PM.Net.configured()) {
          this.codeInput.value = rc;
          this.joinFlow(rc);
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

      var title = document.createElement('div');
      title.className = 'title';
      title.textContent = 'PAC-MAN';
      m.appendChild(title);

      var sub = document.createElement('div');
      sub.className = 'subtitle';
      sub.textContent = 'TOP MUNDIAL';
      m.appendChild(sub);

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
      m.appendChild(roster);

      /* nombre en la portada, estilo arcade moderno: se escribe y a jugar */
      m.appendChild(this.makeNickRow('nick1', 'TU NOMBRE', 'menu'));

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
      m.appendChild(lvl);

      var play = this.makeButton('UN JUGADOR', function () {
        self.resumeAudio();
        self.hideAll();
        window.PM.Game.newGame({ players: 1 });
      });
      play.classList.add('btn-primary');
      m.appendChild(play);

      m.appendChild(this.makeButton('DOS JUGADORES', function () {
        self.resumeAudio();
        self.hideAll();
        window.PM.Game.newGame({ players: 2 });
      }));

      m.appendChild(this.makeButton('JUGAR ONLINE', function () {
        self.resumeAudio();
        self.showOnline();
      }));

      var extras = document.createElement('div');
      extras.className = 'preset-row';
      extras.style.marginTop = '2px';
      extras.appendChild(this.makeButton('TOP MUNDIAL', function () {
        self.resumeAudio();
        self.showRanking();
      }));
      extras.appendChild(this.makeButton('MAESTRÍAS', function () {
        self.resumeAudio();
        self.showBadges();
      }));
      extras.appendChild(this.makeButton('AMIGOS', function () {
        self.resumeAudio();
        self.showFriends();
      }));
      for (var e = 0; e < extras.childNodes.length; e++) {
        extras.childNodes[e].classList.add('btn-preset');
      }
      m.appendChild(extras);

      m.appendChild(this.makeButton('OPCIONES', function () {
        self.resumeAudio();
        self.showOptions();
      }));

      var hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = 'J1: FLECHAS O WASD · P O ESC: PAUSA (REANUDAR · REINICIAR R · SALIR Q)';
      m.appendChild(hint);

      var hint2 = document.createElement('div');
      hint2.className = 'hint';
      hint2.style.marginTop = '2px';
      hint2.textContent = 'DOS JUGADORES: J1 FLECHAS · J2 WASD · EQUIPO CONTRA LOS FANTASMAS';
      m.appendChild(hint2);

      var hint3 = document.createElement('div');
      hint3.className = 'hint';
      hint3.style.marginTop = '2px';
      hint3.textContent = 'RENDIRSE: BOTÓN ARRIBA A LA DERECHA · EN DÚO LO ACEPTÁIS LOS DOS';
      m.appendChild(hint3);

      if (this.touchDevice) {
        var hint4 = document.createElement('div');
        hint4.className = 'hint';
        hint4.style.marginTop = '2px';
        hint4.textContent = 'TÁCTIL: DESLIZA PARA MOVERTE · EN DOS JUGADORES, CADA UNO SU MITAD';
        m.appendChild(hint4);
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

      /* --- pestañas: el panel entero de golpe se veía abarrotado --- */
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
        pane.className = 'tab-pane';
        self.tabPanes[t[0]] = pane;
        o.appendChild(pane);
      });

      var dif = this.tabPanes.dificultad;
      var jug = this.tabPanes.jugadores;
      var par = this.tabPanes.partida;
      var son = this.tabPanes.sonido;

      /* ===== pestaña DIFICULTAD ===== */
      dif.appendChild(this.sectionTitle('DIFICULTAD'));
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
      dif.appendChild(presetRow);

      this.customTag = document.createElement('div');
      this.customTag.className = 'custom-tag';
      this.customTag.textContent = 'PERSONALIZADA';
      dif.appendChild(this.customTag);

      this.sliders = {};
      dif.appendChild(this.makeSlider('ghostSpeedMult', 'VELOCIDAD FANTASMAS',
        0.5, 1.2, 0.05, function (v) { return '×' + v.toFixed(2); }));
      dif.appendChild(this.makeSlider('pacSpeedMult', 'VELOCIDAD PAC-MAN',
        0.8, 1.3, 0.05, function (v) { return '×' + v.toFixed(2); }));
      dif.appendChild(this.makeSlider('frightMult', 'DURACIÓN POWER PELLET',
        0, 2, 0.25, function (v) { return '×' + v.toFixed(2); }));
      dif.appendChild(this.makeSlider('startLives', 'VIDAS',
        1, 5, 1, function (v) { return String(v); }));
      dif.appendChild(this.makeSlider('startLevel', 'NIVEL INICIAL',
        1, 21, 1, function (v) { return String(v); }));

      var note = document.createElement('div');
      note.className = 'note';
      note.textContent = 'VELOCIDAD, VIDAS Y NIVEL SE APLICAN EN LA PRÓXIMA PARTIDA';
      dif.appendChild(note);

      /* ===== pestaña JUGADORES ===== */
      jug.appendChild(this.sectionTitle('NOMBRES'));
      jug.appendChild(this.makeNickRow('nick1', 'TU NOMBRE (J1 Y ONLINE)'));
      jug.appendChild(this.makeNickRow('nick2', 'JUGADOR 2 (LOCAL)'));
      var nkNote = document.createElement('div');
      nkNote.className = 'note';
      nkNote.textContent = 'SE VEN EN EL MARCADOR, SOBRE CADA PAC-MAN Y EN LAS SALAS ONLINE';
      jug.appendChild(nkNote);

      this.colorRows = {};
      this.skinRows = {};
      jug.appendChild(this.sectionTitle('JUGADOR 1'));
      jug.appendChild(this.makeColorRow('pacColor'));
      jug.appendChild(this.makeSkinRow('skin1', 'pacColor'));
      jug.appendChild(this.sectionTitle('JUGADOR 2'));
      jug.appendChild(this.makeColorRow('pac2Color'));
      jug.appendChild(this.makeSkinRow('skin2', 'pac2Color'));

      /* ===== pestaña PARTIDA ===== */
      par.appendChild(this.sectionTitle('VIDAS EN 2 JUGADORES'));
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

      /* ===== pestaña SONIDO ===== */
      son.appendChild(this.sectionTitle('SONIDO'));
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
      son.appendChild(sndRow);

      son.appendChild(this.sectionTitle('VOLUMEN POR TIPO'));
      CFG.SOUND_CATS.forEach(function (c) {
        son.appendChild(self.makeSlider(c.key, c.name, 0, 1, 0.1,
          function (v) { return Math.round(v * 100) + '%'; }, true));
      });

      var volNote = document.createElement('div');
      volNote.className = 'note';
      volNote.textContent = 'EFECTOS: WAKA, FANTASMAS, FRUTA... · ' +
        'AMBIENTE: SIRENA Y MODO AZUL · VOCES: RACHA AL COMER FANTASMAS';
      son.appendChild(volNote);

      /* prueba rápida de las voces de racha */
      son.appendChild(this.sectionTitle('VOCES DE RACHA'));
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
      son.appendChild(vRow);

      this.voicesNote = document.createElement('div');
      this.voicesNote.className = 'note';
      son.appendChild(this.voicesNote);

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

    /* Refresca los campos de nombre (todos menos el que se está escribiendo) */
    refreshNicks: function (skip) {
      var s = window.PM.settings;
      for (var k in this.nickInputs) {
        if (!this.nickInputs.hasOwnProperty(k)) continue;
        var list = this.nickInputs[k];
        for (var i = 0; i < list.length; i++) {
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
          window.PM.settings[key] = sk.id;
          saveSettings();
          self.refreshOptions();
        });
        row.appendChild(b);
        items.push({ id: sk.id, btn: b, canvas: cv });
      });
      this.skinRows[key] = { items: items, colorKey: colorKey };
      return row;
    },

    /* Repinta las miniaturas de skins con el color actual */
    refreshSkins: function () {
      var s = window.PM.settings;
      for (var k in this.skinRows) {
        if (!this.skinRows.hasOwnProperty(k)) continue;
        var row = this.skinRows[k];
        var color = s[row.colorKey] || '#ffff00';
        for (var i = 0; i < row.items.length; i++) {
          var it = row.items[i];
          it.btn.classList.toggle('active', s[k] === it.id);
          var c = it.canvas.getContext('2d');
          c.setTransform(1, 0, 0, 1, 0, 0);
          c.clearRect(0, 0, 48, 48);
          c.imageSmoothingEnabled = false;
          // el sprite mide r=6.5; se amplía para que la skin se lea bien
          c.setTransform(3, 0, 0, 3, 24, 24);
          window.PM.Sprites.drawPacman(c, 0, 0, CFG.DIR.RIGHT, 2, color, it.id);
          c.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
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
      this.soundBtns.si.classList.toggle('active', !s.muted);
      this.soundBtns.no.classList.toggle('active', !!s.muted);
      if (this.voicesNote) {
        var ready = window.AudioSys && AudioSys.voicesReady && AudioSys.voicesReady();
        this.voicesNote.textContent = ready
          ? 'SUENAN AL COMER FANTASMAS SEGUIDOS CON EL MISMO ENERGIZANTE'
          : 'SI NO SUENAN, ABRE EL JUEGO DESDE UN SERVIDOR (JUGAR.BAT), NO CON DOBLE CLIC';
      }
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
      sub.textContent = 'DOS JUGADORES CONTRA LOS FANTASMAS · PUNTUACIÓN DE EQUIPO';
      o.appendChild(sub);

      /* --- vista inicial --- */
      var idle = document.createElement('div');
      idle.className = 'online-view';
      this.onlineIdle = idle;

      this.onlineWarn = document.createElement('div');
      this.onlineWarn.className = 'online-warn';
      this.onlineWarn.style.display = 'none';
      idle.appendChild(this.onlineWarn);

      var create = this.makeButton('CREAR SALA', function () { self.hostFlow(); });
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
        if (ev.key === 'Enter') self.joinFlow(self.codeInput.value);
      });
      joinRow.appendChild(this.codeInput);
      this.joinBtn = this.makeButton('UNIRSE', function () {
        self.joinFlow(self.codeInput.value);
      });
      this.joinBtn.classList.add('btn-preset');
      joinRow.appendChild(this.joinBtn);
      idle.appendChild(joinRow);

      var back = this.makeButton('VOLVER', function () {
        self.cancelLobby();
        self.showMenu();
      });
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
      lab.textContent = 'CÓDIGO DE SALA';
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

      this.lobbyStatusEl = document.createElement('div');
      this.lobbyStatusEl.className = 'lobby-status';
      room.appendChild(this.lobbyStatusEl);

      var cancel = this.makeButton('CANCELAR', function () {
        self.cancelLobby();
        self.showOnlineIdle();
      });
      cancel.style.marginTop = '10px';
      room.appendChild(cancel);
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

    showOnlineRoom: function (code, status) {
      this.onlineIdle.style.display = 'none';
      this.onlineRoom.style.display = 'flex';
      this.roomCodeEl.textContent = code.split('').join(' ');
      this.roomLinkEl.textContent = window.PM.Net.roomLink(code);
      this.copyBtn.textContent = 'COPIAR ENLACE';
      this.setLobbyStatus(status || '');
    },

    copyLink: function () {
      var self = this;
      var text = window.PM.Net.roomLink(this.lobby ? this.lobby.code : '');
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

    /* ----- anfitrión: crear sala y esperar al jugador 2 ----- */
    hostFlow: function () {
      var self = this;
      if (!window.PM.Net.configured()) return;
      var code = window.PM.Net.randomCode();
      this.lobby = { mode: 'host', code: code, locked: false, peerColor: null };
      window.PM.Net.handler = function (n, d, sid) { self.hostLobbyData(n, d, sid); };
      window.PM.Net.onclose = function () { self.lobbyClosed(); };
      this.showOnlineRoom(code, 'CONECTANDO...');
      window.PM.Net.connect(code, {
        onOpen: function () {
          if (self.lobby && self.lobby.mode === 'host') {
            self.setLobbyStatus('ESPERANDO AL JUGADOR 2...');
          }
        },
        onError: function (msg) { self.lobbyError(msg || 'SIN CONEXIÓN'); }
      });
    },

    hostLobbyData: function (name, data, sid) {
      var self = this;
      if (!this.lobby || this.lobby.mode !== 'host') return;
      if (name !== 'hello') return;
      if (this.lobby.locked) {
        window.PM.Net.send('full', { to: sid });
        return;
      }
      if (!data || data.v !== CFG.NET.PROTO) {
        window.PM.Net.send('full', { to: sid });
        this.setLobbyStatus('EL OTRO JUGADOR TIENE OTRA VERSIÓN DEL JUEGO', true);
        return;
      }
      this.lobby.locked = true;
      this.lobby.peerColor = sanitizeSetting('pac2Color', data.c, '#00ff00');
      this.lobby.peerName = sanitizeNick(data.n);
      this.lobby.peerSkin = sanitizeSetting('skin2', data.k, 'clasico');
      window.PM.Net.lockPeer(sid);
      window.PM.Net.send('cfg', {
        v: CFG.NET.PROTO,
        c: window.PM.settings.pacColor,
        n: window.PM.settings.nick1,
        k: window.PM.settings.skin1,
        cfg: this.netCfgSubset()
      });
      this.setLobbyStatus('¡' + (this.lobby.peerName || 'JUGADOR 2') +
        ' EN LA SALA! EMPEZANDO...');
      setTimeout(function () {
        if (!self.lobby || self.lobby.mode !== 'host') return;
        window.PM.Net.send('start', {});
        self.startOnlineGame('host');
      }, 800);
    },

    /* ----- invitado: unirse con código ----- */
    joinFlow: function (code) {
      var self = this;
      if (!window.PM.Net.configured()) return;
      code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
      if (code.length !== CFG.NET.ROOM_LEN) {
        this.setLobbyStatus('');
        this.onlineWarn.style.display = 'block';
        this.onlineWarn.textContent = 'EL CÓDIGO TIENE ' + CFG.NET.ROOM_LEN + ' LETRAS';
        return;
      }
      this.onlineWarn.style.display = 'none';
      this.lobby = { mode: 'join', code: code, locked: false, hostCfg: null, hostColor: null, timer: null };
      window.PM.Net.handler = function (n, d, sid) { self.guestLobbyData(n, d, sid); };
      window.PM.Net.onclose = function () { self.lobbyClosed(); };
      this.showOnlineRoom(code, 'CONECTANDO...');
      window.PM.Net.connect(code, {
        onOpen: function () {
          if (!self.lobby || self.lobby.mode !== 'join') return;
          window.PM.Net.send('hello', {
            v: CFG.NET.PROTO,
            c: window.PM.settings.pac2Color,
            n: window.PM.settings.nick1,
            k: window.PM.settings.skin1
          });
          self.setLobbyStatus('BUSCANDO LA SALA...');
          self.lobby.timer = setTimeout(function () {
            if (self.lobby && self.lobby.mode === 'join' && !self.lobby.locked) {
              self.lobbyError('NO SE ENCONTRÓ LA SALA ' + code);
            }
          }, CFG.NET.HELLO_TIMEOUT_MS);
        },
        onError: function (msg) { self.lobbyError(msg || 'SIN CONEXIÓN'); }
      });
    },

    guestLobbyData: function (name, data, sid) {
      if (!this.lobby || this.lobby.mode !== 'join') return;
      if (name === 'cfg') {
        if (!data || data.v !== CFG.NET.PROTO) {
          this.lobbyError('EL ANFITRIÓN TIENE OTRA VERSIÓN DEL JUEGO');
          return;
        }
        if (this.lobby.timer) { clearTimeout(this.lobby.timer); this.lobby.timer = null; }
        this.lobby.locked = true;
        this.lobby.hostCfg = data.cfg;
        this.lobby.hostColor = sanitizeSetting('pacColor', data.c, '#ffff00');
        this.lobby.hostName = sanitizeNick(data.n);
        this.lobby.hostSkin = sanitizeSetting('skin1', data.k, 'clasico');
        window.PM.Net.lockPeer(sid);
        this.setLobbyStatus('CON ' + (this.lobby.hostName || 'EL ANFITRIÓN') +
          ' · EMPEZANDO...');
      } else if (name === 'start') {
        if (this.lobby.locked) this.startOnlineGame('guest');
      } else if (name === 'full') {
        if (data && data.to === window.PM.Net.sid) {
          this.lobbyError('LA SALA ESTÁ LLENA');
        }
      }
    },

    startOnlineGame: function (role) {
      var lb = this.lobby;
      if (!lb) return;
      if (lb.timer) clearTimeout(lb.timer);
      this.lobby = null;
      this.hideAll();
      this.resumeAudio();
      var me = sanitizeNick(window.PM.settings.nick1);
      var mySkin = sanitizeSetting('skin1', window.PM.settings.skin1, 'clasico');
      var colors, names, skins, cfg = null;
      if (role === 'host') {
        colors = [window.PM.settings.pacColor, lb.peerColor || '#00ff00'];
        names = [me || 'J1', lb.peerName || 'J2'];
        skins = [mySkin, lb.peerSkin || 'clasico'];
      } else {
        colors = [lb.hostColor || '#ffff00', window.PM.settings.pac2Color];
        names = [lb.hostName || 'J1', me || 'J2'];
        skins = [lb.hostSkin || 'clasico', mySkin];
        cfg = this.sanitizeNetCfg(lb.hostCfg);
      }
      window.PM.Game.newGame({
        players: 2, net: role, cfg: cfg,
        colors: colors, names: names, skins: skins
      });
    },

    lobbyError: function (msg) {
      this.cancelLobby();
      this.showOnlineIdle();
      this.onlineWarn.style.display = 'block';
      this.onlineWarn.textContent = msg;
    },

    lobbyClosed: function () {
      if (this.lobby) this.lobbyError('SE PERDIÓ LA CONEXIÓN');
    },

    cancelLobby: function () {
      if (this.lobby && this.lobby.timer) clearTimeout(this.lobby.timer);
      this.lobby = null;
      window.PM.Net.leave();
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

      /* dos rutas independientes: un jugador y dúo */
      var bar = document.createElement('div');
      bar.className = 'tab-row';
      this.badgeTabBtns = {};
      [['solo', 'EN SOLO'], ['duo', 'EN DÚO']].forEach(function (t) {
        var b = self.makeButton(t[1], function () { self.showBadgeTab(t[0]); });
        b.classList.add('tab');
        self.badgeTabBtns[t[0]] = b;
        bar.appendChild(b);
      });
      o.appendChild(bar);

      this.badgesSub = document.createElement('div');
      this.badgesSub.className = 'note';
      o.appendChild(this.badgesSub);

      this.badgesList = document.createElement('div');
      this.badgesList.className = 'badge-list';
      o.appendChild(this.badgesList);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);

      this.badgeTab = 'solo';
    },

    showBadgeTab: function (mode) {
      this.badgeTab = (mode === 'duo') ? 'duo' : 'solo';
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
      var label = (mode === 'duo') ? 'RÉCORD DE EQUIPO: ' : 'RÉCORD EN SOLO: ';
      this.badgesSub.textContent = label + best +
        (next ? ('  ·  SIGUIENTE: ' + next.name + ' A ' + next.points)
              : '  ·  ¡TODAS CONSEGUIDAS!');
      this.badgesList.innerHTML = '';
      var self = this;
      CFG.BADGES.forEach(function (b) {
        var got = best >= b.points;
        var row = document.createElement('div');
        row.className = 'badge-row' + (got ? ' got' : '');

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
          ? ('CONSEGUIDA · ' + b.points + ' PUNTOS')
          : ('TE FALTAN ' + (b.points - best) + ' PUNTOS');
        txt.appendChild(st);
        row.appendChild(txt);

        self.badgesList.appendChild(row);
      });
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
      o.appendChild(row);

      this.friendsMsg = document.createElement('div');
      this.friendsMsg.className = 'lobby-status';
      o.appendChild(this.friendsMsg);

      this.friendsList = document.createElement('div');
      this.friendsList.className = 'friend-list';
      o.appendChild(this.friendsList);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);
    },

    addFriend: function () {
      var F = window.PM.Friends;
      if (!F) return;
      var err = F.add(this.friendInput.value);
      this.friendsMsg.classList.toggle('error', !!err);
      this.friendsMsg.textContent = err || '';
      if (!err) this.friendInput.value = '';
      this.refreshFriends();
    },

    refreshFriends: function () {
      var self = this;
      var F = window.PM.Friends;
      if (!this.friendsList || !F) return;
      var list = F.all();
      this.friendsList.innerHTML = '';
      if (!list.length) {
        var vacio = document.createElement('div');
        vacio.className = 'note';
        vacio.textContent = 'TODAVÍA NO HAS AÑADIDO A NADIE';
        this.friendsList.appendChild(vacio);
        return;
      }
      list.forEach(function (name) {
        var row = document.createElement('div');
        row.className = 'friend-row';

        var n = document.createElement('span');
        n.className = 'friend-name';
        n.textContent = name;
        row.appendChild(n);

        var del = self.makeButton('QUITAR', function () {
          F.remove(name);
          self.friendsMsg.classList.remove('error');
          self.friendsMsg.textContent = '';
          self.refreshFriends();
        });
        del.classList.add('btn-preset');
        row.appendChild(del);

        self.friendsList.appendChild(row);
      });
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

      /* dos clasificaciones separadas */
      var bar = document.createElement('div');
      bar.className = 'tab-row';
      this.rankTabBtns = {};
      [[1, 'INDIVIDUAL'], [2, 'DÚO'], [0, 'TUS PARTIDAS']].forEach(function (t) {
        var b = self.makeButton(t[1], function () { self.showRankTab(t[0]); });
        b.classList.add('tab');
        self.rankTabBtns[t[0]] = b;
        bar.appendChild(b);
      });
      o.appendChild(bar);

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
      this.rankTab = (players === 2) ? 2 : (players === 0 ? 0 : 1);
      this.loadRanking();
    },

    loadRanking: function () {
      var self = this;
      var R = window.PM.Ranking;
      var players = this.rankTab;
      if (players !== 0 && players !== 2) players = 1;
      for (var k in this.rankTabBtns) {
        if (this.rankTabBtns.hasOwnProperty(k)) {
          this.rankTabBtns[k].classList.toggle('active', +k === players);
        }
      }
      this.rankSub.textContent = (players === 0)
        ? 'TUS ÚLTIMAS PARTIDAS EN ESTE NAVEGADOR'
        : (players === 1
            ? 'MEJOR MARCA DE CADA JUGADOR'
            : 'MEJOR MARCA DE CADA DÚO · PUNTUACIÓN DE EQUIPO');
      this.rankList.innerHTML = '';
      this.rankReq = (this.rankReq || 0) + 1;   // corta respuestas en vuelo

      /* pestaña local: no toca la red */
      if (players === 0) {
        var hist = window.PM.History ? window.PM.History.all() : [];
        this.rankStatus.classList.remove('error');
        this.rankStatus.textContent = hist.length
          ? '' : 'AÚN NO HAS JUGADO NINGUNA PARTIDA';
        this.renderHistory(hist);
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
      R.top(players, function (err, rows) {
        if (self.rankReq !== req) return;      // respuesta caducada
        if (err) {
          self.rankStatus.classList.add('error');
          self.rankStatus.textContent = err === 'FALTA LA TABLA EN SUPABASE'
            ? 'FALTA LA TABLA: EJECUTA supabase/ranking.sql EN TU PROYECTO'
            : ('NO SE PUDO CARGAR: ' + err);
          return;
        }
        self.rankStatus.classList.remove('error');
        if (!rows.length) {
          self.rankStatus.textContent = 'AÚN NO HAY PARTIDAS · ¡SÉ EL PRIMERO!';
          return;
        }
        self.rankStatus.textContent = '';
        self.renderRanking(rows);
      });
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
        who.textContent = (h.j === 2) ? (h.n1 + ' + ' + h.n2) : h.n1;
        row.appendChild(who);

        var pts = document.createElement('span');
        pts.className = 'rank-pts';
        pts.textContent = String(h.p);
        row.appendChild(pts);

        var lvl = document.createElement('span');
        lvl.className = 'rank-lvl';
        lvl.textContent = 'NIV ' + h.lv + (h.m === 'online' ? ' · ONLINE' : '');
        row.appendChild(lvl);

        this.rankList.appendChild(row);
      }
    },

    renderRanking: function (rows) {
      var mine = String(window.PM.settings.nick1 || '').toUpperCase();
      this.rankList.innerHTML = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var n1 = String(r.nombre1 || '').toUpperCase();
        var n2 = String(r.nombre2 || '').toUpperCase();
        var row = document.createElement('div');
        row.className = 'rank-row';
        if (mine && (n1 === mine || n2 === mine)) row.classList.add('mine');

        var pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = (i + 1) + '.';
        row.appendChild(pos);

        var who = document.createElement('span');
        who.className = 'rank-who';
        who.textContent = n2 ? (n1 + ' + ' + n2) : n1;
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
    refreshEmoteFaces: function () {
      if (!this.emoteFaces) return;
      var g = window.PM.Game;
      var color = g.colorFor(g.netRole ? g.localIdx : 0);
      for (var i = 0; i < this.emoteFaces.length; i++) {
        var it = this.emoteFaces[i];
        var c = it.canvas.getContext('2d');
        c.clearRect(0, 0, 26, 26);
        c.imageSmoothingEnabled = false;
        window.PM.Sprites.drawPacFace(c, 13, 13, 10, color, it.id);
      }
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

      this.promptStatusEl = null;
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
      var names = ['menu', 'options', 'online', 'badges', 'ranking', 'friends'];
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
      this.promptStatusEl = null;
      this.promptKeys = [];
      this.promptOpen = false;
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
      else if (g.overIdle) this.showGameOverPrompt();
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
      var lines = [];
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

    showGameOverPrompt: function () {
      var self = this;
      var g = window.PM.Game;
      var duo = (g.playerCount === 2);
      var lines = [{ text: 'PUNTUACIÓN ' + (g.score || 0), big: true }];
      if (duo) lines.unshift(g.nameFor(0) + '  +  ' + g.nameFor(1));
      lines.push('RÉCORD ' + (g.highScore || 0) + ' · NIVEL ' + g.level);
      // por qué esta partida no entra en el top mundial, si es el caso
      if (g.score > 0 && window.PM.Ranking && window.PM.Ranking.configured()) {
        if (g.missingRankingName()) {
          lines.push(duo
            ? 'PARA ENTRAR EN EL TOP MUNDIAL, LOS DOS NECESITÁIS NOMBRE'
            : 'PON TU NOMBRE PARA ENTRAR EN EL TOP MUNDIAL');
        } else if (g.badRankingName()) {
          lines.push('ESE NOMBRE NO ENTRA EN EL TOP MUNDIAL: ELIGE OTRO');
        }
      }
      this.showPrompt({
        title: 'GAME OVER',
        color: '#ff0000',
        solid: true,
        lines: lines,
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
      var playable = g.inGame() && g.state !== 'GAME_OVER' &&
        !this.promptOpen && !g.netNotice;
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
      var panels = ['menu', 'options', 'online', 'badges', 'ranking', 'friends'];
      for (var i = 0; i < panels.length; i++) {
        var el = this.els[panels[i]];
        if (el) el.style.display = (panels[i] === name) ? 'flex' : 'none';
      }
      this.refreshControls();
    },

    showMenu: function () {
      this.refreshNicks();
      this.refreshLevel();
      this.showPanel('menu');
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
      this.showPanel('online');
      this.showOnlineIdle();
    },
    showBadges: function () {
      this.refreshBadges();
      this.showPanel('badges');
    },
    showRanking: function () {
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

        var isArrow = (ev.key in ARROWS);
        var isWasd = (ev.key in WASD);
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
              self.cancelLobby();
              self.showMenu();
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
