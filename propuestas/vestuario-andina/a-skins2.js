  /* ---------------- AJÍ ---------------- */
  /* Rocoto encendido: cuerpo rojo brillante con su rabito verde, cara de
   * pillo y la boca siempre a medio arder. Q: ECHA FUEGO por la boca y le
   * sale humo por arriba. */
  DRAW.aji = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0), k;
    var ang = [0, 18, 34][fz] * Math.PI / 180;
    var rojo = hex(mix(o.c, '#e01f1f', 0.7)), rojoOsc = mix(rojo, '#3a0202', 0.45);
    var verde = '#5a9a2a', verdeOsc = '#2e5a10';
    var quema = (q >= 0) ? Math.sin(Math.min(1, q * 1.6) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 7)) * 0.25 - 0.12);

    ctx.fillStyle = '#3a0000';
    ctx.beginPath(); ctx.moveTo(-1.6, -0.8); ctx.lineTo(6.4, -0.5); ctx.lineTo(6.4, -4.2); ctx.lineTo(-1.6, -2.4); ctx.closePath(); ctx.fill();

    /* el cuerpo del ají: gordo arriba y en punta atrás */
    var cuerpo = new Path2D();
    cuerpo.moveTo(6.4, -0.4);
    cuerpo.quadraticCurveTo(6.8, 2.4, 4.4, 4.2);
    cuerpo.quadraticCurveTo(1.0, 5.8, -2.6, 4.4);
    cuerpo.quadraticCurveTo(-5.6, 3.0, -5.2, 0.4);
    cuerpo.lineTo(-4.6, -0.9);
    cuerpo.lineTo(6.4, -0.4);
    cuerpo.closePath();
    var mand = new Path2D();
    mand.moveTo(-4.8, -1.1);
    mand.lineTo(6.4, -0.6);
    mand.quadraticCurveTo(6.8, -3.2, 4.2, -4.8);
    mand.quadraticCurveTo(0.8, -6.0, -2.6, -4.6);
    mand.quadraticCurveTo(-5.2, -3.4, -4.8, -1.1);
    mand.closePath();
    rostro(ctx, cuerpo, mand, -4.8, -1.0, ang, rojo, hex(rojoOsc), 0.8, 0.8);

    /* el brillo largo del pimiento */
    ctx.save(); ctx.clip(cuerpo);
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.beginPath();
    ctx.ellipse(1.0, 3.2, 3.4, 0.7, -0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* el rabito verde, atrás y arriba */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-3.4, 4.0);
      ctx.quadraticCurveTo(-4.6, 6.4, -2.6, 7.2);
      ctx.quadraticCurveTo(-1.6, 6.0, -1.8, 4.2);
      ctx.closePath();
    }, verde, verdeOsc, 0.3, 0.3, 1.4);
    ctx.fillStyle = verde;
    [[-4.4, 4.6], [-1.0, 4.8], [-2.8, 5.2]].forEach(function (h) {
      ctx.beginPath();
      ctx.ellipse(h[0], h[1], 1.1, 0.5, h[0] * 0.15, 0, Math.PI * 2);
      ctx.fill();
      contorno(ctx, 1); ctx.stroke();
    });

    /* los ojos, con cara de pillo */
    [[1.6, 2.2], [4.2, 1.6]].forEach(function (e) {
      ctx.fillStyle = '#fdfaf0';
      ctx.beginPath(); ctx.ellipse(e[0], e[1], 0.9, 0.8, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.arc(e[0] + 0.28, e[1] - 0.05, 0.4, 0, Math.PI * 2); ctx.fill();
    });
    destello(ctx, 2.1, 2.6, 0.22, 0.9);
    contorno(ctx, 2.4);
    ctx.beginPath();
    ctx.moveTo(0.4, 3.6); ctx.lineTo(2.4, 3.2);
    ctx.moveTo(3.2, 3.0); ctx.lineTo(5.2, 2.4);
    ctx.stroke();

    /* siempre le sale un hilito de humo */
    for (k = 0; k < 3; k++) {
      var ph = ((t * 0.9) + k / 3) % 1;
      ctx.fillStyle = 'rgba(210,210,220,' + ((0.2 + 0.4 * quema) * (1 - ph)) + ')';
      ctx.beginPath();
      ctx.arc(-2.4 + Math.sin(ph * 5 + k) * 1.4, 7.4 + ph * 5, 0.5 + ph * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Q: la llamarada */
    if (q >= 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (k = 0; k < 4; k++) {
        var u = (q * 1.7 + k / 4) % 1;
        var lar = 5 + u * 11;
        var g = ctx.createLinearGradient(6, -1, 6 + lar, -1);
        g.addColorStop(0, 'rgba(255,240,180,' + ((1 - u) * quema) + ')');
        g.addColorStop(0.4, 'rgba(255,140,26,' + ((1 - u) * quema * 0.75) + ')');
        g.addColorStop(1, 'rgba(255,50,10,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(6, -1);
        ctx.quadraticCurveTo(6 + lar * 0.5, -1 + 3.2 * (1 - u), 6 + lar, -1);
        ctx.quadraticCurveTo(6 + lar * 0.5, -1 - 3.2 * (1 - u), 6, -1);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  };

  /* ---------------- SAPO ---------------- */
  /* El de bronce del juego del sapo, el de las cantinas: sentado, con la boca
   * abierta de par en par esperando la moneda. Q: TRAGA la moneda y suena la
   * campanilla. */
  DRAW.sapo = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0), k;
    var ang = [0, 20, 38][fz] * Math.PI / 180;
    var bronce = hex(mix('#9a7a34', o.c, 0.22)), bronceOsc = mix(bronce, '#2e2208', 0.5);
    var oro = '#ffd24a';
    var traga = (q >= 0) ? Math.min(1, q * 1.6) : -1;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 5)) * 0.2 - 0.1);

    /* las patas de delante, apoyadas */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(2.0, -3.8);
      ctx.quadraticCurveTo(5.8, -4.6, 6.8, -6.0);
      ctx.quadraticCurveTo(4.2, -6.8, 1.6, -5.8);
      ctx.closePath();
    }, bronce, hex(bronceOsc), 0.3, 0.3, 1.4);

    ctx.fillStyle = '#1a1200';
    ctx.beginPath(); ctx.moveTo(-2.6, -0.8); ctx.lineTo(6.2, -0.5); ctx.lineTo(6.2, -4.6); ctx.lineTo(-2.6, -2.6); ctx.closePath(); ctx.fill();

    var cuerpo = new Path2D();
    cuerpo.moveTo(6.2, -0.4);
    cuerpo.quadraticCurveTo(6.4, 1.8, 4.6, 2.6);
    cuerpo.quadraticCurveTo(2.0, 3.6, -0.8, 3.2);
    cuerpo.quadraticCurveTo(-4.4, 2.8, -5.0, 0.6);
    cuerpo.lineTo(-4.6, -0.9);
    cuerpo.lineTo(6.2, -0.4);
    cuerpo.closePath();
    var mand = new Path2D();
    mand.moveTo(-4.8, -1.1);
    mand.lineTo(6.2, -0.6);
    mand.quadraticCurveTo(6.4, -3.6, 4.0, -5.0);
    mand.quadraticCurveTo(0.4, -6.0, -2.8, -5.0);
    mand.quadraticCurveTo(-5.0, -3.8, -4.8, -1.1);
    mand.closePath();
    rostro(ctx, cuerpo, mand, -4.8, -1.0, ang, bronce, hex(bronceOsc), 0.7, 0.7);

    /* el agujero de la boca, negro de verdad */
    ctx.save(); girarSobre(ctx, -4.8, -1.0, -ang); ctx.clip(mand);
    ctx.fillStyle = '#06050a';
    ctx.beginPath(); ctx.ellipse(1.2, -2.2, 3.6, 1.5, 0.02, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* los ojos saltones, de bronce pulido */
    [[1.0, 3.4, 1.6], [4.0, 2.8, 1.3]].forEach(function (e) {
      piezaX(ctx, function () { ctx.beginPath(); ctx.arc(e[0], e[1], e[2], 0, Math.PI * 2); },
        bronce, hex(bronceOsc), 0.25, 0.25, 1.4);
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.ellipse(e[0] + 0.2, e[1], e[2] * 0.32, e[2] * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      destello(ctx, e[0] - 0.4, e[1] + 0.55, e[2] * 0.22, 0.9);
    });

    /* los lunares del bronce */
    ctx.fillStyle = hex(bronceOsc);
    [[-2.6, 1.6], [-0.6, 0.8], [-3.6, 0.2], [1.4, 0.6]].forEach(function (p) {
      ctx.beginPath(); ctx.ellipse(p[0], p[1], 0.45, 0.3, 0.3, 0, Math.PI * 2); ctx.fill();
    });

    /* Q: la moneda entrando y la campanilla */
    if (q >= 0) {
      var cx = 14 - traga * 11, cy = 4 - traga * 5.5;
      ctx.save();
      ctx.globalAlpha = traga < 0.92 ? 1 : (1 - traga) / 0.08;
      ctx.translate(cx, cy);
      ctx.scale(Math.abs(Math.cos(traga * 14)) * 0.8 + 0.2, 1);
      ctx.fillStyle = oro;
      ctx.beginPath(); ctx.arc(0, 0, 1.1, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.restore();
      if (traga > 0.85) {
        var tim = (traga - 0.85) / 0.15;
        ctx.lineCap = 'round';
        for (k = 0; k < 2; k++) {
          var u = (tim + k / 2) % 1;
          ctx.strokeStyle = 'rgba(255,230,160,' + ((1 - u) * 0.95) + ')';
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.arc(0, -1, 3 + u * 7, -1.1, 1.1); ctx.stroke();
        }
      }
    }
    ctx.restore();
  };

  /* ---------------- COLIBRÍ DE NAZCA ---------------- */
  /* El geoglifo: no es un pájaro, es el DIBUJO del pájaro, hecho con la línea
   * clara sobre la tierra. Se ve el surco y la línea. Q: se enciende el
   * trazo entero, como visto desde el cielo. */
  DRAW.nazca = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.4), k;
    var media = HALF[fz], angD = DIR_ANGLE[o.d];
    var tierra = hex(mix('#6b4a32', o.c, 0.14)), tierraOsc = mix(tierra, '#1e1208', 0.5);
    var linea = hex(mix('#e8d8b8', o.c, 0.3));
    var enciende = (q >= 0) ? Math.sin(Math.min(1, q * 1.3) * Math.PI) : 0;
    ctx.save();
    ctx.translate(o.x, o.y);

    function bocado() {
      ctx.beginPath();
      if (media <= 0) ctx.arc(0, 0, R, 0, Math.PI * 2);
      else {
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, angD + media, angD - media + Math.PI * 2);
        ctx.closePath();
      }
    }

    /* la tierra del desierto */
    ctx.save();
    bocado(); ctx.clip();
    ctx.fillStyle = hex(tierraOsc);
    ctx.fillRect(-R - 1, -R - 1, (R + 1) * 2, (R + 1) * 2);
    ctx.fillStyle = tierra;
    ctx.beginPath(); ctx.arc(-0.7, 0.7, R, 0, Math.PI * 2); ctx.fill();
    /* piedrecillas */
    ctx.fillStyle = hex(tierraOsc);
    for (k = 0; k < 14; k++) {
      var a2 = k * 1.7, r2 = 1.5 + (k % 5) * 1.1;
      ctx.fillRect(Math.cos(a2) * r2, Math.sin(a2) * r2, 0.5, 0.5);
    }

    /* EL TRAZO del colibrí, en el marco del cuerpo */
    ctx.save();
    frame(ctx, 0, 0, o.d);
    var lum = 0.55 + 0.45 * Math.abs(Math.sin(t * 1.4)) + enciende;
    [[1.5, 0.35], [0.7, 1]].forEach(function (capa) {
      ctx.strokeStyle = mix(linea, '#ffffff', capa[1] > 0.5 ? 0.35 : 0,
        Math.min(1, capa[1] * lum));
      ctx.lineWidth = capa[0];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      /* el pico larguísimo —es lo que lo delata— y el cuerpecito */
      ctx.beginPath();
      ctx.moveTo(6.2, 0);
      ctx.lineTo(1.0, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1.0, -0.8);
      ctx.lineTo(1.0, 0.8);
      ctx.lineTo(-1.4, 0.9);
      ctx.lineTo(-1.4, -0.9);
      ctx.closePath();
      ctx.stroke();
      /* las dos alas, largas y estiradas arriba y abajo */
      ctx.beginPath();
      ctx.moveTo(0.6, 0.7); ctx.lineTo(-0.4, 5.2); ctx.lineTo(-2.6, 5.0); ctx.lineTo(-1.2, 0.8);
      ctx.moveTo(0.6, -0.7); ctx.lineTo(-0.4, -5.2); ctx.lineTo(-2.6, -5.0); ctx.lineTo(-1.2, -0.8);
      ctx.stroke();
      /* la cola, dos plumas largas que se abren */
      ctx.beginPath();
      ctx.moveTo(-1.4, 0.5); ctx.lineTo(-6.0, 2.6);
      ctx.moveTo(-1.4, -0.5); ctx.lineTo(-6.0, -2.6);
      ctx.moveTo(-6.0, 2.6); ctx.lineTo(-4.4, 0.2); ctx.lineTo(-6.0, -2.6);
      ctx.stroke();
    });
    ctx.restore();
    ctx.restore();

    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5 / S; ctx.lineJoin = 'round';
    bocado(); ctx.stroke();

    /* Q: el trazo se enciende y sube polvo */
    if (q >= 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R + 6 + enciende * 6);
      g.addColorStop(0, mix(linea, '#ffffff', 0.5, 0.35 * enciende));
      g.addColorStop(1, mix(linea, '#ffffff', 0.5, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R + 6 + enciende * 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      for (k = 0; k < 8; k++) {
        var u = (q * 1.2 + k / 8) % 1;
        ctx.fillStyle = 'rgba(200,180,150,' + ((1 - u) * enciende * 0.8) + ')';
        ctx.fillRect(Math.cos(k * 0.8) * (R + u * 7), Math.sin(k * 0.8) * (R + u * 7), 0.7, 0.7);
      }
    }
    ctx.restore();
  };
