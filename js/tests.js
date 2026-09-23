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

  /* Desde el 16 sep solo entra en el top quien juega con cuenta: las pruebas
   * del envío llevan una sesión de mentira (y nunca la de verdad, PM_PRUEBAS). */
  function testConCuenta(nombre, fn) {
    test(nombre, function () {
      var Ac = window.PM.Account, u0 = Ac.user, t0 = Ac.token;
      Ac.user = { id: 'id-prueba', usuario: 'PRUEBA', avatar: 'pac' };
      Ac.token = 'token-de-prueba';
      try { fn(); } finally { Ac.user = u0; Ac.token = t0; }
    });
  }

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

  /* ---------- Red de mentira ----------
   * Estas pruebas son síncronas, así que una promesa de verdad contestaría
   * cuando ya no hay nadie mirando. `yaEsta` es una promesa que resuelve en el
   * acto: el código de red va enganchando .then/.catch como siempre, pero todo
   * ocurre dentro de la propia llamada. */
  function yaEsta(v) {
    if (v && typeof v.then === 'function') return v;    // ya es una promesa
    return {
      then: function (f) {
        if (!f) return yaEsta(v);
        try { return yaEsta(f(v)); } catch (e) { return roto(e); }
      },
      catch: function () { return yaEsta(v); }
    };
  }

  function roto(e) {
    return {
      then: function () { return roto(e); },
      catch: function (f) { return yaEsta(f(e)); }
    };
  }

  /* Una respuesta de fetch con el cuerpo que se le diga */
  function respuesta(status, cuerpo) {
    var texto = (typeof cuerpo === 'string') ? cuerpo : JSON.stringify(cuerpo);
    return yaEsta({
      ok: status >= 200 && status < 300,
      status: status,
      text: function () { return yaEsta(texto); },
      json: function () { return yaEsta(JSON.parse(texto)); }
    });
  }

  /* Cambia window.fetch por `fn` mientras corre `cuerpo`, y apunta lo pedido */
  function conRed(fn, cuerpo) {
    var orig = window.fetch, vistas = [];
    window.fetch = function (url, opts) {
      vistas.push({ url: String(url), opts: opts || {} });
      return fn(String(url), opts || {});
    };
    try { cuerpo(vistas); } finally { window.fetch = orig; }
    return vistas;
  }

  /* Como si no hubiera conexión. Envuelve lo que MANDA cosas de verdad: en
   * tests.html las credenciales son las buenas, y una prueba que cierre el
   * reto del día acabaría en la clasificación real. Con un hueco por nombre y
   * día (supabase/reto.sql), además, le gastaría el intento a quien la corra. */
  function sinRed(cuerpo) {
    return conRed(function () { return roto(new Error('SIN CONEXIÓN')); }, cuerpo);
  }

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

  /* Seis trazados y seis IDEAS distintas. La lista se comprueba entera
   * porque el valor del modo está justo ahí: si algún día se añade uno que
   * repita lo que ya hay, esto no lo canta, pero al menos obliga a pasar por
   * aquí y mirarlos. */
  test('hay seis laberintos alternativos, cada uno con lo suyo', function () {
    var M = window.PM.Mazes;
    eq(M.LIST.map(function (m) { return m.id; }).join(','),
       'anillos,panal,catedral,serpiente,colmillos,escalera');
    M.LIST.forEach(function (m) {
      ok(m.name && m.desc, m.id + ': se presenta');
      ok(m.pellets > 150, m.id + ': tiene pastillas de sobra');
    });
    /* Ninguno es otro disfrazado: las pastillas no bastan como huella, pero
     * dos trazados iguales sí darían la misma cadena. */
    var vistos = {};
    M.LIST.forEach(function (m) {
      var huella = m.rows.join('');
      ok(!vistos[huella], m.id + ': trazado repetido');
      vistos[huella] = 1;
    });
  });

  /* Un trazado que ya no existe (o uno rehecho, como los tres que se
   * redibujaron) deja la repetición sin sentido: se vería a Pac-Man
   * atravesando muros. Vale más darla por rota. */
  test('una repetición de red de un laberinto desconocido no se reproduce',
    function () {
      var R = window.PM.Replay;
      ok(window.PM.Mazes.conocido('anillos'), 'los de la lista sí valen');
      ok(!window.PM.Mazes.conocido('trazado-que-no-existe'));
      ok(window.PM.Mazes.conocido(null), 'y sin laberinto es el clásico');
    });

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

  /* ---------- la regla de oro del arcade ----------
   * NUNCA dos filas (ni dos columnas) de comida pegadas sin muro de por
   * medio. Dicho de otra forma: ni un solo cuadro de 2x2 casillas
   * transitables. El laberinto de 1980 no tiene ninguno, y no es un capricho
   * estético: con pasillos de una sola casilla, esquivar es elegir una
   * bifurcación, y los patrones de los fantasmas significan algo. En un
   * espacio de dos de ancho se les da la vuelta sin más, y el juego se
   * convierte en otra cosa.
   *
   * Los tres primeros laberintos alternativos se hicieron sin esta regla y
   * tenían bandas de dos filas. De ahí esta prueba, que además comprueba el
   * clásico: si algún día falla ahí, es que se ha tocado lo que no. */
  test('ningún laberinto tiene dos filas de comida pegadas', function () {
    /* La casa de fantasmas y su entorno se saltan: son del núcleo copiado y
     * ahí el hueco de dos de ancho es del original (es donde botan dentro). */
    function enCasa(c, r) { return c >= 9 && c <= 18 && r >= 11 && r <= 18; }
    function cuadros(rows) {
      var out = [];
      for (var r = 0; r < CFG.ROWS - 1; r++) {
        for (var c = 0; c < CFG.COLS - 1; c++) {
          if (enCasa(c, r) || enCasa(c + 1, r + 1)) continue;
          if (abiertoEn(rows, c, r) && abiertoEn(rows, c + 1, r) &&
              abiertoEn(rows, c, r + 1) && abiertoEn(rows, c + 1, r + 1)) {
            out.push('(' + c + ',' + r + ')');
          }
        }
      }
      return out;
    }
    eq(cuadros(CFG.MAZE_CLASSIC).join(' '), '',
       'el de 1980 no tiene ni uno, que es de donde sale la regla');
    window.PM.Mazes.LIST.forEach(function (m) {
      eq(cuadros(m.rows).join(' '), '', m.name + ': cuadros de 2x2');
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

  /* Las cuatro casillas sin subir son las del arcade, y la conversión tiene
   * trampa: el original las da sobre la PANTALLA ENTERA (36 filas) y este
   * array es solo el LABERINTO (31), que empieza CFG.TOP_ROWS más abajo.
   * Restar uno en vez de tres metió cuatro casillas de más. */
  test('las zonas sin subir son las cuatro del arcade, bien convertidas',
    function () {
      var ARCADE = [[12, 14], [15, 14], [12, 26], [15, 26]];   // sobre la pantalla
      eq(CFG.NO_UP_TILES.length, 4, 'son cuatro, ni una más');
      for (var i = 0; i < ARCADE.length; i++) {
        eq(CFG.NO_UP_TILES[i][0], ARCADE[i][0], 'columna de la ' + i);
        eq(CFG.NO_UP_TILES[i][1], ARCADE[i][1] - CFG.TOP_ROWS,
           'fila de la ' + i + ': la del arcade menos las del marcador');
      }
    });

  /* Y en TODOS los laberintos tienen que seguir siendo un cruce CON SALIDA.
   * Si a una se llega subiendo y no tiene salida de lado, el fantasma se
   * queda sin candidatos —arriba prohibido, atrás prohibido, los lados
   * muro— y Ghost.decide le da media vuelta en mitad del pasillo, que es lo
   * único que un fantasma no hace nunca fuera de un cambio de modo. Aquí
   * cayeron las cuatro casillas mal convertidas. */
  test('ninguna zona sin subir deja al fantasma sin salida', function () {
    var todos = [{ name: 'CLÁSICO', rows: CFG.MAZE_CLASSIC }]
      .concat(window.PM.Mazes.LIST);
    todos.forEach(function (m) {
      function libre(c, r) {
        var ch = (m.rows[r] || '').charAt(c);
        return !!ch && ch !== '#' && ch !== '-';
      }
      CFG.NO_UP_TILES.forEach(function (t) {
        var col = t[0], fila = t[1];
        var donde = m.name + ' (' + col + ',' + fila + ')';
        ok(libre(col, fila), donde + ': tiene que ser pasillo');
        if (!libre(col, fila + 1)) return;     // no se llega subiendo: da igual
        ok(libre(col - 1, fila) || libre(col + 1, fila),
           donde + ': se llega subiendo y no hay salida de lado');
      });
    });
  });

  /* LA CUENTA DEL PASILLO. Pac-Man mide 13 px de diámetro y la casilla 8, así
   * que el aire que le queda al pasar sale de lo delgadas que sean las
   * paredes: entre dos muros que se miran hay TILE + 2*WALL_INSET px de
   * negro. Con WALL_INSET 2 eran 12 contra 13 y Pac-Man compartía píxeles con
   * el muro —se veía jugando: al recorrer un pasillo parecía fundirse con la
   * pared—. Esta prueba es para que no vuelva a pasar sin que nadie se entere
   * si alguien engorda el muro o a Pac-Man. */
  test('Pac-Man cabe en el pasillo sin tocar las paredes', function () {
    var hueco = CFG.TILE + 2 * CFG.WALL_INSET;
    var pac = 2 * CFG.PAC_R;
    ok(hueco > pac, 'el pasillo deja ' + hueco + ' px y Pac-Man mide ' + pac);
  });

  /* Cada esquina se come su radio del trazo recto, y un tramo con esquina en
   * los dos extremos se lo come dos veces. El tramo más corto es de UNA
   * casilla: TILE - 2*WALL_INSET - un trazo. Ese trazo tiene que seguir
   * siendo POSITIVO o el muro se dibuja del revés (el radio ya se ajusta solo
   * a cada esquina, ver Game.radioEsquina, pero no puede hacer nada si no
   * queda trazo donde curvar). Se mira en TODOS los laberintos. */
  test('al muro más corto le queda trazo donde curvar', function () {
    var LADOS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    var todos = [{ name: 'CLÁSICO', rows: CFG.MAZE_CLASSIC }]
      .concat(window.PM.Mazes.LIST);
    todos.forEach(function (m) {
      function pasillo(c, r) {
        if (r < 0 || r >= CFG.ROWS) return false;
        if (c < 0 || c >= CFG.COLS) return r === CFG.TUNNEL_ROW;
        return m.rows[r].charAt(c) !== '#';
      }
      function muro(c, r) {
        return r >= 0 && r < CFG.ROWS && c >= 0 && c < CFG.COLS && !pasillo(c, r);
      }
      var corto = Infinity, donde = '';
      LADOS.forEach(function (s) {
        var sx = s[0], sy = s[1], horiz = (sy !== 0), c, r;
        for (r = 0; r < CFG.ROWS; r++) {
          for (c = 0; c < CFG.COLS; c++) {
            if (!muro(c, r) || !pasillo(c + sx, r + sy)) continue;
            // solo desde el principio del tramo, para no contarlo cuatro veces
            var pc = horiz ? c - 1 : c, pr = horiz ? r : r - 1;
            if (muro(pc, pr) && pasillo(pc + sx, pr + sy)) continue;
            var n = 0, cc = c, rr = r;
            while (muro(cc, rr) && pasillo(cc + sx, rr + sy)) {
              n++;
              if (horiz) cc++; else rr++;
            }
            if (n < corto) { corto = n; donde = '(' + c + ',' + r + ')'; }
          }
        }
      });
      var medio = (CFG.WALL_LINE / CFG.SCALE) / 2;   // medio trazo, en nativas
      var trazo = corto * CFG.TILE - 2 * CFG.WALL_INSET - 2 * medio;
      ok(trazo > 0,
         m.name + ': el tramo de ' + corto + ' casillas en ' + donde +
         ' se queda sin trazo (' + trazo + ' px)');
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
      /* Se compara el trazado ENTERO, no una fila suelta: con la regla de no
       * pegar dos filas de comida, la primera de varios alternativos es
       * igual que la del clásico y la comprobación de antes se lo tragaba. */
      ok(CFG.MAZE.join('|') !== CFG.MAZE_CLASSIC.join('|'),
         'en partida manda el alternativo');
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

  test('sin cuenta el récord no se sube: se avisa y se sube al entrar', function () {
    var R = window.PM.Ranking, Ac = window.PM.Account;
    var orig = R.submit, envios = [], u0 = Ac.user, t0 = Ac.token;
    var n1 = window.PM.settings.nick1;
    R.submit = function (o, cb) { envios.push(o); if (cb) cb(null); };
    window.PM.settings.nick1 = 'INVITADO';
    try {
      Ac.user = null; Ac.token = null;
      window.PM.settings.muted = true;
      G.newGame({ players: 1 });
      G.recordPrevio = 100;
      G.score = 5000; G.rankingSent = false;
      G.submitRanking();
      eq(envios.length, 0, 'sin cuenta no se manda nada');
      ok(G.rankPendiente, 'la partida queda esperando');
      ok(G.avisoSinCuenta(), 'y como es récord, se avisa');
      G.recordPrevio = 9000;
      ok(!G.avisoSinCuenta(), 'si no supera lo que tenía, no molesta');
      G.recordPrevio = 100;
      Ac.user = { id: 'id', usuario: 'CUENTANUEVA', avatar: 'pac' };
      Ac.token = 'token-de-prueba';
      G.subirRankPendiente();
      eq(envios.length, 1, 'al entrar, se sube');
      eq(envios[0].nombre1, 'CUENTANUEVA', 'con el nombre de la cuenta');
      eq(G.rankPendiente, null, 'y ya no espera');
      Ac.user = null; Ac.token = null;
      var err = null;
      orig.call(R, { jugadores: 1, nombre1: 'X', puntos: 10, nivel: 1 }, function (e) { err = e; });
      eq(err, 'NECESITAS UNA CUENTA', 'y el envío en sí tampoco sale sin sesión');
    } finally {
      R.submit = orig; Ac.user = u0; Ac.token = t0;
      window.PM.settings.nick1 = n1;
      G.toMenu();
    }
  });

  testConCuenta('cada mundo va a su top mundial: clásico, DESATADO y LABERINTOS', function () {
    var R = window.PM.Ranking;
    var orig = R.submit, envios = [];
    var n1 = window.PM.settings.nick1;
    R.submit = function (o) { envios.push(o); };
    window.PM.settings.nick1 = 'ALGUIEN';
    try {
      window.PM.settings.muted = true;
      G.newGame({ players: 1, maze: window.PM.Mazes.LIST[0].id });
      G.score = 5000; G.rankingSent = false;
      G.submitRanking();
      eq(envios.length, 1, 'otro laberinto también entra');
      eq(envios[0].mundo, 'lab', 'pero en la tabla de LABERINTOS');
      ok(!G.canTimeRecord(), 'y no cuenta el tiempo del nivel 1');
      G.toMenu();
      G.newGame({ players: 1, hab: true });
      G.score = 5000; G.rankingSent = false;
      G.submitRanking();
      eq(envios[1].mundo, 'hab', 'DESATADO va a la suya');
      G.toMenu();
      G.newGame({ players: 1 });
      G.score = 5000; G.rankingSent = false;
      G.submitRanking();
      eq(envios[2].mundo, 'clasico', 'y el de siempre, a la del clásico');
      /* los techos: lo que es imposible en el clásico cabe en DESATADO */
      ok(R.maxPuntos(9, 1, 'clasico') < 180550, 'en el clásico, 180.550 al nivel 9 no cabe');
      ok(R.maxPuntos(9, 1, 'hab', 25 * 60000, 1) > 180550, 'en DESATADO, con 25 minutos, sí');
      ok(R.maxPuntos(3, 1, 'lab') > R.maxPuntos(3, 1, 'clasico'), 'LABERINTOS tiene más pastillas');
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

  /* ---------- El mordisco es más ancho que la casilla ----------
   * Los sprites miden 13 px sobre casillas de 8, así que dos en casillas
   * contiguas ya se solapan medio cuerpo en pantalla. Para COMER cuenta que
   * las casillas se pisen (menos de 8 px en los dos ejes); para MORIR sigue
   * haciendo falta compartirla. */
  function azul(g) {
    G.frightTicks = 600;
    g.mode = 'normal';
    g.frightened = true;
    g.clearPlan();
  }

  test('un fantasma azul se come sin llegar a compartir casilla', function () {
    partida(1);
    var p = G.pacs[0], g = G.ghosts[0];
    azul(g);
    p.x = 6 * 8 + 4; p.y = 5 * 8 + 4;
    g.x = p.x + 7; g.y = p.y;              // casilla de al lado, encima en pantalla
    ok(p.tileX() !== g.tileX(), 'están en casillas distintas');
    ok(G.biteGhost(p, g), 'las casillas se pisan: es mordisco');
    var antes = G.score;
    G.step();
    eq(g.mode, 'eyes', 'se lo ha comido');
    ok(G.score > antes, 'y ha puntuado');
  });

  test('cruzarse de frente con un fantasma AZUL sí se lo come', function () {
    partida(1);
    var p = G.pacs[0], g = G.ghosts[0];
    azul(g);
    p.x = 6 * 8 + 4; p.y = 5 * 8 + 4;
    p.dir = CFG.DIR.RIGHT; p.nextDir = CFG.DIR.RIGHT;
    g.x = 7 * 8 + 4; g.y = 5 * 8 + 4;
    g.dir = CFG.DIR.LEFT;
    g.human = true; g.taken = true; g.wishDir = CFG.DIR.LEFT;   // que no se desvíe
    var pasos = 0;
    while (pasos < 30 && g.mode !== 'eyes' && p.x <= g.x) { G.step(); pasos++; }
    eq(g.mode, 'eyes', 'no debería habérsele atravesado');
  });

  test('el mordisco no llega a través de una pared', function () {
    partida(1);
    var p = G.pacs[0], g = G.ghosts[0];
    azul(g);
    p.x = 6 * 8 + 4; p.y = 5 * 8 + 4;
    g.x = p.x; g.y = p.y + 8;              // el pasillo de al lado, a una casilla
    ok(!G.biteGhost(p, g), 'a 8 px justos no se muerde');
  });

  test('estar al lado de un fantasma que NO está azul no mata', function () {
    partida(1);
    var p = G.pacs[0], g = G.ghosts[0];
    p.safeTicks = 0;
    g.mode = 'normal';
    g.frightened = false;
    p.x = 6 * 8 + 4; p.y = 5 * 8 + 4;
    g.x = p.x + 7; g.y = p.y;
    ok(G.biteGhost(p, g), 'para comer sí valdría');
    ok(!G.hitGhost(p, g), 'para morir no: no comparten casilla');
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
    /* en equipo las vidas son de cada uno desde el 18 sep */
    partida(2);
    G.pacs[0].lives = 3;
    G.startDeath(0);
    ticks(CFG.DEATH_FREEZE_TICKS + CFG.DEATH_ANIM_TICKS + 2);
    ok(!G.pacs[0].dying, 'ha terminado la animación');
    eq(G.pacs[0].lives, 2);
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
    G.pacs[0].lives = 1;
    G.startDeath(0);
    ticks(CFG.DEATH_FREEZE_TICKS + CFG.DEATH_ANIM_TICKS + 2);
    ok(G.pacs[0].out, 'se queda mirando');
    ok(!G.pacs[1].out, 'el compañero sigue');
    eq(G.state, 'PLAYING');
  });

  /* 18 sep: el fondo común se quitó de las opciones. En equipo, siempre
   * vidas propias; 'shared' solo queda por dentro (CACERÍA, jugar solo y las
   * repeticiones viejas, que traen su modo en su ajuste). */
  test('en equipo las vidas son siempre de cada uno', function () {
    partida(2);
    eq(G.livesMode, 'individual', 'el fondo común ya no se ofrece');
    eq(G.lives, 0, 'y no queda bote que repartir');
    eq(G.pacs[0].lives, G.pacs[1].lives, 'los dos empiezan igual');
    /* a quien lo tuviera guardado se le pasa a vidas propias al cargar */
    eq(window.PM.UI.sanitizeNetCfg({ livesMode: 'shared' }).livesMode,
       'individual', 'un ajuste viejo se corrige solo');
    /* una repetición vieja sí puede pedir el fondo común */
    G.newGame({ players: 2, cfg: (function () {
      var c = {}, b = window.PM.settings; for (var k in b) c[k] = b[k];
      c.livesMode = 'shared'; return c;
    })() });
    eq(G.livesMode, 'shared', 'las repeticiones viejas siguen funcionando');
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
        eq(B.MODES.join(','),
           'solo,duo,trio,escuadra,lab,lab2,lab3,lab4,hab,hab2,hab3,hab4',
           'doce rutas: tres mundos por cuatro formatos');
        G.highScore1 = 9000;      // solo: CAZADOR (8.000)
        G.highScore2 = 9000;      // dúo: solo APRENDIZ (3.750); CAZADOR pide 10.000
        G.highScore3 = 0;
        G.highScore4 = 48000;     // escuadra: EXPERTO (26.250); MAESTRO pide 52.500
        eq(B.top('solo').id, 'cazador');
        eq(B.top('duo').id, 'aprendiz', 'la misma marca da menos en dúo');
        eq(B.top('trio'), null, 'sin partidas de trío, ninguna');
        eq(B.top('escuadra').id, 'experto', '48.000 entre cuatro: EXPERTO');
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

  /* En equipo no se hacen más puntos (el laberinto es el mismo), pero se
   * aguanta más. Cada escalón sube un cuarto por formato: x1,25 / x1,5 / x1,75.
   * Antes era x2 / x3 / x4 y las maestrías de equipo eran casi inalcanzables. */
  test('el listón de cada maestría sube un cuarto por formato',
    function () {
      var B = window.PM.Badges;
      var aprendiz = CFG.BADGES[0];
      eq(B.goal(aprendiz, 'solo'), 3000);
      eq(B.goal(aprendiz, 'duo'), 3750, 'en dúo, x1,25');
      eq(B.goal(aprendiz, 'trio'), 4500, 'en trío, x1,5');
      eq(B.goal(aprendiz, 'escuadra'), 5250, 'en escuadra, x1,75');
      eq(B.goal(CFG.BADGES[5], 'escuadra'), 175000, 'TOP MUNDIAL en escuadra');
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

  test('un trofeo ya conseguido no se vuelve a celebrar', function () {
    var h1 = G.highScore1;
    try {
      G.highScore1 = 59430;             // ya las tiene casi todas
      window.PM.Badges.syncSeen();      // y todas anunciadas
      partida(1);
      G.addScore(3000);
      eq(G.badgeNotice, null, 'BRONCE ya lo tenía: ni cartel ni ruido');
      G.addScore(57000);                // 60000: DIAMANTE, que sí es nuevo
      ok(G.badgeNotice && G.badgeNotice.name === 'DIAMANTE', 'el nuevo sí sale');
      eq(G.badgeNotice.mode, 'SOLO');
      G.badgeNotice = null;
      G.addScore(500);
      eq(G.badgeNotice, null, 'y no se repite en la misma partida');
    } finally { G.highScore1 = h1; }
  });

  /* El cartel grande cruzaba el centro de la pantalla cinco segundos, justo
   * por encima de la casa de los fantasmas, en el momento en que acabas de
   * hacer tu mejor marca y estás a punto de perderla. Ahora va arriba y
   * fuera del laberinto SIEMPRE, se juegue solo o acompañado. */
  test('la maestría se celebra arriba y nunca encima del laberinto',
    function () {
      ok(typeof window.PM.Sprites.drawBadgeStrip === 'function',
         'existe el dibujo de la banda de arriba');
      ok(!window.PM.Sprites.drawBadgeBanner,
         'y ya no existe el cartelón que tapaba la partida');
      partida(1);
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

  testConCuenta('una puntuación imposible no llega ni a salir a la red', function () {
    var R = window.PM.Ranking;
    var err = null;
    R.submit({ jugadores: 1, nombre1: 'TRAMPOSO', puntos: 999999, nivel: 1,
               fantasmas: 0, tiempoMs: 60000 }, function (e) { err = e; });
    eq(err, 'PUNTUACIÓN IMPOSIBLE');
  });

  testConCuenta('la partida se manda a la Edge Function, no a la tabla', function () {
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

  testConCuenta('solo el anfitrión sube la partida en online', function () {
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
  // DAILY: siete retos por semana (js/daily.js)
  // ---------------------------------------------------------------
  var DY = window.PM.Daily;

  /* Deja el DAILY limpio, corre la prueba y lo devuelve como estaba. Toca
   * experiencia y contadores de logros, así que se aísla como se aísla todo
   * lo que escribe en el almacén. */
  function conDaily(fn) {
    var antes = null;
    try { antes = localStorage.getItem(CFG.DAILY.KEY); } catch (e) { antes = null; }
    DY.olvidar();
    try { fn(DY); }
    finally {
      if (antes === null) DY.olvidar();
      else { try { localStorage.setItem(CFG.DAILY.KEY, antes); } catch (e) {} }
    }
  }

  test('la cartilla del DAILY viaja con la cuenta y se funde con lo de aquí',
    function () {
      conDaily(function (D) {
        /* Lo de ESTE ordenador: el martes a medias */
        var aqui = D.vacio();
        aqui.p[1] = 2; aqui.racha = 1;
        D.guardar(aqui);
        /* Lo del OTRO: el lunes cumplido, más racha y un escalón cobrado */
        var alla = D.vacio();
        alla.p[0] = 5; alla.h[0] = 1; alla.racha = 4; alla.mejor = 7;
        alla.hito = 3; alla.ult = '2026-09-21';
        ok(D.desdeNube(alla), 'baja y se funde');
        var fin = D.leer();
        eq(fin.p[0], 5, 'lo cumplido allí llega');
        eq(fin.p[1], 2, 'y lo de aquí no se pierde');
        eq(fin.h[0], 1, 'el día cumplido allí cuenta aquí');
        eq(fin.racha, 4, 'la racha se queda con la mejor de las dos');
        eq(fin.mejor, 7, 'y el récord de racha también');
        eq(fin.hito, 3,
          'el escalón ya cobrado viaja: si no, se pagaría dos veces');
        eq(fin.ult, '2026-09-21', 'y el último día cumplido es el más reciente');
      });
    });

  test('una cartilla de otra semana no trae progreso, solo la racha',
    function () {
      conDaily(function (D) {
        var vieja = D.vacio('2000-W01');
        vieja.w = '2000-W01';
        vieja.p[3] = 9; vieja.h[3] = 1; vieja.racha = 6; vieja.mejor = 6;
        D.desdeNube(vieja);
        var fin = D.leer();
        eq(fin.p[3], 0, 'el progreso de una semana pasada no cuenta en esta');
        eq(fin.h[3], 0, 'ni el día dado por cumplido');
        eq(fin.racha, 6, 'pero la racha sí, que es de días seguidos');
      });
    });

  test('la cartilla sube con el perfil y se borra al cerrar sesión',
    function () {
      conDaily(function (D) {
        var est = D.vacio(); est.p[0] = 3; D.guardar(est);
        var sube = window.PM.Account.localState();
        ok(sube.ajustes && sube.ajustes.daily, 'la cartilla va dentro de los ajustes');
        eq(sube.ajustes.daily.p[0], 3, 'con lo que lleva hecho');
        ok(JSON.stringify(sube.ajustes).length < 4000,
          'y todo junto cabe de sobra en la columna');
      });
    });

  /* El día es el DEL RELOJ DE QUIEN JUEGA, no UTC. Con UTC, quien juega en
   * América veía cambiar el reto a media tarde: en Perú (UTC-5), a las 19:00
   * de un viernes ya le salía el reto del sábado. La cartilla sí viaja con
   * la cuenta desde el 22 sep 2026 (Daily.paraNube), pero el DÍA lo pone
   * siempre el reloj de quien juega. */
  test('el día del reto es el del reloj del jugador, no el de UTC', function () {
    // viernes 14 de agosto de 2026 a las 19:30 en hora local
    var vie = new Date(2026, 7, 14, 19, 30);
    eq(DY.diaSemana(vie), 4, 'a las 19:30 de un viernes sigue siendo viernes');
    eq(CFG.DAILY.DIA_CORTO[DY.diaSemana(vie)], 'VIE');
    eq(DY.hoyISO(vie), '2026-08-14', 'y la fecha es la de aquí');
    // y a las 23:59 del domingo todavía no ha empezado la semana siguiente
    var dom = new Date(2026, 7, 9, 23, 59);
    eq(DY.diaSemana(dom), 6, 'el domingo es el último día, no el primero');
    eq(DY.semanaId(dom), '2026-08-03', 'el domingo cae en la semana anterior');
    eq(DY.semanaId(new Date(2026, 7, 10, 0, 30)), '2026-08-10',
       'y el lunes ya abre la suya');
    eq(DY.semanaId(new Date(2026, 7, 13, 5, 0)), '2026-08-10',
       'cualquier día de la misma semana da el mismo identificador');
    eq(DY.fechaDe('2026-08-10', 3), '2026-08-13', 'el jueves de esa semana');
  });

  test('los siete retos salen de la semana y no se repiten', function () {
    var a = DY.retosDe('2026-08-10');
    var b = DY.retosDe('2026-08-10');
    var c = DY.retosDe('2026-08-17');
    eq(a.length, CFG.DAILY.DIAS, 'son siete');
    eq(a.map(function (r) { return r.id; }).join(','),
       b.map(function (r) { return r.id; }).join(','),
       'la misma semana da siempre lo mismo (aquí y en cualquier navegador)');
    ok(a.map(function (r) { return r.id; }).join(',') !==
       c.map(function (r) { return r.id; }).join(','),
       'y otra semana da otra cosa');
    var vistos = {};
    a.forEach(function (r) {
      ok(!vistos[r.id], 'sin repetir dentro de la semana: ' + r.id);
      vistos[r.id] = 1;
    });
  });

  /* El suelo del diseño: una semana entera de retos que piden un modo
   * concreto —o peor, compañía— sería imposible para quien juega solo. */
  test('cada semana trae al menos cinco retos de cualquier modo', function () {
    ['2026-08-10', '2026-08-17', '2026-09-07', '2027-01-04'].forEach(function (w) {
      var libres = 0;
      DY.retosDe(w).forEach(function (r) { if (!r.modo) libres++; });
      ok(libres >= CFG.DAILY.LIBRES_POR_SEMANA,
         w + ': ' + libres + ' libres de ' + CFG.DAILY.DIAS);
    });
  });

  /* SOLO EL DE HOY. Se probó con recuperación (los de días pasados seguían
   * abiertos hasta el domingo) y se quitó: si te puedes poner al día el
   * sábado, el reto deja de ser diario y pasa a ser una lista semanal. */
  test('solo se puede cumplir el reto de hoy', function () {
    var hoy = DY.diaSemana();
    ok(DY.abierto(hoy), 'el de hoy sí');
    if (hoy > 0) ok(!DY.abierto(hoy - 1), 'el de ayer ya no');
    if (hoy < 6) ok(!DY.abierto(hoy + 1), 'y el de mañana todavía no');
  });

  test('un reto de otro día no avanza ni por casualidad', function () {
    conDaily(function (D) {
      var hoy = D.diaSemana();
      if (hoy === 0) return;               // lunes: no hay días pasados
      var retos0 = D.retos;
      D.retos = function () {
        var l = retos0.call(D).slice();
        // el de AYER pide justo lo que se va a hacer, y aun así no cuenta
        l[hoy - 1] = { id: 'x_ayer', desc: 'CÓMETE 1 FANTASMA',
                       stat: 'fantasmas', goal: 1 };
        l[hoy] = { id: 'x_hoy', desc: 'CÓMETE 99 FANTASMAS',
                   stat: 'fantasmas', goal: 99 };
        return l;
      };
      try {
        eq(D.apunta(['solo', 'clasico'], { fantasmas: 5 }).length, 0);
        eq(D.progreso(hoy - 1).valor, 0, 'el de ayer se queda a cero');
        ok(!D.progreso(hoy - 1).hecho, 'y desde luego no se cumple');
        eq(D.progreso(hoy).valor, 5, 'lo que se juega va al de hoy');
        ok(D.caducado(hoy - 1), 'el de ayer se marca como pasado');
      } finally { D.retos = retos0; }
    });
  });

  test('un reto se cumple jugando, y solo cuenta una vez', function () {
    conDaily(function (D) {
      var i = D.diaSemana();
      var est = D.leer();
      // se coloca a mano un reto conocido en el día de hoy para no depender
      // de cuál toque en la semana en la que se corran las pruebas
      var retos0 = D.retos;
      D.retos = function () {
        var l = retos0.call(D).slice();
        l[i] = { id: 'x_test', desc: 'CÓMETE 5 FANTASMAS',
                 stat: 'fantasmas', goal: 5 };
        return l;
      };
      try {
        eq(D.apunta(['solo', 'clasico'], { fantasmas: 3 }).length, 0,
           'a medias no cumple');
        eq(D.progreso(i).valor, 3, 'pero el progreso se guarda');
        var hechos = D.apunta(['solo', 'clasico'], { fantasmas: 2 });
        eq(hechos.length, 1, 'al llegar a la meta, cumplido');
        eq(hechos[0].id, 'x_test');
        ok(D.progreso(i).hecho);
        eq(D.apunta(['solo', 'clasico'], { fantasmas: 9 }).length, 0,
           'y ya no vuelve a cumplirse');
        eq(D.cumplidos(), 1);
      } finally { D.retos = retos0; }
    });
  });

  test('un reto de modo solo cuenta en su modo', function () {
    conDaily(function (D) {
      var i = D.diaSemana();
      var retos0 = D.retos;
      D.retos = function () {
        var l = retos0.call(D).slice();
        l[i] = { id: 'x_lab', modo: 'lab', desc: 'CÓMETE 5 EN OTRO LABERINTO',
                 stat: 'fantasmas', goal: 5 };
        return l;
      };
      try {
        D.apunta(['solo', 'clasico'], { fantasmas: 9 });
        eq(D.progreso(i).valor, 0, 'en el clásico no cuenta nada');
        D.apunta(['solo', 'lab'], { fantasmas: 5 });
        ok(D.progreso(i).hecho, 'y en laberintos sí');
      } finally { D.retos = retos0; }
    });
  });

  test('cumplir un reto da experiencia y sube la racha', function () {
    conDaily(function (D) {
      var L = window.PM.Level;
      var xp0 = L.xp();
      var i = D.diaSemana();
      var retos0 = D.retos;
      D.retos = function () {
        var l = retos0.call(D).slice();
        l[i] = { id: 'x_xp', desc: 'JUEGA 1 PARTIDA', stat: 'partidas', goal: 1 };
        return l;
      };
      try {
        D.apunta(['solo', 'clasico'], { partidas: 1 });
        eq(L.xp(), xp0 + CFG.DAILY.XP, 'la experiencia entra');
        eq(D.racha(), 1, 'y el día cuenta para la racha');
        ok(D.mejorRacha() >= 1, 'que se apunta también como la mejor');
      } finally {
        D.retos = retos0;
        try { localStorage.setItem(CFG.LEVEL_KEY, String(xp0)); } catch (e) {}
      }
    });
  });

  /* Aunque se juegue media tarde, el día cuenta una sola vez */
  test('la racha sube un día por día, aunque se siga jugando', function () {
    conDaily(function (D) {
      var i = D.diaSemana();
      var retos0 = D.retos;
      D.retos = function () {
        var l = retos0.call(D).slice();
        l[i] = { id: 'x_r', desc: 'JUEGA 1 PARTIDA', stat: 'partidas', goal: 1 };
        return l;
      };
      try {
        eq(D.apunta(['solo', 'clasico'], { partidas: 1 }).length, 1);
        eq(D.racha(), 1);
        D.apunta(['solo', 'clasico'], { partidas: 5 });
        eq(D.racha(), 1, 'seguir jugando el mismo día no la sube otra vez');
      } finally { D.retos = retos0; }
    });
  });

  test('al cambiar de semana el progreso se va y la racha se queda', function () {
    conDaily(function (D) {
      var est = D.vacio('1999-01-04');       // una semana que ya pasó
      est.p[0] = 5; est.h[0] = 1;
      est.racha = 9; est.mejor = 12; est.ult = '1999-01-04';
      D.guardar(est);
      var ahora = D.leer();
      eq(ahora.w, D.semanaId(), 'la semana se pone al día sola');
      eq(D.cumplidos(ahora), 0, 'el progreso de la semana vieja no se arrastra');
      eq(ahora.racha, 9, 'la racha no se rompe por cambiar de semana');
      eq(ahora.mejor, 12, 'ni la mejor');
    });
  });

  /* El DAILY no es un modo: se mide con los mismos contadores que los logros y
   * por el mismo embudo (Game.bumpAch), así que jugar a cualquier cosa lo
   * mueve sin que el juego tenga que saber que existe. */
  test('el DAILY avanza jugando, por el mismo embudo que los logros',
    function () {
      conDaily(function (D) {
        var i = D.diaSemana();
        var retos0 = D.retos;
        D.retos = function () {
          var l = retos0.call(D).slice();
          l[i] = { id: 'x_bump', desc: 'CÓMETE 2 FANTASMAS',
                   stat: 'fantasmas', goal: 2 };
          return l;
        };
        try {
          window.PM.settings.muted = true;
          G.newGame({ players: 1 });
          G.state = 'PLAYING';
          G.bumpAch({ fantasmas: 2 });
          ok(D.progreso(i).hecho, 'una jugada normal cumple el reto');
          var visto = false;
          for (var k = 0; k < G.achNotices.length; k++) {
            if (G.achNotices[k].name === 'RETO CUMPLIDO') visto = true;
          }
          ok(visto, 'y se celebra en la banda de arriba');
          G.toMenu();
        } finally { D.retos = retos0; }
      });
    });

  /* Lo que se jugó al RETO DE HOY no se tira: cada día jugado era el reto de
   * ese día cumplido, así que siembra el contador nuevo. */
  test('lo jugado al RETO DE HOY siembra los retos diarios cumplidos',
    function () {
      var A = window.PM.Achievements;
      var raw = null;
      try { raw = localStorage.getItem(CFG.ACH_KEY); } catch (e) { raw = null; }
      try {
        A.reset();
        // se escribe a mano la clave retirada, como la tendría quien venga de antes
        var d = JSON.parse(localStorage.getItem(CFG.ACH_KEY));
        d.c['reto:partidas'] = 14;
        d.d = 0;
        localStorage.setItem(CFG.ACH_KEY, JSON.stringify(d));
        A.sembrarDaily();
        eq(A.stats().dailyOk, 14, 'los días jugados pasan a retos cumplidos');
        eq(A.stats()['daily:dailyOk'], 14, 'también en el contador del DAILY');
        ok(A.has('rt_constante'), 'así que CONSTANTE no se pierde');
        // y no se siembra dos veces
        A.record('dailyOk', 1);
        A.sembrarDaily();
        eq(A.stats().dailyOk, 15, 'la siembra es de una sola vez');
      } finally {
        if (raw === null) A.reset();
        else { try { localStorage.setItem(CFG.ACH_KEY, raw); } catch (e) {} }
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

  test('TOP MUNDIAL: tu rival nunca eres tú, ni en equipo', function () {
    var U = window.PM.UI, n1 = window.PM.settings.nick1;
    try {
      window.PM.settings.nick1 = 'YO';
      var filas = [
        { nombre1: 'YO', nombre2: 'ANA', puntos: 900 },
        { nombre1: 'YO', nombre2: 'LUIS', puntos: 800 },
        { nombre1: 'EVA', nombre2: 'PAU', puntos: 700 }
      ];
      var rv = U.rankRival(filas);
      eq(rv.pos, 0, 'vas primero');
      eq(rv.otro.nombre1, 'EVA', 'y el rival es el primero que no eres tú');
      rv = U.rankRival([{ nombre1: 'EVA', puntos: 50 }, { nombre1: 'YO', puntos: 40 }]);
      eq(rv.otro.nombre1, 'EVA', 'si vas detrás, el de delante');
      eq(U.rankRival([{ nombre1: 'EVA', puntos: 50 }]).pos, -1, 'y si no estás, no hay rival');
      U.showRankMundo('hab');
      eq(U.rankMundo, 'hab', 'se elige DESATADO');
      U.showRankVista('lista');
      eq(U.rankVista, 'lista', 'y verlo en lista');
    } finally {
      window.PM.settings.nick1 = n1;
      U.rankMundo = 'clasico';
      U.rankVista = 'podio';
      U.showMenu();
    }
  });

  test('el panel del top mundial tiene una pestaña por formato y temporadas',
    function () {
      var U = window.PM.UI;
      /* 1..4 son EL NÚMERO DE JUGADORES (una clasificación por formato),
       * el 5 es el nivel 1 y el 0 tus partidas. El 6 era el RETO DE HOY, que
       * se retiró con el modo. */
      ok(U.rankTabBtns[3] && U.rankTabBtns[4], 'están trío y escuadra');
      ok(!U.rankTabBtns[6], 'y ya no está la del reto');
      ok(U.seasonBtns.ahora && U.seasonBtns.historico, 'y las dos de temporada');
      U.showRankTab(1);
      eq(U.seasonRow.style.display, 'flex', 'en INDIVIDUAL se elige temporada');
      U.showRankTab(4);
      eq(U.seasonRow.style.display, 'flex', 'en ESCUADRA también');
      U.showRankTab(0);
      eq(U.seasonRow.style.display, 'none', 'en TUS PARTIDAS no hay temporada');
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
  testConCuenta('trío y escuadra entran en el top mundial, con todos sus nombres',
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

  test('el historial apunta cuántos erais, también en trío y escuadra',
    function () {
      var H = window.PM.History;
      var previo = H.all();
      try {
        H.clear();
        H.add({ jugadores: 4, modo: 'online', nombre1: 'BRAI', puntos: 900,
                nivel: 2 });
        eq(H.all()[0].j, 4, 'una escuadra no es una partida individual');
      } finally {
        H.clear();
        for (var i = previo.length - 1; i >= 0; i--) {
          H.add({ jugadores: previo[i].j, modo: previo[i].m, nombre1: previo[i].n1,
                  nombre2: previo[i].n2, puntos: previo[i].p, nivel: previo[i].lv });
        }
      }
    });

  // ---------------------------------------------------------------
  // Historial en la nube (TUS PARTIDAS con cuenta)
  // El dato ya estaba en la tabla `ranking`; lo que faltaba era leerlo,
  // y por eso el historial no seguía al jugador de un aparato a otro.
  // ---------------------------------------------------------------
  test('sin cuenta, TUS PARTIDAS no sale a la red', function () {
    var H = window.PM.History, Ac = window.PM.Account;
    var tok0 = Ac.token, user0 = Ac.user;
    try {
      Ac.token = null; Ac.user = null;
      var lista = null;
      var vistas = conRed(function () { return respuesta(200, []); },
        function () { H.list(function (e, l) { lista = l; }); });
      eq(vistas.length, 0, 'un nombre suelto no identifica a nadie');
      ok(lista, 'y aun así se enseña lo de este navegador');
    } finally {
      Ac.token = tok0;
      Ac.user = user0;
    }
  });

  test('con cuenta se piden las partidas por los cuatro nombres', function () {
    var H = window.PM.History, Ac = window.PM.Account;
    var tok0 = Ac.token, user0 = Ac.user;
    try {
      Ac.token = 'token-de-prueba';
      Ac.user = { id: '1', usuario: 'BRAI', avatar: 'pac' };
      var lista = null;
      var vistas = conRed(function () {
        return respuesta(200, [{
          creado_en: '2026-08-06T10:00:00Z', jugadores: 4, modo: 'online',
          nombre1: 'ANA', nombre2: 'BRAI', nombre3: 'LUIS', nombre4: 'EVA',
          puntos: 30000, nivel: 6
        }]);
      }, function () { H.remote(function (e, l) { lista = l; }); });
      var url = vistas[0].url;
      ok(url.indexOf('/rest/v1/' + CFG.RANKING.TABLE) !== -1, 'a la tabla: ' + url);
      for (var i = 1; i <= CFG.MAX_PLAYERS; i++) {
        ok(url.indexOf('nombre' + i + '.eq.BRAI') !== -1,
           'las de invitado están en nombre' + i + ': ' + url);
      }
      eq(lista.length, 1, 'llega la partida');
      eq(lista[0].nube, 1, 'marcada como de la nube (aquí no hay repetición)');
      eq(lista[0].j, 4, 'escuadra');
      eq(lista[0].p, 30000, 'con la puntuación del equipo, que es la que compite');
      eq(lista[0].m, 'online', 'y que fue una party');
    } finally {
      Ac.token = tok0;
      Ac.user = user0;
    }
  });

  test('una partida que está aquí y en la nube no sale dos veces', function () {
    var H = window.PM.History;
    var t = 1770000000000;
    var local = [{ t: t, j: 1, m: 'local', n1: 'BRAI', n2: '', p: 5000, lv: 4 }];
    // la fila del ranking se sella un instante después de acabar la partida
    var nube = [
      { t: t + 3000, j: 1, m: 'local', n1: 'BRAI', n2: '', p: 5000, lv: 4, nube: 1 },
      { t: t - 86400000, j: 1, m: 'local', n1: 'BRAI', n2: '', p: 900, lv: 2, nube: 1 }
    ];
    var lista = H.mezclar(local, nube);
    eq(lista.length, 2, 'la repetida se descarta');
    ok(!lista[0].nube, 'y de las dos manda la de aquí, que tiene la repetición');
    eq(lista[0].p, 5000);
    eq(lista[1].p, 900, 'la de otro aparato entra detrás, por fecha');
  });

  test('dos partidas seguidas con la misma puntuación no se confunden',
    function () {
      var H = window.PM.History;
      var t = 1770000000000;
      // mismo formato y misma hora, pero puntuaciones distintas: son dos
      ok(!H.misma({ t: t, j: 1, p: 100 }, { t: t + 1000, j: 1, p: 200 }),
         'con un jugador manda la puntuación');
      // en equipo no se puede comparar (aquí van tus puntos, allí los del
      // equipo), así que se cruzan por hora
      ok(H.misma({ t: t, j: 3, p: 100 }, { t: t + 1000, j: 3, p: 9000 }),
         'en trío basta con la hora');
      ok(!H.misma({ t: t, j: 3, p: 100 }, { t: t + 600000, j: 3, p: 9000 }),
         'pero diez minutos después ya es otra partida');
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

  test('una repetición de DESATADO guarda los PODERES elegidos, no los de serie', function () {
    var R = window.PM.Replay, H = window.PM.Hab;
    try {
      window.PM.settings.muted = true;
      G.newGame({ players: 1, hab: true, roles: ['mago'], loadouts: ['bola_guiada,clon,gravedad,meteoro'] });
      var rep = R.enCurso();
      ok(rep, 'se graba');
      eq((rep.ajustes.poderes || []).join('|'), 'bola_guiada,clon,gravedad,meteoro', 'con sus cuatro poderes');
      rep.final = { puntos: 10, nivel: 1, fantasmas: 0, tiempoMs: 1000 };
      var leida = R.leer(R.serializar(rep));
      ok(leida, 'pasa por el texto');
      eq((leida.ajustes.poderes || []).join('|'), 'bola_guiada,clon,gravedad,meteoro', 'y vuelve igual');
      G.toMenu();
      R.montar(leida);
      eq(H.listaDe(G, 0).map(function (h) { return h.id; }).join(','), 'bola_guiada,clon,gravedad,meteoro',
        'al verla, las teclas son las que eligió');
    } finally { R.salir(); }
  });

  test('una CLASIFICATORIA guardada y retomada sigue contando para el rango', function () {
    var R = window.PM.Replay;
    try {
      window.PM.settings.muted = true;
      G.newGame({ players: 1, hab: true, clasif: true, roles: ['asesino'] });
      var rep = R.enCurso();
      ok(rep && rep.ajustes.clasif, 'la grabación sabe que es CLASIFICATORIA');
      rep.final = { puntos: 10, nivel: 1, fantasmas: 0, tiempoMs: 1000 };
      var leida = R.leer(R.serializar(rep));
      ok(leida && leida.ajustes.clasif, 'y lo conserva al pasar por el texto');
      G.toMenu();
      R.montar(leida);
      ok(G.clasif, 'al montarla (y por tanto al retomarla) vuelve a ser CLASIFICATORIA');
      eq(window.PM.Rango.porQueNo(G), 'MIRANDO', 'aunque mirarla no cuenta');
      R.salir();
      G.newGame({ players: 1, hab: true, roles: ['asesino'] });
      ok(!R.enCurso().ajustes.clasif, 'un DESATADO normal no lleva la marca');
    } finally { R.salir(); G.toMenu(); }
  });

  test('una repetición de party trae los poderes, lo que hacen y al REY FANTASMA', function () {
    var R = window.PM.Replay, H = window.PM.Hab, J = window.PM.Jefe;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_NET_KEY); } catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      G.newGame({ players: 2, net: 'host', names: ['UNO', 'DOS'], hab: true, roles: ['mago', 'tanque'],
                  loadouts: ['bola_guiada,totem,gravedad,meteoro', 'rebote,yunque,provocar,fortaleza'] });
      G.state = 'PLAYING'; G.readyTicks = 0;
      var i;
      for (i = 0; i < G.pacs.length; i++) G.pacs[i].safeTicks = 999999;
      /* el rey en el laberinto y un TÓTEM plantado */
      G.jefe = { vivo: true, hp: 7, max: 9, x: 100, y: 100, dir: 0, st: 'caza', stT: 0, inv: 0, frz: 0,
                 azulUsado: 0, huye: 0, huyeDe: -1, golpeado: 0, plan: -1 };
      H.st[0].totem = { c: 13, r: 23, t: 600, cd: 0 };
      for (i = 0; i < 60; i++) { G.netWatch = 0; G.step(); }
      var regRed = R.redAcabar();
      var leida = regRed ? R.leerRed(regRed.s) : null;
      ok(leida, 'se graba y se lee');
      eq((leida.poderes || []).join('|'), 'bola_guiada,totem,gravedad,meteoro|rebote,yunque,provocar,fortaleza',
        'con los poderes de cada uno');
      ok(leida.cuadros.some(function (c) { return c[3]; }), 'y lo de fuera del vector');
      ok(R.verRed(leida), 'arranca');
      for (i = 0; i < 40; i++) G.step();
      eq(H.listaDe(G, 1).map(function (h) { return h.id; }).join(','), 'rebote,yunque,provocar,fortaleza',
        'el Tanque con los suyos');
      ok(J.activo(G), 'el REY FANTASMA está');
      eq(G.jefe.max, 9, 'con su barra de vida');
      ok(H.st[0].totem, 'y el tótem del Mago, plantado');
    } finally {
      R.salir();
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_NET_KEY);
        else localStorage.setItem(CFG.REPLAY_NET_KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  test('una partida online con una PAUSA en medio se ve entera', function () {
    var R = window.PM.Replay;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_NET_KEY); }
    catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      partida(2, 'host');
      var i;
      for (i = 0; i < 60; i++) { G.netWatch = 0; G.step(); }
      /* el anfitrión pausa un buen rato: el reloj de la grabación se para,
       * pero las fotos siguen saliendo, todas con la pausa puesta */
      G.togglePause(); G.hostEvt({ t: 'pause', on: true });
      for (i = 0; i < 40; i++) { G.netWatch = 0; G.step(); }
      G.togglePause(); G.hostEvt({ t: 'pause', on: false });
      for (i = 0; i < 60; i++) { G.netWatch = 0; G.step(); }
      var leida = R.leerRed(R.redAcabar().s);
      ok(leida, 'se graba');
      ok(R.verRed(leida), 'arranca la reproducción');
      /* sin tocar el vigilante de red: es justo lo que la tiraba */
      for (i = 0; i < CFG.NET.DROP_TICKS + 200; i++) G.step();
      ok(!G.paused, 'la pausa grabada no para al que mira');
      ok(!G.netNotice && G.state !== 'MENU', 'ni la da por caída y la manda al menú');
      ok(R.modo === 'verRed' && R.t > 120, 'el reloj pasa de la pausa');
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

  test('DESTACADAS: no caducan, salen aunque el historial ya no las tenga', function () {
    var R = window.PM.Replay, UI = window.PM.UI;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_NUBE_KEY); } catch (e) { previo = null; }
    try {
      var dia = 86400000, ahora = Date.now();
      localStorage.setItem(CFG.REPLAY_NUBE_KEY, JSON.stringify([
        { rn: 'AAAAAAAA', t: ahora - dia, c: ahora - dia, j: 1, p: 500, lv: 2, tipo: 'local', d: false },
        { rn: 'BBBBBBBB', t: ahora - 30 * dia, c: ahora - 30 * dia, j: 1, p: 900, lv: 4, tipo: 'local', d: true, ti: 'LA BUENA' },
        { rn: 'CCCCCCCC', t: ahora - 9 * dia, c: ahora - 9 * dia, j: 1, p: 100, lv: 1, tipo: 'local', d: false }
      ]));
      eq(R.diasQueQuedan(R.indiceNube()[0]), 6, 'a la de ayer le quedan seis días');
      eq(R.indiceNube().length, 2, 'la de hace nueve días sin destacar ya no cuenta');
      eq(R.destacadas().length, 1, 'y hay una destacada');
      UI.histFiltro = 'todas';
      var lista = UI.historialConDestacadas([]);
      eq(lista.length, 1, 'la destacada sale aunque el historial esté vacío');
      eq(lista[0].nubeEntrada.ti, 'LA BUENA', 'con su nombre');
      UI.histFiltro = 'destacadas';
      eq(UI.historialConDestacadas([{ t: ahora - dia, j: 1, p: 500, lv: 2 }]).length, 1,
         'con el filtro, solo las destacadas');
    } finally {
      UI.histFiltro = 'todas';
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_NUBE_KEY);
        else localStorage.setItem(CFG.REPLAY_NUBE_KEY, previo);
      } catch (e) { /* nada */ }
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
      var filas = UI.rankList.querySelectorAll('.rank-row');   // sin la cabecera
      eq(filas.length, 2, 'dos partidas en la lista');
      var btns = filas[0].querySelectorAll('button');
      eq(btns.length, 3, 'la grabada tiene DESTACAR, VER y COMPARTIR');
      eq(filas[1].querySelectorAll('button').length, 0, 'la otra no');
      eq(btns[0].textContent, '☆', 'sin destacar, la estrella vacía');
      eq(btns[1].textContent, 'VER');
      eq(btns[2].textContent, 'COMPARTIR');
      /* El enlace de una partida LOCAL se hace aquí mismo, sin servidor: la
       * repetición cabe entera dentro de la URL. */
      var url = R.enlace(R.porId(reg.id).s);
      ok(url.indexOf('?rep=') !== -1, 'el enlace lleva la partida dentro');
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
  test('la melodía de inicio se corta al pausar, rendirse o salir, y no al empezar', function () {
    var AS = window.AudioSys;
    if (!AS || !AS.stopIntro) { ok(true, 'sin sistema de sonido'); return; }
    var orig = AS.stopIntro, cortes = 0;
    AS.stopIntro = function () { cortes++; };
    try {
      partida(1);
      cortes = 0;          // lanzar la intro corta la anterior, si la había
      G.enterReady(60);
      eq(cortes, 0, 'entrar en ¡LISTO! no la corta (se lanza justo antes)');
      G.setPaused(true);
      eq(cortes, 1, 'la pausa la corta');
      G.setPaused(false);
      G.surrenderNow();
      eq(cortes, 2, 'rendirse la corta');
      G.toMenu();
      eq(cortes, 3, 'salir al menú la corta');
    } finally {
      AS.stopIntro = orig;
    }
  });

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
    G.toMenu();
  });

  /* 18 sep: la puntuación solo subía al llegar al GAME OVER. Quien se salía
   * al menú con su mejor partida la perdía —le pasó a MAULIO con 28.510—:
   * quedaba la repetición y el récord de su perfil, pero la tabla no se
   * enteraba. */
  test('salirse al menú también manda la puntuación al top mundial', function () {
    partida(1);
    try {
      G.score = 12345;
      ok(!G.rankingSent, 'aún no');
      G.toMenu();
      ok(G.rankingSent, 'al salirse, se manda');
    } finally { G.toMenu(); }
  });

  test('GUARDAR Y SALIR no manda nada: la partida sigue viva', function () {
    partida(1);
    try {
      G.score = 9999;
      G.salvada = true;             // lo que pone js/guardado.js
      G.toMenu();
      ok(!G.rankingSent, 'una partida a medias no es una marca');
    } finally { G.salvada = false; G.toMenu(); }
  });

  // ---------------------------------------------------------------
  // Dificultad: la etiqueta sale de los valores
  // ---------------------------------------------------------------
  /* El bug que arreglan estas pruebas: el panel decía NORMAL y la partida
   * empezaba con cinco vidas. `difficultyPreset` era un rótulo GUARDADO que
   * nadie comprobaba contra los números, así que en cuanto los dos se
   * separaban —unos ajustes sin etiqueta, una etiqueta que no existe, un
   * localStorage tocado a mano— el panel mentía y el jugador no tenía forma
   * de sospecharlo. Ahora la etiqueta se deduce. */
  function conAjustes(cambios, fn) {
    var s = window.PM.settings;
    var antes = {};
    for (var k in cambios) if (cambios.hasOwnProperty(k)) antes[k] = s[k];
    for (k in cambios) if (cambios.hasOwnProperty(k)) s[k] = cambios[k];
    try { fn(); }
    finally { for (k in antes) if (antes.hasOwnProperty(k)) s[k] = antes[k]; }
  }

  test('la dificultad se deduce de los valores, no de lo que ponga guardado',
    function () {
      var U = window.PM.UI;
      var P = CFG.PRESETS;
      ['facil', 'normal', 'dificil'].forEach(function (nombre) {
        var p = P[nombre];
        conAjustes({
          ghostSpeedMult: p.ghostSpeedMult, pacSpeedMult: p.pacSpeedMult,
          frightMult: p.frightMult, startLives: p.startLives,
          startLevel: p.startLevel, difficultyPreset: 'lo-que-sea'
        }, function () {
          eq(U.presetActual(), nombre, 'los valores de ' + nombre + ' son ' + nombre);
        });
      });
      // valores de fácil con la etiqueta NORMAL guardada: manda el valor
      conAjustes({
        ghostSpeedMult: P.facil.ghostSpeedMult, pacSpeedMult: P.facil.pacSpeedMult,
        frightMult: P.facil.frightMult, startLives: P.facil.startLives,
        startLevel: P.facil.startLevel, difficultyPreset: 'normal'
      }, function () {
        eq(U.presetActual(), 'facil', 'la etiqueta guardada no puede mentir');
      });
      // y una mezcla que no es ninguna de las tres es PERSONALIZADA
      conAjustes({
        ghostSpeedMult: 1, pacSpeedMult: 1, frightMult: 1,
        startLives: 4, startLevel: 1, difficultyPreset: 'normal'
      }, function () {
        eq(U.presetActual(), 'custom', 'cuatro vidas no son NORMAL');
      });
    });

  /* Lo que veía el jugador: NORMAL en el panel y cuatro vidas dibujadas (que
   * son cinco, porque la que estás usando no se pinta — eso es del arcade y
   * se queda). Ahora el panel dice PERSONALIZADA, que es la verdad. */
  test('con NORMAL de verdad se empieza con tres vidas y se pintan dos',
    function () {
      var U = window.PM.UI;
      var p = CFG.PRESETS.normal;
      conAjustes({
        ghostSpeedMult: p.ghostSpeedMult, pacSpeedMult: p.pacSpeedMult,
        frightMult: p.frightMult, startLives: p.startLives,
        startLevel: p.startLevel, difficultyPreset: 'normal'
      }, function () {
        partida(1);
        eq(G.lives, 3, 'NORMAL son tres vidas');
        eq(Math.max(0, G.lives - 1), 2, 'y se dibujan dos: la de la mano no cuenta');
        eq(U.presetActual(), 'normal');
        G.toMenu();
      });
      // el caso del amigo: cinco vidas guardadas y NORMAL en la etiqueta
      conAjustes({
        ghostSpeedMult: 1, pacSpeedMult: 1, frightMult: 1,
        startLives: 5, startLevel: 1, difficultyPreset: 'normal'
      }, function () {
        partida(1);
        eq(G.lives, 5, 'la partida empieza con lo que digan los valores');
        eq(Math.max(0, G.lives - 1), 4, 'que son las cuatro que se veían');
        eq(U.presetActual(), 'custom', 'y el panel ya no dice NORMAL');
        G.toMenu();
      });
    });

  test('elegir una dificultad deja los cinco valores y su etiqueta cuadrados',
    function () {
      var U = window.PM.UI;
      var s = window.PM.settings;
      var antes = {
        ghostSpeedMult: s.ghostSpeedMult, pacSpeedMult: s.pacSpeedMult,
        frightMult: s.frightMult, startLives: s.startLives,
        startLevel: s.startLevel, difficultyPreset: s.difficultyPreset
      };
      try {
        ['facil', 'normal', 'dificil'].forEach(function (nombre) {
          U.applyPreset(nombre);
          eq(s.difficultyPreset, nombre);
          eq(U.presetActual(), nombre, nombre + ' cuadra con sus valores');
          eq(s.startLives, CFG.PRESETS[nombre].startLives);
        });
      } finally {
        for (var k in antes) if (antes.hasOwnProperty(k)) s[k] = antes[k];
      }
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
      ok(!P.canStart(), 'con dos pero sin su LISTO, tampoco');
      P.st.members[1].l = 1;
      ok(P.canStart(), 'con dos y el LISTO puesto, sí');
      P.st.leader = false;
      ok(!P.canStart(), 'solo el líder empieza');
      P.st.leader = true;
      partida(2);
      ok(!P.canStart(), 'ni en mitad de una partida');
    } finally { P.st = null; P.order = null; G.toMenu(); }
  });

  test('la skin cambiada con la party abierta sale en la partida', function () {
    G.toMenu();
    var P = party(['ANA', 'BENI']);
    var N = window.PM.Net, S = window.PM.settings;
    var antes = S.skin1, enviar = N.send, mandados = [];
    P.st.members[0].s = N.sid;              // la primera fila es la del líder
    N.send = function (n, d) { mandados.push([n, d]); };
    try {
      S.skin1 = 'clasico';
      P.updateSelf();
      S.skin1 = 'sombra';
      P.refreshMe();
      eq(P.gameOrder()[0].k, 'sombra', 'el líder sale con la skin nueva, no con la de entrar');
      ok(mandados.some(function (m) { return m[0] === 'proster'; }), 'y la reparte en el acto');
      P.st.leader = false;
      mandados = [];
      S.skin1 = 'ojos';
      P.refreshMe();
      ok(mandados.some(function (m) { return m[0] === 'phello' && m[1].k === 'ojos'; }),
        'el invitado avisa al líder sin esperar al latido');
    } finally { S.skin1 = antes; N.send = enviar; P.st = null; P.order = null; }
  });

  test('en la party cada uno elige sus poderes y salen en la partida', function () {
    G.toMenu();
    var P = party(['ANA', 'BENI']);
    var N = window.PM.Net, S = window.PM.settings;
    var rolAntes = S.habRol1, cargaAntes = S.habLoadout1, enviar = N.send, mandados = [];
    P.st.members[0].s = N.sid;              // la primera fila es la del líder
    N.send = function (n, d) { mandados.push([n, d]); };
    try {
      S.habRol1 = 'mago'; S.habLoadout1 = 'fuego,portal,runa,tormenta';
      P.updateSelf();
      eq(P.st.members[0].r, 'mago', 'el líder lleva su rol');
      P.setCarga('fuego,portal,runa,meteoro');
      eq(P.gameOrder()[0].h, 'fuego,portal,runa,meteoro', 'el líder sale con los poderes que eligió en la sala');
      P.updateSelf();
      eq(P.st.members[0].h, 'fuego,portal,runa,meteoro', 'y el latido no se los deshace');
      ok(mandados.some(function (m) { return m[0] === 'proster'; }), 'y los reparte en el acto');
      /* el invitado: los suyos viajan en el saludo */
      P.st.leader = false;
      mandados = [];
      P.setCarga('fuego,portal,runa,eclipse');
      ok(mandados.some(function (m) { return m[0] === 'phello' && m[1].h === 'fuego,portal,runa,eclipse'; }),
        'el invitado se los manda al líder en el acto');
      /* y el líder se los apunta */
      P.st.leader = true;
      P.onHello({ v: CFG.NET.PROTO, n: 'BENI', c: '#00ff00', k: 'clasico', g: -1,
                  r: 'soporte', h: 'mina,estela,muro,campo' }, 'sid1');
      eq(P.gameOrder()[1].h, 'mina,estela,muro,campo', 'la partida sale con los poderes del invitado');
    } finally {
      S.habRol1 = rolAntes; S.habLoadout1 = cargaAntes; N.send = enviar; P.st = null; P.order = null;
    }
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

  /* 18 sep: antes, con dos, que se fuera el otro te cortaba la partida.
   * Ahora se queda de espectador y sigues jugando solo. */
  test('en dúo, si se va el otro sigues jugando', function () {
    partida(2, 'host');
    try {
      G.playerGone(1);
      ok(G.pacs[1].out, 'el que se fue queda de espectador');
      eq(G.netNotice, null, 'sin aviso de partida cortada');
      eq(G.state, 'PLAYING', 'y la partida sigue');
      ok(G.anyPlaying(), 'queda alguien');
    } finally { G.netNotice = null; G.toMenu(); }
  });

  /* lo único que no se salva: que se vaya QUIEN SIMULA sin dejar el mando */
  test('si el anfitrión desaparece sin dejar el mando, se acaba', function () {
    partida(2, 'guest');
    try {
      G.guestMsg('bye', { i: 0 }, 'elquefue');
      ok(G.netNotice, 'aviso de partida cortada');
    } finally { G.netNotice = null; G.toMenu(); }
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

  /* ---------- Suavizar lo que llega por la red ---------- */

  test('a un compañero no se le teletransporta: la corrección se desliza',
    function () {
      partida(2, 'guest');
      var ot = 1 - G.localIdx;               // el asiento del compañero
      var otro = G.pacs[ot];
      var x0 = otro.x;
      var s = G.buildSnapshot(false);
      s.ps[ot].x = x0 + 10;                  // giró, y la suposición se pasó
      G.applySnapshot(s);
      eq(otro.x, x0 + 10, 'la partida usa la posición de verdad desde el primer momento');
      eq(Math.round(otro.x + otro.errX), Math.round(x0),
        'pero al ojo se le sigue enseñando donde estaba');
      var antes = Math.abs(otro.errX);
      otro.pasoError();
      ok(Math.abs(otro.errX) < antes, 'y va volviendo a su sitio');
      for (var i = 0; i < 20; i++) otro.pasoError();
      eq(otro.errX, 0, 'en unos fotogramas ya no queda nada que disimular');
      G.netRole = null;
      G.toMenu();
    });

  test('un salto de verdad (túnel, portal, reaparición) no se arrastra',
    function () {
      partida(2, 'guest');
      var ot = 1 - G.localIdx;
      var otro = G.pacs[ot];
      var lejos = otro.x + 5 * CFG.TILE;
      var s = G.buildSnapshot(false);
      s.ps[ot].x = lejos;
      G.applySnapshot(s);
      eq(otro.x, lejos, 'se le pone donde toca');
      eq(otro.errX, 0, 'y de golpe: arrastrarlo por medio laberinto sería peor');
      G.netRole = null;
      G.toMenu();
    });

  test('la corrección no toca al Pac-Man propio, que se simula aquí',
    function () {
      partida(2, 'guest');
      var yo = G.pacs[G.localIdx];
      var x0 = yo.x;
      var s = G.buildSnapshot(false);
      s.ps[G.localIdx].x = x0 + 10;
      G.applySnapshot(s);
      eq(yo.x, x0, 'el anfitrión no recoloca al jugador local');
      eq(yo.errX, 0, 'y no hay nada que disimular');
      G.netRole = null;
      G.toMenu();
    });

  test('el giro de un compañero sale al instante, sin esperar a la foto',
    function () {
      partida(2, 'host');
      var ot = 1 - G.hostIdx;                // el asiento del invitado
      var enviados = [];
      var orig = G.netSend;
      G.netSend = function (n, d) { enviados.push({ n: n, d: d }); };
      try {
        var p = G.pacs[ot];
        G.hostMsg('pos', { i: ot, x: p.x, y: p.y, d: CFG.DIR.UP, nd: CFG.DIR.UP,
                           e: [], g: 1 }, 'sid-de-al-lado');
        eq(enviados.length, 1, 'el giro se reparte en el acto');
        eq(enviados[0].n, 'gir', 'y con su propio mensaje');
        eq(enviados[0].d.i, ot, 'diciendo de quién es');
        enviados.length = 0;
        G.hostMsg('pos', { i: ot, x: p.x, y: p.y, d: CFG.DIR.UP, nd: CFG.DIR.UP,
                           e: [] }, 'sid-de-al-lado');
        eq(enviados.length, 0, 'las doce posiciones de cada segundo no se repiten');
      } finally {
        G.netSend = orig;
        G.netRole = null;
        G.toMenu();
      }
    });

  test('un giro que llega antes que su foto ya coloca al compañero',
    function () {
      partida(2, 'guest');
      var ot = 1 - G.localIdx;
      var otro = G.pacs[ot];
      var x0 = otro.x;
      G.aplicaGiro({ i: ot, x: x0 + 6, y: otro.y, d: CFG.DIR.UP, nd: CFG.DIR.UP });
      eq(otro.x, x0 + 6, 'la posición entra');
      eq(otro.dir, CFG.DIR.UP, 'y el rumbo nuevo, que es lo que rompía la suposición');
      ok(otro.errX !== 0, 'también sin saltar');
      G.aplicaGiro({ i: G.localIdx, x: 0, y: 0, d: CFG.DIR.UP, nd: CFG.DIR.UP });
      ok(G.pacs[G.localIdx].x !== 0, 'el giro propio no se acepta de vuelta');
      G.netRole = null;
      G.toMenu();
    });

  test('una foto que llega tarde se tira; la que llega a tiempo, no',
    function () {
      var N = window.PM.Net;
      var sid = 'sid-de-prueba';
      var antes = N.ultimoQ[sid];
      try {
        delete N.ultimoQ[sid];
        ok(N.aTiempo({ s: sid, q: 5 }), 'la primera pasa');
        ok(!N.aTiempo({ s: sid, q: 4 }), 'una anterior se tira: sería un salto atrás');
        ok(!N.aTiempo({ s: sid, q: 5 }), 'y la repetida también');
        ok(N.aTiempo({ s: sid, q: 6 }), 'la siguiente pasa');
        ok(N.aTiempo({ s: sid }), 'lo que no va numerado (muertes, niveles) pasa siempre');
      } finally {
        if (antes === undefined) delete N.ultimoQ[sid];
        else N.ultimoQ[sid] = antes;
      }
    });

  test('el enlace directo no se enciende solo si no hay con quién',
    function () {
      var D = window.PM.Directo;
      ok(!!D, 'el módulo está');
      eq(D.cuenta(), 0, 'sin enlaces montados no hay ninguno directo');
      eq(D.manda('snap', { s: 'x' }), null, 'y no se manda nada por ahí');
      eq(D.todosDirectos(), false, 'así que el canal de siempre sigue haciendo el trabajo');
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
      G.restartGame();                // empezar otra sin pasar por el menú
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

  test('el GAME OVER de recreativa sale ya, aunque haya celebraciones', function () {
    partida(1);
    try {
      G.achNotice = { name: 'X', desc: 'X', color: '#fff', ticks: 3, total: 3 };
      G.state = 'GAME_OVER';
      G.phaseTicks = 0;
      G.overIdle = false;
      G.enterGameOverIdle();
      ok(!G.overWait, 'no se vuelve al laberinto a esperar');
      ok(window.PM.UI.promptOpen, 'el panel con el resumen sale en el acto');
      ok(window.PM.UI.els.prompt.classList.contains('arcade'), 'y es el de recreativa');
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
    eq(e.total, CFG.BADGE_TAG_TICKS, 'guarda su duración para poder animarla');

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
    ok(abierta > subiendo * 2, 'después el emblema se arma entero');
    ok(yendose < abierta, 'y al final se encoge hacia el jugador');
    ok(pinta(1) === 0, 'al terminar no queda nada');
  });

  /* F1..F4 enseñan la maestría de cada formato, y la chapa dice cuál es: el
   * nombre solo (EXPERTO) no distingue la de solo de la de escuadra. */
  test('F1..F4 enseñan la maestría de cada formato con su pestaña', function () {
    partida(2);
    G.emoteCooldown = 0;
    G.sendBadgeTag();
    eq(G.emotes[0].formato, 'DÚO', 'Ctrl+Espacio: la del formato en curso');
    // la de SOLO es la maestría de siempre: sin pestaña
    var nombres = [null, 'DÚO', 'TRÍO', 'ESCUADRA'];
    for (var n = 1; n <= 4; n++) {
      G.emoteCooldown = 0;
      // en Node no hay KeyboardEvent: ahí se prueba la acción sin la tecla
      if (typeof KeyboardEvent === 'function') {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F' + n }));
      } else {
        G.sendBadgeTag(n);
      }
      ok(G.emotes[0] && G.emotes[0].tag, 'F' + n + ' saca la chapa');
      eq(G.emotes[0].formato, nombres[n - 1], 'F' + n + ' dice su formato');
    }
    // lo que llega por red sin formato (versión vieja) sale sin pestaña
    G.showBadgeTag(0, '', undefined);
    eq(G.emotes[0].formato, null, 'sin formato, sin pestaña');
    G.showBadgeTag(0, '', 9);
    eq(G.emotes[0].formato, null, 'un formato que no existe se descarta');

    if (window.__SIN_LIENZO) return;
    var cv = document.createElement('canvas');
    cv.width = 224; cv.height = 44;
    var ctx = cv.getContext('2d');
    function pinta(f) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      window.PM.Sprites.drawBadgeTag(ctx, 112, 34, 'EXPERTO', '#00ff00', 0.5, 20, 2, f);
      var d = ctx.getImageData(0, 0, cv.width, 20).data, k = 0;
      for (var i = 3; i < d.length; i += 4) if (d[i] > 0) k++;
      return k;
    }
    // sobre la cabeza va SOLO el emblema: el formato no añade ningún rótulo
    eq(pinta('ESCUADRA'), pinta(null), 'sin pestaña ni texto encima');
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
       'CAZADOR ya luce más que APRENDIZ');

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
  /* El orden en que se ganan las de nivel es el que eligió Braighton en la
   * vitrina (13 de septiembre): la escalera rebajada 1, 2, 4... 34, con
   * MOÑITO pronto, PRISMA a media escalera y FUEGO la última. La lista va en
   * ese orden a propósito: es el que pinta la vitrina de SKINS. */
  function skinsDeNivel() {
    return CFG.SKINS.filter(function (sk) { return sk.grupo === 'nivel'; });
  }

  test('las skins de nivel suben de nivel en su orden y FUEGO es la última', function () {
    var niv = skinsDeNivel();
    eq(niv[0].id, 'clasico', 'la primera es la clásica');
    eq(niv[0].level, 1, 'y está desde el nivel 1');
    eq(niv[niv.length - 1].id, 'fuego', 'la última es FUEGO');
    eq(niv.map(function (sk) { return sk.level; }).join(','),
       '1,2,4,6,8,10,12,15,18,22,26,30,34', 'la escalera rebajada');
    for (var i = 1; i < niv.length; i++) {
      ok(niv[i].level > niv[i - 1].level,
         niv[i].name + ' pide más nivel que ' + niv[i - 1].name);
    }
    // y todas las de nivel van antes que las demás en la lista
    var primeraNoNivel = -1;
    for (var j = 0; j < CFG.SKINS.length; j++) {
      if (CFG.SKINS[j].grupo !== 'nivel') { primeraNoNivel = j; break; }
    }
    eq(primeraNoNivel, niv.length, 'las de nivel, primero');
  });

  test('las skins de nivel se abren con el nivel de jugador', function () {
    var L = window.PM.Level;
    var previo = L.xp();
    try {
      L.reset();
      eq(L.level(), 1, 'de recién llegado');
      ok(L.skinUnlocked('clasico'), 'la clásica está desde el principio');
      ok(!L.skinUnlocked('sombra'), 'la segunda no');
      var abiertasNivel = L.skinsAllowed('clasico').filter(function (id) {
        return window.PM.Skins.grupo(id) === 'nivel';
      });
      eq(abiertasNivel.length, 1, 'al nivel 1 solo hay una de nivel');
      // la que ya llevas puesta no se pierde aunque pida más nivel
      ok(L.skinsAllowed('sombra').indexOf('sombra') !== -1,
         'la que ya llevas puesta sigue valiendo');
      // con nivel de sobra se abren todas las de nivel
      var niv = skinsDeNivel();
      var tope = niv[niv.length - 1].level;
      var falta = 0;
      for (var n = 1; n < tope; n++) falta += L.cost(n);
      L.add(falta);
      eq(L.level(), tope, 'con esa experiencia se llega justo al nivel ' + tope);
      for (var i = 0; i < niv.length; i++) ok(L.skinUnlocked(niv[i].id), niv[i].name + ' abierta');
    } finally {
      L.reset();
      if (previo > 0) L.add(previo);
    }
  });

  test('el catálogo de skins cuadra con su dibujo', function () {
    var S = window.PM.Sprites, Sk = window.PM.Skins;
    var legado = ['clasico', 'sombra', 'ojos', 'neon', 'pixel', 'aro'];
    eq(CFG.SKIN_IDS.length, CFG.SKINS.length, 'SKIN_IDS sale de la lista');
    CFG.SKINS.forEach(function (sk) {
      ok(['nivel', 'logro', 'temporada', 'tienda', 'cofre', 'pase'].indexOf(sk.grupo) !== -1, sk.id + ': grupo conocido');
      if (legado.indexOf(sk.id) === -1) ok(S.ARTE.hasOwnProperty(sk.id), sk.id + ': tiene dibujo');
      if (sk.grupo === 'tienda') ok(sk.precio > 0 && !sk.pide, sk.id + ': se compra, no se gana');
      /* las de cofre no se compran ni se piden: salen de un cofre */
      else if (sk.grupo === 'cofre') ok(!sk.precio && !sk.pide, sk.id + ': ni precio ni requisito');
      /* las del pase tampoco: las reparte el camino de SU temporada, y esa
       * temporada tiene que estar apuntada o el vestuario no sabrá decir de
       * qué mes era cuando ya no se pueda conseguir */
      else if (sk.grupo === 'pase') {
        ok(!sk.precio && !sk.pide, sk.id + ': ni precio ni requisito');
        ok(/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(sk.temporada || ''), sk.id + ': dice de qué temporada es');
      }
      else if (sk.grupo !== 'nivel') ok(!!sk.pide, sk.id + ': dice qué pide');
      if (sk.pide && sk.pide.stat) {
        ok(window.PM.Achievements.STATS.hasOwnProperty(sk.pide.stat),
           sk.id + ': su contador (' + sk.pide.stat + ') existe');
      }
      ok(!!sk.ve, sk.id + ': tiene texto para la vitrina');
      ok(typeof Sk.estado(sk.id).abierta === 'boolean', sk.id + ': tiene estado');
    });
  });

  /* Todas se dibujan sin romper, en las cuatro direcciones y las tres bocas,
   * con estela, con la Q y como icono. En node no se rasteriza nada, pero
   * así se pilla cualquier variable que no exista. */
  test('todas las skins se dibujan en cualquier postura', function () {
    var S = window.PM.Sprites;
    var cv = document.createElement('canvas');
    cv.width = 72; cv.height = 72;
    var ctx = cv.getContext('2d');
    ctx.setTransform(3, 0, 0, 3, 0, 0);
    CFG.SKINS.forEach(function (sk) {
      for (var d = 0; d < 4; d++) {
        for (var m = 0; m < 3; m++) {
          S.drawPacman(ctx, 12, 12, d, m, '#ff69b4', sk.id, {
            t: 1.23 + d + m, estira: 1.8, team: ['#ff0000', '#00ffff'],
            back: function (dist) { return { x: 12 - dist, y: 12, d: 3 }; },
            muerde: m >= 1, mordio: m === 2
          });
        }
      }
      S.drawPacman(ctx, 12, 12, 3, 2, '#fff', sk.id, { icono: true });
      S.drawPacman(ctx, 12, 12, 3, 1, '#00ff00', sk.id);
      // y su muerte, de principio a fin
      for (var k = 0; k <= 10; k++) S.drawSkinDeath(ctx, 12, 12, k / 10, '#ffff00', sk.id, 1);
    });
    ok(true, 'ninguna rompe');
  });

  /* Con una skin puesta se muere ESA skin: la boca que se abre hasta
   * desaparecer es la animación del clásico y se queda solo para él. */
  test('al morir con skin se anima la skin y no el Pac-Man clásico', function () {
    var S = window.PM.Sprites;
    var viejo = S.drawPacmanDeath, nuevo = S.drawSkinDeath;
    var llamadas = [];
    S.drawPacmanDeath = function () { llamadas.push('clasico'); };
    S.drawSkinDeath = function (c, x, y, t, col, skin) { llamadas.push(skin); };
    var s = window.PM.settings, skin0 = s.skin1;
    try {
      partida(1);
      G.pacs[0].dying = true;
      G.pacs[0].deathPhase = 1;
      G.pacs[0].deathTicks = 40;
      s.skin1 = 'calavera';
      G.render();
      s.skin1 = 'clasico';
      G.render();
      ok(llamadas.indexOf('calavera') !== -1, 'con CALAVERA muere la calavera');
      ok(llamadas.indexOf('clasico') !== -1, 'con la clásica, la animación de siempre');
    } finally {
      S.drawPacmanDeath = viejo;
      S.drawSkinDeath = nuevo;
      s.skin1 = skin0;
    }
  });

  test('las extravagantes y DORADO suenan a lo suyo al comer', function () {
    var AS = window.AudioSys;
    ['calavera', 'robot', 'dorado', 'cofre', 'tiburon', 'dragon', 'planta', 'trex',
     'hamburguesa', 'ovni', 'gato', 'vampiro'].forEach(function (id) {
      ok(AS.tieneWaka(id), id + ' tiene waka propio');
    });
    ok(!AS.tieneWaka('clasico') && !AS.tieneWaka('neon'), 'las de siempre suenan como siempre');
    var oidas = [];
    var w0 = AS.playWaka;
    AS.playWaka = function (skin) { oidas.push(skin); };
    var s = window.PM.settings, skin0 = s.skin1;
    try {
      partida(1);
      s.skin1 = 'robot';
      var p = G.pacs[0];
      var hecho = false;
      for (var r = 0; r < CFG.ROWS && !hecho; r++) {
        for (var c = 0; c < CFG.COLS && !hecho; c++) {
          if (G.pellets[r][c] === '.') { G.eatAt(c, r, p); hecho = true; }
        }
      }
      eq(oidas[0], 'robot', 'al comer, suena el waka de la skin puesta');
    } finally {
      AS.playWaka = w0;
      s.skin1 = skin0;
    }
  });

  test('CALAVERA pide muertes, y las de antes se estiman con las partidas', function () {
    conLogrosLimpios(function (A) {
      var Sk = window.PM.Skins;
      A.record('partidas', 99);
      A.sembrarMuertes();
      eq(A.stats().muertes, 247, '99 partidas a 2,5 (a la baja)');
      ok(!Sk.estado('calavera').abierta, 'aún no llega a 250');
      A.sembrarMuertes();
      eq(A.stats().muertes, 247, 'la siembra es de una vez');
      A.record('muertes', 3);
      ok(Sk.estado('calavera').abierta, 'con tres muertes más, abierta');
      // al entrar en una cuenta con más partidas se vuelve a mirar
      A.merge({ partidas: 200 });
      eq(A.stats().muertes, 500, 'la nube trae más partidas: se estima con ellas');
    });
  });

  test('las skins de logro miran su contador y dicen cuánto falta', function () {
    conLogrosLimpios(function (A) {
      var Sk = window.PM.Skins;
      A.record('fantasmas', 120);
      var e = Sk.estado('tiburon');
      ok(!e.abierta, 'con 120 fantasmas el tiburón no');
      eq(e.progreso, '120 / 300 FANTASMAS COMIDOS', 'y dice cuánto lleva');
      ok(Math.abs(e.pct - 0.4) < 1e-9, 'al 40 %');
      A.record('fantasmas', 180);
      ok(Sk.estado('tiburon').abierta, 'con 300, abierto');
      ok(Sk.abierta('robot', 'robot'), 'la que llevas puesta no se cierra');
    });
  });

  test('las skins de temporada se ganan jugando en su fecha y se quedan', function () {
    conLogrosLimpios(function (A) {
      var Sk = window.PM.Skins;
      ok(Sk.enTemporada('halloween', new Date(2026, 9, 24)), '24 de octubre, sí');
      ok(Sk.enTemporada('halloween', new Date(2026, 9, 31)), '31 de octubre, sí');
      ok(!Sk.enTemporada('halloween', new Date(2026, 10, 1)), '1 de noviembre, no');
      ok(Sk.enTemporada('navidad', new Date(2026, 11, 25)), 'Navidad cruza el año...');
      ok(Sk.enTemporada('navidad', new Date(2027, 0, 6)), '...hasta el 6 de enero');
      ok(!Sk.enTemporada('navidad', new Date(2027, 0, 7)), 'el 7, ya no');
      Sk.anotarTemporada(new Date(2026, 6, 1));
      ok(!Sk.estado('calabaza').abierta, 'en julio no se gana nada');
      Sk.anotarTemporada(new Date(2026, 9, 28));
      ok(Sk.estado('calabaza').abierta && Sk.estado('brujas').abierta &&
         Sk.estado('vampiro').abierta, 'en Halloween, las tres de Halloween');
      ok(!Sk.estado('gorro').abierta, 'y CLAUS-MAN sigue esperando a diciembre');
    });
  });

  test('DORADO se abre al verse en el top 10 individual', function () {
    conLogrosLimpios(function (A) {
      var Sk = window.PM.Skins, s = window.PM.settings;
      var nick0 = s.nick1;
      try {
        s.nick1 = 'PRUEBAORO';
        var filas = [];
        for (var i = 0; i < 12; i++) filas.push({ nombre1: 'OTRO' + i });
        filas[11].nombre1 = 'pruebaoro';
        ok(!Sk.anotarTop10(filas), 'el 12.º no cuenta');
        ok(!Sk.estado('dorado').abierta);
        filas[9].nombre1 = 'PruebaOro';
        ok(Sk.anotarTop10(filas), 'el 10.º sí (sin mirar mayúsculas)');
        ok(Sk.estado('dorado').abierta, 'DORADO abierta');
      } finally { s.nick1 = nick0; }
    });
  });

  test('una skin que se abre jugando se anuncia una sola vez', function () {
    conLogrosLimpios(function (A) {
      var Sk = window.PM.Skins;
      Sk.syncVistas();
      eq(Sk.reclamar().length, 0, 'lo que ya estaba abierto no se anuncia');
      A.record('frutas', 120);
      var nuevas = Sk.reclamar();
      ok(nuevas.some(function (sk) { return sk.id === 'cereza'; }), 'CEREZA, nueva');
      eq(Sk.reclamar().length, 0, 'y no se repite');
    });
  });

  test('la estela sigue el camino de Pac-Man y se tira en los saltos', function () {
    var P = window.PM.Pacman;
    var p = new P(0);
    p.x = 100; p.y = 100; p.dir = CFG.DIR.RIGHT;
    p.huella = [];
    p.anotarHuella();
    p.x = 110; p.anotarHuella();                 // 10 a la derecha
    p.dir = CFG.DIR.DOWN; p.y = 108; p.anotarHuella();   // y 8 hacia abajo
    var a = p.atras(4);
    ok(a.x === 110 && Math.abs(a.y - 104) < 1e-9, 'a 4 px, sobre el tramo vertical');
    var b = p.atras(13);
    ok(Math.abs(b.x - 105) < 1e-9 && b.y === 100, 'a 13 px ya dobló la esquina');
    var c = p.atras(30);
    ok(c.x === 100 && c.y === 100, 'más allá de lo recordado, se queda en lo más viejo');
    p.x = 300; p.anotarHuella();                 // el túnel o un FLASH
    eq(p.huella.length, 1, 'un salto tira la huella');
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

  /* ---------- logros por modo ---------- */
  test('cada logro por modo tiene su contador y su etiqueta', function () {
    var A = window.PM.Achievements;
    var vistos = {};
    CFG.ACHIEVEMENTS.forEach(function (a) {
      ok(!vistos[a.id], 'el id ' + a.id + ' no está repetido');
      vistos[a.id] = 1;
      ok(!!a.name && !!a.desc, a.id + ' tiene nombre y descripción');
      ok(a.goal > 0, a.id + ' tiene meta');
      if (!a.modo) return;
      ok(!!CFG.ACH_MODOS[a.modo], a.id + ' apunta a un modo que existe: ' + a.modo);
      var c = A.claveLogro(a);
      eq(c, a.modo + ':' + a.stat, a.id + ' mira su contador de modo');
      ok(A.STATS.hasOwnProperty(c), 'y ese contador se guarda de verdad');
    });
    /* Hay logros de los cinco modos y del DAILY. El DAILY no es un modo de
     * juego —sus retos se cumplen jugando a lo que sea— pero sus tres logros
     * usan la misma etiqueta para tener su propio grupo y su color. */
    var modos = {};
    CFG.ACHIEVEMENTS.forEach(function (a) { if (a.modo) modos[a.modo] = 1; });
    ['clasico', 'party', 'daily', 'lab', 'vs', 'hab'].forEach(function (m) {
      ok(modos[m], 'hay logros del modo ' + m);
    });
  });

  test('el contador de un modo no lo llena otro modo', function () {
    conLogrosLimpios(function (A) {
      // jugando SOLO al clásico: sube el global y el del clásico, y nada más
      partida(1);
      G.bumpAch({ fantasmas: 60, partidas: 1 });
      eq(A.stats().fantasmas, 60, 'el contador global sube');
      eq(A.stats()['party:fantasmas'] || 0, 0, 'el de party sigue a cero');
      eq(A.stats()['clasico:partidas'], 1, 'la partida cuenta en clásico');
      eq(A.stats()['party:partidas'] || 0, 0, 'y no en party');
      ok(A.has('caza50'), 'el logro suelto de 50 fantasmas cae');
      ok(!A.has('pt_batida'), 'pero el de party no, que no se ha jugado');
      /* Qué contadores existen lo deciden sus consumidores: los LOGROS y,
       * desde la pantalla de CIFRAS, las cuatro cifras que enseña por modo
       * (partidas, mejor marca, fantasmas y tiempo). `clasico:fantasmas` no
       * lo mira ningún logro y aun así se guarda, porque la tabla lo enseña.
       * Lo que sigue sin existir es lo que no mira nadie. */
      eq(A.stats()['clasico:fantasmas'], 60,
         'el contador por modo de las CIFRAS se llena con lo suyo');
      eq(A.stats()['hab:fantasmas'] || 0, 0,
         'y el de otro modo se queda a cero');
      eq(A.STATS.hasOwnProperty('clasico:frutas'), false,
         'y lo que no mira ni un logro ni la pantalla, no se guarda');
      G.toMenu();
    });
  });

  /* Lo jugado ANTES de que existieran los logros por modo no se puede tirar:
   * es del jugador. Se reparte con lo único que se puede demostrar. */
  test('lo jugado de antes cuenta en los logros por modo', function () {
    conLogrosLimpios(function (A) {
      var r = [G.highScore2, G.highScore3, G.highScore4];
      try {
        // historial de antes: solo contadores globales, sin rastro del modo
        G.highScore2 = 0; G.highScore3 = 0; G.highScore4 = 0;
        A.record('partidas', 100);
        A.record('nivelMax', 9);
        A.sembrarModos();
        eq(A.stats()['clasico:partidas'], 100, 'las 100 partidas cuentan en clásico');
        ok(A.has('cl_purista'), 'así que PURISTA ya está');
        ok(A.has('cl_maraton'), 'y MARATÓN, que llegó al nivel 9');
        eq(A.stats()['party:partidas'] || 0, 0,
           'pero en party no: no hay prueba de haber jugado acompañado');
        ok(!A.has('pt_companero'), 'y su logro sigue sin caer');
        eq(A.stats()['hab:mordiscos'] || 0, 0, 'de poderes no se inventa nada');

        // y no se siembra dos veces: si no, cada partida de party seguiría
        // engordando el contador de clásico para siempre
        A.record('partidas', 10);
        A.sembrarModos();
        eq(A.stats()['clasico:partidas'], 100, 'la siembra es de una sola vez');
      } finally {
        G.highScore2 = r[0]; G.highScore3 = r[1]; G.highScore4 = r[2];
      }
    });
  });

  test('con récord de dúo, lo de antes también cuenta en party', function () {
    conLogrosLimpios(function (A) {
      var r = G.highScore2;
      try {
        G.highScore2 = 12000;          // la prueba: se jugó acompañado
        A.record('fantasmas', 150);
        A.sembrarModos();
        eq(A.stats()['party:fantasmas'], 150, 'los fantasmas cuentan en party');
        ok(A.has('pt_batida'), 'y BATIDA cae');
      } finally { G.highScore2 = r; }
    });
  });

  test('entrar en la cuenta vuelve a sembrar con el historial de la nube', function () {
    conLogrosLimpios(function (A) {
      A.sembrarModos();                        // se siembra en vacío
      eq(A.stats()['clasico:partidas'] || 0, 0, 'aquí no había nada');
      // ahora baja de la nube un historial largo
      A.merge({ partidas: 80, fantasmas: 400 });
      eq(A.stats()['clasico:partidas'], 80,
         'lo de la nube también cuenta en su modo');
      ok(A.has('cl_purista'), 'y el logro del clásico cae');
    });
  });

  /* merge() vuelve a sembrar en cada entrada a la cuenta. Antes CLÁSICO se
   * llevaba otra vez todo lo global, también lo jugado después en DESATADO,
   * y nunca bajaba de la cuenta total. */
  test('volver a sembrar no le da a CLÁSICO lo jugado en otro mundo', function () {
    conLogrosLimpios(function (A) {
      A.merge({ partidas: 100, puntosMax: 30000 });
      eq(A.stats()['clasico:partidas'], 100, 'lo de antes, a clásico');
      A.recordFor(['solo', 'hab'], { partidas: 5, puntosMax: 90000 });
      A.merge({});
      A.merge({ partidas: 1 });
      eq(A.stats()['clasico:partidas'], 100, 'las cinco de DESATADO no pasan a clásico');
      eq(A.stats()['hab:partidas'], 5, 'se quedan en DESATADO');
      eq(A.stats()['clasico:puntosMax'], 30000,
         'y la marca de DESATADO tampoco es de clásico');
    });
  });

  /* Tras limpiar a mano una cuenta en la nube, lo de aquí no puede volver a
   * subir lo que se quitó. */
  test('una purga en la nube manda sobre lo de aquí', function () {
    var Ac = window.PM.Account;
    var u0 = Ac.user, t0 = Ac.token;
    var r1 = G.highScore1, rl = G.recordModo('lab', 1);
    var nombre0 = window.PM.settings.nick1;
    conLogrosLimpios(function (A) {
      try {
        Ac.token = null;
        Ac.user = { id: 'id', usuario: '', avatar: 'pac' };
        G.highScore1 = 99000;
        G.setRecordModo('lab', 20000, 1);
        A.record('fantasmas', 300);
        Ac.applyRemote({ usuario: 'PEPE', record1: 190, record_lab: 0,
                         logros: { fantasmas: 120, purga: 1 } });
        eq(G.recordFor(1), 190, 'el récord falso se va');
        eq(G.recordModo('lab', 1), 0, 'también el de laberintos');
        eq(A.stats().fantasmas, 120, 'y los contadores son los de la nube');
        eq(A.stats().purga, 1, 'y la purga queda apuntada');
        G.highScore1 = 5000;
        Ac.applyRemote({ usuario: 'PEPE', record1: 190, logros: { fantasmas: 120, purga: 1 } });
        eq(G.recordFor(1), 5000, 'la misma purga no vuelve a pisar lo jugado después');
      } finally {
        Ac.user = u0; Ac.token = t0;
        window.PM.settings.nick1 = nombre0;
        G.highScore1 = r1; G.setRecordModo('lab', rl, 1);
        G.saveHighScores();
      }
    });
  });

  /* Si no, el siguiente que entra en SU cuenta desde este navegador se lleva
   * el progreso del anterior. */
  test('cerrar sesión deja el navegador limpio', function () {
    var Ac = window.PM.Account, L = window.PM.Level;
    var u0 = Ac.user, t0 = Ac.token;
    var r2 = G.highScore2, rh = G.recordModo('hab', 1), xp0 = L.xp();
    var s0 = { nick1: window.PM.settings.nick1, avatar: window.PM.settings.avatar };
    var guardadas = {};
    [CFG.BADGES_KEY, CFG.SAVE_KEY, CFG.FRIENDS_KEY, 'pacman-topmundial-skins-vistas'].forEach(function (k) {
      try { guardadas[k] = localStorage.getItem(k); } catch (e) { /* nada */ }
    });
    conLogrosLimpios(function (A) {
      try {
        Ac.token = null;
        Ac.user = { id: 'id', usuario: 'OTRO', avatar: 'pac' };
        G.highScore2 = 76290;
        G.setRecordModo('hab', 180550, 1);
        L.add(5000);
        A.record('partidas', 50);
        Ac.signOut();
        eq(G.recordFor(2), 0, 'el récord de dúo del anterior no se queda');
        eq(G.recordModo('hab', 1), 0, 'ni el de DESATADO');
        eq(L.xp(), 0, 'ni su experiencia');
        eq(A.stats().partidas || 0, 0, 'ni sus contadores');
        eq(window.PM.settings.nick1, '', 'ni su nombre');
      } finally {
        Ac.user = u0; Ac.token = t0;
        window.PM.settings.nick1 = s0.nick1;
        window.PM.settings.avatar = s0.avatar;
        G.highScore2 = r2; G.setRecordModo('hab', rh, 1);
        G.saveHighScores();
        L.reset(); L.add(xp0);
        for (var k in guardadas) {
          try { if (guardadas[k] !== null) localStorage.setItem(k, guardadas[k]); } catch (e) { /* nada */ }
        }
      }
    });
  });

  test('una partida cuenta a la vez para su formato y para su modo', function () {
    conLogrosLimpios(function (A) {
      window.PM.settings.muted = true;
      // party (2 jugadores) Y habilidades: las dos etiquetas
      G.newGame({ players: 2, hab: true });
      G.state = 'PLAYING'; G.readyTicks = 0;
      var tags = G.achTags();
      ok(tags.indexOf('party') !== -1, 'es una party');
      ok(tags.indexOf('hab') !== -1, 'y es de poderes');
      ok(tags.indexOf('clasico') === -1, 'y NO es el clásico');
      G.bumpAch({ fantasmas: 5 });
      eq(A.stats()['party:fantasmas'], 5, 'cuenta en party');
      eq(A.stats()['clasico:fantasmas'] || 0, 0, 'y no en clásico');
      G.toMenu();
    });
  });

  test('cada modo pone su propia etiqueta', function () {
    window.PM.settings.muted = true;
    function tagsDe(opts) {
      G.newGame(opts);
      var t = G.achTags();
      G.toMenu();
      return t;
    }
    ok(tagsDe({ players: 1 }).indexOf('clasico') !== -1, 'una normal es clásica');
    ok(tagsDe({ players: 1 }).indexOf('solo') !== -1, 'y en solitario');
    ok(tagsDe({ players: 1, hab: true }).indexOf('hab') !== -1, 'habilidades');
    var mz = window.PM.Mazes && window.PM.Mazes.LIST[0];
    if (mz) {
      ok(tagsDe({ players: 1, maze: mz.id }).indexOf('lab') !== -1, 'laberinto');
    }
    ok(tagsDe({ players: 2, ghosts: [-1, 0] }).indexOf('vs') !== -1, 'PAC-MAN VS.');
  });

  test('los mordiscos y los muros atravesados alimentan sus logros', function () {
    conLogrosLimpios(function (A) {
      // el atajo HB se declara más abajo, en la sección del modo
      var Hb = window.PM.Hab;
      partidaHab(13, 20, CFG.DIR.LEFT);
      fantasmaEn(1, 14, 20);
      Hb.pulsar(G, 0, Hb.MORDISCO);
      eq(A.stats()['hab:mordiscos'], 1, 'el mordisco se apunta en habilidades');
      eq(A.stats().mordiscos, 1, 'y en el contador global');

      // un flash que atraviesa pared suma muros; uno por pasillo abierto no
      G.eatFreezeTicks = 0;
      Hb.estado(0).cd[Hb.FLASH] = 0;
      var p = G.pacs[0], col = null;
      for (var c = 1; c < CFG.COLS - 4; c++) {
        if (CFG.isOpen(c,20,false) && !CFG.isOpen(c+1,20,false) &&
            CFG.isOpen(c+3,20,false)) { col = c; break; }
      }
      p.x = col*CFG.TILE + CFG.TILE/2; p.y = 20*CFG.TILE + CFG.TILE/2;
      p.dir = CFG.DIR.RIGHT; p.nextDir = CFG.DIR.RIGHT;
      Hb.pulsar(G, 0, Hb.FLASH);
      ok(A.stats()['hab:muros'] > 0, 'atravesar pared suma muros');
      G.toMenu();
    });
  });

  test('las cazas de PAC-MAN VS. se apuntan al cerrar la partida', function () {
    conLogrosLimpios(function (A) {
      window.PM.settings.muted = true;
      G.newGame({ players: 2, ghosts: [-1, 0] });
      G.state = 'PLAYING'; G.readyTicks = 0;
      // dos cazas del jugador 2, que es quien lleva el fantasma
      G.addVsScore(1, CFG.VS.CATCH_POINTS * 2);
      eq(G.myCatches(), 2, 'en local se cuentan las del que caza');
      G.score = 500;
      G.closeRun();
      eq(A.stats()['vs:cazas'], 2, 'y quedan apuntadas en el modo VS.');
      eq(A.stats()['clasico:cazas'] || 0, 0, 'no en el clásico');
      G.toMenu();
    });
  });

  test('el invitado se apunta los fantasmas que se come él', function () {
    conLogrosLimpios(function (A) {
      partida(2, 'guest');
      G.localIdx = 1;
      // el anfitrión confirma que el fantasma se lo comió el jugador 1
      G.applyEvt({ t: 'eatGhost', g: 0, pts: 200, x: 100, y: 100, w: 1, c: 0 });
      eq(A.stats().fantasmas, 1, 'el invitado cuenta su fantasma');
      eq(A.stats()['party:fantasmas'], 1, 'y le cuenta para los de party');
      // el de otro jugador no es suyo
      G.applyEvt({ t: 'eatGhost', g: 1, pts: 200, x: 100, y: 100, w: 0, c: 0 });
      eq(A.stats().fantasmas, 1, 'el del compañero no se lo apunta');
      G.toMenu();
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

  /* El perfil pide cuenta (es la cuenta), así que para mirarlo por dentro
   * hay que fingir una sesión. */
  function conSesion(fn) {
    var Ac = window.PM.Account;
    var u = Ac.user, tk = Ac.token;
    Ac.user = u || { id: 'test', usuario: 'TEST' };
    Ac.token = tk || 'test';
    try { fn(); } finally { Ac.user = u; Ac.token = tk; }
  }

  test('el panel PERFIL se monta y se refresca en sus dos pestañas', function () {
    var UI = window.PM.UI;
    conSesion(function () {
    UI.showProfile();
    ok(UI.els.profile, 'existe el panel');
    ok(UI.profLookCv, 'enseña tu personaje (los avatares están en el vestuario)');
    eq(UI.vestItems('avatar', 'yo').length, CFG.AVATARS.length, 'donde están todos');
    ok(UI.profName.textContent.length > 0, 'enseña un nombre');
    UI.showProfileTab('logros');
    eq(UI.achList.children.length, CFG.ACHIEVEMENTS.length,
       'la pestaña de logros los lista todos');
    UI.showProfileTab('perfil');
    });
    UI.showMenu();
  });

  /* El panel enseñaba una lista con un botón VER por fila y un lienzo suelto
   * encima. Ahora la fila entera es el botón y la elegida se ve al lado. */
  test('TROFEOS: se elige pulsando la fila y empieza por el que tienes',
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
        eq(UI.badgePick, 'cazador', 'de entrada, tu trofeo');
        eq(UI.badgeStageName.textContent, 'PLATA', 'y se ve en grande');
        ok(UI.badgeRows.cazador.classList.contains('sel'), 'marcada en la lista');
        ok(UI.badgeStageState.textContent.indexOf('TU TROFEO') === 0,
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

  test('de invitado no hay amigos ni perfil: el perfil pide cuenta', function () {
    var UI = window.PM.UI;
    var Ac = window.PM.Account;
    ok(!Ac.logged(), 'sin sesión');
    UI.showFriends();
    eq(UI.friendsGate.style.display, 'flex', 'sale el aviso de que hace falta cuenta');
    eq(UI.friendsBody.style.display, 'none', 'y no la lista');
    try {
      UI.showProfile();
      eq(UI.els.profile.style.display, 'none', 'el panel no se abre');
      ok(UI.promptOpen, 'sale la puerta de entrar');
      ok(UI.els.prompt.classList.contains('popup'), 'y sale en caja, no a pantalla entera');
      var etiquetas = [].map.call(UI.els.prompt.querySelectorAll('.btn'),
        function (b) { return b.textContent; }).join(' ');
      ok(etiquetas.indexOf('CREAR CUENTA') !== -1, 'con la puerta de crear cuenta');
      ok(etiquetas.indexOf('VOLVER AL MENÚ') !== -1, 'y la única salida es el menú');
    } finally {
      UI.hidePrompt();
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
      /* 23 sep: la ficha lo enseña a la vista (perfil, ver partida,
       * invitar) y QUITAR va aparte, en la esquina, con confirmación */
      eq(fila.querySelectorAll('.amg-accion').length, 3,
         'cada uno con perfil, ver partida e invitar');
      var quitar = fila.querySelector('.amg-quitar');
      ok(quitar, 'y su botón de quitar');
      ok(fila.querySelector('.friend-avatar'), 'con su avatar');
      quitar.click();
      eq(F.all().length, 2, 'el primer toque solo pregunta');
    } finally {
      Ac.logged = logged0;
      Ac.listFriends = list0;
      F.replace(previo);
      UI._friendsPulling = false;
      UI.showMenu();
    }
  });

  /* Todo lo del personaje se viste en el VESTUARIO (15 sep). PERFIL enseña
   * tu personaje en pequeño y OPCIONES solo lleva los atajos. */
  test('el aspecto se elige en el VESTUARIO; PERFIL y OPCIONES solo llevan a él',
    function () {
      var UI = window.PM.UI;
      UI.showProfile();
      eq(UI.els.profile.querySelectorAll('.swatches').length, 0,
         'en PERFIL ya no hay filas de color');
      ok(UI.profLookCv && UI.profVestBtn, 'sí tu personaje y el botón al vestuario');
      UI.showOptions();
      UI.showOptionsTab('jugadores');
      eq(UI.els.options.querySelectorAll('.swatches').length, 0, 'ni en OPCIONES');
      ok(UI.colorRows.pacColor && UI.colorRows.pac2Color,
         'los dos colores viven en el vestuario');
      UI.showMenu();
      ok(/^VESTUARIO/.test(UI.menuVestBtn.textContent), 'el cuartel tiene su botón');
    });

  test('VESTUARIO: sale lo tuyo, pulsar lo pone y lo que no tienes se prueba',
    function () {
      var UI = window.PM.UI, s = window.PM.settings, Tn = window.PM.Tienda;
      var antes = { skin1: s.skin1, skin2: s.skin2, acc1: s.acc1 };
      var Ac = window.PM.Account;
      var u0 = Ac.user, t0 = Ac.token;
      Ac.user = u0 || { id: 'test', usuario: 'TEST' };
      Ac.token = t0 || 'test';
      try {
        UI.showProfile();
        UI.showVestuario('skin', 'yo');
        ok(UI.els.vestuario.style.display !== 'none', 'se abre');
        // de salida, solo lo tuyo
        UI.vestFaltan = false;
        UI.refreshVestuario();
        ok(UI.vestFichas.length > 0 && UI.vestFichas.every(function (f) { return f.it.tuyo; }),
           'sin pedirlo, solo sale lo que tienes');
        var todas = UI.vestItems('skin', 'yo').length;
        eq(todas, CFG.SKINS.length, 'aunque cuenta con todas');
        // pulsar la clásica la pone
        s.skin1 = 'sombra';
        UI.refreshVestuario();
        var cl = UI.vestFichas.filter(function (f) { return f.it.id === 'clasico'; })[0];
        ok(cl, 'la clásica está');
        cl.btn.click();
        eq(s.skin1, 'clasico', 'y al pulsarla queda puesta');
        // lo que falta: se ve si se pide, y pulsarlo solo lo prueba
        UI.vestFaltan = true;
        UI.showVestuario('accesorio', 'yo');
        UI.vestFaltan = true;
        UI.refreshVestuario();
        var ajeno = UI.vestFichas.filter(function (f) { return !f.it.tuyo; })[0];
        if (ajeno) {
          ajeno.btn.click();
          eq(UI.vestProbando && UI.vestProbando.id, ajeno.it.id, 'lo que no tienes se prueba');
          ok(!Tn.tiene(ajeno.it.id) && Tn.accesorio() !== ajeno.it.id, 'pero no se pone');
          eq(UI.vestLook().accesorio, ajeno.it.id, 'y el maniquí lo lleva');
        }
        UI.vestFaltan = false;
        // el jugador 2 solo tiene skin y color
        UI.showVestuario('accesorio', 'j2');
        eq(UI.vestTab, 'skin', 'el jugador 2 no lleva accesorios: va a su skin');
        UI.refreshVestuario();
        var ojo = UI.vestFichas.filter(function (f) { return f.it.id === 'clasico'; })[0];
        ojo.btn.click();
        eq(s.skin2, 'clasico', 'y se le pone la suya, no la tuya');
        // VOLVER regresa a donde se abrió
        UI.closeVestuario();
        ok(UI.els.profile.style.display !== 'none', 'VOLVER regresa a PERFIL');
        UI.showOptions();
        UI.showSkins('skin2');
        eq(UI.vestPara, 'j2', 'lo de antes (showSkins) abre el vestuario del jugador 2');
        UI.closeVestuario();
        ok(UI.els.options.style.display !== 'none', 'y vuelve a OPCIONES');
      } finally {
        s.skin1 = antes.skin1; s.skin2 = antes.skin2; s.acc1 = antes.acc1;
        UI.vestProbando = null;
        Ac.user = u0; Ac.token = t0;
        UI.showMenu();
      }
    });

  test('VESTUARIO: las skins se clasifican por cómo se consiguen', function () {
    var UI = window.PM.UI;
    try {
      UI.showVestuario('skin', 'yo');
      UI.vestFaltan = true;
      UI.vestFiltro = 'tienda';
      UI.refreshVestuario();
      var tienda = CFG.SKINS.filter(function (s) { return s.grupo === 'tienda'; }).length;
      eq(UI.vestFichas.length, tienda, 'DE TIENDA enseña solo las de tienda');
      ok(UI.vestFichas.every(function (f) { return f.it.cat === 'tienda'; }), 'y ninguna otra');
      UI.vestFiltro = 'rara';
      UI.refreshVestuario();
      ok(UI.vestFichas.length > 0 && UI.vestFichas.every(function (f) {
        return window.PM.Skins.rara(f.it.id);
      }), 'EXTRAVAGANTES solo las extravagantes');
      UI.vestFiltro = 'todas';
      UI.refreshVestuario();
      eq(UI.vestFichas.length, CFG.SKINS.length, 'TODAS las enseña todas');
      ok(UI.vestGrid.querySelectorAll('.vest-seccion').length >= 4, 'agrupadas con su título');
    } finally {
      UI.vestFaltan = false;
      UI.vestFiltro = 'todas';
      UI.showMenu();
    }
  });

  test('VESTUARIO: el color se elige en fichas, también uno a tu gusto', function () {
    var UI = window.PM.UI, s = window.PM.settings;
    var antes = s.pacColor;
    try {
      UI.showVestuario('color', 'yo');
      eq(UI.colorRows.pacColor.swatches.length, CFG.PAC_SWATCHES.length, 'una ficha por color');
      UI.colorRows.pacColor.swatches[1].click();
      eq(s.pacColor, CFG.PAC_SWATCHES[1], 'pulsar una lo pone');
      ok(UI.colorRows.pacColor.swatches[1].classList.contains('active'), 'y queda marcada');
      UI.setColor('pacColor', '#3366ff');
      ok(UI.els.vestuario.querySelector('.vest-color-libre').classList.contains('active'),
         'un color que no está en la lista marca la ficha A TU GUSTO');
    } finally {
      s.pacColor = antes;
      UI.showMenu();
    }
  });

  test('VESTUARIO: lo que consigues sale como NUEVO una vez', function () {
    var UI = window.PM.UI;
    var key = UI.VEST_VISTOS_KEY, previo = null;
    try { previo = localStorage.getItem(key); } catch (e) { previo = null; }
    try {
      localStorage.removeItem(key);
      eq(UI.vestNuevos(), 0, 'la primera vez, lo que ya tenías no es nuevo');
      // se olvida una cosa vista: vuelve a ser nueva
      var vistos = UI.vestVistos().filter(function (k) { return k !== 'skin:clasico'; });
      UI.vestGuardarVistos(vistos);
      eq(UI.vestNuevos(), 1, 'algo tuyo sin ver cuenta como nuevo');
      UI.refreshVestBtn();
      ok(/1 NUEVO/.test(UI.menuVestBtn.textContent), 'y el botón del cuartel lo dice');
      UI.showVestuario('skin', 'yo');
      UI.closeVestuario();
      eq(UI.vestNuevos(), 0, 'verlo en su pestaña lo estrena');
    } finally {
      try {
        if (previo === null) localStorage.removeItem(key);
        else localStorage.setItem(key, previo);
      } catch (e) { /* nada */ }
      UI.showMenu();
    }
  });

  test('TIENDA: solo sale lo que te falta, el ticket resta y paga todo junto', function () {
    var UI = window.PM.UI;
    conTienda(function (Tn) {
      UI.tiendaBolsa = [];
      UI.showTienda('efecto');
      UI.tiendaTengo = false;
      UI.refreshTienda();
      var vistas = UI.tiendaItems.filter(function (r) { return r.card.style.display !== 'none'; });
      var deVenta = CFG.EFECTOS.filter(function (e) { return !e.cofre && !e.pase; }).length;
      eq(vistas.length, deVenta, 'sin nada comprado, salen todos los efectos que se venden');
      var a = vistas[0], b = vistas[1];
      ok(UI.tiendaAlTicket(a.it.id), 'el + echa al ticket');
      ok(UI.tiendaAlTicket(b.it.id), 'y otro');
      eq(UI.tiendaEnTicket(), a.it.precio + b.it.precio, 'el ticket suma lo que lleva');
      ok(!Tn.tiene(a.it.id), 'echarlo al ticket no es comprarlo');
      eq(a.mas.textContent, '✓', 'la ficha dice que está en el ticket');
      eq(UI.tiendaPagar(), 2, 'pagar compra las dos');
      ok(Tn.tiene(a.it.id) && Tn.tiene(b.it.id), 'y son tuyas');
      eq(Tn.saldo(), 1500 - a.it.precio - b.it.precio, 'cobradas una vez cada una');
      eq(UI.tiendaBolsa.length, 0, 'el ticket queda vacío');
      ok(a.card.style.display !== 'none', 'lo recién comprado sigue a la vista');
      eq(a.precio.textContent, 'RECIÉN COMPRADO');
      UI.tiendaRecien = [];
      UI.refreshTienda();
      ok(a.card.style.display === 'none', 'fuera de esa visita, lo tuyo ya no sale');
      UI.tiendaTengo = true;
      UI.refreshTienda();
      ok(a.card.style.display !== 'none', 'salvo que se pida verlo');
      UI.tiendaTengo = false;
    });
    UI.tiendaBolsa = [];
    UI.showMenu();
  });

  test('TIENDA: lo que no cabe en el ticket no entra, y se dice cuánto falta', function () {
    var UI = window.PM.UI;
    conTienda(function (Tn) {
      UI.tiendaBolsa = [];
      UI.showTienda('skin');
      ok(UI.tiendaAlTicket('cuy'), 'una skin de 1.500 cabe justo');
      ok(!UI.tiendaAlTicket('acc_gafas'), 'con el ticket lleno, otra cosa no cabe');
      ok(/TE FALTAN 450/.test(UI.tiendaMsg.textContent), 'y se dice lo que falta');
      ok(UI.tiendaAlTicket('cuy'), 'pulsar otra vez lo saca del ticket');
      eq(UI.tiendaEnTicket(), 0, 'y el ticket vuelve a cero');
      ok(!Tn.tiene('cuy'), 'sin pagar, nada');
    });
    UI.tiendaBolsa = [];
    UI.showMenu();
  });

  test('FICHA: se abre encima, compra y pone de un golpe, y se cierra', function () {
    var UI = window.PM.UI;
    conTienda(function (Tn) {
      UI.tiendaBolsa = [];
      UI.showTienda('accesorio');
      ok(UI.abrirFicha('accesorio', 'acc_gafas', 'tienda'), 'se abre la ficha');
      ok(UI.ficha && UI.ficha.it.id === 'acc_gafas', 'con esa cosa');
      ok(UI.els.tienda.style.display !== 'none', 'la tienda sigue detrás');
      ok(UI.ficha.velo.parentNode === UI.els.tienda, 'la ventana va encima de la tienda');
      ok(window.PM.Ficha.momentosDe(UI.ficha.it).indexOf('morir') !== -1, 'se puede ver cómo muere');
      ok(UI.fichaComprar(), 'COMPRAR Y PONÉRMELO');
      ok(Tn.tiene('acc_gafas'), 'comprado');
      eq(Tn.accesorio(), 'acc_gafas', 'y puesto');
      eq(Tn.saldo(), 1050, 'cobrado una vez');
      ok(!UI.fichaComprar(), 'no se compra dos veces');
      UI.cerrarFicha();
      eq(UI.ficha, null, 'se cierra');
      eq(UI.els.tienda.querySelectorAll('.ficha-velo').length, 0,
         'y la ventana se va');
      /* un emote comprado desde la ficha va a una tecla de los de siempre */
      Tn.ganar(200);
      UI.abrirFicha('emote', 'mareo', 'tienda');
      ok(UI.fichaComprar(), 'se compra el emote');
      ok(Tn.emotes().indexOf('mareo') !== -1, 'y va en una tecla');
      UI.cerrarFicha();
      Tn.poner('accesorio', '');
    });
    UI.tiendaBolsa = [];
    UI.showMenu();
  });

  test('FICHA: también en el vestuario, para ponerse lo que ya es tuyo', function () {
    var UI = window.PM.UI;
    conTienda(function (Tn) {
      ok(Tn.comprar('efx_notas').ok, 'algo comprado');
      UI.showVestuario('efecto', 'yo');
      ok(UI.abrirFicha('efecto', 'efx_notas', 'vestuario'), 'se abre desde el vestuario');
      ok(UI.ficha.velo.parentNode === UI.els.vestuario, 'encima del vestuario');
      UI.ponerCosa(UI.ficha.it);
      eq(Tn.efecto(), 'efx_notas', 'PONÉRMELO lo pone');
      ok(UI.abrirFicha('skin', 'clasico', 'vestuario'), 'y sirve para las skins que no se compran');
      UI.closeVestuario();
      eq(UI.ficha, null, 'salir del vestuario cierra la ficha');
      Tn.poner('efecto', '');
    });
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
      eq(ctx.font, window.PM.Letra ? window.PM.Letra.lienzo(7) : 'bold 7px monospace',
         'un nombre corto se deja como estaba');
    });

  /* 18 sep: la contraseña va SIEMPRE en mayúsculas, se escriba como se
   * escriba. Las cuentas viejas se arreglan solas al entrar (ver passUp en
   * js/account.js): Supabase guarda el resumen, no la contraseña, así que
   * desde fuera no hay forma de pasarlas a mayúsculas. */
  test('la contraseña se manda siempre en mayúsculas', function () {
    var Ac = window.PM.Account;
    var orig = Ac.fn, envios = [], tok = Ac.token, usr = Ac.user;
    Ac.fn = function (body, cb) { envios.push(body); cb('USUARIO O CONTRASEÑA MAL'); };
    try {
      Ac.token = null; Ac.user = null;
      Ac.signIn('pepe', 'miClave1', function () {});
      eq(envios[0].usuario, 'PEPE', 'el usuario, saneado');
      eq(envios[0].pass, 'MICLAVE1', 'y la contraseña en mayúsculas');
      /* si esa falla, se prueba TAL CUAL: es una cuenta de antes */
      eq(envios[1].pass, 'miClave1', 'segundo intento: como la escribió');
      eq(envios.length, 2, 'y no hay un tercero');
      /* escrita ya en mayúsculas no se reintenta: sería la misma */
      envios.length = 0;
      Ac.signIn('pepe', 'MICLAVE1', function () {});
      eq(envios.length, 1, 'sin segundo intento si ya venía en mayúsculas');
      /* y un fallo que no sea de contraseña tampoco se reintenta */
      envios.length = 0;
      Ac.fn = function (body, cb) { envios.push(body); cb('NO SE PUDO CONECTAR'); };
      Ac.signIn('pepe', 'miClave1', function () {});
      eq(envios.length, 1, 'un corte de red no se reintenta');
      /* el alta también sube en mayúsculas */
      envios.length = 0;
      Ac.fn = function (body, cb) { envios.push(body); cb('CORTADO'); };
      Ac.signUp('pepe', 'miClave1', 'pepe@ejemplo.com', function () {});
      eq(envios[0].pass, 'MICLAVE1', 'el alta, igual');
    } finally { Ac.fn = orig; Ac.token = tok; Ac.user = usr; }
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
      /* Entrar y crear cuenta pasan por la Edge Function, no por Supabase Auth
       * directamente: es ella la que resuelve usuario -> correo con la service
       * role. Si esto se saltara, el navegador tendría que conocer el correo
       * de cada usuario y cualquiera podría sacar la lista con los nombres del
       * ranking. */
      Ac.signIn('PEPE', 'lachiquilla', function () {});
      var e = vistas[0];
      ok(/\/functions\/v1\/cuenta$/.test(e.url), 'entrar: ' + e.url);
      eq(e.opts.method, 'POST');
      var cuerpo = JSON.parse(e.opts.body);
      eq(cuerpo.op, 'entrar');
      eq(cuerpo.usuario, 'PEPE', 'va el usuario, no un correo');
      ok(!cuerpo.correo, 'y ningún correo compuesto por dentro');

      vistas.length = 0;
      Ac.signUp('PEPE', 'lachiquilla', 'pepe@gmail.com', function () {});
      ok(/\/functions\/v1\/cuenta$/.test(vistas[0].url), 'alta: ' + vistas[0].url);
      var alta = JSON.parse(vistas[0].opts.body);
      eq(alta.op, 'alta');
      eq(alta.correo, 'pepe@gmail.com', 'con el correo DE VERDAD');

      vistas.length = 0;
      Ac.olvide('PEPE', function () {});
      var olv = JSON.parse(vistas[0].opts.body);
      eq(olv.op, 'olvide');
      eq(olv.usuario, 'PEPE');

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

  /* ---------- EL ASPECTO VIAJA CON LA CUENTA ----------
   * La compra ya viajaba (va en los contadores de logros); lo que no viajaba
   * era HABÉRSELO PUESTO, que es la mitad que se ve. Estas pruebas vigilan
   * las dos cosas que pueden salir mal: que el aspecto no suba, y que subir
   * el de un aparato borre el que acabas de ponerte en otro. */
  function conAspecto(fn) {
    var s = window.PM.settings;
    var antes = {};
    var claves = CFG.AJUSTES_NUBE.concat(['ajustesTs', 'nick2', 'difficultyPreset']);
    claves.forEach(function (k) { antes[k] = s[k]; });
    /* Los sellos POR CAMPO son un objeto, y guardar la referencia no aísla
     * nada: quien los toque durante la prueba estaría escribiendo en la
     * copia. Se guarda una copia y se entra con la pizarra en blanco, que
     * es lo que significa «esta máquina no ha tocado nada». */
    var sellosAntes = {};
    for (var ks in (s.ajustesTsK || {})) {
      if (s.ajustesTsK.hasOwnProperty(ks)) sellosAntes[ks] = s.ajustesTsK[ks];
    }
    s.ajustesTsK = {};
    try { fn(window.PM.UI, s); }
    finally {
      claves.forEach(function (k) { s[k] = antes[k]; });
      s.ajustesTsK = sellosAntes;
      window.PM.UI.saveSettings();
    }
  }

  test('lo que viaja con la cuenta es el aspecto y las preferencias, no el mando de al lado',
    function () {
      conAspecto(function (UI, s) {
        s.skin1 = 'pixel';
        s.pacColor = '#ff00ff';
        s.nick2 = 'COMPI';
        var o = UI.ajustesParaNube();
        eq(o.skin1, 'pixel', 'la skin sube');
        eq(o.pacColor, '#ff00ff', 'y el color');
        ok(o.hasOwnProperty('volMaster'), 'y cómo suena');
        ok(o.hasOwnProperty('ts'), 'con su sello de tiempo');
        eq(o.nick2, undefined,
          'el jugador 2 no: es de quien se sienta en ESE teclado, no de la cuenta');
        eq(o.nick1, undefined, 'y el nombre propio ya ES el de la cuenta');
      });
    });

  test('el sello solo se mueve cuando cambia algo que viaja', function () {
    conAspecto(function (UI, s) {
      s.ajustesTs = 1000;
      s.nick2 = 'OTRO';                 // esto no viaja
      UI.saveSettings();
      eq(s.ajustesTs, 1000, 'cambiar lo del jugador 2 no adelanta el sello');
      s.skin1 = (s.skin1 === 'pixel') ? 'clasico' : 'pixel';
      UI.saveSettings();
      ok(s.ajustesTs > 1000, 'cambiar de skin, sí');
    });
  });

  test('entrar en otra PC trae el aspecto de la última vez que lo cambiaste',
    function () {
      conAspecto(function (UI, s) {
        s.skin1 = 'clasico';
        s.pacColor = '#ffff00';
        s.volMusic = 1;
        s.ajustesTs = 1000;

        /* lo de la nube es más nuevo: manda */
        var vino = UI.aplicarAjustesDeNube({
          ts: 2000, skin1: 'pixel', pacColor: '#ff00ff', volMusic: 0.3
        });
        ok(vino, 'se aplica');
        eq(s.skin1, 'pixel', 'la skin');
        eq(s.pacColor, '#ff00ff', 'el color');
        eq(s.volMusic, 0.3, 'y el volumen de la música');
        eq(s.ajustesTs, 2000,
          'se queda el sello de allí: copiar no convierte a este aparato en el más nuevo');

        /* y queda escrito, no solo en memoria */
        var guardado = JSON.parse(localStorage.getItem(CFG.SETTINGS_KEY) || '{}');
        eq(guardado.skin1, 'pixel', 'se persiste');
      });
    });

  test('lo que acabas de ponerte aquí no lo pisa una nube más vieja',
    function () {
      conAspecto(function (UI, s) {
        s.skin1 = 'pixel';
        s.ajustesTs = 5000;
        s.ajustesTsK = { skin1: 5000 };
        var vino = UI.aplicarAjustesDeNube({ ts: 4999, skin1: 'clasico' });
        ok(!vino, 'no se aplica');
        eq(s.skin1, 'pixel', 'se queda lo de aquí, que es más nuevo');
        /* ni siquiera con el mismo sello: en un empate no hay motivo para
         * cambiar nada, y cambiar es lo único que se nota */
        ok(!UI.aplicarAjustesDeNube({ ts: 5000, skin1: 'clasico' }), 'empate: tampoco');
        eq(s.skin1, 'pixel');
      });
    });

  test('cada ajuste viaja por su cuenta: tocar el volumen aquí no bloquea la skin de allí',
    function () {
      conAspecto(function (UI, s) {
        /* EL FALLO QUE HUBO: el sello era del BLOQUE, así que con solo
         * elegir rol o bajar el volumen en este ordenador, este ordenador
         * pasaba a ser «el más nuevo» y NADA de la cuenta bajaba: ni la
         * skin, ni el orden de los emotes, ni los ajustes del otro. */
        var otrosEmotes = CFG.EMOTE_IDS.slice(0, CFG.TIENDA.EMOTE_TECLAS)
          .slice().reverse().join(',');
        s.skin1 = 'clasico';
        s.emotes1 = CFG.DEFAULT_SETTINGS.emotes1;
        s.volMaster = 0.3;
        /* aquí SOLO se tocó el volumen, y después que la skin de la nube */
        s.ajustesTsK = { volMaster: 9000 };
        s.ajustesTs = 9000;
        var vino = UI.aplicarAjustesDeNube({
          ts: 5000, skin1: 'pixel', emotes1: otrosEmotes, volMaster: 1,
          t: { skin1: 5000, emotes1: 5000, volMaster: 4000 }
        });
        ok(vino, 'algo entra, aunque el bloque de aquí sea más nuevo');
        eq(s.skin1, 'pixel', 'la skin de la cuenta llega igual');
        eq(s.emotes1, otrosEmotes, 'y el orden de los emotes');
        eq(s.volMaster, 0.3, 'pero el volumen de aquí, que es más nuevo, se respeta');
        ok(vino.skin1 && !vino.volMaster, 'y dice exactamente qué entró');
      });
    });

  test('un ajuste que nunca se tocó en esta máquina siempre acepta el de la cuenta',
    function () {
      conAspecto(function (UI, s) {
        s.skin1 = 'clasico';
        s.ajustesTsK = {};      // recién instalado: aquí no se ha tocado nada
        s.ajustesTs = 99999999; // aunque el bloque venga de otra cosa
        ok(UI.aplicarAjustesDeNube({ ts: 1, skin1: 'pixel' }),
          'una fila vieja sin sellos por campo entra igual');
        eq(s.skin1, 'pixel');
      });
    });

  test('lo que baja de la nube se sanea igual que lo guardado aquí',
    function () {
      conAspecto(function (UI, s) {
        s.ajustesTs = 1;
        UI.aplicarAjustesDeNube({
          ts: 2, skin1: 'no-existe', pacColor: 'rojo', volSfx: 99,
          startLives: 500, acc1: 'inventado'
        });
        eq(s.skin1, CFG.DEFAULT_SETTINGS.skin1, 'una skin que no existe no entra');
        eq(s.pacColor, CFG.DEFAULT_SETTINGS.pacColor, 'ni un color que no es un color');
        eq(s.volSfx, 1, 'los volúmenes se recortan a su tope');
        eq(s.startLives, 5, 'y las vidas también');
        eq(s.acc1, CFG.DEFAULT_SETTINGS.acc1, 'ni un accesorio inventado');
      });
    });

  test('el aspecto sube con el perfil, y sin columna se manda el resto igual',
    function () {
      var Ac = window.PM.Account;
      conAspecto(function (UI, s) {
        s.skin1 = 'pixel';
        s.ajustesTs = 1234;
        var sube = Ac.localState();
        ok(sube.ajustes, 'los ajustes van en lo que se sube');
        eq(sube.ajustes.skin1, 'pixel', 'con la skin puesta');
        eq(sube.ajustes.ts, 1234, 'y su sello');
        /* Proyecto de Supabase sin la columna todavía: antes que no guardar
         * nada, se guarda el resto. */
        Ac.sinAjustes = true;
        try {
          var apanyo = Ac.localState();
          eq(apanyo.ajustes, undefined, 'sin columna, los ajustes se quedan fuera');
          ok(apanyo.hasOwnProperty('record1'), 'pero el récord de siempre sube igual');
        } finally { Ac.sinAjustes = false; }
      });
    });

  test('cerrar sesión deja la máquina sin el aspecto del que se fue',
    function () {
      var Ac = window.PM.Account, G = window.PM.Game;
      var r1 = G.highScore1, xp0 = window.PM.Level.xp();
      conLogrosLimpios(function () {
        conAspecto(function (UI, s) {
          try {
            s.skin1 = 'pixel';
            s.acc1 = CFG.ACCESORIO_IDS[0];
            s.pacColor = '#ff00ff';
            s.avatar = 'blinky';
            /* GUARDADO de verdad antes de salir, que es como llega esto en el
             * juego. Sin este paso la prueba no veía el fallo que hubo: al
             * limpiar, el aspecto CAMBIA (vuelve a fábrica) y el guardado lo
             * volvía a sellar con la hora de ahora, dejando la máquina como
             * "la más nueva" y sin devolverle el suyo al siguiente que
             * entrara. */
            UI.saveSettings();
            s.ajustesTs = 7777;
            Ac.limpiarLocal();
            eq(s.skin1, CFG.DEFAULT_SETTINGS.skin1, 'la skin se va con la cuenta');
            eq(s.acc1, '', 'y lo que llevaba puesto');
            eq(s.pacColor, CFG.DEFAULT_SETTINGS.pacColor, 'y el color');
            eq(s.avatar, CFG.DEFAULT_SETTINGS.avatar, 'y el avatar');
            eq(s.ajustesTs, 0,
              'y el sello, o el siguiente que entre aquí le ganaría a su propia cuenta');
            /* la prueba de fuego: ahora entra OTRO con su aspecto y su sello,
             * y tiene que entrar entero por viejo que sea */
            ok(UI.aplicarAjustesDeNube({ ts: 10, skin1: 'pixel' }),
              'el aspecto del que entra manda en una máquina recién liberada');
            eq(s.skin1, 'pixel');
          } finally {
            G.highScore1 = r1;
            window.PM.Level.reset(); if (xp0 > 0) window.PM.Level.add(xp0);
          }
        });
      });
    });

  test('un aspecto viejo de la nube tampoco cambia el avatar de aquí', function () {
    var Ac = window.PM.Account;
    var origUser = Ac.user, origTok = Ac.token;
    conAspecto(function (UI, s) {
      try {
        Ac.token = 'x';
        Ac.user = { id: 'id', usuario: 'PEPE', avatar: 'pac' };
        s.avatar = 'clyde';
        s.ajustesTs = 9000;
        s.ajustesTsK = { avatar: 9000 };   // aquí se cambió, y hace nada
        /* La nube trae otro avatar EN SU COLUMNA y un aspecto más viejo. El
         * avatar va en las dos partes, así que sin cuidado entraba por la
         * columna lo que el sello acababa de rechazar. */
        Ac.applyRemote({ usuario: 'PEPE', avatar: 'blinky', xp: 0,
                         logros: {}, ajustes: { ts: 100, avatar: 'blinky' } });
        eq(s.avatar, 'clyde', 'se queda el de aquí, que es más nuevo');
        /* y una cuenta SIN aspecto (de las de antes) sigue mandando con su
         * columna, como toda la vida */
        Ac.applyRemote({ usuario: 'PEPE', avatar: 'blinky', xp: 0, logros: {} });
        eq(s.avatar, 'blinky', 'sin aspecto en la nube, manda la columna de siempre');
      } finally { Ac.user = origUser; Ac.token = origTok; }
    });
  });

  test('crear cuenta exige usuario, contraseña y correo', function () {
    var Ac = window.PM.Account;
    var msg = null;
    Ac.signUp('AB', 'lachiquilla', 'a@b.co', function (e) { msg = e; });
    ok(/USUARIO/.test(msg), 'usuario corto: ' + msg);
    Ac.signUp('PEPITO', '123', 'a@b.co', function (e) { msg = e; });
    ok(/CONTRASEÑA/.test(msg), 'contraseña corta: ' + msg);
    /* El correo es obligatorio a propósito: dejarlo opcional es dejar cuentas
     * que se pierden para siempre, que es de donde venimos. */
    Ac.signUp('PEPITO', 'lachiquilla', '', function (e) { msg = e; });
    ok(/CORREO/.test(msg), 'sin correo no se crea: ' + msg);
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
  // Modo DESATADO (js/habilidades.js)
  // ---------------------------------------------------------------
  var HB = window.PM.Hab;
  var HC = CFG.HAB;

  /* Partida de poderes a un jugador, con Pac-Man donde se le diga.
   * `col`/`fila` en casillas; por defecto se queda donde empieza. */
  function partidaHab(col, fila, dir) {
    window.PM.settings.muted = true;
    G.newGame({ players: 1, hab: true });
    G.state = 'PLAYING';
    G.readyTicks = 0;
    G.pacs[0].safeTicks = 999999;
    if (col !== undefined) {
      G.pacs[0].x = col * CFG.TILE + CFG.TILE / 2;
      G.pacs[0].y = fila * CFG.TILE + CFG.TILE / 2;
    }
    if (dir !== undefined) {
      G.pacs[0].dir = dir;
      G.pacs[0].nextDir = dir;
    }
    return G;
  }

  /* Deja un fantasma quieto en una casilla, listo para que lo muerdan */
  function fantasmaEn(gi, col, fila) {
    var g = G.ghosts[gi];
    g.mode = 'normal';
    g.frightened = false;
    g.x = col * CFG.TILE + CFG.TILE / 2;
    g.y = fila * CFG.TILE + CFG.TILE / 2;
    return g;
  }

  var SP = window.PM.Sprites;

  test('fuera del modo no hay habilidades que valgan', function () {
    partida(1);
    ok(!G.hab, 'una partida normal no es de poderes');
    eq(HB.estado(0), null, 'no hay estado que consultar');
    eq(HB.pulsar(G, 0, HB.TURBO), false, 'la tecla no hace nada');
  });

  /* Los números del modo, tal cual se pidieron. Van en una prueba porque son
   * el equilibrio del modo entero: si alguien los toca sin querer (o los
   * duplica en otro sitio), aquí se nota. */
  test('las recargas y duraciones son las acordadas', function () {
    eq(HC.segs(0), 16, 'MORDISCO recarga en 16 s');
    eq(HC.segs(1), 24, 'TURBO recarga en 24 s');
    eq(HC.segs(2), 32, 'FLASH recarga en 32 s');
    eq(HC.segs(3), 60, 'GRITO recarga en 60 s');
    eq(HC.TURBO_TICKS / 60, 5, 'el turbo dura 5 s');
    eq(HC.TURBO_MULT, 1.5, 'y corre x1.5');
    eq(HC.SHOUT_SECS, 6, 'el grito asusta 6 s');
    eq(HC.FLASH_TILES, 3, 'el flash salta 3 casillas');
    eq(HC.BITE_TILES, 1, 'el mordisco parte de 1 casilla');
    /* Media casilla más de lo que era: en party se fallaba demasiado porque el
     * fantasma que ves pegado no está exactamente ahí en la pantalla del
     * anfitrión. Dos casillas justas de alcance. */
    eq(HC.BITE_PX, 2 * CFG.TILE, 'y con el margen llega a dos casillas');
    // la recarga que gasta el juego es la de LIST, no una copia suelta
    for (var k = 0; k < 4; k++) {
      eq(HC.LIST[k].cd, HC.segs(k) * 60, 'la ' + HC.LIST[k].key + ' cuadra');
    }
  });

  test('las cuatro empiezan cargadas', function () {
    partidaHab();
    for (var k = 0; k < 4; k++) {
      ok(HB.lista(0, k), 'la ' + HC.LIST[k].key + ' está lista al empezar');
    }
  });

  /* ---------- el contador de la recarga ---------- */
  /* La barra dice "queda un poco" y el número dice CUÁNTO, que es lo que hace
   * falta para decidir si esperas o tiras de otra tecla. Redondea hacia
   * arriba: un contador que enseña 0 con la tecla todavía muerta es peor que
   * no ponerlo. */
  test('los segundos que faltan se cuentan hacia arriba', function () {
    partidaHab();
    eq(HB.restan(0, HB.TURBO), 0, 'cargada no cuenta nada');
    HB.pulsar(G, 0, HB.TURBO);
    eq(HB.restan(0, HB.TURBO), CFG.HAB.segs(HB.TURBO), 'recién gastada, entera');
    ticks(59);
    eq(HB.restan(0, HB.TURBO), CFG.HAB.segs(HB.TURBO),
       'a falta de 23 segundos y pico, sigue enseñando 24');
    ticks(1);
    eq(HB.restan(0, HB.TURBO), CFG.HAB.segs(HB.TURBO) - 1,
       'y baja al cumplirse el segundo entero');
    ticks(CFG.HAB.LIST[HB.TURBO].cd - 61);      // hasta el último tick vivo
    eq(HB.restan(0, HB.TURBO), 1, 'con un tick vivo todavía queda 1');
    ticks(1);
    eq(HB.restan(0, HB.TURBO), 0, 'y llega a 0 justo cuando se enciende');
    ok(HB.lista(0, HB.TURBO), 'que es cuando ya se puede pulsar');
  });

  /* ---------- las recargas de los COMPAÑEROS ----------
   * El HUD las enseña sin pedir nada nuevo por red: el uso ajeno ya llegaba
   * —por eso se oyen los poderes de los demás— y Hab.evento lo apunta en la
   * recarga de SU dueño. Esta prueba es la que sostiene ese HUD: si algún día
   * el eco dejara de gastar, las casillas de los compañeros se quedarían
   * encendidas para siempre y nadie lo notaría mirando la pantalla. */
  test('el poder de un compañero deja SU recarga contando aquí', function () {
    window.PM.settings.muted = true;
    G.newGame({ players: 2, hab: true, net: 'guest', names: ['UNO', 'DOS'] });
    G.localIdx = 1;
    G.state = 'PLAYING';
    G.readyTicks = 0;
    eq(HB.restan(0, HB.GRITO), 0, 'la del otro empieza cargada');
    HB.evento(G, 0, HB.GRITO);                  // llega el eco del compañero
    eq(HB.restan(0, HB.GRITO), CFG.HAB.segs(HB.GRITO),
       'y al usarla se pone a contar en esta pantalla');
    ok(!HB.lista(0, HB.GRITO), 'para él ya no está lista');
    ok(HB.lista(1, HB.GRITO), 'y la mía no se ha tocado');
    ticks(120);
    eq(HB.restan(0, HB.GRITO), CFG.HAB.segs(HB.GRITO) - 2,
       'la cuenta del compañero baja sola con la partida');
    G.toMenu();
  });

  /* ---------- la recarga ajena no puede depender de un solo aviso ----------
   * El aviso de uso se manda UNA vez y nadie lo confirma (el transporte es
   * broadcast, sin acuse), así que el que se pierda dejaría esa casilla del
   * HUD mintiendo el resto de la partida: nada volvía a mirarla. Por eso las
   * recargas viajan también en la instantánea del anfitrión, que sale doce
   * veces por segundo. Esto es lo que hace que el fallo se cure solo. */
  test('la instantánea corrige una recarga ajena que se perdió', function () {
    window.PM.settings.muted = true;
    G.newGame({ players: 2, hab: true, net: 'guest', names: ['UNO', 'DOS'] });
    G.localIdx = 1;
    G.state = 'PLAYING';
    G.readyTicks = 0;
    // el aviso del compañero NUNCA llegó: aquí su GRITO sigue cargado
    eq(HB.restan(0, HB.GRITO), 0, 'de partida, aquí la tiene lista');
    // y llega la foto del anfitrión, que sí sabe la verdad
    var foto = [[0, 0, 0, 40 * 60], [0, 0, 0, 0]];
    HB.aplicarResumen(foto, G.localIdx);
    eq(HB.restan(0, HB.GRITO), 40, 'la foto pone la suya en su sitio');
    G.toMenu();
  });

  /* La TUYA es otra cosa: el anfitrión se entera de lo que pulsas un viaje de
   * red más tarde, así que su foto todavía te la tiene cargada. Hacerle caso
   * a ciegas encendería tu casilla medio parpadeo justo después de pulsarla,
   * que es lo peor que puede hacer un indicador de recarga. */
  test('la instantánea no te enciende la recarga recién gastada', function () {
    window.PM.settings.muted = true;
    G.newGame({ players: 2, hab: true, net: 'guest', names: ['UNO', 'DOS'] });
    G.localIdx = 1;
    G.state = 'PLAYING';
    G.readyTicks = 0;
    HB.pulsar(G, 1, HB.TURBO);
    var mia = HB.restan(1, HB.TURBO);
    ok(mia > 0, 'acabo de gastarla');
    HB.aplicarResumen([[0, 0, 0, 0], [0, 0, 0, 0]], G.localIdx);   // él aún no lo sabe
    eq(HB.restan(1, HB.TURBO), mia, 'la foto atrasada no me la devuelve');
    // pero si él dice que me queda MÁS, ahí manda él
    HB.aplicarResumen([[0, 0, 0, 0], [0, 30 * 60, 0, 0]], G.localIdx);
    eq(HB.restan(1, HB.TURBO), 30, 'hacia arriba sí se corrige');
    G.toMenu();
  });

  /* ---------- los dientes con cada skin ----------
   * Los dientes salen SIEMPRE, lleve la skin que lleve: son el aviso de que
   * la Q ha entrado, y sin ellos fallar la puntería y tener la tecla en
   * recarga se sienten igual. Lo que cambia es CÓMO se dibujan, porque dos
   * skins no pintan un Pac-Man macizo. */
  function espiaCtx() {
    var usos = {}, puntos = [];
    var c = { canvas: null };
    ['save', 'restore', 'beginPath', 'closePath', 'fill', 'stroke', 'translate',
     'rotate', 'fillRect', 'arc'].forEach(function (m) {
      c[m] = function () { usos[m] = (usos[m] || 0) + 1; };
    });
    ['moveTo', 'lineTo'].forEach(function (m) {
      c[m] = function (x, y) {
        usos[m] = (usos[m] || 0) + 1;
        puntos.push([x, y]);
      };
    });
    return { c: c, usos: usos, puntos: puntos };
  }

  /* ---------- la forma de la skin PIXEL ----------
   * Los bloques se apuntan con un ctx de mentira y se mide la silueta que
   * sale. Las tres cosas que hacían que antes no tuviera forma —rejilla
   * descentrada, bloques a medio píxel y mordisco por píxel en vez de por
   * celda— dejan rastro en estos tres números. */
  function bloquesPixel(dir, fase) {
    var rects = [];
    var c = { canvas: null };
    ['save', 'restore', 'beginPath', 'closePath', 'fill', 'stroke', 'translate',
     'rotate', 'moveTo', 'lineTo', 'arc'].forEach(function (m) { c[m] = function () {}; });
    c.fillRect = function (x, y, w, h) { rects.push([x, y, w, h]); };
    window.PM.Sprites.drawPacman(c, 0, 0, dir, fase, '#ffff00', 'pixel');
    return rects;
  }

  function caja(rects) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    rects.forEach(function (r) {
      x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]);
      x1 = Math.max(x1, r[0] + r[2]); y1 = Math.max(y1, r[1] + r[3]);
    });
    return { x0: x0, y0: y0, ancho: x1 - x0, alto: y1 - y0 };
  }

  /* La raya que separa un bloque del siguiente: es lo que hace que se lean
   * como píxeles sueltos, y va en píxeles DE PANTALLA. */
  var RAYA = 1 / CFG.SCALE;

  /* Cabe en el pasillo con aire. Siete celdas de dos píxeles darían 14, que
   * es justo lo que deja el pasillo (TILE + 2*WALL_INSET) y volvería a rozar
   * los muros; recortando las del borde al círculo se queda en 12. */
  test('la skin PIXEL cabe en el pasillo', function () {
    var c = caja(bloquesPixel(CFG.DIR.RIGHT, 0));
    eq(c.ancho, c.alto, 'es igual de ancha que de alta');
    ok(c.ancho < CFG.TILE + 2 * CFG.WALL_INSET,
       'y cabe en los ' + (CFG.TILE + 2 * CFG.WALL_INSET) + ' px del pasillo');
    ok(c.ancho + RAYA >= 2 * CFG.PAC_R - 1,
       'sin quedarse enana al lado de las demás skins');
  });

  /* La rejilla va centrada, que es lo que le da eje a la silueta: antes se
   * recorría de -r a +r a pasos de 1,5 y con r = 6,5 no caía simétrico, así
   * que un lado salía distinto del otro y la espalda no se leía redonda. */
  test('la skin PIXEL es simétrica, que es lo que la hace redonda', function () {
    var rects = bloquesPixel(CFG.DIR.RIGHT, 0);
    var c = caja(rects);
    /* Se mide respecto al centro de la SILUETA y no respecto al cero: el
     * bloque se cuadra a la rejilla de la pantalla (por eso no tiene
     * costuras), y eso deja el sprite medio píxel a un lado según dónde caiga
     * Pac-Man. Es lo que hace cualquier dibujo de píxeles al moverse. */
    /* Se compara con el tamaño LÓGICO de la celda —el dibujado le falta la
     * raya— y respecto al eje de la silueta, no respecto al cero: el bloque
     * se cuadra a la rejilla de la pantalla, y eso deja el sprite medio píxel
     * a un lado según dónde caiga Pac-Man. Es lo que hace cualquier dibujo de
     * píxeles al moverse. */
    var ejeY = c.y0 * 2 + c.alto + RAYA, ejeX = c.x0 * 2 + c.ancho + RAYA;
    /* Las claves van REDONDEADAS. La raya mide un tercio de píxel de casilla,
     * así que las cuentas salen con cola binaria (5.000000000000001) y una
     * comparación en crudo diría que no hay espejo cuando lo hay. */
    function k(a, b) { return a.toFixed(3) + ':' + b.toFixed(3); }
    var clave = {};
    rects.forEach(function (r) { clave[k(r[0], r[1])] = true; });
    rects.forEach(function (r) {
      ok(clave[k(r[0], ejeY - r[1] - r[3] - RAYA)],
         'el bloque de ' + r[0] + ',' + r[1] + ' tiene espejo arriba/abajo');
    });
    /* con la boca cerrada también es simétrico izquierda/derecha */
    rects.forEach(function (r) {
      ok(clave[k(ejeX - r[0] - r[2] - RAYA, r[1])],
         'el bloque de ' + r[0] + ',' + r[1] + ' tiene espejo izq/der');
    });
  });

  /* Y entre bloque y bloque hay UNA RAYA, siempre la misma y de un píxel de
   * pantalla: es lo que hace que se lean como píxeles sueltos en vez de como
   * una mancha con escalones. En la primera versión esa raya salía sola, de
   * rebote, porque los bloques caían a medio píxel y el navegador los
   * difuminaba: se veía, pero sucia y de ancho distinto según el bloque. */
  test('la skin PIXEL deja su raya entre bloques, y siempre igual', function () {
    var rects = bloquesPixel(CFG.DIR.RIGHT, 0);
    var filas = {};
    rects.forEach(function (r) { (filas[r[1]] = filas[r[1]] || []).push(r); });
    var vistas = 0;
    Object.keys(filas).forEach(function (y) {
      var f = filas[y].slice().sort(function (a, b) { return a[0] - b[0]; });
      for (var i = 1; i < f.length; i++) {
        var hueco = f[i][0] - (f[i - 1][0] + f[i - 1][2]);
        ok(Math.abs(hueco - RAYA) < 0.001,
           'fila ' + y + ', bloque ' + i + ': la raya mide ' + hueco);
        vistas++;
      }
    });
    ok(vistas > 10, 'y se han mirado unas cuantas (' + vistas + ')');
  });

  test('con la skin PIXEL los dientes son bloques, no triángulos', function () {
    var px = espiaCtx();
    SP.drawPacTeeth(px.c, 0, 0, CFG.DIR.RIGHT, 2, '#ffff00', 'pixel');
    ok(px.usos.fillRect > 0, 'se pintan en bloques, como el cuerpo');
    ok(!px.usos.lineTo, 'y no con triángulos, que cantarían encima de esa skin');

    var cl = espiaCtx();
    SP.drawPacTeeth(cl.c, 0, 0, CFG.DIR.RIGHT, 2, '#ffff00', 'clasico');
    ok(cl.usos.lineTo > 0, 'en las demás siguen siendo triángulos');
    ok(!cl.usos.fillRect, 'y no bloques');
  });

  /* En ARO el labio no es el borde de un cuerpo: es una línea amarilla de
   * 2,5 px. Los dientes se apoyaban justo encima y se leían como un reflejo,
   * no como dientes. Ahora se meten hacia dentro de la boca, que es donde hay
   * negro con el que contrastar. */
  test('con la skin ARO los dientes se meten en la boca', function () {
    var aro = espiaCtx(), cla = espiaCtx();
    SP.drawPacTeeth(aro.c, 0, 0, CFG.DIR.RIGHT, 2, '#ffff00', 'aro');
    SP.drawPacTeeth(cla.c, 0, 0, CFG.DIR.RIGHT, 2, '#ffff00', 'clasico');
    ok(aro.puntos.length > 0 && aro.puntos.length === cla.puntos.length,
       'se dibujan los mismos dientes en los dos');
    function masLejos(pts) {
      var m = 0;
      for (var i = 0; i < pts.length; i++) m = Math.max(m, Math.abs(pts[i][1]));
      return m;
    }
    ok(masLejos(aro.puntos) < masLejos(cla.puntos),
       'pero en ARO quedan más cerca del eje de la boca');
  });

  test('Q se come al fantasma de al lado, mire donde mire', function () {
    partidaHab(13, 20, CFG.DIR.LEFT);
    // el fantasma queda a la DERECHA: justo hacia donde NO se está mirando
    var g = fantasmaEn(1, 14, 20);
    var antes = G.score;
    ok(HB.pulsar(G, 0, HB.MORDISCO), 'el mordisco entra');
    eq(g.mode, 'eyes', 'el fantasma se va hecho ojos');
    ok(G.score > antes, 'da puntos');
    eq(G.pacs[0].dir, CFG.DIR.RIGHT, 'Pac-Man se gira hacia lo que mordió');
    ok(!HB.lista(0, HB.MORDISCO), 'y se pone a recargar');
  });

  test('Q no llega a tres casillas, y entonces no se gasta', function () {
    partidaHab(13, 20, CFG.DIR.LEFT);
    fantasmaEn(1, 16, 20);
    eq(HB.pulsar(G, 0, HB.MORDISCO), false, 'no hay a quién morder');
    ok(HB.lista(0, HB.MORDISCO), 'la habilidad sigue cargada');
  });

  /* La media casilla que se le añadió: a dos casillas clavadas ahora entra */
  test('Q alcanza a dos casillas', function () {
    partidaHab(13, 20, CFG.DIR.LEFT);
    var g = fantasmaEn(1, 15, 20);
    ok(HB.pulsar(G, 0, HB.MORDISCO), 'a dos casillas sí llega');
    eq(g.mode, 'eyes', 'y se lo come');
  });

  /* ---------- la Q pulsada un pelo antes ----------
   * EL fallo que se veía jugando: Pac-Man y un fantasma van de frente, se
   * pulsa Q para morder... y el que muere es Pac-Man. Yendo de cara los dos se
   * acercan casi 2 px por tick, así que desde que el fantasma entra en los
   * 16 px del alcance hasta que pisa su casilla y lo mata pasan cinco o seis
   * ticks: menos de 100 ms, y nadie reacciona tan rápido. Se pulsaba cuando se
   * decidía —con el fantasma a tres o cuatro casillas—, la dentellada salía al
   * aire y el fantasma llegaba igual.
   *
   * Ahora la Q pedida pronto se queda ARMADA y muerde sola en cuanto alguien
   * entra a tiro. No alcanza más lejos: solo deja de exigir puntería de
   * milisegundo. Ver CFG.HAB.BITE_BUFFER. */
  test('la Q pedida pronto se queda armada y muerde sola', function () {
    partidaHab(13, 20, CFG.DIR.RIGHT);
    var g = fantasmaEn(1, 17, 20);          // a cuatro casillas: no llega
    eq(HB.pulsar(G, 0, HB.MORDISCO), false, 'todavía no hay a quién morder');
    ok(HB.lista(0, HB.MORDISCO), 'y no se gasta la recarga');
    eq(HB.estado(0).pedirQ, CFG.HAB.BITE_BUFFER, 'pero la Q queda armada');
    g.x = 15 * CFG.TILE + CFG.TILE / 2;     // se acerca a dos casillas
    ticks(1);
    eq(g.mode, 'eyes', 'y el mordisco sale solo en cuanto llega a tiro');
    ok(!HB.lista(0, HB.MORDISCO), 'ahora sí se gasta la recarga');
    eq(HB.estado(0).pedirQ, 0, 'y la Q armada se consume');
  });

  test('la Q armada se agota sola y fallar sigue sin costar nada', function () {
    partidaHab(13, 20, CFG.DIR.LEFT);
    for (var i = 0; i < 4; i++) G.ghosts[i].mode = 'house';
    eq(HB.pulsar(G, 0, HB.MORDISCO), false, 'no hay nadie a tiro');
    ticks(CFG.HAB.BITE_BUFFER);
    eq(HB.estado(0).pedirQ, 0, 'se acabó el margen');
    ok(HB.lista(0, HB.MORDISCO), 'y la Q sigue cargada');
  });

  test('la Q armada no sobrevive a la muerte', function () {
    partidaHab(13, 20, CFG.DIR.LEFT);
    for (var i = 0; i < 4; i++) G.ghosts[i].mode = 'house';
    HB.pulsar(G, 0, HB.MORDISCO);
    ok(HB.estado(0).pedirQ > 0, 'queda armada');
    HB.limpiarEfectos();
    eq(HB.estado(0).pedirQ, 0, 'y se cae con la vida: nadie apuntó a nada');
  });

  /* ---------- la Q en party ----------
   * El fallo que se veía jugando: el invitado pulsaba Q, el fantasma se moría
   * (lo mataba el anfitrión)... y él también. Aquí no se mata a nadie, así que
   * durante la ida y vuelta de la petición el fantasma seguía vivo y pegado —y
   * el propio mordisco le acaba de girar la cara hacia él—, así que se metía
   * dentro y su propia detección de choques lo mataba. */
  function partidaHabInvitado(col, fila) {
    window.PM.settings.muted = true;
    // el invitado es el que muerde en estas pruebas: el Asesino va al asiento 1
    G.newGame({ players: 2, hab: true, net: 'guest', names: ['UNO', 'DOS'],
                roles: ['tanque', 'asesino'] });
    G.localIdx = 1;
    G.state = 'PLAYING';
    G.readyTicks = 0;
    for (var i = 0; i < G.pacs.length; i++) G.pacs[i].safeTicks = 0;
    var p = G.pacs[1];
    p.x = col * CFG.TILE + CFG.TILE / 2;
    p.y = fila * CFG.TILE + CFG.TILE / 2;
    return p;
  }

  test('el invitado que muerde no muere con el fantasma que ha mordido',
    function () {
      var p = partidaHabInvitado(13, 20);
      var g = fantasmaEn(1, 14, 20);
      ok(HB.pulsar(G, 1, HB.MORDISCO), 'la Q entra');
      eq(g.mode, 'normal', 'aquí el fantasma no se mata: eso es del anfitrión');
      ok(HB.protegido(1, g.id), 'pero queda protegido de él');
      // se mete dentro, que es justo lo que pasaba al girarse hacia él
      g.x = p.x; g.y = p.y;
      G.guestCollisions(p);
      ok(!p.dying, 'y meterse en él no lo mata');
    });

  test('el escudo del mordisco se agota y el fantasma vuelve a matar',
    function () {
      var p = partidaHabInvitado(13, 20);
      var g = fantasmaEn(1, 14, 20);
      HB.pulsar(G, 1, HB.MORDISCO);
      // el anfitrión no contesta: pasan los ticks y el escudo se acaba
      ticks(CFG.HAB.BITE_GUARD + 2);
      ok(!HB.protegido(1, g.id), 'el escudo dura lo justo, no para siempre');
      p = G.pacs[1];
      g.x = p.x; g.y = p.y;
      g.mode = 'normal'; g.frightened = false;
      G.guestCollisions(p);
      ok(p.dying, 'y entonces el fantasma vuelve a ser peligroso');
      G.toMenu();
    });

  test('el escudo es de ESE fantasma, no de todos', function () {
    var p = partidaHabInvitado(13, 20);
    fantasmaEn(1, 14, 20);
    HB.pulsar(G, 1, HB.MORDISCO);
    var otro = fantasmaEn(2, 13, 20);   // este no lo ha mordido nadie
    ok(!HB.protegido(1, otro.id), 'el de al lado no está protegido');
    G.guestCollisions(p);
    ok(p.dying, 'y ese sí lo mata');
    G.toMenu();
  });

  /* El invitado usa la misma vara ancha que el anfitrión para el mordisco: si
   * no, en su pantalla el fantasma azul se le escaparía y el anfitrión se lo
   * daría por comido medio segundo después, de golpe. */
  test('el invitado también muerde al azul de la casilla de al lado', function () {
    var p = partidaHabInvitado(13, 20);
    var g = fantasmaEn(1, 14, 20);
    G.frightTicks = 600;
    g.frightened = true;
    g.x = p.x + 7; g.y = p.y;                 // casillas distintas, pegados
    ok(p.tileX() !== g.tileX(), 'no comparten casilla');
    G.guestCollisions(p);
    eq(g.mode, 'eyes', 'se lo come igual');
    G.toMenu();
  });

  /* El anfitrión le perdona unos píxeles al mordisco que llega por red: la
   * posición del invitado le llega a 12 Hz y sus fantasmas los mueve él, así
   * que cuando la petición se ejecuta ya no están donde el invitado los vio. */
  test('el anfitrión le perdona el desfase de red al mordisco del invitado',
    function () {
      window.PM.settings.muted = true;
      G.newGame({ players: 2, hab: true, net: 'host', names: ['UNO', 'DOS'],
                  roles: ['tanque', 'asesino'] });
      G.state = 'PLAYING';
      G.readyTicks = 0;
      var p = G.pacs[1];
      p.safeTicks = 999999;
      p.x = 13 * CFG.TILE + CFG.TILE / 2;
      p.y = 20 * CFG.TILE + CFG.TILE / 2;
      var g = G.ghosts[1];
      g.mode = 'normal'; g.frightened = false;
      g.y = p.y;
      // fuera del alcance normal, pero dentro del margen que se le perdona
      g.x = p.x + CFG.HAB.BITE_PX + 2;
      eq(HB.presa(G, 1), null, 'a esa distancia, de cerca no habría llegado');
      HB.peticion(G, 1, HB.MORDISCO);
      eq(g.mode, 'eyes', 'pero la petición de red sí se ejecuta');
      ok(CFG.HAB.BITE_NET_MARGIN > 0, 'el margen existe y es solo para la red');
      G.toMenu();
    });

  /* El fallo que se notaba jugando: contando CASILLAS, dos cosas pegadas en
   * pantalla podían caer en casillas no vecinas y el mordisco fallaba sin
   * motivo visible. Se mide en píxeles justo por esto. */
  test('Q muerde lo que se ve pegado, aunque no compartan casilla vecina', function () {
    partidaHab();
    var p = G.pacs[0];
    var T = CFG.TILE;
    // Pac-Man al final de su casilla y el fantasma al principio de la de dos
    // más allá: NUEVE píxeles de separación, pero casillas 13 y 15
    p.x = 13 * T + T - 0.5;      // 111.5 -> casilla 13
    p.y = 20 * T + T / 2;
    p.dir = CFG.DIR.RIGHT; p.nextDir = CFG.DIR.RIGHT;
    var g = G.ghosts[1];
    g.mode = 'normal'; g.frightened = false;
    g.x = 15 * T + 0.5;          // 120.5 -> casilla 15
    g.y = p.y;
    eq(Math.abs(g.x - p.x), 9, 'están a nueve píxeles');
    ok(Math.abs(g.tileX() - p.tileX()) > 1, 'y sin embargo a dos casillas');
    ok(HB.pulsar(G, 0, HB.MORDISCO), 'aun así el mordisco entra');
    eq(g.mode, 'eyes', 'y se lo come');
  });

  test('Q no llega más allá de su alcance en píxeles', function () {
    partidaHab();
    var p = G.pacs[0];
    p.x = 13 * CFG.TILE + CFG.TILE / 2;
    p.y = 20 * CFG.TILE + CFG.TILE / 2;
    var g = G.ghosts[1];
    g.mode = 'normal'; g.frightened = false;
    g.y = p.y;
    g.x = p.x + CFG.HAB.BITE_PX + 1;        // justo fuera
    eq(HB.pulsar(G, 0, HB.MORDISCO), false, 'un píxel más allá, no llega');
    g.x = p.x + CFG.HAB.BITE_PX;            // justo dentro
    ok(HB.pulsar(G, 0, HB.MORDISCO), 'en el límite justo, sí');
  });

  test('un mordisco al aire enseña los dientes pero no gasta recarga', function () {
    partidaHab(13, 20, CFG.DIR.LEFT);
    for (var i = 0; i < 4; i++) G.ghosts[i].mode = 'house';
    eq(HB.pulsar(G, 0, HB.MORDISCO), false, 'no muerde a nadie');
    ok(HB.conDientes(0), 'pero se ve la dentellada: la tecla SÍ entró');
    ok(HB.lista(0, HB.MORDISCO), 'y la recarga sigue entera');
  });

  test('Q no muerde a los que están en casa ni a los que ya son ojos', function () {
    partidaHab(13, 20, CFG.DIR.LEFT);
    var g = fantasmaEn(1, 13, 20);
    g.mode = 'eyes';
    eq(HB.pulsar(G, 0, HB.MORDISCO), false, 'a unos ojos no se les muerde');
    g.mode = 'house';
    eq(HB.pulsar(G, 0, HB.MORDISCO), false, 'ni al que está en la casa');
  });

  test('sin modo azul cada mordisco vale lo mismo', function () {
    partidaHab(13, 20, CFG.DIR.LEFT);
    fantasmaEn(1, 14, 20);
    var base = G.score;
    HB.pulsar(G, 0, HB.MORDISCO);
    var primero = G.score - base;
    // se recarga a mano y se muerde otra vez: no debe escalar a 400
    HB.estado(0).cd[HB.MORDISCO] = 0;
    G.eatFreezeTicks = 0;
    base = G.score;
    fantasmaEn(2, 14, 20);
    HB.pulsar(G, 0, HB.MORDISCO);
    eq(G.score - base, primero, 'el segundo vale igual que el primero');
  });

  /* El dragón, el cofre y el ovni lanzan su golpe (llamarada, monedas, rayo)
   * solo si la Q ACIERTA: una Q al aire enseña los dientes y nada más. */
  test('la Q distingue el mordisco que acierta del que va al aire', function () {
    partidaHab(13, 20, CFG.DIR.LEFT);
    for (var i = 0; i < 4; i++) G.ghosts[i].mode = 'house';
    HB.pulsar(G, 0, HB.MORDISCO);
    ok(HB.conDientes(0), 'al aire: se ven los dientes');
    eq(HB.estado(0).mordio, false, 'pero no cuenta como acierto');
    partidaHab(13, 20, CFG.DIR.LEFT);
    fantasmaEn(1, 14, 20);
    ok(HB.pulsar(G, 0, HB.MORDISCO), 'este sí muerde');
    eq(HB.estado(0).mordio, true, 'y cuenta como acierto');
  });

  /* Al morder un fantasma el arcade escondía a Pac-Man durante el parón de
   * los puntos: en DESATADO el personaje desaparecía justo al usar la Q. */
  test('al morder con la Q el personaje no desaparece', function () {
    var s = window.PM.settings, skin0 = s.skin1;
    var viejo = G.drawPac, pintados = [];
    try {
      s.skin1 = 'dragon';
      partidaHab(13, 20, CFG.DIR.LEFT);
      fantasmaEn(1, 14, 20);
      ok(HB.pulsar(G, 0, HB.MORDISCO), 'muerde');
      ok(G.eatFreezeTicks > 0, 'hay parón de puntos');
      G.pacs[0].safeTicks = 0;             // sin el parpadeo de la gracia
      G.drawPac = function (c, pc, idx) { pintados.push(idx); };
      G.render();
      ok(pintados.indexOf(0) !== -1, 'y aun así se pinta al que ha mordido');
    } finally {
      G.drawPac = viejo;
      s.skin1 = skin0;
    }
  });

  test('W corre más y se apaga solo', function () {
    partidaHab();
    var normal = G.pacSpeedPx(G.pacs[0]);
    ok(HB.pulsar(G, 0, HB.TURBO), 'el turbo entra');
    var rapido = G.pacSpeedPx(G.pacs[0]);
    ok(rapido > normal * 1.4, 'corre bastante más: ' + rapido + ' vs ' + normal);
    ticks(HC.TURBO_TICKS + 2);
    eq(HB.conTurbo(0), false, 'se apaga al cabo de los 5 s');
    eq(G.pacSpeedPx(G.pacs[0]), normal, 'y vuelve a la velocidad de siempre');
  });

  test('E salta tres casillas atravesando la pared', function () {
    /* Fila 20, columna 6: pared a la derecha en el laberinto clásico. Se
     * comprueba contra el propio laberinto para no atarse a una casilla
     * concreta si algún día se toca. */
    partidaHab();
    var p = G.pacs[0];
    var col = null, fila = 20, c;
    for (c = 1; c < CFG.COLS - HC.FLASH_TILES - 1; c++) {
      if (CFG.isOpen(c, fila, false) && !CFG.isOpen(c + 1, fila, false) &&
          CFG.isOpen(c + HC.FLASH_TILES, fila, false)) { col = c; break; }
    }
    ok(col !== null, 'hay una pared que saltar en la fila ' + fila);
    p.x = col * CFG.TILE + CFG.TILE / 2;
    p.y = fila * CFG.TILE + CFG.TILE / 2;
    p.dir = CFG.DIR.RIGHT;
    p.nextDir = CFG.DIR.RIGHT;
    ok(HB.pulsar(G, 0, HB.FLASH), 'el flash entra');
    eq(p.tileX(), col + HC.FLASH_TILES, 'aterriza tres casillas más allá');
    eq(p.tileY(), fila, 'sin cambiar de fila');
  });

  /* Lo que pidió el jugador: la E va hacia LA ÚLTIMA FLECHA PULSADA, no
   * hacia donde mira Pac-Man. El caso que lo demuestra es el del pasillo
   * horizontal con muro arriba: pulsas arriba, Pac-Man no puede girar y
   * sigue de lado, y la E te sube atravesando ese muro. */
  test('E salta hacia la última flecha, no hacia donde se mira', function () {
    partidaHab();
    var p = G.pacs[0];
    // pasillo horizontal con muro justo encima y hueco tres filas arriba
    var col = null, fila = null, c, f;
    for (f = 4; f < CFG.ROWS - 4 && col === null; f++) {
      for (c = 1; c < CFG.COLS - 1; c++) {
        if (CFG.isOpen(c, f, false) && CFG.isOpen(c + 1, f, false) &&
            !CFG.isOpen(c, f - 1, false) && CFG.isOpen(c, f - 3, false)) {
          col = c; fila = f; break;
        }
      }
    }
    ok(col !== null, 'hay un pasillo con muro encima y hueco tres arriba');
    p.x = col * CFG.TILE + CFG.TILE / 2;
    p.y = fila * CFG.TILE + CFG.TILE / 2;
    p.dir = CFG.DIR.RIGHT;                 // mirando a la DERECHA
    G.setPacDir(0, CFG.DIR.UP);            // pero la última flecha es ARRIBA
    eq(p.dir, CFG.DIR.RIGHT, 'el muro no le deja girar: sigue mirando a la derecha');
    ok(HB.pulsar(G, 0, HB.FLASH), 'el flash entra');
    eq(p.tileY(), fila - CFG.HAB.FLASH_TILES, 'sube tres casillas');
    eq(p.tileX(), col, 'y no se mueve de columna');
  });

  test('sin flecha nueva, la E sigue yendo hacia donde se avanza', function () {
    partidaHab();
    var p = G.pacs[0];
    var col = null, fila = 20, c;
    for (c = 1; c < CFG.COLS - CFG.HAB.FLASH_TILES - 1; c++) {
      if (CFG.isOpen(c, fila, false) &&
          CFG.isOpen(c + CFG.HAB.FLASH_TILES, fila, false)) { col = c; break; }
    }
    p.x = col * CFG.TILE + CFG.TILE / 2;
    p.y = fila * CFG.TILE + CFG.TILE / 2;
    p.dir = CFG.DIR.RIGHT;
    p.nextDir = CFG.DIR.RIGHT;             // nada nuevo pedido
    ok(HB.pulsar(G, 0, HB.FLASH), 'el flash entra');
    eq(p.tileX(), col + CFG.HAB.FLASH_TILES, 'va hacia delante, como siempre');
  });

  test('E se come lo que pilla por el camino', function () {
    partidaHab();
    var p = G.pacs[0];
    // un pasillo recto y con pastillas: la fila de arriba del laberinto
    var fila = 1, col = 1;
    p.x = col * CFG.TILE + CFG.TILE / 2;
    p.y = fila * CFG.TILE + CFG.TILE / 2;
    p.dir = CFG.DIR.RIGHT;
    p.nextDir = CFG.DIR.RIGHT;
    var quedaban = G.dotsLeft;
    ok(HB.pulsar(G, 0, HB.FLASH), 'el flash entra');
    ok(G.dotsLeft < quedaban, 'se comió lo que había: ' +
       (quedaban - G.dotsLeft) + ' pastillas');
  });

  test('E no aterriza dentro de la casa de los fantasmas', function () {
    partidaHab();
    var p = G.pacs[0];
    var C = CFG.HOUSE;
    // justo encima de la puerta, mirando hacia abajo
    p.x = C.doorCols[0] * CFG.TILE + CFG.TILE / 2;
    p.y = (C.doorRow - 1) * CFG.TILE + CFG.TILE / 2;
    p.dir = CFG.DIR.DOWN;
    p.nextDir = CFG.DIR.DOWN;
    HB.pulsar(G, 0, HB.FLASH);
    var dentro = (p.tileY() >= C.top && p.tileY() <= C.bottom &&
                  p.tileX() >= C.left && p.tileX() <= C.right);
    ok(!dentro, 'no se queda encerrado en la casa');
  });

  test('E contra el borde no se gasta', function () {
    partidaHab();
    var p = G.pacs[0];
    p.x = 13 * CFG.TILE + CFG.TILE / 2;
    p.y = 1 * CFG.TILE + CFG.TILE / 2;
    p.dir = CFG.DIR.UP;          // arriba solo hay marco: no hay dónde caer
    p.nextDir = CFG.DIR.UP;
    eq(HB.pulsar(G, 0, HB.FLASH), false, 'no sale');
    ok(HB.lista(0, HB.FLASH), 'y sigue cargada');
  });

  test('R asusta a los cuatro sin superpastilla', function () {
    partidaHab();
    for (var i = 0; i < 4; i++) {
      G.ghosts[i].mode = 'normal';
      G.ghosts[i].frightened = false;
    }
    var pastillas = G.dotsLeft;
    ok(HB.pulsar(G, 0, HB.GRITO), 'el grito entra');
    eq(G.frightTicks, HC.SHOUT_SECS * 60, 'dura lo suyo, no lo del nivel');
    for (i = 0; i < 4; i++) ok(G.ghosts[i].frightened, 'el fantasma ' + i + ' se asusta');
    eq(G.dotsLeft, pastillas, 'sin gastar ninguna superpastilla');
  });

  test('el grito dura lo mismo en el nivel 18 que en el 1', function () {
    partidaHab();
    G.level = 18;
    G.speedRow = CFG.speedRow(18);
    HB.pulsar(G, 0, HB.GRITO);
    eq(G.frightTicks, HC.SHOUT_SECS * 60, 'los 4 s no dependen del nivel');
  });

  test('la recarga baja jugando y no en pausa', function () {
    partidaHab();
    HB.pulsar(G, 0, HB.TURBO);
    var tras = HB.estado(0).cd[HB.TURBO];
    ticks(60);
    var jugando = HB.estado(0).cd[HB.TURBO];
    eq(jugando, tras - 60, 'baja un segundo por segundo');
    G.paused = true;
    ticks(60);
    eq(HB.estado(0).cd[HB.TURBO], jugando, 'en pausa no baja');
    G.paused = false;
  });

  test('recargando, la tecla no hace nada', function () {
    partidaHab();
    HB.pulsar(G, 0, HB.TURBO);
    HB.estado(0).turbo = 0;                 // se apaga el efecto, no la recarga
    eq(HB.pulsar(G, 0, HB.TURBO), false, 'la segunda no entra');
  });

  test('morir se lleva el turbo pero no la recarga', function () {
    partidaHab();
    HB.pulsar(G, 0, HB.TURBO);
    ok(HB.conTurbo(0), 'con turbo');
    var cd = HB.estado(0).cd[HB.TURBO];
    G.respawn();
    eq(HB.conTurbo(0), false, 'el turbo se corta al morir');
    eq(HB.estado(0).cd[HB.TURBO], cd, 'la recarga sigue donde estaba');
  });

  test('una partida de poderes no toca el top mundial ni el récord', function () {
    partidaHab();
    var antes = G.recordFor(1);
    G.score = antes + 100000;
    G.highScore = G.score;
    G.persistHighScore();
    eq(G.recordFor(1), antes, 'el récord de 1 jugador no se mueve');
    eq(G.canTimeRecord(), false, 'ni el récord de velocidad del nivel 1');
  });

  /* ---------- maestrías de LABERINTOS y DESATADO ---------- */
  test('laberintos y habilidades tienen su récord, aparte del de siempre', function () {
    var B = window.PM.Badges;
    var r = [G.highScore1, G.recordModo('lab'), G.recordModo('hab')];
    try {
      G.highScore1 = 0;
      G.setRecordModo('lab', 0);
      G.setRecordModo('hab', 0);

      // una partida en otro laberinto NO toca el récord de 1 jugador
      var mz = window.PM.Mazes && window.PM.Mazes.LIST[0];
      ok(mz, 'hay laberintos alternativos');
      window.PM.settings.muted = true;
      G.newGame({ players: 1, maze: mz.id });
      G.score = 20000; G.highScore = 20000;
      G.persistHighScore();
      eq(G.recordFor(1), 0, 'el récord del laberinto de 1980 sigue intacto');
      eq(G.recordModo('lab'), 20000, 'y el de LABERINTOS se queda la marca');

      // una de poderes tampoco, y va a la suya
      G.newGame({ players: 1, hab: true });
      G.score = 30000; G.highScore = 30000;
      G.persistHighScore();
      eq(G.recordFor(1), 0, 'el de 1 jugador sigue sin moverse');
      eq(G.recordModo('lab'), 20000, 'y el de laberintos tampoco');
      eq(G.recordModo('hab'), 30000, 'DESATADO guarda la suya');
      G.toMenu();
    } finally {
      G.highScore1 = r[0];
      G.setRecordModo('lab', r[1]);
      G.setRecordModo('hab', r[2]);
    }
  });

  test('cada modo aparte tiene su propia ruta de maestrías', function () {
    conContadores(function () {        // sin récords por rol de otras pruebas
    var B = window.PM.Badges;
    var r = [G.highScore1, G.recordModo('lab'), G.recordModo('hab')];
    try {
      G.highScore1 = 0;
      G.setRecordModo('lab', 9000);    // laberintos: escalón normal
      G.setRecordModo('hab', 9000);    // habilidades: escalones propios
      eq(B.best('lab'), 9000, 'la ruta de laberintos lee su récord');
      eq(B.best('hab'), 9000, 'y la de poderes el suyo');
      eq(B.mult('lab'), 1, 'laberintos usa el escalón de siempre');
      eq(B.mult('hab'), 1, 'habilidades no multiplica: tiene tabla propia');
      eq(B.goal({ id: 'leyenda', points: 60000 }, 'hab'), 100000,
         'LEYENDA en DESATADO son 100.000');
      eq(B.goal({ id: 'leyenda', points: 60000 }, 'hab2'), 125000,
         'y en dúo, x1,25, como en cualquier ruta');
      eq(B.top('lab').id, 'cazador', '9.000 en laberintos: CAZADOR');
      eq(B.top('hab').id, 'aprendiz', 'los mismos 9.000 en habilidades: APRENDIZ');
      eq(B.top('solo'), null, 'y en solo, ninguna: ahí no se ha jugado');
      ok(!B.has('cazador', 'hab'), 'lo de laberintos no cuenta en habilidades');
    } finally {
      G.highScore1 = r[0];
      G.setRecordModo('lab', r[1]);
      G.setRecordModo('hab', r[2]);
    }
    });
  });

  test('la cuenta se lleva también los récords de los modos aparte', function () {
    var Ac = window.PM.Account;
    var r = [G.recordModo('lab'), G.recordModo('hab')];
    var flags = [Ac.sinRecordsNuevos, Ac.sinModos];
    try {
      Ac.sinRecordsNuevos = false;
      Ac.sinModos = false;
      ok(Ac.perfilCols().indexOf('record_lab') !== -1, 'se piden al servidor');
      ok(Ac.perfilCols().indexOf('record_hab') !== -1);
      G.setRecordModo('lab', 12345);
      G.setRecordModo('hab', 6789);
      var o = Ac.localState();
      eq(o.record_lab, 12345, 'y se suben');
      eq(o.record_hab, 6789);
      /* Servidor sin esas columnas todavía: se mandan sin ellas en vez de
       * no guardar nada. Es lo que pasa si alguien monta esto en otro
       * Supabase y no ha corrido supabase/cuentas.sql. */
      Ac.sinModos = true;
      ok(Ac.perfilCols().indexOf('record_lab') === -1, 'sin la columna, no se pide');
      var o2 = Ac.localState();
      ok(!o2.hasOwnProperty('record_lab'), 'ni se manda');
      eq(o2.record1 !== undefined, true, 'pero lo de siempre sigue subiendo');
    } finally {
      G.setRecordModo('lab', r[0]);
      G.setRecordModo('hab', r[1]);
      Ac.sinRecordsNuevos = flags[0];
      Ac.sinModos = flags[1];
    }
  });

  test('la partida sabe a qué ruta de maestrías cuenta', function () {
    window.PM.settings.muted = true;
    function rutaDe(opts) {
      G.newGame(opts);
      var m = G.badgeMode();
      G.toMenu();
      return m;
    }
    eq(rutaDe({ players: 1 }), 'solo', 'una normal, a solo');
    eq(rutaDe({ players: 2 }), 'duo', 'la de dos, a dúo');
    eq(rutaDe({ players: 1, hab: true }), 'hab', 'la de poderes en solo, a DESATADO');
    /* Aquí está lo nuevo: el mundo Y el formato. Una party de poderes no
     * cuenta en la misma ruta que jugar solo con poderes, igual que un dúo
     * clásico no cuenta en la de un jugador. */
    eq(rutaDe({ players: 2, hab: true }), 'hab2',
       'una party de poderes va a la de DESATADO en dúo');
    eq(rutaDe({ players: 4, hab: true }), 'hab4', 'y una de cuatro, a la de escuadra');
    var mz = window.PM.Mazes && window.PM.Mazes.LIST[0];
    if (mz) {
      eq(rutaDe({ players: 1, maze: mz.id }), 'lab', 'otro trazado en solo, a LABERINTOS');
      eq(rutaDe({ players: 3, maze: mz.id }), 'lab3', 'y en trío, a la de trío');
    }
  });

  /* Doce rutas: el listón lo marcan las dos cosas a la vez, el formato y el
   * mundo. Escuadra en DESATADO es lo más caro que hay (su tabla propia, x1,75). */
  test('el listón de una ruta cruza el formato con el mundo', function () {
    var B = window.PM.Badges;
    var aprendiz = CFG.BADGES[0];
    eq(B.goal(aprendiz, 'lab'), 3000, 'laberintos en solo: el escalón de siempre');
    eq(B.goal(aprendiz, 'lab3'), 4500, 'en trío, x1,5');
    eq(B.goal(aprendiz, 'hab'), 5000, 'desatado en solo: el suyo, más alto');
    eq(B.goal(aprendiz, 'hab4'), 8750, 'y en escuadra, x1,75 el suyo');
    eq(B.mundoDe('hab3'), 'hab');
    eq(B.players('hab3'), 3);
    eq(B.modeName('hab3'), 'DESATADO · TRÍO');
    eq(B.modeName('duo'), 'DÚO', 'el clásico no repite su nombre');
  });

  /* Cada casilla de la tabla guarda lo suyo: la marca de un trío de
   * laberintos no se ve desde la ruta de solo ni desde la de DESATADO. */
  test('cada mundo aparte guarda su récord por formato', function () {
    var B = window.PM.Badges;
    var r = [];
    var m, n;
    for (m = 0; m < 2; m++) {
      for (n = 1; n <= 4; n++) r.push(G.recordModo(m ? 'hab' : 'lab', n));
    }
    try {
      for (m = 0; m < 2; m++) {
        for (n = 1; n <= 4; n++) G.setRecordModo(m ? 'hab' : 'lab', 0, n);
      }
      window.PM.settings.muted = true;
      var mz = window.PM.Mazes && window.PM.Mazes.LIST[0];
      ok(mz, 'hay laberintos alternativos');
      G.newGame({ players: 3, maze: mz.id });
      G.score = 21000; G.highScore = 21000;
      G.persistHighScore();
      G.toMenu();
      eq(G.recordModo('lab', 3), 21000, 'la marca del trío va a la del trío');
      eq(G.recordModo('lab', 1), 0, 'y no toca la de solo');
      eq(G.recordModo('hab', 3), 0, 'ni la del otro mundo');
      eq(B.best('lab3'), 21000, 'la ruta lee su casilla');
      eq(B.top('lab3').id, 'cazador', '21.000 entre tres: CAZADOR (12.000); EXPERTO pide 22.500');
      eq(B.top('lab'), null, 'y en la de solo, ninguna');
    } finally {
      var i = 0;
      for (m = 0; m < 2; m++) {
        for (n = 1; n <= 4; n++) G.setRecordModo(m ? 'hab' : 'lab', r[i++], n);
      }
    }
  });

  test('la cuenta sube los récords de las doce rutas', function () {
    var Ac = window.PM.Account;
    var r = [G.recordModo('lab', 2), G.recordModo('hab', 4)];
    var flags = [Ac.sinModos, Ac.sinModosFmt];
    try {
      Ac.sinModos = false;
      Ac.sinModosFmt = false;
      ok(Ac.perfilCols().indexOf('record_lab2') !== -1, 'se piden al servidor');
      ok(Ac.perfilCols().indexOf('record_hab4') !== -1);
      G.setRecordModo('lab', 4321, 2);
      G.setRecordModo('hab', 8765, 4);
      var o = Ac.localState();
      eq(o.record_lab2, 4321, 'y se suben');
      eq(o.record_hab4, 8765);
      /* Servidor con las columnas viejas pero sin el reparto por formato: se
       * mandan las de solo y se callan las otras seis, en vez de no guardar
       * nada. Es lo que pasa si alguien monta esto en otro Supabase y no ha
       * vuelto a correr supabase/cuentas.sql. */
      Ac.sinModosFmt = true;
      ok(Ac.perfilCols().indexOf('record_lab2') === -1, 'sin la columna, no se pide');
      ok(Ac.perfilCols().indexOf('record_lab') !== -1, 'pero la de solo sí');
      var o2 = Ac.localState();
      ok(!o2.hasOwnProperty('record_lab2'), 'ni se manda');
      ok(o2.hasOwnProperty('record_lab'), 'y la de solo sigue subiendo');
    } finally {
      G.setRecordModo('lab', r[0], 2);
      G.setRecordModo('hab', r[1], 4);
      Ac.sinModos = flags[0];
      Ac.sinModosFmt = flags[1];
    }
  });

  test('la repetición guarda y devuelve las habilidades', function () {
    var R = window.PM.Replay;
    var rep = {
      v: R.V, modo: 'hab', semilla: null, nivel: 1, jugadores: 1,
      ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 3 },
      nombres: ['YO'], fecha: new Date().toISOString(),
      entradas: [[10, 0, CFG.DIR.LEFT], [30, 0, 4], [45, 0, 7]],
      final: { puntos: 1200, nivel: 1, fantasmas: 2, tiempoMs: 9000 }
    };
    var texto = R.serializar(rep);
    ok(texto, 'se serializa');
    var leida = R.leer(texto);
    ok(leida, 'y se vuelve a leer');
    eq(leida.modo, 'hab', 'con su modo');
    eq(leida.entradas.length, 3, 'con las tres entradas');
    eq(leida.entradas[1][2], 4, 'la Q sigue siendo la Q');
    eq(leida.entradas[2][2], 7, 'y la R la R');
  });

  /* La de verdad: una partida entera del modo, con las cuatro teclas
   * pulsadas por el camino, tiene que salir CLAVADA al reproducirla. Es lo
   * que dice que una habilidad es una entrada más y no un capricho que
   * rompe el determinismo del motor. */
  test('una partida de poderes se reproduce exacta', function () {
    var R = window.PM.Replay;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      // [tick, tipo, valor] — 'd' giro, 'h' habilidad
      var guion = [[5, 'd', 1], [40, 'h', 1], [70, 'd', 0], [120, 'h', 2],
                   [160, 'd', 3], [230, 'h', 0], [300, 'd', 2], [380, 'h', 3],
                   [450, 'd', 1], [520, 'h', 1], [600, 'd', 0], [700, 'h', 2],
                   [800, 'd', 3], [900, 'h', 0], [1000, 'd', 2], [1150, 'd', 1],
                   [1300, 'h', 1], [1400, 'd', 0]];
      var TOTAL = 1500;

      function corre(conGuion) {
        G.state = 'PLAYING';
        G.readyTicks = 0;
        var k = 0;
        for (var i = 0; i < TOTAL; i++) {
          if (conGuion) {
            while (k < guion.length && guion[k][0] === i) {
              if (guion[k][1] === 'h') HB.pulsar(G, 0, guion[k][2]);
              else G.setPacDir(0, guion[k][2]);
              k++;
            }
          }
          G.step();
        }
      }

      G.newGame({ players: 1, hab: true });
      var rep = R.enCurso();
      ok(rep, 'la partida se graba sola');
      eq(rep.modo, 'hab', 'y se graba como partida de poderes');
      corre(true);
      var pts = G.score, niv = G.level, quedan = G.dotsLeft, vidas = G.lives;
      ok(pts > 0, 'la partida grabada hizo puntos');
      var poderes = rep.entradas.filter(function (e) { return e[2] >= 4; }).length;
      ok(poderes > 0, 'quedaron habilidades apuntadas: ' + poderes);
      if (!rep.final) {
        rep.final = { puntos: pts, nivel: niv, fantasmas: G.runGhosts,
                      tiempoMs: Math.round(G.timeTicks * 1000 / 60) };
      }

      var leida = R.leer(R.serializar(rep));
      ok(leida, 'la repetición pasa por el texto y vuelve');
      eq(leida.modo, 'hab', 'con su modo intacto');
      ok(R.ver(leida), 'la repetición arranca');
      ok(G.hab, 'y arranca EN el modo habilidades');
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

  /* Y la misma prueba con DOS en el mismo teclado, que es donde el formato se
   * juega algo nuevo: los poderes del J2 se codifican con otras letras
   * (W..Z frente a A..D), y si esa mitad estuviera mal la partida saldría
   * distinta al reproducirla en vez de dar un error. */
  test('una partida de poderes A DOS se reproduce exacta', function () {
    var R = window.PM.Replay;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      // [tick, jugador, tipo, valor] — 'd' giro, 'h' poder
      var guion = [
        [5, 0, 'd', 1], [8, 1, 'd', 3], [40, 0, 'h', 1], [55, 1, 'h', 1],
        [70, 0, 'd', 0], [90, 1, 'd', 0], [120, 0, 'h', 2], [140, 1, 'h', 2],
        [160, 0, 'd', 3], [200, 1, 'd', 1], [230, 0, 'h', 0], [260, 1, 'h', 0],
        [300, 0, 'd', 2], [340, 1, 'd', 2], [380, 0, 'h', 3], [420, 1, 'h', 3],
        [450, 0, 'd', 1], [500, 1, 'd', 3], [600, 0, 'd', 0], [700, 1, 'd', 0]
      ];
      var TOTAL = 900;

      function corre(conGuion) {
        G.state = 'PLAYING';
        G.readyTicks = 0;
        var k = 0;
        for (var i = 0; i < TOTAL; i++) {
          if (conGuion) {
            while (k < guion.length && guion[k][0] === i) {
              var q = guion[k];
              if (q[2] === 'h') HB.pulsar(G, q[1], q[3]);
              else G.setPacDir(q[1], q[3]);
              k++;
            }
          }
          G.step();
        }
      }

      G.newGame({ players: 2, hab: true });
      var rep = R.enCurso();
      ok(rep, 'el dúo de poderes también se graba');
      eq(rep.modo, 'habduo', 'con su modo propio');
      corre(true);
      var pts = G.score, niv = G.level, quedan = G.dotsLeft;
      ok(pts > 0, 'la partida grabada hizo puntos');
      var deJ2 = rep.entradas.filter(function (e) {
        return e[2] >= 4 && e[1] === 1;
      }).length;
      ok(deJ2 > 0, 'quedaron poderes del J2 apuntados: ' + deJ2);
      if (!rep.final) {
        rep.final = { puntos: pts, nivel: niv, fantasmas: G.runGhosts,
                      tiempoMs: Math.round(G.timeTicks * 1000 / 60) };
      }

      var leida = R.leer(R.serializar(rep));
      ok(leida, 'la repetición pasa por el texto y vuelve');
      eq(leida.modo, 'habduo', 'con su modo intacto');
      ok(R.ver(leida), 'la repetición arranca');
      ok(G.hab, 'y arranca EN el modo de poderes');
      eq(G.playerCount, 2, 'con los dos jugadores');
      corre(false);
      eq(G.score, pts, 'LA PUNTUACIÓN NO CUADRA: el determinismo está roto');
      eq(G.level, niv, 'el nivel no cuadra');
      eq(G.dotsLeft, quedan, 'las pastillas comidas no cuadran');
    } finally {
      window.PM.Replay.salir();
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  test('una repetición normal no admite entradas de habilidad', function () {
    var R = window.PM.Replay;
    var rep = {
      v: R.V, modo: 'solo', semilla: null, nivel: 1, jugadores: 1,
      ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 3 },
      nombres: ['YO'], fecha: new Date().toISOString(),
      entradas: [[10, 0, 5]],
      final: { puntos: 100, nivel: 1, fantasmas: 0, tiempoMs: 900 }
    };
    eq(R.serializar(rep), '', 'se rechaza');
  });

  // ---------------------------------------------------------------
  // DESATADO: los sonidos de los poderes (js/audio.js)
  //
  // Los cuatro eran MUDOS salvo por lo que arrastraban de rebote, y justo los
  // dos que no tocan el marcador —turbo y flash— no sonaban nada. Aquí se
  // vigila que cada uno pida el suyo: no se puede oír en una prueba, pero sí
  // se puede comprobar que se llama.
  // ---------------------------------------------------------------

  /* Cambia AudioSys por un espía y devuelve la lista de lo que se pidió, con
   * el volumen de cada uno: los poderes suenan enteros cuando son tuyos y al
   * 10% cuando son de otro, y eso hay que poder comprobarlo. */
  var SONIDOS_HAB = ['playBite', 'playBiteMiss', 'playTurbo', 'playFlash',
                     'playShout', 'playCharge', 'playStealth'];

  function espiaAudio(fn) {
    var A = window.AudioSys;
    if (!A) return { nombres: [], vol: {} };
    var pedidos = [], vol = {};
    var previos = {};
    SONIDOS_HAB.forEach(function (n) {
      previos[n] = A[n];
      A[n] = function (esc) {
        pedidos.push(n);
        vol[n] = (esc === undefined) ? 1 : esc;
      };
    });
    try { fn(); } finally {
      SONIDOS_HAB.forEach(function (n) { A[n] = previos[n]; });
    }
    return { nombres: pedidos, vol: vol };
  }

  test('AudioSys tiene un sonido por poder', function () {
    var A = window.AudioSys;
    ok(A, 'hay sistema de audio');
    ['playBite', 'playBiteMiss', 'playTurbo', 'playFlash', 'playShout',
     'playCharge', 'playStealth'].forEach(function (n) {
      eq(typeof A[n], 'function', n + ' existe');
    });
  });

  test('cada poder de DESATADO pide su propio sonido', function () {
    var oidos = espiaAudio(function () {
      partidaHab(13, 20, CFG.DIR.LEFT);
      fantasmaEn(1, 14, 20);
      HB.pulsar(G, 0, HB.MORDISCO);
      G.eatFreezeTicks = 0;
      HB.pulsar(G, 0, HB.TURBO);
    });
    ok(oidos.nombres.indexOf('playBite') !== -1, 'la Q suena al acertar');
    ok(oidos.nombres.indexOf('playTurbo') !== -1, 'la W ya no es muda');
    eq(oidos.vol.playBite, 1, 'y los tuyos suenan enteros');
  });

  test('el turbo y el flash, que no tocan el marcador, también suenan', function () {
    var oidos = espiaAudio(function () {
      partidaHab();
      var p = G.pacs[0];
      var col = null, fila = 20, c;
      for (c = 1; c < CFG.COLS - HC.FLASH_TILES - 1; c++) {
        if (CFG.isOpen(c, fila, false) &&
            CFG.isOpen(c + HC.FLASH_TILES, fila, false)) { col = c; break; }
      }
      p.x = col * CFG.TILE + CFG.TILE / 2;
      p.y = fila * CFG.TILE + CFG.TILE / 2;
      p.dir = CFG.DIR.RIGHT; p.nextDir = CFG.DIR.RIGHT;
      HB.pulsar(G, 0, HB.FLASH);
      HB.pulsar(G, 0, HB.GRITO);
    });
    ok(oidos.nombres.indexOf('playFlash') !== -1, 'la E suena');
    ok(oidos.nombres.indexOf('playShout') !== -1,
       'y la R también, aparte del modo azul');
  });

  /* La dentellada al aire suena EN EL ACTO, aunque la Q se quede armada
   * después (CFG.HAB.BITE_BUFFER): el golpe ocurre en ese tick y los dientes
   * salen con él. Esperar al final del margen se notaría —a partir de un
   * décimo de segundo el sonido se despega de la tecla— y no describiría lo
   * que se está viendo. */
  test('un mordisco al aire suena DISTINTO al que acierta', function () {
    var oidos = espiaAudio(function () {
      partidaHab(13, 20, CFG.DIR.LEFT);
      for (var i = 0; i < 4; i++) G.ghosts[i].mode = 'house';
      HB.pulsar(G, 0, HB.MORDISCO);
    });
    ok(oidos.nombres.indexOf('playBiteMiss') !== -1, 'suena el fallo, y ya');
    ok(oidos.nombres.indexOf('playBite') === -1, 'y no el de acertar');
  });

  /* Si la Q armada acaba acertando son DOS dentelladas, y se oyen las dos: el
   * "chas" sordo del aire y, un instante después, el mordisco bueno. */
  test('la Q armada que acierta suena a segunda dentellada', function () {
    var oidos = espiaAudio(function () {
      partidaHab(13, 20, CFG.DIR.RIGHT);
      var g = fantasmaEn(1, 17, 20);
      HB.pulsar(G, 0, HB.MORDISCO);       // al aire: todavía no llega
      g.x = 15 * CFG.TILE + CFG.TILE / 2;
      ticks(1);
    });
    ok(oidos.nombres.indexOf('playBiteMiss') !== -1, 'primero el aire');
    ok(oidos.nombres.indexOf('playBite') !== -1, 'y después el mordisco');
  });

  /* Los poderes de los DEMÁS también se oyen —que a alguien le quede una
   * habilidad menos es información de la partida— pero bajitos, o una party de
   * cuatro son dieciséis teclas peleándose con el waka. */
  test('los poderes de otro jugador suenan, pero al 10%', function () {
    var oidos = espiaAudio(function () {
      window.PM.settings.muted = true;
      G.newGame({ players: 2, hab: true, net: 'guest', names: ['UNO', 'DOS'] });
      G.localIdx = 1;
      G.state = 'PLAYING';
      G.readyTicks = 0;
      // llega el eco de que el OTRO ha usado el turbo
      HB.evento(G, 0, HB.TURBO);
    });
    ok(oidos.nombres.indexOf('playTurbo') !== -1, 'se oye');
    eq(oidos.vol.playTurbo, CFG.HAB.VOL_AJENO, 'pero al volumen de los ajenos');
    G.toMenu();
  });

  test('el eco de TU propio poder no suena dos veces', function () {
    var oidos = espiaAudio(function () {
      window.PM.settings.muted = true;
      G.newGame({ players: 2, hab: true, net: 'guest', names: ['UNO', 'DOS'] });
      G.localIdx = 1;
      G.state = 'PLAYING';
      G.readyTicks = 0;
      HB.evento(G, 1, HB.TURBO);      // el eco del mío: ya está aplicado
    });
    eq(oidos.nombres.length, 0, 'el eco propio no suena');
    G.toMenu();
  });

  test('el anfitrión oye bajito el poder que le pide un invitado', function () {
    var oidos = espiaAudio(function () {
      window.PM.settings.muted = true;
      G.newGame({ players: 2, hab: true, net: 'host', names: ['UNO', 'DOS'],
                  roles: ['tanque', 'asesino'] });
      G.state = 'PLAYING';
      G.readyTicks = 0;
      G.pacs[1].safeTicks = 999999;
      HB.peticion(G, 1, HB.FLASH);    // lo pide el invitado
    });
    ok(oidos.nombres.indexOf('playFlash') !== -1, 'lo oye');
    eq(oidos.vol.playFlash, CFG.HAB.VOL_AJENO, 'al volumen de los ajenos');
    G.toMenu();
  });

  test('con dos en el mismo teclado los dos suenan enteros', function () {
    var oidos = espiaAudio(function () {
      partidaHab2(undefined, ['tanque', 'asesino']);
      HB.pulsar(G, 1, HB.TURBO);      // el del J2, que está aquí al lado
    });
    ok(oidos.nombres.indexOf('playTurbo') !== -1, 'suena');
    eq(oidos.vol.playTurbo, 1,
       'entero: los dos juegan en esta pantalla, no hay "el otro"');
  });

  // ---------------------------------------------------------------
  // DESATADO con dos en el mismo teclado
  //
  // No estaba porque la W era el "arriba" del J2 y el turbo del J1. Ahora cada
  // jugador tiene una fila entera en su mitad (CFG.HAB.KEYS_2P).
  // ---------------------------------------------------------------

  /* Partida de poderes a dos. `ghost2` = fantasma del J2 (-1 = Pac-Man). */
  /* 18 sep: ya no se repiten roles, así que el J2 no puede ser Asesino por
   * defecto (lo es el J1). Las pruebas que van del kit del J2 le dan el
   * Asesino a él con roles: ['tanque', 'asesino']. */
  function partidaHab2(ghost2, roles) {
    window.PM.settings.muted = true;
    G.newGame({ players: 2, hab: true, roles: roles || null,
                ghosts: [-1, ghost2 === undefined ? -1 : ghost2] });
    G.state = 'PLAYING';
    G.readyTicks = 0;
    for (var i = 0; i < G.pacs.length; i++) G.pacs[i].safeTicks = 999999;
    return G;
  }

  test('las teclas de los dos jugadores no se pisan entre ellas ni con WASD',
    function () {
      var t = CFG.HAB.KEYS_2P;
      eq(t.length, 2, 'hay un juego de teclas por jugador');
      eq(t[0].length, CFG.HAB.LIST.length, 'el J1 tiene una por poder');
      eq(t[1].length, CFG.HAB.LIST.length, 'y el J2 también');
      var vistas = {};
      var wasd = { W: 1, A: 1, S: 1, D: 1 };
      for (var j = 0; j < 2; j++) {
        for (var k = 0; k < t[j].length; k++) {
          var tecla = String(t[j][k]).toUpperCase();
          ok(!vistas[tecla], 'la tecla ' + tecla + ' no está repetida');
          vistas[tecla] = 1;
          /* Lo que rompía el modo en dúo: el J2 se mueve con WASD, así que
           * ninguna de las ocho puede ser una de esas cuatro. */
          ok(!wasd[tecla], tecla + ' no choca con el WASD del J2');
        }
      }
    });

  test('la barra enseña un grupo por jugador, y solo cuando hacen falta dos',
    function () {
      var UI = window.PM.UI;
      partidaHab();                     // un jugador
      UI.refreshHabBar();
      ok(UI.habGroups && UI.habGroups.length === 2, 'los dos grupos existen');
      eq(UI.habGroups[1].caja.style.display, 'none', 'el segundo está apagado');
      eq(UI.habGroups[0].quien.style.display, 'none',
         'y sin etiqueta J1: con una sola fila no hay nada que distinguir');
      eq(UI.habIdxDe(0), 0, 'el único grupo es del jugador local');

      partidaHab2();                    // dos en el mismo teclado
      UI.refreshHabBar();
      ok(UI.habGroups[1].caja.style.display !== 'none', 'ahora hay dos filas');
      ok(UI.habGroups[0].quien.style.display !== 'none', 'con su etiqueta');
      eq(UI.habIdxDe(1), 1, 'el segundo grupo es del J2');
      eq(UI.habGroups[1].btns[0].key.textContent, CFG.HAB.KEYS_2P[1][0],
         'y enseña la tecla del J2, no la Q');
    });

  test('en dúo cada jugador tiene sus cuatro poderes y su propia recarga',
    function () {
      partidaHab2(undefined, ['tanque', 'asesino']);
      eq(HB.cuantas(G, 0), 4, 'el J1 tiene cuatro');
      eq(HB.cuantas(G, 1), 4, 'y el J2 también');
      ok(HB.pulsar(G, 1, HB.TURBO), 'el J2 puede lanzar el suyo');
      ok(HB.conTurbo(1), 'y le afecta a él');
      ok(!HB.conTurbo(0), 'no al J1');
      ok(!HB.lista(1, HB.TURBO), 'el J2 se queda recargando');
      ok(HB.lista(0, HB.TURBO), 'y el J1 sigue con la suya entera');
    });

  test('el turbo del J2 acelera al J2, no al J1', function () {
    partidaHab2(undefined, ['tanque', 'asesino']);
    var v0 = G.pacSpeedPx(G.pacs[0]);
    var v1 = G.pacSpeedPx(G.pacs[1]);
    HB.pulsar(G, 1, HB.TURBO);
    eq(G.pacSpeedPx(G.pacs[0]), v0, 'el J1 va igual que antes');
    ok(G.pacSpeedPx(G.pacs[1]) > v1, 'el J2 corre más');
  });

  // ---------------------------------------------------------------
  // PAC-MAN VS. con poderes: el fantasma también tiene los suyos
  //
  // Tampoco estaba, y por otro motivo: morder de un toque a un fantasma que
  // lleva una persona, sin que pueda hacer nada, no es una pelea.
  // ---------------------------------------------------------------

  test('quien lleva fantasma tiene SU lista de dos, no la de Pac-Man',
    function () {
      partidaHab2(0);
      ok(G.isVersus(), 'es una de VS.');
      eq(G.vsGhostOf(1), 0, 'el J2 lleva a BLINKY');
      eq(HB.cuantas(G, 1), 2, 'y tiene dos poderes');
      eq(HB.cuantas(G, 0), 4, 'el que lleva Pac-Man sigue con cuatro');
      eq(HB.listaDe(G, 1)[0].name, 'EMBESTIDA');
      eq(HB.listaDe(G, 1)[1].name, 'ACECHO');
      /* Y no se le puede colar una tercera, ni desde el teclado ni por red:
       * es lo que impide que un invitado pida el FLASH llevando un fantasma. */
      eq(HB.puede(G, 1, 2), false, 'la tercera tecla no existe para él');
      eq(HB.puede(G, 1, 3), false, 'ni la cuarta');
    });

  test('la EMBESTIDA acelera al fantasma humano y se apaga sola', function () {
    partidaHab2(0);
    var g = G.ghosts[0];
    g.mode = 'normal';
    g.frightened = false;
    var normal = g.speedPx(G);
    ok(HB.pulsar(G, 1, HB.EMBESTIDA), 'la embestida entra');
    var rapido = g.speedPx(G);
    ok(rapido > normal, 'el fantasma corre más: ' + rapido + ' vs ' + normal);
    eq(Math.round(rapido / normal * 100) / 100, CFG.HAB.CHARGE_MULT,
       'exactamente lo acordado');
    ticks(CFG.HAB.CHARGE_TICKS + 2);
    eq(HB.conCarga(1), false, 'se apaga al cabo de sus segundos');
    eq(g.speedPx(G), normal, 'y vuelve a la velocidad de siempre');
  });

  test('la EMBESTIDA de una persona no acelera a los fantasmas de la máquina',
    function () {
      partidaHab2(0);
      var otro = G.ghosts[2];
      otro.mode = 'normal';
      otro.frightened = false;
      var normal = otro.speedPx(G);
      HB.pulsar(G, 1, HB.EMBESTIDA);
      eq(otro.speedPx(G), normal, 'el que lleva la máquina va igual');
    });

  test('el ACECHO esconde al fantasma y le quita la marca', function () {
    partidaHab2(0);
    G.ghosts[0].mode = 'normal';
    eq(HB.alfaFantasma(G, 0), 1, 'de normal se ve entero');
    ok(HB.marcaVisible(G, 0), 'y con su marca encima');
    ok(HB.pulsar(G, 1, HB.ACECHO), 'el acecho entra');
    ok(HB.alfaFantasma(G, 0) < 1, 'ahora se ve a medias');
    /* En local no hay "jugador propio" —los dos están en este teclado— así que
     * la marca se queda: esconderse de uno mismo no es una habilidad. Lo que
     * de verdad cuenta es el caso de red, que va en la prueba siguiente. */
    ticks(CFG.HAB.STALK_TICKS + 2);
    eq(HB.conAcecho(1), false, 'y se acaba solo');
    eq(HB.alfaFantasma(G, 0), 1, 'volviendo a verse entero');
  });

  test('en online el ACECHO esconde al fantasma del OTRO, no al tuyo',
    function () {
      window.PM.settings.muted = true;
      G.newGame({ players: 2, hab: true, net: 'guest', names: ['UNO', 'DOS'],
                  ghosts: [-1, 0] });
      G.localIdx = 0;                 // aquí juega el que lleva Pac-Man
      G.state = 'PLAYING';
      G.readyTicks = 0;
      G.ghosts[0].mode = 'normal';
      HB.marcarAcecho(1);             // el otro se pone en acecho
      ok(HB.alfaFantasma(G, 0) <= CFG.HAB.STALK_ALPHA,
         'desde aquí casi no se le ve');
      ok(!HB.marcaVisible(G, 0), 'y sin la marca que lo delataba');
      G.localIdx = 1;                 // ahora mira quien lo lleva
      ok(HB.alfaFantasma(G, 0) > CFG.HAB.STALK_ALPHA,
         'él se ve a sí mismo mejor');
      ok(HB.marcaVisible(G, 0), 'y conserva su marca para no perderse');
      G.toMenu();
    });

  test('los fantasmas de una partida sin poderes no cambian de velocidad',
    function () {
      partida(1);
      var g = G.ghosts[0];
      g.mode = 'normal';
      g.frightened = false;
      var antes = g.speedPx(G);
      eq(window.PM.Hab.multVelFantasma(G, 0), 1, 'fuera del modo, nada');
      eq(g.speedPx(G), antes, 'la velocidad es la de siempre');
    });

  // ---------------------------------------------------------------
  // Repeticiones: DESATADO a dos y enlaces
  // ---------------------------------------------------------------

  test('una repetición de DESATADO a dos guarda los poderes de los DOS',
    function () {
      var R = window.PM.Replay;
      var rep = {
        v: R.V, modo: 'habduo', semilla: null, nivel: 1, jugadores: 2,
        ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 3 },
        nombres: ['UNO', 'DOS'], fecha: new Date().toISOString(),
        entradas: [[10, 0, 4], [12, 1, 5], [20, 1, 3], [30, 0, 7], [40, 1, 6]],
        final: { puntos: 100, nivel: 1, fantasmas: 0, tiempoMs: 900 }
      };
      var texto = R.serializar(rep);
      ok(texto, 'se serializa');
      var leida = R.leer(texto);
      ok(leida, 'y se vuelve a leer');
      eq(leida.modo, 'habduo', 'con su modo');
      eq(leida.entradas.length, rep.entradas.length, 'con todas las entradas');
      for (var i = 0; i < rep.entradas.length; i++) {
        eq(leida.entradas[i].join(','), rep.entradas[i].join(','),
           'la entrada ' + i + ' vuelve igual');
      }
    });

  test('un DESATADO de UNO no admite poderes del segundo jugador', function () {
    var R = window.PM.Replay;
    var rep = {
      v: R.V, modo: 'hab', semilla: null, nivel: 1, jugadores: 2,
      ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 3 },
      nombres: ['UNO', 'DOS'], fecha: new Date().toISOString(),
      entradas: [[10, 1, 4]],
      final: { puntos: 100, nivel: 1, fantasmas: 0, tiempoMs: 900 }
    };
    eq(R.serializar(rep), '', 'se rechaza');
  });

  /* PAC-MAN VS. sí deja repetición, y esta es la prueba que lo sostiene.
   * Durante un tiempo NO la dejaba: el rumbo de quien lleva fantasma lo
   * interceptaba `Versus.steer` antes de llegar a `Replay.entrada`, así que la
   * repetición salía con la mitad de las órdenes y al verla el fantasma humano
   * se movía por su cuenta. Ahora el rumbo del fantasma es una entrada más. */
  test('una partida de PAC-MAN VS. se graba y se reproduce exacta', function () {
    var R = window.PM.Replay;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      // [tick, jugador, dir] — el jugador 1 lleva a BLINKY
      var guion = [
        [5, 0, 1], [10, 1, 0], [60, 0, 0], [80, 1, 3], [140, 0, 3],
        [180, 1, 2], [240, 0, 2], [300, 1, 1], [360, 0, 1], [420, 1, 0],
        [500, 0, 0], [560, 1, 3], [640, 0, 3], [700, 1, 2]
      ];
      var TOTAL = 800;

      function corre(conGuion) {
        G.state = 'PLAYING';
        G.readyTicks = 0;
        var k = 0;
        for (var i = 0; i < TOTAL; i++) {
          if (conGuion) {
            while (k < guion.length && guion[k][0] === i) {
              G.setPacDir(guion[k][1], guion[k][2]);
              k++;
            }
          }
          G.step();
        }
      }

      G.newGame({ players: 2, ghosts: [-1, 0] });
      ok(G.isVersus(), 'es una partida de VS.');
      var rep = R.enCurso();
      ok(rep, 'y AHORA SÍ se graba');
      eq(rep.modo, 'vs', 'con su modo propio');
      eq(rep.ajustes.ghosts.join(','), '-1,0', 'y con el reparto de fantasmas');
      corre(true);
      var pts = G.score, quedan = G.dotsLeft;
      var gx = Math.round(G.ghosts[0].x), gy = Math.round(G.ghosts[0].y);
      var deFantasma = rep.entradas.filter(function (e) { return e[1] === 1; }).length;
      ok(deFantasma > 0,
         'los giros del que lleva fantasma se apuntan: ' + deFantasma);
      if (!rep.final) {
        rep.final = { puntos: pts || 1, nivel: G.level, fantasmas: G.runGhosts,
                      tiempoMs: Math.round(G.timeTicks * 1000 / 60) };
      }

      var leida = R.leer(R.serializar(rep));
      ok(leida, 'la repetición pasa por el texto y vuelve');
      eq(leida.modo, 'vs', 'con su modo intacto');
      eq(leida.ajustes.ghosts.join(','), '-1,0', 'y con el reparto intacto');
      ok(R.ver(leida), 'la repetición arranca');
      ok(G.isVersus(), 'y arranca EN modo VS.');
      eq(G.vsGhostOf(1), 0, 'con el mismo fantasma en las mismas manos');
      corre(false);
      eq(G.score, pts, 'LA PUNTUACIÓN NO CUADRA: el determinismo está roto');
      eq(G.dotsLeft, quedan, 'las pastillas comidas no cuadran');
      /* Lo que de verdad prueba que el rumbo del fantasma se grabó: si no, el
       * fantasma humano habría vagado por su cuenta y acabaría en otro sitio. */
      eq(Math.round(G.ghosts[0].x), gx, 'EL FANTASMA HUMANO ACABA EN OTRO SITIO');
      eq(Math.round(G.ghosts[0].y), gy, 'el fantasma humano no cuadra en Y');
    } finally {
      window.PM.Replay.salir();
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  test('VS. con poderes tiene su propio modo, y guarda los poderes del fantasma',
    function () {
      var R = window.PM.Replay;
      window.PM.settings.muted = true;
      G.newGame({ players: 2, hab: true, ghosts: [-1, 0] });
      var rep = R.enCurso();
      ok(rep, 'se graba');
      eq(rep.modo, 'habvs', 'con el modo de VS. con poderes');
      G.state = 'PLAYING';
      G.readyTicks = 0;
      G.ghosts[0].mode = 'normal';
      ok(HB.pulsar(G, 1, HB.EMBESTIDA), 'el fantasma usa un poder');
      var poderes = rep.entradas.filter(function (e) {
        return e[2] >= 4 && e[1] === 1;
      }).length;
      eq(poderes, 1, 'y queda apuntado como entrada');
      rep.final = { puntos: 10, nivel: 1, fantasmas: 0, tiempoMs: 900 };
      var leida = R.leer(R.serializar(rep));
      ok(leida, 'pasa por el texto y vuelve');
      eq(leida.modo, 'habvs');
      eq(leida.entradas[0].join(','), rep.entradas[0].join(','),
         'con el poder del fantasma intacto');
      G.toMenu();
    });

  test('una repetición de VS. sin reparto de fantasmas se rechaza', function () {
    var R = window.PM.Replay;
    function repDeVs(ghosts) {
      var o = {
        v: R.V, modo: 'vs', semilla: null, nivel: 1, jugadores: 2,
        ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 3 },
        nombres: ['UNO', 'DOS'], fecha: new Date().toISOString(),
        entradas: [[10, 1, 2]],
        final: { puntos: 100, nivel: 1, fantasmas: 0, tiempoMs: 900 }
      };
      if (ghosts) o.ajustes.ghosts = ghosts;
      return o;
    }
    eq(R.serializar(repDeVs(null)), '', 'sin reparto no se puede montar');
    eq(R.serializar(repDeVs([-1, -1])), '', 'sin fantasma humano no es de VS.');
    eq(R.serializar(repDeVs([0, 1])), '', 'y sin Pac-Man no hay partida');
    eq(R.serializar(repDeVs([-1, 9])), '', 'ni con un fantasma que no existe');
    ok(R.serializar(repDeVs([-1, 2])) !== '', 'con un reparto bueno, sí');

    /* Y al revés: una repetición normal no puede traer reparto de fantasmas,
     * que ahí no hay ninguno que repartir. */
    var normal = repDeVs([-1, 0]);
    normal.modo = 'duo';
    eq(R.serializar(normal), '', 'un dúo normal con fantasmas se rechaza');
  });

  test('el código de un enlace de repetición no tiene letras que se confundan',
    function () {
      var R = window.PM.Replay;
      var S = CFG.REPLAY_SHARE;
      ok(S.ALPHABET.indexOf('I') === -1 && S.ALPHABET.indexOf('O') === -1,
         'sin I ni O');
      ok(S.ALPHABET.indexOf('0') === -1 && S.ALPHABET.indexOf('1') === -1,
         'sin cero ni uno');
      var c = R.codigoNuevo();
      eq(c.length, S.ID_LEN, 'mide lo que tiene que medir');
      for (var i = 0; i < c.length; i++) {
        ok(S.ALPHABET.indexOf(c.charAt(i)) !== -1,
           'el carácter ' + c.charAt(i) + ' es del alfabeto');
      }
      ok(R.enlaceRed('A3K9XQ7M').indexOf('?' + S.PARAM + '=A3K9XQ7M') !== -1,
         'y el enlace lo lleva');
    });

  // ---------------------------------------------------------------
  // El selector de modo se recuerda entre recargas
  // ---------------------------------------------------------------

  test('el modo elegido en la portada se guarda en los ajustes', function () {
    var UI = window.PM.UI;
    var previo = window.PM.settings.modePick;
    try {
      UI.pickMode('hab');
      eq(window.PM.settings.modePick, 'hab', 'se apunta al elegirlo');
      eq(UI.modePick, 'hab', 'y el selector lo sabe');
      UI.pickMode('lab');
      eq(window.PM.settings.modePick, 'lab', 'y cambia al cambiar');
    } finally {
      UI.pickMode(previo || 'clasico');
    }
  });

  test('un modo inventado en los ajustes no se cuela', function () {
    var UI = window.PM.UI;
    var previo = window.PM.settings.modePick;
    try {
      UI.pickMode('noexiste');
      eq(UI.modePick, 'clasico', 'lo que no existe cae en el primero');
    } finally {
      UI.pickMode(previo || 'clasico');
    }
  });

  test('la lista de modos guardables es la misma que la de la portada',
    function () {
      var UI = window.PM.UI;
      ok(UI.modeCards, 'la portada tiene sus tarjetas');
      var n = 0;
      for (var k in UI.modeCards) {
        if (!UI.modeCards.hasOwnProperty(k)) continue;
        n++;
        ok(CFG.MODE_IDS.indexOf(k) !== -1,
           'el modo ' + k + ' está en CFG.MODE_IDS');
      }
      eq(n, CFG.MODE_IDS.length, 'y no sobra ninguno en CFG.MODE_IDS');
    });

  // ---------------------------------------------------------------
  // DAILY: el borrón del progreso
  // ---------------------------------------------------------------

  test('el progreso del DAILY de antes del borrón se tira entero', function () {
    var D = window.PM.Daily;
    var previo = null;
    try { previo = localStorage.getItem(CFG.DAILY.KEY); }
    catch (e) { /* sin almacén */ }
    try {
      /* Lo guardado por una versión anterior: sin marca de borrón, con racha
       * y con la semana a medias. Todo eso se hizo con el calendario viejo
       * (el DAILY iba en UTC y marcaba el día equivocado), así que se va. */
      var viejo = D.vacio();
      viejo.racha = 5;
      viejo.mejor = 9;
      viejo.ult = D.hoyISO();
      viejo.h[0] = 1;
      viejo.p[0] = 999;
      delete viejo.rv;
      localStorage.setItem(CFG.DAILY.KEY, JSON.stringify(viejo));
      var leido = D.leer();
      eq(leido.racha, 0, 'la racha se va');
      eq(leido.mejor, 0, 'la mejor racha también');
      eq(leido.ult, '', 'y el último día cumplido');
      eq(D.cumplidos(leido), 0, 'la semana empieza de cero');
      eq(leido.rv, CFG.DAILY.RESET, 'y queda con la marca nueva');

      /* Y lo guardado DESPUÉS del borrón no se toca: si no, el progreso se
       * borraría en cada arranque y el DAILY no avanzaría nunca. */
      var nuevo = D.vacio();
      nuevo.racha = 3;
      nuevo.h[D.diaSemana()] = 1;
      localStorage.setItem(CFG.DAILY.KEY, JSON.stringify(nuevo));
      leido = D.leer();
      eq(leido.racha, 3, 'la racha de después se queda');
      eq(D.cumplidos(leido), 1, 'y lo cumplido también');
    } finally {
      try {
        if (previo === null) localStorage.removeItem(CFG.DAILY.KEY);
        else localStorage.setItem(CFG.DAILY.KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  test('el borrón NO toca los logros del DAILY', function () {
    var A = window.PM.Achievements;
    ok(A.BASE.dailyOk, 'el contador de retos cumplidos sigue existiendo');
    ok(A.STATS['daily:dailyOk'], 'y su versión por modo');
    /* Los tres logros del DAILY se resuelven contra esos contadores, y esos
     * viven en el almacén de logros, no en el del DAILY: el borrón del
     * progreso no puede quitarle a nadie un logro que ya se ganó. */
    ok(CFG.ACH_KEY !== CFG.DAILY.KEY, 'son dos almacenes distintos');
  });

  // ---------------------------------------------------------------
  // Cuentas: el correo de recuperación
  //
  // Sin él, olvidar la contraseña era perder la cuenta entera: los cuatro
  // récords, la experiencia, los logros y las doce maestrías. Lo que se puede
  // probar sin servidor es el saneado y las guardas de antes de salir a la red.
  // ---------------------------------------------------------------

  test('el correo se sanea, no se valida de más', function () {
    var Ac = window.PM.Account;
    eq(Ac.cleanMail('  MauLio@Gmail.COM  '), 'maulio@gmail.com',
       'espacios fuera y todo a minúsculas');
    eq(Ac.cleanMail(null), '', 'sin correo, nada');
    ok(Ac.mailOk('a@b.co'), 'un correo corto vale');
    ok(Ac.mailOk('nombre.apellido+juego@midominio.es'), 'y uno con adornos también');
    ok(!Ac.mailOk('maulio'), 'sin arroba no');
    ok(!Ac.mailOk('maulio@gmail'), 'ni sin punto en el dominio');
    ok(!Ac.mailOk('mau lio@gmail.com'), 'ni con un espacio en medio');
  });

  test('los correos internos de antes no cuentan como correo', function () {
    var Ac = window.PM.Account;
    /* Las cuentas creadas antes de que se pidiera el correo llevan uno
     * compuesto por dentro contra un dominio que no existe. Entran igual, pero
     * a efectos de recuperar la contraseña es como no tener ninguno, y hay que
     * saber distinguirlo para poder avisar. */
    ok(Ac.mailInterno('maulio@' + CFG.ACCOUNT.MAIL_DOMAIN), 'ese es interno');
    ok(!Ac.mailInterno('maulio@gmail.com'), 'y este no');
    ok(!Ac.mailInterno(''), 'y sin correo, tampoco');
  });

  test('crear cuenta sin lo mínimo ni siquiera sale a la red', function () {
    var Ac = window.PM.Account;
    var errores = [];
    Ac.signUp('AB', 'contraseña', 'a@b.co', function (e) { errores.push(e); });
    Ac.signUp('ALGUIEN', '123', 'a@b.co', function (e) { errores.push(e); });
    Ac.signUp('ALGUIEN', 'contraseña', '', function (e) { errores.push(e); });
    Ac.signUp('ALGUIEN', 'contraseña', 'novale', function (e) { errores.push(e); });
    eq(errores.length, 4, 'los cuatro se paran aquí');
    ok(/USUARIO/.test(errores[0]), 'el usuario es corto');
    ok(/CONTRASEÑA/.test(errores[1]), 'la contraseña es corta');
    ok(/CORREO/.test(errores[2]), 'falta el correo');
    ok(/CORREO/.test(errores[3]), 'y ese correo no tiene buena pinta');
  });

  test('poner un correo sin sesión no hace nada', function () {
    var Ac = window.PM.Account;
    var visto = null;
    Ac.ponerCorreo('a@b.co', function (e) { visto = e; });
    ok(/SESIÓN/.test(visto || ''), 'hace falta la sesión abierta');
    visto = null;
    Ac.cambiarPass('otracosa', function (e) { visto = e; });
    ok(/SESIÓN/.test(visto || ''), 'y para cambiar la contraseña también');
  });

  test('sin enlace de recuperación en la URL, no pasa nada', function () {
    var Ac = window.PM.Account;
    /* desdeRecuperacion mira el ancla de la dirección. En una carga normal no
     * hay ninguno, y tiene que decir que no sin tocar la sesión: si dijera que
     * sí, cada arranque pediría una contraseña nueva. */
    eq(Ac.desdeRecuperacion(function () {}), false, 'no venimos de ningún enlace');
  });

  // ---------------------------------------------------------------
  // CACERÍA: todos de fantasma contra un Pac-Man de máquina
  // ---------------------------------------------------------------
  var Z = window.PM.Caza;

  /* Partida de CACERÍA con `jugadores` cazadores (y la máquina de Pac-Man) */
  function caceria(jugadores, net, localIdx) {
    window.PM.settings.muted = true;
    G.newGame({
      players: jugadores, net: net || null, caza: true,
      localIdx: (net === 'guest') ? (localIdx || 1) : 0,
      names: ['UNO', 'DOS', 'TRES', 'CUATRO'].slice(0, jugadores)
    });
    G.state = 'PLAYING';
    G.readyTicks = 0;
    return G;
  }

  /* El bot, a salvo de los fantasmas (para probar lo demás sin que muera) */
  function botInmortal() {
    var p = Z.bot(G);
    p.safeTicks = 999999;
    return p;
  }

  /* Deja al bot en el cruce de la fila 5 mirando hacia `dir` */
  function botEnElCruce(dir) {
    var p = Z.bot(G);
    p.x = 6 * 8 + 4;
    p.y = 5 * 8 + 4;
    p.dir = dir;
    p.nextDir = dir;
    return p;
  }

  test('en CACERÍA todos llevan fantasma y el Pac-Man es de la máquina', function () {
    caceria(2);
    ok(G.caza, 'la partida es de CACERÍA');
    eq(G.pacs.length, 3, 'dos cazadores y la máquina');
    eq(G.playerCount, 2, 'pero la gente son dos');
    ok(G.pacs[2].bot, 'el último asiento es la máquina');
    eq(G.vsGhostOf(0), 0, 'el J1 lleva a Blinky');
    eq(G.vsGhostOf(1), 1, 'el J2 a Pinky');
    eq(G.vsGhostOf(2), -1, 'la máquina no lleva fantasma');
    ok(G.pacs[0].out && G.pacs[1].out, 'los cazadores no tienen Pac-Man');
    ok(!G.pacs[2].out, 'la máquina sí');
    ok(G.isVersus(), 'es una partida con fantasmas humanos');
    ok(G.ghosts[0].human && G.ghosts[1].human, 'sus fantasmas son suyos');
    ok(!G.ghosts[2].human && !G.ghosts[3].human, 'los otros dos, de la máquina');
    eq(G.nameFor(2), CFG.CAZA.NOMBRE_PAC, 'y se llama PAC-MAN');
    eq(G.colorFor(2), CFG.CAZA.COLOR_PAC, 'de amarillo');
    eq(G.livesMode, 'shared', 'las vidas son de Pac-Man: fondo común');
    ok(G.isLocalAuth(2), 'y lo simula esta máquina');
    eq(G.achTags()[1], 'caza', 'con sus propios logros');
    G.toMenu();
    ok(!G.caza, 'al salir se apaga');
  });

  test('CACERÍA con uno: llevas a Blinky y los otros tres son de la máquina', function () {
    caceria(1);
    eq(G.pacs.length, 2);
    eq(G.vsGhostOf(0), 0);
    ok(G.ghosts[0].human && !G.ghosts[1].human);
    G.setPacDir(0, CFG.DIR.DOWN);
    ok(G.ghosts[0].taken, 'la primera tecla lo hace tuyo');
    G.toMenu();
  });

  test('CACERÍA a solas: cualquier fantasma que lo coja es caza tuya; con dos, la de cada uno', function () {
    var V = window.PM.Versus;
    caceria(1);
    var bot = G.pacs.length - 1;
    V.onCatch(G, bot, 2);                  // lo coge Inky, de la máquina
    eq(V.catches(G, 0), 1, 'a solas, la caza de un fantasma de la máquina es tuya');
    V.onCatch(G, bot, 0);                  // y con el tuyo, también
    eq(V.catches(G, 0), 2);
    caceria(2);
    bot = G.pacs.length - 1;
    V.onCatch(G, bot, 2);                  // Inky es de la máquina
    eq(V.catches(G, 0) + V.catches(G, 1), 0, 'con dos cazadores, la de la máquina no es de nadie');
    V.onCatch(G, bot, 1);
    eq(V.catches(G, 1), 1, 'y cada uno cobra la suya');
    G.toMenu();
  });

  test('sin superpastillas: las cuatro son puntos normales y siguen siendo 244', function () {
    caceria(1);
    var o = 0, n = 0;
    for (var r = 0; r < CFG.ROWS; r++) {
      for (var c = 0; c < CFG.COLS; c++) {
        if (G.pellets[r][c] === 'o') o++;
        if (G.pellets[r][c]) n++;
      }
    }
    eq(o, 0, 'ni una superpastilla');
    eq(n, 244, 'pero el nivel sigue teniendo lo suyo');
    eq(G.dotsLeft, 244);
    G.toMenu();
    /* y fuera del modo vuelven */
    partida(1);
    eq(G.pellets[3][1], 'o', 'en el clásico la esquina es superpastilla');
    G.toMenu();
  });

  test('el poder llega solo, pasado el periodo, y el reloj vuelve a empezar', function () {
    caceria(1);
    botInmortal();
    var periodo = CFG.CAZA.periodo(0) * 60;
    eq(G.cazaTicks, periodo, 'el reloj arranca con el periodo entero');
    ticks(periodo - 1);
    eq(G.frightTicks, 0, 'un tick antes, nada');
    eq(G.cazaTicks, 1);
    ticks(1);
    ok(G.frightTicks > 0, 'y al llegar a cero, poder');
    eq(G.frightTicks, Math.round(CFG.CAZA.duracion(0) * 60), 'lo que dice la tabla');
    ok(G.ghosts[0].frightened, 'Blinky se pone azul');
    eq(G.cazaTicks, periodo, 'el reloj vuelve a empezar');
    /* mientras dura el poder, el reloj no corre */
    var n = 0;
    while (G.frightTicks > 0 && n++ < 2000) G.step();
    ok(n < 2000, 'el poder se acaba');
    ok(G.cazaTicks >= periodo - 2 && G.cazaTicks <= periodo,
       'y el reloj no se ha movido entretanto: ' + G.cazaTicks);
    G.toMenu();
  });

  test('el poder escala por ronda, no por nivel absoluto', function () {
    caceria(1);
    eq(Z.ronda(G), 0, 'primera ronda');
    G.level = G.startLevel + 1;
    eq(Z.ronda(G), 1);
    eq(Z.duracionSegs(G), CFG.CAZA.duracion(1) * G.frightMult);
    G.level = G.startLevel + 50;
    eq(Z.duracionSegs(G), CFG.CAZA.duracion(CFG.CAZA.DURACION.length - 1),
       'a partir de la tabla se queda en lo último');
    /* con el ajuste a cero sigue habiendo poder: sin él no hay nada que temer */
    G.frightMult = 0;
    eq(Z.duracionSegs(G), CFG.CAZA.MIN_DURACION);
    G.toMenu();
  });

  test('sin poder Pac-Man huye del fantasma; con poder va a por él', function () {
    caceria(1);
    var p = botEnElCruce(CFG.DIR.RIGHT);
    var b = G.ghosts[0];
    b.mode = 'normal'; b.frightened = false;
    b.x = 9 * 8 + 4; b.y = 5 * 8 + 4; b.dir = CFG.DIR.LEFT;
    for (var i = 1; i < 4; i++) G.ghosts[i].mode = 'house';
    G.frightTicks = 0;
    var d = Z.decidir(G, p);
    ok(d >= 0, 'decide algo');
    ok(d !== CFG.DIR.RIGHT, 'y no es hacia el fantasma que tiene delante');
    /* ahora el fantasma es azul y hay tiempo de sobra: a por él */
    b.frightened = true;
    G.frightTicks = 6 * 60;
    eq(Z.decidir(G, p), CFG.DIR.RIGHT, 'con poder, derecho a por él');
    /* con el poder a punto de acabarse, ni lo intenta */
    G.frightTicks = 10;
    ok(Z.decidir(G, p) !== CFG.DIR.RIGHT, 'sin tiempo, no se arriesga');
    G.toMenu();
  });

  test('Pac-Man de máquina se mueve y come solo', function () {
    caceria(1);
    var p = botInmortal();
    var x0 = p.x, y0 = p.y;
    ticks(120);
    ok(p.x !== x0 || p.y !== y0, 'se ha movido');
    ok(G.dotsEaten > 0, 'y ha comido: ' + G.dotsEaten);
    ok(G.score > 0, 'que son puntos de Pac-Man');
    G.toMenu();
  });

  test('lo que come la máquina no es logro de nadie', function () {
    caceria(1);
    var antes = G.score;
    G.frightTicks = 360;
    G.ghosts[0].frightened = true;
    G.eatGhost(G.ghosts[0], Z.botIdx(G));
    eq(G.runGhosts, 0, 'el fantasma comido no se me apunta a mí');
    eq(G.score, antes + CFG.GHOST_CHAIN[0], 'pero sí puntúa para Pac-Man');
    eq(G.ghosts[0].mode, 'eyes', 'y el fantasma vuelve a casa');
    G.toMenu();
  });

  test('cazar a Pac-Man paga al dueño del fantasma, y sin vidas ganan ellos', function () {
    caceria(2);
    G.lives = 1;
    var bot = Z.botIdx(G);
    G.startDeath(bot, 1);                       // lo pilla Pinky, del J2
    eq(G.vsScoreOf(1), CFG.VS.CATCH_POINTS, 'cobra el J2');
    eq(G.vsScoreOf(0), 0, 'el J1 no');
    eq(G.state, 'DYING', 'era el único Pac-Man: parón clásico');
    ticks(CFG.DEATH_FREEZE_TICKS + CFG.DEATH_ANIM_TICKS + 5);
    eq(G.state, 'GAME_OVER', 'sin vidas, se acabó');
    eq(V.winner(G), 'ghost', 'ganan los fantasmas');
    eq(V.topHunter(G).idx, 1, 'y el titular es del que cazó');
    G.toMenu();
  });

  test('despejar un nivel pasa de ronda; despejar la última acaba la partida', function () {
    caceria(1);
    botInmortal();
    var inicio = G.startLevel;
    G.dotsLeft = 0;
    ticks(1);
    eq(G.state, 'LEVEL_DONE');
    ticks(CFG.LEVEL_FREEZE_TICKS + CFG.LEVEL_FLASH_TICKS + 2);
    eq(G.state, 'READY', 'a la ronda siguiente');
    eq(G.level, inicio + 1);
    eq(G.cazaTicks, CFG.CAZA.periodo(1) * 60, 'con el reloj de la segunda ronda');
    /* la última ronda */
    G.state = 'PLAYING';
    G.level = inicio + CFG.CAZA.NIVELES - 1;
    G.dotsLeft = 0;
    ticks(1);
    eq(G.state, 'LEVEL_DONE');
    ticks(CFG.LEVEL_FREEZE_TICKS + CFG.LEVEL_FLASH_TICKS + 2);
    eq(G.state, 'GAME_OVER', 'despejada la última, se acabó');
    eq(V.winner(G), 'pacs', 'y gana la máquina');
    G.toMenu();
  });

  test('la instantánea lleva el reloj del poder y el invitado solo lo sigue', function () {
    caceria(2, 'host');
    G.cazaTicks = 123;
    var snap = G.buildSnapshot(false);
    eq(snap.cz, 123, 'viaja en la foto');
    eq(snap.ps.length, 3, 'con la posición de la máquina como la de cualquiera');
    G.toMenu();
    caceria(2, 'guest', 1);
    G.applySnapshot(snap);
    eq(G.cazaTicks, 123, 'el invitado lo coge');
    ok(!G.isLocalAuth(2), 'y no manda sobre la máquina');
    G.cazaTicks = 1;
    G.step();
    G.step();
    eq(G.frightTicks, 0, 'el invitado nunca dispara el poder por su cuenta');
    eq(G.cazaTicks, 0, 'se queda esperando la foto');
    G.toMenu();
  });

  test('el mirón recibe el aviso de CACERÍA y monta su propia máquina', function () {
    caceria(3, 'host');
    var v = G.specView('x');
    eq(v.n, 3, 'los asientos de la gente');
    ok(v.caza, 'y el aviso del modo');
    eq(v.nm.length, 3);
    G.toMenu();
  });

  test('un cazador que se va deja su fantasma a la máquina', function () {
    caceria(3, 'host');
    V.setWish(G, 1, CFG.DIR.UP);                // el rumbo del J2 llega por red
    ok(G.ghosts[1].human && G.ghosts[1].taken);
    G.dropPlayer(1);
    ok(!G.ghosts[1].human, 'el fantasma vuelve a la máquina');
    eq(G.state, 'PLAYING', 'y la partida sigue');
    G.toMenu();
  });

  test('la party puede empezar sin Pac-Man si es CACERÍA', function () {
    /* (desde el 20 sep hace falta además que todos digan LISTO) */
    G.toMenu();
    var P = party(['ANA', 'BENI']);
    try {
      P.st.members[0].g = 0;
      P.st.members[1].g = 1;
      P.st.members[1].l = 1;          // su LISTO, que desde el 20 sep hace falta
      ok(!P.anyPac(), 'nadie lleva Pac-Man');
      ok(!P.canStart(), 'en VS. eso no arranca');
      P.cazaPick = true;
      ok(P.canStart(), 'en CACERÍA sí: lo lleva la máquina');
      P.habPick = true;              // DESATADO apaga CACERÍA
      P.setHab(true);
      ok(!P.cazaPick, 'o una cosa o la otra');
      P.setCaza(true);
      ok(!P.habPick && P.cazaPick);
    } finally { P.st = null; P.order = null; P.cazaPick = false; P.habPick = false; }
  });

  test('CACERÍA no se graba como repetición local', function () {
    var R = window.PM.Replay;
    caceria(1);
    ok(!R.enCurso(), 'no hay grabación');
    G.toMenu();
    partida(1);
    ok(!!R.enCurso(), 'una clásica sí se graba');
    G.toMenu();
  });

  test('CACERÍA excluye a DESATADO', function () {
    window.PM.settings.muted = true;
    G.newGame({ players: 1, caza: true, hab: true });
    ok(G.hab && !G.caza, 'con los poderes puestos no hay máquina');
    G.toMenu();
  });

  // ---------------------------------------------------------------
  // TIENDA (15 sep): monedas, compras, lo puesto y lo que viaja
  // ---------------------------------------------------------------
  /* Aísla también los ajustes: la tienda escribe acc1, efx1 y emotes1 */
  function conTienda(fn) {
    var s = window.PM.settings;
    var antes = { acc1: s.acc1, efx1: s.efx1, emotes1: s.emotes1, skin1: s.skin1 };
    /* El PASE también paga monedas, y desde que empiece su primera temporada
     * ganar cualquier cosa subiría el camino y descuadraría estas cuentas.
     * Aquí se mide la tienda, así que se le pone una temporada que no existe
     * y el pase se queda quieto (ver js/pase.js, cuenta()). */
    var Pa = window.PM.Pase, temp = Pa && Pa.temporada;
    if (Pa) Pa.temporada = function () { return '1970-01'; };
    conLogrosLimpios(function (A) {
      try { fn(window.PM.Tienda, A); }
      finally {
        for (var k in antes) if (antes.hasOwnProperty(k)) s[k] = antes[k];
        if (Pa) Pa.temporada = temp;
      }
    });
  }

  /* ---------- EL PASE DE TEMPORADA ----------
   * El pase vive en su propia temporada, y las pruebas la fijan a mano: si
   * dependieran del mes de hoy, pasarían en septiembre y fallarían en
   * octubre. `conPase` fija una que sí cuenta; `conTienda` fija una que no,
   * para que las pruebas de la tienda sigan midiendo solo la tienda. */
  function conPase(fn, temporada) {
    var Pa = window.PM.Pase;
    var t = temporada || CFG.PASE.DESDE;
    var antes = Pa.temporada;
    Pa.temporada = function () { return t; };
    conLogrosLimpios(function (A) {
      try { fn(Pa, window.PM.Tienda, A, t); }
      finally { Pa.temporada = antes; }
    });
  }

  test('la foto del anfitrión lleva el reloj de CAZA y DISPERSIÓN', function () {
    /* Sin esto, el aviso del OJO del Mago se le quedaba clavado al invitado:
     * el modo cambiaba, pero los segundos que faltaban no bajaban nunca. */
    G.schedIndex = 2;
    G.schedTicks = 77;
    var foto = G.buildSnapshot(false);
    eq(foto.si, 2, 'el tramo del reloj viaja');
    eq(foto.sk, 77, 'y los ticks que lleva');
    G.schedIndex = 0;
    G.schedTicks = 0;
    G.applySnapshot(foto);
    eq(G.schedIndex, 2, 'y al aplicarla, el invitado queda en el mismo tramo');
    eq(G.schedTicks, 77, 'con los mismos ticks');
  });

  test('el pase empieza el mes que dice su configuración y no antes',
    function () {
      var Pa = window.PM.Pase;
      ok(!Pa.cuenta('2026-09'), 'antes del mes de arranque, una temporada no cuenta');
      ok(Pa.cuenta(CFG.PASE.DESDE), 'la primera sí');
      ok(Pa.cuenta('2099-01'), 'y las de después también: no hay lista que mantener');
      ok(!Pa.cuenta('no-es-un-mes'), 'lo que no es un mes, no');
    });

  test('el carril de pago nace apagado, que sin identidad propia no se cobra',
    function () {
      eq(CFG.PASE.VENTA, false, 'no se vende todavía');
      eq(window.PM.Pase.seVende(), false, 'y el juego lo sabe');
    });

  test('el galón sale de la experiencia, y no pasa del último', function () {
    conPase(function (Pa, Tn, A, t) {
      var paso = CFG.PASE.POR_GALON;
      eq(Pa.galon(t), 0, 'se empieza a cero');
      Pa.ganar(paso - 1, t);
      eq(Pa.galon(t), 0, 'casi no es');
      Pa.ganar(1, t);
      eq(Pa.galon(t), 1, 'y con lo justo, sí');
      eq(Pa.avance(t).falta, paso, 'y ya falta un galón entero para el siguiente');
      Pa.ganar(paso * 1000, t);
      eq(Pa.galon(t), CFG.PASE.GALONES, 'por mucho que se juegue, el último es el último');
      eq(Pa.avance(t).falta, 0, 'y ahí ya no falta nada');
    });
  });

  test('antes del mes de arranque el pase está dormido', function () {
    conPase(function (Pa) {
      eq(Pa.ganar(5000, '2026-09'), 0, 'no se apunta nada');
      eq(Pa.galon('2026-09'), 0, 'y se queda a cero');
      eq(Pa.monedasDe('2026-09'), 0, 'sin premios');
    });
  });

  test('las monedas del camino entran en el saldo y no se cobran dos veces',
    function () {
      conPase(function (Pa, Tn, A, t) {
        var base = Tn.saldo();
        Pa.ganar(CFG.PASE.POR_GALON, t);              // galón 1
        var g1 = Pa.monedasDe(t);
        ok(g1 > 0, 'el primer galón paga algo');
        eq(Tn.saldo(), base + g1, 'y eso está en el saldo');
        eq(Tn.saldo(), base + g1, 'mirarlo otra vez no lo vuelve a pagar');
        /* lo importante: no hay ninguna hucha que se pueda llenar dos veces */
        eq(Tn.ganadas(), 0, 'no se ha ingresado nada en lo ganado');
      });
    });

  test('juntar dos aparatos no duplica lo que pagó el camino', function () {
    conPase(function (Pa, Tn, A, t) {
      Pa.ganar(CFG.PASE.POR_GALON * 3, t);
      var antes = Pa.monedasDe(t);
      var saldo = Tn.saldo();
      /* la nube trae la misma temporada con menos experiencia... */
      A.merge((function () { var o = {}; o['px_' + t] = CFG.PASE.POR_GALON; return o; })());
      eq(Pa.galon(t), 3, 'se queda con lo mejor de los dos lados');
      eq(Pa.monedasDe(t), antes, 'y los premios no se mueven');
      eq(Tn.saldo(), saldo, 'ni el saldo');
    });
  });

  test('el carril de pago no paga hasta que es tuyo, y entonces paga lo ya andado',
    function () {
      conPase(function (Pa, Tn, A, t) {
        Pa.ganar(CFG.PASE.POR_GALON * 5, t);
        var soloGratis = Pa.monedasDe(t);
        var saldo = Tn.saldo();
        ok(!Pa.tienePago(t), 'todavía no es suyo');
        ok(Pa.resumen(t).pendientePago > 0,
          'y se le enseña lo que se está dejando, que es lo que justifica el precio');
        Pa.conceder(t);
        ok(Pa.tienePago(t), 'ahora sí');
        var conPago = Pa.monedasDe(t);
        ok(conPago > soloGratis, 'y cobra de golpe todo lo que ya había alcanzado');
        eq(Tn.saldo(), saldo + (conPago - soloGratis), 'en el saldo, sin cobrar nada dos veces');
        eq(Pa.resumen(t).pendientePago, 0, 'y ya no hay nada pendiente');
      });
    });

  test('ganar monedas sube el camino: las dos cuentas no pueden separarse',
    function () {
      conPase(function (Pa, Tn, A, t) {
        eq(Pa.xp(t), 0, 'se empieza sin experiencia');
        Tn.ganar(100);
        eq(Pa.xp(t), 100 * CFG.PASE.XP_POR_MONEDA, 'lo que paga la tienda sube el pase');
        eq(A.stats().monedas, 100, 'y las monedas son las de siempre');
      });
    });

  test('el camino está bien escrito: galones dentro de rango y en orden',
    function () {
      var c = window.PM.Pase.camino();
      ok(c.length > 0, 'hay camino');
      for (var i = 0; i < c.length; i++) {
        ok(c[i].g >= 1 && c[i].g <= CFG.PASE.GALONES, 'el galón ' + c[i].g + ' cabe');
        if (i) ok(c[i].g > c[i - 1].g, 'y van en orden, sin repetir');
        /* las piezas del camino todavía no existen: cuando se dibujen, este
         * aviso salta si alguna se pone con un id que no está en el vestuario */
        ['gratis', 'pago'].forEach(function (lado) {
          var id = c[i][lado] && c[i][lado].id;
          if (id) ok(!!window.PM.Tienda.item(id), 'la pieza ' + id + ' existe en el vestuario');
        });
      }
      ok(c[c.length - 1].g === CFG.PASE.GALONES, 'el último galón paga algo');
    });

  /* ---------- LAS PIEZAS DE LA TEMPORADA ----------
   * Desde el 20 de septiembre el camino no paga solo monedas: los tres hitos
   * reparten piezas que NO están en la tienda ni en los cofres. Lo que se
   * vigila aquí es justo esa frontera, que es lo que sostiene que el pase
   * valga algo. */
  test('lo que reparte el pase no se vende en ninguna parte', function () {
    var Tn = window.PM.Tienda;
    var hay = 0;
    window.PM.Pase.camino().forEach(function (e) {
      ['gratis', 'pago'].forEach(function (lado) {
        var id = e[lado] && e[lado].id;
        if (!id) return;
        hay++;
        var it = Tn.item(id);
        ok(!!it, 'la pieza ' + id + ' está en el vestuario');
        ok(!!it.pase, id + ' va marcada como del pase');
        eq(it.precio, 0, id + ' no tiene precio');
        ok(Tn.VENTA.indexOf(it) === -1, id + ' no sale en la tienda');
        ok(!Tn.comprar(id).ok, id + ' no se puede comprar');
      });
    });
    ok(hay >= 3, 'y hay piezas que repartir: un pase de solo monedas no se vende');
  });

  test('cada pieza del camino está dibujada', function () {
    var Sp = window.PM.Sprites, Tn = window.PM.Tienda;
    window.PM.Pase.camino().forEach(function (e) {
      ['gratis', 'pago'].forEach(function (lado) {
        var id = e[lado] && e[lado].id;
        if (!id) return;
        var cat = Tn.item(id).cat;
        if (cat === 'skin') ok(!!Sp.ARTE[id], id + ' tiene su dibujo de skin');
        else if (cat === 'accesorio') ok(!!Sp.ACCESORIOS[id], id + ' tiene su dibujo de accesorio');
        else if (cat === 'efecto') ok(!!Sp.EFECTOS[id], id + ' tiene su rastro');
        else if (cat === 'emote') ok(!!Sp.CARAS_TIENDA[id], id + ' tiene su cara');
      });
    });
  });

  test('llegar al galón entrega la pieza, y solo una vez', function () {
    conPase(function (Pa, Tn, A, t) {
      var hito = null;
      Pa.camino().forEach(function (e) { if (!hito && e.gratis && e.gratis.id) hito = e; });
      ok(!!hito, 'hay un galón que paga pieza');
      var id = hito.gratis.id;
      ok(!Tn.tiene(id), 'antes de llegar, no es suya');
      Pa.ganar(CFG.PASE.POR_GALON * hito.g, t);
      ok(Tn.tiene(id), 'al llegar al galón, sí');
      var saldo = Tn.saldo();
      Pa.sincronizar(t);
      Pa.sincronizar(t);
      ok(Tn.tiene(id), 'y sigue siendo suya');
      eq(Tn.saldo(), saldo, 'sincronizar de más no regala monedas');
    });
  });

  test('la skin del pase se abre al ganarla, y dice de qué temporada era',
    function () {
      conPase(function (Pa, Tn, A, t) {
        var id = null;
        Pa.camino().forEach(function (e) {
          if (e.pago && e.pago.id && Tn.item(e.pago.id).cat === 'skin') id = e.pago.id;
        });
        ok(!!id, 'el carril de pago acaba en una skin: es lo que se compra');
        var antes = window.PM.Skins.estado(id);
        ok(!antes.abierta, 'sin el pase no está abierta');
        eq(antes.chip, 'PASE', 'y se ve de dónde sale');
        Pa.conceder(t);
        Pa.ganar(CFG.PASE.POR_GALON * CFG.PASE.GALONES, t);
        ok(window.PM.Skins.estado(id).abierta, 'con el camino andado y el pase, es suya');
      });
    });

  /* ---------- LA PANTALLA DEL PASE ----------
   * El camino se dibuja una vez y refrescar solo cambia clases: estas pruebas
   * vigilan justo eso, porque el día que alguien lo rehaga entero en cada
   * refresco se perderá el desplazamiento de lado y nadie lo notará hasta
   * usarlo con treinta galones delante. */
  function conPantallaPase(fn, temporada) {
    conPase(function (Pa, Tn, A, t) {
      var U = window.PM.UI;
      U.refreshPase();
      fn(U, Pa, Tn, A, t);
    }, temporada);
  }

  test('la pantalla del pase dibuja el camino entero, una sola vez', function () {
    conPantallaPase(function (U) {
      eq(U.psCeldas.length, CFG.PASE.GALONES, 'una celda por galón');
      var primera = U.psCeldas[0].cel;
      U.refreshPase();
      U.refreshPase();
      eq(U.psCeldas.length, CFG.PASE.GALONES, 'refrescar no añade celdas');
      eq(U.psCeldas[0].cel, primera, 'ni rehace las que había (se perdería el scroll)');
    });
  });

  test('la pantalla marca lo ganado y deja a la vista lo que está cerrado',
    function () {
      conPantallaPase(function (U, Pa, Tn, A, t) {
        var conPremio = null;
        for (var i = 0; i < U.psCeldas.length; i++) {
          if (U.psCeldas[i].gr && U.psCeldas[i].pg) { conPremio = U.psCeldas[i]; break; }
        }
        ok(conPremio, 'hay algún galón que paga por los dos lados');
        ok(!conPremio.arriba.classList.contains('ps-ganado'), 'de entrada no hay nada ganado');

        Pa.ganar(CFG.PASE.POR_GALON * conPremio.g, t);
        U.refreshPase();
        ok(conPremio.arriba.classList.contains('ps-ganado'), 'el carril de todos, ganado');
        ok(conPremio.abajo.classList.contains('ps-cerrado'),
          'y el de pago alcanzado pero cerrado: es lo que se está dejando');
        ok(!conPremio.abajo.classList.contains('ps-ganado'), 'que no es lo mismo que ganado');
        ok(conPremio.num.classList.contains('ps-hecho'), 'el número del galón, hecho');

        Pa.conceder(t);
        U.refreshPase();
        ok(conPremio.abajo.classList.contains('ps-ganado'), 'al ser suyo, ganado');
        ok(!conPremio.abajo.classList.contains('ps-cerrado'), 'y ya no está cerrado');
        ok(conPremio.abajo.classList.contains('ps-suyo'), 'sin candado');
      });
    });

  test('el botón del pase no ofrece comprar lo que todavía no se vende',
    function () {
      conPantallaPase(function (U, Pa, Tn, A, t) {
        eq(U.psBtn.disabled, true, 'apagado mientras VENTA sea false');
        ok(U.psBtn.textContent.indexOf('PRÓXIMAMENTE') !== -1, 'y lo dice');
        eq(U.psChapa.style.display, 'none', 'y sin el sello de activo');
        Pa.conceder(t);
        U.refreshPase();
        eq(U.psBtn.style.display, 'none',
          'con el pase ya en la mano no hay nada que vender: el botón se va');
        eq(U.psChapa.style.display, '', 'y en su sitio queda el sello');
      });
    });

  test('el carril del pase se ve cerrado hasta que es tuyo, y entonces se enciende',
    function () {
      conPantallaPase(function (U, Pa, Tn, A, t) {
        var conPremio = null;
        for (var i = 0; i < U.psCeldas.length; i++) {
          if (U.psCeldas[i].pg) { conPremio = U.psCeldas[i]; break; }
        }
        ok(conPremio, 'hay algún galón que paga en el carril del pase');
        ok(conPremio.celPago.classList.contains('ps-bajollave'),
          'de entrada se ve tras el cristal');
        eq(conPremio.candado.style.display, '', 'con su candado encima');
        eq(conPremio.rejilla.style.display, '', 'y la retícula delante');
        ok(!U.psCinta.classList.contains('abierta'), 'la cinta dice que está cerrado');

        Pa.conceder(t);
        U.refreshPase();
        ok(!conPremio.celPago.classList.contains('ps-bajollave'),
          'al ser suyo se quita el cristal: es lo único que distingue los dos estados');
        eq(conPremio.candado.style.display, 'none', 'sin candados');
        eq(conPremio.rejilla.style.display, 'none', 'ni retícula');
        ok(U.psCinta.classList.contains('abierta'), 'y la cinta se enciende');
      });
    });

  test('la pantalla avisa cuando la temporada todavía no ha empezado',
    function () {
      var antesDe = '2026-09';   // el mes anterior al arranque, a mano
      conPantallaPase(function (U) {
        ok(U.psDormido.textContent.length > 0, 'se avisa de que lo jugado no cuenta');
        eq(U.psDormido.style.display, '', 'y se ve');
      }, antesDe);
      conPantallaPase(function (U) {
        eq(U.psDormido.textContent, '', 'en una temporada que sí cuenta, ni una palabra');
        eq(U.psDormido.style.display, 'none', 'ni sitio ocupado');
      });
    });

  test('el botón del cuartel lleva el galón puesto, y solo si cuenta',
    function () {
      conPase(function (Pa, Tn, A, t) {
        var U = window.PM.UI;
        Pa.ganar(CFG.PASE.POR_GALON * 4, t);
        U.refreshPaseBtn();
        eq(U.menuPaseBtn.textContent, 'PASE · G4', 'el galón, desde el menú');
      });
      conPase(function (Pa, Tn, A) {
        var U = window.PM.UI;
        U.refreshPaseBtn();
        eq(U.menuPaseBtn.textContent, 'PASE',
          'con la temporada dormida no se anuncia ningún número: sería mentira');
      }, '2026-09');
    });

  test('la tienda empieza con 1.500 monedas y cobra lo que vale', function () {
    conTienda(function (Tn) {
      eq(Tn.saldo(), 1500, 'saldo inicial');
      ok(!Tn.tiene('acc_gafas'), 'nada comprado');
      ok(Tn.tiene('risa'), 'los seis emotes de siempre son de todos');
      ok(Tn.comprar('acc_gafas').ok, 'se compra');
      eq(Tn.saldo(), 1050, 'descuenta 450');
      ok(Tn.tiene('acc_gafas'), 'y es tuyo');
      ok(!Tn.comprar('acc_gafas').ok, 'no se compra dos veces');
      eq(Tn.saldo(), 1050, 'ni se cobra dos veces');
      ok(!Tn.comprar('cuy').ok, 'sin saldo para 1.500 no se compra');
      ok(!Tn.tiene('cuy'), 'y no queda comprada');
      ok(!Tn.comprar('clasico').ok, 'lo que no se vende no se compra');
    });
  });

  /* COFRES (17 sep): hay vestuario que NO se vende — solo sale de un cofre.
   * Existe, se puede tener y se puede poner, pero la tienda no lo enseña ni
   * lo cobra, y el saldo no se entera. */
  test('lo de cofre no se compra, pero es tuyo cuando sale', function () {
    conTienda(function (Tn, A) {
      var deCofre = Tn.CATALOGO.filter(function (it) { return it.cofre; });
      ok(deCofre.length >= 8, 'hay vestuario de cofre en el catálogo');
      ok(Tn.VENTA.every(function (it) { return !it.cofre; }), 'la tienda no lo pone a la venta');
      ok(deCofre.every(function (it) { return !it.precio; }), 'y no tiene precio');

      var uno = 'efx_portales';
      ok(Tn.esDeCofre(uno), uno + ' es de cofre');
      ok(!Tn.tiene(uno), 'todavía no es tuyo');
      var r = Tn.comprar(uno);
      ok(!r.ok && /COFRE/.test(r.msg), 'no se puede comprar: ' + r.msg);
      eq(Tn.saldo(), 1500, 'y no ha tocado el saldo');

      /* lo que hará el cofre: subir su contador, como una compra */
      A.record('c_' + uno, 1);
      ok(Tn.tiene(uno), 'después de salir del cofre, es tuyo');
      eq(Tn.saldo(), 1500, 'y sigue sin costar nada');

      /* las skins de cofre van por el mismo camino */
      var Sk = window.PM.Skins;
      var cofreSkins = CFG.SKINS.filter(function (sk) { return sk.grupo === 'cofre'; });
      eq(cofreSkins.length, 7, 'las siete skins de cofre');
      ok(cofreSkins.some(function (sk) { return sk.legendaria; }), 'una es la del Legendario');
      var sk1 = cofreSkins[0];
      ok(!Sk.estado(sk1.id).abierta, sk1.id + ': cerrada hasta que salga de un cofre');
      eq(Sk.estado(sk1.id).chip.indexOf('COFRE'), 0, sk1.id + ': lo dice su etiqueta');
      A.record('c_' + sk1.id, 1);
      ok(Sk.estado(sk1.id).abierta, sk1.id + ': abierta cuando sale');
      eq(Tn.saldo(), 1500, 'tener skins de cofre no cuesta monedas');
    });
  });

  /* El vestuario del 17 de septiembre: las piezas nuevas existen, están
   * dibujadas y cada una sabe de dónde sale. */
  test('el vestuario nuevo está entero y bien clasificado', function () {
    var S = window.PM.Sprites;
    var SKINS = ['lava', 'hielo', 'chicle', 'plasma', 'enjambre', 'galaxia', 'agujero'];
    var ACCS = ['acc_espartano', 'acc_antenas', 'acc_bufanda', 'acc_cuernos', 'acc_obra',
      'acc_aureola', 'acc_alas'];
    var EFXS = ['efx_tinta', 'efx_petalos', 'efx_monedas', 'efx_humo',
      'efx_portales', 'efx_constelacion'];
    var EMOS = ['lloron', 'ardiendo', 'beso', 'idea', 'gg'];
    SKINS.forEach(function (id) {
      ok(S.ARTE.hasOwnProperty(id), id + ': tiene dibujo');
      ok(CFG.SKIN_IDS.indexOf(id) !== -1, id + ': está en el catálogo');
    });
    ACCS.forEach(function (id) {
      ok(S.ACCESORIOS.hasOwnProperty(id), id + ': tiene dibujo');
      ok(CFG.ACCESORIO_IDS.indexOf(id) !== -1, id + ': está en el catálogo');
    });
    EFXS.forEach(function (id) {
      ok(S.EFECTOS.hasOwnProperty(id), id + ': tiene dibujo');
      ok(CFG.EFECTO_IDS.indexOf(id) !== -1, id + ': está en el catálogo');
    });
    EMOS.forEach(function (id) {
      ok(S.CARAS_TIENDA[id], id + ': tiene cara');
      ok(CFG.EMOTE_IDS.indexOf(id) !== -1, id + ': se puede poner en una tecla');
    });
    /* las de material conservan la silueta: por eso admiten accesorios sin
     * tener que apuntarles la cabeza */
    SKINS.forEach(function (id) {
      ok(!window.PM.Skins.rara(id), id + ': no es extravagante');
      eq(S.anclaAccesorio(id, 'acc_gafas'), null, id + ': el accesorio va tal cual');
    });
  });

  test('las monedas de una partida: minuto, miles y tope', function () {
    var Tn = window.PM.Tienda;
    eq(Tn.dePartida(0, 20), 0, 'reiniciar sin jugar no paga');
    eq(Tn.dePartida(0, 60), 20, 'un minuto: 20');
    eq(Tn.dePartida(3999, 30), 12, 'corta pero con puntos: 4 por cada 1.000');
    eq(Tn.dePartida(12500, 300), 68, '20 + 48');
    eq(Tn.dePartida(999999, 900), 200, 'tope de 200');
  });

  test('el saldo se calcula: juntar dos aparatos no duplica ni borra compras', function () {
    conTienda(function (Tn, A) {
      Tn.ganar(300);
      Tn.comprar('efx_nieve');                       // 1.800 - 250
      eq(Tn.saldo(), 1550);
      // la nube trae menos ganado y otra compra
      A.merge({ monedas: 100, c_emo_x: 1, c_chulo: 1 });
      eq(Tn.ganadas(), 300, 'lo ganado se queda con lo mejor, no se suma');
      ok(Tn.tiene('efx_nieve') && Tn.tiene('chulo'), 'las compras de los dos lados');
      eq(Tn.saldo(), 1400, '1.500 + 300 - 250 - 150');
    });
  });

  test('el regalo de veterano: 5 por partida y 50 por logro, una vez y sin duplicarse', function () {
    conTienda(function (Tn, A) {
      var T = CFG.TIENDA;
      A.record('partidas', 100);
      A.record('fantasmas', 1000);                   // algún logro de fantasmas
      var logros = A.count();
      A.sembrarBono();
      var esperado = 100 * T.VETERANO_POR_PARTIDA + logros * T.VETERANO_POR_LOGRO;
      eq(Tn.regalo(), esperado, 'partidas y logros');
      eq(Tn.saldo(), T.INICIALES + esperado, 'y entra en el saldo');

      // lo jugado después ya no lo mueve: se calcula una vez
      A.record('partidas', 50);
      A.sembrarBono();
      eq(Tn.regalo(), esperado, 'congelado');
      eq(Tn.ganadas(), 0, 'y no se mezcla con lo ganado');

      // la nube con su propio regalo: se queda el mayor, no la suma
      A.merge({ bono: 40, partidas: 10 });
      eq(Tn.regalo(), esperado, 'juntar aparatos no lo cobra dos veces');
      A.merge({ bono: esperado + 500 });
      eq(Tn.regalo(), esperado + 500, 'si el otro aparato calculó más, vale el de allí');
    });
  });

  test('una cuenta sin regalo en la nube lo calcula con su historial', function () {
    conTienda(function (Tn, A) {
      A.sembrarBono();                               // aparato nuevo: nada jugado
      eq(Tn.regalo(), 0, 'sin historial no hay regalo');
      A.merge({ partidas: 200 });                    // la cuenta trae 200 partidas
      ok(Tn.regalo() >= 200 * CFG.TIENDA.VETERANO_POR_PARTIDA, 'se calcula con lo de la nube');
    });
  });

  test('lo puesto solo vale si es tuyo, y las teclas de emote no repiten cara', function () {
    conTienda(function (Tn) {
      var s = window.PM.settings;
      s.acc1 = 'acc_chistera';
      eq(Tn.accesorio(), '', 'un accesorio sin comprar no se lleva');
      Tn.ganar(1000);
      Tn.comprar('acc_chistera');
      eq(Tn.accesorio(), 'acc_chistera', 'comprado, sí');
      ok(!Tn.ponerEmote(0, 'chulo'), 'un emote sin comprar no va a una tecla');
      Tn.comprar('chulo');
      ok(Tn.ponerEmote(2, 'chulo'), 'comprado, sí');
      eq(Tn.emoteDeTecla(2), 'chulo');
      Tn.ponerEmote(0, 'chulo');                     // pasa de la 3 a la 1
      var caras = Tn.emotes();
      eq(caras[0], 'chulo', 'va a la tecla 1');
      eq(caras[2], 'risa', 'la que había en la 1 pasa a la 3');
      eq(caras.filter(function (c) { return c === 'chulo'; }).length, 1, 'nunca dos veces');
      s.emotes1 = 'dormido,dormido,xx,,amor,amor';
      caras = Tn.emotes();
      eq(caras.length, 6, 'seis teclas');
      for (var i = 0; i < caras.length; i++) {
        ok(Tn.tiene(caras[i]), 'tecla ' + (i + 1) + ': una cara tuya');
        eq(caras.indexOf(caras[i]), i, 'tecla ' + (i + 1) + ': sin repetir');
      }
    });
  });

  test('el emote viaja por su id y el número de antes sigue valiendo', function () {
    conTienda(function (Tn) {
      partida(2, 'guest');
      G.emotes = [null, null];
      G.applyEvt({ t: 'emote', w: 0, e: 'chulo' });
      eq(G.emotes[0] && G.emotes[0].e, 'chulo', 'una cara de la tienda');
      G.emotes = [null, null];
      G.applyEvt({ t: 'emote', w: 0, e: 1 });
      eq(G.emotes[0] && G.emotes[0].e, 'llanto', 'la posición vieja se traduce');
      G.emotes = [null, null];
      G.applyEvt({ t: 'emote', w: 0, e: 'noexiste' });
      eq(G.emotes[0], null, 'lo que no existe no se pinta');
      G.toMenu();
      Tn.ganar(500);
      Tn.comprar('ko');
      Tn.ponerEmote(3, 'ko');
      var mandados = [];
      partida(2, 'guest');
      var viejo = G.netSend;
      G.netSend = function (t, d) { mandados.push(d); };
      try {
        G.emoteCooldown = 0;
        G.sendEmote(3);
      } finally { G.netSend = viejo; }
      eq(mandados.length && mandados[0].e, 'ko', 'la tecla 4 manda la cara que lleva');
      G.toMenu();
    });
  });

  test('accesorio y efecto viajan en el saludo y se pintan en la partida', function () {
    conTienda(function (Tn) {
      Tn.ganar(2000);
      Tn.comprar('acc_gafas');
      Tn.comprar('efx_rayos');
      Tn.poner('accesorio', 'acc_gafas');
      Tn.poner('efecto', 'efx_rayos');
      var me = window.PM.Party.me();
      eq(me.a, 'acc_gafas', 'el accesorio va en el saludo');
      eq(me.x, 'efx_rayos', 'y el efecto');
      var UI = window.PM.UI;
      eq(UI.lookDeRed({ a: 'acc_inventado', x: 'efx_rayos' }).a, '', 'lo desconocido no se pinta');
      G.newGame({ players: 2, net: 'host', names: ['A', 'B'],
        looks: [{ a: '', x: '' }, { a: 'acc_gafas', x: 'efx_rayos' }] });
      var ex = G.pacExtra(G.pacs[1], 1);
      eq(ex.accesorio, 'acc_gafas');
      eq(ex.efecto, 'efx_rayos');
      eq(G.pacExtra(G.pacs[0], 0).accesorio, '', 'cada uno lo suyo');
      G.toMenu();
      partida(1);
      eq(G.pacExtra(G.pacs[0], 0).efecto, 'efx_rayos', 'en local, lo tuyo');
      G.toMenu();
    });
  });

  test('efectos y accesorios se pintan sobre cualquier skin sin romper', function () {
    var S = window.PM.Sprites;
    var cv = document.createElement('canvas');
    cv.width = 72; cv.height = 72;
    var ctx = cv.getContext('2d');
    ctx.setTransform(3, 0, 0, 3, 0, 0);
    ['clasico', 'pixel', 'cometa', 'calavera', 'galleta'].forEach(function (skin) {
      CFG.EFECTOS.concat(CFG.ACCESORIOS).forEach(function (it) {
        for (var d = 0; d < 4; d++) {
          S.drawPacman(ctx, 12, 12, d, d % 3, '#ff69b4', skin, {
            t: 2 + d, s: 140 + d * 7, giro: d * 9, confeti: d * 0.3,
            back: function (dist) { return { x: 12 - dist, y: 12, d: 3 }; },
            efecto: (it.id.indexOf('efx_') === 0) ? it.id : null,
            accesorio: (it.id.indexOf('acc_') === 0) ? it.id : null
          });
        }
      });
    });
    /* CRUCE (15 sep): los accesorios van con cualquier skin. Cada extravagante
     * tiene apuntada su cabeza, y cada accesorio cae en su zona de ella. */
    CFG.SKINS.forEach(function (sk) {
      ok(S.admiteAccesorio(sk.id), sk.id + ' admite accesorios');
      if (sk.rara) {
        var c = S.anclaAccesorio(sk.id, 'acc_gafas'),
            h = S.anclaAccesorio(sk.id, 'acc_chistera'),
            p = S.anclaAccesorio(sk.id, 'acc_pajarita');
        ok(c && h && p && c.k > 0 && c.k <= 1, sk.id + ' tiene su cabeza apuntada');
        // dónde quedan de verdad: el ala del sombrero (R - 1) y el nudo de la pajarita (-R + 0,2)
        var R = CFG.PAC_R;
        ok(h.y + h.k * (R - 1) > p.y + p.k * (-R + 0.2),
           sk.id + ': el sombrero va más arriba que la pajarita');
      } else {
        eq(S.anclaAccesorio(sk.id, 'acc_gafas'), null, sk.id + ': con forma de Pac-Man, tal cual');
      }
    });
    /* y el accesorio acompaña a la pieza que se mueve: la HAMBURGUESA abre
     * subiendo el pan de arriba, así que el sombrero gira con él, y la
     * pajarita (abajo) no */
    if (typeof DOMMatrix === 'function') {
      var HALF2 = 40 * Math.PI / 180;
      var quieta = S.deltaPose('hamburguesa', { t: 0.3, half: 0, qSeg: null }, 'cabeza');
      ok(Math.abs(quieta.b) < 1e-5 && Math.abs(quieta.e) < 1e-5 && Math.abs(quieta.f) < 1e-5,
         'en la pose medida no se mueve nada');
      var abierta = S.deltaPose('hamburguesa', { t: 0.3, half: HALF2, qSeg: null }, 'cabeza');
      ok(Math.abs(abierta.b) > 0.1, 'con la boca abierta, el sombrero gira con el pan');
      var cuello = S.deltaPose('hamburguesa', { t: 0.3, half: HALF2, qSeg: null }, 'cuello');
      ok(Math.abs(cuello.b) < 1e-5, 'la pajarita se queda con la parte de abajo');
      var aulla = S.deltaPose('lobo', { t: 3.0, half: 0, qSeg: null }, 'cabeza');
      ok(Math.abs(aulla.b) > 0.1, 'el LOBO sin aullar baja la cabeza, y el sombrero con ella');
    }
    CFG.EMOTES_TIENDA.forEach(function (e) {
      S.drawEmote(ctx, 12, 20, e.id, '#ffff00', 33);
      S.drawPacFace(ctx, 12, 12, 7, '#ffff00', e.id);
    });
  });

  test('las skins nuevas hacen su Q y su muerte propia sin romper', function () {
    var S = window.PM.Sprites;
    var cv = document.createElement('canvas');
    cv.width = 72; cv.height = 72;
    var ctx = cv.getContext('2d');
    ctx.setTransform(3, 0, 0, 3, 0, 0);
    ['bomba', 'abisal', 'lobo', 'pinata', 'tostadora', 'gargola', 'pulpo', 'momia', 'globo',
     'bicefalo', 'cuy', 'llama', 'carro', 'oso', 'galleta'].forEach(function (id) {
      ok(S.ARTE.hasOwnProperty(id), id + ': tiene dibujo');
      for (var q = 0; q <= 1.5; q += 0.25) {
        S.drawPacman(ctx, 12, 12, 3, 2, '#ffff00', id, { t: 3, muerde: q < 0.4, mordio: true, qSeg: q });
      }
      for (var k = 0; k <= 10; k++) S.drawSkinDeath(ctx, 12, 12, k / 10, '#ffff00', id, k % 4);
    });
  });

  test('HOMBRE LOBO: luna llena, de noche, en la hora de quien juega', function () {
    var Sk = window.PM.Skins;
    ok(Sk.lunaLlena(new Date(2026, 8, 26, 22, 0)), 'el 26 de septiembre de 2026 por la noche');
    ok(!Sk.lunaLlena(new Date(2026, 8, 26, 13, 0)), 'a mediodía no');
    ok(!Sk.lunaLlena(new Date(2026, 8, 15, 22, 0)), 'el 15 no');
    var p = Sk.proximaLuna(new Date(2026, 8, 15, 12, 0));
    eq(p.getMonth(), 8, 'la próxima es en septiembre');
    ok(p.getDate() >= 25 && p.getDate() <= 27, 'hacia el 26 (' + p.getDate() + ')');
    conLogrosLimpios(function (A) {
      ok(!Sk.estado('lobo').abierta, 'cerrada');
      Sk.anotarTemporada(new Date(2026, 8, 26, 23, 30));
      ok(Sk.estado('lobo').abierta, 'abierta tras jugar esa noche');
    });
  });

  test('una partida y un reto del DAILY dan monedas, y salen en el resumen', function () {
    conTienda(function (Tn) {
      partida(1);
      G.score = 7400;
      G.timeTicks = 90 * 60;
      // que el reto de hoy no se cumpla por el camino y sume sus 20
      var Dl = window.PM.Daily, apunta = Dl.apunta;
      Dl.apunta = function () { return []; };
      try { G.closeRun(); } finally { Dl.apunta = apunta; }
      eq(Tn.ganadas(), 48, '20 + 28');
      eq(G.runSummary.monedas, 48, 'al resumen');
      eq(G.runSummary.saldo, 1548);
      G.toMenu();
      conDaily(function (Dy) {
        var antes = Tn.ganadas();
        Dy.premiar(Dy.leer());
        eq(Tn.ganadas() - antes, CFG.TIENDA.POR_RETO, '20 por el reto');
      });
    });
  });

  // ---------------------------------------------------------------
  // CONTINUAR (17 sep): 1.000 monedas por seguir con 1 vida
  // ---------------------------------------------------------------
  function sinVidas() {
    for (var i = 0; i < G.pacs.length; i++) {
      var p = G.pacs[i];
      p.dying = false; p.out = true; p.lives = 0;
    }
    G.lives = 0;
    G.state = 'DYING';
    G.stepDying();
  }

  test('sin vidas sale el CONTINUE?, y pagar sigue con 1 vida en el mismo nivel', function () {
    conTienda(function (Tn) {
      partida(1);
      try {
        G.score = 5000;
        G.level = 3;
        sinVidas();
        eq(G.state, 'CONTINUE', 'antes del GAME OVER, la cuenta atrás');
        eq(G.contTicks, CFG.CONTINUAR.TICKS, '10 segundos');
        ok(!G.canPause(), 'no se pausa para pensárselo');
        ok(G.pedirContinuar(), 'se paga');
        eq(Tn.saldo(), 500, 'cuesta 1.000');
        eq(G.state, 'READY', 'se sigue');
        eq(G.level, 3, 'en el mismo nivel');
        eq(G.lives, 1, 'con 1 vida');
        ok(!G.pacs[0].out, 'Pac-Man vuelve');
        eq(G.score, 5000, 'los puntos se quedan');
        ok(!G.pedirContinuar(), 'ya no hay nada que pagar');
        eq(Tn.saldo(), 500, 'ni se cobra otra vez');
        var rep = window.PM.Replay.enCurso();
        ok(rep && rep.entradas.some(function (e) { return e[2] === 8; }), 'y queda en la repetición');
      } finally { G.toMenu(); window.PM.UI.hidePrompt(); }
    });
  });

  test('si nadie paga en 10 segundos, GAME OVER sin cobrar', function () {
    conTienda(function (Tn) {
      partida(1);
      try {
        sinVidas();
        ticks(CFG.CONTINUAR.TICKS - 1);
        eq(G.state, 'CONTINUE', 'todavía se puede');
        ticks(2);
        eq(G.state, 'GAME_OVER', 'se acabó el tiempo');
        eq(Tn.saldo(), 1500, 'no se cobra nada');
        ok(!G.pedirContinuar(), 'ya no se puede pagar');
      } finally { G.toMenu(); window.PM.UI.hidePrompt(); }
    });
  });

  test('JUGAR OTRA VEZ vale también durante la cuenta atrás', function () {
    conTienda(function (Tn) {
      partida(1);
      try {
        G.score = 2500;
        sinVidas();
        eq(G.state, 'CONTINUE');
        var cerradas = 0, cierra = G.closeRun;
        G.closeRun = function () { cerradas++; return cierra.apply(this, arguments); };
        try { ok(G.otraDesdeContinue(), 'empieza otra'); } finally { G.closeRun = cierra; }
        ok(cerradas >= 1, 'la de antes se cierra y se cobra');
        eq(G.score, 0, 'partida nueva');
        ok(Tn.saldo() >= 1500, 'sin pagar el continuar (y con lo ganado en la partida): ' + Tn.saldo());
      } finally { G.toMenu(); window.PM.UI.hidePrompt(); }
    });
  });

  test('sin monedas para seguir, el GAME OVER sale directo', function () {
    conTienda(function (Tn) {
      ok(Tn.comprar('cuy').ok, 'se gasta todo');
      partida(1);
      try {
        sinVidas();
        eq(G.state, 'GAME_OVER', 'no hay nada que esperar');
      } finally { G.toMenu(); window.PM.UI.hidePrompt(); }
    });
  });

  test('CACERÍA no tiene continuar', function () {
    partida(1);
    try {
      G.caza = true;
      ok(!G.puedeContinuar(), 'la vida es de la máquina');
    } finally { G.caza = false; G.toMenu(); }
  });

  test('en party, pagar el CONTINUE no deja fuera a los demás', function () {
    /* Antes, el primero que pagaba revivía y reanudaba la partida en el acto,
     * y los demás se quedaban sin poder pagar la suya: el más rápido decidía
     * por todos. Ahora el pago se apunta y se espera a la cuenta atrás. */
    partida(2, 'host');
    try {
      G.livesMode = 'individual';
      sinVidas();
      eq(G.state, 'CONTINUE', 'online siempre se abre: puede pagar cualquiera');
      G.hostGuestEvent({ t: 'contReq', i: 1 }, 1);
      eq(G.state, 'CONTINUE', 'con uno pagado, se sigue esperando');
      ok(G.pacs[1].out, 'todavía no ha vuelto');
      ok(G.contPagado[1], 'pero su pago está apuntado');
      ok(G.contHasta[0] > G.tick, 'y al otro aún le queda su turno');

      /* se acaba la cuenta: vuelve el que pagó, el otro no */
      G.contTicks = 1;
      G.stepContinue();
      eq(G.state, 'READY', 'al acabarse, se sigue');
      ok(!G.pacs[1].out, 'el que pagó vuelve');
      eq(G.pacs[1].lives, 1, 'con 1 vida');
      ok(G.pacs[0].out, 'el que no pagó se queda mirando');
    } finally { G.toMenu(); }
  });

  test('en party, si pagan TODOS no se espera a la cuenta atrás', function () {
    partida(2, 'host');
    try {
      G.livesMode = 'individual';
      sinVidas();
      eq(G.state, 'CONTINUE', 'se abre');
      G.hostGuestEvent({ t: 'contReq', i: 1 }, 1);
      eq(G.state, 'CONTINUE', 'con uno, se espera');
      G.revivir(0);                       // paga el anfitrión
      eq(G.state, 'READY', 'con todos pagados, se sigue en el acto');
      ok(!G.pacs[0].out && !G.pacs[1].out, 'y vuelven los dos');
    } finally { G.toMenu(); }
  });

  test('muerto del todo, la pausa es solo tuya', function () {
    partida(2, 'guest');
    try {
      var yo = G.pacs[G.localIdx];
      yo.out = true;
      var mandados = [], envia = G.netSend;
      G.netSend = function (n, d) { mandados.push([n, d]); };
      try {
        G.requestPause();
        ok(G.paused, 'se pausa tu pantalla');
        eq(mandados.length, 0, 'y no se le pide nada a nadie: los demás siguen');
      } finally { G.netSend = envia; G.setPaused(false); }
    } finally { G.toMenu(); }
  });

  test('en party, el invitado pide, y se le cobra solo si el anfitrión dice que sí', function () {
    conTienda(function (Tn) {
      partida(2, 'guest');
      var mandados = [], envia = G.netSend;
      G.netSend = function (n, d) { mandados.push([n, d]); };
      try {
        var me = G.pacs[G.localIdx];
        me.out = true; me.lives = 0;
        G.applyEvt({ t: 'contAbre', tk: CFG.CONTINUAR.TICKS });
        eq(G.state, 'CONTINUE', 'le llega la cuenta atrás');
        ok(G.pedirContinuar(), 'lo pide');
        ok(mandados.some(function (m) { return m[1] && m[1].t === 'contReq'; }), 'se lo pide al anfitrión');
        eq(Tn.saldo(), 1500, 'todavía sin cobrar');
        ok(!G.pedirContinuar(), 'no se pide dos veces');
        G.applyEvt({ t: 'ready', lvl: G.level, full: false, rt: 60 });
        G.applyEvt({ t: 'contOk', w: G.localIdx });
        eq(Tn.saldo(), 500, 'con el sí, se cobra');
        ok(!me.out, 'y vuelve a jugar');
        G.applyEvt({ t: 'contOk', w: G.localIdx });
        eq(Tn.saldo(), 500, 'un sí repetido no cobra otra vez');
      } finally { G.netSend = envia; G.toMenu(); }
    });
  });

  // ---------------------------------------------------------------
  // PASAR EL MANDO (18 sep)
  // ---------------------------------------------------------------
  test('el anfitrión que se va le pasa el mando al siguiente', function () {
    partida(2, 'host');
    var mandados = [], envia = G.netSend;
    G.netSend = function (n, d) { mandados.push([n, d]); };
    try {
      eq(G.hostIdx, 0, 'manda el primer asiento');
      eq(G.sucesor(), 1, 'y le tocaría al segundo');
      ok(G.pasarElMando(), 'el traspaso sale por la red');
      var m = mandados.filter(function (x) { return x[0] === 'mando'; });
      eq(m.length, 1, 'uno solo');
      eq(m[0][1].n, 1, 'para el asiento 1');
      eq(m[0][1].v, 0, 'y lo deja el 0');
      ok(m[0][1].s && m[0][1].s.pm, 'con el mapa de pastillas entero');
      ok(m[0][1].x && typeof m[0][1].x.si === 'number', 'y el reloj de persecuciones');
      /* solo: no hay a quién dejárselo */
      G.idos[1] = true;
      eq(G.sucesor(), -1, 'sin nadie detrás, no hay traspaso');
      ok(!G.pasarElMando());
    } finally { G.netSend = envia; G.toMenu(); }
  });

  test('el que recibe el mando sigue la partida sin el anfitrión', function () {
    partida(2, 'host');
    var snap = G.buildSnapshot(true), extra = G.estadoExtra();
    G.toMenu();
    partida(2, 'guest');
    try {
      eq(G.localIdx, 1, 'era el invitado');
      G.recibirMando({ n: 1, v: 0, s: snap, x: extra });
      eq(G.netRole, 'host', 'ahora manda él');
      eq(G.hostIdx, 1, 'y lo sabe');
      ok(G.pacs[0].out, 'el que se fue se queda fuera');
      ok(!G.pacs[1].out, 'y él sigue jugando');
      ok(!G.netNotice, 'sin aviso de partida acabada');
      ok(G.idos[0], 'queda apuntado que se fue');
      G.playerGone(0);
      ok(!G.netNotice, 'y un adiós tardío suyo ya no acaba la partida');
    } finally { G.toMenu(); }
  });

  test('a los demás invitados el traspaso solo les cambia quién manda', function () {
    partida(3, 'host');
    var snap = G.buildSnapshot(true), extra = G.estadoExtra();
    G.toMenu();
    G.newGame({ players: 3, net: 'guest', localIdx: 2,
                names: ['UNO', 'DOS', 'TRES'] });
    G.state = 'PLAYING';
    try {
      G.recibirMando({ n: 1, v: 0, s: snap, x: extra });
      eq(G.netRole, 'guest', 'él sigue de invitado');
      eq(G.hostIdx, 1, 'pero ahora manda el asiento 1');
      ok(G.pacs[0].out, 'el que se fue, fuera');
      eq(G.idxOfSender({}, 'nadie'), 0, 'y el asiento por defecto ya no es el 1');
      G.guestMsg('bye', { i: 0 }, 'nadie');
      ok(!G.netNotice, 'el adiós del que ya se fue no acaba nada');
    } finally { G.toMenu(); }
  });

  // ---------------------------------------------------------------
  // REVIVIR AL COMPAÑERO (17 sep)
  // ---------------------------------------------------------------
  function duoConVidasPropias() {
    partida(2);
    G.livesMode = 'individual';
    G.pacs[0].lives = 3;
    G.pacs[1].lives = 1;
    return G;
  }

  test('sin vidas y con el compañero jugando, el cuerpo se queda tirado', function () {
    duoConVidasPropias();
    try {
      var j2 = G.pacs[1];
      j2.x = 100; j2.y = 150;
      G.finishPacDeath(1);
      ok(j2.out, 'J2 fuera');
      ok(G.cuerpos[1], 'su cuerpo se queda');
      eq(G.cuerpos[1].x + ',' + G.cuerpos[1].y, '100,150', 'donde cayó');
      eq(G.cuerpos[1].t, CFG.REVIVIR.CUERPO_TICKS, 'el cuerpo aguanta lo que dice CFG');
      eq(CFG.REVIVIR.CUERPO_TICKS, 900, 'quince segundos para levantarlo');
      eq(G.state, 'PLAYING', 'y la partida sigue');
    } finally { G.toMenu(); }
  });

  /* 18 sep: si los dos caían en el mismo tick, el que se quedaba sin vidas
   * no dejaba cuerpo porque su compañero figuraba como 'muriendo'. */
  test('cayendo los dos a la vez, el que se queda sin vidas deja cuerpo', function () {
    duoConVidasPropias();
    try {
      var j1 = G.pacs[0], j2 = G.pacs[1];
      j2.x = 100; j2.y = 150;
      G.startDeath(1);
      G.startDeath(0);
      ok(j1.dying && j2.dying, 'los dos muriendo en el mismo tick');
      G.finishPacDeath(1);          // J2 se queda sin vidas con J1 aún muriendo
      ok(j2.out, 'J2 fuera');
      ok(G.cuerpos[1], 'y su cuerpo se queda igual, que J1 va a volver');
      G.finishPacDeath(0);
      ok(!j1.out, 'J1 reaparece con las que le quedaban');
      ok(G.cuerpos[1], 'el cuerpo sigue ahí para levantarlo');
    } finally { G.toMenu(); }
  });

  test('cinco pasadas por encima lo reviven con 1 vida y escudo', function () {
    duoConVidasPropias();
    try {
      var j1 = G.pacs[0], j2 = G.pacs[1];
      j2.x = 100; j2.y = 150;
      G.finishPacDeath(1);
      for (var v = 0; v < CFG.REVIVIR.PASADAS; v++) {
        j1.x = 100; j1.y = 150;
        G.stepCuerpos();
        if (v < CFG.REVIVIR.PASADAS - 1) {
          ok(j2.out, 'todavía no (' + (v + 1) + ')');
          G.stepCuerpos();                        // quedarse encima no cuenta dos veces
          eq(G.cuerpos[1].n, v + 1, 'una pasada por vez');
        }
        j1.x = 60; j1.y = 150;
        G.stepCuerpos();
      }
      ok(!j2.out, 'J2 vuelve');
      eq(j2.lives, 1, 'con 1 vida');
      eq(j2.safeTicks, CFG.REVIVIR.ESCUDO_TICKS, 'y 5 s de escudo');
      eq(j2.x + ',' + j2.y, '100,150', 'donde estaba su cuerpo');
      ok(!G.cuerpos[1], 'el cuerpo ya no está');
    } finally { G.toMenu(); }
  });

  /* 18 sep: el SOPORTE levanta de una sola pasada. Cinco vueltas sobre un
   * cuerpo con los fantasmas encima no las da nadie, y levantar es lo suyo. */
  test('el SOPORTE levanta un cuerpo de una sola pasada', function () {
    window.PM.settings.muted = true;
    G.newGame({ players: 2, hab: true, roles: ['soporte', 'asesino'] });
    G.state = 'PLAYING'; G.readyTicks = 0;
    try {
      for (var i = 0; i < G.pacs.length; i++) G.pacs[i].safeTicks = 999999;
      ok(G.esSoporte(0), 'el J1 lleva el Soporte');
      ok(!G.esSoporte(1), 'el J2 no');
      eq(G.pasadasDe(0), 1, 'al Soporte le basta una pasada');
      eq(G.pasadasDe(1), CFG.REVIVIR.PASADAS, 'a los demás, las de siempre');
      G.livesMode = 'individual';
      var j2 = G.pacs[1];
      j2.lives = 1;
      j2.x = 100; j2.y = 150;
      G.finishPacDeath(1);
      ok(G.cuerpos[1], 'el cuerpo se queda');
      var sop = G.pacs[0];
      sop.x = 100; sop.y = 150;              // una pasada por encima
      G.stepCuerpos();
      ok(!G.cuerpos[1], 'y con una sola pasada del Soporte, el cuerpo se va');
      ok(!j2.out, 'el compañero vuelve a jugar');
      eq(j2.lives, CFG.REVIVIR.VIDAS, 'con lo que da el revivir');
    } finally { G.toMenu(); }
  });

  /* y al revés: sin Soporte siguen haciendo falta las cinco */
  test('sin Soporte, una sola pasada no levanta a nadie', function () {
    window.PM.settings.muted = true;
    G.newGame({ players: 2, hab: true, roles: ['tanque', 'asesino'] });
    G.state = 'PLAYING'; G.readyTicks = 0;
    try {
      for (var i = 0; i < G.pacs.length; i++) G.pacs[i].safeTicks = 999999;
      G.livesMode = 'individual';
      var j2 = G.pacs[1];
      j2.lives = 1; j2.x = 100; j2.y = 150;
      G.finishPacDeath(1);
      G.pacs[0].x = 100; G.pacs[0].y = 150;
      G.stepCuerpos();
      ok(G.cuerpos[1], 'el cuerpo sigue ahí');
      eq(G.cuerpos[1].n, 1, 'con una pasada apuntada');
      ok(j2.out, 'y el compañero sigue fuera');
    } finally { G.toMenu(); }
  });

  test('a los 30 segundos el cuerpo desaparece', function () {
    duoConVidasPropias();
    try {
      G.finishPacDeath(1);
      G.cuerpos[1].t = 1;
      G.pacs[0].x = 10; G.pacs[0].y = 10;
      G.stepCuerpos();
      ok(!G.cuerpos[1], 'se fue');
      ok(G.pacs[1].out, 'y J2 sigue fuera');
    } finally { G.toMenu(); }
  });

  test('al acabar el nivel, quien está fuera puede pagar para volver', function () {
    conTienda(function (Tn) {
      duoConVidasPropias();
      try {
        G.finishPacDeath(1);
        G.cuerpos = [];
        var nivel = G.level;
        G.state = 'LEVEL_DONE'; G.levelPhase = 1; G.phaseTicks = 1;
        G.stepLevelDone();
        eq(G.state, 'REVIVIR', 'sale la vista de revivir');
        ok(G.contDisponible(), 'se puede pagar');
        ok(G.pedirContinuar(), 'se paga');
        eq(Tn.saldo(), 500, '1.000 monedas');
        ok(!G.pacs[1].out, 'J2 vuelve');
        eq(G.level, nivel + 1, 'y se pasa al nivel siguiente');
        eq(G.state, 'READY');
      } finally { G.toMenu(); window.PM.UI.hidePrompt(); }
    });
  });

  /* 18 sep: antes la única salida del panel era el MENÚ, y desde el
   * anfitrión eso cortaba la partida de todos. */
  test('SEGUIR VIENDO cierra el panel y no vuelve a preguntar', function () {
    conTienda(function () {
      duoConVidasPropias();
      try {
        G.finishPacDeath(1);
        G.cuerpos = [];
        var nivel = G.level;
        G.state = 'LEVEL_DONE'; G.levelPhase = 1; G.phaseTicks = 1;
        G.stepLevelDone();
        eq(G.state, 'REVIVIR', 'sale la vista de revivir');
        ok(G.renunciarRevivir(), 'dice que prefiere mirar');
        eq(G.level, nivel + 1, 'y el nivel siguiente arranca sin esperar');
        ok(G.pacs[1].out, 'J2 sigue fuera, mirando');
        ok(G.renunciadoLocal(), 'ya no se le pregunta');
        ok(!G.quedaPorRevivir(), 'no queda nadie por decidir');
        /* y al acabar el nivel siguiente tampoco vuelve el panel */
        ok(!G.ofrecerRevivir(), 'el panel no vuelve a salir');
      } finally { G.toMenu(); window.PM.UI.hidePrompt(); }
    });
  });

  test('SIGUIENTE NIVEL sin pagar deja al compañero mirando', function () {
    conTienda(function (Tn) {
      duoConVidasPropias();
      try {
        G.finishPacDeath(1);
        G.state = 'LEVEL_DONE'; G.levelPhase = 1; G.phaseTicks = 1;
        G.stepLevelDone();
        eq(G.state, 'REVIVIR');
        ok(G.saltarRevivir(), 'se sigue');
        eq(G.state, 'READY', 'nivel siguiente');
        ok(G.pacs[1].out, 'J2 sigue fuera');
        eq(Tn.saldo(), 1500, 'sin cobrar');
      } finally { G.toMenu(); window.PM.UI.hidePrompt(); }
    });
  });

  test('la repetición de un dúo con cuerpo tirado acaba igual', function () {
    var R = window.PM.Replay;
    var previo = null, previoSave = null, modoVidas = window.PM.settings.livesMode;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { previo = null; }
    try { previoSave = localStorage.getItem(CFG.SAVE_KEY); } catch (e) { previoSave = null; }
    conTienda(function () {
      try {
        window.PM.settings.muted = true;
        window.PM.settings.livesMode = 'individual';
        if (G.inGame()) G.toMenu();
        R.salir();
        G.newGame({ players: 2 });
        var cuerpos = 0, tick = 0;
        for (; tick < 80000 && G.state !== 'GAME_OVER'; tick++) {
          // un reparto de giros con el que uno de los dos cae antes que el otro
          if (tick % 40 === 0) G.setPacDir(0, (tick / 40) % 4);
          if (tick % 97 === 0) G.setPacDir(1, ((tick / 97) + 2) % 4);
          if (G.cuerpos.some(function (c) { return !!c; })) cuerpos++;
          if (G.state === 'REVIVIR') G.saltarRevivir();
          G.step();
        }
        ok(cuerpos > 0, 'hubo cuerpo tirado');
        var puntos = G.score, nivel = G.level;
        G.toMenu();
        var reg = R.guardadas()[0];
        ok(reg && reg.p === puntos, 'se guardó');
        R.montar(R.leer(reg.s));
        var n = 0;
        while (G.state !== 'GAME_OVER' && n < 100000) { G.step(); n++; }
        eq(G.score, puntos, 'los mismos puntos');
        eq(G.level, nivel, 'el mismo nivel');
        G.toMenu();
      } finally {
        window.PM.settings.livesMode = modoVidas;
        try {
          if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
          else localStorage.setItem(CFG.REPLAY_KEY, previo);
          if (previoSave === null) localStorage.removeItem(CFG.SAVE_KEY);
          else localStorage.setItem(CFG.SAVE_KEY, previoSave);
        } catch (e) { /* nada */ }
        window.PM.UI.hidePrompt();
      }
    });
  });

  test('CONTINUAR se guarda en el texto de la repetición', function () {
    var R = window.PM.Replay;
    var rep = repDe(9000);
    rep.entradas.push([130, 0, 8]);
    var leido = R.leer(R.serializar(rep));
    ok(leido, 'se lee');
    ok(igual(leido, rep), 'leer(serializar(x)) sigue siendo x');
    var mal = repDe(10);
    mal.entradas.push([130, 1, 8]);
    ok(!R.valida(mal), 'un continuar del J2 no cuela');
  });

  test('la repetición de una partida continuada acaba igual', function () {
    var R = window.PM.Replay;
    var previo = null, previoSave = null;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { previo = null; }
    try { previoSave = localStorage.getItem(CFG.SAVE_KEY); } catch (e) { previoSave = null; }
    conTienda(function () {
      try {
        window.PM.settings.muted = true;
        if (G.inGame()) G.toMenu();
        R.salir();
        G.newGame({ players: 1 });
        var pagados = 0, tick = 0;
        for (; tick < 60000 && G.state !== 'GAME_OVER'; tick++) {
          if (tick % 45 === 0) G.setPacDir(0, (tick / 45) % 4);
          if (G.state === 'CONTINUE' && pagados === 0) { ok(G.pedirContinuar(), 'se paga una vez'); pagados++; }
          G.step();
        }
        eq(pagados, 1, 'se llegó a pagar');
        eq(G.state, 'GAME_OVER', 'y la segunda vez se dejó acabar');
        var puntos = G.score, nivel = G.level;
        G.toMenu();
        var reg = R.guardadas()[0];
        ok(reg && reg.p === puntos, 'se guardó la repetición');
        var rep = R.leer(reg.s);
        ok(rep, 'se lee');
        R.montar(rep);
        var n = 0;
        while (G.state !== 'GAME_OVER' && n < 80000) { G.step(); n++; }
        eq(G.score, puntos, 'los mismos puntos');
        eq(G.level, nivel, 'el mismo nivel');
        G.toMenu();
      } finally {
        try {
          if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
          else localStorage.setItem(CFG.REPLAY_KEY, previo);
          if (previoSave === null) localStorage.removeItem(CFG.SAVE_KEY);
          else localStorage.setItem(CFG.SAVE_KEY, previoSave);
        } catch (e) { /* nada */ }
        window.PM.UI.hidePrompt();
      }
    });
  });

  test('las skins de tienda se abren comprándolas', function () {
    conTienda(function (Tn) {
      var Sk = window.PM.Skins;
      ok(!Sk.estado('oso').abierta, 'sin comprar, cerrada');
      eq(Sk.estado('oso').chip, 'TIENDA');
      Tn.ganar(500);
      ok(Tn.comprar('oso').ok);
      ok(Sk.estado('oso').abierta, 'comprada, abierta');
      ok(window.PM.Sprites.admiteAccesorio('oso'), 'y aunque es extravagante, admite accesorios');
    });
  });

  // ---------------------------------------------------------------
  // Repeticiones de DESATADO con la Q armada (15 sep)
  // ---------------------------------------------------------------
  /* Una partida de DESATADO jugada "a mano" pidiendo la Q antes de tiempo
   * tiene que verse igual en la repetición. Antes se grababa el mordisco que
   * sale solo (dentro de Hab.paso) y la repetición lo aplicaba un tick tarde:
   * una partida de 93.870 puntos se veía morir al minuto. */
  test('la repetición de DESATADO con Q armada acaba igual que la partida', function () {
    var R = window.PM.Replay, H = window.PM.Hab;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { previo = null; }
    var reintentos = 0, pulsarOrig = H.pulsar;
    H.pulsar = function (Gx, idx, k) {
      var ok = pulsarOrig.apply(this, arguments);
      if (ok && this.reintento) reintentos++;
      return ok;
    };
    try {
      window.PM.settings.muted = true;
      if (G.inGame()) G.toMenu();
      R.salir();                       // que no quede nada de otra prueba
      G.newGame({ players: 1, hab: true });
      ok(R.enCurso() && R.enCurso().ajustes.qArmada, 'se graba con la bandera de la Q armada');
      var tick = 0;
      for (; tick < 7000 && G.state !== 'GAME_OVER'; tick++) {
        // lo que haría alguien: girar cada poco y pedir la Q al ver venir un fantasma
        if (tick % 45 === 0) G.setPacDir(0, (tick / 45) % 4);
        if (tick % 5 === 0 && G.state === 'PLAYING') {
          var p = G.pacs[0];
          for (var gi = 0; gi < 4; gi++) {
            var g = G.ghosts[gi];
            if (g.mode === 'house' || g.mode === 'eyes') continue;
            var dx = Math.abs(g.x - p.x), dy = Math.abs(g.y - p.y);
            if (dx < 40 && dy < 40 && (dx > CFG.HAB.BITE_PX || dy > CFG.HAB.BITE_PX)) {
              H.pulsar(G, 0, 0);
              break;
            }
          }
        }
        G.step();
      }
      var tFin = R.t, puntos = G.score, px = G.pacs[0].x, py = G.pacs[0].y, vidas = G.lives;
      G.toMenu();
      ok(reintentos > 0, 'hubo mordiscos de Q armada (' + reintentos + ')');
      var reg = R.guardadas()[0];
      ok(reg && reg.p === puntos, 'se guardó la repetición');
      var rep = R.leer(reg.s);
      ok(rep && rep.ajustes.qArmada, 'la bandera sobrevive al texto (' + reg.s.slice(0, 30) + ')');
      ok(!R.necesitaRecomponer(rep), 'y no hace falta recomponerla');
      H.pulsar = pulsarOrig;
      R.montar(rep);
      var n = 0;
      while (R.t < tFin && G.state !== 'GAME_OVER' && n < 20000) { G.step(); n++; }
      eq(G.score, puntos, 'los mismos puntos');
      eq(G.pacs[0].x + ',' + G.pacs[0].y, px + ',' + py, 'Pac-Man en el mismo sitio');
      G.toMenu();
    } finally {
      H.pulsar = pulsarOrig;
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previo);
      } catch (e) { /* nada */ }
    }
  });

  /* ===============================================================
   * LA PARTIDA A MEDIAS (js/guardado.js)
   *
   * Lo que se guarda es la repetición cortada por donde iba, así que estas
   * pruebas atacan lo que puede salir mal de verdad: que al rehacerla no
   * salga la misma partida, que se cobre dos veces lo mismo, o que jugar a
   * otra cosa (CACERÍA, ONLINE) se lleve por delante lo guardado.
   * =============================================================== */

  /* Alrededor de cada prueba: el almacén se deja como estaba y la
   * recuperación ocurre de un tirón (en el juego va por trozos para no
   * congelar la pantalla, y aquí no hay reloj que los encadene). */
  function conGuardado(fn) {
    var Gd = window.PM.Guardado;
    var previo = null, previoRep = null;
    var luego = Gd.luego;
    try { previo = localStorage.getItem(CFG.SAVE_KEY); } catch (e) { /* sin almacén */ }
    try { previoRep = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* nada */ }
    Gd.luego = function (f) { f(); };
    Gd.deNube = null;
    /* Se llega aquí con lo que dejara la prueba de antes, y una repetición a
     * medio ver haría que la partida siguiente NO se grabara (Replay.alEmpezar
     * no graba mientras se está viendo una). */
    if (window.PM.Game.inGame()) window.PM.Game.toMenu();
    window.PM.Replay.salir(true);
    try { localStorage.removeItem(CFG.SAVE_KEY); } catch (e) { /* nada */ }
    try {
      fn(Gd);
    } finally {
      Gd.luego = luego;
      Gd.deNube = null;
      window.PM.Replay.salir();
      if (window.PM.Game.inGame()) window.PM.Game.toMenu();
      try {
        if (previo === null) localStorage.removeItem(CFG.SAVE_KEY);
        else localStorage.setItem(CFG.SAVE_KEY, previo);
        if (previoRep === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previoRep);
      } catch (e) { /* sin almacén */ }
    }
  }

  /* Guion de giros para tener una partida que guardar: Pac-Man come, dobla
   * esquinas y se cruza con los fantasmas. Los giros van por tick simulado,
   * igual que en las pruebas de repeticiones. */
  var GUION_MEDIAS = [[5, 1], [40, 0], [95, 3], [150, 2], [210, 1], [260, 0],
                      [330, 3], [400, 2], [470, 1], [540, 0], [610, 3],
                      [700, 2], [800, 1], [900, 0]];

  function juegaGuion(total) {
    G.state = 'PLAYING';
    G.readyTicks = 0;
    var k = 0;
    for (var i = 0; i < total; i++) {
      while (k < GUION_MEDIAS.length && GUION_MEDIAS[k][0] === i) {
        G.setPacDir(0, GUION_MEDIAS[k][1]);
        k++;
      }
      G.step();
    }
  }

  /* Como si se hubiera cerrado la pestaña de golpe: la partida desaparece
   * sin pasar por ningún cierre, que es justo lo que hay que sobrevivir. */
  function cierraDeGolpe() {
    G.state = 'MENU';
    window.PM.Replay.modo = null;
    window.PM.Replay.grabando = null;
    window.PM.Replay.t = 0;
    G.replaying = false;
  }

  /* La prueba gorda: la partida recuperada tiene que ser LA MISMA, no una
   * parecida. Se comparan los puntos, lo que queda por comer, dónde está
   * cada uno y el reloj. */
  test('una partida a medias se recupera exactamente donde iba', function () {
    conGuardado(function (Gd) {
      window.PM.settings.muted = true;
      G.newGame({ players: 1 });
      juegaGuion(1000);
      ok(G.score > 0, 'la partida hizo puntos');
      ok(G.state !== 'GAME_OVER', 'y llegó viva a guardarse');

      var sobre = Gd.guardar(false);
      ok(sobre, 'la partida se guarda');
      eq(sobre.p, G.score, 'el sobre lleva la puntuación de ahora');
      var antes = {
        p: G.score, dl: G.dotsLeft, lv: G.level, vidas: G.lives,
        tm: G.timeTicks, gm: G.globalMode, ft: G.frightTicks,
        px: G.pacs[0].x, py: G.pacs[0].y, pd: G.pacs[0].dir,
        g0: G.ghosts[0].x + ',' + G.ghosts[0].y + ',' + G.ghosts[0].mode,
        g3: G.ghosts[3].x + ',' + G.ghosts[3].y + ',' + G.ghosts[3].mode
      };
      cierraDeGolpe();

      var err = 'sin respuesta';
      Gd.retomar(null, function (e) { err = e; });
      eq(err, null, 'la partida se recupera');
      eq(G.score, antes.p, 'LA PUNTUACIÓN NO CUADRA: el determinismo está roto');
      eq(G.dotsLeft, antes.dl, 'las pastillas que quedan no cuadran');
      eq(G.level, antes.lv, 'el nivel no cuadra');
      eq(G.lives, antes.vidas, 'las vidas no cuadran');
      eq(G.timeTicks, antes.tm, 'el cronómetro no cuadra');
      eq(G.globalMode, antes.gm, 'la fase de los fantasmas no cuadra');
      eq(G.frightTicks, antes.ft, 'lo que quedaba de superpastilla no cuadra');
      eq(G.pacs[0].x + ',' + G.pacs[0].y, antes.px + ',' + antes.py,
         'Pac-Man no está donde estaba');
      eq(G.pacs[0].dir, antes.pd, 'Pac-Man no mira a donde miraba');
      eq(G.ghosts[0].x + ',' + G.ghosts[0].y + ',' + G.ghosts[0].mode, antes.g0,
         'BLINKY no está donde estaba');
      eq(G.ghosts[3].x + ',' + G.ghosts[3].y + ',' + G.ghosts[3].mode, antes.g3,
         'CLYDE no está donde estaba');
    });
  });

  test('la partida recuperada vuelve a ser una partida de verdad', function () {
    conGuardado(function (Gd) {
      window.PM.settings.muted = true;
      G.newGame({ players: 1 });
      juegaGuion(900);
      ok(Gd.guardar(false), 'se guarda');
      cierraDeGolpe();
      var err = 'sin respuesta';
      Gd.retomar(null, function (e) { err = e; });
      eq(err, null, 'se recupera');
      /* deja de ser una repetición: vuelve a grabarse y vuelve a contar */
      eq(window.PM.Replay.modo, 'grabar', 'la partida se sigue grabando');
      eq(G.replaying, false, 'ya no es una repetición');
      eq(G.xpSent, false, 'y lo que haga contará al acabar');
      ok(G.paused, 'se entra en pausa, no en marcha');
      ok(window.PM.Replay.enCurso().entradas.length > 0,
         'la grabación conserva los giros de antes');
    });
  });

  /* Lo que de verdad no puede pasar: que una partida se cobre dos veces por
   * haberla dejado a medias y retomado. */
  test('guardar y salir no cobra, y acabarla después cobra una sola vez', function () {
    conGuardado(function (Gd) {
      window.PM.settings.muted = true;
      var L = window.PM.Level;
      G.newGame({ players: 1 });
      juegaGuion(900);
      var puntos = G.score;
      var xpAntes = L.xp();
      ok(Gd.guardarYSalir(), 'guardar y salir funciona');
      eq(G.state, 'MENU', 'se sale al menú');
      eq(L.xp(), xpAntes, 'salir guardando NO da experiencia');
      ok(Gd.hay(), 'y la partida se queda guardada');

      var err = 'sin respuesta';
      Gd.retomar(null, function (e) { err = e; });
      eq(err, null, 'se recupera');
      eq(G.score, puntos, 'con los mismos puntos');
      G.toMenu();                       // ahora sí: se acaba de verdad
      eq(L.xp(), xpAntes + puntos, 'al acabarla se cobra ENTERA y una sola vez');
      eq(Gd.hay(), false, 'y lo guardado se tira: ya no hay nada que seguir');
    });
  });

  test('una partida que al rehacerla no sale igual no se retoma', function () {
    conGuardado(function (Gd) {
      window.PM.settings.muted = true;
      G.newGame({ players: 1 });
      juegaGuion(800);
      var sobre = Gd.guardar(false);
      ok(sobre, 'se guarda');
      /* un sobre que dice otra puntuación es lo mismo que le pasaría a una
       * partida guardada con otra versión del juego: al rehacerla no sale */
      sobre.p = sobre.p + 10;
      localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(sobre));
      cierraDeGolpe();
      var err = 'sin respuesta';
      Gd.retomar(null, function (e) { err = e; });
      eq(err, 'NO CUADRA', 'se planta en vez de seguir una partida que no es');
      eq(G.inGame(), false, 'y no deja una partida a medio montar');
      ok(Gd.hay(), 'lo guardado NO se tira solo: lo decide quien juega');
    });
  });

  test('un guardado ilegible se rechaza sin romper nada', function () {
    conGuardado(function (Gd) {
      localStorage.setItem(CFG.SAVE_KEY,
        '{"v":1,"rep":"esto no es una partida","t":50,"p":100,"modo":"solo"}');
      var err = 'sin respuesta';
      Gd.retomar(null, function (e) { err = e; });
      eq(err, 'ROTA', 'se avisa de que no se puede leer');
    });
  });

  test('CACERÍA no se puede guardar a medias', function () {
    conGuardado(function (Gd) {
      window.PM.settings.muted = true;
      G.newGame({ players: 1, caza: true });
      G.state = 'PLAYING';
      ticks(60);
      eq(Gd.puedeGuardar(), false, 'CACERÍA no se graba, así que no se guarda');
      eq(Gd.guardar(false), null, 'y no deja sobre');
      G.toMenu();
    });
  });

  /* Jugar a otra cosa no puede costarle a nadie la partida que dejó a medias:
   * CACERÍA y ONLINE no guardan, así que tampoco borran. */
  test('una partida de CACERÍA no se lleva por delante la guardada', function () {
    conGuardado(function (Gd) {
      window.PM.settings.muted = true;
      G.newGame({ players: 1 });
      juegaGuion(700);
      ok(Gd.guardarYSalir(), 'se guarda la de CLÁSICO');
      var titulo = Gd.titulo();
      G.newGame({ players: 1, caza: true });
      G.state = 'PLAYING';
      ticks(120);
      G.toMenu();
      ok(Gd.hay(), 'la partida guardada sigue ahí');
      eq(Gd.titulo(), titulo, 'y es la misma');
    });
  });

  test('empezar otra partida y acabarla sí tira la guardada', function () {
    conGuardado(function (Gd) {
      window.PM.settings.muted = true;
      G.newGame({ players: 1 });
      juegaGuion(700);
      ok(Gd.guardarYSalir(), 'se guarda');
      G.newGame({ players: 1 });
      juegaGuion(200);
      G.toMenu();
      eq(Gd.hay(), false, 'la de antes ya no está');
    });
  });

  /* El laberinto alternativo no cabe en el formato de la repetición, así que
   * el sobre se lo apunta aparte. Sin esto, una partida de LABERINTOS se
   * retomaría en el laberinto de 1980 y no cuadraría nada. */
  test('la partida a medias de LABERINTOS se recupera en SU laberinto', function () {
    conGuardado(function (Gd) {
      window.PM.settings.muted = true;
      G.newGame({ players: 1, maze: 'anillos' });
      juegaGuion(900);
      if (G.state === 'GAME_OVER') return;    // ahí no hay nada que guardar
      var sobre = Gd.guardar(false);
      ok(sobre, 'se guarda');
      eq(sobre.maze, 'anillos', 'el sobre se apunta el laberinto');
      var pts = G.score, quedan = G.dotsLeft;
      cierraDeGolpe();
      var err = 'sin respuesta';
      Gd.retomar(null, function (e) { err = e; });
      eq(err, null, 'se recupera');
      eq(G.mazeId, 'anillos', 'y en el laberinto en el que se jugaba');
      eq(G.score, pts, 'con los mismos puntos');
      eq(G.dotsLeft, quedan, 'y lo mismo por comer');
    });
  });

  test('de la nube solo se hace caso a la partida más nueva', function () {
    conGuardado(function (Gd) {
      window.PM.settings.muted = true;
      G.newGame({ players: 1 });
      juegaGuion(700);
      var mio = Gd.guardar(false);
      ok(mio, 'hay una partida guardada aquí');
      var vieja = JSON.parse(JSON.stringify(mio));
      vieja.p = 12345;
      vieja.fecha = mio.fecha - 60000;
      Gd.desdeNube(JSON.stringify(vieja));
      eq(Gd.sobre().p, mio.p, 'una de la nube más vieja no pisa la de aquí');
      var nueva = JSON.parse(JSON.stringify(mio));
      nueva.p = 54321;
      nueva.fecha = mio.fecha + 60000;
      Gd.desdeNube(JSON.stringify(nueva));
      eq(Gd.sobre().p, 54321, 'una más nueva sí manda');
      Gd.desdeNube('esto no es un sobre');
      eq(Gd.sobre().p, mio.p, 'y una ilegible se ignora');
    });
  });


  /* ===============================================================
   * VER UNA REPETICIÓN COMO UN VÍDEO (js/replay.js + Game.foto)
   *
   * Dos cosas que pueden salir mal y no se verían como un error, sino como
   * una repetición que se tuerce: que la FOTO de la partida se deje un campo
   * (y al rebobinar salga otra partida) y que el aspecto de quien jugó no
   * llegue (y se vea con la skin de quien mira).
   * =============================================================== */

  /* Alrededor: la preparación va por trozos encadenados con un reloj que
   * aquí no corre, así que se hace de un tirón. */
  function conVideo(fn) {
    var R = window.PM.Replay;
    var luego = R.luego;
    var previoRep = null;
    try { previoRep = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* nada */ }
    R.luego = function (f) { f(); };
    if (G.inGame()) G.toMenu();
    R.salir(true);
    try {
      fn(R);
    } finally {
      R.luego = luego;
      R.salir();
      if (G.inGame()) G.toMenu();
      try {
        if (previoRep === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previoRep);
      } catch (e) { /* sin almacén */ }
    }
  }

  /* Juega una partida corta y devuelve su repetición ya cerrada */
  function repetiCorta(opts, ticks) {
    var R = window.PM.Replay;
    window.PM.settings.muted = true;
    G.newGame(opts || { players: 1 });
    var rep = R.enCurso();
    G.state = 'PLAYING';
    G.readyTicks = 0;
    var guion = [[5, 1], [40, 0], [95, 3], [150, 2], [210, 1], [260, 0],
                 [330, 3], [400, 2], [470, 1], [540, 0]];
    var k = 0;
    for (var i = 0; i < (ticks || 900); i++) {
      while (k < guion.length && guion[k][0] === i) {
        G.setPacDir(0, guion[k][1]);
        k++;
      }
      G.step();
    }
    rep.final = { puntos: G.score, nivel: G.level, fantasmas: G.runGhosts,
                  tiempoMs: Math.round(G.timeTicks * 1000 / 60) };
    return rep;
  }

  /* LA prueba de la foto: si se deja un campo, rebobinar da otra partida.
   * Se compara la foto ENTERA, no un puñado de valores elegidos a mano. */
  test('la foto de la partida guarda todo lo que hace falta para rebobinar', function () {
    window.PM.settings.muted = true;
    G.newGame({ players: 1, hab: true });
    G.state = 'PLAYING';
    G.readyTicks = 0;
    ticks(700);
    var enMedio = G.foto();
    ticks(900);
    var alFinal = JSON.stringify(G.foto());
    G.ponerFoto(enMedio);
    eq(JSON.stringify(G.foto()), JSON.stringify(enMedio),
       'la foto restaurada no es la que se guardó');
    ticks(900);
    eq(JSON.stringify(G.foto()), alFinal,
       'rejugar desde la foto da otra partida: a la foto le falta algo');
    G.toMenu();
  });

  test('preparar una repetición deja sus fotos y su duración', function () {
    conVideo(function (R) {
      var rep = repetiCorta({ players: 1 }, 900);
      var leida = R.leer(R.serializar(rep));
      ok(leida, 'la repetición pasa por el texto y vuelve');
      ok(R.ver(leida), 'la repetición arranca');
      ok(R.fotos.length > 0, 'quedan fotos para rebobinar');
      ok(R.tTotal > 0, 'y se sabe cuánto dura');
      eq(R.t, 0, 'y se empieza desde el principio');
    });
  });

  test('saltar a un momento y volver deja la partida igual', function () {
    conVideo(function (R) {
      var rep = repetiCorta({ players: 1 }, 900);
      ok(R.ver(R.leer(R.serializar(rep))), 'arranca');
      function donde() {
        return G.score + '/' + G.dotsLeft + '/' + G.pacs[0].x + ',' + G.pacs[0].y +
               '/' + G.ghosts[0].x + ',' + G.ghosts[0].y + '/' + G.rndState;
      }
      var medio = Math.floor(R.tTotal / 2);
      R.irA(medio);
      var enMedio = donde();
      ok(R.t >= medio - 1, 'llega a donde se le pide');
      R.irA(R.tTotal);
      R.irA(0);
      eq(G.score, 0, 'volver al principio devuelve el marcador a cero');
      R.irA(medio);
      eq(donde(), enMedio, 'y volver al mismo punto da EXACTAMENTE lo mismo');
    });
  });

  test('una repetición se ve con el aspecto de quien la jugó', function () {
    conVideo(function (R) {
      var s = window.PM.settings;
      var antes = { skin: s.skin1, color: s.pacColor, acc: s.acc1, efx: s.efx1 };
      var tiene = window.PM.Tienda.tiene;
      try {
        window.PM.Tienda.tiene = function () { return true; };
        s.skin1 = 'cometa';
        s.pacColor = '#ff00aa';
        s.acc1 = CFG.ACCESORIO_IDS[0];
        s.efx1 = CFG.EFECTO_IDS[0];
        var rep = repetiCorta({ players: 1 }, 700);
        eq(rep.aspectos[0].s, 'cometa', 'la repetición se apunta la skin');
        eq(rep.aspectos[0].c, '#ff00aa', 'y el color');
        eq(rep.aspectos[0].a, CFG.ACCESORIO_IDS[0], 'y el accesorio');
        eq(rep.aspectos[0].x, CFG.EFECTO_IDS[0], 'y el efecto');

        var leida = R.leer(R.serializar(rep));
        ok(leida, 'el aspecto pasa por el texto');
        eq(leida.aspectos[0].c, '#ff00aa', 'y vuelve con su color');

        /* quien la mira va vestido de otra manera */
        s.skin1 = 'clasico';
        s.pacColor = '#ffff00';
        s.acc1 = '';
        s.efx1 = '';
        ok(R.ver(leida), 'arranca');
        eq(G.skinFor(0), 'cometa', 'se ve con la skin de quien la jugó');
        eq(G.colorFor(0), '#ff00aa', 'y con su color');
        eq(G.lookFor(0).a, CFG.ACCESORIO_IDS[0], 'y con su accesorio');
        eq(G.lookFor(0).x, CFG.EFECTO_IDS[0], 'y con su efecto');
        R.salir();
        eq(G.skinFor(0), 'clasico', 'y al salir se recupera el aspecto propio');
      } finally {
        window.PM.Tienda.tiene = tiene;
        s.skin1 = antes.skin;
        s.pacColor = antes.color;
        s.acc1 = antes.acc;
        s.efx1 = antes.efx;
      }
    });
  });

  test('una repetición de antes del aspecto se sigue viendo', function () {
    conVideo(function (R) {
      var rep = repetiCorta({ players: 1 }, 600);
      var texto = R.serializar(rep);
      eq(texto.split('~').length, 11, 'las nuevas llevan once campos');
      /* el texto de siempre, sin el campo del aspecto */
      var vieja = texto.split('~').slice(0, 10).join('~');
      var leida = R.leer(vieja);
      ok(leida, 'una de diez campos se sigue leyendo');
      ok(!leida.aspectos, 'y simplemente no trae aspecto');
      ok(R.ver(leida), 'y se ve igual');
    });
  });

  test('las teclas de vídeo solo mandan mientras se ve una repetición', function () {
    conVideo(function (R) {
      eq(R.teclaVideo({ key: 'ArrowLeft' }), false,
         'fuera de una repetición las flechas son del juego');
      var rep = repetiCorta({ players: 1 }, 700);
      ok(R.ver(R.leer(R.serializar(rep))), 'arranca');
      R.irA(R.tTotal);
      var alFinal = R.t;
      eq(R.teclaVideo({ key: 'ArrowLeft' }), true, 'la flecha es suya');
      ok(R.t < alFinal, 'y rebobina');
      eq(R.teclaVideo({ key: 'z' }), false, 'lo que no es suyo, no lo toca');
    });
  });


  /* Las repeticiones de LABERINTOS se veían en el laberinto de 1980 —el
   * formato no guardaba en cuál se había jugado— y no cuadraba nada: Pac-Man
   * atravesando muros y una puntuación que no era la de nadie. */
  test('una repetición de LABERINTOS se reproduce en SU laberinto', function () {
    conVideo(function (R) {
      var rep = repetiCorta({ players: 1, maze: 'anillos' }, 1100);
      eq(rep.ajustes.maze, 'anillos', 'la repetición se apunta el laberinto');
      var tGrab = R.t;
      var esperado = G.score + '/' + G.dotsLeft + '/' +
        G.pacs[0].x + ',' + G.pacs[0].y + '/' + G.ghosts[0].x + ',' + G.ghosts[0].y;
      ok(G.score > 0, 'la partida hizo puntos');

      var leida = R.leer(R.serializar(rep));
      ok(leida, 'el laberinto pasa por el texto');
      eq(leida.ajustes.maze, 'anillos', 'y vuelve');
      ok(R.ver(leida), 'la repetición arranca');
      eq(G.mazeId, 'anillos', 'y se monta en el laberinto en el que se jugó');
      R.irA(tGrab);
      eq(G.score + '/' + G.dotsLeft + '/' + G.pacs[0].x + ',' + G.pacs[0].y +
         '/' + G.ghosts[0].x + ',' + G.ghosts[0].y, esperado,
         'LA PARTIDA NO SALE IGUAL: el laberinto no llegó');
    });
  });

  test('una repetición de un laberinto que no existe se da por rota', function () {
    var R = window.PM.Replay;
    var rep = {
      v: 1, modo: 'solo', semilla: null, nivel: 1, jugadores: 1,
      ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 3,
                 maze: 'estelaberintonoexiste' },
      nombres: ['UNO'], fecha: new Date().toISOString(), entradas: [[10, 0, 1]],
      final: { puntos: 100, nivel: 1, fantasmas: 0, tiempoMs: 1000 }
    };
    eq(R.valida(rep), false, 'un laberinto desconocido no vale');
    /* y el mismo texto con un laberinto de los buenos, sí */
    rep.ajustes.maze = 'anillos';
    ok(R.valida(rep), 'uno de los que hay, sí');
    ok(R.leer(R.serializar(rep)), 'y pasa por el texto');
  });

  test('una repetición del laberinto de siempre no engorda por esto', function () {
    var R = window.PM.Replay;
    var rep = {
      v: 1, modo: 'solo', semilla: null, nivel: 1, jugadores: 1,
      ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 3 },
      nombres: ['UNO'], fecha: new Date().toISOString(), entradas: [[10, 0, 1]],
      final: { puntos: 100, nivel: 1, fantasmas: 0, tiempoMs: 1000 }
    };
    var ajustes = R.serializar(rep).split('~')[5];
    eq(ajustes.indexOf('m'), -1, 'sin laberinto no hay bandera de laberinto');
    var vuelta = R.leer(R.serializar(rep));
    ok(vuelta && !vuelta.ajustes.maze, 'y al leerla no se inventa ninguno');
  });


  /* Una partida PREPARADA: la que no viene del principio de nada, sino de un
   * punto de partida montado a mano (js/guardado.js, `arranque`). Se retoma
   * como cualquier otra y, a partir de ahí, se juega y se cobra igual. */
  test('una partida preparada se retoma en el punto que dice su arranque', function () {
    conGuardado(function (Gd) {
      window.PM.settings.muted = true;
      var R = window.PM.Replay;
      /* el laberinto tal y como queda al comerse una de cada dos pastillas */
      G.newGame({ players: 1, hab: true,
                  cfg: { ghostSpeedMult: 1, pacSpeedMult: 1, frightMult: 1,
                         startLives: 1, startLevel: 2, livesMode: 'shared' } });
      var n = 0, quitadas = 0;
      for (var r = 0; r < CFG.ROWS; r++) {
        for (var c = 0; c < CFG.COLS; c++) {
          if (G.pellets[r][c] !== '.') continue;
          n++;
          if (n % 2 === 0) { G.pellets[r][c] = null; quitadas++; }
        }
      }
      var hex = G.pelletHex();
      var quedan = 244 - quitadas;
      G.toMenu();

      var rep = {
        v: 1, modo: 'hab', semilla: null, nivel: 2, jugadores: 1,
        ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 1, qArmada: true },
        nombres: ['UNO'], fecha: new Date().toISOString(), entradas: [],
        final: { puntos: 140870, nivel: 2, fantasmas: 0, tiempoMs: 0 }
      };
      var sobre = {
        v: CFG.SAVE_V, rep: R.serializar(rep), t: 0, maze: null,
        p: 140870, dl: quedan, st: 'PLAYING', lv: 2, j: 1, modo: 'hab',
        arranque: { puntos: 140870, pellets: hex, comidos: quitadas },
        fecha: Date.now(), quien: ''
      };
      ok(sobre.rep, 'la repetición de una preparada vale igual');
      localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(sobre));

      var err = 'sin respuesta';
      Gd.retomar(null, function (e) { err = e; });
      eq(err, null, 'se retoma');
      eq(G.score, 140870, 'con el marcador del arranque');
      eq(G.level, 2, 'en su nivel');
      eq(G.lives, 1, 'con las vidas que decía');
      eq(G.dotsLeft, quedan, 'y el laberinto a medio comer');
      ok(G.hab, 'y en DESATADO');
      ok(G.paused, 'en pausa, como cualquier partida retomada');
      ok(Gd.titulo().indexOf('PREPARADA') !== -1,
         'y se dice que es una partida preparada');
    });
  });

  /* Lo que de verdad importa: que se pueda volver a dejar a medias. El
   * arranque tiene que viajar con ella o el marcador empezaría de cero. */
  test('una partida preparada se puede volver a guardar y retomar', function () {
    conGuardado(function (Gd) {
      window.PM.settings.muted = true;
      var R = window.PM.Replay;
      var rep = {
        v: 1, modo: 'hab', semilla: null, nivel: 2, jugadores: 1,
        ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 1, qArmada: true },
        nombres: ['UNO'], fecha: new Date().toISOString(), entradas: [],
        final: { puntos: 50000, nivel: 2, fantasmas: 0, tiempoMs: 0 }
      };
      localStorage.setItem(CFG.SAVE_KEY, JSON.stringify({
        v: CFG.SAVE_V, rep: R.serializar(rep), t: 0, maze: null,
        p: 50000, dl: 244, st: 'PLAYING', lv: 2, j: 1, modo: 'hab',
        arranque: { puntos: 50000, comidos: 0 },
        fecha: Date.now(), quien: ''
      }));
      var err = 'sin respuesta';
      Gd.retomar(null, function (e) { err = e; });
      eq(err, null, 'se retoma');
      /* se juega un rato más y se vuelve a dejar */
      G.setPaused(false);
      G.state = 'PLAYING';
      G.readyTicks = 0;
      ticks(500);
      var puntos = G.score;
      ok(puntos >= 50000, 'el marcador sigue donde estaba');
      ok(Gd.guardarYSalir(), 'se guarda otra vez');
      var dos = Gd.sobre();
      ok(dos.arranque, 'el arranque viaja con ella');
      eq(dos.arranque.puntos, 50000, 'con su punto de partida');

      err = 'sin respuesta';
      Gd.retomar(null, function (e) { err = e; });
      eq(err, null, 'y se vuelve a retomar sin perderse');
      eq(G.score, puntos, 'con todo lo jugado desde el arranque');
    });
  });


  /* ===============================================================
   * LAS CIFRAS DEL PERFIL (js/stats.js)
   *
   * Aquí se compara gente, así que lo que no puede pasar es que una cifra
   * mienta: ni por inventada, ni por perder lo que ya estaba contado, ni por
   * contar dos veces lo mismo.
   * =============================================================== */

  test('las cifras derivadas salen de los contadores, sin inventar nada', function () {
    var S = window.PM.Stats;
    var d = S.de({
      partidas: 100, fantasmas: 800, muertes: 200, tiempo: 36000,
      puntosMax: 50000, racha: 4, racha2: 90, racha3: 40, racha4: 12,
      nivelMax: 7, limpios: 3, dailyOk: 15, 'clasico:partidas': 100
    }, 500000);
    eq(d.media, 5000, 'la media por partida');
    eq(d.porPartida, 8, 'fantasmas por partida');
    eq(d.porMuerte, 4, 'fantasmas por vida perdida');
    eq(d.porMinuto, 833, 'puntos por minuto');
    eq(d.doblesExactos, 50, 'los dobles exactos son los dobles menos los triples');
    eq(d.triplesExactos, 28, 'y los triples, menos los cuádruples');
    eq(d.mundosJugados, 1, 'solo ha jugado a un modo');
    /* sin partidas no se divide por cero ni sale NaN por ninguna parte */
    var cero = S.de({}, 0);
    eq(cero.media, 0, 'sin partidas, media cero');
    eq(cero.porPartida, 0, 'y nada por partida');
    eq(cero.porMuerte, 0, 'ni por muerte');
  });

  test('el polígono da seis ejes entre 0 y 1', function () {
    var S = window.PM.Stats;
    var ejes = S.radar(S.de({
      partidas: 10, fantasmas: 1000, puntosMax: 999999, limpios: 99,
      nivelMax: 99, dailyOk: 999,
      'clasico:partidas': 1, 'hab:partidas': 1, 'lab:partidas': 1,
      'caza:partidas': 1, 'vs:partidas': 1
    }, 100));
    eq(ejes.length, 6, 'seis ejes');
    for (var i = 0; i < ejes.length; i++) {
      ok(ejes[i].valor >= 0 && ejes[i].valor <= 1,
         'el eje ' + ejes[i].name + ' se queda dentro: ' + ejes[i].valor);
      ok(ejes[i].texto && ejes[i].texto.length > 0,
         'y dice su dato de verdad, no solo el dibujo');
    }
    /* todo pasado de vueltas = polígono al borde */
    eq(ejes[1].valor, 1, 'lo que pasa del tope se queda en el tope');
    var vacio = S.radar(S.de({}, 0));
    eq(vacio[0].valor, 0, 'y quien no ha jugado tiene el polígono a cero');
  });

  test('el tiempo jugado se lee en horas y minutos', function () {
    var S = window.PM.Stats;
    eq(S.reloj(45), '45 S');
    eq(S.reloj(600), '10 MIN');
    eq(S.reloj(3600), '1 H');
    eq(S.reloj(194000), '53 H 53 MIN');
    eq(S.cronos(0), '—', 'sin marca no se inventa un tiempo');
    eq(S.cronos(5837), '0:58.37', 'y el del nivel 1 va en centésimas');
  });

  /* Lo que se baja de la nube de otro jugador tiene la misma forma que lo de
   * aquí, que es lo que permite ponerlos lado a lado. */
  test('el perfil de otro se mastica igual que el propio', function () {
    var S = window.PM.Stats;
    var d = S.deFila({
      xp: 1000000, record1: 40000, record2: 10000, record3: 0, record4: 0,
      record_hab: 90000, record_lab: 3000,
      logros: { partidas: 200, fantasmas: 1500, muertes: 400, nivelMax: 12 }
    });
    ok(d, 'sale ficha');
    eq(d.puntos, 1000000, 'con su experiencia');
    eq(d.partidas, 200, 'y sus partidas');
    eq(d.porPartida, 7.5, 'y sus cifras derivadas');
    eq(S.porFormato(d)[0].valor, '40.000', 'y el récord de cada formato');
    eq(S.deFila(null), null, 'y sin fila, nada');
  });

  /* La regla de la casa: un contador nuevo no empieza a cero a quien lleva
   * setecientas partidas. Todo lo que se siembra es una cota POR LO BAJO. */
  test('las cifras nuevas se siembran con lo que ya estaba contado', function () {
    var A = window.PM.Achievements;
    var raw = null;
    try { raw = localStorage.getItem(CFG.ACH_KEY); } catch (e) { raw = null; }
    try {
      A.reset();
      var d = JSON.parse(localStorage.getItem(CFG.ACH_KEY));
      d.c.nivelMax = 10;         // llegó al nivel 10...
      d.c.racha = 4;             // ...y alguna vez encadenó los cuatro
      d.c.partidas = 731;
      d.e = 0;
      localStorage.setItem(CFG.ACH_KEY, JSON.stringify(d));
      A.sembrarCifras();
      var c = A.stats();
      eq(c.niveles, 9, 'para asomarse al nivel 10 hay que haber despejado 9');
      eq(c.pastillas, 9 * 244, 'y comido las pastillas de esos nueve');
      eq(c['super'], 36, 'con sus cuatro superpastillas cada uno');
      eq(c.racha2, 1, 'el cuádruple cuenta como doble');
      eq(c.racha3, 1, 'y como triple');
      eq(c.racha4, 1, 'y como cuádruple');
      ok(c.tiempo > 0, 'y el tiempo se estima de los puntos');
      ok(A.tiempoEstimado() > 0, 'y se sabe cuánto de él es estimación');
      /* y no se siembra dos veces ni pisa lo que ya se haya jugado */
      A.record('niveles', 1);
      A.sembrarCifras();
      eq(A.stats().niveles, 10, 'la siembra es de una sola vez');
    } finally {
      if (raw === null) A.reset();
      else { try { localStorage.setItem(CFG.ACH_KEY, raw); } catch (e) { /* nada */ } }
      A.syncSeen();
    }
  });

  /* CUATRO ES EL TOPE, y no por una regla escrita: es que no hay más
   * fantasmas que comer. Si algún día uno vuelve a ponerse azul dentro del
   * mismo susto, esta prueba se entera. */
  test('la cadena de fantasmas no pasa de cuatro', function () {
    window.PM.settings.muted = true;
    partida(1);
    G.triggerFright(30);
    var p = G.pacs[0], i;
    for (i = 0; i < 4; i++) {
      G.ghosts[i].mode = 'normal';
      G.ghosts[i].frightened = true;
      G.ghosts[i].x = p.x;
      G.ghosts[i].y = p.y;
    }
    for (var t = 0; t < 400 && G.state === 'PLAYING'; t++) {
      for (i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (g.frightened && g.mode === 'normal') { g.x = G.pacs[0].x; g.y = G.pacs[0].y; }
      }
      G.step();
    }
    eq(G.chainIndex, 4, 'se comen los cuatro');
    ok(G.frightTicks > 0, 'y aún queda susto de sobra');
    var azules = 0;
    for (i = 0; i < 4; i++) if (G.ghosts[i].frightened) azules++;
    eq(azules, 0, 'pero ya no queda ninguno azul: de ahí no se pasa');
    G.toMenu();
  });


  /* Los contadores por modo son más nuevos que el juego: al crearlos, lo ya
   * jugado se apuntó TODO a CLÁSICO. La tabla por modo no puede fiarse de eso
   * o le dice a quien solo juega a DESATADO que no lo ha jugado nunca, y le
   * pone a CLÁSICO como mejor marca una partida de DESATADO. */
  test('la tabla por modo no se cree el reparto viejo de los contadores', function () {
    var S = window.PM.Stats;
    /* una cuenta de las de antes: todo apuntado a clásico, y de DESATADO solo
     * queda el rastro de sus récords y sus mordiscos */
    var d = S.de({
      partidas: 737, puntosMax: 180550, nivelMax: 10, racha: 4,
      mordiscos: 1091, muros: 272,
      'clasico:partidas': 734, 'clasico:puntosMax': 180550,
      'hab:puntosMax': 180550, 'hab:mordiscos': 1091,
      'lab:partidas': 4, 'lab:puntosMax': 12360
    }, 6685710, { formatos: [49050, 76290, 22600, 0], hab: 180550, lab: 12360 });

    var porId = {};
    for (var i = 0; i < d.mundos.length; i++) porId[d.mundos[i].id] = d.mundos[i];

    eq(porId.clasico.mejor, 76290,
       'el mejor del CLÁSICO es su récord del laberinto de siempre, no una partida de DESATADO');
    eq(porId.hab.mejor, 180550, 'y el de DESATADO, el suyo');
    eq(porId.lab.mejor, 12360, 'y el de LABERINTOS, el suyo');
    eq(porId.hab.partidas, -1,
       'las partidas de DESATADO no se saben: se enseñan como un guion, no como cero');
    ok(porId.clasico.aprox,
       'y las de CLÁSICO quedan marcadas como aproximadas, porque llevan las otras dentro');
    eq(S.porMundo(d)[0].partidas.charAt(0), '~', 'la virgulilla se ve en la tabla');
    eq(S.porMundo(d)[1].partidas, '—', 'y el guion también');
    eq(d.mundosJugados, 3,
       'y para VARIEDAD cuenta que ha jugado a DESATADO aunque su contador esté a cero');
  });


  /* De qué modo eran las partidas viejas no lo sabe ningún archivo: lo sabe
   * quien jugó. Si lo dice, se reparte con su palabra — y solo aquellas, que
   * las de después ya se cuentan bien solas. */
  test('el reparto declarado solo toca las partidas viejas', function () {
    var S = window.PM.Stats;
    function tabla(extra) {
      var c = {
        partidas: 737, nivelMax: 10, racha: 4, mordiscos: 1000,
        'clasico:partidas': 734, 'hab:puntosMax': 180550,
        'clasico:tiempo': 200000,
        repHab: 70, repBase: 734
      };
      for (var k in extra) { if (extra.hasOwnProperty(k)) c[k] = extra[k]; }
      var d = S.de(c, 6685710, { formatos: [49050, 76290, 0, 0], hab: 180550 });
      var o = {};
      for (var i = 0; i < d.mundos.length; i++) o[d.mundos[i].id] = d.mundos[i];
      return { modos: o, reparto: d.reparto };
    }

    var t = tabla({});
    eq(t.reparto.pct, 70, 'se sabe qué parte se declaró');
    eq(t.reparto.partidas, 514, 'y cuántas partidas son');
    eq(t.modos.hab.partidas, 514, 'DESATADO se lleva el 70 %');
    eq(t.modos.clasico.partidas, 220, 'y CLÁSICO se queda con el resto');
    ok(t.modos.hab.aprox && t.modos.clasico.aprox,
       'los dos quedan marcados como aproximados: es un reparto, no una cuenta');
    eq(t.modos.hab.tiempo, 140000, 'el tiempo de lo viejo se reparte igual: 70 % a DESATADO');
    eq(t.modos.clasico.tiempo, 60000, 'y el resto se queda en CLÁSICO');
    ok(t.modos.hab.tAprox && t.modos.clasico.tAprox, 'y el tiempo también va con virgulilla');

    /* lo que se juegue DESPUÉS se cuenta en su sitio y no se reparte */
    var t2 = tabla({ 'clasico:partidas': 754, 'hab:partidas': 10 });
    eq(t2.modos.clasico.partidas, 240, 'las veinte nuevas de CLÁSICO son suyas');
    eq(t2.modos.hab.partidas, 524, 'y las diez nuevas de DESATADO, también');

    /* sin declarar nada, nada se mueve */
    var t3 = tabla({ repHab: 0, repBase: 0 });
    eq(t3.reparto, null, 'sin reparto declarado no hay reparto');
    eq(t3.modos.clasico.partidas, 734, 'y los contadores se enseñan tal cual');
    eq(t3.modos.clasico.tiempo, 200000, 'y el tiempo, también');
  });

  test('declarar el reparto se queda con las partidas de ese momento', function () {
    var A = window.PM.Achievements;
    var raw = null;
    try { raw = localStorage.getItem(CFG.ACH_KEY); } catch (e) { raw = null; }
    try {
      A.reset();
      var d = JSON.parse(localStorage.getItem(CFG.ACH_KEY));
      d.c['clasico:partidas'] = 300;
      d.c['hab:partidas'] = 20;
      localStorage.setItem(CFG.ACH_KEY, JSON.stringify(d));
      var r = A.declararReparto(70);
      eq(r.pct, 70, 'se guarda el porcentaje');
      eq(r.base, 320, 'y las partidas que había, para no repartir las de mañana');
      eq(A.stats().repHab, 70, 'y queda en los contadores, que viajan a la cuenta');
      eq(A.declararReparto(140).pct, 100, 'un porcentaje imposible se recorta');
    } finally {
      if (raw === null) A.reset();
      else { try { localStorage.setItem(CFG.ACH_KEY, raw); } catch (e) { /* nada */ } }
      A.syncSeen();
    }
  });


  // ---------------------------------------------------------------
  // DESATADO · LOS ROLES (Tanque, Soporte, Mago)
  // ---------------------------------------------------------------
  /* Partida de poderes con los roles dados (uno por jugador), el J1 donde se
   * diga y mirando hacia `dir`. Los fantasmas, a la casa, para que ninguno se
   * cuele en la prueba sin que se le llame. */
  function partidaRol(roles, col, fila, dir) {
    window.PM.settings.muted = true;
    G.newGame({ players: roles.length, hab: true, roles: roles });
    G.state = 'PLAYING';
    G.readyTicks = 0;
    for (var i = 0; i < G.pacs.length; i++) G.pacs[i].safeTicks = 999999;
    if (col !== undefined) ponPac(0, col, fila, dir);
    for (var g = 0; g < 4; g++) {
      G.ghosts[g].mode = 'house';
      G.ghosts[g].x = CFG.HOUSE.exitX;
      G.ghosts[g].y = CFG.HOUSE.centerY;
    }
    return G;
  }

  /* Sin pastillas en esa fila: así los puntos que se miden son solo los del poder */
  function filaVacia(fila) {
    for (var c = 0; c < CFG.COLS; c++) {
      if (G.pellets[fila][c]) { G.pellets[fila][c] = null; G.dotsLeft--; }
    }
  }

  function ponPac(i, col, fila, dir) {
    var p = G.pacs[i];
    p.x = col * CFG.TILE + CFG.TILE / 2;
    p.y = fila * CFG.TILE + CFG.TILE / 2;
    if (dir !== undefined) { p.dir = dir; p.nextDir = dir; }
    return p;
  }

  var DR = CFG.DIR;
  function kDe(id, rol) {
    var l = HC.ROLES[rol];
    for (var k = 0; k < l.length; k++) if (l[k].id === id) return k;
    return -1;
  }

  test('ROLES: cuatro kits, ids únicos y las recargas acordadas', function () {
    var vistos = {};
    ['LIST', 'LIST_T', 'LIST_S', 'LIST_M', 'LIST_G'].forEach(function (n) {
      HC[n].forEach(function (h) {
        ok(!vistos[h.id], 'el id ' + h.id + ' no se repite entre listas');
        vistos[h.id] = 1;
      });
    });
    eq(HC.segs(0, 'tanque'), 32, 'PROVOCAR recarga en 32 s');
    eq(HC.TAUNT_TICKS, 5 * 60, 'y dura 5 s');
    eq(HC.segs(3, 'tanque'), 46, 'ARROLLAR 46 s');
    eq(HC.segs(3, 'mago'), 46, 'TORMENTA 46 s');
    eq(HC.APISONADORA_MULT, 1.75, 'la apisonadora va a x1,75');
    eq(HC.segs(3, 'soporte'), 180, 'VIDA EXTRA 3 min');
    eq(HC.segs(0, 'mago'), 20, 'BOLA DE FUEGO 20 s');
    eq(HC.segs(0), 16, 'sin rol, las del Asesino');
    eq(HC.MAGO_PUNTOS, 200, 'lo del Mago vale 200 fijos');
  });

  test('ROLES: el rol decide qué hace cada tecla', function () {
    partidaRol(['tanque']);
    eq(HB.idDe(G, 0, 0), 'pisoton', 'la Q del Tanque pisotea');
    eq(HB.idDe(G, 0, 2), 'provocar', 'y la E provoca');
    partidaRol(['mago']);
    eq(HB.idDe(G, 0, 3), 'tormenta', 'la R del Mago es la tormenta');
    partidaRol(['cualquiera']);
    eq(G.roles[0], 'asesino', 'un rol que no existe es Asesino');
    window.PM.settings.muted = true;
    G.newGame({ players: 1, hab: true });
    eq(HB.idDe(G, 0, 0), 'mordisco', 'y sin elegir, el de siempre');
  });

  test('ROLES: un solo Soporte y, en PAC-MAN VS., todos Asesino', function () {
    partidaRol(['soporte', 'soporte']);
    eq(G.roles.join(), 'soporte,asesino', 'el segundo Soporte pasa a Asesino');
    window.PM.settings.muted = true;
    G.newGame({ players: 2, hab: true, roles: ['tanque', 'mago'], ghosts: [-1, 0] });
    eq(G.roles.join(), 'asesino,asesino', 'en VS. no hay roles');
  });

  /* ---------- TANQUE ---------- */
  /* ---------- LAS PASIVAS ---------- */
  /* La del ASESINO es lo que hace que un equipo lo NECESITE: mata igual que
   * los demás, pero cobra la mitad más por cada muerte. */
  test('ASESINO · PASIVA: sus muertes valen un 25% más, se mate como se mate', function () {
    eq(HC.BONO_ASESINO, 1.25, 'la cuarta parte más');

    /* la cadena del energizante: 300 · 600 · 1.200 · 2.400 */
    partidaRol(['asesino'], 6, 5, DR.RIGHT);
    var esperado = [250, 500, 1000, 2000];
    for (var i = 0; i < 4; i++) {
      eq(HB.puntosDe(G, 0, CFG.GHOST_CHAIN[i]), esperado[i],
        'el ' + (i + 1) + '.º fantasma de la cadena paga ' + esperado[i]);
    }
    eq(HB.puntosDe(G, 0, HC.MAGO_PUNTOS), 250, 'y una muerte por habilidad, 250');

    /* y se cobra de verdad al comer, no solo en la cuenta */
    var g = fantasmaEn(0, 7, 5);
    g.frightened = true;
    var antes = G.score;
    G.eatGhost(g, 0);               // sin dar un paso: un paso se come una pastilla
    eq(G.score - antes, 250, 'comerse el primero paga 250, no 200');

    /* los demás roles cobran lo de siempre */
    partidaRol(['tanque'], 6, 5, DR.RIGHT);
    eq(HB.puntosDe(G, 0, CFG.GHOST_CHAIN[0]), 200, 'el Tanque cobra lo de siempre');
    eq(HB.puntosDe(G, 0, HC.MAGO_PUNTOS), 200, 'y sus muertes por habilidad, también');

    /* fuera de DESATADO no hay pasiva que valga */
    partida(1);
    eq(HB.puntosDe(G, 0, CFG.GHOST_CHAIN[0]), 200, 'en una partida normal, nada cambia');
  });

  test('TANQUE · PASIVA CORAZA: un golpe gratis que dura 12 s y vuelve a los 30', function () {
    eq(HC.CORAZA_DURA, 12 * 60, 'dura 12 s puesta');
    eq(HC.CORAZA_CD, 30 * 60, 'y vuelve 30 s después');
    partidaRol(['tanque'], 6, 5, DR.RIGHT);
    var p = G.pacs[0];
    p.safeTicks = 0;
    ok(HB.corazaDe(G, 0), 'el Tanque sale ya con la coraza puesta');

    var g = fantasmaEn(0, 6, 5);
    function choca() { g.x = p.x; g.y = p.y; g.mode = 'normal'; g.frightened = false; G.step(); }
    choca();
    ok(!p.dying, 'el primer golpe se lo come la coraza');
    ok(!HB.corazaDe(G, 0), 'que se gasta');
    eq(HB.estado(0).corCd, HC.CORAZA_CD, 'y arranca su cuenta atrás');

    /* vuelve sola, sin pulsar nada (se mide con él vivo: muerto, la partida
     * no corre y ningún reloj del juego avanza) */
    HB.estado(0).corCd = 1;
    ticks(3);
    ok(HB.corazaDe(G, 0), 'pasados los 30 s la tiene otra vez');

    /* y CADUCA: sin que nadie la rompa se va sola, que es lo que impide que
     * el Tanque vaya siempre con un golpe gratis encima */
    HB.estado(0).corPas = 2;
    ticks(4);
    ok(!HB.corazaDe(G, 0), 'a los 12 s se va sola');
    ok(HB.estado(0).corCd > 0, 'y arranca la espera de la siguiente');

    /* y sin ella, el golpe mata */
    HB.estado(0).corPas = 0;
    HB.estado(0).gracia = 0;
    for (var i = 0; i < HC.ESCUDO_GRACIA + 4 && !p.dying; i++) choca();
    ok(p.dying, 'sin coraza, el siguiente sí mata');
  });

  /* La CORAZA se suma SOLO a la W del propio Tanque. Con el escudo que
   * reparte el Soporte no: si no, bastaba con que pasara repartiendo para ir
   * sumando capas de vida. */
  /* 20 sep: romper un escudo no se veía. El fantasma se quedaba DENTRO de ti,
   * el medio segundo de gracia pasaba pegado a él y parecía que el golpe no
   * había existido. Ahora sale empujado dos casillas. */
  test('ESCUDO: el fantasma que lo rompe sale empujado dos casillas y se da la vuelta', function () {
    eq(HC.ESCUDO_EMPUJE, 2, 'dos casillas');
    partidaRol(['tanque'], 6, 5, DR.RIGHT);
    var p = G.pacs[0];
    p.safeTicks = 0;
    var g = fantasmaEn(0, 6, 5);
    g.dir = DR.LEFT;                       // venía hacia la izquierda
    ok(HB.corazaDe(G, 0), 'el Tanque lleva su coraza');
    ok(HB.salvaDelChoque(G, 0, g), 'el choque se perdona');
    ok(!HB.corazaDe(G, 0), 'la coraza se rompe');
    eq(g.tileX(), 8, 'y el fantasma retrocede dos casillas por donde vino');
    eq(g.tileY(), 5, 'sin cambiar de fila');
    eq(g.dir, DR.RIGHT, 'y se da la vuelta, para no volver a metérsele encima');

    /* contra una pared, se queda donde pueda: nunca dentro del muro */
    partidaRol(['tanque'], 1, 5, DR.RIGHT);
    var g2 = fantasmaEn(1, 1, 5);
    g2.dir = DR.RIGHT;                     // detrás tiene la pared del borde
    HB.salvaDelChoque(G, 0, g2);
    ok(CFG.isOpen(g2.tileX(), g2.tileY()), 'acaba en pasillo, no en pared');
  });

  test('MARCADOR: la fruta de un invitado la apunta el anfitrión', function () {
    /* El marcador del final lo manda el anfitrión, así que lo que solo se
     * apunte en la copia del invitado se pierde: por eso salían a cero las
     * frutas de los demás. */
    partidaRol(['asesino', 'tanque'], 6, 5, DR.RIGHT);
    var rolAntes = G.netRole, idxAntes = G.localIdx;
    G.netRole = 'host';
    G.localIdx = 0;
    try {
      G.state = 'PLAYING';
      G.fruitActive = true;
      G.fruitInfo = CFG.fruitForLevel(1);
      eq(G.marcador[1].frutas, 0, 'el invitado empieza sin frutas');
      G.hostMsg('gevt', { t: 'ateFruit', i: 1 }, 'sid');
      eq(G.marcador[1].frutas, 1, 'y su fruta queda apuntada en la del anfitrión');
    } finally { G.netRole = rolAntes; G.localIdx = idxAntes; }
  });

  test('MARCADOR: lo que hace cada uno se apunta por jugador', function () {
    partidaRol(['asesino', 'tanque'], 6, 5, DR.RIGHT);
    var g = fantasmaEn(0, 8, 5);
    g.frightened = true;
    G.eatGhost(g, 1);
    eq(G.marcador[1].kills, 1, 'la muerte del fantasma es de quien se lo come');
    eq(G.marcador[0].kills, 0, 'y no del otro');
    G.startPacDeath(0);
    eq(G.marcador[0].muertes, 1, 'y la caída, de quien cae');
    var vivo = G.marcador[1].vivo;
    G.state = 'PLAYING';
    G.stepClock();
    ok(G.marcador[1].vivo > vivo, 'el tiempo en pie corre mientras se juega');
  });

  test('TANQUE · el anfitrión da el empujón del escudo roto del invitado',
    function () {
      /* El empujón lo tiene que dar el ANFITRIÓN: los fantasmas los mueve él,
       * así que si el invitado empuja en su pantalla, la siguiente foto se lo
       * devuelve a donde estaba y el golpe no se ve. Por eso el aviso dice
       * contra qué fantasma se rompió. */
      partidaRol(['mago', 'tanque'], 6, 5, DR.RIGHT);
      var rolAntes = G.netRole, idxAntes = G.localIdx;
      G.netRole = 'host';
      G.localIdx = 0;
      try {
        HB.estado(1).corPas = CFG.HAB.CORAZA_DURA;
        var g = fantasmaEn(0, 9, 5);
        g.dir = DR.LEFT;                    // venía hacia la izquierda
        G.hostMsg('gevt', { t: 'habRoto', i: 1, g: 0 }, 'sid');
        eq(g.tileX(), 11, 'el fantasma retrocede sus dos casillas');
        eq(g.dir, DR.RIGHT, 'y se da la vuelta');
      } finally { G.netRole = rolAntes; G.localIdx = idxAntes; }
    });

  test('TANQUE · al anfitrión también se le rompe la coraza del invitado',
    function () {
      /* LA OTRA MITAD DEL MISMO FALLO (20 sep). Los choques son de quien los
       * sufre: el invitado rompe su coraza y lo cuenta con 'habRoto'. El
       * anfitrión, al recibirlo, borraba el escudo y la coraza de la W pero
       * NO la pasiva, así que en su copia el Tanque invitado seguía con ella
       * para siempre: el aro no se apagaba y todo lo que decide el anfitrión
       * —el rey, los choques que simula él— se la seguía comiendo. */
      partidaRol(['mago', 'tanque'], 6, 5, DR.RIGHT);
      var rolAntes = G.netRole, idxAntes = G.localIdx;
      G.netRole = 'host';
      G.localIdx = 0;
      try {
        var s = HB.estado(1);
        s.corPas = CFG.HAB.CORAZA_DURA;
        s.corCd = 0;
        s.escudo = 0;
        ok(HB.corazaDe(G, 1), 'el invitado lleva su coraza');
        G.hostMsg('gevt', { t: 'habRoto', i: 1 }, 'sid');
        ok(!HB.corazaDe(G, 1), 'y al llegar su aviso, el anfitrión la da por rota');
        ok(s.corCd > 0, 'con su recarga en marcha, como en su máquina');
      } finally { G.netRole = rolAntes; G.localIdx = idxAntes; }
    });

  test('TANQUE · la foto del anfitrión no le devuelve la coraza que acaba de romper',
    function () {
      /* EL FALLO QUE ARREGLA (20 sep): en party, la foto de roles llega doce
       * veces por segundo y corregía "hacia arriba" todo lo que no estuviera
       * excluido. La coraza no lo estaba: al romperla contra un fantasma, el
       * siguiente paquete del anfitrión —que todavía me creía con ella— me la
       * devolvía, y así los doce segundos enteros. El Tanque no se moría. */
      partidaRol(['tanque'], 6, 5, DR.RIGHT);
      var p = G.pacs[0];
      p.safeTicks = 0;
      var g = fantasmaEn(0, 6, 5);
      var foto = HB.resumenRoles();          // la foto de cuando aún la tenía
      ok(HB.corazaDe(G, 0), 'el Tanque sale con su coraza');
      HB.salvaDelChoque(G, 0, g);
      ok(!HB.corazaDe(G, 0), 'y la rompe contra el fantasma');

      HB.aplicarRoles(foto, 0);              // llega la foto vieja, y soy yo
      ok(!HB.corazaDe(G, 0), 'la foto del anfitrión NO me la devuelve');
      ok(HB.estado(0).corCd > 0, 'y la recarga sigue corriendo');

      /* a los demás sí se les pinta lo que diga el anfitrión */
      HB.aplicarRoles(foto, 1);
      ok(HB.estado(0).corPas > 0, 'la de OTRO jugador sí se copia de la foto');
    });

  test('TANQUE · CORAZA + su W: dos golpes; con el escudo del Soporte, uno', function () {
    partidaRol(['tanque'], 6, 5, DR.RIGHT);
    var p = G.pacs[0];
    p.safeTicks = 0;
    ok(HB.pulsar(G, 0, 1), 'se pone además el ESCUDO de la W');
    ok(HB.corazaDe(G, 0), 'con la coraza ya puesta');
    var g = fantasmaEn(0, 6, 5);
    function choca() { g.x = p.x; g.y = p.y; g.mode = 'normal'; g.frightened = false; G.step(); }

    choca();
    ok(!p.dying, 'el primer golpe no mata');
    eq(HB.estado(0).coraza, 0, 'y se lleva el escudo de la W');
    ok(HB.corazaDe(G, 0), 'pero la coraza sigue puesta: se gastan de uno en uno');

    HB.estado(0).gracia = 0;
    choca();
    ok(!p.dying, 'el segundo tampoco mata');
    ok(!HB.corazaDe(G, 0), 'ahora sí se gasta la coraza');

    /* y con el ESCUDO ALIADO del Soporte NO se acumula */
    partidaRol(['tanque', 'soporte'], 6, 5, DR.RIGHT);
    var t2 = G.pacs[0];
    t2.safeTicks = 0;
    ok(HB.corazaDe(G, 0), 'el Tanque sale con su coraza');
    HB.marcarEscudo(0, HC.ALIADO_TICKS);       // el Soporte se lo pone
    var g2 = fantasmaEn(0, 6, 5);
    g2.x = t2.x; g2.y = t2.y; g2.mode = 'normal'; g2.frightened = false;
    G.step();
    ok(!t2.dying, 'el golpe no mata');
    eq(HB.estado(0).escudo, 0, 'se lleva el escudo del Soporte');
    ok(!HB.corazaDe(G, 0), 'y la coraza con él: esos dos no se acumulan');
  });

  /* EL OJO del Mago: por dónde VA A PASAR cada fantasma (no su destino: un
   * punto lejano no dice por dónde viene) y cuándo cambian de modo. */
  test('MAGO · PASIVA EL OJO: la ruta de cada fantasma, y solo para el Mago', function () {
    eq(HC.OJO_PASOS, 7, 'siete casillas por delante: con cinco no daba tiempo a reaccionar');
    partidaRol(['mago'], 6, 5, DR.RIGHT);
    var g = fantasmaEn(0, 10, 5);
    g.dir = DR.LEFT;
    var ruta = g.rutaPrevista(G, HC.OJO_PASOS);
    eq(ruta.length, HC.OJO_PASOS, 'devuelve las cinco casillas');
    /* casillas seguidas: cada paso es vecino del anterior */
    var ant = { x: g.tileX(), y: g.tileY() };
    for (var i = 0; i < ruta.length; i++) {
      var dx = Math.abs(ruta[i].x - ant.x), dy = Math.abs(ruta[i].y - ant.y);
      ok((dx + dy === 1) || dx === CFG.COLS - 1, 'el paso ' + i + ' es la casilla de al lado');
      ok(CFG.isOpen(ruta[i].x, ruta[i].y), 'y es pasillo, no pared');
      ant = ruta[i];
    }
    /* de un azul no se adivina el camino: elige al azar */
    g.frightened = true;
    eq(g.rutaPrevista(G, HC.OJO_PASOS).length, 0, 'de un azul no se pinta nada');
    g.frightened = false;
    g.mode = 'eyes';
    eq(g.rutaPrevista(G, HC.OJO_PASOS).length, 0, 'ni de unos ojos que vuelven a casa');

    /* y lo ve solo el Mago */
    var pintadas = 0;
    var ctx = { save: function () {}, restore: function () {}, beginPath: function () {},
      moveTo: function () {}, lineTo: function () {}, closePath: function () {},
      stroke: function () {}, arc: function () {}, fill: function () {},
      fillText: function () {}, fillRect: function () { pintadas++; },
      strokeStyle: '', fillStyle: '', lineWidth: 1, font: '', textAlign: '' };
    fantasmaEn(0, 10, 5);
    fantasmaEn(1, 12, 5);
    HB.dibujarOjo(G, ctx, CFG.MAZE_Y, 0);
    ok(pintadas >= 2 * HC.OJO_PASOS, 'pinta el camino de cada uno: ' + pintadas);

    var conOjo = pintadas;
    pintadas = 0;
    partidaRol(['tanque'], 6, 5, DR.RIGHT);
    fantasmaEn(0, 10, 5);
    HB.dibujarOjo(G, ctx, CFG.MAZE_Y, 0);
    eq(pintadas, 0, 'el Tanque no ve nada (el Mago veía ' + conOjo + ')');
  });

  test('TANQUE · PROVOCAR: los fantasmas van a por él 5 s', function () {
    partidaRol(['tanque'], 6, 5, DR.RIGHT);
    var g = fantasmaEn(1, 20, 5);
    G.globalMode = 'scatter';
    var antes = g.targetTile(G);
    ok(HB.pulsar(G, 0, 2), 'la provocación sale');
    var t = g.targetTile(G);
    eq(t.x + ',' + t.y, '6,5', 'el objetivo es la casilla del Tanque, aunque se dispersen');
    HB.estado(0).provoca = 1;
    ticks(2);
    var t2 = g.targetTile(G);
    eq(t2.x + ',' + t2.y, antes.x + ',' + antes.y, 'y al acabarse vuelven a lo suyo');
  });

  test('TANQUE · PROVOCAR: todo el mapa va a por él e ignora al resto del equipo', function () {
    partidaRol(['tanque', 'asesino'], 6, 5, DR.RIGHT);
    var yo = G.pacs[1];
    ponPac(1, 20, 29, DR.LEFT);
    yo.safeTicks = 0;
    G.pacs[0].safeTicks = 0;
    var lejos = fantasmaEn(2, 21, 29);      // en la otra punta del mapa
    G.globalMode = 'scatter';
    ok(HB.pulsar(G, 0, 2), 'el Tanque provoca');
    var t = lejos.targetTile(G);
    eq(t.x + ',' + t.y, '6,5', 'hasta el de la otra punta va a por el Tanque');
    for (var i = 0; i < 20; i++) { lejos.x = yo.x; lejos.y = yo.y; lejos.mode = 'normal'; G.step(); }
    ok(!yo.dying, 'y atraviesa al compañero sin matarlo');
    var cerca = fantasmaEn(0, 6, 5);
    var tq = G.pacs[0];
    /* le quitamos la CORAZA a mano: aquí se mide la provocación, no la pasiva
     * (con ella puesta, el primer golpe se lo come el escudo) */
    HB.estado(0).corPas = 0;
    HB.estado(0).gracia = 0;
    for (i = 0; i < HC.ESCUDO_GRACIA + 4 && !tq.dying; i++) { cerca.x = tq.x; cerca.y = tq.y; cerca.mode = 'normal'; G.step(); }
    ok(tq.dying, 'al Tanque sí lo mata');
    HB.estado(0).provoca = 0;
    for (i = 0; i < 3 && !yo.dying; i++) { lejos.x = yo.x; lejos.y = yo.y; lejos.mode = 'normal'; G.step(); }
    ok(yo.dying, 'acabada la provocación, al compañero vuelven a matarlo');
  });

  /* 20 sep: mientras los azules siguieran a lo suyo, bastaba con que alguien
   * pisara un energizante para que la provocación se quedara en nada justo
   * cuando más falta hacía. Ahora el grito manda sobre todo lo demás. */
  test('TANQUE · PROVOCAR: ni el energizante ni el pisotón desvían el grito', function () {
    partidaRol(['tanque'], 6, 5, DR.RIGHT);
    var g = fantasmaEn(1, 20, 5);
    ok(HB.pulsar(G, 0, 2), 'la provocación sale');

    /* AZUL: sigue siendo comestible, pero viene igual */
    g.frightened = true;
    var t = HB.objetivo(G, g);
    ok(t, 'un fantasma azul también está provocado');
    eq(t.x + ',' + t.y, '6,5', 'y su destino es la casilla del Tanque');

    /* y en el cruce elige la salida que lo acerca, no una al azar */
    g.dir = DR.LEFT;
    eq(g.decide(G), DR.LEFT, 'en el cruce tira hacia el Tanque, no al azar');

    /* PISOTÓN: ni huyendo del Tanque deja de ir a por él */
    HB.huye[g.id] = 60;
    HB.huyeQuien[g.id] = 0;
    g.frightened = false;
    eq(g.decide(G), DR.LEFT, 'y tampoco lo desvía un pisotón');
    HB.huye[g.id] = 0;

    /* los ojos siguen fuera: esos vuelven a casa, no persiguen a nadie */
    g.mode = 'eyes';
    eq(HB.objetivo(G, g), null, 'a los ojos no los provoca nadie');
  });

  /* 18 sep: antes solo se les borraba lo pensado, y en un pasillo largo no
   * hay cruce donde decidir: el grito tardaba segundos en notarse. */
  test('TANQUE · PROVOCAR: el que le da la espalda se gira en el acto', function () {
    partidaRol(['tanque'], 6, 5, DR.RIGHT);
    var g = fantasmaEn(1, 20, 5);
    g.dir = DR.RIGHT;                 // se aleja del Tanque, que está a su izquierda
    var deFrente = fantasmaEn(2, 21, 5);
    deFrente.dir = DR.LEFT;           // este ya venía hacia él
    ok(HB.pulsar(G, 0, 2), 'la provocación sale');
    eq(g.dir, DR.LEFT, 'el que huía se da la vuelta donde esté');
    eq(deFrente.dir, DR.LEFT, 'y el que ya venía no se despista');
  });

  test('TANQUE · ESCUDO: 8 s o hasta que un golpe lo rompa', function () {
    partidaRol(['tanque'], 6, 5, DR.RIGHT);
    var p = G.pacs[0];
    p.safeTicks = 0;
    ok(HB.pulsar(G, 0, 1), 'el escudo sale');
    ok(HB.activa(G, 0, 1), 'y la W se ve encendida');
    ticks(HC.ESCUDO_TICKS - 10);
    eq(HC.ESCUDO_TICKS, 8 * 60, 'dura 8 s');
    ok(HB.activa(G, 0, 1), 'sin golpes, sigue puesto casi 8 s');
    var g = fantasmaEn(0, 6, 5);
    function choca() { g.x = p.x; g.y = p.y; g.mode = 'normal'; g.frightened = false; G.step(); }
    choca();
    ok(!p.dying, 'el golpe no mata');
    ok(!HB.activa(G, 0, 1), 'pero se lleva el escudo');
    ok(g.mode === 'normal', 'y el fantasma ni muere ni se come');
    /* y por debajo del escudo de la W queda su CORAZA, que aguanta otro */
    HB.estado(0).gracia = 0;
    choca();
    ok(!p.dying, 'la coraza se come el segundo golpe');
    ok(!HB.corazaDe(G, 0), 'y se gasta');
    for (var i = 0; i < HC.ESCUDO_GRACIA + 2 && !p.dying; i++) choca();
    ok(p.dying, 'pasado el respiro, el siguiente choque sí mata');
    partidaRol(['tanque'], 6, 5, DR.RIGHT);
    HB.pulsar(G, 0, 1);
    ticks(HC.ESCUDO_TICKS + 1);
    ok(!HB.activa(G, 0, 1), 'y sin golpes se apaga a los 8 s');
  });

  test('SOPORTE · ESCUDO ALIADO: se rompe al primer golpe', function () {
    partidaRol(['soporte', 'asesino'], 6, 5, DR.RIGHT);
    var p = ponPac(1, 10, 5, DR.LEFT);
    ok(HB.pulsar(G, 0, 2), 'lo da');
    p.safeTicks = 0;
    p.dir = p.nextDir = DR.UP;       // contra la pared, quieto
    var g = fantasmaEn(0, 10, 5);
    function choca() { g.x = p.x; g.y = p.y; g.mode = 'normal'; g.frightened = false; G.step(); }
    choca();
    ok(!p.dying, 'el primer choque no mata');
    eq(HB.estado(1).escudo, 0, 'y el escudo se gasta');
    for (var i = 0; i < HC.ESCUDO_GRACIA + 2 && !p.dying; i++) choca();
    ok(p.dying, 'pasado el respiro, el siguiente sí mata');
  });

  test('TANQUE · PISOTÓN: huyen más lentos, sin ponerse azules; sin nadie cerca no sale', function () {
    partidaRol(['tanque'], 6, 5, DR.RIGHT);
    eq(HC.PISOTON_TICKS, 6 * 60, 'dura 6 s');
    eq(HB.pulsar(G, 0, 0), false, 'sin ningún fantasma en la calle no sale');
    ok(HB.lista(0, 0), 'ni gasta la recarga');
    var g = fantasmaEn(0, 15, 5);
    g.dir = DR.LEFT;
    /* 20 sep: SIN ALCANCE. Uno cerca y otro en la otra punta del mapa: el
     * golpe los coge a los dos, que es lo que hace fiable la jugada. */
    var lejos = fantasmaEn(1, 26, 29);
    var normal = g.speedPx(G);
    ok(HB.pulsar(G, 0, 0), 'con fantasmas en la calle, sale');
    ok(HB.huyeDe(G, g) === G.pacs[0], 'ese fantasma huye del Tanque');
    ok(HB.huyeDe(G, lejos) === G.pacs[0], 'y el de la otra punta, también');
    ok(!g.frightened, 'y no se pone azul');
    eq(g.dir, DR.RIGHT, 'el que venía de cara se da la vuelta');
    eq(G.frightTicks, 0, 'ni empieza el modo azul');
    eq(HC.PISOTON_LENTO, 0.6, 'los frena un 40%');
    ok(Math.abs(g.speedPx(G) - normal * HC.PISOTON_LENTO) < 0.01, 'y va al 60% de su velocidad');
    HB.huye[0] = 0;
    ok(Math.abs(g.speedPx(G) - normal) < 0.01, 'acabado el pisotón, vuelve a la suya');
  });

  test('TANQUE · APISONADORA: recta hasta la pared, imparable, 200 fijos por fantasma', function () {
    partidaRol(['tanque'], 1, 5, DR.RIGHT);
    filaVacia(5);
    var p = G.pacs[0];
    p.safeTicks = 0;
    var g = fantasmaEn(0, 8, 5);
    HB.hielo[0] = 999;            // quieto, para que no se aparte
    var antes = G.score;
    ok(HB.pulsar(G, 0, 3), 'la apisonadora sale');
    eq(HB.multVel(0), HC.APISONADORA_MULT, 'y va más rápido');
    ticks(3);
    p.nextDir = DR.UP;            // en la columna 6 se podría subir: no gira
    for (var n = 0; n < 40; n++) G.step();
    eq(p.tileY(), 5, 'sigue en línea recta aunque se pulse otra flecha');
    eq(g.mode, 'eyes', 'el fantasma que toca muere');
    eq(G.score - antes, 200, 'por 200 fijos');
    eq(G.chainIndex, 0, 'sin cadena');
    eq(G.eatFreezeTicks, 0, 'y sin parar la partida');
    var otro = fantasmaEn(1, p.tileX(), 5);
    otro.x = p.x; otro.y = p.y;
    G.step();
    ok(!p.dying, 'mientras dura, nada la mata');
    for (n = 0; n < 1000 && HB.arrollando(0); n++) G.step();
    eq(HB.arrollando(0), false, 'se acaba');
    eq(p.tileX(), 26, 'justo al toparse con la pared, sin límite de tiempo');

    // por el túnel da la vuelta y sigue, hasta la pared del otro lado
    partidaRol(['tanque'], 5, 14, DR.LEFT);
    ok(HB.pulsar(G, 0, 3), 'sale hacia el túnel');
    for (n = 0; n < 1000 && HB.arrollando(0); n++) G.step();
    eq(G.pacs[0].tileY(), 14, 'sigue en su fila');
    eq(G.pacs[0].tileX(), 18, 'cruza el túnel y para en la pared de enfrente');

    partidaRol(['tanque'], 1, 1, DR.UP);
    eq(HB.pulsar(G, 0, 3), false, 'sin ni una casilla libre delante, no sale');
    ok(HB.lista(0, 3), 'ni gasta');
  });

  /* ---------- SOPORTE ---------- */
  test('SOPORTE · HIELO: congela al primero y a los de su casilla; congelado no mata', function () {
    partidaRol(['soporte', 'asesino'], 2, 5, DR.RIGHT);
    var g0 = fantasmaEn(0, 9, 5), g1 = fantasmaEn(1, 9, 5);
    ok(HB.pulsar(G, 0, 0), 'el disparo sale');
    for (var i = 0; i < 20; i++) { g0.x = g1.x = 9 * CFG.TILE + 4; g0.y = g1.y = 5 * CFG.TILE + 4; G.step(); }
    ok(HB.congelado(0) && HB.congelado(1), 'los dos de esa casilla, congelados');
    eq(g0.speedPx(G), 0, 'congelado no se mueve');
    var p = G.pacs[0];
    p.safeTicks = 0;
    p.x = g0.x; p.y = g0.y;
    G.step();
    ok(!p.dying, 'y no mata a quien lo toca');
    ponPac(1, 8, 5, DR.RIGHT);
    ok(HB.pulsar(G, 1, 0), 'el Asesino sí lo muerde');
    ok(g0.mode === 'eyes' || g1.mode === 'eyes', 'y se lo come');
  });

  test('SOPORTE · HIELO sin blanco gasta la recarga igual', function () {
    partidaRol(['soporte'], 2, 5, DR.UP);
    ok(HB.pulsar(G, 0, 0), 'sale contra la pared');
    ok(!HB.lista(0, 0), 'y gasta');
    ticks(5);
    eq(HB.balas.length, 0, 'el proyectil se para en el muro');
  });

  test('SOPORTE · INMUNIDAD 3 s y ESCUDO ALIADO solo con compañeros', function () {
    eq(HC.INMUNE_TICKS, 3 * 60, 'la inmunidad dura 3 s');
    eq(HC.ALIADO_TICKS, 8 * 60, 'el escudo aliado dura 8 s');
    partidaRol(['soporte'], 6, 5, DR.RIGHT);
    var p = G.pacs[0];
    p.safeTicks = 0;
    eq(HB.pulsar(G, 0, 2), false, 'a uno, el escudo aliado no sale');
    ok(HB.lista(0, 2), 'ni gasta');
    ok(HB.pulsar(G, 0, 1), 'la inmunidad sale');
    var g = fantasmaEn(0, 6, 5);
    for (var i = 0; i < HC.INMUNE_TICKS - 2; i++) { g.x = p.x; g.y = p.y; g.mode = 'normal'; G.step(); }
    ok(!p.dying, 'tres segundos sin que nada mate');
    for (i = 0; i < 6 && !p.dying; i++) { g.x = p.x; g.y = p.y; g.mode = 'normal'; G.step(); }
    ok(p.dying, 'y al acabarse, mata');

    partidaRol(['soporte', 'asesino'], 6, 5, DR.RIGHT);
    ponPac(1, 10, 5, DR.LEFT);
    ok(HB.pulsar(G, 0, 2), 'con un compañero vivo, sale');
    ok(HB.estado(1).escudo > 0, 'y el escudo es del compañero');
  });

  /* 20 sep: la E mantenida llegaba a dos casillas y dejaba al Soporte a pelo.
   * Ahora es su jugada grande: escudo a TODO el equipo, él incluido. */
  test('SOPORTE · E MANTENIDA: escudo a todo el equipo, él incluido y sin alcance', function () {
    partidaRol(['soporte', 'asesino'], 6, 5, DR.RIGHT);
    ponPac(1, 26, 29, DR.LEFT);            // en la otra punta del mapa
    var todos = HB.aliadosCerca(G, 0);
    eq(todos.length, 2, 'entran los dos, esté donde esté cada uno');
    ok(todos.indexOf(0) !== -1, 'el propio Soporte entra');

    ok(HB.aliadoArea(G, 0), 'la E mantenida sale');
    ok(HB.estado(0).escudo > 0, 'y el Soporte se queda con escudo');
    ok(HB.estado(1).escudo > 0, 'y el compañero de la otra punta, también');

    /* a uno solo también sale: él cuenta */
    partidaRol(['soporte'], 6, 5, DR.RIGHT);
    ok(HB.aliadoArea(G, 0), 'jugando solo, se la pone a él');
    ok(HB.estado(0).escudo > 0, 'con su escudo puesto');
  });

  test('SOPORTE · VIDA EXTRA: respeta el tope y su recarga sobrevive a morir y al nivel', function () {
    partidaRol(['soporte'], 6, 5, DR.RIGHT);
    var vidas = G.lives;
    ok(HB.pulsar(G, 0, 3), 'la vida sale');
    eq(G.lives, vidas + 1, 'una vida más');
    eq(HB.restan(0, 3), 180, 'y tres minutos de recarga');
    G.respawn();
    G.resetLevel();
    eq(HB.restan(0, 3), 180, 'ni morir ni cambiar de nivel la devuelven');
    partidaRol(['soporte'], 6, 5, DR.RIGHT);
    G.lives = HC.VIDA_MAX;
    eq(HB.pulsar(G, 0, 3), false, 'con el tope ya puesto no sale');
    ok(HB.lista(0, 3), 'ni gasta');

    window.PM.settings.muted = true;
    G.newGame({ players: 2, hab: true, roles: ['soporte', 'mago'], cfg: (function () {
      var c = {}, b = window.PM.settings; for (var k in b) c[k] = b[k]; c.livesMode = 'individual'; return c;
    })() });
    G.state = 'PLAYING';
    G.pacs[0].lives = 3; G.pacs[1].lives = 1;
    ok(HB.pulsar(G, 0, 3), 'con vidas propias, también');
    eq(G.pacs[1].lives, 2, 'y va al que menos tiene');
  });

  /* ---------- SOPORTE: MANTENER PULSADO ---------- */
  test('SOPORTE · Q: pulsada y soltada dispara; mantenida 2 s deja hielo en el suelo', function () {
    eq(HC.MANTENER.hielo, 2 * 60, 'la Q se mantiene 2 s');
    partidaRol(['soporte'], 6, 5, DR.RIGHT);
    ok(HB.apretar(G, 0, 0, false), 'apretar la Q empieza a cargar');
    ticks(30);
    eq(HB.balas.length, 0, 'apretada todavía no dispara');
    ok(HB.lista(0, 0), 'ni gasta');
    ok(HB.soltar(G, 0, 0), 'al soltar antes de tiempo, dispara');
    eq(HB.balas.length, 1, 'sale el disparo helado');
    ok(!HB.lista(0, 0), 'y gasta');
    ok(!HB.placas[0], 'sin placa');

    partidaRol(['soporte'], 6, 5, DR.RIGHT);
    HB.apretar(G, 0, 0, false);
    eq(HB.apretar(G, 0, 0, true), false, 'la autorrepetición del teclado no reinicia la cuenta');
    ticks(HC.MANTENER.hielo - 1);
    ok(!HB.placas[0], 'a un tick de los 2 s, nada');
    G.paused = true;
    ticks(200);
    G.paused = false;
    ok(!HB.placas[0], 'en pausa no carga');
    ticks(1);
    var pl = HB.placas[0];
    ok(pl, 'a los 2 s, la placa en el suelo');
    eq(pl.c + ',' + pl.r, G.pacs[0].tileX() + ',' + G.pacs[0].tileY(), 'en la casilla del Soporte');
    eq(HB.balas.length, 0, 'sin disparo');
    ok(!HB.lista(0, 0), 'comparte recarga con el disparo');
    eq(HB.soltar(G, 0, 0), false, 'soltar después ya no dispara');
    eq(HB.balas.length, 0, 'ni una bala');

    ponPac(0, 1, 1, DR.UP);
    var g0 = fantasmaEn(0, pl.c, pl.r);
    G.step();
    ok(HB.congelado(0), 'el fantasma que la pisa se congela');
    HB.hielo[0] = 0;
    G.step();
    ok(!HB.congelado(0), 'y a cada fantasma, una sola vez');
    var g1 = fantasmaEn(1, pl.c, pl.r);
    G.step();
    ok(HB.congelado(1), 'pero congela a todos los que la pisen');
    ticks(HC.PLACA_TICKS);
    ok(!HB.placas[0], 'y se deshace a los ' + (HC.PLACA_TICKS / 60) + ' s');
    ok(g0 && g1, 'fantasmas colocados');
  });

  test('SOPORTE · Q mantenida se corta al morir; la E corta sigue igual', function () {
    partidaRol(['soporte'], 6, 5, DR.RIGHT);
    HB.apretar(G, 0, 0, false);
    ticks(60);
    HB.limpiarJugador(0);
    ticks(HC.MANTENER.hielo);
    ok(!HB.placas[0], 'morir suelta la tecla sin lanzar nada');
    ok(HB.lista(0, 0), 'ni gastar');
    partidaRol(['soporte', 'asesino'], 6, 5, DR.RIGHT);
    ponPac(1, 12, 5, DR.LEFT);
    HB.apretar(G, 0, 2, false);
    ok(HB.soltar(G, 0, 2), 'la E pulsada y soltada da el escudo de siempre');
    ok(HB.estado(1).escudo > 0, 'al más cercano, aunque esté lejos');
  });

  test('SOPORTE · E mantenida 2 s: escudo a todo el equipo, sin alcance', function () {
    eq(HC.MANTENER.aliado, 2 * 60, 'la E se mantiene 2 s');

    partidaRol(['soporte', 'asesino', 'tanque', 'mago'], 6, 5, DR.RIGHT);
    HB.apretar(G, 0, 2, false);
    ticks(HC.MANTENER.aliado - 1);
    ok(HB.estado(0).mant === 2, 'sigue cargando');
    /* uno pegado, uno a media pantalla y uno en la otra punta */
    ponPac(0, 6, 5); ponPac(1, 8, 5); ponPac(2, 6, 17); ponPac(3, 26, 29);
    for (var i = 0; i < 4; i++) HB.estado(i).escudo = 0;
    G.step();
    ok(HB.estado(1).escudo > 0, 'al de al lado, escudo');
    ok(HB.estado(2).escudo > 0, 'al de media pantalla, también');
    ok(HB.estado(3).escudo > 0, 'y al de la otra punta: ya no hay alcance');
    ok(HB.estado(0).escudo > 0, 'y el Soporte se lo pone también a sí mismo');
    ok(!HB.lista(0, 2), 'y gasta la recarga de la E');

    /* jugando solo tampoco se desperdicia: él cuenta */
    partidaRol(['soporte'], 6, 5, DR.RIGHT);
    HB.apretar(G, 0, 2, false);
    ticks(HC.MANTENER.aliado + 1);
    ok(HB.estado(0).escudo > 0, 'a uno, se la queda él');
  });

  test('SOPORTE · una partida con teclas mantenidas se reproduce exacta', function () {
    var R = window.PM.Replay;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      // [tick, 'a' apretar | 's' soltar | 'd' giro, valor]
      var guion = [[5, 'd', 1], [20, 'a', 0], [200, 's', 0], [260, 'd', 0], [300, 'a', 0],
                   [330, 's', 0], [700, 'd', 3], [1100, 'a', 0], [1180, 'd', 2], [1300, 's', 0],
                   [1400, 'a', 1], [1410, 's', 1]];
      var TOTAL = 1700;
      function corre(conGuion) {
        G.state = 'PLAYING';
        G.readyTicks = 0;
        var k = 0;
        for (var i = 0; i < TOTAL; i++) {
          if (conGuion) {
            while (k < guion.length && guion[k][0] === i) {
              var q = guion[k];
              if (q[1] === 'a') HB.apretar(G, 0, q[2], false);
              else if (q[1] === 's') HB.soltar(G, 0, q[2]);
              else G.setPacDir(0, q[2]);
              k++;
            }
          }
          G.step();
        }
      }
      G.newGame({ players: 1, hab: true, roles: ['soporte'] });
      var rep = R.enCurso();
      ok(rep, 'la partida se graba');
      corre(true);
      var pts = G.score, quedan = G.dotsLeft, vidas = G.lives;
      var mant = rep.entradas.filter(function (e) { return e[2] >= 9; }).length;
      ok(mant > 0, 'hay teclas mantenidas en la repetición: ' + mant);
      var fg = G.ghosts.map(function (g) { return Math.round(g.x) + ':' + Math.round(g.y); }).join();
      if (!rep.final) {
        rep.final = { puntos: pts, nivel: G.level, fantasmas: G.runGhosts,
                      tiempoMs: Math.round(G.timeTicks * 1000 / 60) };
      }
      var leida = R.leer(R.serializar(rep));
      ok(leida, 'pasa por el texto y vuelve');
      eq(leida.entradas.filter(function (e) { return e[2] >= 9; }).length, mant, 'con las mantenidas intactas');
      ok(R.ver(leida), 'la repetición arranca');
      corre(false);
      eq(G.score, pts, 'la puntuación cuadra');
      eq(G.dotsLeft, quedan, 'las pastillas cuadran');
      eq(G.lives, vidas, 'las vidas cuadran');
      eq(G.ghosts.map(function (g) { return Math.round(g.x) + ':' + Math.round(g.y); }).join(), fg,
         'los fantasmas acaban donde acabaron');
    } finally {
      window.PM.Replay.salir();
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  /* ---------- PRÁCTICA ---------- */
  test('PRÁCTICA: a uno con otro rol no hay récord de DESATADO, pero sí el de SU rol; en dúo cuenta todo', function () {
    conContadores(function () {
      var vistos = null;
      try { vistos = localStorage.getItem(CFG.BADGES_KEY); localStorage.removeItem(CFG.BADGES_KEY); } catch (e) {}
      try {
        partidaRol(['tanque']);
        ok(G.practica, 'solo con Tanque es práctica');
        var previo = G.recordModo('hab', 1);
        G.score = previo + 999999;
        G.highScore = G.score;
        G.persistHighScore();
        eq(G.recordModo('hab', 1), previo, 'no toca el récord de DESATADO');
        eq(window.PM.Badges.recordRol('tanque', 1), G.score, 'pero sí el del TANQUE (23 sep)');
        G.badgeNotice = null;
        G.checkBadges();
        ok(G.badgeNotice && G.badgeNotice.mode.indexOf('TANQUE') !== -1, 'y celebra las copas del Tanque');
        partidaRol(['asesino']);
        ok(!G.practica, 'con Asesino, la partida de siempre');
        partidaRol(['soporte', 'asesino']);
        ok(!G.practica, 'en dúo con Soporte cuenta');
        G.setRecordModo('hab', previo, 1);
      } finally {
        try {
          if (vistos === null) localStorage.removeItem(CFG.BADGES_KEY);
          else localStorage.setItem(CFG.BADGES_KEY, vistos);
        } catch (e) {}
      }
    });
  });

  /* ---------- MAGO ---------- */
  test('MAGO · FUEGO: mata al primero, 200 fijos, sin cadena ni parón', function () {
    partidaRol(['mago'], 2, 5, DR.RIGHT);
    var g = fantasmaEn(0, 9, 5);
    HB.hielo[0] = 999;
    var antes = G.score;
    ok(HB.pulsar(G, 0, 0), 'la bola sale');
    filaVacia(5);
    antes = G.score;
    ticks(20);
    eq(g.mode, 'eyes', 'el fantasma muere');
    eq(G.score - antes, 200, 'vale 200 justos');
    eq(G.chainIndex, 0, 'no sube la cadena');
    eq(G.eatFreezeTicks, 0, 'y el juego no se para');
  });

  test('MAGO · PORTAL: entrada y otra dimensión, salida, cruce y 20 s abierto', function () {
    eq(HC.segs(1, 'mago'), 46, 'recarga de 46 s');
    eq(HC.PORTAL_ESPERA, 8 * 60, '8 s en la otra dimensión');
    eq(HC.PORTAL_TICKS, 20 * 60, 'y 20 s abierto');
    partidaRol(['mago'], 2, 5, DR.RIGHT);
    ok(HB.pulsar(G, 0, 1), 'la entrada se pone');
    ok(HB.lista(0, 1), 'sin gastar todavía');
    ok(HB.enDimension(0), 'y el Mago pasa a la otra dimensión');
    eq(HB.miraDesdeDimension(G), 0, 'y lo ve desde dentro');
    eq(HB.pulsar(G, 0, 0), false, 'desde ahí no se dispara');
    ponPac(0, 12, 5);
    ok(HB.pulsar(G, 0, 1), 'la salida se pone');
    ok(!HB.enDimension(0), 'vuelve a la dimensión de todos');
    ok(!HB.lista(0, 1), 'y ahora empieza la recarga');
    ok(HB.portales[0].t > 0, 'el portal está abierto');
    var p = ponPac(0, 1, 5, DR.RIGHT);
    HB.estado(0).ultTile = -1;
    HB.estado(0).cruce = 0;
    /* 18 sep: sin el ESPACIO apretado, un portal es solo un dibujo */
    HB.soltarEspacio();
    p.x = 2 * CFG.TILE + 4;
    HB.cruzar(G, p);
    eq(p.tileX(), 2, 'pisar la boca sin apretar nada no teletransporta');
    HB.marcarEspacio(0, true);
    p = ponPac(0, 1, 5, DR.RIGHT);
    HB.estado(0).ultTile = -1;
    HB.cruzar(G, p);
    eq(p.tileX(), 1, 'fuera de la boca no pasa nada');
    p.x = 2 * CFG.TILE + 4;
    HB.cruzar(G, p);
    eq(p.tileX(), 12, 'al entrar por una boca con el espacio, sale por la otra');
    HB.cruzar(G, p);
    eq(p.tileX(), 12, 'y no rebota');
    HB.soltarEspacio();
    ticks(HC.PORTAL_TICKS - 10);
    ok(HB.portales[0], 'a punto de los 20 s sigue abierto');
    ticks(12);
    eq(HB.portales[0], null, 'a los 20 s se cierra');
  });

  test('MAGO · PORTAL: a los 8 s la salida se pone sola donde esté', function () {
    partidaRol(['mago'], 2, 5, DR.RIGHT);
    var p = G.pacs[0];
    ok(HB.pulsar(G, 0, 1), 'la entrada');
    ticks(HC.PORTAL_ESPERA - 1);
    ok(HB.enDimension(0), 'a un tick, sigue dentro');
    ticks(1);
    ok(!HB.enDimension(0), 'a los 8 s vuelve solo');
    var po = HB.portales[0];
    ok(po && po.t > 0, 'con el portal abierto');
    eq(po.sc + ',' + po.sr, p.tileX() + ',' + p.tileY(), 'y la salida donde estaba');
    ok(!HB.lista(0, 1), 'gasta la recarga');
  });

  test('MAGO · OTRA DIMENSIÓN: nada lo mata, no come y los fantasmas no lo persiguen', function () {
    partidaRol(['mago', 'asesino'], 6, 5, DR.RIGHT);
    ponPac(1, 20, 29);
    var p = G.pacs[0];
    p.safeTicks = 0;
    ok(HB.pulsar(G, 0, 1), 'entra');
    var g = fantasmaEn(0, 6, 5);
    for (var i = 0; i < 30; i++) { g.x = p.x; g.y = p.y; g.mode = 'normal'; G.step(); }
    ok(!p.dying, 'un fantasma encima no lo mata');
    var fila = p.tileY(), col = p.tileX() + 1;
    G.pellets[fila][col] = '.';
    var antes = G.score;
    G.eatAt(col, fila, p);
    eq(G.pellets[fila][col], '.', 'la pastilla sigue ahí');
    eq(G.score, antes, 'y no suma');
    var ctx = G.pacContextFor(g);
    eq(ctx.tile.x + ',' + ctx.tile.y, G.pacs[1].tileX() + ',' + G.pacs[1].tileY(), 'los fantasmas van a por el compañero');
    eq(HB.alfa(0, G), 0.35, 'a dos en el mismo teclado se le ve translúcido');
  });

  test('MAGO · PORTAL: sobrevive a pasar de nivel y a morir', function () {
    partidaRol(['mago'], 2, 5, DR.RIGHT);
    ok(HB.pulsar(G, 0, 1), 'entrada');
    ponPac(0, 12, 5);
    ok(HB.pulsar(G, 0, 1), 'salida');
    G.resetLevel();
    ok(HB.portales[0] && HB.portales[0].t > 0, 'tras el nivel sigue abierto');
    G.respawn();
    ok(HB.portales[0] && HB.portales[0].t > 0, 'y tras morir también');

    partidaRol(['mago'], 2, 5, DR.RIGHT);
    ok(HB.pulsar(G, 0, 1), 'otra entrada');
    ponPac(0, 12, 5);
    G.resetLevel();
    ok(!HB.enDimension(0), 'pasar de nivel lo saca de la otra dimensión');
    var po = HB.portales[0];
    ok(po && po.t > 0 && po.sc === 12, 'dejando la salida donde estaba');
  });

  test('MAGO · PORTAL en red: el invitado pide entrada y salida; si calla, el anfitrión la pone', function () {
    window.PM.settings.muted = true;
    G.newGame({ players: 2, hab: true, net: 'host', names: ['UNO', 'DOS'], roles: ['asesino', 'mago'] });
    G.state = 'PLAYING';
    ponPac(1, 2, 5, DR.RIGHT);
    HB.peticion(G, 1, 1, { c: 2, r: 5 });
    ok(HB.enDimension(1), 'el anfitrión lo pone en la otra dimensión');
    var s = G.buildSnapshot(false);
    eq(s.hx.e[1][8], HC.PORTAL_ESPERA, 'y la dimensión viaja en la foto');
    HB.peticion(G, 1, 1, { c: 12, r: 5 });
    ok(HB.portales[1].t > 0 && HB.portales[1].sc === 12, 'la salida donde dijo el invitado');
    ok(!HB.lista(1, 1), 'con su recarga');

    G.newGame({ players: 2, hab: true, net: 'host', names: ['UNO', 'DOS'], roles: ['asesino', 'mago'] });
    G.state = 'PLAYING';
    G.readyTicks = 0;
    for (var i = 0; i < G.pacs.length; i++) G.pacs[i].safeTicks = 999999;
    ponPac(1, 2, 5, DR.RIGHT);
    HB.peticion(G, 1, 1, { c: 2, r: 5 });
    for (i = 0; i < HC.PORTAL_ESPERA + 10; i++) HB.pasoRoles(G, true);
    ok(!(HB.portales[1].t > 0), 'el anfitrión espera a que el invitado mande su salida');
    ponPac(1, 12, 5);
    for (i = 0; i < HC.PORTAL_RED_GRACIA; i++) HB.pasoRoles(G, true);
    ok(HB.portales[1] && HB.portales[1].t > 0, 'y si no llega, la pone él');
  });

  test('MAGO · RUNA: mata a todos los fantasmas de su casilla', function () {
    eq(HC.RUNA_TICKS, 15 * 60, 'dura 15 s');
    partidaRol(['mago'], 2, 5, DR.RIGHT);
    ok(HB.pulsar(G, 0, 2), 'la runa se pone');
    ponPac(0, 20, 5);
    filaVacia(5);
    var antes = G.score;
    var a = fantasmaEn(0, 2, 5), b = fantasmaEn(1, 2, 5);
    HB.hielo[0] = HB.hielo[1] = 999;
    ticks(1);
    ok(a.mode === 'eyes' && b.mode === 'eyes', 'caen los dos');
    eq(G.score - antes, 400, '200 cada uno');
    eq(HB.runas[0], null, 'y la runa se gasta');
  });

  test('MAGO · RUNA: mata al primero que la pisa y desaparece', function () {
    partidaRol(['mago'], 2, 5, DR.RIGHT);
    ok(HB.pulsar(G, 0, 2), 'la runa se pone');
    ponPac(0, 20, 5);
    filaVacia(5);
    var antes = G.score;
    var g = fantasmaEn(0, 2, 5);
    HB.hielo[0] = 999;
    ticks(1);
    eq(g.mode, 'eyes', 'el que la pisa muere');
    eq(HB.runas[0], null, 'y la runa se gasta');
    eq(G.score - antes, 200, 'con 200 fijos');
  });

  test('MAGO · TORMENTA: tres rayos (el primero al instante), pierde los que no tienen blanco y se corta si muere', function () {
    partidaRol(['mago'], 6, 5, DR.RIGHT);
    var a = fantasmaEn(0, 9, 5), b = fantasmaEn(1, 10, 5);
    HB.hielo[0] = HB.hielo[1] = 9999;
    ok(HB.pulsar(G, 0, 3), 'la tormenta sale');
    eq(a.mode, 'eyes', 'el primer rayo cae al momento, en el más cercano');
    ok(b.mode === 'normal', 'y solo en uno');
    ticks(HC.TORMENTA_CADA);
    eq(b.mode, 'eyes', 'al segundo, el siguiente');
    eq(HC.TORMENTA_RAYOS, 3, 'tres rayos');
    eq(HC.TORMENTA_TILES, 10, 'a diez casillas');
    /* el tercero, al segundo siguiente: uno que estaría fuera de las seis
     * casillas de antes y dentro de las diez de ahora */
    var c = fantasmaEn(2, 14, 5);
    HB.hielo[2] = 9999;
    ticks(HC.TORMENTA_CADA);
    eq(c.mode, 'eyes', 'y el tercero cae a ocho casillas, que antes no llegaba');
    var d = fantasmaEn(3, 12, 5);
    HB.hielo[3] = 9999;
    ticks(HC.TORMENTA_CADA * 3);
    eq(HB.estado(0).tormenta, 0, 'y ahí se acaba');
    ok(d.mode === 'normal', 'sin cuarto rayo');

    partidaRol(['mago'], 6, 5, DR.RIGHT);
    ok(HB.pulsar(G, 0, 3), 'otra tormenta');
    G.startPacDeath(0);
    eq(HB.estado(0).tormenta, 0, 'si el Mago muere, se corta');
  });

  /* ---------- rebobinado, red y repeticiones ---------- */
  test('ROLES: la foto del rebobinado se lleva la mesa entera', function () {
    partidaRol(['mago'], 2, 5, DR.RIGHT);
    HB.pulsar(G, 0, 0);
    HB.pulsar(G, 0, 1);
    HB.hielo[2] = 77;
    var f = HB.foto();
    HB.empezar(true, 1, ['asesino']);
    HB.ponerFoto(f);
    eq(HB.rolDe(0), 'mago', 'el rol vuelve');
    ok(HB.portales[0] && HB.portales[0].e > 0, 'la entrada del portal vuelve');
    eq(HB.balas.length, 1, 'la bola en vuelo vuelve');
    eq(HB.hielo[2], 77, 'y el hielo');
  });

  test('ROLES: el anfitrión dispara hacia donde apuntó el invitado y reparte la mesa', function () {
    window.PM.settings.muted = true;
    G.newGame({ players: 2, hab: true, net: 'host', names: ['UNO', 'DOS'], roles: ['asesino', 'mago'] });
    G.state = 'PLAYING';
    ponPac(1, 12, 5, DR.LEFT);
    HB.peticion(G, 1, 0, { d: DR.RIGHT, c: 12, r: 5 });
    eq(HB.balas.length, 1, 'la bola del invitado la simula el anfitrión');
    eq(HB.balas[0].d, DR.RIGHT, 'hacia donde él apuntó, no hacia donde mira aquí');
    HB.peticion(G, 1, 2, { c: 12, r: 5 });
    ok(HB.runas[1] && HB.runas[1].c === 12, 'la runa, en la casilla que él dijo');
    var s = G.buildSnapshot(false);
    ok(s.hx && s.hx.bl.length === 1 && s.hx.ru[1], 'y todo viaja en la foto');
    HB.empezar(true, 2, ['asesino', 'mago']);
    HB.aplicarRoles(s.hx, 0);
    ok(HB.runas[1] && HB.balas.length === 1, 'y se reconstruye al otro lado');
  });

  test('ROLES: la repetición guarda los roles y se reproduce exacta', function () {
    var R = window.PM.Replay;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      var guion = [[5, 0, 'd', 1], [30, 0, 'h', 1], [40, 1, 'h', 0], [60, 0, 'h', 0],
                   [90, 1, 'd', 3], [120, 0, 'h', 2], [150, 1, 'h', 1], [200, 0, 'd', 3],
                   [260, 1, 'h', 2], [300, 0, 'h', 1], [340, 1, 'h', 3], [400, 0, 'h', 3],
                   [460, 0, 'd', 0], [520, 1, 'd', 1], [600, 0, 'd', 2]];
      var TOTAL = 900;
      function corre(conGuion) {
        G.state = 'PLAYING';
        G.readyTicks = 0;
        var k = 0;
        for (var i = 0; i < TOTAL; i++) {
          if (conGuion) {
            while (k < guion.length && guion[k][0] === i) {
              var q = guion[k];
              if (q[2] === 'h') HB.pulsar(G, q[1], q[3]);
              else G.setPacDir(q[1], q[3]);
              k++;
            }
          }
          G.step();
        }
      }
      G.newGame({ players: 2, hab: true, roles: ['mago', 'tanque'] });
      var rep = R.enCurso();
      ok(rep && rep.ajustes.roles, 'se graba con sus roles');
      corre(true);
      var pts = G.score, quedan = G.dotsLeft;
      if (!rep.final) {
        rep.final = { puntos: pts, nivel: G.level, fantasmas: G.runGhosts,
                      tiempoMs: Math.round(G.timeTicks * 1000 / 60) };
      }
      var leida = R.leer(R.serializar(rep));
      ok(leida, 'pasa por el texto y vuelve');
      eq(leida.ajustes.roles.join(), 'mago,tanque', 'con los roles intactos');
      ok(R.ver(leida), 'la repetición arranca');
      eq(G.roles.join(), 'mago,tanque', 'y arranca con esos roles');
      corre(false);
      eq(G.score, pts, 'LA PUNTUACIÓN NO CUADRA con roles');
      eq(G.dotsLeft, quedan, 'las pastillas no cuadran');
    } finally {
      window.PM.Replay.salir();
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  /* 18 sep: ya no es solo el Soporte. NINGÚN rol se repite. */
  test('ROLES: en la sala no se repite ninguno', function () {
    var P = window.PM.Party;
    var st = P.st;
    try {
      P.st = { code: 'ABCD', leader: true, status: 'dentro',
               members: [{ s: 'yo', n: 'A', r: 'soporte' }, { s: 'otro', n: 'B', r: 'mago' }] };
      eq(P.claimRol('yo', 'soporte'), 'soporte', 'el que lo tiene se lo queda');
      eq(P.claimRol('otro', 'mago'), 'mago', 'y cada uno con el suyo');
      ok(P.rolDeOtro('soporte', 'otro'), 'el Soporte lo lleva otro');
      ok(!P.rolDeOtro('mago', 'otro'), 'el Mago es suyo');
      /* pide uno cogido: se queda con el que ya tenía */
      eq(P.claimRol('otro', 'soporte'), 'mago', 'si el que pide está cogido, sigue con el suyo');
      /* y si tampoco tenía, el primero libre */
      P.st.members[1].r = 'soporte';
      eq(P.claimRol('otro', 'soporte'), 'asesino', 'y si no, el primero que quede libre');
      var ord = P.gameOrder();
      eq(ord[0].r + ',' + ord[1].r, 'soporte,asesino', 'al arrancar, tampoco se repiten');
      /* cuatro plazas, cuatro roles distintos */
      P.st.members = [{ s: 'a', r: 'mago' }, { s: 'b', r: 'mago' },
                      { s: 'c', r: 'mago' }, { s: 'd', r: 'mago' }];
      var r4 = P.gameOrder().map(function (o) { return o.r; });
      eq(r4.slice().sort().join(','), CFG.HAB.ROL_IDS.slice().sort().join(','),
         'los cuatro roles, uno por jugador');
    } finally {
      P.st = st;
    }
  });

  // ---------------------------------------------------------------
  // DESATADO: el REY FANTASMA (js/jefe.js)
  // ---------------------------------------------------------------
  var JF = window.PM.Jefe, CJ = CFG.JEFE;

  /* Una partida de DESATADO puesta en un nivel de jefe, con los Pac-Man a
   * salvo del arranque */
  function nivelJefe(roles, nivel, cargas) {
    partidaRol(roles || ['asesino'], 1, 1, DR.RIGHT);
    /* 22 sep 2026: con elección del CATÁLOGO, si se pide. Se reparte igual
     * que en Game.newGame —antes de montar el nivel— para que el jugador
     * llegue al jefe con las habilidades nuevas y no con el kit clásico. */
    if (cargas) HB.empezar(true, (roles || ['asesino']).length, roles || ['asesino'], cargas);
    G.level = nivel || CJ.CADA;
    G.resetLevel();
    G.state = 'PLAYING';
    for (var i = 0; i < G.pacs.length; i++) G.pacs[i].safeTicks = 0;
    return G.jefe;
  }

  /* El jefe quieto en una casilla (sin ataques en marcha) */
  function jefeEn(col, fila) {
    var j = G.jefe;
    j.x = col * CFG.TILE + CFG.TILE / 2;
    j.y = fila * CFG.TILE + CFG.TILE / 2;
    j.st = 'caza'; j.stT = 0; j.tCarga = 0; j.tInvoca = 0; j.inv = 0; j.frz = 0; j.plan = -1;
    return j;
  }

  /* 18 sep: los poderes del Tanque no le hacían nada al rey. */
  test('JEFE · PROVOCAR: acude, se gira y deja de matar al resto', function () {
    nivelJefe(['tanque', 'asesino']);
    var j = jefeEn(20, 5);
    ponPac(0, 6, 5, DR.RIGHT);
    var yo = G.pacs[1];
    ponPac(1, 20, 5, DR.LEFT);
    j.dir = DR.RIGHT;                 // dándole la espalda al Tanque
    ok(HB.pulsar(G, 0, 2), 'el Tanque grita');
    eq(j.dir, DR.LEFT, 'el rey se da la vuelta en el acto');
    var obj = JF.objetivo(G);
    eq(obj.x + ',' + obj.y, '6,5', 'y va a por el Tanque');
    yo.x = j.x; yo.y = j.y;
    ok(!JF.mata(G, 1), 'al compañero lo atraviesa sin matarlo');
    var tq = G.pacs[0];
    tq.x = j.x; tq.y = j.y;
    HB.estado(0).corPas = 0;          // aquí se mide el jefe, no la CORAZA
    ok(JF.mata(G, 0), 'al Tanque sí lo mata: para eso se ofrece');
    HB.estado(0).provoca = 0;
    ok(JF.mata(G, 1), 'acabado el grito, al compañero vuelven a matarlo');
  });

  test('JEFE · PISOTÓN: sale por patas y más lento', function () {
    nivelJefe(['tanque']);
    var j = jefeEn(8, 5);
    ponPac(0, 6, 5, DR.RIGHT);
    j.dir = DR.LEFT;                  // venía hacia el Tanque
    var normal = JF.velocidad(G);
    ok(HB.pulsar(G, 0, 0), 'el pisotón sale aunque no haya fantasmas fuera');
    eq(j.dir, DR.RIGHT, 'el que venía de frente se da la vuelta');
    ok(j.huye > 0, 'y sale huyendo');
    ok(JF.velocidad(G) < normal, 'más lento mientras huye');
    var obj = JF.objetivo(G);
    ok(obj.x > 8, 'apunta al lado contrario del Tanque');
    j.huye = 1;
    JF.paso(G);
    eq(j.huye, 0, 'y se le acaba');
  });

  test('JEFE · APISONADORA: le pega y lo deja aturdido 3 s', function () {
    nivelJefe(['tanque']);
    var j = jefeEn(6, 5);
    ponPac(0, 6, 5, DR.RIGHT);
    var hp = j.hp;
    HB.estado(0).arrolla = 60;        // en plena carrera
    j.frz = 0; j.inv = 0;
    JF.colisiones(G);
    eq(j.hp, hp - CJ.DANO.aplasta, 'le quita lo suyo');
    eq(j.frz, CJ.ATURDE_APISONADORA, 'y lo deja parado');
    eq(CJ.ATURDE_APISONADORA, 3 * 60, 'tres segundos');
    eq(JF.velocidad(G), 0, 'aturdido no se mueve');
  });

  test('JEFE · APISONADORA de un INVITADO: pide golpe tantas veces como pase',
    function () {
      /* EL FALLO QUE ARREGLA (20 sep): el invitado marcaba su golpe de
       * apisonadora en el mismo bit que el del azul, y ese bit solo se limpia
       * cuando empieza otro energizante. Resultado: en party, arrollar al rey
       * le pegaba UNA vez en toda la partida —y ninguna si antes le había
       * pegado de azul—. */
      nivelJefe(['tanque']);
      var j = jefeEn(6, 5);
      var me = ponPac(0, 6, 5, DR.RIGHT);
      HB.estado(0).arrolla = 60;
      j.frz = 0; j.inv = 0; j.pidoAplasta = 0;
      G.frightTicks = 0;

      var pedidos = [];
      var antes = G.netSend;
      G.netSend = function (k, e) { if (e && e.t === 'jefeGolpe') pedidos.push(e.f); };
      try {
        JF.colisionesInvitado(G, me);
        eq(pedidos.length, 1, 'pide el golpe al pasarle por encima');
        JF.colisionesInvitado(G, me);
        eq(pedidos.length, 1, 'y no lo repite en el tick siguiente');
        j.pidoAplasta = 0;                 // pasado el respiro
        JF.colisionesInvitado(G, me);
        eq(pedidos.length, 2, 'pero la SIGUIENTE pasada vuelve a pedirlo');
        eq(j.azulUsado, 0, 'sin gastar el bit del azul, que no es suyo');
      } finally { G.netSend = antes; }
    });

  test('JEFE · el anfitrión acepta cada golpe de apisonadora que le piden',
    function () {
      nivelJefe(['tanque']);
      var j = jefeEn(6, 5);
      ponPac(0, 6, 5, DR.RIGHT);
      HB.estado(0).arrolla = 60;
      var hp = j.hp;
      j.inv = 0; j.frz = 0;
      JF.peticionGolpe(G, 0, 'aplasta');
      eq(j.hp, hp - CJ.DANO.aplasta, 'le quita vida');
      eq(j.frz, CJ.ATURDE_APISONADORA, 'y lo aturde tres segundos');
      j.inv = 0;
      JF.peticionGolpe(G, 0, 'aplasta');
      eq(j.hp, hp - 2 * CJ.DANO.aplasta, 'y otra pasada, otro golpe');
    });

  test('JEFE: cada 5 niveles de DESATADO, y solo ahí', function () {
    partidaRol(['asesino']);
    G.level = 4; G.resetLevel();
    eq(G.jefe, null, 'el nivel 4 no tiene');
    G.level = 5; G.resetLevel();
    ok(JF.activo(G), 'el 5 sí');
    eq(G.jefe.max, CJ.VIDA, 'con la vida de uno');
    G.level = 10; G.resetLevel();
    eq(G.jefe.max, Math.round(CJ.VIDA * (1 + CJ.VIDA_POR_TANDA)), 'el segundo jefe, más duro');
    partida(1);
    G.level = 5; G.resetLevel();
    eq(G.jefe, null, 'fuera de DESATADO no hay jefe');
    partidaRol(['asesino', 'mago']);
    G.level = 5; G.resetLevel();
    eq(G.jefe.max, CJ.VIDA + CJ.VIDA_POR_JUGADOR, 'a dos, más vida');
  });

  test('JEFE: los cuatro fantasmas esperan en casa hasta que él los invoca', function () {
    nivelJefe();
    G.pacs[0].safeTicks = 999999;
    var fuera = function () { return G.ghosts.filter(function (g) { return g.mode !== 'house'; }).length; };
    eq(fuera(), 0, 'empiezan todos dentro');
    for (var i = 0; i < 200; i++) { G.houseDotEaten(); }
    G.failsafeTicks = 99999;
    ticks(5);
    eq(fuera(), 0, 'ni comer pastillas ni el socorro de la casa los sacan');
    G.jefe.tInvoca = CJ.INVOCA_CADA - 1;
    ticks(CJ.INVOCA_PARON + 3);
    eq(fuera(), 1, 'al invocar sale uno');
  });

  test('JEFE: tocarlo mata; azul, le pegas una vez por azul', function () {
    nivelJefe();
    var p = ponPac(0, 6, 5, DR.RIGHT);
    jefeEn(6, 5);
    G.step();
    ok(p.dying, 'tocarlo mata');

    nivelJefe();
    p = ponPac(0, 6, 5, DR.RIGHT);
    jefeEn(6, 5);
    G.triggerFright(6);
    var vida = G.jefe.hp;
    G.step();
    ok(!p.dying, 'azul no mata');
    eq(G.jefe.hp, vida - CJ.DANO.azul, 'y le quita ' + CJ.DANO.azul);
    G.jefe.inv = 0;
    ticks(5);
    eq(G.jefe.hp, vida - CJ.DANO.azul, 'una sola vez por azul');
  });

  test('JEFE: mordisco, bola de fuego y hielo', function () {
    nivelJefe(['asesino']);
    ponPac(0, 6, 5, DR.RIGHT);
    jefeEn(7, 5);
    G.jefe.frz = 999;
    var vida = G.jefe.hp;
    ok(HB.pulsar(G, 0, 0), 'la Q muerde al jefe');
    eq(G.jefe.hp, vida - CJ.DANO.mordisco, 'y le quita ' + CJ.DANO.mordisco);
    ok(!HB.lista(0, 0), 'gastando la recarga');

    /* y lo ATURDE 2 s: sin eso, morderlo costaba siempre una vida (18 sep) */
    nivelJefe(['asesino']);
    var pm = ponPac(0, 6, 5, DR.RIGHT);
    jefeEn(7, 5);
    G.jefe.frz = 0;
    ok(HB.pulsar(G, 0, 0), 'muerde con el jefe suelto');
    ok(G.jefe.frz >= CJ.ATURDE_MORDISCO, 'lo deja aturdido ' + (CJ.ATURDE_MORDISCO / 60) + ' s');
    ticks(10);
    ok(!pm.dying, 'y aturdido no mata al tocarlo');

    nivelJefe(['mago']);
    ponPac(0, 2, 5, DR.RIGHT);
    jefeEn(9, 5);
    G.jefe.frz = 999;
    vida = G.jefe.hp;
    ok(HB.pulsar(G, 0, 0), 'la bola sale');
    for (var i = 0; i < 30 && G.jefe.hp === vida; i++) { G.jefe.x = 9 * CFG.TILE + 4; G.jefe.y = 5 * CFG.TILE + 4; G.step(); }
    eq(G.jefe.hp, vida - CJ.DANO.fuego, 'la bola le quita ' + CJ.DANO.fuego);

    nivelJefe(['soporte']);
    ponPac(0, 2, 5, DR.RIGHT);
    jefeEn(9, 5);
    G.jefe.frz = 0;
    vida = G.jefe.hp;
    HB.pulsar(G, 0, 0);
    for (i = 0; i < 30 && !(G.jefe.frz > 0); i++) { G.jefe.x = 9 * CFG.TILE + 4; G.jefe.y = 5 * CFG.TILE + 4; G.jefe.inv = 0; G.step(); }
    ok(G.jefe.frz > 0, 'el hielo lo congela');
    eq(G.jefe.hp, vida, 'sin quitarle vida');
  });

  /* 22 sep 2026: EL CATÁLOGO NO LE HACÍA NADA. Quien eligiera una habilidad
   * nueva llegaba al nivel del jefe sin forma de tumbarlo, y ese nivel no se
   * acaba hasta que cae. Un poder de daño por rol y los aturdimientos. */
  test('JEFE · CATÁLOGO: un poder de daño de cada rol le quita vida', function () {
    var i, n, t;

    /* ASESINO — EJECUCIÓN: el bocado más gordo de la tabla, pero NO lo mata
     * de golpe (a un fantasma sí): su barra es el nivel entero. */
    nivelJefe(['asesino'], null, ['mordisco,turbo,flash,ejecucion']);
    ponPac(0, 6, 5, DR.RIGHT);
    jefeEn(7, 5);
    G.jefe.frz = 999;
    var vida = G.jefe.hp;
    ok(HB.pulsar(G, 0, 3), 'la R ejecuta al rey aunque no haya fantasmas fuera');
    eq(G.jefe.hp, vida - CJ.DANO.ejecucion, 'le quita ' + CJ.DANO.ejecucion);
    ok(G.jefe.vivo, 'pero no lo mata de un golpe');
    ok(CJ.DANO.ejecucion > CJ.DANO.aplasta, 'y pega más que cualquier otra');

    /* ASESINO — SHURIKEN: las TRES cargas entran seguidas. Van forzadas a
     * propósito (como la runa): si respetaran el respiro entre golpes, la
     * segunda y la tercera se perderían y la Q valdría un tercio. */
    nivelJefe(['asesino'], null, ['shuriken,turbo,flash,grito']);
    ponPac(0, 2, CFG.TUNNEL_ROW, DR.RIGHT);
    jefeEn(6, CFG.TUNNEL_ROW);
    G.jefe.frz = 999;
    vida = G.jefe.hp;
    for (n = 0; n < 3; n++) {
      ok(HB.lanzar(G, 0, 0), 'sale la carga ' + (n + 1));
      for (t = 0; t < 60 && HB.proyectilesCat.length; t++) HB.pasoProyectilesCat(G, true);
    }
    eq(G.jefe.hp, vida - 3 * CJ.DANO.shuriken, 'las tres se le clavan');

    /* TANQUE — TERREMOTO: a los fantasmas los manda a casa; el rey no tiene
     * casa a la que volver, así que se lleva el golpe. */
    nivelJefe(['tanque'], null, ['pisoton,escudo,provocar,terremoto']);
    ponPac(0, 6, 5, DR.RIGHT);
    jefeEn(20, 5);
    vida = G.jefe.hp;
    ok(HB.pulsar(G, 0, 3), 'el terremoto sacude todo el mapa');
    eq(G.jefe.hp, vida - CJ.DANO.terremoto, 'le quita ' + CJ.DANO.terremoto);

    /* TANQUE — REBOTE: el primer contacto se devuelve. Contra el rey le
     * quita vida, lo para un segundo y SALVA al Tanque (sin ese segundo,
     * rebotaba y moría en el tick siguiente). */
    nivelJefe(['tanque'], null, ['rebote,escudo,provocar,arrollar']);
    var tq = ponPac(0, 6, 5, DR.RIGHT);
    jefeEn(6, 5);
    HB.estado(0).corPas = 0;          // aquí se mide el rebote, no la CORAZA
    vida = G.jefe.hp;
    ok(HB.pulsar(G, 0, 0), 'el Tanque se pone el rebote');
    JF.colisiones(G);
    eq(G.jefe.hp, vida - CJ.DANO.rebote, 'el choque le quita ' + CJ.DANO.rebote);
    eq(G.jefe.frz, CJ.ATURDE.rebote, 'y lo deja parado un segundo');
    ok(!tq.dying, 'el Tanque sale vivo del rebote');
    eq(HB.estado(0).rebote, 0, 'se gasta en el primer contacto');

    /* SOPORTE — MINA: la pisa el rey y le quita vida, como la runa del Mago */
    nivelJefe(['soporte'], null, ['mina,inmunidad,aliado,vida']);
    ponPac(0, 6, 5, DR.RIGHT);
    jefeEn(6, 5);
    vida = G.jefe.hp;
    ok(HB.pulsar(G, 0, 0), 'planta la mina');
    G.jefe.inv = 0;
    JF.pisaRuna(G);
    eq(G.jefe.hp, vida - CJ.DANO.mina, 'le quita ' + CJ.DANO.mina);
    eq(HB.estado(0).mina, null, 'y la mina se gasta');
    ok(HB.estado(0).escudo > 0, 'con su escudo para el Soporte, como siempre');

    /* MAGO — BOLA GUIADA: sin fantasmas fuera ni siquiera salía */
    nivelJefe(['mago'], null, ['bola_guiada,portal,runa,tormenta']);
    ponPac(0, 2, 5, DR.RIGHT);
    jefeEn(9, 5);
    G.jefe.frz = 999;
    vida = G.jefe.hp;
    ok(HB.pulsar(G, 0, 0), 'la bola sale a por el rey');
    for (i = 0; i < 90 && G.jefe.hp === vida; i++) {
      G.jefe.x = 9 * CFG.TILE + 4; G.jefe.y = 5 * CFG.TILE + 4; G.step();
    }
    eq(G.jefe.hp, vida - CJ.DANO.guiada, 'le quita ' + CJ.DANO.guiada);
  });

  test('JEFE · CATÁLOGO: los aturdimientos lo apagan menos que a un fantasma', function () {
    /* TANQUE — EMPUJÓN: al rey no se le empuja (pesa lo que pesa), se le
     * apaga. Medio segundo: un tercio de lo que dura en un fantasma. */
    nivelJefe(['tanque'], null, ['empujon,escudo,grito_guerra,arrollar']);
    ponPac(0, 6, 5, DR.RIGHT);
    var j = jefeEn(8, 5);
    var vida = j.hp, donde = j.x;
    ok(HB.pulsar(G, 0, 0), 'el empujón alcanza al rey');
    eq(j.frz, CJ.ATURDE.empujon, 'lo apaga ' + CJ.ATURDE.empujon + ' ticks');
    ok(CJ.ATURDE.empujon < HC.EMPUJON_STUN, 'menos que a un fantasma');
    eq(j.hp, vida, 'sin quitarle vida: es un empujón');
    eq(j.x, donde, 'y no se mueve del sitio');
    eq(JF.velocidad(G), 0, 'apagado no se mueve');

    /* TANQUE — GRITO DE GUERRA: llega a todo el mapa, sin apuntar */
    nivelJefe(['tanque'], null, ['empujon,escudo,grito_guerra,arrollar']);
    ponPac(0, 6, 5, DR.RIGHT);
    j = jefeEn(24, 20);
    ok(HB.pulsar(G, 0, 2), 'el grito sale');
    eq(j.frz, CJ.ATURDE.grito_guerra, 'clava al rey esté donde esté');
    ok(CJ.ATURDE.grito_guerra < HC.GRITO_GUERRA_TICKS, 'menos que a un fantasma');

    /* MAGO — CHISPA: sale aunque el rey sea el único blanco */
    nivelJefe(['mago'], null, ['chispa,portal,runa,tormenta']);
    ponPac(0, 6, 5, DR.RIGHT);
    j = jefeEn(7, 5);
    ok(HB.pulsar(G, 0, 0), 'la chispa salta al rey');
    eq(j.frz, CJ.ATURDE.chispa, 'lo apaga un segundo');
    ok(CJ.ATURDE.chispa < HC.CHISPA_TICKS, 'menos que a un fantasma');
  });

  test('JEFE: el nivel no se acaba sin él; tumbarlo lo acaba y da el premio', function () {
    nivelJefe();
    G.pacs[0].safeTicks = 999999;
    G.dotsLeft = 0;
    ticks(3);
    eq(G.state, 'PLAYING', 'sin pastillas pero con jefe, se sigue');
    var antes = G.score;
    G.jefe.hp = 1;
    JF.danar(G, 5, 0, 'prueba', true);
    ok(!JF.activo(G), 'tumbado');
    eq(G.score - antes, HB.puntosDe(G, 0, CJ.PREMIO),
      'con su premio, y con la pasiva del Asesino si es quien lo remata');
    G.step();
    eq(G.state, 'LEVEL_DONE', 'y el nivel se acaba');
  });

  test('JEFE: embestida con aviso, y furia a media vida', function () {
    nivelJefe();
    G.pacs[0].safeTicks = 999999;
    ponPac(0, 1, 5, DR.LEFT);
    jefeEn(6, 5);
    G.jefe.tCarga = CJ.CARGA_CADA - 1;
    G.jefe.tInvoca = -99999;
    G.step();
    eq(G.jefe.st, 'aviso', 'primero avisa');
    ticks(CJ.AVISO + 1);
    eq(G.jefe.st, 'carga', 'y luego embiste');
    eq(G.jefe.dir, DR.LEFT, 'hacia su presa');
    ok(!JF.furia(G), 'con toda la vida, sin furia');
    G.jefe.hp = Math.floor(G.jefe.max / 2);
    ok(JF.furia(G), 'a media vida, furia');
  });

  test('JEFE: viaja en la foto de red y en la del rebobinado', function () {
    nivelJefe();
    jefeEn(6, 5);
    G.jefe.hp = 7;
    var r = JF.resumen(G);
    var copia = G.jefe;
    G.jefe = null;
    JF.aplicar(G, r);
    eq(G.jefe.hp, 7, 'la vida llega');
    eq(Math.round(G.jefe.x), Math.round(copia.x), 'y la posición');
    var f = G.foto();
    G.jefe.hp = 1;
    G.ponerFoto(f);
    eq(G.jefe.hp, 7, 'el rebobinado lo devuelve como estaba');
  });

  test('JEFE: una partida con jefe se reproduce exacta', function () {
    var R = window.PM.Replay;
    var previo = null;
    try { previo = localStorage.getItem(CFG.REPLAY_KEY); } catch (e) { /* sin almacén */ }
    try {
      window.PM.settings.muted = true;
      var guion = [[5, 'd', 1], [80, 'h', 1], [150, 'd', 0], [260, 'h', 0], [400, 'd', 3],
                   [520, 'h', 3], [700, 'd', 2], [900, 'h', 0], [1100, 'd', 1]];
      var TOTAL = 1400;
      function corre(conGuion) {
        var k = 0;
        for (var i = 0; i < TOTAL; i++) {
          if (conGuion) {
            while (k < guion.length && guion[k][0] === i) {
              if (guion[k][1] === 'h') HB.pulsar(G, 0, guion[k][2]);
              else G.setPacDir(0, guion[k][2]);
              k++;
            }
          }
          G.step();
        }
      }
      G.newGame({ players: 1, hab: true, roles: ['asesino'] });
      G.level = 5; G.resetLevel();
      G.state = 'PLAYING'; G.readyTicks = 0;
      var rep = R.enCurso();
      ok(rep, 'se graba');
      rep.nivel = 5;
      corre(true);
      ok(G.jefe, 'con jefe');
      var pts = G.score, vidaJefe = G.jefe.hp, jx = Math.round(G.jefe.x), jy = Math.round(G.jefe.y), vidas = G.lives;
      if (!rep.final) {
        rep.final = { puntos: pts, nivel: G.level, fantasmas: G.runGhosts,
                      tiempoMs: Math.round(G.timeTicks * 1000 / 60) };
      }
      var leida = R.leer(R.serializar(rep));
      ok(leida, 'pasa por el texto y vuelve');
      ok(R.ver(leida), 'arranca');
      G.state = 'PLAYING'; G.readyTicks = 0;
      corre(false);
      eq(G.score, pts, 'los puntos cuadran');
      eq(G.lives, vidas, 'las vidas cuadran');
      eq(G.jefe && G.jefe.hp, vidaJefe, 'la vida del jefe cuadra');
      eq(G.jefe && (Math.round(G.jefe.x) + ',' + Math.round(G.jefe.y)), jx + ',' + jy, 'y acaba donde acabó');
    } finally {
      window.PM.Replay.salir();
      try {
        if (previo === null) localStorage.removeItem(CFG.REPLAY_KEY);
        else localStorage.setItem(CFG.REPLAY_KEY, previo);
      } catch (e) { /* sin almacén */ }
    }
  });

  // ---------------------------------------------------------------
  // SUPERVIVENCIA (js/supervivencia.js)
  // ---------------------------------------------------------------
  var SV = window.PM.Superv, CS = CFG.SUPERV;

  function supervivencia(n) {
    window.PM.settings.muted = true;
    G.newGame({ players: n || 2, superv: true });
    G.state = 'PLAYING';
    G.readyTicks = 0;
    for (var i = 0; i < G.pacs.length; i++) G.pacs[i].safeTicks = 0;
    for (var g = 0; g < 4; g++) {
      G.ghosts[g].mode = 'house';
      G.ghosts[g].x = CFG.HOUSE.exitX;
      G.ghosts[g].y = CFG.HOUSE.centerY;
    }
    return G.superv;
  }

  test('SUPERVIVENCIA: una vida cada uno, sin continuar ni récords', function () {
    var s = supervivencia(3);
    ok(s, 'la partida es de supervivencia');
    eq(G.livesMode, 'individual', 'vidas de cada uno');
    eq(G.pacs.map(function (p) { return p.lives; }).join(), '1,1,1', 'una vida');
    ok(!G.puedeContinuar(), 'sin continuar');
    ok(!G.puedeRevivir(), 'ni revivir');
    partida(1);
    G.newGame({ players: 1, superv: true });
    eq(G.superv, null, 'a uno no hay supervivencia');
  });

  test('SUPERVIVENCIA: la superpastilla da poder para eliminar a otro Pac-Man', function () {
    supervivencia(2);
    var a = ponPac(0, 6, 5, DR.RIGHT), b = ponPac(1, 6, 5, DR.LEFT);
    G.step();
    ok(!a.dying && !b.dying, 'sin poder, se cruzan sin pasar nada');
    ponPac(1, 20, 5, DR.LEFT);
    G.pellets[5][6] = 'o';
    G.eatAt(6, 5, a);
    eq(G.superv.poder[0], CS.PODER, 'quien se la come tiene poder');
    ponPac(1, 6, 5, DR.LEFT);
    G.step();
    ok(b.dying, 'y al tocar al otro, lo elimina');
    eq(G.superv.bajas[0], 1, 'apuntándose la baja');
    ok(G.superv.vuelven.length === 1, 'la superpastilla volverá');
  });

  test('SUPERVIVENCIA: gana el último en pie', function () {
    supervivencia(2);
    G.pacs[0].safeTicks = 999999;
    G.startDeath(1, -1);
    for (var i = 0; i < 400 && G.state === 'PLAYING'; i++) G.step();
    eq(G.state, 'GAME_OVER', 'se acaba');
    eq(G.superv.ganador, 0, 'y gana el que queda');
    eq(SV.clasificacion(G).join(), '0,1', 'primero el ganador');
  });

  test('SUPERVIVENCIA: la zona se cierra y quien se queda dentro cae', function () {
    supervivencia(2);
    G.pacs[1].safeTicks = 999999;
    ponPac(1, 13, 14);
    G.superv.t = CS.ZONA_INICIO - 1;
    G.step();
    eq(G.superv.anillo, 1, 'a su hora se cierra el primer anillo');
    ok(SV.enZona(G, 0, 14) && !SV.enZona(G, 1, 1), 'solo el de fuera');
    G.superv.anillo = 3;
    var p = ponPac(0, 1, 5, DR.LEFT);
    for (var i = 0; i < CS.ZONA_GRACIA - 2; i++) { ponPac(0, 1, 5); G.step(); }
    ok(!p.dying, 'dentro, un par de segundos de margen');
    for (i = 0; i < 4 && !p.dying; i++) { ponPac(0, 1, 5); G.step(); }
    ok(p.dying, 'y después cae');
  });

  test('SUPERVIVENCIA: las pastillas no se acaban y todo viaja en la foto', function () {
    supervivencia(2);
    G.pacs[0].safeTicks = G.pacs[1].safeTicks = 999999;
    G.dotsLeft = 0;
    G.step();
    eq(G.state, 'PLAYING', 'sin pastillas no se pasa de nivel');
    ok(G.dotsLeft > 0, 'vuelven a salir');
    G.superv.anillo = 2; G.superv.poder[1] = 77; G.superv.bajas[0] = 3;
    var r = SV.resumen(G);
    G.superv = null;
    SV.aplicar(G, r);
    eq(G.superv.anillo + ',' + G.superv.poder[1] + ',' + G.superv.bajas[0], '2,77,3', 'la foto lo devuelve');
  });

  // ---------------------------------------------------------------
  // Catálogo DESATADO
  // ---------------------------------------------------------------
  test('CATÁLOGO: las opciones descartadas no vuelven y las nuevas ocupan su ranura', function () {
    var C = CFG.HAB.CATALOGO;
    ok(!JSON.stringify(C).match(/intercambio|destierro|ancla|estaca|bastion|niebla/i), 'no hay habilidades descartadas');
    eq(C.soporte[0].filter(function (h) { return h.id === 'telarana'; }).length, 1, 'telaraña es Q');
    eq(C.soporte[1].filter(function (h) { return h.id === 'puente'; }).length, 1, 'puente es W');
    eq(C.soporte[2].filter(function (h) { return h.id === 'relevo'; }).length, 1, 'relevo es E');
    eq(C.tanque[1].filter(function (h) { return h.id === 'yunque'; }).length, 1, 'yunque es W');
    eq(C.tanque[0].filter(function (h) { return h.id === 'rebote'; }).length, 1, 'rebote es Q');
    eq(C.mago[0].filter(function (h) { return h.id === 'chispa'; }).length, 1, 'chispa es Q');
    eq(C.asesino[3].filter(function (h) { return h.id === 'ejecucion'; }).length, 1, 'ejecución es R');
  });

  test('CATÁLOGO: el loadout conserva una elección válida por cada tecla', function () {
    var H = window.PM.Hab, carga = H.normalizarCarga('soporte', 'telarana,puente,relevo,hospital');
    eq(carga.map(function (h) { return h.id; }).join(','), 'telarana,puente,relevo,hospital', 'loadout completo');
    eq(H.normalizarCarga('tanque', 'ancla,estaca,provocar,bastion').map(function (h) { return h.id; }).join(','), 'pisoton,escudo,provocar,arrollar', 'fallback antiguo por rol');
  });

  test('CATÁLOGO: Relevo teletransporta al compañero cercano sin intercambiarlo', function () {
    var H = window.PM.Hab;
    partida(2);
    G.hab = true; H.empezar(true, 2, ['soporte', 'asesino'], ['mordisco,turbo,relevo,vida', 'mordisco,turbo,flash,grito']);
    G.roles = ['soporte', 'asesino'];
    G.pacs[0].x = 10 * CFG.TILE + 4; G.pacs[0].y = 5 * CFG.TILE + 4;
    G.pacs[1].x = 12 * CFG.TILE + 4; G.pacs[1].y = 5 * CFG.TILE + 4;
    var antes = G.pacs[0].x;
    ok(H.relevo(G, 0), 'sale relevo');
    eq(G.pacs[1].x, G.pacs[0].x, 'el compañero llega a la posición del soporte');
    eq(G.pacs[0].x, antes, 'el soporte no se mueve');
  });

  test('CATÁLOGO: Chispa aturde 3 s y Terremoto manda a los cuatro a casa', function () {
    var H = window.PM.Hab;
    partida(1);
    G.hab = true; H.empezar(true, 1, ['mago'], ['fuego,portal,runa,chispa']); G.roles = ['mago'];
    G.pacs[0].x = 13 * CFG.TILE + 4; G.pacs[0].y = 20 * CFG.TILE + 4;
    G.ghosts[0].mode = 'normal'; G.ghosts[0].x = G.pacs[0].x + CFG.TILE; G.ghosts[0].y = G.pacs[0].y;
    ok(H.chispa(G, 0), 'sale chispa'); eq(H.aturdido[0], 180, 'aturdimiento de 3 segundos');
    G.roles[0] = 'tanque'; H.empezar(true, 1, ['tanque'], ['pisoton,escudo,provocar,terremoto']); G.roles = ['tanque'];
    G.ghosts[0].mode = 'normal'; G.ghosts[0].x = G.pacs[0].x + CFG.TILE; G.ghosts[0].y = G.pacs[0].y;
    ok(H.terremoto(G, 0), 'sale terremoto'); eq(H.terremotoTicks, CFG.HAB.TERREMOTO_TICKS, 'dura seis segundos');
    eq(H.multVel(0), 1, 'y ya no frena al equipo: mata y sacude, como la Tormenta');
  });

  test('CATÁLOGO: Bola Guiada no falla y puntúa exactamente 150', function () {
    var H = window.PM.Hab;
    partida(1);
    G.hab = true; H.empezar(true, 1, ['mago'], ['bola_guiada,portal,runa,tormenta']); G.roles = ['mago'];
    G.pacs[0].x = 13 * CFG.TILE + 4; G.pacs[0].y = 20 * CFG.TILE + 4;
    G.ghosts[0].mode = 'normal'; G.ghosts[0].x = G.pacs[0].x + CFG.TILE; G.ghosts[0].y = G.pacs[0].y;
    var base = G.score;
    ok(H.bolaGuiada(G, 0), 'sale aunque el blanco no esté perfectamente alineado');
    ok(H.proyectilesCat.some(function (b) { return b.tipo === 'guiada'; }), 'la bola se ve viajar');
    for (var i = 0; i < 60 && H.proyectilesCat.length; i++) H.pasoProyectilesCat(G, true);
    eq(G.score - base, 150, 'premio fijo');
  });

  test('CATÁLOGO: Shuriken usa tres pulsaciones y solo perdona la recarga con pleno', function () {
    var H = window.PM.Hab;
    partida(1);
    G.hab = true; H.empezar(true, 1, ['asesino'], ['shuriken,turbo,flash,grito']); G.roles = ['asesino'];
    var p = G.pacs[0]; p.x = 8 * CFG.TILE + 4; p.y = CFG.TUNNEL_ROW * CFG.TILE + 4; p.nextDir = CFG.DIR.RIGHT;
    for (var n = 0; n < 3; n++) {
      var g = G.ghosts[n]; g.mode = 'normal'; g.frightened = false; g.x = p.x + CFG.TILE; g.y = p.y;
    }
    var base = G.score;
    for (n = 0; n < 3; n++) {
      ok(H.lanzar(G, 0, 0), 'sale la carga ' + (n + 1));
      eq(H.proyectilesCat.filter(function (b) { return b.tipo === 'shuriken'; }).length, 1, 'solo sale uno');
      for (var t = 0; t < 60 && H.proyectilesCat.length; t++) H.pasoProyectilesCat(G, true);
    }
    eq(G.score - base, 600, 'los tres impactos cobran 200');
    eq(H.st[0].cd[0], 0, 'pleno sin recarga');

    H.empezar(true, 1, ['asesino'], ['shuriken,turbo,flash,grito']); G.roles = ['asesino'];
    for (n = 0; n < 3; n++) { ok(H.lanzar(G, 0, 0), 'sale intento ' + (n + 1)); for (t = 0; t < 100 && H.proyectilesCat.length; t++) H.pasoProyectilesCat(G, true); }
    eq(H.st[0].cd[0], 20 * 60, 'un fallo conserva los 20 segundos');
  });

  test('CATÁLOGO: la ráfaga de Shuriken caduca a los tres segundos', function () {
    var H = window.PM.Hab, V = CFG.HAB.SHURIKEN_VENTANA;
    partida(1);
    G.hab = true; H.empezar(true, 1, ['asesino'], ['shuriken,turbo,flash,grito']); G.roles = ['asesino'];
    var p = G.pacs[0]; p.x = 8 * CFG.TILE + 4; p.y = CFG.TUNNEL_ROW * CFG.TILE + 4; p.nextDir = CFG.DIR.RIGHT;
    for (var n = 0; n < 4; n++) G.ghosts[n].mode = 'house';
    ok(H.lanzar(G, 0, 0), 'sale la primera carga');
    eq(H.st[0].cd[0], 0, 'la primera no manda a recargar');
    for (var t = 0; t < V - 1; t++) H.pasoRoles(G, true);
    ok(H.st[0].shuriken, 'antes de los tres segundos la ráfaga sigue viva');
    ok(H.lanzar(G, 0, 0), 'la segunda entra dentro de la ventana');
    eq(H.st[0].shuriken.usados, 2, 'y cuenta como segunda carga');
    for (t = 0; t < V; t++) H.pasoRoles(G, true);
    eq(H.st[0].shuriken, null, 'la tercera no llegó: la ráfaga se cierra');
    eq(H.st[0].cd[0], 20 * 60, 'y la Q se va a recargar entera');

    /* Morir a media ráfaga tampoco devuelve las cargas */
    H.empezar(true, 1, ['asesino'], ['shuriken,turbo,flash,grito']); G.roles = ['asesino'];
    ok(H.lanzar(G, 0, 0), 'sale una carga antes de morir');
    eq(H.st[0].cd[0], 0, 'todavía sin recarga');
    G.startPacDeath(0);
    eq(H.st[0].shuriken, null, 'la ráfaga muere con él');
    eq(H.st[0].cd[0], 20 * 60, 'y resucita con la Q recargando, no con las tres');
  });

  test('CATÁLOGO: Sombra, Frenesí, Gancho y Cacería respetan sus nuevas reglas', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['asesino'], ['mordisco,sombra,gancho_inverso,caceria']); G.roles = ['asesino'];
    var p = G.pacs[0]; p.x = 8 * CFG.TILE + 4; p.y = CFG.TUNNEL_ROW * CFG.TILE + 4; p.nextDir = CFG.DIR.RIGHT;
    H.sombra(G, 0); eq(H.multVel(0), 1.2, 'Sombra da ×1,2');
    var g = G.ghosts[0]; g.mode = 'normal'; g.x = p.x + CFG.TILE; g.y = p.y; g.dir = CFG.DIR.RIGHT;
    var base = G.score; H.matarCatalogo(G, g, 0, CFG.HAB.BOMBA_PUNTOS, 'bomba', 1, true);
    eq(G.score - base, 750, 'una baja cualquiera desde atrás da 750');

    H.frenesi(G, 0); eq(H.st[0].frenesi, 10 * 60, 'Frenesí dura 10 segundos');
    for (var n = 0; n < 5; n++) H.alMatar(G, 0, null, p.x, p.y);
    ok(H.st[0].frenesiMult > 1.6, 'Frenesí no tiene tope');

    for (n = 0; n < 4; n++) G.ghosts[n].mode = 'house';
    ok(H.ganchoInverso(G, 0), 'el gancho sale sin blanco');
    eq(H.proyectilesCat.filter(function (b) { return b.tipo === 'gancho_inverso'; })[0].max,
      9 * CFG.TILE, 'el gancho llega a nueve casillas');
    var volvio = false;
    for (n = 0; n < 100 && H.proyectilesCat.length; n++) { H.pasoProyectilesCat(G, true); if (H.proyectilesCat.some(function (b) { return b.fase === 'vuelve'; })) volvio = true; }
    ok(volvio && !H.proyectilesCat.length, 'falla y vuelve');

    g.mode = 'normal'; g.x = p.x; g.y = p.y;
    H.caceria(G, 0); H.st[0].sombra = 1; H.st[0].frenesi = 1; H.st[0].frenesiMult = 1.15;
    ok(Math.abs(H.multVel(0) - 1.2 * 1.2 * 1.15) < 0.0001, 'los multiplicadores se acumulan');
    H.alMatar(G, 0, g, g.x, g.y); g.mode = 'normal';
    eq(H.caceriaQuien[g.id], -1, 'la marca no vuelve al revivir');
    eq(CFG.HAB.CATALOGO.asesino[3].filter(function (x) { return x.id === 'caceria'; })[0].cd, 90 * 60, 'recarga de 90 segundos');
  });

  test('CATÁLOGO: Bomba da 150 exactos y Cacería solo deja comer al Asesino dueño', function () {
    var H = window.PM.Hab;
    partida(2);
    G.hab = true;
    H.empezar(true, 2, ['asesino', 'asesino'],
      ['bomba,turbo,flash,caceria', 'mordisco,turbo,flash,grito']);
    G.roles = ['asesino', 'asesino'];
    var p = G.pacs[0], g = G.ghosts[0];
    g.mode = 'normal'; g.x = p.x + CFG.TILE; g.y = p.y;
    var base = G.score;
    ok(H.bomba(G, 0), 'la primera pulsación planta');
    ok(H.bomba(G, 0), 'la segunda detona');
    eq(G.score - base, 150, 'sin bono oculto del Asesino');
    g.mode = 'normal'; g.x = p.x + CFG.TILE; g.y = p.y;
    ok(H.caceria(G, 0), 'sale Cacería');
    ok(H.puedeComer(G, 0, 0), 'el dueño puede comer al marcado');
    ok(!H.puedeComer(G, 0, 1), 'su compañero no puede');
  });

  test('CATÁLOGO: Misil recorre los cuatro blancos y conserva la racha del Asesino', function () {
    var H = window.PM.Hab;
    partida(1);
    G.hab = true; H.empezar(true, 1, ['asesino'], ['mordisco,turbo,flash,misil']); G.roles = ['asesino'];
    var p = G.pacs[0];
    for (var j = 0; j < 4; j++) {
      G.ghosts[j].mode = 'normal'; G.ghosts[j].x = p.x + CFG.TILE; G.ghosts[j].y = p.y;
    }
    var base = G.score;
    ok(Math.abs(CFG.HAB.MISIL_VEL - 2 * CFG.BASE_SPEED) < 1e-9, 'el misil vuela a ×2');
    ok(H.misil(G, 0), 'sale el misil');
    for (var i = 0; i < 240 && H.proyectilesCat.length; i++) H.pasoProyectilesCat(G, true);
    eq(G.score - base, 3750, '250 + 500 + 1.000 + 2.000');
    eq(G.ghosts.filter(function (g) { return g.mode === 'eyes'; }).length, 4, 'mata a los cuatro');
  });

  test('CATÁLOGO: Meteoro fija el aviso en la dirección de la última flecha', function () {
    var H = window.PM.Hab;
    partida(1);
    G.hab = true; H.empezar(true, 1, ['mago'], ['fuego,portal,runa,meteoro']); G.roles = ['mago'];
    G.pacs[0].x = 13 * CFG.TILE + 4; G.pacs[0].y = 20 * CFG.TILE + 4;
    var sale = false;
    for (var d = 0; d < 4; d++) {
      G.pacs[0].nextDir = d;
      if (H.casillaAdelante(G, 0, 6, d)) { sale = H.meteoro(G, 0); break; }
    }
    ok(sale, 'señala el meteoro');
    ok(H.st[0].meteoro, 'hay una casilla objetivo válida');
    eq(H.st[0].meteoro.t, CFG.HAB.METEORO_AVISO, 'aviso antes de explotar');
  });

  // ---------------------------------------------------------------
  // AJUSTES DEL CATÁLOGO (21 sep): lo que salió roto al jugarlo
  // ---------------------------------------------------------------

  /* Un tramo recto de `largo` casillas abiertas, esté donde esté: así estas
   * pruebas no dependen de coordenadas a mano de un laberinto concreto. */
  function tramoRecto(largo) {
    for (var r = 1; r < CFG.ROWS - 1; r++) {
      var seguidas = 0;
      for (var c = 1; c < CFG.COLS - 1; c++) {
        seguidas = CFG.isOpen(c, r, false) ? seguidas + 1 : 0;
        if (seguidas >= largo) return { c: c - largo + 1, r: r };
      }
    }
    return null;
  }

  test('AJUSTES: Fortaleza dura sus 6 s y se apaga', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['tanque'], ['pisoton,escudo,provocar,fortaleza']); G.roles = ['tanque'];
    ponPac(0, 13, 20, DR.RIGHT);
    ok(H.fortaleza(G, 0), 'sale fortaleza');
    eq(H.st[0].fortaleza, CFG.HAB.FORTALEZA_TICKS, 'seis segundos de aura');
    for (var i = 0; i < CFG.HAB.FORTALEZA_TICKS; i++) H.pasoRoles(G, true);
    eq(H.st[0].fortaleza, 0, 'y se apaga sola (antes no bajaba nunca)');
    ok(!H.activa(G, 0, 3), 'la tecla deja de verse encendida');
  });

  test('AJUSTES: un fantasma aturdido está apagado, no solo quieto', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['mago'], ['chispa,portal,runa,tormenta']); G.roles = ['mago'];
    var p = ponPac(0, 13, 20, DR.RIGHT), g = G.ghosts[0];
    for (var n = 1; n < 4; n++) G.ghosts[n].mode = 'house';
    g.mode = 'normal'; g.frightened = false; g.x = p.x + CFG.TILE; g.y = p.y;
    ok(H.chispa(G, 0), 'sale chispa');
    ok(H.aturdido[g.id] > 0, 'lo deja aturdido');
    ok(H.apagado(g.id), 'y apagado: el choque no cuenta');
    eq(H.multVelFantasma(G, g.id), 0, 'tampoco se mueve');
    g.x = p.x; g.y = p.y; p.safeTicks = 0;
    ticks(3);
    ok(!p.dying, 'pasar por encima de un aturdido no mata');
    H.aturdido[g.id] = 0; g.x = p.x; g.y = p.y;
    ticks(3);
    ok(p.dying, 'pero en cuanto despierta, sí');
  });

  test('AJUSTES: el Puente abre un paso por el muro, no todas las paredes', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['soporte'], ['hielo,puente,relevo,vida']); G.roles = ['soporte'];
    /* una casilla con muro delante y pasillo al otro lado, sin pasar por la
     * casa de los fantasmas (ahí no se abre ningún paso) */
    var HO = CFG.HOUSE;
    function casaAqui(c, r) {
      return r >= HO.top - 1 && r <= HO.bottom + 1 && c >= HO.left - 1 && c <= HO.right + 1;
    }
    var sitio = null;
    for (var r = 2; r < CFG.ROWS - 2 && !sitio; r++) {
      for (var c = 2; c < CFG.COLS - 2 && !sitio; c++) {
        if (!CFG.isOpen(c, r, false) || casaAqui(c, r)) continue;
        for (var d = 0; d < 4 && !sitio; d++) {
          var v = CFG.DIR_V[d], muro = [];
          for (var n = 1; n <= CFG.HAB.PUENTE_TILES + 1; n++) {
            var nc = CFG.wrapCol(c + v.x * n), nr = r + v.y * n;
            if (nr < 1 || nr >= CFG.ROWS - 1 || casaAqui(nc, nr)) break;
            if (CFG.isOpen(nc, nr, false)) {
              if (muro.length) sitio = { c: c, r: r, d: d, muro: muro };
              break;
            }
            if (muro.length >= CFG.HAB.PUENTE_TILES) break;
            muro.push({ c: nc, r: nr });
          }
        }
      }
    }
    ok(sitio, 'hay un muro con pasillo al otro lado');
    var p = ponPac(0, sitio.c, sitio.r, sitio.d);
    ok(H.puente(G, 0), 'se abre el paso');
    eq(H.st[0].puente.cs.length, sitio.muro.length, 'perfora justo el grosor del muro');
    for (var k = 0; k < sitio.muro.length; k++) {
      ok(H.cruzaPared(0, sitio.muro[k].c, sitio.muro[k].r), 'esa casilla se cruza');
      ok(!CFG.isOpen(sitio.muro[k].c, sitio.muro[k].r, false), 'el laberinto sigue cerrado para los fantasmas');
    }
    ok(!H.cruzaPared(0, sitio.c, sitio.r + 6), 'las demás paredes no');
    /* al cerrarse, el que se quedara dentro sale a una de las bocas */
    H.st[0].puente.t = 1;
    p.x = sitio.muro[0].c * CFG.TILE + CFG.TILE / 2;
    p.y = sitio.muro[0].r * CFG.TILE + CFG.TILE / 2;
    H.pasoRoles(G, true);
    eq(H.st[0].puente, null, 'el paso se cierra solo');
    ok(CFG.isOpen(p.tileX(), p.tileY(), false), 'y nadie se queda dentro del muro');
  });

  test('AJUSTES: el Gancho sale, trae al fantasma y lo deja azul', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['soporte'], ['gancho,inmunidad,relevo,vida']); G.roles = ['soporte'];
    var t = tramoRecto(5);
    ok(t, 'hay un pasillo recto de cinco casillas');
    var p = ponPac(0, t.c, t.r, DR.RIGHT), g = G.ghosts[0];
    for (var n = 1; n < 4; n++) G.ghosts[n].mode = 'house';
    g.mode = 'normal'; g.frightened = false;
    g.x = (t.c + 4) * CFG.TILE + CFG.TILE / 2; g.y = p.y;
    ok(H.gancho(G, 0), 'sale el garfio');
    var b = H.proyectilesCat.filter(function (x) { return x.tipo === 'gancho'; })[0];
    ok(b, 'se ve viajar');
    eq(b.max, CFG.HAB.GANCHO_TILES * CFG.TILE, 'llega a seis casillas');
    var lejos = H.distancia(g.x, g.y, p.x, p.y);
    for (n = 0; n < 300 && H.proyectilesCat.length; n++) H.pasoProyectilesCat(G, true);
    ok(H.distancia(g.x, g.y, p.x, p.y) < lejos, 'el fantasma viene hacia el Soporte');
    ok(H.azulCatTicks[g.id] > 0, 'y llega azul');
    eq(H.st[0].ganchoOut, 0, 'la tecla se libera al acabar');
    /* sin nadie en el pasillo: vuelve de vacío y se gasta igual */
    for (n = 0; n < 4; n++) G.ghosts[n].mode = 'house';
    ok(H.gancho(G, 0), 'sale igual sin blanco');
    var volvio = false;
    for (n = 0; n < 300 && H.proyectilesCat.length; n++) {
      H.pasoProyectilesCat(G, true);
      if (H.proyectilesCat.some(function (x) { return x.tipo === 'gancho' && x.fase === 'vuelve'; })) volvio = true;
    }
    ok(volvio && !H.proyectilesCat.length, 'falla, vuelve y se recoge');
  });

  test('AJUSTES: la Gravedad arrastra a la vista y apaga dos segundos', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['mago'], ['fuego,portal,gravedad,tormenta']); G.roles = ['mago'];
    var t = tramoRecto(5);
    ok(t, 'hay un pasillo recto de cinco casillas');
    var p = ponPac(0, t.c, t.r, DR.RIGHT), g = G.ghosts[0];
    for (var n = 1; n < 4; n++) G.ghosts[n].mode = 'house';
    g.mode = 'normal'; g.frightened = false;
    g.x = (t.c + 4) * CFG.TILE + CFG.TILE / 2; g.y = p.y;   // cuatro casillas
    var lejos = H.distancia(g.x, g.y, p.x, p.y);
    ok(H.gravedad(G, 0), 'sale gravedad');
    eq(H.aturdido[g.id], CFG.HAB.GRAVEDAD_TICKS, 'dos segundos apagado');
    eq(H.distancia(g.x, g.y, p.x, p.y), lejos, 'no hay teletransporte: sigue donde estaba');
    H.pasoRoles(G, true);
    var medio = H.distancia(g.x, g.y, p.x, p.y);
    ok(medio < lejos && medio > CFG.TILE, 'el tirón se ve empezar');
    for (n = 0; n < CFG.HAB.GRAVEDAD_TIRON; n++) H.pasoRoles(G, true);
    ok(H.distancia(g.x, g.y, p.x, p.y) <= CFG.TILE, 'y acaba encima del Mago');
    ok(H.apagado(g.id), 'sigue apagado al llegar');
  });

  test('AJUSTES: la Estela deja el camino entero y lo recoge al acabarse', function () {
    var H = window.PM.Hab;
    partida(2); G.hab = true;
    H.empezar(true, 2, ['soporte', 'asesino'],
      ['telarana,estela,relevo,hospital', 'mordisco,turbo,flash,grito']);
    G.roles = ['soporte', 'asesino'];
    var t = tramoRecto(8);
    ok(t, 'hay un pasillo recto donde dejar el rastro');
    ponPac(0, t.c, t.r, DR.RIGHT);
    ponPac(1, t.c + 7, t.r, DR.LEFT);
    var n;
    for (n = 0; n < 4; n++) G.ghosts[n].mode = 'house';
    ok(H.estela(G, 0), 'sale la estela');
    /* El soporte va andando despacio para que las pisadas caigan separadas */
    for (n = 1; n <= 50; n++) { G.tick++; G.pacs[0].x += 0.4; H.pasoRoles(G, true); }
    var alos50 = H.st[0].estelaRastro.length;
    ok(alos50 >= 9, 'se deja una pisada cada cinco ticks');
    for (n = 1; n <= 30; n++) { G.tick++; G.pacs[0].x += 0.4; H.pasoRoles(G, true); }
    ok(H.st[0].estelaRastro.length > alos50,
       'pasados los 45 ticks no se borra ninguna (antes caducaban una a una)');
    /* El empujón al compañero que lo pisa tiene que seguir funcionando, y
     * ahora también en la parte vieja del camino, no solo en la colita. */
    var primera = H.st[0].estelaRastro[0];
    G.pacs[1].x = primera.x; G.pacs[1].y = primera.y;
    G.tick++; H.pasoRoles(G, true);
    ok(H.st[1].estelaBuff > 0, 'el compañero que pisa la pisada más vieja coge el empujón');
    for (n = 0; n < CFG.HAB.ESTELA_TICKS; n++) { G.tick++; H.pasoRoles(G, true); }
    eq(H.st[0].estela, 0, 'la habilidad se apaga a los 8 s');
    eq(H.st[0].estelaRastro.length, 0, 'y el camino desaparece entero de golpe');
  });

  test('AJUSTES: la Bola Guiada rodea la pared por el pasillo y sigue dando 150', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['mago'], ['bola_guiada,portal,runa,tormenta']); G.roles = ['mago'];
    var n;
    for (n = 0; n < 4; n++) G.ghosts[n].mode = 'house';
    /* Dos casillas de la misma fila con pared en medio: si la ruta del
     * laberinto es más larga que la recta, llegar significa haber rodeado. */
    var par = null, c, r, d, x;
    for (r = 1; r < CFG.ROWS - 1 && !par; r++) {
      for (c = 1; c < CFG.COLS - 2 && !par; c++) {
        if (!CFG.isOpen(c, r, false)) continue;
        for (d = 2; d <= 10 && c + d < CFG.COLS; d++) {
          if (!CFG.isOpen(c + d, r, false)) continue;
          var muro = false;
          for (x = c + 1; x < c + d; x++) if (!CFG.isOpen(x, r, false)) muro = true;
          if (!muro) continue;
          var ruta = H.rutaLaberinto(c, r, c + d, r);
          if (ruta && ruta.length > d) { par = { c: c, r: r, tc: c + d }; break; }
        }
      }
    }
    ok(par, 'hay un par de casillas separadas por una pared');
    ponPac(0, par.c, par.r, DR.RIGHT);
    var g = G.ghosts[0];
    g.mode = 'normal'; g.frightened = false;
    g.x = par.tc * CFG.TILE + CFG.TILE / 2; g.y = par.r * CFG.TILE + CFG.TILE / 2;
    var base = G.score;
    ok(H.bolaGuiada(G, 0), 'sale la bola');
    var porPasillos = true;
    for (n = 0; n < 900 && H.proyectilesCat.length; n++) {
      H.pasoProyectilesCat(G, true);
      var bo = H.proyectilesCat[0];
      if (bo) porPasillos = porPasillos &&
        CFG.isOpen(Math.floor(bo.x / CFG.TILE), Math.floor(bo.y / CFG.TILE), false);
    }
    ok(porPasillos, 'no atraviesa la pared: pasa solo por casillas abiertas');
    eq(g.mode, 'eyes', 'llega igualmente: la bola no falla nunca');
    eq(G.score - base, 150, 'premio fijo de 150');
  });

  test('AJUSTES: los números nuevos del catálogo', function () {
    var C = CFG.HAB;
    eq(C.CHISPA_TICKS, 3 * 60, 'Chispa aturde 3 s');
    eq(C.MURO_TICKS, 10 * 60, 'el Muro dura 10 s');
    eq(C.TELARANA_TICKS, 16 * 60, 'la Telaraña dura 16 s');
    eq(C.GRITO_GUERRA_TICKS, 150, 'el Grito de Guerra clava 2,5 s');
    /* El Grito se mudó de la Q a la E, que era la única ranura del juego con
     * una sola opción */
    var q = C.CATALOGO.tanque[0].map(function (h) { return h.id; });
    var e = C.CATALOGO.tanque[2].map(function (h) { return h.id; });
    ok(q.indexOf('grito_guerra') < 0, 'ya no está en la Q');
    ok(e.indexOf('grito_guerra') >= 0, 'está en la E');
    ok(e.length > 1, 'y la E del Tanque deja de tener una sola opción');
    eq(C.CATALOGO.tanque[2].filter(function (h) { return h.id === 'grito_guerra'; })[0].cd,
      40 * 60, 'con recarga de 40 s, que clavar a los cuatro es media R');
  });

  test('AJUSTES: el Grito de Guerra alcanza todo el mapa', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['tanque'], ['pisoton,escudo,grito_guerra,arrollar']); G.roles = ['tanque'];
    var p = ponPac(0, 13, 20, DR.RIGHT), lejos = 0;
    for (var n = 0; n < 4; n++) {
      var g = G.ghosts[n];
      g.mode = 'normal'; g.frightened = false;
      g.x = (2 + n * 6) * CFG.TILE + CFG.TILE / 2; g.y = 2 * CFG.TILE + CFG.TILE / 2;
      lejos = Math.max(lejos, H.distancia(g.x, g.y, p.x, p.y));
    }
    ok(lejos > 6 * CFG.TILE, 'están repartidos por el mapa, no al lado');
    ok(H.gritoGuerra(G, 0), 'sale el grito');
    for (n = 0; n < 4; n++) {
      eq(H.aturdido[n], CFG.HAB.GRITO_GUERRA_TICKS, 'clava al fantasma ' + n);
      ok(H.apagado(n), 'y lo deja apagado');
    }
  });

  test('AJUSTES: el Empujón también aparta al que viene por detrás', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['tanque'], ['empujon,escudo,provocar,arrollar']); G.roles = ['tanque'];
    var t = tramoRecto(7);
    ok(t, 'hay un pasillo recto de siete casillas');
    /* el Tanque en medio, mirando a la derecha, y el fantasma a su ESPALDA */
    var p = ponPac(0, t.c + 3, t.r, DR.RIGHT), g = G.ghosts[0];
    for (var n = 1; n < 4; n++) G.ghosts[n].mode = 'house';
    g.mode = 'normal'; g.frightened = false;
    g.x = (t.c + 2) * CFG.TILE + CFG.TILE / 2; g.y = p.y;
    var antes = H.distancia(g.x, g.y, p.x, p.y);
    ok(H.empujon(G, 0), 'la Q sale aunque no haya nadie delante');
    ok(H.distancia(g.x, g.y, p.x, p.y) > antes, 'y lo aleja hacia atrás');
    ok(g.x < p.x, 'sin traérselo por delante');
    eq(H.aturdido[g.id], CFG.HAB.EMPUJON_STUN, 'aturdido como siempre');
    /* y el de delante sigue siendo el primero al que mira */
    g.x = (t.c + 4) * CFG.TILE + CFG.TILE / 2; g.y = p.y;
    H.aturdido[g.id] = 0;
    var antesD = H.distancia(g.x, g.y, p.x, p.y);
    ok(H.empujon(G, 0), 'empuja al de delante');
    ok(H.distancia(g.x, g.y, p.x, p.y) > antesD && g.x > p.x, 'alejándolo por delante');
  });

  /* El TERREMOTO se veía como un parón —cuatro fantasmas a casa de golpe— y
   * no como un terremoto. Ahora sacude el mapa: un tirón fuerte que se calma
   * hasta parar, y quieto del todo para quien tenga puesto REDUCIR
   * MOVIMIENTO. Lo que se mide aquí es el desplazamiento que consulta el
   * dibujo (Hab.temblor), no píxeles: en Node no se rasteriza nada. */
  test('AJUSTES: el TERREMOTO sacude el mapa, y se está quieto si se pide', function () {
    var H = window.PM.Hab, n, tope;
    function meneo() {
      var d = H.temblor();
      return Math.max(Math.abs(d.x), Math.abs(d.y));
    }
    partida(1); G.hab = true;
    H.empezar(true, 1, ['tanque'], ['pisoton,escudo,provocar,terremoto']); G.roles = ['tanque'];
    ponPac(0, 13, 20, DR.RIGHT);
    eq(meneo(), 0, 'sin nada lanzado, el mapa está quieto');

    ok(H.terremoto(G, 0), 'sale el terremoto');
    var fuerte = 0;
    for (n = 0; n < 15; n++) { fuerte = Math.max(fuerte, meneo()); H.pasoRoles(G, true); }
    ok(fuerte >= 3, 'el mapa se mueve de verdad al reventar el suelo');

    var flojo = 0;
    for (; n < 45; n++) { flojo = Math.max(flojo, meneo()); H.pasoRoles(G, true); }
    ok(flojo > 0 && flojo < fuerte, 'y se va calmando, sin parar de golpe');

    for (; n < 90; n++) H.pasoRoles(G, true);
    eq(meneo(), 0, 'acaba quieto del todo');
    ok(H.terremotoTicks > 0, 'aunque al poder le queden segundos: temblar seis marea');

    /* REDUCIR MOVIMIENTO: el poder hace lo mismo, el suelo no se mueve */
    var antesMM = window.matchMedia;
    window.matchMedia = function () { return { matches: true, addListener: function () {} }; };
    try {
      ok(H.terremoto(G, 0), 'el terremoto sale igual');
      tope = 0;
      for (n = 0; n < 30; n++) { tope = Math.max(tope, meneo()); H.pasoRoles(G, true); }
      eq(tope, 0, 'pero el mapa no se mueve ni un píxel');
      ok(H.terremotoTicks > 0, 'y el resto del poder sigue en marcha');
    } finally { window.matchMedia = antesMM; }
  });

  test('AJUSTES: el TOQUE ARCANO contagia el azul al cruzarse', function () {
    var H = window.PM.Hab, n;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['mago'], ['toque_arcano,clon,gravedad,eclipse']); G.roles = ['mago'];
    var t = tramoRecto(6);
    ok(t, 'hay un pasillo recto donde cruzarse');
    var p = ponPac(0, t.c, t.r, DR.RIGHT);
    var a = G.ghosts[0], b = G.ghosts[1], casa = G.ghosts[2], ojos = G.ghosts[3];
    a.mode = 'normal'; a.frightened = false;
    a.x = (t.c + 1) * CFG.TILE + CFG.TILE / 2; a.y = p.y;
    b.mode = 'normal'; b.frightened = false;
    b.x = (t.c + 5) * CFG.TILE + CFG.TILE / 2; b.y = p.y;   // de momento, lejos
    /* Estos dos van pegados al tocado a propósito: no se contagian por estar
     * en casa o ser ojos, no por estar lejos. */
    casa.mode = 'house'; casa.x = a.x; casa.y = a.y;
    ojos.mode = 'eyes'; ojos.x = a.x; ojos.y = a.y;

    ok(H.toqueArcano(G, 0), 'el toque alcanza al fantasma de al lado');
    ok(H.azulCatTicks[a.id] > 0, 'el tocado se pone azul');
    ok(H.puedeComer(G, a.id, 0), 'y el Mago se lo puede comer');
    eq(H.azulCatTicks[b.id], 0, 'el de lejos sigue entero');

    H.pasoRoles(G, true);
    eq(H.azulCatTicks[b.id], 0, 'a cuatro casillas no salta nada');

    /* ahora sí se cruzan: media casilla */
    b.x = a.x + CFG.TILE / 2; b.y = a.y;
    H.pasoRoles(G, true);
    ok(H.azulCatTicks[b.id] > 0, 'al cruzarse, el azul salta');
    ok(H.azulCatTicks[b.id] <= H.azulCatTicks[a.id],
      'y nunca con más tiempo del que le queda al que se lo pegó');
    ok(H.azulCatTicks[b.id] < CFG.HAB.TOQUE_ARCANO_TICKS, 'no se reinicia el reloj: se hereda');
    eq(H.azulCatalogo[b.id], H.azulCatalogo[a.id], 'el dueño de los puntos se hereda');
    ok(H.puedeComer(G, b.id, 0), 'el Mago también cobra al contagiado');

    eq(H.azulCatTicks[casa.id], 0, 'el que está en casa no se contagia');
    eq(H.azulCatTicks[ojos.id], 0, 'el hecho ojos tampoco');

    /* la cadena se apaga sola: al contagiado no se le renueva el reloj por
     * seguir pegado al que se lo pasó */
    var quedaba = H.azulCatTicks[b.id];
    for (n = 0; n < 10; n++) H.pasoRoles(G, true);
    eq(H.azulCatTicks[b.id], quedaba - 10, 'el reloj del contagiado solo baja');
    eq(H.azulCatTicks[a.id], H.azulCatTicks[b.id], 'los dos se apagan a la vez');
  });

  test('AJUSTES: el METEORO se apunta manteniendo la R', function () {
    var H = window.PM.Hab, HH = CFG.HAB, i;
    var R = 3;                      // el METEORO es la R, el cuarto del Mago

    /* Casilla donde puede caer: ni muro ni casa de los fantasmas */
    function libre(c, r) {
      var HO = CFG.HOUSE;
      if (r >= HO.top && r <= HO.bottom && c >= HO.left && c <= HO.right) return false;
      return CFG.isOpen(c, r, false);
    }
    /* Un pasillo horizontal donde quepa el alcance entero y con una pared
     * ENCIMA a tiro: hacen falta las dos cosas para ver que la marca no
     * atraviesa muros y que no pasa del alcance. Se busca en el laberinto que
     * toque, sin coordenadas escritas a mano. */
    function pasillo(largo) {
      for (var r = 2; r < CFG.ROWS - 1; r++) {
        for (var c = 1; c + largo < CFG.COLS - 1; c++) {
          var vale = true, pared = -1, n;
          for (n = 0; n <= largo; n++) {
            if (!libre(c + n, r)) { vale = false; break; }
            if (n >= 1 && n <= HH.METEORO_ALCANCE && pared < 0 &&
                !CFG.isOpen(c + n, r - 1, false)) pared = c + n;
          }
          if (vale && pared >= 0) return { c: c, r: r, pared: pared };
        }
      }
      return null;
    }

    /* Un tick de los poderes tal y como lo da la partida: primero las teclas
     * que se mantienen y después los efectos, que es el orden en que los llama
     * Game.step. Importa de verdad: el apuntado no tiene ningún rato que
     * cumplir y tiene que aguantar tick tras tick sin reabrirse solo. */
    function tic() { H.cargas(G); H.pasoRoles(G, true); }

    partida(1); G.hab = true;
    H.empezar(true, 1, ['mago'], ['fuego,portal,runa,meteoro']); G.roles = ['mago'];
    var pas = pasillo(HH.METEORO_ALCANCE + 1);
    ok(pas, 'hay un pasillo largo con pared encima donde apuntar');
    ponPac(0, pas.c, pas.r, DR.RIGHT);

    /* APRETAR: aparece la marca, no ha caído nada y la R sigue cargada */
    ok(H.apretar(G, 0, R, false), 'la R mantenida abre el apuntado');
    ok(H.st[0].apunta, 'al mantener aparece la marca');
    eq(H.st[0].apunta.r, pas.r, 'en el pasillo del Mago');
    eq(H.st[0].apunta.c, pas.c + 1, 'una casilla por delante de él');
    ok(!H.st[0].meteoro, 'todavía no ha caído nada');
    eq(H.st[0].cd[R], 0, 'ni se ha gastado la recarga');

    /* FRANCOTIRADOR: mientras apunta, el Mago no se mueve */
    eq(H.multVel(0), 0, 'el Mago se queda plantado mientras apunta');
    for (i = 0; i < 30; i++) tic();
    eq(H.st[0].apunta.c, pas.c + 1, 'la marca ya no camina sola');

    /* PAREDES: cada flecha es UN paso, y contra el muro de arriba no pasa */
    var c0 = H.st[0].apunta.c;
    G.setPacDir(0, DR.RIGHT);
    eq(H.st[0].apunta.c, c0 + 1, 'una flecha, una casilla');
    G.setPacDir(0, DR.LEFT);
    eq(H.st[0].apunta.c, c0, 'y la contraria la devuelve');
    while (H.st[0].apunta.c < pas.pared) G.setPacDir(0, DR.RIGHT);
    eq(H.st[0].apunta.c, pas.pared, 'la marca recorre el pasillo casilla a casilla');
    eq(H.st[0].mant, R, 'la tecla sigue apretada, sin relanzarse sola');
    /* la flecha entra por donde entran todas (Game.setPacDir): mientras se
     * apunta es de la marca y no del Mago */
    G.setPacDir(0, DR.UP);
    eq(G.pacs[0].nextDir, DR.RIGHT, 'la flecha no gira al Mago mientras apunta');
    eq(H.st[0].apunta.r, pas.r, 'y la pared de arriba no la deja pasar');

    /* ALCANCE: por mucho que siga el pasillo, no se va más lejos */
    for (i = 0; i < HH.METEORO_ALCANCE * 3; i++) G.setPacDir(0, DR.RIGHT);
    eq(H.st[0].apunta.c, pas.c + HH.METEORO_ALCANCE, 'se para en el alcance máximo');
    ok(libre(pas.c + HH.METEORO_ALCANCE + 1, pas.r), 'aunque el pasillo siga abierto');

    /* SOLTAR: cae donde estaba la marca y explota como toda la vida */
    var dest = { c: H.st[0].apunta.c, r: H.st[0].apunta.r }, g = G.ghosts[0];
    for (i = 1; i < 4; i++) G.ghosts[i].mode = 'house';
    g.mode = 'normal'; g.frightened = false;
    g.x = dest.c * CFG.TILE + CFG.TILE / 2;
    g.y = dest.r * CFG.TILE + CFG.TILE / 2;
    ok(H.soltar(G, 0, R), 'al soltar cae el meteoro');
    eq(H.st[0].apunta, null, 'y se cierra el apuntado');
    H.pasoRoles(G, false);          // sin correr la partida: solo el estado
    ok(H.multVel(0) > 0, 'y el Mago vuelve a andar');
    G.setPacDir(0, DR.UP);
    eq(G.pacs[0].nextDir, DR.UP, 'las flechas vuelven a ser del Mago');
    eq(H.st[0].meteoro.c, dest.c, 'cae en la columna apuntada');
    eq(H.st[0].meteoro.r, dest.r, 'y en la fila apuntada');
    eq(H.st[0].meteoro.t, HH.METEORO_AVISO, 'con el aviso de siempre');
    ok(H.st[0].cd[R] > 0, 'ahora sí se gasta la recarga');
    for (i = 0; i <= HH.METEORO_AVISO; i++) tic();
    ok(!H.st[0].meteoro, 'pasado el aviso, revienta');
    ok(H.st[0].fuegoMeteoro, 'y deja la zona de fuego');
    eq(g.mode, 'eyes', 'llevándose por delante al fantasma que había debajo');
  });

  test('AJUSTES: el METEORO paga cuando acierta: más grande, recarga devuelta y fuego que quema', function () {
    var H = window.PM.Hab, HH = CFG.HAB, T = CFG.TILE, i, j;
    var R = 3;
    function tic() { H.cargas(G); H.pasoRoles(G, true); }
    partida(1); G.hab = true;
    H.empezar(true, 1, ['mago'], ['fuego,portal,runa,meteoro']); G.roles = ['mago'];
    ponPac(0, 1, 1, DR.RIGHT);
    for (i = 0; i < 4; i++) { G.ghosts[i].mode = 'house'; }
    /* una casilla donde caer y dos fantasmas: uno a TRES casillas del
     * centro (antes quedaba fuera) y otro lejos */
    var c = 13, r = 23;
    var g1 = G.ghosts[0], g2 = G.ghosts[1];
    g1.mode = 'normal'; g1.frightened = false; g1.x = (c - 3) * T + T / 2; g1.y = r * T + T / 2;
    ok(H.ghostsEn(G, c, r, HH.METEORO_RADIO).indexOf(g1) >= 0, 'a tres casillas entra en el golpe');
    H.st[0].cd[R] = 60 * 60;
    H.st[0].meteoro = { c: c, r: r, t: 1 };
    for (i = 0; i < 5 && H.st[0].meteoro; i++) tic();
    eq(g1.mode, 'eyes', 'el golpe de tres casillas se lo lleva');
    ok(H.st[0].cd[R] <= 60 * 60 - HH.METEORO_DEVUELVE, 'y devuelve quince segundos de recarga');
    ok(H.st[0].cd[R] > 60 * 60 - HH.METEORO_DEVUELVE - 10, 'quince, no más');
    ok(H.st[0].fuegoMeteoro, 'queda la hoguera');
    eq(H.st[0].fuegoMeteoro.t, HH.METEORO_FUEGO, 'de seis segundos');
    eq(H.radioFuego(H.st[0].fuegoMeteoro), HH.METEORO_RADIO, 'nace del tamaño del golpe');
    for (i = 0; i < HH.METEORO_FUEGO_CRECE; i++) tic();
    eq(H.radioFuego(H.st[0].fuegoMeteoro), HH.METEORO_RADIO + 1, 'y a los dos segundos crece una casilla');

    /* el fantasma que pisa el fuego NO muere en el acto: se quema */
    g2.mode = 'normal'; g2.frightened = false; g2.x = c * T + T / 2; g2.y = r * T + T / 2;
    var g3 = G.ghosts[2];
    g3.mode = 'normal'; g3.frightened = false; g3.x = (c + 1) * T + T / 2; g3.y = r * T + T / 2;
    tic();
    eq(g2.mode, 'normal', 'pisar el fuego no mata en el acto');
    ok(H.quema[g2.id] > 0, 'lo deja ardiendo');
    ok(H.quema[g3.id] > 0, 'a los dos que pisan');
    /* uno que se va a casa antes de tiempo se apaga */
    g3.mode = 'eyes';
    tic();
    eq(H.quema[g3.id], 0, 'si se lo comen antes, se le apaga');
    /* se va del fuego: arde igual */
    g2.x = 1 * T + T / 2; g2.y = 29 * T + T / 2;
    var cdAntes = H.st[0].cd[R];
    for (i = 0; i < HH.METEORO_QUEMA - 10; i++) tic();
    eq(g2.mode, 'normal', 'todavía no');
    for (i = 0; i < 10; i++) tic();
    eq(g2.mode, 'eyes', 'a los cuatro segundos cae, aunque saliera del fuego');
    ok(H.st[0].cd[R] <= Math.max(0, cdAntes - HH.METEORO_DEVUELVE), 'y también devuelve recarga');

  });

  test('RED: lo que el anfitrión le hace al jugador de un invitado le llega', function () {
    var H = window.PM.Hab;
    partida(2); G.hab = true;
    H.empezar(true, 2, ['soporte', 'asesino'], ['mina,inmunidad,faro,vida', 'mordisco,frenesi,flash,grito']);
    G.roles = ['soporte', 'asesino'];
    var rol = G.netRole, idx = G.localIdx, evt = G.hostEvt, mandados = [];
    G.netRole = 'host'; G.localIdx = 0;
    G.hostEvt = function (o) { mandados.push(o); };
    try {
      /* el anfitrión le da escudo al invitado: se aplica aquí Y se le avisa */
      H.dar(G, 1, 'escudo', 120);
      eq(H.st[1].escudo, 120, 'se aplica en la copia del anfitrión');
      ok(mandados.some(function (o) { return o.t === 'habDar' && o.w === 1 && o.c === 'escudo'; }),
        'y viaja al dueño');
      mandados = [];
      H.dar(G, 0, 'escudo', 120);
      eq(mandados.length, 0, 'lo del propio anfitrión no se manda');
      /* en la máquina del invitado: solo se toca lo suyo */
      G.netRole = 'guest'; G.localIdx = 1;
      H.st[1].cd[3] = 900;
      H.recibeDado(G, { t: 'habDar', w: 1, c: 'cd', v: 450, k: 3 });
      eq(H.st[1].cd[3], 450, 'el FARO le baja la recarga al invitado');
      H.recibeDado(G, { t: 'habDar', w: 1, c: 'cd', v: 800, k: 3 });
      eq(H.st[1].cd[3], 450, 'un aviso nunca le sube la recarga');
      H.recibeDado(G, { t: 'habDar', w: 1, c: 'frenesiMult', v: 1.3 });
      eq(H.st[1].frenesiMult, 1.3, 'el FRENESÍ le acelera');
      H.st[0].escudo = 0;
      H.recibeDado(G, { t: 'habDar', w: 0, c: 'escudo', v: 99 });
      eq(H.st[0].escudo, 0, 'lo de otro jugador no lo toma del aviso (va en la foto)');
    } finally { G.netRole = rol; G.localIdx = idx; G.hostEvt = evt; }
  });

  test('CLIPS: el trozo acaba tras la barra y MEJOR JUGADA va a la cadena más larga', function () {
    var R = window.PM.Replay, C = window.PM.Clip;
    var guarda = { t: R.t, tTotal: R.tTotal, momentos: R.momentos, dur: C.dur };
    try {
      R.tTotal = 60 * 60; C.dur = 15;
      R.t = 30 * 60;
      var r = C.rango();
      eq(r.fin, 30 * 60 + 120, 'acaba dos segundos después de la barra');
      eq(r.fin - r.ini, 15 * 60, 'y dura lo elegido');
      R.t = 60;
      r = C.rango();
      eq(r.ini, 0, 'al principio de la partida empieza en el cero');
      eq(r.fin - r.ini, 15 * 60, 'y se alarga hacia delante para no quedarse corto');
      R.t = 60 * 60;
      r = C.rango();
      eq(r.fin, 60 * 60, 'no se pasa del final');
      R.momentos = [{ t: 0, tipo: 'nivel', label: 'NIVEL 1' }, { t: 600, tipo: 'cadena', label: 'CADENA ×2' },
        { t: 1200, tipo: 'muerte', label: 'MUERTE' }, { t: 1800, tipo: 'cadena', label: 'CADENA ×4' },
        { t: 2400, tipo: 'cadena', label: 'CADENA ×3' }];
      eq(C.mejorJugada(), 1800, 'la cadena de cuatro');
      R.momentos = [{ t: 0, tipo: 'nivel', label: 'NIVEL 1' }, { t: 900, tipo: 'nivel', label: 'NIVEL 2' }];
      eq(C.mejorJugada(), 900 + 8 * 60, 'sin cadenas, el último nivel empezado');
    } finally { R.t = guarda.t; R.tTotal = guarda.tTotal; R.momentos = guarda.momentos; C.dur = guarda.dur; }
  });

  test('RED: el CLON de un invitado anda en su pantalla', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['mago'], ['fuego,clon,runa,tormenta']); G.roles = ['mago'];
    var rol = G.netRole, idx = G.localIdx, send = G.netSend;
    G.netRole = 'guest'; G.localIdx = 0; G.netSend = function () {};
    try {
      H.st[0].clon = { c: 13, r: 23, x: 13 * CFG.TILE + CFG.TILE / 2, y: 23 * CFG.TILE + CFG.TILE / 2,
        d: DR.RIGHT, t: 300 };
      var x0 = H.st[0].clon.x;
      for (var i = 0; i < 10; i++) H.pasoRoles(G, true);
      ok(H.st[0].clon && H.st[0].clon.x !== x0, 'el doble se mueve aunque no mande esta máquina');
    } finally { G.netRole = rol; G.localIdx = idx; G.netSend = send; }
  });

  test('RED: el anfitrión no le rompe el YUNQUE a un invitado por su posición atrasada', function () {
    var H = window.PM.Hab;
    partida(2); G.hab = true;
    H.empezar(true, 2, ['mago', 'tanque'], ['fuego,portal,runa,tormenta', 'pisoton,yunque,provocar,arrollar']);
    G.roles = ['mago', 'tanque'];
    var rol = G.netRole, idx = G.localIdx, auth = G.isLocalAuth, send = G.netSend, mandado = [];
    G.netRole = 'host'; G.localIdx = 0;
    G.isLocalAuth = function (j) { return j === 0; };
    try {
      var p = ponPac(1, 13, 23, DR.RIGHT);
      ok(H.yunque(G, 1), 'el invitado planta el yunque');
      p.x += CFG.TILE / 2;                     // la posición buena llega tarde
      H.pasoRoles(G, true);
      ok(H.st[1].yunque > 0, 'el anfitrión no lo rompe por el salto de la posición');
      H.peticionGasto(G, 1, { t: 'habGasta', c: 'yunque', j: 1 });
      eq(H.st[1].yunque, 0, 'se rompe cuando el invitado dice que se ha movido');
      /* y en la máquina del invitado, al moverse, lo avisa */
      G.netRole = 'guest'; G.localIdx = 1;
      G.isLocalAuth = function (j) { return j === 1; };
      G.netSend = function (t, d) { mandado.push(d); };
      ok(H.yunque(G, 1), 'otra vez');
      p.x += CFG.TILE;
      H.pasoRoles(G, true);
      eq(H.st[1].yunque, 0, 'en su pantalla se rompe al moverse');
      ok(mandado.some(function (d) { return d.t === 'habGasta' && d.c === 'yunque'; }), 'y se lo cuenta al anfitrión');
    } finally { G.netRole = rol; G.localIdx = idx; G.isLocalAuth = auth; G.netSend = send; }
  });

  test('RED: el PUENTE de otro que cierra la foto saca al invitado del muro', function () {
    var H = window.PM.Hab;
    partida(2); G.hab = true;
    H.empezar(true, 2, ['soporte', 'mago'], ['hielo,puente,aliado,vida', 'fuego,portal,runa,tormenta']);
    G.roles = ['soporte', 'mago'];
    var rol = G.netRole, idx = G.localIdx, auth = G.isLocalAuth;
    G.netRole = 'guest'; G.localIdx = 1;
    G.isLocalAuth = function (j) { return j === 1; };
    try {
      /* un muro cualquiera con pasillo a los dos lados */
      var hueco = null;
      for (var r = 1; r < CFG.ROWS - 1 && !hueco; r++) for (var c = 1; c < CFG.COLS - 1 && !hueco; c++) {
        if (!CFG.isOpen(c, r, false) && CFG.isOpen(c - 1, r, false) && CFG.isOpen(c + 1, r, false)) hueco = { c: c, r: r };
      }
      ok(hueco, 'hay un muro de una casilla');
      H.st[0].puente = { cs: [hueco], t: 100, de: { c: hueco.c - 1, r: hueco.r }, a: { c: hueco.c + 1, r: hueco.r } };
      var p = ponPac(1, hueco.c, hueco.r, DR.RIGHT);
      var foto = H.resumenRoles();
      foto.ct.st[0].puente = null;             // el anfitrión ya lo ha cerrado
      H.aplicarRoles(foto, 1, G);
      eq(H.st[0].puente, null, 'la foto lo cierra');
      ok(p.tileX() !== hueco.c || p.tileY() !== hueco.r, 'y el invitado no se queda dentro de la pared');
    } finally { G.netRole = rol; G.localIdx = idx; G.isLocalAuth = auth; }
  });

  test('AJUSTES: el botín de Carroña lo coge cualquiera', function () {
    var H = window.PM.Hab;
    partida(2); G.hab = true;
    H.empezar(true, 2, ['asesino', 'soporte'],
      ['mordisco,carrona,flash,grito', 'hielo,inmunidad,relevo,vida']);
    G.roles = ['asesino', 'soporte'];
    var p = ponPac(0, 13, 20, DR.RIGHT), compa = G.pacs[1], g = G.ghosts[0];
    ok(H.carrona(G, 0), 'sale carroña');
    g.mode = 'normal'; g.frightened = true; g.x = p.x + CFG.TILE; g.y = p.y;
    G.eatGhost(g, 0, 'mordisco');
    eq(H.joyas.length, 1, 'la baja deja una moneda');
    /* SALE DESPEDIDA: cae lejos del Asesino, no encima de él */
    ok(H.distancia(H.joyas[0].x, H.joyas[0].y, p.x, p.y) > CFG.TILE,
      'la moneda no se queda en los pies de quien mató');
    ok(H.joyas[0].espera > 0, 'y sale con su medio segundo de gracia');
    /* mientras vuela no la coge nadie, ni el propio Asesino encima */
    p.x = H.joyas[0].x; p.y = H.joyas[0].y;
    H.pasoRoles(G, true);
    eq(H.joyas.length, 1, 'por los aires no se puede recoger');
    p.x = 0; p.y = 0;
    for (var kb = 0; kb < CFG.HAB.CARROÑA_GRACIA; kb++) H.pasoRoles(G, true);
    /* el compañero pasa por encima: antes se quedaba ahí tirada */
    compa.x = H.joyas[0].x; compa.y = H.joyas[0].y;
    var base = G.score;
    H.pasoRoles(G, true);
    eq(H.joyas.length, 0, 'la levanta el que pasa, no solo su dueño');
    eq(G.score - base, 300, 'y vale lo mismo');
  });

  test('AJUSTES: el gancho inverso no sobrevive a la muerte de su dueño', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['asesino'], ['mordisco,sombra,gancho_inverso,caceria']);
    G.roles = ['asesino'];
    ponPac(0, 2, 1, DR.DOWN);
    for (var n = 0; n < 4; n++) G.ghosts[n].mode = 'house';
    ok(H.ganchoInverso(G, 0), 'sale el gancho');
    eq(H.proyectilesCat.length, 1, 'hay cuerda en la mesa');
    G.startPacDeath(0);
    eq(H.proyectilesCat.length, 0, 'morir corta la cuerda, no solo el estado');
    eq(H.st[0].ganchoInv, 0, 'y la E vuelve a estar libre');
  });

  test('AJUSTES: el viaje a casa le quita al fantasma lo que le pintaron encima', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['soporte'], ['gancho,inmunidad,aliado,vida']);
    G.roles = ['soporte'];
    var p = ponPac(0, 13, 20, DR.RIGHT), g = G.ghosts[0];
    g.mode = 'normal'; g.frightened = false; g.x = p.x + CFG.TILE * 2; g.y = p.y;
    /* el GANCHO lo deja azul sin energizante, y encima congelado y lento */
    H.azulCatalogo[g.id] = 1; H.azulCatTicks[g.id] = CFG.HAB.GANCHO_AZUL_TICKS;
    H.hielo[g.id] = 120; H.lento[g.id] = 120; H.aturdido[g.id] = 120;
    ok(H.puedeComer(G, g.id, 0), 'azulado por el gancho, se come');
    /* se lo come y se va a casa hecho ojos */
    g.mode = 'eyes';
    H.pasoRoles(G, true);
    eq(H.azulCatalogo[g.id], 0, 'el azul no se va a casa con él');
    eq(H.azulCatTicks[g.id], 0, 'ni el reloj que le quedaba');
    eq(H.hielo[g.id], 0, 'ni el hielo');
    eq(H.aturdido[g.id], 0, 'ni el aturdimiento');
    /* y al salir otra vez es un fantasma normal: no es instakill en la puerta */
    g.mode = 'normal'; g.frightened = false;
    eq(H.puedeComer(G, g.id, 0), false, 'vuelve gris, no azul');
  });

  test('AJUSTES: un fantasma ya comido no se muere solo al salir de casa', function () {
    var H = window.PM.Hab;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['asesino'], ['mordisco,turbo,flash,grito']); G.roles = ['asesino'];
    var p = ponPac(0, 13, 20, DR.RIGHT), g = G.ghosts[1];
    /* el energizante sigue corriendo, pero a ESTE ya se lo comieron: vuelve
     * de casa gris. Antes se miraba el reloj de la mesa y no su azul, así
     * que se moría solo nada más salir y regalaba la baja. */
    G.frightTicks = 300;
    g.mode = 'normal'; g.frightened = false; g.x = p.x; g.y = p.y;
    p.safeTicks = 999;
    eq(H.puedeComer(G, g.id, 0), false, 'sin azul propio no se puede comer');
    var base = G.score;
    G.stepPlaying();
    eq(G.score - base, 0, 'pasarle por encima no lo mata');
    ok(g.mode !== 'eyes', 'y sigue en la calle');
    /* y el que SÍ está azul se come igual que siempre */
    g.frightened = true; g.x = p.x; g.y = p.y;
    eq(H.puedeComer(G, g.id, 0), true, 'el azul de verdad sí');
  });

  test('AJUSTES: la MARCA cobra doble también en el shuriken y la bomba', function () {
    var H = window.PM.Hab, HC = CFG.HAB;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['asesino'], ['shuriken,turbo,marca,ejecucion']); G.roles = ['asesino'];
    var p = ponPac(0, 13, 20, DR.RIGHT);
    function bajaMarcada(pts, como) {
      var g = G.ghosts[0];
      g.mode = 'normal'; g.frightened = false; g.x = p.x + CFG.TILE * 2; g.y = p.y;
      H.marcaGhost[g.id] = 0; H.st[0].marca = 5 * 60;
      var base = G.score;
      H.matarCatalogo(G, g, 0, pts, como, 1, true);
      g.mode = 'normal';
      return G.score - base;
    }
    eq(bajaMarcada(HC.SHURIKEN_PUNTOS, 'shuriken'), 400, 'el shuriken sobre un marcado paga 400');
    eq(bajaMarcada(HC.BOMBA_PUNTOS, 'bomba'), 300, 'la bomba, 300');
    eq(bajaMarcada(HC.BOLA_GUIADA_PUNTOS, 'bola_guiada'), 300, 'la bola guiada, 300');
    /* y los premios gordos siguen siendo exactos: la marca no los toca */
    eq(bajaMarcada(HC.EJECUCION_PUNTOS, 'ejecucion'), 5000, 'la ejecución no se duplica');
    /* sin marca, el shuriken vuelve a sus 200 */
    var g2 = G.ghosts[0];
    g2.mode = 'normal'; g2.x = p.x + CFG.TILE * 2; g2.y = p.y;
    H.marcaGhost[g2.id] = -1; H.st[0].marca = 0;
    var b2 = G.score;
    H.matarCatalogo(G, g2, 0, HC.SHURIKEN_PUNTOS, 'shuriken', 1, true);
    eq(G.score - b2, 200, 'sin marcar, 200 exactos');
  });

  test('AJUSTES: el Misil no da media vuelta, sigue hacia adelante', function () {
    var H = window.PM.Hab, T = CFG.TILE, n;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['asesino'], ['mordisco,turbo,flash,misil']); G.roles = ['asesino'];
    /* Pasillo recto de once casillas: uno DETRÁS del Asesino y otro DELANTE.
     * El misil sale a por el de detrás (es el más cercano) y, al matarlo,
     * antes se volvía en redondo a por el otro. Ahora sigue de frente y
     * llega por donde el laberinto le deje. */
    var pas = null, c, r, vale;
    for (r = 1; r < CFG.ROWS - 1 && !pas; r++) {
      for (c = 1; c + 10 < CFG.COLS - 1 && !pas; c++) {
        vale = true;
        for (n = 0; n <= 10; n++) if (!CFG.isOpen(c + n, r, false)) vale = false;
        if (vale) pas = { c: c, r: r };
      }
    }
    ok(pas, 'hay un pasillo recto de once casillas');
    for (n = 0; n < 4; n++) G.ghosts[n].mode = 'house';
    var atras = G.ghosts[0], delante = G.ghosts[1];
    function pon2(g, cc) {
      g.mode = 'normal'; g.frightened = false;
      g.x = cc * T + T / 2; g.y = pas.r * T + T / 2;
    }
    ponPac(0, pas.c + 5, pas.r, DR.RIGHT);
    pon2(atras, pas.c + 3);        // dos casillas por detrás
    pon2(delante, pas.c + 9);      // cuatro por delante
    ok(H.misil(G, 0), 'sale el misil');
    var prev = -1, vueltas = 0;
    for (n = 0; n < 600 && H.proyectilesCat.length; n++) {
      H.pasoProyectilesCat(G, true);
      var m = H.proyectilesCat[0];
      if (!m) break;
      if (prev >= 0 && m.d >= 0 && m.d === CFG.OPP[prev]) vueltas++;
      prev = m.d;
    }
    eq(vueltas, 0, 'el misil no se da la vuelta ni una vez');
    eq(atras.mode, 'eyes', 'cae el de detrás, que era su blanco');
    eq(delante.mode, 'eyes', 'y el otro también, dando el rodeo');
  });

  test('AJUSTES: el Misil atropella al que se le cruza y no lo cobra dos veces', function () {
    var H = window.PM.Hab, T = CFG.TILE, n;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['asesino'], ['mordisco,turbo,flash,misil']); G.roles = ['asesino'];

    /* Un pasillo recto de siete casillas: el misil va de una punta a la otra
     * y lo que se le plante en medio tiene que caer por el camino. Se busca
     * en el laberinto que toque, sin coordenadas escritas a mano. */
    var pas = null, c, r, vale;
    for (r = 1; r < CFG.ROWS - 1 && !pas; r++) {
      for (c = 1; c + 6 < CFG.COLS - 1 && !pas; c++) {
        vale = true;
        for (n = 0; n <= 6; n++) if (!CFG.isOpen(c + n, r, false)) vale = false;
        if (vale) pas = { c: c, r: r };
      }
    }
    ok(pas, 'hay un pasillo recto de siete casillas');
    function pon(g, cc) {
      g.mode = 'normal'; g.frightened = false;
      g.x = cc * T + T / 2; g.y = pas.r * T + T / 2;
    }
    ponPac(0, pas.c, pas.r, DR.RIGHT);

    /* UNO QUE SE CRUZA: se planta en mitad del camino DESPUÉS de lanzar, así
     * que no es el objetivo del misil ni está en su cola. Antes lo veía pasar
     * de largo; ahora lo arrolla. */
    for (n = 0; n < 4; n++) G.ghosts[n].mode = 'house';
    var medio = G.ghosts[0], lejos = G.ghosts[1];
    pon(lejos, pas.c + 6);
    var base = G.score;
    ok(H.misil(G, 0), 'sale el misil a por el del fondo');
    pon(medio, pas.c + 3);
    var tMedio = -1, tLejos = -1;
    for (n = 0; n < 400 && H.proyectilesCat.length; n++) {
      H.pasoProyectilesCat(G, true);
      if (tMedio < 0 && medio.mode === 'eyes') tMedio = n;
      if (tLejos < 0 && lejos.mode === 'eyes') tLejos = n;
    }
    eq(medio.mode, 'eyes', 'el que se cruza cae aunque no fuera su objetivo');
    eq(lejos.mode, 'eyes', 'y el del fondo cae igual');
    ok(tMedio >= 0 && tMedio < tLejos, 'primero el del camino, luego el objetivo');
    eq(G.score - base, 750, '250 + 500: la cadena de puntos sigue igual');
    ok(!H.proyectilesCat.length, 'y se apaga al quedarse sin nadie a quien ir');

    /* UNO DE SU PROPIA COLA: si lo atropella de paso, sale de la cola y no se
     * le vuelve a visitar. Se le da la vuelta a la cadena a mano porque el
     * misil apunta siempre al más cercano primero. */
    for (n = 0; n < 4; n++) G.ghosts[n].mode = 'house';
    var enCola = G.ghosts[0], blanco = G.ghosts[1];
    pon(enCola, pas.c + 3); pon(blanco, pas.c + 6);
    base = G.score;
    ok(H.misil(G, 0), 'sale otro misil');
    var b = H.proyectilesCat[0];
    b.objetivo = blanco.id; b.cola = [enCola.id]; b.ruta = null; b.rutaObjetivo = '';
    var colaAlCaer = null;
    for (n = 0; n < 400 && H.proyectilesCat.length; n++) {
      H.pasoProyectilesCat(G, true);
      if (colaAlCaer === null && enCola.mode === 'eyes') colaAlCaer = b.cola.slice();
    }
    ok(colaAlCaer && colaAlCaer.indexOf(enCola.id) < 0,
      'al atropellarlo lo tacha de la cola: no se le cobra dos veces');
    eq(enCola.mode, 'eyes', 'el de la cola cae por el camino');
    eq(blanco.mode, 'eyes', 'y el objetivo también');
    eq(G.score - base, 750, 'dos bajas y dos escalones de cadena, ni uno más');
  });

  /* DOMINIO (22 sep 2026) entra en la E del Mago en el sitio de NIEBLA. Lo
   * que hay que ver aquí es lo que NIEBLA no hacía: que el fantasma tocado
   * cambia de bando entero —caza a los suyos, no muerde al equipo— y que
   * devolverlo no sale gratis (vuelve aturdido un segundo). */
  test('AJUSTES: DOMINIO pone al fantasma tocado a cazar a los suyos', function () {
    var H = window.PM.Hab, HH = CFG.HAB, n;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['mago'], ['chispa,clon,dominio,eclipse']); G.roles = ['mago'];
    var t = tramoRecto(7);
    ok(t, 'hay un pasillo recto donde cruzarse');
    var p = ponPac(0, t.c, t.r, DR.RIGHT);
    var mio = G.ghosts[0], presa = G.ghosts[1];
    G.ghosts[2].mode = 'house'; G.ghosts[3].mode = 'house';
    mio.mode = 'normal'; mio.frightened = false;
    mio.x = (t.c + 1) * CFG.TILE + CFG.TILE / 2; mio.y = p.y;
    presa.mode = 'normal'; presa.frightened = false;
    presa.x = (t.c + 6) * CFG.TILE + CFG.TILE / 2; presa.y = p.y;   // de momento, lejos

    ok(H.dominio(G, 0), 'el toque alcanza al fantasma de al lado');
    eq(H.dominado[mio.id], HH.DOMINIO_TICKS, 'seis segundos es suyo');
    eq(H.dominaQuien[mio.id], 0, 'y son del Mago');
    eq(H.dominado[presa.id], 0, 'el de seis casillas no se entera: el toque llega a cuatro');

    /* CAZA: su objetivo deja de ser Pac-Man y pasa a ser el otro fantasma */
    var obj = H.objetivo(G, mio);
    ok(obj, 'tiene objetivo propio');
    eq(obj.x + ',' + obj.y, presa.tileX() + ',' + presa.tileY(), 'va a por el otro fantasma');

    /* NO MATA AL EQUIPO: el Mago le pasa por encima y sigue vivo */
    ok(H.apagado(mio.id), 'mientras es suyo no muerde al equipo');
    mio.x = p.x; mio.y = p.y; p.safeTicks = 0;
    ticks(3);
    ok(!p.dying, 'pasar por encima del dominado no mata');
    p.safeTicks = 999999;

    /* SE CRUZA CON OTRO: ese se va a casa y el Mago cobra 200 */
    var base = G.score;
    mio.x = (t.c + 3) * CFG.TILE + CFG.TILE / 2; mio.y = p.y;
    presa.x = mio.x + CFG.TILE / 4; presa.y = mio.y;
    H.pasoRoles(G, true);
    eq(presa.mode, 'eyes', 'al alcanzarlo lo manda a casa');
    eq(G.score - base, HH.DOMINIO_PUNTOS, 'y le da 200 al Mago');
    eq(HH.DOMINIO_PUNTOS, 200, 'que son 200, ni cadena ni multiplicadores');

    /* SE ACABA: vuelve a la normalidad, pero aturdido un segundo */
    for (n = 0; n < HH.DOMINIO_TICKS + 5 && H.dominado[mio.id] > 0; n++) H.pasoRoles(G, true);
    eq(H.dominado[mio.id], 0, 'se acaba a su hora');
    eq(H.dominaQuien[mio.id], -1, 'y deja de ser del Mago');
    eq(H.aturdido[mio.id], HH.DOMINIO_RESACA, 'vuelve aturdido un segundo');
    eq(H.objetivo(G, mio), null, 'ya no caza a nadie');
  });

  test('AJUSTES: NIEBLA se fue del catálogo y no quedó nada suyo', function () {
    var E = CFG.HAB.CATALOGO.mago[2].map(function (h) { return h.id; });
    ok(E.indexOf('niebla') < 0, 'la niebla ya no está en la E del Mago');
    ok(E.indexOf('dominio') >= 0, 'y DOMINIO ocupa su sitio');
    eq(CFG.HAB.CATALOGO.mago[2].filter(function (h) { return h.id === 'dominio'; })[0].cd,
      32 * 60, 'con la misma recarga que RUNA y GRAVEDAD');
    eq(window.PM.Hab.niebla, undefined, 'y la implementación no quedó colgando');
    eq(CFG.HAB.NIEBLA_TICKS, undefined, 'ni su número');
  });

  // ---------------------------------------------------------------
  // MAESTRÍAS DE ROL (js/maestria.js)
  // ---------------------------------------------------------------

  /* Guarda los contadores, deja hacer y los devuelve como estaban */
  function conContadores(fn) {
    var A = window.PM.Achievements, raw = null;
    try { raw = localStorage.getItem(CFG.ACH_KEY); } catch (e) { raw = null; }
    try { A.reset(); fn(A); }
    finally {
      if (raw === null) A.reset();
      else { try { localStorage.setItem(CFG.ACH_KEY, raw); } catch (e) {} }
    }
  }

  test('MAESTRÍA: la nota sale de lo que hace cada rol, por minuto en pie',
    function () {
      var Mae = window.PM.Maestria;
      // 5 minutos en pie, sin morir
      eq(Mae.notaDe('asesino', Mae.valor('asesino', { kills: 36 }, 0, 5)), 'S', '7,2 por minuto');
      eq(Mae.notaDe('asesino', Mae.valor('asesino', { kills: 18 }, 0, 5)), 'B', '3,6 por minuto');
      eq(Mae.notaDe('asesino', Mae.valor('asesino', { kills: 2 }, 0, 5)), 'D', 'casi nada');
      // el Tanque cuenta sus golpes aguantados, x3
      eq(Mae.notaDe('tanque', Mae.valor('tanque', { kills: 5 }, 5, 5)), 'B', '(15 + 5) / 5 = 4');
      // el Soporte, a quien levanta x3 y lo que reparte
      eq(Mae.notaDe('soporte', Mae.valor('soporte', { rescates: 4, apoyos: 6, kills: 5 }, 0, 5)), 'A',
         '(12 + 6 + 5) / 5 = 4,6');
    });

  test('MAESTRÍA: morir rebaja la nota', function () {
    var Mae = window.PM.Maestria;
    var limpio = Mae.valor('asesino', { kills: 36, muertes: 0 }, 0, 5);
    var sucio = Mae.valor('asesino', { kills: 36, muertes: 5 }, 0, 5);
    ok(sucio < limpio, 'cinco muertes pesan');
    eq(Mae.notaDe('asesino', sucio), 'B', 'y le quitan la S');
  });

  test('MAESTRÍA: los escalones altos piden notas S, no solo horas', function () {
    var Mae = window.PM.Maestria;
    eq(Mae.nivelDe(0, 0), -1, 'sin nada, ninguna');
    eq(Mae.nivelDe(4000, 0), 2, '4.000 puntos: EXPERTO');
    eq(Mae.nivelDe(50000, 0), 2, 'con 50.000 y ninguna S te quedas en EXPERTO');
    eq(Mae.nivelDe(50000, 1), 3, 'una S abre MAESTRO');
    eq(Mae.nivelDe(50000, 8), 5, 'y ocho, TOP MUNDIAL');
  });

  test('MAESTRÍA: una partida de DESATADO da puntos a tu rol al cerrarse',
    function () {
      conContadores(function (A) {
        var Mae = window.PM.Maestria;
        window.PM.settings.muted = true;
        G.newGame({ players: 1, hab: true, roles: ['tanque'] });
        G.state = 'PLAYING';
        G.timeTicks = 60 * 120;                  // dos minutos de partida
        G.marcador[0].vivo = 3600 * 2;           // y dos en pie
        G.marcador[0].kills = 4;
        G.salvasMias = 2;                        // (6 + 4) / 2 = 5 → A
        G.xpSent = false;
        G.closeRun();
        var r = G.runSummary.maestria;
        ok(r, 'el resumen del final la trae');
        eq(r.rol, 'tanque');
        eq(r.nota, 'A');
        eq(r.puntos, CFG.MAESTRIA.PUNTOS.A);
        eq(Mae.datos('tanque').puntos, CFG.MAESTRIA.PUNTOS.A, 'y se queda apuntada');
        eq(Mae.datos('asesino').puntos, 0, 'a otro rol no le toca nada');
        eq(A.stats().maevivas, 1, 'y consta como partida ya contada');
        G.toMenu();
      });
    });

  test('MAESTRÍA: una partida de menos de 45 s no da nada', function () {
    conContadores(function () {
      var Mae = window.PM.Maestria;
      window.PM.settings.muted = true;
      G.newGame({ players: 1, hab: true, roles: ['mago'] });
      G.state = 'PLAYING';
      G.timeTicks = 60 * 20;
      G.marcador[0].vivo = 60 * 20;
      G.marcador[0].kills = 9;
      G.xpSent = false;
      G.closeRun();
      ok(G.runSummary.maestria && G.runSummary.maestria.corta, 'se dice que no cuenta');
      eq(Mae.datos('mago').puntos, 0, 'y no suma');
      G.toMenu();
    });
  });

  test('MAESTRÍA: lo ya jugado se siembra una vez, y lo nuevo no se cuenta dos',
    function () {
      conContadores(function (A) {
        var Mae = window.PM.Maestria;
        var R = window.PM.Replay;
        var g1 = R.guardadas, g2 = R.guardadasRed;
        R.guardadas = function () { return []; };
        R.guardadasRed = function () { return []; };
        try {
          A.record('hab:partidas', 40);          // cuarenta partidas de antes
          Mae.sembrar();
          eq(Mae.datos('asesino').puntos, 40 * CFG.MAESTRIA.SEMBRADA, 'al Asesino, como una B');
          eq(Mae.datos('asesino').sembradas, 40);
          Mae.sembrar();
          eq(Mae.datos('asesino').puntos, 40 * CFG.MAESTRIA.SEMBRADA, 'sembrar otra vez no suma');
          // una partida nueva sube hab:partidas y maevivas a la vez
          A.record('hab:partidas', 1);
          Mae.anotarViva();
          Mae.sembrar();
          eq(Mae.datos('asesino').sembradas, 40, 'la nueva no se siembra: ya la contó el cierre');
        } finally { R.guardadas = g1; R.guardadasRed = g2; }
      });
    });

  test('MAESTRÍA: Ctrl+Espacio en DESATADO enseña el emblema de tu rol',
    function () {
      window.PM.settings.muted = true;
      G.newGame({ players: 1, hab: true, roles: ['soporte'] });
      G.state = 'PLAYING';
      G.emoteCooldown = 0;
      G.sendBadgeTag();
      var e = G.emotes[0];
      ok(e && e.dib === 'emblema', 'con el emblema, no con la copa');
      G.emotes[0] = null;
      G.emoteCooldown = 0;
      G.sendBadgeTag(1);
      ok(G.emotes[0] && G.emotes[0].dib !== 'emblema', 'F1 sigue siendo el trofeo');
      G.toMenu();
    });

  test('MAESTRÍAS: el panel enseña los seis emblemas del rol elegido', function () {
    var UI = window.PM.UI;
    UI.showMaestrias('mago');
    eq(UI.maeList.children.length, CFG.MAESTRIA.NIVELES.length, 'los seis');
    eq(UI.maeRol, 'mago');
    ok(UI.maeK.textContent.indexOf('MAGO') !== -1, 'dice de qué rol es');
    UI.showMenu();
  });

  // ---------------------------------------------------------------
  // RANGO de temporada y CLASIFICATORIAS (js/rango.js)
  // ---------------------------------------------------------------

  test('RANGO: lo que da o quita una partida sale de tu marca contra tu par',
    function () {
      var Rg = window.PM.Rango;
      // en CEREZA (0 PR) a uno el par son 1.500
      eq(Rg.cambio(1500, 0, 1), 5, 'igualar tu par sube un poco');
      eq(Rg.cambio(3000, 0, 1), 30, 'el doble, +30');
      eq(Rg.cambio(750, 50, 1), -20, 'la mitad, −20');
      eq(Rg.cambio(999999, 0, 1), CFG.RANGO.MAX_GANA, 'con tope por arriba');
      eq(Rg.cambio(0, 250, 1), -CFG.RANGO.MAX_PIERDE, 'y por abajo');
      // en equipo el par se multiplica como los trofeos
      eq(Rg.cambio(1500 * 1.25, 0, 2), 5, 'en dúo, un cuarto más');
    });

  test('RANGO: la colocación te pone donde dice tu media', function () {
    var Rg = window.PM.Rango, D = CFG.RANGO.DIVISIONES;
    eq(Rg.division(Rg.colocar(0, 1)), 0, 'sin nada, CEREZA');
    eq(Rg.division(Rg.colocar(D[3].par, 1)), 3, 'con el par de MANZANA, MANZANA');
    eq(Rg.division(Rg.colocar(D[7].par * 3, 1)), 7, 'muy arriba, LLAVE');
  });

  test('RANGO: cinco de colocación, luego sube y baja, y nunca por debajo de cero',
    function () {
      conContadores(function () {
        var Rg = window.PM.Rango, RG = CFG.RANGO;
        var logged = Rg.conCuenta;
        Rg.conCuenta = function () { return true; };
        try {
          window.PM.settings.muted = true;
          var jugar = function (puntos) {
            G.newGame({ players: 1, hab: true, clasif: true, roles: ['asesino'] });
            G.state = 'PLAYING';
            G.score = puntos;
            return Rg.cerrar(G);
          };
          for (var i = 1; i < RG.COLOCACION; i++) {
            var r = jugar(RG.DIVISIONES[2].par);
            ok(r.colocando, 'la ' + i + '.ª aún coloca');
            eq(r.cambio, 0, 'y no mueve nada');
          }
          var ultima = jugar(RG.DIVISIONES[2].par);
          ok(ultima.colocado, 'la quinta te coloca');
          eq(ultima.division, 2, 'en NARANJA, que es donde está tu media');
          var pr = Rg.estado(1).pr;
          var mala = jugar(0);
          eq(mala.cambio, -RG.MAX_PIERDE, 'una partida en blanco quita el máximo');
          eq(Rg.estado(1).pr, pr - RG.MAX_PIERDE);
          for (var k = 0; k < 20; k++) jugar(0);
          eq(Rg.estado(1).pr, 0, 'en el suelo se queda en cero');
          var buena = jugar(RG.DIVISIONES[0].par * 2);
          eq(buena.cambio, 30, 'y lo primero que ganas cuenta entero: no hay deuda');
          G.toMenu();
        } finally { Rg.conCuenta = logged; }
      });
    });

  test('RANGO: solo en el modo CLASIFICATORIA y con cuenta; con cualquier rol, sí', function () {
    var Rg = window.PM.Rango;
    var logged = Rg.conCuenta;
    try {
      window.PM.settings.muted = true;
      G.newGame({ players: 1, hab: true, roles: ['asesino'] });
      Rg.conCuenta = function () { return true; };
      eq(Rg.porQueNo(G), 'NO ES CLASIFICATORIA', 'el DESATADO de siempre no toca el rango');
      G.newGame({ players: 1, hab: true, clasif: true, roles: ['asesino'] });
      ok(G.clasif, 'la partida sale marcada');
      Rg.conCuenta = function () { return false; };
      eq(Rg.porQueNo(G), 'HACE FALTA CUENTA');
      Rg.conCuenta = function () { return true; };
      eq(Rg.porQueNo(G), null, 'con todo en regla, sí');
      G.newGame({ players: 1, hab: true, clasif: true, roles: ['mago'] });
      eq(Rg.porQueNo(G), null, 'a uno con Mago también cuenta (práctica solo para récords)');
      G.newGame({ players: 1, clasif: true });
      ok(!G.clasif, 'sin DESATADO no hay clasificatoria');
      eq(Rg.porQueNo(G), 'SOLO EN DESATADO');
      G.toMenu();
      ok(!G.clasif, 'y al salir se apaga');
    } finally { Rg.conCuenta = logged; }
  });

  test('ICONOS: cada poder del catálogo y cada rol tiene su dibujo', function () {
    var I = window.PM.Iconos, H = CFG.HAB, faltan = [];
    ok(I, 'el módulo está cargado');
    H.ROL_IDS.forEach(function (r) {
      if (!I.ROLES[r]) faltan.push('rol ' + r);
      H.catalogoDe(r).forEach(function (fila) {
        fila.forEach(function (h) { if (!I.tiene(h.id)) faltan.push(h.id); });
      });
    });
    (H.LIST_G || []).forEach(function (h) { if (!I.tiene(h.id)) faltan.push(h.id); });
    eq(faltan.join(', '), '', 'ninguno se queda con el genérico');
  });

  test('TROFEOS POR ROL: cada rol su récord y sus copas, y a uno cuenta con cualquiera', function () {
    conContadores(function () {
      var B = window.PM.Badges;
      var vistos = null;
      try { vistos = localStorage.getItem(CFG.BADGES_KEY); localStorage.removeItem(CFG.BADGES_KEY); } catch (e) {}
      window.PM.settings.muted = true;
      /* a uno con TANQUE: antes era práctica sin nada; ahora es su récord */
      G.newGame({ players: 1, hab: true, roles: ['tanque'] });
      G.state = 'PLAYING';
      G.score = 20000;
      G.persistHighScore();
      eq(B.recordRol('tanque', 1), 20000, 'el récord del Tanque a uno');
      eq(B.recordRol('asesino', 1), 0, 'y no el del Asesino');
      eq(B.best(B.rutaRol('tanque', 1)), 20000, 'su ruta lo ve');
      ok(B.best(B.ruta('hab', 1)) >= 20000, 'TODOS LOS ROLES se queda con lo mejor de cualquiera');
      var copa = B.claim(20000, B.rutaRol('tanque', 1));
      ok(copa, 'y le da su copa');
      ok(!B.claim(20000, B.rutaRol('tanque', 1)), 'que no se vuelve a anunciar');
      eq(B.modeName(B.rutaRol('tanque', 2)), 'DESATADO · TANQUE · DÚO', 'con su nombre');
      /* en el mismo teclado, los dos roles */
      G.newGame({ players: 2, hab: true, roles: ['mago', 'soporte'] });
      G.state = 'PLAYING';
      G.score = 30000;
      G.persistHighScore();
      eq(B.recordRol('mago', 2), 30000, 'el del Mago en dúo');
      eq(B.recordRol('soporte', 2), 30000, 'y el del Soporte');
      G.toMenu();
      try {
        if (vistos === null) localStorage.removeItem(CFG.BADGES_KEY);
        else localStorage.setItem(CFG.BADGES_KEY, vistos);
      } catch (e) {}
    });
  });

  test('TROFEOS POR ROL: lo ya jugado se reparte y no se pierde ninguna copa', function () {
    conContadores(function () {
      var B = window.PM.Badges, R = window.PM.Replay;
      var KEY = 'pacman-topmundial-rhab-sembrado';
      var previo = [G.recordModo('hab', 1), G.recordModo('hab', 2)];
      var loc = R.guardadas, red = R.guardadasRed;
      try {
        localStorage.removeItem(KEY);
        G.setRecordModo('hab', 50000, 1);
        G.setRecordModo('hab', 40000, 2);
        /* una repetición de dúo que explica el récord de dúo: con Mago */
        var rep = { v: 1, modo: 'habduo', semilla: null, nivel: 1, jugadores: 2,
          ajustes: { velFantasmas: 1, velPac: 1, powerS: 1, vidas: 3, roles: ['mago', 'tanque'] },
          nombres: ['A', 'B'], fecha: '2026-09-01T00:00:00.000Z', entradas: [[0, 0, 1]],
          final: { puntos: 40000, nivel: 3, fantasmas: 1, tiempoMs: 1000 } };
        R.guardadas = function () { return [{ s: R.serializar(rep) }]; };
        R.guardadasRed = function () { return []; };
        B.sembrarRoles();
        eq(B.recordRol('asesino', 1), 50000, 'a uno, lo de siempre era del Asesino');
        eq(B.recordRol('mago', 2), 40000, 'el dúo lo explica la repetición: del Mago');
        eq(B.recordRol('tanque', 2), 40000, 'y de su compañero');
        eq(B.recordRol('asesino', 2), 0, 'así que al Asesino no se le regala');
        B.sembrarRoles();
        ok(localStorage.getItem(KEY), 'una sola vez por aparato');
      } finally {
        R.guardadas = loc; R.guardadasRed = red;
        G.setRecordModo('hab', previo[0], 1);
        G.setRecordModo('hab', previo[1], 2);
      }
    });
  });

  test('CACERÍA contra el REY: no te mata, y al tocarlo le quita vida', function () {
    var H = window.PM.Hab, J = window.PM.Jefe;
    partida(1); G.hab = true;
    H.empezar(true, 1, ['asesino'], ['mordisco,turbo,flash,caceria']); G.roles = ['asesino'];
    var p = G.pacs[0];
    p.safeTicks = 0;
    G.jefe = { vivo: true, hp: 20, max: 20, x: p.x, y: p.y, dir: 0, st: 'caza', stT: 0, inv: 0, frz: 0,
               azulUsado: 0, huye: 0, huyeDe: -1, golpeado: 0, plan: -1 };
    G.frightTicks = 0;
    ok(J.mata(G, 0), 'sin cacería, tocarlo mata');
    ok(H.caceria(G, 0), 'sale la cacería');
    ok(!J.mata(G, 0), 'con ella, no');
    J.colisiones(G);
    eq(G.jefe.hp, 20 - CFG.JEFE.DANO.caceria, 'y el toque le quita vida');
    ok(!p.dying, 'el cazador sigue vivo');
    J.colisiones(G);
    eq(G.jefe.hp, 20 - CFG.JEFE.DANO.caceria, 'una vez por cada respiro del rey, no a cada tick');
    G.toMenu();
  });

  test('ARMARIO: cada poder tiene su explicación larga', function () {
    var H = CFG.HAB, faltan = [];
    H.ROL_IDS.forEach(function (r) {
      H.catalogoDe(r).forEach(function (fila) {
        fila.forEach(function (h) { if (!(H.DETALLE && H.DETALLE[h.id])) faltan.push(h.id); });
      });
    });
    (H.LIST_G || []).forEach(function (h) { if (!(H.DETALLE && H.DETALLE[h.id])) faltan.push(h.id); });
    eq(faltan.join(', '), '', 'ninguno se queda con la frase corta');
  });

  test('CLASIFICATORIA en party: el líder la elige y viaja en la lista y en la salida', function () {
    var P = window.PM.Party, Net = window.PM.Net;
    var st = P.st, hab = P.habPick, cl = P.clasifPick, envia = Net.send, mandados = [];
    Net.send = function (n, d) { mandados.push([n, d]); };
    try {
      P.st = { status: 'dentro', leader: true, members: [] };
      P.setModo('clasif');
      ok(P.habPick && P.clasifPick, 'es DESATADO con rango');
      var lista = mandados.filter(function (m) { return m[0] === 'proster'; }).pop();
      ok(lista && lista[1].hab && lista[1].cl, 'la lista lo lleva');
      P.setModo('hab');
      ok(P.habPick && !P.clasifPick, 'volver a DESATADO lo quita');
      P.st.leader = false;
      P.onRoster({ v: CFG.NET.PROTO, lider: 'x', m: [{ s: Net.sid, n: 'YO' }], hab: true, cl: true });
      ok(P.clasifPick, 'el invitado lo toma de la lista del líder');
    } finally { P.st = st; P.habPick = hab; P.clasifPick = cl; Net.send = envia; }
  });

  test('RANGO: sus contadores viajan con la cuenta y se funden sin perder nada',
    function () {
      conContadores(function (A) {
        var t = window.PM.Rango.temporada();
        A.record('rg_' + t + '_1', 40);
        A.merge({ ['rg_' + t + '_1']: 90, ['rl_' + t + '_1']: 10 });
        eq(A.stats()['rg_' + t + '_1'], 90, 'lo ganado en el otro aparato llega');
        eq(A.stats()['rl_' + t + '_1'], 10, 'y lo perdido también');
      });
    });

  test('RANGO: el panel sale con la fruta, el botón de CLASIFICATORIA y la tabla', function () {
    var UI = window.PM.UI;
    UI.buildRango();
    UI.refreshRango();
    eq(UI.rangoToggle.textContent, 'JUGAR CLASIFICATORIA', 'ya no es un interruptor: lleva al modo');
    ok(UI.rangoName.textContent.length > 0, 'y tu rango (o que aún no lo tienes)');
  });

  test('RANGO: la insignia abre la escalera entera, con tu división marcada', function () {
    var UI = window.PM.UI, Rg = window.PM.Rango, D = CFG.RANGO.DIVISIONES;
    var est0 = Rg.estado, t0 = UI.rangoTabla;
    Rg.estado = function () {
      return { temporada: 'x', n: 1, jugadas: 9, colocacion: 5, pr: 237, division: 2, enDivision: 37, mejor: 2 };
    };
    UI.rangoTabla = { n: 1, filas: [{ usuario: 'A', division: 2, pr: 210 }, { usuario: 'B', division: 4, pr: 420 }] };
    try {
      UI.buildRango();
      UI.refreshRango();
      ok(UI.rangoHero.parentNode.classList.contains('rango-insignia'), 'la fruta va dentro de un botón');
      UI.rangoHero.parentNode.click();
      var p = UI.els.prompt;
      var filas = p.querySelectorAll('.rgs-fila:not(.rgs-cab)');
      eq(filas.length, D.length, 'una fila por división');
      ok(filas[0].textContent.indexOf(D[D.length - 1].name) !== -1, 'la más alta arriba');
      var mia = p.querySelectorAll('.rgs-fila.yo');
      eq(mia.length, 1, 'solo una marcada');
      ok(mia[0].textContent.indexOf(D[2].name) !== -1, 'y es la tuya');
      ok(mia[0].textContent.indexOf('TE FALTAN 63') !== -1, 'con lo que te falta para subir');
      ok(filas[D.length - 1 - 2].querySelector('.rgs-cuantos').textContent === '1', 'y cuántos hay en ella este mes');
      ok(filas[D.length - 1 - 2].querySelector('.rgs-marca').textContent === UI.milesMaes(Rg.par(2, 1)), 'y la marca a superar');
    } finally {
      Rg.estado = est0;
      UI.rangoTabla = t0;
      UI.hidePrompt();
    }
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
