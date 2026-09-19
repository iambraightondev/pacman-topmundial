  /* =====================================================================
   * TANDA DE MITOLOGÍA (19 sep). Diez skins sacadas de los mitos: dejan la
   * silueta de Pac-Man, cada una come a su manera, tiene su Q y su muerte.
   * Dos son de TEMPORADA: solo salen en Halloween.
   * ===================================================================== */

  /* ---------------- MEDUSA ---------------- */
  /* Cabeza de mujer con serpientes por pelo, cada una con su vida: se mecen,
   * miran y sacan la lengua. La boca es la suya, con dos colmillos. Q: la
   * MIRADA, un cono verde que petrifica lo que pilla. */
  DRAW.medusa = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.1), k;
    var ang = [0, 13, 24][fz] * Math.PI / 180;
    var piel = hex(mix(o.c, '#8fd67a', 0.55)), pielOsc = mix(piel, '#123018', 0.45);
    var sierpe = hex(mix(o.c, '#2f8f4a', 0.72)), sierpeOsc = mix(sierpe, '#07200f', 0.5);
    var mira = (q >= 0) ? Math.sin(Math.min(1, q * 1.8) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 5) * 0.16);

    /* las serpientes: siete, saliendo de la coronilla y de la nuca */
    var SIER = [[-1.2, 5.2, 1.0], [0.6, 5.6, 0.9], [2.0, 5.0, 0.8],
                [-3.0, 4.4, 0.95], [-4.2, 2.6, 0.85], [-2.4, 6.0, 0.7], [1.6, 6.2, 0.65]];
    SIER.forEach(function (s0, k2) {
      var w = Math.sin(t * 3.2 + k2 * 1.3) * 0.9;
      var lx = s0[0] - 2.2 - k2 * 0.25, ly = s0[1] + 2.4 + w;
      ctx.strokeStyle = sierpeOsc; ctx.lineWidth = 1.25 * s0[2]; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s0[0], s0[1]);
      ctx.quadraticCurveTo(s0[0] - 1.6, s0[1] + 1.8 + w * 0.5, lx, ly);
      ctx.stroke();
      ctx.strokeStyle = sierpe; ctx.lineWidth = 0.7 * s0[2]; ctx.stroke();
      /* la cabecita */
      ctx.fillStyle = sierpe;
      ctx.beginPath(); ctx.ellipse(lx, ly, 0.85 * s0[2], 0.6 * s0[2], w * 0.3, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.1); ctx.stroke();
      ctx.fillStyle = '#ffe14a';
      ctx.beginPath(); ctx.arc(lx - 0.3 * s0[2], ly - 0.12, 0.17 * s0[2], 0, Math.PI * 2); ctx.fill();
      /* la lengua, de vez en cuando */
      if (Math.sin(t * 4 + k2 * 2) > 0.7) {
        ctx.strokeStyle = '#ff5f8d'; ctx.lineWidth = 0.16;
        ctx.beginPath();
        ctx.moveTo(lx - 0.8 * s0[2], ly); ctx.lineTo(lx - 1.5 * s0[2], ly - 0.2);
        ctx.stroke();
      }
    });

    ctx.fillStyle = '#3d0f1c';
    ctx.beginPath(); ctx.moveTo(1.2, -0.7); ctx.lineTo(6.4, -0.4); ctx.lineTo(6.4, -3.4); ctx.lineTo(1.2, -1.6); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(6.4, 0.2);
    cabeza.quadraticCurveTo(6.6, 2.4, 4.8, 3.6);
    cabeza.quadraticCurveTo(2.4, 5.2, -0.6, 5.0);
    cabeza.quadraticCurveTo(-4.0, 4.6, -4.4, 1.4);
    cabeza.quadraticCurveTo(-4.6, -1.4, -2.0, -2.2);
    cabeza.lineTo(1.0, -0.9);
    cabeza.lineTo(6.4, 0.2);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(0.6, -1.0); mand.lineTo(6.4, -0.1);
    mand.quadraticCurveTo(6.2, -2.6, 3.8, -3.2);
    mand.quadraticCurveTo(0.6, -3.6, -1.6, -2.4);
    mand.closePath();
    rostro(ctx, cabeza, mand, 0.6, -1.0, ang, piel, hex(pielOsc), 0.7, 0.7);

    /* labios y colmillos */
    ctx.save(); girarSobre(ctx, 0.6, -1.0, -ang); ctx.clip(mand);
    ctx.fillStyle = '#c94a6a';
    ctx.beginPath(); ctx.ellipse(3.2, -1.9, 2.6, 0.8, 0.02, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    dientes(ctx, 2.0, 5.2, -0.3, 2, -1.0, '#fdfaf0');

    /* el ojo, y la mirada que petrifica */
    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(3.0, 1.9, 1.15, 1.0, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.3); ctx.stroke();
    ctx.fillStyle = mira > 0.1 ? '#b9ff6a' : '#ffe14a';
    ctx.beginPath(); ctx.arc(3.4, 1.85, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.ellipse(3.45, 1.85, 0.18, 0.55, 0, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.7, 2.3, 0.3, 0.9);
    contorno(ctx, 2.6);
    ctx.beginPath(); ctx.moveTo(1.5, 3.6); ctx.lineTo(4.3, 3.0); ctx.stroke();

    if (q >= 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createLinearGradient(4, 1.9, 18, 1.9);
      g.addColorStop(0, 'rgba(185,255,106,' + (0.7 * mira) + ')');
      g.addColorStop(1, 'rgba(120,220,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(4, 1.9);
      ctx.lineTo(17, 1.9 + 6 * mira);
      ctx.lineTo(17, 1.9 - 6 * mira);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      for (k = 0; k < 5; k++) {
        var u = (q * 1.6 + k / 5) % 1;
        ctx.fillStyle = 'rgba(150,160,150,' + ((1 - u) * mira * 0.9) + ')';
        ctx.fillRect(6 + u * 10, 1.9 + Math.sin(k * 2.1) * 4 * u - 0.5, 1.1, 1.1);
      }
    }
    ctx.restore();
  };

  /* ---------------- CÍCLOPE ---------------- */
  /* Bruto de un solo OJO enorme que ocupa media cara, ceja de una pieza,
   * dos colmillos de abajo y el pelo hecho un desastre. Q: el PISOTÓN, que
   * levanta el suelo. */
  DRAW.ciclope = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 0.9), k;
    var ang = [0, 16, 30][fz] * Math.PI / 180;
    var piel = hex(mix(o.c, '#c98a4a', 0.62)), pielOsc = mix(piel, '#3a1c06', 0.45);
    var pelo = '#2a1a10';
    var golpe = (q >= 0) ? Math.sin(Math.min(1, q * 2.4) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 5)) * 0.3 - 0.15 + golpe * 0.9);

    /* el pelo, tres mechones tiesos */
    [[-1.6, 5.0, 1.5], [0.4, 5.4, 1.3], [-3.2, 4.2, 1.2]].forEach(function (m, k2) {
      var w = Math.sin(t * 4 + k2) * 0.2;
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(m[0] - m[2], m[1] - 0.6);
        ctx.quadraticCurveTo(m[0] - 0.3 + w, m[1] + 2.6, m[0] + m[2] * 0.7 + w, m[1] + 0.3);
        ctx.closePath();
      }, pelo, '#120a05', 0.25, 0.25, 1.4);
    });

    ctx.fillStyle = '#3d1010';
    ctx.beginPath(); ctx.moveTo(0.6, -0.8); ctx.lineTo(6.0, -0.5); ctx.lineTo(6.0, -3.8); ctx.lineTo(0.6, -1.8); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(6.0, 0.4);
    cabeza.quadraticCurveTo(6.4, 3.0, 4.0, 4.4);
    cabeza.quadraticCurveTo(1.0, 5.8, -2.2, 5.0);
    cabeza.quadraticCurveTo(-5.4, 4.2, -5.4, 0.8);
    cabeza.quadraticCurveTo(-5.4, -2.4, -2.4, -2.8);
    cabeza.lineTo(0.4, -1.0);
    cabeza.lineTo(6.0, 0.4);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(-0.2, -1.1); mand.lineTo(6.0, 0.0);
    mand.quadraticCurveTo(5.8, -3.0, 3.2, -3.8);
    mand.quadraticCurveTo(-0.4, -4.4, -2.8, -3.0);
    mand.closePath();
    rostro(ctx, cabeza, mand, -0.2, -1.1, ang, piel, hex(pielOsc), 0.8, 0.8);

    /* el ojazo */
    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(1.9, 2.0, 2.5, 2.3, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.6); ctx.stroke();
    ctx.fillStyle = '#7a3d12';
    ctx.beginPath(); ctx.arc(2.5 + golpe * 0.3, 1.9, 1.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(2.6 + golpe * 0.3, 1.9, 0.72, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 1.6, 3.0, 0.55, 0.95);
    /* la ceja, de una pieza y con mala cara */
    contorno(ctx, 3.4);
    ctx.beginPath();
    ctx.moveTo(-1.0, 4.4); ctx.quadraticCurveTo(2.0, 5.4, 4.6, 3.6);
    ctx.stroke();

    /* dos colmillos de abajo, saliendo de la mandíbula */
    ctx.save(); girarSobre(ctx, -0.2, -1.1, -ang);
    dientes(ctx, 1.4, 4.6, -1.0, 2, 1.5, '#f0e6d2');
    ctx.restore();

    /* Q: el pisotón */
    if (q >= 0) {
      ctx.save();
      ctx.globalAlpha = golpe;
      for (k = 0; k < 3; k++) {
        var u = (q * 2 + k / 3) % 1;
        ctx.strokeStyle = 'rgba(196,166,126,' + ((1 - u) * golpe) + ')';
        ctx.lineWidth = 0.8 * (1 - u * 0.5);
        ctx.beginPath();
        ctx.ellipse(0, -6.5, 3 + u * 11, 1.2 + u * 3.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (k = 0; k < 7; k++) {
        var uu = tramoSimple(q, 0.05 + k * 0.03);
        ctx.fillStyle = 'rgba(160,132,96,' + ((1 - uu) * golpe) + ')';
        ctx.beginPath();
        ctx.arc((k - 3) * 2.6, -6.5 - uu * 4, 0.7 + uu * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  };
  function tramoSimple(q, a) { return Math.max(0, Math.min(1, (q - a) / 0.6)); }

  /* ---------------- FÉNIX ---------------- */
  /* Ave de fuego: cuerpo de brasa, plumas que arden y una cresta de llamas.
   * El pico es la boca. Q: ARDE ENTERO y renace de sus cenizas. */
  DRAW.fenix = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.3), k;
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var brasa = hex(mix(o.c, '#ff6a1a', 0.62)), brasaOsc = mix(brasa, '#4a0d02', 0.42);
    var pico = '#ffd24a', picoOsc = '#a97d0d';
    var arde = (q >= 0) ? Math.sin(Math.min(1, q * 1.4) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 4) * 0.35);

    /* la cola de fuego, por detrás */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (k = 0; k < 5; k++) {
      var w = Math.sin(t * 6 + k * 0.9) * 1.4;
      var largo = 5 + k * 1.6 + arde * 5;
      var g = ctx.createLinearGradient(-2, 0, -2 - largo, w);
      g.addColorStop(0, mix('#ffd24a', '#ff3b0a', 0.3, 0.85));
      g.addColorStop(1, mix('#ff3b0a', '#ff3b0a', 0, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-2, 1.8 - k * 0.9);
      ctx.quadraticCurveTo(-4 - largo * 0.5, 2.4 - k * 1.0 + w, -2 - largo, w - k * 0.6);
      ctx.quadraticCurveTo(-4 - largo * 0.4, 0.6 - k * 1.2 + w, -2, 0.6 - k * 0.9);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    /* las alas, batiendo */
    var bate = Math.sin(t * 7) * 0.8 + arde * 2.5;
    [1, -1].forEach(function (lado) {
      if (lado < 0 && arde < 0.1) return;
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(-0.6, lado * 1.2);
        ctx.quadraticCurveTo(-4.4, lado * (3.4 + bate), -7.4, lado * (1.2 + bate * 1.6));
        ctx.quadraticCurveTo(-4.6, lado * (-1.4 + bate * 0.4), -0.6, lado * -1.6);
        ctx.closePath();
      }, brasa, hex(brasaOsc), 0.5, 0.5, 1.5);
    });

    ctx.fillStyle = '#4a1002';
    ctx.beginPath(); ctx.moveTo(1.6, -0.7); ctx.lineTo(7.4, -0.4); ctx.lineTo(7.4, -3.0); ctx.lineTo(1.6, -1.5); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(7.4, 0.8);
    cabeza.quadraticCurveTo(7.0, 2.0, 5.2, 2.2);
    cabeza.quadraticCurveTo(3.0, 2.6, 1.6, 4.0);
    cabeza.quadraticCurveTo(-0.6, 5.6, -3.2, 4.6);
    cabeza.quadraticCurveTo(-5.6, 3.4, -5.0, 0.4);
    cabeza.quadraticCurveTo(-4.4, -2.0, -1.4, -2.0);
    cabeza.lineTo(1.4, -0.9);
    cabeza.lineTo(7.4, 0.8);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(1.2, -1.0); mand.lineTo(7.4, -0.2);
    mand.quadraticCurveTo(6.4, -2.2, 4.0, -2.6);
    mand.quadraticCurveTo(1.0, -2.8, -0.6, -1.8);
    mand.closePath();
    rostro(ctx, cabeza, mand, 1.2, -1.0, ang, brasa, hex(brasaOsc), 0.7, 0.7);

    /* el pico, de oro */
    ctx.save(); ctx.clip(cabeza);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(4.4, 1.8);
      ctx.quadraticCurveTo(7.6, 1.6, 7.8, 0.6);
      ctx.lineTo(4.6, -0.6);
      ctx.closePath();
    }, pico, picoOsc, 0.3, 0.3, 1.4);
    ctx.restore();

    /* la cresta de llamas */
    for (k = 0; k < 4; k++) {
      var h = 1.6 + Math.abs(Math.sin(t * 8 + k * 1.3)) * 1.5 + arde * 1.6;
      ctx.fillStyle = mix('#ffd24a', '#ff3b0a', k / 4, 0.92);
      ctx.beginPath();
      ctx.moveTo(-1.0 + k * 1.3, 4.2);
      ctx.quadraticCurveTo(-0.4 + k * 1.3, 4.2 + h, -1.6 + k * 1.3, 4.2 + h * 1.4);
      ctx.quadraticCurveTo(-2.4 + k * 1.3, 4.2 + h * 0.5, -1.0 + k * 1.3, 4.2);
      ctx.closePath(); ctx.fill();
    }

    ctx.fillStyle = '#fff6d0';
    ctx.beginPath(); ctx.arc(3.2, 1.6, 0.85, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(3.5, 1.55, 0.42, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.7, 1.95, 0.26, 0.95);

    /* Q: arde entero */
    if (q >= 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gf = ctx.createRadialGradient(0, 1, 1, 0, 1, 9 + arde * 6);
      gf.addColorStop(0, 'rgba(255,240,180,' + (0.55 * arde) + ')');
      gf.addColorStop(0.5, 'rgba(255,140,30,' + (0.4 * arde) + ')');
      gf.addColorStop(1, 'rgba(255,60,10,0)');
      ctx.fillStyle = gf;
      ctx.beginPath(); ctx.arc(0, 1, 9 + arde * 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      for (k = 0; k < 9; k++) {
        var u = (q * 1.4 + k / 9) % 1;
        ctx.fillStyle = mix('#ffd24a', '#ff3b0a', u, (1 - u) * arde);
        ctx.beginPath();
        ctx.arc(Math.sin(k * 2.3) * 7 * u, 1 + u * 9, 0.7 * (1 - u * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ---------------- GENIO ---------------- */
  /* De la lámpara: turbante con su joya, barba en punta, brazos cruzados y
   * de cintura para abajo una COLA DE HUMO que sale de la lámpara. Q: te
   * concede el deseo, con la lámpara echando chispas doradas. */
  DRAW.genio = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.2), k;
    var ang = [0, 13, 24][fz] * Math.PI / 180;
    var piel = hex(mix(o.c, '#4aa8d8', 0.66)), pielOsc = mix(piel, '#062035', 0.45);
    var tela = '#e8e0cc', telaOsc = '#b0a688', oro = '#ffd24a';
    var deseo = (q >= 0) ? Math.sin(Math.min(1, q * 1.5) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 3.4) * 0.4);

    /* la cola de humo, de la lámpara a la cintura */
    ctx.save();
    for (k = 6; k >= 0; k--) {
      var u = k / 6;
      var w = Math.sin(t * 2.6 + u * 4) * (0.8 + u * 1.6);
      ctx.fillStyle = mix(piel, '#0a1a2a', u * 0.55, 0.85 - u * 0.45);
      ctx.beginPath();
      ctx.ellipse(-2.0 - u * 4.5 + w * 0.4, -2.0 - u * 2.6, 2.6 - u * 1.7, 1.9 - u * 1.2,
        0.3 + u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    /* la lámpara, al final del humo */
    var lx = -7.8, ly = -5.6;
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.ellipse(lx, ly, 2.0, 1.1, -0.15, 0, Math.PI * 2);
    }, oro, '#a97d0d', 0.25, 0.25, 1.4);
    ctx.strokeStyle = '#a97d0d'; ctx.lineWidth = 0.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lx + 1.7, ly + 0.2); ctx.lineTo(lx + 3.2, ly + 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(lx - 2.2, ly - 0.2, 0.8, -0.6, 1.9); ctx.stroke();

    ctx.fillStyle = '#2a0a1c';
    ctx.beginPath(); ctx.moveTo(1.0, -0.7); ctx.lineTo(5.8, -0.4); ctx.lineTo(5.8, -3.0); ctx.lineTo(1.0, -1.6); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(5.8, 0.6);
    cabeza.quadraticCurveTo(5.8, 2.6, 3.8, 3.4);
    cabeza.quadraticCurveTo(1.0, 4.4, -1.6, 3.6);
    cabeza.quadraticCurveTo(-3.8, 2.8, -3.6, 0.6);
    cabeza.quadraticCurveTo(-3.4, -1.4, -1.0, -1.8);
    cabeza.lineTo(0.8, -0.9);
    cabeza.lineTo(5.8, 0.6);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(0.6, -1.0); mand.lineTo(5.8, -0.1);
    mand.quadraticCurveTo(5.4, -2.4, 3.0, -2.9);
    mand.quadraticCurveTo(0.2, -3.2, -1.4, -2.0);
    mand.closePath();
    rostro(ctx, cabeza, mand, 0.6, -1.0, ang, piel, hex(pielOsc), 0.7, 0.7);

    /* la barba en punta, colgando de la mandíbula */
    ctx.save(); girarSobre(ctx, 0.6, -1.0, -ang);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(0.4, -2.2);
      ctx.quadraticCurveTo(2.2, -3.0, 3.4, -2.4);
      ctx.quadraticCurveTo(2.6, -5.6, 1.4, -6.6);
      ctx.quadraticCurveTo(0.2, -4.6, 0.4, -2.2);
      ctx.closePath();
    }, hex(pielOsc), '#06131f', 0.3, 0.3, 1.3);
    ctx.restore();

    /* el turbante */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-3.6, 2.8);
      ctx.quadraticCurveTo(-3.2, 6.6, 0.6, 6.8);
      ctx.quadraticCurveTo(4.6, 6.6, 4.8, 3.4);
      ctx.quadraticCurveTo(1.0, 2.0, -3.6, 2.8);
      ctx.closePath();
    }, tela, telaOsc, 0.5, 0.5, 1.6);
    ctx.strokeStyle = telaOsc; ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(-3.3, 3.4); ctx.quadraticCurveTo(0.8, 2.6, 4.5, 3.9);
    ctx.stroke();
    /* la joya del turbante y su plumita */
    ctx.fillStyle = oro;
    ctx.beginPath(); ctx.arc(2.2, 5.6, 0.7, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.1); ctx.stroke();
    ctx.fillStyle = '#e8355c';
    ctx.beginPath(); ctx.arc(2.2, 5.6, 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = tela; ctx.lineWidth = 0.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2.2, 6.3);
    ctx.quadraticCurveTo(1.2 + Math.sin(t * 4) * 0.4, 8.2, 3.0, 9.0);
    ctx.stroke();

    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(2.4, 1.6, 1.0, 0.85, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(2.75, 1.55, 0.44, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.0, 1.9, 0.25, 0.9);

    /* Q: el deseo concedido */
    if (q >= 0) {
      for (k = 0; k < 10; k++) {
        var u2 = (q * 1.5 + k / 10) % 1;
        var a2 = k * 0.628;
        estrella4(ctx,
          lx + Math.cos(a2) * u2 * 12,
          ly + Math.sin(a2) * u2 * 9,
          0.8 * (1 - u2) + 0.2, oro, (1 - u2) * deseo);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gl = ctx.createRadialGradient(lx, ly, 0.4, lx, ly, 4 + deseo * 8);
      gl.addColorStop(0, 'rgba(255,230,150,' + (0.7 * deseo) + ')');
      gl.addColorStop(1, 'rgba(255,190,60,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(lx, ly, 4 + deseo * 8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  /* ---------------- GOLEM ---------------- */
  /* Un pedrusco con cara: bloques de piedra mal encajados, grietas que
   * brillan por dentro y la RUNA de la frente, que es lo que lo mantiene
   * vivo. Q: se endurece, la runa arde y le salen placas. */
  DRAW.golem = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.1), k;
    var ang = [0, 15, 28][fz] * Math.PI / 180;
    var roca = hex(mix('#6b6f78', o.c, 0.16)), rocaOsc = mix(roca, '#14161b', 0.5);
    var brillo = hex(mix(o.c, '#ff8c1a', 0.5));
    var duro = (q >= 0) ? Math.sin(Math.min(1, q * 1.6) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 4.5)) * 0.22 - 0.1);

    ctx.fillStyle = '#08090c';
    ctx.beginPath(); ctx.moveTo(-2.4, -0.8); ctx.lineTo(5.4, -0.5); ctx.lineTo(5.4, -4.0); ctx.lineTo(-2.4, -2.2); ctx.closePath(); ctx.fill();

    /* la cabeza, a cantos rectos: es piedra partida */
    var cabeza = new Path2D();
    cabeza.moveTo(5.6, -0.4);
    cabeza.lineTo(6.0, 2.2);
    cabeza.lineTo(4.4, 4.4);
    cabeza.lineTo(1.6, 5.6);
    cabeza.lineTo(-2.2, 5.0);
    cabeza.lineTo(-4.8, 2.8);
    cabeza.lineTo(-5.0, -0.2);
    cabeza.lineTo(-3.0, -1.0);
    cabeza.lineTo(5.6, -0.4);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(-3.2, -1.2);
    mand.lineTo(5.6, -0.6);
    mand.lineTo(5.0, -3.6);
    mand.lineTo(1.8, -4.8);
    mand.lineTo(-2.0, -4.4);
    mand.lineTo(-3.6, -2.6);
    mand.closePath();
    rostro(ctx, cabeza, mand, -3.2, -1.1, ang, roca, hex(rocaOsc), 0.8, 0.8);

    /* las grietas, encendidas por dentro */
    ctx.save(); ctx.clip(cabeza);
    ctx.strokeStyle = mix(brillo, '#ffffff', 0.2, 0.55 + 0.45 * Math.abs(Math.sin(t * 2)) + duro * 0.4);
    ctx.lineWidth = 0.42; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4.4, 1.2); ctx.lineTo(-2.0, 2.0); ctx.lineTo(-2.6, 4.2);
    ctx.moveTo(-2.0, 2.0); ctx.lineTo(0.6, 0.6);
    ctx.moveTo(4.8, 3.2); ctx.lineTo(3.2, 1.4);
    ctx.stroke();
    /* cantos más claros, para que se vean los bloques */
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(-1.0, 5.2); ctx.lineTo(-0.6, 0.0);
    ctx.moveTo(2.6, 5.2); ctx.lineTo(2.2, 0.2);
    ctx.stroke();
    ctx.restore();

    /* la runa de la frente */
    ctx.save();
    ctx.translate(1.0, 3.9);
    var lum = 0.5 + 0.5 * Math.abs(Math.sin(t * 2.2)) + duro;
    ctx.strokeStyle = mix(brillo, '#ffffff', 0.35, Math.min(1, lum));
    ctx.lineWidth = 0.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.9, -0.9); ctx.lineTo(0.9, -0.9); ctx.lineTo(-0.9, 0.9); ctx.lineTo(0.9, 0.9);
    ctx.moveTo(0, -1.3); ctx.lineTo(0, 1.3);
    ctx.stroke();
    ctx.restore();

    /* los ojos, dos huecos encendidos */
    [[1.4, 1.6], [3.8, 1.3]].forEach(function (e) {
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.ellipse(e[0], e[1], 0.85, 0.65, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mix(brillo, '#ffffff', 0.4, 0.8 + duro * 0.2);
      ctx.beginPath(); ctx.ellipse(e[0] + 0.15, e[1], 0.42, 0.34, 0, 0, Math.PI * 2); ctx.fill();
    });

    /* dientes de piedra */
    ctx.save(); girarSobre(ctx, -3.2, -1.1, -ang);
    dientes(ctx, -1.2, 4.6, -1.1, 4, 1.2, hex(rocaOsc));
    ctx.restore();

    /* Q: se endurece, le salen placas */
    if (q >= 0) {
      for (k = 0; k < 6; k++) {
        var a3 = k * 1.05 + 0.4;
        var d = 5.5 + duro * 2.2;
        ctx.save();
        ctx.globalAlpha = duro;
        ctx.translate(Math.cos(a3) * d, 1 + Math.sin(a3) * d * 0.8);
        ctx.rotate(a3);
        piezaX(ctx, function () {
          ctx.beginPath();
          ctx.moveTo(-1.2, -0.9); ctx.lineTo(1.2, -1.2); ctx.lineTo(1.0, 1.0); ctx.lineTo(-1.1, 0.8);
          ctx.closePath();
        }, roca, hex(rocaOsc), 0.2, 0.2, 1.2);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };
