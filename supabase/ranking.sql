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
-- Hay dos clasificaciones, separadas por la columna `jugadores`:
--   1 = individual   (nombre2 va a NULL)
--   2 = dúo          (los dos nombres)
-- Solo entran partidas con nombre de verdad: sin nombre no hay récord.
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
  nombre1     text        not null check (char_length(nombre1) between 1 and 8),
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

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ranking_jugadores_chk'
  ) then
    alter table public.ranking
      add constraint ranking_jugadores_chk check (jugadores in (1, 2));
  end if;
  -- en individual no hay segundo nombre; en dúo es obligatorio
  if not exists (
    select 1 from pg_constraint where conname = 'ranking_nombre2_chk'
  ) then
    alter table public.ranking add constraint ranking_nombre2_chk check (
      (jugadores = 1 and nombre2 is null) or
      (jugadores = 2 and nombre2 is not null and
       char_length(nombre2) between 1 and 8)
    );
  end if;
end $$;

comment on table public.ranking is
  'Partidas de Pac-Man Top Mundial: jugadores=1 individual, jugadores=2 dúo.';

-- Fuera los registros sin nombre real (los que entraron como J1/J2)
delete from public.ranking
where btrim(coalesce(nombre1, '')) = ''
   or upper(btrim(nombre1)) in ('J1', 'J2')
   or (jugadores = 2 and (btrim(coalesce(nombre2, '')) = ''
                          or upper(btrim(nombre2)) in ('J1', 'J2')));

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
