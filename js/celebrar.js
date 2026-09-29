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
      var u = quien(), lista = this.leer(), ya = null, bj = null, i;
      for (i = 0; i < lista.length; i++) {
        if (lista[i].u !== u) continue;
        if (lista[i].t === 'rango') ya = lista[i];
        else if (lista[i].t === 'baja') bj = lista[i];
      }
      var sube = !!(res.sube || res.colocado);
      /* HAS SIDO DEGRADADO (30 sep): una bajada sin ver y ahora una subida.
       * Si se recupera lo perdido, la bajada se olvida (y lo que suba por
       * encima de donde estaba se celebra desde ahí); si no, se queda la
       * bajada con el escalón de ahora. */
      if (sube && bj) {
        if (res.tramo < bj.de) { bj.a = res.tramo; this.escribir(lista); return; }
        lista.splice(lista.indexOf(bj), 1);
        if (res.tramo === bj.de && !(res.monedas > 0)) { this.escribir(lista); return; }
        if (!ya) {
          lista.push({ t: 'rango', u: u, de: bj.de, a: res.tramo,
                       monedas: res.monedas || 0, fruta: res.frutaNueva || '' });
          this.escribir(lista);
          return;
        }
      }
      /* bajada: recorta la subida sin ver; si baja por debajo de donde
       * empezaba, o no había subida, se apunta HAS SIDO DEGRADADO */
      if (!sube && res.tramoAntes != null && res.tramoAntes >= 0 && res.tramo < res.tramoAntes) {
        if (ya) {
          if (res.tramo > ya.de || (res.tramo === ya.de && ya.monedas > 0)) ya.a = res.tramo;
          else {
            lista.splice(lista.indexOf(ya), 1);
            if (res.tramo < ya.de) lista.push({ t: 'baja', u: u, de: ya.de, a: res.tramo });
          }
        } else if (bj) bj.a = res.tramo;
        else lista.push({ t: 'baja', u: u, de: res.tramoAntes, a: res.tramo });
        this.escribir(lista);
        return;
      }
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

    /* Misiones de PRIMEROS PASOS cumplidas fuera de partida (js/pasos.js,
     * Pasos.revisar) o la de completarlas todas. Varias sin ver, un solo
     * aviso con todas. */
    pasos: function (res) {
      if (!res || !((res.misiones && res.misiones.length) || res.todas)) return;
      var u = quien(), lista = this.leer(), ya = null;
      lista.forEach(function (x) { if (x.t === 'pasos' && x.u === u) ya = x; });
      if (!ya) { ya = { t: 'pasos', u: u, ids: [], todas: false }; lista.push(ya); }
      (res.misiones || []).forEach(function (m) {
        if (ya.ids.indexOf(m.id) === -1) ya.ids.push(m.id);
      });
      if (res.todas) ya.todas = true;
      this.escribir(lista);
    },

    /* Lo que te han REGALADO tus amigos (js/regalos.js): [{ n, de, pieza }].
     * Varios sin ver, un solo aviso con todos; el mismo regalo (n) no se
     * apunta dos veces. */
    regalos: function (lista) {
      if (!lista || !lista.length) return;
      var u = quien(), todos = this.leer(), ya = null;
      todos.forEach(function (x) { if (x.t === 'regalo' && x.u === u) ya = x; });
      if (!ya) { ya = { t: 'regalo', u: u, lista: [] }; todos.push(ya); }
      lista.forEach(function (r) {
        if (!r || ya.lista.some(function (y) { return y.n === r.n; })) return;
        ya.lista.push({ n: r.n, de: String(r.de || ''), pieza: String(r.pieza || '') });
      });
      ya.lista = ya.lista.slice(-10);
      this.escribir(todos);
    },

    /* El siguiente que le toca ver a la cuenta de ahora (primero el nivel,
     * y el rango al final, que es lo gordo). No lo borra: eso es visto(). */
    siguiente: function () {
      var u = quien(), lista = this.leer();
      var mios = lista.filter(function (x) { return x && x.u === u; });
      if (!mios.length) return null;
      function alFinal(x) { return (x.t === 'rango' || x.t === 'baja') ? 1 : 0; }
      mios.sort(function (a, b) { return alFinal(a) - alFinal(b); });
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
