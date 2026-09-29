  /* ---------- La muerte del AÑO VIEJO ----------
   * Lo que se hace con él a medianoche: arde. Le prenden por abajo, las
   * llamas lo suben entero, se queda en ceniza negra, se hunde y el viento
   * se lleva las pavesas. */
  conMuerte('anoviejo', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    var arde = tramo(pm, 0.04, 0.5);
    var ceniza = tramo(pm, 0.3, 0.72);
    var hunde = suave(tramo(pm, 0.55, 0.95));
    var fade = 1 - tramo(pm, 0.82, 1);
    /* la foto se enciende de naranja y luego se queda en ceniza */
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(255,110,20,' + (arde * (1 - ceniza) * 0.55) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
      c.fillStyle = 'rgba(28,24,22,' + (ceniza * 0.9) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    /* se hunde sobre su base, como lo que se consume */
    M.pinta({ pf: 0, ps: -5.4, sf: 1 - hunde * 0.15, ss: 1 - hunde * 0.75, alpha: fade });
    /* las llamas, que suben por la pantalla desde abajo */
    var fuerza = Math.sin(Math.min(1, pm * 1.35) * Math.PI) * fade;
    var BASES = [[-3.6, -4.6], [-1.2, -5.2], [1.4, -5.0], [3.8, -4.2], [-4.6, -1.0], [4.8, 0.0]];
    for (k = 0; k < BASES.length; k++) {
      var sube = tramo(pm, k * 0.035, 0.3 + k * 0.035);
      var p = M.pant(BASES[k][0], BASES[k][1] + hunde * 4);
      llamarada(ctx, p.x, p.y, (3.2 + (k % 3) * 1.4) * sube * fuerza * (1 - hunde * 0.6), 1.1 + (k % 2) * 0.4, o.t + k, fuerza);
    }
    /* las pavesas, subiendo y yéndose con el viento */
    for (k = 0; k < 14; k++) {
      var e = tramo(pm, 0.1 + k * 0.035, 0.6 + k * 0.03);
      if (e <= 0 || e >= 1) continue;
      var q0 = M.pant(-4 + (k % 7) * 1.3, -3 + Math.floor(k / 7) * 3.5);
      ctx.fillStyle = (k % 3) ? 'rgba(255,150,40,' + (1 - e) + ')' : 'rgba(255,230,140,' + (1 - e) + ')';
      ctx.fillRect(q0.x + Math.sin(e * 5 + k) * 1.4 - e * 4, q0.y - e * 11, 0.45, 0.45);
    }
    /* el humo de al final */
    var humo = tramo(pm, 0.55, 1);
    if (humo > 0 && humo < 1) {
      var ph = M.pant(0, -3);
      ctx.fillStyle = 'rgba(120,118,128,' + ((1 - humo) * 0.45) + ')';
      for (k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(ph.x + (k - 1) * 2.2 - humo * 2, ph.y - 2 - humo * 7 - k, 1.4 + humo * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
