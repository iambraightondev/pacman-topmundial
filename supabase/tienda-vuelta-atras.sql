-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/tienda-vuelta-atras.sql
-- DESHACER supabase/tienda.sql (precios en el servidor y regalos, 29 sep 2026)
--
-- 1) El trigger de perfiles vuelve a ser EXACTAMENTE el de antes (copiado de
--    producción el 29 sep con pg_get_functiondef, antes de cambiarlo): sin el
--    paso 6 (las compras con saldo) y sin bloquear gastoRegalo ni rgl_<id>.
-- 2) Fuera las funciones de la tienda y de los regalos (la Edge Function
--    `regalos` deja de poder regalar: contesta con un error y el juego lo
--    enseña; nada más se rompe).
-- 3) Las TABLAS no se borran: tienda_precios y tienda_datos no molestan (sin
--    tienda_saldo nadie las lee) y `regalos` es el historial de lo regalado.
--    Si de verdad hay que quitarlas, las líneas del final (comentadas).
--
-- Lo ya regalado se queda donde está: el receptor tiene su pieza (c_<id> y
-- rgl_<id>) y el que regaló su gastoRegalo. El juego de ahora los sigue
-- contando bien; ninguna pieza desaparece.
-- ============================================================

-- ---------- 1. el trigger de antes ----------
CREATE OR REPLACE FUNCTION public.perfiles_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
         or (k like 'c\_%' and exists (
               select 1 from public.piezas_especiales p
                where 'c_' || p.id = k and p.tipo in ('cofre', 'rango')))
         or (jsonb_typeof(lo -> k) = 'number' and jsonb_typeof(ln -> k) <> 'number')
      then
        if (ln -> k) is distinct from (lo -> k) then
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
     where x in ('monedas', 'bono', 'gastoCont', 'partidas', 'purga', 'largas')
        or x ~ '^(p[xp]|r[a-z][0-9]?|rhab|mae[a-z]*)_'
        or x like 'c\_%'
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
$function$;

-- ---------- 2. las funciones nuevas ----------
drop function if exists public.regalos_dar(uuid, text, text);
drop function if exists public.regalos_amigos(uuid, text);
drop function if exists public.regalos_avisos(uuid);
drop function if exists public.regalos_vistos(uuid, bigint);
drop function if exists public.regalos_tope_dia();
drop function if exists public.tienda_saldo(jsonb, text);

-- ---------- 3. las tablas (solo si hace falta de verdad) ----------
-- drop table if exists public.regalos;
-- drop table if exists public.tienda_datos;
-- drop table if exists public.tienda_precios;
