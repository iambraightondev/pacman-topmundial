/* ============================================================
 * PAC-MAN TOP MUNDIAL — pruebas-red.js
 *
 * Parties de verdad sin navegador:
 *
 *   node pruebas-red.js          (todo, unos 3 minutos: la matriz es lo lento)
 *   node pruebas-red.js 4        (solo los casos que empiezan por "4")
 *
 * Carga el juego entero varias veces con el arnés de pruebas-node.js (el
 * mismo DOM de mentira), así que cada "mundo" es un navegador aparte con su
 * propio Game, su Net y su localStorage. Los une una red de mentira que
 * entrega los mensajes EN ORDEN (entregarlos desordenados inventa
 * divergencias que no existen) y pasando por JSON, como por el cable.
 *
 * Aquí van los fallos que solo salen con varias máquinas a la vez: quién
 * muere y quién come, el traspaso del mando, los vigilantes de silencio,
 * los mirones... Sale con código 1 si falla alguno.
 *
 * NUNCA toca la red de verdad: el fetch del arnés falla siempre y el
 * transporte de Net se sustituye por esta red.
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');

var raiz = __dirname;

/* ---------- un navegador más ---------- */
var ARNES = (function () {
  var src = fs.readFileSync(path.join(raiz, 'pruebas-node.js'), 'utf8');
  var corte = src.indexOf('/* ---------- las pruebas ---------- */');
  if (corte < 0) throw new Error('pruebas-node.js ha cambiado: no encuentro el corte del arnés');
  return src.slice(0, corte) + '\nreturn sandbox;';
})();

function cargarMundo(k) {
  var w = new Function('require', '__dirname', 'process', ARNES)(require, raiz, process);
  w.PM.Directo = null;                 // sin enlaces directos: todo por "el canal"
  if (w.PM.settings) w.PM.settings.muted = true;
  /* la sesión de la pestaña (sobrevive a recargarla): la usa VOLVER A LA
   * PARTIDA para saber que la party cortada es de esta pestaña */
  var ses = {};
  w.sessionStorage = {
    getItem: function (c) { return ses.hasOwnProperty(c) ? ses[c] : null; },
    setItem: function (c, v) { ses[c] = String(v); },
    removeItem: function (c) { delete ses[c]; }
  };
  var m = { k: k, w: w, G: w.PM.Game, Net: w.PM.Net, H: w.PM.Hab, J: w.PM.Jefe,
            sid: 'sid' + k, caido: false, sinRed: false, enviados: [] };
  m.Net.sid = m.sid;
  return m;
}

var POZO = [];
function mundo(k) {
  while (POZO.length <= k) POZO.push(cargarMundo(POZO.length));
  return POZO[k];
}

/* ---------- la red ---------- */
var red = {
  cola: [],
  mundos: [],

  /* El transporte de mentira de un mundo. `open` es lo que miraría el juego
   * del de Supabase: sin red (sinRed) o con la página muerta (caido), no. Si
   * el juego abre otro (Party.volver, Party.despedirse), sale de aquí. */
  transporte: function (m) {
    var t = {
      send: function (name, wrap) { red.poner(m, name, wrap); },
      connect: function (topic, cbs) { if (cbs && cbs.onOpen) cbs.onOpen(); },
      close: function () {}
    };
    Object.defineProperty(t, 'open', { get: function () { return !m.caido && !m.sinRed; } });
    return t;
  },

  /* Cada mundo habla por un transporte de mentira. Un mirón habla por su
   * canal de mirón (viewCh), como en el juego. */
  enchufar: function (m, miron) {
    m.caido = false;
    m.sinRed = false;
    m.enviados = [];
    m.Net.peers = [];
    m.Net.ultimoQ = {};
    m.Net.seq = 0;
    m.Net.code = 'PRUE';
    m.Net.transport = this.transporte(m);
    m.Net.newTransport = function () { return red.transporte(m); };
    m.Net.viewCh = miron ? {
      send: function (name, d) { red.poner(m, name, { s: m.Net.sid, d: d }); },
      sondear: function () {},
      enLinea: function () { return !m.caido && !m.sinRed; },
      close: function () {}
    } : null;
    if (miron) m.Net.viewCode = 'PRUE';
    if (this.mundos.indexOf(m) < 0) this.mundos.push(m);
  },

  poner: function (m, name, wrap) {
    if (m.caido || m.sinRed) return;   // se le cayó la red: no sale nada
    var copia = JSON.parse(JSON.stringify(wrap));
    m.enviados.push([name, copia.d]);
    this.cola.push({ de: m, name: name, wrap: copia });
  },

  entregar: function () {
    while (this.cola.length) {
      var msg = this.cola.shift();
      for (var i = 0; i < this.mundos.length; i++) {
        var m = this.mundos[i];
        if (m === msg.de || m.caido || m.sinRed) continue;
        if (m.G.isSpec() && m.Net.viewHandler) {
          m.Net.viewHandler(msg.name, JSON.parse(JSON.stringify(msg.wrap.d)), msg.wrap.s);
        } else if (m.Net.transport && m.Net.handler) {
          m.Net.entrega(msg.name, JSON.parse(JSON.stringify(msg.wrap)));
        }
      }
    }
  },

  /* n ticks de todos a la vez; lo de cada tick llega en el siguiente */
  paso: function (n) {
    for (var t = 0; t < (n || 1); t++) {
      for (var i = 0; i < this.mundos.length; i++) {
        var m = this.mundos[i];
        if (!m.caido && m.G.inGame()) m.G.step();
      }
      this.entregar();
    }
  },

  vaciar: function () {
    for (var i = 0; i < this.mundos.length; i++) {
      var m = this.mundos[i];
      try { if (m.G.inGame()) { m.G.netNotice = null; m.G.toMenu(); } } catch (e) { /* ya estaba */ }
      m.Net.transport = null;
      m.Net.viewCh = null;
      m.Net.handler = null;
      m.Net.viewHandler = null;
      if (m.w.PM.Party) { m.w.PM.Party.order = null; m.w.PM.Party.st = null; }
    }
    this.cola = [];
    this.mundos = [];
  }
};

/* ---------- montar una party ----------
 * n jugadores (mundos 0..n-1, el 0 manda) y o.mirones más detrás.
 * o: { hab, superv, roles, loadouts, mirones, sinEmpezar } */
var NOMBRES = ['UNO', 'DOS', 'TRES', 'CUATRO'];
function montar(n, o) {
  o = o || {};
  red.vaciar();
  var total = n + (o.mirones || 0), ms = [], i;
  for (i = 0; i < total; i++) ms.push(mundo(i));
  var orden = [];
  for (i = 0; i < n; i++) orden.push({ s: ms[i].sid, n: NOMBRES[i] });
  var cfg = JSON.parse(JSON.stringify(ms[0].G.settings()));
  for (i = 0; i < total; i++) {
    var m = ms[i], miron = i >= n;
    red.enchufar(m, miron);
    if (m.w.PM.Party) m.w.PM.Party.order = orden.slice();
    m.G.newGame({
      players: n,
      net: miron ? 'spec' : (i === 0 ? 'host' : 'guest'),
      localIdx: miron ? -1 : i,
      names: NOMBRES.slice(0, n),
      cfg: cfg, hab: !!o.hab, clasif: !!o.clasif, roles: o.roles || null, loadouts: o.loadouts || null,
      superv: !!o.superv
    });
  }
  red.paso(1);
  if (!o.sinEmpezar) {
    for (i = 0; i < 900 && ms[0].G.state !== 'PLAYING'; i++) red.paso(1);
    if (ms[0].G.state !== 'PLAYING') throw new Error('la party no arranca');
    red.paso(12);                       // que llegue alguna foto
  }
  return ms;
}

/* Nadie muere por su cuenta mientras se prepara la escena */
function blindar(ms) {
  ms.forEach(function (m) {
    m.G.pacs.forEach(function (p) { p.safeTicks = 1e9; });
  });
}

/* Deja al pac `i` y al fantasma `gid` en la misma casilla, quietos, en todas
 * las máquinas (la foto del anfitrión no los separa) */
function juntar(ms, i, gid) {
  var x = 6 * 8 + 4, y = 5 * 8 + 4;
  ms.forEach(function (m) {
    var p = m.G.pacs[i], g = m.G.ghosts[gid];
    p.x = x; p.y = y; p.errX = 0; p.errY = 0; p.pauseTicks = 30;
    g.x = x; g.y = y; g.mode = 'normal'; g.clearPlan && g.clearPlan();
  });
}

/* La página de m muere y se vuelve a abrir (VOLVER A LA PARTIDA): un mundo
 * NUEVO, con lo que sobrevive a recargar —el almacén de lo que importa y la
 * sesión de la pestaña— y un sid estrenado, como cualquier página recién
 * abierta (el de antes lo tiene que traer la party cortada). */
var CLAVES_RED = ['pacman-topmundial-red-viva', 'pacman-topmundial-clasif-viva'];
function recargar(m) {
  var guardado = {};
  CLAVES_RED.forEach(function (c) { guardado[c] = m.w.localStorage.getItem(c); });
  var ses = m.w.sessionStorage.getItem('pacman-topmundial-red-sid');
  m.caido = true;
  var n = cargarMundo(m.k);
  CLAVES_RED.forEach(function (c) { if (guardado[c] !== null) n.w.localStorage.setItem(c, guardado[c]); });
  if (ses !== null) n.w.sessionStorage.setItem('pacman-topmundial-red-sid', ses);
  n.Net.sid = 'nueva' + m.k;
  red.enchufar(n, false);
  n.Net.code = null;                    // aún no está en ninguna sala
  n.caidoDe = m;
  return n;
}

/* ...y pide volver: hace lo que haría el aviso de la portada (UI.avisoVolver
 * y VOLVER A LA PARTIDA). Devuelve el error, o null si ha vuelto. */
function volver(n) {
  var Gd = n.w.PM.Guardado;
  eq(Gd.alAbrir(), 'pendiente', 'al abrir, la party cortada queda pendiente');
  var rec = Gd.paraVolver();
  ok(rec, 'y se ofrece volver');
  var res = null;
  n.w.PM.Party.volver(rec, function (err, d) { res = { err: err, d: d }; });
  for (var t = 0; t < 10 && !res; t++) red.paso(1);
  ok(res, 'alguien contesta');
  if (res.err) return res.err;
  n.w.PM.UI.volverConRevista(res.d);
  Gd.redRetomada();
  return null;
}

/* ¿Las dos máquinas ven la misma partida? (lo que manda el anfitrión) */
function mismaPartida(A, B, i) {
  eq(B.G.score, A.G.score, 'los puntos');
  eq(B.G.dotsLeft, A.G.dotsLeft, 'las pastillas que quedan');
  eq(B.G.pelletHex(), A.G.pelletHex(), 'el mapa de pastillas');
  eq(B.G.level, A.G.level, 'el nivel');
  eq(B.G.state, A.G.state, 'el estado');
  eq(JSON.stringify(B.G.pacs.map(function (p) { return p.lives; })),
     JSON.stringify(A.G.pacs.map(function (p) { return p.lives; })), 'las vidas');
  if (i >= 0) {
    var a = A.G.pacs[i], b = B.G.pacs[i];
    ok(Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 8,
       'el Pac-Man ' + i + ' en el mismo sitio (' + a.x + ',' + a.y + ' / ' + b.x + ',' + b.y + ')');
  }
}

function mensajes(m, nombre, t) {
  return m.enviados.filter(function (e) {
    return e[0] === nombre && (!t || (e[1] && e[1].t === t));
  });
}

/* ---------- las comprobaciones ---------- */
var casos = [], actual = null;
function caso(nombre, fn) { casos.push({ nombre: nombre, fn: fn }); }
function ok(v, msg) { if (!v) throw new Error(msg || 'no se cumple'); }
function eq(a, b, msg) {
  if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'sale ' + JSON.stringify(a) + ', se esperaba ' + JSON.stringify(b));
}

/* =============================================================
 * 1. COMER O MORIR: la misma regla en las dos máquinas
 * ============================================================= */
function duoHab(rolInvitado, carga) {
  var ms = montar(2, { hab: true, roles: ['tanque', rolInvitado || 'asesino'],
                       loadouts: [null, carga || null] });
  blindar(ms);
  return ms;
}

/* La marca de CACERÍA puesta a mano en el anfitrión: con su reloj, que sin él
 * el paso de Hab la borra en el acto */
function marcar(A, gid, quien) {
  A.H.caceriaQuien[gid] = quien;
  if (quien >= 0) A.H.st[quien].caceria = 600;
}

caso('1a · un fantasma de SU cacería: el invitado se lo come, no muere', function () {
  var ms = duoHab('asesino', 'mordisco,turbo,flash,caceria'), A = ms[0], B = ms[1];
  A.G.ghosts[0].frightened = false;
  ok(B.H.pulsar(B.G, 1, 3), 'el invitado lanza su CACERÍA');
  red.paso(10);                            // el anfitrión la ejecuta y la foto la trae
  eq(A.H.caceriaQuien[0], 1, 'el anfitrión marca al fantasma para él');
  eq(B.H.caceriaQuien[0], 1, 'al invitado le llega la marca');
  juntar(ms, 1, 0);
  B.G.pacs[1].safeTicks = 0;
  B.enviados = [];
  red.paso(3);
  eq(mensajes(B, 'gevt', 'died').length, 0, 'no se da por muerto');
  eq(mensajes(B, 'gevt', 'ateGhost').length, 1, 'se lo come');
  ok(!A.G.pacs[1].dying, 'y en el anfitrión sigue vivo');
  eq(A.G.ghosts[0].mode, 'eyes', 'y el anfitrión le da la baja');
});

caso('1b · un fantasma azul del GANCHO: el invitado se lo come', function () {
  var ms = duoHab(), A = ms[0], B = ms[1];
  A.H.azulCatalogo[0] = 1; A.H.azulCatTicks[0] = 600;
  A.G.ghosts[0].frightened = false;
  red.paso(10);
  juntar(ms, 1, 0);
  B.G.pacs[1].safeTicks = 0;
  B.enviados = [];
  red.paso(3);
  eq(mensajes(B, 'gevt', 'died').length, 0, 'no se da por muerto');
  eq(mensajes(B, 'gevt', 'ateGhost').length, 1, 'se lo come');
  eq(A.G.ghosts[0].mode, 'eyes', 'y el anfitrión le da la baja');
});

/* 5 oct (Braighton): el azul de la superpastilla vale para TODOS, también
 * sobre el marcado por la CACERÍA de otro (Hab.puedeComer). Sin azul, el
 * marcado sigue siendo solo de su cazador. */
caso('1c · marcado por OTRO: azul de superpastilla se lo come el invitado; sin azul lo mata', function () {
  var ms = duoHab(), A = ms[0], B = ms[1];
  A.G.frightTicks = 400;
  A.G.ghosts[0].frightened = true;
  marcar(A, 0, 0);                         // es del anfitrión
  red.paso(10);
  ok(B.G.ghosts[0].frightened, 'el invitado lo ve azul');
  juntar(ms, 1, 0);
  B.G.pacs[1].safeTicks = 0;
  B.enviados = [];
  red.paso(3);
  eq(mensajes(B, 'gevt', 'died').length, 0, 'azul es azul: no muere');
  eq(mensajes(B, 'gevt', 'ateGhost').length, 1, 'se lo come');
  eq(A.G.ghosts[0].mode, 'eyes', 'y el anfitrión le da la baja');

  ms = duoHab(); A = ms[0]; B = ms[1];
  A.G.ghosts[0].frightened = false;
  marcar(A, 0, 0);
  red.paso(10);
  juntar(ms, 1, 0);
  B.G.pacs[1].safeTicks = 0;
  B.enviados = [];
  red.paso(3);
  eq(mensajes(B, 'gevt', 'ateGhost').length, 0, 'sin azul no se lo come');
  eq(mensajes(B, 'gevt', 'died').length, 1, 'muere');
  red.paso(3);
  ok(A.G.pacs[1].dying, 'y el anfitrión le da la muerte');
});

caso('1d · el anfitrión no acepta una muerte contra un fantasma que el invitado podía comerse', function () {
  var ms = duoHab(), A = ms[0], B = ms[1];
  marcar(A, 0, 1);
  red.paso(10);
  A.G.pacs[1].safeTicks = 0;
  B.G.netSend('gevt', { t: 'died', g: 0 });   // un invitado de antes, o una foto que llegó tarde
  red.paso(2);
  ok(!A.G.pacs[1].dying, 'no lo mata');
  /* ...pero un fantasma normal sí mata */
  marcar(A, 0, -1); A.H.st[1].caceria = 0;
  A.G.ghosts[0].frightened = false;
  B.G.netSend('gevt', { t: 'died', g: 0 });
  red.paso(2);
  ok(A.G.pacs[1].dying, 'con uno normal, sí');
});

caso('1e · el anfitrión no deja comerse al marcado por otro si no está azul', function () {
  var ms = duoHab(), A = ms[0], B = ms[1];
  A.G.ghosts[0].frightened = false;
  marcar(A, 0, 0);
  red.paso(10);
  B.G.netSend('gevt', { t: 'ateGhost', g: 0 });
  red.paso(2);
  ok(A.G.ghosts[0].mode !== 'eyes', 'sigue vivo');
});

/* 7 oct (Braighton): el GANCHO INVERSO deja azul al rey, pero ese azul solo
 * le sirve al Asesino que lo lanzó. Aquí el Asesino es el invitado: el golpe
 * lo pide él y lo da el anfitrión, una sola vez. El rey va congelado para
 * que no se mueva de la casilla. */
caso('1f · REY: el azul del gancho inverso es del invitado que lo lanzó, y pega una vez', function () {
  var ms = duoHab('asesino', 'mordisco,turbo,gancho_inverso,grito'), A = ms[0], B = ms[1];
  var x = 6 * 8 + 4, y = 5 * 8 + 4, DANO = CFG(A).JEFE.DANO.azul;
  A.G.jefe = { vivo: true, hp: 50, max: 50, x: x, y: y, dir: 0, st: 'caza', stT: 0, tCarga: 0, tInvoca: 0,
               inv: 0, frz: 1e6, frzHielo: false, trasHielo: 0, golpeado: 0, azulUsado: 0, azulTick: -1,
               gAzul: 0, gDe: -1, gUsado: 0, plan: -1, huye: 0, huyeDe: -1 };
  red.paso(10);
  ok(B.G.jefe && B.G.jefe.vivo, 'el invitado ve al rey');
  A.w.PM.Jefe.enganchar(A.G, 1);
  red.paso(10);
  ok(B.w.PM.Jefe.azulDe(B.G, 1), 'al invitado le llega que el azul es suyo');
  ok(!B.w.PM.Jefe.azulDe(B.G, 0), 'y que no es del anfitrión');
  function encima(i) {
    ms.forEach(function (m) { var p = m.G.pacs[i]; p.x = x; p.y = y; p.errX = 0; p.errY = 0; p.pauseTicks = 30; });
  }
  encima(0);
  red.paso(3);
  eq(A.G.jefe.hp, 50, 'el compañero lo toca y no le resta nada');
  encima(1);
  B.enviados = [];
  /* el anfitrión tarda unos ticks en ver al invitado en su casilla nueva (lo
   * hemos movido de golpe): mientras no le cuente el golpe, lo vuelve a pedir */
  red.paso(45);
  ok(mensajes(B, 'gevt', 'jefeGolpe').length >= 1, 'el invitado pide su golpe');
  eq(A.G.jefe.hp, 50 - DANO, 'y el anfitrión se lo da');
  ok(!B.G.pacs[1].dying, 'sin morir');
  encima(1);
  red.paso(60);
  eq(A.G.jefe.hp, 50 - DANO, 'una sola vez por gancho');
});

/* =============================================================
 * 2. EL NUEVO ANFITRIÓN NO SE ECHA A SÍ MISMO
 * ============================================================= */
caso('2 · trío: tras el traspaso, el nuevo anfitrión sigue jugando pasados 10 s', function () {
  var ms = montar(3), A = ms[0], B = ms[1], C = ms[2];
  blindar(ms);
  A.G.toMenu();                             // se va ordenadamente
  red.paso(2);
  eq(B.G.netRole, 'host', 'el asiento 1 coge el mando');
  eq(C.G.hostIdx, 1, 'el 2 lo sabe');
  red.paso(A.G.inGame() ? 0 : 1);
  red.paso(CFG(B).NET.DROP_TICKS + 60);
  ok(!B.G.pacs[1].out, 'el nuevo anfitrión no se ha echado');
  ok(!B.G.netNotice, 'ni se le corta la partida');
  ok(!C.G.pacs[2].out, 'el otro invitado sigue dentro');
  ok(!C.G.netNotice, 'y sin aviso');
});

/* =============================================================
 * 3. SALIR POR AVISO DE RED NO TRASPASA A UN MUDO
 * ============================================================= */
/* (28 sep, VOLVER A LA PARTIDA: antes el dúo se acababa a los 10 s; ahora
 * se le espera el plazo y el anfitrión sigue solo) */
caso('3a · dúo: si el compañero se cae, se le espera; si no vuelve, sigue solo, sin traspasarle ni perder el top', function () {
  var ms = montar(2), A = ms[0], B = ms[1];
  blindar(ms);
  B.caido = true;                           // se le va la red sin despedirse
  A.enviados = [];
  red.paso(CFG(A).NET.WAIT_TICKS + 30);
  ok(A.G.esperando(1), 'se le espera');
  eq(A.G.state, 'PLAYING', 'y la partida sigue');
  red.paso(CFG(A).NET.PLAZO_TICKS);
  ok(A.G.pacs[1].out, 'pasado el plazo, queda fuera');
  ok(A.G.inGame() && !A.G.netNotice, 'y el anfitrión sigue jugando solo');
  A.G.toMenu();
  eq(mensajes(A, 'mando').length, 0, 'sin traspaso a quien no contesta');
  ok(A.G.rankingSent, 'y lo jugado va al top');
});

caso('3b · trío: el mando no va a quien lleva callado', function () {
  var ms = montar(3), A = ms[0], B = ms[1], C = ms[2];
  blindar(ms);
  B.caido = true;
  red.paso(CFG(A).NET.WAIT_TICKS + 30);     // callado, pero aún no echado
  ok(!A.G.pacs[1].out, 'todavía no lo ha echado');
  A.enviados = [];
  A.G.toMenu();
  var m = mensajes(A, 'mando');
  eq(m.length, 1, 'traspasa');
  eq(m[0][1].n, 2, 'al que sí habla');
  red.paso(2);
  eq(C.G.netRole, 'host', 'y ese coge el mando');
});

/* =============================================================
 * 4. EL VIGILANTE DEL INVITADO ESCUCHA AL ANFITRIÓN
 * ============================================================= */
/* (28 sep, VOLVER A LA PARTIDA: antes, CONEXIÓN PERDIDA para todos; ahora
 * se espera y, si no vuelve, el mando pasa al siguiente con la última foto) */
caso('4a · trío: si el anfitrión se cae sin despedirse, los invitados se enteran y el mando pasa al siguiente', function () {
  var ms = montar(3), A = ms[0], B = ms[1], C = ms[2];
  blindar(ms);
  A.caido = true;
  red.paso(CFG(B).NET.WAIT_TICKS + 30);
  ok(B.G.netStalled() && C.G.netStalled(), 'los dos se paran');
  ok(/ESPERANDO A UNO/.test(B.G.avisoRed().a), 'y dicen a quién esperan: ' + B.G.avisoRed().a);
  red.paso(CFG(B).NET.PLAZO_TICKS);
  eq(B.G.netRole, 'host', 'el 1 hereda el mando');
  eq(C.G.hostIdx, 1, 'el 2 lo sabe');
  ok(!B.G.netNotice && !C.G.netNotice, 'y nadie se queda sin partida');
  ok(B.G.pacs[0].out && C.G.pacs[0].out, 'el anfitrión de antes queda fuera');
  red.paso(60);
  ok(!C.G.netStalled() && C.G.state === 'PLAYING', 'el 2 sigue jugando con el nuevo');
});

caso('4b · dúo con mirón: el latido del mirón no tapa la caída del anfitrión', function () {
  var ms = montar(2, { mirones: 1 }), A = ms[0], B = ms[1], S = ms[2];
  blindar(ms);
  A.caido = true;
  for (var t = 0; t < CFG(B).NET.PLAZO_TICKS + 30; t++) {
    if (t % 60 === 0) S.Net.gameSend('hello', { v: CFG(S).NET.PROTO, spec: 1, hb: 1 });
    red.paso(1);
  }
  eq(B.G.netRole, 'host', 'el invitado se entera a su plazo y hereda el mando');
  red.paso(30);
  eq(S.G.hostIdx, 1, 'el mirón sigue la partida del nuevo');
  ok(!S.G.netNotice && !S.G.netStalled(), 'sin cortársele');
});

/* =============================================================
 * 5. EL RÉCORD DEL QUE HEREDA EL MANDO ES EL SUYO
 * ============================================================= */
caso('5 · quien hereda el mando no se queda el récord del anfitrión', function () {
  var ms = montar(2), A = ms[0], B = ms[1];
  blindar(ms);
  A.G.highScore = 99999;                    // el récord de dúo del anfitrión
  red.paso(10);
  eq(B.G.highScore, 99999, 'el invitado lo ve en el marcador');
  var antes = B.G.recordFor(2);
  A.G.toMenu();
  red.paso(3);
  eq(B.G.netRole, 'host', 'el invitado coge el mando');
  B.G.persistHighScore();                   // lo que hace al acabar
  ok(B.G.recordFor(2) < 99999, 'no se apunta los 99.999 ajenos (tiene ' + B.G.recordFor(2) + ')');
  ok(B.G.recordFor(2) >= antes, 'ni pierde el suyo');
});

/* =============================================================
 * 6. LA REVANCHA DESPUÉS DE UN TRASPASO
 * ============================================================= */
caso('6 · trío: revancha tras el traspaso, con el mando donde quedó', function () {
  var ms = montar(3), A = ms[0], B = ms[1], C = ms[2];
  blindar(ms);
  A.G.toMenu();
  red.paso(3);
  eq(B.G.netRole, 'host');
  /* se acaba la partida y el nuevo anfitrión echa otra */
  B.G.surrenderNow();
  red.paso(3);
  B.G.rematch();
  red.paso(3);
  eq(B.G.netRole, 'host', 'sigue mandando');
  eq(B.G.hostIdx, 1, 'desde el asiento 1');
  eq(C.G.hostIdx, 1, 'y el otro lo sabe');
  ok(B.G.pacs[0].out && C.G.pacs[0].out, 'el que se fue no vuelve a salir');
  for (var t = 0; t < 900 && B.G.state !== 'PLAYING'; t++) red.paso(1);
  eq(B.G.state, 'PLAYING', 'la revancha arranca');
  blindar(ms);
  red.paso(CFG(B).NET.DROP_TICKS + 60);
  ok(!C.G.netNotice && C.G.inGame(), 'el invitado sigue recibiendo la partida');
  eq(C.G.state, 'PLAYING', 'y va al paso del anfitrión');
  ok(!B.G.pacs[1].out, 'y el anfitrión no se echa a sí mismo');
});

/* =============================================================
 * 7. PUNTOS POR PROTEGER: el choque del invitado lo decide su máquina,
 *    pero el marcador es del anfitrión (avisos habRoto con su capa,
 *    habRebote). Se paga UNA vez, y el "+600" se ve en las dos pantallas.
 * ============================================================= */
function sinPastillas(ms, fila) {
  ms.forEach(function (m) {
    var P = m.G.pellets[fila];
    for (var c = 0; c < P.length; c++) if (P[c]) { P[c] = null; m.G.dotsLeft--; }
  });
}
function vioMas600(m) {
  return m.G.popups.some(function (p) { return p.text === '+600'; });
}
/* El invitado se choca con Blinky y se mira cuánto ha cobrado cada uno en
 * el anfitrión (y que la foto se lo lleva al invitado) */
function chocaInvitado(ms) {
  var A = ms[0], B = ms[1];
  sinPastillas(ms, 5);
  A.G.pacs[0].pauseTicks = 1e6;               // el anfitrión, quieto: que no coma
  red.paso(2);
  var antes = A.G.ptsJ.slice(), total = A.G.score;
  A.G.popups = []; B.G.popups = [];
  juntar(ms, 1, 0);
  B.G.pacs[1].safeTicks = 0;
  B.enviados = [];
  red.paso(3);
  red.paso(12);                                // que llegue la foto
  return {
    d: [(A.G.ptsJ[0] || 0) - (antes[0] || 0), (A.G.ptsJ[1] || 0) - (antes[1] || 0)],
    total: A.G.score - total
  };
}

/* Dúo con el Tanque de invitado (un rol por cabeza) y su coraza recién puesta */
function tanqueInvitado(carga) {
  var ms = montar(2, { hab: true, roles: ['asesino', 'tanque'], loadouts: [null, carga || null] });
  blindar(ms);
  ms.forEach(function (m) { var s = m.H.estado(1); s.corPas = CFG(m).HAB.CORAZA_DURA; s.corCd = 0; });
  return ms;
}

caso('7a · la CORAZA del Tanque invitado: cobra él, lo paga el anfitrión', function () {
  var ms = tanqueInvitado(), A = ms[0], B = ms[1];
  ok(B.H.corazaDe(B.G, 1), 'el invitado lleva su coraza');
  var r = chocaInvitado(ms);
  ok(!B.G.pacs[1].dying && !A.G.pacs[1].dying, 'no muere');
  eq(mensajes(B, 'gevt', 'habRoto').length, 1, 'avisa del golpe una vez');
  eq(mensajes(B, 'gevt', 'habRoto')[0][1].c, 'p', 'diciendo que fue la coraza');
  eq(r.d[1], CFG(A).HAB.PROTEGE_PUNTOS, 'el Tanque invitado cobra 600 en el anfitrión');
  eq(r.total, CFG(A).HAB.PROTEGE_PUNTOS, 'y el marcador sube eso, una sola vez');
  eq(B.G.score, A.G.score, 'la foto se lo lleva al invitado');
  ok(vioMas600(A) && vioMas600(B), 'y el "+600" se ve en las dos pantallas');
});

caso('7b · el ESCUDO del Soporte anfitrión salva al invitado: cobra el Soporte', function () {
  var ms = montar(2, { hab: true, roles: ['soporte', 'asesino'] }), A = ms[0], B = ms[1];
  blindar(ms);
  ok(A.H.aliado(A.G, 0), 'el Soporte le da su escudo');
  red.paso(3);
  ok(B.H.estado(1).escudo > 0, 'al invitado le llega');
  var r = chocaInvitado(ms);
  ok(!A.G.pacs[1].dying, 'el escudo le salva');
  eq(mensajes(B, 'gevt', 'habRoto')[0][1].c, 'e', 'y avisa de que fue el escudo aliado');
  eq(r.d[0], CFG(A).HAB.PROTEGE_PUNTOS, 'cobra el Soporte');
  eq(r.d[1], 0, 'y no el salvado');
  ok(vioMas600(B), 'el invitado ve el "+600"');
});

caso('7c · el REBOTE del Tanque invitado: 600 por aguantar y la baja, en el anfitrión', function () {
  var ms = tanqueInvitado('rebote,escudo,provocar,arrollar'), A = ms[0], B = ms[1];
  ms.forEach(function (m) { m.H.estado(1).corPas = 0; m.H.estado(1).corCd = 9999; });   // que aguante el rebote
  ok(B.H.pulsar(B.G, 1, 0), 'el invitado se pone el REBOTE');
  red.paso(6);
  ok(A.H.estado(1).rebote > 0, 'el anfitrión se lo cree');
  var r = chocaInvitado(ms);
  eq(mensajes(B, 'gevt', 'habRebote').length, 1, 'avisa del rebote');
  eq(r.d[1], CFG(A).HAB.PROTEGE_PUNTOS + CFG(A).HAB.MAGO_PUNTOS, 'cobra el golpe y la baja');
  eq(A.G.ghosts[0].mode, 'eyes', 'y el fantasma cae');
});

caso('7f · la CORAZA del Tanque invitado: el anfitrión la ve como la lleva él, aunque los relojes se separen', function () {
  var ms = tanqueInvitado(), A = ms[0], B = ms[1];
  B.H.estado(1).corPas = 0; B.H.estado(1).corCd = 500;      // en su máquina ya no la lleva
  ok(A.H.corazaDe(A.G, 1), 'el anfitrión aún se la veía puesta');
  red.paso(12);
  ok(!A.H.corazaDe(A.G, 1), 'y deja de vérsela');
  ok(Math.abs(A.H.estado(1).corCd - B.H.estado(1).corCd) <= 12, 'con la misma recarga');
  B.H.estado(1).corCd = 1;
  red.paso(12);
  ok(B.H.corazaDe(B.G, 1) && A.H.corazaDe(A.G, 1), 'cuando le vuelve, le vuelve en las dos');
});

/* La W (el ESCUDO de 8 s) del Tanque invitado, con la coraza pasiva gastada:
 * MAULIO decía que su escudo no le daba puntos y la pasiva sí (3 oct). */
caso('7e · el ESCUDO (W) del Tanque invitado: cobra 600, con la pasiva gastada y con ella puesta', function () {
  var ms = tanqueInvitado(), A = ms[0], B = ms[1];
  ms.forEach(function (m) { m.H.estado(1).corPas = 0; m.H.estado(1).corCd = 9999; });
  ok(B.H.pulsar(B.G, 1, 1), 'el invitado se pone la W');
  red.paso(6);
  ok(B.H.estado(1).coraza > 0, 'la lleva en su máquina');
  ok(A.H.estado(1).coraza > 0, 'y el anfitrión se lo cree');
  var r = chocaInvitado(ms);
  ok(!B.G.pacs[1].dying && !A.G.pacs[1].dying, 'no muere');
  eq(mensajes(B, 'gevt', 'habRoto').length, 1, 'avisa del golpe');
  eq(mensajes(B, 'gevt', 'habRoto')[0][1].c, 'w', 'diciendo que fue la W');
  eq(r.d[1], CFG(A).HAB.PROTEGE_PUNTOS, 'cobra 600 en el anfitrión');
  ok(vioMas600(B), 'y lo ve en su pantalla');

  /* con las dos puestas: primero se gasta la W, y también cobra */
  ms = tanqueInvitado(); A = ms[0]; B = ms[1];
  ok(B.H.pulsar(B.G, 1, 1), 'la W encima de la coraza');
  red.paso(6);
  r = chocaInvitado(ms);
  eq(mensajes(B, 'gevt', 'habRoto')[0][1].c, 'w', 'se rompe la W');
  eq(r.d[1], CFG(A).HAB.PROTEGE_PUNTOS, 'y cobra');
  ok(A.H.corazaDe(A.G, 1), 'la coraza sigue para el siguiente golpe');
});

caso('7d · un invitado que se inventa el golpe no cobra', function () {
  var ms = tanqueInvitado(), A = ms[0], B = ms[1];
  red.paso(2);          // que no quede en camino una posición con la coraza de antes
  ms.forEach(function (m) { m.H.estado(1).corPas = 0; m.H.estado(1).corCd = 9999; });
  red.paso(2);
  var antes = A.G.ptsJ[1] || 0;
  B.G.netSend('gevt', { t: 'habRoto', g: -1, c: 'p' });
  B.G.netSend('gevt', { t: 'habRebote', g: 0 });
  red.paso(3);
  ok((A.G.ptsJ[1] || 0) - antes < CFG(A).HAB.PROTEGE_PUNTOS, 'sin coraza ni rebote puestos, nada de 600');
});

/* =============================================================
 * 10. A UN MIRÓN NO LO ECHAN LAS SALIDAS DE LOS DEMÁS
 * ============================================================= */
caso('10a · se va un invitado: el mirón sigue viendo', function () {
  var ms = montar(3, { mirones: 1 }), A = ms[0], C = ms[2], S = ms[3];
  blindar(ms);
  C.G.toMenu();
  red.paso(5);
  ok(!S.G.netNotice, 'sin aviso de fin');
  ok(A.G.pacs[2].out, 'el que se fue queda fuera');
});

caso('10b · se va otro mirón: nadie echa a nadie', function () {
  var ms = montar(3, { mirones: 2 }), A = ms[0], B = ms[1], S = ms[3], S2 = ms[4];
  blindar(ms);
  S2.G.toMenu();
  red.paso(5);
  ok(!S.G.netNotice, 'el otro mirón sigue viendo');
  ok(!A.G.pacs[1].out && !A.G.pacs[2].out, 'el anfitrión no echa a ningún jugador');
  ok(!B.G.pacs[1].out && !B.G.netNotice, 'y a los invitados no les pasa nada');
});

caso('10c · dúo: se va el mirón y el invitado sigue en su sitio', function () {
  var ms = montar(2, { mirones: 1 }), A = ms[0], B = ms[1], S = ms[2];
  blindar(ms);
  S.G.toMenu();
  red.paso(5);
  ok(!A.G.pacs[1].out, 'el anfitrión no echa al invitado');
  ok(!B.G.pacs[1].out, 'ni el invitado se echa a sí mismo');
});

caso('10d · se va el anfitrión sin traspaso: el mirón sí se entera', function () {
  var ms = montar(2, { mirones: 1 }), A = ms[0], B = ms[1], S = ms[2];
  blindar(ms);
  B.G.pacs[1].out = true;                   // nadie a quien dejarle el mando
  A.G.idos = { 1: true };
  B.G.idos = { 1: true };
  A.G.toMenu();
  red.paso(3);
  ok(S.G.netNotice, 'se acabó la partida que miraba');
});

/* =============================================================
 * R. VOLVER A LA PARTIDA (28 sep): a quien se cae se le espera el plazo
 * ============================================================= */
function plazo(m) { return CFG(m).NET.PLAZO_TICKS; }

caso('R1 · invitado sin red 20 s: se le espera quieto y a salvo, vuelve y las dos máquinas ven lo mismo', function () {
  var ms = montar(2), A = ms[0], B = ms[1];
  blindar(ms);
  red.paso(30);
  B.sinRed = true;                          // la página sigue viva; la red, no
  red.paso(CFG(A).NET.WAIT_TICKS + 20);
  ok(A.G.esperando(1), 'el anfitrión le espera');
  ok(/ESPERANDO A DOS/.test(A.G.avisoRed().a) && !A.G.avisoRed().tapa,
     'y lo dice sin parar su partida: ' + JSON.stringify(A.G.avisoRed()));
  eq(B.G.avisoRed().a, 'SIN CONEXIÓN', 'el invitado sabe que el que no tiene red es él');
  var x = A.G.pacs[1].x, y = A.G.pacs[1].y;
  A.G.pacs[1].safeTicks = 0;
  red.paso(20 * 60);
  eq(A.G.pacs[1].x + ',' + A.G.pacs[1].y, x + ',' + y, 'su Pac-Man no se ha movido');
  ok(A.G.pacs[1].safeTicks > 0, 'y está a salvo');
  ok(!A.G.pacs[1].out && A.G.inGame(), 'sigue dentro');
  B.sinRed = false;
  red.paso(40);
  ok(!A.G.esperando(1), 'vuelve y ya no se le espera');
  ok(!B.G.netStalled() && !B.G.netNotice, 'el invitado sigue jugando');
  ok(B.G.pacs[1].safeTicks > 0, 'con un momento de gracia');
  red.paso(CFG(A).NET.PELLET_SYNC_EVERY * CFG(A).NET.SNAP_EVERY + 10);
  mismaPartida(A, B, 1);
});

caso('R2 · invitado que no vuelve: pasado el plazo se le da por ido; si aparece luego, está fuera', function () {
  var ms = montar(3), A = ms[0], B = ms[1], C = ms[2];
  blindar(ms);
  B.sinRed = true;
  red.paso(plazo(A) - 60);
  ok(A.G.esperando(1) && !A.G.pacs[1].out, 'hasta el final del plazo se le espera');
  red.paso(CFG(A).NET.WAIT_TICKS + 120);
  ok(A.G.pacs[1].out && C.G.pacs[1].out, 'después, fuera en todas las máquinas');
  ok(!A.G.esperando(1), 'y ya no se le espera');
  ok(A.G.inGame() && C.G.inGame() && !C.G.netNotice, 'los demás siguen');
  B.sinRed = false;
  red.paso(10);
  ok(B.G.netNotice && /TARDASTE/.test(B.G.netNotice.text), 'al que llega tarde se le dice: ' +
     (B.G.netNotice && B.G.netNotice.text));
  red.paso(CFG(B).NET.NOTICE_TICKS + 5);
  ok(!B.G.inGame(), 'y vuelve al menú (cuenta como una salida)');
});

caso('R3 · invitado que recarga la página: vuelve a su asiento con la partida de todos', function () {
  var ms = montar(2), A = ms[0], B = ms[1];
  blindar(ms);
  red.paso(60);
  eq(B.w.PM.Guardado.alIrse(true), 'reservada', 'al cerrar la pestaña se guarda el asiento, sin cobrar');
  ok(B.G.inGame() && !B.G.xpSent, 'sin salir de la partida ni cobrarla');
  B.caido = true;                           // y la página muere
  red.paso(3);
  ok(A.G.esperando(1), 'y el anfitrión le espera ya (ausente)');
  var B2 = recargar(B);
  red.paso(5 * 60);                         // lo que tarda en abrir otra vez
  eq(volver(B2), null, 'vuelve');
  eq(B2.Net.sid, B.sid, 'con su sid de antes');
  eq(B2.G.netRole, 'guest');
  eq(B2.G.localIdx, 1, 'en su asiento');
  ok(!A.G.esperando(1), 'el anfitrión deja de esperarle');
  red.paso(CFG(A).NET.PELLET_SYNC_EVERY * CFG(A).NET.SNAP_EVERY + 10);
  mismaPartida(A, B2, 1);
  ok(!B2.G.netStalled(), 'y juega');
  A.G.toMenu();                             // el anfitrión se va: el mando, al que volvió
  red.paso(3);
  eq(B2.G.netRole, 'host', 'hasta el traspaso le funciona');
});

caso('R4 · anfitrión sin red 20 s: los invitados esperan en pausa, vuelve y sigue mandando', function () {
  var ms = montar(3), A = ms[0], B = ms[1], C = ms[2];
  blindar(ms);
  red.paso(30);
  A.sinRed = true;
  red.paso(CFG(A).NET.WAIT_TICKS + 20);
  ok(A.G.netStalled(), 'el anfitrión sin red se para');
  ok(!A.G.esperando(1) && !A.G.esperando(2), 'sin echarle la culpa a los demás');
  ok(B.G.netStalled() && C.G.netStalled(), 'los invitados, en pausa');
  var puntos = A.G.score;
  red.paso(20 * 60);
  eq(A.G.score, puntos, 'nadie juega mientras');
  A.sinRed = false;
  red.paso(40);
  eq(A.G.netRole, 'host', 'sigue mandando él');
  eq(B.G.hostIdx, 0);
  ok(!B.G.netStalled() && !C.G.netStalled() && !A.G.netStalled(), 'todos juegan otra vez');
  red.paso(CFG(A).NET.PELLET_SYNC_EVERY * CFG(A).NET.SNAP_EVERY + 10);
  mismaPartida(A, B, 1);
  mismaPartida(A, C, 2);
});

caso('R5 · anfitrión que no vuelve: el mando pasa al siguiente con la última foto; si aparece luego, sigue sin él', function () {
  var ms = montar(3), A = ms[0], B = ms[1], C = ms[2];
  blindar(ms);
  red.paso(30);
  A.sinRed = true;
  red.paso(CFG(B).NET.WAIT_TICKS + 10);
  var foto = { sc: B.G.score, dl: B.G.dotsLeft, hex: B.G.pelletHex() };
  for (var t = 0; t < plazo(B) && B.G.netRole !== 'host'; t++) red.paso(1);
  eq(B.G.netRole, 'host', 'el primero de la cola hereda el mando');
  ok(t > plazo(B) - CFG(B).NET.WAIT_TICKS - 20, 'pasado el plazo, no antes (' + t + ')');
  eq(B.G.score, foto.sc, 'con los puntos de la última foto');
  eq(B.G.pelletHex(), foto.hex, 'y su laberinto');
  red.paso(1);
  eq(C.G.hostIdx, 1, 'y el otro le hace caso');
  ok(B.G.pacs[0].out && C.G.pacs[0].out, 'el anfitrión de antes queda fuera');
  red.paso(60);
  ok(C.G.state === 'PLAYING' && !C.G.netStalled(), 'la partida sigue');
  A.sinRed = false;                         // el de antes recupera la red...
  red.paso(10);
  ok(A.G.netNotice && /SIGUIÓ SIN TI/.test(A.G.netNotice.text), '...y se entera de que siguió sin él: ' +
     (A.G.netNotice && A.G.netNotice.text));
  ok(A.G.rankingSent, 'lo suyo no va al top como marca del equipo');
  eq(B.G.netRole, 'host', 'el nuevo no se deja quitar el mando');
  ok(!B.G.netNotice && !C.G.netNotice, 'ni se corta nada');
  red.paso(CFG(A).NET.PELLET_SYNC_EVERY * CFG(A).NET.SNAP_EVERY + 10);
  mismaPartida(B, C, 2);
});

caso('R6 · anfitrión que recarga la página: vuelve de invitado y el mando lo coge el siguiente', function () {
  var ms = montar(3), A = ms[0], B = ms[1], C = ms[2];
  blindar(ms);
  red.paso(60);
  var A2 = recargar(A);                     // la página muere sin avisar
  red.paso(5 * 60);
  ok(B.G.netStalled() && C.G.netStalled(), 'mientras, los invitados esperan');
  eq(volver(A2), null, 'vuelve');
  eq(B.G.netRole, 'host', 'el primero de la cola coge el mando (el anfitrión volvió sin su partida)');
  red.paso(2);
  eq(C.G.hostIdx, 1, 'el otro lo sabe');
  ok(!C.G.pacs[0].out && !B.G.pacs[0].out, 'y nadie da por ido al que vuelve');
  eq(A2.G.netRole, 'guest', 'el que volvió juega de invitado');
  eq(A2.G.localIdx, 0, 'en su asiento');
  eq(A2.G.hostIdx, 1, 'sabiendo quién manda');
  red.paso(CFG(B).NET.PELLET_SYNC_EVERY * CFG(B).NET.SNAP_EVERY + 10);
  mismaPartida(B, A2, 0);
  mismaPartida(B, C, 2);
  ok(!A2.G.netStalled() && !C.G.netStalled(), 'y juegan todos');
});

caso('R7 · el anfitrión cierra la pestaña: deja el mando guardándose el asiento, y vuelve', function () {
  var ms = montar(2), A = ms[0], B = ms[1];
  blindar(ms);
  red.paso(60);
  eq(A.w.PM.Guardado.alIrse(true), 'reservada', 'se reserva el asiento');
  A.caido = true;                           // y la página muere
  red.paso(3);
  eq(B.G.netRole, 'host', 'el mando pasa al instante, sin esperar el plazo');
  ok(B.G.esperando(0) && !B.G.pacs[0].out, 'y al que se fue se le espera');
  var A2 = recargar(A);
  red.paso(120);
  eq(volver(A2), null, 'vuelve');
  eq(A2.G.netRole, 'guest');
  ok(!B.G.esperando(0), 'ya no se le espera');
  red.paso(CFG(B).NET.PELLET_SYNC_EVERY * CFG(B).NET.SNAP_EVERY + 10);
  mismaPartida(B, A2, 0);
});

caso('R8 · CLASIFICATORIA de party recuperada: cuenta una vez para el rango de todos', function () {
  var ms = montar(2, { hab: true, clasif: true, roles: ['tanque', 'asesino'], sinEmpezar: true });
  var A = ms[0], B = ms[1];
  ms.forEach(function (m) { m.w.PM.Rango.conCuenta = function () { return true; }; });
  for (var t = 0; t < 900 && A.G.state !== 'PLAYING'; t++) red.paso(1);
  blindar(ms);
  red.paso(120);
  eq(B.w.PM.Rango.porQueNo(B.G), null, 'es una clasificatoria que cuenta');
  var antesA = A.w.PM.Rango.estado().jugadas, antesB = B.w.PM.Rango.estado().jugadas;
  B.w.PM.Guardado.alIrse(true);             // se le cierra la pestaña
  var B2 = recargar(B);
  B2.w.PM.Rango.conCuenta = function () { return true; };
  /* lo contado viaja con la cuenta: el mundo nuevo empieza con lo del viejo */
  B2.w.PM.Achievements.recordAll(B.w.PM.Achievements.stats());
  var antesB2 = B2.w.PM.Rango.estado().jugadas;
  eq(antesB2, antesB, 'cerrar no ha contado todavía');
  red.paso(120);
  eq(volver(B2), null, 'vuelve');
  ok(B2.G.clasif, 'y sigue siendo CLASIFICATORIA');
  eq(B2.w.PM.Rango.porQueNo(B2.G), null, 'que cuenta');
  red.paso(120);
  A.G.surrenderNow();                       // se acaba
  red.paso(10);
  B2.G.toMenu();
  A.G.toMenu();
  eq(A.w.PM.Rango.estado().jugadas, antesA + 1, 'al anfitrión le cuenta una');
  eq(B2.w.PM.Rango.estado().jugadas, antesB2 + 1, 'y al que volvió, una (no dos)');
  eq(B2.w.localStorage.getItem('pacman-topmundial-red-viva'), null, 'y ya no queda nada a lo que volver');
});

caso('R9 · salir de la party cortada en vez de volver: cuenta como jugada y los demás dejan de esperar', function () {
  var ms = montar(2, { hab: true, clasif: true, roles: ['tanque', 'asesino'] }), A = ms[0], B = ms[1];
  ms.forEach(function (m) { m.w.PM.Rango.conCuenta = function () { return true; }; });
  blindar(ms);
  red.paso(120);
  A.G.score = 2500;                         // lo que lleva el equipo (llega en la foto)
  red.paso(61);                             // y lo apunta el latido de cada segundo
  eq(B.G.score, 2500);
  var B2 = recargar(B);
  var Gd = B2.w.PM.Guardado;
  eq(Gd.alAbrir(), 'pendiente');
  var rec = Gd.paraVolver();
  ok(rec, 'se ofrece volver');
  var xp = B2.w.PM.Level.xp();
  Gd.salirDeRed(rec);
  ok(B2.w.PM.Level.xp() > xp, 'lo jugado da su experiencia');
  eq(B2.w.PM.Achievements.stats().partidas | 0, 1, 'y cuenta como una partida');
  eq(Gd.paraVolver(), null, 'ya no se ofrece');
  red.paso(3);
  ok(A.G.pacs[1].out && !A.G.esperando(1), 'el anfitrión deja de esperarle: se ha despedido');
});

caso('R10 · mirón sin red 20 s: sigue viendo al volver', function () {
  var ms = montar(2, { mirones: 1 }), A = ms[0], B = ms[1], S = ms[2];
  blindar(ms);
  S.sinRed = true;
  red.paso(20 * 60);
  ok(S.G.inGame() && !S.G.netNotice, 'no se le corta');
  eq(S.G.avisoRed().a, 'SIN CONEXIÓN');
  S.sinRed = false;
  red.paso(CFG(A).NET.PELLET_SYNC_EVERY * CFG(A).NET.SNAP_EVERY + 10);
  ok(!S.G.netStalled(), 'vuelve a ver la partida');
  mismaPartida(A, S, -1);
  ok(!A.G.esperando(1) && !B.G.netStalled(), 'y a los jugadores no les ha pasado nada');
});

/* =============================================================
 * M. MATRIZ: cada poder, lanzado por el anfitrión o por el invitado, deja
 * lo mismo — y lo mismo en las dos pantallas
 *
 * Para cada poder del catálogo se monta un dúo dos veces: una con el
 * lanzador de anfitrión y otra de invitado, con la misma escena (lanzador en
 * (8,5) mirando a la derecha, el compañero detrás, Blinky de frente a dos
 * casillas). Se compara la "huella" —qué efectos quedan encendidos, en el
 * lanzador, en el compañero y en la mesa— en tres cruces: en el anfitrión
 * según quién lo lanzó, y en cada lanzamiento, anfitrión contra invitado.
 * Lo que es cuestión de un tick (un efecto que se apaga justo al mirar) no
 * cuenta: una diferencia tiene que verse en dos momentos seguidos.
 * ============================================================= */
var RUIDO = {
  qEdad: 1, cruce: 1, ultTile: 1, mant: 1, mantT: 1, adir: 1, arecorre: 1, flashDir: 1,
  yunqueX: 1, yunqueY: 1, estelaRastro: 1, caceriaVistos: 1, corCd: 1, corPas: 1, guard: 1,
  quieto: 1,
  /* la credencial de la APISONADORA del invitado: solo existe en el
   * anfitrión, para creerle cuando dice que ha arrollado a alguien */
  arrollaRed: 1,
  /* quién dio el escudo: solo lo apunta quien reparte y paga (el anfitrión),
   * para los puntos por proteger */
  escudoDe: 1
};

/* Diferencias sabidas que no cambian la partida, con su porqué:
 * - lo que el invitado ve de los relojes de OTRO jugador que no viajan en la
 *   foto (solo encienden la casilla del HUD ajeno): shuriken, carroña,
 *   marca, gancho inverso y terremoto;
 * - la TELARAÑA: el invitado no recalcula la zona entre fotos, así que su
 *   estima del fantasma atrapado va un poco rápida hasta que llega la
 *   siguiente (la corrige cada foto). */
var SABIDO = {
  'anf-lanza · anfitrión/invitado': ['C.shuriken', 'C.carrona', 'C.marca', 'C.ganchoInv', 'C.terremoto', 'mesa.lento'],
  'inv-lanza · anfitrión/invitado': ['mesa.lento'],
  /* GANCHO INVERSO: el invitado se come al enganchado un tick más tarde (lo
   * decide él y el anfitrión lo confirma), y el parón de comer congela el
   * aturdido que el gancho le puso en ese tick. Se descongela igual. */
  'asesino/gancho_inverso · lo lance quien lo lance': ['mesa.aturdido']
};

function activo(v) {
  if (v == null || v === false) return 0;
  if (typeof v === 'number') return v > 0 ? 1 : 0;
  if (typeof v === 'boolean') return 1;
  if (Object.prototype.toString.call(v) === '[object Array]') {
    for (var i = 0; i < v.length; i++) if (activo(v[i])) return 1;
    return 0;
  }
  return 1;
}

/* Lo que ha dejado el poder en la máquina m, con el lanzador c y su
 * compañero t como 'C' y 'T' (así se comparan asientos distintos) */
function huella(m, c, t) {
  var H = m.H, G = m.G, o = {}, k;
  function quien(v) { return v === c ? 'C' : v === t ? 'T' : (v < 0 ? '-' : '?'); }
  var sc = H.st[c], stt = H.st[t];
  for (k in sc) if (sc.hasOwnProperty(k) && !RUIDO[k]) o['C.' + k] = activo(sc[k]);
  for (k in stt) if (stt.hasOwnProperty(k) && !RUIDO[k] && k !== 'cd') o['T.' + k] = activo(stt[k]);
  o['C.cadenaCon'] = quien(sc.cadenaCon);
  o['T.cadenaCon'] = quien(stt.cadenaCon);
  ['hielo', 'huye', 'aturdido', 'lento', 'ciego', 'dominado', 'quema', 'azulCatalogo', 'trasHielo'].forEach(function (n) {
    o['mesa.' + n] = H[n].map(activo).join('');
  });
  o['mesa.caceriaQuien'] = H.caceriaQuien.map(quien).join('');
  o['mesa.marcaGhost'] = H.marcaGhost.map(quien).join('');
  o['mesa.dominaQuien'] = H.dominaQuien.map(quien).join('');
  o['mesa.huyeQuien'] = H.huyeQuien.map(quien).join('');
  o['mesa.proyectiles'] = H.proyectilesCat.length > 0 ? 1 : 0;
  o['mesa.balas'] = H.balas.length > 0 ? 1 : 0;
  o['mesa.portalC'] = H.portales[c] ? 1 : 0;
  o['mesa.runaC'] = H.runas[c] ? 1 : 0;
  o['mesa.placaC'] = H.placas[c] ? 1 : 0;
  o['mesa.eclipse'] = activo(H.eclipseTicks);
  o['mesa.terremoto'] = activo(H.terremotoTicks);
  o['mesa.joyas'] = H.joyas.length ? 1 : 0;
  o['fantasmas'] = G.ghosts.map(function (g) { return g.mode.charAt(0) + (g.frightened ? 'F' : ''); }).join(',');
  o['T.vidas'] = G.pacs[t].lives;
  o['T.escudo'] = G.pacs[t].escudo ? 1 : 0;
  o['T.out'] = G.pacs[t].out ? 1 : 0;
  return o;
}

function difiere(a, b, sabido) {
  var out = [];
  for (var k in a) {
    if (a[k] === b[k] || (sabido && sabido.indexOf(k) >= 0)) continue;
    out.push(k + ' ' + a[k] + '/' + b[k]);
  }
  return out;
}

/* Un dúo con el lanzador en `quien` (0 anfitrión, 1 invitado): lanza la tecla
 * k y devuelve la huella en las dos máquinas, a los 20 y a los 26 ticks */
function lanzarEn(quien, rol, carga, k) {
  var otro = rol === 'soporte' ? 'tanque' : 'soporte';
  var ms = montar(2, { hab: true, roles: quien === 0 ? [rol, otro] : [otro, rol],
                       loadouts: quien === 0 ? [carga, null] : [null, carga] });
  blindar(ms);
  var t = 1 - quien, L = ms[quien], DR = CFG(L).DIR;
  ms.forEach(function (m) {
    var G = m.G, pc = G.pacs[quien], pt = G.pacs[t];
    pc.x = 8 * 8 + 4; pc.y = 5 * 8 + 4; pc.dir = DR.RIGHT; pc.nextDir = DR.RIGHT; pc.errX = pc.errY = 0;
    pt.x = 5 * 8 + 4; pt.y = 5 * 8 + 4; pt.dir = DR.RIGHT; pt.nextDir = DR.RIGHT; pt.errX = pt.errY = 0;
    pt.lives = 1;
    var g = G.ghosts[0];
    g.x = 10 * 8 + 4; g.y = 5 * 8 + 4; g.mode = 'normal'; g.dir = DR.LEFT; g.frightened = false;
  });
  red.paso(3);
  L.G.pacs[quien].dir = DR.RIGHT; L.G.pacs[quien].nextDir = DR.RIGHT;
  var salio = L.H.apretar(L.G, quien, k);   // con los que se mantienen: apretar y soltar
  L.H.soltar(L.G, quien, k);
  red.paso(20);
  var r = { salio: salio, anf: [huella(ms[0], quien, t)], inv: [huella(ms[1], quien, t)] };
  red.paso(6);
  r.anf.push(huella(ms[0], quien, t));
  r.inv.push(huella(ms[1], quien, t));
  return r;
}

/* Lo que difiere en los dos momentos a la vez */
function difiereSeguido(xs, ys, sabido) {
  var d0 = difiere(xs[0], ys[0], sabido), d1 = difiere(xs[1], ys[1], sabido);
  var k1 = d1.map(function (s) { return s.split(' ')[0]; });
  return d0.filter(function (s) { return k1.indexOf(s.split(' ')[0]) >= 0; });
}

caso('M · matriz: cada poder deja lo mismo lo lance quien lo lance, en las dos pantallas', function () {
  var CAT = CFG(mundo(0)).HAB.CATALOGO, malos = [], sinSalir = [];
  ['asesino', 'tanque', 'soporte', 'mago'].forEach(function (rol) {
    CAT[rol].forEach(function (fila, k) {
      fila.forEach(function (h) {
        var carga = CAT[rol].map(function (f, kk) { return kk === k ? h.id : f[0].id; }).join(',');
        var a = lanzarEn(0, rol, carga, k), b = lanzarEn(1, rol, carga, k);
        var nombre = rol + '/' + h.id;
        if (a.salio !== b.salio) malos.push(nombre + ': sale de anfitrión ' + a.salio + ', de invitado ' + b.salio);
        if (!a.salio && !b.salio) { sinSalir.push(nombre); return; }
        var d1 = difiereSeguido(a.anf, b.anf, SABIDO[nombre + ' · lo lance quien lo lance']);
        var d2 = difiereSeguido(b.anf, b.inv, SABIDO['inv-lanza · anfitrión/invitado']);
        var d3 = difiereSeguido(a.anf, a.inv, SABIDO['anf-lanza · anfitrión/invitado']);
        if (d1.length) malos.push(nombre + ' · en el anfitrión, lo lance él / el invitado: ' + d1.join('; '));
        if (d2.length) malos.push(nombre + ' · lo lanza el invitado, anfitrión / invitado: ' + d2.join('; '));
        if (d3.length) malos.push(nombre + ' · lo lanza el anfitrión, anfitrión / invitado: ' + d3.join('; '));
      });
    });
  });
  /* PUENTE pide muro delante y HOSPITAL (desde el 4 oct) un compañero caído:
   * en esta escena no salen, y está bien que no salgan. RESURRECCIÓN sí sale
   * desde el 9 oct: sin nadie fuera se guarda como seguro. */
  eq(sinSalir.join(','), 'soporte/puente,soporte/hospital', 'los que no salen en esta escena');
  if (malos.length) throw new Error('\n      ' + malos.join('\n      '));
});

/* =============================================================
 * HIPERPASTILLA (9 oct): la pisa un invitado, decide el anfitrión
 * ============================================================= */
caso('H · HIPERPASTILLA: el invitado la pisa, el anfitrión se la da y su TURBO sale a x2 en las dos pantallas', function () {
  var ms = duoHab('asesino'), A = ms[0], B = ms[1], HC = CFG(A).HAB;
  /* puesta a mano en el anfitrión: sola sale del nivel 15 en adelante */
  A.H.hiperP = { c: 6, r: 5, en: 0, on: 1, fin: 0 };
  red.paso(12);
  ok(B.H.hiperP && B.H.hiperP.on, 'al invitado le llega en la foto');
  ms.forEach(function (m) {
    var p = m.G.pacs[1];
    p.x = 6 * 8 + 4; p.y = 5 * 8 + 4; p.errX = 0; p.errY = 0; p.pauseTicks = 40;
  });
  B.enviados = [];
  red.paso(12);
  ok(mensajes(B, 'gevt', 'hiperCome').length >= 1, 'el invitado la pide');
  ok(A.H.st[1].hiper, 'el anfitrión se la da');
  ok(B.H.st[1].hiper, 'y el invitado se entera');
  ok(!A.H.hiperP.on && !B.H.hiperP.on, 'la pastilla desaparece en las dos pantallas');
  ok(!A.H.st[0].hiper && !B.H.st[0].hiper, 'el otro no la lleva');
  ok(B.H.pulsar(B.G, 1, 1), 'lanza su TURBO');
  eq(B.H.st[1].turbo, HC.TURBO_TICKS * HC.HIPER.MULT, 'a x2 en su pantalla');
  ok(!B.H.st[1].hiper, 'y la gasta');
  red.paso(10);
  ok(!A.H.st[1].hiper, 'el anfitrión también la da por gastada');
  ok(A.H.st[1].turbo > HC.TURBO_TICKS, 'y allí su turbo también dura el doble');
  red.paso(40);
  ok(!B.H.st[1].hiper, 'una foto atrasada no se la devuelve');
  /* y un poder que ejecuta el anfitrión: el GRITO de un invitado potenciado */
  A.H.st[1].hiper = 1; B.H.st[1].hiper = 1;
  ok(B.H.pulsar(B.G, 1, 3), 'grita con otra encima');
  red.paso(10);
  ok(A.G.frightTicks > HC.SHOUT_SECS * 60, 'el azul que reparte el anfitrión dura el doble');
  ok(!A.H.st[1].hiper && !B.H.st[1].hiper, 'gastada en las dos');
});

/* =============================================================
 * S. SUPERVIVENCIA con poderes, corazones y tablero ancho (10 oct)
 * ============================================================= */
/* Una party de SUPERVIVENCIA en marcha: los fantasmas a casa (que ninguno se
 * cuele en la prueba) y nadie con rato de gracia. */
function supervParty(roles, cargas, mirones) {
  var ms = montar(roles.length, { superv: true, roles: roles, loadouts: cargas || null, mirones: mirones || 0 });
  ms.forEach(function (m) {
    for (var g = 0; g < 4; g++) {
      var gh = m.G.ghosts[g];
      gh.mode = 'house'; gh.x = CFG(m).HOUSE.exitX; gh.y = CFG(m).HOUSE.centerY;
    }
    m.G.pacs.forEach(function (p) { p.safeTicks = 0; });
  });
  /* que en estas pruebas ningún fantasma salga de casa por su cuenta */
  ms[0].G.failsafeTicks = -1e9;
  ms[0].G.globalActive = true; ms[0].G.globalCounter = -1e9;
  return ms;
}

/* Deja al jugador i quieto en esa casilla en todas las máquinas */
function pon(ms, i, col, fila, dir) {
  ms.forEach(function (m) {
    var p = m.G.pacs[i];
    p.x = col * 8 + 4; p.y = fila * 8 + 4; p.errX = 0; p.errY = 0; p.pauseTicks = 240;
    if (dir !== undefined) { p.dir = dir; p.nextDir = dir; }
  });
}

function corazones(m) { return m.G.pacs.map(function (p) { return p.lives; }).join(); }

caso('S1 · SUPERVIVENCIA: las dos máquinas juegan en el tablero ancho, con poderes y tres corazones', function () {
  var ms = supervParty(['mago', 'asesino'], null, 1), A = ms[0], B = ms[1], M = ms[2];
  ms.forEach(function (m) {
    eq(CFG(m).COLS, 56, 'el tablero ancho en la máquina ' + m.k);
    ok(m.G.superv && m.G.hab && m.H.sv, 'supervivencia con poderes en la ' + m.k);
    eq(corazones(m), '3,3', 'tres corazones cada uno en la ' + m.k);
  });
  /* quietos, para que nadie coma mientras se compara */
  pon(ms, 0, 6, 23, 3); pon(ms, 1, 49, 5, 1);
  red.paso(60);
  eq(B.G.pelletHex(), A.G.pelletHex(), 'el mismo mapa de pastillas (el del ancho)');
  eq(M.G.pelletHex(), A.G.pelletHex(), 'también el del mirón');
  eq(A.G.pelletHex().length, Math.ceil(56 * 31 / 4), 'que mide lo que el tablero');
  eq(B.G.state, A.G.state, 'y el mismo estado');
});

caso('S2 · SUPERVIVENCIA: la bola del anfitrión le quita UN corazón al invitado, en todas las pantallas', function () {
  var ms = supervParty(['mago', 'asesino'], null, 1), A = ms[0], B = ms[1], M = ms[2];
  pon(ms, 0, 6, 5, 3); pon(ms, 1, 11, 5, 1);
  red.paso(3);
  B.enviados = []; A.enviados = [];
  ok(A.H.pulsar(A.G, 0, 0), 'el anfitrión lanza la BOLA DE FUEGO');
  red.paso(60);
  ok(mensajes(A, 'evt', 'svGolpe').length >= 1, 'el anfitrión se lo anuncia');
  eq(mensajes(B, 'gevt', 'svDano').length, 1, 'el invitado lo acepta una vez');
  eq(corazones(A), '3,2', 'un corazón menos en el anfitrión');
  eq(corazones(B), '3,2', 'en el invitado');
  eq(corazones(M), '3,2', 'y en el mirón');
  ok(!A.G.pacs[1].dying && !B.G.pacs[1].dying, 'sin morir');
  ok(B.G.pacs[1].safeTicks > 0, 'y con su rato de gracia');
  eq(A.G.state, 'PLAYING', 'la partida sigue');
});

caso('S3 · SUPERVIVENCIA: la bola del invitado le quita un corazón al anfitrión', function () {
  var ms = supervParty(['asesino', 'mago']), A = ms[0], B = ms[1];
  pon(ms, 0, 11, 5, 1); pon(ms, 1, 6, 5, 3);
  red.paso(3);
  ok(B.H.pulsar(B.G, 1, 0), 'el invitado lanza la BOLA DE FUEGO');
  red.paso(60);
  eq(corazones(A), '2,3', 'en el anfitrión');
  eq(corazones(B), '2,3', 'y en el invitado');
});

caso('S4 · SUPERVIVENCIA: la coraza del Tanque invitado para el golpe en SU máquina', function () {
  var ms = supervParty(['mago', 'tanque']), A = ms[0], B = ms[1];
  ok(B.H.corazaDe(B.G, 1), 'el invitado lleva su coraza');
  pon(ms, 0, 6, 5, 3); pon(ms, 1, 11, 5, 1);
  red.paso(3);
  B.enviados = [];
  ok(A.H.pulsar(A.G, 0, 0), 'el anfitrión le tira la bola');
  red.paso(60);
  eq(corazones(A), '3,3', 'no pierde el corazón');
  eq(mensajes(B, 'gevt', 'svDano').length, 0, 'ni lo acepta');
  eq(mensajes(B, 'gevt', 'habRoto').length, 1, 'avisa de que se le ha roto la coraza');
  ok(!B.H.corazaDe(B.G, 1) && !A.H.corazaDe(A.G, 1), 'y la pierde en las dos pantallas');
});

caso('S5 · SUPERVIVENCIA: el hielo del anfitrión clava al invitado en su propia pantalla', function () {
  var ms = supervParty(['soporte', 'asesino']), A = ms[0], B = ms[1];
  pon(ms, 0, 6, 5, 3); pon(ms, 1, 11, 5, 1);
  red.paso(3);
  ok(A.H.pulsar(A.G, 0, 0), 'el anfitrión dispara su HIELO');
  red.paso(30);
  ok(A.H.hielo[5] > 0, 'el invitado queda congelado en el anfitrión');
  ok(B.H.hielo[5] > 0, 'y le llega en la foto');
  eq(B.H.multVel(1), 0, 'en su máquina no se mueve');
  ok(!B.H.puede(B.G, 1, 1), 'ni puede lanzar nada');
  eq(corazones(A), '3,3', 'sin perder corazones');
  var x0 = B.G.pacs[1].x;
  B.G.pacs[1].pauseTicks = 0;
  red.paso(40);
  eq(B.G.pacs[1].x, x0, 'y sigue en el sitio');
});

caso('S6 · SUPERVIVENCIA: un fantasma toca al invitado: un corazón, lo descuenta el anfitrión', function () {
  var ms = supervParty(['asesino', 'mago']), A = ms[0], B = ms[1];
  pon(ms, 0, 40, 29, 1);
  juntar(ms, 1, 0);
  B.enviados = [];
  red.paso(20);
  eq(mensajes(B, 'gevt', 'svDano').length, 1, 'el invitado lo avisa una vez');
  eq(mensajes(B, 'gevt', 'died').length, 0, 'y no dice que ha muerto');
  eq(corazones(A), '3,2', 'un corazón menos en el anfitrión');
  eq(corazones(B), '3,2', 'y en el invitado');
  ok(!B.G.pacs[1].dying && B.G.state === 'PLAYING', 'sigue jugando');
  var p = B.G.pacs[1];
  /* sigue andando por su pasillo: lo que no hace es volver a su salida (la 49,5) */
  ok(Math.abs(p.x - (6 * 8 + 4)) <= 40 && Math.abs(p.y - (5 * 8 + 4)) <= 12, 'por donde iba, sin reaparecer (' + p.x + ',' + p.y + ')');
  ok(Math.abs(A.G.pacs[1].x - p.x) <= 8, 'y el anfitrión lo ve en el mismo sitio');
});

caso('S7 · SUPERVIVENCIA: con el último corazón cae, gana el otro y lo ven los dos', function () {
  var ms = supervParty(['mago', 'asesino']), A = ms[0], B = ms[1];
  ms.forEach(function (m) { m.G.pacs[1].lives = 1; });
  pon(ms, 0, 6, 5, 3); pon(ms, 1, 11, 5, 1);
  red.paso(3);
  ok(A.H.pulsar(A.G, 0, 0), 'la bola');
  for (var t = 0; t < 600 && A.G.state === 'PLAYING'; t++) { A.G.pacs[0].safeTicks = 999; red.paso(1); }
  eq(A.G.state, 'GAME_OVER', 'se acaba en el anfitrión');
  red.paso(20);
  eq(B.G.state, 'GAME_OVER', 'y en el invitado');
  eq(A.G.superv.ganador, 0, 'gana el que queda');
  eq(B.G.superv.ganador, 0, 'también en la pantalla del invitado');
  eq(A.G.superv.bajas[0], 1, 'con su baja apuntada');
});

caso('S8 · SUPERVIVENCIA: el GANCHO del anfitrión trae al invitado, que es quien manda en su posición', function () {
  var ms = supervParty(['soporte', 'asesino'], ['gancho,inmunidad,aliado,vida', null]), A = ms[0], B = ms[1];
  pon(ms, 0, 6, 5, 3); pon(ms, 1, 11, 5, 1);
  red.paso(3);
  ok(A.H.pulsar(A.G, 0, 0), 'el anfitrión lanza el GANCHO');
  var cerca = false;
  for (var t = 0; t < 240 && !cerca; t++) {
    A.G.pacs[0].pauseTicks = 60;
    red.paso(1);
    cerca = Math.abs(B.G.pacs[1].x - B.G.pacs[0].x) <= 12;
  }
  ok(cerca, 'el invitado acaba junto al anfitrión EN SU PANTALLA (' + B.G.pacs[1].x + ')');
  ok(Math.abs(A.G.pacs[1].x - B.G.pacs[1].x) <= 12, 'y las dos máquinas lo ven en el mismo sitio');
});

/* ---------- la ejecución ---------- */
function CFG(m) { return m.w.PM.CFG; }

var fallos = 0, filtro = process.argv[2] || '';
casos.forEach(function (c) {
  if (filtro && c.nombre.indexOf(filtro) !== 0) return;
  actual = c;
  try {
    c.fn();
    console.log('  bien  ' + c.nombre);
  } catch (e) {
    fallos++;
    console.log('  MAL   ' + c.nombre + '  ->  ' + (e && e.message));
    if (process.env.TRAZA) console.log(e && e.stack);
  }
});
red.vaciar();
console.log('\n' + (fallos ? 'FALLAN ' + fallos : 'TODO BIEN') + '  ·  ' +
            casos.filter(function (c) { return !filtro || c.nombre.indexOf(filtro) === 0; }).length + ' casos');
process.exit(fallos ? 1 : 0);
