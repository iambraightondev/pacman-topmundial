/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/mazes.js
 * Laberintos alternativos. Define window.PM.Mazes
 *
 * Son un MODO APARTE (LABERINTOS). El clásico de 1980 no se toca:
 * la fidelidad al arcade es lo que sostiene los patrones
 * memorizados, y jugarlos en otro plano no tendría sentido. Estas
 * partidas no entran en el top mundial (sí en el nivel de jugador).
 *
 * Cada laberinto se dibuja a mano, pero solo su MITAD IZQUIERDA:
 * el juego la refleja para tener las 28 columnas. Así la simetría
 * sale gratis, que es la que da el aire del original.
 *
 * Lo que NO cambia nunca, porque el motor cuenta con ello:
 *  - las filas 9 a 19, que son la casa de fantasmas, la puerta, el
 *    túnel de la fila 14 y las zonas sin subir (se copian del
 *    clásico tal cual, no se escriben a mano);
 *  - la salida de Pac-Man (13.5, 23) y la de Blinky (13.5, 11);
 *  - la fruta (13.5, 17) y el borde exterior.
 * Lo demás —filas 0 a 8 y 20 a 30— es terreno libre.
 *
 * Reglas de dibujo (las comprueba js/tests.js):
 *  - sin casillas inalcanzables: todo se llega desde la salida;
 *  - sin callejones: cada casilla de pasillo tiene al menos dos
 *    salidas, o los fantasmas se quedarían encerrados y la
 *    persecución dejaría de funcionar;
 *  - energizantes en las cuatro esquinas;
 *  - el número de pastillas declarado tiene que cuadrar.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  /* Mitad izquierda (14 columnas) -> fila completa de 28 */
  function espejo(mitad) {
    return mitad + mitad.split('').reverse().join('');
  }

  /* Filas 9-19 del clásico: casa de fantasmas, puerta y túnel */
  function nucleo() {
    return CFG.MAZE_CLASSIC.slice(9, 20);
  }

  /* arriba: mitades de las filas 0-8 · abajo: mitades de las filas 20-30 */
  function montar(arriba, abajo) {
    var rows = [], i;
    for (i = 0; i < arriba.length; i++) rows.push(espejo(arriba[i]));
    var med = nucleo();
    for (i = 0; i < med.length; i++) rows.push(med[i]);
    for (i = 0; i < abajo.length; i++) rows.push(espejo(abajo[i]));
    return rows;
  }

  function cuenta(rows) {
    var n = 0;
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        var ch = rows[r].charAt(c);
        if (ch === '.' || ch === 'o') n++;
      }
    }
    return n;
  }

  /* ---------- ANILLOS ----------
   * Anillos concéntricos: cuatro marcos metidos uno dentro de otro, cada
   * uno con su vuelta completa. Se juega dando vueltas y decidiendo cuándo
   * saltar de un anillo al de dentro —los saltos están contados y no caen
   * en el mismo sitio arriba que abajo—, así que un fantasma pegado no se
   * quita corriendo: se quita cambiando de anillo en el momento justo.
   *
   * Antes este nombre lo llevaba una rejilla de bloques que de anillos no
   * tenía nada; ahora hace lo que dice. */
  var ANILLOS = montar([
    '##############',   //  0
    '#.............',   //  1  anillo exterior
    '#.##########.#',   //  2
    '#o#........#.#',   //  3  anillo 2
    '#.#.######.#.#',   //  4
    '#.#.#....#.#.#',   //  5  anillo 3
    '#.#.#.##.#.#.#',   //  6  y el corazón, de dos casillas
    '#.#.#....#.#.#',   //  7
    '#...#....#...#'    //  8  los saltos entre anillos, todos en esta fila
  ], [
    '#............#',   // 20
    '#.##########.#',   // 21
    '#o#........#.#',   // 22
    '#.#.######.#. ',   // 23  salida de Pac-Man (13.5, 23)
    '#.#.#....#.#.#',   // 24
    '#.#.#.##.#.#.#',   // 25
    '#.#.#....#.#.#',   // 26
    '#...#....#...#',   // 27
    '#.####.#####.#',   // 28  y aquí baja el anillo de dentro
    '#............#',   // 29
    '##############'    // 30
  ]);

  /* ---------- PANAL ----------
   * Celdas de tamaños distintos (de dos y de cuatro) alternando su
   * posición cada dos filas, como un panal de verdad: nunca hay dos
   * cruces seguidos a la misma distancia, así que no se puede ir en
   * piloto automático. Es el de más pastillas y el más laberíntico de
   * llevar en la cabeza. */
  var PANAL = montar([
    '##############',   //  0
    '#.............',   //  1
    '#.##.####.##.#',   //  2
    '#o##.####.##.#',   //  3
    '#.............',   //  4
    '#.####.##.####',   //  5  las celdas se corren media casilla
    '#.####.##.####',   //  6
    '#.............',   //  7
    '#..##..#..##..'    //  8
  ], [
    '#.............',   // 20
    '#.####.##.####',   // 21
    '#.####.##.####',   // 22
    '#o........... ',   // 23
    '#.##.####.##.#',   // 24
    '#.##.####.##.#',   // 25
    '#.............',   // 26
    '#.####.##.####',   // 27
    '#.####.##.####',   // 28
    '#.............',   // 29
    '##############'    // 30
  ]);

  /* ---------- COLMILLOS ----------
   * Colmillos de verdad: seis filas de dientes de una sola casilla, sin
   * un mísero atajo. Metes a Pac-Man por un hueco y ya no hay marcha
   * atrás hasta el otro extremo, y los de abajo van corridos respecto a
   * los de arriba, así que salir de uno no te deja delante de otro.
   * El más despiadado: aquí se elige el carril como quien elige puerta. */
  var COLMILLOS = montar([
    '##############',   //  0
    '#.............',   //  1
    '#.#.#.#.#.#.#.',   //  2
    '#o#.#.#.#.#.#.',   //  3
    '#.#.#.#.#.#.#.',   //  4
    '#.#.#.#.#.#.#.',   //  5
    '#.#.#.#.#.#.#.',   //  6
    '#.#.#.#.#.#.#.',   //  7
    '#.............'    //  8
  ], [
    '#.............',   // 20
    '#..#.#.#.#.#.#',   // 21  los de abajo, corridos una casilla
    '#..#.#.#.#.#.#',   // 22
    '#o........... ',   // 23
    '#.#.#.#.#.#.#.',   // 24
    '#.#.#.#.#.#.#.',   // 25
    '#.#.#.#.#.#.#.',   // 26
    '#.#.#.#.#.#.#.',   // 27
    '#.#.#.#.#.#.#.',   // 28
    '#.............',   // 29
    '##############'    // 30
  ]);

  /* ---------- ESCALERA ----------
   * Una escalera: el paso baja en diagonal, un tramo a cada altura, y
   * arriba y abajo bajan por lados distintos. No hay ni una fila que
   * cruce el laberinto de lado a lado, así que ir de una esquina a la
   * otra obliga a hacer todos los rellanos. El más cerrado de los seis
   * (y el que menos pastillas tiene), pensado para partidas largas. */
  var ESCALERA = montar([
    '##############',   //  0
    '#.............',   //  1
    '#.##.#########',   //  2
    '#o##.#########',   //  3
    '#.##.....#####',   //  4  primer rellano
    '#.######.#####',   //  5
    '#.######.#####',   //  6
    '#........#####',   //  7  segundo rellano
    '#......#####..'    //  8
  ], [
    '#.............',   // 20
    '#.###.########',   // 21
    '#.###.########',   // 22
    '#o........... ',   // 23
    '#.#######.####',   // 24
    '#.#######.####',   // 25
    '#.......#.####',   // 26
    '#.#####.#.####',   // 27
    '#.#####...####',   // 28
    '#.............',   // 29
    '##############'    // 30
  ]);

  /* ---------- CATEDRAL ----------
   * Naves verticales larguísimas, como las columnas de una catedral, y
   * apenas dos crucerías que las comunican a media altura (y no a la
   * misma altura en cada lado). Es el reverso de ANILLOS: aquí se juega
   * subiendo y bajando, no dando vueltas, y equivocarse de nave cuesta
   * el largo entero. */
  var CATEDRAL = montar([
    '##############',   //  0
    '#.............',   //  1
    '#.##.#.##.#.##',   //  2
    '#o##.#.##.#.##',   //  3
    '#....#.##.#.##',   //  4  crucería de la izquierda
    '#.##.#....#.##',   //  5  y la del centro, una fila más abajo
    '#.##.#.##.#.##',   //  6
    '#.##.#.##.#.##',   //  7
    '#............#'    //  8
  ], [
    '#...........##',   // 20
    '#.##.#.##.#.##',   // 21
    '#.##.#.##.#.##',   // 22
    '#o........... ',   // 23
    '#.##.#.##.#.##',   // 24
    '#.##.#....#.##',   // 25
    '#....#.##.#.##',   // 26
    '#.##.#.##.#.##',   // 27
    '#.##.#.##.#.##',   // 28
    '#.............',   // 29
    '##############'    // 30
  ]);

  /* ---------- SERPIENTE ----------
   * Pasillos de lado a lado con los huecos a contrapié: para bajar una
   * fila hay que cruzar el laberinto entero hasta el hueco, y el
   * siguiente está en la punta contraria. Se corre como en ningún otro,
   * pero siempre en la dirección que toca. El pozo del centro de cada
   * tramo es la única salida rápida, y por eso está donde está. */
  var SERPIENTE = montar([
    '##############',   //  0
    '#.............',   //  1
    '#.#####.######',   //  2
    '#o............',   //  3
    '#######.#####.',   //  4  el hueco cambia de punta
    '#.............',   //  5
    '#.#####.######',   //  6
    '#.............',   //  7
    '#......#####..'    //  8
  ], [
    '##............',   // 20
    '##.##########.',   // 21
    '#.............',   // 22
    '#o........... ',   // 23
    '#.##.#########',   // 24
    '#.............',   // 25
    '####.########.',   // 26
    '#.............',   // 27
    '#.##.#########',   // 28
    '#.............',   // 29
    '##############'    // 30
  ]);

  var Mazes = {
    /* El orden es el de la lista del panel, y va de menos a más difícil de
     * llevar en la cabeza: primero los dos que se leen de un vistazo y al
     * final los tres que hay que aprenderse. */
    LIST: [
      { id: 'anillos', name: 'ANILLOS',
        desc: 'CUATRO ANILLOS METIDOS UNO EN OTRO: SE JUEGA DANDO VUELTAS',
        rows: ANILLOS, pellets: cuenta(ANILLOS) },
      { id: 'panal', name: 'PANAL',
        desc: 'CELDAS DE DOS TAMAÑOS Y A CONTRAPIÉ: NADA SALE DONDE ESPERAS',
        rows: PANAL, pellets: cuenta(PANAL) },
      { id: 'catedral', name: 'CATEDRAL',
        desc: 'NAVES VERTICALES ENORMES Y DOS PASOS ENTRE ELLAS',
        rows: CATEDRAL, pellets: cuenta(CATEDRAL) },
      { id: 'serpiente', name: 'SERPIENTE',
        desc: 'PASILLOS DE PUNTA A PUNTA CON LOS HUECOS A CONTRAPIÉ',
        rows: SERPIENTE, pellets: cuenta(SERPIENTE) },
      { id: 'colmillos', name: 'COLMILLOS',
        desc: 'SEIS FILAS DE DIENTES SIN ATAJOS: ELIGES CARRIL Y TE AGUANTAS',
        rows: COLMILLOS, pellets: cuenta(COLMILLOS) },
      { id: 'escalera', name: 'ESCALERA',
        desc: 'RELLANOS EN DIAGONAL Y NI UNA FILA QUE CRUCE ENTERA',
        rows: ESCALERA, pellets: cuenta(ESCALERA) }
    ],

    byId: function (id) {
      for (var i = 0; i < this.LIST.length; i++) {
        if (this.LIST[i].id === id) return this.LIST[i];
      }
      return null;
    },

    /* ¿Existe ese laberinto? Lo pregunta la repetición de red antes de
     * reproducir: si la partida se jugó en un trazado que ya no existe, o en
     * una versión anterior de uno que se rehizo, reproducirla enseñaría a un
     * Pac-Man atravesando muros. Más vale decir que la repetición no vale. */
    conocido: function (id) { return !id || !!this.byId(id); },

    /* Pone un laberinto en juego. Sin id (o con uno que no existe) vuelve
     * el clásico, que es lo que tiene que pasar al salir del modo. */
    apply: function (id) {
      var m = id ? this.byId(id) : null;
      CFG.setMaze(m ? m.rows : null);
      return m;
    }
  };

  window.PM.Mazes = Mazes;
})();
