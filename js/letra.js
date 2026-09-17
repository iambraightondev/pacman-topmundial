/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/letra.js
 * La LETRA DE MÁQUINA en todo el juego. Define window.PM.Letra
 *
 * Desde el 17 de septiembre de 2026 el juego entero usa Press Start 2P (la
 * del TOP MUNDIAL, fonts/press-start-2p.woff2), en el HTML y en el lienzo.
 *
 * La letra tiene tildes, pero en MAYÚSCULA las dibuja aplastadas dentro de la
 * casilla: la Í parece un ±, la Ú una u. Y el juego va casi todo en
 * mayúsculas. Así que, como en las recreativas de entonces, las vocales
 * mayúsculas se escriben SIN tilde (Á É Í Ó Ú Ü -> A E I O U U). Lo demás se
 * queda: la Ñ se ve bien y cambia el sentido de la palabra (AÑOS), y las
 * minúsculas con tilde se dibujan como es debido.
 *
 * Se hace en dos sitios, sin tocar los textos del código:
 *   - en la página, vigilando lo que se escribe (MutationObserver);
 *   - en el lienzo, en fillText/strokeText/measureText cuando la letra
 *     puesta es la de máquina.
 * La página de pruebas no se toca: sus comprobaciones leen los textos tal
 * cual se escribieron.
 * ============================================================ */
(function () {
  'use strict';
  window.PM = window.PM || {};

  var FAMILIA = '"Press Start 2P", "Courier New", Courier, monospace';
  var MAPA = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U',
               'À': 'A', 'È': 'E', 'Ì': 'I', 'Ò': 'O', 'Ù': 'U' };
  var CON_TILDE = /[ÁÉÍÓÚÜÀÈÌÒÙ]/g;

  /* Los cuerpos de siempre (pensados para monospace en negrita) pasados a la
   * letra de máquina, que es más ancha: la de 8 se queda en 8 —la del
   * marcador de la recreativa—, las pequeñas bajan un punto y las grandes
   * dos. */
  var CUERPOS = { 4: 4, 5: 4, 6: 5, 7: 6, 8: 8, 9: 8, 10: 8, 11: 9, 12: 10, 14: 12, 16: 14 };

  var Letra = {
    FAMILIA: FAMILIA,

    quitar: function (txt) {
      if (typeof txt !== 'string' || !CON_TILDE.test(txt)) return txt;
      CON_TILDE.lastIndex = 0;
      return txt.replace(CON_TILDE, function (c) { return MAPA[c] || c; });
    },

    /* La letra de lienzo para un cuerpo de los de antes: Letra.lienzo(8) */
    lienzo: function (px) {
      var n = Math.max(4, Math.round(px));
      return (CUERPOS[n] || Math.max(4, Math.round(n * 0.85))) + 'px ' + FAMILIA;
    },

    /* Recorre un nodo y deja sus textos sin tilde en mayúscula */
    limpiar: function (nodo) {
      if (!nodo) return;
      if (nodo.nodeType === 3) {
        var v = nodo.nodeValue, n = Letra.quitar(v);
        if (n !== v) nodo.nodeValue = n;
        return;
      }
      var tag = nodo.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SCRIPT' || tag === 'STYLE') return;
      var hijos = nodo.childNodes || [];
      for (var i = 0; i < hijos.length; i++) Letra.limpiar(hijos[i]);
    }
  };

  /* ---- el lienzo ---- */
  var C2D = (typeof CanvasRenderingContext2D !== 'undefined') ? CanvasRenderingContext2D.prototype : null;
  if (C2D && !C2D.__letraMaquina) {
    C2D.__letraMaquina = true;
    ['fillText', 'strokeText', 'measureText'].forEach(function (m) {
      var orig = C2D[m];
      if (!orig) return;
      C2D[m] = function (texto) {
        if (typeof texto === 'string' && /Press Start/.test(this.font)) {
          arguments[0] = Letra.quitar(texto);
        }
        return orig.apply(this, arguments);
      };
    });
  }

  /* ---- la página ---- */
  function vigilar() {
    if (window.PM_PRUEBAS || typeof MutationObserver === 'undefined' || !document.body) return;
    Letra.limpiar(document.body);
    new MutationObserver(function (cambios) {
      for (var i = 0; i < cambios.length; i++) {
        var c = cambios[i];
        if (c.type === 'characterData') Letra.limpiar(c.target);
        else for (var j = 0; j < c.addedNodes.length; j++) Letra.limpiar(c.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, characterData: true, subtree: true });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilar);
    else vigilar();
  }

  window.PM.Letra = Letra;
})();
