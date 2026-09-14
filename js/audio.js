/* ==========================================================================
 * audio.js — window.AudioSys
 * All-synthesized Web Audio sound system (no external files, no network).
 * Evokes the 1980 arcade feel with ORIGINAL material (no transcription).
 * Safe to call every method before init(); everything is a silent no-op.
 * ========================================================================== */
(function () {
  'use strict';

  var ctx = null;          // AudioContext (lazy)
  var master = null;       // master gain (~0.25)
  var muted = false;
  var MASTER_LEVEL = 0.25;

  /* Buses por categoría: cada efecto se enchufa al suyo y el jugador
   * regula cada uno por separado (ver AudioSys.setVolume).
   *   music  — melodía de inicio
   *   sfx    — waka, comer fantasma/fruta, muerte, vida extra...
   *   loops  — sirena, modo azul, ojos volviendo (ambiente)
   *   voices — voces de racha (los únicos archivos de audio) */
  var buses = { music: null, sfx: null, loops: null, voices: null };
  var levels = { master: 1, music: 1, sfx: 1, loops: 0.8, voices: 1 };

  // ---- voces de racha (archivos, cargados una vez) ------------------------
  var voiceBufs = [];      // índice -> AudioBuffer
  var voiceTried = [];     // índice -> true si ya se intentó cargar
  var voiceNode = null;    // voz sonando (se corta al encadenar otra)

  // ---- logical loop state (survives priority suspensions) -----------------
  var sirenOn = false, sirenStage = 0;
  var frightOn = false;
  var retreatOn = false;
  var currentLoop = null;  // 'siren' | 'fright' | 'retreat' | null
  var loopNodes = [];      // live nodes of the currently audible loop

  var wakaFlip = false;
  var noiseBuf = null;

  // ---- tiny helpers -------------------------------------------------------
  function now() { return ctx.currentTime; }

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function getNoiseBuffer() {
    if (noiseBuf) return noiseBuf;
    var len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  /* Bus de salida de un efecto (por defecto, efectos) */
  function out(bus) { return buses[bus] || buses.sfx || master; }

  /* Multiplicador de volumen de un efecto: 1 si no se dice otra cosa. Lo usan
   * los poderes del modo DESATADO, que suenan enteros cuando son tuyos y muy
   * bajitos cuando son de otro (ver CFG.HAB.VOL_AJENO). Se acota a 0..1 para
   * que un valor raro no reviente el nivel general. */
  function escala(v) {
    var n = parseFloat(v);
    if (!isFinite(n)) return 1;
    return Math.max(0, Math.min(1, n));
  }

  // One enveloped oscillator note. Optional pitch glide f0 -> f1.
  // `bus` elige la categoría de volumen ('sfx' si no se indica).
  function blip(type, f0, f1, t0, dur, vol, attack, bus) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var a = (attack === undefined) ? 0.004 : attack;
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, f0), t0);
    if (f1 && f1 !== f0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + a);
    g.gain.setValueAtTime(vol, t0 + Math.max(a, dur - 0.015));
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(out(bus));
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    return osc;
  }

  // Short filtered white-noise burst (for the death sputter).
  function noiseBurst(t0, dur, vol, cutoff) {
    var src = ctx.createBufferSource();
    var g = ctx.createGain();
    var f = ctx.createBiquadFilter();
    src.buffer = getNoiseBuffer();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(out('sfx'));
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /* Ruido filtrado con cualquier filtro ('bandpass', 'highpass', 'lowpass'),
   * con barrido opcional de la frecuencia f0 -> f1. Es la base de casi todos
   * los wakas de skin: golpes, chasquidos y soplidos son ruido con forma. */
  function ruido(t0, dur, vol, tipo, f0, q, f1) {
    var src = ctx.createBufferSource();
    var g = ctx.createGain();
    var f = ctx.createBiquadFilter();
    src.buffer = getNoiseBuffer();
    f.type = tipo || 'bandpass';
    f.frequency.setValueAtTime(Math.max(20, f0), t0);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    if (q) f.Q.setValueAtTime(q, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(out('sfx'));
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /* Campanada corta: parciales que se apagan cada uno a su ritmo (metal) */
  function campana(t0, parciales, dur, vol) {
    for (var i = 0; i < parciales.length; i++) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(parciales[i], t0);
      var v = vol / (i + 1);
      var d = dur / (1 + i * 0.35);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(v, t0 + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g); g.connect(out('sfx'));
      o.start(t0);
      o.stop(t0 + d + 0.02);
    }
  }

  /* ---------- Wakas de skin ----------
   * Cada uno alterna entre dos golpes (`b`), como el "wa-ka" de siempre, para
   * que comer una fila de pastillas tenga ritmo y no suene a metralleta. */
  var WAKAS = {
    /* huesos chocando: dos chasquidos secos y huecos, de madera vieja */
    calavera: function (t, b) {
      ruido(t, 0.03, 0.55, 'bandpass', b ? 2300 : 1600, 9);
      blip('triangle', b ? 820 : 600, b ? 640 : 470, t, 0.028, 0.22, 0.001);
      ruido(t + 0.018, 0.02, 0.3, 'bandpass', b ? 3100 : 2200, 12);
    },
    /* metal chocando: un golpe grave con un anillo inarmónico encima */
    robot: function (t, b) {
      blip('square', b ? 190 : 150, b ? 160 : 125, t, 0.045, 0.14, 0.001);
      campana(t, b ? [1330, 2010, 3170] : [1090, 1720, 2690], 0.09, 0.14);
      ruido(t, 0.015, 0.25, 'highpass', 4500, 0.7);
    },
    /* oro: un "tin" limpio de metal fino */
    dorado: function (t, b) {
      campana(t, b ? [2093, 4710, 6280] : [1760, 3960, 5280], 0.1, 0.18);
    },
    /* monedas: dos tintineos muy juntos, en escalera */
    cofre: function (t, b) {
      campana(t, [b ? 2600 : 3500], 0.05, 0.16);
      campana(t + 0.022, [b ? 3500 : 2600, 5200], 0.06, 0.14);
      ruido(t, 0.012, 0.18, 'highpass', 6000, 0.7);
    },
    /* mordisco bajo el agua: un "glup" que cae y una burbuja que sube */
    tiburon: function (t, b) {
      blip('sine', b ? 280 : 220, b ? 95 : 80, t, 0.06, 0.5, 0.002);
      blip('sine', 520, 1150, t + 0.02, 0.03, 0.14, 0.002);
    },
    /* bufido grave de dragón */
    dragon: function (t, b) {
      /* bocanada profunda: un golpe de pecho muy grave, un cuerpo suave que
       * se oye también en altavoces pequeños y un soplo de brasas apagado.
       * Nada de sierra ni siseo agudo, que cansaban al comer seguido. */
      blip('sine', b ? 78 : 68, b ? 42 : 36, t, 0.11, 0.6, 0.004);
      blip('triangle', b ? 156 : 136, b ? 88 : 76, t, 0.08, 0.14, 0.006);
      ruido(t, 0.1, 0.22, 'lowpass', 220, 0.6, b ? 620 : 520);
    },
    /* chasquido jugoso de hojas que se cierran */
    planta: function (t, b) {
      ruido(t, 0.028, 0.4, 'bandpass', 1100, 2.5);
      blip('sine', b ? 640 : 540, b ? 180 : 150, t + 0.008, 0.045, 0.3, 0.002);
    },
    /* mandíbula enorme: un golpe grave que retumba */
    trex: function (t, b) {
      blip('sine', b ? 130 : 110, b ? 55 : 48, t, 0.08, 0.55, 0.002);
      ruido(t, 0.05, 0.28, 'lowpass', 600, 0.7);
    },
    /* "ñam": una vocal que se abre y se cierra */
    hamburguesa: function (t, b) {
      var o = ctx.createOscillator();
      var f = ctx.createBiquadFilter();
      var g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(b ? 190 : 165, t);
      f.type = 'bandpass';
      f.Q.setValueAtTime(4, t);
      f.frequency.setValueAtTime(b ? 650 : 1250, t);
      f.frequency.exponentialRampToValueAtTime(b ? 1250 : 650, t + 0.07);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      o.connect(f); f.connect(g); g.connect(out('sfx'));
      o.start(t);
      o.stop(t + 0.1);
    },
    /* platillo: un "uiu" de ciencia ficción con temblor */
    ovni: function (t, b) {
      var o = ctx.createOscillator();
      var lfo = ctx.createOscillator();
      var lg = ctx.createGain();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(b ? 700 : 1300, t);
      o.frequency.exponentialRampToValueAtTime(b ? 1300 : 700, t + 0.07);
      lfo.frequency.setValueAtTime(38, t);
      lg.gain.setValueAtTime(60, t);
      lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      o.connect(g); g.connect(out('sfx'));
      o.start(t); lfo.start(t);
      o.stop(t + 0.1); lfo.stop(t + 0.1);
    },
    /* un maullido diminuto */
    gato: function (t, b) {
      blip('triangle', b ? 950 : 1150, b ? 1350 : 780, t, 0.055, 0.24, 0.006);
    },
    /* chillido de murciélago sobre un golpe oscuro */
    vampiro: function (t, b) {
      blip('sine', b ? 3000 : 3700, b ? 3800 : 2900, t, 0.025, 0.1, 0.002);
      blip('triangle', b ? 180 : 150, b ? 120 : 100, t + 0.01, 0.05, 0.22, 0.003);
    }
  };

  // ==========================================================================
  // Looping layer (siren / fright / retreat). Only ONE audible at a time.
  // Priority: retreat > fright > siren.
  // ==========================================================================
  function killLoopNodes() {
    for (var i = 0; i < loopNodes.length; i++) {
      var n = loopNodes[i];
      try { if (n.stop) n.stop(); } catch (e) {}
      try { n.disconnect(); } catch (e2) {}
    }
    loopNodes = [];
    currentLoop = null;
  }

  // Generic drone: carrier oscillator whose pitch is swept by an LFO.
  function startDrone(carrierType, baseFreq, lfoType, lfoRate, lfoDepth, vol, filterFreq) {
    var carrier = ctx.createOscillator();
    var cg = ctx.createGain();
    var lfo = ctx.createOscillator();
    var lg = ctx.createGain();
    var filt = ctx.createBiquadFilter();

    carrier.type = carrierType;
    carrier.frequency.setValueAtTime(baseFreq, now());
    lfo.type = lfoType;
    lfo.frequency.setValueAtTime(lfoRate, now());
    lg.gain.setValueAtTime(lfoDepth, now());
    lfo.connect(lg);
    lg.connect(carrier.frequency);

    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(filterFreq, now());

    cg.gain.setValueAtTime(0.0001, now());
    cg.gain.linearRampToValueAtTime(vol, now() + 0.03);

    carrier.connect(filt); filt.connect(cg); cg.connect(out('loops'));
    carrier.start();
    lfo.start();
    loopNodes.push(carrier, lfo, cg, lg, filt);
  }

  function startLoopFor(kind) {
    if (kind === 'retreat') {
      // Hurried high bleeps: sawtooth LFO makes repeating upward swoops.
      startDrone('square', 1050, 'sawtooth', 3.6, 320, 0.16, 4000);
    } else if (kind === 'fright') {
      // Fast low warble: quick triangle LFO wobbling a buzzy carrier.
      startDrone('sawtooth', 165, 'triangle', 9, 95, 0.30, 900);
    } else if (kind === 'siren') {
      // Pitch-sweep drone; base pitch and sweep speed rise with stage 0..4.
      var s = Math.max(0, Math.min(4, sirenStage | 0));
      startDrone('triangle', 310 + s * 105, 'triangle', 1.15 + s * 0.3,
                 125 + s * 12, 0.34, 2200);
    }
    currentLoop = kind;
  }

  function updateLoops() {
    if (!ctx) return;
    var want = retreatOn ? 'retreat' : (frightOn ? 'fright' : (sirenOn ? 'siren' : null));
    if (want === currentLoop && want !== 'siren') return;
    // siren restarts on stage change too (cheap and glitch-free)
    killLoopNodes();
    if (want) startLoopFor(want);
  }

  // ==========================================================================
  // Voces de racha: se cargan de audio/*.m4a y suenan por el bus 'voices'.
  // Todo falla en silencio (sin red, sin permiso de fetch con file://, o
  // formato no soportado): el juego sigue sonando igual.
  // ==========================================================================
  function voiceList() {
    return (window.PM && window.PM.CFG && window.PM.CFG.VOICES) || [];
  }

  function loadVoice(i) {
    if (!ctx || voiceBufs[i] || voiceTried[i]) return;
    var url = voiceList()[i];
    if (!url || !window.fetch) return;
    voiceTried[i] = true;
    fetch(url)
      .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
      .then(function (ab) {
        if (!ab) return;
        // decodeAudioData con callbacks: compatible con navegadores antiguos
        ctx.decodeAudioData(ab, function (buf) { voiceBufs[i] = buf; },
          function () { /* formato no soportado */ });
      })
      .catch(function () { /* sin acceso al archivo */ });
  }

  function applyLevels() {
    if (!ctx) return;
    var m = muted ? 0 : MASTER_LEVEL * levels.master;
    try {
      master.gain.cancelScheduledValues(now());
      master.gain.setValueAtTime(m, now());
      for (var k in buses) {
        if (buses.hasOwnProperty(k) && buses[k]) {
          buses[k].gain.cancelScheduledValues(now());
          buses[k].gain.setValueAtTime(levels[k], now());
        }
      }
    } catch (e) { /* contexto cerrado */ }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================
  var AudioSys = {

    init: function () {
      if (ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.connect(ctx.destination);
        for (var k in buses) {
          if (!buses.hasOwnProperty(k)) continue;
          buses[k] = ctx.createGain();
          buses[k].connect(master);
        }
        applyLevels();
      } catch (e) { ctx = null; master = null; }
      this.preloadVoices();
    },

    resume: function () {
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        try { ctx.resume().catch(function () {}); } catch (e) {}
      }
      this.preloadVoices();
    },

    preloadVoices: function () {
      if (!ctx) return;
      var n = voiceList().length;
      for (var i = 0; i < n; i++) loadVoice(i);
    },

    setMuted: function (b) {
      muted = !!b;
      applyLevels();
    },

    /* cat: 'master' | 'music' | 'sfx' | 'loops' | 'voices'; v en 0..1 */
    setVolume: function (cat, v) {
      if (!levels.hasOwnProperty(cat)) return;
      v = parseFloat(v);
      if (isNaN(v)) return;
      levels[cat] = Math.max(0, Math.min(1, v));
      applyLevels();
    },

    getVolume: function (cat) {
      return levels.hasOwnProperty(cat) ? levels[cat] : 1;
    },

    /* Voz de racha i (0..3). Corta la anterior para que no se solapen. */
    playVoice: function (i) {
      if (!ctx) return false;
      i = i | 0;
      var buf = voiceBufs[i];
      if (!buf) { loadVoice(i); return false; }
      try {
        if (voiceNode) { try { voiceNode.stop(); } catch (e) {} voiceNode = null; }
        var src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(out('voices'));
        src.onended = function () { if (voiceNode === src) voiceNode = null; };
        src.start(now());
        voiceNode = src;
        return true;
      } catch (e2) { return false; }
    },

    /* ¿hay alguna voz cargada? (para avisar en las opciones) */
    voicesReady: function () {
      for (var i = 0; i < voiceBufs.length; i++) if (voiceBufs[i]) return true;
      return false;
    },

    // ---- intro jingle (~4200 ms). Original two-voice square melody. -------
    playIntro: function () {
      var DUR = 4200;
      if (!ctx) return DUR;
      var U = 0.13125;             // one melodic unit; 32 units = 4.2 s
      var t = now() + 0.05;

      // Lead voice: perky octave-leap figure stated on C, restated on D,
      // back to C, then a chromatic climb to a held top note.
      var lead = [
        [72, 1], [84, 1], [79, 1], [76, 1], [84, 0.5], [79, 1.5], [76, 2],
        [74, 1], [86, 1], [81, 1], [78, 1], [86, 0.5], [81, 1.5], [78, 2],
        [72, 1], [84, 1], [79, 1], [76, 1], [84, 0.5], [79, 1.5], [76, 2],
        [76, 0.5], [77, 0.5], [78, 0.5], [79, 0.5],
        [80, 0.5], [81, 0.5], [82, 0.5], [83, 0.5], [84, 4]
      ];
      // Bass voice: bouncing octaves, then a short walk-up to the cadence.
      var bass = [
        [48, 2], [60, 2], [48, 2], [60, 2],
        [50, 2], [62, 2], [50, 2], [62, 2],
        [48, 2], [60, 2], [48, 2], [60, 2],
        [52, 1], [53, 1], [55, 2], [48, 4]
      ];

      function playPart(seq, vol) {
        var tt = t;
        for (var i = 0; i < seq.length; i++) {
          var d = seq[i][1] * U;
          blip('square', mtof(seq[i][0]), 0, tt, d * 0.88, vol, undefined, 'music');
          tt += d;
        }
      }
      playPart(lead, 0.30);
      playPart(bass, 0.20);
      return DUR;
    },

    // ---- per-dot chomp: alternating down/up chirps ("wa" / "ka") ----------
    /* `skin` (opcional): las skins EXTRAVAGANTES (y DORADO) tienen su propio
     * waka, que alterna igual entre dos golpes. Todos duran menos de ~80 ms:
     * suenan en cada pastilla, varias veces por segundo, encima de la
     * sirena. Las demás skins suenan con el de siempre. */
    playWaka: function (skin) {
      if (!ctx) return;
      var t = now();
      wakaFlip = !wakaFlip;
      var propio = skin && WAKAS.hasOwnProperty(skin) ? WAKAS[skin] : null;
      if (propio) { propio(t, wakaFlip); return; }
      if (wakaFlip) blip('square', 520, 190, t, 0.065, 0.45);
      else          blip('square', 190, 520, t, 0.065, 0.45);
    },

    /* ¿esta skin tiene waka propio? (la vitrina pone ESCUCHAR solo en esas) */
    tieneWaka: function (skin) { return !!(skin && WAKAS.hasOwnProperty(skin)); },

    // ---- loops ------------------------------------------------------------
    startSiren: function (stage) {
      sirenOn = true;
      sirenStage = Math.max(0, Math.min(4, stage | 0));
      updateLoops();
    },
    stopSiren:    function () { sirenOn = false;   updateLoops(); },
    startFright:  function () { frightOn = true;   updateLoops(); },
    stopFright:   function () { frightOn = false;  updateLoops(); },
    startRetreat: function () { retreatOn = true;  updateLoops(); },
    stopRetreat:  function () { retreatOn = false; updateLoops(); },

    // ---- one-shots --------------------------------------------------------
    playEatGhost: function () {
      if (!ctx) return;
      // Rising two-part "whoop": buzzy sweep with a bright square on top.
      var t = now();
      blip('sawtooth', 170, 950, t, 0.42, 0.40, 0.01);
      blip('square',   340, 1900, t + 0.04, 0.34, 0.18, 0.01);
    },

    playEatFruit: function () {
      if (!ctx) return;
      // Quick dip-then-pop flourish.
      var t = now();
      blip('square', 900, 320, t, 0.09, 0.40);
      blip('square', 320, 1050, t + 0.10, 0.10, 0.40);
    },

    playDeath: function () {
      if (!ctx) return;
      var t = now() + 0.02;
      // ~1.1 s wobbling descending sweep...
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      var vib = ctx.createOscillator();
      var vg = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(680, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 1.1);
      vib.type = 'sine';
      vib.frequency.setValueAtTime(11, t);
      vg.gain.setValueAtTime(28, t);
      vg.gain.linearRampToValueAtTime(70, t + 1.1);
      vib.connect(vg); vg.connect(osc.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.38, t + 0.03);
      g.gain.setValueAtTime(0.38, t + 0.9);
      g.gain.linearRampToValueAtTime(0.0001, t + 1.12);
      osc.connect(g); g.connect(out('sfx'));
      osc.start(t); osc.stop(t + 1.15);
      vib.start(t); vib.stop(t + 1.15);
      // ...then two little sputters (noise pop + upward blurt) ≈ 1.5 s total.
      noiseBurst(t + 1.16, 0.10, 0.30, 900);
      blip('square', 90, 340, t + 1.16, 0.10, 0.30);
      noiseBurst(t + 1.32, 0.12, 0.30, 900);
      blip('square', 90, 340, t + 1.32, 0.12, 0.30);
    },

    playExtraLife: function () {
      if (!ctx) return;
      // Rapid celebratory high bleeps alternating between two pitches.
      var t = now();
      for (var i = 0; i < 8; i++) {
        blip('square', (i % 2 === 0) ? 1568 : 2093, 0, t + i * 0.095, 0.06, 0.28);
      }
    },

    /* ---- modo DESATADO: un sonido por poder --------------------------------
     * Los cuatro poderes eran MUDOS salvo por lo que arrastraban de rebote (la
     * Q sonaba porque se comía un fantasma, la R porque empezaba el modo azul),
     * y justo los dos que no tocan el marcador —turbo y flash— no sonaban nada.
     * Una tecla con recarga que no suena se siente como una tecla rota.
     *
     * Cada uno tiene su propia forma para que se distingan sin mirar la barra,
     * y todos son CORTOS: se usan en plena partida, encima de la sirena, y un
     * sonido largo se comería el waka. Van por el bus de efectos.
     *
     * TODOS llevan un `esc` opcional (1 por defecto) que multiplica el
     * volumen. Suenan los poderes de TODO EL MUNDO, no solo los tuyos —saber
     * que a alguien le queda una habilidad menos es información de la partida—
     * pero los de los demás entran al 10% (`CFG.HAB.VOL_AJENO`): se oyen de
     * fondo y no se pelean con el waka ni con lo que estés haciendo tú.
     * ---------------------------------------------------------------------- */

    /* Q · MORDISCO acertado: dos dentelladas secas y muy juntas. Suena ANTES
     * del "me he comido un fantasma", que llega por su lado; en el invitado,
     * que no mata (lo hace el anfitrión), esto es lo único que confirma la
     * tecla hasta que vuelve la confirmación. */
    playBite: function (esc) {
      if (!ctx) return;
      var k = escala(esc), t = now();
      blip('square', 640, 150, t, 0.055, 0.42 * k, 0.002);
      blip('square', 520, 120, t + 0.06, 0.07, 0.38 * k, 0.002);
      noiseBurst(t, 0.05, 0.22 * k, 1600);
    },

    /* Q al aire: el mismo golpe, sordo y sin la segunda dentellada. Fallar la
     * puntería y tener la tecla en recarga tienen que sonar distinto, o la Q
     * parece rota cuando lo único que pasó es que no había nadie a tiro. */
    playBiteMiss: function (esc) {
      if (!ctx) return;
      var k = escala(esc), t = now();
      blip('triangle', 260, 110, t, 0.07, 0.20 * k, 0.002);
      noiseBurst(t, 0.05, 0.10 * k, 500);
    },

    /* W · TURBO: barrido ascendente con aire. Es el arranque, no los 5 s: el
     * turbo ya se ve en la barra encendida y en las chispas. */
    playTurbo: function (esc) {
      if (!ctx) return;
      var k = escala(esc), t = now();
      blip('sawtooth', 180, 760, t, 0.30, 0.26 * k, 0.02);
      blip('square', 360, 1520, t + 0.03, 0.24, 0.12 * k, 0.02);
      noiseBurst(t + 0.02, 0.22, 0.13 * k, 2600);
    },

    /* E · FLASH: chispazo muy corto y muy brillante, arriba y abajo en un
     * suspiro. Es un salto, y un salto no puede sonar a rampa. */
    playFlash: function (esc) {
      if (!ctx) return;
      var k = escala(esc), t = now();
      blip('square', 1750, 320, t, 0.075, 0.30 * k, 0.002);
      blip('square', 420, 2400, t + 0.055, 0.06, 0.22 * k, 0.002);
    },

    /* R · GRITO: rugido descendente con vibrato. Es el más largo de los cuatro
     * porque es el que cambia el tablero entero. */
    playShout: function (esc) {
      if (!ctx) return;
      var k = escala(esc);
      var t = now() + 0.01;
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      var vib = ctx.createOscillator();
      var vg = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.55);
      vib.type = 'sine';
      vib.frequency.setValueAtTime(17, t);
      vg.gain.setValueAtTime(22, t);
      vg.gain.linearRampToValueAtTime(60, t + 0.55);
      vib.connect(vg); vg.connect(osc.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.34 * k, t + 0.03);
      g.gain.setValueAtTime(0.34 * k, t + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(g); g.connect(out('sfx'));
      osc.start(t); osc.stop(t + 0.63);
      vib.start(t); vib.stop(t + 0.63);
      noiseBurst(t, 0.18, 0.16 * k, 700);
    },

    /* ---- PAC-MAN VS. con poderes: los dos del fantasma ---------------------
     * Suenan más graves que los de Pac-Man a propósito: en una partida donde
     * los dos bandos tienen teclas, la altura es lo único que dice de qué lado
     * vino el sonido sin apartar la vista del laberinto. */

    /* EMBESTIDA: gruñido que sube, como un motor que arranca. */
    playCharge: function (esc) {
      if (!ctx) return;
      var k = escala(esc), t = now();
      blip('sawtooth', 90, 300, t, 0.32, 0.30 * k, 0.02);
      blip('square', 45, 150, t, 0.34, 0.16 * k, 0.02);
      noiseBurst(t + 0.04, 0.20, 0.12 * k, 900);
    },

    /* ACECHO: se apaga hacia abajo, como algo que se va. */
    playStealth: function (esc) {
      if (!ctx) return;
      var k = escala(esc), t = now();
      blip('triangle', 620, 140, t, 0.34, 0.26 * k, 0.02);
      blip('sine', 310, 70, t + 0.05, 0.30, 0.18 * k, 0.02);
    },

    /* ---- CACERÍA: el poder de Pac-Man llega solo (js/caceria.js) ----
     * Un pitido por segundo de aviso, cada vez más agudo: es la cuenta atrás
     * para soltar la presa y apartarse. `seg` son los segundos que quedan. */
    playPowerWarn: function (seg) {
      if (!ctx) return;
      var t = now(), n = Math.max(1, seg | 0);
      var f = 660 + (4 - Math.min(n, 4)) * 110;
      blip('square', f, f, t, 0.08, 0.16, 0.005);
    },

    /* Y el golpe de cuando llega: un barrido hacia arriba, corto y claro. */
    playPowerOn: function () {
      if (!ctx) return;
      var t = now();
      blip('square', 220, 880, t, 0.22, 0.22, 0.01);
      blip('triangle', 440, 1320, t + 0.04, 0.20, 0.14, 0.01);
    }
  };

  window.AudioSys = AudioSys;
})();
