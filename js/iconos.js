/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/iconos.js
 * LOS LOGOS DE LOS ROLES Y LOS ICONOS DE LOS PODERES. Define window.PM.Iconos
 *
 * Para la selección de rol y poderes (ui.js, armario): antes eran solo
 * texto y no se reconocía nada de un vistazo. Todo se dibuja con trazos
 * en una caja de 100×100 que se escala al tamaño pedido, en el color del
 * rol y con algún detalle en blanco: sin imágenes que cargar, y nítido a
 * cualquier tamaño.
 *
 *   Iconos.rol(c, id, tam)          el emblema del rol (su escudo)
 *   Iconos.hab(c, id, tam, color)   el icono de un poder
 *   Iconos.lienzo(tipo, id, tam, color) -> <canvas> ya pintado
 * ============================================================ */
(function () {
  'use strict';
  window.PM = window.PM || {};
  var CFG = window.PM.CFG;
  var PI = Math.PI;
  var BLANCO = '#ffffff';

  /* ---------- trazos de base ---------- */
  function linea(c, pts, ancho, color) {
    c.beginPath();
    for (var i = 0; i < pts.length; i++) {
      if (i) c.lineTo(pts[i][0], pts[i][1]); else c.moveTo(pts[i][0], pts[i][1]);
    }
    c.lineWidth = ancho || 7;
    c.strokeStyle = color;
    c.stroke();
  }
  function poli(c, pts, color, cerrar) {
    c.beginPath();
    for (var i = 0; i < pts.length; i++) {
      if (i) c.lineTo(pts[i][0], pts[i][1]); else c.moveTo(pts[i][0], pts[i][1]);
    }
    if (cerrar !== false) c.closePath();
    c.fillStyle = color;
    c.fill();
  }
  function circulo(c, x, y, r, color, ancho) {
    c.beginPath();
    c.arc(x, y, r, 0, PI * 2);
    if (ancho) { c.lineWidth = ancho; c.strokeStyle = color; c.stroke(); }
    else { c.fillStyle = color; c.fill(); }
  }
  function arco(c, x, y, r, a0, a1, color, ancho) {
    c.beginPath();
    c.arc(x, y, r, a0, a1);
    c.lineWidth = ancho || 7;
    c.strokeStyle = color;
    c.stroke();
  }
  /* un Pac-Man: boca abierta hacia la derecha (ang = media boca en radianes) */
  function pac(c, x, y, r, color, ang, rot) {
    c.save();
    c.translate(x, y);
    c.rotate(rot || 0);
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, r, ang, PI * 2 - ang);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.restore();
  }
  /* un fantasma pequeño */
  function fantasma(c, x, y, r, color, ojos) {
    c.beginPath();
    c.arc(x, y, r, PI, 0);
    c.lineTo(x + r, y + r);
    var n = 3, w = (r * 2) / n;
    for (var i = 0; i < n; i++) {
      c.lineTo(x + r - w * i - w / 2, y + r * 0.7);
      c.lineTo(x + r - w * (i + 1), y + r);
    }
    c.closePath();
    c.fillStyle = color;
    c.fill();
    if (ojos !== false) {
      circulo(c, x - r * 0.35, y - r * 0.1, r * 0.25, BLANCO);
      circulo(c, x + r * 0.35, y - r * 0.1, r * 0.25, BLANCO);
    }
  }
  function rayo(c, x, y, e, color) {
    poli(c, [[x + 6 * e, y - 30 * e], [x - 14 * e, y + 4 * e], [x - 1 * e, y + 4 * e],
             [x - 6 * e, y + 30 * e], [x + 14 * e, y - 4 * e], [x + 1 * e, y - 4 * e]], color);
  }
  function estrella(c, x, y, rExt, rInt, puntas, color, giro) {
    var pts = [];
    for (var i = 0; i < puntas * 2; i++) {
      var r = (i % 2) ? rInt : rExt, a = (giro || -PI / 2) + i * PI / puntas;
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    poli(c, pts, color);
  }
  function flecha(c, x0, y0, x1, y1, color, ancho) {
    var a = Math.atan2(y1 - y0, x1 - x0), p = 14;
    linea(c, [[x0, y0], [x1, y1]], ancho || 7, color);
    poli(c, [[x1 + Math.cos(a) * 4, y1 + Math.sin(a) * 4],
             [x1 - Math.cos(a - 0.6) * p, y1 - Math.sin(a - 0.6) * p],
             [x1 - Math.cos(a + 0.6) * p, y1 - Math.sin(a + 0.6) * p]], color);
  }

  /* ---------- LOS ROLES: un escudo con su símbolo ---------- */
  var ROLES = {
    /* ASESINO: la boca con colmillos, lo que puntúa */
    asesino: function (c, col) {
      pac(c, 50, 52, 26, col, 0.6);
      poli(c, [[58, 40], [66, 47], [60, 50]], BLANCO);
      poli(c, [[58, 64], [66, 57], [60, 54]], BLANCO);
      circulo(c, 48, 38, 4, '#000');
    },
    /* TANQUE: el escudo */
    tanque: function (c, col) {
      poli(c, [[50, 22], [74, 30], [72, 56], [50, 78], [28, 56], [26, 30]], col);
      poli(c, [[50, 30], [66, 35], [64, 55], [50, 69]], 'rgba(0,0,0,0.25)');
      linea(c, [[50, 30], [50, 68]], 4, BLANCO);
    },
    /* MAGO: el sombrero con su estrella */
    mago: function (c, col) {
      poli(c, [[50, 16], [70, 66], [30, 66]], col);
      poli(c, [[22, 66], [78, 66], [74, 76], [26, 76]], col);
      estrella(c, 50, 48, 9, 4, 5, BLANCO);
    },
    /* SOPORTE: la cruz dentro del corazón */
    soporte: function (c, col) {
      c.beginPath();
      c.moveTo(50, 78);
      c.bezierCurveTo(14, 56, 22, 22, 50, 36);
      c.bezierCurveTo(78, 22, 86, 56, 50, 78);
      c.fillStyle = col;
      c.fill();
      poli(c, [[46, 38], [54, 38], [54, 46], [62, 46], [62, 54], [54, 54], [54, 62], [46, 62], [46, 54], [38, 54], [38, 46], [46, 46]], BLANCO);
    }
  };
  /* el marco de todos: un hexágono oscuro con borde de su color */
  function marcoRol(c, col) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = -PI / 2 + i * PI / 3;
      pts.push([50 + Math.cos(a) * 47, 50 + Math.sin(a) * 47]);
    }
    poli(c, pts, 'rgba(0,0,0,0.55)');
    c.beginPath();
    for (var j = 0; j <= 6; j++) {
      var p = pts[j % 6];
      if (j) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]);
    }
    c.lineWidth = 5;
    c.strokeStyle = col;
    c.stroke();
  }

  /* ---------- LOS PODERES ---------- */
  var HAB = {
    /* --- ASESINO --- */
    mordisco: function (c, k) {
      pac(c, 46, 50, 32, k, 0.7);
      for (var i = 0; i < 3; i++) {
        poli(c, [[52 + i * 9, 34 + i * 4], [60 + i * 9, 36 + i * 4], [55 + i * 9, 44 + i * 3]], BLANCO);
        poli(c, [[52 + i * 9, 66 - i * 4], [60 + i * 9, 64 - i * 4], [55 + i * 9, 56 - i * 3]], BLANCO);
      }
    },
    shuriken: function (c, k) {
      estrella(c, 50, 50, 38, 12, 4, k, PI / 4);
      circulo(c, 50, 50, 7, '#000');
    },
    bomba: function (c, k) {
      circulo(c, 44, 58, 28, k);
      poli(c, [[58, 30], [68, 24], [72, 32], [64, 38]], BLANCO);
      linea(c, [[70, 26], [78, 16]], 4, BLANCO);
      estrella(c, 80, 14, 9, 3, 6, '#ffe23a');
      circulo(c, 36, 50, 6, 'rgba(255,255,255,0.5)');
    },
    turbo: function (c, k) { rayo(c, 52, 50, 1.25, k); },
    sombra: function (c, k) {
      c.save(); c.globalAlpha = 0.35; pac(c, 38, 50, 26, k, 0.6); c.restore();
      c.save(); c.globalAlpha = 0.65; pac(c, 52, 50, 26, k, 0.6); c.restore();
      pac(c, 66, 50, 26, k, 0.6);
    },
    frenesi: function (c, k) {
      linea(c, [[22, 26], [46, 50], [22, 74]], 10, k);
      linea(c, [[50, 26], [74, 50], [50, 74]], 10, BLANCO);
    },
    carrona: function (c, k) {
      circulo(c, 50, 50, 30, '#ffe23a');
      circulo(c, 50, 50, 22, '#e0a800', 4);
      c.fillStyle = '#7a5600';
      c.font = 'bold 30px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('$', 50, 52);
      poli(c, [[14, 24], [22, 20], [20, 30]], k);
    },
    flash: function (c, k) {
      c.save(); c.globalAlpha = 0.4; pac(c, 24, 58, 14, k, 0.6); c.restore();
      c.setLineDash([6, 7]);
      arco(c, 50, 70, 30, PI * 1.1, PI * 1.9, k, 5);
      c.setLineDash([]);
      pac(c, 76, 58, 16, k, 0.6);
    },
    marca: function (c, k) {
      circulo(c, 50, 50, 30, k, 6);
      circulo(c, 50, 50, 12, k, 5);
      linea(c, [[50, 10], [50, 30]], 6, k);
      linea(c, [[50, 70], [50, 90]], 6, k);
      linea(c, [[10, 50], [30, 50]], 6, k);
      linea(c, [[70, 50], [90, 50]], 6, k);
      circulo(c, 50, 50, 4, BLANCO);
    },
    gancho_inverso: function (c, k) {
      arco(c, 60, 58, 16, 0, PI, k, 7);
      linea(c, [[76, 58], [76, 18]], 7, k);
      poli(c, [[38, 52], [50, 58], [40, 66]], k);
      flecha(c, 34, 30, 12, 30, BLANCO, 5);
    },
    grito: function (c, k) {
      pac(c, 32, 50, 20, k, 0.75);
      arco(c, 42, 50, 18, -0.7, 0.7, BLANCO, 5);
      arco(c, 42, 50, 30, -0.7, 0.7, k, 5);
      arco(c, 42, 50, 42, -0.7, 0.7, BLANCO, 5);
    },
    misil: function (c, k) {
      c.save(); c.translate(50, 50); c.rotate(-PI / 4);
      poli(c, [[-26, -9], [16, -9], [32, 0], [16, 9], [-26, 9]], k);
      poli(c, [[-26, -9], [-36, -20], [-16, -9]], BLANCO);
      poli(c, [[-26, 9], [-36, 20], [-16, 9]], BLANCO);
      poli(c, [[-28, -5], [-44, 0], [-28, 5]], '#ffb852');
      c.restore();
    },
    ejecucion: function (c, k) {
      circulo(c, 50, 44, 26, k);
      poli(c, [[36, 62], [64, 62], [60, 78], [40, 78]], k);
      circulo(c, 40, 44, 7, '#000');
      circulo(c, 60, 44, 7, '#000');
      poli(c, [[50, 52], [46, 60], [54, 60]], '#000');
      linea(c, [[44, 70], [44, 78]], 3, '#000');
      linea(c, [[50, 70], [50, 78]], 3, '#000');
      linea(c, [[56, 70], [56, 78]], 3, '#000');
    },
    caceria: function (c, k) {
      c.beginPath();
      c.moveTo(12, 50);
      c.quadraticCurveTo(50, 14, 88, 50);
      c.quadraticCurveTo(50, 86, 12, 50);
      c.fillStyle = k;
      c.fill();
      circulo(c, 50, 50, 15, '#000');
      circulo(c, 50, 50, 7, '#ff3b3b');
      circulo(c, 45, 45, 3, BLANCO);
    },

    /* --- TANQUE --- */
    pisoton: function (c, k) {
      poli(c, [[34, 14], [56, 14], [56, 46], [70, 46], [70, 60], [30, 60], [30, 46], [34, 46]], k);
      linea(c, [[14, 72], [86, 72]], 6, BLANCO);
      arco(c, 50, 76, 20, PI * 1.15, PI * 1.85, k, 4);
      linea(c, [[18, 84], [30, 78]], 4, k);
      linea(c, [[82, 84], [70, 78]], 4, k);
    },
    empujon: function (c, k) {
      poli(c, [[16, 38], [44, 38], [44, 28], [62, 50], [44, 72], [44, 62], [16, 62]], k);
      fantasma(c, 76, 52, 14, BLANCO, false);
    },
    rebote: function (c, k) {
      linea(c, [[12, 22], [40, 70], [66, 30]], 7, k);
      flecha(c, 66, 30, 84, 18, k, 7);
      linea(c, [[26, 80], [56, 80]], 5, BLANCO);
    },
    escudo: function (c, k) {
      poli(c, [[50, 12], [82, 24], [78, 58], [50, 88], [22, 58], [18, 24]], k);
      poli(c, [[50, 22], [72, 30], [69, 56], [50, 77]], 'rgba(255,255,255,0.3)');
    },
    yunque: function (c, k) {
      poli(c, [[16, 30], [82, 30], [82, 42], [66, 50], [62, 62], [72, 74], [28, 74], [38, 62], [34, 50], [16, 42]], k);
      poli(c, [[16, 30], [30, 30], [22, 36]], BLANCO);
      linea(c, [[20, 84], [80, 84]], 5, BLANCO);
    },
    piel_piedra: function (c, k) {
      poli(c, [[22, 30], [42, 18], [60, 24], [78, 38], [80, 64], [62, 82], [34, 80], [18, 60]], k);
      linea(c, [[42, 18], [46, 44], [30, 52]], 4, '#000');
      linea(c, [[46, 44], [66, 50], [62, 82]], 4, '#000');
    },
    provocar: function (c, k) {
      circulo(c, 50, 50, 36, k);
      poli(c, [[44, 20], [56, 20], [54, 60], [46, 60]], '#000');
      circulo(c, 50, 72, 6, '#000');
    },
    grito_guerra: function (c, k) {
      poli(c, [[18, 40], [34, 40], [60, 22], [60, 78], [34, 60], [18, 60]], k);
      linea(c, [[70, 34], [84, 26]], 6, BLANCO);
      linea(c, [[72, 50], [88, 50]], 6, BLANCO);
      linea(c, [[70, 66], [84, 74]], 6, BLANCO);
    },
    arrollar: function (c, k) {
      poli(c, [[40, 30], [78, 30], [78, 62], [40, 62]], k);
      circulo(c, 30, 58, 18, BLANCO);
      circulo(c, 30, 58, 8, k);
      linea(c, [[10, 26], [28, 26]], 5, k);
      linea(c, [[6, 38], [22, 38]], 5, k);
      linea(c, [[40, 78], [84, 78]], 5, k);
    },
    terremoto: function (c, k) {
      poli(c, [[10, 60], [90, 60], [90, 86], [10, 86]], k);
      linea(c, [[50, 14], [40, 34], [58, 46], [44, 62], [56, 76], [48, 86]], 6, '#000');
      linea(c, [[18, 50], [30, 44]], 5, BLANCO);
      linea(c, [[82, 50], [70, 44]], 5, BLANCO);
    },
    fortaleza: function (c, k) {
      poli(c, [[20, 36], [80, 36], [80, 86], [20, 86]], k);
      for (var i = 0; i < 4; i++) poli(c, [[20 + i * 17, 22], [30 + i * 17, 22], [30 + i * 17, 36], [20 + i * 17, 36]], k);
      poli(c, [[42, 86], [42, 64], [50, 56], [58, 64], [58, 86]], '#000');
    },

    /* --- MAGO --- */
    fuego: function (c, k) {
      c.beginPath();
      c.moveTo(50, 12);
      c.bezierCurveTo(72, 36, 84, 50, 76, 68);
      c.bezierCurveTo(68, 88, 32, 88, 24, 68);
      c.bezierCurveTo(18, 52, 30, 40, 36, 30);
      c.bezierCurveTo(40, 44, 46, 44, 50, 12);
      c.fillStyle = '#ff6a2b';
      c.fill();
      circulo(c, 50, 66, 14, '#ffe23a');
      c.save(); c.globalAlpha = 0.5; circulo(c, 50, 66, 22, k, 4); c.restore();
    },
    bola_guiada: function (c, k) {
      c.setLineDash([5, 6]);
      c.beginPath();
      c.moveTo(12, 80);
      c.quadraticCurveTo(20, 30, 62, 36);
      c.lineWidth = 5; c.strokeStyle = k; c.stroke();
      c.setLineDash([]);
      circulo(c, 68, 36, 16, k);
      circulo(c, 64, 32, 5, BLANCO);
      circulo(c, 86, 70, 7, BLANCO, 3);
    },
    toque_arcano: function (c, k) {
      estrella(c, 50, 50, 36, 10, 4, k);
      estrella(c, 50, 50, 20, 6, 4, BLANCO, 0);
      circulo(c, 80, 22, 5, k);
      circulo(c, 22, 78, 4, k);
    },
    chispa: function (c, k) {
      for (var i = 0; i < 8; i++) {
        var a = i * PI / 4, r0 = 14, r1 = (i % 2) ? 30 : 40;
        linea(c, [[50 + Math.cos(a) * r0, 50 + Math.sin(a) * r0], [50 + Math.cos(a) * r1, 50 + Math.sin(a) * r1]], 6, k);
      }
      circulo(c, 50, 50, 10, BLANCO);
    },
    portal: function (c, k) {
      c.beginPath(); c.ellipse(28, 50, 14, 32, 0, 0, PI * 2); c.lineWidth = 7; c.strokeStyle = k; c.stroke();
      c.beginPath(); c.ellipse(72, 50, 14, 32, 0, 0, PI * 2); c.lineWidth = 7; c.strokeStyle = BLANCO; c.stroke();
      c.setLineDash([4, 5]);
      linea(c, [[40, 50], [60, 50]], 4, k);
      c.setLineDash([]);
    },
    clon: function (c, k) {
      c.save(); c.globalAlpha = 0.5; c.setLineDash([5, 5]);
      c.beginPath(); c.moveTo(62, 44); c.arc(62, 44, 24, 0.6, PI * 2 - 0.6); c.closePath();
      c.lineWidth = 4; c.strokeStyle = BLANCO; c.stroke();
      c.restore();
      pac(c, 40, 58, 24, k, 0.6);
    },
    totem: function (c, k) {
      poli(c, [[34, 30], [66, 30], [66, 88], [34, 88]], k);
      poli(c, [[28, 22], [72, 22], [66, 34], [34, 34]], BLANCO);
      circulo(c, 50, 50, 8, '#000');
      circulo(c, 50, 50, 3, '#ff3b3b');
      poli(c, [[40, 66], [60, 66], [56, 74], [44, 74]], '#000');
      linea(c, [[74, 46], [90, 40]], 4, k);
    },
    runa: function (c, k) {
      circulo(c, 50, 50, 34, k, 6);
      linea(c, [[50, 24], [50, 76]], 6, BLANCO);
      linea(c, [[50, 38], [36, 28]], 5, BLANCO);
      linea(c, [[50, 38], [64, 28]], 5, BLANCO);
      linea(c, [[50, 60], [36, 70]], 5, BLANCO);
      linea(c, [[50, 60], [64, 70]], 5, BLANCO);
    },
    gravedad: function (c, k) {
      c.beginPath();
      for (var i = 0; i <= 60; i++) {
        var a = i * 0.28, r = 3 + i * 0.62;
        var x = 50 + Math.cos(a) * r, y = 50 + Math.sin(a) * r;
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.lineWidth = 6; c.strokeStyle = k; c.stroke();
      circulo(c, 50, 50, 6, BLANCO);
    },
    dominio: function (c, k) {
      poli(c, [[16, 70], [20, 32], [36, 50], [50, 24], [64, 50], [80, 32], [84, 70]], k);
      poli(c, [[16, 74], [84, 74], [84, 84], [16, 84]], k);
      circulo(c, 50, 64, 5, BLANCO);
      circulo(c, 32, 64, 4, BLANCO);
      circulo(c, 68, 64, 4, BLANCO);
    },
    tormenta: function (c, k) {
      circulo(c, 34, 38, 16, k);
      circulo(c, 54, 30, 20, k);
      circulo(c, 70, 42, 14, k);
      poli(c, [[22, 42], [80, 42], [80, 54], [22, 54]], k);
      rayo(c, 50, 70, 0.7, '#ffe23a');
    },
    meteoro: function (c, k) {
      poli(c, [[16, 20], [52, 46], [44, 56]], '#ff6a2b');
      poli(c, [[26, 14], [58, 40], [50, 48]], '#ffe23a');
      circulo(c, 62, 62, 22, k);
      circulo(c, 56, 56, 5, 'rgba(0,0,0,0.35)');
      circulo(c, 70, 68, 4, 'rgba(0,0,0,0.35)');
    },
    eclipse: function (c, k) {
      circulo(c, 50, 50, 32, '#ffe23a');
      circulo(c, 62, 42, 28, '#000');
      circulo(c, 62, 42, 28, k, 4);
    },

    /* --- SOPORTE --- */
    hielo: function (c, k) {
      for (var i = 0; i < 3; i++) {
        c.save(); c.translate(50, 50); c.rotate(i * PI / 3);
        linea(c, [[0, -36], [0, 36]], 6, k);
        linea(c, [[0, -24], [-9, -32]], 4, BLANCO);
        linea(c, [[0, -24], [9, -32]], 4, BLANCO);
        linea(c, [[0, 24], [-9, 32]], 4, BLANCO);
        linea(c, [[0, 24], [9, 32]], 4, BLANCO);
        c.restore();
      }
    },
    mina: function (c, k) {
      for (var i = 0; i < 8; i++) {
        var a = i * PI / 4;
        linea(c, [[50 + Math.cos(a) * 20, 54 + Math.sin(a) * 20], [50 + Math.cos(a) * 34, 54 + Math.sin(a) * 34]], 6, k);
      }
      circulo(c, 50, 54, 22, k);
      circulo(c, 50, 54, 7, '#ff3b3b');
    },
    gancho: function (c, k) {
      linea(c, [[50, 10], [50, 50]], 7, k);
      arco(c, 36, 50, 14, 0, PI, k, 7);
      poli(c, [[16, 44], [28, 52], [18, 58]], k);
      fantasma(c, 72, 64, 14, BLANCO, false);
    },
    telarana: function (c, k) {
      for (var i = 0; i < 8; i++) {
        var a = i * PI / 4;
        linea(c, [[50, 50], [50 + Math.cos(a) * 40, 50 + Math.sin(a) * 40]], 3, k);
      }
      for (var r = 12; r <= 36; r += 12) {
        c.beginPath();
        for (var j = 0; j <= 8; j++) {
          var b = j * PI / 4;
          var x = 50 + Math.cos(b) * r, y = 50 + Math.sin(b) * r;
          if (j) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.lineWidth = 3; c.strokeStyle = BLANCO; c.stroke();
      }
    },
    inmunidad: function (c, k) {
      c.save(); c.globalAlpha = 0.3; circulo(c, 50, 50, 38, k); c.restore();
      circulo(c, 50, 50, 38, k, 5);
      pac(c, 50, 52, 18, BLANCO, 0.6);
      circulo(c, 36, 30, 5, BLANCO);
    },
    estela: function (c, k) {
      for (var i = 0; i < 5; i++) {
        c.save(); c.globalAlpha = 0.25 + i * 0.15;
        circulo(c, 14 + i * 12, 60 - i * 3, 5 + i, k);
        c.restore();
      }
      pac(c, 78, 46, 16, k, 0.6);
    },
    puente: function (c, k) {
      poli(c, [[10, 30], [30, 30], [30, 80], [10, 80]], BLANCO);
      poli(c, [[70, 30], [90, 30], [90, 80], [70, 80]], BLANCO);
      arco(c, 50, 70, 28, PI, PI * 2, k, 7);
      linea(c, [[20, 70], [80, 70]], 6, k);
    },
    cadena: function (c, k) {
      c.save(); c.translate(50, 50); c.rotate(-PI / 4);
      c.beginPath(); c.ellipse(-16, 0, 20, 11, 0, 0, PI * 2); c.lineWidth = 7; c.strokeStyle = k; c.stroke();
      c.beginPath(); c.ellipse(16, 0, 20, 11, 0, 0, PI * 2); c.lineWidth = 7; c.strokeStyle = BLANCO; c.stroke();
      c.restore();
    },
    aliado: function (c, k) {
      poli(c, [[50, 12], [80, 24], [76, 58], [50, 88], [24, 58], [20, 24]], k);
      poli(c, [[45, 32], [55, 32], [55, 44], [67, 44], [67, 54], [55, 54], [55, 66], [45, 66], [45, 54], [33, 54], [33, 44], [45, 44]], BLANCO);
    },
    muro: function (c, k) {
      for (var f = 0; f < 4; f++) {
        for (var i = 0; i < 3; i++) {
          var x = 12 + i * 26 + ((f % 2) ? 13 : 0), y = 16 + f * 18;
          var w = Math.min(24, 88 - x);
          if (w > 4) poli(c, [[x, y], [x + w, y], [x + w, y + 15], [x, y + 15]], (f + i) % 2 ? k : BLANCO);
        }
      }
    },
    relevo: function (c, k) {
      flecha(c, 16, 36, 76, 36, k, 7);
      flecha(c, 84, 64, 24, 64, BLANCO, 7);
    },
    faro: function (c, k) {
      poli(c, [[40, 34], [60, 34], [66, 88], [34, 88]], BLANCO);
      poli(c, [[38, 22], [62, 22], [62, 34], [38, 34]], k);
      poli(c, [[42, 50], [58, 50], [60, 60], [40, 60]], k);
      c.save(); c.globalAlpha = 0.5;
      poli(c, [[62, 24], [96, 12], [96, 40], [62, 32]], '#ffe23a');
      poli(c, [[38, 24], [4, 12], [4, 40], [38, 32]], '#ffe23a');
      c.restore();
    },
    sirena: function (c, k) {
      poli(c, [[32, 36], [68, 36], [74, 70], [26, 70]], k);
      arco(c, 50, 36, 18, PI, PI * 2, k, 1);
      c.beginPath(); c.arc(50, 38, 18, PI, 0); c.fillStyle = k; c.fill();
      poli(c, [[20, 70], [80, 70], [80, 80], [20, 80]], BLANCO);
      arco(c, 50, 38, 32, PI * 1.15, PI * 1.35, BLANCO, 4);
      arco(c, 50, 38, 32, PI * 1.65, PI * 1.85, BLANCO, 4);
    },
    vida: function (c, k) {
      c.beginPath();
      c.moveTo(50, 84);
      c.bezierCurveTo(8, 58, 16, 16, 50, 32);
      c.bezierCurveTo(84, 16, 92, 58, 50, 84);
      c.fillStyle = k;
      c.fill();
      circulo(c, 36, 38, 6, 'rgba(255,255,255,0.7)');
    },
    resurreccion: function (c, k) {
      linea(c, [[12, 84], [88, 84]], 5, BLANCO);
      flecha(c, 50, 80, 50, 22, k, 8);
      c.save(); c.globalAlpha = 0.4;
      circulo(c, 30, 60, 5, k); circulo(c, 70, 52, 5, k); circulo(c, 32, 36, 4, k); circulo(c, 70, 28, 4, k);
      c.restore();
    },
    campo: function (c, k) {
      c.save(); c.globalAlpha = 0.28;
      c.beginPath(); c.arc(50, 76, 40, PI, 0); c.fillStyle = k; c.fill();
      c.restore();
      arco(c, 50, 76, 40, PI, PI * 2, k, 6);
      linea(c, [[6, 76], [94, 76]], 5, k);
      pac(c, 34, 64, 11, BLANCO, 0.6);
      pac(c, 64, 64, 11, BLANCO, 0.6);
    },
    hospital: function (c, k) {
      poli(c, [[14, 14], [86, 14], [86, 86], [14, 86]], k);
      poli(c, [[42, 24], [58, 24], [58, 42], [76, 42], [76, 58], [58, 58], [58, 76], [42, 76], [42, 58], [24, 58], [24, 42], [42, 42]], BLANCO);
    },

    /* --- FANTASMA HUMANO (PAC-MAN VS.) --- */
    embestida: function (c, k) {
      fantasma(c, 58, 50, 26, k);
      linea(c, [[8, 36], [26, 36]], 5, BLANCO);
      linea(c, [[4, 50], [26, 50]], 5, BLANCO);
      linea(c, [[8, 64], [26, 64]], 5, BLANCO);
    },
    acecho: function (c, k) {
      c.save(); c.globalAlpha = 0.45; fantasma(c, 50, 52, 30, k, false); c.restore();
      linea(c, [[32, 48], [44, 48]], 5, BLANCO);
      linea(c, [[56, 48], [68, 48]], 5, BLANCO);
    }
  };

  /* Los del kit de siempre que no tienen dibujo propio van con el del id más
   * parecido del catálogo (así una tecla nunca sale vacía) */
  function generico(c, k) {
    circulo(c, 50, 50, 32, k, 7);
    circulo(c, 50, 50, 10, BLANCO);
  }

  var Iconos = {
    ROLES: ROLES,
    HAB: HAB,

    /* ¿Hay dibujo propio para este poder? (las pruebas lo miran por id) */
    tiene: function (id) { return HAB.hasOwnProperty(id); },

    rol: function (c, id, tam) {
      var info = CFG && CFG.HAB && CFG.HAB.ROL_INFO[id];
      var col = info ? info.color : '#ff66cc';
      c.save();
      c.scale(tam / 100, tam / 100);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      marcoRol(c, col);
      (ROLES[id] || ROLES.asesino)(c, col);
      c.restore();
    },

    hab: function (c, id, tam, color) {
      c.save();
      c.scale(tam / 100, tam / 100);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      try { (HAB[id] || generico)(c, color || '#ff66cc'); } catch (e) { /* un icono roto no tumba la pantalla */ }
      c.setLineDash([]);
      c.restore();
    },

    /* Un <canvas> ya pintado, al doble de resolución para que no se vea
     * borroso en pantallas de alta densidad. tipo: 'rol' | 'hab' */
    lienzo: function (tipo, id, tam, color) {
      if (typeof document === 'undefined') return null;
      var cv = document.createElement('canvas');
      var x = 2;
      cv.width = tam * x;
      cv.height = tam * x;
      cv.style.width = tam + 'px';
      cv.style.height = tam + 'px';
      var c = cv.getContext && cv.getContext('2d');
      if (!c) return cv;
      if (tipo === 'rol') this.rol(c, id, tam * x);
      else this.hab(c, id, tam * x, color);
      return cv;
    },

    /* repintar un lienzo que ya existe (al cambiar de poder o de rol) */
    repintar: function (cv, tipo, id, color) {
      var c = cv && cv.getContext && cv.getContext('2d');
      if (!c) return;
      c.clearRect(0, 0, cv.width, cv.height);
      if (tipo === 'rol') this.rol(c, id, cv.width);
      else this.hab(c, id, cv.width, color);
    }
  };

  window.PM.Iconos = Iconos;
})();
