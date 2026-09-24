/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/stats.js
 * Las CIFRAS de un jugador. Define window.PM.Stats
 *
 * Todo lo que se enseña en PERFIL · CIFRAS sale de dos cosas que ya
 * existían: los CONTADORES de los logros (js/achievements.js, que viajan a la
 * cuenta en `perfiles.logros`) y la experiencia (js/level.js, que es la suma
 * de los puntos de todas las partidas). Aquí no se guarda nada: se lee, se
 * cruza y se calcula.
 *
 * Por eso mismo sirve igual para uno mismo que PARA CUALQUIER OTRO: los
 * contadores de un perfil ajeno se bajan de la nube con la misma forma, así
 * que `Stats.de(logros, xp)` los mastica igual y se pueden poner dos fichas
 * lado a lado. Eso es lo que hace competitiva la pantalla: no es tu vitrina,
 * es la vara de medir contra los demás.
 *
 * LO QUE SE PUEDE Y LO QUE NO. Se puede enseñar todo lo que esté contado.
 * Hay cosas que parecen obvias y no lo están porque nunca se guardaron —el
 * tiempo jugado es la principal—, y esas se siembran por lo bajo o se
 * estiman, y se dice. Inventar una cifra bonita es peor que no darla: aquí
 * se compara gente.
 *
 * EL POLÍGONO (`radar`). Seis ejes, cada uno de 0 a 1 contra un tope de
 * CFG.STATS.EJES. No es una nota: es una FORMA. Lo que se busca es que de un
 * vistazo se vea en qué es bueno alguien y en qué no, y que dos jugadores
 * con los mismos puntos se vean distintos.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;

  function num(v) { return (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0; }

  /* Un contador, global o de un mundo: `cont(c, 'fantasmas')` o
   * `cont(c, 'fantasmas', 'hab')`. */
  function cont(c, stat, mundo) {
    if (!c) return 0;
    return num(c[mundo ? (mundo + ':' + stat) : stat]);
  }

  /* a / b, cuidando el cero, con un decimal */
  function razon(a, b, dec) {
    if (!(b > 0)) return 0;
    var d = (dec === undefined) ? 1 : dec;
    var m = Math.pow(10, d);
    return Math.round((a / b) * m) / m;
  }

  /* De cada poder del catálogo: su nombre, su tecla y de qué rol es. Se
   * monta una vez; un id que ya no esté en el catálogo sale con su id. */
  var PODERES = null;
  function poderes() {
    if (PODERES) return PODERES;
    PODERES = {};
    var cat = (CFG.HAB && CFG.HAB.CATALOGO) || {};
    for (var rol in cat) {
      if (!cat.hasOwnProperty(rol)) continue;
      for (var f = 0; f < cat[rol].length; f++) {
        for (var o = 0; o < cat[rol][f].length; o++) {
          var h = cat[rol][f][o];
          if (h && h.id && !PODERES[h.id]) PODERES[h.id] = { name: h.name, key: h.key, rol: rol };
        }
      }
    }
    return PODERES;
  }

  var Stats = {

    /* =========================================================
     * LO QUE LOS CONTADORES POR MODO NO SABEN
     *
     * Los contadores por modo (`hab:partidas`, `clasico:puntosMax`...) son
     * posteriores al juego, y al crearlos hubo que repartir lo ya jugado sin
     * saber de qué modo era cada partida: se apuntó TODO a CLÁSICO
     * (Achievements.sembrarModos). Para los logros da igual —solo miran
     * umbrales— pero para una tabla de estadísticas es sencillamente falso:
     * deja DESATADO a cero partidas a quien no ha jugado a otra cosa, y le
     * pone a CLÁSICO como mejor marca una partida de DESATADO.
     *
     * Así que la tabla por modo NO se fía de esos dos contadores cuando hay
     * una fuente mejor:
     *
     *   MEJOR    — los RÉCORDS, que sí se guardan por mundo desde siempre:
     *              los de formato (record1..4) son del laberinto de 1980 y
     *              DESATADO no entra en ellos; `record_hab` y `record_lab`
     *              son los suyos. CACERÍA y PAC-MAN VS. no tienen récord
     *              propio, así que ahí manda su contador.
     *   PARTIDAS — no hay forma de reconstruirlas. Si el contador dice cero
     *              pero hay RASTRO de haber jugado a ese modo (su récord, sus
     *              mordiscos, sus cazas...), se enseña un guion: no se sabe.
     *              Mentir con un cero es peor que decir que no se sabe.
     * ========================================================= */
    /* El mejor de un mundo, de la fuente más fiable que haya */
    mejorDe: function (c, id, records) {
      records = records || {};
      var fmt = records.formatos || [];
      if (id === 'clasico') {
        /* el mejor del laberinto de siempre, juegue solo o acompañado */
        var m = 0;
        for (var i = 0; i < fmt.length; i++) m = Math.max(m, num(fmt[i]));
        return m || cont(c, 'puntosMax', id);
      }
      if (id === 'hab' || id === 'lab') {
        return num(records[id]) || cont(c, 'puntosMax', id);
      }
      return cont(c, 'puntosMax', id);
    },

    /* ¿Hay rastro de que haya jugado a ese mundo? */
    rastroDe: function (c, id, records) {
      records = records || {};
      if (cont(c, 'partidas', id) > 0) return true;
      if (this.mejorDe(c, id, records) > 0) return true;
      if (id === 'hab') return cont(c, 'mordiscos') > 0 || cont(c, 'muros') > 0;
      if (id === 'vs') return cont(c, 'cazas') > 0;
      if (id === 'caza') return cont(c, 'cazas', 'caza') > 0;
      return false;
    },

    /* =========================================================
     * LAS COTAS
     * Contadores que llegaron con esta pantalla y que antes no existían. Lo
     * mínimo que TUVO que pasar para llegar a lo que ya está contado:
     *
     *   niveles   — para asomarse al nivel N hay que haber despejado N-1
     *   pastillas — las 244 de cada uno de esos niveles
     *   super     — sus cuatro superpastillas
     *   racha2/3/4— la mejor cadena se hizo al menos una vez
     *   tiempo    — los puntos de toda la vida al ritmo de PTS_POR_SEG; esta
     *               es la única que no es una cota sino una ESTIMACIÓN, y
     *               por eso va aparte y la pantalla la señala
     *
     * Vive aquí y no en los logros porque hace falta en dos sitios: al
     * sembrar los contadores de uno mismo (Achievements.sembrarCifras) y al
     * leer el perfil de OTRO, que puede no haber abierto el juego desde que
     * esto existe y tendría toda la pantalla a cero teniendo cientos de
     * partidas. La regla es la misma en los dos lados; escribirla dos veces
     * sería tener dos reglas. */
    cotas: function (c, xp) {
      c = c || {};
      var niveles = Math.max(0, num(c.nivelMax) - 1);
      var mejor = num(c.racha);
      return {
        niveles: niveles,
        pastillas: niveles * 244,
        'super': niveles * 4,
        racha2: mejor >= 2 ? 1 : 0,
        racha3: mejor >= 3 ? 1 : 0,
        racha4: mejor >= 4 ? 1 : 0,
        tiempo: Math.round(num(xp) / (CFG.STATS.PTS_POR_SEG || 33))
      };
    },

    /* =========================================================
     * FORMATO
     * ========================================================= */
    miles: function (n) {
      return String(Math.round(num(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },

    /* Segundos -> '12 H 34 MIN' · '34 MIN' · '45 S'. El tiempo de juego es de
     * las cifras que más se miran, así que se lee de un golpe y no en
     * segundos ni en horas con decimales. */
    reloj: function (segs) {
      segs = Math.round(num(segs));
      var h = Math.floor(segs / 3600);
      var m = Math.floor((segs % 3600) / 60);
      if (h > 0) return h + ' H' + (m ? ' ' + m + ' MIN' : '');
      if (m > 0) return m + ' MIN';
      return segs + ' S';
    },

    /* mm:ss.cc — para el tiempo del nivel 1, que se guarda en centésimas */
    cronos: function (cs) {
      cs = Math.round(num(cs));
      if (!cs) return '—';
      var s = Math.floor(cs / 100), c = cs % 100;
      var m = Math.floor(s / 60);
      s = s % 60;
      return m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c;
    },

    /* =========================================================
     * LOS DATOS
     * `c` son los contadores (Achievements.stats() o los de la nube) y `xp`
     * la experiencia, que es la suma de los puntos de todas las partidas.
     * `records` (opcional) son las marcas por formato y por mundo, que no
     * viven en los contadores sino en columnas propias.
     * ========================================================= */
    de: function (c, xp, records, nombre) {
      /* Se trabaja sobre una COPIA: aquí se rellenan huecos con cotas, y quien
       * pasa sus contadores no espera que se los toquen. */
      var orig = c || {}, k0;
      c = {};
      for (k0 in orig) { if (orig.hasOwnProperty(k0)) c[k0] = orig[k0]; }
      records = records || {};
      /* Lo que no esté contado se rellena con su cota por lo bajo. Un perfil
       * de la nube puede ser de alguien que no ha abierto el juego desde que
       * estas cifras existen: enseñarle cero horas y cero niveles teniendo
       * setecientas partidas sería mentir tanto como inflarlo. */
      var co = this.cotas(c, xp);
      var estimado = 0;
      for (var k in co) {
        if (!co.hasOwnProperty(k)) continue;
        if (co[k] > cont(c, k)) {
          if (k === 'tiempo') estimado = co[k] - cont(c, k);
          c[k] = co[k];
        }
      }
      var partidas = cont(c, 'partidas');
      var muertes = cont(c, 'muertes');
      var fantasmas = cont(c, 'fantasmas');
      var tiempo = cont(c, 'tiempo');
      var niveles = cont(c, 'niveles');

      var d = {
        /* --- lo básico --- */
        partidas: partidas,
        tiempo: tiempo,
        puntos: num(xp),                 // la experiencia ES la suma de puntos
        media: Math.round(razon(num(xp), partidas, 0)),
        mejor: cont(c, 'puntosMax'),
        porMinuto: Math.round(razon(num(xp), tiempo / 60, 0)),
        minutosPorPartida: razon(tiempo / 60, partidas),

        /* --- pelea --- */
        fantasmas: fantasmas,
        muertes: muertes,
        porPartida: razon(fantasmas, partidas),
        porMuerte: razon(fantasmas, muertes),
        mejorRacha: cont(c, 'racha'),
        /* Acumulativos: «al menos dos», «al menos tres»... Restando salen los
         * exactos, que es como se enseñan. */
        dobles: cont(c, 'racha2'),
        triples: cont(c, 'racha3'),
        cuadruples: cont(c, 'racha4'),

        /* --- laberinto --- */
        pastillas: cont(c, 'pastillas'),
        superpastillas: cont(c, 'super'),
        frutas: cont(c, 'frutas'),
        niveles: niveles,
        nivelMax: cont(c, 'nivelMax'),
        limpios: cont(c, 'limpios'),
        mejorT1: cont(c, 'mejorT1'),

        /* --- DESATADO --- */
        mordiscos: cont(c, 'mordiscos'),
        muros: cont(c, 'muros'),

        /* --- PAC-MAN VS. --- */
        cazas: cont(c, 'cazas'),

        /* --- constancia --- */
        dailyOk: cont(c, 'dailyOk'),
        dailyRacha: cont(c, 'dailyRacha'),
        dailySemana: cont(c, 'dailySemana'),

        /* --- tienda --- */
        monedas: cont(c, 'monedas') + cont(c, 'bono'),

        /* --- por mundo --- */
        mundos: [],
        /* --- por formato (solo, dúo, trío, escuadra) --- */
        records: records,
        /* segundos de los que se enseñan que salen de la estimación */
        estimado: estimado
      };

      /* Exactos, para la pantalla: un cuádruple está contado en los tres */
      d.doblesExactos = Math.max(0, d.dobles - d.triples);
      d.triplesExactos = Math.max(0, d.triples - d.cuadruples);

      /* --- lo que no cabía en ningún sitio (24 sep) --- */
      d.cazasVs = cont(c, 'cazas', 'vs');
      d.cazasCaza = cont(c, 'cazas', 'caza');
      d.pacCaidos = cont(c, 'pacCaidos');
      d.rescates = cont(c, 'rescates');
      d.apoyos = cont(c, 'apoyos');
      d.gastoCont = cont(c, 'gastoCont');
      d.roles = this.rolesDe(c, nombre);
      d.poderes = this.poderesDe(c);
      d.coleccion = this.coleccionDe(c);

      /* El reparto declarado de lo viejo (ver Achievements.declararReparto):
       * de las `repBase` partidas que estaban todas apuntadas a CLÁSICO,
       * tantas por ciento fueron de DESATADO. Se aplica SOLO a esas; lo
       * jugado después ya viene contado en su sitio. */
      var repHab = num(c.repHab), repBase = num(c.repBase);
      var viejas = 0, aDesatado = 0, tDesatado = 0;
      if (repHab > 0 && repBase > 0) {
        var pClasico = cont(c, 'partidas', 'clasico');
        viejas = Math.min(repBase, pClasico);
        aDesatado = Math.round(viejas * repHab / 100);
        /* Y el TIEMPO de esas mismas partidas, que también se apuntó entero a
         * CLÁSICO (casi todo es la estimación por los puntos). Cuánto duró
         * cada una no se guardó, así que se reparte a partes iguales por
         * partida: la parte de las viejas y, de esa, el mismo porcentaje. */
        if (pClasico > 0) {
          tDesatado = Math.round(cont(c, 'tiempo', 'clasico') *
            (viejas / pClasico) * repHab / 100);
        }
      }
      d.reparto = aDesatado
        ? { pct: repHab, partidas: aDesatado, estimado: num(c.repEst) > 0 } : null;

      var jugados = 0;
      for (var i = 0; i < CFG.STATS.MUNDOS.length; i++) {
        var m = CFG.STATS.MUNDOS[i];
        var p = cont(c, 'partidas', m.id);
        var t = cont(c, 'tiempo', m.id);
        if (m.id === 'clasico') { p = Math.max(0, p - aDesatado); t = Math.max(0, t - tDesatado); }
        else if (m.id === 'hab') { p += aDesatado; t += tDesatado; }
        var rastro = this.rastroDe(c, m.id, records);
        if (rastro) jugados++;
        d.mundos.push({
          id: m.id, name: m.name, color: m.color,
          /* -1 = no se sabe: ha jugado, pero de antes de que cada modo
           * llevara su cuenta. La pantalla lo enseña como un guion. */
          partidas: (p > 0) ? p : (rastro ? -1 : 0),
          mejor: this.mejorDe(c, m.id, records),
          fantasmas: cont(c, 'fantasmas', m.id),
          tiempo: t
        });
      }
      d.mundosJugados = jugados;
      /* Si hay un modo con rastro pero sin cuenta, sus partidas están dentro
       * de las de CLÁSICO (así se repartió lo viejo), así que ese número es
       * aproximado y se enseña con su virgulilla en vez de como un dato
       * exacto que no es. */
      var dudoso = false, cl = null;
      for (var w = 0; w < d.mundos.length; w++) {
        if (d.mundos[w].id === 'clasico') cl = d.mundos[w];
        else if (d.mundos[w].partidas < 0) dudoso = true;
      }
      if (dudoso && cl && cl.partidas > 0) cl.aprox = true;
      /* Con un reparto declarado ya no hay nada que adivinar: los dos números
       * son aproximados, pero los dos son un número. */
      if (aDesatado > 0) {
        for (var y = 0; y < d.mundos.length; y++) {
          var mm = d.mundos[y];
          if (mm.id !== 'clasico' && mm.id !== 'hab') continue;
          if (mm.partidas < 0) mm.partidas = 0;
          mm.aprox = true;
          if (tDesatado > 0 && mm.tiempo > 0) mm.tAprox = true;
        }
      }
      return d;
    },

    /* =========================================================
     * POR ROL (DESATADO)
     * Las partidas y la maestría salen de los contadores de maestría, que se
     * sembraron con lo jugado; el récord, de los de cada rol. Los fantasmas y
     * las vidas por partida, de las etiquetas de rol, que existen desde el
     * 24 sep: son una media de lo contado desde entonces, no de toda la vida.
     * ========================================================= */
    rolesDe: function (c, nombre) {
      var ids = (CFG.HAB && CFG.HAB.ROL_IDS) || [], info = (CFG.HAB && CFG.HAB.ROL_INFO) || {};
      /* las correcciones a mano de esa cuenta (CFG.AJUSTES_CUENTA), las mismas
       * que aplica la pantalla de MAESTRÍAS: [puntos, partidas, notas S] */
      var AJ = CFG.AJUSTES_CUENTA || {};
      var aj = (nombre && AJ[String(nombre).toUpperCase()] && AJ[String(nombre).toUpperCase()].maestria) || {};
      function ajuste(r, i) { return (aj[r] && aj[r][i]) | 0; }
      var out = [], total = 0, i, parts = {};
      for (i = 0; i < ids.length; i++) {
        var id = ids[i];
        parts[id] = Math.max(Math.max(0, cont(c, 'maep_' + id) + ajuste(id, 1)),
                             cont(c, 'rol_' + id + ':partidas'));
        total += parts[id];
      }
      for (i = 0; i < ids.length; i++) {
        var r = ids[i], rec = 0;
        for (var n = 1; n <= 4; n++) rec = Math.max(rec, cont(c, 'rhab_' + r + '_' + n));
        var pv = cont(c, 'rol_' + r + ':partidas');
        var p = parts[r];
        out.push({
          id: r, name: (info[r] && info[r].name) || r.toUpperCase(),
          color: (info[r] && info[r].color) || '#ff66cc',
          partidas: p,
          pct: total > 0 ? Math.round(p * 100 / total) : 0,
          maestria: Math.max(0, cont(c, 'mae_' + r) + ajuste(r, 0)),
          notasS: Math.max(0, cont(c, 'maes_' + r) + ajuste(r, 2)),
          record: rec,
          tiempo: cont(c, 'rol_' + r + ':tiempo'),
          /* medias de lo contado por la etiqueta (null: aún nada) */
          fpp: pv > 0 ? razon(cont(c, 'rol_' + r + ':fantasmas'), pv) : null,
          mpp: pv > 0 ? razon(cont(c, 'rol_' + r + ':muertes'), pv) : null
        });
      }
      return out;
    },

    /* El rol más jugado, o null si no ha jugado con ninguno */
    rolFavorito: function (d) {
      var mejor = null;
      (d.roles || []).forEach(function (r) {
        if (r.partidas > 0 && (!mejor || r.partidas > mejor.partidas)) mejor = r;
      });
      return mejor;
    },

    /* =========================================================
     * LOS PODERES: usos de cada uno (hu_<id>) y de cada tecla (hk_q..r)
     * ========================================================= */
    poderesDe: function (c) {
      var cat = poderes(), lista = [], teclas = {}, total = 0;
      'QWER'.split('').forEach(function (k) {
        teclas[k] = { key: k, usos: cont(c, 'hk_' + k.toLowerCase()), lista: [] };
      });
      for (var key in c) {
        if (!c.hasOwnProperty(key) || key.indexOf('hu_') !== 0) continue;
        var n = num(c[key]);
        if (!n) continue;
        var id = key.slice(3);
        var info = cat[id] || { name: id.toUpperCase().replace(/_/g, ' '), key: '', rol: '' };
        var e = { id: id, name: info.name, key: info.key, rol: info.rol, usos: n };
        lista.push(e);
        total += n;
        if (teclas[info.key]) teclas[info.key].lista.push(e);
      }
      function orden(a, b) { return (b.usos - a.usos) || (a.name < b.name ? -1 : 1); }
      lista.sort(orden);
      var porTecla = [], tecla = null;
      'QWER'.split('').forEach(function (k) {
        teclas[k].lista.sort(orden);
        porTecla.push(teclas[k]);
        if (teclas[k].usos > 0 && (!tecla || teclas[k].usos > tecla.usos)) tecla = teclas[k];
      });
      return { lista: lista, total: total, porTecla: porTecla,
               favorito: lista[0] || null, teclaFavorita: tecla };
    },

    /* =========================================================
     * LA COLECCIÓN: lo conseguido de la tienda, los cofres y el pase
     * ========================================================= */
    coleccionDe: function (c) {
      function cuenta(lista) {
        var tiene = 0;
        (lista || []).forEach(function (it) { if (num(c['c_' + it.id])) tiene++; });
        return { tiene: tiene, de: (lista || []).length };
      }
      var skins = (CFG.SKINS || []).filter(function (sk) {
        return sk.grupo === 'tienda' || sk.grupo === 'cofre' || sk.grupo === 'pase';
      });
      return {
        skins: cuenta(skins), accesorios: cuenta(CFG.ACCESORIOS),
        emotes: cuenta(CFG.EMOTES_TIENDA), efectos: cuenta(CFG.EFECTOS)
      };
    },

    /* Los datos de UNO MISMO, de lo que hay en este navegador */
    mios: function () {
      var A = window.PM.Achievements, L = window.PM.Level, G = window.PM.Game;
      var records = {};
      if (G && G.recordFor) {
        records.formatos = [G.recordFor(1), G.recordFor(2), G.recordFor(3), G.recordFor(4)];
        records.lab = G.recordModo ? G.recordModo('lab', 1) : 0;
        records.hab = G.recordModo ? G.recordModo('hab', 1) : 0;
      }
      var Ac = window.PM.Account, yo = '';
      try { yo = (Ac && Ac.logged && Ac.logged() && Ac.name) ? Ac.name() : ''; } catch (e) { yo = ''; }
      return this.de(A ? A.stats() : {}, L ? L.xp() : 0, records, yo);
    },

    /* Y los de una fila de `perfiles` bajada de la nube (perfil ajeno) */
    deFila: function (fila) {
      if (!fila) return null;
      var records = {
        formatos: [num(fila.record1), num(fila.record2),
                   num(fila.record3), num(fila.record4)],
        lab: num(fila.record_lab),
        hab: num(fila.record_hab)
      };
      return this.de(fila.logros || {}, num(fila.xp), records, fila.usuario);
    },

    /* =========================================================
     * EL POLÍGONO
     * Cada eje, de 0 a 1. `texto` es el dato de verdad, que un polígono sin
     * números es un dibujo bonito y nada más.
     * ========================================================= */
    radar: function (d) {
      var crudos = {
        ataque: d.porPartida,
        puntos: d.mejor,
        aguante: d.limpios,
        alcance: d.nivelMax,
        constancia: d.dailyOk,
        variedad: d.mundosJugados
      };
      var textos = {
        ataque: d.porPartida + ' FANTASMAS POR PARTIDA',
        puntos: this.miles(d.mejor) + ' EN SU MEJOR PARTIDA',
        aguante: d.limpios + ' NIVELES SEGUIDOS SIN MORIR',
        alcance: 'LLEGÓ AL NIVEL ' + d.nivelMax,
        constancia: d.dailyOk + ' RETOS DEL DAILY CUMPLIDOS',
        variedad: d.mundosJugados + ' DE ' + CFG.STATS.MUNDOS.length + ' MODOS JUGADOS'
      };
      var out = [];
      for (var i = 0; i < CFG.STATS.EJES.length; i++) {
        var e = CFG.STATS.EJES[i];
        var v = num(crudos[e.id]) / e.tope;
        out.push({
          id: e.id, name: e.name,
          valor: Math.max(0, Math.min(1, v)),
          crudo: crudos[e.id],
          texto: textos[e.id]
        });
      }
      return out;
    },

    /* =========================================================
     * DIBUJAR EL POLÍGONO
     * `series`: [{ color, valores: [0..1 por eje], nombre }]. Con dos series
     * se ven los dos jugadores encima, que es de lo que va esto.
     * ========================================================= */
    dibujarRadar: function (ctx, w, h, ejes, series) {
      if (!ctx) return;
      var n = ejes.length;
      if (!n) return;
      var cx = w / 2, cy = h / 2 + 4;
      var r = Math.min(w, h) / 2 - 34;      // sitio para los nombres de fuera
      if (r < 10) return;
      var i, j, a, p;

      function punto(idx, v) {
        var ang = -Math.PI / 2 + (Math.PI * 2 * idx) / n;
        return { x: cx + Math.cos(ang) * r * v, y: cy + Math.sin(ang) * r * v };
      }

      ctx.clearRect(0, 0, w, h);
      ctx.lineJoin = 'round';

      /* telaraña: cuatro anillos y un radio por eje */
      ctx.strokeStyle = 'rgba(126, 200, 255, 0.28)';
      ctx.lineWidth = 1;
      for (j = 1; j <= 4; j++) {
        ctx.beginPath();
        for (i = 0; i <= n; i++) {
          p = punto(i % n, j / 4);
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      for (i = 0; i < n; i++) {
        p = punto(i, 1);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      /* cada jugador, su polígono */
      for (var s = 0; s < series.length; s++) {
        var se = series[s];
        if (!se || !se.valores) continue;
        ctx.beginPath();
        for (i = 0; i <= n; i++) {
          p = punto(i % n, Math.max(0.02, se.valores[i % n] || 0));
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.globalAlpha = (series.length > 1) ? 0.22 : 0.3;
        ctx.fillStyle = se.color;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = se.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        /* un punto en cada vértice: sin ellos, dos polígonos parecidos se
         * confunden en cuanto se cruzan */
        for (i = 0; i < n; i++) {
          p = punto(i, Math.max(0.02, se.valores[i] || 0));
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = se.color;
          ctx.fill();
        }
      }

      /* los nombres, por fuera */
      ctx.font = window.PM.Letra.lienzo(9);
      ctx.fillStyle = '#cfcfcf';
      for (i = 0; i < n; i++) {
        a = -Math.PI / 2 + (Math.PI * 2 * i) / n;
        var x = cx + Math.cos(a) * (r + 16);
        var y = cy + Math.sin(a) * (r + 16);
        ctx.textAlign = (Math.abs(Math.cos(a)) < 0.3) ? 'center'
          : (Math.cos(a) > 0 ? 'left' : 'right');
        ctx.textBaseline = (Math.sin(a) > 0.3) ? 'top'
          : (Math.sin(a) < -0.3 ? 'bottom' : 'middle');
        ctx.fillText(ejes[i].name, x, y);
      }
    },

    /* =========================================================
     * LAS FICHAS
     * Secciones con filas [etiqueta, valor, nota]. La pantalla solo las
     * pinta: qué se cuenta y cómo se lee se decide aquí.
     * ========================================================= */
    secciones: function (d) {
      var S = this;
      var out = [];

      out.push({ titulo: 'EN TOTAL', filas: [
        ['PARTIDAS', S.miles(d.partidas)],
        ['TIEMPO JUGADO', S.reloj(d.tiempo)],
        ['PUNTOS DE TODA LA VIDA', S.miles(d.puntos)],
        ['MEJOR PARTIDA', S.miles(d.mejor)],
        ['MEDIA POR PARTIDA', S.miles(d.media)],
        ['PUNTOS POR MINUTO', S.miles(d.porMinuto)],
        ['DURACIÓN MEDIA', d.minutosPorPartida ? (d.minutosPorPartida + ' MIN') : '—']
      ] });

      out.push({ titulo: 'CAZA DE FANTASMAS', filas: [
        ['FANTASMAS COMIDOS', S.miles(d.fantasmas)],
        ['POR PARTIDA', String(d.porPartida)],
        ['VIDAS PERDIDAS', S.miles(d.muertes)],
        ['FANTASMAS POR VIDA', String(d.porMuerte)],
        ['MEJOR CADENA', d.mejorRacha ? ('X' + d.mejorRacha) : '—'],
        ['DOBLES', S.miles(d.dobles), 'AL MENOS DOS DE UNA SUPERPASTILLA'],
        ['TRIPLES', S.miles(d.triples), 'AL MENOS TRES'],
        ['CUÁDRUPLES', S.miles(d.cuadruples), 'LOS CUATRO DE UNA SUPERPASTILLA']
      ] });

      out.push({ titulo: 'EL LABERINTO', filas: [
        ['PASTILLAS COMIDAS', S.miles(d.pastillas)],
        ['SUPERPASTILLAS', S.miles(d.superpastillas)],
        ['FRUTAS', S.miles(d.frutas)],
        ['NIVELES DESPEJADOS', S.miles(d.niveles)],
        ['NIVEL MÁS LEJOS', d.nivelMax || '—'],
        ['SEGUIDOS SIN MORIR', d.limpios || '—'],
        ['NIVEL 1 MÁS RÁPIDO', S.cronos(d.mejorT1)]
      ] });

      var pelea = [];
      if (d.poderes && d.poderes.total) pelea.push(['PODERES LANZADOS', S.miles(d.poderes.total), 'DESDE EL 24/09/2026']);
      if (d.mordiscos) pelea.push(['MORDISCOS', S.miles(d.mordiscos), 'DESATADO']);
      if (d.muros) pelea.push(['MUROS ATRAVESADOS', S.miles(d.muros), 'DESATADO']);
      if (d.rescates) pelea.push(['COMPAÑEROS LEVANTADOS', S.miles(d.rescates), 'EN PARTY']);
      if (d.apoyos) pelea.push(['ESCUDOS Y VIDAS DADOS', S.miles(d.apoyos), 'SOPORTE · UNA VIDA VALE DOS']);
      if (d.cazasVs) pelea.push(['PAC-MAN CAZADOS', S.miles(d.cazasVs), 'PAC-MAN VS.']);
      if (d.cazasCaza) pelea.push(['CAZAS PROPIAS', S.miles(d.cazasCaza), 'CACERÍA']);
      if (d.pacCaidos) pelea.push(['CAÍDAS DEL PAC-MAN', S.miles(d.pacCaidos), 'CACERÍA · LO PILLE QUIEN LO PILLE']);
      if (pelea.length) out.push({ titulo: 'PODERES Y EQUIPO', filas: pelea });

      out.push({ titulo: 'CONSTANCIA', filas: [
        ['RETOS DEL DAILY', S.miles(d.dailyOk)],
        ['MEJOR RACHA DE DÍAS', d.dailyRacha || '—'],
        ['SEMANAS COMPLETAS', S.miles(d.dailySemana)],
        ['MONEDAS GANADAS', S.miles(d.monedas)],
        ['MONEDAS EN CONTINUAR', S.miles(d.gastoCont)]
      ] });

      var co = d.coleccion;
      if (co) {
        var par = function (x) { return x.tiene + ' / ' + x.de; };
        out.push({ titulo: 'COLECCIÓN', filas: [
          ['SKINS', par(co.skins), 'DE TIENDA, COFRES Y PASE'],
          ['ACCESORIOS', par(co.accesorios)],
          ['EMOTES', par(co.emotes)],
          ['EFECTOS', par(co.efectos)]
        ] });
      }

      return out;
    },

    /* La tabla por mundo: cada uno es su propia liga, así que van sus
     * partidas, su mejor marca y lo que se le ha echado. */
    porMundo: function (d) {
      var S = this, filas = [];
      for (var i = 0; i < d.mundos.length; i++) {
        var m = d.mundos[i];
        filas.push({
          name: m.name, color: m.color,
          partidas: (m.partidas < 0) ? '—'
            : ((m.aprox ? '~' : '') + S.miles(m.partidas)),
          mejor: m.mejor ? S.miles(m.mejor) : '—',
          fantasmas: m.fantasmas ? S.miles(m.fantasmas) : '—',
          tiempo: m.tiempo ? ((m.tAprox ? '~' : '') + S.reloj(m.tiempo)) : '—'
        });
      }
      return filas;
    },

    /* Y los cuatro formatos, que tampoco se mezclan entre ellos */
    porFormato: function (d) {
      var nombres = ['SOLO', 'DÚO', 'TRÍO', 'ESCUADRA'];
      var r = (d.records && d.records.formatos) || [];
      var out = [];
      for (var i = 0; i < nombres.length; i++) {
        out.push({ name: nombres[i], valor: r[i] ? this.miles(r[i]) : '—' });
      }
      return out;
    }
  };

  window.PM.Stats = Stats;
})();
