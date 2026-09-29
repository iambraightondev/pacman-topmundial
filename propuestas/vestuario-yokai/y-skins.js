  /* =====================================================================
   * TANDA YŌKAI (29 sep). Diez skins del folclore japonés —Pac-Man nació en
   * Japón—: dejan la silueta de Pac-Man, cada una come a su manera, tiene su
   * Q y su muerte. Siete de tienda y tres de cofre (KITSUNE, ONI y
   * MANEKI-NEKO).
   * ===================================================================== */

  /* Fuego fatuo (kitsunebi / onibi): llama azul con su halo. `dir` = 1 en el
   * marco del cuerpo (s hacia arriba), -1 en pantalla (y hacia abajo). */
  function llamaAzul(ctx, x, y, s, alpha, t, dir) {
    if (alpha <= 0 || s <= 0) return;
    var d = dir || 1, w = Math.sin(t * 9 + x * 1.7) * 0.25 * s;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0.1, x, y, s * 2.6);
    g.addColorStop(0, 'rgba(150,215,255,.7)');
    g.addColorStop(1, 'rgba(60,140,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, s * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    /* una lengua: base redonda y la punta que ondea, más una lengüecilla al
     * lado para que no parezca una gota */
    function lengua(cx, k, punta, ww) {
      ctx.beginPath();
      ctx.moveTo(cx + ww, y + d * k * punta);
      ctx.bezierCurveTo(cx + k * 0.2 + ww * 0.5, y + d * k * 1.0, cx + k * 1.0, y + d * k * 0.5, cx + k * 0.9, y - d * k * 0.3);
      ctx.arc(cx, y - d * k * 0.3, k * 0.9, 0, Math.PI, d > 0);
      ctx.bezierCurveTo(cx - k * 1.0, y + d * k * 0.6, cx - k * 0.1 + ww * 0.5, y + d * k * 1.2, cx + ww, y + d * k * punta);
      ctx.fill();
    }
    var w2 = Math.sin(t * 11 + x) * 0.3 * s;
    [[1, '#2f7dff'], [0.72, '#6fc8ff'], [0.4, '#eaffff']].forEach(function (capa) {
      var k = capa[0] * s;
      ctx.fillStyle = capa[1];
      lengua(x, k, 3.1, w * 1.8);
      if (capa[0] > 0.5) lengua(x + s * 0.55, k * 0.55, 2.2, w2);
      if (capa[0] > 0.5) lengua(x - s * 0.5, k * 0.5, 2.0, -w2);
    });
    ctx.restore();
  }

  /* Nube de humo del "doron": el puf de los cambios de forma */
  function humoPuf(ctx, x, y, u, alpha, r0) {
    if (alpha <= 0) return;
    var r = (r0 || 5) * (0.35 + u * 0.75);
    ctx.save();
    var P = [[0, 0, 1], [0.9, 0.35, 0.7], [-0.9, 0.3, 0.72], [0.45, 0.85, 0.66],
             [-0.5, 0.85, 0.62], [0.6, -0.6, 0.6], [-0.6, -0.6, 0.62], [0, -0.9, 0.55]];
    ctx.strokeStyle = 'rgba(90,86,110,' + (0.85 * alpha * alpha * alpha) + ')'; ctx.lineWidth = 0.5;
    P.forEach(function (p) {
      ctx.beginPath(); ctx.arc(x + p[0] * r, y + p[1] * r, p[2] * r * 0.62, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.globalAlpha = Math.min(1, alpha);
    P.forEach(function (p, i) {
      ctx.fillStyle = i % 2 ? '#e4e0ee' : '#f6f4fb';
      ctx.beginPath(); ctx.arc(x + p[0] * r, y + p[1] * r, p[2] * r * 0.62, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  /* ---------------- KITSUNE (cofre) ---------------- */
  /* Zorra de cinco colas con la cara de las máscaras de Inari: hocico largo,
   * mejillas blancas, rayas bermellón y ojo rasgado. Un fuego fatuo le
   * sigue. Q: el KITSUNEBI, un corro de fuegos azules que la rodea. */
  var COLAS_KITSUNE = [214, 187, 160, 133, 106];
  DRAW.kitsune = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.3), k;
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var pelo = hex(mix('#f2a444', o.c, 0.15)), punta = hex(mix(o.c, '#ffffff', 0.35)), peloOsc = mix(pelo, '#4a1a02', 0.45);
    var blanco = '#fbf6ec', bermellon = '#e0322a';
    var fuego = (q >= 0) ? Math.sin(Math.min(1, q * 1.2) * Math.PI) : 0;
    var colas = (o.colas == null) ? 5 : o.colas;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 5) * 0.2);

    /* las colas, en abanico por detrás; en la Q se abren más */
    /* de fuera adentro, así la del medio queda encima; cada cola gorda,
     * curvada como una llama y con la punta del color del jugador */
    [0, 4, 1, 3, 2].forEach(function (k) {
      if (k >= colas) return;
      var a = COLAS_KITSUNE[k] * Math.PI / 180 + Math.sin(t * 3 + k * 0.9) * 0.1 + fuego * 0.12 * (k - 2);
      var L = 8.8 - Math.abs(k - 2) * 0.5, b = (k - 2) * 0.45 + Math.sin(t * 4 + k) * 0.3;
      ctx.save();
      ctx.translate(-3.0, -0.4);
      ctx.rotate(a);
      var cola = function () {
        ctx.beginPath();
        ctx.moveTo(0, -0.9);
        ctx.bezierCurveTo(L * 0.35, -3.0, L * 0.8, -2.2, L, b + 0.4);
        ctx.bezierCurveTo(L * 0.72, 0.6 + b * 0.3, L * 0.8, 1.2, L * 0.6, 1.9);
        ctx.bezierCurveTo(L * 0.4, 2.5, L * 0.2, 1.7, 0, 0.9);
        ctx.closePath();
      };
      var claro = (k % 2) ? pelo : hex(mix(pelo, '#ffffff', 0.18));
      piezaX(ctx, cola, claro, hex(peloOsc), 0.35, 0.35, 1.4);
      ctx.save(); cola(); ctx.clip();
      ctx.fillStyle = blanco;
      ctx.beginPath(); ctx.ellipse(L, b * 0.6, L * 0.3, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = punta;
      ctx.beginPath(); ctx.ellipse(L + 0.4, b * 0.7, L * 0.14, 3, 0, 0, Math.PI * 2); ctx.fill();
      /* un par de mechones de pelo */
      ctx.strokeStyle = hex(peloOsc); ctx.lineWidth = 0.22;
      ctx.beginPath();
      ctx.moveTo(L * 0.3, -0.6); ctx.quadraticCurveTo(L * 0.45, -0.2, L * 0.55, -0.9);
      ctx.moveTo(L * 0.25, 0.8); ctx.quadraticCurveTo(L * 0.4, 1.0, L * 0.45, 0.5);
      ctx.stroke();
      ctx.restore();
      cola(); contorno(ctx, 1.4); ctx.stroke();
      ctx.restore();
    });
    /* el fuego fatuo que la acompaña */
    if (!o.sinFuego && q < 0) llamaAzul(ctx, -7.4, 8.0 + Math.sin(t * 2.4) * 0.6, 0.85, 0.95, t, 1);

    /* las orejas, la de atrás más oscura */
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.moveTo(-3.8, 3.4); ctx.lineTo(-3.4, 8.0); ctx.lineTo(-1.2, 4.0); ctx.closePath();
    }, hex(peloOsc), hex(mix(hex(peloOsc), '#000000', 0.3)), 0.2, 0.2, 1.4);
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.moveTo(-2.4, 3.8); ctx.lineTo(-0.4, 8.8); ctx.lineTo(1.4, 4.2); ctx.closePath();
    }, pelo, hex(peloOsc), 0.3, 0.3, 1.4);
    ctx.fillStyle = '#3a1208';
    ctx.beginPath(); ctx.moveTo(-1.5, 4.5); ctx.lineTo(-0.5, 7.4); ctx.lineTo(0.6, 4.6); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#3a0e06';
    ctx.beginPath(); ctx.moveTo(0.4, -0.7); ctx.lineTo(7.0, -0.3); ctx.lineTo(7.0, -2.8); ctx.lineTo(0.4, -1.7); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(7.6, -0.2);
    cabeza.quadraticCurveTo(7.8, 0.9, 6.8, 1.2);
    cabeza.quadraticCurveTo(4.4, 1.8, 2.6, 3.2);
    cabeza.quadraticCurveTo(1.0, 4.6, -1.4, 4.6);
    cabeza.quadraticCurveTo(-4.4, 4.4, -4.6, 1.4);
    cabeza.quadraticCurveTo(-4.8, -1.2, -2.6, -2.0);
    cabeza.lineTo(0.2, -0.9);
    cabeza.lineTo(7.6, -0.2);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(0.0, -0.95); mand.lineTo(7.0, -0.35);
    mand.quadraticCurveTo(6.6, -1.6, 4.4, -1.9);
    mand.quadraticCurveTo(1.6, -2.4, -0.6, -3.0);
    mand.quadraticCurveTo(-2.0, -3.2, -2.8, -2.1);
    mand.closePath();
    rostro(ctx, cabeza, mand, 0.2, -0.9, ang, pelo, hex(peloOsc), 0.7, 0.7);

    /* el blanco del hocico y de la quijada */
    ctx.save(); ctx.clip(cabeza);
    ctx.fillStyle = blanco;
    ctx.beginPath(); ctx.ellipse(4.6, -0.2, 3.6, 1.35, 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-2.6, -1.4, 1.8, 1.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save(); girarSobre(ctx, 0.2, -0.9, -ang); ctx.clip(mand);
    ctx.fillStyle = blanco; ctx.fillRect(-4, -4, 12, 4);
    ctx.fillStyle = 'rgba(120,100,80,.35)';
    ctx.beginPath(); ctx.ellipse(2.4, -3.0, 4.0, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* el blanco se come medio contorno: se repasa */
    contorno(ctx, 1.6);
    ctx.stroke(cabeza);
    ctx.save(); girarSobre(ctx, 0.2, -0.9, -ang); ctx.stroke(mand); ctx.restore();

    /* la trufa */
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.ellipse(7.3, 0.55, 0.6, 0.42, 0, 0, Math.PI * 2); ctx.fill();

    /* las rayas bermellón de Inari */
    ctx.strokeStyle = bermellon; ctx.lineCap = 'round';
    ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(2.2, 3.3); ctx.quadraticCurveTo(0.6, 4.2, -1.0, 3.7); ctx.stroke();
    ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-0.4, 2.6); ctx.quadraticCurveTo(-1.6, 2.6, -2.4, 1.8); ctx.stroke();

    /* el ojo rasgado, dorado, con la raya que se alarga hacia atrás */
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.moveTo(1.9, 1.7);
    ctx.quadraticCurveTo(3.0, 2.9, 4.4, 2.6);
    ctx.quadraticCurveTo(3.4, 1.5, 1.9, 1.7);
    ctx.closePath(); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.ellipse(3.4, 2.15, 0.17, 0.42, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = bermellon; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(1.9, 1.75); ctx.lineTo(0.7, 2.3); ctx.stroke();

    /* Q: el corro de fuegos fatuos */
    if (q >= 0) {
      var rr = 4 + fuego * 6;
      for (k = 0; k < 6; k++) {
        var a2 = k * Math.PI / 3 + q * 5;
        llamaAzul(ctx, Math.cos(a2) * rr * 1.1, 1 + Math.sin(a2) * rr * 0.9,
          0.5 + fuego * 0.6, fuego, t + k, 1);
      }
    }
    ctx.restore();
  };

  /* ---------------- TENGU ---------------- */
  /* El duende de la montaña: cara roja con la NARIZ larguísima, cejas y
   * melena blancas, el tokin negro en la frente y el abanico de plumas en
   * la mano. Q: el ABANICAZO, que suelta remolinos de viento. */
  function abanicoTengu(ctx, ang) {
    ctx.save();
    ctx.rotate(ang);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2.4, 0); ctx.stroke();
    for (var k = -3; k <= 3; k++) {
      ctx.save();
      ctx.translate(2.2, 0);
      ctx.rotate(k * 0.26);
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(1.6, 1.3, 4.0, 0.5);
        ctx.quadraticCurveTo(4.5, 0, 4.0, -0.5);
        ctx.quadraticCurveTo(1.6, -1.3, 0, 0);
        ctx.closePath();
      }, k % 2 ? '#8a6444' : '#a8805c', '#4e3420', 0.15, 0.15, 1.0);
      ctx.restore();
    }
    ctx.fillStyle = '#e0322a';
    ctx.beginPath(); ctx.arc(2.3, 0, 0.55, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
    ctx.restore();
  }
  DRAW.tengu = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0), k;
    var ang = [0, 13, 24][fz] * Math.PI / 180;
    var rojo = hex(mix('#e0302a', o.c, 0.12)), rojoOsc = mix(rojo, '#3a0404', 0.45);
    var canas = '#f4f0e6', canasOsc = '#b8b0a0';
    var sopla = (q >= 0) ? Math.sin(Math.min(1, q * 1.15) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 4.4) * 0.2);

    /* el abanico, en la mano, por detrás */
    if (q < 0) {
      ctx.save(); ctx.translate(-3.4, -3.4); abanicoTengu(ctx, 3.75 + Math.sin(t * 3) * 0.12); ctx.restore();
    }

    /* la melena blanca, hacia atrás */
    var w = Math.sin(t * 5) * 0.3;
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-0.6, 4.6);
      ctx.quadraticCurveTo(-4.6, 6.2, -7.4, 3.2 + w);
      ctx.lineTo(-6.0, 2.6);
      ctx.quadraticCurveTo(-7.8, 0.6 + w, -6.6, -1.6);
      ctx.lineTo(-5.4, -0.8);
      ctx.quadraticCurveTo(-5.2, -2.6, -3.0, -2.8);
      ctx.lineTo(-2.0, 0);
      ctx.closePath();
    }, canas, canasOsc, 0.4, 0.4, 1.5);

    ctx.fillStyle = '#3a0606';
    ctx.beginPath(); ctx.moveTo(0.4, -0.7); ctx.lineTo(5.6, -0.3); ctx.lineTo(5.6, -3.0); ctx.lineTo(0.4, -1.6); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(5.8, 0.0);
    cabeza.quadraticCurveTo(6.0, 2.6, 4.0, 3.8);
    cabeza.quadraticCurveTo(1.4, 5.0, -1.2, 4.4);
    cabeza.quadraticCurveTo(-3.6, 3.6, -3.6, 0.8);
    cabeza.quadraticCurveTo(-3.6, -1.4, -1.4, -1.8);
    cabeza.lineTo(0.2, -0.9);
    cabeza.lineTo(5.8, 0.0);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(0.0, -0.95); mand.lineTo(5.6, -0.2);
    mand.quadraticCurveTo(5.2, -2.4, 3.0, -2.8);
    mand.quadraticCurveTo(0.4, -3.0, -1.2, -2.0);
    mand.closePath();
    rostro(ctx, cabeza, mand, 0.2, -0.9, ang, rojo, hex(rojoOsc), 0.7, 0.7);

    /* la barba blanca, colgando de la mandíbula */
    ctx.save(); girarSobre(ctx, 0.2, -0.9, -ang);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-1.0, -2.0);
      ctx.quadraticCurveTo(1.6, -2.7, 4.4, -2.4);
      ctx.quadraticCurveTo(3.4, -4.2, 2.2, -6.0 + w);
      ctx.quadraticCurveTo(1.4, -4.8, 0.6, -5.4 + w);
      ctx.quadraticCurveTo(0.0, -3.8, -1.0, -2.0);
      ctx.closePath();
    }, canas, canasOsc, 0.3, 0.3, 1.3);
    ctx.restore();

    /* la narizota */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(3.4, 2.7);
      ctx.quadraticCurveTo(7.0, 2.8, 10.0, 2.1);
      ctx.quadraticCurveTo(10.8, 1.7, 10.1, 1.1);
      ctx.quadraticCurveTo(7.0, 0.5, 3.8, 0.4);
      ctx.closePath();
    }, rojo, hex(rojoOsc), 0.3, 0.35, 1.5);
    destello(ctx, 8.4, 2.1, 0.3, 0.7);

    /* el ojo, con la ceja blanca y poblada */
    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(1.8, 2.5, 1.0, 0.72, 0.1, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    ctx.fillStyle = '#c98a1a';
    ctx.beginPath(); ctx.arc(2.2, 2.5, 0.48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(2.3, 2.5, 0.24, 0, Math.PI * 2); ctx.fill();
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(0.0, 3.3);
      ctx.quadraticCurveTo(1.8, 4.6, 3.9, 3.3);
      ctx.lineTo(3.2, 3.0);
      ctx.lineTo(2.6, 3.4);
      ctx.lineTo(1.9, 3.0);
      ctx.lineTo(1.2, 3.4);
      ctx.quadraticCurveTo(0.6, 3.0, 0.0, 3.3);
      ctx.closePath();
    }, canas, canasOsc, 0.15, 0.15, 1.2);

    /* el tokin, la cajita negra de la frente, con su cordón */
    ctx.save();
    ctx.translate(1.6, 4.9);
    ctx.rotate(-0.35);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-1.2, -0.5); ctx.lineTo(1.2, -0.5); ctx.lineTo(1.0, 0.9);
      ctx.lineTo(0, 1.4); ctx.lineTo(-1.0, 0.9); ctx.closePath();
    }, hex(mix(o.c, '#1a1a22', 0.6)), '#101014', 0.2, 0.2, 1.2);
    ctx.restore();
    ctx.strokeStyle = '#f2f0e6'; ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(0.6, 4.3); ctx.quadraticCurveTo(-0.6, 3.2, -1.2, 1.2); ctx.stroke();

    /* Q: el abanicazo por delante y los remolinos */
    if (q >= 0) {
      /* el abanico barre por debajo de la barba, de atrás adelante */
      var giro = -2.3 + suave(Math.min(1, q * 2.2)) * 2.5;
      ctx.save(); ctx.translate(2.4, -4.4); abanicoTengu(ctx, giro); ctx.restore();
      ctx.lineCap = 'round';
      for (k = 0; k < 3; k++) {
        var u = (q * 1.5 + k / 3) % 1;
        var gx = 8 + u * 11, gy = -3.2 + k * 2.6;
        ctx.strokeStyle = 'rgba(235,245,255,' + ((1 - u) * sopla) + ')';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(gx - 4 - u * 2, gy);
        ctx.lineTo(gx, gy);
        ctx.arc(gx, gy + 0.9 + u * 0.6, 0.9 + u * 0.6, -Math.PI / 2, Math.PI * 1.1, false);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  /* ---------------- KAPPA ---------------- */
  /* El diablillo del río: pico amarillo, caparazón de tortuga a la espalda,
   * flequillo de tazón y el PLATO de agua en la coronilla, con el agua
   * meneándose. Q: escupe un CHORRO de agua por delante. */
  DRAW.kappa = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0), k;
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var verde = hex(mix(o.c, '#46b45e', 0.62)), verdeOsc = mix(verde, '#062a10', 0.5);
    var pico = '#f2c230', picoOsc = '#9a7410';
    var concha = '#8a6a3a', conchaOsc = '#3e2c14';
    var agua = (o.agua == null) ? 1 : o.agua;
    var escupe = (q >= 0) ? Math.sin(Math.min(1, q * 1.2) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 5)) * 0.3 - 0.15);

    /* el caparazón, a la espalda */
    var caparazon = function () {
      ctx.beginPath();
      ctx.moveTo(-2.0, 3.6);
      ctx.quadraticCurveTo(-7.8, 4.0, -7.8, -0.8);
      ctx.quadraticCurveTo(-7.4, -5.0, -2.2, -4.6);
      ctx.closePath();
    };
    piezaX(ctx, caparazon, concha, conchaOsc, 0.5, 0.5, 1.6);
    ctx.save(); caparazon(); ctx.clip();
    ctx.strokeStyle = conchaOsc; ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(-6.6, 2.2); ctx.lineTo(-4.6, 1.2); ctx.lineTo(-4.8, -1.6); ctx.lineTo(-6.8, -2.6);
    ctx.moveTo(-4.6, 1.2); ctx.lineTo(-2.6, 2.0);
    ctx.moveTo(-4.8, -1.6); ctx.lineTo(-2.6, -2.4);
    ctx.stroke();
    ctx.strokeStyle = '#c8a870'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(-7.4, 0.4); ctx.quadraticCurveTo(-7.0, -3.8, -2.4, -4.2); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#12301a';
    ctx.beginPath(); ctx.moveTo(0.6, -0.7); ctx.lineTo(6.8, -0.3); ctx.lineTo(6.8, -2.8); ctx.lineTo(0.6, -1.6); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(5.8, 0.0);
    cabeza.quadraticCurveTo(5.8, 2.8, 3.6, 3.9);
    cabeza.quadraticCurveTo(0.8, 5.0, -1.6, 4.2);
    cabeza.quadraticCurveTo(-3.8, 3.2, -3.6, 0.6);
    cabeza.quadraticCurveTo(-3.4, -1.6, -1.2, -1.8);
    cabeza.lineTo(0.4, -0.9);
    cabeza.lineTo(5.8, 0.0);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(0.2, -0.95); mand.lineTo(5.6, -0.2);
    mand.quadraticCurveTo(5.0, -2.6, 2.6, -2.9);
    mand.quadraticCurveTo(0.0, -3.0, -1.4, -2.0);
    mand.closePath();
    rostro(ctx, cabeza, mand, 0.4, -0.9, ang, verde, hex(verdeOsc), 0.7, 0.7);

    /* el pico: la parte de arriba fija, la de abajo con la mandíbula */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(2.8, 1.5);
      ctx.quadraticCurveTo(6.2, 2.2, 7.5, 0.3);
      ctx.quadraticCurveTo(7.7, -0.7, 6.9, -0.9);
      ctx.lineTo(6.4, -0.25);
      ctx.lineTo(2.8, -0.45);
      ctx.closePath();
    }, pico, picoOsc, 0.25, 0.25, 1.3);
    ctx.save(); girarSobre(ctx, 0.4, -0.9, -ang);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(2.8, -1.0); ctx.lineTo(6.3, -0.45);
      ctx.quadraticCurveTo(6.0, -1.9, 4.2, -2.1);
      ctx.lineTo(2.8, -2.0);
      ctx.closePath();
    }, pico, picoOsc, 0.2, 0.2, 1.2);
    ctx.restore();

    /* el flequillo de tazón alrededor del plato */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-3.9, 0.4);
      ctx.quadraticCurveTo(-4.2, 4.8, -0.4, 5.1);
      ctx.quadraticCurveTo(3.4, 5.2, 4.1, 3.0);
      var P = [[3.5, 2.5], [3.0, 3.3], [2.4, 2.6], [1.7, 3.4], [1.0, 2.8], [0.2, 3.4], [-0.6, 2.8], [-1.4, 3.2],
               [-2.0, 2.2], [-2.6, 2.4], [-2.9, 1.2], [-3.4, 1.2]];
      P.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
      ctx.closePath();
    }, '#27403a', '#0c1814', 0.3, 0.3, 1.4);

    /* el plato, con el agua */
    ctx.save();
    ctx.translate(0.0, 5.2);
    ctx.rotate(-0.08);
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.ellipse(0, 0, 3.0, 0.95, 0, 0, Math.PI * 2);
    }, '#f4f0dc', '#b4ac90', 0.1, -0.2, 1.3);
    if (agua > 0.02) {
      var ola = Math.sin(t * 6) * 0.25;
      ctx.fillStyle = '#5ad0ff';
      ctx.beginPath(); ctx.ellipse(ola * agua, 0.12, 2.3 * agua, 0.55 * agua, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath(); ctx.ellipse(-0.8 + ola * 2, 0.25, 0.6 * agua, 0.16, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    /* el ojo, redondo y saltón */
    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.arc(2.4, 2.1, 1.05, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.3); ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(2.75, 2.05, 0.52, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.0, 2.4, 0.28, 0.95);

    /* Q: el chorro */
    if (q >= 0) {
      var alcance = Math.min(1, q * 2.4);
      var chorro = function (u) { return { x: 7.4 + u * 13, y: 0.1 + u * 1.4 - u * u * 3.2 }; };
      ctx.lineCap = 'round';
      [[1.5, 'rgba(42,124,255,'], [0.95, 'rgba(90,208,255,'], [0.35, 'rgba(235,250,255,']].forEach(function (capa) {
        ctx.strokeStyle = capa[1] + escupe + ')';
        ctx.lineWidth = capa[0];
        ctx.beginPath();
        for (var i = 0; i <= 16; i++) {
          var u = alcance * i / 16, p = chorro(u);
          var w = Math.sin(t * 24 + i) * 0.12 * u;
          if (i === 0) ctx.moveTo(p.x, p.y + w); else ctx.lineTo(p.x, p.y + w);
        }
        ctx.stroke();
      });
      for (k = 0; k < 6; k++) {
        var uu = ((q * 3 + k / 6) % 1) * alcance;
        var pp = chorro(uu);
        ctx.fillStyle = mix('#8fe2ff', '#8fe2ff', 0, escupe * (1 - uu * 0.5));
        ctx.beginPath(); ctx.arc(pp.x, pp.y + 1.0 + (k % 2) * -2.0, 0.32, 0, Math.PI * 2); ctx.fill();
      }
      if (alcance >= 1) {
        for (k = 0; k < 5; k++) {
          var aa = 0.4 + k * 0.55;
          gota(ctx, 20.6 + Math.cos(aa) * 1.8 * escupe, -1.4 + Math.sin(aa) * 1.6 * escupe, 0.45, '#8fe2ff', escupe);
        }
      }
    }
    ctx.restore();
  };

  /* ---------------- ONI (cofre) ---------------- */
  /* El ogro: cara roja —azul, verde... con el color del jugador—, dos
   * cuernos, melena negra encrespada, ojos saltones y colmillos. A la
   * espalda, el KANABŌ, la maza de hierro con pinchos. Q: el MAZAZO. */
  function kanabo(ctx) {
    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(3.4, 0); ctx.stroke();
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(3.4, 0); ctx.stroke();
    var maza = function () {
      ctx.beginPath();
      ctx.moveTo(3.0, -0.55);
      ctx.lineTo(10.4, -1.25);
      ctx.quadraticCurveTo(11.4, 0, 10.4, 1.25);
      ctx.lineTo(3.0, 0.55);
      ctx.closePath();
    };
    /* los pinchos, asomando por el borde */
    for (var k = 0; k < 5; k++) {
      var x = 4.6 + k * 1.4, h = 0.7 + k * 0.13;
      [1, -1].forEach(function (l) {
        ctx.fillStyle = '#c8ccd8';
        ctx.beginPath(); ctx.moveTo(x - 0.35, l * h); ctx.lineTo(x, l * (h + 0.7)); ctx.lineTo(x + 0.35, l * h); ctx.closePath(); ctx.fill();
        contorno(ctx, 0.8); ctx.stroke();
      });
    }
    piezaX(ctx, maza, '#5a5f6c', '#1c1e24', 0.25, 0.25, 1.4);
    ctx.fillStyle = '#c8ccd8';
    for (k = 0; k < 4; k++) {
      ctx.beginPath(); ctx.arc(5.2 + k * 1.5, 0.15, 0.24, 0, Math.PI * 2); ctx.fill();
    }
  }
  DRAW.oni = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0), k;
    var ang = [0, 16, 30][fz] * Math.PI / 180;
    var piel = hex(mix(o.c, '#b0201a', 0.35)), pielOsc = mix(piel, '#2a0404', 0.5);
    var pelo = '#2c2228', cuerno = '#f2e2b0', cuernoOsc = '#a08a50';
    var golpe = (q >= 0) ? tramo(q, 0.1, 0.42) : 0;
    var impacto = (q >= 0 && q > 0.42) ? 1 - tramo(q, 0.42, 1) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    var tiembla = impacto > 0 ? Math.sin(t * 90) * 0.35 * impacto : 0;
    ctx.translate(tiembla, Math.abs(Math.sin(t * 4.5)) * 0.3 - 0.15);

    /* el kanabō: al hombro por detrás, o bajando en el mazazo */
    var maza = function () {
      if (o.sinMaza) return;
      var am = (q >= 0) ? 2.2 - suave(golpe) * 2.75 : 2.2 + Math.sin(t * 4.5) * 0.05;
      ctx.save();
      ctx.translate(q >= 0 ? -3.0 + golpe * 2.2 : -3.0, -3.4);
      ctx.rotate(am);
      kanabo(ctx);
      ctx.restore();
    };
    /* bajando, la maza pasa por delante de la cara */
    var delante = (q >= 0 && golpe > 0.35);
    if (!delante) maza();

    /* la melena, a bultos: primero el contorno de todos, luego el relleno */
    var BUL = [[1.4, 4.6, 1.3], [-0.6, 5.2, 1.5], [-2.8, 4.6, 1.5], [-4.4, 3.0, 1.4],
               [-5.0, 0.8, 1.3], [-4.6, -1.3, 1.2], [3.2, 4.0, 1.0]];
    ctx.lineWidth = 2 * 1.4 / S; ctx.strokeStyle = TINTA;
    BUL.forEach(function (b, i) {
      ctx.beginPath(); ctx.arc(b[0], b[1] + Math.sin(t * 6 + i) * 0.08, b[2], 0, Math.PI * 2); ctx.stroke();
    });
    ctx.fillStyle = pelo;
    BUL.forEach(function (b, i) {
      ctx.beginPath(); ctx.arc(b[0], b[1] + Math.sin(t * 6 + i) * 0.08, b[2], 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#4a3e46';
    BUL.forEach(function (b, i) {
      ctx.beginPath(); ctx.arc(b[0] + 0.3, b[1] + 0.3, b[2] * 0.45, 0, Math.PI * 2); ctx.fill();
    });

    /* los cuernos */
    [[-1.4, 5.2, -0.8, 0.85], [1.6, 4.8, 1.2, 1.0]].forEach(function (c) {
      var x = c[0], y = c[1], tx = c[2], e = c[3];
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(x - 0.9 * e, y);
        ctx.quadraticCurveTo(x - 0.4 * e, y + 2.8 * e, x + tx, y + 4.4 * e);
        ctx.quadraticCurveTo(x + 1.0 * e, y + 2.0 * e, x + 0.9 * e, y);
        ctx.closePath();
      }, e < 1 ? cuernoOsc : cuerno, e < 1 ? '#6a5a30' : cuernoOsc, 0.2, 0.2, 1.3);
      ctx.strokeStyle = e < 1 ? '#6a5a30' : cuernoOsc; ctx.lineWidth = 0.22;
      ctx.beginPath();
      ctx.moveTo(x - 0.7 * e, y + 1.0 * e); ctx.lineTo(x + 0.75 * e, y + 1.1 * e);
      ctx.moveTo(x - 0.4 * e, y + 2.1 * e); ctx.lineTo(x + 0.6 * e, y + 2.2 * e);
      ctx.stroke();
    });

    ctx.fillStyle = '#300606';
    ctx.beginPath(); ctx.moveTo(0.4, -0.7); ctx.lineTo(6.0, -0.3); ctx.lineTo(6.0, -3.8); ctx.lineTo(0.4, -1.8); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(6.0, 0.0);
    cabeza.quadraticCurveTo(6.4, 3.0, 4.0, 4.2);
    cabeza.quadraticCurveTo(1.0, 5.2, -1.8, 4.4);
    cabeza.quadraticCurveTo(-4.2, 3.4, -4.0, 0.6);
    cabeza.quadraticCurveTo(-3.8, -1.8, -1.6, -2.0);
    cabeza.lineTo(0.0, -0.9);
    cabeza.lineTo(6.0, 0.0);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(-0.2, -0.95); mand.lineTo(6.0, -0.2);
    mand.quadraticCurveTo(5.8, -3.0, 3.2, -3.6);
    mand.quadraticCurveTo(0.2, -4.0, -1.8, -2.6);
    mand.closePath();
    rostro(ctx, cabeza, mand, 0.0, -0.9, ang, piel, hex(pielOsc), 0.8, 0.8);

    /* el mechón de la frente, entre los cuernos */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-1.6, 4.4); ctx.lineTo(0.2, 5.4); ctx.lineTo(0.0, 4.2); ctx.lineTo(1.6, 4.8);
      ctx.lineTo(0.9, 3.6); ctx.quadraticCurveTo(-0.4, 3.8, -1.6, 4.4);
      ctx.closePath();
    }, '#3a3036', pelo, 0.15, 0.15, 1.2);

    /* dientes de arriba y los dos colmillos de abajo */
    dientes(ctx, 1.6, 5.6, -0.25, 4, -0.7, '#fbf3dc');
    ctx.save(); girarSobre(ctx, 0.0, -0.9, -ang);
    dientes(ctx, 1.2, 2.5, -1.0, 1, 2.0, '#fbf3dc');
    dientes(ctx, 4.0, 5.2, -0.7, 1, 1.8, '#fbf3dc');
    ctx.restore();

    /* la nariz chata */
    ctx.strokeStyle = hex(pielOsc); ctx.lineWidth = 0.35; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(5.6, 1.1, 0.55, Math.PI * 0.6, Math.PI * 1.5); ctx.stroke();

    /* el ojo saltón, amarillo, con la ceja de mal genio */
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath(); ctx.arc(2.9, 2.4, 1.2, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.4); ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(3.3, 2.3, 0.42, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 2.5, 2.9, 0.3, 0.9);
    ctx.strokeStyle = pelo; ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(1.2, 4.0); ctx.lineTo(4.6, 3.1); ctx.stroke();

    if (delante) maza();

    /* Q: el golpe contra el suelo */
    if (impacto > 0) {
      var ix = 7.4, iy = -6.2;
      estrella4(ctx, ix, iy, 1.5 + impacto * 2.5, '#fff6d0', impacto);
      ctx.strokeStyle = 'rgba(40,30,20,' + impacto + ')'; ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (k = 0; k < 5; k++) {
        var a3 = -0.2 + k * 0.8, l = 3 + (k % 2) * 2;
        ctx.moveTo(ix, iy);
        ctx.lineTo(ix + Math.cos(a3) * l * 0.5, iy + Math.sin(a3) * l * 0.5 + 0.4);
        ctx.lineTo(ix + Math.cos(a3) * l, iy + Math.sin(a3) * l);
      }
      ctx.stroke();
      for (k = 0; k < 6; k++) {
        var u = 1 - impacto;
        ctx.fillStyle = 'rgba(150,120,90,' + impacto + ')';
        ctx.beginPath();
        ctx.arc(ix + (k - 2.5) * 1.6 * (1 + u * 2), iy + u * 4 * Math.sin(k + 1), 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ---------------- TANUKI ---------------- */
  /* El mapache-perro que cambia de forma: antifaz oscuro, hocico crema,
   * orejas redondas, cola gorda a anillos y la HOJA en la cabeza con la que
   * se transforma. Q: ¡DORON! se convierte en la tetera de Bunbuku. */
  function teteraBunbuku(ctx, t, pardo, pardoOsc) {
    /* la cola por detrás */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.ellipse(-6.4, -1.8 + Math.sin(t * 6) * 0.3, 2.2, 1.2, -0.5, 0, Math.PI * 2);
    }, pardo, pardoOsc, 0.2, 0.2, 1.3);
    /* las patitas */
    [-3.0, -1.0, 1.4, 3.2].forEach(function (x, i) {
      ctx.fillStyle = pardoOsc;
      ctx.beginPath(); ctx.ellipse(x, -5.2 + (i % 2 ? Math.sin(t * 12) * 0.3 : 0), 0.8, 1.0, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
    });
    /* el asa */
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.95;
    ctx.beginPath(); ctx.moveTo(-4.2, 3.2); ctx.quadraticCurveTo(0, 10.2, 4.2, 3.2); ctx.stroke();
    ctx.strokeStyle = '#55555e'; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(-4.2, 3.2); ctx.quadraticCurveTo(0, 10.2, 4.2, 3.2); ctx.stroke();
    /* el hierro */
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.ellipse(0, -0.6, 5.6, 4.5, 0, 0, Math.PI * 2);
    }, '#5c5c66', '#26262c', 0.6, 0.6, 1.6);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    for (var k = 0; k < 6; k++) {
      ctx.beginPath(); ctx.arc(-3.6 + k * 1.4, -2.2 + (k % 2) * 0.8, 0.25, 0, Math.PI * 2); ctx.fill();
    }
    /* la tapa y su pomo */
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.ellipse(0, 3.6, 3.4, 1.0, 0, 0, Math.PI * 2);
    }, '#7a5230', '#3a2410', 0.2, 0.2, 1.3);
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.arc(0, 4.8, 0.8, 0, Math.PI * 2);
    }, '#7a5230', '#3a2410', 0.15, 0.15, 1.2);
    /* la cabecita asomando por delante */
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.ellipse(6.0, 0.6, 2.2, 1.9, 0, 0, Math.PI * 2);
    }, pardo, pardoOsc, 0.3, 0.3, 1.4);
    ctx.fillStyle = '#2e2018';
    ctx.beginPath(); ctx.ellipse(6.3, 1.0, 1.1, 0.75, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.arc(6.5, 1.05, 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(6.6, 1.05, 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8.0, 0.3, 0.35, 0.28, 0, 0, Math.PI * 2); ctx.fill();
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.arc(5.0, 2.4, 0.7, 0, Math.PI * 2);
    }, pardo, pardoOsc, 0.1, 0.1, 1.1);
  }
  DRAW.tanuki = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.5), k;
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var pardo = hex(mix('#9a6a3a', o.c, 0.12)), pardoOsc = mix(pardo, '#2a1604', 0.5);
    var antifaz = '#2e2018', crema = '#f2e4c8';
    var tetera = (q >= 0 && q > 0.14 && q < 0.86);
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 5.5)) * 0.35 - 0.15);

    if (tetera) {
      teteraBunbuku(ctx, t, pardo, hex(pardoOsc));
    } else {
      /* la cola gorda a anillos */
      ctx.save();
      ctx.translate(-3.4, -1.4);
      ctx.rotate(3.55 + Math.sin(t * 6) * 0.15);
      var cola = function () {
        ctx.beginPath();
        ctx.moveTo(0, -1.3);
        ctx.bezierCurveTo(3.0, -2.9, 6.4, -2.4, 7.0, 0);
        ctx.bezierCurveTo(6.4, 2.4, 3.0, 2.9, 0, 1.3);
        ctx.closePath();
      };
      piezaX(ctx, cola, pardo, hex(pardoOsc), 0.3, 0.3, 1.4);
      ctx.save(); cola(); ctx.clip();
      ctx.fillStyle = antifaz;
      ctx.fillRect(3.0, -3, 0.9, 6); ctx.fillRect(4.9, -3, 0.9, 6); ctx.fillRect(6.4, -3, 2, 6);
      ctx.restore();
      cola(); contorno(ctx, 1.4); ctx.stroke();
      ctx.restore();

      /* las orejas redondas */
      [[-3.4, 3.7, 1.15, true], [-1.8, 4.4, 1.35, false]].forEach(function (e) {
        piezaX(ctx, function () {
          ctx.beginPath(); ctx.arc(e[0], e[1], e[2], 0, Math.PI * 2);
        }, e[3] ? hex(pardoOsc) : pardo, e[3] ? antifaz : hex(pardoOsc), 0.2, 0.2, 1.3);
        ctx.fillStyle = antifaz;
        ctx.beginPath(); ctx.arc(e[0] + 0.1, e[1] + 0.1, e[2] * 0.5, 0, Math.PI * 2); ctx.fill();
      });

      ctx.fillStyle = '#3a1a08';
      ctx.beginPath(); ctx.moveTo(0.2, -0.7); ctx.lineTo(6.2, -0.3); ctx.lineTo(6.2, -2.8); ctx.lineTo(0.2, -1.7); ctx.closePath(); ctx.fill();

      var cabeza = new Path2D();
      cabeza.moveTo(6.6, -0.1);
      cabeza.quadraticCurveTo(6.8, 1.0, 5.8, 1.4);
      cabeza.quadraticCurveTo(4.0, 1.8, 2.8, 3.0);
      cabeza.quadraticCurveTo(1.0, 4.8, -1.4, 4.6);
      cabeza.quadraticCurveTo(-4.6, 4.2, -4.6, 0.8);
      cabeza.quadraticCurveTo(-4.6, -1.8, -2.2, -2.2);
      cabeza.lineTo(0.0, -0.9);
      cabeza.lineTo(6.6, -0.1);
      cabeza.closePath();
      var mand = new Path2D();
      mand.moveTo(-0.2, -0.95); mand.lineTo(6.2, -0.35);
      mand.quadraticCurveTo(5.8, -1.8, 3.8, -2.2);
      mand.quadraticCurveTo(1.4, -2.8, -0.6, -3.2);
      mand.quadraticCurveTo(-2.2, -3.2, -2.8, -2.2);
      mand.closePath();
      rostro(ctx, cabeza, mand, 0.0, -0.9, ang, pardo, hex(pardoOsc), 0.7, 0.7);

      /* el hocico crema y la quijada */
      ctx.save(); ctx.clip(cabeza);
      ctx.fillStyle = crema;
      ctx.beginPath(); ctx.ellipse(5.0, 0.1, 2.5, 1.2, 0.1, 0, Math.PI * 2); ctx.fill();
      /* el antifaz, bajando por la mejilla */
      /* frente clara encima del antifaz, como los tanuki de verdad */
      ctx.fillStyle = hex(mix(pardo, '#fff4dc', 0.4));
      ctx.beginPath(); ctx.ellipse(2.8, 3.3, 2.0, 0.9, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = antifaz;
      ctx.beginPath();
      ctx.moveTo(4.4, 2.2);
      ctx.quadraticCurveTo(3.4, 3.2, 1.6, 2.8);
      ctx.quadraticCurveTo(0.0, 2.2, -0.8, 0.2);
      ctx.quadraticCurveTo(-1.2, -1.2, -2.2, -2.0);
      ctx.lineTo(0.4, -0.9);
      ctx.quadraticCurveTo(1.6, 0.6, 3.4, 0.9);
      ctx.quadraticCurveTo(4.6, 1.2, 4.4, 2.2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save(); girarSobre(ctx, 0.0, -0.9, -ang); ctx.clip(mand);
      ctx.fillStyle = crema; ctx.fillRect(1.0, -4, 7, 4);
      ctx.restore();
      contorno(ctx, 1.6);
      ctx.stroke(cabeza);
      ctx.save(); girarSobre(ctx, 0.0, -0.9, -ang); ctx.stroke(mand); ctx.restore();

      /* la trufa y el ojo, brillante dentro del antifaz */
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.ellipse(6.3, 0.75, 0.58, 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fdfaf0';
      ctx.beginPath(); ctx.arc(2.6, 1.9, 0.72, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.arc(2.85, 1.9, 0.48, 0, Math.PI * 2); ctx.fill();
      destello(ctx, 3.05, 2.2, 0.25, 0.95);

      /* la hoja de transformarse */
      if (!o.sinHoja) hojaTanuki(ctx, 0.4, 5.3, -0.35 + Math.sin(t * 3) * 0.08);
    }

    /* Q: el puf de humo al entrar y al salir de la tetera */
    if (q >= 0) {
      /* opaco en el cambio (que no se vea el truco) y luego se deshace */
      var u1 = tramo(q, 0, 0.3), u2 = tramo(q, 0.72, 1);
      if (q < 0.3) humoPuf(ctx, 0.5, 0.5, Math.min(1, u1 * 1.6), u1 < 0.6 ? 1 : (1 - u1) / 0.4, 7);
      if (q > 0.72) humoPuf(ctx, 0.5, 0.5, Math.min(1, u2 * 1.6), u2 < 0.6 ? 1 : (1 - u2) / 0.4, 7);
    }
    ctx.restore();
  };
  function hojaTanuki(ctx, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-1.9, 0);
      ctx.quadraticCurveTo(-0.2, 1.6, 2.0, 0);
      ctx.quadraticCurveTo(-0.2, -1.6, -1.9, 0);
      ctx.closePath();
    }, '#6ccc52', '#246a1c', 0.2, 0.2, 1.2);
    ctx.strokeStyle = '#246a1c'; ctx.lineWidth = 0.22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2.6, -0.3); ctx.lineTo(1.6, 0.05); ctx.stroke();
    ctx.restore();
  }
