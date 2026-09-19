/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/pase.js
 * EL PASE DE TEMPORADA: el camino del mes, con sus dos carriles.
 * Define window.PM.Pase
 *
 * Lo decidido está contado en CFG.PASE (js/config.js). Aquí solo está la
 * cuenta, y la idea que la sostiene cabe en una línea: **no se guarda ningún
 * premio, se deducen todos**.
 *
 *   experiencia de la temporada  ->  px_AAAA-MM   (contador que solo crece)
 *   carril de pago               ->  pp_AAAA-MM   (1 o nada)
 *
 * De esos dos sale todo lo demás. El galón es la experiencia partida por
 * CFG.PASE.POR_GALON. Las monedas del camino no se ingresan en ninguna
 * hucha: se suman al saldo cada vez que se calcula (ver Tienda.saldo), igual
 * que el regalo de veterano. Y las piezas se marcan con el mismo contador que
 * una compra, que es un máximo: volver a marcarlas no hace nada.
 *
 * Por qué importa: los contadores viajan a la cuenta con los logros y se
 * juntan quedándose con lo mejor de cada lado (Achievements.merge). Si el
 * pase llevara una lista de "premios cobrados", jugar en el móvil y en el PC
 * podría cobrar dos veces lo mismo, o peor, perderlo. Deduciéndolo no hay
 * nada que cuadrar: la misma experiencia da siempre exactamente los mismos
 * premios.
 *
 * EL CARRIL DE PAGO, mientras CFG.PASE.VENTA sea false, se ve entero —con sus
 * premios y su candado— pero no se puede tener. Lo que se gane en él NO se
 * pierde: si algún día se compra esa temporada, se entrega de golpe todo lo
 * que ya se había alcanzado. Por eso puede estar apagado sin castigar a
 * nadie, y por eso encenderlo no le quita nada a nadie.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  function P() { return CFG.PASE; }
  function A() { return window.PM.Achievements || null; }

  function stat(k) {
    var Ac = A();
    if (!Ac) return 0;
    var c = Ac.stats();
    return Math.floor((c && c[k]) || 0);
  }

  /* AAAA-MM y nada más */
  var FORMA = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

  /* Las temporadas de las que hay algo apuntado, de la más vieja a la más
   * nueva. Sale de los propios contadores, así que no hay ninguna lista que
   * mantener: una temporada existe cuando alguien juega en ella. */
  function jugadas() {
    var Ac = A();
    if (!Ac) return [];
    var c = Ac.stats() || {}, out = [];
    for (var k in c) {
      if (!c.hasOwnProperty(k) || k.indexOf('px_') !== 0) continue;
      if (Math.floor(c[k] || 0) > 0) out.push(k.slice(3));
    }
    out.sort();
    return out;
  }

  /* El camino, escalón por galón y ordenado. Un galón que no aparezca en
   * CFG.PASE.CAMINO simplemente no paga nada.
   *
   * Se ordena una sola vez: esto lo acaba llamando Tienda.saldo(), que se
   * mira muchas veces al pintar una pantalla, y no tiene sentido rehacer la
   * misma lista en cada una. */
  var CAMINO = null;
  function camino() {
    if (CAMINO) return CAMINO;
    var c = (P().CAMINO || []).slice();
    c.sort(function (a, b) { return a.g - b.g; });
    CAMINO = c.filter(function (e) {
      return e && e.g >= 1 && e.g <= P().GALONES;
    });
    return CAMINO;
  }

  var Pase = {
    /* ---------- la temporada ---------- */
    temporada: function (d) {
      var S = window.PM.Season;
      if (S && S.actual) return S.actual(d);
      d = d || new Date();
      var m = d.getUTCMonth() + 1;
      return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m;
    },

    nombre: function (t) {
      var S = window.PM.Season;
      return (S && S.nombre) ? S.nombre(t || this.temporada()) : (t || '');
    },

    /* ¿Esta temporada juega? Antes de la primera, el pase está dormido. */
    cuenta: function (t) {
      t = t || this.temporada();
      return FORMA.test(String(t)) && String(t) >= String(P().DESDE);
    },

    jugadas: jugadas,
    camino: camino,

    /* ---------- el progreso ---------- */
    xp: function (t) { return stat('px_' + (t || this.temporada())); },

    /* Galón alcanzado, de 0 a CFG.PASE.GALONES */
    galon: function (t) {
      var n = Math.floor(this.xp(t) / P().POR_GALON);
      return Math.max(0, Math.min(P().GALONES, n));
    },

    /* Lo que falta para el siguiente, y cuánto del actual se lleva andado.
     * En el último galón ya no falta nada. */
    avance: function (t) {
      var g = this.galon(t);
      if (g >= P().GALONES) return { hecho: P().POR_GALON, total: P().POR_GALON, falta: 0 };
      var dentro = this.xp(t) - g * P().POR_GALON;
      return { hecho: dentro, total: P().POR_GALON, falta: P().POR_GALON - dentro };
    },

    /* ---------- el carril de pago ---------- */
    tienePago: function (t) { return stat('pp_' + (t || this.temporada())) >= 1; },

    /* ¿Se puede comprar hoy? Mientras no, el carril se ve pero está cerrado. */
    seVende: function () { return !!P().VENTA; },

    /* Entregar el carril de pago de una temporada. Lo llamará el cobro el día
     * que exista; hoy no hay forma de llegar aquí desde el juego, y es a
     * propósito: no se cobra nada hasta que la identidad sea propia. */
    conceder: function (t) {
      t = t || this.temporada();
      var Ac = A();
      if (!Ac || !this.cuenta(t)) return false;
      Ac.record('pp_' + t, 1);
      this.olvida();
      this.sincronizar(t);
      if (window.PM.Account && window.PM.Account.logged && window.PM.Account.logged()) {
        window.PM.Account.pushQuiet();
      }
      return this.tienePago(t);
    },

    /* ---------- lo que paga el camino ---------- */
    /* Los dos lados de un galón, ya sabiendo si están alcanzados y si el de
     * pago es suyo. Es lo que pinta la pantalla. */
    escalones: function (t) {
      t = t || this.temporada();
      var g = this.galon(t), pago = this.tienePago(t);
      return camino().map(function (e) {
        return {
          galon: e.g,
          alcanzado: e.g <= g,
          gratis: e.gratis || {},
          pago: e.pago || {},
          pagoSuyo: pago
        };
      });
    },

    /* Monedas que ha dado el camino en esa temporada. NO se ingresan en
     * ningún sitio: la tienda las suma al calcular el saldo. */
    monedasDe: function (t) {
      t = t || this.temporada();
      var g = this.galon(t);
      /* la inmensa mayoría de las temporadas de la lista están a cero, y esto
       * se recorre entero cada vez que se mira el saldo */
      if (g === 0 || !this.cuenta(t)) return 0;
      var pago = this.tienePago(t), n = 0;
      camino().forEach(function (e) {
        if (e.g > g) return;
        n += Math.floor((e.gratis && e.gratis.monedas) || 0);
        if (pago) n += Math.floor((e.pago && e.pago.monedas) || 0);
      });
      return n;
    },

    /* Todas las temporadas juntas: lo que el pase aporta al saldo.
     *
     * CON MEMORIA, y no por gusto: la TIENDA pregunta el saldo una vez por
     * cada pieza del catálogo al pintarse, y el saldo pregunta esto. Sin
     * memoria, abrir el vestuario recorría las temporadas ochenta veces
     * seguidas para dar siempre el mismo número.
     *
     * Lo que puede cambiar esta cuenta es ganar experiencia o conseguir el
     * carril de pago, y las dos cosas la borran a mano. El segundo de caducidad
     * es el cinturón: cubre lo que cambie los contadores por detrás (juntar
     * con la nube al entrar en la cuenta) sin que haya que enterarse. */
    _memo: 0,
    _memoHasta: 0,

    olvida: function () { this._memoHasta = 0; },

    monedas: function () {
      var ahora = Date.now();
      if (ahora < this._memoHasta) return this._memo;
      this._memo = this.calculaMonedas();
      this._memoHasta = ahora + 1000;
      return this._memo;
    },

    calculaMonedas: function () {
      var Ac = A();
      if (!Ac) return 0;
      var c = Ac.stats();
      if (!c) return 0;
      var paso = P().POR_GALON, tope = P().GALONES, desde = String(P().DESDE);
      var cam = camino(), n = 0;
      /* solo se miran las temporadas que existen de verdad: las claves que
       * hay apuntadas, no una lista de meses inventada */
      for (var k in c) {
        if (!c.hasOwnProperty(k) || k.indexOf('px_') !== 0) continue;
        var t = k.slice(3);
        if (!FORMA.test(t) || t < desde) continue;
        var xp = Math.floor(c[k] || 0);
        if (xp < paso) continue;                       // ni un galón: nada que pagar
        var g = Math.min(tope, Math.floor(xp / paso));
        var pago = Math.floor(c['pp_' + t] || 0) >= 1;
        for (var j = 0; j < cam.length; j++) {
          var e = cam[j];
          if (e.g > g) break;                          // el camino va en orden
          n += Math.floor((e.gratis && e.gratis.monedas) || 0);
          if (pago) n += Math.floor((e.pago && e.pago.monedas) || 0);
        }
      }
      return n;
    },

    /* Las piezas del camino que ya son suyas se marcan con el mismo contador
     * que una compra. Es idempotente (el contador es un máximo), así que se
     * puede llamar todas las veces que haga falta.
     *
     * Hoy no hay ninguna pieza en el camino —están sin dibujar, ver
     * CFG.PASE.CAMINO—, pero el día que las haya esto es lo único que hay que
     * llamar para entregarlas. */
    sincronizar: function (t) {
      t = t || this.temporada();
      var Ac = A();
      if (!Ac || !this.cuenta(t)) return 0;
      var g = this.galon(t), pago = this.tienePago(t), n = 0;
      camino().forEach(function (e) {
        if (e.g > g) return;
        var ids = [];
        if (e.gratis && e.gratis.id) ids.push(e.gratis.id);
        if (pago && e.pago && e.pago.id) ids.push(e.pago.id);
        ids.forEach(function (id) {
          if (stat('c_' + id) >= 1) return;
          Ac.record('c_' + id, 1);
          n++;
        });
      });
      return n;
    },

    /* ---------- ganar experiencia ---------- */
    /* Devuelve lo que se ha apuntado de verdad (0 si la temporada no cuenta). */
    ganar: function (n, t) {
      t = t || this.temporada();
      n = Math.floor(n || 0);
      var Ac = A();
      if (!(n > 0) || !Ac || !this.cuenta(t)) return 0;
      var antes = this.galon(t);
      Ac.record('px_' + t, n);
      this.olvida();
      if (this.galon(t) > antes) this.sincronizar(t);
      return n;
    },

    /* Lo que da ganar unas monedas. Único sitio donde se convierte, y por eso
     * la tienda no necesita saber nada del pase más que llamar aquí. */
    deMonedas: function (n) {
      return Math.max(0, Math.floor(n || 0)) * P().XP_POR_MONEDA;
    },

    /* Lo llama Tienda.ganar con lo que acaba de pagar cualquier cosa: una
     * partida, el reto del DAILY, la semana. Así el camino y la tienda no
     * pueden descuadrarse, porque miden lo mismo. */
    porMonedas: function (n) {
      return this.ganar(this.deMonedas(n));
    },

    /* ---------- todo junto, para la pantalla ---------- */
    resumen: function (t) {
      t = t || this.temporada();
      return {
        temporada: t,
        nombre: this.nombre(t),
        cuenta: this.cuenta(t),
        xp: this.xp(t),
        galon: this.galon(t),
        galones: P().GALONES,
        avance: this.avance(t),
        pago: this.tienePago(t),
        seVende: this.seVende(),
        precio: P().PRECIO,
        escalones: this.escalones(t),
        /* lo que se está dejando por no tener el carril de pago: es el número
         * que justifica el precio, y por eso se enseña aunque no se venda */
        pendientePago: (function (self) {
          if (self.tienePago(t)) return 0;
          var g = self.galon(t), n = 0;
          camino().forEach(function (e) {
            if (e.g <= g) n += Math.floor((e.pago && e.pago.monedas) || 0);
          });
          return n;
        })(this)
      };
    },

    /* Días que le quedan a la temporada (el mes natural, en UTC) */
    diasRestantes: function (d) {
      d = d || new Date();
      var fin = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
      return Math.max(0, Math.ceil((fin - d.getTime()) / 86400000));
    }
  };

  window.PM.Pase = Pase;
})();
