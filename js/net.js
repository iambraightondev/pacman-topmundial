/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/net.js
 * Modo online: transporte de mensajes en tiempo real.
 * Define window.PM.Net
 *
 * Transportes:
 *  - Supabase Realtime: canales "broadcast" sobre WebSocket con
 *    el protocolo Phoenix. Implementación mínima propia, sin
 *    librerías externas. No toca la base de datos.
 *  - BroadcastChannel (?red=local): dos pestañas del mismo
 *    navegador se conectan entre sí; para desarrollo y pruebas.
 *
 * Cada mensaje viaja envuelto como { s: <sid emisor>, d: <datos> }
 * para poder ignorar ecos y a terceros que entren al canal.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  function query(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }

  function randomId() {
    var abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var s = '';
    for (var i = 0; i < 12; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
    return s;
  }

  /* ------------------------------------------------------------
   * Transporte Supabase Realtime (Phoenix sobre WebSocket)
   * ------------------------------------------------------------ */
  function SupaTransport(url, key) {
    this.url = url;
    this.key = key;
    this.ws = null;
    this.hb = null;        // latido periódico
    this.topic = null;
    this.refN = 1;
    this.open = false;
  }

  SupaTransport.prototype.connect = function (topic, cbs) {
    var self = this;
    var base = String(this.url).replace(/\/+$/, '').replace(/^http/, 'ws');
    var wsUrl = base + '/realtime/v1/websocket?apikey=' +
      encodeURIComponent(this.key) + '&vsn=1.0.0';
    this.topic = 'realtime:' + topic;

    var ws;
    try { ws = new WebSocket(wsUrl); }
    catch (e) { cbs.onError('SIN CONEXIÓN'); return; }
    this.ws = ws;

    ws.onopen = function () {
      var payload = {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: '' },
          postgres_changes: []
        }
      };
      // las claves anon clásicas son JWT y viajan como access_token
      if (/^eyJ/.test(self.key)) payload.access_token = self.key;
      ws.send(JSON.stringify({
        topic: self.topic, event: 'phx_join', payload: payload,
        ref: 'join', join_ref: 'join'
      }));
      self.hb = setInterval(function () {
        try {
          ws.send(JSON.stringify({
            topic: 'phoenix', event: 'heartbeat', payload: {},
            ref: String(++self.refN)
          }));
        } catch (e) { /* el cierre lo detecta onclose */ }
      }, 25000);
    };

    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.topic !== self.topic) return;   // latidos y otros temas
      if (msg.event === 'phx_reply' && msg.ref === 'join') {
        if (msg.payload && msg.payload.status === 'ok') {
          self.open = true;
          cbs.onOpen();
        } else {
          cbs.onError('SIN CONEXIÓN');
        }
        return;
      }
      if (msg.event === 'broadcast' && msg.payload) {
        cbs.onData(msg.payload.event, msg.payload.payload);
      } else if (msg.event === 'phx_error' || msg.event === 'phx_close') {
        cbs.onClose();
      }
    };

    ws.onerror = function () {
      if (!self.open) cbs.onError('SIN CONEXIÓN');
    };
    ws.onclose = function () {
      var wasOpen = self.open;
      self.open = false;
      if (wasOpen) cbs.onClose();
    };
  };

  SupaTransport.prototype.send = function (event, data) {
    if (!this.ws || this.ws.readyState !== 1) return;
    try {
      this.ws.send(JSON.stringify({
        topic: this.topic, event: 'broadcast',
        payload: { type: 'broadcast', event: event, payload: data },
        ref: null
      }));
    } catch (e) { /* sin conexión: lo detecta onclose */ }
  };

  SupaTransport.prototype.close = function () {
    if (this.hb) { clearInterval(this.hb); this.hb = null; }
    if (this.ws) {
      try { this.ws.onclose = null; this.ws.onerror = null; this.ws.close(); }
      catch (e) { /* ya cerrado */ }
      this.ws = null;
    }
    this.open = false;
  };

  /* ------------------------------------------------------------
   * Transporte local (dos pestañas del mismo navegador)
   * ------------------------------------------------------------ */
  function LocalTransport() { this.bc = null; }

  LocalTransport.prototype.connect = function (topic, cbs) {
    if (typeof BroadcastChannel === 'undefined') {
      cbs.onError('SIN CONEXIÓN');
      return;
    }
    this.bc = new BroadcastChannel('pm-' + topic);
    this.bc.onmessage = function (ev) {
      if (ev.data) cbs.onData(ev.data.e, ev.data.p);
    };
    var self = this;
    setTimeout(function () { if (self.bc) cbs.onOpen(); }, 0);
  };

  LocalTransport.prototype.send = function (event, data) {
    if (!this.bc) return;
    try { this.bc.postMessage({ e: event, p: data }); }
    catch (e) { /* canal cerrado */ }
  };

  LocalTransport.prototype.close = function () {
    if (this.bc) { this.bc.close(); this.bc = null; }
  };

  /* ------------------------------------------------------------
   * API de alto nivel
   * ------------------------------------------------------------ */
  var Net = {
    sid: randomId(),     // identificador de esta sesión
    peers: [],           // sesiones aceptadas ([] = se acepta a cualquiera)
    transport: null,
    code: null,
    handler: null,       // function(name, data, sid) — lo fijan ui.js / game.js
    onclose: null,       // aviso de desconexión — lo fijan ui.js / game.js

    forcedLocal: function () { return query('red') === 'local'; },

    configured: function () {
      if (this.forcedLocal()) return true;
      var c = window.PM.NET_CFG || {};
      return !!(c.SUPABASE_URL && c.SUPABASE_KEY);
    },

    /* ?sala=XXXX en la URL (enlace compartido) */
    roomFromUrl: function () {
      var c = query('sala');
      if (!c) return null;
      c = c.toUpperCase().replace(/[^A-Z]/g, '');
      return (c.length === CFG.NET.ROOM_LEN) ? c : null;
    },

    randomCode: function () {
      var a = CFG.NET.ROOM_ALPHABET, s = '';
      for (var i = 0; i < CFG.NET.ROOM_LEN; i++) {
        s += a.charAt(Math.floor(Math.random() * a.length));
      }
      return s;
    },

    /* Enlace compartible hacia esta misma página con ?sala=CODE */
    roomLink: function (code) {
      var base = window.location.href.split('?')[0].split('#')[0];
      var link = base + '?sala=' + code;
      if (this.forcedLocal()) link += '&red=local';
      return link;
    },

    newTransport: function () {
      var c = window.PM.NET_CFG || {};
      return this.forcedLocal()
        ? new LocalTransport()
        : new SupaTransport(c.SUPABASE_URL, c.SUPABASE_KEY);
    },

    /* Canal suelto, aparte del de la partida: lo usan los avisos personales
     * (invitaciones) y las invitaciones salientes. Devuelve { send, close }. */
    openChannel: function (topic, cbs) {
      var self = this;
      var tr = this.newTransport();
      cbs = cbs || {};
      var ch = {
        send: function (name, data) { tr.send(name, { s: self.sid, d: data }); },
        close: function () { tr.close(); }
      };
      tr.connect(topic, {
        onOpen: function () { if (cbs.onOpen) cbs.onOpen(); },
        onError: function (m) { if (cbs.onError) cbs.onError(m); },
        onClose: function () { if (cbs.onClose) cbs.onClose(); },
        onData: function (name, wrap) {
          if (!wrap || wrap.s === self.sid) return;
          if (cbs.onData) cbs.onData(name, wrap.d, wrap.s);
        }
      });
      return ch;
    },

    /* ----------------------------------------------------------
     * Canal de mirón: la sala de OTRO grupo, para ver su partida.
     * Va aparte del principal a propósito, así se puede mirar sin
     * soltar la propia party (que sigue viva en el canal principal).
     * ---------------------------------------------------------- */
    viewCh: null,
    viewCode: null,
    viewHandler: null,   // function(name, data, sid)
    viewOnClose: null,

    watching: function () { return !!this.viewCh; },

    /* cbs.onMsg / cbs.onGone son los enganches de la partida que se mira.
     *
     * Van AQUÍ y no puestos a mano en Net.viewHandler antes de llamar: como
     * lo primero que hace esto es closeView(), que los borra, el que los
     * dejaba puestos justo antes se los encontraba a null y no le llegaba
     * nunca nada. Es lo que impedía ver la partida de un amigo. */
    openView: function (code, cbs) {
      var self = this;
      this.closeView();
      this.viewCode = code;
      cbs = cbs || {};
      if (cbs.onMsg) this.viewHandler = cbs.onMsg;
      if (cbs.onGone) this.viewOnClose = cbs.onGone;
      this.viewCh = this.openChannel('sala:' + code, {
        onOpen: function () { if (cbs.onOpen) cbs.onOpen(); },
        onError: function (m) { if (cbs.onError) cbs.onError(m); },
        onClose: function () { if (self.viewOnClose) self.viewOnClose(); },
        onData: function (name, d, sid) {
          if (self.viewHandler) self.viewHandler(name, d, sid);
        }
      });
    },

    closeView: function () {
      if (this.viewCh) { this.viewCh.close(); this.viewCh = null; }
      this.viewCode = null;
      this.viewHandler = null;
      this.viewOnClose = null;
    },

    /* Envío de la partida: si estamos de mirón sale por la sala que se está
     * viendo; si no, por el canal propio de siempre. */
    gameSend: function (name, data) {
      if (this.viewCh) this.viewCh.send(name, data);
      else this.send(name, data);
    },

    /* Canal principal: party y partida comparten el mismo, así el grupo
     * sigue conectado al volver al menú. */
    connect: function (code, cbs) {
      this.leaveTransport();
      this.code = code;
      this.peers = [];
      this.transport = this.newTransport();
      var self = this;
      this.transport.connect('sala:' + code, {
        onOpen: function () { if (cbs.onOpen) cbs.onOpen(); },
        onError: function (m) { if (cbs.onError) cbs.onError(m); },
        onClose: function () { if (self.onclose) self.onclose(); },
        onData: function (name, wrap) {
          if (!wrap || wrap.s === self.sid) return;
          if (!self.accepts(wrap.s, name)) return;
          if (self.handler) self.handler(name, wrap.d, wrap.s);
        }
      });
    },

    /* Con la partida ya cerrada solo se atiende a los suyos; los saludos de
     * terceros pasan siempre, que alguien tiene que contestarles. */
    accepts: function (sid, name) {
      if (!this.peers.length) return true;
      if (name === 'hello') return true;
      return this.peers.indexOf(sid) !== -1;
    },

    send: function (name, data) {
      if (this.transport) this.transport.send(name, { s: this.sid, d: data });
    },

    lockPeer: function (sid) { this.peers = [sid]; },
    lockPeers: function (sids) { this.peers = (sids || []).slice(); },
    unlockPeers: function () { this.peers = []; },

    leaveTransport: function () {
      if (this.transport) { this.transport.close(); this.transport = null; }
    },

    leave: function () {
      this.closeView();
      this.leaveTransport();
      this.code = null;
      this.peers = [];
      this.handler = null;
      this.onclose = null;
    }
  };

  window.PM.Net = Net;
})();
