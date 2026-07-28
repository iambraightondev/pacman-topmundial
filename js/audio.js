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

  // One enveloped oscillator note. Optional pitch glide f0 -> f1.
  function blip(type, f0, f1, t0, dur, vol, attack) {
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
    g.connect(master);
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
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

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

    carrier.connect(filt); filt.connect(cg); cg.connect(master);
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
        master.gain.setValueAtTime(muted ? 0 : MASTER_LEVEL, ctx.currentTime);
        master.connect(ctx.destination);
      } catch (e) { ctx = null; master = null; }
    },

    resume: function () {
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        try { ctx.resume().catch(function () {}); } catch (e) {}
      }
    },

    setMuted: function (b) {
      muted = !!b;
      if (!ctx) return;
      try {
        master.gain.cancelScheduledValues(now());
        master.gain.setValueAtTime(muted ? 0 : MASTER_LEVEL, now());
      } catch (e) {}
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

      function playVoice(seq, vol) {
        var tt = t;
        for (var i = 0; i < seq.length; i++) {
          var d = seq[i][1] * U;
          blip('square', mtof(seq[i][0]), 0, tt, d * 0.88, vol);
          tt += d;
        }
      }
      playVoice(lead, 0.30);
      playVoice(bass, 0.20);
      return DUR;
    },

    // ---- per-dot chomp: alternating down/up chirps ("wa" / "ka") ----------
    playWaka: function () {
      if (!ctx) return;
      var t = now();
      wakaFlip = !wakaFlip;
      if (wakaFlip) blip('square', 520, 190, t, 0.065, 0.45);
      else          blip('square', 190, 520, t, 0.065, 0.45);
    },

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
      osc.connect(g); g.connect(master);
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
    }
  };

  window.AudioSys = AudioSys;
})();
