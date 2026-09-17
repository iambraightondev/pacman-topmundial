/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/insignias.js
 * Las INSIGNIAS de los logros: una medalla por logro, con un dibujo según
 * lo que pide (la cadena de fantasmas, las frutas, el reloj...). Añade
 * Sprites.drawAchIcon(ctx, x, y, r, logro, conseguido).
 *
 * La medalla es la misma para todos (hexágono con aro del color del logro)
 * y lo que cambia es el dibujo de dentro, que sale del contador que mira el
 * logro (`stat`). Los escalones de un mismo tipo (CAZADOR, DEPREDADOR,
 * AZOTE) llevan una, dos o tres muescas abajo. Sin conseguir, todo en gris.
 * ============================================================ */
(function () {
  'use strict';
  window.PM = window.PM || {};
  var CFG = window.PM.CFG;
  var S = window.PM.Sprites;
  if (!S) return;
  var D = CFG.DIR;

  /* escalón del logro dentro de los de su mismo contador y modo: 1, 2, 3 */
  function escalon(a) {
    var lista = (CFG.ACHIEVEMENTS || []).filter(function (x) {
      return x.stat === a.stat && (x.modo || '') === (a.modo || '');
    });
    var i = lista.indexOf(a);
    if (i < 0) {
      for (var k = 0; k < lista.length; k++) if (lista[k].id === a.id) i = k;
    }
    return lista.length > 1 ? Math.max(1, i + 1) : 0;
  }

  function hexagono(c, r) {
    c.beginPath();
    for (var i = 0; i < 6; i++) {
      var ang = Math.PI / 6 + i * Math.PI / 3;
      c[i ? 'lineTo' : 'moveTo'](Math.cos(ang) * r, Math.sin(ang) * r);
    }
    c.closePath();
  }

  /* los dibujos, en una caja de 24 (de -12 a 12) */
  var GLIFOS = {
    /* cadena: tantos fantasmas azules como pide */
    racha: function (c, col, a, on) {
      var n = Math.min(4, a.goal || 2);
      c.save();
      var k = n > 2 ? 0.55 : 0.75;
      c.scale(k, k);
      for (var i = 0; i < n; i++) {
        var x = (i - (n - 1) / 2) * 13;
        S.drawGhost(c, x, 0, D.LEFT, i, on ? 'fright' : 'chase', 0, false);
      }
      c.restore();
    },
    /* fantasmas comidos: un fantasma con la mira encima */
    fantasmas: function (c, col, a, on) {
      c.save(); c.scale(0.9, 0.9);
      S.drawGhost(c, 0, 1, D.LEFT, 0, 'chase', 0, false);
      c.restore();
      c.strokeStyle = col; c.lineWidth = 1.4;
      c.beginPath(); c.arc(0, 1, 9, 0, Math.PI * 2); c.stroke();
      c.beginPath();
      c.moveTo(-11, 1); c.lineTo(-6, 1); c.moveTo(6, 1); c.lineTo(11, 1);
      c.moveTo(0, -10); c.lineTo(0, -5); c.moveTo(0, 7); c.lineTo(0, 12);
      c.stroke();
    },
    /* sin morir: un escudo con la palomita */
    limpios: function (c, col) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(0, -10); c.lineTo(9, -6); c.lineTo(8, 3);
      c.quadraticCurveTo(6, 8, 0, 11); c.quadraticCurveTo(-6, 8, -8, 3);
      c.lineTo(-9, -6); c.closePath(); c.fill();
      c.strokeStyle = '#000'; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-4, 0); c.lineTo(-1, 4); c.lineTo(5, -4); c.stroke();
    },
    /* frutas: la cereza de la máquina */
    frutas: function (c) {
      c.save(); c.scale(1.2, 1.2);
      S.drawFruit(c, 0, 0, 0);
      c.restore();
    },
    /* partidas: el mando de la recreativa */
    partidas: function (c, col) {
      c.fillStyle = '#2121ff'; c.fillRect(-10, 4, 20, 6);
      c.fillStyle = '#9a9ab8'; c.fillRect(-1, -4, 2, 9);
      c.fillStyle = col; c.beginPath(); c.arc(0, -6, 4.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ff2a2a'; c.beginPath(); c.arc(6, 3, 2, 0, Math.PI * 2); c.fill();
    },
    /* nivel alcanzado: la bandera en lo alto de la escalera */
    nivelMax: function (c, col) {
      c.fillStyle = '#2121ff';
      c.fillRect(-11, 6, 22, 4); c.fillRect(-5, 1, 16, 5); c.fillRect(1, -4, 10, 5);
      c.fillStyle = '#ddd'; c.fillRect(5, -12, 1.5, 9);
      c.fillStyle = col;
      c.beginPath(); c.moveTo(6.5, -12); c.lineTo(12, -9.5); c.lineTo(6.5, -7); c.closePath(); c.fill();
    },
    /* puntos en una partida: la copa */
    puntosMax: function (c, col) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(-7, -9); c.lineTo(7, -9); c.lineTo(6, -1);
      c.quadraticCurveTo(0, 5, -6, -1); c.closePath(); c.fill();
      c.fillRect(-1.5, 2, 3, 5); c.fillRect(-6, 7, 12, 3);
      c.strokeStyle = col; c.lineWidth = 1.6;
      c.beginPath(); c.arc(-8, -5, 3, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
      c.beginPath(); c.arc(8, -5, 3, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
    },
    /* contrarreloj: el rayo */
    mejorT1: function (c, col) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(3, -12); c.lineTo(-7, 2); c.lineTo(-1, 2); c.lineTo(-4, 12);
      c.lineTo(7, -3); c.lineTo(1, -3); c.closePath(); c.fill();
    },
    /* retos del daily: el calendario */
    dailyOk: function (c, col, a, on) { calendario(c, col, '✓'); },
    dailyRacha: function (c, col) { calendario(c, col, '7'); },
    dailySemana: function (c, col) { calendario(c, col, '▦'); },
    /* cazas llevando fantasma: el fantasma con el Pac-Man atrapado */
    cazas: function (c, col, a, on) {
      c.save(); c.scale(0.8, 0.8);
      S.drawPacman(c, -6, 3, D.RIGHT, 2, on ? '#ffff00' : '#777', 'clasico', {});
      S.drawGhost(c, 6, -2, D.LEFT, 0, 'chase', 0, false);
      c.restore();
    },
    /* mordiscos: la dentellada */
    mordiscos: function (c, col) {
      S.drawPacman(c, 0, 0, D.RIGHT, 0, col, 'clasico', {});
      try { S.drawPacTeeth(c, 0, 0, D.RIGHT, 0, col); } catch (e) { }
    },
    /* muros atravesados: la pared y el destello que la cruza */
    muros: function (c, col) {
      c.fillStyle = '#2121ff'; c.fillRect(-2, -11, 4, 22);
      c.fillStyle = col;
      c.beginPath(); c.moveTo(-12, 0); c.lineTo(-4, -5); c.lineTo(-4, 5); c.closePath(); c.fill();
      c.globalAlpha = 0.5; c.fillRect(-4, -1.5, 8, 3); c.globalAlpha = 1;
      c.beginPath(); c.moveTo(12, 0); c.lineTo(4, -5); c.lineTo(4, 5); c.closePath(); c.fill();
    }
  };

  function calendario(c, col, marca) {
    c.fillStyle = '#ddd'; c.fillRect(-9, -8, 18, 18);
    c.fillStyle = col; c.fillRect(-9, -8, 18, 5);
    c.fillStyle = '#555'; c.fillRect(-6, -11, 2, 5); c.fillRect(4, -11, 2, 5);
    c.fillStyle = '#000';
    c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(marca, 0, 4);
  }

  /* CACERÍA usa `puntosMax` para contar cazas en una partida: se dibuja
   * como una caza, no como una copa */
  function glifoDe(a) {
    if (a.modo === 'caza') return GLIFOS.cazas;
    return GLIFOS[a.stat] || null;
  }

  S.drawAchIcon = function (ctx, x, y, r, a, hecho) {
    if (!a) { S.drawAchStar(ctx, x, y, r * 0.8, '#ffff00'); return; }
    var col = hecho ? (a.color || '#ffff00') : '#4a4a5e';
    var k = r / 12;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    // la medalla
    hexagono(ctx, 12);
    ctx.fillStyle = hecho ? '#0a0a22' : '#08080f';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = col;
    ctx.stroke();
    hexagono(ctx, 10.2);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = hecho ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.06)';
    ctx.stroke();
    // el dibujo
    var g = glifoDe(a);
    ctx.save();
    ctx.scale(0.74, 0.74);
    ctx.translate(0, -1.5);
    if (!hecho) ctx.globalAlpha = 0.5;
    try {
      if (g) g(ctx, col, a, hecho);
      else S.drawAchStar(ctx, 0, 0, 9, col);
    } catch (e) { S.drawAchStar(ctx, 0, 0, 9, col); }
    ctx.restore();
    // las muescas del escalón
    var n = escalon(a);
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc((i - (n - 1) / 2) * 3.4, 8.6, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
})();
