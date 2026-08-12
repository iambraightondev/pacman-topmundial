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
-- UN INTENTO AL DÍA, Y LO GUARDA ESTA TABLA. Hay un hueco por
-- nombre y día (índice único): la segunda marca del día se rechaza
-- aquí. Antes eso lo decidía el navegador (localStorage), y bastaba
-- con jugar en el PC y otra vez en el móvil para mandar la mejor de
-- las dos.
--
-- Aviso de siempre: las marcas las envía el navegador, así que la
-- PUNTUACIÓN se puede falsear. Endurecerlo pide validar la partida
-- en una Edge Function y dejar el INSERT solo a la service_role.
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

-- ============================================================
-- UN INTENTO AL DÍA
--
-- Un hueco por nombre y día, guardado por la base de datos. Lo que había
-- antes (hasta tres filas del mismo nombre, y la vista enseñando la mejor)
-- dejaba el "un intento" en manos del navegador: se juega en el PC, se
-- juega en el móvil y se manda la mejor de las dos.
--
-- El nombre se compara NORMALIZADO (mayúsculas y sin espacios de sobra),
-- que es como lo agrupa la vista de abajo: ANA y ana son el mismo jugador.
-- ============================================================

-- Antes del índice hay que dejar una sola fila por nombre y día. Se queda
-- LA MEJOR con el mismo criterio que venía usando la vista `reto_top`
-- (más puntos, y a igualdad la más temprana), así que nadie pierde el
-- puesto que ya tenía en la clasificación de su día.
with sobrantes as (
  select id,
         row_number() over (
           partition by fecha, upper(btrim(nombre))
           order by puntos desc, creado_en asc, id asc
         ) as puesto
    from public.reto_diario
)
delete from public.reto_diario r
using sobrantes s
where s.id = r.id and s.puesto > 1;

create unique index if not exists reto_diario_un_intento_idx
  on public.reto_diario (fecha, upper(btrim(nombre)));

comment on index public.reto_diario_un_intento_idx is
  'Un intento al día: un hueco por nombre y día. La segunda marca se rechaza (409).';

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

-- ------------------------------------------------------------
-- Inserción: los nombres CON CUENTA son de su dueño
--
-- Con un solo hueco por día, dejar que cualquiera firme con el nombre de
-- otro tiene una consecuencia nueva y fea: bastaría con mandar una marca de
-- 10 puntos a nombre de un amigo para dejarle sin reto. Así que si el nombre
-- pertenece a una cuenta, la marca tiene que venir de esa cuenta (el juego
-- manda el token de la sesión, ver js/reto.js).
--
-- Los nombres sin cuenta siguen abiertos: son de quien los escriba, como
-- hasta ahora. Quien quiera el suyo a salvo, que se registre.
--
-- La política se monta según haya o no cuentas en el proyecto
-- (supabase/cuentas.sql): sin la tabla `perfiles`, la de siempre.
-- ------------------------------------------------------------
drop policy if exists "reto insercion publica" on public.reto_diario;

do $$
begin
  if to_regclass('public.perfiles') is null then
    execute $pol$
      create policy "reto insercion publica"
        on public.reto_diario for insert
        to anon, authenticated
        with check (true)
    $pol$;
  else
    execute $pol$
      create policy "reto insercion publica"
        on public.reto_diario for insert
        to anon, authenticated
        with check (
          not exists (
            select 1 from public.perfiles p
             where p.usuario = upper(btrim(reto_diario.nombre))
          )
          or exists (
            select 1 from public.perfiles p
             where p.id = auth.uid()
               and p.usuario = upper(btrim(reto_diario.nombre))
          )
        )
    $pol$;
  end if;
end $$;

-- Sin políticas de update/delete: con RLS activo, quedan prohibidos.

-- ============================================================
-- La marca de cada jugador en cada día
--
-- Con el índice único de arriba ya no puede haber dos filas del mismo
-- nombre en el mismo día, así que el `distinct on` no quita nada. Se deja
-- puesto por dos motivos: agrupa por el nombre NORMALIZADO (que es lo que
-- deja `jugador` a mano para consultar el intento de hoy) y mantiene la
-- vista en pie en un proyecto donde el índice todavía no se haya creado.
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
-- El freno viejo se retira
--
-- Limitaba a 3 marcas por nombre y día contando filas en un trigger. El
-- índice único hace lo mismo mejor: una sola marca, sin contar nada y sin
-- carreras entre dos envíos a la vez.
-- ============================================================
drop trigger if exists reto_freno_trg on public.reto_diario;
drop function if exists public.reto_freno();

-- ============================================================
-- Comprobación (opcional): el segundo intento del día tiene que fallar.
-- ============================================================
-- insert into public.reto_diario (fecha, nombre, puntos, nivel)
--   values (current_date, 'PRUEBA', 1000, 1);
-- insert into public.reto_diario (fecha, nombre, puntos, nivel)
--   values (current_date, 'prueba', 9999, 9);   -- 23505: duplicate key
-- delete from public.reto_diario where nombre ilike 'prueba';
