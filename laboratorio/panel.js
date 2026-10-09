/* ============================================================
 * PAC-MAN TOP MUNDIAL — laboratorio/panel.js
 *
 * El panel de trucos del LABORATORIO (ver laboratorio/servidor.js). Solo
 * lo carga ese servidor: no está en index.html ni se publica.
 *
 * Todo lo que hace lo hace sobre la partida de ESTA pestaña. En una party
 * entre pestañas manda el anfitrión: los trucos, desde su pestaña.
 * F2 esconde y enseña el panel.
 * ============================================================ */
(function () {
  'use strict';
  if (!window.PM_LABORATORIO) return;      // fuera del laboratorio no existe
  var PM = window.PM, CFG = PM.CFG, H = CFG.HAB, T = CFG.TILE;
  function G() { return PM.Game; }
  function A() { return PM.Hab; }
  function J() { return PM.Jefe; }
  function yo() { var g = G(); return g.localIdx >= 0 ? g.localIdx : 0; }
  function jugando() { var g = G(); return !!(g && g.inGame && g.inGame() && g.pacs && g.pacs.length); }
  function est(i) { var a = A(); return (a && a.on) ? a.st[i == null ? yo() : i] : null; }

  var fijos = { inmortal: false, sinRecarga: false, hiper: false };
  var guardado = {};
  try { guardado = JSON.parse(localStorage.getItem('pm-laboratorio') || '{}') || {}; } catch (e) { guardado = {}; }
  function guardar() { try { localStorage.setItem('pm-laboratorio', JSON.stringify(guardado)); } catch (e) { /* sin almacén */ } }

  /* ---------- lo que se sostiene tick a tick ---------- */
  function sostener() {
    if (!jugando()) return;
    var g = G(), a = A(), i;
    if (a && a.on) {
      for (i = 0; i < a.st.length; i++) {
        if (fijos.sinRecarga) a.st[i].cd = [0, 0, 0, 0];
        if (fijos.hiper) a.st[i].hiper = 1;
      }
    }
  }
  var paso0 = G().step;
  G().step = function () { sostener(); return paso0.apply(this, arguments); };
  /* INMORTAL: la muerte no llega a empezar (sin parpadeos ni escudos de
   * mentira: todo lo demás del choque pasa como siempre) */
  var muerte0 = G().startDeath;
  G().startDeath = function () { if (fijos.inmortal) return; return muerte0.apply(this, arguments); };

  /* ---------- las acciones ---------- */
  function empezar() {
    var g = G(), UI = PM.UI;
    var rol = sel.rol.value, nivel = Math.max(1, parseInt(inp.nivel.value, 10) || 1);
    var n = parseInt(sel.jug.value, 10) || 1, des = chk.desatado.checked;
    var carga = [0, 1, 2, 3].map(function (k) { return sel.hab[k].value; }).join(',');
    var roles = [rol], cargas = [H.loadoutValido(rol, carga)];
    for (var i = 1; i < n; i++) {
      var otro = H.ROL_IDS.filter(function (r) { return roles.indexOf(r) < 0; })[0];
      roles.push(otro);
      cargas.push(H.loadoutValido(otro, ''));
    }
    guardado.rol = rol; guardado.nivel = nivel; guardado.jug = n; guardado.des = des; guardado.carga = carga;
    guardar();
    if (UI.hidePrompt) UI.hidePrompt();
    if (UI.hideAll) UI.hideAll();
    if (UI.resumeAudio) UI.resumeAudio();
    var cfg = JSON.parse(JSON.stringify(g.settings()));
    cfg.startLevel = nivel;
    g.newGame(des ? { players: n, hab: true, cfg: cfg, roles: roles, loadouts: cargas }
                  : { players: n, cfg: cfg });
    if (UI.syncPrompt) UI.syncPrompt();
  }

  function irANivel() {
    if (!jugando()) return;
    var g = G();
    g.level = Math.max(1, parseInt(inp.nivel.value, 10) || 1);
    g.resetLevel();
    g.enterReady(CFG.READY_TICKS);
  }

  function pasarNivel() {
    if (!jugando()) return;
    var g = G();
    if (g.jefe && g.jefe.vivo) J().danar(g, g.jefe.hp, yo(), 'lab', true);
    else g.dotsLeft = 0;
  }

  function sacarHiper() {
    var g = G(), a = A();
    if (!jugando() || !a || !a.on) return;
    if (a.hiperP && !a.hiperP.fin && !a.hiperP.on) { a.hiperP.en = 1; return; }
    var c = null;
    for (var d = 0; d < 4 && !c; d++) c = a.casillaAdelante(g, yo(), 4, d);
    if (!c) return;
    a.hiperP = { c: c.c, r: c.r, en: 1, on: 0, fin: 0 };
  }

  var ACC = {
    darHiper: function () { var s = est(); if (s) s.hiper = 1; },
    sacarHiper: sacarHiper,
    recargar: function () { var a = A(); if (a && a.on) a.st.forEach(function (s) { s.cd = [0, 0, 0, 0]; }); },
    vida: function () {
      if (!jugando()) return;
      var g = G();
      if (g.playerCount > 1 && g.livesMode === 'individual') g.pacs[yo()].lives++;
      else g.lives++;
    },
    puntos: function () { if (jugando()) G().addScore(10000, yo()); },
    reyUno: function () { var g = G(); if (g.jefe && g.jefe.vivo) g.jefe.hp = 1; },
    reyQuieto: function () { if (G().jefe) J().congelar(G(), 600); },
    reyMuere: function () { var g = G(); if (g.jefe && g.jefe.vivo) J().danar(g, g.jefe.hp, yo(), 'lab', true); },
    reySuelta: function () { if (G().jefe && J().soltarUno) J().soltarUno(G()); },
    azules: function () { if (jugando()) G().triggerFright(10); },
    hielo: function () {
      var a = A(), g = G();
      if (!jugando() || !a || !a.on) return;
      for (var i = 0; i < 4; i++) if (a.enLaCalle(g.ghosts[i])) a.hielo[i] = 600;
    },
    aCasa: function () {
      if (!jugando()) return;
      G().ghosts.forEach(function (gh) { if (gh.mode === 'normal' || gh.mode === 'leaving') gh.eaten(); });
    },
    irANivel: irANivel,
    pasarNivel: pasarNivel,
    empezar: empezar,
    menu: function () { if (G().toMenu) G().toMenu(); },
    pestana: function () { window.open(window.location.href, '_blank'); }
  };

  /* ---------- el panel ---------- */
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function soltarFoco(e) { if (e && e.blur) e.blur(); }

  var caja = el('div'); caja.id = 'labPanel';
  /* LA CABECERA ES EL DESPLEGABLE: plegado queda en una pastilla con el
   * estado en una línea; al pulsarla se abre el panel entero */
  var cab = el('button', 'lab-cab');
  cab.type = 'button';
  cab.appendChild(el('span', 'lab-logo', 'LAB'));
  var resumen = el('span', 'lab-resumen', '');
  cab.appendChild(resumen);
  cab.appendChild(el('span', 'lab-flecha', ''));
  cab.title = 'Abrir o plegar el laboratorio (F2 lo esconde del todo)';
  function plegar() {
    guardado.plegado = caja.classList.toggle('lab-plegado');
    guardar();
  }
  cab.addEventListener('click', function () { plegar(); soltarFoco(cab); });
  caja.appendChild(cab);
  /* EL ASA: la pestaña que asoma por el borde. Con la barra recogida es lo
   * único que queda a la vista, pegado a la izquierda de la pantalla. */
  var asa = el('button', 'lab-asa');
  asa.type = 'button';
  asa.title = 'Abrir o recoger el laboratorio';
  asa.appendChild(el('span', 'lab-asa-txt', 'LAB'));
  asa.appendChild(el('span', 'lab-flecha', ''));
  asa.addEventListener('click', function () { plegar(); soltarFoco(asa); });
  caja.appendChild(asa);
  var cuerpo = el('div', 'lab-cuerpo');
  caja.appendChild(cuerpo);
  var estado = el('div', 'lab-estado', '');
  cuerpo.appendChild(estado);
  if (!guardado.sec) guardado.sec = {};

  /* Cada apartado se abre y se cierra por su cuenta, y se acuerda */
  function seccion(titulo, abierta) {
    var s = el('div', 'lab-sec'), tit = el('button', 'lab-tit'), dentro = el('div', 'lab-dentro');
    tit.type = 'button';
    tit.appendChild(el('span', '', titulo));
    tit.appendChild(el('span', 'lab-flecha', ''));
    var on = guardado.sec.hasOwnProperty(titulo) ? !!guardado.sec[titulo] : !!abierta;
    s.classList.toggle('lab-abierta', on);
    tit.addEventListener('click', function () {
      guardado.sec[titulo] = s.classList.toggle('lab-abierta');
      guardar(); soltarFoco(tit);
    });
    s.appendChild(tit); s.appendChild(dentro);
    cuerpo.appendChild(s);
    return dentro;
  }
  function boton(dentro, txt, acc, cls) {
    var b = el('button', 'lab-b' + (cls ? ' ' + cls : ''), txt);
    b.type = 'button';
    b.addEventListener('click', function () { ACC[acc](); soltarFoco(b); pintarEstado(); });
    dentro.appendChild(b);
    return b;
  }
  function fila(dentro, etiqueta) {
    var f = el('label', 'lab-fila');
    f.appendChild(el('span', '', etiqueta));
    dentro.appendChild(f);
    return f;
  }
  function selector(dentro, etiqueta, opciones, valor) {
    var f = fila(dentro, etiqueta), s = el('select');
    opciones.forEach(function (o) {
      var op = el('option', '', o[1]); op.value = o[0]; s.appendChild(op);
    });
    if (valor != null) s.value = valor;
    s.addEventListener('change', function () { soltarFoco(s); });
    f.appendChild(s);
    return s;
  }
  function casilla(dentro, etiqueta, clave) {
    var f = el('label', 'lab-chk'), c = el('input');
    c.type = 'checkbox';
    c.checked = !!fijos[clave];
    c.addEventListener('change', function () { fijos[clave] = c.checked; soltarFoco(c); });
    f.appendChild(c); f.appendChild(el('span', '', etiqueta));
    dentro.appendChild(f);
    return c;
  }

  var sel = { hab: [] }, inp = {}, chk = {};

  /* --- arrancar --- */
  var sA = seccion('ARRANCAR UNA PARTIDA', true);
  var fDes = el('label', 'lab-chk');
  chk.desatado = el('input'); chk.desatado.type = 'checkbox';
  chk.desatado.checked = guardado.des !== false;
  fDes.appendChild(chk.desatado); fDes.appendChild(el('span', '', 'DESATADO (sin marcar: clásico)'));
  sA.appendChild(fDes);
  sel.rol = selector(sA, 'ROL', H.ROL_IDS.map(function (r) {
    return [r, (H.ROL_INFO[r] && H.ROL_INFO[r].name) || r.toUpperCase()];
  }), guardado.rol || 'asesino');
  var cajaHab = el('div'); sA.appendChild(cajaHab);
  function pintarCarga(carga) {
    cajaHab.innerHTML = '';
    sel.hab = [];
    var cat = H.catalogoDe(sel.rol.value), ids = String(carga || '').split(',');
    for (var k = 0; k < 4; k++) {
      var s = selector(cajaHab, 'QWER'.charAt(k), cat[k].map(function (h) { return [h.id, h.name]; }));
      if (ids[k] && cat[k].some(function (h) { return h.id === ids[k]; })) s.value = ids[k];
      sel.hab.push(s);
    }
  }
  pintarCarga(guardado.carga);
  sel.rol.addEventListener('change', function () { pintarCarga(''); });
  var fN = fila(sA, 'NIVEL');
  inp.nivel = el('input'); inp.nivel.type = 'number'; inp.nivel.min = 1; inp.nivel.max = 255;
  inp.nivel.value = guardado.nivel || 20;
  /* que escribir el nivel no mueva a Pac-Man ni lance poderes */
  ['keydown', 'keyup', 'keypress'].forEach(function (ev) {
    inp.nivel.addEventListener(ev, function (e) { e.stopPropagation(); });
  });
  fN.appendChild(inp.nivel);
  sel.jug = selector(sA, 'JUGADORES', [['1', '1'], ['2', '2 (mismo teclado)']], String(guardado.jug || 1));
  var fB = el('div', 'lab-botones'); sA.appendChild(fB);
  boton(fB, 'EMPEZAR', 'empezar', 'lab-ppal');
  boton(fB, 'IR A ESE NIVEL', 'irANivel');
  boton(fB, 'PASAR DE NIVEL', 'pasarNivel');
  boton(fB, 'AL MENÚ', 'menu');

  /* --- fijos --- */
  var sF = seccion('TRUCOS FIJOS', true);
  casilla(sF, 'INMORTAL', 'inmortal');
  casilla(sF, 'SIN RECARGAS', 'sinRecarga');
  casilla(sF, 'HIPERPASTILLA SIEMPRE', 'hiper');

  /* --- hiperpastilla y poderes --- */
  var sH = seccion('HIPERPASTILLA Y PODERES');
  var bH = el('div', 'lab-botones'); sH.appendChild(bH);
  boton(bH, 'DÁRMELA', 'darHiper');
  boton(bH, 'QUE SALGA YA', 'sacarHiper');
  boton(bH, 'RECARGAR TODO', 'recargar');
  boton(bH, '+1 VIDA', 'vida');
  boton(bH, '+10.000', 'puntos');

  /* --- rey y fantasmas --- */
  var sR = seccion('REY FANTASMA');
  var bR = el('div', 'lab-botones'); sR.appendChild(bR);
  boton(bR, 'A 1 DE VIDA', 'reyUno');
  boton(bR, 'QUIETO 10 S', 'reyQuieto');
  boton(bR, 'QUE SUELTE UNO', 'reySuelta');
  boton(bR, 'TUMBARLO', 'reyMuere');
  var sG = seccion('FANTASMAS');
  var bG = el('div', 'lab-botones'); sG.appendChild(bG);
  boton(bG, 'AZULES 10 S', 'azules');
  boton(bG, 'CONGELAR 10 S', 'hielo');
  boton(bG, 'A CASA', 'aCasa');

  /* --- velocidad --- */
  var sV = seccion('VELOCIDAD DEL JUEGO');
  var bV = el('div', 'lab-botones lab-vel'); sV.appendChild(bV);
  var botonesVel = [];
  [0.25, 0.5, 1, 2, 4].forEach(function (v) {
    var b = el('button', 'lab-b', 'x' + v);
    b.type = 'button';
    b.addEventListener('click', function () {
      G().timeScale = v;
      botonesVel.forEach(function (o) { o.b.classList.toggle('lab-on', o.v === v); });
      soltarFoco(b);
    });
    botonesVel.push({ b: b, v: v });
    if (v === 1) b.classList.add('lab-on');
    bV.appendChild(b);
  });

  /* --- party --- */
  var sP = seccion('PARTY ENTRE PESTAÑAS');
  var bP = el('div', 'lab-botones'); sP.appendChild(bP);
  boton(bP, 'ABRIR OTRA PESTAÑA', 'pestana');
  sP.appendChild(el('div', 'lab-nota', 'Crea la sala en una y entra con el código en la otra. Los trucos, desde la del anfitrión.'));

  /* ---------- lo que está pasando ---------- */
  function pintarEstado() {
    var g = G(), a = A(), l = [];
    if (!jugando()) { estado.textContent = 'sin partida'; resumen.textContent = 'sin partida'; return; }
    l.push('nivel ' + g.level + ' · ' + g.state + ' · ' + Math.floor((g.timeTicks || 0) / 60) + ' s');
    if (g.jefe) l.push('rey: ' + (g.jefe.vivo ? g.jefe.hp + ' / ' + g.jefe.max : 'tumbado'));
    if (a && a.on) {
      var hp = a.hiperP, s = est();
      l.push('hiperpastilla: ' + (!hp ? 'no toca en este nivel'
        : hp.fin ? 'ya se comió'
        : hp.on ? 'en el suelo (' + hp.c + ', ' + hp.r + ')'
        : 'sale en ' + Math.ceil(hp.en / 60) + ' s en (' + hp.c + ', ' + hp.r + ')'));
      if (s) {
        var pot = Object.keys(s.pot || {}).filter(function (k) { return s.pot[k]; });
        l.push('la llevo: ' + (s.hiper ? 'SÍ' : 'no') + (pot.length ? ' · a x2: ' + pot.join(', ') : ''));
      }
    }
    estado.textContent = l.join('\n');
    var act = Object.keys(fijos).filter(function (k) { return fijos[k]; }).length;
    resumen.textContent = 'nivel ' + g.level + (g.jefe && g.jefe.vivo ? ' · rey ' + g.jefe.hp : '') + (act ? ' · ' + act + ' trucos' : '');
  }
  setInterval(pintarEstado, 250);

  function montar() {
    document.body.appendChild(caja);
    if (guardado.oculto) caja.classList.add('lab-oculto');
    if (guardado.plegado) caja.classList.add('lab-plegado');
    pintarEstado();
  }
  if (document.body) montar(); else window.addEventListener('DOMContentLoaded', montar);
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'F2') return;
    e.preventDefault();
    guardado.oculto = !caja.classList.toggle('lab-oculto') ? false : true;
    guardar();
  });

  PM.Lab = { acciones: ACC, fijos: fijos };
})();
