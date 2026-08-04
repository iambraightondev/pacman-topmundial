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
  test('las maestrías de solo y dúo van por separado', function () {
    var B = window.PM.Badges;
    var h1 = G.highScore1, h2 = G.highScore2;
    try {
      G.highScore1 = 9000;      // CAZADOR
      G.highScore2 = 32000;     // MAESTRO
      eq(B.top('solo').id, 'cazador');
      eq(B.top('duo').id, 'maestro');
      ok(!B.has('experto', 'solo'), 'lo de dúo no cuenta en solo');
      ok(B.has('experto', 'duo'));
    } finally { G.highScore1 = h1; G.highScore2 = h2; }
  });

  test('el modo de maestría sale del número de jugadores', function () {
    partida(1); eq(G.badgeMode(), 'solo');
    partida(2); eq(G.badgeMode(), 'duo');
  });

  test('el cartel sale aunque la maestría ya se tuviera, y una vez por partida',
    function () {
      var h1 = G.highScore1;
      try {
        G.highScore1 = 59430;             // ya las tiene casi todas
        window.PM.Badges.syncSeen();      // y todas anunciadas
        partida(1);
        G.addScore(3000);
        ok(G.badgeNotice, 'vuelve a celebrarse el escalón');
        eq(G.badgeNotice.name, 'APRENDIZ');
        eq(G.badgeNotice.nueva, false, 'marcada como ya conseguida');
        G.badgeNotice = null;
        G.addScore(500);                  // sigue en APRENDIZ
        eq(G.badgeNotice, null, 'no se repite en la misma partida');
        G.addScore(4500);                 // cruza CAZADOR (8000)
        ok(G.badgeNotice && G.badgeNotice.name === 'CAZADOR', 'el siguiente sí');
      } finally { G.highScore1 = h1; }
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
