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
 *
 * Se puede ejecutar tantas veces como haga falta.
 * ============================================================ */
'use strict';

var REF = 'yghnwkifbmmhrpvtjjit';
var SBP = process.env.SBP;

if (!SBP) {
  console.log('Falta el token: SBP=<personal access token> node supabase/correos.js');
  process.exit(1);
}

/* Los correos se leen en clientes que se comen las hojas de estilo, así que
 * todo va EN LÍNEA. Fondo oscuro, amarillo y azul: los del juego. */
function carta(titulo, cuerpo, pie) {
  return '<div style="background:#000000;padding:32px 16px;font-family:\'Courier New\',Courier,monospace;">\n' +
'  <div style="max-width:480px;margin:0 auto;background:#0a0a14;border:2px solid #2121ff;border-radius:12px;padding:28px 24px;">\n' +
'    <p style="margin:0 0 2px;color:#ffff00;font-size:24px;font-weight:bold;letter-spacing:4px;text-align:center;">PAC-MAN</p>\n' +
'    <p style="margin:0 0 26px;color:#7ec8ff;font-size:11px;font-weight:bold;letter-spacing:5px;text-align:center;">TOP MUNDIAL</p>\n' +
'    <p style="margin:0 0 18px;color:#ffffff;font-size:16px;font-weight:bold;letter-spacing:1px;">' + titulo + '</p>\n' +
'    ' + cuerpo + '\n' +
'  </div>\n' +
'  <p style="max-width:480px;margin:14px auto 0;color:#555555;font-size:11px;text-align:center;letter-spacing:1px;">' + pie + '</p>\n' +
'</div>';
}

/* {{ .ConfirmationURL }} lo rellena Supabase con el enlace de un solo uso */
function boton(texto) {
  return '<p style="text-align:center;margin:26px 0;">\n' +
'      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#ffff00;color:#000000;text-decoration:none;font-weight:bold;font-size:15px;letter-spacing:2px;padding:14px 26px;border-radius:8px;">' + texto + '</a>\n' +
'    </p>\n' +
'    <p style="margin:0 0 16px;color:#888888;font-size:12px;line-height:1.6;">Si el botón no te funciona, copia esta dirección en el navegador:<br>\n' +
'      <span style="color:#7ec8ff;word-break:break-all;">{{ .ConfirmationURL }}</span>\n' +
'    </p>';
}

function p(t) {
  return '<p style="margin:0 0 14px;color:#dddddd;font-size:14px;line-height:1.6;">' + t + '</p>';
}

var config = {
  /* El que importa: el enlace para volver a entrar */
  mailer_subjects_recovery: 'Recupera tu cuenta de PAC-MAN TOP MUNDIAL',
  mailer_templates_recovery_content: carta(
    'RECUPERAR TU CUENTA',
    p('Has pedido volver a entrar. Pulsa el botón y te dejamos poner una contraseña nueva; tu progreso sigue donde estaba.') +
    boton('PONER CONTRASEÑA NUEVA') +
    p('<span style="color:#888888;font-size:12px;">¿No has sido tú? No hagas nada. Mientras no se abra el enlace, tu contraseña sigue igual.</span>'),
    'Este correo se manda solo cuando alguien lo pide desde el juego.'),

  /* Aviso de que la contraseña ha cambiado: es la señal de alarma si el que
   * la ha cambiado no eres tú */
  mailer_subjects_password_changed_notification:
    'Tu contraseña de PAC-MAN TOP MUNDIAL ha cambiado',
  mailer_templates_password_changed_notification_content: carta(
    'CONTRASEÑA CAMBIADA',
    p('La contraseña de tu cuenta acaba de cambiar. Si has sido tú, aquí no hay nada que hacer.') +
    p('<span style="color:#ff8c00;">Si NO has sido tú</span>, entra en el juego y pide recuperar la cuenta cuanto antes.'),
    'PAC-MAN TOP MUNDIAL'),

  mailer_subjects_email_change: 'Confirma tu correo de PAC-MAN TOP MUNDIAL',
  mailer_templates_email_change_content: carta(
    'CONFIRMA TU CORREO',
    p('Has puesto {{ .NewEmail }} como correo de recuperación de tu cuenta. Confírmalo y listo.') +
    boton('CONFIRMAR CORREO'),
    'Sirve para una sola cosa: devolverte la cuenta si olvidas la contraseña.'),

  mailer_subjects_email_changed_notification:
    'El correo de tu cuenta de PAC-MAN TOP MUNDIAL ha cambiado',
  mailer_templates_email_changed_notification_content: carta(
    'CORREO CAMBIADO',
    p('El correo de recuperación de tu cuenta acaba de cambiar.') +
    p('<span style="color:#ff8c00;">Si no has sido tú</span>, avisa a quien lleva el juego.'),
    'PAC-MAN TOP MUNDIAL')
};

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
