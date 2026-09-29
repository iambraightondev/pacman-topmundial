  /* ---------- Las diez muertes de la tanda yōkai ----------
   * Misma maquinaria: a la skin se le saca una foto quieta y la muerte la
   * mueve, la quema, la parte o la borra. Cada yōkai se muere según su
   * leyenda: al kappa se le vacía el plato al hacer la reverencia, al tanuki
   * se le cae la hoja y solo queda la hoja, al namazu lo clava la piedra. */

  /* KITSUNE: se le apagan las colas una a una —cada una se va hecha fuego
   * fatuo— y al final ella misma es un fuego azul que se apaga. */
  conMuerte('kitsune', function (o2, pm) {
    o2.colas = 5 - Math.min(5, Math.floor(tramo(pm, 0.04, 0.5) * 5.999));
    o2.sinFuego = true;
  }, function (M, pm, o) {
    var ctx = M.ctx;
    var azul = tramo(pm, 0.45, 0.7), fin = tramo(pm, 0.55, 0.92);
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(80,160,255,' + (azul * 0.85) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ pf: 0, ps: 1, sf: 1 - fin * 0.9, ss: 1 - fin * 0.9, alpha: 1 - fin });
    [4, 3, 2, 1, 0].forEach(function (j) {
      var tv = 0.04 + 0.46 * (5 - j) / 5.999;
      var u = tramo(pm, tv, tv + 0.4);
      if (u <= 0 || u >= 1) return;
      var a = COLAS_KITSUNE[j] * Math.PI / 180, L = 8.8 - Math.abs(j - 2) * 0.5;
      var p = M.pant(-3.0 + Math.cos(a) * L, -0.4 + Math.sin(a) * L);
      llamaAzul(ctx, p.x + Math.sin(u * 7 + j) * 1.2, p.y - u * 7, 0.9 * (1 - u * 0.4), 1 - u, o.t + j, -1);
    });
    var f2 = tramo(pm, 0.6, 1);
    if (f2 > 0 && f2 < 1) {
      var pc = M.pant(0, 1);
      llamaAzul(ctx, pc.x, pc.y - f2 * 3, 1.7 * (1 - f2 * 0.6), f2 < 0.75 ? 1 : (1 - f2) / 0.25, o.t, -1);
    }
  });

  /* TENGU: se lo lleva su propio torbellino. Gira cada vez más deprisa,
   * sube, se hace pequeño y deja plumas cayendo. */
  conMuerte('tengu', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var u = tramo(pm, 0.05, 0.9), fade = 1 - tramo(pm, 0.7, 1);
    var sube = u * u * 9;
    M.pinta({ rot: u * u * 14, pf: 0, ps: 1, sf: 1 - u * 0.75, ss: 1 - u * 0.75, dy: -sube, alpha: fade });
    ctx.save();
    ctx.lineCap = 'round';
    for (k = 0; k < 4; k++) {
      var a0 = o.t * 9 + k * 1.6, r = 5 + k * 1.4 - u * 2;
      ctx.strokeStyle = 'rgba(235,245,255,' + (0.75 * fade * Math.min(1, pm * 5)) + ')';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(o.x, o.y - sube + 3 - k * 1.8, r, r * 0.32, 0, a0, a0 + 3.6);
      ctx.stroke();
    }
    ctx.restore();
    for (k = 0; k < 9; k++) {
      var d = tramo(pm, 0.1 + k * 0.05, 1);
      if (d <= 0) continue;
      var a = k * 0.7 + d * 3;
      ctx.save();
      ctx.globalAlpha = (1 - d) * 0.95;
      ctx.translate(o.x + Math.cos(a) * d * 12, o.y - sube * 0.5 + Math.sin(k * 1.3) * 3 + d * 5);
      ctx.rotate(a + d * 5);
      ctx.fillStyle = k % 2 ? '#9a7250' : '#f4f0e6';
      ctx.beginPath(); ctx.ellipse(0, 0, 1.3, 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,20,20,.6)'; ctx.lineWidth = 0.16; ctx.stroke();
      ctx.restore();
    }
  });

  /* KAPPA: le engañan con la cortesía. Hace una reverencia, se le vacía el
   * agua del plato —sin ella pierde la fuerza— y cae de bruces. */
  conMuerte('kappa', function (o2, pm) {
    o2.agua = 1 - tramo(pm, 0.16, 0.5);
  }, function (M, pm, o) {
    var ctx = M.ctx, k;
    var inclina = suave(tramo(pm, 0.02, 0.22)) * 0.85;
    var cae = rebote(tramo(pm, 0.55, 0.85));
    var fade = 1 - tramo(pm, 0.82, 1);
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(150,140,100,' + (tramo(pm, 0.45, 0.75) * 0.45) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ rot: -(inclina + cae * 0.7), pf: 0, ps: -5.5, dy: cae * 1.2, alpha: fade });
    /* el agua que se sale del plato */
    var df = 10.7 * Math.sin(inclina), ds = -5.5 + 10.7 * Math.cos(inclina);
    for (k = 0; k < 10; k++) {
      var d = tramo(pm, 0.14 + k * 0.03, 0.42 + k * 0.03);
      if (d <= 0 || d >= 1) continue;
      var p = M.pant(df + 1.2 + d * 1.5, ds);
      ctx.fillStyle = 'rgba(90,208,255,' + (1 - d * 0.5) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y + d * d * 10, 0.55, 0, Math.PI * 2); ctx.fill();
    }
    /* el charco delante */
    var ch = tramo(pm, 0.28, 0.5);
    if (ch > 0) {
      var pc = M.pant(df + 2.5, ds);
      ctx.fillStyle = 'rgba(90,208,255,' + (0.45 * fade) + ')';
      ctx.beginPath(); ctx.ellipse(pc.x, pc.y + 10, 1.5 + ch * 3, 0.5 + ch * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (cae > 0.6) {
      var pm2 = M.pant(-2, 4);
      mareo(ctx, pm2.x, pm2.y - 4, o.t, fade * tramo(pm, 0.7, 0.78));
    }
  });

  /* ONI: el MAMEMAKI del Setsubun. Le llueven judías tostadas por delante,
   * da un respingo, suelta la maza y sale huyendo encogido. */
  conMuerte('oni', function (o2, pm) {
    o2.sinMaza = pm > 0.35;
  }, function (M, pm, o) {
    var ctx = M.ctx, k;
    var huye = suave(tramo(pm, 0.45, 0.95)), fade = 1 - tramo(pm, 0.75, 1);
    var respingo = pm < 0.45 ? Math.sin(pm * 60) * 0.12 * tramo(pm, 0.05, 0.2) : 0;
    var pb = M.pant(-huye * 14, huye * 2);
    /* la maza, tirada en el suelo */
    if (pm > 0.35) {
      var pz = M.pant(-5.0, -6.0);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(pz.x, pz.y);
      ctx.rotate(-0.15);
      ctx.scale(0.85, 0.85);
      kanabo(ctx);
      ctx.restore();
    }
    M.pinta({ dx: pb.x - o.x, dy: pb.y - o.y, rot: respingo, pf: 0, ps: -3,
      sf: 1 - huye * 0.5, ss: 1 - huye * 0.5, alpha: fade });
    /* las judías */
    for (k = 0; k < 16; k++) {
      var tb = 0.02 + k * 0.025;
      var u = tramo(pm, tb, tb + 0.12);
      if (u <= 0) continue;
      var s0 = ((hash(k * 13 + 5) % 100) / 100 - 0.5) * 9;
      var f, s, al = 1;
      if (u < 1) { f = 17 - u * 12; s = s0; }
      else {
        var b = tramo(pm, tb + 0.12, tb + 0.42);
        f = 5 + b * 6; s = s0 + Math.sin(b * Math.PI) * 3 - b * 5; al = 1 - b;
        if (b < 0.25) {
          var pi = M.pant(5, s0);
          estrella4(ctx, pi.x, pi.y, 0.9, '#fff6d0', (1 - b * 4) * 0.9);
        }
      }
      if (al <= 0) continue;
      var p = M.pant(f, s);
      ctx.save();
      ctx.globalAlpha = al;
      ctx.fillStyle = '#e8d49a';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.6, 0.48, k, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,20,.9)'; ctx.lineWidth = 0.16; ctx.stroke();
      ctx.restore();
    }
  });

  /* TANUKI: se le cae la hoja de la cabeza, ¡DORON!, se deshace el truco y
   * solo queda la hoja cayendo. Nunca hubo tanuki. */
  conMuerte('tanuki', function (o2) {
    o2.sinHoja = true;
  }, function (M, pm, o) {
    var ctx = M.ctx;
    var puf = tramo(pm, 0.08, 0.42);
    var cuerpo = 1 - tramo(pm, 0.14, 0.2);
    if (cuerpo > 0) M.pinta({ alpha: cuerpo });
    if (puf > 0 && puf < 1) {
      var pc = M.pant(0.5, 0.5);
      humoPuf(ctx, pc.x, pc.y, Math.min(1, puf * 1.6), puf < 0.6 ? 1 : (1 - puf) / 0.4, 7);
    }
    var p0 = M.pant(0.4, 5.3);
    var sube = Math.sin(tramo(pm, 0, 0.2) * Math.PI / 2) * 3;
    var cae = tramo(pm, 0.2, 1);
    ctx.save();
    ctx.globalAlpha = 1 - tramo(pm, 0.88, 1);
    hojaTanuki(ctx, p0.x + Math.sin(cae * 9) * 3 * cae, p0.y - sube + cae * 12, Math.sin(cae * 9) * 0.8);
    ctx.restore();
  });

  /* DARUMA: el que nunca se cae. Le dan un golpe y se endereza; otro, y
   * se endereza; al tercero se raja por la mitad y cada mitad cae por su lado. */
  function grietaDaruma(lado) {
    return function (c) {
      c.beginPath();
      var P = [[0.8, 7.5], [0.1, 4.6], [1.4, 2.0], [0.3, -0.6], [1.3, -3.0], [0.2, -5.4], [0.9, -7.5]];
      P.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
      c.lineTo(lado * 10, -7.5); c.lineTo(lado * 10, 7.5); c.closePath();
    };
  }
  conMuerte('daruma', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    if (pm < 0.52) {
      var r1 = pm / 0.52;
      var rot = Math.sin(r1 * Math.PI * 4) * 0.8 * (1 - r1 * 0.35);
      M.pinta({ rot: rot, pf: 0, ps: -6.2 });
      var golpe = Math.abs(Math.sin(r1 * Math.PI * 4));
      if (golpe > 0.9) { var pg = M.pant(5.5, 1); estrella4(ctx, pg.x, pg.y, 1.4, '#fff6d0', (golpe - 0.9) * 10); }
      return;
    }
    var u = tramo(pm, 0.52, 1), fade = 1 - tramo(pm, 0.8, 1);
    M.pinta({ clip: grietaDaruma(-1), rot: u * 0.9, pf: -5, ps: -6.2, dx: -u * 2.5, dy: u * u * 3, alpha: fade });
    M.pinta({ clip: grietaDaruma(1), rot: -u * 0.9, pf: 5, ps: -6.2, dx: u * 2.5, dy: u * u * 3, alpha: fade });
    if (u < 0.3) {
      var pc = M.pant(0.8, 0.5);
      estrella4(ctx, pc.x, pc.y, 2 + u * 8, '#ffffff', 1 - u / 0.3);
    }
    /* virutas de papel maché */
    for (k = 0; k < 7; k++) {
      var d = tramo(pm, 0.52 + k * 0.02, 1);
      var p = M.pant(0.8 + (k - 3) * 0.6, 4 - k * 1.4);
      ctx.fillStyle = mix(k % 2 ? '#fbf3e4' : '#d42a22', '#000000', 0, (1 - d) * fade);
      ctx.fillRect(p.x + (k - 3) * d * 3, p.y - d * 4 + d * d * 9, 0.7, 0.7);
    }
  });

  /* MANEKI-NEKO: se tambalea, se hace añicos como la porcelana que es y el
   * cascabel sale rodando tintineando. */
  conMuerte('maneki', function (o2, pm) {
    o2.sinCascabel = pm > 0.3;
  }, function (M, pm, o) {
    var ctx = M.ctx, k;
    if (pm < 0.3) {
      M.pinta({ rot: Math.sin(pm * 45) * 0.16 * (pm / 0.3), pf: 0, ps: -6.5 });
      return;
    }
    var u = tramo(pm, 0.3, 1), fade = 1 - tramo(pm, 0.7, 0.95);
    var p0 = M.pant(0, 1), n = 0;
    for (var f = -5.5; f <= 6.5; f += 2.4) {
      for (var s = -6.5; s <= 8.5; s += 2.4) {
        var h = (hash(n * 31 + 7) % 100) / 100; n++;
        var p1 = M.pant(f, s);
        var dx = p1.x - p0.x, dy = p1.y - p0.y, dl = Math.max(0.5, Math.sqrt(dx * dx + dy * dy));
        var dist = u * (3 + h * 5);
        M.trozo(f, s, 2.4, dx / dl * dist, dy / dl * dist * 0.7 + u * u * 6, u * (h - 0.5) * 7, fade);
      }
    }
    if (u < 0.25) {
      var pc = M.pant(1, 1);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - u * 4) + ')'; ctx.lineWidth = 0.35; ctx.lineCap = 'round';
      ctx.beginPath();
      for (k = 0; k < 8; k++) {
        var a = k * Math.PI / 4;
        ctx.moveTo(pc.x + Math.cos(a) * (4 + u * 10), pc.y + Math.sin(a) * (4 + u * 10));
        ctx.lineTo(pc.x + Math.cos(a) * (6 + u * 14), pc.y + Math.sin(a) * (6 + u * 14));
      }
      ctx.stroke();
      ctx.restore();
    }
    /* el cascabel, rodando */
    var bote = Math.abs(Math.sin(u * Math.PI * 3)) * 3 * (1 - u);
    var pb = M.pant(1.4 + u * 13, -2.4);
    ctx.save();
    ctx.globalAlpha = 1 - tramo(pm, 0.88, 1);
    ctx.translate(pb.x, pb.y - bote);
    ctx.rotate(u * 12);
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(0, 0, 0.95, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.3; ctx.stroke();
    ctx.strokeStyle = '#a97d0d'; ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(-0.8, 0); ctx.lineTo(0.8, 0); ctx.moveTo(0, 0); ctx.lineTo(0, 0.8); ctx.stroke();
    ctx.restore();
  });

  /* KASA-OBAKE: una racha de viento le da la vuelta como a los paraguas de
   * verdad y se lo lleva dando vueltas. */
  conMuerte('kasa', function (o2, pm) {
    o2.vuelta = suave(tramo(pm, 0.08, 0.3));
  }, function (M, pm, o) {
    var ctx = M.ctx, k;
    var vuela = tramo(pm, 0.3, 1), fade = 1 - tramo(pm, 0.72, 1);
    var p = M.pant(-vuela * vuela * 14, 0);
    M.pinta({ dx: p.x - o.x, dy: p.y - o.y - vuela * 7, rot: vuela * vuela * 9, pf: 0, ps: 0,
      sf: 1 - vuela * 0.3, ss: 1 - vuela * 0.3, alpha: fade });
    ctx.save();
    ctx.lineCap = 'round';
    for (k = 0; k < 4; k++) {
      var u = (pm * 2.5 + k / 4) % 1;
      var a = (1 - u) * Math.min(1, pm * 5) * fade * 0.85;
      var q0 = M.pant(12 - u * 24, -3 + k * 2.4), q1 = M.pant(17 - u * 24, -3 + k * 2.4);
      ctx.strokeStyle = 'rgba(235,245,255,' + a + ')'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(q1.x, q1.y); ctx.lineTo(q0.x, q0.y);
      ctx.arc(q0.x, q0.y - 0.9, 0.9, Math.PI / 2, Math.PI * 2.2, false);
      ctx.stroke();
    }
    ctx.restore();
  });

  /* CHŌCHIN-OBAKE: se le apaga la vela, el papel se pliega como un acordeón
   * y queda un hilo de humo. */
  conMuerte('chochin', function (o2, pm) {
    o2.apagado = tramo(pm, 0.03, 0.22);
  }, function (M, pm, o) {
    var ctx = M.ctx, k;
    var aplasta = suave(tramo(pm, 0.25, 0.6)), fade = 1 - tramo(pm, 0.78, 1);
    M.pinta({ ss: 1 - aplasta * 0.78, sf: 1 + aplasta * 0.15, pf: 0, ps: -6.6,
      dy: tramo(pm, 0.6, 0.9) * 1.5, alpha: fade });
    /* el último parpadeo de la vela */
    if (pm < 0.22) {
      var pv = M.pant(2.4, -0.6);
      var fl = (1 - pm / 0.22) * (Math.floor(pm * 40) % 2 ? 0.3 : 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(pv.x, pv.y, 0.1, pv.x, pv.y, 4);
      g.addColorStop(0, 'rgba(255,210,110,' + fl + ')');
      g.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(pv.x, pv.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (k = 0; k < 6; k++) {
      var u = tramo(pm, 0.18 + k * 0.05, 0.92 + k * 0.01);
      if (u <= 0 || u >= 1) continue;
      var p = M.pant(1.0, 5.6 - aplasta * 9);
      ctx.fillStyle = 'rgba(170,166,180,' + ((1 - u) * 0.45) + ')';
      ctx.beginPath(); ctx.arc(p.x + Math.sin(u * 6 + k) * 1.5, p.y - u * 11, 0.6 + u * 1.6, 0, Math.PI * 2); ctx.fill();
    }
  });

  /* NAMAZU: el dios Kashima le clava encima la KANAME-ISHI, la piedra que
   * sujeta el mundo. Cae del cielo con su cuerda sagrada y lo aplasta. */
  function kanameIshi(ctx) {
    var P = [[-4.6, 0.6], [-3.8, 3.6], [-1.0, 4.8], [2.4, 4.4], [4.6, 2.0], [4.8, -1.4], [3.0, -4.0], [-0.6, -4.6], [-3.6, -3.2]];
    var roca = function () {
      ctx.beginPath();
      P.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.closePath();
    };
    piezaX(ctx, roca, '#9a9ea8', '#4a4e58', 0.8, -0.8, 1.8);
    ctx.save(); roca(); ctx.clip();
    ctx.strokeStyle = 'rgba(40,42,50,.5)'; ctx.lineWidth = 0.25;
    ctx.beginPath(); ctx.moveTo(-2.6, -2.6); ctx.lineTo(-1.0, -1.0); ctx.moveTo(2.4, 3.0); ctx.lineTo(3.4, 1.4); ctx.stroke();
    /* la shimenawa, la cuerda de paja trenzada */
    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(-5, 0.6); ctx.quadraticCurveTo(0, -0.6, 5, 0.6); ctx.stroke();
    ctx.strokeStyle = '#e8d49a'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = '#a88c4a'; ctx.lineWidth = 0.2;
    ctx.beginPath();
    for (var k = 0; k < 9; k++) { ctx.moveTo(-4.4 + k * 1.1, 0.8); ctx.lineTo(-3.8 + k * 1.1, -0.4); }
    ctx.stroke();
    ctx.restore();
    /* los flecos de paja que cuelgan de la cuerda */
    [-2.6, 0, 2.6].forEach(function (x) {
      ctx.strokeStyle = '#c8a860'; ctx.lineWidth = 0.28; ctx.lineCap = 'round';
      ctx.beginPath();
      for (var k = -1; k <= 1; k++) { ctx.moveTo(x + k * 0.25, -0.2); ctx.lineTo(x + k * 0.4, -1.6); }
      ctx.stroke();
    });
    /* motas de la piedra */
    ctx.fillStyle = 'rgba(40,42,50,.35)';
    [[-2.8, 2.4], [1.2, 3.2], [3.2, -2.6], [-1.6, -3.0], [2.8, 1.2]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 0.3, 0, Math.PI * 2); ctx.fill();
    });
  }
  conMuerte('namazu', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var cae = tramo(pm, 0.02, 0.3), aplasta = tramo(pm, 0.3, 0.36), fade = 1 - tramo(pm, 0.8, 1);
    M.pinta({ ss: 1 - aplasta * 0.4, sf: 1 + aplasta * 0.15, pf: 0, ps: -3, alpha: fade });
    var pc = M.pant(-0.5, 0.2);
    /* la sombra que crece antes de que llegue */
    if (cae < 1) {
      ctx.fillStyle = 'rgba(0,0,0,' + (cae * 0.55) + ')';
      ctx.beginPath(); ctx.ellipse(pc.x, pc.y, 5 * (0.4 + cae * 0.6), 4 * (0.4 + cae * 0.6), 0, 0, Math.PI * 2); ctx.fill();
    }
    var esc = 1 + (1 - cae * cae) * 1.7;
    ctx.save();
    ctx.globalAlpha = Math.min(1, cae * 3) * fade;
    ctx.translate(pc.x, pc.y);
    ctx.scale(esc * 0.95, esc * 0.95);
    kanameIshi(ctx);
    ctx.restore();
    /* el golpe */
    var gol = tramo(pm, 0.3, 0.6);
    if (gol > 0 && gol < 1) {
      ctx.strokeStyle = 'rgba(214,170,110,' + (1 - gol) + ')'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.ellipse(pc.x, pc.y, 6 + gol * 9, 5 + gol * 7, 0, 0, Math.PI * 2); ctx.stroke();
      for (k = 0; k < 8; k++) {
        var a = k * Math.PI / 4 + 0.2;
        ctx.fillStyle = 'rgba(170,140,100,' + (1 - gol) + ')';
        ctx.beginPath(); ctx.arc(pc.x + Math.cos(a) * (6 + gol * 8), pc.y + Math.sin(a) * (5 + gol * 6), 0.5 + gol, 0, Math.PI * 2); ctx.fill();
      }
    }
    /* burbujitas: el último suspiro */
    for (k = 0; k < 4; k++) {
      var b = tramo(pm, 0.45 + k * 0.08, 0.85 + k * 0.04);
      if (b <= 0 || b >= 1) continue;
      var pb = M.pant(7.5, -0.5);
      ctx.strokeStyle = 'rgba(190,230,255,' + (1 - b) + ')'; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.arc(pb.x + Math.sin(b * 8 + k) * 0.8, pb.y - b * 7, 0.4 + b * 0.4, 0, Math.PI * 2); ctx.stroke();
    }
  });
