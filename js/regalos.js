/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/regalos.js
 * REGALAR una pieza de la TIENDA a un amigo. Define window.PM.Regalos
 *
 * Lo decidido (29 sep 2026):
 *   · Desde la ficha de una pieza de TIENDA (nunca de cofre, pase ni
 *     rango): botón REGALAR -> eliges a un amigo -> REGALAR · precio ->
 *     ¿GASTAR 450? (pagar en dos pasos, como CONTINUAR).
 *   · AMISTAD MUTUA: los dos tienen al otro en su lista. Con que solo el que
 *     regala tuviera al otro, cualquiera podría mandar avisos con su nombre
 *     a quien quisiera; con que solo el receptor, no se sabría a quién
 *     elegir. Mutua es lo que no se presta a abusos.
 *   · SE REGALA CON LO GANADO: las 1.500 monedas de salida no se regalan
 *     (si no, cada cuenta nueva sería una skin gratis para otra). Y como
 *     mucho 5 regalos al día.
 *   · Lo hace TODO el servidor (Edge Function `regalos`, supabase/tienda.sql):
 *     mira el saldo, que el amigo no la tenga, cobra al que regala
 *     (`gastoRegalo`, que Tienda cuenta como gastado) y entrega la pieza al
 *     otro (`c_<id>` y `rgl_<id>`: es suya y no la pagó él).
 *   · El receptor ve "X TE HA REGALADO …" la próxima vez que abra el juego
 *     (o al volver al menú): va a la cola de celebraciones (js/celebrar.js),
 *     que sobrevive a cerrar el juego.
 *   · Pide cuenta: sin cuenta no hay amigos en la nube ni a quién entregar.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  function Ac() { return window.PM.Account; }
  function Tn() { return window.PM.Tienda; }
  function A() { return window.PM.Achievements; }
  function logged() {
    var a = Ac();
    try { return !!(a && a.logged && a.logged()); } catch (e) { return false; }
  }
  function miles(n) {
    return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function el(tag, cls, txt) {
    var x = document.createElement(tag);
    if (cls) x.className = cls;
    if (txt != null) x.textContent = txt;
    return x;
  }

  var ESTADOS = {
    ok: '',
    sin_cuenta: 'SIN CUENTA',
    no_mutuo: 'NO TE TIENE EN SU LISTA',
    ya_la_tiene: 'YA LA TIENE'
  };
  var CATS = { skin: 'LA SKIN', accesorio: 'EL ACCESORIO', efecto: 'EL EFECTO', emote: 'EL EMOTE' };

  var Regalos = {
    ESTADOS: ESTADOS,

    /* ---------- el servidor ----------
     * `enviar(cuerpo)` -> promesa de { ok, status, d }. Las pruebas la
     * cambian por una de mentira. */
    enviar: function (cuerpo) {
      var a = Ac(), cfg = window.PM.NET_CFG || {};
      if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY || !window.fetch || !a || !a.pedir) {
        return Promise.resolve({ ok: false, status: 0, d: { error: 'SIN CONEXIÓN' } });
      }
      var url = String(cfg.SUPABASE_URL).replace(/\/+$/, '') + '/functions/v1/regalos';
      return a.pedir(url, {
        method: 'POST',
        headers: { 'apikey': cfg.SUPABASE_KEY, 'Content-Type': 'application/json',
                   'Authorization': 'Bearer ' + (a.token || cfg.SUPABASE_KEY) },
        body: JSON.stringify(cuerpo)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          return { ok: res.ok && !!(d && d.ok), status: res.status, d: d || {} };
        });
      }).catch(function () { return { ok: false, status: 0, d: { error: 'SIN CONEXIÓN' } }; });
    },

    /* ¿Se puede regalar esta pieza? (solo lo que se vende) */
    puede: function (id) {
      var T = Tn();
      return !!(T && T.regalable && T.regalable(id));
    },

    /* Los amigos y si pueden recibirla. Antes se sube lo de aquí (en la cola
     * de la cuenta), para que el servidor cuente lo ganado hasta ahora. */
    amigos: function (id) {
      var a = Ac(), self = this;
      if (!logged()) return Promise.resolve({ ok: false, d: { error: 'ENTRA EN TU CUENTA PARA REGALAR' } });
      if (a.pushQuiet) a.pushQuiet();
      var pide = function () { return self.enviar({ op: 'amigos', pieza: id }); };
      return a.enCola ? a.enCola(pide) : pide();
    },

    /* Regalar. Lo que devuelve el servidor (gastoRegalo) se toma aquí. */
    regalar: function (para, id) {
      var a = Ac(), self = this;
      if (!logged()) return Promise.resolve({ ok: false, d: { error: 'ENTRA EN TU CUENTA PARA REGALAR' } });
      var pide = function () {
        return self.enviar({ op: 'regalar', para: para, pieza: id }).then(function (r) {
          if (r.ok && r.d.logros && A() && A().tomar) A().tomar(r.d.logros);
          return r;
        });
      };
      return a.enCola ? a.enCola(pide) : pide();
    },

    /* ---------- los avisos del que recibe ----------
     * Se preguntan al entrar (y al volver al menú, como mucho cada minuto):
     * lo nuevo va a la cola de celebraciones, sus piezas se toman aquí y el
     * servidor lo da por visto. */
    ULTIMA: 0,
    CADA_MS: 60000,
    buscando: false,
    buscarAvisos: function (forzar) {
      var a = Ac(), self = this, ahora = Date.now();
      /* una búsqueda colgada (la red no contestó) no bloquea las siguientes */
      if (!logged() || (this.buscando && ahora - this.buscando < 20000)) return Promise.resolve(0);
      /* con cuenta, después de fundir la nube en esta sesión: así las piezas
       * que traiga ya encuentran la cuenta de aquí al día */
      if (!(a.user && a.fundido === a.user.id)) return Promise.resolve(0);
      if (!forzar && ahora - this.ULTIMA < this.CADA_MS) return Promise.resolve(0);
      this.ULTIMA = ahora;
      this.buscando = ahora;
      return this.enviar({ op: 'avisos' }).then(function (r) {
        self.buscando = false;
        var lista = (r.ok && r.d && r.d.avisos) || [];
        if (!lista.length) return 0;
        if (r.d.logros && A() && A().tomar) A().tomar(r.d.logros);
        var C = window.PM.Celebrar;
        if (C && C.regalos) C.regalos(lista);
        var hasta = 0;
        lista.forEach(function (x) { hasta = Math.max(hasta, Math.floor(x.n || 0)); });
        if (hasta > 0) self.enviar({ op: 'vistos', hasta: hasta });
        var UI = window.PM.UI;
        if (UI) {
          if (UI.refreshMarquesina) UI.refreshMarquesina();
          if (UI.celebrarSiToca) UI.celebrarSiToca();
        }
        return lista.length;
      }, function () { self.buscando = false; return 0; });
    },

    /* al volver al menú (ui.js, showMenu y al entrar en la cuenta) */
    alMenu: function (UI, forzar) {
      this.buscarAvisos(forzar);
    },

    /* ============================================================
     * LA PANTALLA: una capa dentro de la ficha
     * ============================================================ */

    /* El botón REGALAR de la ficha (ui.js, refreshFicha), o null */
    boton: function (UI, it) {
      var self = this;
      if (!it || !this.puede(it.id)) return null;
      var b = UI.makeButton('REGALAR', function () {
        if (UI.resumeAudio) UI.resumeAudio();
        if (!logged()) {
          if (UI.fichaAvisa) UI.fichaAvisa('ENTRA EN TU CUENTA PARA REGALAR', true);
          return;
        }
        self.abrir(UI, it);
      });
      b.classList.add('btn-preset', 'ficha-regalar');
      b.title = 'REGALÁRSELO A UN AMIGO';
      return b;
    },

    abrir: function (UI, it) {
      var self = this, f = UI.ficha;
      if (!f || !f.win) return false;
      this.cerrar(UI);
      var capa = el('div', 'rg-capa');
      capa.setAttribute('role', 'dialog');
      capa.setAttribute('aria-modal', 'true');
      capa.setAttribute('aria-label', 'Regalar ' + it.name);
      var caja = el('div', 'rg-caja');
      capa.appendChild(caja);
      caja.appendChild(el('div', 'rg-titulo', 'REGALAR'));
      var cab = el('div', 'rg-pieza');
      cab.appendChild(el('span', 'rg-nombre', it.name));
      if (UI.precioEl) cab.appendChild(UI.precioEl(it.precio));
      caja.appendChild(cab);
      var nota = el('div', 'rg-nota', 'SE REGALA CON LO GANADO · LAS ' + miles(CFG.TIENDA.INICIALES) +
        ' DE SALIDA NO SE REGALAN · SOLO ENTRE AMIGOS (CADA UNO EN LA LISTA DEL OTRO)');
      caja.appendChild(nota);
      var lista = el('div', 'rg-lista');
      lista.setAttribute('role', 'listbox');
      lista.appendChild(el('div', 'rg-cargando', 'BUSCANDO A TUS AMIGOS…'));
      caja.appendChild(lista);
      var aviso = el('div', 'rg-aviso', '');
      aviso.setAttribute('aria-live', 'polite');
      caja.appendChild(aviso);
      var pie = el('div', 'rg-pie');
      var cancelar = UI.makeButton('CANCELAR', function () { self.cerrar(UI); });
      cancelar.classList.add('btn-preset');
      var dar = el('button', 'btn rg-dar');
      dar.type = 'button';
      dar.disabled = true;
      dar.textContent = 'ELIGE A UN AMIGO';
      pie.appendChild(cancelar);
      pie.appendChild(dar);
      caja.appendChild(pie);
      /* las teclas se quedan aquí: ESC cierra esto (no la ficha) y las
       * flechas no pasan de pieza por detrás */
      capa.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { self.cerrar(UI); if (ev.preventDefault) ev.preventDefault(); }
        if (ev.stopPropagation) ev.stopPropagation();
      });
      capa.addEventListener('click', function (ev) { if (ev.target === capa) self.cerrar(UI); });
      f.win.appendChild(capa);
      var st = { it: it, capa: capa, lista: lista, aviso: aviso, dar: dar, para: '', armado: false,
                 libre: 0, datos: null, enviando: false };
      this.st = st;
      try { cancelar.focus(); } catch (e) { /* sin foco */ }

      dar.addEventListener('click', function () {
        if (!st.para || st.enviando) return;
        if (!st.armado) {       // primer toque: pregunta
          st.armado = true;
          self.pintarDar(st);
          return;
        }
        st.enviando = true;
        self.pintarDar(st);
        self.regalar(st.para, it.id).then(function (r) {
          st.enviando = false;
          if (self.st !== st) return;
          if (!r.ok) {
            st.armado = false;
            self.avisar(st, (r.d && r.d.error) || 'NO SE PUDO REGALAR', true);
            self.pintarDar(st);
            return;
          }
          if (window.AudioSys && AudioSys.playEatFruit) { try { AudioSys.playEatFruit(); } catch (e) { /* sin sonido */ } }
          var quien = r.d.para || st.para;
          self.cerrar(UI);
          if (UI.fichaAvisa) UI.fichaAvisa('¡' + it.name + ' REGALADO A ' + quien + '! LO VERÁ AL ABRIR EL JUEGO', false);
          if (UI.refreshFicha) UI.refreshFicha();
          if (UI.refreshMarquesina) UI.refreshMarquesina();
        });
      });

      this.amigos(it.id).then(function (r) {
        if (self.st !== st) return;
        self.pintarLista(UI, st, r);
      });
      return true;
    },

    cerrar: function (UI) {
      var st = this.st;
      this.st = null;
      if (st && st.capa && st.capa.parentNode) st.capa.parentNode.removeChild(st.capa);
      /* el foco, de vuelta al botón REGALAR de la ficha */
      var b = UI && UI.ficha && UI.ficha.win && UI.ficha.win.querySelector &&
        UI.ficha.win.querySelector('.ficha-regalar');
      if (b && b.focus) { try { b.focus(); } catch (e) { /* ya no está */ } }
    },

    avisar: function (st, texto, error) {
      st.aviso.textContent = texto || '';
      st.aviso.classList.toggle('error', !!error);
    },

    pintarDar: function (st) {
      var b = st.dar, p = st.it.precio;
      b.textContent = '';
      b.classList.toggle('armado', !!st.armado);
      if (!st.para) { b.disabled = true; b.textContent = 'ELIGE A UN AMIGO'; return; }
      if (st.libre < p) { b.disabled = true; b.textContent = 'NO TE ALCANZA'; return; }
      b.disabled = !!st.enviando;
      if (st.enviando) { b.textContent = 'REGALANDO…'; return; }
      if (st.armado) {
        b.textContent = '¿GASTAR ' + miles(p) + '? · SÍ, A ' + st.para;
        return;
      }
      b.appendChild(document.createTextNode('REGALAR A ' + st.para + ' '));
      var UI = window.PM.UI;
      if (UI && UI.precioEl) b.appendChild(UI.precioEl(p));
    },

    pintarLista: function (UI, st, r) {
      var self = this, d = (r && r.d) || {};
      st.lista.textContent = '';
      if (!r || !r.ok) {
        st.lista.appendChild(el('div', 'rg-vacio', d.error || 'NO SE PUDO PREGUNTAR: INTÉNTALO OTRA VEZ'));
        return;
      }
      st.datos = d;
      st.libre = Math.floor(d.disponible || 0);
      var quedan = Math.max(0, (d.tope || 0) - (d.hoy || 0));
      this.avisar(st, 'PUEDES REGALAR HASTA ' + miles(Math.max(0, st.libre)) + ' MONEDAS · ' +
        (quedan === 1 ? 'TE QUEDA 1 REGALO HOY' : 'TE QUEDAN ' + quedan + ' REGALOS HOY'), false);
      if (st.libre < st.it.precio) {
        this.avisar(st, 'TE FALTAN ' + miles(st.it.precio - st.libre) + ' MONEDAS GANADAS PARA REGALARLA', true);
      } else if (!quedan) {
        this.avisar(st, 'YA HAS HECHO ' + (d.tope || 0) + ' REGALOS HOY: MAÑANA MÁS', true);
      }
      var amigos = d.amigos || [];
      if (!amigos.length) {
        st.lista.appendChild(el('div', 'rg-vacio',
          'AÚN NO TIENES AMIGOS EN TU LISTA. AÑÁDELOS EN AMIGOS (Y QUE ELLOS TE AÑADAN A TI)'));
        return;
      }
      /* primero los que pueden recibirla */
      amigos.sort(function (a, b) {
        return (a.estado === 'ok' ? 0 : 1) - (b.estado === 'ok' ? 0 : 1) || (a.usuario < b.usuario ? -1 : 1);
      });
      amigos.forEach(function (am) {
        var b = el('button', 'rg-amigo' + (am.estado === 'ok' ? '' : ' no'));
        b.type = 'button';
        b.setAttribute('role', 'option');
        b.disabled = am.estado !== 'ok' || !quedan || st.libre < st.it.precio;
        b.appendChild(el('span', 'rg-amigo-n', am.usuario));
        if (ESTADOS[am.estado]) b.appendChild(el('small', 'rg-amigo-e', ESTADOS[am.estado]));
        b.addEventListener('click', function () {
          st.para = am.usuario;
          st.armado = false;
          var todos = st.lista.querySelectorAll ? st.lista.querySelectorAll('.rg-amigo') : [];
          for (var i = 0; i < todos.length; i++) {
            todos[i].classList.remove('elegido');
            todos[i].setAttribute('aria-selected', 'false');
          }
          b.classList.add('elegido');
          b.setAttribute('aria-selected', 'true');
          self.pintarDar(st);
        });
        st.lista.appendChild(b);
      });
      this.pintarDar(st);
    },

    /* ---------- la celebración del que recibe (js/celebrar.js) ---------- */
    celebrar: function (UI, e) {
      var lista = (e && e.lista) || [], T = Tn();
      if (!lista.length || !UI || !UI.showPrompt) return false;
      if (window.AudioSys) { try { AudioSys.playIntro(); } catch (err) { /* sin sonido */ } }
      var primera = T && T.item(lista[0].pieza);
      var botones = [{ label: 'SEGUIR', primary: true, keys: ['Enter', 'Escape', ' '], hint: 'ENTER',
        onClick: function () { UI.hidePrompt(); UI.celebrarSiToca(); } }];
      if (primera && UI.showVestuario) {
        botones.push({ label: 'AL VESTUARIO', keys: ['v'], hint: 'V',
          onClick: function () { UI.hidePrompt(); UI.showVestuario(primera.cat, 'yo'); } });
      }
      UI.showPrompt({
        title: lista.length > 1 ? '¡REGALOS!' : '¡UN REGALO!',
        arcade: true,
        tono: 'cian',
        clase: 'rg-prompt',
        custom: function (p) {
          var tt = p.querySelector('.panel-title');
          if (tt && UI.ajustarTituloLvl) { tt.classList.add('lvl-titulo'); UI.ajustarTituloLvl(tt); }
          var caja = el('div', 'rg-cel');
          var lupas = [];
          lista.forEach(function (x) {
            var it = T && T.item(x.pieza);
            var fila = el('div', 'rg-cel-fila');
            var cv = document.createElement('canvas');
            cv.width = 96; cv.height = 96;
            cv.className = 'rg-cel-lupa';
            cv.setAttribute('aria-hidden', 'true');
            fila.appendChild(cv);
            var txt = el('div', 'rg-cel-txt');
            txt.appendChild(el('b', 'rg-cel-de', String(x.de || '').toUpperCase()));
            txt.appendChild(el('span', 'rg-cel-dice', ' TE HA REGALADO ' + (it ? (CATS[it.cat] || '') + ' ' : '')));
            txt.appendChild(el('b', 'rg-cel-pieza', it ? it.name : String(x.pieza || '').toUpperCase()));
            fila.appendChild(txt);
            caja.appendChild(fila);
            if (it) lupas.push({ cv: cv, it: it });
          });
          caja.appendChild(el('div', 'rg-cel-nota', 'YA ES TUYO · NO TE HA COSTADO NADA'));
          p.appendChild(caja);
          Regalos.animar(caja, lupas);
        },
        buttons: botones
      });
      return true;
    },

    /* Las piezas del aviso, en movimiento mientras se vea (como la tienda) */
    animar: function (caja, lupas) {
      var Sk = window.PM.Skins, raf = window.requestAnimationFrame;
      if (!Sk || !Sk.escena || !raf || !lupas.length) return;
      var tmp = document.createElement('canvas');
      tmp.width = Sk.ESCENA_W; tmp.height = Sk.ESCENA_H;
      var origen = Date.now();
      function paso() {
        if (!caja.parentNode || !document.body.contains(caja)) return;
        var t = (Date.now() - origen) / 1000, s = window.PM.settings || {};
        var color = s.pacColor || '#ffff00';
        var mia = (CFG.SKIN_IDS.indexOf(s.skin1) !== -1) ? s.skin1 : 'clasico';
        lupas.forEach(function (l, i) {
          var it = l.it, tt = t + i * 0.37;
          var conAcc = window.PM.Sprites.admiteAccesorio(mia) ? mia : 'clasico';
          var skin = (it.cat === 'skin') ? it.id : (it.cat === 'accesorio') ? conAcc : mia;
          try {
            var pos = Sk.escena(tmp, skin, color, tt * 44, tt, {
              efecto: it.cat === 'efecto' ? it.id : null,
              accesorio: it.cat === 'accesorio' ? it.id : null,
              emote: it.cat === 'emote' ? it.id : null
            });
            Sk.lupa(l.cv, tmp, pos, it.cat === 'efecto' ? 5 : 0, it.cat === 'emote' ? 19 : 0);
          } catch (e) { /* sin lienzo */ }
        });
        raf(paso);
      }
      raf(paso);
    }
  };

  window.PM.Regalos = Regalos;
})();
