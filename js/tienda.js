/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/tienda.js
 * La TIENDA: monedas, compras y lo que llevas puesto.
 * Define window.PM.Tienda
 *
 * Lo decidido (15 de septiembre de 2026), en CFG.TIENDA:
 *   - todos empiezan con 1.500 monedas;
 *   - se ganan 5 por partida que dure un minuto, 1 más por cada 1.000
 *     puntos, con un tope de 40 por partida; 20 por reto del DAILY y 150 por
 *     la semana entera;
 *   - emotes 150, efectos 250, accesorios 450 y skins de tienda 1.500.
 *
 * NO SE GUARDA EL SALDO. Se guardan dos cosas que solo pueden crecer, como
 * todos los contadores de logros: cuántas monedas has GANADO en total
 * (`monedas`) y qué has comprado (`c_<id>` = 1). El saldo sale de ahí:
 *
 *     1.500 + regalo de veterano + ganadas − lo que cuesta todo lo comprado
 *
 * Por eso vive en PM.Achievements y viaja a la cuenta con los logros sin
 * tocar la base de datos, y por eso juntar dos aparatos (Achievements.merge
 * se queda con lo mejor de cada lado) nunca duplica dinero ni borra una
 * compra. Lo peor que puede pasar es que en dos aparatos sin conexión se
 * gaste lo mismo dos veces: el saldo se queda en negativo y no deja comprar
 * hasta que se gane lo que falta.
 *
 * Lo PUESTO (accesorio, efecto y las seis caras de las teclas) es un ajuste
 * de este aparato, como la skin (settings acc1, efx1, emotes1). Si lo puesto
 * no está comprado —un ajuste tocado a mano, otra cuenta en el mismo
 * navegador— simplemente no se usa.
 *
 * VESTUARIO DE COFRE (17 de septiembre de 2026, PLAN-COFRES.md): hay piezas
 * que NO se venden y solo salen de un cofre. Están en el catálogo (para poder
 * tenerlas y ponerlas, por el mismo contador `c_<id>`) pero no en VENTA, no
 * tienen precio y `comprar()` las rechaza. Mientras los cofres no existan se
 * ven cerradas, con su etiqueta.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var T = CFG.TIENDA;

  /* El catálogo entero, con su categoría: lo que enseña la TIENDA */
  var CATALOGO = [];
  var POR_ID = {};
  function meter(lista, cat) {
    for (var i = 0; i < lista.length; i++) {
      var it = lista[i];
      /* `cofre`: existe y es tuyo por el mismo contador que lo comprado, pero
       * no se vende (PLAN-COFRES.md). Una skin lo dice con su grupo.
       * `pase`: igual, pero lo reparte el camino de la temporada
       * (js/pase.js). Las dos cosas están en el catálogo para poder tenerlas
       * y ponerlas; ninguna está en VENTA. */
      var deCofre = !!(it.cofre || it.grupo === 'cofre');
      var dePase = !!(it.pase || it.grupo === 'pase');
      var item = { id: it.id, name: it.name, cat: cat,
        precio: (deCofre || dePase) ? 0 : it.precio,
        ve: it.ve || '', cofre: deCofre, pase: dePase,
        temporada: it.temporada || null };
      CATALOGO.push(item);
      POR_ID[it.id] = item;
    }
  }
  meter(CFG.EMOTES_TIENDA, 'emote');
  meter(CFG.EFECTOS, 'efecto');
  meter(CFG.ACCESORIOS, 'accesorio');
  meter(CFG.SKINS.filter(function (sk) {
    return sk.grupo === 'tienda' || sk.grupo === 'cofre' || sk.grupo === 'pase';
  }), 'skin');

  var EMOTES_BASE = CFG.EMOTES.map(function (e) { return e.id; });

  function A() { return window.PM.Achievements; }
  function stat(k) {
    var Ac = A();
    if (!Ac) return 0;
    var c = Ac.stats();
    return (c && c[k]) || 0;
  }
  function settings() { return window.PM.settings || CFG.DEFAULT_SETTINGS; }

  var Tienda = {
    /* TODO lo que se puede tener (incluye lo de cofre, que es tuyo por el
     * mismo contador) y, aparte, lo que de verdad se VENDE en la tienda */
    CATALOGO: CATALOGO,
    VENTA: CATALOGO.filter(function (it) { return !it.cofre && !it.pase; }),
    CATEGORIAS: [
      { id: 'emote', name: 'EMOTES', nota: 'SE PONEN EN LAS TECLAS 1 A 6 DE LA PARTIDA' },
      { id: 'efecto', name: 'EFECTOS', nota: 'LO QUE DEJAS AL PASAR. SE LLEVA UNO' },
      { id: 'accesorio', name: 'ACCESORIOS', nota: 'LO QUE LLEVAS PUESTO. SE LLEVA UNO Y LUCE CON CUALQUIER SKIN' },
      { id: 'skin', name: 'SKINS', nota: 'LAS QUE NO SE GANAN JUGANDO: SOLO SE CONSIGUEN AQUÍ' }
    ],

    /* 1500 -> '1.500' (toLocaleString no pone el punto con cuatro cifras) */
    fmt: function (n) {
      return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },

    item: function (id) { return POR_ID.hasOwnProperty(id) ? POR_ID[id] : null; },

    /* ---------- monedas ---------- */
    ganadas: function () { return stat('monedas'); },

    gastadas: function () {
      var n = 0;
      for (var i = 0; i < CATALOGO.length; i++) {
        if (stat('c_' + CATALOGO[i].id) >= 1) n += CATALOGO[i].precio;
      }
      return n + stat('gastoCont');      // y lo pagado por continuar partidas
    },

    /* ---------- continuar ----------
     * ¿Llega para seguir? */
    llegaContinuar: function () {
      return this.saldo() >= CFG.CONTINUAR.PRECIO;
    },

    /* Cobra un CONTINUAR. false si no llega o no se puede guardar. */
    gastarContinuar: function () {
      var Ac = A();
      if (!Ac || !this.llegaContinuar()) return false;
      var antes = stat('gastoCont');
      Ac.record('gastoCont', CFG.CONTINUAR.PRECIO);
      if (stat('gastoCont') <= antes) return false;
      if (window.PM.Account && window.PM.Account.logged && window.PM.Account.logged()) {
        window.PM.Account.pushQuiet();
      }
      return true;
    },

    /* El regalo de veterano: una vez, por lo jugado antes (ver
     * Achievements.sembrarBono) */
    regalo: function () { return stat('bono'); },

    saldo: function () {
      return T.INICIALES + this.regalo() + this.ganadas() +
        this.delPase() + this.delRango() - this.gastadas();
    },

    /* Lo que ha pagado el RANGO: el premio de cada fruta alcanzada en cada
     * temporada. Como el del pase, se deduce cada vez (js/rango.js). */
    delRango: function () {
      return (window.PM.Rango && window.PM.Rango.monedas) ? window.PM.Rango.monedas() : 0;
    },

    /* Lo que ha pagado el camino de las temporadas. No está guardado en
     * ningún sitio: se deduce del galón alcanzado cada vez que se mira, igual
     * que el regalo de veterano (ver js/pase.js). Por eso no se puede cobrar
     * dos veces ni perder al juntar dos aparatos. */
    delPase: function () {
      return (window.PM.Pase && window.PM.Pase.monedas) ? window.PM.Pase.monedas() : 0;
    },

    /* ¿es tuyo? Los seis emotes de siempre son de todo el mundo */
    tiene: function (id) {
      if (EMOTES_BASE.indexOf(id) !== -1) return true;
      if (!POR_ID.hasOwnProperty(id)) return false;
      return stat('c_' + id) >= 1;
    },

    /* ¿es de los que solo salen de un cofre? */
    esDeCofre: function (id) { return !!(POR_ID[id] && POR_ID[id].cofre); },

    /* ¿y de las que solo reparte el pase de temporada? */
    esDePase: function (id) { return !!(POR_ID[id] && POR_ID[id].pase); },

    /* { ok, msg }. No hay nada que confirmar con el servidor: la compra es un
     * contador más y sube a la cuenta con el siguiente guardado. */
    comprar: function (id) {
      var it = this.item(id);
      if (!it) return { ok: false, msg: 'ESO NO ESTÁ EN LA TIENDA' };
      if (this.tiene(id)) return { ok: false, msg: 'YA ES TUYO' };
      /* lo de cofre no se vende: se gana abriendo uno */
      if (it.cofre) return { ok: false, msg: 'ESO SOLO SALE DE UN COFRE' };
      /* y lo del pase tampoco: se gana llegando a su galón, ese mes */
      if (it.pase) return { ok: false, msg: 'ESO SOLO SE GANA EN EL PASE' };
      var falta = it.precio - this.saldo();
      if (falta > 0) {
        return { ok: false, msg: 'TE FALTAN ' + this.fmt(falta) + ' MONEDAS' };
      }
      var Ac = A();
      if (!Ac) return { ok: false, msg: 'NO SE PUEDE GUARDAR' };
      Ac.record('c_' + id, 1);
      if (!this.tiene(id)) return { ok: false, msg: 'NO SE PUEDE GUARDAR' };
      if (window.PM.Account && window.PM.Account.logged && window.PM.Account.logged()) {
        window.PM.Account.pushQuiet();
      }
      return { ok: true, msg: it.name + ' ES TUYO' };
    },

    /* ---------- ganar ----------
     * Cuánto da una partida: POR_PARTIDA si ha durado un minuto (si no,
     * reiniciar sin jugar sería la mejor forma de ganar dinero) y POR_MIL
     * por cada 1.000 puntos, con un tope. */
    dePartida: function (puntos, segundos) {
      var n = ((segundos || 0) >= T.PARTIDA_MIN_S ? T.POR_PARTIDA : 0) +
        Math.floor(Math.max(0, puntos || 0) / 1000) * T.POR_MIL;
      return Math.max(0, Math.min(T.TOPE_PARTIDA, n));
    },

    ganar: function (n) {
      n = Math.floor(n || 0);
      if (!(n > 0) || !A()) return 0;
      A().record('monedas', n);
      /* ...y lo mismo sube el camino de la temporada (CFG.PASE). Va aquí y no
       * en cada sitio que paga monedas para que las dos cuentas no puedan
       * separarse nunca: lo que da dinero da experiencia, sin excepciones. */
      if (window.PM.Pase) window.PM.Pase.porMonedas(n);
      return n;
    },

    ganarPartida: function (puntos, segundos) {
      return this.ganar(this.dePartida(puntos, segundos));
    },

    /* ---------- lo puesto ---------- */
    accesorio: function () {
      var id = settings().acc1;
      return (id && CFG.ACCESORIO_IDS.indexOf(id) !== -1 && this.tiene(id)) ? id : '';
    },

    efecto: function () {
      var id = settings().efx1;
      return (id && CFG.EFECTO_IDS.indexOf(id) !== -1 && this.tiene(id)) ? id : '';
    },

    /* Las seis caras de las teclas 1..6. Lo que no sea tuyo, esté repetido o
     * no exista se rellena con los de siempre que no estén ya. */
    emotes: function () {
      var guardadas = String(settings().emotes1 || '').split(',');
      var out = [], i;
      for (i = 0; i < T.EMOTE_TECLAS; i++) {
        var id = guardadas[i];
        out.push((id && CFG.EMOTE_IDS.indexOf(id) !== -1 && this.tiene(id) &&
          out.indexOf(id) === -1) ? id : '');
      }
      for (i = 0; i < out.length; i++) {
        if (out[i]) continue;
        for (var j = 0; j < EMOTES_BASE.length; j++) {
          if (out.indexOf(EMOTES_BASE[j]) === -1) { out[i] = EMOTES_BASE[j]; break; }
        }
      }
      return out;
    },

    emoteDeTecla: function (i) {
      return this.emotes()[i] || '';
    },

    nombreEmote: function (id) {
      var todas = CFG.EMOTES.concat(CFG.EMOTES_TIENDA);
      for (var i = 0; i < todas.length; i++) if (todas[i].id === id) return todas[i].name;
      return String(id || '').toUpperCase();
    },

    guardar: function () {
      var UI = window.PM.UI;
      if (UI && UI.saveSettings) UI.saveSettings();
    },

    /* Poner o quitar (id vacío) un accesorio o un efecto */
    poner: function (cat, id) {
      var s = settings();
      if (id && !this.tiene(id)) return false;
      if (cat === 'accesorio') s.acc1 = id || '';
      else if (cat === 'efecto') s.efx1 = id || '';
      else return false;
      this.guardar();
      return true;
    },

    /* Pone la cara `id` en la tecla `tecla` (0..5). Si ya estaba en otra
     * tecla, las dos se intercambian: nunca sale la misma cara dos veces. */
    ponerEmote: function (tecla, id) {
      if (!(tecla >= 0 && tecla < T.EMOTE_TECLAS) || !this.tiene(id)) return false;
      var ahora = this.emotes();
      var estaba = ahora.indexOf(id);
      if (estaba !== -1) ahora[estaba] = ahora[tecla];
      ahora[tecla] = id;
      settings().emotes1 = ahora.join(',');
      this.guardar();
      return true;
    },

    /* ¿Lo llevas puesto? (para las fichas de la tienda) */
    puesto: function (id) {
      var it = this.item(id);
      if (!it) return false;
      if (it.cat === 'accesorio') return this.accesorio() === id;
      if (it.cat === 'efecto') return this.efecto() === id;
      if (it.cat === 'emote') return this.emotes().indexOf(id) !== -1;
      if (it.cat === 'skin') return settings().skin1 === id;
      return false;
    }
  };

  window.PM.Tienda = Tienda;
})();
