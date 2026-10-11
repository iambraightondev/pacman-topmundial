/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/correos-piezas.js
 *
 * Lo que comparten correos-imagenes.js (que dibuja las piezas) y
 * correos.js (que monta los correos con ellas): el ancho, el color
 * de fondo y los rótulos que van en letra de máquina.
 * ============================================================ */
'use strict';

module.exports = {
  ANCHO: 560,
  FONDO: '#05051a',
  /* de dónde piden las imágenes los correos */
  BASE: 'https://pacman-topmundial.vercel.app/icons/correo/',
  ROTULOS: {
    recuperar: { texto: 'RECUPERAR TU CUENTA' },
    clave: { texto: 'CONTRASEÑA CAMBIADA', aviso: true },
    confirma: { texto: 'CONFIRMA TU CORREO' },
    correo: { texto: 'CORREO CAMBIADO', aviso: true }
  },
  BOTONES: {
    recuperar: 'PONER CONTRASEÑA NUEVA',
    confirma: 'CONFIRMAR CORREO'
  }
};
