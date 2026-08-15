/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/daily.js
 * DAILY: siete retos por semana. Define window.PM.Daily
 *
 * NO es un modo de juego, y esa es toda la idea. Antes había un
 * RETO DE HOY que era una partida aparte —la misma semilla para
 * todo el mundo, un intento al día, su propia clasificación—, y
 * para jugarlo tenías que dejar de jugar a lo tuyo. Si ese día no
 * te apetecía esa partida concreta, no había reto. Ahora el reto
 * es un objetivo que se cumple JUGANDO A LO QUE SEA: te sale al
 * paso mientras haces lo que ibas a hacer igual.
 *
 * UNO AL DÍA, Y ES EL DE HOY
 * Los siete de la semana se VEN desde el lunes —saber lo que viene
 * es medio motivo para volver—, pero solo se puede cumplir el del
 * día. El de ayer caducó y el de mañana aún no está.
 *
 * Se probó con recuperación (que los ya abiertos siguieran abiertos
 * hasta el domingo) y se quitó: si puedes ponerte al día el sábado,
 * el reto deja de ser diario y pasa a ser una lista de la compra
 * semanal. El "hoy" es justo lo que hace volver mañana.
 *
 * LA FECHA ES LA DE TU RELOJ, NO UTC
 * Y esto importa más de lo que parece. El RETO DE HOY viejo iba en
 * UTC porque tenía una clasificación mundial y todos tenían que
 * jugar el mismo día a la vez. El DAILY no manda nada a ningún
 * servidor: es tuyo y de este navegador. En UTC, quien juega en
 * América veía cambiar el reto a media tarde —en Perú, a las 19:00
 * del viernes ya le salía el del sábado—, que es sencillamente un
 * error a los ojos de quien está mirando el reloj.
 *
 * DE DÓNDE SALEN LOS SIETE
 * De la propia semana: un revoltijo de su fecha ordena el catálogo
 * y de ahí salen cinco libres y dos de modo, siempre en el mismo
 * orden para la misma semana. No hace falta servidor ni sorteo: dos
 * navegadores con la misma fecha sacan lo mismo, y la semana que
 * viene sale otra cosa.
 *
 * CINCO LIBRES GARANTIZADOS. Los de modo son los que hacen que el
 * Daily te enseñe el juego, pero una semana entera de modos
 * concretos —o peor, de retos que piden compañía— sería imposible
 * para quien juega solo. Cinco libres es el suelo.
 *
 * CÓMO SE MIDE
 * Con el mismo vocabulario de contadores que los logros
 * (PM.Achievements.BASE), y por el mismo embudo: Game.bumpAch(). No
 * hay nada que contar dos veces ni un gancho nuevo por el juego.
 * Lo que cambia es el alcance: aquí los contadores son DEL DÍA (o
 * de una partida, según el tipo), no de toda la vida.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var D = CFG.DAILY;

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  /* Fecha en el huso DE QUIEN JUEGA. Aquí no hay nada que sincronizar con
   * nadie, así que el día tiene que cambiar cuando cambia en su reloj. */
  function fechaLocal(d) {
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' +
      dos(d.getDate());
  }

  /* Revoltijo de un texto (FNV-1a). El mismo de js/reto.js, que ya servía
   * para repartir el mismo azar a todo el mundo. */
  function hash(s) {
    var h = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      h = (h ^ s.charCodeAt(i)) >>> 0;
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  /* Baraja una copia de la lista con una semilla. Es un Fisher-Yates con un
   * generador congruencial de andar por casa: no hace falta más, solo que
   * salga igual en todas partes. */
  function baraja(lista, semilla) {
    var out = lista.slice();
    var s = (semilla >>> 0) || 1;
    for (var i = out.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      var j = s % (i + 1);
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  function isArray(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
  }

  /* Tipo de acumulación de un contador ('suma' | 'mayor' | 'menor') */
  function tipo(stat) {
    var A = window.PM.Achievements;
    return (A && A.BASE[stat]) || 'suma';
  }

  var Daily = {
    /* ---------- el calendario ---------- */

    /* Día de la semana, con el LUNES como 0 (getDay pone el domingo el
     * primero, que aquí sería empezar la semana por el final). */
    diaSemana: function (d) {
      var n = (d || new Date()).getDay();
      return (n + 6) % 7;
    },

    /* Identificador de la semana: la fecha de SU LUNES. Sirve de nombre y de
     * semilla a la vez, y dos fechas de la misma semana dan el mismo. */
    semanaId: function (d) {
      d = d || new Date();
      var lunes = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      lunes.setDate(lunes.getDate() - this.diaSemana(d));
      return fechaLocal(lunes);
    },

    hoyISO: function (d) { return fechaLocal(d || new Date()); },

    /* Fecha del día i de una semana, para la lista */
    fechaDe: function (semana, i) {
      var p = String(semana).split('-');
      var d = new Date(+p[0], (+p[1]) - 1, +p[2]);
      d.setDate(d.getDate() + i);
      return fechaLocal(d);
    },

    /* Cómo se lee una fecha en pantalla (DD/MM) */
    fmtFecha: function (fecha) {
      var p = String(fecha || '').split('-');
      return (p.length === 3) ? (p[2] + '/' + p[1]) : String(fecha || '');
    },

    /* ---------- los siete de la semana ---------- */

    /* Los retos de una semana, de lunes a domingo. Deterministas: la misma
     * semana da siempre lo mismo, aquí y en cualquier otro navegador. */
    retosDe: function (semana) {
      semana = semana || this.semanaId();
      var s = hash(semana);
      var libres = baraja(D.LIBRES, s).slice(0, D.LIBRES_POR_SEMANA);
      var deModo = baraja(D.MODOS, hash(semana + '#m'))
        .slice(0, Math.max(0, D.DIAS - D.LIBRES_POR_SEMANA));
      /* Los dos de modo no van siempre en los mismos días: se mezclan con los
       * libres, también según la semana. Si cayeran fijos en martes y jueves
       * se notaría a la segunda semana. */
      return baraja(libres.concat(deModo), hash(semana + '#d'));
    },

    retos: function () { return this.retosDe(this.semanaId()); },

    /* El reto de hoy (el que se abre hoy), o null fuera de rango */
    hoy: function () {
      var i = this.diaSemana();
      return this.retos()[i] || null;
    },

    /* ---------- lo guardado ----------
     * { w: semana, p: [7] progreso, h: [7] cumplidos,
     *   racha: días seguidos, mejor: la mejor racha, ult: último día cumplido,
     *   sem: 1 si la semana ya se contó como completa,
     *   rv: marca del último borrón aplicado (CFG.DAILY.RESET) } */
    vacio: function (semana) {
      var o = { w: semana || this.semanaId(), p: [], h: [],
                racha: 0, mejor: 0, ult: '', sem: 0, rv: D.RESET };
      for (var i = 0; i < D.DIAS; i++) { o.p.push(0); o.h.push(0); }
      return o;
    },

    leer: function () {
      var sem = this.semanaId();
      var o = null;
      try { o = JSON.parse(localStorage.getItem(D.KEY)); }
      catch (e) { o = null; }
      if (!o || typeof o !== 'object' || !isArray(o.p) || !isArray(o.h)) {
        return this.vacio(sem);
      }
      /* Borrón y cuenta nueva: lo guardado viene de antes del último reseteo
       * (CFG.DAILY.RESET), así que se tira ENTERO —semana, racha y mejor
       * racha— en vez de arrastrar marcas hechas con otro calendario. No hay
       * nada que escribir aquí: `vacio()` ya lleva la marca nueva y se guarda
       * sola en cuanto se cumpla el primer reto. Los logros del DAILY viven en
       * otro sitio (js/achievements.js) y este borrón no los toca. */
      if (String(o.rv || '') !== String(D.RESET)) return this.vacio(sem);
      /* Semana nueva: el progreso se va, la racha NO. La racha es de días
       * seguidos jugando y no tiene por qué romperse un domingo por la
       * noche solo porque el calendario pase de página. */
      if (o.w !== sem) {
        var n = this.vacio(sem);
        n.racha = o.racha || 0;
        n.mejor = o.mejor || 0;
        n.ult = o.ult || '';
        return n;
      }
      var base = this.vacio(sem);
      for (var i = 0; i < D.DIAS; i++) {
        base.p[i] = Math.max(0, Math.floor(o.p[i] || 0));
        base.h[i] = o.h[i] ? 1 : 0;
      }
      base.racha = Math.max(0, Math.floor(o.racha || 0));
      base.mejor = Math.max(0, Math.floor(o.mejor || 0));
      base.ult = String(o.ult || '');
      base.sem = o.sem ? 1 : 0;
      return base;
    },

    guardar: function (o) {
      try { localStorage.setItem(D.KEY, JSON.stringify(o)); }
      catch (e) { /* sin almacenamiento */ }
    },

    /* ---------- consultas para la interfaz ---------- */

    /* ¿El reto del día i se puede cumplir AHORA? Solo el de hoy. El de ayer
     * caducó y el de mañana todavía no está: es un reto DIARIO, y dejar los
     * de atrás abiertos lo convertía en una lista de la compra semanal que se
     * despacha el sábado. */
    abierto: function (i) { return i === this.diaSemana(); },

    /* ¿El del día i ya pasó sin cumplirse? (para pintarlo como perdido) */
    caducado: function (i, est) {
      est = est || this.leer();
      return i < this.diaSemana() && !est.h[i];
    },

    /* Progreso del reto del día i */
    progreso: function (i, est) {
      est = est || this.leer();
      var r = this.retos()[i];
      if (!r) return null;
      var v = est.p[i] || 0;
      var hecho = !!est.h[i];
      var pct;
      if (r.menor) pct = hecho ? 1 : (v > 0 ? Math.min(1, r.goal / v) : 0);
      else pct = Math.min(1, r.goal > 0 ? v / r.goal : 0);
      return {
        reto: r, dia: i, valor: v, meta: r.goal, pct: pct,
        hecho: hecho, abierto: this.abierto(i)
      };
    },

    cumplidos: function (est) {
      est = est || this.leer();
      var n = 0;
      for (var i = 0; i < D.DIAS; i++) if (est.h[i]) n++;
      return n;
    },

    /* ¿El de hoy está por cumplir? */
    pendiente: function (est) {
      est = est || this.leer();
      return !est.h[this.diaSemana()];
    },

    racha: function () { return this.leer().racha; },
    mejorRacha: function () { return this.leer().mejor; },

    /* ---------- apuntar ----------
     * Lo llama Game.bumpAch, que es el único embudo por el que pasa todo lo
     * que hace el jugador. `tags` es lo que devuelve Game.achTags() (el
     * formato y el modo) y `o` los contadores de esa jugada.
     *
     * Devuelve los retos recién cumplidos (para el aviso en pantalla), o una
     * lista vacía. Nunca devuelve dos veces el mismo. */
    apunta: function (tags, o) {
      if (!o) return [];
      var est = this.leer();
      var i = this.diaSemana();                    // SOLO el de hoy
      var r = this.retos()[i];
      if (!r || est.h[i]) return [];               // no hay, o ya está
      // los de modo solo cuentan en el suyo
      if (r.modo && (!tags || tags.indexOf(r.modo) === -1)) return [];
      if (!o.hasOwnProperty(r.stat)) return [];
      var v = Math.floor(o[r.stat] || 0);
      if (!(v > 0)) return [];
      var t = tipo(r.stat);
      var antes = est.p[i] || 0;
      if (t === 'suma') est.p[i] = antes + v;
      else if (t === 'mayor') est.p[i] = Math.max(antes, v);
      else est.p[i] = (antes > 0) ? Math.min(antes, v) : v;
      if (est.p[i] === antes) return [];
      var listo = r.menor ? (est.p[i] > 0 && est.p[i] <= r.goal)
                          : (est.p[i] >= r.goal);
      if (!listo) { this.guardar(est); return []; }
      est.h[i] = 1;
      this.premiar(est);
      this.guardar(est);
      return [r];
    },

    /* Lo que se lleva quien cumple: experiencia, racha y los contadores de
     * los logros del DAILY. Se hace aquí y no en quien llama para que valga
     * igual venga de donde venga. */
    premiar: function (est) {
      var A = window.PM.Achievements;
      var L = window.PM.Level;
      var hoy = this.hoyISO();

      /* La racha: días seguidos cumpliendo el del día. Solo puede tocarse una
       * vez al día porque solo hay un reto al día, pero la guarda se queda
       * igual: es la que hace que sea idempotente. */
      if (est.ult !== hoy) {
        var ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        est.racha = (est.ult === fechaLocal(ayer)) ? (est.racha + 1) : 1;
        est.ult = hoy;
        if (est.racha > est.mejor) est.mejor = est.racha;
        if (A) A.recordFor(['daily'], { dailyRacha: est.racha });
      }

      if (A) A.recordFor(['daily'], { dailyOk: 1 });

      /* Semana redonda: los siete. Se cuenta una vez (bandera `sem`), que si
       * no, cumplir el último y volver a entrar la contaría otra vez. */
      if (!est.sem && this.cumplidos(est) >= CFG.DAILY.DIAS) {
        est.sem = 1;
        if (A) A.recordFor(['daily'], { dailySemana: 1 });
      }

      if (L) L.add(CFG.DAILY.XP);
      if (window.PM.Account) window.PM.Account.pushQuiet();
    },

    /* Borra lo guardado (solo lo usan las pruebas) */
    olvidar: function () {
      try { localStorage.removeItem(D.KEY); }
      catch (e) { /* sin almacenamiento */ }
    }
  };

  window.PM.Daily = Daily;
})();
