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
  var ARRANQUE = Date.now();

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

  /* piezas de dibujo de la tienda (15 sep): corazones, gotas, estrellitas
   * de cuatro puntas y notas musicales */
  function corazon(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.3, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.3, y - s * 0.2, x, y + s * 0.9);
    ctx.closePath();
    ctx.fill();
  }
  function gota(ctx, x, y, s, color, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.5);
    ctx.quadraticCurveTo(x + s, y, x + s * 0.75, y + s * 0.55);
    ctx.quadraticCurveTo(x, y + s * 1.35, x - s * 0.75, y + s * 0.55);
    ctx.quadraticCurveTo(x - s, y, x, y - s * 1.5);
    ctx.fill();
    ctx.restore();
  }
  function estrella4(ctx, x, y, s, color, alpha) {
    if (alpha <= 0 || s <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
    ctx.restore();
  }
  function nota(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.28;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.48, y); ctx.lineTo(x + s * 0.48, y - s * 1.7);
    ctx.quadraticCurveTo(x + s * 1.1, y - s * 1.3, x + s * 1.05, y - s * 0.8);
    ctx.stroke();
  }

  /* La Q de las extravagantes de la tanda del 14 sep: -1 fuera de ella y de
   * 0 a 1 durante `dura` segundos desde que la Q ACIERTA (o.qSeg). Sin tecla
   * (menús, vidas) no hay Q. */
  function qDe(o, dura) {
    return (typeof o.qSeg === 'number' && o.qSeg >= 0 && o.qSeg < dura) ? o.qSeg / dura : -1;
  }

  /* ============================================================
   * Las skins. `o` lo arma Sprites.dibujarArte (más abajo):
   *   x, y, d, half (media apertura de la boca), c (color #rrggbb),
   *   t (segundos), back(dist), estira, team,
   *   s (px recorridos), giro (px desde el último giro), qSeg (segundos
   *   desde que acertó la Q), muerte (0..1 durante la animación de morir)
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
      var giro = (o.t * 1.6) % (Math.PI * 2);
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
      /* el interior de la boca llega justo hasta donde está la punta de la
       * mandíbula en cada fotograma: con uno fijo, al adelgazar la mandíbula
       * asomaba negro por debajo con la boca cerrada */
      var giro = -ang, pcx = 0.9, pcy = -0.95, qx = 5.6 - pcx, qy = -0.75 - pcy;
      var puntaX = pcx + qx * Math.cos(giro) - qy * Math.sin(giro);
      var puntaY = pcy + qx * Math.sin(giro) + qy * Math.cos(giro);
      ctx.fillStyle = '#120a0c';
      ctx.beginPath(); ctx.moveTo(0.8, -0.9); ctx.lineTo(5.6, -0.5); ctx.lineTo(puntaX, puntaY - 0.35); ctx.lineTo(0.8, -1.2); ctx.closePath(); ctx.fill();
      var cuerpo = new Path2D();
      cuerpo.moveTo(6.5, 0.2);
      cuerpo.quadraticCurveTo(5.8, 2.7, 2.0, 3.0); cuerpo.quadraticCurveTo(-2.5, 3.2, -5.0, 1.2);
      cuerpo.lineTo(-6.7, 3.5); cuerpo.lineTo(-6.0, 0.0); cuerpo.lineTo(-6.9, -2.9); cuerpo.lineTo(-4.8, -0.9);
      cuerpo.quadraticCurveTo(-1.5, -2.9, 0.9, -0.95); cuerpo.lineTo(5.5, -0.55);
      cuerpo.quadraticCurveTo(6.5, -0.4, 6.5, 0.2); cuerpo.closePath();
      /* la mandíbula nace por dentro del cuerpo, detrás de la comisura. Más
       * fina que antes (15 sep): era más gruesa que la panza y parecía un
       * mentón postizo; ahora baja lo mismo que la barriga de detrás */
      var mand = new Path2D();
      mand.moveTo(-0.6, -0.9); mand.lineTo(5.3, -0.75);
      mand.quadraticCurveTo(5.4, -1.6, 3.9, -1.95); mand.quadraticCurveTo(1.6, -2.25, -0.6, -1.75); mand.closePath();
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
       * según se alejan. Sin la Q, ni una. Una lluvia: muchas, de tamaños y
       * velocidades distintas, con brillo alrededor y destellos. */
      if (o.muerde && o.mordio) {
        var N = 26;
        ctx.shadowColor = 'rgba(255,210,60,.9)';
        for (var k = 0; k < N; k++) {
          var azar = ((k * 7919) % 97) / 97;            // fijo por moneda
          var vel = 1.3 + azar * 1.2;
          var fr = ((t * vel) + k * 0.618) % 1;
          var angM = k * 2.39996 + azar * 0.6;        // ángulo áureo: se reparten
          // nacen ya fuera del cofre, para no taparle la cara
          var rad = 7.2 + fr * (6 + azar * 5);
          var mx = Math.cos(angM) * rad;
          var my = 0.8 + Math.sin(angM) * rad * 0.85 - fr * fr * 2.2;
          var tam = 0.85 + azar * 0.45;
          ctx.globalAlpha = Math.min(1, fr * 8) * (1 - fr * fr * fr);
          ctx.shadowBlur = 6;
          ctx.fillStyle = oro;
          ctx.beginPath();
          ctx.ellipse(mx, my, tam * Math.abs(Math.cos(t * 12 + k * 1.7)) + 0.18, tam, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          contorno(ctx, 1); ctx.stroke();
          ctx.fillStyle = '#fff6c0';
          ctx.fillRect(mx - 0.18, my + 0.12, 0.36, 0.36);
          // destello en cruz de vez en cuando
          if (Math.sin(t * 9 + k * 2.3) > 0.8) {
            ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 1 / S;
            ctx.beginPath();
            ctx.moveTo(mx - tam * 1.6, my); ctx.lineTo(mx + tam * 1.6, my);
            ctx.moveTo(mx, my - tam * 1.6); ctx.lineTo(mx, my + tam * 1.6);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    },

    dragon: function (ctx, o) {
      var fz = fase(o), t = o.t, k;
      /* FUEGO SOLO CON UNA Q QUE ACIERTA: la boca se abre del todo y sale la
       * llamarada mientras dura. Una Q fallada solo suelta una bocanada de
       * humo; sin la Q mastica normal y humea por la nariz. */
      var sopla = !!(o.muerde && o.mordio), bufa = !!(o.muerde && !o.mordio);
      var pf = (t * 1.25) % 1;
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
      /* HUMO: volutas que salen de la nariz, suben ondulando, se inflan y se
       * deshacen. Con una Q fallada resopla: más bocanadas, más grandes y
       * más oscuras, empujadas hacia delante. */
      var nh = bufa ? 6 : 4, vh = bufa ? 2.2 : 0.9;
      for (k = 0; k < nh; k++) {
        var fh = ((t * vh) + k / nh) % 1;
        var onda = Math.sin(t * 5 + k * 2.1 + fh * 6) * (0.35 + fh * 0.9);
        var hx = 5.8 + fh * (bufa ? 4.2 : 1.6) + onda * 0.35;
        var hy = 1.5 + fh * (bufa ? 1.8 : 3.4) + onda * 0.25;
        var hr = (bufa ? 0.55 : 0.35) + fh * (bufa ? 1.6 : 1.05);
        var ha = (bufa ? 0.7 : 0.5) * (1 - fh) * Math.min(1, fh * 6 + 0.2);
        var gris = bufa ? 150 : 205;
        ctx.fillStyle = 'rgba(' + gris + ',' + gris + ',' + (gris + 5) + ',' + ha.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(240,240,245,' + (ha * 0.55).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(hx - hr * 0.3, hy + hr * 0.3, hr * 0.5, 0, Math.PI * 2); ctx.fill();
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
      if (o.muerde && o.mordio) {
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

    /* --- tanda nueva (14 sep): diez extravagantes ---
     * Mismo marco que las demás (f hacia delante, s hacia la coronilla).
     * La Q de cada una dura lo suyo: qDe(o, dura) es -1 fuera de ella y va
     * de 0 a 1 desde que la Q ACIERTA (o.qSeg, segundos desde el mordisco). */
    bomba: function (ctx, o) {
      var fz = fase(o), t = o.t, q = qDe(o, 0.8), k;
      var ang = [0, 14, 26][fz] * Math.PI / 180;
      var negro = hex(mix('#4a4a5a', o.c, 0.14)), negroOsc = '#15151b';
      /* MUERTE (o.muerte de 0 a 1, la pide Sprites.drawSkinDeath): se hincha
       * parpadeando en rojo y estalla con fogonazo, onda, trozos de metal,
       * chispas y humo */
      if (o.muerte != null) {
        var pm = o.muerte;
        ctx.save();
        ctx.translate(o.x, o.y);
        if (pm < 0.18) {
          var hincha = 1 + pm / 0.18 * 0.45, rojo = (Math.floor(pm * 60) % 2) === 0;
          ctx.fillStyle = rojo ? '#ff3b2f' : negro;
          ctx.beginPath(); ctx.arc(0, 0, 5.6 * hincha, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = TINTA; ctx.lineWidth = 1.6 / S; ctx.stroke();
        } else {
          var e = (pm - 0.18) / 0.82;                    // 0..1 de la explosión
          ctx.globalCompositeOperation = 'lighter';
          var rf = 3 + e * 10;
          var fg = ctx.createRadialGradient(0, 0, 0, 0, 0, rf);
          fg.addColorStop(0, 'rgba(255,255,235,' + (1 - e) + ')');
          fg.addColorStop(0.35, 'rgba(255,214,70,' + (0.95 * (1 - e)) + ')');
          fg.addColorStop(0.7, 'rgba(255,110,20,' + (0.8 * (1 - e)) + ')');
          fg.addColorStop(1, 'rgba(200,40,20,0)');
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.arc(0, 0, rf, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,230,170,' + (1 - e) + ')';
          ctx.lineWidth = Math.max(0.1, 1.4 * (1 - e));
          ctx.beginPath(); ctx.arc(0, 0, 4 + e * 13, 0, Math.PI * 2); ctx.stroke();
          for (k = 0; k < 12; k++) {
            var ak = k * 0.524 + 0.2;
            ctx.fillStyle = 'rgba(255,220,120,' + (1 - e) + ')';
            ctx.fillRect(Math.cos(ak) * (2 + e * 15), Math.sin(ak) * (2 + e * 15), 0.5, 0.5);
          }
          ctx.globalCompositeOperation = 'source-over';
          for (k = 0; k < 8; k++) {
            var ad = k * 0.785 + 0.4, dd = 2 + e * (9 + (k % 3) * 2);
            ctx.save();
            ctx.globalAlpha = 1 - e * e;
            ctx.translate(Math.cos(ad) * dd, Math.sin(ad) * dd);
            ctx.rotate(e * 9 + k);
            ctx.fillStyle = (k % 2) ? negro : '#b9c0c8';
            ctx.fillRect(-0.8, -0.45, 1.6, 0.9);
            ctx.strokeStyle = TINTA; ctx.lineWidth = 0.8 / S; ctx.strokeRect(-0.8, -0.45, 1.6, 0.9);
            ctx.restore();
          }
          if (e > 0.3) {
            for (k = 0; k < 5; k++) {
              var ah = k * 1.256, u = (e - 0.3) / 0.7;
              ctx.fillStyle = 'rgba(150,150,160,' + (0.45 * (1 - u)) + ')';
              ctx.beginPath(); ctx.arc(Math.cos(ah) * u * 6, Math.sin(ah) * u * 6, 1.5 + u * 3, 0, Math.PI * 2); ctx.fill();
            }
          }
        }
        ctx.restore();
        return;
      }
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.rotate(Math.sin(t * 7) * 0.06);
      ctx.translate(0, -0.5);
      var cy = 0.3, r = 5.6, a0 = Math.asin((-0.8 - cy) / r);
      ctx.fillStyle = '#3a0808';
      ctx.beginPath(); ctx.moveTo(-4.4, -0.8); ctx.lineTo(5.6, -0.8); ctx.lineTo(5.0, -3.6); ctx.lineTo(-4.4, -1.4); ctx.closePath(); ctx.fill();
      var cab = new Path2D(); cab.arc(0, cy, r, a0, Math.PI - a0, false); cab.closePath();
      var mand = new Path2D(); mand.arc(0, cy, r, Math.PI - a0, 2 * Math.PI + a0, false); mand.closePath();
      rostro(ctx, cab, mand, -5.2, -0.8, ang, negro, negroOsc, 0.8, 0.8);
      ctx.save(); girarSobre(ctx, -5.2, -0.8, -ang); dientes(ctx, 0.4, 5.0, -0.8, 5, 0.85); ctx.restore();
      dientes(ctx, 0.8, 5.3, -0.8, 5, -0.85);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath(); ctx.ellipse(-2.2, 3.7, 1.4, 0.6, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(2.8, 2.3, 0.95, 1.05, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(3.15, 2.1, 0.42, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 2.4);
      ctx.beginPath(); ctx.moveTo(1.6, 3.7); ctx.lineTo(4.2, 2.9); ctx.stroke();
      piezaX(ctx, function () { roundRect(ctx, -2.9, 5.0, 2.8, 1.5, 0.3); }, '#b9c0c8', '#6b737c', 0.3, 0.3, 1.2);
      var mx = -3.7 + Math.sin(t * 5) * 0.3, my = 8.4;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-1.5, 6.5); ctx.quadraticCurveTo(-1.1, 8.8, mx, my);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.0; ctx.stroke();
      ctx.strokeStyle = '#c9a36b'; ctx.lineWidth = 0.5; ctx.stroke();
      var viva = (q >= 0) ? 1 + Math.sin(q * Math.PI) * 1.6 : 1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(mx, my, 0, mx, my, 2.2 * viva);
      g.addColorStop(0, 'rgba(255,240,160,.95)');
      g.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mx, my, 2.2 * viva, 0, Math.PI * 2); ctx.fill();
      destello(ctx, mx, my, (0.9 + 0.35 * Math.sin(t * 31)) * viva, 1);
      if (q >= 0) {
        for (k = 0; k < 7; k++) {
          var a2 = k * 0.9 + 0.3, d2 = q * (3 + k % 3);
          ctx.fillStyle = 'rgba(255,220,120,' + (1 - q) + ')';
          ctx.fillRect(mx + Math.cos(a2) * d2, my + Math.sin(a2) * d2 - q * 1.5, 0.45, 0.45);
        }
      }
      ctx.restore();
      ctx.restore();
    },

    lobo: function (ctx, o) {
      var fz = fase(o), t = o.t, CICLO = 4.2, DURA = 1.3, tf = t % CICLO, aulla = tf < DURA, pa = tf / DURA, k;
      var alza = aulla ? Math.sin(Math.min(1, pa / 0.25) * Math.PI / 2) * (pa > 0.8 ? (1 - pa) / 0.2 : 1) : 0;
      var ang = aulla ? (30 * alza) * Math.PI / 180 : [0, 14, 26][fz] * Math.PI / 180;
      var pelo = hex(mix(o.c, '#6e6a7a', 0.6)), peloOsc = mix(pelo, '#0c0a14', 0.5), peloClaro = mix(pelo, '#ffffff', 0.4);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      girarSobre(ctx, -3, -1, alza * 0.5);
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(-2.4, 3.8); ctx.lineTo(-4.4, 7.0); ctx.lineTo(-4.7, 3.3); ctx.closePath();
      }, hex(peloOsc), '#0c0a14', 0.2, 0.2);
      ctx.fillStyle = '#120a0c';
      ctx.beginPath(); ctx.moveTo(-1.4, -0.7); ctx.lineTo(6.6, -0.3); ctx.lineTo(6.4, -3.6); ctx.lineTo(-1.4, -1.0); ctx.closePath(); ctx.fill();
      var cabeza = new Path2D();
      cabeza.moveTo(7.0, -0.3);
      cabeza.quadraticCurveTo(7.2, 1.5, 4.6, 1.8); cabeza.quadraticCurveTo(2.6, 2.0, 1.4, 3.4);
      cabeza.quadraticCurveTo(-0.6, 5.0, -3.2, 4.4); cabeza.quadraticCurveTo(-5.6, 3.4, -5.4, 0.6);
      cabeza.lineTo(-6.8, -0.4); cabeza.lineTo(-5.2, -0.9); cabeza.lineTo(-6.2, -2.2); cabeza.lineTo(-3.8, -1.9);
      cabeza.lineTo(-1.4, -0.9); cabeza.lineTo(6.8, -0.45); cabeza.closePath();
      var mand = new Path2D();
      mand.moveTo(-2.8, -0.9); mand.lineTo(6.4, -0.6);
      mand.quadraticCurveTo(6.4, -2.0, 4.6, -2.2); mand.lineTo(0.2, -3.0);
      mand.quadraticCurveTo(-2.4, -3.2, -2.8, -0.9); mand.closePath();
      rostro(ctx, cabeza, mand, -1.4, -0.8, ang, pelo, peloOsc, 0.7, 0.7);
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(-0.5, 4.3); ctx.lineTo(-1.6, 8.0); ctx.lineTo(-3.4, 4.5); ctx.closePath();
      }, pelo, peloOsc, 0.3, 0.3);
      ctx.fillStyle = '#c77a8a';
      ctx.beginPath(); ctx.moveTo(-1.0, 4.6); ctx.lineTo(-1.6, 6.8); ctx.lineTo(-2.6, 4.8); ctx.closePath(); ctx.fill();
      /* colmillos algo más grandes (pedido el 14 sep) */
      ctx.save(); girarSobre(ctx, -1.4, -0.8, -ang);
      dientes(ctx, 4.6, 5.5, -0.62, 1, 1.3); dientes(ctx, 1.5, 2.3, -0.75, 1, 0.95);
      ctx.restore();
      dientes(ctx, 5.4, 6.5, -0.45, 1, -1.8); dientes(ctx, 2.8, 3.7, -0.55, 1, -1.25);
      ctx.strokeStyle = peloClaro; ctx.lineWidth = 1.2 / S;
      ctx.beginPath(); ctx.moveTo(-4.2, 1.0); ctx.lineTo(-3.0, 1.7); ctx.moveTo(-4.4, -0.2); ctx.lineTo(-3.2, 0.3); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.ellipse(7.0, 0.1, 0.55, 0.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffcf3a';
      ctx.beginPath(); ctx.ellipse(1.8, 2.5, 0.85, 0.6, -0.25, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.fillRect(1.85, 2.05, 0.26, 0.9);
      contorno(ctx, 2.2);
      ctx.beginPath(); ctx.moveTo(0.6, 3.3); ctx.lineTo(3.0, 2.8); ctx.stroke();
      if (aulla && alza > 0.3) {
        ctx.lineWidth = 1.5 / S;
        for (k = 0; k < 3; k++) {
          var u = (pa * 2 + k / 3) % 1;
          ctx.strokeStyle = 'rgba(230,230,255,' + ((1 - u) * alza) + ')';
          ctx.beginPath(); ctx.arc(7.2, 0.4, 1.5 + u * 5, -0.7, 0.7); ctx.stroke();
        }
      }
      ctx.restore();
    },

    abisal: function (ctx, o) {
      var fz = fase(o), t = o.t, q = qDe(o, 0.7);
      var ang = (q >= 0 ? 30 : [0, 14, 28][fz]) * Math.PI / 180;
      var piel = hex(mix(o.c, '#34405e', 0.72)), pielOsc = mix(piel, '#05070d', 0.5);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(-0.6, Math.sin(t * 3) * 0.3);
      piezaX(ctx, function () {
        var w = Math.sin(t * 9) * 0.5;
        ctx.beginPath(); ctx.moveTo(-4.6, 1.0); ctx.lineTo(-7.6, 3.4 + w);
        ctx.quadraticCurveTo(-6.5, 0, -7.6, -3.2 + w); ctx.lineTo(-4.6, -1.6); ctx.closePath();
      }, piel, pielOsc, 0.3, 0.3);
      ctx.fillStyle = '#120a0c';
      ctx.beginPath(); ctx.moveTo(-1.2, -0.7); ctx.lineTo(6.4, -0.2); ctx.lineTo(6.4, -4.2); ctx.lineTo(-1.2, -1.0); ctx.closePath(); ctx.fill();
      var cabeza = new Path2D();
      cabeza.moveTo(6.0, -0.2);
      cabeza.quadraticCurveTo(6.2, 3.6, 1.8, 4.8); cabeza.quadraticCurveTo(-3.4, 5.6, -5.0, 2.0);
      cabeza.quadraticCurveTo(-5.8, -0.8, -4.2, -2.2); cabeza.lineTo(-1.2, -0.9); cabeza.lineTo(6.0, -0.2); cabeza.closePath();
      var mand = new Path2D();
      mand.moveTo(-3.0, -0.9); mand.lineTo(6.8, -0.4);
      mand.quadraticCurveTo(7.0, -3.0, 3.6, -4.4); mand.quadraticCurveTo(-1.8, -5.4, -4.4, -2.4); mand.closePath();
      rostro(ctx, cabeza, mand, -1.2, -0.8, ang, piel, pielOsc, 0.6, 0.6);
      /* colmillos de aguja, largos (pedido el 14 sep): dos grandes que
       * cruzan la boca cerrada y los demás a su lado */
      ctx.save(); girarSobre(ctx, -1.2, -0.8, -ang);
      dientes(ctx, 0.8, 5.2, -0.5, 4, 2.3);
      dientes(ctx, 5.4, 6.6, -0.45, 1, 3.4);
      ctx.restore();
      dientes(ctx, 1.4, 3.4, -0.3, 2, -2.0);
      dientes(ctx, 3.6, 4.8, -0.3, 1, -3.1);
      dientes(ctx, 5.0, 5.9, -0.25, 1, -1.8);
      ctx.fillStyle = mix(o.c, '#ffffff', 0.4, 0.6);
      [[-2.4, 2.8, 0.38], [-3.7, 1.0, 0.32], [-1.0, 1.6, 0.3], [0.2, 3.6, 0.28]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#dfe8f5';
      ctx.beginPath(); ctx.arc(2.6, 2.6, 0.8, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(2.8, 2.55, 0.3, 0, Math.PI * 2); ctx.fill();
      var bx = 8.0 + Math.sin(t * 4) * 0.4, by = 2.4 + Math.cos(t * 4) * 0.3;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(1.4, 4.7); ctx.quadraticCurveTo(4.8, 9.2, bx, by + 0.9);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.strokeStyle = piel; ctx.lineWidth = 0.5; ctx.stroke();
      var luz = (o.luz == null) ? 1 : o.luz;        // la muerte la apaga
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = luz;
      var rr = (q >= 0) ? 3 + Math.sin(q * Math.PI) * 7 : 3 + Math.sin(t * 6) * 0.4;
      var g = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
      g.addColorStop(0, mix(o.c, '#ffffff', 0.6, q >= 0 ? 0.95 : 0.5));
      g.addColorStop(1, mix(o.c, o.c, 0, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(bx, by, rr, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = luz > 0.5 ? mix(o.c, '#ffffff', 0.55) : '#2a3040';
      ctx.beginPath(); ctx.arc(bx, by, 0.95, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
      ctx.restore();
    },

    pulpo: function (ctx, o) {
      var fz = fase(o), t = o.t, q = qDe(o, 1.0), i;
      var piel = hex(mix(o.c, '#e0527a', 0.5)), pielOsc = mix(piel, '#2a0010', 0.45), ventosa = mix(piel, '#ffffff', 0.55);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.lineCap = 'round';
      for (i = 3; i >= 0; i--) {
        var s0 = -0.6 - i * 0.9, ph = t * 9 + i * 1.3;
        ctx.beginPath(); ctx.moveTo(1.6 - i * 0.8, s0);
        // un poco más largos (pedido el 14 sep)
        ctx.bezierCurveTo(-3.0, s0 - 1.4 + Math.sin(ph) * 1.0, -6.0, s0 - 0.4 + Math.sin(ph + 1.2) * 1.3,
          -9.6 + i * 0.4, s0 - 1.1 + Math.sin(ph + 2.2) * 1.7);
        ctx.strokeStyle = TINTA; ctx.lineWidth = 1.9 - i * 0.15; ctx.stroke();
        ctx.strokeStyle = (i % 2) ? hex(pielOsc) : piel; ctx.lineWidth = 1.15 - i * 0.15; ctx.stroke();
      }
      piezaX(ctx, function () { ctx.beginPath(); ctx.ellipse(1.8, -1.8, 3.0, 1.4, 0, 0, Math.PI * 2); }, piel, pielOsc, 0.4, 0.4);
      piezaX(ctx, function () { ctx.beginPath(); ctx.ellipse(-1.0, 1.9, 5.4, 4.2, 0.35, 0, Math.PI * 2); }, piel, pielOsc, 0.7, 0.7);
      ctx.fillStyle = ventosa;
      [[-2.8, 3.6, 0.5], [-0.6, 4.4, 0.4], [-3.8, 1.4, 0.35]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(3.0, 1.5, 1.1, 1.25, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.3); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.fillRect(2.7, 1.3, 1.0, 0.45);
      var ab = [0.05, 0.4, 0.75][fz];
      ctx.save();
      ctx.translate(4.0, -1.9);
      ctx.fillStyle = '#3a2418';
      ctx.save(); ctx.rotate(ab * 0.6);
      ctx.beginPath(); ctx.moveTo(-0.6, 0.1); ctx.lineTo(1.9, 0); ctx.lineTo(-0.2, 1.0); ctx.closePath(); ctx.fill();
      contorno(ctx, 1); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.rotate(-ab * 0.6);
      ctx.beginPath(); ctx.moveTo(-0.6, -0.1); ctx.lineTo(1.7, 0); ctx.lineTo(-0.2, -1.0); ctx.closePath(); ctx.fill();
      contorno(ctx, 1); ctx.stroke(); ctx.restore();
      ctx.restore();
      if (q >= 0) {
        /* tinta más notoria (pedido el 14 sep): chorro largo de manchas
         * grandes, violeta oscuro con filo claro y brillo, que sobre el
         * fondo negro se lee bien */
        var u = Math.min(1, q * 1.4), fade = q < 0.6 ? 1 : (1 - q) / 0.4;
        ctx.globalAlpha = fade;
        for (i = 9; i >= 0; i--) {
          var ix = 5.6 + i * 1.35 * u * 1.9, iy = -1.9 + Math.sin(i * 2.1 + q * 3) * u * (0.6 + i * 0.25);
          var ir = Math.max(0.3, 1.1 + u * 2.2 - i * 0.14);
          ctx.fillStyle = '#3b1a5c';
          ctx.beginPath(); ctx.arc(ix, iy, ir, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#c9a6ff'; ctx.lineWidth = 1.6 / S; ctx.stroke();
          ctx.fillStyle = 'rgba(220,200,255,.55)';
          ctx.beginPath(); ctx.arc(ix - ir * 0.35, iy + ir * 0.35, ir * 0.25, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },

    momia: function (ctx, o) {
      var fz = fase(o), t = o.t, q = qDe(o, 0.7), k;
      var ang = [0, 12, 22][fz] * Math.PI / 180;
      var venda = '#e9e0c6', vendaOsc = '#a39777', raya = '#8a7e62';
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.rotate(Math.sin(t * 6) * 0.05);
      function cinta(s0, desfase, largo, grosor) {
        ctx.beginPath(); ctx.moveTo(-3.6, s0);
        ctx.bezierCurveTo(-5.4, s0 + Math.sin(t * 8 + desfase) * 1.2, -7.0, s0 - 1 + Math.sin(t * 8 + desfase + 1) * 1.4,
          -3.6 - largo, s0 - 0.6 + Math.sin(t * 8 + desfase + 2) * 1.8);
        ctx.lineCap = 'butt';
        ctx.strokeStyle = TINTA; ctx.lineWidth = grosor + 0.5; ctx.stroke();
        ctx.strokeStyle = venda; ctx.lineWidth = grosor; ctx.stroke();
      }
      cinta(2.4, 0, 5.0, 1.0);
      cinta(-1.4, 1.7, 4.0, 0.8);
      ctx.fillStyle = '#120a0c';
      ctx.beginPath(); ctx.moveTo(0, -0.6); ctx.lineTo(5.4, -0.3); ctx.lineTo(5.4, -3.0); ctx.lineTo(0, -0.9); ctx.closePath(); ctx.fill();
      var cabeza = new Path2D();
      cabeza.moveTo(5.4, -0.3);
      cabeza.quadraticCurveTo(6.0, 4.4, 0.8, 5.2); cabeza.quadraticCurveTo(-4.6, 5.4, -4.6, 0.9);
      cabeza.quadraticCurveTo(-4.5, -1.8, -2.0, -1.9); cabeza.lineTo(0, -0.75); cabeza.lineTo(5.4, -0.3); cabeza.closePath();
      var mand = new Path2D();
      mand.moveTo(-1.8, -0.9); mand.lineTo(5.3, -0.4);
      mand.quadraticCurveTo(5.5, -2.9, 3.0, -3.4); mand.quadraticCurveTo(0, -3.6, -2.4, -1.9); mand.closePath();
      rostro(ctx, cabeza, mand, 0, -0.8, ang, venda, vendaOsc, 0.7, 0.7);
      ctx.strokeStyle = raya; ctx.lineWidth = 1.1 / S;
      ctx.save(); ctx.clip(cabeza);
      ctx.beginPath();
      for (k = -2; k <= 5; k++) { ctx.moveTo(-6, k * 1.3 + 0.9); ctx.lineTo(7, k * 1.3 - 0.6); }
      ctx.stroke(); ctx.restore();
      ctx.save(); girarSobre(ctx, 0, -0.8, -ang); ctx.clip(mand);
      ctx.beginPath();
      for (k = -4; k <= 0; k++) { ctx.moveTo(-6, k * 1.3 + 0.9); ctx.lineTo(7, k * 1.3 - 0.6); }
      ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#1a1410';
      ctx.beginPath(); ctx.ellipse(2.6, 2.4, 1.5, 0.6, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.shadowColor = o.c; ctx.shadowBlur = 4;
      ctx.fillStyle = mix(o.c, '#ffffff', 0.3);
      ctx.beginPath(); ctx.arc(2.9, 2.35, 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (q >= 0) {
        var L = Math.sin(q * Math.PI) * 9;
        ctx.beginPath(); ctx.moveTo(4.6, -1.4);
        ctx.quadraticCurveTo(4.6 + L * 0.5, -1.4 + Math.sin(q * 12) * 2, 4.6 + L, -1.0);
        ctx.lineCap = 'round';
        ctx.strokeStyle = TINTA; ctx.lineWidth = 1.3; ctx.stroke();
        ctx.strokeStyle = venda; ctx.lineWidth = 0.8; ctx.stroke();
      }
      ctx.restore();
    },

    tostadora: function (ctx, o) {
      var fz = fase(o), t = o.t, q = qDe(o, 0.9), k;
      var esmalte = hex(mix(o.c, '#d8d8d8', 0.35)), esmalteOsc = mix(esmalte, '#1a1a1a', 0.45);
      var pan = '#e0a95a', corteza = '#9a6128';
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(0, Math.abs(Math.sin(t * 7)) * 0.35 - 0.6);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-5.0, -2.6);
      ctx.bezierCurveTo(-6.8, -3.4 + Math.sin(t * 6) * 0.6, -7.4, -0.8, -8.6, -2.4 + Math.sin(t * 6 + 1) * 0.6);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 0.45; ctx.stroke();
      function tostada(f, s, rot) {
        ctx.save(); ctx.translate(f, s); ctx.rotate(rot);
        piezaX(ctx, function () { roundRect(ctx, -1.5, -2.2, 3.0, 4.2, 0.9); }, pan, corteza, 0.25, 0.25, 1.2);
        ctx.restore();
      }
      var sube = 0.4 * Math.sin(t * 5);
      if (q < 0) tostada(-2.2, 3.7 + sube, 0);
      tostada(1.4, 3.5 - sube, 0);
      piezaX(ctx, function () { roundRect(ctx, -5.2, -4.4, 10.2, 7.8, 2.4); }, esmalte, esmalteOsc, 0.7, 0.7);
      ctx.fillStyle = '#dfe5ea'; ctx.fillRect(-4.4, -3.7, 8.6, 1.0);
      contorno(ctx, 1); ctx.strokeRect(-4.4, -3.7, 8.6, 1.0);
      piezaX(ctx, function () { roundRect(ctx, -6.3, 0.0, 1.3, 0.8, 0.3); }, '#dfe5ea', '#8b95a0', 0.2, 0.2, 1);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(2.4, 1.3, 0.85, 1.0, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(2.75, 1.2, 0.4, 0, Math.PI * 2); ctx.fill();
      var alto = (q >= 0) ? 1.9 : [0.35, 1.0, 1.7][fz];
      roundRect(ctx, 0.9, -1.4 - alto / 2, 3.6, alto, Math.min(0.5, alto / 2));
      ctx.fillStyle = '#2a0a06'; ctx.fill(); contorno(ctx, 1.3); ctx.stroke();
      if (alto > 0.6) {
        ctx.strokeStyle = 'rgba(255,90,30,.9)'; ctx.lineWidth = 0.9 / S;
        ctx.beginPath();
        for (k = 0; k < 4; k++) { ctx.moveTo(1.4 + k * 0.85, -1.4 - alto * 0.3); ctx.lineTo(1.4 + k * 0.85, -1.4 + alto * 0.3); }
        ctx.stroke();
      }
      if (q >= 0) {
        var h = Math.sin(q * Math.PI) * 7;
        tostada(-2.2 + q * 1.5, 3.7 + h, q * 5);
      }
      ctx.restore();
    },

    globo: function (ctx, o) {
      var fz = fase(o), t = o.t, q = qDe(o, 1.0), i;
      var inf = (q >= 0) ? Math.sin(q * Math.PI) : 0;
      var piel = hex(mix(o.c, '#f0c24a', 0.5)), pielOsc = mix(piel, '#5a3a00', 0.4), vientre = '#f6efd8';
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(0, Math.sin(t * 4) * 0.35);
      var r = 4.6 + inf * 1.9;
      piezaX(ctx, function () {
        var w = Math.sin(t * 10) * 0.5;
        ctx.beginPath(); ctx.moveTo(-r + 0.4, 0.5); ctx.lineTo(-r - 2.6, 2.2 + w);
        ctx.lineTo(-r - 2.2, -1.8 + w); ctx.lineTo(-r + 0.4, -0.7); ctx.closePath();
      }, piel, pielOsc, 0.3, 0.3);
      var lp = 0.5 + inf * 1.6;
      ctx.beginPath();
      for (i = 1; i < 14; i++) {
        var a = i / 14 * Math.PI * 2;
        ctx.moveTo(Math.cos(a - 0.13) * r, Math.sin(a - 0.13) * r);
        ctx.lineTo(Math.cos(a) * (r + lp), Math.sin(a) * (r + lp));
        ctx.lineTo(Math.cos(a + 0.13) * r, Math.sin(a + 0.13) * r);
        ctx.closePath();
      }
      ctx.fillStyle = mix(piel, '#ffffff', 0.3); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
      piezaX(ctx, function () { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); }, piel, pielOsc, 0.6, 0.6);
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = vientre;
      ctx.beginPath(); ctx.ellipse(0.4, -r * 0.78, r * 0.95, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pielOsc;
      [[-1.8, r * 0.55, 0.45], [-3.0, r * 0.12, 0.35], [0.1, r * 0.8, 0.35]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); contorno(ctx, 1.6); ctx.stroke();
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.ellipse(-0.9, -0.7, 1.4, 0.7, 0.6 + Math.sin(t * 14) * 0.35, 0, Math.PI * 2);
      }, piel, pielOsc, 0.2, 0.2, 1.2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(r * 0.42, r * 0.38, 1.25, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(r * 0.42 + 0.35, r * 0.36, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(r * 0.42 + 0.45, r * 0.36 + 0.15, 0.25, 0.25);
      var ab = [0.3, 0.6, 0.9][fz];
      ctx.fillStyle = '#ff8a7a';
      ctx.beginPath(); ctx.ellipse(r - 0.1, -0.7, 0.8, ab + 0.3, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = '#3a0a0a';
      ctx.beginPath(); ctx.ellipse(r, -0.7, 0.4, ab * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    gargola: function (ctx, o) {
      var fz = fase(o), t = o.t, q = qDe(o, 1.0), k;
      var ang = (q >= 0 ? 26 : [0, 12, 22][fz]) * Math.PI / 180;
      var piedra = hex(mix(o.c, '#8e8f99', 0.78)), piedraOsc = mix(piedra, '#1f2028', 0.5);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(-2.0, 3.4); ctx.lineTo(-5.2, 7.9);
        ctx.quadraticCurveTo(-5.9, 5.4, -7.8, 4.4); ctx.quadraticCurveTo(-6.6, 3.0, -7.6, 1.2);
        ctx.quadraticCurveTo(-5.8, 1.2, -4.6, 0.2); ctx.closePath();
      }, hex(mix(piedra, '#000000', 0.3)), hex(piedraOsc), 0.4, 0.4);
      ctx.strokeStyle = '#2a2b33'; ctx.lineWidth = 1 / S;
      ctx.beginPath(); ctx.moveTo(-2.6, 3.2); ctx.lineTo(-5.9, 5.3); ctx.moveTo(-3.0, 2.4); ctx.lineTo(-6.6, 2.6); ctx.stroke();
      ctx.fillStyle = '#120a0c';
      ctx.beginPath(); ctx.moveTo(-0.8, -0.7); ctx.lineTo(5.8, -0.3); ctx.lineTo(5.8, -3.3); ctx.lineTo(-0.8, -1.0); ctx.closePath(); ctx.fill();
      var cabeza = new Path2D();
      cabeza.moveTo(6.0, -0.3);
      cabeza.quadraticCurveTo(6.4, 1.8, 4.8, 2.2); cabeza.lineTo(3.6, 2.4);
      cabeza.quadraticCurveTo(2.6, 4.6, -0.4, 4.8); cabeza.quadraticCurveTo(-4.6, 5.0, -5.0, 1.0);
      cabeza.quadraticCurveTo(-5.0, -1.8, -2.6, -2.0); cabeza.lineTo(-0.8, -0.85); cabeza.lineTo(5.9, -0.35); cabeza.closePath();
      var mand = new Path2D();
      mand.moveTo(-2.4, -0.9); mand.lineTo(5.8, -0.5);
      mand.quadraticCurveTo(6.0, -2.4, 4.4, -2.8); mand.lineTo(0.4, -3.3);
      mand.quadraticCurveTo(-2.2, -3.4, -2.4, -0.9); mand.closePath();
      rostro(ctx, cabeza, mand, -0.8, -0.8, ang, piedra, piedraOsc, 0.7, 0.7);
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(0.6, 4.4); ctx.quadraticCurveTo(0.4, 7.0, -2.4, 7.6);
        ctx.quadraticCurveTo(-0.8, 6.0, -1.3, 4.6); ctx.closePath();
      }, '#c9c6b8', '#7e7a6a', 0.3, 0.3);
      ctx.save(); girarSobre(ctx, -0.8, -0.8, -ang);
      dientes(ctx, 4.2, 5.0, -0.55, 1, 1.0); dientes(ctx, 1.4, 2.0, -0.7, 1, 0.7);
      ctx.restore();
      dientes(ctx, 4.9, 5.7, -0.4, 1, -1.1); dientes(ctx, 2.2, 2.8, -0.5, 1, -0.7);
      ctx.strokeStyle = '#3a3b44'; ctx.lineWidth = 1 / S;
      ctx.beginPath();
      ctx.moveTo(-3.8, 3.2); ctx.lineTo(-2.9, 2.2); ctx.lineTo(-3.3, 1.2); ctx.lineTo(-2.4, 0.4);
      ctx.moveTo(0.8, 3.8); ctx.lineTo(1.4, 3.0);
      ctx.stroke();
      ctx.save();
      ctx.shadowColor = o.c; ctx.shadowBlur = 5;
      ctx.fillStyle = mix(o.c, '#ffffff', 0.35);
      ctx.beginPath(); ctx.ellipse(2.6, 1.8, 0.8, 0.5, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      contorno(ctx, 2.2);
      ctx.beginPath(); ctx.moveTo(1.2, 2.9); ctx.lineTo(4.0, 2.3); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.ellipse(5.6, 1.2, 0.35, 0.22, 0, 0, Math.PI * 2); ctx.fill();
      if (q >= 0) {
        /* más notorio (pedido el 14 sep): nube de polvo clara y ancha en
         * abanico, y pedruscos grandes con contorno que salen dando vueltas */
        for (k = 0; k < 12; k++) {
          var ap = (k / 11 - 0.5) * 1.1, dp = q * (5 + (k % 3) * 2.5);
          var px = 5.6 + Math.cos(ap) * dp, py = -1.6 + Math.sin(ap) * dp;
          ctx.fillStyle = 'rgba(222,216,200,' + (0.85 * (1 - q)) + ')';
          ctx.beginPath(); ctx.arc(px, py, 1.0 + q * 2.4 - (k % 2) * 0.3, 0, Math.PI * 2); ctx.fill();
        }
        for (k = 0; k < 7; k++) {
          var ar = (k / 6 - 0.5) * 1.3, dr = q * (7 + (k % 2) * 3);
          ctx.save();
          ctx.translate(5.8 + Math.cos(ar) * dr, -1.6 + Math.sin(ar) * dr);
          ctx.rotate(q * 8 + k * 1.7);
          var tam = 0.9 + (k % 3) * 0.3;
          ctx.globalAlpha = q < 0.75 ? 1 : (1 - q) / 0.25;
          ctx.beginPath();
          ctx.moveTo(-tam, -tam * 0.4); ctx.lineTo(-tam * 0.2, -tam); ctx.lineTo(tam, -tam * 0.5);
          ctx.lineTo(tam * 0.8, tam * 0.7); ctx.lineTo(-tam * 0.6, tam * 0.8);
          ctx.closePath();
          ctx.fillStyle = (k % 2) ? piedra : hex(piedraOsc);
          ctx.fill();
          contorno(ctx, 1.1); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    },

    /* BICÉFALO, rehecho (14 sep: "se ve feo y pobre"). Una criatura con dos
     * caras de carácter opuesto sobre un cuerpo con cresta y cola:
     *  - arriba EL LISTO: cabeza alargada de reptil, cuerno curvo, ceño,
     *    ojo de serpiente y colmillos;
     *  - abajo EL BOBO: morro redondo, ojazo con la pupila perdida, un diente
     *    de conejo, coloretes y la lengua bífida que asoma al abrir.
     * Cuellos gruesos que se mecen a destiempo y muerden por turnos. */
    bicefalo: function (ctx, o) {
      var fz = fase(o), t = o.t, q = qDe(o, 0.8), k;
      var angA = [0, 14, 26][fz] * Math.PI / 180, angB = [26, 14, 0][fz] * Math.PI / 180;
      if (q >= 0) angA = angB = 32 * Math.PI / 180;
      var piel = hex(mix(o.c, '#7a5ad0', 0.35)), pielOsc = mix(piel, '#140826', 0.5);
      var vientre = '#f3e2b0', vientreOsc = '#c9b27a', hueso = '#efe6cf';
      var meceA = Math.sin(t * 6), meceB = Math.sin(t * 6 + 2.2);
      var hA = { f: 1.6 + meceA * 0.25, s: 3.4 + meceA * 0.35 };
      var hB = { f: 1.4 + meceB * 0.25, s: -3.3 + meceB * 0.3 };
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(0, Math.abs(Math.sin(t * 7)) * 0.25 - 0.1);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      /* la muerte lo pinta por partes (o.parte): 'cuerpo', 'A' o 'B' */
      var parte = o.parte, verCuerpo = !parte || parte === 'cuerpo', verA = !parte || parte === 'A', verB = !parte || parte === 'B';
      if (verCuerpo) {

      /* cola que se enrosca */
      ctx.beginPath();
      ctx.moveTo(-5.4, -1.6);
      ctx.quadraticCurveTo(-8.2, -2.2 + Math.sin(t * 5) * 0.6, -8.0, 0.2 + Math.sin(t * 5 + 1) * 0.8);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.9; ctx.stroke();
      ctx.strokeStyle = piel; ctx.lineWidth = 1.2; ctx.stroke();
      piezaX(ctx, function () {
        var cx = -8.0, cy = 0.2 + Math.sin(t * 5 + 1) * 0.8;
        ctx.beginPath(); ctx.moveTo(cx - 0.9, cy - 0.3); ctx.lineTo(cx, cy + 1.5); ctx.lineTo(cx + 0.9, cy - 0.3); ctx.closePath();
      }, hueso, '#bdb193', 0.2, 0.2, 1.2);

      /* cresta de púas por la espalda */
      [[-5.6, 2.2], [-6.2, 0.4], [-6.0, -1.4]].forEach(function (p, i) {
        piezaX(ctx, function () {
          ctx.beginPath();
          ctx.moveTo(p[0] + 0.9, p[1] + 0.9); ctx.lineTo(p[0] - 1.3, p[1] + 0.4 - i * 0.2); ctx.lineTo(p[0] + 0.6, p[1] - 0.8);
          ctx.closePath();
        }, hueso, '#bdb193', 0.2, 0.2, 1.2);
      });

      /* cuerpo con barriga */
      function cuerpo() { ctx.beginPath(); ctx.ellipse(-3.2, -0.2, 3.5, 4.1, 0, 0, Math.PI * 2); }
      piezaX(ctx, cuerpo, piel, pielOsc, 0.7, 0.7);
      ctx.save(); cuerpo(); ctx.clip();
      ctx.fillStyle = vientre;
      ctx.beginPath(); ctx.ellipse(-1.4, -0.4, 1.9, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = vientreOsc; ctx.lineWidth = 1 / S;
      ctx.beginPath();
      for (k = -2; k <= 2; k++) { ctx.moveTo(-3.0, k * 1.1 - 0.4); ctx.quadraticCurveTo(-1.4, k * 1.1 - 0.9, 0.2, k * 1.1 - 0.4); }
      ctx.stroke();
      ctx.fillStyle = pielOsc;
      [[-4.8, 2.2, 0.5], [-5.4, 0.2, 0.4], [-4.4, -2.4, 0.45]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
      cuerpo(); contorno(ctx, 1.6); ctx.stroke();
      }

      /* cuellos gruesos, del cuerpo a cada cabeza */
      function cuello(f0, s0, h, curva) {
        ctx.beginPath();
        ctx.moveTo(f0, s0);
        ctx.quadraticCurveTo(f0 + 1.2, s0 + curva, h.f - 1.4, h.s - 0.3);
        ctx.strokeStyle = TINTA; ctx.lineWidth = 3.0; ctx.stroke();
        ctx.strokeStyle = piel; ctx.lineWidth = 2.3; ctx.stroke();
        ctx.strokeStyle = vientre; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(f0 + 0.6, s0 - 0.2);
        ctx.quadraticCurveTo(f0 + 1.9, s0 + curva - 0.5, h.f - 0.9, h.s - 0.9);
        ctx.stroke();
      }
      if (verB) cuello(-2.2, -2.0, hB, -1.2);
      if (verA) cuello(-2.2, 1.6, hA, 1.4);

      /* ---- EL BOBO (abajo) ---- */
      if (verB) {
      ctx.save();
      ctx.translate(hB.f, hB.s); ctx.scale(0.66, 0.66);
      ctx.fillStyle = '#2a0a10';
      ctx.beginPath(); ctx.moveTo(-1.0, -0.6); ctx.lineTo(5.4, -0.3); ctx.lineTo(5.2, -3.4); ctx.lineTo(-1.0, -0.9); ctx.closePath(); ctx.fill();
      if (angB > 0.1) {                                    // lengua bífida
        var lg = 1.5 + angB * 6 + Math.sin(t * 18) * 0.4;
        ctx.strokeStyle = '#ff5c86'; ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(1.5, -1.5); ctx.lineTo(3.5 + lg, -1.7);
        ctx.moveTo(3.5 + lg, -1.7); ctx.lineTo(4.4 + lg, -1.0);
        ctx.moveTo(3.5 + lg, -1.7); ctx.lineTo(4.4 + lg, -2.5);
        ctx.stroke();
      }
      var cabB = new Path2D();
      cabB.moveTo(5.6, 0.2);
      cabB.quadraticCurveTo(6.0, 3.4, 2.4, 3.8); cabB.quadraticCurveTo(-1.8, 4.4, -3.8, 2.4);
      cabB.quadraticCurveTo(-5.0, 0.4, -3.4, -1.4); cabB.lineTo(-1.0, -0.9); cabB.lineTo(5.4, -0.4);
      cabB.quadraticCurveTo(5.8, -0.2, 5.6, 0.2); cabB.closePath();
      var manB = new Path2D();
      manB.moveTo(-2.2, -0.9); manB.lineTo(5.3, -0.5);
      manB.quadraticCurveTo(5.6, -2.6, 3.4, -3.0); manB.quadraticCurveTo(0.2, -3.3, -2.4, -1.8); manB.closePath();
      rostro(ctx, cabB, manB, -1.0, -0.8, angB, piel, pielOsc, 0.8, 0.8, 2.4);
      ctx.save(); ctx.clip(cabB);
      ctx.fillStyle = 'rgba(255,120,150,.55)';
      ctx.beginPath(); ctx.ellipse(-0.4, 0.6, 1.2, 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3.3, -0.45, 0.9, 1.0 * -1.2);
      contorno(ctx, 1.6); ctx.strokeRect(3.3, -0.45, 0.9, -1.2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(1.4, 2.1, 1.45, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 2.0); ctx.stroke();
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.arc(1.4 + Math.sin(t * 3) * 0.5, 2.3 + Math.cos(t * 2.3) * 0.4, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.ellipse(5.0, 1.0, 0.35, 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      }

      /* ---- EL LISTO (arriba) ---- */
      if (verA) {
      ctx.save();
      ctx.translate(hA.f, hA.s); ctx.scale(0.66, 0.66);
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(-0.9, 3.9); ctx.quadraticCurveTo(-1.6, 8.0, -5.4, 8.4);
        ctx.quadraticCurveTo(-3.0, 6.2, -3.6, 3.5); ctx.closePath();
      }, '#fff6dc', '#c8b98f', 0.4, 0.4, 2.2);
      ctx.fillStyle = '#2a0a10';
      ctx.beginPath(); ctx.moveTo(-1.2, -0.7); ctx.lineTo(6.2, -0.4); ctx.lineTo(6.0, -3.4); ctx.lineTo(-1.2, -1.0); ctx.closePath(); ctx.fill();
      var cabA = new Path2D();
      cabA.moveTo(6.2, 0.6);
      cabA.quadraticCurveTo(6.2, 2.6, 3.6, 2.9); cabA.quadraticCurveTo(1.0, 3.2, -0.6, 4.4);
      cabA.quadraticCurveTo(-3.6, 5.2, -4.6, 2.6); cabA.quadraticCurveTo(-5.2, 0.2, -3.6, -1.4);
      cabA.lineTo(-1.2, -0.9); cabA.lineTo(6.0, -0.4); cabA.quadraticCurveTo(6.4, 0.0, 6.2, 0.6); cabA.closePath();
      var manA = new Path2D();
      manA.moveTo(-2.4, -0.9); manA.lineTo(5.8, -0.5);
      manA.quadraticCurveTo(5.9, -1.8, 4.4, -2.2); manA.lineTo(0.2, -2.7);
      manA.quadraticCurveTo(-2.2, -2.8, -2.4, -0.9); manA.closePath();
      rostro(ctx, cabA, manA, -1.2, -0.8, angA, piel, pielOsc, 0.8, 0.8, 2.4);
      ctx.save(); girarSobre(ctx, -1.2, -0.8, -angA); dientes(ctx, 3.6, 4.4, -0.6, 1, 1.1); dientes(ctx, 1.4, 2.0, -0.7, 1, 0.8); ctx.restore();
      dientes(ctx, 4.6, 5.5, -0.45, 1, -1.4);
      dientes(ctx, 2.4, 3.1, -0.55, 1, -0.9);
      ctx.fillStyle = pielOsc;
      [[-2.6, 3.0, 0.5], [-3.6, 1.2, 0.4], [-1.2, 3.6, 0.3]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, Math.PI * 2); ctx.fill();
      });
      // rojo: con cualquier color de jugador se distingue (el amarillo se perdía)
      var brilla = q >= 0 ? '#ffffff' : '#ff4a3a';
      ctx.fillStyle = brilla;
      ctx.beginPath(); ctx.ellipse(1.7, 2.0, 1.0, 0.72, -0.2, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.8); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.fillRect(1.6, 1.4, 0.34, 1.2);
      contorno(ctx, 3.2);
      ctx.beginPath(); ctx.moveTo(0.2, 3.1); ctx.lineTo(3.1, 2.5); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.ellipse(5.4, 1.1, 0.35, 0.24, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      }

      ctx.restore();
    },

    pinata: function (ctx, o) {
      var fz = fase(o), t = o.t, q = qDe(o, 1.3), i;
      var ang = [0, 12, 22][fz] * Math.PI / 180;
      var bandas = ['#ff4fa3', '#ffd23f', o.c, '#3ee0c8', '#9b6bff'];
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      ctx.translate(0, Math.abs(Math.sin(t * 7)) * 0.4 - 0.2);
      ctx.rotate(Math.sin(t * 7) * 0.05);
      ctx.lineCap = 'round';
      for (i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(-6.0, -0.4 + i * 0.9);
        ctx.quadraticCurveTo(-7.8, -0.8 + i + Math.sin(t * 9 + i) * 1.2, -9.2, -1.6 + i * 1.1 + Math.sin(t * 9 + i + 1) * 1.4);
        ctx.strokeStyle = bandas[(i * 2) % 5]; ctx.lineWidth = 0.6; ctx.stroke();
      }
      function rayas(camino, vertical) {
        ctx.save(); camino(); ctx.clip();
        for (var j = 0; j < 14; j++) {
          ctx.fillStyle = bandas[j % 5];
          if (vertical) ctx.fillRect(-8 + j * 1.1, -6, 1.1, 14);
          else ctx.fillRect(-8, -5 + j * 1.0, 16, 1.0);
        }
        ctx.restore();
      }
      [-5.3, -3.8, -1.9, -0.5].forEach(function (f, j) {
        ctx.fillStyle = bandas[(j + 1) % 5]; ctx.fillRect(f, -4.4, 0.9, 1.4);
        contorno(ctx, 1); ctx.strokeRect(f, -4.4, 0.9, 1.4);
      });
      function cuerpo() { roundRect(ctx, -6.4, -3.2, 6.8, 5.0, 1.2); }
      rayas(cuerpo, false);
      cuerpo(); contorno(ctx, 1.4); ctx.stroke();
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(0.4, 2.6); ctx.lineTo(-1.0, 6.6); ctx.lineTo(1.4, 2.8); ctx.closePath();
      }, bandas[0], hex(mix(bandas[0], '#000000', 0.35)), 0.2, 0.2);
      ctx.fillStyle = '#2a0a1a';
      ctx.beginPath(); ctx.moveTo(1.0, 0.2); ctx.lineTo(6.4, 0.4); ctx.lineTo(6.2, -2.2); ctx.lineTo(1.0, -0.1); ctx.closePath(); ctx.fill();
      var cab = new Path2D();
      cab.moveTo(6.4, 0.4); cab.quadraticCurveTo(6.6, 3.0, 3.6, 3.2); cab.lineTo(1.6, 3.4);
      cab.lineTo(-1.2, 1.4); cab.lineTo(-1.2, -1.4); cab.lineTo(1.0, -0.1); cab.lineTo(6.2, 0.3); cab.closePath();
      var mand = new Path2D();
      mand.moveTo(0.4, -0.1); mand.lineTo(6.2, 0.3); mand.quadraticCurveTo(6.4, -1.6, 4.6, -2.0); mand.lineTo(1.0, -2.0); mand.closePath();
      rostro(ctx, cab, mand, 1.0, 0.0, ang, bandas[1], bandas[1], 0, 0, 1.4);
      ctx.save(); ctx.clip(cab);
      for (i = 0; i < 8; i++) { ctx.fillStyle = bandas[(i + 3) % 5]; ctx.fillRect(-1.4 + i * 1.1, -4, 1.1, 9); }
      ctx.restore();
      ctx.save(); girarSobre(ctx, 1.0, 0.0, -ang); ctx.clip(mand);
      for (i = 0; i < 8; i++) { ctx.fillStyle = bandas[(i + 3) % 5]; ctx.fillRect(-1.4 + i * 1.1, -4, 1.1, 9); }
      ctx.restore();
      contorno(ctx, 1.4);
      ctx.stroke(cab);
      ctx.save(); girarSobre(ctx, 1.0, 0.0, -ang); ctx.stroke(mand); ctx.restore();
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(1.8, 3.0); ctx.lineTo(1.2, 7.0); ctx.lineTo(3.0, 3.2); ctx.closePath();
      }, bandas[4], hex(mix(bandas[4], '#000000', 0.35)), 0.2, 0.2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(4.0, 1.9, 0.75, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(4.25, 1.85, 0.36, 0, Math.PI * 2); ctx.fill();
      if (q >= 0) {
        for (i = 0; i < 7; i++) {
          var vx = -1.6 + i * 0.9, px = -2.6 + vx * q * 3.2, py = 2.2 + 10 * q - 13 * q * q + (i % 3) * 0.5;
          ctx.globalAlpha = 1 - q * 0.6;
          ctx.fillStyle = bandas[i % 5];
          ctx.beginPath(); ctx.ellipse(px, py, 0.65, 0.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(px - 0.6, py); ctx.lineTo(px - 1.2, py + 0.4); ctx.lineTo(px - 1.2, py - 0.4); ctx.closePath();
          ctx.moveTo(px + 0.6, py); ctx.lineTo(px + 1.2, py + 0.4); ctx.lineTo(px + 1.2, py - 0.4); ctx.closePath();
          ctx.fill();
        }
        /* confeti bien visible (pedido el 14 sep): 22 papelitos grandes de
         * colores vivos que salen en abanico, dan vueltas y aletean */
        var vivos = ['#ff2e88', '#ffe11a', '#19e3ff', '#7dff3a', '#b36bff', '#ffffff', '#ff7a1a'];
        for (i = 0; i < 22; i++) {
          var ac = i * 0.2856 + 0.1, vc = 7 + (i % 4) * 2.5;
          var cx2 = -1.5 + Math.cos(ac) * vc * q, cy2 = 2.5 + Math.sin(ac) * vc * q;
          ctx.save();
          ctx.globalAlpha = q < 0.7 ? 1 : (1 - q) / 0.3;
          ctx.translate(cx2, cy2);
          ctx.rotate(q * 12 + i);
          ctx.scale(Math.abs(Math.cos(q * 16 + i)) * 0.85 + 0.15, 1);
          ctx.fillStyle = vivos[i % vivos.length];
          ctx.fillRect(-0.7, -0.45, 1.4, 0.9);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
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

  /* Las que tienen muerte propia: Sprites.drawSkinDeath les pasa o.muerte en
   * vez de encogerlas girando. BOMBA y GALLETA la llevan dentro de su dibujo;
   * las demás se registran con conMuerte(). */
  var MUERTE_PROPIA = { bomba: 1, galleta: 1 };

  /* ---- skins de tienda (extravagantes, 1.500) ---- */

  /* CUY: regordete, de perfil, sin cuello (la cabeza es la punta del
   * cuerpo). Manchas marrón, blanca y una del color del jugador, orejita de
   * pétalo, ojo brillante, bigotes y patitas que corretean. Come royendo: la
   * barbilla baja y enseña los dientes de conejo. Q: "popcorn", el saltito
   * de los cuyes contentos. */
  DRAW.cuy = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qDe(o, 0.6), k;
    var ang = [0, 12, 22][fz] * Math.PI / 180;
    var marron = '#b8773e', marronOsc = '#7a4a22', blanco = '#f6eee2', mancha = '#8a5228';
    var salto = q >= 0 ? Math.sin(q * Math.PI) * 3.2 : Math.abs(Math.sin(t * 14)) * 0.25;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, salto - 0.4);
    if (q >= 0) ctx.rotate(Math.sin(q * Math.PI * 2) * 0.12);
    ctx.scale(0.95, 0.95);
    var paso = Math.sin(t * 16);
    [[-3.6, paso], [-1.2, -paso], [1.8, paso]].forEach(function (p) {
      piezaX(ctx, function () { ctx.beginPath(); ctx.ellipse(p[0] + p[1] * 0.4, -4.4, 0.9, 0.55, 0, 0, Math.PI * 2); }, '#f0c9b8', '#c99a88', 0.2, 0.2, 1.2);
    });
    var cuerpo = new Path2D();
    cuerpo.moveTo(5.6, 0.2);
    cuerpo.quadraticCurveTo(5.2, 3.2, 2.0, 3.8);
    cuerpo.quadraticCurveTo(-3.0, 4.8, -6.2, 1.8);
    cuerpo.quadraticCurveTo(-7.6, -1.6, -4.8, -4.0);
    cuerpo.quadraticCurveTo(-1.0, -5.2, 2.4, -3.8);
    cuerpo.lineTo(2.6, -1.4);
    cuerpo.lineTo(5.3, -0.7);
    cuerpo.quadraticCurveTo(5.8, -0.4, 5.6, 0.2);
    cuerpo.closePath();
    var mand = new Path2D();
    mand.moveTo(1.6, -1.6); mand.lineTo(5.2, -0.8);
    mand.quadraticCurveTo(5.0, -2.4, 3.6, -2.7); mand.lineTo(1.6, -3.0); mand.closePath();
    ctx.fillStyle = '#3a1410';
    ctx.beginPath(); ctx.moveTo(2.6, -1.3); ctx.lineTo(5.4, -0.6); ctx.lineTo(5.2, -2.4); ctx.lineTo(2.6, -1.6); ctx.closePath(); ctx.fill();
    rostro(ctx, cuerpo, mand, 2.6, -1.4, ang, marron, marronOsc, 0.8, 0.8);
    ctx.save(); ctx.clip(cuerpo);
    ctx.fillStyle = blanco;
    ctx.beginPath(); ctx.ellipse(-1.4, 0.2, 2.2, 5.0, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(-1.0, -4.2, 6.0, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.3;
    ctx.beginPath();
    for (k = 0; k < 3; k++) { ctx.moveTo(-3.6 + k * 1.1, 3.9 - k * 0.2); ctx.lineTo(-3.2 + k * 1.1, 4.6 - k * 0.2); }
    ctx.stroke();
    ctx.save(); girarSobre(ctx, 2.6, -1.4, -ang);
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(4.1, -0.95, 0.5, ang > 0.1 ? 0.9 : 0.5);
    ctx.restore();
    if (ang > 0.1) { ctx.fillStyle = '#fffaf0'; ctx.fillRect(4.3, -1.2, 0.5, 0.7); contorno(ctx, 0.8); ctx.strokeRect(4.3, -1.2, 0.5, 0.7); }
    /* el color del jugador va en un PAÑUELO anudado al cuello, justo detrás
     * de la cabeza, con la punta colgando y lunares blancos */
    ctx.save();
    ctx.translate(-1.1, 0);
    var pan = o.c, panOsc = hex(mix(o.c, '#000000', 0.35));
    ctx.beginPath();
    ctx.moveTo(0.2, 4.0); ctx.quadraticCurveTo(1.4, 0.2, 1.0, -3.8);
    ctx.lineTo(2.3, -3.6); ctx.quadraticCurveTo(2.7, 0.2, 1.5, 4.0);
    ctx.closePath();
    ctx.fillStyle = pan; ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    var bamb = Math.sin(t * 10) * 0.35;
    ctx.beginPath();
    ctx.moveTo(0.9, -2.6); ctx.lineTo(3.2, -3.0); ctx.lineTo(1.9 + bamb, -5.2);
    ctx.closePath();
    ctx.fillStyle = pan; ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    [[1.5, 1.6], [1.8, -1.2], [2.0, -3.7], [1.2, 3.2]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 0.28, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = panOsc;
    ctx.beginPath(); ctx.ellipse(1.6, -2.8, 0.55, 0.45, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
    ctx.restore();
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.ellipse(0.6, 3.6, 1.4, 1.0, -0.5, 0, Math.PI * 2);
    }, '#e8a080', '#b86a50', 0.3, 0.3, 1.3);
    ctx.fillStyle = '#ffc6c6';
    ctx.beginPath(); ctx.ellipse(0.7, 3.5, 0.7, 0.45, -0.5, 0, Math.PI * 2); ctx.fill();
    if (o.ojosX) {                                     // la muerte: ojos en X
      contorno(ctx, 1.6);
      ctx.beginPath(); ctx.moveTo(2.3, 0.7); ctx.lineTo(3.7, 2.1); ctx.moveTo(2.3, 2.1); ctx.lineTo(3.7, 0.7); ctx.stroke();
    } else {
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.arc(3.0, 1.4, 0.75, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(3.25, 1.7, 0.28, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath(); ctx.ellipse(5.5, 0.1, 0.45, 0.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,10,.8)'; ctx.lineWidth = 0.22;
    ctx.beginPath();
    ctx.moveTo(5.0, 0.2); ctx.lineTo(7.0, 0.9); ctx.moveTo(5.0, 0.0); ctx.lineTo(7.2, 0.0); ctx.moveTo(5.0, -0.2); ctx.lineTo(7.0, -0.8);
    ctx.stroke();
    if (q >= 0) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - q) + ')'; ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (k = 0; k < 3; k++) { ctx.moveTo(-3 + k * 2, -5.4 - salto * 0.2); ctx.lineTo(-3 + k * 2, -6.6 - salto * 0.35); }
      ctx.stroke();
    }
    ctx.restore();
  };

  /* LLAMA: de perfil, lana esponjosa, cuello y cabeza alzados, orejas de
   * plátano con borlas de colores, flequillo, pestañas y una manta andina del
   * color del jugador. Mastica moviendo el labio de abajo y camina con sus
   * patas finas. Q: escupe hacia delante. */
  DRAW.llama = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qDe(o, 0.9), k;
    var ang = (q >= 0 && q < 0.25 ? 26 : [0, 10, 20][fz]) * Math.PI / 180;
    var lana = '#efe3cc', lanaOsc = '#c7b38f', cara = '#f5ecdb', caraOsc = '#cdb996';
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(-0.2, Math.abs(Math.sin(t * 8)) * 0.25 - 0.2);
    ctx.scale(0.92, 0.92);
    var paso = Math.sin(t * 12);
    ctx.lineCap = 'round';
    [[-4.6, paso], [-2.0, -paso]].forEach(function (p) {
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p[0], -3.6); ctx.lineTo(p[0] + p[1] * 0.5, -6.4); ctx.stroke();
      ctx.strokeStyle = lanaOsc; ctx.lineWidth = 0.7; ctx.stroke();
    });
    var nubes = [[-3.8, -2.4, 2.6], [-1.6, -2.8, 2.1], [-5.6, -2.2, 1.9]];   // simple: tres bolas
    ctx.strokeStyle = TINTA; ctx.lineWidth = 3.2 / S;
    nubes.forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.stroke(); });
    ctx.fillStyle = lana;
    nubes.forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill(); });
    function cuello() {
      ctx.beginPath();
      ctx.moveTo(-1.8, -1.4);
      ctx.quadraticCurveTo(-1.6, 1.2, -0.4, 2.4);
      ctx.lineTo(1.6, 1.4);
      ctx.quadraticCurveTo(0.6, 0.2, 0.6, -2.2);
      ctx.closePath();
    }
    piezaX(ctx, cuello, lana, lanaOsc, 0.4, 0.2);
    /* bufanda del color del jugador (antes una manta rectangular): una
     * vuelta al cuello y la punta ondeando detrás, con flecos */
    var ond = t * 9, bufOsc = hex(mix(o.c, '#000000', 0.3));
    var puntaS = Math.sin(ond + 2) * 0.9;
    ctx.beginPath();
    ctx.moveTo(-1.9, 1.3);
    ctx.bezierCurveTo(-3.4, 1.5 + Math.sin(ond) * 0.5, -4.8, 0.6 + Math.sin(ond + 1) * 0.7, -6.6, 1.1 + puntaS);
    ctx.lineTo(-6.8, -0.6 + puntaS);
    ctx.bezierCurveTo(-4.8, -1.0 + Math.sin(ond + 1) * 0.7, -3.4, -0.4 + Math.sin(ond) * 0.5, -1.8, -0.4);
    ctx.closePath();
    ctx.fillStyle = o.c; ctx.fill();
    contorno(ctx, 1.5); ctx.stroke();
    ctx.strokeStyle = bufOsc; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(-2.4, 0.45); ctx.bezierCurveTo(-3.6, 0.5 + Math.sin(ond) * 0.5, -4.8, -0.2 + Math.sin(ond + 1) * 0.7, -6.4, 0.25 + puntaS); ctx.stroke();
    ctx.strokeStyle = o.c; ctx.lineWidth = 0.4;
    ctx.beginPath();
    for (k = 0; k < 4; k++) {
      ctx.moveTo(-6.7, puntaS - 0.4 + k * 0.45);
      ctx.lineTo(-7.8, puntaS - 0.6 + k * 0.55 + Math.sin(ond + 3 + k) * 0.3);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2.2, 1.6); ctx.quadraticCurveTo(-0.3, 1.4, 1.5, 0.5);
    ctx.lineTo(1.2, -1.2); ctx.quadraticCurveTo(-0.4, -0.5, -2.1, -0.4);
    ctx.closePath();
    ctx.fillStyle = o.c; ctx.fill();
    contorno(ctx, 1.5); ctx.stroke();
    ctx.strokeStyle = bufOsc; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(-1.8, 0.55); ctx.quadraticCurveTo(-0.3, 0.35, 1.1, -0.45); ctx.stroke();
    function oreja(f0, desfase) {
      var vai = Math.sin(t * 6 + desfase) * 0.15;
      ctx.save(); girarSobre(ctx, f0, 4.6, vai);
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.moveTo(f0 - 0.5, 4.4);
        ctx.quadraticCurveTo(f0 - 1.6, 6.6, f0 - 0.6, 8.0);
        ctx.quadraticCurveTo(f0 + 0.6, 6.8, f0 + 0.6, 4.6); ctx.closePath();
      }, cara, caraOsc, 0.25, 0.25, 1.3);
      ctx.restore();
    }
    oreja(0.4, 1);
    var cabeza = new Path2D();
    cabeza.moveTo(5.8, 2.0);
    cabeza.quadraticCurveTo(6.0, 3.1, 4.4, 3.2);
    cabeza.quadraticCurveTo(3.2, 4.9, 1.2, 4.9);
    cabeza.quadraticCurveTo(-1.6, 4.8, -1.6, 2.8);
    cabeza.quadraticCurveTo(-1.4, 1.0, 0.4, 0.8);
    cabeza.lineTo(2.8, 1.4);
    cabeza.lineTo(5.6, 1.6);
    cabeza.quadraticCurveTo(5.9, 1.7, 5.8, 2.0);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(2.2, 1.5); mand.lineTo(5.5, 1.6);
    mand.quadraticCurveTo(5.5, 0.5, 4.2, 0.5); mand.lineTo(2.4, 0.8); mand.closePath();
    ctx.fillStyle = '#3a1410';
    ctx.beginPath(); ctx.moveTo(2.8, 1.4); ctx.lineTo(5.7, 1.6); ctx.lineTo(5.6, 0.6); ctx.lineTo(2.8, 1.2); ctx.closePath(); ctx.fill();
    rostro(ctx, cabeza, mand, 2.8, 1.4, ang, cara, caraOsc, 0.6, 0.6);
    oreja(1.6, 0);
    [[1.0, 5.0, 0.95]].forEach(function (c) {
      piezaX(ctx, function () { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); }, lana, lanaOsc, 0.2, 0.2, 1.2);
    });
    if (o.ojosX) {                                     // la muerte: ojos en X
      contorno(ctx, 1.5);
      ctx.beginPath(); ctx.moveTo(1.9, 2.5); ctx.lineTo(3.1, 3.7); ctx.moveTo(1.9, 3.7); ctx.lineTo(3.1, 2.5); ctx.stroke();
    } else {
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.ellipse(2.5, 3.1, 0.55, 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(2.7, 3.35, 0.2, 0, Math.PI * 2); ctx.fill();
    }
    if (o.lengua) {                                    // la muerte: lengua fuera
      ctx.fillStyle = '#ff7a9a';
      ctx.beginPath(); ctx.ellipse(5.9, 0.6, 1.2, 0.5, -0.7, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.1); ctx.stroke();
    }
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.ellipse(5.3, 2.4, 0.3, 0.18, 0.4, 0, Math.PI * 2); ctx.fill();
    if (q >= 0) {
      var sx = 6.2 + q * 11, sy = 1.3 + q * 1.2 - q * q * 3;
      ctx.fillStyle = 'rgba(225,245,255,' + (1 - q * 0.5) + ')';
      ctx.beginPath(); ctx.ellipse(sx, sy, 1.0 - q * 0.3, 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,170,200,.8)'; ctx.lineWidth = 0.3; ctx.stroke();
      for (k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.arc(sx - 1.2 - k * 0.9, sy + (k % 2 ? 0.4 : -0.3), 0.3 - k * 0.06, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  };

  /* CARRO (14 sep): cochecito de dibujo animado de perfil, carrocería del
   * color del jugador, ventanillas con brillo, faro delantero con su haz,
   * piloto rojo y ruedas cuyos radios giran con lo que recorre. No muerde:
   * el morro va cerrado, con su parachoques cromado. Echa humito por el tubo de escape. Q: acelerón
   * con nitro (fuego por el escape y líneas de velocidad). Sin ojos en el
   * parabrisas a propósito: eso es de una película con dueño. */
  DRAW.carro = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qDe(o, 0.8), k;
    var ang = 0;                                    // no muerde (pedido el 14 sep)
    var chapa = o.c, chapaOsc = hex(mix(o.c, '#000000', 0.38)), chapaClara = hex(mix(o.c, '#ffffff', 0.35));
    var giro = -(o.s || 0) * 0.45;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 14)) * 0.22 + 0.3);
    if (q >= 0) ctx.rotate(-Math.sin(q * Math.PI) * 0.06);
    ctx.scale(1.15, 1.15);                          // más grande (pedido el 14 sep)

    for (k = 0; k < 3; k++) {                         // humo del escape, recto hacia atrás
      var ph = ((t * 2.2) + k / 3) % 1;
      ctx.fillStyle = 'rgba(200,200,205,' + (0.55 * (1 - ph)) + ')';
      ctx.beginPath(); ctx.arc(-7.4 - ph * 3.2, -1.9, 0.5 + ph * 0.9, 0, Math.PI * 2); ctx.fill();
    }
    if (q >= 0) {                                      // nitro
      var L = 3 + Math.sin(q * Math.PI) * 4 + Math.sin(t * 40) * 0.6;
      var fg = ctx.createLinearGradient(-6.8, 0, -6.8 - L, 0);
      fg.addColorStop(0, 'rgba(255,255,230,1)');
      fg.addColorStop(0.35, 'rgba(120,200,255,.95)');
      fg.addColorStop(1, 'rgba(60,90,255,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(-6.8, -1.3); ctx.quadraticCurveTo(-6.8 - L * 0.6, -1.1, -6.8 - L, -1.9);
      ctx.quadraticCurveTo(-6.8 - L * 0.6, -2.7, -6.8, -2.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - q) + ')'; ctx.lineWidth = 0.35;
      ctx.beginPath();
      [3.2, 0.6, -1.4].forEach(function (sl, i2) {
        var x0 = -8 - i2 * 1.3 - q * 3;
        ctx.moveTo(x0, sl); ctx.lineTo(x0 - 3.5, sl);
      });
      ctx.stroke();
    }
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(-7.2, -2.2, 1.0, 0.6);                // tubo de escape
    contorno(ctx, 1); ctx.strokeRect(-7.2, -2.2, 1.0, 0.6);


    var cuerpo = new Path2D();
    cuerpo.moveTo(6.6, 0.4);
    cuerpo.quadraticCurveTo(6.6, 1.4, 5.5, 1.5);
    cuerpo.lineTo(2.9, 1.6);
    cuerpo.lineTo(1.7, 4.0);
    cuerpo.quadraticCurveTo(1.4, 4.5, 0.7, 4.5);
    cuerpo.lineTo(-3.1, 4.5);
    cuerpo.quadraticCurveTo(-3.8, 4.5, -4.1, 3.9);
    cuerpo.lineTo(-5.1, 1.6);
    cuerpo.lineTo(-6.0, 1.5);
    cuerpo.quadraticCurveTo(-6.8, 1.3, -6.8, 0.4);
    cuerpo.lineTo(-6.8, -1.7);
    cuerpo.quadraticCurveTo(-6.8, -2.6, -5.9, -2.6);
    cuerpo.lineTo(3.8, -2.6);
    cuerpo.lineTo(3.8, -0.6);
    cuerpo.lineTo(6.6, -0.6);
    cuerpo.closePath();
    var mand = new Path2D();
    mand.moveTo(3.8, -0.6); mand.lineTo(6.6, -0.6);
    mand.lineTo(6.6, -1.8); mand.quadraticCurveTo(6.6, -2.6, 5.8, -2.6);
    mand.lineTo(3.8, -2.6); mand.closePath();
    rostro(ctx, cuerpo, mand, 3.8, -0.7, ang, chapa, chapaOsc, 0.7, 0.8);

    ctx.save(); girarSobre(ctx, 3.8, -0.7, -ang);
    ctx.fillStyle = '#c9d0d8'; ctx.fillRect(3.8, -2.2, 2.8, 0.5);   // parachoques cromado
    contorno(ctx, 0.9); ctx.strokeRect(3.8, -2.2, 2.8, 0.5);
    ctx.restore();

    function ventana(p) {
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (var i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
      ctx.closePath();
    }
    [[[0.7, 1.9], [2.4, 1.9], [1.4, 3.9], [0.7, 3.9]], [[-4.3, 1.9], [0.1, 1.9], [0.1, 3.9], [-3.5, 3.9]]].forEach(function (p) {
      ventana(p);
      ctx.fillStyle = '#a9e1ff'; ctx.fill();
      contorno(ctx, 1); ctx.stroke();
      ctx.save(); ventana(p); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.moveTo(p[0][0] + 0.5, p[0][1] + 0.3); ctx.lineTo(p[0][0] + 1.6, p[0][1] + 2.2); ctx.stroke();
      ctx.restore();
    });
    ctx.strokeStyle = chapaOsc; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(0.4, 1.5); ctx.lineTo(0.4, -2.3); ctx.stroke();
    ctx.fillStyle = chapaClara; ctx.fillRect(-1.2, 0.6, 0.9, 0.3);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(-6.2, 0.9, 11.6, 0.35);

    var faro = (q >= 0) ? 1 : 0.75 + 0.25 * Math.sin(t * 6);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var hg = ctx.createLinearGradient(6.6, 0.4, 11, 0.4);
    hg.addColorStop(0, 'rgba(255,240,150,' + (0.45 * faro) + ')');
    hg.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.moveTo(6.5, 0.9); ctx.lineTo(11, 2.0); ctx.lineTo(11, -1.2); ctx.lineTo(6.5, -0.1); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff3a0';
    ctx.beginPath(); ctx.ellipse(6.3, 0.45, 0.45, 0.6, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(-6.9, 0.0, 0.5, 0.9);
    contorno(ctx, 0.9); ctx.strokeRect(-6.9, 0.0, 0.5, 0.9);

    [-3.9, 2.2].forEach(function (fw) {
      if (o.sinRueda && fw > 0) return;               // la muerte: sale rodando
      ctx.fillStyle = '#1b1b1f';
      ctx.beginPath(); ctx.arc(fw, -2.7, 1.75, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = '#c9d0d8';
      ctx.beginPath(); ctx.arc(fw, -2.7, 0.85, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 0.3;
      ctx.beginPath();
      for (k = 0; k < 3; k++) {
        var a2 = giro + k * Math.PI / 3;
        ctx.moveTo(fw - Math.cos(a2) * 0.85, -2.7 - Math.sin(a2) * 0.85);
        ctx.lineTo(fw + Math.cos(a2) * 0.85, -2.7 + Math.sin(a2) * 0.85);
      }
      ctx.stroke();
    });
    ctx.restore();
  };

  /* OSO (14 sep): cabezota de oso pardo de perfil, orejas redondas que se
   * mueven, hocico claro con la nariz brillante, ojo que parpadea y
   * mandíbula con colmillitos. El pelaje lleva un toque del color del
   * jugador. Q: zarpazo, la zarpa sale por delante y deja tres arañazos. */
  DRAW.oso = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qDe(o, 0.7), k;
    var ang = [0, 8, 15][fz] * Math.PI / 180;          // abre poco: más amable
    var pelo = hex(mix(o.c, '#8a5a2e', 0.86)), peloOsc = mix(pelo, '#1c0e04', 0.45);   // pardo, con un toque del jugador
    var hocico = '#dcb88c', dentroOreja = '#c08a62';
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 7)) * 0.25 - 0.1);
    ctx.scale(1.02, 1.02);
    var oreja2 = Math.sin(t * 5) * 0.12;
    ctx.save(); girarSobre(ctx, 0.4, 4.8, oreja2);
    piezaX(ctx, function () { ctx.beginPath(); ctx.arc(0.6, 5.6, 1.35, 0, Math.PI * 2); }, hex(peloOsc), '#1c0e04', 0.2, 0.2);
    ctx.restore();
    if (ang > 0.02) {                                 // por dentro, rojizo; solo con la boca abierta
      ctx.fillStyle = '#8e2f2a';
      ctx.beginPath(); ctx.moveTo(-1.0, -0.75); ctx.lineTo(6.1, -0.5);
      ctx.lineTo(6.0, -0.5 - Math.sin(ang) * 6.5); ctx.lineTo(-1.0, -0.95); ctx.closePath(); ctx.fill();
    }
    var cabeza = new Path2D();
    cabeza.moveTo(6.5, 0.3);
    cabeza.quadraticCurveTo(6.7, 1.8, 4.8, 2.0);
    cabeza.quadraticCurveTo(3.4, 2.2, 2.8, 3.4);
    cabeza.quadraticCurveTo(1.4, 5.7, -1.8, 5.4);
    cabeza.quadraticCurveTo(-5.7, 4.9, -5.9, 1.0);
    cabeza.quadraticCurveTo(-5.9, -2.6, -3.0, -3.0);   // mejilla redonda, sin mechones de punta
    /* la mejilla sigue por debajo de la bisagra: al abrir la boca, la
     * mandíbula gira y antes dejaba ver un hueco raro entre las dos */
    cabeza.quadraticCurveTo(-1.2, -3.1, 0.2, -2.4);
    cabeza.lineTo(-1.0, -0.9);
    cabeza.lineTo(6.3, -0.5);
    cabeza.quadraticCurveTo(6.7, -0.3, 6.5, 0.3);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(-2.8, -0.9); mand.lineTo(6.1, -0.6);
    mand.quadraticCurveTo(6.1, -2.1, 4.4, -2.5);
    mand.quadraticCurveTo(0.4, -3.4, -2.6, -2.8);
    mand.quadraticCurveTo(-3.2, -1.8, -2.8, -0.9);
    mand.closePath();
    rostro(ctx, cabeza, mand, -1.0, -0.8, ang, pelo, peloOsc, 0.8, 0.8);
    ctx.save(); ctx.clip(cabeza);
    ctx.fillStyle = hocico;
    ctx.beginPath(); ctx.ellipse(4.6, 0.9, 2.4, 1.4, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save(); girarSobre(ctx, -1.0, -0.8, -ang); ctx.clip(mand);
    ctx.fillStyle = hocico;
    ctx.beginPath(); ctx.ellipse(3.8, -1.2, 2.6, 1.0, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save(); girarSobre(ctx, -2.4, 4.6, -oreja2);
    piezaX(ctx, function () { ctx.beginPath(); ctx.arc(-2.6, 5.2, 1.65, 0, Math.PI * 2); }, pelo, peloOsc, 0.3, 0.3);
    ctx.fillStyle = dentroOreja;
    ctx.beginPath(); ctx.arc(-2.4, 5.1, 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.ellipse(6.2, 1.1, 0.85, 0.6, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.ellipse(6.0, 1.35, 0.3, 0.17, 0.2, 0, Math.PI * 2); ctx.fill();
    var parpadeo = o.dormido || (t % 3.3) < 0.12;
    ctx.fillStyle = TINTA;
    if (parpadeo) { contorno(ctx, 1.4); ctx.beginPath(); ctx.moveTo(1.2, 2.9); ctx.quadraticCurveTo(2.0, 2.3, 2.8, 2.9); ctx.stroke(); }
    else {
      ctx.beginPath(); ctx.arc(2.0, 2.9, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(2.35, 3.25, 0.34, 0, Math.PI * 2); ctx.fill();
    }
    contorno(ctx, 1.8);                              // ceja recta y tranquila
    ctx.beginPath(); ctx.moveTo(1.1, 4.1); ctx.lineTo(2.9, 4.1); ctx.stroke();
    if (ang < 0.1) {                                  // sonrisa con la boca cerrada
      contorno(ctx, 1.2);
      ctx.beginPath(); ctx.moveTo(4.2, -0.5); ctx.quadraticCurveTo(5.0, -1.1, 5.8, -0.5); ctx.stroke();
    }
    if (q >= 0) {                                     // Q: saca un tarro de miel, con abejas
      var sale = Math.sin(Math.min(1, q / 0.35) * Math.PI / 2) * (q > 0.8 ? (1 - q) / 0.2 : 1);
      ctx.save();
      ctx.translate(7.6, -0.6);
      ctx.scale(sale, sale);
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(-1.6, 1.4); ctx.quadraticCurveTo(-2.3, -0.4, -1.5, -1.9);
        ctx.quadraticCurveTo(0, -2.5, 1.5, -1.9); ctx.quadraticCurveTo(2.3, -0.4, 1.6, 1.4);
        ctx.closePath();
      }, '#f2a53a', '#b86a14', 0.4, 0.4, 1.3);
      piezaX(ctx, function () { roundRect(ctx, -1.9, 1.2, 3.8, 0.9, 0.35); }, '#c98a3e', '#8a5a22', 0.2, 0.2, 1.2);
      ctx.fillStyle = '#ffd36b';
      ctx.beginPath();
      ctx.moveTo(-1.4, 1.2); ctx.quadraticCurveTo(-1.1, 0.2, -0.8, 1.2);
      ctx.quadraticCurveTo(-0.2, -0.3, 0.4, 1.2); ctx.quadraticCurveTo(0.9, 0.5, 1.3, 1.2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      for (k = 0; k < 2; k++) {
        var ab = t * 6 + k * Math.PI;
        var bx = 7.6 + Math.cos(ab) * 2.6, by = 1.2 + Math.sin(ab) * 1.2;
        ctx.globalAlpha = sale;
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.ellipse(bx, by, 0.55, 0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = TINTA; ctx.fillRect(bx - 0.1, by - 0.4, 0.2, 0.8);
        ctx.fillStyle = 'rgba(230,245,255,.8)';
        ctx.beginPath(); ctx.ellipse(bx - 0.1, by + 0.5, 0.35, 0.22, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  var galletaLienzo = null;   // ver la muerte de sk_galleta
  /* GALLETA DE CHOCOLATE (14 sep): galleta con el borde desmigado, pepitas
   * de chocolate, virutas del color del jugador y un ojo simpático. La boca
   * es un MORDISCO con la marca de los dientes (festoneado), fijo; al comer suelta miguitas. Q: explota en migas y pepitas. */
  DRAW.galleta = function (ctx, o) {
    var t = o.t, q = qDe(o, 1.0), k;
    /* abre y cierra, y al cerrar CIERRA DEL TODO: la galleta queda redonda.
     * Antes siempre quedaba medio mordisco y parecía que no cerraba */
    var abre = o.half * 1.1, kb = Math.min(1, abre / 0.77);
    var masa = '#d49a55', masaOsc = '#9c6630', choco = '#3b2112';
    var r = 6.2;
    /* MUERTE (o.muerte de 0 a 1). La galleta NO cambia de
     * dibujo: es la misma, y le van dando mordiscos uno tras otro, cada vez
     * más adentro, hasta que no queda nada. Se pinta en un lienzo aparte para
     * poder borrar los mordiscos sin borrar el laberinto de debajo. */
    if (o.muerte != null && !o.sinMuerte) {
      var pm = o.muerte, TAM = 26, k2, m;
      var cv = galletaLienzo || (galletaLienzo = document.createElement('canvas'));
      cv.width = TAM * S; cv.height = TAM * S;
      var c2 = cv.getContext('2d');
      c2.setTransform(S, 0, 0, S, 0, 0);
      var o2 = {};
      for (var kk in o) o2[kk] = o[kk];
      o2.x = TAM / 2; o2.y = TAM / 2; o2.half = 0; o2.sinMuerte = true; o2.muerte = null;
      DRAW.galleta(c2, o2);
      c2.globalCompositeOperation = 'destination-out';
      var NM = 9, n = Math.min(NM, Math.floor(pm * NM) + 1);
      for (k2 = 0; k2 < n; k2++) {
        var ab = k2 * 2.39 + 0.6, db = Math.max(0, r - k2 * 0.8), rb = 2.3 + k2 * 0.42;
        var bx = TAM / 2 + Math.cos(ab) * db, by = TAM / 2 + Math.sin(ab) * db, at = ab + Math.PI / 2;
        for (m = -1; m <= 1; m++) {
          c2.beginPath();
          c2.arc(bx + Math.cos(at) * m * rb * 0.55, by + Math.sin(at) * m * rb * 0.55, rb * 0.72, 0, Math.PI * 2);
          c2.fill();
        }
      }
      if (pm > 0.93) { c2.beginPath(); c2.arc(TAM / 2, TAM / 2, TAM, 0, Math.PI * 2); c2.fill(); }
      ctx.save();
      var sacude = Math.sin((pm * NM % 1) * Math.PI) * 0.3;
      ctx.drawImage(cv, o.x - TAM / 2 + sacude, o.y - TAM / 2, TAM, TAM);
      var ult = n - 1, fr = pm * NM % 1;
      var au = ult * 2.39 + 0.6, du = Math.max(0, r - ult * 0.8);
      for (k2 = 0; k2 < 6; k2++) {
        var ac = au + (k2 - 2.5) * 0.35, dc = du + fr * 5;
        ctx.globalAlpha = 1 - fr;
        ctx.fillStyle = (k2 % 3 === 0) ? choco : masa;
        ctx.fillRect(o.x + Math.cos(ac) * dc - 0.3, o.y + Math.sin(ac) * dc - 0.3, 0.6, 0.6);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      return;
    }
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.rotate(Math.sin(t * 8) * 0.05);
    function galleta() {
      ctx.beginPath();
      var i, n = 18;
      for (i = 0; i <= n; i++) {
        var a = abre + (2 * Math.PI - 2 * abre) * i / n;
        var rr = r + ((i % 2) ? 0.25 : -0.15);
        var px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      // mordisco festoneado: tres dentelladas de fuera hacia dentro
      var ax = Math.cos(-abre) * r, ay = Math.sin(-abre) * r, bx = Math.cos(abre) * r, by = Math.sin(abre) * r;
      var fondo = r - kb * 3.8;
      var pts = [[ax, ay], [fondo + 0.9 * kb, ay * 0.45], [fondo, 0], [fondo + 0.9 * kb, by * 0.45], [bx, by]];
      for (i = 1; i < pts.length; i++) {
        var mx = (pts[i - 1][0] + pts[i][0]) / 2, my = (pts[i - 1][1] + pts[i][1]) / 2;
        ctx.quadraticCurveTo(mx - 0.9 * kb, my, pts[i][0], pts[i][1]);
      }
      ctx.closePath();
    }
    piezaX(ctx, galleta, masa, masaOsc, 0.7, 0.7, 1.8);
    ctx.save(); galleta(); ctx.clip();
    ctx.fillStyle = 'rgba(255,230,180,.35)';
    ctx.beginPath(); ctx.arc(-1.4, 2.0, 3.2, 0, Math.PI * 2); ctx.fill();
    [[-3.4, 1.2, 0.8], [-1.0, -3.4, 0.9], [-4.0, -2.0, 0.7], [1.2, -1.6, 0.6], [-2.0, 4.2, 0.6], [2.8, 3.8, 0.55]].forEach(function (p, i2) {
      ctx.fillStyle = choco;
      ctx.beginPath();
      ctx.moveTo(p[0] - p[2], p[1] + p[2] * 0.3);
      ctx.quadraticCurveTo(p[0] - p[2] * 0.2, p[1] + p[2] * 1.2, p[0] + p[2], p[1] + p[2] * 0.2);
      ctx.quadraticCurveTo(p[0] + p[2] * 0.4, p[1] - p[2], p[0] - p[2], p[1] + p[2] * 0.3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillRect(p[0] - p[2] * 0.3, p[1] + p[2] * 0.2, p[2] * 0.4, p[2] * 0.25);
    });
    ctx.fillStyle = o.c;
    [[-4.6, 3.4, 0.6], [0.4, -4.6, -0.5], [-2.6, -0.4, 1.1], [3.4, 1.2, 0.3]].forEach(function (p) {
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(p[2]);
      roundRect(ctx, -0.6, -0.18, 1.2, 0.36, 0.18); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
    var parpadeo = (t % 2.9) < 0.12;
    if (parpadeo) { contorno(ctx, 1.4); ctx.beginPath(); ctx.moveTo(0.1, 2.9); ctx.lineTo(1.9, 2.9); ctx.stroke(); }
    else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(1.0, 2.9, 1.0, 1.2, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.3); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.beginPath(); ctx.arc(1.35, 2.8, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(1.5, 3.05, 0.18, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,110,120,.5)';
    ctx.beginPath(); ctx.ellipse(-0.4, 1.0, 0.9, 0.5, 0, 0, Math.PI * 2); ctx.fill();
    if (o.half > 0.3) {                                   // al abrir del todo suelta miguitas
      for (k = 0; k < 3; k++) {
        var mf = ((t * 3) + k / 3) % 1;
        ctx.fillStyle = 'rgba(212,154,85,' + (1 - mf) + ')';
        ctx.fillRect(4.6 + mf * 2.2, -0.8 + k * 0.8, 0.45, 0.45);
      }
    }
    if (q >= 0) {
      /* un poco más notoria (pedido el 15 sep): destello de azúcar, 18 trozos
       * más grandes con contorno y fundido más tardío */
      if (q < 0.3) {
        ctx.strokeStyle = 'rgba(255,236,190,' + (1 - q / 0.3) + ')'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(0, 0, r + q * 8, 0, Math.PI * 2); ctx.stroke();
      }
      for (k = 0; k < 18; k++) {
        var an = k * 0.349 + 0.2, d = 3 + q * (9 + (k % 3) * 2);
        ctx.save();
        ctx.globalAlpha = q < 0.65 ? 1 : (1 - q) / 0.35;
        ctx.translate(Math.cos(an) * d, Math.sin(an) * d);
        ctx.rotate(q * 7 + k);
        ctx.fillStyle = (k % 3 === 0) ? choco : masa;
        ctx.fillRect(-0.65, -0.5, 1.3, 1.0);
        contorno(ctx, 0.9); ctx.strokeRect(-0.65, -0.5, 1.3, 1.0);
        ctx.restore();
      }
    }
    ctx.restore();
  };

  /* ---------- MUERTES de las skins nuevas (15 sep) ----------
   * Sprites.drawSkinDeath las pide con o.muerte (de 0 a 1 en los 1,5 s de la
   * animación de muerte). La skin NO cambia de dibujo: se le saca una foto (la misma skin, quieta y
   * con la boca cerrada) en un lienzo aparte, y la muerte mueve, quema,
   * rompe o borra esa foto. BOMBA y GALLETA llevan la suya dentro. */
  var FOTO = 30, FH = FOTO / 2;
  function tramo(x, a, b) { return Math.max(0, Math.min(1, (x - a) / (b - a))); }
  function suave(x) { return x * x * (3 - 2 * x); }
  function rebote(x) {
    if (x < 0.7) { var a = x / 0.7; return a * a; }
    return 1 - Math.sin((x - 0.7) / 0.3 * Math.PI) * 0.12;
  }
  function conMuerte(id, preparar, morir) {
    var base = DRAW[id], lienzo = null, fotosExtra = [];
    MUERTE_PROPIA[id] = 1;
    DRAW[id] = function (ctx, o) {
      if (o.sinMuerte || o.muerte == null) return base(ctx, o);
      var pm = Math.max(0, Math.min(1, o.muerte));
      if (!lienzo) { lienzo = document.createElement('canvas'); lienzo.width = FOTO * S; lienzo.height = FOTO * S; }
      var c2 = lienzo.getContext('2d');
      c2.setTransform(1, 0, 0, 1, 0, 0);
      c2.globalCompositeOperation = 'source-over';
      c2.globalAlpha = 1;
      c2.clearRect(0, 0, lienzo.width, lienzo.height);
      c2.setTransform(S, 0, 0, S, 0, 0);
      var o2 = {};
      for (var kk in o) o2[kk] = o[kk];
      o2.x = FH; o2.y = FH; o2.d = 3; o2.half = 0; o2.t = 2.0; o2.sinMuerte = true; o2.muerte = null; o2.qSeg = null;
      if (preparar) preparar(o2, pm);
      base(c2, o2);
      c2.setTransform(S, 0, 0, S, 0, 0);
      var v = DIR_V[o.d], ox = (v[0] !== 0) ? 0 : -1, oy = (v[0] !== 0) ? -1 : 0;
      var M = {
        /* otra foto de la skin, con sus propios cambios (n = 1, 2...) */
        foto: function (n, cambios) {
          var extra = fotosExtra[n] || (fotosExtra[n] = document.createElement('canvas'));
          extra.width = FOTO * S; extra.height = FOTO * S;
          var c3 = extra.getContext('2d');
          c3.setTransform(S, 0, 0, S, 0, 0);
          var o3 = {};
          for (var k3 in o2) o3[k3] = o2[k3];
          cambios(o3);
          base(c3, o3);
          return extra;
        },
        ctx: ctx,
        /* (f, s) del marco del cuerpo -> pantalla */
        pant: function (f, s) { return { x: o.x + v[0] * f + ox * s, y: o.y + v[1] * f + oy * s }; },
        /* se coloca en el marco del cuerpo, movido (dx, dy) en pantalla y con
         * escala de pantalla (ex, ey): así "caer" es siempre hacia abajo */
        marco: function (dx, dy, ex, ey) {
          ctx.translate(o.x + (dx || 0), o.y + (dy || 0));
          if (ex != null) ctx.scale(ex, ey);
          ctx.transform(v[0], v[1], ox, oy, 0, 0);
        },
        /* dibuja sobre la foto, en coordenadas del marco */
        enFoto: function (fn, modo) {
          c2.save();
          c2.globalCompositeOperation = modo || 'source-over';
          c2.translate(FH, FH); c2.scale(1, -1);
          fn(c2);
          c2.restore();
        },
        /* pinta la foto: p = { dx, dy, ex, ey (pantalla), rot sobre (pf, ps),
         * sf, ss (escala en el marco), alpha, clip (camino en el marco) } */
        pinta: function (p) {
          var pf = p.pf || 0, ps = p.ps || 0;
          ctx.save();
          M.marco(p.dx, p.dy, p.ex, p.ey);
          if (p.rot) girarSobre(ctx, pf, ps, p.rot);
          if (p.sf != null) { ctx.translate(pf, ps); ctx.scale(p.sf, p.ss); ctx.translate(-pf, -ps); }
          if (p.clip) { p.clip(ctx); ctx.clip(); }
          ctx.globalAlpha = (p.alpha == null) ? 1 : Math.max(0, Math.min(1, p.alpha));
          ctx.scale(1, -1);
          ctx.drawImage(p.lienzo || lienzo, -FH, -FH, FOTO, FOTO);
          ctx.restore();
        },
        /* un trozo cuadrado de la foto, de lado l y centro (f, s) del marco,
         * movido (dx, dy) en pantalla y girado rot */
        trozo: function (f, s, l, dx, dy, rot, alpha) {
          if (alpha <= 0) return;
          var q = M.pant(f, s);
          ctx.save();
          ctx.translate(q.x + dx, q.y + dy);
          ctx.rotate(rot);
          ctx.transform(v[0], v[1], ox, oy, 0, 0);
          ctx.globalAlpha = Math.min(1, alpha);
          ctx.scale(1, -1);
          ctx.drawImage(lienzo, (FH + f - l / 2) * S, (FH - s - l / 2) * S, l * S, l * S, -l / 2, -l / 2, l, l);
          ctx.restore();
        }
      };
      ctx.save();
      morir(M, pm, o);
      ctx.restore();
    };
  }
  /* estrellitas de mareo dando vueltas */
  function mareo(ctx, x, y, t, alpha) {
    for (var k = 0; k < 3; k++) {
      var a = t * 7 + k * 2.09;
      estrella4(ctx, x + Math.cos(a) * 2.6, y + Math.sin(a) * 0.9, 0.9, '#ffe14a', alpha);
    }
  }

  /* PEZ ABISAL: la luz parpadea, se apaga y el pez se hunde echando burbujas */
  conMuerte('abisal', function (o2, pm) {
    o2.luz = pm < 0.4 ? ((Math.floor(pm * 26) % 3 === 1) ? 0.1 : 1) : Math.max(0, 1 - (pm - 0.4) / 0.08);
  }, function (M, pm, o) {
    var ctx = M.ctx, u = tramo(pm, 0.45, 1), fade = 1 - tramo(pm, 0.78, 1), k;
    var hunde = u * u * 9;
    M.pinta({ dy: hunde, rot: -u * 0.45, alpha: fade });
    if (u > 0) {
      ctx.lineWidth = 1.2 / S;
      for (k = 0; k < 5; k++) {
        var b = (u * 1.8 + k * 0.21) % 1;
        ctx.strokeStyle = 'rgba(190,225,255,' + (0.9 * (1 - b) * Math.min(1, u * 4)) + ')';
        ctx.beginPath();
        ctx.arc(o.x + (k - 2) * 1.5 + Math.sin(b * 8 + k) * 0.6, o.y + hunde - 2 - b * 9, 0.4 + (k % 3) * 0.25, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });

  /* HOMBRE LOBO: aúlla y se cae de espaldas */
  conMuerte('lobo', function (o2, pm) {
    o2.t = 0.55 + Math.min(pm, 0.6) * 0.5;          // en pleno aullido
  }, function (M, pm) {
    var u = tramo(pm, 0.3, 1);
    M.pinta({ dy: u * u * 9, rot: suave(Math.min(1, u * 1.4)) * 1.5, pf: -3, ps: -3, alpha: 1 - tramo(pm, 0.78, 1) });
  });

  /* PIÑATA: tiembla, se hincha y revienta en trozos de cartón, confeti y caramelos */
  conMuerte('pinata', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    if (pm < 0.22) {
      var h = tramo(pm, 0, 0.22);
      M.pinta({ rot: Math.sin(pm * 90) * 0.14 * h, sf: 1 + h * 0.2, ss: 1 + h * 0.2 });
      return;
    }
    var e = tramo(pm, 0.22, 1), fade = 1 - tramo(pm, 0.72, 1);
    if (e < 0.18) {
      ctx.fillStyle = 'rgba(255,255,235,' + (0.8 * (1 - e / 0.18)) + ')';
      ctx.beginPath(); ctx.arc(o.x, o.y, 4 + e * 30, 0, Math.PI * 2); ctx.fill();
    }
    for (k = 0; k < 12; k++) {
      var tf = -5.25 + (k % 4) * 3.5, ts = 3.5 - Math.floor(k / 4) * 3.5;
      var p = M.pant(tf, ts), ddx = p.x - o.x, ddy = p.y - o.y, dl = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      var vel = 6 + (hash(k + 5) % 5);
      M.trozo(tf, ts, 3.6, ddx / dl * e * vel, ddy / dl * e * vel + e * e * 6, e * ((k % 2) ? 7 : -7), fade);
    }
    var vivos = ['#ff2e88', '#ffe11a', '#19e3ff', '#7dff3a', '#b36bff', '#ffffff', '#ff7a1a'];
    for (k = 0; k < 28; k++) {
      var ac = k * 0.2244 + 0.1, vc = 7 + (k % 4) * 2.2;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(o.x + Math.cos(ac) * vc * e, o.y + Math.sin(ac) * vc * e + e * e * 5);
      ctx.rotate(e * 12 + k);
      ctx.scale(Math.abs(Math.cos(e * 16 + k)) * 0.85 + 0.15, 1);
      ctx.fillStyle = vivos[k % vivos.length];
      ctx.fillRect(-0.7, -0.45, 1.4, 0.9);
      ctx.restore();
    }
    var dulces = ['#ff4fa3', '#ffd23f', '#3ee0c8', '#9b6bff', o.c, '#ff7a1a'];
    for (k = 0; k < 6; k++) {
      var ad = k * 1.05 + 0.5, px = o.x + Math.cos(ad) * 6 * e, py = o.y + Math.sin(ad) * 4 * e - 6 * e + 13 * e * e;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(px, py); ctx.rotate(e * 5 + k);
      ctx.fillStyle = dulces[k];
      ctx.beginPath(); ctx.ellipse(0, 0, 0.75, 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-0.6, 0); ctx.lineTo(-1.3, 0.5); ctx.lineTo(-1.3, -0.5); ctx.closePath();
      ctx.moveTo(0.6, 0); ctx.lineTo(1.3, 0.5); ctx.lineTo(1.3, -0.5); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });

  /* TOSTADORA: se va quemando hasta quedar negra, con brasas y humo negro */
  conMuerte('tostadora', null, function (M, pm, o) {
    var ctx = M.ctx, k, quema = tramo(pm, 0, 0.55), fade = 1 - tramo(pm, 0.72, 1);
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(28,16,10,' + (quema * 0.88) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    M.pinta({ dx: Math.sin(pm * 70) * 0.25, alpha: fade });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (k = 0; k < 7; k++) {
      var br = (Math.sin(pm * 40 + k * 1.7) + 1) / 2, vivo = tramo(pm, 0.12 + k * 0.03, 0.3) * fade;
      var p = M.pant(-4 + (hash(k + 2) % 90) / 10, -3.5 + (hash(k + 9) % 70) / 10);
      ctx.fillStyle = 'rgba(255,' + Math.round(90 + br * 90) + ',30,' + (vivo * (0.4 + br * 0.6)) + ')';
      ctx.fillRect(p.x - 0.35, p.y - 0.35, 0.7, 0.7);
    }
    ctx.restore();
    for (k = 0; k < 8; k++) {
      var b = (pm * 1.6 + k / 8) % 1, sale = tramo(pm, 0.08 + k * 0.03, 0.3);
      ctx.fillStyle = 'rgba(32,30,34,' + (0.8 * (1 - b) * sale) + ')';
      ctx.beginPath();
      ctx.arc(o.x + (k - 3.5) * 1.1 + Math.sin(b * 6 + k) * 0.9, o.y - 3 - b * 10, 1 + b * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  /* GÁRGOLA: le salen grietas y se desmorona en pedruscos que caen, con polvo */
  conMuerte('gargola', null, function (M, pm, o) {
    var ctx = M.ctx, k, g = tramo(pm, 0, 0.38);
    var GRIETAS = [
      [[1.0, 4.6], [0.2, 2.8], [1.2, 1.0], [0.0, -0.8], [0.8, -2.8]],
      [[-4.8, 1.4], [-2.8, 0.8], [-1.6, 1.8], [0.2, 1.0]],
      [[5.8, 0.8], [3.6, -0.2], [2.4, 0.6], [2.0, -2.4]],
      [[-2.0, 4.6], [-2.6, 2.8], [-4.0, -0.6]],
      [[-3.6, 6.4], [-4.8, 4.2], [-6.6, 3.4]]
    ];
    M.enFoto(function (c) {
      c.strokeStyle = '#121217'; c.lineWidth = 0.6; c.lineJoin = 'round'; c.lineCap = 'round';
      GRIETAS.forEach(function (lin) {
        var n = (lin.length - 1) * g;
        c.beginPath(); c.moveTo(lin[0][0], lin[0][1]);
        for (var i = 1; i < lin.length && i - 1 < n; i++) {
          var fr = Math.min(1, n - (i - 1));
          c.lineTo(lin[i - 1][0] + (lin[i][0] - lin[i - 1][0]) * fr, lin[i - 1][1] + (lin[i][1] - lin[i - 1][1]) * fr);
        }
        c.stroke();
      });
    }, 'source-atop');
    if (pm < 0.38) { M.pinta({ dx: Math.sin(pm * 110) * 0.3 * g }); return; }
    var e = tramo(pm, 0.38, 1);
    for (k = 0; k < 16; k++) {
      var col = k % 4, fil = Math.floor(k / 4);
      var tf = -5.4 + col * 3.6, ts = 6.3 - fil * 3.6;
      var c = tramo(e, ((hash(k + 3) % 100) / 100) * 0.3 + (3 - fil) * 0.04, 1);
      M.trozo(tf, ts, 3.75, ((hash(k + 11) % 100) / 100 - 0.5) * c * 3, c * c * 11, c * ((k % 2) ? 2.2 : -2.2), 1 - tramo(c, 0.65, 1));
    }
    for (k = 0; k < 6; k++) {
      var d = tramo(e, 0.2 + k * 0.05, 1), hx = (hash(k + 21) % 100) / 100;
      ctx.fillStyle = 'rgba(205,198,184,' + (0.45 * Math.sin(d * Math.PI)) + ')';
      ctx.beginPath(); ctx.arc(o.x + (hx - 0.5) * 9 * (0.5 + d), o.y + 5 - d * (2 + hx * 3), 0.8 + d * (1.5 + hx * 1.5), 0, Math.PI * 2); ctx.fill();
    }
  });

  /* PULPO: se derrite hacia abajo, se vuelve tinta y queda un charco */
  conMuerte('pulpo', null, function (M, pm, o) {
    var ctx = M.ctx, k, u = suave(tramo(pm, 0.05, 0.8)), fade = 1 - tramo(pm, 0.84, 1);
    M.enFoto(function (c) {
      c.fillStyle = 'rgba(59,26,92,' + (u * 0.92) + ')';
      c.fillRect(-FH, -FH, FOTO, FOTO);
    }, 'source-atop');
    var ey = 1 - u * 0.94;
    M.pinta({ dy: 5 * (1 - ey), ex: 1 + u * 0.4, ey: ey, alpha: 1 - tramo(pm, 0.68, 0.86) });
    for (k = 0; k < 3; k++) {
      var gd = tramo(pm, 0.15 + k * 0.12, 0.45 + k * 0.12);
      if (gd <= 0 || gd >= 1) continue;
      ctx.fillStyle = '#3b1a5c';
      ctx.beginPath(); ctx.arc(o.x + (k - 1) * 2.4, o.y + 1 + gd * 4.5, 0.55, 0, Math.PI * 2); ctx.fill();
    }
    var w = 2 + u * 7.5, hh = 0.6 + u * 1.3;
    ctx.globalAlpha = fade * Math.min(1, u * 2.5);
    ctx.fillStyle = '#3b1a5c';
    ctx.beginPath(); ctx.ellipse(o.x, o.y + 5.6, w, hh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a6ff'; ctx.lineWidth = 1.6 / S; ctx.stroke();
    ctx.fillStyle = 'rgba(220,200,255,.55)';
    ctx.beginPath(); ctx.ellipse(o.x - w * 0.35, o.y + 5.6 - hh * 0.3, w * 0.22, hh * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  });

  /* MOMIA: las vendas se van desenrollando de arriba abajo hasta que no
   * queda nada; lo último que se apaga es el ojo */
  conMuerte('momia', null, function (M, pm, o) {
    var ctx = M.ctx, N = 11, prog = tramo(pm, 0.04, 0.84) * N, i;
    var PEND = -1.5 / 13;
    var suelta = null;
    M.enFoto(function (c) {
      c.globalCompositeOperation = 'destination-out';
      c.lineCap = 'butt'; c.lineWidth = 1.5;
      for (i = 0; i < N; i++) {
        var hecho = Math.max(0, Math.min(1, prog - i));
        if (hecho <= 0) break;
        var s0 = (6 - i) * 1.3 + 0.9;                  // de la coronilla hacia abajo
        var fIni = 8, fFin = 8 - hecho * 16;
        c.beginPath();
        c.moveTo(fIni, s0 + (fIni + 6) * PEND);
        c.lineTo(fFin, s0 + (fFin + 6) * PEND);
        c.stroke();
        if (hecho < 1) suelta = { f: fFin, s: s0 + (fFin + 6) * PEND, h: hecho };
      }
      if (pm > 0.84) { c.fillRect(-FH, -FH, FOTO, FOTO); }
    });
    M.pinta({});
    if (suelta) {
      var t = o.t, L = 3 + suelta.h * 6;
      ctx.save();
      M.marco();
      ctx.beginPath();
      ctx.moveTo(suelta.f, suelta.s);
      ctx.bezierCurveTo(suelta.f - L * 0.3, suelta.s + 1.2 + Math.sin(t * 14) * 0.8,
        suelta.f - L * 0.7, suelta.s + 2.4 + Math.sin(t * 14 + 1) * 1.2,
        suelta.f - L, suelta.s + 3 + Math.sin(t * 14 + 2) * 1.6);
      ctx.lineCap = 'butt';
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.strokeStyle = '#e9e0c6'; ctx.lineWidth = 0.95; ctx.stroke();
      ctx.restore();
    }
    var ojo = M.pant(2.9, 2.35), luzOjo = 1 - tramo(pm, 0.86, 1);
    if (luzOjo > 0) {
      ctx.save();
      ctx.globalAlpha = luzOjo;
      ctx.shadowColor = o.c; ctx.shadowBlur = 4;
      ctx.fillStyle = mix(o.c, '#ffffff', 0.3);
      ctx.beginPath(); ctx.arc(ojo.x, ojo.y, 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  });

  /* PEZ GLOBO: se desinfla de golpe y sale volando a lo loco, como un globo
   * que se suelta, echando aire */
  conMuerte('globo', null, function (M, pm, o) {
    var ctx = M.ctx, k;
    function donde(pv) {
      return { x: Math.sin(pv * 17) * 3.2 * pv + pv * 3, y: -pv * pv * 9 + Math.sin(pv * 23) * 1.2 * pv };
    }
    var v = tramo(pm, 0.15, 1);
    var tam = pm < 0.15 ? 1 + tramo(pm, 0, 0.15) * 0.25 : 1.25 - suave(tramo(pm, 0.15, 0.8)) * 0.8;
    var fade = 1 - tramo(pm, 0.82, 1), p = donde(v);
    for (k = 3; k >= 1; k--) {
      if (v <= 0) break;
      var pa = donde(Math.max(0, v - k * 0.035));
      ctx.fillStyle = 'rgba(235,245,255,' + (0.5 * (1 - k / 4) * fade) + ')';
      ctx.beginPath(); ctx.arc(o.x + pa.x, o.y + pa.y, 0.5 + k * 0.35, 0, Math.PI * 2); ctx.fill();
    }
    M.pinta({ dx: p.x, dy: p.y, rot: v * v * 10, sf: tam, ss: tam, alpha: fade });
  });

  /* BICÉFALO: cada cabeza se desploma hacia su lado, la de arriba hacia
   * arriba y atrás y la de abajo hacia abajo, con mareo */
  conMuerte('bicefalo', function (o2) { o2.parte = 'cuerpo'; }, function (M, pm, o) {
    var ctx = M.ctx, u = pm < 0.12 ? 0 : rebote(tramo(pm, 0.12, 0.55)), fade = 1 - tramo(pm, 0.8, 1);
    var tiembla = pm < 0.12 ? Math.sin(pm * 120) * 0.08 : 0;
    /* los cuellos se pintan con su cabeza y giran sobre donde nacen, dentro
     * del cuerpo: así nunca se ve un corte */
    var fotoA = M.foto(1, function (o3) { o3.parte = 'A'; });
    var fotoB = M.foto(2, function (o3) { o3.parte = 'B'; });
    M.pinta({ alpha: fade });
    M.pinta({ lienzo: fotoB, alpha: fade, rot: -u * 0.8 - tiembla, pf: -2.4, ps: -1.6 });
    M.pinta({ lienzo: fotoA, alpha: fade, rot: u * 0.8 + tiembla, pf: -2.4, ps: 1.2 });
    if (u > 0.5) {
      var a = M.pant(-3.5, 8), b = M.pant(1.5, -8);
      mareo(ctx, a.x, a.y, o.t, fade);
      mareo(ctx, b.x, b.y, o.t + 1, fade);
    }
  });

  /* CUY: pega un brinco, cae patas arriba con los ojos en X y patalea */
  conMuerte('cuy', function (o2) { o2.ojosX = true; }, function (M, pm, o) {
    var x = tramo(pm, 0, 0.3), g = suave(x), salto = Math.sin(x * Math.PI) * 3;
    var fade = 1 - tramo(pm, 0.84, 1);
    M.pinta({ dy: -salto, sf: 1, ss: 1 - 2 * g, rot: pm > 0.3 ? Math.sin(pm * 50) * 0.03 : 0, alpha: fade });
    if (pm > 0.3) { var p = M.pant(0.5, 6.5); mareo(M.ctx, p.x, p.y, o.t, fade); }
  });

  /* LLAMA: se tambalea, se desmaya de lado y se le sale la lengua */
  conMuerte('llama', function (o2, pm) {
    if (pm > 0.3) { o2.ojosX = true; o2.lengua = true; }
  }, function (M, pm, o) {
    var tambalea = pm < 0.3 ? Math.sin(pm * 40) * 0.14 * tramo(pm, 0, 0.3) : 0;
    var c = rebote(tramo(pm, 0.3, 0.62)), fade = 1 - tramo(pm, 0.84, 1);
    M.pinta({ rot: tambalea - c * Math.PI / 2, pf: 0, ps: -4, dy: c * 1.5, alpha: fade });
  });

  /* CARRO: frena en seco, se arruga, pierde la rueda de delante (que sale
   * rodando) y echa humo negro */
  conMuerte('carro', function (o2) { o2.sinRueda = true; }, function (M, pm, o) {
    var ctx = M.ctx, k, golpe = suave(tramo(pm, 0, 0.14)), fade = 1 - tramo(pm, 0.82, 1);
    if (pm > 0.04) M.enFoto(function (c) {
      c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 0.45; c.lineJoin = 'miter';
      c.beginPath();
      c.moveTo(7.6, 2.0); c.lineTo(6.2, 0.9); c.lineTo(7.2, -0.3); c.lineTo(5.6, -1.6);
      c.moveTo(3.9, 3.6); c.lineTo(3.0, 2.3); c.lineTo(3.9, 1.3); c.lineTo(2.8, 0.1);
      c.moveTo(-1.2, 1.4); c.lineTo(-0.3, 0.2); c.lineTo(-1.4, -1.2);
      c.stroke();
    }, 'source-atop');
    var sacude = pm < 0.3 ? Math.sin(pm * 90) * 0.35 * (1 - pm / 0.3) : 0;
    M.pinta({ dx: sacude, sf: 1 - golpe * 0.2, ss: 1 - golpe * 0.06, pf: -8, ps: -3.5, rot: -golpe * 0.12, alpha: fade });
    if (pm < 0.25) {
      var fr = M.pant(7.8, 0);
      for (k = 0; k < 6; k++) {
        var ch = tramo(pm, 0.02, 0.25), ak = k * 1.05 + 0.3;
        ctx.fillStyle = 'rgba(255,225,120,' + (1 - ch) + ')';
        ctx.fillRect(fr.x + Math.cos(ak) * ch * 5 - 0.25, fr.y + Math.sin(ak) * ch * 5 - 0.25, 0.5, 0.5);
      }
    }
    var w = tramo(pm, 0.08, 0.85);
    if (w > 0) {
      var wf = 2.5 + w * 8, ws = -2.8 + Math.abs(Math.sin(w * Math.PI * 2.5)) * 2.2 * (1 - w);
      ctx.save();
      ctx.globalAlpha = 1 - tramo(pm, 0.75, 0.9);
      M.marco();
      ctx.translate(wf, ws);
      ctx.fillStyle = '#1b1b1f';
      ctx.beginPath(); ctx.arc(0, 0, 2.0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.2); ctx.stroke();
      ctx.fillStyle = '#c9d0d8';
      ctx.beginPath(); ctx.arc(0, 0, 0.98, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 0.35;
      ctx.beginPath();
      for (k = 0; k < 3; k++) {
        var a2 = -w * 12 + k * Math.PI / 3;
        ctx.moveTo(-Math.cos(a2) * 0.98, -Math.sin(a2) * 0.98);
        ctx.lineTo(Math.cos(a2) * 0.98, Math.sin(a2) * 0.98);
      }
      ctx.stroke();
      ctx.restore();
    }
    for (k = 0; k < 8; k++) {
      var b = (pm * 1.5 + k / 8) % 1, sale = tramo(pm, 0.1 + k * 0.025, 0.3);
      var capo = M.pant(3.5, 2.5);
      ctx.fillStyle = 'rgba(30,30,34,' + (0.78 * (1 - b) * sale) + ')';
      ctx.beginPath();
      ctx.arc(capo.x + (k - 3.5) * 0.7 + Math.sin(b * 6 + k) * 0.9, capo.y - 1 - b * 9, 0.9 + b * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  /* OSO: se da la vuelta, se queda panza arriba dormido y le salen zetas */
  conMuerte('oso', function (o2) { o2.dormido = true; }, function (M, pm, o) {
    var ctx = M.ctx, k, x = tramo(pm, 0, 0.25), g = suave(x), salto = Math.sin(x * Math.PI) * 2;
    var respira = 1 + Math.sin(pm * 14) * 0.03 * tramo(pm, 0.25, 0.4), fade = 1 - tramo(pm, 0.86, 1);
    M.pinta({ dy: -salto, sf: respira, ss: (1 - 2 * g) * respira, alpha: fade });
    ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
    for (k = 0; k < 3; k++) {
      var z = tramo(pm, 0.28 + k * 0.14, 0.73 + k * 0.14);
      if (z <= 0 || z >= 1) continue;
      var zx = o.x + 3 + z * 4 + k * 0.6, zy = o.y - 4 - z * 6, tz = 0.8 + k * 0.3 + z * 0.4;
      ctx.globalAlpha = Math.min(1, (1 - z) * 2) * fade;
      ctx.beginPath();
      ctx.moveTo(zx - tz, zy - tz); ctx.lineTo(zx + tz, zy - tz); ctx.lineTo(zx - tz, zy + tz); ctx.lineTo(zx + tz, zy + tz);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.5; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });


  /* ============================================================
   * EFECTOS (tienda, 250): se pintan en coordenadas de pantalla, casi todos
   * como partículas que nacen en puntos FIJOS del camino (rastro()) y se
   * quedan donde nacieron mientras el jugador sigue. `cuerpo()` pinta la
   * skin: cada efecto decide si va debajo o encima de ella.
   * ============================================================ */
  var EFX = {};
  /* partículas que nacen cada `paso` px del camino y viven `vida` px */
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

  EFX.efx_corazones = function (ctx, o, cuerpo) {
    rastro(o, 7, 40).forEach(function (q) {
      ctx.globalAlpha = 1 - q.edad;
      /* rectos: se quedan en la línea del camino, sin subir (pedido el 14 sep) */
      corazon(ctx, q.p.x, q.p.y, 1.9 * (1 - q.edad * 0.4),
        (q.n % 2) ? '#ff4d7a' : '#ff9ab8');
    });
    ctx.globalAlpha = 1;
    cuerpo();
  };
  EFX.efx_notas = function (ctx, o, cuerpo) {
    rastro(o, 10, 46).forEach(function (q) {
      ctx.globalAlpha = 1 - q.edad;
      nota(ctx, q.p.x - 0.5, q.p.y + 0.9, 2.1,
        (q.n % 2) ? '#ffffff' : mix(o.c, '#ffffff', 0.4));
    });
    ctx.globalAlpha = 1;
    cuerpo();
  };
  EFX.efx_burbujas = function (ctx, o, cuerpo) {
    rastro(o, 6, 36).forEach(function (q) {
      var bx = q.p.x, by = q.p.y, rr = 1.1 + q.edad * 1.5 + (q.n % 3) * 0.35;
      ctx.globalAlpha = 1 - q.edad * 0.6;
      if (q.edad > 0.88) {
        ctx.strokeStyle = '#cff6ff'; ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.arc(bx, by, rr * 1.5, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(bx, by, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx - rr * 0.5, by - rr * 0.55, 0.5, 0.5);
      }
    });
    ctx.globalAlpha = 1;
    cuerpo();
  };
  EFX.efx_huellas = function (ctx, o, cuerpo) {
    rastro(o, 5, 55).forEach(function (q) {
      var v = DIR_V[q.p.d], lado = (q.n % 2) ? 1 : -1;
      ctx.save();
      ctx.globalAlpha = (1 - q.edad) * 0.8;
      ctx.translate(q.p.x - v[1] * lado * 2.2, q.p.y + v[0] * lado * 2.2);
      ctx.rotate(Math.atan2(v[1], v[0]));
      ctx.fillStyle = mix(o.c, '#ffffff', 0.25);
      ctx.beginPath(); ctx.ellipse(-0.3, 0, 1.1, 0.65, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.arc(1.2, -0.55, 0.3, 0, Math.PI * 2); ctx.arc(1.35, 0, 0.3, 0, Math.PI * 2); ctx.arc(1.2, 0.55, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    cuerpo();
  };
  /* CHISPAS, más llamativo (14 sep): al doblar una esquina, fogonazo con
   * halo, rayos de luz que giran un momento, 18 chispas largas con brillo
   * que salen disparadas y ascuas que se quedan titilando */
  EFX.efx_chispas = function (ctx, o, cuerpo) {
    /* o.giro: px andados desde el último giro; c, el recorrido donde giró
     * (fija el azar de las chispas de ESE giro) */
    var dist = (o.giro >= 0) ? o.giro : 1e9, c = Math.round(o.s - dist), k, VIDA = 32;
    cuerpo();
    if (dist >= VIDA) return;
    var p = o.back(dist), edad = dist / VIDA;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (edad < 0.35) {
      var fl = 1 - edad / 0.35, rf = 3 + edad * 14;
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rf);
      g.addColorStop(0, 'rgba(255,255,230,' + fl + ')');
      g.addColorStop(0.4, 'rgba(255,200,60,' + (0.8 * fl) + ')');
      g.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, rf, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,245,200,' + fl + ')'; ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (k = 0; k < 4; k++) {
        var ar = k * Math.PI / 4 + edad * 3, lr = 4 + edad * 10;
        ctx.moveTo(p.x - Math.cos(ar) * lr, p.y - Math.sin(ar) * lr);
        ctx.lineTo(p.x + Math.cos(ar) * lr, p.y + Math.sin(ar) * lr);
      }
      ctx.stroke();
    }
    ctx.lineCap = 'round';
    ctx.shadowBlur = 4;
    for (k = 0; k < 18; k++) {
      var ang = k * 0.349 + (hash(c + k) % 100) / 200, vel = 8 + (k % 3) * 4;
      var d0 = 1 + edad * vel, d1 = d0 + 3.8 * (1 - edad) + 0.6;
      var col = (k % 3 === 0) ? '255,255,255' : (k % 3 === 1 ? '255,214,70' : '255,140,40');
      ctx.shadowColor = 'rgb(' + col + ')';
      ctx.strokeStyle = 'rgba(' + col + ',' + (1 - edad) + ')';
      ctx.lineWidth = 1.1 * (1 - edad) + 0.3;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(ang) * d0, p.y + Math.sin(ang) * d0);
      ctx.lineTo(p.x + Math.cos(ang) * d1, p.y + Math.sin(ang) * d1);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    for (k = 0; k < 6; k++) {
      var ae = k * 1.047 + 0.5, de = 3 + edad * 6;
      estrella4(ctx, p.x + Math.cos(ae) * de, p.y + Math.sin(ae) * de,
        1.4 * (1 - edad) * (0.6 + 0.4 * Math.sin(o.t * 30 + k)), '#fff3b0', 1 - edad);
    }
    ctx.restore();
  };
  /* CONFETI, más llamativo (14 sep): fogonazo de colores, onda, 34
   * papelitos grandes que aletean, serpentinas rizadas y destellos */
  EFX.efx_confeti = function (ctx, o, cuerpo) {
    cuerpo();
    var q = (o.confeti >= 0 && o.confeti < 1.4) ? o.confeti / 1.4 : -1, k;
    if (q < 0) return;
    var cols = ['#ff2e88', '#ffe11a', '#19e3ff', '#7dff3a', '#b36bff', '#ffffff', '#ff7a1a'];
    ctx.save();
    if (q < 0.25) {
      var fl = 1 - q / 0.25;
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, 10);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.8 * fl) + ')');
      g.addColorStop(0.5, 'rgba(255,80,180,' + (0.45 * fl) + ')');
      g.addColorStop(1, 'rgba(80,200,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(o.x, o.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.strokeStyle = 'rgba(255,255,255,' + Math.max(0, 0.8 - q * 1.6) + ')';
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(o.x, o.y, 4 + q * 16, 0, Math.PI * 2); ctx.stroke();
    var fade = q < 0.7 ? 1 : (1 - q) / 0.3;
    for (k = 0; k < 34; k++) {
      var ang = k * 0.1848 + 0.1, vel = 7 + (k % 5) * 2.4;
      var px = o.x + Math.cos(ang) * vel * q * 1.5, py = o.y + Math.sin(ang) * vel * q * 1.5;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(px, py); ctx.rotate(q * 10 + k);
      ctx.scale(Math.abs(Math.cos(q * 14 + k)) * 0.8 + 0.2, 1);
      ctx.fillStyle = cols[k % cols.length];
      ctx.fillRect(-0.95, -0.55, 1.9, 1.1);
      ctx.restore();
    }
    ctx.lineCap = 'round';
    for (k = 0; k < 5; k++) {
      var as = k * 1.2566 + 0.6, ds = 3 + q * 12;
      var sx = o.x + Math.cos(as) * ds, sy = o.y + Math.sin(as) * ds;
      ctx.globalAlpha = fade;
      ctx.strokeStyle = cols[(k * 2) % cols.length]; ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + Math.cos(as + 1.6) * 2, sy + Math.sin(as + 1.6) * 2,
        sx + Math.cos(as) * 2 + Math.cos(as - 1.6) * 2, sy + Math.sin(as) * 2 + Math.sin(as - 1.6) * 2,
        sx + Math.cos(as) * 4, sy + Math.sin(as) * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (k = 0; k < 4; k++) {
      var ad = k * 1.57 + 0.8, dd = 5 + q * 10;
      estrella4(ctx, o.x + Math.cos(ad) * dd, o.y + Math.sin(ad) * dd, 1.6 * Math.sin(q * Math.PI), '#ffffff', fade);
    }
    ctx.restore();
  };
  /* ESTRELLAS, más llamativo (14 sep): estrellas grandes con halo de luz
   * que giran y titilan, en dorado, blanco y celeste, con un destello en
   * cruz de vez en cuando */
  EFX.efx_estrellas = function (ctx, o, cuerpo) {
    var cols = ['#ffe45c', '#ffffff', '#9fe8ff'];
    ctx.save();
    rastro(o, 6, 40).forEach(function (q) {
      var brilla = 0.65 + 0.35 * Math.sin(o.t * 12 + q.n);
      var tam = 4.2 * (1 - q.edad * 0.75) * brilla, a = 1 - q.edad;
      var col = cols[q.n % cols.length];
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(q.p.x, q.p.y, 0, q.p.x, q.p.y, tam * 2);
      g.addColorStop(0, 'rgba(255,240,190,' + (0.65 * a) + ')');
      g.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(q.p.x, q.p.y, tam * 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.translate(q.p.x, q.p.y);
      ctx.rotate(q.edad * 3 + q.n);
      estrella4(ctx, 0, 0, tam, col, a);
      estrella4(ctx, 0, 0, tam * 0.45, '#ffffff', a);
      ctx.restore();
      if ((q.n % 4) === 0 && q.edad < 0.35) {
        var cr = (1 - q.edad / 0.35);
        ctx.strokeStyle = 'rgba(255,255,255,' + cr + ')'; ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.moveTo(q.p.x - tam * 2.2, q.p.y); ctx.lineTo(q.p.x + tam * 2.2, q.p.y);
        ctx.moveTo(q.p.x, q.p.y - tam * 2.2); ctx.lineTo(q.p.x, q.p.y + tam * 2.2);
        ctx.stroke();
      }
    });
    ctx.restore();
    cuerpo();
  };
  EFX.efx_hojas = function (ctx, o, cuerpo) {
    var cols = ['#e76f24', '#f4a261', '#c1440e', '#e9c46a'];
    rastro(o, 8, 52).forEach(function (q) {
      ctx.save();
      ctx.globalAlpha = 1 - q.edad * q.edad;
      ctx.translate(q.p.x, q.p.y);
      ctx.rotate(q.edad * 5 + q.n);
      ctx.scale(1.4, 1.4);
      ctx.fillStyle = cols[q.n % cols.length];
      ctx.beginPath();
      ctx.moveTo(-1.5, 0); ctx.quadraticCurveTo(0, -1.1, 1.5, 0); ctx.quadraticCurveTo(0, 1.1, -1.5, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,30,0,.6)'; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(-1.3, 0); ctx.lineTo(1.3, 0); ctx.stroke();
      ctx.restore();
    });
    cuerpo();
  };
  EFX.efx_nieve = function (ctx, o, cuerpo) {
    rastro(o, 6, 56).forEach(function (q) {
      var fx = q.p.x, fy = q.p.y, s2 = 1.3 + (q.n % 3) * 0.3, a;
      ctx.globalAlpha = 1 - q.edad;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.45;
      ctx.beginPath();
      for (a = 0; a < 3; a++) {
        var ang = a * Math.PI / 3 + q.edad * 2;
        ctx.moveTo(fx - Math.cos(ang) * s2, fy - Math.sin(ang) * s2);
        ctx.lineTo(fx + Math.cos(ang) * s2, fy + Math.sin(ang) * s2);
      }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    cuerpo();
  };
  /* RAYOS, rediseñado (14 sep): aura eléctrica azul que late alrededor del
   * cuerpo y rayos de verdad —quebrados, con ramas, un núcleo blanco y un
   * brillo celeste— que saltan del cuerpo a puntos cercanos, con una chispa
   * donde tocan. Cambian de sitio varias veces por segundo. */
  EFX.efx_rayos = function (ctx, o, cuerpo) {
    var semilla = Math.floor(o.t * 12), k, j;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var late = 0.5 + 0.5 * Math.sin(o.t * 9);
    var g = ctx.createRadialGradient(o.x, o.y, R * 0.6, o.x, o.y, R + 3.5);
    g.addColorStop(0, 'rgba(80,170,255,0)');
    g.addColorStop(0.6, 'rgba(90,190,255,' + (0.1 + 0.08 * late) + ')');
    g.addColorStop(1, 'rgba(90,190,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(o.x, o.y, R + 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    cuerpo();
    function azar(n) { return (hash(n) % 1000) / 1000; }
    function rayo(x0, y0, ang, largo, n, grueso) {
      var pts = [[x0, y0]], seg = 4;
      for (j = 1; j <= seg; j++) {
        var d = largo * j / seg, desv = (azar(n + j * 7) - 0.5) * 2.2 * (j < seg ? 1 : 0.3);
        pts.push([x0 + Math.cos(ang) * d - Math.sin(ang) * desv, y0 + Math.sin(ang) * d + Math.cos(ang) * desv]);
      }
      [[grueso * 2.2, 'rgba(110,200,255,.55)'], [grueso, '#ffffff']].forEach(function (capa) {
        ctx.lineWidth = capa[0]; ctx.strokeStyle = capa[1];
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      });
      return pts;
    }
    ctx.save();
    ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
    ctx.shadowColor = '#7fd4ff'; ctx.shadowBlur = 2;
    for (k = 0; k < 2; k++) {
      if (azar(semilla * 13 + k) < 0.45) continue;
      var ang = azar(semilla * 3 + k * 11) * Math.PI * 2;
      var x0 = o.x + Math.cos(ang) * (R - 0.5), y0 = o.y + Math.sin(ang) * (R - 0.5);
      var largo = 3.5 + azar(semilla + k * 5) * 2;
      rayo(x0, y0, ang + (azar(semilla + k) - 0.5) * 0.6, largo, semilla * 17 + k * 31, 0.35);
    }
    ctx.restore();
  };

  /* ============================================================
   * ACCESORIOS (tienda, 450): en el marco del cuerpo (f hacia delante, s
   * hacia la coronilla), encima de la skin. Solo en las que tienen forma de
   * Pac-Man: en una extravagante flotarían fuera de su cara.
   * ============================================================ */
  var ACC = {};
  ACC.acc_gafas = function (ctx, o) {
    /* GAFAS DE SOL, mejoradas (14 sep): montura de pasta con el canto de
     * arriba grueso, cristal ahumado en degradado (se distingue del fondo
     * negro), patilla hacia atrás, puente hacia el otro cristal y un reflejo
     * que cruza con un destello en la esquina. Todo por encima de la boca:
     * sobre el hueco abierto el cristal se perdía. */
    function cristal() {
      ctx.beginPath();
      ctx.moveTo(-1.3, 4.9);
      ctx.lineTo(3.5, 4.9);
      ctx.quadraticCurveTo(3.7, 3.0, 2.4, 2.7);
      ctx.quadraticCurveTo(0.6, 2.4, -0.6, 2.8);
      ctx.quadraticCurveTo(-1.5, 3.3, -1.3, 4.9);
      ctx.closePath();
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-1.1, 4.5); ctx.lineTo(-5.4, 5.0); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(-1.3, 4.65); ctx.lineTo(-5.2, 5.1); ctx.stroke();
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(3.4, 4.3); ctx.quadraticCurveTo(4.9, 4.9, 6.4, 4.4); ctx.stroke();
    cristal();
    var g = ctx.createLinearGradient(0, 4.9, 0, 2.5);
    g.addColorStop(0, '#3b4150');
    g.addColorStop(0.55, '#15171d');
    g.addColorStop(1, '#050506');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#6b7080'; ctx.lineWidth = 0.3; ctx.stroke();
    ctx.strokeStyle = '#111111'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-1.4, 4.85); ctx.lineTo(3.6, 4.85); ctx.stroke();
    var b = (o.t * 0.8) % 2.2;
    ctx.save();
    cristal(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath(); ctx.moveTo(-1.4, 4.4); ctx.lineTo(3.6, 4.4); ctx.lineTo(3.6, 3.8); ctx.lineTo(-1.4, 4.0); ctx.closePath(); ctx.fill();
    if (b < 1) {
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      var fx = -2.2 + b * 6;
      ctx.beginPath();
      ctx.moveTo(fx, 5); ctx.lineTo(fx + 0.8, 5); ctx.lineTo(fx - 0.6, 2.3); ctx.lineTo(fx - 1.4, 2.3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx + 1.2, 5); ctx.lineTo(fx + 1.5, 5); ctx.lineTo(fx + 0.1, 2.3); ctx.lineTo(fx - 0.2, 2.3);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    if (b > 1.1 && b < 1.5) {
      estrella4(ctx, 3.2, 4.6, 1.3 * Math.sin((b - 1.1) / 0.4 * Math.PI), '#ffffff', 1);
    }
  };
  /* GAFAS AFILADAS (14 sep, pedidas "como las de Squirtle"): el cristal
   * negro ancho de canto recto arriba, la esquina de fuera en punta hacia
   * atrás y la de abajo subiendo hacia la nariz, con dos reflejos blancos en
   * diagonal y el puente hacia el otro cristal. El nombre no usa el del
   * Pokémon: es una marca ajena. */
  ACC.acc_afiladas = function (ctx, o) {
    /* Copia del diseño de referencia: un cristal negro grande con el canto
     * de arriba RECTO que sube un poco hacia la nariz, la punta de fuera muy
     * afilada y sobresaliendo por detrás de la cara, y el borde de abajo en
     * una curva que baja y vuelve a subir redondeada junto a la nariz. Dos
     * franjas de reflejo lila claro en diagonal, una ancha y otra fina. Sin
     * patilla: el cristal va plano sobre la cara y sigue por delante hacia el
     * otro. */
    function cristal() {
      ctx.beginPath();
      /* por encima de la boca: sobre el hueco de la boca el negro se perdía
       * contra el fondo negro */
      ctx.moveTo(-6.6, 4.1);
      ctx.lineTo(4.0, 5.7);
      ctx.quadraticCurveTo(5.2, 4.3, 4.2, 3.4);
      ctx.quadraticCurveTo(3.2, 2.7, 1.6, 2.6);
      ctx.quadraticCurveTo(-2.8, 2.2, -6.6, 4.1);
      ctx.closePath();
    }
    cristal();
    ctx.fillStyle = '#050505'; ctx.fill();
    ctx.strokeStyle = '#4a4a52'; ctx.lineWidth = 0.4; ctx.lineJoin = 'miter'; ctx.stroke();
    ctx.save();
    cristal(); ctx.clip();
    ctx.fillStyle = '#d4d2e6';
    [[-2.2, 1.5], [0.4, 0.5]].forEach(function (r) {
      ctx.beginPath();
      ctx.moveTo(r[0], 5.4); ctx.lineTo(r[0] + r[1], 5.4);
      ctx.lineTo(r[0] + r[1] + 2.3, 1.2); ctx.lineTo(r[0] + 2.3, 1.2);
      ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  };
  /* MOSTACHO animado (14 sep, antes BIGOTE): un bigotazo frondoso de
   * manubrio pegado al labio de arriba (sube y baja con la boca), con
   * mechones que se mueven al correr, las puntas enroscadas que se mecen
   * y, cada pocos segundos, un retorcido de puntas con brillo. */
  ACC.acc_bigote = function (ctx, o) {
    var t = o.t;
    var mece = Math.sin(t * 9) * 0.22;
    var tr = (t % 3.2) / 3.2, retuerce = tr > 0.82 ? Math.sin((tr - 0.82) / 0.18 * Math.PI) : 0;
    var pelo = '#3a2210', peloClaro = '#7a5230';
    /* se apoya justo encima del labio de arriba, casi horizontal: girarlo
     * entero con la boca lo dejaba en diagonal, como una ceja */
    // de perfil se ve MEDIO mostacho: nace bajo la nariz y va hacia la mejilla
    ctx.translate(4.5, 4.5 * Math.tan(o.half) + 0.55 + Math.abs(Math.sin(t * 7)) * 0.15);
    ctx.rotate(o.half * 0.3);
    ctx.scale(0.9, 0.9);
    function mitad(lado) {
      ctx.save();
      ctx.scale(lado, 1);
      ctx.beginPath();
      ctx.moveTo(0, 0.9);
      ctx.quadraticCurveTo(1.6, 1.9, 3.0, 1.0);
      ctx.quadraticCurveTo(3.8, 0.4, 4.2, -0.2);
      ctx.quadraticCurveTo(3.2, -0.5, 2.4, -0.2);
      ctx.quadraticCurveTo(1.0, 0.2, 0, -0.4);
      ctx.closePath();
      ctx.fillStyle = pelo; ctx.fill();
      ctx.strokeStyle = '#1a0e06'; ctx.lineWidth = 0.35; ctx.stroke();
      ctx.strokeStyle = peloClaro; ctx.lineWidth = 0.25;
      ctx.beginPath();
      for (var k = 0; k < 4; k++) {
        var fx = 0.5 + k * 0.8, onda = Math.sin(t * 12 + k * 1.3 + lado) * 0.2;
        ctx.moveTo(fx, 0.9 - k * 0.12);
        ctx.quadraticCurveTo(fx + 0.4, 0.4 + onda, fx + 0.7, -0.05 - k * 0.05);
      }
      ctx.stroke();
      ctx.save();
      ctx.translate(4.1, -0.1);
      ctx.rotate(mece * lado + retuerce * 2.4);
      ctx.strokeStyle = pelo; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0.55, 0.55, 0.6, Math.PI * 1.1, Math.PI * 2.6);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    }
    mitad(-1);
    ctx.fillStyle = pelo;
    ctx.beginPath(); ctx.ellipse(0, 0.35, 0.9, 0.75, 0, 0, Math.PI * 2); ctx.fill();
    if (retuerce > 0.3) estrella4(ctx, -4.8, 1.2, 1.1 * retuerce, '#fff3d0', 1);
  };
  ACC.acc_auriculares = function (ctx, o) {
    /* la diadema NACE del auricular: sube desde su parte de arriba por el
     * costado de la cabeza, pasa por la coronilla y baja hacia el otro lado,
     * que queda escondido detrás (antes flotaba suelta por encima) */
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1.8, 3.2);
    ctx.quadraticCurveTo(-2.3, 6.4, 0.0, 6.9);
    ctx.quadraticCurveTo(1.4, 7.1, 2.2, 6.5);
    ctx.strokeStyle = '#1b1b22'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.strokeStyle = '#8a8a99'; ctx.lineWidth = 0.6; ctx.stroke();
    roundRect(ctx, -3.4, -0.4, 3.2, 4.0, 1.3);
    ctx.fillStyle = '#e63946'; ctx.fill();
    ctx.strokeStyle = '#1b1b22'; ctx.lineWidth = 0.45; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-1.8, 1.6, 0.6, 0, Math.PI * 2); ctx.fill();
  };
  ACC.acc_gorra = function (ctx, o) {
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(2.6, R - 1.0); ctx.quadraticCurveTo(5.6, R - 0.4, 7.2, R - 1.9); ctx.lineTo(3.0, R - 2.0); ctx.closePath();
    ctx.fillStyle = '#1f4fb0'; ctx.fill();
    ctx.strokeStyle = '#0c1c40'; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5.0, R - 2.1); ctx.quadraticCurveTo(-4.4, R + 2.3, 0, R + 2.0); ctx.quadraticCurveTo(3.4, R + 1.8, 3.9, R - 1.2);
    ctx.closePath();
    ctx.fillStyle = '#2f6fe0'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-0.6, R + 1.9); ctx.quadraticCurveTo(-0.4, R, 0.2, R - 1.6); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-0.6, R + 2.0, 0.5, 0, Math.PI * 2); ctx.fill();
  };
  ACC.acc_pajarita = function (ctx, o) {
    ctx.save();
    ctx.translate(0.6, -R + 0.2);
    ctx.rotate(Math.sin(o.t * 6) * 0.08);
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-2.8, 1.5); ctx.lineTo(-2.8, -1.5); ctx.closePath();
    ctx.moveTo(0, 0); ctx.lineTo(2.8, 1.5); ctx.lineTo(2.8, -1.5); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1b1b22'; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.fillStyle = '#c4c4ce';
    [[-1.8, 0.5], [-1.9, -0.6], [1.8, 0.5], [1.9, -0.6]].forEach(function (p) { ctx.fillRect(p[0], p[1], 0.35, 0.35); });
    ctx.fillStyle = '#d8d8e0';
    roundRect(ctx, -0.6, -0.7, 1.2, 1.4, 0.3); ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  ACC.acc_parche = function (ctx, o) {
    ctx.save();
    pacPath(ctx, 0, 0, R, 0, o.half); ctx.clip();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 0.6;
    // la cinta pasa por el CENTRO del parche (-0.2, 3.1), con la misma inclinación
    ctx.beginPath(); ctx.moveTo(4.6, 5.6); ctx.lineTo(-7.0, -0.6); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(-0.2, 3.1, 1.7, 1.45, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.arc(-0.2, 3.1, 1.1, 0.9 * Math.PI, 1.3 * Math.PI); ctx.stroke();
  };
  ACC.acc_chistera = function (ctx, o) {
    ctx.translate(0.4, R - 1.0);             // algo adelantada, sin pasarse
    ctx.rotate(-0.03 + Math.sin(o.t * 7) * 0.02);   // casi derecha
    ctx.fillStyle = '#26262e';
    roundRect(ctx, -2.9, 0.3, 5.8, 5.6, 0.6); ctx.fill();
    ctx.strokeStyle = '#6a6a78'; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.fillStyle = o.c;
    ctx.fillRect(-2.9, 0.7, 5.8, 1.1);
    ctx.fillStyle = '#26262e';
    ctx.beginPath(); ctx.ellipse(0, 0.3, 4.8, 0.85, 0, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.moveTo(-2.0, 2.2); ctx.lineTo(-2.0, 5.2); ctx.stroke();
  };
  ACC.acc_vikingo = function (ctx, o) {
    var r2 = R + 0.5, a1 = Math.asin(2.4 / r2);
    function cuerno(lado) {
      ctx.beginPath();
      ctx.moveTo(lado * 3.4, 4.2);
      ctx.quadraticCurveTo(lado * 6.4, 4.6, lado * 6.6, 8.8);
      ctx.quadraticCurveTo(lado * 5.0, 6.4, lado * 3.0, 5.8);
      ctx.closePath();
      ctx.fillStyle = '#efe6cf'; ctx.fill();
      ctx.strokeStyle = '#7e7a6a'; ctx.lineWidth = 0.4; ctx.stroke();
    }
    cuerno(-1); cuerno(1);
    ctx.beginPath(); ctx.arc(0, 0, r2, a1, Math.PI - a1); ctx.closePath();
    ctx.fillStyle = '#9aa3ad'; ctx.fill();
    ctx.strokeStyle = '#4b525a'; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.fillStyle = '#6d7680';
    ctx.fillRect(-5.8, 2.4, 11.6, 1.1);
    ctx.fillStyle = '#d9dee3';
    [-4, -1.4, 1.2, 3.8].forEach(function (f) { ctx.beginPath(); ctx.arc(f, 2.95, 0.3, 0, Math.PI * 2); ctx.fill(); });
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.arc(0, 0, r2 - 1.2, 0.35 * Math.PI, 0.6 * Math.PI); ctx.stroke();
  };
  ACC.acc_helice = function (ctx, o) {
    var r2 = R + 0.3, a1 = Math.asin(3.6 / r2), cols = ['#e63946', '#ffd23f', '#2f6fe0', '#3ec26a'], k;
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r2, a1, Math.PI - a1); ctx.closePath(); ctx.clip();
    for (k = 0; k < 4; k++) { ctx.fillStyle = cols[k]; ctx.fillRect(-r2 + k * (r2 / 2), 3, r2 / 2, 5); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, r2, a1, Math.PI - a1); ctx.closePath();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, r2); ctx.lineTo(0, r2 + 1.6); ctx.stroke();
    var abre = Math.cos(o.t * 28);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.ellipse(abre * 1.6, r2 + 1.8, Math.abs(abre) * 1.6 + 0.2, 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e63946';
    ctx.beginPath(); ctx.ellipse(-abre * 1.6, r2 + 1.8, Math.abs(abre) * 1.6 + 0.2, 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, r2 + 1.8, 0.35, 0, Math.PI * 2); ctx.fill();
  };
  ACC.acc_ninja = function (ctx, o) {
    var t = o.t;
    ctx.lineCap = 'butt';
    [[3.3, 0], [2.3, 1.8]].forEach(function (c) {
      ctx.beginPath(); ctx.moveTo(-R + 0.4, c[0]);
      ctx.bezierCurveTo(-R - 1.8, c[0] + Math.sin(t * 10 + c[1]) * 1.0, -R - 3.2, c[0] - 0.6 + Math.sin(t * 10 + c[1] + 1) * 1.2,
        -R - 5.0, c[0] - 1.0 + Math.sin(t * 10 + c[1] + 2) * 1.6);
      ctx.strokeStyle = '#7a0f0f'; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.strokeStyle = '#d62828'; ctx.lineWidth = 0.7; ctx.stroke();
    });
    ctx.save();
    pacPath(ctx, 0, 0, R, 0, o.half); ctx.clip();
    ctx.fillStyle = '#d62828';
    ctx.fillRect(-8, 2.2, 16, 1.7);
    ctx.fillStyle = '#e8e8e8';
    roundRect(ctx, 0.2, 2.45, 2.0, 1.2, 0.3); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#a61e1e';
    ctx.beginPath(); ctx.arc(-R + 0.5, 3.0, 0.8, 0, Math.PI * 2); ctx.fill();
  };


  /* Caras de los emotes nuevos, en el idioma de Sprites.drawPacFace:
   * círculo del color del jugador, rasgos en negro y un meneo propio. */
  function caraEmote(ctx, x, y, r, color, id, t) {
    var ink = '#000000', lw = Math.max(1, r * 0.17), k, p;
    var mx = 0, my = 0, giro = 0, esc = 1;
    if (id === 'dormido') { my = Math.sin(t * 0.05) * r * 0.08; giro = 0.2; }
    else if (id === 'burla') { giro = Math.sin(t * 0.3) * 0.16; mx = Math.sin(t * 0.3) * r * 0.06; }
    else if (id === 'fiesta') { my = -Math.abs(Math.sin(t * 0.2)) * r * 0.12; giro = Math.sin(t * 0.1) * 0.08; }
    else if (id === 'chulo') { giro = -0.14 + Math.sin(t * 0.05) * 0.02; my = r * 0.02; }
    else if (id === 'mareo') { giro = Math.sin(t * 0.08) * 0.25; mx = Math.sin(t * 0.08) * r * 0.08; }
    else if (id === 'ko') { giro = 0.22; my = r * 0.08; }
    else if (id === 'jajaja') { mx = Math.sin(t * 1.1) * r * 0.06; my = -Math.abs(Math.sin(t * 0.3)) * r * 0.1; }
    else if (id === 'disimulo') { giro = Math.sin(t * 0.06) * 0.08; mx = Math.sin(t * 0.03) * r * 0.05; }
    else if (id === 'racha') { esc = 1 + Math.sin(t * 0.3) * 0.04; my = r * 0.12; }
    ctx.save();
    ctx.translate(x + mx, y + my); ctx.rotate(giro); ctx.scale(esc, esc); ctx.translate(-x, -y);
    var ex = r * 0.42, ey = y - r * 0.26;
    function dot(dx, dy, rr) {
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(x + dx, ey + (dy || 0), rr || r * 0.13, 0, Math.PI * 2); ctx.fill();
    }
    function arcoOjo(dx, up) {
      var er = r * 0.26;
      ctx.beginPath();
      if (up) ctx.arc(x + dx, ey + er * 0.5, er, 1.15 * Math.PI, 1.85 * Math.PI);
      else ctx.arc(x + dx, ey - er * 0.5, er, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    /* lo que va detrás de la cara */
    if (id === 'racha') {
      [-1, 0, 1].forEach(function (lado) {
        var fx = x + lado * r * 0.4, base = y - r * 0.55;
        var alto = r * (0.55 + (lado === 0 ? 0.3 : 0) + 0.14 * Math.sin(t * 0.5 + lado * 2));
        [['#ff6a00', 1], ['#ffd23f', 0.55]].forEach(function (c) {
          var hh = alto * c[1], ww = r * 0.24 * c[1];
          ctx.fillStyle = c[0];
          ctx.beginPath();
          ctx.moveTo(fx - ww, base);
          ctx.quadraticCurveTo(fx - ww * 1.1, base - hh * 0.6, fx + Math.sin(t * 0.4 + lado) * r * 0.06, base - hh);
          ctx.quadraticCurveTo(fx + ww * 1.1, base - hh * 0.6, fx + ww, base);
          ctx.closePath(); ctx.fill();
        });
      });
    }

    ctx.fillStyle = color;
    if (id === 'chulo') {
      /* mewing: la cara deja de ser redonda por abajo y gana mandíbula
       * cuadrada, con ángulos marcados y barbilla plana */
      ctx.beginPath();
      ctx.arc(x, y, r, 0.92 * Math.PI, 2.08 * Math.PI);
      ctx.lineTo(x + r * 0.88, y + r * 0.6);
      ctx.lineTo(x + r * 0.36, y + r * 1.06);
      ctx.lineTo(x - r * 0.36, y + r * 1.06);
      ctx.lineTo(x - r * 0.88, y + r * 0.6);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = ink; ctx.lineWidth = lw;

    if (id === 'dormido') {
      ctx.lineWidth = lw * 0.8;
      arcoOjo(-ex, false); arcoOjo(ex, false);
      var sopla = 0.1 + 0.07 * (1 + Math.sin(t * 0.05)) / 2;
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(x + r * 0.12, y + r * 0.45, r * sopla, r * sopla * 1.2, 0, 0, Math.PI * 2); ctx.fill();
      /* zetas grandes, blancas con borde negro, que se leen sobre la cara */
      ctx.lineJoin = 'miter';
      for (k = 0; k < 3; k++) {
        p = ((t * 0.012) + k / 3) % 1;
        var zs = r * (0.27 + p * 0.24), zx = x + r * 0.45 + p * r * 0.4, zy = y - r * 0.32 - p * r * 0.76;
        ctx.globalAlpha = (p < 0.7 ? 1 : (1 - p) / 0.3) * 0.85;
        ctx.beginPath();
        ctx.moveTo(zx - zs / 2, zy - zs / 2); ctx.lineTo(zx + zs / 2, zy - zs / 2);
        ctx.lineTo(zx - zs / 2, zy + zs / 2); ctx.lineTo(zx + zs / 2, zy + zs / 2);
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.35; ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.7; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineJoin = 'round';

    } else if (id === 'burla') {
      /* más burlón: un ojo apretado de pícaro, el otro entornado con la ceja
       * arqueada, boca torcida y un lengüetazo enorme que menea de lado */
      ctx.lineWidth = lw * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - ex - r * 0.2, ey - r * 0.16); ctx.lineTo(x - ex + r * 0.12, ey); ctx.lineTo(x - ex - r * 0.2, ey + r * 0.14);
      ctx.stroke();
      dot(ex, r * 0.04, r * 0.14);
      ctx.fillStyle = color;
      ctx.fillRect(x + ex - r * 0.2, ey - r * 0.2, r * 0.4, r * 0.18);
      ctx.beginPath(); ctx.moveTo(x + ex - r * 0.2, ey - r * 0.02); ctx.lineTo(x + ex + r * 0.2, ey - r * 0.02); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + ex, ey - r * 0.1 + Math.sin(t * 0.3) * r * 0.05, r * 0.27, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r * 0.44, y + r * 0.26);
      ctx.quadraticCurveTo(x, y + r * 0.5, x + r * 0.44, y + r * 0.18); ctx.stroke();
      ctx.save();
      ctx.translate(x - r * 0.02, y + r * 0.4);
      ctx.rotate(Math.sin(t * 0.5) * 0.45);
      ctx.fillStyle = '#ff5c86';
      ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.25, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.strokeStyle = '#b8254a'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, r * 0.1); ctx.lineTo(0, r * 0.48); ctx.stroke();
      ctx.restore();

    } else if (id === 'fiesta') {
      arcoOjo(-ex, true); arcoOjo(ex, true);
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(x, y + r * 0.14, r * 0.46, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.translate(x + r * 0.2, y - r * 0.8); ctx.rotate(0.35);
      ctx.fillStyle = '#ff4fa3';
      ctx.beginPath(); ctx.moveTo(-r * 0.36, 0); ctx.lineTo(r * 0.36, 0); ctx.lineTo(0, -r * 0.7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-r * 0.24, -r * 0.2); ctx.lineTo(r * 0.24, -r * 0.2); ctx.moveTo(-r * 0.12, -r * 0.45); ctx.lineTo(r * 0.12, -r * 0.45); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, -r * 0.72, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      var confeti = ['#ffd23f', '#3ee0c8', '#ff4fa3', '#9b6bff', '#7dff7a', '#ffffff'];
      for (k = 0; k < 6; k++) {
        p = ((t * 0.015) + k / 6) % 1;
        ctx.save();
        ctx.translate(x + (k - 2.5) * r * 0.5 + Math.sin(p * 6 + k) * 1, y - r * 1.3 + p * r * 2.6);
        ctx.rotate(p * 8 + k);
        ctx.fillStyle = confeti[k];
        ctx.fillRect(-0.45, -0.25, 0.9, 0.5);
        ctx.restore();
      }

    } else if (id === 'chulo') {
      /* MEWING de meme: mandíbula de acero, la ceja
       * de "The Rock" arriba, mirada de lado con los párpados caídos y el
       * dedo en los labios (shhh), con su destello en la mandíbula */
      ctx.fillStyle = 'rgba(0,0,0,.24)';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.88, y + r * 0.6); ctx.lineTo(x - r * 0.36, y + r * 1.06);
      ctx.lineTo(x - r * 0.02, y + r * 1.06); ctx.lineTo(x - r * 0.58, y + r * 0.52);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + r * 0.88, y + r * 0.6); ctx.lineTo(x + r * 0.36, y + r * 1.06);
      ctx.lineTo(x + r * 0.2, y + r * 1.06); ctx.lineTo(x + r * 0.66, y + r * 0.56);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.55;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.96, y + r * 0.3); ctx.lineTo(x - r * 0.88, y + r * 0.6); ctx.lineTo(x - r * 0.36, y + r * 1.06);
      ctx.lineTo(x + r * 0.36, y + r * 1.06); ctx.lineTo(x + r * 0.88, y + r * 0.6); ctx.lineTo(x + r * 0.96, y + r * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.66, y + r * 0.1); ctx.lineTo(x - r * 0.46, y + r * 0.36);
      ctx.moveTo(x + r * 0.66, y + r * 0.1); ctx.lineTo(x + r * 0.46, y + r * 0.36);
      ctx.stroke();
      [-1, 1].forEach(function (lado) {
        var cx = x + lado * ex;
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(cx + r * 0.1, ey + r * 0.04, r * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
        ctx.fillRect(cx - r * 0.22, ey - r * 0.22, r * 0.44, r * 0.22);
        ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.7;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.2, ey); ctx.lineTo(cx + r * 0.22, ey - r * 0.02); ctx.stroke();
      });
      var roca = Math.sin(t * 0.07) * r * 0.05;
      ctx.lineWidth = lw * 0.95;
      ctx.beginPath();
      ctx.moveTo(x - ex - r * 0.28, ey - r * 0.32 + roca);
      ctx.quadraticCurveTo(x - ex, ey - r * 0.72 + roca, x - ex + r * 0.3, ey - r * 0.46 + roca);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + ex - r * 0.26, ey - r * 0.26); ctx.lineTo(x + ex + r * 0.28, ey - r * 0.3); ctx.stroke();
      ctx.lineWidth = lw * 0.9;
      ctx.beginPath(); ctx.moveTo(x - r * 0.26, y + r * 0.52); ctx.lineTo(x + r * 0.26, y + r * 0.52); ctx.stroke();
      /* la mano del shhh, simple: un puño redondo hacia la izquierda y el ÍNDICE
       * saliendo de su borde derecho (centrado encima parecía el dedo medio) */
      ctx.save();
      ctx.translate(x - r * 0.04, y + r * 0.6);
      ctx.rotate(0.12);
      ctx.fillStyle = '#f4f4f4';
      ctx.strokeStyle = ink; ctx.lineWidth = 0.45;
      roundRect(ctx, -r * 0.08, -r * 0.34, r * 0.17, r * 0.56, r * 0.08); ctx.fill(); ctx.stroke();
      roundRect(ctx, -r * 0.42, r * 0.12, r * 0.52, r * 0.4, r * 0.12); ctx.fill(); ctx.stroke();
      ctx.restore();
      var destelloJ = (t * 0.02) % 2;
      if (destelloJ > 1.2 && destelloJ < 1.6) {
        estrella4(ctx, x + r * 0.88, y + r * 0.6, r * 0.34 * Math.sin((destelloJ - 1.2) / 0.4 * Math.PI), '#ffffff', 1);
      }

    } else if (id === 'mareo') {
      ctx.lineWidth = 0.6;
      [-1, 1].forEach(function (lado) {
        var cx = x + lado * ex, a;
        ctx.beginPath();
        for (a = 0; a <= Math.PI * 3.2; a += 0.3) {
          var rr = a / (Math.PI * 3.2) * r * 0.26, aa = a + t * 0.2 * lado;
          if (a === 0) ctx.moveTo(cx + Math.cos(aa) * rr, ey + Math.sin(aa) * rr);
          else ctx.lineTo(cx + Math.cos(aa) * rr, ey + Math.sin(aa) * rr);
        }
        ctx.stroke();
      });
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.moveTo(x - r * 0.4, y + r * 0.45);
      for (k = 0; k < 4; k++) ctx.quadraticCurveTo(x - r * 0.3 + k * r * 0.2, y + r * (k % 2 ? 0.55 : 0.33), x - r * 0.2 + k * r * 0.2, y + r * 0.45);
      ctx.stroke();
      for (k = 0; k < 3; k++) {
        var ang = t * 0.1 + k * 2.09;
        estrella4(ctx, x + Math.cos(ang) * r * 0.85, y - r * 0.85 + Math.sin(ang) * r * 0.22, r * 0.2, '#ffe96b', 1);
      }

    } else if (id === 'ko') {
      ctx.lineWidth = lw * 0.8;
      [-1, 1].forEach(function (lado) {
        var cx = x + lado * ex, s2 = r * 0.16;
        ctx.beginPath(); ctx.moveTo(cx - s2, ey - s2); ctx.lineTo(cx + s2, ey + s2); ctx.moveTo(cx + s2, ey - s2); ctx.lineTo(cx - s2, ey + s2); ctx.stroke();
      });
      ctx.beginPath(); ctx.moveTo(x - r * 0.32, y + r * 0.4); ctx.lineTo(x + r * 0.32, y + r * 0.4); ctx.stroke();
      ctx.fillStyle = '#ff5c86';
      ctx.beginPath(); ctx.ellipse(x + r * 0.2, y + r * 0.56, r * 0.14, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      /* el alma, más grande y con contorno: sale de la coronilla y sube
       * meciéndose, con su carita de susto */
      p = (t * 0.01) % 1;
      ctx.save();
      ctx.globalAlpha = p < 0.7 ? 1 : (1 - p) / 0.3;
      var ax = x - r * 0.2 + Math.sin(p * 7) * r * 0.22, ay = y - r * 0.5 - p * r * 0.62, gr = r * 0.36;
      ctx.beginPath();
      ctx.arc(ax, ay, gr, Math.PI, 0);
      ctx.lineTo(ax + gr, ay + gr * 0.9);
      ctx.quadraticCurveTo(ax + gr * 0.66, ay + gr * 1.35 + Math.sin(t * 0.3) * gr * 0.15, ax + gr * 0.33, ay + gr * 0.9);
      ctx.quadraticCurveTo(ax, ay + gr * 1.35 + Math.sin(t * 0.3 + 1) * gr * 0.15, ax - gr * 0.33, ay + gr * 0.9);
      ctx.quadraticCurveTo(ax - gr * 0.66, ay + gr * 1.35 + Math.sin(t * 0.3 + 2) * gr * 0.15, ax - gr, ay + gr * 0.9);
      ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(ax - gr * 0.35, ay + gr * 0.05, gr * 0.16, 0, Math.PI * 2); ctx.arc(ax + gr * 0.35, ay + gr * 0.05, gr * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ax, ay + gr * 0.5, gr * 0.14, gr * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

    } else if (id === 'jajaja') {
      ctx.lineWidth = lw * 0.85;
      ctx.beginPath();
      ctx.moveTo(x - ex - r * 0.18, ey - r * 0.16); ctx.lineTo(x - ex + r * 0.12, ey); ctx.lineTo(x - ex - r * 0.18, ey + r * 0.16);
      ctx.moveTo(x + ex + r * 0.18, ey - r * 0.16); ctx.lineTo(x + ex - r * 0.12, ey); ctx.lineTo(x + ex + r * 0.18, ey + r * 0.16);
      ctx.stroke();
      ctx.fillStyle = ink;
      var abre = 0.8 + 0.2 * Math.abs(Math.sin(t * 0.3));
      ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.55 * abre, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff5c86';
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.1 + r * 0.38 * abre, r * 0.24, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      for (k = 0; k < 4; k++) {
        var lado2 = (k % 2) ? 1 : -1;
        p = ((t * 0.03) + k * 0.25) % 1;
        gota(ctx, x + lado2 * (ex + r * 0.25 + p * r * 0.6), ey - r * 0.05 - Math.sin(p * Math.PI) * r * 0.4 + p * r * 0.35,
          r * 0.14, '#6fe3ff', 1 - p);
      }

    } else if (id === 'disimulo') {
      dot(-ex + r * 0.1, -r * 0.1, r * 0.12);
      dot(ex + r * 0.1, -r * 0.1, r * 0.12);
      ctx.beginPath(); ctx.moveTo(x - ex - r * 0.15, ey - r * 0.36); ctx.lineTo(x - ex + r * 0.22, ey - r * 0.4); ctx.stroke();
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.arc(x + r * 0.32, y + r * 0.38, r * 0.13, 0, Math.PI * 2); ctx.stroke();
      for (k = 0; k < 2; k++) {
        p = ((t * 0.014) + k * 0.5) % 1;
        ctx.globalAlpha = 1 - p;
        nota(ctx, x + r * 0.6 + p * r * 0.35 + Math.sin(p * 7) * 0.8, y + r * 0.1 - p * r * 1.1, r * 0.2, '#ffffff');
      }
      ctx.globalAlpha = 1;

    } else if (id === 'racha') {
      dot(-ex, r * 0.04); dot(ex, r * 0.04);
      ctx.lineWidth = lw * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - ex - r * 0.25, ey - r * 0.32); ctx.lineTo(x - ex + r * 0.2, ey - r * 0.22);
      ctx.moveTo(x + ex + r * 0.25, ey - r * 0.32); ctx.lineTo(x + ex - r * 0.2, ey - r * 0.22);
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(x, y + r * 0.16, r * 0.5, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - r * 0.42, y + r * 0.16, r * 0.84, r * 0.15);

    } else if (id === 'enserio') {
      var parpado = ((t % 140) < 10) ? 0.85 : 0.5;
      [-1, 1].forEach(function (lado) {
        var cx = x + lado * ex;
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(cx, ey + r * 0.04, r * 0.14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
        ctx.fillRect(cx - r * 0.2, ey - r * 0.2, r * 0.4, r * 0.24 * parpado / 0.5);
        ctx.beginPath(); ctx.moveTo(cx - r * 0.2, ey - r * 0.2 + r * 0.24 * parpado / 0.5); ctx.lineTo(cx + r * 0.2, ey - r * 0.2 + r * 0.24 * parpado / 0.5); ctx.stroke();
      });
      // ceja levantada en arco redondo, fina y corta (la grande tapaba la cara)
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath(); ctx.arc(x - ex, ey - r * 0.2, r * 0.22, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke();
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(x - r * 0.22, y + r * 0.42); ctx.lineTo(x + r * 0.36, y + r * 0.42); ctx.stroke();
      var puntos = Math.floor((t * 0.04) % 4);
      ctx.fillStyle = '#ffffff';
      for (k = 0; k < puntos; k++) ctx.fillRect(x + r * 0.7 + k * r * 0.26, y - r * 0.9, 0.8, 0.8);
    }
    ctx.restore();
  }


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
      mordio: !!e.mordio,        // ...pero solo lo lanzan si la Q acierta
      c: colorLargo(color),
      /* sin reloj propio, uno que empieza al cargar: Date.now() en segundos
       * es tan grande que los arcos que giran con él dejan de pintarse */
      t: (typeof e.t === 'number') ? e.t : (Date.now() - ARRANQUE) / 1000,
      team: equipo,
      s: (typeof e.s === 'number') ? e.s : 0,
      giro: (typeof e.giro === 'number') ? e.giro : -1,
      qSeg: (typeof e.qSeg === 'number') ? e.qSeg : null,
      muerte: (typeof e.muerte === 'number') ? e.muerte : null,
      confeti: (typeof e.confeti === 'number') ? e.confeti : -1,
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
   * EL LOOK: efecto y accesorio de la tienda
   *
   * Sprites.drawPacman se desvía aquí cuando extra trae `efecto` o
   * `accesorio`. El efecto envuelve a la skin (decide qué va debajo y qué
   * encima) y el accesorio se pone después, en el marco del cuerpo. En un
   * icono (vidas, menús) no hay efecto: todo el camino "de atrás" es el sitio.
   * ============================================================ */
  Sprites.EFECTOS = EFX;
  Sprites.ACCESORIOS = ACC;

  /* ============================================================
   * CRUCE: accesorios también en las EXTRAVAGANTES (15 sep)
   *
   * Los accesorios están dibujados para la cabeza de Pac-Man: un círculo de
   * radio R en el centro del marco, con el ojo en (1,1; 3,7), la coronilla
   * arriba y la barbilla abajo. Una extravagante tiene la cabeza en otro
   * sitio y de otro tamaño, así que para cada una se apunta dónde tiene el
   * OJO, cuánto mide su cabeza respecto a la de Pac-Man (k) y, si hace falta,
   * dónde está su CORONILLA y su CUELLO. Con eso cada accesorio se lleva a su
   * zona: lo de la cara (gafas, parche, mostacho, cinta, auriculares) al ojo;
   * los sombreros a la coronilla; la pajarita al cuello.
   *
   * Medido a ojo sobre cada dibujo, en el marco de la skin (f hacia delante,
   * s hacia arriba). Una skin sin entrada aquí sigue sin admitir accesorios.
   * ============================================================ */
  var CABEZAS = {
    hamburguesa: { ojo: [3.1, 2.3], k: 0.72, coronilla: [1.2, 5.3], cuello: [1.4, -4.8] },
    gato:        { ojo: [2.4, 2.2], k: 0.46, coronilla: [1.6, 4.8], cuello: [1.6, -2.4] },
    tiburon:     { ojo: [4.6, 1.7], k: 0.46, coronilla: [3.4, 3.2], cuello: [2.6, -2.8] },
    planta:      { ojo: [3.0, 2.2], k: 0.66, coronilla: [1.9, 4.6], cuello: [1.9, -4.4] },
    robot:       { ojo: [3.6, 2.1], k: 0.72, coronilla: [0.4, 4.6], cuello: [0.4, -5.3],
                   sitios: { acc_bigote: [3.0, 0.1] } },
    trex:        { ojo: [1.0, 2.9], k: 0.66, coronilla: [-0.2, 5.6], cuello: [0.8, -4.0] },
    ovni:        { ojo: [1.2, 3.8], k: 0.50, coronilla: [0.5, 5.2], cuello: [0.5, -2.2] },
    cofre:       { ojo: [1.5, 2.8], k: 0.70, coronilla: [0.0, 5.2], cuello: [0.0, -4.0] },
    dragon:      { ojo: [2.2, 2.6], k: 0.66, coronilla: [0.4, 5.2], cuello: [0.6, -4.2] },
    calavera:    { ojo: [1.3, 2.9], k: 0.76, coronilla: [-1.2, 6.2], cuello: [1.4, -4.3],
                   sitios: { acc_bigote: [3.1, -0.7] } },
    bomba:       { ojo: [2.7, 1.9], k: 0.80, coronilla: [0.2, 5.4], cuello: [0.6, -5.6] },
    abisal:      { ojo: [2.0, 2.8], k: 0.68, coronilla: [-0.4, 5.8], cuello: [1.0, -4.8] },
    pinata:      { ojo: [4.0, 2.3], k: 0.42, coronilla: [3.4, 4.2], cuello: [2.8, -1.8] },
    tostadora:   { ojo: [2.4, 1.4], k: 0.58, coronilla: [0.6, 3.1], cuello: [0.6, -4.4] },
    gargola:     { ojo: [2.5, 1.9], k: 0.60, coronilla: [0.8, 4.9], cuello: [1.2, -3.4] },
    pulpo:       { ojo: [3.6, 1.5], k: 0.64, coronilla: [-0.8, 6.2], cuello: [3.2, -1.8] },
    momia:       { ojo: [2.7, 2.6], k: 0.66, coronilla: [1.6, 5.3], cuello: [1.6, -3.5] },
    globo:       { ojo: [2.1, 2.2], k: 0.70, coronilla: [0.0, 4.8], cuello: [0.4, -4.4] },
    bicefalo:    { ojo: [2.8, 5.4], k: 0.40, coronilla: [2.0, 7.3], cuello: [2.2, -6.4] },
    cuy:         { ojo: [2.8, 1.2], k: 0.54, coronilla: [2.0, 4.1], cuello: [2.2, -2.4] },
    llama:       { ojo: [2.1, 2.9], k: 0.38, coronilla: [1.2, 4.8], cuello: [1.0, 0.6] },
    carro:       { ojo: [-2.2, 3.8], k: 0.60, coronilla: [-0.4, 5.8], cuello: [6.0, -0.4],
                   sitios: { acc_bigote: [6.3, 0.4], acc_auriculares: [-4.2, 2.6] } },
    oso:         { ojo: [2.0, 3.1], k: 0.70, coronilla: [-0.4, 6.0], cuello: [1.6, -3.3] },
    galleta:     { ojo: [0.9, 2.9], k: 0.88, coronilla: [0.0, 6.2], cuello: [0.2, -6.0] },
    vampiro:     { ojo: [2.9, 2.0], k: 0.70, coronilla: [1.4, 5.9], cuello: [1.6, -3.8] },
    lobo:        { ojo: [-0.4, 4.3], k: 0.60, coronilla: [-1.2, 5.8], cuello: [1.0, -3.3],
                   sitios: { acc_bigote: [4.4, 4.4] } }
  };
  /* ---------- el accesorio se MUEVE con la skin ----------
   * Las cabezas de arriba se midieron con la skin quieta en una pose
   * concreta (POSE_MEDIDA). Pero casi todas botan, se mecen o saltan, y
   * algunas abren la boca SUBIENDO la parte de arriba (el pan de la
   * HAMBURGUESA, la tapa del COFRE, la mitad de arriba de la PLANTA) o
   * levantan la cabeza entera (el LOBO al aullar). Un accesorio quieto se
   * quedaba flotando donde estaba la cabeza.
   *
   * POSES repite, para cada una, las mismas transformaciones que hace su
   * dibujo con la pieza donde va el accesorio (en DOMMatrix, en el marco de
   * la skin). Al pintar se aplica la diferencia entre la pose de ahora y la
   * medida: el accesorio va pegado a su pieza, se mueva como se mueva.
   * `zona` es 'cara', 'cabeza' o 'cuello': el cuello va con la parte de
   * abajo, que en las de boca hacia arriba no se levanta. */
  var POSE_MEDIDA = { t: 0.3, half: 0, qSeg: null };
  function girarM(m, px, py, rad) { return m.translateSelf(px, py).rotateSelf(rad * 180 / Math.PI).translateSelf(-px, -py); }
  function botaM(t, vel, amp) { return Math.abs(Math.sin(t * vel)) * amp; }
  var POSES = {
    hamburguesa: function (m, o, zona) {
      m.translateSelf(0, 0.4 + botaM(o.t, 7, 0.3)).scaleSelf(0.94, 0.94);
      if (zona !== 'cuello') girarM(m, -5.4, -0.5, [0, 13, 24][fase(o)] * Math.PI / 180);
    },
    cofre: function (m, o, zona) {
      m.translateSelf(0, 0.9 + botaM(o.t, 7, 0.3)).scaleSelf(0.98, 0.98);
      if (zona !== 'cuello') girarM(m, -5, -0.5, [0, 15, 28][fase(o)] * Math.PI / 180);
    },
    planta: function (m, o, zona) {
      m.scaleSelf(1.03, 1.03);
      girarM(m, -2.8, 0, (zona === 'cuello' ? -1 : 1) * [0, 15, 30][fase(o)] * Math.PI / 180);
    },
    lobo: function (m, o) {
      var tf = o.t % 4.2, pa = tf / 1.3;
      var alza = (tf < 1.3) ? Math.sin(Math.min(1, pa / 0.25) * Math.PI / 2) * (pa > 0.8 ? (1 - pa) / 0.2 : 1) : 0;
      girarM(m, -3, -1, alza * 0.5);
    },
    tiburon: function (m, o) { m.rotateSelf(Math.sin(o.t * 9) * 0.04 * 180 / Math.PI).scaleSelf(1.22, 1.22); },
    trex: function (m, o) { m.translateSelf(0, -0.2 + botaM(o.t, 6, 0.5)).scaleSelf(1.01, 1.01); },
    ovni: function (m, o) {
      m.translateSelf(0, 0.6 + Math.sin(o.t * 4) * 0.4).rotateSelf(-0.12 * 180 / Math.PI).scaleSelf(1.25, 1.25);
    },
    bomba: function (m, o) { m.rotateSelf(Math.sin(o.t * 7) * 0.06 * 180 / Math.PI).translateSelf(0, -0.5); },
    abisal: function (m, o) { m.translateSelf(-0.6, Math.sin(o.t * 3) * 0.3); },
    momia: function (m, o) { m.rotateSelf(Math.sin(o.t * 6) * 0.05 * 180 / Math.PI); },
    tostadora: function (m, o) { m.translateSelf(0, botaM(o.t, 7, 0.35) - 0.6); },
    globo: function (m, o) { m.translateSelf(0, Math.sin(o.t * 4) * 0.35); },
    bicefalo: function (m, o, zona) {
      m.translateSelf(0, botaM(o.t, 7, 0.25) - 0.1);
      // la cabeza de arriba (A) lleva gafas y sombrero; la de abajo (B), la pajarita
      var mece = (zona === 'cuello') ? Math.sin(o.t * 6 + 2.2) : Math.sin(o.t * 6);
      if (zona === 'cuello') m.translateSelf(1.4 + mece * 0.25, -3.3 + mece * 0.3);
      else m.translateSelf(1.6 + mece * 0.25, 3.4 + mece * 0.35);
    },
    pinata: function (m, o) {
      m.translateSelf(0, botaM(o.t, 7, 0.4) - 0.2).rotateSelf(Math.sin(o.t * 7) * 0.05 * 180 / Math.PI);
    },
    calavera: function (m, o) {
      var alto = Math.abs(Math.sin(o.t * 8));
      var aplasta = Math.pow(1 - alto, 4) * 0.06 - alto * 0.025;
      m.translateSelf(0, -5.6 + alto * 0.5).scaleSelf(1 + aplasta, 1 - aplasta)
        .rotateSelf(Math.sin(o.t * 6.5) * 0.09 * 180 / Math.PI).translateSelf(0.1, 5.3).scaleSelf(0.88, 0.88);
    },
    cuy: function (m, o) {
      var q = qDe(o, 0.6);
      var salto = q >= 0 ? Math.sin(q * Math.PI) * 3.2 : botaM(o.t, 14, 0.25);
      m.translateSelf(0, salto - 0.4);
      if (q >= 0) m.rotateSelf(Math.sin(q * Math.PI * 2) * 0.12 * 180 / Math.PI);
      m.scaleSelf(0.95, 0.95);
    },
    llama: function (m, o) { m.translateSelf(-0.2, botaM(o.t, 8, 0.25) - 0.2).scaleSelf(0.92, 0.92); },
    carro: function (m, o) {
      var q = qDe(o, 0.8);
      m.translateSelf(0, botaM(o.t, 14, 0.22) + 0.3);
      if (q >= 0) m.rotateSelf(-Math.sin(q * Math.PI) * 0.06 * 180 / Math.PI);
      m.scaleSelf(1.15, 1.15);
    },
    oso: function (m, o) { m.translateSelf(0, botaM(o.t, 7, 0.25) - 0.1).scaleSelf(1.02, 1.02); },
    galleta: function (m, o) { m.rotateSelf(Math.sin(o.t * 8) * 0.05 * 180 / Math.PI); }
  };

  /* La diferencia entre la pose de ahora y la medida, lista para
   * ctx.transform; null si la skin no se mueve o no hay DOMMatrix */
  function deltaPose(skin, o, zona) {
    var pose = POSES[skin];
    if (!pose || typeof DOMMatrix !== 'function') return null;
    var ahora = new DOMMatrix(), medida = new DOMMatrix();
    pose(ahora, o, zona);
    pose(medida, POSE_MEDIDA, zona);
    return ahora.multiply(medida.inverse());
  }
  Sprites.deltaPose = deltaPose;

  /* dónde va cada accesorio: por defecto, a la cara */
  var ZONA_ACC = { acc_gorra: 'cabeza', acc_chistera: 'cabeza', acc_vikingo: 'cabeza',
    acc_helice: 'cabeza', acc_pajarita: 'cuello' };
  var OJO_PAC = [1.1, 3.7];
  /* Revisión del 15 sep, con las 26 y los 11 accesorios: el PARCHE quedaba
   * detrás del ojo (se seguía viendo), los AURICULARES caían encima del ojo
   * en vez de en el lado de la cabeza, la CINTA tapaba los ojos en vez de ir
   * por la frente y el MOSTACHO se salía de la cara. En Pac-Man todo eso
   * cuadra porque su cabeza es redonda y del mismo tamaño siempre; aquí cada
   * uno se lleva a su sitio respecto al ojo, en unidades de cabeza (k):
   *   PUNTO_ACC  el punto del accesorio que manda (en la cabeza de Pac-Man)
   *   DESDE_OJO  dónde debe caer ese punto, contado desde el ojo de la skin */
  var PUNTO_ACC = {
    acc_gafas: [1.1, 3.7], acc_afiladas: [1.1, 3.7],
    acc_parche: [-0.2, 3.1],          // el centro del parche, sobre el ojo
    acc_ninja: [1.1, 3.05],           // el centro de la cinta...
    acc_bigote: [4.5, 0.55],          // el nudo del mostacho...
    acc_auriculares: [-1.8, 1.6]      // el auricular...
  };
  var DESDE_OJO = {
    acc_ninja: [0, 1.55],             // ...por la frente, encima del ojo
    acc_bigote: [1.2, -2.4],          // ...bajo el ojo y hacia el hocico
    acc_auriculares: [-4.2, -2.2]     // ...detrás del ojo, en el lado de la cabeza
  };
  /* a qué altura de la cabeza de Pac-Man empieza cada sombrero (su base) */
  var BASE_SOMBRERO = { acc_chistera: R - 1, acc_gorra: R - 2, acc_vikingo: 2.4, acc_helice: 3.6 };

  /* { x, y, k }: dónde poner el centro de la "cabeza de Pac-Man" y a qué
   * escala, para esa skin y ese accesorio; null si va tal cual */
  function anclaAccesorio(skin, acc) {
    var c = CABEZAS[skin];
    if (!c) return null;
    var k = c.k, zona = ZONA_ACC[acc] || 'cara';
    if (zona === 'cara') {
      /* cada accesorio de la cara tiene su punto (PUNTO_ACC) y el sitio donde
       * debe caer respecto al ojo de la skin (DESDE_OJO); una skin puede
       * fijar el sitio a mano (sitios) si su cara no sigue la regla */
      var pu = PUNTO_ACC[acc] || OJO_PAC, de = DESDE_OJO[acc] || [0, 0];
      var sitio = (c.sitios && c.sitios[acc]) || [c.ojo[0] + k * de[0], c.ojo[1] + k * de[1]];
      return { x: sitio[0] - k * pu[0], y: sitio[1] - k * pu[1], k: k };
    }
    /* Un sombrero se apoya en la coronilla con su base un poco hundida (lo
     * que se hunde la chistera, 1). En Pac-Man la HÉLICE y el VIKINGO bajan
     * media cabeza porque abrazan la bola; en una extravagante eso los metía
     * dentro del cuerpo y le tapaba el ojo (calavera, tiburón, pez globo,
     * carro: 15 sep). */
    if (zona === 'cabeza' && c.coronilla) {
      var base = BASE_SOMBRERO.hasOwnProperty(acc) ? BASE_SOMBRERO[acc] : R - 1;
      return { x: c.coronilla[0], y: c.coronilla[1] - k * (base + 1), k: k };
    }
    if (zona === 'cuello' && c.cuello) return { x: c.cuello[0] - k * 0.6, y: c.cuello[1] + k * (R - 0.2), k: k };
    return { x: c.ojo[0] - k * OJO_PAC[0], y: c.ojo[1] - k * OJO_PAC[1], k: k };
  }
  Sprites.CABEZAS = CABEZAS;
  Sprites.anclaAccesorio = anclaAccesorio;

  /* ¿Se le ve un accesorio a esta skin? Las de forma de Pac-Man, siempre; las
   * extravagantes, si tienen su cabeza apuntada arriba (todas, desde el 15 sep) */
  Sprites.admiteAccesorio = function (skin) {
    return !(INFO[skin] && INFO[skin].rara) || CABEZAS.hasOwnProperty(skin);
  };

  Sprites.dibujarLook = function (ctx, x, y, dir, mouthPhase, color, skin, extra) {
    var e = extra || {};
    var limpio = {};
    for (var k in e) if (e.hasOwnProperty(k) && k !== 'efecto' && k !== 'accesorio') limpio[k] = e[k];
    function cuerpo() { Sprites.drawPacman(ctx, x, y, dir, mouthPhase, color, skin, limpio); }
    var d = (dir >= 0 && dir <= 3) ? dir : 3;
    var v = DIR_V[d];
    var fx = (!e.icono && EFX.hasOwnProperty(e.efecto)) ? EFX[e.efecto] : null;
    var ac = (ACC.hasOwnProperty(e.accesorio) && Sprites.admiteAccesorio(skin)) ? ACC[e.accesorio] : null;
    var o = {
      x: x, y: y, d: d, half: HALF[mouthPhase] || 0, c: colorLargo(color),
      t: (typeof e.t === 'number') ? e.t : (Date.now() - ARRANQUE) / 1000,
      s: (typeof e.s === 'number') ? e.s : 0,
      giro: (typeof e.giro === 'number') ? e.giro : -1,
      confeti: (typeof e.confeti === 'number') ? e.confeti : -1,
      back: (typeof e.back === 'function') ? e.back
        : function (dist) { return { x: x - v[0] * dist, y: y - v[1] * dist, d: d }; }
    };
    ctx.save();
    try {
      if (fx) fx(ctx, o, cuerpo); else cuerpo();
      if (ac) {
        ctx.save();
        frame(ctx, x, y, d);
        // en una extravagante, a su cabeza (ver CABEZAS), siguiendo lo que se mueva (POSES)
        var an = anclaAccesorio(skin, e.accesorio);
        if (an) {
          var rara = !!(INFO[skin] && INFO[skin].rara);
          var dp = deltaPose(skin, {
            t: o.t,
            // con la Q, las extravagantes abren del todo (como en dibujarArte)
            half: (e.muerde && rara) ? HALF[2] : (HALF[mouthPhase] || 0),
            qSeg: (typeof e.qSeg === 'number') ? e.qSeg : null
          }, ZONA_ACC[e.accesorio] || 'cara');
          if (dp) ctx.transform(dp.a, dp.b, dp.c, dp.d, dp.e, dp.f);
          ctx.translate(an.x, an.y); ctx.scale(an.k, an.k);
        }
        ac(ctx, o);
        ctx.restore();
      }
    } finally { ctx.restore(); }
  };

  /* Las caras de los emotes de la tienda, para Sprites.drawPacFace */
  Sprites.CARAS_TIENDA = { dormido: 1, burla: 1, chulo: 1, mareo: 1, ko: 1, jajaja: 1, enserio: 1 };
  Sprites.caraTienda = function (ctx, x, y, r, color, id, tick) {
    caraEmote(ctx, x, y, r, colorLargo(color), id, (typeof tick === 'number') ? tick : 0);
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
    /* las nuevas mueren a su manera (se quema, se desmorona, se desinfla...)
     * sin cambiar de dibujo: ver conMuerte() */
    if (MUERTE_PROPIA[skin]) {
      Sprites.dibujarArte(ctx, x, y, d, 0, col, skin,
        { muerte: Math.max(0, Math.min(1, t)), t: 2 + t * 1.5, icono: true });
      return;
    }
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
  var SINODICO = 29.530588853;                       // días de luna llena a luna llena
  var LUNA_REF = Date.UTC(2000, 0, 21, 4, 40);       // una luna llena conocida
  var MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO',
    'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

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
      /* de la TIENDA: se compran con monedas (js/tienda.js) */
      if (sk.grupo === 'tienda') {
        var T = window.PM.Tienda;
        var mia = !!(T && T.tiene(id));
        return {
          abierta: mia,
          pct: mia ? 1 : (T ? Math.min(1, Math.max(0, T.saldo()) / (sk.precio || 1)) : 0),
          progreso: mia ? 'COMPRADA' : !T ? '' : (T.fmt(sk.precio || 0) + ' MONEDAS · TIENES ' +
            T.fmt(Math.max(0, T.saldo()))),
          chip: 'TIENDA'
        };
      }
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
      /* HOMBRE LOBO: jugar una noche de luna llena */
      if (p.luna) {
        var lunaYa = statDe('lunallena') >= 1;
        var prox = this.proximaLuna(fecha);
        return {
          abierta: lunaYa,
          pct: lunaYa ? 1 : 0,
          progreso: lunaYa ? 'GANADA EN LUNA LLENA'
            : this.lunaLlena(fecha) ? 'ES LUNA LLENA: JUEGA UNA PARTIDA'
            : ('JUEGA UNA NOCHE DE LUNA LLENA · LA PRÓXIMA, EL ' + prox.getDate() + ' DE ' +
               MESES[prox.getMonth()]),
          chip: 'LUNA LLENA'
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
      if (this.lunaLlena(fecha)) A.record('lunallena', 1);
    },

    /* ---------- luna llena (HOMBRE LOBO) ----------
     * Sin servidor ni tablas: la fase sale de contar ciclos sinódicos desde
     * una luna llena conocida (21 ene 2000, 04:40 UTC). Cuenta como luna
     * llena el día antes y el día después del instante exacto (la luna se ve
     * llena a simple vista esas tres noches), y solo DE NOCHE en la hora de
     * quien juega: de 18:00 a 6:00. */
    edadLuna: function (fecha) {
      var dias = (hoy(fecha).getTime() - LUNA_REF) / 86400000;
      return ((dias % SINODICO) + SINODICO) % SINODICO;     // 0 = llena
    },
    lunaLlena: function (fecha) {
      var dt = hoy(fecha);
      var edad = this.edadLuna(dt);
      var llena = edad <= CFG.LUNA.MARGEN_DIAS || edad >= SINODICO - CFG.LUNA.MARGEN_DIAS;
      var h = dt.getHours();
      return llena && (h >= CFG.LUNA.DESDE_H || h < CFG.LUNA.HASTA_H);
    },
    /* el instante de la próxima luna llena (o la de ahora, si aún dura) */
    proximaLuna: function (fecha) {
      var dt = hoy(fecha);
      var edad = this.edadLuna(dt);
      var falta = (edad <= CFG.LUNA.MARGEN_DIAS) ? -edad : (SINODICO - edad);
      return new Date(dt.getTime() + falta * 86400000);
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
      /* un emote se enseña con el jugador quieto en el pasillo de abajo, que
       * es donde cabe el globo por encima */
      var quieto = !!o.emote;
      ctx.fillStyle = CFG.COLORS.pelletMini;
      for (var k = 0; k < P / 8; k++) {
        var sp = k * 8 + 4;
        var pp = this.caminoEscena(sp);
        if (quieto ? (pp.y === 36 && Math.abs(pp.x - 56) < 8) : (sp <= vuelta + 2)) continue;
        ctx.fillRect(pp.x - 1, pp.y - 1, 2, 2);
      }
      var pos = quieto ? { x: 56, y: 36, d: 3 } : this.caminoEscena(s);
      var boca = quieto ? 0 : [0, 1, 2, 1][Math.floor(t * 14) % 4];
      /* esquina más reciente del anillo, para CHISPAS (que salta al girar) */
      var esquinas = [0, PW, PW + PH, 2 * PW + PH], ultima = 0;
      for (var e = 0; e < esquinas.length; e++) if (esquinas[e] <= vuelta) ultima = esquinas[e];
      /* en la vitrina no hay tecla: las que tienen golpe de Q propio lo
       * enseñan solas. Las tres de antes, cada tres segundos: una Q que
       * acierta y luego una fallada. Las de la tanda del 14 sep, una Q que
       * acierta cada 3,4 s con su animación entera. */
      var qTanda = this.Q_TANDA[id] ? (t % 3.4) : -1;
      Sprites.drawPacman(ctx, pos.x, pos.y, pos.d, boca, color, id, {
        t: t,
        back: quieto ? function () { return { x: pos.x, y: pos.y, d: pos.d }; }
          : function (dist) { return self.caminoEscena(s - dist); },
        estira: o.estira || 1,
        team: o.team || [],
        s: s,
        giro: vuelta - ultima,
        confeti: (t % 3.4) < 1.4 ? (t % 3.4) : -1,
        efecto: o.efecto || null,
        accesorio: o.accesorio || null,
        muerde: !!(this.CON_Q[id] && ((t % 3) < 1.1 || ((t % 3) >= 1.6 && (t % 3) < 2.3))) ||
          (qTanda >= 0 && qTanda < 0.4),
        mordio: !!(this.CON_Q[id] && (t % 3) < 1.1) || qTanda >= 0,
        qSeg: (qTanda >= 0 && qTanda < 1.5) ? qTanda : null
      });
      if (quieto) Sprites.drawEmote(ctx, pos.x, pos.y - 11, o.emote, color, t * 60);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return pos;
    },

    /* las de la tanda del 14 sep y las de tienda, que enseñan su Q en la vitrina */
    Q_TANDA: { bomba: 1, abisal: 1, lobo: 1, pinata: 1, tostadora: 1, gargola: 1, pulpo: 1,
      momia: 1, globo: 1, bicefalo: 1, cuy: 1, llama: 1, carro: 1, oso: 1, galleta: 1 },

    /* arriba: cuánto se sube el centro (la lupa de un emote mira el globo) */
    lupa: function (cvLupa, cvEscena, pos, atras, arriba) {
      var c = cvLupa.getContext('2d');
      var REC = this.LUPA_RECORTE;
      var dv = DIR_V[pos.d] || [0, 0];
      var cx = pos.x - dv[0] * (atras || 0), cy = pos.y - dv[1] * (atras || 0) - (arriba || 0);
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
