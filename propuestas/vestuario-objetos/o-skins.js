  /* =====================================================================
   * TANDA DE OBJETOS (19 sep). Ocho skins que no son bichos: son COSAS, en la
   * línea de RECREATIVA. Cada una deja la silueta de Pac-Man, convierte el
   * comer en el gesto propio del objeto —la ranura, la puerta, el obturador,
   * la esfera— y tiene su Q y su muerte.
   *
   * Mismo marco que siempre: f hacia donde avanza, s hacia la coronilla.
   * La Q se enseña sola cada 3,4 s con qFase(); en el juego sale con la tecla.
   * ===================================================================== */
  var DRAW = {};

  /* ---------------- MÁQUINA DE DISCOS ---------------- */
  /* Wurlitzer de toda la vida: arco de neón del color del jugador, ventana
   * con el disco girando, rejilla de altavoz y la RANURA DE LOS DISCOS por
   * boca, abajo del todo. Q: sube el volumen y las ondas empujan. */
  DRAW.discos = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.1), k;
    var ang = [0, 13, 24][fz] * Math.PI / 180;
    var mueble = hex(mix('#3a2418', o.c, 0.12)), muebleOsc = mix(mueble, '#0c0602', 0.5);
    var neon = o.c, cromo = '#d8dbe4', cromoOsc = '#7d8494';
    var subiendo = (q >= 0) ? Math.sin(Math.min(1, q * 1.6) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 6) * 0.12 + subiendo * 0.35);

    /* el hueco oscuro que se ve al abrir la ranura */
    ctx.fillStyle = '#07060a';
    ctx.beginPath(); ctx.moveTo(-4.2, -0.8); ctx.lineTo(4.6, -0.5); ctx.lineTo(4.6, -4.4); ctx.lineTo(-4.2, -2.6); ctx.closePath(); ctx.fill();

    /* el mueble: cuerpo recto y remate en arco, como el de verdad */
    var cuerpo = new Path2D();
    cuerpo.moveTo(4.5, -0.6);
    cuerpo.lineTo(4.6, 2.6);
    cuerpo.quadraticCurveTo(4.5, 5.6, 1.4, 6.2);
    cuerpo.quadraticCurveTo(-2.0, 6.5, -3.8, 4.6);
    cuerpo.quadraticCurveTo(-5.0, 3.0, -4.9, 0.6);
    cuerpo.lineTo(-4.6, -0.9);
    cuerpo.lineTo(4.5, -0.6);
    cuerpo.closePath();
    var mand = new Path2D();
    mand.moveTo(-4.6, -1.1);
    mand.lineTo(4.5, -0.8);
    mand.quadraticCurveTo(4.6, -4.6, 2.6, -5.4);
    mand.lineTo(-3.4, -5.6);
    mand.quadraticCurveTo(-4.8, -5.2, -4.6, -1.1);
    mand.closePath();
    rostro(ctx, cuerpo, mand, -4.6, -1.0, ang, mueble, muebleOsc, 0.8, 0.8);

    ctx.save(); ctx.clip(cuerpo);
    /* el arco de neón, dos tubos que siguen el remate */
    for (k = 0; k < 2; k++) {
      ctx.strokeStyle = (k ? hex(mix(neon, '#ffffff', 0.55)) : neon);
      ctx.lineWidth = k ? 0.28 : 0.72;
      ctx.globalAlpha = k ? 0.95 : (0.55 + 0.45 * Math.abs(Math.sin(t * 2 + k)) + subiendo * 0.4);
      ctx.beginPath();
      ctx.moveTo(4.1, 2.8);
      ctx.quadraticCurveTo(3.9, 5.1, 1.3, 5.6);
      ctx.quadraticCurveTo(-1.7, 5.9, -3.3, 4.2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* la ventana: el disco dando vueltas */
    ctx.fillStyle = '#0a0a12';
    roundRect(ctx, -3.7, 0.3, 7.9, 3.6, 0.9); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    var gira = t * (2.2 + subiendo * 5);
    ctx.save();
    ctx.translate(0.2, 2.1); ctx.rotate(gira);
    ctx.fillStyle = '#16161f';
    ctx.beginPath(); ctx.arc(0, 0, 1.62, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 0.14;
    for (k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(0, 0, 0.62 + k * 0.3, 0, Math.PI * 2); ctx.stroke(); }
    /* la etiqueta, para que se vea girar */
    ctx.fillStyle = hex(mix(neon, '#ffffff', 0.25));
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 0.62, -0.5, 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = neon;
    ctx.beginPath(); ctx.arc(0, 0, 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    destello(ctx, -2.3, 3.3, 0.5, 0.5);

    /* rejilla del altavoz, a los lados de la ventana */
    ctx.strokeStyle = cromoOsc; ctx.lineWidth = 0.3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (k = 0; k < 4; k++) { ctx.moveTo(-4.2, -0.1 + k * 0.001); ctx.lineTo(4.2, 0.0); }
    ctx.stroke();
    ctx.restore();

    /* la ranura de los discos, en la mandíbula */
    ctx.save(); girarSobre(ctx, -4.6, -1.0, -ang); ctx.clip(mand);
    ctx.fillStyle = cromo;
    roundRect(ctx, -3.2, -3.4, 6.6, 0.9, 0.4); ctx.fill();
    contorno(ctx, 1.1); ctx.stroke();
    ctx.fillStyle = '#0a0a12';
    roundRect(ctx, -2.6, -3.15, 5.4, 0.42, 0.2); ctx.fill();
    /* botonera de selección */
    for (k = 0; k < 5; k++) {
      ctx.fillStyle = (k % 2) ? '#e03a4a' : cromo;
      ctx.beginPath(); ctx.arc(-2.4 + k * 1.3, -4.7, 0.36, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 0.9); ctx.stroke();
    }
    ctx.restore();

    /* Q: el volumen a tope, ondas que salen de la rejilla */
    if (q >= 0) {
      ctx.lineCap = 'round';
      for (k = 0; k < 3; k++) {
        var u = (q * 1.8 + k / 3) % 1;
        ctx.strokeStyle = mix(neon, '#ffffff', 0.4, (1 - u) * 0.9);
        ctx.lineWidth = 0.9 * (1 - u * 0.4);
        ctx.beginPath(); ctx.arc(4.8, 0.6, 1.4 + u * 7.5, -0.85, 0.85); ctx.stroke();
      }
      for (k = 0; k < 4; k++) {
        var un = (q * 1.3 + k / 4) % 1;
        nota(ctx, 5.4 + un * 5.5, 2.4 + Math.sin(un * 7 + k) * 1.8 + un * 2.2,
          0.9, mix(neon, '#ffffff', 0.5, 1 - un));
      }
    }
    ctx.restore();
  };

  /* ---------------- TELEVISOR ---------------- */
  /* Tele de tubo con antenas de conejo: la PANTALLA es la cara —dos ojos de
   * fósforo y la mitad de abajo que se abre— y por detrás asoma la joroba del
   * tubo. Q: cambia de canal, la imagen salta y revienta en estática. */
  DRAW.tele = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 0.9), k;
    var ang = [0, 12, 22][fz] * Math.PI / 180;
    var caja = hex(mix('#5a4432', o.c, 0.16)), cajaOsc = mix(caja, '#150c05', 0.5);
    var verde = '#7dff9a', cromo = '#c9ccd6';
    var salto = (q >= 0) ? Math.sin(Math.min(1, q * 2.2) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 7) * 0.1);

    /* antenas de conejo */
    ctx.strokeStyle = cromo; ctx.lineWidth = 0.46; ctx.lineCap = 'round';
    [[-0.9, 1.05], [0.6, -0.55]].forEach(function (a, k2) {
      var w = Math.sin(t * 4 + k2) * 0.2;
      ctx.beginPath();
      ctx.moveTo(-0.6, 4.4);
      ctx.lineTo(-0.6 + a[0] * 3.2 + w, 4.4 + Math.abs(a[1]) * 4.6);
      ctx.stroke();
      ctx.fillStyle = '#e8b13a';
      ctx.beginPath(); ctx.arc(-0.6 + a[0] * 3.2 + w, 4.4 + Math.abs(a[1]) * 4.6, 0.36, 0, Math.PI * 2); ctx.fill();
    });

    /* la joroba del tubo, por detrás */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-3.6, 3.2);
      ctx.quadraticCurveTo(-6.6, 2.4, -6.4, -0.4);
      ctx.quadraticCurveTo(-6.2, -2.6, -3.6, -3.0);
      ctx.closePath();
    }, hex(cajaOsc), '#150c05', 0.3, 0.3);

    ctx.fillStyle = '#06070c';
    ctx.beginPath(); ctx.moveTo(-3.4, -0.7); ctx.lineTo(5.0, -0.4); ctx.lineTo(5.0, -4.2); ctx.lineTo(-3.4, -2.2); ctx.closePath(); ctx.fill();

    var caj = new Path2D();
    caj.moveTo(5.0, -0.5);
    caj.lineTo(5.2, 3.4);
    caj.quadraticCurveTo(5.2, 4.6, 3.9, 4.7);
    caj.lineTo(-3.2, 4.9);
    caj.quadraticCurveTo(-4.4, 4.8, -4.4, 3.6);
    caj.lineTo(-4.2, -0.8);
    caj.lineTo(5.0, -0.5);
    caj.closePath();
    var mandT = new Path2D();
    mandT.moveTo(-4.2, -1.0);
    mandT.lineTo(5.0, -0.7);
    mandT.quadraticCurveTo(5.1, -4.4, 3.6, -4.9);
    mandT.lineTo(-3.0, -5.1);
    mandT.quadraticCurveTo(-4.3, -4.8, -4.2, -1.0);
    mandT.closePath();
    rostro(ctx, caj, mandT, -4.2, -0.9, ang, caja, cajaOsc, 0.8, 0.8);

    /* la pantalla: marco de cristal y la cara de fósforo dentro */
    ctx.save(); ctx.clip(caj);
    ctx.fillStyle = '#080a10';
    roundRect(ctx, -3.5, 0.0, 7.2, 4.2, 1.1); ctx.fill();
    contorno(ctx, 1.3); ctx.stroke();
    ctx.save();
    ctx.beginPath(); roundRect(ctx, -3.5, 0.0, 7.2, 4.2, 1.1); ctx.clip();
    ctx.translate(salto * 1.2, -salto * 2.4);
    /* los dos ojos */
    [[-1.4, 2.4], [1.5, 2.4]].forEach(function (e) {
      ctx.fillStyle = verde;
      ctx.beginPath(); ctx.ellipse(e[0], e[1], 0.85, 0.95, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b2a14';
      ctx.beginPath(); ctx.arc(e[0] + 0.28, e[1] - 0.1, 0.42, 0, Math.PI * 2); ctx.fill();
    });
    /* estática al cambiar de canal */
    if (salto > 0.05) {
      for (k = 0; k < 26; k++) {
        var sx = -3.4 + ((k * 37) % 70) / 10, sy = 0.2 + ((k * 53) % 38) / 10;
        ctx.fillStyle = 'rgba(255,255,255,' + (salto * 0.5) + ')';
        ctx.fillRect(sx, sy, 0.7, 0.18);
      }
    }
    ctx.restore();
    /* barrido del tubo */
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fillRect(-3.5, 0.0 + ((t * 2.6) % 4.2), 7.2, 0.4);
    destello(ctx, -2.3, 3.4, 0.55, 0.5);
    /* mandos, en el canto */
    [[4.3, 2.8], [4.3, 1.4]].forEach(function (b) {
      ctx.fillStyle = cromo;
      ctx.beginPath(); ctx.arc(b[0], b[1], 0.42, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
    });
    ctx.restore();

    /* la mitad de abajo de la pantalla, en la mandíbula: la boca */
    ctx.save(); girarSobre(ctx, -4.2, -0.9, -ang); ctx.clip(mandT);
    ctx.fillStyle = '#080a10';
    roundRect(ctx, -3.3, -4.2, 6.8, 3.4, 1.0); ctx.fill();
    ctx.fillStyle = verde;
    ctx.beginPath();
    ctx.moveTo(-2.2, -1.5);
    ctx.quadraticCurveTo(0.2, -3.3, 2.6, -1.5);
    ctx.quadraticCurveTo(0.2, -2.3, -2.2, -1.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    /* Q: el chispazo del cambio de canal */
    if (q >= 0 && salto > 0.1) {
      ctx.strokeStyle = 'rgba(255,255,255,' + salto + ')'; ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (k = 0; k < 4; k++) {
        var a3 = (k - 1.5) * 0.42;
        ctx.moveTo(5.6 + Math.cos(a3) * 0.6, 2.0 + Math.sin(a3) * 1.4);
        ctx.lineTo(5.6 + Math.cos(a3) * (2.4 + salto * 2), 2.0 + Math.sin(a3) * (3.0 + salto * 2));
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  /* ---------------- CABINA TELEFÓNICA ---------------- */
  /* La cabina roja de toda la vida, con el color del jugador en el armazón:
   * cristales con su marco, el aparato colgado dentro, el letrero encendido
   * arriba y la PUERTA por boca. Q: un timbrazo que la hace temblar. */
  DRAW.cabina = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0), k;
    var ang = [0, 16, 30][fz] * Math.PI / 180;
    var hierro = hex(mix(o.c, '#c81f2a', 0.7)), hierroOsc = mix(hierro, '#2c0407', 0.5);
    var vidrio = 'rgba(150,200,225,.30)', cromo = '#cfd3dc';
    var timbre = (q >= 0) ? Math.sin(q * Math.PI * 7) * Math.sin(Math.min(1, q * 2) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(timbre * 0.5, Math.sin(t * 6) * 0.1);

    ctx.fillStyle = '#07070d';
    ctx.beginPath(); ctx.moveTo(-3.0, -0.8); ctx.lineTo(4.4, -0.5); ctx.lineTo(4.4, -5.0); ctx.lineTo(-3.0, -2.6); ctx.closePath(); ctx.fill();

    var arm = new Path2D();
    arm.moveTo(4.3, -0.6);
    arm.lineTo(4.4, 4.6);
    arm.quadraticCurveTo(4.4, 5.9, 3.0, 6.0);
    arm.lineTo(-2.6, 6.2);
    arm.quadraticCurveTo(-4.0, 6.1, -4.0, 4.8);
    arm.lineTo(-3.8, -0.9);
    arm.lineTo(4.3, -0.6);
    arm.closePath();
    var puerta = new Path2D();
    puerta.moveTo(-3.8, -1.1);
    puerta.lineTo(4.3, -0.8);
    puerta.quadraticCurveTo(4.4, -5.2, 2.8, -5.8);
    puerta.lineTo(-2.4, -6.0);
    puerta.quadraticCurveTo(-3.9, -5.6, -3.8, -1.1);
    puerta.closePath();
    rostro(ctx, arm, puerta, -3.9, -1.0, ang, hierro, hierroOsc, 0.7, 0.7);

    ctx.save(); ctx.clip(arm);
    /* el letrero de arriba, encendido */
    ctx.fillStyle = mix('#fff6d0', '#ffffff', 0.2 + 0.2 * Math.abs(Math.sin(t * 1.7)));
    roundRect(ctx, -3.2, 4.6, 6.8, 1.1, 0.25); ctx.fill();
    contorno(ctx, 1.1); ctx.stroke();
    ctx.fillStyle = hierroOsc;
    for (k = 0; k < 6; k++) ctx.fillRect(-2.6 + k * 1.05, 4.95, 0.5, 0.45);
    /* los cristales, en cuadrícula */
    ctx.fillStyle = vidrio;
    roundRect(ctx, -3.2, 0.3, 6.8, 3.9, 0.3); ctx.fill();
    ctx.strokeStyle = hierroOsc; ctx.lineWidth = 0.34;
    ctx.beginPath();
    for (k = 1; k < 3; k++) { ctx.moveTo(-3.2 + k * 2.27, 0.3); ctx.lineTo(-3.2 + k * 2.27, 4.2); }
    for (k = 1; k < 3; k++) { ctx.moveTo(-3.2, 0.3 + k * 1.3); ctx.lineTo(3.6, 0.3 + k * 1.3); }
    ctx.stroke();
    contorno(ctx, 1.2);
    roundRect(ctx, -3.2, 0.3, 6.8, 3.9, 0.3); ctx.stroke();
    /* el aparato, al fondo */
    ctx.fillStyle = '#1a1c24';
    roundRect(ctx, -2.6, 1.1, 1.9, 2.2, 0.4); ctx.fill();
    ctx.strokeStyle = cromo; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(-1.7, 1.1); ctx.quadraticCurveTo(-1.2, 0.2, -0.6, 0.9); ctx.stroke();
    ctx.fillStyle = cromo;
    ctx.beginPath(); ctx.ellipse(-2.2, 3.1, 0.75, 0.32, -0.2, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 2.2, 3.5, 0.6, 0.55);
    ctx.restore();

    /* la puerta: su cristal y el tirador */
    ctx.save(); girarSobre(ctx, -3.9, -1.0, -ang); ctx.clip(puerta);
    ctx.fillStyle = vidrio;
    roundRect(ctx, -3.0, -5.1, 6.4, 3.8, 0.3); ctx.fill();
    ctx.strokeStyle = hierroOsc; ctx.lineWidth = 0.32;
    ctx.beginPath();
    for (k = 1; k < 3; k++) { ctx.moveTo(-3.0 + k * 2.13, -5.1); ctx.lineTo(-3.0 + k * 2.13, -1.3); }
    ctx.moveTo(-3.0, -3.2); ctx.lineTo(3.4, -3.2);
    ctx.stroke();
    ctx.fillStyle = cromo;
    roundRect(ctx, 2.6, -3.7, 0.5, 1.4, 0.2); ctx.fill();
    contorno(ctx, 0.9); ctx.stroke();
    ctx.restore();

    /* Q: el timbrazo */
    if (q >= 0) {
      ctx.lineCap = 'round';
      for (k = 0; k < 3; k++) {
        var u = (q * 2.1 + k / 3) % 1;
        ctx.strokeStyle = 'rgba(255,240,190,' + ((1 - u) * 0.95) + ')';
        ctx.lineWidth = 0.75 * (1 - u * 0.4);
        ctx.beginPath(); ctx.arc(4.6, 2.6, 1.6 + u * 7, -1.0, 1.0); ctx.stroke();
      }
    }
    ctx.restore();
  };

  /* ---------------- CÁMARA DE FOTOS ---------------- */
  /* Réflex de carrete: el OBJETIVO es el ojo —con su cristal azulado y su
   * destello—, el flash arriba y la tapa del carrete por boca. Q: flashazo
   * que lo deja todo blanco. */
  DRAW.camara = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 0.7), k;
    var ang = [0, 11, 20][fz] * Math.PI / 180;
    var cuerpoC = hex(mix('#2b2d36', o.c, 0.14)), cuerpoOsc = mix(cuerpoC, '#08090d', 0.55);
    var cuero = '#1b1c22', cromo = '#d5d8e0', cromoOsc = '#82879a';
    var flash = (q >= 0 && q < 0.3) ? (1 - q / 0.3) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 6.5) * 0.14);

    ctx.fillStyle = '#07070c';
    ctx.beginPath(); ctx.moveTo(-4.0, -0.7); ctx.lineTo(3.6, -0.4); ctx.lineTo(3.6, -3.8); ctx.lineTo(-4.0, -2.2); ctx.closePath(); ctx.fill();

    var cu = new Path2D();
    cu.moveTo(3.6, -0.5);
    cu.quadraticCurveTo(4.0, 1.6, 3.5, 2.8);
    cu.lineTo(1.6, 3.0);
    cu.quadraticCurveTo(1.2, 4.6, -0.4, 4.6);
    cu.quadraticCurveTo(-2.0, 4.6, -2.4, 3.1);
    cu.lineTo(-4.4, 2.9);
    cu.quadraticCurveTo(-5.0, 1.4, -4.6, -0.8);
    cu.lineTo(3.6, -0.5);
    cu.closePath();
    var tapa = new Path2D();
    tapa.moveTo(-4.6, -1.0);
    tapa.lineTo(3.6, -0.7);
    tapa.quadraticCurveTo(3.9, -3.4, 2.2, -4.0);
    tapa.lineTo(-3.6, -4.2);
    tapa.quadraticCurveTo(-4.8, -3.6, -4.6, -1.0);
    tapa.closePath();
    rostro(ctx, cu, tapa, -4.6, -0.9, ang, cuerpoC, cuerpoOsc, 0.7, 0.7);

    ctx.save(); ctx.clip(cu);
    /* la banda de cuero que cruza el cuerpo */
    ctx.fillStyle = cuero;
    ctx.fillRect(-4.8, -0.1, 9.0, 1.15);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 0.16;
    ctx.beginPath(); ctx.moveTo(-4.8, 0.5); ctx.lineTo(4.2, 0.5); ctx.stroke();
    /* el flash, arriba */
    ctx.fillStyle = mix('#dfe6f2', '#ffffff', flash);
    roundRect(ctx, -2.3, 3.1, 1.9, 1.3, 0.25); ctx.fill();
    contorno(ctx, 1.1); ctx.stroke();
    /* el disparador y la palanca de arrastre */
    ctx.fillStyle = '#e03a4a';
    ctx.beginPath(); ctx.arc(2.5, 3.3, 0.5, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
    ctx.restore();

    /* el objetivo: es el ojo */
    var lente = 2.15;
    piezaX(ctx, function () { ctx.beginPath(); ctx.arc(1.3, 1.4, lente, 0, Math.PI * 2); },
      cromo, cromoOsc, 0.35, 0.35, 1.7);
    ctx.fillStyle = '#0b1220';
    ctx.beginPath(); ctx.arc(1.3, 1.4, lente - 0.55, 0, Math.PI * 2); ctx.fill();
    var g = ctx.createRadialGradient(0.8, 2.0, 0.1, 1.3, 1.4, lente - 0.55);
    g.addColorStop(0, 'rgba(120,200,255,.85)');
    g.addColorStop(0.55, 'rgba(30,70,150,.55)');
    g.addColorStop(1, 'rgba(8,10,25,.9)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(1.3, 1.4, lente - 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(1.55, 1.3, 0.62, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 0.55, 2.25, 0.45, 0.95);
    contorno(ctx, 1.1);
    ctx.beginPath(); ctx.arc(1.3, 1.4, lente - 0.55, 0, Math.PI * 2); ctx.stroke();

    /* la tapa del carrete: su bisagra y la ventanita del contador */
    ctx.save(); girarSobre(ctx, -4.6, -0.9, -ang); ctx.clip(tapa);
    ctx.fillStyle = cuero;
    roundRect(ctx, -4.0, -3.7, 7.2, 2.5, 0.4); ctx.fill();
    ctx.fillStyle = cromoOsc;
    roundRect(ctx, 1.2, -3.2, 1.5, 1.0, 0.25); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.font = '';
    ctx.beginPath(); ctx.arc(1.95, -2.7, 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* Q: el flashazo */
    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gf = ctx.createRadialGradient(-1.35, 3.75, 0.2, -1.35, 3.75, 4 + flash * 12);
      gf.addColorStop(0, 'rgba(255,255,255,' + flash + ')');
      gf.addColorStop(0.5, 'rgba(220,240,255,' + (flash * 0.5) + ')');
      gf.addColorStop(1, 'rgba(180,220,255,0)');
      ctx.fillStyle = gf;
      ctx.beginPath(); ctx.arc(-1.35, 3.75, 4 + flash * 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + flash + ')'; ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (k = 0; k < 6; k++) {
        var ar = k * Math.PI / 3 + 0.2, lr = 3 + flash * 8;
        ctx.moveTo(-1.35 + Math.cos(ar) * 2, 3.75 + Math.sin(ar) * 2);
        ctx.lineTo(-1.35 + Math.cos(ar) * lr, 3.75 + Math.sin(ar) * lr);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };
