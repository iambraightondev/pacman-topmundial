  /* ---------------- DESPERTADOR ---------------- */
  /* El de dos campanas: la ESFERA es la cara —con sus agujas corriendo— y la
   * mitad de abajo se abre para comer. Q: la alarma, con el martillo
   * disparado entre las dos campanas. */
  DRAW.reloj = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0), k;
    var ang = [0, 15, 28][fz] * Math.PI / 180;
    var metal = hex(mix('#c3c7d2', o.c, 0.30)), metalOsc = mix(metal, '#2a2d38', 0.5);
    var esfera = '#f7f2e2', esferaOsc = '#c9c2ac';
    var alarma = (q >= 0) ? Math.sin(Math.min(1, q * 1.5) * Math.PI) : 0;
    var tiembla = alarma * Math.sin(t * 60) * 0.45;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(tiembla, Math.abs(Math.sin(t * 7)) * 0.2 - 0.1);

    /* patitas */
    ctx.strokeStyle = hex(metalOsc); ctx.lineWidth = 0.7; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2.4, -4.4); ctx.lineTo(-3.4, -6.0);
    ctx.moveTo(2.4, -4.4); ctx.lineTo(3.4, -6.0);
    ctx.stroke();

    /* las dos campanas y el martillo entre ellas */
    [[-3.1, 1], [3.1, -1]].forEach(function (c) {
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.arc(c[0], 4.5, 1.75, 0, Math.PI * 2);
      }, metal, hex(metalOsc), 0.4, 0.4, 1.6);
      destello(ctx, c[0] - 0.55 * c[1], 5.2, 0.45, 0.75);
    });
    var mart = alarma * Math.sin(t * 60) * 1.5;
    ctx.strokeStyle = hex(metalOsc); ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, 4.6); ctx.lineTo(mart, 6.3); ctx.stroke();
    ctx.fillStyle = metal;
    ctx.beginPath(); ctx.arc(mart, 6.4, 0.55, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();

    ctx.fillStyle = '#100b06';
    ctx.beginPath(); ctx.moveTo(-3.6, -0.7); ctx.lineTo(3.6, -0.5); ctx.lineTo(3.6, -4.2); ctx.lineTo(-3.6, -2.4); ctx.closePath(); ctx.fill();

    var cajaR = new Path2D();
    cajaR.moveTo(4.4, -0.6);
    cajaR.quadraticCurveTo(4.6, 2.6, 2.4, 4.0);
    cajaR.quadraticCurveTo(0.0, 5.2, -2.4, 4.0);
    cajaR.quadraticCurveTo(-4.6, 2.6, -4.4, -0.6);
    cajaR.lineTo(4.4, -0.6);
    cajaR.closePath();
    var mandR = new Path2D();
    mandR.moveTo(-4.4, -0.9);
    mandR.lineTo(4.4, -0.9);
    mandR.quadraticCurveTo(4.6, -3.4, 2.4, -4.6);
    mandR.quadraticCurveTo(0.0, -5.6, -2.4, -4.6);
    mandR.quadraticCurveTo(-4.6, -3.4, -4.4, -0.9);
    mandR.closePath();
    rostro(ctx, cajaR, mandR, -4.4, -0.8, ang, metal, hex(metalOsc), 0.6, 0.6);

    /* la esfera y las agujas */
    ctx.save(); ctx.clip(cajaR);
    ctx.fillStyle = esferaOsc;
    ctx.beginPath(); ctx.arc(0.5, -0.8, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = esfera;
    ctx.beginPath(); ctx.arc(0, -0.3, 3.5, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.3); ctx.stroke();
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.22;
    for (k = 0; k < 12; k++) {
      var am = k * Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(am) * 2.65, -0.3 + Math.sin(am) * 2.65);
      ctx.lineTo(Math.cos(am) * 3.1, -0.3 + Math.sin(am) * 3.1);
      ctx.stroke();
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(0, -0.3);
    ctx.lineTo(Math.cos(-t * 0.9) * 1.7, -0.3 + Math.sin(-t * 0.9) * 1.7); ctx.stroke();
    ctx.lineWidth = 0.38;
    ctx.beginPath(); ctx.moveTo(0, -0.3);
    ctx.lineTo(Math.cos(-t * 7) * 2.5, -0.3 + Math.sin(-t * 7) * 2.5); ctx.stroke();
    ctx.fillStyle = o.c;
    ctx.beginPath(); ctx.arc(0, -0.3, 0.45, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
    ctx.restore();

    /* la media esfera de abajo, en la mandíbula */
    ctx.save(); girarSobre(ctx, -4.4, -0.8, -ang); ctx.clip(mandR);
    ctx.fillStyle = esfera;
    ctx.beginPath(); ctx.arc(0, -1.2, 3.5, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.3); ctx.stroke();
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.22;
    for (k = 0; k < 6; k++) {
      var a2 = Math.PI + k * Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a2) * 2.65, -1.2 + Math.sin(a2) * 2.65);
      ctx.lineTo(Math.cos(a2) * 3.1, -1.2 + Math.sin(a2) * 3.1);
      ctx.stroke();
    }
    ctx.restore();

    /* Q: el timbrazo saliendo de las dos campanas */
    if (q >= 0) {
      ctx.lineCap = 'round';
      [-3.1, 3.1].forEach(function (cx) {
        for (var k2 = 0; k2 < 2; k2++) {
          var u = (q * 2.4 + k2 / 2) % 1;
          ctx.strokeStyle = 'rgba(255,240,190,' + ((1 - u) * alarma) + ')';
          ctx.lineWidth = 0.7 * (1 - u * 0.4);
          ctx.beginPath(); ctx.arc(cx, 4.8, 2.2 + u * 5.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        }
      });
    }
    ctx.restore();
  };

  /* ---------------- SEMÁFORO ---------------- */
  /* Las tres luces con su visera: la ROJA de arriba hace de ojo y la VERDE de
   * abajo es la boca, que se abre. Q: se pone en verde y arranca. */
  DRAW.semaforo = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0);
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var chapa = hex(mix('#2f3742', o.c, 0.13)), chapaOsc = mix(chapa, '#080a0e', 0.5);
    var verde = (q >= 0) ? 1 : 0.18;
    var ambar = (q >= 0 && q < 0.25) ? 1 : 0.18;
    var rojo = (q >= 0) ? 0.18 : (0.55 + 0.45 * Math.abs(Math.sin(t * 1.6)));
    var arranca = (q >= 0) ? Math.sin(Math.min(1, q * 1.7) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(arranca * 0.9, Math.sin(t * 6) * 0.1);

    ctx.fillStyle = '#06070b';
    ctx.beginPath(); ctx.moveTo(-2.6, -0.8); ctx.lineTo(3.4, -0.5); ctx.lineTo(3.4, -5.0); ctx.lineTo(-2.6, -3.0); ctx.closePath(); ctx.fill();

    var col = new Path2D();
    col.moveTo(3.3, -0.6);
    col.lineTo(3.4, 4.8);
    col.quadraticCurveTo(3.4, 6.2, 1.8, 6.3);
    col.lineTo(-1.6, 6.4);
    col.quadraticCurveTo(-3.2, 6.3, -3.2, 4.9);
    col.lineTo(-3.0, -0.9);
    col.lineTo(3.3, -0.6);
    col.closePath();
    var mandS = new Path2D();
    mandS.moveTo(-3.0, -1.1);
    mandS.lineTo(3.3, -0.8);
    mandS.quadraticCurveTo(3.4, -5.4, 1.8, -6.0);
    mandS.lineTo(-1.4, -6.1);
    mandS.quadraticCurveTo(-3.1, -5.6, -3.0, -1.1);
    mandS.closePath();
    rostro(ctx, col, mandS, -3.1, -1.0, ang, chapa, chapaOsc, 0.6, 0.6);

    function luz(cx, cy, color, fuerza, recorta) {
      ctx.save();
      if (recorta) ctx.clip(recorta);
      /* la visera */
      ctx.fillStyle = chapaOsc;
      ctx.beginPath();
      ctx.moveTo(cx - 1.55, cy + 0.5);
      ctx.quadraticCurveTo(cx, cy + 2.5, cx + 1.55, cy + 0.5);
      ctx.lineTo(cx + 1.55, cy + 0.1); ctx.lineTo(cx - 1.55, cy + 0.1);
      ctx.closePath(); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
      ctx.fillStyle = mix(color, '#000000', 0.72);
      ctx.beginPath(); ctx.arc(cx, cy, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mix(color, '#ffffff', 0.15, fuerza);
      ctx.beginPath(); ctx.arc(cx, cy, 1.15, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      if (fuerza > 0.5) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var g = ctx.createRadialGradient(cx, cy, 0.2, cx, cy, 3.4);
        g.addColorStop(0, mix(color, '#ffffff', 0.4, 0.55 * fuerza));
        g.addColorStop(1, mix(color, '#ffffff', 0.4, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      destello(ctx, cx - 0.45, cy + 0.5, 0.3, 0.55 * fuerza);
      ctx.restore();
    }
    luz(0.1, 4.4, '#ff2a2a', rojo, col);
    luz(0.1, 1.6, '#ffc21a', ambar, col);

    /* la verde, en la mandíbula: es la boca */
    ctx.save(); girarSobre(ctx, -3.1, -1.0, -ang);
    luz(0.1, -2.6, '#2bff6a', verde, mandS);
    ctx.restore();

    /* Q: sale disparado, con las rayas de velocidad */
    if (q >= 0) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * arranca) + ')'; ctx.lineWidth = 0.35;
      ctx.beginPath();
      [3.6, 1.2, -1.4].forEach(function (sl, k2) {
        var x0 = -4.2 - k2 * 1.0;
        ctx.moveTo(x0, sl); ctx.lineTo(x0 - 5.0 * arranca, sl);
      });
      ctx.stroke();
    }
    ctx.restore();
  };

  /* ---------------- CAJA FUERTE ---------------- */
  /* Acero remachado, bisagras y la RUEDA por ojo; la puerta blindada es la
   * boca. Q: se abre de golpe y escupe monedas. */
  DRAW.caja = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.2), k;
    var ang = [0, 18, 34][fz] * Math.PI / 180;
    var acero = hex(mix('#454b58', o.c, 0.16)), aceroOsc = mix(acero, '#0d0f14', 0.55);
    var oro = '#ffd24a', cromo = '#d5d8e0';
    var abre = (q >= 0) ? Math.sin(Math.min(1, q * 1.4) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 6)) * 0.18 - 0.1);

    ctx.fillStyle = '#05060a';
    ctx.beginPath(); ctx.moveTo(-4.2, -0.8); ctx.lineTo(4.6, -0.5); ctx.lineTo(4.6, -5.0); ctx.lineTo(-4.2, -3.0); ctx.closePath(); ctx.fill();

    var cuerpoC = new Path2D();
    cuerpoC.moveTo(4.6, -0.6);
    cuerpoC.lineTo(4.7, 3.8);
    cuerpoC.quadraticCurveTo(4.7, 5.2, 3.3, 5.3);
    cuerpoC.lineTo(-3.4, 5.4);
    cuerpoC.quadraticCurveTo(-4.8, 5.3, -4.8, 3.9);
    cuerpoC.lineTo(-4.6, -0.9);
    cuerpoC.lineTo(4.6, -0.6);
    cuerpoC.closePath();
    var puertaC = new Path2D();
    puertaC.moveTo(-4.6, -1.1);
    puertaC.lineTo(4.6, -0.8);
    puertaC.quadraticCurveTo(4.7, -5.2, 3.2, -5.7);
    puertaC.lineTo(-3.2, -5.8);
    puertaC.quadraticCurveTo(-4.7, -5.4, -4.6, -1.1);
    puertaC.closePath();
    rostro(ctx, cuerpoC, puertaC, -4.7, -1.0, ang, acero, aceroOsc, 0.7, 0.7);

    ctx.save(); ctx.clip(cuerpoC);
    /* remaches por el borde */
    ctx.fillStyle = cromo;
    for (k = 0; k < 7; k++) {
      ctx.beginPath(); ctx.arc(-3.9 + k * 1.3, 4.6, 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-3.9 + k * 1.3, 0.1, 0.24, 0, Math.PI * 2); ctx.fill();
    }
    /* bisagras, detrás */
    ctx.fillStyle = aceroOsc;
    roundRect(ctx, -4.9, 0.8, 0.9, 1.4, 0.3); ctx.fill();
    roundRect(ctx, -4.9, 3.0, 0.9, 1.4, 0.3); ctx.fill();
    /* la rueda: el ojo */
    ctx.save();
    ctx.translate(0.8, 2.5);
    ctx.rotate(t * 1.1 + abre * 7);
    piezaX(ctx, function () { ctx.beginPath(); ctx.arc(0, 0, 1.75, 0, Math.PI * 2); },
      cromo, '#6e7486', 0.3, 0.3, 1.6);
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.42; ctx.lineCap = 'round';
    ctx.beginPath();
    for (k = 0; k < 3; k++) {
      var ar = k * Math.PI / 3;
      ctx.moveTo(-Math.cos(ar) * 1.5, -Math.sin(ar) * 1.5);
      ctx.lineTo(Math.cos(ar) * 1.5, Math.sin(ar) * 1.5);
    }
    ctx.stroke();
    ctx.fillStyle = oro;
    ctx.beginPath(); ctx.arc(0, 0, 0.5, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
    ctx.restore();
    destello(ctx, -0.5, 3.4, 0.4, 0.6);
    ctx.restore();

    /* la puerta blindada */
    ctx.save(); girarSobre(ctx, -4.7, -1.0, -ang); ctx.clip(puertaC);
    ctx.fillStyle = aceroOsc;
    roundRect(ctx, -4.0, -5.2, 8.0, 3.9, 0.5); ctx.fill();
    ctx.strokeStyle = cromo; ctx.lineWidth = 0.26;
    roundRect(ctx, -3.4, -4.8, 6.8, 3.1, 0.4); ctx.stroke();
    ctx.fillStyle = oro;
    roundRect(ctx, 2.2, -3.6, 1.4, 0.6, 0.25); ctx.fill();
    contorno(ctx, 0.9); ctx.stroke();
    ctx.restore();

    /* Q: la puerta se abre y salen monedas volando */
    if (q >= 0) {
      for (k = 0; k < 7; k++) {
        var u = Math.min(1, q * 1.5 + k * 0.04);
        if (u <= 0.02) continue;
        var dx = 4.6 + u * (5 + (k % 3) * 2.5);
        var dy = -1.0 + Math.sin(u * Math.PI) * (3 + (k % 4)) - u * 2;
        ctx.save();
        ctx.globalAlpha = 1 - u * 0.75;
        ctx.translate(dx, dy);
        ctx.scale(Math.abs(Math.cos(u * 12 + k)) * 0.8 + 0.2, 1);
        ctx.fillStyle = oro;
        ctx.beginPath(); ctx.arc(0, 0, 0.78, 0, Math.PI * 2); ctx.fill();
        contorno(ctx, 1); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  };

  /* ---------------- BOLA DE DISCOTECA ---------------- */
  /* Bola de espejos con su enganche arriba: los espejitos se encienden por
   * turnos y sueltan haces que barren. El bocado de siempre, pero de
   * espejos. Q: suelta la pista entera. */
  DRAW.bola = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.3), k, j;
    var ang = DIR_ANGLE[o.d], media = HALF[fz];
    var fiesta = (q >= 0) ? Math.sin(Math.min(1, q * 1.5) * Math.PI) : 0;
    ctx.save();
    ctx.translate(o.x, o.y);

    /* los haces que barren, por detrás */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (k = 0; k < 6; k++) {
      var ah = t * 0.9 + k * Math.PI / 3;
      var largo = 9 + fiesta * 9;
      var col = PRISMA[(k + Math.floor(t)) % PRISMA.length];
      var g = ctx.createLinearGradient(0, 0, Math.cos(ah) * largo, Math.sin(ah) * largo);
      g.addColorStop(0, mix(col, '#ffffff', 0.3, 0.4 + fiesta * 0.4));
      g.addColorStop(1, mix(col, '#ffffff', 0.3, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ah - 0.11) * largo, Math.sin(ah - 0.11) * largo);
      ctx.lineTo(Math.cos(ah + 0.11) * largo, Math.sin(ah + 0.11) * largo);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    /* el enganche */
    ctx.save();
    frame(ctx, 0, 0, o.d);
    ctx.strokeStyle = '#9aa0b0'; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 5.8); ctx.lineTo(0, 7.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 8.0, 0.8, 0.2 * Math.PI, 1.8 * Math.PI); ctx.stroke();
    ctx.restore();

    function bocado() {
      ctx.beginPath();
      if (media <= 0) ctx.arc(0, 0, R, 0, Math.PI * 2);
      else {
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, ang + media, ang - media + Math.PI * 2);
        ctx.closePath();
      }
    }

    /* la bola: el mismo bocado de siempre, pero de espejitos */
    ctx.save();
    bocado(); ctx.clip();
    ctx.fillStyle = '#1c2030';
    ctx.fillRect(-R - 1, -R - 1, (R + 1) * 2, (R + 1) * 2);
    for (j = -4; j <= 4; j++) {
      var yy = j * 1.45, rr = Math.sqrt(Math.max(0, R * R - yy * yy));
      var n = Math.max(2, Math.round(rr * 1.25));
      for (k = 0; k < n; k++) {
        var xx = -rr + (k + 0.5) * (rr * 2 / n);
        var bri = 0.28 + 0.72 * Math.pow(Math.max(0, Math.sin(t * 2.4 + k * 1.7 + j * 0.9)), 6);
        bri = Math.min(1, bri + fiesta * 0.35);
        var cc = PRISMA[Math.abs(k + j * 3 + Math.floor(t * 2)) % PRISMA.length];
        ctx.fillStyle = mix(mix('#9fb4d8', cc, 0.35), '#ffffff', bri * 0.9);
        ctx.fillRect(xx - 0.62, yy - 0.62, 1.24, 1.24);
      }
    }
    var gv = ctx.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.15, 0, 0, R * 1.15);
    gv.addColorStop(0, 'rgba(255,255,255,.18)');
    gv.addColorStop(0.55, 'rgba(0,0,0,0)');
    gv.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = gv;
    ctx.fillRect(-R - 1, -R - 1, (R + 1) * 2, (R + 1) * 2);
    ctx.restore();

    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5 / S; ctx.lineJoin = 'round';
    bocado(); ctx.stroke();

    /* destellos sueltos */
    for (k = 0; k < 4; k++) {
      var ad = t * 1.6 + k * 1.57;
      destello(ctx, Math.cos(ad) * R * 0.62, Math.sin(ad) * R * 0.62, 0.6 + fiesta * 0.7,
        0.35 + 0.5 * Math.abs(Math.sin(t * 3 + k)) + fiesta * 0.4);
    }
    ctx.restore();
  };
