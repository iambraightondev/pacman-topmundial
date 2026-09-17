/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/habilidades.js
 * Modo DESATADO. Define window.PM.Hab
 *
 * Cuatro poderes con tecla propia y recarga independiente:
 *
 *   Q  MORDISCO  se merienda al fantasma que tenga a una casilla,
 *                mire hacia donde mire, y se gira hacia él.
 *   W  TURBO     x1.5 de velocidad durante 5 s, echando chispas.
 *   E  FLASH     tres casillas ATRAVESANDO MUROS hacia la última
 *                flecha pulsada —mire Pac-Man hacia donde mire—,
 *                comiéndose lo que haya por el camino.
 *   R  GRITO     los cuatro fantasmas se asustan 6 s, sin haber
 *                tocado una superpastilla.
 *
 * Ese es el kit del ASESINO. Cada jugador elige ROL antes de
 * empezar (CFG.HAB.ROLES): el TANQUE protege (PROVOCAR, ESCUDO,
 * PISOTÓN, ARROLLAR), el SOPORTE cura y controla (HIELO,
 * INMUNIDAD, ESCUDO ALIADO, VIDA) y el MAGO mata a distancia
 * (FUEGO, PORTAL, RUNA, TORMENTA). Las teclas son las mismas; lo
 * que se lanza se decide por el id del poder, no por su tecla.
 *
 * Tiene su propio top mundial y sus récords. A un jugador, con un
 * rol que no sea el Asesino, la partida es de PRÁCTICA: da
 * experiencia y logros, pero no récords ni maestrías.
 *
 * Dónde se juega
 *   En todas partes: solo, dos en el mismo teclado, party online
 *   y PAC-MAN VS. Los dos sitios donde no estaba tenían cada uno
 *   su problema, y cada uno se arregló por su lado:
 *
 *   · DOS EN EL MISMO TECLADO. La W era el "arriba" del J2 y el
 *     turbo del J1, y una tecla no puede hacer dos cosas. Ahora
 *     cada jugador tiene una fila entera en su mitad del teclado
 *     (CFG.HAB.KEYS_2P): el J1 mueve con flechas y usa N M , . ,
 *     y el J2 mueve con WASD y usa Z X C V. En solo y en online
 *     siguen siendo Q W E R, que es donde está la costumbre.
 *
 *   · PAC-MAN VS. Morder de un golpe a un fantasma que lleva una
 *     persona, sin que pueda hacer nada, no es una pelea. Ahora
 *     quien lleva fantasma tiene los suyos (CFG.HAB.LIST_G):
 *     EMBESTIDA para cerrar la distancia y ACECHO para volverse
 *     translúcido y quitarse la marca que lo delata. Son dos y no
 *     cuatro porque un fantasma solo persigue: no come, no
 *     atraviesa muros y no asusta a nadie.
 *
 * Quién manda (online)
 *   Lo que solo te toca a ti —TURBO y FLASH— se aplica en tu
 *   máquina en el acto, sin esperar a nadie: tu Pac-Man ya lo
 *   simulas tú, y su posición viaja como siempre. Lo que toca a
 *   los fantasmas —MORDISCO y GRITO— lo ejecuta el ANFITRIÓN,
 *   igual que comerse un fantasma azul: tú pides, él decide y lo
 *   reparte. Así dos jugadores no pueden morder al mismo fantasma
 *   ni contarlo dos veces.
 *
 *   Si el anfitrión rechaza la petición (por recarga), la tecla
 *   se pierde y la recarga de tu pantalla ya ha empezado. Es el
 *   lado seguro: nunca da de más, como mucho da de menos.
 *
 * Determinismo
 *   Una habilidad es una ENTRADA, como un giro. Se graba en la
 *   repetición con su tick y se vuelve a inyectar al verla, así
 *   que una partida de este modo se reconstruye igual de exacta
 *   que una clásica (js/replay.js).
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var H = CFG.HAB;
  var T = CFG.TILE;

  /* Índices de las cuatro, por si alguien lee esto de arriba abajo */
  var MORDISCO = 0, TURBO = 1, FLASH = 2, GRITO = 3;
  /* Y los dos de quien lleva un fantasma (PAC-MAN VS.). Comparten los mismos
   * huecos de recarga que MORDISCO y TURBO: un jugador es una cosa o la otra
   * durante toda la partida, así que no hacen falta ocho contadores. */
  var EMBESTIDA = 0, ACECHO = 1;

  /* Estado limpio de un jugador. Las recargas empiezan a CERO: la primera
   * de cada partida está lista desde el "¡LISTO!". */
  function nuevoEstado() {
    return {
      cd: [0, 0, 0, 0],   // ticks que faltan para cada habilidad
      turbo: 0,           // ticks de turbo que quedan
      dientes: 0,         // ticks con los dientes fuera (MORDISCO)
      mordio: false,      // y si esos dientes se llevaron un fantasma
      /* Ticks desde la última Q que ACERTÓ (-1: ninguna reciente). Las skins de
       * la tanda del 14 sep y las de tienda hacen su Q entera con esto, que
       * dura más que los dientes (hasta 1,3 s la PIÑATA). */
      qEdad: -1,
      flash: 0,           // ticks translúcido (FLASH)
      carga: 0,           // ticks de EMBESTIDA (fantasma humano)
      acecho: 0,          // ticks de ACECHO (fantasma humano)
      /* Hacia dónde fue el último flash. Se guarda porque el rastro se pinta
       * DETRÁS del salto, y el salto puede no ir hacia donde Pac-Man mira. */
      flashDir: -1,
      chispa: 0,          // contador para sembrar las chispas del turbo
      /* Ticks que le quedan a cada fantasma (por id) de "acabo de morderte y
       * aún no me lo han confirmado". Solo lo usa el INVITADO: ver mordisco(). */
      guard: [0, 0, 0, 0],
      /* Ticks que le quedan a una Q pedida sin nadie a tiro todavía. Ver
       * pulsar() y CFG.HAB.BITE_BUFFER. */
      pedirQ: 0,
      /* ---- los roles ---- */
      provoca: 0,         // PROVOCAR: ticks atrayendo a los fantasmas
      coraza: 0,          // ESCUDO del Tanque: 8 s o un choque, lo que llegue antes
      escudo: 0,          // ESCUDO ALIADO (del Soporte): igual, pero dado por otro
      gracia: 0,          // tras romperse el escudo, un momento sin morir
      pisoton: 0,         // la onda del PISOTÓN (solo se pinta)
      arrolla: 0,         // ticks que le quedan a la carrera de ARROLLAR
      adir: 0,           // hacia dónde va la apisonadora
      arecorre: 0,       // y lo que lleva recorrido (tope: una vuelta)
      arrollaRed: 0,      // anfitrión: la carrera de un invitado, para creerle
      inmune: 0,          // INMUNIDAD
      tormenta: 0,        // TORMENTA: ticks que le quedan
      cruce: 0,           // tras cruzar un portal, sin volver a cruzar
      ultTile: -1,        // casilla del tick anterior (para ENTRAR en una boca)
      /* MANTENER PULSADO (CFG.HAB.MANTENER): qué tecla se está apretando
       * (-1: ninguna) y cuántos ticks lleva. Solo existe en la máquina de
       * quien aprieta; lo que viaja y se graba es lo que sale al final. */
      mant: -1,
      mantT: 0,
      /* PORTAL (Mago): ticks que le quedan en la OTRA DIMENSIÓN (0: está en
       * la de todos). Mientras dure, nada lo toca y él no come. */
      dimension: 0
    };
  }

  /* Distancia horizontal EN PÍXELES teniendo en cuenta el túnel: las
   * columnas 0 y 27 son vecinas, y sin esto el mordisco no llegaría de un
   * extremo al otro aunque se estén tocando. */
  function distX(a, b) {
    var ancho = CFG.COLS * T;
    var d = Math.abs(a - b);
    return Math.min(d, ancho - d);
  }

  /* ¿Esa casilla es la casa de los fantasmas? El FLASH atraviesa muros, y
   * sin este freno se podría aterrizar dentro de la casa, que es un sitio
   * del que Pac-Man no sabe salir (no hay puerta para él). */
  function esCasa(col, row) {
    var C = CFG.HOUSE;
    return row >= C.top && row <= C.bottom && col >= C.left && col <= C.right;
  }

  /* ¿Se puede aterrizar ahí? Ni muro, ni puerta, ni casa. */
  function aterrizable(col, row) {
    if (row < 0 || row >= CFG.ROWS) return false;
    if (esCasa(col, row)) return false;
    return CFG.isOpen(col, row, false);
  }

  /* ¿El jugador idx es el de ESTA pantalla? Los logros son de quien juega
   * aquí: el anfitrión ejecuta también los poderes que le piden los
   * invitados, y esos no son suyos. */
  function mio(G, idx) {
    return !G.netRole || idx === G.localIdx;
  }

  /* Apunta un contador de logros, si la jugada es de quien juega aquí */
  function apunta(G, idx, o) {
    if (mio(G, idx) && G.bumpAch) G.bumpAch(o);
  }

  /* Un sonido del sistema de audio, si lo hay. Los poderes eran MUDOS salvo
   * por lo que arrastraban de rebote (la Q sonaba al comerse el fantasma, la R
   * porque empezaba el modo azul), y justo los dos que no tocan el marcador
   * —turbo y flash— no sonaban nada: una tecla con recarga que no suena se
   * siente como una tecla rota. Cada poder tiene el suyo en js/audio.js.
   *
   * Suenan los de TODO EL MUNDO, no solo los tuyos: que a alguien le quede una
   * habilidad menos es información de la partida, y oír venir un mordisco vale
   * de aviso. Lo que cambia es el volumen — `ajeno` los baja al 10%
   * (CFG.HAB.VOL_AJENO), porque a volumen entero una party de cuatro son
   * dieciséis teclas peleándose con el waka. */
  function son(nombre, ajeno) {
    var A = window.AudioSys;
    if (A && A[nombre]) A[nombre](ajeno ? H.VOL_AJENO : 1);
  }

  /* Lo mismo, pero decidiendo solo si es tuyo o de otro */
  function sonDe(G, idx, nombre) { son(nombre, !mio(G, idx)); }

  /* Qué sonido le toca al poder k de ese jugador. Son dos listas porque quien
   * lleva un fantasma tiene otros poderes; el orden es el de CFG.HAB.LIST y
   * CFG.HAB.LIST_G, que es el mismo que las teclas y el que viaja por red. */
  var SON = {
    mordisco: 'playBite', turbo: 'playTurbo', flash: 'playFlash', grito: 'playShout',
    embestida: 'playCharge', acecho: 'playStealth',
    provocar: 'playShout', escudo: 'playStealth', pisoton: 'playCharge', arrollar: 'playCharge',
    hielo: 'playTurbo', inmunidad: 'playTurbo', aliado: 'playStealth', vida: 'playExtraLife',
    fuego: 'playFlash', portal: 'playStealth', runa: 'playBiteMiss', tormenta: 'playShout'
  };

  function sonidoDe(G, idx, k) {
    var h = window.PM.Hab.listaDe(G, idx)[k];
    return (h && SON[h.id]) || '';
  }

  var Hab = {
    on: false,       // ¿la partida en curso es de poderes?
    st: [],          // estado por jugador
    /* Marca que el mordisco que se está lanzando viene de una Q ARMADA y no
     * de la tecla: sin esto, un reintento que fallase volvería a armarla y la
     * dentellada pendiente no se agotaría nunca. Ver pulsar() y paso(). */
    reintento: false,

    /* ---------- ciclo de vida ---------- */
    /* Desde Game.newGame. n = cuántos jugadores hay en la mesa. */
    empezar: function (on, n, roles) {
      this.on = !!on;
      this.st = [];
      this.roles = [];
      for (var i = 0; i < (n || 0); i++) {
        this.st.push(nuevoEstado());
        this.roles.push(H.rol(roles && roles[i]));
      }
      this.limpiarMesa();
    },

    /* Lo que no es de un jugador: fantasmas congelados o huyendo,
     * proyectiles en vuelo, portales, runas y los efectos que se pintan */
    limpiarMesa: function () {
      this.hielo = [0, 0, 0, 0];
      this.huye = [0, 0, 0, 0];
      this.huyeQuien = [-1, -1, -1, -1];
      this.balas = [];
      this.portales = [];
      this.runas = [];
      this.placas = [];     // placas de hielo del Soporte (Q mantenida), una por jugador
      for (var i = 0; i < this.st.length; i++) {
        this.portales.push(null); this.runas.push(null); this.placas.push(null);
      }
      this.fx = [];
    },

    /* Rol de un jugador ('asesino' si no hay) */
    rolDe: function (idx) {
      return H.rol(this.roles && this.roles[idx]);
    },

    /* ---------- fotos para el rebobinado (js/replay.js) ----------
     * Las recargas y los efectos son parte del estado de la partida, así que
     * cuando una repetición salta a otro momento hay que devolverlos a como
     * estaban. Es un objeto plano de números: se copia entero y ya. */
    foto: function () {
      var st = [];
      for (var i = 0; i < this.st.length; i++) {
        var s = this.st[i], o = {};
        for (var k in s) {
          if (!s.hasOwnProperty(k)) continue;
          o[k] = (Object.prototype.toString.call(s[k]) === '[object Array]')
            ? s[k].slice() : s[k];
        }
        st.push(o);
      }
      return { on: this.on, reintento: this.reintento, st: st,
        /* la mesa de los roles: objetos pequeños, se copian enteros */
        roles: (this.roles || []).slice(),
        mesa: JSON.parse(JSON.stringify({
          hielo: this.hielo, huye: this.huye, huyeQuien: this.huyeQuien,
          balas: this.balas, portales: this.portales, runas: this.runas, placas: this.placas
        })) };
    },

    ponerFoto: function (f) {
      if (!f) return;
      this.on = !!f.on;
      this.reintento = !!f.reintento;
      this.st = [];
      for (var i = 0; i < f.st.length; i++) {
        var s = f.st[i], o = nuevoEstado();
        for (var k in s) {
          if (!s.hasOwnProperty(k)) continue;
          o[k] = (Object.prototype.toString.call(s[k]) === '[object Array]')
            ? s[k].slice() : s[k];
        }
        this.st.push(o);
      }
      this.roles = f.roles ? f.roles.slice() : [];
      this.limpiarMesa();
      if (f.mesa) {
        var m = JSON.parse(JSON.stringify(f.mesa));
        this.hielo = m.hielo || this.hielo;
        this.huye = m.huye || this.huye;
        this.huyeQuien = m.huyeQuien || this.huyeQuien;
        this.balas = m.balas || [];
        this.portales = m.portales || this.portales;
        this.runas = m.runas || this.runas;
        this.placas = m.placas || this.placas;
      }
    },

    /* Al morir o al cambiar de nivel se cortan los EFECTOS, pero no las
     * recargas: perder una vida ya es bastante castigo sin encima
     * devolverte las cuatro teclas de golpe. */
    limpiarEfectos: function () {
      for (var i = 0; i < this.st.length; i++) {
        this.st[i].turbo = 0;
        this.st[i].dientes = 0;
        this.st[i].qEdad = -1;
        this.st[i].flash = 0;
        this.st[i].flashDir = -1;
        this.st[i].carga = 0;
        this.st[i].acecho = 0;
        this.st[i].guard = [0, 0, 0, 0];
        /* Una Q que quedó armada muere con la vida: sin esto, la dentellada
         * pendiente saldría sola al reaparecer, contra un fantasma al que
         * nadie apuntó. */
        this.st[i].pedirQ = 0;
        this.limpiarJugador(i);
        this.st[i].pisoton = 0;
        this.st[i].cruce = 0;
        this.st[i].ultTile = -1;
        this.st[i].dimension = 0;
      }
      /* Los PORTALES abiertos no son de la vida ni del nivel: siguen hasta que
       * se les acaba el tiempo. Uno a medio poner ya lo ha cerrado
       * antesDeRecolocar. */
      var abiertos = this.portales || [];
      this.limpiarMesa();
      for (i = 0; i < abiertos.length && i < this.portales.length; i++) {
        var po = abiertos[i];
        if (po && po.t > 0) this.portales[i] = po;
      }
    },

    /* Antes de devolver a todos a su casilla (se muere o se pasa de nivel):
     * quien estaba en la otra dimensión deja la salida donde está, como si se
     * le hubiera acabado el tiempo. Game.resetLevel y Game.respawn. */
    antesDeRecolocar: function (G) {
      if (!this.on || !this.portales) return;
      for (var i = 0; i < this.portales.length; i++) {
        var po = this.portales[i];
        if (!po || po.t > 0) continue;
        po.e = 1;
        this.cerrarPortal(G, i, this.casillaDe(G, i));
        this.gastarId(G, i, 'portal');
      }
    },

    estado: function (idx) {
      if (!this.on) return null;
      return this.st[idx] || null;
    },

    /* ---------- qué poderes le tocan a cada jugador ----------
     * Quien lleva un fantasma (PAC-MAN VS.) juega otra partida: no tiene
     * Pac-Man que potenciar, así que tiene su propia lista de dos.
     *
     * Se resuelve MIRANDO EL REPARTO cada vez y no guardándolo al empezar,
     * porque Versus.setup() corre DESPUÉS de Hab.empezar() en Game.newGame:
     * cuando se montan las recargas todavía no se sabe quién lleva qué. */
    listaDe: function (G, idx) {
      if (G && G.vsGhostOf && G.vsGhostOf(idx) >= 0) return H.LIST_G;
      return H.ROLES[this.rolDe(idx)];
    },

    /* Cuántos poderes tiene ese jugador (2 llevando fantasma, 4 si no) */
    cuantas: function (G, idx) { return this.listaDe(G, idx).length; },

    /* ---------- consultas para el HUD y el dibujo ---------- */
    /* Fracción de recarga cumplida, 0..1 (1 = lista). */
    carga: function (G, idx, k) {
      var s = this.estado(idx);
      if (!s) return 1;
      var lista = this.listaDe(G, idx);
      var tot = lista[k] ? lista[k].cd : 1;
      return 1 - (s.cd[k] / tot);
    },

    lista: function (idx, k) {
      var s = this.estado(idx);
      return !!s && s.cd[k] <= 0;
    },

    /* Segundos que le faltan a esa recarga (0 = lista). Para el HUD.
     *
     * Redondea hacia ARRIBA a propósito: mientras quede un solo tick quedan
     * segundos, y un contador que enseña 0 con la tecla todavía muerta es
     * peor que no poner contador. Así el 1 se apaga justo cuando se enciende
     * la casilla, que es cuando de verdad se puede pulsar.
     *
     * Vale para CUALQUIER jugador, no solo para el de esta pantalla: las
     * recargas de los demás se llevan aquí igual que las propias —el uso
     * ajeno llega por red y pasa por gastar() en evento()— así que el HUD
     * puede enseñar las de la party sin pedir nada más a nadie. */
    restan: function (idx, k) {
      var s = this.estado(idx);
      if (!s || !(k >= 0 && k < s.cd.length)) return 0;
      return Math.ceil(s.cd[k] / 60);
    },

    conTurbo: function (idx) {
      var s = this.estado(idx);
      return !!s && s.turbo > 0;
    },

    conDientes: function (idx) {
      var s = this.estado(idx);
      return !!s && s.dientes > 0;
    },

    /* ---------- PAC-MAN VS.: el fantasma con poderes ---------- */
    conCarga: function (idx) {
      var s = this.estado(idx);
      return !!s && s.carga > 0;
    },

    conAcecho: function (idx) {
      var s = this.estado(idx);
      return !!s && s.acecho > 0;
    },

    /* Multiplicador de velocidad del fantasma `gid` (1 si no hay embestida).
     * Lo consulta Ghost.speedPx, que es por donde pasan TODOS los fantasmas:
     * si el fantasma no lo lleva una persona, aquí no hay nada que aplicar. */
    multVelFantasma: function (G, gid) {
      if (!this.on || !G || !G.vsPlayerOf) return 1;
      var quien = G.vsPlayerOf(gid);
      return (quien >= 0 && this.conCarga(quien)) ? H.CHARGE_MULT : 1;
    },

    /* Lo poco que se ve un fantasma en pleno ACECHO. Es su respuesta al
     * MORDISCO: si no lo ves venir, no le aciertas. No se hace invisible del
     * todo a propósito —eso sería injugable para el otro lado—, pero sí lo
     * bastante como para perderlo de vista en un cruce. */
    alfaFantasma: function (G, gid) {
      if (!this.on || !G || !G.vsPlayerOf) return 1;
      var quien = G.vsPlayerOf(gid);
      if (!(quien >= 0) || !this.conAcecho(quien)) return 1;
      /* Al dueño se le enseña más que al resto: quien lo lleva tiene que poder
       * ver por dónde va su propio fantasma, y esconderse de uno mismo no es
       * una habilidad, es un estorbo. */
      var mio = (!G.netRole || quien === G.localIdx);
      return mio ? 0.55 : H.STALK_ALPHA;
    },

    /* ¿Se le puede pintar la marca del jugador encima? Es lo que hoy delata al
     * fantasma humano desde el otro extremo del laberinto, así que el ACECHO
     * la quita: sin esto, volverse translúcido no serviría de nada. */
    marcaVisible: function (G, gid) {
      if (!this.on || !G || !G.vsPlayerOf) return true;
      var quien = G.vsPlayerOf(gid);
      if (!(quien >= 0) || !this.conAcecho(quien)) return true;
      return (!G.netRole || quien === G.localIdx);
    },

    /* ¿Este fantasma acaba de ser mordido por este jugador y aún no ha llegado
     * la confirmación del anfitrión? Mientras dure, no puede matarlo.
     *
     * Es EL arreglo del mordisco en party. El invitado no mata fantasmas —eso
     * lo decide el anfitrión—, así que tras pulsar la Q el fantasma seguía vivo
     * y a un pelo de distancia en su pantalla; encima el mordisco le gira la
     * cara hacia él (mirarHacia). Resultado: se metía dentro del fantasma en
     * los tres o cuatro ticks que tarda la ida y vuelta, su propia detección de
     * choques lo mataba, y al jugador le quedaba la sensación de que la Q mata
     * al que la usa. Ahora ese fantasma concreto —solo ese, y solo un momento—
     * no le hace nada.
     *
     * Si el anfitrión acaba diciendo que no (recarga, o que allí no había nadie
     * a tiro), el escudo se agota y el fantasma vuelve a ser peligroso. Da de
     * menos, nunca de más. */
    protegido: function (idx, ghostId) {
      var s = this.estado(idx);
      return !!s && !!s.guard && s.guard[ghostId] > 0;
    },

    /* Alfa del Pac-Man: translúcido justo después de un FLASH */
    alfa: function (idx, G) {
      var s = this.estado(idx);
      /* en la otra dimensión, a los demás se les ve como un fantasma; quien
       * está dentro se ve entero (lo borroso es lo de fuera) */
      if (s && s.dimension > 0) return (G && this.miraDesdeDimension(G) === idx) ? 1 : 0.35;
      if (!s || s.flash <= 0) return 1;
      // de 0.35 a 1 según se va posando
      return 0.35 + 0.65 * (1 - s.flash / H.FLASH_SHOW);
    },

    /* ---------- un paso ---------- */
    /* Solo corre con la partida en marcha: las recargas no avanzan durante
     * el "¡LISTO!", ni en pausa, ni mientras alguien muere. */
    paso: function (G) {
      if (!this.on) return;
      var corre = (G.state === 'PLAYING' && !G.paused && G.eatFreezeTicks <= 0);
      for (var i = 0; i < this.st.length; i++) {
        var s = this.st[i];
        if (s.dientes > 0) s.dientes--;
        if (s.qEdad >= 0) s.qEdad = (s.qEdad < 120) ? s.qEdad + 1 : -1;
        if (s.flash > 0) s.flash--;
        if (!corre) continue;
        for (var j = 0; j < 4; j++) if (s.guard[j] > 0) s.guard[j]--;
        for (var k = 0; k < 4; k++) if (s.cd[k] > 0) s.cd[k]--;
        if (s.turbo > 0) {
          s.turbo--;
          s.chispa++;
        }
        // los del fantasma humano (PAC-MAN VS.)
        if (s.carga > 0) s.carga--;
        if (s.acecho > 0) s.acecho--;
        /* La Q que se pidió antes de tiempo: cada tick se vuelve a mirar si
         * ya hay alguien a tiro. Esto corre AQUÍ, al principio del tick y
         * antes de que nadie se mueva (Game.step llama a Hab.paso antes de
         * stepPlaying), así que el mordisco siempre se resuelve un tick
         * ANTES de que el fantasma pueda pisar la casilla de Pac-Man: con
         * dos px de acercamiento por tick y dos casillas de alcance, no hay
         * forma de que un fantasma pase de "fuera de tiro" a "encima" sin
         * cruzar antes por aquí. Ver CFG.HAB.BITE_BUFFER. */
        if (s.pedirQ > 0) {
          s.pedirQ--;
          if (this.idDe(G, i, MORDISCO) === 'mordisco' &&
              this.puede(G, i, MORDISCO) && this.presa(G, i)) {
            s.pedirQ = 0;
            this.reintento = true;
            this.pulsar(G, i, MORDISCO);
            this.reintento = false;
          }
          /* Agotarse no suena ni se ve: la dentellada al aire ya sonó al
           * pulsar (ver mordisco()). Este margen es puntería prestada, no un
           * poder aparte, y no tiene que anunciarse. */
        }
      }
      this.pasoRoles(G, corre);
    },

    /* Id del poder k de ese jugador ('' si no tiene) */
    idDe: function (G, idx, k) {
      var h = this.listaDe(G, idx)[k];
      return h ? h.id : '';
    },

    /* ---------- las recargas por la red ----------
     * El HUD enseña las recargas de TODO EL MUNDO, y eso no se puede sostener
     * solo sobre los avisos de uso. El aviso se manda una vez y nadie lo
     * confirma —Supabase Realtime reparte en broadcast, sin acuse— así que el
     * que se pierda deja esa casilla mintiendo el resto de la partida: nada
     * vuelve a mirarla nunca. Es justo el fallo que se vio jugando, y no se
     * arregla mandando el aviso otra vez, porque el segundo se puede perder
     * igual.
     *
     * Así que las recargas viajan TAMBIÉN en la instantánea del anfitrión,
     * que sale doce veces por segundo: si un aviso se cae, la foto siguiente
     * lo arregla y no se nota. El aviso sigue haciendo falta —es el que suena
     * y el que enseña los dientes en el instante— pero ya no es el único que
     * sostiene el número.
     *
     * Son cuatro enteros por jugador; al lado de las ocho posiciones que ya
     * lleva la foto, no se nota. */
    resumen: function () {
      var out = [];
      for (var i = 0; i < this.st.length; i++) out.push(this.st[i].cd.slice());
      return out;
    },

    /* mio: el jugador de esta pantalla, o -1 si es un mirón (no tiene). */
    aplicarResumen: function (hb, mio) {
      if (!this.on || !hb || !hb.length) return;
      for (var i = 0; i < hb.length && i < this.st.length; i++) {
        var fila = hb[i], s = this.st[i];
        if (!fila) continue;
        for (var k = 0; k < fila.length && k < s.cd.length; k++) {
          var v = fila[k] | 0;
          if (i === mio) {
            /* La TUYA solo se corrige HACIA ARRIBA. El anfitrión se entera de
             * lo que pulsas un viaje de red más tarde, así que su foto aún te
             * tiene la tecla cargada: hacerle caso a ciegas encendería la
             * casilla medio parpadeo justo después de pulsarla, que es lo peor
             * que puede hacer un indicador de recarga. Hacia arriba sí, que
             * ahí manda él: si dice que te queda más, te queda más. */
            if (v > s.cd[k]) s.cd[k] = v;
          } else {
            s.cd[k] = v;
          }
        }
      }
    },

    /* ---------- ¿se puede usar ahora mismo? ---------- */
    puede: function (G, idx, k) {
      if (!this.on) return false;
      if (G.state !== 'PLAYING' || G.paused) return false;
      if (G.eatFreezeTicks > 0) return false;
      if (G.netNotice || (G.netStalled && G.netStalled())) return false;
      if (G.isSpec && G.isSpec()) return false;
      /* El tope de poderes es el de SU lista: quien lleva fantasma tiene dos,
       * y una tecla de más no puede colarse ni desde el teclado ni por red. */
      if (!(k >= 0 && k < this.cuantas(G, idx))) return false;
      var gid = G.vsGhostOf ? G.vsGhostOf(idx) : -1;
      if (gid >= 0) {
        /* Al fantasma no se le exige Pac-Man vivo (no tiene), sino estar EN EL
         * LABERINTO: dentro de la casa o volviendo hecho ojos no hay nada que
         * embestir ni a quien esconderse. */
        var gh = G.ghosts && G.ghosts[gid];
        if (!gh) return false;
        if (gh.mode === 'house' || gh.mode === 'leaving' ||
            gh.mode === 'eyes' || gh.mode === 'entering') return false;
      } else {
        var p = G.pacs[idx];
        if (!p || p.out || p.dying) return false;
        /* en la otra dimensión solo se puede cerrar el portal */
        if (this.enDimension(idx) && this.idDe(G, idx, k) !== 'portal') return false;
      }
      return this.lista(idx, k);
    },

    /* ---------- pulsación local (teclado o botón) ----------
     * Es el único embudo de la entrada, igual que Game.setPacDir lo es del
     * rumbo: por aquí pasan el teclado, los botones táctiles y la
     * repetición cuando se está viendo una. */
    pulsar: function (G, idx, k, mant) {
      if (!this.puede(G, idx, k)) return false;
      var R = window.PM.Replay;
      // mientras se ve una repetición manda ella: la tecla del que mira no
      // pinta nada, igual que con los giros (js/replay.js). La Q ARMADA que
      // se resuelve sola en paso() sí vale si la repetición grabó la
      // pulsación que la armó (ver Replay.reintentoVale)
      if (R && R.habBloqueada && R.habBloqueada() &&
          !(this.reintento && R.reintentoVale && R.reintentoVale())) return false;
      /* mant: la versión de MANTENER PULSADO (ver apretar). Se graba aparte
       * porque hace otra cosa con la misma tecla. */
      if (mant) {
        if (!this.lanzar(G, idx, k, true)) return false;
        if (R && R.apuntaHab) R.apuntaHab(idx, k, true);
        return true;
      }
      if (!this.lanzar(G, idx, k)) {
        /* MORDISCO al aire: no se tira la tecla, se deja ARMADA un instante
         * (CFG.HAB.BITE_BUFFER) y muerde sola en cuanto alguien entre a tiro.
         * Es EL arreglo del "voy de frente contra el fantasma, uso la Q y me
         * mata igual": de cara solo hay cinco o seis ticks buenos para morder,
         * y nadie reacciona en 100 ms.
         *
         * No entra por aquí ni la Q del fantasma humano (esa es EMBESTIDA y
         * se gasta al momento) ni el reintento que hace paso(), que si no se
         * rearmaría solo para siempre. */
        if (this.idDe(G, idx, k) === 'mordisco' && !this.reintento) {
          var s = this.estado(idx);
          if (s) s.pedirQ = H.BITE_BUFFER;
          /* La pulsación que ARMA la Q se graba: la repetición la vuelve a
           * pulsar en el mismo tick, se arma igual y muerde sola en el mismo
           * paso() que aquel día. Antes se grababa el mordisco del reintento,
           * que ocurre DENTRO de un paso y la repetición lo aplicaba un tick
           * tarde: el fantasma llegaba a tocar a Pac-Man y la partida se
           * torcía (15 sep: una de 93.870 puntos se veía morir al minuto). */
          if (R && R.apuntaHab) R.apuntaHab(idx, k);
        }
        return false;
      }
      /* Se apunta DESPUÉS y solo si salió: un mordisco al aire o un flash
       * contra el borde no cambian nada, así que meterlos en la repetición
       * sería engordarla por gusto. El mordisco del reintento no: lo que se
       * grabó fue la pulsación que lo armó. */
      if (R && R.apuntaHab && !this.reintento) R.apuntaHab(idx, k);
      return true;
    },

    /* ---------- MANTENER PULSADO ----------
     * Algunas teclas (CFG.HAB.MANTENER, hoy la Q y la E del Soporte) hacen
     * dos cosas: pulsada y soltada, la de siempre; apretada el rato que diga
     * MANTENER, otra. Por eso en esas la de siempre sale AL SOLTAR y no al
     * apretar: al apretar todavía no se sabe cuál de las dos quiere.
     *
     * El rato se cuenta en ticks de la partida (cargas, desde Game.step) y no
     * con el reloj: en pausa no avanza, y la versión larga cae en un tick
     * exacto que la repetición puede volver a poner en el mismo sitio. */
    mantiene: function (G, idx, k) {
      var id = this.idDe(G, idx, k);
      return (H.MANTENER && H.MANTENER.hasOwnProperty(id)) ? H.MANTENER[id] : 0;
    },

    /* Tecla o botón apretado. repetida: la autorrepetición del teclado, que
     * en una tecla que se mantiene no puede volver a empezar la cuenta. */
    apretar: function (G, idx, k, repetida) {
      if (!this.mantiene(G, idx, k)) return this.pulsar(G, idx, k);
      if (repetida) return false;
      var s = this.estado(idx), R = window.PM.Replay;
      if (!s || !this.puede(G, idx, k)) return false;
      if (R && R.habBloqueada && R.habBloqueada()) return false;
      s.mant = k;
      s.mantT = 0;
      return true;
    },

    /* Tecla o botón soltado: si no llegó al rato, la de siempre */
    soltar: function (G, idx, k) {
      var s = this.estado(idx);
      if (!s || s.mant !== k) return false;
      s.mant = -1;
      s.mantT = 0;
      return this.pulsar(G, idx, k);
    },

    /* Suelta todo sin lanzar nada (la ventana pierde el foco y ya no llegará
     * el "soltar") */
    cancelarMant: function () {
      for (var i = 0; i < this.st.length; i++) { this.st[i].mant = -1; this.st[i].mantT = 0; }
    },

    /* Un tick de las teclas mantenidas. Game.step lo llama ANTES que a
     * Replay.paso: la versión larga se apunta con el mismo tick con que la
     * repetición la vuelve a meter, y en el mismo punto del paso. */
    cargas: function (G) {
      if (!this.on) return;
      for (var i = 0; i < this.st.length; i++) {
        var s = this.st[i];
        if (!(s.mant >= 0)) continue;
        var p = G.pacs[i];
        if (!p || p.out || p.dying) { s.mant = -1; s.mantT = 0; continue; }
        if (G.state !== 'PLAYING' || G.paused || G.eatFreezeTicks > 0) continue;
        var k = s.mant;
        if (++s.mantT < this.mantiene(G, i, k)) continue;
        s.mant = -1;
        s.mantT = 0;
        this.pulsar(G, i, k, true);
      }
    },

    /* Lo que lleva cargado la tecla mantenida, 0..1 (-1: ninguna). Para el
     * dibujo. */
    cargaMant: function (G, idx) {
      var s = this.estado(idx);
      if (!s || !(s.mant >= 0)) return -1;
      var tot = this.mantiene(G, idx, s.mant);
      return tot ? Math.min(1, s.mantT / tot) : -1;
    },

    /* Lanza la habilidad del jugador idx. Devuelve si llegó a salir: hay
     * dos que se niegan a gastarse en balde (MORDISCO sin nadie cerca,
     * FLASH contra el borde del laberinto). mant: la versión de mantener. */
    lanzar: function (G, idx, k, mant) {
      var deRed = (G.netRole === 'guest');
      var ok;
      this.sinGasto = false;
      if (mant) {
        switch (this.idDe(G, idx, k)) {
          case 'hielo':  ok = deRed ? this.puedePlaca(G, idx) : this.placa(G, idx); break;
          case 'aliado': ok = this.aliadoArea(G, idx, deRed); break;
          default:       ok = false;
        }
        if (!ok) return false;
        this.gastar(G, idx, k);
        this.avisar(G, idx, k, true);
        return true;
      }
      /* Se despacha por el ID del poder y no por su tecla: la Q es el
       * MORDISCO del Asesino, pero la PROVOCACIÓN del Tanque. Los dos del
       * fantasma humano se aplican solo a él, aquí y ahora. */
      switch (this.idDe(G, idx, k)) {
        case 'embestida': ok = this.embestida(G, idx); break;
        case 'acecho':    ok = this.acechar(G, idx); break;
        case 'mordisco':  ok = this.mordisco(G, idx, deRed); break;
        case 'turbo':     ok = this.turbo(G, idx); break;
        case 'flash':     ok = this.flash(G, idx); break;
        case 'grito':     ok = this.grito(G, idx, deRed); break;
        case 'provocar':  ok = this.provocar(G, idx); break;
        case 'escudo':    this.estado(idx).coraza = H.ESCUDO_TICKS; sonDe(G, idx, 'playStealth'); ok = true; break;
        case 'pisoton':   ok = this.pisoton(G, idx, deRed); break;
        case 'arrollar':  ok = this.arrollar(G, idx); break;
        case 'hielo':     ok = this.disparar(G, idx, 'hielo'); break;
        case 'inmunidad': ok = this.inmunidad(G, idx); break;
        case 'aliado':    ok = this.aliado(G, idx, deRed); break;
        case 'vida':      ok = this.vida(G, idx, deRed); break;
        case 'fuego':     ok = this.disparar(G, idx, 'fuego'); break;
        case 'portal':    ok = this.portal(G, idx); break;
        case 'runa':      ok = deRed ? this.puedeRuna(G, idx) : this.runa(G, idx); break;
        case 'tormenta':  ok = this.tormenta(G, idx); break;
        default:          ok = false;
      }
      if (!ok) return false;
      if (!this.sinGasto) this.gastar(G, idx, k);
      this.avisar(G, idx, k);
      return true;
    },

    /* El invitado no pone la runa (la pone el anfitrión), pero sí mira si se
     * puede, para no gastar una tecla que no va a salir */
    puedeRuna: function (G, idx) {
      var c = this.casillaDe(G, idx);
      if (!c || !aterrizable(c.c, c.r)) return false;
      sonDe(G, idx, 'playBiteMiss');
      return true;
    },

    gastar: function (G, idx, k) {
      var s = this.estado(idx);
      if (!s) return;
      var lista = this.listaDe(G, idx);
      if (lista[k]) s.cd[k] = lista[k].cd;
    },

    /* Contarlo al resto de la sala. El invitado pide, el anfitrión reparte;
     * jugando en local se lo cuenta a los mirones (hostEvt ya lo sabe). */
    avisar: function (G, idx, k, mant) {
      if (G.netRole === 'guest') {
        /* con el rumbo y la casilla de SU pantalla: los proyectiles salen
         * hacia donde él apuntó y el portal y la runa van donde él estaba */
        var p = G.pacs[idx];
        var d = { t: 'hab', k: k };
        if (mant) d.m = 1;
        if (p) {
          d.d = this.dirFlash(p); d.c = p.tileX(); d.r = p.tileY();
          d.x = Math.round(p.x); d.y = Math.round(p.y);
        }
        G.netSend('gevt', d);
      } else {
        G.hostEvt({ t: 'hab', w: idx, k: k, ng: this.sinGasto ? 1 : 0 });
      }
    },

    /* ---------- lo que llega de fuera ----------
     * Anfitrión: un invitado pide una habilidad (gevt). Se valida su
     * recarga aquí, que es la copia que no puede tocar nadie desde su
     * navegador, y se ejecuta lo que sea cosa del anfitrión. */
    peticion: function (G, who, k, d) {
      if (!this.on) return;
      if (!this.puede(G, who, k)) return;
      var ok;
      this.sinGasto = false;
      /* Fantasma humano: sus dos poderes se los aplica él en su máquina (son
       * suyos y de nadie más), pero el anfitrión TIENE que anotarlos igual,
       * porque el fantasma lo simula él y la embestida cambia su velocidad.
       * Sin esto, el invitado correría más en su pantalla que en la del
       * anfitrión y el resincronizado le daría tirones toda la embestida. */
      if (G.vsGhostOf && G.vsGhostOf(who) >= 0) {
        if (k === EMBESTIDA) this.marcarCarga(who);
        else this.marcarAcecho(who);
        /* El sonido va aquí porque el efecto no pasa por su función: se oye
         * bajito, como todo lo que hace otro (ver son()). */
        son(sonidoDe(G, who, k), true);
        this.gastar(G, who, k);
        G.hostEvt({ t: 'hab', w: who, k: k });
        return;
      }
      /* El mordisco que llega por red se juzga con un poco de manga ancha
       * (BITE_NET_MARGIN): la posición del invitado le llega a 12 Hz y sus
       * fantasmas los mueve esta máquina, así que cuando esto se ejecuta ya no
       * están donde él los vio. Ese desfase no es culpa suya y se le perdona;
       * el alcance de verdad lo comprobó él en su pantalla. */
      var s = this.estado(who);
      d = d || {};
      /* la versión de MANTENER PULSADO: la placa y los escudos los pone él */
      if (d.m) {
        switch (this.idDe(G, who, k)) {
          case 'hielo':  ok = this.placa(G, who, d); break;
          case 'aliado': ok = this.aliadoArea(G, who, false); break;
          default:       ok = false;
        }
        if (!ok) return;
        this.gastar(G, who, k);
        G.hostEvt({ t: 'hab', w: who, k: k, ng: 0 });
        return;
      }
      switch (this.idDe(G, who, k)) {
        case 'mordisco': ok = this.mordisco(G, who, false, H.BITE_NET_MARGIN); break;
        case 'grito':    ok = this.grito(G, who, false); break;
        case 'provocar': ok = this.provocar(G, who); break;
        case 'pisoton':  ok = this.pisoton(G, who, false, H.BITE_NET_MARGIN); break;
        case 'hielo':    ok = this.disparar(G, who, 'hielo', d.d, d); break;
        case 'fuego':    ok = this.disparar(G, who, 'fuego', d.d, d); break;
        case 'aliado':   ok = this.aliado(G, who, false); break;
        case 'vida':     ok = this.vida(G, who, false); break;
        case 'portal':   ok = this.portal(G, who, d); break;
        case 'runa':     ok = this.runa(G, who, d); break;
        case 'tormenta': ok = this.tormenta(G, who); break;
        default:
          /* Lo que solo le toca a él (TURBO, FLASH, ESCUDO, INMUNIDAD, la
           * carrera de ARROLLAR) ya se lo ha aplicado en su máquina; aquí se
           * anota para pintarlo, para llevar su recarga y, en la carrera,
           * para creerle cuando diga que ha arrollado a alguien. Su POSICIÓN
           * llega por 'pos' como siempre. */
          switch (this.idDe(G, who, k)) {
            case 'turbo': this.marcarTurbo(who); break;
            case 'flash': this.marcarFlash(who); break;
            case 'escudo': if (s) s.coraza = H.ESCUDO_TICKS; break;
            case 'inmunidad': if (s) s.inmune = H.INMUNE_TICKS; break;
            case 'arrollar':
              if (s) {
                s.arrollaRed = H.APISONADORA_RED;
                s.arrolla = 1;
                s.arecorre = 0;
                s.adir = (d.d >= 0 && d.d <= 3) ? d.d : (G.pacs[who] ? G.pacs[who].dir : 0);
              }
              break;
          }
          // y se oye bajito, que aquí el efecto no pasa por su función
          son(sonidoDe(G, who, k), true);
          ok = true;
      }
      if (!ok) return;
      if (!this.sinGasto) this.gastar(G, who, k);
      G.hostEvt({ t: 'hab', w: who, k: k, ng: this.sinGasto ? 1 : 0 });
    },

    /* Cualquiera (invitado o mirón): el anfitrión dice que fulano usó una
     * habilidad. Aquí NO se ejecuta nada que toque a los fantasmas —eso ya
     * llega por sus propios eventos ('eatGhost', 'fright')—, solo se pinta.
     * De lo contrario, quien la lanzó la aplicaría dos veces. */
    evento: function (G, who, k, ng) {
      if (!this.on) return;
      if (!(who >= 0 && who < this.st.length)) return;
      if (!(k >= 0 && k < this.cuantas(G, who))) return;
      if (who === G.localIdx && !G.isSpec()) {
        // es el eco de la mía: ya está aplicada, no se toca
        return;
      }
      var s = this.estado(who);
      /* La embestida SÍ se aplica aquí, y no es solo pintura: ese fantasma lo
       * simula también esta máquina (por estima entre instantáneas), así que
       * sin la velocidad buena se vería frenar y dar tirones. Lo demás de los
       * roles que ejecuta el anfitrión llega con la foto; aquí se pinta. */
      switch (this.idDe(G, who, k)) {
        case 'embestida': this.marcarCarga(who); break;
        case 'acecho': this.marcarAcecho(who); break;
        case 'mordisco': this.marcarDientes(who); break;
        case 'turbo': this.marcarTurbo(who); break;
        case 'flash': this.marcarFlash(who); break;
        case 'provocar': if (s) s.provoca = H.TAUNT_TICKS; break;
        case 'escudo': if (s) s.coraza = H.ESCUDO_TICKS; break;
        case 'pisoton': if (s) s.pisoton = 30; break;
        case 'inmunidad': if (s) s.inmune = H.INMUNE_TICKS; break;
        case 'arrollar':
          if (s && G.pacs[who]) { s.arrolla = 1; s.arecorre = 0; s.adir = G.pacs[who].dir; }
          break;
        case 'tormenta': if (s) s.tormenta = H.TORMENTA_RAYOS * H.TORMENTA_CADA; break;
      }
      /* Y se oye. Bajito siempre: por aquí solo pasan los poderes de OTROS —el
       * eco del tuyo se descarta arriba—, y de un mirón no es ninguno. */
      son(sonidoDe(G, who, k), true);
      if (!ng) this.gastar(G, who, k);
    },

    marcarTurbo: function (idx) {
      var s = this.estado(idx);
      if (s) { s.turbo = H.TURBO_TICKS; s.chispa = 0; }
    },

    marcarCarga: function (idx) {
      var s = this.estado(idx);
      if (s) s.carga = H.CHARGE_TICKS;
    },

    marcarAcecho: function (idx) {
      var s = this.estado(idx);
      if (s) s.acecho = H.STALK_TICKS;
    },

    /* dir: hacia dónde fue el salto (para el rastro). Sin ella —el eco de
     * red, que no sabe la dirección— se usa la de la mirada, que es lo más
     * parecido que hay. */
    marcarFlash: function (idx, dir) {
      var s = this.estado(idx);
      if (!s) return;
      s.flash = H.FLASH_SHOW;
      s.flashDir = (dir >= 0 && dir <= 3) ? dir : -1;
    },

    /* Sin `ticks` es un mordisco que ACIERTA (el propio o el eco de red, que
     * solo llega de los que gastan recarga); con ticks, la dentellada al aire.
     * `mordio` lo miran las skins que hacen algo al comer (la llamarada del
     * DRAGÓN, las monedas del COFRE, el rayo del OVNI): al aire, nada. */
    marcarDientes: function (idx, ticks) {
      var s = this.estado(idx);
      if (!s) return;
      s.dientes = ticks || H.BITE_SHOW;
      s.mordio = !ticks;
      if (!ticks) s.qEdad = 0;
    },

    /* =========================================================
     * Q — MORDISCO
     * ========================================================= */
    /* El fantasma mordible más cercano, o null. No entran los que están en
     * la casa, los que están saliendo por la puerta ni los que ya son un
     * par de ojos volviendo: a esos no hay nada que morder.
     *
     * SE MIDE EN PÍXELES, no en casillas, y esto importa mucho más de lo que
     * parece. Contando casillas, el mordisco fallaba a cada rato sin motivo
     * visible: Pac-Man y el fantasma pueden estar a NUEVE píxeles —pegados en
     * pantalla, los sprites casi solapados— y aun así caer en casillas que no
     * son vecinas, porque cada uno está en el borde opuesto de la suya. Con
     * casillas, morder dependía de en qué punto del recorrido te pillara, que
     * es justo lo que hace que un botón se sienta roto.
     *
     * El alcance va con un margen sobre la casilla (CFG.HAB.BITE_PX) para que
     * "lo que se ve pegado, se muerde". Se compara por ejes (el mayor de los
     * dos, no la diagonal) porque el alcance es un CUADRO de una casilla a la
     * redonda, que es lo que se pidió. */
    presa: function (G, idx, extra) {
      var p = G.pacs[idx];
      if (!p) return null;
      var alcance = H.BITE_PX + (extra || 0);
      var mejor = null, mejorD = Infinity;
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!g) continue;
        if (g.mode === 'house' || g.mode === 'entering' || g.mode === 'eyes') continue;
        var dx = distX(g.x, p.x);
        var dy = Math.abs(g.y - p.y);
        if (dx > alcance || dy > alcance) continue;
        var d = dx * dx + dy * dy;      // el más pegado, si hay dos a tiro
        if (d < mejorD) { mejorD = d; mejor = g; }
      }
      return mejor;
    },

    /* Gira a Pac-Man hacia lo que acaba de morder. Con el fantasma en la
     * misma casilla no hay hacia dónde mirar, así que se queda como está.
     * Se toca también nextDir: si no, el rumbo pedido de antes le daría la
     * vuelta al tick siguiente y el mordisco no se vería. */
    mirarHacia: function (p, g) {
      var dx = g.x - p.x, dy = g.y - p.y;
      // por el túnel el fantasma puede estar "al otro lado" del laberinto
      var ancho = CFG.COLS * T;
      if (dx > ancho / 2) dx -= ancho;
      else if (dx < -ancho / 2) dx += ancho;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      if (Math.abs(dx) >= Math.abs(dy)) {
        p.dir = (dx > 0) ? CFG.DIR.RIGHT : CFG.DIR.LEFT;
      } else {
        p.dir = (dy > 0) ? CFG.DIR.DOWN : CFG.DIR.UP;
      }
      p.nextDir = p.dir;
    },

    /* soloVisual: el invitado enseña los dientes al instante y deja que el
     * anfitrión decida de verdad; así no se ven fantasmas que resucitan. */
    mordisco: function (G, idx, soloVisual, extra) {
      var g = this.presa(G, idx, extra);
      /* el REY FANTASMA (js/jefe.js): si no hay fantasma a tiro y él sí */
      var JF = window.PM.Jefe;
      if (!g && JF && JF.aTiroMordisco(G, idx, extra)) {
        this.marcarDientes(idx);
        sonDe(G, idx, 'playBite');
        if (soloVisual) return true;              // lo cuenta el anfitrión
        JF.danar(G, CFG.JEFE.DANO.mordisco, idx, 'mordisco');
        return true;
      }
      if (!g) {
        /* Dentellada al aire. No gasta recarga, pero SE VE: sin esto, fallar
         * la puntería y tener la tecla en recarga se sienten exactamente
         * igual —no pasa nada—, y entonces la Q parece rota aunque funcione.
         * Con los dientes un instante queda claro que la tecla entró y lo
         * que falló fue el tiro.
         *
         * El SONIDO de fallo ya no sale de aquí: la Q pulsada desde el
         * teclado se queda armada un momento (ver pulsar()), así que todavía
         * no se sabe si ha fallado. Lo suena quien lo sabe — paso(), cuando
         * se agota el margen sin nadie a tiro. */
        this.marcarDientes(idx, Math.round(H.BITE_SHOW / 2));
        /* Y SUENA AHORA, no cuando se agote el margen de la Q armada. Retrasar
         * este golpe 0.3 s se nota —a partir de un décimo de segundo el sonido
         * deja de sentirse pegado a la tecla— y además sería mentir: la
         * dentellada al aire ocurre AQUÍ, en este tick, y los dientes salen
         * con ella. Si la Q armada acierta después, es una SEGUNDA dentellada
         * y suena como tal: "chas" sordo y, un instante más tarde, el mordisco
         * bueno. Que es exactamente lo que se ve. */
        sonDe(G, idx, 'playBiteMiss');
        return false;
      }
      var p = G.pacs[idx];
      this.mirarHacia(p, g);
      this.marcarDientes(idx);
      /* La dentellada suena SIEMPRE que acierta, y esto importa sobre todo en
       * el invitado: allí el fantasma no se muere aquí —lo mata el anfitrión—,
       * así que hasta que vuelve la confirmación este sonido es lo único que
       * dice que la Q entró. */
      sonDe(G, idx, 'playBite');
      /* El mordisco se apunta AQUÍ, en la máquina de quien pulsó, y no donde
       * se ejecuta: al invitado se lo mata el anfitrión, y si esperásemos a
       * eso su logro no avanzaría nunca (el evento que vuelve no dice si fue
       * un mordisco o una superpastilla). */
      apunta(G, idx, { mordiscos: 1 });
      if (soloVisual) {
        /* Escudo contra el fantasma que se acaba de morder: aquí no se mata a
         * nadie (lo hace el anfitrión), así que sigue vivo y pegado, y encima
         * el mordisco acaba de girar a Pac-Man hacia él. Sin esto, el invitado
         * se metía dentro y moría por haber acertado el tiro. Ver protegido(). */
        var s = this.estado(idx);
        if (s) s.guard[g.id] = H.BITE_GUARD;
        return true;
      }
      /* Fuera del modo azul cada mordisco vale lo mismo (200): la escalera
       * de 200-400-800-1600 es de la superpastilla, y encadenarla a golpe
       * de tecla convertiría la partida en una cuenta de puntos regalados.
       * Con los fantasmas ya azules, el mordisco entra en la cadena que
       * hubiera, que para eso te has ganado la superpastilla. */
      if (G.frightTicks <= 0) G.chainIndex = 0;
      G.eatGhost(g, idx);
      return true;
    },

    /* =========================================================
     * W — TURBO
     * ========================================================= */
    turbo: function (G, idx) {
      this.marcarTurbo(idx);
      sonDe(G, idx, 'playTurbo');
      return true;
    },

    /* Multiplicador de velocidad del jugador idx (1 si no hay turbo).
     * Lo consulta Game.pacSpeedPx. */
    multVel: function (idx) {
      if (this.arrollando(idx)) return H.APISONADORA_MULT;
      return this.conTurbo(idx) ? H.TURBO_MULT : 1;
    },

    /* =========================================================
     * E — FLASH
     * ========================================================= */
    /* Hacia dónde salta: la ÚLTIMA FLECHA PULSADA, no hacia donde mira
     * Pac-Man. Si vas por un pasillo horizontal y pulsas arriba, Pac-Man
     * sigue yendo de lado porque hay muro —pero la E te manda arriba,
     * atravesándolo.
     *
     * Eso ya lo guarda el motor: `nextDir` es "el último rumbo pedido"
     * (js/pacman.js), lo apunte quien lo apunte —teclado, cruceta, un dedo
     * deslizando o una repetición—, y se queda ahí aunque el laberinto no
     * deje girar. Así que no hace falta llevar la cuenta aparte, ni mandar
     * nada nuevo por red, ni apuntar un dato más en las repeticiones: sale
     * gratis y sale igual en todas las pantallas.
     *
     * De propina, al aterrizar Pac-Man sigue solo en esa dirección si el
     * pasillo lo permite, porque el rumbo pedido ya era ese. */
    dirFlash: function (p) {
      var d = (p.nextDir >= 0 && p.nextDir <= 3) ? p.nextDir : p.dir;
      return (d >= 0 && d <= 3) ? d : CFG.DIR.LEFT;
    },

    /* Casilla de aterrizaje: la más lejana de las FLASH_TILES en esa
     * dirección que sea pisable. Si ninguna lo es (contra el marco del
     * laberinto, por ejemplo), devuelve null y la habilidad ni sale ni se
     * gasta. */
    destino: function (G, idx) {
      var p = G.pacs[idx];
      if (!p) return null;
      var dir = this.dirFlash(p);
      var v = CFG.DIR_V[dir];
      if (!v) return null;
      var cx = p.tileX(), cy = p.tileY();
      var elegido = null;
      for (var n = 1; n <= H.FLASH_TILES; n++) {
        var col = CFG.wrapCol(cx + v.x * n);
        var row = cy + v.y * n;
        if (row < 0 || row >= CFG.ROWS) break;      // por arriba y por abajo no hay túnel
        if (aterrizable(col, row)) elegido = { col: col, row: row, n: n, dir: dir };
      }
      return elegido;
    },

    flash: function (G, idx) {
      var d = this.destino(G, idx);
      if (!d) return false;
      var p = G.pacs[idx];
      var v = CFG.DIR_V[d.dir];
      var cx = p.tileX(), cy = p.tileY();
      /* Se come lo que haya por el camino, casilla a casilla y en orden:
       * si en medio hay una superpastilla, los fantasmas se asustan ahí
       * mismo, no al aterrizar. Solo cuenta lo que se simula aquí: el
       * Pac-Man ajeno se lo come su dueño y llega por red. */
      var muros = 0;
      for (var n = 1; n <= d.n; n++) {
        var col = CFG.wrapCol(cx + v.x * n);
        var row = cy + v.y * n;
        if (!CFG.isOpen(col, row, false)) muros++;   // por aquí se ha colado
        if (G.isLocalAuth(idx)) G.eatAt(col, row, p);
      }
      // el logro es "atraviesa muros", así que un salto por pasillo abierto
      // no cuenta: lo que se premia es usarlo para lo que es
      if (muros > 0) apunta(G, idx, { muros: muros });
      p.x = d.col * T + T / 2;
      p.y = d.row * T + T / 2;
      /* El frenazo de haber comido no se arrastra al otro lado: el flash es
       * un salto, y salir del salto parado se siente roto. */
      p.pauseTicks = 0;
      this.marcarFlash(idx, d.dir);
      sonDe(G, idx, 'playFlash');
      return true;
    },

    /* =========================================================
     * R — GRITO
     * ========================================================= */
    grito: function (G, idx, soloVisual) {
      if (soloVisual) return true;      // lo reparte el anfitrión
      G.triggerFright(H.SHOUT_SECS);
      // el rugido, aparte del modo azul que ya trae su propio ambiente
      sonDe(G, idx, 'playShout');
      return true;
    },


    /* =========================================================
     * LOS ROLES: TANQUE, SOPORTE y MAGO
     *
     * Quién manda (online), con la misma regla que el MORDISCO y el GRITO:
     *   · Lo que toca FANTASMAS o VIDAS lo ejecuta el anfitrión (PROVOCAR,
     *     PISOTÓN, los proyectiles, ESCUDO ALIADO, VIDA y todo el Mago). El
     *     invitado lo pide con su rumbo y su casilla, y en su pantalla solo
     *     se pinta hasta que llega la foto.
     *   · Lo que solo toca AL PROPIO Pac-Man (ESCUDO, INMUNIDAD, la carrera de
     *     ARROLLAR, cruzar un PORTAL) lo aplica quien lo simula: la muerte la
     *     decide él, así que el escudo tiene que estar en SU máquina.
     * ========================================================= */

    /* ¿Esta máquina decide lo que toca a los fantasmas? Jugando en local y
     * siendo anfitrión, sí; el invitado y el mirón, no. */
    manda: function (G) {
      return !G.netRole || G.netRole === 'host';
    },

    /* Un fantasma al que se le puede hacer algo: en la calle y entero */
    enLaCalle: function (g) {
      return !!g && g.mode !== 'house' && g.mode !== 'leaving' &&
        g.mode !== 'entering' && g.mode !== 'eyes';
    },

    /* Distancia en píxeles, con el túnel */
    distancia: function (ax, ay, bx, by) {
      var dx = distX(ax, bx), dy = Math.abs(ay - by);
      return Math.sqrt(dx * dx + dy * dy);
    },

    /* Pac-Man vivo en el laberinto (ni fuera, ni muriendo, ni de máquina) */
    vivo: function (G, i) {
      var p = G.pacs[i];
      if (!p || p.out || p.dying || p.bot) return false;
      return !(G.vsGhostOf && G.vsGhostOf(i) >= 0);
    },

    /* ---------- lo que consulta el motor ---------- */
    congelado: function (gid) {
      return this.on && this.hielo[gid] > 0;
    },

    /* PROVOCAR: la casilla del Tanque más cercano que esté provocando, o null.
     * Solo a los que persiguen de verdad: ni azules, ni ojos, ni en casa. */
    objetivo: function (G, g) {
      if (!this.on || g.mode !== 'normal' || g.frightened) return null;
      var mejor = null, mejorD = Infinity;
      for (var i = 0; i < this.st.length; i++) {
        if (!(this.st[i].provoca > 0) || !this.vivo(G, i)) continue;
        var p = G.pacs[i];
        var d = this.distancia(p.x, p.y, g.x, g.y);
        if (d < mejorD) { mejorD = d; mejor = p; }
      }
      return mejor ? { x: mejor.tileX(), y: mejor.tileY() } : null;
    },

    /* PROVOCAR, la otra mitad: mientras un Tanque provoca, los fantasmas que
     * lo persiguen IGNORAN al resto del equipo: pasan a través de los demás
     * Pac-Man sin matarlos. Al Tanque sí lo matan (para eso se ofrece). Los
     * azules no están provocados: huyen y se comen como siempre. */
    ignoraA: function (G, idx, g) {
      if (!this.on || !g || g.mode !== 'normal' || g.frightened) return false;
      for (var i = 0; i < this.st.length; i++) {
        if (i !== idx && this.st[i].provoca > 0 && this.vivo(G, i)) return true;
      }
      return false;
    },

    /* PISOTÓN: el Pac-Man del que huye ese fantasma, o null */
    huyeDe: function (G, g) {
      if (!this.on || !(this.huye[g.id] > 0) || g.mode !== 'normal') return null;
      var p = G.pacs[this.huyeQuien[g.id]];
      return (p && !p.out) ? p : null;
    },

    /* ¿Ese choque se perdona? INMUNIDAD, la carrera de ARROLLAR y el medio
     * segundo tras romperse un escudo no mueren; un ESCUDO se gasta aquí. */
    salvaDelChoque: function (G, idx) {
      var s = this.estado(idx);
      if (!s) return false;
      if (s.inmune > 0 || s.arrolla > 0 || s.gracia > 0 || s.dimension > 0) return true;
      /* los dos escudos (el propio del Tanque y el que da el Soporte) se
       * rompen con el primer golpe */
      if (s.coraza > 0 || s.escudo > 0) {
        s.coraza = 0;
        s.escudo = 0;
        s.gracia = H.ESCUDO_GRACIA;
        var p = G.pacs[idx];
        if (p) this.efecto('roto', p.x, p.y, 20);
        sonDe(G, idx, 'playBiteMiss');
        if (G.netRole === 'guest') G.netSend('gevt', { t: 'habRoto' });
        else G.hostEvt({ t: 'habRoto', w: idx });
        return true;
      }
      return false;
    },

    /* Un escudo que se rompió en otra máquina (el invitado decide sus choques) */
    escudoRoto: function (G, idx) {
      var s = this.estado(idx);
      if (!s || idx === G.localIdx && !G.isSpec()) return;
      s.escudo = 0;
      s.coraza = 0;
      var p = G.pacs[idx];
      if (p) this.efecto('roto', p.x, p.y, 20);
    },

    /* ¿Está encendido ese poder? (la barra lo marca aparte) */
    activa: function (G, idx, k) {
      var s = this.estado(idx);
      if (!s) return false;
      var h = this.listaDe(G, idx)[k];
      if (!h) return false;
      switch (h.id) {
        case 'turbo': return s.turbo > 0;
        case 'embestida': return s.carga > 0;
        case 'acecho': return s.acecho > 0;
        case 'provocar': return s.provoca > 0;
        case 'escudo': return s.coraza > 0;
        case 'arrollar': return s.arrolla > 0;
        case 'inmunidad': return s.inmune > 0;
        case 'tormenta': return s.tormenta > 0;
        case 'portal': return !!this.portales[idx];
        case 'runa': return !!this.runas[idx];
      }
      return false;
    },

    marcarEscudo: function (idx, ticks) {
      var s = this.estado(idx);
      if (s) s.escudo = Math.max(s.escudo, ticks || H.ESCUDO_TICKS);
    },

    /* Un efecto que solo se pinta (rayo, chispazo de hielo, fogonazo...) */
    efecto: function (tipo, x, y, ticks, x0, y0) {
      if (this.fx.length > 24) this.fx.shift();
      this.fx.push({ t: tipo, x: x, y: y, n: ticks, tot: ticks,
                     x0: (x0 == null) ? x : x0, y0: (y0 == null) ? y : y0 });
    },

    /* =========================================================
     * TANQUE
     * ========================================================= */
    /* Q — PROVOCAR: 5 s en que TODOS los fantasmas del mapa persiguen la
     * casilla del Tanque (aunque tocara dispersarse) e ignoran al resto del
     * equipo (ver ignoraA). Cambia el objetivo, no el modo: no se asustan y al
     * Tanque sí lo matan. */
    provocar: function (G, idx) {
      var s = this.estado(idx);
      if (!s) return false;
      s.provoca = H.TAUNT_TICKS;
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (g && g.mode === 'normal' && !g.driven()) g.clearPlan();   // que lo piensen ya
      }
      sonDe(G, idx, 'playShout');
      return true;
    },

    /* E — PISOTÓN: los fantasmas a diez casillas huyen del Tanque 6 s.
     * No se ponen azules ni se pueden comer. Sin nadie cerca, no sale. */
    pisoton: function (G, idx, soloVisual, extra) {
      var p = G.pacs[idx], s = this.estado(idx);
      if (!p || !s) return false;
      var alcance = H.PISOTON_TILES * T + (extra || 0);
      var blancos = [];
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!this.enLaCalle(g) || g.driven()) continue;
        if (this.distancia(p.x, p.y, g.x, g.y) <= alcance) blancos.push(g);
      }
      if (!blancos.length) return false;
      s.pisoton = 30;                       // la onda que se pinta
      sonDe(G, idx, 'playCharge');
      if (soloVisual) return true;
      for (i = 0; i < blancos.length; i++) {
        var gb = blancos[i];
        this.huye[gb.id] = H.PISOTON_TICKS;
        this.huyeQuien[gb.id] = idx;
        /* el que venía de cara se da la vuelta: en un pasillo no hay cruce
         * donde decidir huir, y se comería al Tanque antes de llegar a uno */
        var v = CFG.DIR_V[gb.dir];
        var hx = p.x - gb.x, ancho = CFG.COLS * T;
        if (hx > ancho / 2) hx -= ancho; else if (hx < -ancho / 2) hx += ancho;
        if (v && (v.x * hx + v.y * (p.y - gb.y)) > 0) gb.forceReverse();
        else gb.clearPlan();
      }
      return true;
    },

    /* R — ARROLLAR, la APISONADORA: en LÍNEA RECTA hacia la última flecha
     * HASTA TOPARSE CON UNA PARED, a x1.4, invulnerable y comiéndose a
     * cualquier fantasma que toque (azul o no) por 200 fijos, sin cadena y sin
     * parar la partida. No se dirige: las flechas no la tuercen. No va por
     * tiempo; por si el trazado dejara una fila sin paredes (el túnel), se
     * corta al dar una vuelta entera. La carrera la simula quien
     * lleva a ese Pac-Man; comerse fantasmas lo decide el que manda.
     * Sin ni una casilla libre delante, no sale. */
    libreDelante: function (col, row, dir) {
      var v = CFG.DIR_V[dir];
      if (!v) return false;
      var c = CFG.wrapCol(col + v.x), r = row + v.y;
      return r >= 0 && r < CFG.ROWS && !esCasa(c, r) && CFG.isOpen(c, r, false);
    },

    arrollar: function (G, idx) {
      var p = G.pacs[idx], s = this.estado(idx);
      if (!p || !s) return false;
      var dir = this.dirFlash(p);
      if (!this.libreDelante(p.tileX(), p.tileY(), dir)) return false;
      // encarrilada por el centro de su pasillo
      if (CFG.DIR_V[dir].x) p.y = p.tileY() * T + T / 2;
      else p.x = p.tileX() * T + T / 2;
      s.adir = dir;
      s.arrolla = 1;         // encendida: la apaga la pared
      s.arecorre = 0;
      p.dir = dir;
      p.pauseTicks = 0;
      sonDe(G, idx, 'playCharge');
      return true;
    },

    arrollando: function (idx) {
      var s = this.estado(idx);
      return !!s && s.arrolla > 0;
    },

    /* Un tick de la apisonadora (lo llama el motor EN VEZ de mover a Pac-Man) */
    moverArrolla: function (G, idx) {
      var p = G.pacs[idx], s = this.estado(idx);
      if (!p || !s || !(s.arrolla > 0)) return;
      var v = CFG.DIR_V[s.adir], ancho = CFG.COLS * T;
      var resto = G.pacSpeedPx(p);
      s.arecorre = (s.arecorre || 0) + resto;
      if (s.arecorre > ancho) s.arrolla = 0;    // una vuelta entera: basta
      p.dir = s.adir;
      /* se avanza a pasos de centro en centro: al llegar a uno se mira si la
       * casilla de delante está libre, y si no, se acaba ahí */
      for (var guarda = 0; resto > 0.0001 && guarda < 8; guarda++) {
        var cx = p.tileX() * T + T / 2, cy = p.tileY() * T + T / 2;
        var hasta = v.x ? (cx - p.x) * v.x : (cy - p.y) * v.y;   // >0: el centro está delante
        if (hasta <= 0.0001) {
          if (!this.libreDelante(p.tileX(), p.tileY(), s.adir)) {
            p.x = cx; p.y = cy;
            s.arrolla = 0;
            break;
          }
          hasta = T;
        }
        var paso = Math.min(resto, hasta);
        p.x += v.x * paso;
        p.y += v.y * paso;
        resto -= paso;
        if (p.x < 0) p.x += ancho; else if (p.x >= ancho) p.x -= ancho;
      }
      // el invitado se come lo suyo con guestEatAt, y el anfitrión lo confirma
      if (this.manda(G) && G.isLocalAuth(idx)) G.eatAt(p.tileX(), p.tileY(), p);
      p.pauseTicks = 0;
      /* lo que pilla por el camino */
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!this.enLaCalle(g)) continue;
        if (distX(g.x, p.x) >= T || Math.abs(g.y - p.y) >= T) continue;
        if (this.manda(G)) {
          if (G.isLocalAuth(idx)) this.matarMago(G, g, idx, 'aplasta');
        } else if (idx === G.localIdx && s.guard[g.id] <= 0) {
          s.guard[g.id] = H.BITE_GUARD;
          G.netSend('gevt', { t: 'habCome', g: g.id });
        }
      }
    },

    /* Anfitrión: el invitado dice que su apisonadora ha pillado a un fantasma.
     * Vale si de verdad la lleva encendida (lo sabe por su petición) y si ese
     * fantasma está cerca de donde le llega su Pac-Man. */
    peticionCome: function (G, who, gid) {
      var s = this.estado(who), p = G.pacs[who], g = G.ghosts[gid | 0];
      if (!s || !p || !(s.arrollaRed > 0) || !this.enLaCalle(g)) return;
      var alcance = 2 * T + H.BITE_NET_MARGIN;
      if (distX(g.x, p.x) > alcance || Math.abs(g.y - p.y) > alcance) return;
      this.matarMago(G, g, who, 'aplasta');
    },

    /* =========================================================
     * SOPORTE
     * ========================================================= */
    /* Q — DISPARO HELADO y la Q del Mago (BOLA DE FUEGO): un proyectil en
     * línea recta hacia la última flecha que se para en la pared. Sin blanco
     * gasta igual: si no, se dispararía sin parar. Lo simula quien manda. */
    disparar: function (G, idx, tipo, dir, desde) {
      var p = G.pacs[idx];
      if (!p) return false;
      sonDe(G, idx, tipo === 'fuego' ? 'playFlash' : 'playTurbo');
      if (!this.manda(G)) return true;
      var d = (dir >= 0 && dir <= 3) ? dir : this.dirFlash(p);
      var v = CFG.DIR_V[d];
      /* Sale de donde estaba quien disparó EN SU PANTALLA: la posición de un
       * invitado le llega aquí unos ticks tarde, y desde ahí la bola saldría
       * por detrás de él. Se cree lo que dice solo si está cerca de lo que se
       * ve aquí (tres casillas), que es lo que puede haber andado entretanto. */
      var ox = p.x, oy = p.y;
      if (desde && typeof desde.x === 'number' && typeof desde.y === 'number' &&
          this.distancia(desde.x, desde.y, p.x, p.y) <= 3 * T) {
        ox = desde.x; oy = desde.y;
      }
      // sale encarrilado por el centro de su pasillo
      var x = v.x ? ox : Math.floor(ox / T) * T + T / 2;
      var y = v.y ? oy : Math.floor(oy / T) * T + T / 2;
      this.balas.push({ t: tipo, x: x, y: y, d: d, w: idx });
      return true;
    },

    /* Un tick de los proyectiles. Solo choca quien manda; el invitado solo
     * los hace avanzar para que no vayan a saltos entre fotos. */
    pasoBalas: function (G) {
      var ancho = CFG.COLS * T, manda = this.manda(G);
      for (var b = this.balas.length - 1; b >= 0; b--) {
        var bl = this.balas[b], v = CFG.DIR_V[bl.d], fuera = false;
        for (var px = 0; px < H.PROYECTIL_VEL && !fuera; px++) {
          var nx = bl.x + v.x, ny = bl.y + v.y;
          if (nx < 0) nx += ancho; else if (nx >= ancho) nx -= ancho;
          var col = Math.floor(nx / T), row = Math.floor(ny / T);
          if (row < 0 || row >= CFG.ROWS || esCasa(col, row) || !CFG.isOpen(col, row, false)) {
            fuera = true;
            this.efecto(bl.t === 'fuego' ? 'humo' : 'escarcha', bl.x, bl.y, 12);
            break;
          }
          /* el REY FANTASMA: la bola le quita vida, el hielo lo congela */
          var JB = window.PM.Jefe;
          if (manda && JB && JB.impactaEn(G, nx, ny)) {
            if (bl.t === 'fuego') JB.danar(G, CFG.JEFE.DANO.fuego, bl.w, 'fuego');
            else JB.congelar(G, CFG.JEFE.HIELO);
            this.efecto(bl.t === 'fuego' ? 'fuego' : 'escarcha', nx, ny, 18);
            fuera = true;
            break;
          }
          bl.x = nx; bl.y = ny;
          if (!manda) continue;
          for (var i = 0; i < 4; i++) {
            var g = G.ghosts[i];
            if (!this.enLaCalle(g)) continue;
            if (distX(g.x, bl.x) > 6 || Math.abs(g.y - bl.y) > 6) continue;
            this.impacto(G, bl, g);
            fuera = true;
            break;
          }
        }
        if (fuera) this.balas.splice(b, 1);
      }
    },

    impacto: function (G, bl, g) {
      if (bl.t === 'fuego') {
        this.matarMago(G, g, bl.w, 'fuego');
        return;
      }
      /* el hielo congela al primero y a todos los de su misma casilla */
      var col = g.tileX(), row = g.tileY();
      for (var i = 0; i < 4; i++) {
        var o = G.ghosts[i];
        if (!this.enLaCalle(o)) continue;
        if (o === g || (o.tileX() === col && o.tileY() === row)) {
          this.hielo[o.id] = H.HIELO_TICKS;
          this.huye[o.id] = 0;
        }
      }
      this.efecto('escarcha', g.x, g.y, 18);
      G.hostEvt({ t: 'habFx', f: 'escarcha', x: Math.round(g.x), y: Math.round(g.y) });
      son('playBiteMiss', !mio(G, bl.w));
    },

    /* W — INMUNIDAD: 3 s intocable; a diferencia del escudo, no se gasta */
    inmunidad: function (G, idx) {
      var s = this.estado(idx);
      if (!s) return false;
      s.inmune = H.INMUNE_TICKS;
      sonDe(G, idx, 'playTurbo');
      return true;
    },

    /* E — ESCUDO ALIADO: al compañero vivo más cercano. Sin compañeros, no
     * sale ni gasta. */
    aliadoDe: function (G, idx) {
      var p = G.pacs[idx], mejor = -1, mejorD = Infinity;
      if (!p) return -1;
      for (var i = 0; i < G.pacs.length; i++) {
        if (i === idx || !this.vivo(G, i)) continue;
        var o = G.pacs[i];
        var d = this.distancia(p.x, p.y, o.x, o.y);
        if (d < mejorD) { mejorD = d; mejor = i; }
      }
      return mejor;
    },

    aliado: function (G, idx, soloVisual) {
      var j = this.aliadoDe(G, idx);
      if (j < 0) return false;
      sonDe(G, idx, 'playStealth');
      if (soloVisual) return true;
      this.marcarEscudo(j, H.ALIADO_TICKS);
      var o = G.pacs[j];
      this.efecto('amparo', o.x, o.y, 24);
      G.hostEvt({ t: 'habEsc', w: j });
      return true;
    },

    /* E MANTENIDA 3 s — escudo a TODOS los compañeros vivos a
     * ALIADO_AREA_TILES casillas (se mide por ejes: un cuadro a la redonda).
     * Al propio Soporte no. Sin nadie a tiro, ni sale ni gasta. */
    aliadosCerca: function (G, idx) {
      var p = G.pacs[idx], out = [];
      if (!p) return out;
      var alcance = H.ALIADO_AREA_TILES * T + T / 2;
      for (var i = 0; i < G.pacs.length; i++) {
        if (i === idx || !this.vivo(G, i)) continue;
        var o = G.pacs[i];
        if (distX(o.x, p.x) <= alcance && Math.abs(o.y - p.y) <= alcance) out.push(i);
      }
      return out;
    },

    aliadoArea: function (G, idx, soloVisual) {
      var js = this.aliadosCerca(G, idx);
      if (!js.length) return false;
      sonDe(G, idx, 'playStealth');
      if (soloVisual) return true;
      for (var n = 0; n < js.length; n++) {
        this.marcarEscudo(js[n], H.ALIADO_TICKS);
        var o = G.pacs[js[n]];
        this.efecto('amparo', o.x, o.y, 24);
        G.hostEvt({ t: 'habEsc', w: js[n] });
      }
      return true;
    },

    /* Q MANTENIDA 2 s — PLACA DE HIELO en la casilla del Soporte durante
     * PLACA_TICKS: todo fantasma que la pise se congela (a cada uno, una vez
     * por placa: si no, el que se queda quieto encima no se descongelaría
     * nunca). Una por Soporte; poner otra quita la anterior. La pone quien
     * manda, como la runa. */
    puedePlaca: function (G, idx) {
      var c = this.casillaDe(G, idx);
      if (!c || !aterrizable(c.c, c.r)) return false;
      sonDe(G, idx, 'playTurbo');
      return true;
    },

    placa: function (G, idx, d) {
      var c = this.casillaDe(G, idx, d);
      if (!c || !aterrizable(c.c, c.r)) return false;
      this.placas[idx] = { c: c.c, r: c.r, t: H.PLACA_TICKS, z: 0 };
      this.efecto('escarcha', c.c * T + T / 2, c.r * T + T / 2, 18);
      sonDe(G, idx, 'playTurbo');
      return true;
    },

    /* R — VIDA EXTRA: +1 al compañero vivo con menos vidas (empate: el más
     * cercano, y con todos igual, uno mismo). No revive a quien está fuera y
     * no sube a nadie de VIDA_MAX. Con vidas compartidas, al fondo común. */
    destinoVida: function (G, idx) {
      var ind = (G.playerCount > 1 && G.livesMode === 'individual');
      if (!ind) return (G.lives < H.VIDA_MAX) ? idx : -1;
      var p = G.pacs[idx], mejor = -1, mejorV = Infinity, mejorD = Infinity;
      for (var i = 0; i < G.pacs.length; i++) {
        if (!this.vivo(G, i)) continue;
        var o = G.pacs[i];
        if (o.lives >= H.VIDA_MAX) continue;
        var d = (i === idx) ? 0 : this.distancia(p.x, p.y, o.x, o.y);
        if (o.lives < mejorV || (o.lives === mejorV && d < mejorD)) {
          mejorV = o.lives; mejorD = d; mejor = i;
        }
      }
      return mejor;
    },

    vida: function (G, idx, soloVisual) {
      var j = this.destinoVida(G, idx);
      if (j < 0) return false;
      if (soloVisual) return true;
      var ind = (G.playerCount > 1 && G.livesMode === 'individual');
      if (ind) G.pacs[j].lives++;
      else G.lives++;
      var o = G.pacs[j] || G.pacs[idx];
      this.efecto('vida', o.x, o.y, 40);
      G.addPopup(o.x, o.y - 6, '1UP', 60);
      G.hostEvt({ t: 'habVida', w: j });
      window.AudioSys && AudioSys.playExtraLife();
      return true;
    },

    /* =========================================================
     * MAGO
     * ========================================================= */
    /* Lo que mata el Mago (y lo que aplasta la APISONADORA del Tanque) vale
     * MAGO_PUNTOS fijos, no toca la cadena y no para la partida: el fantasma
     * pasa a ojos y se sigue jugando. */
    matarMago: function (G, g, who, como) {
      var p = G.pacs[who];
      var ox = p ? p.x : g.x, oy = p ? p.y : g.y;
      g.eaten();
      this.hielo[g.id] = 0;
      this.huye[g.id] = 0;
      G.addScore(H.MAGO_PUNTOS);
      G.addPopup(g.x, g.y, H.MAGO_PUNTOS, 45);
      this.efecto(como, g.x, g.y, como === 'rayo' ? 14 : 18, ox, oy);
      if (mio(G, who)) {
        G.runGhosts++;
        G.bumpAch && G.bumpAch({ fantasmas: 1 });
      }
      G.hostEvt({ t: 'magoKill', g: g.id, w: who, f: como,
        x: Math.round(g.x), y: Math.round(g.y), ox: Math.round(ox), oy: Math.round(oy) });
      window.AudioSys && AudioSys.playEatGhost();
    },

    /* Lo mismo contado por el anfitrión, en otra pantalla */
    magoKill: function (G, e) {
      var g = G.ghosts[e.g | 0];
      if (!g) return;
      g.eaten();
      this.hielo[g.id] = 0;
      G.addPopup(e.x, e.y, H.MAGO_PUNTOS, 45);
      this.efecto(e.f || 'fuego', e.x, e.y, e.f === 'rayo' ? 14 : 18, e.ox, e.oy);
      if ((e.w | 0) === G.localIdx && !G.isSpec()) {
        G.runGhosts++;
        G.bumpAch && G.bumpAch({ fantasmas: 1 });
      }
      window.AudioSys && AudioSys.playEatGhost();
    },

    /* La casilla de un poder que se pone en el sitio: la de quien lo pide.
     * Al anfitrión le llega la que ve el invitado, que es la buena. */
    casillaDe: function (G, idx, d) {
      var p = G.pacs[idx];
      if (d && d.c >= 0 && d.c < CFG.COLS && d.r >= 0 && d.r < CFG.ROWS) {
        return { c: d.c | 0, r: d.r | 0 };
      }
      return p ? { c: p.tileX(), r: p.tileY() } : null;
    },

    /* W — PORTAL. Primera pulsación: la entrada donde está el Mago, sin
     * gastar, y él pasa a la OTRA DIMENSIÓN (CFG.HAB.PORTAL_ESPERA como
     * mucho). Segunda: la salida donde esté, vuelve, y las dos bocas quedan
     * abiertas PORTAL_TICKS para todo el equipo (ahí empieza la recarga). Si no
     * pulsa, la salida se pone sola al acabarse el tiempo (pasoRoles). */
    portal: function (G, idx, d) {
      var c = this.casillaDe(G, idx, d);
      if (!c || !aterrizable(c.c, c.r)) return false;
      var po = this.portales[idx], s = this.estado(idx);
      if (!po) {
        this.portales[idx] = { ec: c.c, er: c.r, sc: -1, sr: -1, t: 0, e: H.PORTAL_ESPERA };
        if (s) s.dimension = H.PORTAL_ESPERA;
        this.sinGasto = true;
        this.efecto('boca', c.c * T + T / 2, c.r * T + T / 2, 16);
        sonDe(G, idx, 'playStealth');
        return true;
      }
      if (!(po.t > 0)) {
        if (c.c === po.ec && c.r === po.er) return false;
        this.cerrarPortal(G, idx, c);
        return true;
      }
      return false;
    },

    /* La salida del portal de idx en la casilla c y vuelta a la dimensión de
     * todos. Sin casilla buena (o encima de la entrada) el portal se deshace. */
    cerrarPortal: function (G, idx, c) {
      var po = this.portales[idx], s = this.estado(idx);
      if (s) s.dimension = 0;
      if (!po || po.t > 0) return;
      if (!c || !aterrizable(c.c, c.r) || (c.c === po.ec && c.r === po.er)) {
        this.portales[idx] = null;
        return;
      }
      po.sc = c.c; po.sr = c.r; po.e = 0; po.t = H.PORTAL_TICKS;
      /* sale POR la boca: que no la cruce al instante */
      if (s) { s.ultTile = c.r * CFG.COLS + c.c; s.cruce = H.PORTAL_CRUCE; }
      this.efecto('boca', c.c * T + T / 2, c.r * T + T / 2, 16);
      sonDe(G, idx, 'playFlash');
    },

    /* ¿Ese jugador está en la otra dimensión? */
    enDimension: function (idx) {
      var s = this.estado(idx);
      return !!s && s.dimension > 0;
    },

    /* Quién mira ESTA pantalla desde la otra dimensión (-1: nadie). Con dos en
     * el mismo teclado la pantalla es de los dos, así que no se apaga nada. */
    miraDesdeDimension: function (G) {
      if (!this.on || !G) return -1;
      var yo;
      if (G.netRole) yo = (G.isSpec && G.isSpec()) ? -1 : G.localIdx;
      else yo = (G.playerCount === 1) ? 0 : -1;
      return (yo >= 0 && this.enDimension(yo)) ? yo : -1;
    },

    /* Cruzar: lo hace quien simula a ese Pac-Man, al ENTRAR en una boca (no
     * por estar encima: el Mago que pone la salida donde está no rebota). */
    cruzar: function (G, p) {
      if (!this.on || !p) return;
      var s = this.estado(p.id | 0);
      if (!s || s.dimension > 0) return;
      var col = p.tileX(), row = p.tileY();
      var tile = row * CFG.COLS + col;
      if (tile === s.ultTile) return;
      s.ultTile = tile;
      if (s.cruce > 0) return;
      for (var i = 0; i < this.portales.length; i++) {
        var po = this.portales[i];
        if (!po || !(po.t > 0)) continue;
        var dc = -1, dr = -1;
        if (col === po.ec && row === po.er) { dc = po.sc; dr = po.sr; }
        else if (col === po.sc && row === po.sr) { dc = po.ec; dr = po.er; }
        if (dc < 0) continue;
        var x0 = p.x, y0 = p.y;
        p.x = dc * T + T / 2;
        p.y = dr * T + T / 2;
        s.cruce = H.PORTAL_CRUCE;
        s.ultTile = dr * CFG.COLS + dc;
        this.efecto('boca', x0, y0, 16);
        this.efecto('boca', p.x, p.y, 16);
        sonDe(G, p.id | 0, 'playFlash');
        return;
      }
    },

    /* E — RUNA: trampa en la casilla del Mago 15 s; al pisarla mueren TODOS
     * los fantasmas que estén en esa casilla. Una por Mago: poner otra quita
     * la anterior. */
    runa: function (G, idx, d) {
      var c = this.casillaDe(G, idx, d);
      if (!c || !aterrizable(c.c, c.r)) return false;
      this.runas[idx] = { c: c.c, r: c.r, t: H.RUNA_TICKS };
      sonDe(G, idx, 'playBiteMiss');
      return true;
    },

    /* R — TORMENTA: 2 s, un rayo por segundo sobre el fantasma más cercano a
     * seis casillas. Sin nadie a tiro, ese rayo se pierde. Sale siempre. */
    tormenta: function (G, idx) {
      var s = this.estado(idx);
      if (!s) return false;
      s.tormenta = H.TORMENTA_RAYOS * H.TORMENTA_CADA;
      sonDe(G, idx, 'playShout');
      if (this.manda(G)) this.rayo(G, idx);
      return true;
    },

    rayo: function (G, idx) {
      var p = G.pacs[idx];
      if (!p) return;
      var mejor = null, mejorD = Infinity;
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!this.enLaCalle(g)) continue;
        var d = this.distancia(p.x, p.y, g.x, g.y);
        if (d <= H.TORMENTA_TILES * T && d < mejorD) { mejorD = d; mejor = g; }
      }
      /* el REY FANTASMA, si está más cerca que cualquier fantasma */
      var JR = window.PM.Jefe;
      if (JR && JR.activo(G)) {
        var dj = this.distancia(p.x, p.y, G.jefe.x, G.jefe.y);
        if (dj <= H.TORMENTA_TILES * T && dj < mejorD) {
          this.efecto('rayo', G.jefe.x, G.jefe.y, 14, p.x, p.y);
          JR.danar(G, CFG.JEFE.DANO.rayo, idx, 'rayo');
          return;
        }
      }
      if (mejor) this.matarMago(G, mejor, idx, 'rayo');
    },

    /* ---------- los relojes de los roles (desde paso) ---------- */
    pasoRoles: function (G, corre) {
      var i, s;
      for (i = this.fx.length - 1; i >= 0; i--) {
        if (--this.fx[i].n <= 0) this.fx.splice(i, 1);
      }
      for (i = 0; i < this.st.length; i++) {
        s = this.st[i];
        if (s.pisoton > 0) s.pisoton--;
      }
      if (!corre) return;
      var manda = this.manda(G);
      for (i = 0; i < this.st.length; i++) {
        s = this.st[i];
        if (s.provoca > 0) s.provoca--;
        if (s.escudo > 0) s.escudo--;
        if (s.coraza > 0) s.coraza--;
        if (s.gracia > 0) s.gracia--;
        if (s.inmune > 0) s.inmune--;
        if (s.cruce > 0) s.cruce--;
        if (s.arrollaRed > 0) s.arrollaRed--;
        if (s.tormenta > 0) {
          if (!this.vivo(G, i)) { s.tormenta = 0; }
          else {
            s.tormenta--;
            if (manda && s.tormenta > 0 && s.tormenta % H.TORMENTA_CADA === 0) this.rayo(G, i);
          }
        }
        if (s.dimension > 0) s.dimension--;
        /* Se acaba el rato en la otra dimensión: la salida se pone sola donde
         * esté. La pone quien simula a ese Pac-Man (el invitado se la pide al
         * anfitrión, como si hubiera pulsado); el anfitrión solo la pone él con
         * el de un invitado que no ha dicho nada en PORTAL_RED_GRACIA. */
        var po = this.portales[i];
        if (po) {
          if (!(po.t > 0)) {
            po.e--;
            var suyo = G.isLocalAuth(i);
            if ((suyo && po.e === 0) || (!suyo && manda && po.e <= -H.PORTAL_RED_GRACIA)) {
              this.cerrarPortal(G, i, this.casillaDe(G, i));
              this.gastarId(G, i, 'portal');
              if (G.netRole === 'guest' && suyo) this.avisar(G, i, this.kDe(G, i, 'portal'));
            }
          } else if (--po.t <= 0) {
            this.portales[i] = null;
          }
        }
        var ru = this.runas[i];
        if (ru && --ru.t <= 0) this.runas[i] = null;
        var pl = this.placas[i];
        if (pl && --pl.t <= 0) this.placas[i] = null;
      }
      for (var j = 0; j < 4; j++) {
        if (this.hielo[j] > 0) this.hielo[j]--;
        if (this.huye[j] > 0) this.huye[j]--;
      }
      this.pasoBalas(G);
      if (!manda) return;
      /* runas pisadas */
      for (i = 0; i < this.runas.length; i++) {
        var r = this.runas[i];
        if (!r) continue;
        for (j = 0; j < 4; j++) {
          var g = G.ghosts[j];
          if (!this.enLaCalle(g) || g.tileX() !== r.c || g.tileY() !== r.r) continue;
          this.runas[i] = null;
          this.matarMago(G, g, i, 'runa');     // y sigue: caen todos los de la casilla
        }
      }
      /* placas de hielo pisadas */
      for (i = 0; i < this.placas.length; i++) {
        var pc = this.placas[i];
        if (!pc) continue;
        for (j = 0; j < 4; j++) {
          var gp = G.ghosts[j];
          if (pc.z & (1 << j)) continue;
          if (!this.enLaCalle(gp) || gp.tileX() !== pc.c || gp.tileY() !== pc.r) continue;
          pc.z |= (1 << j);
          this.hielo[j] = H.HIELO_TICKS;
          this.huye[j] = 0;
          this.efecto('escarcha', gp.x, gp.y, 18);
          G.hostEvt({ t: 'habFx', f: 'escarcha', x: Math.round(gp.x), y: Math.round(gp.y) });
        }
      }
    },

    /* Número de tecla de un poder por su id (-1 si ese jugador no lo tiene) */
    kDe: function (G, idx, id) {
      var lista = this.listaDe(G, idx);
      for (var k = 0; k < lista.length; k++) if (lista[k].id === id) return k;
      return -1;
    },

    /* Gasta la recarga de un poder por su id (la salida del portal puesta sola) */
    gastarId: function (G, idx, id) {
      var lista = this.listaDe(G, idx);
      for (var k = 0; k < lista.length; k++) if (lista[k].id === id) this.gastar(G, idx, k);
    },

    /* Al morir UN jugador (la partida sigue): se le cortan sus efectos */
    limpiarJugador: function (idx) {
      var s = this.st[idx];
      if (!s) return;
      s.provoca = 0; s.escudo = 0; s.coraza = 0; s.gracia = 0; s.inmune = 0;
      s.arrolla = 0; s.tormenta = 0; s.turbo = 0; s.pedirQ = 0;
      s.mant = -1; s.mantT = 0;
      s.dimension = 0;
    },

    /* ---------- la foto de red de los roles ----------
     * Lo que ejecuta el anfitrión (hielo, huidas, proyectiles, portales,
     * runas) y los efectos de cada jugador, para pintarlos igual en todas
     * las pantallas. Doce veces por segundo, así que en números cortos. */
    resumenRoles: function () {
      var e = [], i;
      for (i = 0; i < this.st.length; i++) {
        var s = this.st[i];
        e.push([s.provoca, s.escudo, s.pisoton, s.arrolla, s.inmune, s.tormenta, s.gracia, s.coraza, s.dimension]);
      }
      var po = [], ru = [], bl = [], pl = [];
      for (i = 0; i < this.st.length; i++) {
        var p = this.portales[i], r = this.runas[i], q = this.placas[i];
        po.push(p ? [p.ec, p.er, p.sc, p.sr, p.t, p.e] : 0);
        ru.push(r ? [r.c, r.r, r.t] : 0);
        pl.push(q ? [q.c, q.r, q.t, q.z] : 0);
      }
      for (i = 0; i < this.balas.length; i++) {
        var b = this.balas[i];
        bl.push([b.t === 'fuego' ? 1 : 0, Math.round(b.x), Math.round(b.y), b.d, b.w]);
      }
      return { e: e, hz: this.hielo.slice(), hu: this.huye.slice(), hq: this.huyeQuien.slice(),
               po: po, ru: ru, bl: bl, pl: pl };
    },

    aplicarRoles: function (hx, mioIdx) {
      if (!this.on || !hx) return;
      var i, k;
      var CAMPOS = ['provoca', 'escudo', 'pisoton', 'arrolla', 'inmune', 'tormenta', 'gracia', 'coraza', 'dimension'];
      for (i = 0; hx.e && i < hx.e.length && i < this.st.length; i++) {
        var fila = hx.e[i], s = this.st[i];
        if (!fila) continue;
        for (k = 0; k < CAMPOS.length; k++) {
          var v = fila[k] | 0;
          if (i === mioIdx) {
            /* lo mío que decido yo (escudo, inmunidad, la carrera) no se toca;
             * lo que ejecuta él solo se corrige hacia arriba */
            if (k === 1 || k === 3 || k === 4 || k === 6 || k === 7 || k === 8) continue;
            if (v > s[CAMPOS[k]]) s[CAMPOS[k]] = v;
          } else {
            s[CAMPOS[k]] = v;
          }
        }
      }
      if (hx.hz) this.hielo = hx.hz.slice(0, 4);
      if (hx.hu) this.huye = hx.hu.slice(0, 4);
      if (hx.hq) this.huyeQuien = hx.hq.slice(0, 4);
      if (hx.po) {
        for (i = 0; i < this.st.length; i++) {
          var p = hx.po[i];
          var nuevo = p ? { ec: p[0], er: p[1], sc: p[2], sr: p[3], t: p[4], e: p[5] } : null;
          /* el mío que YA he cerrado aquí y el anfitrión aún no: se queda el
           * mío (si no, la foto lo volvería a abrir y se cerraría otra vez) */
          var mioPo = this.portales[i];
          if (i === mioIdx && mioPo && mioPo.t > 0 && (!nuevo || !(nuevo.t > 0))) continue;
          this.portales[i] = nuevo;
        }
      }
      if (hx.ru) {
        for (i = 0; i < this.st.length; i++) {
          var r = hx.ru[i];
          this.runas[i] = r ? { c: r[0], r: r[1], t: r[2] } : null;
        }
      }
      if (hx.pl) {
        for (i = 0; i < this.st.length; i++) {
          var q = hx.pl[i];
          this.placas[i] = q ? { c: q[0], r: q[1], t: q[2], z: q[3] | 0 } : null;
        }
      }
      if (hx.bl) {
        this.balas = [];
        for (i = 0; i < hx.bl.length; i++) {
          var b = hx.bl[i];
          this.balas.push({ t: b[0] ? 'fuego' : 'hielo', x: b[1], y: b[2], d: b[3], w: b[4] });
        }
      }
    },

    /* =========================================================
     * EL DIBUJO de los roles (lo llama Game.render)
     * ========================================================= */
    /* Lo que va en el SUELO, debajo de fantasmas y Pac-Man */
    dibujarSuelo: function (G, ctx) {
      if (!this.on) return;
      var Y = CFG.MAZE_Y, tk = G.tick, i;
      /* la OTRA DIMENSIÓN, vista desde dentro: el laberinto teñido de violeta
       * con un borde que respira y una barra con lo que queda. Lo de fuera
       * (fantasmas y compañeros) lo apaga Game.render. */
      var dentro = this.miraDesdeDimension(G);
      if (dentro >= 0) {
        var W = CFG.COLS * T, Hh = CFG.ROWS * T;
        var resta = this.estado(dentro).dimension / H.PORTAL_ESPERA;
        ctx.save();
        ctx.fillStyle = 'rgba(80, 20, 140, 0.3)';
        ctx.fillRect(0, Y, W, Hh);
        ctx.strokeStyle = 'rgba(179, 107, 255, ' + (0.45 + 0.25 * Math.sin(tk / 8)) + ')';
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, Y + 1.5, W - 3, Hh - 3);
        ctx.fillStyle = '#8b3dff';
        ctx.fillRect(0, Y, W * resta, 3);
        ctx.restore();
      }
      for (i = 0; i < this.runas.length; i++) {
        var r = this.runas[i];
        if (!r) continue;
        var rx = r.c * T + T / 2, ry = r.r * T + T / 2 + Y;
        var pul = 0.55 + 0.35 * Math.sin(tk / 6);
        ctx.save();
        ctx.strokeStyle = 'rgba(139, 61, 255, ' + pul + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(rx, ry, 5.5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        for (var k = 0; k < 5; k++) {
          var a = -Math.PI / 2 + k * 4 * Math.PI / 5 + tk / 40;
          var px = rx + Math.cos(a) * 4.5, py = ry + Math.sin(a) * 4.5;
          if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
        ctx.restore();
      }
      /* placas de hielo: un rombo helado que parpadea el último segundo */
      for (i = 0; i < this.placas.length; i++) {
        var pl = this.placas[i];
        if (!pl) continue;
        if (pl.t < 60 && Math.floor(tk / 5) % 2 === 0) continue;
        var hx = pl.c * T + T / 2, hy = pl.r * T + T / 2 + Y;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#8ff4ff';
        ctx.beginPath();
        ctx.moveTo(hx, hy - 6); ctx.lineTo(hx + 6, hy); ctx.lineTo(hx, hy + 6); ctx.lineTo(hx - 6, hy);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(tk / 7);
        ctx.strokeStyle = '#bff4ff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hx - 3, hy); ctx.lineTo(hx + 3, hy);
        ctx.moveTo(hx, hy - 3); ctx.lineTo(hx, hy + 3);
        ctx.stroke();
        ctx.restore();
      }
      for (i = 0; i < this.portales.length; i++) {
        var po = this.portales[i];
        if (!po) continue;
        this.dibujarBoca(ctx, po.ec, po.er, '#ffb852', po.t > 0 ? 1 : 0.45, tk);
        if (po.t > 0) this.dibujarBoca(ctx, po.sc, po.sr, '#00c8ff', 1, tk);
      }
    },

    dibujarBoca: function (ctx, c, r, color, alfa, tk) {
      var x = c * T + T / 2, y = r * T + T / 2 + CFG.MAZE_Y;
      ctx.save();
      ctx.globalAlpha = alfa;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 5 + Math.sin(tk / 5) * 0.8, 6.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alfa * 0.35;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    },

    /* Hielo sobre los fantasmas, proyectiles y efectos: ENCIMA de todo */
    dibujarAire: function (G, ctx) {
      if (!this.on) return;
      var Y = CFG.MAZE_Y, tk = G.tick, i;
      for (i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!(this.hielo[i] > 0) || !g || g.mode !== 'normal') continue;
        var fin = this.hielo[i] < 45 && Math.floor(tk / 5) % 2 === 0;
        ctx.save();
        ctx.globalAlpha = fin ? 0.25 : 0.55;
        ctx.fillStyle = '#bff4ff';
        ctx.beginPath(); ctx.arc(g.x, g.y + Y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var k = 0; k < 3; k++) {
          var a = k * Math.PI / 3;
          ctx.moveTo(g.x - Math.cos(a) * 3, g.y + Y - Math.sin(a) * 3);
          ctx.lineTo(g.x + Math.cos(a) * 3, g.y + Y + Math.sin(a) * 3);
        }
        ctx.stroke();
        ctx.restore();
      }
      for (i = 0; i < this.balas.length; i++) {
        var b = this.balas[i], v = CFG.DIR_V[b.d] || { x: 0, y: 0 };
        var col = (b.t === 'fuego') ? '#ff7a1a' : '#8ff4ff';
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(b.x - v.x * 4, b.y - v.y * 4 + Y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowColor = col; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(b.x, b.y + Y, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(b.x, b.y + Y, 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      for (i = 0; i < this.fx.length; i++) {
        var f = this.fx[i], q = f.n / f.tot;
        ctx.save();
        ctx.globalAlpha = Math.max(0, q);
        if (f.t === 'rayo') {
          ctx.strokeStyle = '#e8d4ff';
          ctx.shadowColor = '#8b3dff'; ctx.shadowBlur = 8;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(f.x0, f.y0 + Y - 4);
          var pasos = 5;
          for (var st = 1; st < pasos; st++) {
            var mx = f.x0 + (f.x - f.x0) * st / pasos + ((st * 37 + f.tot) % 7 - 3);
            var my = f.y0 + (f.y - f.y0) * st / pasos + ((st * 53) % 7 - 3);
            ctx.lineTo(mx, my + Y);
          }
          ctx.lineTo(f.x, f.y + Y);
          ctx.stroke();
        } else {
          var colores = { fuego: '#ff7a1a', runa: '#8b3dff', escarcha: '#bff4ff', humo: '#ff9a4a',
                          roto: '#ffb852', aplasta: '#ffb852', amparo: '#2bff88', vida: '#7dff7a', boca: '#00c8ff' };
          ctx.strokeStyle = colores[f.t] || '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(f.x, f.y + Y, 3 + (1 - q) * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    },

    /* Lo que lleva encima cada Pac-Man: aros de escudo e inmunidad, el aviso
     * de la provocación, la onda del pisotón y el aura de la tormenta */
    dibujarPac: function (G, ctx, pc, i) {
      var s = this.estado(i);
      if (!s) return;
      var x = pc.x, y = pc.y + CFG.MAZE_Y, tk = G.tick;
      ctx.save();
      /* el ESCUDO del Tanque en naranja y el que da el Soporte en cian */
      var escu = Math.max(s.coraza, s.escudo);
      if (escu > 0) {
        var avisa = escu < 60 && Math.floor(tk / 6) % 2 === 0;
        var rgb = s.coraza > 0 ? '255, 184, 82' : '43, 255, 136';
        ctx.strokeStyle = 'rgba(' + rgb + ', ' + (avisa ? 0.35 : 0.9) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var k = 0; k < 6; k++) {
          var a = k * Math.PI / 3 + Math.PI / 6;
          var px = x + Math.cos(a) * 10, py = y + Math.sin(a) * 10;
          if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      /* la tecla mantenida: un aro cian que se va cerrando; al llenarse, sale */
      var cm = this.cargaMant(G, i);
      if (cm >= 0 && s.mantT > 8) {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#00ffff';
        ctx.beginPath(); ctx.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + cm * Math.PI * 2); ctx.stroke();
      }
      if (s.inmune > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.5 + 0.4 * Math.sin(tk / 3)) + ')';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, 9.5, tk / 8, tk / 8 + Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (s.provoca > 0) {
        ctx.fillStyle = '#ff3b3b';
        var sube = Math.sin(tk / 4) * 1.2;
        ctx.fillRect(x - 1, y - 16 + sube, 2, 5);
        ctx.fillRect(x - 1, y - 9.5 + sube, 2, 2);
        ctx.strokeStyle = 'rgba(255, 59, 59, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 8 + (tk % 30) / 5, 0, Math.PI * 2); ctx.stroke();
      }
      if (s.pisoton > 0) {
        var q = 1 - s.pisoton / 30;
        ctx.strokeStyle = 'rgba(255, 184, 82, ' + (1 - q) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 6 + q * H.PISOTON_TILES * T, 0, Math.PI * 2); ctx.stroke();
      }
      if (s.arrolla > 0) {
        var v = CFG.DIR_V[s.adir] || { x: 0, y: 0 };
        ctx.fillStyle = 'rgba(255, 184, 82, 0.4)';
        for (var r = 1; r <= 4; r++) {
          ctx.beginPath();
          ctx.arc(x - v.x * r * 5 + ((tk * 7 + r * 3) % 3 - 1), y - v.y * r * 5 + ((tk * 5 + r) % 3 - 1),
                  5.5 - r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255, 184, 82, 0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + ((tk % 2) - 0.5), y, 9.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (s.tormenta > 0) {
        ctx.strokeStyle = 'rgba(139, 61, 255, ' + (0.4 + 0.3 * Math.sin(tk / 2)) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var c = 0; c < 8; c++) {
          var an = c * Math.PI / 4 + tk / 10;
          ctx.moveTo(x + Math.cos(an) * 8, y + Math.sin(an) * 8);
          ctx.lineTo(x + Math.cos(an + 0.2) * 11, y + Math.sin(an + 0.2) * 11);
        }
        ctx.stroke();
      }
      ctx.restore();
    },

    /* =========================================================
     * PAC-MAN VS. — los dos del fantasma humano
     *
     * Los dos son SUYOS y de nadie más: no tocan a los Pac-Man, no tocan el
     * marcador y no hay nada que arbitrar. Por eso se aplican en la máquina de
     * quien pulsa, igual que el TURBO y el FLASH, y el anfitrión solo los
     * anota (ver peticion). Lo único que no puede faltar es que el anfitrión
     * los tenga también: el fantasma lo simula él.
     * ========================================================= */
    /* Q — EMBESTIDA: x1.35 durante 4 s. Lo aplica Ghost.speedPx a través de
     * multVelFantasma, así que el fantasma sigue obedeciendo todas las reglas
     * de siempre (muros, túnel, zonas sin subir): solo va más rápido. */
    embestida: function (G, idx) {
      this.marcarCarga(idx);
      sonDe(G, idx, 'playCharge');
      return true;
    },

    /* W — ACECHO: 4 s translúcido y sin la marca que lo delata.
     * Se llama `acechar` y no `acecho` porque `conAcecho` ya consulta el
     * estado y dos nombres tan parecidos para una acción y una consulta se
     * confunden a la primera lectura. */
    acechar: function (G, idx) {
      this.marcarAcecho(idx);
      sonDe(G, idx, 'playStealth');
      return true;
    }
  };

  /* Nombres largos, por si hacen falta fuera */
  Hab.MORDISCO = MORDISCO;
  Hab.TURBO = TURBO;
  Hab.FLASH = FLASH;
  Hab.GRITO = GRITO;
  Hab.EMBESTIDA = EMBESTIDA;
  Hab.ACECHO = ACECHO;

  window.PM.Hab = Hab;
})();
