-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/repeticiones-destacadas.sql
-- DESTACAR una partida: se queda para siempre y con nombre. Las demás
-- repeticiones se borran a la semana.
--
-- Desde el 16 de septiembre de 2026 todas las repeticiones se suben a la nube
-- (supabase/repeticiones-todas.sql). Guardarlas todas para siempre no tiene
-- sentido —una partida online larga son ~200 KB—, así que:
--
--   destacada  true = no caduca nunca
--   titulo     el nombre que le pone su dueño (32 caracteres como mucho)
--
-- Se destaca con la función destacar_repeticion(), no con un UPDATE suelto:
-- así solo se tocan esas dos columnas, solo lo hace quien tiene cuenta, y una
-- repetición subida antes de entrar (sin dueño) pasa a ser de quien la destaca
-- (el código solo lo tiene quien la jugó o a quien se la compartió).
--
-- Borrado: al subir cualquier repetición se borran las no destacadas de más
-- de 7 días. No hace falta un cron: se sube una por partida, así que la
-- limpieza va al ritmo al que se llena la tabla.
-- ============================================================

alter table public.repeticiones
  add column if not exists destacada boolean not null default false;
alter table public.repeticiones
  add column if not exists titulo text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'repeticiones_titulo_chk') then
    alter table public.repeticiones
      add constraint repeticiones_titulo_chk check (titulo is null or char_length(titulo) <= 32);
  end if;
end $$;

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

create or replace function public.repeticiones_caducar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.repeticiones
   where not destacada
     and creado_en < now() - interval '7 days';
  return null;
end;
$$;

drop trigger if exists repeticiones_caducar_trg on public.repeticiones;
create trigger repeticiones_caducar_trg
  after insert on public.repeticiones
  for each statement execute function public.repeticiones_caducar();
