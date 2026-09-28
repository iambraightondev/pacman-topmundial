/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/functions/cofres/index.ts
 * LOS COFRES, EN EL SERVIDOR (28 sep 2026)
 *
 * El juego gana los cofres jugando (los deriva de sus contadores) pero no
 * puede abrirlos: el trigger de perfiles no le deja escribir piezas de cofre
 * ni nada de cofre_* (supabase/perfiles-blindaje.sql). Los abre esto, con la
 * sesión del jugador:
 *
 *   POST { op: 'estado' }                 -> lo ganado y lo abierto
 *   POST { op: 'abrir', tipo: 'plata' }   -> abre el siguiente de ese tipo
 *
 * Cuenta lo ganado con los contadores de la NUBE (ya con los topes del
 * blindaje) usando el MISMO generador que el juego (gen.js, copia exacta de
 * js/cofres-gen.js), genera el premio con la misma semilla
 * (hash(cuenta | tipo | n)) y lo escribe con la service role por
 * public.cofres_abrir (supabase/cofres.sql), que bloquea la fila y solo
 * acepta el cofre siguiente. Además, la primera vez que alguien pregunta
 * después de cerrarse una temporada del rango, fija su top 3
 * (public.cofres_cerrar), que gana un LEGENDARIO cada uno.
 *
 * gen.js y datos.js se regeneran con `node supabase/cofres-datos.js` y un
 * guardián de pruebas-node.js avisa si no están al día. Se despliega con:
 *   SBP=<token> node supabase/desplegar-funcion.js cofres
 * (va con verify_jwt en false, como las otras: el token lo mira ella).
 * ============================================================ */
import './gen.js';
import { DATOS } from './datos.js';

// deno-lint-ignore no-explicit-any
const G = (globalThis as any).PM.CofresGen;
const TIPOS = ['madera', 'plata', 'oro', 'legendario'];
const NOMBRES: Record<string, string> = {
  madera: 'MADERA', plata: 'PLATA', oro: 'ORO', legendario: 'LEGENDARIO'
};

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

function respuesta(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}
function mal(error: string, estado = 400, extra: Record<string, unknown> = {}): Response {
  return respuesta({ ok: false, error, ...extra }, estado);
}

type Fila = { id: string; usuario: string; xp: number; logros: Record<string, unknown> };

function objeto(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, unknown> : {};
}
function num(v: unknown): number {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
}
/* Lo de la cuenta que el juego tiene que tomar: todo lo de cofre_* */
function clavesCofre(lg: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(lg)) if (k.indexOf('cofre_') === 0) out[k] = num(lg[k]);
  return out;
}
/* 'AAAA-MM' de un mes contado desde un año y un mes (0..11) */
function mesTexto(a: number, m: number): string {
  const d = new Date(Date.UTC(a, m, 1));
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return mal('SOLO SE ACEPTA POST', 405);

  const URL_BASE = Deno.env.get('SUPABASE_URL') || '';
  const CLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!URL_BASE || !CLAVE) return mal('COFRES MAL CONFIGURADOS', 500);
  const S = { 'apikey': CLAVE, 'Authorization': 'Bearer ' + CLAVE, 'Content-Type': 'application/json' };

  let datos: Record<string, unknown> = {};
  try {
    const t = await req.text();
    if (t.length > 2000) return mal('ENVÍO NO VÁLIDO');
    datos = objeto(JSON.parse(t || '{}'));
  } catch {
    return mal('ENVÍO NO VÁLIDO');
  }
  const op = String(datos.op || 'estado');
  const tipo = String(datos.tipo || '');
  if (op !== 'estado' && op !== 'abrir') return mal('ENVÍO NO VÁLIDO');
  if (op === 'abrir' && TIPOS.indexOf(tipo) === -1) return mal('ESE COFRE NO EXISTE');

  /* ---- quién es: su sesión ---- */
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  let uid = '';
  try {
    const r = await fetch(URL_BASE + '/auth/v1/user', {
      headers: { 'apikey': CLAVE, 'Authorization': 'Bearer ' + token }
    });
    if (r.ok) uid = String(((await r.json()) as { id?: string }).id || '');
  } catch { /* sin respuesta: sin sesión */ }
  if (!uid) return mal('CREA UNA CUENTA PARA ABRIRLOS', 401);

  async function rpc(fn: string, cuerpo: unknown): Promise<unknown> {
    const r = await fetch(URL_BASE + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: S, body: JSON.stringify(cuerpo)
    });
    if (!r.ok) throw new Error(fn + ' ' + r.status + ' ' + (await r.text()).slice(0, 200));
    return await r.json();
  }
  async function leer(): Promise<Fila | null> {
    const r = await fetch(URL_BASE + '/rest/v1/perfiles?select=id,usuario,xp,logros&id=eq.' + uid,
      { headers: S });
    if (!r.ok) throw new Error('perfil ' + r.status);
    const filas = await r.json() as Fila[];
    if (!filas || !filas.length) return null;
    const f = filas[0];
    const lg = objeto(f.logros);
    return { id: f.id, usuario: String(f.usuario || ''), xp: num(f.xp),
             logros: objeto(lg.c && typeof lg.c === 'object' ? lg.c : lg) };
  }

  /* ---- las temporadas del rango ya cerradas, con su top 3 ----
   * Se reparte a partir de TOP3_MARGEN_DIAS días después de cerrar (lo que
   * suba tarde de esa temporada todavía cuenta) y una sola vez. */
  async function cerrarTemporadas(): Promise<void> {
    const ahora = new Date(Date.now() - num(DATOS.top3MargenDias) * 86400000);
    const hasta = mesTexto(ahora.getUTCFullYear(), ahora.getUTCMonth() - 1);
    const desde = String(DATOS.top3Desde || '9999-12');
    if (desde > hasta) return;
    const r = await fetch(URL_BASE + '/rest/v1/cofres_cierres?select=temporada', { headers: S });
    if (!r.ok) throw new Error('cierres ' + r.status);
    const hechas = new Set(((await r.json()) as Array<{ temporada: string }>).map((x) => x.temporada));
    const faltan: string[] = [];
    for (let i = 0; i < 240; i++) {
      const [a, m] = desde.split('-').map(Number);
      const t = mesTexto(a, m - 1 + i);
      if (t > hasta) break;
      if (!hechas.has(t)) faltan.push(t);
    }
    if (!faltan.length) return;
    const rp = await fetch(URL_BASE + '/rest/v1/perfiles?select=id,usuario,logros&limit=100000',
      { headers: S });
    if (!rp.ok) throw new Error('perfiles ' + rp.status);
    const filas = await rp.json() as Fila[];
    for (const t of faltan) {
      const top = G.top3(filas, t, DATOS) as Array<{ id: string; usuario: string; pr: number }>;
      await rpc('cofres_cerrar', {
        p_temporada: t,
        p_ganadores: top.map((x) => x.id),
        p_detalle: top.map((x, i) => ({ puesto: i + 1, usuario: x.usuario, pr: x.pr }))
      });
    }
  }

  try {
    await cerrarTemporadas();
  } catch (e) {
    /* que un fallo aquí no deje a nadie sin abrir lo demás */
    console.log('cofres: cierre de temporada', String(e));
  }

  let fila: Fila | null;
  try {
    fila = await leer();
  } catch {
    return mal('NO SE PUDO LEER LA CUENTA', 502);
  }
  if (!fila) return mal('ESA CUENTA NO TIENE PERFIL', 404);

  const hoy = G.dia(Date.now());
  /* ---- la base: todas la tienen; si no, se pone con lo de ahora ---- */
  if (!G.baseDe(fila.logros)) {
    const b = G.baseAhora(fila.logros, fila.xp, hoy, DATOS, fila.usuario);
    try {
      await rpc('cofres_fijar_base', { p_id: uid, p_base: {
        cofre_b_dia: b.dia, cofre_b_partidas: b.partidas, cofre_b_semana: b.semana,
        cofre_b_nivel: b.nivel, cofre_b_mae: b.mae } });
      fila = await leer();
    } catch {
      return mal('NO SE PUDO PREPARAR LA CUENTA', 502);
    }
    if (!fila) return mal('ESA CUENTA NO TIENE PERFIL', 404);
  }

  function cuentas(f: Fila) {
    return {
      ganados: G.ganados(f.logros, f.xp, G.baseDe(f.logros), hoy, DATOS, f.usuario),
      abiertos: G.abiertos(f.logros)
    };
  }

  if (op === 'estado') {
    return respuesta({ ok: true, ...cuentas(fila), logros: clavesCofre(fila.logros) });
  }

  /* ---- ABRIR el siguiente de ese tipo ---- */
  for (let intento = 0; intento < 4; intento++) {
    const { ganados, abiertos } = cuentas(fila);
    const n = abiertos[tipo] + 1;
    if (n > ganados[tipo]) {
      return mal('NO TIENES COFRES DE ' + NOMBRES[tipo] + ' SIN ABRIR', 409,
        { ganados, abiertos, logros: clavesCofre(fila.logros) });
    }
    const lg = fila.logros;
    const premio = G.premio(uid, tipo, n, DATOS);
    const resultado = G.aplicar(premio, (id: string) => num(lg['c_' + id]) >= 1, DATOS);
    let r: { ok?: boolean; motivo?: string; logros?: Record<string, number> };
    try {
      r = await rpc('cofres_abrir', {
        p_id: uid, p_tipo: tipo, p_n: n, p_nuevos: resultado.nuevos,
        p_repetidos: resultado.repetidos.map((x: { id: string }) => x.id),
        p_monedas: resultado.monedas
      }) as typeof r;
    } catch {
      return mal('NO SE PUDO ABRIR', 502);
    }
    if (r && r.ok) {
      abiertos[tipo] = n;
      return respuesta({
        ok: true, premio, resultado, ganados, abiertos,
        logros: { ...clavesCofre(lg), ...(r.logros || {}) }
      });
    }
    /* la cuenta cambió entre leerla y escribirla: se vuelve a leer */
    try {
      fila = await leer();
    } catch {
      return mal('NO SE PUDO LEER LA CUENTA', 502);
    }
    if (!fila) return mal('ESA CUENTA NO TIENE PERFIL', 404);
  }
  return mal('INTÉNTALO OTRA VEZ', 409);
});
