/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/functions/cuenta
 *
 * Alta, entrada y "he olvidado la contraseña", en un solo sitio.
 *
 * EL PROBLEMA QUE RESUELVE
 * Hasta ahora el correo de la cuenta se componía por dentro
 * (usuario@cuentas.pacman-topmundial.vercel.app) y ese buzón no
 * existe, así que el enlace de recuperación de Supabase no llegaba
 * a ninguna parte: quien olvidaba la contraseña perdía la cuenta
 * entera —los cuatro récords, la experiencia, los logros y las doce
 * maestrías— sin vuelta atrás.
 *
 * Ahora el correo de la cuenta es EL DE VERDAD, el que pone el
 * jugador. Y aun así se sigue entrando con USUARIO y contraseña,
 * que es como funciona el resto del juego (el usuario es también el
 * nombre en el ranking, en la party y en la lista de amigos).
 *
 * ¿Y cómo se entra con usuario si Supabase Auth pide el correo? Por
 * aquí: esta función resuelve usuario -> correo con la service role
 * y hace la petición de sesión ella misma. **El correo de nadie sale
 * nunca al navegador** —ni el propio, salvo enmascarado—, que es
 * justo lo que no se podría garantizar si el juego tuviera que
 * consultarlo para entrar.
 *
 * verify_jwt: FALSE, a propósito: quien viene aquí todavía no tiene
 * sesión (esa es la gracia). Lo que protege cada operación es la
 * contraseña, o el propio correo en el caso de la recuperación.
 *
 * OPERACIONES
 *   alta    { usuario, pass, correo } -> { ok, sesion }
 *   entrar  { usuario, pass }         -> { ok, sesion }
 *   olvide  { usuario }               -> { ok, pista }
 *
 * Variables de entorno: las pone Supabase sola al desplegar
 * (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).
 * ============================================================ */

/* Mismas constantes que js/config.js */
const USER_MIN = 3;               // CFG.ACCOUNT.USER_MIN
const NICK_MAX = 12;              // CFG.NICK_MAX
const PASS_MIN = 6;               // CFG.ACCOUNT.PASS_MIN
const PASS_MAX = 72;              // tope de bcrypt: más allá se ignora en silencio
const MAIL_MAX = 254;             // lo que permite el estándar
/* Dominio de los correos internos de antes de esto. Una cuenta con este
 * dominio NO tiene correo de verdad y no se le puede mandar nada: hay que
 * decírselo, no dejarla esperando un mensaje que no existe. */
const MAIL_INTERNO = 'cuentas.pacman-topmundial.vercel.app';

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

/* `error` sale tal cual en el panel del juego, así que va corto */
function mal(motivo: string, estado = 400, detalle = ''): Response {
  return respuesta({ ok: false, error: motivo, detalle: detalle }, estado);
}

/* Mismo saneado que Account.cleanUser() en js/account.js */
function limpiaUsuario(v: unknown): string {
  return String(v == null ? '' : v).toUpperCase()
    .replace(/[^A-Z0-9]/g, '').slice(0, NICK_MAX);
}

function limpiaCorreo(v: unknown): string {
  return String(v == null ? '' : v).trim().toLowerCase().slice(0, MAIL_MAX);
}

/* Comprobación deliberadamente floja: aquí no se valida un correo, se evita
 * un dedazo evidente. Si el correo está mal escrito lo dirá el mensaje que no
 * llega, y validar de más solo sirve para rechazar direcciones legítimas. */
function correoPlausible(c: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(c);
}

/* ¿Es uno de los correos internos de antes? Entonces no hay a dónde escribir. */
function esInterno(c: string): boolean {
  return c.endsWith('@' + MAIL_INTERNO);
}

/* El correo, tapado: 'maulio@gmail.com' -> 'm****o@g****.com'. Se enseña para
 * que quien lo pide sepa QUÉ buzón mirar sin que el correo entero salga a la
 * pantalla de cualquiera que sepa un nombre de usuario. */
function pista(c: string): string {
  const at = c.lastIndexOf('@');
  if (at <= 0) return '';
  const usuario = c.slice(0, at);
  const dominio = c.slice(at + 1);
  const punto = dominio.indexOf('.');
  const nombre = (punto > 0) ? dominio.slice(0, punto) : dominio;
  const resto = (punto > 0) ? dominio.slice(punto) : '';
  const tapa = (s: string) => (s.length <= 2)
    ? (s.charAt(0) + '*')
    : (s.charAt(0) + '*'.repeat(Math.min(4, s.length - 2)) + s.charAt(s.length - 1));
  return tapa(usuario) + '@' + tapa(nombre) + resto;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return mal('SOLO SE ACEPTA POST', 405);

  const URL_BASE = Deno.env.get('SUPABASE_URL') || '';
  const CLAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!URL_BASE || !CLAVE) {
    return mal('LAS CUENTAS ESTÁN MAL CONFIGURADAS', 500,
      'faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }
  const cab = {
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

  const op = String(datos.op || '');
  const usuario = limpiaUsuario(datos.usuario);
  if (usuario.length < USER_MIN) {
    return mal('EL USUARIO NECESITA AL MENOS ' + USER_MIN + ' LETRAS');
  }

  /* ---- id de ese usuario (o null si no existe) ---- */
  async function idDe(nombre: string): Promise<string | null> {
    const res = await fetch(
      URL_BASE + '/rest/v1/perfiles?usuario=eq.' + encodeURIComponent(nombre) +
        '&select=id&limit=1',
      { headers: cab }
    );
    if (!res.ok) throw new Error('perfiles ' + res.status);
    const filas = await res.json() as Array<{ id: string }>;
    return (Array.isArray(filas) && filas.length) ? String(filas[0].id) : null;
  }

  /* ---- correo de una cuenta (por la API de administración) ---- */
  async function correoDe(id: string): Promise<string> {
    const res = await fetch(
      URL_BASE + '/auth/v1/admin/users/' + encodeURIComponent(id),
      { headers: cab }
    );
    if (!res.ok) throw new Error('admin users ' + res.status);
    const u = await res.json() as { email?: string };
    return String(u.email || '').toLowerCase();
  }

  /* ---- sesión a partir de correo + contraseña ---- */
  async function sesion(correo: string, pass: string): Promise<Response> {
    const res = await fetch(URL_BASE + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: cab,
      body: JSON.stringify({ email: correo, password: pass })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.access_token) {
      return mal('USUARIO O CONTRASEÑA MAL', 401,
        JSON.stringify(d).slice(0, 200));
    }
    return respuesta({ ok: true, sesion: d }, 200);
  }

  /* =========================================================
   * ENTRAR
   * ========================================================= */
  if (op === 'entrar') {
    const pass = String(datos.pass == null ? '' : datos.pass);
    if (!pass) return mal('ESCRIBE USUARIO Y CONTRASEÑA');
    try {
      const id = await idDe(usuario);
      /* Usuario que no existe y contraseña mala dan la MISMA respuesta. Los
       * nombres son públicos (salen en el ranking), así que esto no esconde
       * gran cosa, pero tampoco hay ningún motivo para regalar la lista. */
      if (!id) return mal('USUARIO O CONTRASEÑA MAL', 401, 'no existe');
      const correo = await correoDe(id);
      if (!correo) return mal('USUARIO O CONTRASEÑA MAL', 401, 'sin correo');
      return await sesion(correo, pass);
    } catch (e) {
      return mal('NO SE PUDO ENTRAR', 502, String(e));
    }
  }

  /* =========================================================
   * ALTA
   * El alta se hace AQUÍ y no desde el navegador para poder deshacerla: si el
   * usuario ya está cogido después de crear la cuenta de auth, quedaría una
   * cuenta huérfana y, peor, el correo de esa persona ya estaría "usado" y no
   * podría volver a intentarlo con otro nombre.
   * ========================================================= */
  if (op === 'alta') {
    const pass = String(datos.pass == null ? '' : datos.pass);
    const correo = limpiaCorreo(datos.correo);
    if (pass.length < PASS_MIN) {
      return mal('LA CONTRASEÑA NECESITA AL MENOS ' + PASS_MIN + ' CARACTERES');
    }
    if (pass.length > PASS_MAX) return mal('CONTRASEÑA DEMASIADO LARGA');
    if (!correoPlausible(correo)) return mal('ESE CORREO NO TIENE BUENA PINTA');
    if (esInterno(correo)) return mal('ESE CORREO NO VALE');

    let id = '';
    try {
      if (await idDe(usuario)) return mal('ESE USUARIO YA EXISTE', 409);

      /* email_confirm: la cuenta nace confirmada. El correo se pide para poder
       * recuperar la contraseña, no para verificar a nadie: obligar a
       * confirmarlo antes de jugar es un peaje que no compra nada aquí. */
      const alta = await fetch(URL_BASE + '/auth/v1/admin/users', {
        method: 'POST', headers: cab,
        body: JSON.stringify({ email: correo, password: pass, email_confirm: true })
      });
      const d = await alta.json().catch(() => ({}));
      if (!alta.ok || !d.id) {
        const texto = JSON.stringify(d);
        if (/already been registered|already exists|duplicate/i.test(texto)) {
          return mal('ESE CORREO YA TIENE CUENTA', 409, texto.slice(0, 200));
        }
        if (/password/i.test(texto)) return mal('CONTRASEÑA DEMASIADO CORTA', 400);
        return mal('NO SE PUDO CREAR LA CUENTA', 502, texto.slice(0, 200));
      }
      id = String(d.id);

      const perfil = await fetch(URL_BASE + '/rest/v1/perfiles', {
        method: 'POST',
        headers: { ...cab, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ id: id, usuario: usuario })
      });
      if (!perfil.ok) {
        const texto = await perfil.text();
        /* Se deshace el alta: mejor que el jugador vuelva a intentarlo con
         * otro nombre que dejarle el correo pillado por una cuenta a medias. */
        await fetch(URL_BASE + '/auth/v1/admin/users/' + encodeURIComponent(id),
          { method: 'DELETE', headers: cab }).catch(() => {});
        return mal(/duplicate|unique/i.test(texto)
          ? 'ESE USUARIO YA EXISTE' : 'NO SE PUDO CREAR EL PERFIL',
          /duplicate|unique/i.test(texto) ? 409 : 502, texto.slice(0, 200));
      }
      return await sesion(correo, pass);
    } catch (e) {
      if (id) {
        await fetch(URL_BASE + '/auth/v1/admin/users/' + encodeURIComponent(id),
          { method: 'DELETE', headers: cab }).catch(() => {});
      }
      return mal('NO SE PUDO CREAR LA CUENTA', 502, String(e));
    }
  }

  /* =========================================================
   * OLVIDÉ LA CONTRASEÑA
   * Se le pide a Supabase que mande SU enlace de recuperación al correo de esa
   * cuenta. El enlace vuelve al juego con una sesión de un solo uso y el juego
   * pide la contraseña nueva (ver Account.desdeRecuperacion).
   * ========================================================= */
  if (op === 'olvide') {
    try {
      const id = await idDe(usuario);
      if (!id) return mal('ESE USUARIO NO EXISTE', 404);
      const correo = await correoDe(id);
      /* Cuenta de antes de que se pidiera correo: no hay a dónde escribir, y
       * decírselo claro es lo único útil que se puede hacer. */
      if (!correo || esInterno(correo)) {
        return mal('ESA CUENTA NO TIENE CORREO PUESTO', 409);
      }
      const res = await fetch(URL_BASE + '/auth/v1/recover', {
        method: 'POST', headers: cab,
        body: JSON.stringify({ email: correo })
      });
      if (!res.ok) {
        const texto = await res.text();
        if (/rate|too many|limit/i.test(texto)) {
          return mal('DEMASIADOS CORREOS SEGUIDOS: ESPERA UN RATO', 429,
            texto.slice(0, 200));
        }
        return mal('NO SE PUDO MANDAR EL CORREO', 502, texto.slice(0, 200));
      }
      return respuesta({ ok: true, pista: pista(correo) }, 200);
    } catch (e) {
      return mal('NO SE PUDO MANDAR EL CORREO', 502, String(e));
    }
  }

  return mal('OPERACIÓN DESCONOCIDA', 400, op);
});
