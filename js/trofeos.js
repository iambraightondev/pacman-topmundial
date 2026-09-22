/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/trofeos.js
 * Los TROFEOS: las copas de la escalera de marcas (tu mejor puntuación en
 * cada mundo y formato, ver js/badges.js). Antes esa escalera usaba los
 * emblemas de oro; desde el 22 de septiembre los emblemas son de las
 * MAESTRÍAS DE ROL (js/maestria.js) y las marcas llevan copa.
 *
 * Seis copas, cada una un metal y una pieza más que la anterior:
 *   0 BRONCE    la copa lisa sobre un taco
 *   1 PLATA     le salen las asas
 *   2 ORO       Pac-Man grabado en el vaso y un pedestal de dos pisos
 *   3 PLATINO   el laurel que abraza el vaso
 *   4 DIAMANTE  el vaso es de cristal tallado, con su gema
 *   5 MUNDIAL   la copa del mundo: el laberinto hecho globo, sostenido
 *               por brazos en espiral, con Pac-Man dándole la vuelta
 *
 * Como los emblemas, cada copa se ARMA pieza a pieza (arm = segundos desde
 * que empezó; null = ya armada) y usa el mismo lienzo lógico de 200x240.
 *
 * Añade a Sprites:
 *   drawTrofeo(ctx, rango, t, arm, sinSombra)
 *   drawTrofeoAt(ctx, rango, cx, cy, alto, t, arm)   dentro de otro dibujo
 *   drawTrofeoOff(ctx, rango, w, h)                  la silueta apagada
 *   TROFEO_COLOR                                     el color de cada metal
 *   TROFEO_FIN                                       cuándo queda armada
 * ============================================================ */
(function () {
  'use strict';
  window.PM = window.PM || {};
  var S = window.PM.Sprites;
  if (!S) return;
  var reduce = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* cada metal: [luz, cuerpo, medio, sombra] */
  var METAL = [
    ['#ffd9b0', '#d98b45', '#a85e28', '#5a2c0e'],   // bronce
    ['#ffffff', '#dfe4ec', '#a8b0bf', '#4f5868'],   // plata
    ['#fff4b8', '#ffd23a', '#d49c12', '#6e4904'],   // oro
    ['#f2ffff', '#c4ecf0', '#7fb6c2', '#28525c'],   // platino
    ['#ffffff', '#a8ecff', '#4fb4ee', '#173f7a'],   // diamante (el marco)
    ['#fff4b8', '#ffd23a', '#d49c12', '#6e4904']    // mundial: oro
  ];
  var COLOR = ['#d98b45', '#dfe4ec', '#ffd23a', '#9fe6ee', '#6fd0ff', '#ffe23a'];
  var FIN = [1.1, 1.35, 1.6, 1.9, 2.15, 2.6];

  function rgba(h, a) {
    var n = parseInt(h.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* metal con volumen: el brillo va de lado a lado, como en un cilindro */
  function metal(c, camino, p, x0, x1) {
    c.beginPath(); camino();
    var g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, p[3]); g.addColorStop(0.16, p[2]);
    g.addColorStop(0.36, p[0]); g.addColorStop(0.52, p[1]);
    g.addColorStop(0.82, p[2]); g.addColorStop(1, p[3]);
    c.fillStyle = g; c.fill();
    c.lineWidth = 2.2; c.strokeStyle = p[3]; c.stroke();
  }

  /* ---------- el armado, igual que en los emblemas ---------- */
  var ARM = 99;
  function ease(p) { var q = p - 1; return 1 + 2.4 * q * q * q + 1.4 * q * q; }
  function pz(c, d, tipo, fn, cx, cy) {
    var p = (ARM - d) / 0.45;
    if (p <= 0) return;
    var X = cx || 0, Y = cy || 0;
    if (p >= 1) {
      fn();
      var b = (ARM - d - 0.45) / 0.4;   // el chispazo al encajar
      if (b < 1 && (tipo === 'pop' || tipo === 'cae')) {
        c.save();
        c.globalAlpha *= 1 - b;
        c.strokeStyle = tipo === 'pop' ? '#ffffff' : '#fff0d0';
        c.lineWidth = 2.5 * (1 - b);
        var R = (tipo === 'pop' ? 8 : 14) + b * (tipo === 'pop' ? 30 : 26);
        c.beginPath();
        if (tipo === 'pop') c.arc(X, Y, R, 0, 7);
        else c.ellipse(X, Y, R * 1.6, R * 0.3, 0, 0, 7);
        c.stroke();
        c.restore();
      }
      return;
    }
    var e = ease(p);
    c.save();
    c.globalAlpha *= Math.min(1, p * 2.2);
    if (tipo === 'cae') c.translate(0, -80 * (1 - e));
    else if (tipo === 'sube') c.translate(0, 60 * (1 - e));
    else if (tipo === 'lado') {
      c.translate(X, Y); c.rotate(0.6 * (1 - e)); c.translate(-X, -Y);
      c.translate(40 * (1 - e) * (X < 0 ? -1 : 1), 0);
    } else {
      var s = Math.max(0.001, tipo === 'pop' ? e : (0.4 + 0.6 * e));
      c.translate(X, Y); c.scale(s, s); c.translate(-X, -Y);
    }
    fn();
    c.restore();
  }

  /* ---------- las piezas ---------- */

  /* el pedestal: tacos de madera oscura, uno por piso, con su placa */
  function pedestal(c, pisos, p) {
    var y = 96;
    for (var i = 0; i < pisos; i++) {
      var w = 36 - i * 7, h = 14 - i * 2;
      var g = c.createLinearGradient(0, y - h, 0, y);
      g.addColorStop(0, '#3a2a3e'); g.addColorStop(1, '#16101c');
      c.fillStyle = g;
      c.fillRect(-w, y - h, w * 2, h);
      c.strokeStyle = '#0a060e'; c.lineWidth = 2; c.strokeRect(-w, y - h, w * 2, h);
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-w + 2, y - h + 1, w * 2 - 4, 1.5);
      y -= h;
    }
    // la placa de metal del piso de abajo
    metal(c, function () { c.rect(-16, 84, 32, 7); }, p, -16, 16);
    c.fillStyle = rgba(p[3], 0.7);
    for (var k = -2; k <= 2; k++) c.fillRect(k * 5 - 1, 87, 2, 1.2);
    return y;   // dónde empieza el pie de la copa
  }

  /* el pie: el disco y el tallo con su nudo */
  function pie(c, suelo, p) {
    metal(c, function () {
      c.moveTo(-22, suelo); c.lineTo(22, suelo); c.lineTo(16, suelo - 7);
      c.lineTo(-16, suelo - 7); c.closePath();
    }, p, -22, 22);
    metal(c, function () {
      c.moveTo(-6, suelo - 7); c.lineTo(6, suelo - 7); c.lineTo(4, 22);
      c.lineTo(-4, 22); c.closePath();
    }, p, -6, 6);
    // el nudo del tallo
    var yn = (suelo - 7 + 22) / 2;
    metal(c, function () { c.ellipse(0, yn, 9, 5, 0, 0, Math.PI * 2); }, p, -9, 9);
  }

  /* el vaso: de la boca (-66) al fondo (22) */
  function caminoVaso(c) {
    c.moveTo(-44, -66);
    c.bezierCurveTo(-44, -18, -26, 12, -9, 20);
    c.lineTo(9, 20);
    c.bezierCurveTo(26, 12, 44, -18, 44, -66);
    c.closePath();
  }
  function vaso(c, p) {
    metal(c, function () { caminoVaso(c); }, p, -44, 44);
    // la boca: el borde y el hueco oscuro de dentro
    metal(c, function () { c.ellipse(0, -66, 44, 8, 0, 0, Math.PI * 2); }, p, -44, 44);
    c.fillStyle = rgba(p[3], 0.85);
    c.beginPath(); c.ellipse(0, -65, 38, 5.5, 0, 0, Math.PI * 2); c.fill();
    // la franja del borde
    c.save();
    c.beginPath(); caminoVaso(c); c.clip();
    c.fillStyle = rgba(p[3], 0.35); c.fillRect(-50, -58, 100, 3);
    c.restore();
  }

  /* el vaso de CRISTAL del diamante: caras talladas y un marco de metal */
  function vasoCristal(c, p, t) {
    c.save();
    c.beginPath(); caminoVaso(c); c.clip();
    var g = c.createLinearGradient(-44, -66, 44, 20);
    g.addColorStop(0, '#dff8ff'); g.addColorStop(0.45, '#6fd0ff');
    g.addColorStop(1, '#1b4c9a');
    c.fillStyle = g; c.fillRect(-50, -80, 100, 110);
    // las caras
    var caras = [[-44, -66, -14, -66, -20, 18], [-14, -66, 14, -66, 0, 20],
                 [14, -66, 44, -66, 20, 18]];
    var luz = ['rgba(255,255,255,.45)', 'rgba(255,255,255,.12)', 'rgba(0,20,60,.3)'];
    for (var i = 0; i < caras.length; i++) {
      var f = caras[i];
      c.beginPath(); c.moveTo(f[0], f[1]); c.lineTo(f[2], f[3]); c.lineTo(f[4], f[5]);
      c.closePath(); c.fillStyle = luz[i]; c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-14, -66); c.lineTo(-20, 18); c.moveTo(14, -66); c.lineTo(20, 18);
    c.moveTo(-40, -30); c.lineTo(40, -30);
    c.stroke();
    // el reflejo que cruza el cristal
    var ph = (t * 0.35) % 1;
    var bx = -70 + ph * 140;
    var sg = c.createLinearGradient(bx - 14, 0, bx + 14, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,.55)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = sg; c.fillRect(bx - 14, -80, 28, 110);
    c.restore();
    c.beginPath(); caminoVaso(c);
    c.lineWidth = 3; c.strokeStyle = p[3]; c.stroke();
    c.lineWidth = 1.2; c.strokeStyle = p[0]; c.stroke();
    metal(c, function () { c.ellipse(0, -66, 44, 8, 0, 0, Math.PI * 2); }, p, -44, 44);
    c.fillStyle = 'rgba(20,50,110,.8)';
    c.beginPath(); c.ellipse(0, -65, 38, 5.5, 0, 0, Math.PI * 2); c.fill();
  }

  /* las asas, una a cada lado */
  function asas(c, p, grandes) {
    var ext = grandes ? 72 : 66;
    for (var lado = -1; lado <= 1; lado += 2) {
      c.save();
      c.scale(lado, 1);
      c.beginPath();
      c.moveTo(40, -54);
      c.bezierCurveTo(ext, -60, ext, -14, 26, -4);
      c.lineWidth = 9; c.strokeStyle = p[3]; c.stroke();
      c.lineWidth = 6; c.strokeStyle = p[1]; c.stroke();
      c.lineWidth = 2; c.strokeStyle = p[0];
      c.beginPath();
      c.moveTo(41, -55);
      c.bezierCurveTo(ext - 3, -60, ext - 3, -18, 28, -7);
      c.stroke();
      c.restore();
    }
  }

  /* Pac-Man grabado en el vaso, comiéndose tres puntos */
  function grabado(c, p, t) {
    var boca = 0.35 + 0.25 * Math.abs(Math.sin(t * 4));
    c.fillStyle = rgba(p[3], 0.75);
    c.beginPath(); c.moveTo(-8, -28);
    c.arc(-8, -28, 12, boca, Math.PI * 2 - boca); c.closePath(); c.fill();
    c.fillStyle = rgba(p[0], 0.8);
    c.beginPath(); c.moveTo(-9, -29);
    c.arc(-9, -29, 10, boca + 0.1, Math.PI - 0.2); c.closePath(); c.fill();
    c.fillStyle = rgba(p[3], 0.75);
    for (var i = 0; i < 3; i++) c.fillRect(10 + i * 8, -30, 3, 3);
  }

  /* el laurel: dos ramas que suben abrazando el vaso */
  function laurel(c, p) {
    for (var lado = -1; lado <= 1; lado += 2) {
      c.save();
      c.scale(lado, 1);
      c.strokeStyle = p[3]; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(6, 30);
      c.quadraticCurveTo(48, 20, 52, -40); c.stroke();
      for (var i = 0; i < 6; i++) {
        var k = i / 6;
        var x = 6 + (52 - 6) * (1 - (1 - k) * (1 - k)) , y = 30 + (-40 - 30) * k;
        c.save();
        c.translate(x, y);
        c.rotate(-0.9 + k * 0.5);
        c.beginPath(); c.ellipse(7, 0, 8, 3.2, 0, 0, Math.PI * 2);
        c.fillStyle = p[1]; c.fill();
        c.strokeStyle = p[3]; c.lineWidth = 1; c.stroke();
        c.beginPath(); c.ellipse(-3, -6, 7, 2.8, -1, 0, Math.PI * 2);
        c.fillStyle = p[2]; c.fill(); c.stroke();
        c.restore();
      }
      c.restore();
    }
  }

  /* una gema tallada, para el frente del diamante */
  function gema(c, x, y, r, col, resp) {
    c.save();
    c.translate(x, y);
    c.shadowColor = col; c.shadowBlur = 8 + 10 * resp;
    c.beginPath();
    c.moveTo(0, -r); c.lineTo(r * 0.9, -r * 0.2); c.lineTo(0, r); c.lineTo(-r * 0.9, -r * 0.2);
    c.closePath(); c.fillStyle = col; c.fill();
    c.shadowBlur = 0;
    c.beginPath(); c.moveTo(0, -r); c.lineTo(-r * 0.9, -r * 0.2); c.lineTo(0, 0); c.closePath();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.fill();
    c.beginPath(); c.moveTo(0, r); c.lineTo(r * 0.9, -r * 0.2); c.lineTo(0, 0); c.closePath();
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fill();
    c.lineWidth = 1.4; c.strokeStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0, -r); c.lineTo(r * 0.9, -r * 0.2); c.lineTo(0, r); c.lineTo(-r * 0.9, -r * 0.2);
    c.closePath(); c.stroke();
    c.restore();
  }

  /* ---------- la copa del mundo ---------- */

  /* el globo: el laberinto hecho esfera, con Pac-Man dándole la vuelta */
  function globo(c, t) {
    var R = 38, cy = -40;
    var g = c.createRadialGradient(-12, cy - 14, 4, 0, cy, R);
    g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ffd23a');
    g.addColorStop(0.85, '#b07a0a'); g.addColorStop(1, '#5a3a02');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, cy, R, 0, Math.PI * 2); c.fill();
    // los pasillos del laberinto, curvados como meridianos y paralelos
    c.save();
    c.beginPath(); c.arc(0, cy, R - 1, 0, Math.PI * 2); c.clip();
    c.strokeStyle = 'rgba(30,50,200,.75)'; c.lineWidth = 3;
    var giro = (t * 0.25) % 1;
    for (var m = 0; m < 5; m++) {
      var k = ((m / 5 + giro) % 1) * 2 - 1;   // -1..1 de lado a lado
      c.beginPath();
      c.ellipse(k * R * 0.9, cy, Math.max(1, R * 0.28 * Math.sqrt(1 - k * k)), R, 0,
        -Math.PI / 2 + 0.5, Math.PI / 2 - 0.5);
      c.stroke();
    }
    for (var pa = -1; pa <= 1; pa++) {
      c.beginPath(); c.ellipse(0, cy + pa * 16, R * Math.sqrt(1 - pa * pa * 0.18), 5, 0, 0.3, Math.PI - 0.3);
      c.stroke();
    }
    c.restore();
    c.lineWidth = 2.4; c.strokeStyle = '#5a3a02';
    c.beginPath(); c.arc(0, cy, R, 0, Math.PI * 2); c.stroke();
    // Pac-Man dándole la vuelta al ecuador (por delante se ve, por detrás no)
    var a = t * 1.3;
    var px = Math.sin(a) * (R + 2), delante = Math.cos(a) > 0;
    if (delante) {
      var boca = 0.3 + 0.3 * Math.abs(Math.sin(t * 8));
      var dir = Math.cos(a) >= 0 ? 0 : Math.PI;
      c.fillStyle = '#ffff00';
      c.strokeStyle = '#6e4904'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(px, cy + 4);
      c.arc(px, cy + 4, 7, dir + boca, dir + Math.PI * 2 - boca); c.closePath();
      c.fill(); c.stroke();
    }
  }

  /* los brazos en espiral que sujetan el globo */
  function brazos(c, p) {
    for (var lado = -1; lado <= 1; lado += 2) {
      c.save();
      c.scale(lado, 1);
      c.beginPath();
      c.moveTo(6, 40);
      c.bezierCurveTo(36, 20, 50, -10, 30, -34);
      c.lineWidth = 12; c.strokeStyle = p[3]; c.stroke();
      c.lineWidth = 9; c.strokeStyle = p[1]; c.stroke();
      c.lineWidth = 3; c.strokeStyle = p[0];
      c.beginPath(); c.moveTo(5, 38); c.bezierCurveTo(33, 19, 46, -10, 28, -32); c.stroke();
      c.restore();
    }
  }

  /* las dos franjas verdes de malaquita en la base */
  function franjas(c) {
    for (var i = 0; i < 2; i++) {
      var y = 50 + i * 9;
      var g = c.createLinearGradient(-20, 0, 20, 0);
      g.addColorStop(0, '#0b3d22'); g.addColorStop(0.4, '#2fd07a'); g.addColorStop(1, '#0b3d22');
      c.fillStyle = g;
      c.fillRect(-18 + i * 2, y, 36 - i * 4, 4);
    }
  }

  /* ---------- las seis copas ---------- */
  var COPAS = [
    /* 0 · BRONCE */
    function (c, p, t) {
      pz(c, 0, 'sube', function () { pedestal(c, 1, p); });
      pz(c, 0.3, 'sube', function () { pie(c, 82, p); });
      pz(c, 0.55, 'cae', function () { vaso(c, p); }, 0, 20);
    },
    /* 1 · PLATA: las asas */
    function (c, p, t) {
      pz(c, 0, 'sube', function () { pedestal(c, 1, p); });
      pz(c, 0.3, 'sube', function () { pie(c, 82, p); });
      pz(c, 0.55, 'cae', function () { vaso(c, p); }, 0, 20);
      pz(c, 0.9, 'lado', function () { asas(c, p, false); }, -44, -30);
    },
    /* 2 · ORO: dos pisos y Pac-Man grabado */
    function (c, p, t) {
      pz(c, 0, 'sube', function () { pedestal(c, 2, p); });
      pz(c, 0.3, 'sube', function () { pie(c, 70, p); });
      pz(c, 0.55, 'cae', function () { vaso(c, p); }, 0, 20);
      pz(c, 0.9, 'lado', function () { asas(c, p, true); }, -44, -30);
      pz(c, 1.15, 'pop', function () { grabado(c, p, t); }, 0, -28);
    },
    /* 3 · PLATINO: el laurel */
    function (c, p, t) {
      pz(c, 0, 'sube', function () { pedestal(c, 2, p); });
      pz(c, 0.3, 'sube', function () { pie(c, 70, p); });
      pz(c, 0.55, 'crece', function () { laurel(c, METAL[2]); }, 0, 20);
      pz(c, 0.75, 'cae', function () { vaso(c, p); }, 0, 20);
      pz(c, 1.1, 'lado', function () { asas(c, p, true); }, -44, -30);
      pz(c, 1.4, 'pop', function () { grabado(c, p, t); }, 0, -28);
    },
    /* 4 · DIAMANTE: vaso de cristal y gema */
    function (c, p, t, resp) {
      pz(c, 0, 'sube', function () { pedestal(c, 3, p); });
      pz(c, 0.3, 'sube', function () { pie(c, 60, p); });
      pz(c, 0.55, 'crece', function () { laurel(c, METAL[3]); }, 0, 20);
      pz(c, 0.8, 'cae', function () { vasoCristal(c, p, t); }, 0, 20);
      pz(c, 1.15, 'lado', function () { asas(c, p, true); }, -44, -30);
      pz(c, 1.6, 'pop', function () { gema(c, 0, -24, 11, '#bff4ff', resp); }, 0, -24);
    },
    /* 5 · MUNDIAL: la copa del mundo */
    function (c, p, t, resp) {
      var enc = APAGADA ? 0 : Math.max(0, Math.min(1, (ARM - 2.2) / 0.5));
      var h = c.createRadialGradient(0, -30, 10, 0, -30, 110);
      h.addColorStop(0, rgba(COLOR[5], (0.22 + 0.1 * resp) * enc));
      h.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = h; c.fillRect(-110, -140, 220, 260);
      pz(c, 0, 'sube', function () { pedestal(c, 2, p); });
      pz(c, 0.3, 'sube', function () {
        metal(c, function () {
          c.moveTo(-24, 70); c.lineTo(24, 70); c.lineTo(18, 44); c.lineTo(8, 36);
          c.lineTo(-8, 36); c.lineTo(-18, 44); c.closePath();
        }, p, -24, 24);
        franjas(c);
      });
      pz(c, 0.7, 'crece', function () { brazos(c, p); }, 0, 40);
      pz(c, 1.1, 'cae', function () { globo(c, t); }, 0, -40);
      pz(c, 1.7, 'pop', function () { gema(c, 0, 20, 7, '#2fd07a', resp); }, 0, 20);
      // destellos en órbita cuando ya está entera
      if (enc > 0) {
        for (var s = 0; s < 5; s++) {
          var a = t * 0.5 + s * Math.PI * 2 / 5;
          var x = Math.cos(a) * 88, y = -30 + Math.sin(a) * 64;
          var tw = 0.5 + 0.5 * Math.sin(t * 3 + s * 1.7), L = 3 + 4 * tw;
          c.save();
          c.globalAlpha *= enc * (0.35 + 0.65 * tw);
          c.fillStyle = '#fff6c8';
          c.beginPath();
          c.moveTo(x, y - L); c.lineTo(x + 1.2, y - 1.2); c.lineTo(x + L, y);
          c.lineTo(x + 1.2, y + 1.2); c.lineTo(x, y + L); c.lineTo(x - 1.2, y + 1.2);
          c.lineTo(x - L, y); c.lineTo(x - 1.2, y - 1.2); c.closePath(); c.fill();
          c.restore();
        }
      }
    }
  ];

  var SOMBRA = true;
  var APAGADA = false;   // la silueta: sin halo ni destellos
  /* la copa, en un lienzo lógico de 200x240 */
  function copa(c, i, t, arm) {
    ARM = (arm == null || reduce) ? 99 : arm;
    var p = METAL[i];
    c.save();
    c.translate(100, 128);
    c.scale(0.86, 0.86);
    var resp = 0.5 + 0.5 * Math.sin(t * 1.6);
    var so = Math.max(0, Math.min(1, ARM / 0.5));
    if (SOMBRA) {
      c.fillStyle = 'rgba(0,0,0,' + (0.5 * so) + ')';
      c.beginPath(); c.ellipse(0, 100, (44 + i * 5) * (0.5 + 0.5 * so), 6, 0, 0, Math.PI * 2);
      c.fill();
    }
    // el sacudón al encajar la última pieza
    var k = ARM - FIN[i];
    if (k > 0 && k < 0.3) {
      var am = (1 - k / 0.3) * 2.2;
      c.translate(Math.sin(k * 90) * am, Math.cos(k * 70) * am * 0.6);
    }
    COPAS[i](c, p, t, resp);
    c.restore();
    // destello al quedar completa
    if (k > 0 && k < 0.5) {
      c.save();
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(255,250,230,' + (0.5 * (1 - k / 0.5)) + ')';
      c.fillRect(0, 0, 200, 240);
      c.restore();
    }
    // y el brillo que la recorre de vez en cuando
    if (k < 0.3) return;
    var ciclo = (t * 0.3 + i * 0.13) % 1;
    if (ciclo < 0.4 && c.getTransform) {
      var bx = -60 + ciclo / 0.4 * 320;
      c.save();
      c.globalCompositeOperation = 'source-atop';
      var sg = c.createLinearGradient(bx - 26, 0, bx + 26, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, 'rgba(255,255,255,.26)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = sg;
      var m = c.getTransform();
      c.setTransform(m.a, 0, -0.35 * m.a, m.d, m.e, m.f);
      c.fillRect(bx - 26, 0, 52, 240);
      c.restore();
    }
  }

  function tope(r) { return Math.max(0, Math.min(5, r | 0)); }

  S.drawTrofeo = function (ctx, rango, t, arm, sinSombra) {
    SOMBRA = !sinSombra;
    copa(ctx, tope(rango), t || 0, arm);
    SOMBRA = true;
  };

  /* dentro de otro dibujo: se pinta aparte y se pega (ver drawEmblemAt) */
  var suelto = null;
  S.drawTrofeoAt = function (ctx, rango, cx, cy, alto, t, arm) {
    if (!document.createElement) return false;
    if (!suelto) suelto = document.createElement('canvas');
    var x = suelto.getContext && suelto.getContext('2d');
    if (!x || !ctx.drawImage) return false;
    var m = ctx.getTransform ? ctx.getTransform() : null;
    var q = m ? Math.min(4, Math.max(1, Math.sqrt(m.a * m.a + m.b * m.b))) : 1;
    var k = alto / 240;
    var W = Math.ceil(200 * k * q), H = Math.ceil(240 * k * q);
    if (suelto.width !== W || suelto.height !== H) { suelto.width = W; suelto.height = H; }
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, W, H);
    x.setTransform(k * q, 0, 0, k * q, 0, 0);
    S.drawTrofeo(x, rango, t, arm, true);
    ctx.drawImage(suelto, cx - 100 * k, cy - 128 * k, 200 * k, 240 * k);
    return true;
  };

  /* la silueta: la copa entera, cubierta de metal oscuro */
  var tmp = null;
  S.drawTrofeoOff = function (ctx, rango, w, h) {
    if (!document.createElement) return;
    if (!tmp) tmp = document.createElement('canvas');
    if (!tmp.getContext) return;
    if (tmp.width !== w || tmp.height !== h) { tmp.width = w; tmp.height = h; }
    var x = tmp.getContext('2d');
    if (!x) return;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, w, h);
    var k = w / 200;
    x.setTransform(k, 0, 0, k, 0, 0);
    APAGADA = true;
    copa(x, tope(rango), 0, 99);
    APAGADA = false;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(22,21,40,.86)';
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  };

  S.TROFEO_COLOR = COLOR;
  S.TROFEO_FIN = FIN;
})();
