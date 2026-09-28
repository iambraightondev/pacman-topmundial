-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/repeticiones-freno.sql
-- LAS REPETICIONES, CON LLAVE EN LO QUE NO ES DEL JUEGO (28 sep 2026)
--
-- Va después de repeticiones.sql, repeticiones-todas.sql y
-- repeticiones-destacadas.sql. Se puede ejecutar tantas veces como haga
-- falta. La vuelta atrás, en supabase/seguridad-vuelta-atras.sql.
--
-- EL AGUJERO. El insert estaba abierto a TODAS las columnas. El juego solo
-- manda los datos de la partida, pero desde fuera se podía:
--   · poner `creado_en` en el futuro. El freno contaba "las del último
--     minuto" por esa columna, así que 20 filas fechadas en 2099 dejaban el
--     freno cerrado PARA TODO EL MUNDO, para siempre (y además no caducaban:
--     la limpieza de los 7 días mira la misma fecha);
--   · subirla ya `destacada` (no caduca nunca) y con `titulo`;
--   · y llenar la base: el freno era uno solo para todos, 20 por minuto, que
--     a la vez era poco para un ataque y bastaba para molestar a los demás.
--
-- LO QUE SE HACE
--   1) Permiso de insert SOLO en las columnas que manda el juego (id,
--      jugadores, puntos, nivel, nombres, datos, tipo, t_partida).
--   2) Un trigger que, venga lo que venga, pone creado_en = now(),
--      destacada = false, titulo = null y dueno = la cuenta del token (null
--      si se sube sin cuenta, como hasta ahora).
--   3) El freno por CUENTA y por IP, y el global solo de red de seguridad:
--        por cuenta o por IP   20 por minuto · 400 y 200 MB al día
--        todos juntos          120 por minuto
--      Lo más que se ha visto de verdad: 5 por minuto de una cuenta (y 10 sin
--      cuenta, al subir de golpe las que había guardadas), 133 al día y 4,4 MB
--      al día de una misma cuenta.
--      La IP la pone Cloudflare (cf-connecting-ip) y se guarda RESUMIDA
--      (md5), no tal cual, en una tabla que no se puede leer desde fuera.
--   4) Destacadas: 50 por cuenta como mucho (hoy hay 2 en total).
--   5) Fuera las filas con fecha futura, si alguien llegó a meter alguna
--      (el 28 sep no había ninguna).
-- ============================================================

-- ---------- 1) permisos de columna ----------
revoke insert on public.repeticiones from anon, authenticated;
grant insert (id, jugadores, puntos, nivel, nombres, datos, tipo, t_partida)
  on public.repeticiones to anon, authenticated;
-- de paso: truncar, referenciar o poner triggers no lo pide nadie desde fuera
revoke truncate, references, trigger on public.repeticiones from anon, authenticated;

-- ---------- 3) el registro del freno ----------
create table if not exists public.repeticiones_frenos (
  en     timestamptz not null default now(),
  dueno  uuid,
  ip     text,              -- md5 de la IP, no la IP
  tam    integer not null default 0
);

comment on table public.repeticiones_frenos is
  'Subidas de repeticiones recientes, por cuenta y por IP resumida, para el freno. Se vacía sola a los 2 días.';

create index if not exists repeticiones_frenos_en_idx on public.repeticiones_frenos (en);
create index if not exists repeticiones_frenos_dueno_idx on public.repeticiones_frenos (dueno, en);
create index if not exists repeticiones_frenos_ip_idx on public.repeticiones_frenos (ip, en);

alter table public.repeticiones_frenos enable row level security;
revoke all on public.repeticiones_frenos from anon, authenticated;

-- La IP de quien llama, resumida. La pone Cloudflare delante de la API; si no
-- viene (una llamada sin pasar por la API, el SQL a mano), null.
create or replace function public.ip_cliente()
returns text
language sql
stable
as $$
  select md5('pm-' || coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'cf-connecting-ip',
    split_part(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ',', 1)))
$$;

-- ---------- 2 y 3) el trigger ----------
create or replace function public.repeticiones_freno()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cliente boolean := coalesce(auth.role(), '') in ('authenticated', 'anon');
  v_yo uuid := auth.uid();
  v_ip text := public.ip_cliente();
  v_tam integer := char_length(new.datos);
  n integer;
  b bigint;
begin
  if not cliente then
    return new;          -- la service role y el SQL a mano, sin freno
  end if;

  -- lo que no manda el juego lo pone el servidor
  new.creado_en := now();
  new.destacada := false;
  new.titulo := null;
  new.dueno := v_yo;

  -- todos juntos: red de seguridad
  select count(*) into n from public.repeticiones_frenos f
   where f.en > now() - interval '1 minute';
  if n >= 120 then
    raise exception 'demasiadas repeticiones por minuto';
  end if;

  -- por cuenta
  if v_yo is not null then
    select count(*) into n from public.repeticiones_frenos f
     where f.dueno = v_yo and f.en > now() - interval '1 minute';
    if n >= 20 then
      raise exception 'demasiadas repeticiones por minuto';
    end if;
    select count(*), coalesce(sum(f.tam), 0) into n, b from public.repeticiones_frenos f
     where f.dueno = v_yo and f.en > now() - interval '1 day';
    if n >= 400 or b + v_tam > 200000000 then
      raise exception 'demasiadas repeticiones hoy';
    end if;
  end if;

  -- por IP (con cuenta o sin ella)
  if v_ip is not null then
    select count(*) into n from public.repeticiones_frenos f
     where f.ip = v_ip and f.en > now() - interval '1 minute';
    if n >= 20 then
      raise exception 'demasiadas repeticiones por minuto';
    end if;
    select count(*), coalesce(sum(f.tam), 0) into n, b from public.repeticiones_frenos f
     where f.ip = v_ip and f.en > now() - interval '1 day';
    if n >= 400 or b + v_tam > 200000000 then
      raise exception 'demasiadas repeticiones hoy';
    end if;
  end if;

  insert into public.repeticiones_frenos (dueno, ip, tam) values (v_yo, v_ip, v_tam);
  -- lo de hace más de dos días ya no frena a nadie
  delete from public.repeticiones_frenos where en < now() - interval '2 days';
  return new;
end;
$$;

drop trigger if exists repeticiones_freno_trg on public.repeticiones;
create trigger repeticiones_freno_trg
  before insert on public.repeticiones
  for each row execute function public.repeticiones_freno();

-- ---------- 4) destacadas: 50 por cuenta ----------
create or replace function public.destacar_repeticion(p_id text, p_destacada boolean, p_titulo text)
returns table (id text, destacada boolean, titulo text, dueno uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  yo uuid := auth.uid();
  limpio text := nullif(btrim(upper(coalesce(p_titulo, ''))), '');
begin
  if yo is null then
    raise exception 'necesitas una cuenta';
  end if;
  if limpio is not null and char_length(limpio) > 32 then
    limpio := left(limpio, 32);
  end if;
  if coalesce(p_destacada, false) and (
       select count(*) from public.repeticiones r
        where r.dueno = yo and r.destacada and r.id <> p_id) >= 50 then
    raise exception 'demasiadas destacadas';
  end if;
  return query
    update public.repeticiones r
       set destacada = coalesce(p_destacada, false),
           titulo = case when coalesce(p_destacada, false) then limpio else null end,
           dueno = yo
     where r.id = p_id and (r.dueno = yo or r.dueno is null)
    returning r.id, r.destacada, r.titulo, r.dueno;
end;
$$;

revoke all on function public.destacar_repeticion(text, boolean, text) from public, anon;
grant execute on function public.destacar_repeticion(text, boolean, text) to authenticated;

-- ---------- 5) fechas del futuro ----------
update public.repeticiones set creado_en = now() where creado_en > now() + interval '5 minutes';
