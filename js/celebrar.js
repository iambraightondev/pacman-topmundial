/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/celebrar.js
 * Las celebraciones que el jugador TIENE QUE VER. Define window.PM.Celebrar
 *
 * Subir de NIVEL, de DIVISIÓN (FRESA III → FRESA II) o de RANGO (FRESA I →
 * NARANJA IV) se apunta aquí en el momento en que pasa, acabe como acabe la
 * partida: GAME OVER, salirse a medias o descartar una clasificatoria
 * guardada. Se guarda en el aparato y solo se borra cuando la pantalla de
 * celebración se ha enseñado de verdad (UI.celebrarSiToca), así que si se
 * cierra el juego antes de verla, sale al volver a abrirlo (24 sep).
 *
 * Cada aviso lleva la cuenta de quien lo ganó: otra cuenta en el mismo
 * aparato no ve lo de la primera, y a la primera le espera hasta que vuelva.
 *
 * Varios del mismo tipo sin ver se juntan en uno: dos niveles seguidos son
 * "NIVEL 7", y dos subidas de rango van de donde estabas a donde has llegado.
 * ============================================================ */
(function () {
  'use strict';

  var KEY = 'pacman-topmundial-celebrar';
  var MAX = 20;
  var memoria = [];   // sin almacén (modo privado estricto): se ve en esta sesión

  function quien() {
    var Ac = window.PM.Account;
    return (Ac && Ac.logged && Ac.logged() && Ac.name) ? String(Ac.name() || '').toUpperCase() : '';
  }

  var Celebrar = {
    KEY: KEY,

    leer: function () {
      try {
        var v = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(v) ? v : [];
      } catch (e) { return memoria.slice(); }
    },
    escribir: function (lista) {
      lista = lista.slice(-MAX);
      memoria = lista;
      try {
        if (lista.length) localStorage.setItem(KEY, JSON.stringify(lista));
        else localStorage.removeItem(KEY);
      } catch (e) { /* se queda en memoria */ }
    },

    /* Nivel de jugador nuevo */
    nivel: function (lv) {
      if (!(lv > 1)) return;
      var u = quien(), lista = this.leer(), ya = null;
      lista.forEach(function (x) { if (x.t === 'nivel' && x.u === u) ya = x; });
      if (ya) ya.lv = Math.max(ya.lv || 0, lv);
      else lista.push({ t: 'nivel', u: u, lv: lv });
      this.escribir(lista);
    },

    /* Lo que ha movido una partida clasificatoria (el resumen de
     * Rango.apuntar). Se apunta si SUBE de escalón o si acaba de colocarse;
     * si baja con una subida aún sin ver, la subida se recorta (o se tira si
     * ya no queda nada que celebrar). */
    rango: function (res) {
      if (!res || res.tramo == null || res.tramo < 0) return;
      var u = quien(), lista = this.leer(), ya = null, i;
      for (i = 0; i < lista.length; i++) if (lista[i].t === 'rango' && lista[i].u === u) ya = lista[i];
      var sube = !!(res.sube || res.colocado);
      if (sube) {
        if (ya) {
          ya.a = res.tramo;
          ya.monedas = (ya.monedas || 0) + (res.monedas || 0);
          if (res.frutaNueva) ya.fruta = res.frutaNueva;
        } else {
          lista.push({ t: 'rango', u: u, de: res.colocado ? -1 : res.tramoAntes, a: res.tramo,
                       monedas: res.monedas || 0, fruta: res.frutaNueva || '' });
        }
      } else if (ya && res.tramo < ya.a) {
        ya.a = res.tramo;
        // si ya no queda subida (y no hubo premio que contar), fuera
        if (ya.de >= 0 && ya.a <= ya.de && !(ya.monedas > 0)) lista.splice(lista.indexOf(ya), 1);
      } else {
        return;
      }
      this.escribir(lista);
    },

    /* El siguiente que le toca ver a la cuenta de ahora (primero el nivel,
     * y el rango al final, que es lo gordo). No lo borra: eso es visto(). */
    siguiente: function () {
      var u = quien(), lista = this.leer();
      var mios = lista.filter(function (x) { return x && x.u === u; });
      if (!mios.length) return null;
      mios.sort(function (a, b) { return (a.t === 'rango' ? 1 : 0) - (b.t === 'rango' ? 1 : 0); });
      return mios[0];
    },
    visto: function (e) {
      if (!e) return;
      this.escribir(this.leer().filter(function (x) {
        return !(x && x.t === e.t && x.u === e.u);
      }));
    },
    hay: function () { return !!this.siguiente(); },
    vaciar: function () { this.escribir([]); }
  };

  window.PM.Celebrar = Celebrar;
})();
