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
  var m = { k: k, w: w, G: w.PM.Game, Net: w.PM.Net, H: w.PM.Hab, J: w.PM.Jefe,
            sid: 'sid' + k, caido: false, enviados: [] };
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

  /* Cada mundo habla por un transporte de mentira. Un mirón habla por su
   * canal de mirón (viewCh), como en el juego. */
  enchufar: function (m, miron) {
    m.caido = false;
    m.enviados = [];
    m.Net.peers = [];
    m.Net.ultimoQ = {};
    m.Net.seq = 0;
    m.Net.transport = {
      send: function (name, wrap) { red.poner(m, name, wrap); },
      close: function () {}
    };
    m.Net.viewCh = miron ? {
      send: function (name, d) { red.poner(m, name, { s: m.sid, d: d }); },
      sondear: function () {},
      close: function () {}
    } : null;
    if (this.mundos.indexOf(m) < 0) this.mundos.push(m);
  },

  poner: function (m, name, wrap) {
    if (m.caido) return;               // se le cayó la red: no sale nada
    var copia = JSON.parse(JSON.stringify(wrap));
    m.enviados.push([name, copia.d]);
    this.cola.push({ de: m, name: name, wrap: copia });
  },

  entregar: function () {
    while (this.cola.length) {
      var msg = this.cola.shift();
      for (var i = 0; i < this.mundos.length; i++) {
        var m = this.mundos[i];
        if (m === msg.de || m.caido) continue;
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
 * o: { hab, roles, loadouts, mirones, sinEmpezar } */
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
      cfg: cfg, hab: !!o.hab, roles: o.roles || null, loadouts: o.loadouts || null
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

caso('1c · azul pero marcado por OTRO: al invitado lo mata, igual que al anfitrión', function () {
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
  eq(mensajes(B, 'gevt', 'ateGhost').length, 0, 'no se lo come');
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

caso('1e · el anfitrión no deja comerse al marcado por otro', function () {
  var ms = duoHab(), A = ms[0], B = ms[1];
  A.G.frightTicks = 400;
  A.G.ghosts[0].frightened = true;
  marcar(A, 0, 0);
  red.paso(10);
  B.G.netSend('gevt', { t: 'ateGhost', g: 0 });
  red.paso(2);
  ok(A.G.ghosts[0].mode !== 'eyes', 'sigue vivo');
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
caso('3a · dúo: si el compañero se cae, el anfitrión sale sin traspasar y sube su puntuación', function () {
  var ms = montar(2), A = ms[0], B = ms[1];
  blindar(ms);
  B.caido = true;                           // se le va la red sin despedirse
  A.enviados = [];
  for (var t = 0; t < 1200 && A.G.inGame(); t++) red.paso(1);
  ok(!A.G.inGame(), 'el anfitrión acaba volviendo al menú');
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
caso('4a · trío: si el anfitrión se cae sin despedirse, los invitados se enteran', function () {
  var ms = montar(3), A = ms[0], B = ms[1], C = ms[2];
  blindar(ms);
  A.caido = true;
  red.paso(CFG(B).NET.DROP_TICKS + 30);
  ok(B.G.netNotice || !B.G.inGame(), 'el 1 recibe el aviso');
  ok(C.G.netNotice || !C.G.inGame(), 'el 2 también');
});

caso('4b · dúo con mirón: el latido del mirón no tapa la caída del anfitrión', function () {
  var ms = montar(2, { mirones: 1 }), A = ms[0], B = ms[1], S = ms[2];
  blindar(ms);
  A.caido = true;
  for (var t = 0; t < CFG(B).NET.DROP_TICKS + 30; t++) {
    if (t % 60 === 0) S.Net.gameSend('hello', { v: CFG(S).NET.PROTO, spec: 1, hb: 1 });
    red.paso(1);
  }
  ok(B.G.netNotice || !B.G.inGame(), 'el invitado recibe el aviso');
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

caso('7d · un invitado que se inventa el golpe no cobra', function () {
  var ms = tanqueInvitado(), A = ms[0], B = ms[1];
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
  /* PUENTE pide muro delante y RESURRECCIÓN un compañero caído: en esta
   * escena no salen, y está bien que no salgan */
  eq(sinSalir.join(','), 'soporte/puente,soporte/resurreccion', 'los que no salen en esta escena');
  if (malos.length) throw new Error('\n      ' + malos.join('\n      '));
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
