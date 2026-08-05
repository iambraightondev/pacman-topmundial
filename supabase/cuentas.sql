-- ============================================================
-- PAC-MAN TOP MUNDIAL — cuentas de jugador
--
-- Pégalo en el proyecto de Supabase del juego:
--   Dashboard -> SQL Editor -> New query -> Run
-- Se puede ejecutar tantas veces como haga falta.
--
-- AJUSTE OBLIGATORIO DEL PROYECTO (no se puede hacer por SQL):
--   Authentication -> Sign In / Providers
--     · Email: ACTIVADO
--     · "Allow new users to sign up": ACTIVADO
--     · "Confirm email": APAGADO
-- El juego compone el correo por dentro a partir del usuario
-- (usuario@cuentas.pacman-topmundial.vercel.app) y ese buzón no existe:
-- con la confirmación encendida, el alta no devuelve sesión y nadie
-- puede entrar nunca.
-- ============================================================

-- ---------- perfil de cada cuenta ----------
create table if not exists public.perfiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  usuario      text        not null unique check (usuario ~ '^[A-Z0-9]{3,8}$'),
  avatar       text        not null default 'pac',
  xp           bigint      not null default 0 check (xp >= 0),
  record1      integer     not null default 0 check (record1 >= 0),
  record2      integer     not null default 0 check (record2 >= 0),
  tiempo1      integer     check (tiempo1 is null or
                                  (tiempo1 > 0 and tiempo1 <= 6000000)),
  logros       jsonb       not null default '{}'::jsonb,
  creado_en    timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);

comment on table public.perfiles is
  'Cuentas del juego: el usuario es también el nombre dentro de la partida.';

-- la marca de tiempo la pone el servidor, no el navegador
create or replace function public.perfiles_touch()
returns trigger
language plpgsql
as $$
begin
  new.actualizado := now();
  return new;
end;
$$;

drop trigger if exists perfiles_touch_trg on public.perfiles;
create trigger perfiles_touch_trg
  before insert or update on public.perfiles
  for each row execute function public.perfiles_touch();

alter table public.perfiles enable row level security;

-- lectura pública: hace falta para mirar el perfil de un amigo y para saber
-- si un nombre ya está cogido. Escribir, solo tu propia fila.
grant select on public.perfiles to anon, authenticated;
grant insert, update on public.perfiles to authenticated;

drop policy if exists "perfiles lectura publica" on public.perfiles;
create policy "perfiles lectura publica"
  on public.perfiles for select
  to anon, authenticated
  using (true);

drop policy if exists "perfiles alta propia" on public.perfiles;
create policy "perfiles alta propia"
  on public.perfiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "perfiles cambio propio" on public.perfiles;
create policy "perfiles cambio propio"
  on public.perfiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Sin política de delete: una cuenta no se borra desde el juego.

-- ---------- lista de amigos (solo con cuenta) ----------
-- Se guarda el NOMBRE, no una clave ajena: el juego entero (ranking, party,
-- invitaciones, espectar) va por el nombre, y así un amigo sigue en tu lista
-- aunque todavía no se haya registrado.
create table if not exists public.amigos (
  de         uuid        not null references auth.users(id) on delete cascade,
  amigo      text        not null check (amigo ~ '^[A-Z0-9]{1,8}$'),
  creado_en  timestamptz not null default now(),
  primary key (de, amigo)
);

comment on table public.amigos is
  'Amigos de cada cuenta, por nombre de jugador.';

alter table public.amigos enable row level security;
grant select, insert, delete on public.amigos to authenticated;

drop policy if exists "amigos propios" on public.amigos;
create policy "amigos propios"
  on public.amigos for all
  to authenticated
  using (de = auth.uid())
  with check (de = auth.uid());
