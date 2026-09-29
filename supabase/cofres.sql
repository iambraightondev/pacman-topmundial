-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/cofres.sql
-- LOS COFRES DE PREMIOS, EN EL SERVIDOR (28 sep 2026)
--
-- Orden: supabase/cuentas.sql, supabase/perfiles-blindaje.sql (su trigger ya
-- sabe de cofres: no deja que el juego escriba cofre_* ni piezas de cofre,
-- pone la base a las cuentas nuevas y cuenta el ORO de los récords en
-- cofres_recordes) y luego esto. Se puede ejecutar tantas veces como haga
-- falta. La vuelta atrás está en supabase/cofres-vuelta-atras.sql.
--
-- Cómo va (ver js/cofres.js y supabase/functions/cofres/index.ts):
--   · Lo GANADO se deriva de los contadores de `perfiles.logros` con
--     js/cofres-gen.js (ganados), desde una BASE por cuenta (cofre_b_*).
--   · ABRIR lo hace la Edge Function `cofres` con la service role: genera el
--     premio con la misma semilla que el juego y lo escribe con
--     cofres_abrir(), que bloquea la fila y solo acepta el cofre SIGUIENTE
--     (así dos aperturas a la vez no dan dos premios ni pisan monedas).
--   · El TOP 3 de cada temporada del rango se decide UNA vez, la primera vez
--     que alguien pregunta después de cerrarla, y se guarda en cofres_cierres.
--
-- Nada de esto lo pueden leer ni escribir los jugadores directamente.
-- ============================================================

-- ---------- el ORO de los récords: uno por cuenta, ruta y día ----------
create table if not exists public.cofres_recordes (
  perfil  uuid not null references public.perfiles(id) on delete cascade,
  ruta    text not null,                 -- la columna del récord (record1, record_hab2…)
  dia     date not null,                 -- día UTC
  en      timestamptz not null default now(),
  primary key (perfil, ruta, dia)
);
comment on table public.cofres_recordes is
  'Récords que han dado un cofre de ORO (uno por cuenta, ruta y día). Lo escribe el trigger perfiles_touch.';
alter table public.cofres_recordes enable row level security;
revoke all on public.cofres_recordes from anon, authenticated;
grant select on public.cofres_recordes to service_role;

-- ---------- el top 3 de cada temporada cerrada ----------
create table if not exists public.cofres_cierres (
  temporada  text primary key check (temporada ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  en         timestamptz not null default now(),
  ganadores  uuid[] not null default '{}',     -- en orden: 1.º, 2.º, 3.º
  detalle    jsonb                             -- usuario y PR de cada uno
);
comment on table public.cofres_cierres is
  'Top 3 del rango de cada temporada, fijado al cerrarla: cada uno gana un cofre LEGENDARIO.';
alter table public.cofres_cierres enable row level security;
revoke all on public.cofres_cierres from anon, authenticated;
grant select on public.cofres_cierres to service_role;

-- ---------- ABRIR un cofre ----------
-- p_n es el número del cofre de ese tipo que se abre (los abiertos + 1). Los
-- `nuevos` pasan a ser tuyos (c_<id> = 1), los `repetidos` ya lo eran y se
-- pagan en `p_monedas` junto con las monedas del cofre. Si mientras tanto la
-- cuenta ha cambiado (otro cofre abierto a la vez, una pieza que ya es tuya)
-- devuelve ok = false y la función vuelve a leer y a intentarlo.
create or replace function public.cofres_abrir(
  p_id uuid, p_tipo text, p_n integer,
  p_nuevos text[], p_repetidos text[], p_monedas integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  lg     jsonb;
  k      text;
  patch  jsonb := '{}'::jsonb;
begin
  if p_tipo not in ('madera', 'plata', 'oro', 'legendario') or p_n is null or p_n < 1
     or p_monedas is null or p_monedas < 0 or p_monedas > 100000 then
    raise exception 'cofre no valido' using errcode = '22023';
  end if;
  select logros into lg from public.perfiles where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'sin perfil');
  end if;
  if jsonb_typeof(lg) is distinct from 'object' then lg := '{}'::jsonb; end if;
  if public.num(lg, 'cofre_' || p_tipo) <> p_n - 1 then
    return jsonb_build_object('ok', false, 'motivo', 'conflicto');
  end if;
  foreach k in array coalesce(p_nuevos, '{}'::text[]) loop
    if k !~ '^[a-z0-9_]{1,40}$' then
      raise exception 'pieza no valida' using errcode = '22023';
    end if;
    if public.num(lg, 'c_' || k) >= 1 then
      return jsonb_build_object('ok', false, 'motivo', 'conflicto');
    end if;
    patch := patch || jsonb_build_object('c_' || k, 1);
  end loop;
  foreach k in array coalesce(p_repetidos, '{}'::text[]) loop
    if public.num(lg, 'c_' || k) < 1 then
      return jsonb_build_object('ok', false, 'motivo', 'conflicto');
    end if;
  end loop;
  patch := patch || jsonb_build_object(
    'cofre_' || p_tipo, p_n,
    'cofre_monedas', public.num(lg, 'cofre_monedas') + p_monedas);
  update public.perfiles set logros = lg || patch where id = p_id;
  return jsonb_build_object('ok', true, 'logros', patch);
end;
$$;
revoke all on function public.cofres_abrir(uuid, text, integer, text[], text[], integer)
  from public, anon, authenticated;
grant execute on function public.cofres_abrir(uuid, text, integer, text[], text[], integer)
  to service_role;

-- ---------- la BASE de una cuenta que no la tenga ----------
-- Todas las cuentas la tienen desde el día que llegaron los cofres (las de
-- antes, por supabase/cofres-base.js; las nuevas, por el trigger al darse de
-- alta). Esto es solo la red de seguridad de la función: si falta, la pone
-- con lo que la cuenta tenga ahora, y nunca pisa una que ya exista.
create or replace function public.cofres_fijar_base(p_id uuid, p_base jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  lg jsonb;
begin
  select logros into lg from public.perfiles where id = p_id for update;
  if not found then return false; end if;
  if jsonb_typeof(lg) is distinct from 'object' then lg := '{}'::jsonb; end if;
  if public.num(lg, 'cofre_b_dia') > 0 or public.num(p_base, 'cofre_b_dia') <= 0 then
    return false;
  end if;
  update public.perfiles
     set logros = lg || jsonb_build_object(
       'cofre_b_dia', public.num(p_base, 'cofre_b_dia'),
       'cofre_b_partidas', public.num(p_base, 'cofre_b_partidas'),
       'cofre_b_semana', public.num(p_base, 'cofre_b_semana'),
       'cofre_b_nivel', public.num(p_base, 'cofre_b_nivel'),
       'cofre_b_mae', public.num(p_base, 'cofre_b_mae'))
   where id = p_id;
  return true;
end;
$$;
revoke all on function public.cofres_fijar_base(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.cofres_fijar_base(uuid, jsonb) to service_role;

-- ---------- CERRAR una temporada: su top 3 ----------
-- La primera llamada fija el top 3 (las siguientes no cambian nada) y a cada
-- ganador le pone en `cofre_top3` cuántos top 3 lleva: su juego lo ve al
-- sincronizar y la función se lo deja abrir como LEGENDARIO.
create or replace function public.cofres_cerrar(
  p_temporada text, p_ganadores uuid[], p_detalle jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  g     uuid;
  filas integer;
begin
  if p_temporada !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
     or p_temporada >= to_char(now() at time zone 'utc', 'YYYY-MM')
     or coalesce(array_length(p_ganadores, 1), 0) > 3 then
    raise exception 'temporada no valida' using errcode = '22023';
  end if;
  insert into public.cofres_cierres (temporada, ganadores, detalle)
  values (p_temporada, coalesce(p_ganadores, '{}'::uuid[]), p_detalle)
  on conflict (temporada) do nothing;
  get diagnostics filas = row_count;
  if filas = 0 then return false; end if;
  foreach g in array coalesce(p_ganadores, '{}'::uuid[]) loop
    update public.perfiles
       set logros = (case when jsonb_typeof(logros) = 'object' then logros else '{}'::jsonb end)
                    || jsonb_build_object('cofre_top3',
                         (select count(*) from public.cofres_cierres c where g = any(c.ganadores)))
     where id = g;
  end loop;
  return true;
end;
$$;
revoke all on function public.cofres_cerrar(text, uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.cofres_cerrar(text, uuid[], jsonb) to service_role;

-- ---------- las piezas de cofre, al día con el catálogo ----------
-- (las mismas que perfiles-blindaje.sql; un guardián de pruebas-node.js
-- compara esta lista con js/config.js)
insert into public.piezas_especiales (id, tipo, galon, carril) values
  ('efx_fantasmitas', 'cofre', null, null), ('efx_ojos', 'cofre', null, null),
  ('efx_brasas', 'cofre', null, null), ('efx_niebla', 'cofre', null, null),
  ('efx_portales', 'cofre', null, null), ('efx_constelacion', 'cofre', null, null),
  ('acc_luchador', 'cofre', null, null), ('acc_patito', 'cofre', null, null),
  ('acc_alado', 'cofre', null, null), ('acc_ojo', 'cofre', null, null),
  ('acc_aureola', 'cofre', null, null), ('acc_alas', 'cofre', null, null),
  ('plasma', 'cofre', null, null), ('enjambre', 'cofre', null, null),
  ('galaxia', 'cofre', null, null), ('agujero', 'cofre', null, null),
  ('condor', 'cofre', null, null), ('toro', 'cofre', null, null),
  ('unicornio', 'cofre', null, null), ('fenix', 'cofre', null, null),
  ('genio', 'cofre', null, null), ('triton', 'cofre', null, null),
  -- yōkai (29 sep)
  ('efx_onibi', 'cofre', null, null), ('efx_koi', 'cofre', null, null),
  ('acc_kabuto', 'cofre', null, null), ('acc_raijin', 'cofre', null, null),
  ('kitsune', 'cofre', null, null), ('oni', 'cofre', null, null),
  ('maneki', 'cofre', null, null),
  -- objetos y andina (29 sep)
  ('efx_glitch', 'cofre', null, null), ('efx_cinta', 'cofre', null, null),
  ('efx_polvoro', 'cofre', null, null), ('efx_lineas', 'cofre', null, null),
  ('acc_casco', 'cofre', null, null), ('acc_cadena', 'cofre', null, null),
  ('acc_oro', 'cofre', null, null), ('acc_plumas', 'cofre', null, null),
  ('acc_corona', 'cofre', null, null),
  ('discos', 'cofre', null, null), ('tele', 'cofre', null, null),
  ('cabina', 'cofre', null, null), ('tumi', 'cofre', null, null),
  ('inti', 'cofre', null, null), ('nazca', 'cofre', null, null)
on conflict (id) do update
  set tipo = excluded.tipo, galon = excluded.galon, carril = excluded.carril;

-- ============================================================
-- CÓMO MIRAR
--   Lo abierto y lo que ha dado, por cuenta:
--     select usuario, logros->'cofre_madera' m, logros->'cofre_plata' p,
--            logros->'cofre_oro' o, logros->'cofre_legendario' l,
--            logros->'cofre_monedas' monedas
--       from perfiles order by (logros->>'cofre_monedas')::numeric desc nulls last;
--   Los ORO por récord de hoy:  select * from cofres_recordes where dia = current_date;
--   Los top 3:                  select * from cofres_cierres order by temporada;
--   Cada apertura queda además en perfiles_auditoria (quien = service_role).
-- ============================================================
