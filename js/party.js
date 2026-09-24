/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/party.js
 * Salas de grupo persistentes. Define window.PM.Party
 *
 * Se entra una vez con un código y se sigue dentro aunque se
 * vuelva al menú o termine la partida: el canal de red no se
 * cierra. De ahí salen las partidas de 2, 3 y 4 jugadores.
 *
 * El canal es el MISMO que usa la partida (sala:<código>), así
 * que no hace falta reconectar al empezar a jugar. Los mensajes
 * de party van con prefijo p para no chocar con los del juego:
 *
 *   phello  {v,n,c,k,r}  cada miembro se anuncia y sigue latiendo (r: su rol
 *                        de DESATADO)
 *   proster {v,lider,m}  el líder reparte la lista de miembros
 *   pbye    {lider}      alguien se va (o el líder disuelve)
 *   pfull   {to}         no caben más
 *   pstart  {v,cfg,ord,hab,caza}  el líder arranca la partida
 *
 * Aparte, cada jugador escucha un canal propio (usuario:<nick>)
 * por donde le llegan invitaciones de sus amigos.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  var HELLO_MS = 2000;    // latido de cada miembro
  var GONE_MS = 7000;     // sin latido durante este rato: fuera de la lista
  var JOIN_MS = 6000;     // sin respuesta al entrar: la party no existe

  function now() { return new Date().getTime(); }

  function cleanNick(v) {
    var s = String(v == null ? '' : v).toUpperCase();
    s = s.replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').replace(/^ | $/g, '');
    return s.slice(0, CFG.NICK_MAX);
  }

  /* Canal personal de un jugador: sirve para recibir invitaciones */
  function userTopic(name) {
    return 'usuario:' + cleanNick(name).replace(/ /g, '_');
  }

  function cleanCode(v) {
    return String(v == null ? '' : v).toUpperCase().replace(/[^A-Z]/g, '');
  }

  var Party = {
    st: null,        // { code, leader, members:[{s,n,c,k,t}], status }
    order: null,     // orden de juego mientras dura la partida
    userCh: null,    // canal personal (invitaciones)
    userNick: null,
    beatTimer: null,
    ghostPick: -1,   // PAC-MAN VS.: fantasma pedido (-1 = jugar de Pac-Man)
    /* Modo DESATADO: lo decide QUIEN MANDA y vale para todo el grupo. No
     * se pregunta uno por uno a propósito: media party con poderes y media
     * sin ellos no es una partida, son dos. */
    habPick: false,
    clasifPick: false,   // CLASIFICATORIA: DESATADO con el rango en juego
    /* Modo CACERÍA: igual, lo decide el líder. Con él puesto TODOS llevan
     * fantasma (el de su asiento) y el Pac-Man lo lleva la máquina, así que
     * el reparto de fantasmas de PAC-MAN VS. no pinta nada. */
    cazaPick: false,
    /* SUPERVIVENCIA: también del líder, y excluye a los otros dos. Todos van
     * de Pac-Man (el reparto de fantasmas no pinta nada). */
    supervPick: false,

    /* la UI se engancha aquí */
    onchange: null,  // la lista o el estado han cambiado
    oninvite: null,  // function(deQuien, codigo)
    onstart: null,   // function(orden, miIndice, cfgDelLider, rol)
    onerror: null,   // function(mensaje)

    /* ---------- estado ---------- */
    active: function () { return !!(this.st && this.st.status === 'dentro'); },
    connecting: function () { return !!(this.st && this.st.status === 'conectando'); },
    inParty: function () { return !!this.st; },
    isLeader: function () { return !!(this.st && this.st.leader); },
    /* el sid del líder: el mío si lo soy, el que diga la lista si no */
    sidLider: function () {
      if (!this.st) return null;
      return this.st.leader ? window.PM.Net.sid : this.st.leaderSid;
    },

    /* ¿Ese miembro es el que manda? El líder no tiene que decir que está
     * listo: es quien da la salida. Si la lista todavía no dice quién es
     * (recién creada), el líder es el primero, que es como se arma. */
    esLider: function (m) {
      if (!m || !this.st) return false;
      var sid = this.sidLider();
      if (sid && m.s === sid) return true;
      if (!this.st.leaderSid && this.st.members.length) return this.st.members[0].s === m.s;
      return false;
    },
    code: function () { return this.st ? this.st.code : null; },
    members: function () { return this.st ? this.st.members.slice() : []; },
    count: function () { return this.st ? this.st.members.length : 0; },
    full: function () { return this.count() >= CFG.MAX_PLAYERS; },
    canStart: function () {
      // en CACERÍA nadie lleva Pac-Man: lo lleva la máquina
      return this.active() && this.isLeader() && this.count() >= 2 &&
        (this.anyPac() || this.cazaPick || this.supervPick) &&
        this.todosListos() &&
        !(window.PM.Game && window.PM.Game.inGame());
    },

    me: function () {
      var s = window.PM.settings || {};
      return {
        s: window.PM.Net.sid,
        n: cleanNick(s.nick1) || 'JUGADOR',
        c: s.pacColor || CFG.PLAYER_COLORS[0],
        k: s.skin1 || 'clasico',
        // lo puesto de la TIENDA (solo si es tuyo: lo mira PM.Tienda)
        a: window.PM.Tienda ? window.PM.Tienda.accesorio() : '',
        x: window.PM.Tienda ? window.PM.Tienda.efecto() : '',
        g: this.ghostPick,
        // el rol de DESATADO que tiene elegido (lo reparte el líder)
        r: CFG.HAB.rol(s.habRol1),
        h: CFG.HAB.loadoutValido(CFG.HAB.rol(s.habRol1), s.habLoadout1),
        // su escalón del RANGO, para enseñarlo junto a su nombre (-1: sin rango)
        rg: this.miTramo(),
        t: now()
      };
    },

    miTramo: function () {
      var Rg = window.PM.Rango;
      if (!Rg || !Rg.conCuenta || !Rg.conCuenta()) return -1;
      var e = Rg.estado();
      return (e && e.tramo >= 0) ? e.tramo : -1;
    },

    /* ---------- DESATADO: el rol de cada uno ----------
     * Cada uno elige el suyo y NINGUNO SE REPITE (18 sep): antes solo el
     * Soporte era único. El líder arbitra: al que pida uno que ya lleva otro
     * se le deja el que tuviera, y si tampoco, el primero que quede libre.
     * Hay cuatro roles y como mucho cuatro plazas, así que siempre sale. */
    rolDeOtro: function (rol, sid) {
      if (!this.st) return false;
      sid = sid || window.PM.Net.sid;
      rol = CFG.HAB.rol(rol);
      for (var i = 0; i < this.st.members.length; i++) {
        var m = this.st.members[i];
        if (m.s !== sid && CFG.HAB.rol(m.r) === rol) return true;
      }
      return false;
    },

    claimRol: function (sid, rol) {
      rol = CFG.HAB.rol(rol);
      if (!this.st) return rol;
      if (!this.rolDeOtro(rol, sid)) return rol;
      /* el que pide está cogido: se le deja el suyo de antes, si sigue libre */
      var i, mio = null;
      for (i = 0; i < this.st.members.length; i++) {
        if (this.st.members[i].s === sid) { mio = CFG.HAB.rol(this.st.members[i].r); break; }
      }
      if (mio && !this.rolDeOtro(mio, sid)) return mio;
      var ids = CFG.HAB.ROL_IDS;
      for (i = 0; i < ids.length; i++) {
        if (!this.rolDeOtro(ids[i], sid)) return ids[i];
      }
      return rol;
    },

    myRol: function () {
      var m = this.selfEntry();
      return m ? CFG.HAB.rol(m.r) : CFG.HAB.rol((window.PM.settings || {}).habRol1);
    },

    setRol: function (rol) {
      rol = CFG.HAB.rol(rol);
      var s = window.PM.settings;
      if (s) s.habRol1 = rol;
      if (!this.st) return;
      if (this.st.leader) {
        var m = this.selfEntry();
        if (m) m.r = this.claimRol(window.PM.Net.sid, rol);
        this.sendRoster();
      } else {
        window.PM.Net.send('phello', this.hello());
      }
      this.changed();
    },

    /* LOS PODERES DE CADA UNO (23 sep). En la sala solo se podía elegir el
     * rol: los poderes eran los últimos que cada uno hubiera guardado jugando
     * solo, y si cambiaba de rol en la sala le tocaban los de serie. Ahora
     * cada uno arma los suyos aquí, igual que el rol, y viajan con él. */
    setCarga: function (raw) {
      var s = window.PM.settings;
      var rol = this.myRol();
      var h = CFG.HAB.loadoutValido(rol, raw);
      if (s) s.habLoadout1 = h;
      if (!this.st) return;
      /* en mi fila ya, sin esperar a que el líder la devuelva: si no, el botón
       * pulsado se apagaba un viaje de red y dos clics seguidos se pisaban */
      var m = this.selfEntry();
      if (m) m.h = h;
      if (this.st.leader) {
        this.sendRoster();
      } else {
        window.PM.Net.send('phello', this.hello());
      }
      this.changed();
    },

    /* Mis poderes tal y como los tiene la sala (los del rol que me tocó) */
    myCarga: function () {
      var m = this.selfEntry(), rol = this.myRol();
      var s = window.PM.settings || {};
      return CFG.HAB.loadoutValido(rol, (m && m.h) || s.habLoadout1);
    },

    /* ---------- PAC-MAN VS.: quién lleva fantasma ----------
     * El líder es quien reparte: si dos piden el mismo, el segundo se queda
     * sin él. Así nadie puede acabar con el fantasma de otro. */
    ghostOwner: function (gid) {
      if (!this.st) return null;
      for (var i = 0; i < this.st.members.length; i++) {
        if (this.st.members[i].g === gid) return this.st.members[i].s;
      }
      return null;
    },

    claim: function (sid, gid) {
      gid = parseInt(gid, 10);
      if (!(gid >= 0 && gid < 4)) return -1;
      var duenyo = this.ghostOwner(gid);
      return (!duenyo || duenyo === sid) ? gid : -1;
    },

    /* Sin Pac-Man no hay partida: alguien tiene que dejarse comer */
    anyPac: function () {
      if (!this.st) return false;
      for (var i = 0; i < this.st.members.length; i++) {
        if (!(this.st.members[i].g >= 0)) return true;
      }
      return false;
    },

    /* El fantasma que me ha quedado DE VERDAD: lo dice la lista del líder,
     * no lo que yo haya pedido (que puede estar cogido). */
    myGhost: function () {
      if (!this.st) return -1;
      for (var i = 0; i < this.st.members.length; i++) {
        if (this.st.members[i].s === window.PM.Net.sid) {
          var g = this.st.members[i].g;
          return (g >= 0 && g < 4) ? g : -1;
        }
      }
      return -1;
    },

    /* Elegir fantasma (o volver a Pac-Man con -1) desde la sala */
    setGhost: function (gid) {
      gid = parseInt(gid, 10);
      if (!(gid >= 0 && gid < 4)) gid = -1;
      this.ghostPick = gid;
      if (!this.st) return;
      if (this.st.leader) {
        for (var i = 0; i < this.st.members.length; i++) {
          if (this.st.members[i].s === window.PM.Net.sid) {
            this.st.members[i].g = this.claim(window.PM.Net.sid, gid);
          }
        }
        this.sendRoster();
      } else {
        window.PM.Net.send('phello', this.hello());
      }
      this.changed();
    },

    /* Modo DESATADO de la party. Solo el líder lo cambia, y el cambio se
     * reparte con la lista para que a nadie le pille por sorpresa. */
    setHab: function (on) {
      if (!this.st || !this.st.leader) return;
      this.habPick = !!on;
      if (!this.habPick) this.clasifPick = false;
      if (this.habPick) { this.cazaPick = false; this.supervPick = false; }   // o una cosa o la otra
      this.sendRoster();
      this.changed();
    },

    /* Modo CACERÍA de la party. También del líder, y excluye a DESATADO. */
    setCaza: function (on) {
      if (!this.st || !this.st.leader) return;
      this.cazaPick = !!on;
      if (this.cazaPick) { this.habPick = false; this.clasifPick = false; this.supervPick = false; }
      this.sendRoster();
      this.changed();
    },

    /* El modo de la party de una vez (la cartelera de la sala): 'equipo',
     * 'hab', 'caza' o 'superv'. Excluyentes entre sí. */
    setModo: function (id) {
      if (!this.st || !this.st.leader) return;
      this.habPick = (id === 'hab' || id === 'clasif');
      this.clasifPick = (id === 'clasif');
      this.cazaPick = (id === 'caza');
      this.supervPick = (id === 'superv');
      this.sendRoster();
      this.changed();
    },

    /* Modo SUPERVIVENCIA de la party: del líder, excluye a los otros dos */
    setSuperv: function (on) {
      if (!this.st || !this.st.leader) return;
      this.supervPick = !!on;
      if (this.supervPick) { this.habPick = false; this.clasifPick = false; this.cazaPick = false; }
      this.sendRoster();
      this.changed();
    },

    /* Índice de juego de una sesión (lo consulta game.js con 3 y 4) */
    indexOf: function (sid) {
      if (!this.order) return -1;
      for (var i = 0; i < this.order.length; i++) {
        if (this.order[i].s === sid) return i;
      }
      return -1;
    },

    /* ---------- entrar y salir ---------- */
    create: function () {
      if (!window.PM.Net.configured()) return;
      this.connect(window.PM.Net.randomCode(), true);
    },

    join: function (code) {
      code = cleanCode(code);
      if (code.length !== CFG.NET.ROOM_LEN) {
        this.fail('EL CÓDIGO TIENE ' + CFG.NET.ROOM_LEN + ' LETRAS');
        return;
      }
      if (!window.PM.Net.configured()) return;
      this.connect(code, false);
    },

    connect: function (code, leader) {
      var self = this;
      this.close();
      this.st = {
        code: code, leader: !!leader, members: [], status: 'conectando',
        joinTimer: null
      };
      if (leader) this.st.members = [this.me()];
      window.PM.Net.handler = function (n, d, sid) { self.onData(n, d, sid); };
      window.PM.Net.onclose = function () { self.fail('SE PERDIÓ LA CONEXIÓN'); };
      this.changed();
      window.PM.Net.connect(code, {
        onOpen: function () {
          if (!self.st) return;
          if (self.st.leader) {
            self.st.status = 'dentro';
          } else {
            window.PM.Net.send('phello', self.hello());
            self.st.joinTimer = setTimeout(function () {
              if (self.st && self.st.status !== 'dentro') {
                self.fail('NO SE ENCONTRÓ LA PARTY');
              }
            }, JOIN_MS);
          }
          self.startBeat();
          self.changed();
        },
        onError: function (m) { self.fail(m || 'SIN CONEXIÓN'); }
      });
    },

    hello: function () {
      var m = this.me();
      /* h: los PODERES. Faltaban (23 sep): el rol viajaba y los poderes no,
       * así que el líder le ponía a cada invitado los de serie de su rol */
      return { v: CFG.NET.PROTO, n: m.n, c: m.c, k: m.k, a: m.a, x: m.x, g: m.g, r: m.r, h: m.h,
               rg: m.rg, l: this.listo ? 1 : 0 };
    },

    /* ---------- EL LISTO (20 sep) ----------
     * El líder no puede arrancar hasta que todos lo digan. Sirve para dos
     * cosas: que nadie entre a una partida que no vio empezar —pasaba con
     * quien tenía la pestaña en segundo plano: salía de AFK y se quedaba solo
     * en la sala— y que se pueda elegir rol con calma sin que te arranquen.
     * El líder cuenta como listo siempre: es quien da la salida. */
    estoyListo: function () {
      if (!this.st) return false;
      if (this.st.leader) return true;
      var m = this.selfEntry();
      return !!(m && m.l);
    },

    setListo: function (v) {
      this.listo = !!v;
      if (!this.st) return;
      var m = this.selfEntry();
      if (m) m.l = this.listo ? 1 : 0;
      if (this.st.leader) this.sendRoster();
      else window.PM.Net.send('phello', this.hello());
      this.changed();
    },

    /* ¿Están todos los que no son el líder? */
    todosListos: function () {
      if (!this.st) return false;
      for (var i = 0; i < this.st.members.length; i++) {
        var m = this.st.members[i];
        if (this.esLider(m)) continue;
        if (!m.l) return false;
      }
      return true;
    },

    /* Cuántos lo han dicho ya (el líder incluido) */
    cuantosListos: function () {
      if (!this.st) return 0;
      var n = 0;
      for (var i = 0; i < this.st.members.length; i++) {
        if (this.st.members[i].l || this.esLider(this.st.members[i])) n++;
      }
      return n;
    },

    /* Nombre, color o skin cambiados en PERFIL con la party ya abierta.
     * El líder se apunta a sí mismo UNA vez al crearla y onHello solo
     * refresca a los demás, así que su skin se quedaba en la de entrar y la
     * partida salía con la vieja. El invitado se enteraba al siguiente latido,
     * pero si el líder arrancaba antes también salía la vieja. Ahora se
     * reparte en el acto. En partida no: se verá en la siguiente. */
    refreshMe: function () {
      if (!this.st) return;
      var G = window.PM.Game;
      if (G && G.inGame() && !G.isSpec()) return;
      var yo = this.me();
      if (this.st.leader) {
        if (!this.updateSelf(yo)) return;
        if (this.st.status === 'dentro') this.sendRoster();
      } else {
        var m = this.selfEntry();
        if (m && m.n === yo.n && m.c === yo.c && m.k === yo.k && m.a === yo.a && m.x === yo.x &&
            m.r === yo.r && m.h === yo.h) return;
        window.PM.Net.send('phello', this.hello());
      }
      this.changed();
    },

    selfEntry: function () {
      if (!this.st) return null;
      for (var i = 0; i < this.st.members.length; i++) {
        if (this.st.members[i].s === window.PM.Net.sid) return this.st.members[i];
      }
      return null;
    },

    /* El líder copia sus datos actuales en su propia fila; dice si cambió algo */
    updateSelf: function (yo) {
      var m = this.selfEntry();
      if (!m) return false;
      yo = yo || this.me();
      var rol = this.claimRol(m.s, yo.r);
      /* y los PODERES: el líder no los copiaba nunca, así que en la partida
       * salía con los que tenía al abrir la sala */
      var h = CFG.HAB.loadoutValido(rol, yo.h);
      var cambia = m.n !== yo.n || m.c !== yo.c || m.k !== yo.k || m.a !== yo.a || m.x !== yo.x ||
        m.r !== rol || m.h !== h || m.rg !== yo.rg;
      m.n = yo.n; m.c = yo.c; m.k = yo.k; m.a = yo.a; m.x = yo.x; m.t = yo.t; m.r = rol; m.h = h;
      m.rg = yo.rg;
      return cambia;
    },

    /* Salir de la party. El líder la disuelve. */
    leave: function () {
      if (!this.st) return;
      try { window.PM.Net.send('pbye', { lider: this.st.leader ? 1 : 0 }); }
      catch (e) { /* canal ya cerrado */ }
      this.close();
      this.changed();
    },

    close: function () {
      this.stopBeat();
      if (this.st && this.st.joinTimer) clearTimeout(this.st.joinTimer);
      this.st = null;
      this.order = null;
      // el modo era de ESA party: la siguiente empieza como empieza todo
      this.habPick = false;
      this.clasifPick = false;
      this.cazaPick = false;
      this.supervPick = false;
      window.PM.Net.leave();
    },

    fail: function (msg) {
      var wasIn = !!this.st;
      this.close();
      this.changed();
      if (wasIn && this.onerror) this.onerror(msg);
    },

    changed: function () { if (this.onchange) this.onchange(); },

    /* ---------- latido y lista ---------- */
    startBeat: function () {
      var self = this;
      this.stopBeat();
      this.beatTimer = setInterval(function () { self.beat(); }, HELLO_MS);
    },

    stopBeat: function () {
      if (this.beatTimer) { clearInterval(this.beatTimer); this.beatTimer = null; }
    },

    /* Mientras se juega no hace falta: el canal ya va lleno de partida.
     * Mirando la partida de otro sí se sigue latiendo: eso pasa por un canal
     * aparte y el grupo propio no tiene por qué darte por desaparecido. */
    beat: function () {
      if (!this.st) return;
      var G = window.PM.Game;
      if (G && G.inGame() && !G.isSpec()) return;
      if (this.st.leader) {
        var cambio = this.prune();
        if (this.updateSelf()) cambio = true;   // por si cambió sin avisar
        if (cambio) this.changed();
        this.sendRoster();
      } else {
        window.PM.Net.send('phello', this.hello());
      }
    },

    prune: function () {
      var t = now(), out = [], changed = false;
      for (var i = 0; i < this.st.members.length; i++) {
        var m = this.st.members[i];
        if (m.s === window.PM.Net.sid || (t - m.t) < GONE_MS) out.push(m);
        else changed = true;
      }
      this.st.members = out;
      return changed;
    },

    sendRoster: function () {
      window.PM.Net.send('proster', {
        v: CFG.NET.PROTO,
        lider: window.PM.Net.sid,
        m: this.st.members,
        // el modo de la partida viaja con la lista: nadie debería enterarse
        // de que se juega con poderes al arrancar la partida
        hab: !!this.habPick,
        cl: !!(this.habPick && this.clasifPick),
        caza: !!this.cazaPick,
        sv: !!this.supervPick
      });
    },

    onData: function (name, d, sid) {
      if (!this.st) return;
      switch (name) {
        case 'phello': this.onHello(d, sid); break;
        case 'proster': this.onRoster(d); break;
        case 'pbye': this.onBye(d, sid); break;
        case 'pfull':
          if (d && d.to === window.PM.Net.sid) this.fail('LA PARTY ESTÁ LLENA');
          break;
        case 'pstart':
          if (!this.st.leader) this.begin(d, false);
          break;
        /* «¿me he perdido algo?»: lo manda quien vuelve al juego después de
         * tener la pestaña dormida. Si había partida, se le repite la salida
         * y entra; si no, no pasa nada. */
        case 'pwho':
          if (this.st.leader && this.salida) window.PM.Net.send('pstart', this.salida);
          break;
      }
    },

    onHello: function (d, sid) {
      if (!this.st.leader || !d) return;
      if (d.v !== CFG.NET.PROTO) {
        window.PM.Net.send('pfull', { to: sid });
        return;
      }
      var m = null, i;
      for (i = 0; i < this.st.members.length; i++) {
        if (this.st.members[i].s === sid) { m = this.st.members[i]; break; }
      }
      if (!m) {
        if (this.full()) {
          window.PM.Net.send('pfull', { to: sid });
          return;
        }
        m = { s: sid };
        this.st.members.push(m);
      }
      m.n = cleanNick(d.n) || 'JUGADOR';
      m.c = d.c;
      m.k = d.k;
      m.a = (typeof d.a === 'string') ? d.a : '';
      m.x = (typeof d.x === 'string') ? d.x : '';
      m.g = this.claim(sid, d.g);      // PAC-MAN VS.: el líder reparte
      m.r = this.claimRol(sid, d.r);   // DESATADO: un solo Soporte
      m.h = CFG.HAB.loadoutValido(m.r, d.h);
      m.l = d.l ? 1 : 0;               // ¿ha dicho que está listo?
      m.rg = (typeof d.rg === 'number' && d.rg >= 0 && d.rg < 64) ? (d.rg | 0) : -1;   // su escalón
      m.t = now();
      this.sendRoster();
      this.changed();
    },

    onRoster: function (d) {
      if (this.st.leader || !d || !d.m || !d.m.length) return;
      var mine = false, i;
      for (i = 0; i < d.m.length; i++) {
        if (d.m[i].s === window.PM.Net.sid) mine = true;
      }
      if (!mine) return;               // aún no nos ha metido: seguimos saludando
      if (this.st.joinTimer) { clearTimeout(this.st.joinTimer); this.st.joinTimer = null; }
      this.st.status = 'dentro';
      this.st.members = d.m;
      /* lo que diga la lista del líder manda, también sobre mi propio LISTO:
       * si él aún no se ha enterado, el botón vuelve a su sitio solo */
      var mio = null;
      for (i = 0; i < d.m.length; i++) if (d.m[i].s === window.PM.Net.sid) mio = d.m[i];
      this.listo = !!(mio && mio.l);
      this.st.leaderSid = d.lider;
      this.habPick = !!d.hab;          // lo decide el líder; aquí solo se mira
      this.clasifPick = !!(d.hab && d.cl);
      this.cazaPick = !!d.caza;
      this.supervPick = !!d.sv;
      this.changed();
    },

    onBye: function (d, sid) {
      if (d && d.lider) {                       // el líder cierra el chiringuito
        if (!this.st.leader) this.fail('LA PARTY SE HA CERRADO');
        return;
      }
      if (!this.st.leader) return;
      var out = [], salio = false;
      for (var i = 0; i < this.st.members.length; i++) {
        if (this.st.members[i].s === sid) salio = true;
        else out.push(this.st.members[i]);
      }
      if (!salio) return;
      this.st.members = out;
      this.sendRoster();
      this.changed();
    },

    /* ---------- empezar la partida ---------- */
    /* Colores repetidos: al segundo se le da el del puesto que ocupa, que si
     * no salen dos Pac-Man idénticos y no hay quien se distinga. */
    gameOrder: function () {
      var out = [], usados = {}, tomados = {}, i;
      for (i = 0; i < this.st.members.length && i < CFG.MAX_PLAYERS; i++) {
        var m = this.st.members[i];
        var c = m.c || CFG.PLAYER_COLORS[i];
        if (usados[c]) c = CFG.PLAYER_COLORS[i];
        usados[c] = 1;
        // ningún rol repetido: al segundo que lo pida se le da el primero libre
        var rol = CFG.HAB.rol(m.r), k;
        if (tomados[rol]) {
          for (k = 0; k < CFG.HAB.ROL_IDS.length; k++) {
            if (!tomados[CFG.HAB.ROL_IDS[k]]) { rol = CFG.HAB.ROL_IDS[k]; break; }
          }
        }
        tomados[rol] = 1;
        out.push({ s: m.s, n: m.n || ('J' + (i + 1)), c: c, k: m.k || 'clasico',
                   a: m.a || '', x: m.x || '',
                   g: (m.g >= 0 && m.g < 4) ? m.g : -1, r: rol,
                   h: CFG.HAB.loadoutValido(rol, m.h || CFG.HAB.ROLES[rol].map(function (x) { return x.id; }).join(',')) });
      }
      return out;
    },

    startGame: function () {
      if (!this.canStart()) return;
      this.updateSelf();                   // la skin de ahora, no la de entrar
      var order = this.gameOrder();
      var cfg = window.PM.UI ? window.PM.UI.netCfgSubset() : null;
      var hab = !!this.habPick, caza = !!this.cazaPick, sv = !!this.supervPick;
      var cl = hab && !!this.clasifPick;
      var salida = { v: CFG.NET.PROTO, ord: order, cfg: cfg, hab: hab, cl: cl, caza: caza, sv: sv };
      /* SE GUARDA LA SALIDA. A quien tuviera la pestaña dormida no le llegaba
       * el aviso: los demás lo veían entrar y salir como AFK y él, al volver,
       * se encontraba solo en la sala con la partida ya empezada. Ahora la
       * puede pedir otra vez (ver 'pwho') y entra donde tocaba. */
      this.salida = salida;
      window.PM.Net.send('pstart', salida);
      this.begin({ ord: order, cfg: cfg, hab: hab, cl: cl, caza: caza, sv: sv }, true);
    },

    begin: function (d, leader) {
      if (!d || !d.ord || d.ord.length < 2) return;
      if (!leader && d.v !== CFG.NET.PROTO) {
        this.fail('EL LÍDER TIENE OTRA VERSIÓN DEL JUEGO');
        return;
      }
      var order = d.ord, idx = -1, otros = [], i;
      for (i = 0; i < order.length; i++) {
        if (order[i].s === window.PM.Net.sid) idx = i;
        else otros.push(order[i].s);
      }
      if (idx < 0) return;                 // esta partida no va con nosotros
      // si estábamos viendo la de otro, la propia manda: se deja de mirar
      window.PM.Net.closeView();
      this.order = order;
      window.PM.Net.lockPeers(otros);
      this.stopBeat();
      if (this.onstart) {
        this.onstart(order, idx, leader ? null : d.cfg,
          leader ? 'host' : 'guest', !!d.hab, !!d.caza, !!d.sv, !!(d.hab && d.cl));
      }
    },

    /* Al volver al menú: la party sigue, solo se recuperan los avisos */
    resume: function () {
      var self = this;
      if (!this.st) return;
      this.order = null;
      this.salida = null;         // esa partida ya acabó
      this.listo = false;         // y para la siguiente hay que volver a decirlo
      if (this.st.leader) {
        for (var q = 0; q < this.st.members.length; q++) this.st.members[q].l = 0;
      }
      window.PM.Net.unlockPeers();
      window.PM.Net.handler = function (n, d, sid) { self.onData(n, d, sid); };
      window.PM.Net.onclose = function () { self.fail('SE PERDIÓ LA CONEXIÓN'); };
      if (this.st.leader) {
        // los que ya no estén se caen solos de la lista al primer repaso
        for (var i = 0; i < this.st.members.length; i++) this.st.members[i].t = now();
      }
      this.startBeat();
      this.changed();
    },

    /* AL VOLVER A LA VENTANA. Si estoy en una sala, no soy el líder y no
     * estoy en partida, pregunto por si la salida se dio mientras la pestaña
     * dormía. Cuesta un mensaje y ahorra quedarse tirado en el lobby. */
    alVolver: function () {
      if (!this.st || this.st.leader) return;
      if (window.PM.Game && window.PM.Game.inGame()) return;
      try { window.PM.Net.send('pwho', { s: window.PM.Net.sid }); } catch (e) { /* sin canal */ }
    },

    /* ---------- canal personal: invitaciones ---------- */
    listen: function () {
      var self = this;
      var n = cleanNick((window.PM.settings || {}).nick1);
      if (!n || !window.PM.Net.configured()) { this.stopListen(); return; }
      if (this.userCh && this.userNick === n) return;
      this.stopListen();
      this.userNick = n;
      this.userCh = window.PM.Net.openChannel(userTopic(n), {
        onData: function (name, d, sid) { self.onUser(name, d, sid); }
      });
    },

    stopListen: function () {
      if (this.userCh) { this.userCh.close(); this.userCh = null; }
      this.userNick = null;
    },

    onUser: function (name, d) {
      if (name === 'invite') {
        var code = cleanCode(d && d.code);
        if (code.length !== CFG.NET.ROOM_LEN) return;
        if (this.st && this.st.code === code) return;      // ya estamos dentro
        if (this.oninvite) this.oninvite(cleanNick(d && d.from), code);
      } else if (name === 'donde' && this.userCh) {
        /* Un amigo pregunta dónde estamos, para ver la partida. Si hay party,
         * su sala; si se está jugando en local (solo o dos en el mismo
         * teclado), el canal de escaparate que abre el propio juego, que es
         * lo que permite mirar una partida sin red. */
        var G = window.PM.Game;
        var code = this.st ? this.st.code : '';
        if (!code && G && G.showCode) code = G.showCode;
        this.userCh.send('aqui', {
          code: code,
          jugando: (G && G.inGame()) ? 1 : 0,
          n: this.userNick
        });
      }
    },

    /* Invitar a un amigo por su nombre: le llega a su canal personal */
    invite: function (name, cb) {
      var self = this;
      if (!this.active()) { if (cb) cb(false, 'NO ESTÁS EN NINGUNA PARTY'); return; }
      var dest = cleanNick(name);
      if (!dest) { if (cb) cb(false, 'NOMBRE NO VÁLIDO'); return; }
      var code = this.st.code;
      var from = cleanNick((window.PM.settings || {}).nick1) || 'ALGUIEN';
      var ch = null, done = false;
      function finish(ok, msg) {
        if (done) return;
        done = true;
        setTimeout(function () { if (ch) ch.close(); }, 1200);
        if (cb) cb(ok, msg);
      }
      ch = window.PM.Net.openChannel(userTopic(dest), {
        onOpen: function () {
          ch.send('invite', { code: code, from: from });
          finish(true, 'INVITACIÓN ENVIADA A ' + dest);
        },
        onError: function () { finish(false, 'NO SE PUDO INVITAR'); }
      });
      setTimeout(function () { finish(false, 'NO SE PUDO INVITAR'); }, 5000);
    },

    /* Preguntar a un amigo dónde está jugando (para ver su partida) */
    locate: function (name, cb) {
      var dest = cleanNick(name);
      if (!dest || !window.PM.Net.configured()) { cb(null); return; }
      var ch = null, done = false;
      function finish(res) {
        if (done) return;
        done = true;
        if (ch) ch.close();
        cb(res);
      }
      ch = window.PM.Net.openChannel(userTopic(dest), {
        onOpen: function () { ch.send('donde', {}); },
        onError: function () { finish(null); },
        onData: function (name2, d) {
          if (name2 === 'aqui') finish(d || null);
        }
      });
      setTimeout(function () { finish(null); }, 5000);
    }
  };

  window.PM.Party = Party;
})();
