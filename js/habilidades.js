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
 * Es un MODO APARTE, como LABERINTOS: se juega el laberinto de
 * 1980 con otras reglas, así que estas partidas NO entran en el
 * top mundial. Sí suman experiencia y logros, que son tuyos.
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
      flash: 0,           // ticks translúcido (FLASH)
      carga: 0,           // ticks de EMBESTIDA (fantasma humano)
      acecho: 0,          // ticks de ACECHO (fantasma humano)
      /* Hacia dónde fue el último flash. Se guarda porque el rastro se pinta
       * DETRÁS del salto, y el salto puede no ir hacia donde Pac-Man mira. */
      flashDir: -1,
      chispa: 0,          // contador para sembrar las chispas del turbo
      /* Ticks que le quedan a cada fantasma (por id) de "acabo de morderte y
       * aún no me lo han confirmado". Solo lo usa el INVITADO: ver mordisco(). */
      guard: [0, 0, 0, 0]
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
  var SON_PAC = ['playBite', 'playTurbo', 'playFlash', 'playShout'];
  var SON_GHOST = ['playCharge', 'playStealth'];

  function sonidoDe(G, idx, k) {
    var lista = (G.vsGhostOf && G.vsGhostOf(idx) >= 0) ? SON_GHOST : SON_PAC;
    return lista[k] || '';
  }

  var Hab = {
    on: false,       // ¿la partida en curso es de poderes?
    st: [],          // estado por jugador

    /* ---------- ciclo de vida ---------- */
    /* Desde Game.newGame. n = cuántos jugadores hay en la mesa. */
    empezar: function (on, n) {
      this.on = !!on;
      this.st = [];
      for (var i = 0; i < (n || 0); i++) this.st.push(nuevoEstado());
    },

    /* Al morir o al cambiar de nivel se cortan los EFECTOS, pero no las
     * recargas: perder una vida ya es bastante castigo sin encima
     * devolverte las cuatro teclas de golpe. */
    limpiarEfectos: function () {
      for (var i = 0; i < this.st.length; i++) {
        this.st[i].turbo = 0;
        this.st[i].dientes = 0;
        this.st[i].flash = 0;
        this.st[i].flashDir = -1;
        this.st[i].carga = 0;
        this.st[i].acecho = 0;
        this.st[i].guard = [0, 0, 0, 0];
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
      return (G && G.vsGhostOf && G.vsGhostOf(idx) >= 0) ? H.LIST_G : H.LIST;
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
    alfa: function (idx) {
      var s = this.estado(idx);
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
      }
      return this.lista(idx, k);
    },

    /* ---------- pulsación local (teclado o botón) ----------
     * Es el único embudo de la entrada, igual que Game.setPacDir lo es del
     * rumbo: por aquí pasan el teclado, los botones táctiles y la
     * repetición cuando se está viendo una. */
    pulsar: function (G, idx, k) {
      if (!this.puede(G, idx, k)) return false;
      var R = window.PM.Replay;
      // mientras se ve una repetición manda ella: la tecla del que mira no
      // pinta nada, igual que con los giros (js/replay.js)
      if (R && R.habBloqueada && R.habBloqueada()) return false;
      if (!this.lanzar(G, idx, k)) return false;
      /* Se apunta DESPUÉS y solo si salió: un mordisco al aire o un flash
       * contra el borde no cambian nada, así que meterlos en la repetición
       * sería engordarla por gusto. */
      if (R && R.apuntaHab) R.apuntaHab(idx, k);
      return true;
    },

    /* Lanza la habilidad del jugador idx. Devuelve si llegó a salir: hay
     * dos que se niegan a gastarse en balde (MORDISCO sin nadie cerca,
     * FLASH contra el borde del laberinto). */
    lanzar: function (G, idx, k) {
      var deRed = (G.netRole === 'guest');
      var ok;
      if (G.vsGhostOf && G.vsGhostOf(idx) >= 0) {
        // los dos del fantasma humano: se aplican solo a él, aquí y ahora
        if (k === EMBESTIDA) ok = this.embestida(G, idx);
        else if (k === ACECHO) ok = this.acechar(G, idx);
        else ok = false;
      } else {
        switch (k) {
          case MORDISCO: ok = this.mordisco(G, idx, deRed); break;
          case TURBO:    ok = this.turbo(G, idx); break;
          case FLASH:    ok = this.flash(G, idx); break;
          case GRITO:    ok = this.grito(G, idx, deRed); break;
          default:       ok = false;
        }
      }
      if (!ok) return false;
      this.gastar(G, idx, k);
      this.avisar(G, idx, k);
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
    avisar: function (G, idx, k) {
      if (G.netRole === 'guest') G.netSend('gevt', { t: 'hab', k: k });
      else G.hostEvt({ t: 'hab', w: idx, k: k });
    },

    /* ---------- lo que llega de fuera ----------
     * Anfitrión: un invitado pide una habilidad (gevt). Se valida su
     * recarga aquí, que es la copia que no puede tocar nadie desde su
     * navegador, y se ejecuta lo que sea cosa del anfitrión. */
    peticion: function (G, who, k) {
      if (!this.on) return;
      if (!this.puede(G, who, k)) return;
      var ok;
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
      if (k === MORDISCO) ok = this.mordisco(G, who, false, H.BITE_NET_MARGIN);
      else if (k === GRITO) ok = this.grito(G, who, false);
      else {
        /* TURBO y FLASH ya se los ha aplicado él en su máquina; aquí solo
         * se anota para que su Pac-Man se vea con chispas y translúcido, y
         * para llevar su recarga. Su POSICIÓN llega por 'pos' como siempre. */
        if (k === TURBO) this.marcarTurbo(who);
        else this.marcarFlash(who);
        // y se oye bajito, que aquí el efecto no pasa por su función
        son(sonidoDe(G, who, k), true);
        ok = true;
      }
      if (!ok) return;
      this.gastar(G, who, k);
      G.hostEvt({ t: 'hab', w: who, k: k });
    },

    /* Cualquiera (invitado o mirón): el anfitrión dice que fulano usó una
     * habilidad. Aquí NO se ejecuta nada que toque a los fantasmas —eso ya
     * llega por sus propios eventos ('eatGhost', 'fright')—, solo se pinta.
     * De lo contrario, quien la lanzó la aplicaría dos veces. */
    evento: function (G, who, k) {
      if (!this.on) return;
      if (!(who >= 0 && who < this.st.length)) return;
      if (!(k >= 0 && k < this.cuantas(G, who))) return;
      if (who === G.localIdx && !G.isSpec()) {
        // es el eco de la mía: ya está aplicada, no se toca
        return;
      }
      if (G.vsGhostOf && G.vsGhostOf(who) >= 0) {
        /* La embestida SÍ se aplica aquí, y no es solo pintura: ese fantasma
         * lo simula también esta máquina (por estima entre instantáneas), así
         * que sin la velocidad buena se vería frenar y dar tirones. */
        if (k === EMBESTIDA) this.marcarCarga(who);
        else this.marcarAcecho(who);
      } else if (k === MORDISCO) this.marcarDientes(who);
      else if (k === TURBO) this.marcarTurbo(who);
      else if (k === FLASH) this.marcarFlash(who);
      /* Y se oye. Bajito siempre: por aquí solo pasan los poderes de OTROS —el
       * eco del tuyo se descarta arriba—, y de un mirón no es ninguno. */
      son(sonidoDe(G, who, k), true);
      this.gastar(G, who, k);
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

    marcarDientes: function (idx, ticks) {
      var s = this.estado(idx);
      if (s) s.dientes = ticks || H.BITE_SHOW;
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
      if (!g) {
        /* Dentellada al aire. No gasta recarga, pero SE VE: sin esto, fallar
         * la puntería y tener la tecla en recarga se sienten exactamente
         * igual —no pasa nada—, y entonces la Q parece rota aunque funcione.
         * Con los dientes un instante queda claro que la tecla entró y lo
         * que falló fue el tiro. */
        this.marcarDientes(idx, Math.round(H.BITE_SHOW / 2));
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
