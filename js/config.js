/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/config.js
 * Constantes, laberinto y tablas arcade. Define window.PM.CFG
 * Código 100% original. Sin módulos ES (funciona desde file://).
 * ============================================================ */
(function () {
  'use strict';
  window.PM = window.PM || {};

  var CFG = {};

  /* ---------- Dimensiones ---------- */
  CFG.TILE = 8;            // px por casilla (resolución nativa)
  CFG.COLS = 28;
  CFG.ROWS = 31;           // filas del laberinto
  CFG.TOP_ROWS = 3;        // filas superiores (marcadores)
  CFG.BOTTOM_ROWS = 2;     // filas inferiores (vidas / frutas)
  CFG.NATIVE_W = 224;      // 28*8
  CFG.NATIVE_H = 288;      // 36*8
  CFG.MAZE_Y = CFG.TOP_ROWS * CFG.TILE;   // offset vertical del laberinto (24 px)
  CFG.SCALE = 3;           // escala entera de render

  /* ---------- Laberinto (31 filas x 28 columnas) ----------
   * '#' muro, '.' punto (10), 'o' energizante (50), ' ' pasillo/exterior,
   * '-' puerta de la casa de fantasmas. */
  CFG.MAZE = [
    '############################',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#o####.#####.##.#####.####o#',
    '#.####.#####.##.#####.####.#',
    '#..........................#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#......##....##....##......#',
    '######.##### ## #####.######',
    '######.##### ## #####.######',
    '######.##          ##.######',
    '######.## ###--### ##.######',
    '######.## #      # ##.######',
    '      .   #      #   .      ',
    '######.## #      # ##.######',
    '######.## ######## ##.######',
    '######.##          ##.######',
    '######.## ######## ##.######',
    '######.## ######## ##.######',
    '#............##............#',
    '#.####.#####.##.#####.####.#',
    '#.####.#####.##.#####.####.#',
    '#o..##.......  .......##..o#',
    '###.##.##.########.##.##.###',
    '###.##.##.########.##.##.###',
    '#......##....##....##......#',
    '#.##########.##.##########.#',
    '#.##########.##.##########.#',
    '#..........................#',
    '############################'
  ];

  CFG.PELLET_TOTAL = 244;      // 240 puntos + 4 energizantes (se comprueba al cargar)

  /* El laberinto de 1980, guardado aparte y sin tocar NUNCA: el modo
   * LABERINTOS cambia CFG.MAZE por uno alternativo, y esta copia es la que
   * devuelve el juego al clásico. La fidelidad al arcade es el valor del
   * proyecto: los laberintos nuevos son un modo aparte, no un sustituto. */
  CFG.MAZE_CLASSIC = CFG.MAZE.slice();
  CFG.PELLET_CLASSIC = CFG.PELLET_TOTAL;

  /* ---------- Túnel y casa ---------- */
  CFG.TUNNEL_ROW = 14;
  CFG.TUNNEL_SLOW = [[0, 5], [22, 27]];   // columnas con ralentización (fila 14)
  CFG.HOUSE = {
    doorRow: 12, doorCols: [13, 14],
    top: 13, bottom: 15, left: 11, right: 16,
    exitX: 112,          // 13.5 * 8 + 4  (centro entre col 13 y 14)
    exitY: 92,           // 11  * 8 + 4  (casilla sobre la puerta)
    centerY: 116         // 14  * 8 + 4  (fila central de la casa)
  };

  /* ---------- Posiciones iniciales (casillas; x.5 = entre casillas) ---------- */
  CFG.START = {
    pac:    { x: 13.5, y: 23 },
    blinky: { x: 13.5, y: 11 },
    pinky:  { x: 13.5, y: 14 },
    inky:   { x: 11.5, y: 14 },
    clyde:  { x: 15.5, y: 14 },
    fruit:  { x: 13.5, y: 17 }
  };

  /* Salidas en modos de dos jugadores, simétricas en la fila clásica.
   * dir en literales de CFG.DIR (1 = IZQUIERDA, 3 = DERECHA). */
  CFG.START2 = [
    { x: 11.5, y: 23, dir: 1 },
    { x: 15.5, y: 23, dir: 3 }
  ];

  /* Con 3 y 4 jugadores, los que sobran salen ARRIBA (fila 5, el pasillo
   * largo de la parte superior), no pegados a los de abajo: así el grupo se
   * reparte por el laberinto en vez de amontonarse. */
  CFG.MAX_PLAYERS = 4;
  CFG.STARTS = {
    1: [{ x: 13.5, y: 23, dir: 1 }],
    2: CFG.START2,
    3: [
      { x: 11.5, y: 23, dir: 1 },
      { x: 15.5, y: 23, dir: 3 },
      { x: 13.5, y: 5,  dir: 1 }
    ],
    4: [
      { x: 11.5, y: 23, dir: 1 },
      { x: 15.5, y: 23, dir: 3 },
      { x: 11.5, y: 5,  dir: 1 },
      { x: 15.5, y: 5,  dir: 3 }
    ]
  };

  /* Colores por defecto de los jugadores 3 y 4 (los dos primeros salen de
   * los ajustes de cada uno) */
  CFG.PLAYER_COLORS = ['#ffff00', '#00ff00', '#00ffff', '#ff8c00'];

  /* ---------- Direcciones ---------- */
  CFG.DIR = { UP: 0, LEFT: 1, DOWN: 2, RIGHT: 3, NONE: -1 };
  CFG.DIR_V = [           // vectores, indexados por DIR
    { x: 0, y: -1 },      // UP
    { x: -1, y: 0 },      // LEFT
    { x: 0, y: 1 },       // DOWN
    { x: 1, y: 0 }        // RIGHT
  ];
  CFG.OPP = [2, 3, 0, 1]; // dirección opuesta
  // Prioridad de desempate arcade: ARRIBA > IZQUIERDA > ABAJO > DERECHA
  CFG.DIR_PRIORITY = [0, 1, 2, 3];

  /* ---------- Velocidad ---------- */
  // 100% = 75.7575 px/s  =>  1.26262 px por tick de 1/60 s
  CFG.BASE_SPEED = 75.7575 / 60;
  CFG.SPEED_CLAMP = 1.05;        // límite: 105% del máximo tras multiplicadores
  CFG.EYES_PCT = 160;            // ojos volviendo a casa
  CFG.HOUSE_PCT = 40;            // botar / salir de la casa
  CFG.CORNER_PX = 4;             // ventaja de giro anticipado (px antes del centro)

  /* Tabla de porcentajes por nivel.
   *
   * pacDots NO se aplica: es la MISMA cosa que DOT_PAUSE, contada de otra
   * manera. En el arcade Pac-Man corre siempre a `pac` y pierde un fotograma
   * por cada punto que come; eso, medido de casilla a casilla, da justo la
   * columna pacDots (nivel 1: 8 px a 80% son 7,92 fotogramas, +1 = 8,92, o
   * sea 8/8,92 = 71%; nivel 2-4 da 79% y nivel 5+ da 87%). Aplicar las dos
   * cosas a la vez dejaba a Pac-Man un 12% más lento que el original por los
   * pasillos con puntos, que es lo que rompía los patrones clásicos.
   * Se deja en la tabla como referencia. */
  CFG.speedRow = function (level) {
    if (level === 1)  return { pac: 80,  pacDots: 71, pacFright: 90,  ghost: 75, ghostTunnel: 40, ghostFright: 50 };
    if (level <= 4)   return { pac: 90,  pacDots: 79, pacFright: 95,  ghost: 85, ghostTunnel: 45, ghostFright: 55 };
    if (level <= 20)  return { pac: 100, pacDots: 87, pacFright: 100, ghost: 95, ghostTunnel: 50, ghostFright: 60 };
    return              { pac: 90,  pacDots: 79, pacFright: 90,  ghost: 95, ghostTunnel: 50, ghostFright: 60 };
  };

  // Pausas al comer (ticks): punto 1, energizante 3
  CFG.DOT_PAUSE = 1;
  CFG.ENERGIZER_PAUSE = 3;

  /* ---------- Calendario dispersión/persecución (segundos) ----------
   * Alterna dispersión, persecución, dispersión... tras el último valor:
   * persecución para siempre. El temporizador SE PAUSA durante el modo azul. */
  CFG.schedule = function (level) {
    if (level === 1) return [7, 20, 7, 20, 5, 20, 5];
    if (level <= 4)  return [7, 20, 7, 20, 5, 1033, 1 / 60];
    return             [5, 20, 5, 20, 5, 1037, 1 / 60];
  };

  /* ---------- Modo asustado: duración (s) y parpadeos por nivel ---------- */
  CFG.fright = function (level) {
    var T = {
      1: [6, 5], 2: [5, 5], 3: [4, 5], 4: [3, 5], 5: [2, 5], 6: [5, 5],
      7: [2, 5], 8: [2, 5], 9: [1, 3], 10: [5, 5], 11: [2, 5], 12: [1, 3],
      13: [1, 3], 14: [3, 5], 15: [1, 3], 16: [1, 3], 17: [0, 0], 18: [1, 3]
    };
    var row = (level >= 19) ? [0, 0] : T[level];
    return { seconds: row[0], flashes: row[1] };
  };
  CFG.FLASH_PERIOD = 14;    // ticks por semiperíodo de parpadeo (azul/blanco)

  CFG.GHOST_CHAIN = [200, 400, 800, 1600];   // cadena por energizante

  /* ---------- Cruise Elroy (por puntos RESTANTES) ---------- */
  CFG.elroy = function (level) {
    if (level === 1)  return { d1: 20,  d2: 10 };
    if (level === 2)  return { d1: 30,  d2: 15 };
    if (level <= 5)   return { d1: 40,  d2: 20 };
    if (level <= 8)   return { d1: 50,  d2: 25 };
    if (level <= 11)  return { d1: 60,  d2: 30 };
    if (level <= 14)  return { d1: 80,  d2: 40 };
    if (level <= 18)  return { d1: 100, d2: 50 };
    return              { d1: 120, d2: 60 };
  };
  CFG.ELROY1_BONUS = 5;    // ghost% + 5
  CFG.ELROY2_BONUS = 10;   // ghost% + 10

  /* ---------- Contadores de salida de la casa ---------- */
  CFG.houseDotLimit = function (ghostName, level) {
    if (ghostName === 'pinky') return 0;
    if (ghostName === 'inky')  return (level === 1) ? 30 : 0;
    if (ghostName === 'clyde') return (level === 1) ? 60 : (level === 2 ? 50 : 0);
    return 0;
  };
  CFG.GLOBAL_LIMITS = { pinky: 7, inky: 17, clyde: 32 };
  CFG.houseFailsafe = function (level) { return (level <= 4) ? 4 : 3; };  // segundos sin comer

  /* ---------- Frutas ---------- */
  // ids: 0 cereza, 1 fresa, 2 melocotón, 3 manzana, 4 uvas, 5 galaxian, 6 campana, 7 llave
  CFG.fruitForLevel = function (level) {
    if (level === 1)  return { id: 0, points: 100 };
    if (level === 2)  return { id: 1, points: 300 };
    if (level <= 4)   return { id: 2, points: 500 };
    if (level <= 6)   return { id: 3, points: 700 };
    if (level <= 8)   return { id: 4, points: 1000 };
    if (level <= 10)  return { id: 5, points: 2000 };
    if (level <= 12)  return { id: 6, points: 3000 };
    return              { id: 7, points: 5000 };
  };
  CFG.FRUIT_DOTS = [70, 170];          // aparición por puntos comidos
  CFG.FRUIT_MIN_S = 9;                 // duración aleatoria 9–10 s
  CFG.FRUIT_MAX_S = 10;
  CFG.FRUIT_SCORE_S = 2;               // puntuación visible ~2 s

  /* ---------- Sirena por puntos restantes ---------- */
  CFG.sirenStage = function (dotsLeft) {
    if (dotsLeft > 200) return 0;
    if (dotsLeft > 130) return 1;
    if (dotsLeft > 70)  return 2;
    if (dotsLeft > 30)  return 3;
    return 4;
  };

  /* ---------- Zonas sin subir (persecución/dispersión) ----------
   * Las CUATRO del arcade de 1980, ni una más: en estos cruces un fantasma
   * en dispersión o persecución no puede elegir ARRIBA, y por eso esos dos
   * pasillos solo se bajan. Es una de las reglas que sostienen los patrones
   * memorizados, así que aquí se copia clavada.
   *
   * CUIDADO CON LA CONVERSIÓN, que ya se hizo mal una vez. El arcade las
   * documenta sobre la PANTALLA ENTERA, que son 36 filas: (12,14), (15,14),
   * (12,26) y (15,26). Este array es solo el LABERINTO (CFG.ROWS = 31), que
   * empieza tres filas más abajo — CFG.TOP_ROWS, las de los marcadores —, así
   * que hay que restar TRES, no una: 14-3 = 11 y 26-3 = 23. Se restó uno, y
   * quedaron cuatro casillas de más en las filas 13 y 25.
   *
   * En el clásico esas cuatro no hacían nada (caen en muro o dentro de la
   * casa de fantasmas), y por eso no se notó. En los laberintos alternativos
   * sí caían en pasillo, y (12,25)/(15,25) daban en un pasillo recto de
   * arriba-abajo: allí el fantasma que subía no podía seguir (sin subir), ni
   * salir de lado (muro), ni invertir (prohibido), y Ghost.decide se quedaba
   * sin salidas y le daba media vuelta en mitad del pasillo. Un fantasma no
   * se da la vuelta nunca salvo al cambiar de modo, así que se veía roto.
   *
   * Las de la fila 11 están dentro del núcleo que los laberintos alternativos
   * copian del clásico (filas 9 a 19). Las de la fila 23 NO: van por su
   * cuenta, y js/tests.js comprueba que en todos los laberintos siguen siendo
   * un cruce con salida. */
  CFG.NO_UP_TILES = [
    [12, 11], [15, 11],    // [col, fila] — el cruce sobre la casa  (arcade: fila 14)
    [12, 23], [15, 23]     //              y el cruce de abajo      (arcade: fila 26)
  ];

  /* ---------- CACERÍA: todos de fantasma contra un Pac-Man de máquina ----------
   * Es PAC-MAN VS. dado la vuelta: de uno a cuatro jugadores llevan cada uno
   * un fantasma y el Pac-Man lo lleva la máquina (js/caceria.js). En el
   * laberinto NO hay superpastillas: el poder de Pac-Man llega solo, cada
   * cierto tiempo, y se avisa unos segundos antes para que dé tiempo a
   * apartarse. Una partida son NIVELES rondas: si Pac-Man las despeja
   * todas, gana él; si se queda sin vidas antes, ganan los fantasmas.
   *
   * Los tiempos, y por qué estos:
   *  - PERIODO son los segundos SIN poder entre uno y el siguiente (el
   *    reloj se para mientras dura el poder). A 75% un fantasma recorre
   *    unas 7 casillas por segundo, así que 3 s de aviso son unas 20
   *    casillas: de sobra para salir del pasillo, no para cruzar el mapa.
   *  - DURACION empieza en los 6 s de la superpastilla del nivel 1 del
   *    arcade, que es lo que todo el mundo tiene en la mano. En 6 s Pac-Man
   *    al 90% recorre unas 50 casillas y un fantasma azul al 50% unas 28,
   *    así que le da para pillar a uno que estuviera a menos de veinte, y
   *    con suerte a dos. Cada ronda dura un segundo más y llega dos antes:
   *    en la tercera Pac-Man ya corre al 90% de base y hay que sudar.
   *  - Los valores son POR RONDA (nivel - nivel de inicio), no por nivel
   *    absoluto: una partida siempre escala 1 → 2 → 3, empiece donde empiece.
   *  - La duración se multiplica por el ajuste de superpastilla del
   *    anfitrión (frightMult), con un suelo de 2 s: sin poder ninguno la
   *    partida no tiene nada que temer. */
  CFG.CAZA = {
    NIVELES: 3,                 // rondas por partida
    PERIODO: [20, 18, 16],      // s sin poder entre uno y otro, por ronda
    DURACION: [6, 7, 8],        // s de poder, por ronda
    AVISO: 3,                   // s de aviso antes de que llegue
    MIN_DURACION: 2,            // s como poco, pase lo que pase con el ajuste
    /* La IA de Pac-Man. Una casilla es "segura" si Pac-Man llega a ella
     * MARGEN casillas antes que el fantasma más cercano; un fantasma azul
     * deja de contar como presa cuando el poder acaba antes de que Pac-Man
     * pueda llegar hasta él con AZUL_MARGEN ticks de sobra. */
    MARGEN: 1,
    AZUL_MARGEN: 30,
    /* Con menos casillas seguras que estas, Pac-Man deja de ir a por puntos y
     * busca espacio: lo están cerrando. */
    MIN_SEGURAS: 12,
    /* Ticks que tarda Pac-Man en cruzar una casilla, redondeado para arriba
     * (8 px a 1.14 px/tick son 7): con esto se mide si le da tiempo. */
    TICKS_CASILLA: 7,
    /* Un fantasma que está en la casa o saliendo se cuenta como si ya
     * estuviera sobre la puerta, pero a estas casillas de distancia: así
     * Pac-Man no se pasea por encima de la casa como si no hubiera nadie. */
    CASA_EXTRA: 3,
    /* Velocidad del Pac-Man de máquina sobre la de la tabla (y sobre el
     * ajuste del anfitrión). Es EL mando del equilibrio, y por qué 1.1:
     * al 80% del nivel 1, comiendo puntos (que frenan un tick cada uno),
     * Pac-Man va de hecho al 71%, por debajo del 75% de los fantasmas; y sin
     * superpastillas que lo salven, cuatro fantasmas fuera desde el primer
     * segundo lo acaban en un minuto. Medido contra los cuatro fantasmas de
     * la máquina (js/caceria.js, simulación en Node): a x1.0 no pasa de la
     * primera ronda; a x1.1 aguanta unos tres minutos y media una ronda y
     * pico; a x1.2 gana una de cada tres. Con personas al mando, que
     * tienden trampas peor que la máquina pero se coordinan mejor, x1.1 es
     * el punto de partida; subirlo o bajarlo aquí cambia la dificultad
     * entera del modo. */
    VEL_PAC: 1.1,
    NOMBRE_PAC: 'PAC-MAN',
    COLOR_PAC: '#ffff00'
  };
  /* Periodo y duración del poder para la ronda r (0 = la primera); a partir
   * de la última fila de la tabla se queda ahí. */
  CFG.CAZA.periodo = function (r) {
    var t = CFG.CAZA.PERIODO;
    return t[Math.max(0, Math.min(t.length - 1, r | 0))];
  };
  CFG.CAZA.duracion = function (r) {
    var t = CFG.CAZA.DURACION;
    return t[Math.max(0, Math.min(t.length - 1, r | 0))];
  };

  /* ---------- PAC-MAN VS.: un jugador lleva un fantasma ----------
   * El fantasma humano obedece a las teclas y no a la IA, pero juega con las
   * mismas reglas que la máquina (paredes, zonas sin subir, velocidades,
   * túnel y modo asustado). Los detalles están en js/versus.js. */
  CFG.VS = {
    NAMES: ['BLINKY', 'PINKY', 'INKY', 'CLYDE'],
    CATCH_POINTS: 1000,   // lo que se lleva el fantasma por cazar un Pac-Man
    DIR_EVERY: 5,         // ticks entre reenvíos del rumbo (12 Hz, como el resto)
    /* Separación con el anfitrión que obliga a recolocar el fantasma en la
     * pantalla de quien lo lleva. Menos de una casilla a propósito: cuanto
     * antes se corrige, más pequeña es la corrección. Con el umbral alto la
     * desviación crece hasta que los dos van por pasillos distintos y
     * entonces el salto es de dos o tres casillas (medido con dos partidas
     * simuladas y 100 ms de retardo: a 6 px salen 4 correcciones por minuto
     * de persecución continua, la mayor de 10 px; a 14 px salen las mismas,
     * pero de 19 px). */
    RESYNC_PX: 6
  };

  /* ---------- Fantasmas: identidad y esquinas ---------- */
  CFG.GHOSTS = [
    { name: 'blinky', color: '#ff0000', scatter: { x: 25, y: -3 } },
    { name: 'pinky',  color: '#ffb8ff', scatter: { x: 2,  y: -3 } },
    { name: 'inky',   color: '#00ffff', scatter: { x: 27, y: 32 } },
    { name: 'clyde',  color: '#ffb852', scatter: { x: 0,  y: 32 } }
  ];
  CFG.CLYDE_SHY_DIST = 8;   // casillas (euclídea)

  /* ---------- Puntuación ---------- */
  CFG.DOT_POINTS = 10;
  CFG.ENERGIZER_POINTS = 50;
  CFG.EXTRA_LIFE_AT = 10000;

  /* ---------- Tiempos de flujo (ticks a 60 Hz) ---------- */
  CFG.READY_TICKS = 120;            // "¡LISTO!" 2 s
  CFG.INTRO_FALLBACK_MS = 4200;     // melodía de inicio si AudioSys no responde
  CFG.EAT_FREEZE_TICKS = 60;        // congelación al comer fantasma (1 s)
  CFG.DEATH_FREEZE_TICKS = 60;      // congelación previa a la animación de muerte
  CFG.DEATH_ANIM_TICKS = 90;        // animación de muerte ~1.5 s
  CFG.RESPAWN_SAFE_TICKS = 120;     // invulnerable al reaparecer sin parar la partida (2 s)
  CFG.DEATH_CONFIRM_TICKS = 120;    // invitado: espera de confirmación de su muerte
  CFG.LEVEL_FREEZE_TICKS = 60;      // congelación al completar nivel
  CFG.LEVEL_FLASH_TICKS = 120;      // ~2 s de parpadeo de muros (4 destellos)
  /* Antes eran 3 s con "GAME OVER" escrito sobre el laberinto. Desde el
   * GAME OVER de recreativa (17 sep) ese rótulo sobra: el final sale ya. */
  CFG.GAMEOVER_TICKS = 1;

  /* Retranqueo del trazo de los muros (px dentro de la casilla): los muros
   * se dibujan más finos y los pasillos se ven más anchos, como en el arcade. */
  /* Lo que el trazo del muro se mete hacia DENTRO de la casilla de muro. Es
   * lo que decide de verdad el grosor de las paredes, y con él el aire que
   * queda en el pasillo: entre dos muros que se miran hay 8 + 2*WALL_INSET px
   * de negro.
   *
   * Subió de 2 a 3 por una cuenta que no admite discusión: PAC-MAN MIDE 13 PX
   * de diámetro (radio 6.5 en js/sprites.js) y con 2 el hueco era de 12, así
   * que se solapaba medio píxel por lado con los muros de arriba y de abajo.
   * No era una impresión: el dibujo de Pac-Man y el del muro compartían
   * píxeles, y por eso al pasar por un pasillo parecía fundirse con la pared.
   * Con 3 el hueco es de 14 y le queda medio píxel de aire a cada lado.
   *
   * El precio es que el bloque de muro se estrecha, y con él el trazo recto
   * que queda para las curvas de las esquinas. Por eso el radio se calcula
   * ahora POR ESQUINA (Game.radioEsquina) y no con un tope global: los muros
   * grandes siguen curvando entero y solo los de una casilla curvan menos. */
  CFG.WALL_INSET = 3;
  /* Radio de Pac-Man, en píxeles. Trece de diámetro, como el del arcade —que
   * es MÁS ANCHO que la casilla de 8, y por eso el aire del pasillo depende
   * de lo delgadas que sean las paredes. Vive aquí, y no suelto en el dibujo,
   * porque es la mitad de la cuenta de WALL_INSET y js/tests.js las compara:
   * si alguien engorda el muro o a Pac-Man hasta que dejen de caber, salta
   * una prueba en vez de descubrirse jugando. */
  CFG.PAC_R = 6.5;
  /* Radio de las esquinas del muro, en píxeles. El laberinto del arcade no
   * gira en ángulo recto: cada cambio de dirección va con una curva, y sin
   * ella el dibujo se ve cortado a escuadra.
   *
   * 1.5 no es un número suelto: es lo que cabe. El tramo de muro más corto
   * que existe es de UNA casilla con esquina en los dos extremos, y ahí solo
   * quedan T - 2*WALL_INSET - (un trazo) px de recta para repartir entre las
   * dos curvas. Con más, esos muros se quedarían sin recta y las curvas se
   * comerían unas a otras: el muro saldría dibujado del revés. Lo comprueba
   * js/tests.js, en todos los laberintos y no solo en el clásico.
   *
   * Este es el radio que se PIDE. Game.buildMazeCanvas lo recorta él solo a
   * lo que quepa en la escala que le toque dibujar, porque a tamaño de
   * miniatura el trazo ocupa mucho más en unidades de casilla. */
  CFG.WALL_RADIUS = 1.5;
  /* Grosor del trazo del muro, EN PÍXELES DE PANTALLA (no de los 8 de la
   * casilla). Un píxel nativo son CFG.SCALE de pantalla, así que el trazo de
   * toda la vida medía 3 y no había forma de bajar de ahí: en la resolución
   * nativa no existe medio píxel. Por eso el laberinto se dibuja YA a escala
   * (ver Game.buildMazeCanvas) y luego se pega uno a uno, sin reescalar nada.
   * Con 2 el muro se lee más ligero y las curvas de las esquinas ganan, que
   * a 3 se comían media casilla.
   *
   * Con WALL_LINE = CFG.SCALE sale exactamente el dibujo de antes, así que
   * esto no es una capa nueva encima: es el mismo trazo con un grosor que
   * ahora se puede elegir. */
  CFG.WALL_LINE = 2;

  /* ---------- Colores ---------- */
  CFG.COLORS = {
    wall: '#2121ff',
    wallFlash: '#ffffff',
    door: '#ffb8ff',
    /* Pastillas en blanco, como el arcade original: el amarillo se confundía
     * con el propio Pac-Man. Las dos medidas comparten color; lo que distingue
     * a la superpastilla es su tamaño y que respira (js/game.js). */
    pellet: '#ffffff',
    pelletMini: '#ffffff',
    frightBody: '#2121ff',
    frightFace: '#ffb8ae',
    flashBody: '#ffffff',
    flashFace: '#ff0000',
    text: '#ffffff',
    ready: '#ffff00',
    gameOver: '#ff0000',
    popup: '#00ffff'
  };
  CFG.PAC_SWATCHES = ['#ffff00', '#ff0000', '#00ffff', '#00ff00',
                      '#ff69b4', '#ff8c00', '#b19cd9', '#ffffff'];

  /* ---------- Skins (aspecto del Pac-Man, sobre el color elegido) ----------
   * Cuatro grupos (`grupo`):
   *   nivel     — se abren con el NIVEL DE JUGADOR (`level`), en este orden.
   *               Los niveles son la escalera rebajada del 13 de septiembre
   *               (solo un jugador pasaba del 30) y el ORDEN lo eligió
   *               Braighton en la vitrina: MOÑITO antes que COMETA, PRISMA a
   *               media escalera y FUEGO la última.
   *   logro     — se abren con un contador de logros o una maestría (`pide`),
   *               jueguen al nivel que jueguen.
   *   temporada — se abren jugando en unas fechas; ganadas, se quedan.
   *   tienda    — se compran con monedas (`precio`, js/tienda.js).
   * `rara` son las EXTRAVAGANTES: dejan la forma de Pac-Man y el comer es su
   * propio gesto (mandíbula, tapa, pan, rayo...). Se dibujan en js/skins.js;
   * las seis de siempre, en sprites.js. `gana` y `ve` son los textos de la
   * vitrina de SKINS.
   *
   * `pide` (js/skins.js lo interpreta):
   *   { stat, meta, que }            contador de PM.Achievements >= meta
   *   { ruta: [...], maestria, que }  maestría >= esa en alguna de esas rutas
   *   { fecha: 'halloween'|'navidad' } jugar una partida en esas fechas
   *   { luna: true }                  jugar una noche de luna llena (CFG.LUNA)
   * Las cifras salen de los contadores reales de los jugadores (13 sep):
   * una o dos personas la tienen al salir y el resto la ve cerca.
   *
   * La que ya lleves puesta no se te quita nunca, aunque el requisito suba:
   * ver PM.Skins.abierta(). */
  CFG.SKINS = [
    /* --- por nivel --- */
    { id: 'clasico', name: 'CLÁSICO', grupo: 'nivel', level: 1,
      ve: 'EL PAC-MAN DE SIEMPRE.' },
    { id: 'sombra', name: 'SOMBRA', grupo: 'nivel', level: 2,
      ve: 'UNA SOMBRA TRANSLÚCIDA LE VA PEGADA DETRÁS, MÁS LEJOS CUANTO MÁS CORRE.' },
    { id: 'ojos', name: 'OJOS', grupo: 'nivel', level: 4,
      ve: 'UN OJO EN LA FRENTE QUE MIRA HACIA DONDE AVANZA.' },
    { id: 'mono', name: 'MOÑITO', grupo: 'nivel', level: 6,
      ve: 'UN MOÑITO ROSADO EN LA CABEZA QUE SE MECE AL CORRER.' },
    { id: 'cometa', name: 'COMETA', grupo: 'nivel', level: 8,
      ve: 'UNA ESTELA DE COPIAS QUE SE APAGAN. CUANTO MÁS RÁPIDO, MÁS COPIAS.' },
    { id: 'neon', name: 'NEÓN', grupo: 'nivel', level: 10,
      ve: 'BRILLA CON UN HALO DE SU COLOR.' },
    { id: 'holograma', name: 'HOLOGRAMA', grupo: 'nivel', level: 12,
      ve: 'UN PROYECTOR SOBRE LA CABEZA FORMA UN CUERPO TRANSLÚCIDO CON INTERFERENCIAS.' },
    { id: 'glitch', name: 'GLITCH', grupo: 'nivel', level: 15,
      ve: 'CADA POCO SE DESCUADRA EN ROJO Y CIAN, COMO UNA TELE ROTA.' },
    { id: 'prisma', name: 'PRISMA', grupo: 'nivel', level: 18,
      ve: 'RECORRE OCHO COLORES DEL ARCOÍRIS CON UN DESTELLO EN CADA CAMBIO.' },
    { id: 'pixel', name: 'PÍXEL', grupo: 'nivel', level: 22,
      ve: 'HECHO DE BLOQUES, COMO EN UNA RECREATIVA.' },
    { id: 'aro', name: 'ARO', grupo: 'nivel', level: 26,
      ve: 'SOLO EL CONTORNO, CON LA BOCA ABIERTA.' },
    { id: 'rastro', name: 'RASTRO', grupo: 'nivel', level: 30,
      ve: 'MOTO DE LUZ: BORDE DE NEÓN Y UNA ESTELA QUE CRECE CON LA VELOCIDAD.' },
    { id: 'fuego', name: 'FUEGO', grupo: 'nivel', level: 34,
      ve: 'PAC-MAN ES LA LLAMA: SE DESHACE HACIA ATRÁS EN LENGUAS DE FUEGO.' },

    /* --- por logro --- */
    { id: 'cereza', name: 'CEREZA', grupo: 'logro',
      pide: { stat: 'frutas', meta: 120, que: 'FRUTAS COMIDAS' },
      ve: 'UN RABITO CON HOJA Y UNA CEREZA QUE CUELGA DETRÁS COMO UNA COLA.' },
    { id: 'fantasma', name: 'MEDIO FANTASMA', grupo: 'logro',
      pide: { stat: 'caza:cazas', meta: 10, que: 'PAC-MAN CAZADOS EN CACERÍA' },
      ve: 'MEDIO PAC-MAN, MEDIO FANTASMA: FALDITA ONDULADA Y OJO DE PUPILA AZUL.' },
    { id: 'corona', name: 'CORONA', grupo: 'logro',
      pide: { ruta: ['solo'], maestria: 'leyenda', que: 'LEYENDA EN CLÁSICO SOLO' },
      ve: 'UNA CORONA DE SU MISMO COLOR CON UNA GEMITA ROJA.' },
    { id: 'escuadra', name: 'ESCUADRA', grupo: 'logro',
      pide: { ruta: ['escuadra', 'lab4', 'hab4'], maestria: 'maestro',
              que: 'MAESTRO EN ESCUADRA' },
      ve: 'LLEVA DETRÁS UNA CRÍA DE PAC-MAN POR CADA COMPAÑERO, DE SU COLOR.' },
    { id: 'dorado', name: 'DORADO', grupo: 'logro',
      pide: { stat: 'top10', meta: 1, que: 'ENTRAR EN EL TOP 10 DEL TOP MUNDIAL' },
      ve: 'ORO PULIDO CON UN DESTELLO QUE LO CRUZA.' },

    /* --- extravagantes (por logro) --- */
    { id: 'hamburguesa', name: 'HAMBURGUESA', grupo: 'logro', rara: true,
      pide: { stat: 'partidas', meta: 100, que: 'PARTIDAS JUGADAS' },
      ve: 'EL PAN DE ARRIBA ES LA BOCA; AL ABRIRSE SE VE EL QUESO GOTEANDO.' },
    { id: 'gato', name: 'GATO', grupo: 'logro', rara: true,
      pide: { stat: 'party:partidas', meta: 30, que: 'PARTIDAS ACOMPAÑADO' },
      ve: 'GATO DE PERFIL QUE PARPADEA, CON BIGOTES Y LA COLA MOVIÉNDOSE.' },
    { id: 'tiburon', name: 'TIBURÓN', grupo: 'logro', rara: true,
      pide: { stat: 'fantasmas', meta: 300, que: 'FANTASMAS COMIDOS' },
      ve: 'TIBURÓN CON ALETA Y DOS FILAS DE DIENTES QUE NADA MENEÁNDOSE.' },
    { id: 'planta', name: 'PLANTA CARNÍVORA', grupo: 'logro', rara: true,
      pide: { stat: 'mordiscos', meta: 50, que: 'MORDISCOS CON LA Q' },
      ve: 'DOS HOJAS CON PÚAS QUE SE CIERRAN COMO UNA TRAMPA.' },
    { id: 'robot', name: 'ROBOT', grupo: 'logro', rara: true,
      pide: { stat: 'dailyOk', meta: 5, que: 'RETOS DEL DAILY CUMPLIDOS' },
      ve: 'CABEZA DE LATA CON VISOR QUE BARRE, ANTENA Y MANDÍBULA DE BISAGRA.' },
    { id: 'trex', name: 'T-REX', grupo: 'logro', rara: true,
      pide: { stat: 'nivelMax', meta: 7, que: 'NIVEL MÁS ALTO EN UNA PARTIDA' },
      ve: 'CABEZOTA CON CRESTA DE PÚAS, MANDÍBULA ENORME Y UN BRACITO RIDÍCULO.' },
    { id: 'ovni', name: 'OVNI', grupo: 'logro', rara: true,
      pide: { stat: 'caza:partidas', meta: 5, que: 'CACERÍAS JUGADAS' },
      ve: 'PLATILLO CON MARCIANO QUE COME CON UN RAYO TRACTOR.' },
    { id: 'cofre', name: 'COFRE MÍMICO', grupo: 'logro', rara: true,
      pide: { stat: 'puntosMax', meta: 100000, que: 'PUNTOS EN UNA PARTIDA' },
      ve: 'UN COFRE VIVO: LA TAPA ES LA BOCA Y SUELTA MONEDAS.' },
    { id: 'dragon', name: 'DRAGÓN', grupo: 'logro', rara: true,
      pide: { ruta: ['hab'], maestria: 'maestro', que: 'MAESTRO EN DESATADO SOLO' },
      ve: 'CABEZA DE DRAGÓN QUE ECHA HUMO Y, CADA POCO, UNA LLAMARADA.' },
    { id: 'calavera', name: 'CALAVERA', grupo: 'logro', rara: true,
      pide: { stat: 'muertes', meta: 250, que: 'MUERTES' },
      ve: 'CALAVERA DE CARICATURA QUE ABRE LA MANDÍBULA Y BOTA AL CORRER.' },

    /* --- extravagantes de la tanda del 14 de septiembre (por logro) ---
     * Aprobadas en la vitrina el 15 sep. Las cifras salen de los contadores
     * reales de ese día. Cada una hace algo propio con una Q que acierta y
     * tiene su propia muerte (js/skins.js). */
    { id: 'bomba', name: 'BOMBA', grupo: 'logro', rara: true,
      pide: { stat: 'vs:cazas', meta: 3, que: 'PAC-MAN CAZADOS LLEVANDO FANTASMA' },
      ve: 'BOMBA NEGRA CON CARA ENFADADA: LA MEDIA ESFERA DE ABAJO ES LA MANDÍBULA Y LA MECHA CHISPORROTEA. AL MORIR, EXPLOTA.' },
    { id: 'abisal', name: 'PEZ ABISAL', grupo: 'logro', rara: true,
      pide: { stat: 'nivelMax', meta: 10, que: 'NIVEL MÁS ALTO EN UNA PARTIDA' },
      ve: 'PEZ DE LAS PROFUNDIDADES CON COLMILLOS DE AGUJA Y UNA LUCECITA DE SU COLOR QUE MARCA HACIA DÓNDE VA.' },
    { id: 'pinata', name: 'PIÑATA', grupo: 'logro', rara: true,
      pide: { stat: 'dailySemana', meta: 1, que: 'SEMANA ENTERA DEL DAILY' },
      ve: 'BURRITO DE PIÑATA DE PAPEL DE COLORES QUE DA SALTITOS. CON LA Q SUELTA CARAMELOS Y CONFETI.' },
    { id: 'tostadora', name: 'TOSTADORA', grupo: 'logro', rara: true,
      pide: { stat: 'dailyRacha', meta: 3, que: 'DÍAS SEGUIDOS CUMPLIENDO EL DAILY' },
      ve: 'TOSTADORA RETRO DE SU COLOR: LA BOCA ES LA RANURA CON LAS RESISTENCIAS AL ROJO. CON LA Q SALTA UNA TOSTADA.' },
    { id: 'gargola', name: 'GÁRGOLA', grupo: 'logro', rara: true,
      pide: { stat: 'lab:partidas', meta: 5, que: 'PARTIDAS EN LABERINTOS' },
      ve: 'CABEZA DE PIEDRA CON CUERNO, ALA PLEGADA Y UN OJO QUE BRILLA. CON LA Q ESCUPE POLVO Y PIEDRAS.' },
    { id: 'pulpo', name: 'PULPO', grupo: 'logro', rara: true,
      pide: { stat: 'muros', meta: 25, que: 'MUROS ATRAVESADOS CON LA E' },
      ve: 'PULPO CON CUATRO TENTÁCULOS QUE ONDULAN DETRÁS Y UN PICO QUE COME. CON LA Q, CHORRO DE TINTA.' },
    { id: 'momia', name: 'MOMIA', grupo: 'logro', rara: true,
      pide: { stat: 'limpios', meta: 5, que: 'NIVELES SEGUIDOS SIN MORIR' },
      ve: 'CABEZA VENDADA CON UN OJO QUE BRILLA Y DOS VENDAS SUELTAS AL VIENTO. CON LA Q, VENDA COMO LÁTIGO.' },
    { id: 'globo', name: 'PEZ GLOBO', grupo: 'logro', rara: true,
      pide: { stat: 'racha', meta: 5, que: 'FANTASMAS CON UN MISMO ENERGIZANTE (EN EQUIPO)' },
      ve: 'PEZ REDONDO DE OJO ENORME Y LABIOS EN "O". CON LA Q SE INFLA CON LAS PÚAS DE PUNTA.' },
    { id: 'bicefalo', name: 'BICÉFALO', grupo: 'logro', rara: true,
      pide: { ruta: ['hab2'], maestria: 'maestro', que: 'MAESTRO EN DESATADO DÚO' },
      ve: 'DOS CABEZAS DE CARÁCTER OPUESTO, EL LISTO Y EL BOBO, QUE MUERDEN POR TURNOS. CON LA Q, LAS DOS A LA VEZ.' },

    /* --- de la TIENDA (1.500 monedas): extravagantes que no se ganan jugando --- */
    { id: 'cuy', name: 'CUY', grupo: 'tienda', rara: true, precio: 1500,
      ve: 'CUY REGORDETE CON PAÑUELO DE LUNARES DE SU COLOR. COME ROYENDO; CON LA Q DA UN SALTITO DE ALEGRÍA.' },
    { id: 'llama', name: 'LLAMA', grupo: 'tienda', rara: true, precio: 1500,
      ve: 'LLAMA DE LANA CON BUFANDA DE SU COLOR QUE ONDEA. MASTICA; CON LA Q ESCUPE HACIA DELANTE.' },
    { id: 'carro', name: 'CARRO', grupo: 'tienda', rara: true, precio: 1500,
      ve: 'COCHECITO DE SU COLOR CON FARO, HUMITO Y RUEDAS QUE GIRAN. NO MUERDE; CON LA Q, ACELERÓN CON NITRO.' },
    { id: 'oso', name: 'OSO', grupo: 'tienda', rara: true, precio: 1500,
      ve: 'OSO PARDO BONACHÓN QUE BOTA AL CORRER. CON LA Q SACA UN TARRO DE MIEL CON DOS ABEJITAS.' },
    { id: 'galleta', name: 'GALLETA', grupo: 'tienda', rara: true, precio: 1500,
      ve: 'GALLETA CON PEPITAS: LA BOCA ES UN MORDISCO QUE SE ABRE Y SE CIERRA. CON LA Q EXPLOTA EN MIGAS.' },

    /* --- de MATERIAL (1.500): no son disfraces, es de qué está hecho.
     * Mantienen la silueta de Pac-Man, así que admiten accesorios. --- */
    { id: 'lava', name: 'LAVA', grupo: 'tienda', precio: 1500,
      ve: 'CORTEZA NEGRA CON LAVA VIVA POR DENTRO: LAS GRIETAS LATEN Y SUELTAN ASCUAS AL CORRER.' },
    { id: 'hielo', name: 'HIELO', grupo: 'tienda', precio: 1500,
      ve: 'BLOQUE DE HIELO TALLADO CON VETAS POR DENTRO, DOS CARÁMBANOS COLGANDO Y ESCARCHA POR DONDE PASA.' },
    { id: 'chicle', name: 'CHICLE', grupo: 'tienda', precio: 1500,
      ve: 'GOMA DE MASCAR BLANDA Y BRILLANTE: SE APLASTA AL FRENAR Y CADA POCO HINCHA UN GLOBO QUE LE REVIENTA EN LA CARA.' },

    /* --- EXTRAVAGANTES del 18 sep (1.500): dejan la silueta de Pac-Man,
     * así que NO admiten accesorios en su cara como las de material. Cada
     * una come a su manera, tiene su Q y su propia muerte. --- */
    { id: 'rana', name: 'RANA', grupo: 'tienda', rara: true, precio: 1500,
      ve: 'RANA DE CABEZA ANCHA CON DOS OJAZOS SALTONES Y BOCAZA. AL COMER ASOMA LA LENGUA; CON LA Q LA SACA ENTERA DE UN LENGÜETAZO.' },
    { id: 'payaso', name: 'PAYASO', grupo: 'tienda', rara: true, precio: 1500,
      ve: 'EL PAYASO DEL EMOJI, DE PERFIL: PELUCA DE RIZOS, NARIZ DE BOLA Y SONRISOTA. CON LA Q LE ESTALLA UNA TARTA DE NATA EN LA CARA.' },
    { id: 'recreativa', name: 'RECREATIVA', grupo: 'tienda', rara: true, precio: 1500,
      ve: 'UN MUEBLE DE SALÓN RECREATIVO CON SU PARTIDA CORRIENDO EN LA PANTALLA; EL PANEL DE MANDOS ES LA MANDÍBULA. CON LA Q, INSERT COIN.' },
    { id: 'cangrejo', name: 'CANGREJO', grupo: 'tienda', rara: true, precio: 1500,
      ve: 'CANGREJO DE FRENTE QUE CAMINA DE COSTADO: OJOS EN TALLO Y SEIS PATITAS. LA PINZA DE DELANTE ES LA BOCA; CON LA Q, PINZAZO Y BURBUJAS.' },
    { id: 'caracol', name: 'CARACOL', grupo: 'tienda', rara: true, precio: 1500,
      ve: 'CARACOL CON LA CONCHA DE SU COLOR QUE DEJA RASTRO DE BABA. CON LA Q SE METE DENTRO Y SALE RODANDO A TODA VELOCIDAD.' },

    /* --- de COFRE: no se compran, solo salen de un cofre (PLAN-COFRES.md) --- */
    { id: 'plasma', name: 'PLASMA', grupo: 'cofre',
      ve: 'BOLA DE PLASMA: POR DENTRO SALTAN RAYOS QUE BUSCAN EL BORDE, COMO EN LA LÁMPARA DE FERIA.' },
    { id: 'enjambre', name: 'ENJAMBRE', grupo: 'cofre',
      ve: 'NO TIENE CUERPO: ES UN ENJAMBRE DE PASTILLAS QUE VUELA CON SU FORMA Y SE DESORDENA AL GIRAR.' },
    { id: 'galaxia', name: 'GALAXIA', grupo: 'cofre',
      ve: 'POR DENTRO ES CIELO ESTRELLADO: UNA NEBULOSA GIRA DESPACIO Y VA SOLTANDO POLVO DE ESTRELLAS.' },
    { id: 'agujero', name: 'AGUJERO NEGRO', grupo: 'cofre', legendaria: true,
      ve: 'UN VACÍO CON ANILLO DE LUZ: LO QUE PASA CERCA SE CURVA HACIA ÉL ANTES DE CAER DENTRO.' },

    /* extravagantes del 18 sep que solo salen de cofre */
    { id: 'condor', name: 'CÓNDOR', grupo: 'cofre', rara: true,
      ve: 'CÓNDOR ANDINO DE PERFIL: CABEZA PELADA, GOLILLA DE PLUMÓN BLANCO Y PICO DE GANCHO POR BOCA. CON LA Q ABRE LAS ALAS Y CHILLA.' },
    { id: 'toro', name: 'TORO', grupo: 'cofre', rara: true,
      ve: 'CABEZOTA DE TORO BRAVO CON LA ANILLA EN EL MORRO, QUE RESOPLA VAPOR AL CORRER. CON LA Q BAJA LA CABEZA Y EMBISTE.' },
    { id: 'unicornio', name: 'UNICORNIO', grupo: 'cofre', rara: true,
      ve: 'CABEZA DE UNICORNIO CON CRIN DE ARCOÍRIS Y CUERNO DE ESPIRAL. CON LA Q DISPARA UN CHORRO DE ARCOÍRIS POR EL CUERNO.' },

    /* --- de temporada --- */
    { id: 'calabaza', name: 'CALABAZA', grupo: 'temporada',
      pide: { fecha: 'halloween' },
      ve: 'GAJOS, OJO TALLADO CON LA VELA DENTRO, LABIOS EN PÚAS Y RABITO.' },
    { id: 'brujas', name: 'NOCHE DE BRUJAS', grupo: 'temporada',
      pide: { fecha: 'halloween' },
      ve: 'CARA DE CALAVERA BAJO UN SOMBRERO DE BRUJA.' },
    { id: 'vampiro', name: 'VAMPIRO', grupo: 'temporada', rara: true,
      pide: { fecha: 'halloween' },
      ve: 'COLMILLOS, OJO ROJO Y UNA CAPA QUE ONDEA CON EL FORRO DE SU COLOR.' },
    { id: 'lobo', name: 'HOMBRE LOBO', grupo: 'temporada', rara: true,
      pide: { luna: true },
      ve: 'CABEZA DE LOBO CON HOCICO LARGO, OJO ÁMBAR Y COLMILLOS. CADA POCO LEVANTA LA CABEZA Y AÚLLA.' },
    { id: 'gorro', name: 'CLAUS-MAN', grupo: 'temporada',
      pide: { fecha: 'navidad' },
      ve: 'GORRO ROJO CON BORDE BLANCO Y LA BORLA COLGANDO.' },

    /* --- del PASE DE TEMPORADA: ni se compran ni salen de cofre. Se ganan
     * llegando a su galón en el mes que las reparte, y quien no jugó ese mes
     * no las tiene ya nunca. Ver CFG.PASE.CAMINO. --- */
    { id: 'trampa', name: 'TRAMPA', grupo: 'pase', rara: true, temporada: '2026-10',
      ve: 'LA CAJA DE CAZAR FANTASMAS: LAS DOS HOJAS DEL FRENTE SON LA BOCA Y POR DENTRO LLEVA LUZ, CON LO QUE YA CAZÓ. CON LA Q DISPARA EL RAYO Y SE TRAGA UN FANTASMA.' }
  ];
  /* Ventanas de las skins de temporada, [mes, día] a [mes, día] incluidos
   * (mes 1-12). La de Navidad cruza el año. */
  CFG.SKIN_FECHAS = {
    halloween: { desde: [10, 24], hasta: [10, 31], que: 'DEL 24 AL 31 DE OCTUBRE' },
    navidad:   { desde: [12, 20], hasta: [1, 6],   que: 'DEL 20 DE DICIEMBRE AL 6 DE ENERO' }
  };
  /* HOMBRE LOBO: cuándo cuenta como luna llena (js/skins.js, lunaLlena).
   * Un día y pico a cada lado del instante exacto (el cálculo es de ciclo
   * medio y se desvía unas horas) y solo de noche, en la hora de quien juega. */
  CFG.LUNA = { MARGEN_DIAS: 1.2, DESDE_H: 18, HASTA_H: 6 };
  /* Solo sirve para validar lo guardado; sale de la lista de arriba */
  CFG.SKIN_IDS = CFG.SKINS.map(function (sk) { return sk.id; });

  /* ---------- Avatares del perfil ----------
   * Todo dibujado por código reaprovechando los sprites del juego: caras de
   * Pac-Man, los cuatro fantasmas, el fantasma asustado, frutas y la medalla.
   * `kind` le dice a Sprites.drawAvatar de dónde sacarlo. */
  CFG.AVATARS = [
    { id: 'pac',     name: 'PAC-MAN',  kind: 'pac' },
    { id: 'risa',    name: 'RISA',     kind: 'face', arg: 'risa' },
    { id: 'guino',   name: 'GUIÑO',    kind: 'face', arg: 'guino' },
    { id: 'amor',    name: 'AMOR',     kind: 'face', arg: 'amor' },
    { id: 'enfado',  name: 'ENFADO',   kind: 'face', arg: 'enfado' },
    { id: 'susto',   name: 'SUSTO',    kind: 'face', arg: 'susto' },
    { id: 'blinky',  name: 'BLINKY',   kind: 'ghost', arg: 0 },
    { id: 'pinky',   name: 'PINKY',    kind: 'ghost', arg: 1 },
    { id: 'inky',    name: 'INKY',     kind: 'ghost', arg: 2 },
    { id: 'clyde',   name: 'CLYDE',    kind: 'ghost', arg: 3 },
    { id: 'azul',    name: 'ASUSTADO', kind: 'fright' },
    { id: 'ojitos',  name: 'OJOS',     kind: 'eyes' },
    { id: 'cereza',  name: 'CEREZA',   kind: 'fruit', arg: 0 },
    { id: 'fresa',   name: 'FRESA',    kind: 'fruit', arg: 1 },
    { id: 'llave',   name: 'LLAVE',    kind: 'fruit', arg: 7 },
    { id: 'medalla', name: 'MEDALLA',  kind: 'badge' }
  ];
  CFG.AVATAR_IDS = (function () {
    var out = [];
    for (var i = 0; i < CFG.AVATARS.length; i++) out.push(CFG.AVATARS[i].id);
    return out;
  })();

  /* ---------- Emotes: caras de Pac-Man sobre tu jugador ----------
   * El orden es el de las teclas 1..6. id = expresión que dibuja
   * Sprites.drawPacFace; name solo se usa para las etiquetas de los botones. */
  CFG.EMOTES = [
    { id: 'risa',   name: 'RISA' },
    { id: 'llanto', name: 'LLANTO' },
    { id: 'enfado', name: 'ENFADO' },
    { id: 'susto',  name: 'SUSTO' },
    { id: 'guino',  name: 'GUIÑO' },
    { id: 'amor',   name: 'AMOR' }
  ];
  CFG.EMOTE_TICKS = 150;      // 2.5 s en pantalla
  /* la maestría dura más que un emote: su emblema se arma a velocidad real
   * (TOP MUNDIAL tarda 2,5 s) y luego tiene que verse entero un rato */
  CFG.BADGE_TAG_TICKS = 330;  // 5.5 s
  CFG.EMOTE_COOLDOWN = 72;    // 1.2 s entre emotes (antispam)

  /* ---------- TIENDA (aprobada el 15 de septiembre de 2026) ----------
   * Se compra con MONEDAS que se ganan jugando. Nada de dinero de verdad.
   *
   * Qué se vende, por categoría y no por rareza: EMOTES 150, EFECTOS 250
   * (lo que deja al pasar), ACCESORIOS 450 (lo que lleva puesto) y SKINS de
   * tienda 1.500. Las de nivel, logro y temporada NO se venden.
   *
   * Todos empiezan con 1.500. Se gana 5 por partida (si dura un minuto: si no,
   * se ganarían reiniciando) más 1 por cada 1.000 puntos, con un tope de 40 por
   * partida; 20 por cada reto del DAILY y 150 por la semana entera.
   *
   * Se lleva a la vez UNA skin, UN accesorio, UN efecto y SEIS emotes (uno
   * por tecla del 1 al 6). Los accesorios solo lucen en skins con forma de
   * Pac-Man: en una extravagante flotarían fuera de su cara.
   *
   * Nada de esto es una tabla nueva en la nube: lo ganado y lo comprado son
   * contadores de PM.Achievements (`monedas` y `c_<id>`), así que viajan a la
   * cuenta con los logros y se juntan igual (lo mejor de cada lado). El saldo
   * no se guarda: se calcula (1.500 + ganado − precio de lo comprado). */
  /* CONTINUAR (17 sep 2026): al quedarte sin vidas, 10 segundos para pagar
   * 1.000 monedas y seguir en el mismo nivel con 1 vida. En todos los modos
   * con vidas propias (no en PAC-MAN VS. ni en CACERÍA). En party paga cada
   * uno por sí mismo, y quien no paga se queda mirando sin salirse. La
   * partida continuada cuenta entera para el TOP MUNDIAL. */
  CFG.CONTINUAR = {
    PRECIO: 1000,
    VIDAS: 1,
    TICKS: 600,          // 10 s para decidir
    ESPERA_RED: 180      // lo que espera un invitado a que el anfitrión conteste
  };

  /* REVIVIR AL COMPAÑERO (17 sep 2026). Con vidas propias, quien se queda
   * sin vidas deja su cuerpo en el laberinto: si un compañero le pasa por
   * encima PASADAS veces antes de CUERPO_TICKS (15 s), vuelve con 1 vida y ESCUDO_TICKS
   * de escudo. Si el cuerpo desaparece, al acabar el nivel puede pagar el
   * CONTINUAR (CFG.CONTINUAR) para volver en el siguiente. */
  CFG.REVIVIR = {
    PASADAS: 5,
    CUERPO_TICKS: 900,    // 15 s para llegar a levantarlo (17 sep: lo pidió Braighton)
    ESCUDO_TICKS: 300,    // 5 s
    VIDAS: 1,
    TOCA_PX: 5            // cuánto hay que acercarse para contar una pasada
  };

  CFG.TIENDA = {
    INICIALES: 1500,
    POR_PARTIDA: 20,
    PARTIDA_MIN_S: 60,
    POR_MIL: 4,
    TOPE_PARTIDA: 200,
    POR_RETO: 100,
    POR_SEMANA: 800,
    EMOTE_TECLAS: 6,
    /* REGALO DE VETERANO (15 de septiembre, opción A elegida por Braighton):
     * quien ya había jugado antes de la tienda no empieza igual que quien
     * llega hoy. Una sola vez, con lo que lleves: 5 por partida jugada y 50
     * por logro conseguido, sin tope. Lo de después se gana como todo el
     * mundo. */
    VETERANO_POR_PARTIDA: 5,
    VETERANO_POR_LOGRO: 50
  };
  /* ============================================================
   * EL PASE DE TEMPORADA (19 de septiembre de 2026)
   *
   * POR QUÉ ASÍ. El día que esto se cobre, el error que no se puede cometer
   * es montar la temporada como regalo y ponerle precio después: eso se
   * siente como quitar algo y la gente se enfada con razón. Por eso nace ya
   * con DOS CARRILES, los dos a la vista desde el primer día —uno gratis y
   * uno de pago—, y el de pago se queda con su candado hasta que haya
   * jugadores y haya identidad nueva (sin eso no se puede cobrar nada; ver
   * PENDIENTE). Cuando llegue el momento no se le quita nada a nadie: se
   * enciende VENTA y ya está.
   *
   * QUÉ NO GUARDA. Ningún saldo y ninguna lista de premios cobrados. Solo dos
   * contadores por temporada, de los que solo crecen (js/achievements.js):
   *
   *   px_AAAA-MM  la experiencia de esa temporada
   *   pp_AAAA-MM  1 si tiene el carril de pago de esa temporada
   *
   * Todo lo demás se DERIVA de ahí: el galón es la experiencia partida por
   * POR_GALON, las piezas se ponen con el mismo contador que una compra (que
   * es un máximo, así que volver a ponerlas no hace nada) y las monedas se
   * suman al saldo en el momento de calcularlo, como ya hace la tienda con el
   * regalo de veterano. Así juntar dos aparatos no puede duplicar un premio
   * ni perderlo, y recargar la página tampoco regala nada.
   *
   * LA TEMPORADA es el mes natural que ya usa el top mundial
   * (js/temporadas.js), sin nada que abrir ni cerrar a mano.
   * ============================================================ */
  CFG.PASE = {
    /* EL INTERRUPTOR. En false el carril de pago se ve, con su candado y sus
     * premios a la vista, pero pone PRÓXIMAMENTE en vez de un precio y no hay
     * forma de comprarlo. No encender hasta que haya identidad propia:
     * cobrar con el aspecto de hoy es lo que convierte el riesgo legal en
     * real (ver PENDIENTE, «cambiar la identidad»). */
    VENTA: false,
    /* Lo que costará, para tenerlo escrito. En soles, que es donde se juega. */
    PRECIO: { moneda: 'PEN', importe: 15 },

    GALONES: 30,        // escalones de una temporada
    /* Lo que cuesta cada galón. La cuenta que fija este número: quien echa
     * cuatro partidas de 10.000 puntos al día y hace el reto del DAILY gana
     * unas 340 monedas, o sea 1.700 de experiencia. A 1.500 por galón, los
     * treinta le salen en unos 26 días, que es justo lo que se busca: que el
     * que juega a diario lo termine rozando el final del mes y no a mitad.
     * Con 1.000 se acababa en 18 días y las dos últimas semanas ya no
     * empujaban a nada. */
    POR_GALON: 1500,

    /* DE DÓNDE SALE LA EXPERIENCIA: de las monedas. Cada moneda que se gana
     * jugando da además esta experiencia de temporada, y no hay más reglas.
     *
     * Se hizo así a propósito en vez de una tabla aparte (tanto por partida,
     * tanto por reto, tanto por maestría): esa tabla habría que mantenerla en
     * paralelo a la de la tienda, y el día que se toque una sin la otra el
     * camino se descuadra sin que nadie se entere. Atado a las monedas, el
     * equilibrio se ajusta en un sitio y nunca hay dos verdades. También
     * significa que quien ya sabe cuánto paga una partida sabe cuánto sube.
     *
     * Con los números de hoy: una partida normal (unos 60) sube 300, el reto
     * del DAILY 500 y la semana entera 4.000. Quien echa tres o cuatro
     * partidas al día y hace el reto termina el camino en unas tres semanas;
     * quien juega una suelta de vez en cuando se queda por el tercio, lo ve,
     * y esa es justo la sensación que hace que valga la pena seguir. */
    XP_POR_MONEDA: 5,

    /* CUÁNDO EMPIEZA. Antes de este mes el pase está dormido y no cambia
     * nada: una temporada que arranca a mitad de mes nace coja. No hay
     * ninguna lista de meses que mantener — los contadores de cada temporada
     * nacen solos el día que hacen falta (js/achievements.js, tipoSuelto). */
    DESDE: '2026-10',

    /* EL CAMINO. Un escalón por galón: TODOS pagan algo.
     *
     * Hasta el 20 de septiembre solo pagaban nueve, y los veintiún huecos de
     * en medio se veían: subir de galón no daba nada y el camino dejaba de
     * tirar justo donde hay que seguir jugando. El reparto de ahora mueve el
     * MISMO dinero del mes —unas 1.170 monedas el carril gratis y 2.830 el de
     * pago— solo que repartido en los treinta escalones: 30 y 70 en un galón
     * normal, 60 y 150 cada cinco, y 150 y 400 al final.
     *
     * Cada lado puede llevar monedas y una pieza del vestuario (por su id).
     * Las EXCLUSIVAS de la temporada van en los hitos, y NO se ponen aquí las
     * de cofre (PLAN-COFRES.md) ni las de la tienda: cada cosa tiene que
     * salir de su sitio o las tres economías se pisan. */
    /* `hito`: el escalón que rompe la fila y se enseña al doble de ancho.
     * Va escrito aquí y no lo deduce la pantalla de las cifras, porque lo que
     * hace grande a un galón es lo que se pone EN él (la pieza del mes, el
     * cofre, el final), no cuántas monedas paga. */
    CAMINO: [
      { g:  1, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g:  2, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g:  3, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g:  4, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g:  5, gratis: { monedas: 60 }, pago: { monedas: 150 } },
      { g:  6, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g:  7, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g:  8, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g:  9, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 10, gratis: { monedas: 60, id: 'grito' }, pago: { monedas: 150, id: 'acc_mochila' }, hito: true },
      { g: 11, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 12, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 13, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 14, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 15, gratis: { monedas: 60 }, pago: { monedas: 150 } },
      { g: 16, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 17, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 18, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 19, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 20, gratis: { monedas: 60 }, pago: { monedas: 150, id: 'efx_ecto' }, hito: true },
      { g: 21, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 22, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 23, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 24, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 25, gratis: { monedas: 60 }, pago: { monedas: 150 } },
      { g: 26, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 27, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 28, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 29, gratis: { monedas: 30 }, pago: { monedas: 70 } },
      { g: 30, gratis: { monedas: 150, id: 'acc_visor' }, pago: { monedas: 400, id: 'trampa' }, hito: true }
    ]
  };

  /* Emotes de la tienda (las caras están en js/skins.js, caraEmote). Los seis
   * de CFG.EMOTES son de todos. */
  CFG.EMOTES_TIENDA = [
    { id: 'dormido', name: 'DORMIDO', precio: 150,
      ve: 'SE QUEDA FRITO: OJOS CERRADOS, CABEZA LADEADA Y TRES ZETAS QUE SE ESCAPAN.' },
    { id: 'burla', name: 'BURLA', precio: 150,
      ve: 'UN OJO APRETADO DE PÍCARO, LA CEJA ARQUEADA Y UN LENGÜETAZO QUE MENEA DE LADO.' },
    { id: 'chulo', name: 'CHULO', precio: 150,
      ve: 'MEWING DE MEME: MANDÍBULA DE ACERO, CEJA LEVANTADA Y EL DEDO EN LOS LABIOS.' },
    { id: 'mareo', name: 'MAREO', precio: 150,
      ve: 'OJOS EN ESPIRAL, BOCA ONDULADA Y ESTRELLITAS DANDO VUELTAS.' },
    { id: 'ko', name: 'K.O.', precio: 150,
      ve: 'OJOS EN X, LA LENGUA FUERA Y UN FANTASMITA QUE SE LE ESCAPA HACIA ARRIBA.' },
    { id: 'jajaja', name: 'JAJAJA', precio: 150,
      ve: 'SE PARTE DE RISA CON LOS OJOS APRETADOS Y LAS LÁGRIMAS SALTANDO.' },
    { id: 'enserio', name: '¿EN SERIO?', precio: 150,
      ve: 'PÁRPADOS A MEDIA ASTA, UNA CEJA LEVANTADA Y TRES PUNTITOS.' },
    { id: 'lloron', name: 'LLORÓN', precio: 150,
      ve: 'DOS CATARATAS QUE NO PARAN, LA BOCA TEMBLANDO Y UN CHARQUITO QUE SE VA HACIENDO ABAJO.' },
    { id: 'ardiendo', name: 'ARDIENDO', precio: 150,
      ve: 'CEJAS DE ENFADO Y DOS LLAMAS EN LOS OJOS QUE NO PARAN DE MOVERSE.' },
    { id: 'beso', name: 'BESO', precio: 150,
      ve: 'UN OJO GUIÑADO, LOS LABIOS FRUNCIDOS Y UN CORAZÓN QUE SE ESCAPA HACIA ARRIBA.' },
    { id: 'idea', name: 'IDEA', precio: 150,
      ve: 'UNA CEJA LEVANTADA, TRES PUNTITOS Y UNA BOMBILLA QUE SE LE ENCIENDE DE GOLPE.' },
    { id: 'gg', name: 'GG', precio: 150,
      ve: 'LE CAEN UNAS GAFAS DE SOL SOBRE LOS OJOS Y SALE UN "GG" A UN LADO.' },
    /* --- tanda del 18 sep --- */
    { id: 'silbando', name: 'SILBANDO', precio: 150,
      ve: 'SILBA MIRANDO ARRIBA Y AL LADO CONTRARIO, CON TRES NOTAS QUE SE LE ESCAPAN.' },
    { id: 'plis', name: 'PLIS', precio: 150,
      ve: 'OJAZOS DE CACHORRO CON DOS BRILLOS, CEJAS DE PENA Y LA BOCA TEMBLANDO.' },
    { id: 'ambicioso', name: 'AMBICIOSO', precio: 150,
      ve: 'LOS OJOS SE LE VUELVEN MONEDAS QUE GIRAN Y SE LE CAE LA BABA.' },
    { id: 'nervios', name: 'NERVIOS', precio: 150,
      ve: 'OJOS DE SUSTO, SONRISA FORZADA Y GOTONES DE SUDOR QUE RESBALAN.' },
    { id: 'arcoiris', name: 'ARCOÍRIS', precio: 150,
      ve: 'CON CARA DE LOCO, VOMITA UN ARCOÍRIS QUE LE SALE DE LA BOCA.' },
    /* del PASE: no se vende (ver CFG.PASE.CAMINO) */
    { id: 'grito', name: 'GRITO', pase: true, precio: 0,
      ve: 'EL GRITO DEL CUADRO: LAS DOS MANOS EN LA CARA, OJOS DE ESPANTO Y LA BOCA EN UN ÓVALO QUE LATE.' }
  ];
  /* Todas las caras que pueden ir en una tecla de emote (y por la red) */
  CFG.EMOTE_IDS = CFG.EMOTES.concat(CFG.EMOTES_TIENDA).map(function (e) { return e.id; });
  CFG.EFECTOS = [
    { id: 'efx_corazones', name: 'CORAZONES', precio: 250,
      ve: 'DEJA UNA FILA DE CORAZONCITOS POR SU CAMINO QUE SE ENCOGEN Y SE APAGAN.' },
    { id: 'efx_notas', name: 'NOTAS', precio: 250,
      ve: 'UNA FILA DE NOTAS MUSICALES POR DONDE PASA.' },
    { id: 'efx_burbujas', name: 'BURBUJAS', precio: 250,
      ve: 'BURBUJAS EN FILA DETRÁS QUE CRECEN Y REVIENTAN.' },
    { id: 'efx_huellas', name: 'HUELLAS', precio: 250,
      ve: 'PISADAS DE SU COLOR QUE SE BORRAN POCO A POCO Y DOBLAN LAS ESQUINAS CON ÉL.' },
    { id: 'efx_chispas', name: 'CHISPAS', precio: 250,
      ve: 'AL GIRAR EN UNA ESQUINA ESTALLA UN FOGONAZO CON CHISPAS Y ASCUAS. EN UN PASILLO LARGO NO HACE NADA.' },
    { id: 'efx_confeti', name: 'CONFETI', precio: 250,
      ve: 'AL COMERSE UN FANTASMA ESTALLA EN PAPELITOS, SERPENTINAS Y DESTELLOS.' },
    { id: 'efx_estrellas', name: 'ESTRELLAS', precio: 250,
      ve: 'ESTELA DE ESTRELLAS CON HALO QUE GIRAN Y TITILAN.' },
    { id: 'efx_hojas', name: 'HOJAS', precio: 250,
      ve: 'HOJAS DE OTOÑO QUE SE QUEDAN EN FILA GIRANDO.' },
    { id: 'efx_nieve', name: 'NIEVE', precio: 250,
      ve: 'COPOS DE NIEVE EN FILA QUE GIRAN Y SE DERRITEN.' },
    { id: 'efx_rayos', name: 'RAYOS', precio: 250,
      ve: 'AURA ELÉCTRICA SUAVE Y, DE VEZ EN CUANDO, RAYOS CORTOS QUE SALTAN DEL CUERPO.' },
    { id: 'efx_tinta', name: 'TINTA', precio: 250,
      ve: 'UN REGUERO DE TINTA MORADA QUE SE SECA Y SE VA AGRIETANDO DETRÁS DE ÉL.' },
    { id: 'efx_petalos', name: 'PÉTALOS', precio: 250,
      ve: 'PÉTALOS ROSAS QUE CAEN GIRANDO POR DONDE PASA Y SE POSAN EN EL SUELO.' },
    { id: 'efx_monedas', name: 'MONEDAS', precio: 250,
      ve: 'AL COMERSE UN FANTASMA SALTAN MONEDAS QUE GIRAN Y CAEN. SON DE ADORNO: NO VALEN NADA.' },
    { id: 'efx_humo', name: 'HUMO', precio: 250,
      ve: 'AL ARRANCAR DE PARADO SUELTA BOCANADAS DE HUMO QUE CRECEN Y SE DESHACEN.' },
    /* --- tanda del 18 sep --- */
    { id: 'efx_pixeles', name: 'PÍXELES', precio: 250,
      ve: 'AL PASAR SE VA DESHACIENDO EN BLOQUES DE COLORES QUE CAEN Y SE APAGAN.' },
    { id: 'efx_ondas', name: 'ONDAS', precio: 250,
      ve: 'EN CADA GIRO DEJA UN ANILLO DE SU COLOR QUE SE ABRE Y SE DESVANECE.' },
    { id: 'efx_mariposas', name: 'MARIPOSAS', precio: 250,
      ve: 'UNA FILA DE MARIPOSAS QUE ALETEAN Y SE VAN SUBIENDO POR DETRÁS.' },
    { id: 'efx_frutas', name: 'FRUTAS', precio: 250,
      ve: 'CEREZAS, FRESAS Y NARANJAS QUE VAN BOTANDO POR EL CAMINO.' },
    /* de COFRE: no se compran (PLAN-COFRES.md) */
    { id: 'efx_fantasmitas', name: 'FANTASMITAS', cofre: true, precio: 0,
      ve: 'SE LE ESCAPAN FANTASMAS DIMINUTOS DE LOS CUATRO COLORES, QUE SUBEN Y SE APAGAN.' },
    { id: 'efx_ojos', name: 'OJOS', cofre: true, precio: 0,
      ve: 'DEJA OJOS ABIERTOS QUE TE SIGUEN CON LA MIRADA Y SE VAN CERRANDO AL APAGARSE.' },
    { id: 'efx_portales', name: 'PORTALES', cofre: true, precio: 0,
      ve: 'SU ESTELA SON PORTALITOS MORADOS QUE SE ABREN Y SE CIERRAN. GUIÑO AL MAGO.' },
    { id: 'efx_constelacion', name: 'CONSTELACIÓN', cofre: true, precio: 0,
      ve: 'DEJA UNA ESTRELLA EN CADA GIRO Y LAS UNE CON UNA LÍNEA: EL CAMINO QUEDA DIBUJADO HASTA QUE SE APAGA.' },
    /* del PASE: no se vende (ver CFG.PASE.CAMINO) */
    { id: 'efx_ecto', name: 'ECTOPLASMA', pase: true, precio: 0,
      ve: 'UN REGUERO DE BABA VERDE FOSFORESCENTE CON BURBUJAS QUE ASOMAN Y REVIENTAN.' }
  ];
  CFG.ACCESORIOS = [
    { id: 'acc_gafas', name: 'GAFAS DE SOL', precio: 450,
      ve: 'GAFAS DE PASTA CON CRISTAL AHUMADO Y UN REFLEJO QUE LAS CRUZA.' },
    { id: 'acc_afiladas', name: 'GAFAS AFILADAS', precio: 450,
      ve: 'GAFAS DE PANDILLA: CRISTAL NEGRO CON LA PUNTA MUY AFILADA Y REFLEJOS LILA.' },
    { id: 'acc_bigote', name: 'MOSTACHO', precio: 450,
      ve: 'MOSTACHO FRONDOSO QUE SUBE Y BAJA CON LA BOCA Y SE RETUERCE LAS PUNTAS.' },
    { id: 'acc_auriculares', name: 'AURICULARES', precio: 450,
      ve: 'DIADEMA POR ENCIMA DE LA CABEZA Y UN AURICULAR ROJO.' },
    { id: 'acc_gorra', name: 'GORRA', precio: 450,
      ve: 'GORRA AZUL CON LA VISERA HACIA DELANTE.' },
    { id: 'acc_pajarita', name: 'PAJARITA', precio: 450,
      ve: 'PAJARITA BLANCA DE LUNARES QUE SE MECE AL CORRER.' },
    { id: 'acc_parche', name: 'PARCHE PIRATA', precio: 450,
      ve: 'PARCHE NEGRO SOBRE EL OJO CON LA CINTA CRUZANDO LA CABEZA.' },
    { id: 'acc_chistera', name: 'CHISTERA', precio: 450,
      ve: 'SOMBRERO DE COPA CON LA CINTA DE SU COLOR.' },
    { id: 'acc_vikingo', name: 'CASCO VIKINGO', precio: 450,
      ve: 'CASCO DE METAL CON REMACHES Y DOS CUERNOS.' },
    { id: 'acc_helice', name: 'GORRO DE HÉLICE', precio: 450,
      ve: 'GORRITO DE CUATRO COLORES CON UNA HÉLICE QUE NO PARA.' },
    { id: 'acc_ninja', name: 'CINTA NINJA', precio: 450,
      ve: 'CINTA ROJA CON PLACA Y LAS PUNTAS ONDEANDO DETRÁS.' },
    { id: 'acc_espartano', name: 'CASCO ESPARTANO', precio: 450,
      ve: 'CASCO DE BRONCE CON GUARDANARIZ Y UNA CRESTA ROJA QUE SE VA HACIA ATRÁS AL CORRER.' },
    { id: 'acc_antenas', name: 'ANTENAS', precio: 450,
      ve: 'DOS ANTENAS DE MARCIANO CON SU BOLITA, QUE REBOTAN AL CAMBIAR DE DIRECCIÓN.' },
    { id: 'acc_bufanda', name: 'BUFANDA', precio: 450,
      ve: 'BUFANDA A RAYAS AL CUELLO: CUANTO MÁS CORRE, MÁS TIESA SE LE PONE DETRÁS.' },
    { id: 'acc_cuernos', name: 'CUERNOS', precio: 450,
      ve: 'DOS CUERNOS ROJOS CURVADOS. NO DAN NINGUNA VENTAJA, PERO LO PARECEN.' },
    { id: 'acc_obra', name: 'CASCO DE OBRA', precio: 450,
      ve: 'CASCO AMARILLO CON LINTERNA QUE PARPADEA. NO ALUMBRA EL LABERINTO: ES ADORNO.' },
    /* --- tanda del 18 sep --- */
    { id: 'acc_chullo', name: 'CHULLO', precio: 450,
      ve: 'GORRO DE LANA CON ZIGZAG ANDINO, POMPÓN ARRIBA Y LA OREJERA MECIÉNDOSE AL CORRER.' },
    { id: 'acc_mohicano', name: 'MOHICANO', precio: 450,
      ve: 'NUEVE PINCHOS RECTOS DE LA FRENTE A LA NUCA, BARRIDOS HACIA ATRÁS Y CON LOS LADOS RAPADOS.' },
    { id: 'acc_vaquero', name: 'SOMBRERO VAQUERO', precio: 450,
      ve: 'SOMBRERO DE CUERO CON EL ALA CURVADA, CINTA NEGRA Y UNA CHAPA DORADA.' },
    { id: 'acc_orejas', name: 'OREJAS DE GATO', precio: 450,
      ve: 'DOS OREJAS DE GATO, ROSAS POR DENTRO, QUE SE MUEVEN SOLAS CADA POCO.' },
    { id: 'acc_buceo', name: 'GAFAS DE BUCEO', precio: 450,
      ve: 'GAFAS DE CRISTAL AZUL CON SU CORREA Y UN TUBO QUE SUELTA BURBUJITAS.' },
    /* de COFRE: no se compran (PLAN-COFRES.md) */
    { id: 'acc_luchador', name: 'MÁSCARA DE LUCHADOR', cofre: true, precio: 0,
      ve: 'MÁSCARA DE LUCHA LIBRE: TELA AZUL, LLAMAS DORADAS ALREDEDOR DEL OJO Y LOS CORDONES CRUZADOS DETRÁS.' },
    { id: 'acc_patito', name: 'FLOTADOR DE PATITO', cofre: true, precio: 0,
      ve: 'UN FLOTADOR DE PATO DE GOMA A LA CINTURA, CON SU CABEZA DELANTE Y LA COLITA DETRÁS.' },
    { id: 'acc_aureola', name: 'AUREOLA', cofre: true, precio: 0,
      ve: 'UN ARO DE LUZ FLOTANDO SOBRE LA CABEZA QUE SE INCLINA AL GIRAR, COMO SI PESARA.' },
    { id: 'acc_alas', name: 'ALITAS', cofre: true, precio: 0,
      ve: 'DOS ALITAS BLANCAS A LOS LADOS QUE BATEN DE GOLPE AL COMERSE UN FANTASMA.' },
    /* del PASE: no se compran ni salen de cofre (ver CFG.PASE.CAMINO) */
    { id: 'acc_mochila', name: 'MOCHILA DE PROTONES', pase: true, precio: 0,
      ve: 'EL APARATO A LA ESPALDA: ALETAS DE REFRIGERACIÓN, EL ACELERADOR LATIENDO EN VERDE Y LA MANGUERA QUE DEJA EL CAÑÓN SOBRE LA CORONILLA. VIBRA Y SUELTA VAPOR.' },
    { id: 'acc_visor', name: 'VISOR DE CAZA', pase: true, precio: 0,
      ve: 'VISOR DE CRISTAL VERDE CON UN BARRIDO QUE SUBE Y BAJA, Y AL LADO EL MEDIDOR CON TRES BARRITAS QUE SUBEN SOLAS.' }
  ];
  CFG.EFECTO_IDS = CFG.EFECTOS.map(function (e) { return e.id; });
  CFG.ACCESORIO_IDS = CFG.ACCESORIOS.map(function (e) { return e.id; });

  /* ---------- Maestrías (insignias por récord personal) ---------- */
  CFG.BADGES = [
    { id: 'aprendiz', name: 'APRENDIZ',    points: 3000,   color: '#ffffff' },
    { id: 'cazador',  name: 'CAZADOR',     points: 8000,   color: '#00ffff' },
    { id: 'experto',  name: 'EXPERTO',     points: 15000,  color: '#00ff00' },
    { id: 'maestro',  name: 'MAESTRO',     points: 30000,  color: '#ffb8ff' },
    { id: 'leyenda',  name: 'LEYENDA',     points: 60000,  color: '#ff8c00' },
    { id: 'mundial',  name: 'TOP MUNDIAL', points: 100000, color: '#ffff00' }
  ];
  CFG.BADGES_KEY = 'pacman-topmundial-maestrias';

  /* ---------- Logros ----------
   * Todos se resuelven contra un CONTADOR guardado, nunca contra el estado
   * de la partida: así se pueden recalcular en cualquier momento (al entrar
   * en una cuenta, por ejemplo) sin depender de cuándo pasó la cosa.
   *
   *   stat  — clave del contador (PM.Achievements.stats())
   *   goal  — a partir de cuánto se consigue
   *   menor — el contador es un tiempo: cuenta si es MENOR o igual que goal
   *   fmt   — cómo se enseña el progreso ('n' número, 'tiempo' mm:ss.cc)
   *   modo  — en qué modo hay que conseguirlo (sin él, en cualquiera)
   *
   * LOS MODOS
   * Cada partida lleva unas ETIQUETAS (Game.achTags) y cada contador se
   * apunta dos veces: una global y otra por etiqueta, con la clave
   * `modo:stat`. Así un mismo logro —"cómete 100 fantasmas"— puede existir
   * suelto y por modo sin escribir nada a mano: el contador de cada modo
   * sale solo de esta tabla (js/achievements.js).
   *
   * Las etiquetas NO son excluyentes entre formato y modo: una party de
   * habilidades cuenta para las dos. Lo que sí es excluyente es el modo en
   * sí (o es reto, o es laberinto, o es VS., o es habilidades, o es el
   * clásico), porque no se pueden mezclar.
   *
   * Todos salen en la MISMA lista; lo que cambia es que el modo va delante
   * de la descripción, para saber dónde hay que buscarlo. */
  CFG.ACH_MODOS = {
    clasico: { name: 'CLÁSICO',      color: '#ffff00' },
    party:   { name: 'PARTY',        color: '#00ff00' },
    daily:   { name: 'DAILY',        color: '#00ffff' },
    lab:     { name: 'LABERINTOS',   color: '#ffb852' },
    vs:      { name: 'PAC-MAN VS.',  color: '#ff0000' },
    hab:     { name: 'DESATADO',     color: '#ff66cc' },
    caza:    { name: 'CACERÍA',      color: '#ffb8ff' }
  };
  /* Nombre del modo de un logro, para la interfaz */
  CFG.achModoName = function (a) {
    var m = a && a.modo && CFG.ACH_MODOS[a.modo];
    return m ? m.name : 'CUALQUIER MODO';
  };

  CFG.ACH_KEY = 'pacman-topmundial-logros';
  CFG.ACHIEVEMENTS = [
    /* ---- de cualquier modo: los de siempre, valen jugando a lo que sea ---- */
    { id: 'doblete',     name: 'DOBLETE',      color: '#ffffff',
      desc: '2 FANTASMAS CON UN MISMO ENERGIZANTE', stat: 'racha', goal: 2 },
    { id: 'triplete',    name: 'TRIPLETE',     color: '#00ffff',
      desc: '3 FANTASMAS CON UN MISMO ENERGIZANTE', stat: 'racha', goal: 3 },
    { id: 'festin',      name: 'FESTÍN',       color: '#ffff00',
      desc: 'LOS 4 FANTASMAS CON UN MISMO ENERGIZANTE', stat: 'racha', goal: 4 },
    { id: 'caza50',      name: 'CAZADOR',      color: '#ffffff',
      desc: 'CÓMETE 50 FANTASMAS', stat: 'fantasmas', goal: 50 },
    { id: 'caza250',     name: 'DEPREDADOR',   color: '#00ff00',
      desc: 'CÓMETE 250 FANTASMAS', stat: 'fantasmas', goal: 250 },
    { id: 'caza1000',    name: 'AZOTE',        color: '#ff8c00',
      desc: 'CÓMETE 1000 FANTASMAS', stat: 'fantasmas', goal: 1000 },
    { id: 'impecable',   name: 'IMPECABLE',    color: '#ffffff',
      desc: 'DESPEJA UN NIVEL SIN MORIR', stat: 'limpios', goal: 1 },
    { id: 'intachable',  name: 'INTACHABLE',   color: '#00ffff',
      desc: '3 NIVELES SEGUIDOS SIN MORIR', stat: 'limpios', goal: 3 },
    { id: 'inmaculado',  name: 'INMACULADO',   color: '#ffb8ff',
      desc: '5 NIVELES SEGUIDOS SIN MORIR', stat: 'limpios', goal: 5 },
    { id: 'frutero',     name: 'FRUTERO',      color: '#ff0000',
      desc: 'CÓMETE 25 FRUTAS', stat: 'frutas', goal: 25 },
    { id: 'veterano',    name: 'VETERANO',     color: '#ffb852',
      desc: 'JUEGA 100 PARTIDAS', stat: 'partidas', goal: 100 },
    { id: 'explorador',  name: 'EXPLORADOR',   color: '#00ff00',
      desc: 'LLEGA AL NIVEL 5', stat: 'nivelMax', goal: 5 },
    { id: 'trotamundos', name: 'TROTAMUNDOS',  color: '#ffb8ff',
      desc: 'LLEGA AL NIVEL 10', stat: 'nivelMax', goal: 10 },
    { id: 'centurion',   name: 'CENTURIÓN',    color: '#ffff00',
      desc: '20.000 PUNTOS EN UNA PARTIDA', stat: 'puntosMax', goal: 20000 },
    { id: 'relampago',   name: 'RELÁMPAGO',    color: '#00ffff',
      desc: 'DESPEJA EL NIVEL 1 EN MENOS DE 1:30', stat: 'mejorT1',
      goal: 9000, menor: true, fmt: 'tiempo' },

    /* ---- CLÁSICO: el laberinto de 1980, sin poderes y sin inventos ---- */
    { id: 'cl_purista',  name: 'PURISTA',      color: '#ffff00', modo: 'clasico',
      desc: 'JUEGA 50 PARTIDAS', stat: 'partidas', goal: 50 },
    { id: 'cl_altovuelo', name: 'ALTO VUELO',  color: '#ffff00', modo: 'clasico',
      desc: '30.000 PUNTOS EN UNA PARTIDA', stat: 'puntosMax', goal: 30000 },
    { id: 'cl_maraton',  name: 'MARATÓN',      color: '#ffff00', modo: 'clasico',
      desc: 'LLEGA AL NIVEL 8', stat: 'nivelMax', goal: 8 },

    /* ---- PARTY: dos, tres o cuatro, en el mismo teclado o por red ---- */
    { id: 'pt_companero', name: 'COMPAÑERO',   color: '#00ff00', modo: 'party',
      desc: 'JUEGA 20 PARTIDAS ACOMPAÑADO', stat: 'partidas', goal: 20 },
    { id: 'pt_batida',   name: 'BATIDA',       color: '#00ff00', modo: 'party',
      desc: 'CÓMETE 100 FANTASMAS', stat: 'fantasmas', goal: 100 },
    { id: 'pt_cuadrilla', name: 'CUADRILLA',   color: '#00ff00', modo: 'party',
      desc: '20.000 PUNTOS EN UNA PARTIDA', stat: 'puntosMax', goal: 20000 },

    /* ---- DAILY: los siete retos de la semana (js/daily.js) ----
     * Conservan los identificadores del RETO DE HOY que hubo antes (rt_*): el
     * modo se retiró, pero quien ya tuviera esos logros no tiene por qué
     * perderlos, y el contador viejo siembra el nuevo (sembrarDaily). */
    { id: 'rt_constante', name: 'CONSTANTE',   color: '#00ffff', modo: 'daily',
      desc: 'CUMPLE 10 RETOS DIARIOS', stat: 'dailyOk', goal: 10 },
    { id: 'rt_pulso',    name: 'PULSO FIRME',  color: '#00ffff', modo: 'daily',
      desc: 'CUMPLE RETOS 7 DÍAS SEGUIDOS', stat: 'dailyRacha', goal: 7 },
    { id: 'rt_redondo',  name: 'SEMANA REDONDA', color: '#00ffff', modo: 'daily',
      desc: 'CUMPLE LOS 7 RETOS DE UNA SEMANA', stat: 'dailySemana', goal: 1 },

    /* ---- LABERINTOS: otros trazados, los mismos fantasmas ---- */
    { id: 'lb_turista',  name: 'TURISTA',      color: '#ffb852', modo: 'lab',
      desc: 'JUEGA 10 PARTIDAS', stat: 'partidas', goal: 10 },
    { id: 'lb_sinmapa',  name: 'SIN MAPA',     color: '#ffb852', modo: 'lab',
      desc: 'DESPEJA UN NIVEL SIN MORIR', stat: 'limpios', goal: 1 },
    { id: 'lb_cartografo', name: 'CARTÓGRAFO', color: '#ffb852', modo: 'lab',
      desc: '15.000 PUNTOS EN UNA PARTIDA', stat: 'puntosMax', goal: 15000 },

    /* ---- PAC-MAN VS.: los de llevar tú al fantasma ---- */
    { id: 'vs_caza5',    name: 'A LA CAZA',    color: '#ff0000', modo: 'vs',
      desc: 'CAZA 5 PAC-MAN LLEVANDO UN FANTASMA', stat: 'cazas', goal: 5 },
    { id: 'vs_caza25',   name: 'PESADILLA',    color: '#ff0000', modo: 'vs',
      desc: 'CAZA 25 PAC-MAN LLEVANDO UN FANTASMA', stat: 'cazas', goal: 25 },
    { id: 'vs_otrolado', name: 'DEL OTRO LADO', color: '#ff0000', modo: 'vs',
      desc: 'JUEGA 10 PARTIDAS', stat: 'partidas', goal: 10 },

    /* ---- DESATADO: Q, W, E y R ---- */
    { id: 'hb_dentellada', name: 'DENTELLADA', color: '#ff66cc', modo: 'hab',
      desc: 'CÓMETE 25 FANTASMAS A MORDISCOS (Q)', stat: 'mordiscos', goal: 25 },
    { id: 'hb_parpadeo', name: 'PARPADEO',     color: '#ff66cc', modo: 'hab',
      desc: 'ATRAVIESA 50 MUROS CON EL FLASH (E)', stat: 'muros', goal: 50 },
    { id: 'hb_sobrenatural', name: 'SOBRENATURAL', color: '#ff66cc', modo: 'hab',
      desc: '25.000 PUNTOS EN UNA PARTIDA', stat: 'puntosMax', goal: 25000 },

    /* ---- CACERÍA: todos de fantasma contra la máquina ---- */
    { id: 'cz_jauria',   name: 'JAURÍA',       color: '#ffb8ff', modo: 'caza',
      desc: 'CAZA 10 VECES AL PAC-MAN DE LA MÁQUINA', stat: 'cazas', goal: 10 },
    { id: 'cz_letal',    name: 'LETAL',        color: '#ffb8ff', modo: 'caza',
      desc: 'CÁZALO 3 VECES EN UNA MISMA CACERÍA', stat: 'puntosMax', goal: 3000 },
    { id: 'cz_manada',   name: 'MANADA',       color: '#ffb8ff', modo: 'caza',
      desc: 'JUEGA 10 CACERÍAS', stat: 'partidas', goal: 10 }
  ];
  CFG.ACH_NOTICE_TICKS = 220;   // aviso en partida (~3,7 s)

  /* ---------- Voces de racha al comer fantasmas ----------
   * Una por fantasma comido con el mismo energizante (1.º, 2.º, 3.º, 4.º).
   * Son los únicos archivos de audio del juego; si no se pueden cargar
   * (por ejemplo abriendo el juego con file://) el resto suena igual.
   *
   * Hoy las CUATRO son la misma voz (20 de septiembre de 2026). Se deja una
   * entrada por racha en vez de una sola sirviendo para todas porque así el
   * día que haya cuatro voces distintas basta con cambiar esta lista, sin
   * tocar nada de la cuenta de rachas. El audio se descarga y descodifica una
   * sola vez aunque se repita (js/audio.js, voicePorUrl). */
  CFG.VOICES = [
    'audio/otra-alma.m4a',
    'audio/otra-alma.m4a',
    'audio/otra-alma.m4a',
    'audio/otra-alma.m4a'
  ];
  CFG.VOICE_NAMES = ['OTRA ALMA PARA CRISTO', 'OTRA ALMA PARA CRISTO',
    'OTRA ALMA PARA CRISTO', 'OTRA ALMA PARA CRISTO'];

  /* La entradilla de DESATADO: en ese modo, en vez de la melodía de siempre,
   * suena esta voz (js/audio.js, playIntroHab). Si no se puede cargar, suena
   * la melodía de siempre y nadie se entera. */
  CFG.INTRO_HAB = 'audio/desatado-intro.mp3';

  /* ---------- Categorías de volumen ---------- */
  CFG.SOUND_CATS = [
    { key: 'volMaster', name: 'GENERAL' },
    { key: 'volMusic',  name: 'MÚSICA' },
    { key: 'volSfx',    name: 'EFECTOS' },
    { key: 'volLoops',  name: 'AMBIENTE' },
    { key: 'volVoices', name: 'VOCES' }
  ];

  /* ---------- Chat (modo online) ---------- */
  CFG.CHAT_MAX = 40;          // caracteres por mensaje
  CFG.CHAT_TICKS = 420;       // ~7 s visible
  CFG.CHAT_KEEP = 3;          // mensajes a la vez en pantalla
  CFG.CHAT_COOLDOWN = 45;     // 0.75 s entre mensajes

  /* ---------- Ranking mundial (tabla en Supabase) ---------- */
  CFG.RANKING = {
    TABLE: 'ranking',         // donde se insertan las partidas
    VIEW: 'ranking_top',      // mejor marca de cada jugador/dúo (lectura)
    VIEW_TIME: 'ranking_tiempo',  // mejor tiempo de cada jugador en el nivel 1
    VIEW_SEASON: 'ranking_temporada',  // lo mismo, pero mes a mes
    LIMIT: 20,
    MAX_POINTS: 10000000,     // descarta envíos absurdos antes de mandarlos
    MAX_TIME: 6000000         // centésimas: 16 h y pico, de sobra
  };

  /* ---------- DAILY: siete retos por semana ----------
   * Un reto para cada día de la semana, y NO es un modo de juego: se cumplen
   * jugando a lo que se juegue normalmente. Ese era el problema del RETO DE
   * HOY que había antes —una partida aparte, con su semilla y su
   * clasificación—: para jugarlo tenías que dejar de jugar a lo tuyo, y si un
   * día no te apetecía esa partida concreta, no había reto.
   *
   * SEMANA CON RECUPERACIÓN. Los siete se ven desde el lunes; cada uno se
   * abre el día que le toca y se queda abierto hasta que acaba la semana. Así
   * se premia jugar, no estar presente a diario: quien no puede el martes lo
   * cumple el jueves. Lo que sí se pierde es la semana entera cuando cambia.
   *
   * La semana y el día se sacan en UTC, como la fecha del reto viejo: así
   * cambian a la vez en todo el planeta y nadie tiene un día de 48 horas
   * cruzando la medianoche de su huso.
   *
   * CINCO LIBRES Y DOS DE MODO. Los de modo son los que hacen que el Daily
   * enseñe el juego (te asomas a DESATADO o a LABERINTOS porque toca), pero
   * si la semana entera pidiera modos concretos —o peor, gente— habría
   * semanas imposibles para quien juega solo. Cinco libres garantizados es el
   * suelo: siempre hay cinco que se cumplen jugando a lo que sea. */
  CFG.DAILY = {
    KEY: 'pacman-topmundial-daily',
    /* BORRÓN Y CUENTA NUEVA DEL PROGRESO.
     * Cuando esta marca no coincide con la que lleva lo guardado, el progreso
     * del DAILY se tira entero (la semana en curso, la racha y la mejor racha)
     * y se vuelve a empezar. Los LOGROS del DAILY no se tocan: son de quien los
     * hizo y borrarlos sería quitarle algo que ya se ganó.
     *
     * Existe porque el DAILY estuvo un tiempo contando mal el día (iba en UTC:
     * un viernes por la tarde en América ya marcaba sábado), así que hay rachas
     * y semanas guardadas que se hicieron con otro calendario. Se pone la fecha
     * del día en que se decide el borrón; para hacer otro, se cambia el texto y
     * ya está. */
    RESET: '2026-08-15',
    DIAS: 7,
    LIBRES_POR_SEMANA: 5,     // los otros dos salen de la lista de modo
    XP: 2500,                 // experiencia por reto cumplido

    /* PREMIOS DE RACHA. La racha se veía en la cartilla y no daba nada:
     * era un número de adorno. Ahora cada escalón de días seguidos paga,
     * y se cobra una sola vez por racha (si se rompe y se vuelve a subir,
     * se vuelve a cobrar: son otros tantos días de volver). */
    RACHA_PREMIOS: [
      { dias: 3, monedas: 150 },
      { dias: 7, monedas: 400 },
      { dias: 14, monedas: 800 },
      { dias: 30, monedas: 2000 },
      { dias: 60, monedas: 3500 },
      { dias: 100, monedas: 6000 }
    ],
    NOTICE_TICKS: 260,        // aviso en partida (~4,3 s)
    COLOR: '#00ffff',
    DIA_NOMBRE: ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES',
                 'SÁBADO', 'DOMINGO'],
    DIA_CORTO: ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'],

    /* Los retos que se pueden cumplir JUGANDO A CUALQUIER COSA.
     *   id    estable: viaja en lo guardado, no se renombra nunca
     *   desc  qué hay que hacer, tal cual sale en pantalla
     *   stat  contador de PM.Achievements que lo mide (el mismo vocabulario
     *         que los logros: así no hay que contar nada dos veces)
     *   goal  cuánto
     *   menor el contador es un tiempo: cuenta si es MENOR o igual
     *   fmt   cómo se enseña el progreso ('n' número, 'tiempo' mm:ss.cc)
     *
     * Ojo con el tipo de contador (PM.Achievements.BASE): los de 'suma' se
     * acumulan a lo largo del día y los de 'mayor' se quedan con la mejor
     * marca de UNA partida. "Cómete 20 fantasmas" vale a lo largo del día;
     * "12.000 puntos" hay que hacerlos en una sola. */
    LIBRES: [
      { id: 'd_doblete',  desc: '3 FANTASMAS CON UN MISMO ENERGIZANTE',
        stat: 'racha', goal: 3 },
      { id: 'd_festin',   desc: 'LOS 4 FANTASMAS CON UN MISMO ENERGIZANTE',
        stat: 'racha', goal: 4 },
      { id: 'd_batida',   desc: 'CÓMETE 20 FANTASMAS',
        stat: 'fantasmas', goal: 20 },
      { id: 'd_cacería',  desc: 'CÓMETE 40 FANTASMAS',
        stat: 'fantasmas', goal: 40 },
      { id: 'd_frutero',  desc: 'CÓMETE 3 FRUTAS',
        stat: 'frutas', goal: 3 },
      { id: 'd_limpio',   desc: 'DESPEJA UN NIVEL SIN MORIR',
        stat: 'limpios', goal: 1 },
      { id: 'd_doslimpios', desc: 'DESPEJA 2 NIVELES SEGUIDOS SIN MORIR',
        stat: 'limpios', goal: 2 },
      { id: 'd_marca',    desc: '12.000 PUNTOS EN UNA PARTIDA',
        stat: 'puntosMax', goal: 12000 },
      { id: 'd_marcaza',  desc: '20.000 PUNTOS EN UNA PARTIDA',
        stat: 'puntosMax', goal: 20000 },
      { id: 'd_nivel4',   desc: 'LLEGA AL NIVEL 4',
        stat: 'nivelMax', goal: 4 },
      { id: 'd_nivel6',   desc: 'LLEGA AL NIVEL 6',
        stat: 'nivelMax', goal: 6 },
      { id: 'd_tres',     desc: 'JUEGA 3 PARTIDAS',
        stat: 'partidas', goal: 3 },
      { id: 'd_rapido',   desc: 'DESPEJA EL NIVEL 1 EN MENOS DE 2:00',
        stat: 'mejorT1', goal: 12000, menor: true, fmt: 'tiempo' }
    ],

    /* Y los que piden un modo concreto. `modo` es una etiqueta de las que
     * devuelve Game.achTags(): el modo ('clasico', 'lab', 'hab', 'vs') o el
     * formato ('solo', 'party'). Dos por semana como mucho. */
    MODOS: [
      { id: 'd_hab_mordisco', modo: 'hab',
        desc: 'CÓMETE 5 FANTASMAS A MORDISCOS (Q)', stat: 'mordiscos', goal: 5 },
      { id: 'd_hab_muros', modo: 'hab',
        desc: 'ATRAVIESA 15 MUROS CON EL FLASH (E)', stat: 'muros', goal: 15 },
      { id: 'd_hab_marca', modo: 'hab',
        desc: '15.000 PUNTOS EN UNA PARTIDA', stat: 'puntosMax', goal: 15000 },
      { id: 'd_lab_marca', modo: 'lab',
        desc: '8.000 PUNTOS EN OTRO LABERINTO', stat: 'puntosMax', goal: 8000 },
      { id: 'd_lab_limpio', modo: 'lab',
        desc: 'DESPEJA UN NIVEL SIN MORIR EN OTRO LABERINTO',
        stat: 'limpios', goal: 1 },
      { id: 'd_lab_batida', modo: 'lab',
        desc: 'CÓMETE 15 FANTASMAS EN OTRO LABERINTO',
        stat: 'fantasmas', goal: 15 },
      { id: 'd_cl_marca', modo: 'clasico',
        desc: '15.000 PUNTOS EN EL LABERINTO DE 1980',
        stat: 'puntosMax', goal: 15000 },
      { id: 'd_cl_nivel', modo: 'clasico',
        desc: 'LLEGA AL NIVEL 5 EN EL LABERINTO DE 1980',
        stat: 'nivelMax', goal: 5 },
      { id: 'd_solo_marca', modo: 'solo',
        desc: '10.000 PUNTOS JUGANDO SOLO', stat: 'puntosMax', goal: 10000 },
      { id: 'd_party_batida', modo: 'party',
        desc: 'CÓMETE 15 FANTASMAS ACOMPAÑADO', stat: 'fantasmas', goal: 15 },
      { id: 'd_vs_caza', modo: 'vs',
        desc: 'CAZA 2 PAC-MAN LLEVANDO UN FANTASMA', stat: 'cazas', goal: 2 }
    ]
  };

  /* ---------- Récord de velocidad del primer nivel ----------
   * El tiempo se guarda en centésimas de segundo. Solo cuenta a UN jugador,
   * sin red y con los ajustes de siempre: con los fantasmas más lentos o
   * Pac-Man más rápido la marca no sería comparable con la de nadie. */
  CFG.TIME_RULES = {
    ghostSpeedMult: 1, pacSpeedMult: 1, frightMult: 1, startLevel: 1
  };

  /* Palabras vetadas en el top mundial: la clasificación es pública, así que
   * un nombre con esto dentro no se envía (en local se juega igual).
   * Se compara sobre el nombre en mayúsculas y sin espacios ni signos. */
  CFG.BAD_WORDS = [
    'PUTA', 'PUTO', 'MIERDA', 'COÑO', 'CONO', 'JODER', 'GILIPOLL', 'CABRON',
    'MARICA', 'MARICON', 'POLLA', 'VERGA', 'PENE', 'CULO', 'TETAS', 'ZORRA',
    'PERRA', 'PENDEJO', 'CHINGA', 'VIOLA', 'NAZI', 'HITLER',
    'FUCK', 'SHIT', 'BITCH', 'DICK', 'COCK', 'CUNT', 'RAPE', 'NIGG', 'FAG'
  ];

  /* ---------- Historial personal (solo en este navegador) ---------- */
  CFG.HISTORY_KEY = 'pacman-topmundial-historial';
  CFG.HISTORY_MAX = 15;       // partidas guardadas

  /* ---------- Repeticiones de partida (solo en este navegador) ----------
   * Una partida entera cabe en los ajustes más la lista de giros, así que
   * ocupa muy poco; aun así se poda, que localStorage no da para tanto.
   * La del mejor récord no se suelta mientras quede otra cosa que soltar. */
  CFG.REPLAY_KEY = 'pacman-topmundial-repeticiones';
  CFG.REPLAY_MAX = 8;             // repeticiones guardadas
  CFG.REPLAY_MAX_CHARS = 24000;   // texto máximo de UNA repetición (tiene que caber en una URL)
  CFG.REPLAY_TOTAL_CHARS = 90000; // techo de todas juntas
  CFG.REPLAY_MAX_ENTRADAS = 20000;// giros máximos en una repetición

  /* ---------- Ver una repetición como un vídeo ----------
   * Una repetición no guarda posiciones: guarda los giros y la partida se
   * vuelve a simular, así que ir hacia atrás costaría rehacerla entera cada
   * vez. Por eso, al abrirla se juega una vez a toda velocidad y se deja una
   * FOTO cada pocos segundos (Game.foto); saltar a cualquier punto es
   * entonces restaurar la foto de antes y simular el resto.
   *
   * Cada 10 s: una partida de 40 minutos deja 240 fotos (~1 MB) y ningún
   * salto pasa de 600 pasos, que es un suspiro. Bajarlo gasta memoria a
   * cambio de nada; subirlo hace que arrastrar la barra dé tirones. */
  CFG.REPLAY_FOTO_CADA = 600;      // ticks entre fotos (10 s)
  CFG.REPLAY_SALTO = 600;          // lo que salta ADELANTE / ATRÁS (10 s)
  CFG.REPLAY_VELOCIDADES = [0.5, 1, 2, 4];
  CFG.REPLAY_OCULTAR_MS = 2200;    // los mandos se esconden si no se toca nada
  CFG.REPLAY_MINI_W = 176;         // miniatura de la vista previa (la del laberinto,
  CFG.REPLAY_MINI_H = 226;         //   que es vertical)
  CFG.REPLAY_PREP_MS = 12;         // ms de simulación seguidos al preparar
  CFG.REPLAY_PREP_MAX = 1728000;   // tope de pasos (8 h): red de seguridad

  /* ---------- Las CIFRAS del perfil (js/stats.js) ----------
   * Lo que se enseña en PERFIL · CIFRAS y de dónde sale cada eje del
   * polígono de fortalezas. Los topes son «esto ya es sobresaliente»: el eje
   * llega al borde y se queda ahí. Se eligieron mirando una cuenta con
   * setecientas partidas encima, para que el polígono tenga forma —con sus
   * puntas y sus valles— en vez de salir redondo o clavado en el centro. */
  CFG.STATS = {
    /* Puntos por segundo de juego. Solo se usa para ESTIMAR el tiempo de lo
     * jugado antes de que el tiempo se guardara (Achievements.sembrarCifras):
     * un nivel entero son unas 244 pastillas, sus fantasmas y su fruta en
     * torno al minuto y medio, que sale por ahí. La pantalla avisa de que esa
     * parte es una estimación. */
    PTS_POR_SEG: 33,
    /* Los seis ejes del polígono: id, nombre, de dónde sale y su tope. */
    EJES: [
      { id: 'ataque',     name: 'ATAQUE',     tope: 10,     dec: 1 },
      { id: 'puntos',     name: 'PUNTOS',     tope: 150000 },
      { id: 'aguante',    name: 'AGUANTE',    tope: 5 },
      { id: 'alcance',    name: 'ALCANCE',    tope: 21 },
      { id: 'constancia', name: 'CONSTANCIA', tope: 60 },
      { id: 'variedad',   name: 'VARIEDAD',   tope: 5 }
    ],
    /* Los cinco mundos, para la tabla por modo y para el eje de VARIEDAD.
     * Son los mismos prefijos con los que se guardan los contadores. */
    MUNDOS: [
      { id: 'clasico', name: 'CLÁSICO',    color: '#ffff00' },
      { id: 'hab',     name: 'DESATADO',   color: '#ff66cc' },
      { id: 'lab',     name: 'LABERINTOS', color: '#ffb852' },
      { id: 'caza',    name: 'CACERÍA',    color: '#ffb8ff' },
      { id: 'vs',      name: 'PAC-MAN VS.', color: '#7ec8ff' }
    ]
  };

  /* ---------- Partida a medias (js/guardado.js) ----------
   * Lo que se guarda NO es una foto del laberinto: es la MISMA repetición
   * que ya se graba de toda partida (ajustes + giros + el tick de cada uno)
   * cortada por donde se iba. Al retomarla se vuelve a simular a toda
   * velocidad hasta ese tick y el mando pasa al jugador. Por eso ocupa lo
   * mismo que una repetición y viaja a la nube sin problema: es lo que hace
   * que se pueda dejar una partida en un aparato y seguirla en otro.
   *
   * Solo se guarda lo que la repetición sabe reconstruir: CLÁSICO, DÚO,
   * DESATADO, PAC-MAN VS. y LABERINTOS, de uno o dos en el mismo teclado.
   * CACERÍA no se graba (lleva un jugador más, el de la máquina) y ONLINE
   * lo simula el anfitrión, así que ninguno de los dos se puede continuar. */
  CFG.SAVE_KEY = 'pacman-topmundial-partida';
  CFG.SAVE_V = 1;                 // versión del sobre guardado
  CFG.SAVE_EVERY = 300;           // ticks entre guardados (5 s)
  CFG.SAVE_CLOUD_EVERY = 3600;    // y entre subidas a la nube (1 min)
  /* Tope del texto guardado. Es más alto que el de una repetición para
   * compartir (CFG.REPLAY_MAX_CHARS, 24000) porque aquella tiene que caber en
   * una URL y esta no: va a localStorage y a una columna de texto. Con el
   * tope de giros de una repetición (REPLAY_MAX_ENTRADAS) no se llega ni de
   * lejos, así que una partida larga de verdad se guarda entera. */
  CFG.SAVE_MAX_CHARS = 120000;
  /* Tope de pasos de la recuperación: si al llegar aquí no se ha alcanzado
   * el tick guardado, algo va mal y se para en vez de colgar la pestaña.
   * Son ocho horas de partida, muy por encima de cualquiera de verdad. */
  CFG.SAVE_MAX_PASOS = 1728000;
  CFG.SAVE_MS_TROZO = 12;         // ms de simulación seguidos antes de soltar el hilo

  /* ---------- Nivel de jugador (experiencia acumulada) ----------
   * Sube con los puntos de TODAS las partidas y no tiene tope: cada nivel
   * pide más que el anterior (crecimiento suave, ni plano ni imposible). */
  CFG.LEVEL_KEY = 'pacman-topmundial-nivel';
  CFG.LEVEL_BASE = 4000;      // puntos del nivel 1 al 2
  CFG.LEVEL_EXP = 1.28;       // cuánto crece cada escalón

  /* ---------- Amigos (lista local) ---------- */
  CFG.FRIENDS_KEY = 'pacman-topmundial-amigos';
  CFG.FRIENDS_MAX = 30;

  /* ---------- Cuentas ----------
   * El jugador solo ve USUARIO y CONTRASEÑA. Por dentro se usa Supabase Auth,
   * que pide un correo, así que se compone uno interno con el usuario; nadie
   * lo escribe ni lo ve. El usuario es TAMBIÉN el nombre dentro del juego,
   * para no tener dos nombres distintos que cuadrar (ranking, party, amigos
   * y las invitaciones ya van todos por el nombre).
   *
   * OJO: en el proyecto de Supabase hay que dejar "Confirm email" APAGADO
   * (Authentication -> Sign In / Providers -> Email). Si está encendido, el
   * registro no devuelve sesión y nadie puede entrar, porque ese correo no
   * existe y el enlace de confirmación no llega a ninguna parte. */
  CFG.ACCOUNT = {
    TABLE: 'perfiles',
    FRIENDS_TABLE: 'amigos',
    MAIL_DOMAIN: 'cuentas.pacman-topmundial.vercel.app',
    USER_MIN: 3,
    PASS_MIN: 6,
    KEY: 'pacman-topmundial-sesion',  // sesión guardada en este navegador

    /* ---------- recuperar la contraseña ----------
     * Quien la olvidaba PERDÍA LA CUENTA: los cuatro récords, la experiencia,
     * los logros y las doce maestrías, sin vuelta atrás. El correo se componía
     * por dentro con MAIL_DOMAIN y ese buzón no existe, así que el enlace de
     * recuperación de Supabase no llegaba a ninguna parte.
     *
     * Ahora se pide el correo DE VERDAD al registrarse y la recuperación es la
     * de toda la vida: un enlace al buzón. Se sigue ENTRANDO con el usuario,
     * porque quien resuelve usuario -> correo es la Edge Function `cuenta`,
     * con la service role y sin que el correo baje nunca al navegador.
     *
     * MAIL_DOMAIN se queda porque las cuentas de antes lo llevan: entran igual,
     * pero no pueden recuperar la contraseña hasta poner un correo en PERFIL. */
    FN: 'cuenta',
    MAIL_MAX: 254                    // lo que permite el estándar
  };

  /* Nombres de invitado: se sortean juntando una pareja de estas listas y
   * recortando a NICK_MAX, para que quepan en el marcador. */
  CFG.RANDOM_NAMES = {
    a: ['PAC', 'NEO', 'ZIG', 'TOP', 'BIT', 'RAY', 'MAX', 'ACE', 'JET', 'VIC',
        'LOK', 'RIO', 'DUX', 'KIR', 'NOX', 'ZAS'],
    b: ['MAN', 'BOT', 'ZAG', 'KID', 'REX', 'FOX', 'ONE', 'PRO', 'ZAP', 'RUN',
        'GUM', 'TAP', 'WIN', 'POW', 'MIX', 'JAM']
  };

  /* ---------- Repeticiones de partidas ONLINE (formato de red) ----------
   * Las locales se graban como teclas y caben en una URL. Online no: allí la
   * partida la simula el anfitrión y lo que ve cada uno depende de lo que
   * llegue por la red, así que repetir las teclas no reconstruiría nada. Lo
   * que se graba es LO QUE EL ANFITRIÓN YA EMITE (sus instantáneas y sus
   * eventos), y al verla el juego se pone de espectador de un archivo en vez
   * de una sala: el mismo camino que ya existe para mirar una partida ajena.
   *
   * Eso pesa más que unas teclas —unos 12 KB por minuto de partida—, así que
   * tienen su propio almacén y su propia poda: no compiten con las locales ni
   * caben en un enlace. */
  CFG.REPLAY_NET_KEY = 'pacman-topmundial-repeticiones-red';
  /* índice de las subidas a la nube (hora, jugadores, puntos y código) */
  CFG.REPLAY_NUBE_KEY = 'pacman-topmundial-repeticiones-nube';
  CFG.REPLAY_NUBE_MAX = 300;
  /* las que no se DESTACAN se borran de la nube a los tantos días
   * (supabase/repeticiones-destacadas.sql) */
  CFG.REPLAY_CADUCA_DIAS = 7;
  CFG.REPLAY_TITULO_MAX = 32;
  CFG.REPLAY_NET_V = 2;            // versión del formato
  CFG.REPLAY_NET_EVERY = 2;        // 1 de cada N instantáneas (12 Hz -> 6 Hz)
  CFG.REPLAY_NET_MAX = 2;          // cuántas se guardan
  CFG.REPLAY_NET_MAX_CHARS = 220000;   // tope de una (unos 15 min de partida)
  CFG.REPLAY_NET_TOTAL_CHARS = 420000; // tope de todas juntas

  /* ---------- Compartir una repetición por enlace ----------
   * Las LOCALES caben enteras en la URL (?rep=<texto>): son unos cientos de
   * bytes y el enlace se vale por sí solo, sin servidor ni caducidad.
   *
   * Las de RED no, y no es cuestión de comprimir mejor: son ~12 KB por minuto
   * de partida, así que una de cinco minutos son 60 KB y por un chat no pasa.
   * Para esas, el enlace lleva un CÓDIGO (?rn=A3K9XQ7M) y la repetición se
   * sube a la tabla `repeticiones` (supabase/repeticiones.sql). Cambia dónde
   * vive el contenido, no cómo se ve: al abrirlo se reproduce igual.
   *
   * El alfabeto es el de siempre para lo que se copia a mano: sin I, O, 0 ni
   * 1, que son la misma letra en un papel o dictadas por teléfono. */
  CFG.REPLAY_SHARE = {
    TABLE: 'repeticiones',
    PARAM: 'rn',                 // ?rn=<id> en el enlace
    ALPHABET: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    ID_LEN: 8,
    MAX_CHARS: 260000,           // el mismo tope que el CHECK de la tabla
    INTENTOS: 4                  // reintentos si el código sorteado ya existe
  };

  /* ---------- Aviso de maestría en partida ---------- */
  CFG.BADGE_ANIM_TICKS = 300;   // 5 s: entrada, lucimiento y salida

  /* ---------- Ajustes (contrato con ui.js/game.js) ---------- */
  CFG.SETTINGS_KEY = 'pacman-topmundial-settings';
  CFG.HIGHSCORE_KEY = 'pacman-topmundial-highscore';
  /* Un récord por formato de partida: cada uno es una liga aparte, y de ahí
   * salen también las cuatro rutas de maestrías (ver js/badges.js). */
  CFG.HIGHSCORE2_KEY = 'pacman-topmundial-highscore-2p';   // dúo
  CFG.HIGHSCORE3_KEY = 'pacman-topmundial-highscore-3p';   // trío
  CFG.HIGHSCORE4_KEY = 'pacman-topmundial-highscore-4p';   // escuadra
  /* LABERINTOS y DESATADO llevan los suyos, aparte de los cuatro formatos:
   * son otras reglas (otro trazado, o cuatro poderes) y una marca de ahí no
   * se puede comparar con una del laberinto de 1980.
   *
   * Y CADA UNO SE PARTE TAMBIÉN POR FORMATO, igual que el clásico: jugar en
   * otro laberinto con cuatro bocas no es lo mismo que hacerlo solo, así que
   * tampoco entrega las mismas maestrías. Salen doce rutas en total (tres
   * mundos por cuatro formatos); ver js/badges.js.
   *
   * La clave de solo es la de siempre, sin sufijo: lo que ya tuviera guardado
   * quien viene de antes se queda donde estaba y cuenta para su ruta de solo,
   * que es donde casi todo el mundo lo hizo. */
  CFG.HIGHSCORE_LAB_KEY = 'pacman-topmundial-highscore-lab';
  CFG.HIGHSCORE_HAB_KEY = 'pacman-topmundial-highscore-hab';
  /* Clave del récord de un mundo aparte ('lab' o 'hab') en un formato (1..4) */
  CFG.recordModoKey = function (id, n) {
    var base = (id === 'hab') ? CFG.HIGHSCORE_HAB_KEY : CFG.HIGHSCORE_LAB_KEY;
    n = parseInt(n, 10) || 1;
    return (n <= 1) ? base : (base + '-' + n + 'p');
  };
  /* Longitud máxima de un nombre de jugador. El marcador de la partida sabe
   * encoger la letra cuando el nombre no cabe en su hueco (renderHUD), así que
   * este número lo manda todo: campos de texto, ranking, amigos y cuentas.
   * Si se sube, hay que subir también los CHECK de supabase/ranking.sql y
   * supabase/cuentas.sql, que validan lo mismo en el servidor. */
  CFG.NICK_MAX = 12;
  /* Identificadores del selector de modo de la portada. Viven aquí y no en
   * ui.js porque son un AJUSTE GUARDADO (`modePick`): lo que se elige en el
   * carrusel se recuerda entre recargas, y el saneado de los ajustes tiene que
   * poder validarlo sin depender del orden en que carguen los archivos.
   *
   * La lista de tarjetas (con su nombre, su color y su icono) sigue en
   * `MODOS`, arriba de js/ui.js: si se añade un modo hay que tocar los dos
   * sitios, y una prueba vigila que no se separen. */
  CFG.MODE_IDS = ['clasico', 'duo', 'hab', 'caza', 'lab', 'online'];
  /* ---------- LO QUE VIAJA CON LA CUENTA (19 de septiembre de 2026) ----------
   * Entrar en tu cuenta en otro ordenador traía tus récords, tus logros y tus
   * compras... pero te dejaba con el Pac-Man amarillo de fábrica, sin tu
   * skin, sin lo que llevas puesto y con el sonido de serie. La compra estaba
   * en la nube y el HABERLO PUESTO se quedaba en el navegador, que es
   * exactamente la mitad que no se ve.
   *
   * Estas claves de PM.settings viajan a la columna `ajustes` del perfil.
   *
   * QUIÉN GANA cuando los dos lados tienen algo: el ÚLTIMO QUE SE CAMBIÓ, no
   * el mejor de cada lado (que es la regla de los récords y aquí no
   * significaría nada: no hay un color "mejor"). Por eso viaja con ellos un
   * sello de tiempo, `ajustesTs`, que solo se toca cuando cambia de verdad
   * alguna de estas claves. Si en este aparato acabas de ponerte otra skin y
   * entras en tu cuenta, no se te quita: lo de aquí es más nuevo y es lo que
   * sube.
   *
   * QUÉ NO VIAJA, a propósito:
   *  - `nick1`, que ya ES el usuario de la cuenta.
   *  - todo lo del JUGADOR 2 (`nick2`, `skin2`, `pac2Color`, `habRol2`,
   *    `vsGhost2`): eso es de quien se sienta al lado en ESE teclado, no de
   *    la persona que entra.
   *  - `difficultyPreset`, que se recalcula solo de los cinco valores, y
   *    `livesMode`, que hoy está forzado.
   * -------------------------------------------------------------------- */
  CFG.AJUSTES_NUBE = [
    /* el aspecto: lo que los demás ven de ti */
    'skin1', 'pacColor', 'acc1', 'efx1', 'emotes1', 'avatar',
    /* cómo juegas */
    'modePick', 'habRol1', 'habLoadout1',
    'ghostSpeedMult', 'pacSpeedMult', 'frightMult', 'startLives', 'startLevel',
    /* y cómo suena */
    'muted', 'volMaster', 'volMusic', 'volSfx', 'volLoops', 'volVoices'
  ];
  CFG.DEFAULT_SETTINGS = {
    difficultyPreset: 'normal',   // 'facil' | 'normal' | 'dificil' | 'custom'
    /* Modo elegido en la portada. Se guarda porque quien juega casi siempre a
     * lo mismo tenía que volver a buscarlo en cada recarga: el carrusel
     * arrancaba en CLÁSICO pasara lo que pasara. */
    modePick: 'clasico',
    nick1: '',                    // nombre del jugador 1 (y nombre propio online)
    nick2: '',                    // nombre del jugador 2 (dos jugadores locales)
    pacColor: '#ffff00',
    pac2Color: '#00ff00',         // color del jugador 2
    skin1: 'clasico',             // skin del jugador 1 (y propia online)
    skin2: 'clasico',             // skin del jugador 2
    /* lo puesto de la TIENDA (solo el jugador 1: es lo tuyo). Vacío = nada.
     * Que esté comprado se mira al usarlo (PM.Tienda), no aquí. */
    acc1: '',                     // accesorio
    efx1: '',                     // efecto
    emotes1: 'risa,llanto,enfado,susto,guino,amor',   // las caras de las teclas 1..6
    avatar: 'pac',                // avatar del perfil
    /* Las vidas son SIEMPRE de cada uno (18 sep 2026): el fondo común se
     * quitó de las opciones porque escondía el REVIVIR AL COMPAÑERO, que
     * solo existe con vidas propias. 'shared' sigue existiendo por dentro
     * para CACERÍA (las vidas son del Pac-Man, no de quien lo lleva), para
     * jugar solo y para poder reproducir las repeticiones viejas. */
    livesMode: 'individual',      // 'individual' | 'shared' (solo por dentro)
    vsGhost2: -1,                 // PAC-MAN VS. en local: fantasma del J2 (-1 = Pac-Man)
    habRol1: 'asesino',           // DESATADO: el último rol elegido por el J1
    habRol2: 'asesino',           // ...y por el J2 (dos en el mismo teclado)
    /* armamento DESATADO: una habilidad por ranura, separadas por comas.
     * Se conserva el kit antiguo como valor inicial para que las partidas y
     * las repeticiones de antes sigan arrancando igual. */
    habLoadout1: 'mordisco,turbo,flash,grito',
    habLoadout2: 'mordisco,turbo,flash,grito',
    ghostSpeedMult: 1.0,          // 0.5–1.2, paso .05
    pacSpeedMult: 1.0,            // 0.8–1.3, paso .05
    frightMult: 1.0,              // 0–2, paso .25
    startLives: 3,                // 1–5
    startLevel: 1,                // 1–21
    muted: false,
    volMaster: 1,                 // volúmenes por categoría, 0–1 (paso .1)
    volMusic: 1,
    volSfx: 1,
    volLoops: 0.8,
    volVoices: 1,
    /* Cuándo se cambió por última vez algo de CFG.AJUSTES_NUBE, para saber qué
     * lado manda al entrar en la cuenta desde otro aparato. No es un ajuste
     * que se toque a mano: lo pone saveSettings() al ver que algo cambió. */
    ajustesTs: 0
  };
  CFG.PRESETS = {
    facil:   { ghostSpeedMult: 0.85, pacSpeedMult: 1.05, frightMult: 1.5, startLives: 5, startLevel: 1 },
    normal:  { ghostSpeedMult: 1.0,  pacSpeedMult: 1.0,  frightMult: 1.0, startLives: 3, startLevel: 1 },
    dificil: { ghostSpeedMult: 1.1,  pacSpeedMult: 1.0,  frightMult: 0.5, startLives: 2, startLevel: 5 }
  };

  /* ---------- Utilidades de laberinto compartidas ---------- */
  /* Cambia el laberinto en juego (modo LABERINTOS). Sin filas válidas
   * vuelve al clásico. Recuenta las pastillas: cada laberinto tiene las
   * suyas y el final de nivel se decide con ese número. Devuelve cuántas. */
  CFG.setMaze = function (rows) {
    var ok = rows && rows.length === CFG.ROWS;
    CFG.MAZE = ok ? rows.slice() : CFG.MAZE_CLASSIC.slice();
    var n = 0;
    for (var r = 0; r < CFG.ROWS; r++) {
      for (var c = 0; c < CFG.COLS; c++) {
        var ch = CFG.MAZE[r].charAt(c);
        if (ch === '.' || ch === 'o') n++;
      }
    }
    CFG.PELLET_TOTAL = n;
    return n;
  };

  CFG.tileChar = function (col, row) {
    if (row < 0 || row >= CFG.ROWS) return '#';
    if (col < 0 || col >= CFG.COLS) return (row === CFG.TUNNEL_ROW) ? ' ' : '#';
    return CFG.MAZE[row].charAt(col);
  };
  // ¿Casilla transitable? (la puerta '-' solo si allowDoor)
  CFG.isOpen = function (col, row, allowDoor) {
    var c = CFG.tileChar(col, row);
    if (c === '#') return false;
    if (c === '-') return !!allowDoor;
    return true;
  };
  CFG.isNoUpTile = function (col, row) {
    for (var i = 0; i < CFG.NO_UP_TILES.length; i++) {
      if (CFG.NO_UP_TILES[i][0] === col && CFG.NO_UP_TILES[i][1] === row) return true;
    }
    return false;
  };
  CFG.wrapCol = function (col) {
    if (col < 0) return col + CFG.COLS;
    if (col >= CFG.COLS) return col - CFG.COLS;
    return col;
  };

  /* ---------- Modo DESATADO ----------
   * Cuatro poderes con tecla propia y recarga independiente, al estilo de un
   * MOBA. Es un MODO APARTE, como LABERINTOS: el laberinto de 1980 se juega
   * con otras reglas, así que estas partidas NO entran en el top mundial
   * (pero sí suman experiencia y logros). Ver js/habilidades.js.
   *
   * Las recargas son largas a propósito: son cuatro, y con recargas cortas
   * el laberinto deja de importar —siempre tendrías una a mano—. Así hay que
   * elegir cuál gastas, que es donde está el juego. Van todas en LIST, que es
   * el único sitio donde se escriben: el diálogo del modo también las lee de
   * ahí para que no puedan desdecirse.
   *
   * Corren solo mientras la partida avanza de verdad (PLAYING y sin pausa):
   * morir o cambiar de nivel no te regala una habilidad. */
  CFG.HAB = {
    /* Alcance del mordisco: una casilla a la redonda (las ocho de alrededor
     * y la propia). Se COMPRUEBA EN PÍXELES —BITE_PX, un poco más abajo—,
     * no contando casillas: dos cosas pegadas en pantalla pueden caer en
     * casillas que no son vecinas, y entonces la Q falla sin que se entienda
     * por qué. En píxeles, lo que se ve pegado se muerde. */
    BITE_TILES: 1,
    /* Margen sobre la casilla, en píxeles. Empezó en 4 (casilla y media) y
     * subió a 8 —media casilla más— porque en party se fallaba demasiado: el
     * fantasma que ves pegado en tu pantalla no está exactamente ahí en la del
     * anfitrión, y esos pocos píxeles se comían la mitad de los mordiscos. Con
     * 8 el alcance son DOS casillas justas, que sigue siendo "lo que se ve
     * cerca", y a tres no llega ni de lejos. */
    BITE_MARGIN: 8,
    /* Lo que el ANFITRIÓN le perdona a un mordisco que le piden por red.
     * La posición de un invitado le llega a 12 Hz, así que cuando la petición
     * se ejecuta su Pac-Man ya no está donde él lo vio y el fantasma tampoco:
     * son ~6 px de desfase que no son culpa de nadie. Sin este margen el
     * mordisco del invitado fallaba "sin motivo" cada dos por tres, que es
     * exactamente lo que se sentía roto. NO agranda el alcance: el invitado
     * solo dispara si en SU pantalla el fantasma estaba a BITE_PX. */
    BITE_NET_MARGIN: 8,
    /* Ticks que un fantasma recién mordido no puede matar a quien lo mordió,
     * en la pantalla del INVITADO. El invitado no mata (eso es del anfitrión),
     * así que hasta que llega la confirmación el fantasma sigue vivo ahí y en
     * la casilla de al lado: se metía solo en él y moría por haber acertado.
     * 45 ticks (0.75 s) cubren de sobra la ida y vuelta de la petición. */
    BITE_GUARD: 45,
    /* Los dientes se ven un poco más que el mordisco en sí: es el aviso de
     * que Q ha entrado, y sin él la muerte del fantasma no se entiende. */
    BITE_SHOW: 24,           // 0.4 s con dientes
    /* ---------- LA Q QUE SE PULSA UN PELO ANTES ----------
     * De frente, la ventana real para morder es de CINCO O SEIS TICKS. Pac-Man
     * va a ~1 px por tick y el fantasma a ~0.95, así que yendo de cara se
     * cierran casi 2 px por tick: desde que el fantasma entra en los 16 px del
     * alcance hasta que caen en la misma casilla —y entonces te mata— pasan
     * menos de 100 ms. El tiempo de reacción de una persona es el triple.
     *
     * Resultado: el jugador ve venir al fantasma de frente, pulsa Q cuando lo
     * tiene a tres casillas —que es cuando se decide, no cuando ya lo tiene
     * encima—, la dentellada sale al aire porque todavía no llegaba, y medio
     * segundo después el fantasma se le mete dentro y lo mata. Desde fuera se
     * ve como "usé la Q y me mató igual", y no había forma humana de acertar
     * el tiro.
     *
     * Así que la Q pedida pronto NO se tira: se queda ARMADA estos ticks y
     * muerde sola en cuanto alguien entra a tiro. Es lo mismo que ya hace
     * `nextDir` con los giros —el rumbo pedido espera a que el laberinto
     * deje— y no regala alcance: el mordisco sigue llegando a dos casillas y
     * a tres no llega. Lo único que deja de exigir es puntería de milisegundo.
     *
     * 18 ticks (0.3 s) cubren pulsar con el fantasma a unas cinco casillas.
     * Más sería raro: mordiscos que salen solos mucho después de la tecla. */
    BITE_BUFFER: 18,
    TURBO_TICKS: 5 * 60,     // 5 s de x1.5
    TURBO_MULT: 1.5,
    FLASH_TILES: 3,          // casillas que se recorren, paredes incluidas
    FLASH_SHOW: 15,          // 0.25 s translúcido al aterrizar
    SHOUT_SECS: 6,           // segundos de modo azul (independiente del nivel)
    /* Orden fijo: es el de las teclas, el del HUD y el que viaja por red y
     * por las repeticiones. No reordenar sin subir CFG.NET.PROTO. */
    LIST: [
      { id: 'mordisco', key: 'Q', name: 'MORDISCO', cd: 16 * 60 },
      { id: 'turbo',    key: 'W', name: 'TURBO',    cd: 24 * 60 },
      { id: 'flash',    key: 'E', name: 'FLASH',    cd: 32 * 60 },
      { id: 'grito',    key: 'R', name: 'GRITO',    cd: 60 * 60 }
    ],

    /* ---------- LOS ROLES ----------
     * Cada jugador elige uno antes de empezar. LIST (arriba) es el ASESINO, el
     * kit de siempre: puntúa. El TANQUE protege, el SOPORTE cura y controla y
     * el MAGO mata a distancia (pero puntúa poco: ver MAGO_PUNTOS). Mismo
     * formato que LIST y el mismo orden de teclas; lo que cambia es el id, y
     * js/habilidades.js despacha por id, no por la posición.
     *
     * Ningún id puede repetirse entre listas: 'embestida' ya es del fantasma
     * humano (LIST_G), por eso la R del Tanque se llama 'arrollar'. */
    LIST_T: [
      { id: 'pisoton',  key: 'Q', name: 'PISOTÓN',  cd: 32 * 60 },
      { id: 'escudo',   key: 'W', name: 'ESCUDO',   cd: 24 * 60 },
      { id: 'provocar', key: 'E', name: 'PROVOCAR', cd: 32 * 60 },
      { id: 'arrollar', key: 'R', name: 'ARROLLAR', largo: 'APISONADORA', cd: 46 * 60 }
    ],
    LIST_S: [
      { id: 'hielo',     key: 'Q', name: 'HIELO',     largo: 'DISPARO HELADO', cd: 16 * 60 },
      { id: 'inmunidad', key: 'W', name: 'INMUNIDAD', cd: 24 * 60 },
      { id: 'aliado',    key: 'E', name: 'ALIADO',    largo: 'ESCUDO ALIADO', cd: 32 * 60 },
      /* VIDA EXTRA: 3 min (antes 5). A cinco minutos casi nunca llegaba a
       * usarse dos veces en una partida (18 sep). */
      { id: 'vida',      key: 'R', name: 'VIDA',      largo: 'VIDA EXTRA', cd: 180 * 60 }
    ],
    LIST_M: [
      { id: 'fuego',    key: 'Q', name: 'FUEGO',    largo: 'BOLA DE FUEGO', cd: 20 * 60 },
      { id: 'portal',   key: 'W', name: 'PORTAL',   cd: 46 * 60 },
      { id: 'runa',     key: 'E', name: 'RUNA',     cd: 32 * 60 },
      { id: 'tormenta', key: 'R', name: 'TORMENTA', cd: 46 * 60 }
    ],
    /* El orden de esta lista es SOLO el de los selectores: por la red cada
     * rol viaja por su NOMBRE, no por su posición, así que reordenarla no
     * rompe nada (ni hace falta subir NET.PROTO). */
    ROL_IDS: ['asesino', 'tanque', 'mago', 'soporte'],
    ROL_INFO: {
      asesino: { name: 'ASESINO', color: '#ff66cc', lema: 'PUNTÚA: MUERDE, CORRE Y ASUSTA',
                 pasiva: 'TODO LO QUE MATES VALE UN 25% MÁS · 250 · 500 · 1.000 · 2.000',
                 desc: ['TE COMES AL FANTASMA PEGADO · AL JEFE LE PEGA Y LO ATURDE 2 S', 'VELOCIDAD X1.5 UNOS SEGUNDOS',
                        'SALTAS CASILLAS ATRAVESANDO MUROS', 'LOS CUATRO FANTASMAS SE ASUSTAN'] },
      tanque:  { name: 'TANQUE', color: '#ffb852', lema: 'PROTEGE: ATRAE, AGUANTA Y EMPUJA',
                 pasiva: 'CORAZA: UN GOLPE GRATIS CADA 30 S, Y TE DURA 12 S',
                 desc: ['TODO EL MAPA HUYE DE TI, UN 40% MÁS LENTO · TAMBIÉN EL JEFE', '8 S DE ESCUDO: AGUANTA UN GOLPE',
                        'TODOS VAN A POR TI, HASTA LOS AZULES · TU EQUIPO NO MUERE', 'EN LÍNEA RECTA HASTA LA PARED · AL JEFE LO ATURDE 3 S'] },
      soporte: { name: 'SOPORTE', color: '#2bff88', lema: 'CURA Y CONTROLA',
                 pasiva: 'LEVANTAS UN CUERPO DE UNA SOLA PASADA (LOS DEMÁS, CINCO)',
                 desc: ['DISPARO QUE CONGELA · MANTÉN 2 S: HIELO EN EL SUELO', 'NADIE TE PUEDE TOCAR 3 S',
                        'ESCUDO AL MÁS CERCANO · MANTÉN 3 S: A TODO EL EQUIPO, TÚ INCLUIDO', 'UNA VIDA MÁS PARA QUIEN MENOS TIENE'] },
      mago:    { name: 'MAGO', color: '#8b3dff', lema: 'MATA A DISTANCIA, PERO PUNTÚA POCO',
                 pasiva: 'EL OJO: VES POR DÓNDE VA A PASAR CADA UNO Y CUÁNDO CAMBIAN DE MODO',
                 desc: ['BOLA QUE MATA AL PRIMER FANTASMA', 'DOS BOCAS 20 S · SE ENTRA CON ESPACIO APRETADO',
                        'TRAMPA QUE MATA A LOS QUE LA PISEN', '3 RAYOS A 10 CASILLAS · UNO CADA 0,75 S'] }
    },

    /* LAS PASIVAS DE CADA ROL (20 de septiembre de 2026)
     *
     * Una por rol, siempre encendida, para que el equipo NECESITE a cada uno
     * y no se elija por gusto. La del ASESINO es la que sostiene su papel:
     * mata igual que los demás, pero sus muertes valen la mitad más, así que
     * un equipo sin asesino puntúa menos por el mismo trabajo. Con la cadena
     * de siempre (200/400/800/1600) le sale 250 / 500 / 1.000 / 2.000, y un
     * cuádruple pasa de 3.000 a 3.750.
     *
     * Empezó en la mitad más (20 sep) y bajó a la cuarta parte ese mismo día:
     * a x1,5 el asesino no era necesario, era obligatorio —cualquier otro rol
     * costaba un tercio del marcador— y eso no es equilibrio, es una casilla
     * obligatoria en la alineación.
     *
     * Se aplica a TODA forma de matar, no solo al mordisco: cadena del
     * energizante, muertes por habilidad (MAGO_PUNTOS) y el premio del REY
     * FANTASMA cuando es él quien lo remata. Si valiera solo para una, el rol
     * premiaría una forma de jugar en vez de al rol.
     *
     * La del SOPORTE ya existía desde el 17 de septiembre: levanta un cuerpo
     * de una sola pasada, donde cualquier otro necesita cinco. */
    BONO_ASESINO: 1.25,

    /* CORAZA (pasiva del TANQUE): un escudo de un golpe que se pone solo.
     *
     * Nació sin caducidad y volviendo a los 25 s, y así el Tanque iba
     * PRÁCTICAMENTE SIEMPRE con un golpe gratis encima; sumado al ESCUDO de
     * su W, aguantaba dos casi todo el rato y dejaba de jugarse nada. Ahora:
     *
     *   · DURA 12 s puesta. Si no te la rompen, se va sola.
     *   · Vuelve 30 s después de perderla, rota o caducada.
     *   · Se suma SOLO al ESCUDO de su propia W (los dos son suyos: juntos,
     *     dos golpes para entrar a salvar a alguien). Con el ESCUDO ALIADO
     *     del Soporte NO se acumula: ese golpe se los lleva los dos.
     *
     * O sea, está puesta menos de un tercio del tiempo: es una ventana para
     * entrar a salvar a alguien, no una piel. Y como caduca, se ve acabarse,
     * que era la otra mitad del problema: parecía que no se la podían quitar. */
    CORAZA_DURA: 12 * 60,         // 12 s puesta
    CORAZA_CD: 30 * 60,           // y 30 s hasta la siguiente

    /* EL OJO (pasiva del MAGO): cuántas casillas por delante se le enseña el
     * camino de cada fantasma. Siete (20 sep): con cinco se veía venir la
     * encerrona justo cuando ya no daba tiempo a nada. Con diez no se
     * distinguía un fantasma de otro. */
    OJO_PASOS: 7,

    /* Tanque */
    TAUNT_TICKS: 5 * 60,          // PROVOCAR: los fantasmas van a por el Tanque
    ESCUDO_TICKS: 8 * 60,         // ESCUDO del Tanque: 8 s, o hasta que un golpe lo rompa
    ESCUDO_GRACIA: 30,            // tras romperse un escudo, medio segundo sin morir
    /* Y EL FANTASMA SALE EMPUJADO estas casillas (20 sep). Sin esto, romper un
     * escudo no se veía: el fantasma se quedaba dentro de ti, el medio segundo
     * de gracia pasaba pegado a él y parecía que el golpe no había existido.
     * Empujado dos casillas hacia atrás, el golpe se ve y da tiempo a salir. */
    ESCUDO_EMPUJE: 2,
    PISOTON_TICKS: 6 * 60,        // PISOTÓN: TODO el mapa huye del Tanque
    /* Ya no hay alcance: el pisotón coge a cuantos fantasmas haya en la
     * calle, estén donde estén (20 sep). Este número es solo lo que crece la
     * onda que se pinta, para que se vea el golpe. */
    PISOTON_ONDA: 15,
    PISOTON_LENTO: 0.6,           // y mientras huyen van al 60% de su velocidad
    /* ARROLLAR (la APISONADORA): en línea recta hacia la última flecha HASTA
     * LA PARED, sin límite de tiempo, a x1.4, invulnerable, comiéndose a
     * cualquier fantasma que toque por MAGO_PUNTOS fijos, sin cadena y sin
     * parar la partida. Por seguridad, nunca más de una vuelta al laberinto. */
    APISONADORA_MULT: 1.75,
    /* el anfitrión se cree un "me he comido a este" de la apisonadora de un
     * invitado durante este rato desde que la pidió (cruzar el laberinto
     * entero a x1.75 cuesta unos 130 ticks) */
    APISONADORA_RED: 5 * 60,
    /* Soporte */
    HIELO_TICKS: 3 * 60,          // fantasma congelado
    PROYECTIL_VEL: 3,             // px por tick (Pac-Man va a ~1)
    INMUNE_TICKS: 3 * 60,
    /* escudo que se da al compañero: 8 s o un golpe. A solas no sale: el
     * Soporte tiene que echar de menos a alguien a quien cuidar. */
    ALIADO_TICKS: 8 * 60,
    /* MANTENER PULSADO. Dos teclas del Soporte hacen otra cosa si se dejan
     * apretadas (ticks hasta que salta). Comparten recarga con la pulsación
     * corta, y la corta sale al SOLTAR:
     *   Q  HIELO   2 s: una placa de hielo en su casilla que congela a todo
     *              fantasma que la pise (a cada uno, una vez).
     *   E  ALIADO  3 s: escudo a TODO EL EQUIPO, él incluido y sin alcance. */
    MANTENER: { hielo: 2 * 60, aliado: 3 * 60 },
    PLACA_TICKS: 8 * 60,          // lo que dura la placa de hielo en el suelo
    ALIADO_AREA_TILES: 2,
    VIDA_MAX: 5,                  // la VIDA no sube a nadie de aquí
    /* Mago */
    /* PORTAL. Al pulsar, la entrada se queda donde está el Mago y él pasa a
     * OTRA DIMENSIÓN: ve el laberinto con todo lo demás en segundo plano, nada
     * lo toca, no come y no puede usar otro poder. Al volver a pulsar (o solo,
     * a los PORTAL_ESPERA) deja la salida donde esté y vuelve. Las dos bocas
     * quedan abiertas PORTAL_TICKS para todo el equipo, aunque se pase de
     * nivel. La recarga empieza al poner la salida. */
    /* EL VACÍO: cómo se ve el mundo desde la otra dimensión (js/habilidades.js) */
    VACIO_MURO: '#c9a4ff',        // el contorno del laberinto, flotando
    VACIO_SOMBRA: 'rgba(122, 77, 219, 0.4)',
    VACIO_ESTRELLAS: 60,
    PORTAL_TICKS: 20 * 60,        // abierto
    PORTAL_ESPERA: 8 * 60,        // en la otra dimensión, como mucho
    /* el anfitrión cierra solo el portal de un invitado que no manda su salida
     * (se ha caído, o el aviso se perdió) tras este margen extra */
    PORTAL_RED_GRACIA: 2 * 60,
    PORTAL_CRUCE: 30,             // tras cruzar, sin volver a cruzar
    RUNA_TICKS: 15 * 60,
    /* TRES rayos: el primero al instante y los otros dos, uno cada TRES CUARTOS
     * de segundo (20 sep). A un segundo, el segundo y el tercero llegaban tarde:
     * lo que había debajo ya se había ido y la R se sentía floja para lo que
     * cuesta (46 s de recarga). Con cuatro barría a todos sin riesgo. */
    TORMENTA_RAYOS: 3,
    TORMENTA_CADA: 45,
    TORMENTA_TILES: 10,           // a diez casillas a la redonda
    /* Lo que vale un fantasma que mata el Mago: fijo, sin tocar la cadena y
     * sin el parón de comer. Sin esto el Mago, que mata sin arriesgarse,
     * dejaría al Asesino sin sentido. */
    MAGO_PUNTOS: 200,

    /* ---------- poderes del catálogo ---------- */
    SHURIKEN_CANT: 3,
    SHURIKEN_TILES: 10,
    SHURIKEN_VEL: 4,
    SHURIKEN_PUNTOS: 200,
    /* La ráfaga tiene prisa (21 sep 2026): desde cada disparo hay esta
     * ventana para tirar el siguiente. Si se pasa, la ráfaga se cierra con
     * las cargas que queden y la recarga empieza ahí mismo. Sin esto las
     * cargas se podían guardar para siempre y la Q no se recargaba nunca. */
    SHURIKEN_VENTANA: 3 * 60,
    /* La bomba permanece hasta detonarla. El 0 se interpreta como duración
     * indefinida; la recarga empieza con la segunda pulsación. */
    BOMBA_TICKS: 0,
    BOMBA_RADIO: 2,
    BOMBA_PUNTOS: 150,
    MINA_TICKS: 5 * 60,
    SOMBRA_TICKS: 4 * 60,
    SOMBRA_MULT: 1.2,
    SOMBRA_PUNTOS: 500,
    SOMBRA_ESPALDA_PUNTOS: 750,
    FRENESI_TICKS: 8 * 60,
    FRENESI_PASO: 0.15,
    CARROÑA_TICKS: 6 * 60,
    CARROÑA_JOYA: 3 * 60,
    MARCA_TICKS: 8 * 60,
    /* El GANCHO INVERSO del Asesino llega a NUEVE casillas (22 sep 2026):
     * con ocho se quedaba a un pelo del fantasma una y otra vez y la E se
     * gastaba para nada. Una casilla más es la diferencia entre fallar y
     * plantarse encima. */
    GANCHO_INVERSO_TILES: 9,
    GANCHO_INVERSO_VEL: 4,
    GANCHO_ARRASTRE_MULT: 1.2,
    GANCHO_AZUL_TICKS: 5 * 60,
    /* El GANCHO del Soporte es el inverso del Asesino al revés: sale igual,
     * puede fallar igual, pero lo que viaja es el FANTASMA, que llega azul.
     * Se arrastra por los pasillos (no en línea recta hacia el jugador) y con
     * un tope de tiempo, porque el Soporte se mueve mientras tira. */
    GANCHO_TILES: 6,
    GANCHO_VEL: 4,
    GANCHO_TRAE_VEL: 2.4,
    GANCHO_TRAE_MAX: 150,
    CACERIA_TICKS: 6 * 60,
    CACERIA_MULT: 1.2,
    /* El misil vuela al DOBLE de la velocidad de referencia de un Pac-Man
     * (21 sep 2026). Antes iba a 4,5 px por fotograma, que son casi cuatro
     * veces eso: llegaba antes de que se viera salir. */
    MISIL_MULT: 2,
    MISIL_VEL: 2 * CFG.BASE_SPEED,
    EMPUJON_TILES: 3,
    EMPUJON_STUN: 60,
    /* GRITO DE GUERRA (21 sep): pasa de Q a E, de cinco casillas a TODO EL
     * MAPA y de 1,5 s a 2,5 s. Con el aturdimiento apagando al fantasma
     * (ver inerte), clavar a los cuatro es media R, así que la recarga sube
     * de 24 a 40 s: por debajo de eso le come el sitio al ECLIPSE del Mago. */
    GRITO_GUERRA_TICKS: 150,
    YUNQUE_TICKS: 120,
    PIEL_PIEDRA_TICKS: 5 * 60,
    REBOTE_TICKS: 5 * 60,
    /* 21 sep: de 6 s a 16 s. Una zona que ralentiza tres segundos no se
     * llegaba a usar: cuando el fantasma entraba, ya se había ido. */
    TELARANA_TICKS: 16 * 60,
    TELARANA_MULT: 0.5,
    ESTELA_TICKS: 8 * 60,
    ESTELA_MULT: 1.25,
    ESTELA_RASTRO_MULT: 1.2,
    ESTELA_RASTRO_TICKS: 45,
    PUENTE_TICKS: 8 * 60,
    /* Grosor máximo de muro que el PUENTE puede perforar. Los bloques del
     * laberinto son de dos o tres casillas, así que con cuatro se cruza
     * cualquiera de ellos y no el marco de fuera, que es macizo. */
    PUENTE_TILES: 4,
    CADENA_TICKS: 6 * 60,
    FARO_TICKS: 6 * 60,
    /* 21 sep: de 5 s a 10 s (corta un pasillo el rato suficiente para que
     * el equipo se recoloque; hay que mirarlo jugando). */
    MURO_TICKS: 10 * 60,
    CAMPO_TICKS: 5 * 60,
    HOSPITAL_TICKS: 10 * 60,
    BOLA_GUIADA_PUNTOS: 150,
    BOLA_GUIADA_VEL: 3.5,
    TOQUE_ARCANO_TICKS: 4 * 60,
    CHISPA_TICKS: 3 * 60,
    CLON_TICKS: 6 * 60,
    TOTEM_TICKS: 8 * 60,
    TOTEM_CADA: 2 * 60,
    TOTEM_BALA_VEL: 3,
    /* GRAVEDAD: el tirón se VE (medio segundo de arrastre por los pasillos,
     * no un salto instantáneo), llega a cuatro casillas y los deja apagados
     * dos segundos. Antes atraía un segundo de golpe y no se notaba nada. */
    GRAVEDAD_TICKS: 2 * 60,
    GRAVEDAD_RADIO: 4,
    GRAVEDAD_TIRON: 30,
    /* ---------- DOMINIO (22 sep 2026), la E del Mago ----------
     * Sustituye a NIEBLA, que era una zona donde el fantasma que entraba
     * caminaba al azar. No tenía gracia: un fantasma que anda al azar se
     * parece demasiado a uno que te persigue mal, no se distingue y no se
     * planeaba nada con ella; encima el Mago ya ciega a los cuatro a la vez
     * con su R (ECLIPSE), así que era media R más floja en la ranura E.
     *
     * DOMINIO hace lo contrario: el Mago toca al fantasma más cercano y ese
     * fantasma ES SUYO. Persigue a los otros tres y al alcanzarlos los manda
     * a casa. Se ve, se planea —se elige a cuál tocar y hacia dónde llevarlo—
     * y no se parece a ningún otro poder del juego. */
    /* Seis segundos: lo que tarda el dominado en cruzar medio laberinto y
     * alcanzar a uno, con suerte a dos. Con tres no llegaba a nadie; con
     * diez el Mago limpia el mapa entero sin jugarse nada. */
    DOMINIO_TICKS: 6 * 60,
    /* Cuatro casillas. Es un TOQUE, no un poder a distancia: hay que ir a
     * buscar al fantasma, y ese paseo es el riesgo que paga el dominio. */
    DOMINIO_TILES: 4,
    /* Doscientos por cabeza, lo mismo que cualquier baja por habilidad (ver
     * MAGO_PUNTOS). Se cobran fijos, sin cadena ni multiplicadores: si el
     * dominado se llevara a los tres por delante con premio creciente, esta
     * E puntuaría más que las dos R del Mago juntas. */
    DOMINIO_PUNTOS: 200,
    /* Al acabarse vuelve a la normalidad ATURDIDO un segundo. Sin esa resaca
     * el fantasma se despierta pegado al Mago —lleva seis segundos a su
     * lado— y lo mata en el mismo tick en que deja de ser suyo, que es
     * castigar al jugador justo por haber usado bien el poder. */
    DOMINIO_RESACA: 60,
    /* A qué distancia se da por alcanzado al otro fantasma: media casilla
     * larga, como el resto de contactos entre fantasmas de este juego (la
     * mina y el contagio del TOQUE ARCANO andan por ahí). */
    DOMINIO_CHOQUE: 0.6,
    METEORO_AVISO: 90,
    METEORO_RADIO: 2,
    METEORO_FUEGO: 4 * 60,
    /* METEORO APUNTADO (22 sep). Antes caía seis casillas al frente, en la
     * dirección de la última flecha: para ponerlo donde uno quería había que
     * ir a colocarse mirando hacia allí, con el laberinto de por medio. O
     * sea, que no se podía apuntar. Ahora se apunta MANTENIENDO la R: sale una
     * retícula delante del Mago, las flechas la llevan por los pasillos y al
     * soltar cae ahí. La partida no se para mientras tanto.
     *
     * ALCANCE, en casillas DE CAMINO (las que andaría un fantasma, no en
     * línea recta): ocho. Seis —lo de antes— no daba ni para doblar la
     * esquina de un bloque, que es justo lo que uno quiere hacer con esto; de
     * diez para arriba el Mago revienta la otra punta del mapa sin enterarse
     * de lo que pasa allí y el poder se queda sin riesgo. */
    METEORO_ALCANCE: 8,
    /* Lo que tarda la retícula en pasar de una casilla a la siguiente: seis
     * ticks, o sea diez casillas por segundo. La marca CAMINA SOLA hacia la
     * última flecha (las flechas la giran, no la empujan), así que este número
     * es en realidad la puntería: se suelta la tecla cuando pasa por donde uno
     * quiere. A tres ticks por casilla se escapa y hay que estar
     * corrigiéndola; a doce, cruzar el alcance entero se lleva más de un
     * segundo y el fantasma al que apuntabas ya se ha ido. Con seis, cada
     * casilla dura una décima y el alcance completo ocho: lo justo para
     * soltar a tiempo. */
    METEORO_PASO: 6,
    /* Casillas de propina que el anfitrión le perdona a la casilla que pide un
     * invitado. Él apuntó desde donde tenía su Mago y aquí, medio segundo de
     * red después, ya ha andado un poco: el desfase no es culpa suya. */
    METEORO_MARGEN_RED: 2,
    ECLIPSE_TICKS: 10 * 60,
    TERREMOTO_PUNTOS: 100,
    /* Retirada el 22 sep: el TERREMOTO ya no frena al equipo (ver multVel).
     * Se deja la constante a 1 porque hay repeticiones guardadas que la
     * miran, y para poder volver a probarlo con un número si hiciera falta. */
    TERREMOTO_SLOW: 1,
    TERREMOTO_TICKS: 6 * 60,
    FORTALEZA_TICKS: 6 * 60,
    FORTALEZA_RADIO: 5,
    EJECUCION_PUNTOS: 5000,

    /* ---------- DOS JUGADORES EN EL MISMO TECLADO ----------
     * Este modo no estaba en dúo local por una razón concreta: el J2 se mueve
     * con WASD y la W es el TURBO. Una tecla no puede hacer dos cosas, y dejar
     * al J2 con A/S/D moviendo y sin arriba es medio mando, que es peor que no
     * ofrecerlo.
     *
     * Se arregla dándole a cada jugador UNA FILA ENTERA para él, en su mitad
     * del teclado y pegada a como ya se mueve:
     *
     *   J1  flechas para mover   ·   N M , .   (la fila de al lado de las flechas)
     *   J2  W A S D para mover   ·   Z X C V   (la fila de justo debajo)
     *
     * Nadie invade la mitad del otro y las dos manos caen solas. El precio es
     * que el J1 pierde el Q W E R de siempre CUANDO JUEGA ACOMPAÑADO; en solo y
     * en online no cambia nada, que es donde está la costumbre.
     *
     * Se miran por `ev.key`, no por posición física: son letras y signos que
     * existen igual en ANSI y en el teclado español. */
    KEYS_2P: [
      ['N', 'M', ',', '.'],
      ['Z', 'X', 'C', 'V']
    ],

    /* ---------- PAC-MAN VS.: los poderes del fantasma ----------
     * Tampoco estaba en VS., y por otra razón: morder de un toque a un fantasma
     * que lleva una persona, sin que pueda hacer nada, no es una pelea. Es un
     * saco de golpes con teclas.
     *
     * Así que quien lleva fantasma tiene los SUYOS. Son dos y no cuatro a
     * propósito: un fantasma no come, no atraviesa muros y no asusta a nadie:
     * solo persigue. Lo único que necesita para que aquello sea una pelea es
     * poder cerrar una distancia y poder desaparecer un momento.
     *
     *   EMBESTIDA  x1.35 durante 4 s. Cierra la distancia o escapa del mordisco.
     *   ACECHO     4 s translúcido y SIN la marca del jugador encima, que es lo
     *              que hoy delata al fantasma humano a cien metros. Es la
     *              respuesta al MORDISCO: al que no ves venir no le acertaste.
     *
     * Las recargas son más largas que las de Pac-Man porque el fantasma no
     * muere: gastar mal un poder le cuesta tiempo, no la partida. */
    LIST_G: [
      { id: 'embestida', key: 'Q', name: 'EMBESTIDA', cd: 20 * 60 },
      { id: 'acecho',    key: 'W', name: 'ACECHO',    cd: 30 * 60 }
    ],
    CHARGE_TICKS: 4 * 60,    // 4 s de embestida
    CHARGE_MULT: 1.35,
    STALK_TICKS: 4 * 60,     // 4 s de acecho
    STALK_ALPHA: 0.3,        // lo poco que se ve mientras dura

    /* Volumen al que suenan los poderes DE LOS DEMÁS. Suenan todos —saber que
     * a alguien le queda una habilidad menos es información de la partida, y
     * el mordisco de al lado se oye venir— pero al 10%: a volumen entero, una
     * party de cuatro son dieciséis teclas peleándose con el waka y con lo que
     * estés haciendo tú. Los tuyos suenan enteros. */
    VOL_AJENO: 0.1
  };
  /* Alcance real del mordisco, en píxeles (ver BITE_TILES) */
  CFG.HAB.BITE_PX = CFG.HAB.BITE_TILES * CFG.TILE + CFG.HAB.BITE_MARGIN;

  /* Las listas por rol, con el mismo formato */
  CFG.HAB.ROLES = {
    asesino: CFG.HAB.LIST, tanque: CFG.HAB.LIST_T,
    soporte: CFG.HAB.LIST_S, mago: CFG.HAB.LIST_M
  };

  /* ---------- CATÁLOGO DESATADO ----------
   * Cada fila es Q/W/E/R y contiene las armas que se pueden escoger para esa
   * ranura. El motor sigue recibiendo una lista de cuatro objetos —una por
   * tecla—, así que una habilidad elegida no cambia de posición al viajar por
   * red ni al entrar en una repetición. Los kits antiguos están dentro del
   * catálogo como primera opción; eso hace que una partida sin elección nueva
   * conserve exactamente su comportamiento anterior. */
  (function () {
    function h(id, key, name, cd, desc) {
      return { id: id, key: key, name: name, cd: cd * 60, desc: desc || '' };
    }
    CFG.HAB.CATALOGO = {
      asesino: [
        [h('mordisco', 'Q', 'MORDISCO', 16, 'Come al fantasma cercano.'),
         h('shuriken', 'Q', 'SHURIKEN', 20, 'Tres cargas, 3 s entre una y la siguiente.'),
         h('bomba', 'Q', 'BOMBA', 24, 'Coloca y detona una bomba.')],
        [h('turbo', 'W', 'TURBO', 24, 'Velocidad ×1,5 durante 5 s.'),
         h('sombra', 'W', 'SOMBRA', 26, '4 s invisible y veloz; bajas de 500/750.'),
         h('frenesi', 'W', 'FRENESÍ', 26, '8 s; cada baja suma velocidad sin límite.'),
         h('carrona', 'W', 'CARROÑA', 24, 'Deja monedas al matar; las coge cualquiera.')],
        [h('flash', 'E', 'FLASH', 32, 'Salta tres casillas atravesando muros.'),
         h('marca', 'E', 'MARCA', 30, 'Marca un fantasma para cobrar doble.'),
         h('gancho_inverso', 'E', 'GANCHO INVERSO', 32, 'Lanza un gancho; si atrapa, te arrastra.')],
        [h('grito', 'R', 'GRITO', 60, 'Asusta a los cuatro fantasmas.'),
         h('misil', 'R', 'MISIL', 80, 'Mata en cadena al más cercano.'),
         h('ejecucion', 'R', 'EJECUCIÓN', 80, 'Una muerte por 5.000 puntos.'),
         h('caceria', 'R', 'CACERÍA', 90, '×1,2 velocidad; solo tú matas a los marcados.')]
      ],
      tanque: [
        [h('pisoton', 'Q', 'PISOTÓN', 32, 'Todos huyen del Tanque.'),
         h('empujon', 'Q', 'EMPUJÓN', 18, 'Empuja y aturde a un fantasma.'),
         h('rebote', 'Q', 'REBOTE', 30, 'El primer contacto mata al fantasma.')],
        [h('escudo', 'W', 'ESCUDO', 24, 'Aguanta un golpe.'),
         h('yunque', 'W', 'YUNQUE', 20, 'Quieto, eres intocable y rebotas fantasmas.'),
         h('piel_piedra', 'W', 'PIEL DE PIEDRA', 28, 'Inmune, pero lento, durante 5 s.')],
        /* La E del Tanque era la única ranura del juego con una sola opción:
         * sus dos candidatas se cayeron en el diseño. El GRITO DE GUERRA se
         * muda aquí desde la Q (21 sep) y de paso tapa ese agujero. */
        [h('provocar', 'E', 'PROVOCAR', 32, 'Todos van a por el Tanque.'),
         h('grito_guerra', 'E', 'GRITO DE GUERRA', 40, 'Clava a los cuatro fantasmas 2,5 s.')],
        [h('arrollar', 'R', 'APISONADORA', 46, 'Corre en línea recta hasta la pared.'),
         h('terremoto', 'R', 'TERREMOTO', 70, 'Devuelve a los fantasmas y ralentiza al equipo.'),
         h('fortaleza', 'R', 'FORTALEZA', 90, 'Protege un radio de 5 casillas.')]
      ],
      soporte: [
        [h('hielo', 'Q', 'DISPARO HELADO', 16, 'Congela al primer fantasma.'),
         h('mina', 'Q', 'MINA', 20, 'Trampa que mata y deja escudo.'),
         h('gancho', 'Q', 'GANCHO', 18, 'Atrae al fantasma y lo deja azul.'),
         h('telarana', 'Q', 'TELARAÑA', 30, 'Zona que ralentiza a los fantasmas.')],
        [h('inmunidad', 'W', 'INMUNIDAD', 24, 'No puede tocarte nada durante 3 s.'),
         h('estela', 'W', 'ESTELA', 24, 'Acelera al equipo con un rastro.'),
         h('puente', 'W', 'PUENTE', 32, 'Abre un paso por el muro de delante 8 s.'),
         h('cadena', 'W', 'CADENA', 28, 'Comparte puntos y absorbe un golpe.')],
        [h('aliado', 'E', 'ESCUDO ALIADO', 32, 'Da escudo al compañero.'),
         h('muro', 'E', 'MURO', 32, 'Pared que hace retroceder fantasmas.'),
         h('relevo', 'E', 'RELEVO', 26, 'Teletransporta al compañero cercano.'),
         h('faro', 'E', 'FARO', 30, 'Reduce la recarga de la R de un aliado.'),
         h('sirena', 'E', 'SIRENA', 34, 'Atrae fantasmas a un punto.')],
        [h('vida', 'R', 'VIDA EXTRA', 180, 'Da una vida al compañero que menos tiene.'),
         h('resurreccion', 'R', 'RESURRECCIÓN', 180, 'Levanta un cadáver caducado.'),
         h('campo', 'R', 'CAMPO', 150, 'Nadie del equipo muere durante 5 s.'),
         h('hospital', 'R', 'HOSPITAL', 150, 'Los caídos vuelven durante 10 s.')]
      ],
      mago: [
        [h('fuego', 'Q', 'BOLA DE FUEGO', 20, 'Mata al primer fantasma.'),
         h('bola_guiada', 'Q', 'BOLA GUIADA', 22, 'No falla y da 150 puntos.'),
         /* 22 sep 2026: el azul del TOQUE ARCANO se contagia, así que un solo
          * toque puede acabar poniendo azules a los cuatro. De 18 s a 24 s:
          * sigue siendo una Q barata, pero ya no se encadena un contagio
          * detrás de otro sin dejar que el anterior se apague. */
         h('toque_arcano', 'Q', 'TOQUE ARCANO', 24, 'Vuelve azul a un fantasma, y el azul se contagia.'),
         h('chispa', 'Q', 'CHISPA', 20, 'Aturde dos segundos.')],
        [h('portal', 'W', 'PORTAL', 46, 'Abre un paso entre dos bocas.'),
         h('clon', 'W', 'CLON', 30, 'Los fantasmas persiguen al doble.'),
         h('totem', 'W', 'TÓTEM', 34, 'Torre que dispara automáticamente.')],
        [h('runa', 'E', 'RUNA', 32, 'Trampa que mata en una casilla.'),
         h('gravedad', 'E', 'GRAVEDAD', 32, 'Agrupa y detiene fantasmas.'),
         h('dominio', 'E', 'DOMINIO', 32, 'El fantasma más cercano caza a los suyos 6 s.')],
        [h('tormenta', 'R', 'TORMENTA', 46, 'Tres rayos a distancia.'),
         h('meteoro', 'R', 'METEORO', 60, 'Mantenla para apuntar dónde cae.'),
         h('eclipse', 'R', 'ECLIPSE', 60, 'Ceguera y ralentización global.')]
      ]
    };
    CFG.HAB.catalogoDe = function (rol) {
      return CFG.HAB.CATALOGO[CFG.HAB.rol(rol)] || CFG.HAB.CATALOGO.asesino;
    };
    CFG.HAB.loadoutValido = function (rol, raw) {
      var cat = CFG.HAB.catalogoDe(rol), ids = String(raw == null ? '' : raw).split(','), out = [];
      for (var k = 0; k < 4; k++) {
        var id = ids[k], fila = cat[k], ok = null, i;
        for (i = 0; i < fila.length; i++) if (fila[i].id === id) { ok = id; break; }
        out.push(ok || fila[0].id);
      }
      return out.join(',');
    };
  })();
  /* Un rol que no existe (una versión más nueva, un dato roto) es ASESINO */
  CFG.HAB.rol = function (id) {
    return CFG.HAB.ROLES.hasOwnProperty(id) ? id : 'asesino';
  };

  /* Recarga de una habilidad, en segundos (para los textos de la interfaz).
   * Sin rol, la del ASESINO. */
  CFG.HAB.segs = function (k, rol) {
    var h = CFG.HAB.ROLES[CFG.HAB.rol(rol)][k];
    return h ? Math.round(h.cd / 60) : 0;
  };

  /* ---------- SUPERVIVENCIA (js/supervivencia.js) ----------
   * Party online, todos contra todos, una vida cada uno. */
  CFG.SUPERV = {
    NOMBRE: 'SUPERVIVENCIA',
    PODER: 6 * 60,          // la superpastilla deja eliminar a otros Pac-Man
    VUELVE: 20 * 60,        // y vuelve a salir al rato
    CHOQUE: 9,              // px: lo que tienen que acercarse dos Pac-Man
    ZONA_INICIO: 45 * 60,   // el primer anillo se cierra a los 45 s
    ZONA_CADA: 20 * 60,     // y luego uno cada 20 s
    ZONA_MAX: 11,           // hasta dejar solo el centro
    ZONA_GRACIA: 2 * 60,    // dentro de la zona roja, 2 s y fuera
    AVISO: 5 * 60           // el anillo siguiente parpadea los últimos 5 s
  };

  /* ---------- DESATADO: el REY FANTASMA (js/jefe.js) ----------
   * Cada CADA niveles. Vida = (VIDA + VIDA_POR_JUGADOR por cada jugador de
   * más) * (1 + VIDA_POR_TANDA por cada jefe ya pasado). PREMIO va dentro del
   * techo del servidor (enviar-record: un nivel admite más de 14.000). */
  CFG.JEFE = {
    CADA: 5,
    VIDA: 24,
    VIDA_POR_JUGADOR: 12,
    VIDA_POR_TANDA: 0.3,
    PREMIO: 3000,
    INICIO: { x: 13, y: 11 },          // casilla sobre la puerta de la casa
    VEL: 0.85,                         // sobre la de los fantasmas del nivel
    VEL_FURIA: 1.15,
    VEL_CARGA: 2.4,
    RADIO_CHOQUE: 11,                  // px: es el doble de grande
    RADIO_DIBUJO: 11,
    CARGA_CADA: 7 * 60,                // embestida
    CARGA_FURIA: 4 * 60,
    AVISO: 50,                         // parpadeo en rojo antes de embestir
    CARGA_MAX: 2 * 60,
    INVOCA_CADA: 12 * 60,              // suelta un fantasma de la casa
    INVOCA_FURIA: 8 * 60,
    INVOCA_PARON: 40,
    INV: 45,                           // tras un golpe, sin recibir otro
    HIELO: 60,                         // lo que lo congela el hielo
    /* MORDISCO: además del daño, lo ATURDE 2 s (18 sep). Sin esto la Q del
     * Asesino contra el jefe era un intercambio perdido: para morderlo hay
     * que pegarse a él, y al hacerlo te mataba en el mismo tick. Aturdido no
     * se mueve y no mata al tocarlo (ver Jefe.mata), así que da tiempo a
     * salir. */
    ATURDE_MORDISCO: 2 * 60,
    /* La APISONADORA del Tanque, además de su daño, lo deja parado 3 s:
     * cruzarse el laberinto para embestirlo tiene que valer algo (18 sep). */
    ATURDE_APISONADORA: 3 * 60,
    /* lo que quita cada cosa.
     *
     * EL CATÁLOGO TAMBIÉN LE PEGA (22 sep 2026). Hasta hoy solo le hacían
     * daño los kits clásicos: quien eligiera una habilidad nueva se plantaba
     * en un nivel de jefe sin nada que hacerle, y el nivel no se acaba hasta
     * tumbarlo. Los números salen de la escala que ya había, que va por
     * RECARGA y no por rol: una Q vale 2-3, una E vale 4 y una R vale de 4 a
     * 6 (el mordisco es 3 con 16 s, la bola 2 con 20 s, la runa 4 con 32 s y
     * la apisonadora 4 con 46 s).
     *
     * Los tres números que se salen de la regla, y por qué:
     *   · shuriken 1, pero son TRES por ráfaga: los tres juntos valen lo que
     *     un mordisco, y entran aunque el rey acabe de recibir otro golpe
     *     (como la runa y el azul), que si no la segunda y la tercera carga
     *     se perdían contra el respiro de INV;
     *   · tótem 1 por bala, y dispara cada dos segundos mientras dure: una
     *     torre plantada al lado del rey le saca cuatro de vida, que es lo
     *     que vale una W que hay que colocar y defender;
     *   · ejecución 10, el golpe más gordo de la tabla. NO LO MATA DE UN
     *     GOLPE a propósito: a un fantasma sí, pero el rey ES el nivel —su
     *     barra es la condición para pasar de pantalla— y una R que se lo
     *     salte entero convierte el nivel de jefe en pulsar una tecla. En
     *     party, además, cuatro Asesinos lo tumbarían antes de su primera
     *     embestida. Diez de los veinticuatro que tiene a un jugador es
     *     media barra en dos ejecuciones: pega como lo que vale, sin borrar
     *     el nivel. */
    DANO: { azul: 6, mordisco: 3, fuego: 2, rayo: 2, runa: 4, aplasta: 4,
            /* Asesino */
            shuriken: 1, bomba: 3, misil: 6, ejecucion: 10,
            /* Tanque */
            rebote: 3, terremoto: 6,
            /* Soporte */
            mina: 3, gancho: 1,
            /* Mago */
            guiada: 2, totem: 1, arcano: 1, meteoro: 5, dominio: 3 },
    /* LO QUE LO DEJA PARADO, y cuánto.
     *
     * Regla: UN TERCIO de lo que ese mismo poder aturde a un fantasma, con
     * medio segundo de suelo. Es el precedente que ya había en el archivo:
     * el hielo clava a un fantasma 3 s (HAB.HIELO_TICKS) y al rey 1 s (el
     * HIELO de aquí arriba). Es un jefe: se le apaga un momento para salir
     * de debajo, no se le deja quieto mientras se le pega. */
    ATURDE: { empujon: 30, grito_guerra: 50, chispa: 60, gravedad: 40, clon: 30,
              /* El REBOTE no aturde a nadie: al fantasma lo mata y ahí se
               * acaba el contacto. Contra el rey hace falta, porque después
               * del golpe sigue encima; sin este segundo el Tanque rebotaba
               * y moría en el tick siguiente. Es el mismo remedio que el
               * mordisco (ATURDE_MORDISCO), en pequeño. */
              rebote: 60 },
    COLOR: '#d0145a',
    COLOR_FURIA: '#ff5a00'
  };

  /* ---------- Red (modo online) ---------- */
  CFG.NET = {
    /* Versión del protocolo (debe coincidir en ambos lados). Sube cuando
     * cambia la forma de lo que viaja: la 6 pasó el marcador de PAC-MAN VS.
     * de un número suelto a uno por cazador; la 7 trae el modo DESATADO
     * (el 'hab' del saludo y los eventos de poder); la 8, CACERÍA (el
     * 'caza' de la lista y del arranque, y el reloj del poder en la foto);
     * la 9, la TIENDA (el emote viaja por su id y no por su posición, y cada
     * jugador lleva su accesorio y su efecto en el saludo); la 10, los ROLES
     * de DESATADO (el rol en el saludo, el arranque y la foto, con el hielo,
     * los proyectiles, los portales y las runas); la 11, MANTENER PULSADO
     * (la 'm' de la petición de poder y las placas de hielo en la foto); la 12, el
     * PORTAL con otra dimensión (la 'dimension' de cada jugador en la foto); la
     * 13, el REY FANTASMA ('jf') y SUPERVIVENCIA ('sv' en la foto, la sala y
     * el arranque); la 14, PASAR EL MANDO (el mensaje 'mando', con el que el
     * anfitrión que se va le deja la partida al siguiente); la 15, los GIROS
     * AL INSTANTE (el mensaje 'gir' del anfitrión y la 'g' del de posición). */
    PROTO: 15,
    SNAP_EVERY: 5,          // ticks entre instantáneas del anfitrión (12 Hz)
    POS_EVERY: 5,           // ticks entre posiciones del invitado (12 Hz)
    PELLET_SYNC_EVERY: 15,  // 1 de cada N instantáneas lleva el mapa de pastillas
    WAIT_TICKS: 90,         // sin datos 1.5 s: aviso "esperando conexión"
    DROP_TICKS: 600,        // sin datos 10 s: desconexión (lo que insiste net.js en reconectar)
    NOTICE_TICKS: 150,      // aviso en pantalla ~2.5 s antes de volver al menú
    HELLO_TIMEOUT_MS: 6000, // espera de respuesta del anfitrión al unirse
    VOTE_TICKS: 1200,       // 20 s para responder a una votación (rendirse/revancha)
    ROOM_ALPHABET: 'ABCDEFGHJKLMNPQRSTUVWXYZ',   // sin I/O (se confunden)
    ROOM_LEN: 4
  };

  window.PM.CFG = CFG;
})();
