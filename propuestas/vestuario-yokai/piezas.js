/* Primitivas copiadas de js/skins.js para la vitrina de propuestas. */
var S = 3, R = 6.5;
var DIR_ANGLE = [-Math.PI / 2, Math.PI, Math.PI / 2, 0];
var DIR_V = [[0, -1], [-1, 0], [0, 1], [1, 0]];
var HALF = [0, 20 * Math.PI / 180, 40 * Math.PI / 180];
var TINTA = '#141414';
var PRISMA = ['#ff2a2a', '#ff8c1a', '#ffe81a', '#3ee83e', '#1ae0ff', '#2e6bff', '#9b4dff', '#ff4dc4'];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function mix(a, b, k, alpha) {
  var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  var r = Math.round(((pa >> 16) & 255) * (1 - k) + ((pb >> 16) & 255) * k);
  var g = Math.round(((pa >> 8) & 255) * (1 - k) + ((pb >> 8) & 255) * k);
  var bl = Math.round((pa & 255) * (1 - k) + (pb & 255) * k);
  var al = (alpha == null) ? 1 : alpha;
  return 'rgba(' + r + ',' + g + ',' + bl + ',' + al + ')';
}
function hex(rgba) {
  var m = /(\d+),(\d+),(\d+)/.exec(rgba);
  return '#' + [m[1], m[2], m[3]].map(function (v) { return ('0' + (+v).toString(16)).slice(-2); }).join('');
}
function pacPath(ctx, x, y, r, a, half) {
  ctx.beginPath();
  if (half <= 0) { ctx.arc(x, y, r, 0, Math.PI * 2); }
  else { ctx.moveTo(x, y); ctx.arc(x, y, r, a + half, a - half + Math.PI * 2); ctx.closePath(); }
}
function body(ctx, o, col) {
  ctx.fillStyle = col || o.c;
  pacPath(ctx, o.x, o.y, R, DIR_ANGLE[o.d], o.half);
  ctx.fill();
}
function frame(ctx, x, y, d) {
  var v = DIR_V[d];
  var ox = (v[0] !== 0) ? 0 : -1, oy = (v[0] !== 0) ? -1 : 0;
  ctx.translate(x, y);
  ctx.transform(v[0], v[1], ox, oy, 0, 0);
}
function fase(o) { return (o.half <= 0) ? 0 : (o.half < 0.3 ? 1 : 2); }
function contorno(ctx, w) {
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = (w || 1.6) / S;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}
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
function girarSobre(ctx, px, py, ang) { ctx.translate(px, py); ctx.rotate(ang); ctx.translate(-px, -py); }
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
/* trazas del efecto: puntos por detrás, en unidades nativas */
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
