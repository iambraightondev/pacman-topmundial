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
   * skin (opcional): id de CFG.SKINS; por defecto 'clasico'
   * ------------------------------------------------------------ */
  function pacPath(ctx, x, y, r, a, half) {
    ctx.beginPath();
    if (half <= 0) {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    } else {
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, a + half, a - half + Math.PI * 2);
      ctx.closePath();
    }
  }

  /* ¿el punto (px,py), relativo al centro, cae dentro del cuerpo? */
  function inPac(px, py, r, a, half) {
    if (px * px + py * py > r * r) return false;
    if (half <= 0) return true;
    var ang = Math.atan2(py, px) - a;          // ángulo respecto a la boca
    while (ang > Math.PI) ang -= Math.PI * 2;
    while (ang < -Math.PI) ang += Math.PI * 2;
    return Math.abs(ang) > half;               // fuera de la cuña = cuerpo
  }

  Sprites.drawPacman = function (ctx, x, y, dir, mouthPhase, color, skin) {
    var r = 6.5;
    var half = [0, (40 * Math.PI / 180) / 2, (80 * Math.PI / 180) / 2][mouthPhase] || 0;
    var d = (dir >= 0) ? dir : 3;
    var a = DIR_ANGLE[d];
    var v = CFG.DIR_V[d];

    if (skin === 'aro') {
      // solo contorno: un aro con la boca abierta
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      pacPath(ctx, x, y, r - 1, a, half);
      ctx.stroke();
      return;
    }

    if (skin === 'pixel') {
      // cuerpo reconstruido en bloques de 1.5 px (aire retro)
      var step = 1.5;
      ctx.fillStyle = color;
      for (var py = -r; py <= r; py += step) {
        for (var px = -r; px <= r; px += step) {
          if (!inPac(px + step / 2, py + step / 2, r, a, half)) continue;
          ctx.fillRect(Math.round(x + px), Math.round(y + py), step, step);
        }
      }
      return;
    }

    if (skin === 'sombra') {
      // estela sólida por detrás, en el mismo tono
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color;
      pacPath(ctx, x - v.x * 3, y - v.y * 3, r - 1, a, half);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (skin === 'neon') {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 7;
      ctx.fillStyle = color;
      pacPath(ctx, x, y, r, a, half);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = color;
      pacPath(ctx, x, y, r, a, half);
      ctx.fill();
    }

    if (skin === 'ojos') {
      // un ojo mirando en la dirección de avance
      var ex = x - v.y * 2.6 + v.x * 1.2;
      var ey = y + v.x * 2.6 + v.y * 1.2 - (v.y > 0 ? 0 : 1);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ex + v.x * 0.7, ey + v.y * 0.7, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  /* ------------------------------------------------------------
   * Caras de Pac-Man para los emotes (todo dibujado, sin recursos).
   * Cuerpo del color del jugador y rasgos en negro encima, para que
   * las expresiones se lean incluso a 8 px de casilla.
   * ------------------------------------------------------------ */
  function heart(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.3, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.3, y - s * 0.2, x, y + s * 0.9);
    ctx.closePath();
    ctx.fill();
  }

  Sprites.drawPacFace = function (ctx, x, y, r, color, id) {
    var ink = '#000000';
    var ex = r * 0.42;              // separación horizontal de los ojos
    var ey = y - r * 0.26;          // altura de los ojos
    var lw = Math.max(1, r * 0.17);

    ctx.fillStyle = color || '#ffff00';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;

    function dot(dx, rr) {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x + dx, ey, rr || r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    /* arco de boca: up = sonrisa, !up = mueca hacia abajo */
    function mouthArc(up, wide) {
      var mr = r * (wide ? 0.55 : 0.42);
      var my = y + (up ? r * 0.12 : r * 0.42);
      ctx.beginPath();
      if (up) ctx.arc(x, my, mr, 0.15 * Math.PI, 0.85 * Math.PI);
      else ctx.arc(x, my, mr, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    }
    /* ojo cerrado y curvado (^ = contento, v = triste) */
    function arcEye(dx, up) {
      var er = r * 0.26;
      ctx.beginPath();
      if (up) ctx.arc(x + dx, ey + er * 0.5, er, 1.15 * Math.PI, 1.85 * Math.PI);
      else ctx.arc(x + dx, ey - er * 0.5, er, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    if (id === 'risa') {
      arcEye(-ex, true);
      arcEye(ex, true);
      // boca abierta de carcajada: media luna rellena
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x, y + r * 0.12, r * 0.56, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

    } else if (id === 'llanto') {
      arcEye(-ex, false);
      arcEye(ex, false);
      mouthArc(false, false);
      // lagrimones
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.moveTo(x - ex, ey + r * 0.25);
      ctx.lineTo(x - ex - r * 0.16, ey + r * 0.72);
      ctx.lineTo(x - ex + r * 0.16, ey + r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + ex, ey + r * 0.25);
      ctx.lineTo(x + ex - r * 0.16, ey + r * 0.62);
      ctx.lineTo(x + ex + r * 0.16, ey + r * 0.62);
      ctx.closePath();
      ctx.fill();

    } else if (id === 'enfado') {
      dot(-ex);
      dot(ex);
      // cejas caídas hacia el centro
      ctx.beginPath();
      ctx.moveTo(x - ex - r * 0.3, ey - r * 0.5);
      ctx.lineTo(x - ex + r * 0.28, ey - r * 0.18);
      ctx.moveTo(x + ex + r * 0.3, ey - r * 0.5);
      ctx.lineTo(x + ex - r * 0.28, ey - r * 0.18);
      ctx.stroke();
      mouthArc(false, true);

    } else if (id === 'susto') {
      // ojos muy abiertos
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - ex, ey, r * 0.27, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + ex, ey, r * 0.27, 0, Math.PI * 2);
      ctx.fill();
      dot(-ex, r * 0.13);
      dot(ex, r * 0.13);
      // boca redonda de sorpresa
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x, y + r * 0.42, r * 0.22, 0, Math.PI * 2);
      ctx.fill();

    } else if (id === 'guino') {
      dot(-ex, r * 0.14);
      ctx.beginPath();                       // ojo guiñado
      ctx.moveTo(x + ex - r * 0.25, ey);
      ctx.lineTo(x + ex + r * 0.25, ey);
      ctx.stroke();
      mouthArc(true, true);

    } else if (id === 'amor') {
      heart(ctx, x - ex, ey, r * 0.3, '#ff0055');
      heart(ctx, x + ex, ey, r * 0.3, '#ff0055');
      mouthArc(true, false);

    } else {
      dot(-ex);
      dot(ex);
      mouthArc(true, false);
    }
  };

  /* Globo de emote sobre un Pac-Man */
  Sprites.drawEmote = function (ctx, x, y, emoteId, color) {
    var e = CFG.EMOTES[emoteId];
    if (!e) return;
    var w = 22, h = 20, r = 7;
    var bx = Math.round(x - w / 2), by = Math.round(y - h);
    // el globo no se sale del laberinto
    if (bx < 2) bx = 2;
    if (bx + w > CFG.NATIVE_W - 2) bx = CFG.NATIVE_W - 2 - w;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(bx, by, w, h);
    ctx.strokeStyle = color || '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
    // pico hacia el jugador
    ctx.fillStyle = color || '#ffffff';
    ctx.fillRect(Math.round(x) - 1, by + h, 2, 2);

    Sprites.drawPacFace(ctx, bx + w / 2, by + h / 2, r, color || '#ffff00', e.id);
  };

  /* Etiqueta de maestría sobre un jugador (Ctrl+Espacio).
   *
   * Tiene su propia animación, a propósito distinta del cartel grande del
   * panel MAESTRÍAS (que baja de arriba con rayos girando): aquí la medalla
   * SALE GIRANDO desde la cabeza del jugador, la chapa SE DESPLIEGA hacia su
   * derecha con un chispazo, la medalla brilla mientras se mantiene y al
   * final todo se encoge de vuelta hacia el jugador.
   *
   *   t    — 0 al aparecer, 1 al terminar (si no se pasa, se pinta quieta)
   *   tick — contador libre, para el brillo y la flotación
   */
  Sprites.drawBadgeTag = function (ctx, x, y, name, color, t, tick) {
    var text = String(name || '');
    color = color || '#888888';
    t = (typeof t === 'number') ? Math.max(0, Math.min(1, t)) : 1;
    tick = tick || 0;

    var SUBE = 0.16;     // hasta aquí: la medalla sube girando
    var ABRE = 0.30;     // hasta aquí: la chapa se despliega
    var CIERRA = 0.86;   // a partir de aquí: se va

    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var padL = 15, padR = 6, h = 14, r = 4.5;
    var w = ctx.measureText(text).width + padL + padR;
    var bx = Math.round(x - w / 2), by = Math.round(y - h);
    if (bx < 2) bx = 2;
    if (bx + w > CFG.NATIVE_W - 2) bx = CFG.NATIVE_W - 2 - w;
    // centro de la medalla: empieza sobre el jugador y acaba en su hueco
    var mx = x, my = by + h / 2;

    var salida = (t > CIERRA) ? (t - CIERRA) / (1 - CIERRA) : 0;
    var vis = 1 - salida;
    if (vis <= 0) return;

    /* subida desde el jugador, con un pasito de más al llegar */
    var sube = Math.min(1, t / SUBE);
    var freno = 1 - Math.pow(1 - sube, 3);
    var dy = (1 - freno) * 14 - Math.sin(sube * Math.PI) * 2.5 +
      Math.sin(tick * 0.11) * 0.7 + salida * 12;

    ctx.save();
    ctx.globalAlpha = vis;
    // al irse, se encoge hacia el jugador
    if (salida > 0) {
      ctx.translate(x, y);
      ctx.scale(1 - salida * 0.5, 1 - salida * 0.5);
      ctx.translate(-x, -y);
    }
    ctx.translate(0, -dy);

    /* La medalla sube CENTRADA sobre el jugador y se corre a su hueco de la
     * izquierda mientras la chapa crece a partir de ella. */
    var abre = (t <= SUBE) ? 0
      : Math.min(1, (t - SUBE) / (ABRE - SUBE));
    abre = 1 - Math.pow(1 - abre, 3);
    mx = Math.round(x + (bx + 8 - x) * abre);
    var lx = mx - 8;                       // borde izquierdo de la chapa

    var aw = Math.round(w * abre);
    if (aw > 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(lx, by, aw, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(lx + 0.5, by + 0.5, aw - 1, h - 1);
      // pico hacia el jugador, solo con la chapa ya abierta
      if (abre > 0.6) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x) - 1, by + h, 2, 2);
      }
      // el nombre aparece recortado por el borde de la chapa
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx, by, aw - 2, h);
      ctx.clip();
      ctx.fillStyle = color;
      ctx.fillText(text, lx + padL, my + 0.5);
      ctx.restore();
    }

    /* chispazo al plantarse la medalla */
    var chispa = (t < SUBE) ? 0 : Math.min(1, (t - SUBE) / 0.14);
    if (chispa > 0 && chispa < 1) {
      ctx.save();
      ctx.globalAlpha = vis * (1 - chispa);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3 + 0.4;
        var r0 = r + 1 + chispa * 5, r1 = r0 + 3;
        ctx.moveTo(mx + Math.cos(a) * r0, my + Math.sin(a) * r0);
        ctx.lineTo(mx + Math.cos(a) * r1, my + Math.sin(a) * r1);
      }
      ctx.stroke();
      ctx.restore();
    }

    /* la medalla: girando mientras sube, quieta y con brillo después */
    var giro = (t < SUBE) ? Math.cos(sube * Math.PI * 4) : 1;
    var ancho = Math.max(0.18, Math.abs(giro));
    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(ancho, 1);
    ctx.translate(-mx, -my);
    if (giro < 0) {
      // de canto se ve el reverso: disco liso, sin el Pac-Man
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, r * 0.22);
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      Sprites.drawBadge(ctx, mx, my, r, color, false);
    }
    ctx.restore();

    /* destello que recorre la medalla de vez en cuando */
    if (t > ABRE && t < CIERRA) {
      var fase = (tick % 80) / 80;
      if (fase < 0.35) {
        var d = (fase / 0.35) * (r * 4) - r * 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, r - 0.5, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = vis * 0.7;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(mx + d - 2, my - r);
        ctx.lineTo(mx + d + 2, my + r);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  };

  /* ------------------------------------------------------------
   * Cartel animado de maestría. Se dibuja aquí (y no en game.js) para
   * poder enseñarlo también fuera de la partida, en el panel MAESTRÍAS.
   *   t    — 0 al aparecer, 1 al terminar
   *   tick — contador libre, para el latido y el giro de los rayos
   * ------------------------------------------------------------ */
  Sprites.drawBadgeBanner = function (ctx, cx, cy, w, h, t, info, tick) {
    var color = info.color || '#ffffff';
    var ent = Math.min(1, t / 0.15);            // entrada
    var sal = Math.min(1, (1 - t) / 0.15);      // salida
    var vis = Math.min(ent, sal);
    if (vis <= 0) return;

    // rebote: se pasa un poco y vuelve a su sitio
    var over = (ent < 1) ? (1 - Math.pow(1 - ent, 3)) : 1;
    var slide = (1 - over) * -40;
    var scale = 0.85 + 0.15 * over +
      (ent >= 1 ? 0 : 0.06 * Math.sin(ent * Math.PI));

    ctx.save();
    ctx.globalAlpha = vis;
    ctx.translate(cx, cy + slide);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - w / 2 + 1, cy - h / 2 + 1, w - 2, h - 2);

    // rayos girando detrás de la medalla
    var mx = cx - w / 2 + 24, my = cy;
    ctx.save();
    ctx.globalAlpha = vis * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < 12; i++) {
      var a = tick * 0.04 + i * Math.PI / 6;
      ctx.moveTo(mx + Math.cos(a) * 11, my + Math.sin(a) * 11);
      ctx.lineTo(mx + Math.cos(a) * 17, my + Math.sin(a) * 17);
    }
    ctx.stroke();
    ctx.restore();

    // medalla con latido
    Sprites.drawBadge(ctx, mx, my, 9 * (1 + 0.12 * Math.sin(tick * 0.18)),
      color, false);

    var tx = cx + 14;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      (info.nueva === false ? 'MAESTRÍA DE ' : '¡NUEVA MAESTRÍA DE ') +
      (info.mode || 'SOLO') + '!', tx, cy - 11);

    // el nombre entra creciendo, un poco después que el cartel
    var nameIn = Math.min(1, Math.max(0, (t - 0.10) / 0.15));
    ctx.save();
    ctx.translate(tx, cy + 4);
    ctx.scale(0.6 + 0.4 * nameIn, 0.6 + 0.4 * nameIn);
    ctx.globalAlpha = vis * nameIn;
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = color;
    ctx.fillText(info.name || '', 0, 0);
    ctx.restore();

    // destello que recorre el cartel una sola vez
    var brillo = (t > 0.2 && t < 0.55) ? (t - 0.2) / 0.35 : -1;
    if (brillo >= 0) {
      ctx.globalAlpha = vis * 0.35 * Math.sin(brillo * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - w / 2 + brillo * w - 5, cy - h / 2 + 2, 10, h - 4);
    }
    ctx.restore();
  };

  /* Medalla de maestría: disco con el aro del color de la insignia */
  Sprites.drawBadge = function (ctx, x, y, r, color, locked) {
    ctx.fillStyle = locked ? '#161616' : '#000000';
    ctx.strokeStyle = locked ? '#444444' : color;
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Pac-Man dentro
    var pr = r * 0.55;
    ctx.fillStyle = locked ? '#444444' : color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, pr, 0.55, -0.55 + Math.PI * 2);
    ctx.closePath();
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
