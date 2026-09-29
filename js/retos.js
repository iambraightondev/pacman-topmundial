/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/retos.js
 * RETOS ENTRE AMIGOS, sin tener que coincidir. Define window.PM.Retos
 *
 * Somos pocos y las party piden estar conectados a la vez, así que el pique
 * va por las MARCAS, que ya están en la nube: cada perfil público lleva sus
 * doce récords (mundo × formato: CLÁSICO, LABERINTOS y DESATADO, cada uno en
 * SOLO, DÚO, TRÍO y ESCUADRA; ver Account.recordCols/modoCols). Nada nuevo en
 * el servidor y nada escrito en perfiles ajenos: solo se LEEN.
 *
 * 1. "X TE HA SUPERADO". Al abrir el juego con cuenta (y ya fundida la nube,
 *    Account.fundido), se leen los perfiles de tus amigos y se compara ruta a
 *    ruta. Un adelantamiento es: en una ruta donde TÚ tienes marca, la suya
 *    es mayor que la tuya Y mayor que la que ya se te avisó de ese amigo en
 *    esa ruta. Así cada adelantamiento se avisa UNA vez, y si le vuelves a
 *    pasar y él te vuelve a pasar, eso es otro (su marca nueva es mayor que
 *    la avisada). Lo avisado viaja con la cuenta (ajustes.retos, fundido con
 *    el MAYOR de cada lado), así que el otro aparato no lo repite.
 *    Se enseña en un recuadro de la portada (en la ficha en ancho, DEBAJO de
 *    JUGAR en el móvil, como PRIMEROS PASOS), con SUPERA ESTO.
 *
 * 2. "SUPERA ESTO". Desde el recuadro o desde el perfil de un amigo: un
 *    diálogo con la ruta y su marca, que lleva al modo (o a la party, si la
 *    ruta es de equipo) y deja el reto ARMADO. La partida que coincida con la
 *    ruta enseña la marca a batir en el marcador, en el sitio del HIGH SCORE;
 *    al pasarla sale ¡RETO SUPERADO! por la banda de arriba y queda en el
 *    resumen del final. Tu récord nuevo sube a tu perfil como siempre, y tu
 *    amigo lo verá como el aviso de (1) la próxima vez que abra el juego (si
 *    te tiene en SU lista: los amigos van en una sola dirección).
 *    Si la marca tiene repetición en la nube (misma puntuación, mismo
 *    formato, su nombre), VER SU PARTIDA la pone antes de jugar.
 *
 * Sin cuenta no hay amigos: el botón se ve igual y lleva a crear una.
 * Ni notificaciones push ni tablas nuevas.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  var KEY = 'pacman-topmundial-retos';
  var COLOR = '#ff4d4d';                  // BLINKY: el rival
  var INTERVALO = 5 * 60 * 1000;           // como mucho, una ronda cada 5 min
  var NUBE_MAX = 600;                      // ajustes.retos (la columna tiene tope)
  var MAX_PEND = 12;

  var MUNDOS = { clasico: 'CLÁSICO', lab: 'LABERINTOS', hab: 'DESATADO' };
  var FORMATOS = ['SOLO', 'DÚO', 'TRÍO', 'ESCUADRA'];

  /* Las doce rutas: k es la clave corta ('h1' = DESATADO en solo) */
  var RUTAS = [];
  ['clasico', 'lab', 'hab'].forEach(function (m) {
    for (var n = 1; n <= 4; n++) {
      RUTAS.push({
        m: m, n: n, k: m.charAt(0) + n,
        col: m === 'clasico' ? 'record' + n : 'record_' + m + (n > 1 ? n : '')
      });
    }
  });
  function rutaDe(k) {
    for (var i = 0; i < RUTAS.length; i++) if (RUTAS[i].k === k) return RUTAS[i];
    return null;
  }

  var memoria = {};   // sin almacén (modo privado estricto): dura la sesión

  function Ac() { return window.PM.Account; }
  function G() { return window.PM.Game; }
  function logged() {
    var a = Ac();
    try { return !!(a && a.logged && a.logged()); } catch (e) { return false; }
  }
  function yo() {
    var a = Ac();
    return (logged() && a.name) ? String(a.name() || '').toUpperCase() : '';
  }
  function limpio(n) {
    var a = Ac();
    return a && a.cleanUser ? a.cleanUser(n) : String(n || '').toUpperCase();
  }
  function entero(v) {
    var n = parseInt(v, 10);
    return (n > 0 && n <= 100000000) ? n : 0;
  }
  function miles(n) {
    return String(Math.max(0, Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function el(tag, cls, txt) {
    var x = document.createElement(tag);
    if (cls) x.className = cls;
    if (txt != null) x.textContent = txt;
    return x;
  }

  /* ---------- el almacén del aparato ----------
   * { CUENTA: { v: { AMIGO: { k: marca avisada } }, p: [pendientes] } } */
  function leerTodo() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null');
      return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
    } catch (e) { return JSON.parse(JSON.stringify(memoria)); }
  }
  function escribirTodo(o) {
    memoria = o;
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* en memoria */ }
  }
  function mio(o) {
    var u = yo();
    if (!u) return null;
    var d = o[u];
    if (!d || typeof d !== 'object') d = o[u] = { v: {}, p: [] };
    if (!d.v || typeof d.v !== 'object') d.v = {};
    if (!Array.isArray(d.p)) d.p = [];
    return d;
  }

  var Retos = {
    KEY: KEY,
    COLOR: COLOR,
    RUTAS: RUTAS,
    INTERVALO: INTERVALO,

    /* el reto armado (SUPERA ESTO) y el de la partida en curso */
    armado: null,
    enJuego: null,
    ultima: 0,
    buscando: false,

    rutaDe: rutaDe,
    nombreRuta: function (r) {
      r = (typeof r === 'string') ? rutaDe(r) : r;
      return r ? MUNDOS[r.m] + ' · ' + FORMATOS[r.n - 1] : '';
    },

    /* Las doce marcas de una fila de perfil: { k: marca } */
    marcasDe: function (fila) {
      var out = {};
      RUTAS.forEach(function (r) { out[r.k] = entero(fila && fila[r.col]); });
      return out;
    },

    /* Las tuyas, de este aparato (ya fundidas con la cuenta) */
    mias: function () {
      var g = G(), out = {};
      RUTAS.forEach(function (r) {
        var v = 0;
        if (g) v = (r.m === 'clasico') ? (g.recordFor ? g.recordFor(r.n) : 0)
                                       : (g.recordModo ? g.recordModo(r.m, r.n) : 0);
        out[r.k] = entero(v);
      });
      return out;
    },

    /* LA REGLA, sin red ni pantalla: qué adelantamientos son nuevos.
     *   mias:   { k: tu marca }
     *   filas:  [fila] o { NOMBRE: fila } (perfiles públicos de tus amigos)
     *   vistos: { AMIGO: { k: marca ya avisada } }
     * Solo cuentan las rutas donde tienes marca: si nunca has jugado un
     * trío, que alguien tenga uno no es que te haya pasado. */
    adelantos: function (mias, filas, vistos, propio) {
      var lista = [], out = [], self = this;
      if (Array.isArray(filas)) lista = filas;
      else for (var nm in (filas || {})) if (filas.hasOwnProperty(nm)) lista.push(filas[nm]);
      vistos = vistos || {};
      propio = String(propio || '').toUpperCase();
      lista.forEach(function (fila) {
        var amigo = limpio(fila && fila.usuario);
        if (!amigo || amigo === propio) return;
        var suyas = self.marcasDe(fila), v = vistos[amigo] || {};
        RUTAS.forEach(function (r) {
          var tuya = entero(mias && mias[r.k]), suya = suyas[r.k];
          if (tuya > 0 && suya > tuya && suya > entero(v[r.k])) {
            out.push({ amigo: amigo, k: r.k, suya: suya, tuya: tuya });
          }
        });
      });
      // primero las rutas de siempre (el orden de RUTAS) y dentro, el que más saca
      out.sort(function (a, b) {
        return (RUTAS.indexOf(rutaDe(a.k)) - RUTAS.indexOf(rutaDe(b.k))) ||
               ((b.suya - b.tuya) - (a.suya - a.tuya));
      });
      return out;
    },

    /* ---------- lo avisado ---------- */
    vistos: function () {
      var d = mio(leerTodo());
      return d ? d.v : {};
    },

    /* Apunta como avisados (y deja en el recuadro) unos adelantamientos */
    marcar: function (lista) {
      var o = leerTodo(), d = mio(o);
      if (!d || !lista || !lista.length) return;
      lista.forEach(function (x) {
        var v = d.v[x.amigo] || (d.v[x.amigo] = {});
        v[x.k] = Math.max(entero(v[x.k]), x.suya);
        // en el recuadro, uno por amigo y ruta: el nuevo pisa al viejo
        d.p = d.p.filter(function (p) { return !(p[0] === x.amigo && p[1] === x.k); });
        d.p.push([x.amigo, x.k, x.suya, x.tuya]);
      });
      if (d.p.length > MAX_PEND) d.p = d.p.slice(-MAX_PEND);
      escribirTodo(o);
    },

    /* Lo que queda por enseñar en el recuadro. Lo que ya has superado (tu
     * marca de hoy llega a la suya) se cae solo. */
    pendientes: function () {
      var d = mio(leerTodo());
      if (!d) return [];
      var mias = this.mias();
      return d.p.filter(function (p) {
        return p && rutaDe(p[1]) && entero(p[2]) > entero(mias[p[1]]);
      }).map(function (p) {
        return { amigo: p[0], k: p[1], suya: entero(p[2]), tuya: entero(mias[p[1]]) || entero(p[3]) };
      });
    },

    /* Quitar del recuadro: uno (amigo y ruta) o todos */
    quitar: function (amigo, k) {
      var o = leerTodo(), d = mio(o);
      if (!d) return;
      d.p = (amigo == null) ? [] : d.p.filter(function (p) { return !(p[0] === amigo && p[1] === k); });
      escribirTodo(o);
    },

    /* ---------- viaja con la cuenta (ajustes.retos) ----------
     * Texto corto: "MAULIO:h1.qo0,c1.p8w;FREDDY:c1.r2q" (las marcas en base
     * 36). La columna `ajustes` tiene tope de tamaño y lleva también tu
     * aspecto: esto no pasa de NUBE_MAX, y si no cabe se quedan fuera
     * primero los que ya no son tus amigos. */
    paraNube: function () {
      var v = this.vistos(), F = window.PM.Friends;
      var amigos = F ? F.all() : [];
      var nombres = Object.keys(v).sort(function (a, b) {
        return (amigos.indexOf(b) !== -1) - (amigos.indexOf(a) !== -1);
      });
      var trozos = [], largo = 0;
      for (var i = 0; i < nombres.length; i++) {
        var par = [];
        for (var k in v[nombres[i]]) {
          if (v[nombres[i]].hasOwnProperty(k) && rutaDe(k) && entero(v[nombres[i]][k])) {
            par.push(k + '.' + entero(v[nombres[i]][k]).toString(36));
          }
        }
        if (!par.length) continue;
        var t = nombres[i] + ':' + par.join(',');
        if (largo + t.length + 1 > NUBE_MAX) continue;
        trozos.push(t);
        largo += t.length + 1;
      }
      return trozos.join(';');
    },

    leerNube: function (txt) {
      var out = {};
      if (typeof txt !== 'string' || txt.length > 4000) return out;
      txt.split(';').forEach(function (t) {
        var m = /^([A-Z0-9 ._-]{1,20}):([a-z0-9.,]+)$/.exec(t);
        if (!m) return;
        var amigo = limpio(m[1]);
        if (!amigo) return;
        m[2].split(',').forEach(function (e) {
          var q = /^([clh][1-4])\.([0-9a-z]{1,8})$/.exec(e);
          if (!q) return;
          var n = entero(parseInt(q[2], 36));
          if (!n) return;
          var v = out[amigo] || (out[amigo] = {});
          v[q[1]] = Math.max(entero(v[q[1]]), n);
        });
      });
      return out;
    },

    /* Lo avisado en otro aparato: se queda el MAYOR de cada lado */
    desdeNube: function (txt) {
      var nube = this.leerNube(txt);
      var o = leerTodo(), d = mio(o);
      if (!d) return false;
      var cambio = false;
      for (var a in nube) {
        if (!nube.hasOwnProperty(a)) continue;
        var v = d.v[a] || (d.v[a] = {});
        for (var k in nube[a]) {
          if (nube[a].hasOwnProperty(k) && nube[a][k] > entero(v[k])) { v[k] = nube[a][k]; cambio = true; }
        }
      }
      if (cambio) escribirTodo(o);
      return cambio;
    },

    /* ---------- la ronda: leer a los amigos y comparar ----------
     * Con cuenta, con la nube ya fundida en esta sesión (si no, un segundo
     * aparato repetiría lo que el primero ya avisó) y como mucho cada
     * INTERVALO. cb(nuevos) si ha terminado la ronda. */
    revisar: function (cb, forzar) {
      var self = this, a = Ac();
      if (this.buscando || !logged() || !a.user || a.fundido !== a.user.id) return false;
      if (a.configured && !a.configured()) return false;
      if (!forzar && Date.now() - this.ultima < INTERVALO) return false;
      this.ultima = Date.now();
      this.buscando = true;
      var quien = yo();
      function fin(nuevos) { self.buscando = false; if (cb) cb(nuevos || []); }
      a.listFriends(function (err, lista) {
        if (err || !lista || yo() !== quien) { fin(); return; }
        if (window.PM.Friends) window.PM.Friends.replace(lista);
        if (!lista.length) { fin(); return; }
        a.fetchProfiles(lista, function (err2, mapa) {
          if (err2 || !mapa || yo() !== quien) { fin(); return; }
          self.perfiles = mapa;
          var nuevos = self.adelantos(self.mias(), mapa, self.vistos(), quien);
          if (nuevos.length) {
            self.marcar(nuevos);
            // que el otro aparato sepa que esto ya se avisó
            if (a.pushQuiet) a.pushQuiet();
          }
          fin(nuevos);
        });
      });
      return true;
    },

    /* Desde la portada (y cuando cambia la cuenta) */
    alMenu: function (UI) {
      var self = this;
      this.refrescar(UI);
      if (window.PM_PRUEBAS) return;
      this.revisar(function (nuevos) { if (nuevos.length) self.refrescar(UI); });
    },

    /* ============================================================
     * LA PARTIDA
     * ============================================================ */
    rutaDePartida: function (g) {
      return (g.hab ? 'h' : g.mazeId ? 'l' : 'c') + (g.playerCount || 1);
    },

    /* ¿Esta partida puede batir una marca? La misma lista que decide si
     * guarda récord (Game.persistHighScore): ni repeticiones, ni mirones,
     * ni PAC-MAN VS., ni SUPERVIVENCIA, ni CACERÍA. */
    cuenta: function (g) {
      if (!g || g.replaying || (g.isSpec && g.isSpec())) return false;
      if ((g.isVersus && g.isVersus()) || g.superv || g.caza) return false;
      return true;
    },

    armar: function (reto) {
      if (!reto || !rutaDe(reto.k) || !entero(reto.suya)) { this.armado = null; return; }
      this.armado = { amigo: limpio(reto.amigo), k: reto.k, suya: entero(reto.suya) };
    },

    /* Game.newGame: si la partida es de la ruta del reto armado, va en ella */
    alEmpezar: function (g) {
      var r = this.armado;
      this.enJuego = null;
      if (!r || !this.cuenta(g) || this.rutaDePartida(g) !== r.k) return;
      this.enJuego = { amigo: r.amigo, k: r.k, suya: r.suya, hecho: false };
    },

    /* Cada tick (Game.step): ¿la ha pasado? */
    paso: function (g) {
      var e = this.enJuego;
      if (!e || e.hecho || !g || g.replaying || g.state === 'MENU') return;
      if (!((g.score || 0) > e.suya)) return;
      e.hecho = true;
      this.armado = null;               // hecho: ya no se enseña en la siguiente
      this.quitar(e.amigo, e.k);        // ni en el recuadro
      /* en la banda, corto (el nombre del reto y a quién: más no cabe sin
       * pisarse); en el resumen del final, entero */
      var aviso = { name: 'RETO SUPERADO', desc: e.amigo,
                    color: COLOR, ticks: CFG.ACH_NOTICE_TICKS, total: CFG.ACH_NOTICE_TICKS };
      if (g.achNotices) g.achNotices.push(aviso);
      if (g.runAch) g.runAch.push({ name: '¡RETO SUPERADO!', desc: 'PASAS A ' + e.amigo + ' · ' + miles(e.suya), color: COLOR });
      if (window.AudioSys) { try { AudioSys.playExtraLife(); } catch (err) { /* sin sonido */ } }
    },

    /* En el marcador, en el sitio del HIGH SCORE: RETO <AMIGO> y su marca.
     * Devuelve true si lo ha pintado (y entonces el HIGH SCORE no va). */
    hud: function (g, ctx) {
      var e = this.enJuego;
      if (!e || e.hecho || !g || g.replaying || g.state === 'MENU' || !g.fitText) return false;
      ctx.save();
      ctx.font = window.PM.Letra.lienzo(8);
      var ancho = ctx.measureText('HIGH SCORE').width;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillStyle = COLOR;
      g.fitText(ctx, 'RETO ' + e.amigo, 112, 0, ancho, 8);
      ctx.font = window.PM.Letra.lienzo(8);
      ctx.textAlign = 'right';
      ctx.fillText(String(e.suya), 136, 9);
      ctx.restore();
      return true;
    },

    /* ============================================================
     * LA PANTALLA
     * ============================================================ */

    /* EL RECUADRO DE LA PORTADA: ¡TE HAN SUPERADO! */
    tarjeta: function (UI) {
      var self = this;
      var b = el('div', 'rt-box');
      b.style.setProperty('--rc', COLOR);
      b.setAttribute('role', 'region');
      var cab = el('div', 'rt-cab');
      cab.appendChild(el('span', 'rt-t', '¡TE HAN SUPERADO!'));
      var n = el('b', 'rt-n', '');
      cab.appendChild(n);
      var cerrar = UI.makeButton('✕', function () {
        self.quitar(null);
        self.refrescar(UI);
      });
      cerrar.classList.add('rt-cerrar');
      cerrar.title = 'YA LO HE VISTO';
      cerrar.setAttribute('aria-label', 'Cerrar los avisos de retos');
      cab.appendChild(cerrar);
      b.appendChild(cab);
      var txt = el('div', 'rt-txt');
      b.appendChild(txt);
      /* abajo, en un renglón: su marca contra la tuya y los botones */
      var btns = el('div', 'rt-pie');
      var marca = el('div', 'rt-marca');
      btns.appendChild(marca);
      var ir = UI.makeButton('SUPERA ESTO', function () {
        var p = self.pendientes()[UI.retosIdx || 0];
        if (p) self.abrir(UI, p);
      });
      ir.classList.add('rt-ir');
      btns.appendChild(ir);
      var sig = UI.makeButton('►', function () {
        UI.retosIdx = (UI.retosIdx || 0) + 1;
        self.refrescar(UI);
      });
      sig.classList.add('rt-sig');
      sig.title = 'EL SIGUIENTE';
      sig.setAttribute('aria-label', 'El siguiente aviso');
      btns.appendChild(sig);
      b.appendChild(btns);
      b.style.display = 'none';
      UI.retosTarjeta = { box: b, n: n, txt: txt, marca: marca, sig: sig, ir: ir };
      if (!this.oyeAncho && window.addEventListener) {
        this.oyeAncho = true;
        window.addEventListener('resize', function () { self.colocar(UI); });
      }
      return b;
    },

    /* En pantalla ancha, bajo TU CUARTEL (la columna que tiene hueco: la
     * ficha ya va llena con el DAILY); en estrecha, debajo de JUGAR y detrás
     * de PRIMEROS PASOS si está: nunca encima del botón. */
    colocar: function (UI) {
      var t = UI.retosTarjeta;
      if (!t) return;
      var ancho = (window.innerWidth || 0) >= 1000, box = t.box;
      var cuartel = UI.menuVestBtn && UI.menuVestBtn.parentNode && UI.menuVestBtn.parentNode.parentNode;
      if (ancho && cuartel) {
        if (box.parentNode !== cuartel || cuartel.lastChild !== box) cuartel.appendChild(box);
      } else if (!ancho && UI.playBtn && UI.playBtn.parentNode) {
        var tras = UI.playBtn;
        var pp = UI.pasosTarjeta && UI.pasosTarjeta.box;
        if (pp && pp.parentNode === UI.playBtn.parentNode && UI.playBtn.nextSibling === pp) tras = pp;
        if (tras.nextSibling !== box) tras.parentNode.insertBefore(box, tras.nextSibling);
      }
    },

    refrescar: function (UI) {
      var t = UI && UI.retosTarjeta;
      if (!t) return;
      var lista = logged() ? this.pendientes() : [];
      t.box.style.display = lista.length ? '' : 'none';
      if (!lista.length) { UI.retosIdx = 0; return; }
      this.colocar(UI);
      var i = (UI.retosIdx || 0) % lista.length;
      UI.retosIdx = i;
      var p = lista[i];
      t.n.textContent = lista.length > 1 ? (i + 1) + '/' + lista.length : '';
      t.txt.innerHTML = '';
      t.txt.appendChild(el('b', 'rt-quien', p.amigo));
      t.txt.appendChild(el('span', null, ' TE HA SUPERADO EN '));
      t.txt.appendChild(el('b', 'rt-ruta', this.nombreRuta(p.k)));
      t.marca.innerHTML = '';
      t.marca.appendChild(el('b', 'rt-suya', miles(p.suya)));
      t.marca.appendChild(el('span', null, ' CONTRA TUS ' + miles(p.tuya)));
      t.sig.style.display = lista.length > 1 ? '' : 'none';
      t.box.setAttribute('aria-label', p.amigo + ' te ha superado en ' + this.nombreRuta(p.k) +
        ': ' + miles(p.suya) + ' contra tus ' + miles(p.tuya));
    },

    /* SIN CUENTA: el botón está, pero los amigos (y sus marcas) van en ella */
    pideCuenta: function (UI) {
      UI.showPrompt({
        popup: true,
        title: 'SUPERA ESTO',
        color: COLOR,
        lines: [
          'RETA A TUS AMIGOS AUNQUE NO COINCIDÁIS: SUPERA SUS MARCAS Y SE ENTERAN AL ABRIR EL JUEGO',
          'LOS AMIGOS VIVEN EN TU CUENTA: CREA UNA Y AÑÁDELOS'
        ],
        buttons: [
          { label: 'CREAR CUENTA', primary: true, keys: ['Enter'], hint: 'ENTER',
            onClick: function () { UI.showAccountPrompt('crear'); } },
          { label: 'YA TENGO CUENTA', cls: 'btn-enlace',
            onClick: function () { UI.showAccountPrompt('entrar'); } },
          { label: 'VOLVER', cls: 'btn-enlace', keys: ['Escape'], hint: 'ESC',
            onClick: function () { UI.hidePrompt(); } }
        ]
      });
    },

    /* SUPERA ESTO: el reto, antes de jugarlo. reto = { amigo, k, suya } */
    abrir: function (UI, reto) {
      var self = this;
      if (UI.resumeAudio) UI.resumeAudio();
      if (!logged()) { this.pideCuenta(UI); return; }
      var r = rutaDe(reto.k);
      if (!r) return;
      var tuya = this.mias()[r.k];
      var botones = [];
      function vamos(fn) {
        return function () {
          self.armar(reto);
          UI.hidePrompt();
          fn();
        };
      }
      if (r.n === 1) {
        botones.push({ label: '¡A POR ÉL!', primary: true, keys: ['Enter'], hint: 'ENTER',
          onClick: vamos(function () { self.ir(UI, r, 'aqui'); }) });
      } else {
        if (r.n === 2 && r.m !== 'lab') {
          botones.push({ label: 'MISMO TECLADO', primary: true, keys: ['Enter'], hint: 'ENTER',
            onClick: vamos(function () { self.ir(UI, r, 'aqui'); }) });
        }
        botones.push({ label: 'EN PARTY', primary: botones.length === 0, keys: ['p'], hint: 'P',
          onClick: vamos(function () { self.ir(UI, r, 'party'); }) });
      }
      botones.push({ label: 'VER SU PARTIDA', cls: 'rt-ver', keys: ['v'], hint: 'V',
        onClick: function () {
          if (!self.repe) return;
          self.armar(reto);
          UI.hidePrompt();
          var Rp = window.PM.Replay;
          if (Rp && Rp.verCompartida) Rp.verCompartida(self.repe);
        } });
      botones.push({ label: 'VOLVER', cls: 'btn-enlace', keys: ['Escape'], hint: 'ESC',
        onClick: function () { UI.hidePrompt(); } });

      UI.showPrompt({
        title: 'SUPERA ESTO',
        arcade: true,
        tono: 'rojo',
        clase: 'rt-prompt',
        custom: function (p) {
          var caja = el('div', 'rt-reto');
          caja.style.setProperty('--rc', COLOR);
          caja.appendChild(el('div', 'rt-reto-ruta', self.nombreRuta(r)));
          caja.appendChild(el('div', 'rt-reto-quien', 'LA MARCA DE ' + reto.amigo));
          caja.appendChild(el('div', 'rt-reto-marca', miles(reto.suya)));
          caja.appendChild(el('div', 'rt-reto-tuya', !tuya ? 'TODAVÍA NO TIENES MARCA EN ESTA RUTA'
            : tuya > reto.suya ? 'TU RÉCORD ' + miles(tuya) + ' · YA LE GANAS'
            : 'TU RÉCORD ' + miles(tuya) + ' · TE FALTAN ' + miles(reto.suya - tuya + 10)));
          if (r.n > 1) {
            caja.appendChild(el('div', 'rt-reto-nota', 'ES DE ' + FORMATOS[r.n - 1] +
              ': CUENTA LA PUNTUACIÓN DEL EQUIPO, CON ' + r.n + ' JUGANDO'));
          }
          caja.appendChild(el('div', 'rt-reto-nota', 'LA MARCA A BATIR SALE EN EL MARCADOR MIENTRAS JUEGAS'));
          p.appendChild(caja);
        },
        buttons: botones
      });
      /* VER SU PARTIDA solo si esa marca tiene repetición en la nube */
      var ver = UI.els.prompt && UI.els.prompt.querySelector && UI.els.prompt.querySelector('.rt-ver');
      this.repe = null;
      if (ver) ver.style.display = 'none';
      this.buscarRepe(reto, function (id) {
        self.repe = id;
        if (ver && id && ver.isConnected !== false) ver.style.display = '';
      });
    },

    /* La repetición de esa marca: la misma puntuación, el mismo formato y su
     * nombre entre los que jugaron. cb(id) o cb(null). */
    buscarRepe: function (reto, cb) {
      var Rp = window.PM.Replay, r = rutaDe(reto.k);
      if (window.PM_PRUEBAS || !Rp || !r || !Rp.compartirConfigurado || !Rp.compartirConfigurado() ||
          !window.fetch) { cb(null); return; }
      var url = Rp.restUrl('/rest/v1/' + CFG.REPLAY_SHARE.TABLE +
        '?select=id&jugadores=eq.' + r.n + '&puntos=eq.' + entero(reto.suya) +
        '&nombres=ilike.' + encodeURIComponent('*' + limpio(reto.amigo) + '*') +
        '&order=creado_en.desc&limit=1');
      fetch(url, { headers: Rp.restHeaders() })
        .then(function (res) { return res.ok ? res.json() : []; })
        .then(function (filas) { cb((filas && filas[0] && filas[0].id) || null); })
        .catch(function () { cb(null); });
    },

    /* Al modo de la ruta. En solo, directo a su JUGAR; en equipo, al mismo
     * teclado (dúo) o a la party. */
    ir: function (UI, r, como) {
      if (como === 'party') {
        UI.pickMode('online');
        UI.showOnline();
        return;
      }
      var modo = r.m === 'clasico' ? (r.n === 2 ? 'duo' : 'clasico') : r.m;
      UI.pickMode(modo);
      UI.showMenu();
      UI.playPick();
    },

    /* SUS MARCAS en el perfil de un amigo: ruta a ruta, la suya contra la
     * tuya, con SUPERA ESTO donde va por delante. */
    pintarFicha: function (UI, fila) {
      var self = this;
      if (!UI.mateBody) return;
      if (!UI.mateRetos) {
        var tit = UI.sectionTitle('SUS MARCAS · SUPERA ESTO');
        tit.classList.add('rt-ficha-tit');
        var caja = el('div', 'rt-ficha');
        var antes = UI.mateMaestria && UI.mateMaestria.box && UI.mateMaestria.box.nextSibling;
        if (antes) { UI.mateBody.insertBefore(tit, antes); UI.mateBody.insertBefore(caja, antes); }
        else { UI.mateBody.appendChild(tit); UI.mateBody.appendChild(caja); }
        UI.mateRetos = { tit: tit, caja: caja };
      }
      var c = UI.mateRetos.caja;
      c.innerHTML = '';
      var amigo = limpio(fila && fila.usuario);
      var suyas = this.marcasDe(fila), mias = this.mias(), hay = 0;
      RUTAS.forEach(function (r) {
        var suya = suyas[r.k];
        if (!suya) return;
        hay++;
        var tuya = mias[r.k];
        var delante = suya > tuya;
        var row = el('div', 'rt-fila' + (delante ? ' delante' : ''));
        row.appendChild(el('span', 'rt-fila-ruta', self.nombreRuta(r)));
        var nums = el('span', 'rt-fila-nums');
        nums.appendChild(el('b', null, miles(suya)));
        nums.appendChild(el('small', null, 'TÚ ' + (tuya ? miles(tuya) : '—')));
        row.appendChild(nums);
        if (delante) {
          var b = UI.makeButton('SUPERA ESTO', function () {
            self.abrir(UI, { amigo: amigo, k: r.k, suya: suya });
          });
          b.classList.add('rt-fila-btn');
          b.setAttribute('aria-label', 'Supera los ' + miles(suya) + ' de ' + amigo + ' en ' + self.nombreRuta(r));
          row.appendChild(b);
        } else {
          row.appendChild(el('span', 'rt-fila-ok', suya === tuya ? 'EMPATE' : 'LE GANAS'));
        }
        c.appendChild(row);
      });
      if (!hay) c.appendChild(el('div', 'note', 'TODAVÍA NO TIENE MARCAS QUE SUPERAR'));
      if (UI.mateIrARetos) {
        UI.mateIrARetos = false;
        if (UI.mateRetos.tit.scrollIntoView) {
          try { UI.mateRetos.tit.scrollIntoView({ block: 'start' }); } catch (e) { /* sin scroll */ }
        }
      }
    }
  };

  window.PM.Retos = Retos;
})();
