-- ============================================================
-- PAC-MAN TOP MUNDIAL — recuperar la contraseña
--
-- Hasta ahora, quien olvidaba su contraseña PERDÍA LA CUENTA. No
-- había vuelta atrás: el correo que pide Supabase Auth se compone
-- por dentro (usuario@cuentas.pacman-topmundial.vercel.app), ese
-- buzón no existe y el enlace de recuperación de Supabase no
-- llegaba a ninguna parte. Con la cuenta se iban los cuatro
-- récords, la experiencia, los logros y las doce maestrías.
--
-- La solución es un CÓDIGO DE RECUPERACIÓN: 16 caracteres que se
-- enseñan UNA VEZ al registrarse (y que se pueden volver a generar
-- desde PERFIL). Aquí solo se guarda su HUELLA (SHA-256), nunca el
-- código: quien mire la base de datos no puede entrar en ninguna
-- cuenta, y quien tenga el papel sí.
--
--   ¿Por qué no un correo de verdad? Porque obliga a pedir un dato
--   que hoy no se pide y a tocar la configuración de auth del
--   proyecto. El código no necesita nada de eso y resuelve el
--   problema entero. Si algún día se quiere el correo, esto no
--   estorba: son dos caminos que pueden convivir.
--
-- ┌──────────────────────────────────────────────────────────┐
-- │  ORDEN. Igual que con el ranking:                        │
-- │  1) supabase functions deploy recuperar                  │
-- │  2) y DESPUÉS este archivo                               │
-- │  Al revés no rompe nada (la tabla vacía no hace daño),    │
-- │  pero el juego enseñaría el botón sin nadie detrás.       │
-- └──────────────────────────────────────────────────────────┘
--
-- Pégalo en el proyecto de Supabase del juego:
--   Dashboard -> SQL Editor -> New query -> Run
-- Se puede ejecutar tantas veces como haga falta.
-- ============================================================

-- ---------- la huella del código, y nada más ----------
create table if not exists public.recuperacion (
  id         uuid        primary key references auth.users(id) on delete cascade,
  -- SHA-256 en hexadecimal de 'USUARIO:CODIGO' (64 caracteres)
  hash       text        not null check (hash ~ '^[0-9a-f]{64}$'),
  -- intentos fallidos seguidos, para frenar a quien pruebe códigos a lo bruto
  intentos   smallint    not null default 0 check (intentos >= 0),
  ultimo     timestamptz,
  creado_en  timestamptz not null default now()
);

comment on table public.recuperacion is
  'Huella del código de recuperación de cada cuenta. El código NO se guarda.';
comment on column public.recuperacion.hash is
  'SHA-256 hex de USUARIO:CODIGO. Se compara en la Edge Function recuperar.';

alter table public.recuperacion enable row level security;

-- ---------- permisos ----------
-- La regla de oro: NADIE puede leer `hash` desde el navegador. Ni el propio
-- dueño de la fila, que tampoco lo necesita —el código lo apuntó él— y así
-- una sesión robada no sirve para llevarse la llave de repuesto.
--
-- Se hace con permisos POR COLUMNA (que es lo que Postgres tiene para esto)
-- además de con RLS: el RLS filtra FILAS, no columnas, así que sin el grant
-- por columna un `select=*` del dueño se traería la huella.
revoke all on public.recuperacion from anon, authenticated;
grant select (id, creado_en) on public.recuperacion to authenticated;
grant insert, update on public.recuperacion to authenticated;
grant all on public.recuperacion to service_role;

-- La función busca la cuenta POR NOMBRE en `perfiles`, y ahí la service role
-- no tenía permiso: supabase/cuentas.sql solo se lo dio a anon y authenticated,
-- y el permiso de tabla hace falta aunque el RLS se salte. Sin esta línea, la
-- recuperación contesta siempre "usuario o código incorrectos" y no hay forma
-- de adivinar por qué.
grant select on public.perfiles to service_role;

-- Ver si TENGO código (para que PERFIL sepa si avisar), nunca cuál es.
drop policy if exists "recuperacion mia" on public.recuperacion;
create policy "recuperacion mia"
  on public.recuperacion for select
  to authenticated
  using (id = auth.uid());

-- Poner el mío la primera vez...
drop policy if exists "recuperacion alta propia" on public.recuperacion;
create policy "recuperacion alta propia"
  on public.recuperacion for insert
  to authenticated
  with check (id = auth.uid());

-- ...y cambiarlo por otro cuando quiera (generar uno nuevo invalida el viejo).
drop policy if exists "recuperacion cambio propio" on public.recuperacion;
create policy "recuperacion cambio propio"
  on public.recuperacion for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Sin política de delete: quitarse el código de recuperación es volver al
-- problema que esto arregla, y no hay ningún motivo para ofrecerlo.

-- ---------- comprobación (opcional) ----------
-- Esto NO debería devolver 'hash' para authenticated:
-- select grantee, privilege_type, column_name
--   from information_schema.column_privileges
--  where table_schema = 'public' and table_name = 'recuperacion'
--    and grantee = 'authenticated'
--  order by column_name;
