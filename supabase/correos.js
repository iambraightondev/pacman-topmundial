/* ============================================================
 * PAC-MAN TOP MUNDIAL — supabase/correos.js
 *
 * Las plantillas de los correos que manda Supabase, en español y
 * con la pinta del juego. Por defecto vienen en inglés y con el
 * estilo de Supabase, que en un juego en español entre amigos
 * parece cualquier cosa menos de fiar — y un correo de "recupera tu
 * contraseña" que no parece tuyo acaba en la papelera.
 *
 * SE APLICA DESPUÉS DEL SMTP, no antes. Supabase no deja tocar las
 * plantillas mientras el proyecto use su remitente de prueba:
 *   "Email template modification is not available for free tier
 *    projects using the default email provider."
 * Así que el orden es: primero SMTP propio (Authentication → SMTP
 * Settings), y luego esto.
 *
 *   SBP=<personal access token> node supabase/correos.js
 *   node supabase/correos.js --ver=<carpeta>     solo para mirarlos
 *
 * Se puede ejecutar tantas veces como haga falta.
 *
 * Las imágenes (marco, rótulos, botones) las dibuja
 * correos-imagenes.js y se sirven desde producción: si cambia un
 * rótulo, primero aquello, publicar, y luego esto.
 * ============================================================ */
'use strict';

var REF = 'uamaukghqakuhacfpdsf';
var SBP = process.env.SBP;
var P = require('./correos-piezas.js');
var MED = require('./correos-medidas.json');

/* Los correos se leen en clientes que se comen las hojas de estilo y las
 * letras propias, así que todo va EN LÍNEA, en tablas, y lo que tiene que ir
 * en letra de máquina (título, rótulo, botón) va como imagen, con los estilos
 * del marco de recreativa del juego. El texto corrido sí es texto: se lee
 * aunque las imágenes no carguen. */
var LETRA = "font-family:'Press Start 2P','Courier New',Courier,monospace;";

function img(pieza, alt, extra) {
  var m = MED[pieza];
  return '<img src="' + P.BASE + pieza + '.png" width="' + m.w + '" height="' + m.h + '" alt="' + alt + '" ' +
    'style="display:block;border:0;outline:none;max-width:100%;height:auto;' + LETRA + 'font-weight:bold;' + (extra || '') + '">';
}

function carta(rotulo, cuerpo, pie) {
  var A = P.ANCHO, r = P.ROTULOS[rotulo];
  return '<div style="background:#000000;padding:24px 0;">\n' +
'<table role="presentation" align="center" width="' + A + '" cellpadding="0" cellspacing="0" border="0" style="width:' + A + 'px;max-width:100%;margin:0 auto;border-collapse:collapse;background:' + P.FONDO + ';">\n' +
'  <tr><td style="padding:0;line-height:0;font-size:0;">' +
      img('cabecera', 'PAC-MAN TOP MUNDIAL', 'color:#ffff00;font-size:24px;line-height:60px;text-align:center;') + '</td></tr>\n' +
'  <tr><td background="' + P.BASE + 'lado.png" bgcolor="' + P.FONDO + '" style="padding:14px 46px 10px;background:' + P.FONDO + ' url(' + P.BASE + 'lado.png) repeat-y center top;background-size:100% auto;">\n' +
'    <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;"><tr><td>' +
      img('rotulo-' + rotulo, r.texto, 'color:' + (r.aviso ? '#ffb852' : '#ffffff') + ';font-size:16px;line-height:40px;text-align:center;') + '</td></tr></table>\n' +
'    ' + cuerpo + '\n' +
'  </td></tr>\n' +
'  <tr><td style="padding:0;line-height:0;font-size:0;">' + img('pie', '') + '</td></tr>\n' +
'</table>\n' +
'<p style="max-width:' + (A - 40) + 'px;margin:18px auto 0;padding:0 20px;color:#aeb0d4;' + LETRA + 'font-size:12px;line-height:1.8;letter-spacing:1px;text-align:center;text-transform:uppercase;">' + pie + '</p>\n' +
'</div>';
}

/* {{ .ConfirmationURL }} lo rellena Supabase con el enlace de un solo uso */
function boton(cual) {
  return '<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td>\n' +
'      <a href="{{ .ConfirmationURL }}" style="display:block;text-decoration:none;color:#ffff00;">' +
        img('boton-' + cual, P.BOTONES[cual], 'color:#ffff00;font-size:15px;line-height:60px;text-align:center;') + '</a>\n' +
'    </td></tr></table>\n' +
'    <p style="margin:0 0 10px;color:#aeb0d4;' + LETRA + 'font-size:12px;line-height:1.8;letter-spacing:1px;text-align:center;text-transform:uppercase;">Si el botón no te funciona, copia esta dirección en el navegador:</p>\n' +
/* el color va EN el enlace: Gmail convierte la dirección en enlace y, sin
 * esto, la pinta de su azul oscuro, que sobre negro no se lee */
'    <p style="margin:0 0 22px;padding:12px;background:#000000;border:2px solid #2121ff;font-family:\'Courier New\',Courier,monospace;font-size:12px;line-height:1.6;word-break:break-all;">\n' +
'      <a href="{{ .ConfirmationURL }}" style="color:#00ffff;text-decoration:underline;">{{ .ConfirmationURL }}</a>\n' +
'    </p>';
}

/* El texto corrido, como las descripciones del juego: mayúsculas, espaciado
 * y lila claro. `tono` = 'pie' para la letra pequeña. */
function p(t, tono) {
  return '<p style="margin:0 0 16px;color:' + (tono === 'pie' ? '#aeb0d4' : '#d6d6f0') + ';' + LETRA +
    'font-size:' + (tono === 'pie' ? 12 : 14) + 'px;font-weight:bold;line-height:1.9;letter-spacing:1px;text-align:center;text-transform:uppercase;">' + t + '</p>';
}
var AVISO = '<span style="color:#ffb852;">';

var config = {
  /* El que importa: el enlace para volver a entrar */
  mailer_subjects_recovery: 'Recupera tu cuenta de PAC-MAN TOP MUNDIAL',
  mailer_templates_recovery_content: carta(
    'recuperar',
    p('Has pedido volver a entrar. Pulsa el botón y te dejamos poner una contraseña nueva; tu progreso sigue donde estaba.') +
    boton('recuperar') +
    p('¿No has sido tú? No hagas nada. Mientras no se abra el enlace, tu contraseña sigue igual.', 'pie'),
    'Este correo se manda solo cuando alguien lo pide desde el juego.'),

  /* Aviso de que la contraseña ha cambiado: es la señal de alarma si el que
   * la ha cambiado no eres tú */
  mailer_subjects_password_changed_notification:
    'Tu contraseña de PAC-MAN TOP MUNDIAL ha cambiado',
  mailer_templates_password_changed_notification_content: carta(
    'clave',
    p('La contraseña de tu cuenta acaba de cambiar. Si has sido tú, aquí no hay nada que hacer.') +
    p(AVISO + 'Si NO has sido tú</span>, entra en el juego y pide recuperar la cuenta cuanto antes.'),
    'PAC-MAN TOP MUNDIAL'),

  mailer_subjects_email_change: 'Confirma tu correo de PAC-MAN TOP MUNDIAL',
  mailer_templates_email_change_content: carta(
    'confirma',
    p('Has puesto <span style="color:#ffff00;text-transform:none;">{{ .NewEmail }}</span> como correo de recuperación de tu cuenta. Confírmalo y listo.') +
    boton('confirma'),
    'Sirve para una sola cosa: devolverte la cuenta si olvidas la contraseña.'),

  mailer_subjects_email_changed_notification:
    'El correo de tu cuenta de PAC-MAN TOP MUNDIAL ha cambiado',
  mailer_templates_email_changed_notification_content: carta(
    'correo',
    p('El correo de recuperación de tu cuenta acaba de cambiar.') +
    p(AVISO + 'Si no has sido tú</span>, avisa a quien lleva el juego.'),
    'PAC-MAN TOP MUNDIAL')
};

/* --ver=<carpeta>: en vez de aplicarlos, deja cada correo en un .html con las
 * imágenes de icons/correo de este repo, para mirarlo antes de publicar. */
var ver = process.argv.filter(function (a) { return a.indexOf('--ver=') === 0; })[0];
if (ver) {
  var fs = require('fs'), path = require('path');
  var local = 'file:///' + path.join(__dirname, '..', 'icons', 'correo').replace(/\\/g, '/') + '/';
  Object.keys(config).filter(function (k) { return /_content$/.test(k); }).forEach(function (k) {
    var f = path.join(ver.slice(6), k.replace(/^mailer_templates_|_content$/g, '') + '.html');
    fs.writeFileSync(f, '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000">' +
      config[k].split(P.BASE).join(local)
        .replace(/\{\{ \.ConfirmationURL \}\}/g, 'https://' + REF + '.supabase.co/auth/v1/verify?token=0203ef43c2e1a56a2d5960781c500a9f41f0580e5c8cbef168fa2766&amp;type=recovery&amp;redirect_to=https://pacman-topmundial.vercel.app')
        .replace(/\{\{ \.NewEmail \}\}/g, 'jugador@example.com'));
    console.log(f);
  });
  process.exit(0);
}

if (!SBP) {
  console.log('Falta el token: SBP=<personal access token> node supabase/correos.js');
  process.exit(1);
}

fetch('https://api.supabase.com/v1/projects/' + REF + '/config/auth', {
  method: 'PATCH',
  headers: { Authorization: 'Bearer ' + SBP, 'Content-Type': 'application/json' },
  body: JSON.stringify(config)
}).then(function (r) {
  return r.text().then(function (t) {
    if (!r.ok) {
      console.log(r.status, t.slice(0, 400));
      if (/default email provider/i.test(t)) {
        console.log('\n-> Falta el SMTP propio. Ponlo primero en el panel de');
        console.log('   Supabase (Authentication -> SMTP Settings) y vuelve a lanzar esto.');
      }
      process.exitCode = 1;
      return;
    }
    var j = JSON.parse(t);
    console.log('asunto de recuperación :', j.mailer_subjects_recovery);
    console.log('plantilla en español   :',
      /RECUPERAR TU CUENTA/.test(j.mailer_templates_recovery_content || '') ? 'sí' : 'NO');
  });
});
