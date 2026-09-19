  /* =====================================================================
   * TANDA ANDINA (19 sep). Ocho skins que siguen el grupo que empezaron el
   * CUY, la LLAMA y el CÓNDOR: bichos y cosas de por aquí. Dejan la silueta
   * de Pac-Man, cada una come a su manera, tiene su Q y su muerte.
   * ===================================================================== */

  /* ---------------- GALLITO DE LAS ROCAS ---------------- */
  /* El ave nacional: naranja encendido, con esa CRESTA en forma de disco que
   * le tapa media cara y el pico asomando por debajo. Q: el baile de cortejo,
   * dando saltitos y chillando. */
  DRAW.gallito = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.2), k;
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var naranja = hex(mix(o.c, '#ff5a1a', 0.68)), naranjaOsc = mix(naranja, '#5a1400', 0.45);
    var ala = '#1a1a22', pico = '#f2d98a';
    var baila = (q >= 0) ? Math.abs(Math.sin(q * Math.PI * 4)) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 6)) * 0.3 - 0.15 + baila * 1.1);
    ctx.rotate(baila * 0.12 * Math.sin(t * 20));

    /* el ala y la cola, oscuras */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-1.0, 1.4);
      ctx.quadraticCurveTo(-5.2, 2.6, -7.2, 0.2);
      ctx.quadraticCurveTo(-5.0, -2.2, -1.2, -1.6);
      ctx.closePath();
    }, ala, '#08080c', 0.35, 0.35, 1.4);
    ctx.strokeStyle = '#3a3a48'; ctx.lineWidth = 0.28; ctx.lineCap = 'round';
    ctx.beginPath();
    for (k = 0; k < 3; k++) {
      ctx.moveTo(-2.0, 0.6 - k * 0.8);
      ctx.quadraticCurveTo(-4.6, 0.2 - k * 0.7, -6.6, -0.4 - k * 0.4);
    }
    ctx.stroke();

    ctx.fillStyle = '#4a1000';
    ctx.beginPath(); ctx.moveTo(1.6, -0.7); ctx.lineTo(6.6, -0.4); ctx.lineTo(6.6, -2.8); ctx.lineTo(1.6, -1.5); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(6.6, 0.6);
    cabeza.quadraticCurveTo(6.4, 1.8, 4.6, 2.0);
    cabeza.quadraticCurveTo(2.0, 2.4, 0.4, 3.4);
    cabeza.quadraticCurveTo(-2.0, 4.6, -4.0, 3.0);
    cabeza.quadraticCurveTo(-5.4, 1.4, -4.6, -0.8);
    cabeza.quadraticCurveTo(-3.0, -2.0, -0.6, -1.6);
    cabeza.lineTo(1.4, -0.9);
    cabeza.lineTo(6.6, 0.6);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(1.2, -1.0); mand.lineTo(6.6, -0.2);
    mand.quadraticCurveTo(5.6, -2.0, 3.4, -2.4);
    mand.quadraticCurveTo(0.6, -2.6, -0.8, -1.8);
    mand.closePath();
    rostro(ctx, cabeza, mand, 1.2, -1.0, ang, naranja, hex(naranjaOsc), 0.6, 0.6);

    /* el pico, pequeñito y claro */
    ctx.save(); ctx.clip(cabeza);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(4.6, 1.4);
      ctx.quadraticCurveTo(7.0, 1.2, 7.0, 0.4);
      ctx.lineTo(4.6, -0.5);
      ctx.closePath();
    }, pico, '#a89055', 0.2, 0.2, 1.2);
    ctx.restore();

    /* LA CRESTA: un disco que le sale de la frente y le tapa media cara */
    var w = Math.sin(t * 4) * 0.12 + baila * 0.3;
    ctx.save();
    girarSobre(ctx, 1.0, 1.6, w);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(5.6, 1.2);
      ctx.quadraticCurveTo(6.4, 4.8, 3.2, 6.4);
      ctx.quadraticCurveTo(-0.2, 7.8, -2.6, 5.6);
      ctx.quadraticCurveTo(-4.0, 4.0, -3.0, 2.2);
      ctx.quadraticCurveTo(0.6, 3.6, 5.6, 1.2);
      ctx.closePath();
    }, naranja, hex(naranjaOsc), 0.7, 0.7, 1.8);
    /* el surco del disco */
    ctx.strokeStyle = hex(naranjaOsc); ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(4.4, 2.0); ctx.quadraticCurveTo(1.2, 5.0, -2.0, 5.0);
    ctx.stroke();
    ctx.restore();

    /* el ojo, amarillo, asomando bajo la cresta */
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath(); ctx.arc(3.4, 1.1, 0.7, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(3.55, 1.05, 0.34, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.7, 1.35, 0.2, 0.9);

    /* Q: el baile, con su chillido */
    if (q >= 0) {
      ctx.lineWidth = 0.6; ctx.lineCap = 'round';
      for (k = 0; k < 3; k++) {
        var u = (q * 2.2 + k / 3) % 1;
        ctx.strokeStyle = 'rgba(255,230,160,' + ((1 - u) * 0.9) + ')';
        ctx.beginPath(); ctx.arc(7.2, 0.4, 1.4 + u * 6, -0.8, 0.8); ctx.stroke();
      }
      for (k = 0; k < 5; k++) {
        var d = (q * 1.4 + k / 5) % 1;
        ctx.fillStyle = 'rgba(200,180,150,' + ((1 - d) * 0.5) + ')';
        ctx.beginPath();
        ctx.arc((k - 2) * 2.4, -6.2 - d * 2, 0.7 + d * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ---------------- PUMA DE PIEDRA ---------------- */
  /* Tallado, como los de Chavín: la cara de felino hecha en bloque de piedra,
   * con los colmillos grandes y las espirales grabadas. Q: el RUGIDO, que
   * saca ondas talladas. */
  DRAW.puma = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 0.9), k;
    var ang = [0, 17, 32][fz] * Math.PI / 180;
    var roca = hex(mix('#8a8172', o.c, 0.18)), rocaOsc = mix(roca, '#231f18', 0.5);
    var grabado = hex(mix(o.c, '#c8a24a', 0.55));
    var ruge = (q >= 0) ? Math.sin(Math.min(1, q * 2.2) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(ruge * 0.5, Math.abs(Math.sin(t * 5)) * 0.2 - 0.1);

    /* las orejas, dos bloques */
    [[-2.6, 4.6], [1.0, 5.2]].forEach(function (or) {
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(or[0] - 1.2, or[1] - 1.0);
        ctx.lineTo(or[0] - 0.4, or[1] + 1.4);
        ctx.lineTo(or[0] + 1.3, or[1] + 0.2);
        ctx.lineTo(or[0] + 0.9, or[1] - 1.4);
        ctx.closePath();
      }, roca, hex(rocaOsc), 0.3, 0.3, 1.5);
    });

    ctx.fillStyle = '#100d08';
    ctx.beginPath(); ctx.moveTo(-1.6, -0.8); ctx.lineTo(6.2, -0.5); ctx.lineTo(6.2, -4.2); ctx.lineTo(-1.6, -2.4); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(6.2, 0.2);
    cabeza.lineTo(6.4, 2.4);
    cabeza.lineTo(4.4, 4.6);
    cabeza.lineTo(0.6, 5.4);
    cabeza.lineTo(-3.4, 4.6);
    cabeza.lineTo(-5.0, 2.0);
    cabeza.lineTo(-4.6, -0.6);
    cabeza.lineTo(-2.0, -1.2);
    cabeza.lineTo(6.2, 0.2);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(-2.2, -1.3);
    mand.lineTo(6.2, -0.2);
    mand.lineTo(5.8, -3.6);
    mand.lineTo(2.0, -5.0);
    mand.lineTo(-1.8, -4.4);
    mand.lineTo(-3.0, -2.6);
    mand.closePath();
    rostro(ctx, cabeza, mand, -2.2, -1.2, ang, roca, hex(rocaOsc), 0.8, 0.8);

    /* los grabados: espirales y líneas, como en la piedra */
    ctx.save(); ctx.clip(cabeza);
    ctx.strokeStyle = grabado; ctx.lineWidth = 0.4; ctx.lineCap = 'round';
    ctx.beginPath();
    for (k = 0; k < 10; k++) {
      var a2 = k * 0.62, r2 = 0.3 + k * 0.16;
      var px = -2.4 + Math.cos(a2) * r2, py = 2.6 + Math.sin(a2) * r2;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.6, 4.8); ctx.lineTo(0.6, 3.0); ctx.lineTo(2.4, 3.0);
    ctx.moveTo(4.6, 3.4); ctx.lineTo(3.2, 2.0);
    ctx.stroke();
    ctx.restore();

    /* los ojos, cuadrados y hundidos */
    [[1.6, 2.0], [4.2, 1.6]].forEach(function (e) {
      ctx.fillStyle = TINTA;
      roundRect(ctx, e[0] - 0.95, e[1] - 0.75, 1.9, 1.5, 0.25); ctx.fill();
      ctx.fillStyle = grabado;
      roundRect(ctx, e[0] - 0.42, e[1] - 0.4, 0.9, 0.8, 0.2); ctx.fill();
    });

    /* los colmillos, arriba y abajo: es lo que hace al felino */
    dientes(ctx, 1.0, 5.4, -0.4, 2, -1.7, '#e8e0cc');
    ctx.save(); girarSobre(ctx, -2.2, -1.2, -ang);
    dientes(ctx, 1.2, 5.2, -1.3, 2, 1.6, '#e8e0cc');
    ctx.restore();

    /* Q: el rugido, ondas talladas */
    if (q >= 0) {
      ctx.lineCap = 'round';
      for (k = 0; k < 3; k++) {
        var u = (q * 2 + k / 3) % 1;
        ctx.strokeStyle = mix(grabado, '#ffffff', 0.35, (1 - u) * ruge);
        ctx.lineWidth = 1.0 * (1 - u * 0.4);
        ctx.beginPath();
        ctx.arc(6.8, 0.6, 1.8 + u * 8, -0.9, 0.9);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  /* ---------------- TUMI ---------------- */
  /* El cuchillo ceremonial de oro: arriba la figura del Naylamp con su tocado
   * de rayos y sus turquesas, abajo la media luna del filo, que es la boca.
   * Q: el DESTELLO del oro, que ciega. */
  DRAW.tumi = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 0.8), k;
    var ang = [0, 12, 22][fz] * Math.PI / 180;
    var oro = hex(mix('#ffcf3a', o.c, 0.18)), oroOsc = mix(oro, '#7a4e02', 0.45);
    var turquesa = '#3ec8b8';
    var brilla = (q >= 0) ? Math.sin(Math.min(1, q * 2.4) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 5) * 0.16);

    ctx.fillStyle = '#3a2400';
    ctx.beginPath(); ctx.moveTo(-3.6, -0.8); ctx.lineTo(4.4, -0.5); ctx.lineTo(4.4, -4.0); ctx.lineTo(-3.6, -2.4); ctx.closePath(); ctx.fill();

    /* el cuerpo del tumi: la figurita */
    var cuerpo = new Path2D();
    cuerpo.moveTo(4.4, -0.6);
    cuerpo.lineTo(4.0, 1.6);
    cuerpo.quadraticCurveTo(3.6, 3.4, 1.6, 3.8);
    cuerpo.lineTo(-1.4, 3.9);
    cuerpo.quadraticCurveTo(-3.4, 3.6, -3.8, 1.8);
    cuerpo.lineTo(-4.2, -0.8);
    cuerpo.lineTo(4.4, -0.6);
    cuerpo.closePath();
    /* el filo, media luna */
    var filo = new Path2D();
    filo.moveTo(-4.4, -1.0);
    filo.lineTo(4.4, -0.8);
    filo.quadraticCurveTo(4.8, -4.4, 0.2, -5.6);
    filo.quadraticCurveTo(-4.6, -4.6, -4.4, -1.0);
    filo.closePath();
    rostro(ctx, cuerpo, filo, -4.4, -0.9, ang, oro, hex(oroOsc), 0.6, 0.6);

    /* el tocado: un abanico de rayos que sale de la coronilla */
    for (k = 0; k < 9; k++) {
      var a2 = -1.05 + k * 0.2625;          // de -60º a +60º, repartidos
      var lar = (k % 2 ? 3.4 : 2.4) + brilla * 1.0;
      ctx.save();
      ctx.translate(0.2, 3.5);
      ctx.rotate(a2);
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(-0.55, 0.2);
        ctx.lineTo(0, lar);
        ctx.lineTo(0.55, 0.2);
        ctx.closePath();
      }, oro, hex(oroOsc), 0.15, 0.15, 1.2);
      ctx.restore();
    }

    /* la cara del Naylamp */
    ctx.save(); ctx.clip(cuerpo);
    ctx.fillStyle = hex(oroOsc);
    roundRect(ctx, -2.6, 0.2, 5.4, 3.2, 0.6); ctx.fill();
    ctx.fillStyle = oro;
    roundRect(ctx, -2.3, 0.4, 4.8, 2.8, 0.5); ctx.fill();
    /* los ojos alados, la marca del Naylamp */
    ctx.fillStyle = TINTA;
    [[-1.0, 2.2], [1.4, 2.2]].forEach(function (e) {
      ctx.beginPath();
      ctx.moveTo(e[0] - 0.85, e[1]);
      ctx.quadraticCurveTo(e[0], e[1] + 0.75, e[0] + 0.85, e[1]);
      ctx.quadraticCurveTo(e[0], e[1] - 0.5, e[0] - 0.85, e[1]);
      ctx.closePath(); ctx.fill();
    });
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.28;
    ctx.beginPath();
    ctx.moveTo(-0.8, 1.0); ctx.lineTo(1.2, 1.0);
    ctx.stroke();
    /* las turquesas */
    [[-2.9, 1.4], [3.0, 1.4]].forEach(function (p) {
      ctx.fillStyle = turquesa;
      ctx.beginPath(); ctx.arc(p[0], p[1], 0.62, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
    });
    ctx.restore();

    /* el filo, con su brillo */
    ctx.save(); girarSobre(ctx, -4.4, -0.9, -ang); ctx.clip(filo);
    ctx.strokeStyle = mix('#ffffff', oro, 0.4, 0.6);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-3.8, -2.0); ctx.quadraticCurveTo(0.2, -4.4, 3.8, -2.0);
    ctx.stroke();
    ctx.restore();

    /* Q: el destello */
    if (q >= 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(0, 1.5, 0.5, 0, 1.5, 6 + brilla * 12);
      g.addColorStop(0, 'rgba(255,248,200,' + brilla + ')');
      g.addColorStop(0.45, 'rgba(255,207,58,' + (brilla * 0.55) + ')');
      g.addColorStop(1, 'rgba(255,180,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 1.5, 6 + brilla * 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,250,220,' + brilla + ')'; ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (k = 0; k < 8; k++) {
        var ar = k * Math.PI / 4 + 0.2, lr = 5 + brilla * 9;
        ctx.moveTo(Math.cos(ar) * 3, 1.5 + Math.sin(ar) * 3);
        ctx.lineTo(Math.cos(ar) * lr, 1.5 + Math.sin(ar) * lr);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };

  /* ---------------- INTI ---------------- */
  /* El sol, con cara: disco de oro con los rayos alrededor —rectos y
   * ondulados, alternando— y la cara grabada dentro. Q: el MEDIODÍA, todo se
   * pone blanco un instante. */
  DRAW.inti = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0), k;
    var media = HALF[fz], angD = DIR_ANGLE[o.d];
    var oro = hex(mix('#ffcf3a', o.c, 0.24)), oroOsc = mix(oro, '#8a5200', 0.4);
    var arde = (q >= 0) ? Math.sin(Math.min(1, q * 1.8) * Math.PI) : 0;
    ctx.save();
    ctx.translate(o.x, o.y);

    /* los rayos, girando despacio */
    ctx.save();
    ctx.rotate(t * 0.25);
    for (k = 0; k < 16; k++) {
      var a2 = k * Math.PI / 8;
      var lar = (k % 2 ? 2.4 : 3.6) + arde * 1.8 + Math.sin(t * 3 + k) * 0.2;
      ctx.save();
      ctx.rotate(a2);
      if (k % 2) {
        /* rayo recto */
        piezaX(ctx, function () {
          ctx.beginPath();
          ctx.moveTo(R - 0.5, -0.9);
          ctx.lineTo(R + lar, 0);
          ctx.lineTo(R - 0.5, 0.9);
          ctx.closePath();
        }, oro, hex(oroOsc), 0.15, 0.15, 1.2);
      } else {
        /* rayo ondulado */
        ctx.strokeStyle = oro; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(R - 0.4, 0);
        ctx.quadraticCurveTo(R + lar * 0.35, -1.1, R + lar * 0.65, 0);
        ctx.quadraticCurveTo(R + lar * 0.9, 1.1, R + lar, 0);
        ctx.stroke();
        ctx.strokeStyle = hex(oroOsc); ctx.lineWidth = 0.3; ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    /* el disco, con el bocado de siempre */
    function bocado() {
      ctx.beginPath();
      if (media <= 0) ctx.arc(0, 0, R, 0, Math.PI * 2);
      else {
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, angD + media, angD - media + Math.PI * 2);
        ctx.closePath();
      }
    }
    ctx.save();
    bocado(); ctx.clip();
    ctx.fillStyle = hex(oroOsc);
    ctx.fillRect(-R - 1, -R - 1, (R + 1) * 2, (R + 1) * 2);
    ctx.fillStyle = oro;
    ctx.beginPath(); ctx.arc(-0.6, 0.6, R, 0, Math.PI * 2); ctx.fill();
    /* la cara grabada */
    ctx.save();
    frame(ctx, 0, 0, o.d);
    ctx.strokeStyle = hex(oroOsc); ctx.lineWidth = 0.55; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-1.6, 1.6, 1.0, 0, Math.PI * 2);
    ctx.arc(1.8, 1.6, 1.0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = hex(oroOsc);
    ctx.beginPath(); ctx.arc(-1.6, 1.6, 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1.8, 1.6, 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(0.1, 1.0); ctx.lineTo(0.1, -0.8);
    ctx.moveTo(-1.8, -2.2); ctx.quadraticCurveTo(0.2, -3.4, 2.2, -2.2);
    ctx.stroke();
    ctx.restore();
    /* el mediodía: se pone blanco */
    if (arde > 0) {
      ctx.fillStyle = 'rgba(255,255,240,' + (arde * 0.75) + ')';
      ctx.fillRect(-R - 1, -R - 1, (R + 1) * 2, (R + 1) * 2);
    }
    ctx.restore();

    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5 / S; ctx.lineJoin = 'round';
    bocado(); ctx.stroke();

    /* el halo */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R + 7 + arde * 8);
    g.addColorStop(0, mix(oro, '#ffffff', 0.4, 0.3 + arde * 0.5));
    g.addColorStop(1, mix(oro, '#ffffff', 0.4, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R + 7 + arde * 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  };

  /* ---------------- PAPA ---------------- */
  /* La papa andina, con sus bultos, su piel terrosa y los OJOS de la papa
   * —los brotes— saliéndole por arriba. Q: le revientan los brotes y echa
   * hojitas. */
  DRAW.papa = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.1), k;
    var ang = [0, 16, 30][fz] * Math.PI / 180;
    var piel = hex(mix('#b08050', o.c, 0.2)), pielOsc = mix(piel, '#3a2410', 0.5);
    var carne = '#f2e4c2', brote = '#7aa83a';
    var crece = (q >= 0) ? Math.min(1, q * 1.5) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 6)) * 0.28 - 0.14);

    ctx.fillStyle = '#2a1608';
    ctx.beginPath(); ctx.moveTo(-3.0, -0.8); ctx.lineTo(5.6, -0.5); ctx.lineTo(5.6, -4.0); ctx.lineTo(-3.0, -2.4); ctx.closePath(); ctx.fill();

    /* la papa: una forma con bultos, nada redonda */
    var cuerpo = new Path2D();
    cuerpo.moveTo(5.8, -0.4);
    cuerpo.quadraticCurveTo(6.6, 2.0, 4.6, 3.6);
    cuerpo.quadraticCurveTo(3.2, 4.8, 1.0, 4.6);
    cuerpo.quadraticCurveTo(-1.6, 5.4, -3.6, 3.8);
    cuerpo.quadraticCurveTo(-5.6, 2.2, -5.0, -0.2);
    cuerpo.lineTo(-4.4, -0.9);
    cuerpo.lineTo(5.8, -0.4);
    cuerpo.closePath();
    var mand = new Path2D();
    mand.moveTo(-4.6, -1.1);
    mand.lineTo(5.8, -0.6);
    mand.quadraticCurveTo(6.2, -3.4, 4.0, -4.8);
    mand.quadraticCurveTo(1.0, -5.8, -2.0, -5.0);
    mand.quadraticCurveTo(-4.8, -4.0, -4.6, -1.1);
    mand.closePath();
    rostro(ctx, cuerpo, mand, -4.6, -1.0, ang, piel, hex(pielOsc), 0.7, 0.7);

    /* la carne blanca, dentro de la boca */
    ctx.save(); girarSobre(ctx, -4.6, -1.0, -ang); ctx.clip(mand);
    ctx.fillStyle = carne;
    ctx.beginPath(); ctx.ellipse(0.6, -2.6, 4.2, 1.8, 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* los hoyitos de la papa */
    ctx.save(); ctx.clip(cuerpo);
    ctx.fillStyle = hex(pielOsc);
    [[-2.6, 2.6], [1.2, 3.4], [3.8, 1.4], [-0.6, 0.8], [-3.6, 0.6]].forEach(function (p, k2) {
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], 0.5 + (k2 % 2) * 0.15, 0.34, 0.4 * k2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    /* los BROTES, que salen de los hoyitos de arriba */
    [[-2.6, 3.2, 1], [1.2, 4.2, -1], [3.6, 2.6, 1]].forEach(function (b, k2) {
      var h = (1.2 + k2 * 0.3) * (1 + crece * 1.8);
      var w = Math.sin(t * 4 + k2) * 0.25;
      ctx.strokeStyle = brote; ctx.lineWidth = 0.42; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b[0], b[1]);
      ctx.quadraticCurveTo(b[0] + b[2] * 0.6 + w, b[1] + h * 0.6, b[0] + b[2] * 1.2 + w, b[1] + h);
      ctx.stroke();
      /* la hojita */
      ctx.fillStyle = brote;
      ctx.save();
      ctx.translate(b[0] + b[2] * 1.2 + w, b[1] + h);
      ctx.rotate(b[2] * 0.6);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.85 * (0.6 + crece * 0.6), 0.42, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
      ctx.restore();
    });

    /* los ojos de la cara */
    [[1.0, 2.0], [3.6, 1.2]].forEach(function (e) {
      ctx.fillStyle = '#fdfaf0';
      ctx.beginPath(); ctx.ellipse(e[0], e[1], 0.85, 0.75, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.arc(e[0] + 0.25, e[1] - 0.05, 0.38, 0, Math.PI * 2); ctx.fill();
    });
    destello(ctx, 1.5, 2.4, 0.22, 0.85);

    /* Q: le revientan los brotes */
    if (q >= 0) {
      for (k = 0; k < 8; k++) {
        var u = (crece + k / 8) % 1;
        ctx.save();
        ctx.globalAlpha = (1 - u) * 0.9;
        ctx.translate(Math.sin(k * 2.1) * 6 * u, 4 + u * 7);
        ctx.rotate(u * 4 + k);
        ctx.fillStyle = brote;
        ctx.beginPath(); ctx.ellipse(0, 0, 0.9, 0.4, 0, 0, Math.PI * 2); ctx.fill();
        contorno(ctx, 0.9); ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };
