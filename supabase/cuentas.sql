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
  usuario      text        not null unique check (usuario ~ '^[A-Z0-9]{3,12}$'),
  avatar       text        not null default 'pac',
  xp           bigint      not null default 0 check (xp >= 0),
  -- un récord por formato de partida: cada uno es su propia liga, y de ahí
  -- salen las cuatro rutas de maestrías del juego
  record1      integer     not null default 0 check (record1 >= 0),  -- 1 jugador
  record2      integer     not null default 0 check (record2 >= 0),  -- dúo
  record3      integer     not null default 0 check (record3 >= 0),  -- trío
  record4      integer     not null default 0 check (record4 >= 0),  -- escuadra
  -- y los mundos que se juegan con otras reglas (LABERINTOS y DESATADO),
  -- partidos TAMBIÉN por formato: son doce rutas de maestría contando el
  -- clásico, y una marca de ahí no se compara con la del laberinto de 1980.
  -- La columna sin número es la de solo (la de siempre).
  record_lab   integer     not null default 0 check (record_lab >= 0),
  record_lab2  integer     not null default 0 check (record_lab2 >= 0),
  record_lab3  integer     not null default 0 check (record_lab3 >= 0),
  record_lab4  integer     not null default 0 check (record_lab4 >= 0),
  record_hab   integer     not null default 0 check (record_hab >= 0),
  record_hab2  integer     not null default 0 check (record_hab2 >= 0),
  record_hab3  integer     not null default 0 check (record_hab3 >= 0),
  record_hab4  integer     not null default 0 check (record_hab4 >= 0),
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
  amigo      text        not null check (amigo ~ '^[A-Z0-9]{1,12}$'),
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

-- ---------- puesta al día: los récords de trío y escuadra ----------
-- La tabla ya creada se quedó con record1 y record2, y "create table if not
-- exists" no añade columnas. Antes cualquier partida de más de uno escribía
-- en record2, así que lo que haya ahí es lo mejor de dúo, trío y escuadra
-- mezclado: se queda tal cual en DÚO y los dos formatos nuevos empiezan a 0,
-- que es como los ve el juego.
alter table public.perfiles
  add column if not exists record3 integer not null default 0,
  add column if not exists record4 integer not null default 0;

-- ---------- puesta al día: LABERINTOS y DESATADO ----------
-- Son mundos aparte, con su propia ruta de maestrías, así que llevan su
-- propio récord. Antes una partida en otro laberinto escribía en record1 (el
-- del laberinto de 1980) y entregaba maestrías que no eran suyas; ahora cada
-- uno guarda la suya. Lo que ya estuviera en record1 se queda como está: no
-- hay forma de saber qué parte vino de un laberinto alternativo.
alter table public.perfiles
  add column if not exists record_lab integer not null default 0,
  add column if not exists record_hab integer not null default 0;

-- ---------- puesta al día: esos dos mundos, POR FORMATO ----------
-- Otro trazado con cuatro bocas tampoco es la misma liga que el mismo trazado
-- en solitario, así que LABERINTOS y DESATADO se parten también por formato.
-- La columna SIN número sigue siendo la de solo: lo que ya estuviera guardado
-- cuenta para la ruta de solo, que es donde casi todo el mundo lo jugó, y no
-- se pierde nada. Las tres nuevas de cada mundo empiezan a cero.
alter table public.perfiles
  add column if not exists record_lab2 integer not null default 0,
  add column if not exists record_lab3 integer not null default 0,
  add column if not exists record_lab4 integer not null default 0,
  add column if not exists record_hab2 integer not null default 0,
  add column if not exists record_hab3 integer not null default 0,
  add column if not exists record_hab4 integer not null default 0;

do $$
declare
  c text;
begin
  foreach c in array array[
    'record_lab', 'record_lab2', 'record_lab3', 'record_lab4',
    'record_hab', 'record_hab2', 'record_hab3', 'record_hab4'
  ] loop
    if not exists (
      select 1 from pg_constraint where conname = 'perfiles_' || c || '_chk'
    ) then
      execute format(
        'alter table public.perfiles add constraint %I check (%I >= 0)',
        'perfiles_' || c || '_chk', c);
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'perfiles_record3_chk'
  ) then
    alter table public.perfiles
      add constraint perfiles_record3_chk check (record3 >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'perfiles_record4_chk'
  ) then
    alter table public.perfiles
      add constraint perfiles_record4_chk check (record4 >= 0);
  end if;
end $$;

-- ---------- puesta al día: los nombres pasaron de 8 a 12 letras ----------
-- Las tablas ya creadas se quedaron con el CHECK viejo, y "create table if
-- not exists" no lo toca. Se busca por el texto de la condición (el nombre
-- lo puso Postgres solo) y se cambia por uno con nombre propio, para que
-- volver a lanzar este archivo no duplique nada.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.perfiles'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%{3,8}%'
  loop
    execute format('alter table public.perfiles drop constraint %I', c);
  end loop;
  if not exists (
    select 1 from pg_constraint where conname = 'perfiles_usuario_chk'
  ) then
    alter table public.perfiles
      add constraint perfiles_usuario_chk check (usuario ~ '^[A-Z0-9]{3,12}$');
  end if;

  for c in
    select conname from pg_constraint
     where conrelid = 'public.amigos'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%{1,8}%'
  loop
    execute format('alter table public.amigos drop constraint %I', c);
  end loop;
  if not exists (
    select 1 from pg_constraint where conname = 'amigos_nombre_chk'
  ) then
    alter table public.amigos
      add constraint amigos_nombre_chk check (amigo ~ '^[A-Z0-9]{1,12}$');
  end if;
end $$;
