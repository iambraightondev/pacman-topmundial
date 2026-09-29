  /* ---------------- DARUMA ---------------- */
  /* El muñeco que no se cae: huevo de papel maché lacado del color del
   * jugador, cara blanca con cejas de grulla y bigote de tortuga, y UN SOLO
   * OJO pintado —el otro se pinta cuando se cumple el deseo—. Come
   * cabeceando: se inclina hacia delante y vuelve. Q: se pinta el otro ojo. */
  function huevoDaruma(ctx) {
    ctx.beginPath();
    ctx.moveTo(0.2, 6.4);
    ctx.bezierCurveTo(3.8, 6.4, 5.4, 3.4, 5.9, 0.0);
    ctx.bezierCurveTo(6.4, -3.6, 4.4, -6.2, 1.8, -6.4);
    ctx.lineTo(-1.8, -6.4);
    ctx.bezierCurveTo(-4.6, -6.2, -6.4, -3.6, -5.9, 0.0);
    ctx.bezierCurveTo(-5.4, 3.4, -3.4, 6.4, 0.2, 6.4);
    ctx.closePath();
  }
  DRAW.daruma = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.4), k;
    var laca = hex(mix(o.c, '#d42a22', 0.45)), lacaOsc = mix(laca, '#300404', 0.5);
    var cara = '#fbf3e4', oro = '#ffd24a';
    var cabecea = [0, 0.13, 0.26][fz];
    var pintado = (q >= 0) ? tramo(q, 0.25, 0.6) : 0;
    var brilla = (q >= 0) ? Math.sin(tramo(q, 0.5, 1) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    /* se mece sobre la base, y al comer cabecea hacia delante */
    girarSobre(ctx, 0, -6.2, -cabecea + Math.sin(t * 3.2) * 0.07);

    piezaX(ctx, function () { huevoDaruma(ctx); }, laca, hex(lacaOsc), 0.8, 0.8, 1.8);

    ctx.save(); huevoDaruma(ctx); ctx.clip();
    /* las volutas de oro de la capucha y el sello de la tripa */
    ctx.strokeStyle = oro; ctx.lineWidth = 0.35; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-3.4, 1.4, 1.0, 0.3, Math.PI * 1.7);
    ctx.arc(-3.4, -1.6, 0.9, -1.4, Math.PI * 1.2);
    ctx.stroke();
    /* 福, la buena suerte, en oro sobre la tripa */
    ctx.save();
    ctx.translate(2.2, -4.1);
    ctx.scale(1, -1);
    ctx.fillStyle = oro;
    ctx.font = 'bold 3.4px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('福', 0, 0);
    ctx.restore();
    /* la cara blanca, con su ribete dorado */
    var ovalo = function () { ctx.beginPath(); ctx.ellipse(2.6, 1.2, 3.4, 3.4, 0.1, 0, Math.PI * 2); };
    ovalo();
    ctx.fillStyle = cara; ctx.fill();
    ctx.strokeStyle = oro; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.restore();
    huevoDaruma(ctx); contorno(ctx, 1.8); ctx.stroke();

    /* los ojos: uno pintado, el otro en blanco hasta que se cumple */
    [[1.5, 2.4, 1], [3.9, 2.3, pintado]].forEach(function (e) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(e[0], e[1], 0.95, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      if (e[2] > 0) {
        ctx.fillStyle = TINTA;
        ctx.beginPath(); ctx.arc(e[0], e[1], 0.72 * e[2], 0, Math.PI * 2); ctx.fill();
      }
    });
    if (brilla > 0) destello(ctx, 4.3, 2.8, 0.4, brilla);
    /* cejas de grulla */
    ctx.strokeStyle = TINTA; ctx.lineCap = 'round';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(0.3, 3.6); ctx.quadraticCurveTo(1.4, 4.4, 2.4, 3.6);
    ctx.moveTo(3.0, 3.6); ctx.quadraticCurveTo(4.2, 4.5, 5.2, 3.3);
    ctx.stroke();
    /* la boca, que se abre al comer, y el bigote encima */
    ctx.fillStyle = '#4a0a0a';
    ctx.beginPath(); ctx.ellipse(2.8, -0.2, 0.75, 0.2 + fz * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(1.0, 0.5); ctx.quadraticCurveTo(2.0, 1.3, 2.8, 0.6); ctx.quadraticCurveTo(3.7, 1.3, 4.7, 0.5);
    ctx.stroke();
    /* la barba, una media luna negra bajo la boca */
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    ctx.moveTo(1.2, -0.9 - fz * 0.2);
    ctx.quadraticCurveTo(2.8, -2.6 - fz * 0.2, 4.4, -0.9 - fz * 0.2);
    ctx.quadraticCurveTo(2.8, -1.7 - fz * 0.2, 1.2, -0.9 - fz * 0.2);
    ctx.closePath(); ctx.fill();

    /* Q: el pincel que pinta el ojo, y el deseo cumplido */
    if (q >= 0) {
      var llega = tramo(q, 0.0, 0.25), va = tramo(q, 0.6, 0.8);
      if (va < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - va;
        ctx.translate(3.9 + (1 - llega) * 5 + va * 4, 2.3 + (1 - llega) * 5 + va * 4);
        ctx.rotate(0.75 + Math.sin(pintado * 18) * 0.15);
        ctx.strokeStyle = '#c8a060'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(0.8, 0); ctx.lineTo(6.0, 0); ctx.stroke();
        contorno(ctx, 0.8);
        ctx.beginPath(); ctx.moveTo(0.8, -0.35); ctx.lineTo(6.0, -0.35); ctx.moveTo(0.8, 0.35); ctx.lineTo(6.0, 0.35); ctx.stroke();
        ctx.fillStyle = TINTA;
        ctx.beginPath(); ctx.moveTo(1.0, -0.55); ctx.quadraticCurveTo(-0.6, 0, -0.9, 0); ctx.quadraticCurveTo(-0.6, 0, 1.0, 0.55); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      for (k = 0; k < 8; k++) {
        var a = k * Math.PI / 4 + q * 2;
        estrella4(ctx, 2.6 + Math.cos(a) * (6 + brilla * 3), 1 + Math.sin(a) * (6 + brilla * 3),
          0.5 + brilla * 0.6, oro, brilla);
      }
    }
    ctx.restore();
  };

  /* ---------------- MANEKI-NEKO (cofre) ---------------- */
  /* El gato de la suerte, de porcelana: manchas del color del jugador, collar
   * rojo con cascabel, el koban de oro en una pata y la otra LEVANTADA. Come
   * saludando: cada bocado es un "ven, ven" con la pata. Q: LLUVIA DE KOBAN. */
  DRAW.maneki = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.3), k;
    var por = '#fbf8f0', porOsc = '#c8c2b4';
    var mancha = hex(mix(o.c, '#ff9a2a', 0.25)), manchaOsc = mix(mancha, '#2a1004', 0.45);
    var oro = '#ffd24a', oroOsc = '#a97d0d';
    var lluvia = (q >= 0) ? Math.sin(Math.min(1, q * 1.2) * Math.PI) : 0;
    /* la pata: arriba del todo (0) o doblada hacia delante (2) */
    var dobla = [0, 0.7, 1.4][fz];
    if (q >= 0) dobla = 0.7 + Math.sin(q * 50) * 0.7;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 4)) * 0.25 - 0.1);

    /* la cola, levantada por detrás */
    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4.0, -4.6); ctx.quadraticCurveTo(-7.2, -4.2, -6.8, -1.2 + Math.sin(t * 3) * 0.3); ctx.stroke();
    ctx.strokeStyle = mancha; ctx.lineWidth = 0.95; ctx.stroke();

    /* el cuerpo, sentado */
    var cuerpo = function () { ctx.beginPath(); ctx.ellipse(-0.6, -3.4, 4.4, 3.2, 0, 0, Math.PI * 2); };
    piezaX(ctx, cuerpo, por, porOsc, 0.5, 0.5, 1.6);
    ctx.save(); cuerpo(); ctx.clip();
    ctx.fillStyle = mancha;
    ctx.beginPath(); ctx.ellipse(-3.8, -2.4, 1.8, 1.4, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* las orejas */
    [[-2.0, 5.0, -1.0, 8.4, 1.0, 5.8], [1.8, 5.8, 3.8, 8.2, 4.6, 4.8]].forEach(function (e, i) {
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); ctx.lineTo(e[4], e[5]); ctx.closePath();
      }, i ? por : mancha, i ? porOsc : hex(manchaOsc), 0.2, 0.2, 1.4);
      ctx.fillStyle = '#ff9ab0';
      ctx.beginPath();
      ctx.moveTo(e[0] * 0.75 + e[4] * 0.25, e[1] * 0.75 + e[5] * 0.25 + 0.2);
      ctx.lineTo(e[2], e[3] - 1.0);
      ctx.lineTo(e[0] * 0.25 + e[4] * 0.75, e[1] * 0.25 + e[5] * 0.75 + 0.2);
      ctx.closePath(); ctx.fill();
    });

    /* la cabeza */
    var cabeza = function () { ctx.beginPath(); ctx.ellipse(1.0, 2.4, 4.4, 3.8, 0, 0, Math.PI * 2); };
    piezaX(ctx, cabeza, por, porOsc, 0.5, 0.5, 1.6);
    ctx.save(); cabeza(); ctx.clip();
    ctx.fillStyle = mancha;
    ctx.beginPath(); ctx.ellipse(-2.4, 4.4, 2.4, 1.8, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    cabeza(); contorno(ctx, 1.6); ctx.stroke();

    /* los ojos, grandes y contentos */
    [[0.6, 2.9], [3.2, 2.8]].forEach(function (e) {
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.ellipse(e[0], e[1], 0.62, 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(e[0] + 0.2, e[1] + 0.3, 0.24, 0, Math.PI * 2); ctx.fill();
    });
    /* la naricilla, la boca "ω" que se abre y los bigotes */
    ctx.fillStyle = '#ff7a95';
    ctx.beginPath(); ctx.moveTo(1.5, 1.7); ctx.lineTo(2.3, 1.7); ctx.lineTo(1.9, 1.2); ctx.closePath(); ctx.fill();
    if (fz > 0) {
      ctx.fillStyle = '#c8304a';
      ctx.beginPath(); ctx.ellipse(1.9, 0.5, 0.55, 0.3 + fz * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.28; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(1.5, 1.1, 0.4, Math.PI * 1.1, Math.PI * 1.95, false);
    ctx.arc(2.3, 1.1, 0.4, Math.PI * 1.05, Math.PI * 1.9, false);
    ctx.stroke();
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    ctx.moveTo(-0.4, 1.6); ctx.lineTo(-2.2, 1.9); ctx.moveTo(-0.4, 1.1); ctx.lineTo(-2.2, 0.8);
    ctx.moveTo(4.2, 1.6); ctx.lineTo(5.8, 1.9); ctx.moveTo(4.2, 1.1); ctx.lineTo(5.8, 0.8);
    ctx.stroke();

    /* el collar y el cascabel */
    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-2.8, -1.0); ctx.quadraticCurveTo(0.8, -2.2, 4.2, -0.8); ctx.stroke();
    ctx.strokeStyle = '#e0322a'; ctx.lineWidth = 0.8; ctx.stroke();
    if (!o.sinCascabel) {
      piezaX(ctx, function () { ctx.beginPath(); ctx.arc(1.4, -2.4, 0.95, 0, Math.PI * 2); }, oro, oroOsc, 0.2, 0.2, 1.3);
      ctx.strokeStyle = oroOsc; ctx.lineWidth = 0.22;
      ctx.beginPath(); ctx.moveTo(0.6, -2.5); ctx.lineTo(2.2, -2.5); ctx.moveTo(1.4, -2.5); ctx.lineTo(1.4, -3.3); ctx.stroke();
    }

    /* el koban, abrazado con la otra pata */
    ctx.save();
    ctx.translate(2.6, -4.6);
    ctx.rotate(-0.15);
    piezaX(ctx, function () { ctx.beginPath(); ctx.ellipse(0, 0, 1.3, 1.9, 0, 0, Math.PI * 2); }, oro, oroOsc, 0.2, 0.2, 1.3);
    ctx.strokeStyle = oroOsc; ctx.lineWidth = 0.18;
    ctx.beginPath();
    for (k = -2; k <= 2; k++) { ctx.moveTo(-0.9, k * 0.55); ctx.lineTo(0.9, k * 0.55); }
    ctx.stroke();
    ctx.restore();
    piezaX(ctx, function () { ctx.beginPath(); ctx.ellipse(1.4, -4.4, 1.1, 0.8, 0.3, 0, Math.PI * 2); }, por, porOsc, 0.2, 0.2, 1.3);

    /* la pata levantada: el brazo sube desde el hombro, la mano se dobla */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(3.2, -2.6);
      ctx.quadraticCurveTo(5.6, -2.2, 6.4, 1.2);
      ctx.lineTo(4.8, 1.6);
      ctx.quadraticCurveTo(4.4, -0.6, 3.0, -1.0);
      ctx.closePath();
    }, por, porOsc, 0.25, 0.25, 1.4);
    ctx.save();
    ctx.translate(5.6, 1.4);
    ctx.rotate(-dobla);
    piezaX(ctx, function () { ctx.beginPath(); ctx.ellipse(0.1, 1.2, 1.2, 1.4, 0, 0, Math.PI * 2); }, por, porOsc, 0.25, 0.25, 1.4);
    ctx.fillStyle = '#ff9ab0';
    ctx.beginPath(); ctx.arc(0.45, 1.1, 0.45, 0, Math.PI * 2); ctx.fill();
    [[-0.3, 2.0], [0.4, 2.3], [1.0, 1.9]].forEach(function (d) {
      ctx.beginPath(); ctx.arc(d[0], d[1], 0.2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    /* Q: la lluvia de koban */
    if (q >= 0) {
      for (k = 0; k < 10; k++) {
        var u = (q * 1.3 + k / 10) % 1;
        var vx = Math.cos(0.5 + k * 0.23) * (4 + (k % 3) * 2);
        var cx = 5.6 + vx * u * 1.4, cy = 3 + u * 9 - u * u * 14;
        ctx.save();
        ctx.globalAlpha = lluvia * (1 - u * 0.6);
        ctx.translate(cx, cy);
        ctx.scale(Math.abs(Math.cos(t * 9 + k)) * 0.8 + 0.2, 1);
        ctx.fillStyle = oro;
        ctx.beginPath(); ctx.ellipse(0, 0, 0.75, 1.05, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = oroOsc; ctx.lineWidth = 0.2; ctx.stroke();
        ctx.restore();
      }
      for (k = 0; k < 5; k++) {
        var u2 = (q * 2 + k / 5) % 1;
        estrella4(ctx, 5.6 + Math.sin(k * 2.4) * 6 * u2, 4 + u2 * 5, 0.6 * (1 - u2), '#fff6d0', lluvia * (1 - u2));
      }
    }
    ctx.restore();
  };

  /* ---------------- KASA-OBAKE ---------------- */
  /* El paraguas viejo que cobra vida: papel encerado del color del jugador,
   * UN OJO enorme, la lengua fuera y una sola pierna con su geta, a saltos.
   * La tela se abre como una boca. Q: SE ABRE de golpe, girando y
   * sacudiéndose el agua. */
  function lonaKasa(W, H, ab) {
    /* la lona entera por encima de la boca y la tira de abajo que muerde.
     * W = medio ancho, H = altura de la punta (negativa si está del revés) */
    var cab = new Path2D(), mand = new Path2D();
    var boca = 0.4 + H * 0.02;
    cab.moveTo(W - 0.4, boca);
    cab.quadraticCurveTo(W * 0.6, H * 0.6, 0.4, H);
    cab.quadraticCurveTo(-W * 0.65, H * 0.6, -W, -1.0);
    var n = 5, k;
    for (k = 0; k < n; k++) {
      var x0 = -W + (W) * k / n, x1 = -W + W * (k + 1) / n;
      cab.quadraticCurveTo((x0 + x1) / 2, -0.2, x1, -1.0);
    }
    cab.lineTo(0, boca);
    cab.closePath();
    mand.moveTo(0, boca);
    mand.lineTo(W - 0.4, boca);
    mand.lineTo(W, -1.0);
    for (k = n; k > 0; k--) {
      var y0 = W * k / n, y1 = W * (k - 1) / n;
      mand.quadraticCurveTo((y0 + y1) / 2, -0.2, y1, -1.0);
    }
    mand.closePath();
    return { cab: cab, mand: mand, boca: boca };
  }
  DRAW.kasa = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.2), k;
    var ang = [0, 12, 22][fz] * Math.PI / 180;
    var papel = hex(mix(o.c, '#c8382e', 0.4)), papelOsc = mix(papel, '#2a0404', 0.5);
    var papel2 = hex(mix(papel, '#fff4dc', 0.35));
    var ab = (q >= 0) ? Math.sin(Math.min(1, q * 1.15) * Math.PI) : 0;
    var vuelta = o.vuelta || 0;
    var W = 6.6 + ab * 3.4, H = 7.4 - ab * 3.2 - vuelta * 15;
    var salto = Math.abs(Math.sin(t * 6));
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, (salto * 1.3 - 0.3) * (1 - vuelta));

    /* la pierna peluda y la geta */
    var rodilla = (1 - salto) * 0.9;
    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0.2, -0.8); ctx.lineTo(0.9 + rodilla, -3.2); ctx.lineTo(0.3, -5.4); ctx.stroke();
    ctx.strokeStyle = '#e8b890'; ctx.lineWidth = 0.95; ctx.stroke();
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 0.18;
    ctx.beginPath();
    for (k = 0; k < 4; k++) { ctx.moveTo(0.6 + rodilla * 0.5 + k * 0.1, -1.6 - k * 0.8); ctx.lineTo(1.3 + rodilla * 0.5 + k * 0.1, -1.4 - k * 0.8); }
    ctx.stroke();
    piezaX(ctx, function () { ctx.beginPath(); roundRect(ctx, -1.4, -6.3, 3.8, 0.7, 0.2); }, '#c89a60', '#6a4a2a', 0.1, 0.1, 1.2);
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(-0.9, -7.0, 0.55, 0.75); ctx.fillRect(1.4, -7.0, 0.55, 0.75);
    ctx.strokeStyle = '#e0322a'; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(-0.4, -5.6); ctx.lineTo(0.4, -4.9); ctx.lineTo(1.2, -5.6); ctx.stroke();

    /* del revés, la tela sube por encima de la varilla */
    if (vuelta > 0) {
      ctx.translate(0, vuelta * 6);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0.2, -0.8 - vuelta * 6); ctx.lineTo(0.4, H); ctx.stroke();
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 0.4; ctx.stroke();
    }
    var L = lonaKasa(W + vuelta * 1.5, H, ab);
    /* dentro de la boca */
    ctx.fillStyle = '#2a0808';
    ctx.beginPath(); ctx.moveTo(0, L.boca); ctx.lineTo(W, L.boca); ctx.lineTo(W, -1.6); ctx.lineTo(0, -1.2); ctx.closePath(); ctx.fill();
    rostro(ctx, L.cab, L.mand, 0, L.boca, ang, papel, hex(papelOsc), 0.6, 0.6);

    /* las varillas y los paños alternos, que giran al abrirse */
    ctx.save(); ctx.clip(L.cab);
    var gira = (q >= 0) ? q * 9 : 0;
    for (k = -6; k <= 6; k++) {
      var fx = W * (k / 6 + (gira % (1 / 3)));
      if (k % 2 === 0) {
        ctx.fillStyle = papel2;
        ctx.beginPath(); ctx.moveTo(0.4, H); ctx.lineTo(fx, -1.2); ctx.lineTo(fx + W / 6, -1.2); ctx.closePath(); ctx.fill();
      }
    }
    ctx.strokeStyle = hex(papelOsc); ctx.lineWidth = 0.22;
    ctx.beginPath();
    for (k = -6; k <= 6; k++) { ctx.moveTo(0.4, H); ctx.lineTo(W * (k / 6 + (gira % (1 / 3))), -1.2); }
    ctx.stroke();
    ctx.restore();
    contorno(ctx, 1.6); ctx.stroke(L.cab);
    /* el remiendo de paraguas viejo */
    if (ab < 0.3 && vuelta < 0.3) {
      ctx.fillStyle = '#efe2c0';
      ctx.fillRect(-3.8, 1.2, 1.5, 1.3);
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 0.14;
      ctx.beginPath();
      ctx.moveTo(-3.8, 1.2); ctx.lineTo(-2.3, 2.5); ctx.moveTo(-2.3, 1.2); ctx.lineTo(-3.8, 2.5);
      ctx.stroke();
    }
    /* el remate de la punta */
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); ctx.ellipse(0.4, H + (H > 0 ? 0.5 : -0.5), 0.7, 0.55, 0, 0, Math.PI * 2); ctx.fill();

    /* el ojo, enorme */
    var ex = 1.6, ey = vuelta > 0.5 ? (H - 1) / 2 : Math.max(1.4, H * 0.42);
    var parpa = (Math.sin(t * 1.3) > 0.97) ? 0.15 : 1;
    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(ex, ey, 1.5, 1.35 * parpa, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.4); ctx.stroke();
    if (parpa > 0.5) {
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.arc(ex + 0.5, ey - 0.1, 0.72, 0, Math.PI * 2); ctx.fill();
      destello(ctx, ex + 0.8, ey + 0.3, 0.32, 0.95);
    }

    /* la lengua, fuera y moviéndose */
    var lw = Math.sin(t * 7) * 0.5;
    var lx = W + 1.6 + fz * 1.2, ly = -2.4 - fz * 0.5 + lw;
    ctx.save(); girarSobre(ctx, 0, L.boca, -ang * 0.6);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(W - 2.6, L.boca - 0.2);
      ctx.bezierCurveTo(W - 0.4, L.boca, W + 0.8, ly + 1.6, lx, ly);
      ctx.bezierCurveTo(W + 0.2, ly - 0.2, W - 0.6, L.boca - 1.6, W - 2.6, L.boca - 1.2);
      ctx.closePath();
    }, '#ff6a86', '#b02a48', 0.2, 0.2, 1.3);
    ctx.strokeStyle = '#b02a48'; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(W - 1.8, L.boca - 0.7); ctx.quadraticCurveTo(W + 0.4, ly + 0.6, lx - 0.8, ly - 0.1); ctx.stroke();
    ctx.restore();

    /* Q: se sacude el agua */
    if (q >= 0) {
      for (k = 0; k < 10; k++) {
        var u = (q * 2 + k / 10) % 1;
        var a2 = Math.PI * (0.1 + 0.8 * (k / 9));
        gota(ctx, Math.cos(a2) * (W + u * 6), 1 + Math.sin(a2) * (3 + u * 6), 0.4, '#8fe2ff', ab * (1 - u));
      }
    }
    ctx.restore();
  };

  /* ---------------- CHŌCHIN-OBAKE ---------------- */
  /* El farolillo de papel encantado: se le raja el papel y esa raja es la
   * boca, con la lengua fuera y la vela ardiendo dentro. Un ojo, el blasón
   * pintado y el gancho de colgar. Q: LLAMARADA por la boca. */
  var FAROL_RX = 4.1, FAROL_RY = 5.9, FAROL_BOCA = -0.4, FAROL_PIV = -0.6;
  function papelFarol() {
    var th0 = Math.asin(FAROL_BOCA / FAROL_RY);
    var fb = FAROL_RX * Math.cos(th0);
    /* ángulo del punto de abajo con f = FAROL_PIV */
    var thB = -Math.acos(FAROL_PIV / FAROL_RX);
    var cab = new Path2D(), mand = new Path2D();
    cab.moveTo(fb, FAROL_BOCA);
    cab.ellipse(0, 0, FAROL_RX, FAROL_RY, 0, th0, thB + Math.PI * 2, false);
    cab.lineTo(FAROL_PIV, FAROL_BOCA);
    cab.closePath();
    mand.moveTo(FAROL_PIV, FAROL_BOCA);
    mand.lineTo(fb, FAROL_BOCA);
    mand.ellipse(0, 0, FAROL_RX, FAROL_RY, 0, th0, thB, true);
    mand.closePath();
    return { cab: cab, mand: mand };
  }
  DRAW.chochin = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.1), k;
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var apagado = o.apagado || 0;
    var papel = hex(mix(hex(mix('#e2382a', o.c, 0.28)), '#4a3a36', apagado * 0.6));
    var papelOsc = mix(papel, '#5a2a08', 0.45);
    var llama = (q >= 0) ? Math.sin(Math.min(1, q * 1.2) * Math.PI) : 0;
    var vela = (0.8 + 0.2 * Math.sin(t * 13)) * (1 - apagado);
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    /* cuelga del gancho y se balancea */
    girarSobre(ctx, 0, 9.0, Math.sin(t * 2.6) * 0.1);
    ctx.translate(0, 0.4);

    /* el gancho */
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 6.4); ctx.lineTo(0, 8.8); ctx.arc(0.8, 8.8, 0.8, Math.PI, 0, true); ctx.stroke();
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 0.45; ctx.stroke();

    /* dentro: oscuro, con la vela */
    ctx.fillStyle = '#1e0c04';
    ctx.beginPath(); ctx.moveTo(FAROL_PIV, FAROL_BOCA); ctx.lineTo(5.0, FAROL_BOCA); ctx.lineTo(5.0, -3.0); ctx.lineTo(FAROL_PIV, -1.6); ctx.closePath(); ctx.fill();
    if (vela > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gv = ctx.createRadialGradient(2.4, -1.0, 0.1, 2.4, -1.0, 2.2);
      gv.addColorStop(0, 'rgba(255,220,120,' + vela + ')');
      gv.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = gv;
      ctx.beginPath(); ctx.arc(2.4, -1.0, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = mix('#fff6c0', '#fff6c0', 0, vela);
      ctx.beginPath(); ctx.ellipse(2.4, -1.1, 0.35, 0.7, 0, 0, Math.PI * 2); ctx.fill();
    }

    var P = papelFarol();
    rostro(ctx, P.cab, P.mand, FAROL_PIV, FAROL_BOCA, ang, papel, hex(papelOsc), 0.6, 0.6);

    /* las costillas de bambú, curvadas */
    ctx.strokeStyle = hex(papelOsc); ctx.lineWidth = 0.22;
    ctx.save(); ctx.clip(P.cab);
    for (k = -4; k <= 4; k++) {
      var sy = k * 1.25;
      if (sy < FAROL_BOCA - 0.2) continue;
      ctx.beginPath(); ctx.moveTo(-5, sy - 0.25); ctx.quadraticCurveTo(0, sy + 0.25, 5, sy - 0.25); ctx.stroke();
    }
    /* el blasón pintado en negro: el círculo y las tres comas (mitsudomoe) */
    ctx.strokeStyle = '#1a0e0a'; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.arc(-1.9, 2.0, 1.25, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#1a0e0a';
    for (k = 0; k < 3; k++) {
      var a = k * Math.PI * 2 / 3 + 0.4;
      ctx.beginPath();
      ctx.arc(-1.9 + Math.cos(a) * 0.5, 2.0 + Math.sin(a) * 0.5, 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.save(); girarSobre(ctx, FAROL_PIV, FAROL_BOCA, -ang); ctx.clip(P.mand);
    for (k = -4; k < 0; k++) {
      ctx.beginPath(); ctx.moveTo(-5, k * 1.25 - 0.25); ctx.quadraticCurveTo(0, k * 1.25 + 0.25, 5, k * 1.25 - 0.25); ctx.stroke();
    }
    ctx.restore();

    /* la luz de la vela a través del papel */
    if (vela > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gp = ctx.createRadialGradient(1.0, 0.4, 0.4, 1.0, 0.4, 5.4);
      gp.addColorStop(0, 'rgba(255,170,60,' + (0.28 * vela + llama * 0.35) + ')');
      gp.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = gp;
      ctx.beginPath(); ctx.arc(1.0, 0.4, 5.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* los aros lacados de arriba y de abajo */
    piezaX(ctx, function () { ctx.beginPath(); roundRect(ctx, -2.4, 5.4, 4.8, 1.3, 0.3); }, '#3a2a22', '#120a06', 0.15, 0.15, 1.3);
    ctx.save(); girarSobre(ctx, FAROL_PIV, FAROL_BOCA, -ang);
    piezaX(ctx, function () { ctx.beginPath(); roundRect(ctx, -2.4, -6.7, 4.8, 1.3, 0.3); }, '#3a2a22', '#120a06', 0.15, 0.15, 1.3);
    ctx.restore();

    /* el ojo, con una raja encima */
    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(2.4, 2.2, 1.25, 1.1, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.3); ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(2.85, 2.1, 0.55, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.1, 2.45, 0.26, 0.9);
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(0.6, 3.8); ctx.lineTo(1.3, 3.5); ctx.lineTo(1.1, 4.1); ctx.lineTo(1.9, 3.9); ctx.stroke();

    /* la lengua, corta y ancha */
    ctx.save(); girarSobre(ctx, FAROL_PIV, FAROL_BOCA, -ang * 0.5);
    var lw = Math.sin(t * 6) * 0.35;
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(2.4, FAROL_BOCA - 0.2);
      ctx.bezierCurveTo(4.6, FAROL_BOCA, 6.6, -1.2 + lw, 6.8, -2.6 + lw);
      ctx.bezierCurveTo(6.0, -3.2 + lw, 4.4, -2.2, 2.6, -1.6);
      ctx.closePath();
    }, '#ff6a86', '#b02a48', 0.2, 0.2, 1.3);
    ctx.restore();

    /* Q: la llamarada */
    if (q >= 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var largo = 6 + llama * 10;
      ctx.restore();
      /* tres capas, de fuera adentro: rojo, naranja y el corazón amarillo */
      [[1, '#ff3b0a', 2.6], [0.72, '#ff9a1a', 1.8], [0.45, '#fff0a0', 1.0]].forEach(function (capa, i) {
        var L2 = largo * capa[0], h = capa[2] * (0.6 + llama * 0.6);
        ctx.fillStyle = mix(capa[1], capa[1], 0, llama);
        ctx.beginPath();
        ctx.moveTo(4.2, -1.0 + h * 0.5);
        ctx.quadraticCurveTo(4.5 + L2 * 0.5, -1.0 + h * 1.3 + Math.sin(t * 20 + i) * 0.6, 4.5 + L2, -1 + Math.sin(t * 17 + i) * 1.0);
        ctx.quadraticCurveTo(4.5 + L2 * 0.5, -1.0 - h * 1.3 + Math.sin(t * 23 + i) * 0.6, 4.2, -1.0 - h * 0.5);
        ctx.closePath(); ctx.fill();
      });
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gf = ctx.createRadialGradient(8, -1, 0.5, 8, -1, 8);
      gf.addColorStop(0, 'rgba(255,200,90,' + (0.45 * llama) + ')');
      gf.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = gf;
      ctx.beginPath(); ctx.arc(8, -1, 8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      for (k = 0; k < 6; k++) {
        var u = (q * 2.2 + k / 6) % 1;
        ctx.fillStyle = mix('#ffd24a', '#ff3b0a', u, (1 - u) * llama);
        ctx.beginPath(); ctx.arc(5 + u * largo, -1 + Math.sin(k * 2.1) * 2.4 * u, 0.5 * (1 - u * 0.5), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ---------------- NAMAZU ---------------- */
  /* El siluro gigante que provoca los terremotos: cabezota ancha y chata,
   * bocaza, bigotes larguísimos que ondean y el cuerpo culebreando detrás.
   * Q: el TERREMOTO, que agrieta el suelo y lo hace temblar todo. */
  DRAW.namazu = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.2), k;
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var piel = hex(mix(o.c, '#5c6c58', 0.6)), pielOsc = mix(piel, '#101a10', 0.5);
    var vientre = hex(mix(piel, '#f0e6c8', 0.5));
    var tiembla = (q >= 0) ? Math.sin(Math.min(1, q * 1.1) * Math.PI) : 0;
    var w = Math.sin(t * 7) * (1 + tiembla);
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    if (tiembla > 0) ctx.translate(Math.sin(t * 83) * 0.45 * tiembla, Math.cos(t * 71) * 0.45 * tiembla);

    /* Q: las grietas del suelo, debajo de todo */
    if (q >= 0) {
      /* ondas de choque que salen del siluro, como anillos en el suelo */
      for (k = 0; k < 3; k++) {
        var uo = (q * 2.2 + k / 3) % 1;
        ctx.strokeStyle = 'rgba(214,170,110,' + ((1 - uo) * tiembla * 0.9) + ')';
        ctx.lineWidth = 0.9 * (1 - uo * 0.5);
        ctx.beginPath(); ctx.ellipse(-1, 0, 5 + uo * 11, 4 + uo * 9, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }

    /* la cola y el cuerpo, culebreando */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-8.4, 0.5 + w);
      ctx.quadraticCurveTo(-11.4, 2.8 + w * 1.4, -11.8, 0.2 + w * 1.6);
      ctx.quadraticCurveTo(-11.4, -2.4 + w * 1.4, -8.4, -0.5 + w);
      ctx.closePath();
    }, hex(pielOsc), hex(mix(hex(pielOsc), '#000000', 0.4)), 0.2, 0.2, 1.3);
    var cuerpo = function () {
      ctx.beginPath();
      ctx.moveTo(-0.5, 3.4);
      ctx.quadraticCurveTo(-5.4, 3.4 + w * 0.3, -8.8, 0.9 + w);
      ctx.lineTo(-8.8, -0.7 + w);
      ctx.quadraticCurveTo(-5.0, -3.4 + w * 0.3, -0.5, -3.4);
      ctx.closePath();
    };
    piezaX(ctx, cuerpo, piel, hex(pielOsc), 0.5, 0.5, 1.5);
    ctx.save(); cuerpo(); ctx.clip();
    ctx.fillStyle = vientre;
    ctx.beginPath(); ctx.ellipse(-4.0, -3.4 + w * 0.2, 5.0, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hex(pielOsc);
    [[-3.2, 1.6], [-5.4, 0.6], [-2.0, 0.0], [-6.6, 1.4]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1] + w * 0.25, 0.45, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    cuerpo(); contorno(ctx, 1.5); ctx.stroke();
    /* la aleta del lomo y la del pecho */
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.moveTo(-2.6, 3.2); ctx.quadraticCurveTo(-3.6, 5.0, -5.2, 4.4 + w * 0.2); ctx.lineTo(-4.6, 2.8); ctx.closePath();
    }, hex(pielOsc), hex(mix(hex(pielOsc), '#000000', 0.4)), 0.15, 0.15, 1.2);

    ctx.fillStyle = '#1e0c08';
    ctx.beginPath(); ctx.moveTo(0.4, -0.7); ctx.lineTo(7.2, -0.3); ctx.lineTo(7.2, -3.2); ctx.lineTo(0.4, -1.8); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(7.3, -0.2);
    cabeza.quadraticCurveTo(7.6, 1.8, 5.6, 2.8);
    cabeza.quadraticCurveTo(2.6, 4.0, -1.0, 3.8);
    cabeza.quadraticCurveTo(-2.8, 3.4, -2.8, 0.6);
    cabeza.quadraticCurveTo(-2.8, -1.6, -1.0, -1.8);
    cabeza.lineTo(0.6, -0.9);
    cabeza.lineTo(7.3, -0.2);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(0.4, -0.95); mand.lineTo(7.1, -0.4);
    mand.quadraticCurveTo(6.8, -2.6, 3.6, -3.2);
    mand.quadraticCurveTo(0.6, -3.6, -1.2, -2.6);
    mand.closePath();
    rostro(ctx, cabeza, mand, 0.6, -0.9, ang, piel, hex(pielOsc), 0.7, 0.7);
    ctx.save(); girarSobre(ctx, 0.6, -0.9, -ang); ctx.clip(mand);
    ctx.fillStyle = vientre;
    ctx.beginPath(); ctx.ellipse(3.4, -3.2, 4.4, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* el labio, grueso */
    ctx.strokeStyle = hex(mix(piel, '#f0e6c8', 0.3)); ctx.lineWidth = 0.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(2.4, -0.5); ctx.lineTo(7.1, -0.2); ctx.stroke();

    /* el ojillo */
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(3.4, 2.1, 0.7, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.1); ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(3.6, 2.1, 0.42, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.75, 2.35, 0.2, 0.95);

    /* los bigotes: dos largos del labio, dos cortos de la barbilla */
    var bl = Math.sin(t * 3.2) * 0.9, bl2 = Math.sin(t * 3.2 + 1.3) * 0.9;
    ctx.lineCap = 'round';
    [[1.0, 'TINTA'], [0.45, 'claro']].forEach(function (capa) {
      ctx.strokeStyle = capa[1] === 'TINTA' ? TINTA : hex(mix(piel, '#f0e6c8', 0.25));
      ctx.lineWidth = capa[0];
      ctx.beginPath();
      ctx.moveTo(6.4, 0.9); ctx.bezierCurveTo(9.6, 1.6, 10.4, 4.8 + bl, 7.0, 6.4 + bl);
      ctx.moveTo(6.6, 0.3); ctx.bezierCurveTo(10.2, 0.2, 11.0, -3.2 + bl2, 8.4, -5.8 + bl2);
      ctx.stroke();
      ctx.save(); girarSobre(ctx, 0.6, -0.9, -ang);
      ctx.lineWidth = capa[0] * 0.75;
      ctx.beginPath();
      ctx.moveTo(4.8, -2.8); ctx.quadraticCurveTo(5.4, -3.6, 5.0, -4.1 + bl * 0.2);
      ctx.stroke();
      ctx.restore();
    });

    /* Q: polvo que salta con cada sacudida */
    if (q >= 0) {
      for (k = 0; k < 8; k++) {
        var u = (q * 2.5 + k / 8) % 1;
        var a3 = k * 0.785;
        ctx.fillStyle = 'rgba(170,140,100,' + ((1 - u) * tiembla * 0.8) + ')';
        ctx.beginPath();
        ctx.arc(Math.cos(a3) * (6 + u * 6), Math.sin(a3) * (6 + u * 6), 0.4 + u * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };
