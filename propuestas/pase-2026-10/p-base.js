<script>
(function () {
  'use strict';

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- Medidas del juego ---------- */
  var S = 3;                 // escala de render (CFG.SCALE)
  var R = 6.5;               // radio de Pac-Man (CFG.PAC_R)
  var SW = 336, SH = 144;    // escena: 14 x 6 casillas de 8 px
  var CROP = 72, LUPA = 144; // la lupa amplía x2 lo que se ve a tamaño real
  var DIR_ANGLE = [-Math.PI / 2, Math.PI, Math.PI / 2, 0];
  var DIR_V = [[0, -1], [-1, 0], [0, 1], [1, 0]];
  var HALF = [0, 20 * Math.PI / 180, 40 * Math.PI / 180];
  var SWATCHES = ['#ffff00', '#ff0000', '#00ffff', '#00ff00', '#ff69b4', '#ff8c00', '#b19cd9', '#ffffff'];

  /* recorrido: un pasillo en anillo alrededor de un bloque */
  var X0 = 12, Y0 = 12, X1 = 100, Y1 = 36, PW = X1 - X0, PH = Y1 - Y0, P = 2 * (PW + PH);
  var SPEED = 44;

  function pathAt(s) {
    s = ((s % P) + P) % P;
    if (s < PW) return { x: X0 + s, y: Y0, d: 3 };
    s -= PW;
    if (s < PH) return { x: X1, y: Y0 + s, d: 2 };
    s -= PH;
    if (s < PW) return { x: X1 - s, y: Y1, d: 1 };
    s -= PW;
    return { x: X0, y: Y1 - s, d: 0 };
  }

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
  /* la Q de demostración: -1 fuera de ella, de 0 a 1 mientras dura */
  function qFase(t, periodo, dura) { var x = t % periodo; return x < dura ? x / dura : -1; }
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

  var DRAW = {};
