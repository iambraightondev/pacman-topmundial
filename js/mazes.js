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
   * Arriba, tres bloques altos con pasillos entre ellos y una banda ancha
   * a media altura; abajo, una plaza abierta donde sale Pac-Man con dos
   * hileras de pilares por delante. Se corre mucho en horizontal, que es
   * lo que hace falta para escaparse de un fantasma pegado. */
  var ANILLOS = montar([
    '##############',   //  0
    '#.............',   //  1
    '#.###.###.####',   //  2
    '#o###.###.####',   //  3  energizante de la esquina de arriba
    '#.###.###.####',   //  4
    '#.............',   //  5
    '#.#####.##.###',   //  6
    '#.....#.##.###',   //  7
    '#.............'    //  8
  ], [
    '#.............',   // 20
    '#.###.####.###',   // 21
    '#.###.####.###',   // 22
    '#o........... ',   // 23  salida de Pac-Man (13.5, 23) y esquina de abajo
    '#.##.##.##.###',   // 24  pilares por delante de la salida
    '#.##.##.##.###',   // 25
    '#.............',   // 26
    '#.####.#####.#',   // 27
    '#.####.#####.#',   // 28
    '#.............',   // 29
    '##############'    // 30
  ]);

  /* ---------- PANAL ----------
   * Celdas pequeñas arriba (muchos cruces seguidos: se gira mucho y se
   * corre poco) y bloques largos abajo, con las esquinas de abajo metidas
   * en un pasillo que solo se sale por los lados. Es el más cerrado de
   * los tres, pero sin un solo callejón. */
  var PANAL = montar([
    '##############',   //  0
    '#.............',   //  1
    '#.##.##.##.###',   //  2
    '#o##.##.##.###',   //  3
    '#.............',   //  4
    '#.####.####.##',   //  5
    '#.####.####.##',   //  6
    '#.####.####.##',   //  7
    '#.............'    //  8
  ], [
    '#.............',   // 20
    '#.##.#####.###',   // 21
    '#.##.#####.###',   // 22
    '#o........... ',   // 23
    '#####.###.####',   // 24
    '#####.###.####',   // 25
    '#.............',   // 26
    '#.###.####.###',   // 27
    '#.###.####.###',   // 28
    '#.............',   // 29
    '##############'    // 30
  ]);

  /* ---------- COLMILLOS ----------
   * Dos pasillos larguísimos arriba y abajo pegados al borde, con
   * dientes que bajan del techo. El que sabe correr por el borde se
   * salva; el que se mete por el centro, no. */
  var COLMILLOS = montar([
    '##############',   //  0
    '#.............',   //  1
    '#.##.###.###.#',   //  2
    '#o##.###.###.#',   //  3
    '#.##.###.###.#',   //  4
    '#.............',   //  5
    '###.#####.####',   //  6
    '#...#####.####',   //  7  el borde vuelve a abrirse: sin esto, callejón
    '#.............'    //  8
  ], [
    '#.............',   // 20
    '#.####.####.##',   // 21
    '#.####.####.##',   // 22
    '#o........... ',   // 23
    '#.####.####.##',   // 24
    '#.####.####.##',   // 25
    '#.............',   // 26
    '###.######.###',   // 27
    '#...######.###',   // 28
    '#.............',   // 29
    '##############'    // 30
  ]);

  var Mazes = {
    LIST: [
      { id: 'anillos', name: 'ANILLOS',
        desc: 'PASILLOS LARGOS: SE CORRE MUCHO EN HORIZONTAL',
        rows: ANILLOS, pellets: cuenta(ANILLOS) },
      { id: 'panal', name: 'PANAL',
        desc: 'CELDAS PEQUEÑAS Y CRUCES SEGUIDOS: SE GIRA SIN PARAR',
        rows: PANAL, pellets: cuenta(PANAL) },
      { id: 'colmillos', name: 'COLMILLOS',
        desc: 'DIENTES EN EL CENTRO Y CARRERA LIBRE POR EL BORDE',
        rows: COLMILLOS, pellets: cuenta(COLMILLOS) }
    ],

    byId: function (id) {
      for (var i = 0; i < this.LIST.length; i++) {
        if (this.LIST[i].id === id) return this.LIST[i];
      }
      return null;
    },

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
