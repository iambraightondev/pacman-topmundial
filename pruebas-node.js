/* ============================================================
 * PAC-MAN TOP MUNDIAL — pruebas-node.js
 *
 * Corre las MISMAS pruebas de tests.html sin navegador:
 *
 *   node pruebas-node.js
 *
 * Monta un DOM de mentira (lo justo: elementos, clases, estilos,
 * localStorage y un lienzo que no pinta nada), carga los módulos
 * del juego en el mismo orden que index.html y ejecuta js/tests.js.
 * Antes pasa unos guardianes que miran los ficheros (funciones repetidas,
 * listas de módulos que no coinciden: ver más abajo).
 * Sale con 0 si todo pasa y con 1 si falla algo, así vale para CI.
 *
 * No sustituye a abrir tests.html: aquí no se ve nada dibujado.
 * Sirve para la lógica, que es donde se rompen las cosas.
 * ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var raiz = __dirname;

/* ---------- lienzo de mentira ---------- */
function fakeCtx() {
  var ctx = {
    canvas: null,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '',
    textAlign: 'left', textBaseline: 'top', globalAlpha: 1,
    lineJoin: 'miter', lineCap: 'butt', shadowColor: '', shadowBlur: 0,
    imageSmoothingEnabled: false
  };
  var nada = ['save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo',
    'arc', 'arcTo', 'rect', 'fill', 'stroke', 'clip', 'fillRect', 'strokeRect',
    'clearRect', 'translate', 'scale', 'rotate', 'setTransform', 'transform',
    'drawImage', 'fillText', 'strokeText', 'quadraticCurveTo', 'bezierCurveTo',
    'ellipse', 'setLineDash', 'createLinearGradient', 'createRadialGradient',
    'addColorStop'];
  nada.forEach(function (m) { ctx[m] = function () { return ctx; }; });
  /* El ancho crece con el cuerpo de la letra, como en el navegador: cada
   * carácter ocupa 0,6 veces los px del `font` (lo de una monoespaciada). Sin
   * tamaño en el `font`, 5 px por carácter. Antes eran 5 px siempre, así que
   * encoger la letra no hacía caber nada y la prueba del nombre largo fallaba
   * aquí sin fallar en tests.html. */
  ctx.measureText = function (t) {
    var m = /(\d+(?:\.\d+)?)px/.exec(String(ctx.font || ''));
    return { width: String(t).length * (m ? parseFloat(m[1]) * 0.6 : 5) };
  };
  ctx.getImageData = function () { return { data: [] }; };
  return ctx;
}

/* ---------- elemento de mentira ---------- */
function El(tag) {
  this.tagName = String(tag || 'div').toUpperCase();
  this.children = [];
  this.childNodes = this.children;
  /* El estilo es un objeto pelado, pero con los dos métodos que el juego usa
   * de verdad: las variables de CSS (`--habH`, que le dice al escenario cuánto
   * ocupa la barra de poderes) van por setProperty, no por asignación. */
  this.style = {
    setProperty: function (k, v) { this[k] = v; },
    getPropertyValue: function (k) { return this[k] || ''; },
    removeProperty: function (k) { delete this[k]; }
  };
  this.dataset = {};
  this._attrs = {};
  this._events = {};
  this._text = '';
  this.value = '';
  this.className = '';
  this.disabled = false;
  this.parentNode = null;
  this.offsetParent = null;
  this.width = 300;
  this.height = 150;
  this.clientWidth = 800;
  this.clientHeight = 600;
  var self = this;
  this.classList = {
    add: function () {
      for (var i = 0; i < arguments.length; i++) {
        if (!self._has(arguments[i])) {
          self.className = (self.className + ' ' + arguments[i]).trim();
        }
      }
    },
    remove: function () {
      for (var i = 0; i < arguments.length; i++) {
        var c = arguments[i];
        self.className = self.className.split(/\s+/)
          .filter(function (x) { return x && x !== c; }).join(' ');
      }
    },
    toggle: function (c, on) {
      var quiere = (arguments.length > 1) ? !!on : !self._has(c);
      if (quiere) this.add(c); else this.remove(c);
      return quiere;
    },
    contains: function (c) { return self._has(c); }
  };
}

El.prototype._has = function (c) {
  return this.className.split(/\s+/).indexOf(c) !== -1;
};

/* textContent crea un nodo de texto de verdad: el juego lo usa para
 * reescribir la etiqueta de un botón sin tocar sus hijos
 * (this.onlineMenuBtn.childNodes[0].nodeValue = ...). */
function TextNode(v) {
  this.nodeType = 3;
  this.nodeValue = String(v);
  this.children = [];
  this.className = '';
}
TextNode.prototype._has = function () { return false; };

Object.defineProperty(El.prototype, 'textContent', {
  /* como en el navegador: el texto de todos los hijos, en orden (antes solo
   * el primero, y "tal cosa" dentro de una fila con varios trozos no salía) */
  get: function () {
    if (!this.children.length) return this._text;
    var out = '';
    for (var i = 0; i < this.children.length; i++) {
      var k = this.children[i];
      out += k.nodeType === 3 ? k.nodeValue : (k.textContent || '');
    }
    return out;
  },
  set: function (v) {
    this._text = String(v == null ? '' : v);
    this.children.length = 0;
    if (this._text !== '') this.children.push(new TextNode(this._text));
  }
});

Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return ''; },
  set: function () { this.children.length = 0; this._text = ''; }
});

El.prototype.appendChild = function (kid) {
  kid.parentNode = this;
  this.children.push(kid);
  return kid;
};
El.prototype.removeChild = function (kid) {
  var i = this.children.indexOf(kid);
  if (i !== -1) this.children.splice(i, 1);
  return kid;
};
El.prototype.insertBefore = function (kid) { return this.appendChild(kid); };
El.prototype.setAttribute = function (k, v) { this._attrs[k] = String(v); };
El.prototype.getAttribute = function (k) {
  return this._attrs.hasOwnProperty(k) ? this._attrs[k] : null;
};
El.prototype.removeAttribute = function (k) { delete this._attrs[k]; };
El.prototype.addEventListener = function (t, fn) {
  (this._events[t] = this._events[t] || []).push(fn);
};
El.prototype.removeEventListener = function () {};
El.prototype.dispatch = function (t, ev) {
  var list = this._events[t] || [];
  for (var i = 0; i < list.length; i++) list[i].call(this, ev || {});
};
El.prototype.click = function () { this.dispatch('click', { preventDefault: function () {}, stopPropagation: function () {} }); };
El.prototype.focus = function () { doc.activeElement = this; };
El.prototype.blur = function () { if (doc.activeElement === this) doc.activeElement = null; };
El.prototype.scrollIntoView = function () {};
El.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, width: this.width, height: this.height,
           right: this.width, bottom: this.height };
};
El.prototype.getContext = function () {
  if (!this._ctx) { this._ctx = fakeCtx(); this._ctx.canvas = this; }
  return this._ctx;
};
/* Selectores sencillos: etiqueta y clases juntas (div.a.b), :not(.x) y
 * descendientes separados por espacios (.a .b). Lo demás (atributos, otras
 * pseudoclases) se ignora. Antes solo miraba la primera clase y las
 * pruebas con ".lista .fila" o ":not(.cabecera)" fallaban aquí y no en el
 * navegador. */
function casaSimple(k, s) {
  var nots = [];
  s = s.replace(/:not\(([^)]*)\)/g, function (m, x) { nots.push(x.trim()); return ''; });
  s = s.replace(/\[[^\]]*\]/g, '').replace(/::?[a-z-]+(\([^)]*\))?/gi, '');
  var m = /^([a-z0-9*-]*)((?:\.[\w-]+)*)$/i.exec(s);
  if (!m) return false;
  if (m[1] && m[1] !== '*' && k.tagName !== m[1].toUpperCase()) return false;
  var cls = m[2] ? m[2].slice(1).split('.') : [];
  for (var i = 0; i < cls.length; i++) if (!k._has || !k._has(cls[i])) return false;
  for (var j = 0; j < nots.length; j++) if (casaSimple(k, nots[j])) return false;
  return true;
}
function casaSelector(k, sel) {
  var pasos = sel.trim().split(/\s*>\s*|\s+/);   // el hijo directo, como descendiente
  if (!casaSimple(k, pasos[pasos.length - 1])) return false;
  var n = k.parentNode;
  for (var i = pasos.length - 2; i >= 0; i--) {
    while (n && !(n.tagName && casaSimple(n, pasos[i]))) n = n.parentNode;
    if (!n) return false;
    n = n.parentNode;
  }
  return true;
}
El.prototype.querySelectorAll = function (sel) {
  var out = [];
  var partes = String(sel).split(',').map(function (x) { return x.trim(); });
  (function anda(n) {
    for (var i = 0; i < n.children.length; i++) {
      var k = n.children[i];
      for (var j = 0; j < partes.length; j++) {
        if (casaSelector(k, partes[j])) { out.push(k); break; }
      }
      anda(k);
    }
  })(this);
  return out;
};
El.prototype.querySelector = function (sel) {
  var l = this.querySelectorAll(sel);
  return l.length ? l[0] : null;
};
El.prototype.contains = function (n) {
  while (n) { if (n === this) return true; n = n.parentNode; }
  return false;
};

/* ---------- documento ---------- */
var porId = {};
var doc = {
  readyState: 'complete',
  activeElement: null,
  createElement: function (tag) { return new El(tag); },
  /* los dibujos del juego (el candado del PASE, la ronda de los botones) son
   * SVG: sin esto, el panel del pase ni se construye aquí */
  createElementNS: function (ns, tag) { return new El(tag); },
  // un nodo de texto de mentira: basta con que se pueda colgar y lleve su texto
  createTextNode: function (txt) { var n = new El('#text'); n.textContent = String(txt); return n; },
  getElementById: function (id) { return porId[id] || null; },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  addEventListener: function () {},
  removeEventListener: function () {}
};
doc.body = new El('body');
doc.documentElement = new El('html');
['stage', 'game', 'menu', 'options', 'online', 'badges', 'maestrias', 'rango', 'ranking',
 'mazes', 'friends', 'profile', 'daily', 'mate', 'vestuario', 'tienda', 'cofres', 'pasos', 'pase', 'prompt'].forEach(function (id) {
  var el = new El(id === 'game' ? 'canvas' : 'div');
  el.id = id;
  porId[id] = el;
  doc.body.appendChild(el);
});

/* ---------- almacenamiento ---------- */
var store = {};
var localStorage = {
  getItem: function (k) { return store.hasOwnProperty(k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; },
  clear: function () { store = {}; }
};

/* ---------- ventana ---------- */
var win = {
  document: doc,
  localStorage: localStorage,
  location: { search: '', href: 'http://localhost/', protocol: 'http:' },
  navigator: { maxTouchPoints: 0, userAgent: 'node' },
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
  addEventListener: function () {},
  removeEventListener: function () {},
  matchMedia: function () { return { matches: false, addListener: function () {} }; },
  /* nada de bucle de animación: las pruebas llaman a Game.step() a mano */
  requestAnimationFrame: function () { return 0; },
  cancelAnimationFrame: function () {},
  setTimeout: function () { return 0; },
  clearTimeout: function () {},
  setInterval: function () { return 0; },
  clearInterval: function () {},
  /* fetch que existe pero nunca sale a la red: así el ranking y las cuentas
   * se dan por "configurados" y se recorren sus caminos, pero ninguna prueba
   * toca Supabase de verdad. */
  fetch: function () { return Promise.reject(new Error('SIN RED EN LAS PRUEBAS')); },
  BroadcastChannel: undefined,
  WebSocket: undefined,
  /* caminos guardados de las skins extravagantes (cabeza y mandíbula juntas):
   * aquí no se rasteriza, así que basta con que existan sus métodos */
  Path2D: function () {
    var p = this;
    ['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'closePath', 'arc',
     'ellipse', 'rect', 'addPath'].forEach(function (m) { p[m] = function () {}; });
  }
};
/* aviso para las pruebas que miden píxeles: aquí no se rasteriza nada */
win.__SIN_LIENZO = true;
win.window = win;
win.self = win;
win.globalThis = win;

var sandbox = win;
sandbox.console = console;
sandbox.performance = { now: function () { return Date.now(); } };
sandbox.Math = Math;
sandbox.JSON = JSON;
sandbox.Date = Date;
sandbox.parseInt = parseInt;
sandbox.parseFloat = parseFloat;
sandbox.isFinite = isFinite;
sandbox.isNaN = isNaN;
sandbox.Promise = Promise;
sandbox.Error = Error;
sandbox.Object = Object;
sandbox.Array = Array;
sandbox.String = String;
sandbox.Number = Number;
sandbox.Boolean = Boolean;
sandbox.RegExp = RegExp;
sandbox.encodeURIComponent = encodeURIComponent;
sandbox.decodeURIComponent = decodeURIComponent;

vm.createContext(sandbox);

/* ---------- carga de los módulos, en el orden de index.html ---------- */
var orden = ['config', 'letra', 'audio', 'sprites', 'skins', 'insignias', 'emblemas', 'trofeos', 'portadas', 'iconos', 'pacman', 'ghost', 'net-config',
  'net-directo', 'net', 'party', 'badges', 'history', 'level', 'friends', 'conectados', 'ranking',
  'temporadas', 'daily', 'mazes', 'achievements', 'maestria', 'celebrar', 'rango', 'stats', 'tienda', 'cofres-gen', 'cofres', 'pasos', 'pase', 'ficha', 'account', 'retos', 'versus',
  'habilidades', 'jefe', 'supervivencia', 'caceria', 'game', 'replay', 'clip', 'guardado', 'ui'];

orden.forEach(function (nombre) {
  var f = path.join(raiz, 'js', nombre + '.js');
  var code = fs.readFileSync(f, 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: 'js/' + nombre + '.js' });
  } catch (e) {
    console.error('FALLO CARGANDO js/' + nombre + '.js');
    console.error(e && e.stack ? e.stack : e);
    process.exit(1);
  }
});

/* ---------- guardianes del código ----------
 * Lo que tests.js no puede ver porque mira el juego ya cargado, no sus
 * ficheros. Cada uno que falla cuenta como una prueba mal. */
var guardianes = [];
function guardian(nombre, fn) {
  var malos = [];
  try { fn(malos); } catch (e) { malos.push(String(e && e.message || e)); }
  guardianes.push({ nombre: nombre, ok: !malos.length, error: malos.join('; ') });
}

/* (a) Dos funciones con el mismo nombre en el primer nivel de un mismo
 * fichero: gana la de abajo sin avisar y la de arriba queda muerta (así
 * sobrevivieron un caraEmote y un rastro del escaparate del 18 sep). Cada
 * fichero de js/ es un (function () { ... })() con su cuerpo a dos
 * espacios, así que "primer nivel" es `  function nombre(` en su IIFE. */
guardian('ninguna función se declara dos veces en el primer nivel de su fichero', function (malos) {
  fs.readdirSync(path.join(raiz, 'js')).filter(function (f) { return /\.js$/.test(f); })
    .forEach(function (f) {
      var vistas = {}, iife = 0;
      fs.readFileSync(path.join(raiz, 'js', f), 'utf8').split(/\r?\n/).forEach(function (l, i) {
        if (/^;?\(function\b/.test(l)) { iife++; vistas = {}; }
        var m = /^  function\s+([\w$]+)\s*\(/.exec(l);
        if (!m) return;
        if (vistas[m[1]]) malos.push('js/' + f + ': ' + m[1] + ' (líneas ' + vistas[m[1]] + ' y ' + (i + 1) + ')');
        else vistas[m[1]] = i + 1;
      });
    });
});

/* (b) Los módulos se nombran en cuatro sitios y tienen que ser los mismos:
 * index.html y tests.html (en el mismo orden, que es el de carga), la lista
 * `orden` de aquí arriba y el SHELL del service worker (sin orden: es lo que
 * se guarda para jugar sin red). Uno que falte en sw.js no se juega sin
 * conexión; uno que falte aquí o en tests.html no se prueba. */
guardian('index.html, tests.html, pruebas-node.js y sw.js cargan los mismos módulos', function (malos) {
  function scripts(fichero) {
    var html = fs.readFileSync(path.join(raiz, fichero), 'utf8'), out = [], m;
    var re = /<script[^>]*\bsrc="js\/([\w-]+)\.js"/g;
    while ((m = re.exec(html))) out.push(m[1]);
    return out;
  }
  var index = scripts('index.html');
  var pruebas = scripts('tests.html').filter(function (n) { return n !== 'tests'; });
  var sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
  var shell = /var SHELL = \[([\s\S]*?)\];/.exec(sw), enSw = [], m;
  if (!shell) { malos.push('no encuentro el SHELL de sw.js'); return; }
  var re = /'\.\/js\/([\w-]+)\.js'/g;
  while ((m = re.exec(shell[1]))) enSw.push(m[1]);
  if (!index.length) malos.push('index.html no carga ningún módulo de js/');
  if (pruebas.join() !== index.join()) malos.push('tests.html no carga lo mismo que index.html, o no en el mismo orden');
  if (orden.join() !== index.join()) malos.push('pruebas-node.js (orden) no carga lo mismo que index.html, o no en el mismo orden');
  if (enSw.slice().sort().join() !== index.slice().sort().join()) {
    malos.push('el SHELL de sw.js no guarda los mismos módulos que index.html: ' +
      index.filter(function (n) { return enSw.indexOf(n) === -1; }).map(function (n) { return 'falta ' + n; })
        .concat(enSw.filter(function (n) { return index.indexOf(n) === -1; }).map(function (n) { return 'sobra ' + n; }))
        .join(', '));
  }
});

/* (c) LOS COFRES: el servidor abre con SU copia del generador y sus datos
 * (supabase/functions/cofres/gen.js y datos.js). Tienen que ser los del
 * juego: si no, el premio que enseña el juego y el que entrega el servidor
 * podrían no ser el mismo. Se arreglan con `node supabase/cofres-datos.js`. */
guardian('la función de los cofres lleva el mismo generador y los mismos datos que el juego', function (malos) {
  var CD = require(path.join(raiz, 'supabase', 'cofres-datos.js'));
  var dir = path.join(raiz, 'supabase', 'functions', 'cofres');
  var gen = fs.readFileSync(path.join(dir, 'gen.js'), 'utf8').replace(/\r\n/g, '\n');
  if (gen !== CD.textoGen(raiz)) malos.push('gen.js no es copia exacta de js/cofres-gen.js');
  var dat = fs.readFileSync(path.join(dir, 'datos.js'), 'utf8').replace(/\r\n/g, '\n');
  if (dat !== CD.textoDatos(raiz)) malos.push('datos.js no está al día con js/config.js');
  /* y, por si acaso, que den LO MISMO: la copia del servidor cargada aparte,
   * con los datos del servidor, contra la del juego, en miles de cofres */
  var sb = { Math: Math, JSON: JSON, Object: Object, Array: Array, String: String, Number: Number };
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(gen, sb, { filename: 'supabase/functions/cofres/gen.js' });
  var Gs = sb.PM.CofresGen;
  var Ds = JSON.parse(dat.slice(dat.indexOf('export const DATOS = ') + 21).replace(/;\s*$/, ''));
  var Gj = win.PM.CofresGen, Dj = Gj.datosDe(win.PM.CFG);
  var distintos = 0;
  ['madera', 'plata', 'oro', 'legendario'].forEach(function (t) {
    for (var i = 0; i < 1500; i++) {
      var cuenta = 'c' + (i % 37) + '-' + (i * 7919 % 100003);
      var n = 1 + (i % 60);
      if (JSON.stringify(Gs.premio(cuenta, t, n, Ds)) !== JSON.stringify(Gj.premio(cuenta, t, n, Dj))) distintos++;
    }
  });
  if (distintos) malos.push(distintos + ' premios distintos entre el juego y el servidor');
});
/* (d) Las piezas de COFRE del catálogo (js/config.js) son las que el
 * servidor protege (piezas_especiales, en perfiles-blindaje.sql y
 * cofres.sql): una que falte ahí se podría dar el juego a sí mismo. */
guardian('las piezas de cofre del catálogo están todas en piezas_especiales del SQL', function (malos) {
  var CFGn = win.PM.CFG, cat = [];
  (CFGn.EFECTOS || []).concat(CFGn.ACCESORIOS || []).forEach(function (x) { if (x.cofre) cat.push(x.id); });
  (CFGn.SKINS || []).forEach(function (x) { if (x.grupo === 'cofre') cat.push(x.id); });
  cat.sort();
  ['perfiles-blindaje.sql', 'cofres.sql'].forEach(function (f) {
    var sqlTxt = fs.readFileSync(path.join(raiz, 'supabase', f), 'utf8');
    var re = /\('([a-z0-9_]+)', 'cofre', null, null\)/g, m, ids = [];
    while ((m = re.exec(sqlTxt))) ids.push(m[1]);
    ids.sort();
    var faltan = cat.filter(function (x) { return ids.indexOf(x) === -1; });
    var sobran = ids.filter(function (x) { return cat.indexOf(x) === -1; });
    if (faltan.length) malos.push(f + ': faltan ' + faltan.join(', '));
    if (sobran.length) malos.push(f + ': sobran ' + sobran.join(', '));
  });
});

/* ---------- las pruebas ---------- */
try {
  vm.runInContext(fs.readFileSync(path.join(raiz, 'js', 'tests.js'), 'utf8'),
                  sandbox, { filename: 'js/tests.js' });
} catch (e) {
  console.error('FALLO EJECUTANDO js/tests.js');
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}

var r = sandbox.__TESTS;
if (!r) {
  console.error('las pruebas no dejaron resultado en window.__TESTS');
  process.exit(1);
}
var todos = guardianes.concat(r.casos);
var fallos = r.fallos + guardianes.filter(function (g) { return !g.ok; }).length;
todos.forEach(function (c) {
  if (!c.ok) console.log('  MAL  ' + c.nombre + '  ->  ' + c.error);
});
console.log('\n' + (fallos ? 'FALLAN ' + fallos : 'TODO BIEN') +
            '  ·  ' + r.total + ' pruebas y ' + guardianes.length + ' guardianes');
process.exit(fallos ? 1 : 0);
