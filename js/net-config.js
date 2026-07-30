/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/net-config.js
 * Credenciales de Supabase para el modo online.
 *
 * Rellena los dos valores con los de tu proyecto de Supabase
 * (Dashboard → Settings → API). La clave "anon" / "publishable"
 * es pública por diseño: puede ir en el cliente sin riesgo.
 * El modo online solo usa canales Realtime (broadcast): no crea
 * tablas ni escribe nada en la base de datos.
 * ============================================================ */
(function () {
  'use strict';
  window.PM = window.PM || {};
  window.PM.NET_CFG = {
    SUPABASE_URL: 'https://yghnwkifbmmhrpvtjjit.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnaG53a2lmYm1taHJwdnRqaml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNzAwODcsImV4cCI6MjEwMDk0NjA4N30.YrDxWlKxIlYCGsr53DU--DISLtOWOHf-BdDPNJMG9mU'
  };
})();
