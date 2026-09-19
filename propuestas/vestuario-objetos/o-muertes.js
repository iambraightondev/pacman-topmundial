  /* ---------- Las ocho muertes de la tanda de objetos ----------
   * Misma maquinaria que siempre: a la skin se le saca una foto quieta y la
   * muerte mueve, quema, parte o borra esa foto. Una cosa no se muere: se
   * rompe, se funde o se queda sin corriente, y eso es lo que se dibuja. */

  /* MÁQUINA DE DISCOS: se raya el disco, el neón parpadea hasta apagarse y
   * el vinilo sale rodando por la ranura */
  conMuerte('discos', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var tiembla = pm < 0.35 ? Math.sin(pm * 70) * 0.5 * (1 - pm / 0.35) : 0;
    var apaga = tramo(pm, 0.1, 0.6);
    var cae = suave(tramo(pm, 0.55, 1));
    var fade = 1 - tramo(pm, 0.82, 1);
    /* se le va la luz: la foto se apaga a negro */
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(8,8,14,' + (apaga * 0.82) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ dx: tiembla, dy: cae * 2.2, rot: cae * 0.22, pf: -2, ps: -5, alpha: fade });
    /* el chirrido de la aguja, dos rayas que cruzan */
    if (pm < 0.3) {
      var ch = 1 - pm / 0.3;
      ctx.strokeStyle = 'rgba(255,255,255,' + (ch * 0.8) + ')';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (k = 0; k < 2; k++) {
        var p0 = M.pant(-3 + k * 2, 2.5 - k * 3);
        ctx.moveTo(p0.x - 4, p0.y); ctx.lineTo(p0.x + 4, p0.y + 1.5);
      }
      ctx.stroke();
    }
    /* el disco, rodando */
    var d = tramo(pm, 0.3, 1);
    if (d > 0) {
      var p = M.pant(6 + d * 16, -3.5 + Math.abs(Math.sin(d * 9)) * 2.5);
      ctx.save();
      ctx.globalAlpha = fade * (1 - d * 0.35);
      ctx.translate(p.x, p.y);
      ctx.rotate(d * 14);
      ctx.fillStyle = '#16161f';
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 0.16;
      for (k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, 0.8 + k * 0.42, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = o.c;
      ctx.beginPath(); ctx.arc(0, 0, 0.7, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.restore();
    }
  });

  /* TELEVISOR: la imagen se cierra en una raya, luego en un punto, y el
   * mueble se queda muerto echando humo */
  conMuerte('tele', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var cierra = tramo(pm, 0.1, 0.45);
    var fade = 1 - tramo(pm, 0.8, 1);
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(6,7,12,' + (cierra * 0.9) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ dy: suave(tramo(pm, 0.6, 1)) * 1.6, rot: suave(tramo(pm, 0.6, 1)) * 0.12,
      pf: -2, ps: -4, alpha: fade });
    /* la raya del tubo al apagarse */
    var p = M.pant(0.3, 2.0);
    if (cierra > 0.05 && pm < 0.72) {
      var raya = (pm < 0.5) ? 1 : Math.max(0, 1 - (pm - 0.5) / 0.22);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(200,255,220,' + (0.95 * fade) + ')';
      var anchoR = 7.4 * raya + 0.6;
      ctx.fillRect(p.x - anchoR / 2, p.y - 0.28, anchoR, 0.56);
      if (raya < 0.4) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 0.5 + raya, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    /* humo por detrás */
    for (k = 0; k < 5; k++) {
      var u = tramo(pm, 0.45 + k * 0.08, 1);
      if (u <= 0) continue;
      var ph = M.pant(-6 - u * 2, 4 + u * 9);
      ctx.fillStyle = 'rgba(120,120,132,' + ((1 - u) * 0.5 * fade) + ')';
      ctx.beginPath();
      ctx.arc(ph.x + Math.sin(u * 6 + k) * 2.2, ph.y, 1.0 + u * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  /* CABINA: los cristales se rajan, estallan en trozos y el armazón se vence */
  conMuerte('cabina', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var raja = tramo(pm, 0.05, 0.3);
    var estalla = tramo(pm, 0.3, 0.62);
    var cae = rebote(tramo(pm, 0.45, 0.95));
    var fade = 1 - tramo(pm, 0.85, 1);
    M.pinta({ rot: -cae * 1.1, pf: -4.5, ps: -6, dy: cae * 1.2, alpha: fade });
    /* las rajas, antes de reventar */
    if (raja > 0 && estalla < 0.05) {
      ctx.strokeStyle = 'rgba(235,250,255,' + (raja * 0.9) + ')';
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      for (k = 0; k < 5; k++) {
        var c0 = M.pant(-2 + k * 1.4, 3.5 - k * 0.9);
        ctx.moveTo(c0.x, c0.y);
        ctx.lineTo(c0.x + (k % 2 ? 2.4 : -2.0) * raja, c0.y + 3.2 * raja);
      }
      ctx.stroke();
    }
    /* los cristales volando */
    if (estalla > 0) {
      for (k = 0; k < 14; k++) {
        var sem = hash(k * 3 + 1) % 100;
        var ang2 = (sem / 100) * Math.PI * 2;
        var dd = estalla * (4 + (sem % 7));
        var pc = M.pant(Math.cos(ang2) * dd, 2 + Math.sin(ang2) * dd - estalla * 3);
        ctx.save();
        ctx.globalAlpha = (1 - estalla) * fade;
        ctx.translate(pc.x, pc.y);
        ctx.rotate(ang2 + estalla * 6);
        ctx.fillStyle = 'rgba(175,220,245,.85)';
        ctx.beginPath();
        ctx.moveTo(0, -0.9); ctx.lineTo(0.8, 0.3); ctx.lineTo(-0.5, 0.9);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.16; ctx.stroke();
        ctx.restore();
      }
    }
  });

  /* CÁMARA: se le vela el carrete —un fogonazo blanco que la come— y queda
   * el cuerpo desarmado con la película saliéndose */
  conMuerte('camara', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var vela = tramo(pm, 0.06, 0.34);
    var fade = 1 - tramo(pm, 0.78, 1);
    var cae = suave(tramo(pm, 0.4, 1));
    /* la foto se quema a blanco y luego se apaga */
    M.enFoto(function (c) {
      var q2 = (pm < 0.34) ? vela : Math.max(0, 1 - (pm - 0.34) / 0.3);
      c.fillStyle = 'rgba(255,255,255,' + (q2 * 0.95) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ dy: cae * 4.5, rot: cae * 0.5, pf: -2, ps: -3, alpha: fade });
    /* el fogonazo */
    if (pm < 0.34) {
      var p = M.pant(-1.4, 3.8);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(p.x, p.y, 0.3, p.x, p.y, 6 + vela * 16);
      g.addColorStop(0, 'rgba(255,255,255,' + (1 - vela) + ')');
      g.addColorStop(1, 'rgba(210,235,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6 + vela * 16, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    /* la tira de película, saliéndose */
    var tira = tramo(pm, 0.3, 0.95);
    if (tira > 0) {
      var pt = M.pant(-5.5, -1.5);
      ctx.save();
      ctx.globalAlpha = fade * (1 - tira * 0.3);
      ctx.strokeStyle = '#3a2b1e'; ctx.lineWidth = 1.5; ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      for (k = 1; k <= 5; k++) {
        ctx.lineTo(pt.x - k * 2.4 * tira, pt.y + Math.sin(k * 1.4 + tira * 5) * 2.4 * tira);
      }
      ctx.stroke();
      ctx.restore();
    }
  });

  /* DESPERTADOR: salta el muelle, las agujas salen disparadas y las dos
   * campanas se le caen */
  conMuerte('reloj', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var salta = tramo(pm, 0.02, 0.22);
    var fade = 1 - tramo(pm, 0.8, 1);
    var cae = rebote(tramo(pm, 0.25, 0.85));
    M.pinta({ dy: -salta * 3 + cae * 4.5, rot: cae * 0.9, pf: 0, ps: -3, alpha: fade });
    /* el muelle que se escapa por arriba */
    var mu = tramo(pm, 0.05, 0.6);
    if (mu > 0 && mu < 1) {
      var pmu = M.pant(0.5, 7 + mu * 9);
      ctx.save();
      ctx.globalAlpha = (1 - mu) * fade;
      ctx.strokeStyle = '#b9bdc8'; ctx.lineWidth = 0.42; ctx.lineCap = 'round';
      ctx.beginPath();
      for (k = 0; k <= 16; k++) {
        var uu = k / 16;
        var x2 = pmu.x + Math.sin(uu * 9) * 1.6 * (1 - uu * 0.4);
        var y2 = pmu.y + uu * 4.5;
        if (k === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.restore();
    }
    /* las dos agujas, volando */
    [[-1, 2.1], [1, 1.5]].forEach(function (ag, k2) {
      var d = tramo(pm, 0.1 + k2 * 0.07, 0.9);
      if (d <= 0) return;
      var pa = M.pant(ag[0] * d * 13, 2 + d * 7 - d * d * 9);
      ctx.save();
      ctx.globalAlpha = (1 - d) * fade;
      ctx.translate(pa.x, pa.y);
      ctx.rotate(d * 11 * ag[0]);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 0.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-ag[1], 0); ctx.lineTo(ag[1], 0); ctx.stroke();
      ctx.restore();
    });
  });

  /* SEMÁFORO: se le funden las tres luces de arriba abajo y el poste se
   * dobla hasta el suelo */
  conMuerte('semaforo', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var fade = 1 - tramo(pm, 0.82, 1);
    var dobla = suave(tramo(pm, 0.3, 0.95));
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(10,12,16,' + (tramo(pm, 0.05, 0.5) * 0.8) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ rot: dobla * 1.35, pf: 0, ps: -6, dy: dobla * 1.4, alpha: fade });
    /* el fundido de cada bombilla, con su chispazo */
    [[4.4, 0.05], [1.6, 0.16], [-2.6, 0.27]].forEach(function (lz, k2) {
      var u = tramo(pm, lz[1], lz[1] + 0.12);
      if (u <= 0 || u >= 1) return;
      var p = M.pant(0.1, lz[0]);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,235,' + ((1 - u) * fade) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 + u * 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,240,200,' + ((1 - u) * 0.9 * fade) + ')';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      for (k = 0; k < 4; k++) {
        var a3 = k * Math.PI / 2 + u * 2 + k2;
        ctx.moveTo(p.x + Math.cos(a3) * 1.4, p.y + Math.sin(a3) * 1.4);
        ctx.lineTo(p.x + Math.cos(a3) * (2 + u * 4), p.y + Math.sin(a3) * (2 + u * 4));
      }
      ctx.stroke();
    });
  });

  /* CAJA FUERTE: un reventón le arranca la puerta y se queda vacía, con las
   * monedas rodando por el suelo */
  conMuerte('caja', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var boom = tramo(pm, 0.08, 0.26);
    var fade = 1 - tramo(pm, 0.82, 1);
    var retro = (pm < 0.4) ? Math.sin(Math.min(1, pm / 0.2) * Math.PI) : 0;
    M.pinta({ dx: -retro * 2.2, rot: suave(tramo(pm, 0.4, 1)) * 0.45,
      pf: -3, ps: -5, dy: suave(tramo(pm, 0.4, 1)) * 2.4, alpha: fade });
    /* el fogonazo del reventón */
    if (boom > 0 && boom < 1) {
      var p = M.pant(5, -1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(p.x, p.y, 0.3, p.x, p.y, 3 + boom * 12);
      g.addColorStop(0, 'rgba(255,245,200,' + (1 - boom) + ')');
      g.addColorStop(0.45, 'rgba(255,170,40,' + (0.7 * (1 - boom)) + ')');
      g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3 + boom * 12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    /* la puerta, saliendo por los aires */
    var d = tramo(pm, 0.1, 0.9);
    if (d > 0) {
      var pd = M.pant(6 + d * 18, -2 + d * 5 - d * d * 11);
      ctx.save();
      ctx.globalAlpha = (1 - d * 0.5) * fade;
      ctx.translate(pd.x, pd.y);
      ctx.rotate(d * 7);
      ctx.fillStyle = '#2b2f3a';
      roundRect(ctx, -3.4, -1.9, 6.8, 3.8, 0.5); ctx.fill();
      contorno(ctx, 1.5); ctx.stroke();
      ctx.restore();
    }
    /* las monedas, rodando */
    for (k = 0; k < 9; k++) {
      var u = tramo(pm, 0.14 + k * 0.03, 1);
      if (u <= 0) continue;
      var pc = M.pant(3 + u * (8 + (k % 4) * 4), -4.5 + Math.abs(Math.sin(u * 7 + k)) * 3 * (1 - u));
      ctx.save();
      ctx.globalAlpha = (1 - u) * fade;
      ctx.translate(pc.x, pc.y);
      ctx.scale(Math.abs(Math.cos(u * 15 + k)) * 0.75 + 0.25, 1);
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath(); ctx.arc(0, 0, 0.85, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.1); ctx.stroke();
      ctx.restore();
    }
  });

  /* BOLA DE DISCOTECA: se le sueltan los espejitos uno a uno, se apagan los
   * haces y lo que queda cae y revienta */
  conMuerte('bola', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var suelta = tramo(pm, 0.05, 0.6);
    var cae = suave(tramo(pm, 0.4, 0.86));
    var revienta = tramo(pm, 0.84, 1);
    var fade = 1 - tramo(pm, 0.86, 1);
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(16,18,26,' + (suelta * 0.75) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    if (revienta <= 0) {
      M.pinta({ dy: cae * 7, rot: cae * 1.6, pf: 0, ps: 0, alpha: fade });
    }
    /* los espejitos que se van cayendo */
    for (k = 0; k < 18; k++) {
      var d = tramo(pm, 0.03 + k * 0.035, 1);
      if (d <= 0) continue;
      var sem = hash(k * 5 + 2) % 100;
      var lx = ((sem / 100) - 0.5) * 11;
      var p = M.pant(lx, 1 - d * 12 + Math.sin(d * 4 + k) * 1.2);
      ctx.save();
      ctx.globalAlpha = (1 - d) * fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(d * 8 + k);
      ctx.fillStyle = mix('#c6d4ea', PRISMA[k % PRISMA.length], 0.3);
      ctx.fillRect(-0.62, -0.62, 1.24, 1.24);
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.14;
      ctx.strokeRect(-0.62, -0.62, 1.24, 1.24);
      ctx.restore();
    }
    /* el golpe final */
    if (revienta > 0) {
      var pg = M.pant(0, -6);
      for (k = 0; k < 10; k++) {
        var a4 = k * 0.628 + 0.3, dd = revienta * 9;
        ctx.save();
        ctx.globalAlpha = 1 - revienta;
        ctx.translate(pg.x + Math.cos(a4) * dd, pg.y + Math.sin(a4) * dd * 0.5);
        ctx.rotate(a4);
        ctx.fillStyle = '#cfdcee';
        ctx.fillRect(-0.5, -0.5, 1.0, 1.0);
        ctx.restore();
      }
    }
  });
