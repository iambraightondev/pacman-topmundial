  /* ---------- La muerte del ALEBRIJE ----------
   * Se destiñe: la pintura salta a escamas de colores, debajo queda la
   * madera de copal sin pintar, se raja y se parte en seis trozos que caen. */
  conMuerte('alebrije', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var destine = tramo(pm, 0.02, 0.45);
    var fade = 1 - tramo(pm, 0.85, 1);
    /* la foto se va quedando en madera */
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(160,122,84,' + (destine * 0.88) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    /* las rajas, justo antes de partirse */
    var raja = tramo(pm, 0.32, 0.48);
    if (raja > 0) {
      M.enFoto(function (c) {
        c.strokeStyle = 'rgba(40,24,10,.9)'; c.lineWidth = 0.35;
        c.beginPath();
        c.moveTo(-3.3, 6.5); c.lineTo(-3.0, 3.0 - raja * 1.2); c.lineTo(-3.6, -1.0 - raja * 3);
        c.moveTo(2.6, 6.5); c.lineTo(2.2, 2.6 - raja * 1.4); c.lineTo(2.8, -2.0 - raja * 2.5);
        c.moveTo(-8.6, 0.9); c.lineTo(-4.0, 0.7 * raja); c.lineTo(5.0, 0.9);
        c.stroke();
      });
    }
    /* seis trozos de 5,8 que juntos son la figura entera; caen a destiempo */
    var F = [-6.2, -0.4, 5.4], Sd = [3.8, -2.0];
    for (k = 0; k < 6; k++) {
      var d = tramo(pm, 0.48 + k * 0.04, 1);
      var f0 = F[k % 3], s0 = Sd[Math.floor(k / 3)];
      M.trozo(f0, s0, 5.8, ((k % 3) - 1) * d * 5, d * d * 15 - Math.sin(d * Math.PI) * 2,
        d * ((k % 2) ? 1.1 : -1.3), (1 - d * 0.4) * fade);
    }
    /* las escamas de pintura, volando */
    for (k = 0; k < 12; k++) {
      var e = tramo(pm, 0.03 + k * 0.03, 0.62 + k * 0.02);
      if (e <= 0 || e >= 1) continue;
      var p = M.pant(-5.5 + (k % 6) * 2.1, -1.5 + Math.floor(k / 6) * 4);
      ctx.save();
      ctx.globalAlpha = (1 - e) * fade;
      ctx.translate(p.x + Math.sin(k * 1.9) * e * 6, p.y - e * 6 + e * e * 10);
      ctx.rotate(e * 8 + k);
      ctx.fillStyle = PAL_MUERTOS[k % PAL_MUERTOS.length];
      ctx.fillRect(-0.45, -0.3, 0.9, 0.6);
      ctx.restore();
    }
  });
