/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/functions/regalos/index.ts
 * REGALAR PIEZAS DE LA TIENDA A UN AMIGO (29 sep 2026)
 *
 * El juego no puede escribir en el perfil de otro ni apuntarse lo regalado
 * (el trigger de perfiles no le deja: supabase/perfiles-blindaje.sql). Esto
 * lo hace con la sesión del jugador y la service role:
 *
 *   POST { op: 'amigos', pieza }        -> cuánto puedes regalar y, de cada
 *                                          amigo, si puede recibirla
 *   POST { op: 'regalar', para, pieza } -> la regala (cobra y entrega)
 *   POST { op: 'avisos' }               -> lo que te han regalado y aún no
 *                                          has visto (y sus piezas)
 *   POST { op: 'vistos', hasta }        -> ya lo has visto
 *
 * Todas las comprobaciones (amistad mutua, saldo con lo GANADO, que no la
 * tenga, tope diario, que sea de tienda) y la escritura van en una sola
 * transacción en public.regalos_dar (supabase/tienda.sql).
 *
 * Se despliega con:
 *   SBP=<token> node supabase/desplegar-funcion.js regalos
 * (verify_jwt en false, como las otras: el token lo mira ella).
 * ============================================================ */

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
function objeto(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, unknown> : {};
}

const PIEZA = /^[a-z0-9_]{1,40}$/;
const NOMBRE = /^[A-Z0-9]{1,12}$/;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return mal('SOLO SE ACEPTA POST', 405);

  const URL_BASE = Deno.env.get('SUPABASE_URL') || '';
  const CLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!URL_BASE || !CLAVE) return mal('REGALOS MAL CONFIGURADOS', 500);
  const S = { 'apikey': CLAVE, 'Authorization': 'Bearer ' + CLAVE, 'Content-Type': 'application/json' };

  let datos: Record<string, unknown> = {};
  try {
    const t = await req.text();
    if (t.length > 1000) return mal('ENVÍO NO VÁLIDO');
    datos = objeto(JSON.parse(t || '{}'));
  } catch {
    return mal('ENVÍO NO VÁLIDO');
  }
  const op = String(datos.op || '');
  const pieza = String(datos.pieza || '');
  const para = String(datos.para || '').toUpperCase();
  if (['amigos', 'regalar', 'avisos', 'vistos'].indexOf(op) === -1) return mal('ENVÍO NO VÁLIDO');
  if ((op === 'amigos' || op === 'regalar') && !PIEZA.test(pieza)) return mal('ESO NO SE PUEDE REGALAR');
  if (op === 'regalar' && !NOMBRE.test(para)) return mal('ELIGE A UN AMIGO');

  /* ---- quién es: su sesión ---- */
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  let uid = '';
  try {
    const r = await fetch(URL_BASE + '/auth/v1/user', {
      headers: { 'apikey': CLAVE, 'Authorization': 'Bearer ' + token }
    });
    if (r.ok) uid = String(((await r.json()) as { id?: string }).id || '');
  } catch { /* sin respuesta: sin sesión */ }
  if (!uid) return mal('ENTRA EN TU CUENTA PARA REGALAR', 401);

  async function rpc(fn: string, cuerpo: unknown): Promise<Record<string, unknown>> {
    const r = await fetch(URL_BASE + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: S, body: JSON.stringify(cuerpo)
    });
    if (!r.ok) throw new Error(fn + ' ' + r.status + ' ' + (await r.text()).slice(0, 200));
    const d = await r.json();
    return objeto(typeof d === 'number' ? { filas: d } : d);
  }

  try {
    if (op === 'amigos') {
      const d = await rpc('regalos_amigos', { p_de: uid, p_pieza: pieza });
      return d.ok ? respuesta(d) : mal(String(d.error || 'NO SE PUDO'), 404);
    }
    if (op === 'regalar') {
      const d = await rpc('regalos_dar', { p_de: uid, p_para: para, p_pieza: pieza });
      return d.ok ? respuesta(d) : mal(String(d.error || 'NO SE PUDO REGALAR'), 409, d);
    }
    if (op === 'avisos') {
      return respuesta(await rpc('regalos_avisos', { p_para: uid }));
    }
    const hasta = Math.floor(Number(datos.hasta) || 0);
    if (!(hasta > 0)) return mal('ENVÍO NO VÁLIDO');
    const d = await rpc('regalos_vistos', { p_para: uid, p_hasta: hasta });
    return respuesta({ ok: true, vistos: d.filas || 0 });
  } catch (e) {
    console.log('regalos', op, String(e));
    return mal('NO SE PUDO: INTÉNTALO OTRA VEZ', 502);
  }
});
