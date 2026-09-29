  /* ---------- La muerte del RETABLO ----------
   * Se le va la luz del nicho, el cajón se desencaja y se desarma en tablas
   * que caen, y las figuritas del nacimiento saltan fuera y ruedan. */
  conMuerte('retablo', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var apaga = tramo(pm, 0.02, 0.35);
    var fade = 1 - tramo(pm, 0.82, 1);
    var tiembla = pm < 0.3 ? Math.sin(pm * 80) * 0.4 * (1 - pm / 0.3) : 0;
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(20,10,14,' + (apaga * 0.45) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    /* seis tablas de 5,4 que juntas son el retablo; caen a destiempo */
    var F = [-3.0, 2.4], Sd = [4.2, 0.6, -3.2];
    for (k = 0; k < 6; k++) {
      var d = tramo(pm, 0.28 + k * 0.05, 1);
      var f0 = F[k % 2], s0 = Sd[Math.floor(k / 2)];
      M.trozo(f0, s0, 5.4, tiembla + ((k % 2) ? 1 : -1) * d * 4.5, d * d * 14,
        d * ((k % 2) ? 1.2 : -1.0), (1 - d * 0.4) * fade);
    }
    /* las figuritas: la Virgen, San José, el Niño y la llamita, saltando */
    var FIG = [[-2.4, 1.0, '#7fb2ff'], [2.5, 1.0, '#8a5a2e'], [0.2, 0.4, '#fbf6ec'], [1.4, 0.5, '#f4efe4']];
    for (k = 0; k < FIG.length; k++) {
      var e = tramo(pm, 0.3 + k * 0.06, 0.95);
      if (e <= 0) continue;
      var p = M.pant(FIG[k][0], FIG[k][1]);
      var dx = (k % 2 ? 1 : -1) * e * (5 + k), dy = -Math.sin(e * Math.PI) * 5 + e * e * 6;
      ctx.save();
      ctx.globalAlpha = (1 - tramo(e, 0.7, 1)) * fade;
      ctx.translate(p.x + dx, p.y + dy);
      ctx.rotate(e * (k % 2 ? 6 : -6));
      ctx.fillStyle = FIG[k][2];
      ctx.beginPath(); ctx.moveTo(-0.6, 0.6); ctx.quadraticCurveTo(0, -1.2, 0.6, 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f3c9a0';
      ctx.beginPath(); ctx.arc(0, -0.9, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    /* la estrella del pesebre, que se apaga y cae la última */
    var st = tramo(pm, 0.45, 1);
    if (st > 0) {
      var ps = M.pant(0.1, 2.55);
      ctx.save();
      ctx.globalAlpha = (1 - st) * fade;
      ctx.fillStyle = mix('#ffd23f', '#6a5a30', st);
      estrella5(ctx, ps.x, ps.y + st * st * 10, 0.6, st * 5);
      ctx.fill();
      ctx.restore();
    }
  });
