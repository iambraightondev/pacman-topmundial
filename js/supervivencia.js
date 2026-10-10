/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/supervivencia.js
 * Modo SUPERVIVENCIA (party online). Define window.PM.Superv
 *
 * Todos contra todos. Gana el último Pac-Man en pie.
 *
 * Desde el 10 oct 2026 (Braighton) se juega CON LOS PODERES Y LOS ROLES DE
 * DESATADO, con TRES CORAZONES cada uno y en el tablero de DOBLE ANCHO
 * (CFG.TABLEROS.ancho):
 *
 *   · CORAZONES: un golpe quita uno y deja un rato sin poder recibir otro
 *     (parpadea). No se reaparece: se sigue donde se estaba. Al perder el
 *     último, se cae.
 *   · QUÉ ES UN GOLPE: un fantasma de la máquina que te toca, la zona roja
 *     (uno cada 2 s dentro), que te toque un rival con PODER, y cualquier
 *     poder ajeno que a un fantasma lo mataría (el mordisco, la bola de
 *     fuego, el shuriken, la bomba, el meteoro, la apisonadora...).
 *   · LO QUE A UN FANTASMA LO FRENA, A TI TAMBIÉN: el hielo y los
 *     aturdimientos te clavan en el sitio (y no puedes lanzar nada), la
 *     telaraña y el pisotón te frenan, el gancho te arrastra.
 *   · LO QUE ERA DE EQUIPO ES PARA UNO MISMO (el escudo aliado, la vida
 *     extra, el campo), y lo que no tiene sentido sin equipo no entra
 *     (CFG.SUPERV.VETADAS).
 *   · SUPERPASTILLA: además de asustar a los fantasmas, a quien se la come
 *     le da PODER unos segundos. Vuelven a salir al rato.
 *   · LA ZONA: pasado un rato, el laberinto se cierra por fuera, un anillo
 *     cada poco. Dentro de la zona roja se pierde un corazón cada 2 s, y ahí
 *     no hay escudo que valga.
 *   · Las pastillas no se acaban: al comerse todas, vuelven.
 *
 * No cuenta para el TOP MUNDIAL, ni para los récords, ni para el rango; no
 * hay CONTINUAR ni se revive a nadie.
 *
 * CÓMO SE JUNTA CON LOS PODERES. Los poderes están escritos contra
 * fantasmas. Aquí cada rival lleva un disfraz de fantasma (Rival, en
 * js/habilidades.js) y los poderes lo encuentran en sus listas de blancos
 * (Hab.blancos). Lo que le pasa después se reparte en dos:
 *   · si el poder lo iba a MATAR, llega a golpear() y pierde un corazón;
 *   · si el poder le apunta un ESTADO (hielo, aturdido, lento, azul), queda
 *     en su hueco de la mesa de Hab —los cuatro primeros son de los
 *     fantasmas y los cuatro siguientes de los jugadores— y se lo cobra
 *     Hab.frenoRival al andar, en la máquina de cada uno.
 *
 * QUIÉN DECIDE QUÉ (online). Cada uno manda en SU Pac-Man, igual que en el
 * resto del juego: sus escudos están en su máquina. Así que un golpe a un
 * invitado va en dos pasos: el anfitrión se lo ANUNCIA ('svGolpe'), el
 * invitado mira si algo suyo lo para y, si no, lo ACEPTA ('svDano'); y es
 * el anfitrión, que lleva los corazones, quien lo descuenta y lo cuenta a
 * todos. Los golpes que detecta el propio invitado (un fantasma, la zona)
 * van directos al segundo paso. El anfitrión lleva además la zona, el
 * poder, las superpastillas que vuelven y el final. Todo el estado vive en
 * Game.superv (datos planos) y viaja en la instantánea ('sv').
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var T = CFG.TILE;
  var S = CFG.SUPERV;

  function distX(a, b) {
    var ancho = CFG.COLS * T, d = Math.abs(a - b);
    return Math.min(d, ancho - d);
  }

  /* Los golpes que se dan TOCANDO: son los que el REBOTE del Tanque devuelve */
  var DE_CONTACTO = { poder: 1, caceria: 1, azul: 1, aplasta: 1, mordisco: 1 };

  var Superv = {
    empezar: function (G, n) {
      var po = [], zt = [], ba = [], inv = [], av = [], pt = [];
      for (var i = 0; i < n; i++) {
        po.push(0); zt.push(0); ba.push(0); inv.push(0); av.push({}); pt.push(0);
      }
      G.superv = {
        t: 0,              // ticks jugados
        anillo: 0,         // anillos de casillas ya cerrados
        poder: po,         // ticks de poder de cada jugador
        zonaT: zt,         // ticks de cada uno dentro de la zona
        bajas: ba,         // Pac-Man eliminados por cada uno
        caidos: [],        // orden en que cayeron
        vuelven: [],       // superpastillas comidas: [fila, col, ticks]
        ganador: -2,       // -2 en juego, -1 empate, i el que gana
        /* solo del anfitrión: el rato de gracia que le lleva a cada uno, los
         * anuncios de golpe que tiene sin contestar y cuándo recolocó a quién */
        inv: inv, aviso: av, posT: pt
      };
    },

    activo: function (G) { return !!(G && G.superv); },

    /* ---------- la zona ---------- */
    /* En el tablero ancho un anillo son DOS columnas por lado y una fila: si
     * fuera una, la zona acabaría siendo una tira de lado a lado. */
    anilloDe: function (col, row) {
      var k = Math.max(1, Math.round(CFG.COLS / 28));
      return Math.min(Math.floor(col / k), Math.floor((CFG.COLS - 1 - col) / k),
                      row, CFG.ROWS - 1 - row);
    },

    enZona: function (G, col, row) {
      return !!G.superv && this.anilloDe(col, row) < G.superv.anillo;
    },

    /* ticks que faltan para que se cierre el siguiente anillo (-1: ya no se cierra más) */
    faltaCierre: function (G) {
      var s = G.superv;
      if (!s || s.anillo >= S.ZONA_MAX) return -1;
      var siguiente = S.ZONA_INICIO + s.anillo * S.ZONA_CADA;
      return Math.max(0, siguiente - s.t);
    },

    vivos: function (G) {
      var n = 0;
      for (var i = 0; i < G.pacs.length; i++) if (!G.pacs[i].out) n++;
      return n;
    },

    /* ---------- un paso de quien simula (local o anfitrión) ---------- */
    paso: function (G) {
      if (!this.activo(G) || G.state !== 'PLAYING') return;
      var s = G.superv, i, k;
      s.t++;
      if (this.faltaCierre(G) === 0) {
        s.anillo++;
        this.vaciarZona(G);
        G.hostEvt({ t: 'svZona', a: s.anillo });
        window.AudioSys && AudioSys.playShout && AudioSys.playShout(0.6);
      }
      for (i = 0; i < s.poder.length; i++) {
        if (s.poder[i] > 0) s.poder[i]--;
        if (s.inv[i] > 0) s.inv[i]--;
        if (s.posT[i] > 0) s.posT[i]--;
        for (k in s.aviso[i]) if (s.aviso[i].hasOwnProperty(k) && --s.aviso[i][k] <= 0) delete s.aviso[i][k];
      }
      /* superpastillas que vuelven */
      for (i = s.vuelven.length - 1; i >= 0; i--) {
        var v = s.vuelven[i];
        if (--v[2] > 0) continue;
        s.vuelven.splice(i, 1);
        if (!G.pellets[v[0]][v[1]] && !this.enZona(G, v[1], v[0])) {
          G.pellets[v[0]][v[1]] = 'o';
          G.dotsLeft++;
        }
      }
      /* las pastillas no se acaban */
      if (G.dotsLeft <= 0) {
        G.loadPellets();
        this.vaciarZona(G);
      }
      this.choques(G);
      if (G.state !== 'PLAYING') return;
      this.zonaPropia(G, true);
      if (G.state !== 'PLAYING') return;
      this.recolocar(G);
      this.mirarFinal(G);
    },

    /* El invitado: el reloj y su propia zona */
    pasoInvitado: function (G) {
      if (!this.activo(G) || G.state !== 'PLAYING') return;
      var s = G.superv;
      s.t++;
      for (var i = 0; i < s.poder.length; i++) if (s.poder[i] > 0) s.poder[i]--;
      this.zonaPropia(G, false);
    },

    /* Las pastillas que caen dentro de la zona desaparecen */
    vaciarZona: function (G) {
      for (var r = 0; r < CFG.ROWS; r++) {
        for (var c = 0; c < CFG.COLS; c++) {
          if (G.pellets[r][c] && this.enZona(G, c, r)) { G.pellets[r][c] = null; G.dotsLeft--; }
        }
      }
    },

    /* Cada uno lleva la cuenta de su rato dentro de la zona: cada
     * ZONA_GRACIA ticks seguidos dentro, un corazón. A la zona no la para
     * ningún escudo ni el rato de gracia de otro golpe. */
    zonaPropia: function (G, anfitrion) {
      var s = G.superv;
      for (var i = 0; i < G.pacs.length; i++) {
        var p = G.pacs[i];
        if (!p || p.out || p.dying) { s.zonaT[i] = 0; continue; }
        if (anfitrion ? !G.isLocalAuth(i) : i !== G.localIdx) continue;
        if (!this.enZona(G, CFG.wrapCol(p.tileX()), p.tileY())) { s.zonaT[i] = 0; continue; }
        if (++s.zonaT[i] < S.ZONA_GRACIA) continue;
        s.zonaT[i] = 0;
        this.golpear(G, i, -1, 'zona', true);
        if (G.state !== 'PLAYING') return;
      }
    },

    /* ---------- el poder de la superpastilla ---------- */
    darPoder: function (G, i, ticks) {
      var s = G.superv;
      i = i | 0;
      if (!s || !(i >= 0 && i < s.poder.length)) return;
      s.poder[i] = Math.max(s.poder[i], ticks | 0);
    },

    /* Quien se come una superpastilla (Game.eatAt, en quien manda) */
    superpastilla: function (G, pac, row, col) {
      if (!this.activo(G) || !pac) return;
      this.darPoder(G, pac.id | 0, S.PODER);
      G.superv.vuelven.push([row, col, S.VUELVE]);
    },

    /* Choques entre Pac-Man. Golpea al tocar:
     *   · quien tiene PODER, a quien toque (aunque el otro también lo tenga);
     *   · quien está de CACERÍA, a los que marcó;
     *   · cualquiera, a quien un poder haya dejado AZUL (el gancho, el toque
     *     arcano): es lo mismo que comerse a un fantasma azulado.
     * Lo decide quien manda, que conoce las posiciones de todos. */
    choques: function (G) {
      var s = G.superv, A = window.PM.Hab;
      for (var a = 0; a < G.pacs.length; a++) {
        var pa = G.pacs[a];
        if (!pa || pa.out || pa.dying) continue;
        if (A && A.enDimension(a)) continue;
        for (var b = 0; b < G.pacs.length; b++) {
          if (a === b) continue;
          var pb = G.pacs[b];
          if (!pb || pb.out || pb.dying || pb.safeTicks > 0) continue;
          if (A && A.enDimension(b)) continue;
          if (distX(pa.x, pb.x) >= S.CHOQUE || Math.abs(pa.y - pb.y) >= S.CHOQUE) continue;
          var como = '';
          /* el poder NO es un escudo (10 oct, Braighton): quien lo tiene
           * golpea a quien toque, lo tenga también el otro o no (y entonces
           * se golpean los dos) */
          if (s.poder[a] > 0) como = 'poder';
          else if (A && A.sv && A.caceriaQuien[4 + b] === a) como = 'caceria';
          else if (A && A.sv && A.azulCatTicks[4 + b] > 0) como = 'azul';
          if (!como) continue;
          this.golpear(G, b, a, como);
          if (G.state !== 'PLAYING') return;
        }
      }
    },

    /* =========================================================
     * LOS GOLPES
     * ========================================================= */
    /* Algo le ha dado al jugador v. `a`: quién (-1: un fantasma o la zona);
     * `como`: con qué; `fuerza`: no lo para nada (la zona); `sinEscudo`: los
     * escudos ya se han mirado antes de llamar (el choque con un fantasma,
     * que los consulta con el fantasma delante para empujarlo).
     *
     * Devuelve si el golpe ha salido (aunque luego lo pare un escudo): es lo
     * que mira un proyectil para gastarse. */
    golpear: function (G, v, a, como, fuerza, sinEscudo) {
      var s = G.superv, p = G.pacs[v];
      if (!s || !p || p.out || p.dying || s.ganador !== -2) return false;
      if (G.isLocalAuth(v)) return this.recibir(G, v, a, como, fuerza, sinEscudo);
      /* es de otra máquina: solo quien manda se lo puede anunciar */
      if (G.netRole !== 'host') return false;
      if (!fuerza && (s.inv[v] > 0 || p.safeTicks > 0)) return false;
      /* un anuncio por causa cada poco: el contacto y las zonas siguen ahí
       * tick tras tick, y esto viaja por la red */
      var clave = como + '|' + a;
      if (s.aviso[v][clave] > 0) return true;
      s.aviso[v][clave] = S.AVISO_CADA;
      G.hostEvt({ t: 'svGolpe', v: v, a: a, c: como, f: fuerza ? 1 : 0 });
      return true;
    },

    /* En la máquina de quien lleva a ese Pac-Man: ¿lo para algo suyo? Si no,
     * el corazón lo descuenta quien manda. */
    recibir: function (G, v, a, como, fuerza, sinEscudo) {
      var s = G.superv, p = G.pacs[v], A = window.PM.Hab;
      if (!s || !p || p.out || p.dying) return false;
      if (!fuerza) {
        if (p.safeTicks > 0) return false;
        if (A && A.enDimension(v)) return false;
        var st = A ? A.estado(v) : null;
        /* REBOTE (Tanque): el primero que lo toque se lleva el golpe él */
        if (st && st.rebote > 0 && a >= 0 && a !== v && DE_CONTACTO[como]) {
          st.rebote = 0;
          st.gracia = Math.max(st.gracia, CFG.HAB.ESCUDO_GRACIA);
          A.efecto('rebote', p.x, p.y, 24);
          if (!G.netRole || G.netRole === 'host') this.golpear(G, a, v, 'rebote');
          else G.netSend('gevt', { t: 'svRebote', a: a });
          return true;
        }
        if (!sinEscudo && A && A.salvaDelChoque(G, v, null)) return true;
        p.safeTicks = S.INVULNERABLE;     // desde ya: el siguiente tick no repite
      }
      if (!G.netRole || G.netRole === 'host') this.quitar(G, v, a, como);
      else G.netSend('gevt', { t: 'svDano', a: a, c: como });
      return true;
    },

    /* Quien manda: un corazón menos (dos si quien pega lo tenía MARCADO). Con
     * el último, cae. */
    quitar: function (G, v, a, como) {
      var s = G.superv, p = G.pacs[v], A = window.PM.Hab;
      if (!s || !p || p.out || p.dying || s.ganador !== -2) return;
      a = (a >= 0 && a < G.pacs.length && a !== v) ? (a | 0) : -1;
      var dano = 1;
      if (como !== 'zona') {
        s.inv[v] = S.INVULNERABLE;
        p.safeTicks = Math.max(p.safeTicks, S.INVULNERABLE);
      }
      if (a >= 0 && A && A.sv) {
        /* MARCA (Asesino): su siguiente golpe al marcado quita dos */
        var sa = A.estado(a);
        if (sa && sa.marca > 0 && A.marcaGhost[4 + v] === a) {
          dano = 2;
          A.marcaGhost[4 + v] = -1;
          A.dar(G, a, 'marca');
        }
        /* y cuenta como una baja para lo que se alimenta de ellas (FRENESÍ) */
        A.alMatar(G, a, null, p.x, p.y);
      }
      var quedan = p.lives - dano;
      G.addPopup(p.x, p.y - 9, '-' + dano, 45);
      window.AudioSys && AudioSys.playBiteMiss && AudioSys.playBiteMiss(G.isLocalAuth(v) ? 1 : 0.5);
      if (quedan > 0) {
        p.lives = quedan;
        G.hostEvt({ t: 'svDano', v: v, a: a, n: quedan, d: dano, c: como });
        return;
      }
      /* el último: cae. La baja es de quien dio el golpe, si fue alguien */
      if (a >= 0) {
        s.bajas[a]++;
        G.addPopup(p.x, p.y - 17, 'K.O.', 60);
        G.hostEvt({ t: 'svBaja', w: a, v: v });
        if (!G.netRole || a === G.localIdx) G.bumpAch && G.bumpAch({ bajas: 1 });
      }
      p.lives = 1;                 // Game.finishPacDeath descuenta la que queda
      p.safeTicks = 0;
      G.startDeath(v, -1);
    },

    /* Anfitrión: un invitado acepta un golpe ('svDano') o dice que su REBOTE
     * lo ha devuelto ('svRebote'). Sus choques son suyos, pero el rato de
     * gracia se le lleva también aquí: no puede perder dos corazones seguidos
     * ni por un aviso repetido ni por uno inventado. */
    peticion: function (G, who, d) {
      var s = G.superv, p = G.pacs[who];
      if (!s || !d || !p || p.out || p.dying || G.state !== 'PLAYING') return;
      if (d.t === 'svRebote') {
        var A = window.PM.Hab, sr = A ? A.estado(who) : null;
        if (!sr || !(sr.rebote > 0)) return;       // un aviso inventado no devuelve nada
        sr.rebote = 0;
        A.efecto('rebote', p.x, p.y, 24);
        this.golpear(G, d.a | 0, who, 'rebote');
        return;
      }
      var como = String(d.c || 'poder');
      /* con la red de por medio su reloj y este no van clavados: se le
       * perdona un tercio del rato */
      if (como !== 'zona' && s.inv[who] > S.INVULNERABLE / 3) return;
      this.quitar(G, who, (typeof d.a === 'number') ? d.a : -1, como);
    },

    /* Lo que algún poder ha movido de sitio (un empujón, un gancho, la
     * gravedad): si es de otra máquina, hay que decírselo a su dueño, que es
     * quien manda en su posición; si no, su siguiente aviso lo devolvería a
     * donde estaba. Cada poco, que esto también viaja. */
    recolocar: function (G) {
      var A = window.PM.Hab, s = G.superv;
      if (!A || !A.sv || !A.rivales) return;
      for (var i = 0; i < A.rivales.length; i++) {
        var r = A.rivales[i];
        if (!r || !r.movido) continue;
        var p = G.pacs[i];
        if (!p || p.out || G.netRole !== 'host' || G.isLocalAuth(i)) { r.movido = false; continue; }
        if (s.posT[i] > 0) continue;
        s.posT[i] = S.POS_CADA;
        r.movido = false;
        A.dar(G, i, 'pos', [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, p.dir]);
      }
    },

    /* Al quedarse alguien fuera (Game.finishPacDeath) */
    alCaer: function (G, i) {
      if (!this.activo(G)) return;
      if (G.superv.caidos.indexOf(i) < 0) G.superv.caidos.push(i);
    },

    /* ¿Queda uno solo? Se acaba y gana él */
    mirarFinal: function (G) {
      var s = G.superv;
      if (s.ganador !== -2 || G.playerCount < 2) return;
      for (var i = 0; i < G.pacs.length; i++) if (G.pacs[i].dying) return;
      var vivos = [];
      for (i = 0; i < G.pacs.length; i++) if (!G.pacs[i].out) vivos.push(i);
      if (vivos.length > 1) return;
      s.ganador = vivos.length === 1 ? vivos[0] : -1;
      G.stopAllLoops();
      G.acabarPartida();
    },

    /* Todos cayeron a la vez (parón clásico de Game.stepDying) */
    empate: function (G) {
      if (this.activo(G) && G.superv.ganador === -2) G.superv.ganador = -1;
    },

    /* La clasificación: el ganador, y después del último en caer al primero */
    clasificacion: function (G) {
      var s = G.superv, out = [], i;
      if (!s) return out;
      if (s.ganador >= 0) out.push(s.ganador);
      for (i = 0; i < G.pacs.length; i++) {
        if (!G.pacs[i].out && out.indexOf(i) < 0 && s.caidos.indexOf(i) < 0) out.push(i);
      }
      for (i = s.caidos.length - 1; i >= 0; i--) if (out.indexOf(s.caidos[i]) < 0) out.push(s.caidos[i]);
      // quien se fue de la partida sin caer
      for (i = 0; i < G.pacs.length; i++) if (out.indexOf(i) < 0) out.push(i);
      return out;
    },

    /* ---------- red ---------- */
    resumen: function (G) {
      var s = G.superv;
      if (!s) return undefined;
      return { t: s.t, an: s.anillo, po: s.poder.slice(), ba: s.bajas.slice(),
               ca: s.caidos.slice(), ga: s.ganador };
    },

    aplicar: function (G, r) {
      if (!r) return;
      if (!G.superv) this.empezar(G, G.pacs.length);
      var s = G.superv;
      s.t = r.t | 0;
      s.anillo = r.an | 0;
      if (r.po) s.poder = r.po.slice();
      if (r.ba) s.bajas = r.ba.slice();
      if (r.ca) s.caidos = r.ca.slice();
      if (typeof r.ga === 'number') s.ganador = r.ga;
    },

    /* Lo que cuenta el anfitrión (invitados y mirones) */
    evento: function (G, e) {
      if (!G.superv) return;
      var v, p;
      if (e.t === 'svZona') {
        G.superv.anillo = Math.max(G.superv.anillo, e.a | 0);
        window.AudioSys && AudioSys.playShout && AudioSys.playShout(0.6);
      } else if (e.t === 'svBaja') {
        var pb = G.pacs[e.v | 0];
        if (pb) G.addPopup(pb.x, pb.y - 17, 'K.O.', 60);
        if ((e.w | 0) === G.localIdx && !G.isSpec()) G.bumpAch && G.bumpAch({ bajas: 1 });
      } else if (e.t === 'svGolpe') {
        /* me anuncian un golpe: lo miro yo, que es mi Pac-Man */
        v = e.v | 0;
        if (v === G.localIdx && !G.isSpec()) {
          this.recibir(G, v, (typeof e.a === 'number') ? e.a : -1, String(e.c || 'poder'), !!e.f);
        }
      } else if (e.t === 'svDano') {
        /* un corazón menos, ya decidido */
        v = e.v | 0;
        p = G.pacs[v];
        if (!p) return;
        if (typeof e.n === 'number') p.lives = e.n | 0;
        if (e.c !== 'zona') p.safeTicks = Math.max(p.safeTicks, S.INVULNERABLE);
        G.addPopup(p.x, p.y - 9, '-' + ((e.d | 0) || 1), 45);
        window.AudioSys && AudioSys.playBiteMiss && AudioSys.playBiteMiss(v === G.localIdx ? 1 : 0.5);
      }
    },

    /* =========================================================
     * EL DIBUJO
     * ========================================================= */
    /* La zona roja y el anillo que va a cerrarse (en el suelo) */
    dibujarSuelo: function (G, ctx) {
      if (!this.activo(G)) return;
      var s = G.superv, Y = CFG.MAZE_Y, tk = G.tick;
      var falta = this.faltaCierre(G);
      var avisa = falta >= 0 && falta < S.AVISO;
      ctx.save();
      for (var r = 0; r < CFG.ROWS; r++) {
        for (var c = 0; c < CFG.COLS; c++) {
          var an = this.anilloDe(c, r);
          if (an < s.anillo) {
            ctx.fillStyle = 'rgba(255, 30, 30, ' + (0.22 + 0.08 * Math.sin(tk / 10)) + ')';
            ctx.fillRect(c * T, r * T + Y, T, T);
          } else if (avisa && an === s.anillo && Math.floor(tk / 8) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 140, 0, 0.18)';
            ctx.fillRect(c * T, r * T + Y, T, T);
          }
        }
      }
      ctx.restore();
    },

    /* Un corazón de 5 x 4 píxeles con la esquina de arriba a la izquierda en (x, y) */
    corazon: function (ctx, x, y) {
      ctx.fillRect(x + 1, y, 1, 1);
      ctx.fillRect(x + 3, y, 1, 1);
      ctx.fillRect(x, y + 1, 5, 1);
      ctx.fillRect(x + 1, y + 2, 3, 1);
      ctx.fillRect(x + 2, y + 3, 1, 1);
    },

    /* Encima de cada Pac-Man: sus corazones, el aura del poder y lo que le
     * hayan hecho los demás (clavado, frenado, azul) */
    dibujarPac: function (G, ctx, pc, i) {
      if (!this.activo(G)) return;
      var s = G.superv, A = window.PM.Hab, tk = G.tick;
      var x = Math.round(pc.x), y = Math.round(pc.y + CFG.MAZE_Y);
      ctx.save();
      /* los corazones: los que quedan en rojo, los perdidos apagados */
      var n = S.CORAZONES, x0 = x - Math.floor((n * 6 - 1) / 2), k;
      for (k = 0; k < n; k++) {
        ctx.fillStyle = (k < pc.lives) ? '#ff2a4d' : 'rgba(255, 255, 255, 0.22)';
        this.corazon(ctx, x0 + k * 6, y - 15);
      }
      if (s.poder[i] > 0) {
        var fin = s.poder[i] < 90 && Math.floor(tk / 6) % 2 === 0;
        ctx.strokeStyle = fin ? 'rgba(255, 255, 255, 0.8)' : '#ff2a2a';
        ctx.shadowColor = '#ff2a2a';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pc.x, pc.y + CFG.MAZE_Y, 10 + Math.sin(tk / 4), 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      if (A && A.sv) {
        var id = 4 + i, cx = pc.x, cy = pc.y + CFG.MAZE_Y;
        ctx.lineWidth = 1.5;
        if (A.hielo[id] > 0) {                        // congelado: un bloque de hielo
          ctx.fillStyle = 'rgba(140, 220, 255, 0.35)';
          ctx.strokeStyle = '#bfefff';
          ctx.fillRect(cx - 8, cy - 8, 16, 16);
          ctx.strokeRect(cx - 8, cy - 8, 16, 16);
        } else if (A.aturdido[id] > 0) {              // aturdido: tres chispas dando vueltas
          ctx.fillStyle = '#ffe24a';
          for (k = 0; k < 3; k++) {
            var ang = tk / 6 + k * 2.094;
            ctx.fillRect(Math.round(cx + Math.cos(ang) * 9) - 1, Math.round(cy - 9 + Math.sin(ang) * 3) - 1, 2, 2);
          }
        } else if (A.frenoRival(i) < 1) {             // frenado: un aro gris a rayas
          ctx.strokeStyle = 'rgba(200, 200, 220, 0.8)';
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(cx, cy, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (A.azulCatTicks[id] > 0 && Math.floor(tk / 5) % 2 === 0) {   // azul: lo golpea cualquiera
          ctx.strokeStyle = '#2f6bff';
          ctx.beginPath();
          ctx.arc(cx, cy, 11, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (A.caceriaQuien[id] >= 0 || A.marcaGhost[id] >= 0) {         // marcado: una mira
          ctx.strokeStyle = G.colorFor(A.caceriaQuien[id] >= 0 ? A.caceriaQuien[id] : A.marcaGhost[id]);
          ctx.beginPath();
          ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 8, cy);
          ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 12, cy);
          ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy - 8);
          ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 12);
          ctx.stroke();
        }
      }
      ctx.restore();
    },

    /* Arriba: cuántos quedan y cuándo se cierra la zona */
    dibujarHUD: function (G, ctx) {
      if (!this.activo(G) || G.state === 'MENU') return;
      var falta = this.faltaCierre(G);
      var W = CFG.COLS * T, y = CFG.MAZE_Y + 3;
      var txt = 'VIVOS ' + this.vivos(G) + '/' + G.playerCount;
      if (falta >= 0) txt += '  ·  LA ZONA SE CIERRA EN ' + Math.ceil(falta / 60);
      else txt += '  ·  ZONA CERRADA';
      ctx.save();
      ctx.font = window.PM.Letra ? window.PM.Letra.lienzo(5) : '5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      var w = ctx.measureText(txt).width + 10;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect((W - w) / 2, y - 2, w, 10);
      ctx.fillStyle = (falta >= 0 && falta < S.AVISO && Math.floor(G.tick / 8) % 2 === 0) ? '#ff8c00' : '#ffd400';
      ctx.fillText(txt, W / 2, y);
      ctx.restore();
    }
  };

  window.PM.Superv = Superv;
})();
