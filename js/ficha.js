/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/ficha.js
 * La FICHA de una cosa de la tienda o del vestuario: su escenario.
 * Define window.PM.Ficha
 *
 * Una foto no dice cómo muere una skin ni cuándo salta un efecto, así que
 * la ficha lo enseña en movimiento: un anillo de pasillo del laberinto, a
 * tamaño de partida, donde se repiten en bucle unos MOMENTOS (corriendo,
 * comiéndose un fantasma, con la Q, muriendo). Todo se pinta con las mismas
 * funciones que la partida (Sprites.drawPacman, drawGhost, drawSkinDeath,
 * drawEmote), así que lo que se ve aquí es lo que se verá jugando.
 *
 * Aquí solo está el dibujo. La ventana, los botones y la compra están en
 * js/ui.js (abrirFicha), que llama a Ficha.pintar() en cada fotograma.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var S = CFG.SCALE;

  /* El anillo: dos pasillos largos y dos cortos, con sus cuatro esquinas
   * (CHISPAS salta al girar) y pastillas cada 8 unidades. */
  var W = 190, H = 78;
  var X0 = 20, Y0 = 22, PW = 150, PH = 42, P = 2 * (PW + PH);
  var ESQUINAS = [0, PW, PW + PH, 2 * PW + PH];
  var VEL = 50;                       // unidades por segundo

  function Sp() { return window.PM.Sprites; }

  function anillo(s) {
    s = ((s % P) + P) % P;
    if (s < PW) return { x: X0 + s, y: Y0, d: 3 };
    s -= PW;
    if (s < PH) return { x: X0 + PW, y: Y0 + s, d: 2 };
    s -= PH;
    if (s < PW) return { x: X0 + PW - s, y: Y0 + PH, d: 1 };
    s -= PW;
    return { x: X0, y: Y0 + PH - s, d: 0 };
  }

  /* lo recorrido desde la última esquina */
  function giroDe(s) {
    var v = ((s % P) + P) % P, u = 0;
    for (var e = 0; e < ESQUINAS.length; e++) if (ESQUINAS[e] <= v) u = ESQUINAS[e];
    return v - u;
  }

  function redondo(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* Fondo: negro, las dos paredes del anillo y las pastillas que quedan.
   * `comido` es hasta dónde se ha comido; `energia`, dónde va la grande. */
  function fondo(c, comido, energia) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000';
    c.fillRect(0, 0, W * S, H * S);
    c.setTransform(S, 0, 0, S, 0, 0);
    var lw = 2 / S, gap = 7 + lw / 2;
    c.strokeStyle = CFG.COLORS.wall;
    c.lineWidth = lw;
    redondo(c, X0 - gap, Y0 - gap, PW + 2 * gap, PH + 2 * gap, 4);
    c.stroke();
    redondo(c, X0 + gap, Y0 + gap, PW - 2 * gap, PH - 2 * gap, 1.5);
    c.stroke();
    c.fillStyle = CFG.COLORS.pellet;
    for (var k = 0; k < P / 8; k++) {
      var sp = k * 8 + 4;
      if (sp <= comido) continue;
      var p = anillo(sp);
      c.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    if (energia != null) {
      var q = anillo(energia);
      c.beginPath();
      c.arc(q.x, q.y, 3, 0, Math.PI * 2);
      c.fill();
    }
  }

  /* El personaje con su look, en el punto `s` del anillo */
  function pac(c, look, s, t, color, extra) {
    var p = anillo(s);
    var o = {
      t: t, s: s, giro: giroDe(s),
      back: function (d) { return anillo(s - d); },
      team: [], estira: 1, confeti: -1,
      efecto: look.efecto || null, accesorio: look.accesorio || null
    };
    for (var k in extra) if (extra.hasOwnProperty(k)) o[k] = extra[k];
    var boca = (extra && extra.quieto) ? 1 : [0, 1, 2, 1][Math.floor(t * 14) % 4];
    Sp().drawPacman(c, p.x, p.y, p.d, boca, color, look.skin, o);
    return p;
  }

  /* ---------- los momentos ----------
   * Cada uno pinta el instante `t` (segundos dentro de su bucle) y devuelve
   * dónde está el personaje, para la lupa. */
  var MOMENTOS = {
    correr: {
      name: 'CORRIENDO', dur: P / VEL,
      pinta: function (c, look, t, color) {
        var s = t * VEL;
        fondo(c, s + 2, null);
        var p = pac(c, look, s, t, color, {});
        // un emote se ve en plena partida: sale encima de la cabeza un rato
        if (look.emote && (t % 4) < 2.6) Sp().drawEmote(c, p.x, p.y - 11, look.emote, color, t * 60);
        return p;
      }
    },
    comer: {
      name: 'COMIENDO FANTASMA', dur: 6.5,
      pinta: function (c, look, t, color) {
        var s = t * VEL, ENERGIA = 44, COMIDO = 4;
        fondo(c, s + 2, s < ENERGIA ? ENERGIA : null);
        if (t < COMIDO) {
          var gp = anillo(100 + 25 * t);
          var azul = s >= ENERGIA;
          Sp().drawGhost(c, gp.x, gp.y, gp.d, 0, azul ? 'fright' : 'chase',
            Math.floor(t * 8) % 2, azul && t > 3 && Math.floor(t * 6) % 2 === 0);
        } else if (t < COMIDO + 1) {
          var donde = 100 + 25 * COMIDO;
          var mp = anillo(donde);
          Sp().drawScorePopup(c, mp.x, mp.y - 10, 200);
          var ojos = anillo(donde - (t - COMIDO) * 90);
          Sp().drawGhost(c, ojos.x, ojos.y, 1, 0, 'eyes', 0, false);
        }
        var e = t - COMIDO;
        return pac(c, look, s, t, color, { confeti: (e >= 0 && e < 1.4) ? e : -1 });
      }
    },
    q: {
      name: 'CON LA Q', dur: 3.4,
      pinta: function (c, look, t, color) {
        var s = 20 + t * VEL;
        fondo(c, s + 2, null);
        var gs = 20 + 0.35 * VEL + 11;
        if (t < 0.4) {
          var gp = anillo(gs);
          Sp().drawGhost(c, gp.x, gp.y, 1, 1, 'chase', Math.floor(t * 8) % 2, false);
        } else if (t < 1.4) {
          var mp = anillo(gs);
          Sp().drawScorePopup(c, mp.x, mp.y - 10, 200);
        }
        return pac(c, look, s, t, color, { muerde: t < 0.4, mordio: true, qSeg: t < 1.5 ? t : null });
      }
    },
    morir: {
      name: 'MUERTE', dur: 4,
      pinta: function (c, look, t, color) {
        /* se cruza con BLINKY, se queda helado medio segundo y muere como
         * en la partida: la clásica abre la boca, las demás mueren a su
         * manera (Sprites.drawSkinDeath) */
        var CHOQUE = 1.6, HIELO = 0.5, ANIM = CFG.DEATH_ANIM_TICKS / 60;
        var s = Math.min(t, CHOQUE) * VEL;
        fondo(c, s + 2, null);
        if (t < CHOQUE + HIELO) {
          var gp = anillo(146 - 40 * Math.min(t, CHOQUE));
          Sp().drawGhost(c, gp.x, gp.y, 1, 0, 'chase', Math.floor(t * 8) % 2, false);
          return pac(c, look, s, t, color, t >= CHOQUE ? { quieto: true } : {});
        }
        var d = (t - CHOQUE - HIELO) / ANIM, p = anillo(s);
        if (d <= 1) {
          if (look.skin !== 'clasico' && Sp().drawSkinDeath) Sp().drawSkinDeath(c, p.x, p.y, d, color, look.skin, 3);
          else Sp().drawPacmanDeath(c, p.x, p.y, d, color);
        }
        return p;
      }
    },
    cara: {
      name: 'LA CARA', dur: 4,
      pinta: function (c, look, t, color) {
        fondo(c, -1, null);
        var p = anillo(PW / 2);
        var y = p.y + 6;
        Sp().drawPacman(c, p.x, y, 3, 0, color, look.skin, {
          t: t, team: [], estira: 1, back: function () { return { x: p.x, y: y, d: 3 }; }
        });
        Sp().drawEmote(c, p.x, p.y - 5, look.emote, color, t * 60);
        return { x: p.x, y: p.y };
      }
    }
  };

  /* Qué momentos tiene cada cosa. La Q solo cambia algo en las skins que
   * tienen golpe propio; un accesorio o un efecto no hacen nada con ella. */
  function momentosDe(it) {
    if (!it) return ['correr'];
    if (it.cat === 'emote') return ['cara', 'correr'];
    if (it.cat === 'skin') {
      var Sk = window.PM.Skins;
      var conQ = !!(Sk && ((Sk.Q_TANDA && Sk.Q_TANDA[it.id]) || (Sk.CON_Q && Sk.CON_Q[it.id])));
      return conQ ? ['correr', 'comer', 'q', 'morir'] : ['correr', 'comer', 'morir'];
    }
    return ['correr', 'comer', 'morir'];
  }

  var Ficha = {
    ANCHO: W * S,
    ALTO: H * S,
    MOMENTOS: MOMENTOS,
    momentosDe: momentosDe,

    /* look: { skin, accesorio, efecto, emote }. Devuelve dónde quedó el
     * personaje. Si algo del dibujo falla, la ficha sigue abierta. */
    pintar: function (cv, look, momento, t, color) {
      var m = MOMENTOS[momento] || MOMENTOS.correr;
      var c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      var pos;
      try { pos = m.pinta(c, look, ((t % m.dur) + m.dur) % m.dur, color); }
      catch (e) { pos = { x: W / 2, y: H / 2 }; }
      c.setTransform(1, 0, 0, 1, 0, 0);
      return pos;
    },

    /* La lupa: un recorte alrededor del personaje, ampliado sin suavizar */
    lupa: function (cvLupa, cvEscena, pos) {
      var c = cvLupa.getContext('2d');
      var R = 84;
      var sx = Math.max(0, Math.min(W * S - R, Math.round(pos.x * S - R / 2)));
      var sy = Math.max(0, Math.min(H * S - R, Math.round(pos.y * S - R / 2 - 6)));
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#000';
      c.fillRect(0, 0, cvLupa.width, cvLupa.height);
      c.drawImage(cvEscena, sx, sy, R, R, 0, 0, cvLupa.width, cvLupa.height);
    },

    /* Cuándo se nota, en palabras: lo que la foto no cuenta */
    cuando: function (it) {
      if (!it) return '';
      if (it.cat === 'skin') {
        return it.id === 'clasico' ? 'SIEMPRE. AL MORIR ABRE LA BOCA HASTA DESAPARECER.'
          : (it.id === 'galleta' || it.id === 'bomba') ? 'SIEMPRE. TIENE MUERTE PROPIA.'
          : 'SIEMPRE. AL MORIR GIRA, SE ENCOGE Y ESTALLA EN CHISPAS DE SU COLOR.';
      }
      if (it.id === 'efx_chispas') return 'SOLO AL GIRAR UNA ESQUINA.';
      if (it.id === 'efx_confeti') return 'SOLO AL COMERTE UN FANTASMA.';
      if (it.cat === 'efecto') return 'SIEMPRE QUE TE MUEVES. AL MORIR SE VA CONTIGO.';
      if (it.cat === 'accesorio') return 'SIEMPRE, ENCIMA DE CUALQUIER SKIN. AL MORIR SE VA CONTIGO.';
      return 'CUANDO PULSAS SU TECLA EN LA PARTIDA.';
    }
  };

  window.PM.Ficha = Ficha;
})();
