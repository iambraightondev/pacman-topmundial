/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/functions/cuenta
 *
 * Alta, entrada, "he olvidado la contraseña" y los cambios de correo
 * y contraseña, en un solo sitio.
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
 * nunca al navegador**, que es justo lo que no se podría garantizar si
 * el juego tuviera que consultarlo para entrar.
 *
 * verify_jwt: FALSE, a propósito: quien viene aquí todavía no tiene
 * sesión (esa es la gracia). Lo que protege cada operación es la
 * contraseña, o el propio correo en el caso de la recuperación.
 *
 * OPERACIONES
 *   alta    { usuario, pass, correo }           -> { ok, sesion }
 *   entrar  { usuario, pass, pass2? }           -> { ok, sesion, segunda }
 *   olvide  { usuario }                         -> { ok, pista: '' }
 *   correo  { usuario, pass, pass2?, correo }   -> { ok }
 *   clave   { usuario, pass, pass2?, nueva }    -> { ok }
 *
 * 28 SEP 2026 — LO QUE CAMBIÓ (supabase/cuenta-frenos.sql)
 *   · ENTRAR TIENE FRENO: 5 fallos seguidos por usuario cierran 15 min, y
 *     cada fallo más dobla la espera (2 h como mucho). `pass2` es la
 *     contraseña tal cual se escribió, para las cuentas viejas que no la
 *     tienen en mayúsculas (Account.signIn): las dos en UNA petición, un
 *     solo intento.
 *   · ALTA: contraseña de 8 como mínimo (las cuentas que ya existen siguen
 *     entrando con la suya) y el mismo filtro de palabras que el top mundial.
 *   · OLVIDÉ: la MISMA respuesta exista la cuenta o no, tenga correo o no, y
 *     sin pista del correo (antes decía "ese usuario no existe" o "esa cuenta
 *     no tiene correo", y enseñaba media dirección a cualquiera que supiera un
 *     nombre del top). Un correo cada 15 min por usuario.
 *   · CAMBIAR EL CORREO o LA CONTRASEÑA pide la contraseña actual y va por
 *     aquí (API de administración), no por /auth/v1/user con la sesión: con
 *     una sesión robada ya no se puede cambiar el correo y pedir la
 *     recuperación.
 *
 * Variables de entorno: las pone Supabase sola al desplegar
 * (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).
 * ============================================================ */

/* Mismas constantes que js/config.js */
const USER_MIN = 3;               // CFG.ACCOUNT.USER_MIN
const NICK_MAX = 12;              // CFG.NICK_MAX
const PASS_MIN = 6;               // CFG.ACCOUNT.PASS_MIN: el de las cuentas de antes
const PASS_MIN_NUEVA = 8;         // CFG.ACCOUNT.PASS_MIN_NUEVA: cuentas y contraseñas nuevas
const PASS_MAX = 72;              // tope de bcrypt: más allá se ignora en silencio
const MAIL_MAX = 254;             // lo que permite el estándar
/* Dominio de los correos internos de antes de esto. Una cuenta con este
 * dominio NO tiene correo de verdad y no se le puede mandar nada. */
const MAIL_INTERNO = 'cuentas.pacman-topmundial.vercel.app';
/* "Olvidé" tarda lo mismo haya o no a quién escribir: si no, el tiempo de
 * respuesta diría lo que el mensaje ya no dice. */
const OLVIDE_MS = 900;

/* Palabras vetadas: copia de CFG.BAD_WORDS de js/config.js (la misma lista
 * que la función enviar-record) */
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

/* Mismo aplanado que Ranking.nameAllowed() en js/ranking.js: los números que
 * imitan letras vuelven a su letra, así no se cuela un PUT4. */
function nombrePermitido(nombre: string): boolean {
  const plano = String(nombre || '').toUpperCase()
    .replace(/[0]/g, 'O').replace(/[1|!]/g, 'I').replace(/[3]/g, 'E')
    .replace(/[4@]/g, 'A').replace(/[5$]/g, 'S').replace(/[7]/g, 'T')
    .replace(/[^A-Z]/g, '');
  if (!plano) return false;
  for (const mala of PALABRAS_VETADAS) {
    if (plano.indexOf(mala) !== -1) return false;
  }
  return true;
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

function espera(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.max(0, ms)));
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

  /* ---- los frenos (supabase/cuenta-frenos.sql) ----
   * Si la base no contesta, se deja pasar: no poder frenar no puede dejar a
   * nadie sin entrar en su cuenta. */
  async function rpc(nombre: string, clave: string): Promise<unknown> {
    try {
      const res = await fetch(URL_BASE + '/rest/v1/rpc/' + nombre, {
        method: 'POST', headers: cab, body: JSON.stringify({ p_clave: clave })
      });
      if (!res.ok) return null;
      const t = await res.text();
      return t ? JSON.parse(t) : null;
    } catch {
      return null;
    }
  }
  const claveEntrar = 'entrar:' + usuario;

  async function frenado(): Promise<Response | null> {
    const s = Number(await rpc('cuenta_espera', claveEntrar)) || 0;
    if (s <= 0) return null;
    const min = Math.max(1, Math.ceil(s / 60));
    return mal('DEMASIADOS INTENTOS: ESPERA ' + min + ' MIN', 429, s + ' s');
  }

  /* ---- sesión a partir de correo + contraseña (null si no entra) ---- */
  async function pedirSesion(correo: string, pass: string): Promise<Record<string, unknown> | null> {
    const res = await fetch(URL_BASE + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: cab,
      body: JSON.stringify({ email: correo, password: pass })
    });
    const d = await res.json().catch(() => ({})) as Record<string, unknown>;
    return (res.ok && d.access_token) ? d : null;
  }

  /* ---- ¿esta contraseña (o la segunda, tal cual se escribió) es la de la
   * cuenta? Devuelve la sesión, o null. Cuenta como un intento. ---- */
  async function comprobar(id: string | null): Promise<{ sesion: Record<string, unknown> | null; correo: string; segunda: boolean }> {
    const pass = String(datos.pass == null ? '' : datos.pass);
    const pass2 = String(datos.pass2 == null ? '' : datos.pass2);
    let correo = '';
    let s: Record<string, unknown> | null = null;
    let segunda = false;
    if (id) {
      correo = await correoDe(id);
      if (correo && pass) s = await pedirSesion(correo, pass);
      if (!s && correo && pass2 && pass2 !== pass) {
        s = await pedirSesion(correo, pass2);
        segunda = !!s;
      }
    }
    if (s) await rpc('cuenta_limpia', claveEntrar);
    else await rpc('cuenta_fallo', claveEntrar);
    return { sesion: s, correo, segunda };
  }

  /* ---- cierra una sesión que solo se abrió para comprobar la contraseña ---- */
  async function soltar(s: Record<string, unknown> | null): Promise<void> {
    if (!s || !s.access_token) return;
    await fetch(URL_BASE + '/auth/v1/logout', {
      method: 'POST',
      headers: { 'apikey': CLAVE, 'Authorization': 'Bearer ' + String(s.access_token) }
    }).catch(() => {});
  }

  /* =========================================================
   * ENTRAR
   * Usuario que no existe y contraseña mala dan la MISMA respuesta, y los
   * dos cuentan para el freno.
   * ========================================================= */
  if (op === 'entrar') {
    const pass = String(datos.pass == null ? '' : datos.pass);
    if (!pass) return mal('ESCRIBE USUARIO Y CONTRASEÑA');
    try {
      const f = await frenado();
      if (f) return f;
      const c = await comprobar(await idDe(usuario));
      if (!c.sesion) return mal('USUARIO O CONTRASEÑA MAL', 401);
      /* `segunda`: entró con la contraseña tal cual se escribió, no con la de
       * mayúsculas. El juego se la pasa a mayúsculas acto seguido. */
      return respuesta({ ok: true, sesion: c.sesion, segunda: c.segunda }, 200);
    } catch (e) {
      return mal('NO SE PUDO ENTRAR', 502, String(e));
    }
  }

  /* =========================================================
   * CAMBIAR EL CORREO o LA CONTRASEÑA, con la contraseña actual
   * ========================================================= */
  if (op === 'correo' || op === 'clave') {
    try {
      const f = await frenado();
      if (f) return f;
      const id = await idDe(usuario);
      /* lo nuevo se mira ANTES de gastar un intento de contraseña */
      let nuevoCorreo = '', nuevaClave = '';
      if (op === 'correo') {
        nuevoCorreo = limpiaCorreo(datos.correo);
        if (!correoPlausible(nuevoCorreo)) return mal('ESE CORREO NO TIENE BUENA PINTA');
        if (esInterno(nuevoCorreo)) return mal('ESE CORREO NO VALE');
      } else {
        nuevaClave = String(datos.nueva == null ? '' : datos.nueva);
        const actual = String(datos.pass == null ? '' : datos.pass);
        /* Pasar la de siempre a MAYÚSCULAS (Account.signIn con una cuenta
         * vieja) no es una contraseña nueva: vale con su largo de antes. */
        const mismaEnMayusculas = nuevaClave.toUpperCase() === actual.toUpperCase();
        const min = mismaEnMayusculas ? PASS_MIN : PASS_MIN_NUEVA;
        if (nuevaClave.length < min) return mal('LA CONTRASEÑA NECESITA AL MENOS ' + min + ' CARACTERES');
        if (nuevaClave.length > PASS_MAX) return mal('CONTRASEÑA DEMASIADO LARGA');
      }
      const c = await comprobar(id);
      if (!c.sesion || !id) return mal('CONTRASEÑA MAL', 401);
      await soltar(c.sesion);
      if (op === 'correo' && nuevoCorreo === c.correo) return respuesta({ ok: true }, 200);
      const res = await fetch(URL_BASE + '/auth/v1/admin/users/' + encodeURIComponent(id), {
        method: 'PUT', headers: cab,
        body: JSON.stringify(op === 'correo'
          ? { email: nuevoCorreo, email_confirm: true }
          : { password: nuevaClave })
      });
      if (!res.ok) {
        const texto = await res.text();
        if (/already|registered|exists|duplicate/i.test(texto)) {
          return mal('ESE CORREO YA ES DE OTRA CUENTA', 409, texto.slice(0, 200));
        }
        return mal('NO SE PUDO GUARDAR', 502, texto.slice(0, 200));
      }
      return respuesta({ ok: true }, 200);
    } catch (e) {
      return mal('NO SE PUDO GUARDAR', 502, String(e));
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
    if (!nombrePermitido(usuario)) return mal('ESE NOMBRE NO ESTÁ PERMITIDO');
    if (pass.length < PASS_MIN_NUEVA) {
      return mal('LA CONTRASEÑA NECESITA AL MENOS ' + PASS_MIN_NUEVA + ' CARACTERES');
    }
    if (pass.length > PASS_MAX) return mal('CONTRASEÑA DEMASIADO LARGA');
    if (!correoPlausible(correo)) return mal('ESE CORREO NO TIENE BUENA PINTA');
    if (esInterno(correo)) return mal('ESE CORREO NO VALE');

    let id = '';
    try {
      if (await idDe(usuario)) return mal('ESE USUARIO YA EXISTE', 409);

      /* email_confirm: la cuenta nace confirmada. El correo se pide para poder
       * recuperar la contraseña, no para verificar a nadie: obligar a
       * confirmarlo antes de jugar es un peaje que no compra nada aquí.
       * Va por la API de administración, que sigue funcionando con el alta
       * pública de Supabase apagada (así nadie se salta esta función). */
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
      const s = await pedirSesion(correo, pass);
      if (!s) return mal('NO SE PUDO ENTRAR', 502, 'cuenta creada, sesión no');
      return respuesta({ ok: true, sesion: s }, 200);
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
   *
   * La respuesta es SIEMPRE la misma y tarda lo mismo: exista o no el usuario,
   * tenga correo o no, se mande o no (uno cada 15 min por usuario). Así este
   * botón no sirve para averiguar nada de nadie.
   * ========================================================= */
  if (op === 'olvide') {
    const empieza = Date.now();
    try {
      const id = await idDe(usuario);
      const correo = id ? await correoDe(id) : '';
      if (correo && !esInterno(correo) &&
          await rpc('cuenta_olvide_toca', 'olvide:' + usuario) === true) {
        const res = await fetch(URL_BASE + '/auth/v1/recover', {
          method: 'POST', headers: cab,
          body: JSON.stringify({ email: correo })
        });
        if (!res.ok) console.log('olvide: recover ' + res.status);
      }
    } catch (e) {
      console.log('olvide: ' + String(e));
    }
    await espera(OLVIDE_MS - (Date.now() - empieza));
    return respuesta({ ok: true, pista: '' }, 200);
  }

  return mal('OPERACIÓN DESCONOCIDA', 400, op);
});
