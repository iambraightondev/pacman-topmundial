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
 *   - Cerrar la pestaña de golpe tampoco la cobra: no da tiempo a nada.
 *   - Cualquier final de verdad (GAME OVER, rendirse, salir al menú,
 *     reiniciar) la cobra Y BORRA el guardado.
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

  function G() { return window.PM.Game; }
  function R() { return window.PM.Replay; }

  var Guardado = {
    /* reloj del autoguardado, en ticks de la repetición */
    ultimo: -1,
    ultimoNube: -1,
    /* sobre traído de la nube, si es mejor que el de aquí */
    deNube: null,
    /* la recuperación en marcha (para poder cancelarla) */
    tarea: null,
    sinColumna: false,     // la nube todavía no tiene dónde guardarlo

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
      if (!texto || texto.length > CFG.SAVE_MAX_CHARS) return null;
      var A = window.PM.Account;
      return {
        v: CFG.SAVE_V,
        rep: texto,
        t: r.t,
        maze: g.mazeId || null,
        p: g.score,
        dl: g.dotsLeft,
        st: g.state,
        lv: g.level,
        j: g.playerCount,
        modo: rep.modo,
        // de dónde partía, si no partía del principio (partida preparada)
        arranque: g.arranque || null,
        fecha: Date.now(),
        quien: (A && A.logged()) ? A.name() : ''
      };
    },

    /* ---------- almacén de aquí ---------- */
    leer: function () {
      try {
        var raw = localStorage.getItem(CFG.SAVE_KEY);
        if (!raw) return null;
        var o = JSON.parse(raw);
        return this.valido(o) ? o : null;
      } catch (e) { return null; }
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
      var r = R();
      if (!r || !this.puedeGuardar()) return;
      /* Partida nueva: su reloj empieza de cero, así que el de la anterior no
       * vale. Sin esto, tras una partida larga la siguiente se quedaría sin
       * guardar sus primeros minutos. */
      if (r.t < this.ultimo) { this.ultimo = -1; this.ultimoNube = -1; }
      if (this.ultimo >= 0 && (r.t - this.ultimo) < CFG.SAVE_EVERY) return;
      this.guardar();
    },

    /* Guarda ya. `alaNube` fuerza la subida sin esperar a que toque. */
    guardar: function (alaNube) {
      var r = R();
      var sobre = this.sobreDeAhora();
      if (!sobre) return null;
      this.ultimo = r.t;
      this.escribir(sobre);
      if (alaNube || this.ultimoNube < 0 ||
          (r.t - this.ultimoNube) >= CFG.SAVE_CLOUD_EVERY) {
        this.ultimoNube = r.t;
        this.subir(sobre);
      }
      /* La portada no se toca aquí: mientras se juega no se ve, y volver a
       * ella ya la refresca (UI.showMenu). Así el autoguardado no relee el
       * almacén cada cinco segundos por nada. */
      return sobre;
    },

    /* Se acabó la partida de verdad (Game.closeRun): ya se ha cobrado, así
     * que no hay nada que continuar. */
    borrar: function () {
      this.ultimo = -1;
      this.ultimoNube = -1;
      this.deNube = null;
      this.escribir(null);
      this.subir(null);
      if (window.PM.UI && window.PM.UI.refreshContinuar) {
        window.PM.UI.refreshContinuar();
      }
    },

    /* GUARDAR Y SALIR, desde el menú de pausa. Deja la partida guardada y se
     * va al menú SIN cobrarla: la bandera `salvada` es lo que hace que
     * Game.closeRun no la dé por terminada. */
    guardarYSalir: function () {
      var g = G(), r = R();
      if (!this.guardar(true)) return false;
      g.salvada = true;
      g.toMenu();
      if (r) r.salir(true);      // la grabación se suelta sin guardarla
      return true;
    },

    /* =========================================================
     * LA NUBE — para poder seguirla en otro aparato
     * Va por su cuenta y en silencio: si no hay cuenta, si no hay red o si
     * el proyecto todavía no tiene la columna, el juego sigue igual y la
     * partida se queda guardada aquí.
     * ========================================================= */
    subir: function (sobre) {
      var self = this;
      var A = window.PM.Account;
      if (this.sinColumna || !A || !A.logged() || !A.guardarPartida) return;
      A.guardarPartida(sobre ? JSON.stringify(sobre) : null, function (err) {
        if (err === 'SIN COLUMNA') self.sinColumna = true;
      });
    },

    /* Lo que traiga la cuenta al entrar (js/account.js, applyRemote). Solo se
     * queda si es MÁS NUEVO que lo de aquí: quien acaba de jugar en este
     * aparato no puede perderlo por lo que hubiera en la nube. */
    desdeNube: function (texto) {
      var o = null;
      try { o = texto ? JSON.parse(texto) : null; } catch (e) { o = null; }
      if (!this.valido(o)) { this.deNube = null; return; }
      var local = this.leer();
      this.deNube = (local && local.fecha >= o.fecha) ? null : o;
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
      var nombre = sobre.maze ? 'LABERINTOS' : (this.NOMBRES[sobre.modo] || 'PARTIDA');
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
})();
