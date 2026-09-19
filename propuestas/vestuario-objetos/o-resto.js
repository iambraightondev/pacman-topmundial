  /* ---------------- ACCESORIOS ----------------
   * En el marco del cuerpo (f hacia delante, s hacia la coronilla), encima de
   * la skin. Escritos ya como los quiere el juego: ACC.id = function (ctx, o),
   * con el marco puesto. */
  var ACC = {};

  /* GAFAS 3D: las de cartón del cine, un cristal rojo y otro cian */
  ACC.acc_3d = function (ctx, o) {
    var carton = '#e8e4d8', cartonOsc = '#b3ad9c';
    /* la patilla, hacia atrás */
    ctx.strokeStyle = cartonOsc; ctx.lineWidth = 0.75; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.6, 4.0); ctx.lineTo(-4.4, 3.4); ctx.stroke();
    /* el armazón */
    piezaX(ctx, function () {
      ctx.beginPath();
      roundRect(ctx, -1.4, 2.5, 6.4, 2.5, 0.35);
    }, carton, cartonOsc, 0.25, 0.25, 1.4);
    /* los dos cristales */
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = '#ff2a2a';
    roundRect(ctx, 2.2, 2.85, 2.4, 1.8, 0.25); ctx.fill();
    ctx.fillStyle = '#1ae0ff';
    roundRect(ctx, -1.0, 2.85, 2.7, 1.8, 0.25); ctx.fill();
    ctx.restore();
    contorno(ctx, 1.2);
    roundRect(ctx, 2.2, 2.85, 2.4, 1.8, 0.25); ctx.stroke();
    roundRect(ctx, -1.0, 2.85, 2.7, 1.8, 0.25); ctx.stroke();
    destello(ctx, 3.0, 4.2, 0.3, 0.7);
  };

  /* CORONA: de oro, con sus puntas y tres piedras */
  ACC.acc_corona = function (ctx, o) {
    var oro = '#ffd24a', oroOsc = '#a97d0d';
    var k;
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-2.8, 4.6);
      ctx.lineTo(-2.2, 7.2); ctx.lineTo(-0.9, 5.6);
      ctx.lineTo(0.5, 7.7); ctx.lineTo(1.9, 5.6);
      ctx.lineTo(3.1, 7.0); ctx.lineTo(3.5, 4.4);
      ctx.closePath();
    }, oro, oroOsc, 0.3, 0.3, 1.6);
    /* el aro de la base */
    piezaX(ctx, function () {
      ctx.beginPath();
      roundRect(ctx, -2.9, 3.7, 6.5, 1.15, 0.3);
    }, oro, oroOsc, 0.25, 0.25, 1.4);
    var piedras = [[-2.2, 7.2, '#ff3b5c'], [0.5, 7.7, '#3ee8ff'], [3.1, 7.0, '#3ee83e']];
    for (k = 0; k < 3; k++) {
      ctx.fillStyle = piedras[k][2];
      ctx.beginPath(); ctx.arc(piedras[k][0], piedras[k][1], 0.45, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
    }
    ctx.fillStyle = '#e8355c';
    ctx.beginPath(); ctx.arc(0.4, 4.25, 0.48, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
    destello(ctx, -1.6, 4.5, 0.35, 0.8);
  };

  /* BOINA: ladeada, con su rabito */
  ACC.acc_boina = function (ctx, o) {
    var pano = hex(mix(o.c, '#2e3d8f', 0.72)), panoOsc = mix(pano, '#070c24', 0.45);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-3.4, 4.2);
      ctx.quadraticCurveTo(-3.0, 7.4, 0.4, 7.3);
      ctx.quadraticCurveTo(3.8, 7.1, 3.6, 4.9);
      ctx.quadraticCurveTo(1.0, 3.6, -3.4, 4.2);
      ctx.closePath();
    }, pano, hex(panoOsc), 0.5, 0.5, 1.6);
    /* la cinta del borde */
    ctx.strokeStyle = hex(panoOsc); ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(-3.3, 4.4); ctx.quadraticCurveTo(0.8, 3.8, 3.5, 5.0);
    ctx.stroke();
    /* el rabito */
    ctx.strokeStyle = hex(panoOsc); ctx.lineWidth = 0.55; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0.3, 7.2); ctx.lineTo(0.1, 8.1); ctx.stroke();
    destello(ctx, -1.8, 6.0, 0.4, 0.5);
  };

  /* CASCO DE ASTRONAUTA: burbuja de cristal con su aro y el reflejo */
  ACC.acc_casco = function (ctx, o) {
    var aro = '#d8dbe4', aroOsc = '#7d8494';
    ctx.save();
    /* la burbuja */
    ctx.fillStyle = 'rgba(170,215,245,.22)';
    ctx.beginPath(); ctx.arc(0.4, 1.4, R + 1.5, 0, Math.PI * 2); ctx.fill();
    var g = ctx.createRadialGradient(-2.2, 4.4, 0.5, 0.4, 1.4, R + 1.5);
    g.addColorStop(0, 'rgba(255,255,255,.35)');
    g.addColorStop(0.45, 'rgba(255,255,255,.05)');
    g.addColorStop(1, 'rgba(120,180,230,.20)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0.4, 1.4, R + 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(225,245,255,.75)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.arc(0.4, 1.4, R + 1.5, 0, Math.PI * 2); ctx.stroke();
    /* el reflejo que cruza */
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0.4, 1.4, R - 0.6, Math.PI * 0.78, Math.PI * 1.02);
    ctx.stroke();
    ctx.restore();
    /* el aro del cuello */
    piezaX(ctx, function () {
      ctx.beginPath();
      roundRect(ctx, -4.6, -6.4, 9.6, 1.5, 0.5);
    }, aro, aroOsc, 0.25, 0.25, 1.5);
    /* la antena */
    ctx.strokeStyle = aroOsc; ctx.lineWidth = 0.42; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4.2, 4.4); ctx.lineTo(-5.6, 7.0); ctx.stroke();
    ctx.fillStyle = '#ff3b3b';
    ctx.beginPath(); ctx.arc(-5.7, 7.3, 0.5, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
  };

  /* MONÓCULO: cristal con su cadenita, y una ceja levantada encima */
  ACC.acc_monoculo = function (ctx, o) {
    var oro = '#ffd24a', oroOsc = '#a97d0d';
    ctx.save();
    ctx.fillStyle = 'rgba(200,235,255,.28)';
    ctx.beginPath(); ctx.arc(1.4, 3.6, 2.0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.arc(1.4, 3.6, 2.0, 0, Math.PI * 2);
      ctx.arc(1.4, 3.6, 1.55, 0, Math.PI * 2);
    }, oro, oroOsc, 0.2, 0.2, 1.3);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 0.35; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(1.4, 3.6, 1.2, Math.PI * 0.85, Math.PI * 1.25); ctx.stroke();
    /* la cadenita, colgando y meciéndose */
    var w = Math.sin(o.t * 4) * 0.5;
    ctx.strokeStyle = oroOsc; ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(-0.5, 2.6);
    ctx.quadraticCurveTo(-2.2 + w, 0.6, -3.0 + w, -1.8);
    ctx.stroke();
    /* la ceja de pillo */
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.2, 6.2); ctx.quadraticCurveTo(1.8, 7.0, 3.3, 6.0);
    ctx.stroke();
  };

  /* CASCO DE MOTO: integral, con la visera abierta y el mentón */
  ACC.acc_moto = function (ctx, o) {
    var casco = hex(mix(o.c, '#1f2430', 0.62)), cascoOsc = mix(casco, '#05070c', 0.5);
    var visera = 'rgba(40,180,230,.5)';
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(5.2, 1.4);
      ctx.quadraticCurveTo(5.6, 5.2, 1.8, 6.9);
      ctx.quadraticCurveTo(-2.4, 8.2, -5.2, 5.2);
      ctx.quadraticCurveTo(-7.0, 2.6, -6.2, -0.8);
      ctx.quadraticCurveTo(-4.0, 0.2, -2.0, -0.2);
      ctx.quadraticCurveTo(0.6, -0.8, 2.6, 0.2);
      ctx.quadraticCurveTo(4.4, 0.4, 5.2, 1.4);
      ctx.closePath();
    }, casco, hex(cascoOsc), 0.6, 0.6, 1.8);
    /* la visera levantada */
    ctx.save();
    ctx.fillStyle = visera;
    ctx.beginPath();
    ctx.moveTo(4.6, 3.6);
    ctx.quadraticCurveTo(2.0, 8.4, -2.4, 8.2);
    ctx.quadraticCurveTo(-0.6, 5.4, 1.4, 4.0);
    ctx.closePath();
    ctx.fill();
    contorno(ctx, 1.4); ctx.stroke();
    ctx.restore();
    /* la banda del color del jugador */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(5.2, 1.4);
    ctx.quadraticCurveTo(5.6, 5.2, 1.8, 6.9);
    ctx.quadraticCurveTo(-2.4, 8.2, -5.2, 5.2);
    ctx.quadraticCurveTo(-7.0, 2.6, -6.2, -0.8);
    ctx.quadraticCurveTo(-4.0, 0.2, -2.0, -0.2);
    ctx.quadraticCurveTo(0.6, -0.8, 2.6, 0.2);
    ctx.quadraticCurveTo(4.4, 0.4, 5.2, 1.4);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = o.c;
    ctx.fillRect(-7, 2.2, 13, 1.2);
    ctx.restore();
    destello(ctx, -3.6, 5.4, 0.5, 0.6);
  };

  /* CADENA DE ORO: los eslabones al cuello y una medalla colgando */
  ACC.acc_cadena = function (ctx, o) {
    var oro = '#ffd24a', oroOsc = '#a97d0d';
    var w = Math.sin(o.t * 5) * 0.35, k;
    /* los eslabones, siguiendo el borde de abajo */
    for (k = 0; k <= 9; k++) {
      var u = k / 9;
      var a2 = Math.PI * (1.12 + u * 0.76);
      var rx = Math.cos(a2) * (R - 0.4), ry = Math.sin(a2) * (R - 0.4) - 0.4;
      ctx.fillStyle = (k % 2) ? oro : oroOsc;
      ctx.beginPath(); ctx.arc(rx, ry + w * u, 0.5, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 0.9); ctx.stroke();
    }
    /* la medalla */
    var mx = 0.2, my = -R - 0.6 + w;
    piezaX(ctx, function () { ctx.beginPath(); ctx.arc(mx, my, 1.5, 0, Math.PI * 2); },
      oro, oroOsc, 0.25, 0.25, 1.5);
    ctx.fillStyle = oroOsc;
    ctx.beginPath(); ctx.arc(mx, my, 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = oro;
    ctx.beginPath(); ctx.arc(mx, my, 0.42, 0, Math.PI * 2); ctx.fill();
    destello(ctx, mx - 0.7, my + 0.7, 0.35, 0.9);
  };

  /* Partículas que nacen cada `paso` px del camino y viven `vida` px. Es la
   * misma de js/skins.js: se repite aquí para que el escaparate ande solo. */
  function rastro(o, paso, vida) {
    var out = [], base = Math.floor(o.s / paso) * paso;
    for (var k = 0; k < 40; k++) {
      var sk = base - k * paso, dist = o.s - sk;
      if (dist < 3) continue;
      var edad = dist / vida;
      if (edad >= 1) break;
      out.push({ p: o.back(dist), edad: edad, n: Math.abs(Math.round(sk / paso)) });
    }
    return out;
  }

  /* ---------------- EFECTOS ----------------
   * EFX.id = function (ctx, o, cuerpo): cada uno decide si va debajo o encima
   * de la skin llamando a cuerpo() donde toque. */
  var EFX = {};

  /* BURBUJAS: suben y se van haciendo grandes hasta reventar */
  EFX.efx_burbujas = function (ctx, o, cuerpo) {
    cuerpo();
    rastro(o, 9, 58).forEach(function (q) {
      var r = 0.5 + q.edad * 1.9;
      var sube = q.edad * 7;
      var x = q.p.x + Math.sin(q.edad * 7 + q.n) * 1.5;
      var y = q.p.y - sube;
      ctx.globalAlpha = (1 - q.edad) * 0.85;
      ctx.strokeStyle = 'rgba(190,230,255,.9)'; ctx.lineWidth = 0.28;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(160,215,245,.18)';
      ctx.fill();
      destello(ctx, x - r * 0.4, y - r * 0.4, r * 0.3, (1 - q.edad) * 0.8);
    });
    ctx.globalAlpha = 1;
  };

  /* NEÓN: deja un tubo encendido de su color, con su halo */
  EFX.efx_neon = function (ctx, o, cuerpo) {
    var ptos = rastro(o, 4, 52);
    if (ptos.length > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      [[2.6, 0.16], [1.2, 0.35], [0.45, 0.95]].forEach(function (capa) {
        ctx.strokeStyle = mix(o.c, '#ffffff', capa[1] > 0.5 ? 0.75 : 0.2, capa[1]);
        ctx.lineWidth = capa[0];
        ctx.beginPath();
        ctx.moveTo(ptos[0].p.x, ptos[0].p.y);
        for (var i = 1; i < ptos.length; i++) ctx.lineTo(ptos[i].p.x, ptos[i].p.y);
        ctx.stroke();
      });
      ctx.restore();
    }
    cuerpo();
  };

  /* GLITCH: se descompone en rojo, verde y azul desencajados */
  EFX.efx_glitch = function (ctx, o, cuerpo) {
    var salta = (Math.floor(o.t * 7) % 3 === 0);
    var d = salta ? 1.4 : 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    [['rgba(255,40,40,.55)', -d], ['rgba(40,255,90,.45)', 0], ['rgba(60,120,255,.55)', d]]
      .forEach(function (capa) {
        ctx.save();
        ctx.translate(capa[1], 0);
        ctx.globalAlpha = 0.5;
        ctx.filter = 'none';
        cuerpo();
        ctx.restore();
      });
    ctx.restore();
    cuerpo();
    /* bandas que se desplazan */
    if (salta) {
      for (var k = 0; k < 3; k++) {
        var yy = o.y - 5 + ((k * 37 + Math.floor(o.t * 20) * 11) % 11);
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        ctx.fillRect(o.x - 7 + ((k % 2) ? 1.5 : -1.5), yy, 14, 0.7);
      }
    }
  };

  /* POLAROIDS: va soltando fotos instantáneas que caen girando */
  EFX.efx_polaroids = function (ctx, o, cuerpo) {
    cuerpo();
    rastro(o, 16, 70).forEach(function (q) {
      ctx.save();
      ctx.globalAlpha = 1 - q.edad;
      ctx.translate(q.p.x, q.p.y + q.edad * 5.5);
      ctx.rotate((q.n % 2 ? 1 : -1) * (0.25 + q.edad * 1.1));
      ctx.fillStyle = '#f4f1e6';
      roundRect(ctx, -1.5, -1.7, 3.0, 3.4, 0.18); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
      ctx.fillStyle = mix(o.c, '#20242e', 0.55);
      ctx.fillRect(-1.1, -1.35, 2.2, 2.1);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  };

  /* TICKETS: la tira de tickets de premios, saliendo por detrás */
  EFX.efx_tickets = function (ctx, o, cuerpo) {
    cuerpo();
    rastro(o, 6, 46).forEach(function (q) {
      ctx.save();
      ctx.globalAlpha = 1 - q.edad;
      ctx.translate(q.p.x, q.p.y + Math.sin(q.edad * 6 + q.n) * 1.4);
      ctx.rotate(Math.sin(q.n * 0.7) * 0.4);
      ctx.fillStyle = (q.n % 2) ? '#ffd24a' : '#ffe9a8';
      roundRect(ctx, -1.6, -0.7, 3.2, 1.4, 0.2); ctx.fill();
      contorno(ctx, 0.9); ctx.stroke();
      ctx.fillStyle = 'rgba(20,20,20,.5)';
      ctx.beginPath(); ctx.arc(-1.05, 0, 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(1.05, 0, 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  };

  /* CINTA DE CASETE: la cinta marrón, enredándose por el camino */
  EFX.efx_cinta = function (ctx, o, cuerpo) {
    var ptos = rastro(o, 5, 80);
    if (ptos.length > 2) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      [['rgba(74,50,30,.9)', 0.55, 1], ['rgba(122,86,52,.8)', 0.3, -1]].forEach(function (capa) {
        ctx.strokeStyle = capa[0];
        ctx.lineWidth = capa[1];
        ctx.beginPath();
        for (var i = 0; i < ptos.length; i++) {
          var q = ptos[i];
          var bal = Math.sin(q.n * 0.9 + o.t * 2) * (1.2 + q.edad * 2.8) * capa[2];
          var x = q.p.x, y = q.p.y + bal;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.restore();
    }
    cuerpo();
  };

  /* ---------------- EMOTES ----------------
   * Cada cara se dibuja entera, con su propio meneo, en el globo del jugador.
   * Mismo idioma que caraEmote del juego: círculo del color y rasgos negros. */
  function caraObj(ctx, x, y, r, color, id, t) {
    var ink = '#000000', lw = Math.max(1, r * 0.17), k;
    var ex = r * 0.42, ey = y - r * 0.24;

    if (id === 'alucinado') {
      /* ojos como platos y la mandíbula por los suelos */
      ctx.save();
      ctx.translate(x, y); ctx.scale(1 + Math.sin(t * 0.25) * 0.03, 1); ctx.translate(-x, -y);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      [-1, 1].forEach(function (lado) {
        var cx = x + lado * ex;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx, ey, r * 0.30, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.5; ctx.stroke();
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(cx, ey, r * 0.13, 0, Math.PI * 2); ctx.fill();
      });
      /* cejas muy arriba */
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.55; ctx.lineCap = 'round';
      [-1, 1].forEach(function (lado) {
        ctx.beginPath();
        ctx.arc(x + lado * ex, ey - r * 0.18, r * 0.30, 1.2 * Math.PI, 1.8 * Math.PI);
        ctx.stroke();
      });
      /* la boca abierta de par en par */
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.42, r * 0.26, r * 0.36 + Math.sin(t * 0.2) * r * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (id === 'pensando') {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(-0.1); ctx.translate(-x, -y);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.lineCap = 'round';
      /* un ojo mirando arriba y otro entornado */
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(x - ex, ey, r * 0.2, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.45; ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(x - ex, ey - r * 0.08, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.arc(x + ex, ey + r * 0.06, r * 0.2, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();
      /* la boca torcida, pensando */
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.22, y + r * 0.44);
      ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.34, x + r * 0.3, y + r * 0.5);
      ctx.stroke();
      ctx.restore();
      /* las tres burbujitas de pensar, creciendo */
      for (k = 0; k < 3; k++) {
        var u = ((t * 0.02 + k * 0.33) % 1);
        var rr = r * (0.09 + k * 0.05);
        ctx.globalAlpha = 0.35 + 0.65 * Math.sin(u * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + r * (0.72 + k * 0.3), y - r * (0.62 + k * 0.34), rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.35; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }

    if (id === 'roto') {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(0.14); ctx.translate(-x, -y + Math.sin(t * 0.1) * r * 0.05);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      /* ojos de pena */
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.8; ctx.lineCap = 'round';
      [-1, 1].forEach(function (lado) {
        ctx.beginPath();
        ctx.arc(x + lado * ex, ey + r * 0.14, r * 0.22, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
      });
      /* boca hacia abajo */
      ctx.lineWidth = lw * 0.75;
      ctx.beginPath();
      ctx.arc(x, y + r * 0.72, r * 0.3, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      ctx.restore();
      /* el corazón partiéndose, arriba */
      var sep = 0.2 + 0.8 * ((t * 0.012) % 1);
      [[-1, -0.5], [1, 0.5]].forEach(function (m) {
        ctx.save();
        ctx.translate(x + r * 0.95 * m[1] * sep, y - r * 0.95 - sep * r * 0.2);
        ctx.rotate(m[0] * sep * 0.6);
        ctx.fillStyle = '#ff3b5c';
        ctx.beginPath();
        if (m[0] < 0) {
          ctx.moveTo(0, r * 0.34);
          ctx.quadraticCurveTo(-r * 0.42, r * 0.02, -r * 0.2, -r * 0.24);
          ctx.quadraticCurveTo(-r * 0.04, -r * 0.34, 0, -r * 0.12);
        } else {
          ctx.moveTo(0, r * 0.34);
          ctx.quadraticCurveTo(r * 0.42, r * 0.02, r * 0.2, -r * 0.24);
          ctx.quadraticCurveTo(r * 0.04, -r * 0.34, 0, -r * 0.12);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.35; ctx.stroke();
        ctx.restore();
      });
      return;
    }

    if (id === 'aplauso') {
      var palma = Math.abs(Math.sin(t * 0.35));
      ctx.save();
      ctx.translate(x, y - palma * r * 0.05);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      /* ojos contentos, dos arcos */
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.8; ctx.lineCap = 'round';
      [-1, 1].forEach(function (lado) {
        ctx.beginPath();
        ctx.arc(lado * ex, -r * 0.18, r * 0.22, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
      });
      /* boca abierta de gusto */
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.4, r * 0.28, r * 0.2, 0, 0, Math.PI);
      ctx.fill();
      ctx.restore();
      /* las dos manos, chocando */
      [-1, 1].forEach(function (lado) {
        var sep2 = (1 - palma) * r * 0.5;
        ctx.save();
        ctx.translate(x + lado * (r * 0.95 + sep2), y + r * 0.55);
        ctx.rotate(lado * 0.5);
        ctx.fillStyle = '#ffd9a8';
        roundRect(ctx, -r * 0.2, -r * 0.3, r * 0.4, r * 0.6, r * 0.16); ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.4; ctx.stroke();
        ctx.restore();
      });
      /* rayitas del choque */
      if (palma > 0.85) {
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = lw * 0.35;
        ctx.beginPath();
        for (k = 0; k < 4; k++) {
          var a2 = -0.6 + k * 0.4;
          ctx.moveTo(x + Math.cos(a2) * r * 1.1, y + r * 0.55 + Math.sin(a2) * r * 0.5);
          ctx.lineTo(x + Math.cos(a2) * r * 1.45, y + r * 0.55 + Math.sin(a2) * r * 0.7);
        }
        ctx.stroke();
      }
      return;
    }

    /* CHIST: el dedo en los labios, pidiendo silencio */
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.07); ctx.translate(-x, -y);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.55; ctx.lineCap = 'round';
    /* un ojo normal y el otro guiñado */
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(x - ex, ey, r * 0.19, r * 0.21, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.45; ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(x - ex, ey, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.arc(x + ex, ey + r * 0.05, r * 0.2, 1.1 * Math.PI, 1.9 * Math.PI);
    ctx.stroke();
    /* la boca en O pequeña */
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.ellipse(x + r * 0.05, y + r * 0.45, r * 0.11, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* el dedo, cruzando los labios */
    ctx.save();
    ctx.translate(x + r * 0.05, y + r * 0.45);
    ctx.rotate(-0.35 + Math.sin(t * 0.06) * 0.05);
    ctx.fillStyle = '#ffd9a8';
    roundRect(ctx, -r * 0.14, -r * 0.62, r * 0.28, r * 0.95, r * 0.13); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.4; ctx.stroke();
    ctx.restore();
  }
