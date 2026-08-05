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
   * Se incluyen las cuatro casillas del SPEC tal cual y, además, los
   * cruces clásicos equivalentes del arcade en este laberinto (sobre la
   * casa de fantasmas, fila 11, y sobre Pac-Man, fila 23), ya que las
   * casillas literales del SPEC caen en interior de casa / muros. */
  CFG.NO_UP_TILES = [
    [12, 13], [15, 13], [12, 25], [15, 25],   // [col, fila] — según SPEC
    [12, 11], [15, 11], [12, 23], [15, 23]    // cruces arcade equivalentes
  ];

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
  CFG.WALL_INSET = 2;

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
   * Se desbloquean con el NIVEL DE JUGADOR, que sube jugando. Se dibujan en
   * sprites.js. La que ya lleves puesta no se te quita nunca, aunque el
   * requisito suba: ver PM.Skins.allowed(). */
  CFG.SKINS = [
    { id: 'clasico', name: 'CLÁSICO', level: 1 },
    { id: 'sombra',  name: 'SOMBRA',  level: 3 },
    { id: 'neon',    name: 'NEÓN',    level: 7 },
    { id: 'aro',     name: 'ARO',     level: 12 },
    { id: 'pixel',   name: 'PÍXEL',   level: 20 },
    { id: 'ojos',    name: 'OJOS',    level: 30 }
  ];
  /* El orden de dibujo en OPCIONES es el de arriba; SKIN_IDS solo sirve para
   * validar lo guardado, así que da igual en qué orden esté. */
  CFG.SKIN_IDS = ['clasico', 'ojos', 'neon', 'aro', 'pixel', 'sombra'];

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
   */
  CFG.ACH_KEY = 'pacman-topmundial-logros';
  CFG.ACHIEVEMENTS = [
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
      goal: 9000, menor: true, fmt: 'tiempo' }
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
    LIMIT: 20,
    MAX_POINTS: 10000000,     // descarta envíos absurdos antes de mandarlos
    MAX_TIME: 6000000         // centésimas: 16 h y pico, de sobra
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
    KEY: 'pacman-topmundial-sesion'   // sesión guardada en este navegador
  };

  /* Nombres de invitado: se sortean juntando una pareja de estas listas y
   * recortando a NICK_MAX, para que quepan en el marcador. */
  CFG.RANDOM_NAMES = {
    a: ['PAC', 'NEO', 'ZIG', 'TOP', 'BIT', 'RAY', 'MAX', 'ACE', 'JET', 'VIC',
        'LOK', 'RIO', 'DUX', 'KIR', 'NOX', 'ZAS'],
    b: ['MAN', 'BOT', 'ZAG', 'KID', 'REX', 'FOX', 'ONE', 'PRO', 'ZAP', 'RUN',
        'GUM', 'TAP', 'WIN', 'POW', 'MIX', 'JAM']
  };

  /* ---------- Aviso de maestría en partida ---------- */
  CFG.BADGE_ANIM_TICKS = 300;   // 5 s: entrada, lucimiento y salida

  /* ---------- Ajustes (contrato con ui.js/game.js) ---------- */
  CFG.SETTINGS_KEY = 'pacman-topmundial-settings';
  CFG.HIGHSCORE_KEY = 'pacman-topmundial-highscore';
  CFG.HIGHSCORE2_KEY = 'pacman-topmundial-highscore-2p';   // récord de equipo (2 jugadores)
  /* Longitud máxima de un nombre de jugador. El marcador de la partida sabe
   * encoger la letra cuando el nombre no cabe en su hueco (renderHUD), así que
   * este número lo manda todo: campos de texto, ranking, amigos y cuentas.
   * Si se sube, hay que subir también los CHECK de supabase/ranking.sql y
   * supabase/cuentas.sql, que validan lo mismo en el servidor. */
  CFG.NICK_MAX = 12;
  CFG.DEFAULT_SETTINGS = {
    difficultyPreset: 'normal',   // 'facil' | 'normal' | 'dificil' | 'custom'
    nick1: '',                    // nombre del jugador 1 (y nombre propio online)
    nick2: '',                    // nombre del jugador 2 (dos jugadores locales)
    pacColor: '#ffff00',
    pac2Color: '#00ff00',         // color del jugador 2
    skin1: 'clasico',             // skin del jugador 1 (y propia online)
    skin2: 'clasico',             // skin del jugador 2
    avatar: 'pac',                // avatar del perfil
    livesMode: 'shared',          // 'shared' (fondo común) | 'individual'
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

  /* ---------- Red (modo online) ---------- */
  CFG.NET = {
    PROTO: 4,               // versión del protocolo (debe coincidir en ambos)
    SNAP_EVERY: 5,          // ticks entre instantáneas del anfitrión (12 Hz)
    POS_EVERY: 5,           // ticks entre posiciones del invitado (12 Hz)
    PELLET_SYNC_EVERY: 15,  // 1 de cada N instantáneas lleva el mapa de pastillas
    WAIT_TICKS: 90,         // sin datos 1.5 s: aviso "esperando conexión"
    DROP_TICKS: 480,        // sin datos 8 s: desconexión
    NOTICE_TICKS: 150,      // aviso en pantalla ~2.5 s antes de volver al menú
    HELLO_TIMEOUT_MS: 6000, // espera de respuesta del anfitrión al unirse
    VOTE_TICKS: 1200,       // 20 s para responder a una votación (rendirse/revancha)
    ROOM_ALPHABET: 'ABCDEFGHJKLMNPQRSTUVWXYZ',   // sin I/O (se confunden)
    ROOM_LEN: 4
  };

  window.PM.CFG = CFG;
})();
