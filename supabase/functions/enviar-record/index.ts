/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/functions/enviar-record
 *
 * La ÚNICA puerta de entrada al top mundial. Hasta ahora el juego
 * insertaba en la tabla `ranking` con la clave anónima: cualquiera
 * podía abrir la consola del navegador y meterse 999999 puntos. El
 * trigger que había solo frenaba el spam (5 filas por nombre y
 * minuto), que no es lo mismo que frenar las trampas.
 *
 * Aquí se valida la partida ANTES de escribir y se inserta con la
 * service role, que es la única que puede. A `anon` se le quita el
 * insert en supabase/ranking-integridad.sql.
 *
 * ORDEN DE DESPLIEGUE (importante):
 *   1) supabase functions deploy enviar-record
 *   2) y SOLO DESPUÉS, el SQL de supabase/ranking-integridad.sql
 * Al revés, el ranking se queda sin nadie que pueda escribir en él.
 * (La función aguanta el rato entre medias: si las columnas nuevas
 * todavía no existen, reintenta la inserción sin ellas.)
 *
 * Variables de entorno: las pone Supabase sola al desplegar
 * (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY). No hay que crear
 * ningún secreto a mano.
 *
 * Respuestas:
 *   200 { ok: true,  verificado: bool }
 *   4xx { ok: false, error: 'MOTIVO CORTO', detalle: '...' }
 * El `error` va corto a propósito: lo enseña el panel del juego.
 * El `detalle` es para quien mira la consola.
 *
 * Sin dependencias: Deno pelado y fetch contra PostgREST.
 * ============================================================ */

/* ------------------------------------------------------------
 * Constantes: son las mismas que las de js/config.js (CFG). Si
 * allí cambia una tabla de puntuación, aquí también.
 * ---------------------------------------------------------- */

const NICK_MAX = 12;              // CFG.NICK_MAX
const MAX_PUNTOS = 10000000;      // CFG.RANKING.MAX_POINTS
const MAX_TIEMPO1 = 6000000;      // CFG.RANKING.MAX_TIME (centésimas)
const MAX_NIVEL = 999;            // el CHECK de la tabla

/* Puntuación de un nivel entero (CFG.DOT_POINTS, CFG.ENERGIZER_POINTS):
 * 240 pastillas de 10 + 4 energizantes de 50. */
const PUNTOS_PASTILLAS = 240 * 10 + 4 * 50;   // 2600

/* Fantasmas: la cadena de CFG.GHOST_CHAIN es 200+400+800+1600 = 3000 por
 * energizante, y solo hay 4 energizantes por nivel. Un fantasma comido
 * vuelve a casa como ojos y ya no está azul, así que dentro del mismo
 * energizante no se puede repetir: cuatro como mucho cada vez. */
const PUNTOS_CADENA = 200 + 400 + 800 + 1600; // 3000
const ENERGIZANTES = 4;
const MAX_FANTASMAS_NIVEL = ENERGIZANTES * 4;              // 16
const MAX_PUNTOS_FANTASMAS = ENERGIZANTES * PUNTOS_CADENA; // 12000
const MIN_PUNTOS_FANTASMA = 200;              // el primero de cada cadena

/* Frutas: salen dos por nivel (CFG.FRUIT_DOTS = [70, 170]) */
const FRUTAS_NIVEL = 2;

/* Margen sobre el techo teórico: más vale dejar pasar una partida rarísima
 * que tirar la de alguien que jugó de verdad. Con el 10% sigue habiendo un
 * abismo entre lo posible y los 999999 de turno. */
const MARGEN = 1.1;

/* Suelos de tiempo. Son MUY generosos a propósito: comerse las 244
 * pastillas de un nivel, aun yendo en línea recta y sin parar, no baja de
 * medio minuto, así que 12 s por nivel no molesta a nadie honrado. Y 1000
 * puntos por segundo está muy por encima del mejor ritmo real (una cadena
 * de 4 fantasmas son 3000 puntos, pero con 4 segundos de congelación por
 * el medio).
 *
 * Los dos se reparten entre los que juegan: cuatro bocas despejan el nivel
 * en la cuarta parte de tiempo y puntúan cuatro veces más rápido. Sin esto,
 * una escuadra honrada se llevaría un TIEMPO IMPOSIBLE. El techo de PUNTOS
 * no se toca: las pastillas, los fantasmas y las frutas de un nivel son los
 * mismos jueguen uno o cuatro. */
const MIN_MS_POR_NIVEL = 12000;
const MAX_PUNTOS_POR_S = 1000;

/* Despejar el nivel 1 en menos de 20 segundos no es posible: el recorrido
 * mínimo para comerse las 244 pastillas pasa de 30 s al 80% de velocidad
 * (CFG.speedRow(1).pac). En centésimas de segundo, como la columna. */
const MIN_TIEMPO1 = 2000;

/* Ajustes de siempre (CFG.DEFAULT_SETTINGS). Una marca con los fantasmas
 * frenados o Pac-Man acelerado no se puede comparar con la de nadie, así
 * que no entra: es el mismo criterio que ya usa la clasificación de
 * velocidad del nivel 1 (CFG.TIME_RULES).
 *
 * Solo se rechaza lo que hace la partida MÁS FÁCIL. Jugar con los fantasmas
 * más rápidos, con los energizantes más cortos o con menos vidas está
 * permitido: eso no regala puntos. */
const AJUSTES = {
  velFantasmasMin: 1,   // menos = fantasmas frenados
  velPacMax: 1,         // más = Pac-Man acelerado
  powerSMax: 1,         // más = energizantes más largos
  vidasMax: 3           // más = más intentos para acumular puntos
};

/* Freno de envíos, el mismo tope que el trigger de la tabla */
const ENVIOS_POR_MINUTO = 5;

/* Repetición (formato v1): topes de tamaño y de densidad. Un humano no
 * cambia de dirección 20 veces por segundo, y el juego va a 60 ticks/s. */
const REPE_VERSION = 1;
const REPE_MAX_ENTRADAS = 40000;
const REPE_ENTRADAS_POR_S = 20;
const MAX_CUERPO = 512 * 1024;   // bytes de JSON: una repetición larga cabe

/* Palabras vetadas: copia de CFG.BAD_WORDS de js/config.js */
const PALABRAS_VETADAS = [
  'PUTA', 'PUTO', 'MIERDA', 'COÑO', 'CONO', 'JODER', 'GILIPOLL', 'CABRON',
  'MARICA', 'MARICON', 'POLLA', 'VERGA', 'PENE', 'CULO', 'TETAS', 'ZORRA',
  'PERRA', 'PENDEJO', 'CHINGA', 'VIOLA', 'NAZI', 'HITLER',
  'FUCK', 'SHIT', 'BITCH', 'DICK', 'COCK', 'CUNT', 'RAPE', 'NIGG', 'FAG'
];

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

/* ------------------------------------------------------------
 * Utilidades
 * ---------------------------------------------------------- */

/* Mismo aplanado que Ranking.nameAllowed() en js/ranking.js: mayúsculas,
 * los números que imitan letras de vuelta a su letra y fuera todo lo que
 * no sea A-Z. Así no se cuela un PUT4 ni un P0LL@. */
function aplanar(nombre: string): string {
  return String(nombre || '').toUpperCase()
    .replace(/[0]/g, 'O').replace(/[1|!]/g, 'I').replace(/[3]/g, 'E')
    .replace(/[4@]/g, 'A').replace(/[5$]/g, 'S').replace(/[7]/g, 'T')
    .replace(/[^A-Z]/g, '');
}

function nombrePermitido(nombre: string): boolean {
  const plano = aplanar(nombre);
  if (!plano) return false;
  for (const mala of PALABRAS_VETADAS) {
    if (plano.indexOf(mala) !== -1) return false;
  }
  return true;
}

/* Deja el nombre como se va a guardar: sin caracteres de control (que en un
 * nombre no pintan nada y ensucian la tabla), sin espacios sobrantes y
 * recortado a NICK_MAX. */
function limpiarNombre(valor: unknown): string {
  const texto = String(valor == null ? '' : valor);
  let salida = '';
  for (const ch of texto) {
    const c = ch.codePointAt(0) || 0;
    if (c < 32 || c === 127) continue;
    salida += ch;
  }
  return salida.trim().slice(0, NICK_MAX);
}

function entero(valor: unknown): number {
  const n = Math.floor(Number(valor));
  return Number.isFinite(n) ? n : 0;
}

/* Puntos de la fruta de cada nivel — misma tabla que CFG.fruitForLevel */
function puntosFruta(nivel: number): number {
  if (nivel === 1) return 100;
  if (nivel === 2) return 300;
  if (nivel <= 4) return 500;
  if (nivel <= 6) return 700;
  if (nivel <= 8) return 1000;
  if (nivel <= 10) return 2000;
  if (nivel <= 12) return 3000;
  return 5000;
}

/* Todo lo que se puede sacar de un nivel: pastillas + fantasmas + frutas */
function techoNivel(nivel: number): number {
  return PUNTOS_PASTILLAS + MAX_PUNTOS_FANTASMAS +
    FRUTAS_NIVEL * puntosFruta(nivel);
}

/* Techo de una partida que empezó en `desde` y llegó a `hasta` */
function techoPartida(desde: number, hasta: number): number {
  let total = 0;
  for (let n = desde; n <= hasta; n++) total += techoNivel(n);
  return Math.floor(total * MARGEN);
}

function respuesta(cuerpo: unknown, estado: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

/* `motivo` sale en el panel del juego, así que va corto; `detalle` es para
 * la consola de quien esté mirando. */
function mal(motivo: string, estado = 400, detalle = ''): Response {
  return respuesta({ ok: false, error: motivo, detalle: detalle }, estado);
}

/* ------------------------------------------------------------
 * Repetición (formato v1, cerrado con el resto del equipo):
 *   { v:1, modo:'solo'|'duo'|'reto', semilla, nivel, jugadores,
 *     ajustes:{velFantasmas,velPac,powerS,vidas}, nombres, fecha,
 *     entradas:[[tick, jugador, dir], ...],
 *     final:{puntos,nivel,fantasmas,tiempoMs} }
 *
 * OJO: esto NO reproduce la partida, solo mira que lo que cuenta la
 * repetición cuadre con lo que se está enviando. La verificación de
 * verdad (rejugar las entradas con el motor) queda pendiente, y el
 * porqué de no haberla hecho todavía está en PENDIENTE.md.
 *
 * Devuelve null si todo cuadra, o el motivo si no.
 * ---------------------------------------------------------- */
function repeticionCoherente(
  repe: Record<string, unknown> | null,
  parte: {
    jugadores: number; puntos: number; nivel: number;
    fantasmas: number; tiempoMs: number;
    ajustes: Record<string, number>;
  }
): string | null {
  if (!repe || typeof repe !== 'object') return 'no es un objeto';
  if (entero(repe.v) !== REPE_VERSION) return 'version desconocida';

  const modo = String(repe.modo || '');
  if (['solo', 'duo', 'reto'].indexOf(modo) === -1) return 'modo desconocido';
  if (entero(repe.jugadores) !== parte.jugadores) return 'jugadores que no cuadran';

  // los ajustes declarados en la repetición tienen que ser los del envío
  const a = (repe.ajustes || {}) as Record<string, unknown>;
  for (const k of ['velFantasmas', 'velPac', 'powerS', 'vidas']) {
    if (Number(a[k]) !== Number(parte.ajustes[k])) return 'ajustes que no cuadran';
  }

  // el final de la repetición es lo que se está mandando al ranking
  const fin = (repe.final || {}) as Record<string, unknown>;
  if (entero(fin.puntos) !== parte.puntos) return 'puntos que no cuadran';
  if (entero(fin.nivel) !== parte.nivel) return 'nivel que no cuadra';
  if (entero(fin.fantasmas) !== parte.fantasmas) return 'fantasmas que no cuadran';
  // el cronómetro se redondea distinto en cada sitio: medio segundo de gracia
  if (Math.abs(entero(fin.tiempoMs) - parte.tiempoMs) > 500) {
    return 'tiempo que no cuadra';
  }

  // entradas: densidad plausible y bien formadas
  const entradas = repe.entradas;
  if (!Array.isArray(entradas)) return 'sin entradas';
  if (entradas.length > REPE_MAX_ENTRADAS) return 'demasiadas entradas';
  const segundos = Math.max(1, parte.tiempoMs / 1000);
  if (entradas.length > segundos * REPE_ENTRADAS_POR_S) {
    return 'demasiadas ordenes para ese tiempo';
  }
  const maxTick = Math.ceil(segundos * 60) + 120;   // 60 ticks/s y 2 s de margen
  let previo = -1;
  for (let i = 0; i < entradas.length; i++) {
    const e = entradas[i];
    if (!Array.isArray(e) || e.length < 3) return 'entrada mal formada';
    const tick = entero(e[0]), jugador = entero(e[1]), dir = entero(e[2]);
    if (tick < previo) return 'entradas desordenadas';
    if (tick > maxTick) return 'entradas fuera del tiempo jugado';
    if (jugador < 0 || jugador >= parte.jugadores) return 'jugador inexistente';
    if (dir < 0 || dir > 3) return 'direccion inexistente';
    previo = tick;
  }
  return null;
}

/* ------------------------------------------------------------
 * El servidor
 * ---------------------------------------------------------- */
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return mal('SOLO SE ACEPTA POST', 405);

  const URL_BASE = Deno.env.get('SUPABASE_URL') || '';
  const CLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!URL_BASE || !CLAVE) {
    return mal('TOP MUNDIAL MAL CONFIGURADO', 500,
      'faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }

  /* ---- cuerpo ---- */
  let crudo = '';
  try {
    crudo = await req.text();
  } catch {
    return mal('ENVÍO NO VÁLIDO', 400, 'no se pudo leer el cuerpo');
  }
  if (crudo.length > MAX_CUERPO) {
    return mal('ENVÍO DEMASIADO GRANDE', 413,
      crudo.length + ' bytes, el tope son ' + MAX_CUERPO);
  }

  let datos: Record<string, unknown>;
  try {
    datos = JSON.parse(crudo || '{}');
  } catch {
    return mal('ENVÍO NO VÁLIDO', 400, 'el cuerpo no es JSON');
  }

  /* ---- nombres ----
   * Una clasificación por formato: 1 individual, 2 dúo, 3 trío, 4 escuadra.
   * Hacen falta tantos nombres como jugadores, todos de verdad. */
  let jugadores = entero(datos.jugadores);
  if (!(jugadores >= 1 && jugadores <= 4)) jugadores = 1;
  const nombres: string[] = [
    limpiarNombre(datos.nombre1), limpiarNombre(datos.nombre2),
    limpiarNombre(datos.nombre3), limpiarNombre(datos.nombre4)
  ];
  for (let i = 0; i < jugadores; i++) {
    if (!nombres[i]) return mal('SIN NOMBRE');
    if (!nombrePermitido(nombres[i])) return mal('NOMBRE NO PERMITIDO');
  }
  const nombre1 = nombres[0];

  /* ---- lo básico de la partida ---- */
  const puntos = entero(datos.puntos);
  if (!(puntos > 0) || puntos > MAX_PUNTOS) return mal('PUNTUACIÓN NO VÁLIDA');

  const nivel = entero(datos.nivel);
  if (!(nivel >= 1 && nivel <= MAX_NIVEL)) return mal('NIVEL NO VÁLIDO');

  // nivel de salida: con el preajuste DIFÍCIL se empieza en el 5
  let nivelInicio = entero(datos.nivelInicio || 1);
  if (!(nivelInicio >= 1)) nivelInicio = 1;
  if (nivelInicio > nivel) return mal('NIVEL NO VÁLIDO', 400, 'empieza más tarde de donde acaba');

  const modo = (datos.modo === 'online') ? 'online' : 'local';

  /* ---- ajustes: los de siempre, o la marca no entra ---- */
  const aj = (datos.ajustes || {}) as Record<string, unknown>;
  const ajustes = {
    velFantasmas: Number(aj.velFantasmas != null ? aj.velFantasmas : 1),
    velPac: Number(aj.velPac != null ? aj.velPac : 1),
    powerS: Number(aj.powerS != null ? aj.powerS : 1),
    vidas: entero(aj.vidas != null ? aj.vidas : 3)
  };
  if (!Number.isFinite(ajustes.velFantasmas) || !Number.isFinite(ajustes.velPac) ||
      !Number.isFinite(ajustes.powerS) || !Number.isFinite(ajustes.vidas)) {
    return mal('AJUSTES NO VÁLIDOS');
  }
  if (ajustes.velFantasmas < AJUSTES.velFantasmasMin ||
      ajustes.velPac > AJUSTES.velPacMax ||
      ajustes.powerS > AJUSTES.powerSMax ||
      ajustes.vidas > AJUSTES.vidasMax) {
    return mal('AJUSTES NO ESTÁNDAR', 400,
      'el top mundial solo admite la partida de siempre: fantasmas a ' +
      AJUSTES.velFantasmasMin + 'x o más rápidos, Pac-Man a ' +
      AJUSTES.velPacMax + 'x o menos, energizantes normales y ' +
      AJUSTES.vidasMax + ' vidas como mucho');
  }

  /* ---- coherencia: puntos, nivel, fantasmas y tiempo ---- */
  const niveles = nivel - nivelInicio + 1;
  const techo = techoPartida(nivelInicio, nivel);
  if (puntos > techo) {
    return mal('PUNTUACIÓN IMPOSIBLE', 400,
      puntos + ' puntos con el nivel ' + nivel + ': el techo son ' + techo);
  }

  const fantasmas = entero(datos.fantasmas);
  if (fantasmas < 0) return mal('FANTASMAS NO VÁLIDOS');
  if (fantasmas > MAX_FANTASMAS_NIVEL * niveles) {
    return mal('FANTASMAS IMPOSIBLES', 400,
      fantasmas + ' fantasmas en ' + niveles + ' niveles: el tope son ' +
      (MAX_FANTASMAS_NIVEL * niveles) + ' (4 por energizante)');
  }
  // cada fantasma comido son 200 puntos como poco
  if (puntos < fantasmas * MIN_PUNTOS_FANTASMA) {
    return mal('FANTASMAS IMPOSIBLES', 400,
      'los ' + puntos + ' puntos no dan para ' + fantasmas + ' fantasmas');
  }

  /* Los suelos de tiempo se reparten entre los que juegan: con cuatro bocas
   * el nivel se despeja en la cuarta parte y se puntúa cuatro veces más
   * rápido. Si no, una escuadra jugada de verdad se caería aquí. */
  const msPorNivel = MIN_MS_POR_NIVEL / jugadores;
  const puntosPorS = MAX_PUNTOS_POR_S * jugadores;
  const tiempoMs = entero(datos.tiempoMs);
  if (!(tiempoMs > 0)) return mal('FALTA EL TIEMPO JUGADO');
  if (tiempoMs < (niveles - 1) * msPorNivel) {
    return mal('TIEMPO IMPOSIBLE', 400,
      tiempoMs + ' ms para ' + (niveles - 1) + ' niveles despejados entre ' +
      jugadores);
  }
  if (puntos > (tiempoMs / 1000) * puntosPorS) {
    return mal('TIEMPO IMPOSIBLE', 400,
      puntos + ' puntos en ' + tiempoMs + ' ms: pasa de ' +
      puntosPorS + ' puntos por segundo entre ' + jugadores);
  }

  /* ---- récord de velocidad del nivel 1 (opcional) ---- */
  let tiempo1: number | null = null;
  if (datos.tiempo1 != null) {
    const cs = entero(datos.tiempo1);
    /* La marca de velocidad es más estricta que la de puntos: a un jugador,
     * desde el nivel 1 y con los ajustes tal cual (CFG.TIME_RULES). Si no
     * cumple, la partida entra igual en puntos pero SIN marca de tiempo. */
    const cuenta = (jugadores === 1 && nivelInicio === 1 &&
      ajustes.velFantasmas === 1 && ajustes.velPac === 1 && ajustes.powerS === 1);
    if (cuenta) {
      if (cs < MIN_TIEMPO1 || cs > MAX_TIEMPO1) {
        return mal('MARCA DEL NIVEL 1 IMPOSIBLE', 400,
          cs + ' centésimas; el suelo está en ' + MIN_TIEMPO1);
      }
      // el nivel 1 no puede haber durado más que la partida entera
      if (cs * 10 > tiempoMs + 500) {
        return mal('MARCA DEL NIVEL 1 IMPOSIBLE', 400,
          'el nivel 1 dura más que la partida');
      }
      tiempo1 = cs;
    }
  }

  /* ---- repetición: si viene, tiene que cuadrar ---- */
  let repeticion: unknown = null;
  let verificado = false;
  if (datos.repeticion != null) {
    const fallo = repeticionCoherente(
      datos.repeticion as Record<string, unknown>,
      { jugadores, puntos, nivel, fantasmas, tiempoMs, ajustes }
    );
    if (fallo) return mal('REPETICIÓN INCOHERENTE', 400, fallo);
    repeticion = datos.repeticion;
    verificado = true;
  }

  /* ---- freno por nombre y minuto ----
   * El mismo tope que el trigger de la tabla. Se traen las filas del último
   * minuto (son cuatro gatos) y se cuentan aquí: así no hay que meter el
   * nombre del jugador dentro de un filtro de PostgREST. */
  const cabeceras = {
    'apikey': CLAVE,
    'Authorization': 'Bearer ' + CLAVE,
    'Content-Type': 'application/json'
  };
  const desde = new Date(Date.now() - 60000).toISOString();
  try {
    const res = await fetch(
      URL_BASE + '/rest/v1/ranking?select=nombre1&creado_en=gt.' +
        encodeURIComponent(desde) + '&limit=500',
      { headers: cabeceras }
    );
    if (res.ok) {
      const filas = await res.json() as Array<{ nombre1: string }>;
      const mio = nombre1.trim().toUpperCase();
      let n = 0;
      for (const f of filas) {
        if (String(f.nombre1 || '').trim().toUpperCase() === mio) n++;
      }
      if (n >= ENVIOS_POR_MINUTO) {
        return mal('DEMASIADOS ENVÍOS', 429,
          'tope de ' + ENVIOS_POR_MINUTO + ' partidas por nombre y minuto');
      }
    }
    // si la consulta falla no se bloquea el envío: el trigger de la tabla
    // sigue estando ahí como segunda barrera
  } catch {
    /* igual: seguimos */
  }

  /* ---- a la tabla ---- */
  /* Los nombres que sobran van a NULL, que es lo que pide el CHECK. Las
   * columnas de trío y escuadra solo se mandan si hacen falta: así una
   * partida de 1 o 2 sigue entrando en un proyecto al que todavía no se le
   * haya aplicado la puesta al día de supabase/ranking.sql. */
  const fila: Record<string, unknown> = {
    jugadores: jugadores,
    modo: modo,
    nombre1: nombre1,
    nombre2: (jugadores >= 2) ? nombres[1] : null,
    puntos: puntos,
    nivel: nivel,
    verificado: verificado
  };
  if (jugadores >= 3) fila.nombre3 = nombres[2];
  if (jugadores >= 4) fila.nombre4 = nombres[3];
  if (tiempo1 != null) fila.tiempo1 = tiempo1;
  if (repeticion != null) fila.repeticion = repeticion;

  function meter(cuerpo: Record<string, unknown>): Promise<Response> {
    return fetch(URL_BASE + '/rest/v1/ranking', {
      method: 'POST',
      headers: { ...cabeceras, 'Prefer': 'return=minimal' },
      body: JSON.stringify(cuerpo)
    });
  }

  let ins: Response;
  let guardadaLaRepeticion = verificado;
  try {
    ins = await meter(fila);
    /* Red de seguridad del despliegue: la función se sube ANTES de aplicar el
     * SQL, así que puede haber un rato en que las columnas `repeticion` y
     * `verificado` todavía no existan. En vez de tirar la partida del jugador,
     * se reintenta sin ellas. En cuanto el SQL esté aplicado, por aquí no se
     * vuelve a pasar. */
    if (!ins.ok && ins.status === 400) {
      const texto = await ins.clone().text();
      if (/column/i.test(texto) && /repeticion|verificado/i.test(texto)) {
        delete fila.verificado;
        delete fila.repeticion;
        guardadaLaRepeticion = false;
        ins = await meter(fila);
      }
    }
  } catch {
    return mal('NO SE PUDO GUARDAR', 502, 'la base de datos no responde');
  }
  if (!ins.ok) {
    const texto = await ins.text();
    // el trigger de la tabla habla en su idioma; se traduce al del juego
    if (/demasiados envios/i.test(texto)) {
      return mal('DEMASIADOS ENVÍOS', 429, texto);
    }
    return mal('NO SE PUDO GUARDAR', 502, ins.status + ' ' + texto);
  }

  return respuesta({ ok: true, verificado: guardadaLaRepeticion }, 200);
});
