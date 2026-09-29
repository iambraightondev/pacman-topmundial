-- ============================================================
-- VUELTA ATRÁS de la tanda YŌKAI en el servidor (29 sep 2026)
--
-- Lo que se puso en producción al meter la tanda:
--   · las 7 piezas de cofre en piezas_especiales (perfiles-blindaje.sql y
--     cofres.sql las llevan ya);
--   · los 21 precios de tienda en tienda_precios (tienda-precios.sql);
--   · la función `cofres` con los datos nuevos (functions/cofres/datos.js).
--
-- Esto quita las dos primeras. La función se vuelve a la de antes con:
--   git show 071da26:supabase/functions/cofres/datos.js > supabase/functions/cofres/datos.js
--   SBP=<token> node supabase/desplegar-funcion.js cofres
-- (y luego git checkout del datos.js). Solo tiene sentido si el juego
-- publicado vuelve también a no tener la tanda: con el juego nuevo y el
-- servidor viejo, lo comprado de la tanda saldría «a deuda».
-- ============================================================

delete from public.piezas_especiales
 where id in ('efx_onibi', 'efx_koi', 'acc_kabuto', 'acc_raijin', 'kitsune', 'oni', 'maneki');

delete from public.tienda_precios
 where id in ('tengu', 'kappa', 'tanuki', 'daruma', 'kasa', 'chochin', 'namazu',
              'acc_kitsunemen', 'acc_kasa', 'acc_chonmage', 'acc_ramen', 'acc_katana',
              'efx_torii', 'efx_olas', 'efx_origami', 'efx_farolillos',
              'kawaii', 'banzai', 'itadakimasu', 'zen', 'ninja');
