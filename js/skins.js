/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/skins.js
 * Las skins nuevas: su dibujo, qué pide cada una y la escena de la
 * vitrina de SKINS. Define window.PM.Skins
 *
 * Las seis de siempre (clásico, sombra, ojos, neón, píxel, aro) siguen
 * en sprites.js tal cual. Las demás se registran aquí en Sprites.ARTE y
 * Sprites.drawPacman se desvía a ellas, así que ningún sitio que ya
 * dibujaba un Pac-Man tiene que saber que existen.
 *
 * Se diseñaron en una vitrina aparte (13 de septiembre de 2026) con
 * Braighton aprobando cada retoque; el dibujo de aquí es ESE, con las
 * mismas medidas. Todas se dibujan en unidades nativas (la casilla mide
 * 8 y Pac-Man tiene radio 6,5) y los trazos finos se miden en píxeles de
 * pantalla dividiendo entre CFG.SCALE.
 *
 * El "marco del cuerpo" (frame): f = hacia donde avanza, s = hacia la
 * coronilla. La coronilla sigue la regla de la skin OJOS: arriba yendo en
 * horizontal y a la izquierda yendo en vertical, para que un sombrero no
 * salte de la frente a la barbilla al dar la vuelta.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var Sprites = window.PM.Sprites;

  var S = CFG.SCALE;          // un píxel de pantalla = 1/S unidades
  var R = CFG.PAC_R;
  var DIR_ANGLE = [-Math.PI / 2, Math.PI, Math.PI / 2, 0];   // UP LEFT DOWN RIGHT
  var DIR_V = [[0, -1], [-1, 0], [0, 1], [1, 0]];
  var HALF = [0, 20 * Math.PI / 180, 40 * Math.PI / 180];

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ============================================================
   * Primitivas (las mismas que las de sprites.js, más las piezas de
   * caricatura de las extravagantes)
   * ============================================================ */
  function hash(n) { return ((n * 1103515245 + 12345) & 0x7fffffff); }

  function mix(a, b, k, alpha) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(((pa >> 16) & 255) * (1 - k) + ((pb >> 16) & 255) * k);
    var g = Math.round(((pa >> 8) & 255) * (1 - k) + ((pb >> 8) & 255) * k);
    var bl = Math.round((pa & 255) * (1 - k) + (pb & 255) * k);
    var al = (alpha == null) ? 1 : alpha;
    return 'rgba(' + r + ',' + g + ',' + bl + ',' + al + ')';
  }

  /* ---------- Primitivas (las mismas que sprites.js) ---------- */
  function pacPath(ctx, x, y, r, a, half) {
    ctx.beginPath();
    if (half <= 0) {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    } else {
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, a + half, a - half + Math.PI * 2);
      ctx.closePath();
    }
  }

  function inPac(px, py, r, a, half) {
    if (px * px + py * py > r * r) return false;
    if (half <= 0) return true;
    var ang = Math.atan2(py, px) - a;
    while (ang > Math.PI) ang -= Math.PI * 2;
    while (ang < -Math.PI) ang += Math.PI * 2;
    return Math.abs(ang) > half;
  }

  function body(ctx, o, col) {
    ctx.fillStyle = col || o.c;
    pacPath(ctx, o.x, o.y, R, DIR_ANGLE[o.d], o.half);
    ctx.fill();
  }

  /* Marco del cuerpo: f = hacia donde avanza, s = hacia la "cabeza".
   * La cabeza sigue la regla de la skin OJOS: arriba yendo en horizontal,
   * a la izquierda yendo en vertical. */
  function frame(ctx, x, y, d) {
    var v = DIR_V[d];
    var ox = (v[0] !== 0) ? 0 : -1, oy = (v[0] !== 0) ? -1 : 0;
    ctx.translate(x, y);
    ctx.transform(v[0], v[1], ox, oy, 0, 0);
  }

  function ring(ctx, o) {
    ctx.strokeStyle = o.c;
    ctx.lineWidth = 2 / S;
    ctx.lineJoin = 'round';
    pacPath(ctx, o.x, o.y, R - 1 / S, DIR_ANGLE[o.d], o.half);
    ctx.stroke();
  }

  function eyeScreen(o) {
    var v = DIR_V[o.d];
    return { ox: (v[0] !== 0) ? 0 : -1, oy: (v[0] !== 0) ? -1 : 0, vx: v[0], vy: v[1] };
  }

  /* ---------- piezas de las skins EXTRAVAGANTES ----------
   * Todas dejan la forma de Pac-Man: se dibujan en el marco del cuerpo (f
   * hacia donde avanza, s hacia la coronilla), estilo caricatura con
   * contorno oscuro, y el comer es su propio gesto (abrir la mandíbula, la
   * tapa, el pan, las hojas...) con la fase de boca del juego. */
  var TINTA = '#141414';
  function fase(o) { return (o.half <= 0) ? 0 : (o.half < 0.3 ? 1 : 2); }
  function contorno(ctx, w) {
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = (w || 1.6) / S;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }
  /* relleno con media luna de sombra abajo-atrás, y el perfil */
  function piezaX(ctx, camino, claro, oscuro, sf, ss, w) {
    camino();
    ctx.fillStyle = oscuro;
    ctx.fill();
    ctx.save();
    camino();
    ctx.clip();
    ctx.translate(sf, ss);
    camino();
    ctx.fillStyle = claro;
    ctx.fill();
    ctx.restore();
    camino();
    contorno(ctx, w);
    ctx.stroke();
  }
  /* Cabeza y mandíbula como UNA sola cara. Dibujadas por separado, cada una
   * con su contorno y su sombra, la mandíbula parecía una pieza pegada por
   * fuera. Aquí: 1) contorno al doble de grosor de las dos, 2) relleno de
   * las dos encima (tapa las costuras interiores y deja solo la silueta
   * conjunta), 3) la luz desplazada de las dos, recortada a cada una, así la
   * media luna de sombra es continua de la frente a la barbilla. */
  function rostro(ctx, cabeza, mandibula, px, py, ang, claro, oscuro, sf, ss, w) {
    function enMandibula(fn) { ctx.save(); girarSobre(ctx, px, py, -ang); fn(); ctx.restore(); }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 2 * (w || 1.6) / S;
    ctx.stroke(cabeza);
    enMandibula(function () { ctx.stroke(mandibula); });
    ctx.fillStyle = oscuro;
    ctx.fill(cabeza);
    enMandibula(function () { ctx.fill(mandibula); });
    function luces() {
      ctx.fillStyle = claro;
      ctx.save(); ctx.translate(sf, ss); ctx.fill(cabeza); ctx.restore();
      ctx.save(); ctx.translate(sf, ss); girarSobre(ctx, px, py, -ang); ctx.fill(mandibula); ctx.restore();
    }
    ctx.save(); ctx.clip(cabeza); luces(); ctx.restore();
    ctx.save(); girarSobre(ctx, px, py, -ang); ctx.clip(mandibula); girarSobre(ctx, px, py, ang); luces(); ctx.restore();
  }
  function girarSobre(ctx, px, py, ang) { ctx.translate(px, py); ctx.rotate(ang); ctx.translate(-px, -py); }
  /* fila de dientes triangulares apoyados en la línea s; largo < 0 = hacia abajo */
  function dientes(ctx, f0, f1, s, n, largo, color) {
    var paso = (f1 - f0) / n;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var a = f0 + i * paso;
      ctx.moveTo(a, s); ctx.lineTo(a + paso, s); ctx.lineTo(a + paso / 2, s + largo); ctx.closePath();
    }
    ctx.fillStyle = color || '#fbf7ea';
    ctx.fill();
    contorno(ctx, 1);
    ctx.stroke();
  }

  /* 'rgba(r,g,b,a)' de mix() -> '#rrggbb', para poder mezclarlo otra vez */
  function hex(rgba) {
    var m = /(\d+),(\d+),(\d+)/.exec(rgba);
    return '#' + [m[1], m[2], m[3]].map(function (v) { return ('0' + (+v).toString(16)).slice(-2); }).join('');
  }

  var PRISMA = ['#ff2a2a', '#ff8c1a', '#ffe81a', '#3ee83e', '#1ae0ff', '#2e6bff', '#9b4dff', '#ff4dc4'];
  function prismaColor(u) {
    var n = PRISMA.length, i = Math.floor(u), f = u - i;
    var k = f < 0.75 ? 0 : (f - 0.75) / 0.25;         // 75 % quieto, 25 % cambiando
    k = k * k * (3 - 2 * k);
    var c0 = PRISMA[((i % n) + n) % n], c1 = PRISMA[(((i + 1) % n) + n) % n];
    return mix(c0, c1, k);
  }

  /* destello de cuatro puntas */
  function destello(ctx, x, y, s, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
    ctx.restore();
  }

  function flameFrom(ctx, f0, s0, L, tipS, w, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(f0, s0 - w);
    ctx.quadraticCurveTo(-R - L * 0.35, s0 - w * 1.05, -R - L, tipS);
    ctx.quadraticCurveTo(-R - L * 0.35, s0 + w * 1.05, f0, s0 + w);
    ctx.closePath();
    ctx.fill();
  }

  /* ============================================================
   * Las skins. `o` lo arma Sprites.dibujarArte (más abajo):
   *   x, y, d, half (media apertura de la boca), c (color #rrggbb),
   *   t (segundos), back(dist), estira, team
   * ============================================================ */
  var DRAW = {
    /* --- por nivel --- */
    cometa: function (ctx, o) {
      /* A más velocidad, MÁS copias y no más separadas: a velocidad normal
       * son cuatro cada 7 px; la estela se alarga como las demás, pero
       * rellenando con copias nuevas para que no queden huecos. La
       * separación apenas crece. Se pintan de la más lejana a la más cerca. */
      var n = Math.max(2, Math.min(14, Math.round(4 * o.estira)));
      var sep = 7 * (0.85 + 0.15 * o.estira);
      ctx.fillStyle = o.c;
      for (var i = n; i >= 1; i--) {
        var q = (i - 1) / Math.max(1, n - 1);             // 0 = la más cerca, 1 = la última
        var p = o.back(sep * i);
        ctx.globalAlpha = 0.48 * Math.pow(1 - q, 1.3) + 0.06;
        pacPath(ctx, p.x, p.y, R - 0.8 - q * 2.6, DIR_ANGLE[p.d], o.half * 0.6);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      body(ctx, o);
    },

    holograma: function (ctx, o) {
      var fl = (o.t % 2.3) < 0.09;
      var x = o.x + (fl ? 1 : 0), y = o.y, a = DIR_ANGLE[o.d];
      ctx.save();
      pacPath(ctx, x, y, R, a, o.half);
      ctx.clip();
      ctx.globalAlpha = fl ? 0.16 : 0.32;
      ctx.fillStyle = o.c;
      ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
      ctx.globalAlpha = fl ? 0.5 : 1;
      ctx.fillStyle = mix(o.c, '#ffffff', 0.35);
      var phase = (Math.floor(o.t * 8) % 3) * 2;
      var top = Math.floor((y - R) * S / 6) * 6 + phase;
      for (var py = top; py < (y + R) * S; py += 6) ctx.fillRect(x - R, py / S, 2 * R, 2 / S);
      ctx.restore();
      ctx.globalAlpha = fl ? 0.4 : 0.85;
      ctx.strokeStyle = o.c;
      ctx.lineWidth = 1 / S;
      pacPath(ctx, x, y, R - 0.5 / S, a, o.half);
      ctx.stroke();
      ctx.globalAlpha = 1;

      /* el proyector: flota sobre la cabeza, no parpadea, y echa un cono de
       * luz hacia el cuerpo, que es lo que explica de dónde sale el holograma */
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      var lx = -0.6, base = R + 1.6;
      ctx.globalAlpha = fl ? 0.08 : 0.2;
      ctx.fillStyle = o.c;
      ctx.beginPath();
      ctx.moveTo(lx - 0.7, base); ctx.lineTo(lx + 0.7, base);
      ctx.lineTo(lx + 5.2, 0); ctx.lineTo(lx - 5.2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#8d96ab';
      ctx.fillRect(lx - 2.6, base + 0.4, 5.2, 1.7);
      ctx.fillStyle = '#c9d0de';
      ctx.fillRect(lx - 2.6, base + 1.6, 5.2, 0.5);
      ctx.fillStyle = '#4a5063';
      ctx.fillRect(lx - 3.2, base + 0.9, 0.6, 0.9);
      ctx.fillRect(lx + 2.6, base + 0.9, 0.6, 0.9);
      ctx.fillStyle = mix(o.c, '#ffffff', 0.5);
      ctx.fillRect(lx - 0.8, base - 0.2, 1.6, 0.7);
      ctx.restore();
    },

    glitch: function (ctx, o) {
      var a = DIR_ANGLE[o.d], on = (o.t % 1.7) < 0.2, k = Math.floor(o.t * 24);
      if (on) {
        var dx = 1 + (hash(k) % 3) * 0.5;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ff2050';
        pacPath(ctx, o.x - dx, o.y, R, a, o.half); ctx.fill();
        ctx.fillStyle = '#20e8ff';
        pacPath(ctx, o.x + dx, o.y, R, a, o.half); ctx.fill();
        ctx.globalAlpha = 1;
      }
      body(ctx, o);
      if (on) {
        var sy = (hash(k + 11) % 10) - 5, sh = (hash(k + 5) % 2) ? 2.5 : -2.5;
        ctx.save();
        ctx.beginPath(); ctx.rect(o.x - R - 4, o.y + sy, 2 * R + 8, 2); ctx.clip();
        ctx.fillStyle = '#000';
        pacPath(ctx, o.x, o.y, R, a, o.half); ctx.fill();
        ctx.fillStyle = o.c;
        pacPath(ctx, o.x + sh, o.y, R, a, o.half); ctx.fill();
        ctx.restore();
      }
    },

    /* Pac-Man ES la llama: cuerpo y lenguas son una sola forma del color del
     * jugador, que hacia la cola se va poniendo al rojo y se apaga; y el
     * núcleo claro nace dentro del cuerpo, no detrás de él. */
    fuego: function (ctx, o) {
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      var t = o.t, h = o.half;
      function wob(i, base, amp) {
        return base + Math.sin(t * 17 + i * 2.1) * amp + Math.sin(t * 29 + i * 1.3) * amp * 0.4;
      }
      /* UNA sola silueta: la mitad de delante es el Pac-Man (con su boca) y la
       * de atrás se abre en tres lenguas. El borde de arriba y el de abajo
       * salen tangentes al círculo, así que no hay escalón donde se juntan. */
      var L1 = wob(0, 5.5, 1.4) * o.estira, L2 = wob(1, 8.5, 1.6) * o.estira, L3 = wob(2, 5.5, 1.4) * o.estira;   // las llamas se estiran con la velocidad
      var t1 = 3.4 + Math.sin(t * 11) * 0.8, t2 = Math.sin(t * 13 + 1.7) * 1.0, t3 = -3.4 + Math.sin(t * 12 + 3.1) * 0.8;
      function silhouette() {
        ctx.beginPath();
        ctx.moveTo(0, R);
        if (h > 0) {
          ctx.arc(0, 0, R, Math.PI / 2, h, true);
          ctx.lineTo(0, 0);
          ctx.lineTo(R * Math.cos(-h), R * Math.sin(-h));
          ctx.arc(0, 0, R, -h, -Math.PI / 2, true);
        } else {
          ctx.arc(0, 0, R, Math.PI / 2, -Math.PI / 2, true);
        }
        ctx.quadraticCurveTo(-R - L3 * 0.3, -R, -R - L3, t3);
        ctx.quadraticCurveTo(-R - L3 * 0.2, -2.1, -R - 0.4, -1.6);
        ctx.quadraticCurveTo(-R - L2 * 0.45, -1.3, -R - L2, t2);
        ctx.quadraticCurveTo(-R - L2 * 0.45, 1.3, -R - 0.4, 1.6);
        ctx.quadraticCurveTo(-R - L1 * 0.2, 2.1, -R - L1, t1);
        ctx.quadraticCurveTo(-R - L1 * 0.3, R, 0, R);
        ctx.closePath();
      }
      /* el degradado llega justo hasta la punta más larga: con un largo fijo,
       * al estirarse con la velocidad las llamas se cortaban de golpe */
      var punta = -R - Math.max(L1, L2, L3) - 0.5;
      var g = ctx.createLinearGradient(0, 0, punta, 0);
      g.addColorStop(0, o.c);
      g.addColorStop(Math.min(0.6, (R + 3) / -punta), o.c);
      g.addColorStop(0.8, mix(o.c, '#ff4000', 0.6));
      g.addColorStop(1, mix('#ff4000', '#ff4000', 0, 0));
      silhouette();
      ctx.fillStyle = g;
      ctx.fill();

      /* núcleo: frente redondeado dentro del cuerpo, sin bordes rectos, y
       * recortado a la silueta para que nunca pinte dentro de la boca */
      silhouette();
      ctx.clip();
      var c1 = (2.3 + Math.sin(t * 19) * 0.6) * o.estira, c2 = (5.2 + Math.sin(t * 23 + 1) * 0.9) * o.estira, c3 = (2.3 + Math.sin(t * 21 + 2) * 0.6) * o.estira;
      var cg = ctx.createLinearGradient(1.6, 0, -R - c2 - 0.5, 0);
      cg.addColorStop(0, mix(o.c, '#ffffff', 0.62));
      cg.addColorStop(0.55, mix(o.c, '#ffffff', 0.4));
      cg.addColorStop(1, mix(o.c, '#ffffff', 0.4, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(-1.2, 2.6);
      ctx.bezierCurveTo(1.4, 2.6, 1.4, -2.6, -1.2, -2.6);
      ctx.quadraticCurveTo(-4.5, -2.6, -R - c3, -1.9 + Math.sin(t * 9) * 0.4);
      ctx.quadraticCurveTo(-R + 0.2, -1.2, -R, -0.7);
      ctx.quadraticCurveTo(-R - c2 * 0.4, -0.6, -R - c2, Math.sin(t * 10 + 2) * 0.6);
      ctx.quadraticCurveTo(-R - c2 * 0.4, 0.6, -R, 0.7);
      ctx.quadraticCurveTo(-R + 0.2, 1.2, -R - c1, 1.9 + Math.sin(t * 8 + 1) * 0.4);
      ctx.quadraticCurveTo(-4.5, 2.6, -1.2, 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    prisma: function (ctx, o) {
      /* Ocho colores con el mismo tiempo cada uno: se queda ~1 s en cada
       * color y pasa al siguiente en ~0,5 s. Con un giro de tono continuo el
       * amarillo y el morado, que ocupan poco del círculo, pasaban volando.
       * El degradado va un poco por delante: quieto se ve un color
       * macizo, y en el cambio el color nuevo cruza el cuerpo en diagonal. */
      var a = DIR_ANGLE[o.d], u = o.t / 1.4;
      ctx.save();
      pacPath(ctx, o.x, o.y, R, a, o.half);
      ctx.clip();
      var g = ctx.createLinearGradient(o.x + R, o.y - R, o.x - R, o.y + R);
      g.addColorStop(0, prismaColor(u + 0.12));
      g.addColorStop(1, prismaColor(u));
      ctx.fillStyle = g;
      ctx.fillRect(o.x - R, o.y - R, 2 * R, 2 * R);

      /* EFECTO DE CAMBIO, dos tiempos:
       * 1) mientras el color nuevo cruza el cuerpo, un filo de luz blanca
       *    va delante de él, en la misma diagonal;
       * 2) cuando llega, saltan tres destellos alrededor del cuerpo. */
      var i = Math.floor(u), f = u - i;
      if (f >= 0.63) {
        var p = (f - 0.63) / 0.37;
        var cxL = o.x + R - p * 2 * R, cyL = o.y - R + p * 2 * R;
        ctx.globalAlpha = 0.85 * Math.sin(p * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cxL - 9 - 0.9, cyL - 9 + 0.9);
        ctx.lineTo(cxL + 9 - 0.9, cyL + 9 + 0.9);
        ctx.lineTo(cxL + 9 + 0.9, cyL + 9 - 0.9);
        ctx.lineTo(cxL - 9 + 0.9, cyL - 9 - 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      var dd = (f >= 0.9) ? f - 1 : f;
      if (dd > -0.1 && dd < 0.18) {
        var life = (dd + 0.1) / 0.28, amp = Math.sin(life * Math.PI);
        var paso = i + (f >= 0.9 ? 1 : 0), base = paso * 1.3;
        for (var k = 0; k < 3; k++) {
          var ang = base + k * 2.1, rr = R + 1.4 + life * 1.4;
          destello(ctx, o.x + Math.cos(ang) * rr, o.y + Math.sin(ang) * rr, 0.6 + amp * 1.3, amp);
        }
      }
    },

    /* RASTRO: moto de luz. Cuerpo negro con el borde de neón del color del
     * jugador y un anillo partido que gira dentro. Detrás deja una estela de
     * luz que sigue el camino (también al doblar) y se apaga por tramos. */
    rastro: function (ctx, o) {
      var h = o.half, i, k, dd;
      /* la estela es por dónde pasó en el último instante: a más velocidad,
       * más larga */
      var LARGO = 44 * o.estira, PASO = 2, TRAMOS = 7, desde = R - 1;
      var nucleo = mix(o.c, '#ffffff', 0.7);
      ctx.save();
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      /* la estela va por tramos de brillo constante: con un trazo por
       * segmento, los solapes del alfa dejaban cuentas brillantes */
      for (var capa = 0; capa < 2; capa++) {
        for (i = 0; i < TRAMOS; i++) {
          var d0 = desde + (LARGO - desde) * i / TRAMOS;
          var d1 = desde + (LARGO - desde) * (i + 1) / TRAMOS;
          k = 1 - i / TRAMOS;
          ctx.beginPath();
          var p = o.back(d0);
          ctx.moveTo(p.x, p.y);
          for (dd = d0 + PASO; dd < d1; dd += PASO) { p = o.back(dd); ctx.lineTo(p.x, p.y); }
          p = o.back(d1);
          ctx.lineTo(p.x, p.y);
          if (capa === 0) {
            ctx.shadowColor = o.c;
            ctx.shadowBlur = 8;
            ctx.globalAlpha = 0.9 * k;
            ctx.strokeStyle = o.c;
            ctx.lineWidth = 2.4;
          } else {
            ctx.shadowBlur = 0;
            ctx.globalAlpha = k;
            ctx.strokeStyle = nucleo;
            ctx.lineWidth = 0.9;
          }
          ctx.stroke();
        }
      }
      ctx.restore();

      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      pacPath(ctx, 0, 0, R - 0.4, 0, h);
      ctx.fillStyle = '#050b12';
      ctx.fill();
      ctx.shadowColor = o.c;
      ctx.shadowBlur = 5;
      ctx.strokeStyle = o.c;
      ctx.lineWidth = 1.0;
      ctx.stroke();
      ctx.shadowBlur = 0;

      /* anillo partido que gira, sin meterse en la boca */
      ctx.save();
      ctx.beginPath();
      ctx.rect(-8, -8, 16, 16);
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 8, -h - 0.3, h + 0.3);
      ctx.closePath();
      ctx.clip('evenodd');
      ctx.strokeStyle = mix(o.c, '#ffffff', 0.25);
      ctx.lineWidth = 2 / S;
      var giro = o.t * 1.6;
      for (i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 3.4, giro + i * 2.094, giro + i * 2.094 + 1.35);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = nucleo;
      ctx.beginPath(); ctx.arc(-0.6, 0, 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    /* MOÑITO: un moño rosado en la cabeza, echado un poco hacia atrás, con
     * dos lazos, las cintas colgando y un brillo en cada lazo. Siempre rosa,
     * con un filo oscuro para que se separe del cuerpo; se mece al correr. */
    mono: function (ctx, o) {
      body(ctx, o);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(-1.4, R - 0.5);
      ctx.rotate(-0.25 + Math.sin(o.t * 8) * 0.08);
      ctx.lineJoin = 'round';
      var rosa = '#ff4f9a', filo = '#a3124f', claro = '#ffb3d3', nudo = '#e0307c';
      ctx.strokeStyle = filo;
      ctx.lineWidth = 1.2 / S;
      /* cintas */
      ctx.fillStyle = nudo;
      ctx.beginPath();
      ctx.moveTo(-0.2, -0.3); ctx.lineTo(-1.5, -2.3); ctx.lineTo(-0.5, -2.0); ctx.closePath();
      ctx.moveTo(0.2, -0.3); ctx.lineTo(1.5, -2.3); ctx.lineTo(0.5, -2.0); ctx.closePath();
      ctx.fill(); ctx.stroke();
      /* lazos */
      ctx.fillStyle = rosa;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-1.1, 2.7, -3.7, 2.5, -3.5, 0.3);
      ctx.bezierCurveTo(-3.4, -1.6, -1.2, -1.4, 0, 0);
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(1.1, 2.7, 3.7, 2.5, 3.5, 0.3);
      ctx.bezierCurveTo(3.4, -1.6, 1.2, -1.4, 0, 0);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = claro;
      ctx.beginPath(); ctx.ellipse(-2.3, 0.95, 0.75, 0.42, 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(2.3, 0.95, 0.75, 0.42, -0.35, 0, Math.PI * 2); ctx.fill();
      /* nudo */
      ctx.fillStyle = nudo;
      ctx.beginPath(); ctx.ellipse(0, 0.1, 0.95, 1.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    },

    /* --- por logro --- */
    /* La corona es parte del cuerpo: misma forma, mismo color, sin perfil.
     * Nace de dentro de la cabeza, así que no hay costura entre las dos. */
    corona: function (ctx, o) {
      body(ctx, o);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      var cx = -1, b = R - 2.0, w = 3.5, h = 5.2;
      ctx.beginPath();
      ctx.moveTo(cx - w, b);
      ctx.lineTo(cx - w, b + h - 0.5);
      ctx.lineTo(cx - w * 0.45, b + h * 0.58);
      ctx.lineTo(cx, b + h);
      ctx.lineTo(cx + w * 0.45, b + h * 0.58);
      ctx.lineTo(cx + w, b + h - 0.5);
      ctx.lineTo(cx + w, b);
      ctx.closePath();
      ctx.fillStyle = o.c;
      ctx.fill();
      /* gemita roja en la franja de la corona, bajo la punta del centro */
      var gs = R - 0.5;
      ctx.fillStyle = '#ff1a3c';
      ctx.beginPath();
      ctx.moveTo(cx, gs + 1.0); ctx.lineTo(cx + 0.9, gs);
      ctx.lineTo(cx, gs - 1.0); ctx.lineTo(cx - 0.9, gs);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd0d8';
      ctx.fillRect(cx - 0.45, gs + 0.1, 0.45, 0.45);
      ctx.restore();
    },

    /* Oro pulido: franjas de reflejo con un horizonte oscuro marcado, volumen
     * de esfera hacia los bordes, un punto de luz fijo y el destello. */
    dorado: function (ctx, o) {
      var a = DIR_ANGLE[o.d], x = o.x, y = o.y;
      ctx.save();
      pacPath(ctx, x, y, R, a, o.half);
      ctx.clip();
      var g = ctx.createLinearGradient(x - 2, y - R, x + 2, y + R);
      g.addColorStop(0, '#fffbe3');
      g.addColorStop(0.16, '#ffe680');
      g.addColorStop(0.4, '#e2a91c');
      g.addColorStop(0.49, '#6e4600');
      g.addColorStop(0.55, '#a87400');
      g.addColorStop(0.76, '#ffd24a');
      g.addColorStop(0.9, '#c68c0c');
      g.addColorStop(1, '#5c3a00');
      ctx.fillStyle = g;
      ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
      var rg = ctx.createRadialGradient(x - 1.5, y - 1.5, R * 0.45, x, y, R);
      rg.addColorStop(0, 'rgba(60,30,0,0)');
      rg.addColorStop(1, 'rgba(60,30,0,.35)');
      ctx.fillStyle = rg;
      ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath(); ctx.ellipse(x - 2.4, y - 3.4, 1.5, 0.75, -0.6, 0, Math.PI * 2); ctx.fill();
      var c = (o.t % 2.4) / 0.55;
      if (c < 1) {
        var bx = x - R - 4 + c * (2 * R + 8);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#fffdf0';
        ctx.beginPath();
        ctx.moveTo(bx + 2, y - R); ctx.lineTo(bx + 3.6, y - R);
        ctx.lineTo(bx - 0.4, y + R); ctx.lineTo(bx - 2, y + R);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    fantasma: function (ctx, o) {
      var a = DIR_ANGLE[o.d], x = o.x, y = o.y;
      ctx.save();
      if (o.half > 0) {
        ctx.beginPath();
        ctx.rect(x - 12, y - 12, 24, 24);
        ctx.moveTo(x, y);
        ctx.arc(x, y, R + 3, a - o.half, a + o.half);
        ctx.closePath();
        ctx.clip('evenodd');
      }
      /* mirando abajo, la boca caería sobre la falda: se le da la vuelta */
      if (o.d === 2) {
        ctx.translate(x, y);
        ctx.scale(1, -1);
        ctx.translate(-x, -y);
      }
      var fr = Math.floor(o.t * 7) % 2, top = y - 0.5, bot = y + R, n = 6;
      ctx.beginPath();
      ctx.arc(x, top, R, Math.PI, 0);
      ctx.lineTo(x + R, bot);
      for (var i = 1; i <= n; i++) {
        var up = ((i + fr) % 2) === 1;
        ctx.lineTo(x + R - (2 * R) * i / n, up ? bot - 2 : bot);
      }
      ctx.closePath();
      ctx.fillStyle = o.c;
      ctx.fill();
      ctx.restore();
      var e = eyeScreen(o);
      var ex = x + e.ox * 2.6 - e.vx * 0.8, ey = y + e.oy * 2.6 - e.vy * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(ex, ey, 1.6, 1.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2121ff';
      ctx.beginPath(); ctx.arc(ex + e.vx * 0.7, ey + e.vy * 0.7, 0.95, 0, Math.PI * 2); ctx.fill();
    },

    /* CALAVERA: calavera de caricatura, de perfil. Cabezota casi redonda,
     * mandíbula pequeña y gorda, cuenca enorme, nariz de corazón al revés y
     * dientes como bultos redondos que encajan entre sí al cerrar. Contorno
     * grueso. Comer ES abrir la mandíbula (gira sobre la bisagra de atrás
     * con la fase de boca), y al correr bota: se estira al subir y se
     * aplasta al caer. El hueso lleva un toque del color del jugador. */
    calavera: function (ctx, o) {
      var ph = (o.half <= 0) ? 0 : (o.half < 0.3 ? 1 : 2);
      var th = [0, 12, 24][ph] * Math.PI / 180;
      var blanco = hex(mix('#f8f8f4', o.c, 0.1));
      var gris = hex(mix('#b4b4ae', o.c, 0.14));
      var tinta = '#121212';
      var alto = Math.abs(Math.sin(o.t * 8));                // 0 en el suelo, 1 arriba
      var aplasta = Math.pow(1 - alto, 4) * 0.06 - alto * 0.025;
      var vaiven = Math.sin(o.t * 6.5) * 0.09;

      /* gira entera hacia donde avanza, como el Pac-Man: subiendo mira
       * arriba y bajando mira abajo, con la coronilla hacia atrás */
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(0, -5.6 + alto * 0.5);                     // pie de la calavera
      ctx.scale(1 + aplasta, 1 - aplasta);
      ctx.rotate(vaiven);
      ctx.translate(0.1, 5.3);
      ctx.scale(0.88, 0.88);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      function pieza(camino, sf, ss) {
        camino();
        ctx.fillStyle = gris;
        ctx.fill();
        ctx.save();
        camino();
        ctx.clip();
        ctx.translate(sf, ss);
        camino();
        ctx.fillStyle = blanco;
        ctx.fill();
        ctx.restore();
        camino();
        ctx.strokeStyle = tinta;
        ctx.lineWidth = 2.2 / S;
        ctx.stroke();
      }

      /* ---- mandíbula ---- */
      function mandibula() {
        ctx.beginPath();
        ctx.moveTo(-1.3, -1.2);
        ctx.lineTo(1.5, -3.1);
        for (var i = 0; i < 3; i++) {
          var x0 = 1.5 + i * 1.13, x1 = x0 + 1.13;
          ctx.bezierCurveTo(x0, -2.15, x1, -2.15, x1, -3.1);
        }
        ctx.quadraticCurveTo(5.3, -3.3, 5.0, -4.2);
        ctx.quadraticCurveTo(4.6, -5.4, 3.0, -5.3);
        ctx.quadraticCurveTo(-1.2, -5.2, -1.9, -3.5);
        ctx.quadraticCurveTo(-2.2, -1.9, -1.3, -1.2);
        ctx.closePath();
      }
      ctx.save();
      ctx.translate(-1.2, -1.4);
      ctx.rotate(-th);
      ctx.translate(1.2, 1.4);
      pieza(mandibula, 0.6, 0.7);
      ctx.restore();

      /* ---- cráneo ---- */
      function craneo() {
        ctx.beginPath();
        ctx.moveTo(4.9, -0.7);
        ctx.quadraticCurveTo(6.0, 1.2, 4.7, 4.2);
        ctx.quadraticCurveTo(2.7, 7.0, -0.8, 6.9);
        ctx.quadraticCurveTo(-6.2, 6.5, -6.1, 1.4);
        ctx.quadraticCurveTo(-6.0, -2.7, -2.4, -2.6);
        ctx.quadraticCurveTo(-1.5, -2.4, -1.2, -1.7);
        ctx.lineTo(0.9, -1.7);
        for (var i = 0; i < 3; i++) {
          var x0 = 0.9 + i * 1.27, x1 = x0 + 1.27;
          ctx.bezierCurveTo(x0, -2.8, x1, -2.8, x1, -1.7);
        }
        ctx.quadraticCurveTo(5.3, -1.6, 4.9, -0.7);
        ctx.closePath();
      }
      pieza(craneo, 1.1, 1.1);

      /* cuenca enorme */
      ctx.fillStyle = tinta;
      ctx.beginPath(); ctx.ellipse(2.1, 2.9, 2.1, 2.35, 0.15, 0, Math.PI * 2); ctx.fill();

      /* nariz: corazón al revés */
      ctx.beginPath();
      ctx.moveTo(4.0, -1.35);
      ctx.quadraticCurveTo(3.1, -0.6, 3.35, -0.05);
      ctx.quadraticCurveTo(3.68, 0.25, 4.0, -0.12);
      ctx.quadraticCurveTo(4.32, 0.25, 4.65, -0.05);
      ctx.quadraticCurveTo(4.9, -0.6, 4.0, -1.35);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    },

    brujas: function (ctx, o) {
      body(ctx, o);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-0.6, 2.2, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(o.t * 5);
      ctx.fillStyle = '#ff3b3b';
      ctx.beginPath(); ctx.arc(-0.1, 2.2, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 / S;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-R + 0.4, 0.8); ctx.lineTo(-4, -0.4); ctx.lineTo(-3, 0.6); ctx.lineTo(-1.9, -0.7);
      var h = o.half, dd = [0.45 * R, 0.75 * R];
      for (var i = 0; i < dd.length; i++) {
        var pf = dd[i] * Math.cos(h), ps = -dd[i] * Math.sin(h);
        var nf = -Math.sin(h), ns = -Math.cos(h);
        ctx.moveTo(pf - nf * 0.2, ps - ns * 0.2);
        ctx.lineTo(pf + nf * 1.8, ps + ns * 1.8);
      }
      ctx.stroke();

      /* sombrero de bruja: ala ancha, copa doblada hacia atrás y cinta */
      ctx.translate(1.2, 1.5);
      ctx.fillStyle = '#4a2370';
      ctx.beginPath(); ctx.ellipse(-0.8, R - 1.6, 5.2, 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-3.4, R - 1.4);
      ctx.quadraticCurveTo(-2.4, R + 2.6, -5.6, R + 4.2);
      ctx.quadraticCurveTo(-0.6, R + 3.0, 1.6, R - 1.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b18cff';
      ctx.beginPath();
      ctx.moveTo(-3.2, R - 0.9); ctx.lineTo(1.4, R - 0.9); ctx.lineTo(1.1, R + 0.2); ctx.lineTo(-2.9, R + 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    /* rabito largo que acaba en una cereza pequeña, siempre roja */
    cereza: function (ctx, o) {
      body(ctx, o);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      /* el rabito sale de la cabeza y se abre en dos: uno corto con la hoja
       * y otro largo que baja por detrás hasta la cereza, como una cola */
      var fx = -1.6, fs = R + 1.6;               // horquilla
      /* la cereza cuelga lejos, detrás del cuerpo, y la cola se mece: la
       * punta va por delante y el tramo del medio la sigue con retraso */
      /* ahora cuelga hasta el suelo: la cereza roza la línea de abajo del
       * cuerpo y se mece adelante y atrás como un péndulo */
      var swing = Math.sin(o.t * 5);
      var lag = Math.sin(o.t * 5 - 0.9) * 1.2;
      var cfx = -R - 5.0 + swing * 1.4;
      var cfs = -R + 1.9 + Math.abs(swing) * 0.5;
      ctx.strokeStyle = '#3fae3f';
      ctx.lineWidth = 2.5 / S;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-0.6, R - 1.2);
      ctx.quadraticCurveTo(-0.6, R + 0.8, fx, fs);
      ctx.moveTo(fx, fs);
      ctx.quadraticCurveTo(-0.4, R + 2.6, 0.9, R + 2.4);
      ctx.moveTo(fx, fs);
      ctx.bezierCurveTo(-6.5, R + 3.4, -R - 6.5 + lag, 1.0, cfx + 0.2, cfs + 1.8);
      ctx.stroke();
      ctx.fillStyle = '#5ad65a';
      ctx.beginPath();
      ctx.moveTo(0.6, R + 2.4);
      ctx.quadraticCurveTo(2.0, R + 3.7, 3.4, R + 2.2);
      ctx.quadraticCurveTo(2.0, R + 1.5, 0.6, R + 2.4);
      ctx.fill();
      ctx.fillStyle = '#e8112d';
      ctx.beginPath(); ctx.arc(cfx, cfs, 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cfx - 0.9, cfs + 0.3, 0.7, 0.7);
      ctx.restore();
    },

    /* tres crías de Pac-Man, del color de cada compañero, en fila detrás */
    escuadra: function (ctx, o) {
      var cols = o.team, dists = [9, 14.5, 20];
      for (var i = cols.length - 1; i >= 0; i--) {
        var p = o.back(dists[i]);
        ctx.fillStyle = cols[i];
        pacPath(ctx, p.x, p.y, 2.5, DIR_ANGLE[p.d], o.half);
        ctx.fill();
      }
      body(ctx, o);
    },

    /* --- extravagantes --- */
    tiburon: function (ctx, o) {
      var ang = [0, 14, 28][fase(o)] * Math.PI / 180;
      var piel = hex(mix(o.c, '#6f8ea6', 0.5)), pielClara = mix(piel, '#ffffff', 0.22), pielOsc = mix(piel, '#0b1622', 0.35);
      var vientre = '#f1eee4';
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.rotate(Math.sin(o.t * 9) * 0.04);
      ctx.scale(1.22, 1.22);   // más grande: a 1,06 se veía chico al lado de las demás
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(-2.8, 2.6); ctx.lineTo(0.4, 2.9);
        ctx.quadraticCurveTo(-1.0, 4.3, -3.0, 6.2); ctx.quadraticCurveTo(-2.5, 4.1, -2.8, 2.6); ctx.closePath();
      }, piel, pielOsc, 0.4, 0.4);
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(-0.6, -1.6); ctx.lineTo(-3.2, -4.4); ctx.lineTo(-2.4, -1.4); ctx.closePath();
      }, piel, pielOsc, 0.3, 0.3);
      ctx.fillStyle = '#120a0c';
      ctx.beginPath(); ctx.moveTo(0.8, -0.9); ctx.lineTo(5.6, -0.5); ctx.lineTo(5.8, -3.4); ctx.lineTo(0.8, -1.2); ctx.closePath(); ctx.fill();
      var cuerpo = new Path2D();
      cuerpo.moveTo(6.5, 0.2);
      cuerpo.quadraticCurveTo(5.8, 2.7, 2.0, 3.0); cuerpo.quadraticCurveTo(-2.5, 3.2, -5.0, 1.2);
      cuerpo.lineTo(-6.7, 3.5); cuerpo.lineTo(-6.0, 0.0); cuerpo.lineTo(-6.9, -2.9); cuerpo.lineTo(-4.8, -0.9);
      cuerpo.quadraticCurveTo(-1.5, -2.6, 0.9, -0.95); cuerpo.lineTo(5.5, -0.55);
      cuerpo.quadraticCurveTo(6.5, -0.4, 6.5, 0.2); cuerpo.closePath();
      /* la mandíbula nace por dentro del cuerpo, detrás de la comisura */
      var mand = new Path2D();
      mand.moveTo(-0.6, -0.9); mand.lineTo(5.3, -0.75);
      mand.quadraticCurveTo(5.5, -2.1, 3.9, -2.6); mand.quadraticCurveTo(1.6, -3.0, -0.6, -1.9); mand.closePath();
      rostro(ctx, cuerpo, mand, 0.9, -0.95, ang, piel, piel, 0, 0, 1.6);
      /* el vientre blanco sigue por la mandíbula y se mueve con ella */
      ctx.save(); ctx.clip(cuerpo);
      ctx.fillStyle = pielClara;
      ctx.beginPath(); ctx.ellipse(0.5, 2.5, 5.5, 1.0, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = vientre;
      ctx.beginPath(); ctx.ellipse(0.6, -1.6, 6.2, 1.5, 0.05, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.strokeStyle = pielOsc;
      ctx.beginPath();
      [0.2, -0.5, -1.2].forEach(function (f) { ctx.moveTo(f, 1.4); ctx.quadraticCurveTo(f - 0.5, 0.4, f, -0.6); });
      ctx.stroke();
      ctx.restore();
      /* el vientre de la mandíbula es EL MISMO óvalo que el del cuerpo, girado
       * con ella: cerrada, las dos franjas blancas casan en una sola; con uno
       * propio, más estrecho, la mandíbula parecía una pieza pegada debajo */
      ctx.save(); girarSobre(ctx, 0.9, -0.95, -ang); ctx.clip(mand);
      ctx.fillStyle = vientre;
      ctx.beginPath(); ctx.ellipse(0.6, -1.6, 6.2, 1.5, 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save(); girarSobre(ctx, 0.9, -0.95, -ang); dientes(ctx, 1.8, 5.1, -0.95, 5, 0.75); ctx.restore();
      dientes(ctx, 2.0, 5.3, -0.55, 5, -0.75);
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(3.8, 1.3, 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(3.85, 1.4, 0.3, 0.3);
      ctx.restore();
    },

    cofre: function (ctx, o) {
      var fz = fase(o), ang = [0, 15, 28][fz] * Math.PI / 180, t = o.t;
      var maderaClara = '#c47a3e', maderaOsc = '#6b3b1c';
      var oro = hex(mix('#e8bd45', o.c, 0.35)), oroOsc = mix(oro, '#5a3a00', 0.45);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(0, 0.9 + Math.abs(Math.sin(t * 7)) * 0.3);
      ctx.scale(0.98, 0.98);   // un 15 % más grande
      /* por dentro: oscuro, con dos ojos amarillos */
      ctx.fillStyle = '#2a0710';
      ctx.fillRect(-4.9, -0.6, 9.8, 4.3);
      if (ang > 0) {
        ctx.fillStyle = '#ffe14d';
        ctx.beginPath(); ctx.ellipse(0.6, 0.7, 0.35, 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(1.9, 0.7, 0.35, 0.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      piezaX(ctx, function () { roundRect(ctx, -5, -5.4, 10, 4.9, 0.8); }, maderaClara, maderaOsc, 0.6, 0.6);
      ctx.strokeStyle = maderaOsc; ctx.lineWidth = 1.2 / S;
      ctx.beginPath(); ctx.moveTo(-4.6, -3.0); ctx.lineTo(4.6, -3.0); ctx.stroke();
      ctx.fillStyle = oro;
      ctx.fillRect(-3.2, -5.4, 1.0, 4.9); ctx.fillRect(2.2, -5.4, 1.0, 4.9);
      contorno(ctx, 1); ctx.strokeRect(-3.2, -5.4, 1.0, 4.9); ctx.strokeRect(2.2, -5.4, 1.0, 4.9);
      dientes(ctx, -4.4, 4.4, -0.5, 7, 0.8);
      ctx.fillStyle = oro; ctx.fillRect(4.2, -2.4, 1.1, 1.6);
      contorno(ctx, 1); ctx.strokeRect(4.2, -2.4, 1.1, 1.6);
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(4.75, -1.35, 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(4.65, -2.0, 0.2, 0.6);
      ctx.save();
      girarSobre(ctx, -5, -0.5, ang);
      function tapa() {
        ctx.beginPath(); ctx.moveTo(-5, -0.5); ctx.lineTo(5, -0.5); ctx.lineTo(5, 1.8);
        ctx.quadraticCurveTo(5, 3.9, 2.6, 3.9); ctx.lineTo(-2.6, 3.9); ctx.quadraticCurveTo(-5, 3.9, -5, 1.8); ctx.closePath();
      }
      piezaX(ctx, tapa, maderaClara, maderaOsc, 0.6, 0.5);
      ctx.save(); tapa(); ctx.clip();
      ctx.fillStyle = oro; ctx.fillRect(-3.2, -0.5, 1.0, 4.6); ctx.fillRect(2.2, -0.5, 1.0, 4.6);
      ctx.fillStyle = oroOsc; ctx.fillRect(-3.2, 3.2, 1.0, 0.7); ctx.fillRect(2.2, 3.2, 1.0, 0.7);
      ctx.restore();
      tapa(); contorno(ctx, 1.6); ctx.stroke();
      dientes(ctx, -4.4, 4.4, -0.5, 7, -0.8);
      ctx.restore();
      /* CON LA Q suelta monedas A SU ALREDEDOR: salen de la tapa abierta en
       * todas direcciones, girando (se ven de canto y de cara) y apagándose
       * según se alejan. Sin la Q, ni una. */
      if (o.muerde) {
        var N = 8;
        for (var k = 0; k < N; k++) {
          var fr = ((t * 1.8) + k / N) % 1;
          var angM = k * Math.PI * 2 / N + 0.35;
          var rad = 2.5 + fr * 7.5;
          var mx = Math.cos(angM) * rad, my = 0.8 + Math.sin(angM) * rad * 0.85 - fr * fr * 1.5;
          ctx.globalAlpha = 1 - fr * fr;
          ctx.fillStyle = oro;
          ctx.beginPath();
          ctx.ellipse(mx, my, 0.75 * Math.abs(Math.cos(t * 12 + k * 1.7)) + 0.15, 0.75, 0, 0, Math.PI * 2);
          ctx.fill(); contorno(ctx, 1); ctx.stroke();
          ctx.fillStyle = '#fff6c0';
          ctx.fillRect(mx - 0.15, my + 0.1, 0.3, 0.3);
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },

    dragon: function (ctx, o) {
      var fz = fase(o), t = o.t, k;
      /* FUEGO SOLO CON LA Q (el mordisco): la boca se abre del todo y sale la
       * llamarada mientras dura. Sin la Q mastica normal y solo echa humo. */
      var sopla = !!o.muerde, pf = (t * 1.25) % 1;
      var crece = 1, apaga = 1;
      var ang = (sopla ? 28 : [0, 14, 26][fz]) * Math.PI / 180;
      var esc = hex(mix(o.c, '#3fae5a', 0.4)), escOsc = mix(esc, '#0d2410', 0.45);
      var vientre = '#f0d27a', cuerno = '#efe6cf';
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.scale(1.13, 1.13);   // otro 15 % más grande
      ctx.translate(0, -0.2);
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(-2.4, 3.8); ctx.quadraticCurveTo(-4.8, 6.4, -6.8, 5.6);
        ctx.quadraticCurveTo(-4.8, 5.0, -3.8, 3.2); ctx.closePath();
      }, cuerno, '#bdb193', 0.3, 0.3);
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(-0.8, 4.2); ctx.quadraticCurveTo(-1.8, 6.6, -3.6, 6.6);
        ctx.quadraticCurveTo(-2.2, 5.4, -1.9, 3.9); ctx.closePath();
      }, cuerno, '#bdb193', 0.3, 0.3);
      ctx.beginPath();
      ctx.moveTo(-5.5, -0.4); ctx.lineTo(-7.0, -1.0); ctx.lineTo(-5.3, -1.7); ctx.closePath();
      ctx.moveTo(-4.9, -2.3); ctx.lineTo(-6.4, -3.5); ctx.lineTo(-4.3, -3.1); ctx.closePath();
      ctx.fillStyle = escOsc; ctx.fill(); contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = '#120a0c';
      ctx.beginPath(); ctx.moveTo(-0.6, -0.7); ctx.lineTo(6.1, -0.4); ctx.lineTo(6.0, -3.4); ctx.lineTo(-0.6, -1.0); ctx.closePath(); ctx.fill();
      if (sopla) {
        /* mientras sopla, el hueco del hocico entero arde por dentro */
        var bg = ctx.createRadialGradient(5.2, -1.9, 0.2, 4.2, -1.8, 4.2);
        bg.addColorStop(0, 'rgba(255,250,215,' + apaga + ')');
        bg.addColorStop(0.45, 'rgba(255,205,60,' + (0.95 * apaga) + ')');
        bg.addColorStop(1, 'rgba(255,100,20,' + (0.7 * apaga) + ')');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(-0.6, -0.8); ctx.lineTo(6.3, -0.4); ctx.lineTo(6.2, -3.8); ctx.lineTo(-0.6, -1.0); ctx.closePath(); ctx.fill();
      }
      var cabeza = new Path2D();
      cabeza.moveTo(6.4, 0.4);
      cabeza.quadraticCurveTo(6.3, 1.9, 4.6, 1.95); cabeza.quadraticCurveTo(2.6, 2.1, 1.3, 3.4);
      cabeza.quadraticCurveTo(-0.6, 4.8, -3.2, 3.8); cabeza.quadraticCurveTo(-5.4, 2.9, -5.6, 0.4);
      cabeza.quadraticCurveTo(-5.7, -2.6, -3.6, -3.5); cabeza.lineTo(-1.2, -3.1); cabeza.lineTo(-0.6, -0.8);
      cabeza.lineTo(6.0, -0.4); cabeza.quadraticCurveTo(6.5, -0.2, 6.4, 0.4); cabeza.closePath();
      var mand = new Path2D();
      mand.moveTo(-2.4, -0.9); mand.lineTo(5.7, -0.6);
      mand.quadraticCurveTo(5.9, -1.8, 4.5, -2.1); mand.lineTo(0.4, -2.8);
      mand.quadraticCurveTo(-2.0, -3.0, -2.4, -0.9); mand.closePath();
      rostro(ctx, cabeza, mand, -0.6, -0.8, ang, esc, escOsc, 0.6, 0.6);
      ctx.save(); girarSobre(ctx, -0.6, -0.8, -ang);
      dientes(ctx, 3.9, 4.7, -0.65, 1, 0.9);
      dientes(ctx, 1.6, 2.2, -0.7, 1, 0.6);
      ctx.restore();
      ctx.strokeStyle = escOsc; ctx.lineWidth = 1 / S;
      ctx.beginPath();
      [[-3.0, 1.6], [-1.8, 2.7], [-3.8, -0.4], [-2.4, -1.6]].forEach(function (p) { ctx.moveTo(p[0] + 0.6, p[1]); ctx.arc(p[0], p[1], 0.6, 0, Math.PI); });
      ctx.stroke();
      dientes(ctx, 5.0, 5.8, -0.4, 1, -1.0);
      dientes(ctx, 2.6, 3.3, -0.5, 1, -0.7);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.ellipse(1.5, 2.3, 0.9, 0.65, -0.2, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.fillRect(1.55, 1.8, 0.28, 1.05);
      contorno(ctx, 2.2);
      ctx.beginPath(); ctx.moveTo(0.3, 3.3); ctx.lineTo(2.6, 2.9); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.ellipse(5.5, 1.15, 0.35, 0.22, 0.3, 0, Math.PI * 2); ctx.fill();
      for (k = 0; k < 2; k++) {
        var fh = ((t * 1.3) + k * 0.5) % 1;
        ctx.fillStyle = 'rgba(205,205,205,' + (0.55 * (1 - fh)) + ')';
        ctx.beginPath(); ctx.arc(5.9 + fh * 1.2, 1.6 + fh * 2.6, 0.4 + fh * 0.9, 0, Math.PI * 2); ctx.fill();
      }
      /* LLAMARADA: sale de dentro de la boca, del hueco entre las dos
       * mandíbulas, y sale recta hacia delante. Núcleo casi blanco pegado a la
       * boca, bolas de fuego que se alejan creciendo y pasando de amarillo a
       * naranja y rojo, y chispas sueltas. Se suma en modo luz, así que donde
       * se solapan brilla más. Crece al empezar y se apaga al final. */
      if (sopla) {
        /* de frente: recta hacia donde mira, desde el centro de la boca abierta
         * (por la bisectriz de las mandíbulas apuntaba hacia abajo) */
        var dir = 0;
        var ox = 3.2, oy = -1.75;
        var L = 10 * crece;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(dir);
        ctx.globalCompositeOperation = 'lighter';
        var halo = ctx.createRadialGradient(1.5, 0, 0, 1.5, 0, 4.5);
        halo.addColorStop(0, 'rgba(255,150,40,' + (0.45 * apaga) + ')');
        halo.addColorStop(1, 'rgba(255,150,40,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(1.5, 0, 4.5, 0, Math.PI * 2); ctx.fill();
        var bolas = [], N = 18, i;
        for (i = 0; i < N; i++) {
          var u = (pf * 2.4 + i / N) % 1;
          bolas.push({
            u: u,
            x: 0.8 + u * L,
            y: Math.sin(i * 7.31 + t * 23) * u * 1.4,
            r: 1.2 + u * 1.7
          });
        }
        bolas.sort(function (p, q) { return q.u - p.u; });
        bolas.forEach(function (bb) {
          var col = bb.u < 0.22 ? '255,246,200' : bb.u < 0.45 ? '255,210,63' : bb.u < 0.72 ? '255,122,26' : '216,50,30';
          ctx.fillStyle = 'rgba(' + col + ',' + (Math.pow(1 - bb.u, 0.7) * 0.8 * apaga) + ')';
          ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.r, 0, Math.PI * 2); ctx.fill();
        });
        var punta = Math.max(2.5, L * 0.6), vibra = Math.sin(t * 30) * 0.3;
        var ng = ctx.createLinearGradient(0, 0, punta, 0);
        ng.addColorStop(0, 'rgba(255,252,235,' + apaga + ')');
        ng.addColorStop(0.5, 'rgba(255,214,70,' + (0.9 * apaga) + ')');
        ng.addColorStop(1, 'rgba(255,122,26,0)');
        ctx.fillStyle = ng;
        /* nace con el alto del hueco del hocico (de la mandíbula de arriba a
         * la de abajo), se hincha un poco al salir y se afila en la punta */
        ctx.beginPath();
        ctx.moveTo(-0.4, 1.15);
        ctx.bezierCurveTo(1.6, 1.7, punta * 0.6, 1.3, punta, vibra);
        ctx.bezierCurveTo(punta * 0.6, -1.6, 1.6, -2.2, -0.4, -1.15);
        ctx.closePath(); ctx.fill();
        for (i = 0; i < 5; i++) {
          var ue = (pf * 1.7 + i * 0.21) % 1;
          ctx.fillStyle = 'rgba(255,224,138,' + ((1 - ue) * apaga) + ')';
          ctx.fillRect(2 + ue * L * 1.15, Math.sin(i * 3.7 + t * 9) * 2.2 * ue, 0.35, 0.35);
        }
        ctx.restore();
      }
      ctx.restore();
    },

    planta: function (ctx, o) {
      var ang = [0, 15, 30][fase(o)] * Math.PI / 180, t = o.t;
      var verde = '#56b947', verdeClaro = '#86dc5f', verdeOsc = '#2e7d32';
      var labio = hex(mix(o.c, '#ff3355', 0.45)), labioOsc = mix(labio, '#3a0010', 0.5);
      var vai = Math.sin(t * 8) * 0.5;
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.scale(1.03, 1.03);   // un 15 % más grande
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-2.8, -0.2); ctx.quadraticCurveTo(-5.2, -1.0 + vai * 0.4, -5.6, -4.2);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = verde; ctx.lineWidth = 0.9; ctx.stroke();
      piezaX(ctx, function () { ctx.beginPath(); ctx.ellipse(-4.3, -4.9, 1.6, 0.6, 0.35 + vai * 0.15, 0, Math.PI * 2); }, verde, verdeOsc, 0.2, 0.2, 1.2);
      piezaX(ctx, function () { ctx.beginPath(); ctx.ellipse(-6.6, -4.5, 1.4, 0.55, -0.6 - vai * 0.15, 0, Math.PI * 2); }, verde, verdeOsc, 0.2, 0.2, 1.2);
      ctx.fillStyle = '#0f1a0d';
      ctx.beginPath(); ctx.moveTo(-2.8, 0); ctx.lineTo(6.5, 3.4); ctx.lineTo(6.5, -3.4); ctx.closePath(); ctx.fill();
      function lobulo(signo) {
        ctx.save();
        girarSobre(ctx, -2.8, 0, signo * ang);
        ctx.scale(1, signo);
        piezaX(ctx, function () {
          ctx.beginPath(); ctx.moveTo(-2.8, 0.1);
          ctx.quadraticCurveTo(-2.2, 4.4, 2.2, 4.3); ctx.quadraticCurveTo(6.0, 3.9, 6.0, 0.1); ctx.closePath();
        }, verde, verdeOsc, 0.4, 0.6);
        ctx.fillStyle = labio;
        ctx.beginPath(); ctx.moveTo(-2.2, 0.15); ctx.quadraticCurveTo(1.8, 1.5, 5.8, 0.15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = verdeClaro;
        ctx.beginPath(); ctx.arc(-0.2, 2.8, 0.45, 0, Math.PI * 2); ctx.arc(2.2, 3.1, 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#e9f7b8'; ctx.lineWidth = 1.3 / S;
        ctx.beginPath();
        for (var i = 0; i < 7; i++) {
          var f = -1.3 + i * 1.1 + (signo < 0 ? 0.55 : 0);
          ctx.moveTo(f, 0.1); ctx.lineTo(f + 0.5, -1.3);
        }
        ctx.stroke();
        ctx.restore();
      }
      lobulo(-1);
      lobulo(1);
      ctx.restore();
    },

    robot: function (ctx, o) {
      var fz = fase(o), ang = [0, 14, 26][fz] * Math.PI / 180, t = o.t;
      var metal = '#c3ccd6', metalClaro = '#e4e9ef', metalOsc = '#7d8894';
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(0, -0.6);
      ctx.scale(1.03, 1.03);   // un 15 % más grande
      contorno(ctx, 1.8);
      ctx.beginPath(); ctx.moveTo(-1.2, 4.9); ctx.lineTo(-1.6, 6.2); ctx.stroke();
      var enc = (t % 1.2) < 0.6;
      ctx.fillStyle = enc ? o.c : mix(o.c, '#000000', 0.55);
      ctx.beginPath(); ctx.arc(-1.65, 6.5, 0.6, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = '#1d2228';
      ctx.fillRect(-4.2, -4.6, 8.8, 3.6);
      ctx.save();
      girarSobre(ctx, -4.2, -1.2, -ang);
      piezaX(ctx, function () { roundRect(ctx, -4.4, -4.6, 9.0, 3.4, 0.7); }, metal, metalOsc, 0.5, 0.5);
      [-0.3, 1.1, 2.5, 3.8].forEach(function (f) {
        ctx.fillStyle = metalClaro; ctx.fillRect(f, -2.05, 0.8, 0.8);
        contorno(ctx, 1); ctx.strokeRect(f, -2.05, 0.8, 0.8);
      });
      ctx.fillStyle = metalOsc; ctx.beginPath(); ctx.arc(-3.4, -3.6, 0.38, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
      ctx.restore();
      piezaX(ctx, function () { roundRect(ctx, -4.8, -1.2, 9.8, 6.1, 1.0); }, metal, metalOsc, 0.6, 0.6);
      [-0.3, 1.1, 2.5, 3.8].forEach(function (f) {
        ctx.fillStyle = metalClaro; ctx.fillRect(f, -1.2, 0.8, 0.8);
        contorno(ctx, 1); ctx.strokeRect(f, -1.2, 0.8, 0.8);
      });
      roundRect(ctx, 0.6, 1.4, 4.7, 2.2, 0.8);
      ctx.fillStyle = '#10161d'; ctx.fill(); contorno(ctx, 1.4); ctx.stroke();
      ctx.save();
      roundRect(ctx, 0.6, 1.4, 4.7, 2.2, 0.8); ctx.clip();
      var sx = 2.95 + Math.sin(t * 3) * 1.6;
      var vg = ctx.createRadialGradient(sx, 2.5, 0, sx, 2.5, 1.5);
      vg.addColorStop(0, mix(o.c, o.c, 0, 0.8)); vg.addColorStop(1, mix(o.c, o.c, 0, 0));
      ctx.fillStyle = vg; ctx.fillRect(0.6, 1.4, 4.7, 2.2);
      ctx.fillStyle = mix(o.c, '#ffffff', 0.6); ctx.fillRect(sx - 0.35, 2.15, 0.7, 0.7);
      ctx.restore();
      ctx.fillStyle = metalOsc; ctx.beginPath(); ctx.arc(-2.6, 1.9, 1.1, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3.1, 1.9); ctx.lineTo(-2.1, 1.9); ctx.moveTo(-2.6, 1.4); ctx.lineTo(-2.6, 2.4); ctx.stroke();
      ctx.fillStyle = metalOsc;
      ctx.beginPath(); ctx.arc(-4.0, 4.1, 0.28, 0, Math.PI * 2); ctx.arc(4.2, 4.1, 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    trex: function (ctx, o) {
      var fz = fase(o), ang = [0, 15, 28][fz] * Math.PI / 180, t = o.t;
      var piel = hex(mix(o.c, '#6fbf4a', 0.4)), pielOsc = mix(piel, '#10240a', 0.45), vientre = '#eadcab';
      var pisa = Math.abs(Math.sin(t * 6)) * 0.5;
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(0, -0.2 + pisa);
      ctx.scale(1.01, 1.01);   // un 15 % más grande
      ctx.fillStyle = '#120a0c';
      ctx.beginPath(); ctx.moveTo(-1.0, -0.7); ctx.lineTo(6.3, -0.4); ctx.lineTo(6.2, -3.6); ctx.lineTo(-1.0, -1.0); ctx.closePath(); ctx.fill();
      /* cresta puntiaguda por la coronilla y la nuca: va detrás de la cabeza,
       * así que la base de cada púa queda tapada y parece salir del cráneo */
      var cresta = hex(mix(piel, '#ff5a2a', 0.7));
      [[0.9, 4.0, -0.3, 4.6, 0.7, 5.6], [-0.9, 5.0, -2.2, 5.5, -1.3, 6.6], [-2.6, 5.6, -3.9, 5.4, -3.1, 6.8],
       [-4.2, 5.1, -5.2, 4.1, -5.3, 5.8], [-5.5, 3.4, -6.1, 2.2, -6.9, 3.5], [-6.3, 1.4, -6.1, 0.1, -7.3, 0.8]].forEach(function (p) {
        piezaX(ctx, function () {
          /* la punta se estira x1,6 desde el centro de la base: más afiladas */
          var mf = (p[0] + p[2]) / 2, ms = (p[1] + p[3]) / 2;
          ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(mf + (p[4] - mf) * 1.6, ms + (p[5] - ms) * 1.6); ctx.lineTo(p[2], p[3]); ctx.closePath();
        }, cresta, mix(cresta, '#3a0a00', 0.4), 0.25, 0.25, 1.3);
      });
      var cabeza = new Path2D();
      cabeza.moveTo(6.4, 1.0);
      cabeza.quadraticCurveTo(6.4, 3.2, 3.6, 3.4); cabeza.quadraticCurveTo(0.6, 3.6, -0.8, 5.0);
      cabeza.quadraticCurveTo(-3.6, 5.8, -5.4, 3.6); cabeza.quadraticCurveTo(-6.4, 1.0, -5.2, -1.2);
      cabeza.lineTo(-4.4, -4.2); cabeza.lineTo(-1.8, -4.2); cabeza.lineTo(-1.2, -0.8);
      cabeza.lineTo(6.2, -0.4); cabeza.quadraticCurveTo(6.6, 0.2, 6.4, 1.0); cabeza.closePath();
      var mand = new Path2D();
      mand.moveTo(-2.8, -0.9); mand.lineTo(6.0, -0.5);
      mand.quadraticCurveTo(6.1, -1.6, 4.8, -2.0); mand.lineTo(0.2, -2.5);
      mand.quadraticCurveTo(-2.4, -2.6, -2.8, -0.9); mand.closePath();
      rostro(ctx, cabeza, mand, -1.0, -0.8, ang, piel, pielOsc, 0.7, 0.7);
      ctx.save(); girarSobre(ctx, -1.0, -0.8, -ang); dientes(ctx, 0.6, 5.6, -0.55, 6, 0.6); ctx.restore();
      dientes(ctx, 0.8, 6.0, -0.45, 6, -0.65);
      ctx.fillStyle = mix(hex(pielOsc), '#000000', 0, 0.7);
      ctx.beginPath();
      ctx.ellipse(-3.2, 3.2, 0.9, 0.5, 0.3, 0, Math.PI * 2);
      ctx.ellipse(-4.4, 1.5, 0.6, 0.4, 0.2, 0, Math.PI * 2);
      ctx.ellipse(-1.8, 4.1, 0.5, 0.3, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(1.0, 2.6, 0.75, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(1.3, 2.5, 0.36, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 2.4);
      ctx.beginPath(); ctx.moveTo(-0.3, 3.7); ctx.lineTo(2.0, 3.0); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.ellipse(5.6, 2.5, 0.3, 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(-2.4, -3.2);
      ctx.rotate(-0.6 + Math.sin(t * 9) * 0.45);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1.4, 0); ctx.lineTo(2.0, 0.6);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.strokeStyle = piel; ctx.lineWidth = 0.75; ctx.stroke();
      contorno(ctx, 1);
      ctx.beginPath(); ctx.moveTo(2.0, 0.6); ctx.lineTo(2.5, 0.4); ctx.moveTo(2.0, 0.6); ctx.lineTo(2.3, 1.1); ctx.stroke();
      ctx.restore();
      ctx.restore();
    },

    hamburguesa: function (ctx, o) {
      var fz = fase(o), ang = [0, 13, 24][fz] * Math.PI / 180, t = o.t;
      var pan = '#e39a4a', panClaro = '#f5bd6b', panOsc = '#b36a28';
      var queso = hex(mix(o.c, '#ffc928', 0.35));
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(0, 0.4 + Math.abs(Math.sin(t * 7)) * 0.3);
      ctx.scale(0.94, 0.94);   // un 15 % más grande
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(-5.6, -3.4); ctx.lineTo(5.6, -3.4);
        ctx.quadraticCurveTo(5.8, -5.6, 3.6, -5.8); ctx.lineTo(-3.6, -5.8);
        ctx.quadraticCurveTo(-5.8, -5.6, -5.6, -3.4); ctx.closePath();
      }, pan, panOsc, 0.5, 0.5);
      ctx.beginPath(); ctx.moveTo(-6.0, -2.5); ctx.lineTo(-6.0, -3.0);
      for (var i = 0; i < 12; i++) { var x = -6 + i; ctx.quadraticCurveTo(x + 0.5, -4.1, x + 1.0, -3.0); }
      ctx.lineTo(6.0, -2.4); ctx.closePath();
      ctx.fillStyle = '#63c94a'; ctx.fill(); contorno(ctx, 1.2); ctx.stroke();
      piezaX(ctx, function () { roundRect(ctx, -5.5, -2.9, 11, 2.2, 1.0); }, '#7a4323', '#4d2814', 0.4, 0.4);
      ctx.fillStyle = '#5c3119';
      [[-3.6, -2.0], [-1.2, -1.6], [1.4, -2.2], [3.8, -1.7]].forEach(function (p) { ctx.fillRect(p[0], p[1], 0.5, 0.35); });
      ctx.fillStyle = '#3a1a0c';
      ctx.fillRect(-5.3, -0.7, 10.6, 3.0);
      ctx.beginPath();
      ctx.moveTo(-5.7, -0.6); ctx.lineTo(5.7, -0.6); ctx.lineTo(5.7, -1.2); ctx.lineTo(4.6, -1.2);
      ctx.lineTo(4.0, -2.4); ctx.lineTo(3.4, -1.2); ctx.lineTo(-1.0, -1.2); ctx.lineTo(-1.6, -2.2);
      ctx.lineTo(-2.2, -1.2); ctx.lineTo(-5.7, -1.2); ctx.closePath();
      ctx.fillStyle = queso; ctx.fill(); contorno(ctx, 1.2); ctx.stroke();
      ctx.save();
      girarSobre(ctx, -5.4, -0.5, ang);
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(-5.7, -0.5); ctx.lineTo(5.7, -0.5);
        ctx.quadraticCurveTo(6.0, 4.6, 0, 4.9); ctx.quadraticCurveTo(-6.0, 4.6, -5.7, -0.5); ctx.closePath();
      }, pan, panOsc, 0.7, 0.8);
      ctx.fillStyle = panClaro;
      ctx.beginPath(); ctx.ellipse(-1.5, 3.3, 2.0, 0.7, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff6dc';
      [[-3.0, 2.4], [-0.8, 3.9], [1.4, 3.0], [3.2, 2.0], [-2.2, 1.0], [0.4, 1.6]].forEach(function (p) {
        ctx.beginPath(); ctx.ellipse(p[0], p[1], 0.38, 0.2, 0.4, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(3.4, 1.6, 0.8, 0.95, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(3.7, 1.5, 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(3.75, 1.6, 0.22, 0.22);
      ctx.restore();
      ctx.restore();
    },

    vampiro: function (ctx, o) {
      var fz = fase(o), ang = [0, 12, 22][fz] * Math.PI / 180, t = o.t;
      /* colores fijos para cara, pelo y capa; el del jugador va LIMPIO en el
       * forro (mezclado con rojo salían tonos sucios: oliva, gris, marrón) */
      var tez = '#e3ebe3', tezOsc = '#9fb0a4', pelo = '#2e2c46';
      var forro = o.c, forroOsc = mix(o.c, '#000000', 0.35), capa = '#3b2352';
      var ola = Math.sin(t * 8) * 0.5;
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.scale(1.03, 1.03);   // un 15 % más grande
      ctx.beginPath();
      ctx.moveTo(-0.4, -2.0); ctx.lineTo(-6.4, 5.2 + ola); ctx.quadraticCurveTo(-5.0, 1.6, -6.8, -1.0 - ola * 0.5);
      ctx.lineTo(-4.6, -2.6); ctx.lineTo(-6.4, -5.8 + ola); ctx.quadraticCurveTo(-2.6, -4.8, -0.2, -3.6); ctx.closePath();
      ctx.fillStyle = capa; ctx.fill(); contorno(ctx, 1.4); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.8, -2.2); ctx.lineTo(-5.6, 4.2 + ola); ctx.quadraticCurveTo(-4.4, 1.4, -5.9, -1.0 - ola * 0.5);
      ctx.lineTo(-4.1, -2.7); ctx.lineTo(-5.5, -5.0 + ola); ctx.quadraticCurveTo(-2.6, -4.3, -0.6, -3.4); ctx.closePath();
      var fg = ctx.createLinearGradient(0, 3.5, 0, -5.5);
      fg.addColorStop(0, forro); fg.addColorStop(1, forroOsc);
      ctx.fillStyle = fg; ctx.fill();
      ctx.fillStyle = '#120a0c';
      ctx.beginPath(); ctx.moveTo(0, -0.7); ctx.lineTo(5.4, -0.3); ctx.lineTo(5.4, -3.0); ctx.lineTo(0, -1.0); ctx.closePath(); ctx.fill();
      var cabeza = new Path2D();
      cabeza.moveTo(5.3, -0.3);
      cabeza.quadraticCurveTo(5.9, 4.6, 0.6, 5.3); cabeza.quadraticCurveTo(-4.3, 5.3, -4.1, 0.8);
      cabeza.quadraticCurveTo(-3.9, -1.7, -1.8, -1.8); cabeza.lineTo(0.1, -0.75); cabeza.lineTo(5.2, -0.35); cabeza.closePath();
      var mand = new Path2D();
      mand.moveTo(-1.6, -0.9); mand.lineTo(5.2, -0.4);
      mand.quadraticCurveTo(5.4, -2.7, 3.1, -3.2); mand.quadraticCurveTo(0.2, -3.4, -2.2, -1.7); mand.closePath();
      rostro(ctx, cabeza, mand, 0, -0.8, ang, tez, tezOsc, 0.7, 0.7);
      ctx.beginPath();
      ctx.moveTo(5.1, 3.0); ctx.quadraticCurveTo(4.1, 5.9, 0.5, 5.7); ctx.quadraticCurveTo(-4.7, 5.5, -4.4, 1.0);
      ctx.lineTo(-2.9, 2.1); ctx.quadraticCurveTo(-0.6, 2.8, 1.1, 4.0); ctx.lineTo(2.3, 2.9);
      ctx.quadraticCurveTo(3.7, 3.5, 5.1, 3.0); ctx.closePath();
      ctx.fillStyle = pelo; ctx.fill(); contorno(ctx, 1.4); ctx.stroke();
      ctx.strokeStyle = '#7a78a8'; ctx.lineWidth = 1.3 / S;
      ctx.beginPath(); ctx.moveTo(-2.6, 4.4); ctx.quadraticCurveTo(0, 5.4, 2.6, 4.8); ctx.stroke();
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(-1.0, 1.6); ctx.lineTo(-3.6, 3.6); ctx.lineTo(-2.2, 0.2); ctx.closePath();
      }, tez, tezOsc, 0.2, 0.2, 1.3);
      dientes(ctx, 3.3, 3.9, -0.45, 1, -1.2);
      dientes(ctx, 4.5, 5.0, -0.38, 1, -1.0);
      ctx.fillStyle = '#ff2b2b';
      ctx.beginPath(); ctx.ellipse(2.9, 1.9, 0.6, 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(3.1, 1.9, 0.2, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 2.2);
      ctx.beginPath(); ctx.moveTo(1.8, 2.9); ctx.lineTo(3.9, 2.4); ctx.stroke();
      contorno(ctx, 1.2);
      ctx.beginPath(); ctx.moveTo(5.5, 1.6); ctx.quadraticCurveTo(6.0, 1.0, 5.4, 0.8); ctx.stroke();
      ctx.restore();
    },

    ovni: function (ctx, o) {
      var fz = fase(o), t = o.t, i;
      var metal = '#c7ced8', metalOsc = '#7b8594';
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(0, 0.6 + Math.sin(t * 4) * 0.4);
      ctx.rotate(-0.12);
      ctx.scale(1.25, 1.25);   // otro 15 % más grande
      /* el rayo abductor, SOLO con la Q: es su forma de comer */
      if (o.muerde) {
        var al = 0.45 + 0.1 * Math.sin(t * 20);
        var rg = ctx.createLinearGradient(3.0, -1.5, 8.5, -2.5);
        rg.addColorStop(0, mix(o.c, '#ffffff', 0.5, al));
        rg.addColorStop(1, mix(o.c, o.c, 0, 0));
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.moveTo(2.4, -1.4); ctx.lineTo(3.8, -1.4); ctx.lineTo(8.8, -0.4); ctx.lineTo(8.8, -5.0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = mix(o.c, '#ffffff', 0.6, al * 0.9); ctx.lineWidth = 1 / S;
        ctx.beginPath();
        for (var b = 0; b < 3; b++) {
          var fb = ((t * 2 + b / 3) % 1);
          var xb = 3.4 + fb * 5.2, h1 = -1.4 + fb * 0.95, h2 = -1.4 - fb * 3.6;
          ctx.moveTo(xb, h1); ctx.lineTo(xb, h2);
        }
        ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(0, 0.4, 3.1, 3.0, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = 'rgba(150,215,245,.35)'; ctx.fill();
      ctx.fillStyle = '#7dff7a';
      ctx.beginPath(); ctx.ellipse(0.3, 1.7, 1.3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.ellipse(1.0, 2.0, 0.42, 0.62, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-0.1, 2.0, 0.36, 0.55, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0.4, 3.1, 3.0, 0, Math.PI, 0);
      contorno(ctx, 1.4); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2 / S;
      ctx.beginPath(); ctx.arc(0, 0.4, 2.5, Math.PI * 1.15, Math.PI * 1.4); ctx.stroke();
      piezaX(ctx, function () { ctx.beginPath(); ctx.ellipse(0, -0.2, 6.3, 1.7, 0, 0, Math.PI * 2); }, metal, metalOsc, 0, 0.6);
      ctx.fillStyle = metalOsc;
      ctx.beginPath(); ctx.ellipse(0, -1.35, 3.4, 0.7, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      for (i = 0; i < 6; i++) {
        var on = ((Math.floor(t * 6) + i) % 3) === 0;
        ctx.fillStyle = on ? o.c : '#3a3f47';
        ctx.beginPath(); ctx.arc(-4.8 + i * 1.92, -0.2, 0.42, 0, Math.PI * 2); ctx.fill();
        contorno(ctx, 1); ctx.stroke();
      }
      ctx.restore();
    },

    gato: function (ctx, o) {
      var fz = fase(o), ang = [0, 13, 24][fz] * Math.PI / 180, t = o.t;
      var pelo = hex(mix(o.c, '#ffffff', 0.08)), peloOsc = mix(pelo, '#000000', 0.35), rosa = '#ff9ab8';
      var cola = Math.sin(t * 5) * 0.9;
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.scale(1.03, 1.03);   // un 15 % más grande
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-4.2, -1.6); ctx.quadraticCurveTo(-7.4, -0.8 + cola * 0.3, -6.6, 2.8 + cola);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.7; ctx.stroke();
      ctx.strokeStyle = pelo; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.fillStyle = '#120a0c';
      ctx.beginPath(); ctx.moveTo(0.6, -0.9); ctx.lineTo(5.2, -0.5); ctx.lineTo(5.0, -3.0); ctx.lineTo(0.6, -1.2); ctx.closePath(); ctx.fill();
      var cabeza = new Path2D();
      cabeza.moveTo(5.5, 0.2);
      cabeza.quadraticCurveTo(5.7, 2.0, 4.3, 2.8); cabeza.quadraticCurveTo(3.0, 4.7, 0.0, 4.7);
      cabeza.quadraticCurveTo(-4.7, 4.6, -4.8, 0.6); cabeza.quadraticCurveTo(-4.8, -2.4, -2.2, -2.6);
      cabeza.lineTo(0.6, -0.95); cabeza.lineTo(5.2, -0.5); cabeza.quadraticCurveTo(5.6, -0.3, 5.5, 0.2); cabeza.closePath();
      var mand = new Path2D();
      mand.moveTo(-1.0, -1.0); mand.lineTo(5.0, -0.6);
      mand.quadraticCurveTo(5.0, -2.0, 3.2, -2.4); mand.quadraticCurveTo(0.6, -2.8, -1.4, -2.0); mand.closePath();
      rostro(ctx, cabeza, mand, 0.6, -1.0, ang, pelo, peloOsc, 0.7, 0.7);
      ctx.save(); girarSobre(ctx, 0.6, -1.0, -ang); dientes(ctx, 3.9, 4.4, -0.65, 1, 0.55); ctx.restore();
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(0.4, 4.3); ctx.lineTo(1.8, 6.4); ctx.lineTo(3.1, 3.6); ctx.closePath();
      }, pelo, peloOsc, 0.2, 0.2);
      ctx.fillStyle = rosa;
      ctx.beginPath(); ctx.moveTo(1.0, 4.3); ctx.lineTo(1.8, 5.6); ctx.lineTo(2.5, 3.9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = peloOsc; ctx.lineWidth = 1.3 / S;
      ctx.beginPath(); ctx.moveTo(-0.8, 4.6); ctx.lineTo(-0.4, 3.4); ctx.moveTo(-2.0, 4.3); ctx.lineTo(-1.5, 3.2); ctx.stroke();
      dientes(ctx, 4.1, 4.6, -0.5, 1, -0.55);
      var abierto = ((t % 3.1) < 0.12) ? 0.12 : 0.62;
      ctx.fillStyle = '#9dff5a';
      ctx.beginPath(); ctx.ellipse(2.5, 2.1, 0.95, abierto, -0.1, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      if (abierto > 0.2) { ctx.fillStyle = TINTA; ctx.beginPath(); ctx.ellipse(2.75, 2.1, 0.2, abierto * 0.9, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = rosa;
      ctx.beginPath(); ctx.moveTo(5.0, 1.3); ctx.lineTo(5.6, 1.3); ctx.lineTo(5.3, 0.8); ctx.closePath(); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1 / S;
      ctx.beginPath();
      ctx.moveTo(4.2, 0.5); ctx.lineTo(7.2, 1.3); ctx.moveTo(4.2, 0.3); ctx.lineTo(7.4, 0.3); ctx.moveTo(4.2, 0.1); ctx.lineTo(7.2, -0.7);
      ctx.stroke();
      ctx.restore();
    },

    /* --- de temporada --- */
    calabaza: function (ctx, o) {
      var a = DIR_ANGLE[o.d];
      body(ctx, o);
      ctx.save();
      pacPath(ctx, o.x, o.y, R, a, o.half);
      ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,.32)';
      ctx.lineWidth = 2 / S;
      ctx.beginPath(); ctx.ellipse(o.x, o.y, 2.4, R + 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(o.x, o.y, 4.9, R + 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.fillStyle = '#140800';
      ctx.beginPath(); ctx.moveTo(-2.4, 1.9); ctx.lineTo(1.0, 1.9); ctx.lineTo(-0.7, 4.5); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(o.t * 9);
      ctx.fillStyle = '#ffae00';
      ctx.beginPath(); ctx.moveTo(-1.7, 2.3); ctx.lineTo(0.3, 2.3); ctx.lineTo(-0.7, 3.8); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;

      /* labios tallados: púas del color del cuerpo hacia dentro de la boca;
       * con la boca cerrada, el corte en zigzag */
      var h = o.half, lado, k, d0;
      if (h > 0) {
        ctx.fillStyle = o.c;
        for (lado = -1; lado <= 1; lado += 2) {
          var ux = Math.cos(h), us = lado * Math.sin(h);
          var nx = Math.sin(h), ns = -lado * Math.cos(h);
          for (k = 0; k < 3; k++) {
            d0 = 2.2 + k * 1.6;
            /* lo más largas posible sin cruzarse con las del otro labio:
             * cada una llega casi a la mitad del hueco de la boca */
            var alto = Math.min(1.8, d0 * Math.sin(h) * 0.95);
            ctx.beginPath();
            ctx.moveTo(ux * (d0 - 0.8), us * (d0 - 0.8));
            ctx.lineTo(ux * (d0 + 0.8), us * (d0 + 0.8));
            ctx.lineTo(ux * d0 + nx * alto, us * d0 + ns * alto);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else {
        ctx.strokeStyle = '#140800';
        ctx.lineWidth = 3 / S;
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(1.2, 0);
        for (k = 1; k <= 6; k++) ctx.lineTo(1.2 + k * 0.85, (k % 2) ? 1.1 : -1.1);
        ctx.stroke();
      }

      /* rabito verde vivo y un poco curvado hacia atrás, con una hojita */
      ctx.fillStyle = '#3ec22a';
      ctx.beginPath();
      ctx.moveTo(-2.6, R - 1.2); ctx.lineTo(0.2, R - 1.2);
      ctx.quadraticCurveTo(0.2, R + 2.4, -1.2, R + 3.4);
      ctx.quadraticCurveTo(-2.6, R + 4.2, -4.0, R + 3.2);
      ctx.quadraticCurveTo(-2.4, R + 2.8, -2.6, R - 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a8a1c';
      ctx.fillRect(-1.6, R - 0.2, 0.7, 2.6);
      ctx.fillStyle = '#6ef04a';
      ctx.beginPath();
      ctx.moveTo(0.4, R + 1.2);
      ctx.quadraticCurveTo(2.2, R + 3.0, 3.8, R + 1.6);
      ctx.quadraticCurveTo(2.2, R + 0.6, 0.4, R + 1.2);
      ctx.fill();
      ctx.restore();
    },

    gorro: function (ctx, o) {
      body(ctx, o);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(1.5, 1.6);   // el gorro, más arriba y más adelante
      ctx.fillStyle = '#e0182d';
      ctx.beginPath();
      ctx.moveTo(-4.4, R - 1.6); ctx.lineTo(2.2, R - 1.6);
      ctx.quadraticCurveTo(1.2, R + 3.6, -5.4, R + 2.4);
      ctx.quadraticCurveTo(-3.8, R + 1.4, -4.4, R - 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f4f4f4';
      ctx.beginPath();
      var bx = -5.0, by = R - 3.0, bw = 7.8, bh = 1.9, br = 0.9;
      ctx.moveTo(bx + br, by); ctx.lineTo(bx + bw - br, by); ctx.arcTo(bx + bw, by, bx + bw, by + br, br);
      ctx.lineTo(bx + bw, by + bh - br); ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
      ctx.lineTo(bx + br, by + bh); ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
      ctx.lineTo(bx, by + br); ctx.arcTo(bx, by, bx + br, by, br);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(-5.6, R + 2.3, 1.35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  };

  /* ============================================================
   * Registro: Sprites.drawPacman se desvía aquí para estas skins
   * ============================================================ */
  var INFO = {};
  CFG.SKINS.forEach(function (sk) { INFO[sk.id] = sk; });

  Sprites.ARTE = DRAW;

  /* '#abc' -> '#aabbcc'; cualquier otra cosa, amarillo. mix() necesita
   * los seis dígitos. */
  function colorLargo(c) {
    if (typeof c !== 'string') return '#ffff00';
    if (/^#[0-9a-f]{6}$/i.test(c)) return c;
    if (/^#[0-9a-f]{3}$/i.test(c)) {
      return '#' + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2) + c.charAt(3) + c.charAt(3);
    }
    return '#ffff00';
  }

  Sprites.dibujarArte = function (ctx, x, y, dir, mouthPhase, color, skin, extra) {
    var e = extra || {};
    var d = (dir >= 0 && dir <= 3) ? dir : 3;
    var v = DIR_V[d];
    var rara = !!(INFO[skin] && INFO[skin].rara);
    var equipo = [];
    if (e.team) for (var i = 0; i < e.team.length && i < 3; i++) equipo.push(colorLargo(e.team[i]));
    var o = {
      x: x, y: y, d: d,
      /* con la Q activa las extravagantes abren la boca del todo: no llevan
       * la sierra blanca de las demás (flotaría fuera de su boca), así que
       * este es su aviso de que la tecla entró */
      half: (e.muerde && rara) ? HALF[2] : (HALF[mouthPhase] || 0),
      muerde: !!e.muerde,        // DRAGÓN, COFRE y OVNI tienen su propio golpe de Q
      c: colorLargo(color),
      t: (typeof e.t === 'number') ? e.t : Date.now() / 1000,
      team: equipo,
      vel: (e.estira > 0) ? e.estira : 1,
      estira: (!e.icono && e.estira > 0) ? e.estira : 1,
      /* en un icono (vidas, menús) no hay estela: todo el camino "de atrás"
       * es el propio sitio, y las copias quedan debajo del cuerpo */
      back: e.icono ? function () { return { x: x, y: y, d: d }; }
        : (typeof e.back === 'function') ? e.back
        : function (dist) { return { x: x - v[0] * dist, y: y - v[1] * dist, d: d }; }
    };
    ctx.save();
    try { DRAW[skin](ctx, o); }
    finally { ctx.restore(); }
  };

  /* ============================================================
   * Muerte con skin
   *
   * La animación de siempre (la boca que se abre hasta desaparecer) es la
   * del Pac-Man clásico y se queda para la clásica. Con cualquier otra skin
   * se veía morir a un Pac-Man normal en su lugar, así que aquí muere la
   * skin: gira encogiéndose sobre sí misma, parpadea al final y estalla en
   * chispas de su color. t va de 0 a 1 (CFG.DEATH_ANIM_TICKS).
   * ============================================================ */
  Sprites.drawSkinDeath = function (ctx, x, y, t, color, skin, dir) {
    var col = colorLargo(color);
    var d = (dir >= 0 && dir <= 3) ? dir : 3;
    var k = Math.max(0, Math.min(1, t / 0.7));
    var ease = k * k * (3 - 2 * k);
    var escala = 1 - ease;
    if (escala > 0.02 && !(t > 0.55 && Math.floor(t * 40) % 2 === 0)) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ease * Math.PI * 3);
      ctx.scale(escala, escala);
      Sprites.drawPacman(ctx, 0, 0, d, [0, 1, 2, 1][Math.floor(t * 20) % 4], col, skin,
        { t: t * 1.5, icono: true });
      ctx.restore();
    }
    if (t > 0.5) {
      var u = (t - 0.5) / 0.5;
      ctx.save();
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = col;
      for (var i = 0; i < 10; i++) {
        var a = i * Math.PI * 2 / 10 + 0.2;
        var r = 2 + u * 11;
        var tam = Math.max(0.6, 1.8 - u * 1.2);
        ctx.fillRect(x + Math.cos(a) * r - tam / 2, y + Math.sin(a) * r - tam / 2, tam, tam);
      }
      if (u < 0.5) destello(ctx, x, y, 2 + u * 6, 1 - u * 2);
      ctx.restore();
    }
  };

  /* ============================================================
   * Qué pide cada una
   * ============================================================ */
  var VISTAS_KEY = 'pacman-topmundial-skins-vistas';

  function hoy(fecha) { return fecha || new Date(); }

  function statDe(key) {
    var A = window.PM.Achievements;
    if (!A) return 0;
    var c = A.stats();
    return (c && c[key]) || 0;
  }

  function rangoMaestria(id) {
    for (var i = 0; i < CFG.BADGES.length; i++) if (CFG.BADGES[i].id === id) return i;
    return -1;
  }

  function nombreMio() {
    var Ac = window.PM.Account;
    if (Ac && Ac.logged && Ac.logged() && Ac.name) return String(Ac.name() || '');
    var s = window.PM.settings || {};
    return String(s.nick1 || '');
  }

  function normaNombre(n) {
    return String(n || '').trim().toUpperCase();
  }

  function cargarVistas() {
    try {
      var d = JSON.parse(localStorage.getItem(VISTAS_KEY) || 'null');
      return (d && Object.prototype.toString.call(d) === '[object Array]') ? d : null;
    } catch (e) { return null; }
  }

  function guardarVistas(v) {
    try { localStorage.setItem(VISTAS_KEY, JSON.stringify(v)); } catch (e) { /* nada */ }
  }

  var Skins = {
    info: function (id) { return INFO[id] || null; },
    rara: function (id) { return !!(INFO[id] && INFO[id].rara); },
    grupo: function (id) { return INFO[id] ? INFO[id].grupo : null; },

    /* ¿cae hoy dentro de la ventana de esa temporada? */
    enTemporada: function (fid, fecha) {
      var f = CFG.SKIN_FECHAS[fid];
      if (!f) return false;
      var dt = hoy(fecha);
      var md = (dt.getMonth() + 1) * 100 + dt.getDate();
      var a = f.desde[0] * 100 + f.desde[1], b = f.hasta[0] * 100 + f.hasta[1];
      return (a <= b) ? (md >= a && md <= b) : (md >= a || md <= b);
    },

    /* Estado de una skin para quien juega en este navegador:
     *   abierta   ya se puede poner
     *   pct       0..1 de lo que lleva
     *   progreso  texto corto ("180 / 300 FANTASMAS COMIDOS")
     *   chip      etiqueta del grupo ("NIVEL 12", "LOGRO", "HALLOWEEN") */
    estado: function (id, fecha) {
      var sk = INFO[id];
      if (!sk) return { abierta: false, pct: 0, progreso: '', chip: '' };
      var p = sk.pide || {};
      if (sk.grupo === 'nivel' || !sk.pide) {
        var L = window.PM.Level;
        var lvl = L ? L.level() : 1, pide = sk.level || 1;
        return {
          abierta: lvl >= pide,
          pct: Math.min(1, lvl / pide),
          progreso: (lvl >= pide) ? ('NIVEL ' + pide) : ('NIVEL ' + lvl + ' / ' + pide),
          chip: 'NIVEL ' + pide
        };
      }
      if (p.fecha) {
        var ya = statDe(p.fecha) >= 1;
        var ahora = this.enTemporada(p.fecha, fecha);
        var f = CFG.SKIN_FECHAS[p.fecha] || { que: '' };
        return {
          abierta: ya,
          pct: ya ? 1 : 0,
          progreso: ya ? ('GANADA EN ' + (p.fecha === 'navidad' ? 'NAVIDAD' : 'HALLOWEEN'))
            : ahora ? 'ES AHORA: JUEGA UNA PARTIDA'
            : ('JUEGA ' + f.que),
          chip: (p.fecha === 'navidad') ? 'NAVIDAD' : 'HALLOWEEN'
        };
      }
      if (p.ruta) {
        var B = window.PM.Badges;
        var mejor = -1, nombre = 'NINGUNA';
        for (var i = 0; B && i < p.ruta.length; i++) {
          var top = B.top(p.ruta[i]);
          var rk = top ? rangoMaestria(top.id) : -1;
          if (rk > mejor) { mejor = rk; nombre = top.name; }
        }
        var necesita = rangoMaestria(p.maestria);
        return {
          abierta: mejor >= necesita,
          pct: Math.max(0, Math.min(1, (mejor + 1) / (necesita + 1))),
          progreso: (mejor >= necesita) ? p.que : (p.que + ' · TIENES ' + nombre),
          chip: 'LOGRO'
        };
      }
      var val = statDe(p.stat), meta = p.meta || 1;
      return {
        abierta: val >= meta,
        pct: Math.min(1, val / meta),
        progreso: (meta === 1) ? p.que
          : (Math.min(val, meta).toLocaleString('es-ES') + ' / ' + meta.toLocaleString('es-ES') + ' ' + p.que),
        chip: 'LOGRO'
      };
    },

    /* La que ya llevas puesta cuenta como abierta: lo que tenías no se quita */
    abierta: function (id, puesta) {
      if (!INFO[id]) return false;
      return id === puesta || this.estado(id).abierta;
    },

    disponibles: function (puesta) {
      var out = [];
      for (var i = 0; i < CFG.SKINS.length; i++) {
        if (this.abierta(CFG.SKINS[i].id, puesta)) out.push(CFG.SKINS[i].id);
      }
      return out;
    },

    cuantas: function () {
      var n = 0;
      for (var i = 0; i < CFG.SKINS.length; i++) if (this.estado(CFG.SKINS[i].id).abierta) n++;
      return n;
    },

    /* Al cerrar una partida: si es temporada, queda apuntado para siempre */
    anotarTemporada: function (fecha) {
      var A = window.PM.Achievements;
      if (!A) return;
      for (var fid in CFG.SKIN_FECHAS) {
        if (CFG.SKIN_FECHAS.hasOwnProperty(fid) && this.enTemporada(fid, fecha)) A.record(fid, 1);
      }
    },

    /* Filas del TOP MUNDIAL individual: si tu nombre está entre las 10
     * primeras, DORADO queda ganada (y se queda aunque luego te adelanten). */
    anotarTop10: function (filas) {
      var A = window.PM.Achievements;
      var yo = normaNombre(nombreMio());
      if (!A || !yo || !filas) return false;
      for (var i = 0; i < filas.length && i < 10; i++) {
        if (normaNombre(filas[i].nombre1) === yo) { A.record('top10', 1); return true; }
      }
      return false;
    },

    /* Mira el top una vez por sesión (al abrir la vitrina), sin molestar */
    comprobarTop10: function (hecho) {
      var self = this, Rk = window.PM.Ranking;
      if (this._top10Mirado || !Rk || !Rk.configured || !Rk.configured()) return;
      if (statDe('top10') >= 1) return;
      this._top10Mirado = true;
      Rk.top(1, function (err, filas) {
        if (!err && self.anotarTop10(filas) && hecho) hecho();
      });
    },

    /* ---------- avisos de skin nueva ----------
     * Las que se abren a mitad de partida se anuncian una vez. Al arrancar
     * se dan por vistas las que ya estaban abiertas, para no celebrar de
     * golpe todo lo de antes. */
    syncVistas: function () {
      var abiertas = [];
      for (var i = 0; i < CFG.SKINS.length; i++) {
        if (this.estado(CFG.SKINS[i].id).abierta) abiertas.push(CFG.SKINS[i].id);
      }
      var previas = cargarVistas() || [];
      for (var j = 0; j < previas.length; j++) {
        if (abiertas.indexOf(previas[j]) === -1) abiertas.push(previas[j]);
      }
      guardarVistas(abiertas);
    },

    reclamar: function () {
      var vistas = cargarVistas();
      if (!vistas) { this.syncVistas(); return []; }
      var nuevas = [];
      for (var i = 0; i < CFG.SKINS.length; i++) {
        var id = CFG.SKINS[i].id;
        if (vistas.indexOf(id) === -1 && this.estado(id).abierta) {
          vistas.push(id);
          nuevas.push(CFG.SKINS[i]);
        }
      }
      if (nuevas.length) guardarVistas(vistas);
      return nuevas;
    },

    /* ============================================================
     * Escena de la vitrina: un pasillo en anillo alrededor de un bloque,
     * con sus pastillas, y el Pac-Man dando vueltas a tamaño de partida.
     * La lupa es un recorte de esa misma escena ampliado x2, con los
     * píxeles tal cual: lo que se ve ahí es lo que se verá jugando.
     * ============================================================ */
    ESCENA_W: 336,
    ESCENA_H: 144,
    LUPA_RECORTE: 72,
    /* las que hacen algo propio con la Q (la vitrina lo enseña en bucle) */
    CON_Q: { dragon: 1, cofre: 1, ovni: 1 },

    caminoEscena: function (s) {
      var X0 = 12, Y0 = 12, X1 = 100, Y1 = 36, PW = X1 - X0, PH = Y1 - Y0, P = 2 * (PW + PH);
      s = ((s % P) + P) % P;
      if (s < PW) return { x: X0 + s, y: Y0, d: 3 };
      s -= PW;
      if (s < PH) return { x: X1, y: Y0 + s, d: 2 };
      s -= PH;
      if (s < PW) return { x: X1 - s, y: Y1, d: 1 };
      s -= PW;
      return { x: X0, y: Y1 - s, d: 0 };
    },

    /* cv: lienzo de 336x144. s: distancia recorrida. t: segundos.
     * Devuelve dónde quedó Pac-Man (para la lupa). */
    escena: function (cv, id, color, s, t, opts) {
      var self = this;
      var o = opts || {};
      var ctx = cv.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(S, 0, 0, S, 0, 0);
      var lw = 2 / S, gap = 7 + lw / 2;
      var X0 = 12, Y0 = 12, PW = 88, PH = 24, P = 2 * (PW + PH);
      ctx.strokeStyle = CFG.COLORS.wall;
      ctx.lineWidth = lw;
      roundRect(ctx, X0 - gap, Y0 - gap, PW + 2 * gap, PH + 2 * gap, 4);
      ctx.stroke();
      roundRect(ctx, X0 + gap, Y0 + gap, PW - 2 * gap, PH - 2 * gap, 1.5);
      ctx.stroke();
      var vuelta = ((s % P) + P) % P;
      ctx.fillStyle = CFG.COLORS.pellet;
      for (var k = 0; k < P / 8; k++) {
        var sp = k * 8 + 4;
        if (sp <= vuelta + 2) continue;
        var pp = this.caminoEscena(sp);
        ctx.fillRect(pp.x - 1, pp.y - 1, 2, 2);
      }
      var pos = this.caminoEscena(s);
      var boca = [0, 1, 2, 1][Math.floor(t * 14) % 4];
      Sprites.drawPacman(ctx, pos.x, pos.y, pos.d, boca, color, id, {
        t: t,
        back: function (dist) { return self.caminoEscena(s - dist); },
        estira: o.estira || 1,
        team: o.team || [],
        /* en la vitrina no hay tecla: las que tienen golpe de Q propio lo
         * enseñan solas, un rato cada tres segundos */
        muerde: !!(this.CON_Q[id] && (t % 3) < 1.1)
      });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return pos;
    },

    lupa: function (cvLupa, cvEscena, pos, atras) {
      var c = cvLupa.getContext('2d');
      var REC = this.LUPA_RECORTE;
      var dv = DIR_V[pos.d] || [0, 0];
      var cx = pos.x - dv[0] * (atras || 0), cy = pos.y - dv[1] * (atras || 0);
      var sx = Math.max(0, Math.min(this.ESCENA_W - REC, Math.round(cx * S - REC / 2)));
      var sy = Math.max(0, Math.min(this.ESCENA_H - REC, Math.round(cy * S - REC / 2)));
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#000';
      c.fillRect(0, 0, cvLupa.width, cvLupa.height);
      c.drawImage(cvEscena, sx, sy, REC, REC, 0, 0, cvLupa.width, cvLupa.height);
    }
  };

  window.PM.Skins = Skins;
})();
