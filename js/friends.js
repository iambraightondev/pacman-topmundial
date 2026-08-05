/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/friends.js
 * Lista de amigos (nombres), guardada en este navegador.
 * Define window.PM.Friends
 *
 * De momento sirve para tenerlos a mano; invitarlos a una sala y
 * espectar sus partidas llega con las salas de grupo.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  function load() {
    try {
      var raw = localStorage.getItem(CFG.FRIENDS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (Object.prototype.toString.call(arr) !== '[object Array]') return [];
      var out = [];
      for (var i = 0; i < arr.length; i++) {
        if (typeof arr[i] === 'string' && arr[i]) out.push(arr[i]);
      }
      return out;
    } catch (e) { return []; }
  }

  function save(list) {
    try { localStorage.setItem(CFG.FRIENDS_KEY, JSON.stringify(list)); }
    catch (e) { /* sin almacenamiento */ }
  }

  /* Mismo saneado que los nombres del juego: mayúsculas y corto */
  function clean(name) {
    return String(name == null ? '' : name)
      .toUpperCase()
      .replace(/[^A-Z0-9 ._-]/g, '')
      .replace(/ +/g, ' ')
      .replace(/^ +| +$/g, '')
      .slice(0, CFG.NICK_MAX);
  }

  var Friends = {
    clean: clean,

    all: function () { return load(); },

    has: function (name) {
      var n = clean(name);
      var list = load();
      for (var i = 0; i < list.length; i++) if (list[i] === n) return true;
      return false;
    },

    /* Devuelve el motivo del fallo, o null si se añadió */
    add: function (name) {
      var n = clean(name);
      if (!n) return 'ESCRIBE UN NOMBRE';
      var propio = window.PM.settings && window.PM.settings.nick1;
      if (propio && clean(propio) === n) return 'ESE ERES TÚ';
      var list = load();
      if (list.length >= CFG.FRIENDS_MAX) return 'LISTA LLENA';
      for (var i = 0; i < list.length; i++) {
        if (list[i] === n) return 'YA ESTÁ EN LA LISTA';
      }
      list.push(n);
      list.sort();
      save(list);
      return null;
    },

    /* Copia local de la lista de la cuenta (la de verdad vive en la nube) */
    replace: function (list) {
      var out = [];
      for (var i = 0; i < (list || []).length; i++) {
        var n = clean(list[i]);
        if (n && out.indexOf(n) === -1) out.push(n);
      }
      out.sort();
      save(out.slice(0, CFG.FRIENDS_MAX));
    },

    remove: function (name) {
      var n = clean(name);
      var list = load(), out = [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] !== n) out.push(list[i]);
      }
      save(out);
    },

    clear: function () { save([]); }
  };

  window.PM.Friends = Friends;
})();
