/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/sprites.js
 * Dibujo procedural de sprites (sin recursos externos).
 * Define window.PM.Sprites
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var Sprites = {};

  /* Ángulo central de cada dirección (radianes) */
  var DIR_ANGLE = [
    -Math.PI / 2,  // UP
    Math.PI,       // LEFT
    Math.PI / 2,   // DOWN
    0              // RIGHT
  ];

  /* ------------------------------------------------------------
   * Pac-Man: arco relleno con 3 fases de boca
   * mouthPhase: 0 cerrada, 1 media (40°), 2 abierta (80°)
   * skin (opcional): id de CFG.SKINS; por defecto 'clasico'
   * ------------------------------------------------------------ */
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

  /* ¿el punto (px,py), relativo al centro, cae dentro del cuerpo? */
  function inPac(px, py, r, a, half) {
    if (px * px + py * py > r * r) return false;
    if (half <= 0) return true;
    var ang = Math.atan2(py, px) - a;          // ángulo respecto a la boca
    while (ang > Math.PI) ang -= Math.PI * 2;
    while (ang < -Math.PI) ang += Math.PI * 2;
    return Math.abs(ang) > half;               // fuera de la cuña = cuerpo
  }

  Sprites.drawPacman = function (ctx, x, y, dir, mouthPhase, color, skin) {
    var r = 6.5;
    var half = [0, (40 * Math.PI / 180) / 2, (80 * Math.PI / 180) / 2][mouthPhase] || 0;
    var d = (dir >= 0) ? dir : 3;
    var a = DIR_ANGLE[d];
    var v = CFG.DIR_V[d];

    if (skin === 'aro') {
      // solo contorno: un aro con la boca abierta
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      pacPath(ctx, x, y, r - 1, a, half);
      ctx.stroke();
      return;
    }

    if (skin === 'pixel') {
      // cuerpo reconstruido en bloques de 1.5 px (aire retro)
      var step = 1.5;
      ctx.fillStyle = color;
      for (var py = -r; py <= r; py += step) {
        for (var px = -r; px <= r; px += step) {
          if (!inPac(px + step / 2, py + step / 2, r, a, half)) continue;
          ctx.fillRect(Math.round(x + px), Math.round(y + py), step, step);
        }
      }
      return;
    }

    if (skin === 'sombra') {
      // estela sólida por detrás, en el mismo tono
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color;
      pacPath(ctx, x - v.x * 3, y - v.y * 3, r - 1, a, half);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (skin === 'neon') {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 7;
      ctx.fillStyle = color;
      pacPath(ctx, x, y, r, a, half);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = color;
      pacPath(ctx, x, y, r, a, half);
      ctx.fill();
    }

    if (skin === 'ojos') {
      /* Un ojo en la frente, mirando hacia donde se avanza.
       *
       * Va SIEMPRE en el mismo sitio respecto a la pantalla (arriba yendo en
       * horizontal, a la izquierda yendo en vertical), porque la
       * perpendicular a secas cambia de signo entre ir a la derecha y a la
       * izquierda y el ojo saltaba de la frente a la barbilla.
       *
       * Y va SEPARADO de la boca: antes quedaba tan cerca del eje de avance
       * que, con la boca abierta del todo (±40°), parte del blanco caía
       * dentro de la cuña y el ojo parecía flotar en el hueco de la boca. Se
       * sube a 3 px de perpendicular y se echa 0,6 px hacia atrás, que deja
       * unos 10° de margen con el borde de la boca en las cuatro
       * direcciones, y sigue entrando de sobra en el cuerpo (3,1 + 1,7 de
       * radio contra los 6,5 del Pac-Man). */
      var ox = (v.x !== 0) ? 0 : -1;      // perpendicular fija en pantalla
      var oy = (v.x !== 0) ? -1 : 0;
      var ex = x + ox * 3 - v.x * 0.6;
      var ey = y + oy * 3 - v.y * 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ex + v.x * 0.6, ey + v.y * 0.6, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  /* ------------------------------------------------------------
   * Caras de Pac-Man para los emotes (todo dibujado, sin recursos).
   * Cuerpo del color del jugador y rasgos en negro encima, para que
   * las expresiones se lean incluso a 8 px de casilla.
   * ------------------------------------------------------------ */
  function heart(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.3, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.3, y - s * 0.2, x, y + s * 0.9);
    ctx.closePath();
    ctx.fill();
  }

  /* Gota: punta arriba y panza abajo. Sirve de lágrima y de sudor frío. */
  function drop(ctx, x, y, s, color, alpha) {
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

  /* Destello de cuatro puntas (el chispazo del guiño) */
  function sparkle(ctx, x, y, s, color, alpha) {
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

  /* Cara de emote.
   *
   * `tick` es un contador libre de fotogramas (60/s). Si se pasa, la cara SE
   * MUEVE imitando la emoción: la carcajada rebota, al que llora le caen las
   * lágrimas, el enfadado tiembla y echa humo, el asustado tirita y suda, el
   * guiño se abre y cierra con un chispazo y los corazones laten y se
   * escapan hacia arriba. Sin `tick` se pinta la pose quieta de siempre, que
   * es lo que quieren los avatares del PERFIL y las miniaturas. */
  Sprites.drawPacFace = function (ctx, x, y, r, color, id, tick) {
    var ink = '#000000';
    var vivo = (typeof tick === 'number');
    var t = vivo ? tick : 0;
    var lw = Math.max(1, r * 0.17);

    /* Meneo del conjunto: cada emoción mueve la cabeza a su manera. Se aplica
     * como transformación para que rasgos y añadidos vayan todos juntos. */
    var mx = 0, my = 0, giro = 0, esc = 1;
    if (vivo) {
      if (id === 'risa') {                    // carcajada: rebota y se balancea
        my = -Math.abs(Math.sin(t * 0.26)) * r * 0.16;
        giro = Math.sin(t * 0.13) * 0.11;
      } else if (id === 'llanto') {           // hipidos: se hunde y tirita
        my = r * 0.05 + Math.sin(t * 0.09) * r * 0.09;
        mx = Math.sin(t * 0.62) * r * 0.03;
      } else if (id === 'enfado') {           // temblor de rabia, y se hincha
        mx = Math.sin(t * 1.5) * r * 0.07;
        my = Math.sin(t * 1.9) * r * 0.04;
        esc = 1 + Math.sin(t * 0.2) * 0.05;
      } else if (id === 'susto') {            // tiritona de lado a lado
        mx = Math.sin(t * 0.85) * r * 0.11;
        giro = Math.sin(t * 0.85) * 0.06;
      } else if (id === 'guino') {            // ladeo pícaro
        giro = Math.sin(t * 0.12) * 0.13;
        my = Math.sin(t * 0.24) * r * 0.05;
      } else if (id === 'amor') {             // suspiro: sube y baja despacio
        my = Math.sin(t * 0.11) * r * 0.11;
        esc = 1 + Math.sin(t * 0.21) * 0.04;
      } else {
        my = Math.sin(t * 0.12) * r * 0.07;
      }
    }

    ctx.save();
    if (mx || my || giro || esc !== 1) {
      ctx.translate(x + mx, y + my);
      if (giro) ctx.rotate(giro);
      if (esc !== 1) ctx.scale(esc, esc);
      ctx.translate(-x, -y);
    }

    var ex = r * 0.42;              // separación horizontal de los ojos
    var ey = y - r * 0.26;          // altura de los ojos

    ctx.fillStyle = color || '#ffff00';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;

    function dot(dx, rr) {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x + dx, ey, rr || r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    /* arco de boca: up = sonrisa, !up = mueca hacia abajo */
    function mouthArc(up, wide) {
      var mr = r * (wide ? 0.55 : 0.42);
      var my = y + (up ? r * 0.12 : r * 0.42);
      ctx.beginPath();
      if (up) ctx.arc(x, my, mr, 0.15 * Math.PI, 0.85 * Math.PI);
      else ctx.arc(x, my, mr, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    }
    /* ojo cerrado y curvado (^ = contento, v = triste) */
    function arcEye(dx, up) {
      var er = r * 0.26;
      ctx.beginPath();
      if (up) ctx.arc(x + dx, ey + er * 0.5, er, 1.15 * Math.PI, 1.85 * Math.PI);
      else ctx.arc(x + dx, ey - er * 0.5, er, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    if (id === 'risa') {
      arcEye(-ex, true);
      arcEye(ex, true);
      // boca abierta de carcajada: media luna que se abre y se cierra
      var boca = vivo ? 0.78 + 0.22 * Math.abs(Math.sin(t * 0.26)) : 1;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x, y + r * 0.12, r * 0.56 * boca, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

    } else if (id === 'llanto') {
      arcEye(-ex, false);
      arcEye(ex, false);
      mouthArc(false, false);
      if (!vivo) {
        // pose quieta: los dos lagrimones colgando de los ojos
        drop(ctx, x - ex, ey + r * 0.5, r * 0.2, '#00ffff', 1);
        drop(ctx, x + ex, ey + r * 0.42, r * 0.2, '#00ffff', 1);
      } else {
        /* dos chorros por ojo, desfasados, que nacen en el ojo, caen por la
         * mejilla y se apagan antes de llegar a la barbilla */
        for (var g = 0; g < 4; g++) {
          var lado = (g % 2) ? 1 : -1;
          var ph = ((t * 0.024) + g * 0.27) % 1;
          drop(ctx, x + lado * (ex + ph * r * 0.14),
            ey + r * 0.3 + ph * r * 1.05,
            r * (0.22 - ph * 0.07), '#00ffff', 1 - ph * ph);
        }
      }

    } else if (id === 'enfado') {
      // el sofoco le sube a la cara según tiembla
      if (vivo) {
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.25 * Math.abs(Math.sin(t * 0.2));
        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.arc(x, y + r * 0.25, r * 0.85, Math.PI, 2 * Math.PI, true);
        ctx.fill();
        ctx.restore();
      }
      dot(-ex);
      dot(ex);
      // cejas caídas hacia el centro, que se aprietan a golpes
      var ceja = vivo ? 1 + 0.35 * Math.max(0, Math.sin(t * 0.2)) : 1;
      ctx.beginPath();
      ctx.moveTo(x - ex - r * 0.3, ey - r * 0.5);
      ctx.lineTo(x - ex + r * 0.28, ey - r * 0.18 * ceja);
      ctx.moveTo(x + ex + r * 0.3, ey - r * 0.5);
      ctx.lineTo(x + ex - r * 0.28, ey - r * 0.18 * ceja);
      ctx.stroke();
      mouthArc(false, true);
      // dos humaredas que suben por las orejas y se deshacen
      if (vivo) {
        for (var v = 0; v < 4; v++) {
          var vl = (v % 2) ? 1 : -1;
          var vp = ((t * 0.022) + v * 0.25) % 1;
          ctx.save();
          ctx.globalAlpha = (1 - vp) * 0.6;
          ctx.fillStyle = '#dddddd';
          ctx.beginPath();
          // sube poco: en el globo del emote hay sitio justo por arriba
          ctx.arc(x + vl * (r * 0.78 + vp * r * 0.3),
            y - r * 0.45 - vp * r * 0.68, r * (0.1 + vp * 0.15), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

    } else if (id === 'susto') {
      // ojos muy abiertos, con la pupila disparada de un lado a otro
      var jx = vivo ? Math.sin(t * 0.55) * r * 0.09 : 0;
      var jy = vivo ? Math.sin(t * 0.81) * r * 0.06 : 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - ex, ey, r * 0.27, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + ex, ey, r * 0.27, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x - ex + jx, ey + jy, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + ex + jx, ey + jy, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
      // boca redonda de sorpresa, que se abre a golpes
      var oh = vivo ? 0.8 + 0.35 * Math.abs(Math.sin(t * 0.17)) : 1;
      ctx.beginPath();
      ctx.arc(x, y + r * 0.42, r * 0.22 * oh, 0, Math.PI * 2);
      ctx.fill();
      // gota de sudor frío resbalando por la sien
      if (vivo) {
        var sp = (t * 0.018) % 1;
        drop(ctx, x + r * 0.72 + sp * r * 0.1, y - r * 0.55 + sp * r * 1.2,
          r * (0.2 - sp * 0.06), '#9fe8ff', 1 - sp * sp);
      }

    } else if (id === 'guino') {
      /* el ojo pasa la mayor parte del tiempo guiñado y se abre un momento;
       * al volver a cerrarse suelta el chispazo */
      var ciclo = vivo ? (t % 54) / 54 : 1;
      var abierto = vivo && ciclo > 0.62 && ciclo < 0.86;
      dot(-ex, r * 0.14);
      if (abierto) {
        dot(ex, r * 0.14);
      } else {
        ctx.beginPath();                     // ojo guiñado
        ctx.moveTo(x + ex - r * 0.25, ey);
        ctx.lineTo(x + ex + r * 0.25, ey);
        ctx.stroke();
      }
      mouthArc(true, true);
      if (vivo) {
        // el destello nace justo cuando se cierra y se apaga creciendo
        var chispa = (ciclo >= 0.86) ? (ciclo - 0.86) / 0.14 : -1;
        if (chispa >= 0) {
          sparkle(ctx, x + ex + r * 0.55, ey - r * 0.5,
            r * (0.2 + chispa * 0.35), '#ffffff', 1 - chispa);
        }
      }

    } else if (id === 'amor') {
      // los corazones de los ojos laten, cada uno a su tiempo
      var l1 = vivo ? 1 + 0.28 * Math.abs(Math.sin(t * 0.2)) : 1;
      var l2 = vivo ? 1 + 0.28 * Math.abs(Math.sin(t * 0.2 + 0.6)) : 1;
      heart(ctx, x - ex, ey, r * 0.3 * l1, '#ff0055');
      heart(ctx, x + ex, ey, r * 0.3 * l2, '#ff0055');
      mouthArc(true, false);
      // corazoncitos que se le escapan hacia arriba
      if (vivo) {
        for (var c = 0; c < 3; c++) {
          var cp = ((t * 0.016) + c / 3) % 1;
          ctx.save();
          ctx.globalAlpha = (1 - cp) * 0.9;
          // se escapan hacia arriba sin salirse del globo del emote
          heart(ctx, x + Math.sin(cp * 5 + c * 2) * r * 0.7,
            y - r * 0.5 - cp * r * 0.62, r * 0.16 * (0.6 + cp * 0.7), '#ff5588');
          ctx.restore();
        }
      }

    } else {
      dot(-ex);
      dot(ex);
      mouthArc(true, false);
    }
    ctx.restore();
  };

  /* Globo de emote sobre un Pac-Man.
   *
   * `tick` es el contador de la partida: el globo flota (en píxeles enteros,
   * que si no se emborrona el borde de 1 px) y la cara de dentro se anima
   * sola. Lo que se salga del globo se recorta, para que una lágrima o un
   * corazón no acaben sueltos por el laberinto. */
  Sprites.drawEmote = function (ctx, x, y, emoteId, color, tick) {
    var e = CFG.EMOTES[emoteId];
    if (!e) return;
    var w = 22, h = 20, r = 7;
    var vivo = (typeof tick === 'number');
    var flota = vivo ? Math.round(Math.sin(tick * 0.07) * 1.2) : 0;
    var bx = Math.round(x - w / 2), by = Math.round(y - h) + flota;
    // el globo no se sale del laberinto
    if (bx < 2) bx = 2;
    if (bx + w > CFG.NATIVE_W - 2) bx = CFG.NATIVE_W - 2 - w;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(bx, by, w, h);
    ctx.strokeStyle = color || '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
    // pico hacia el jugador, estirándose con la flotación
    ctx.fillStyle = color || '#ffffff';
    ctx.fillRect(Math.round(x) - 1, by + h, 2, 2 - flota);

    ctx.save();
    ctx.beginPath();
    ctx.rect(bx + 1, by + 1, w - 2, h - 2);
    ctx.clip();
    Sprites.drawPacFace(ctx, bx + w / 2, by + h / 2, r, color || '#ffff00',
      e.id, vivo ? tick : undefined);
    ctx.restore();
  };

  /* ------------------------------------------------------------
   * Cuánta pompa gasta cada maestría, de la más simplona a la más
   * exagerada. La misma animación para las seis dejaba a APRENDIZ con los
   * mismos honores que a TOP MUNDIAL, y subir de rango tiene que NOTARSE:
   * cada escalón añade algo encima del anterior, nunca cambia lo de antes.
   *
   *   forma      silueta de la chapa (ver chapaPath)
   *   giros      medias vueltas de la medalla al subir (0 = sube recta)
   *   subidon    cuánto se pasa de frenada al llegar arriba
   *   chispa     rayos que saltan al plantarse la medalla (0 = ninguno)
   *   brillo     destello que recorre la medalla cada cierto tiempo
   *   onda       anillos que se abren al plantarse
   *   marco      segundo marco alrededor de la chapa
   *   rayos      abanico de rayos girando por detrás
   *   estrellas  chispas en órbita alrededor de la medalla
   *   motas      chispas que caen desde la chapa
   *   letras     el nombre se escribe letra a letra
   *   escudo     blasón detrás de la medalla, que sale por arriba y por abajo
   *   corona     corona sobre la medalla
   *   fogonazo   destello blanco que llena el sitio al plantarse
   *   textoOro   brillo que recorre el nombre
   * ------------------------------------------------------------ */
  /* Silueta de la chapa. A partir de EXPERTO deja de ser un rectángulo: la
   * forma es lo primero que se reconoce de lejos, así que sube de rango con
   * todo lo demás. Se dibuja con el mismo alto y ancho, así que el texto y la
   * medalla no se enteran.
   *
   *   0 recto      · un rectángulo de toda la vida
   *   1 bisel      · esquinas cortadas, como un billete
   *   2 hexágono   · una punta a cada lado
   *   3 banderín   · punta a la izquierda y cola de golondrina a la derecha
   *   4 estandarte · cola de golondrina a los dos lados
   */
  function chapaPath(ctx, x, y, w, h, forma) {
    var m = y + h / 2;
    var p = Math.min(5, w * 0.25);        // cuánto sale (o entra) la punta
    var c = Math.min(3.5, w * 0.25);      // cuánto se corta la esquina
    ctx.beginPath();
    if (forma === 1) {
      ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c);
      ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h);
      ctx.lineTo(x + c, y + h); ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c);
    } else if (forma === 2) {
      ctx.moveTo(x + p, y); ctx.lineTo(x + w - p, y); ctx.lineTo(x + w, m);
      ctx.lineTo(x + w - p, y + h); ctx.lineTo(x + p, y + h); ctx.lineTo(x, m);
    } else if (forma === 3) {
      ctx.moveTo(x + p, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - p, m);
      ctx.lineTo(x + w, y + h); ctx.lineTo(x + p, y + h); ctx.lineTo(x, m);
    } else if (forma === 4) {
      /* banderín con la punta más larga y la cola dentada (dos golondrinas).
       * A la izquierda no se pone cola: ahí va el escudo. */
      ctx.moveTo(x + p * 1.3, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - p, y + h * 0.28);
      ctx.lineTo(x + w, m);
      ctx.lineTo(x + w - p, y + h * 0.72);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + p * 1.3, y + h);
      ctx.lineTo(x, m);
    } else {
      ctx.rect(x, y, w, h);
      return;
    }
    ctx.closePath();
  }

  var POMPA = [
    /* APRENDIZ */ { forma: 0, giros: 0, subidon: 1.2, chispa: 0, brillo: false, onda: 0,
                     marco: false, rayos: 0, estrellas: 0, motas: 0,
                     letras: false, corona: false, fogonazo: false,
                     textoOro: false },
    /* CAZADOR  */ { forma: 0, giros: 2, subidon: 1.8, chispa: 6, brillo: false, onda: 0,
                     marco: false, rayos: 0, estrellas: 0, motas: 0,
                     letras: false, corona: false, fogonazo: false,
                     textoOro: false },
    /* EXPERTO  */ { forma: 1, giros: 4, subidon: 2.5, chispa: 6, brillo: true, onda: 0,
                     marco: false, rayos: 0, estrellas: 0, motas: 0,
                     letras: false, corona: false, fogonazo: false,
                     textoOro: false },
    /* MAESTRO  */ { forma: 2, giros: 4, subidon: 3, chispa: 8, brillo: true, onda: 1,
                     marco: true, rayos: 0, estrellas: 0, motas: 3,
                     letras: false, corona: false, fogonazo: false,
                     textoOro: false },
    /* LEYENDA  */ { forma: 3, giros: 4, subidon: 3.4, chispa: 8, brillo: true, onda: 1,
                     marco: true, rayos: 10, estrellas: 3, motas: 4,
                     letras: true, corona: false, fogonazo: false,
                     textoOro: false },
    /* MUNDIAL  */ { forma: 4, giros: 6, subidon: 4, chispa: 12, brillo: true, onda: 2,
                     marco: true, rayos: 14, estrellas: 5, motas: 6,
                     letras: true, escudo: true, corona: true, fogonazo: true,
                     textoOro: true }
  ];

  /* Etiqueta de maestría sobre un jugador (Ctrl+Espacio).
   *
   * Tiene su propia animación, a propósito distinta del cartel grande del
   * panel MAESTRÍAS (que baja de arriba con rayos girando): aquí la medalla
   * SALE GIRANDO desde la cabeza del jugador, la chapa SE DESPLIEGA hacia su
   * derecha con un chispazo, la medalla brilla mientras se mantiene y al
   * final todo se encoge de vuelta hacia el jugador.
   *
   *   t     — 0 al aparecer, 1 al terminar (si no se pasa, se pinta quieta)
   *   tick  — contador libre, para el brillo y la flotación
   *   rango — escalón de la maestría (0 APRENDIZ … 5 TOP MUNDIAL): manda
   *           cuánta pompa se gasta. Si no se pasa, la de EXPERTO.
   */
  Sprites.drawBadgeTag = function (ctx, x, y, name, color, t, tick, rango) {
    var text = String(name || '');
    color = color || '#888888';
    t = (typeof t === 'number') ? Math.max(0, Math.min(1, t)) : 1;
    tick = tick || 0;
    var P = POMPA[(typeof rango === 'number')
      ? Math.max(0, Math.min(POMPA.length - 1, Math.round(rango))) : 2];

    var SUBE = 0.16;     // hasta aquí: la medalla sube girando
    var ABRE = 0.30;     // hasta aquí: la chapa se despliega
    var CIERRA = 0.86;   // a partir de aquí: se va

    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // hay siluetas que se comen el final de la chapa: la cola de golondrina
    // del banderín (10) y la punta del pedestal (8) piden sitio de más
    // el blasón es más ancho que la medalla: el nombre tiene que arrancar
    // más allá, o la primera letra se le monta encima
    var padL = P.escudo ? 20 : 15, h = 14, r = 4.5;
    var padR = (P.forma === 3) ? 10 : ((P.forma === 4) ? 8 : 6);
    var w = ctx.measureText(text).width + padL + padR;
    var bx = Math.round(x - w / 2), by = Math.round(y - h);
    if (bx < 2) bx = 2;
    if (bx + w > CFG.NATIVE_W - 2) bx = CFG.NATIVE_W - 2 - w;
    // centro de la medalla: empieza sobre el jugador y acaba en su hueco
    var mx = x, my = by + h / 2;

    var salida = (t > CIERRA) ? (t - CIERRA) / (1 - CIERRA) : 0;
    var vis = 1 - salida;
    if (vis <= 0) return;

    /* subida desde el jugador, con un pasito de más al llegar */
    var sube = Math.min(1, t / SUBE);
    var freno = 1 - Math.pow(1 - sube, 3);
    var dy = (1 - freno) * 14 - Math.sin(sube * Math.PI) * P.subidon +
      Math.sin(tick * 0.11) * 0.7 + salida * 12;

    ctx.save();
    ctx.globalAlpha = vis;
    // al irse, se encoge hacia el jugador
    if (salida > 0) {
      ctx.translate(x, y);
      ctx.scale(1 - salida * 0.5, 1 - salida * 0.5);
      ctx.translate(-x, -y);
    }
    ctx.translate(0, -dy);

    /* La medalla sube CENTRADA sobre el jugador y se corre a su hueco de la
     * izquierda mientras la chapa crece a partir de ella. */
    var abre = (t <= SUBE) ? 0
      : Math.min(1, (t - SUBE) / (ABRE - SUBE));
    abre = 1 - Math.pow(1 - abre, 3);
    mx = Math.round(x + (bx + 8 - x) * abre);
    var lx = mx - 8;                       // borde izquierdo de la chapa

    var i, a;
    var abierta = (t > ABRE && t < CIERRA);

    /* LEYENDA y TOP MUNDIAL: abanico de rayos girando POR DETRÁS. Va lo
     * primero para que la chapa (de fondo casi opaco) los tape por delante y
     * sólo asomen alrededor de la medalla. */
    if (P.rayos && t > SUBE) {
      var fuerza = Math.min(1, (t - SUBE) / 0.2);
      ctx.save();
      ctx.globalAlpha = vis * fuerza * 0.4;
      ctx.fillStyle = color;
      ctx.translate(mx, my);
      ctx.rotate(tick * 0.025);
      for (i = 0; i < P.rayos; i++) {
        ctx.rotate(Math.PI * 2 / P.rayos);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(16, -1.3);
        ctx.lineTo(16, 1.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    var aw = Math.round(w * abre);
    if (aw > 2) {
      chapaPath(ctx, lx, by, aw, h, P.forma);
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      // el medio píxel es lo que deja la línea limpia en pantalla
      chapaPath(ctx, lx + 0.5, by + 0.5, aw - 1, h - 1, P.forma);
      ctx.stroke();
      /* de MAESTRO para arriba, un segundo marco que respira */
      if (P.marco && abre > 0.9) {
        ctx.save();
        ctx.globalAlpha = vis * (0.45 + 0.25 * Math.sin(tick * 0.13));
        chapaPath(ctx, lx - 1.5, by - 1.5, aw + 3, h + 3, P.forma);
        ctx.stroke();
        ctx.restore();
      }
      // pico hacia el jugador, solo con la chapa ya abierta. El escudo no lo
      // lleva: su punta de abajo ya apunta al jugador.
      if (abre > 0.6 && P.forma !== 4) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x) - 1, by + h, 2, 2);
      }
      // el nombre aparece recortado por el borde de la chapa; de LEYENDA
      // para arriba, además, se escribe letra a letra
      var texto = text;
      if (P.letras) {
        var esc = Math.max(0, Math.min(1, (t - ABRE) / 0.18));
        texto = text.slice(0, Math.ceil(text.length * esc));
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx, by, aw - 2, h);
      ctx.clip();
      ctx.fillStyle = color;
      ctx.fillText(texto, lx + padL, my + 0.5);
      /* TOP MUNDIAL: un brillo recorre el nombre cada tanto */
      if (P.textoOro && abierta) {
        var fo = (tick % 70) / 70;
        if (fo < 0.5) {
          ctx.globalAlpha = vis * 0.5;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(lx + fo * 2 * (aw + 10) - 5, by, 3, h);
        }
      }
      ctx.restore();
    }

    /* TOP MUNDIAL: blasón detrás de la medalla. Es lo que remata la silueta:
     * el banderín se queda de cinta y la medalla pasa a ir montada en un
     * escudo que sale por arriba y por abajo de la chapa. Se despliega con
     * ella, así que no aparece de golpe. */
    if (P.escudo && abre > 0.05) {
      ctx.save();
      ctx.translate(mx, my);
      ctx.scale(abre, abre);
      ctx.translate(-mx, -my);
      ctx.beginPath();
      ctx.moveTo(mx - 8.5, my - 9);
      ctx.lineTo(mx + 8.5, my - 9);
      ctx.lineTo(mx + 8.5, my + 3);
      ctx.lineTo(mx + 4.5, my + 8);
      ctx.lineTo(mx, my + 11);
      ctx.lineTo(mx - 4.5, my + 8);
      ctx.lineTo(mx - 8.5, my + 3);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.92)';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    /* ondas que se abren al plantarse la medalla (de MAESTRO para arriba) */
    for (i = 0; i < P.onda; i++) {
      var ot = (t - SUBE - i * 0.07) / 0.3;
      if (ot > 0 && ot < 1) {
        ctx.save();
        ctx.globalAlpha = vis * (1 - ot) * 0.75;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mx, my, r + ot * 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    /* TOP MUNDIAL: fogonazo blanco en el momento de plantarse */
    if (P.fogonazo) {
      var fg = (t - SUBE) / 0.1;
      if (fg > 0 && fg < 1) {
        ctx.save();
        ctx.globalAlpha = vis * (1 - fg) * 0.85;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mx, my, 3 + fg * 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /* chispazo al plantarse la medalla (APRENDIZ no lo tiene) */
    var chispa = (t < SUBE) ? 0 : Math.min(1, (t - SUBE) / 0.14);
    if (P.chispa && chispa > 0 && chispa < 1) {
      ctx.save();
      ctx.globalAlpha = vis * (1 - chispa);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (i = 0; i < P.chispa; i++) {
        a = i * Math.PI * 2 / P.chispa + 0.4;
        var r0 = r + 1 + chispa * 5, r1 = r0 + 3;
        ctx.moveTo(mx + Math.cos(a) * r0, my + Math.sin(a) * r0);
        ctx.lineTo(mx + Math.cos(a) * r1, my + Math.sin(a) * r1);
      }
      ctx.stroke();
      ctx.restore();
    }

    /* la medalla: girando mientras sube (cuantos más giros, más rango),
     * quieta y con brillo después */
    var giro = (t < SUBE && P.giros)
      ? Math.cos(sube * Math.PI * P.giros) : 1;
    var ancho = Math.max(0.18, Math.abs(giro));
    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(ancho, 1);
    ctx.translate(-mx, -my);
    // con rayos detrás, la medalla lleva su propio halo para no perderse
    if (P.rayos) { ctx.shadowColor = color; ctx.shadowBlur = 5; }
    if (giro < 0) {
      // de canto se ve el reverso: disco liso, sin el Pac-Man
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, r * 0.22);
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      Sprites.drawBadge(ctx, mx, my, r, color, false);
    }
    ctx.restore();

    /* TOP MUNDIAL: corona sobre la medalla */
    if (P.corona && t > SUBE) {
      // con blasón, la corona se sube a rematarlo
      var cy = P.escudo ? (my - 9) : (my - r - 1.5);
      ctx.save();
      ctx.globalAlpha = vis * Math.min(1, (t - SUBE) / 0.12);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(mx - 3.5, cy);
      ctx.lineTo(mx - 3.5, cy - 3.6);
      ctx.lineTo(mx - 1.7, cy - 1.8);
      ctx.lineTo(mx, cy - 4.6);
      ctx.lineTo(mx + 1.7, cy - 1.8);
      ctx.lineTo(mx + 3.5, cy - 3.6);
      ctx.lineTo(mx + 3.5, cy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    /* estrellas en órbita alrededor de la medalla (LEYENDA para arriba) */
    if (P.estrellas && t > SUBE) {
      ctx.save();
      ctx.globalAlpha = vis * Math.min(1, (t - SUBE) / 0.2);
      ctx.fillStyle = '#ffffff';
      for (i = 0; i < P.estrellas; i++) {
        a = tick * 0.06 + i * Math.PI * 2 / P.estrellas;
        var ex = mx + Math.cos(a) * 8.5, ey2 = my + Math.sin(a) * 3.5;
        var es = 0.75 + 0.45 * Math.sin(a);      // más grande la de delante
        ctx.beginPath();
        ctx.moveTo(ex, ey2 - 1.7 * es);
        ctx.lineTo(ex + 0.6 * es, ey2);
        ctx.lineTo(ex, ey2 + 1.7 * es);
        ctx.lineTo(ex - 0.6 * es, ey2);
        ctx.closePath();
        ctx.moveTo(ex - 1.7 * es, ey2);
        ctx.lineTo(ex, ey2 - 0.6 * es);
        ctx.lineTo(ex + 1.7 * es, ey2);
        ctx.lineTo(ex, ey2 + 0.6 * es);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    /* chispas que caen desde la chapa (MAESTRO para arriba) */
    if (P.motas && abierta && aw > 2) {
      ctx.save();
      ctx.fillStyle = color;
      for (i = 0; i < P.motas; i++) {
        var ci = ((tick * 0.03) + i / P.motas) % 1;
        ctx.globalAlpha = vis * (1 - ci) * 0.8;
        ctx.fillRect(lx + ((i + 0.5) / P.motas) * aw, by + h + ci * 9, 1, 1.5);
      }
      ctx.restore();
    }

    /* destello que recorre la medalla de vez en cuando */
    if (P.brillo && abierta) {
      var fase = (tick % 80) / 80;
      if (fase < 0.35) {
        var d = (fase / 0.35) * (r * 4) - r * 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, r - 0.5, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = vis * 0.7;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(mx + d - 2, my - r);
        ctx.lineTo(mx + d + 2, my + r);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  };

  /* ------------------------------------------------------------
   * Cartel animado de maestría. Se dibuja aquí (y no en game.js) para
   * poder enseñarlo también fuera de la partida, en el panel MAESTRÍAS.
   *   t    — 0 al aparecer, 1 al terminar
   *   tick — contador libre, para el latido y el giro de los rayos
   * ------------------------------------------------------------ */
  Sprites.drawBadgeBanner = function (ctx, cx, cy, w, h, t, info, tick) {
    var color = info.color || '#ffffff';
    var ent = Math.min(1, t / 0.15);            // entrada
    var sal = Math.min(1, (1 - t) / 0.15);      // salida
    var vis = Math.min(ent, sal);
    if (vis <= 0) return;

    // rebote: se pasa un poco y vuelve a su sitio
    var over = (ent < 1) ? (1 - Math.pow(1 - ent, 3)) : 1;
    var slide = (1 - over) * -40;
    var scale = 0.85 + 0.15 * over +
      (ent >= 1 ? 0 : 0.06 * Math.sin(ent * Math.PI));

    ctx.save();
    ctx.globalAlpha = vis;
    ctx.translate(cx, cy + slide);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - w / 2 + 1, cy - h / 2 + 1, w - 2, h - 2);

    // rayos girando detrás de la medalla
    var mx = cx - w / 2 + 24, my = cy;
    ctx.save();
    ctx.globalAlpha = vis * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < 12; i++) {
      var a = tick * 0.04 + i * Math.PI / 6;
      ctx.moveTo(mx + Math.cos(a) * 11, my + Math.sin(a) * 11);
      ctx.lineTo(mx + Math.cos(a) * 17, my + Math.sin(a) * 17);
    }
    ctx.stroke();
    ctx.restore();

    // medalla con latido
    Sprites.drawBadge(ctx, mx, my, 9 * (1 + 0.12 * Math.sin(tick * 0.18)),
      color, false);

    var tx = cx + 14;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      (info.nueva === false ? 'MAESTRÍA DE ' : '¡NUEVA MAESTRÍA DE ') +
      (info.mode || 'SOLO') + '!', tx, cy - 11);

    // el nombre entra creciendo, un poco después que el cartel
    var nameIn = Math.min(1, Math.max(0, (t - 0.10) / 0.15));
    ctx.save();
    ctx.translate(tx, cy + 4);
    ctx.scale(0.6 + 0.4 * nameIn, 0.6 + 0.4 * nameIn);
    ctx.globalAlpha = vis * nameIn;
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = color;
    ctx.fillText(info.name || '', 0, 0);
    ctx.restore();

    // destello que recorre el cartel una sola vez
    var brillo = (t > 0.2 && t < 0.55) ? (t - 0.2) / 0.35 : -1;
    if (brillo >= 0) {
      ctx.globalAlpha = vis * 0.35 * Math.sin(brillo * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - w / 2 + brillo * w - 5, cy - h / 2 + 2, 10, h - 4);
    }
    ctx.restore();
  };

  /* Medalla de maestría: disco con el aro del color de la insignia */
  Sprites.drawBadge = function (ctx, x, y, r, color, locked) {
    ctx.fillStyle = locked ? '#161616' : '#000000';
    ctx.strokeStyle = locked ? '#444444' : color;
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Pac-Man dentro
    var pr = r * 0.55;
    ctx.fillStyle = locked ? '#444444' : color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, pr, 0.55, -0.55 + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  };

  /* Animación de muerte: la boca se abre más allá de 180° hasta desaparecer.
   * t en [0,1]. */
  Sprites.drawPacmanDeath = function (ctx, x, y, t, color) {
    var r = 6.5;
    if (t >= 1) return;
    // la apertura crece de 80° a 360° (mirando hacia arriba)
    var open = (80 + 280 * t) * Math.PI / 180;
    var half = open / 2;
    var a = -Math.PI / 2; // hacia arriba, como el arcade
    if (open >= Math.PI * 2 - 0.05) {
      // resto: chispa final
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var ang = i * Math.PI / 4;
        ctx.moveTo(x + Math.cos(ang) * 2, y + Math.sin(ang) * 2);
        ctx.lineTo(x + Math.cos(ang) * 5, y + Math.sin(ang) * 5);
      }
      ctx.stroke();
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, a + half, a - half + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  };

  /* ------------------------------------------------------------
   * Fantasma: cúpula + falda ondulada de 3 picos, ojos con pupilas
   * mode: 'normal' | 'fright' | 'eyes'
   * animPhase: 0|1 (falda), flashOn: true => cuerpo blanco
   * ------------------------------------------------------------ */
  Sprites.drawGhost = function (ctx, x, y, dir, ghostId, mode, animPhase, flashOn) {
    var r = 6.5;
    var top = y - r + 1;
    var left = x - r;
    var w = r * 2;
    var bottom = y + r - 1;
    var body, face;

    if (mode === 'fright') {
      body = flashOn ? CFG.COLORS.flashBody : CFG.COLORS.frightBody;
      face = flashOn ? CFG.COLORS.flashFace : CFG.COLORS.frightFace;
    } else {
      body = CFG.GHOSTS[ghostId].color;
    }

    if (mode !== 'eyes') {
      ctx.fillStyle = body;
      ctx.beginPath();
      // cúpula
      ctx.moveTo(left, bottom);
      ctx.lineTo(left, y);
      ctx.arc(x, y, r, Math.PI, 0, false);
      ctx.lineTo(left + w, bottom);
      // falda: 3 picos, 2 fotogramas alternos
      var n = 3;
      var seg = w / n;
      var i, px;
      if (animPhase === 0) {
        for (i = n - 1; i >= 0; i--) {
          px = left + i * seg;
          ctx.lineTo(px + seg / 2, bottom - 3);
          ctx.lineTo(px, bottom);
        }
      } else {
        ctx.lineTo(left + w, bottom - 3);
        for (i = n - 1; i >= 0; i--) {
          px = left + i * seg;
          ctx.lineTo(px + seg * 0.66, bottom);
          ctx.lineTo(px + seg * 0.33, bottom - 3);
        }
        ctx.lineTo(left, bottom);
      }
      ctx.closePath();
      ctx.fill();
    }

    if (mode === 'fright') {
      // cara asustada: ojos de punto + boca en zigzag
      ctx.fillStyle = face;
      ctx.fillRect(x - 4, y - 2, 2, 2);
      ctx.fillRect(x + 2, y - 2, 2, 2);
      ctx.strokeStyle = face;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 4);
      for (var k = 0; k < 5; k++) {
        ctx.lineTo(x - 5 + (k * 2.5) + 1.25, y + 3 + ((k % 2) ? 0 : 2) - 1);
      }
      ctx.stroke();
      return;
    }

    // Ojos (normal y modo ojos): esclerótica + pupila hacia dir
    var v = CFG.DIR_V[dir >= 0 ? dir : 1];
    var exOff = v.x * 1.5, eyOff = v.y * 1.5;
    var eyeY = y - 2 + (v.y < 0 ? -1 : 0);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - 3 + exOff * 0.5, eyeY, 2.2, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 3 + exOff * 0.5, eyeY, 2.2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2121ff';
    ctx.beginPath();
    ctx.arc(x - 3 + exOff, eyeY + eyOff, 1.2, 0, Math.PI * 2);
    ctx.arc(x + 3 + exOff, eyeY + eyOff, 1.2, 0, Math.PI * 2);
    ctx.fill();
  };

  /* ------------------------------------------------------------
   * Frutas: arte de matriz de píxeles ~14×14 (original)
   * Leyenda por fruta: cada letra un color; '.' transparente
   * ------------------------------------------------------------ */
  var FRUIT_PAL = {
    r: '#ff0000', R: '#d40000', g: '#00aa00', G: '#007700',
    y: '#ffff00', o: '#ff8c00', w: '#ffffff', t: '#deaa50',
    p: '#ffb8ae', P: '#ff9080', b: '#2121ff', c: '#00ffff',
    m: '#b19cd9', k: '#00b0b0', s: '#f0f0f0'
  };

  var FRUITS = [
    /* 0 cereza */
    [
      '..........gg..',
      '.........gg...',
      '.......gg.....',
      '...G.gg.......',
      '...Gg.........',
      '..G.G.........',
      '.rrrG....rr...',
      'rrrrr...rrrr..',
      'rrrrr..rrrrrr.',
      'rwrrr..rrrrrr.',
      'rrrrr..rwrrrr.',
      '.rrr...rrrrrr.',
      '........rrrr..',
      '..............'
    ],
    /* 1 fresa */
    [
      '......gg......',
      '....gggggg....',
      '..rrrgggrrr...',
      '.rrrrrgrrrrr..',
      '.rrwrrrrrwrr..',
      '.rrrrrwrrrrr..',
      '.rwrrrrrrwrr..',
      '.rrrrwrrrrrr..',
      '..rrrrrrwrr...',
      '..rwrrrrrrr...',
      '...rrrwrrr....',
      '....rrrrr.....',
      '.....rrr......',
      '......r.......'
    ],
    /* 2 melocotón */
    [
      '.........gg...',
      '.......ggg....',
      '......gg......',
      '...oooGoooo...',
      '..oooooooooo..',
      '.oooooooooooo.',
      '.oopoooooooog.',
      '.opooooooooo..',
      '.oooooooooooo.',
      '.oooooooooooo.',
      '..oooooooooo..',
      '...oooooooo...',
      '....oooooo....',
      '..............'
    ],
    /* 3 manzana */
    [
      '.......G......',
      '......G.......',
      '.....GG.......',
      '..rrrGrrrr....',
      '.rrrrrrrrrr...',
      'rrrrrrrrrrrr..',
      'rrwrrrrrrrrr..',
      'rwrrrrrrrrrr..',
      'rrrrrrrrrrrr..',
      'rrrrrrrrrrrr..',
      '.rrrrrrrrrr...',
      '.rrrr..rrrr...',
      '..rr....rr....',
      '..............'
    ],
    /* 4 uvas */
    [
      '......GG......',
      '....GGGGGG....',
      '...G..GG......',
      '.....mmmm.....',
      '....mmmmmm....',
      '...mmwmmmmm...',
      '..mmmmmmmmmm..',
      '..mwmmmmwmmm..',
      '..mmmmmmmmmm..',
      '...mmwmmmmm...',
      '....mmmmmm....',
      '.....mmmm.....',
      '......mm......',
      '..............'
    ],
    /* 5 galaxian (insignia) */
    [
      '..............',
      'yyy.........y.',
      '.yyyy....yyyy.',
      '..yyyyyyyyy...',
      '...ryyyyyr....',
      '...rryyyrr....',
      '....rryrr.....',
      '.....rrr......',
      '..b...r...b...',
      '..bb..r..bb...',
      '...bb.r.bb....',
      '....bbrbb.....',
      '.....brb......',
      '......b.......'
    ],
    /* 6 campana */
    [
      '......yy......',
      '.....yyyy.....',
      '....yyyyyy....',
      '...yyyyyyyy...',
      '...yywyyyyy...',
      '..yywyyyyyyy..',
      '..yyyyyyyyyy..',
      '..yyyyyyyyyy..',
      '.yyyyyyyyyyyy.',
      '.yyyyyyyyyyyy.',
      'yyyyyyyyyyyyyy',
      'ssssssssssssss',
      '.....sscc.....',
      '..............'
    ],
    /* 7 llave */
    [
      '.....ccc......',
      '....cc.cc.....',
      '....cc.cc.....',
      '.....ccc......',
      '......s.......',
      '......s.......',
      '......ss......',
      '......s.......',
      '......ss......',
      '......s.......',
      '......ss......',
      '......ss......',
      '..............',
      '..............'
    ]
  ];

  /* Dibuja fruta con centro en (x, y) */
  Sprites.drawFruit = function (ctx, x, y, fruitId) {
    var art = FRUITS[fruitId];
    if (!art) return;
    var ox = Math.round(x - 7), oy = Math.round(y - 7);
    for (var r = 0; r < art.length; r++) {
      var line = art[r];
      for (var c = 0; c < line.length; c++) {
        var ch = line.charAt(c);
        if (ch === '.') continue;
        ctx.fillStyle = FRUIT_PAL[ch] || '#ffffff';
        ctx.fillRect(ox + c, oy + r, 1, 1);
      }
    }
  };

  /* Estrella de N puntas, para los logros */
  function star(ctx, x, y, r, puntas) {
    ctx.beginPath();
    for (var i = 0; i < puntas * 2; i++) {
      var rr = (i % 2 === 0) ? r : r * 0.45;
      var a = -Math.PI / 2 + i * Math.PI / puntas;
      var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /* La misma estrella, suelta: la usa el resumen del final de la partida */
  Sprites.drawAchStar = function (ctx, x, y, r, color) {
    ctx.fillStyle = color || '#ffff00';
    star(ctx, x, y, r, 5);
    ctx.fill();
  };

  /* ------------------------------------------------------------
   * Aviso de logro conseguido. Deliberadamente distinto del cartel de
   * maestría: una banda estrecha que entra deslizándose desde la derecha,
   * con una estrella girando y el nombre + la condición. Así, si caen los
   * dos a la vez, se distinguen de un vistazo.
   *   t    — 0 al aparecer, 1 al terminar
   *   info — { name, desc, color }
   * ------------------------------------------------------------ */
  Sprites.drawAchNotice = function (ctx, cx, cy, w, t, info, tick) {
    var color = info.color || '#ffff00';
    var h = 20;
    var ent = Math.min(1, t / 0.14);
    var sal = Math.min(1, (1 - t) / 0.14);
    var vis = Math.min(ent, sal);
    if (vis <= 0) return;

    var desliz = (1 - (1 - Math.pow(1 - ent, 3))) * (w / 2 + 30);
    var x0 = cx - w / 2 + desliz;

    ctx.save();
    ctx.globalAlpha = vis;

    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(x0, cy - h / 2, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, cy - h / 2 + 0.5, w - 1, h - 1);

    // estrella girando a la izquierda de la banda
    var sx = x0 + 13;
    ctx.save();
    ctx.translate(sx, cy);
    ctx.rotate(tick * 0.05);
    ctx.fillStyle = color;
    star(ctx, 0, 0, 7, 5);
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 6px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('¡LOGRO!', x0 + 25, cy - 5);
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = color;
    ctx.fillText(String(info.name || ''), x0 + 25, cy + 4);

    // la condición, a la derecha y pequeñita, si cabe
    ctx.font = '5px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'right';
    var d = String(info.desc || '');
    if (ctx.measureText(d).width < w - 110) ctx.fillText(d, x0 + w - 6, cy + 4);

    ctx.restore();
  };

  /* ------------------------------------------------------------
   * Avatares del perfil. No hay imágenes: se reaprovechan los propios
   * sprites del juego (Pac-Man, sus caras, los fantasmas, las frutas y la
   * medalla), escalados al radio que se pida. Todos miden ~7 px de radio
   * nativo, así que basta con un factor r/7.
   *   id    — CFG.AVATARS[].id
   *   color — color del jugador, para los que lo usan
   * ------------------------------------------------------------ */
  Sprites.drawAvatar = function (ctx, x, y, r, id, color) {
    var info = null;
    for (var i = 0; i < CFG.AVATARS.length; i++) {
      if (CFG.AVATARS[i].id === id) { info = CFG.AVATARS[i]; break; }
    }
    if (!info) info = CFG.AVATARS[0];
    color = color || '#ffff00';

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r / 7, r / 7);
    switch (info.kind) {
      case 'face':
        Sprites.drawPacFace(ctx, 0, 0, 6.5, color, info.arg);
        break;
      case 'ghost':
        Sprites.drawGhost(ctx, 0, 0, CFG.DIR.RIGHT, info.arg, 'normal', 0, false);
        break;
      case 'fright':
        Sprites.drawGhost(ctx, 0, 0, CFG.DIR.RIGHT, 0, 'fright', 0, false);
        break;
      case 'eyes':
        Sprites.drawGhost(ctx, 0, 0, CFG.DIR.RIGHT, 0, 'eyes', 0, false);
        break;
      case 'fruit':
        Sprites.drawFruit(ctx, 0, 0, info.arg);
        break;
      case 'badge':
        Sprites.drawBadge(ctx, 0, 0, 6.5, color, false);
        break;
      default:
        Sprites.drawPacman(ctx, 0, 0, CFG.DIR.RIGHT, 2, color, 'clasico');
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------
   * Texto de puntuación emergente (cian, pequeño)
   * ------------------------------------------------------------ */
  Sprites.drawScorePopup = function (ctx, x, y, text) {
    ctx.fillStyle = CFG.COLORS.popup;
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), x, y);
  };

  window.PM.Sprites = Sprites;
})();
