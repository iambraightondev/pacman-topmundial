  /* Caras de los emotes nuevos, en el idioma de Sprites.drawPacFace:
   * círculo del color del jugador, rasgos en negro y un meneo propio. */
  function caraEmote(ctx, x, y, r, color, id, t) {
    var ink = '#000000', lw = Math.max(1, r * 0.17), k, p;
    var ex = r * 0.42, ey = y - r * 0.26;
    function arcoOjo(dx, up) {
      var er = r * 0.26;
      ctx.beginPath();
      if (up) ctx.arc(x + dx, ey + er * 0.5, er, 1.15 * Math.PI, 1.85 * Math.PI);
      else ctx.arc(x + dx, ey - er * 0.5, er, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    if (id === 'silbando') {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(-0.12 + Math.sin(t * 0.03) * 0.03); ctx.translate(-x, -y);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      /* ojos abiertos, mirando arriba y al lado CONTRARIO al que silba */
      ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      [-1, 1].forEach(function (lado) {
        var cx2 = x + lado * ex;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(cx2, ey, r * 0.21, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.45; ctx.stroke();
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(cx2 - r * 0.07, ey - r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.fill();
      });
      /* cejas levantadas, mirando a otro lado */
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.5;
      ctx.beginPath();
      ctx.moveTo(x - ex - r * 0.26, ey - r * 0.44); ctx.quadraticCurveTo(x - ex, ey - r * 0.6, x - ex + r * 0.24, ey - r * 0.46);
      ctx.moveTo(x + ex - r * 0.24, ey - r * 0.46); ctx.quadraticCurveTo(x + ex, ey - r * 0.62, x + ex + r * 0.26, ey - r * 0.48);
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(x + r * 0.22, y + r * 0.45, r * 0.13, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      /* dos rayitas suaves en el cachete: está forzando los labios */
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = lw * 0.28;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.14, y + r * 0.36); ctx.quadraticCurveTo(x - r * 0.26, y + r * 0.46, x - r * 0.16, y + r * 0.56);
      ctx.moveTo(x + r * 0.54, y + r * 0.36); ctx.quadraticCurveTo(x + r * 0.64, y + r * 0.46, x + r * 0.54, y + r * 0.54);
      ctx.stroke();
      ctx.restore();
      for (k = 0; k < 3; k++) {
        p = ((t * 0.012) + k / 3) % 1;
        ctx.globalAlpha = (p < 0.7 ? 1 : (1 - p) / 0.3);
        nota(ctx, x + r * 0.75 + p * r * 0.8, y + r * 0.3 - p * r * 1.4, r * 0.2, '#ffffff');
      }
      ctx.globalAlpha = 1;

    } else if (id === 'plis') {
      var tiembla = Math.sin(t * 0.9) * r * 0.015;
      ctx.save();
      ctx.translate(tiembla, 0);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      [-1, 1].forEach(function (lado) {
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.ellipse(x + lado * r * 0.4, y - r * 0.18, r * 0.24, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x + lado * r * 0.4 - r * 0.08, y - r * 0.29, r * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + lado * r * 0.4 + r * 0.1, y - r * 0.08, r * 0.05, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.68, y - r * 0.66); ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.8, x - r * 0.2, y - r * 0.68);
      ctx.moveTo(x + r * 0.68, y - r * 0.66); ctx.quadraticCurveTo(x + r * 0.4, y - r * 0.8, x + r * 0.2, y - r * 0.68);
      ctx.stroke();
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.2, y + r * 0.52);
      ctx.quadraticCurveTo(x, y + r * 0.42 + tiembla * 6, x + r * 0.2, y + r * 0.52);
      ctx.stroke();
      ctx.restore();

    } else if (id === 'ambicioso') {
      var esc = 1 + Math.sin(t * 0.25) * 0.04;
      ctx.save();
      ctx.translate(x, y); ctx.scale(esc, esc); ctx.translate(-x, -y);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      [-1, 1].forEach(function (lado) {
        var sx = x + lado * ex, sy = ey;
        ctx.fillStyle = '#1f7a3a';
        ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.24, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = lw * 0.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx + r * 0.1, sy - r * 0.13);
        ctx.quadraticCurveTo(sx - r * 0.13, sy - r * 0.2, sx - r * 0.1, sy - r * 0.02);
        ctx.quadraticCurveTo(sx + r * 0.14, sy + r * 0.04, sx + r * 0.1, sy + r * 0.14);
        ctx.quadraticCurveTo(sx - r * 0.12, sy + r * 0.2, sx - r * 0.12, sy + r * 0.08);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - r * 0.26); ctx.lineTo(sx, sy + r * 0.26); ctx.stroke();
      });
      /* cejas de codicia y sonrisa con dientes */
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.7; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - ex - r * 0.28, ey - r * 0.5); ctx.lineTo(x - ex + r * 0.22, ey - r * 0.62);
      ctx.moveTo(x + ex + r * 0.28, ey - r * 0.5); ctx.lineTo(x + ex - r * 0.22, ey - r * 0.62);
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(x, y + r * 0.16, r * 0.46, 0.08 * Math.PI, 0.92 * Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - r * 0.4, y + r * 0.16, r * 0.8, r * 0.12);
      ctx.fillStyle = '#ff6a8a';
      ctx.beginPath(); ctx.ellipse(x + r * 0.1, y + r * 0.56, r * 0.15, r * 0.11, 0.2, 0, Math.PI * 2); ctx.fill();
      /* coloretes */
      ctx.fillStyle = 'rgba(244,130,130,.4)';
      ctx.beginPath(); ctx.ellipse(x - r * 0.62, y + r * 0.2, r * 0.2, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + r * 0.62, y + r * 0.2, r * 0.2, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      /* billetes y monedas cayendo, dentro del globo */
      for (k = 0; k < 4; k++) {
        p = ((t * 0.013) + k / 4) % 1;
        var lado = (k % 2) ? 1 : -1;
        ctx.save();
        ctx.globalAlpha = (p < 0.75 ? 1 : (1 - p) / 0.25);
        ctx.translate(x + lado * r * (0.78 + (k % 2) * 0.16), y - r * 1.15 + p * r * 2.4);
        ctx.rotate(Math.sin(p * 6 + k) * 0.5);
        if (k % 2) {
          ctx.fillStyle = '#ffd24a';
          ctx.beginPath(); ctx.ellipse(0, 0, r * 0.13 * Math.abs(Math.cos(p * 7 + k)) + 0.2, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#a8760a'; ctx.lineWidth = 0.35; ctx.stroke();
        } else {
          ctx.fillStyle = '#4e9c5a';
          ctx.fillRect(-r * 0.2, -r * 0.11, r * 0.4, r * 0.22);
          ctx.strokeStyle = '#2d6b38'; ctx.lineWidth = 0.3;
          ctx.strokeRect(-r * 0.2, -r * 0.11, r * 0.4, r * 0.22);
          ctx.fillStyle = '#eafbe8';
          ctx.fillRect(-r * 0.05, -r * 0.07, r * 0.1, r * 0.14);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

    } else if (id === 'nervios') {
      var tic = (t % 120) < 10;
      ctx.save();
      ctx.translate(Math.sin(t * 1.4) * r * 0.02, 0);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(x - ex, ey, r * 0.13, 0, Math.PI * 2); ctx.fill();
      if (tic) arcoOjo(ex, false);
      else { ctx.beginPath(); ctx.arc(x + ex, ey, r * 0.13, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(x - ex - r * 0.28, ey - r * 0.42); ctx.lineTo(x - ex + r * 0.18, ey - r * 0.56);
      ctx.moveTo(x + ex + r * 0.28, ey - r * 0.42); ctx.lineTo(x + ex - r * 0.18, ey - r * 0.56);
      ctx.stroke();
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.36, y + r * 0.46);
      ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.62, x, y + r * 0.44);
      ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.62, x + r * 0.36, y + r * 0.46);
      ctx.stroke();
      ctx.restore();
      p = (t * 0.01) % 1;
      gota(ctx, x + r * 0.72, y - r * 0.62 + p * r * 0.55, r * 0.16, '#9fe8ff', p < 0.8 ? 1 : (1 - p) / 0.2);

    } else if (id === 'arcoiris') {
      /* el chorro sale DE LA BOCA y corre: las bandas ondulan, la arcada va
       * y viene y la boca se abre con ella */
      var arc = 0.55 + 0.45 * Math.sin(t * 0.16);        // la arcada
      var bx = x + r * 0.05, by = y + r * 0.44;
      /* la cara va primero: el chorro se pinta DESPUÉS, por encima, para que
       * se vea salir de la boca y no por detrás de la cabeza */
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      /* verdoso de mareo en los cachetes */
      ctx.fillStyle = 'rgba(120,200,120,.45)';
      ctx.beginPath(); ctx.ellipse(x - r * 0.6, y + r * 0.1, r * 0.22, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + r * 0.6, y + r * 0.1, r * 0.22, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      /* CARA DE LOCO: los dos ojos desorbitados y desiguales, uno bizqueando,
       * con las pupilas bailando */
      var baile = Math.sin(t * 0.5) * r * 0.05;
      [[-1, 0.3, 0.09], [1, 0.24, 0.13]].forEach(function (oj) {
        var cx2 = x + oj[0] * r * 0.42, cy2 = y - r * 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx2, cy2, r * oj[1], 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.45; ctx.stroke();
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(cx2 + oj[0] * r * 0.05 + baile * oj[0], cy2 + r * 0.04 + baile * 0.6, r * oj[2], 0, Math.PI * 2);
        ctx.fill();
      });
      /* una ceja arriba y la otra abajo: desquiciado */
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.55; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.74, y - r * 0.72); ctx.quadraticCurveTo(x - r * 0.44, y - r * 0.88, x - r * 0.16, y - r * 0.74);
      ctx.moveTo(x + r * 0.2, y - r * 0.6); ctx.quadraticCurveTo(x + r * 0.5, y - r * 0.76, x + r * 0.76, y - r * 0.56);
      ctx.stroke();
      /* gotita de sudor */
      gota(ctx, x + r * 0.78, y - r * 0.34, r * 0.12, '#9fe8ff', 0.85);
      ctx.fillStyle = '#2a1018';
      ctx.beginPath();
      ctx.ellipse(bx, by, r * (0.22 + arc * 0.12), r * (0.24 + arc * 0.14), 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.45; ctx.stroke();
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(1.02 + Math.sin(t * 0.07) * 0.08);
      for (k = 0; k < 7; k++) {
        ctx.fillStyle = ['#ff2a2a', '#ff8c1a', '#ffe81a', '#3ee83e', '#1ae0ff', '#2e6bff', '#9b4dff'][k];
        var w0 = r * 0.1, off = (k - 3) * r * 0.1;
        var onda = Math.sin(t * 0.3 + k * 0.7) * r * 0.06;
        ctx.beginPath();
        ctx.moveTo(-r * 0.02, off * 0.12);
        ctx.quadraticCurveTo(r * 0.6, off * 1.2 + onda, r * 1.6 * (0.7 + arc * 0.45), off * 2.7 + onda);
        ctx.lineTo(r * 1.6 * (0.7 + arc * 0.45), off * 2.7 + onda + w0 * 2.3);
        ctx.quadraticCurveTo(r * 0.6, off * 1.2 + onda + w0 * 1.5, -r * 0.02, off * 0.12 + w0 * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      /* trocitos que salen disparados por el chorro */
      for (k = 0; k < 4; k++) {
        p = ((t * 0.03) + k / 4) % 1;
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = ['#ffe81a', '#3ee83e', '#1ae0ff', '#ff2a2a'][k];
        ctx.beginPath();
        ctx.arc(r * (0.3 + p * 1.5), (k - 1.5) * r * 0.18 + Math.sin(p * 8 + k) * r * 0.08, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      /* el borde de la boca, por encima del chorro, para que se vea que sale
       * de dentro */
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.45;
      ctx.beginPath();
      ctx.ellipse(bx, by, r * (0.22 + arc * 0.12), r * (0.24 + arc * 0.14), 0.2, 1.05 * Math.PI, 2.1 * Math.PI);
      ctx.stroke();
    }
  }

  var EMOTES_NUEVOS = ['silbando', 'plis', 'ambicioso', 'nervios', 'arcoiris'];
  EMOTES_NUEVOS.forEach(function (id) {
    DRAW['emo_' + id] = function (ctx, o) {
      body(ctx, o);
      globoEmote(ctx, o.x, o.y - 11, o.c, o.t * 60, function (cx, cy, r) {
        caraEmote(ctx, cx, cy, r, o.c, id, o.t * 60);
      });
    };
  });

  /* partículas que nacen cada `paso` px del camino y viven `vida` px */
  function rastro(o, paso, vida) {
    var out = [], base = Math.floor(o.s / paso) * paso;
    for (var k = 0; k < 40; k++) {
      var sk = base - k * paso, dist = o.s - sk;
      if (dist < 3) continue;
      var edad = dist / vida;
      if (edad >= 1) break;
      out.push({ p: o.back(dist), edad: edad, n: Math.abs(Math.round(sk / paso)) });
    }
    return out;
  }

  /* ---------------- EFECTOS ---------------- */
  DRAW.efx_pixeles = function (ctx, o) {
    var cols = ['#ffe81a', '#1ae0ff', '#ff4dc4', '#3ee83e'];
    rastro(o, 5, 46).forEach(function (q) {
      for (var k = 0; k < 3; k++) {
        var sem = (q.n * 7 + k * 13) % 11;
        var tam = 1.5 * (1 - q.edad * 0.6);
        var dx = ((sem % 3) - 1) * 1.5, dy = ((sem % 4) - 1.5) * 1.4 + q.edad * 3.2;
        ctx.globalAlpha = (1 - q.edad) * (0.9 - k * 0.2);
        ctx.fillStyle = cols[(q.n + k) % cols.length];
        ctx.fillRect(q.p.x + dx - tam / 2, q.p.y + dy - tam / 2, tam, tam);
      }
    });
    ctx.globalAlpha = 1;
    body(ctx, o);
  };

  /* ONDAS: en cada giro queda un anillo que se abre y se apaga */
  DRAW.efx_ondas = function (ctx, o) {
    body(ctx, o);
    var sm = ((o.s % P) + P) % P, esquinas = [0, PW, PW + PH, 2 * PW + PH], c = 0, k;
    esquinas.forEach(function (e) { if (e <= sm) c = e; });
    for (k = 0; k < 3; k++) {
      var base = c - k * 26;
      var dist = sm - (base < 0 ? base + P : base);
      if (dist < 0) dist += P;
      var u = dist / 34;
      if (u >= 1 || u < 0) continue;
      var p = o.back(dist);
      ctx.strokeStyle = mix(o.c, '#ffffff', 0.5, (1 - u) * 0.9);
      ctx.lineWidth = 0.9 * (1 - u * 0.45);
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 + u * 9, 0, Math.PI * 2); ctx.stroke();
    }
  };

  DRAW.efx_mariposas = function (ctx, o) {
    var cols = ['#ff9ec4', '#9fe8ff', '#ffd23f'];
    rastro(o, 9, 70).forEach(function (q) {
      var bat = Math.abs(Math.sin(o.t * 14 + q.n));
      var col = cols[q.n % cols.length];
      ctx.save();
      ctx.globalAlpha = 1 - q.edad * q.edad;
      ctx.translate(q.p.x, q.p.y - 1.4 - Math.sin(o.t * 4 + q.n) * 1.6 - q.edad * 2.4);
      ctx.rotate(Math.sin(o.t * 3 + q.n) * 0.3);
      ctx.scale(1, 0.55 + bat * 0.5);
      [1, -1].forEach(function (lado) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0.8, lado * 0.2);
        ctx.quadraticCurveTo(2.6, lado * 2.2, 0.4, lado * 3.3);
        ctx.quadraticCurveTo(-0.8, lado * 3.6, -1.1, lado * 1.7);
        ctx.quadraticCurveTo(-2.6, lado * 2.6, -2.3, lado * 0.7);
        ctx.quadraticCurveTo(-1.2, lado * 0.15, 0.8, lado * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(25,25,35,.85)'; ctx.lineWidth = 0.22; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.arc(0.7, lado * 2.1, 0.34, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#2a2a32';
      ctx.beginPath(); ctx.ellipse(0.7, 0, 1.15, 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a2a32'; ctx.lineWidth = 0.18; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(1.7, 0.1); ctx.quadraticCurveTo(2.6, 0.5, 2.7, 1.1);
      ctx.moveTo(1.7, -0.1); ctx.quadraticCurveTo(2.6, -0.5, 2.7, -1.1);
      ctx.stroke();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    body(ctx, o);
  };

  DRAW.efx_fantasmitas = function (ctx, o) {
    var cols = ['#ff4d4d', '#ffb8ff', '#00ffff', '#ffb852'];
    rastro(o, 8, 60).forEach(function (q) {
      var col = cols[q.n % cols.length], r = 2.1 * (1 - q.edad * 0.45);
      var sube = q.edad * 4.0, mece = Math.sin(o.t * 6 + q.n) * 0.8;
      ctx.save();
      ctx.globalAlpha = 1 - q.edad;
      ctx.translate(q.p.x + mece, q.p.y - sube);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI, 0);
      ctx.lineTo(r, r * 0.9);
      for (var k = 0; k < 3; k++) {
        ctx.quadraticCurveTo(r - (k * 2 + 1) * r / 3, r * 0.45, r - (k * 2 + 2) * r / 3, r * 0.9);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.2, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.2, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1acc';
      ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.52, -r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    body(ctx, o);
  };

  DRAW.efx_ojos = function (ctx, o) {
    rastro(o, 9, 64).forEach(function (q) {
      var cierra = Math.max(0.06, Math.min(1, (1 - q.edad) * 1.6));
      var mira = Math.sin(o.t * 2 + q.n) * 0.45;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - q.edad) * 1.6);
      ctx.translate(q.p.x, q.p.y - 1.0);
      ctx.fillStyle = '#fdfaf0';
      ctx.beginPath(); ctx.ellipse(0, 0, 2.0, 1.5 * cierra, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#141414'; ctx.lineWidth = 0.28; ctx.stroke();
      if (cierra > 0.35) {
        ctx.fillStyle = '#2a2a6a';
        ctx.beginPath(); ctx.arc(mira, 0, 0.85 * cierra, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#141414';
        ctx.beginPath(); ctx.arc(mira, 0, 0.42 * cierra, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath(); ctx.arc(mira - 0.3, -0.35 * cierra, 0.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    body(ctx, o);
  };

  DRAW.efx_frutas = function (ctx, o) {
    rastro(o, 8, 56).forEach(function (q) {
      var bote = Math.abs(Math.sin(o.t * 5 + q.n)) * 2.2;
      ctx.save();
      ctx.globalAlpha = 1 - q.edad * q.edad;
      ctx.translate(q.p.x, q.p.y - bote);
      ctx.rotate(Math.sin(o.t * 3 + q.n) * 0.25);
      if (q.n % 3 === 0) {
        ctx.fillStyle = '#e02a2a';
        ctx.beginPath(); ctx.arc(-0.9, 0.9, 1.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(1.1, 1.2, 1.0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3ee83e'; ctx.lineWidth = 0.32; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-0.9, -0.2); ctx.quadraticCurveTo(0.2, -2.2, 1.4, -1.4);
        ctx.moveTo(1.1, 0.2); ctx.quadraticCurveTo(1.3, -1.0, 1.4, -1.4);
        ctx.stroke();
      } else if (q.n % 3 === 1) {
        ctx.fillStyle = '#ff2a5a';
        ctx.beginPath();
        ctx.moveTo(0, 2.0); ctx.quadraticCurveTo(-1.8, 0.8, -1.4, -0.6);
        ctx.quadraticCurveTo(0, -1.3, 1.4, -0.6); ctx.quadraticCurveTo(1.8, 0.8, 0, 2.0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3ee83e';
        ctx.beginPath(); ctx.ellipse(0, -0.9, 1.5, 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe8a0';
        [[-0.6, 0.3], [0.5, 0.1], [0, 1.0]].forEach(function (p) {
          ctx.beginPath(); ctx.arc(p[0], p[1], 0.18, 0, Math.PI * 2); ctx.fill();
        });
      } else {
        ctx.fillStyle = '#ff8c00';
        ctx.beginPath(); ctx.arc(0, 0.4, 1.35, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#b85c00'; ctx.lineWidth = 0.25; ctx.stroke();
        ctx.fillStyle = '#3ee83e';
        ctx.beginPath(); ctx.ellipse(0.6, -1.0, 0.8, 0.32, -0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    body(ctx, o);
  };

  /* ---------------- ACCESORIOS ----------------
   * en el marco del cuerpo, sobre el Pac-Man de su color */
  function accesorio(dibujar) {
    return function (ctx, o) {
      body(ctx, o);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      dibujar(ctx, o);
      ctx.restore();
    };
  }

  DRAW.acc_chullo = accesorio(function (ctx, o) {
    var lana = '#e8dfc8', lanaOsc = '#b6a888', franja = '#d33b3b', franja2 = '#1f4fb0';
    var r2 = R + 0.25, a1 = Math.asin(2.2 / r2), k;
    /* De perfil solo se ve UNA orejera, la del lado de acá, colgando por la
     * oreja; la del otro lado asoma un poco por detrás. Ninguna va delante
     * del hocico. */
    function oreja(f, esc, col, colOsc, mueve) {
      ctx.save();
      ctx.translate(f, 1.4);
      ctx.rotate(0.06 + Math.sin(o.t * 5) * 0.05 * mueve);
      ctx.scale(esc, esc);
      ctx.beginPath();
      ctx.moveTo(-1.3, 1.2); ctx.lineTo(1.3, 1.2);
      ctx.quadraticCurveTo(1.15, -1.6, 0, -2.3);
      ctx.quadraticCurveTo(-1.15, -1.6, -1.3, 1.2);
      ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = colOsc; ctx.lineWidth = 0.38; ctx.stroke();
      ctx.fillStyle = (col === lana) ? franja : hex(mix(franja, '#000000', 0.35));
      ctx.fillRect(-1.25, -0.5, 2.5, 0.6);
      ctx.strokeStyle = colOsc; ctx.lineWidth = 0.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -2.3); ctx.quadraticCurveTo(0.5, -3.1, -0.15, -3.8); ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, r2, a1, Math.PI - a1); ctx.closePath();
    ctx.fillStyle = lana; ctx.fill();
    ctx.strokeStyle = lanaOsc; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r2, a1, Math.PI - a1); ctx.closePath(); ctx.clip();
    ctx.fillStyle = franja; ctx.fillRect(-r2, 3.0, r2 * 2, 1.0);
    ctx.fillStyle = franja2;
    for (k = -4; k <= 4; k++) {
      ctx.beginPath();
      ctx.moveTo(k * 1.5, 4.4); ctx.lineTo(k * 1.5 + 0.75, 5.5); ctx.lineTo(k * 1.5 + 1.5, 4.4);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.2;
    for (k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * 1.3, 2.4); ctx.lineTo(k * 1.3, r2); ctx.stroke(); }
    ctx.restore();
    /* la orejera de este lado, por delante del gorro pero por la oreja */
    oreja(-0.7, 1, lana, lanaOsc, 1);
    ctx.fillStyle = franja;
    ctx.beginPath(); ctx.arc(-0.3, R + 1.5, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a1414'; ctx.lineWidth = 0.3; ctx.stroke();
  });

  /* MOHICANO: la cresta va de la frente a la nuca y los pinchos salen
   * largos y barridos hacia atrás, como el de la foto: los de detrás
   * sobresalen del cuerpo. */
  DRAW.acc_mohicano = accesorio(function (ctx, o) {
    var cresta = '#ff3a4a', crestaOsc = '#6e0a18', punta = '#a8101f';
    ctx.lineJoin = 'round';
    var N = 9, LARGO = 4.6;                                  // todos miden igual
    for (var k = 0; k < N; k++) {
      var a = (0.10 + (k / (N - 1)) * 0.86) * Math.PI;      // de la frente a la nuca
      var rb = R - 0.5, dw = 0.115;
      var b1f = Math.cos(a - dw) * rb, b1s = Math.sin(a - dw) * rb;
      var b2f = Math.cos(a + dw) * rb, b2s = Math.sin(a + dw) * rb;
      var barr = 0.5;                                        // mismo barrido hacia atrás
      var vai = Math.sin(o.t * 5 + k * 0.7) * 0.05;
      var ang2 = a + barr + vai;
      var tf = Math.cos(a) * rb + Math.cos(ang2) * LARGO;
      var ts = Math.sin(a) * rb + Math.sin(ang2) * LARGO;
      /* pincho recto: dos lados rectos hasta la punta, sin curvas */
      ctx.beginPath();
      ctx.moveTo(b1f, b1s);
      ctx.lineTo(tf, ts);
      ctx.lineTo(b2f, b2s);
      ctx.closePath();
      var g = ctx.createLinearGradient(Math.cos(a) * rb, Math.sin(a) * rb, tf, ts);
      g.addColorStop(0, cresta);
      g.addColorStop(1, punta);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = crestaOsc; ctx.lineWidth = 0.32; ctx.lineJoin = 'miter'; ctx.stroke();
    }
    ctx.lineJoin = 'round';
    /* la raíz de la cresta y los lados rapados */
    ctx.strokeStyle = crestaOsc; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(0, 0, R - 0.55, 0.1 * Math.PI, 0.96 * Math.PI); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,0,20,.4)'; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.arc(0, 0, R - 1.6, 0.2 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  });

  DRAW.acc_vaquero = accesorio(function (ctx, o) {
    var cuero = '#a5703c', cueroOsc = '#5d3a17', cinta = '#2c2118';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-6.6, R - 2.0);
    ctx.quadraticCurveTo(0, R - 3.4, 6.8, R - 2.2);
    ctx.quadraticCurveTo(0, R + 0.4, -6.6, R - 2.0);
    ctx.closePath();
    ctx.fillStyle = cuero; ctx.fill();
    ctx.strokeStyle = cueroOsc; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3.4, R - 2.3);
    ctx.quadraticCurveTo(-3.0, R + 2.4, -1.2, R + 2.6);
    ctx.quadraticCurveTo(-0.4, R + 1.2, 0.4, R + 2.6);
    ctx.quadraticCurveTo(2.6, R + 2.4, 3.4, R - 2.4);
    ctx.closePath();
    ctx.fillStyle = cuero; ctx.fill(); ctx.stroke();
    ctx.fillStyle = cinta;
    ctx.beginPath();
    ctx.moveTo(-3.35, R - 2.2); ctx.lineTo(3.35, R - 2.3);
    ctx.lineTo(3.2, R - 1.1); ctx.lineTo(-3.2, R - 1.0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(1.9, R - 1.6, 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.25;
    ctx.beginPath(); ctx.moveTo(-2.4, R + 0.6); ctx.quadraticCurveTo(-1.6, R + 2.0, -1.0, R + 2.2); ctx.stroke();
  });

  DRAW.acc_luchador = accesorio(function (ctx, o) {
    var tela = '#1f4fb0', telaOsc = '#0c1c40', vivo = '#ffd24a';
    ctx.lineJoin = 'round';
    /* la capucha sigue el borde de la cabeza y lo desborda un poco: antes
     * se escapaban píxeles del Pac-Man por el filo */
    function capucha() {
      var r2 = R + 0.4, a0 = 0.03 * Math.PI, a1 = 1.16 * Math.PI;
      ctx.beginPath();
      ctx.arc(0, 0, r2, a0, a1);
      ctx.quadraticCurveTo(-3.4, 0.4, -0.4, 0.9);
      ctx.quadraticCurveTo(3.2, 1.3, r2 * Math.cos(a0), r2 * Math.sin(a0));
      ctx.closePath();
    }
    capucha();
    ctx.fillStyle = tela; ctx.fill();
    ctx.strokeStyle = telaOsc; ctx.lineWidth = 0.42; ctx.stroke();
    ctx.save();
    capucha(); ctx.clip();
    ctx.fillStyle = vivo;
    ctx.beginPath();
    ctx.moveTo(-1.0, 1.0);
    ctx.quadraticCurveTo(0.6, 3.4, 3.0, 2.0);
    ctx.quadraticCurveTo(2.0, 4.4, 4.6, 4.0);
    ctx.quadraticCurveTo(2.2, 5.6, -0.6, 5.0);
    ctx.quadraticCurveTo(-2.4, 4.2, -1.0, 1.0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = vivo; ctx.lineWidth = 0.3; ctx.lineCap = 'round';
    for (var k = 0; k < 4; k++) {
      var yy = 2.0 + k * 1.15;
      ctx.beginPath(); ctx.moveTo(-5.9, yy); ctx.lineTo(-4.3, yy + 0.5); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#0a0a10';
    ctx.beginPath(); ctx.ellipse(1.5, 3.6, 1.5, 1.05, -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = vivo; ctx.lineWidth = 0.3; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(1.9, 3.5, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(2.05, 3.5, 0.24, 0, Math.PI * 2); ctx.fill();
  });

  /* OREJAS DE GATO: dos triángulos apoyados en la coronilla, con su base
   * pegada a la curva de la cabeza (antes flotaban torcidas) */
  DRAW.acc_orejas = accesorio(function (ctx, o) {
    var pelo = '#3a3a46', peloOsc = '#15151b', rosa = '#ff9ab8';
    function oreja(f, alto, giro, lejos) {
      var base = Math.sqrt(Math.max(0.5, R * R - f * f)) - 0.5;
      var esc = lejos ? 0.8 : 1;
      ctx.save();
      ctx.translate(f, base);
      ctx.rotate(giro + Math.sin(o.t * 7) * 0.05);
      ctx.scale(esc, esc);
      ctx.beginPath();
      ctx.moveTo(-1.35, 0);
      ctx.lineTo(0, alto);
      ctx.lineTo(1.35, 0);
      ctx.quadraticCurveTo(0, -0.7, -1.35, 0);
      ctx.closePath();
      ctx.fillStyle = lejos ? hex(mix(pelo, '#000000', 0.35)) : pelo;
      ctx.fill();
      ctx.strokeStyle = peloOsc; ctx.lineWidth = 0.4; ctx.stroke();
      ctx.fillStyle = lejos ? hex(mix(rosa, '#000000', 0.4)) : rosa;
      ctx.beginPath();
      ctx.moveTo(-0.7, 0.05); ctx.lineTo(0, alto - 0.9); ctx.lineTo(0.7, 0.05);
      ctx.quadraticCurveTo(0, -0.35, -0.7, 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    /* de perfil: la oreja de este lado, entera, y la del otro asomando un
     * poco MÁS ADELANTE, pequeña y oscura. De la vincha solo se ve un lado,
     * el que baja por detrás de la oreja de acá. */
    oreja(1.9, 2.4, 0.16, true);
    ctx.strokeStyle = peloOsc; ctx.lineWidth = 0.75; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, R - 0.55, 0.5 * Math.PI, 1.02 * Math.PI); ctx.stroke();
    ctx.strokeStyle = pelo; ctx.lineWidth = 0.42;
    ctx.beginPath(); ctx.arc(0, 0, R - 0.55, 0.52 * Math.PI, 1.0 * Math.PI); ctx.stroke();
    oreja(-0.9, 3.2, -0.06);
  });

  DRAW.acc_buceo = accesorio(function (ctx, o) {
    var goma = '#e02a4a', gomaOsc = '#7a0a1c';
    ctx.strokeStyle = gomaOsc; ctx.lineWidth = 1.05; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1.6, 4.6); ctx.quadraticCurveTo(-4.4, 5.6, -4.2, 8.6);
    ctx.stroke();
    ctx.strokeStyle = goma; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.strokeStyle = gomaOsc; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(-1.2, 4.4); ctx.quadraticCurveTo(-4.6, 4.2, -5.6, 2.6); ctx.stroke();
    function cristal() {
      ctx.beginPath();
      ctx.moveTo(-1.4, 5.0);
      ctx.quadraticCurveTo(2.4, 5.6, 4.6, 4.2);
      ctx.quadraticCurveTo(5.2, 2.0, 3.2, 1.5);
      ctx.quadraticCurveTo(0.2, 1.0, -1.4, 2.0);
      ctx.quadraticCurveTo(-2.0, 3.6, -1.4, 5.0);
      ctx.closePath();
    }
    cristal();
    ctx.fillStyle = goma; ctx.fill();
    ctx.strokeStyle = gomaOsc; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.save();
    cristal(); ctx.clip();
    var g = ctx.createLinearGradient(0, 5.4, 0, 1.4);
    g.addColorStop(0, '#9fe8ff');
    g.addColorStop(0.6, '#2d7fa8');
    g.addColorStop(1, '#0d2b3c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(1.6, 3.3, 2.9, 1.6, -0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.moveTo(-1.0, 4.6); ctx.lineTo(1.4, 1.8); ctx.lineTo(2.4, 1.9); ctx.lineTo(0.0, 4.8); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(2.2, 3.4, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(2.0, 3.6, 0.28, 0, Math.PI * 2); ctx.fill();
    /* burbujitas del tubo */
    for (var k = 0; k < 2; k++) {
      var p = ((o.t * 0.6) + k * 0.5) % 1;
      ctx.strokeStyle = 'rgba(190,235,255,' + (0.7 * (1 - p)) + ')'; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.arc(-4.2 - p * 0.8, 9.0 + p * 2.6, 0.3 + p * 0.4, 0, Math.PI * 2); ctx.stroke();
    }
  });

  /* FLOTADOR DE PATITO: el aro abraza el cuerpo a la altura de la cintura;
   * antes quedaba suelto por debajo, como un objeto aparte. */
  DRAW.acc_patito = accesorio(function (ctx, o) {
    var amar = '#ffd23f', amarOsc = '#a8760a', pico = '#ff8c00', blanco = '#fff6d0';
    var bal = Math.sin(o.t * 4) * 0.09;
    var RX = 7.2, RY = 2.7, rx = 4.4, ry = 1.2;
    ctx.save();
    ctx.translate(0, -1.2);
    ctx.rotate(bal);
    /* De perfil, la mitad de atrás del aro queda ESCONDIDA tras el cuerpo:
     * no se dibuja. Solo se pinta la banda de delante, que cruza la barriga
     * y asoma por los dos costados. */
    var a0 = 0.86 * Math.PI, a1 = 2.14 * Math.PI;
    function banda() {
      ctx.beginPath();
      ctx.ellipse(0, 0, RX, RY, 0, a0, a1);
      ctx.ellipse(0, 0, rx, ry, 0, a1, a0, true);
      ctx.closePath();
    }
    banda();
    ctx.fillStyle = amar; ctx.fill();
    ctx.strokeStyle = amarOsc; ctx.lineWidth = 0.45; ctx.lineJoin = 'round'; ctx.stroke();
    /* franja blanca */
    ctx.save();
    banda(); ctx.clip();
    ctx.fillStyle = blanco;
    [-3.9, 3.9].forEach(function (f) {
      ctx.beginPath(); ctx.ellipse(f, 0.6, 1.0, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.ellipse(0, -0.1, 5.9, 2.1, 0, 1.12 * Math.PI, 1.88 * Math.PI); ctx.stroke();
    /* la cabeza del patito, apoyada en la punta de delante del aro */
    ctx.beginPath(); ctx.arc(6.8, 1.6, 1.7, 0, Math.PI * 2);
    ctx.fillStyle = amar; ctx.fill();
    ctx.strokeStyle = amarOsc; ctx.lineWidth = 0.45; ctx.stroke();
    ctx.fillStyle = pico;
    ctx.beginPath();
    ctx.moveTo(7.8, 1.6); ctx.quadraticCurveTo(9.6, 1.8, 9.4, 0.9);
    ctx.quadraticCurveTo(8.7, 0.5, 7.7, 1.0); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a85700'; ctx.lineWidth = 0.3; ctx.stroke();
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(7.2, 2.2, 0.34, 0, Math.PI * 2); ctx.fill();
    /* colita */
    ctx.fillStyle = amar;
    ctx.beginPath();
    ctx.moveTo(-6.6, 1.0); ctx.quadraticCurveTo(-8.8, 2.4, -8.2, 0.6);
    ctx.quadraticCurveTo(-7.7, 0.2, -6.6, 0.2); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = amarOsc; ctx.lineWidth = 0.35; ctx.stroke();
    ctx.restore();
  });
