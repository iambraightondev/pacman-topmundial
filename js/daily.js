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
 * jugar el mismo día a la vez. El DAILY no tiene clasificación ni
 * nada que cuadrar con los demás: es tuyo. (Desde el 22 sep la
 * cartilla viaja con la cuenta, dentro de `ajustes` del perfil, para
 * que otro aparato no la vea en blanco ni vuelva a pagar la racha:
 * ver Daily.paraNube y Daily.desdeNube. Pero el día sigue siendo el
 * de tu reloj.) En UTC, quien juega en
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
 * DESDE EL 5 OCT 2026, CON ROLES: cuatro libres, dos de DESATADO con un
 * rol concreto (Asesino, Tanque, Mago o Soporte; nunca dos del mismo en
 * la semana, y los cuatro salen cada dos semanas) y uno de otro modo. Las
 * semanas de antes siguen con la baraja de antes (ver retosConRoles).
 *
 * CÓMO SE MIDE
 * Con el mismo vocabulario de contadores que los logros
 * (PM.Achievements.BASE), y por el mismo embudo: Game.bumpAch(). No
 * hay nada que contar dos veces ni un gancho nuevo por el juego.
 * Lo que cambia es el alcance: aquí los contadores son DEL DÍA (o
 * de una partida, según el tipo), no de toda la vida.
 *
 * DOS NIVELES Y UN COMODÍN (29 sep 2026)
 * Con un solo reto, la racha solo la mantenían los buenos: los de
 * UNA partida ("20.000 puntos en una partida") se la rompían a
 * quien había sumado cincuenta mil en el día. Ahora cada día hay:
 *   - el BÁSICO, siempre el mismo: sumar CFG.DAILY.BASICO_PUNTOS
 *     entre todas las partidas del día. ES EL QUE LLEVA LA RACHA.
 *   - el DURO, el de la baraja de la semana, como siempre. Paga
 *     ADEMÁS del básico, y la semana completa sigue pidiendo los
 *     siete duros (dailySemana, el cofre de PLATA).
 * Cumplir el duro da el básico por hecho si aún no lo estaba: quien
 * hace el difícil no pierde la racha por no llegar a los puntos.
 * Y el COMODÍN: uno por cada siete días de racha, como mucho uno
 * guardado; el primer día que acaba sin básico se gasta solo y la
 * racha no se rompe (ese día no paga nada ni recupera nada).
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var D = CFG.DAILY;

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  /* Fecha en el huso DE QUIEN JUEGA. No hay que ir al paso de nadie más,
   * así que el día tiene que cambiar cuando cambia en su reloj. */
  function fechaLocal(d) {
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' +
      dos(d.getDate());
  }

  /* El día de al lado de una fecha 'AAAA-MM-DD' (n = +1 mañana, -1 ayer).
   * Con Date de calendario, no sumando milisegundos: un cambio de hora
   * haría que un "día" de 23 horas se quedara en el mismo. */
  function otroDia(fecha, n) {
    var p = String(fecha).split('-');
    var d = new Date(+p[0], (+p[1]) - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return fechaLocal(d);
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

  /* La misma baraja, pero sacando cada posición de los bits ALTOS del
   * generador. La de arriba usa `s % (i + 1)`, que mira los bits bajos, y en
   * un congruencial módulo 2^32 esos se repiten enseguida (el último alterna
   * par-impar a cada paso): con listas cortas salen muy pocas mezclas
   * distintas. Con cuatro roles se notaba: las mismas parejas cada mes. No se
   * cambia la de arriba porque de ella salen las semanas de antes. */
  function barajaAlta(lista, semilla) {
    var out = lista.slice();
    var s = (semilla >>> 0) || 1;
    for (var i = out.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      var j = Math.floor((s / 4294967296) * (i + 1));
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
      if (this.conRoles(semana)) return this.retosConRoles(semana);
      /* LA BARAJA DE ANTES, intacta: las semanas de antes de ROLES_DESDE
       * (la del 28 sep incluida) sacan exactamente lo mismo que sacaban. */
      var s = hash(semana);
      var libres = baraja(D.LIBRES, s).slice(0, D.LIBRES_POR_SEMANA);
      var deModo = baraja(D.MODOS, hash(semana + '#m'))
        .slice(0, Math.max(0, D.DIAS - D.LIBRES_POR_SEMANA));
      /* Los dos de modo no van siempre en los mismos días: se mezclan con los
       * libres, también según la semana. Si cayeran fijos en martes y jueves
       * se notaría a la segunda semana. */
      return baraja(libres.concat(deModo), hash(semana + '#d'));
    },

    /* ---------- LA BARAJA CON ROLES (desde el 5 oct 2026) ----------
     * CFG.DAILY.SEMANA dice cuántos de cada: libres, de rol (DESATADO con un
     * rol concreto, DE_ROL) y de otro modo (MODOS sin los de DESATADO). Todo
     * con barajaAlta (ver arriba por qué); lo nuevo es cómo salen los roles
     * (ver rolesDe). */
    conRoles: function (semana) {
      return !!D.ROLES_DESDE && String(semana) >= String(D.ROLES_DESDE);
    },

    retosConRoles: function (semana) {
      var S = D.SEMANA, self = this;
      var libres = barajaAlta(D.LIBRES, hash(semana)).slice(0, S.LIBRES);
      var otros = D.MODOS.filter(function (r) { return r.modo !== 'hab'; });
      var deModo = barajaAlta(otros, hash(semana + '#m')).slice(0, S.MODO);
      var deRol = this.rolesDe(semana).map(function (rol) {
        return self.retoDeRol(semana, rol);
      });
      return barajaAlta(libres.concat(deRol, deModo), hash(semana + '#d'));
    },

    /* Los roles de la semana, sin repetir. Van POR PAREJAS DE SEMANAS: cada
     * pareja baraja los cuatro, la primera semana se lleva dos y la segunda
     * los otros dos. Así cada rol sale una vez cada dos semanas y ninguno se
     * queda un mes sin salir, que es lo que haría un sorteo semana a semana.
     * El orden de los roles es el de DE_ROL (no el de CFG.HAB.ROL_IDS, que
     * es solo el de los selectores y se puede reordenar). */
    rolesDe: function (semana) {
      if (!this.conRoles(semana)) return [];
      var roles = [];
      D.DE_ROL.forEach(function (r) { if (roles.indexOf(r.rol) === -1) roles.push(r.rol); });
      var n = this.semanasDesde(D.ROLES_DESDE, semana);
      var pareja = Math.floor(n / 2);
      var orden = barajaAlta(roles, hash(D.ROLES_DESDE + '#roles#' + pareja));
      var cuantos = Math.min(D.SEMANA.ROL, Math.floor(roles.length / 2));
      var desde = (n % 2) * cuantos;
      return orden.slice(desde, desde + cuantos);
    },

    /* El reto de un rol esa semana. Cada vez que el rol vuelve (una vez por
     * pareja de semanas) toca el SIGUIENTE de los suyos: así salen todos por
     * turno y no el mismo dos veces seguidas. */
    retoDeRol: function (semana, rol) {
      var suyos = D.DE_ROL.filter(function (r) { return r.rol === rol; });
      var pareja = Math.floor(this.semanasDesde(D.ROLES_DESDE, semana) / 2);
      return suyos[(pareja + hash(rol)) % suyos.length];
    },

    /* Semanas enteras de un lunes a otro (con Date de calendario y
     * redondeando: un cambio de hora deja una semana en 167 o 169 horas). */
    semanasDesde: function (desde, semana) {
      var a = String(desde).split('-'), b = String(semana).split('-');
      var da = new Date(+a[0], (+a[1]) - 1, +a[2]);
      var db = new Date(+b[0], (+b[1]) - 1, +b[2]);
      return Math.max(0, Math.round((db - da) / (7 * 86400000)));
    },

    retos: function () { return this.retosDe(this.semanaId()); },

    /* El reto de hoy (el que se abre hoy), o null fuera de rango */
    hoy: function () {
      var i = this.diaSemana();
      return this.retos()[i] || null;
    },

    /* El BÁSICO: el mismo todos los días. Tiene forma de reto para que el
     * aviso en partida y la pantalla lo traten como a los demás. */
    basico: function () {
      return { id: 'd_basico', desc: D.BASICO_DESC, stat: 'puntosMax',
               goal: D.BASICO_PUNTOS, basico: true, titulo: 'BÁSICO CUMPLIDO' };
    },

    /* ---------- lo guardado ----------
     * { w: semana, p: [7] progreso del duro, h: [7] duros cumplidos,
     *   q: [7] puntos sumados cada día, b: [7] básicos cumplidos,
     *   racha: días seguidos con el básico, mejor: la mejor racha,
     *   ult: último día que cuenta para la racha (cumplido o salvado),
     *   sem: 1 si la semana ya se contó como completa,
     *   hito: días del último premio de racha cobrado (0 si ninguno),
     *   cg: día en que se ganó el último comodín ('' ninguno),
     *   cu: día que salvó el último comodín gastado ('' ninguno),
     *   rv: marca del último borrón aplicado (CFG.DAILY.RESET) }
     *
     * El comodín va en FECHAS y no en un "tengo 1": así dos aparatos se
     * funden quedándose con la más reciente de cada una, y uno gastado en
     * un aparato no resucita en el otro (con un 0/1 no hay forma de saber
     * cuál de los dos es el bueno). Está guardado si se ganó DESPUÉS del
     * último que se gastó. */
    vacio: function (semana) {
      var o = { w: semana || this.semanaId(), p: [], h: [], q: [], b: [],
                racha: 0, mejor: 0, ult: '', sem: 0, hito: 0,
                cg: '', cu: '', rv: D.RESET };
      for (var i = 0; i < D.DIAS; i++) {
        o.p.push(0); o.h.push(0); o.q.push(0); o.b.push(0);
      }
      return o;
    },

    leer: function () {
      var o = null;
      try { o = JSON.parse(localStorage.getItem(D.KEY)); }
      catch (e) { o = null; }
      return this.normalizar(o);
    },

    /* Pone en limpio una cartilla venga de donde venga —de este navegador o
     * de la nube— y la trae a la semana de hoy. */
    normalizar: function (o) {
      var sem = this.semanaId();
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
      var base = this.vacio(sem);
      base.racha = Math.max(0, Math.floor(o.racha || 0));
      base.mejor = Math.max(0, Math.floor(o.mejor || 0));
      base.ult = String(o.ult || '');
      base.hito = this.hitoDe(o);
      base.cg = String(o.cg || '');
      base.cu = String(o.cu || '');
      if (o.w === sem) {
        var q = isArray(o.q) ? o.q : [], b = isArray(o.b) ? o.b : [];
        for (var i = 0; i < D.DIAS; i++) {
          base.p[i] = Math.max(0, Math.floor(o.p[i] || 0));
          base.h[i] = o.h[i] ? 1 : 0;
          base.q[i] = Math.max(0, Math.floor(q[i] || 0));
          /* Un duro cumplido es un básico cumplido: así se leen también las
           * cartillas de antes de los dos niveles, que no traen `b`. */
          base.b[i] = (b[i] || o.h[i]) ? 1 : 0;
        }
        base.sem = o.sem ? 1 : 0;
      }
      return this.asentar(base);
    },

    /* ¿Hay un comodín guardado? */
    tieneComodin: function (est) {
      est = est || this.leer();
      return !!est.cg && String(est.cg) > String(est.cu || '');
    },

    /* PONE LA RACHA AL DÍA. Hasta los dos niveles, una racha rota se seguía
     * enseñando entera hasta el siguiente reto cumplido; ahora hace falta
     * saberlo antes, porque el comodín se gasta SOLO al acabar el día sin
     * básico. No se escribe nada: se calcula cada vez que se lee, y como
     * solo depende de la cartilla y de la fecha, dos aparatos llegan a lo
     * mismo.
     *   - el último día que cuenta es hoy o ayer: la racha sigue viva.
     *   - si no, el primer día perdido lo salva el comodín, si lo hay (se
     *     gasta, y ese día pasa a contar como el último); si con eso ya
     *     llega a ayer, sigue viva.
     *   - si no, se rompe: racha a cero y los escalones vuelven a empezar. */
    asentar: function (est) {
      if (!(est.racha > 0) || !est.ult) return est;
      var ayer = otroDia(this.hoyISO(), -1);
      if (est.ult >= ayer) return est;
      var perdido = otroDia(est.ult, 1);
      if (this.tieneComodin(est)) {
        est.cu = perdido;
        if (perdido === ayer) { est.ult = perdido; return est; }
      }
      est.racha = 0;
      est.hito = 0;
      return est;
    },

    /* De dónde arranca el premio de racha en una partida guardada que no lo
     * lleva (todas las de antes de esto). NO se paga hacia atrás —sería
     * repartir monedas por algo que ya pasó— pero tampoco se pone a cero:
     * quien lleva veinte días seguidos no tiene que volver a pasar por el
     * de tres, cobra el siguiente que le toque. */
    hitoDe: function (o) {
      if (o && o.hito != null) return Math.max(0, Math.floor(o.hito));
      var racha = Math.max(0, Math.floor((o && o.racha) || 0)), n = 0;
      var lista = D.RACHA_PREMIOS || [];
      for (var i = 0; i < lista.length; i++) {
        if (racha >= lista[i].dias) n = lista[i].dias;
      }
      return n;
    },

    /* El próximo escalón de racha que queda por cobrar, o null si ya están
     * todos. Lo usa la cartilla para enseñar hacia dónde se va. */
    proximoHito: function (est) {
      est = est || this.leer();
      var lista = D.RACHA_PREMIOS || [];
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].dias > (est.hito || 0)) return lista[i];
      }
      return null;
    },

    guardar: function (o) {
      try { localStorage.setItem(D.KEY, JSON.stringify(o)); }
      catch (e) { /* sin almacenamiento */ }
    },

    /* ---------- LA CARTILLA VIAJA CON LA CUENTA (22 sep 2026) ----------
     * Hasta ahora era de este navegador y punto: abrir tu cuenta en otro
     * ordenador la enseñaba en blanco —la semana, la racha viva y los
     * escalones de racha ya cobrados—, y como el `hito` es justo lo que
     * impide cobrar dos veces, el otro aparato podía volver a pagarlos.
     * Viaja dentro de la columna `ajustes` del perfil, que es la bolsa de
     * lo de esta cuenta que no es ni récord ni contador: son unos cientos
     * de bytes y así no hace falta tocar el esquema. */
    paraNube: function () { return this.leer(); },

    /* Funde la de la nube con la de aquí. NO gana la más nueva: gana lo
     * MEJOR de cada lado, como en los récords, porque un reto cumplido en
     * el otro ordenador está cumplido y no hay por qué quitárselo. Los
     * escalones de racha cobrados se quedan con el mayor de los dos: así ni
     * se pagan dos veces ni se pierde el sitio. */
    desdeNube: function (o) {
      if (!o || typeof o !== 'object') return false;
      var r = this.normalizar(o), a = this.leer(), i;
      for (i = 0; i < D.DIAS; i++) {
        a.p[i] = Math.max(a.p[i] || 0, r.p[i] || 0);
        a.h[i] = (a.h[i] || r.h[i]) ? 1 : 0;
        /* Los puntos del día, con el mayor y NO sumando: la cartilla va y
         * vuelve de la nube entera, y sumar contaría dos veces lo mismo. Lo
         * jugado a la vez en dos aparatos sin juntarse se queda en el mejor
         * de los dos; nunca de más. */
        a.q[i] = Math.max(a.q[i] || 0, r.q[i] || 0);
        a.b[i] = (a.b[i] || r.b[i]) ? 1 : 0;
      }
      a.racha = Math.max(a.racha || 0, r.racha || 0);
      a.mejor = Math.max(a.mejor || 0, r.mejor || 0);
      a.hito = Math.max(a.hito || 0, r.hito || 0);
      a.sem = (a.sem || r.sem) ? 1 : 0;
      if (String(r.ult || '') > String(a.ult || '')) a.ult = r.ult;
      /* El comodín, fecha a fecha: el más reciente ganado y el más reciente
       * gastado. Uno gastado allí queda gastado aquí. */
      if (String(r.cg || '') > String(a.cg || '')) a.cg = r.cg;
      if (String(r.cu || '') > String(a.cu || '')) a.cu = r.cu;
      this.guardar(a);
      return true;
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

    /* Progreso del BÁSICO del día i: los puntos sumados ese día */
    progresoBasico: function (i, est) {
      est = est || this.leer();
      var v = est.q[i] || 0, hecho = !!est.b[i];
      return {
        reto: this.basico(), dia: i, valor: v, meta: D.BASICO_PUNTOS,
        pct: hecho ? 1 : Math.min(1, D.BASICO_PUNTOS > 0 ? v / D.BASICO_PUNTOS : 0),
        hecho: hecho, abierto: this.abierto(i),
        salvado: this.salvado(i, est)
      };
    },

    /* ¿El día i de esta semana lo salvó el comodín? */
    salvado: function (i, est) {
      est = est || this.leer();
      return !!est.cu && est.cu === this.fechaDe(this.semanaId(), i);
    },

    /* Días de la semana con el básico cumplido */
    basicos: function (est) {
      est = est || this.leer();
      var n = 0;
      for (var i = 0; i < D.DIAS; i++) if (est.b[i]) n++;
      return n;
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
     * lista vacía: el básico primero y el duro después si caen a la vez.
     * Nunca devuelve dos veces el mismo. */
    apunta: function (tags, o) {
      if (!o) return [];
      var est = this.leer();
      var i = this.diaSemana();                    // SOLO el de hoy
      var out = [], cambio = false;

      /* EL BÁSICO: los puntos de cada partida, de cualquier modo. Llegan con
       * `puntosMax` porque es lo que manda Game.closeRun UNA vez por partida,
       * con sus puntos (en ningún otro sitio se apunta). Se siguen sumando
       * después de cumplirlo: la cartilla enseña lo hecho en el día. */
      var pts = o.hasOwnProperty('puntosMax') ? Math.floor(o.puntosMax || 0) : 0;
      if (pts > 0) {
        est.q[i] = (est.q[i] || 0) + pts;
        cambio = true;
        if (!est.b[i] && est.q[i] >= D.BASICO_PUNTOS) {
          est.b[i] = 1;
          this.premiarBasico(est);
          out.push(this.basico());
        }
      }

      var r = this.retos()[i];
      var duro = this.apuntaDuro(est, r, i, tags, o);
      if (duro) {
        cambio = true;
        if (duro === 'hecho') {
          est.h[i] = 1;
          /* el duro trae el básico si aún no estaba: la racha es de quien
           * cumple, y el difícil también es cumplir */
          if (!est.b[i]) {
            est.b[i] = 1;
            this.premiarBasico(est);
            out.push(this.basico());
          }
          this.premiar(est);
          out.push(r);
        }
      }
      if (cambio) this.guardar(est);
      if (out.length && window.PM.Account) window.PM.Account.pushQuiet();
      return out;
    },

    /* Lleva el progreso del DURO de hoy. Devuelve '' si no se ha movido,
     * 'avanza' si ha avanzado y 'hecho' si acaba de cumplirse. */
    apuntaDuro: function (est, r, i, tags, o) {
      if (!r || est.h[i]) return '';               // no hay, o ya está
      // los de modo solo cuentan en el suyo
      if (r.modo && (!tags || tags.indexOf(r.modo) === -1)) return '';
      if (!o.hasOwnProperty(r.stat)) return '';
      var v = Math.floor(o[r.stat] || 0);
      if (!(v > 0)) return '';
      var t = tipo(r.stat);
      var antes = est.p[i] || 0;
      if (t === 'suma') est.p[i] = antes + v;
      else if (t === 'mayor') est.p[i] = Math.max(antes, v);
      else est.p[i] = (antes > 0) ? Math.min(antes, v) : v;
      if (est.p[i] === antes) return '';
      var listo = r.menor ? (est.p[i] > 0 && est.p[i] <= r.goal)
                          : (est.p[i] >= r.goal);
      return listo ? 'hecho' : 'avanza';
    },

    /* Lo que se lleva quien cumple el BÁSICO: la racha (y sus escalones),
     * el comodín cada siete días, sus monedas y su experiencia. Solo puede
     * pasar una vez al día (bandera b[i]), y la guarda de `ult` se queda
     * igual: es la que hace que la racha sea idempotente. */
    premiarBasico: function (est) {
      var A = window.PM.Achievements;
      var L = window.PM.Level;
      var Tn = window.PM.Tienda;
      var hoy = this.hoyISO();

      /* La racha: días seguidos con el básico. `leer()` ya la ha puesto al
       * día (asentar): si viene rota, vale 0 y aquí vuelve a empezar. */
      if (est.ult !== hoy) {
        est.racha = (est.ult === otroDia(hoy, -1)) ? (est.racha + 1) : 1;
        est.ult = hoy;
        if (est.racha > est.mejor) est.mejor = est.racha;
        if (A) A.recordFor(['daily'], { dailyRacha: est.racha });
        /* Un comodín cada siete días de racha, y como mucho uno guardado:
         * si ya hay uno, el de hoy no se acumula. */
        if (est.racha % D.COMODIN_CADA === 0 && !this.tieneComodin(est)) est.cg = hoy;
      }

      if (A) A.recordFor(['daily'], { dailyBasicos: 1 });
      if (Tn) Tn.ganar(D.BASICO_MONEDAS);

      /* Escalones de racha. Se cobran todos los que la racha ya haya
       * pasado —normalmente uno— y se apunta el último para no repetirlo.
       * Si la racha se rompió y hoy vale 1, el contador vuelve a empezar y
       * se pueden volver a cobrar: son otra vez los días de volver. */
      var lista = D.RACHA_PREMIOS || [];
      if (est.racha <= 1) est.hito = 0;
      for (var k = 0; k < lista.length; k++) {
        if (est.racha >= lista[k].dias && (est.hito || 0) < lista[k].dias) {
          est.hito = lista[k].dias;
          if (Tn) Tn.ganar(lista[k].monedas);
        }
      }

      if (L) L.add(D.BASICO_XP);
    },

    /* Lo que se lleva quien cumple el DURO: su experiencia, sus monedas, los
     * contadores de los logros del DAILY y, con los siete, la semana. La
     * racha no: esa la lleva el básico (que el duro trae consigo). */
    premiar: function (est) {
      var A = window.PM.Achievements;
      var L = window.PM.Level;
      var Tn = window.PM.Tienda;

      if (A) A.recordFor(['daily'], { dailyOk: 1 });
      if (Tn) Tn.ganar(CFG.TIENDA.POR_RETO);

      /* Semana redonda: los siete DUROS. Se cuenta una vez (bandera `sem`),
       * que si no, cumplir el último y volver a entrar la contaría otra vez.
       * dailySemana es de lo que salen los cofres de PLATA (js/cofres.js y
       * la función del servidor): los básicos no cuentan aquí. */
      if (!est.sem && this.cumplidos(est) >= CFG.DAILY.DIAS) {
        est.sem = 1;
        if (A) A.recordFor(['daily'], { dailySemana: 1 });
        if (Tn) Tn.ganar(CFG.TIENDA.POR_SEMANA);
      }

      if (L) L.add(CFG.DAILY.XP);
    },

    /* Borra lo guardado (solo lo usan las pruebas) */
    olvidar: function () {
      try { localStorage.removeItem(D.KEY); }
      catch (e) { /* sin almacenamiento */ }
    }
  };

  window.PM.Daily = Daily;
})();
