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
   *
   * RECONEXIÓN (14 sep). Antes, cualquier corte del socket —un bajón del
   * Wi-Fi, los datos del móvil, el servidor que recoloca conexiones— era
   * "CONEXIÓN PERDIDA" en el acto, sin segunda oportunidad. Ahora, si el
   * canal ya había abierto una vez, un corte se reintenta solo durante
   * RECONEXION_MS y el juego ni se entera: mientras tanto su vigilante enseña
   * "esperando conexión" y congela, como con cualquier silencio. Solo si no
   * vuelve se avisa con onClose.
   *
   * - Lo que se manda durante el corte se GUARDA y sale en orden al volver
   *   (los avisos de muerte, nivel, etc. no se repiten). De instantáneas y
   *   posiciones basta la última: una vieja no aporta nada.
   * - Lo que mandaron los demás durante el corte se pierde (el servidor no
   *   guarda broadcasts), pero la instantánea del anfitrión lleva el estado
   *   entero y el mapa de pastillas, así que en menos de un segundo cuadra.
   * - Latido cada 10 s con respuesta: un socket que parece abierto pero ya no
   *   contesta (medio caído) se da por muerto al segundo latido sin eco, en
   *   vez de esperar a que el navegador se entere, que puede tardar minutos.
   * ------------------------------------------------------------ */
  var HB_MS = 10000;          // latido
  var RECONEXION_MS = 10000;  // cuánto se insiste antes de rendirse
  var PENDIENTES_MAX = 300;   // ~10 s de partida, de sobra
  var SUSTITUIBLES = { snap: 1, pos: 1 };

  function SupaTransport(url, key) {
    this.url = url;
    this.key = key;
    this.ws = null;
    this.hb = null;          // latido periódico
    this.hbDesde = 0;        // cuándo salió el latido que aún no ha contestado
    this.topic = null;
    this.refN = 1;
    this.open = false;       // unido al canal (join confirmado)
    this.everOpen = false;   // llegó a abrir alguna vez: a partir de ahí se reconecta
    this.cerrado = false;    // lo cerramos nosotros: no se reconecta
    this.cbs = null;
    this.caidaDesde = 0;
    this.intentos = 0;
    this.reintento = null;
    this.errorDado = false;
    this.pendientes = [];
    this.tope = null;        // intento de reconexión que no contesta
    this.sonda = null;       // latido de comprobación pedido por el juego
  }

  SupaTransport.prototype.connect = function (topic, cbs) {
    this.topic = 'realtime:' + topic;
    this.cbs = cbs;
    this.cerrado = false;
    this.everOpen = false;
    this.errorDado = false;
    this.abrir();
  };

  /* Antes de abrir por primera vez, un fallo es "no se pudo entrar" */
  SupaTransport.prototype.fallo = function () {
    if (this.everOpen) { this.caida(); return; }
    if (this.errorDado || this.cerrado) return;
    this.errorDado = true;
    this.soltarSocket();
    this.cbs.onError('SIN CONEXIÓN');
  };

  SupaTransport.prototype.abrir = function () {
    var self = this;
    var base = String(this.url).replace(/\/+$/, '').replace(/^http/, 'ws');
    var wsUrl = base + '/realtime/v1/websocket?apikey=' +
      encodeURIComponent(this.key) + '&vsn=1.0.0';

    var ws;
    try { ws = new WebSocket(wsUrl); }
    catch (e) { this.fallo(); return; }
    this.ws = ws;
    /* reconectando sin red, el intento puede quedarse colgado mucho rato sin
     * dar ni error: a los 4 s se da por fallido y se vuelve a probar */
    if (this.everOpen) {
      if (this.tope) clearTimeout(this.tope);
      this.tope = setTimeout(function () {
        self.tope = null;
        if (ws === self.ws && !self.open) self.fallo();
      }, 4000);
    }

    ws.onopen = function () {
      if (ws !== self.ws) return;
      var payload = {
        config: {
          broadcast: { self: false, ack: false },
          // con clave (el usuario) si este canal lleva PRESENCIA (js/conectados.js)
          presence: { key: self.presenceKey || '' },
          postgres_changes: []
        }
      };
      // las claves anon clásicas son JWT y viajan como access_token
      if (/^eyJ/.test(self.key)) payload.access_token = self.key;
      ws.send(JSON.stringify({
        topic: self.topic, event: 'phx_join', payload: payload,
        ref: 'join', join_ref: 'join'
      }));
      self.hbDesde = 0;
      if (self.hb) clearInterval(self.hb);
      self.hb = setInterval(function () {
        if (ws !== self.ws) return;
        // el latido anterior sigue sin eco: el socket está muerto aunque no lo diga
        if (self.hbDesde && Date.now() - self.hbDesde > HB_MS * 1.5) {
          self.fallo();
          return;
        }
        try {
          ws.send(JSON.stringify({
            topic: 'phoenix', event: 'heartbeat', payload: {},
            ref: String(++self.refN)
          }));
          if (!self.hbDesde) self.hbDesde = Date.now();
        } catch (e) { /* el cierre lo detecta onclose */ }
      }, HB_MS);
    };

    ws.onmessage = function (ev) {
      if (ws !== self.ws) return;
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.topic === 'phoenix') {           // eco del latido
        if (msg.event === 'phx_reply') self.hbDesde = 0;
        return;
      }
      if (msg.topic !== self.topic) return;    // otros temas
      if (msg.event === 'phx_reply' && msg.ref === 'join') {
        if (msg.payload && msg.payload.status === 'ok') {
          self.open = true;
          self.caidaDesde = 0;
          self.intentos = 0;
          if (!self.everOpen) {
            self.everOpen = true;
            self.cbs.onOpen();
          } else {
            self.vaciarPendientes();
          }
          // al volver a unirse, se vuelve a decir quién es
          if (self.presencia) self.enviarPresencia();
        } else {
          self.fallo();
        }
        return;
      }
      if ((msg.event === 'presence_state' || msg.event === 'presence_diff') && msg.payload) {
        if (self.cbs.onPresence) self.cbs.onPresence(msg.event, msg.payload);
      } else if (msg.event === 'broadcast' && msg.payload) {
        self.cbs.onData(msg.payload.event, msg.payload.payload);
      } else if (msg.event === 'phx_error' || msg.event === 'phx_close') {
        self.fallo();
      }
    };

    ws.onerror = function () {
      if (ws !== self.ws) return;
      // tras abrir, del error se ocupa onclose, que siempre llega detrás
      if (!self.everOpen) self.fallo();
    };
    ws.onclose = function () {
      if (ws !== self.ws) return;
      self.open = false;
      self.fallo();
    };
  };

  /* PRESENCIA (24 sep): lo que este jugador dice de sí mismo en el canal
   * (quién es y qué hace). Supabase lo reparte a los demás y lo retira solo
   * cuando se cae la conexión. */
  SupaTransport.prototype.track = function (obj) {
    this.presencia = obj;
    if (this.open) this.enviarPresencia();
  };
  SupaTransport.prototype.enviarPresencia = function () {
    if (!this.ws || !this.presencia) return;
    try {
      this.ws.send(JSON.stringify({
        topic: this.topic, event: 'presence',
        payload: { type: 'presence', event: 'track', payload: this.presencia },
        ref: String(++this.refN), join_ref: 'join'
      }));
    } catch (e) { /* ya se reenviará al reconectar */ }
  };

  /* Suelta el socket actual sin que sus eventos vuelvan a molestar */
  SupaTransport.prototype.soltarSocket = function () {
    if (this.hb) { clearInterval(this.hb); this.hb = null; }
    if (this.tope) { clearTimeout(this.tope); this.tope = null; }
    if (this.sonda) { clearTimeout(this.sonda); this.sonda = null; }
    this.hbDesde = 0;
    this.open = false;
    var ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      try { ws.close(); } catch (e) { /* ya cerrado */ }
    }
  };

  /* Se cayó con el canal ya abierto: reintentar hasta RECONEXION_MS */
  SupaTransport.prototype.caida = function () {
    if (this.cerrado) return;
    this.soltarSocket();
    if (!this.caidaDesde) this.caidaDesde = Date.now();
    if (Date.now() - this.caidaDesde > RECONEXION_MS) {
      this.caidaDesde = 0;
      this.pendientes = [];
      this.cerrado = true;
      if (this.reintento) { clearTimeout(this.reintento); this.reintento = null; }
      this.cbs.onClose();
      return;
    }
    if (this.reintento) return;
    var self = this;
    var espera = Math.min(2000, 250 * Math.pow(2, this.intentos++));
    this.reintento = setTimeout(function () {
      self.reintento = null;
      if (!self.cerrado) self.abrir();
    }, espera);
  };

  /* El juego lleva un rato sin recibir nada: puede ser el otro, o puede ser
   * que nuestro socket esté medio muerto (abierto pero sordo). Un latido
   * ahora mismo lo aclara en 3 s en vez de esperar al latido normal, que
   * tardaría 20 s en darlo por muerto: para entonces el juego ya se habría
   * rendido. Si contesta, no pasa nada. */
  SupaTransport.prototype.sondear = function () {
    if (!this.open || !this.ws || this.sonda) return;
    var self = this, ws = this.ws;
    try {
      ws.send(JSON.stringify({
        topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++this.refN)
      }));
    } catch (e) { this.fallo(); return; }
    if (!this.hbDesde) this.hbDesde = Date.now();
    var desde = this.hbDesde;
    this.sonda = setTimeout(function () {
      self.sonda = null;
      if (ws === self.ws && self.hbDesde && self.hbDesde <= desde) self.fallo();
    }, 3000);
  };

  SupaTransport.prototype.vaciarPendientes = function () {
    var cola = this.pendientes;
    this.pendientes = [];
    for (var i = 0; i < cola.length; i++) this.send(cola[i][0], cola[i][1]);
  };

  SupaTransport.prototype.send = function (event, data) {
    if (!this.open || !this.ws || this.ws.readyState !== 1) {
      /* cortado pero reconectando: se guarda para cuando vuelva */
      if (this.everOpen && !this.cerrado) {
        if (SUSTITUIBLES[event]) {
          for (var i = this.pendientes.length - 1; i >= 0; i--) {
            if (this.pendientes[i][0] === event) { this.pendientes.splice(i, 1); break; }
          }
        }
        this.pendientes.push([event, data]);
        if (this.pendientes.length > PENDIENTES_MAX) this.pendientes.shift();
      }
      return;
    }
    try {
      this.ws.send(JSON.stringify({
        topic: this.topic, event: 'broadcast',
        payload: { type: 'broadcast', event: event, payload: data },
        ref: null
      }));
    } catch (e) { /* sin conexión: lo detecta onclose */ }
  };

  SupaTransport.prototype.close = function () {
    this.cerrado = true;
    if (this.reintento) { clearTimeout(this.reintento); this.reintento = null; }
    this.pendientes = [];
    this.caidaDesde = 0;
    this.soltarSocket();
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
  /* ------------------------------------------------------------
   * ORDEN DE LO QUE CADUCA
   *
   * Fotos, posiciones y giros pueden adelantarse entre sí: el canal rápido
   * de un enlace directo no guarda el orden a propósito (ver net-directo.js),
   * y mientras un enlace se está montando conviven dos caminos de velocidades
   * muy distintas —20 ms por el directo, 84 por el servidor—, así que lo
   * último puede llegar antes que lo anterior.
   *
   * Con estos tres da igual perderse uno, pero no aplicar uno viejo encima de
   * uno nuevo: sería un salto atrás. Así que van numerados y el que llega
   * tarde se tira. Los demás mensajes (muertes, niveles, emotes) no se numeran
   * ni se tiran nunca: esos tienen que llegar todos.
   * ------------------------------------------------------------ */
  var CADUCAN = { snap: 1, pos: 1, gir: 1 };
  /* Un retroceso mayor que esto no es desorden, es alguien que ha vuelto a
   * empezar (recarga, reconexión): se le acepta y se sigue contando desde ahí. */
  var SALTO_ATRAS = 1000;

  var Net = {
    sid: randomId(),     // identificador de esta sesión
    seq: 0,              // numerador de lo que caduca
    /* Hasta cuándo hay que seguir mandando por el canal aunque todos los
     * jugadores tengan enlace directo. Quien mira una partida escucha por el
     * canal y no tiene enlace con nadie: si el anfitrión dejara de usarlo, se
     * le quedaría la pantalla congelada. Ver mantenCanal(). */
    forzarCanal: 0,
    ultimoQ: {},         // sid -> último número aplicado
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
        sondear: function () { if (tr.sondear) tr.sondear(); },
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
    viewLatido: null,
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
        onOpen: function () {
          /* Recordarle al anfitrión que hay alguien mirando: mientras lo
           * sepa, seguirá repartiendo la partida por el canal, que es por
           * donde escucha un mirón (no tiene enlace directo con nadie). */
          if (self.viewLatido) clearInterval(self.viewLatido);
          self.viewLatido = setInterval(function () {
            if (self.viewCh) self.viewCh.send('hello', { v: CFG.NET.PROTO, spec: 1, hb: 1 });
          }, 6000);
          if (cbs.onOpen) cbs.onOpen();
        },
        onError: function (m) { if (cbs.onError) cbs.onError(m); },
        onClose: function () { if (self.viewOnClose) self.viewOnClose(); },
        onData: function (name, d, sid) {
          if (self.viewHandler) self.viewHandler(name, d, sid);
        }
      });
    },

    closeView: function () {
      if (this.viewLatido) { clearInterval(this.viewLatido); this.viewLatido = null; }
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
      /* El ENLACE DIRECTO entre jugadores se monta encima de este canal, que
       * se queda de presentador y de respaldo (js/net-directo.js). */
      var D = window.PM.Directo;
      if (D) {
        D.arranca(this.sid,
          function (name, data) {
            if (self.transport) self.transport.send(name, { s: self.sid, d: data });
          },
          function (name, wrap) { self.entrega(name, wrap); });
      }
      this.transport.connect('sala:' + code, {
        onOpen: function () { if (cbs.onOpen) cbs.onOpen(); },
        onError: function (m) { if (cbs.onError) cbs.onError(m); },
        onClose: function () { if (self.onclose) self.onclose(); },
        onData: function (name, wrap) { self.entrega(name, wrap); }
      });
    },

    /* Un mensaje que llega, venga del canal o de un enlace directo. */
    entrega: function (name, wrap) {
      if (!wrap || wrap.s === this.sid) return;
      /* ya llegó por el enlace directo: esta copia del canal sobra */
      if (wrap.x && wrap.x.indexOf(this.sid) !== -1) return;
      var D = window.PM.Directo;
      if (name === '~rtc') {            // presentaciones: no son del juego
        if (D) D.senal(wrap.d, wrap.s);
        return;
      }
      if (D) D.ve(wrap.s);              // a quien se deja ver se le ofrece enlace
      if (!this.accepts(wrap.s, name)) return;
      if (!this.aTiempo(wrap)) return;  // uno viejo que llega tarde (ver CADUCAN)
      if (this.handler) this.handler(name, wrap.d, wrap.s);
    },

    /* ¿Este mensaje numerado es más nuevo que el último que se le aplicó? */
    aTiempo: function (wrap) {
      if (typeof wrap.q !== 'number') return true;
      var ult = this.ultimoQ[wrap.s];
      if (typeof ult === 'number' && wrap.q <= ult && ult - wrap.q < SALTO_ATRAS) {
        return false;
      }
      this.ultimoQ[wrap.s] = wrap.q;
      return true;
    },

    /* Con la partida ya cerrada solo se atiende a los suyos; los saludos de
     * terceros pasan siempre, que alguien tiene que contestarles. */
    accepts: function (sid, name) {
      if (!this.peers.length) return true;
      if (name === 'hello') return true;
      return this.peers.indexOf(sid) !== -1;
    },

    send: function (name, data) {
      if (!this.transport) return;
      var wrap = { s: this.sid, d: data };
      if (CADUCAN[name]) wrap.q = ++this.seq;
      var D = window.PM.Directo;
      /* primero por los enlaces directos que haya (ver js/net-directo.js) */
      var porDirecto = D ? D.manda(name, wrap) : null;
      /* si a todos les ha llegado por ahí, el canal de pago no se toca...
       * salvo que haya alguien mirando, que solo escucha por ahí */
      if (porDirecto && D.todosDirectos() && Date.now() > this.forzarCanal) return;
      /* si no, sale por el canal, diciendo a quién no hay que repetírselo */
      if (porDirecto) wrap.x = porDirecto;
      this.transport.send(name, wrap);
    },

    /* El juego avisa de un silencio: que el canal de la partida compruebe
     * que su socket sigue vivo (ver SupaTransport.sondear) */
    sondear: function () {
      if (this.viewCh) this.viewCh.sondear();
      else if (this.transport && this.transport.sondear) this.transport.sondear();
    },

    /* "Sigue usando el canal durante estos milisegundos": lo pide el
     * anfitrión cada vez que sabe de alguien que está mirando la partida. */
    mantenCanal: function (ms) {
      var hasta = Date.now() + (ms || 20000);
      if (hasta > this.forzarCanal) this.forzarCanal = hasta;
    },

    lockPeer: function (sid) { this.peers = [sid]; },
    lockPeers: function (sids) { this.peers = (sids || []).slice(); },
    unlockPeers: function () { this.peers = []; },

    leaveTransport: function () {
      if (window.PM.Directo) window.PM.Directo.corta();
      if (this.transport) { this.transport.close(); this.transport = null; }
    },

    /* Cuántos compañeros van por enlace directo (para la pantalla ONLINE) */
    directos: function () {
      return window.PM.Directo ? window.PM.Directo.cuenta() : 0;
    },

    leave: function () {
      this.closeView();
      this.leaveTransport();
      this.code = null;
      this.peers = [];
      this.ultimoQ = {};
      this.handler = null;
      this.onclose = null;
    }
  };

  window.PM.Net = Net;
})();
