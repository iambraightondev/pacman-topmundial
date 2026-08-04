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
 *   phello  {v,n,c,k}    cada miembro se anuncia y sigue latiendo
 *   proster {v,lider,m}  el líder reparte la lista de miembros
 *   pbye    {lider}      alguien se va (o el líder disuelve)
 *   pfull   {to}         no caben más
 *   pstart  {v,cfg,ord}  el líder arranca la partida
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
    code: function () { return this.st ? this.st.code : null; },
    members: function () { return this.st ? this.st.members.slice() : []; },
    count: function () { return this.st ? this.st.members.length : 0; },
    full: function () { return this.count() >= CFG.MAX_PLAYERS; },
    canStart: function () {
      return this.active() && this.isLeader() && this.count() >= 2 &&
        !(window.PM.Game && window.PM.Game.inGame());
    },

    me: function () {
      var s = window.PM.settings || {};
      return {
        s: window.PM.Net.sid,
        n: cleanNick(s.nick1) || 'JUGADOR',
        c: s.pacColor || CFG.PLAYER_COLORS[0],
        k: s.skin1 || 'clasico',
        t: now()
      };
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
      return { v: CFG.NET.PROTO, n: m.n, c: m.c, k: m.k };
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

    /* Mientras se juega no hace falta: el canal ya va lleno de partida */
    beat: function () {
      if (!this.st) return;
      if (window.PM.Game && window.PM.Game.inGame()) return;
      if (this.st.leader) {
        if (this.prune()) this.changed();
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
        m: this.st.members
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
      this.st.leaderSid = d.lider;
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
      var out = [], usados = {}, i;
      for (i = 0; i < this.st.members.length && i < CFG.MAX_PLAYERS; i++) {
        var m = this.st.members[i];
        var c = m.c || CFG.PLAYER_COLORS[i];
        if (usados[c]) c = CFG.PLAYER_COLORS[i];
        usados[c] = 1;
        out.push({ s: m.s, n: m.n || ('J' + (i + 1)), c: c, k: m.k || 'clasico' });
      }
      return out;
    },

    startGame: function () {
      if (!this.canStart()) return;
      var order = this.gameOrder();
      var cfg = window.PM.UI ? window.PM.UI.netCfgSubset() : null;
      window.PM.Net.send('pstart', { v: CFG.NET.PROTO, ord: order, cfg: cfg });
      this.begin({ ord: order, cfg: cfg }, true);
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
      this.order = order;
      window.PM.Net.lockPeers(otros);
      this.stopBeat();
      if (this.onstart) {
        this.onstart(order, idx, leader ? null : d.cfg, leader ? 'host' : 'guest');
      }
    },

    /* Al volver al menú: la party sigue, solo se recuperan los avisos */
    resume: function () {
      var self = this;
      if (!this.st) return;
      this.order = null;
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
        // un amigo pregunta dónde estamos (para ver la partida)
        var G = window.PM.Game;
        this.userCh.send('aqui', {
          code: this.st ? this.st.code : '',
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
