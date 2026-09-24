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
  -- la partida que se dejó a medias, para poder seguirla en otro aparato.
  -- Es el texto de su repetición cortada por donde iba (js/guardado.js), no
  -- una foto del laberinto: unos pocos miles de caracteres, y el tope cubre
  -- hasta la partida más larga que el juego sabe grabar.
  partida      text        check (partida is null or char_length(partida) <= 120000),
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
declare
  purga_old numeric;
  purga_new numeric;
begin
  new.actualizado := now();
  /* LO JUGADO SOLO CRECE (24 sep). Cada aparato sube su perfil ENTERO sin
   * leer antes la nube, así que un segundo aparato con datos viejos bajaba
   * partidas, récords y experiencia de la cuenta hasta que el bueno volvía a
   * entrar (y si ese se borraba, se perdían). Ahora, de cada contador de
   * `logros`, de la experiencia y de cada récord se queda el mayor; de los
   * tiempos (mejorT1, tiempo1) el menor. La única forma de BAJAR algo es una
   * limpieza a mano que suba el contador `purga` en la misma escritura. */
  if tg_op = 'UPDATE' then
    purga_old := coalesce((old.logros->>'purga')::numeric, 0);
    purga_new := coalesce((new.logros->>'purga')::numeric, 0);
    if purga_new > purga_old then
      return new;
    end if;
    /* Y un aparato que aún no se ha enterado de la última limpieza (trae una
     * purga más vieja) no escribe contadores: devolvería lo que se limpió.
     * Al entrar en la cuenta toma la nube tal cual y ya escribe normal. */
    if purga_new < purga_old then
      new.logros := old.logros;
    end if;

    new.xp := greatest(coalesce(new.xp, 0), coalesce(old.xp, 0));
    new.record1 := greatest(coalesce(new.record1, 0), coalesce(old.record1, 0));
    new.record2 := greatest(coalesce(new.record2, 0), coalesce(old.record2, 0));
    new.record3 := greatest(coalesce(new.record3, 0), coalesce(old.record3, 0));
    new.record4 := greatest(coalesce(new.record4, 0), coalesce(old.record4, 0));
    new.record_lab := greatest(coalesce(new.record_lab, 0), coalesce(old.record_lab, 0));
    new.record_lab2 := greatest(coalesce(new.record_lab2, 0), coalesce(old.record_lab2, 0));
    new.record_lab3 := greatest(coalesce(new.record_lab3, 0), coalesce(old.record_lab3, 0));
    new.record_lab4 := greatest(coalesce(new.record_lab4, 0), coalesce(old.record_lab4, 0));
    new.record_hab := greatest(coalesce(new.record_hab, 0), coalesce(old.record_hab, 0));
    new.record_hab2 := greatest(coalesce(new.record_hab2, 0), coalesce(old.record_hab2, 0));
    new.record_hab3 := greatest(coalesce(new.record_hab3, 0), coalesce(old.record_hab3, 0));
    new.record_hab4 := greatest(coalesce(new.record_hab4, 0), coalesce(old.record_hab4, 0));
    if old.tiempo1 > 0 and (new.tiempo1 is null or new.tiempo1 <= 0 or new.tiempo1 > old.tiempo1) then
      new.tiempo1 := old.tiempo1;
    end if;

    if jsonb_typeof(old.logros) = 'object' then
      if jsonb_typeof(new.logros) is distinct from 'object' then
        new.logros := old.logros;
      else
        new.logros := new.logros || coalesce((
          select jsonb_object_agg(k,
            case
              /* los tiempos: el menor que no sea cero */
              when k ~ 'mejorT1$' then
                case when coalesce((new.logros->>k)::numeric, 0) > 0
                          and coalesce((new.logros->>k)::numeric, 0) < (old.logros->>k)::numeric
                     then (new.logros->k) else (old.logros->k) end
              else to_jsonb(greatest(coalesce((new.logros->>k)::numeric, 0),
                                     (old.logros->>k)::numeric))
            end)
          from jsonb_object_keys(old.logros) as k
          where jsonb_typeof(old.logros->k) = 'number'
            and (new.logros->k is null or jsonb_typeof(new.logros->k) = 'number')
            and (old.logros->>k)::numeric > 0
        ), '{}'::jsonb);
      end if;
    end if;
  end if;
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

-- Y la service role, que es con la que corre la Edge Function `cuenta`. Le
-- hace falta para dar de alta el perfil al crear la cuenta y para resolver
-- usuario -> correo al entrar y al recuperar la contraseña.
--
-- OJO: la service role se salta el RLS, pero NO los permisos de tabla, y eso
-- ha costado dos vueltas: sin este grant la función recibe un 42501 y contesta
-- "usuario o contraseña mal" sin ninguna pista de por qué. Si algún día una
-- función no encuentra algo que está ahí, mirar los grant antes que el código.
grant select, insert, update on public.perfiles to service_role;

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

-- ---------- puesta al día: la partida a medias ----------
-- Guardar una partida sin terminar es lo que deja seguirla en otro ordenador.
-- Va aquí y no en una tabla aparte porque es UNA por cuenta: la última que se
-- dejó a medias. Al terminarla (o al empezar otra) el juego la pone a null.
-- Se lee en claro como el resto del perfil: dentro solo hay una partida de
-- Pac-Man, y las repeticiones ya se comparten por enlace.
alter table public.perfiles
  add column if not exists partida text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'perfiles_partida_chk'
  ) then
    alter table public.perfiles
      add constraint perfiles_partida_chk
      check (partida is null or char_length(partida) <= 120000);
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

-- ---------- puesta al día: los ajustes del jugador ----------
-- Tu ASPECTO (skin, color, accesorio, efecto, emotes, avatar) y tus
-- preferencias de juego y de sonido. Hasta ahora la COMPRA viajaba con la
-- cuenta pero el habérselo PUESTO se quedaba en el navegador, así que abrir
-- tu cuenta en otro ordenador te devolvía al Pac-Man amarillo de fábrica.
--
-- Dentro va lo listado en CFG.AJUSTES_NUBE (js/config.js) y los sellos de
-- tiempo con los que se decide qué lado manda: cuando los dos tienen algo,
-- gana el que se cambió más tarde, que es la única regla con sentido para un
-- color o una skin (no hay uno "mejor", como sí lo hay en un récord).
--
-- Desde el 22 sep 2026 el sello es POR CAMPO (`t`), no del bloque. Con un
-- solo sello, tocar cualquier cosa en un ordenador —hasta elegir rol antes
-- de jugar— lo declaraba "el más nuevo" y ya no bajaba NADA de la cuenta: ni
-- la skin, ni el orden de los emotes, ni los ajustes cambiados en el otro. El
-- `ts` del bloque sigue yendo para las versiones viejas del juego que sigan
-- abiertas por ahí.
--
-- Y dentro va también `daily`: la cartilla de retos de la semana. Es de la
-- CUENTA, no del navegador —la racha y los escalones de racha ya cobrados se
-- perdían al cambiar de ordenador, y el otro aparato podía volver a
-- pagarlos—, y cabe aquí de sobra: todo junto no llega a 1,1 kB de los 4 kB
-- que permite la comprobación de abajo. Su regla NO es la fecha sino lo mejor
-- de cada lado, como los récords (js/daily.js, Daily.desdeNube).
--
-- Se lee en claro como el resto del perfil; aquí no hay nada privado.
alter table public.perfiles
  add column if not exists ajustes jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'perfiles_ajustes_chk'
  ) then
    alter table public.perfiles
      add constraint perfiles_ajustes_chk
      check (jsonb_typeof(ajustes) = 'object'
             and pg_column_size(ajustes) <= 4000);
  end if;
end $$;
