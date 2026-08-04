/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/history.js
 * Historial de tus últimas partidas. Define window.PM.History
 *
 * Vive solo en este navegador (localStorage): no depende de la red
 * ni del nombre, así que guarda también las partidas que no entran
 * en el top mundial.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  function load() {
    try {
      var raw = localStorage.getItem(CFG.HISTORY_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Object.prototype.toString.call(arr) === '[object Array]' ? arr : [];
    } catch (e) { return []; }
  }

  function save(list) {
    try { localStorage.setItem(CFG.HISTORY_KEY, JSON.stringify(list)); }
    catch (e) { /* sin almacenamiento */ }
  }

  var History = {
    all: function () { return load(); },

    /* o: { jugadores, modo, nombre1, nombre2, puntos, nivel } */
    add: function (o) {
      if (!o || !(o.puntos > 0)) return;
      var list = load();
      list.unshift({
        t: Date.now(),
        j: (o.jugadores === 2) ? 2 : 1,
        m: (o.modo === 'online') ? 'online' : 'local',
        n1: String(o.nombre1 || ''),
        n2: String(o.nombre2 || ''),
        p: Math.floor(o.puntos),
        lv: Math.floor(o.nivel || 1)
      });
      while (list.length > CFG.HISTORY_MAX) list.pop();
      save(list);
    },

    clear: function () { save([]); },

    /* Fecha corta para la lista (dd/mm hh:mm) */
    fmtDate: function (ms) {
      var d = new Date(ms);
      function p(n) { return (n < 10 ? '0' : '') + n; }
      return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' +
        p(d.getHours()) + ':' + p(d.getMinutes());
    }
  };

  window.PM.History = History;
})();
