/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/pasos.js
 * PRIMEROS PASOS: ocho misiones para los primeros días.
 * Define window.PM.Pasos
 *
 * Lo decidido (PROPUESTAS-2026-09-29.md, punto 2, opción A; CFG.PASOS):
 *   una partida de más de 1 minuto 100 · 3 fantasmas con un energizante 100
 *   · DESATADO usando Q, W, E y R 150 · crear cuenta (sus cofres de
 *   bienvenida) · el reto BÁSICO del DAILY 150 · ponerse algo del vestuario
 *   100 · probar LABERINTOS o CACERÍA 150 · las 5 de colocación de la
 *   CLASIFICATORIA 300 · y completarlas todas, un cofre de PLATA.
 *
 * QUIÉN LAS TIENE. Quien llegó a los cofres con menos de 20 partidas: se
 * mira la BASE de los cofres (js/cofres.js), que en una cuenta pone el
 * servidor. Así un veterano no las cobra por abrir el juego en un aparato
 * nuevo y entrar en su cuenta, y el servidor puede comprobar lo mismo.
 *
 * LO YA HECHO CUENTA. Cada misión se deduce de contadores que ya existían
 * (js/cofres-gen.js, pasosHechos), así que quien las recibe con alguna ya
 * cumplida la cobra en el acto. No hay nada que sembrar: solo `vestido`, que
 * se apunta la primera vez que se ve algo puesto.
 *
 * SE COBRAN UNA VEZ. Cada misión pagada deja su bandera `paso_<id>` (un
 * máximo: juntar dos aparatos no la cobra dos veces). El pago va por
 * Tienda.ganar, como el DAILY. Con cuenta se espera a haber fundido la nube
 * en esta sesión (Account.fundido): si no, un segundo aparato que aún no
 * sabe que otro ya la cobró la volvería a pagar y la nube sumaría las dos.
 *
 * SIN CUENTA EN DOS APARATOS (29 sep): cada uno podía cobrar la misma misión
 * y, al unirlos a una cuenta, la nube SUMABA los dos pagos (hasta 1.050
 * monedas de más). Ahora cada pago deja apuntado lo que pagó este aparato
 * (`pasoMon_<id>` en monedas y `pasoPx_<id>` en experiencia del pase, que se
 * suman entre aparatos) y, al fundir con la cuenta, si la nube ya tenía esa
 * misión cobrada, lo pagado aquí no se le suma (Account.quitarPasosDobles).
 * Cada misión se paga una vez por cuenta; lo demás jugado aquí se suma igual.
 *
 * EL COFRE lo reparte el servidor como todos (Cofres.ganados lo cuenta con
 * pasosCofre, que es el mismo código en la función `cofres`). Pide cuenta,
 * que además es una de las misiones.
 *
 * DÓNDE SE VE. Un recuadro en la portada (en la ficha en pantalla ancha;
 * DEBAJO de JUGAR en el móvil, para no empujarlo), el panel #pasos con la
 * lista, un aviso en la banda de la partida al cumplir una jugando y, fuera
 * de partida, una celebración (js/celebrar.js, en su cola). El recuadro se
 * va al completarlas o pasadas CFG.PASOS.OCULTAR_EN partidas; lo que falte
 * sigue contando y pagando igual.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var P = CFG.PASOS;

  function A() { return window.PM.Achievements; }
  function Ac() { return window.PM.Account; }
  function K() { return window.PM.Cofres; }
  function Gn() { return window.PM.CofresGen; }
  function logged() {
    var a = Ac();
    try { return !!(a && a.logged && a.logged()); } catch (e) { return false; }
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

  var Pasos = {
    LISTA: P.LISTA,

    datos: function () { return K() ? K().datos() : null; },

    /* ¿Es de los que tienen PRIMEROS PASOS? */
    nuevo: function () {
      var k = K(), g = Gn();
      if (!k || !g || !A()) return false;
      return g.pasosNuevo(k.base(), k.datos());
    },

    /* Qué misiones están cumplidas: { id: true/false } */
    hechos: function (c) {
      return Gn().pasosHechos(c || A().stats(), this.datos(), logged());
    },

    /* ¿Lleva algo del vestuario puesto AHORA? (skin, color, accesorio,
     * efecto, emotes o avatar distintos de los de salida) */
    vestidoAhora: function () {
      var s = window.PM.settings || {}, D = CFG.DEFAULT_SETTINGS, Tn = window.PM.Tienda;
      if (s.skin1 && s.skin1 !== D.skin1) return true;
      if (s.pacColor && String(s.pacColor).toLowerCase() !== String(D.pacColor).toLowerCase()) return true;
      if (s.avatar && s.avatar !== D.avatar) return true;
      if (Tn && (Tn.accesorio() || Tn.efecto())) return true;
      if (s.emotes1 && Tn && Tn.emotes().join(',') !== D.emotes1) return true;
      return false;
    },

    /* Todo lo que enseña la pantalla, de una vez */
    estado: function () {
      var c = A() ? A().stats() : {}, h = this.hechos(c), n = 0;
      var lista = P.LISTA.map(function (m) {
        var hecho = !!h[m.id];
        if (hecho) n++;
        return { id: m.id, name: m.name, monedas: m.monedas, premio: m.premio || '',
                 hecho: hecho, cobrado: (c['paso_' + m.id] || 0) >= 1 };
      });
      var nuevo = this.nuevo(), todas = n === P.LISTA.length;
      return {
        lista: lista, hechas: n, total: P.LISTA.length, todas: todas, nuevo: nuevo,
        partidas: c.partidas || 0,
        visible: nuevo && !todas && (c.partidas || 0) < P.OCULTAR_EN,
        siguiente: lista.filter(function (x) { return !x.hecho; })[0] || null
      };
    },

    visible: function () { return this.estado().visible; },

    /* Con cuenta, solo se cobra cuando ya se ha fundido la nube en esta
     * sesión (ver la cabecera). Sin cuenta, siempre. */
    puedeCobrar: function () {
      if (!logged()) return true;
      var a = Ac();
      return !!(a && a.user && a.fundido === a.user.id);
    },

    /* Lo que paga una misión, en texto */
    premioTexto: function (m) {
      return m.monedas > 0 ? ('+' + miles(m.monedas) + ' MONEDAS') : (m.premio || '');
    },

    /* Toda la experiencia del pase apuntada aquí (px_<mes>, todos los meses) */
    pxTotal: function () {
      var c = A() ? A().stats() : {}, n = 0;
      for (var k in c) if (c.hasOwnProperty(k) && /^px_/.test(k)) n += Math.floor(c[k] || 0);
      return n;
    },

    /* Lo cobrado ANTES de que se apuntara lo pagado (29 sep): en un aparato
     * con lo jugado sin cuenta (base de la nube vacía o sin cuenta, ver
     * Account.baseLibre), cada misión con bandera la pagó él, así que se
     * apunta su pago. Con cuenta no: su bandera puede venir de la nube. La
     * experiencia del pase de entonces no se sabe y no se apunta. */
    sembrarPagos: function () {
      var Ach = A(), a = Ac();
      if (!Ach || !a || !a.baseLibre || !a.baseLibre()) return 0;
      var c = Ach.stats(), n = 0;
      for (var i = 0; i < P.LISTA.length; i++) {
        var m = P.LISTA[i];
        if (!(m.monedas > 0) || !((c['paso_' + m.id] || 0) >= 1) || (c['pasoMon_' + m.id] || 0) > 0) continue;
        Ach.record('pasoMon_' + m.id, m.monedas);
        n++;
      }
      return n;
    },

    /* ---------- cobrar ----------
     * Mira las ocho, cobra las cumplidas que aún no se habían cobrado y
     * devuelve { misiones: [lo recién cobrado], monedas, todas } (todas: con
     * esto quedan las ocho) o null si no hay nada nuevo. Se puede llamar
     * cuantas veces se quiera: sin bandera nueva no paga nada. */
    revisar: function () {
      var Ach = A(), Tn = window.PM.Tienda;
      if (!Ach || !this.nuevo() || !this.puedeCobrar()) return null;
      var c = Ach.stats();
      if (!(c.vestido >= 1) && this.vestidoAhora()) {
        Ach.record('vestido', 1);
        c = Ach.stats();
      }
      var h = this.hechos(c), out = { misiones: [], monedas: 0, todas: false }, quedan = 0;
      for (var i = 0; i < P.LISTA.length; i++) {
        var m = P.LISTA[i];
        if ((c['paso_' + m.id] || 0) >= 1) continue;
        if (!h[m.id]) { quedan++; continue; }
        Ach.record('paso_' + m.id, 1);
        if (!(Ach.stats()['paso_' + m.id] >= 1)) { quedan++; continue; }   // sin almacén
        if (m.monedas > 0 && Tn) {
          /* y lo que pagó ESTE aparato, en monedas y en experiencia del pase:
           * si otro aparato ya la cobró, al fundir no se suma (ver cabecera) */
          var px0 = this.pxTotal(), dado = Tn.ganar(m.monedas), px1 = this.pxTotal();
          out.monedas += dado;
          if (dado > 0) Ach.record('pasoMon_' + m.id, dado);
          if (px1 > px0) Ach.record('pasoPx_' + m.id, px1 - px0);
        }
        out.misiones.push(m);
      }
      if (!out.misiones.length) return null;
      out.todas = quedan === 0;
      if (logged() && Ac().pushQuiet) Ac().pushQuiet();
      return out;
    },

    /* Fuera de partida (al volver al menú, al entrar en la cuenta): lo
     * cumplido va a la cola de celebraciones y la portada se pone al día */
    alMenu: function (UI) {
      var G = window.PM.Game;
      if (!(G && ((G.inGame && G.inGame()) || G.replaying))) {
        var res = this.revisar();
        if (res && window.PM.Celebrar && window.PM.Celebrar.pasos) window.PM.Celebrar.pasos(res);
        if (res && UI && UI.refreshMarquesina) UI.refreshMarquesina();
      }
      if (UI) this.refrescarTarjeta(UI);
    },

    /* ============================================================
     * LA PANTALLA
     * ============================================================ */

    /* EL RECUADRO DE LA PORTADA. ui.js lo cuelga en la ficha; en pantalla
     * estrecha se muda debajo de JUGAR (refrescarTarjeta). */
    tarjeta: function (UI) {
      var self = this;
      var b = el('button', 'pp-box');
      b.type = 'button';
      b.style.setProperty('--pc', P.COLOR);
      b.addEventListener('click', function () {
        if (UI.resumeAudio) UI.resumeAudio();
        self.mostrar(UI);
      });
      var cab = el('span', 'pp-box-cab');
      cab.appendChild(el('span', 'pp-box-t', 'PRIMEROS PASOS'));
      var cuenta = el('b', 'pp-box-n', '');
      cab.appendChild(cuenta);
      b.appendChild(cab);
      var pips = el('span', 'pp-pips');
      pips.setAttribute('aria-hidden', 'true');
      var lista = [];
      for (var i = 0; i < P.LISTA.length; i++) lista.push(pips.appendChild(el('i', 'pp-pip')));
      var cofre = pips.appendChild(el('i', 'pp-pip pp-pip-cofre'));
      b.appendChild(pips);
      var sig = el('span', 'pp-box-sig', '');
      b.appendChild(sig);
      b.style.display = 'none';
      UI.pasosTarjeta = { box: b, n: cuenta, pips: lista, cofre: cofre, sig: sig };
      if (!this.oyeAncho && window.addEventListener) {
        this.oyeAncho = true;
        window.addEventListener('resize', function () { self.colocarTarjeta(UI); });
      }
      return b;
    },

    /* En la ficha (pantalla ancha) o debajo de JUGAR (estrecha) */
    colocarTarjeta: function (UI) {
      var t = UI.pasosTarjeta;
      if (!t) return;
      var ancho = (window.innerWidth || 0) >= 1000, box = t.box;
      if (ancho && UI.contBox && UI.contBox.parentNode) {
        if (box.nextSibling !== UI.contBox) UI.contBox.parentNode.insertBefore(box, UI.contBox);
      } else if (!ancho && UI.playBtn && UI.playBtn.parentNode) {
        if (UI.playBtn.nextSibling !== box) UI.playBtn.parentNode.insertBefore(box, UI.playBtn.nextSibling);
      }
    },

    refrescarTarjeta: function (UI) {
      var t = UI && UI.pasosTarjeta;
      if (!t) return;
      var e = this.estado();
      t.box.style.display = e.visible ? '' : 'none';
      if (!e.visible) return;
      this.colocarTarjeta(UI);
      t.n.textContent = e.hechas + '/' + e.total;
      for (var i = 0; i < t.pips.length; i++) {
        t.pips[i].className = 'pp-pip' + (e.lista[i] && e.lista[i].hecho ? ' on' : '');
      }
      var s = e.siguiente;
      t.sig.textContent = s ? (s.name + ' · ' + this.premioTexto(s)) : '';
      t.box.setAttribute('aria-label', 'Primeros pasos: ' + e.hechas + ' de ' + e.total +
        (s ? '. Siguiente: ' + s.name : ''));
    },

    /* ---------- el panel #pasos ---------- */
    construir: function (UI) {
      var self = this, o = UI.els.pasos;
      if (!o) return;
      o.innerHTML = '';
      o.style.setProperty('--pc', P.COLOR);
      o.appendChild(el('div', 'panel-title pp-titulo', 'PRIMEROS PASOS'));
      o.appendChild(el('div', 'note pp-nota',
        'PARA TUS PRIMEROS DÍAS · CADA UNA PAGA UNA VEZ · LO QUE YA HABÍAS HECHO CUENTA'));
      var barra = el('div', 'pp-barra');
      var relleno = el('i');
      barra.appendChild(relleno);
      var cuenta = el('b', 'pp-cuenta', '');
      barra.appendChild(cuenta);
      o.appendChild(barra);
      var lista = el('ol', 'pp-lista');
      o.appendChild(lista);
      var filas = {};
      P.LISTA.forEach(function (m, i) {
        var li = el('li', 'pp-fila');
        var num = li.appendChild(el('span', 'pp-num', String(i + 1)));
        var txt = el('span', 'pp-txt');
        txt.appendChild(el('span', 'pp-nombre', m.name));
        var est = el('small', 'pp-est', '');
        txt.appendChild(est);
        li.appendChild(txt);
        /* a la derecha, lo que paga (y, en la de la cuenta, el botón) */
        var der = el('span', 'pp-der');
        var premio = el('span', 'pp-premio');
        if (m.monedas > 0) premio.appendChild(UI.precioEl(m.monedas, false, '+'));
        else premio.appendChild(el('span', 'pp-premio-t', m.premio || ''));
        der.appendChild(premio);
        var accion = null;
        if (m.id === 'cuenta') {
          accion = UI.makeButton('ENTRAR', function () {
            if (UI.resumeAudio) UI.resumeAudio();
            UI.showProfile();
          });
          accion.classList.add('btn-preset', 'pp-accion');
          der.appendChild(accion);
        }
        li.appendChild(der);
        lista.appendChild(li);
        filas[m.id] = { li: li, est: est, num: num, accion: accion };
      });
      /* el premio de completarlas todas */
      var fin = el('div', 'pp-fin');
      var cv = document.createElement('canvas');
      cv.width = 90; cv.height = 72;
      cv.className = 'pp-cofre';
      cv.setAttribute('aria-hidden', 'true');
      fin.appendChild(cv);
      var finTxt = el('div', 'pp-fin-txt');
      finTxt.appendChild(el('b', 'pp-fin-t', 'COMPLÉTALAS TODAS: UN COFRE DE PLATA'));
      var finSub = el('small', 'pp-fin-s', '');
      finTxt.appendChild(finSub);
      fin.appendChild(finTxt);
      var abrir = UI.makeButton('A LOS COFRES', function () {
        if (UI.resumeAudio) UI.resumeAudio();
        UI.showCofres();
        UI.cofresVolver = 'menu';
      });
      abrir.classList.add('btn-preset', 'pp-accion');
      fin.appendChild(abrir);
      o.appendChild(fin);
      var back = UI.makeButton('VOLVER', function () { UI.showMenu(); });
      back.classList.add('btn-primary', 'pp-volver');
      o.appendChild(back);
      UI.pasosPanel = { relleno: relleno, cuenta: cuenta, filas: filas, cofre: cv,
                        fin: fin, finSub: finSub, abrir: abrir };
    },

    refrescarPanel: function (UI) {
      var p = UI.pasosPanel;
      if (!p) return;
      var e = this.estado(), con = logged();
      p.relleno.style.width = Math.round(100 * e.hechas / e.total) + '%';
      p.cuenta.textContent = e.hechas + ' DE ' + e.total;
      e.lista.forEach(function (m, i) {
        var f = p.filas[m.id];
        if (!f) return;
        f.li.classList.toggle('hecha', m.hecho);
        f.num.textContent = m.hecho ? '✓' : String(i + 1);
        f.est.textContent = m.hecho ? (m.cobrado || !m.monedas ? 'HECHA' : 'HECHA · SE COBRA AL CONECTAR')
                                    : 'PENDIENTE';
        if (f.accion) f.accion.style.display = (!m.hecho && !con) ? '' : 'none';
      });
      p.fin.classList.toggle('hecha', e.todas);
      p.finSub.textContent = e.todas
        ? (con ? '¡GANADO! ÁBRELO EN LOS COFRES' : 'GANADO · ENTRA EN TU CUENTA PARA ABRIRLO')
        : ('TE FALTAN ' + (e.total - e.hechas) + ' · PIDE CUENTA PARA ABRIRSE, COMO TODOS LOS COFRES');
      p.abrir.style.display = (e.todas && con) ? '' : 'none';
      if (UI.pintarCofre) {
        try { UI.pintarCofre(p.cofre, 'plata', { brillo: e.todas ? 1 : 0 }); } catch (err) { /* sin lienzo */ }
      }
    },

    mostrar: function (UI) {
      if (!UI || !UI.els) return;
      if (!UI.els.pasos) UI.els.pasos = document.getElementById('pasos');
      if (!UI.els.pasos) return;
      if (UI.ENCAJE_SUELO && UI.ENCAJE_SUELO.pasos == null) UI.ENCAJE_SUELO.pasos = 0.6;
      if (!UI.pasosPanel) this.construir(UI);
      this.alMenu(null);
      this.refrescarPanel(UI);
      UI.showPanel('pasos');
      UI.els.pasos.scrollTop = 0;
    },

    /* ---------- la celebración (js/celebrar.js) ----------
     * Lo cumplido fuera de partida, todo junto; y si con eso quedan las ocho,
     * el cofre. Devuelve false si no hay nada que enseñar. */
    celebrar: function (UI, e) {
      var self = this;
      var ms = P.LISTA.filter(function (m) { return e.ids && e.ids.indexOf(m.id) !== -1; });
      if (!ms.length && !e.todas) return false;
      var est = this.estado(), con = logged();
      if (window.AudioSys) {
        try { e.todas ? AudioSys.playIntro() : AudioSys.playExtraLife(); } catch (err) { /* sin sonido */ }
      }
      var botones = [{ label: 'SEGUIR', primary: true, keys: ['Enter', 'Escape', ' '], hint: 'ENTER',
        onClick: function () { UI.hidePrompt(); UI.celebrarSiToca(); } }];
      if (e.todas && con) {
        botones.push({ label: 'ABRIR EL COFRE', keys: ['c'], hint: 'C',
          onClick: function () { UI.hidePrompt(); UI.showCofres(); UI.cofresVolver = 'menu'; } });
      } else if (!e.todas) {
        botones.push({ label: 'VER LAS MISIONES', keys: ['v'], hint: 'V',
          onClick: function () { UI.hidePrompt(); self.mostrar(UI); } });
      }
      UI.showPrompt({
        title: e.todas ? '¡PRIMEROS PASOS!' : '¡MISIÓN CUMPLIDA!',
        arcade: true,
        tono: 'cian',
        clase: 'pp-prompt',
        custom: function (p) {
          var tt = p.querySelector('.panel-title');
          if (tt && UI.ajustarTituloLvl) { tt.classList.add('lvl-titulo'); UI.ajustarTituloLvl(tt); }
          var caja = el('div', 'pp-cel');
          caja.style.setProperty('--pc', P.COLOR);
          if (ms.length) {
            var ul = el('ul', 'pp-cel-lista');
            var monedas = 0;
            ms.forEach(function (m) {
              var li = el('li');
              li.appendChild(el('span', 'pp-cel-ok', '✓'));
              li.appendChild(el('span', 'pp-cel-nombre', m.name));
              li.appendChild(el('b', 'pp-cel-premio', self.premioTexto(m)));
              monedas += m.monedas || 0;
              ul.appendChild(li);
            });
            caja.appendChild(ul);
            if (ms.length > 1 && monedas > 0) {
              caja.appendChild(el('div', 'pp-cel-total', 'EN TOTAL +' + miles(monedas) + ' MONEDAS'));
            }
          }
          if (e.todas) {
            var fin = el('div', 'pp-cel-cofre');
            var cv = document.createElement('canvas');
            cv.width = 120; cv.height = 96;
            cv.setAttribute('aria-hidden', 'true');
            if (UI.pintarCofre) {
              try { UI.pintarCofre(cv, 'plata', { brillo: 1 }); } catch (err) { /* sin lienzo */ }
            }
            fin.appendChild(cv);
            fin.appendChild(el('b', null, 'LAS OCHO, HECHAS: +1 COFRE DE PLATA'));
            fin.appendChild(el('small', null, con ? 'ÁBRELO EN LOS COFRES, DENTRO DEL VESTUARIO'
                                                  : 'ENTRA EN TU CUENTA PARA ABRIRLO'));
            caja.appendChild(fin);
          } else {
            var barra = el('div', 'pp-barra');
            var relleno = el('i');
            relleno.style.width = Math.round(100 * est.hechas / est.total) + '%';
            barra.appendChild(relleno);
            barra.appendChild(el('b', 'pp-cuenta', est.hechas + ' DE ' + est.total));
            caja.appendChild(barra);
            if (est.siguiente) {
              caja.appendChild(el('div', 'pp-cel-sig', 'LA SIGUIENTE: ' + est.siguiente.name));
            }
          }
          p.appendChild(caja);
        },
        buttons: botones
      });
      return true;
    }
  };

  window.PM.Pasos = Pasos;
})();
