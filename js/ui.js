/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/ui.js
 * Menús, panel de opciones, selector de color y entrada.
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

  function sanitizeSetting(key, value, def) {
    if (NUM_RANGES.hasOwnProperty(key)) {
      var r = NUM_RANGES[key];
      var n = r.int ? parseInt(value, 10) : parseFloat(value);
      if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return def;
      if (n < r.min) n = r.min;
      if (n > r.max) n = r.max;
      return n;
    }
    if (key === 'pacColor') {
      return (/^#[0-9a-f]{6}$/i).test(String(value)) ? String(value) : def;
    }
    if (key === 'muted') return !!value;
    if (key === 'difficultyPreset') {
      return PRESET_NAMES.indexOf(value) !== -1 ? value : def;
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

  var UI = {
    els: {},
    audioResumed: false,

    init: function () {
      this.els.menu = document.getElementById('menu');
      this.els.options = document.getElementById('options');
      this.buildMenu();
      this.buildOptions();
      this.bindKeyboard();
      this.bindTouch();
      this.applyMute();
      this.fitCanvas();
      var self = this;
      window.addEventListener('resize', function () { self.fitCanvas(); });
      this.showMenu();
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

      var play = this.makeButton('JUGAR', function () {
        self.resumeAudio();
        self.hideAll();
        window.PM.Game.newGame();
      });
      play.classList.add('btn-primary');
      m.appendChild(play);

      m.appendChild(this.makeButton('OPCIONES', function () {
        self.resumeAudio();
        self.showOptions();
      }));

      var hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = 'FLECHAS O WASD PARA MOVERTE · P PARA PAUSA';
      m.appendChild(hint);
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

      /* --- COLOR DE PAC-MAN --- */
      o.appendChild(this.sectionTitle('COLOR DE PAC-MAN'));
      var swRow = document.createElement('div');
      swRow.className = 'swatches';
      this.swatchEls = [];
      CFG.PAC_SWATCHES.forEach(function (hex) {
        var s = document.createElement('button');
        s.type = 'button';
        s.className = 'swatch';
        s.style.background = hex;
        s.setAttribute('data-color', hex);
        s.setAttribute('aria-label', 'Color ' + hex);
        s.addEventListener('click', function () {
          self.setColor(hex);
        });
        self.swatchEls.push(s);
        swRow.appendChild(s);
      });
      this.colorInput = document.createElement('input');
      this.colorInput.type = 'color';
      this.colorInput.className = 'color-input';
      this.colorInput.addEventListener('input', function () {
        self.setColor(self.colorInput.value);
      });
      swRow.appendChild(this.colorInput);
      o.appendChild(swRow);

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

    setColor: function (hex) {
      window.PM.settings.pacColor = hex;   // se aplica en vivo (game lee cada frame)
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
      this.refreshPresetButtons();
      for (var k in this.sliders) {
        if (!this.sliders.hasOwnProperty(k)) continue;
        var sl = this.sliders[k];
        sl.input.value = String(s[k]);
        sl.val.textContent = sl.fmt(parseFloat(s[k]));
      }
      for (var i = 0; i < this.swatchEls.length; i++) {
        var el = this.swatchEls[i];
        el.classList.toggle('active',
          el.getAttribute('data-color').toLowerCase() === String(s.pacColor).toLowerCase());
      }
      try { this.colorInput.value = s.pacColor; } catch (e) { /* color inválido */ }
      this.soundBtns.si.classList.toggle('active', !s.muted);
      this.soundBtns.no.classList.toggle('active', !!s.muted);
    },

    /* ------------------------------------------------------
     * Visibilidad de paneles
     * ------------------------------------------------------ */
    showMenu: function () {
      this.els.menu.style.display = 'flex';
      this.els.options.style.display = 'none';
    },
    showOptions: function () {
      this.refreshOptions();
      this.els.menu.style.display = 'none';
      this.els.options.style.display = 'flex';
    },
    hideAll: function () {
      this.els.menu.style.display = 'none';
      this.els.options.style.display = 'none';
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
     * ------------------------------------------------------ */
    bindKeyboard: function () {
      var self = this;
      var KEYMAP = {
        'ArrowUp': D.UP, 'ArrowLeft': D.LEFT, 'ArrowDown': D.DOWN, 'ArrowRight': D.RIGHT,
        'w': D.UP, 'a': D.LEFT, 's': D.DOWN, 'd': D.RIGHT,
        'W': D.UP, 'A': D.LEFT, 'S': D.DOWN, 'D': D.RIGHT
      };
      document.addEventListener('keydown', function (ev) {
        var g = window.PM.Game;
        if (ev.key in KEYMAP) {
          if (g.state === 'PLAYING' || g.state === 'READY') {
            self.resumeAudio();
            g.setPacDir(KEYMAP[ev.key]);
            ev.preventDefault();
          }
          return;
        }
        if (ev.key === 'p' || ev.key === 'P' || ev.key === 'Escape') {
          if (g.state === 'PLAYING' || g.state === 'READY') {
            g.togglePause();
            ev.preventDefault();
          } else if (ev.key === 'Escape' &&
                     self.els.options.style.display !== 'none') {
            self.showMenu();
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
          if (Math.abs(dx) > Math.abs(dy)) {
            g.setPacDir(dx > 0 ? D.RIGHT : D.LEFT);
          } else {
            g.setPacDir(dy > 0 ? D.DOWN : D.UP);
          }
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
