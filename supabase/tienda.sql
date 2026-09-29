-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/tienda.sql
-- LA TIENDA EN EL SERVIDOR: PRECIOS, SALDO Y REGALOS (29 sep 2026)
--
-- Orden: supabase/cuentas.sql, supabase/perfiles-blindaje.sql,
-- supabase/cofres.sql, ESTO, supabase/tienda-precios.sql (los precios,
-- generados desde js/config.js por supabase/tienda-precios.js) y otra vez
-- supabase/perfiles-blindaje.sql si su trigger es de antes del 29 sep (el
-- paso 6, LAS COMPRAS, solo se enciende si existe tienda_precios). Se puede
-- ejecutar tantas veces como haga falta. La vuelta atrás está en
-- supabase/tienda-vuelta-atras.sql.
--
-- EL AGUJERO. Una compra es un contador (`c_<id>` = 1) que sube con el
-- perfil, y el servidor no sabía lo que costaba nada: desde la consola del
-- navegador se podía marcar cualquier pieza de la TIENDA como tuya y
-- quedarse con el saldo en negativo para siempre.
--
-- LO QUE SE HACE. El servidor conoce los precios (tienda_precios) y calcula
-- el saldo como Tienda.saldo() (tienda_saldo): 1.500 de salida + regalo de
-- veterano + ganadas + cofres + pase + rango − lo comprado − lo pagado en
-- continuar − lo gastado en regalos. El trigger de perfiles (paso 6) mira
-- cada pieza de tienda que llega NUEVA desde el juego, de la más barata a la
-- más cara, y la deja entrar si el saldo ANTES de ella no es negativo.
--
-- LA DEUDA DE UNA PIEZA. Dos aparatos sin conexión que compran cada uno una
-- cosa con las MISMAS monedas son un caso legítimo: cada uno tenía saldo. Al
-- juntarse, el segundo en subir encuentra saldo >= 0 (el primero lo dejó en
-- lo que le quedaba) y su pieza entra, dejando el saldo en negativo: esa
-- deuda se paga con lo siguiente que gane, y mientras dure no entra ninguna
-- pieza nueva (ni se puede comprar en el juego, que ya lo impedía). Así no se
-- quita nada a nadie y la deuda NO puede crecer desde la consola: como mucho
-- una pieza fiada cada vez que el saldo vuelve a cero, pagada con monedas
-- ganadas jugando. Lo que no entra no se pierde: el aparato la sigue
-- teniendo y la vuelve a subir en cada guardado; entra sola cuando el saldo
-- vuelve a no ser negativo. Cada pieza rechazada queda en la auditoría.
--
-- EL SALDO DEL SERVIDOR ES GENEROSO A PROPÓSITO: ante la duda, más saldo
-- (dejar pasar una trampa pequeña que la auditoría enseña es mejor que dejar
-- una compra de verdad sin subir). Las cuentas con PR puestos a mano
-- (CFG.AJUSTES_CUENTA.rango) cuentan una fruta más en esas temporadas.
--
-- REGALAR (tabla `regalos`, función regalos_dar): comprar una pieza de tienda
-- para un AMIGO. Lo hace la Edge Function `regalos` con la service role:
--   · amistad MUTUA (cada uno tiene al otro en su lista): nadie recibe
--     regalos —ni avisos con el nombre de quien sea— de un desconocido;
--   · lo paga lo GANADO: las 1.500 de salida no se regalan (si no, cada
--     cuenta nueva sería una skin gratis para la principal);
--   · como mucho REGALOS_DIA regalos en 24 h por cuenta;
--   · el receptor no puede tenerla ya; y ni cofre, ni pase, ni rango (solo
--     lo que está en tienda_precios).
-- Al que regala se le apunta `gastoRegalo` (Tienda lo cuenta como gastado);
-- al que recibe, `c_<id>` y `rgl_<id>` (la pieza es suya y NO cuenta como
-- gastada: no la pagó él). El juego no puede escribir ninguno de los dos
-- (paso 1 del trigger). El aviso "X TE HA REGALADO ..." sale de las filas
-- de `regalos` sin ver.
-- ============================================================

-- ---------- los precios y los datos del saldo ----------
create table if not exists public.tienda_precios (
  id      text primary key,          -- el id del catálogo, sin el c_
  precio  integer not null check (precio >= 0)
);
comment on table public.tienda_precios is
  'Piezas que se VENDEN en la tienda y su precio. GENERADO desde js/config.js (supabase/tienda-precios.js).';
alter table public.tienda_precios enable row level security;
revoke all on public.tienda_precios from anon, authenticated;

create table if not exists public.tienda_datos (
  clave  text primary key,
  valor  jsonb not null
);
comment on table public.tienda_datos is
  'Lo que hace falta para calcular el saldo como Tienda.saldo(). GENERADO (supabase/tienda-precios.js).';
alter table public.tienda_datos enable row level security;
revoke all on public.tienda_datos from anon, authenticated;

-- ---------- el SALDO, como Tienda.saldo() ----------
-- lg: los contadores (perfiles.logros); usr: el nombre (los ajustes a mano).
create or replace function public.tienda_saldo(lg jsonb, usr text)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  d_pase  jsonb;
  d_rango jsonb;
  d_aj    jsonb;
  n       numeric;
  k       text;
  t       text;
  g       integer;
  dv      integer;
  mejor   numeric;
  tabla   text;
  ndiv    integer;
begin
  if jsonb_typeof(lg) is distinct from 'object' then lg := '{}'::jsonb; end if;
  select valor into d_pase from public.tienda_datos where clave = 'pase';
  select valor into d_rango from public.tienda_datos where clave = 'rango';
  select valor into d_aj from public.tienda_datos where clave = 'ajustes';
  n := coalesce((select (valor #>> '{}')::numeric from public.tienda_datos where clave = 'iniciales'), 1500)
     + public.num(lg, 'bono') + public.num(lg, 'monedas') + public.num(lg, 'cofre_monedas');

  -- el PASE (Pase.calculaMonedas): lo cobrado hasta el galón de cada mes
  if d_pase is not null then
    for k in select x from jsonb_object_keys(lg) x where x ~ '^px_[0-9]{4}-(0[1-9]|1[0-2])$' loop
      t := substr(k, 4);
      continue when t < d_pase ->> 'desde';
      g := least((d_pase ->> 'galones')::integer,
                 floor(public.num(lg, k) / (d_pase ->> 'porGalon')::numeric)::integer);
      continue when g < 1;
      n := n + (d_pase -> 'gratis' ->> g)::numeric;
      if public.num(lg, 'pp_' || t) >= 1 then
        n := n + (d_pase -> 'pago' ->> g)::numeric;
      end if;
    end loop;
  end if;

  -- el RANGO (Rango.monedas): lo cobrado hasta la fruta más alta de cada
  -- temporada, con los rangos de la versión 4 en adelante
  if d_rango is not null then
    ndiv := jsonb_array_length(d_rango -> 'tramoDiv');
    for t, mejor in
      select substr(x, length(x) - 6), max(public.num(lg, x))
        from jsonb_object_keys(lg) x
       where x ~ '^rm[0-9]+_[0-9]{4}-[0-9]{2}$'
         and substring(x from '^rm([0-9]+)_')::integer >= 4
       group by 1
    loop
      continue when mejor < 1;
      dv := (d_rango -> 'tramoDiv' ->> (least(ndiv::numeric, floor(mejor))::integer - 1))::integer;
      -- PR puestos a mano en esa temporada: una fruta más, por si acaso
      if d_aj is not null and upper(coalesce(usr, '')) <> ''
         and coalesce(d_aj -> upper(usr), '[]'::jsonb) ? t then
        dv := least(dv + 1, (d_rango -> 'tramoDiv' ->> (ndiv - 1))::integer);
      end if;
      -- la tabla de premios de esa temporada: la última que empieza antes, o la primera
      select coalesce(max(p) filter (where p <= t), min(p)) into tabla
        from jsonb_object_keys(d_rango -> 'premios') p;
      continue when tabla is null;
      n := n + coalesce((d_rango -> 'premios' -> tabla ->> dv)::numeric, 0);
    end loop;
  end if;

  -- lo GASTADO: lo comprado (lo regalado por otro no: rgl_<id>), continuar y regalos
  n := n - coalesce((select sum(p.precio) from public.tienda_precios p
                      where public.num(lg, 'c_' || p.id) >= 1
                        and public.num(lg, 'rgl_' || p.id) < 1), 0)
         - public.num(lg, 'gastoCont') - public.num(lg, 'gastoRegalo');
  return n;
end;
$$;
revoke all on function public.tienda_saldo(jsonb, text) from public, anon, authenticated;
grant execute on function public.tienda_saldo(jsonb, text) to service_role;

-- ============================================================
-- LOS REGALOS
-- ============================================================
create table if not exists public.regalos (
  n             bigserial primary key,
  de            uuid not null references public.perfiles(id) on delete cascade,
  para          uuid not null references public.perfiles(id) on delete cascade,
  de_usuario    text not null,
  para_usuario  text not null,
  pieza         text not null,
  precio        integer not null,
  en            timestamptz not null default now(),
  visto         boolean not null default false
);
comment on table public.regalos is
  'Piezas de tienda regaladas a un amigo (Edge Function regalos). visto = el receptor ya vio el aviso.';
create index if not exists regalos_para_idx on public.regalos (para) where not visto;
create index if not exists regalos_de_idx on public.regalos (de, en desc);
alter table public.regalos enable row level security;
revoke all on public.regalos from anon, authenticated;
revoke all on sequence public.regalos_n_seq from anon, authenticated;

-- ¿Cuántos regalos al día puede hacer una cuenta?
create or replace function public.regalos_tope_dia()
returns integer language sql immutable as $$ select 5 $$;

-- Lo que la pantalla de REGALAR necesita: cuánto puedes regalar y, de cada
-- amigo de tu lista, si puede recibir esa pieza.
--   estado: 'ok' | 'sin_cuenta' (ese nombre no tiene cuenta)
--         | 'no_mutuo' (no te tiene en su lista) | 'ya_la_tiene'
create or replace function public.regalos_amigos(p_de uuid, p_pieza text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  yo      public.perfiles%rowtype;
  precio  integer;
  lista   jsonb;
begin
  select * into yo from public.perfiles where id = p_de;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'ESA CUENTA NO TIENE PERFIL');
  end if;
  select tp.precio into precio from public.tienda_precios tp where tp.id = p_pieza;
  select coalesce(jsonb_agg(jsonb_build_object(
           'usuario', a.amigo,
           'estado', case
             when p.id is null then 'sin_cuenta'
             when not exists (select 1 from public.amigos b
                               where b.de = p.id and b.amigo = upper(yo.usuario)) then 'no_mutuo'
             when precio is not null and public.num(p.logros, 'c_' || p_pieza) >= 1 then 'ya_la_tiene'
             else 'ok' end
         ) order by a.amigo), '[]'::jsonb)
    into lista
    from public.amigos a
    left join public.perfiles p on upper(p.usuario) = a.amigo and p.id <> p_de
   where a.de = p_de;
  return jsonb_build_object(
    'ok', true,
    'precio', precio,
    'regalable', precio is not null,
    'disponible', public.tienda_saldo(yo.logros, yo.usuario)
                  - coalesce((select (valor #>> '{}')::numeric from public.tienda_datos
                               where clave = 'iniciales'), 1500),
    'hoy', (select count(*) from public.regalos r where r.de = p_de and r.en > now() - interval '1 day'),
    'tope', public.regalos_tope_dia(),
    'amigos', lista);
end;
$$;
revoke all on function public.regalos_amigos(uuid, text) from public, anon, authenticated;
grant execute on function public.regalos_amigos(uuid, text) to service_role;

-- REGALAR: todo en una transacción, con las dos filas bloqueadas (en orden de
-- id, para que dos regalos cruzados no se esperen el uno al otro).
create or replace function public.regalos_dar(p_de uuid, p_para text, p_pieza text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  yo      public.perfiles%rowtype;
  el      public.perfiles%rowtype;
  para_id uuid;
  precio  integer;
  libre   numeric;
  hoy     integer;
  lg      jsonb;
begin
  p_para := upper(coalesce(p_para, ''));
  select tp.precio into precio from public.tienda_precios tp where tp.id = p_pieza;
  if precio is null then
    return jsonb_build_object('ok', false, 'error', 'ESO NO SE PUEDE REGALAR');
  end if;
  select id into para_id from public.perfiles where upper(usuario) = p_para;
  if para_id is null then
    return jsonb_build_object('ok', false, 'error', p_para || ' NO TIENE CUENTA');
  end if;
  if para_id = p_de then
    return jsonb_build_object('ok', false, 'error', 'NO PUEDES REGALARTE A TI');
  end if;
  -- las dos filas, bloqueadas en orden
  perform 1 from public.perfiles where id in (p_de, para_id) order by id for update;
  select * into yo from public.perfiles where id = p_de;
  select * into el from public.perfiles where id = para_id;
  if yo.id is null then
    return jsonb_build_object('ok', false, 'error', 'ESA CUENTA NO TIENE PERFIL');
  end if;
  if not exists (select 1 from public.amigos where de = p_de and amigo = upper(el.usuario))
     or not exists (select 1 from public.amigos where de = para_id and amigo = upper(yo.usuario)) then
    return jsonb_build_object('ok', false, 'error', 'SOLO ENTRE AMIGOS: ' || upper(el.usuario) || ' TIENE QUE TENERTE EN SU LISTA');
  end if;
  if public.num(el.logros, 'c_' || p_pieza) >= 1 then
    return jsonb_build_object('ok', false, 'error', upper(el.usuario) || ' YA LA TIENE');
  end if;
  select count(*) into hoy from public.regalos r where r.de = p_de and r.en > now() - interval '1 day';
  if hoy >= public.regalos_tope_dia() then
    return jsonb_build_object('ok', false, 'error', 'YA HAS HECHO ' || public.regalos_tope_dia() || ' REGALOS HOY');
  end if;
  libre := public.tienda_saldo(yo.logros, yo.usuario)
         - coalesce((select (valor #>> '{}')::numeric from public.tienda_datos where clave = 'iniciales'), 1500);
  if libre < precio then
    return jsonb_build_object('ok', false, 'error', 'NO TE ALCANZA: SE REGALA CON LO GANADO',
                              'disponible', libre, 'precio', precio);
  end if;

  lg := case when jsonb_typeof(yo.logros) = 'object' then yo.logros else '{}'::jsonb end;
  lg := lg || jsonb_build_object('gastoRegalo', public.num(lg, 'gastoRegalo') + precio);
  update public.perfiles set logros = lg where id = p_de;
  update public.perfiles
     set logros = (case when jsonb_typeof(logros) = 'object' then logros else '{}'::jsonb end)
                  || jsonb_build_object('c_' || p_pieza, 1, 'rgl_' || p_pieza, 1)
   where id = para_id;
  insert into public.regalos (de, para, de_usuario, para_usuario, pieza, precio)
  values (p_de, para_id, upper(yo.usuario), upper(el.usuario), p_pieza, precio);
  return jsonb_build_object('ok', true, 'para', upper(el.usuario), 'pieza', p_pieza, 'precio', precio,
                            'logros', jsonb_build_object('gastoRegalo', public.num(lg, 'gastoRegalo')),
                            'disponible', libre - precio);
end;
$$;
revoke all on function public.regalos_dar(uuid, text, text) from public, anon, authenticated;
grant execute on function public.regalos_dar(uuid, text, text) to service_role;

-- Los regalos que el receptor aún no ha visto, con las piezas que le
-- corresponden (para que su juego las tome aunque no haya vuelto a leer la
-- cuenta entera).
create or replace function public.regalos_avisos(p_para uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('ok', true,
    'avisos', coalesce((select jsonb_agg(jsonb_build_object(
                'n', r.n, 'de', r.de_usuario, 'pieza', r.pieza, 'en', r.en) order by r.n)
              from (select * from public.regalos where para = p_para and not visto
                     order by n limit 20) r), '[]'::jsonb),
    'logros', coalesce((select jsonb_object_agg(k, v) from (
                select 'c_' || r.pieza as k, to_jsonb(1) as v from public.regalos r
                 where r.para = p_para and not r.visto
                union
                select 'rgl_' || r.pieza, to_jsonb(1) from public.regalos r
                 where r.para = p_para and not r.visto) s), '{}'::jsonb))
$$;
revoke all on function public.regalos_avisos(uuid) from public, anon, authenticated;
grant execute on function public.regalos_avisos(uuid) to service_role;

-- Ya los ha visto (hasta el número n)
create or replace function public.regalos_vistos(p_para uuid, p_hasta bigint)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare filas integer;
begin
  update public.regalos set visto = true where para = p_para and not visto and n <= p_hasta;
  get diagnostics filas = row_count;
  return filas;
end;
$$;
revoke all on function public.regalos_vistos(uuid, bigint) from public, anon, authenticated;
grant execute on function public.regalos_vistos(uuid, bigint) to service_role;

-- ============================================================
-- CÓMO MIRAR
--   El saldo de cada cuenta, como lo ve el servidor:
--     select usuario, public.tienda_saldo(logros, usuario) from perfiles order by 2;
--   Las piezas que el trigger no dejó entrar (sin saldo):
--     select en, usuario, recortes from perfiles_auditoria
--      where recortes::text like '%"c\_%' order by en desc limit 50;
--   Los regalos:  select * from regalos order by n desc limit 50;
-- ============================================================
