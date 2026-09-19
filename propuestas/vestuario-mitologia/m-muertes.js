  /* ---------- Las diez muertes de la tanda de mitología ----------
   * Misma maquinaria: a la skin se le saca una foto quieta y la muerte la
   * mueve, la quema, la parte o la borra. Cada una se muere de lo suyo: la
   * que petrifica acaba petrificada, al de la lámpara se lo traga la lámpara
   * y al de las alas de cera se le derrite la cera. */

  /* MEDUSA: acaba petrificada ella misma. Se vuelve piedra de las serpientes
   * hacia abajo, se queda tiesa y se agrieta. */
  conMuerte('medusa', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var piedra = tramo(pm, 0.05, 0.5);
    var fade = 1 - tramo(pm, 0.86, 1);
    var cae = suave(tramo(pm, 0.55, 0.95));
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(146,148,152,' + (piedra * 0.92) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ rot: cae * 0.55, pf: -3, ps: -5, dy: cae * 3.2, alpha: fade });
    /* las grietas, cuando ya es piedra del todo */
    var raja = tramo(pm, 0.45, 0.8);
    if (raja > 0) {
      ctx.strokeStyle = 'rgba(40,40,44,' + (raja * 0.85 * fade) + ')';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      for (k = 0; k < 5; k++) {
        var p0 = M.pant(-3 + k * 1.8, 3 - k * 1.2);
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p0.x + (k % 2 ? 2.2 : -1.8) * raja, p0.y + 2.6 * raja);
      }
      ctx.stroke();
    }
    /* cascotes que se desprenden */
    for (k = 0; k < 8; k++) {
      var d = tramo(pm, 0.6 + k * 0.03, 1);
      if (d <= 0) continue;
      var pc = M.pant((k - 3.5) * 2.0, -2 - d * 7);
      ctx.save();
      ctx.globalAlpha = (1 - d) * fade;
      ctx.translate(pc.x, pc.y);
      ctx.rotate(d * 5 + k);
      ctx.fillStyle = '#8c8e94';
      ctx.fillRect(-0.7, -0.6, 1.4, 1.2);
      ctx.strokeStyle = 'rgba(30,30,34,.7)'; ctx.lineWidth = 0.18;
      ctx.strokeRect(-0.7, -0.6, 1.4, 1.2);
      ctx.restore();
    }
  });

  /* CÍCLOPE: se le cierra el ojo, da dos tumbos y se desploma de bruces */
  conMuerte('ciclope', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var tumbo = pm < 0.35 ? Math.sin(pm * 34) * 0.16 * (1 - pm / 0.35) : 0;
    var cae = rebote(tramo(pm, 0.3, 0.7));
    var fade = 1 - tramo(pm, 0.84, 1);
    M.pinta({ rot: tumbo + cae * 1.5, pf: 2, ps: -5, dy: cae * 2.0, alpha: fade });
    /* el párpado que baja: una tapa del color de la piel sobre el ojo */
    var cierra = tramo(pm, 0.02, 0.28);
    if (cierra > 0 && cae < 0.5) {
      M.enFoto(function (c) {
        c.fillStyle = 'rgba(160,110,60,' + (cierra * 0.95) + ')';
        c.beginPath();
        c.ellipse(1.9, -2.0, 2.7, 2.5 * cierra, 0, 0, Math.PI * 2);
        c.fill();
      }, 'source-atop');
    }
    /* el polvazo del golpe */
    if (cae > 0.5) {
      var golpe = tramo(pm, 0.5, 0.8);
      for (k = 0; k < 8; k++) {
        ctx.fillStyle = 'rgba(180,152,112,' + (0.55 * Math.sin(golpe * Math.PI) * fade) + ')';
        ctx.beginPath();
        ctx.arc(o.x + (k - 3.5) * 3.2 * golpe, o.y + 6 - golpe * 2,
          1.2 + golpe * 3.0, 0, Math.PI * 2);
        ctx.fill();
      }
      var p = M.pant(0, 8);
      mareo(ctx, p.x, p.y, o.t, fade * tramo(pm, 0.6, 0.75));
    }
  });

  /* FÉNIX: arde hasta la ceniza, la ceniza brilla un instante —amaga con
   * renacer— y se apaga. Es lo que lo hace fénix. */
  conMuerte('fenix', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var arde = tramo(pm, 0.02, 0.35);
    var ceniza = tramo(pm, 0.3, 0.62);
    var amago = (pm > 0.62 && pm < 0.82) ? Math.sin((pm - 0.62) / 0.2 * Math.PI) : 0;
    var fade = 1 - tramo(pm, 0.8, 1);
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(255,220,120,' + (arde * (1 - ceniza) * 0.95) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
      c.fillStyle = 'rgba(58,54,52,' + (ceniza * 0.95) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ dy: suave(tramo(pm, 0.35, 0.9)) * 3.5, alpha: fade * (1 - ceniza * 0.35) });
    /* las brasas que suben */
    for (k = 0; k < 12; k++) {
      var d = tramo(pm, 0.03 + k * 0.05, 1);
      if (d <= 0) continue;
      var p = M.pant((k - 5.5) * 1.4 + Math.sin(d * 5 + k) * 1.8, 2 + d * 13);
      ctx.fillStyle = mix('#ffd24a', '#ff3b0a', d, (1 - d) * fade);
      ctx.beginPath(); ctx.arc(p.x, p.y, 0.8 * (1 - d * 0.6), 0, Math.PI * 2); ctx.fill();
    }
    /* el amago de renacer */
    if (amago > 0) {
      var pa = M.pant(0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(pa.x, pa.y, 0.5, pa.x, pa.y, 4 + amago * 7);
      g.addColorStop(0, 'rgba(255,240,180,' + (0.8 * amago) + ')');
      g.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(pa.x, pa.y, 4 + amago * 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });

  /* GENIO: lo llama la lámpara. Se estira, se hace humo y entra por la boca
   * de la lámpara, que da un último destello. */
  conMuerte('genio', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var tira = tramo(pm, 0.08, 0.72);
    var fade = 1 - tramo(pm, 0.6, 0.9);
    /* se estira hacia atrás y abajo, hacia donde está la lámpara */
    M.pinta({ dx: -tira * 7, dy: -tira * 5.5, sf: 1 - tira * 0.8, ss: 1 - tira * 0.8,
      rot: tira * 0.9, pf: 0, ps: 0, alpha: fade });
    /* el hilo de humo que se lo traga */
    var lp = M.pant(-7.8, -5.6);
    ctx.save();
    ctx.globalAlpha = Math.min(1, tira * 2) * (1 - tramo(pm, 0.75, 1));
    for (k = 0; k < 8; k++) {
      var u = k / 8;
      var px = lp.x + (1 - u) * tira * 7, py = lp.y - (1 - u) * tira * 5.5;
      ctx.fillStyle = 'rgba(94,168,200,' + (0.5 * (1 - u)) + ')';
      ctx.beginPath();
      ctx.arc(px + Math.sin(o.t * 4 + u * 5) * 1.2, py, 1.6 * (1 - u * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    /* la lámpara se queda, y destella al cerrarse */
    ctx.save();
    ctx.globalAlpha = 1 - tramo(pm, 0.9, 1);
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.ellipse(lp.x, lp.y, 2.0, 1.1, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,20,.8)'; ctx.lineWidth = 0.4; ctx.stroke();
    var fin = (pm > 0.72 && pm < 0.86) ? Math.sin((pm - 0.72) / 0.14 * Math.PI) : 0;
    if (fin > 0) estrella4(ctx, lp.x, lp.y - 1.4, 1.2 + fin * 1.6, '#fff6d0', fin);
    ctx.restore();
  });

  /* GOLEM: se le apaga la runa y, sin nada que lo sujete, se desmorona en
   * bloques que caen uno detrás de otro */
  conMuerte('golem', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var apaga = tramo(pm, 0.02, 0.22);
    var cae = tramo(pm, 0.2, 0.9);
    var fade = 1 - tramo(pm, 0.8, 1);
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(40,42,48,' + (apaga * 0.55) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    /* el cuerpo se va en trozos: cada franja cae por su cuenta */
    for (k = 0; k < 6; k++) {
      var d = tramo(pm, 0.18 + k * 0.07, 1);
      var s0 = 5.5 - k * 2.0;
      M.trozo(0, s0, 2.0, (k % 2 ? 1.5 : -1.2) * d * 5, d * d * 13,
        d * (k % 2 ? 1.1 : -0.9), (1 - d * 0.6) * fade);
    }
    /* el destello de la runa al apagarse */
    if (pm < 0.25) {
      var p = M.pant(1.0, 3.9);
      var fl = 1 - pm / 0.25;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(p.x, p.y, 0.2, p.x, p.y, 2 + fl * 5);
      g.addColorStop(0, 'rgba(255,190,90,' + fl + ')');
      g.addColorStop(1, 'rgba(255,140,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2 + fl * 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    /* polvo de piedra abajo */
    if (cae > 0.3) {
      for (k = 0; k < 6; k++) {
        ctx.fillStyle = 'rgba(150,152,158,' + (0.4 * (1 - cae) * fade) + ')';
        ctx.beginPath();
        ctx.arc(o.x + (k - 2.5) * 3.0, o.y + 7, 1.0 + cae * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  /* ESFINGE: se deshace en arena, que el viento se lleva de delante atrás */
  conMuerte('esfinge', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var arena = tramo(pm, 0.05, 0.85);
    var fade = 1 - tramo(pm, 0.2, 0.95);
    /* la foto se va comiendo por delante */
    M.enFoto(function (c) {
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = '#000';
      c.fillRect(FH - 2 - arena * FOTO, -FH, FOTO, FOTO);
    }, 'source-over');
    M.pinta({ dy: arena * 1.2, alpha: Math.max(0, fade) });
    /* la arena volando */
    for (k = 0; k < 22; k++) {
      var d = tramo(pm, 0.02 + (k % 11) * 0.055, 1);
      if (d <= 0) continue;
      var sem = hash(k * 7 + 3) % 100;
      var s0 = (sem / 100 - 0.5) * 12;
      var p = M.pant(4 - d * 20, s0 + Math.sin(d * 5 + k) * 2.5 + d * 3);
      ctx.fillStyle = 'rgba(216,184,120,' + ((1 - d) * 0.9) + ')';
      ctx.fillRect(p.x, p.y, 0.8, 0.8);
    }
  });

  /* ÍCARO: se le derrite la cera, las plumas se sueltan una a una y cae */
  conMuerte('icaro', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var derrite = tramo(pm, 0.02, 0.32);
    var cae = tramo(pm, 0.25, 1);
    var fade = 1 - tramo(pm, 0.85, 1);
    M.pinta({ dy: cae * cae * 14, rot: cae * 1.8, pf: 0, ps: -2, alpha: fade });
    /* las gotas de cera */
    for (k = 0; k < 6; k++) {
      var g0 = tramo(pm, 0.03 + k * 0.05, 0.8);
      if (g0 <= 0 || g0 >= 1) continue;
      var pg = M.pant(-2 - k * 0.9, 1 - g0 * 9);
      gota(ctx, pg.x, pg.y, 0.7, '#ffe9a8', (1 - g0) * fade);
    }
    /* las plumas, cayendo en espiral */
    for (k = 0; k < 11; k++) {
      var d = tramo(pm, 0.05 + k * 0.05, 1);
      if (d <= 0) continue;
      var p = M.pant(-3 + Math.sin(d * 4 + k) * 5, 2 - d * 12);
      ctx.save();
      ctx.globalAlpha = (1 - d * 0.8) * fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(d * 6 + k) * 1.4);
      ctx.fillStyle = '#f7f2e2';
      ctx.beginPath(); ctx.ellipse(0, 0, 1.2, 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,20,20,.55)'; ctx.lineWidth = 0.16; ctx.stroke();
      ctx.restore();
    }
    /* el sol, arriba, que es quien lo mata */
    if (pm < 0.4) {
      var ps = M.pant(2, 12);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - pm / 0.4) * 0.8;
      var gs = ctx.createRadialGradient(ps.x, ps.y, 0.5, ps.x, ps.y, 7);
      gs.addColorStop(0, 'rgba(255,245,190,.9)');
      gs.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.fillStyle = gs;
      ctx.beginPath(); ctx.arc(ps.x, ps.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });

  /* TRITÓN: se queda sin agua. Se seca, se le agrieta la piel y queda tieso,
   * con un charquito debajo que se evapora. */
  conMuerte('triton', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var seca = tramo(pm, 0.05, 0.55);
    var fade = 1 - tramo(pm, 0.85, 1);
    var cae = rebote(tramo(pm, 0.35, 0.8));
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(150,132,96,' + (seca * 0.7) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ rot: cae * 1.4, pf: 0, ps: -5, dy: cae * 2.0, alpha: fade });
    /* el agua que se le escapa */
    for (k = 0; k < 9; k++) {
      var d = tramo(pm, 0.02 + k * 0.04, 0.7);
      if (d <= 0 || d >= 1) continue;
      var p = M.pant((k - 4) * 1.6, -3 - d * 5);
      gota(ctx, p.x, p.y, 0.6 * (1 - d * 0.5), '#3ec8ff', (1 - d) * 0.9);
    }
    /* el charco, que se va evaporando */
    var ch = tramo(pm, 0.3, 1);
    if (ch > 0) {
      var pc = M.pant(0, -6.5);
      ctx.fillStyle = 'rgba(62,200,255,' + (0.45 * (1 - ch) * fade) + ')';
      ctx.beginPath();
      ctx.ellipse(pc.x, pc.y, 5.5 * (1 - ch * 0.7), 1.3 * (1 - ch * 0.7), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    /* las grietas de la piel seca */
    if (seca > 0.5) {
      ctx.strokeStyle = 'rgba(70,52,30,' + ((seca - 0.5) * 1.6 * fade) + ')';
      ctx.lineWidth = 0.26;
      ctx.beginPath();
      for (k = 0; k < 4; k++) {
        var p0 = M.pant(-2 + k * 2.0, 2.5 - k * 1.4);
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p0.x + 1.8, p0.y + 1.6);
      }
      ctx.stroke();
    }
  });

  /* LA PARCA: dentro no había nadie. La capucha se desinfla, las dos luces
   * se apagan y la guadaña cae al suelo. */
  conMuerte('parca', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var apaga = tramo(pm, 0.02, 0.24);
    var desinfla = tramo(pm, 0.18, 0.72);
    var fade = 1 - tramo(pm, 0.72, 1);
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(6,6,12,' + (apaga * 0.8) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    /* se aplasta contra el suelo, como una tela que cae */
    M.pinta({ ss: 1 - desinfla * 0.85, sf: 1 + desinfla * 0.35,
      dy: desinfla * 5.5, alpha: fade });
    /* el último parpadeo de las dos luces */
    if (pm < 0.3) {
      var fl = (1 - pm / 0.3) * (Math.floor(pm * 30) % 2 ? 0.35 : 1);
      [[1.4, 2.0], [3.6, 1.6]].forEach(function (e) {
        var p = M.pant(e[0], e[1]);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var g = ctx.createRadialGradient(p.x, p.y, 0.1, p.x, p.y, 2.5);
        g.addColorStop(0, 'rgba(160,255,120,' + fl + ')');
        g.addColorStop(1, 'rgba(120,220,90,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }
    /* la guadaña, cayendo de lado */
    var gu = suave(tramo(pm, 0.12, 0.8));
    ctx.save();
    ctx.globalAlpha = fade;
    var pg = M.pant(-2 - gu * 4, 3 - gu * 9);
    ctx.translate(pg.x, pg.y);
    ctx.rotate(-0.4 - gu * 1.9);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -5.5); ctx.lineTo(0, 5.5); ctx.stroke();
    ctx.fillStyle = '#d8dbe4';
    ctx.beginPath();
    ctx.moveTo(0, 5.3);
    ctx.quadraticCurveTo(5.0, 7.0, 7.6, 4.0);
    ctx.quadraticCurveTo(4.6, 5.4, 0.2, 4.2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,20,.75)'; ctx.lineWidth = 0.3; ctx.stroke();
    ctx.restore();
    /* un hilo de humo verde donde estaba */
    for (k = 0; k < 5; k++) {
      var u = tramo(pm, 0.3 + k * 0.07, 1);
      if (u <= 0) continue;
      var p2 = M.pant(0, -2 + u * 10);
      ctx.fillStyle = 'rgba(120,220,140,' + ((1 - u) * 0.35) + ')';
      ctx.beginPath();
      ctx.arc(p2.x + Math.sin(u * 6 + k) * 2, p2.y, 1.0 + u * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  /* JINETE SIN CABEZA: la calabaza se le cae y se estrella; se apaga la vela
   * y queda el cuello de la capa, vacío, que se deshace en niebla. */
  conMuerte('jinete', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var suelta = tramo(pm, 0.04, 0.42);
    var choca = tramo(pm, 0.42, 0.5);
    var fade = 1 - tramo(pm, 0.78, 1);
    /* la calabaza es parte de la foto: se le baja y se apaga entera */
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(10,8,14,' + (tramo(pm, 0.4, 0.75) * 0.85) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ dy: suelta * 6.5, rot: suelta * 2.2, pf: 0, ps: 3, alpha: fade });
    /* el estallido contra el suelo */
    if (choca > 0) {
      for (k = 0; k < 10; k++) {
        var d = Math.min(1, choca * 2 + k * 0.02);
        var a2 = k * 0.628 + 0.3;
        var p = M.pant(Math.cos(a2) * d * 9, -6.5 + Math.abs(Math.sin(a2)) * d * 5);
        ctx.save();
        ctx.globalAlpha = (1 - d * 0.8) * fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(a2 + d * 4);
        ctx.fillStyle = (k % 3) ? '#ff8c1a' : '#a84a02';
        ctx.beginPath();
        ctx.moveTo(0, -1.0); ctx.lineTo(1.1, 0.2); ctx.lineTo(-0.6, 1.0);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(20,20,20,.7)'; ctx.lineWidth = 0.2; ctx.stroke();
        ctx.restore();
      }
      /* la llama que se apaga */
      var fl = Math.max(0, 1 - (pm - 0.42) / 0.25);
      var pf = M.pant(0, -6.5);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(pf.x, pf.y, 0.3, pf.x, pf.y, 2 + fl * 6);
      g.addColorStop(0, 'rgba(255,210,90,' + fl + ')');
      g.addColorStop(1, 'rgba(255,140,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(pf.x, pf.y, 2 + fl * 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    /* la niebla del cuello vacío */
    for (k = 0; k < 6; k++) {
      var u = tramo(pm, 0.25 + k * 0.06, 1);
      if (u <= 0) continue;
      var p3 = M.pant((k - 2.5) * 2.2, -2 + u * 6);
      ctx.fillStyle = 'rgba(150,140,170,' + ((1 - u) * 0.3) + ')';
      ctx.beginPath();
      ctx.arc(p3.x, p3.y, 1.4 + u * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
