/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/net-directo.js
 * Enlace DIRECTO entre jugadores (WebRTC). Define window.PM.Directo
 *
 * POR QUÉ
 * Hasta ahora toda la partida pasaba por el servidor de Supabase, que está
 * en Estados Unidos: entre dos vecinos de Lima, cada foto de la partida
 * cruzaba el continente y volvía (84 ms medidos). Y cada mensaje se cobra:
 * doce fotos por segundo y por jugador agotaban la cuota mensual en unas
 * pocas decenas de partidas.
 *
 * Los navegadores saben hablarse directamente entre ellos (es lo que usan las
 * videollamadas). Aquí se aprovecha para lo mismo: el servidor solo los
 * presenta —unos pocos mensajes al entrar— y a partir de ahí la partida viaja
 * de máquina a máquina. Entre dos casas de la misma ciudad son 15-25 ms, y la
 * cuota deja de correr.
 *
 * CÓMO ENCAJA
 * No sustituye al canal de siempre: se monta encima. La sala, el saludo y el
 * primer segundo de partida van por Supabase como toda la vida, y cada enlace
 * directo entra en servicio solo cuando está listo. Al mandar:
 *
 *   - a cada compañero con enlace directo se le manda por ahí;
 *   - si queda alguno sin enlace, el mensaje sale ADEMÁS por Supabase,
 *     llevando en `x` la lista de los que ya lo recibieron por el enlace,
 *     para que esos lo ignoren y nadie lo reciba dos veces.
 *
 * Así no tiene que enterarse nadie: ni el juego, ni el que no consiga enlazar
 * (en torno a uno de cada diez, por culpa de su router), que sigue jugando por
 * el camino de siempre sin notar la diferencia. No hace falta ningún servidor
 * de rebote de pago: el respaldo ya estaba puesto.
 *
 * DOS CANALES POR ENLACE
 * Las fotos y las posiciones van por uno que NO reintenta: si una se pierde,
 * la siguiente viene 83 ms después y trae el estado entero, mientras que
 * reintentarla atascaría detrás a todo lo que venga después. El resto —los
 * avisos de muerte, de nivel, los emotes— va por el canal fiable y en orden.
 *
 * QUIÉN OFRECE
 * Para que dos no se ofrezcan a la vez y choquen, ofrece siempre el del
 * identificador de sesión más bajo. Sin excepciones y sin negociar quién.
 * ============================================================ */
(function () {
  'use strict';

  /* Servidores que solo sirven para que cada uno descubra su propia dirección
   * pública. Son públicos y gratuitos, y no ven ni un byte de la partida. */
  var STUN = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ];

  /* Lo que va por el canal rápido (el que no reintenta): lo que caduca solo */
  var RAPIDO = { snap: 1, pos: 1 };

  /* Cuánto se espera a que un enlace se establezca antes de darlo por
   * imposible. Lo normal es medio segundo; un segundo y medio ya es raro. */
  var TIMEOUT_MS = 8000;
  /* Un compañero del que no se sabe nada en este rato se olvida: si no, su
   * enlace ausente obligaría a seguir pagando el canal de siempre. */
  var OLVIDO_MS = 30000;

  function soportado() {
    return typeof RTCPeerConnection !== 'undefined';
  }

  /* ------------------------------------------------------------
   * Un enlace con un compañero
   * ------------------------------------------------------------ */
  function Enlace(D, sid, ofrezco) {
    this.D = D;
    this.sid = sid;
    this.ofrezco = ofrezco;
    this.pc = null;
    this.ev = null;        // canal fiable y en orden
    this.sn = null;        // canal rápido, sin reintentos
    this.listo = false;
    this.muerto = false;   // no se pudo, o se cayó: este va por Supabase
    this.visto = Date.now();
    this.tope = null;
    this.pendientes = [];  // candidatos llegados antes de la descripción
  }

  Enlace.prototype.abre = function () {
    var self = this;
    var pc;
    try { pc = new RTCPeerConnection({ iceServers: STUN }); }
    catch (e) { this.cae(); return; }
    this.pc = pc;

    pc.onicecandidate = function (ev) {
      if (ev.candidate) self.D.senala(self.sid, { k: 'i', c: ev.candidate });
    };
    pc.onconnectionstatechange = function () {
      var st = pc.connectionState;
      if (st === 'failed' || st === 'closed' || st === 'disconnected') self.cae();
    };
    pc.ondatachannel = function (ev) {
      if (ev.channel.label === 'sn') self.ponCanal('sn', ev.channel);
      else self.ponCanal('ev', ev.channel);
    };

    this.tope = setTimeout(function () { if (!self.listo) self.cae(); }, TIMEOUT_MS);

    if (this.ofrezco) {
      try {
        this.ponCanal('ev', pc.createDataChannel('ev', { ordered: true }));
        this.ponCanal('sn', pc.createDataChannel('sn', { ordered: false, maxRetransmits: 0 }));
      } catch (e) { this.cae(); return; }
      pc.createOffer().then(function (of) {
        return pc.setLocalDescription(of).then(function () {
          self.D.senala(self.sid, { k: 'o', s: pc.localDescription });
        });
      })['catch'](function () { self.cae(); });
    }
  };

  Enlace.prototype.ponCanal = function (cual, ch) {
    var self = this;
    this[cual] = ch;
    ch.onopen = function () { self.mira(); };
    ch.onclose = function () { if (cual === 'ev') self.cae(); };
    ch.onmessage = function (ev) {
      self.visto = Date.now();
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      self.D.recibe(m.e, m.p);
    };
    /* el que responde recibe los canales ya abiertos: onopen no llega */
    if (ch.readyState === 'open') this.mira();
  };

  /* Listo solo cuando los dos canales están abiertos: si no, un mensaje
   * rápido podría salir por un canal que todavía no existe. */
  Enlace.prototype.mira = function () {
    if (this.listo || this.muerto) return;
    if (!this.ev || this.ev.readyState !== 'open') return;
    if (!this.sn || this.sn.readyState !== 'open') return;
    this.listo = true;
    if (this.tope) { clearTimeout(this.tope); this.tope = null; }
    this.visto = Date.now();
  };

  Enlace.prototype.oferta = function (sdp) {
    var self = this;
    if (!this.pc) return;
    this.pc.setRemoteDescription(sdp).then(function () {
      self.vacia();
      return self.pc.createAnswer();
    }).then(function (an) {
      return self.pc.setLocalDescription(an).then(function () {
        self.D.senala(self.sid, { k: 'a', s: self.pc.localDescription });
      });
    })['catch'](function () { self.cae(); });
  };

  Enlace.prototype.respuesta = function (sdp) {
    var self = this;
    if (!this.pc) return;
    this.pc.setRemoteDescription(sdp)
      .then(function () { self.vacia(); })['catch'](function () { self.cae(); });
  };

  Enlace.prototype.candidato = function (c) {
    if (!this.pc) return;
    /* antes de la descripción remota no se puede añadir: se guardan */
    if (!this.pc.remoteDescription || !this.pc.remoteDescription.type) {
      this.pendientes.push(c);
      return;
    }
    try { this.pc.addIceCandidate(c); } catch (e) { /* candidato inútil */ }
  };

  Enlace.prototype.vacia = function () {
    for (var i = 0; i < this.pendientes.length; i++) {
      try { this.pc.addIceCandidate(this.pendientes[i]); } catch (e) { }
    }
    this.pendientes = [];
  };

  Enlace.prototype.manda = function (name, wrap) {
    if (!this.listo) return false;
    var ch = RAPIDO[name] ? this.sn : this.ev;
    if (!ch || ch.readyState !== 'open') return false;
    try {
      ch.send(JSON.stringify({ e: name, p: wrap }));
      return true;
    } catch (e) {
      this.cae();
      return false;
    }
  };

  /* Se cayó o no pudo ser: a partir de aquí, a este se le habla por Supabase */
  Enlace.prototype.cae = function () {
    if (this.muerto) return;
    this.muerto = true;
    this.listo = false;
    if (this.tope) { clearTimeout(this.tope); this.tope = null; }
    this.cierra();
  };

  Enlace.prototype.cierra = function () {
    try { if (this.ev) this.ev.close(); } catch (e) { }
    try { if (this.sn) this.sn.close(); } catch (e) { }
    try { if (this.pc) this.pc.close(); } catch (e) { }
    this.ev = this.sn = this.pc = null;
  };

  /* ------------------------------------------------------------
   * El conjunto
   * ------------------------------------------------------------ */
  var Directo = {
    activo: false,
    sid: null,
    enlaces: {},          // sid -> Enlace
    envia: null,          // function(name, data) — señalización por Supabase
    entrega: null,        // function(name, wrap) — lo recibido, hacia Net

    /* Apagado a mano con ?directo=no, para poder comparar */
    permitido: function () {
      return soportado() && !/[?&]directo=no\b/.test(window.location.search);
    },

    arranca: function (sid, envia, entrega) {
      this.corta();
      if (!this.permitido()) return;
      this.activo = true;
      this.sid = sid;
      this.envia = envia;
      this.entrega = entrega;
    },

    /* Se ha visto a alguien en el canal: si toca, se le ofrece enlace. */
    ve: function (sid) {
      if (!this.activo || !sid || sid === this.sid) return;
      var e = this.enlaces[sid];
      if (e) { e.visto = Date.now(); return; }
      /* ofrece el del identificador más bajo, y así no chocan los dos */
      e = new Enlace(this, sid, this.sid < sid);
      this.enlaces[sid] = e;
      e.abre();
    },

    /* Señalización que llega por Supabase */
    senal: function (d, sid) {
      if (!this.activo || !d || d.to !== this.sid) return;
      var e = this.enlaces[sid];
      if (!e) {
        /* nos ofrecen antes de haberle visto: se acepta */
        if (d.k !== 'o') return;
        e = new Enlace(this, sid, false);
        this.enlaces[sid] = e;
        e.abre();
      }
      if (e.muerto) return;
      e.visto = Date.now();
      if (d.k === 'o') e.oferta(d.s);
      else if (d.k === 'a') e.respuesta(d.s);
      else if (d.k === 'i') e.candidato(d.c);
    },

    senala: function (sid, d) {
      if (!this.envia) return;
      d.to = sid;
      this.envia('~rtc', d);
    },

    recibe: function (name, wrap) {
      if (this.entrega) this.entrega(name, wrap);
    },

    /* Manda por los enlaces que haya. Devuelve los sid a los que llegó, o
     * null si no llegó a ninguno. */
    manda: function (name, wrap) {
      if (!this.activo) return null;
      var hechos = null;
      for (var sid in this.enlaces) {
        if (!this.enlaces.hasOwnProperty(sid)) continue;
        if (this.enlaces[sid].manda(name, wrap)) {
          (hechos || (hechos = [])).push(sid);
        }
      }
      return hechos;
    },

    /* ¿Está todo el mundo conocido por enlace directo? Entonces el canal de
     * Supabase no tiene que repetir el mensaje y deja de contar cuota. */
    todosDirectos: function () {
      if (!this.activo) return false;
      var hay = false;
      var ahora = Date.now();
      for (var sid in this.enlaces) {
        if (!this.enlaces.hasOwnProperty(sid)) continue;
        var e = this.enlaces[sid];
        if (!e.listo) {
          /* uno del que hace mucho que no se sabe nada ya no cuenta: si no,
           * su ausencia dejaría el canal de siempre encendido para siempre */
          if (e.muerto && ahora - e.visto > OLVIDO_MS) {
            delete this.enlaces[sid];
            continue;
          }
          return false;
        }
        hay = true;
      }
      return hay;
    },

    /* Para la pantalla de ONLINE: cuántos van por enlace directo */
    cuenta: function () {
      var n = 0;
      for (var sid in this.enlaces) {
        if (this.enlaces.hasOwnProperty(sid) && this.enlaces[sid].listo) n++;
      }
      return n;
    },

    olvida: function (sid) {
      var e = this.enlaces[sid];
      if (!e) return;
      e.cae();
      delete this.enlaces[sid];
    },

    corta: function () {
      for (var sid in this.enlaces) {
        if (this.enlaces.hasOwnProperty(sid)) this.enlaces[sid].cae();
      }
      this.enlaces = {};
      this.activo = false;
      this.envia = null;
      this.entrega = null;
    }
  };

  window.PM.Directo = Directo;
})();
