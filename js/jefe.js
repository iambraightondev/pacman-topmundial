/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/jefe.js
 * DESATADO: el REY FANTASMA. Define window.PM.Jefe
 *
 * Cada CFG.JEFE.CADA niveles de DESATADO (5, 10, 15...) el nivel tiene
 * jefe: un fantasma gigante con barra de vida que hay que tumbar a golpes.
 * El nivel no se acaba al comerse las pastillas, sino al tumbarlo. Los
 * cuatro fantasmas de siempre empiezan dentro de la casa y SOLO salen cuando
 * el rey los INVOCA.
 *
 *   Persigue      al Pac-Man vivo más cercano (o al Tanque que provoca).
 *   EMBESTIDA     cada pocos segundos se para, parpadea en rojo y sale
 *                 disparado en línea recta hasta la pared.
 *   INVOCAR       cada más segundos se para y suelta un fantasma de la casa.
 *   FURIA         con la mitad de vida va más rápido y ataca más a menudo.
 *
 * Tocarlo mata (salvo escudos, inmunidad, la otra dimensión...). Se le hace
 * daño con:
 *   · una SUPERPASTILLA (o el GRITO): azul, cada jugador le pega UNA vez por
 *     cada vez que se pone azul, al tocarlo
 *   · MORDISCO, BOLA DE FUEGO, RAYO, RUNA y APISONADORA
 *   · el HIELO (disparo o placa) no le quita vida: lo congela un momento
 * Tras cada golpe queda un momento sin poder recibir otro.
 *
 * Y DESDE EL 22 SEP 2026, TAMBIÉN EL CATÁLOGO. Las habilidades nuevas no le
 * hacían nada: quien no llevara el kit clásico se quedaba sin forma de
 * tumbarlo, y el nivel no se acaba hasta que cae. Ahora:
 *   · CACERÍA (23 sep): mientras dura, el rey no mata al cazador y cada
 *                     vez que lo toca le quita vida (CFG.JEFE.DANO.caceria).
 *   · LE QUITAN VIDA  shuriken, bomba, misil, ejecución (Asesino); rebote y
 *                     terremoto (Tanque); mina y gancho (Soporte); bola
 *                     guiada, tótem, toque arcano, dominio y meteoro (Mago).
 *                     Cuánto, en CFG.JEFE.DANO, por recarga y no por rol.
 *   · LO APAGAN       empujón y grito de guerra (Tanque); chispa, gravedad y
 *                     el choque del clon (Mago). Un tercio de lo que aturden
 *                     a un fantasma (CFG.JEFE.ATURDE): es un jefe.
 *   · YA LE VALÍAN    telaraña (lo frena, ver Hab.multVelJefe), sirena y clon
 *                     (se los cree como objetivo, ver Hab.objetivo) y todo lo
 *                     que salva del choque —yunque, piel de piedra, campo,
 *                     fortaleza, cadena, escudos— porque su muerte pasa por
 *                     Hab.salvaDelChoque igual que la de un fantasma.
 *   · NO LE HACEN NADA, y es a posta: lo que vuelve azul (el azul del gancho
 *                     y del toque arcano: un rey no se come, por eso los dos
 *                     se quedan en un rasguño), lo que empuja o arrastra (no
 *                     se le mueve de sitio: pesa lo que pesa), lo que ciega
 *                     (el eclipse: él no camina al azar) y todo lo
 *                     que es del propio jugador (sombra, frenesí, estela,
 *                     puente, relevo, faro...).
 *
 * Todo su estado vive en Game.jefe como datos planos: así lo guardan solos
 * la foto del rebobinado y la partida guardada, y la simulación es
 * determinista (no hay azar). Online lo simula el anfitrión y viaja en la
 * instantánea ('jf'); el invitado lo mueve por estima entre fotos, decide
 * sus propias muertes contra él y pide al anfitrión los golpes que da por
 * contacto ('jefeGolpe').
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var T = CFG.TILE;
  var D = CFG.DIR;
  var J = CFG.JEFE;

  function distX(a, b) {
    var ancho = CFG.COLS * T, d = Math.abs(a - b);
    return Math.min(d, ancho - d);
  }

  function esCasa(col, row) {
    var C = CFG.HOUSE;
    return row >= C.top - 1 && row <= C.bottom && col >= C.left && col <= C.right;
  }

  function libre(col, row) {
    if (row < 0 || row >= CFG.ROWS) return false;
    col = CFG.wrapCol(col);
    if (esCasa(col, row)) return false;
    return CFG.isOpen(col, row, false);
  }

  function Hab() { return window.PM.Hab; }

  var Jefe = {
    /* ---------- ¿hay jefe en este nivel? ---------- */
    tocaEn: function (G, nivel) {
      if (!G || !G.hab || G.caza) return false;
      if (G.isVersus && G.isVersus()) return false;
      return nivel > 0 && nivel % J.CADA === 0;
    },

    activo: function (G) {
      return !!(G && G.jefe && G.jefe.vivo);
    },

    vidaMax: function (G, nivel) {
      var jug = 0;
      for (var i = 0; i < G.pacs.length; i++) if (!G.pacs[i].bot) jug++;
      jug = Math.max(1, jug);
      var tanda = Math.max(1, Math.floor(nivel / J.CADA));
      return Math.round((J.VIDA + J.VIDA_POR_JUGADOR * (jug - 1)) * (1 + J.VIDA_POR_TANDA * (tanda - 1)));
    },

    /* Al empezar un nivel (Game.resetLevel, después de colocar a todos) */
    alNivel: function (G) {
      if (!this.tocaEn(G, G.level)) { G.jefe = null; return; }
      var max = this.vidaMax(G, G.level);
      G.jefe = {
        vivo: true, hp: max, max: max,
        x: 0, y: 0, dir: D.LEFT,
        st: 'caza',      // caza | aviso | carga | invoca
        stT: 0,          // ticks en ese estado
        tCarga: 0,       // ticks desde la última embestida
        tInvoca: 0,      // ticks desde la última invocación
        inv: 0,          // ticks sin poder recibir golpe
        frz: 0,          // ticks congelado
        golpeado: 0,     // ticks del destello de golpe (solo se pinta)
        azulUsado: 0,    // por jugador (bits): ya le pegó en este azul
        azulTick: -1,    // frightTicks del azul en curso, para saber si es otro
        plan: -1,        // casilla en la que ya decidió
        huye: 0,         // PISOTÓN del Tanque: ticks huyendo de él
        huyeDe: -1       // ...y de quién
      };
      this.colocar(G);
      this.encerrarFantasmas(G);
    },

    /* Tras perder la última vida: a su sitio, con la vida que le quede */
    alMorir: function (G) {
      if (!this.activo(G)) return;
      this.colocar(G);
      this.encerrarFantasmas(G);
    },

    colocar: function (G) {
      var j = G.jefe;
      j.x = J.INICIO.x * T + T / 2;
      j.y = J.INICIO.y * T + T / 2;
      j.dir = D.LEFT;
      j.st = 'caza'; j.stT = 0; j.tCarga = 0; j.tInvoca = 0;
      j.frz = 0; j.inv = J.INV; j.plan = -1;
    },

    /* Los cuatro de siempre, dentro de la casa: salen cuando él los llama */
    encerrarFantasmas: function (G) {
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (!g) continue;
        if (i === 0) {
          var s = CFG.START.pinky;
          g.x = s.x * T + T / 2;
          g.y = s.y * T + T / 2;
          g.dir = D.UP;
          g.bobDir = 1;
          g.leavePhase = 0;
        }
        g.mode = 'house';
        g.frightened = false;
        g.clearPlan();
      }
    },

    /* ¿Se sueltan fantasmas de la casa por su cuenta? Con jefe, no. */
    retieneCasa: function (G) {
      return this.activo(G);
    },

    /* ---------- velocidad ---------- */
    furia: function (G) {
      return this.activo(G) && G.jefe.hp <= G.jefe.max / 2;
    },

    velocidad: function (G) {
      var j = G.jefe;
      if (j.frz > 0 || j.st === 'aviso' || j.st === 'invoca') return 0;
      var pct = G.speedRow.ghost * J.VEL * (this.furia(G) ? J.VEL_FURIA : 1);
      if (j.st === 'carga') pct *= J.VEL_CARGA;
      else if (G.frightTicks > 0) pct = G.speedRow.ghostFright;
      // PISOTÓN del Tanque: mientras huye va al ritmo del que huye (18 sep)
      if (j.huye > 0 && j.st !== 'carga') pct *= CFG.HAB.PISOTON_LENTO;
      var A = Hab();
      if (A && A.multVelJefe) pct *= A.multVelJefe(G);
      return pct / 100 * CFG.BASE_SPEED;
    },

    /* ---------- a por quién va ---------- */
    objetivo: function (G) {
      var j = G.jefe, A = Hab();
      /* PISOTÓN del Tanque (18 sep): huye de él, igual que los fantasmas. Se
       * apunta a la casilla SIMÉTRICA para que la decisión de siempre —la
       * salida que más acerca al objetivo— acabe alejándolo. */
      if (j.huye > 0) {
        var t = G.pacs[j.huyeDe];
        if (t && !t.out) {
          return { x: CFG.wrapCol(Math.round(2 * (j.x / T) - t.tileX())),
                   y: Math.max(0, Math.min(CFG.ROWS - 1,
                      Math.round(2 * (j.y / T) - t.tileY()))) };
        }
      }
      if (A && A.objetivo) {
        var prov = A.objetivo(G, { mode: 'normal', frightened: false, x: j.x, y: j.y });
        if (prov) return prov;
      }
      var mejor = null, mejorD = Infinity;
      for (var i = 0; i < G.pacs.length; i++) {
        var p = G.pacs[i];
        if (!p || p.out || p.dying) continue;
        if (A && A.oculto && A.oculto(i)) continue;
        if (A && A.enDimension && A.enDimension(i)) continue;
        var dx = distX(p.x, j.x), dy = p.y - j.y;
        var d = dx * dx + dy * dy;
        if (d < mejorD) { mejorD = d; mejor = p; }
      }
      if (!mejor) return { x: 13, y: 11 };
      return { x: mejor.tileX(), y: mejor.tileY() };
    },

    /* En el centro de una casilla: la salida que más acerca (o que más aleja,
     * si está azul). Sin volver atrás salvo en un callejón. */
    decidir: function (G) {
      var j = G.jefe;
      var col = Math.floor(j.x / T), row = Math.floor(j.y / T);
      var obj = this.objetivo(G);
      var huye = G.frightTicks > 0 && j.st !== 'carga';
      var orden = [D.UP, D.LEFT, D.DOWN, D.RIGHT];
      var mejor = -1, mejorD = huye ? -Infinity : Infinity;
      for (var n = 0; n < 2 && mejor < 0; n++) {
        for (var k = 0; k < 4; k++) {
          var d = orden[k];
          if (n === 0 && d === CFG.OPP[j.dir]) continue;
          var v = CFG.DIR_V[d];
          var c = col + v.x, r = row + v.y;
          if (!libre(c, r)) continue;
          var dx = CFG.wrapCol(c) - obj.x, dy = r - obj.y;
          var dist = dx * dx + dy * dy;
          if (huye ? dist > mejorD : dist < mejorD) { mejorD = dist; mejor = d; }
        }
      }
      return mejor < 0 ? j.dir : mejor;
    },

    /* Avanza sp píxeles por el laberinto. En la EMBESTIDA no gira: al topar
     * con pared, se acaba. */
    mover: function (G, sp) {
      var j = G.jefe, ancho = CFG.COLS * T;
      for (var guarda = 0; sp > 0.0001 && guarda < 8; guarda++) {
        var col = Math.floor(j.x / T), row = Math.floor(j.y / T);
        var cx = col * T + T / 2, cy = row * T + T / 2;
        var v = CFG.DIR_V[j.dir];
        var hasta = v.x ? (cx - j.x) * v.x : (cy - j.y) * v.y;   // >0: el centro está delante
        if (hasta > 0.0001) {
          var paso = Math.min(sp, hasta);
          j.x += v.x * paso; j.y += v.y * paso;
          sp -= paso;
          continue;
        }
        if (hasta > -0.0001) {
          /* en el centro: aquí se decide (o se acaba la embestida) */
          j.x = cx; j.y = cy;
          var tile = row * CFG.COLS + col;
          if (j.st === 'carga') {
            if (!libre(col + v.x, row + v.y)) { this.fin(G); return; }
          } else if (j.plan !== tile) {
            j.plan = tile;
            j.dir = this.decidir(G);
            v = CFG.DIR_V[j.dir];
          }
          if (!libre(col + v.x, row + v.y)) { j.plan = -1; return; }
          hasta = 0;
        }
        /* hacia el centro de la casilla siguiente, encarrilado */
        if (v.x) j.y = cy; else j.x = cx;
        var tramo = Math.min(sp, T + hasta);
        j.x += v.x * tramo; j.y += v.y * tramo;
        sp -= tramo;
        if (j.x < 0) j.x += ancho; else if (j.x >= ancho) j.x -= ancho;
      }
    },

    fin: function (G) {
      var j = G.jefe;
      j.st = 'caza'; j.stT = 0; j.plan = -1;
    },

    /* ---------- un paso (quien simula: local o anfitrión) ---------- */
    paso: function (G) {
      if (!this.activo(G)) return;
      var j = G.jefe;
      if (j.inv > 0) j.inv--;
      if (j.golpeado > 0) j.golpeado--;
      if (j.frz > 0) j.frz--;
      if (j.huye > 0 && --j.huye <= 0) { j.huyeDe = -1; j.plan = -1; }
      /* un azul nuevo deja volver a pegarle a todos */
      if (G.frightTicks <= 0) j.azulUsado = 0;
      j.stT++;
      var furia = this.furia(G);
      if (j.st === 'caza' && j.frz <= 0) {
        j.tCarga++; j.tInvoca++;
        var cadaInv = furia ? J.INVOCA_FURIA : J.INVOCA_CADA;
        var cadaCar = furia ? J.CARGA_FURIA : J.CARGA_CADA;
        if (j.tInvoca >= cadaInv && this.hayEnCasa(G)) {
          j.st = 'invoca'; j.stT = 0; j.tInvoca = 0;
        } else if (j.tCarga >= cadaCar && G.frightTicks <= 0) {
          j.st = 'aviso'; j.stT = 0; j.tCarga = 0;
        }
      } else if (j.st === 'aviso' && j.stT >= J.AVISO) {
        /* sale hacia donde esté su presa, por el eje en que más lejos quede */
        var obj = this.objetivo(G);
        var col = Math.floor(j.x / T), row = Math.floor(j.y / T);
        var dx = obj.x - col, dy = obj.y - row;
        var pref = (Math.abs(dx) >= Math.abs(dy))
          ? [dx < 0 ? D.LEFT : D.RIGHT, dy < 0 ? D.UP : D.DOWN]
          : [dy < 0 ? D.UP : D.DOWN, dx < 0 ? D.LEFT : D.RIGHT];
        var sale = -1;
        for (var k = 0; k < 2; k++) {
          var v = CFG.DIR_V[pref[k]];
          if (libre(col + v.x, row + v.y)) { sale = pref[k]; break; }
        }
        if (sale < 0) { this.fin(G); }
        else {
          j.x = col * T + T / 2; j.y = row * T + T / 2;
          j.dir = sale; j.st = 'carga'; j.stT = 0;
        }
      } else if (j.st === 'carga' && j.stT >= J.CARGA_MAX) {
        this.fin(G);
      } else if (j.st === 'invoca' && j.stT >= J.INVOCA_PARON) {
        this.soltarUno(G);
        this.fin(G);
      }
      this.mover(G, this.velocidad(G));
      this.pisaRuna(G);
    },

    hayEnCasa: function (G) {
      for (var i = 0; i < 4; i++) if (G.ghosts[i] && G.ghosts[i].mode === 'house') return true;
      return false;
    },

    soltarUno: function (G) {
      var orden = [0, 1, 2, 3];
      for (var i = 0; i < orden.length; i++) {
        var g = G.ghosts[orden[i]];
        if (g && g.mode === 'house') { G.releaseGhost(g); return; }
      }
    },

    /* El invitado: entre fotos sigue andando por estima */
    pasoInvitado: function (G) {
      if (!this.activo(G)) return;
      var j = G.jefe;
      if (j.inv > 0) j.inv--;
      if (j.golpeado > 0) j.golpeado--;
      if (j.frz > 0) j.frz--;
      if (j.pidoAplasta > 0) j.pidoAplasta--;   // respiro entre golpes pedidos
      if (j.pidoCaza > 0) j.pidoCaza--;         // ...y los de la CACERÍA
      j.stT++;
      this.mover(G, this.velocidad(G));
    },

    /* ---------- tocarse ---------- */
    toca: function (G, p, margen) {
      var j = G.jefe;
      var r = J.RADIO_CHOQUE + (margen || 0);
      return distX(p.x, j.x) < r && Math.abs(p.y - j.y) < r;
    },

    vulnerable: function (G) {
      return this.activo(G) && G.frightTicks > 0 && G.jefe.st !== 'carga';
    },

    /* ¿Ese Pac-Man muere contra el jefe? (lo mira quien decide sus muertes) */
    mata: function (G, i) {
      if (!this.activo(G)) return false;
      var p = G.pacs[i], j = G.jefe, A = Hab();
      if (!p || p.out || p.dying || p.safeTicks > 0) return false;
      if (A && A.enDimension && A.enDimension(i)) return false;
      if (j.frz > 0 || this.vulnerable(G)) return false;
      /* CACERÍA (23 sep): el cazador no muere contra el rey, le pega */
      if (A && A.cazando && A.cazando(i)) return false;
      if (!this.toca(G, p)) return false;
      if (A && A.salvaDelChoque && A.salvaDelChoque(G, i)) return false;
      /* PROVOCAR (18 sep): mientras OTRO grita, el rey va a por él y a este
       * lo atraviesa sin matarlo, igual que hacen los cuatro fantasmas. */
      if (A && A.ignoraA && A.ignoraA(G, i, { mode: 'normal', frightened: false })) {
        return false;
      }
      return true;
    },

    /* Contactos de quien simula la partida: golpes con el azul y la
     * apisonadora, y muertes de los Pac-Man que decide esta máquina */
    colisiones: function (G) {
      if (!this.activo(G) || G.state !== 'PLAYING') return;
      var A = Hab();
      for (var i = 0; i < G.pacs.length; i++) {
        var p = G.pacs[i];
        if (!p || p.out || p.dying) continue;
        if (A && A.enDimension && A.enDimension(i)) continue;
        if (!G.isLocalAuth(i)) continue;
        if (!this.toca(G, p)) continue;
        if (this.vulnerable(G)) {
          if (!(G.jefe.azulUsado & (1 << i))) {
            G.jefe.azulUsado |= (1 << i);
            this.danar(G, J.DANO.azul, i, 'azul', true);
          }
          continue;
        }
        if (A && A.arrollando && A.arrollando(i)) {
          // y lo deja ATURDIDO: cruzar el laberinto para embestirlo vale algo
          if (this.danar(G, J.DANO.aplasta, i, 'aplasta')) {
            this.congelar(G, J.ATURDE_APISONADORA);
          }
          continue;
        }
        /* CACERÍA: tocarlo le quita vida (una vez por cada respiro suyo) */
        if (A && A.cazando && A.cazando(i)) {
          this.danar(G, J.DANO.caceria, i, 'caceria');
          continue;
        }
        if (this.mata(G, i)) {
          G.startDeath(i, -1);
          if (G.state !== 'PLAYING') return;
        }
      }
    },

    /* El invitado: su propio choque (muerte) y los golpes que pide */
    colisionesInvitado: function (G, me) {
      if (!this.activo(G) || !me || me.out || me.dying) return;
      var A = Hab(), i = me.id | 0, j = G.jefe;
      if (A && A.enDimension && A.enDimension(i)) return;
      if (!this.toca(G, me)) return;
      var esAzul = this.vulnerable(G);
      /* CACERÍA: como la apisonadora, el golpe lo da el anfitrión */
      if (!esAzul && A && A.cazando && A.cazando(i)) {
        if (j.inv <= 0 && !(j.pidoCaza > 0)) {
          j.pidoCaza = J.INV;
          G.netSend('gevt', { t: 'jefeGolpe', f: 'caceria' });
        }
        return;
      }
      if (esAzul || (A && A.arrollando && A.arrollando(i))) {
        if (esAzul) {
          /* el azul: UNA vez por cada energizante, como el anfitrión */
          if (j.inv <= 0 && !(j.azulUsado & (1 << i))) {
            j.azulUsado |= (1 << i);
            G.netSend('gevt', { t: 'jefeGolpe', f: 'azul' });
          }
        } else if (j.inv <= 0 && !(j.pidoAplasta > 0)) {
          /* LA APISONADORA NO GASTA EL BIT DEL AZUL (20 sep). Lo hacía, y
           * como ese bit solo se limpia al empezar otro energizante, un
           * invitado que arrollara al rey le pegaba UNA vez en toda la
           * partida —y ninguna si antes le había pegado de azul—. Su freno
           * es un respiro corto, solo para no mandar el mismo golpe en cada
           * tick mientras lo cruza. */
          j.pidoAplasta = J.INV;
          G.netSend('gevt', { t: 'jefeGolpe', f: 'aplasta' });
        }
        return;
      }
      if (this.mata(G, i)) {
        G.startPacDeath(i);
        G.predictFreeze = CFG.DEATH_CONFIRM_TICKS;
        if (!G.anyPlaying(i)) {
          G.state = 'DYING';
          G.dyingPhase = 0;
          G.stopAllLoops();
        }
        G.netSend('gevt', { t: 'died', g: -1 });
      }
    },

    /* Anfitrión: un invitado dice que le ha pegado por contacto */
    peticionGolpe: function (G, who, f) {
      if (!this.activo(G)) return;
      var p = G.pacs[who], A = Hab();
      if (!p || p.out || p.dying) return;
      if (!this.toca(G, p, 2 * T + (CFG.HAB.BITE_NET_MARGIN || 0))) return;
      if (f === 'azul') {
        if (G.frightTicks <= 0 || (G.jefe.azulUsado & (1 << who))) return;
        G.jefe.azulUsado |= (1 << who);
        this.danar(G, J.DANO.azul, who, 'azul', true);
      } else if (f === 'aplasta') {
        var s = A && A.estado(who);
        if (!s || !(s.arrollaRed > 0 || s.arrolla > 0)) return;
        if (this.danar(G, J.DANO.aplasta, who, 'aplasta')) {
          this.congelar(G, J.ATURDE_APISONADORA);
        }
      } else if (f === 'caceria') {
        var sc = A && A.estado(who);
        if (!sc || !(sc.caceria > 0)) return;
        this.danar(G, J.DANO.caceria, who, 'caceria');
      } else if (f === 'rebote') {
        /* REBOTE del catálogo (22 sep 2026): el invitado ya ha decidido que
         * ese choque no lo mata (Hab.salvaDelChoque), pero el golpe lo da
         * quien lleva la partida. Aquí se comprueba que de verdad lo tenía
         * puesto y se gasta, que si no bastaría con mandar el aviso. */
        var sr = A && A.estado(who);
        if (!sr || !(sr.rebote > 0)) return;
        sr.rebote = 0;
        if (this.danar(G, J.DANO.rebote, who, 'rebote')) {
          this.congelar(G, J.ATURDE.rebote);
        }
      }
    },

    /* ---------- los poderes ---------- */
    /* MORDISCO: ¿está a tiro? (mismo alcance que un fantasma, más su tamaño) */
    aTiroMordisco: function (G, idx, extra) {
      if (!this.activo(G)) return false;
      var p = G.pacs[idx];
      if (!p) return false;
      var alcance = CFG.HAB.BITE_PX + J.RADIO_CHOQUE / 2 + (extra || 0);
      return distX(p.x, G.jefe.x) <= alcance && Math.abs(p.y - G.jefe.y) <= alcance;
    },

    /* Un proyectil a esa posición: ¿le da? */
    impactaEn: function (G, x, y) {
      if (!this.activo(G)) return false;
      return distX(x, G.jefe.x) <= J.RADIO_CHOQUE && Math.abs(y - G.jefe.y) <= J.RADIO_CHOQUE;
    },

    /* ¿El rey está a `radio` casillas de ese punto? (22 sep 2026)
     *
     * Es lo que preguntan las habilidades del catálogo que buscan blanco por
     * cercanía —ejecución, chispa, toque arcano, gravedad, bomba, meteoro,
     * tótem—, con el mismo criterio que usan para elegir fantasma: distancia
     * en píxeles, redonda. Se le suma su medio cuerpo porque es el doble de
     * grande que un fantasma y la cuenta se hace contra su centro: sin eso,
     * un poder que le está dando de lleno en el costado no lo vería. */
    cercaDe: function (G, x, y, radio) {
      if (!this.activo(G)) return false;
      var dx = distX(x, G.jefe.x), dy = y - G.jefe.y;
      return Math.sqrt(dx * dx + dy * dy) <= (radio || 0) * T + J.RADIO_CHOQUE;
    },

    /* ¿Y está en la línea de tiro de ese Pac-Man, a `casillas` de él? Lo usa
     * el EMPUJÓN del Tanque, que es de línea y no de círculo. */
    enLinea: function (G, idx, casillas, dir) {
      if (!this.activo(G)) return false;
      var p = G.pacs[idx], v = CFG.DIR_V[dir];
      if (!p || !v) return false;
      var c = p.tileX(), r = p.tileY();
      for (var n = 1; n <= casillas; n++) {
        var nc = CFG.wrapCol(c + v.x * n), nr = r + v.y * n;
        if (nr < 0 || nr >= CFG.ROWS || !CFG.isOpen(nc, nr, false)) return false;
        if (this.cercaDe(G, nc * T + T / 2, nr * T + T / 2, 0.5)) return true;
      }
      return false;
    },

    /* PROVOCAR (Tanque): acude a por él y, si le daba la espalda, se da la
     * vuelta donde esté —como los fantasmas—, que si no el grito tardaba
     * media eternidad en notarse. En mitad de una embestida o de una
     * invocación no se le interrumpe: eso ya está lanzado. */
    acude: function (G, p) {
      if (!this.activo(G) || !p) return;
      var j = G.jefe;
      if (j.st !== 'caza') return;
      j.huye = 0; j.huyeDe = -1;        // el grito manda sobre el pisotón
      if (this.deEspaldas(G, p)) j.dir = CFG.OPP[j.dir];
      j.plan = -1;
    },

    /* PISOTÓN (Tanque): sale por patas, y si lo tenía de frente se da la
     * vuelta. Devuelve false si no había a quién espantar. */
    espanta: function (G, p, ticks) {
      if (!this.activo(G) || !p) return false;
      var j = G.jefe;
      if (j.st !== 'caza') return false;
      j.huye = ticks;
      j.huyeDe = p.id | 0;
      if (!this.deEspaldas(G, p)) j.dir = CFG.OPP[j.dir];
      j.plan = -1;
      return true;
    },

    /* ¿El jefe le está dando la espalda a ese Pac-Man? El atajo del túnel
     * solo cuenta si los dos van por su fila (ver Hab.deEspaldas). */
    deEspaldas: function (G, p) {
      var j = G.jefe, v = CFG.DIR_V[j.dir];
      if (!v) return false;
      var ancho = CFG.COLS * T, hx = p.x - j.x;
      if (Math.floor(j.y / T) === CFG.TUNNEL_ROW &&
          Math.floor(p.y / T) === CFG.TUNNEL_ROW) {
        if (hx > ancho / 2) hx -= ancho; else if (hx < -ancho / 2) hx += ancho;
      }
      return (v.x * hx + v.y * (p.y - j.y)) < 0;
    },

    congelar: function (G, ticks) {
      if (!this.activo(G)) return;
      G.jefe.frz = Math.max(G.jefe.frz, ticks || J.HIELO);
      if (G.jefe.st === 'carga' || G.jefe.st === 'aviso') this.fin(G);
    },

    /* RUNA: si su casilla es la del jefe, le pega y se gasta */
    pisaRuna: function (G) {
      var A = Hab();
      if (!A || !A.runas || !A.manda || !A.manda(G)) return;
      var col = Math.floor(G.jefe.x / T), row = Math.floor(G.jefe.y / T);
      for (var i = 0; i < A.runas.length; i++) {
        var r = A.runas[i];
        if (!r || r.c !== col || r.r !== row) continue;
        A.runas[i] = null;
        this.danar(G, J.DANO.runa, i, 'runa', true);
        if (!this.activo(G)) return;
      }
      /* y las placas de hielo del Soporte lo congelan (una vez cada una) */
      if (A.placas) {
        for (i = 0; i < A.placas.length; i++) {
          var pl = A.placas[i];
          if (!pl || pl.c !== col || pl.r !== row || (pl.z & 16)) continue;
          pl.z |= 16;
          this.congelar(G, J.HIELO);
        }
      }
      /* LA MINA DEL SOPORTE (catálogo, 22 sep 2026). Se mira aquí y no en
       * Hab.pasoRoles por lo mismo que la runa: las trampas del suelo las
       * pisa el rey, y quien sabe por dónde anda es él. Al fantasma lo mata;
       * a él le quita vida y le da el mismo escudo al Soporte, que es media
       * habilidad. El radio es el de los fantasmas (MINA_RADIO no existe:
       * son las seis décimas de casilla de Hab.pasoRoles).
       *
       * Si el rey viene de recibir otro golpe, la mina NO se gasta: sigue
       * armada para la próxima pasada. Una trampa que se desactiva sola por
       * llegar medio segundo pronto es una trampa rota. */
      if (A.st) {
        for (i = 0; i < A.st.length; i++) {
          var s = A.st[i];
          if (!s || !s.mina) continue;
          if (!this.cercaDe(G, s.mina.c * T + T / 2, s.mina.r * T + T / 2, 0.6)) continue;
          if (!this.danar(G, J.DANO.mina, i, 'mina')) continue;
          s.mina = null;
          s.escudo = Math.max(s.escudo, CFG.HAB.ALIADO_TICKS);
          var mp = G.pacs[i];
          if (mp) A.efecto('amparo', mp.x, mp.y, 28);
          if (!this.activo(G)) return;
        }
      }
    },

    /* ---------- el daño ---------- */
    /* forzar: entra aunque esté en el rato sin golpes (la RUNA y el azul, que
     * ya tienen su propio límite) */
    danar: function (G, n, quien, fuente, forzar) {
      if (!this.activo(G)) return false;
      var j = G.jefe;
      if (j.inv > 0 && !forzar) return false;
      j.hp = Math.max(0, j.hp - n);
      j.inv = J.INV;
      j.golpeado = 20;
      G.addPopup(j.x, j.y - 12, '-' + n, 30);
      G.hostEvt({ t: 'jefeDano', n: n, f: fuente || '', w: quien });
      window.AudioSys && AudioSys.playEatGhost && AudioSys.playEatGhost();
      if (j.hp <= 0) this.morir(G, quien);
      return true;
    },

    morir: function (G, quien) {
      var j = G.jefe;
      j.vivo = false;
      /* rematarlo también es matar: si lo tumba el ASESINO, su pasiva cuenta */
      var premio = (G.hab && window.PM.Hab)
        ? window.PM.Hab.puntosDe(G, quien, J.PREMIO) : J.PREMIO;
      G.addScore(premio);
      G.addPopup(j.x, j.y, premio, 120);
      if (!G.netRole || quien === G.localIdx) G.bumpAch && G.bumpAch({ jefes: 1 });
      G.hostEvt({ t: 'jefeKill', w: quien, x: Math.round(j.x), y: Math.round(j.y) });
      /* los fantasmas que había fuera vuelven a casa hechos ojos */
      for (var i = 0; i < 4; i++) {
        var g = G.ghosts[i];
        if (g && (g.mode === 'normal' || g.mode === 'leaving')) g.eaten();
      }
    },

    /* Otra pantalla: el anfitrión cuenta un golpe o la derrota */
    evento: function (G, e) {
      if (!G.jefe) return;
      if (e.t === 'jefeDano') {
        G.jefe.golpeado = 20;
        G.addPopup(G.jefe.x, G.jefe.y - 12, '-' + (e.n | 0), 30);
      } else if (e.t === 'jefeKill') {
        G.jefe.vivo = false;
        G.addPopup(e.x, e.y, J.PREMIO, 120);
        if ((e.w | 0) === G.localIdx && !G.isSpec()) G.bumpAch && G.bumpAch({ jefes: 1 });
      }
    },

    /* ---------- la foto de red ---------- */
    resumen: function (G) {
      var j = G.jefe;
      if (!j) return 0;
      return [j.vivo ? 1 : 0, j.hp, j.max, Math.round(j.x * 10) / 10, Math.round(j.y * 10) / 10, j.dir,
        ['caza', 'aviso', 'carga', 'invoca'].indexOf(j.st), j.stT, j.inv, j.frz, j.azulUsado,
        j.huye || 0, (j.huyeDe == null ? -1 : j.huyeDe)];
    },

    aplicar: function (G, a) {
      if (!a) { G.jefe = null; return; }
      var j = G.jefe || {};
      var mio = G.isSpec && !G.isSpec() ? (j.azulUsado || 0) & (1 << G.localIdx) : 0;
      j.vivo = !!a[0]; j.hp = a[1]; j.max = a[2]; j.x = a[3]; j.y = a[4]; j.dir = a[5];
      j.st = ['caza', 'aviso', 'carga', 'invoca'][a[6]] || 'caza';
      j.stT = a[7]; j.inv = a[8]; j.frz = a[9];
      j.azulUsado = (a[10] | 0) | mio;
      j.huye = a[11] || 0;
      j.huyeDe = (a[12] == null) ? -1 : a[12];
      if (j.golpeado == null) j.golpeado = 0;
      j.plan = -1;
      G.jefe = j;
    },

    /* =========================================================
     * EL DIBUJO
     * ========================================================= */
    dibujar: function (G, ctx) {
      if (!this.activo(G)) return;
      var j = G.jefe, Y = CFG.MAZE_Y, tk = G.tick;
      var x = j.x, y = j.y + Y, R = J.RADIO_DIBUJO;
      if (j.inv > 0 && j.golpeado <= 0 && Math.floor(tk / 4) % 2 === 0 && !this.vulnerable(G)) {
        /* parpadeo del rato sin golpes */
        ctx.save(); ctx.globalAlpha = 0.55;
      } else {
        ctx.save();
      }
      var cuerpo = J.COLOR;
      if (this.vulnerable(G)) {
        var acaba = G.frightTicks < 120 && Math.floor(tk / 10) % 2 === 0;
        cuerpo = acaba ? '#ffffff' : '#2121ff';
      } else if (j.st === 'aviso') {
        cuerpo = Math.floor(tk / 4) % 2 === 0 ? '#ffffff' : '#ff2020';
      } else if (j.golpeado > 0 && Math.floor(tk / 3) % 2 === 0) {
        cuerpo = '#ffffff';
      } else if (this.furia(G)) {
        cuerpo = J.COLOR_FURIA;
      }
      /* aura */
      ctx.shadowColor = (j.st === 'carga') ? '#ff3030' : cuerpo;
      ctx.shadowBlur = (j.st === 'carga') ? 16 : 8;
      ctx.fillStyle = cuerpo;
      ctx.beginPath();
      ctx.arc(x, y - R * 0.15, R, Math.PI, 0);
      var base = y + R * 0.85, ondas = 6, fase = Math.floor(tk / 8) % 2;
      ctx.lineTo(x + R, base);
      for (var k = ondas; k >= 0; k--) {
        var px = x - R + (2 * R) * (k / ondas);
        var py = base - ((k + fase) % 2 === 0 ? 0 : R * 0.28);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      /* corona */
      ctx.fillStyle = '#ffd400';
      ctx.beginPath();
      var cy = y - R * 1.05, cw = R * 0.9;
      ctx.moveTo(x - cw, cy + 4);
      ctx.lineTo(x - cw, cy - 3);
      ctx.lineTo(x - cw / 2, cy + 1);
      ctx.lineTo(x, cy - 6);
      ctx.lineTo(x + cw / 2, cy + 1);
      ctx.lineTo(x + cw, cy - 3);
      ctx.lineTo(x + cw, cy + 4);
      ctx.closePath();
      ctx.fill();
      /* ojos */
      var v = CFG.DIR_V[j.dir] || { x: 0, y: 0 };
      var vul = this.vulnerable(G);
      for (var s = -1; s <= 1; s += 2) {
        var ex = x + s * R * 0.4, ey = y - R * 0.25;
        if (vul) {
          ctx.fillStyle = '#ffb8ae';
          ctx.fillRect(ex - 2, ey - 2, 4, 4);
          continue;
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(ex, ey, R * 0.26, R * 0.32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = (j.st === 'aviso' || j.st === 'carga') ? '#ff0000' : '#1a1aff';
        ctx.beginPath(); ctx.arc(ex + v.x * R * 0.12, ey + v.y * R * 0.14, R * 0.14, 0, Math.PI * 2); ctx.fill();
        /* cejas de enfado */
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ex - s * R * 0.3, ey - R * 0.42);
        ctx.lineTo(ex + s * R * 0.2, ey - R * 0.3);
        ctx.stroke();
      }
      if (j.frz > 0) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#bff4ff';
        ctx.beginPath(); ctx.arc(x, y, R * 1.1, 0, Math.PI * 2); ctx.fill();
      }
      if (j.st === 'invoca') {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#b36bff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, R + 4 + (j.stT % 20) / 2, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    },

    /* LA BARRA DE VIDA, EN LA FRANJA DE ABAJO (20 sep)
     *
     * Vivía sobre las dos primeras filas del laberinto y tapaba pasillo de
     * verdad: justo donde salen los fantasmas de casa. Abajo hay una franja
     * que no es laberinto (CFG.BOTTOM_ROWS, la de las vidas y las frutas) y
     * su centro está libre, porque las vidas van a la izquierda y las frutas
     * a la derecha. Ahí no tapa nada que se juegue. */
    dibujarBarra: function (G, ctx) {
      if (!G.jefe) return;
      var j = G.jefe, W = CFG.COLS * T;
      var bw = 104, bh = 5;
      var bx = (W - bw) / 2;
      /* la franja de abajo: el rótulo arriba y la barra debajo */
      var base = CFG.MAZE_Y + CFG.ROWS * T;
      var by = base + 4;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(bx - 3, by - 6, bw + 6, bh + 9);
      ctx.fillStyle = '#330010';
      ctx.fillRect(bx, by, bw, bh);
      var q = j.max > 0 ? j.hp / j.max : 0;
      ctx.fillStyle = this.furia(G) ? J.COLOR_FURIA : '#ff2f6e';
      ctx.fillRect(bx, by, Math.round(bw * q), bh);
      ctx.strokeStyle = '#ffd400';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
      ctx.fillStyle = '#ffd400';
      ctx.font = window.PM.Letra ? window.PM.Letra.lienzo(4) : '4px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(j.vivo ? (this.furia(G) ? 'REY FANTASMA · FURIA' : 'REY FANTASMA') : 'REY FANTASMA DERROTADO', W / 2, by - 1);
      ctx.restore();
    }
  };

  window.PM.Jefe = Jefe;
})();
