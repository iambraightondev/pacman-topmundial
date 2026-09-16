-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/repeticiones-todas.sql
-- TODAS las repeticiones van a la nube, no solo las que se comparten.
--
-- Hasta el 16 de septiembre de 2026 las repeticiones vivían en el navegador
-- (8 locales y 2 online como mucho) y la tabla solo recibía las que alguien
-- compartía. Las demás se iban borrando solas y TUS PARTIDAS enseñaba filas
-- sin VER ni COMPARTIR. Ahora cada una se sube al acabar la partida.
--
--   tipo       'red' (online, formato v2) o 'local' (formato v1, la de ?rep=)
--   dueno      la cuenta que la subió (auth.uid()); null si se jugó sin cuenta
--   t_partida  la hora de la partida en el aparato (ms), para cruzarla con el
--              historial, que no tiene otro identificador común
-- ============================================================

alter table public.repeticiones
  add column if not exists tipo text not null default 'red';
alter table public.repeticiones
  add column if not exists dueno uuid default auth.uid();
alter table public.repeticiones
  add column if not exists t_partida bigint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'repeticiones_tipo_chk') then
    alter table public.repeticiones
      add constraint repeticiones_tipo_chk check (tipo in ('red', 'local'));
  end if;
end $$;

create index if not exists repeticiones_dueno_idx
  on public.repeticiones (dueno, t_partida desc);

-- nadie sube una repetición a nombre de otra cuenta
drop policy if exists "repeticiones insercion publica" on public.repeticiones;
create policy "repeticiones insercion publica"
  on public.repeticiones for insert
  to anon, authenticated
  with check (dueno is null or dueno = auth.uid());
