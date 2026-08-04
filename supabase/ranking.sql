-- ============================================================
-- PAC-MAN TOP MUNDIAL — tabla del ranking mundial
--
-- Pégalo en el proyecto de Supabase del juego:
--   Dashboard -> SQL Editor -> New query -> Run
--
-- Crea la tabla `ranking` con lectura e inserción públicas
-- (clave anónima) y sin permiso para modificar ni borrar.
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
  nombre2     text        not null check (char_length(nombre2) between 1 and 8),
  puntos      integer     not null check (puntos > 0 and puntos <= 10000000),
  nivel       integer     not null check (nivel between 1 and 999)
);

comment on table public.ranking is
  'Partidas de dos jugadores de Pac-Man Top Mundial (puntuación de equipo).';

-- Orden habitual de consulta: mejores puntuaciones primero
create index if not exists ranking_puntos_idx
  on public.ranking (puntos desc, creado_en asc);

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
