-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/perfiles-blindaje.sql
-- LO QUE EL JUEGO SUBE AL PERFIL, CON TOPES (28 sep 2026)
--
-- Va DESPUÉS de supabase/cuentas.sql: rehace su perfiles_touch() y le
-- añade lo de aquí. Se puede ejecutar tantas veces como haga falta.
-- La vuelta atrás está en supabase/seguridad-vuelta-atras.sql.
--
-- EL AGUJERO. Cada aparato sube su fila entera de `perfiles` y el trigger
-- solo impedía BAJAR algo. Subir, cualquier cosa: desde la consola del
-- navegador se podía poner `logros.monedas` a mil millones, marcarse como
-- tuya cualquier pieza (`c_<id>`) —también las de cofre, que aún no existen
-- en el juego—, o el escalón más alto del rango (`rm4_<mes>`), que además
-- paga sus monedas y sale en la tabla del rango de todos (js/rango.js la
-- arma leyendo los perfiles de los demás).
--
-- LO QUE SE HACE. Dos cosas, y ninguna rechaza la escritura entera (eso
-- tiraría también lo jugado de verdad en esa subida):
--
--   1) AUDITORÍA. Cada escritura que mueve algo de lo que da monedas, rango,
--      piezas, experiencia o récords deja una fila en `perfiles_auditoria`
--      con la diferencia de cada contador y lo que se recortó. Sirve para
--      DETECTAR lo que sea posible pero raro y para DESHACERLO (ver al final).
--
--   2) RECORTE DE LO IMPOSIBLE. Solo se recorta lo que no se puede ganar
--      jugando, con topes generosos a propósito (ante la duda, el tope es
--      más alto: tirar lo jugado de verdad es peor que dejar pasar una
--      trampa que la auditoría va a enseñar igual). Lo que pasa del tope se
--      queda en el tope, no en lo de antes.
--
-- EL CUPO DE HORAS. Lo que sube con el tiempo de juego (experiencia,
-- monedas, experiencia del pase, partidas, partidas clasificatorias) se mide
-- contra un cupo de HORAS JUGABLES por cuenta (`perfiles_cupo`): se llena a
-- una hora por hora de reloj, hasta 48 h, y cada subida gasta lo que habría
-- costado ganar lo que trae al ritmo más alto posible.
--
--   ¿Por qué un cupo y no "el tiempo desde la última escritura"? Porque con
--   dos aparatos no vale: el que estuvo días sin conexión sube de golpe lo
--   que jugó mientras el otro escribía cada pocos minutos. Con el cupo, lo
--   del aparato que vuelve cabe igual, porque en esos días se llenó.
--   ¿Y 48 h no se queda corto? No: los ritmos de abajo son veinte veces lo
--   que se juega de verdad. TODO lo que lleva la cuenta que más ha jugado
--   (IAMBRAIGHTON, dos meses: 1.380 partidas, 25.000 monedas, 14,5 M de
--   experiencia) gastaría menos de 6 h de cupo subido de una sola vez. Así
--   que quien juega de invitado semanas y crea la cuenta después, o vuelve
--   tras días sin conexión, cabe entero.
--
-- LOS RITMOS MÁXIMOS (por hora de juego continuo, sin parar, ni para comer):
--   experiencia      15.000.000  = los puntos de la partida. Una escuadra a
--                    4 × 60.000 por minuto (el techo de DESATADO de la función
--                    enviar-record es 50.000 por minuto y jugador) daría 14,4 M.
--                    La cuenta que más juega lleva 119.000 por hora de media.
--   monedas          15.000     = 200 por partida de un minuto (el tope de
--                    CFG.TIENDA.TOPE_PARTIDA) son 12.000; lo demás, para los
--                    retos y los premios de racha del DAILY. De media se ganan
--                    unas 700 por hora.
--   experiencia del pase (px_<mes>, todas juntas)  75.000 = 5 por moneda
--                    (CFG.PASE.XP_POR_MONEDA).
--   partidas         240        = una cada 15 s. De media, 11 por hora.
--   partidas clasificatorias (rc4_<mes> y siguientes versiones)  240.
--
-- LO QUE NO SALE DEL TIEMPO SINO DE OTROS CONTADORES (tope absoluto):
--   rango   rg<v>_<mes> (PR ganado)   <= 25 por partida clasificatoria
--           DESPUÉS de las 5 de colocación (lo más que da una: CFG.RANGO,
--           `gana` de CEREZA) + 25 de margen.
--           ru<v>_<mes> (PR de la colocación con semilla) <= 50 por cada una
--           de las 5 de colocación (mueven el doble).
--           rm<v>_<mes> (mejor escalón, del que salen las monedas y los
--           premios de fin de temporada): 0 sin haber acabado la colocación
--           (5 partidas); después, el escalón al que llegan esos PR como
--           mucho: colocación (100) + semilla del mes anterior (la mitad de su
--           tope) + ganado + de colocación + 100 de margen (los ajustes a mano
--           de CFG.AJUSTES_CUENTA.rango). Las cuentas de hoy caben todas.
--   bono    (regalo de veterano) <= 5 por partida + 3.000 (50 por logro, y
--           hay 36).
--   pase    todas las px_<mes> juntas <= 5 × monedas ganadas + 5.000.
--           (pxd_<AAAA-MM-DD>, el tope diario del pase desde el 29 sep, NO
--           entra aquí ni se blinda: ninguna expresión de este archivo lo
--           reconoce —'^px_' pide el guion bajo justo después de px—, así que
--           se junta con el mayor como cualquier contador. Solo limita al
--           propio jugador; el tope real sigue siendo el de px_. Comentario
--           solo: el trigger desplegado no cambia.)
--   récords (record*, rhab_*, puntosMax) <= 10.000.000, el de la tabla del
--           top mundial. Tiempos del nivel 1 (tiempo1, mejorT1) >= 20 s, el
--           suelo de la función enviar-record (el mejor de verdad: 48,5 s).
--
-- LO QUE EL JUEGO NO ESCRIBE NUNCA (se queda como estaba):
--   · piezas de COFRE (c_<id>) ni nada de los cofres (cofre_*: abiertos,
--     monedas, base, récords y top 3): lo escribe solo el servidor al
--     abrirlos (supabase/cofres.sql, Edge Function `cofres`) y, el ORO de un
--     récord, este mismo trigger (paso 5). Las del RANGO tampoco: se deducen
--     (Rango.ganado), el contador no se mira.
--   · lo de los REGALOS (29 sep, supabase/tienda.sql): `gastoRegalo` (lo que
--     has gastado regalando) y `rgl_<id>` (esa pieza te la regalaron). Los
--     escribe solo la función regalos_dar, con la service role.
--   · pp_<mes>, el carril de pago del pase: no se vende (CFG.PASE.VENTA).
--   · contadores de una temporada que todavía no ha empezado.
--   · el nombre de usuario y la fecha de alta (el nombre solo lo cambia la
--     service role; el mismo valor se acepta, que es lo que manda el juego).
--   · `purga`: la sube solo una limpieza a mano (servicio o SQL). Antes
--     bastaba con subirla desde el navegador para saltarse TODO lo de arriba.
--   Las piezas del PASE (c_<id> del camino) solo si el camino llega a su
--   galón en alguna temporada (y el carril de pago, si es de pago).
--
-- LAS COMPRAS DE LA TIENDA (29 sep, paso 6; supabase/tienda.sql): una pieza
-- de tienda NUEVA entra solo si el saldo de antes de ella (tienda_saldo, como
-- Tienda.saldo) no es negativo. Deja una pieza fiada como mucho (el caso de
-- dos aparatos sin conexión que gastaron las mismas monedas); la deuda no
-- crece. Sin supabase/tienda.sql puesto, el paso 6 no hace nada.
--
-- Las escrituras de la service role y del SQL a mano no se recortan (son
-- las limpiezas y los regalos), pero sí se apuntan en la auditoría.
--
-- OJO al tocar js/config.js: si cambian CFG.RANGO (escalones), CFG.PASE
-- (DESDE, POR_GALON, las piezas del CAMINO) o aparecen piezas de cofre
-- nuevas, hay que traerlas aquí (piezas_especiales y rango_tramo). Una pieza
-- que no esté en piezas_especiales se trata como de TIENDA (se puede
-- comprar): nada deja de funcionar, solo queda sin blindar.
-- ============================================================

-- ---------- lectura segura de un contador ----------
-- Un contador que no sea un número (un texto, un objeto) cuenta como 0, en
-- vez de tumbar la escritura entera al convertirlo.
create or replace function public.num(j jsonb, k text)
returns numeric
language sql
immutable
as $$
  select case when jsonb_typeof(j -> k) = 'number' then (j ->> k)::numeric else 0 end
$$;

-- ---------- las piezas que no se compran ----------
create table if not exists public.piezas_especiales (
  id      text primary key,                      -- el id del catálogo, sin el c_
  tipo    text not null check (tipo in ('cofre', 'pase', 'rango')),
  galon   smallint,                              -- pase: el galón que la entrega
  carril  text check (carril is null or carril in ('gratis', 'pago'))
);

comment on table public.piezas_especiales is
  'Piezas del vestuario que no se venden (cofre, pase, rango). Copia de js/config.js.';

alter table public.piezas_especiales enable row level security;
revoke all on public.piezas_especiales from anon, authenticated;

insert into public.piezas_especiales (id, tipo, galon, carril) values
  -- de COFRE (PLAN-COFRES.md): efectos, accesorios y skins con grupo 'cofre'
  ('efx_fantasmitas', 'cofre', null, null), ('efx_ojos', 'cofre', null, null),
  ('efx_brasas', 'cofre', null, null), ('efx_niebla', 'cofre', null, null),
  ('efx_portales', 'cofre', null, null), ('efx_constelacion', 'cofre', null, null),
  ('acc_luchador', 'cofre', null, null), ('acc_patito', 'cofre', null, null),
  ('acc_alado', 'cofre', null, null), ('acc_ojo', 'cofre', null, null),
  ('acc_aureola', 'cofre', null, null), ('acc_alas', 'cofre', null, null),
  ('plasma', 'cofre', null, null), ('enjambre', 'cofre', null, null),
  ('galaxia', 'cofre', null, null), ('agujero', 'cofre', null, null),
  ('condor', 'cofre', null, null), ('toro', 'cofre', null, null),
  ('unicornio', 'cofre', null, null), ('fenix', 'cofre', null, null),
  ('genio', 'cofre', null, null), ('triton', 'cofre', null, null),
  -- yōkai (29 sep)
  ('efx_onibi', 'cofre', null, null), ('efx_koi', 'cofre', null, null),
  ('acc_kabuto', 'cofre', null, null), ('acc_raijin', 'cofre', null, null),
  ('kitsune', 'cofre', null, null), ('oni', 'cofre', null, null),
  ('maneki', 'cofre', null, null),
  -- objetos y andina (29 sep)
  ('efx_glitch', 'cofre', null, null), ('efx_cinta', 'cofre', null, null),
  ('efx_polvoro', 'cofre', null, null), ('efx_lineas', 'cofre', null, null),
  ('acc_casco', 'cofre', null, null), ('acc_cadena', 'cofre', null, null),
  ('acc_oro', 'cofre', null, null), ('acc_plumas', 'cofre', null, null),
  ('discos', 'cofre', null, null), ('tele', 'cofre', null, null),
  ('cabina', 'cofre', null, null), ('tumi', 'cofre', null, null),
  ('inti', 'cofre', null, null), ('nazca', 'cofre', null, null),
  -- del PASE (CFG.PASE.CAMINO): galón y carril
  ('grito', 'pase', 10, 'gratis'), ('acc_mochila', 'pase', 10, 'pago'),
  ('efx_ecto', 'pase', 20, 'pago'), ('acc_visor', 'pase', 30, 'gratis'),
  ('trampa', 'pase', 30, 'pago'),
  -- del RANGO (premios de fin de temporada: se deducen, no se guardan)
  ('efx_dorado', 'rango', null, null), ('acc_laureles_2609', 'rango', null, null),
  ('acc_laureles_2610', 'rango', null, null)
on conflict (id) do update
  set tipo = excluded.tipo, galon = excluded.galon, carril = excluded.carril;

-- la temporada de cada pieza del pase (29 sep): sin ella, la experiencia del
-- pase de noviembre abría las piezas del camino de octubre
alter table public.piezas_especiales add column if not exists temporada text;
update public.piezas_especiales set temporada = '2026-10'
 where tipo = 'pase' and id in ('grito', 'acc_mochila', 'efx_ecto', 'acc_visor', 'trampa');

-- ---------- el rango, en el servidor ----------
-- El escalón (0..24) de unos PR: los mismos TRAMOS que js/rango.js arma con
-- CFG.RANGO.DIVISIONES (CEREZA IV = 0 … LLAVE = 24).
create or replace function public.rango_tramo(pr numeric)
returns integer
language sql
immutable
as $$
  select greatest(0, count(*)::integer - 1)
    from unnest(array[0, 25, 50, 75, 100, 125, 150, 175, 200, 235, 270, 305,
                      340, 385, 430, 475, 530, 585, 640, 700, 760, 820, 890,
                      960, 1030]) as d(desde)
   where d.desde <= greatest(coalesce(pr, 0), 0)
$$;

-- Lo MÁS que pueden valer los PR de una temporada con esos contadores
-- (versión v de las reglas, temporada t = 'AAAA-MM'). Generoso a propósito:
--   colocación (100 como mucho, CFG.RANGO.TOPE_COLOCACION)
--   + semilla (la mitad del tope del mes anterior, si se jugó)
--   + PR ganados + PR de la colocación con semilla
--   + 100 de margen (los ajustes a mano de CFG.AJUSTES_CUENTA.rango).
create or replace function public.rango_pr_tope(lg jsonb, v text, t text, prof integer default 0)
returns numeric
language plpgsql
stable
as $$
declare
  ant text;
  semilla numeric := 0;
begin
  if t !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    return 0;
  end if;
  ant := to_char(to_date(t || '-01', 'YYYY-MM-DD') - interval '1 month', 'YYYY-MM');
  if prof < 24 and public.num(lg, 'rc' || v || '_' || ant) > 0 then
    semilla := 0.5 * public.rango_pr_tope(lg, v, ant, prof + 1);
  end if;
  return 100 + semilla
       + public.num(lg, 'rg' || v || '_' || t)
       + public.num(lg, 'ru' || v || '_' || t)
       + 100;
end;
$$;

-- ¿La pieza `pieza` del pase ya le toca? El mes de SU temporada (cada pase
-- tiene su camino: la pieza de octubre no la da la experiencia de noviembre;
-- temporada null = cualquier mes, como antes). Desde el primero del pase
-- (CFG.PASE.DESDE) con experiencia para su galón (CFG.PASE.POR_GALON = 1.500)
-- y, si es del carril de pago, con ese carril (pp_<mes>).
create or replace function public.pase_pieza_ok(lg jsonb, pieza text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
      from public.piezas_especiales p, jsonb_object_keys(lg) k
     where p.id = pieza and p.tipo = 'pase'
       and k ~ '^px_[0-9]{4}-(0[1-9]|1[0-2])$'
       and substr(k, 4) >= '2026-10'
       and (p.temporada is null or substr(k, 4) = p.temporada)
       and floor(public.num(lg, k) / 1500) >= p.galon
       and (p.carril = 'gratis' or public.num(lg, 'pp_' || substr(k, 4)) >= 1)
  )
$$;

-- ---------- el cupo de horas de cada cuenta ----------
create table if not exists public.perfiles_cupo (
  id     uuid primary key references public.perfiles(id) on delete cascade,
  horas  double precision not null,
  t      timestamptz not null default now()
);

comment on table public.perfiles_cupo is
  'Horas jugables que le quedan a cada cuenta para subir contadores (ver perfiles-blindaje.sql).';

alter table public.perfiles_cupo enable row level security;
revoke all on public.perfiles_cupo from anon, authenticated;

-- ---------- la auditoría ----------
create table if not exists public.perfiles_auditoria (
  n         bigserial primary key,
  perfil    uuid not null references public.perfiles(id) on delete cascade,
  usuario   text,
  en        timestamptz not null default now(),
  quien     text not null,              -- 'juego', 'service_role', 'sql', 'limpieza'
  horas     double precision,           -- cupo que quedó después
  cambios   jsonb not null default '{}'::jsonb,   -- { clave: diferencia }
  recortes  jsonb                                 -- { clave: [pedido, aceptado] }
);

comment on table public.perfiles_auditoria is
  'Diferencia de cada escritura en los contadores que dan monedas, rango, piezas, experiencia y récords.';

create index if not exists perfiles_auditoria_perfil_idx
  on public.perfiles_auditoria (perfil, en desc);
create index if not exists perfiles_auditoria_recortes_idx
  on public.perfiles_auditoria (en desc) where recortes is not null;

alter table public.perfiles_auditoria enable row level security;
revoke all on public.perfiles_auditoria from anon, authenticated;
revoke all on sequence public.perfiles_auditoria_n_seq from anon, authenticated;

-- ---------- tamaños ----------
-- `logros` no tenía tope: la fila más grande de hoy son 5,4 kB en texto.
-- `avatar` tampoco (el más largo, 6 letras).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'perfiles_logros_tam_chk') then
    alter table public.perfiles add constraint perfiles_logros_tam_chk
      check (octet_length(logros::text) <= 65536);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'perfiles_avatar_tam_chk') then
    alter table public.perfiles add constraint perfiles_avatar_tam_chk
      check (char_length(avatar) <= 32);
  end if;
end $$;

-- ============================================================
-- EL TRIGGER
-- Lo de cuentas.sql (lo jugado solo crece, la purga) más el blindaje.
-- SECURITY DEFINER para poder escribir el cupo y la auditoría, que el
-- jugador no puede ni leer. Quién escribe se mira con auth.role() (lo que
-- dice el token), no con current_user, que aquí dentro es el dueño.
-- ============================================================
create or replace function public.perfiles_touch()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rol       text := coalesce(auth.role(), '');
  cliente   boolean := coalesce(auth.role(), '') in ('authenticated', 'anon');
  purga_old numeric;
  purga_new numeric;
  lo        jsonb;
  ln        jsonb;
  k         text;
  m         text[];
  vo        numeric;
  vn        numeric;
  tope      numeric;
  mes_tope  text := to_char((now() at time zone 'utc') + interval '1 day', 'YYYY-MM');
  recortes  jsonb := '{}'::jsonb;
  cambios   jsonb;
  quien     text;
  cupo      double precision;
  cupo_t    timestamptz;
  d_xp      numeric;
  d_mon     numeric;
  d_px      numeric;
  d_part    numeric;
  d_rc      numeric;
  pide      double precision := 0;
  f         double precision;
  s_old     numeric;
  s_new     numeric;
  filas     integer;
  nuevas    text[];
  saldo     numeric;
  pr        integer;
begin
  new.actualizado := now();

  -- ---------- ALTA ----------
  -- Las cuentas las da de alta la función `cuenta` (service role). Desde el
  -- juego solo se llega aquí con un upsert sobre una fila que YA existe, y
  -- eso lo resuelve la rama UPDATE de más abajo: se deja pasar tal cual.
  if tg_op = 'INSERT' then
    if cliente and not exists (select 1 from public.perfiles p where p.id = new.id) then
      raise exception 'las cuentas se crean con la funcion cuenta'
        using errcode = '42501';
    end if;
    /* LOS COFRES (supabase/cofres.sql): una cuenta NUEVA de verdad (no el
     * upsert del juego sobre una que ya existe) nace con su base de cofres
     * puesta: el día de hoy y todo lo demás a cero, así que lo que suba
     * después —también lo jugado antes sin cuenta— cuenta para sus cofres. */
    if not cliente then
      if jsonb_typeof(new.logros) is distinct from 'object' then
        new.logros := '{}'::jsonb;
      end if;
      if public.num(new.logros, 'cofre_b_dia') <= 0 then
        new.logros := new.logros || jsonb_build_object('cofre_b_dia',
          floor(extract(epoch from now()) / 86400)::integer);
      end if;
    end if;
    return new;
  end if;

  -- ---------- lo que el juego no cambia ----------
  if cliente then
    new.usuario := old.usuario;       -- el mismo valor pasa; otro, se ignora
    new.creado_en := old.creado_en;
  end if;

  if jsonb_typeof(new.logros) is distinct from 'object' then
    new.logros := case when jsonb_typeof(old.logros) = 'object'
                       then old.logros else '{}'::jsonb end;
  end if;

  /* LO JUGADO SOLO CRECE (24 sep). Cada aparato sube su perfil ENTERO sin
   * leer antes la nube, así que un segundo aparato con datos viejos bajaba
   * partidas, récords y experiencia de la cuenta hasta que el bueno volvía a
   * entrar (y si ese se borraba, se perdían). Ahora, de cada contador de
   * `logros`, de la experiencia y de cada récord se queda el mayor; de los
   * tiempos (mejorT1, tiempo1) el menor. La única forma de BAJAR algo es una
   * limpieza a mano que suba el contador `purga` en la misma escritura. */
  purga_old := public.num(old.logros, 'purga');
  purga_new := public.num(new.logros, 'purga');
  if purga_new > purga_old then
    if not cliente then
      -- limpieza a mano: manda lo que trae, y queda apuntada
      insert into public.perfiles_auditoria (perfil, usuario, quien, cambios)
      values (new.id, new.usuario, 'limpieza',
              jsonb_build_object('purga', purga_new - purga_old));
      return new;
    end if;
    /* 28 sep: desde el juego NO. Subir `purga` desde el navegador se saltaba
     * todo lo de abajo; el juego nunca la sube, solo copia la de la nube. */
    new.logros := jsonb_set(new.logros, '{purga}', to_jsonb(purga_old));
    recortes := recortes || jsonb_build_object('purga', jsonb_build_array(purga_new, purga_old));
    purga_new := purga_old;
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
    new.logros := new.logros || coalesce((
      select jsonb_object_agg(k2,
        case
          /* los tiempos: el menor que no sea cero */
          when k2 ~ 'mejorT1$' then
            case when public.num(new.logros, k2) > 0
                      and public.num(new.logros, k2) < (old.logros->>k2)::numeric
                 then (new.logros->k2) else (old.logros->k2) end
          else to_jsonb(greatest(public.num(new.logros, k2), (old.logros->>k2)::numeric))
        end)
      from jsonb_object_keys(old.logros) as k2
      where jsonb_typeof(old.logros->k2) = 'number'
        and (old.logros->>k2)::numeric > 0
    ), '{}'::jsonb);
  end if;

  -- ============================================================
  -- EL BLINDAJE: solo lo que escribe el juego
  -- ============================================================
  if cliente then
    lo := case when jsonb_typeof(old.logros) = 'object' then old.logros else '{}'::jsonb end;
    ln := new.logros;

    -- ---- 1. claves que el juego no escribe ----
    for k in select jsonb_object_keys(ln) loop
      m := regexp_match(k, '^(?:px|pp|r[a-z][0-9]?)_([0-9]{4}-[0-9]{2})(?:_[1-4])?$');
      if (m is not null and m[1] > mes_tope)                       -- temporada futura
         or k ~ '^pp_'                                             -- carril de pago
         or k like 'cofre\_%'                                      -- cofres: solo el servidor
         or k like 'rgl\_%' or k = 'gastoRegalo'                   -- regalos: solo el servidor
         or (k like 'c\_%' and exists (
               select 1 from public.piezas_especiales p
                where 'c_' || p.id = k and p.tipo in ('cofre', 'rango')))
         or (jsonb_typeof(lo -> k) = 'number' and jsonb_typeof(ln -> k) <> 'number')
      then
        /* un CERO de una clave que la nube no tiene es el almacén del juego
         * (nace con todas a cero), no un intento: se quita sin apuntarlo, o
         * cada guardado dejaba una fila de auditoría con los cofre_* a 0
         * (29 sep) */
        if (ln -> k) = '0'::jsonb and not (lo ? k) then
          ln := ln - k;
        elsif (ln -> k) is distinct from (lo -> k) then
          recortes := recortes || jsonb_build_object(k, jsonb_build_array(ln -> k, lo -> k));
          if lo ? k then ln := jsonb_set(ln, array[k], lo -> k);
          else ln := ln - k;
          end if;
        end if;
      end if;
    end loop;

    -- ---- 2. el cupo de horas ----
    select c.horas, c.t into cupo, cupo_t
      from public.perfiles_cupo c where c.id = new.id for update;
    if not found then
      cupo := 48;
      cupo_t := now();
    end if;
    cupo := least(48, cupo + extract(epoch from (now() - cupo_t)) / 3600.0);

    d_xp := greatest(0, coalesce(new.xp, 0) - coalesce(old.xp, 0));
    d_mon := greatest(0, public.num(ln, 'monedas') - public.num(lo, 'monedas'));
    d_part := greatest(0, public.num(ln, 'partidas') - public.num(lo, 'partidas'));
    select coalesce(sum(greatest(0, public.num(ln, x) - public.num(lo, x))), 0) into d_px
      from jsonb_object_keys(ln) x where x ~ '^px_';
    select coalesce(sum(greatest(0, public.num(ln, x) - public.num(lo, x))), 0) into d_rc
      from jsonb_object_keys(ln) x where x ~ '^rc[4-9]_';

    pide := greatest(d_xp / 15000000.0, d_mon / 15000.0, d_px / 75000.0,
                     d_part / 240.0, d_rc / 240.0);
    if pide > cupo then
      -- cada contador se queda en lo que cabe en el cupo, a su ritmo
      if d_xp > 15000000.0 * cupo then
        recortes := recortes || jsonb_build_object('xp', jsonb_build_array(new.xp, old.xp + floor(15000000.0 * cupo)));
        new.xp := old.xp + floor(15000000.0 * cupo);
      end if;
      if d_mon > 15000.0 * cupo then
        vn := public.num(lo, 'monedas') + floor(15000.0 * cupo);
        recortes := recortes || jsonb_build_object('monedas', jsonb_build_array(ln -> 'monedas', vn));
        ln := jsonb_set(ln, '{monedas}', to_jsonb(vn));
      end if;
      if d_part > 240.0 * cupo then
        vn := public.num(lo, 'partidas') + floor(240.0 * cupo);
        recortes := recortes || jsonb_build_object('partidas', jsonb_build_array(ln -> 'partidas', vn));
        ln := jsonb_set(ln, '{partidas}', to_jsonb(vn));
      end if;
      -- las que van por temporada, en proporción
      if d_px > 75000.0 * cupo then
        f := 75000.0 * cupo / d_px;
        for k in select x from jsonb_object_keys(ln) x
                  where x ~ '^px_' and public.num(ln, x) > public.num(lo, x) loop
          vn := public.num(lo, k) + floor((public.num(ln, k) - public.num(lo, k)) * f);
          recortes := recortes || jsonb_build_object(k, jsonb_build_array(ln -> k, vn));
          ln := jsonb_set(ln, array[k], to_jsonb(vn));
        end loop;
      end if;
      if d_rc > 240.0 * cupo then
        f := 240.0 * cupo / d_rc;
        for k in select x from jsonb_object_keys(ln) x
                  where x ~ '^rc[4-9]_' and public.num(ln, x) > public.num(lo, x) loop
          vn := public.num(lo, k) + floor((public.num(ln, k) - public.num(lo, k)) * f);
          recortes := recortes || jsonb_build_object(k, jsonb_build_array(ln -> k, vn));
          ln := jsonb_set(ln, array[k], to_jsonb(vn));
        end loop;
      end if;
      pide := cupo;
    end if;
    if pide > 0 then
      cupo := greatest(0, cupo - pide);
      insert into public.perfiles_cupo (id, horas, t) values (new.id, cupo, now())
      on conflict (id) do update set horas = excluded.horas, t = excluded.t;
    end if;

    -- ---- 3. lo que sale de otros contadores ----
    -- rango: PR ganados y de colocación, por partidas clasificatorias jugadas
    for k in select x from jsonb_object_keys(ln) x
              where x ~ '^r[gu][4-9]_[0-9]{4}-[0-9]{2}$' loop
      vn := public.num(ln, 'rc' || substr(k, 3, 1) || substr(k, 4));
      tope := case when substr(k, 2, 1) = 'g' then 25 * greatest(0, vn - 5) + 25
                   else 50 * least(vn, 5) end;
      tope := greatest(public.num(lo, k), tope);
      if public.num(ln, k) > tope then
        recortes := recortes || jsonb_build_object(k, jsonb_build_array(ln -> k, tope));
        ln := jsonb_set(ln, array[k], to_jsonb(tope));
      end if;
    end loop;
    -- y el mejor escalón, por esos PR (va después: depende de ellos). Sin
    -- acabar la colocación no hay escalón.
    for k in select x from jsonb_object_keys(ln) x
              where x ~ '^rm[4-9]_[0-9]{4}-[0-9]{2}$' loop
      tope := case when public.num(ln, 'rc' || substr(k, 3, 1) || '_' || substr(k, 5)) < 5 then 0
                   else public.rango_tramo(public.rango_pr_tope(ln, substr(k, 3, 1), substr(k, 5))) + 1 end;
      tope := greatest(public.num(lo, k), tope);
      if public.num(ln, k) > tope then
        recortes := recortes || jsonb_build_object(k, jsonb_build_array(ln -> k, tope));
        ln := jsonb_set(ln, array[k], to_jsonb(tope));
      end if;
    end loop;

    -- el regalo de veterano: 5 por partida y 50 por logro (hay 36)
    tope := greatest(public.num(lo, 'bono'), 5 * public.num(ln, 'partidas') + 3000);
    if public.num(ln, 'bono') > tope then
      recortes := recortes || jsonb_build_object('bono', jsonb_build_array(ln -> 'bono', tope));
      ln := jsonb_set(ln, '{bono}', to_jsonb(tope));
    end if;

    -- la experiencia del pase sale de las monedas: 5 por moneda
    select coalesce(sum(public.num(lo, x)), 0) into s_old from jsonb_object_keys(lo) x where x ~ '^px_';
    select coalesce(sum(public.num(ln, x)), 0) into s_new from jsonb_object_keys(ln) x where x ~ '^px_';
    tope := greatest(s_old, 5 * public.num(ln, 'monedas') + 5000);
    if s_new > tope and s_new > s_old then
      f := (tope - s_old) / (s_new - s_old);
      for k in select x from jsonb_object_keys(ln) x
                where x ~ '^px_' and public.num(ln, x) > public.num(lo, x) loop
        vn := public.num(lo, k) + floor((public.num(ln, k) - public.num(lo, k)) * f);
        recortes := recortes || jsonb_build_object(k, jsonb_build_array(ln -> k, vn));
        ln := jsonb_set(ln, array[k], to_jsonb(vn));
      end loop;
    end if;

    -- las piezas del pase: solo si el camino llega
    for k in select x from jsonb_object_keys(ln) x
              where x like 'c\_%' and public.num(ln, x) > public.num(lo, x) loop
      if exists (select 1 from public.piezas_especiales p
                  where 'c_' || p.id = k and p.tipo = 'pase')
         and not public.pase_pieza_ok(ln, substr(k, 3)) then
        recortes := recortes || jsonb_build_object(k, jsonb_build_array(ln -> k, lo -> k));
        if lo ? k then ln := jsonb_set(ln, array[k], lo -> k); else ln := ln - k; end if;
      end if;
    end loop;

    -- ---- 4. récords y tiempos ----
    for k in select x from jsonb_object_keys(ln) x
              where x ~ '^rhab_' or x ~ '(^|:)puntosMax$' loop
      tope := greatest(public.num(lo, k), 10000000);
      if public.num(ln, k) > tope then
        recortes := recortes || jsonb_build_object(k, jsonb_build_array(ln -> k, tope));
        ln := jsonb_set(ln, array[k], to_jsonb(tope));
      end if;
    end loop;
    for k in select x from jsonb_object_keys(ln) x where x ~ 'mejorT1$' loop
      vn := public.num(ln, k);
      if vn > 0 and vn < 2000 and (ln -> k) is distinct from (lo -> k) then
        recortes := recortes || jsonb_build_object(k, jsonb_build_array(ln -> k, lo -> k));
        if lo ? k then ln := jsonb_set(ln, array[k], lo -> k); else ln := ln - k; end if;
      end if;
    end loop;
    if new.tiempo1 is not null and new.tiempo1 < 2000
       and new.tiempo1 is distinct from old.tiempo1 then
      recortes := recortes || jsonb_build_object('tiempo1', jsonb_build_array(new.tiempo1, old.tiempo1));
      new.tiempo1 := old.tiempo1;
    end if;
    for k in select unnest(array['record1', 'record2', 'record3', 'record4',
                                 'record_lab', 'record_lab2', 'record_lab3', 'record_lab4',
                                 'record_hab', 'record_hab2', 'record_hab3', 'record_hab4']) loop
      vn := (to_jsonb(new) ->> k)::numeric;
      vo := (to_jsonb(old) ->> k)::numeric;
      if vn > greatest(vo, 10000000) then
        recortes := recortes || jsonb_build_object(k, jsonb_build_array(vn, greatest(vo, 10000000)));
        new := jsonb_populate_record(new, jsonb_build_object(k, greatest(vo, 10000000)));
      end if;
    end loop;

    -- ---- 5. LOS COFRES: el ORO de un récord (supabase/cofres.sql) ----
    -- Un récord propio da un cofre de ORO si mejora el anterior en un 10 % o
    -- más, el anterior ya era de 10.000 o más, y como mucho uno por ruta (cada
    -- columna de récord) y día. Lo cuenta ESTE trigger, que es el único que
    -- ve cada récord subir, en `cofre_recs` (que el juego no puede escribir:
    -- ver el paso 1). Sin la tabla de cofres, no hace nada.
    if to_regclass('public.cofres_recordes') is not null then
      for k in select unnest(array['record1', 'record2', 'record3', 'record4',
                                   'record_lab', 'record_lab2', 'record_lab3', 'record_lab4',
                                   'record_hab', 'record_hab2', 'record_hab3', 'record_hab4']) loop
        vo := coalesce((to_jsonb(old) ->> k)::numeric, 0);
        vn := coalesce((to_jsonb(new) ->> k)::numeric, 0);
        if vo >= 10000 and vn * 100 >= vo * 110 then
          insert into public.cofres_recordes (perfil, ruta, dia)
          values (new.id, k, (now() at time zone 'utc')::date)
          on conflict do nothing;
          get diagnostics filas = row_count;
          if filas > 0 then
            ln := jsonb_set(ln, '{cofre_recs}', to_jsonb(public.num(ln, 'cofre_recs') + 1));
          end if;
        end if;
      end loop;
    end if;

    -- ---- 6. LAS COMPRAS DE LA TIENDA, con saldo (supabase/tienda.sql) ----
    -- Cada pieza de tienda que llega NUEVA, de la más barata a la más cara,
    -- entra si el saldo ANTES de ella no es negativo (tienda_saldo, el mismo
    -- cálculo que Tienda.saldo). Así cabe la deuda legítima de dos aparatos
    -- sin conexión que gastaron las mismas monedas (una pieza fiada, que se
    -- paga con lo siguiente que se gane), pero la deuda no puede crecer: con
    -- el saldo en negativo no entra ninguna más. La que no entra se queda en
    -- el aparato y vuelve a subir en cada guardado; entra sola cuando haya
    -- saldo. Sin la tabla de precios, no hace nada.
    if to_regclass('public.tienda_precios') is not null then
      select array_agg(p.id order by p.precio, p.id) into nuevas
        from public.tienda_precios p
       where public.num(ln, 'c_' || p.id) >= 1 and public.num(lo, 'c_' || p.id) < 1
         and public.num(ln, 'rgl_' || p.id) < 1;
      if nuevas is not null then
        saldo := public.tienda_saldo(ln, new.usuario)
               + (select coalesce(sum(p.precio), 0) from public.tienda_precios p where p.id = any(nuevas));
        foreach k in array nuevas loop
          select p.precio into pr from public.tienda_precios p where p.id = k;
          if saldo >= 0 then
            saldo := saldo - pr;
          else
            recortes := recortes || jsonb_build_object('c_' || k,
                          jsonb_build_array(ln -> ('c_' || k), lo -> ('c_' || k)));
            if lo ? ('c_' || k) then ln := jsonb_set(ln, array['c_' || k], lo -> ('c_' || k));
            else ln := ln - ('c_' || k);
            end if;
          end if;
        end loop;
      end if;
    end if;

    new.logros := ln;
  end if;

  -- ============================================================
  -- LA AUDITORÍA: la diferencia de lo que importa, sea quien sea
  -- ============================================================
  select jsonb_object_agg(x, d) into cambios from (
    select x, public.num(new.logros, x) - public.num(old.logros, x) as d
      from (select jsonb_object_keys(new.logros) union
            select jsonb_object_keys(case when jsonb_typeof(old.logros) = 'object'
                                          then old.logros else '{}'::jsonb end)) s(x)
     where x in ('monedas', 'bono', 'gastoCont', 'gastoRegalo', 'partidas', 'purga', 'largas')
        or x ~ '^(p[xp]|r[a-z][0-9]?|rhab|mae[a-z]*)_'
        or x like 'c\_%' or x like 'rgl\_%'
        or (x like 'cofre\_%' and x not like 'cofre\_b\_%')
  ) t where d <> 0;
  for k in select unnest(array['xp', 'record1', 'record2', 'record3', 'record4',
                               'record_lab', 'record_lab2', 'record_lab3', 'record_lab4',
                               'record_hab', 'record_hab2', 'record_hab3', 'record_hab4']) loop
    vn := coalesce((to_jsonb(new) ->> k)::numeric, 0) - coalesce((to_jsonb(old) ->> k)::numeric, 0);
    if vn <> 0 then
      cambios := coalesce(cambios, '{}'::jsonb) || jsonb_build_object(k, vn);
    end if;
  end loop;

  if cambios is not null or recortes <> '{}'::jsonb then
    quien := case when cliente then 'juego'
                  when rol <> '' then rol
                  else 'sql' end;
    insert into public.perfiles_auditoria (perfil, usuario, quien, horas, cambios, recortes)
    values (new.id, new.usuario, quien,
            case when cliente then cupo end,
            coalesce(cambios, '{}'::jsonb),
            nullif(recortes, '{}'::jsonb));
  end if;

  return new;
end;
$$;

drop trigger if exists perfiles_touch_trg on public.perfiles;
create trigger perfiles_touch_trg
  before insert or update on public.perfiles
  for each row execute function public.perfiles_touch();

-- ============================================================
-- CÓMO MIRAR Y CÓMO DESHACER
--
-- Lo recortado en los últimos días:
--   select en, usuario, recortes from perfiles_auditoria
--    where recortes is not null order by en desc limit 50;
--
-- Lo que más monedas ha subido de una vez:
--   select en, usuario, (cambios->>'monedas')::numeric as monedas, cambios
--     from perfiles_auditoria where cambios ? 'monedas'
--    order by 3 desc limit 20;
--
-- DESHACER una subida tramposa: en la nube NO basta con bajar el contador
-- (un aparato con el número malo lo vuelve a subir). Se hace como las
-- limpiezas de siempre: en la MISMA escritura se sube `purga` y se ponen los
-- valores buenos (restando las diferencias de la auditoría). Los aparatos que
-- traen una purga más vieja toman la nube tal cual al entrar. Si además hay
-- que corregirlo en los aparatos que no vuelvan a entrar, CFG.AJUSTES_CUENTA
-- en js/config.js.
--   update perfiles
--      set logros = logros || jsonb_build_object(
--            'purga', coalesce((logros->>'purga')::int, 0) + 1,
--            'monedas', (logros->>'monedas')::numeric - <lo tramposo>)
--    where usuario = '<USUARIO>';
-- ============================================================
