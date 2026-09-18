  /* ---------- Las ocho muertes ----------
   * Cada 6,8 s, fuera de la Q, la vitrina enseña cómo muere cada skin. La
   * skin NO cambia de dibujo: se le saca una foto (ella misma, quieta y con
   * la boca cerrada) en un lienzo aparte, y la muerte mueve, quema, parte o
   * borra esa foto. */

  /* CÓNDOR: se le doblan las alas y cae en picado soltando plumas */
  conMuerte('condor', null, function (M, pm, o) {
    var ctx = M.ctx, u = tramo(pm, 0.18, 1), fade = 1 - tramo(pm, 0.8, 1), k;
    M.pinta({ dy: u * u * 11, rot: u * 1.7, pf: -1, ps: 0, alpha: fade });
    for (k = 0; k < 8; k++) {
      var d = tramo(pm, 0.04 + k * 0.055, 1);
      if (d <= 0) continue;
      ctx.save();
      ctx.globalAlpha = (1 - d) * fade;
      ctx.translate(o.x + (k - 3.5) * 1.5 + Math.sin(d * 6 + k) * 2.0, o.y - 2 + d * 10);
      ctx.rotate(Math.sin(d * 5 + k) * 1.0);
      ctx.fillStyle = (k % 3) ? '#f4f1e6' : '#2b2b36';
      ctx.beginPath(); ctx.ellipse(0, 0, 1.4, 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(15,15,20,.75)'; ctx.lineWidth = 0.22; ctx.stroke();
      ctx.restore();
    }
  });

  /* TORO: da dos pasos tambaleándose, cae de lado y levanta polvo */
  conMuerte('toro', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var tambalea = pm < 0.3 ? Math.sin(pm * 38) * 0.14 * tramo(pm, 0, 0.3) : 0;
    var c = rebote(tramo(pm, 0.3, 0.64)), fade = 1 - tramo(pm, 0.84, 1);
    M.pinta({ rot: tambalea - c * Math.PI / 2, pf: -1.5, ps: -4, dy: c * 1.6, alpha: fade });
    if (c > 0.45) {
      var golpe = tramo(pm, 0.44, 0.75);
      for (k = 0; k < 7; k++) {
        var hx = (hash(k + 4) % 100) / 100;
        ctx.fillStyle = 'rgba(206,192,170,' + (0.5 * Math.sin(golpe * Math.PI) * fade) + ')';
        ctx.beginPath();
        ctx.arc(o.x + (hx - 0.5) * 13 * (0.4 + golpe), o.y + 5 - golpe * 2.5, 1.0 + golpe * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      var p = M.pant(-1, 7.5);
      mareo(ctx, p.x, p.y, o.t, fade * tramo(pm, 0.55, 0.7));
    }
  });

  /* UNICORNIO: se le apaga el cuerno, la crin pierde el color y cae
   * deshaciéndose en purpurina */
  conMuerte('unicornio', null, function (M, pm, o) {
    var ctx = M.ctx, u = tramo(pm, 0.08, 0.5), fade = 1 - tramo(pm, 0.78, 1), k;
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(126,126,138,' + (u * 0.88) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    var cae = suave(tramo(pm, 0.2, 0.9));
    M.pinta({ dy: cae * 6.5, rot: cae * 0.6, pf: -4, ps: -2, alpha: fade });
    var p = M.pant(4.5, 8.8);
    if (pm < 0.2) destello(ctx, p.x, p.y, 1.6 * (1 - pm / 0.2) * (Math.floor(pm * 40) % 2 ? 0.3 : 1), 1);
    for (k = 0; k < 12; k++) {
      var d = tramo(pm, 0.04 + k * 0.045, 1);
      if (d <= 0) continue;
      estrella4(ctx, p.x + (k - 5.5) * 1.3 + Math.sin(d * 5 + k) * 1.4, p.y + d * 11,
        0.95 * (1 - d), PRISMA[k % PRISMA.length], (1 - d) * fade);
    }
  });

  /* RANA: pega un último salto, cae patas arriba y se le sale la lengua */
  conMuerte('rana', null, function (M, pm, o) {
    var ctx = M.ctx, x = tramo(pm, 0, 0.3), g = suave(x), salto = Math.sin(x * Math.PI) * 3.4;
    var fade = 1 - tramo(pm, 0.84, 1);
    M.pinta({ dy: -salto, sf: 1, ss: 1 - 2 * g, rot: pm > 0.3 ? Math.sin(pm * 45) * 0.03 : 0, alpha: fade });
    if (pm > 0.32) {
      var b = M.pant(6.0, 1.0);                 // la boca, ya boca abajo
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.quadraticCurveTo(b.x + 1.4, b.y + 3.0, b.x + 0.4 + Math.sin(o.t * 6) * 0.7, b.y + 5.4);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.strokeStyle = '#ff5f8d'; ctx.lineWidth = 1.15; ctx.stroke();
      ctx.restore();
      var e2 = M.pant(0.5, 6.5);
      mareo(ctx, e2.x, e2.y, o.t, fade);
    }
  });

  /* PAYASO: se le desinfla la nariz, que sale volando dando bandazos */
  conMuerte('payaso', null, function (M, pm, o) {
    var ctx = M.ctx, e = tramo(pm, 0.12, 1), fade = 1 - tramo(pm, 0.82, 1), k;
    if (pm > 0.12) M.enFoto(function (c) {
      c.beginPath(); c.arc(5.5, 1.3, 1.85, 0, Math.PI * 2); c.fill();
    }, 'destination-out');
    var cae = suave(tramo(pm, 0.22, 0.9));
    M.pinta({ dy: cae * 6, rot: cae * 0.9, pf: -4.5, ps: -2, alpha: fade });
    if (pm > 0.12) {
      var p0 = M.pant(5.5, 1.3);
      var nx = p0.x + Math.sin(e * 21) * 7 * e + e * 3, ny = p0.y - e * e * 13 + Math.sin(e * 27) * 2 * e;
      var tam = 1.45 * (1 - e * 0.8);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath(); ctx.arc(nx, ny, Math.max(0.2, tam), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = TINTA; ctx.lineWidth = 0.5; ctx.stroke();
      /* el aire que se le escapa */
      for (k = 0; k < 3; k++) {
        var a2 = e * 22 + k * 2.1;
        ctx.globalAlpha = fade * 0.5 * (1 - e);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(nx - Math.cos(a2) * (tam + 1.4 + k), ny - Math.sin(a2) * (tam + 1.4 + k), 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  });

  /* RECREATIVA: GAME OVER, el tubo se cierra en una raya y el mueble se apaga */
  conMuerte('recreativa', null, function (M, pm, o) {
    var ctx = M.ctx, k, fade = 1 - tramo(pm, 0.86, 1);
    var apaga = tramo(pm, 0.42, 0.62);
    M.enFoto(function (c) {
      c.save();
      c.beginPath(); c.rect(-4.3, 0.2, 8.4, 3.0); c.clip();
      c.fillStyle = '#04060f'; c.fillRect(-4.3, 0.2, 8.4, 3.0);
      if (apaga <= 0) {
        if ((Math.floor(pm * 16) % 2) === 0) {
          c.save(); c.scale(1, -1);
          c.fillStyle = '#ff3b30';
          c.textAlign = 'center';
          c.font = 'bold 1.45px "Courier Prime", Courier, monospace';
          c.fillText('GAME', 0, -2.35);
          c.fillText('OVER', 0, -0.85);
          c.restore();
        }
      } else {
        var h2 = (1 - apaga) * 1.35 + 0.08, w2 = 4.1 * (1 - Math.max(0, (apaga - 0.65) / 0.35));
        c.fillStyle = 'rgba(225,242,255,' + (1 - apaga * 0.25) + ')';
        c.fillRect(-w2, 1.7 - h2 / 2, w2 * 2, h2);
      }
      c.restore();
    });
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(8,8,14,' + (tramo(pm, 0.45, 0.95) * 0.65) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    var cae = suave(tramo(pm, 0.6, 1));
    M.pinta({ rot: -cae * 1.15, pf: -5.2, ps: -5.4, dy: cae * 1.2, alpha: fade });
    /* el chispazo de la placa al morir */
    if (pm > 0.4 && pm < 0.62) {
      var ch = (pm - 0.4) / 0.22, p = M.pant(-4.6, -3.0);
      for (k = 0; k < 6; k++) {
        var ak = k * 1.05 + 0.4;
        ctx.fillStyle = 'rgba(255,230,140,' + ((1 - ch) * fade) + ')';
        ctx.fillRect(p.x + Math.cos(ak) * ch * 5 - 0.3, p.y + Math.sin(ak) * ch * 5 - 0.3, 0.6, 0.6);
      }
    }
    for (k = 0; k < 6; k++) {
      var b = (pm * 1.4 + k / 6) % 1, sale = tramo(pm, 0.5 + k * 0.03, 0.75);
      ctx.fillStyle = 'rgba(30,30,34,' + (0.7 * (1 - b) * sale * fade) + ')';
      ctx.beginPath();
      ctx.arc(o.x + (k - 2.5) * 0.9 + Math.sin(b * 6 + k) * 0.8, o.y - 3 - b * 8, 0.8 + b * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  /* CANGREJO: se cuece, se pone rojo y queda patas arriba echando vapor */
  conMuerte('cangrejo', null, function (M, pm, o) {
    var ctx = M.ctx, k, u = tramo(pm, 0, 0.42);
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(255,58,26,' + (u * 0.82) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    var x = tramo(pm, 0.34, 0.66), g = suave(x), fade = 1 - tramo(pm, 0.86, 1);
    M.pinta({ sf: 1, ss: 1 - 2 * g, dy: -Math.sin(x * Math.PI) * 2.2,
      rot: pm > 0.66 ? Math.sin(pm * 45) * 0.04 : 0, alpha: fade });
    for (k = 0; k < 8; k++) {
      var b = (pm * 1.4 + k / 8) % 1, sale = tramo(pm, 0.04 + k * 0.03, 0.4);
      ctx.fillStyle = 'rgba(238,238,244,' + (0.5 * (1 - b) * sale * fade) + ')';
      ctx.beginPath();
      ctx.arc(o.x + (k - 3.5) * 1.2 + Math.sin(b * 6 + k) * 0.9, o.y - 3 - b * 9, 0.9 + b * 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (pm > 0.7) { var p = M.pant(0, -6.5); mareo(ctx, p.x, p.y, o.t, fade); }
  });

  /* CARACOL: se esconde, la concha se agrieta y se rompe en cascos; queda
   * la baba en el suelo */
  conMuerte('caracol', function (o2) { o2.escondido = true; }, function (M, pm, o) {
    var ctx = M.ctx, k, g = tramo(pm, 0.08, 0.42);
    var GRIETAS = [
      [[0.2, 0.4], [2.4, 1.6], [4.0, 0.6]],
      [[0.2, 0.4], [-1.4, 2.6], [-3.2, 3.2]],
      [[0.2, 0.4], [-0.6, -2.6], [-2.8, -3.8]],
      [[0.2, 0.4], [2.0, -1.8], [3.6, -2.8]]
    ];
    M.enFoto(function (c) {
      c.save();
      c.translate(0, 1.6);
      c.strokeStyle = '#26150a'; c.lineWidth = 0.6; c.lineJoin = 'round'; c.lineCap = 'round';
      GRIETAS.forEach(function (lin) {
        var n = (lin.length - 1) * g;
        c.beginPath(); c.moveTo(lin[0][0], lin[0][1]);
        for (var i = 1; i < lin.length && i - 1 < n; i++) {
          var fr = Math.min(1, n - (i - 1));
          c.lineTo(lin[i - 1][0] + (lin[i][0] - lin[i - 1][0]) * fr, lin[i - 1][1] + (lin[i][1] - lin[i - 1][1]) * fr);
        }
        c.stroke();
      });
      c.restore();
    }, 'source-atop');
    if (pm < 0.44) { M.pinta({ dx: Math.sin(pm * 130) * 0.3 * g }); return; }
    var e = tramo(pm, 0.44, 1), fade = 1 - tramo(pm, 0.82, 1);
    for (k = 0; k < 9; k++) {
      var col = k % 3, fil = Math.floor(k / 3);
      var tf = -3.4 + col * 3.4, ts = 5.0 - fil * 3.4;
      var p = M.pant(tf, ts), dx = p.x - o.x, dy = p.y - o.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
      var vel = 5 + (hash(k + 3) % 4);
      M.trozo(tf, ts, 3.5, dx / dl * e * vel, dy / dl * e * vel + e * e * 7, e * ((k % 2) ? 5 : -5), fade);
    }
    /* la baba se queda en el suelo */
    ctx.save();
    ctx.globalAlpha = fade * Math.min(1, e * 2);
    ctx.fillStyle = 'rgba(205,255,235,.7)';
    ctx.beginPath(); ctx.ellipse(o.x - 1, o.y + 5.4, 3.0 + e * 4, 0.8 + e * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
