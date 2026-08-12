/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/history.js
 * Historial de tus últimas partidas. Define window.PM.History
 *
 * Dos fuentes, y las dos hacen falta:
 *
 * - ESTE NAVEGADOR (localStorage): se guarda al acabar cada partida
 *   pase lo que pase — sin nombre, sin cuenta y sin red. Es también
 *   la que tiene las repeticiones a mano (js/replay.js las cruza por
 *   puntuación y hora), así que es la que trae el botón VER.
 * - LA NUBE (tabla `ranking`): las partidas con nombre que entraron
 *   en el top mundial. El dato ya estaba ahí; lo que faltaba era
 *   leerlo, y por eso TUS PARTIDAS no te seguía de un aparato a otro.
 *
 * La nube solo se mira CON CUENTA: sin ella un nombre no identifica
 * a nadie (cualquiera puede escribir el tuyo), así que traer partidas
 * por nombre suelto sería enseñarte las de otro.
 *
 * Ojo con la puntuación de las de equipo: aquí se guarda LO TUYO
 * (Game.myPoints) y en el ranking va la del EQUIPO, que es la que
 * compite. Por eso, cuando una partida está en los dos sitios, manda
 * la de este navegador.
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

  function cfg() { return window.PM.NET_CFG || {}; }

  function headers() {
    var k = cfg().SUPABASE_KEY;
    return {
      'apikey': k,
      'Authorization': 'Bearer ' + k,
      'Accept': 'application/json'
    };
  }

  var History = {
    all: function () { return load(); },

    /* o: { jugadores, modo, nombre1, nombre2, puntos, nivel }
     *
     * `jugadores` va tal cual (1..4). Antes se recortaba a 1 o 2 —de cuando
     * solo había esos dos formatos— y una partida de trío o escuadra quedaba
     * apuntada como individual: ni cuadraba con su repetición (que sí guarda
     * cuántos erais, y por eso no salía el botón VER) ni con su fila del top
     * mundial. */
    add: function (o) {
      if (!o || !(o.puntos > 0)) return;
      var list = load();
      list.unshift({
        t: Date.now(),
        j: Math.max(1, Math.min(CFG.MAX_PLAYERS, Math.floor(o.jugadores || 1))),
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

    /* ---------- Las que están en la nube ---------- */

    configured: function () {
      var c = cfg();
      return !!(c.SUPABASE_URL && c.SUPABASE_KEY && window.fetch);
    },

    /* ¿Hay cuenta con la que pedirlas? Devuelve el nombre o ''. */
    cuenta: function () {
      var A = window.PM.Account;
      return (A && A.logged && A.logged()) ? A.name() : '';
    },

    /* Una fila del ranking, con la forma del historial de aquí */
    deFila: function (fila) {
      var j = Math.max(1, Math.min(CFG.MAX_PLAYERS, Math.floor(fila.jugadores || 1)));
      return {
        t: Date.parse(fila.creado_en) || 0,
        j: j,
        m: (fila.modo === 'online') ? 'online' : 'local',
        n1: String(fila.nombre1 || ''),
        n2: String(fila.nombre2 || ''),
        p: Math.floor(fila.puntos || 0),
        lv: Math.floor(fila.nivel || 1),
        nube: 1        // no se jugó en este navegador (no hay repetición)
      };
    },

    /* Tus últimas partidas del top mundial. cb(err, lista)
     *
     * Se buscan por los CUATRO nombres, no solo por el primero: en una party
     * la sube el anfitrión con el equipo entero, así que las tuyas de invitado
     * están en `nombre2`, `nombre3` o `nombre4`. */
    remote: function (cb) {
      var self = this;
      var nombre = this.cuenta();
      if (!nombre) { cb('NECESITAS UNA CUENTA', null); return; }
      if (!this.configured()) { cb('SIN CONFIGURAR', null); return; }
      var quien = [];
      for (var i = 1; i <= CFG.MAX_PLAYERS; i++) {
        quien.push('nombre' + i + '.eq.' + nombre);
      }
      var url = String(cfg().SUPABASE_URL).replace(/\/+$/, '') +
        '/rest/v1/' + CFG.RANKING.TABLE +
        '?select=creado_en,jugadores,modo,nombre1,nombre2,nombre3,nombre4,puntos,nivel' +
        '&or=(' + quien.join(',') + ')' +
        '&order=creado_en.desc' +
        '&limit=' + CFG.HISTORY_MAX;
      fetch(url, { method: 'GET', headers: headers() })
        .then(function (res) {
          if (!res.ok) throw new Error('ERROR ' + res.status);
          return res.json();
        })
        .then(function (rows) {
          var out = [];
          for (var k = 0; k < (rows || []).length; k++) {
            out.push(self.deFila(rows[k]));
          }
          cb(null, out);
        })
        .catch(function (e) { cb(e.message || 'SIN CONEXIÓN', null); });
    },

    /* ¿Son la misma partida vistas desde los dos lados?
     *
     * No hay identificador común: el historial de aquí se escribe al acabar y
     * la fila del ranking se sella en el servidor un instante después. Así que
     * se cruzan por hora y formato, con un margen ancho (el envío puede tardar
     * si la red va mal). Con un jugador se pide además la misma puntuación,
     * que es lo que distingue dos partidas seguidas; con más no se puede,
     * porque aquí se guardan TUS puntos y allí los del equipo. */
    misma: function (a, b) {
      if (!a || !b || a.j !== b.j) return false;
      if (Math.abs(a.t - b.t) > 120000) return false;
      return (a.j > 1) || (a.p === b.p);
    },

    /* Lo de aquí y lo de la nube en una sola lista, de la más nueva a la más
     * vieja. Cuando una partida está en los dos lados se queda la de aquí:
     * tiene la puntuación que te toca y la repetición para verla. */
    mezclar: function (local, nube) {
      var out = (local || []).slice();
      for (var i = 0; i < (nube || []).length; i++) {
        var r = nube[i], repetida = false;
        for (var j = 0; j < (local || []).length; j++) {
          if (this.misma(r, local[j])) { repetida = true; break; }
        }
        if (!repetida) out.push(r);
      }
      out.sort(function (a, b) { return b.t - a.t; });
      return out.slice(0, CFG.HISTORY_MAX);
    },

    /* Lo que enseña TUS PARTIDAS: lo de aquí siempre, y lo de la nube cuando
     * hay cuenta. cb(err, lista) se llama SIEMPRE con una lista buena; `err`
     * solo cuenta lo que no se pudo traer, y no es motivo para no enseñar
     * nada (sin red, el historial de este navegador sigue estando). */
    list: function (cb) {
      var self = this;
      var local = load();
      if (!this.cuenta() || !this.configured()) { cb(null, local); return; }
      this.remote(function (err, nube) {
        cb(err, err ? local : self.mezclar(local, nube));
      });
    },

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
