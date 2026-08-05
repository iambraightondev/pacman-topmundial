-- ============================================================
-- PAC-MAN TOP MUNDIAL — temporadas del top mundial
--
-- Pégalo en el proyecto de Supabase del juego:
--   Dashboard -> SQL Editor -> New query -> Run
--   (después de supabase/ranking.sql, que es quien crea la tabla)
--
-- Una temporada es un MES NATURAL y se calcula de la fecha de la
-- partida: no hay nada que abrir ni cerrar a mano, el día 1 de cada
-- mes empieza sola.
--
-- NO SE PIERDE NADA. La temporada es una columna CALCULADA de
-- `creado_en`, así que las partidas que ya estaban entran solas en
-- el mes que les tocaba, y la vista `ranking_top` de siempre —el
-- HISTÓRICO— se queda exactamente como está. Esto no borra ni
-- modifica ninguna fila.
--
-- Se puede ejecutar tantas veces como haga falta.
-- ============================================================

-- El mes se saca en UTC a propósito, igual que en el navegador
-- (js/temporadas.js): si cada uno lo calculara en su huso, a fin de mes
-- unos pedirían una temporada y otros otra.
--
-- Y se arma con extract + lpad, no con to_char: to_char es STABLE (mira la
-- configuración de fecha de la sesión) y una columna generada exige una
-- expresión IMMUTABLE. Con to_char, Postgres responde
-- «42P17: generation expression is not immutable» y no crea la columna.
alter table public.ranking
  add column if not exists temporada text
  generated always as (
    lpad(extract(year from (creado_en at time zone 'UTC'))::int::text, 4, '0')
    || '-' ||
    lpad(extract(month from (creado_en at time zone 'UTC'))::int::text, 2, '0')
  ) stored;

comment on column public.ranking.temporada is
  'Mes natural de la partida (AAAA-MM, en UTC). Calculada: no se escribe nunca a mano.';

-- Orden habitual de consulta: una temporada, una clasificación, mejores puntos
create index if not exists ranking_temporada_idx
  on public.ranking (temporada, jugadores, puntos desc, creado_en asc);

-- ============================================================
-- Mejor marca de cada jugador/dúo DENTRO de cada temporada
-- Es la misma idea que `ranking_top`, pero agrupando también por mes: en
-- el histórico cuenta tu mejor partida de siempre y en la temporada, la
-- mejor de este mes. Las columnas son las mismas para que el panel del
-- juego pinte las dos listas con el mismo código.
-- ============================================================
create or replace view public.ranking_temporada as
select distinct on (temporada, jugadores, equipo)
       temporada, jugadores, equipo, nombre1, nombre2, puntos, nivel, modo, creado_en
from (
  select r.*,
         upper(btrim(r.nombre1)) ||
           coalesce(' + ' || upper(btrim(r.nombre2)), '') as equipo
  from public.ranking r
) t
order by temporada, jugadores, equipo, puntos desc, creado_en asc;

-- la vista respeta las políticas de quien consulta, no las del creador
alter view public.ranking_temporada set (security_invoker = on);
grant select on public.ranking_temporada to anon, authenticated;
