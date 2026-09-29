/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/guardado.js
 * La partida a medias. Define window.PM.Guardado
 *
 * Hasta aquí una partida solo existía mientras estuviera abierta: cerrar la
 * pestaña la tiraba entera. Esto la deja donde iba y permite seguirla luego,
 * también en otro aparato.
 *
 * ¿Por qué se puede hacer? Por lo mismo que las repeticiones: el juego es
 * determinista (Game.seedRnd(nivel)), así que una partida cabe en sus
 * ajustes más la lista de giros con el tick de cada uno. Guardar una partida
 * a medias es, literalmente, guardar SU REPETICIÓN CORTADA POR DONDE IBA
 * (js/replay.js), y retomarla es volver a reproducirla a toda velocidad
 * hasta ese tick y devolver el mando. No hay que serializar fantasmas, ni
 * pastillas, ni recargas: se vuelven a deducir solos.
 *
 * Eso trae tres cosas buenas y una mala. Buenas: ocupa lo que una repetición
 * (unos pocos kilobytes, así que cabe en la nube y cruza de ordenador), no
 * hay estado que se quede a medio guardar, y si algo no cuadra se NOTA (al
 * final de la recuperación se comprueban los puntos y las pastillas que
 * quedaban: si no salen los mismos, la partida no se retoma y se dice). Mala:
 * la recuperación tarda lo que tarde simular la partida otra vez, unos
 * segundos, con su barra de progreso.
 *
 * QUÉ SE PUEDE CONTINUAR: lo que la repetición sabe reconstruir, o sea
 * CLÁSICO, DOS JUGADORES, DESATADO, PAC-MAN VS. y LABERINTOS, de uno o dos
 * en el mismo teclado. CACERÍA no se graba (hay un jugador más, el de la
 * máquina, y no cabe en el formato) y ONLINE lo simula el anfitrión: en esos
 * dos no hay nada que guardar y el botón no sale.
 *
 * DOBLE COBRO, LO QUE HAY QUE TENER CLARO: una partida se cobra una sola vez
 * (experiencia, monedas, récord, historial y top mundial) y eso pasa en
 * Game.closeRun. Guardar y cobrar se excluyen a propósito:
 *   - GUARDAR Y SALIR deja la partida guardada y NO la cobra.
 *   - Cerrar la pestaña tampoco la cobra: se guarda donde iba (alIrse) y se
 *     cobra al acabarla. También una CLASIFICATORIA: cortarse no es salir, y
 *     al volver solo se puede seguir o descartarla (descartar cuenta). En
 *     PARTY se guarda el ASIENTO el plazo de VOLVER A LA PARTIDA y se cobra
 *     al acabarla o, si no se vuelve, como una salida (cobrarRed). Lo demás
 *     que no se puede guardar se cobra al cerrar, como si se saliera al menú.
 *   - Cualquier final de verdad (GAME OVER, rendirse, salir al menú,
 *     reiniciar) la cobra Y BORRA el guardado, y la apunta como CERRADA
 *     también en la nube: la copia de otro aparato deja de valer.
 * Así nunca se cobra dos veces lo mismo ni queda una partida cobrada que se
 * pueda seguir jugando.
 *
 * LO QUE SE PIERDE AL RETOMAR EN OTRO APARATO: los logros y los retos del
 * DAILY se apuntan según pasan las cosas, no al final, así que lo de la
 * primera mitad se apuntó en el aparato donde se jugó. Durante la
 * recuperación NO se vuelven a contar (el juego está en modo repetición): es
 * a propósito, porque contarlos otra vez sería inflarlos a quien retoma en el
 * mismo sitio, y pasarse de menos es menos malo que pasarse de más. Los
 * PUNTOS no se pierden: la partida sigue con su marcador y al acabar se cobra
 * entera.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  /* Modos que sí se pueden guardar, tal y como los nombra la repetición */
  var MODOS_OK = { solo: 1, duo: 1, hab: 1, habduo: 1, vs: 1, habvs: 1 };

  /* PARTIDAS CERRADAS (28 sep 2026). Una partida guardada que se retoma en
   * OTRO aparato y se acaba allí se cobra allí... y la copia de aquí seguía
   * viva: se podía continuar y cobrar otra vez (y una CLASIFICATORIA
   * descartada aquí volvía a contar para el rango). Ahora cada partida lleva
   * un id (sale de la fecha de su repetición, así que el mismo en todos los
   * aparatos) y al cerrarla ese id se apunta en una lista que viaja con la
   * cuenta (dentro de la columna `partida`, como lápida o pegada a la
   * siguiente guardada). Una copia cuyo id está en la lista ya no vale. */
  var CERRADAS_KEY = 'pacman-topmundial-partidas-cerradas';
  var CERRADAS_MAX = 20;
  /* Lo último que se quiso dejar en la nube y aún no ha llegado: se reintenta
   * (una lápida perdida por un corte de red era justo el doble cobro). */
  var NUBE_PEND_KEY = 'pacman-topmundial-partida-nube-pend';
  /* La CLASIFICATORIA de party que estaba en marcha cuando se escondió la
   * pestaña. Si la página muere sin avisar (el móvil la mata), al volver a
   * abrir el juego cuenta para el rango como una salida. */
  var TESTIGO_KEY = 'pacman-topmundial-clasif-viva';
  /* VOLVER A LA PARTIDA (28 sep 2026). La partida de party (o la que se
   * estaba mirando) que está en marcha en esta pestaña: la sala, el asiento
   * y el sid con el que se juega, más lo que habría que cobrar si no se
   * vuelve. Se reescribe cada segundo (`f` dice cuándo seguía viva) y se
   * borra al cerrarse la partida. Si la página muere, al abrirla otra vez
   * dentro del plazo se ofrece VOLVER A LA PARTIDA; pasado el plazo, o
   * saliendo de ella, se cobra como una salida (cobrarRed). */
  var RED_KEY = 'pacman-topmundial-red-viva';
  /* ...y el sid de ESTA pestaña (sessionStorage sobrevive a recargarla, no
   * a abrir otra): así se distingue "he recargado" de "hay otra pestaña
   * jugando" */
  var RED_SES_KEY = 'pacman-topmundial-red-sid';
  var OTRA_PESTANYA_MS = 3000;   // un latido de hace menos que esto es de alguien vivo

  function plazoMs() { return CFG.NET.PLAZO_TICKS * 1000 / 60; }

  function sesion(v) {
    try {
      if (typeof sessionStorage === 'undefined' || !sessionStorage) return null;
      if (v === undefined) return sessionStorage.getItem(RED_SES_KEY);
      if (v === null) sessionStorage.removeItem(RED_SES_KEY);
      else sessionStorage.setItem(RED_SES_KEY, v);
    } catch (e) { /* sin almacén de sesión */ }
    return null;
  }

  function G() { return window.PM.Game; }
  function R() { return window.PM.Replay; }

  function leerJson(k) {
    try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; }
  }

  function escribirJson(k, v) {
    try {
      if (v === null || v === undefined) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) { return false; }
  }

  var Guardado = {
    /* reloj del autoguardado, en ticks de la repetición */
    ultimo: -1,
    ultimoNube: -1,
    /* sobre traído de la nube, si es mejor que el de aquí */
    deNube: null,
    /* la recuperación en marcha (para poder cancelarla) */
    tarea: null,
    sinColumna: false,     // la nube todavía no tiene dónde guardarlo
    /* la partida que se está jugando ahora (su id), para apuntarla como
     * cerrada cuando se cobre: al cerrarse, la repetición ya se ha soltado */
    idViva: null,
    repViva: null,
    /* por qué no salió el último guardar(): 'SIN SITIO' | 'DEMASIADO LARGA' | 'NADA' */
    fallo: null,

    /* ---------- el id de una partida ----------
     * La fecha (al milisegundo) en que empezó su repetición y el modo. Viaja
     * dentro de la repetición, así que retomarla en otro aparato da el mismo
     * id sin tener que guardarlo en ningún sitio más. */
    idDeRep: function (rep) {
      if (!rep || !rep.fecha) return null;
      var ms = Date.parse(rep.fecha);
      if (!(ms > 0)) return null;
      return 'p' + ms.toString(36) + '-' + (rep.modo || '');
    },

    /* El de un sobre: lo lleva dentro; los de antes de esto, de su repetición */
    idDe: function (sobre) {
      if (!sobre || typeof sobre !== 'object') return null;
      if (typeof sobre.id === 'string' && sobre.id) return sobre.id;
      if (typeof sobre.rep !== 'string') return null;
      if (this.memoId && this.memoId.rep === sobre.rep) return this.memoId.id;
      var r = R(), rep = r ? r.leer(sobre.rep) : null;
      var id = this.idDeRep(rep);
      this.memoId = { rep: sobre.rep, id: id };
      return id;
    },
    memoId: null,

    cerradas: function () {
      var l = leerJson(CERRADAS_KEY);
      if (!Array.isArray(l)) return [];
      return l.filter(function (x) { return typeof x === 'string' && x.length <= 40; });
    },

    estaCerrada: function (id) {
      return !!id && this.cerradas().indexOf(id) !== -1;
    },

    /* Apunta ids como cerrados (los de aquí y los que traiga la nube) */
    aprender: function (ids) {
      if (!Array.isArray(ids) || !ids.length) return false;
      var l = this.cerradas(), nuevo = false;
      for (var i = ids.length - 1; i >= 0; i--) {
        var id = ids[i];
        if (typeof id !== 'string' || !id || id.length > 40 || l.indexOf(id) !== -1) continue;
        l.unshift(id);
        nuevo = true;
      }
      if (nuevo) escribirJson(CERRADAS_KEY, l.slice(0, CERRADAS_MAX));
      return nuevo;
    },

    /* =========================================================
     * EL SOBRE
     * Un JSON pequeño con la repetición cortada dentro:
     *   { v, rep, t, maze, p, dl, st, lv, j, modo, fecha, quien }
     * `t` es el tick de la repetición por el que iba —el único dato que hace
     * falta para saber dónde parar al recuperarla— y `p`/`dl`/`st` son la
     * huella con la que se comprueba que la recuperación ha salido igual.
     * ========================================================= */

    /* ¿Hay ahora mismo una partida que se pueda guardar? */
    puedeGuardar: function () {
      var g = G(), r = R();
      if (!g || !r) return false;
      if (!g.inGame() || g.state === 'GAME_OVER' || g.state === 'CONTINUE') return false;
      if (g.replaying || g.netRole || g.isSpec()) return false;
      var rep = r.enCurso();
      return !!(rep && MODOS_OK[rep.modo]);
    },

    /* ---------- partidas PREPARADAS ----------
     * Un sobre normal es una repetición desde el primer tick: se vuelve a
     * jugar entera y sale la misma partida. Pero hay estados que no vienen de
     * ahí —una partida montada a mano para probar algo, o para rescatar una
     * que se perdió— y que tampoco se pueden reconstruir jugando, porque
     * nunca se jugaron así.
     *
     * Para eso está `arranque`: el sobre dice de qué punto se parte (marcador
     * y laberinto a medio comer) y la repetición cuenta lo jugado DESDE AHÍ.
     * El resto no cambia: se monta la partida, se aplica el arranque, se
     * simulan las entradas que haya y al final se comprueba que cuadra, igual
     * que siempre. Una partida así sigue cobrándose entera cuando termina,
     * como cualquier otra: lo preparado cuenta como jugado.
     *
     * El nivel y las vidas no van aquí: son ajustes de la partida y viajan
     * donde viajan siempre, en la repetición (`nivel`, `ajustes.vidas`), así
     * que montarla ya los deja puestos sin tocar los ajustes de nadie. */
    aplicarArranque: function (a) {
      var g = G();
      if (!a) return;
      if (typeof a.pellets === 'string' && a.pellets) {
        g.ponerPelletHex(a.pellets);          // recalcula las que quedan
      }
      if (typeof a.comidos === 'number') g.dotsEaten = a.comidos;
      if (typeof a.puntos === 'number') g.score = a.puntos;
      /* Se queda pegado a la partida para que, si se vuelve a dejar a medias,
       * el siguiente sobre parta del mismo sitio: sin esto, al retomarla otra
       * vez el marcador empezaría de cero y no cuadraría nada. */
      g.arranque = a;
      g.syncUI();
    },

    /* La partida de ahora mismo, en sobre. null si no hay nada que guardar */
    sobreDeAhora: function () {
      if (!this.puedeGuardar()) return null;
      var g = G(), r = R();
      var enCurso = r.enCurso();
      /* La repetición se serializa con un `final`, que en una partida
       * terminada es cómo acabó. Aquí se le pone CÓMO VA: sirve igual para el
       * formato y de paso es justo lo que se enseña en la portada. */
      var rep = {};
      for (var k in enCurso) {
        if (enCurso.hasOwnProperty(k)) rep[k] = enCurso[k];
      }
      rep.final = {
        puntos: g.score,
        nivel: g.level,
        fantasmas: g.runGhosts,
        tiempoMs: Math.round(g.timeTicks * 1000 / 60)
      };
      if (!(rep.final.puntos > 0)) return null;   // de cero no se guarda nada
      var texto = r.serializar(rep);
      if (!texto || texto.length > CFG.SAVE_MAX_CHARS) {
        if (texto) this.fallo = 'DEMASIADO LARGA';
        return null;
      }
      var A = window.PM.Account;
      return {
        v: CFG.SAVE_V,
        id: this.idDeRep(enCurso),
        // lo cerrado que se sabe aquí: viaja con la guardada a la nube
        cz: this.cerradas().slice(0, 10),
        rep: texto,
        t: r.t,
        maze: g.mazeId || null,
        p: g.score,
        dl: g.dotsLeft,
        st: g.state,
        lv: g.level,
        j: g.playerCount,
        modo: rep.modo,
        cl: g.clasif ? 1 : 0,     // CLASIFICATORIA: se enseña así y cuenta al descartarla
        // de dónde partía, si no partía del principio (partida preparada)
        arranque: g.arranque || null,
        fecha: Date.now(),
        quien: (A && A.logged()) ? A.name() : ''
      };
    },

    /* ---------- almacén de aquí ---------- */
    leer: function () {
      var o = null;
      try {
        var raw = localStorage.getItem(CFG.SAVE_KEY);
        if (!raw) return null;
        o = JSON.parse(raw);
      } catch (e) { return null; }
      if (!this.valido(o)) return null;
      /* Se acabó (y se cobró) en otro aparato: la copia de aquí ya no vale */
      if (this.estaCerrada(this.idDe(o))) {
        this.escribir(null);
        return null;
      }
      return o;
    },

    escribir: function (sobre) {
      try {
        if (sobre) localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(sobre));
        else localStorage.removeItem(CFG.SAVE_KEY);
        return true;
      } catch (e) { return false; }   // sin almacenamiento: se juega igual
    },

    valido: function (o) {
      return !!(o && typeof o === 'object' && o.v === CFG.SAVE_V &&
        typeof o.rep === 'string' && o.rep &&
        typeof o.t === 'number' && o.t >= 0 &&
        typeof o.p === 'number' && o.p > 0 && MODOS_OK[o.modo]);
    },

    /* La partida guardada que vale: la de aquí o la de la nube, la más
     * reciente de las dos. Si la de aquí es de OTRA cuenta, manda la de la
     * nube: son partidas de personas distintas. */
    sobre: function () {
      var local = this.leer();
      var nube = this.deNube;
      if (nube && this.estaCerrada(this.idDe(nube))) nube = this.deNube = null;
      if (!nube) return local;
      if (!local) return nube;
      var A = window.PM.Account;
      var yo = (A && A.logged()) ? A.name() : '';
      if (yo && local.quien && local.quien !== yo) return nube;
      return (nube.fecha > local.fecha) ? nube : local;
    },

    hay: function () { return !!this.sobre(); },

    /* =========================================================
     * GUARDAR
     * ========================================================= */
    /* Un paso del juego (Game.step). Guarda cada pocos segundos: lo que se
     * pierde si se va la luz es, como mucho, lo que quepa entre dos. */
    paso: function () {
      this.pasoRed();
      var r = R();
      if (!r) return;
      /* qué partida es la que corre (para apuntarla como cerrada al cobrarla) */
      var viva = r.enCurso();
      if (viva !== this.repViva) {
        this.repViva = viva;
        this.idViva = (viva && MODOS_OK[viva.modo]) ? this.idDeRep(viva) : null;
      }
      if (!this.puedeGuardar()) return;
      /* Partida nueva: su reloj empieza de cero, así que el de la anterior no
       * vale. Sin esto, tras una partida larga la siguiente se quedaría sin
       * guardar sus primeros minutos. */
      if (r.t < this.ultimo) { this.ultimo = -1; this.ultimoNube = -1; }
      var cada = (G().clasif && CFG.SAVE_EVERY_CLASIF) || CFG.SAVE_EVERY;
      if (this.ultimo >= 0 && (r.t - this.ultimo) < cada) return;
      this.guardar();
    },

    /* Guarda ya. `alaNube` fuerza la subida sin esperar a que toque.
     * Devuelve el sobre solo si quedó ESCRITO aquí: con el almacén lleno
     * (28 sep) no se da por guardada, y `fallo` dice por qué. */
    guardar: function (alaNube, alIrse) {
      var r = R();
      this.fallo = null;
      var sobre = this.sobreDeAhora();
      if (!sobre) {
        if (!this.fallo) this.fallo = 'NADA';
        return null;
      }
      this.ultimo = r.t;
      var escrito = this.escribir(sobre);
      if (alaNube || this.ultimoNube < 0 ||
          (r.t - this.ultimoNube) >= CFG.SAVE_CLOUD_EVERY) {
        this.ultimoNube = r.t;
        this.subir(sobre, alIrse);
      }
      /* La portada no se toca aquí: mientras se juega no se ve, y volver a
       * ella ya la refresca (UI.showMenu). Así el autoguardado no relee el
       * almacén cada cinco segundos por nada. */
      if (!escrito) { this.fallo = 'SIN SITIO'; return null; }
      return sobre;
    },

    /* Se acabó la partida de verdad (Game.closeRun): ya se ha cobrado, así
     * que no hay nada que continuar. La partida queda apuntada como CERRADA
     * (aquí y en la nube): una copia suya en otro aparato ya no se puede
     * seguir. `id` es el de la que se cierra; sin él, la que se estaba
     * jugando. */
    borrar: function (id) {
      id = id || this.idViva;
      this.idViva = null;
      this.repViva = null;
      this.ultimo = -1;
      this.ultimoNube = -1;
      this.deNube = null;
      if (id) this.aprender([id]);
      this.escribir(null);
      this.subir(null);
      if (window.PM.UI && window.PM.UI.refreshContinuar) {
        window.PM.UI.refreshContinuar();
      }
    },

    /* Descartar la guardada sin terminarla (EMPEZAR UNA NUEVA, DESCARTARLA).
     * Si era CLASIFICATORIA, cuenta para el rango con los puntos que llevaba:
     * si no, cerrar la pestaña al ir mal sería la forma de no perder PR. Solo
     * si es de este mes y de quien tiene la sesión. */
    descartar: function () {
      var sb = this.sobre(), r = R(), Rg = window.PM.Rango, S = window.PM.Season;
      var A = window.PM.Account;
      var rep = (sb && r) ? r.leer(sb.rep) : null;
      if (rep && rep.ajustes && rep.ajustes.clasif && Rg && Rg.conCuenta() &&
          (!sb.quien || (A && A.name && sb.quien === A.name())) &&
          (!S || S.actual(new Date(sb.fecha)) === Rg.temporada())) {
        Rg.apuntar(Math.max(0, sb.p || 0), sb.j || 1, sb.lv || 1, rep.ajustes.roles || null);
        if (A && A.pushQuiet) A.pushQuiet();
      }
      /* descartada es cerrada: una copia en otro aparato tampoco vuelve a
       * contar. Se descarta desde el menú, así que no hay ninguna "viva". */
      this.idViva = null;
      this.borrar(this.idDe(sb));
    },

    /* GUARDAR Y SALIR, desde el menú de pausa. Deja la partida guardada y se
     * va al menú SIN cobrarla: la bandera `salvada` es lo que hace que
     * Game.closeRun no la dé por terminada. Si no se pudo escribir (almacén
     * lleno, partida demasiado larga) devuelve false y la partida sigue:
     * darla por guardada sería perderla. */
    guardarYSalir: function () {
      var g = G(), r = R();
      if (!this.guardar(true)) return false;
      g.salvada = true;
      g.toMenu();
      if (r) r.salir(true);      // la grabación se suelta sin guardarla
      // no se ha cerrado: queda a medias, así que no es la "viva" de nadie
      this.idViva = null;
      this.repViva = null;
      return true;
    },

    /* =========================================================
     * LA PESTAÑA SE CIERRA O SE ESCONDE EN PLENA PARTIDA (28 sep 2026)
     * Antes cerrar o recargar tiraba lo jugado desde el último autoguardado,
     * y en party (que no se guarda) la partida entera: ni experiencia, ni
     * monedas, ni maestría, ni historial, y una CLASIFICATORIA abandonada así
     * no contaba para el rango (la forma de no perder PR).
     *   - Lo que se puede continuar se GUARDA (al esconderse y al irse): se
     *     cobra entero al acabarla, como siempre.
     *   - Lo que no (party, CACERÍA...) se COBRA al irse, por la misma puerta
     *     que SALIR (Game.toMenu): una clasificatoria cuenta como una salida.
     *   - Al esconderse solo se deja un TESTIGO de la clasificatoria de party:
     *     esconderse no es irse, pero en el móvil la página puede morir sin
     *     avisar, y entonces cuenta al volver a abrir el juego.
     * VOLVER A LA PARTIDA (28 sep, tarde): en PARTY cerrar ya no es irse.
     * El asiento se guarda el plazo (Game.reservarAsiento: el anfitrión deja
     * el mando sin darse por ido, el invitado avisa de que falta) y aquí
     * queda apuntado a qué partida volver (RED_KEY). No se cobra: se cobra
     * al acabarla, si se vuelve, o como una salida si no (cobrarRed). Solo
     * se cobra al cerrar, como antes, si no hay con quién quedarse.
     * `cierra`: true en pagehide. Devuelve lo que hizo (para las pruebas).
     * ========================================================= */
    alIrse: function (cierra) {
      var g = G();
      if (!g || !g.inGame || !g.inGame() || g.replaying || this.tarea) return null;
      if (g.isSpec && g.isSpec()) { this.apuntarRed(); return null; }
      if (this.puedeGuardar()) {
        return this.guardar(true, !!cierra) ? 'guardada' : null;
      }
      if (!cierra) {
        var red = this.apuntarRed();
        return this.apuntarTestigo() ? 'testigo' : (red ? 'red' : null);
      }
      if (g.netRole && this.apuntarRed() && g.reservarAsiento && g.reservarAsiento()) {
        this.apuntarTestigo();
        return 'reservada';
      }
      g.toMenu();
      this.quitarTestigo();
      return 'cobrada';
    },

    /* =========================================================
     * VOLVER A LA PARTIDA (28 sep 2026) — lo que queda en este aparato
     * ========================================================= */
    /* El latido (Guardado.paso, cada paso del juego): cada segundo, mientras
     * haya una partida de red sin cobrar. Y si se está jugando OTRA que no es
     * la que quedó cortada, aquella se cobra ya: no se puede tener una a
     * medias y empezar otra. */
    redTick: 0,
    redPend: null,       // la que quedó cortada al abrir la página (o null)

    /* El almacén es { sid: partida }: una por pestaña. Dos pestañas del mismo
     * navegador pueden estar cada una en su partida (o en la misma, con
     * ?red=local), y ninguna debe pisar lo de la otra. */
    redMapa: function () {
      var m = leerJson(RED_KEY);
      return (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
    },

    redGuarda: function (m) {
      for (var k in m) {
        if (m.hasOwnProperty(k)) return escribirJson(RED_KEY, m);
      }
      return escribirJson(RED_KEY, null);
    },

    redQuita: function (sid) {
      var m = this.redMapa();
      if (!sid || !m.hasOwnProperty(sid)) return;
      delete m[sid];
      this.redGuarda(m);
    },

    /* La partida cortada que le toca a esta pestaña: la suya (la sesión de
     * la pestaña sobrevive a recargarla) o, si no, la más reciente de una
     * página muerta. Un latido de hace menos de OTRA_PESTANYA_MS es de otra
     * pestaña que sigue jugando: esa no se toca. Las que pasaron el plazo se
     * cobran aquí mismo (ya no hay a qué volver); `redCobradas` dice cuántas. */
    redCandidata: function () {
      var m = this.redMapa(), ahora = Date.now(), caducas = [], k, r;
      this.redCobradas = 0;
      for (k in m) {
        if (!m.hasOwnProperty(k)) continue;
        r = m[k];
        if (!r || typeof r !== 'object' || !r.code || !r.sid || ahora - (r.f || 0) > plazoMs()) {
          caducas.push(r);
          delete m[k];
        }
      }
      if (caducas.length) {
        this.redGuarda(m);
        for (var c = 0; c < caducas.length; c++) {
          if (caducas[c] && caducas[c].code) { this.redCobradas++; this.cobrarRed(caducas[c]); }
        }
      }
      var mia = sesion();
      if (mia && m.hasOwnProperty(mia)) return m[mia];
      var elegida = null;
      for (k in m) {
        if (!m.hasOwnProperty(k)) continue;
        r = m[k];
        if (ahora - (r.f || 0) < OTRA_PESTANYA_MS) continue;
        if (!elegida || r.f > elegida.f) elegida = r;
      }
      return elegida;
    },

    pasoRed: function () {
      var g = G();
      if (!g || !g.inGame || !g.inGame() || g.replaying) return;
      if (this.redPend) {
        var p = this.redPend, N = window.PM.Net;
        this.redPend = null;
        var misma = g.netRole && N && N.sid === p.sid &&
          (p.spec ? N.viewCode === p.code : N.code === p.code);
        if (!misma) this.salirDeRed(p);
      }
      if (!g.netRole || g.xpSent || g.netNotice || g.state === 'GAME_OVER') return;
      if (++this.redTick < 60) return;
      this.redTick = 0;
      this.apuntarRed();
    },

    /* Apunta (o refresca) la partida de red de ahora. Devuelve si pudo */
    apuntarRed: function () {
      var g = G(), N = window.PM.Net, A = window.PM.Account, Rg = window.PM.Rango;
      if (!g || !N || !g.netRole || !g.inGame() || g.replaying || g.xpSent) return false;
      var spec = g.isSpec();
      var code = spec ? N.viewCode : N.code;
      if (!code || !N.sid) return false;
      var rec = {
        v: 1, code: code, sid: N.sid, i: spec ? -1 : g.localIdx, spec: spec ? 1 : 0,
        host: g.rawName(g.hostIdx) || '', n: g.playerCount,
        modo: g.clasif ? 'CLASIFICATORIA' : g.caza ? 'CACERÍA' : g.superv ? 'SUPERVIVENCIA'
          : g.hab ? 'DESATADO' : (g.isVersus && g.isVersus()) ? 'PAC-MAN VS.' : 'PARTY',
        p: spec ? 0 : Math.max(0, g.myPoints() || 0),
        s: Math.round((g.timeTicks || 0) / 60), lv: g.level || 1,
        tags: spec ? null : g.achTags(),
        roles: g.roles ? g.roles.slice() : null,
        // ¿contaba para el rango? (se mira ahora: después ya no hay partida)
        cl: (!spec && Rg && !Rg.porQueNo(g)) ? 1 : 0,
        t: Rg ? Rg.temporada() : '',
        quien: (A && A.logged && A.logged()) ? A.name() : '',
        f: Date.now()
      };
      sesion(N.sid);
      var m = this.redMapa();
      m[N.sid] = rec;
      return this.redGuarda(m);
    },

    /* Se cerró la partida aquí (Game.closeRun): ya no hay a qué volver */
    redCerrada: function () {
      this.redTick = 0;
      var N = window.PM.Net;
      if (N && N.sid) this.redQuita(N.sid);
    },

    /* La partida cortada a la que se puede volver ahora mismo, o null (ver
     * redCandidata: pasado el plazo ya no hay a qué volver y se cobra) */
    paraVolver: function () {
      var g = G();
      if (g && g.inGame && g.inGame()) return null;
      var rec = this.redCandidata();
      if (!rec && this.redPend && !this.redMapa()[this.redPend.sid]) this.redPend = null;
      return rec;
    },

    /* Cuánto le queda al plazo de esa partida, en segundos */
    quedaRed: function (rec) {
      return Math.max(0, Math.ceil((plazoMs() - (Date.now() - ((rec && rec.f) || 0))) / 1000));
    },

    /* Se volvió a la partida (Party.volver + UI): lo apuntado pasa a ser la
     * partida en marcha, y el testigo sobra (la partida se cobrará al acabar) */
    redRetomada: function () {
      this.redPend = null;
      this.quitarTestigo();
      this.apuntarRed();
    },

    /* SALIR DE ELLA, o no se pudo volver: cuenta como una salida */
    salirDeRed: function (rec) {
      rec = rec || this.redCandidata();
      this.redPend = null;
      if (!rec) return null;
      this.redQuita(rec.sid);
      if (window.PM.Party && window.PM.Party.despedirse && !rec.spec) {
        try { window.PM.Party.despedirse(rec); } catch (e) { /* sin red: esperan el plazo */ }
      }
      return this.cobrarRed(rec);
    },

    /* Cobrar una partida de red que ya no está: lo que se habría cobrado al
     * salir de ella (Game.closeRun) y se puede rehacer sin la partida
     * delante: la experiencia, las monedas, la partida jugada con su mejor
     * marca y su tiempo y, si era CLASIFICATORIA, el rango. (La maestría de
     * rol y el historial necesitan la partida entera y se pierden, como
     * antes con una página que moría escondida.) Solo si es de la cuenta que
     * hay ahora (o de nadie, sin cuenta). Devuelve lo que cobró. */
    cobrarRed: function (rec) {
      this.quitarTestigo();              // lo del rango va aquí: no se cuenta dos veces
      if (!rec || typeof rec !== 'object' || rec.spec) return null;
      var A = window.PM.Account, Rg = window.PM.Rango, L = window.PM.Level;
      var Ac = window.PM.Achievements, Tn = window.PM.Tienda;
      var yo = (A && A.logged && A.logged()) ? A.name() : '';
      if (rec.quien && yo && yo !== rec.quien) return null;          // de otra cuenta
      if (rec.quien && !yo && !(A && A.savedSession && A.savedSession())) return null;
      var pts = Math.max(0, Math.floor(rec.p) || 0), seg = Math.max(0, rec.s | 0);
      var out = { puntos: pts, rango: null };
      if (Ac && Ac.recordFor && Array.isArray(rec.tags)) {
        Ac.recordFor(rec.tags, {
          partidas: 1, puntosMax: pts, tiempo: seg,
          largas: (seg >= CFG.COFRES.PARTIDA_LARGA_S) ? 1 : 0
        });
      }
      if (Tn && Tn.ganarPartida) Tn.ganarPartida(pts, seg);
      if (L && L.add && pts > 0) {
        var nuevo = L.add(pts);
        if (nuevo && window.PM.Celebrar) window.PM.Celebrar.nivel(nuevo);
      }
      if (rec.cl && rec.quien && Rg && rec.t === Rg.temporada()) {
        out.rango = Rg.apuntar(pts, Math.max(1, rec.n | 0), Math.max(1, rec.lv | 0),
          Array.isArray(rec.roles) ? rec.roles : null);
      }
      if (A && A.pushQuiet) A.pushQuiet();
      return out;
    },

    /* Antes de empezar otra partida de party (Party.begin): la cortada a la
     * que no se volvió cuenta ya, y si la nueva es CLASIFICATORIA, también
     * la clasificatoria a solas que quedara a medias (descartarla cuenta). */
    antesDeOtra: function (clasif) {
      /* (una partida que se cierra aquí borra lo suyo, así que lo que haya
       * es de una anterior que no se cerró) */
      var rec = this.redPend || this.redCandidata();
      if (rec && rec.code) this.salirDeRed(rec);
      var sb = this.sobre();
      if (clasif && sb && sb.cl) this.descartar();
    },

    /* Al abrir el juego: la partida de red que se cortó. Dentro del plazo se
     * deja para que la interfaz pregunte (VOLVER A LA PARTIDA); pasado, se
     * cobra. Sin ella, lo de siempre: el testigo de la clasificatoria. */
    alAbrir: function () {
      var rec = this.redCandidata();
      if (rec) {
        this.redPend = rec;
        return 'pendiente';
      }
      if (this.redCobradas) return 'cobrada';
      // lo que quede es de otra pestaña que sigue jugando: su testigo es suyo
      for (var k in this.redMapa()) return null;
      return this.revisarTestigo() ? 'testigo' : null;
    },

    /* La clasificatoria de party de ahora mismo, por si la página muere */
    apuntarTestigo: function () {
      var g = G(), Rg = window.PM.Rango, A = window.PM.Account;
      if (!g || !g.netRole || !Rg || Rg.porQueNo(g) || !A || !A.logged()) {
        this.quitarTestigo();
        return false;
      }
      return escribirJson(TESTIGO_KEY, {
        p: Math.max(0, g.score || 0), j: g.playerCount || 1, lv: g.level || 1,
        roles: g.roles ? g.roles.slice() : null, quien: A.name(),
        t: Rg.temporada(), fecha: Date.now()
      });
    },

    quitarTestigo: function () { escribirJson(TESTIGO_KEY, null); },
    testigo: function () { return leerJson(TESTIGO_KEY); },

    /* Al abrir el juego: si quedó un testigo, la página murió en plena
     * clasificatoria de party. Cuenta como salir (si sigue la misma sesión y
     * la misma temporada). Lo apuntado entra en lo pendiente de la cuenta y
     * sube con la siguiente sincronización. */
    revisarTestigo: function () {
      var t = leerJson(TESTIGO_KEY), Rg = window.PM.Rango, A = window.PM.Account;
      if (!t) return null;
      this.quitarTestigo();
      if (typeof t !== 'object' || !t.quien || !Rg || !A) return null;
      if (!A.savedSession || !A.savedSession()) return null;
      if (A.logged() && A.name() && A.name() !== t.quien) return null;
      if (t.t !== Rg.temporada()) return null;
      return Rg.apuntar(Math.max(0, Math.floor(t.p) || 0), Math.max(1, t.j | 0),
        Math.max(1, t.lv | 0), Array.isArray(t.roles) ? t.roles : null);
    },

    /* Al cerrar sesión: lo de esta cuenta que vive aquí se olvida */
    olvidarLocal: function () {
      this.ultimo = -1;
      this.ultimoNube = -1;
      this.deNube = null;
      this.idViva = null;
      this.repViva = null;
      escribirJson(NUBE_PEND_KEY, null);
      this.quitarTestigo();
      escribirJson(RED_KEY, null);       // y la party cortada, que era suya
      this.redPend = null;
    },

    /* =========================================================
     * LA NUBE — para poder seguirla en otro aparato
     * Va por su cuenta y en silencio: si no hay cuenta, si no hay red o si
     * el proyecto todavía no tiene la columna, el juego sigue igual y la
     * partida se queda guardada aquí.
     * ========================================================= */
    /* Sin partida (`sobre` null) no se sube un vacío sino una LÁPIDA: la
     * lista de las cerradas, para que el otro aparato sepa que su copia ya
     * no vale. Lo que se manda queda apuntado hasta que la nube diga que sí
     * (NUBE_PEND_KEY) y se reintenta en la siguiente sincronización. */
    subir: function (sobre, alIrse) {
      var self = this;
      var A = window.PM.Account;
      if (!A || !A.guardarPartida) return;
      /* sin sesión ahora pero con una guardada (se abrió sin red): se apunta
       * igual y sube cuando vuelva */
      var luego = !A.logged() && A.savedSession && A.savedSession();
      if (!A.logged() && !luego) return;
      var texto = JSON.stringify(sobre || this.lapida());
      var fecha = sobre ? sobre.fecha : Date.now();
      escribirJson(NUBE_PEND_KEY, { f: fecha, s: texto });
      if (this.sinColumna || !A.logged()) return;
      A.guardarPartida(texto, function (err) {
        if (err === 'SIN COLUMNA') self.sinColumna = true;
        if (err) return;
        var p = leerJson(NUBE_PEND_KEY);
        if (p && p.s === texto) escribirJson(NUBE_PEND_KEY, null);
      }, alIrse);
    },

    lapida: function () {
      return { v: CFG.SAVE_V, fin: 1, cz: this.cerradas().slice(0, 10), fecha: Date.now() };
    },

    /* Lo que se quiso dejar en la nube y no llegó. Solo si sigue siendo lo
     * más nuevo: lo que otro aparato haya subido después no se pisa. */
    reintentarNube: function (enNube) {
      var p = leerJson(NUBE_PEND_KEY);
      if (!p || typeof p.s !== 'string') return false;
      var suya = (enNube && typeof enNube.fecha === 'number') ? enNube.fecha : 0;
      if (suya > (p.f || 0)) {
        escribirJson(NUBE_PEND_KEY, null);
        /* Lo de allí es más nuevo y se queda... pero con lo cerrado de aquí
         * pegado, que es lo que no se puede perder por el camino. */
        var cz = Array.isArray(enNube.cz) ? enNube.cz : [];
        var faltan = this.cerradas().filter(function (id) { return cz.indexOf(id) === -1; });
        if (faltan.length) {
          var copia = {};
          for (var k in enNube) if (enNube.hasOwnProperty(k)) copia[k] = enNube[k];
          copia.cz = faltan.concat(cz).slice(0, 10);
          if (this.valido(copia) || copia.fin) this.subir(copia.fin ? null : copia);
        }
        return false;
      }
      var o = null;
      try { o = JSON.parse(p.s); } catch (e) { o = null; }
      if (!o) { escribirJson(NUBE_PEND_KEY, null); return false; }
      /* una lápida sale nueva (con todo lo cerrado hasta hoy), y una guardada
       * que entretanto se cerró ya no se sube: va su lápida */
      if (o.fin || (this.valido(o) && this.estaCerrada(this.idDe(o)))) o = null;
      this.subir(o);
      return true;
    },

    /* Lo que traiga la cuenta al entrar (js/account.js, applyRemote). Solo se
     * queda si es MÁS NUEVO que lo de aquí: quien acaba de jugar en este
     * aparato no puede perderlo por lo que hubiera en la nube.
     *
     * Y antes que nada, lo CERRADO que traiga (lápida o lista pegada a una
     * guardada): si la copia de aquí se acabó en otro aparato, se tira. */
    desdeNube: function (texto) {
      var o = null;
      try { o = texto ? JSON.parse(texto) : null; } catch (e) { o = null; }
      if (o && typeof o === 'object' && Array.isArray(o.cz)) this.aprender(o.cz);
      this.reintentarNube(o && typeof o === 'object' ? o : null);
      var local = this.leer();          // la tira si estaba cerrada
      if (!this.valido(o) || this.estaCerrada(this.idDe(o))) {
        this.deNube = null;
      } else {
        this.deNube = (local && local.fecha >= o.fecha) ? null : o;
      }
      if (window.PM.UI && window.PM.UI.refreshContinuar) {
        window.PM.UI.refreshContinuar();
      }
    },

    /* =========================================================
     * RETOMAR
     * Se vuelve a jugar la partida a toda velocidad —sin pintar y sin sonido—
     * hasta el tick en que se guardó, y entonces el mando pasa al jugador.
     * `avance(x)` recibe el progreso (0..1) y `hecho(err)` el resultado.
     * ========================================================= */
    retomar: function (avance, hecho) {
      var self = this;
      var A = window.PM.Account;
      var elegida = this.sobre();
      if (!elegida) { if (hecho) hecho('NO HAY'); return; }
      /* Con cuenta, antes de rehacerla se mira la nube una vez más: si se
       * acabó en otro aparato (y ahí ya se cobró), aquí no se puede seguir.
       * Sin red se sigue: no hay forma de saberlo. */
      if (A && A.logged && A.logged() && A.leerPartida && !this.sinColumna) {
        // mientras contesta la nube también se puede CANCELAR
        var espera = this.tarea = { vivo: true };
        A.leerPartida(function (err, texto) {
          if (self.tarea === espera) self.tarea = null;
          if (!espera.vivo) { if (hecho) hecho('CANCELADA'); return; }
          if (!err) self.desdeNube(texto);
          if (self.estaCerrada(self.idDe(elegida)) || !self.sobre()) {
            if (hecho) hecho('CERRADA');
            return;
          }
          self.rehacer(avance, hecho);
        });
        return;
      }
      this.rehacer(avance, hecho);
    },

    rehacer: function (avance, hecho) {
      var self = this;
      var g = G(), r = R();
      var sobre = this.sobre();
      function fin(err) {
        self.tarea = null;
        g.simulandoFuera = false;
        self.sonido(true);
        if (hecho) hecho(err);
      }
      if (!sobre) { if (hecho) hecho('NO HAY'); return; }
      var rep = r.leer(sobre.rep);
      if (!rep) { if (hecho) hecho('ROTA'); return; }

      /* El sobre viaja con el `final` de cómo iba la partida; al montarla otra
       * vez no es el final de nada, así que se ignora: lo único que importa es
       * el tick al que hay que llegar. */
      var objetivo = sobre.t;
      this.sonido(false);
      g.simulandoFuera = true;          // el bucle del juego no mete pasos
      this.tarea = { vivo: true };
      var tarea = this.tarea;
      r.montar(rep, { maze: sobre.maze || null });
      // una partida preparada no empieza donde empiezan las demás
      if (sobre.arranque) this.aplicarArranque(sobre.arranque);

      var pasos = 0;
      /* Deja el juego en el menú y suelta la repetición a medio reproducir */
      function recoge() {
        if (g.inGame()) g.toMenu();
        r.salir(true);
      }
      function trozo() {
        if (!tarea.vivo) { recoge(); fin('CANCELADA'); return; }
        var hasta = Date.now() + CFG.SAVE_MS_TROZO;
        while (r.t < objetivo && pasos < CFG.SAVE_MAX_PASOS) {
          g.step();
          pasos++;
          /* Si la partida se acaba antes de tiempo, la simulación no ha salido
           * como aquel día y no hay nada que retomar. */
          if (g.state === 'GAME_OVER' || g.state === 'MENU') break;
          if ((pasos & 1023) === 0 && Date.now() >= hasta) break;
        }
        /* Que se acabe antes de llegar es divergencia, aunque el último paso
         * haya alcanzado el tick: la partida se guardó viva. */
        if (g.state === 'GAME_OVER' || g.state === 'MENU' ||
            pasos >= CFG.SAVE_MAX_PASOS) {
          recoge();
          fin('NO CUADRA');
          return;
        }
        if (r.t >= objetivo) { self.tomarMando(sobre, fin); return; }
        if (avance) avance(Math.min(0.99, r.t / Math.max(1, objetivo)));
        self.luego(trozo);
      }
      trozo();
    },

    /* Cómo se encadena el siguiente trozo de simulación. Es un método y no un
     * setTimeout suelto para que las pruebas puedan hacerlo de un tirón
     * (sustituyéndolo por `function (fn) { fn(); }`) en vez de tener que
     * esperar a un reloj que en las pruebas no corre. */
    luego: function (fn) { setTimeout(fn, 0); },

    /* Ha llegado al tick guardado: se comprueba que la partida sea la misma y
     * se devuelve el mando.
     *
     * La comprobación es lo que hace que esto sea de fiar. Los puntos siempre
     * se miran; las pastillas que quedaban, solo si la partida se guardó en
     * marcha, porque si se guardó en un "¡LISTO!" o en un cambio de nivel la
     * recuperación se para un pelo antes (el reloj de la repetición no corre
     * en el rótulo) y ahí el laberinto todavía no se ha repartido. */
    tomarMando: function (sobre, fin) {
      var g = G(), r = R();
      var cuadra = (g.score === sobre.p) &&
        (sobre.st !== 'PLAYING' && sobre.st !== 'DYING' ? true :
          (g.dotsLeft === sobre.dl));
      if (!cuadra) {
        if (g.inGame()) g.toMenu();
        r.salir(true);        // se suelta la repetición a medio reproducir
        fin('NO CUADRA');
        return;
      }
      r.retomarMando();
      /* La partida recuperada pasa a ser la de ESTE aparato: si venía de la
       * nube, se escribe aquí y se suelta la copia de allá, que si no seguiría
       * saliendo en la portada como si estuviera a medias. */
      this.escribir(sobre);
      this.deNube = null;
      /* y es la que se está jugando: si se acaba, esta es la que se cierra */
      this.repViva = r.enCurso();
      this.idViva = this.idDe(sobre);
      /* El reloj del autoguardado se pone donde estaba: si se vuelve a cerrar
       * la pestaña en el primer minuto, lo guardado sigue valiendo. */
      this.ultimo = r.t;
      this.ultimoNube = r.t;
      /* Se entra en pausa a propósito: aparecer en marcha en mitad del
       * laberinto, con los fantasmas encima y sin saber dónde está uno, es
       * perder una vida por el reencuentro. El menú de pausa enseña de qué
       * partida se trata en su línea de estado. */
      g.setPaused(true);
      /* Y se dice de qué partida se trata. La bandera dura hasta que se
       * reanuda (Game.setPaused): un aviso con cuenta atrás, como el flash,
       * se apaga solo mientras el jugador todavía se está ubicando. */
      g.retomada = this.titulo(sobre);
      g.syncUI();
      fin(null);
    },

    cancelar: function () {
      if (this.tarea) this.tarea.vivo = false;
    },

    /* Silenciar durante la recuperación: se están volviendo a jugar varios
     * minutos en dos segundos y sonaría a ametralladora. Se deja como estaba
     * (lo que tenga puesto en OPCIONES) al acabar. */
    sonido: function (on) {
      var s = window.PM.settings;
      if (!window.AudioSys || !AudioSys.setMuted) return;
      AudioSys.setMuted(on ? !!(s && s.muted) : true);
    },

    /* =========================================================
     * PARA LA PORTADA
     * ========================================================= */
    /* Cómo se lee la partida guardada: 'DESATADO · 47.320 PUNTOS · NIVEL 5' */
    NOMBRES: {
      solo: 'CLÁSICO', duo: 'DOS JUGADORES', hab: 'DESATADO',
      habduo: 'DESATADO A DOS', vs: 'PAC-MAN VS.', habvs: 'PAC-MAN VS. DESATADO'
    },

    titulo: function (sobre) {
      sobre = sobre || this.sobre();
      if (!sobre) return '';
      var nombre = sobre.maze ? 'LABERINTOS' : sobre.cl ? 'CLASIFICATORIA' : (this.NOMBRES[sobre.modo] || 'PARTIDA');
      return nombre + ' · ' + this.miles(sobre.p) + ' PUNTOS · NIVEL ' + sobre.lv +
        (sobre.arranque ? ' · PREPARADA' : '');
    },

    /* Y cuándo se dejó, en corto: HOY 21:14 · AYER 03:02 · 12/09 19:40 */
    cuando: function (sobre) {
      sobre = sobre || this.sobre();
      if (!sobre) return '';
      var d = new Date(sobre.fecha), h = new Date();
      function p(n) { return (n < 10 ? '0' : '') + n; }
      var hora = p(d.getHours()) + ':' + p(d.getMinutes());
      var dia = new Date(h.getFullYear(), h.getMonth(), h.getDate());
      var suyo = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      var dias = Math.round((dia - suyo) / 86400000);
      if (dias === 0) return 'HOY ' + hora;
      if (dias === 1) return 'AYER ' + hora;
      return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + hora;
    },

    miles: function (n) {
      return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
  };

  window.PM.Guardado = Guardado;

  /* Cerrar, recargar o esconder la pestaña (ver alIrse). La página de
   * pruebas no se engancha: comparte el almacén con el juego de verdad. */
  if (!window.PM_PRUEBAS && window.addEventListener) {
    window.addEventListener('pagehide', function () {
      try { Guardado.alIrse(true); } catch (e) { /* irse no puede fallar */ }
    });
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', function () {
        try {
          if (document.visibilityState === 'hidden') Guardado.alIrse(false);
          else Guardado.quitarTestigo();      // sigue viva: el testigo sobra
        } catch (e) { /* nada */ }
      });
    }
    /* la party que murió con la página, al abrir el juego: dentro del plazo
     * se ofrece volver; si no, se cobra (y el testigo de la clasificatoria) */
    try { Guardado.alAbrir(); } catch (e) { /* nada */ }
  }
})();
