/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/conectados.js
 * Quién está conectado ahora mismo. Define window.PM.Conectados
 *
 * Cada jugador CON CUENTA se une a un canal común de Supabase con
 * PRESENCIA: dice quién es y qué está haciendo (en el menú, jugando o en
 * una party) y Supabase se lo cuenta a los demás. Cuando se cae su
 * conexión —cierra la pestaña, se queda sin red— lo retira él solo, así
 * que no hay "conectado" colgado que limpiar.
 *
 * Lo mira la pantalla de AMIGOS (24 sep) para enseñar al lado de cada uno
 * si está EN LÍNEA, JUGANDO, EN PARTY o DESCONECTADO.
 *
 * Una misma cuenta puede estar en dos pestañas: por eso cada usuario lleva
 * sus conexiones por separado (phx_ref) y está conectado mientras le quede
 * alguna.
 * ============================================================ */
(function () {
  'use strict';

  var TEMA = 'pm-conectados';
  /* qué pesa más al enseñar a quien está en varias pestañas */
  var PESO = { party: 3, jugando: 2, menu: 1 };

  var Conectados = {
    tr: null,
    usuario: '',
    estado: '',
    mapa: {},          // USUARIO -> { phx_ref: estado }
    reloj: null,
    onchange: null,    // lo pone la interfaz

    /* Lo que está haciendo este jugador ahora */
    miEstado: function () {
      var G = window.PM.Game, P = window.PM.Party;
      if (G && G.inGame && G.inGame() && !G.replaying && !(G.isSpec && G.isSpec())) {
        return G.netRole ? 'party' : 'jugando';
      }
      if (P && P.inParty && P.inParty()) return 'party';
      return 'menu';
    },

    /* Se une (o se queda como está si ya lo estaba con esta cuenta). Sin
     * cuenta, sin red configurada o en la red local de pruebas, nada. */
    arrancar: function () {
      var Ac = window.PM.Account, Net = window.PM.Net;
      var u = (Ac && Ac.logged && Ac.logged() && Ac.name) ? String(Ac.name() || '').toUpperCase() : '';
      if (!u || !Net || !Net.configured || !Net.configured() || (Net.forcedLocal && Net.forcedLocal())) {
        this.parar();
        return;
      }
      if (this.tr && this.usuario === u) return;
      this.parar();
      var tr = Net.newTransport();
      if (!tr || !tr.track) return;        // el transporte local no tiene presencia
      var self = this;
      this.usuario = u;
      this.tr = tr;
      tr.presenceKey = u;
      tr.connect(TEMA, {
        onOpen: function () { self.anunciar(true); },
        onError: function () { /* sin presencia, los amigos salen como desconectados */ },
        onClose: function () {},
        onData: function () {},
        onPresence: function (tipo, datos) { self.recibir(tipo, datos); }
      });
      this.reloj = setInterval(function () { self.anunciar(false); }, 4000);
    },

    parar: function () {
      if (this.reloj) { clearInterval(this.reloj); this.reloj = null; }
      if (this.tr) { try { this.tr.close(); } catch (e) { /* ya cerrado */ } }
      this.tr = null;
      this.usuario = '';
      this.estado = '';
      this.mapa = {};
    },

    /* Vuelve a decir qué hace, solo si ha cambiado (o si se le pide) */
    anunciar: function (forzar) {
      var e = this.miEstado();
      if (!forzar && e === this.estado) return;
      this.estado = e;
      if (this.tr && this.tr.track) this.tr.track({ u: this.usuario, e: e });
    },

    /* presence_state trae a todos; presence_diff, quién entra y quién sale */
    recibir: function (tipo, datos) {
      var self = this;
      function junta(obj) {
        for (var k in obj) {
          if (!obj.hasOwnProperty(k) || !obj[k] || !obj[k].metas) continue;
          var u = String(k).toUpperCase();
          if (!self.mapa[u]) self.mapa[u] = {};
          obj[k].metas.forEach(function (m) {
            self.mapa[u][m.phx_ref || '?'] = (m && PESO[m.e]) ? m.e : 'menu';
          });
        }
      }
      function quita(obj) {
        for (var k in obj) {
          if (!obj.hasOwnProperty(k) || !obj[k] || !obj[k].metas) continue;
          var u = String(k).toUpperCase();
          if (!self.mapa[u]) continue;
          obj[k].metas.forEach(function (m) { delete self.mapa[u][m.phx_ref || '?']; });
          if (!Object.keys(self.mapa[u]).length) delete self.mapa[u];
        }
      }
      if (tipo === 'presence_state') {
        this.mapa = {};
        junta(datos);
      } else {
        quita(datos.leaves || {});
        junta(datos.joins || {});
      }
      if (this.onchange) this.onchange();
    },

    /* 'party' | 'jugando' | 'menu' si está conectado, o null */
    de: function (usuario) {
      var r = this.mapa[String(usuario || '').toUpperCase()];
      if (!r) return null;
      var mejor = null;
      for (var k in r) {
        if (r.hasOwnProperty(k) && (!mejor || PESO[r[k]] > PESO[mejor])) mejor = r[k];
      }
      return mejor;
    }
  };

  window.PM.Conectados = Conectados;
})();
