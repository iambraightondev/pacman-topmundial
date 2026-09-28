/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/cofres.js
 * LOS COFRES DE PREMIOS. Define window.PM.Cofres
 *
 * Lo decidido (PLAN-COFRES.md, CFG.COFRES):
 *   MADERA      cada 5 partidas de más de un minuto
 *   PLATA       semana del DAILY completa · subir de nivel de jugador
 *   ORO         escalón nuevo de maestría de rol · récord propio (+10 % sobre
 *               uno de 10.000 o más; uno por ruta y día)
 *   LEGENDARIO  top 3 del RANGO al cerrar la temporada · 2 % de los ORO
 *   Y al llegar, un regalo de bienvenida: 1 PLATA + 1 ORO.
 *
 * SE GANAN SIN CUENTA, SE ABREN CON ELLA. Lo ganado sale de contadores que ya
 * viajan con la cuenta (js/cofres-gen.js, ganados), así que sin cuenta se
 * ven pendientes y al crearla siguen ahí. Abrir va SIEMPRE por el servidor
 * (Edge Function `cofres`): él cuenta lo ganado con los contadores de la
 * nube (los mismos, ya con los topes del blindaje), genera el premio con el
 * MISMO generador que este juego y lo escribe en la cuenta. El juego no
 * puede darse piezas de cofre ni monedas de cofre: el trigger de perfiles
 * se lo recorta (supabase/perfiles-blindaje.sql).
 *
 * DESDE CUÁNDO SE CUENTA (la BASE). No se dan cofres por lo jugado antes de
 * que existieran: cada cuenta lleva su base (cofre_b_*, la pone el
 * servidor: lo que tenía el día que llegaron, o cero si se creó después) y
 * cada aparato sin cuenta la suya, tomada la primera vez que se abre el
 * juego con cofres (BASE_KEY).
 *
 * En party cada uno gana y abre los suyos: nada de esto viaja por la red.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var C = CFG.COFRES;

  var BASE_KEY = 'pacman-topmundial-cofres-base';
  var REC_KEY = 'pacman-topmundial-cofres-rec';
  var TIPOS = ['madera', 'plata', 'oro', 'legendario'];

  function G() { return window.PM.CofresGen; }
  function A() { return window.PM.Achievements; }
  function Ac() { return window.PM.Account; }
  function xp() { return window.PM.Level ? window.PM.Level.xp() : 0; }
  function logged() {
    var a = Ac();
    try { return !!(a && a.logged && a.logged()); } catch (e) { return false; }
  }
  function usuario() {
    var a = Ac();
    try { return (a && a.logged && a.logged() && a.name) ? String(a.name() || '') : ''; }
    catch (e) { return ''; }
  }

  var datos = null;

  var Cofres = {
    TIPOS: TIPOS,
    BASE_KEY: BASE_KEY,

    /* Los datos del generador, sacados de CFG una vez */
    datos: function () {
      if (!datos && G()) datos = G().datosDe(CFG);
      return datos;
    },

    hoy: function () { return G().dia(Date.now()); },

    /* ---------- la base ----------
     * La de la cuenta si la nube ya la ha traído; si no, la de este aparato,
     * que se toma la primera vez (y se vuelve a cero al cerrar sesión: ver
     * olvidarLocal). */
    base: function () {
      var c = A() ? A().stats() : {};
      var b = G().baseDe(c);
      if (b) return b;
      return this.baseLocal(c);
    },

    baseLocal: function (c) {
      var b = null;
      try { b = JSON.parse(localStorage.getItem(BASE_KEY) || 'null'); } catch (e) { b = null; }
      if (b && typeof b === 'object' && b.dia > 0) return b;
      b = G().baseAhora(c || (A() ? A().stats() : {}), xp(), this.hoy(), this.datos(), usuario());
      try { localStorage.setItem(BASE_KEY, JSON.stringify(b)); } catch (e) { /* en memoria */ }
      return b;
    },

    /* Al cerrar sesión los contadores de aquí se vacían (Account.limpiarLocal):
     * lo que se juegue a partir de ahí sin cuenta se cuenta desde cero. */
    olvidarLocal: function () {
      var b = { dia: this.hoy(), partidas: 0, semana: 0, nivel: 1, mae: 0 };
      try { localStorage.setItem(BASE_KEY, JSON.stringify(b)); } catch (e) { /* nada */ }
    },

    /* ---------- lo ganado, lo abierto, lo pendiente ---------- */
    ganados: function () {
      var c = A() ? A().stats() : {};
      return G().ganados(c, xp(), this.base(), this.hoy(), this.datos(), usuario());
    },

    abiertos: function () {
      return G().abiertos(A() ? A().stats() : {});
    },

    pendientes: function () {
      var g = this.ganados(), a = this.abiertos(), out = {};
      for (var i = 0; i < TIPOS.length; i++) {
        out[TIPOS[i]] = Math.max(0, g[TIPOS[i]] - a[TIPOS[i]]);
      }
      return out;
    },

    total: function () {
      var p = this.pendientes(), n = 0;
      for (var k in p) if (p.hasOwnProperty(k)) n += p[k];
      return n;
    },

    /* Lo que falta para el siguiente de cada tipo, para la pantalla */
    progreso: function () {
      var c = A() ? A().stats() : {}, b = this.base();
      var partidas = Math.max(0, (c.partidas || 0) - b.partidas);
      var largas = Math.min(c.largas || 0, partidas);
      var L = window.PM.Level ? window.PM.Level.state() : null;
      return {
        madera: { hechas: largas % C.PARTIDAS_POR_MADERA, pide: C.PARTIDAS_POR_MADERA },
        nivel: L ? { nivel: L.level, pct: L.pct } : null
      };
    },

    puedeAbrir: function () { return logged(); },

    /* ---------- al acabar una partida ----------
     * `antes` es ganados() al empezarla (Game lo guarda); devuelve lo que ha
     * dado esta partida para el resumen del GAME OVER: { madera, plata, oro,
     * legendario, record, total, conCuenta } o null si nada. El ORO del
     * récord lo cuenta el SERVIDOR al subir la partida; aquí solo se avisa
     * de que viene (y se apunta la ruta y el día, que solo es uno). */
    alCerrar: function (antes, record) {
      if (!antes) return null;
      var ahora = this.ganados(), out = { total: 0, record: false, conCuenta: logged() };
      for (var i = 0; i < TIPOS.length; i++) {
        var d = Math.max(0, ahora[TIPOS[i]] - (antes[TIPOS[i]] || 0));
        out[TIPOS[i]] = d;
        out.total += d;
      }
      if (record && this.recordNuevo(record.ruta, record.antes, record.despues)) {
        out.record = true;
        out.oro += 1;
        out.total += 1;
      }
      return out.total ? out : null;
    },

    /* ¿Este récord da ORO? Solo con cuenta (el servidor es quien lo cuenta:
     * un récord sin cuenta no lo puede comprobar nadie) y una vez por ruta y
     * día en este aparato (el servidor lleva el suyo, que es el que vale). */
    recordNuevo: function (ruta, antes, despues) {
      if (!logged() || !G().recordDaOro(antes, despues, this.datos())) return false;
      var marcas = {};
      try { marcas = JSON.parse(localStorage.getItem(REC_KEY) || '{}') || {}; } catch (e) { marcas = {}; }
      var k = usuario().toUpperCase() + '|' + ruta, hoy = this.hoy();
      if (marcas[k] === hoy) return false;
      marcas[k] = hoy;
      for (var m in marcas) if (marcas.hasOwnProperty(m) && marcas[m] < hoy - 2) delete marcas[m];
      try { localStorage.setItem(REC_KEY, JSON.stringify(marcas)); } catch (e) { /* nada */ }
      return true;
    },

    /* ---------- el servidor ----------
     * `enviar(cuerpo)` -> promesa de { ok, status, d }. Las pruebas la
     * cambian por una de mentira. */
    enviar: function (cuerpo) {
      var a = Ac(), cfg = window.PM.NET_CFG || {};
      if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY || !window.fetch || !a || !a.pedir) {
        return Promise.resolve({ ok: false, status: 0, d: { error: 'SIN CONEXIÓN' } });
      }
      var url = String(cfg.SUPABASE_URL).replace(/\/+$/, '') + '/functions/v1/cofres';
      return a.pedir(url, {
        method: 'POST',
        headers: { 'apikey': cfg.SUPABASE_KEY, 'Content-Type': 'application/json',
                   'Authorization': 'Bearer ' + (a.token || cfg.SUPABASE_KEY) },
        body: JSON.stringify(cuerpo)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          return { ok: res.ok, status: res.status, d: d || {} };
        });
      }).catch(function () { return { ok: false, status: 0, d: { error: 'SIN CONEXIÓN' } }; });
    },

    /* Lo que manda la nube (cofre_* y las piezas nuevas): se toma tal cual,
     * quedándose con lo mayor de cada contador */
    tomar: function (lg) {
      if (lg && A() && A().tomar) A().tomar(lg);
    },

    /* Pregunta al servidor cuántos lleva (y se trae sus contadores). cb(err, d) */
    estado: function (cb) {
      var self = this;
      if (!logged()) { if (cb) cb('SIN CUENTA', null); return Promise.resolve(null); }
      return this.enviar({ op: 'estado' }).then(function (r) {
        if (r.ok) self.tomar(r.d.logros);
        if (cb) cb(r.ok ? null : (r.d.error || 'NO SE PUDO'), r.ok ? r.d : null);
        return r.ok ? r.d : null;
      });
    },

    /* Tras subir la partida (Account.pushQuiet va en su cola): así el ORO
     * de un récord, que cuenta el trigger al subirla, llega a la pantalla. */
    refrescarTrasSubir: function () {
      var a = Ac(), self = this;
      if (!logged() || !a || !a.enCola) return;
      a.enCola(function () { return self.estado(null); }).then(function () {
        var UI = window.PM.UI;
        if (UI && UI.refreshCofres) UI.refreshCofres();
      }, function () { /* ya se verá al abrir la pantalla */ });
    },

    /* ABRIR uno. cb(err, { premio, resultado }). Antes se sube lo pendiente
     * (la partida recién jugada tiene que estar en la nube para contar), y
     * todo va en la cola de la cuenta para no cruzarse con otra subida. */
    abrir: function (tipo, cb) {
      var self = this, a = Ac();
      if (TIPOS.indexOf(tipo) === -1) { cb('ESE COFRE NO EXISTE', null); return; }
      if (!logged()) { cb('CREA UNA CUENTA PARA ABRIRLOS', null); return; }
      if (this.abriendo) { cb('YA SE ESTÁ ABRIENDO UNO', null); return; }
      this.abriendo = true;
      var fin = function (err, d) { self.abriendo = false; cb(err, d); };
      if (a.pushQuiet) a.pushQuiet();
      var pide = function () { return self.enviar({ op: 'abrir', tipo: tipo }); };
      var va = (a.enCola ? a.enCola(pide) : pide());
      va.then(function (r) {
        if (!r) { fin('NO SE PUDO', null); return; }
        if (r.d && r.d.logros) self.tomar(r.d.logros);
        if (!r.ok) { fin(r.d.error || 'NO SE PUDO ABRIR', null); return; }
        fin(null, { premio: r.d.premio, resultado: r.d.resultado });
      }, function () { fin('NO SE PUDO ABRIR', null); });
    },

    /* Nombre de una pieza de premio y su categoría (para la pantalla) */
    pieza: function (id) {
      var Tn = window.PM.Tienda, it = Tn && Tn.item(id);
      return it ? { id: id, name: it.name, cat: it.cat } : { id: id, name: String(id || '').toUpperCase(), cat: '' };
    }
  };

  window.PM.Cofres = Cofres;
})();
