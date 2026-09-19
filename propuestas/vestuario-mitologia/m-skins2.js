  /* ---------------- ESFINGE ---------------- */
  /* Cara de piedra con el tocado a rayas de los faraones, la barba postiza y
   * una zarpa de león delante. Q: el ACERTIJO, un interrogante que sale y se
   * queda flotando. */
  DRAW.esfinge = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.4), k;
    var ang = [0, 12, 22][fz] * Math.PI / 180;
    var arena = hex(mix('#d8b878', o.c, 0.22)), arenaOsc = mix(arena, '#4a3410', 0.45);
    var raya = hex(mix(o.c, '#2b6fd8', 0.66)), oro = '#ffd24a';
    var piensa = (q >= 0) ? Math.sin(Math.min(1, q * 1.4) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 3.6) * 0.14);

    /* la zarpa, delante y abajo */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(2.2, -3.6);
      ctx.quadraticCurveTo(6.4, -4.4, 7.4, -5.6);
      ctx.quadraticCurveTo(5.0, -6.6, 1.8, -5.8);
      ctx.closePath();
    }, arena, hex(arenaOsc), 0.4, 0.4, 1.5);
    ctx.strokeStyle = hex(arenaOsc); ctx.lineWidth = 0.3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (k = 0; k < 3; k++) {
      ctx.moveTo(5.2 + k * 0.7, -4.9 - k * 0.15);
      ctx.lineTo(5.6 + k * 0.7, -5.9 - k * 0.15);
    }
    ctx.stroke();

    ctx.fillStyle = '#3a1a08';
    ctx.beginPath(); ctx.moveTo(1.2, -0.7); ctx.lineTo(6.0, -0.4); ctx.lineTo(6.0, -3.0); ctx.lineTo(1.2, -1.6); ctx.closePath(); ctx.fill();

    /* el tocado: dos paños que caen a los lados */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-4.8, 4.2);
      ctx.quadraticCurveTo(-4.2, 7.2, 0.4, 7.2);
      ctx.quadraticCurveTo(4.6, 7.0, 5.2, 4.0);
      ctx.lineTo(4.4, -1.8);
      ctx.quadraticCurveTo(2.0, -3.0, -0.4, -2.2);
      ctx.lineTo(-4.0, -1.0);
      ctx.closePath();
    }, arena, hex(arenaOsc), 0.6, 0.6, 1.7);
    /* las rayas del tocado */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-4.8, 4.2);
    ctx.quadraticCurveTo(-4.2, 7.2, 0.4, 7.2);
    ctx.quadraticCurveTo(4.6, 7.0, 5.2, 4.0);
    ctx.lineTo(4.4, -1.8);
    ctx.quadraticCurveTo(2.0, -3.0, -0.4, -2.2);
    ctx.lineTo(-4.0, -1.0);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = raya;
    for (k = 0; k < 6; k++) ctx.fillRect(-5.2, 5.6 - k * 1.5, 11, 0.7);
    ctx.restore();

    var cabeza = new Path2D();
    cabeza.moveTo(6.0, 0.4);
    cabeza.quadraticCurveTo(6.2, 2.6, 4.4, 4.0);
    cabeza.quadraticCurveTo(2.0, 5.4, -0.6, 4.8);
    cabeza.quadraticCurveTo(-3.0, 4.2, -3.0, 1.4);
    cabeza.quadraticCurveTo(-3.0, -0.8, -0.8, -1.4);
    cabeza.lineTo(1.0, -0.9);
    cabeza.lineTo(6.0, 0.4);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(0.8, -1.0); mand.lineTo(6.0, -0.2);
    mand.quadraticCurveTo(5.6, -2.4, 3.2, -2.9);
    mand.quadraticCurveTo(0.6, -3.2, -0.8, -2.0);
    mand.closePath();
    rostro(ctx, cabeza, mand, 0.8, -1.0, ang, arena, hex(arenaOsc), 0.6, 0.6);

    /* la barba postiza, colgando de la mandíbula */
    ctx.save(); girarSobre(ctx, 0.8, -1.0, -ang);
    piezaX(ctx, function () {
      ctx.beginPath();
      roundRect(ctx, 2.0, -6.2, 1.5, 3.6, 0.5);
    }, arena, hex(arenaOsc), 0.25, 0.25, 1.3);
    ctx.strokeStyle = hex(arenaOsc); ctx.lineWidth = 0.22;
    ctx.beginPath();
    for (k = 0; k < 3; k++) { ctx.moveTo(2.1, -5.6 + k * 1.0); ctx.lineTo(3.4, -5.6 + k * 1.0); }
    ctx.stroke();
    ctx.restore();

    /* el ojo, pintado a la egipcia */
    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(2.6, 2.0, 1.15, 0.8, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(2.9, 1.95, 0.45, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.1, 2.25, 0.25, 0.9);
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.32; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(1.3, 2.0); ctx.lineTo(0.4, 1.4);
    ctx.moveTo(1.4, 3.1); ctx.quadraticCurveTo(2.6, 3.6, 3.8, 2.9);
    ctx.stroke();
    /* el ureo de la frente */
    ctx.fillStyle = oro;
    ctx.beginPath(); ctx.ellipse(1.0, 4.6, 0.7, 0.5, -0.3, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.1); ctx.stroke();

    /* Q: el acertijo */
    if (q >= 0) {
      ctx.save();
      ctx.globalAlpha = piensa;
      ctx.strokeStyle = mix(oro, '#ffffff', 0.3, 1);
      ctx.lineWidth = 0.75; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var bx = 7.5 + piensa * 1.5, by = 6.0 + Math.sin(t * 3) * 0.5;
      ctx.beginPath();
      ctx.arc(bx, by + 1.1, 1.15, Math.PI * 0.95, Math.PI * 2.15);
      ctx.lineTo(bx, by - 0.5);
      ctx.stroke();
      ctx.fillStyle = mix(oro, '#ffffff', 0.3, 1);
      ctx.beginPath(); ctx.arc(bx, by - 1.5, 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      for (k = 0; k < 4; k++) {
        var u = (q * 1.2 + k / 4) % 1;
        estrella4(ctx, 6.5 + u * 5, 3.0 + u * 4, 0.55 * (1 - u), oro, (1 - u) * piensa);
      }
    }
    ctx.restore();
  };

  /* ---------------- ÍCARO ---------------- */
  /* El chaval de las alas de cera: dos alas de plumas pegadas con cera, cara
   * de crío y una sonrisa de no saber lo que le espera. Q: SE ELEVA, las
   * alas baten fuerte y sube dejando plumas. */
  DRAW.icaro = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.2), k;
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var piel = '#f0c89a', pielOsc = '#a8764a';
    var pelo = hex(mix(o.c, '#6b3f1c', 0.5)), peloOsc = mix(pelo, '#241003', 0.5);
    var pluma = '#f7f2e2', plumaOsc = '#bdb59a', cera = '#ffe9a8';
    var sube = (q >= 0) ? Math.sin(Math.min(1, q * 1.4) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 4) * 0.25 + sube * 1.2);

    /* las alas, una a cada lado */
    var bate = Math.sin(t * 6) * 0.9 + sube * 3;
    [1, -1].forEach(function (lado) {
      if (lado < 0 && sube < 0.15) return;
      for (k = 3; k >= 0; k--) {
        var largo = 5.0 + k * 1.7;
        ctx.save();
        ctx.translate(-1.0, lado * 0.8);
        ctx.rotate(lado * (0.25 + k * 0.16 + bate * 0.1));
        piezaX(ctx, function () {
          ctx.beginPath();
          ctx.moveTo(0, lado * -1.6);
          ctx.quadraticCurveTo(-largo * 0.55, lado * (3.4 + bate * 0.6), -largo, lado * (2.2 + bate));
          ctx.quadraticCurveTo(-largo * 0.5, lado * -0.4, 0, lado * 1.6);
          ctx.closePath();
        }, pluma, plumaOsc, 0.35, 0.35, 1.3);
        ctx.restore();
      }
      /* la cera que las pega */
      ctx.fillStyle = cera;
      ctx.beginPath(); ctx.ellipse(-1.2, lado * 1.2, 1.1, 0.6, lado * 0.3, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
    });

    ctx.fillStyle = '#5c1020';
    ctx.beginPath(); ctx.moveTo(1.4, -0.7); ctx.lineTo(5.6, -0.4); ctx.lineTo(5.6, -2.8); ctx.lineTo(1.4, -1.5); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(5.6, 0.6);
    cabeza.quadraticCurveTo(5.8, 2.6, 4.0, 3.8);
    cabeza.quadraticCurveTo(1.6, 5.0, -0.8, 4.2);
    cabeza.quadraticCurveTo(-3.0, 3.4, -2.8, 1.0);
    cabeza.quadraticCurveTo(-2.6, -1.0, -0.4, -1.6);
    cabeza.lineTo(1.2, -0.9);
    cabeza.lineTo(5.6, 0.6);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(1.0, -1.0); mand.lineTo(5.6, -0.2);
    mand.quadraticCurveTo(5.2, -2.2, 2.8, -2.7);
    mand.quadraticCurveTo(0.4, -2.9, -0.8, -1.8);
    mand.closePath();
    rostro(ctx, cabeza, mand, 1.0, -1.0, ang, piel, pielOsc, 0.6, 0.6);

    /* el flequillo */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-2.8, 1.6);
      ctx.quadraticCurveTo(-3.0, 5.2, 0.6, 5.2);
      ctx.quadraticCurveTo(3.8, 5.0, 4.6, 3.0);
      ctx.quadraticCurveTo(3.0, 4.0, 1.6, 3.4);
      ctx.quadraticCurveTo(0.2, 2.6, -0.8, 3.4);
      ctx.quadraticCurveTo(-1.8, 3.0, -2.8, 1.6);
      ctx.closePath();
    }, pelo, hex(peloOsc), 0.4, 0.4, 1.4);

    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(2.6, 1.7, 0.95, 0.85, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    ctx.fillStyle = '#3a6fd8';
    ctx.beginPath(); ctx.arc(2.95, 1.65, 0.48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(2.95, 1.65, 0.24, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.2, 2.0, 0.24, 0.95);
    /* los mofletes de crío */
    ctx.fillStyle = 'rgba(232,120,120,.42)';
    ctx.beginPath(); ctx.ellipse(1.4, 0.4, 1.0, 0.6, 0.1, 0, Math.PI * 2); ctx.fill();

    /* Q: el impulso hacia arriba */
    if (q >= 0) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * sube) + ')'; ctx.lineWidth = 0.32;
      ctx.beginPath();
      for (k = 0; k < 4; k++) {
        var xx = -5 + k * 3.2;
        ctx.moveTo(xx, -5.5); ctx.lineTo(xx, -5.5 - 4.5 * sube);
      }
      ctx.stroke();
      for (k = 0; k < 5; k++) {
        var u = (q * 1.3 + k / 5) % 1;
        ctx.save();
        ctx.globalAlpha = (1 - u) * sube;
        ctx.translate(-3 + Math.sin(k * 2.2) * 5, -4 - u * 9);
        ctx.rotate(u * 3 + k);
        ctx.fillStyle = pluma;
        ctx.beginPath(); ctx.ellipse(0, 0, 1.1, 0.4, 0, 0, Math.PI * 2); ctx.fill();
        contorno(ctx, 0.9); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  };

  /* ---------------- TRITÓN ---------------- */
  /* Medio pez: escamas, aletas por orejas, barba de alga y una CARACOLA que
   * le hace de cuerno. Q: sopla la caracola y sale una ola. */
  DRAW.triton = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.2), k;
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var piel = hex(mix(o.c, '#2f9fb8', 0.62)), pielOsc = mix(piel, '#052430', 0.45);
    var barba = '#6fd8a8', caracola = '#f4e2c8', caracolaOsc = '#bfa483';
    var sopla = (q >= 0) ? Math.sin(Math.min(1, q * 1.5) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 3.2) * 0.3);

    /* la aleta de la oreja */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-2.0, 2.2);
      ctx.quadraticCurveTo(-6.0, 4.2, -6.6, 1.4);
      ctx.quadraticCurveTo(-4.4, 0.2, -2.2, 0.8);
      ctx.closePath();
    }, piel, hex(pielOsc), 0.4, 0.4, 1.4);
    ctx.strokeStyle = hex(pielOsc); ctx.lineWidth = 0.28;
    ctx.beginPath();
    for (k = 0; k < 3; k++) { ctx.moveTo(-2.6, 1.6 - k * 0.1); ctx.lineTo(-5.8, 2.6 - k * 0.9); }
    ctx.stroke();

    /* la cresta dorsal */
    for (k = 0; k < 4; k++) {
      var h = 1.3 + Math.sin(t * 4 + k) * 0.25;
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(-2.4 + k * 1.3, 4.0);
        ctx.lineTo(-1.9 + k * 1.3, 4.0 + h * 1.7);
        ctx.lineTo(-1.2 + k * 1.3, 4.1);
        ctx.closePath();
      }, hex(mix(piel, '#ffffff', 0.25)), hex(pielOsc), 0.2, 0.2, 1.1);
    }

    ctx.fillStyle = '#062230';
    ctx.beginPath(); ctx.moveTo(1.0, -0.7); ctx.lineTo(5.8, -0.4); ctx.lineTo(5.8, -3.2); ctx.lineTo(1.0, -1.6); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(5.8, 0.4);
    cabeza.quadraticCurveTo(6.0, 2.4, 4.2, 3.6);
    cabeza.quadraticCurveTo(1.6, 4.8, -1.0, 4.0);
    cabeza.quadraticCurveTo(-3.4, 3.2, -3.2, 0.8);
    cabeza.quadraticCurveTo(-3.0, -1.2, -0.6, -1.8);
    cabeza.lineTo(0.8, -0.9);
    cabeza.lineTo(5.8, 0.4);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(0.6, -1.0); mand.lineTo(5.8, -0.2);
    mand.quadraticCurveTo(5.4, -2.6, 3.0, -3.1);
    mand.quadraticCurveTo(0.2, -3.3, -1.2, -2.0);
    mand.closePath();
    rostro(ctx, cabeza, mand, 0.6, -1.0, ang, piel, hex(pielOsc), 0.7, 0.7);

    /* escamas */
    ctx.save(); ctx.clip(cabeza);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 0.22;
    for (k = 0; k < 10; k++) {
      var ex = -2.6 + (k % 5) * 1.5, ey = 0.4 + Math.floor(k / 5) * 1.3;
      ctx.beginPath(); ctx.arc(ex, ey, 0.75, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
    ctx.restore();

    /* la barba de alga, en la mandíbula */
    ctx.save(); girarSobre(ctx, 0.6, -1.0, -ang);
    for (k = 0; k < 4; k++) {
      var w = Math.sin(t * 3 + k * 1.2) * 0.6;
      ctx.strokeStyle = barba; ctx.lineWidth = 0.75; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0.4 + k * 1.1, -2.2);
      ctx.quadraticCurveTo(0.0 + k * 1.1 + w, -4.4, -0.6 + k * 1.1 + w * 1.6, -6.0);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(2.6, 1.7, 1.0, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    ctx.fillStyle = '#1a3f5c';
    ctx.beginPath(); ctx.arc(2.95, 1.65, 0.48, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.2, 2.0, 0.25, 0.95);

    /* la caracola, delante de la boca al soplar */
    if (sopla > 0.05 || fz > 0) {
      ctx.save();
      ctx.translate(6.4 + sopla * 0.6, -0.6);
      ctx.rotate(-0.25);
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(-1.6, 0);
        ctx.quadraticCurveTo(0.6, -1.8, 3.2, -1.2);
        ctx.quadraticCurveTo(3.6, 0.4, 2.6, 1.4);
        ctx.quadraticCurveTo(0.4, 1.8, -1.6, 0);
        ctx.closePath();
      }, caracola, caracolaOsc, 0.3, 0.3, 1.4);
      ctx.strokeStyle = caracolaOsc; ctx.lineWidth = 0.26;
      ctx.beginPath();
      ctx.moveTo(-0.6, -0.6); ctx.quadraticCurveTo(1.2, 0.2, 2.6, -0.4);
      ctx.stroke();
      ctx.restore();
    }

    /* Q: la ola */
    if (q >= 0) {
      ctx.save();
      for (k = 0; k < 3; k++) {
        var u = (q * 1.5 + k / 3) % 1;
        ctx.globalAlpha = (1 - u) * sopla;
        ctx.fillStyle = mix('#3ec8ff', '#ffffff', u * 0.5, 0.75);
        ctx.beginPath();
        ctx.moveTo(8 + u * 6, -4);
        ctx.quadraticCurveTo(10 + u * 8, 0.5 + u * 2, 8.5 + u * 7, 5 + u * 2);
        ctx.quadraticCurveTo(12 + u * 9, 0.5, 8 + u * 6, -4);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.restore();
  };

  /* ---------------- LA PARCA (temporada) ---------------- */
  /* La capucha con nada dentro salvo dos luces, y la guadaña asomando por
   * detrás. La boca es el hueco de la capucha. Q: el GUADAÑAZO, un arco
   * blanco que cruza el pasillo. Solo en Halloween. */
  DRAW.parca = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 0.8), k;
    var ang = [0, 15, 28][fz] * Math.PI / 180;
    var tela = hex(mix('#20222c', o.c, 0.13)), telaOsc = mix(tela, '#030408', 0.6);
    var luz = hex(mix(o.c, '#8fff6a', 0.45));
    var corte = (q >= 0) ? Math.min(1, q * 1.7) : -1;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 2.6) * 0.45);

    /* la guadaña, por detrás */
    ctx.save();
    ctx.rotate(corte >= 0 ? -0.9 + corte * 1.8 : Math.sin(t * 2) * 0.05);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3.6, -5.0); ctx.lineTo(-2.2, 6.6); ctx.stroke();
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-2.3, 6.4);
      ctx.quadraticCurveTo(3.4, 8.2, 6.4, 5.0);
      ctx.quadraticCurveTo(3.0, 6.6, -2.0, 5.2);
      ctx.closePath();
    }, '#d8dbe4', '#7d8494', 0.25, 0.25, 1.4);
    ctx.restore();

    /* el hueco negro de dentro de la capucha */
    ctx.fillStyle = '#04040a';
    ctx.beginPath(); ctx.moveTo(-0.6, -0.8); ctx.lineTo(5.4, -0.4); ctx.lineTo(5.4, -3.6); ctx.lineTo(-0.6, -2.0); ctx.closePath(); ctx.fill();

    var capucha = new Path2D();
    capucha.moveTo(5.4, 0.6);
    capucha.quadraticCurveTo(5.8, 3.4, 3.4, 5.2);
    capucha.quadraticCurveTo(0.2, 7.0, -3.0, 5.4);
    capucha.quadraticCurveTo(-5.8, 3.8, -5.4, 0.4);
    capucha.quadraticCurveTo(-5.0, -2.4, -2.0, -2.6);
    capucha.lineTo(-0.8, -1.0);
    capucha.lineTo(5.4, 0.6);
    capucha.closePath();
    var mand = new Path2D();
    mand.moveTo(-1.0, -1.1); mand.lineTo(5.4, -0.2);
    mand.quadraticCurveTo(5.4, -3.4, 2.6, -4.2);
    mand.quadraticCurveTo(-0.8, -4.8, -3.0, -3.2);
    mand.closePath();
    rostro(ctx, capucha, mand, -1.0, -1.1, ang, tela, hex(telaOsc), 0.8, 0.8);

    /* el interior, un vacío con dos luces */
    ctx.save(); ctx.clip(capucha);
    ctx.fillStyle = '#04040a';
    ctx.beginPath();
    ctx.ellipse(2.2, 1.6, 3.4, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    var parp = 0.55 + 0.45 * Math.abs(Math.sin(t * 1.8));
    [[1.4, 2.0], [3.6, 1.6]].forEach(function (e) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(e[0], e[1], 0.1, e[0], e[1], 2.2);
      g.addColorStop(0, mix(luz, '#ffffff', 0.5, parp));
      g.addColorStop(1, mix(luz, '#ffffff', 0.5, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(e[0], e[1], 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = mix(luz, '#ffffff', 0.7, parp);
      ctx.beginPath(); ctx.ellipse(e[0], e[1], 0.55, 0.42, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    /* el borde de la capucha, bien marcado */
    ctx.strokeStyle = hex(telaOsc); ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(5.2, 0.8);
    ctx.quadraticCurveTo(4.4, 4.4, 1.0, 5.6);
    ctx.stroke();

    /* Q: el guadañazo */
    if (q >= 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var alfa = Math.sin(corte * Math.PI);
      ctx.strokeStyle = 'rgba(235,255,240,' + alfa + ')';
      ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(2, 0.5, 9, -1.1 + corte * 1.2, 0.2 + corte * 1.2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(180,255,200,' + (alfa * 0.5) + ')';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(2, 0.5, 9, -1.1 + corte * 1.2, 0.2 + corte * 1.2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };

  /* ---------------- JINETE SIN CABEZA (temporada) ---------------- */
  /* Del cuello para arriba no hay nada: solo el cuello de la capa y, encima,
   * la CALABAZA encendida que lleva por cabeza. La boca es la de la calabaza.
   * Q: la lanza por delante. Solo en Halloween. */
  DRAW.jinete = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0), k;
    var ang = [0, 18, 34][fz] * Math.PI / 180;
    var capa = hex(mix('#2a1630', o.c, 0.14)), capaOsc = mix(capa, '#08040c', 0.55);
    var naranja = '#ff8c1a', naranjaOsc = '#a84a02', llama = '#ffd24a';
    var lanza = (q >= 0) ? Math.min(1, q * 1.4) : -1;
    var flota = Math.sin(t * 2.8) * 0.5;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);

    /* el cuello de la capa, abajo: vacío */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-5.0, -3.0);
      ctx.quadraticCurveTo(-4.4, -0.6, -1.0, -0.2);
      ctx.quadraticCurveTo(2.6, 0.2, 4.4, -1.4);
      ctx.quadraticCurveTo(5.2, -3.4, 4.0, -5.4);
      ctx.quadraticCurveTo(-0.4, -6.6, -5.0, -3.0);
      ctx.closePath();
    }, capa, hex(capaOsc), 0.6, 0.6, 1.7);
    ctx.fillStyle = '#04030a';
    ctx.beginPath();
    ctx.ellipse(-0.4, -1.6, 3.2, 1.1, -0.1, 0, Math.PI * 2);
    ctx.fill();

    /* la calabaza, flotando encima */
    ctx.save();
    ctx.translate(lanza >= 0 ? lanza * 13 : 0, 4.4 + flota - (lanza >= 0 ? lanza * 1.5 : 0));
    ctx.rotate(lanza >= 0 ? lanza * 5 : Math.sin(t * 2) * 0.05);

    ctx.fillStyle = '#4a1a02';
    ctx.beginPath(); ctx.moveTo(-1.6, -0.9); ctx.lineTo(3.6, -0.6); ctx.lineTo(3.6, -3.0); ctx.lineTo(-1.6, -1.8); ctx.closePath(); ctx.fill();

    var cal = new Path2D();
    cal.moveTo(3.8, -0.4);
    cal.quadraticCurveTo(4.6, 1.6, 3.2, 3.0);
    cal.quadraticCurveTo(1.0, 4.4, -1.2, 3.2);
    cal.quadraticCurveTo(-2.8, 1.8, -2.2, -0.4);
    cal.lineTo(3.8, -0.4);
    cal.closePath();
    var mandC = new Path2D();
    mandC.moveTo(-2.2, -0.7);
    mandC.lineTo(3.8, -0.7);
    mandC.quadraticCurveTo(4.4, -2.6, 2.8, -3.6);
    mandC.quadraticCurveTo(0.6, -4.4, -1.4, -3.2);
    mandC.quadraticCurveTo(-2.6, -2.2, -2.2, -0.7);
    mandC.closePath();
    rostro(ctx, cal, mandC, -2.2, -0.6, ang, naranja, naranjaOsc, 0.5, 0.5);

    /* los gajos */
    ctx.save(); ctx.clip(cal);
    ctx.strokeStyle = naranjaOsc; ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(0.4, 3.9); ctx.quadraticCurveTo(-0.2, 1.6, 0.4, -0.5);
    ctx.moveTo(2.4, 3.5); ctx.quadraticCurveTo(2.0, 1.6, 2.4, -0.5);
    ctx.stroke();
    ctx.restore();

    /* el rabito */
    ctx.strokeStyle = '#4a6b22'; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.8, 3.6); ctx.quadraticCurveTo(0.4, 5.0, 1.4, 5.4);
    ctx.stroke();

    /* los ojos tallados, con la vela dentro */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var vela = 0.65 + 0.35 * Math.abs(Math.sin(t * 6));
    [[0.2, 1.8], [2.6, 1.5]].forEach(function (e) {
      var g = ctx.createRadialGradient(e[0], e[1], 0.1, e[0], e[1], 2);
      g.addColorStop(0, mix(llama, '#ffffff', 0.4, vela));
      g.addColorStop(1, mix(llama, '#ffffff', 0.4, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(e[0], e[1], 2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    ctx.fillStyle = TINTA;
    [[0.2, 1.8, 1], [2.6, 1.5, -1]].forEach(function (e) {
      ctx.beginPath();
      ctx.moveTo(e[0] - 0.85 * e[2], e[1] + 0.6);
      ctx.lineTo(e[0] + 0.85 * e[2], e[1] + 0.75);
      ctx.lineTo(e[0] + 0.1 * e[2], e[1] - 0.75);
      ctx.closePath(); ctx.fill();
    });
    /* la boca dentada, en la mandíbula */
    ctx.save(); girarSobre(ctx, -2.2, -0.6, -ang);
    dientes(ctx, -1.2, 3.2, -1.1, 3, 1.0, llama);
    ctx.restore();
    ctx.restore();

    /* Q: la estela de la calabaza lanzada */
    if (q >= 0) {
      for (k = 0; k < 6; k++) {
        var u = Math.max(0, lanza - k * 0.08);
        if (u <= 0) continue;
        ctx.fillStyle = mix(llama, '#ff3b0a', k / 6, (1 - k / 6) * 0.55);
        ctx.beginPath();
        ctx.arc(u * 13 - k * 1.2, 4.4 - u * 1.5, 1.4 - k * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };
