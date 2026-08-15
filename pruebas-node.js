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
 * Sale con código 1 si falla alguna, así vale para un gancho de CI.
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
    'ellipse', 'setLineDash', 'createLinearGradient'];
  nada.forEach(function (m) { ctx[m] = function () { return ctx; }; });
  ctx.measureText = function (t) { return { width: String(t).length * 5 }; };
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
  get: function () {
    if (this.children.length && this.children[0].nodeType === 3) {
      return this.children[0].nodeValue;
    }
    return this._text;
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
El.prototype.click = function () { this.dispatch('click', { preventDefault: function () {} }); };
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
/* recorrido plano: a las pruebas les basta con encontrar por clase/etiqueta */
El.prototype.querySelectorAll = function (sel) {
  var out = [];
  var partes = String(sel).split(',').map(function (x) { return x.trim(); });
  (function anda(n) {
    for (var i = 0; i < n.children.length; i++) {
      var k = n.children[i];
      for (var j = 0; j < partes.length; j++) {
        var p = partes[j];
        var cls = p.indexOf('.') === 0 ? p.slice(1).split(':')[0] : null;
        var tag = cls ? null : p.split(/[:\[]/)[0].toUpperCase();
        if ((cls && k._has(cls)) || (tag && k.tagName === tag)) { out.push(k); break; }
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
  getElementById: function (id) { return porId[id] || null; },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  addEventListener: function () {},
  removeEventListener: function () {}
};
doc.body = new El('body');
doc.documentElement = new El('html');
['stage', 'game', 'menu', 'options', 'online', 'badges', 'ranking',
 'mazes', 'friends', 'profile', 'prompt'].forEach(function (id) {
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
  WebSocket: undefined
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
var orden = ['config', 'audio', 'sprites', 'pacman', 'ghost', 'net-config',
  'net', 'party', 'badges', 'history', 'level', 'friends', 'ranking',
  'temporadas', 'daily', 'mazes', 'achievements', 'account', 'versus',
  'habilidades', 'game', 'replay', 'ui'];

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
r.casos.forEach(function (c) {
  if (!c.ok) console.log('  MAL  ' + c.nombre + '  ->  ' + c.error);
});
console.log('\n' + (r.fallos ? 'FALLAN ' + r.fallos : 'TODO BIEN') +
            '  ·  ' + r.total + ' pruebas');
process.exit(r.fallos ? 1 : 0);
