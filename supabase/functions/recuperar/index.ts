/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/functions/recuperar
 *
 * Devolver la cuenta a quien olvidó la contraseña. Hasta que esto
 * existió, olvidarla era PERDERLO TODO —los cuatro récords, la
 * experiencia, los logros y las doce maestrías— y no había vuelta
 * atrás: el correo de la cuenta se compone por dentro
 * (usuario@cuentas.pacman-topmundial.vercel.app), ese buzón no
 * existe y el enlace de recuperación de Supabase no llegaba a
 * ninguna parte.
 *
 * Cómo funciona
 *   Al registrarse, el juego enseña UNA VEZ un código de 16
 *   caracteres y guarda aquí solo su huella (SHA-256 de
 *   'USUARIO:CODIGO'), nunca el código. Para recuperar la cuenta se
 *   manda usuario + código + contraseña nueva; si la huella cuadra,
 *   esta función cambia la contraseña con la service role —que es
 *   la única que puede, y que NUNCA sale del servidor— y devuelve
 *   un CÓDIGO NUEVO, porque el viejo acaba de gastarse.
 *
 * Por qué la contraseña no se puede cambiar desde el navegador
 *   Supabase Auth solo deja cambiarla con una sesión abierta (que
 *   es justo lo que no tiene quien la ha olvidado) o con la API de
 *   administración, que pide la service role. De ahí esta función.
 *
 * verify_jwt: FALSE, y es a propósito. Quien viene aquí no tiene
 * sesión; ese es el problema que se está resolviendo. Lo que
 * protege la puerta es el propio código: 16 caracteres de un
 * alfabeto de 32 son 80 bits, y encima hay freno de intentos.
 *
 * Variables de entorno: las pone Supabase sola al desplegar
 * (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).
 *
 * Respuestas:
 *   200 { ok: true, codigo: 'XXXX-XXXX-XXXX-XXXX' }
 *   4xx { ok: false, error: 'MOTIVO CORTO', detalle: '...' }
 * El `error` sale tal cual en el panel del juego, así que va corto.
 * ============================================================ */

/* Mismas constantes que js/config.js y js/account.js */
const USER_MIN = 3;               // CFG.ACCOUNT.USER_MIN
const NICK_MAX = 12;              // CFG.NICK_MAX
const PASS_MIN = 6;               // CFG.ACCOUNT.PASS_MIN
const PASS_MAX = 72;              // tope de bcrypt: más allá se ignora en silencio

/* El alfabeto del código: 32 letras y cifras sin las que se confunden al
 * copiar a mano (I, O, 0, 1). Es el mismo criterio que los códigos de sala
 * (CFG.NET.ROOM_ALPHABET), que ya se dictan en voz alta sin líos. */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODIGO_LEN = 16;            // 4 grupos de 4 = 80 bits

/* Freno de fuerza bruta. Con 80 bits no hay quien acierte a ciegas, pero un
 * intento por segundo durante un mes tampoco tiene por qué ser gratis. Los
 * fallos SEGUIDOS se cuentan; un acierto pone el contador a cero. */
const MAX_INTENTOS = 10;
const ESPERA_MIN = 15;            // minutos de castigo al llegar al tope

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

function respuesta(cuerpo: unknown, estado: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

function mal(motivo: string, estado = 400, detalle = ''): Response {
  return respuesta({ ok: false, error: motivo, detalle: detalle }, estado);
}

/* Mismo saneado que Account.cleanUser() en js/account.js */
function limpiaUsuario(v: unknown): string {
  return String(v == null ? '' : v).toUpperCase()
    .replace(/[^A-Z0-9]/g, '').slice(0, NICK_MAX);
}

/* El código se escribe a mano, así que llega con guiones, espacios o en
 * minúsculas. Se quita todo lo que no sea del alfabeto y se compara con lo
 * que quede: si el jugador escribió 'xxxx xxxx-xxxx xxxx', vale igual. */
function limpiaCodigo(v: unknown): string {
  const t = String(v == null ? '' : v).toUpperCase();
  let out = '';
  for (const ch of t) {
    if (ALFABETO.indexOf(ch) !== -1) out += ch;
  }
  return out;
}

/* Un código nuevo, con azar de verdad (no Math.random) */
function nuevoCodigo(): string {
  const bytes = new Uint8Array(CODIGO_LEN);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < CODIGO_LEN; i++) {
    out += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return out;
}

/* Con guiones cada 4, que es como se enseña y como se apunta en un papel */
function conGuiones(codigo: string): string {
  return (codigo.match(/.{1,4}/g) || []).join('-');
}

async function huella(usuario: string, codigo: string): Promise<string> {
  const datos = new TextEncoder().encode(usuario + ':' + codigo);
  const buf = await crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* Comparación en tiempo constante: dos huellas del mismo largo siempre
 * tardan lo mismo en compararse, así que del tiempo de respuesta no se puede
 * deducir cuántos caracteres se acertaron. */
function igualSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return mal('SOLO SE ACEPTA POST', 405);

  const URL_BASE = Deno.env.get('SUPABASE_URL') || '';
  const CLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!URL_BASE || !CLAVE) {
    return mal('RECUPERACIÓN MAL CONFIGURADA', 500,
      'faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }
  const cabeceras = {
    'apikey': CLAVE,
    'Authorization': 'Bearer ' + CLAVE,
    'Content-Type': 'application/json'
  };

  let datos: Record<string, unknown>;
  try {
    const crudo = await req.text();
    if (crudo.length > 4096) return mal('ENVÍO NO VÁLIDO', 413);
    datos = JSON.parse(crudo || '{}');
  } catch {
    return mal('ENVÍO NO VÁLIDO', 400, 'el cuerpo no es JSON');
  }

  const usuario = limpiaUsuario(datos.usuario);
  const codigo = limpiaCodigo(datos.codigo);
  const pass = String(datos.pass == null ? '' : datos.pass);

  if (usuario.length < USER_MIN) return mal('ESCRIBE TU USUARIO');
  if (codigo.length !== CODIGO_LEN) return mal('ESE CÓDIGO NO TIENE BUENA PINTA');
  if (pass.length < PASS_MIN) {
    return mal('LA CONTRASEÑA NECESITA AL MENOS ' + PASS_MIN + ' CARACTERES');
  }
  if (pass.length > PASS_MAX) return mal('CONTRASEÑA DEMASIADO LARGA');

  /* ---- ¿de quién es ese usuario? ---- */
  let id = '';
  try {
    const res = await fetch(
      URL_BASE + '/rest/v1/perfiles?usuario=eq.' + encodeURIComponent(usuario) +
        '&select=id&limit=1',
      { headers: cabeceras }
    );
    const filas = await res.json() as Array<{ id: string }>;
    if (Array.isArray(filas) && filas.length) id = String(filas[0].id || '');
  } catch {
    return mal('NO SE PUDO COMPROBAR', 502, 'la base de datos no responde');
  }

  /* ---- su huella guardada ---- */
  let fila: { hash: string; intentos: number; ultimo: string | null } | null = null;
  if (id) {
    try {
      const res = await fetch(
        URL_BASE + '/rest/v1/recuperacion?id=eq.' + encodeURIComponent(id) +
          '&select=hash,intentos,ultimo&limit=1',
        { headers: cabeceras }
      );
      const filas = await res.json() as Array<typeof fila>;
      if (Array.isArray(filas) && filas.length) fila = filas[0];
    } catch {
      return mal('NO SE PUDO COMPROBAR', 502, 'la base de datos no responde');
    }
  }

  /* Usuario que no existe y usuario sin código dan EXACTAMENTE la misma
   * respuesta que un código equivocado. Si no, esta puerta se convertiría en
   * una lista de qué nombres tienen cuenta. */
  const generico = 'USUARIO O CÓDIGO INCORRECTOS';

  if (!fila) {
    return mal(generico, 401, id ? 'esa cuenta no tiene código' : 'no existe');
  }

  /* ---- freno de intentos ---- */
  const intentos = Number(fila.intentos || 0);
  const ultimo = fila.ultimo ? Date.parse(fila.ultimo) : 0;
  const esperaMs = ESPERA_MIN * 60000;
  if (intentos >= MAX_INTENTOS && ultimo && (Date.now() - ultimo) < esperaMs) {
    const quedan = Math.ceil((esperaMs - (Date.now() - ultimo)) / 60000);
    return mal('DEMASIADOS INTENTOS: ESPERA ' + quedan + ' MIN', 429);
  }

  /* ---- ¿cuadra? ---- */
  const mia = await huella(usuario, codigo);
  if (!igualSeguro(mia, String(fila.hash || ''))) {
    /* El contador arranca de cero cuando ya se había cumplido el castigo:
     * si no, quien falló diez veces hace un mes se encontraría bloqueado sin
     * entender por qué. */
    const base = (intentos >= MAX_INTENTOS) ? 0 : intentos;
    try {
      await fetch(URL_BASE + '/rest/v1/recuperacion?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { ...cabeceras, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ intentos: base + 1, ultimo: new Date().toISOString() })
      });
    } catch { /* el freno no puede tumbar la respuesta */ }
    return mal(generico, 401, 'la huella no cuadra');
  }

  /* ---- contraseña nueva (API de administración) ---- */
  try {
    const res = await fetch(URL_BASE + '/auth/v1/admin/users/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: cabeceras,
      body: JSON.stringify({ password: pass })
    });
    if (!res.ok) {
      const texto = await res.text();
      if (/weak|at least/i.test(texto)) return mal('CONTRASEÑA DEMASIADO CORTA', 400);
      return mal('NO SE PUDO CAMBIAR LA CONTRASEÑA', 502, res.status + ' ' + texto);
    }
  } catch {
    return mal('NO SE PUDO CAMBIAR LA CONTRASEÑA', 502, 'auth no responde');
  }

  /* ---- y un código nuevo, que el viejo ya se ha gastado ----
   * Se cambia SIEMPRE. Un código de un solo uso que no se repone deja al
   * jugador otra vez sin red la próxima vez que se le olvide, que es
   * exactamente el problema del que venimos. */
  const nuevo = nuevoCodigo();
  try {
    const res = await fetch(
      URL_BASE + '/rest/v1/recuperacion?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { ...cabeceras, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          hash: await huella(usuario, nuevo),
          intentos: 0, ultimo: null, creado_en: new Date().toISOString()
        })
      }
    );
    if (!res.ok) {
      /* La contraseña YA se ha cambiado: decir que no se pudo sería mentir y
       * dejaría al jugador sin entrar con la nueva. Se avisa de que el código
       * sigue siendo el viejo y a seguir. */
      return respuesta({ ok: true, codigo: '', aviso: 'EL CÓDIGO SIGUE SIENDO EL MISMO' }, 200);
    }
  } catch {
    return respuesta({ ok: true, codigo: '', aviso: 'EL CÓDIGO SIGUE SIENDO EL MISMO' }, 200);
  }

  return respuesta({ ok: true, codigo: conGuiones(nuevo) }, 200);
});
