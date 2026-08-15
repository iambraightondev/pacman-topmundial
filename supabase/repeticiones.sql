-- ============================================================
-- PAC-MAN TOP MUNDIAL — repeticiones online por enlace
--
-- Una repetición LOCAL son las teclas: el juego es determinista y
-- con eso se reconstruye la partida entera en unos cientos de
-- bytes, que caben de sobra en una URL (?rep=<texto>).
--
-- Una repetición ONLINE no. Allí la partida la simula el anfitrión
-- y lo que ve cada uno depende de lo que llegue por la red, así que
-- lo que se graba es el flujo que el anfitrión ya emite: sus
-- instantáneas y sus eventos. Comprimido son ~12 KB por minuto de
-- partida, y eso no cabe en un enlace ni comprimiéndolo más: una
-- partida de cinco minutos son 60 KB y por WhatsApp no pasa.
--
-- La salida es que el enlace lleve un CÓDIGO y no la partida:
--   pacman-topmundial.vercel.app/?rn=A3K9XQ7M
-- La repetición se sube aquí, el enlace la señala, y funciona igual
-- con una partida de un minuto que con una de un cuarto de hora.
--
--   ¿Y por qué no reescribir el netcode para que las de red también
--   quepan en la URL? Porque eso obliga a que los invitados manden
--   intención de rumbo en vez de posiciones y a que el anfitrión sea
--   autoridad, con predicción y reconciliación por medio. Es tocar
--   el núcleo de lo único que hoy funciona bien —el invitado simula
--   su propio Pac-Man y por eso no se nota lag— para arreglar una
--   función secundaria. El razonamiento largo está en PENDIENTE.md.
--
-- Pégalo en el proyecto de Supabase del juego:
--   Dashboard -> SQL Editor -> New query -> Run
-- Se puede ejecutar tantas veces como haga falta.
-- ============================================================

create table if not exists public.repeticiones (
  -- 8 caracteres del mismo alfabeto que los códigos de sala (sin I ni O):
  -- el enlace se manda por chat, pero también se dicta en voz alta
  id         text        primary key check (id ~ '^[A-Z0-9]{8}$'),
  creado_en  timestamptz not null default now(),
  jugadores  smallint    not null check (jugadores between 1 and 4),
  puntos     integer     not null check (puntos >= 0 and puntos <= 10000000),
  nivel      smallint    not null check (nivel >= 1 and nivel <= 999),
  -- quiénes jugaron, ya juntos, solo para la ficha del enlace
  nombres    text        not null default '' check (char_length(nombres) <= 64),
  -- la repetición serializada (js/replay.js, formato de red v2)
  datos      text        not null check (char_length(datos) between 1 and 260000)
);

comment on table public.repeticiones is
  'Repeticiones de partidas online compartidas por enlace (?rn=<id>).';

alter table public.repeticiones enable row level security;

-- Leer es público: para eso se comparte el enlace, y quien lo tiene ya sabe el
-- código. Escribir también, como el ranking antes de la Edge Function: aquí no
-- hay nada que falsificar —una repetición inventada solo se engaña a sí misma,
-- no da puntos ni maestrías— así que no compensa montar una puerta con llave.
-- Lo que sí hace falta es que nadie use esto de disco duro: de eso se encargan
-- el tope de tamaño de arriba y el freno de abajo.
grant select, insert on public.repeticiones to anon, authenticated;
grant all on public.repeticiones to service_role;

drop policy if exists "repeticiones lectura publica" on public.repeticiones;
create policy "repeticiones lectura publica"
  on public.repeticiones for select
  to anon, authenticated
  using (true);

drop policy if exists "repeticiones insercion publica" on public.repeticiones;
create policy "repeticiones insercion publica"
  on public.repeticiones for insert
  to anon, authenticated
  with check (true);

-- Sin update ni delete: una repetición compartida no se retoca. Si alguien
-- quiere otra, sube otra y comparte el enlace nuevo.

-- ---------- freno ----------
-- Un tope global por minuto. No es por nombre (aquí no hay nombre de fiar) ni
-- por IP (Postgres no la ve), pero corta en seco a quien intente llenar la
-- tabla con un bucle: 20 por minuto es muchísimo más de lo que puede subir un
-- grupo de amigos jugando y muchísimo menos de lo que necesita un ataque.
create index if not exists repeticiones_reciente_idx
  on public.repeticiones (creado_en desc);

create or replace function public.repeticiones_freno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  select count(*) into n
    from public.repeticiones
   where creado_en > now() - interval '1 minute';
  if n >= 20 then
    raise exception 'demasiadas repeticiones por minuto';
  end if;
  return new;
end;
$$;

drop trigger if exists repeticiones_freno_trg on public.repeticiones;
create trigger repeticiones_freno_trg
  before insert on public.repeticiones
  for each row execute function public.repeticiones_freno();
