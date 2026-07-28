/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/sprites.js
 * Dibujo procedural de sprites (sin recursos externos).
 * Define window.PM.Sprites
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var Sprites = {};

  /* Ángulo central de cada dirección (radianes) */
  var DIR_ANGLE = [
    -Math.PI / 2,  // UP
    Math.PI,       // LEFT
    Math.PI / 2,   // DOWN
    0              // RIGHT
  ];

  /* ------------------------------------------------------------
   * Pac-Man: arco relleno con 3 fases de boca
   * mouthPhase: 0 cerrada, 1 media (40°), 2 abierta (80°)
   * ------------------------------------------------------------ */
  Sprites.drawPacman = function (ctx, x, y, dir, mouthPhase, color) {
    var r = 6.5;
    var half = [0, (40 * Math.PI / 180) / 2, (80 * Math.PI / 180) / 2][mouthPhase] || 0;
    var a = DIR_ANGLE[dir >= 0 ? dir : 3];
    ctx.fillStyle = color;
    ctx.beginPath();
    if (half <= 0) {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    } else {
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, a + half, a - half + Math.PI * 2);
      ctx.closePath();
    }
    ctx.fill();
  };

  /* Animación de muerte: la boca se abre más allá de 180° hasta desaparecer.
   * t en [0,1]. */
  Sprites.drawPacmanDeath = function (ctx, x, y, t, color) {
    var r = 6.5;
    if (t >= 1) return;
    // la apertura crece de 80° a 360° (mirando hacia arriba)
    var open = (80 + 280 * t) * Math.PI / 180;
    var half = open / 2;
    var a = -Math.PI / 2; // hacia arriba, como el arcade
    if (open >= Math.PI * 2 - 0.05) {
      // resto: chispa final
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var ang = i * Math.PI / 4;
        ctx.moveTo(x + Math.cos(ang) * 2, y + Math.sin(ang) * 2);
        ctx.lineTo(x + Math.cos(ang) * 5, y + Math.sin(ang) * 5);
      }
      ctx.stroke();
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, a + half, a - half + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  };

  /* ------------------------------------------------------------
   * Fantasma: cúpula + falda ondulada de 3 picos, ojos con pupilas
   * mode: 'normal' | 'fright' | 'eyes'
   * animPhase: 0|1 (falda), flashOn: true => cuerpo blanco
   * ------------------------------------------------------------ */
  Sprites.drawGhost = function (ctx, x, y, dir, ghostId, mode, animPhase, flashOn) {
    var r = 6.5;
    var top = y - r + 1;
    var left = x - r;
    var w = r * 2;
    var bottom = y + r - 1;
    var body, face;

    if (mode === 'fright') {
      body = flashOn ? CFG.COLORS.flashBody : CFG.COLORS.frightBody;
      face = flashOn ? CFG.COLORS.flashFace : CFG.COLORS.frightFace;
    } else {
      body = CFG.GHOSTS[ghostId].color;
    }

    if (mode !== 'eyes') {
      ctx.fillStyle = body;
      ctx.beginPath();
      // cúpula
      ctx.moveTo(left, bottom);
      ctx.lineTo(left, y);
      ctx.arc(x, y, r, Math.PI, 0, false);
      ctx.lineTo(left + w, bottom);
      // falda: 3 picos, 2 fotogramas alternos
      var n = 3;
      var seg = w / n;
      var i, px;
      if (animPhase === 0) {
        for (i = n - 1; i >= 0; i--) {
          px = left + i * seg;
          ctx.lineTo(px + seg / 2, bottom - 3);
          ctx.lineTo(px, bottom);
        }
      } else {
        ctx.lineTo(left + w, bottom - 3);
        for (i = n - 1; i >= 0; i--) {
          px = left + i * seg;
          ctx.lineTo(px + seg * 0.66, bottom);
          ctx.lineTo(px + seg * 0.33, bottom - 3);
        }
        ctx.lineTo(left, bottom);
      }
      ctx.closePath();
      ctx.fill();
    }

    if (mode === 'fright') {
      // cara asustada: ojos de punto + boca en zigzag
      ctx.fillStyle = face;
      ctx.fillRect(x - 4, y - 2, 2, 2);
      ctx.fillRect(x + 2, y - 2, 2, 2);
      ctx.strokeStyle = face;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 4);
      for (var k = 0; k < 5; k++) {
        ctx.lineTo(x - 5 + (k * 2.5) + 1.25, y + 3 + ((k % 2) ? 0 : 2) - 1);
      }
      ctx.stroke();
      return;
    }

    // Ojos (normal y modo ojos): esclerótica + pupila hacia dir
    var v = CFG.DIR_V[dir >= 0 ? dir : 1];
    var exOff = v.x * 1.5, eyOff = v.y * 1.5;
    var eyeY = y - 2 + (v.y < 0 ? -1 : 0);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - 3 + exOff * 0.5, eyeY, 2.2, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 3 + exOff * 0.5, eyeY, 2.2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2121ff';
    ctx.beginPath();
    ctx.arc(x - 3 + exOff, eyeY + eyOff, 1.2, 0, Math.PI * 2);
    ctx.arc(x + 3 + exOff, eyeY + eyOff, 1.2, 0, Math.PI * 2);
    ctx.fill();
  };

  /* ------------------------------------------------------------
   * Frutas: arte de matriz de píxeles ~14×14 (original)
   * Leyenda por fruta: cada letra un color; '.' transparente
   * ------------------------------------------------------------ */
  var FRUIT_PAL = {
    r: '#ff0000', R: '#d40000', g: '#00aa00', G: '#007700',
    y: '#ffff00', o: '#ff8c00', w: '#ffffff', t: '#deaa50',
    p: '#ffb8ae', P: '#ff9080', b: '#2121ff', c: '#00ffff',
    m: '#b19cd9', k: '#00b0b0', s: '#f0f0f0'
  };

  var FRUITS = [
    /* 0 cereza */
    [
      '..........gg..',
      '.........gg...',
      '.......gg.....',
      '...G.gg.......',
      '...Gg.........',
      '..G.G.........',
      '.rrrG....rr...',
      'rrrrr...rrrr..',
      'rrrrr..rrrrrr.',
      'rwrrr..rrrrrr.',
      'rrrrr..rwrrrr.',
      '.rrr...rrrrrr.',
      '........rrrr..',
      '..............'
    ],
    /* 1 fresa */
    [
      '......gg......',
      '....gggggg....',
      '..rrrgggrrr...',
      '.rrrrrgrrrrr..',
      '.rrwrrrrrwrr..',
      '.rrrrrwrrrrr..',
      '.rwrrrrrrwrr..',
      '.rrrrwrrrrrr..',
      '..rrrrrrwrr...',
      '..rwrrrrrrr...',
      '...rrrwrrr....',
      '....rrrrr.....',
      '.....rrr......',
      '......r.......'
    ],
    /* 2 melocotón */
    [
      '.........gg...',
      '.......ggg....',
      '......gg......',
      '...oooGoooo...',
      '..oooooooooo..',
      '.oooooooooooo.',
      '.oopoooooooog.',
      '.opooooooooo..',
      '.oooooooooooo.',
      '.oooooooooooo.',
      '..oooooooooo..',
      '...oooooooo...',
      '....oooooo....',
      '..............'
    ],
    /* 3 manzana */
    [
      '.......G......',
      '......G.......',
      '.....GG.......',
      '..rrrGrrrr....',
      '.rrrrrrrrrr...',
      'rrrrrrrrrrrr..',
      'rrwrrrrrrrrr..',
      'rwrrrrrrrrrr..',
      'rrrrrrrrrrrr..',
      'rrrrrrrrrrrr..',
      '.rrrrrrrrrr...',
      '.rrrr..rrrr...',
      '..rr....rr....',
      '..............'
    ],
    /* 4 uvas */
    [
      '......GG......',
      '....GGGGGG....',
      '...G..GG......',
      '.....mmmm.....',
      '....mmmmmm....',
      '...mmwmmmmm...',
      '..mmmmmmmmmm..',
      '..mwmmmmwmmm..',
      '..mmmmmmmmmm..',
      '...mmwmmmmm...',
      '....mmmmmm....',
      '.....mmmm.....',
      '......mm......',
      '..............'
    ],
    /* 5 galaxian (insignia) */
    [
      '..............',
      'yyy.........y.',
      '.yyyy....yyyy.',
      '..yyyyyyyyy...',
      '...ryyyyyr....',
      '...rryyyrr....',
      '....rryrr.....',
      '.....rrr......',
      '..b...r...b...',
      '..bb..r..bb...',
      '...bb.r.bb....',
      '....bbrbb.....',
      '.....brb......',
      '......b.......'
    ],
    /* 6 campana */
    [
      '......yy......',
      '.....yyyy.....',
      '....yyyyyy....',
      '...yyyyyyyy...',
      '...yywyyyyy...',
      '..yywyyyyyyy..',
      '..yyyyyyyyyy..',
      '..yyyyyyyyyy..',
      '.yyyyyyyyyyyy.',
      '.yyyyyyyyyyyy.',
      'yyyyyyyyyyyyyy',
      'ssssssssssssss',
      '.....sscc.....',
      '..............'
    ],
    /* 7 llave */
    [
      '.....ccc......',
      '....cc.cc.....',
      '....cc.cc.....',
      '.....ccc......',
      '......s.......',
      '......s.......',
      '......ss......',
      '......s.......',
      '......ss......',
      '......s.......',
      '......ss......',
      '......ss......',
      '..............',
      '..............'
    ]
  ];

  /* Dibuja fruta con centro en (x, y) */
  Sprites.drawFruit = function (ctx, x, y, fruitId) {
    var art = FRUITS[fruitId];
    if (!art) return;
    var ox = Math.round(x - 7), oy = Math.round(y - 7);
    for (var r = 0; r < art.length; r++) {
      var line = art[r];
      for (var c = 0; c < line.length; c++) {
        var ch = line.charAt(c);
        if (ch === '.') continue;
        ctx.fillStyle = FRUIT_PAL[ch] || '#ffffff';
        ctx.fillRect(ox + c, oy + r, 1, 1);
      }
    }
  };

  /* ------------------------------------------------------------
   * Texto de puntuación emergente (cian, pequeño)
   * ------------------------------------------------------------ */
  Sprites.drawScorePopup = function (ctx, x, y, text) {
    ctx.fillStyle = CFG.COLORS.popup;
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), x, y);
  };

  window.PM.Sprites = Sprites;
})();
