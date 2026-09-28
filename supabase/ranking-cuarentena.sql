-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/ranking-cuarentena.sql
-- CUARENTENA Y PERMISO DE LOS COMPAÑEROS EN EL TOP MUNDIAL (28 sep 2026)
--
-- Va después de ranking.sql, ranking-integridad.sql, temporadas.sql y
-- mundos.sql. Se puede ejecutar tantas veces como haga falta. Va con la
-- versión del 28 sep de la función `enviar-record` (el orden da igual: la
-- función aguanta sin estas columnas, y las columnas no molestan a la
-- función de antes). La vuelta atrás, en supabase/seguridad-vuelta-atras.sql.
--
--   oculta        la marca NO sale en el top ni en el historial. Lo decide
--                 la función sola, nadie aprueba nada (28 sep, noche): una
--                 marca fuera de serie (más de 1,5 veces el primero de su
--                 liga, o un nivel 1 un 20 % más rápido que el mejor) cuya
--                 repetición NO cuadra, o a la que le falta el permiso de un
--                 compañero (con EXIGIR_AVAL). Si alguna vez hiciera falta
--                 sacarla: update ranking set oculta = false where id = '<id>';
--   motivo        por qué (cuarentena, repetición incoherente, permisos)
--   sin_aval      compañeros que no dieron permiso a quien envió la marca
--   repeticion_coherente   lo que antes se llamaba `verificado`: la
--                 repetición que vino cuadra con la marca. NO quiere decir que
--                 se haya rejugado (ver PENDIENTE.md), y por eso cambia el
--                 nombre.
--
-- EL PERMISO DE LOS COMPAÑEROS. Una marca de equipo la envía uno solo (el
-- anfitrión, o quien tiene el teclado en local) con los nombres de todos, y
-- cualquiera podía poner a otro jugador de compañero en una marca inventada.
-- Ahora cuenta como permiso: tener a quien envía en tu lista de amigos, o
-- haber entrado en una party suya en las últimas 12 h (el juego lo apunta
-- solo al empezar la partida como invitado: public.avalar_equipo). La amistad
-- MUTUA no se exige porque hoy no la cumple ni una sola marca de equipo.
-- ============================================================

-- ---------- columnas ----------
alter table public.ranking add column if not exists oculta boolean not null default false;
alter table public.ranking add column if not exists motivo text;
alter table public.ranking add column if not exists sin_aval text[];

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'ranking'
                and column_name = 'verificado')
     and not exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'ranking'
                and column_name = 'repeticion_coherente') then
    alter table public.ranking rename column verificado to repeticion_coherente;
  end if;
end $$;

comment on column public.ranking.repeticion_coherente is
  'La repetición que vino cuadra con la marca (comprobación estructural, NO rejugada).';
comment on column public.ranking.oculta is
  'Marca en cuarentena o sin permiso de un compañero: no se ve hasta aprobarla a mano.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ranking_motivo_chk') then
    alter table public.ranking add constraint ranking_motivo_chk
      check (motivo is null or char_length(motivo) <= 500);
  end if;
end $$;

-- ---------- lo oculto no se lee ----------
-- Las vistas (ranking_top, ranking_temporada, ranking_tiempo) son
-- security_invoker, así que heredan esto solas. La service role (la función)
-- no pasa por aquí y ve todo.
drop policy if exists "ranking lectura publica" on public.ranking;
create policy "ranking lectura publica"
  on public.ranking for select
  to anon, authenticated
  using (not oculta);

-- el primero de cada liga, sin recorrer la tabla
create index if not exists ranking_liga_idx
  on public.ranking (mundo, jugadores, puntos desc) where not oculta;

-- de paso: truncar, referenciar o poner triggers no lo pide nadie desde fuera
revoke truncate, references, trigger on public.ranking from anon, authenticated;

-- ---------- el permiso de los compañeros ----------
create table if not exists public.avales_equipo (
  de         uuid        not null references auth.users(id) on delete cascade,
  anfitrion  text        not null check (anfitrion ~ '^[A-Z0-9]{1,12}$'),
  creado_en  timestamptz not null default now(),
  primary key (de, anfitrion)
);

comment on table public.avales_equipo is
  'Permiso de un jugador para salir en las marcas de equipo que envíe `anfitrion` (12 h).';

alter table public.avales_equipo enable row level security;
revoke all on public.avales_equipo from anon, authenticated;

-- Lo llama el juego al empezar una partida de party como invitado
create or replace function public.avalar_equipo(p_anfitrion text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  yo uuid := auth.uid();
  n text := left(upper(regexp_replace(coalesce(p_anfitrion, ''), '[^A-Za-z0-9]', '', 'g')), 12);
begin
  if yo is null then
    raise exception 'necesitas una cuenta';
  end if;
  if n = '' then
    return;
  end if;
  insert into public.avales_equipo (de, anfitrion, creado_en) values (yo, n, now())
  on conflict (de, anfitrion) do update set creado_en = now();
  -- lo que ya no vale no se guarda
  delete from public.avales_equipo where creado_en < now() - interval '2 days';
end;
$$;

revoke all on function public.avalar_equipo(text) from public, anon;
grant execute on function public.avalar_equipo(text) to authenticated;

-- Los compañeros (sus id) que NO han dado permiso a `p_emisor`, por nombre.
-- Solo la usa la función enviar-record (service role).
create or replace function public.equipo_sin_aval(p_emisor uuid, p_companeros uuid[])
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(p.usuario order by p.usuario), '{}'::text[])
    from public.perfiles p
   where p.id = any(p_companeros)
     and p.id <> p_emisor
     and not exists (
       select 1 from public.avales_equipo a, public.perfiles e
        where e.id = p_emisor and a.de = p.id and a.anfitrion = e.usuario
          and a.creado_en > now() - interval '12 hours')
     and not exists (
       select 1 from public.amigos f, public.perfiles e
        where e.id = p_emisor and f.de = p.id and f.amigo = e.usuario)
$$;

revoke all on function public.equipo_sin_aval(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.equipo_sin_aval(uuid, uuid[]) to service_role;

-- ============================================================
-- CÓMO MIRAR
--   Lo que está esperando:
--     select id, creado_en, mundo, jugadores, nombre1, nombre2, puntos, nivel, motivo
--       from ranking where oculta order by creado_en desc;
--   Aprobar:   update ranking set oculta = false where id = '<id>';
--   Marcas de equipo con compañeros que no dieron permiso:
--     select creado_en, nombre1, nombre2, nombre3, nombre4, puntos, sin_aval
--       from ranking where sin_aval is not null order by creado_en desc;
-- ============================================================
