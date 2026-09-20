  /* =====================================================================
   * TEMPORADA DE OCTUBRE — CAZAFANTASMAS
   * Las cinco piezas exclusivas del camino del pase. Mismo marco que el
   * resto del vestuario (f hacia donde avanza, s hacia la coronilla) y la
   * misma cadencia: la Q cada 3,4 s con qFase() y la muerte cada 6,8 s.
   * ===================================================================== */

  /* un fantasma diminuto, para lo que la trampa caza y lo que se le escapa */
  function fantasmita(ctx, x, y, r, col, alpha, mira) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, 0);
    ctx.lineTo(x + r, y + r * 0.9);
    for (var k = 0; k < 3; k++) {
      ctx.quadraticCurveTo(x + r - (k * 2 + 1) * r / 3, y + r * 0.45,
                           x + r - (k * 2 + 2) * r / 3, y + r * 0.9);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,28,60,.8)'; ctx.lineWidth = r * 0.16; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.18, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.46, y - r * 0.18, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1acc';
    ctx.beginPath(); ctx.arc(x - r * 0.34 + mira * r * 0.14, y - r * 0.18, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.46 + mira * r * 0.14, y - r * 0.18, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ---------------- TRAMPA ----------------
   * La caja de cazar fantasmas, de perfil. Las dos hojas del frente son la
   * boca: cerradas tapan el hueco y solo dejan una rendija de luz; abiertas
   * forman la V de la trampa y se ve lo que lleva dentro. No es un Pac-Man
   * pintado, es otro bicho — como la RECREATIVA o la TOSTADORA. */
  DRAW.trampa = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0), k;
    /* nunca cierra del todo: siempre se le escapa una rendija */
    var ang = (q >= 0 ? 74 : [8, 38, 66][fz]) * Math.PI / 180;
    var abre = ang / (74 * Math.PI / 180);
    var metal = '#98a1ac', metalOsc = '#3f4650', metalClaro = '#cdd4dc';
    var luz = hex(mix(o.c, '#ffffff', 0.5));
    var bota = Math.sin(t * 9) * 0.2;                        // el trasto da tumbos
    var tira = (q >= 0) ? Math.sin(q * Math.PI) * 1.4 : 0;   // culatazo del rayo

    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(-tira, bota);

    /* la manguera, que sale por detrás y se mece */
    ctx.strokeStyle = metalOsc; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5.2, -1.4);
    ctx.quadraticCurveTo(-8.4, -2.6 + Math.sin(t * 6) * 0.7, -9.2, 1.2 + Math.sin(t * 6 + 1) * 0.9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,200,212,.5)'; ctx.lineWidth = 0.5; ctx.stroke();

    /* EL HUECO: primero el cono de luz que sale hacia delante (solo cuenta si
     * está abierta), y luego el interior metido en la caja. */
    if (abre > 0.12) {
      ctx.save();
      var gl = ctx.createLinearGradient(1.4, 0, 5.4, 0);
      gl.addColorStop(0, mix(o.c, '#ffffff', 0.72, 0.3 * abre));
      gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.moveTo(1.4, -1.0);
      ctx.lineTo(5.4, -3.8 * abre);
      ctx.lineTo(5.4, 3.8 * abre);
      ctx.lineTo(1.4, 1.0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    /* el interior, recortado al hueco de la caja */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-1.5, -3.7); ctx.lineTo(1.7, -4.1); ctx.lineTo(1.7, 4.1); ctx.lineTo(-1.5, 3.7);
    ctx.closePath();
    ctx.clip();
    var g = ctx.createRadialGradient(1.5, 0, 0.3, 0.4, 0, 5.2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, luz);
    g.addColorStop(1, 'rgba(8,12,26,0.97)');
    ctx.fillStyle = g;
    ctx.fillRect(-1.6, -4.2, 3.4, 8.4);
    /* rayas de energía cayendo hacia el fondo */
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.28;
    for (k = 0; k < 4; k++) {
      var u = ((t * 1.6 + k / 4) % 1);
      ctx.globalAlpha = Math.sin(u * Math.PI) * 0.7;
      ctx.beginPath();
      ctx.moveTo(1.6 - u * 2.8, -3.2 + k * 2.0);
      ctx.lineTo(1.6 - u * 2.8, 3.2 - k * 1.0);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    /* lo que ya tiene dentro, apretado contra el fondo */
    fantasmita(ctx, 0.3, -0.3 + Math.sin(t * 4) * 0.5, 1.5, 'rgba(176,226,255,.98)', 0.55 + abre * 0.45, -1);
    ctx.restore();

    /* LA CAJA, con el frente abierto: se dibuja como una U tumbada para que
     * el hueco de delante no lleve chapa por encima */
    function caja() {
      ctx.beginPath();
      ctx.moveTo(1.6, 5.0);
      ctx.lineTo(-4.4, 5.0);
      ctx.quadraticCurveTo(-5.6, 5.0, -5.6, 3.8);
      ctx.lineTo(-5.6, -3.8);
      ctx.quadraticCurveTo(-5.6, -5.0, -4.4, -5.0);
      ctx.lineTo(1.6, -5.0);
      ctx.lineTo(1.6, -4.0);
      ctx.lineTo(-1.4, -3.6);
      ctx.lineTo(-1.4, 3.6);
      ctx.lineTo(1.6, 4.0);
      ctx.closePath();
    }
    piezaX(ctx, caja, metal, metalOsc, 0.7, 0.7);
    ctx.save();
    caja(); ctx.clip();
    /* franja de peligro con el color del jugador, en el lomo */
    ctx.fillStyle = hex(mix(o.c, '#2a2000', 0.22));
    ctx.fillRect(-5.6, 2.9, 7.2, 1.8);
    ctx.fillStyle = 'rgba(22,22,22,.92)';
    for (k = -3; k <= 4; k++) {
      ctx.beginPath();
      ctx.moveTo(-5.6 + k * 1.9, 2.9); ctx.lineTo(-5.6 + k * 1.9 + 0.95, 2.9);
      ctx.lineTo(-5.6 + k * 1.9 + 1.9, 4.7); ctx.lineTo(-5.6 + k * 1.9 + 0.95, 4.7);
      ctx.closePath(); ctx.fill();
    }
    /* rejilla de refrigeración y remaches */
    ctx.strokeStyle = 'rgba(30,36,44,.7)'; ctx.lineWidth = 0.32;
    for (k = 0; k < 4; k++) {
      ctx.beginPath(); ctx.moveTo(-5.0, -1.2 - k * 0.95); ctx.lineTo(-2.6, -1.2 - k * 0.95); ctx.stroke();
    }
    ctx.fillStyle = metalClaro;
    [[-4.6, 4.0], [-4.6, -4.2], [0.8, -4.3], [0.8, 4.3]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 0.4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    /* el asa de arriba */
    ctx.strokeStyle = metalOsc; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4.0, 5.0); ctx.quadraticCurveTo(-2.4, 7.1, -0.8, 5.0); ctx.stroke();
    ctx.strokeStyle = 'rgba(214,224,236,.7)'; ctx.lineWidth = 0.26; ctx.stroke();

    /* el testigo: parpadea despacio y se queda fijo mientras dispara */
    var enc = (q >= 0) ? 1 : (Math.floor(t * 2.2) % 2 ? 1 : 0.2);
    if (enc > 0.5) {
      ctx.fillStyle = 'rgba(255,120,110,.3)';
      ctx.beginPath(); ctx.arc(-3.4, 1.4, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,58,48,' + enc + ')';
    ctx.beginPath(); ctx.arc(-3.4, 1.4, 0.6, 0, Math.PI * 2); ctx.fill();

    /* LAS DOS HOJAS: cerradas tapan el frente, abiertas forman la V */
    function hoja(lado) {
      ctx.save();
      /* La hoja cuelga del BORDE de la caja, no del centro: por eso al
       * abrirse se levanta hacia delante y deja el hueco a la vista, en vez
       * de cruzar por delante de la boca. */
      girarSobre(ctx, 1.5, lado * 4.6, lado * ang);
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(0.9, lado * 5.0);
        ctx.lineTo(2.3, lado * 4.9);
        ctx.lineTo(2.2, lado * -0.15);
        ctx.lineTo(1.0, lado * -0.15);
        ctx.closePath();
      }, metal, metalOsc, 0.45, lado * 0.45);
      /* el refuerzo de la hoja */
      ctx.strokeStyle = 'rgba(30,36,44,.55)'; ctx.lineWidth = 0.28;
      ctx.beginPath(); ctx.moveTo(1.6, lado * 4.2); ctx.lineTo(1.6, lado * 0.5); ctx.stroke();
      ctx.restore();
    }
    hoja(1);
    hoja(-1);

    /* LA Q: el rayo. Sale en zigzag y trae un fantasma de las orejas. */
    if (q >= 0) {
      var fuerza = Math.sin(Math.min(1, q * 1.6) * Math.PI / 2) * (q > 0.75 ? (1 - q) / 0.25 : 1);
      ctx.save();
      ctx.lineCap = 'round';
      for (var j = 0; j < 2; j++) {
        ctx.strokeStyle = j ? 'rgba(255,255,255,.95)' : mix(o.c, '#ffffff', 0.3, 0.85);
        ctx.lineWidth = j ? 0.5 : 1.6;
        ctx.beginPath();
        ctx.moveTo(1.6, 0);
        for (k = 1; k <= 7; k++) {
          ctx.lineTo(1.6 + k * 2.6 * fuerza, Math.sin(t * 26 + k * 2.1) * 1.5 * (k / 7));
        }
        ctx.stroke();
      }
      /* el fantasma, arrastrado hasta la boca y tragado */
      var v = 1 - Math.min(1, q * 1.4);
      if (v > 0.02) {
        fantasmita(ctx, 2.6 + v * 14, Math.sin(t * 8) * 1.2 * v, 1.5 + v * 0.6,
                   'rgba(238,248,255,.95)', Math.min(1, v * 2.4), -1);
      }
      /* chispas en la boca */
      for (k = 0; k < 5; k++) {
        var cu = ((t * 3 + k / 5) % 1);
        ctx.globalAlpha = (1 - cu) * fuerza;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(1.8 + cu * 3.0, (hash(k) % 100) / 100 * 5 - 2.5, 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.restore();
  };


  /* ---------------- MOCHILA DE PROTONES (accesorio) ---------------- */
  DRAW.acc_mochila = accesorio(function (ctx, o) {
    var metal = '#8f98a3', metalOsc = '#39404a', metalClaro = '#c6cdd6';
    var zumba = Math.sin(o.t * 30) * 0.12;          // el trasto vibra
    var k;
    ctx.save();
    ctx.translate(-0.3, zumba);

    /* la manguera: sale del cuerpo de la mochila, sube y se apoya arriba */
    ctx.strokeStyle = metalOsc; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6.2, 1.2);
    ctx.quadraticCurveTo(-5.0, 5.6 + Math.sin(o.t * 5) * 0.4, -1.6, 5.2);
    ctx.lineTo(1.4, 4.9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,210,222,.5)'; ctx.lineWidth = 0.42; ctx.stroke();

    /* el cañón, tumbado sobre la coronilla y apuntando adelante */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(0.4, 4.3); ctx.lineTo(4.6, 3.9);
      ctx.lineTo(4.9, 5.0); ctx.lineTo(0.4, 5.5);
      ctx.closePath();
    }, metal, metalOsc, 0.5, 0.5);
    ctx.fillStyle = 'rgba(120,230,255,' + (0.5 + Math.abs(Math.sin(o.t * 4)) * 0.5) + ')';
    ctx.beginPath(); ctx.arc(4.8, 4.4, 0.55, 0, Math.PI * 2); ctx.fill();

    /* el cuerpo de la mochila, detrás */
    function cuerpo() { roundRect(ctx, -9.2, -3.2, 3.6, 7.6, 0.9); }
    piezaX(ctx, cuerpo, metal, metalOsc, 0.6, 0.6);
    ctx.save();
    cuerpo(); ctx.clip();
    /* aletas de refrigeración */
    ctx.strokeStyle = 'rgba(30,36,44,.7)'; ctx.lineWidth = 0.32;
    for (k = 0; k < 5; k++) {
      ctx.beginPath(); ctx.moveTo(-9.0, -2.2 + k * 1.3); ctx.lineTo(-5.8, -2.2 + k * 1.3); ctx.stroke();
    }
    ctx.restore();

    /* el acelerador: el cilindro que asoma arriba con su luz dentro */
    piezaX(ctx, function () { roundRect(ctx, -8.7, 3.9, 2.2, 2.2, 0.9); }, metalClaro, metalOsc, 0.4, 0.4);
    var pulso = 0.45 + Math.abs(Math.sin(o.t * 3.4)) * 0.55;
    ctx.fillStyle = 'rgba(120,235,160,' + pulso + ')';
    ctx.beginPath(); ctx.arc(-7.6, 5.0, 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(190,255,215,' + (pulso * 0.5) + ')';
    ctx.beginPath(); ctx.arc(-7.6, 5.0, 1.3, 0, Math.PI * 2); ctx.fill();

    /* las dos luces del panel: una fija y otra que parpadea */
    ctx.fillStyle = '#ff4a3c';
    ctx.beginPath(); ctx.arc(-6.4, -1.8, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = (Math.floor(o.t * 3) % 2) ? '#4affa0' : 'rgba(40,90,60,.9)';
    ctx.beginPath(); ctx.arc(-6.4, -0.6, 0.4, 0, Math.PI * 2); ctx.fill();

    /* las correas por encima del cuerpo */
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(38,42,50,.9)'; ctx.lineWidth = 0.62;
    ctx.beginPath();
    ctx.moveTo(-5.8, 2.4); ctx.quadraticCurveTo(-2.2, 3.8, 1.2, 1.8);
    ctx.moveTo(-5.8, -1.2); ctx.quadraticCurveTo(-2.4, -3.0, 0.8, -2.0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,160,175,.55)'; ctx.lineWidth = 0.2;
    ctx.stroke();

    /* vapor por la rejilla, cada pocos segundos */
    var sop = (o.t % 3.2) / 0.9;
    if (sop < 1) {
      for (k = 0; k < 4; k++) {
        var u = Math.min(1, sop + k * 0.12);
        ctx.fillStyle = 'rgba(226,236,246,' + ((1 - u) * 0.5) + ')';
        ctx.beginPath();
        ctx.arc(-9.6 - u * 3.4, -2.4 - k * 0.5 - u * 1.2, 0.7 + u * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  });

  /* ---------------- VISOR DE CAZA (accesorio) ---------------- */
  DRAW.acc_visor = accesorio(function (ctx, o) {
    var marco = '#2b3038', marcoClaro = '#59626e';
    /* la correa, que da la vuelta por detrás */
    ctx.strokeStyle = '#1e222a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, R - 1.05, 0.16 * Math.PI, 1.06 * Math.PI); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,132,148,.5)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.arc(0, 0, R - 1.05, 0.16 * Math.PI, 1.06 * Math.PI); ctx.stroke();

    /* el visor: un cristal curvo por delante del ojo */
    function cristal() {
      ctx.beginPath();
      ctx.moveTo(-2.2, 4.2);
      ctx.quadraticCurveTo(3.4, 4.6, 5.6, 2.2);
      ctx.quadraticCurveTo(5.9, 0.4, 4.4, -0.2);
      ctx.quadraticCurveTo(0.6, 1.0, -2.4, 1.2);
      ctx.closePath();
    }
    piezaX(ctx, cristal, marcoClaro, marco, 0.5, 0.5);
    ctx.save();
    cristal(); ctx.clip();
    /* el cristal verde, con el barrido que sube y baja */
    var gg = ctx.createLinearGradient(-2, 0, 5.5, 4);
    gg.addColorStop(0, 'rgba(24,120,70,.95)');
    gg.addColorStop(1, 'rgba(70,255,150,.85)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(-1.8, 3.8);
    ctx.quadraticCurveTo(3.0, 4.1, 4.9, 2.1);
    ctx.quadraticCurveTo(5.1, 0.9, 4.1, 0.5);
    ctx.quadraticCurveTo(0.6, 1.6, -2.0, 1.7);
    ctx.closePath();
    ctx.fill();
    var bar = (o.t * 0.9) % 1;
    ctx.strokeStyle = 'rgba(190,255,220,.8)'; ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(-2.4, 1.4 + bar * 2.8); ctx.lineTo(5.8, 0.9 + bar * 2.8);
    ctx.stroke();
    /* el reflejo de siempre, para que se lea como cristal */
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.moveTo(1.4, 3.9); ctx.lineTo(3.0, 3.9); ctx.lineTo(1.4, 1.3); ctx.lineTo(0.4, 1.3);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    /* el aparatito del lado, con su lucecita de medir */
    piezaX(ctx, function () { roundRect(ctx, -3.4, 1.0, 1.9, 3.3, 0.5); }, marcoClaro, marco, 0.4, 0.4);
    var enc = (Math.floor(o.t * 4) % 3 === 0) ? 1 : 0.3;
    ctx.fillStyle = 'rgba(80,255,150,' + enc + ')';
    ctx.beginPath(); ctx.arc(-2.45, 3.4, 0.5, 0, Math.PI * 2); ctx.fill();
    /* tres barritas que suben con lo que detecta */
    ctx.fillStyle = 'rgba(80,255,150,.9)';
    for (var k = 0; k < 3; k++) {
      var alt = 0.4 + Math.abs(Math.sin(o.t * 5 + k * 0.8)) * 0.9;
      ctx.fillRect(-3.1 + k * 0.6, 1.4, 0.4, alt);
    }
  });

  /* ---------------- ECTOPLASMA (efecto) ---------------- */
  DRAW.efx_ecto = function (ctx, o) {
    rastro(o, 3.4, 48).forEach(function (q) {
      var vive = 1 - q.edad;
      var r = 3.0 * (0.5 + vive * 0.7);
      ctx.save();
      ctx.globalAlpha = vive * 0.7;
      /* el charco: se va estirando y aplastando */
      ctx.fillStyle = 'rgba(94,240,127,.9)';
      ctx.beginPath();
      ctx.ellipse(q.p.x, q.p.y + 0.6, r, r * (0.42 + q.edad * 0.25), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(180,255,205,.55)';
      ctx.beginPath();
      ctx.ellipse(q.p.x - r * 0.25, q.p.y + 0.2, r * 0.42, r * 0.22, -0.3, 0, Math.PI * 2);
      ctx.fill();
      /* burbujas que asoman y reventan */
      var b = (o.t * 1.8 + q.n * 0.61) % 1;
      if (b < 0.55) {
        ctx.fillStyle = 'rgba(220,255,230,' + ((0.55 - b) * 1.4 * vive) + ')';
        ctx.beginPath();
        ctx.arc(q.p.x + ((q.n % 3) - 1) * 1.2, q.p.y - b * 2.0, 0.55 * (1 - b * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      /* un hilo que gotea de vez en cuando */
      if (q.n % 7 === 0) {
        ctx.strokeStyle = 'rgba(120,240,160,' + (vive * 0.7) + ')';
        ctx.lineWidth = 0.42; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(q.p.x + 1.0, q.p.y);
        ctx.lineTo(q.p.x + 1.0, q.p.y + 1.4 + Math.sin(o.t * 3 + q.n) * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    body(ctx, o);
  };

  /* ---------------- GRITO (emote) ---------------- */
  function caraGrito(ctx, x, y, r, color, t) {
    var ink = '#000000', lw = Math.max(1, r * 0.17), k;
    var tiembla = Math.sin(t * 1.1) * r * 0.035;
    ctx.save();
    ctx.translate(tiembla, Math.cos(t * 0.9) * r * 0.02);
    /* las manos, a los lados de la cara */
    ctx.fillStyle = hex(mix(color, '#000000', 0.25));
    [-1, 1].forEach(function (lado) {
      ctx.save();
      ctx.translate(x + lado * r * 0.92, y + r * 0.2);
      ctx.rotate(lado * 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.3, r * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.4; ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = lw * 0.28;
      for (k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.2 + k * r * 0.2, -r * 0.3);
        ctx.lineTo(-r * 0.2 + k * r * 0.2, r * 0.28);
        ctx.stroke();
      }
      ctx.restore();
    });
    /* la cara, estirada hacia abajo como el cuadro */
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.06, r * 0.86, r, 0, 0, Math.PI * 2);
    ctx.fill();
    /* ojos huecos de espanto */
    [-1, 1].forEach(function (lado) {
      var ox = x + lado * r * 0.36, oy = y - r * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(ox, oy, r * 0.21, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.42; ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(ox, oy - r * 0.05 + Math.sin(t * 1.4 + lado) * r * 0.02, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
    /* cejas levantadas del todo */
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.6, y - r * 0.6); ctx.quadraticCurveTo(x - r * 0.34, y - r * 0.76, x - r * 0.12, y - r * 0.58);
    ctx.moveTo(x + r * 0.6, y - r * 0.6); ctx.quadraticCurveTo(x + r * 0.34, y - r * 0.76, x + r * 0.12, y - r * 0.58);
    ctx.stroke();
    /* la boca: el óvalo negro que da el grito, que late */
    var late = 1 + Math.sin(t * 1.6) * 0.09;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.42, r * 0.19 * late, r * 0.34 * late, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    /* las ondas del grito, que salen para arriba */
    ctx.strokeStyle = '#ffffff';
    for (k = 0; k < 3; k++) {
      var u = ((t * 0.016) + k / 3) % 1;
      ctx.globalAlpha = (1 - u) * 0.85;
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.arc(x, y + r * 0.42, r * (0.5 + u * 1.5), -2.5, -0.65);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  DRAW.emo_grito = function (ctx, o) {
    body(ctx, o);
    globoEmote(ctx, o.x, o.y - 11, o.c, o.t * 60, function (cx, cy, r) {
      caraGrito(ctx, cx, cy, r, o.c, o.t * 60);
    });
  };
