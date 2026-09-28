/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/cofres-gen.js
 * EL GENERADOR DE LOS COFRES. Define window.PM.CofresGen
 *
 * ESTE MISMO FICHERO CORRE EN EL SERVIDOR. La Edge Function `cofres`
 * (supabase/functions/cofres/) lleva una COPIA EXACTA, byte a byte, en
 * supabase/functions/cofres/gen.js, y un guardián de pruebas-node.js tira
 * las pruebas si las dos se separan (y además compara sus premios para miles
 * de semillas). Por eso aquí no hay nada del juego: ni CFG, ni localStorage,
 * ni window.PM.algo. Todo lo que necesita le llega en `D` (los datos: lo
 * arma js/cofres.js desde CFG en el navegador, y el servidor lo lee de
 * supabase/functions/cofres/datos.js, que también vigila un guardián).
 *
 * Tres cosas, las tres deterministas (mismos datos => mismo resultado, en
 * cualquier aparato y en el servidor):
 *
 *   premio(cuenta, tipo, n, D)   qué trae el cofre número n de ese tipo.
 *       Sale de una semilla hash(cuenta | tipo | n): recargar, cambiar de
 *       aparato o abrirlo dos veces no cambia nada. El 2 % de LEGENDARIO y
 *       el seguro de mala suerte de la PLATA también salen de ahí (el seguro
 *       se recalcula recorriendo las platas anteriores).
 *   aplicar(premio, tiene, D)    lo repetido pasa a monedas (mitad de su
 *       valor). Esto sí depende de lo que ya tienes.
 *   ganados(c, xp, base, hoy, D, usuario)   cuántos cofres de cada tipo
 *       llevas ganados, contados desde la BASE (lo que tenías al llegar los
 *       cofres) con sus topes, más el regalo de bienvenida.
 *
 * Y, aparte, el TOP 3 de una temporada de RANGO ya cerrada (top3), que es
 * la misma cuenta de js/rango.js (estadoDe) portada aquí para que la haga
 * el servidor; una prueba compara las dos.
 * ============================================================ */
(function (root) {
  'use strict';

  /* ---------- azar con semilla ----------
   * FNV-1a de 32 bits con la mezcla final de murmur3, y mulberry32. Solo
   * enteros de 32 bits (Math.imul): da lo mismo en cualquier motor. */
  function hash(s) {
    s = String(s);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  function azar(semilla) {
    var a = semilla >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var TIPOS = ['madera', 'plata', 'oro', 'legendario'];

  function entero(v) { var n = Math.floor(Number(v) || 0); return n > 0 ? n : 0; }

  /* Las cuatro tiradas de un cofre, SIEMPRE en el mismo orden y siempre las
   * cuatro, se usen o no: así cambiar una regla no mueve las demás. */
  function tiradas(cuenta, tipo, n) {
    var r = azar(hash(String(cuenta) + '|' + tipo + '|' + n));
    return [r(), r(), r(), r()];
  }

  function elige(lista, x) {
    if (!lista || !lista.length) return null;
    return lista[Math.min(lista.length - 1, Math.floor(x * lista.length))];
  }

  /* monedas entre min y max, a saltos de `paso` */
  function monedasEn(M, x) {
    var pasos = Math.floor((M.max - M.min) / M.paso) + 1;
    return M.min + Math.min(pasos - 1, Math.floor(x * pasos)) * M.paso;
  }

  /* ---------- el seguro de la PLATA ----------
   * ¿Cuántas platas seguidas SIN objeto lleva la cuenta justo antes de la
   * plata número n? Se recorre la secuencia desde la primera: cada una es
   * objeto si lo dice su tirada o si el seguro la fuerza. */
  function platasSinObjeto(cuenta, n, D) {
    var P = D.plata, sin = 0;
    for (var i = 1; i < n; i++) {
      var forzada = sin >= P.seguro;
      var objeto = forzada || tiradas(cuenta, 'plata', i)[0] < P.pObjeto;
      sin = objeto ? 0 : sin + 1;
    }
    return sin;
  }

  /* ---------- el premio ----------
   * { cofre, tipo, n, monedas, items: [ids], seguro }
   *   cofre: el cofre que se abre; tipo: lo que resultó ser (un ORO puede
   *   salir LEGENDARIO). `sinAntes` (opcional) ahorra recorrer las platas
   *   anteriores cuando se simulan muchas seguidas. */
  function premio(cuenta, tipo, n, D, sinAntes) {
    n = entero(n);
    var t = tiradas(cuenta, tipo, n);
    var out = { cofre: tipo, tipo: tipo, n: n, monedas: 0, items: [], seguro: false };
    var PL = D.pools;
    if (tipo === 'madera') {
      if (t[0] < D.madera.pMonedas || !PL.emote.length) out.monedas = monedasEn(D.madera, t[1]);
      else out.items.push(elige(PL.emote, t[1]));
    } else if (tipo === 'plata') {
      var sin = (sinAntes == null) ? platasSinObjeto(cuenta, n, D) : sinAntes;
      var forzada = sin >= D.plata.seguro;
      if ((forzada || t[0] < D.plata.pObjeto) && PL.efecto.length) {
        out.items.push(elige(PL.efecto, t[1]));
        out.seguro = forzada && !(t[0] < D.plata.pObjeto);
      } else {
        out.monedas = monedasEn(D.plata, t[1]);
      }
    } else if (tipo === 'oro') {
      if (t[0] < D.oro.pLegendario && PL.legendaria) {
        out.tipo = 'legendario';
        out.items.push(PL.legendaria);
        out.monedas = D.legendario.monedas;
      } else {
        out.items.push(elige(PL.accesorio, t[1]));
        if (t[2] < D.oro.pSkin && PL.skin.length) out.items.push(elige(PL.skin, t[3]));
      }
    } else if (tipo === 'legendario') {
      if (PL.legendaria) out.items.push(PL.legendaria);
      out.monedas = D.legendario.monedas;
    }
    out.items = out.items.filter(function (x) { return !!x; });
    return out;
  }

  /* Lo repetido, a monedas: la mitad de su valor (el precio de tienda, o el
   * de referencia de CFG.COFRES.VALOR para lo que no se vende). `tiene(id)`
   * dice si ya es tuyo. { monedas, nuevos, repetidos: [{ id, monedas }] } */
  function aplicar(pr, tiene, D) {
    var out = { monedas: entero(pr.monedas), nuevos: [], repetidos: [] };
    for (var i = 0; i < pr.items.length; i++) {
      var id = pr.items[i];
      if (tiene(id) || out.nuevos.indexOf(id) !== -1) {
        var m = Math.floor(entero(D.valor[id]) / 2);
        out.repetidos.push({ id: id, monedas: m });
        out.monedas += m;
      } else {
        out.nuevos.push(id);
      }
    }
    return out;
  }

  /* ---------- lo que se deriva de los contadores ---------- */

  /* nivel de jugador para una experiencia (js/level.js, stateFor) */
  function nivel(xp, D) {
    var lvl = 1, resto = entero(xp);
    var coste = Math.round(D.nivel.base * Math.pow(1, D.nivel.exp));
    while (resto >= coste && lvl < 9999) {
      resto -= coste;
      lvl++;
      coste = Math.round(D.nivel.base * Math.pow(lvl, D.nivel.exp));
    }
    return lvl;
  }

  /* escalones de MAESTRÍA DE ROL alcanzados entre los cuatro roles
   * (js/maestria.js, nivelDe + 1 por rol), con el ajuste a mano de la cuenta
   * (CFG.AJUSTES_CUENTA), que es lo que ve el jugador */
  function maestrias(c, D, usuario) {
    var aj = (D.ajustesMae && usuario) ? D.ajustesMae[String(usuario).toUpperCase()] : null;
    var total = 0;
    for (var r = 0; r < D.roles.length; r++) {
      var rol = D.roles[r], a = (aj && aj[rol]) || [0, 0, 0];
      var pts = Math.max(0, entero(c['mae_' + rol]) + (a[0] | 0));
      var eses = Math.max(0, entero(c['maes_' + rol]) + (a[2] | 0));
      var k = 0;
      for (var i = 0; i < D.maestria.length; i++) {
        if (pts >= D.maestria[i][0] && eses >= D.maestria[i][1]) k = i + 1;
        else break;
      }
      total += k;
    }
    return total;
  }

  /* La BASE: lo que había al llegar los cofres. En la cuenta la pone el
   * servidor en los contadores (cofre_b_*); sin cuenta, la de este aparato. */
  function baseDe(c) {
    if (!c || !(entero(c.cofre_b_dia) > 0)) return null;
    return { dia: entero(c.cofre_b_dia), partidas: entero(c.cofre_b_partidas),
             semana: entero(c.cofre_b_semana), nivel: entero(c.cofre_b_nivel),
             mae: entero(c.cofre_b_mae) };
  }

  /* La base de unos contadores tal cual están hoy */
  function baseAhora(c, xp, hoy, D, usuario) {
    return { dia: entero(hoy), partidas: entero(c.partidas), semana: entero(c.dailySemana),
             nivel: nivel(xp, D), mae: maestrias(c, D, usuario) };
  }

  /* Día (UTC) de una fecha en ms: el reloj de los topes */
  function dia(ms) { return Math.floor(Number(ms) / 86400000); }

  /* ¿Este récord da ORO? (sin el tope de uno por ruta y día, que lleva quien
   * lo apunta). Mejora de al menos un 10 % sobre un récord de 10.000 o más. */
  function recordDaOro(antes, despues, D) {
    antes = entero(antes); despues = entero(despues);
    return antes >= D.record.min && despues * 100 >= antes * (100 + D.record.mejoraPct);
  }

  /* Cuántos cofres de cada tipo se llevan GANADOS (no pendientes: eso es
   * restar los abiertos, cofre_<tipo>). Sin base, ninguno.
   *
   *   MADERA  una por cada 5 partidas de más de un minuto (`largas`), sin
   *           pasar de las partidas jugadas desde la base.
   *   PLATA   el regalo + cada semana del DAILY completa (como mucho una por
   *           semana transcurrida) + cada nivel de jugador subido (con un
   *           tope que ningún jugador de verdad toca: 20 + 10 por día).
   *   ORO     el regalo + cada escalón de maestría de rol nuevo (no más de
   *           uno por cada 2 partidas) + los récords que pasaron los filtros
   *           (cofre_recs: lo cuenta SOLO el servidor).
   *   LEGENDARIO  los top 3 de temporada (cofre_top3: solo el servidor).
   * Los topes existen porque esos contadores los sube el propio juego: así
   * una cifra inventada no da cofres sin fin. */
  function ganados(c, xp, base, hoy, D, usuario) {
    var out = { madera: 0, plata: 0, oro: 0, legendario: 0 };
    if (!base) return out;
    c = c || {};
    var T = D.topes;
    var dias = Math.max(0, entero(hoy) - base.dia);
    var partidas = Math.max(0, entero(c.partidas) - base.partidas);
    out.madera = Math.floor(Math.min(entero(c.largas), partidas) / D.partidasPorMadera);
    var semanas = Math.min(Math.max(0, entero(c.dailySemana) - base.semana),
                           Math.floor(dias / 7) + 1);
    var niveles = Math.min(Math.max(0, nivel(xp, D) - base.nivel),
                           T.nivelesIni + T.nivelesDia * dias);
    out.plata = D.bienvenida.plata + semanas + niveles;
    var mae = Math.min(Math.max(0, maestrias(c, D, usuario) - base.mae),
                       Math.floor(partidas / T.partidasPorMaestria));
    out.oro = D.bienvenida.oro + mae + entero(c.cofre_recs);
    out.legendario = entero(c.cofre_top3);
    return out;
  }

  /* Los abiertos de cada tipo, de los contadores */
  function abiertos(c) {
    var out = {};
    for (var i = 0; i < TIPOS.length; i++) out[TIPOS[i]] = entero(c && c['cofre_' + TIPOS[i]]);
    return out;
  }

  /* ---------- EL TOP 3 DE UNA TEMPORADA DE RANGO ----------
   * La cuenta de js/rango.js (TRAMOS, colocar, semillaDe, estadoDe y los
   * ajustes a mano), tal cual, para que la haga el servidor con los perfiles
   * de todos una vez cerrada la temporada. R = D.rango. */
  function tramos(R) {
    var out = [], desde = 0, DV = R.divisiones;
    for (var d = 0; d < DV.length; d++) {
      var Dv = DV[d], k = Dv.escalones || 1, sig = DV[d + 1];
      var r = sig ? Math.pow(sig.par / Dv.par, 1 / k) : 1;
      for (var j = 0; j < k; j++) {
        out.push({ d: d, desde: desde, par: Math.round(Dv.par * Math.pow(r, j) / 100) * 100 });
        if (sig) desde += Dv.prEscalon;
      }
    }
    return out;
  }

  function rangoCon(R) {
    var TR = tramos(R);
    function clave(tipo, t) {
      var v = R.version > 1 ? R.version : '';
      return tipo + v + '_' + t + (R.version >= 4 ? '' : '_1');
    }
    function tramo(pr) {
      pr = entero(pr);
      for (var i = TR.length - 1; i > 0; i--) if (pr >= TR[i].desde) return i;
      return 0;
    }
    function colocar(media) {
      var t = -1;
      for (var i = 0; i < TR.length; i++) if (media >= TR[i].par) t = i;
      t = Math.min(t - 1, R.topeColocacion != null ? R.topeColocacion : TR.length - 1);
      return t < 0 ? 0 : TR[t].desde;
    }
    function mesAnterior(t) {
      var m = /^(\d{4})-(\d{2})$/.exec(String(t || ''));
      if (!m) return '';
      var a = m[1] | 0, n = (m[2] | 0) - 1;
      if (n < 1) { n = 12; a--; }
      return a + '-' + (n < 10 ? '0' : '') + n;
    }
    function semillaDe(c, t, prof) {
      prof = prof || 0;
      var ant = mesAnterior(t);
      if (!ant || prof >= 24 || !entero(c[clave('rc', ant)])) return null;
      var e = estadoDe(c, ant, prof + 1);
      if (e.pr === null) return null;
      var conf = Math.min(1, e.jugadas / (R.confianza || 1));
      return Math.max(0, Math.round(e.pr * R.arrastre * conf));
    }
    function estadoDe(c, t, prof) {
      var jugadas = entero(c[clave('rc', t)]);
      var out = { jugadas: jugadas, pr: null };
      var sem = semillaDe(c, t, prof);
      var coloca = sem !== null ? Math.max(0, sem + entero(c[clave('ru', t)]) - entero(c[clave('rd', t)])) : null;
      if (jugadas < R.colocacion) return out;
      var base = sem !== null ? coloca : colocar(entero(c[clave('rt', t)]) / R.colocacion);
      out.pr = Math.max(0, base + entero(c[clave('rg', t)]) - entero(c[clave('rl', t)]));
      out.tramo = tramo(out.pr);
      return out;
    }
    /* los ajustes a mano de la cuenta (CFG.AJUSTES_CUENTA.rango) */
    function ajustados(c, usuario) {
      var aj = usuario && R.ajustes && R.ajustes[String(usuario).toUpperCase()];
      if (!aj) return c;
      var out = {}, k;
      for (k in c) if (Object.prototype.hasOwnProperty.call(c, k)) out[k] = c[k];
      for (var t in aj) {
        if (!Object.prototype.hasOwnProperty.call(aj, t) || !entero(out[clave('rc', t)])) continue;
        out[clave('rg', t)] = entero(out[clave('rg', t)]) + (aj[t] | 0);
      }
      return out;
    }
    return { estadoDe: estadoDe, ajustados: ajustados, clave: clave, mesAnterior: mesAnterior };
  }

  /* filas: [{ id, usuario, logros }]. Los tres primeros de la tabla de esa
   * temporada (los ya colocados, por PR; a igual PR, más partidas; y a
   * igualdad de todo, por nombre, para que no dependa del orden de llegada). */
  function top3(filas, t, D) {
    var Rg = rangoCon(D.rango), lista = [];
    (filas || []).forEach(function (f) {
      if (!f) return;
      var lg = f.logros || {};
      var c = Rg.ajustados((lg && lg.c) || lg, f.usuario);
      var e = Rg.estadoDe(c, t);
      if (e.pr === null) return;
      lista.push({ id: f.id, usuario: String(f.usuario || ''), pr: e.pr, jugadas: e.jugadas });
    });
    lista.sort(function (a, b) {
      if (a.pr !== b.pr) return b.pr - a.pr;
      if (a.jugadas !== b.jugadas) return b.jugadas - a.jugadas;
      return a.usuario < b.usuario ? -1 : (a.usuario > b.usuario ? 1 : 0);
    });
    return lista.slice(0, 3);
  }

  /* ---------- los datos, desde CFG ----------
   * Lo único que mira la configuración del juego, y solo lo que se le pasa:
   * el navegador lo llama con window.PM.CFG y supabase/cofres-datos.js con
   * el mismo js/config.js cargado en Node, para escribir el datos.js del
   * servidor. Los premios, con su valor (el precio de tienda o, para lo que
   * no se vende, el de referencia de CFG.COFRES.VALOR). */
  function datosDe(CFG) {
    var C = CFG.COFRES, V = C.VALOR, valor = {};
    function vende(x) { return !x.cofre && !x.pase && !x.rango && x.precio > 0; }
    var emote = (CFG.EMOTES_TIENDA || []).filter(vende).map(function (x) {
      valor[x.id] = x.precio; return x.id;
    });
    var efecto = (CFG.EFECTOS || []).filter(function (x) { return x.cofre; }).map(function (x) {
      valor[x.id] = V.efecto; return x.id;
    });
    var accesorio = (CFG.ACCESORIOS || []).filter(function (x) { return x.cofre; }).map(function (x) {
      valor[x.id] = V.accesorio; return x.id;
    });
    var skinsCofre = (CFG.SKINS || []).filter(function (x) { return x.grupo === 'cofre'; });
    var skin = skinsCofre.filter(function (x) { return !x.legendaria; }).map(function (x) {
      valor[x.id] = V.skin; return x.id;
    });
    var legendaria = null;
    skinsCofre.forEach(function (x) {
      if (x.legendaria && !legendaria) { legendaria = x.id; valor[x.id] = V.legendaria; }
    });
    var AJ = CFG.AJUSTES_CUENTA || {}, ajMae = {}, ajRango = {};
    Object.keys(AJ).sort().forEach(function (u) {
      if (AJ[u].maestria) ajMae[u] = AJ[u].maestria;
      if (AJ[u].rango) ajRango[u] = AJ[u].rango;
    });
    var RG = CFG.RANGO;
    return {
      version: 1,
      madera: C.MADERA, plata: C.PLATA, oro: C.ORO, legendario: C.LEGENDARIO,
      bienvenida: C.BIENVENIDA, partidasPorMadera: C.PARTIDAS_POR_MADERA,
      record: C.RECORD, topes: C.TOPES,
      top3Desde: C.TOP3_DESDE, top3MargenDias: C.TOP3_MARGEN_DIAS,
      pools: { emote: emote, efecto: efecto, accesorio: accesorio, skin: skin, legendaria: legendaria },
      valor: valor,
      nivel: { base: CFG.LEVEL_BASE, exp: CFG.LEVEL_EXP },
      roles: (CFG.HAB && CFG.HAB.ROL_IDS) || ['asesino', 'tanque', 'mago', 'soporte'],
      maestria: CFG.MAESTRIA.NIVELES.map(function (n) { return [n.puntos, n.eses]; }),
      ajustesMae: ajMae,
      rango: {
        divisiones: RG.DIVISIONES.map(function (d) {
          return { par: d.par, escalones: d.escalones, prEscalon: d.prEscalon };
        }),
        colocacion: RG.COLOCACION, topeColocacion: RG.TOPE_COLOCACION,
        arrastre: RG.ARRASTRE, confianza: RG.CONFIANZA, version: RG.VERSION,
        ajustes: ajRango
      }
    };
  }

  var CofresGen = {
    VERSION: 1,
    datosDe: datosDe,
    TIPOS: TIPOS,
    hash: hash,
    azar: azar,
    tiradas: tiradas,
    platasSinObjeto: platasSinObjeto,
    premio: premio,
    aplicar: aplicar,
    nivel: nivel,
    maestrias: maestrias,
    baseDe: baseDe,
    baseAhora: baseAhora,
    dia: dia,
    recordDaOro: recordDaOro,
    ganados: ganados,
    abiertos: abiertos,
    rangoCon: rangoCon,
    top3: top3
  };

  root.PM = root.PM || {};
  root.PM.CofresGen = CofresGen;
})(typeof window !== 'undefined' ? window : globalThis);
