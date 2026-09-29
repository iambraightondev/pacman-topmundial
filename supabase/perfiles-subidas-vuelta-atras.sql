-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/perfiles-subidas-vuelta-atras.sql
-- Deshace supabase/perfiles-subidas.sql (29 sep 2026).
--
-- Quita el trigger, su función, la tabla de subidas vistas y la columna
-- `sube`. perfiles_touch() no se toca (ese archivo no lo cambió).
--
-- El juego nuevo lo nota solo: al quitar la columna, PostgREST contesta 400
-- nombrando `sube`, el juego levanta Account.sinSube y vuelve a sumar él lo
-- pendiente, como antes (sin la protección contra la doble suma). Nada de lo
-- ya subido se pierde: lo sumado está en `perfiles` como cualquier otra
-- cifra.
-- ============================================================

drop trigger if exists perfiles_sube_trg on public.perfiles;
drop function if exists public.perfiles_sube();
drop table if exists public.perfiles_subidas;
alter table public.perfiles drop column if exists sube;

notify pgrst, 'reload schema';
