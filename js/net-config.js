/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/net-config.js
 * Credenciales de Supabase para el modo online.
 *
 * Rellena los dos valores con los de tu proyecto de Supabase
 * (Dashboard → Settings → API). La clave "anon" / "publishable"
 * es pública por diseño: puede ir en el cliente sin riesgo.
 * El modo online solo usa canales Realtime (broadcast): no crea
 * tablas ni escribe nada en la base de datos.
 *
 * LOS DATOS Y EL CANAL VAN POR SEPARADO (10 oct 2026). El 10 de octubre las
 * partidas online agotaron la cuota de mensajes del plan gratuito y Supabase
 * restringió el proyecto ENTERO: sin login ni ranking por culpa del canal.
 *
 *   · SUPABASE_URL / SUPABASE_KEY: el proyecto de los DATOS (cuentas,
 *     ranking, repeticiones, tienda, funciones). Uno solo y fijo.
 *   · CANALES: los proyectos por los que van las partidas online, en orden
 *     de preferencia. No guardan nada, así que cambiar de uno a otro no
 *     mueve ningún dato. El juego usa el primero que no esté restringido
 *     (ver Net.sondearCanales, js/net.js) y salta solo al siguiente.
 *     Vacío o sin poner: el canal va por el proyecto de los datos.
 * ============================================================ */
(function () {
  'use strict';
  window.PM = window.PM || {};
  window.PM.NET_CFG = {
    SUPABASE_URL: 'https://yghnwkifbmmhrpvtjjit.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnaG53a2lmYm1taHJwdnRqaml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNzAwODcsImV4cCI6MjEwMDk0NjA4N30.YrDxWlKxIlYCGsr53DU--DISLtOWOHf-BdDPNJMG9mU',
    /* { url, key } de cada proyecto de canal, el preferido primero */
    CANALES: []
  };
})();
