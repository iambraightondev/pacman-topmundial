/* ============================================================
 * PAC-MAN TOP MUNDIAL — pruebas-red.js
 *
 * Parties de verdad sin navegador:
 *
 *   node pruebas-red.js
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
  A.H.caceriaQuien[0] = 0;                 // es del anfitrión
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
  A.H.caceriaQuien[0] = 1;
  red.paso(10);
  A.G.pacs[1].safeTicks = 0;
  B.G.netSend('gevt', { t: 'died', g: 0 });   // un invitado de antes, o una foto que llegó tarde
  red.paso(2);
  ok(!A.G.pacs[1].dying, 'no lo mata');
  /* ...pero un fantasma normal sí mata */
  A.H.caceriaQuien[0] = -1;
  A.G.ghosts[0].frightened = false;
  B.G.netSend('gevt', { t: 'died', g: 0 });
  red.paso(2);
  ok(A.G.pacs[1].dying, 'con uno normal, sí');
});

caso('1e · el anfitrión no deja comerse al marcado por otro', function () {
  var ms = duoHab(), A = ms[0], B = ms[1];
  A.G.frightTicks = 400;
  A.G.ghosts[0].frightened = true;
  A.H.caceriaQuien[0] = 0;
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
