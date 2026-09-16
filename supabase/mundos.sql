-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/mundos.sql
-- Un top mundial por MUNDO: el clásico, DESATADO y LABERINTOS.
--
-- Hasta el 16 de septiembre de 2026 solo el laberinto de 1980 entraba en la
-- tabla: morder fantasmas con la Q regala puntos que el arcade no tiene, y
-- otro laberinto tiene otras pastillas, así que ponerlos al lado no decía
-- nada. La solución no era dejarlos fuera sino darles SU tabla, igual que
-- cada formato (solo, dúo, trío y escuadra) ya tenía la suya.
--
-- `mundo` es lo mismo que Game.recordSlot() en el juego: 'clasico' (null en
-- el juego), 'hab' (DESATADO) o 'lab' (LABERINTOS). Lo que ya había es todo
-- del clásico, que es lo que dice el valor por defecto.
--
-- Orden de despliegue: este SQL, luego la función `enviar-record` y por
-- último el juego. Un juego viejo sigue mandando partidas sin mundo, que
-- caen en el clásico, que es justo lo que eran.
-- ============================================================

alter table public.ranking
  add column if not exists mundo text not null default 'clasico';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ranking_mundo_chk') then
    alter table public.ranking
      add constraint ranking_mundo_chk check (mundo in ('clasico', 'hab', 'lab'));
  end if;
end $$;

create index if not exists ranking_mundo_idx
  on public.ranking (mundo, jugadores, puntos desc);

-- La mejor marca de cada jugador o equipo, ahora por mundo. `mundo` va AL
-- FINAL: create or replace view solo deja añadir columnas por el final.
create or replace view public.ranking_top as
select distinct on (mundo, jugadores, equipo)
       jugadores, equipo, nombre1, nombre2, puntos, nivel, modo, creado_en,
       nombre3, nombre4, mundo
from (
  select r.*,
         upper(btrim(r.nombre1)) ||
           coalesce(' + ' || upper(btrim(r.nombre2)), '') ||
           coalesce(' + ' || upper(btrim(r.nombre3)), '') ||
           coalesce(' + ' || upper(btrim(r.nombre4)), '') as equipo
  from public.ranking r
) t
order by mundo, jugadores, equipo, puntos desc, creado_en asc;

alter view public.ranking_top set (security_invoker = on);
grant select on public.ranking_top to anon, authenticated;

create or replace view public.ranking_temporada as
select distinct on (temporada, mundo, jugadores, equipo)
       temporada, jugadores, equipo, nombre1, nombre2, puntos, nivel, modo,
       creado_en, nombre3, nombre4, mundo
from (
  select r.*,
         upper(btrim(r.nombre1)) ||
           coalesce(' + ' || upper(btrim(r.nombre2)), '') ||
           coalesce(' + ' || upper(btrim(r.nombre3)), '') ||
           coalesce(' + ' || upper(btrim(r.nombre4)), '') as equipo
  from public.ranking r
) t
order by temporada, mundo, jugadores, equipo, puntos desc, creado_en asc;

alter view public.ranking_temporada set (security_invoker = on);
grant select on public.ranking_temporada to anon, authenticated;

-- El tiempo del nivel 1 es del laberinto de siempre y sin poderes: ahí no
-- cambia nada, pero se dice para que una fila de otro mundo no se cuele.
create or replace view public.ranking_tiempo as
select distinct on (equipo)
       equipo, nombre1, tiempo1, puntos, creado_en
from (
  select r.id, r.creado_en, r.modo, r.nombre1, r.nombre2, r.puntos, r.nivel,
         r.jugadores, r.tiempo1, upper(btrim(r.nombre1)) as equipo
  from public.ranking r
  where r.jugadores = 1 and r.tiempo1 is not null and r.mundo = 'clasico'
) t
order by equipo, tiempo1 asc, creado_en asc;

alter view public.ranking_tiempo set (security_invoker = on);
grant select on public.ranking_tiempo to anon, authenticated;
