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
    SUPABASE_URL: '',   // p. ej. 'https://abcd1234.supabase.co'
    SUPABASE_KEY: ''    // clave anon (eyJ...) o publishable (sb_publishable_...)
  };
})();
