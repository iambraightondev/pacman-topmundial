-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/perfiles-subidas.sql
-- CADA SUBIDA SE SUMA UNA SOLA VEZ (29 sep 2026)
--
-- Va DESPUÉS de supabase/perfiles-blindaje.sql. No toca perfiles_touch():
-- añade un trigger APARTE que corre antes que él (los BEFORE de una tabla
-- van por orden alfabético: perfiles_sube_trg < perfiles_touch_trg). Así
-- una vuelta atrás de otro cambio que rehaga perfiles_touch() no se lleva
-- esto por delante. Se puede ejecutar tantas veces como haga falta.
-- La vuelta atrás está en supabase/perfiles-subidas-vuelta-atras.sql.
--
-- EL AGUJERO. Lo jugado en un aparato sube como "pendiente = lo de aquí −
-- la base ya subida" (js/account.js, BASE_KEY) y la nube lo SUMA. El juego
-- leía la nube, le sumaba lo pendiente y subía el total; el trigger se
-- queda con el mayor. Dos maneras de sumarlo DOS veces:
--   1) dos pestañas del juego con la misma cuenta comparten el almacén:
--      las dos ven el mismo pendiente y lo pueden subir a la vez;
--   2) se cierra la pestaña justo cuando la subida ya llegó al servidor
--      pero antes de apuntar la base nueva: al volver, se sube otra vez.
-- Afecta a todo lo que suma: experiencia, monedas, partidas, pase...
--
-- LO QUE SE HACE. El juego nuevo manda, además de su fila, lo pendiente
-- aparte y con NOMBRE en la columna `sube`:
--     { "ap": <id del aparato>, "n": <número de subida>, "xp": 120,
--       "c": { "monedas": 40, "partidas": 1, ... } }
-- y ya no lo suma él: lo suma este trigger, y SOLO si ese número de ese
-- aparato no se ha visto (perfiles_subidas guarda el último de cada
-- aparato de cada cuenta). Un aparato sube de uno en uno y no pasa al
-- siguiente número hasta que el anterior se confirma, así que "visto" es
-- "n <= el último apuntado". Si la respuesta se pierde, el juego repite la
-- MISMA subida (mismo aparato, mismo n) al volver: si ya había llegado, aquí
-- se ignora y el juego solo apunta su base.
--
-- LO QUE SE SUMA es "lo de la nube ahora + lo pendiente" (el mayor con lo
-- que traiga la fila, como siempre). Pasa DESPUÉS por perfiles_touch, con
-- su blindaje entero: cupo de horas, claves que el juego no escribe,
-- purga... Una limpieza (purga más nueva en la nube) sigue tirando los
-- contadores de un aparato atrasado, también los que vengan aquí.
--
-- COMPATIBLE. El juego ya publicado no manda `sube`: la columna llega vacía
-- y todo va como hasta hoy (él suma, el trigger se queda con el mayor).
-- `sube` nunca se guarda: siempre queda en null.
-- ============================================================

-- ---------- lo último subido por cada aparato de cada cuenta ----------
create table if not exists public.perfiles_subidas (
  perfil   uuid        not null references public.perfiles(id) on delete cascade,
  aparato  text        not null,
  n        bigint      not null,
  en       timestamptz not null default now(),
  primary key (perfil, aparato)
);

comment on table public.perfiles_subidas is
  'Última subida sumada de cada aparato de cada cuenta (ver perfiles-subidas.sql).';

alter table public.perfiles_subidas enable row level security;
revoke all on public.perfiles_subidas from anon, authenticated;

-- ---------- la columna por la que llega (siempre vacía en la tabla) ----------
alter table public.perfiles add column if not exists sube jsonb;

comment on column public.perfiles.sube is
  'Lo pendiente de una subida del juego, con su aparato y número. La consume perfiles_sube(); nunca se guarda.';

-- ---------- el trigger ----------
create or replace function public.perfiles_sube()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s      jsonb := new.sube;
  ap     text;
  n      bigint;
  filas  integer;
  lg     jsonb;
  k      text;
  v      jsonb;
  d      numeric;
begin
  if tg_op = 'INSERT' then
    /* El upsert del juego sobre una fila que YA existe pasa primero por
     * aquí: se deja `sube` tal cual para que llegue a la rama UPDATE (lo que
     * cambia un BEFORE INSERT es lo que ve el `excluded` del ON CONFLICT).
     * Un alta de verdad no lo guarda. */
    if s is not null and not exists (select 1 from public.perfiles p where p.id = new.id) then
      new.sube := null;
    end if;
    return new;
  end if;

  new.sube := null;
  if s is null or jsonb_typeof(s) <> 'object' then
    return new;
  end if;

  ap := s ->> 'ap';
  if ap is null or ap !~ '^[A-Za-z0-9_-]{4,64}$' or jsonb_typeof(s -> 'n') <> 'number' then
    return new;
  end if;
  n := floor((s ->> 'n')::numeric);
  if n < 1 then
    return new;
  end if;

  -- ¿ya se sumó esta? (mismo aparato, número igual o anterior)
  insert into public.perfiles_subidas as t (perfil, aparato, n)
  values (new.id, ap, n)
  on conflict (perfil, aparato) do update
    set n = excluded.n, en = now()
    where t.n < excluded.n;
  get diagnostics filas = row_count;
  if filas = 0 then
    return new;
  end if;

  -- la experiencia
  if jsonb_typeof(s -> 'xp') = 'number' and (s ->> 'xp')::numeric > 0 then
    new.xp := greatest(coalesce(new.xp, 0), coalesce(old.xp, 0) + floor((s ->> 'xp')::numeric));
  end if;

  -- los contadores que suman (el juego solo manda esos)
  if jsonb_typeof(s -> 'c') = 'object' and jsonb_typeof(new.logros) = 'object' then
    lg := new.logros;
    for k, v in select e.key, e.value from jsonb_each(s -> 'c') e loop
      if jsonb_typeof(v) <> 'number' then continue; end if;
      d := floor(v::text::numeric);
      if d <= 0 or k = 'purga' or k ~ 'mejorT1$' or char_length(k) > 64 then continue; end if;
      if (lg ? k) and jsonb_typeof(lg -> k) <> 'number' then continue; end if;
      lg := jsonb_set(lg, array[k],
              to_jsonb(greatest(public.num(lg, k), public.num(old.logros, k) + d)));
    end loop;
    new.logros := lg;
  end if;

  -- como mucho 50 aparatos apuntados por cuenta (los más viejos se olvidan)
  delete from public.perfiles_subidas t
   where t.perfil = new.id
     and t.aparato in (select x.aparato from public.perfiles_subidas x
                        where x.perfil = new.id order by x.en desc offset 50);

  return new;
end;
$$;

drop trigger if exists perfiles_sube_trg on public.perfiles;
create trigger perfiles_sube_trg
  before insert or update on public.perfiles
  for each row execute function public.perfiles_sube();

-- que la API vea la columna nueva sin esperar
notify pgrst, 'reload schema';

-- ============================================================
-- CÓMO MIRARLO
--   select p.usuario, s.aparato, s.n, s.en
--     from perfiles_subidas s join perfiles p on p.id = s.perfil
--    order by s.en desc limit 20;
-- ============================================================
