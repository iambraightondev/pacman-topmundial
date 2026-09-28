-- ============================================================
-- PAC-MAN TOP MUNDIAL — supabase/seguridad-vuelta-atras.sql
-- VUELTA ATRÁS de los arreglos de seguridad del 28 sep 2026.
--
-- Cada bloque deshace UN archivo y se puede lanzar por separado (si se
-- deshace todo, de abajo arriba). Nada de aquí borra datos de jugadores:
-- solo quita las tablas nuevas de control (cupo, auditoría, frenos, avales),
-- triggers y permisos, y devuelve las funciones a como estaban en producción
-- ese día (copiadas de la base de datos antes de tocarlas).
--
-- Las Edge Functions se vuelven atrás desplegando la versión anterior del
-- repositorio (commit e5ac575), con supabase/desplegar-funcion.js:
--   git show e5ac575:supabase/functions/cuenta/index.ts > cuenta-vieja.ts
--   SBP=<token> node supabase/desplegar-funcion.js cuenta cuenta-vieja.ts
-- (y lo mismo con enviar-record). Y los ajustes de Auth, en su bloque.
-- ============================================================

-- ------------------------------------------------------------
-- 1) supabase/perfiles-blindaje.sql
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.perfiles_touch()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
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

alter function public.perfiles_touch() security invoker;
alter function public.perfiles_touch() reset all;

drop trigger if exists perfiles_touch_trg on public.perfiles;
create trigger perfiles_touch_trg
  before insert or update on public.perfiles
  for each row execute function public.perfiles_touch();

alter table public.perfiles drop constraint if exists perfiles_logros_tam_chk;
alter table public.perfiles drop constraint if exists perfiles_avatar_tam_chk;
-- La auditoría se puede guardar antes de tirarla:
--   create table public.perfiles_auditoria_copia as select * from public.perfiles_auditoria;
drop table if exists public.perfiles_auditoria;
drop table if exists public.perfiles_cupo;
drop function if exists public.pase_pieza_ok(jsonb, text);
drop function if exists public.rango_pr_tope(jsonb, text, text, integer);
drop function if exists public.rango_tramo(numeric);
drop table if exists public.piezas_especiales;
-- public.num(jsonb, text) se queda: no molesta y la usan los otros bloques.

-- ------------------------------------------------------------
-- 2) supabase/repeticiones-freno.sql
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repeticiones_freno()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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

CREATE OR REPLACE FUNCTION public.destacar_repeticion(p_id text, p_destacada boolean, p_titulo text)
 RETURNS TABLE(id text, destacada boolean, titulo text, dueno uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  yo uuid := auth.uid();
  limpio text := nullif(btrim(upper(coalesce(p_titulo, ''))), '');
begin
  if yo is null then
    raise exception 'necesitas una cuenta';
  end if;
  if limpio is not null and char_length(limpio) > 32 then
    limpio := left(limpio, 32);
  end if;
  return query
    update public.repeticiones r
       set destacada = coalesce(p_destacada, false),
           titulo = case when coalesce(p_destacada, false) then limpio else null end,
           dueno = yo
     where r.id = p_id and (r.dueno = yo or r.dueno is null)
    returning r.id, r.destacada, r.titulo, r.dueno;
end;
$$;

revoke insert (id, jugadores, puntos, nivel, nombres, datos, tipo, t_partida)
  on public.repeticiones from anon, authenticated;
grant insert, truncate, references, trigger on public.repeticiones to anon, authenticated;
drop table if exists public.repeticiones_frenos;
drop function if exists public.ip_cliente();
