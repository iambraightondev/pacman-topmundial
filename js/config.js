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
  CFG.GAMEOVER_TICKS = 180;         // GAME OVER ~3 s

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
    pellet: '#ffb8ae',
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
      ve: 'GORRO ROJO CON BORDE BLANCO Y LA BORLA COLGANDO.' }
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
  CFG.TIENDA = {
    INICIALES: 1500,
    POR_PARTIDA: 5,
    PARTIDA_MIN_S: 60,
    POR_MIL: 1,
    TOPE_PARTIDA: 40,
    POR_RETO: 20,
    POR_SEMANA: 150,
    EMOTE_TECLAS: 6,
    /* REGALO DE VETERANO (15 de septiembre, opción A elegida por Braighton):
     * quien ya había jugado antes de la tienda no empieza igual que quien
     * llega hoy. Una sola vez, con lo que lleves: 5 por partida jugada y 50
     * por logro conseguido, sin tope. Lo de después se gana como todo el
     * mundo. */
    VETERANO_POR_PARTIDA: 5,
    VETERANO_POR_LOGRO: 50
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
      ve: 'PÁRPADOS A MEDIA ASTA, UNA CEJA LEVANTADA Y TRES PUNTITOS.' }
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
      ve: 'AURA ELÉCTRICA SUAVE Y, DE VEZ EN CUANDO, RAYOS CORTOS QUE SALTAN DEL CUERPO.' }
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
      ve: 'CINTA ROJA CON PLACA Y LAS PUNTAS ONDEANDO DETRÁS.' }
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
   * (por ejemplo abriendo el juego con file://) el resto suena igual. */
  CFG.VOICES = [
    'audio/racha1-hueso.m4a',
    'audio/racha2-diablo.m4a',
    'audio/racha3-huesaso.m4a',
    'audio/racha4-diablocono.m4a'
  ];
  CFG.VOICE_NAMES = ['EL HUESO', 'EL DIABLO', 'EL HUESASO', 'EL DIABLO COÑO'];

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
    XP: 400,                  // experiencia por reto cumplido
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
    livesMode: 'shared',          // 'shared' (fondo común) | 'individual'
    vsGhost2: -1,                 // PAC-MAN VS. en local: fantasma del J2 (-1 = Pac-Man)
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
    volVoices: 1
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

  /* Recarga de una habilidad, en segundos (para los textos de la interfaz) */
  CFG.HAB.segs = function (k) {
    var h = CFG.HAB.LIST[k];
    return h ? Math.round(h.cd / 60) : 0;
  };

  /* ---------- Red (modo online) ---------- */
  CFG.NET = {
    /* Versión del protocolo (debe coincidir en ambos lados). Sube cuando
     * cambia la forma de lo que viaja: la 6 pasó el marcador de PAC-MAN VS.
     * de un número suelto a uno por cazador; la 7 trae el modo DESATADO
     * (el 'hab' del saludo y los eventos de poder); la 8, CACERÍA (el
     * 'caza' de la lista y del arranque, y el reloj del poder en la foto);
     * la 9, la TIENDA (el emote viaja por su id y no por su posición, y cada
     * jugador lleva su accesorio y su efecto en el saludo). */
    PROTO: 9,
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
