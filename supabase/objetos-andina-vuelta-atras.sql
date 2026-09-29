-- ============================================================
-- VUELTA ATRÁS de las tandas de OBJETOS y ANDINA en el servidor (29 sep 2026)
--
-- Lo que se puso en producción al meter las dos tandas:
--   · las 14 piezas de cofre en piezas_especiales (perfiles-blindaje.sql y
--     cofres.sql las llevan ya);
--   · los 37 precios de tienda en tienda_precios (tienda-precios.sql);
--   · la función `cofres` con los datos nuevos (functions/cofres/datos.js).
--
-- Esto quita las dos primeras. La función se vuelve a la de antes con:
--   git show 45de9e1:supabase/functions/cofres/datos.js > supabase/functions/cofres/datos.js
--   SBP=<token> node supabase/desplegar-funcion.js cofres
-- (y luego git checkout del datos.js). Solo tiene sentido si el juego
-- publicado vuelve también a no tener las tandas: con el juego nuevo y el
-- servidor viejo, lo comprado de ellas saldría «a deuda».
-- ============================================================

delete from public.piezas_especiales
 where id in ('efx_glitch', 'efx_cinta', 'efx_polvoro', 'efx_lineas',
              'acc_casco', 'acc_cadena', 'acc_oro', 'acc_plumas',
              'discos', 'tele', 'cabina', 'tumi', 'inti', 'nazca');

delete from public.tienda_precios
 where id in ('camara', 'reloj', 'semaforo', 'caja', 'bola',
              'gallito', 'puma', 'papa', 'aji', 'sapo',
              'acc_3d', 'acc_corona', 'acc_boina', 'acc_monoculo', 'acc_moto',
              'acc_montera', 'acc_poncho', 'acc_quena', 'acc_orejeras', 'acc_trenzas',
              'efx_neon', 'efx_polaroids', 'efx_tickets',
              'efx_coca', 'efx_granizo', 'efx_serpentina', 'efx_tejido',
              'alucinado', 'pensando', 'roto', 'aplauso', 'chist',
              'achachau', 'huayno', 'chevere', 'chau', 'rico');
