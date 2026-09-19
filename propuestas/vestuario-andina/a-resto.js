  /* Partículas que nacen cada `paso` px del camino y viven `vida` px. */
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

  /* ---------------- ACCESORIOS ----------------
   * ACC.id = function (ctx, o), en el marco del cuerpo y con la skin debajo.
   * Es la forma que pide el juego. */
  var ACC = {};

  /* MONTERA: el sombrero de ala ancha, con su cinta bordada */
  ACC.acc_montera = function (ctx, o) {
    var pano = hex(mix(o.c, '#3a2a1a', 0.62)), panoOsc = mix(pano, '#120a04', 0.45);
    var cinta = hex(mix(o.c, '#e01f4a', 0.5)), k;
    /* el ala, bien ancha */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.ellipse(0.2, 4.0, 6.4, 1.5, -0.06, 0, Math.PI * 2);
    }, pano, hex(panoOsc), 0.35, 0.35, 1.6);
    /* la copa */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-3.0, 4.2);
      ctx.quadraticCurveTo(-2.8, 7.2, 0.4, 7.3);
      ctx.quadraticCurveTo(3.6, 7.2, 3.8, 4.2);
      ctx.quadraticCurveTo(0.4, 3.2, -3.0, 4.2);
      ctx.closePath();
    }, pano, hex(panoOsc), 0.4, 0.4, 1.6);
    /* la cinta bordada, con sus rombos */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-3.0, 4.2);
    ctx.quadraticCurveTo(-2.8, 7.2, 0.4, 7.3);
    ctx.quadraticCurveTo(3.6, 7.2, 3.8, 4.2);
    ctx.quadraticCurveTo(0.4, 3.2, -3.0, 4.2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = cinta;
    ctx.fillRect(-3.4, 4.3, 7.6, 1.2);
    ctx.fillStyle = '#f2e4c2';
    for (k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(-2.6 + k * 1.5, 4.9);
      ctx.lineTo(-2.2 + k * 1.5, 4.5);
      ctx.lineTo(-1.8 + k * 1.5, 4.9);
      ctx.lineTo(-2.2 + k * 1.5, 5.3);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  /* PONCHO: la tela cayendo por los hombros, con sus franjas */
  ACC.acc_poncho = function (ctx, o) {
    var tela = hex(mix(o.c, '#a8221a', 0.55)), telaOsc = mix(tela, '#2a0604', 0.45);
    var franja = '#f2e4c2', k;
    var w = Math.sin(o.t * 4) * 0.35;
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-6.4, -1.4);
      ctx.quadraticCurveTo(-7.0, -5.0, -4.6, -6.6 + w);
      ctx.quadraticCurveTo(0.4, -8.2 + w, 5.2, -6.4 + w);
      ctx.quadraticCurveTo(7.0, -5.2, 6.2, -1.6);
      ctx.quadraticCurveTo(0.2, 0.2, -6.4, -1.4);
      ctx.closePath();
    }, tela, hex(telaOsc), 0.5, 0.5, 1.7);
    /* las franjas */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-6.4, -1.4);
    ctx.quadraticCurveTo(-7.0, -5.0, -4.6, -6.6 + w);
    ctx.quadraticCurveTo(0.4, -8.2 + w, 5.2, -6.4 + w);
    ctx.quadraticCurveTo(7.0, -5.2, 6.2, -1.6);
    ctx.quadraticCurveTo(0.2, 0.2, -6.4, -1.4);
    ctx.closePath();
    ctx.clip();
    for (k = 0; k < 3; k++) {
      ctx.fillStyle = (k % 2) ? franja : hex(telaOsc);
      ctx.fillRect(-7.5, -5.4 + k * 1.5 + w, 15, 0.75);
    }
    ctx.restore();
    /* los flecos */
    ctx.strokeStyle = franja; ctx.lineWidth = 0.28; ctx.lineCap = 'round';
    ctx.beginPath();
    for (k = 0; k < 9; k++) {
      var fx = -6.0 + k * 1.5;
      ctx.moveTo(fx, -1.0 + Math.abs(fx) * 0.05);
      ctx.lineTo(fx + Math.sin(o.t * 5 + k) * 0.3, -2.4 + Math.abs(fx) * 0.05);
    }
    ctx.stroke();
  };

  /* QUENA: la flauta pegada a la boca, con sus notas */
  ACC.acc_quena = function (ctx, o) {
    var cana = '#d8b878', canaOsc = '#8a6a32', k;
    ctx.save();
    ctx.translate(5.0, 0.2);
    ctx.rotate(-0.55);
    piezaX(ctx, function () {
      ctx.beginPath();
      roundRect(ctx, -0.7, -1.0, 1.5, 8.6, 0.6);
    }, cana, canaOsc, 0.2, 0.2, 1.4);
    ctx.fillStyle = canaOsc;
    for (k = 0; k < 5; k++) {
      ctx.beginPath(); ctx.arc(0.05, 0.9 + k * 1.35, 0.26, 0, Math.PI * 2); ctx.fill();
    }
    /* los nudos de la caña */
    ctx.strokeStyle = canaOsc; ctx.lineWidth = 0.24;
    ctx.beginPath();
    ctx.moveTo(-0.7, 2.6); ctx.lineTo(0.8, 2.6);
    ctx.moveTo(-0.7, 5.6); ctx.lineTo(0.8, 5.6);
    ctx.stroke();
    ctx.restore();
    /* dos notas escapándose */
    for (k = 0; k < 2; k++) {
      var u = ((o.t * 0.8) + k * 0.5) % 1;
      nota(ctx, 7.5 + u * 3.5, 6.5 + u * 3 + Math.sin(u * 6 + k) * 1.2,
        0.8 * (1 - u * 0.4), mix('#ffffff', o.c, 0.4, 1 - u));
    }
  };

  /* OREJERAS DE ORO: los discos de oro en la oreja, de los señores mochica */
  ACC.acc_orejeras = function (ctx, o) {
    var oro = '#ffd24a', oroOsc = '#a97d0d';
    var turquesa = '#3ec8b8';
    var w = Math.sin(o.t * 4) * 0.35;
    [[-3.4, 1.4, 2.0], [-5.4, 0.2, 1.4]].forEach(function (d, k) {
      ctx.save();
      ctx.translate(d[0], d[1] + w * (k ? 0.6 : 1));
      piezaX(ctx, function () { ctx.beginPath(); ctx.arc(0, 0, d[2], 0, Math.PI * 2); },
        oro, oroOsc, 0.25, 0.25, 1.4);
      ctx.fillStyle = turquesa;
      ctx.beginPath(); ctx.arc(0, 0, d[2] * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = oroOsc; ctx.lineWidth = 0.22; ctx.stroke();
      ctx.fillStyle = oro;
      ctx.beginPath(); ctx.arc(0, 0, d[2] * 0.22, 0, Math.PI * 2); ctx.fill();
      if (!k) destello(ctx, -d[2] * 0.4, d[2] * 0.4, 0.3, 0.85);
      ctx.restore();
    });
  };

  /* TRENZAS: dos trenzas largas con sus pompones de lana */
  ACC.acc_trenzas = function (ctx, o) {
    var pelo = '#2a1a10', peloOsc = '#120a05';
    var lana = hex(mix(o.c, '#e01f4a', 0.45)), k;
    [[1, 0], [-1, 0.7]].forEach(function (l, j) {
      var w = Math.sin(o.t * 3.5 + l[1]) * 0.8;
      var bx = -3.0 - j * 0.8, by = 2.4 - j * 1.6;
      /* la trenza: tres bolitas seguidas */
      for (k = 0; k < 5; k++) {
        var u = k / 4;
        var px = bx - u * 1.6 + Math.sin(u * 3 + w) * 0.9;
        var py = by - u * 6.2 - w * u;
        ctx.fillStyle = (k % 2) ? pelo : peloOsc;
        ctx.beginPath(); ctx.ellipse(px, py, 0.95 - u * 0.22, 0.8 - u * 0.18, 0.2, 0, Math.PI * 2); ctx.fill();
        contorno(ctx, 1.1); ctx.stroke();
      }
      /* el pompón del final */
      var fx = bx - 1.6 + Math.sin(3 + w) * 0.9, fy = by - 6.2 - w;
      ctx.fillStyle = lana;
      for (k = 0; k < 5; k++) {
        var a2 = k * 1.256;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a2) * 0.42, fy + Math.sin(a2) * 0.42, 0.58, 0, Math.PI * 2);
        ctx.fill();
      }
      contorno(ctx, 1.1);
      ctx.beginPath(); ctx.arc(fx, fy, 0.95, 0, Math.PI * 2); ctx.stroke();
    });
  };

  /* MÁSCARA DE ORO: la funeraria sicán, con los ojos alados */
  ACC.acc_oro = function (ctx, o) {
    var oro = '#ffcf3a', oroOsc = '#8a5200';
    var rojo = '#c8342a';
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(6.0, 1.2);
      ctx.quadraticCurveTo(6.4, 4.6, 3.4, 5.6);
      ctx.quadraticCurveTo(-0.6, 6.6, -3.6, 4.8);
      ctx.quadraticCurveTo(-5.4, 3.4, -5.0, 0.6);
      ctx.quadraticCurveTo(-4.2, -1.6, -1.4, -1.4);
      ctx.quadraticCurveTo(2.6, -1.0, 6.0, 1.2);
      ctx.closePath();
    }, oro, oroOsc, 0.45, 0.45, 1.7);
    /* los ojos alados, la marca sicán */
    ctx.fillStyle = TINTA;
    [[1.0, 2.8], [4.0, 2.4]].forEach(function (e) {
      ctx.beginPath();
      ctx.moveTo(e[0] - 1.2, e[1]);
      ctx.quadraticCurveTo(e[0], e[1] + 0.95, e[0] + 1.2, e[1]);
      ctx.quadraticCurveTo(e[0], e[1] - 0.65, e[0] - 1.2, e[1]);
      ctx.closePath(); ctx.fill();
    });
    /* la nariz, en relieve */
    ctx.strokeStyle = oroOsc; ctx.lineWidth = 0.38; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2.4, 2.2); ctx.lineTo(2.6, 0.4);
    ctx.stroke();
    /* el cinabrio, el rojo que llevaban */
    ctx.fillStyle = 'rgba(200,52,42,.45)';
    ctx.beginPath(); ctx.ellipse(-2.6, 2.4, 1.6, 1.0, 0.2, 0, Math.PI * 2); ctx.fill();
    destello(ctx, -1.0, 4.6, 0.5, 0.75);
  };

  /* PLUMAS DE GUACAMAYO: el tocado de plumas de colores, hacia atrás */
  ACC.acc_plumas = function (ctx, o) {
    var COL = ['#e01f1f', '#ff8c1a', '#ffd24a', '#3ee83e', '#1ae0ff', '#2e6bff'];
    var k;
    for (k = 0; k < 9; k++) {
      var u = k / 8;
      var a2 = -0.35 - u * 1.5;
      var lar = 5.5 + Math.sin(u * 3) * 1.6;
      var w = Math.sin(o.t * 3.5 + k * 0.6) * 0.12;
      ctx.save();
      ctx.translate(-0.4, 4.2);
      ctx.rotate(a2 + w);
      ctx.fillStyle = COL[k % COL.length];
      ctx.beginPath();
      ctx.moveTo(0, -0.55);
      ctx.quadraticCurveTo(lar * 0.6, -1.1, lar, 0);
      ctx.quadraticCurveTo(lar * 0.6, 1.1, 0, 0.55);
      ctx.closePath(); ctx.fill();
      contorno(ctx, 1.1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.moveTo(0.3, 0); ctx.lineTo(lar - 0.4, 0); ctx.stroke();
      ctx.restore();
    }
    /* la vincha que las sujeta */
    piezaX(ctx, function () {
      ctx.beginPath();
      roundRect(ctx, -4.0, 3.2, 8.0, 1.3, 0.4);
    }, hex(mix(o.c, '#a8221a', 0.5)), '#3a0a06', 0.25, 0.25, 1.4);
  };

  /* ---------------- EFECTOS ---------------- */
  var EFX = {};

  /* HOJAS DE COCA: van cayendo hojas verdes que se posan */
  EFX.efx_coca = function (ctx, o, cuerpo) {
    cuerpo();
    rastro(o, 10, 66).forEach(function (q) {
      ctx.save();
      ctx.globalAlpha = 1 - q.edad;
      ctx.translate(q.p.x, q.p.y + q.edad * 3.5);
      ctx.rotate((q.n % 2 ? 1 : -1) * (0.3 + q.edad * 2.2));
      ctx.fillStyle = (q.n % 3) ? '#5a9a2a' : '#3e7a1a';
      ctx.beginPath();
      ctx.moveTo(-1.4, 0);
      ctx.quadraticCurveTo(0, -0.85, 1.4, 0);
      ctx.quadraticCurveTo(0, 0.85, -1.4, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(20,40,10,.7)'; ctx.lineWidth = 0.16; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1.1, 0); ctx.lineTo(1.1, 0); ctx.stroke();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  };

  /* NIEVE: el granizo fino de la cordillera, cayendo en diagonal */
  EFX.efx_nieve = function (ctx, o, cuerpo) {
    cuerpo();
    rastro(o, 4, 58).forEach(function (q) {
      var a = 1 - q.edad;
      var x = q.p.x - q.edad * 2.2, y = q.p.y + q.edad * 6;
      ctx.fillStyle = 'rgba(240,250,255,' + a + ')';
      ctx.beginPath(); ctx.arc(x, y, 0.42 * (1 - q.edad * 0.4), 0, Math.PI * 2); ctx.fill();
      if (q.n % 4 === 0) {
        ctx.strokeStyle = 'rgba(200,235,255,' + (a * 0.7) + ')';
        ctx.lineWidth = 0.18;
        ctx.beginPath();
        for (var k = 0; k < 3; k++) {
          var a2 = k * Math.PI / 3;
          ctx.moveTo(x - Math.cos(a2) * 0.9, y - Math.sin(a2) * 0.9);
          ctx.lineTo(x + Math.cos(a2) * 0.9, y + Math.sin(a2) * 0.9);
        }
        ctx.stroke();
      }
    });
  };

  /* SERPENTINA: las cintas de carnaval, enroscándose por el camino */
  EFX.efx_serpentina = function (ctx, o, cuerpo) {
    var COL = ['#e01f4a', '#ffd24a', '#3ee83e', '#1ae0ff', '#ff8c1a'];
    var ptos = rastro(o, 4, 62);
    ctx.save();
    ctx.lineCap = 'round';
    [0, 1, 2].forEach(function (j) {
      ctx.strokeStyle = mix(COL[j % COL.length], '#ffffff', 0.15, 0.85);
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      for (var i = 0; i < ptos.length; i++) {
        var q = ptos[i];
        var bal = Math.sin(q.n * 0.55 + j * 2.1 + o.t * 2) * (1.4 + q.edad * 3.4);
        ctx.globalAlpha = 1 - q.edad;
        if (i === 0) ctx.moveTo(q.p.x, q.p.y + bal);
        else ctx.lineTo(q.p.x, q.p.y + bal);
      }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
    cuerpo();
  };

  /* TEJIDO: deja una faja tejida, con sus rombos */
  EFX.efx_tejido = function (ctx, o, cuerpo) {
    var ptos = rastro(o, 5, 70);
    ctx.save();
    ptos.forEach(function (q) {
      ctx.globalAlpha = (1 - q.edad) * 0.9;
      ctx.fillStyle = hex(mix(o.c, '#a8221a', 0.45));
      ctx.fillRect(q.p.x - 1.6, q.p.y - 1.6, 3.2, 3.2);
      ctx.fillStyle = '#f2e4c2';
      var m = q.n % 3;
      if (m === 0) {
        ctx.beginPath();
        ctx.moveTo(q.p.x, q.p.y - 1.0);
        ctx.lineTo(q.p.x + 1.0, q.p.y);
        ctx.lineTo(q.p.x, q.p.y + 1.0);
        ctx.lineTo(q.p.x - 1.0, q.p.y);
        ctx.closePath(); ctx.fill();
      } else if (m === 1) {
        ctx.fillRect(q.p.x - 1.4, q.p.y - 0.35, 2.8, 0.7);
      } else {
        ctx.fillRect(q.p.x - 0.35, q.p.y - 1.4, 0.7, 2.8);
      }
    });
    ctx.globalAlpha = 1;
    ctx.restore();
    cuerpo();
  };

  /* POLVO DE ORO: la arenilla dorada del río, brillando */
  EFX.efx_polvoro = function (ctx, o, cuerpo) {
    cuerpo();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    rastro(o, 3, 48).forEach(function (q) {
      var bri = (1 - q.edad) * (0.5 + 0.5 * Math.sin(o.t * 7 + q.n * 1.3));
      var dx = Math.sin(q.n * 2.1) * 1.4, dy = -q.edad * 2.6 + Math.cos(q.n * 1.7) * 1.2;
      estrella4(ctx, q.p.x + dx, q.p.y + dy, 0.5 + bri * 0.8, '#ffd24a', bri);
    });
    ctx.restore();
  };

  /* LÍNEAS DE NAZCA: el camino queda grabado en el suelo, como un geoglifo */
  EFX.efx_lineas = function (ctx, o, cuerpo) {
    var ptos = rastro(o, 6, 110);
    if (ptos.length > 1) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      /* el surco oscuro */
      ctx.strokeStyle = 'rgba(60,44,26,.55)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(ptos[0].p.x, ptos[0].p.y);
      for (var i = 1; i < ptos.length; i++) ctx.lineTo(ptos[i].p.x, ptos[i].p.y);
      ctx.stroke();
      /* la línea clara, encima */
      ctx.strokeStyle = 'rgba(232,216,184,.85)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(ptos[0].p.x, ptos[0].p.y);
      for (i = 1; i < ptos.length; i++) ctx.lineTo(ptos[i].p.x, ptos[i].p.y);
      ctx.stroke();
      /* las piedras del borde, cada tanto */
      ctx.fillStyle = 'rgba(180,160,124,.7)';
      ptos.forEach(function (q) {
        if (q.n % 3) return;
        ctx.fillRect(q.p.x - 0.3, q.p.y - 1.9, 0.6, 0.6);
        ctx.fillRect(q.p.x - 0.3, q.p.y + 1.3, 0.6, 0.6);
      });
      ctx.restore();
    }
    cuerpo();
  };

  /* ---------------- EMOTES ---------------- */
  function caraAndina(ctx, x, y, r, color, id, t) {
    var ink = '#000000', lw = Math.max(1, r * 0.17), k;
    var ex = r * 0.42, ey = y - r * 0.24;

    if (id === 'achachau') {
      /* muerto de frío: tiritando, morado y con vaho */
      var tir = Math.sin(t * 1.2) * r * 0.05;
      ctx.save();
      ctx.translate(x + tir, y);
      ctx.fillStyle = mix(color, '#6a9ad8', 0.45);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.7; ctx.lineCap = 'round';
      /* ojos apretados */
      [-1, 1].forEach(function (lado) {
        ctx.beginPath();
        ctx.moveTo(lado * ex - r * 0.2, ey - y - r * 0.08);
        ctx.lineTo(lado * ex + r * 0.2, ey - y + r * 0.08);
        ctx.moveTo(lado * ex - r * 0.2, ey - y + r * 0.08);
        ctx.lineTo(lado * ex + r * 0.2, ey - y - r * 0.08);
        ctx.stroke();
      });
      /* la boca temblando, en zigzag */
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      for (k = 0; k <= 6; k++) {
        var px = -r * 0.36 + k * (r * 0.12);
        var py = r * 0.42 + (k % 2 ? -r * 0.08 : r * 0.08);
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      /* mofletes helados */
      ctx.fillStyle = 'rgba(120,180,240,.55)';
      [-1, 1].forEach(function (lado) {
        ctx.beginPath(); ctx.ellipse(lado * r * 0.6, r * 0.18, r * 0.24, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
      /* el vaho */
      for (k = 0; k < 3; k++) {
        var u = ((t * 0.02 + k * 0.33) % 1);
        ctx.fillStyle = 'rgba(230,245,255,' + ((1 - u) * 0.6) + ')';
        ctx.beginPath();
        ctx.arc(x + r * (0.9 + u * 1.2), y + r * 0.3 - u * r * 0.4, r * (0.12 + u * 0.16), 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    if (id === 'huayno') {
      /* bailando: se mece de lado y le salen notas */
      var mece = Math.sin(t * 0.18);
      ctx.save();
      ctx.translate(x + mece * r * 0.16, y - Math.abs(mece) * r * 0.1);
      ctx.rotate(mece * 0.18);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.8; ctx.lineCap = 'round';
      [-1, 1].forEach(function (lado) {
        ctx.beginPath();
        ctx.arc(lado * ex, -r * 0.18, r * 0.22, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
      });
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(0, r * 0.42, r * 0.26, r * 0.2, 0, 0, Math.PI); ctx.fill();
      /* el sombrerito, ladeado */
      ctx.fillStyle = mix(color, '#3a2a1a', 0.7);
      ctx.beginPath(); ctx.ellipse(-r * 0.12, -r * 0.92, r * 0.78, r * 0.18, -0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-r * 0.12, -r * 1.12, r * 0.42, r * 0.26, -0.12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      for (k = 0; k < 3; k++) {
        var un = ((t * 0.015 + k * 0.33) % 1);
        nota(ctx, x + r * (1.0 + un * 0.9) * (k % 2 ? 1 : -1),
          y - r * (0.5 + un * 1.3), r * 0.22, mix('#ffffff', color, 0.4, 1 - un));
      }
      return;
    }

    if (id === 'chevere') {
      /* el pulgar arriba y una sonrisa de oreja a oreja */
      ctx.save();
      ctx.translate(x, y - Math.abs(Math.sin(t * 0.12)) * r * 0.06);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.8; ctx.lineCap = 'round';
      /* un ojo guiñado */
      ctx.beginPath();
      ctx.arc(-ex, -r * 0.18, r * 0.22, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(ex, ey - y, r * 0.2, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.45; ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(ex, ey - y, r * 0.1, 0, Math.PI * 2); ctx.fill();
      /* la sonrisota */
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, r * 0.28);
      ctx.quadraticCurveTo(0, r * 0.82, r * 0.5, r * 0.28);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      /* la mano con el pulgar */
      ctx.save();
      ctx.translate(x + r * 1.02, y + r * 0.45);
      ctx.rotate(-0.25 + Math.sin(t * 0.1) * 0.08);
      ctx.fillStyle = '#ffd9a8';
      roundRect(ctx, -r * 0.24, -r * 0.24, r * 0.48, r * 0.52, r * 0.16); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.4; ctx.stroke();
      roundRect(ctx, -r * 0.1, -r * 0.62, r * 0.22, r * 0.44, r * 0.11); ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (id === 'chau') {
      /* diciendo adiós con la mano */
      var saluda = Math.sin(t * 0.3);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(saluda * 0.06);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.8; ctx.lineCap = 'round';
      [-1, 1].forEach(function (lado) {
        ctx.beginPath();
        ctx.arc(lado * ex, -r * 0.18, r * 0.22, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
      });
      ctx.lineWidth = lw * 0.65;
      ctx.beginPath();
      ctx.arc(0, r * 0.22, r * 0.3, 0.18 * Math.PI, 0.82 * Math.PI);
      ctx.stroke();
      ctx.restore();
      /* la mano, meciéndose */
      ctx.save();
      ctx.translate(x + r * 1.05, y - r * 0.15);
      ctx.rotate(saluda * 0.5);
      ctx.fillStyle = '#ffd9a8';
      roundRect(ctx, -r * 0.26, -r * 0.3, r * 0.52, r * 0.6, r * 0.18); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.4; ctx.stroke();
      for (k = 0; k < 3; k++) {
        roundRect(ctx, -r * 0.2 + k * r * 0.16, -r * 0.52, r * 0.13, r * 0.28, r * 0.06);
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      return;
    }

    /* QUÉ RICO: relamiéndose, con la lengua y un brillo */
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.06) * 0.06);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.8; ctx.lineCap = 'round';
    /* ojos entornados de gusto */
    [-1, 1].forEach(function (lado) {
      ctx.beginPath();
      ctx.arc(lado * ex, -r * 0.16, r * 0.22, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    });
    /* la boca abierta y la lengua relamiendo */
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.4, r * 0.3, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    var lengua = 0.5 + 0.5 * Math.sin(t * 0.25);
    ctx.fillStyle = '#ff6a8a';
    ctx.save();
    ctx.translate(r * 0.1 + lengua * r * 0.18, r * 0.5);
    ctx.rotate(lengua * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.22, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* mofletes contentos */
    ctx.fillStyle = 'rgba(240,120,120,.45)';
    [-1, 1].forEach(function (lado) {
      ctx.beginPath(); ctx.ellipse(lado * r * 0.62, r * 0.16, r * 0.22, r * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    estrella4(ctx, x + r * 0.85, y - r * 0.75, r * 0.2, '#ffffff',
      0.5 + 0.5 * Math.sin(t * 0.14));
  }
