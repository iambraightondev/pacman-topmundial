-- ============================================================
-- PAC-MAN TOP MUNDIAL — integridad del top mundial
--
-- Cierra el agujero de trampas: hasta ahora la tabla `ranking`
-- aceptaba inserciones directas con la clave anónima, así que
-- cualquiera podía abrir la consola del navegador y meterse
-- 999999 puntos. El trigger que hay solo frena el spam (5 filas
-- por nombre y minuto), que no es lo mismo.
--
-- A partir de aquí la ÚNICA vía de entrada es la Edge Function
-- `enviar-record` (supabase/functions/enviar-record/index.ts),
-- que valida la partida antes de escribir y usa la service role.
--
-- ┌──────────────────────────────────────────────────────────┐
-- │  ORDEN. Esto NO se aplica el primero.                     │
-- │                                                           │
-- │  1) supabase functions deploy enviar-record               │
-- │  2) comprobar con curl que responde (ver                  │
-- │     docs-pendientes/integridad-ranking.md)                │
-- │  3) y SOLO ENTONCES ejecutar este archivo                 │
-- │                                                           │
-- │  Al revés se queda el ranking sin nadie que pueda         │
-- │  escribir en él: `anon` ya no puede y la función todavía   │
-- │  no existe. Nadie registraría una partida.                │
-- └──────────────────────────────────────────────────────────┘
--
-- Va después de supabase/ranking.sql, que crea la tabla y las
-- vistas; aquí solo se añade y se quitan permisos. Se puede
-- ejecutar tantas veces como haga falta.
--
-- Pégalo en el proyecto de Supabase del juego:
--   Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- ------------------------------------------------------------
-- 1) Repetición de la partida
--
-- La repetición (formato v1) se guarda tal cual la manda el juego, y
-- `verificado` dice si la función pudo comprobar que cuadra con la
-- puntuación enviada. De momento la comprobación es ESTRUCTURAL: que la
-- versión, los ajustes, el final y la densidad de órdenes sean coherentes.
-- Rejugar la partida de verdad con el motor queda pendiente.
--
-- Las dos columnas son opcionales a propósito: las partidas de antes de
-- esto siguen valiendo, con `verificado` en falso.
-- ------------------------------------------------------------
alter table public.ranking add column if not exists repeticion jsonb;
alter table public.ranking add column if not exists verificado boolean;

update public.ranking set verificado = false where verificado is null;
alter table public.ranking alter column verificado set default false;
alter table public.ranking alter column verificado set not null;

comment on column public.ranking.repeticion is
  'Repetición de la partida (formato v1) tal como la mandó el juego; null si no vino.';
comment on column public.ranking.verificado is
  'La repetición cuadra con la puntuación enviada (comprobación estructural).';

-- Una repetición desatada puede pesar mucho: un tope de tamaño evita que
-- alguien use el ranking como almacén. 512 KB es de sobra para una partida
-- larga (la función corta el envío en ese mismo número).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ranking_repeticion_chk'
  ) then
    alter table public.ranking add constraint ranking_repeticion_chk check (
      repeticion is null or octet_length(repeticion::text) <= 524288
    );
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) El freno de envíos consulta el último minuto: que no tenga que
--    recorrerse la tabla entera para saberlo.
-- ------------------------------------------------------------
create index if not exists ranking_reciente_idx
  on public.ranking (creado_en desc);

-- ------------------------------------------------------------
-- 3) Se cierra la puerta: `anon` deja de poder insertar
--
-- El GRANT es lo que abre la puerta en PostgREST y la política de RLS lo
-- que filtra las filas, así que hay que quitar las dos cosas. La LECTURA
-- se queda como estaba: pública, que para eso es un top mundial.
-- ------------------------------------------------------------
revoke insert on public.ranking from anon, authenticated;

drop policy if exists "ranking insercion publica" on public.ranking;

-- La lectura se vuelve a dejar dicha, por si este archivo se ejecuta en un
-- proyecto donde no estuviera (es la misma política de ranking.sql).
grant select on public.ranking to anon, authenticated;

drop policy if exists "ranking lectura publica" on public.ranking;
create policy "ranking lectura publica"
  on public.ranking for select
  to anon, authenticated
  using (true);

-- Sin políticas de insert/update/delete: con RLS activo, quedan prohibidos
-- para todo el mundo menos para la service role, que salta el RLS.

-- ------------------------------------------------------------
-- 4) Y se le da la llave a quien valida: la service role, que es el rol
--    con el que corre la Edge Function `enviar-record`.
--
-- La service role salta las políticas de RLS, pero el GRANT de tabla sí
-- le hace falta (normalmente ya lo tiene por los permisos que Supabase
-- pone al crear la tabla; se deja escrito para no depender de eso).
-- Su clave NO sale nunca del servidor: vive en la variable de entorno
-- SUPABASE_SERVICE_ROLE_KEY que Supabase le da a la función.
-- ------------------------------------------------------------
grant select, insert on public.ranking to service_role;

-- El trigger `ranking_freno` de ranking.sql se queda donde está: la función
-- ya cuenta los envíos del último minuto, pero tener el tope también en la
-- base de datos no sobra si algún día se vuelve a abrir el insert.

-- ------------------------------------------------------------
-- 5) Comprobación (opcional): esto debería dejar `insert` fuera de la
--    lista de permisos de anon y dentro de la de service_role.
-- ------------------------------------------------------------
-- select grantee, privilege_type
--   from information_schema.role_table_grants
--  where table_schema = 'public' and table_name = 'ranking'
--  order by grantee, privilege_type;
