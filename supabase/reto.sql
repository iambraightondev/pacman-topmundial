-- ============================================================
-- PAC-MAN TOP MUNDIAL — clasificación del RETO DIARIO
--
-- Pégalo en el proyecto de Supabase del juego:
--   Dashboard -> SQL Editor -> New query -> Run
--
-- Tabla nueva, aparte del ranking de siempre: el reto es una
-- partida distinta (misma semilla para todo el mundo, ajustes
-- fijos, un intento al día) y mezclarla con `ranking` habría
-- obligado a filtrar en todas las consultas de siempre.
--
-- Lectura e inserción públicas (clave anónima), sin modificar ni
-- borrar. Se puede ejecutar tantas veces como haga falta.
--
-- Aviso de siempre: las marcas las envía el navegador, así que se
-- pueden falsear. Endurecerlo pide validar la partida en una Edge
-- Function y dejar el INSERT solo a la service_role.
-- ============================================================

create table if not exists public.reto_diario (
  id          uuid primary key default gen_random_uuid(),
  creado_en   timestamptz not null default now(),
  -- día del reto en UTC, tal cual lo calcula el juego (js/reto.js)
  fecha       date        not null,
  nombre      text        not null check (char_length(nombre) between 1 and 12),
  puntos      integer     not null check (puntos > 0 and puntos <= 10000000),
  nivel       integer     not null check (nivel between 1 and 999)
);

comment on table public.reto_diario is
  'Marcas del reto diario: una partida idéntica para todos cada día (fecha en UTC).';
comment on column public.reto_diario.fecha is
  'Día del reto en UTC (AAAA-MM-DD); es también la semilla del azar de esa partida.';

-- Fuera los registros sin nombre real (los que entraran como J1/J2)
delete from public.reto_diario
where btrim(coalesce(nombre, '')) = ''
   or upper(btrim(nombre)) in ('J1', 'J2');

-- Orden habitual de consulta: el día de hoy, de más a menos puntos
create index if not exists reto_diario_top_idx
  on public.reto_diario (fecha, puntos desc, creado_en asc);

alter table public.reto_diario enable row level security;

-- Permisos de tabla: sin esto PostgREST responde 401 aunque las políticas
-- de RLS permitan la operación (RLS filtra filas, el GRANT abre la puerta).
-- Es el fallo que ya nos pasó una vez con `ranking`.
grant select, insert on public.reto_diario to anon, authenticated;

drop policy if exists "reto lectura publica" on public.reto_diario;
create policy "reto lectura publica"
  on public.reto_diario for select
  to anon, authenticated
  using (true);

drop policy if exists "reto insercion publica" on public.reto_diario;
create policy "reto insercion publica"
  on public.reto_diario for insert
  to anon, authenticated
  with check (true);

-- Sin políticas de update/delete: con RLS activo, quedan prohibidos.

-- ============================================================
-- Mejor marca de cada jugador en cada día
-- El juego solo deja un intento, pero eso lo decide el navegador: aquí se
-- da por hecho que puede llegar más de una fila del mismo nombre y se
-- enseña la mejor, que es lo justo si alguien reinstala o cambia de
-- aparato a media partida.
-- ============================================================
create or replace view public.reto_top as
select distinct on (fecha, jugador)
       fecha, jugador, nombre, puntos, nivel, creado_en
from (
  select r.*, upper(btrim(r.nombre)) as jugador
  from public.reto_diario r
) t
order by fecha, jugador, puntos desc, creado_en asc;

-- la vista respeta las políticas de quien consulta, no las del creador
alter view public.reto_top set (security_invoker = on);
grant select on public.reto_top to anon, authenticated;

-- ============================================================
-- Freno de envíos: como cualquiera puede insertar con la clave anónima,
-- se limita a 3 marcas por nombre y día. No es anti-trampas (para eso
-- haría falta una Edge Function), pero corta el spam y encaja con la
-- regla del juego, que es un intento al día.
-- ============================================================
create or replace function public.reto_freno()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.reto_diario
      where upper(btrim(nombre)) = upper(btrim(new.nombre))
        and fecha = new.fecha) >= 3 then
    raise exception 'ya hay marcas de sobra para ese nombre en ese dia';
  end if;
  return new;
end;
$$;

drop trigger if exists reto_freno_trg on public.reto_diario;
create trigger reto_freno_trg
  before insert on public.reto_diario
  for each row execute function public.reto_freno();
