-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/cuenta-frenos.sql
-- FRENOS DE LA FUNCIÓN `cuenta` (28 sep 2026)
--
-- Va con la versión del 28 sep de supabase/functions/cuenta. Se puede
-- ejecutar tantas veces como haga falta. La vuelta atrás, en
-- supabase/seguridad-vuelta-atras.sql.
--
-- ENTRAR NO TENÍA FRENO. Cualquiera podía probar contraseñas contra
-- cualquier usuario (los nombres son públicos: salen en el top) todo lo
-- rápido que diera la red. Ahora, por usuario:
--   · 5 fallos seguidos (sin 15 min de calma entre ellos) cierran la puerta
--     15 min; cada fallo más, el doble (30 min, 1 h...), 2 h como mucho.
--   · entrar bien lo borra todo; un día sin fallos, también.
--   · Cambiar el correo o la contraseña (que piden la contraseña actual)
--     cuentan igual: si no, serían otra forma de probar contraseñas.
--   El juego de antes del 28 sep prueba dos veces por intento (en mayúsculas
--   y tal cual se escribió), así que con él la puerta se cierra al tercer
--   intento fallido. El de ahora manda las dos en la misma petición.
--
-- "OLVIDÉ LA CONTRASEÑA": un correo cada 15 min por usuario como mucho (la
-- respuesta es la misma se mande o no, exista la cuenta o no).
--
-- Solo lo usa la función (service role). Nadie más lo lee.
-- ============================================================

create table if not exists public.cuenta_frenos (
  clave   text primary key,           -- 'entrar:USUARIO' u 'olvide:USUARIO'
  n       integer not null default 0,
  ultimo  timestamptz not null default now()
);

comment on table public.cuenta_frenos is
  'Fallos al entrar y envíos de recuperación por usuario (función cuenta).';

alter table public.cuenta_frenos enable row level security;
revoke all on public.cuenta_frenos from anon, authenticated;

-- Segundos que le quedan de espera a esa clave (0 = puede intentarlo)
create or replace function public.cuenta_espera(p_clave text)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select greatest(0, ceil(extract(epoch from
             (f.ultimo + least(interval '2 hours', interval '15 minutes' * power(2, f.n - 5)) - now()))))::integer
      from public.cuenta_frenos f
     where f.clave = p_clave and f.n >= 5 and f.ultimo > now() - interval '1 day'
  ), 0)
$$;

-- Apunta un fallo. Devuelve cuántos lleva seguidos.
create or replace function public.cuenta_fallo(p_clave text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r integer;
begin
  insert into public.cuenta_frenos as f (clave, n, ultimo) values (p_clave, 1, now())
  on conflict (clave) do update
    set n = case
              when f.ultimo < now() - interval '1 day' then 1
              when f.n < 5 and f.ultimo < now() - interval '15 minutes' then 1
              else f.n + 1
            end,
        ultimo = now()
  returning f.n into r;
  -- lo viejo ya no frena a nadie
  delete from public.cuenta_frenos where ultimo < now() - interval '2 days';
  return r;
end;
$$;

-- Entró bien: fuera los fallos
create or replace function public.cuenta_limpia(p_clave text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.cuenta_frenos where clave = p_clave
$$;

-- ¿Toca mandar otro correo de recuperación? Si toca, lo apunta.
create or replace function public.cuenta_olvide_toca(p_clave text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.cuenta_frenos
              where clave = p_clave and ultimo > now() - interval '15 minutes') then
    return false;
  end if;
  insert into public.cuenta_frenos as f (clave, n, ultimo) values (p_clave, 1, now())
  on conflict (clave) do update set n = f.n + 1, ultimo = now();
  return true;
end;
$$;

revoke all on function public.cuenta_espera(text) from public, anon, authenticated;
revoke all on function public.cuenta_fallo(text) from public, anon, authenticated;
revoke all on function public.cuenta_limpia(text) from public, anon, authenticated;
revoke all on function public.cuenta_olvide_toca(text) from public, anon, authenticated;
grant execute on function public.cuenta_espera(text) to service_role;
grant execute on function public.cuenta_fallo(text) to service_role;
grant execute on function public.cuenta_limpia(text) to service_role;
grant execute on function public.cuenta_olvide_toca(text) to service_role;
