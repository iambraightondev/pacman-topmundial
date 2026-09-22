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
      /* CORAZA, la pasiva del Tanque: ticks que le quedan PUESTA (0 = no la
       * lleva), y `corCd`, los que faltan para la siguiente. Caduca a
       * propósito: sin caducidad el Tanque iba siempre con un golpe gratis. */
      corPas: 0,
      corCd: 0,
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
      /* METEORO APUNTADO: la retícula que se mueve mientras se tiene la R
       * apretada ({ c, r, d, t, oc, or }; null cuando no se está apuntando).
       * Es de ESTA pantalla y de nadie más —cada uno apunta el suyo—, así que
       * no viaja en la foto de red: lo que viaja es la casilla final, al
       * soltar. */
      apunta: null,
      /* PORTAL (Mago): ticks que le quedan en la OTRA DIMENSIÓN (0: está en
       * la de todos). Mientras dure, nada lo toca y él no come. */
      dimension: 0,
      /* ---------- estado del catálogo ---------- */
      bomba: null,          // { c, r, t }
      sombra: 0,
      sombraGolpe: false,   // compatibilidad con fotos antiguas; ya no se usa
      frenesi: 0,
      frenesiMult: 1,
      carrona: 0,
      marca: 0,
      ganchoInv: 0,
      ganchoOut: 0,         // GANCHO del Soporte: garfio en el aire
      shuriken: null,       // { id, usados, resueltos, aciertos }
      misil: null,          // proyectil en cadena del Asesino
      caceria: 0,
      estela: 0,
      estelaBuff: 0,
      estelaRastro: [],
      puente: null,         // { c, r, t }: el hueco abierto en una pared
      cadena: 0,
      cadenaCon: -1,
      faro: null,
      muro: null,
      campo: 0,
      hospital: 0,
      yunque: 0,
      yunqueX: 0,
      yunqueY: 0,
      pielPiedra: 0,
      rebote: 0,
      fortaleza: 0,
      terremoto: 0,
      meteoro: null,
      fuegoMeteoro: null,
      eclipse: 0,
      totem: null
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
    fuego: 'playFlash', portal: 'playStealth', runa: 'playBiteMiss', tormenta: 'playShout',
    shuriken: 'playFlash', bomba: 'playShout', sombra: 'playStealth', frenesi: 'playTurbo',
    carrona: 'playExtraLife', marca: 'playShout', gancho_inverso: 'playCharge', caceria: 'playShout',
    misil: 'playFlash', ejecucion: 'playShout', empujon: 'playCharge', grito_guerra: 'playShout',
    yunque: 'playStealth', piel_piedra: 'playStealth', rebote: 'playCharge', terremoto: 'playShout',
    fortaleza: 'playStealth', mina: 'playBiteMiss', gancho: 'playCharge', telarana: 'playBiteMiss',
    estela: 'playTurbo', puente: 'playFlash', cadena: 'playStealth', muro: 'playCharge',
    relevo: 'playFlash', faro: 'playShout', sirena: 'playShout', campo: 'playStealth',
    resurreccion: 'playExtraLife', hospital: 'playExtraLife', bola_guiada: 'playFlash',
    toque_arcano: 'playBiteMiss', chispa: 'playCharge', clon: 'playStealth', totem: 'playShout',
    gravedad: 'playCharge', dominio: 'playShout', meteoro: 'playShout', eclipse: 'playShout'
  };

  function sonidoDe(G, idx, k) {
    var h = window.PM.Hab.listaDe(G, idx)[k];
    return (h && SON[h.id]) || '';
  }

  /* Un tirón repetible, entre -1 y 1, para el temblor de pantalla. NO usa
   * Math.random a propósito: si el meneo saliera al azar, dos máquinas de la
   * misma party verían temblores distintos y una repetición rebobinada
   * enseñaría un suelo que no es el que se jugó. Saliendo del número de tick
   * siempre da lo mismo, y aun así se ve desordenado, que es lo que hace que
   * parezca un golpe y no una vibración de motor. */
  function ruidoTemblor(n) {
    var x = Math.sin(n * 127.1) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  }

  /* Lo que menea el TERREMOTO: segundo y medio de los seis que dura el poder,
   * arrancando con cinco píxeles de desvío (más de media casilla).
   *
   * El temblor dura MENOS que el poder a propósito. El terremoto es un golpe:
   * lo que se siente es el momento en que revienta el suelo, no los seis
   * segundos siguientes. Temblando los seis enteros el laberinto se vuelve
   * ilegible justo cuando hay que esquivar, y marea de verdad. */
  var TERREMOTO_TEMBLOR = 90;      // 1,5 s
  var TERREMOTO_SACUDIDA = 5;      // píxeles de desvío al arrancar

  /* El golpe del METEORO mueve el suelo menos y menos rato que el terremoto:
   * aquí cae una piedra en un sitio, allí se parte el mapa entero. Medio
   * segundo es lo que tarda el ojo en volver al laberinto, y con cuatro
   * píxeles se siente el impacto sin perder de vista a los fantasmas que
   * quedan vivos alrededor. (Con "reducir movimiento" no tiembla nada: de eso
   * ya se encarga temblar().) */
  var METEORO_TEMBLOR = 30;
  var METEORO_SACUDIDA = 4;

  var Hab = {
    on: false,       // ¿la partida en curso es de poderes?
    st: [],          // estado por jugador
    /* Marca que el mordisco que se está lanzando viene de una Q ARMADA y no
     * de la tecla: sin esto, un reintento que fallase volvería a armarla y la
     * dentellada pendiente no se agotaría nunca. Ver pulsar() y paso(). */
    reintento: false,

    /* ---------- ciclo de vida ---------- */
    /* Desde Game.newGame. n = cuántos jugadores hay en la mesa. */
    empezar: function (on, n, roles, loadouts) {
      this.on = !!on;
      this.st = [];
      this.roles = [];
      this.loadouts = [];
      for (var i = 0; i < (n || 0); i++) {
        this.st.push(nuevoEstado());
        this.roles.push(H.rol(roles && roles[i]));
        var rol = this.roles[i];
        var crudo = loadouts && loadouts[i];
        this.loadouts.push(this.normalizarCarga(rol, crudo));
        /* el TANQUE empieza con su CORAZA puesta: es una pasiva, tiene que
         * estar desde el primer segundo y no al primer tick de reloj */
        if (this.roles[i] === 'tanque') this.st[i].corPas = H.CORAZA_DURA;
      }
      this.limpiarMesa();
    },

    /* Lo que no es de un jugador: fantasmas congelados o huyendo,
     * proyectiles en vuelo, portales, runas y los efectos que se pintan */
    limpiarMesa: function () {
      this.hielo = [0, 0, 0, 0];
      this.huye = [0, 0, 0, 0];
      this.huyeQuien = [-1, -1, -1, -1];
      this.lento = [0, 0, 0, 0];
      this.lentoMult = [1, 1, 1, 1];
      this.aturdido = [0, 0, 0, 0];
      this.ciego = [0, 0, 0, 0];
      this.azulCatalogo = [0, 0, 0, 0];
      this.azulCatTicks = [0, 0, 0, 0];
      /* Cuáles de esos azules son del TOQUE ARCANO. Hace falta el sello
       * porque el azul del catálogo lo pone más de un poder (el GANCHO del
       * Soporte, sin ir más lejos) y solo el del Mago se pega. */
      this.arcanoAzul = [0, 0, 0, 0];
      this.caceriaQuien = [-1, -1, -1, -1];
      /* DOMINIO (22 sep 2026): ticks que le quedan a cada fantasma de ser
       * del Mago, y QUIÉN lo domina (-1: nadie). Van por fantasma y no por
       * jugador porque lo que cambia es el fantasma —a quién persigue, a
       * quién mata y de quién son los puntos—, igual que caceriaQuien. */
      this.dominado = [0, 0, 0, 0];
      this.dominaQuien = [-1, -1, -1, -1];
      this.marcaGhost = [-1, -1, -1, -1];
      this.joyas = [];
      this.proyectilesCat = [];
      /* GRAVEDAD: los arrastres en curso (el tirón que se ve venir) */
      this.tirones = [];
      this.rafagaId = 0;
      this.terremotoTicks = 0;
      /* el meneo de la pantalla no sobrevive a una muerte ni a un nivel: ver
       * temblar() */
      this.temblorTicks = 0;
      this.temblorTotal = 0;
      this.temblorFuerza = 0;
      this.eclipseTicks = 0;
      this.balas = [];
      this.portales = [];
      /* ESPACIO apretado, por jugador: sin él no se entra en un portal.
       * Es de esta pantalla y no viaja por la red: cada máquina cruza sus
       * propios Pac-Man (ver cruzar). */
      this.espacio = [false, false, false, false];
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
        loadouts: (this.loadouts || []).map(function (x) { return x ? x.slice() : null; }),
        mesa: JSON.parse(JSON.stringify({
          hielo: this.hielo, huye: this.huye, huyeQuien: this.huyeQuien,
          lento: this.lento, lentoMult: this.lentoMult, aturdido: this.aturdido,
          ciego: this.ciego, azulCatalogo: this.azulCatalogo,
          azulCatTicks: this.azulCatTicks, arcanoAzul: this.arcanoAzul,
          terremotoTicks: this.terremotoTicks, eclipseTicks: this.eclipseTicks,
          caceriaQuien: this.caceriaQuien, marcaGhost: this.marcaGhost,
          dominado: this.dominado, dominaQuien: this.dominaQuien,
          joyas: this.joyas, proyectilesCat: this.proyectilesCat, tirones: this.tirones,
          rafagaId: this.rafagaId, balas: this.balas, portales: this.portales,
          runas: this.runas, placas: this.placas
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
        /* Repeticiones de antes del 21 sep: ahí PUENTE era un reloj del
         * jugador y no el paso del mapa. Se descarta en vez de dejar un
         * número donde ahora va una zona. */
        if (typeof o.puente === 'number') o.puente = null;
        this.st.push(o);
      }
      this.roles = f.roles ? f.roles.slice() : [];
      this.loadouts = f.loadouts ? f.loadouts.map(function (x, i) {
        return this.normalizarCarga(this.roles[i], x);
      }, this) : [];
      this.limpiarMesa();
      if (f.mesa) {
        var m = JSON.parse(JSON.stringify(f.mesa));
        this.hielo = m.hielo || this.hielo;
        this.huye = m.huye || this.huye;
        this.huyeQuien = m.huyeQuien || this.huyeQuien;
        this.lento = m.lento || this.lento;
        this.lentoMult = m.lentoMult || this.lentoMult;
        this.aturdido = m.aturdido || this.aturdido;
        this.ciego = m.ciego || this.ciego;
        this.azulCatalogo = m.azulCatalogo || this.azulCatalogo;
        this.azulCatTicks = m.azulCatTicks || this.azulCatTicks;
        this.arcanoAzul = m.arcanoAzul || this.arcanoAzul;
        this.terremotoTicks = m.terremotoTicks || 0;
        this.eclipseTicks = m.eclipseTicks || 0;
        this.caceriaQuien = m.caceriaQuien || this.caceriaQuien;
        this.dominado = m.dominado || this.dominado;
        this.dominaQuien = m.dominaQuien || this.dominaQuien;
        this.marcaGhost = m.marcaGhost || this.marcaGhost;
        this.joyas = m.joyas || [];
        this.proyectilesCat = m.proyectilesCat || [];
        this.tirones = m.tirones || [];
        this.rafagaId = m.rafagaId | 0;
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
    normalizarCarga: function (rol, raw) {
      var cat = H.catalogoDe(rol), ids = raw instanceof Array ? raw : String(raw || '').split(','), out = [];
      for (var k = 0; k < 4; k++) {
        var id = ids[k], fila = cat[k], ok = null;
        for (var i = 0; i < fila.length; i++) if (fila[i].id === id) { ok = fila[i]; break; }
        if (!ok) {
          /* Una partida antigua no trae carga: conserva el kit fijo de antes
           * si sigue existiendo; si no, cae en la primera opción del catálogo. */
          var vieja = H.ROLES[H.rol(rol)][k];
          for (var j = 0; j < fila.length; j++) if (vieja && fila[j].id === vieja.id) { ok = fila[j]; break; }
        }
        out.push(ok || fila[0]);
      }
      return out;
    },

    listaDe: function (G, idx) {
      if (G && G.vsGhostOf && G.vsGhostOf(idx) >= 0) return H.LIST_G;
      var carga = this.loadouts && this.loadouts[idx];
      return carga && carga.length === 4 ? carga : H.ROLES[this.rolDe(idx)];
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

    /* Un fantasma puede quedar azul por una habilidad aunque no haya
     * energizante activo. Cacería añade una restricción: solo el Asesino que
     * la lanzó puede cobrar esas muertes. */
    puedeComer: function (G, gid, who) {
      if (!this.on) return false;
      var caz = this.caceriaQuien && this.caceriaQuien[gid];
      if (caz >= 0 && caz !== (who | 0)) return false;
      /* El círculo de CACERÍA es la autorización del Asesino. Antes se
       * comprobaba el dueño pero después se exigía igualmente modo azul, de
       * modo que el propio Asesino moría al atravesar al marcado. */
      if (caz === (who | 0)) return true;
      if (this.azulCatalogo && this.azulCatalogo[gid]) return true;
      /* EL AZUL DEL ENERGIZANTE ES DEL FANTASMA, NO DEL RELOJ (22 sep 2026).
       * Aquí se miraba G.frightTicks, que es el reloj de la MESA: valía
       * cualquier fantasma mientras quedara energizante. Pero al que ya se
       * comieron se le quita el azul al comerlo (Ghost.eaten) y vuelve de
       * casa gris con el energizante todavía corriendo. Mirando el reloj,
       * ese fantasma se moría solo nada más salir —sin estar azul— y
       * regalaba la baja con sus puntos. Se mira su azul, que es lo que se
       * ve. */
      var gh = (G && G.ghosts) ? G.ghosts[gid | 0] : null;
      return !!(gh && gh.frightened);
    },

    /* Multiplicador de velocidad del fantasma `gid` (1 si no hay embestida).
     * Lo consulta Ghost.speedPx, que es por donde pasan TODOS los fantasmas:
     * si el fantasma no lo lleva una persona, aquí no hay nada que aplicar. */
    multVelFantasma: function (G, gid) {
      if (!this.on) return 1;
      var m = 1;
      /* PISOTÓN (Tanque): mientras huye va más lento, que es media habilidad:
       * si huyera a su velocidad, alejarlos no daría ni un respiro. */
      if (this.huye && this.huye[gid] > 0) m *= H.PISOTON_LENTO;
      if (this.lento && this.lento[gid] > 0) m *= this.lentoMult[gid] || 1;
      if (this.aturdido && this.aturdido[gid] > 0) return 0;
      /* ECLIPSE ya incluye ceguera: no se acumula con el 0,6 de la otra. */
      if (this.eclipseTicks > 0) m *= 0.5;
      else if (this.ciego && this.ciego[gid] > 0) m *= 0.6;
      if (!G || !G.vsPlayerOf) return m;
      var quien = G.vsPlayerOf(gid);
      return (quien >= 0 && this.conCarga(quien)) ? m * H.CHARGE_MULT : m;
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
      if (s && s.sombra > 0) return 0.2 + 0.08 * (1 + Math.sin(((G && G.tick) || 0) / 4));
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
        /* La retícula del METEORO solo vive con la partida EN MARCHA: si se
         * para (pausa, una muerte, la congelación de comerse un fantasma) o el
         * Mago se marcha a la otra dimensión, el apuntado se cierra sin tirar
         * nada. No es manía: la marca tiene que durar exactamente los mismos
         * ticks aquí que en la repetición, y allí no hay ningún dedo que
         * suelte la tecla. */
        if (s.apunta && (!corre || this.enDimension(i))) s.apunta = null;
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

    /* ¿Esa tecla se APUNTA mientras se mantiene? Hoy solo el METEORO del
     * Mago. Es prima de mantiene() —las dos hacen algo con la tecla apretada—
     * pero esta no tiene ningún rato que cumplir: el apuntado empieza en
     * cuanto se aprieta y dura lo que dure el dedo. */
    esApuntada: function (G, idx, k) {
      return this.idDe(G, idx, k) === 'meteoro';
    },

    /* Tecla o botón apretado. repetida: la autorrepetición del teclado, que
     * en una tecla que se mantiene no puede volver a empezar la cuenta. */
    apretar: function (G, idx, k, repetida) {
      var esAp = this.esApuntada(G, idx, k);
      if (!this.mantiene(G, idx, k) && !esAp) return this.pulsar(G, idx, k);
      if (repetida) return false;
      var s = this.estado(idx), R = window.PM.Replay;
      if (!s || !this.puede(G, idx, k)) return false;
      if (R && R.habBloqueada && R.habBloqueada()) return false;
      s.mant = k;
      s.mantT = 0;
      /* El apuntado se abre YA, no al cumplirse un rato: la retícula tiene
       * que estar puesta para poder moverla. Sale por pulsar(mant) —la misma
       * puerta que la placa de hielo— para que la repetición lo apunte y
       * pueda volver a abrirlo en el mismo tick de aquel día. */
      if (esAp && !this.pulsar(G, idx, k, true)) { s.mant = -1; return false; }
      return true;
    },

    /* Tecla o botón soltado: si no llegó al rato, la de siempre */
    soltar: function (G, idx, k) {
      var s = this.estado(idx);
      if (!s || s.mant !== k) return false;
      s.mant = -1;
      s.mantT = 0;
      var ok = this.pulsar(G, idx, k);
      /* Si el meteoro no llegó a caer (se murió en el último tick, manda una
       * repetición) la retícula se cierra igual: nada de dejar una marca en
       * el suelo apuntando a algo que ya no va a pasar. */
      if (s.apunta) s.apunta = null;
      return ok;
    },

    /* Suelta todo sin lanzar nada (la ventana pierde el foco y ya no llegará
     * el "soltar") */
    cancelarMant: function () {
      for (var i = 0; i < this.st.length; i++) {
        this.st[i].mant = -1; this.st[i].mantT = 0; this.st[i].apunta = null;
      }
    },

    /* ---------- APUNTAR EL METEORO ----------
     * ¿Ese jugador está apuntando? Mientras lo esté, las flechas son de la
     * retícula y no de su Pac-Man (Game.setPacDir se lo pregunta antes de
     * repartir el rumbo). */
    apuntando: function (idx) {
      var s = this.estado(idx);
      return !!(s && s.apunta);
    },

    /* Hacia dónde camina la retícula ahora mismo (-1: nadie apunta). La
     * repetición lo mira para no grabar dos veces la misma flecha
     * (Replay.rumboDe), que es lo que hace que tener la tecla apretada deje
     * una entrada y no doscientas. */
    flechaApuntado: function (idx) {
      var s = this.estado(idx);
      return (s && s.apunta) ? s.apunta.d : -1;
    },

    /* Abre el apuntado: la retícula sale una casilla por delante del Mago (o
     * encima de él si tiene la pared pegada a la cara) y echa a andar hacia
     * donde él mira. Las flechas la GIRAN, no la empujan: ella sola se come
     * una casilla cada METEORO_PASO ticks y se para al llegar a una pared o
     * al alcance, así que apuntar es girarla y soltar la tecla a tiempo.
     *
     * Se hace así, y no un paso por pulsación, porque la autorrepetición del
     * teclado la marca cada sistema operativo como quiere: una marca movida a
     * golpe de repetición se vería andar a una velocidad distinta en cada
     * ordenador, y en la repetición de la partida, a otra.
     *
     * `oc/or` es de dónde salió, y es contra eso —no contra el Mago de cada
     * tick— contra lo que se mide el alcance: si se midiera contra él, andar
     * mientras se apunta movería el listón y la marca se quedaría corta o
     * larga sin que el jugador tocase nada. */
    abrirApuntado: function (G, idx) {
      var s = this.estado(idx), p = G.pacs[idx];
      if (!s || !p) return false;
      var oc = p.tileX(), or = p.tileY();
      var c = this.casillaAdelante(G, idx, 1);
      if (!c || !aterrizable(c.c, c.r)) c = { c: oc, r: or };
      if (!aterrizable(c.c, c.r)) return false;
      s.apunta = { c: c.c, r: c.r, d: this.dirFlash(p), t: 0, oc: oc, or: or };
      this.efecto('meteoro_aviso', c.c * T + T / 2, c.r * T + T / 2, 12);
      return true;
    },

    /* Una flecha mientras se apunta: cambia el rumbo de la retícula, que a
     * partir de ahí camina sola (pasoApuntado). El primer paso NO sale aquí
     * mismo sino en el tick siguiente, y a propósito: la repetición mete las
     * flechas un poco más tarde dentro del mismo tick, y así la marca anda
     * exactamente igual jugando que viéndolo luego. */
    apuntarDir: function (idx, d) {
      var s = this.estado(idx);
      if (!s || !s.apunta || !(d >= 0 && d <= 3)) return false;
      /* La misma flecha otra vez no reinicia la cuenta. El teclado repite el
       * evento cada pocas centésimas mientras se tiene apretada, y si cada
       * repetición pusiera el reloj a cero la marca no daría un paso en su
       * vida. Es la misma criba que hace la repetición al grabar. */
      if (s.apunta.d === d) return false;
      s.apunta.d = d;
      s.apunta.t = 0;
      return true;
    },

    /* Casillas DE CAMINO entre dos puntos: las que andaría un fantasma, no la
     * línea recta. Es lo que mide el alcance del meteoro, porque lo que hay
     * de por medio son pasillos. -1 si no hay forma de llegar. */
    pasosApuntado: function (fc, fr, tc, tr) {
      if (fc === tc && fr === tr) return 0;
      var ruta = this.rutaLaberinto(fc, fr, tc, tr);
      return ruta ? ruta.length : -1;
    },

    /* Un tick de la retícula: cada METEORO_PASO ticks se come una casilla
     * hacia su última flecha. Se para sola en las paredes, en la casa de los
     * fantasmas y al llegar al alcance; no se pierde el apuntado por eso,
     * solo deja de avanzar hasta que le digan otra dirección. */
    pasoApuntado: function (G, idx) {
      var s = this.estado(idx), a = s && s.apunta;
      if (!a) return;
      var p = G.pacs[idx];
      /* muerto a media puntería: se cierra sin tirar nada */
      if (!p || p.out || p.dying) { s.apunta = null; return; }
      if (++a.t < H.METEORO_PASO) return;
      a.t = 0;
      if (!(a.d >= 0 && a.d <= 3)) return;
      var v = CFG.DIR_V[a.d], nc = CFG.wrapCol(a.c + v.x), nr = a.r + v.y;
      if (!aterrizable(nc, nr)) return;
      var pasos = this.pasosApuntado(a.oc, a.or, nc, nr);
      if (pasos < 0 || pasos > H.METEORO_ALCANCE) return;
      a.c = nc; a.r = nr;
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
        if (!p || p.out || p.dying) { s.mant = -1; s.mantT = 0; s.apunta = null; continue; }
        if (G.state !== 'PLAYING' || G.paused || G.eatFreezeTicks > 0) continue;
        var k = s.mant;
        /* El METEORO no tiene ningún rato que cumplir: dura lo que dure la
         * tecla y lo que hace mientras tanto (pasear la retícula) corre en
         * pasoRoles. Sin esta línea, como su rato vale cero, la tecla se
         * daría por cumplida en el primer tick: volvería a abrir el apuntado
         * una y otra vez y al soltar no caería nada. */
        if (this.esApuntada(G, i, k)) continue;
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
      this.catalogoReset = false;
      if (mant) {
        /* METEORO: la versión mantenida no lanza nada, ABRE EL APUNTADO. Ni
         * gasta la recarga ni se le cuenta a la sala; eso pasa al soltar,
         * que es cuando ya se sabe dónde cae. */
        if (this.esApuntada(G, idx, k)) return this.abrirApuntado(G, idx);
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
        case 'shuriken': ok = this.shuriken(G, idx); break;
        case 'bomba': ok = this.bomba(G, idx); break;
        case 'sombra': ok = this.sombra(G, idx); break;
        case 'frenesi': ok = this.frenesi(G, idx); break;
        case 'carrona': ok = this.carrona(G, idx); break;
        case 'marca': ok = this.marca(G, idx); break;
        case 'gancho_inverso': ok = this.ganchoInverso(G, idx); break;
        case 'caceria': ok = this.caceria(G, idx); break;
        case 'misil': ok = this.misil(G, idx); break;
        case 'ejecucion': ok = this.ejecucion(G, idx); break;
        case 'empujon': ok = this.empujon(G, idx); break;
        case 'grito_guerra': ok = this.gritoGuerra(G, idx); break;
        case 'yunque': ok = this.yunque(G, idx); break;
        case 'piel_piedra': ok = this.pielPiedra(G, idx); break;
        case 'rebote': ok = this.rebote(G, idx); break;
        case 'terremoto': ok = this.terremoto(G, idx); break;
        case 'fortaleza': ok = this.fortaleza(G, idx); break;
        case 'mina': ok = this.mina(G, idx); break;
        case 'gancho': ok = this.gancho(G, idx); break;
        case 'telarana': ok = this.telarana(G, idx); break;
        case 'estela': ok = this.estela(G, idx); break;
        case 'puente': ok = this.puente(G, idx); break;
        case 'cadena': ok = this.cadena(G, idx); break;
        case 'muro': ok = this.muro(G, idx); break;
        case 'relevo': ok = this.relevo(G, idx); break;
        case 'faro': ok = this.faro(G, idx); break;
        case 'sirena': ok = this.sirena(G, idx); break;
        case 'campo': ok = this.campo(G, idx); break;
        case 'resurreccion': ok = this.resurreccion(G, idx); break;
        case 'hospital': ok = this.hospital(G, idx); break;
        case 'bola_guiada': ok = this.bolaGuiada(G, idx); break;
        case 'toque_arcano': ok = this.toqueArcano(G, idx); break;
        case 'chispa': ok = this.chispa(G, idx); break;
        case 'clon': ok = this.clon(G, idx); break;
        case 'totem': ok = this.totem(G, idx); break;
        case 'gravedad': ok = this.gravedad(G, idx); break;
        case 'dominio': ok = this.dominio(G, idx); break;
        case 'meteoro': ok = this.meteoro(G, idx); break;
        case 'eclipse': ok = this.eclipse(G, idx); break;
        default:          ok = false;
      }
      if (!ok) return false;
      if (!this.sinGasto) this.gastar(G, idx, k);
      if (this.catalogoReset) this.estado(idx).cd[k] = 0;
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
        /* METEORO: lo que viaja es LA CASILLA apuntada, no el rumbo. La
         * retícula la ha paseado él por los pasillos de su pantalla y desde
         * la del anfitrión no hay forma de adivinarla; allí se comprueba
         * antes de creérsela (ver meteoroValido). */
        var sm = this.estado(idx);
        if (sm && sm.meteoro && this.idDe(G, idx, k) === 'meteoro') {
          d.ac = sm.meteoro.c; d.ar = sm.meteoro.r;
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
      this.catalogoReset = false;
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
        case 'pisoton':  ok = this.pisoton(G, who, false); break;
        case 'hielo':    ok = this.disparar(G, who, 'hielo', d.d, d); break;
        case 'fuego':    ok = this.disparar(G, who, 'fuego', d.d, d); break;
        case 'aliado':   ok = this.aliado(G, who, false); break;
        case 'vida':     ok = this.vida(G, who, false); break;
        case 'portal':   ok = this.portal(G, who, d); break;
        case 'runa':     ok = this.runa(G, who, d); break;
        case 'tormenta': ok = this.tormenta(G, who); break;
        case 'shuriken': ok = this.shuriken(G, who, d); break;
        case 'bomba': ok = this.bomba(G, who, d); break;
        case 'sombra': ok = this.sombra(G, who); break;
        case 'frenesi': ok = this.frenesi(G, who); break;
        case 'carrona': ok = this.carrona(G, who); break;
        case 'marca': ok = this.marca(G, who); break;
        case 'gancho_inverso': ok = this.ganchoInverso(G, who, d); break;
        case 'caceria': ok = this.caceria(G, who); break;
        case 'misil': ok = this.misil(G, who); break;
        case 'ejecucion': ok = this.ejecucion(G, who); break;
        case 'empujon': ok = this.empujon(G, who, d); break;
        case 'grito_guerra': ok = this.gritoGuerra(G, who); break;
        case 'yunque': ok = this.yunque(G, who); break;
        case 'piel_piedra': ok = this.pielPiedra(G, who); break;
        case 'rebote': ok = this.rebote(G, who); break;
        case 'terremoto': ok = this.terremoto(G, who); break;
        case 'fortaleza': ok = this.fortaleza(G, who); break;
        case 'mina': ok = this.mina(G, who, d); break;
        case 'gancho': ok = this.gancho(G, who, d); break;
        case 'telarana': ok = this.telarana(G, who, d); break;
        case 'estela': ok = this.estela(G, who); break;
        case 'puente': ok = this.puente(G, who); break;
        case 'cadena': ok = this.cadena(G, who); break;
        case 'muro': ok = this.muro(G, who, d); break;
        case 'relevo': ok = this.relevo(G, who); break;
        case 'faro': ok = this.faro(G, who, d); break;
        case 'sirena': ok = this.sirena(G, who, d); break;
        case 'campo': ok = this.campo(G, who); break;
        case 'resurreccion': ok = this.resurreccion(G, who); break;
        case 'hospital': ok = this.hospital(G, who); break;
        case 'bola_guiada': ok = this.bolaGuiada(G, who, d); break;
        case 'toque_arcano': ok = this.toqueArcano(G, who); break;
        case 'chispa': ok = this.chispa(G, who); break;
        case 'clon': ok = this.clon(G, who, d); break;
        case 'totem': ok = this.totem(G, who, d); break;
        case 'gravedad': ok = this.gravedad(G, who); break;
        case 'dominio': ok = this.dominio(G, who); break;
        case 'meteoro': ok = this.meteoro(G, who, d); break;
        case 'eclipse': ok = this.eclipse(G, who); break;
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
      if (this.catalogoReset) this.estado(who).cd[k] = 0;
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
      var ecoId = this.idDe(G, who, k), ecoPac = G.pacs[who];
      if (ecoPac && /^(shuriken|bomba|sombra|frenesi|carrona|marca|gancho_inverso|caceria|misil|ejecucion|empujon|grito_guerra|yunque|piel_piedra|rebote|terremoto|fortaleza|mina|gancho|telarana|estela|puente|cadena|muro|relevo|faro|sirena|campo|resurreccion|hospital|bola_guiada|toque_arcano|chispa|clon|totem|gravedad|dominio|meteoro|eclipse)$/.test(ecoId)) {
        this.efecto(ecoId, ecoPac.x, ecoPac.y, 24);
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
        if (this.caceriaQuien[g.id] >= 0 && this.caceriaQuien[g.id] !== idx) continue;
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
        /* y lo deja ATURDIDO un momento: morderlo obliga a pegarse a él, y
         * sin esto el golpe salía siempre a cambio de una vida */
        JF.congelar(G, CFG.JEFE.ATURDE_MORDISCO);
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
      G.eatGhost(g, idx, 'mordisco');
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
      var s = this.estado(idx), m = this.conTurbo(idx) ? H.TURBO_MULT : 1;
      if (s && s.sombra > 0) m *= H.SOMBRA_MULT;
      if (s && s.frenesi > 0) m *= s.frenesiMult || 1;
      if (s && s.caceria > 0) m *= H.CACERIA_MULT;
      if (s && s.pielPiedra > 0) m *= 0.5;
      if (s && s.estela > 0) m *= H.ESTELA_MULT;
      else if (s && s.estelaBuff > 0) m *= H.ESTELA_RASTRO_MULT;
      /* EL TERREMOTO YA NO FRENA AL EQUIPO (22 sep). Ralentizaba a todo el
       * mundo seis segundos y, aunque no había ningún parón de verdad, al
       * jugarlo se sentía como si el poder detuviera el tiempo. Ahora es lo
       * que tiene que ser, como la TORMENTA del Mago: mata y se le ve
       * (sacude el suelo), sin castigar a quien lo usa. */
      return m;
    },

    /* EL PUENTE ES UN HUECO EN UNA PARED, NO VOLVERSE FANTASMA (21 sep).
     *
     * Antes encendía un estado del jugador y `canGo` dejaba atravesar
     * CUALQUIER pared del laberinto; encima no miraba de quién era el poder,
     * así que se lo comía todo el equipo estuviera donde estuviera. Ahora es
     * una casilla concreta —la pared que el Soporte tiene delante—, abierta
     * unos segundos y cruzable por el equipo. Los fantasmas no pasan: ellos
     * leen el laberinto de verdad y aquí no se toca. */
    cruzaPared: function (idx, c, r) {
      if (!this.on) return false;
      c = CFG.wrapCol(c);
      for (var i = 0; i < this.st.length; i++) {
        var pu = this.st[i].puente;
        if (!pu || !pu.cs) continue;
        for (var k = 0; k < pu.cs.length; k++) if (pu.cs[k].c === c && pu.cs[k].r === r) return true;
      }
      return false;
    },

    /* ¿Hay algún hueco abierto ahora mismo? (la marca de la tecla) */
    puenteActivo: function () {
      if (!this.on) return false;
      for (var i = 0; i < this.st.length; i++) if (this.st[i].puente) return true;
      return false;
    },

    oculto: function (idx) {
      var s = this.estado(idx);
      return !!(s && s.sombra > 0);
    },

    ciegoDe: function (gid) {
      return !!(this.eclipseTicks > 0 || (this.ciego && this.ciego[gid] > 0));
    },

    multVelJefe: function (G) {
      if (!this.on || !G || !G.jefe) return 1;
      var m = this.eclipseTicks > 0 ? 0.5 : 1;
      for (var i = 0; i < this.st.length; i++) {
        var z = this.st[i].telarana;
        if (z && this.distancia(G.jefe.x, G.jefe.y, z.c * T + T / 2, z.r * T + T / 2) <= 1.5 * T) m *= H.TELARANA_MULT;
      }
      return m;
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
    /* PASIVA DEL ASESINO: lo que vale una muerte suya. Pasa por aquí TODO lo
     * que se cobra por matar —la cadena del energizante, las muertes por
     * habilidad y el premio del REY FANTASMA—, para que la pasiva sea del ROL
     * y no de una forma concreta de jugar. Fuera de DESATADO no existe. */
    puntosDe: function (G, who, base) {
      base = Math.round(base || 0);
      if (!this.on || !G || !G.hab) return base;
      var rol = G.roles && G.roles[who | 0];
      return (rol === 'asesino') ? Math.round(base * H.BONO_ASESINO) : base;
    },

    /* Premios fijos que SÍ cobran la MARCA (22 sep 2026). Un premio
     * «exacto» se salta a propósito todos los multiplicadores —la racha y
     * el bono del rol— porque son bajas a distancia que no deben encadenar.
     * La marca no es eso: es puntería, se gasta una E en ponerla y dura ocho
     * segundos. Marcar y disparar el SHURIKEN daba lo mismo que disparar sin
     * marcar, y con la BOMBA pasaba igual. Estas tres sí la cobran.
     * Fuera quedan EJECUCIÓN (5.000 ya son el premio gordo), TERREMOTO y
     * DOMINIO, que matan a varios de golpe y no apuntan a nadie. */
    MARCA_EN_FIJOS: { shuriken: 1, bomba: 1, bola_guiada: 1 },

    /* Bonos que dependen de QUÉ fantasma se ha comido y de cómo. Sombra no
     * multiplica la cadena: garantiza 500, o 750 si la baja llega desde la
     * espalda. Una cadena que ya valga más conserva su premio. */
    puntosFantasma: function (G, who, g, base, como, exacto) {
      var s = this.estado(who), mult = 1, pts;
      var marcado = !!(g && this.marcaGhost[g.id] === who && s && s.marca > 0);
      if (marcado && (!exacto || this.MARCA_EN_FIJOS[como])) mult *= 2;
      pts = exacto ? Math.round((base || 0) * mult) : this.puntosDe(G, who, Math.round((base || 0) * mult));
      if (s && s.sombra > 0 && g) {
        var detras = this.deEspaldas(G.pacs[who], g);
        pts = Math.max(pts, detras ? H.SOMBRA_ESPALDA_PUNTOS : H.SOMBRA_PUNTOS);
        this.efecto('sombra_golpe', g.x, g.y, 28, G.pacs[who].x, G.pacs[who].y);
      }
      return pts;
    },

    /* Todo fantasma cobrado alimenta Frenesí y Carroña, venga de MORDISCO,
     * de CACERÍA o de otra habilidad. Antes solo lo hacían las muertes del
     * catálogo y el aumento de velocidad era casi imposible de percibir. */
    alMatar: function (G, who, g, x, y) {
      var s = this.estado(who);
      if (!s) return;
      x = (x == null && g) ? g.x : x; y = (y == null && g) ? g.y : y;
      if (s.frenesi > 0) {
        s.frenesiMult = (s.frenesiMult || 1) + H.FRENESI_PASO;
        this.efecto('frenesi', x, y, 26);
        if (G.addPopup) G.addPopup(x, y - 7, '×' + s.frenesiMult.toFixed(2), 35);
      }
      if (g && this.caceriaQuien[g.id] >= 0) this.caceriaQuien[g.id] = -1;
      if (s.carrona > 0) this.soltarBotin(G, who, x, y);
      if (g && this.marcaGhost[g.id] >= 0) {
        var duenoMarca = this.marcaGhost[g.id];
        this.marcaGhost[g.id] = -1;
        if (this.st[duenoMarca]) this.st[duenoMarca].marca = 0;
      }
    },

    /* CARROÑA: la moneda sale despedida por el pasillo, lejos de quien mató,
     * y cae a dos casillas (o a una, o donde pueda) con medio segundo en que
     * no la puede coger nadie. Ver CFG.HAB.CARROÑA_SALTO. */
    soltarBotin: function (G, who, x, y) {
      var c0 = CFG.wrapCol(Math.floor(x / T)), r0 = Math.floor(y / T);
      var dirs = this.dirsBotin(G, who, x, y), cF = c0, rF = r0;
      for (var d = 0; d < dirs.length; d++) {
        var v = CFG.DIR_V[dirs[d]], c = c0, r = r0, n = 0;
        for (; n < H.CARROÑA_SALTO; n++) {
          var nc = CFG.wrapCol(c + v.x), nr = r + v.y;
          if (!aterrizable(nc, nr)) break;
          c = nc; r = nr;
        }
        if (n > 0) { cF = c; rF = r; break; }
      }
      this.joyas.push({ x: cF * T + T / 2, y: rF * T + T / 2, ox: x, oy: y,
        vuelo: H.CARROÑA_VUELO, espera: H.CARROÑA_GRACIA,
        t: H.CARROÑA_JOYA, w: who });
    },

    /* Las cuatro direcciones ordenadas de más lejos a más cerca de quien
     * mató: la moneda prueba primero la que lo aleja de él. */
    dirsBotin: function (G, who, x, y) {
      var D = CFG.DIR, p = G && G.pacs ? G.pacs[who] : null;
      if (!p) return [D.RIGHT, D.LEFT, D.UP, D.DOWN];
      var ancho = CFG.COLS * T, dx = x - p.x, dy = y - p.y;
      if (dx > ancho / 2) dx -= ancho; else if (dx < -ancho / 2) dx += ancho;
      var lejosX = (dx >= 0) ? D.RIGHT : D.LEFT;
      var lejosY = (dy >= 0) ? D.DOWN : D.UP;
      return (Math.abs(dx) >= Math.abs(dy))
        ? [lejosX, lejosY, CFG.OPP[lejosY], CFG.OPP[lejosX]]
        : [lejosY, lejosX, CFG.OPP[lejosX], CFG.OPP[lejosY]];
    },

    /* CADENA duplica en el marcador común lo que puntúe cualquiera de sus
     * dos extremos. Devuelve el extra para que quien originó los puntos lo
     * pueda enseñar en el mismo sitio. */
    bonoCadena: function (G, who, pts, x, y) {
      if (!this.on || !(pts > 0)) return 0;
      for (var i = 0; i < this.st.length; i++) {
        var s = this.st[i];
        if (s.cadena > 0 && (i === who || s.cadenaCon === who)) {
          G.addScore(pts);
          if (G.addPopup && x != null) G.addPopup(x, y - 7, '+' + pts, 30);
          this.efecto('cadena', x == null ? 0 : x, y == null ? 0 : y, 20);
          return pts;
        }
      }
      return 0;
    },

    congelado: function (gid) {
      return this.on && this.hielo[gid] > 0;
    },

    /* UN FANTASMA ATURDIDO ESTÁ APAGADO, NO SOLO QUIETO (21 sep).
     *
     * Aturdir le ponía la velocidad a cero y nada más: se quedaba clavado en
     * medio del pasillo y seguía matando al que pasara por encima, así que
     * EMPUJÓN, GRITO DE GUERRA, CHISPA y GRAVEDAD paraban al fantasma para
     * matarte con él. Ahora el aturdimiento apaga el choque, igual que el
     * hielo: ni mata ni se puede comer (si está azul por otra cosa, se come
     * por azul, que eso va por su lado).
     *
     * Sube el valor de esas cuatro habilidades a la vez: un aturdimiento deja
     * de ser «lo paro» y pasa a ser «lo apago». */
    inerte: function (gid) {
      return !!(this.on && this.aturdido && this.aturdido[gid] > 0);
    },

    /* DOMINIO: ¿este fantasma es ahora mismo del Mago? */
    esDominado: function (gid) {
      return !!(this.on && this.dominado && this.dominado[gid] > 0);
    },

    /* Quieto y sin morder: hielo o aturdimiento. Es lo que consulta el choque
     * de game.js, que es el sitio por donde pasan todas las muertes.
     *
     * Desde el 22 sep 2026 entra aquí también el DOMINIO. Ese fantasma no
     * está quieto —corre detrás de los suyos—, pero mientras es del Mago NO
     * MUERDE A NADIE DEL EQUIPO, y este es justo el único sitio donde esa
     * decisión se toma. Ponerlo aquí evita repetir la comprobación en los
     * dos choques de game.js (el local y el de red) y que uno se olvide. */
    apagado: function (gid) {
      return this.congelado(gid) || this.inerte(gid) || this.esDominado(gid);
    },

    /* PROVOCAR: la casilla del Tanque más cercano que esté provocando, o null.
     *
     * Vale para TODO el que esté en la calle, AZULES INCLUIDOS (20 sep). El
     * grito es la jugada con la que el Tanque salva al equipo, y mientras los
     * azules siguieran a lo suyo bastaba con que alguien pisara un energizante
     * para que la provocación se quedara en nada justo cuando más falta hacía.
     * Ahora un azul provocado también viene — y, siendo azul, se lo comen: es
     * el precio de que el grito no falle nunca.
     *
     * Fuera siguen los ojos y los que están en casa: esos no persiguen a
     * nadie, vuelven a su sitio. */
    objetivo: function (G, g) {
      if (!this.on || g.mode !== 'normal') return null;
      /* DOMINIO: mientras el fantasma es del Mago ya no va a por Pac-Man,
       * va a por LOS SUYOS. Se resuelve antes que nada —antes del clon, de
       * la sirena, del grito del Tanque y de la ceguera— porque durante esos
       * seis segundos no es un fantasma del laberinto: es del Mago, y nada
       * de lo que mueve a los demás debería poder apartarlo de su presa.
       * Se reaprovecha este camino (el mismo de PROVOCAR y SIRENA) en vez de
       * inventar otro: Ghost.targetTile y Ghost.chooseDir ya pasan por aquí. */
      if (this.esDominado(g.id)) {
        var presa = this.presaDominado(G, g);
        if (presa) return { x: presa.tileX(), y: presa.tileY() };
        /* SIN PRESA, A POR EL REY FANTASMA (22 sep 2026). En un nivel de
         * jefe los otros tres están encerrados en casa hasta que él los
         * invoca, así que el dominado se quedaba sin nadie a quien cazar y
         * volvía a perseguir a Pac-Man: el Mago se pagaba una E para que un
         * fantasma le siguiera cazando a él. Ahora se va a por el rey y le
         * pega un bocado (ver el DOMINIO de pasoRoles). */
        if (this.rey(G)) return { x: Math.floor(G.jefe.x / T), y: Math.floor(G.jefe.y / T) };
        return null;
      }
      if (this.ciego && this.ciego[g.id] > 0) return null;
      for (var cidx = 0; cidx < this.st.length; cidx++) {
        var cs = this.st[cidx];
        if (cs.clon && this.vivo(G, cidx)) return { x: cs.clon.c, y: cs.clon.r };
        if (cs.sirena) return { x: cs.sirena.c, y: cs.sirena.r };
      }
      var mejor = null, mejorD = Infinity;
      for (var i = 0; i < this.st.length; i++) {
        if (!(this.st[i].provoca > 0) || this.st[i].sombra > 0 || !this.vivo(G, i)) continue;
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

    /* A quién persigue un fantasma DOMINADO: el fantasma NORMAL más
     * cercano. Se saltan los que están en casa y los que vuelven hechos ojos
     * (a esos no hay nada que hacerles) y los otros dominados, para que dos
     * fantasmas del Mago no se peleen entre ellos en vez de cazar. */
    presaDominado: function (G, g) {
      var mejor = null, d0 = Infinity;
      for (var i = 0; i < 4; i++) {
        var o = G.ghosts[i];
        if (i === g.id || !this.enLaCalle(o) || this.esDominado(i)) continue;
        var d = this.distancia(g.x, g.y, o.x, o.y);
        if (d < d0) { d0 = d; mejor = o; }
      }
      return mejor;
    },

    /* PISOTÓN: el Pac-Man del que huye ese fantasma, o null */
    huyeDe: function (G, g) {
      if (!this.on || !(this.huye[g.id] > 0) || g.mode !== 'normal') return null;
      var p = G.pacs[this.huyeQuien[g.id]];
      return (p && !p.out) ? p : null;
    },

    /* ¿Ese choque se perdona? INMUNIDAD, la carrera de ARROLLAR y el medio
     * segundo tras romperse un escudo no mueren; un ESCUDO se gasta aquí. */
    /* `g` es el fantasma que ha chocado, cuando lo hay: al romperse el
     * escudo sale EMPUJADO hacia atrás (ver empujar). */
    salvaDelChoque: function (G, idx, g) {
      var s = this.estado(idx);
      if (!s) return false;
      var p = G.pacs[idx], j;
      if (s.rebote > 0 && g) {
        s.rebote = 0;
        if (this.manda(G)) this.matarCatalogo(G, g, idx, H.MAGO_PUNTOS, 'rebote');
        return true;
      }
      /* EL REBOTE CONTRA EL REY FANTASMA (22 sep 2026). Sin fantasma que
       * haya chocado, el único que pregunta por aquí es el jefe (Jefe.mata):
       * es su choque el que no trae `g`, porque el rey no es un fantasma. Y
       * el rebote es precisamente lo que dice su nombre —el primer contacto
       * se devuelve—, así que se gasta igual: le quita vida y lo deja parado
       * un segundo. Lo de pararlo no es un extra: el fantasma que rebota se
       * muere y ahí se acaba el contacto, pero el rey sigue encima, y sin
       * ese segundo el Tanque rebotaba y moría en el tick siguiente. */
      if (s.rebote > 0 && !g) {
        var JR = window.PM.Jefe, rp = G.pacs[idx];
        if (JR && JR.activo(G)) {
          s.rebote = 0;
          s.gracia = H.ESCUDO_GRACIA;
          if (this.manda(G)) {
            JR.danar(G, CFG.JEFE.DANO.rebote, idx, 'rebote');
            JR.congelar(G, CFG.JEFE.ATURDE.rebote);
          } else if (G.netRole === 'guest' && idx === G.localIdx) {
            /* el invitado decide que NO se muere, pero el golpe lo da el
             * anfitrión: igual que la apisonadora (ver Jefe.peticionGolpe) */
            G.netSend('gevt', { t: 'jefeGolpe', f: 'rebote' });
          }
          if (rp) this.efecto('rebote', rp.x, rp.y, 24);
          sonDe(G, idx, 'playCharge');
          return true;
        }
      }
      if (s.yunque > 0 || s.pielPiedra > 0) { if (g) this.empujar(G, g, 1); return true; }
      /* El golpe del compañero enlazado lo absorbe el Soporte y consume la
       * cadena. Antes solo se miraba la cadena del jugador golpeado. */
      for (j = 0; j < this.st.length; j++) {
        var enl = this.st[j];
        if (enl.cadena > 0 && enl.cadenaCon === idx) {
          enl.cadena = 0; enl.cadenaCon = -1;
          if (g) this.empujar(G, g, 1);
          if (p && G.pacs[j]) this.efecto('cadena_rota', p.x, p.y, 26, G.pacs[j].x, G.pacs[j].y);
          return true;
        }
      }
      for (j = 0; j < this.st.length; j++) {
        var fs = this.st[j], fp = G.pacs[j];
        if (fs.campo > 0 || (fs.fortaleza > 0 && fp && p && this.distancia(fp.x, fp.y, p.x, p.y) <= H.FORTALEZA_RADIO * T)) {
          if (g) this.empujar(G, g, 1);
          return true;
        }
      }
      if (s.cadena > 0) { s.cadena = 0; s.cadenaCon = -1; if (g) this.empujar(G, g, 1); return true; }
      if (s.inmune > 0 || s.arrolla > 0 || s.gracia > 0 || s.dimension > 0) return true;
      /* QUÉ SE LLEVA UN GOLPE. La CORAZA del Tanque se suma SOLO a su
       * propio ESCUDO (la W): esos dos son suyos, los gana él, y juntos le
       * dan dos golpes para entrar a salvar a alguien. Con cualquier otro no
       * se acumula: el ESCUDO ALIADO que reparte el Soporte se lleva la
       * coraza por delante en el mismo golpe.
       *
       * Si no, bastaba con que el Soporte pasara repartiendo para que el
       * Tanque fuera sumando capas de vida, y un escudo es una oportunidad,
       * no una capa de vida. */
      var tieneCoraza = s.corPas > 0 && this.esRol(G, idx, 'tanque');
      if (s.coraza > 0 || s.escudo > 0 || tieneCoraza) {
        if (s.escudo > 0) {
          s.escudo = 0;
          s.coraza = 0;
          if (tieneCoraza) { s.corPas = 0; s.corCd = H.CORAZA_CD; }   // no se acumulan
        } else if (s.coraza > 0) {
          s.coraza = 0;                                               // y la coraza aguanta el siguiente
        } else {
          s.corPas = 0;
          s.corCd = H.CORAZA_CD;
        }
        s.gracia = H.ESCUDO_GRACIA;
        if (p) this.efecto('roto', p.x, p.y, 20);
        this.empujar(G, g, H.ESCUDO_EMPUJE);
        sonDe(G, idx, 'playBiteMiss');
        /* CONTRA QUIÉN. Va en el aviso porque LOS FANTASMAS LOS MUEVE EL
         * ANFITRIÓN: si el invitado empuja en su pantalla, la siguiente foto
         * le devuelve el fantasma a donde estaba y el empujón no llega a
         * verse. Quien lo tiene que dar es el anfitrión. */
        var gid = (g && typeof g.id === 'number') ? g.id : -1;
        if (G.netRole === 'guest') G.netSend('gevt', { t: 'habRoto', g: gid });
        else G.hostEvt({ t: 'habRoto', w: idx, g: gid });
        return true;
      }
      return false;
    },

    /* EL EMPUJE: el fantasma que rompe un escudo sale despedido `casillas`
     * hacia atrás por donde vino. Se va casilla a casilla y se para en la
     * primera pared, así que nunca acaba dentro del muro ni cruzando al otro
     * lado del laberinto. Además se da la vuelta: si siguiera con el mismo
     * rumbo volvería a meterse encima en dos pasos y el empuje no habría
     * servido de nada. */
    empujar: function (G, g, casillas) {
      if (!g || !casillas || g.mode !== 'normal') return false;
      var v = CFG.DIR_V[g.dir];
      if (!v) return false;
      var cx = g.tileX(), cy = g.tileY(), movido = 0;
      for (var n = 0; n < casillas; n++) {
        var nx = CFG.wrapCol(cx - v.x), ny = cy - v.y;
        if (ny < 0 || ny >= CFG.ROWS) break;
        if (!CFG.isOpen(nx, ny)) break;          // pared: hasta aquí llega
        cx = nx; cy = ny; movido++;
      }
      if (!movido) return false;
      g.x = cx * T + T / 2;
      g.y = cy * T + T / 2;
      g.forceReverse();
      this.efecto('aplasta', g.x, g.y, 16);
      return true;
    },

    /* Un escudo que se rompió en otra máquina (el invitado decide sus choques) */
    escudoRoto: function (G, idx) {
      var s = this.estado(idx);
      if (!s || idx === G.localIdx && !G.isSpec()) return;
      /* la misma regla que en salvaDelChoque */
      if (s.escudo > 0) {
        s.escudo = 0;
        s.coraza = 0;
        if (s.corPas > 0) { s.corPas = 0; s.corCd = H.CORAZA_CD; }
      } else if (s.coraza > 0) {
        s.coraza = 0;
      } else if (s.corPas > 0) {
        s.corPas = 0;
        s.corCd = H.CORAZA_CD;
      }
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
        case 'sombra': return s.sombra > 0;
        case 'frenesi': return s.frenesi > 0;
        case 'carrona': return s.carrona > 0;
        case 'marca': return s.marca > 0;
        case 'gancho_inverso': return s.ganchoInv > 0;
        case 'gancho': return s.ganchoOut > 0;
        case 'shuriken': return !!s.shuriken;
        case 'misil':
        case 'bola_guiada':
          for (var pi = 0; pi < this.proyectilesCat.length; pi++) if (this.proyectilesCat[pi].w === idx &&
              (this.proyectilesCat[pi].tipo === (h.id === 'misil' ? 'misil' : 'guiada'))) return true;
          return false;
        case 'caceria': return s.caceria > 0;
        case 'yunque': return s.yunque > 0;
        case 'piel_piedra': return s.pielPiedra > 0;
        case 'rebote': return s.rebote > 0;
        case 'terremoto': return s.terremoto > 0;
        case 'fortaleza': return s.fortaleza > 0;
        case 'estela': return s.estela > 0;
        case 'puente': return !!s.puente;
        case 'cadena': return s.cadena > 0;
        case 'campo': return s.campo > 0;
        case 'hospital': return s.hospital > 0;
        case 'eclipse': return s.eclipse > 0;
        case 'portal': return !!this.portales[idx];
        case 'bomba': return !!s.bomba;
        case 'mina': return !!s.mina;
        case 'telarana': return !!s.telarana;
        case 'muro': return !!s.muro;
        case 'faro': return !!s.faro;
        case 'sirena': return !!s.sirena;
        case 'dominio':
          /* La E se queda encendida mientras le quede un fantasma suyo, que
           * es lo único que dura de este poder (el reloj va por fantasma). */
          for (var di = 0; di < 4; di++) if (this.dominaQuien[di] === idx) return true;
          return false;
        case 'clon': return !!s.clon;
        case 'totem': return !!s.totem;
        case 'meteoro': return !!s.meteoro;
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

    /* ---------- EL TEMBLOR DE PANTALLA ----------
     * Un meneo del mapa que puede pedir cualquier poder: hoy el TERREMOTO del
     * Tanque, mañana el METEORO del Mago. Quien lo pide solo dice cuánto dura
     * y con cuánta fuerza empieza; el dibujo (Game.render) pregunta en cada
     * fotograma por el desplazamiento y corre el laberinto con un translate.
     * Así el temblor no es código pegado a un poder: es una cosa del juego
     * que se enciende desde donde haga falta.
     *
     * Se mueve SOLO el laberinto y lo que vive dentro. El marcador de arriba
     * y los avisos no se menean: lo que tiembla es el suelo, no la máquina.
     */
    temblorTicks: 0,
    temblorTotal: 0,
    temblorFuerza: 0,

    /* Empieza (o pisa) un temblor: `ticks` de duración y `fuerza` en píxeles
     * de desvío máximo al principio. Dos poderes a la vez no suman un
     * terremoto del doble: manda el que menea más fuerte. */
    temblar: function (ticks, fuerza) {
      ticks = ticks | 0;
      fuerza = fuerza || 0;
      if (ticks <= 0 || fuerza <= 0) return;
      if (this.temblorTicks > 0 && this.temblorFuerza > fuerza) return;
      this.temblorTicks = ticks;
      this.temblorTotal = ticks;
      this.temblorFuerza = fuerza;
    },

    /* Cuántos píxeles hay que correr el dibujo AHORA MISMO: { x, y }, siempre
     * enteros (medio píxel emborrona el laberinto, que va pintado a tamaño
     * nativo) y ceros si no hay nada temblando.
     *
     * Se calma AL CUADRADO: el golpe se lleva casi todo el meneo en el primer
     * tercio y el resto se apaga suave hasta parar del todo —los últimos
     * coletazos ya no llegan ni a un píxel, así que se queda quieto antes de
     * que se le acabe el reloj. Un temblor plano, igual de fuerte del
     * principio al final, no parece un terremoto: parece una pantalla rota. */
    temblor: function () {
      var t = this.temblorTicks | 0;
      if (t <= 0 || !this.temblorFuerza) return { x: 0, y: 0 };
      /* REDUCIR MOVIMIENTO (accesibilidad, la misma que mira el resto del
       * juego con PM.UI.menosMovimiento): a quien lo tenga puesto no se le
       * mueve nada. El poder sigue haciendo lo suyo —los fantasmas se van a
       * casa igual—, solo que sin marear a nadie. */
      var U = window.PM.UI;
      if (U && U.menosMovimiento && U.menosMovimiento()) return { x: 0, y: 0 };
      var k = t / (this.temblorTotal || t);            // 1 al empezar, 0 al final
      var amp = this.temblorFuerza * k * k;
      var n = (this.temblorTotal || t) - t;            // qué tick del temblor es
      return { x: Math.round(ruidoTemblor(n + 1) * amp),
               y: Math.round(ruidoTemblor(n + 71.3) * amp) };
    },

    /* =========================================================
     * TANQUE
     * ========================================================= */
    /* E — PROVOCAR: 5 s en que TODOS los fantasmas del mapa (y el REY
     * FANTASMA) persiguen la casilla del Tanque, aunque tocara dispersarse, e
     * IGNORAN al resto del equipo: pasan a través de los demás Pac-Man sin
     * matarlos (ver ignoraA). Cambia el objetivo, no el modo: no se asustan y
     * al Tanque sí lo matan.
     *
     * 18 sep: el que venía de espaldas se DA LA VUELTA EN EL ACTO. Antes solo
     * se le borraba lo pensado, y en un pasillo largo no hay cruce donde
     * decidir: el grito tardaba segundos en notarse y para entonces ya había
     * muerto el compañero al que iba a salvar. */
    provocar: function (G, idx) {
      var s = this.estado(idx), p = G.pacs[idx];
      if (!s || !p) return false;
      s.provoca = H.TAUNT_TICKS;
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!g || g.mode !== 'normal' || g.driven()) continue;
        if (this.deEspaldas(p, g)) g.forceReverse();
        else g.clearPlan();                          // que lo piense ya
      }
      // el REY FANTASMA también acude, y también se da la vuelta
      if (window.PM.Jefe && window.PM.Jefe.activo && window.PM.Jefe.activo(G)) {
        window.PM.Jefe.acude(G, p);
      }
      sonDe(G, idx, 'playShout');
      return true;
    },

    /* ¿Ese perseguidor le está dando la espalda al Pac-Man?
     *
     * El atajo del túnel SOLO se cuenta si los dos van por la fila del túnel:
     * dar la vuelta por ahí desde cualquier otra fila no existe, y contarlo
     * mandaba al revés a todo el que estuviera a más de medio laberinto. */
    deEspaldas: function (p, g) {
      var v = CFG.DIR_V[g.dir];
      if (!v) return false;
      var ancho = CFG.COLS * T, hx = p.x - g.x;
      var porElTunel = (Math.floor(g.y / T) === CFG.TUNNEL_ROW &&
                        Math.floor(p.y / T) === CFG.TUNNEL_ROW);
      if (porElTunel) {
        if (hx > ancho / 2) hx -= ancho; else if (hx < -ancho / 2) hx += ancho;
      }
      return (v.x * hx + v.y * (p.y - g.y)) < 0;
    },

    /* E — PISOTÓN: los fantasmas a diez casillas huyen del Tanque 6 s.
     * No se ponen azules ni se pueden comer. Sin nadie cerca, no sale. */
    pisoton: function (G, idx, soloVisual) {
      var p = G.pacs[idx], s = this.estado(idx);
      if (!p || !s) return false;
      /* SIN ALCANCE (20 sep): huye TODO el que esté en la calle, esté donde
       * esté. Con un radio, el golpe se sentía a medias —los de la otra punta
       * seguían viniendo mientras el Tanque se jugaba la vida— y encima
       * obligaba a perdonar píxeles por la red, porque el fantasma que el
       * invitado ve justo en el borde no está ahí en la pantalla del
       * anfitrión. Sin radio, no hay borde que discutir. */
      var blancos = [];
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!this.enLaCalle(g) || g.driven()) continue;
        blancos.push(g);
      }
      /* el REY FANTASMA también sale por patas (18 sep): con jefe, el
       * laberinto está casi vacío de fantasmas y el poder no salía nunca. */
      var JF = window.PM.Jefe;
      var rey = !!(JF && JF.activo && JF.activo(G));
      if (!blancos.length && !rey) return false;
      s.pisoton = 30;                       // la onda que se pinta
      sonDe(G, idx, 'playCharge');
      if (soloVisual) return true;
      if (rey) JF.espanta(G, p, H.PISOTON_TICKS);
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
     * HASTA TOPARSE CON UNA PARED, a x1.75, invulnerable y comiéndose a
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

    /* E MANTENIDA 3 s — escudo a TODO EL EQUIPO: a los compañeros vivos,
     * estén donde estén, y AL PROPIO SOPORTE (20 sep).
     *
     * Antes llegaba a dos casillas y a él no. Las dos cosas sobraban: el
     * Soporte reparte escudos y se quedaba a pelo, que es lo contrario de lo
     * que hace mantener pulsado —gastar la habilidad entera de una vez—; y el
     * alcance obligaba a juntar al equipo justo cuando lo que salva es
     * separarse. Es su jugada grande: cuesta la misma recarga de 32 s y se
     * nota. Sin nadie vivo no sale (pero él cuenta, así que basta con estar
     * vivo). */
    aliadosCerca: function (G, idx) {
      var out = [];
      if (!G.pacs[idx]) return out;
      for (var i = 0; i < G.pacs.length; i++) {
        if (this.vivo(G, i)) out.push(i);
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
      var pts = this.puntosDe(G, who, H.MAGO_PUNTOS);
      G.addScore(pts);
      this.bonoCadena(G, who, pts, g.x, g.y);
      G.addPopup(g.x, g.y, pts, 45);
      this.efecto(como, g.x, g.y, como === 'rayo' ? 14 : 18, ox, oy);
      this.alMatar(G, who, g, g.x, g.y);
      if (mio(G, who)) {
        G.runGhosts++;
        G.bumpAch && G.bumpAch({ fantasmas: 1 });
      }
      G.hostEvt({ t: 'magoKill', g: g.id, w: who, f: como, p: pts,
        x: Math.round(g.x), y: Math.round(g.y), ox: Math.round(ox), oy: Math.round(oy) });
      window.AudioSys && AudioSys.playEatGhost();
    },

    /* Lo mismo contado por el anfitrión, en otra pantalla */
    magoKill: function (G, e) {
      var g = G.ghosts[e.g | 0];
      if (!g) return;
      g.eaten();
      this.hielo[g.id] = 0;
      /* los puntos vienen en el aviso: aquí no se sabe de quién era la
       * muerte ni si llevaba la pasiva del Asesino */
      G.addPopup(e.x, e.y, (e.p | 0) || H.MAGO_PUNTOS, 45);
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
      /* la boca se planta en el CENTRO de la casilla, y el Mago se encarrila
       * con ella: si no, entrar y salir "entre dos casillas" deja el portal
       * medio píxel torcido y no se sabe dónde está de verdad */
      this.encarrilar(G, idx, c);
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
      this.encarrilar(G, idx, c);
      po.sc = c.c; po.sr = c.r; po.e = 0; po.t = H.PORTAL_TICKS;
      /* sale POR la boca: que no la cruce al instante */
      if (s) { s.ultTile = c.r * CFG.COLS + c.c; s.cruce = H.PORTAL_CRUCE; }
      this.efecto('boca', c.c * T + T / 2, c.r * T + T / 2, 16);
      sonDe(G, idx, 'playFlash');
    },

    /* Pone a ese Pac-Man en el centro exacto de la casilla c (las bocas del
     * portal se plantan ahí). No toca al de otra máquina. */
    encarrilar: function (G, idx, c) {
      var p = G.pacs[idx];
      if (!p || !c || !G.isLocalAuth(idx)) return;
      p.x = c.c * T + T / 2;
      p.y = c.r * T + T / 2;
      p.pauseTicks = 0;
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

    /* ¿Ese jugador está apretando el ESPACIO ahora mismo? */
    pisaPortal: function (idx) {
      return !!(this.espacio && this.espacio[idx | 0]);
    },

    /* El teclado: el ESPACIO apretado o suelto (lo pone js/ui.js) */
    marcarEspacio: function (idx, on) {
      if (!this.espacio) return;
      idx = idx | 0;
      if (idx >= 0 && idx < this.espacio.length) this.espacio[idx] = !!on;
    },

    soltarEspacio: function () {
      this.espacio = [false, false, false, false];
    },

    /* Cruzar: lo hace quien simula a ese Pac-Man, al ENTRAR en una boca (no
     * por estar encima: el Mago que pone la salida donde está no rebota).
     *
     * 18 sep: hace falta tener el ESPACIO APRETADO. Antes se cruzaba por el
     * mero hecho de pisar la boca, y en un pasillo de paso el portal del Mago
     * te mandaba al otro lado del laberinto sin comerlo ni beberlo. Ahora el
     * portal es una puerta: se entra si se quiere entrar. La casilla se
     * apunta igual aunque no se cruce, para no cruzar al soltar y volver a
     * apretar sin moverse. */
    cruzar: function (G, p) {
      if (!this.on || !p) return;
      var s = this.estado(p.id | 0);
      if (!s || s.dimension > 0) return;
      var col = p.tileX(), row = p.tileY();
      var tile = row * CFG.COLS + col;
      if (tile === s.ultTile) return;
      s.ultTile = tile;
      if (s.cruce > 0) return;
      if (!this.pisaPortal(p.id | 0)) return;
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

    /* R — TORMENTA: TRES rayos sobre el fantasma más cercano a diez casillas
     * (20 sep; eran dos a seis). El primero cae AL INSTANTE —lo que se pulsa
     * tiene que verse— y los otros dos, uno por segundo. Sin nadie a tiro, ese
     * rayo se pierde. Sale siempre. */
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

    /* =========================================================
     * CATÁLOGO DESATADO
     *
     * Las habilidades nuevas comparten tres reglas: las posiciones se
     * expresan en casillas para que sean deterministas, el anfitrión decide
     * las interacciones con fantasmas y los puntos especiales no entran en la
     * cadena clásica de la superpastilla.
     * ========================================================= */
    ghostCercanoAt: function (G, c, r, radio) {
      var mejor = null, d0 = Infinity;
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!this.enLaCalle(g)) continue;
        var dx = Math.abs(g.tileX() - c), dy = Math.abs(g.tileY() - r);
        dx = Math.min(dx, CFG.COLS - dx);
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d <= radio && d < d0) { d0 = d; mejor = g; }
      }
      return mejor;
    },

    ghostCercano: function (G, idx, radio) {
      var p = G.pacs[idx], mejor = null, d0 = Infinity;
      if (!p) return null;
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!this.enLaCalle(g) || g.driven && g.driven()) continue;
        var d = this.distancia(p.x, p.y, g.x, g.y);
        if (d <= radio * T && d < d0) { d0 = d; mejor = g; }
      }
      return mejor;
    },

    ghostsEn: function (G, c, r, radio) {
      var out = [];
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!this.enLaCalle(g)) continue;
        var dx = Math.abs(g.tileX() - c), dy = Math.abs(g.tileY() - r);
        dx = Math.min(dx, CFG.COLS - dx);
        if (Math.sqrt(dx * dx + dy * dy) <= radio) out.push(g);
      }
      return out;
    },

    casillaAdelante: function (G, idx, max, d) {
      var p = G.pacs[idx], dir = (d >= 0 && d <= 3) ? d : (p && this.dirFlash(p));
      if (!p || dir == null) return null;
      var v = CFG.DIR_V[dir], c = p.tileX(), r = p.tileY(), out = null;
      for (var n = 1; n <= max; n++) {
        var nc = CFG.wrapCol(c + v.x * n), nr = r + v.y * n;
        if (nr < 0 || nr >= CFG.ROWS || !CFG.isOpen(nc, nr, false)) break;
        out = { c: nc, r: nr, d: dir };
      }
      return out;
    },

    /* Primer fantasma realmente situado en la línea de tiro. Las habilidades
     * de línea dejaron de elegir "el más cercano en círculo", que hacía que
     * GANCHO y EMPUJÓN alcanzaran cosas detrás del jugador. */
    ghostEnLinea: function (G, idx, max, d) {
      var p = G.pacs[idx], dir = (d && d.d >= 0 && d.d <= 3) ? d.d : this.dirFlash(p);
      var v = CFG.DIR_V[dir];
      if (!p || !v) return null;
      for (var n = 1; n <= max; n++) {
        var c = CFG.wrapCol(p.tileX() + v.x * n), r = p.tileY() + v.y * n;
        if (r < 0 || r >= CFG.ROWS || !CFG.isOpen(c, r, false)) break;
        for (var i = 0; i < 4; i++) {
          var g = G.ghosts[i];
          if (this.enLaCalle(g) && g.tileX() === c && g.tileY() === r) return g;
        }
      }
      return null;
    },

    extremoLinea: function (G, idx, max, d) {
      var p = G.pacs[idx], c = this.casillaAdelante(G, idx, max, d);
      return c || (p ? { c: p.tileX(), r: p.tileY(), d: this.dirFlash(p) } : null);
    },

    matarCatalogo: function (G, g, who, pts, como, mult, exacto) {
      if (!g || !this.enLaCalle(g)) return false;
      var x = g.x, y = g.y, p = G.pacs[who];
      pts = this.puntosFantasma(G, who, g,
        Math.round((pts || H.MAGO_PUNTOS) * (mult || 1)), como, !!exacto);
      g.eaten();
      this.hielo[g.id] = 0; this.huye[g.id] = 0;
      this.azulCatalogo[g.id] = 0; this.azulCatTicks[g.id] = 0; this.arcanoAzul[g.id] = 0;
      this.caceriaQuien[g.id] = -1;
      /* si el que se va a casa era el fantasma prestado, deja de serlo: no
       * tiene sentido que siga cazando desde dentro de la casa */
      this.dominado[g.id] = 0; this.dominaQuien[g.id] = -1;
      G.addScore(pts);
      this.bonoCadena(G, who, pts, x, y);
      G.addPopup(x, y, pts, 45);
      this.efecto(como || 'fuego', x, y, 18, p ? p.x : x, p ? p.y : y);
      this.alMatar(G, who, g, x, y);
      if (mio(G, who)) { G.runGhosts++; G.bumpAch && G.bumpAch({ fantasmas: 1 }); }
      G.hostEvt({ t: 'magoKill', g: g.id, w: who, f: como || 'fuego', p: pts,
        x: Math.round(x), y: Math.round(y), ox: p ? Math.round(p.x) : Math.round(x), oy: p ? Math.round(p.y) : Math.round(y) });
      window.AudioSys && AudioSys.playEatGhost();
      return true;
    },

    /* MURO ocupa una casilla solo para los fantasmas. Pac-Man la atraviesa
     * porque el laberinto real sigue abierto. */
    bloqueaFantasma: function (c, r) {
      if (!this.on) return false;
      for (var i = 0; i < this.st.length; i++) {
        var m = this.st[i].muro;
        if (m && m.c === c && m.r === r) return true;
      }
      return false;
    },

    /* ---------- EL REY FANTASMA Y EL CATÁLOGO (22 sep 2026) ----------
     * Las habilidades nuevas no le hacían nada al jefe: quien no llevara el
     * kit clásico llegaba a un nivel de jefe sin forma de tumbarlo, y ese
     * nivel no se acaba hasta que cae. El camino es el que ya usaban el
     * mordisco, la bola de fuego y el rayo —Jefe.danar y Jefe.congelar, con
     * los números en CFG.JEFE—, así que aquí no se inventa nada: solo se
     * avisa al jefe desde cada poder.
     *
     * Estos dos ayudantes son para no repetir la misma comprobación treinta
     * veces. `rey` devuelve el módulo del jefe SOLO si hay uno vivo. */
    rey: function (G) {
      var JF = window.PM.Jefe;
      return (JF && JF.activo(G)) ? JF : null;
    },

    /* Y este lo disfraza de fantasma —x, y, tileX(), tileY()— para que los
     * proyectiles que persiguen (misil, bola guiada, balas del tótem) vuelen
     * hacia él con el MISMO código que hacia un fantasma, rutas del
     * laberinto incluidas, en vez de tener su propia rama. Es un solo objeto
     * reutilizado: solo vive dentro del tick que lo pide. */
    blancoRey: function (G) {
      if (!this.rey(G)) return null;
      var b = this.reyBlanco;
      if (!b) {
        b = this.reyBlanco = { rey: true,
          tileX: function () { return CFG.wrapCol(Math.floor(this.x / T)); },
          tileY: function () { return Math.floor(this.y / T); } };
      }
      b.x = G.jefe.x; b.y = G.jefe.y;
      return b;
    },

    shuriken: function (G, idx, d) {
      var p = G.pacs[idx], s = this.estado(idx);
      var dir = (d && d.d >= 0 && d.d <= 3) ? d.d : this.dirFlash(p), v = CFG.DIR_V[dir];
      if (!p || !s || !v) return false;
      if (!s.shuriken) s.shuriken = { id: ++this.rafagaId, usados: 0, resueltos: 0, aciertos: 0, ventana: 0 };
      if (s.shuriken.usados >= H.SHURIKEN_CANT) return false;
      s.shuriken.usados++;
      /* Cada disparo abre la ventana para el siguiente; el tercero ya no
       * espera a nadie (cierra la ráfaga por su cuenta al resolverse). */
      s.shuriken.ventana = (s.shuriken.usados < H.SHURIKEN_CANT) ? H.SHURIKEN_VENTANA : 0;
      this.proyectilesCat.push({
        tipo: 'shuriken', x: p.x, y: p.y, d: dir, w: idx,
        espera: 0, viaja: 0, max: H.SHURIKEN_TILES * T, grupo: s.shuriken.id
      });
      /* Las dos primeras pulsaciones son cargas, no activan recarga. La
       * tercera sí: al resolver los tres impactos se anula si todos dieron. */
      this.sinGasto = s.shuriken.usados < H.SHURIKEN_CANT;
      this.efecto('shuriken_salida', p.x, p.y, 18);
      G.addPopup(p.x, p.y - 8, s.shuriken.usados + '/3', 24);
      sonDe(G, idx, 'playFlash');
      return true;
    },

    bomba: function (G, idx, d) {
      var s = this.estado(idx), c = this.casillaDe(G, idx, d);
      if (!s || !c) return false;
      if (!s.bomba) {
        s.bomba = { c: c.c, r: c.r, t: H.BOMBA_TICKS };
        this.sinGasto = true;
        this.efecto('bomba_planta', c.c * T + T / 2, c.r * T + T / 2, 24);
        sonDe(G, idx, 'playShout'); return true;
      }
      var b = s.bomba, blancos = this.ghostsEn(G, b.c, b.r, H.BOMBA_RADIO);
      s.bomba = null;
      if (this.manda(G)) for (var i = 0; i < blancos.length; i++)
        this.matarCatalogo(G, blancos[i], idx, H.BOMBA_PUNTOS, 'bomba', 1, true);
      /* y al REY FANTASMA si le pilla en el radio (22 sep 2026): plantarla y
       * esperar a que pase por encima es exactamente la jugada de la bomba */
      var JB = this.manda(G) && this.rey(G);
      if (JB && JB.cercaDe(G, b.c * T + T / 2, b.r * T + T / 2, H.BOMBA_RADIO)) {
        JB.danar(G, CFG.JEFE.DANO.bomba, idx, 'bomba');
      }
      this.efecto('bomba', b.c * T + T / 2, b.r * T + T / 2, 24);
      sonDe(G, idx, 'playShout'); return true;
    },

    sombra: function (G, idx) { var s = this.estado(idx), p = G.pacs[idx]; if (!s || !p) return false; s.sombra = H.SOMBRA_TICKS; s.sombraGolpe = false; this.efecto('sombra', p.x, p.y, 30); sonDe(G, idx, 'playStealth'); return true; },
    frenesi: function (G, idx) { var s = this.estado(idx), p = G.pacs[idx]; if (!s || !p) return false; s.frenesi = H.FRENESI_TICKS; s.frenesiMult = 1; this.efecto('frenesi', p.x, p.y, 30); sonDe(G, idx, 'playTurbo'); return true; },
    carrona: function (G, idx) { var s = this.estado(idx), p = G.pacs[idx]; if (!s || !p) return false; s.carrona = H.CARROÑA_TICKS; this.efecto('carrona', p.x, p.y, 30); sonDe(G, idx, 'playExtraLife'); return true; },
    marca: function (G, idx) {
      var g = this.ghostCercano(G, idx, 8), s = this.estado(idx);
      if (!g || !s) return false;
      this.marcaGhost[g.id] = idx; s.marca = H.MARCA_TICKS;
      this.efecto('marca', g.x, g.y, 30, G.pacs[idx].x, G.pacs[idx].y);
      sonDe(G, idx, 'playShout'); return true;
    },
    ganchoInverso: function (G, idx, d) {
      var p = G.pacs[idx], s = this.estado(idx);
      var dir = (d && d.d >= 0 && d.d <= 3) ? d.d : this.dirFlash(p), v = CFG.DIR_V[dir];
      if (!p || !s || !v) return false;
      this.proyectilesCat.push({ tipo: 'gancho_inverso', x: p.x, y: p.y,
        ox: p.x, oy: p.y, d: dir, w: idx, fase: 'sale', viaja: 0,
        max: H.GANCHO_INVERSO_TILES * T, objetivo: -1 });
      s.ganchoInv = 1;
      this.efecto('gancho_salida', p.x, p.y, 22);
      sonDe(G, idx, 'playCharge'); return true;
    },
    caceria: function (G, idx) {
      var s = this.estado(idx); if (!s) return false;
      s.caceria = H.CACERIA_TICKS;
      for (var i = 0; i < 4; i++) if (this.enLaCalle(G.ghosts[i])) {
        this.caceriaQuien[i] = idx;
        this.efecto('caceria', G.ghosts[i].x, G.ghosts[i].y, 30);
      }
      sonDe(G, idx, 'playShout'); return true;
    },
    misil: function (G, idx) {
      var p = G.pacs[idx], blancos = [];
      if (!p) return false;
      for (var i = 0; i < 4; i++) if (this.enLaCalle(G.ghosts[i])) blancos.push(G.ghosts[i]);
      blancos.sort(function (a, b) { return this.distancia(p.x, p.y, a.x, a.y) - this.distancia(p.x, p.y, b.x, b.y); }.bind(this));
      /* SIN FANTASMAS, A POR EL REY (22 sep 2026). En un nivel de jefe los
       * cuatro están encerrados en casa hasta que él los invoca: sin esto,
       * la R del Asesino no salía siquiera. Sale con la cola vacía y el
       * blanco puesto en el rey (ver pasoProyectilesCat). */
      if (!blancos.length) {
        if (!this.rey(G)) return false;
        this.proyectilesCat.push({ tipo: 'misil', x: p.x, y: p.y, w: idx,
          objetivo: -1, cola: [], golpe: 0, jefe: 1 });
        this.efecto('misil_salida', p.x, p.y, 26);
        sonDe(G, idx, 'playFlash'); return true;
      }
      this.proyectilesCat.push({ tipo: 'misil', x: p.x, y: p.y, w: idx,
        objetivo: blancos[0].id, cola: blancos.slice(1).map(function (g) { return g.id; }), golpe: 0 });
      this.efecto('misil_salida', p.x, p.y, 26);
      sonDe(G, idx, 'playFlash'); return true;
    },
    /* R — EJECUCIÓN: mata de golpe al fantasma más cercano por 5.000 puntos.
     *
     * CONTRA EL REY NO MATA DE GOLPE (22 sep 2026), le quita el bocado más
     * grande de la tabla (ver CFG.JEFE.DANO). El motivo está escrito allí:
     * la barra del rey ES la condición para acabar el nivel, y una R que se
     * la salte entera convierte el nivel de jefe en pulsar una tecla. Y
     * tampoco da los 5.000: esos son por comerse un fantasma, y al rey no se
     * lo come nadie —lo suyo se cobra entero al tumbarlo (JEFE.PREMIO).
     *
     * El fantasma manda sobre el rey si los dos están a tiro: eso ya lo
     * decide ghostCercano, y quitarle un fantasma de encima al equipo vale
     * más que diez de vida. */
    ejecucion: function (G, idx) {
      var g = this.ghostCercano(G, idx, 10), p = G.pacs[idx];
      if (!g) {
        var JE = this.rey(G);
        if (!JE || !p || !JE.cercaDe(G, p.x, p.y, 10)) return false;
        if (this.manda(G)) JE.danar(G, CFG.JEFE.DANO.ejecucion, idx, 'ejecucion');
        this.efecto('ejecucion', G.jefe.x, G.jefe.y, 36, p.x, p.y);
        sonDe(G, idx, 'playShout'); return true;
      }
      if (this.manda(G)) this.matarCatalogo(G, g, idx, H.EJECUCION_PUNTOS, 'ejecucion', 1, true);
      this.efecto('ejecucion', g.x, g.y, 36, G.pacs[idx].x, G.pacs[idx].y);
      sonDe(G, idx, 'playShout'); return true;
    },

    /* Q — EMPUJÓN: aparta al fantasma de la línea, y desde el 21 sep TAMBIÉN
     * AL DE ATRÁS. Antes solo miraba las tres casillas de delante, así que
     * al que te alcanzaba por la espalda —que es justo cuando hace falta— la
     * Q no le hacía nada. Ahora se mira primero delante (sigue siendo la
     * jugada principal) y, si ahí no hay nadie, detrás.
     *
     * Y se empuja SIEMPRE ALEJÁNDOLO del Tanque, no por donde venía el
     * fantasma: si el empuje siguiera su rumbo, al que se acerca de frente lo
     * mandaría encima. */
    empujon: function (G, idx, d) {
      var p = G.pacs[idx]; if (!p) return false;
      var dir = (d && d.d >= 0 && d.d <= 3) ? d.d : this.dirFlash(p);
      var g = this.ghostEnLinea(G, idx, H.EMPUJON_TILES, { d: dir }), hacia = dir;
      if (!g) {
        hacia = CFG.OPP[dir];
        g = this.ghostEnLinea(G, idx, H.EMPUJON_TILES, { d: hacia });
      }
      /* EL REY FANTASMA (22 sep 2026): NO SE EMPUJA —pesa lo que pesa y
       * moverlo de casilla sería una Q que lo saca de encima gratis cada
       * dieciocho segundos— pero SÍ SE APAGA. Medio segundo, un tercio de lo
       * que dura en un fantasma: lo justo para salir de debajo, que es para
       * lo que está la Q del Tanque. Se mira después del fantasma: si hay
       * uno en la línea, manda el fantasma. */
      if (!g) {
        var JE = this.rey(G);
        var haciaRey = JE && JE.enLinea(G, idx, H.EMPUJON_TILES, dir) ? dir
          : (JE && JE.enLinea(G, idx, H.EMPUJON_TILES, CFG.OPP[dir]) ? CFG.OPP[dir] : -1);
        if (JE && haciaRey >= 0) {
          JE.congelar(G, CFG.JEFE.ATURDE.empujon);
          this.efecto('empujon', G.jefe.x, G.jefe.y, 24, p.x, p.y);
          sonDe(G, idx, 'playCharge'); return true;
        }
      }
      if (!g) return false;
      this.aturdido[g.id] = H.EMPUJON_STUN;
      if (this.manda(G)) this.empujarHacia(G, g, hacia, H.EMPUJON_TILES);
      this.efecto('empujon', g.x, g.y, 24, p.x, p.y);
      sonDe(G, idx, 'playCharge'); return true;
    },

    /* Empuja a un fantasma `casillas` en la dirección `dir`, parando en la
     * primera pared (nunca acaba dentro del muro) y dándole la vuelta, que si
     * no vuelve a meterse encima en dos pasos. */
    empujarHacia: function (G, g, dir, casillas) {
      var v = CFG.DIR_V[dir];
      if (!g || !v || !casillas || g.mode !== 'normal') return false;
      var cx = g.tileX(), cy = g.tileY(), movido = 0;
      for (var n = 0; n < casillas; n++) {
        var nx = CFG.wrapCol(cx + v.x), ny = cy + v.y;
        if (ny < 0 || ny >= CFG.ROWS) break;
        if (!CFG.isOpen(nx, ny)) break;
        cx = nx; cy = ny; movido++;
      }
      if (!movido) return false;
      g.x = cx * T + T / 2; g.y = cy * T + T / 2;
      g.forceReverse();
      this.efecto('aplasta', g.x, g.y, 16);
      return true;
    },

    /* E — GRITO DE GUERRA: clava a los CUATRO fantasmas del mapa 2,5 s (21
     * sep). Era una Q de cinco casillas a la redonda, que en la práctica
     * pillaba a uno. Ahora alcanza a todo el que esté en la calle: con el
     * aturdimiento apagándolos (ver inerte), es la jugada con la que el
     * Tanque para una partida entera, y por eso la recarga subió a 40 s. */
    gritoGuerra: function (G, idx) {
      var p = G.pacs[idx]; if (!p) return false;
      /* El rugido se pinta UNA vez y desde el Tanque (22 sep). Antes salía
       * un trazo quebrado del Tanque a cada fantasma y eran cuatro rayos
       * rojos: parecía electricidad, no un grito. Ahora es una onda que se
       * expande por el mapa entero —que es justo hasta dónde llega el
       * poder— y cada fantasma clavado se sacude en su sitio. */
      this.efecto('grito_guerra', p.x, p.y, 34);
      for (var i = 0; i < 4; i++) if (this.enLaCalle(G.ghosts[i])) {
        this.aturdido[i] = H.GRITO_GUERRA_TICKS;
        this.efecto('grito_sacudida', G.ghosts[i].x, G.ghosts[i].y, 16);
      }
      /* Y AL REY FANTASMA (22 sep 2026), pero un segundo en vez de dos y
       * medio. La onda llega a todo el mapa, así que contra el jefe esta es
       * la única habilidad que ni hay que apuntar: por eso se le apaga menos
       * que a un fantasma (ver CFG.JEFE.ATURDE). */
      var JG = this.rey(G);
      if (JG) {
        JG.congelar(G, CFG.JEFE.ATURDE.grito_guerra);
        this.efecto('grito_sacudida', G.jefe.x, G.jefe.y, 16);
      }
      sonDe(G, idx, 'playShout'); return true;
    },
    yunque: function (G, idx) { var s = this.estado(idx), p = G.pacs[idx]; if (!s || !p) return false; s.yunque = H.YUNQUE_TICKS; s.yunqueX = p.x; s.yunqueY = p.y; this.efecto('yunque', p.x, p.y, 26); sonDe(G, idx, 'playStealth'); return true; },
    pielPiedra: function (G, idx) { var s = this.estado(idx), p = G.pacs[idx]; if (!s || !p) return false; s.pielPiedra = H.PIEL_PIEDRA_TICKS; this.efecto('piel_piedra', p.x, p.y, 28); sonDe(G, idx, 'playStealth'); return true; },
    rebote: function (G, idx) { var s = this.estado(idx), p = G.pacs[idx]; if (!s || !p) return false; s.rebote = H.REBOTE_TICKS; this.efecto('rebote', p.x, p.y, 28); sonDe(G, idx, 'playCharge'); return true; },
    terremoto: function (G, idx) {
      var s = this.estado(idx); if (!s) return false;
      this.terremotoTicks = H.TERREMOTO_TICKS; s.terremoto = H.TERREMOTO_TICKS;
      /* EL REY FANTASMA NO SE VA A CASA (22 sep 2026): no tiene casa a la
       * que volver. La sacudida le quita vida, y de las gordas —es una R de
       * setenta segundos que además ralentiza al propio equipo. */
      var JT = this.manda(G) && this.rey(G);
      if (JT) {
        JT.danar(G, CFG.JEFE.DANO.terremoto, idx, 'terremoto');
        this.efecto('terremoto', G.jefe.x, G.jefe.y, 30);
      }
      if (this.manda(G)) for (var i = 0; i < 4; i++) if (this.enLaCalle(G.ghosts[i])) {
        var g = G.ghosts[i];
        this.matarCatalogo(G, g, idx, H.TERREMOTO_PUNTOS, 'terremoto', 1, true);
      }
      if (G.pacs[idx]) this.efecto('terremoto_onda', G.pacs[idx].x, G.pacs[idx].y, 50);
      /* Y SE MUEVE EL MAPA. Antes el poder se veía como un parón: los cuatro
       * fantasmas a casa de golpe encadenaban cuatro parones de comer y el
       * juego parecía colgado un momento, no sacudido. */
      this.temblar(TERREMOTO_TEMBLOR, TERREMOTO_SACUDIDA);
      sonDe(G, idx, 'playShout'); return true;
    },
    fortaleza: function (G, idx) { var s = this.estado(idx), p = G.pacs[idx]; if (!s || !p) return false; s.fortaleza = H.FORTALEZA_TICKS; this.efecto('fortaleza', p.x, p.y, 36); sonDe(G, idx, 'playStealth'); return true; },

    mina: function (G, idx, d) { var s = this.estado(idx), c = this.casillaDe(G, idx, d); if (!s || !c) return false; s.mina = { c: c.c, r: c.r, t: H.MINA_TICKS }; this.efecto('mina', c.c * T + T / 2, c.r * T + T / 2, 22); sonDe(G, idx, 'playBiteMiss'); return true; },
    /* Q — GANCHO: el garfio del Asesino del revés (21 sep). Antes no había
     * gancho: se pintaba una línea y el fantasma que hubiera en ella se
     * ponía azul, sin que saliera ni viajara nada. Ahora sale el garfio por
     * el pasillo y, si engancha, ARRASTRA al fantasma hasta el Soporte, que
     * lo recibe azul. Si no engancha, vuelve de vacío y se gasta igual. */
    gancho: function (G, idx, d) {
      var p = G.pacs[idx], s = this.estado(idx);
      var dir = (d && d.d >= 0 && d.d <= 3) ? d.d : this.dirFlash(p), v = CFG.DIR_V[dir];
      if (!p || !s || !v) return false;
      this.proyectilesCat.push({ tipo: 'gancho', x: p.x, y: p.y, ox: p.x, oy: p.y,
        d: dir, w: idx, fase: 'sale', viaja: 0, max: H.GANCHO_TILES * T,
        objetivo: -1, trae: 0 });
      s.ganchoOut = 1;
      this.efecto('gancho_salida', p.x, p.y, 22);
      sonDe(G, idx, 'playCharge'); return true;
    },
    telarana: function (G, idx, d) { var s = this.estado(idx), c = this.casillaDe(G, idx, d); if (!s || !c) return false; s.telarana = { c: c.c, r: c.r, t: H.TELARANA_TICKS }; this.efecto('telarana', c.c * T + T / 2, c.r * T + T / 2, 24); sonDe(G, idx, 'playBiteMiss'); return true; },
    estela: function (G, idx) { var s = this.estado(idx), p = G.pacs[idx]; if (!s || !p) return false; s.estela = H.ESTELA_TICKS; s.estelaRastro = []; this.efecto('estela', p.x, p.y, 24); sonDe(G, idx, 'playTurbo'); return true; },
    /* W — PUENTE: perfora el MURO que el Soporte tiene delante y deja un paso
     * hasta el pasillo del otro lado. Es lo que dice su nombre: se cruza el
     * bloque, no se atraviesan todas las paredes del mapa. Si delante hay
     * pasillo (no hay nada que abrir), si el muro es más grueso que
     * PUENTE_TILES o si al otro lado está la casa de los fantasmas, no sale y
     * no se gasta la habilidad. */
    puente: function (G, idx, d) {
      var s = this.estado(idx), p = G.pacs[idx];
      if (!s || !p) return false;
      var dir = (d && d.d >= 0 && d.d <= 3) ? d.d : this.dirFlash(p), v = CFG.DIR_V[dir];
      if (!v) return false;
      /* El rumbo es el que mandó quien pulsó (como el MURO); la posición
       * buena es la de esta pantalla. */
      var c0 = p.tileX(), r0 = p.tileY(), paso = [];
      for (var n = 1; n <= H.PUENTE_TILES + 1; n++) {
        var nc = CFG.wrapCol(c0 + v.x * n), nr = r0 + v.y * n;
        if (nr < 0 || nr >= CFG.ROWS || esCasa(nc, nr)) return false;
        if (CFG.isOpen(nc, nr, false)) {
          if (!paso.length) return false;            // delante no había muro
          s.puente = { cs: paso, t: H.PUENTE_TICKS,
            de: { c: c0, r: r0 }, a: { c: nc, r: nr } };
          this.efecto('puente', paso[0].c * T + T / 2, paso[0].r * T + T / 2, 30,
            nc * T + T / 2, nr * T + T / 2);
          sonDe(G, idx, 'playFlash'); return true;
        }
        if (paso.length >= H.PUENTE_TILES) return false;   // muro demasiado grueso
        paso.push({ c: nc, r: nr });
      }
      return false;
    },

    /* Se cierra el paso: el que se quedara dentro del muro sale al pasillo
     * más a mano —la boca por la que entró o la de enfrente—. Sin esto queda
     * plantado dentro de la pared, sin salida a ningún lado. */
    cerrarPuente: function (G, pu) {
      if (!pu || !pu.cs || !G || !G.pacs) return;
      for (var i = 0; i < G.pacs.length; i++) {
        var p = G.pacs[i];
        if (!p || p.out || !this.vivo(G, i)) continue;
        var dentro = false, k;
        for (k = 0; k < pu.cs.length; k++) {
          if (p.tileX() === pu.cs[k].c && p.tileY() === pu.cs[k].r) { dentro = true; break; }
        }
        if (!dentro) continue;
        if (G.isLocalAuth && !G.isLocalAuth(i) && !this.manda(G)) continue;
        /* la boca más cercana de las dos, y si fallaran, cualquier vecina */
        var bocas = [pu.a, pu.de], salida = null, mejor = 1e9;
        for (k = 0; k < bocas.length; k++) {
          var b = bocas[k];
          if (!b || !CFG.isOpen(b.c, b.r, false)) continue;
          var dis = this.distancia(p.x, p.y, b.c * T + T / 2, b.r * T + T / 2);
          if (dis < mejor) { mejor = dis; salida = { c: b.c, r: b.r }; }
        }
        for (var dd = 0; dd < 4 && !salida; dd++) {
          var v2 = CFG.DIR_V[dd];
          var vc = CFG.wrapCol(p.tileX() + v2.x), vr = p.tileY() + v2.y;
          if (vr < 0 || vr >= CFG.ROWS || !CFG.isOpen(vc, vr, false) || esCasa(vc, vr)) continue;
          salida = { c: vc, r: vr };
        }
        if (!salida) continue;
        p.x = salida.c * T + T / 2; p.y = salida.r * T + T / 2;
        this.efecto('puente_cierra', p.x, p.y, 20);
      }
    },
    cadena: function (G, idx) { var s = this.estado(idx), j = this.aliadoDe(G, idx); if (!s || j < 0) return false; s.cadena = H.CADENA_TICKS; s.cadenaCon = j; this.efecto('cadena', G.pacs[j].x, G.pacs[j].y, 28, G.pacs[idx].x, G.pacs[idx].y); sonDe(G, idx, 'playStealth'); return true; },
    muro: function (G, idx, d) {
      var s = this.estado(idx), p = G.pacs[idx], dir = (d && d.d >= 0 && d.d <= 3) ? d.d : this.dirFlash(p);
      if (!s || !p) return false;
      var v = CFG.DIR_V[(dir + 2) % 4], c = CFG.wrapCol(p.tileX() + v.x), r = p.tileY() + v.y;
      if (r < 0 || r >= CFG.ROWS || !CFG.isOpen(c, r, false)) return false;
      s.muro = { c: c, r: r, t: H.MURO_TICKS };
      this.efecto('muro', c * T + T / 2, r * T + T / 2, 24); sonDe(G, idx, 'playCharge'); return true;
    },
    relevo: function (G, idx) {
      var p = G.pacs[idx], j = this.aliadoDe(G, idx); if (!p || j < 0 || this.distancia(p.x, p.y, G.pacs[j].x, G.pacs[j].y) > 6 * T) return false;
      var ox = G.pacs[j].x, oy = G.pacs[j].y;
      if (G.isLocalAuth(j) || this.manda(G)) { G.pacs[j].x = p.x; G.pacs[j].y = p.y; G.pacs[j].dir = p.dir; G.pacs[j].nextDir = p.dir; }
      this.efecto('relevo', p.x, p.y, 30, ox, oy);
      sonDe(G, idx, 'playFlash'); return true;
    },
    faro: function (G, idx, d) { var s = this.estado(idx), c = this.casillaDe(G, idx, d); if (!s || !c) return false; s.faro = { c: c.c, r: c.r, t: H.FARO_TICKS }; this.efecto('faro', c.c * T + T / 2, c.r * T + T / 2, 28); sonDe(G, idx, 'playShout'); return true; },
    sirena: function (G, idx, d) { var s = this.estado(idx), c = this.casillaAdelante(G, idx, 6, d) || this.casillaDe(G, idx, d); if (!s || !c) return false; s.sirena = { c: c.c, r: c.r, t: H.FARO_TICKS }; this.efecto('sirena', c.c * T + T / 2, c.r * T + T / 2, 28); sonDe(G, idx, 'playShout'); return true; },
    campo: function (G, idx) { var s = this.estado(idx), p = G.pacs[idx]; if (!s || !p) return false; s.campo = H.CAMPO_TICKS; this.efecto('campo', p.x, p.y, 34); sonDe(G, idx, 'playStealth'); return true; },
    resurreccion: function (G, idx) {
      var target = -1, i;
      for (i = 0; i < G.pacs.length; i++) if (i !== idx && G.pacs[i] && G.pacs[i].out) { target = i; break; }
      if (target < 0) return false;
      if (this.manda(G)) {
        if (!G.cuerpos[target]) G.cuerpos[target] = { x: G.pacs[target].x, y: G.pacs[target].y,
          d: G.pacs[target].dir, t: 1, n: 0, en: {}, quien: {} };
        G.cuerpos[target].quien[idx] = 1;
        G.revivirCuerpo(target);
      }
      this.efecto('resurreccion', G.pacs[target].x, G.pacs[target].y, 48);
      sonDe(G, idx, 'playExtraLife'); return true;
    },
    hospital: function (G, idx) { var s = this.estado(idx), p = G.pacs[idx]; if (!s || !p) return false; s.hospital = H.HOSPITAL_TICKS; this.efecto('hospital', p.x, p.y, 36); sonDe(G, idx, 'playExtraLife'); return true; },

    bolaGuiada: function (G, idx) {
      /* GUIADA no depende de que el fantasma esté alineado ni a una distancia
       * concreta: si queda alguno en la calle, el proyectil encuentra al más
       * cercano. Por eso la habilidad no falla por puntería. */
      var p = G.pacs[idx], g = this.ghostCercano(G, idx, 999);
      if (!p) return false;
      if (g) this.proyectilesCat.push({ tipo: 'guiada', x: p.x, y: p.y, w: idx, objetivo: g.id });
      /* Y SI NO QUEDA NINGUNO, AL REY (22 sep 2026). En un nivel de jefe los
       * cuatro empiezan encerrados, así que la Q del Mago salía sin bola y
       * "la que no falla" no llegaba a salir nunca. */
      else if (this.rey(G)) this.proyectilesCat.push({ tipo: 'guiada', x: p.x, y: p.y, w: idx, objetivo: -1, jefe: 1 });
      this.efecto('guiada_salida', p.x, p.y, 24);
      sonDe(G, idx, 'playFlash'); return true;
    },
    /* TOQUE ARCANO: EL AZUL SE CONTAGIA (22 sep 2026)
     *
     * Hasta hoy esto era poner azul a un fantasma cercano y ya: el MORDISCO
     * del Asesino con otro nombre, indistinguible al jugarlo. Ahora el que
     * recibe el toque LO PEGA: cualquier fantasma con el que se cruce se
     * vuelve azul también. Es lo más de Mago del catálogo —no mata, altera
     * el tablero— y en party es una bola de nieve para el equipo, porque el
     * azul del catálogo se lo puede comer cualquiera, no solo quien lo puso.
     *
     * El freno está en la herencia: el contagiado recibe LO QUE LE QUEDE al
     * que se lo pegó, nunca más, así que cada salto sale del mismo reloj y
     * la cadena se apaga sola. Ver pasoContagioArcano. */
    toqueArcano: function (G, idx) {
      var g = this.ghostCercano(G, idx, 3);
      /* EL REY FANTASMA NO SE VUELVE AZUL (22 sep 2026), porque el azul solo
       * sirve para comérselo y a él no se lo come nadie: volverlo azul sería
       * una Q que no hace absolutamente nada. Así que el toque le entra como
       * lo que es —un toque— y le hace un rasguño: 1 de vida. Poco a
       * propósito; la Q del Mago contra el jefe es la BOLA, no esta. */
      if (!g) {
        var JA = this.rey(G), pa = G.pacs[idx];
        if (!JA || !pa || !JA.cercaDe(G, pa.x, pa.y, 3)) return false;
        if (this.manda(G)) JA.danar(G, CFG.JEFE.DANO.arcano, idx, 'arcano');
        this.efecto('arcano', G.jefe.x, G.jefe.y, 28, pa.x, pa.y);
        sonDe(G, idx, 'playBiteMiss'); return true;
      }
      this.azulCatalogo[g.id] = idx + 1;
      this.azulCatTicks[g.id] = H.TOQUE_ARCANO_TICKS;
      this.arcanoAzul[g.id] = 1;                 // este azul se pega
      this.efecto('arcano', g.x, g.y, 28, G.pacs[idx].x, G.pacs[idx].y);
      sonDe(G, idx, 'playBiteMiss'); return true;
    },

    /* El salto del azul del TOQUE ARCANO, una vez por tick.
     *
     * Reglas, todas pensadas para que no se descontrole:
     *  - salta cuando se CRUZAN de verdad, a una casilla escasa, como los
     *    demás choques del archivo; no por estar en la misma zona;
     *  - el contagiado hereda el tiempo que le queda al otro y su dueño
     *    (quien cobra los puntos), nunca más tiempo del que había;
     *  - al que ya está azul no se le renueva el reloj, que sería azul
     *    infinito entre dos fantasmas dándose la vuelta;
     *  - los ojos, los de casa y los que están saliendo no cuentan.
     * Y el contagiado no vuelve a pegarlo hasta el tick siguiente (por eso
     * la lista de portadores se hace antes): así una cadena de cuatro tarda
     * cuatro ticks y se ve, en vez de encenderse el mapa de golpe.
     *
     * Esto lo resuelve SOLO el anfitrión; las demás pantallas reciben
     * azulCatalogo y azulCatTicks en la foto y no deciden nada. */
    pasoContagioArcano: function (G) {
      var portadores = [], i, j, k;
      for (i = 0; i < 4; i++) {
        if (this.arcanoAzul[i] && this.azulCatTicks[i] > 0 && this.enLaCalle(G.ghosts[i])) portadores.push(i);
      }
      if (!portadores.length) return;
      for (k = 0; k < portadores.length; k++) {
        i = portadores[k];
        var a = G.ghosts[i];
        for (j = 0; j < 4; j++) {
          if (j === i) continue;
          var b = G.ghosts[j];
          if (!this.enLaCalle(b)) continue;
          if (this.azulCatTicks[j] > 0) continue;
          if (this.distancia(a.x, a.y, b.x, b.y) > T) continue;
          this.azulCatTicks[j] = this.azulCatTicks[i];
          this.azulCatalogo[j] = this.azulCatalogo[i];
          this.arcanoAzul[j] = 1;
          /* que se VEA de dónde vino: el hilo morado entre los dos */
          this.efecto('arcano_contagio', b.x, b.y, 20, a.x, a.y);
        }
      }
    },
    chispa: function (G, idx) {
      var p = G.pacs[idx], primero = this.ghostCercano(G, idx, 3), usados = {}, actual = primero;
      if (!p) return false;
      /* EL REY FANTASMA se lleva su chispazo aparte (22 sep 2026): no está
       * en la cadena de fantasma a fantasma —no es uno de los cuatro— pero
       * si el Mago lo tiene a tiro se le apaga un segundo, un tercio de los
       * tres que dura en un fantasma. Y la Q sale aunque él sea el único
       * blanco: es lo normal en un nivel de jefe. */
      var JC = this.rey(G), tocaRey = JC && JC.cercaDe(G, p.x, p.y, 3);
      if (tocaRey) {
        JC.congelar(G, CFG.JEFE.ATURDE.chispa);
        this.efecto('chispa', G.jefe.x, G.jefe.y, 24, p.x, p.y);
      }
      if (!primero) {
        if (!tocaRey) return false;
        sonDe(G, idx, 'playCharge'); return true;
      }
      var ox = p.x, oy = p.y;
      while (actual) {
        usados[actual.id] = 1; this.aturdido[actual.id] = H.CHISPA_TICKS;
        this.efecto('chispa', actual.x, actual.y, 24, ox, oy); ox = actual.x; oy = actual.y;
        var sig = null, sd = Infinity;
        for (var i = 0; i < 4; i++) {
          var g = G.ghosts[i]; if (!this.enLaCalle(g) || usados[g.id]) continue;
          var dd = this.distancia(actual.x, actual.y, g.x, g.y);
          if (dd <= 3 * T && dd < sd) { sd = dd; sig = g; }
        }
        actual = sig;
      }
      sonDe(G, idx, 'playCharge'); return true;
    },
    clon: function (G, idx, d) {
      var s = this.estado(idx), p = G.pacs[idx], dir = (d && d.d >= 0 && d.d <= 3) ? d.d : this.dirFlash(p);
      if (!s || !p || !this.libreDelante(p.tileX(), p.tileY(), dir)) return false;
      s.clon = { c: p.tileX(), r: p.tileY(), x: p.x, y: p.y, d: dir, t: H.CLON_TICKS };
      this.efecto('clon', p.x, p.y, 28); sonDe(G, idx, 'playStealth'); return true;
    },
    totem: function (G, idx, d) { var s = this.estado(idx), c = this.casillaDe(G, idx, d); if (!s || !c) return false; s.totem = { c: c.c, r: c.r, t: H.TOTEM_TICKS, cd: 0 }; this.efecto('totem', c.c * T + T / 2, c.r * T + T / 2, 28); sonDe(G, idx, 'playShout'); return true; },
    /* E — GRAVEDAD: los junta para rematarlos (21 sep). Antes teletransportaba
     * de golpe a tres casillas y aturdía un segundo: como el salto era
     * instantáneo y un aturdido no se veía, parecía que no pasaba nada. Ahora
     * el tirón DURA medio segundo y se ve venir a los fantasmas por el
     * pasillo, llega a cuatro casillas y los deja apagados dos segundos. */
    gravedad: function (G, idx) {
      var p = G.pacs[idx], blancos; if (!p) return false;
      /* AL REY NO SE LE ARRASTRA (22 sep 2026). Tirar de él hacia el Mago
       * sería además la peor idea posible —te lo traes encima—, así que de
       * la GRAVEDAD se queda con la mitad que sí tiene sentido: se le apaga
       * tres cuartos de segundo, un tercio de los dos que dura en un
       * fantasma. */
      var JV = this.rey(G);
      if (JV && JV.cercaDe(G, p.x, p.y, H.GRAVEDAD_RADIO)) {
        JV.congelar(G, CFG.JEFE.ATURDE.gravedad);
        this.efecto('gravedad', p.x, p.y, 28, G.jefe.x, G.jefe.y);
      }
      blancos = this.ghostsEn(G, p.tileX(), p.tileY(), H.GRAVEDAD_RADIO);
      for (var i = 0; i < blancos.length; i++) {
        var g = blancos[i];
        this.aturdido[g.id] = H.GRAVEDAD_TICKS;
        if (this.manda(G)) {
          /* cada uno viene a la velocidad que le toca para llegar a la vez */
          var ruta = this.rutaLaberinto(g.tileX(), g.tileY(), p.tileX(), p.tileY());
          var pasos = (ruta && ruta.length) ? ruta.length : 1;
          this.tirones.push({ gid: g.id, c: p.tileX(), r: p.tileY(), t: H.GRAVEDAD_TIRON,
            vel: Math.max(0.5, pasos * T / H.GRAVEDAD_TIRON) });
        }
        this.efecto('gravedad', p.x, p.y, 28, g.x, g.y);
      }
      this.efecto('gravedad_centro', p.x, p.y, 32); sonDe(G, idx, 'playCharge'); return true;
    },
    /* E — DOMINIO (22 sep 2026). Sustituye a NIEBLA, que plantaba una zona
     * donde el fantasma que entraba caminaba al azar: no se distinguía de un
     * fantasma persiguiéndote mal, no se planeaba nada con ella y el Mago ya
     * tiene ceguera para los cuatro en su R (ECLIPSE).
     *
     * Ahora el Mago TOCA al fantasma más cercano y durante seis segundos ese
     * fantasma es suyo: persigue a los otros tres (ver objetivo) y al
     * alcanzarlos los manda a casa cobrando 200 por cabeza (ver pasoRoles).
     * Mientras dura no muerde a nadie del equipo (ver apagado) y al acabarse
     * vuelve aturdido un segundo (DOMINIO_RESACA), para que no mate al Mago
     * en el acto por haber estado pegado a él. */
    dominio: function (G, idx) {
      var p = G.pacs[idx], g = this.ghostCercano(G, idx, H.DOMINIO_TILES);
      if (!p || !g) return false;
      this.dominado[g.id] = H.DOMINIO_TICKS;
      this.dominaQuien[g.id] = idx;
      /* Se le quita lo que le contara otra historia: el azul del catálogo
       * (nadie se come a un fantasma que está cazando por ti) y el
       * aturdimiento con el que pudiera venir de una CHISPA o una GRAVEDAD,
       * que si no arrancaría el dominio sin poder moverse. */
      this.azulCatalogo[g.id] = 0; this.azulCatTicks[g.id] = 0; this.arcanoAzul[g.id] = 0;
      this.aturdido[g.id] = 0;
      this.efecto('dominio', g.x, g.y, 30, p.x, p.y);
      sonDe(G, idx, 'playShout'); return true;
    },
    /* EL METEORO CAE. Tres formas de llegar aquí, por orden de lo que pasa
     * casi siempre:
     *   1) el jugador venía APUNTANDO (la R mantenida) y la retícula ya está
     *      donde él quiere: cae ahí;
     *   2) llega por la red la casilla que eligió un invitado en su pantalla,
     *      y el anfitrión la mira antes de plantarla;
     *   3) sin nada de eso sigue valiendo lo de siempre: seis casillas al
     *      frente. Son seis y no las ocho del alcance a posta — es el camino
     *      por el que pasan las repeticiones de antes del 22 sep, y tienen
     *      que volver a caer exactamente donde cayeron aquel día. */
    meteoro: function (G, idx, d) {
      var s = this.estado(idx), c = null;
      if (!s) return false;
      if (s.apunta) c = { c: s.apunta.c, r: s.apunta.r };
      else if (d && d.ac != null && this.meteoroValido(G, idx, d.ac | 0, d.ar | 0)) c = { c: CFG.wrapCol(d.ac | 0), r: d.ar | 0 };
      if (!c) c = this.casillaAdelante(G, idx, 6, d && d.d);
      if (!c) return false;
      s.apunta = null;
      s.meteoro = { c: c.c, r: c.r, t: H.METEORO_AVISO };
      s.fuegoMeteoro = null;
      this.efecto('meteoro_aviso', c.c * T + T / 2, c.r * T + T / 2, 30);
      sonDe(G, idx, 'playShout');
      return true;
    },

    /* El anfitrión no se cree la casilla de un invitado sin mirarla: tiene
     * que ser pisable (ni muro, ni casa de fantasmas) y estar a tiro por los
     * pasillos, con la propina de METEORO_MARGEN_RED. */
    meteoroValido: function (G, idx, c, r) {
      var p = G.pacs[idx];
      if (!p || !aterrizable(CFG.wrapCol(c), r)) return false;
      var pasos = this.pasosApuntado(p.tileX(), p.tileY(), CFG.wrapCol(c), r);
      return pasos >= 0 && pasos <= H.METEORO_ALCANCE + H.METEORO_MARGEN_RED;
    },
    eclipse: function (G, idx) { var s = this.estado(idx), p = G.pacs[idx]; if (!s) return false; s.eclipse = H.ECLIPSE_TICKS; this.eclipseTicks = H.ECLIPSE_TICKS; for (var i = 0; i < 4; i++) this.ciego[i] = H.ECLIPSE_TICKS; if (p) this.efecto('eclipse', p.x, p.y, 40); sonDe(G, idx, 'playShout'); return true; },

    /* Se acabó el tiempo entre un shuriken y el siguiente: lo que quedaba de
     * ráfaga se pierde y la Q se va a recargar, aunque haya alguno todavía
     * en el aire (sin los tres tiros no hay pleno que valga). */
    cerrarRafagaShuriken: function (G, idx) {
      var s = this.estado(idx);
      if (!s || !s.shuriken) return;
      s.shuriken = null;
      var k = this.kDe(G, idx, 'shuriken');
      if (k >= 0) this.gastar(G, idx, k);
      var p = G.pacs[idx];
      if (p && this.vivo(G, idx)) {
        G.addPopup(p.x, p.y - 8, 'RÁFAGA PERDIDA', 30);
        this.efecto('shuriken_salida', p.x, p.y, 14);
      }
    },

    finShuriken: function (G, b, acerto) {
      var s = this.estado(b.w);
      if (!s || !s.shuriken || s.shuriken.id !== b.grupo) return;
      s.shuriken.resueltos++;
      if (acerto) s.shuriken.aciertos++;
      if (s.shuriken.usados === H.SHURIKEN_CANT &&
          s.shuriken.resueltos === H.SHURIKEN_CANT) {
        if (s.shuriken.aciertos === H.SHURIKEN_CANT) {
          var k = this.kDe(G, b.w, 'shuriken');
          if (k >= 0) s.cd[k] = 0;
          var p = G.pacs[b.w];
          if (p) { G.addPopup(p.x, p.y - 8, 'RECARGADO', 45); this.efecto('shuriken_recarga', p.x, p.y, 28); }
        }
        s.shuriken = null;
      }
    },

    terminarGanchoInverso: function (b) {
      var s = this.estado(b.w), queda = false;
      for (var i = 0; i < this.proyectilesCat.length; i++) {
        var o = this.proyectilesCat[i];
        if (o !== b && o.tipo === 'gancho_inverso' && o.w === b.w) { queda = true; break; }
      }
      if (s && !queda) s.ganchoInv = 0;
    },

    terminarGancho: function (b) {
      var s = this.estado(b.w), queda = false;
      for (var i = 0; i < this.proyectilesCat.length; i++) {
        var o = this.proyectilesCat[i];
        if (o !== b && o.tipo === 'gancho' && o.w === b.w) { queda = true; break; }
      }
      if (s && !queda) s.ganchoOut = 0;
    },

    /* Arrastra un fantasma UNA TAJADA de píxeles hacia (tc,tr) siguiendo los
     * pasillos: se va al siguiente paso de la ruta, recalculada cada
     * fotograma porque quien tira también se está moviendo. Es lo que usan el
     * GANCHO y la GRAVEDAD para que el tirón se VEA, en vez de teletransportar.
     * Solo lo llama quien manda: los fantasmas son del anfitrión. */
    tirarFantasma: function (G, g, tc, tr, vel) {
      if (!g || g.mode !== 'normal') return false;
      var ancho = CFG.COLS * T, gc = g.tileX(), gr = g.tileY(), destino;
      if (gc === tc && gr === tr) destino = { x: CFG.wrapCol(tc) * T + T / 2, y: tr * T + T / 2 };
      else {
        var ruta = this.rutaLaberinto(gc, gr, tc, tr);
        if (!ruta || !ruta.length) return false;
        destino = { x: ruta[0].c * T + T / 2, y: ruta[0].r * T + T / 2 };
      }
      var dx = destino.x - g.x;
      if (dx > ancho / 2) dx -= ancho; else if (dx < -ancho / 2) dx += ancho;
      var dy = destino.y - g.y, dis = Math.sqrt(dx * dx + dy * dy);
      if (dis <= vel) { g.x = destino.x; g.y = destino.y; }
      else { g.x += dx / dis * vel; g.y += dy / dis * vel; }
      if (g.x < 0) g.x += ancho; else if (g.x >= ancho) g.x -= ancho;
      g.clearPlan();
      return true;
    },

    /* Camino cardinal por casillas abiertas. El misil usa la misma topología
     * que jugadores y fantasmas, incluido el túnel, así que nunca corta una
     * esquina ni atraviesa una pared para llegar antes. */
    rutaLaberinto: function (fc, fr, tc, tr) {
      fc = CFG.wrapCol(fc); tc = CFG.wrapCol(tc);
      if (fr < 0 || tr < 0 || fr >= CFG.ROWS || tr >= CFG.ROWS) return null;
      if (fc === tc && fr === tr) return [];
      var prev = new Array(CFG.COLS * CFG.ROWS), cola = [];
      var inicio = fr * CFG.COLS + fc, fin = tr * CFG.COLS + tc, cabeza = 0;
      prev[inicio] = inicio; cola.push(inicio);
      while (cabeza < cola.length && prev[fin] == null) {
        var id = cola[cabeza++], c = id % CFG.COLS, r = Math.floor(id / CFG.COLS);
        for (var d = 0; d < 4; d++) {
          var v = CFG.DIR_V[d], nc = CFG.wrapCol(c + v.x), nr = r + v.y;
          if (nr < 0 || nr >= CFG.ROWS || !CFG.isOpen(nc, nr, false)) continue;
          var ni = nr * CFG.COLS + nc;
          if (prev[ni] != null) continue;
          prev[ni] = id; cola.push(ni);
        }
      }
      if (prev[fin] == null) return null;
      var ruta = [], paso = fin;
      while (paso !== inicio) {
        ruta.push({ c: paso % CFG.COLS, r: Math.floor(paso / CFG.COLS) });
        paso = prev[paso];
      }
      ruta.reverse(); return ruta;
    },

    /* A quién se lleva por delante el MISIL desde donde está ahora mismo.
     * Devuelve false cuando ya no le queda nadie a quien perseguir y hay que
     * apagarlo, que es lo que el misil ha hecho siempre al quedarse sin cola. */
    atropellaMisil: function (G, b) {
      var golpeo = false, j, g, k;
      for (j = 0; j < 4; j++) {
        g = G.ghosts[j];
        if (!this.enLaCalle(g)) continue;
        if (this.distancia(b.x, b.y, g.x, g.y) > T * 0.75) continue;
        this.matarCatalogo(G, g, b.w, CFG.GHOST_CHAIN[Math.min(b.golpe, 3)], 'misil');
        b.golpe++;
        golpeo = true;
        /* fuera de la cola: un mismo fantasma no se cobra dos veces */
        if (b.cola) { k = b.cola.indexOf(g.id); if (k >= 0) b.cola.splice(k, 1); }
        if (g.id === (b.objetivo | 0)) b.objetivo = -1;
      }
      if (!golpeo) return true;
      if (b.objetivo >= 0 && this.enLaCalle(G.ghosts[b.objetivo])) return true;
      /* se quedó sin blanco por el camino: pasa al siguiente de la cola que
       * siga en pie y vuelve a calcular la ruta desde donde esté */
      while (b.cola && b.cola.length && !this.enLaCalle(G.ghosts[b.cola[0]])) b.cola.shift();
      if (b.cola && b.cola.length) {
        b.objetivo = b.cola.shift(); b.ruta = null; b.rutaObjetivo = '';
        return true;
      }
      return false;
    },

    /* Proyectiles visibles del catálogo. Aquí se resuelven las tres cargas
     * de shuriken, la bola que no falla, el misil encadenado y los
     * disparos del tótem. El anfitrión decide los impactos; las demás
     * pantallas reciben las posiciones por la foto de red. */
    pasoProyectilesCat: function (G, manda) {
      var ancho = CFG.COLS * T;
      for (var i = this.proyectilesCat.length - 1; i >= 0; i--) {
        var b = this.proyectilesCat[i];
        if (b.espera > 0) { b.espera--; continue; }
        if (b.tipo === 'shuriken') {
          var v = CFG.DIR_V[b.d], nx = b.x + v.x * H.SHURIKEN_VEL, ny = b.y + v.y * H.SHURIKEN_VEL;
          if (nx < 0) nx += ancho; else if (nx >= ancho) nx -= ancho;
          var cc = Math.floor(nx / T), rr = Math.floor(ny / T);
          b.viaja += H.SHURIKEN_VEL;
          if (rr < 0 || rr >= CFG.ROWS || !CFG.isOpen(cc, rr, false) || b.viaja > b.max) {
            this.finShuriken(G, b, false); this.proyectilesCat.splice(i, 1); continue;
          }
          b.x = nx; b.y = ny;
          if (manda) {
            var tocado = null;
            for (var j = 0; j < 4; j++) {
              var sg = G.ghosts[j];
              if (this.enLaCalle(sg) && this.distancia(b.x, b.y, sg.x, sg.y) <= T * 0.75) { tocado = sg; break; }
            }
            if (tocado) {
              this.matarCatalogo(G, tocado, b.w, H.SHURIKEN_PUNTOS, 'shuriken', 1, true);
              this.finShuriken(G, b, true); this.proyectilesCat.splice(i, 1); continue;
            }
            /* EL REY FANTASMA (22 sep 2026): la estrella se le clava y le
             * quita vida. Entra FORZADA, saltándose el respiro entre golpes:
             * las tres cargas de una ráfaga salen casi seguidas y, si no, la
             * segunda y la tercera se perdían contra ese respiro y la Q
             * valía un tercio de lo que dice. Es lo mismo que hacen la runa
             * y el azul, que también traen su propio límite (tres tiros).
             *
             * Y NO cuenta como acierto para el pleno: el pleno perdona la
             * recarga por limpiar tres fantasmas, y con el rey —que está
             * siempre en la pantalla y es el doble de grande— sería una Q
             * gratis para siempre. */
            var JS = this.rey(G);
            if (JS && JS.impactaEn(G, b.x, b.y)) {
              JS.danar(G, CFG.JEFE.DANO.shuriken, b.w, 'shuriken', true);
              this.efecto('shuriken', b.x, b.y, 16);
              this.finShuriken(G, b, false); this.proyectilesCat.splice(i, 1); continue;
            }
          }
          continue;
        }

        /* GANCHO (Soporte): sale, engancha y TRAE al fantasma. Las tres fases
         * son las del gancho inverso, pero aquí quien viaja de vuelta es el
         * fantasma, no el jugador. */
        if (b.tipo === 'gancho') {
          var sp2 = G.pacs[b.w], gv2 = CFG.DIR_V[b.d], quitarG = false;
          if (!sp2 || sp2.out || sp2.dying) quitarG = true;
          else if (b.fase === 'sale') {
            var gnx = b.x + gv2.x * H.GANCHO_VEL, gny = b.y + gv2.y * H.GANCHO_VEL;
            if (gnx < 0) gnx += ancho; else if (gnx >= ancho) gnx -= ancho;
            var gcc = Math.floor(gnx / T), grr = Math.floor(gny / T);
            b.viaja += H.GANCHO_VEL;
            if (grr < 0 || grr >= CFG.ROWS || !CFG.isOpen(gcc, grr, false) || b.viaja > b.max) {
              b.fase = 'vuelve';
            } else {
              b.x = gnx; b.y = gny;
              /* EL GARFIO CONTRA EL REY FANTASMA (22 sep 2026). Al fantasma
               * se lo trae y lo deja azul; al rey no se le hace ni lo uno ni
               * lo otro: no se le mueve de sitio —pesa lo que pesa— y volver
               * azul a quien no se come no significa nada. Así que el garfio
               * le entra, le hace un rasguño (1 de vida, ver CFG.JEFE.DANO)
               * y vuelve de vacío. Es poco a posta: la Q del Soporte contra
               * el jefe no es su jugada, pero tampoco puede ser una tecla
               * que no hace nada. */
              var JG = manda && this.rey(G);
              if (JG && JG.impactaEn(G, b.x, b.y)) {
                JG.danar(G, CFG.JEFE.DANO.gancho, b.w, 'gancho');
                this.efecto('gancho', b.x, b.y, 20, sp2.x, sp2.y);
                b.fase = 'vuelve';
              }
              for (var gj = 0; gj < 4 && b.fase === 'sale'; gj++) {
                var gcand = G.ghosts[gj];
                if (!this.enLaCalle(gcand) || this.distancia(b.x, b.y, gcand.x, gcand.y) > T * 0.75) continue;
                b.objetivo = gcand.id; b.fase = 'trae'; b.trae = H.GANCHO_TRAE_MAX;
                b.x = gcand.x; b.y = gcand.y;
                this.efecto('gancho_atrapa', gcand.x, gcand.y, 24, sp2.x, sp2.y);
                break;
              }
            }
          } else if (b.fase === 'trae') {
            var gobj = G.ghosts[b.objetivo | 0];
            if (!this.enLaCalle(gobj) || --b.trae <= 0) b.fase = 'vuelve';
            else {
              b.x = gobj.x; b.y = gobj.y;
              /* mientras viene no muerde: llega apagado y se despierta azul */
              if (manda) this.aturdido[gobj.id] = Math.max(this.aturdido[gobj.id] || 0, 2);
              if (this.distancia(gobj.x, gobj.y, sp2.x, sp2.y) <= T * 0.9) {
                if (manda) {
                  this.azulCatalogo[gobj.id] = b.w + 1;
                  this.azulCatTicks[gobj.id] = H.GANCHO_AZUL_TICKS;
                  this.aturdido[gobj.id] = 0;
                }
                this.efecto('gancho_trae', gobj.x, gobj.y, 22, sp2.x, sp2.y);
                quitarG = true;
              } else if (manda) {
                this.tirarFantasma(G, gobj, sp2.tileX(), sp2.tileY(), H.GANCHO_TRAE_VEL);
                b.x = gobj.x; b.y = gobj.y;
              }
            }
          }
          if (!quitarG && b.fase === 'vuelve') {
            var vdx = sp2.x - b.x;
            if (vdx > ancho / 2) vdx -= ancho; else if (vdx < -ancho / 2) vdx += ancho;
            var vdy = sp2.y - b.y, vdis = Math.sqrt(vdx * vdx + vdy * vdy) || 1;
            if (vdis <= H.GANCHO_VEL + 1) quitarG = true;
            else {
              b.x += vdx / vdis * H.GANCHO_VEL; b.y += vdy / vdis * H.GANCHO_VEL;
              if (b.x < 0) b.x += ancho; else if (b.x >= ancho) b.x -= ancho;
            }
          }
          if (quitarG) { this.terminarGancho(b); this.proyectilesCat.splice(i, 1); }
          continue;
        }

        if (b.tipo === 'gancho_inverso') {
          var hp = G.pacs[b.w], hv = CFG.DIR_V[b.d], quitarGancho = false;
          if (!hp || hp.out || hp.dying) quitarGancho = true;
          else if (b.fase === 'sale') {
            var hnx = b.x + hv.x * H.GANCHO_INVERSO_VEL;
            var hny = b.y + hv.y * H.GANCHO_INVERSO_VEL;
            if (hnx < 0) hnx += ancho; else if (hnx >= ancho) hnx -= ancho;
            var hc = Math.floor(hnx / T), hr = Math.floor(hny / T);
            b.viaja += H.GANCHO_INVERSO_VEL;
            if (hr < 0 || hr >= CFG.ROWS || !CFG.isOpen(hc, hr, false) || b.viaja > b.max) {
              b.fase = 'vuelve';
            } else {
              b.x = hnx; b.y = hny;
              if (manda) for (var hg = 0; hg < 4; hg++) {
                var gg = G.ghosts[hg];
                if (!this.enLaCalle(gg) || this.distancia(b.x, b.y, gg.x, gg.y) > T * 0.75) continue;
                b.objetivo = gg.id; b.fase = 'arrastra'; b.x = gg.x; b.y = gg.y;
                this.azulCatalogo[gg.id] = b.w + 1; this.azulCatTicks[gg.id] = H.GANCHO_AZUL_TICKS;
                this.efecto('gancho_atrapa', gg.x, gg.y, 24, hp.x, hp.y);
                break;
              }
            }
          } else if (b.fase === 'arrastra') {
            var hgObj = G.ghosts[b.objetivo | 0];
            if (!this.enLaCalle(hgObj)) b.fase = 'vuelve';
            else {
              b.x = hgObj.x; b.y = hgObj.y;
              this.aturdido[hgObj.id] = Math.max(this.aturdido[hgObj.id] || 0, 2);
              var hdx = b.x - hp.x;
              if (hdx > ancho / 2) hdx -= ancho; else if (hdx < -ancho / 2) hdx += ancho;
              var hdy = b.y - hp.y, hdis = Math.sqrt(hdx * hdx + hdy * hdy) || 1;
              var harr = G.pacSpeedPx(hp) * H.GANCHO_ARRASTRE_MULT;
              if (hdis <= harr + 1) { hp.x = b.x; hp.y = b.y; hp.pauseTicks = 0; quitarGancho = true; }
              else if (!G.isLocalAuth || G.isLocalAuth(b.w)) {
                hp.x += hdx / hdis * harr; hp.y += hdy / hdis * harr;
                if (hp.x < 0) hp.x += ancho; else if (hp.x >= ancho) hp.x -= ancho;
                hp.pauseTicks = 0;
              }
            }
          }
          if (b.fase === 'vuelve') {
            var rdx = hp.x - b.x;
            if (rdx > ancho / 2) rdx -= ancho; else if (rdx < -ancho / 2) rdx += ancho;
            var rdy = hp.y - b.y, rdis = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
            if (rdis <= H.GANCHO_INVERSO_VEL + 1) quitarGancho = true;
            else {
              b.x += rdx / rdis * H.GANCHO_INVERSO_VEL; b.y += rdy / rdis * H.GANCHO_INVERSO_VEL;
              if (b.x < 0) b.x += ancho; else if (b.x >= ancho) b.x -= ancho;
            }
          }
          if (quitarGancho) {
            this.terminarGanchoInverso(b); this.proyectilesCat.splice(i, 1);
          }
          continue;
        }

        /* EL MISIL ATROPELLA (22 sep 2026): antes solo se llevaba al fantasma
         * que llevaba apuntado y los demás lo veían pasar por delante de sus
         * narices. Ahora mata a cualquiera que se le cruce, con el mismo radio
         * de toque que el shuriken (tres cuartos de casilla). Al atropellado se
         * le tacha de la cola para que no se le cobre dos veces, y la cadena de
         * puntos sigue subiendo igual. Solo lo resuelve el anfitrión: las demás
         * pantallas reciben las muertes por la foto de red. */
        /* El misil que se queda sin cola se apaga... salvo que quede el REY
         * FANTASMA: entonces sigue volando y remata en él (22 sep 2026). */
        if (b.tipo === 'misil' && manda && !this.atropellaMisil(G, b) && !this.rey(G)) {
          this.proyectilesCat.splice(i, 1); continue;
        }
        /* EL REY FANTASMA COMO BLANCO (22 sep 2026). El misil, la bola
         * guiada y las balas del tótem persiguen fantasmas; en un nivel de
         * jefe los cuatro están encerrados en casa hasta que él los invoca,
         * así que esas tres habilidades ni siquiera salían. Con `b.jefe`
         * puesto persiguen al rey, y como va disfrazado de fantasma
         * (blancoRey) vuelan con este mismo código, rutas del laberinto
         * incluidas. Al llegar le quitan vida en vez de comérselo. */
        var target = b.jefe ? this.blancoRey(G) : G.ghosts[b.objetivo | 0];
        if (!b.jefe && !this.enLaCalle(target)) {
          if (b.tipo === 'misil') {
            while (b.cola && b.cola.length && !this.enLaCalle(G.ghosts[b.cola[0]])) b.cola.shift();
            if (b.cola && b.cola.length) { b.objetivo = b.cola.shift(); b.ruta = null; target = G.ghosts[b.objetivo]; }
          } else {
            target = this.ghostCercanoAt(G, Math.floor(b.x / T), Math.floor(b.y / T), 999);
            if (target) b.objetivo = target.id;
          }
          /* y si ya no queda ningún fantasma, el que quede volando remata en
           * el rey: el misil "mata en cadena" y el último eslabón es él */
          if (!this.enLaCalle(target) && this.blancoRey(G)) {
            b.jefe = 1; b.ruta = null; b.rutaObjetivo = '';
            target = this.blancoRey(G);
          }
        }
        if (!target || (!b.jefe && !this.enLaCalle(target))) { this.proyectilesCat.splice(i, 1); continue; }
        var vel = b.tipo === 'misil' ? H.MISIL_VEL : (b.tipo === 'totem' ? H.TOTEM_BALA_VEL : H.BOLA_GUIADA_VEL);
        /* El MISIL y la BOLA GUIADA persiguen igual: van por los pasillos con
         * la ruta del laberinto y la recalculan en cuanto el fantasma cambia
         * de casilla. Lo único distinto es la velocidad, así que en vez de
         * duplicar la rama se marca aquí quién sigue el camino; lo demás (las
         * balas del tótem) vuela en línea recta. La guiada iba recta y
         * atravesaba las paredes como si el laberinto no existiera. */
        var sigueRuta = (b.tipo === 'misil' || b.tipo === 'guiada');
        var dx, dy, dis, aObjetivo = true;
        if (sigueRuta) {
          var bc = Math.floor(b.x / T), br = Math.floor(b.y / T);
          var tc = target.tileX(), tr = target.tileY(), clave = tc + ',' + tr;
          if (!b.ruta || b.rutaObjetivo !== clave || (!b.ruta.length && (bc !== tc || br !== tr))) {
            b.ruta = this.rutaLaberinto(bc, br, tc, tr);
            b.rutaObjetivo = clave;
          }
          /* Sin camino el misil se apaga, como siempre. La guiada no puede
           * fallar nunca: si el laberinto no da ruta (algo muy raro estando el
           * fantasma en la calle) se va derecha a por él y lo vuelve a
           * intentar al tick siguiente, pero no desaparece. */
          if (!b.ruta) {
            /* yendo a por el REY tampoco se apaga (22 sep 2026): él puede
             * estar sobre la puerta de la casa, que para el laberinto no es
             * pasillo, y ahí el camino no sale. Se va derecho y ya. */
            if (b.tipo === 'misil' && !b.jefe) { this.proyectilesCat.splice(i, 1); continue; }
            sigueRuta = false;
          }
        }
        if (sigueRuta) {
          var wp = b.ruta.length ? b.ruta[0] : null;
          var wx = wp ? wp.c * T + T / 2 : target.x;
          var wy = wp ? wp.r * T + T / 2 : target.y;
          dx = wx - b.x; dy = wy - b.y; aObjetivo = !wp;
        } else {
          dx = target.x - b.x; dy = target.y - b.y;
        }
        if (dx > ancho / 2) dx -= ancho; else if (dx < -ancho / 2) dx += ancho;
        dis = Math.sqrt(dx * dx + dy * dy) || 1;
        b.ang = Math.atan2(dy, dx);
        if (sigueRuta && !aObjetivo && dis <= vel + 0.5) {
          b.x += dx; b.y += dy; b.ruta.shift();
          if (b.x < 0) b.x += ancho; else if (b.x >= ancho) b.x -= ancho;
          continue;
        }
        if (aObjetivo && dis <= vel + 3) {
          b.x = target.x; b.y = target.y;
          if (b.jefe) {
            /* al rey no se lo come nadie: se le quita vida y el proyectil se
             * acaba ahí (el misil tampoco sigue: él es el último eslabón) */
            var JD = this.rey(G);
            if (manda && JD) JD.danar(G, CFG.JEFE.DANO[b.tipo], b.w, b.tipo);
            this.efecto(b.tipo === 'guiada' ? 'bola_guiada' : b.tipo, b.x, b.y, 22);
            this.proyectilesCat.splice(i, 1); continue;
          }
          if (manda) {
            if (b.tipo === 'guiada') this.matarCatalogo(G, target, b.w, H.BOLA_GUIADA_PUNTOS, 'bola_guiada', 1, true);
            else if (b.tipo === 'totem') this.matarCatalogo(G, target, b.w, H.MAGO_PUNTOS, 'totem');
            else {
              this.matarCatalogo(G, target, b.w, CFG.GHOST_CHAIN[Math.min(b.golpe, 3)], 'misil');
              b.golpe++;
            }
          }
          if (b.tipo === 'misil' && b.cola && b.cola.length) {
            while (b.cola.length && !this.enLaCalle(G.ghosts[b.cola[0]])) b.cola.shift();
            if (b.cola.length) { b.objetivo = b.cola.shift(); b.ruta = null; b.rutaObjetivo = ''; continue; }
          }
          this.proyectilesCat.splice(i, 1); continue;
        }
        b.x += dx / dis * vel; b.y += dy / dis * vel;
        if (b.x < 0) b.x += ancho; else if (b.x >= ancho) b.x -= ancho;
      }
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
      this.pasoProyectilesCat(G, manda);
      if (this.terremotoTicks > 0) this.terremotoTicks--;
      if (this.temblorTicks > 0) this.temblorTicks--;
      if (this.eclipseTicks > 0) this.eclipseTicks--;
      for (j = 0; j < 4; j++) {
        if (this.lento[j] > 0) this.lento[j]--;
        if (this.aturdido[j] > 0) this.aturdido[j]--;
        if (this.ciego[j] > 0) this.ciego[j]--;
        if (this.azulCatTicks[j] > 0 && --this.azulCatTicks[j] <= 0) { this.azulCatalogo[j] = 0; this.arcanoAzul[j] = 0; }
        if (this.caceriaQuien[j] >= 0 && !this.enLaCalle(G.ghosts[j])) this.caceriaQuien[j] = -1;
        /* DOMINIO: el reloj del fantasma prestado. Al agotarse vuelve a ser
         * de la casa pero ATURDIDO un segundo: lleva seis pegado al Mago y
         * sin esa resaca lo mataría en el mismo tick en que deja de serlo. */
        if (this.dominado[j] > 0) {
          if (!this.enLaCalle(G.ghosts[j])) { this.dominado[j] = 0; this.dominaQuien[j] = -1; }
          else if (--this.dominado[j] <= 0) {
            this.dominado[j] = 0; this.dominaQuien[j] = -1;
            this.aturdido[j] = Math.max(this.aturdido[j], H.DOMINIO_RESACA);
            this.efecto('dominio_fin', G.ghosts[j].x, G.ghosts[j].y, 24);
          }
        }
      }
      /* el azul del TOQUE ARCANO salta de fantasma a fantasma: lo decide el
       * anfitrión y solo él, los demás lo reciben ya resuelto en la foto */
      if (manda) this.pasoContagioArcano(G);
      for (i = 0; i < this.st.length; i++) {
        s = this.st[i];
        if (s.provoca > 0) s.provoca--;
        /* CORAZA (pasiva del Tanque): dura lo suyo y vuelve sola. Los dos
         * relojes van con la partida (parada, no corren), así que los
         * segundos son de juego, no de reloj de pared. */
        if (this.esRol(G, i, 'tanque')) {
          if (s.corPas > 0) {
            s.corPas--;
            if (s.corPas <= 0) s.corCd = H.CORAZA_CD;   // se fue sola
          } else if (s.corCd > 0) {
            s.corCd--;
            if (s.corCd <= 0) {
              s.corPas = H.CORAZA_DURA;
              var pc = G.pacs[i];
              if (pc && this.vivo(G, i)) this.efecto('amparo', pc.x, pc.y, 18);
            }
          }
        }
        if (s.escudo > 0) s.escudo--;
        if (s.coraza > 0) s.coraza--;
        if (s.gracia > 0) s.gracia--;
        if (s.inmune > 0) s.inmune--;
        if (s.sombra > 0 && --s.sombra <= 0) {
          var sp = G.pacs[i];
          if (sp) this.efecto('sombra_sale', sp.x, sp.y, 28);
        }
        if (s.frenesi > 0) s.frenesi--; else s.frenesiMult = 1;
        /* SHURIKEN: el reloj entre tiro y tiro. Se agota y la ráfaga cae. */
        if (s.shuriken && s.shuriken.ventana > 0 && --s.shuriken.ventana <= 0) {
          this.cerrarRafagaShuriken(G, i);
        }
        if (s.carrona > 0) s.carrona--;
        if (s.marca > 0 && --s.marca <= 0) for (j = 0; j < 4; j++) if (this.marcaGhost[j] === i) this.marcaGhost[j] = -1;
        if (s.caceria > 0) s.caceria--; else for (j = 0; j < 4; j++) if (this.caceriaQuien[j] === i) this.caceriaQuien[j] = -1;
        if (s.estelaBuff > 0) s.estelaBuff--;
        if (!s.estelaRastro) s.estelaRastro = [];
        /* ESTELA: el rastro es un camino, no una colita. Antes cada pisada se
         * borraba sola a los 45 ticks y detrás del Soporte solo quedaba un
         * cabo corto; ahora las pisadas se quedan puestas mientras la
         * habilidad dure y el camino entero desaparece de golpe al acabarse,
         * que es lo que el compañero necesita ver para decidir si lo pisa. */
        if (s.estela > 0) {
          var ep = G.pacs[i];
          if (ep && (G.tick % 5 === 0)) {
            s.estelaRastro.push({ x: ep.x, y: ep.y });
            /* Tope de seguridad: los 8 s de la habilidad dan unas 96 pisadas,
             * pero si algún día se alarga, el array no debe crecer sin fin;
             * pasado el tope se tira la pisada más vieja. */
            if (s.estelaRastro.length > 160) s.estelaRastro.shift();
          }
          if (--s.estela <= 0) s.estelaRastro.length = 0;
        } else if (s.estelaRastro.length) s.estelaRastro.length = 0;
        /* El empujón a los COMPAÑEROS que pisan el camino sigue igual: se mira
         * pisada por pisada y se reparte mientras el rastro esté puesto. */
        for (j = 0; j < s.estelaRastro.length; j++) {
          var er = s.estelaRastro[j];
          for (var ej = 0; ej < G.pacs.length; ej++) if (ej !== i && this.vivo(G, ej) &&
              this.distancia(G.pacs[ej].x, G.pacs[ej].y, er.x, er.y) <= T) this.st[ej].estelaBuff = 15;
        }
        /* El hueco del PUENTE se cierra solo, y al cerrarse saca de la pared
         * a quien estuviera dentro (si no, se queda plantado en el muro). */
        if (s.puente && --s.puente.t <= 0) { this.cerrarPuente(G, s.puente); s.puente = null; }
        if (s.cadena > 0) s.cadena--; else s.cadenaCon = -1;
        if (s.campo > 0) s.campo--;
        if (s.hospital > 0) s.hospital--;
        if (s.yunque > 0) {
          var yp = G.pacs[i];
          if (!yp || this.distancia(yp.x, yp.y, s.yunqueX, s.yunqueY) > 1) {
            s.yunque = 0;
            if (yp) this.efecto('yunque_roto', yp.x, yp.y, 18);
          } else s.yunque--;
        }
        if (s.pielPiedra > 0) s.pielPiedra--;
        if (s.rebote > 0) s.rebote--;
        /* FORTALEZA se quedaba encendida para siempre: era el único poder del
         * catálogo al que le faltaba el descuento por fotograma (21 sep). */
        if (s.fortaleza > 0 && --s.fortaleza <= 0) {
          var fpf = G.pacs[i];
          if (fpf) this.efecto('fortaleza_fin', fpf.x, fpf.y, 22);
        }
        if (s.terremoto > 0) s.terremoto--;
        if (s.eclipse > 0) s.eclipse--;
        if (s.bomba && s.bomba.t > 0 && --s.bomba.t <= 0) s.bomba = null;
        if (s.mina && --s.mina.t <= 0) s.mina = null;
        if (s.telarana && --s.telarana.t <= 0) s.telarana = null;
        if (s.muro && --s.muro.t <= 0) s.muro = null;
        if (s.faro && --s.faro.t <= 0) s.faro = null;
        if (s.sirena && --s.sirena.t <= 0) s.sirena = null;
        if (s.clon && --s.clon.t <= 0) s.clon = null;
        /* La retícula del METEORO camina aquí y no en cargas() a propósito:
         * cargas() corre ANTES que la repetición y esto tiene que correr
         * DESPUÉS, que es donde ella vuelve a meter las flechas. Así la marca
         * anda casilla por casilla igual jugando que viéndolo luego. */
        if (s.apunta) this.pasoApuntado(G, i);
        if (s.meteoro && s.meteoro.t > 0) s.meteoro.t--;
        if (s.fuegoMeteoro && --s.fuegoMeteoro.t <= 0) s.fuegoMeteoro = null;
        if (s.totem && s.totem.t > 0) s.totem.t--;
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
      /* Los tirones de GRAVEDAD: arrastran mientras dure el medio segundo.
       * Los fantasmas los mueve el anfitrión y nadie más. */
      if (this.tirones && this.tirones.length) {
        for (var ti = this.tirones.length - 1; ti >= 0; ti--) {
          var tr2 = this.tirones[ti], tg2 = G.ghosts[tr2.gid];
          if (!manda || !this.enLaCalle(tg2) || --tr2.t <= 0) { this.tirones.splice(ti, 1); continue; }
          this.tirarFantasma(G, tg2, tr2.c, tr2.r, tr2.vel);
        }
      }
      if (!manda) return;
      /* DOMINIO: el fantasma del Mago alcanza a otro y lo manda a casa, como
       * si se lo hubieran comido, y el Mago cobra DOMINIO_PUNTOS por cada
       * uno. Lo resuelve el anfitrión, igual que todo lo que les pasa a los
       * fantasmas, y a DOMINIO_CHOQUE de distancia, la misma media casilla
       * larga que usan los demás contactos de este archivo. */
      for (j = 0; j < 4; j++) {
        if (!this.esDominado(j)) continue;
        var cazador = G.ghosts[j], duenoDom = this.dominaQuien[j];
        if (!this.enLaCalle(cazador) || !(duenoDom >= 0)) continue;
        /* Y SI ALCANZA AL REY FANTASMA, le pega UN bocado y ahí se acaba su
         * dominio: se va a casa hecho ojos, como la presa que caza (22 sep
         * 2026). Uno y no más a propósito: pegado al rey le entraría un
         * golpe cada tres cuartos de segundo, y los seis que dura el dominio
         * le sacarían media barra con una E de treinta y dos segundos. Es el
         * bocado que se ha ganado por llevárselo hasta allí. */
        var JDo = this.rey(G);
        if (JDo && JDo.cercaDe(G, cazador.x, cazador.y, H.DOMINIO_CHOQUE) &&
            JDo.danar(G, CFG.JEFE.DANO.dominio, duenoDom, 'dominio')) {
          this.efecto('dominio_caza', G.jefe.x, G.jefe.y, 26, cazador.x, cazador.y);
          this.dominado[j] = 0; this.dominaQuien[j] = -1;
          cazador.eaten();
          continue;
        }
        for (var pz = 0; pz < 4; pz++) {
          var presaDom = G.ghosts[pz];
          if (pz === j || this.esDominado(pz) || !this.enLaCalle(presaDom)) continue;
          if (this.distancia(cazador.x, cazador.y, presaDom.x, presaDom.y) > H.DOMINIO_CHOQUE * T) continue;
          this.efecto('dominio_caza', presaDom.x, presaDom.y, 26, cazador.x, cazador.y);
          this.matarCatalogo(G, presaDom, duenoDom, H.DOMINIO_PUNTOS, 'dominio', 1, true);
        }
      }
      /* Las zonas se recalculan sobre la posición actual de los fantasmas. */
      for (i = 0; i < this.st.length; i++) {
        s = this.st[i];
        if (s.telarana) {
          var red = this.ghostsEn(G, s.telarana.c, s.telarana.r, 1.5);
          for (j = 0; j < red.length; j++) { this.lento[red[j].id] = 2; this.lentoMult[red[j].id] = H.TELARANA_MULT; }
        }
        if (s.muro) {
          var pared = this.ghostsEn(G, s.muro.c, s.muro.r, 0.8);
          for (j = 0; j < pared.length; j++) this.empujar(G, pared[j], 1);
        }
        if (s.mina) {
          var mina = this.ghostsEn(G, s.mina.c, s.mina.r, 0.6);
          if (mina.length) {
            for (j = 0; j < mina.length; j++) this.matarCatalogo(G, mina[j], i, H.MAGO_PUNTOS, 'mina');
            s.escudo = Math.max(s.escudo, H.ALIADO_TICKS);
            var mp = G.pacs[i]; if (mp) this.efecto('amparo', mp.x, mp.y, 28);
            s.mina = null;
          }
        }
        if (s.faro) {
          for (j = 0; j < G.pacs.length; j++) if (j !== i && this.vivo(G, j) && G.pacs[j].tileX() === s.faro.c && G.pacs[j].tileY() === s.faro.r) {
            var rr = this.listaDe(G, j)[3];
            if (rr) this.st[j].cd[3] = Math.floor(this.st[j].cd[3] * 0.5);
            this.efecto('faro_toca', G.pacs[j].x, G.pacs[j].y, 30); s.faro = null; break;
          }
        }
        if (s.totem && s.totem.cd-- <= 0) {
          var tg = this.ghostCercanoAt(G, s.totem.c, s.totem.r, 10);
          if (tg) this.proyectilesCat.push({ tipo: 'totem', x: s.totem.c * T + T / 2,
            y: s.totem.r * T + T / 2, w: i, objetivo: tg.id });
          /* SIN FANTASMAS, LA TORRE LE DISPARA AL REY (22 sep 2026). Una
           * bala vale 1 de vida y tira cada dos segundos mientras dura, así
           * que una torre plantada al lado del rey le saca cuatro: es lo que
           * vale una W que hay que colocar bien y que él puede dejar atrás
           * con dos pasos. */
          else {
            var JT2 = this.rey(G);
            if (JT2 && JT2.cercaDe(G, s.totem.c * T + T / 2, s.totem.r * T + T / 2, 10)) {
              this.proyectilesCat.push({ tipo: 'totem', x: s.totem.c * T + T / 2,
                y: s.totem.r * T + T / 2, w: i, objetivo: -1, jefe: 1 });
            }
          }
          s.totem.cd = H.TOTEM_CADA;
        }
        if (s.clon) {
          var cv = CFG.DIR_V[s.clon.d] || { x: 0, y: 0 };
          var cnx = s.clon.x + cv.x * 1.1, cny = s.clon.y + cv.y * 1.1;
          var cnc = Math.floor(cnx / T), cnr = Math.floor(cny / T);
          if (cnx < 0) cnx += CFG.COLS * T; else if (cnx >= CFG.COLS * T) cnx -= CFG.COLS * T;
          if (cnr < 0 || cnr >= CFG.ROWS || !CFG.isOpen(CFG.wrapCol(cnc), cnr, false)) {
            s.clon.d = (s.clon.d + 2) % 4;
          } else {
            s.clon.x = cnx; s.clon.y = cny; s.clon.c = Math.floor(cnx / T); s.clon.r = Math.floor(cny / T);
          }
          var cercaClon = this.ghostsEn(G, s.clon.c, s.clon.r, 0.7);
          /* EL REY TAMBIÉN SE CREE EL CLON: ya lo persigue (Hab.objetivo lo
           * mira sin preguntar quién es), así que lo único que faltaba era
           * el reventón al alcanzarlo (22 sep 2026). Medio segundo apagado,
           * un tercio de lo que se lleva un fantasma. */
          var JK = this.rey(G);
          if (JK && JK.cercaDe(G, s.clon.x, s.clon.y, 0.7)) {
            JK.congelar(G, CFG.JEFE.ATURDE.clon);
            this.efecto('clon_explota', s.clon.x, s.clon.y, 34); s.clon = null;
          } else if (cercaClon.length) {
            for (j = 0; j < cercaClon.length; j++) this.aturdido[cercaClon[j].id] = Math.max(this.aturdido[cercaClon[j].id], 60);
            this.efecto('clon_explota', s.clon.x, s.clon.y, 34); s.clon = null;
          }
        }
        if (s.meteoro && s.meteoro.t <= 0) {
          var mm = this.ghostsEn(G, s.meteoro.c, s.meteoro.r, H.METEORO_RADIO);
          for (j = 0; j < mm.length; j++) this.matarCatalogo(G, mm[j], i, H.MAGO_PUNTOS, 'meteoro');
          /* EL METEORO LE CAE ENCIMA AL REY (22 sep 2026): 5 de vida, la R
           * más gorda del Mago contra él. La HOGUERA que queda después NO le
           * repite el golpe —a los fantasmas sí los sigue matando— porque el
           * respiro entre golpes del rey es de tres cuartos de segundo y los
           * cuatro que dura el fuego le sacarían cinco veces más vida que la
           * piedra: quedarse encima no puede valer más que el impacto. */
          var JM = this.rey(G);
          if (JM && JM.cercaDe(G, s.meteoro.c * T + T / 2, s.meteoro.r * T + T / 2, H.METEORO_RADIO)) {
            JM.danar(G, CFG.JEFE.DANO.meteoro, i, 'meteoro');
          }
          this.efecto('meteoro', s.meteoro.c * T + T / 2, s.meteoro.r * T + T / 2, 42);
          /* cae una piedra del tamaño de un bloque: el suelo lo nota */
          this.temblar(METEORO_TEMBLOR, METEORO_SACUDIDA);
          s.fuegoMeteoro = { c: s.meteoro.c, r: s.meteoro.r, t: H.METEORO_FUEGO };
          s.meteoro = null;
        }
        if (s.fuegoMeteoro) {
          var fm = this.ghostsEn(G, s.fuegoMeteoro.c, s.fuegoMeteoro.r, H.METEORO_RADIO);
          for (j = 0; j < fm.length; j++) this.matarCatalogo(G, fm[j], i, H.MAGO_PUNTOS, 'meteoro_fuego');
        }
        if (s.totem && s.totem.t <= 0) s.totem = null;
      }
      for (i = this.joyas.length - 1; i >= 0; i--) {
        var joya = this.joyas[i]; if (--joya.t <= 0) { this.joyas.splice(i, 1); continue; }
        if (joya.vuelo > 0) joya.vuelo--;
        /* medio segundo por los aires: se ve salir y se ve caer antes de que
         * nadie la pueda recoger (ver soltarBotin) */
        if (joya.espera > 0) { joya.espera--; continue; }
        /* EL BOTÍN LO COGE CUALQUIERA (22 sep). Solo lo recogía el Asesino
         * que lo había dejado, así que en party se quedaba ahí tirado
         * mientras un compañero le pasaba por encima. Ahora lo levanta el
         * primero que pase; el bono de CADENA sigue yendo por quien lo cogió,
         * que es quien hizo el recorrido. */
        for (j = 0; j < G.pacs.length; j++) if (this.vivo(G, j) && this.distancia(G.pacs[j].x, G.pacs[j].y, joya.x, joya.y) < T) {
          G.addScore(300); this.bonoCadena(G, j, 300, joya.x, joya.y);
          G.addPopup(joya.x, joya.y, 300, 30); this.efecto('joya', joya.x, joya.y, 24);
          this.joyas.splice(i, 1); break;
        }
      }
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

    /* Al morir UN jugador (la partida sigue): se le cortan sus efectos.
     * La CORAZA no: es lo que trae puesto el Tanque, y volver a la vida sin
     * ella sería empezar castigado por haber muerto. */
    limpiarJugador: function (idx, G) {
      var s = this.st[idx];
      if (!s) return;
      /* SHURIKEN: morir a media ráfaga no devuelve las cargas. Si quedaba
       * alguna por tirar, la Q se va a recargar igual que si se hubiera
       * pasado la ventana; sin esto, morir era la forma barata de empezar
       * la ráfaga otra vez. */
      if (s.shuriken && G) {
        var ks = this.kDe(G, idx, 'shuriken');
        if (ks >= 0 && !(s.cd[ks] > 0)) this.gastar(G, idx, ks);
      }
      s.provoca = 0; s.escudo = 0; s.coraza = 0; s.gracia = 0; s.inmune = 0;
      s.arrolla = 0; s.tormenta = 0; s.turbo = 0; s.pedirQ = 0;
      s.sombra = 0; s.sombraGolpe = false; s.frenesi = 0; s.frenesiMult = 1; s.carrona = 0; s.marca = 0;
      /* EL GANCHO NO SOBREVIVE A SU DUEÑO (22 sep 2026). Los dos ganchos —el
       * del Soporte y el GANCHO INVERSO del Asesino— son una cuerda atada al
       * jugador: mientras existen, mueven a alguien. Al morir se le quitaba el
       * estado pero el proyectil seguía puesto en la mesa. En solitario lo
       * barría el respawn; en línea no: la foto del anfitrión se lo devolvía
       * al invitado que ya había reaparecido y el Asesino salía andando solo
       * hacia el fantasma, muros incluidos. La cuerda se corta aquí. */
      for (var pj = this.proyectilesCat.length - 1; pj >= 0; pj--) {
        var bj = this.proyectilesCat[pj];
        if (bj && bj.w === (idx | 0) &&
            (bj.tipo === 'gancho' || bj.tipo === 'gancho_inverso')) {
          this.proyectilesCat.splice(pj, 1);
        }
      }
      s.ganchoInv = 0; s.ganchoOut = 0; s.shuriken = null; s.misil = null; s.caceria = 0;
      s.estela = 0; s.estelaBuff = 0; s.estelaRastro = []; s.cadena = 0;
      if (s.puente && G) this.cerrarPuente(G, s.puente);
      s.puente = null;
      s.campo = 0; s.hospital = 0; s.yunque = 0; s.pielPiedra = 0; s.rebote = 0;
      s.fortaleza = 0; s.terremoto = 0; s.eclipse = 0;
      s.bomba = s.mina = s.telarana = s.muro = s.faro = s.sirena = s.clon = s.meteoro = s.fuegoMeteoro = s.totem = null;
      s.mant = -1; s.mantT = 0;
      /* morir a media puntería cierra el apuntado y NO tira el meteoro: la R
       * se queda cargada, que bastante castigo es la muerte */
      s.apunta = null;
      s.dimension = 0;
    },

    /* ¿Ese jugador lleva la CORAZA puesta? (pasiva del Tanque) */
    corazaDe: function (G, idx) {
      var s = this.estado(idx);
      return !!(s && s.corPas > 0 && this.esRol(G, idx, 'tanque'));
    },

    esRol: function (G, idx, rol) {
      return !!(G && G.roles && G.roles[idx | 0] === rol);
    },

    /* ---------- la foto de red de los roles ----------
     * Lo que ejecuta el anfitrión (hielo, huidas, proyectiles, portales,
     * runas) y los efectos de cada jugador, para pintarlos igual en todas
     * las pantallas. Doce veces por segundo, así que en números cortos. */
    resumenRoles: function () {
      var e = [], i;
      for (i = 0; i < this.st.length; i++) {
        var s = this.st[i];
        e.push([s.provoca, s.escudo, s.pisoton, s.arrolla, s.inmune, s.tormenta, s.gracia, s.coraza, s.dimension,
                s.corPas, s.corCd]);
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
      var ct = { lento: this.lento.slice(), lentoMult: this.lentoMult.slice(), aturdido: this.aturdido.slice(),
        ciego: this.ciego.slice(), azul: this.azulCatalogo.slice(), azulT: this.azulCatTicks.slice(),
        caceria: this.caceriaQuien.slice(), marca: this.marcaGhost.slice(),
        dominado: this.dominado.slice(), dominaQuien: this.dominaQuien.slice(), joyas: this.joyas,
        proyectiles: this.proyectilesCat,
        terremoto: this.terremotoTicks, eclipse: this.eclipseTicks, st: [] };
      for (i = 0; i < this.st.length; i++) {
        var cs = this.st[i];
        ct.st.push({ bomba: cs.bomba, mina: cs.mina, telarana: cs.telarana, muro: cs.muro, faro: cs.faro,
          sirena: cs.sirena, clon: cs.clon, meteoro: cs.meteoro,
          fuegoMeteoro: cs.fuegoMeteoro, totem: cs.totem,
          sombra: cs.sombra, sombraGolpe: cs.sombraGolpe, frenesi: cs.frenesi,
          frenesiMult: cs.frenesiMult, caceria: cs.caceria, estela: cs.estela,
          estelaBuff: cs.estelaBuff, estelaRastro: cs.estelaRastro, puente: cs.puente,
          cadena: cs.cadena, cadenaCon: cs.cadenaCon, campo: cs.campo,
          hospital: cs.hospital, yunque: cs.yunque, pielPiedra: cs.pielPiedra, rebote: cs.rebote,
          fortaleza: cs.fortaleza, eclipse: cs.eclipse });
      }
      return { e: e, hz: this.hielo.slice(), hu: this.huye.slice(), hq: this.huyeQuien.slice(),
               po: po, ru: ru, bl: bl, pl: pl, ct: ct };
    },

    aplicarRoles: function (hx, mioIdx) {
      if (!this.on || !hx) return;
      var i, k;
      /* los dos últimos llegaron con la CORAZA (20 sep): una foto vieja
       * simplemente no los trae y se quedan como están */
      var CAMPOS = ['provoca', 'escudo', 'pisoton', 'arrolla', 'inmune', 'tormenta', 'gracia', 'coraza', 'dimension',
        'corPas', 'corCd'];
      for (i = 0; hx.e && i < hx.e.length && i < this.st.length; i++) {
        var fila = hx.e[i], s = this.st[i];
        if (!fila) continue;
        for (k = 0; k < CAMPOS.length; k++) {
          var v = fila[k] | 0;
          if (i === mioIdx) {
            /* LO MÍO QUE DECIDO YO no se toca: el escudo, la inmunidad, la
             * carrera... y la CORAZA con su recarga (9 y 10). Esos dos
             * faltaban, y era un agujero serio: al romper yo la coraza
             * contra un fantasma, la foto del anfitrión —que todavía me
             * creía con ella— me la volvía a poner, y como sigue llegando
             * doce veces por segundo mientras dura, en party el Tanque no
             * se moría nunca. Su reloj corre igual en las dos máquinas y lo
             * roto viaja por su propio aviso (escudoRoto).
             *
             * Lo que ejecuta el anfitrión solo se corrige hacia arriba. */
            if (k === 1 || k === 3 || k === 4 || k === 6 || k === 7 || k === 8 ||
                k === 9 || k === 10) continue;
            if (v > s[CAMPOS[k]]) s[CAMPOS[k]] = v;
          } else {
            s[CAMPOS[k]] = v;
          }
        }
      }
      if (hx.hz) this.hielo = hx.hz.slice(0, 4);
      if (hx.hu) this.huye = hx.hu.slice(0, 4);
      if (hx.hq) this.huyeQuien = hx.hq.slice(0, 4);
      if (hx.ct) {
        var ct = hx.ct;
        if (ct.lento) this.lento = ct.lento.slice(0, 4);
        if (ct.lentoMult) this.lentoMult = ct.lentoMult.slice(0, 4);
        if (ct.aturdido) this.aturdido = ct.aturdido.slice(0, 4);
        if (ct.ciego) this.ciego = ct.ciego.slice(0, 4);
        if (ct.azul) this.azulCatalogo = ct.azul.slice(0, 4);
        if (ct.azulT) this.azulCatTicks = ct.azulT.slice(0, 4);
        if (ct.caceria) this.caceriaQuien = ct.caceria.slice(0, 4);
        if (ct.dominado) this.dominado = ct.dominado.slice(0, 4);
        if (ct.dominaQuien) this.dominaQuien = ct.dominaQuien.slice(0, 4);
        if (ct.marca) this.marcaGhost = ct.marca.slice(0, 4);
        if (ct.joyas) this.joyas = ct.joyas;
        if (ct.proyectiles) this.proyectilesCat = ct.proyectiles;
        this.terremotoTicks = ct.terremoto | 0; this.eclipseTicks = ct.eclipse | 0;
        for (i = 0; ct.st && i < ct.st.length && i < this.st.length; i++) {
          var cs = ct.st[i], ds = this.st[i];
          if (i === mioIdx) continue;
          for (var ck in cs) if (cs.hasOwnProperty(ck)) ds[ck] = cs[ck];
        }
      }
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
    /* ---------- EL VACÍO (la otra dimensión del PORTAL) ----------
     * Dentro no se ve el laberinto de siempre: se ve SU CONTORNO flotando
     * sobre un abismo con estrellas, con una sombra un poco más abajo que lo
     * despega del suelo. Lo pinta Game.render en vez del laberinto normal, y
     * las pastillas y la fruta no se pintan: no son de esta dimensión.
     *
     * Las estrellas son fijas (una cuenta, no azar): así no bailan de un
     * cuadro a otro ni hacen falta números aleatorios que romperían el
     * determinismo de las repeticiones. */
    dibujarVacio: function (G, ctx, mazeImg) {
      var W = CFG.NATIVE_W, Hh = CFG.ROWS * T, Y = CFG.MAZE_Y, tk = G.tick;
      ctx.save();
      /* el abismo */
      var g = ctx.createRadialGradient(W / 2, Y + Hh * 0.45, 20, W / 2, Y + Hh * 0.45, Hh * 0.8);
      g.addColorStop(0, '#150b2b');
      g.addColorStop(1, '#04030a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, Y + Hh);
      /* estrellas: posición fija por número y un parpadeo lento */
      for (var i = 0; i < H.VACIO_ESTRELLAS; i++) {
        var x = (i * 71) % W, y = Y + ((i * 137) % Hh);
        var br = 0.5 + 0.4 * Math.sin(tk / 22 + i);
        ctx.fillStyle = 'rgba(201, 164, 255, ' + br.toFixed(2) + ')';
        ctx.fillRect(x, y, (i % 7 === 0) ? 2 : 1, (i % 7 === 0) ? 2 : 1);
      }
      /* el mapa: su sombra, y encima el contorno */
      if (mazeImg) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.drawImage(mazeImg, 3, Y + 7, W, Hh);
        ctx.globalAlpha = 1;
        ctx.drawImage(mazeImg, 0, Y, W, Hh);
        ctx.restore();
      }
      /* los bordes se oscurecen: el vacío no tiene final */
      var v = ctx.createRadialGradient(W / 2, Y + Hh * 0.45, Hh * 0.35, W / 2, Y + Hh * 0.45, Hh * 0.85);
      v.addColorStop(0, 'rgba(0, 0, 0, 0)');
      v.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, Y + Hh);
      ctx.restore();
    },

    /* Lo que queda de un fantasma o de un compañero visto desde el vacío: una
     * luz de su color, sin cara y sin forma. Se sabe dónde está, no qué hace. */
    luzLejana: function (ctx, x, y, color, tk) {
      var pul = 6 + Math.sin(tk / 9) * 1.2;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, pul, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    /* Lo que va en el SUELO, debajo de fantasmas y Pac-Man */
    dibujarSuelo: function (G, ctx) {
      if (!this.on) return;
      var Y = CFG.MAZE_Y, tk = G.tick, i;
      this.dibujarOjo(G, ctx, Y, tk);
      /* MARCA enseña la ruta del objetivo aunque el jugador no sea Mago. */
      for (i = 0; i < 4; i++) if (this.marcaGhost[i] >= 0 && G.ghosts[i] && G.ghosts[i].rutaPrevista) {
        var mruta = G.ghosts[i].rutaPrevista(G, H.OJO_PASOS);
        ctx.save(); ctx.fillStyle = '#ff66cc';
        for (var mi = 0; mi < mruta.length; mi++) {
          ctx.globalAlpha = 0.85 - mi * 0.08;
          ctx.fillRect(mruta[mi].x * T + T / 2 - 1, mruta[mi].y * T + T / 2 + Y - 1, 3, 3);
        }
        ctx.restore();
      }
      if (this.eclipseTicks > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(18, 5, 35, ' + (0.28 + 0.08 * Math.sin(tk / 7)) + ')';
        ctx.fillRect(0, Y, CFG.COLS * T, CFG.ROWS * T);
        ctx.strokeStyle = 'rgba(180, 105, 255, 0.45)'; ctx.lineWidth = 1;
        for (var ec = 0; ec < 6; ec++) {
          ctx.beginPath(); ctx.arc((ec * 47 + tk) % (CFG.COLS * T), Y + (ec * 61) % (CFG.ROWS * T), 3 + ec, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      }
      /* Lo que queda en la otra dimensión: la barra de arriba. El abismo, el
       * contorno del mapa y las luces los pinta Game.render (dibujarVacio). */
      var dentro = this.miraDesdeDimension(G);
      if (dentro >= 0) {
        var W = CFG.COLS * T;
        var resta = this.estado(dentro).dimension / H.PORTAL_ESPERA;
        ctx.save();
        ctx.fillStyle = 'rgba(139, 61, 255, 0.35)';
        ctx.fillRect(0, Y, W, 3);
        ctx.fillStyle = '#c9a4ff';
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
      /* Trampas, zonas y objetivos del catálogo. Se dibujan en el suelo para
       * que fantasmas y Pac-Man pasen por encima sin ocultar la señal. */
      for (i = 0; i < this.st.length; i++) {
        /* El recuadro de color vale para las zonas que solo tienen que decir
         * hasta dónde llegan. MINA, MURO, SIRENA y FARO salieron de aquí y
         * tienen dibujo propio más abajo: cada una cuenta algo distinto (que
         * va a saltar, que bloquea, que llama, que barre) y con el mismo
         * molde para las cuatro no se distinguía ninguna. El 22 sep salieron
         * también TELARAÑA y BOMBA por lo mismo: un cuadrado de color no
         * dice "esto te frena" ni "esto va a estallar". */
        var ds = this.st[i], zonas = [
          [ds.totem, '#ff7a1a', 0.7],
          [ds.fuegoMeteoro, '#ff5a1f', H.METEORO_RADIO]
        ];
        for (var zi = 0; zi < zonas.length; zi++) {
          var z = zonas[zi][0]; if (!z) continue;
          var zx = z.c * T + T / 2, zy = z.r * T + T / 2 + Y;
          ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = zonas[zi][1];
          ctx.fillRect(zx - zonas[zi][2] * T, zy - zonas[zi][2] * T,
            zonas[zi][2] * T * 2, zonas[zi][2] * T * 2);
          ctx.globalAlpha = 0.75; ctx.strokeStyle = zonas[zi][1]; ctx.lineWidth = 1;
          ctx.strokeRect(zx - zonas[zi][2] * T, zy - zonas[zi][2] * T,
            zonas[zi][2] * T * 2, zonas[zi][2] * T * 2); ctx.restore();
        }
        /* MINA: un artefacto plantado en el suelo, con su cuerpo, su aro y
         * tres patas, para que se lea como algo puesto ahí a propósito. El
         * piloto del centro parpadea despacio y se acelera —y se pone rojo—
         * el último segundo: ese es el único aviso de que va a saltar. */
        if (ds.mina) {
          var mnx = ds.mina.c * T + T / 2, mny = ds.mina.r * T + T / 2 + Y;
          var mnRapido = ds.mina.t > 0 && ds.mina.t < 60;
          var mnLuz = Math.floor(tk / (mnRapido ? 2 : 9)) % 2 === 0;
          ctx.save();
          ctx.strokeStyle = '#ffb852'; ctx.lineWidth = 1; ctx.globalAlpha = 0.8;
          for (var mnp = 0; mnp < 3; mnp++) {
            var mna = -Math.PI / 2 + mnp * Math.PI * 2 / 3;
            ctx.beginPath();
            ctx.moveTo(mnx + Math.cos(mna) * 2.5, mny + Math.sin(mna) * 2.5);
            ctx.lineTo(mnx + Math.cos(mna) * 5.5, mny + Math.sin(mna) * 5.5);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#3a2410';
          ctx.beginPath(); ctx.arc(mnx, mny, 3.2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(mnx, mny, 3.2, 0, Math.PI * 2); ctx.stroke();
          if (mnLuz) {
            ctx.fillStyle = mnRapido ? '#ff4058' : '#ffe66d';
            ctx.beginPath(); ctx.arc(mnx, mny, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.28;
            ctx.beginPath(); ctx.arc(mnx, mny, 5.5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        }
        /* MURO: una pared de verdad ocupando la casilla entera, con ladrillos
         * a matajunta, no una mancha de color encima del suelo. Va en el tono
         * del Soporte y con un destello que sube por las juntas, y eso es lo
         * que la separa del muro del laberinto, que ni brilla ni se va. Se
         * atenúa a parpadeos el último segundo: se está cayendo. */
        if (ds.muro) {
          var mux = ds.muro.c * T, muy = ds.muro.r * T + Y;
          var muCae = ds.muro.t > 0 && ds.muro.t < 60 && Math.floor(tk / 5) % 2 === 0;
          ctx.save();
          ctx.globalAlpha = muCae ? 0.4 : 1;
          ctx.fillStyle = '#073a4d';
          ctx.fillRect(mux, muy, T, T);
          ctx.strokeStyle = '#00c8ff'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mux, muy + T / 2); ctx.lineTo(mux + T, muy + T / 2);
          ctx.moveTo(mux + T / 2, muy); ctx.lineTo(mux + T / 2, muy + T / 2);
          ctx.moveTo(mux + T / 4, muy + T / 2); ctx.lineTo(mux + T / 4, muy + T);
          ctx.moveTo(mux + T * 3 / 4, muy + T / 2); ctx.lineTo(mux + T * 3 / 4, muy + T);
          ctx.stroke();
          ctx.strokeRect(mux + 0.5, muy + 0.5, T - 1, T - 1);
          ctx.globalAlpha = muCae ? 0.18 : 0.5;
          ctx.fillStyle = '#9fefff';
          ctx.fillRect(mux + 1, muy + (tk * 0.6) % T, T - 2, 1);
          ctx.restore();
        }
        /* SIRENA: un foco que llama a los fantasmas. Las ondas salen de la
         * casilla y se apagan al crecer —tres repartidas en el ciclo, para
         * que siempre haya una saliendo—, que es lo que deja ver de dónde
         * viene la llamada y hacia dónde van a ir. */
        if (ds.sirena) {
          var six = ds.sirena.c * T + T / 2, siy = ds.sirena.r * T + T / 2 + Y;
          ctx.save();
          ctx.strokeStyle = '#ff5577'; ctx.lineWidth = 1;
          for (var so = 0; so < 3; so++) {
            var sif = ((tk / 45) + so / 3) % 1;
            ctx.globalAlpha = (1 - sif) * 0.7;
            ctx.beginPath(); ctx.arc(six, siy, 2 + sif * 2.6 * T, 0, Math.PI * 2); ctx.stroke();
          }
          /* el foco late aparte: la fuente se ve aunque no haya onda encima */
          ctx.globalAlpha = 0.9; ctx.fillStyle = '#ff5577';
          ctx.beginPath(); ctx.arc(six, siy, 2.2 + Math.sin(tk / 4) * 0.8, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.45; ctx.fillStyle = '#ffd0da';
          ctx.beginPath(); ctx.arc(six, siy, 1.2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        /* FARO: una baliza que barre. El haz gira desde la lámpara y se
         * desvanece con la distancia, que es lo que dice "hacia aquí" sin
         * tapar el laberinto. El último segundo parpadea apagándose: quien
         * venía corriendo tiene que saber que deja de estar. */
        if (ds.faro) {
          var fax = ds.faro.c * T + T / 2, fay = ds.faro.r * T + T / 2 + Y;
          var faApaga = ds.faro.t > 0 && ds.faro.t < 60 && Math.floor(tk / 4) % 2 === 0;
          var faAng = tk / 14;
          ctx.save();
          ctx.globalAlpha = faApaga ? 0.22 : 1;
          var faHaz = ctx.createRadialGradient(fax, fay, 1, fax, fay, 2.4 * T);
          faHaz.addColorStop(0, 'rgba(255, 230, 109, 0.55)');
          faHaz.addColorStop(1, 'rgba(255, 230, 109, 0)');
          ctx.fillStyle = faHaz;
          ctx.beginPath();
          ctx.moveTo(fax, fay);
          ctx.arc(fax, fay, 2.4 * T, faAng - 0.35, faAng + 0.35);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#5a4a12';
          ctx.fillRect(fax - 2.5, fay - 1, 5, 5);
          ctx.strokeStyle = '#ffe66d'; ctx.lineWidth = 1;
          ctx.strokeRect(fax - 2.5, fay - 1, 5, 5);
          ctx.fillStyle = faApaga ? '#8a7a3a' : '#fff3b0';
          ctx.beginPath(); ctx.arc(fax, fay - 2, 2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        /* TELARAÑA: una tela de verdad —hilos que salen del centro y anillos
         * colgando entre ellos—, no una mancha morada (22 sep). Va tenue y
         * sin relleno para que se siga viendo el laberinto por debajo: lo
         * que tiene que decir es "aquí te quedas pegado", y eso lo cuenta la
         * forma, no el color. Los anillos respiran despacio, como una tela
         * tensada. Dura 16 s y parpadea el último segundo, igual que MINA,
         * MURO y FARO: quien contaba con la trampa tiene que ver que se va. */
        if (ds.telarana) {
          var tex = ds.telarana.c * T + T / 2, tey = ds.telarana.r * T + T / 2 + Y;
          var teApaga = ds.telarana.t > 0 && ds.telarana.t < 60 && Math.floor(tk / 5) % 2 === 0;
          var teR = 1.5 * T, teHilos = 8;
          ctx.save();
          ctx.strokeStyle = '#c77dff'; ctx.lineWidth = 1;
          ctx.globalAlpha = teApaga ? 0.12 : 0.45;
          /* los radios: del centro al borde de la zona que frena */
          ctx.beginPath();
          for (var th = 0; th < teHilos; th++) {
            var tha = th * Math.PI * 2 / teHilos;
            ctx.moveTo(tex, tey);
            ctx.lineTo(tex + Math.cos(tha) * teR, tey + Math.sin(tha) * teR);
          }
          ctx.stroke();
          /* y los anillos, que no son círculos: cada tramo cuelga un poco
           * hacia dentro, que es lo que hace que parezca tela y no diana */
          ctx.globalAlpha = teApaga ? 0.1 : 0.38;
          for (var ta = 1; ta <= 3; ta++) {
            var tar = teR * (ta / 3.4) * (1 + 0.04 * Math.sin(tk / 22 + ta));
            ctx.beginPath();
            for (var tb = 0; tb < teHilos; tb++) {
              var ta1 = tb * Math.PI * 2 / teHilos, ta2 = (tb + 1) * Math.PI * 2 / teHilos;
              var tam = (ta1 + ta2) / 2;
              if (!tb) ctx.moveTo(tex + Math.cos(ta1) * tar, tey + Math.sin(ta1) * tar);
              ctx.quadraticCurveTo(tex + Math.cos(tam) * tar * 0.76, tey + Math.sin(tam) * tar * 0.76,
                tex + Math.cos(ta2) * tar, tey + Math.sin(ta2) * tar);
            }
            ctx.stroke();
          }
          /* el nudo del centro, para que la tela tenga de dónde colgar */
          ctx.globalAlpha = teApaga ? 0.2 : 0.7;
          ctx.fillStyle = '#e0bfff';
          ctx.beginPath(); ctx.arc(tex, tey, 1.4, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        /* BOMBA: una bomba plantada con su cuerpo, su cuello y su mecha
         * encendida (22 sep). No lleva cuenta atrás —el Asesino la revienta
         * cuando quiere, con la misma tecla—, así que el aviso no es un
         * parpadeo de fin: es la chispa saltando en la punta de la mecha y
         * el cuerpo latiendo. El aro punteado marca hasta dónde llega el
         * estallido, que es lo único que hacía el recuadro de antes. */
        if (ds.bomba) {
          var box = ds.bomba.c * T + T / 2, boy = ds.bomba.r * T + T / 2 + Y;
          var boLate = 0.5 + 0.5 * Math.sin(tk / 5);
          ctx.save();
          /* el alcance: fino y punteado, girando, para que no tape el suelo */
          ctx.globalAlpha = 0.2 + 0.18 * boLate;
          ctx.strokeStyle = '#ff4058'; ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]); ctx.lineDashOffset = -tk / 4;
          ctx.beginPath(); ctx.arc(box, boy, H.BOMBA_RADIO * T, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]); ctx.lineDashOffset = 0;
          /* el cuerpo, con su brillo arriba a la izquierda para que sea una
           * bola y no un círculo, y un rojo por dentro que late */
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#1b1b22';
          ctx.beginPath(); ctx.arc(box, boy + 1, 3.6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#ff4058'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(box, boy + 1, 3.6, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 0.25 + 0.4 * boLate;
          ctx.fillStyle = '#ff4058';
          ctx.beginPath(); ctx.arc(box, boy + 1, 2.1, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.7; ctx.fillStyle = '#9aa4ad';
          ctx.beginPath(); ctx.arc(box - 1.3, boy - 0.2, 0.9, 0, Math.PI * 2); ctx.fill();
          /* el cuello y la mecha, que se curva hacia arriba a la derecha */
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#5a5a66';
          ctx.fillRect(box - 1.2, boy - 3.2, 2.4, 1.6);
          ctx.strokeStyle = '#c9a97a'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(box, boy - 3.2);
          ctx.quadraticCurveTo(box + 3, boy - 4.6, box + 2.4, boy - 6.6);
          ctx.stroke();
          /* la chispa: salta de tamaño cada pocos fotogramas, que es lo que
           * dice que la mecha está viva y esto va a estallar */
          var boCh = 1 + (tk % 6 < 3 ? 0.9 : 0.2);
          ctx.fillStyle = '#ffe66d';
          ctx.beginPath(); ctx.arc(box + 2.4, boy - 6.8, boCh, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.35; ctx.fillStyle = '#ff9f1c';
          ctx.beginPath(); ctx.arc(box + 2.4, boy - 6.8, boCh + 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        /* El paso del PUENTE: se borra el muro de esas casillas y se marca el
         * hueco. Parpadea el último segundo, que es el aviso de que se cierra
         * (y de que quien esté dentro va a salir por una de las bocas). */
        if (ds.puente && ds.puente.cs) {
          var puCierra = ds.puente.t < 60 && Math.floor(tk / 5) % 2 === 0;
          for (var pk = 0; pk < ds.puente.cs.length; pk++) {
            var pux = ds.puente.cs[pk].c * T + T / 2, puy = ds.puente.cs[pk].r * T + T / 2 + Y;
            ctx.save();
            ctx.globalAlpha = puCierra ? 0.35 : 1;
            ctx.fillStyle = '#000000';
            ctx.fillRect(pux - T / 2, puy - T / 2, T, T);
            ctx.globalAlpha = puCierra ? 0.15 : 0.3;
            ctx.fillStyle = '#00c8ff';
            ctx.fillRect(pux - T / 2, puy - T / 2, T, T);
            ctx.globalAlpha = puCierra ? 0.4 : 0.9;
            ctx.strokeStyle = '#00c8ff'; ctx.lineWidth = 1;
            ctx.setLineDash([3, 2]); ctx.lineDashOffset = -tk / 3;
            ctx.strokeRect(pux - T / 2 + 0.5, puy - T / 2 + 0.5, T - 1, T - 1);
            ctx.setLineDash([]); ctx.lineDashOffset = 0;
            ctx.restore();
          }
        }
        var rastros = ds.estelaRastro || [];
        if (rastros.length) {
          /* El camino se pinta de una pieza y con la misma fuerza de punta a
           * punta: ya no son puntos que se van apagando por detrás. Lo único
           * que se desvanece es el conjunto, y solo al final — en el último
           * tramo de la habilidad — para avisar de que el camino se acaba. */
          var eVive = ds.estela == null ? H.ESTELA_RASTRO_TICKS : ds.estela;
          var eAlfa = Math.min(1, eVive / H.ESTELA_RASTRO_TICKS);
          ctx.save();
          ctx.strokeStyle = '#2bff88'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath();
          for (var ei = 0; ei < rastros.length; ei++) {
            var eh = rastros[ei], eAnt = ei ? rastros[ei - 1] : null;
            /* Dos pisadas muy separadas son un salto (el túnel, un portal): ahí
             * se corta el trazo en vez de cruzar el mapa con una raya. */
            if (!eAnt || Math.abs(eh.x - eAnt.x) > T * 2 || Math.abs(eh.y - eAnt.y) > T * 2) ctx.moveTo(eh.x, eh.y + Y);
            else ctx.lineTo(eh.x, eh.y + Y);
          }
          /* Y se pinta FINO Y TRANSPARENTE (22 sep). El camino se estrenó
           * como una raya verde gorda y brillante y se comía el mapa: tapaba
           * las pastillas y los pasillos por los que hay que decidir. Lo que
           * tiene que hacer es marcar por dónde ir, no ser lo primero que se
           * mira, así que el halo queda casi insinuado y el trazo de dentro
           * es una línea de un píxel y medio. */
          ctx.globalAlpha = 0.1 * eAlfa; ctx.lineWidth = 4; ctx.stroke();
          ctx.globalAlpha = 0.34 * eAlfa; ctx.lineWidth = 1.5; ctx.stroke();
          /* Con una sola pisada no hay línea que trazar, así que se marca el
           * arranque del camino con un punto —igual de discreto. */
          if (rastros.length === 1) {
            ctx.globalAlpha = 0.34 * eAlfa;
            ctx.fillStyle = '#2bff88'; ctx.beginPath();
            ctx.arc(rastros[0].x, rastros[0].y + Y, 1.8 + 0.4 * Math.sin(tk / 4), 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        }
        if (ds.clon) {
          var clx = ds.clon.x == null ? ds.clon.c * T + T / 2 : ds.clon.x;
          var cly = ds.clon.y == null ? ds.clon.r * T + T / 2 : ds.clon.y;
          ctx.save(); ctx.globalAlpha = 0.5 + 0.2 * Math.sin(tk / 4); ctx.fillStyle = '#c9a4ff';
          ctx.beginPath(); ctx.arc(clx, cly + Y, 6, 0.2, Math.PI * 1.8); ctx.lineTo(clx, cly + Y); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(clx, cly + Y, 8 + Math.sin(tk / 3), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
        if (ds.meteoro) {
          var mx = ds.meteoro.c * T + T / 2, my = ds.meteoro.r * T + T / 2 + Y;
          ctx.save(); ctx.globalAlpha = 0.45 + 0.35 * Math.sin(tk / 4);
          ctx.strokeStyle = '#ff3030'; ctx.setLineDash([2, 2]); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(mx, my, H.METEORO_RADIO * T, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]); ctx.restore();
        }
        /* LA RETÍCULA de apuntar (la R mantenida). Tiene que distinguirse de
         * un vistazo del aviso de caída de ahí arriba —que es el círculo rojo
         * punteado y ya no se mueve—, así que esta es una CRUZ blanca con las
         * cuatro esquinas marcadas: dice "esto todavía lo estás moviendo tú".
         * El círculo del radio va en blanco y fino, para saber a quién se va a
         * llevar por delante sin que parezca que ya está cayendo.
         *
         * Solo la ve quien apunta: `apunta` no viaja en la foto de red. */
        if (ds.apunta) {
          var ax = ds.apunta.c * T + T / 2, ay = ds.apunta.r * T + T / 2 + Y;
          var lat = 5 + Math.sin(tk / 5);      // las esquinas respiran
          ctx.save();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          ctx.globalAlpha = 0.28;
          ctx.beginPath(); ctx.arc(ax, ay, H.METEORO_RADIO * T, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 0.95;
          /* la cruz, con el centro hueco para no tapar la casilla */
          ctx.beginPath();
          ctx.moveTo(ax - 7, ay); ctx.lineTo(ax - 2, ay);
          ctx.moveTo(ax + 2, ay); ctx.lineTo(ax + 7, ay);
          ctx.moveTo(ax, ay - 7); ctx.lineTo(ax, ay - 2);
          ctx.moveTo(ax, ay + 2); ctx.lineTo(ax, ay + 7);
          ctx.stroke();
          /* las cuatro escuadras */
          ctx.strokeStyle = '#ff9f1c';
          ctx.beginPath();
          ctx.moveTo(ax - lat, ay - lat + 3); ctx.lineTo(ax - lat, ay - lat); ctx.lineTo(ax - lat + 3, ay - lat);
          ctx.moveTo(ax + lat, ay - lat + 3); ctx.lineTo(ax + lat, ay - lat); ctx.lineTo(ax + lat - 3, ay - lat);
          ctx.moveTo(ax - lat, ay + lat - 3); ctx.lineTo(ax - lat, ay + lat); ctx.lineTo(ax - lat + 3, ay + lat);
          ctx.moveTo(ax + lat, ay + lat - 3); ctx.lineTo(ax + lat, ay + lat); ctx.lineTo(ax + lat - 3, ay + lat);
          ctx.stroke();
          ctx.restore();
        }
      }
      /* EL BOTÍN DE CARROÑA son MONEDAS (22 sep). Eran cuadrados amarillos
       * dando vueltas y no se leían: a 8 px por casilla, un cuadrado girando
       * parece un adorno, no algo que se recoge. Una moneda se entiende
       * sola. El giro es la elipse estrechándose hasta el canto y volviendo
       * a abrirse; el canto oscuro debajo le da el grosor del disco y el
       * brillo solo sale cuando la moneda da la cara. */
      for (i = 0; i < this.joyas.length; i++) {
        var jo = this.joyas[i];
        var jcara = Math.abs(Math.cos((tk + i * 11) / 14));  // 1 de frente, 0 de canto
        var jrx = 3.2 * Math.max(0.12, jcara), jry = 3.2;
        /* EL SALTO: mientras vuela va del sitio donde cayó el fantasma a su
         * casilla, con una parábola para que se lea como algo que sale
         * despedido y no como algo que se desliza. */
        var jx = jo.x, jy = jo.y;
        if (jo.vuelo > 0 && jo.ox != null) {
          var jk = 1 - jo.vuelo / H.CARROÑA_VUELO;
          jx = jo.ox + (jo.x - jo.ox) * jk;
          jy = jo.oy + (jo.y - jo.oy) * jk - Math.sin(jk * Math.PI) * 5;
        }
        ctx.save();
        ctx.translate(jx, jy + Y);
        ctx.fillStyle = '#a06a10';
        ctx.beginPath(); ctx.ellipse(0, 0.8, jrx, jry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe66d';
        ctx.beginPath(); ctx.ellipse(0, 0, jrx, jry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ff9f1c'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, jrx, jry, 0, 0, Math.PI * 2); ctx.stroke();
        if (jcara > 0.45) {
          ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff8d0';
          ctx.beginPath();
          ctx.ellipse(-jrx * 0.3, -jry * 0.35, jrx * 0.3, jry * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
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
      for (i = 0; i < 4; i++) {
        var cg = G.ghosts[i];
        if (!cg || cg.mode !== 'normal') continue;
        if (this.azulCatalogo[i]) {
          /* El cuerpo ya se pinta azul desde Ghost.draw. Este halo pequeño y
           * pulsante comunica que lo causó una habilidad, sin el aro grueso
           * que antes parecía un error gráfico sobre un fantasma rojo. */
          ctx.save(); ctx.strokeStyle = '#72b7ff'; ctx.shadowColor = '#244cff';
          ctx.shadowBlur = 4; ctx.lineWidth = 1; ctx.globalAlpha = 0.65;
          ctx.setLineDash([2, 2]); ctx.beginPath();
          ctx.arc(cg.x, cg.y + Y, 9 + Math.sin(tk / 4), tk / 12, tk / 12 + Math.PI * 2);
          ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        }
        if (this.dominado[i] > 0) {
          /* EL FANTASMA ES DEL MAGO. Tenía que distinguirse de un golpe de
           * los otros dos estados que también le cambian la vida al equipo:
           * el azul del catálogo (halo fino azul, se come) y el aturdido
           * (velo gris, está apagado). Así que aquí no va otro aro más: va
           * una CORONA morada —#8b3dff, el color del Mago— encima de la
           * cabeza, que es una forma y no un círculo, más el aro roto del
           * mismo morado por debajo. Parpadea el último medio segundo: ese
           * es el aviso de que vuelve a ser de la casa. */
          var domFin = this.dominado[i] < 30 && Math.floor(tk / 4) % 2 === 0;
          ctx.save();
          ctx.globalAlpha = domFin ? 0.35 : 1;
          ctx.strokeStyle = '#8b3dff'; ctx.shadowColor = '#8b3dff'; ctx.shadowBlur = 8;
          ctx.lineWidth = 2; ctx.beginPath();
          ctx.arc(cg.x, cg.y + Y, 10, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
          ctx.fillStyle = '#c9a4ff'; ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.moveTo(cg.x - 6, cg.y + Y - 8);
          ctx.lineTo(cg.x - 6, cg.y + Y - 14);
          ctx.lineTo(cg.x - 3, cg.y + Y - 11);
          ctx.lineTo(cg.x, cg.y + Y - 16);
          ctx.lineTo(cg.x + 3, cg.y + Y - 11);
          ctx.lineTo(cg.x + 6, cg.y + Y - 14);
          ctx.lineTo(cg.x + 6, cg.y + Y - 8);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        if (this.caceriaQuien[i] >= 0) {
          var colorCaza = (H.ROL_INFO && H.ROL_INFO.asesino && H.ROL_INFO.asesino.color) || '#ff66cc';
          ctx.save(); ctx.strokeStyle = colorCaza; ctx.shadowColor = colorCaza; ctx.shadowBlur = 8; ctx.lineWidth = 2;
          ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.arc(cg.x, cg.y + Y, 10 + Math.sin(tk / 3), tk / 15, tk / 15 + Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]); ctx.restore();
        }
        if (this.marcaGhost[i] >= 0) {
          ctx.save(); ctx.strokeStyle = '#ff66cc'; ctx.shadowColor = '#ff66cc'; ctx.shadowBlur = 6; ctx.lineWidth = 1.5;
          var mr = 10 + Math.sin(tk / 3);
          ctx.beginPath(); ctx.arc(cg.x, cg.y + Y, mr, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cg.x - 13, cg.y + Y); ctx.lineTo(cg.x - 6, cg.y + Y);
          ctx.moveTo(cg.x + 6, cg.y + Y); ctx.lineTo(cg.x + 13, cg.y + Y);
          ctx.moveTo(cg.x, cg.y + Y - 13); ctx.lineTo(cg.x, cg.y + Y - 6); ctx.stroke(); ctx.restore();
        }
        if (this.aturdido[i] > 0) {
          /* APAGADO, no solo quieto: un fantasma aturdido ya no mata (ver
           * inerte), así que necesita señal propia. El velo gris dice que
           * está fuera de juego y parpadea el último medio segundo, que es el
           * aviso de que vuelve a morder. Las estrellitas siguen arriba. */
          var vuelve = this.aturdido[i] < 30 && Math.floor(tk / 4) % 2 === 0;
          ctx.save();
          ctx.globalAlpha = vuelve ? 0.15 : 0.45;
          ctx.fillStyle = '#6b7684';
          ctx.beginPath(); ctx.arc(cg.x, cg.y + Y, 7.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = vuelve ? 0.35 : 0.85;
          ctx.strokeStyle = '#c2cbd4'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
          ctx.beginPath(); ctx.arc(cg.x, cg.y + Y, 9.5, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1; ctx.fillStyle = '#ffe66d';
          for (var es = 0; es < 3; es++) { var ea = tk / 5 + es * Math.PI * 2 / 3; ctx.fillRect(cg.x + Math.cos(ea) * 9 - 1, cg.y + Y - 8 + Math.sin(ea) * 3 - 1, 2, 2); }
          ctx.restore();
        }
        if (this.ciegoDe(i)) {
          ctx.save(); ctx.strokeStyle = '#c9a4ff'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(cg.x - 5, cg.y + Y - 2); ctx.lineTo(cg.x - 1, cg.y + Y + 2);
          ctx.moveTo(cg.x - 1, cg.y + Y - 2); ctx.lineTo(cg.x - 5, cg.y + Y + 2);
          ctx.moveTo(cg.x + 1, cg.y + Y - 2); ctx.lineTo(cg.x + 5, cg.y + Y + 2);
          ctx.moveTo(cg.x + 5, cg.y + Y - 2); ctx.lineTo(cg.x + 1, cg.y + Y + 2); ctx.stroke(); ctx.restore();
        }
      }
      for (i = 0; i < this.proyectilesCat.length; i++) {
        var cp = this.proyectilesCat[i]; if (cp.espera > 0) continue;
        ctx.save();
        if (cp.tipo === 'shuriken') {
          var sv = CFG.DIR_V[cp.d] || { x: 1, y: 0 };
          ctx.globalAlpha = 0.28; ctx.strokeStyle = '#8fdcff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(cp.x - sv.x * 3, cp.y + Y - sv.y * 3);
          ctx.lineTo(cp.x - sv.x * 11, cp.y + Y - sv.y * 11); ctx.stroke();
          ctx.globalAlpha = 1; ctx.translate(cp.x, cp.y + Y); ctx.rotate(tk * 0.42 + i);
          ctx.fillStyle = '#b7c9d8'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (var sh = 0; sh < 8; sh++) {
            var sha = -Math.PI / 2 + sh * Math.PI / 4, shr = sh % 2 ? 2.2 : 6;
            var shx = Math.cos(sha) * shr, shy = Math.sin(sha) * shr;
            if (!sh) ctx.moveTo(shx, shy); else ctx.lineTo(shx, shy);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#263746'; ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
        } else if (cp.tipo === 'gancho') {
          /* El garfio del Soporte: cuerda hasta él y, cuando trae carga, la
           * cuerda se tensa (línea entera y más gruesa). */
          var duenoG = G.pacs[cp.w], trayendo = cp.fase === 'trae';
          if (duenoG) {
            ctx.strokeStyle = trayendo ? '#8fdcff' : '#b8c2cc';
            ctx.lineWidth = trayendo ? 2 : 1.4;
            if (!trayendo) ctx.setLineDash([3, 1]);
            ctx.beginPath(); ctx.moveTo(duenoG.x, duenoG.y + Y); ctx.lineTo(cp.x, cp.y + Y); ctx.stroke();
            ctx.setLineDash([]);
          }
          var gvd = CFG.DIR_V[cp.d] || { x: 1, y: 0 };
          var ang = trayendo && duenoG ? Math.atan2(duenoG.y - cp.y, duenoG.x - cp.x) + Math.PI
                                       : Math.atan2(gvd.y, gvd.x);
          ctx.translate(cp.x, cp.y + Y); ctx.rotate(ang);
          ctx.strokeStyle = '#e6edf3'; ctx.shadowColor = '#79c8ff'; ctx.shadowBlur = 5; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(1, 0); ctx.arc(1, 3, 3, -Math.PI / 2, Math.PI * 0.75); ctx.stroke();
          ctx.fillStyle = '#9aa7b2'; ctx.beginPath(); ctx.arc(-4, 0, 1.5, 0, Math.PI * 2); ctx.fill();
        } else if (cp.tipo === 'gancho_inverso') {
          var duenoGancho = G.pacs[cp.w];
          if (duenoGancho) {
            ctx.strokeStyle = '#b8c2cc'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 1]);
            ctx.beginPath(); ctx.moveTo(duenoGancho.x, duenoGancho.y + Y); ctx.lineTo(cp.x, cp.y + Y); ctx.stroke();
            ctx.setLineDash([]);
          }
          var gv = CFG.DIR_V[cp.d] || { x: 1, y: 0 };
          ctx.translate(cp.x, cp.y + Y); ctx.rotate(Math.atan2(gv.y, gv.x));
          ctx.strokeStyle = '#e6edf3'; ctx.shadowColor = '#79c8ff'; ctx.shadowBlur = 5; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(1, 0); ctx.arc(1, 3, 3, -Math.PI / 2, Math.PI * 0.75); ctx.stroke();
          ctx.fillStyle = '#9aa7b2'; ctx.beginPath(); ctx.arc(-4, 0, 1.5, 0, Math.PI * 2); ctx.fill();
        } else if (cp.tipo === 'misil') {
          ctx.translate(cp.x, cp.y + Y); ctx.rotate(cp.ang || 0);
          var llama = 3 + ((tk + i) % 3);
          ctx.fillStyle = '#ffb21c'; ctx.shadowColor = '#ff4b2b'; ctx.shadowBlur = 7;
          ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-5 - llama, 0); ctx.lineTo(-5, 2); ctx.fill();
          ctx.shadowBlur = 0; ctx.fillStyle = '#e9eef4';
          ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(2, -3); ctx.lineTo(-5, -3); ctx.lineTo(-5, 3); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ff4058'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(2, -3); ctx.lineTo(2, 3); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-5, -6); ctx.lineTo(1, -3); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-2, 3); ctx.lineTo(-5, 6); ctx.lineTo(1, 3); ctx.fill();
        } else {
          var pcCol = cp.tipo === 'totem' ? '#ff9f1c' : '#8b3dff';
          ctx.fillStyle = pcCol; ctx.shadowColor = pcCol; ctx.shadowBlur = 9;
          ctx.beginPath(); ctx.arc(cp.x, cp.y + Y, 3, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(cp.x, cp.y + Y, 7 + Math.sin(tk / 3), 0, Math.PI * 2); ctx.strokeStyle = pcCol; ctx.stroke();
        }
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
        if (f.t === 'grito_guerra') {
          /* EL RUGIDO: dos anillos que salen del Tanque y barren el mapa,
           * el de delante grueso y el de detrás pisándole los talones. Van
           * perdiendo fuerza al crecer, como suena un grito al alejarse. */
          var grAv = 1 - Math.max(0, q);           // 0 al salir, 1 al apagarse
          ctx.strokeStyle = '#ff4058';
          ctx.shadowColor = '#ff4058'; ctx.shadowBlur = 6;
          for (var gr = 0; gr < 2; gr++) {
            var grf = grAv - gr * 0.2; if (grf <= 0) continue;
            ctx.globalAlpha = Math.max(0, 1 - grf) * 0.8;
            ctx.lineWidth = 4 - gr * 2;
            ctx.beginPath();
            ctx.arc(f.x, f.y + Y, grf * 16 * T, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (f.t === 'grito_sacudida') {
          /* Y el fantasma clavado: cuatro trazos cortos temblando a su
           * alrededor. Es la sacudida de quedarse tieso, no algo que le
           * llegue desde fuera: por eso nace pegado a él y no cruza nada. */
          /* Salen por FUERA del velo gris y del aro punteado del aturdido
           * (que están a 7,5 y 9,5): ahí dentro no se veían. */
          var gsR = 10 + (1 - Math.max(0, q)) * 3.5;
          var gsTem = Math.sin((f.tot - f.n) * 1.1) * 0.45;
          ctx.strokeStyle = '#ffd0d6'; ctx.lineWidth = 2;
          ctx.shadowColor = '#ff4058'; ctx.shadowBlur = 5;
          ctx.globalAlpha = Math.max(0, q) * 0.95;
          ctx.beginPath();
          for (var gs = 0; gs < 4; gs++) {
            var gsa = gs * Math.PI / 2 + Math.PI / 4 + gsTem;
            ctx.moveTo(f.x + Math.cos(gsa) * gsR, f.y + Y + Math.sin(gsa) * gsR);
            ctx.lineTo(f.x + Math.cos(gsa) * (gsR + 4), f.y + Y + Math.sin(gsa) * (gsR + 4));
          }
          ctx.stroke();
        } else if (f.t === 'ejecucion') {
          /* LA EJECUCIÓN CAE DEL CIELO (22 sep 2026): hasta hoy era un rayo rojo
           * que salía del jugador hacia el fantasma y parecía un disparo más del
           * Asesino. Ahora es un rayo AMARILLO que baja desde arriba del laberinto
           * hasta la casilla del fantasma, con su fogonazo al llegar: la sentencia
           * no se lanza, cae. Por eso aquí se ignora el punto de salida (x0, y0)
           * que le siguen mandando la habilidad y los avisos de red. */
          var amarEj = '#ffe66d';
          ctx.strokeStyle = amarEj;
          ctx.shadowColor = amarEj; ctx.shadowBlur = 10;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(f.x, Y);
          /* el zigzag se saca de f.tot, que no cambia mientras dura el efecto:
           * así el rayo se queda clavado y se apaga, en vez de bailar */
          var tramosEj = 7;
          for (var zzEj = 1; zzEj < tramosEj; zzEj++) {
            ctx.lineTo(f.x + ((zzEj * 41 + f.tot) % 9 - 4), Y + f.y * zzEj / tramosEj);
          }
          ctx.lineTo(f.x, f.y + Y);
          ctx.stroke();
          /* el fogonazo del impacto, abriéndose en la casilla del fantasma */
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(f.x, f.y + Y, 3 + (1 - q) * 10, 0, Math.PI * 2);
          ctx.stroke();
        } else if (f.t === 'rayo' || f.t === 'chispa' || f.t === 'gancho' || f.t === 'cadena' ||
            f.t === 'cadena_rota' || f.t === 'relevo' || f.t === 'gravedad' ||
            f.t === 'empujon' || f.t === 'arcano_contagio' ||
            f.t === 'dominio' || f.t === 'dominio_caza') {
          /* el contagio del TOQUE ARCANO y el hilo del DOMINIO —el del toque
           * y el de cada presa alcanzada— van en el morado del Mago */
          var lineCol = (f.t === 'arcano_contagio' || f.t === 'dominio' ||
            f.t === 'dominio_caza') ? '#8b3dff' :
            (f.t === 'gancho' ? '#2bff88' : (f.t === 'cadena' || f.t === 'cadena_rota' ? '#00ffff' :
            (f.t === 'empujon' ? '#ff4058' : '#e8d4ff')));
          ctx.strokeStyle = lineCol;
          ctx.shadowColor = lineCol; ctx.shadowBlur = 8;
          ctx.lineWidth = f.t === 'gancho' ? 2 : 1.5;
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
            roto: '#ffb852', aplasta: '#ffb852', amparo: '#2bff88', vida: '#7dff7a', boca: '#00c8ff',
            shuriken: '#f4f7ff', shuriken_salida: '#f4f7ff', shuriken_recarga: '#ffe66d', bomba: '#ff4058',
            bomba_planta: '#ff4058', sombra: '#7e57c2', sombra_sale: '#c9a4ff', sombra_golpe: '#ff66cc',
            frenesi: '#ff4058', carrona: '#ffe66d', marca: '#ff66cc', caceria: '#ff4058',
            misil: '#ff4058', misil_salida: '#ff4058', yunque: '#ffb852', yunque_roto: '#ffb852',
            piel_piedra: '#9aa4ad', rebote: '#ffb852', terremoto: '#ffb852', terremoto_onda: '#ffb852',
            fortaleza: '#ffb852', fortaleza_fin: '#ffb852', mina: '#2bff88', telarana: '#c77dff',
            estela: '#2bff88', puente: '#00c8ff', puente_cierra: '#00c8ff', gancho_trae: '#8fdcff',
            muro: '#00c8ff', faro: '#ffe66d', faro_toca: '#ffe66d', sirena: '#ff5577', campo: '#2bff88',
            resurreccion: '#ffffff', hospital: '#2bff88', bola_guiada: '#8b3dff', guiada_salida: '#8b3dff',
            arcano: '#8b3dff', clon: '#c9a4ff', clon_explota: '#c9a4ff', totem: '#ff9f1c',
            gravedad_centro: '#8b3dff', dominio_fin: '#8b3dff', meteoro_aviso: '#ff3030', meteoro: '#ff5a1f',
            meteoro_fuego: '#ff5a1f', eclipse: '#8b3dff', joya: '#ffe66d' };
          ctx.strokeStyle = colores[f.t] || '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(f.x, f.y + Y, 3 + (1 - q) * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    },

    /* EL OJO (pasiva del MAGO): POR DÓNDE VA A PASAR cada fantasma —las cinco
     * casillas siguientes de su camino, en su color— y CUÁNDO CAMBIAN DE
     * MODO, arriba del todo.
     *
     * Empezó marcando solo la casilla de destino (20 sep) y no servía: un
     * punto lejano no dice por dónde va a venir, que es lo único que hay que
     * decidir cuando lo tienes encima. Con el camino, el Mago es el que avisa:
     * ve la encerrona antes de que se cierre.
     *
     * Solo lo ve QUIEN ES MAGO. Es dibujo y nada más —ni toca la partida ni
     * viaja por la red—, así que cada uno ve lo suyo. De los azules no se
     * pinta camino: eligen al azar y adivinarlo sería mentir. */
    dibujarOjo: function (G, ctx, Y, tk) {
      var yo = (G.isSpec && G.isSpec()) ? -1 : (G.localIdx | 0);
      if (yo < 0 || !this.esRol(G, yo, 'mago') || !this.vivo(G, yo)) return;
      ctx.save();
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!g || !g.rutaPrevista) continue;
        var ruta = g.rutaPrevista(G, H.OJO_PASOS);
        for (var n = 0; n < ruta.length; n++) {
          /* Se va apagando con la distancia —lo de dentro de un paso
           * importa más que lo de dentro de siete— pero SIN llegar a
           * apagarse: a media tinta se confundía con las pastillas del
           * laberinto, que son puntos del mismo tamaño. Va a color entero,
           * más grande y con un hueco negro alrededor que lo despega del
           * suelo. */
          var a = 1 - 0.45 * (n / H.OJO_PASOS);
          var px = ruta[n].x * T + T / 2, py = ruta[n].y * T + T / 2 + Y;
          ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.75 * a) + ')';
          ctx.fillRect(px - 3, py - 3, 6, 6);
          ctx.fillStyle = this.rgba(CFG.GHOSTS[i].color, a);
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      }
      this.avisoDeModo(G, ctx, Y, tk);
      ctx.restore();
    },

    /* La otra mitad del OJO: en qué modo están los fantasmas y cuánto le
     * queda. Que se dispersen o persigan cambia la partida entera y en el
     * juego no se dice en ninguna parte; el Mago lo sabe. */
    avisoDeModo: function (G, ctx, Y, tk) {
      var txt, col;
      if (G.frightTicks > 0) {
        txt = 'AZUL ' + Math.ceil(G.frightTicks / 60) + 'S';
        col = '#2121ff';
      } else if (G.schedIndex >= G.schedule.length) {
        txt = 'CAZA SIN FIN';
        col = '#ff4444';
      } else {
        var quedan = Math.ceil((G.schedule[G.schedIndex] * 60 - G.schedTicks) / 60);
        txt = (G.globalMode === 'scatter' ? 'DISPERSIÓN' : 'CAZA') + ' ' + quedan + 'S';
        col = (G.globalMode === 'scatter') ? '#7dff7a' : '#ff4444';
      }
      /* parpadea el último segundo: el cambio de modo da la vuelta a todos */
      var urge = /\b1S$/.test(txt) && Math.floor(tk / 6) % 2 === 0;
      ctx.save();
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = urge ? '#fff' : col;
      ctx.fillText(txt, CFG.COLS * T / 2, Y + 8);
      ctx.restore();
    },

    /* un color del juego con transparencia */
    rgba: function (hex, a) {
      var h = String(hex || '#ffffff').replace('#', '');
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return 'rgba(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + a + ')';
    },

    /* Lo que lleva encima cada Pac-Man: aros de escudo e inmunidad, el aviso
     * de la provocación, la onda del pisotón y el aura de la tormenta */
    dibujarPac: function (G, ctx, pc, i) {
      var s = this.estado(i);
      if (!s) return;
      var x = pc.x, y = pc.y + CFG.MAZE_Y, tk = G.tick;
      ctx.save();
      /* LA CORAZA (pasiva del Tanque): un aro fijo, por dentro de los otros
       * escudos, para que se vea que lleva un golpe de más aguantado. */
      if (s.corPas > 0 && G.roles && G.roles[i] === 'tanque') {
        /* los dos últimos segundos avisa, igual que el escudo de la W: que se
         * vea acabarse es lo que hace que se entienda cuándo se puede entrar */
        var seVa = s.corPas < 120 && Math.floor(tk / 6) % 2 === 0;
        ctx.strokeStyle = 'rgba(255, 184, 82, ' + (seVa ? 0.15 : 0.5) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 7.5, 0, Math.PI * 2); ctx.stroke();
      }
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
      /* en el vacío, el Mago va entero y deja estela violeta */
      if (s.dimension > 0) {
        ctx.save();
        for (var e = 1; e <= 4; e++) {
          var punto = pc.atras ? pc.atras(e * 5) : null;
          if (!punto) break;
          ctx.globalAlpha = 0.42 - e * 0.09;
          ctx.fillStyle = '#8b3dff';
          ctx.beginPath();
          ctx.arc(punto.x, punto.y + CFG.MAZE_Y, 5.5 - e * 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
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
        ctx.beginPath(); ctx.arc(x, y, 6 + q * H.PISOTON_ONDA * T, 0, Math.PI * 2); ctx.stroke();
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
      /* Catálogo: cada estado sostenido tiene una silueta propia. Así no se
       * confunde "la tecla entró" con un sonido ni con un aro blanco común. */
      if (s.sombra > 0) {
        ctx.strokeStyle = 'rgba(201,164,255,0.65)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 10 + Math.sin(tk / 4), tk / 12, tk / 12 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#e7c9ff'; ctx.font = '4px monospace'; ctx.textAlign = 'center'; ctx.fillText('500/750', x, y - 12);
      }
      if (s.frenesi > 0) {
        ctx.strokeStyle = '#ff4058'; ctx.lineWidth = 2;
        for (var fr = 0; fr < 3; fr++) { ctx.beginPath(); ctx.arc(x, y, 9 + fr * 2, tk / 8 + fr * 2, tk / 8 + fr * 2 + 1.1); ctx.stroke(); }
        ctx.fillStyle = '#ffffff'; ctx.font = '4px monospace'; ctx.textAlign = 'center'; ctx.fillText('×' + (s.frenesiMult || 1).toFixed(2), x, y - 13);
      }
      if (s.caceria > 0) {
        ctx.strokeStyle = 'rgba(255,102,204,0.8)'; ctx.lineWidth = 1.5;
        for (var cz = 0; cz < 3; cz++) {
          ctx.beginPath(); ctx.moveTo(x - 8 - cz * 4, y - 5 + cz * 5);
          ctx.lineTo(x - 15 - cz * 5, y - 5 + cz * 5); ctx.stroke();
        }
      }
      if (s.carrona > 0) {
        ctx.fillStyle = '#ffe66d';
        for (var ca = 0; ca < 3; ca++) { var aa = tk / 7 + ca * Math.PI * 2 / 3; ctx.fillRect(x + Math.cos(aa) * 10 - 1, y + Math.sin(aa) * 10 - 1, 2, 2); }
      }
      if (s.estela > 0 || s.estelaBuff > 0) {
        ctx.strokeStyle = s.estela > 0 ? '#2bff88' : '#8fffc0'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 9 + Math.sin(tk / 4), 0, Math.PI * 2); ctx.stroke();
      }
      if (s.cadena > 0 && s.cadenaCon >= 0 && G.pacs[s.cadenaCon]) {
        ctx.strokeStyle = 'rgba(0,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(G.pacs[s.cadenaCon].x, G.pacs[s.cadenaCon].y + CFG.MAZE_Y); ctx.stroke(); ctx.setLineDash([]);
      }
      if (s.yunque > 0) {
        ctx.fillStyle = 'rgba(255,184,82,0.35)'; ctx.fillRect(x - 8, y - 8, 16, 16);
        ctx.strokeStyle = '#ffb852'; ctx.lineWidth = 2; ctx.strokeRect(x - 9, y - 9, 18, 18);
      }
      if (s.pielPiedra > 0) {
        ctx.strokeStyle = '#9aa4ad'; ctx.lineWidth = 2;
        for (var pi = 0; pi < 7; pi++) { var pa = pi * Math.PI * 2 / 7; ctx.beginPath(); ctx.moveTo(x + Math.cos(pa) * 7, y + Math.sin(pa) * 7); ctx.lineTo(x + Math.cos(pa) * 11, y + Math.sin(pa) * 11); ctx.stroke(); }
      }
      if (s.rebote > 0) {
        ctx.strokeStyle = '#ffb852'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 10 + (tk % 18) / 3, 0, Math.PI * 2); ctx.stroke();
      }
      if (s.terremoto > 0) {
        ctx.strokeStyle = 'rgba(255,184,82,0.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, y + 7, 8 + (tk % 20), 3 + (tk % 20) / 4, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (s.fortaleza > 0) {
        ctx.strokeStyle = 'rgba(255,184,82,0.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(x, y, H.FORTALEZA_RADIO * T, tk / 20, tk / 20 + Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      if (s.campo > 0 || s.hospital > 0) {
        var au = s.hospital > 0 ? '#ffffff' : '#2bff88';
        ctx.strokeStyle = au; ctx.globalAlpha = 0.45 + 0.25 * Math.sin(tk / 4); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
        if (s.hospital > 0) { ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke(); }
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
