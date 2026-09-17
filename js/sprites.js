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
  /* Rejilla de la skin PIXEL: 7x7 celdas de 2 px. Impar para que haya fila y
   * columna central y la silueta tenga eje; de dos píxeles porque el bloque
   * tiene que caer entero en la rejilla del juego o el navegador lo difumina
   * y aparecen costuras entre bloque y bloque. Con menos celdas el cuerpo se
   * queda en un octógono y deja de leerse como redondo. */
  var PIX_N = 7, PIX_PASO = 2;
  /* Y la RAYA entre bloque y bloque, que es lo que hace que se lean como
   * píxeles sueltos y no como una mancha con escalones. Es EL estilo de esta
   * skin, no un defecto: en la primera versión salía sola, de rebote, porque
   * los bloques caían a medio píxel y el navegador los difuminaba —de ahí que
   * se viera sucia y con los bordes borrosos—. Ahora se dibuja a mano: un
   * píxel DE PANTALLA de separación, que con los bloques cuadrados a la
   * rejilla cae limpio y no depende de dónde esté Pac-Man.
   *
   * Se mide en píxeles de pantalla y no de casilla porque es una raya: si se
   * midiera en unidades de casilla, a escala grande engordaría hasta comerse
   * el bloque. */
  var PIX_RAYA = 1;

  function inPac(px, py, r, a, half) {
    if (px * px + py * py > r * r) return false;
    if (half <= 0) return true;
    var ang = Math.atan2(py, px) - a;          // ángulo respecto a la boca
    while (ang > Math.PI) ang -= Math.PI * 2;
    while (ang < -Math.PI) ang += Math.PI * 2;
    return Math.abs(ang) > half;               // fuera de la cuña = cuerpo
  }

  /* extra (opcional) es lo que necesitan las skins animadas de js/skins.js:
   *   t        segundos de reloj (en partida, el tick: así un mirón y una
   *            repetición ven lo mismo)
   *   back(d)  punto del camino d px por detrás {x, y, d} (estelas)
   *   estira   cuánto se alarga la estela con la velocidad (1 = normal)
   *   team     colores de los compañeros (ESCUADRA)
   *   muerde   la Q está activa (las extravagantes abren la boca del todo)
   *   icono    dibujo quieto de menú o de vidas: sin estelas
   *   efecto, accesorio   lo puesto de la TIENDA (js/skins.js, dibujarLook)
   * Las seis de siempre se dibujan aquí; el resto las registra js/skins.js
   * en Sprites.ARTE y se desvían antes de tocar nada. */
  Sprites.drawPacman = function (ctx, x, y, dir, mouthPhase, color, skin, extra) {
    if (extra && (extra.efecto || extra.accesorio) && Sprites.dibujarLook) {
      Sprites.dibujarLook(ctx, x, y, dir, mouthPhase, color, skin, extra);
      return;
    }
    if (skin && Sprites.ARTE && Sprites.ARTE.hasOwnProperty(skin) && Sprites.dibujarArte) {
      Sprites.dibujarArte(ctx, x, y, dir, mouthPhase, color, skin, extra);
      return;
    }
    var r = CFG.PAC_R;
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
      /* Cuerpo reconstruido en bloques gordos (aire retro).
       *
       * TRES COSAS lo hacen parecer un Pac-Man y no una mancha, y las tres
       * fallaban en la primera versión:
       *
       * 1) LA REJILLA VA CENTRADA. Antes se recorría de -r a +r a pasos de
       *    1,5, que con r = 6,5 no cae simétrico: el lado izquierdo y el
       *    derecho salían distintos y la silueta no tenía eje. Ahora son
       *    PIX_N celdas impares alrededor del centro, así que lo de arriba
       *    es igual que lo de abajo y la espalda sale redonda de verdad.
       * 2) EL BLOQUE MIDE UN NÚMERO ENTERO de píxeles y se apoya en la
       *    rejilla del juego. Con 1,5 los bordes caían a medio píxel, el
       *    navegador los difuminaba y entre bloque y bloque quedaban costuras
       *    claras: se veía una malla, no un cuerpo.
       * 3) SE MUERDE LA CELDA, NO EL PÍXEL. Se mira el centro de cada celda
       *    contra la cuña de la boca, así que la boca se come bloques enteros
       *    y los labios salen rectos en vez de dentados.
       *
       * Siete celdas de dos píxeles medirían 14 y volverían a rozar los muros
       * (el pasillo deja 14 justos, ver CFG.WALL_INSET), así que la celda se
       * RECORTA al círculo y el recorte se redondea HACIA DENTRO: las cuatro
       * celdas de los extremos se quedan en un píxel y el cuerpo mide 12, que
       * cabe con aire. De propina los polos quedan menos cuadrados y la
       * espalda se lee aún más redonda.
       *
       * Y el sprite se CUADRA ENTERO a la rejilla (Math.round una sola vez,
       * fuera del bucle) en vez de redondear cada bloque por su cuenta.
       * Redondeando bloque a bloque, el borde de arriba caía en -6,5 y el de
       * abajo en +6,5, y Math.round manda los dos al mismo lado: la silueta
       * salía un píxel más plana por arriba que por abajo. Cuadrando primero,
       * todos los bloques son enteros respecto al mismo origen, así que la
       * forma es SIEMPRE la misma y solo se mueve de píxel en píxel, que es
       * como se mueve cualquier dibujo de píxeles. */
      var paso = PIX_PASO, off = (PIX_N - 1) / 2;
      var raya = PIX_RAYA / CFG.SCALE;
      var ox = Math.round(x), oy = Math.round(y);
      var ix, iy, cx, cy, x0, x1, y0, y1;
      ctx.fillStyle = color;
      for (iy = 0; iy < PIX_N; iy++) {
        for (ix = 0; ix < PIX_N; ix++) {
          cx = (ix - off) * paso;
          cy = (iy - off) * paso;
          if (!inPac(cx, cy, r, a, half)) continue;
          x0 = Math.ceil(Math.max(cx - paso / 2, -r));
          x1 = Math.floor(Math.min(cx + paso / 2, r));
          y0 = Math.ceil(Math.max(cy - paso / 2, -r));
          y1 = Math.floor(Math.min(cy + paso / 2, r));
          if (x1 <= x0 || y1 <= y0) continue;
          /* el bloque se encoge por abajo y por la derecha, que es lo que
           * deja la raya; el borde de arriba y el de la izquierda no se
           * mueven, así que la silueta mide lo mismo */
          ctx.fillRect(ox + x0, oy + y0, x1 - x0 - raya, y1 - y0 - raya);
        }
      }
      return;
    }

    if (skin === 'sombra') {
      // estela sólida por detrás, en el mismo tono; más lejos cuanto más corre
      var lejos = 3 * ((extra && extra.estira > 0 && !extra.icono) ? extra.estira : 1);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color;
      pacPath(ctx, x - v.x * lejos, y - v.y * lejos, r - 1, a, half);
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

  /* ============================================================
   * MODO DESATADO — adornos que se pintan ENCIMA del Pac-Man
   * de siempre. Ninguno cambia drawPacman: el Pac-Man clásico se
   * dibuja igual que siempre y esto se le añade, así que un fallo
   * aquí no puede afear el juego normal. Ver js/habilidades.js.
   * ============================================================ */

  /* Dientes del MORDISCO (Q): una sierra blanca en el borde de la boca,
   * arriba y abajo. Se dibuja en el sistema de la boca —girado hacia donde
   * mira— y por eso vale igual en las cuatro direcciones.
   *
   * Con la boca cerrada (fase 0) no hay hueco donde meterlos, así que se
   * abre un mínimo: si no, el mordisco más vistoso del juego se comería un
   * fantasma sin que se viera un solo diente. */
  Sprites.drawPacTeeth = function (ctx, x, y, dir, mouthPhase, color, skin) {
    var r = CFG.PAC_R;
    var d = (dir >= 0) ? dir : 3;
    var a = DIR_ANGLE[d];
    var abierta = [22, 40, 80][mouthPhase] || 22;    // grados de apertura
    var half = (abierta * Math.PI / 180) / 2;
    /* Los dientes se apoyan en el labio. En las skins macizas eso es el borde
     * del cuerpo amarillo y el diente asoma sobre el negro de la boca, que es
     * donde se ve. En ARO el labio ES una línea amarilla de 2,5 px, así que
     * ahí el diente cae ENCIMA de la línea y se lee como un reflejo, no como
     * un diente (se vio ampliando: 22 píxeles blancos, todos sobre amarillo).
     * Se meten siete grados hacia dentro de la boca, que es donde hay negro
     * con el que contrastar. */
    if (skin === 'aro') half = Math.max(0, half - 0.13);
    var n = 3;                                       // dientes por fila
    var i, lado, d0, bx, by;

    /* Los dientes salen SIEMPRE, lleve la skin que lleve: son el aviso de
     * que la Q ha entrado, y sin ellos fallar la puntería y tener la tecla
     * en recarga se sienten exactamente igual. Lo que cambia con la skin es
     * CÓMO se dibujan, porque dos de ellas no dibujan un Pac-Man macizo y
     * unos dientes rellenos encima se leen como un fallo del juego.
     *
     * PIXEL: el cuerpo son bloques de 1,5 px cuadrados a la rejilla de la
     * pantalla, así que aquí cada diente es UN BLOQUE, del mismo tamaño y en
     * la misma rejilla. Se rota a mano y se redondea después: el camino
     * normal gira el lienzo entero, y con el lienzo girado un fillRect ya no
     * cae donde caen los bloques del cuerpo. */
    if (skin === 'pixel') {
      /* Del MISMO tamaño que los bloques del cuerpo (PIX_PASO): un diente más
       * fino se leería como suciedad, no como diente.
       *
       * Y son DOS por labio, no tres. Con bloques de dos píxeles, tres
       * dientes llenaban la boca entera de blanco y lo que se veía era una
       * boca pintada, no una sierra: hace falta dejar negro entre medias para
       * que se entienda qué es. Van pegados al labio (media celda hacia
       * dentro) por lo mismo. */
      var step = PIX_PASO, ca = Math.cos(a), sa = Math.sin(a);
      var raya = PIX_RAYA / CFG.SCALE;
      var ox = Math.round(x), oy = Math.round(y);   // el mismo origen que el cuerpo
      ctx.fillStyle = '#ffffff';
      for (lado = -1; lado <= 1; lado += 2) {
        for (i = 0; i < 2; i++) {
          d0 = r * (0.40 + i * 0.34);
          bx = Math.cos(half) * d0;
          by = Math.sin(half) * d0 * lado - (step / 2) * lado;
          ctx.fillRect(ox + Math.round(bx * ca - by * sa - step / 2),
                       oy + Math.round(bx * sa + by * ca - step / 2),
                       step - raya, step - raya);
        }
      }
      return;
    }

    /* Las demás van igual: una sierra blanca maciza. Con la skin ARO —que es
     * solo contorno— se probó a dibujarlos también en contorno, por aquello
     * de no meter una mancha sólida dentro de una figura hueca, y SALIÓ PEOR:
     * el diente mide dos píxeles de base, así que a tamaño de partida el
     * trazo se lo come entero y lo que se ve es un borrón blanco sin forma.
     * Macizos se leen como sierra, que es de lo que se trata. */
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = '#ffffff';
    for (lado = -1; lado <= 1; lado += 2) {
      /* Cada diente es un triángulo apoyado en el labio, apuntando al
       * interior de la boca. Se reparten a lo largo del radio, que es donde
       * hay sitio, en vez de amontonarse en la punta. */
      for (i = 0; i < n; i++) {
        d0 = r * (0.34 + i * 0.22);                  // distancia al centro
        var w = r * 0.15;                            // media base del diente
        var alto = r * 0.2 * lado;
        bx = Math.cos(half) * d0;
        by = Math.sin(half) * d0 * lado;
        ctx.beginPath();
        ctx.moveTo(bx - w * Math.sin(half), by - w * Math.cos(half) * lado);
        ctx.lineTo(bx + w * Math.sin(half), by + w * Math.cos(half) * lado);
        ctx.lineTo(bx + Math.sin(half) * alto * 0.2, by - alto);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  };

  /* Chispas del TURBO (W): una estela corta de destellos por detrás.
   *
   * Las posiciones salen de `sem` (un contador que avanza con la partida),
   * no de Math.random: así dos pantallas que ven la misma partida —un mirón,
   * una repetición— pintan exactamente las mismas chispas. */
  Sprites.drawTurboSparks = function (ctx, x, y, dir, color, sem) {
    var d = (dir >= 0) ? dir : 3;
    var v = CFG.DIR_V[d];
    var n = 4;
    for (var i = 0; i < n; i++) {
      /* hash barato y estable: mezcla el número de chispa con el contador */
      var h = ((sem + i * 37) * 1103515245 + 12345) & 0x7fffffff;
      var lejos = 3 + ((h >> 4) % 9);                 // 3..11 px por detrás
      var lado = (((h >> 9) % 7) - 3) * 0.9;          // -2.7..2.7 px de través
      var px = x - v.x * lejos - v.y * lado;
      var py = y - v.y * lejos + v.x * lado;
      // las de más atrás son más pequeñas y se apagan: da sensación de estela
      var vida = 1 - lejos / 12;
      sparkle(ctx, px, py, 1.1 + vida * 1.6, color, 0.25 + vida * 0.65);
    }
  };

  /* Rastro del FLASH (E): la silueta de por dónde se ha pasado, apagándose.
   * Sin esto el salto de tres casillas se lee como un tirón de red. */
  Sprites.drawFlashTrail = function (ctx, x, y, dir, color, alpha) {
    if (alpha <= 0) return;
    var d = (dir >= 0) ? dir : 3;
    var v = CFG.DIR_V[d];
    var a = DIR_ANGLE[d];
    ctx.save();
    for (var i = 1; i <= 3; i++) {
      ctx.globalAlpha = alpha * (0.30 - i * 0.07);
      if (ctx.globalAlpha <= 0) break;
      ctx.fillStyle = color;
      pacPath(ctx, x - v.x * i * 8, y - v.y * i * 8, CFG.PAC_R - i * 0.6, a,
        (40 * Math.PI / 180) / 2);
      ctx.fill();
    }
    ctx.restore();
  };

  /* Glifo de laberinto para el icono del modo LABERINTOS: cuatro bloques y
   * un pasillo, con el trazo azul de los muros de verdad. No es ningún
   * laberinto concreto a propósito —el modo son varios—, es la IDEA de un
   * laberinto, que a 40 px es lo único que se lee. */
  Sprites.drawMazeGlyph = function (ctx, x, y, s, color) {
    var g = s / 10;                       // rejilla de 10x10 dentro del icono
    ctx.save();
    ctx.translate(x - s / 2, y - s / 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, g * 0.7);
    ctx.lineJoin = 'miter';
    // marco con el hueco del túnel a los lados
    ctx.beginPath();
    ctx.moveTo(g, g * 4); ctx.lineTo(g, g); ctx.lineTo(g * 9, g);
    ctx.lineTo(g * 9, g * 4);
    ctx.moveTo(g, g * 6); ctx.lineTo(g, g * 9); ctx.lineTo(g * 9, g * 9);
    ctx.lineTo(g * 9, g * 6);
    ctx.stroke();
    // dos bloques dentro, como los del laberinto
    ctx.strokeRect(g * 3, g * 3, g * 1.6, g * 1.6);
    ctx.strokeRect(g * 5.4, g * 3, g * 1.6, g * 1.6);
    ctx.strokeRect(g * 3, g * 5.4, g * 4, g * 1.6);
    ctx.restore();
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
    // las caras de los emotes de la TIENDA viven en js/skins.js
    if (Sprites.CARAS_TIENDA && Sprites.CARAS_TIENDA[id] && Sprites.caraTienda) {
      Sprites.caraTienda(ctx, x, y, r, color, id, tick);
      return;
    }
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
    /* emoteId: el id de la cara ('risa', 'chulo'...) o, como antes, el
     * índice en CFG.EMOTES */
    var e = (typeof emoteId === 'string')
      ? (CFG.EMOTE_IDS.indexOf(emoteId) !== -1 ? { id: emoteId } : null)
      : CFG.EMOTES[emoteId];
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
   * exagerada. Subir de rango tiene que NOTARSE: cada escalón añade algo
   * encima del anterior, nunca cambia lo de antes. El emblema ya crece y
   * cambia de silueta solo; esto es lo que lo rodea.
   *
   *   subidon    cuánto se pasa de frenada al llegar arriba
   *   chispa     rayos que saltan al quedar armado (0 = ninguno)
   *   onda       anillos que se abren al quedar armado
   *   rayos      abanico de rayos girando por detrás
   *   estrellas  chispas en órbita alrededor del emblema
   *   motas      chispas que caen desde el emblema
   *   fogonazo   destello blanco al quedar armado
   * ------------------------------------------------------------ */
  var POMPA = [
    /* APRENDIZ */ { subidon: 1.2, chispa: 0,  onda: 0, rayos: 0,  estrellas: 0, motas: 0, fogonazo: false },
    /* CAZADOR  */ { subidon: 1.8, chispa: 6,  onda: 0, rayos: 0,  estrellas: 0, motas: 0, fogonazo: false },
    /* EXPERTO  */ { subidon: 2.5, chispa: 6,  onda: 1, rayos: 0,  estrellas: 0, motas: 0, fogonazo: false },
    /* MAESTRO  */ { subidon: 3,   chispa: 8,  onda: 1, rayos: 0,  estrellas: 0, motas: 3, fogonazo: false },
    /* LEYENDA  */ { subidon: 3.4, chispa: 8,  onda: 1, rayos: 10, estrellas: 3, motas: 4, fogonazo: false },
    /* MUNDIAL  */ { subidon: 4,   chispa: 12, onda: 2, rayos: 14, estrellas: 5, motas: 6, fogonazo: true }
  ];

  /* Maestría sobre un jugador (Ctrl+Espacio, F1..F4).
   *
   * SOLO el emblema, sin texto: sale de la cabeza del jugador ARMÁNDOSE pieza
   * a pieza (js/emblemas.js), se planta flotando encima con la pompa de su
   * rango y al final se encoge de vuelta hacia el jugador. La silueta ya dice
   * qué maestría es; un rótulo encima tapaba medio pasillo.
   *
   *   t       — 0 al aparecer, 1 al terminar (si no se pasa, se pinta quieta)
   *   tick    — contador libre, para el brillo y la flotación
   *   rango   — escalón de la maestría (0 APRENDIZ … 5 TOP MUNDIAL). Si no
   *             se pasa, EXPERTO.
   *   name, formato — se aceptan porque la red los manda, pero no se
   *             escriben.
   */
  Sprites.drawBadgeTag = function (ctx, x, y, name, color, t, tick, rango, formato) {
    t = (typeof t === 'number') ? Math.max(0, Math.min(1, t)) : 1;
    tick = tick || 0;
    var ri = (typeof rango === 'number') ? Math.max(0, Math.min(5, Math.round(rango))) : 2;
    var P = POMPA[ri];
    var gemas = Sprites.EMBLEM_GEMA;
    color = (gemas && gemas[ri]) || color || '#888888';

    var DURA = (CFG.BADGE_TAG_TICKS || 330) / 60;   // segundos que dura entera
    var SUBE = 0.12;     // hasta aquí: sube desde la cabeza
    var CIERRA = 0.88;   // a partir de aquí: se va
    var ALTO = 40;       // caja del emblema (240 lógicos) en píxeles nativos
    var media = [6, 9, 10, 11, 12, 14][ri];   // media anchura del emblema
    // el armado va a su velocidad real, la misma que en el panel MAESTRÍAS
    var arm = t * DURA;
    var armado = t - (Sprites.EMBLEM_FIN ? Sprites.EMBLEM_FIN[ri] : 1.5) / DURA;

    var salida = (t > CIERRA) ? (t - CIERRA) / (1 - CIERRA) : 0;
    var vis = 1 - salida;
    if (vis <= 0) return;

    var sube = Math.min(1, t / SUBE);
    var freno = 1 - Math.pow(1 - sube, 3);
    var dy = (1 - freno) * 12 - Math.sin(sube * Math.PI) * P.subidon +
      Math.sin(tick * 0.11) * 0.7 + salida * 10;
    var mx = x, my = y - 14;             // centro del emblema, sobre la cabeza

    ctx.save();
    ctx.globalAlpha = vis;
    // al irse, se encoge hacia el jugador
    if (salida > 0) {
      ctx.translate(x, y);
      ctx.scale(1 - salida * 0.6, 1 - salida * 0.6);
      ctx.translate(-x, -y);
    }
    ctx.translate(0, dy);

    var i, a;

    /* LEYENDA y TOP MUNDIAL: abanico de rayos girando POR DETRÁS */
    if (P.rayos && t > SUBE) {
      ctx.save();
      ctx.globalAlpha = vis * Math.min(1, (t - SUBE) / 0.2) * 0.4;
      ctx.fillStyle = color;
      ctx.translate(mx, my);
      ctx.rotate(tick * 0.025);
      for (i = 0; i < P.rayos; i++) {
        ctx.rotate(Math.PI * 2 / P.rayos);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(media + 12, -1.6);
        ctx.lineTo(media + 12, 1.6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    /* el emblema; sin js/emblemas.js, la medalla de siempre */
    if (!(Sprites.drawEmblemAt &&
          Sprites.drawEmblemAt(ctx, ri, mx, my + 2, ALTO, tick / 60, arm))) {
      Sprites.drawBadge(ctx, mx, my, 5, color, false);
    }

    /* ondas que se abren al quedar armado */
    for (i = 0; i < P.onda; i++) {
      var ot = (armado - i * 0.07) / 0.3;
      if (ot > 0 && ot < 1) {
        ctx.save();
        ctx.globalAlpha = vis * (1 - ot) * 0.75;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mx, my, media + ot * 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    /* TOP MUNDIAL: fogonazo blanco al quedar armado */
    if (P.fogonazo) {
      var fg = armado / 0.1;
      if (fg > 0 && fg < 1) {
        ctx.save();
        ctx.globalAlpha = vis * (1 - fg) * 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mx, my, 4 + fg * 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /* chispazo al quedar armado (APRENDIZ no lo tiene) */
    var chispa = armado / 0.14;
    if (P.chispa && chispa > 0 && chispa < 1) {
      ctx.save();
      ctx.globalAlpha = vis * (1 - chispa);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (i = 0; i < P.chispa; i++) {
        a = i * Math.PI * 2 / P.chispa + 0.4;
        var r0 = media + 1 + chispa * 5, r1 = r0 + 3;
        ctx.moveTo(mx + Math.cos(a) * r0, my + Math.sin(a) * r0);
        ctx.lineTo(mx + Math.cos(a) * r1, my + Math.sin(a) * r1);
      }
      ctx.stroke();
      ctx.restore();
    }

    /* estrellas en órbita (LEYENDA para arriba) */
    if (P.estrellas && armado > 0) {
      ctx.save();
      ctx.globalAlpha = vis * Math.min(1, armado / 0.2);
      ctx.fillStyle = '#ffffff';
      for (i = 0; i < P.estrellas; i++) {
        a = tick * 0.06 + i * Math.PI * 2 / P.estrellas;
        var ex = mx + Math.cos(a) * (media + 5), ey2 = my + Math.sin(a) * 6;
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

    /* chispas que caen desde el emblema (MAESTRO para arriba) */
    if (P.motas && armado > 0 && t < CIERRA) {
      ctx.save();
      ctx.fillStyle = color;
      for (i = 0; i < P.motas; i++) {
        var ci = ((tick * 0.03) + i / P.motas) % 1;
        ctx.globalAlpha = vis * (1 - ci) * 0.8;
        ctx.fillRect(mx - media + ((i + 0.5) / P.motas) * media * 2,
          my + 8 + ci * 8, 1, 1.5);
      }
      ctx.restore();
    }

    ctx.restore();
  };

  /* ------------------------------------------------------------
   * La misma maestría, pero SIN taparle el laberinto a nadie: una banda
   * estrecha como la de los logros, para las partidas de varios. El cartel
   * grande cruza el centro de la pantalla cinco segundos, y en una party eso
   * es taparle la partida a gente que está jugando y que además no ha ganado
   * nada. Aquí se ve quién eres y qué has sacado, y a seguir.
   *   t — 0 al aparecer, 1 al terminar
   * ------------------------------------------------------------ */
  Sprites.drawBadgeStrip = function (ctx, cx, cy, w, t, info, tick) {
    var color = info.color || '#ffffff';
    var h = 20;
    var ent = Math.min(1, t / 0.14);
    var sal = Math.min(1, (1 - t) / 0.14);
    var vis = Math.min(ent, sal);
    if (vis <= 0) return;

    // entra desde la izquierda: los logros entran por la derecha, así que
    // aunque caigan seguidos no se confunde uno con otro
    var desliz = (1 - (1 - Math.pow(1 - ent, 3))) * (w / 2 + 30);
    var x0 = cx - w / 2 - desliz;

    ctx.save();
    ctx.globalAlpha = vis;

    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(x0, cy - h / 2, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, cy - h / 2 + 0.5, w - 1, h - 1);

    // medalla con el mismo latido que en el cartel grande
    var rs = (typeof info.rango === 'number') ? info.rango : -1;
    if (!(rs >= 0 && Sprites.drawEmblemAt &&
          Sprites.drawEmblemAt(ctx, rs, x0 + 13, cy + 1, 26, tick / 60, t * 12))) {
      Sprites.drawBadge(ctx, x0 + 13, cy, 7 * (1 + 0.12 * Math.sin(tick * 0.18)),
        color, false);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = window.PM.Letra.lienzo(6);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('¡MAESTRÍA DE ' + (info.mode || 'SOLO') + '!', x0 + 25, cy - 5);
    ctx.font = window.PM.Letra.lienzo(8);
    ctx.fillStyle = color;
    ctx.fillText(String(info.name || ''), x0 + 25, cy + 4);

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
    var r = CFG.PAC_R;
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
    var r = CFG.PAC_R;
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
    ctx.font = window.PM.Letra.lienzo(6);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('¡LOGRO!', x0 + 25, cy - 5);
    ctx.font = window.PM.Letra.lienzo(8);
    ctx.fillStyle = color;
    ctx.fillText(String(info.name || ''), x0 + 25, cy + 4);

    // la condición, a la derecha y pequeñita, si cabe
    ctx.font = window.PM.Letra.lienzo(5);
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
    ctx.font = window.PM.Letra.lienzo(7);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), x, y);
  };

  window.PM.Sprites = Sprites;
})();
