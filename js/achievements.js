/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/achievements.js
 * Logros. Define window.PM.Achievements
 *
 * No se guarda "logro conseguido sí/no": se guardan CONTADORES
 * (fantasmas comidos, mejor racha, frutas, partidas, nivel más
 * lejos, niveles seguidos sin morir, mejor puntuación y mejor
 * tiempo del nivel 1) y los logros se deducen de ellos con
 * CFG.ACHIEVEMENTS. Así se pueden recalcular en cualquier momento
 * —al entrar en una cuenta, por ejemplo— sin depender de cuándo
 * pasó cada cosa.
 *
 * LOGROS POR MODO
 * Cada contador se lleva DOS veces: uno global y otro por modo,
 * con la clave `modo:stat` (por ejemplo `hab:fantasmas`). Las
 * claves por modo no se escriben a mano en ninguna parte: salen de
 * la propia CFG.ACHIEVEMENTS, así que añadir un logro de un modo
 * nuevo crea su contador solo. Los guardados de antes siguen
 * valiendo tal cual: sus claves son las globales de siempre y las
 * nuevas simplemente empiezan a cero.
 *
 * Aparte se anota qué logros ya se han anunciado, para no volver
 * a celebrarlos en cada partida.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  /* Contadores base y su tipo de acumulación:
   *   suma  — se van sumando
   *   mayor — se queda con el récord
   *   menor — se queda con la mejor marca (tiempos), 0 = todavía nada */
  var BASE = {
    fantasmas: 'suma',
    frutas:    'suma',
    partidas:  'suma',
    mordiscos: 'suma',   // fantasmas comidos con la Q (modo DESATADO)
    muros:     'suma',   // muros atravesados con la E (modo DESATADO)
    cazas:     'suma',   // Pac-Man cazados llevando un fantasma (PAC-MAN VS.)
    dailyOk:   'suma',   // retos diarios cumplidos (js/daily.js)
    dailySemana: 'suma', // semanas con los siete cumplidos
    dailyRacha: 'mayor', // días seguidos cumpliendo alguno
    racha:     'mayor',
    /* Cuántas veces se ha encadenado 2, 3 y 4 fantasmas con una misma
     * superpastilla. Son ACUMULATIVOS: un cuádruple suma también en dobles y
     * en triples, porque lo que se pregunta es «cuántas veces he encadenado
     * al menos tantos». Así se pueden fundir dos aparatos sumando, que es lo
     * que hace la cuenta, y de paso restando en la pantalla salen los
     * exactos. CUATRO ES EL TOPE: hay cuatro fantasmas y ninguno vuelve a
     * ponerse azul dentro del mismo susto, ni siquiera con el GRITO o el
     * MORDISCO de DESATADO (el GRITO reinicia la cadena). */
    racha2:    'suma',
    racha3:    'suma',
    racha4:    'suma',
    /* ---------- el reparto declarado de lo viejo ----------
     * Los contadores por modo son posteriores al juego y, al crearlos, lo ya
     * jugado se apuntó TODO a CLÁSICO: no había forma de saber de qué modo
     * era cada partida. La hay, en realidad, pero no está en ningún archivo:
     * la sabe quien jugó. `repHab` es el porcentaje de aquellas partidas que
     * fueron de DESATADO —lo dice el propio jugador— y `repBase` cuántas
     * partidas había cuando lo dijo, para que el reparto se aplique SOLO a
     * esas y no a las que se jueguen después, que ya se cuentan bien.
     *
     * Los dos son 'mayor' a propósito: así viajan a la cuenta y vuelven de
     * ella sin que fundirlas los pierda (los contadores se funden quedándose
     * con lo más alto de cada lado, que es lo que permite que esto llegue a
     * un aparato donde no se declaró nada).
     *
     * Es un dato DECLARADO, no medido, y la pantalla lo dice. */
    repHab:    'mayor',
    repBase:   'mayor',
    /* 1 = ese reparto no lo declaró el jugador: se estimó por sus mordiscos,
     * que solo existen en DESATADO. La pantalla lo dice distinto. */
    repEst:    'mayor',
    /* Sube cada vez que se limpia a mano una cuenta en la nube. Si la nube lo
     * trae más alto que el de aquí, la nube manda (ver Account.applyRemote). */
    purga:     'mayor',
    /* Para las cifras del PERFIL (js/stats.js): el tiempo jugado en
     * segundos, los niveles despejados y lo comido del laberinto. */
    tiempo:    'suma',
    niveles:   'suma',
    pastillas: 'suma',
    super:     'suma',   // superpastillas
    nivelMax:  'mayor',
    limpios:   'mayor',
    puntosMax: 'mayor',
    mejorT1:   'menor',
    /* Los que piden las skins (js/skins.js). No los mira ningún logro, pero
     * viven aquí para viajar a la cuenta con los demás (perfiles.logros). */
    muertes:   'suma',   // vidas perdidas propias (CALAVERA)
    top10:     'mayor',  // 1 = se vio en el top 10 del TOP MUNDIAL (DORADO)
    halloween: 'mayor',  // 1 = jugó en Halloween (skins de temporada)
    navidad:   'mayor',  // 1 = jugó en Navidad
    lunallena: 'mayor',  // 1 = jugó una noche de luna llena (HOMBRE LOBO)
    /* TIENDA (js/tienda.js): monedas GANADAS en total, nunca el saldo. El
     * saldo se calcula, así que juntar dos aparatos no puede duplicar dinero
     * ni perder compras. */
    monedas:   'suma',
    /* ...y el REGALO DE VETERANO, aparte de lo ganado: se calcula una vez con
     * lo jugado hasta entonces (sembrarBono). Es un máximo, no una suma, para
     * que juntar dos aparatos no lo cobre dos veces. */
    bono:      'mayor',
    /* ...y lo GASTADO en continuar partidas (CFG.CONTINUAR). Suma, como lo
     * ganado: el saldo sale de restarlo. */
    gastoCont: 'suma'
  };
  /* ...y las MAESTRÍAS DE ROL (js/maestria.js), cuatro por rol. Viven aquí
   * para viajar a la cuenta con lo demás, sin columna nueva:
   *   mae_<rol>     puntos de maestría ganados
   *   maes_<rol>    notas S sacadas con ese rol
   *   maep_<rol>    partidas que han contado
   *   maesem_<rol>  de ellas, cuántas se sembraron de lo jugado antes
   * y una para todos: maevivas, las partidas de DESATADO cerradas con las
   * maestrías ya en marcha (cortas incluidas). Es lo que hay que quitarle a
   * hab:partidas para saber cuántas son de ANTES y se pueden sembrar. */
  BASE.maevivas = 'suma';
  ((CFG.HAB && CFG.HAB.ROL_IDS) || []).forEach(function (r) {
    BASE['mae_' + r] = 'suma';
    BASE['maes_' + r] = 'suma';
    BASE['maep_' + r] = 'suma';
    BASE['maesem_' + r] = 'mayor';
  });
  /* ...y una por cosa comprable: c_<id> = 1 si está comprada. Salen del
   * catálogo, así que añadir algo a la tienda crea su contador solo. */
  /* (las de COFRE y las del PASE van por el mismo contador: no se compran,
   * pero cuando un cofre las suelta —o el camino del mes las entrega— se
   * guardan igual que una compra) */
  [CFG.EMOTES_TIENDA, CFG.EFECTOS, CFG.ACCESORIOS,
   CFG.SKINS.filter(function (sk) {
     return sk.grupo === 'tienda' || sk.grupo === 'cofre' || sk.grupo === 'pase';
   })].forEach(function (lista) {
    (lista || []).forEach(function (it) { BASE['c_' + it.id] = 'mayor'; });
  });

  /* ---------- contadores SUELTOS: los del PASE ----------
   * El pase necesita dos contadores por temporada (px_AAAA-MM con la
   * experiencia de ese mes, pp_AAAA-MM con el carril de pago). Son uno por
   * mes y para siempre, así que NO se declaran uno a uno: meter cuatro años
   * de meses en STATS metía cien claves a cero en el almacén, y el almacén se
   * lee y se escribe entero miles de veces por partida — medido, encarecía
   * cada consulta del saldo un 40 % para guardar ceros.
   *
   * Se reconocen por su forma y nacen el día que hacen falta. Lo único que
   * hay que recordar: una clave suelta también tiene que juntarse en merge(),
   * que va por STATS y por sí solo las tiraría.
   * -------------------------------------------------------- */
  function tipoSuelto(key) {
    if (/^px_[0-9]{4}-(0[1-9]|1[0-2])$/.test(key)) return 'suma';    // experiencia
    if (/^pp_[0-9]{4}-(0[1-9]|1[0-2])$/.test(key)) return 'mayor';   // carril de pago
    return null;
  }

  /* Clave de un contador: la global es el nombre pelado, la de un modo va
   * con su prefijo. Es la misma cuenta en los dos sitios. */
  function claveDe(modo, stat) {
    return modo ? (modo + ':' + stat) : stat;
  }

  /* Contador que mira un logro */
  function claveLogro(a) {
    return claveDe(a.modo, a.stat);
  }

  /* Tipo de acumulación de una clave, venga con modo o sin él */
  function tipoDe(key) {
    var i = String(key).indexOf(':');
    var base = (i < 0) ? key : key.slice(i + 1);
    return BASE.hasOwnProperty(base) ? BASE[base] : null;
  }

  /* Todas las claves que se guardan: las globales y las que pide algún
   * logro por modo. Se calcula una vez, al cargar. */
  var STATS = (function () {
    var o = {}, k, i, a;
    for (k in BASE) if (BASE.hasOwnProperty(k)) o[k] = BASE[k];
    for (i = 0; i < CFG.ACHIEVEMENTS.length; i++) {
      a = CFG.ACHIEVEMENTS[i];
      if (!a.modo) continue;
      var c = claveLogro(a);
      if (tipoDe(c)) o[c] = tipoDe(c);
    }
    /* Y las que pide la pantalla de CIFRAS para su tabla por modo, aunque no
     * las mire ningún logro. Hasta aquí un contador por modo solo existía si
     * algún logro lo necesitaba, y de DESATADO no había ninguno que contara
     * partidas: `hab:partidas` no existía, así que la tabla enseñaba un cero
     * eterno a quien no juega a otra cosa. Se cuentan las cuatro que se
     * enseñan, para los cinco mundos. */
    var M = (CFG.STATS && CFG.STATS.MUNDOS) || [];
    for (i = 0; i < M.length; i++) {
      ['partidas', 'puntosMax', 'fantasmas', 'tiempo'].forEach(function (base) {
        o[M[i].id + ':' + base] = BASE[base];
      });
    }
    return o;
  })();

  /* Los mundos que NO son clásico: cada partida es de uno solo (Game.achTags) */
  var MUNDOS_EXCL = ['hab', 'lab', 'caza', 'vs'];

  function vacio() {
    var o = {};
    for (var k in STATS) if (STATS.hasOwnProperty(k)) o[k] = 0;
    return o;
  }

  function isArray(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
  }

  function load() {
    var out = { c: vacio(), v: [], m: 0, d: 0, k: 0, b: 0, e: 0, est: 0 };
    try {
      var raw = localStorage.getItem(CFG.ACH_KEY);
      var d = raw ? JSON.parse(raw) : null;
      if (d && d.c) {
        for (var k in STATS) {
          if (!STATS.hasOwnProperty(k)) continue;
          var n = parseInt(d.c[k], 10);
          if (isFinite(n) && n > 0) out.c[k] = n;
        }
        /* ...y las SUELTAS, que no están en STATS y por tanto no salen de
         * vacio(): sin esto se guardarían bien y se perderían en la
         * siguiente lectura (ver tipoSuelto). */
        for (var ks in d.c) {
          if (!d.c.hasOwnProperty(ks) || !tipoSuelto(ks)) continue;
          var ns = parseInt(d.c[ks], 10);
          if (isFinite(ns) && ns > 0) out.c[ks] = ns;
        }
      }
      if (d && isArray(d.v)) out.v = d.v.slice();
      if (d && d.m) out.m = 1;          // los contadores por modo, ya sembrados
      if (d && d.d) out.d = 1;          // y los del DAILY, sembrados del reto
      if (d && d.k) out.k = 1;          // y las muertes, sembradas de las partidas
      if (d && d.e) out.e = 1;          // y las cifras del PERFIL
      if (d && d.est) out.est = Math.floor(d.est) || 0;
      if (d && d.b) out.b = 1;          // y el regalo de veterano, ya calculado
    } catch (e) { /* sin almacenamiento */ }
    return out;
  }

  /* Un contador GUARDADO tal cual está en el almacén, esté o no en STATS.
   * Hace falta para sembrar desde claves retiradas: load() solo se trae las
   * que algún logro mira hoy, así que lo que se quitó de CFG.ACHIEVEMENTS es
   * invisible desde ahí (y se pierde en el primer save). */
  function crudo(key) {
    try {
      var raw = localStorage.getItem(CFG.ACH_KEY);
      var d = raw ? JSON.parse(raw) : null;
      var n = (d && d.c) ? parseInt(d.c[key], 10) : 0;
      return (isFinite(n) && n > 0) ? n : 0;
    } catch (e) { return 0; }
  }

  function save(d) {
    try { localStorage.setItem(CFG.ACH_KEY, JSON.stringify(d)); }
    catch (e) { /* sin almacenamiento */ }
  }

  function infoDe(id) {
    for (var i = 0; i < CFG.ACHIEVEMENTS.length; i++) {
      if (CFG.ACHIEVEMENTS[i].id === id) return CFG.ACHIEVEMENTS[i];
    }
    return null;
  }

  /* ¿este contador cumple la meta del logro? */
  function cumple(a, c) {
    var v = c[claveLogro(a)] || 0;
    if (a.menor) return v > 0 && v <= a.goal;
    return v >= a.goal;
  }

  var Achievements = {
    STATS: STATS,
    BASE: BASE,
    clave: claveDe,
    claveLogro: claveLogro,

    stats: function () { return load().c; },

    seen: function () { return load().v; },

    /* ---------- acumular ---------- */
    /* n puede venir de una partida entera; se ignora lo que no mejore */
    record: function (key, value) {
      // `tipo` es cómo acumula (suma/mayor/menor), no el modo de juego
      var tipo = STATS.hasOwnProperty(key) ? STATS[key] : tipoSuelto(key);
      if (!tipo) return;
      var n = Math.floor(value || 0);
      if (!(n > 0)) return;
      var d = load();
      if (typeof d.c[key] !== 'number') d.c[key] = 0;   // una suelta, recién nacida
      if (tipo === 'suma') d.c[key] += n;
      else if (tipo === 'mayor') { if (n <= d.c[key]) return; d.c[key] = n; }
      else { if (d.c[key] > 0 && n >= d.c[key]) return; d.c[key] = n; }
      save(d);
    },

    /* Varias de golpe: { fantasmas: 3, racha: 4, ... } */
    recordAll: function (o) {
      if (!o) return;
      for (var k in o) if (o.hasOwnProperty(k)) this.record(k, o[k]);
    },

    /* Lo mismo, pero apuntándolo ADEMÁS en los contadores de cada modo que
     * esté en juego. `tags` es lo que devuelve Game.achTags(): una partida
     * de poderes en party cuenta para los dos. Solo se guarda lo que
     * algún logro mire, así que esto no engorda el almacén por gusto. */
    recordFor: function (tags, o) {
      if (!o) return;
      this.recordAll(o);
      if (!tags || !tags.length) return;
      for (var i = 0; i < tags.length; i++) {
        for (var k in o) {
          if (!o.hasOwnProperty(k)) continue;
          var c = claveDe(tags[i], k);
          if (STATS.hasOwnProperty(c)) this.record(c, o[k]);
        }
      }
    },

    /* ---------- consulta ---------- */
    has: function (id) {
      var a = infoDe(id);
      return !!a && cumple(a, load().c);
    },

    earned: function () {
      var c = load().c, out = [];
      for (var i = 0; i < CFG.ACHIEVEMENTS.length; i++) {
        if (cumple(CFG.ACHIEVEMENTS[i], c)) out.push(CFG.ACHIEVEMENTS[i]);
      }
      return out;
    },

    count: function () { return this.earned().length; },
    total: function () { return CFG.ACHIEVEMENTS.length; },

    /* Progreso de un logro, para la barra del panel */
    progress: function (a, c) {
      c = c || load().c;
      var v = c[claveLogro(a)] || 0;
      var hecho = cumple(a, c);
      var pct;
      if (a.menor) pct = hecho ? 1 : (v > 0 ? Math.min(1, a.goal / v) : 0);
      else pct = Math.min(1, a.goal > 0 ? v / a.goal : 0);
      return { valor: v, meta: a.goal, pct: pct, hecho: hecho };
    },

    /* ---------- avisos ---------- */
    /* Logros conseguidos que aún no se han anunciado; los marca de paso */
    claim: function () {
      var d = load();
      var fresh = [];
      for (var i = 0; i < CFG.ACHIEVEMENTS.length; i++) {
        var a = CFG.ACHIEVEMENTS[i];
        if (!cumple(a, d.c)) continue;
        if (d.v.indexOf(a.id) !== -1) continue;
        d.v.push(a.id);
        fresh.push(a);
      }
      if (fresh.length) save(d);
      return fresh;
    },

    /* ---------- lo jugado ANTES de que hubiera logros por modo ----------
     * Los contadores por modo son nuevos y nacían a cero, así que a quien ya
     * llevaba cien partidas le salía "JUEGA 50 PARTIDAS EN CLÁSICO · 0/50".
     * Eso es tirar a la basura lo que esa persona ya había jugado, y no se
     * puede hacer: los logros son suyos.
     *
     * Lo jugado antes solo existe en los contadores GLOBALES, y ahí no consta
     * en qué modo fue. Así que se reparte con lo único que se puede demostrar:
     *
     *  - CLÁSICO se lleva lo global. Es el modo por defecto y el grueso de
     *    cualquier historial; además el contador de un modo nunca puede ser
     *    mayor que el global, así que esto como mucho se pasa de generoso,
     *    nunca se queda corto. Errar a favor del jugador es lo correcto
     *    cuando el dato se perdió.
     *  - PARTY solo si hay PRUEBA de haber jugado acompañado: un récord de
     *    dúo, trío o escuadra. Sin esa prueba se queda a cero, que regalar
     *    "JUEGA 20 PARTIDAS ACOMPAÑADO" a quien siempre jugó solo sería
     *    mentira.
     *  - RETO, LABERINTOS, VS. y DESATADO se quedan a cero: de esos no hay
     *    ni rastro en los contadores, y no se inventa nada.
     *
     * Se hace UNA vez (bandera `m`), no en cada arranque: si se repitiera,
     * las partidas de party seguirían engordando el contador de clásico para
     * siempre. La única repetición es a propósito: al entrar en una cuenta,
     * merge() baja la bandera para volver a sembrar con lo que venga de la
     * nube, que puede ser un historial mucho más largo que el de aquí. */
    sembrarModos: function () {
      var d = load();
      if (d.m) return d.c;
      d.m = 1;
      var G = window.PM.Game;
      var hayParty = !!(G && G.recordFor &&
        (G.recordFor(2) > 0 || G.recordFor(3) > 0 || G.recordFor(4) > 0));
      for (var k in STATS) {
        if (!STATS.hasOwnProperty(k)) continue;
        var i = String(k).indexOf(':');
        if (i < 0) continue;                       // este ya es el global
        var modo = k.slice(0, i), base = k.slice(i + 1);
        var v = 0;
        /* Esto corre en CADA entrada a la cuenta (merge baja la bandera), así
         * que no puede darle a CLÁSICO lo global a secas: se llevaba también
         * lo jugado después en DESATADO y demás, y nunca bajaba de la cuenta
         * total. A CLÁSICO va solo lo que no esté ya apuntado en otro mundo;
         * y una marca que ya tiene otro mundo no es suya. */
        if (modo === 'clasico') {
          var otros = 0, suya = true;
          for (var w = 0; w < MUNDOS_EXCL.length; w++) {
            var o = d.c[MUNDOS_EXCL[w] + ':' + base] || 0;
            if (STATS[k] === 'suma') otros += o;
            else if (o > 0 && (STATS[k] === 'mayor' ? o >= (d.c[base] || 0)
                                                     : o <= (d.c[base] || 0))) suya = false;
          }
          v = (STATS[k] === 'suma') ? (d.c[base] || 0) - otros
            : (suya ? (d.c[base] || 0) : 0);
        } else if (modo === 'party' && hayParty && !(d.c[k] > 0)) {
          /* PARTY se solapa con todos (es el formato, no el mundo) y no hay
           * con qué restar: se siembra solo si aún no cuenta nada. */
          v = d.c[base] || 0;
        }
        if (v > 0) d.c[k] = Math.max(d.c[k] || 0, v);
      }
      save(d);
      return d.c;
    },

    /* ---------- lo que se jugó al RETO DE HOY, que ya no existe ----------
     * El reto era un modo aparte (una partida con la misma semilla para todo
     * el mundo, un intento al día) y se retiró en favor del DAILY, que son
     * siete retos por semana que se cumplen jugando a lo que sea. Sus tres
     * logros siguen ahí con el mismo identificador, pero ahora miran
     * contadores nuevos, así que a quien tenía CONSTANTE se le habría
     * borrado de un día para otro. Eso no se hace.
     *
     * Cada día que se jugaba el reto se cumplía el reto de ese día, así que
     * `reto:partidas` se traduce uno a uno a retos diarios cumplidos. Los
     * otros dos (racha y semanas) empiezan a cero: de eso no hay ni rastro y
     * no se inventa nada.
     *
     * Se lee del almacén EN CRUDO porque `reto:partidas` ya no está en STATS
     * —ningún logro la mira— y load() no se la trae. Una vez (bandera `d`). */
    sembrarDaily: function () {
      var d = load();
      if (d.d) return d.c;
      d.d = 1;
      var jugados = crudo('reto:partidas');
      if (jugados > 0) {
        d.c.dailyOk = Math.max(d.c.dailyOk || 0, jugados);
        if (STATS.hasOwnProperty('daily:dailyOk')) {
          d.c['daily:dailyOk'] = Math.max(d.c['daily:dailyOk'] || 0, jugados);
        }
      }
      save(d);
      return d.c;
    },

    /* ---------- las MUERTES de antes de que se contaran ----------
     * La skin CALAVERA pide muertes y el juego no las contaba. Lo jugado es
     * del jugador, así que se estima con lo único que hay: cada partida
     * acaba perdiendo todas las vidas, 3 de salida y a veces una extra. Se
     * cuentan 2,5 por partida, a la BAJA a propósito: no descuenta
     * abandonos, CACERÍA (donde no se muere) ni las vidas compartidas en
     * equipo, y regalar la skin a quien apenas ha jugado sería mentir.
     *
     * Una vez (bandera `k`); al entrar en una cuenta merge() la baja para
     * volver a mirar con las partidas de la nube. Es un máximo, no una suma,
     * así que repetirla nunca cuenta dos veces lo mismo. */
    sembrarMuertes: function () {
      var d = load();
      if (d.k) return d.c;
      d.k = 1;
      var estimadas = Math.floor((d.c.partidas || 0) * 2.5);
      if (estimadas > (d.c.muertes || 0)) d.c.muertes = estimadas;
      save(d);
      return d.c;
    },

    /* ---------- las cifras del PERFIL ----------
     * Contadores que llegaron con la pantalla de CIFRAS. Empezar de cero a
     * quien lleva setecientas partidas sería decirle que no ha jugado nunca,
     * así que se siembran con lo que ya se sabe de él. Todo lo que se siembra
     * es una COTA POR LO BAJO —lo mínimo que tuvo que pasar para llegar a lo
     * que ya está contado— salvo el tiempo, que es una estimación declarada:
     *
     *   niveles   -> nivelMax - 1: para asomarse al nivel N hay que haber
     *                despejado N-1, seguro.
     *   pastillas -> los niveles sembrados por las 244 de cada uno.
     *   super     -> cuatro por nivel despejado.
     *   racha2/3/4-> la mejor racha dice que ESA se hizo al menos una vez.
     *   tiempo    -> los puntos de toda la vida (la experiencia) al ritmo de
     *                CFG.STATS.PTS_POR_SEG. No es exacto y no puede serlo:
     *                nunca se guardó. La pantalla lo dice.
     *
     * Bandera `e`, como las demás siembras. merge() la baja para volver a
     * sembrar con lo que venga de la nube, que puede ser mucho más largo. */
    sembrarCifras: function () {
      var d = load();
      if (d.e) return d.c;
      d.e = 1;
      var c = d.c;
      /* La regla, una sola y en un solo sitio: js/stats.js la usa también
       * para el perfil de otro, que puede no haber sembrado nunca. */
      var S = window.PM.Stats;
      var L = window.PM.Level;
      if (!S) { save(d); return c; }
      var co = S.cotas(c, L ? L.xp() : 0);
      for (var k in co) {
        if (!co.hasOwnProperty(k)) continue;
        if (co[k] > (c[k] || 0)) {
          if (k === 'tiempo') d.est = co[k] - (c[k] || 0);
          c[k] = co[k];
        }
      }
      save(d);
      return c;
    },

    /* Decir qué parte de lo jugado ANTES de que cada modo llevara su cuenta
     * fue DESATADO. `pct` es ese porcentaje (0..100); el resto es CLÁSICO.
     * Se queda con las partidas que hay ahora mismo repartidas entre esos dos
     * modos como base, así que lo que se juegue a partir de aquí se cuenta
     * solo, sin que este reparto lo toque. */
    declararReparto: function (pct) {
      var d = load();
      var p = Math.max(0, Math.min(100, Math.round(pct)));
      var base = (d.c['clasico:partidas'] || 0) + (d.c['hab:partidas'] || 0);
      d.c.repHab = p;
      d.c.repBase = base;
      save(d);
      return { pct: p, base: base };
    },

    /* Segundos de los que se guardan que vienen de la estimación de arriba.
     * La pantalla de CIFRAS lo dice al pie en vez de dar por medido algo que
     * no se midió. */
    tiempoEstimado: function () { return load().est || 0; },

    /* ---------- el REGALO DE VETERANO ----------
     * La TIENDA llegó con 1.500 monedas para todos, y quien llevaba cientos de
     * partidas y media vitrina de logros empezaba igual que quien abría el
     * juego por primera vez. Eso es tirar lo que ya había hecho. Así que, UNA
     * vez, se le regala lo que le toca por lo jugado:
     *
     *     5 por partida + 50 por logro, sin tope (CFG.TIENDA.VETERANO_*)
     *
     * Va en su propio contador (`bono`), no en `monedas`, por dos razones: el
     * saldo lo enseña aparte, y es un MÁXIMO, así que al juntar dos aparatos se
     * queda con el mayor en vez de sumarlos.
     *
     * Se calcula una vez por aparato (bandera `b`) y a partir de ahí se
     * congela: lo que se juegue después ya paga por su lado. La excepción es
     * entrar en una cuenta que NO trae regalo (nadie lo ha calculado aún en
     * ningún aparato): ahí merge() baja la bandera y se vuelve a calcular con
     * el historial de la nube, que puede ser mucho más largo que el de aquí.
     * Si la nube ya lo trae, se respeta y no se recalcula. */
    regaloDe: function (c) {
      c = c || load().c;
      var T = CFG.TIENDA || {};
      var logros = 0;
      for (var i = 0; i < CFG.ACHIEVEMENTS.length; i++) {
        if (cumple(CFG.ACHIEVEMENTS[i], c)) logros++;
      }
      return (c.partidas || 0) * (T.VETERANO_POR_PARTIDA || 0) +
        logros * (T.VETERANO_POR_LOGRO || 0);
    },

    sembrarBono: function () {
      var d = load();
      if (d.b) return d.c;
      d.b = 1;
      var v = this.regaloDe(d.c);
      if (v > (d.c.bono || 0)) d.c.bono = v;
      save(d);
      return d.c;
    },

    /* Al arrancar (o al entrar en una cuenta): lo ya conseguido no se anuncia */
    syncSeen: function () {
      // antes de nada, que lo jugado de antes cuente en su modo
      this.sembrarModos();
      this.sembrarDaily();
      this.sembrarMuertes();
      this.sembrarCifras();
      // y con los contadores ya sembrados, el regalo (cuenta logros)
      this.sembrarBono();
      var d = load();
      var changed = false;
      for (var i = 0; i < CFG.ACHIEVEMENTS.length; i++) {
        var a = CFG.ACHIEVEMENTS[i];
        if (cumple(a, d.c) && d.v.indexOf(a.id) === -1) {
          d.v.push(a.id);
          changed = true;
        }
      }
      if (changed) save(d);
    },

    /* ---------- cuentas ---------- */
    /* Junta unos contadores de fuera (los de la cuenta) con los de aquí,
     * quedándose con lo mejor de cada uno. No se pierde nada por entrar. */
    /* Como merge(), pero la nube manda: tras una limpieza a mano, fundir
     * quedándose con lo más alto devolvería justo lo que se quitó. */
    reemplazar: function (otros) {
      var d = load();
      d.c = vacio();
      for (var k in STATS) {
        if (!STATS.hasOwnProperty(k)) continue;
        var n = Math.floor((otros && otros[k]) || 0);
        if (n > 0) d.c[k] = n;
      }
      save(d);
      return this.stats();
    },

    merge: function (otros) {
      if (!otros) return this.stats();
      var d = load();
      /* Lo del RETO DE HOY que venga de la nube: es una clave retirada, así
       * que el bucle de abajo (que solo mira STATS) la tiraría. Cada día
       * jugado al reto era un reto de ese día cumplido, y de otro aparato
       * puede venir un historial que aquí no existe. */
      var retoNube = Math.floor(otros['reto:partidas'] || 0);
      if (retoNube > 0) {
        d.c.dailyOk = Math.max(d.c.dailyOk || 0, retoNube);
        if (STATS.hasOwnProperty('daily:dailyOk')) {
          d.c['daily:dailyOk'] = Math.max(d.c['daily:dailyOk'] || 0, retoNube);
        }
      }
      for (var k in STATS) {
        if (!STATS.hasOwnProperty(k)) continue;
        var n = Math.floor(otros[k] || 0);
        if (!(n > 0)) continue;
        var tipo = STATS[k];
        if (tipo === 'suma') d.c[k] = Math.max(d.c[k], n);
        else if (tipo === 'mayor') d.c[k] = Math.max(d.c[k], n);
        else d.c[k] = (d.c[k] > 0) ? Math.min(d.c[k], n) : n;
      }
      /* Las SUELTAS (las del pase) no están en STATS, así que el bucle de
       * arriba ni las mira: se juntan aquí con la misma regla, lo mejor de
       * cada lado. Sin esto, entrar en la cuenta desde otro aparato borraría
       * el camino de la temporada. */
      for (var ks in otros) {
        if (!otros.hasOwnProperty(ks) || !tipoSuelto(ks)) continue;
        var vs = Math.floor(otros[ks] || 0);
        if (vs > 0) d.c[ks] = Math.max(Math.floor(d.c[ks] || 0), vs);
      }
      /* Lo que baja de la nube puede ser un historial mucho más largo que el
       * de este navegador, así que se vuelve a sembrar por modo con él: si no,
       * entrar en tu cuenta en un aparato nuevo te dejaba los logros por modo
       * a cero teniendo cien partidas a la espalda. */
      d.m = 0;
      d.k = 0;
      d.e = 0;     // y las cifras, con el historial de la nube
      /* El regalo: si la nube no lo trae, nadie lo ha calculado con ese
       * historial, así que se calcula ahora con lo ya fundido. Si lo trae, ya
       * se quedó arriba con el máximo y no se toca. */
      if (!(Math.floor(otros.bono || 0) > 0)) d.b = 0;
      save(d);
      this.sembrarModos();
      this.sembrarMuertes();
      this.sembrarBono();
      return this.stats();
    },

    reset: function () { save({ c: vacio(), v: [], m: 0, d: 0, k: 0, b: 0 }); }
  };

  window.PM.Achievements = Achievements;
})();
