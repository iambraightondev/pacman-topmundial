/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/supervivencia.js
 * Modo SUPERVIVENCIA (party online). Define window.PM.Superv
 *
 * Todos contra todos, con una vida cada uno. Gana el último Pac-Man vivo.
 *
 *   · Los fantasmas de la máquina siguen ahí y matan como siempre.
 *   · SUPERPASTILLA: además de asustar a los fantasmas, a quien se la come
 *     le da PODER unos segundos: tocar a otro Pac-Man que no lo tenga lo
 *     elimina. Las superpastillas vuelven a salir al rato.
 *   · LA ZONA: pasado un rato, el laberinto se cierra por fuera, un anillo
 *     de casillas cada poco. Quien se queda dentro de la zona roja más de un
 *     par de segundos, cae.
 *   · Las pastillas no se acaban: al comerse todas, vuelven.
 *
 * No cuenta para el TOP MUNDIAL ni para los récords, no hay CONTINUAR ni se
 * revive a nadie.
 *
 * Quién decide qué (online): el anfitrión lleva la zona, el poder, las
 * superpastillas que vuelven, los choques entre Pac-Man (conoce las
 * posiciones de todos) y el final. Cada uno decide su muerte por la zona,
 * igual que decide la suya contra los fantasmas. Todo el estado vive en
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

  var Superv = {
    empezar: function (G, n) {
      var po = [], zt = [], ba = [];
      for (var i = 0; i < n; i++) { po.push(0); zt.push(0); ba.push(0); }
      G.superv = {
        t: 0,              // ticks jugados
        anillo: 0,         // anillos de casillas ya cerrados
        poder: po,         // ticks de poder de cada jugador
        zonaT: zt,         // ticks de cada uno dentro de la zona
        bajas: ba,         // Pac-Man eliminados por cada uno
        caidos: [],        // orden en que cayeron
        vuelven: [],       // superpastillas comidas: [fila, col, ticks]
        ganador: -2        // -2 en juego, -1 empate, i el que gana
      };
    },

    activo: function (G) { return !!(G && G.superv); },

    /* ---------- la zona ---------- */
    anilloDe: function (col, row) {
      return Math.min(col, CFG.COLS - 1 - col, row, CFG.ROWS - 1 - row);
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
      var s = G.superv, i;
      s.t++;
      if (this.faltaCierre(G) === 0) {
        s.anillo++;
        this.vaciarZona(G);
        G.hostEvt({ t: 'svZona', a: s.anillo });
        window.AudioSys && AudioSys.playShout && AudioSys.playShout(0.6);
      }
      for (i = 0; i < s.poder.length; i++) if (s.poder[i] > 0) s.poder[i]--;
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
      this.zonaPropia(G, true);
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

    /* Cada uno lleva la cuenta de su rato dentro de la zona y decide su caída */
    zonaPropia: function (G, anfitrion) {
      var s = G.superv;
      for (var i = 0; i < G.pacs.length; i++) {
        var p = G.pacs[i];
        if (!p || p.out || p.dying) { s.zonaT[i] = 0; continue; }
        if (anfitrion ? !G.isLocalAuth(i) : i !== G.localIdx) continue;
        if (!this.enZona(G, p.tileX(), p.tileY())) { s.zonaT[i] = 0; continue; }
        if (++s.zonaT[i] < S.ZONA_GRACIA) continue;
        s.zonaT[i] = 0;
        if (anfitrion) {
          G.startDeath(i, -1);
        } else {
          G.startPacDeath(i);
          G.predictFreeze = CFG.DEATH_CONFIRM_TICKS;
          G.netSend('gevt', { t: 'died', g: -1 });
        }
      }
    },

    /* Quien se come una superpastilla (Game.eatAt, en quien manda) */
    superpastilla: function (G, pac, row, col) {
      if (!this.activo(G) || !pac) return;
      var s = G.superv, i = pac.id | 0;
      if (i >= 0 && i < s.poder.length) s.poder[i] = S.PODER;
      s.vuelven.push([row, col, S.VUELVE]);
    },

    /* Choques entre Pac-Man: el que tiene poder elimina al que no */
    choques: function (G) {
      var s = G.superv;
      for (var a = 0; a < G.pacs.length; a++) {
        var pa = G.pacs[a];
        if (!(s.poder[a] > 0) || !pa || pa.out || pa.dying) continue;
        for (var b = 0; b < G.pacs.length; b++) {
          if (a === b) continue;
          var pb = G.pacs[b];
          if (!pb || pb.out || pb.dying || s.poder[b] > 0 || pb.safeTicks > 0) continue;
          if (distX(pa.x, pb.x) >= S.CHOQUE || Math.abs(pa.y - pb.y) >= S.CHOQUE) continue;
          s.bajas[a]++;
          G.addPopup(pb.x, pb.y - 8, 'K.O.', 60);
          G.hostEvt({ t: 'svBaja', w: a, v: b });
          if (!G.netRole || a === G.localIdx) G.bumpAch && G.bumpAch({ bajas: 1 });
          G.startDeath(b, -1);
          if (G.state !== 'PLAYING') return;
        }
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

    evento: function (G, e) {
      if (!G.superv) return;
      if (e.t === 'svZona') {
        G.superv.anillo = Math.max(G.superv.anillo, e.a | 0);
        window.AudioSys && AudioSys.playShout && AudioSys.playShout(0.6);
      } else if (e.t === 'svBaja') {
        var pb = G.pacs[e.v | 0];
        if (pb) G.addPopup(pb.x, pb.y - 8, 'K.O.', 60);
        if ((e.w | 0) === G.localIdx && !G.isSpec()) G.bumpAch && G.bumpAch({ bajas: 1 });
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

    /* El aura del que tiene poder */
    dibujarPac: function (G, ctx, pc, i) {
      if (!this.activo(G)) return;
      var s = G.superv;
      if (!(s.poder[i] > 0)) return;
      var fin = s.poder[i] < 90 && Math.floor(G.tick / 6) % 2 === 0;
      ctx.save();
      ctx.strokeStyle = fin ? 'rgba(255, 255, 255, 0.8)' : '#ff2a2a';
      ctx.shadowColor = '#ff2a2a';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pc.x, pc.y + CFG.MAZE_Y, 10 + Math.sin(G.tick / 4), 0, Math.PI * 2);
      ctx.stroke();
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
