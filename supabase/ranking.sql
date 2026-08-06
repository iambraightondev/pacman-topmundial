-- ============================================================
-- PAC-MAN TOP MUNDIAL — tabla del ranking mundial
--
-- Pégalo en el proyecto de Supabase del juego:
--   Dashboard -> SQL Editor -> New query -> Run
--
-- Crea (o pone al día) la tabla `ranking` con lectura e inserción
-- públicas (clave anónima) y sin permiso para modificar ni borrar.
-- Se puede ejecutar tantas veces como haga falta.
--
-- Hay cuatro clasificaciones, separadas por la columna `jugadores`:
--   1 = individual   (solo nombre1)
--   2 = dúo          (nombre1 y nombre2)
--   3 = trío         (hasta nombre3)
--   4 = escuadra     (los cuatro)
-- Los nombres que sobran van a NULL. Solo entran partidas con nombre de
-- verdad en TODOS los que jugaron: sin nombre no hay récord.
--
-- Aviso: las puntuaciones las envía el navegador, así que se
-- pueden falsear. Para el uso normal del juego se asume; si algún
-- día molesta, la vía es validar la partida en una Edge Function
-- y dejar el INSERT solo a la service_role.
-- ============================================================

create table if not exists public.ranking (
  id          uuid primary key default gen_random_uuid(),
  creado_en   timestamptz not null default now(),
  modo        text        not null check (modo in ('online', 'local')),
  nombre1     text        not null check (char_length(nombre1) between 1 and 12),
  nombre2     text,
  puntos      integer     not null check (puntos > 0 and puntos <= 10000000),
  nivel       integer     not null check (nivel between 1 and 999)
);

-- --- puesta al día de tablas creadas con la versión anterior ---
alter table public.ranking add column if not exists jugadores integer;
update public.ranking set jugadores = 2 where jugadores is null;
alter table public.ranking alter column jugadores set default 2;
alter table public.ranking alter column jugadores set not null;
alter table public.ranking alter column nombre2 drop not null;

-- --- trío y escuadra: dos nombres más ---
-- Antes solo entraban las partidas de 1 y 2, así que la tabla se quedó con
-- nombre1 y nombre2 y con el CHECK que lo exigía. Las partidas de 3 y 4
-- existían en el juego pero no salían del navegador de cada uno.
alter table public.ranking add column if not exists nombre3 text;
alter table public.ranking add column if not exists nombre4 text;

do $$
begin
  -- el CHECK viejo solo dejaba pasar 1 y 2: fuera y se pone el nuevo
  if exists (
    select 1 from pg_constraint
     where conname = 'ranking_jugadores_chk'
       and pg_get_constraintdef(oid) not like '%4%'
  ) then
    alter table public.ranking drop constraint ranking_jugadores_chk;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'ranking_jugadores_chk'
  ) then
    alter table public.ranking
      add constraint ranking_jugadores_chk check (jugadores in (1, 2, 3, 4));
  end if;

  /* Los nombres que hacen falta, y ni uno más: cada partida trae tantos
   * nombres como jugadores tuvo. El CHECK viejo (que ataba nombre2 a
   * jugadores = 2) se sustituye por este, que vale para los cuatro. */
  if exists (
    select 1 from pg_constraint where conname = 'ranking_nombre2_chk'
  ) then
    alter table public.ranking drop constraint ranking_nombre2_chk;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'ranking_nombres_chk'
  ) then
    alter table public.ranking add constraint ranking_nombres_chk check (
      (jugadores >= 2) = (nombre2 is not null) and
      (jugadores >= 3) = (nombre3 is not null) and
      (jugadores >= 4) = (nombre4 is not null) and
      (nombre2 is null or char_length(nombre2) between 1 and 12) and
      (nombre3 is null or char_length(nombre3) between 1 and 12) and
      (nombre4 is null or char_length(nombre4) between 1 and 12)
    );
  end if;
end $$;

-- --- puesta al día: los nombres pasaron de 8 a 12 letras ---
-- La tabla ya creada conserva los CHECK viejos y "create table if not
-- exists" no los toca. Se localizan por el texto de la condición y se
-- vuelven a poner con el límite nuevo.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.ranking'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%nombre%'
       and pg_get_constraintdef(oid) like '%8)%'
  loop
    execute format('alter table public.ranking drop constraint %I', c);
  end loop;
  if not exists (
    select 1 from pg_constraint where conname = 'ranking_nombre1_chk'
  ) then
    alter table public.ranking add constraint ranking_nombre1_chk
      check (char_length(nombre1) between 1 and 12);
  end if;
end $$;

-- --- récord de velocidad del primer nivel ---
-- Centésimas de segundo en despejar el NIVEL 1. Va a null en las partidas
-- que no cuentan para esa clasificación (dúo, online o con los ajustes
-- cambiados): así el mismo INSERT sirve para todo.
alter table public.ranking add column if not exists tiempo1 integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ranking_tiempo1_chk'
  ) then
    alter table public.ranking add constraint ranking_tiempo1_chk check (
      tiempo1 is null or (tiempo1 > 0 and tiempo1 <= 6000000)
    );
  end if;
end $$;

comment on column public.ranking.tiempo1 is
  'Centésimas de segundo en completar el nivel 1 (solo individual); null si no cuenta.';

comment on table public.ranking is
  'Partidas de Pac-Man Top Mundial: jugadores=1 individual, 2 dúo, 3 trío, 4 escuadra.';

-- Fuera los registros sin nombre real (los que entraron como J1..J4)
delete from public.ranking
where btrim(coalesce(nombre1, '')) = ''
   or upper(btrim(nombre1)) in ('J1', 'J2', 'J3', 'J4')
   or (jugadores >= 2 and (btrim(coalesce(nombre2, '')) = ''
                           or upper(btrim(nombre2)) in ('J1', 'J2', 'J3', 'J4')))
   or (jugadores >= 3 and (btrim(coalesce(nombre3, '')) = ''
                           or upper(btrim(nombre3)) in ('J1', 'J2', 'J3', 'J4')))
   or (jugadores >= 4 and (btrim(coalesce(nombre4, '')) = ''
                           or upper(btrim(nombre4)) in ('J1', 'J2', 'J3', 'J4')));

-- Orden habitual de consulta: por clasificación y mejores puntuaciones
create index if not exists ranking_top_idx
  on public.ranking (jugadores, puntos desc, creado_en asc);

alter table public.ranking enable row level security;

-- Permisos de tabla: sin esto, PostgREST responde 401 aunque las políticas
-- de RLS permitan la operación (RLS filtra filas, el GRANT abre la puerta).
grant select, insert on public.ranking to anon, authenticated;

drop policy if exists "ranking lectura publica" on public.ranking;
create policy "ranking lectura publica"
  on public.ranking for select
  to anon, authenticated
  using (true);

drop policy if exists "ranking insercion publica" on public.ranking;
create policy "ranking insercion publica"
  on public.ranking for insert
  to anon, authenticated
  with check (true);

-- Sin políticas de update/delete: con RLS activo, quedan prohibidos.

-- ============================================================
-- Mejor marca de cada jugador o equipo
-- Sin esto, quien más juega ocupa toda la tabla con sus repeticiones.
-- `equipo` normaliza los nombres para agrupar (mayúsculas y sin espacios).
-- Con trío y escuadra son los que haya: el mismo equipo con la misma gente
-- se agrupa igual, y basta con que cambie uno para que sea otro equipo.
-- ============================================================
create or replace view public.ranking_top as
select distinct on (jugadores, equipo)
       jugadores, equipo, nombre1, nombre2, puntos, nivel, modo, creado_en,
       -- los dos nombres nuevos van AL FINAL a propósito: create or replace
       -- view solo deja añadir columnas por el final, y si se colocan en
       -- medio, volver a lanzar este archivo falla con un 42P16
       nombre3, nombre4
from (
  select r.*,
         upper(btrim(r.nombre1)) ||
           coalesce(' + ' || upper(btrim(r.nombre2)), '') ||
           coalesce(' + ' || upper(btrim(r.nombre3)), '') ||
           coalesce(' + ' || upper(btrim(r.nombre4)), '') as equipo
  from public.ranking r
) t
order by jugadores, equipo, puntos desc, creado_en asc;

-- la vista respeta las políticas de quien consulta, no las del creador
alter view public.ranking_top set (security_invoker = on);
grant select on public.ranking_top to anon, authenticated;

-- ============================================================
-- Los más rápidos en despejar el NIVEL 1 (solo individual)
-- Igual que arriba, pero quedándose con el MENOR tiempo de cada jugador.
-- ============================================================
create index if not exists ranking_tiempo_idx
  on public.ranking (tiempo1 asc)
  where tiempo1 is not null;

create or replace view public.ranking_tiempo as
select distinct on (equipo)
       equipo, nombre1, tiempo1, puntos, creado_en
from (
  select r.*, upper(btrim(r.nombre1)) as equipo
  from public.ranking r
  where r.jugadores = 1 and r.tiempo1 is not null
) t
order by equipo, tiempo1 asc, creado_en asc;

alter view public.ranking_tiempo set (security_invoker = on);
grant select on public.ranking_tiempo to anon, authenticated;

-- ============================================================
-- Freno de envíos: como cualquiera puede insertar con la clave anónima,
-- se limita a 5 partidas por nombre y minuto. No es anti-trampas (para eso
-- haría falta validar la partida en una Edge Function), pero corta el spam.
-- ============================================================
create or replace function public.ranking_freno()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.ranking
      where upper(btrim(nombre1)) = upper(btrim(new.nombre1))
        and creado_en > now() - interval '1 minute') >= 5 then
    raise exception 'demasiados envios seguidos para ese nombre';
  end if;
  return new;
end;
$$;

drop trigger if exists ranking_freno_trg on public.ranking;
create trigger ranking_freno_trg
  before insert on public.ranking
  for each row execute function public.ranking_freno();
