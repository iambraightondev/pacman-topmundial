  /* ---------- La muerte de la TRAMPA ----------
   * Se le sueltan los cierres: las puertas se abren de golpe, se le escapa
   * todo lo que había cazado y la caja se cae de lado echando chispas. */
  conMuerte('trampa', function (o2) { o2.half = HALF[2]; }, function (M, pm, o) {
    var ctx = M.ctx, k;
    var salta = Math.sin(tramo(pm, 0, 0.2) * Math.PI);      // el brinco al abrirse
    var cae = rebote(tramo(pm, 0.24, 0.72));
    var fade = 1 - tramo(pm, 0.82, 1);
    M.pinta({ dy: -salta * 2.6 + cae * 4.2, rot: cae * 1.45, pf: -2.0, ps: -4.5, alpha: fade });

    /* lo que tenía dentro, largándose hacia arriba */
    for (k = 0; k < 4; k++) {
      var d = tramo(pm, 0.04 + k * 0.09, 1);
      if (d <= 0) continue;
      var p = M.pant(4.5 - k * 0.8, 1.5);
      fantasmita(ctx, p.x + Math.sin(d * 4.5 + k * 1.7) * 3.6, p.y - d * 15,
                 1.9 * (1 - d * 0.4), 'rgba(238,248,255,1)', (1 - d) * fade, 0);
    }

    /* el cortocircuito: chispas en la boca mientras se apaga */
    var chis = 1 - tramo(pm, 0.1, 0.62);
    for (k = 0; k < 6; k++) {
      var u = ((pm * 6 + k / 6) % 1);
      var q2 = M.pant(3.0, 0);
      ctx.globalAlpha = (1 - u) * chis * fade;
      ctx.fillStyle = (k % 2) ? '#ffffff' : '#9fe8ff';
      ctx.beginPath();
      ctx.arc(q2.x + Math.cos(k * 2.1) * u * 7, q2.y + Math.sin(k * 2.1) * u * 7 - salta * 2,
              0.42 * (1 - u * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* el humillo del final */
    if (pm > 0.55) {
      var h = tramo(pm, 0.55, 1);
      for (k = 0; k < 3; k++) {
        var hp = M.pant(-2 + k * 1.4, -2);
        ctx.fillStyle = 'rgba(180,190,204,' + ((1 - h) * 0.4 * fade) + ')';
        ctx.beginPath();
        ctx.arc(hp.x + Math.sin(h * 3 + k) * 1.6, hp.y - h * 8 - k, 1.0 + h * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
