/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/tests.js
 * Pruebas del juego, sin dependencias: se abren en tests.html y
 * usan los mismos módulos que la partida real.
 *
 * Cubren sobre todo las cosas que ya se rompieron alguna vez
 * (muerte por jugador, señal de vida online, rachas, maestrías,
 * ranking) para que no vuelvan a colarse.
 *
 * Resultado también en window.__TESTS = { total, fallos, casos }
 * por si se quiere leer desde fuera.
 * ============================================================ */
(function () {
  'use strict';

  /* El juego arranca en DOMContentLoaded (ui.js), así que las pruebas
   * esperan a que esté montado: si no, no hay ni fantasmas ni interfaz. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }

  function arrancar() {

  var CFG = window.PM.CFG;
  var G = window.PM.Game;
  var casos = [];

  function test(nombre, fn) {
    var caso = { nombre: nombre, ok: true, error: null };
    try { fn(); } catch (e) { caso.ok = false; caso.error = e.message || String(e); }
    casos.push(caso);
  }

  function ok(cond, msg) {
    if (!cond) throw new Error(msg || 'se esperaba cierto');
  }

  function eq(a, b, msg) {
    if (a !== b) {
      throw new Error((msg || 'valores distintos') + ': ' + a + ' != ' + b);
    }
  }

  /* Partida controlada: sin sonido, sin red y sin muertes por sorpresa */
  function partida(jugadores, net) {
    window.PM.settings.muted = true;
    G.newGame({ players: jugadores, net: net || null,
                names: net ? ['UNO', 'DOS'] : null });
    G.state = 'PLAYING';
    G.readyTicks = 0;
    for (var i = 0; i < G.pacs.length; i++) G.pacs[i].safeTicks = 999999;
    return G;
  }

  function ticks(n) { for (var i = 0; i < n; i++) G.step(); }

  // ---------------------------------------------------------------
  // Laberinto y arranque
  // ---------------------------------------------------------------
  test('el laberinto tiene 244 pastillas', function () {
    var n = 0;
    for (var r = 0; r < CFG.ROWS; r++) {
      for (var c = 0; c < CFG.COLS; c++) {
        var ch = CFG.MAZE[r].charAt(c);
        if (ch === '.' || ch === 'o') n++;
      }
    }
    eq(n, CFG.PELLET_TOTAL);
  });

  test('el laberinto es el del arcade, sin huecos en el borde', function () {
    for (var r = 0; r < CFG.ROWS; r++) {
      eq(CFG.MAZE[r].length, CFG.COLS, 'fila ' + r + ' con ancho raro');
    }
    // el contorno solo se abre en el túnel: en las filas de la casa de
    // fantasmas los laterales son muro macizo hasta la columna 5
    for (r = 9; r <= 19; r++) {
      if (r === CFG.TUNNEL_ROW) continue;
      for (var c = 0; c <= 5; c++) {
        eq(CFG.MAZE[r].charAt(c), '#', 'hueco en (' + c + ',' + r + ')');
        eq(CFG.MAZE[r].charAt(CFG.COLS - 1 - c), '#',
           'hueco a la derecha en la fila ' + r);
      }
    }
  });

  // ---------------------------------------------------------------
  // Laberintos alternativos (modo aparte)
  // ---------------------------------------------------------------
  /* ¿Se puede llegar a esta casilla desde donde sale Pac-Man? El túnel da
   * la vuelta, así que las columnas se envuelven. */
  function abiertoEn(rows, c, r) {
    if (r < 0 || r >= CFG.ROWS) return false;
    c = CFG.wrapCol(c);
    var ch = rows[r].charAt(c);
    return ch !== '#' && ch !== '-';
  }

  function alcanzables(rows) {
    var vistos = {}, cola = [[13, 23]];
    vistos['13,23'] = 1;
    var pasos = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    while (cola.length) {
      var p = cola.pop();
      for (var i = 0; i < 4; i++) {
        var c = CFG.wrapCol(p[0] + pasos[i][0]), r = p[1] + pasos[i][1];
        if (!abiertoEn(rows, c, r)) continue;
        var k = c + ',' + r;
        if (vistos[k]) continue;
        vistos[k] = 1;
        cola.push([c, r]);
      }
    }
    return vistos;
  }

  test('en los laberintos alternativos se llega a todas las pastillas',
    function () {
      var M = window.PM.Mazes;
      ok(M && M.LIST.length >= 2, 'hay laberintos que probar');
      M.LIST.forEach(function (m) {
        var rows = m.rows;
        eq(rows.length, CFG.ROWS, m.name + ': número de filas');
        var vistos = alcanzables(rows), n = 0, sueltas = 0;
        for (var r = 0; r < CFG.ROWS; r++) {
          eq(rows[r].length, CFG.COLS, m.name + ': ancho de la fila ' + r);
          for (var c = 0; c < CFG.COLS; c++) {
            var ch = rows[r].charAt(c);
            if (ch !== '.' && ch !== 'o') continue;
            n++;
            if (!vistos[c + ',' + r]) sueltas++;
          }
        }
        eq(sueltas, 0, m.name + ': pastillas a las que no se llega');
        eq(n, m.pellets, m.name + ': las pastillas que declara');
      });
    });

  test('los laberintos alternativos no tienen callejones', function () {
    /* Un callejón sin salida rompe la persecución: el fantasma entra, se
     * da la vuelta (que no puede) y se queda encerrado. La casa de
     * fantasmas es la única excepción, que para eso tiene puerta. */
    window.PM.Mazes.LIST.forEach(function (m) {
      var rows = m.rows;
      for (var r = 0; r < CFG.ROWS; r++) {
        for (var c = 0; c < CFG.COLS; c++) {
          if (!abiertoEn(rows, c, r)) continue;
          if (c >= 10 && c <= 17 && r >= 12 && r <= 16) continue;   // la casa
          var salidas = 0;
          if (abiertoEn(rows, c, r - 1)) salidas++;
          if (abiertoEn(rows, c, r + 1)) salidas++;
          if (abiertoEn(rows, c - 1, r)) salidas++;
          if (abiertoEn(rows, c + 1, r)) salidas++;
          ok(salidas >= 2,
             m.name + ': callejón en (' + c + ',' + r + '), salidas ' + salidas);
        }
      }
    });
  });

  test('los laberintos alternativos respetan casa, túnel y salidas',
    function () {
      window.PM.Mazes.LIST.forEach(function (m) {
        var rows = m.rows, r, c;
        // el corazón del motor (casa, puerta, túnel y zonas sin subir)
        for (r = 9; r <= 19; r++) {
          eq(rows[r], CFG.MAZE_CLASSIC[r], m.name + ': fila ' + r + ' del núcleo');
        }
        // simetría izquierda-derecha, que es lo que le da el aire arcade
        for (r = 0; r < CFG.ROWS; r++) {
          for (c = 0; c < 14; c++) {
            eq(rows[r].charAt(c), rows[r].charAt(CFG.COLS - 1 - c),
               m.name + ': asimetría en la fila ' + r);
          }
        }
        // borde cerrado salvo el túnel, y salidas despejadas
        for (r = 0; r < CFG.ROWS; r++) {
          if (r === CFG.TUNNEL_ROW) continue;
          eq(rows[r].charAt(0), '#', m.name + ': borde izquierdo, fila ' + r);
          eq(rows[r].charAt(CFG.COLS - 1), '#', m.name + ': borde derecho, fila ' + r);
        }
        [[13, 23], [14, 23], [13, 11], [14, 11], [13, 17], [14, 17]]
          .forEach(function (p) {
            ok(rows[p[1]].charAt(p[0]) !== '#',
               m.name + ': salida tapada en (' + p[0] + ',' + p[1] + ')');
          });
        // cuatro energizantes, uno por esquina
        var ener = [];
        for (r = 0; r < CFG.ROWS; r++) {
          for (c = 0; c < CFG.COLS; c++) {
            if (rows[r].charAt(c) === 'o') ener.push([c, r]);
          }
        }
        eq(ener.length, 4, m.name + ': energizantes');
        ener.forEach(function (e) {
          ok((e[0] <= 6 || e[0] >= 21) && (e[1] <= 8 || e[1] >= 20),
             m.name + ': energizante fuera de las esquinas ' + e);
        });
      });
    });

  test('el laberinto de 1980 vuelve solo al salir del modo', function () {
    var M = window.PM.Mazes;
    var id = M.LIST[0].id;
    try {
      window.PM.settings.muted = true;
      G.newGame({ players: 1, maze: id });
      ok(CFG.MAZE[1] !== CFG.MAZE_CLASSIC[1], 'en partida manda el alternativo');
      eq(CFG.PELLET_TOTAL, M.LIST[0].pellets, 'con sus pastillas');
      eq(G.dotsLeft, M.LIST[0].pellets, 'y repartidas en el laberinto');
      // y se juega de verdad: unos segundos de partida sin petar
      G.state = 'PLAYING';
      G.readyTicks = 0;
      G.pacs[0].safeTicks = 999999;
      ticks(240);
      ok(G.dotsLeft < M.LIST[0].pellets, 'Pac-Man se abre camino comiendo');
      G.toMenu();
      eq(CFG.MAZE.join('|'), CFG.MAZE_CLASSIC.join('|'), 'y al salir, el clásico');
      eq(CFG.PELLET_TOTAL, 244);
    } finally {
      G.toMenu();
    }
  });

  test('una partida en otro laberinto no entra en el top mundial', function () {
    var R = window.PM.Ranking;
    var orig = R.submit, n = 0;
    var n1 = window.PM.settings.nick1;
    R.submit = function () { n++; };
    window.PM.settings.nick1 = 'ALGUIEN';
    try {
      window.PM.settings.muted = true;
      G.newGame({ players: 1, maze: window.PM.Mazes.LIST[0].id });
      G.score = 5000; G.rankingSent = false;
      G.submitRanking();
      eq(n, 0, 'en otro laberinto no se compara nada');
      ok(!G.canTimeRecord(), 'ni cuenta el tiempo del nivel 1');
      G.toMenu();
      G.newGame({ players: 1 });
      G.score = 5000; G.rankingSent = false;
      G.submitRanking();
      eq(n, 1, 'en el clásico sí');
    } finally {
      R.submit = orig;
      window.PM.settings.nick1 = n1;
      G.toMenu();
    }
  });

  // ---------------------------------------------------------------
  // Fidelidad arcade: sin esto los patrones memorizados no valen
  // ---------------------------------------------------------------
  /* Velocidad real de Pac-Man cruzando un pasillo con puntos. En el arcade
   * corre a `pac` y pierde un fotograma por punto, lo que da la columna
   * `pacDots`. Aplicar las dos cosas lo dejaba un 10% lento. */
  function pctPorPasilloConPuntos(nivel) {
    partida(1);
    G.level = nivel;
    G.speedRow = CFG.speedRow(nivel);
    var p = G.pacs[0];
    var desde = 2 * 8 + 4, hasta = 20 * 8 + 4;      // fila 5: 18 casillas
    p.x = desde; p.y = 5 * 8 + 4;
    p.dir = CFG.DIR.RIGHT; p.nextDir = CFG.DIR.RIGHT;
    var t = 0;
    while (p.x < hasta && t < 1000) { G.step(); t++; }
    return ((hasta - desde) / t) / CFG.BASE_SPEED * 100;
  }

  test('comer puntos frena a Pac-Man lo justo (tabla del arcade)', function () {
    [[1, 71], [2, 79], [5, 87]].forEach(function (caso) {
      var pct = pctPorPasilloConPuntos(caso[0]);
      ok(Math.abs(pct - caso[1]) <= 2.5,
         'nivel ' + caso[0] + ': ' + pct.toFixed(1) + '% en vez de ' + caso[1] + '%');
    });
  });

  test('el mismo nivel se juega siempre igual (azar reproducible)', function () {
    function firma() {
      partida(1);
      var s = '';
      for (var i = 0; i < 600; i++) {
        G.step();
        if (i % 100 === 0) {
          s += G.ghosts.map(function (g) {
            return Math.round(g.x) + ',' + Math.round(g.y) + ',' + g.dir;
          }).join('|') + ' ';
        }
      }
      return s;
    }
    eq(firma(), firma(), 'dos partidas iguales dan recorridos distintos');
  });

  test('la inversión forzada es inmediata, no espera al centro', function () {
    partida(1);
    var g = G.ghosts[0];
    g.mode = 'normal';
    g.x = 6 * 8 + 4; g.y = 5 * 8 + 3;    // entre centros, bajando
    g.dir = CFG.DIR.DOWN;
    G.forceReversal();
    eq(g.dir, CFG.DIR.UP, 'debería haberse dado la vuelta ya');
  });

  /* El arcade compara casillas una vez por fotograma, así que dos que se
   * cruzan de frente e intercambian casilla en el mismo tick se atraviesan.
   * Se respeta a propósito: los patrones del original cuentan con ello. */
  test('cruzarse de frente con un fantasma deja pasar, como en el arcade', function () {
    partida(1);
    var p = G.pacs[0], g = G.ghosts[0];
    p.safeTicks = 0;
    g.mode = 'normal';
    g.frightened = false;
    // misma fila, casillas contiguas, yendo el uno hacia el otro
    p.x = 6 * 8 + 4; p.y = 5 * 8 + 4;
    p.dir = CFG.DIR.RIGHT; p.nextDir = CFG.DIR.RIGHT;
    g.x = 7 * 8 + 4; g.y = 5 * 8 + 4;
    g.dir = CFG.DIR.LEFT;
    g.clearPlan();
    var pasos = 0;
    while (pasos < 12 && G.state === 'PLAYING' && p.tileX() <= g.tileX()) {
      G.step(); pasos++;
    }
    eq(G.state, 'PLAYING', 'no debería haber muerto al cruzarse');
    ok(p.tileX() > g.tileX(), 'se han atravesado');
  });

  test('compartir casilla con un fantasma sí mata', function () {
    partida(1);
    var p = G.pacs[0], g = G.ghosts[0];
    p.safeTicks = 0;
    g.mode = 'normal';
    g.frightened = false;
    p.x = 6 * 8 + 4; p.y = 5 * 8 + 4;
    g.x = p.x; g.y = p.y;
    G.step();
    eq(G.state, 'DYING');
  });

  test('el fantasma decide la salida al entrar en la casilla', function () {
    partida(1);
    var g = G.ghosts[0];
    g.mode = 'normal';
    g.frightened = false;
    g.x = 6 * 8 + 4; g.y = 8 * 8 + 4;    // cruce del pasillo de la izquierda
    g.dir = CFG.DIR.RIGHT;
    g.clearPlan();
    g.update(G);
    ok(g.planDir >= 0, 'nada más entrar ya tiene pensada la salida');
    eq(g.planTile, g.tileY() * CFG.COLS + g.tileX(), 'pensada para SU casilla');
  });

  test('una partida nueva arranca en READY con las vidas configuradas', function () {
    partida(1);
    G.newGame({ players: 1 });
    eq(G.state, 'READY');
    eq(G.score, 0);
    eq(G.lives, window.PM.settings.startLives);
  });

  // ---------------------------------------------------------------
  // Muerte por jugador (la partida no se para si queda alguien)
  // ---------------------------------------------------------------
  test('en 1 jugador, morir para la partida', function () {
    partida(1);
    G.startDeath(0);
    eq(G.state, 'DYING');
  });

  test('en 2 jugadores, si muere uno la partida sigue', function () {
    partida(2);
    G.startDeath(0);
    eq(G.state, 'PLAYING');
    ok(G.pacs[0].dying, 'el que muere se congela');
    ok(!G.pacs[1].dying, 'el otro sigue vivo');
  });

  test('el que muere reaparece con margen de gracia', function () {
    partida(2);
    G.lives = 3;
    G.startDeath(0);
    ticks(CFG.DEATH_FREEZE_TICKS + CFG.DEATH_ANIM_TICKS + 2);
    ok(!G.pacs[0].dying, 'ha terminado la animación');
    eq(G.lives, 2);
    ok(G.pacs[0].safeTicks > 0, 'reaparece invulnerable un momento');
    eq(G.state, 'PLAYING');
  });

  test('cuando cae el último, parón clásico', function () {
    partida(2);
    G.lives = 3;
    G.startDeath(0);
    G.startDeath(1);
    eq(G.state, 'DYING');
  });

  test('sin vidas, el jugador queda de espectador y el otro sigue', function () {
    partida(2);
    G.lives = 1;
    G.startDeath(0);
    ticks(CFG.DEATH_FREEZE_TICKS + CFG.DEATH_ANIM_TICKS + 2);
    ok(G.pacs[0].out, 'se queda mirando');
    ok(!G.pacs[1].out, 'el compañero sigue');
    eq(G.state, 'PLAYING');
  });

  test('a un jugador muerto no le persiguen los fantasmas', function () {
    partida(2);
    G.pacs[0].x = 20; G.pacs[0].y = 20;
    G.pacs[1].x = 200; G.pacs[1].y = 200;
    G.startDeath(0);
    var ctx = G.pacContextFor(G.ghosts[0]);
    ok(ctx.tile.x > 10, 'apunta al que sigue vivo');
  });

  // ---------------------------------------------------------------
  // Online: señal de vida mientras se muere (regresión del congelón)
  // ---------------------------------------------------------------
  test('un pos marcado dy no mueve al invitado pero cuenta como señal', function () {
    partida(2, 'host');
    var p = G.pacs[1];
    p.dying = false;
    p.x = 172; p.y = 188;
    G.netWatch = 80;
    G.netQueue.push(['pos', { x: 40, y: 60, d: 1, nd: 1, e: [], dy: 1 }, 'sid']);
    G.step();
    eq(Math.round(p.x), 172, 'la posición no se aplica');
    ok(G.netWatch < 5, 'el vigilante se reinicia');
  });

  test('un pos normal sí mueve al invitado', function () {
    partida(2, 'host');
    var p = G.pacs[1];
    p.dying = false;
    G.netQueue.push(['pos', { x: 90, y: 100, d: 3, nd: 3, e: [] }, 'sid']);
    G.step();
    // tras aplicar la posición, el mismo tick lo hace avanzar un poco
    ok(Math.abs(p.x - 90) < 3, 'la posición se aplica (x=' + Math.round(p.x) + ')');
  });

  test('el invitado ignora el eco de sus propios emotes', function () {
    partida(2, 'guest');
    G.emotes = [null, null];
    G.applyEvt({ t: 'emote', w: G.localIdx, e: 2 });
    eq(G.emotes[G.localIdx], null, 'no se repite el propio');
    G.applyEvt({ t: 'emote', w: 0, e: 2 });
    ok(G.emotes[0], 'el del compañero sí se ve');
  });

  // ---------------------------------------------------------------
  // Rachas al comer fantasmas
  // ---------------------------------------------------------------
  test('la racha escala 1..4 y se reinicia con cada energizante', function () {
    partida(2);
    var pedidas = [];
    var orig = G.playStreakVoice;
    G.playStreakVoice = function (i) { pedidas.push(i); };
    try {
      G.chainIndex = 0;
      for (var i = 0; i < 4; i++) {
        G.ghosts[i].frightened = true;
        G.ghosts[i].mode = 'normal';
        G.eatGhost(G.ghosts[i], i % 2);
        G.eatFreezeTicks = 0;
      }
      eq(pedidas.join(','), '0,1,2,3');
      pedidas.length = 0;
      G.chainIndex = 0;                      // nuevo energizante
      G.ghosts[0].frightened = true;
      G.ghosts[0].mode = 'normal';
      G.eatGhost(G.ghosts[0], 0);
      eq(pedidas.join(','), '0');
    } finally { G.playStreakVoice = orig; }
  });

  test('hay una voz por escalón de la cadena', function () {
    eq(CFG.VOICES.length, CFG.GHOST_CHAIN.length);
    eq(CFG.VOICE_NAMES.length, CFG.VOICES.length);
  });

  // ---------------------------------------------------------------
  // Maestrías: rutas separadas
  // ---------------------------------------------------------------
  /* Cuatro ligas aparte: solo, dúo, trío y escuadra. Lo que consigues con
   * tres no cuenta con dos, ni al revés. */
  test('cada formato tiene sus propias maestrías y su propio récord',
    function () {
      var B = window.PM.Badges;
      var r = [G.highScore1, G.highScore2, G.highScore3, G.highScore4];
      try {
        eq(B.MODES.join(','), 'solo,duo,trio,escuadra');
        G.highScore1 = 9000;      // solo: CAZADOR (8.000)
        G.highScore2 = 9000;      // dúo: solo APRENDIZ (6.000); CAZADOR pide 16.000
        G.highScore3 = 0;
        G.highScore4 = 48000;     // escuadra: EXPERTO (15.000 x 4 = 60.000, no)
        eq(B.top('solo').id, 'cazador');
        eq(B.top('duo').id, 'aprendiz', 'la misma marca da menos en dúo');
        eq(B.top('trio'), null, 'sin partidas de trío, ninguna');
        eq(B.top('escuadra').id, 'cazador', '48.000 entre cuatro: CAZADOR');
        ok(!B.has('cazador', 'duo'), 'lo de solo no cuenta en dúo');
        ok(!B.has('aprendiz', 'trio'), 'ni lo de escuadra en trío');
        eq(B.best('escuadra'), 48000, 'cada ruta lee el récord de SU formato');
      } finally {
        G.highScore1 = r[0]; G.highScore2 = r[1];
        G.highScore3 = r[2]; G.highScore4 = r[3];
      }
    });

  test('el modo de maestría sale del número de jugadores', function () {
    partida(1); eq(G.badgeMode(), 'solo');
    partida(2); eq(G.badgeMode(), 'duo');
    partida(3); eq(G.badgeMode(), 'trio');
    partida(4); eq(G.badgeMode(), 'escuadra');
    G.toMenu();
  });

  /* El marcador de un equipo es de todos: con cuatro se llega al mismo número
   * con mucho menos mérito de cada uno (cuatro veces las vidas, cuatro bocas
   * y cuatro fantasmas por energizante). Cada escalón pide los puntos de
   * siempre multiplicados por los que juegan. */
  test('el listón de cada maestría sube con la gente que hay en la partida',
    function () {
      var B = window.PM.Badges;
      var aprendiz = CFG.BADGES[0];
      eq(B.goal(aprendiz, 'solo'), 3000);
      eq(B.goal(aprendiz, 'duo'), 6000, 'en dúo, el doble');
      eq(B.goal(aprendiz, 'trio'), 9000, 'en trío, el triple');
      eq(B.goal(aprendiz, 'escuadra'), 12000, 'en escuadra, el cuádruple');
      eq(B.players('trio'), 3);
      eq(B.modeName('escuadra'), 'ESCUADRA');
    });

  test('el récord de cada formato se guarda por separado', function () {
    var r = [G.highScore1, G.highScore2, G.highScore3, G.highScore4];
    try {
      G.highScore1 = 0; G.highScore2 = 0; G.highScore3 = 0; G.highScore4 = 0;
      partida(3);
      G.addScore(5000);
      eq(G.highScore3, 5000, 'la marca de trío va a la de trío');
      eq(G.highScore2, 0, 'y no toca la de dúo');
      eq(G.highScore4, 0, 'ni la de escuadra');
      partida(2);
      eq(G.highScore, 0, 'el HIGH SCORE de una partida es el de SU formato');
      G.toMenu();
    } finally {
      G.highScore1 = r[0]; G.highScore2 = r[1];
      G.highScore3 = r[2]; G.highScore4 = r[3];
      G.saveHighScores();
    }
  });

  test('una maestría ya conseguida no se vuelve a celebrar', function () {
    var h1 = G.highScore1;
    try {
      G.highScore1 = 59430;             // ya las tiene casi todas
      window.PM.Badges.syncSeen();      // y todas anunciadas
      partida(1);
      G.addScore(3000);
      eq(G.badgeNotice, null, 'APRENDIZ ya la tenía: ni cartel ni ruido');
      G.addScore(57000);                // 60000: LEYENDA, que sí es nueva
      ok(G.badgeNotice && G.badgeNotice.name === 'LEYENDA', 'la nueva sí sale');
      eq(G.badgeNotice.mode, 'SOLO');
      G.badgeNotice = null;
      G.addScore(500);
      eq(G.badgeNotice, null, 'y no se repite en la misma partida');
    } finally { G.highScore1 = h1; }
  });

  /* El cartel grande cruza el centro de la pantalla cinco segundos: jugando
   * solo da igual, pero en una party le tapa el laberinto a gente que está
   * jugando y que además no ha ganado nada. */
  test('con más de un jugador la maestría no se celebra encima del laberinto',
    function () {
      partida(1); ok(G.bigNotices(), 'en solo, cartelón');
      partida(2); ok(!G.bigNotices(), 'en dúo, banda estrecha arriba');
      partida(4); ok(!G.bigNotices(), 'en escuadra, igual');
      ok(typeof window.PM.Sprites.drawBadgeStrip === 'function',
         'y existe el dibujo de la banda');
      /* la banda la comparten logro y maestría: mientras hay un logro en
       * pantalla, a la maestría no se le gasta el tiempo */
      G.achNotice = { name: 'X', desc: 'Y', color: '#fff', ticks: 30, total: 30 };
      G.badgeNotice = { name: 'APRENDIZ', color: '#fff', mode: 'ESCUADRA',
                        ticks: 50, total: 50 };
      G.stepBadgeNotice();
      eq(G.badgeNotice.ticks, 50, 'la maestría espera su turno');
      G.achNotice = null;
      G.stepBadgeNotice();
      eq(G.badgeNotice.ticks, 49, 'y corre cuando se queda sola');
      G.badgeNotice = null;
      G.toMenu();
    });

  // ---------------------------------------------------------------
  // Ranking mundial
  // ---------------------------------------------------------------
  test('sin nombre no se registra récord', function () {
    var n1 = window.PM.settings.nick1, n2 = window.PM.settings.nick2;
    try {
      window.PM.settings.nick1 = '';
      window.PM.settings.nick2 = '';
      partida(1);
      ok(G.missingRankingName(), 'falta el nombre');
      window.PM.settings.nick1 = 'ALGUIEN';
      partida(1);
      ok(!G.missingRankingName(), 'con nombre ya vale');
      partida(2);
      ok(G.missingRankingName(), 'en dúo hacen falta los dos');
    } finally {
      window.PM.settings.nick1 = n1;
      window.PM.settings.nick2 = n2;
    }
  });

  test('el filtro de nombres deja pasar los normales y corta los feos', function () {
    var R = window.PM.Ranking;
    ok(R.nameAllowed('BRAI'));
    ok(R.nameAllowed('GOKU 99'));
    ok(R.nameAllowed('PACO'), 'un nombre normal no se bloquea de más');
    ok(!R.nameAllowed(''));
    ok(!R.nameAllowed('PUTA'));
    ok(!R.nameAllowed('PUT4'), 'no se cuela cambiando letras por números');
    ok(!R.nameAllowed('P0LL@'), 'ni con símbolos');
  });

  test('el envío al ranking exige nombre y puntuación válida', function () {
    var R = window.PM.Ranking;
    var errores = [];
    var cb = function (e) { errores.push(e); };
    R.submit({ jugadores: 1, nombre1: '', puntos: 100 }, cb);
    R.submit({ jugadores: 2, nombre1: 'A', nombre2: '', puntos: 100 }, cb);
    R.submit({ jugadores: 1, nombre1: 'PUTO', puntos: 100 }, cb);
    R.submit({ jugadores: 1, nombre1: 'A', puntos: 0 }, cb);
    eq(errores.length, 4, 'los cuatro se rechazan antes de salir a la red');
  });

  test('el techo de puntos por nivel deja fuera lo imposible', function () {
    var R = window.PM.Ranking;
    // nivel 1: 2600 de pastillas + 12000 de fantasmas + 200 de dos cerezas
    eq(R.maxPuntos(1), Math.floor(14800 * 1.1));
    ok(R.maxPuntos(1) < 999999, 'los 999999 de la consola no caben en el nivel 1');
    ok(R.maxPuntos(5) > R.maxPuntos(4), 'cuanto más lejos se llega, más cabe');
    // empezar en el nivel 5 (preajuste DIFÍCIL) no regala los cuatro de antes
    ok(R.maxPuntos(6, 5) < R.maxPuntos(6, 1), 'el nivel de salida cuenta');
    // una partida de verdad del nivel 1 entra de sobra
    ok(R.maxPuntos(1) > 12000, 'una gran partida del nivel 1 sigue entrando');
  });

  test('una puntuación imposible no llega ni a salir a la red', function () {
    var R = window.PM.Ranking;
    var err = null;
    R.submit({ jugadores: 1, nombre1: 'TRAMPOSO', puntos: 999999, nivel: 1,
               fantasmas: 0, tiempoMs: 60000 }, function (e) { err = e; });
    eq(err, 'PUNTUACIÓN IMPOSIBLE');
  });

  test('la partida se manda a la Edge Function, no a la tabla', function () {
    var R = window.PM.Ranking;
    var orig = window.fetch, visto = null;
    window.fetch = function (url, opts) {
      visto = { url: String(url), body: JSON.parse(opts.body) };
      return new Promise(function () {});   // se queda colgada: da igual
    };
    try {
      R.submit({ jugadores: 1, modo: 'local', nombre1: 'BRAI', puntos: 5000,
                 nivel: 2, nivelInicio: 1, fantasmas: 4, tiempoMs: 120000,
                 ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 3 } });
    } finally {
      window.fetch = orig;
    }
    ok(visto, 'se llamó a la red');
    ok(visto.url.indexOf('/functions/v1/enviar-record') !== -1,
       'va por la función, no por /rest/v1/ranking: ' + visto.url);
    eq(visto.body.puntos, 5000);
    eq(visto.body.fantasmas, 4, 'los fantasmas comidos viajan para comprobar');
    eq(visto.body.tiempoMs, 120000, 'y el tiempo jugado también');
    eq(visto.body.ajustes.velPac, 1, 'y con qué ajustes se jugó');
  });

  test('si falta la función desplegada, se avisa y no se rompe nada', function () {
    var R = window.PM.Ranking;
    var warn = console.warn;
    console.warn = function () {};      // el aviso de consola aquí sobra
    try {
      eq(R.submitError(404, ''), 'NO ESTÁ DISPONIBLE');
      eq(R.submitError(401, ''), 'NO ESTÁ DISPONIBLE');
      // lo que conteste la función se enseña tal cual
      eq(R.submitError(400, '{"error":"AJUSTES NO ESTÁNDAR"}'), 'AJUSTES NO ESTÁNDAR');
      eq(R.submitError(500, 'vaya'), 'ERROR 500');
    } finally {
      console.warn = warn;
    }
  });

  test('la partida lleva al top mundial los ajustes con los que se jugó', function () {
    partida(1);
    var a = G.rankAjustes();
    eq(a.velFantasmas, G.ghostSpeedMult);
    eq(a.velPac, G.pacSpeedMult);
    eq(a.powerS, G.frightMult);
    eq(a.vidas, G.startLives);
    G.timeTicks = 600;
    eq(G.playedMs(), 10000, '600 ticks a 60 por segundo son 10 s');
  });

  test('solo el anfitrión sube la partida en online', function () {
    var R = window.PM.Ranking;
    var orig = R.submit, n = 0;
    var n1 = window.PM.settings.nick1;
    R.submit = function () { n++; };
    window.PM.settings.nick1 = 'ALGUIEN';
    try {
      partida(2, 'guest');
      G.score = 1000; G.rankingSent = false;
      G.submitRanking();
      eq(n, 0, 'el invitado no sube');
      partida(2, 'host');
      G.netNames = ['ALGUIEN', 'OTRO'];
      G.score = 1000; G.rankingSent = false;
      G.submitRanking();
      eq(n, 1, 'el anfitrión sí');
    } finally {
      R.submit = orig;
      window.PM.settings.nick1 = n1;
    }
  });

  // ---------------------------------------------------------------
  // Reto diario
  // ---------------------------------------------------------------
  test('el reto del día sale de la fecha en UTC', function () {
    var R = window.PM.Reto;
    // 23:30 UTC del 5 sigue siendo el reto del 5 en todo el planeta
    eq(R.hoy(new Date(Date.UTC(2026, 7, 5, 23, 30))), '2026-08-05');
    eq(R.hoy(new Date(Date.UTC(2026, 0, 1, 0, 1))), '2026-01-01');
    eq(R.semilla('2026-08-05'), R.semilla('2026-08-05'), 'misma fecha, misma semilla');
    ok(R.semilla('2026-08-05') !== R.semilla('2026-08-06'), 'otro día, otra semilla');
    var s = R.semilla('2026-08-05');
    ok(s > 0 && s <= 1000000, 'acotada, o Game.seedRnd perdería precisión: ' + s);
  });

  test('el reto se juega con los ajustes de siempre', function () {
    var o = window.PM.Reto.opts('2026-08-05');
    var p = CFG.PRESETS.normal;
    eq(o.players, 1);
    ok(o.reto, 'la partida va marcada como reto');
    ok(o.seed > 0, 'y con la semilla del día');
    eq(o.cfg.ghostSpeedMult, p.ghostSpeedMult, 'fantasmas');
    eq(o.cfg.pacSpeedMult, p.pacSpeedMult, 'pac-man');
    eq(o.cfg.frightMult, p.frightMult, 'energizante');
    eq(o.cfg.startLives, p.startLives, 'vidas');
    eq(o.cfg.startLevel, p.startLevel, 'nivel inicial');
  });

  test('la semilla del día reparte el mismo azar a todo el mundo', function () {
    function firma(seed) {
      window.PM.settings.muted = true;
      G.newGame({ players: 1, seed: seed });
      var s = '';
      for (var i = 0; i < 40; i++) s += G.rndDir();
      return s;
    }
    var a = firma(1234), b = firma(1234), c = firma(4321);
    eq(a, b, 'la misma semilla, la misma tirada');
    ok(a !== c, 'otra semilla, otra tirada');
    G.newGame({ players: 1 });
    eq(G.seedBase, 0, 'una partida normal vuelve al azar de siempre');
  });

  /* El reto tiene su propia clasificación. Colarlo además en el top mundial
   * mezclaría marcas de azares distintos: los fantasmas azules huyen por otro
   * lado, así que ni la puntuación ni el tiempo se comparan con los de una
   * partida normal. Es la misma razón por la que no vale con los ajustes
   * cambiados. */
  test('el reto del día no entra en el top mundial ni en el récord de tiempo',
    function () {
      window.PM.settings.muted = true;
      G.newGame({ players: 1, seed: 4321 });
      ok(!G.canTimeRecord(), 'la marca de velocidad no cuenta');
      var enviadas = 0;
      var submit0 = window.PM.Ranking.submit;
      var conf0 = window.PM.Ranking.configured;
      var nick0 = window.PM.settings.nick1;
      try {
        window.PM.settings.nick1 = 'ALGUIEN';    // sin nombre no se manda nada
        window.PM.Ranking.configured = function () { return true; };
        window.PM.Ranking.submit = function () { enviadas++; };
        G.score = 5000;
        G.submitRanking();
        eq(enviadas, 0, 'ni la puntuación');
        G.newGame({ players: 1 });      // partida normal: esa sí
        G.score = 5000;
        G.submitRanking();
        ok(enviadas > 0, 'una partida normal sí se manda');
      } finally {
        window.PM.Ranking.submit = submit0;
        window.PM.Ranking.configured = conf0;
        window.PM.settings.nick1 = nick0;
        G.newGame({ players: 1 });
      }
    });

  test('el reto se cierra con la partida, y solo se juega una vez', function () {
    var R = window.PM.Reto;
    R.olvidar();
    try {
      ok(!R.hecho(), 'hoy aún no está jugado');
      window.PM.settings.muted = true;
      G.newGame(R.opts());
      ok(G.reto, 'la partida sabe que es el reto');
      G.score = 1234; G.level = 3;
      G.closeRun();
      var m = R.marca();
      ok(m, 'la marca queda guardada aunque no haya red');
      eq(m.p, 1234, 'puntos');
      eq(m.n, 3, 'nivel');
      ok(R.hecho(), 'el intento del día está gastado');
      // volver a jugarlo el mismo día no puede mejorar la marca
      G.newGame(R.opts());
      G.score = 99999;
      G.closeRun();
      eq(R.marca().p, 1234, 'un intento y no más');
    } finally {
      R.olvidar();
      G.toMenu();
    }
  });

  test('una partida que cruza la medianoche cuenta en su propio día',
    function () {
      var R = window.PM.Reto;
      R.olvidar();
      try {
        // empezada ayer y terminada hoy: la marca es de ayer, y el reto de
        // hoy sigue por jugar (es otro laberinto de fantasmas)
        R.cerrar(1500, 2, '1999-01-01');
        ok(!R.hecho(), 'el intento de hoy sigue intacto');
        R.cerrar(300, 1);
        eq(R.marca().p, 300, 'y el de hoy se guarda aparte');
      } finally {
        R.olvidar();
      }
    });

  test('el reto suma experiencia como cualquier partida', function () {
    var R = window.PM.Reto, L = window.PM.Level;
    R.olvidar();
    var antes = L.xp();
    try {
      window.PM.settings.muted = true;
      G.newGame(R.opts());
      G.score = 800;
      G.closeRun();
      eq(L.xp(), antes + 800, 'los puntos del reto también son experiencia');
    } finally {
      R.olvidar();
      G.toMenu();
    }
  });

  test('sin nombre la marca del reto se guarda pero no se envía', function () {
    var R = window.PM.Reto;
    var n1 = window.PM.settings.nick1;
    R.olvidar();
    try {
      window.PM.settings.nick1 = '';
      R.cerrar(500, 2);
      var errs = [];
      R.enviarPendiente(function (e) { errs.push(e); });
      eq(errs.length, 1);
      eq(errs[0], 'SIN NOMBRE');
      eq(R.marca().p, 500, 'la marca sigue aquí para mandarla luego');
      eq(R.marca().e, 0, 'y apuntada como no enviada');
    } finally {
      window.PM.settings.nick1 = n1;
      R.olvidar();
    }
  });

  test('el envío del reto exige nombre y puntuación válida', function () {
    var R = window.PM.Reto;
    var errores = [];
    var cb = function (e) { errores.push(e); };
    R.submit({ fecha: '2026-08-05', nombre: '', puntos: 100 }, cb);
    R.submit({ fecha: '2026-08-05', nombre: 'PUTO', puntos: 100 }, cb);
    R.submit({ fecha: '2026-08-05', nombre: 'ALGUIEN', puntos: 0 }, cb);
    eq(errores.length, 3, 'los tres se rechazan antes de salir a la red');
  });

  test('el botón de la portada dice si el reto ya está jugado', function () {
    var R = window.PM.Reto, U = window.PM.UI;
    R.olvidar();
    try {
      U.refreshReto();
      eq(U.retoBtn.textContent, 'RETO DE HOY');
      R.cerrar(700, 2);
      U.refreshReto();
      ok(/700/.test(U.retoBtn.textContent),
         'con la marca a la vista: ' + U.retoBtn.textContent);
    } finally {
      R.olvidar();
      U.refreshReto();
    }
  });

  // ---------------------------------------------------------------
  // Temporadas del top mundial
  // ---------------------------------------------------------------
  test('la temporada es el mes natural, contado en UTC', function () {
    var S = window.PM.Season;
    eq(S.actual(new Date(Date.UTC(2026, 7, 5, 23, 59))), '2026-08');
    eq(S.actual(new Date(Date.UTC(2026, 0, 1, 0, 0))), '2026-01');
    eq(S.nombre('2026-08'), 'AGOSTO 2026');
    eq(S.nombre('2026-12'), 'DICIEMBRE 2026');
  });

  test('el panel del top mundial tiene una pestaña por formato, reto y temporadas',
    function () {
      var U = window.PM.UI;
      /* 1..4 son EL NÚMERO DE JUGADORES (una clasificación por formato),
       * el 5 es el nivel 1, el 6 el reto y el 0 tus partidas */
      ok(U.rankTabBtns[3] && U.rankTabBtns[4], 'están trío y escuadra');
      ok(U.rankTabBtns[6], 'está la pestaña del reto');
      ok(U.seasonBtns.ahora && U.seasonBtns.historico, 'y las dos de temporada');
      U.showRankTab(1);
      eq(U.seasonRow.style.display, 'flex', 'en INDIVIDUAL se elige temporada');
      U.showRankTab(4);
      eq(U.seasonRow.style.display, 'flex', 'en ESCUADRA también');
      U.showRankTab(0);
      eq(U.seasonRow.style.display, 'none', 'en TUS PARTIDAS no hay temporada');
      U.showRankTab(6);
      eq(U.seasonRow.style.display, 'none', 'ni en el reto, que es el de hoy');
      U.showRankTab(5);
      eq(U.seasonRow.style.display, 'none', 'ni en el nivel 1, que es de siempre');
      U.showRankTab(1);
      U.showSeasonTab('historico');
      eq(U.seasonTab, 'historico');
      U.showSeasonTab('ahora');
    });

  /* Las partidas de 3 y 4 se jugaban pero no salían del navegador: el envío
   * las cortaba y la tabla solo admitía 1 y 2. Ahora cada formato tiene su
   * clasificación, como sus récords y sus maestrías. */
  test('trío y escuadra entran en el top mundial, con todos sus nombres',
    function () {
      var R = window.PM.Ranking;
      var enviado = null, orig = R.submit;
      var nicks = [window.PM.settings.nick1, window.PM.settings.nick2];
      try {
        R.submit = function (o) { enviado = o; };
        window.PM.settings.nick1 = 'ANA';
        window.PM.settings.nick2 = 'BEA';
        G.newGame({ players: 4, names: ['ANA', 'BEA', 'CARLOS', 'DANI'] });
        G.state = 'PLAYING';
        G.score = 40000;
        G.level = 7;
        G.submitRanking();
        ok(enviado, 'la escuadra se manda');
        eq(enviado.jugadores, 4);
        eq(enviado.nombre1 + ',' + enviado.nombre2 + ',' +
           enviado.nombre3 + ',' + enviado.nombre4, 'ANA,BEA,CARLOS,DANI');

        enviado = null;
        G.newGame({ players: 3, names: ['ANA', 'BEA', 'CARLOS'] });
        G.state = 'PLAYING';
        G.score = 12000;
        G.submitRanking();
        eq(enviado.jugadores, 3);
        eq(enviado.nombre4, '', 'el cuarto no existe en un trío');

        // y si a uno le falta el nombre, no entra: es lo de siempre
        enviado = null;
        G.newGame({ players: 3, names: ['ANA', 'BEA', ''] });
        G.state = 'PLAYING';
        G.score = 12000;
        G.submitRanking();
        eq(enviado, null, 'sin todos los nombres no hay récord');
      } finally {
        R.submit = orig;
        window.PM.settings.nick1 = nicks[0];
        window.PM.settings.nick2 = nicks[1];
        G.toMenu();
      }
    });

  test('cada formato pide su propia clasificación y sabe cómo se llama',
    function () {
      var R = window.PM.Ranking;
      eq(R.jugadores(3), 3);
      eq(R.jugadores(9), 1, 'lo que no es un formato cae en individual');
      eq(R.formato(1), 'INDIVIDUAL');
      eq(R.formato(4), 'ESCUADRA');
      eq(R.nombresDe({ nombre1: 'ana', nombre2: 'BEA', nombre3: null }).join('+'),
         'ANA+BEA', 'los nombres que haya, en orden y en mayúsculas');
      ok(R.COLS.indexOf('nombre4') !== -1, 'se piden los cuatro nombres');
    });

  // ---------------------------------------------------------------
  // Historial local
  // ---------------------------------------------------------------
  test('el historial guarda la partida aunque no haya nombre', function () {
    var H = window.PM.History;
    var previo = H.all();
    var n1 = window.PM.settings.nick1;
    try {
      H.clear();
      window.PM.settings.nick1 = '';
      partida(1);
      G.score = 4321; G.level = 3; G.rankingSent = false;
      G.submitRanking();
      var lista = H.all();
      eq(lista.length, 1);
      eq(lista[0].p, 4321);
      eq(lista[0].j, 1);
    } finally {
      H.clear();
      for (var i = previo.length - 1; i >= 0; i--) {
        H.add({ jugadores: previo[i].j, modo: previo[i].m, nombre1: previo[i].n1,
                nombre2: previo[i].n2, puntos: previo[i].p, nivel: previo[i].lv });
      }
      window.PM.settings.nick1 = n1;
    }
  });

  // ---------------------------------------------------------------
  // Repeticiones de partida
  // El juego es determinista (seedRnd por nivel), así que una partida
  // cabe en los ajustes más la lista de giros. La prueba que importa de
  // verdad es la última: si al reproducir no sale la MISMA puntuación,
  // el determinismo se ha roto por algún sitio.
  // ---------------------------------------------------------------
  /* comparación profunda, que aquí se comparan objetos enteros */
  function igual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null || typeof a !== 'object') return false;
    var ea = Object.prototype.toString.call(a) === '[object Array]';
    var eb = Object.prototype.toString.call(b) === '[object Array]';
    if (ea !== eb) return false;
    var k;
    for (k in a) { if (a.hasOwnProperty(k) && !igual(a[k], b[k])) return false; }
    for (k in b) { if (b.hasOwnProperty(k) && !a.hasOwnProperty(k)) return false; }
    return true;
  }

  /* repetición mínima que cumple el contrato de la versión 1 */
  function repDe(puntos) {
    return {
      v: 1, modo: 'solo', semilla: null, nivel: 1, jugadores: 1,
      ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 3 },
      nombres: ['ANA'],
      fecha: '2026-08-05T18:00:00.000Z',
      entradas: [[0, 0, 1], [12, 0, 0], [100, 0, 3], [110, 0, 3], [120, 0, 3]],
      final: { puntos: puntos, nivel: 4, fantasmas: 9, tiempoMs: 185000 }
    };
  }

  test('leer(serializar(x)) devuelve exactamente x', function () {
    var R = window.PM.Replay;
    var rep = repDe(12340);
    var texto = R.serializar(rep);
    ok(texto.length > 0, 'se serializa');
    ok(texto.indexOf('{') === -1 && texto.indexOf('"') === -1,
       'el texto no es JSON crudo: tiene que caber en una URL');
    ok(texto.length < JSON.stringify(rep).length, 'y ocupa menos que el JSON');
    ok(texto.indexOf('*') !== -1, 'los giros que se repiten igual se resumen');
    var leido = R.leer(texto);
    ok(leido, 'el texto se vuelve a leer');
    ok(igual(leido, rep), 'leer(serializar(x)) tiene que ser x');
  });

  test('un texto de repetición manipulado no cuela', function () {
    var R = window.PM.Replay;
    var bueno = R.serializar(repDe(500));
    eq(R.leer(''), null);
    eq(R.leer('basura'), null);
    eq(R.leer(null), null);
    eq(R.leer(bueno + '~sobra'), null, 'sobran campos');
    eq(R.leer(bueno.replace(/^R1/, 'R9')), null, 'otra versión del formato');
    eq(R.leer(bueno.split('~').slice(0, 5).join('~')), null, 'faltan campos');
    // la lista de giros con basura por medio tampoco vale
    var p = bueno.split('~');
    p[8] = p[8] + '???';
    eq(R.leer(p.join('~')), null, 'giros con basura');
  });

  test('el enlace para compartir lleva la repetición en la URL', function () {
    var R = window.PM.Replay;
    var url = R.enlace(repDe(700));
    ok(url.indexOf('?rep=') !== -1, 'el enlace lleva ?rep=');
    var texto = decodeURIComponent(url.split('?rep=')[1]);
    ok(R.leer(texto), 'y lo que lleva se puede leer');
  });

  test('mantener pulsada la misma tecla no engorda la repetición', function () {
    var R = window.PM.Replay;
    partida(1);
    var rep = R.enCurso();
    ok(rep, 'una partida local se graba sola');
    var antes = rep.entradas.length;
    for (var i = 0; i < 20; i++) G.setPacDir(0, CFG.DIR.UP);
    ok(rep.entradas.length <= antes + 1,
       'pedir el rumbo que ya estaba pedido no se apunta');
    var ahora = rep.entradas.length;
    G.setPacDir(0, CFG.DIR.DOWN);
    eq(rep.entradas.length, ahora + 1, 'el cambio de rumbo sí se apunta');
  });

  test('el almacén poda las viejas y nunca suelta la del récord', function () {
    var R = window.PM.Replay;
    var previo = null, hs = G.highScore1;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* sin almacén */ }
    try {
      R.borrarTodo();
      G.highScore1 = 500000;             // así solo una cuenta como récord
      var idRecord = R.guardar(repDe(999999)).id;
      for (var i = 0; i < CFG.REPLAY_MAX + 4; i++) R.guardar(repDe(100 + i));
      var lista = R.guardadas();
      ok(lista.length <= CFG.REPLAY_MAX, 'no se guardan más de las que caben');
      ok(R.porId(idRecord), 'la del mejor récord sigue estando');
      // y el historial encuentra la suya por puntuación y hora
      var reg = lista[0];
      ok(R.paraPartida({ t: reg.t + 200, j: reg.j, p: reg.p }),
         'la fila del historial encuentra su repetición');
      eq(R.paraPartida({ t: reg.t, j: reg.j, p: reg.p + 1 }), null);
    } finally {
      G.highScore1 = hs;
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  /* ---------------------------------------------------------------
   * Repeticiones de partidas ONLINE (formato de red, v2)
   * Online no valen las teclas: la partida la simula el anfitrión con las
   * posiciones que le llegan. Se graba lo que el anfitrión YA emite y al
   * verla el juego se pone de espectador de un archivo.
   * --------------------------------------------------------------- */
  test('el códec de red: instantánea -> texto -> la misma instantánea',
    function () {
      var C = window.PM.Replay._codec;
      partida(2, 'host');
      G.score = 1234;
      var s = G.buildSnapshot(false);
      var v = C.aplana(s, 2);
      eq(v.length, C.largo(2), 'el vector mide lo que dice el contrato');

      // primer cuadro: sin anterior con la que comparar
      var texto = C.cod(v, null);
      var vuelta = C.dec(texto, null, C.largo(2));
      ok(vuelta, 'se decodifica');
      eq(vuelta.join(','), v.join(','), 'y sale el mismo vector');

      /* En base 36 un número puede empezar por letra ('z' es 35), así que la
       * marca de los ceros no puede serlo: con una letra, un valor de 35 se
       * leía como "un cero" y la repetición entera se descuadraba. */
      var conTreintaycinco = [35, 0, 0, 0, 1260, 7];
      var t2 = C.cod(conTreintaycinco, null);
      eq((C.dec(t2, null, 6) || []).join(','), '35,0,0,0,1260,7',
         'un 35 no se confunde con una marca de ceros');

      // y el segundo cuadro, que ya va como diferencia con el primero
      G.step();
      var s2 = G.buildSnapshot(false);
      var v2 = C.aplana(s2, 2);
      var vuelta2 = C.dec(C.cod(v2, v), v, C.largo(2));
      ok(vuelta2 && vuelta2.join(',') === v2.join(','), 'el delta también');

      // lo importante: la instantánea reconstruida sirve para pintar
      var rehecha = C.monta(vuelta, 2);
      eq(rehecha.sc, s.sc, 'la puntuación');
      eq(rehecha.st, s.st, 'el estado');
      eq(rehecha.lvl, s.lvl, 'el nivel');
      eq(rehecha.g.length, 4, 'los cuatro fantasmas');
      eq(Math.round(rehecha.g[0].x * 10), Math.round(s.g[0].x * 10),
         'y cada uno en su sitio');
      G.toMenu();
    });

  test('una partida online se graba y se vuelve a ver', function () {
    var R = window.PM.Replay;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_NET_KEY); }
    catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      partida(2, 'host');
      ok(R.grabandoRed(), 'de anfitrión, la partida online se graba');
      for (var i = 0; i < 120; i++) { G.netWatch = 0; G.step(); }
      var enCurso = R.red;
      ok(enCurso.cuadros.length > 0, 'se van guardando cuadros');
      var puntos = G.score || 10;
      G.score = puntos;
      var reg = R.redAcabar();
      ok(reg, 'al acabar se guarda');
      eq(reg.j, 2);
      ok(reg.s.length > 0, 'con su texto');

      var leida = R.leerRed(reg.s);
      ok(leida, 'y se puede volver a leer');
      eq(leida.jugadores, 2);
      eq(leida.cuadros.length, enCurso.cuadros.length, 'con todos los cuadros');

      // el historial la encuentra
      ok(R.paraPartidaRed({ t: reg.t + 300, j: 2, p: reg.p }),
         'la fila del historial da con ella');

      // y al verla, el juego se pone de espectador
      ok(R.verRed(leida), 'arranca la reproducción');
      ok(G.isSpec(), 'de espectador: aquí no juega nadie');
      ok(G.replaying, 'marcada como repetición');
      for (i = 0; i < 130; i++) { G.netWatch = 0; G.step(); }
      eq(G.score, puntos, 'y al final se ve la misma puntuación');
    } finally {
      R.salir();
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_NET_KEY);
        else localStorage.setItem(CFG.REPLAY_NET_KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  test('de invitado o de mirón no se graba nada: la partida no es suya',
    function () {
      var R = window.PM.Replay;
      partida(2, 'guest');
      ok(!R.grabandoRed(), 'el invitado no graba');
      partida(1);
      ok(!R.grabandoRed(), 'y en local se graban las teclas, no esto');
      ok(R.enCurso(), 'que para eso está la repetición de siempre');
      G.toMenu();
    });

  test('viendo una repetición el teclado no mueve a Pac-Man', function () {
    var R = window.PM.Replay;
    try {
      window.PM.settings.muted = true;
      ok(R.ver(repDe(1000)), 'la repetición arranca');
      G.state = 'PLAYING';
      G.readyTicks = 0;
      var antes = G.pacs[0].nextDir;
      var otra = (antes === CFG.DIR.UP) ? CFG.DIR.DOWN : CFG.DIR.UP;
      G.setPacDir(0, otra);
      eq(G.pacs[0].nextDir, antes, 'manda la repetición, no quien mira');
      ok(G.replaying, 'y la partida se marca como repetición');
    } finally {
      R.salir();
    }
  });

  test('reproducir una repetición da EXACTAMENTE la misma puntuación', function () {
    var R = window.PM.Replay;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      /* guion de giros: [tick, dirección]. Con esto Pac-Man recorre medio
       * laberinto, come, gira en cruces y se cruza con los fantasmas. */
      var guion = [[5, 1], [40, 0], [95, 3], [150, 2], [210, 1], [260, 0],
                   [330, 3], [400, 2], [470, 1], [540, 0], [610, 3], [700, 2],
                   [800, 1], [900, 0], [1000, 3], [1100, 2], [1250, 1],
                   [1400, 0]];
      var TOTAL = 1500;

      /* corre TOTAL ticks; conGuion aplica los giros a mano (partida
       * grabada) y sin él los mete la propia repetición */
      function corre(conGuion) {
        G.state = 'PLAYING';
        G.readyTicks = 0;
        var k = 0;
        for (var i = 0; i < TOTAL; i++) {
          if (conGuion) {
            while (k < guion.length && guion[k][0] === i) {
              G.setPacDir(0, guion[k][1]);
              k++;
            }
          }
          G.step();
        }
      }

      G.newGame({ players: 1 });
      var rep = R.enCurso();
      ok(rep, 'la partida se graba sola');
      corre(true);
      var pts = G.score, niv = G.level, quedan = G.dotsLeft, vidas = G.lives;
      ok(pts > 0, 'la partida grabada hizo puntos');
      if (!rep.final) {
        rep.final = { puntos: pts, nivel: niv, fantasmas: G.runGhosts,
                      tiempoMs: Math.round(G.timeTicks * 1000 / 60) };
      }
      ok(rep.entradas.length > 0, 'y dejó los giros apuntados');

      /* y ahora, la misma partida desde el texto compartible */
      var leida = R.leer(R.serializar(rep));
      ok(leida, 'la repetición pasa por el texto y vuelve');
      ok(R.ver(leida), 'la repetición arranca');
      corre(false);
      eq(G.score, pts, 'LA PUNTUACIÓN NO CUADRA: el determinismo está roto');
      eq(G.level, niv, 'el nivel no cuadra');
      eq(G.dotsLeft, quedan, 'las pastillas comidas no cuadran');
      eq(G.lives, vidas, 'las vidas no cuadran');
    } finally {
      window.PM.Replay.salir();
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  /* El reloj de la repetición se para durante el "¡LISTO!" justo por esto:
   * ese rótulo dura lo que dure la melodía de inicio, que no es siempre lo
   * mismo. Si los ticks se contaran de corrido, la repetición se desfasaría
   * en cuanto el audio tardara un pelín más. */
  test('la repetición cuadra aunque el "¡LISTO!" dure otra cosa', function () {
    var R = window.PM.Replay;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      /* los giros van por tick SIMULADO: los que se piden mientras sale el
       * rótulo no cuentan tiempo, porque ahí no se mueve nadie */
      var guion = [[0, 0], [30, 1], [90, 2], [160, 3], [240, 0], [330, 1],
                   [420, 2], [520, 3], [640, 0], [760, 1], [880, 2],
                   [1000, 3], [1150, 0], [1300, 1]];

      function corre(ready, conGuion) {
        G.readyTicks = ready;
        var k = 0, jugados = 0;
        // dos giros pedidos ANTES de empezar, con el rótulo en pantalla
        if (conGuion) { G.setPacDir(0, CFG.DIR.DOWN); G.setPacDir(0, CFG.DIR.UP); }
        for (var i = 0; i < ready + 1200; i++) {
          if (conGuion && G.state === 'PLAYING') {
            while (k < guion.length && guion[k][0] === jugados) {
              G.setPacDir(0, guion[k][1]);
              k++;
            }
          }
          if (G.state === 'PLAYING' || G.state === 'DYING' ||
              G.state === 'LEVEL_DONE') jugados++;
          G.step();
        }
      }

      G.newGame({ players: 1 });
      var rep = R.enCurso();
      ok(rep, 'la partida se graba sola');
      corre(90, true);                       // rótulo corto al grabar
      var pts = G.score, quedan = G.dotsLeft, vidas = G.lives;
      ok(pts > 0, 'la partida grabada hizo puntos');
      if (!rep.final) {
        rep.final = { puntos: pts, nivel: G.level, fantasmas: G.runGhosts,
                      tiempoMs: Math.round(G.timeTicks * 1000 / 60) };
      }
      ok(R.ver(R.leer(R.serializar(rep))), 'la repetición arranca');
      corre(260, false);                     // rótulo mucho más largo al verla
      eq(G.score, pts, 'la puntuación se desfasa con el rótulo de inicio');
      eq(G.dotsLeft, quedan, 'las pastillas no cuadran');
      eq(G.lives, vidas, 'las vidas no cuadran');
    } finally {
      window.PM.Replay.salir();
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  /* En dúo cada entrada lleva de quién es el giro, y los dos Pac-Man se
   * mueven a la vez: si el número de jugador se perdiera, la repetición
   * movería al que no toca. */
  test('una repetición de dos jugadores mueve a cada uno donde tocaba', function () {
    var R = window.PM.Replay;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      var guion = [[5, 0, 0], [30, 1, 2], [80, 0, 3], [130, 1, 1], [200, 0, 2],
                   [260, 1, 3], [340, 0, 1], [420, 1, 0], [500, 0, 0]];

      function corre(conGuion) {
        G.state = 'PLAYING';
        G.readyTicks = 0;
        var k = 0;
        for (var i = 0; i < 700; i++) {
          if (conGuion) {
            while (k < guion.length && guion[k][0] === i) {
              G.setPacDir(guion[k][1], guion[k][2]);
              k++;
            }
          }
          G.step();
        }
      }

      G.newGame({ players: 2 });
      var rep = R.enCurso();
      ok(rep, 'el dúo local también se graba');
      corre(true);
      var pts = G.score, quedan = G.dotsLeft;
      ok(rep.entradas.length > 0, 'con giros de los dos jugadores');
      var deJ2 = 0;
      for (var i = 0; i < rep.entradas.length; i++) {
        if (rep.entradas[i][1] === 1) deJ2++;
      }
      ok(deJ2 > 0, 'los giros del jugador 2 también se apuntan');
      if (!rep.final) {
        rep.final = { puntos: pts, nivel: G.level, fantasmas: G.runGhosts,
                      tiempoMs: Math.round(G.timeTicks * 1000 / 60) };
      }
      var leida = R.leer(R.serializar(rep));
      ok(leida, 'el texto de un dúo se lee');
      eq(leida.modo, 'duo');
      ok(R.ver(leida), 'la repetición del dúo arranca');
      eq(G.playerCount, 2, 'se reproduce con dos Pac-Man');
      corre(false);
      eq(G.score, pts, 'la puntuación del dúo no cuadra');
      eq(G.dotsLeft, quedan, 'las pastillas del dúo no cuadran');
    } finally {
      window.PM.Replay.salir();
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  test('TUS PARTIDAS saca un botón VER en las que tienen repetición', function () {
    var R = window.PM.Replay, UI = window.PM.UI, H = window.PM.History;
    var previo = null, hs = G.highScore1;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* sin almacén */ }
    var hist = H.all();
    try {
      R.borrarTodo();
      G.highScore1 = 500000;
      var reg = R.guardar(repDe(4321));
      ok(reg, 'la repetición se guarda');
      // dos partidas: una con repetición y otra sin ella
      UI.renderHistory([
        { t: reg.t, j: 1, m: 'local', n1: 'ANA', n2: '', p: 4321, lv: 4 },
        { t: reg.t, j: 1, m: 'local', n1: 'ANA', n2: '', p: 55, lv: 1 }
      ]);
      var filas = UI.rankList.children;
      eq(filas.length, 2, 'dos partidas en la lista');
      eq(filas[0].querySelectorAll('button').length, 1, 'la grabada tiene VER');
      eq(filas[1].querySelectorAll('button').length, 0, 'la otra no');
      eq(filas[0].querySelectorAll('button')[0].textContent, 'VER');
    } finally {
      G.highScore1 = hs;
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previo);
      } catch (e) { /* sin almacén */ }
      H.clear();
      for (var i = hist.length - 1; i >= 0; i--) {
        H.add({ jugadores: hist[i].j, modo: hist[i].m, nombre1: hist[i].n1,
                nombre2: hist[i].n2, puntos: hist[i].p, nivel: hist[i].lv });
      }
    }
  });

  // ---------------------------------------------------------------
  // Chat y emotes
  // ---------------------------------------------------------------
  test('el chat limpia y recorta los mensajes', function () {
    eq(G.cleanChat('  hola   mundo  '), 'hola mundo');
    eq(G.cleanChat(null), '');
    ok(G.cleanChat(new Array(200).join('x')).length <= CFG.CHAT_MAX);
  });

  test('los emotes van en el orden de sus teclas', function () {
    eq(CFG.EMOTES.length, 6, 'seis emotes para las teclas 1..6');
    for (var i = 0; i < CFG.EMOTES.length; i++) {
      ok(CFG.EMOTES[i].id, 'el emote ' + (i + 1) + ' tiene expresión');
    }
  });

  // ---------------------------------------------------------------
  // Pausa y votaciones
  // ---------------------------------------------------------------
  test('la pausa abre el menú y reanudar lo cierra', function () {
    partida(1);
    G.requestPause();
    ok(G.paused, 'queda en pausa');
    ok(window.PM.UI.promptOpen, 'con el menú delante');
    G.requestPause();
    ok(!G.paused);
    ok(!window.PM.UI.promptOpen);
  });

  test('reiniciar en local no necesita votación', function () {
    partida(2);
    G.score = 500;
    G.restartGame();
    eq(G.score, 0);
    eq(G.playerCount, 2);
  });

  // ---------------------------------------------------------------
  // Cronómetro
  // ---------------------------------------------------------------
  test('el cronómetro corre jugando y se para en pausa', function () {
    partida(1);
    G.timeTicks = 0;
    ticks(60);
    eq(G.timeTicks, 60, 'un segundo de partida');
    eq(G.clockText(), '00:01');
    G.setPaused(true);
    ticks(60);
    eq(G.timeTicks, 60, 'en pausa no avanza');
    G.setPaused(false);
  });

  test('el cronómetro también corre durante la muerte', function () {
    partida(2);
    G.timeTicks = 0;
    G.startDeath(0);
    ticks(30);
    ok(G.timeTicks > 0, 'sigue contando mientras uno muere');
  });

  test('el reloj se formatea en mm:ss', function () {
    partida(1);
    G.timeTicks = 60 * 75;      // 1:15
    eq(G.clockText(), '01:15');
    G.timeTicks = 60 * 605;     // 10:05
    eq(G.clockText(), '10:05');
  });

  // ---------------------------------------------------------------
  // Récord de velocidad del primer nivel
  // ---------------------------------------------------------------
  /* Despeja el nivel de golpe, como si se hubiera comido todo */
  function despejar() {
    for (var r = 0; r < CFG.ROWS; r++) {
      for (var c = 0; c < CFG.COLS; c++) G.pellets[r][c] = null;
    }
    G.dotsLeft = 0;
    G.step();
  }

  test('el tiempo del nivel 1 se mide en centésimas', function () {
    partida(1);
    G.timeTicks = 60 * 63 + 30;          // 1:03.50
    G.submitLevel1Time();
    eq(G.lvl1Cs, 6350, 'centésimas del nivel 1');
    eq(window.PM.Ranking.fmtTime(G.lvl1Cs), '01:03.50');
    ok(G.timeSent, 'no se vuelve a mandar');
    G.timeTicks = 60 * 200;
    G.submitLevel1Time();
    eq(G.lvl1Cs, 6350, 'la segunda llamada no pisa la marca');
  });

  test('la marca se guarda al despejar el nivel 1, no al acabar la partida', function () {
    partida(1);
    ticks(30);
    despejar();
    eq(G.state, 'LEVEL_DONE');
    ok(G.timeSent, 'se ha cerrado la marca sin esperar al game over');
    ok(G.lvl1Cs > 0, 'con un tiempo de verdad');
    ok(!G.rankingSent, 'la partida sigue: la puntuación aún no se ha mandado');
  });

  test('la marca de velocidad solo cuenta en condiciones normales', function () {
    partida(1);
    ok(G.canTimeRecord(), 'a un jugador, sin red y con los ajustes de siempre');
    G.pacSpeedMult = 1.3;
    ok(!G.canTimeRecord(), 'con Pac-Man acelerado, no');
    G.pacSpeedMult = 1;
    G.ghostSpeedMult = 0.85;
    ok(!G.canTimeRecord(), 'con los fantasmas frenados, tampoco');
    G.ghostSpeedMult = 1;
    G.startLevel = 5;
    ok(!G.canTimeRecord(), 'empezando en otro nivel, tampoco');
    G.startLevel = 1;
    partida(2);
    ok(!G.canTimeRecord(), 'en dúo no hay clasificación de velocidad');
  });

  test('el tiempo del nivel 2 en adelante no toca la marca', function () {
    partida(1);
    G.level = 2;
    G.timeTicks = 60 * 20;
    despejar();
    eq(G.lvl1Cs, 0, 'solo cuenta el primer nivel');
    ok(!G.timeSent);
  });

  // ---------------------------------------------------------------
  // Pausa durante la animación de muerte (lo que no dejaba dar Escape)
  // ---------------------------------------------------------------
  test('se puede pausar mientras mueres', function () {
    partida(2);
    G.startDeath(0);
    ok(G.canPause(), 'con un jugador muriendo');
    G.requestPause();
    ok(G.paused);
    G.requestPause();
    partida(1);
    G.startDeath(0);            // parón clásico: estado DYING
    eq(G.state, 'DYING');
    ok(G.canPause(), 'también en el parón clásico');
  });

  test('no se puede pausar en el game over', function () {
    partida(1);
    G.state = 'GAME_OVER';
    ok(!G.canPause());
  });

  // ---------------------------------------------------------------
  // Nivel de jugador
  // ---------------------------------------------------------------
  test('el nivel de jugador sube y cada escalón cuesta más', function () {
    var L = window.PM.Level;
    var previo = L.xp();
    try {
      L.reset();
      eq(L.state().level, 1);
      ok(L.cost(2) > L.cost(1), 'el segundo escalón pide más');
      ok(L.cost(10) > L.cost(9));
      var subida = L.add(L.cost(1));
      eq(subida, 2, 'con lo justo se sube al 2');
      eq(L.state().level, 2);
      ok(L.add(10) === null, 'unos pocos puntos no suben de nivel');
    } finally {
      L.reset();
      if (previo > 0) L.add(previo);
    }
  });

  test('el nivel se deduce de la experiencia, sin tope', function () {
    var L = window.PM.Level;
    var s = L.stateFor(0);
    eq(s.level, 1);
    eq(s.inLevel, 0);
    ok(L.stateFor(1e9).level > 20, 'con mucha experiencia sigue subiendo');
    var mid = L.stateFor(L.cost(1) + 100);
    eq(mid.level, 2);
    eq(mid.inLevel, 100);
  });

  test('la partida suma experiencia una sola vez', function () {
    var L = window.PM.Level, H = window.PM.History;
    var previo = L.xp(), hist = H.all();
    try {
      L.reset(); H.clear();
      partida(1);
      G.score = 500; G.rankingSent = false;
      G.submitRanking();
      G.submitRanking();          // segunda llamada: no debe contar
      eq(L.xp(), 500);
    } finally {
      L.reset(); if (previo > 0) L.add(previo);
      H.clear();
      for (var i = hist.length - 1; i >= 0; i--) {
        H.add({ jugadores: hist[i].j, modo: hist[i].m, nombre1: hist[i].n1,
                nombre2: hist[i].n2, puntos: hist[i].p, nivel: hist[i].lv });
      }
    }
  });

  // ---------------------------------------------------------------
  // Amigos
  // ---------------------------------------------------------------
  test('se pueden añadir y quitar amigos, sin repetidos', function () {
    var F = window.PM.Friends;
    var previo = F.all();
    var yo = window.PM.settings.nick1;
    try {
      F.clear();
      window.PM.settings.nick1 = 'YO';
      eq(F.add('goku'), null);
      ok(F.has('GOKU'), 'se guarda en mayúsculas');
      ok(F.add('GOKU'), 'no se repite');
      ok(F.add(''), 'hace falta un nombre');
      ok(F.add('YO'), 'no puedes añadirte a ti mismo');
      eq(F.add('MAULIO'), null);
      eq(F.all().length, 2);
      F.remove('GOKU');
      eq(F.all().join(','), 'MAULIO');
    } finally {
      F.clear();
      for (var i = 0; i < previo.length; i++) F.add(previo[i]);
      window.PM.settings.nick1 = yo;
    }
  });

  // ---------------------------------------------------------------
  // Party (salas de grupo)
  // ---------------------------------------------------------------
  /* Party de mentira: la lista de miembros sin tocar la red */
  function party(nombres, colores) {
    var P = window.PM.Party;
    P.st = { code: 'ABCD', leader: true, members: [], status: 'dentro',
             joinTimer: null };
    for (var i = 0; i < nombres.length; i++) {
      P.st.members.push({ s: 'sid' + i, n: nombres[i],
                          c: (colores && colores[i]) || '#ffff00',
                          k: 'clasico', t: new Date().getTime() });
    }
    return P;
  }

  test('en la party los colores repetidos se reparten', function () {
    var P = party(['ANA', 'BENI', 'CARLOS'], ['#ffff00', '#ffff00', '#ff00ff']);
    try {
      var ord = P.gameOrder();
      eq(ord.length, 3);
      eq(ord[0].c, '#ffff00');
      eq(ord[1].c, CFG.PLAYER_COLORS[1], 'al repetido se le da el de su puesto');
      eq(ord[2].c, '#ff00ff', 'el que ya era distinto se queda');
    } finally { P.st = null; P.order = null; }
  });

  test('la party no arranca con menos de dos', function () {
    G.toMenu();                     // sin partida en marcha
    var P = party(['ANA']);
    try {
      ok(!P.canStart(), 'con uno no');
      P.st.members.push({ s: 'sid1', n: 'BENI', c: '#00ff00', k: 'clasico',
                          t: new Date().getTime() });
      ok(P.canStart(), 'con dos sí');
      P.st.leader = false;
      ok(!P.canStart(), 'solo el líder empieza');
      P.st.leader = true;
      partida(2);
      ok(!P.canStart(), 'ni en mitad de una partida');
    } finally { P.st = null; P.order = null; G.toMenu(); }
  });

  test('cada miembro sabe qué jugador le toca', function () {
    var P = party(['ANA', 'BENI', 'CARLOS', 'DIEGO']);
    try {
      P.order = P.gameOrder();
      eq(P.indexOf('sid0'), 0);
      eq(P.indexOf('sid3'), 3);
      eq(P.indexOf('desconocido'), -1);
    } finally { P.st = null; P.order = null; }
  });

  test('hay salida propia y color para cada uno de los cuatro', function () {
    for (var n = 1; n <= CFG.MAX_PLAYERS; n++) {
      eq(CFG.STARTS[n].length, n, 'salidas para ' + n);
      var vistos = {};
      for (var i = 0; i < n; i++) {
        var k = CFG.STARTS[n][i].x + ',' + CFG.STARTS[n][i].y;
        ok(!vistos[k], 'dos jugadores no salen de la misma casilla');
        vistos[k] = 1;
      }
    }
    eq(CFG.PLAYER_COLORS.length, CFG.MAX_PLAYERS);
  });

  // ---------------------------------------------------------------
  // Caídas con grupo grande
  // ---------------------------------------------------------------
  test('si se va uno de cuatro, los demás siguen jugando', function () {
    partida(4, 'host');
    G.playerGone(2);
    ok(G.pacs[2].out, 'el que se fue queda de espectador');
    eq(G.netNotice, null, 'la partida no se corta');
    eq(G.state, 'PLAYING');
    ok(G.anyPlaying(), 'quedan jugadores');
  });

  test('en dúo, si se va el otro sí se acaba', function () {
    partida(2, 'host');
    G.playerGone(1);
    ok(G.netNotice, 'aviso de partida cortada');
    G.netNotice = null;
  });

  test('el que deja de mandar noticias se queda fuera, no congela al resto',
    function () {
      partida(4, 'host');
      G.posWatch = [];
      // el jugador 1 sigue hablando; el 2 y el 3 se han quedado mudos
      for (var i = 0; i < CFG.NET.DROP_TICKS + 2; i++) {
        G.netWatch = 0;
        G.posWatch[1] = 0;
        G.netMaintain();
      }
      ok(!G.pacs[1].out, 'el que habla sigue jugando');
      ok(G.pacs[2].out && G.pacs[3].out, 'los callados quedan de espectadores');
      eq(G.netNotice, null, 'sin corte de partida');
      eq(G.state, 'PLAYING');
    });

  // ---------------------------------------------------------------
  // PAC-MAN VS.: un jugador lleva un fantasma
  // ---------------------------------------------------------------
  var V = window.PM.Versus;

  /* Partida de versus: el jugador `quien` lleva el fantasma `gid` */
  function versus(jugadores, gid, quien, net) {
    window.PM.settings.muted = true;
    var gh = [], i;
    for (i = 0; i < jugadores; i++) gh.push(i === quien ? gid : -1);
    G.newGame({
      players: jugadores, net: net || null, ghosts: gh,
      localIdx: (net === 'guest') ? quien : 0,
      names: ['UNO', 'DOS', 'TRES', 'CUATRO'].slice(0, jugadores)
    });
    G.state = 'PLAYING';
    G.readyTicks = 0;
    for (i = 0; i < G.pacs.length; i++) G.pacs[i].safeTicks = 999999;
    return G;
  }

  /* Deja a un fantasma suelto en el cruce de cuatro salidas de la fila 5 */
  function enElCruce(g, dir) {
    g.mode = 'normal';
    g.frightened = false;
    g.x = 6 * 8 + 4;
    g.y = 5 * 8 + 4;
    g.dir = dir;
    g.clearPlan();
    return g;
  }

  test('siempre queda alguien de Pac-Man, y nadie repite fantasma', function () {
    eq(V.clean([1, 1, 2], 3).join(','), '1,-1,2', 'al repetido se le quita');
    eq(V.clean([0, 1], 2).join(','), '-1,1', 'sin Pac-Man no hay partida');
    eq(V.clean([9, null], 2).join(','), '-1,-1', 'lo que no es fantasma, Pac-Man');
  });

  test('quien lleva fantasma no tiene Pac-Man', function () {
    versus(2, 2, 1);
    ok(G.isVersus(), 'la partida es de PAC-MAN VS.');
    eq(G.vsGhostOf(1), 2);
    eq(G.vsPlayerOf(2), 1);
    ok(G.ghosts[2].human, 'Inky lo lleva un jugador');
    ok(!G.ghosts[0].human, 'los otros tres siguen siendo de la máquina');
    ok(G.pacs[1].out, 'su Pac-Man no está en juego');
    ok(!G.pacs[0].out, 'el otro jugador sí juega');
    eq(G.actorFor(1), G.ghosts[2], 'su ficha visible es el fantasma');
    eq(G.colorFor(1), CFG.GHOSTS[2].color, 'y va con el color de su fantasma');
    G.toMenu();
  });

  /* Si eliges fantasma y luego nadie lo toca —empiezas solo, o tu rival no
   * llega a pulsar—, antes se quedaba dando vueltas por el laberinto sin
   * perseguir a nadie: parecía un juego roto. Hasta la primera tecla lo lleva
   * la máquina; a partir de ahí es suyo. */
  test('el fantasma que nadie ha tocado todavía lo lleva la máquina',
    function () {
      versus(2, 1, 1);                       // el J2 lleva a Pinky
      var g = G.ghosts[1];
      ok(g.human, 'es de un jugador');
      ok(!g.taken, 'pero aún no lo ha cogido nadie');
      // sin dueño decide como la IA: va a por su objetivo, no recto porque sí
      var comoIA = enElCruce(g, CFG.DIR.RIGHT);
      var conIA = comoIA.decide(G);
      g.human = false;                       // la misma casilla, como fantasma normal
      eq(comoIA.decide(G), conIA, 'decide igual que uno de la máquina');
      g.human = true;
      G.setPacDir(1, CFG.DIR.DOWN);          // la primera tecla del J2
      ok(g.taken, 'a la primera tecla pasa a ser suyo');
      G.toMenu();
    });

  test('el fantasma de un jugador va donde le dicen, no a por Pac-Man', function () {
    versus(2, 1, 1);                       // el J2 lleva a Pinky
    var g = enElCruce(G.ghosts[1], CFG.DIR.RIGHT);
    G.setPacDir(1, CFG.DIR.DOWN);          // las teclas del J2
    eq(g.decide(G), CFG.DIR.DOWN, 'obedece la tecla');
    G.setPacDir(1, CFG.DIR.UP);
    eq(g.decide(G), CFG.DIR.UP, 'y cambia de idea cuando se lo dicen');
    G.setPacDir(1, -1);                    // sin rumbo pedido: sigue recto
    g.wishDir = -1;
    eq(g.decide(G), CFG.DIR.RIGHT, 'quien no toca nada sigue de frente');
    G.toMenu();
  });

  /* Los fantasmas de la máquina piensan el giro AL ENTRAR en la casilla, una
   * regla del arcade que se queda igual. Pero al de un jugador eso le comía
   * la media casilla anterior al cruce: pulsabas justo al llegar, no se
   * miraba, el fantasma se pasaba el cruce de largo y encima el rumbo pedido
   * se quedaba puesto y giraba dos cruces más allá. Así no hay quien lo lleve.
   * Ahora, mientras lo lleva un jugador, vale hasta el último momento. */
  test('el fantasma de un jugador coge el cruce aunque pulses justo al llegar',
    function () {
      versus(2, 0, 1);                     // el J2 lleva a BLINKY
      var g = G.ghosts[0];
      var T = CFG.TILE;
      function pruebaDesde(px) {
        g.mode = 'normal'; g.frightened = false;
        g.x = 10 * T + T / 2; g.y = 5 * T + T / 2;   // pasillo de la fila 5
        g.dir = CFG.DIR.LEFT; g.wishDir = -1; g.taken = true; g.clearPlan();
        var centro = 6 * T + T / 2, pulsado = false;
        for (var t = 0; t < 200; t++) {
          if (!pulsado && g.x - centro <= px) {
            G.setPacDir(1, CFG.DIR.DOWN);
            pulsado = true;
          }
          G.netWatch = 0;
          G.step();
          if (g.y > 5 * T + T / 2 + 1) return 'baja';
          if (g.x < 5 * T) return 'se pasa';
        }
        return 'nada';
      }
      eq(pruebaDesde(6), 'baja', 'pulsando con media casilla de margen');
      eq(pruebaDesde(1), 'baja', 'y pulsando a un píxel del cruce');
      G.toMenu();
    });

  /* La regla que sostiene todo lo demás: si el fantasma de la máquina no
   * puede darse la vuelta, el del jugador tampoco. Sin esto, en un pasillo
   * Pac-Man no tendría escapatoria. */
  test('el fantasma de un jugador tampoco puede darse la vuelta', function () {
    versus(2, 1, 1);
    var g = enElCruce(G.ghosts[1], CFG.DIR.RIGHT);
    G.setPacDir(1, CFG.DIR.LEFT);          // media vuelta
    eq(g.decide(G), CFG.DIR.RIGHT, 'la marcha atrás no se le permite');
    G.toMenu();
  });

  test('al fantasma de un jugador lo atan las paredes y las zonas sin subir',
    function () {
      versus(2, 1, 1);
      var g = G.ghosts[1];
      g.mode = 'normal';
      g.frightened = false;
      g.x = 12 * 8 + 4; g.y = 23 * 8 + 4;  // casilla donde no se sube nunca
      g.dir = CFG.DIR.LEFT;
      g.clearPlan();
      G.setPacDir(1, CFG.DIR.UP);
      eq(g.decide(G), CFG.DIR.LEFT, 'ahí no se sube ni con la tecla puesta');
      G.toMenu();
    });

  test('el cambio de modo no le da la vuelta al fantasma humano; el energizante sí',
    function () {
      versus(2, 0, 1);                     // el J2 lleva a Blinky
      var g = enElCruce(G.ghosts[0], CFG.DIR.RIGHT);
      G.forceReversal();
      eq(g.dir, CFG.DIR.RIGHT, 'dispersión y persecución no van con él');
      G.forceReversalFright();
      eq(g.dir, CFG.DIR.LEFT, 'el energizante sí: es parte del modo asustado');
      G.toMenu();
    });

  test('al fantasma de un jugador no se le hace esperar en la casa', function () {
    versus(2, 3, 1);                       // Clyde, que en el nivel 1 pide 60
    G.level = 1;
    eq(G.preferredInside(), G.ghosts[3], 'sale antes que Pinky e Inky');
    eq(G.houseLimitFor(G.ghosts[3]), 0, 'y sin puntos que esperar');
    ok(G.houseLimitFor(G.ghosts[2]) > 0, 'los de la máquina sí esperan');
    G.toMenu();
  });

  test('cazar un Pac-Man le da puntos al fantasma, y al equipo no', function () {
    versus(2, 0, 1);
    var p = G.pacs[0], g = G.ghosts[0];
    p.safeTicks = 0;
    g.mode = 'normal';
    g.frightened = false;
    p.x = 6 * 8 + 4; p.y = 5 * 8 + 4;
    g.x = p.x; g.y = p.y;
    G.pellets[5][6] = null;                // sin punto que comer por el camino
    G.pellets[5][5] = null;
    var antes = G.score;
    G.step();
    eq(G.vsScoreOf(1), CFG.VS.CATCH_POINTS, 'cobra el que caza, en su marcador');
    eq(V.catches(G, 1), 1);
    eq(G.score, antes, 'el marcador del equipo no se toca');
    G.toMenu();
  });

  /* El reparto permite que más de uno lleve fantasma (solo exige que quede
   * algún Pac-Man). Con un marcador común, dos cazadores no sabrían quién ha
   * hecho qué, y el nivel de jugador les daría lo mismo a los dos. */
  test('con dos cazadores, cada uno tiene su propio marcador', function () {
    window.PM.settings.muted = true;
    G.newGame({ players: 4, ghosts: [-1, -1, 0, 1],
                names: ['UNO', 'DOS', 'TRES', 'CUATRO'] });
    G.state = 'PLAYING';
    G.readyTicks = 0;
    eq(G.vsGhostOf(2), 0, 'el J3 lleva a Blinky');
    eq(G.vsGhostOf(3), 1, 'y el J4 a Pinky');

    V.onCatch(G, 0, 0);                  // Blinky (J3) caza al J1
    V.onCatch(G, 1, 0);                  // y también al J2
    V.onCatch(G, 0, 1);                  // Pinky (J4) caza una vez
    eq(G.vsScoreOf(2), CFG.VS.CATCH_POINTS * 2, 'el J3 cobra sus dos cazas');
    eq(G.vsScoreOf(3), CFG.VS.CATCH_POINTS, 'el J4 solo la suya');
    eq(V.catches(G, 2), 2);
    eq(V.catches(G, 3), 1);

    var lista = V.hunters(G);
    eq(lista.length, 2, 'los dos salen en el resumen');
    eq(lista[0].name, 'TRES');
    eq(V.topHunter(G).name, 'TRES', 'el titular es del que más caza');

    // y cada uno se lleva SU experiencia, no la del otro
    G.localIdx = 3; G.netRole = 'guest';
    eq(G.myPoints(), CFG.VS.CATCH_POINTS, 'lo mío es lo que he cazado yo');
    G.localIdx = 2;
    eq(G.myPoints(), CFG.VS.CATCH_POINTS * 2);
    G.netRole = null; G.localIdx = 0;
    G.toMenu();
  });

  /* El modo asustado se respeta tal cual: al fantasma del jugador se lo pueden
   * comer, vuelve a casa hecho ojos y sale por donde salen todos. */
  test('al fantasma de un jugador se lo comen y vuelve a casa como los demás',
    function () {
      versus(2, 0, 1);
      var g = G.ghosts[0], p = G.pacs[0];
      G.frightTicks = 600;
      g.frightened = true;
      g.mode = 'normal';
      g.x = 6 * 8 + 4; g.y = 5 * 8 + 4;
      p.x = g.x; p.y = g.y;
      p.safeTicks = 0;
      G.step();
      eq(g.mode, 'eyes', 'comido: se vuelve a casa hecho ojos');
      ok(G.score > 0, 'y los puntos son de quien se lo comió');
      p.safeTicks = 999999;
      var n = 0;
      while (g.mode !== 'normal' && n < 1200) { G.step(); n++; }
      eq(g.mode, 'normal', 'sale otra vez por la puerta de siempre');
      ok(g.human, 'y sigue siendo del jugador');
      G.toMenu();
    });

  test('gana el fantasma si acaba con las vidas; si no, ganan los Pac-Man',
    function () {
      versus(2, 0, 1);
      eq(V.winner(G), 'pacs', 'mientras quede un Pac-Man en pie');
      eq(V.ghostName(G), G.nameFor(1), 'y el cazador se llama por su nombre');
      G.pacs[0].out = true;
      eq(V.winner(G), 'ghost', 'sin Pac-Man vivos, la ronda es suya');
      G.toMenu();
    });

  test('PAC-MAN VS. no toca récords ni top mundial, pero sí el nivel de jugador',
    function () {
      var L = window.PM.Level, R = window.PM.Ranking;
      var xp0 = L.xp(), h2 = G.highScore2;
      var enviados = 0, orig = R.submit;
      try {
        L.reset();
        R.submit = function () { enviados++; };
        versus(2, 0, 1, 'host');
        G.localIdx = 1;                    // aquí el cazador soy yo
        G.score = 7000;
        G.vsScores[1] = 2500;
        G.highScore = 50000;
        G.highScore2 = 0;
        G.persistHighScore();
        eq(G.highScore2, 0, 'no se guarda récord de equipo');
        G.submitRanking();
        eq(enviados, 0, 'ni se sube al top mundial');
        eq(L.xp(), 2500, 'la experiencia es la que ha cazado, no la del rival');
      } finally {
        R.submit = orig;
        L.reset(); L.add(xp0);
        G.highScore2 = h2;
        G.netRole = null;
        G.toMenu();
      }
    });

  test('el que lleva fantasma manda su rumbo, no su posición', function () {
    versus(2, 3, 1, 'guest');
    var salidas = [], orig = G.netSend;
    G.netSend = function (n, d) { salidas.push({ n: n, d: d }); };
    try {
      G.setPacDir(1, CFG.DIR.UP);
      eq(salidas.length, 1, 'el giro sale al momento');
      eq(salidas[0].n, 'gevt');
      eq(salidas[0].d.t, 'gdir');
      eq(salidas[0].d.d, CFG.DIR.UP);
      eq(salidas[0].d.i, 1, 'con su índice de jugador');
      salidas.length = 0;
      G.sendGuestUpdates();
      eq(salidas.length, 0, 'sin cambios no se repite cada tick');
      for (var i = 0; i < CFG.VS.DIR_EVERY; i++) G.sendGuestUpdates();
      eq(salidas.length, 1, 'se reenvía de vez en cuando, por si se perdió');
      eq(salidas[0].d.t, 'gdir', 'y nunca sale un pos: no tiene Pac-Man');
    } finally { G.netSend = orig; G.netRole = null; G.toMenu(); }
  });

  test('el anfitrión aplica el rumbo que le llega del cazador', function () {
    versus(3, 3, 2, 'host');                               // el J3 lleva a Clyde
    G.hostGuestEvent({ t: 'gdir', d: CFG.DIR.LEFT }, 2);
    eq(G.ghosts[3].wishDir, CFG.DIR.LEFT);
    G.hostGuestEvent({ t: 'gdir', d: 9 }, 2);              // basura
    eq(G.ghosts[3].wishDir, -1, 'un rumbo imposible se descarta');
    G.ghosts[3].wishDir = CFG.DIR.DOWN;
    G.hostGuestEvent({ t: 'gdir', d: CFG.DIR.UP }, 1);     // ese lleva Pac-Man
    eq(G.ghosts[3].wishDir, CFG.DIR.DOWN, 'solo manda quien lo lleva');
    G.netRole = null;
    G.toMenu();
  });

  /* El anfitrión va un viaje de red por detrás aplicando el rumbo, así que su
   * fantasma no está exactamente donde el del cazador. Copiarle la posición
   * cada instantánea sería un tirón por mensaje. */
  test('al cazador no se le recoloca el fantasma con cada instantánea', function () {
    versus(2, 3, 1, 'guest');
    var g = G.ghosts[3];
    g.mode = 'normal';
    g.x = 100; g.y = 100;
    var s = G.buildSnapshot(false);
    s.g[3].x = 104;
    G.applySnapshot(s);
    eq(g.x, 100, 'una diferencia normal no se corrige');
    var lejos = 100 + CFG.VS.RESYNC_PX + 6;
    var s2 = G.buildSnapshot(false);
    s2.g[3].x = lejos;
    G.applySnapshot(s2);
    eq(g.x, lejos, 'si se separan demasiado, manda el anfitrión');
    G.netRole = null;
    G.toMenu();
  });

  test('el fantasma del jugador lleva marca encima todo el rato', function () {
    versus(2, 1, 1);
    var puntos = [];
    var ctx = {
      fillStyle: '',
      save: function () {}, restore: function () {},
      beginPath: function () {}, closePath: function () {}, fill: function () {},
      moveTo: function (x, y) { puntos.push([x, y]); },
      lineTo: function (x, y) { puntos.push([x, y]); }
    };
    V.drawMarks(G, ctx);
    eq(puntos.length, 3, 'un triángulo, y solo sobre el fantasma que lleva alguien');
    ok(puntos[0][1] < G.ghosts[1].y + CFG.MAZE_Y, 'dibujado por encima de él');
    G.toMenu();
  });

  test('una partida de PAC-MAN VS. rueda sola y el giro pedido se ejecuta',
    function () {
      versus(2, 1, 1);
      var g = enElCruce(G.ghosts[1], CFG.DIR.RIGHT);
      G.setPacDir(1, CFG.DIR.DOWN);
      var vueltas = 0;
      while (g.dir !== CFG.DIR.DOWN && vueltas < 30) { G.step(); vueltas++; }
      eq(g.dir, CFG.DIR.DOWN, 'el fantasma acaba bajando, como se le pidió');
      ticks(120);
      ok(G.state === 'PLAYING' || G.state === 'DYING', 'y la partida sigue rodando');
      ok(G.ghosts[1].human, 'sigue siendo suyo después de un rato');
      G.toMenu();
    });

  /* PAC-MAN VS. en el mismo teclado: el fantasma del J2 se guarda en OPCIONES
   * y de ahí lo coge el botón DOS JUGADORES. */
  test('el fantasma del jugador 2 local se elige en OPCIONES', function () {
    var U = window.PM.UI;
    var prev = window.PM.settings.vsGhost2;
    try {
      ok(U.vsLocalBtns && U.vsLocalBtns[-1] && U.vsLocalBtns[3],
         'están Pac-Man y los cuatro fantasmas');
      U.vsLocalBtns[2].click();
      eq(window.PM.settings.vsGhost2, 2, 'se guarda el elegido');
      U.vsLocalBtns[-1].click();
      eq(window.PM.settings.vsGhost2, -1, 'y se puede volver a Pac-Man');
    } finally {
      window.PM.settings.vsGhost2 = prev;
    }
  });

  test('en la sala no se lleva dos veces el mismo fantasma', function () {
    G.toMenu();
    var P = party(['ANA', 'BENI']);
    try {
      P.st.members[0].g = 2;
      eq(P.claim('sid1', 2), -1, 'ese ya lo lleva otro');
      eq(P.claim('sid0', 2), 2, 'el dueño lo conserva');
      eq(P.claim('sid1', 3), 3, 'los libres sí se pueden pedir');
      eq(P.ghostOwner(2), 'sid0');
      ok(P.anyPac(), 'de momento queda un Pac-Man');
      P.st.members[1].g = 3;
      var ord = P.gameOrder();
      eq(ord[0].g, 2, 'el reparto viaja en el orden de juego');
      eq(ord[1].g, 3);
      ok(!P.anyPac(), 'ahora no queda ningún Pac-Man');
      ok(!P.canStart(), 'y así no se puede empezar');
    } finally { P.st = null; P.order = null; P.ghostPick = -1; }
  });

  // ---------------------------------------------------------------
  // Ver la partida de otro (espectador)
  // ---------------------------------------------------------------
  function mirando(jugadores) {
    window.PM.settings.muted = true;
    G.newGame({ players: jugadores, net: 'spec', localIdx: -1,
                names: ['UNO', 'DOS'] });
    G.state = 'PLAYING';
    G.readyTicks = 0;
    return G;
  }

  test('de espectador no se lleva ningún Pac-Man', function () {
    mirando(2);
    ok(G.isSpec(), 'el rol es de mirón');
    eq(G.localIdx, -1);
    eq(G.pacs.length, 2, 'se ven todos los que juegan');
    for (var i = 0; i < G.pacs.length; i++) {
      ok(!G.isLocalAuth(i), 'ningún pac es suyo');
    }
    G.toMenu();
  });

  test('mirando, la partida avanza sin petar y sin mandar nada', function () {
    mirando(2);
    var antes = G.pacs[0].x;
    G.outEaten = [];
    ticks(30);
    ok(G.pacs[0].x !== antes, 'los jugadores se mueven por estima');
    eq(G.outEaten.length, 0, 'el mirón no reporta pastillas');
    G.toMenu();
  });

  /* Mirar la partida de un amigo va por un canal aparte, así que la party
   * propia sigue en pie: antes había que salirse del grupo para poder ver. */
  test('mirando, la party propia ni se toca', function () {
    var Net = window.PM.Net, P = window.PM.Party;
    var prevSt = P.st, prevTr = Net.transport, prevH = Net.handler;
    try {
      var canal = { cerrado: false, enviados: [],
                    send: function (n) { this.enviados.push(n); },
                    close: function () { this.cerrado = true; } };
      Net.viewCh = canal;
      Net.viewCode = 'ABCD';
      Net.transport = { cerrado: false, send: function () {},
                        close: function () { this.cerrado = true; } };
      P.st = { code: 'WXYZ', leader: true, members: [], status: 'dentro' };
      mirando(2);
      ok(Net.viewHandler, 'la partida escucha por el canal de mirón');
      eq(Net.handler, prevH, 'el canal principal se queda con la party');
      G.netSend('gevt', {});
      eq(canal.enviados.length, 1, 'lo que manda sale por la sala ajena');
      G.toMenu();
      ok(canal.cerrado, 'al salir se cierra solo la sala que se miraba');
      ok(!Net.transport.cerrado, 'el canal de la party sigue abierto');
      ok(P.inParty(), 'se sigue en la party');
    } finally {
      Net.viewCh = null; Net.viewCode = null;
      Net.viewHandler = null; Net.viewOnClose = null;
      Net.transport = prevTr; Net.handler = prevH;
      P.st = prevSt;
    }
  });

  test('el mirón no puede rendirse, ni chatear, ni poner emotes', function () {
    mirando(2);
    ok(!G.canSurrender(), 'rendirse no es cosa suya');
    ok(!G.canChat(), 'sin chat');
    ok(!G.canEmote(), 'sin emotes');
    G.toMenu();
  });

  test('lo que ve el mirón no cuenta como partida suya', function () {
    var H = window.PM.History;
    mirando(2);
    G.score = 5000;
    var antes = H.all().length;
    G.submitRanking();
    eq(H.all().length, antes, 'no se guarda en su historial');
    G.toMenu();
  });

  // ---------------------------------------------------------------
  // Nivel de jugador: mide cuánto juegas, no si haces récord
  // ---------------------------------------------------------------
  test('los puntos suman experiencia aunque no haya récord ni game over',
    function () {
      var L = window.PM.Level;
      var xp0 = L.xp();
      try {
        L.reset();
        G.highScore1 = 999999;        // imposible batir el récord
        partida(1);
        G.score = 500;                // una partida floja
        G.toMenu();                   // te sales a medias
        eq(L.xp(), 500, 'los 500 puntos cuentan igual');
      } finally { L.reset(); L.add(xp0); G.highScore1 = 0; }
    });

  test('la experiencia de una partida se cuenta una sola vez', function () {
    var L = window.PM.Level;
    var xp0 = L.xp();
    try {
      L.reset();
      partida(1);
      G.score = 1200;
      G.submitRanking();              // fin de partida normal
      G.toMenu();                     // y luego salir al menú
      eq(L.xp(), 1200, 'no se suma dos veces');
    } finally { L.reset(); L.add(xp0); }
  });

  test('reiniciar a media partida no tira lo jugado', function () {
    var L = window.PM.Level;
    var xp0 = L.xp();
    try {
      L.reset();
      partida(1);
      G.score = 800;
      G.restartGame();                // R en el menú de pausa
      eq(L.xp(), 800, 'los 800 de la anterior ya están sumados');
      G.score = 300;
      G.toMenu();
      eq(L.xp(), 1100, 'y la nueva suma los suyos');
    } finally { L.reset(); L.add(xp0); G.toMenu(); }
  });

  test('subir de nivel al salirse se avisa en el menú', function () {
    var L = window.PM.Level;
    var xp0 = L.xp();
    try {
      L.reset();
      partida(1);
      G.score = L.cost(1) + 10;       // justo para pasar de nivel
      G.pendingLevelUp = null;
      G.toMenu();
      eq(L.state().level, 2, 'se ha subido de nivel');
      ok(window.PM.UI.promptOpen, 'el menú lo celebra con un aviso');
    } finally {
      L.reset(); L.add(xp0);
      G.pendingLevelUp = null;
      window.PM.UI.hidePrompt();
    }
  });

  // ---------------------------------------------------------------
  // Ver la partida de un amigo que juega en local (escaparate)
  // ---------------------------------------------------------------
  /* Cambia Net.openChannel por uno de mentira: así se comprueba qué canales
   * se abren y qué se manda por ellos sin tocar la red de verdad. */
  function conCanalFalso(fn) {
    var N = window.PM.Net;
    var orig = N.openChannel;
    var abiertos = [], enviados = [];
    N.openChannel = function (topic) {
      abiertos.push(topic);
      return {
        send: function (n, d) { enviados.push({ t: topic, n: n, d: d }); },
        close: function () { }
      };
    };
    try { fn(abiertos, enviados); } finally { N.openChannel = orig; }
  }

  test('jugando en local se abre un escaparate para que te puedan mirar',
    function () {
      var nick = window.PM.settings.nick1;
      conCanalFalso(function (abiertos) {
        try {
          window.PM.settings.nick1 = 'ALGUIEN';
          partida(1);
          ok(G.showCode, 'la partida en local tiene su propio código');
          ok(abiertos.indexOf('sala:' + G.showCode) !== -1,
             'y su canal abierto: ' + abiertos.join(' '));
          // quien viene a mirar recibe el reparto y una foto completa
          var vistas = [], envio = G.showSend;
          G.showSend = function (n) { vistas.push(n); };
          try { G.sendShowView('otro'); } finally { G.showSend = envio; }
          eq(vistas.join(','), 'svista,snap', 'al mirón se le manda todo');
          G.toMenu();
          ok(!G.showCh && !G.showCode, 'y al salir se cierra');
        } finally {
          window.PM.settings.nick1 = nick;
          G.closeShowcase();
        }
      });
    });

  test('sin nombre no hay escaparate: nadie podría encontrarte', function () {
    var nick = window.PM.settings.nick1;
    conCanalFalso(function () {
      try {
        window.PM.settings.nick1 = '';
        partida(1);
        ok(!G.showCh, 'no se abre canal ninguno');
      } finally {
        window.PM.settings.nick1 = nick;
        G.closeShowcase();
        G.toMenu();
      }
    });
  });

  test('el canal personal reparte el código de la partida en local',
    function () {
      var P = window.PM.Party;
      var nick = window.PM.settings.nick1;
      var dicho = null;
      var chFalso = { send: function (n, d) { dicho = { n: n, d: d }; } };
      var st0 = P.st, ch0 = P.userCh;
      conCanalFalso(function () {
        try {
          window.PM.settings.nick1 = 'ALGUIEN';
          partida(1);
          P.st = null;                       // sin party: solo el escaparate
          P.userCh = chFalso;
          P.userNick = 'ALGUIEN';
          P.onUser('donde', {});
          ok(dicho && dicho.n === 'aqui', 'contesta a quien pregunta');
          eq(dicho.d.code, G.showCode, 'con el código del escaparate');
          eq(dicho.d.jugando, 1, 'y diciendo que está jugando');
        } finally {
          P.st = st0; P.userCh = ch0;
          window.PM.settings.nick1 = nick;
          G.closeShowcase();
          G.toMenu();
        }
      });
    });

  test('al abrir la partida de otro no se pierden sus enganches', function () {
    var N = window.PM.Net;
    conCanalFalso(function () {
      var visto = 0;
      N.viewHandler = null;
      N.openView('ABCD', {
        onMsg: function () { visto++; },
        onGone: function () { }
      });
      ok(N.viewHandler, 'el manejador sigue puesto después de abrir');
      N.viewHandler('svista', {}, 'x');
      eq(visto, 1, 'y es justo el que se pasó (antes lo borraba closeView)');
      N.closeView();
    });
  });

  // ---------------------------------------------------------------
  // Resumen del final de la partida
  // ---------------------------------------------------------------
  test('al acabar se resume lo que te llevas de la partida', function () {
    var L = window.PM.Level, A = window.PM.Achievements;
    var xp0 = L.xp(), previo = null;
    try { previo = localStorage.getItem(CFG.ACH_KEY); } catch (e) { /* nada */ }
    try {
      L.reset();
      A.reset();
      partida(1);
      // 20 000 puntos: suben de nivel de jugador y cae el logro CENTURIÓN
      G.score = 20000;
      G.level = 3;                      // y tres laberintos despejados
      G.closeRun();
      var r = G.runSummary;
      ok(r, 'queda guardado el resumen');
      eq(r.puntos, 20000, 'los puntos de la partida');
      eq(r.exp, 20000, 'que son también la experiencia ganada');
      eq(r.nivel, 3, 'el nivel del laberinto al que llegó');
      eq(r.lvlAntes, 1, 'el nivel de jugador que tenía');
      ok(r.lvl > r.lvlAntes, 'y ha pasado a uno más alto: ' + r.lvl);
      eq(r.lvl, L.state().level, 'el mismo que tiene ahora de verdad');
      ok(r.logros.length > 0, 'y los logros conseguidos: ' +
         r.logros.map(function (a) { return a.name; }).join(', '));
    } finally {
      L.reset(); L.add(xp0);
      try {
        if (previo === null) localStorage.removeItem(CFG.ACH_KEY);
        else localStorage.setItem(CFG.ACH_KEY, previo);
      } catch (e) { /* sin almacenamiento */ }
      G.toMenu();
      window.PM.UI.hidePrompt();
    }
  });

  test('el panel del final espera a que acaben las celebraciones', function () {
    partida(1);
    try {
      G.achNotice = { name: 'X', desc: 'X', color: '#fff', ticks: 3, total: 3 };
      G.state = 'GAME_OVER';
      G.phaseTicks = 0;
      G.overIdle = false;
      G.enterGameOverIdle();
      ok(G.overWait, 'con un logro en pantalla, el panel espera');
      ok(!window.PM.UI.promptOpen, 'y todavía no hay panel');
      for (var i = 0; i < 10 && G.overWait; i++) G.step();
      ok(!G.overWait, 'cuando el aviso termina, deja de esperar');
      ok(window.PM.UI.promptOpen, 'y sale el panel con el resumen');
    } finally {
      G.achNotice = null;
      G.toMenu();
      window.PM.UI.hidePrompt();
    }
  });

  // ---------------------------------------------------------------
  // Caras de emote: cada una se mueve imitando su emoción
  // ---------------------------------------------------------------
  test('cada emote se anima, y sin reloj se queda quieto', function () {
    if (window.__SIN_LIENZO) return;    // hace falta leer píxeles de verdad
    var S = window.PM.Sprites;
    var cv = document.createElement('canvas');
    cv.width = 60; cv.height = 60;
    var ctx = cv.getContext('2d', { willReadFrequently: true });

    /* Huella de un fotograma: cuántos píxeles se pintan y de qué color, para
     * notar tanto que la cara se mueve como que le salen lágrimas o humo. */
    function huella(id, tick) {
      ctx.clearRect(0, 0, 60, 60);
      S.drawPacFace(ctx, 30, 30, 14, '#ffff00', id, tick);
      var d = ctx.getImageData(0, 0, 60, 60).data, s = '';
      var n = 0, rr = 0, gg = 0, bb = 0;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        n++; rr += d[i]; gg += d[i + 1]; bb += d[i + 2];
      }
      return n + ':' + rr + ':' + gg + ':' + bb + s;
    }

    CFG.EMOTES.forEach(function (e) {
      var vistos = {}, distintos = 0;
      // un ciclo largo: casi 3 s, que es lo que dura el emote en pantalla
      for (var t = 0; t < 160; t += 8) {
        var h = huella(e.id, t);
        if (!vistos[h]) { vistos[h] = 1; distintos++; }
      }
      ok(distintos >= 10, e.id + ' cambia a lo largo del emote (' +
         distintos + ' fotogramas distintos de 20)');
      eq(huella(e.id, undefined), huella(e.id, undefined),
         e.id + ' sin reloj se pinta siempre igual (avatares y miniaturas)');
    });
  });

  test('el globo del emote no deja escapar nada al laberinto', function () {
    if (window.__SIN_LIENZO) return;
    var cv = document.createElement('canvas');
    cv.width = CFG.NATIVE_W; cv.height = 60;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var fuera = 0;
    for (var t = 0; t < 120; t += 4) {
      ctx.clearRect(0, 0, cv.width, 60);
      // el globo se pinta con la punta en (112, 44): ocupa de y=24 a y=46
      window.PM.Sprites.drawEmote(ctx, 112, 44, 1, '#ffff00', t);
      var d = ctx.getImageData(0, 0, cv.width, 60).data;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        var px = (i / 4) % cv.width, py = Math.floor((i / 4) / cv.width);
        if (py < 20 || py > 48 || px < 96 || px > 128) fuera++;
      }
    }
    eq(fuera, 0, 'todo lo que se anima se queda dentro del globo');
  });

  // ---------------------------------------------------------------
  // Chapa de maestría sobre el jugador (Ctrl+Espacio)
  // ---------------------------------------------------------------
  test('la chapa de maestría sale animada, no de golpe', function () {
    partida(1);
    G.emoteCooldown = 0;
    G.sendBadgeTag();
    var e = G.emotes[0];
    ok(e && e.tag, 'aparece la chapa');
    eq(e.total, CFG.EMOTE_TICKS, 'guarda su duración para poder animarla');

    // el resto cuenta píxeles pintados: sin lienzo de verdad (pruebas-node.js)
    // no hay nada que medir, así que se queda en lo comprobado hasta aquí
    if (window.__SIN_LIENZO) return;

    var cv = document.createElement('canvas');
    cv.width = 224; cv.height = 44;
    var ctx = cv.getContext('2d');
    function pinta(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      window.PM.Sprites.drawBadgeTag(ctx, 112, 34, 'EXPERTO', '#00ff00', t, 20);
      var d = ctx.getImageData(0, 0, cv.width, cv.height).data, n = 0;
      for (var i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      return n;
    }
    var subiendo = pinta(0.05), abierta = pinta(0.5), yendose = pinta(0.99);
    ok(subiendo > 0, 'al empezar ya se ve la medalla subiendo');
    ok(abierta > subiendo * 2, 'después se despliega la chapa con el nombre');
    ok(yendose < abierta, 'y al final se encoge hacia el jugador');
    ok(pinta(1) === 0, 'al terminar no queda nada');
  });

  /* Las seis se celebraban igual, así que subir de escalón no se notaba.
   * Ahora cada rango añade pompa encima del anterior. */
  test('cada maestría se celebra con la pompa de su escalón', function () {
    if (window.__SIN_LIENZO) return;
    var cv = document.createElement('canvas');
    cv.width = 224; cv.height = 44;
    var ctx = cv.getContext('2d');
    /* mismo nombre y mismo color para todos: lo que se compara es la pompa,
     * no lo que ocupa el texto (TOP MUNDIAL tiene cuatro letras más) */
    function pinta(rango, t, tick) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      window.PM.Sprites.drawBadgeTag(ctx, 112, 34, 'MAESTRIA', '#00ff00',
        t, tick, rango);
      var d = ctx.getImageData(0, 0, cv.width, cv.height).data, n = 0;
      for (var i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      return n;
    }
    var r, lucida = [];
    for (r = 0; r < CFG.BADGES.length; r++) lucida.push(pinta(r, 0.5, 20));
    ok(lucida[0] > 0, 'la más sencilla también se ve');
    ok(lucida[5] > lucida[3] && lucida[3] > lucida[0],
       'cuanto más alta, más aparato: ' + lucida.join(' · '));
    ok(pinta(1, 0.22, 20) > pinta(0, 0.22, 20),
       'el chispazo al plantarse empieza en CAZADOR');

    /* La silueta también sube de rango: de EXPERTO para arriba la chapa deja
     * de ser un rectángulo. Se mira la esquina del rótulo: en la cuadrada
     * está pintada y en la biselada no, porque ahí está el corte. */
    function esquinaPintada(rango) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      window.PM.Sprites.drawBadgeTag(ctx, 112, 34, 'MAESTRIA', '#00ff00',
        0.5, 20, rango);
      var d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      var x0 = cv.width, y0 = cv.height, x, y;
      for (y = 0; y < cv.height; y++) {
        for (x = 0; x < cv.width; x++) {
          if (d[(y * cv.width + x) * 4 + 3] > 0) {
            if (x < x0) x0 = x;
            if (y < y0) y0 = y;
          }
        }
      }
      return d[(y0 * cv.width + x0) * 4 + 3] > 0;
    }
    ok(esquinaPintada(1), 'hasta CAZADOR la chapa es un rectángulo');
    ok(!esquinaPintada(2), 'EXPERTO ya le corta las esquinas');
    for (r = 0; r < CFG.BADGES.length; r++) {
      eq(pinta(r, 1, 20), 0, 'ninguna deja nada al terminar');
    }
  });

  // ---------------------------------------------------------------
  // Skin OJOS: el ojo iba a la barbilla mirando a la derecha (y así se
  // veía en la miniatura de OPCIONES, que mira justo hacia ese lado)
  // ---------------------------------------------------------------
  /* Apunta los arcos que dibuja el sprite; el ojo y su pupila son los
   * pequeños. Vale con lienzo de verdad y con el de mentira. */
  function ojoDe(dir) {
    var cv = document.createElement('canvas');
    cv.width = 32; cv.height = 32;
    var ctx = cv.getContext('2d');
    var arcos = [];
    var orig = ctx.arc;
    ctx.arc = function (x, y, r) {
      arcos.push({ x: x, y: y, r: r });
      return orig.apply(ctx, arguments);
    };
    window.PM.Sprites.drawPacman(ctx, 16, 16, dir, 2, '#ffff00', 'ojos');
    ctx.arc = orig;
    for (var i = 0; i < arcos.length; i++) {
      if (arcos[i].r > 1.5 && arcos[i].r < 3) return arcos[i];   // el blanco
    }
    return null;
  }

  test('la skin OJOS pone el ojo en la frente, mire a donde mire', function () {
    var der = ojoDe(CFG.DIR.RIGHT), izq = ojoDe(CFG.DIR.LEFT);
    var arr = ojoDe(CFG.DIR.UP), aba = ojoDe(CFG.DIR.DOWN);
    ok(der && izq && arr && aba, 'se dibuja el ojo en las cuatro direcciones');
    ok(der.y < 16, 'mirando a la derecha, el ojo va ARRIBA (era el fallo)');
    ok(izq.y < 16, 'mirando a la izquierda, también arriba');
    eq(Math.round(der.y * 10), Math.round(izq.y * 10),
       'a la misma altura hacia un lado y hacia el otro');
    eq(Math.round((der.x - 16) * 10), Math.round((16 - izq.x) * 10),
       'y adelantado lo mismo en los dos sentidos');
    ok(arr.x < 16 && aba.x < 16, 'en vertical el ojo se va a un lado');
    eq(Math.round(arr.x * 10), Math.round(aba.x * 10),
       'y siempre al mismo, suba o baje');
  });

  /* El otro fallo del ojo: quedaba tan pegado al eje de avance que con la
   * boca abierta del todo parte del blanco caía DENTRO de la cuña de la boca
   * y parecía flotar en el hueco. Se compara con el cuerpo de la skin
   * clásica, que es exactamente el mismo: ni un píxel del ojo puede caer
   * donde el cuerpo no pinta nada. */
  test('el ojo de la skin OJOS nunca se mete en el hueco de la boca',
    function () {
      if (window.__SIN_LIENZO) return;
      var dirs = [CFG.DIR.RIGHT, CFG.DIR.LEFT, CFG.DIR.UP, CFG.DIR.DOWN];
      function pinta(skin, dir, fase) {
        var cv = document.createElement('canvas');
        cv.width = 32; cv.height = 32;
        var c = cv.getContext('2d', { willReadFrequently: true });
        window.PM.Sprites.drawPacman(c, 16, 16, dir, fase, '#ffff00', skin);
        return c.getImageData(0, 0, 32, 32).data;
      }
      var fuera = 0;
      for (var di = 0; di < dirs.length; di++) {
        for (var f = 0; f <= 2; f++) {
          var conOjo = pinta('ojos', dirs[di], f);
          var cuerpo = pinta('clasico', dirs[di], f);
          for (var i = 3; i < conOjo.length; i += 4) {
            // con margen: el borde del cuerpo va suavizado
            if (conOjo[i] > 128 && cuerpo[i] < 40) fuera++;
          }
        }
      }
      eq(fuera, 0, 'el ojo cae entero sobre el cuerpo, en las cuatro ' +
         'direcciones y con la boca en sus tres aperturas');
    });

  // ---------------------------------------------------------------
  // Skins por nivel
  // ---------------------------------------------------------------
  test('las skins se abren con el nivel de jugador', function () {
    var L = window.PM.Level;
    var previo = L.xp();
    try {
      L.reset();
      eq(L.level(), 1, 'de recién llegado');
      ok(L.skinUnlocked('clasico'), 'la clásica está desde el principio');
      ok(!L.skinUnlocked('sombra'), 'la última no');
      var abiertas = L.skinsAllowed('clasico');
      eq(abiertas.length, 1, 'al nivel 1 solo hay una');
      // la que ya llevas puesta no se pierde aunque pida más nivel
      ok(L.skinsAllowed('sombra').indexOf('sombra') !== -1,
         'la que ya llevas puesta sigue valiendo');
      // con nivel de sobra se abren todas: se suma justo lo que cuesta
      // llegar al nivel de la skin más cara
      var tope = 1;
      for (var i = 0; i < CFG.SKINS.length; i++) {
        tope = Math.max(tope, CFG.SKINS[i].level || 1);
      }
      var falta = 0;
      for (var n = 1; n < tope; n++) falta += L.cost(n);
      L.add(falta);
      eq(L.level(), tope, 'con esa experiencia se llega justo al nivel ' + tope);
      eq(L.skinsAllowed('clasico').length, CFG.SKINS.length, 'ya están todas');
    } finally {
      L.reset();
      if (previo > 0) L.add(previo);
    }
  });

  // ---------------------------------------------------------------
  // Logros
  // ---------------------------------------------------------------
  function conLogrosLimpios(fn) {
    var A = window.PM.Achievements;
    var previo = null;
    try { previo = localStorage.getItem(CFG.ACH_KEY); } catch (e) { /* nada */ }
    A.reset();
    try { fn(A); } finally {
      try {
        if (previo === null) localStorage.removeItem(CFG.ACH_KEY);
        else localStorage.setItem(CFG.ACH_KEY, previo);
      } catch (e) { /* nada */ }
    }
  }

  test('los contadores de logros suman, guardan el récord y el mejor tiempo', function () {
    conLogrosLimpios(function (A) {
      A.record('fantasmas', 3);
      A.record('fantasmas', 2);
      eq(A.stats().fantasmas, 5, 'los fantasmas se suman');
      A.record('racha', 3);
      A.record('racha', 2);
      eq(A.stats().racha, 3, 'la racha se queda con la mejor');
      A.record('mejorT1', 9000);
      A.record('mejorT1', 12000);
      eq(A.stats().mejorT1, 9000, 'el tiempo se queda con el MENOR');
      A.record('mejorT1', 7000);
      eq(A.stats().mejorT1, 7000);
    });
  });

  test('un logro se consigue al llegar a su meta y se anuncia una vez', function () {
    conLogrosLimpios(function (A) {
      A.syncSeen();
      ok(!A.has('doblete'), 'de entrada no está');
      A.record('racha', 2);
      ok(A.has('doblete'), 'con 2 fantasmas del tirón, sí');
      var fresh = A.claim();
      var ids = fresh.map(function (a) { return a.id; });
      ok(ids.indexOf('doblete') !== -1, 'se anuncia');
      eq(A.claim().length, 0, 'y no se vuelve a anunciar');
    });
  });

  test('el logro de velocidad cuenta hacia abajo', function () {
    conLogrosLimpios(function (A) {
      A.record('mejorT1', 12000);            // 2:00, todavía lejos
      ok(!A.has('relampago'));
      A.record('mejorT1', 8000);             // 1:20
      ok(A.has('relampago'), 'por debajo de 1:30 se consigue');
      var p = A.progress({ stat: 'mejorT1', goal: 9000, menor: true });
      eq(p.hecho, true);
      eq(p.pct, 1);
    });
  });

  test('entrar en una cuenta funde los contadores sin perder nada', function () {
    conLogrosLimpios(function (A) {
      A.record('fantasmas', 10);
      A.record('mejorT1', 9000);
      A.merge({ fantasmas: 400, racha: 4, mejorT1: 12000 });
      var c = A.stats();
      eq(c.fantasmas, 400, 'se queda con el mayor');
      eq(c.racha, 4, 'lo que aquí no había, entra');
      eq(c.mejorT1, 9000, 'y el tiempo, con el mejor de los dos');
    });
  });

  test('comerse fantasmas y frutas alimenta los logros', function () {
    conLogrosLimpios(function (A) {
      partida(1);
      G.chainIndex = 0;
      G.eatGhost(G.ghosts[0], 0);
      G.eatGhost(G.ghosts[1], 0);
      eq(A.stats().fantasmas, 2, 'dos fantasmas');
      eq(A.stats().racha, 2, 'racha de dos con el mismo energizante');
      ok(A.has('doblete'), 'eso ya es un doblete');
      ok(G.achNotices.length > 0 || G.achNotice, 'y sale su aviso');
    });
  });

  test('mirar la partida de otro no da logros', function () {
    conLogrosLimpios(function (A) {
      mirando(2);
      G.bumpAch({ fantasmas: 50 });
      eq(A.stats().fantasmas, 0, 'de mirón no cuenta nada');
      G.toMenu();
    });
  });

  test('despejar niveles seguidos sin morir sube el contador; morir lo corta',
    function () {
      conLogrosLimpios(function (A) {
        partida(1);
        despejar();
        eq(A.stats().limpios, 1, 'un nivel limpio');
        ok(A.has('impecable'));
        G.state = 'PLAYING';
        despejar();
        eq(A.stats().limpios, 2, 'dos seguidos');
        G.state = 'PLAYING';
        G.pacs[0].safeTicks = 0;
        G.startDeath(0);
        eq(G.limpiosSeguidos, 0, 'morir corta la racha');
      });
    });

  // ---------------------------------------------------------------
  // Perfil, avatares y cuentas
  // ---------------------------------------------------------------
  /* El aviso de logro se dibuja en la partida: que el camino de pintado no
   * se rompa (es fácil que un cambio en sprites.js lo tire y no se note
   * hasta que alguien consigue uno jugando). */
  test('la partida se pinta con un aviso de logro encima', function () {
    partida(1);
    G.achNotice = { name: 'FESTÍN', desc: 'LOS 4 FANTASMAS', color: '#ffff00',
                    ticks: 100, total: CFG.ACH_NOTICE_TICKS };
    G.badgeNotice = { name: 'CAZADOR', color: '#00ffff', mode: 'SOLO',
                      ticks: 100, total: CFG.BADGE_ANIM_TICKS };
    G.render();
    ok(true, 'pinta sin lanzar');
    // y la banda estrecha de las partidas de varios, por el otro camino
    partida(3);
    G.badgeNotice = { name: 'CAZADOR', color: '#00ffff', mode: 'TRÍO',
                      ticks: 100, total: CFG.BADGE_ANIM_TICKS };
    G.render();
    ok(true, 'la banda también');
    G.achNotice = null;
    G.badgeNotice = null;
  });

  test('el aviso de logro se encola y se va solo', function () {
    partida(1);
    G.achNotices = [];
    G.achNotice = null;
    G.achNotices.push({ name: 'X', desc: 'Y', color: '#fff',
                        ticks: 3, total: 3 });
    G.stepAchNotice();
    ok(G.achNotice, 'sale de la cola');
    G.stepAchNotice();
    G.stepAchNotice();
    eq(G.achNotice, null, 'y se apaga al agotarse');
  });

  test('todos los avatares se dibujan sin petar', function () {
    var cv = document.createElement('canvas');
    cv.width = 40; cv.height = 40;
    var ctx = cv.getContext('2d');
    CFG.AVATARS.forEach(function (av) {
      window.PM.Sprites.drawAvatar(ctx, 20, 20, 16, av.id, '#ffff00');
    });
    // un id inventado no debe romper: se cae al primero
    window.PM.Sprites.drawAvatar(ctx, 20, 20, 16, 'noexiste', '#ffff00');
    ok(true, 'ninguno lanza');
  });

  test('el panel PERFIL se monta y se refresca en sus dos pestañas', function () {
    var UI = window.PM.UI;
    UI.showProfile();
    ok(UI.els.profile, 'existe el panel');
    eq(UI.avatarItems.length, CFG.AVATARS.length, 'están todos los avatares');
    ok(UI.profName.textContent.length > 0, 'enseña un nombre');
    UI.showProfileTab('logros');
    eq(UI.achList.children.length, CFG.ACHIEVEMENTS.length,
       'la pestaña de logros los lista todos');
    UI.showProfileTab('perfil');
    UI.showMenu();
  });

  /* El panel enseñaba una lista con un botón VER por fila y un lienzo suelto
   * encima. Ahora la fila entera es el botón y la elegida se ve al lado. */
  test('MAESTRÍAS: se elige pulsando la fila y empieza por la que tienes',
    function () {
      var UI = window.PM.UI;
      var h1 = G.highScore1, h2 = G.highScore2, h3 = G.highScore3;
      try {
        G.highScore1 = 9000;              // APRENDIZ y CAZADOR conseguidas
        G.highScore2 = 0;                 // en dúo, ninguna todavía
        G.highScore3 = 9000;              // en trío, 9.000 solo dan APRENDIZ
        UI.showBadges();
        eq(UI.badgesList.children.length, CFG.BADGES.length, 'están todas');
        var fila = UI.badgesList.children[0];
        eq(fila.tagName, 'BUTTON', 'la fila entera es el botón');
        eq(fila.querySelectorAll('button').length, 0, 'sin botón VER dentro');
        eq(UI.badgePick, 'cazador', 'de entrada, tu maestría');
        eq(UI.badgeStageName.textContent, 'CAZADOR', 'y se ve en grande');
        ok(UI.badgeRows.cazador.classList.contains('sel'), 'marcada en la lista');
        ok(UI.badgeStageState.textContent.indexOf('TU MAESTRÍA') === 0,
           'dice que es la tuya');

        UI.badgeRows.leyenda.click();
        eq(UI.badgePick, 'leyenda', 'pulsar otra fila la enseña');
        ok(!UI.badgeRows.cazador.classList.contains('sel'), 'solo una elegida');
        ok(UI.badgeStageState.textContent.indexOf('TE FALTAN') === 0,
           'y de una que no tienes, lo que falta');

        UI.showBadgeTab('duo');            // sin récord de dúo: ninguna
        eq(UI.badgePick, 'aprendiz', 'en dúo empieza por la primera');

        /* la misma marca, otro formato: en trío el listón es el triple, así
         * que 9.000 se quedan en la primera */
        UI.showBadgeTab('trio');
        eq(UI.badgePick, 'aprendiz', 'en trío, 9.000 solo dan APRENDIZ');
        ok(UI.badgesSub.textContent.indexOf('RÉCORD EN TRÍO: 9000') === 0,
           'y el panel lo dice con el récord de trío');
        ok(UI.badgeRows.cazador.classList.contains('got') === false,
           'CAZADOR en trío pide 24.000: aún no');
      } finally {
        G.highScore1 = h1;
        G.highScore2 = h2;
        G.highScore3 = h3;
        UI.showBadgeTab('solo');
        UI.showMenu();
      }
    });

  test('de invitado no hay amigos, y el nombre se puede sortear', function () {
    var UI = window.PM.UI;
    var Ac = window.PM.Account;
    ok(!Ac.logged(), 'sin sesión');
    UI.showFriends();
    eq(UI.friendsGate.style.display, 'flex', 'sale el aviso de que hace falta cuenta');
    eq(UI.friendsBody.style.display, 'none', 'y no la lista');
    var antes = window.PM.settings.nick1;
    try {
      UI.showProfile();
      eq(UI.profGuestRow.style.display, 'flex', 'de invitado se puede sortear nombre');
      UI.profGuestRow.querySelector('.btn').click();
      var n = window.PM.settings.nick1;
      ok(n && n.length > 0 && n.length <= CFG.NICK_MAX, 'sale un nombre válido: ' + n);
    } finally {
      window.PM.settings.nick1 = antes;
      UI.showMenu();
    }
  });

  /* La lista se pedía dentro de refreshFriends() y la respuesta volvía a
   * llamarlo: pedir → refrescar → pedir, sin parar. Los botones se rehacían
   * decenas de veces por segundo y se comían los clics. */
  test('la lista de amigos no se rehace sin parar', function () {
    var UI = window.PM.UI, Ac = window.PM.Account, F = window.PM.Friends;
    var logged0 = Ac.logged, list0 = Ac.listFriends, previo = F.all();
    var pedidas = 0;
    try {
      Ac.logged = function () { return true; };
      Ac.listFriends = function (cb) { pedidas++; cb(null, ['ANA', 'PEPE']); };
      UI._friendsPulling = false;
      UI.refreshFriends();
      eq(pedidas, 1, 'una sola petición por refresco');
      eq(UI.friendsList.children.length, 2, 'salen los dos amigos');
      var fila = UI.friendsList.children[0];
      eq(fila.querySelectorAll('.friend-btns .btn').length, 4,
         'cada uno con ver perfil, ver partida, invitar y quitar');
      // de entrada solo se ve el amigo; las opciones se despliegan
      ok(!fila.classList.contains('open'), 'la ficha empieza plegada');
      ok(fila.querySelector('.friend-avatar'), 'con su avatar');
      fila.querySelector('.friend-toggle').click();
      ok(fila.classList.contains('open'), 'y el botón la despliega');
    } finally {
      Ac.logged = logged0;
      Ac.listFriends = list0;
      F.replace(previo);
      UI._friendsPulling = false;
      UI.showMenu();
    }
  });

  test('tu skin se elige en PERFIL y la del jugador 2 en OPCIONES',
    function () {
      var UI = window.PM.UI;
      UI.showProfile();
      var enPerfil = UI.els.profile.querySelectorAll('.skins .skin').length;
      // los avatares también son .skin: la skin propia añade CFG.SKINS.length
      ok(enPerfil >= CFG.SKINS.length + CFG.AVATARS.length,
         'en PERFIL están el avatar y la skin propia');
      UI.showOptions();
      UI.showOptionsTab('jugadores');
      var filas = UI.els.options.querySelectorAll('.skins').length;
      eq(filas, 1, 'en OPCIONES solo queda la fila del jugador 2');
      ok(UI.skinRows.skin1 && UI.skinRows.skin2,
         'las dos siguen registradas para repintarse');
      UI.showMenu();
    });

  test('el perfil de un amigo se pinta con sus contadores', function () {
    var UI = window.PM.UI, Ac = window.PM.Account;
    var fetch0 = Ac.fetchProfile;
    try {
      Ac.fetchProfile = function (n, cb) {
        cb(null, { usuario: 'ANA', avatar: 'pinky', xp: 12000,
                   record1: 9000, record2: 0, tiempo1: 8800,
                   logros: { racha: 3, fantasmas: 60, partidas: 5 } });
      };
      UI.showFriendProfile('ANA');
      eq(UI.mateName.textContent, 'ANA', 'sale su nombre');
      eq(UI.mateAchList.children.length, CFG.ACHIEVEMENTS.length,
         'con la lista entera de logros');
      // de sus contadores salen DOBLETE y TRIPLETE (racha 3) y CAZADOR (60)
      eq(UI.mateAchSub.textContent, 'CONSEGUIDOS 3 DE ' + CFG.ACHIEVEMENTS.length,
         'el recuento se deduce de sus contadores, no viaja hecho');
    } finally {
      Ac.fetchProfile = fetch0;
      UI.showMenu();
    }
  });

  test('el usuario de una cuenta se sanea como un nombre del juego', function () {
    var Ac = window.PM.Account;
    eq(Ac.cleanUser('  pepe-123 '), 'PEPE123');
    eq(Ac.cleanUser('estonombreesdemasiadolargo').length, CFG.NICK_MAX,
       'se recorta a la longitud máxima');
    eq(Ac.cleanUser('¡¡!!'), '');
  });

  test('un nombre largo se encoge para caber en su hueco del marcador',
    function () {
      var G = window.PM.Game;
      var lienzo = document.createElement('canvas');
      lienzo.width = CFG.NATIVE_W; lienzo.height = CFG.NATIVE_H;
      var ctx = lienzo.getContext('2d');
      var largo = new Array(CFG.NICK_MAX + 1).join('W');   // el peor caso

      G.fitText(ctx, largo, 8, 16, 44, 7);                 // hueco de 4 jugadores
      var px = parseInt(ctx.font.replace(/^bold /, ''), 10);
      ok(px < 7, 'baja el cuerpo de la letra: ' + ctx.font);
      ok(ctx.measureText(largo).width <= 44, 'y así cabe en los 44 px');

      G.fitText(ctx, 'PEPE', 8, 16, 44, 7);
      eq(ctx.font, 'bold 7px monospace', 'un nombre corto se deja como estaba');
    });

  test('sin sesión, la cuenta no deja tocar nada', function () {
    var Ac = window.PM.Account;
    var msg = null;
    Ac.addFriend('PEPE', function (e) { msg = e; });
    eq(msg, 'NECESITAS UNA CUENTA');
    Ac.listFriends(function (e) { msg = e; });
    eq(msg, 'NECESITAS UNA CUENTA');
  });

  /* La forma de cada petición se comprobó a mano contra Supabase; esto vigila
   * que el código siga mandando exactamente eso (dirección, método y cuerpo). */
  test('las llamadas de la cuenta van donde deben', function () {
    var Ac = window.PM.Account;
    var origFetch = window.fetch;
    var origTok = Ac.token, origUser = Ac.user;
    var vistas = [];
    window.fetch = function (url, opts) {
      vistas.push({ url: String(url), opts: opts || {} });
      return Promise.reject(new Error('cortado a propósito'));
    };
    try {
      Ac.token = null; Ac.user = null;
      Ac.signIn('PEPE', 'lachiquilla', function () {});
      var e = vistas[0];
      ok(/\/auth\/v1\/token\?grant_type=password$/.test(e.url), 'entrar: ' + e.url);
      eq(e.opts.method, 'POST');
      var cuerpo = JSON.parse(e.opts.body);
      eq(cuerpo.email, 'pepe@' + CFG.ACCOUNT.MAIL_DOMAIN,
         'el correo se compone con el usuario');

      vistas.length = 0;
      Ac.signUp('PEPE', 'lachiquilla', function () {});
      ok(/\/auth\/v1\/signup$/.test(vistas[0].url), 'alta: ' + vistas[0].url);

      // con sesión de mentira: guardar el perfil y añadir un amigo
      vistas.length = 0;
      Ac.token = 'token-de-prueba';
      Ac.user = { id: '11111111-1111-1111-1111-111111111111',
                  usuario: 'PEPE', avatar: 'pac' };
      Ac.push(true, function () {});
      var p = vistas[0];
      ok(/\/rest\/v1\/perfiles$/.test(p.url), 'perfil: ' + p.url);
      eq(p.opts.method, 'POST');
      ok(/merge-duplicates/.test(p.opts.headers['Prefer']),
         'se guarda con upsert, no duplicando filas');
      eq(p.opts.headers['Authorization'], 'Bearer token-de-prueba',
         'va firmado con la sesión, no con la clave anónima');
      var fila = JSON.parse(p.opts.body);
      eq(fila.usuario, 'PEPE');
      ok(fila.logros && typeof fila.logros === 'object', 'lleva los logros');

      vistas.length = 0;
      Ac.addFriend('ANA', function () {});
      ok(/\/rest\/v1\/amigos$/.test(vistas[0].url), 'amigos: ' + vistas[0].url);
      eq(JSON.parse(vistas[0].opts.body).amigo, 'ANA');
    } finally {
      window.fetch = origFetch;
      Ac.token = origTok;
      Ac.user = origUser;
    }
  });

  /* Lo importante de entrar en una cuenta: que NUNCA cueste progreso.
   * Lo de la nube entra si es mejor; lo de aquí se queda si lo es. */
  test('entrar en la cuenta sube lo que venga mejor y no baja nada', function () {
    var Ac = window.PM.Account, L = window.PM.Level, A = window.PM.Achievements;
    var G2 = window.PM.Game;
    var origUser = Ac.user, origTok = Ac.token;
    var xp0 = L.xp(), nick0 = window.PM.settings.nick1;
    var av0 = window.PM.settings.avatar;
    var r1 = G2.highScore1, r2 = G2.highScore2;
    var r3 = G2.highScore3, r4 = G2.highScore4;
    conLogrosLimpios(function () {
      try {
        Ac.token = 'x';
        Ac.user = { id: 'id', usuario: '', avatar: 'pac' };
        L.reset();
        L.add(1000);
        G2.highScore1 = 5000;
        G2.highScore3 = 7000;      // el trío de aquí es mejor que el de la nube
        G2.highScore4 = 0;
        A.record('fantasmas', 10);

        Ac.applyRemote({ usuario: 'PEPE', avatar: 'blinky', xp: 50000,
                         record1: 99000, record2: 1234,
                         record3: 100, record4: 40000,
                         logros: { fantasmas: 300, racha: 4 } });

        eq(window.PM.settings.nick1, 'PEPE', 'el nombre pasa a ser el de la cuenta');
        eq(window.PM.settings.avatar, 'blinky', 'y su avatar');
        // y queda escrito, no solo en memoria
        var guardado = JSON.parse(localStorage.getItem(CFG.SETTINGS_KEY) || '{}');
        eq(guardado.nick1, 'PEPE', 'el nombre se persiste');
        eq(guardado.avatar, 'blinky', 'el avatar también');
        eq(L.xp(), 50000, 'la experiencia sube');
        eq(G2.highScore1, 99000, 'el récord de la nube es mejor: entra');
        eq(G2.highScore4, 40000, 'la escuadra también viaja en la cuenta');
        eq(G2.highScore3, 7000, 'y el trío de aquí, que era mejor, se queda');
        eq(A.stats().fantasmas, 300, 'los contadores se funden');

        // ahora una fila PEOR: no debe estropear nada
        Ac.applyRemote({ usuario: 'PEPE', avatar: 'blinky', xp: 10,
                         record1: 1, record2: 0, record3: 0, record4: 0,
                         logros: { fantasmas: 1 } });
        eq(L.xp(), 50000, 'la experiencia no baja');
        eq(G2.highScore1, 99000, 'el récord tampoco');
        eq(G2.highScore4, 40000, 'ni el de escuadra');
        eq(A.stats().fantasmas, 300, 'ni los contadores');

        /* Los cuatro salen en lo que se sube, con su columna */
        var sube = Ac.localState();
        eq(sube.record1, 99000);
        eq(sube.record3, 7000);
        eq(sube.record4, 40000);
        /* Y si el proyecto de Supabase aún no tiene esas columnas (falta
         * correr supabase/cuentas.sql), se manda sin ellas antes que no
         * mandar nada: el récord de siempre no se pierde por eso. */
        Ac.sinRecordsNuevos = true;
        var apanyo = Ac.localState();
        eq(apanyo.record1, 99000, 'los de siempre siguen yendo');
        eq(apanyo.record3, undefined, 'y los nuevos se quedan fuera');
        ok(Ac.perfilCols().indexOf('record3') === -1,
           'tampoco se piden al leer un perfil');
        Ac.sinRecordsNuevos = false;
        ok(Ac.perfilCols().indexOf('record4') !== -1, 'con las columnas, sí');
      } finally {
        Ac.user = origUser; Ac.token = origTok;
        Ac.sinRecordsNuevos = false;
        window.PM.settings.nick1 = nick0;
        window.PM.settings.avatar = av0;
        G2.highScore1 = r1; G2.highScore2 = r2;
        G2.highScore3 = r3; G2.highScore4 = r4;
        L.reset(); if (xp0 > 0) L.add(xp0);
      }
    });
  });

  test('crear cuenta exige usuario y contraseña con un mínimo', function () {
    var Ac = window.PM.Account;
    var msg = null;
    Ac.signUp('AB', 'lachiquilla', function (e) { msg = e; });
    ok(/USUARIO/.test(msg), 'usuario corto: ' + msg);
    Ac.signUp('PEPITO', '123', function (e) { msg = e; });
    ok(/CONTRASEÑA/.test(msg), 'contraseña corta: ' + msg);
  });

  // ---------------------------------------------------------------
  // Aviso de maestría animado
  // ---------------------------------------------------------------
  test('el aviso de maestría dura y se apaga solo', function () {
    partida(1);
    G.badgeNotice = { name: 'CAZADOR', color: '#00ffff', mode: 'SOLO',
                      ticks: CFG.BADGE_ANIM_TICKS, total: CFG.BADGE_ANIM_TICKS };
    ticks(10);
    ok(G.badgeNotice, 'sigue en pantalla');
    ticks(CFG.BADGE_ANIM_TICKS);
    eq(G.badgeNotice, null, 'termina solo');
  });

  // ---------------------------------------------------------------
  // Salida
  // ---------------------------------------------------------------
  G.toMenu();

  var fallos = 0;
  for (var i = 0; i < casos.length; i++) if (!casos[i].ok) fallos++;
  window.__TESTS = { total: casos.length, fallos: fallos, casos: casos };

  var cont = document.getElementById('salida');
  if (cont) {
    var res = document.createElement('div');
    res.className = 'resumen ' + (fallos ? 'mal' : 'bien');
    res.textContent = fallos
      ? (fallos + ' DE ' + casos.length + ' PRUEBAS FALLAN')
      : ('LAS ' + casos.length + ' PRUEBAS PASAN');
    cont.appendChild(res);
    casos.forEach(function (c) {
      var d = document.createElement('div');
      d.className = 'caso ' + (c.ok ? 'bien' : 'mal');
      d.textContent = (c.ok ? '✓ ' : '✗ ') + c.nombre +
        (c.ok ? '' : ' — ' + c.error);
      cont.appendChild(d);
    });
  }

  }   /* arrancar */
})();
