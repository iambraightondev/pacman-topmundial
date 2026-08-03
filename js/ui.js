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
    startLevel:     { min: 1,   max: 21,  int: true }
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
      this.els.prompt = document.getElementById('prompt');
      this.buildMenu();
      this.buildOptions();
      this.buildOnline();
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

      /* --- DIFICULTAD --- */
      o.appendChild(this.sectionTitle('DIFICULTAD'));
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
      o.appendChild(presetRow);

      this.customTag = document.createElement('div');
      this.customTag.className = 'custom-tag';
      this.customTag.textContent = 'PERSONALIZADA';
      o.appendChild(this.customTag);

      /* --- deslizadores --- */
      this.sliders = {};
      o.appendChild(this.makeSlider('ghostSpeedMult', 'VELOCIDAD FANTASMAS',
        0.5, 1.2, 0.05, function (v) { return '×' + v.toFixed(2); }));
      o.appendChild(this.makeSlider('pacSpeedMult', 'VELOCIDAD PAC-MAN',
        0.8, 1.3, 0.05, function (v) { return '×' + v.toFixed(2); }));
      o.appendChild(this.makeSlider('frightMult', 'DURACIÓN POWER PELLET',
        0, 2, 0.25, function (v) { return '×' + v.toFixed(2); }));
      o.appendChild(this.makeSlider('startLives', 'VIDAS',
        1, 5, 1, function (v) { return String(v); }));
      o.appendChild(this.makeSlider('startLevel', 'NIVEL INICIAL',
        1, 21, 1, function (v) { return String(v); }));

      var note = document.createElement('div');
      note.className = 'note';
      note.textContent = 'VELOCIDAD, VIDAS Y NIVEL SE APLICAN EN LA PRÓXIMA PARTIDA';
      o.appendChild(note);

      /* --- VIDAS EN 2 JUGADORES --- */
      o.appendChild(this.sectionTitle('VIDAS EN 2 JUGADORES'));
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
      o.appendChild(lmRow);
      var lmNote = document.createElement('div');
      lmNote.className = 'note';
      lmNote.textContent = 'COMPARTIDAS: UN FONDO COMÚN PARA EL EQUIPO · INDIVIDUALES: QUIEN LAS PIERDE, MIRA';
      o.appendChild(lmNote);

      /* --- NOMBRES --- */
      o.appendChild(this.sectionTitle('NOMBRES'));
      o.appendChild(this.makeNickRow('nick1', 'TU NOMBRE (J1 Y ONLINE)'));
      o.appendChild(this.makeNickRow('nick2', 'JUGADOR 2 (LOCAL)'));
      var nkNote = document.createElement('div');
      nkNote.className = 'note';
      nkNote.textContent = 'SE VEN EN EL MARCADOR, SOBRE CADA PAC-MAN Y EN LAS SALAS ONLINE';
      o.appendChild(nkNote);

      /* --- COLORES --- */
      this.colorRows = {};
      o.appendChild(this.sectionTitle('COLOR JUGADOR 1'));
      o.appendChild(this.makeColorRow('pacColor'));
      o.appendChild(this.sectionTitle('COLOR JUGADOR 2'));
      o.appendChild(this.makeColorRow('pac2Color'));

      /* --- SONIDO --- */
      o.appendChild(this.sectionTitle('SONIDO'));
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
      o.appendChild(sndRow);

      /* --- VOLVER --- */
      var back = this.makeButton('VOLVER', function () {
        self.showMenu();
      });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);

      this.refreshOptions();
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

    makeSlider: function (key, label, min, max, step, fmt) {
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
        window.PM.settings.difficultyPreset = 'custom';
        saveSettings();
        val.textContent = fmt(v);
        self.refreshPresetButtons();
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
      this.livesModeBtns.shared.classList.toggle('active', s.livesMode !== 'individual');
      this.livesModeBtns.individual.classList.toggle('active', s.livesMode === 'individual');
      this.soundBtns.si.classList.toggle('active', !s.muted);
      this.soundBtns.no.classList.toggle('active', !!s.muted);
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
      window.PM.Net.lockPeer(sid);
      window.PM.Net.send('cfg', {
        v: CFG.NET.PROTO,
        c: window.PM.settings.pacColor,
        n: window.PM.settings.nick1,
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
            n: window.PM.settings.nick1
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
      var colors, names, cfg = null;
      if (role === 'host') {
        colors = [window.PM.settings.pacColor, lb.peerColor || '#00ff00'];
        names = [me || 'J1', lb.peerName || 'J2'];
      } else {
        colors = [lb.hostColor || '#ffff00', window.PM.settings.pac2Color];
        names = [lb.hostName || 'J1', me || 'J2'];
        cfg = this.sanitizeNetCfg(lb.hostCfg);
      }
      window.PM.Game.newGame({
        players: 2, net: role, cfg: cfg, colors: colors, names: names
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
     * Controles en pantalla: barra de botones y cruceta(s)
     * ------------------------------------------------------ */
    /* Barra superior de la partida: RENDIRSE (siempre) y pausa (táctil) */
    buildGameButtons: function () {
      var self = this;
      var bar = document.createElement('div');
      bar.id = 'gameBtns';

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
    },

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

      p.style.display = 'flex';
      this.promptOpen = true;
      this.refreshControls();
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
      this.showPrompt({
        title: 'GAME OVER',
        color: '#ff0000',
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
    showMenu: function () {
      this.hidePrompt();
      this.refreshNicks();
      this.els.menu.style.display = 'flex';
      this.els.options.style.display = 'none';
      this.els.online.style.display = 'none';
      this.refreshControls();
    },
    showOptions: function () {
      this.hidePrompt();
      this.refreshOptions();
      this.els.menu.style.display = 'none';
      this.els.options.style.display = 'flex';
      this.els.online.style.display = 'none';
      this.refreshControls();
    },
    showOnline: function () {
      this.hidePrompt();
      this.els.menu.style.display = 'none';
      this.els.options.style.display = 'none';
      this.els.online.style.display = 'flex';
      this.showOnlineIdle();
      this.refreshControls();
    },
    hideAll: function () {
      this.hidePrompt();
      this.els.menu.style.display = 'none';
      this.els.options.style.display = 'none';
      this.els.online.style.display = 'none';
      this.refreshControls();   // se actualiza de nuevo al arrancar la partida
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
        /* con un diálogo abierto mandan sus atajos (REANUDAR, R, Q, ...) */
        if (self.promptOpen) {
          if (self.handlePromptKey(ev)) ev.preventDefault();
          return;
        }
        var canControl = (g.state === 'PLAYING' || g.state === 'READY');
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
          if (canControl) {
            g.requestPause();
            ev.preventDefault();
          } else if (ev.key === 'Escape') {
            if (self.els.options.style.display !== 'none') {
              self.showMenu();
            } else if (self.els.online.style.display !== 'none') {
              self.cancelLobby();
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
