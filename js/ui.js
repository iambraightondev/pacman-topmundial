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

  function sanitizeSetting(key, value, def) {
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
    lobby: null,        // { mode:'host'|'join', code, locked, peerColor, hostCfg, hostColor, timer }

    init: function () {
      this.els.menu = document.getElementById('menu');
      this.els.options = document.getElementById('options');
      this.els.online = document.getElementById('online');
      this.buildMenu();
      this.buildOptions();
      this.buildOnline();
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
      hint.textContent = 'J1: FLECHAS O WASD · P: PAUSA';
      m.appendChild(hint);

      var hint2 = document.createElement('div');
      hint2.className = 'hint';
      hint2.style.marginTop = '2px';
      hint2.textContent = 'DOS JUGADORES: J1 FLECHAS · J2 WASD · EQUIPO CONTRA LOS FANTASMAS';
      m.appendChild(hint2);
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
      window.PM.Net.lockPeer(sid);
      window.PM.Net.send('cfg', {
        v: CFG.NET.PROTO,
        c: window.PM.settings.pacColor,
        cfg: this.netCfgSubset()
      });
      this.setLobbyStatus('¡JUGADOR 2 CONECTADO! EMPEZANDO...');
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
          window.PM.Net.send('hello', { v: CFG.NET.PROTO, c: window.PM.settings.pac2Color });
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
        window.PM.Net.lockPeer(sid);
        this.setLobbyStatus('CONECTADO · EMPEZANDO...');
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
      var colors, cfg = null;
      if (role === 'host') {
        colors = [window.PM.settings.pacColor, lb.peerColor || '#00ff00'];
      } else {
        colors = [lb.hostColor || '#ffff00', window.PM.settings.pac2Color];
        cfg = this.sanitizeNetCfg(lb.hostCfg);
      }
      window.PM.Game.newGame({ players: 2, net: role, cfg: cfg, colors: colors });
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
     * Visibilidad de paneles
     * ------------------------------------------------------ */
    showMenu: function () {
      this.els.menu.style.display = 'flex';
      this.els.options.style.display = 'none';
      this.els.online.style.display = 'none';
    },
    showOptions: function () {
      this.refreshOptions();
      this.els.menu.style.display = 'none';
      this.els.options.style.display = 'flex';
      this.els.online.style.display = 'none';
    },
    showOnline: function () {
      this.els.menu.style.display = 'none';
      this.els.options.style.display = 'none';
      this.els.online.style.display = 'flex';
      this.showOnlineIdle();
    },
    hideAll: function () {
      this.els.menu.style.display = 'none';
      this.els.options.style.display = 'none';
      this.els.online.style.display = 'none';
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

    bindTouch: function () {
      var canvas = document.getElementById('game');
      var sx = 0, sy = 0, tracking = false;
      var self = this;
      canvas.addEventListener('touchstart', function (ev) {
        if (ev.touches.length !== 1) return;
        tracking = true;
        sx = ev.touches[0].clientX;
        sy = ev.touches[0].clientY;
        self.resumeAudio();
      }, { passive: true });
      canvas.addEventListener('touchmove', function (ev) {
        if (!tracking) return;
        var dx = ev.touches[0].clientX - sx;
        var dy = ev.touches[0].clientY - sy;
        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
        var g = window.PM.Game;
        if (g.state === 'PLAYING' || g.state === 'READY') {
          var d;
          if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? D.RIGHT : D.LEFT;
          else d = dy > 0 ? D.DOWN : D.UP;
          g.setPacDir(g.localIdx, d);   // táctil controla al jugador local (J1 en local)
        }
        sx = ev.touches[0].clientX;
        sy = ev.touches[0].clientY;
      }, { passive: true });
      canvas.addEventListener('touchend', function () { tracking = false; },
        { passive: true });
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
