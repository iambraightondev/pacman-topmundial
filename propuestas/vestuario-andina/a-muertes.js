  /* ---------- Las ocho muertes de la tanda andina ----------
   * Misma maquinaria: foto quieta de la skin y encima la muerte. Cada una se
   * va como se iría de verdad: la piedra se parte, la papa se pudre, el sol
   * lo tapa un eclipse y al dibujo de Nazca se lo lleva el viento. */

  /* GALLITO: se le viene abajo la cresta —que era todo su orgullo— y el
   * pájaro se apaga soltando plumas naranjas */
  conMuerte('gallito', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var cae = suave(tramo(pm, 0.15, 0.85));
    var fade = 1 - tramo(pm, 0.84, 1);
    M.pinta({ rot: cae * 1.5, pf: -2, ps: -3, dy: cae * 4.5, alpha: fade });
    /* las plumas de la cresta, cayendo */
    for (k = 0; k < 10; k++) {
      var d = tramo(pm, 0.04 + k * 0.05, 1);
      if (d <= 0) continue;
      var p = M.pant(1 + (k - 4.5) * 1.1, 5 - d * 11);
      ctx.save();
      ctx.globalAlpha = (1 - d) * fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(d * 5 + k) * 1.5);
      ctx.fillStyle = (k % 4) ? '#ff5a1a' : '#1a1a22';
      ctx.beginPath(); ctx.ellipse(0, 0, 1.2, 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,20,20,.6)'; ctx.lineWidth = 0.16; ctx.stroke();
      ctx.restore();
    }
    /* el último chillido, apagándose */
    if (pm < 0.3) {
      var u = pm / 0.3;
      ctx.strokeStyle = 'rgba(255,230,160,' + ((1 - u) * 0.8) + ')';
      ctx.lineWidth = 0.55; ctx.lineCap = 'round';
      var pc = M.pant(7, 0.4);
      ctx.beginPath(); ctx.arc(pc.x, pc.y, 2 + u * 7, -0.8, 0.8); ctx.stroke();
    }
  });

  /* PUMA DE PIEDRA: se raja por el medio y se parte en bloques */
  conMuerte('puma', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var raja = tramo(pm, 0.03, 0.22);
    var parte = tramo(pm, 0.2, 0.92);
    var fade = 1 - tramo(pm, 0.82, 1);
    if (raja > 0 && parte < 0.06) {
      ctx.strokeStyle = 'rgba(30,26,20,' + (raja * 0.9) + ')';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (k = 0; k < 4; k++) {
        var p0 = M.pant(-3 + k * 2.4, 4.5 - k * 2.2);
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p0.x + (k % 2 ? 2.4 : -2.0) * raja, p0.y + 2.4 * raja);
      }
      ctx.stroke();
    }
    /* cuatro bloques que se separan y caen */
    for (k = 0; k < 4; k++) {
      var d = tramo(pm, 0.18 + k * 0.06, 1);
      var s0 = 4.5 - k * 2.6;
      M.trozo(0, s0, 2.6, (k % 2 ? 2.0 : -1.6) * d * 4, d * d * 14,
        d * (k % 2 ? 0.9 : -1.2), (1 - d * 0.5) * fade);
    }
    /* el polvo de la piedra */
    if (parte > 0.25) {
      for (k = 0; k < 7; k++) {
        ctx.fillStyle = 'rgba(158,150,134,' + (0.4 * (1 - parte) * fade) + ')';
        ctx.beginPath();
        ctx.arc(o.x + (k - 3) * 2.8, o.y + 7, 1.0 + parte * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  /* TUMI: se le desprende el filo, que cae clavándose, y la figurita se
   * apaga y se viene detrás */
  conMuerte('tumi', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var suelta = tramo(pm, 0.05, 0.4);
    var fade = 1 - tramo(pm, 0.82, 1);
    var cae = suave(tramo(pm, 0.35, 0.95));
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(70,52,10,' + (tramo(pm, 0.3, 0.8) * 0.6) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ dy: cae * 4.0, rot: cae * 0.7, pf: 0, ps: 2, alpha: fade });
    /* el filo, que se va por su lado */
    if (suelta > 0) {
      var pf = M.pant(-1 - suelta * 6, -3 - suelta * 6);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(pf.x, pf.y);
      ctx.rotate(-suelta * 2.6);
      ctx.fillStyle = '#ffcf3a';
      ctx.beginPath();
      ctx.moveTo(-4.4, 0);
      ctx.lineTo(4.4, 0.2);
      ctx.quadraticCurveTo(4.8, -3.6, 0.2, -4.8);
      ctx.quadraticCurveTo(-4.6, -3.8, -4.4, 0);
      ctx.closePath(); ctx.fill();
      contorno(ctx, 1.5); ctx.stroke();
      ctx.restore();
    }
    /* las turquesas, saltando */
    for (k = 0; k < 2; k++) {
      var d = tramo(pm, 0.1 + k * 0.06, 0.9);
      if (d <= 0) continue;
      var pt = M.pant((k ? 3 : -3) + (k ? 1 : -1) * d * 7, 1.4 + d * 5 - d * d * 10);
      ctx.save();
      ctx.globalAlpha = (1 - d) * fade;
      ctx.fillStyle = '#3ec8b8';
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,20,20,.7)'; ctx.lineWidth = 0.2; ctx.stroke();
      ctx.restore();
    }
  });

  /* INTI: un ECLIPSE. Una sombra redonda le cruza por delante, se lo come
   * entero y solo queda el anillo un instante. */
  conMuerte('inti', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var tapa = tramo(pm, 0.05, 0.6);
    var anillo = (pm > 0.55 && pm < 0.78) ? Math.sin((pm - 0.55) / 0.23 * Math.PI) : 0;
    var fade = 1 - tramo(pm, 0.75, 1);
    /* los rayos se van recogiendo con la foto */
    M.pinta({ sf: 1 - tapa * 0.25, ss: 1 - tapa * 0.25, alpha: fade });
    /* la sombra que cruza */
    var p = M.pant(0, 0);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#06060c';
    ctx.beginPath();
    ctx.arc(p.x + (1 - tapa) * 16, p.y - (1 - tapa) * 4, R + 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    /* el anillo de fuego */
    if (anillo > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,220,120,' + anillo + ')';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(p.x, p.y, R + 1.3, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,180,60,' + (anillo * 0.5) + ')';
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, R + 1.3, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    /* las estrellas que salen cuando se apaga el sol */
    for (k = 0; k < 7; k++) {
      var d = tramo(pm, 0.55 + k * 0.02, 1);
      if (d <= 0) continue;
      estrella4(ctx, p.x + Math.cos(k * 0.9) * (R + 4 + k), p.y + Math.sin(k * 0.9) * (R + 3 + k),
        0.7, '#ffffff', d * (1 - tramo(pm, 0.9, 1)) * 0.9);
    }
  });

  /* PAPA: se pudre. Se pone negra por manchas, se arruga y se hunde. */
  conMuerte('papa', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var pudre = tramo(pm, 0.05, 0.6);
    var fade = 1 - tramo(pm, 0.84, 1);
    M.enFoto(function (c) {
      /* manchas de podrido, que van creciendo */
      c.fillStyle = 'rgba(28,20,10,' + (pudre * 0.9) + ')';
      for (var j = 0; j < 6; j++) {
        var a2 = j * 1.05;
        c.beginPath();
        c.arc(Math.cos(a2) * 3.4, Math.sin(a2) * 2.6, 1.0 + pudre * 2.6, 0, Math.PI * 2);
        c.fill();
      }
    }, 'source-atop');
    M.pinta({ ss: 1 - pudre * 0.3, sf: 1 + pudre * 0.12, dy: pudre * 3.0, alpha: fade });
    /* los brotes se marchitan y caen */
    for (k = 0; k < 3; k++) {
      var d = tramo(pm, 0.1 + k * 0.08, 0.9);
      if (d <= 0) continue;
      var p = M.pant(-2.6 + k * 2.4, 4 - d * 9);
      ctx.save();
      ctx.globalAlpha = (1 - d) * fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(d * 3 + k);
      ctx.fillStyle = mix('#7aa83a', '#4a3a10', d);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.85, 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    /* moscas: dos puntitos dando vueltas */
    if (pudre > 0.5) {
      for (k = 0; k < 2; k++) {
        var a3 = o.t * 6 + k * 3.14;
        var pm2 = M.pant(Math.cos(a3) * 5, 3 + Math.sin(a3 * 1.7) * 3);
        ctx.fillStyle = 'rgba(30,30,36,' + (0.8 * fade) + ')';
        ctx.beginPath(); ctx.arc(pm2.x, pm2.y, 0.32, 0, Math.PI * 2); ctx.fill();
      }
    }
  });

  /* AJÍ: se consume. Se le va el color, se arruga y queda un ají seco. */
  conMuerte('aji', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var seca = tramo(pm, 0.08, 0.62);
    var fade = 1 - tramo(pm, 0.84, 1);
    var cae = rebote(tramo(pm, 0.45, 0.9));
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(86,26,14,' + (seca * 0.85) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    /* se encoge y se retuerce */
    M.pinta({ ss: 1 - seca * 0.38, sf: 1 - seca * 0.12,
      rot: cae * 1.3 + Math.sin(pm * 22) * 0.05 * seca,
      pf: 0, ps: -4, dy: cae * 2.6, alpha: fade });
    /* el último humo, que sale de arriba */
    for (k = 0; k < 5; k++) {
      var u = tramo(pm, 0.02 + k * 0.06, 0.9);
      if (u <= 0 || u >= 1) continue;
      var p = M.pant(-2.4, 7 + u * 8);
      ctx.fillStyle = 'rgba(200,200,212,' + ((1 - u) * 0.45 * fade) + ')';
      ctx.beginPath();
      ctx.arc(p.x + Math.sin(u * 6 + k) * 2.2, p.y, 0.8 + u * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    /* las semillas, que se le caen */
    for (k = 0; k < 6; k++) {
      var d = tramo(pm, 0.35 + k * 0.04, 1);
      if (d <= 0) continue;
      var ps = M.pant((k - 2.5) * 1.6, -4 - d * 7);
      ctx.save();
      ctx.globalAlpha = (1 - d) * fade;
      ctx.fillStyle = '#f2e4a8';
      ctx.beginPath(); ctx.ellipse(ps.x, ps.y, 0.4, 0.3, d * 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });

  /* SAPO: se queda sin juego. Se le cae la moneda por dentro —suena— y el
   * bronce se cubre de verdín hasta quedarse de adorno. */
  conMuerte('sapo', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var verdin = tramo(pm, 0.18, 0.75);
    var fade = 1 - tramo(pm, 0.85, 1);
    var cae = rebote(tramo(pm, 0.5, 0.9));
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(74,142,110,' + (verdin * 0.7) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ rot: cae * 1.1, pf: 0, ps: -5, dy: cae * 2.2, alpha: fade });
    /* la moneda cayéndole dentro */
    var mo = tramo(pm, 0.02, 0.3);
    if (mo > 0 && mo < 1) {
      var p = M.pant(1.2, 2 - mo * 6);
      ctx.save();
      ctx.globalAlpha = 1 - mo * 0.4;
      ctx.translate(p.x, p.y);
      ctx.scale(Math.abs(Math.cos(mo * 16)) * 0.8 + 0.2, 1);
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath(); ctx.arc(0, 0, 1.0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.restore();
    }
    /* el tin de la campanilla */
    if (pm > 0.28 && pm < 0.5) {
      var tim = (pm - 0.28) / 0.22;
      var pc = M.pant(0, 0);
      ctx.strokeStyle = 'rgba(255,230,160,' + ((1 - tim) * 0.9) + ')';
      ctx.lineWidth = 0.55; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(pc.x, pc.y, 3 + tim * 8, -1.2, 1.2); ctx.stroke();
    }
    /* gotitas de verdín que resbalan */
    for (k = 0; k < 4; k++) {
      var d = tramo(pm, 0.4 + k * 0.05, 1);
      if (d <= 0) continue;
      var pg = M.pant((k - 1.5) * 2.4, -2 - d * 5);
      gota(ctx, pg.x, pg.y, 0.55, '#6fd8a8', (1 - d) * 0.8 * fade);
    }
  });

  /* NAZCA: el viento del desierto borra el trazo, raya a raya, y se lleva la
   * tierra. Del geoglifo no queda nada. */
  conMuerte('nazca', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var borra = tramo(pm, 0.05, 0.75);
    var fade = 1 - tramo(pm, 0.7, 1);
    /* la foto se borra en diagonal, como si la barriera el viento */
    M.enFoto(function (c) {
      c.globalCompositeOperation = 'destination-out';
      c.save();
      c.rotate(-0.5);
      c.fillStyle = '#000';
      c.fillRect(-FOTO, -FH - 2 - borra * FOTO * 1.6, FOTO * 2, FOTO);
      c.restore();
    }, 'source-over');
    M.pinta({ alpha: fade });
    /* la tierra volando, en rachas */
    for (k = 0; k < 26; k++) {
      var d = tramo(pm, 0.02 + (k % 13) * 0.05, 1);
      if (d <= 0) continue;
      var sem = hash(k * 11 + 5) % 100;
      var s0 = (sem / 100 - 0.5) * 13;
      var p = M.pant(-2 - d * 18, s0 + d * 5 + Math.sin(d * 6 + k) * 1.6);
      ctx.fillStyle = 'rgba(200,176,132,' + ((1 - d) * 0.85) + ')';
      ctx.fillRect(p.x, p.y, 0.9, 0.55);
    }
    /* las rachas de viento */
    if (pm < 0.7) {
      ctx.strokeStyle = 'rgba(230,214,184,' + ((1 - pm / 0.7) * 0.35) + ')';
      ctx.lineWidth = 0.3; ctx.lineCap = 'round';
      ctx.beginPath();
      for (k = 0; k < 4; k++) {
        var py = o.y - 5 + k * 3.4;
        ctx.moveTo(o.x + 8, py);
        ctx.lineTo(o.x - 10 - k * 2, py + 1.5);
      }
      ctx.stroke();
    }
  });
