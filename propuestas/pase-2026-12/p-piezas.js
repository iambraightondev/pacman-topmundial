  /* =====================================================================
   * TEMPORADA DE DICIEMBRE — NAVIDAD A LA PERUANA
   * Las cinco piezas exclusivas del camino del pase. Navidad, pero la de
   * aquí y no la del Polo Norte (el gorro de Papá Noel ya lo regala
   * CLAUS-MAN del 20 de diciembre al 6 de enero): el RETABLO ayacuchano con
   * su nacimiento dentro, la chocolatada con PANETÓN, los FOQUITOS de colores
   * y la ESTRELLA DE BELÉN que corona el pesebre.
   * Mismo marco que el resto del vestuario (f hacia donde avanza, s hacia la
   * coronilla) y la misma cadencia: la Q cada 3,4 s con qFase() y la muerte
   * cada 6,8 s.
   *
   * Escritas ya como las quiere el juego: la skin como DRAW.id (al portarla,
   * qFase(t, 3.4, d) -> qDe(o, d)), los accesorios como ACC.id, el efecto
   * como EFX.id(ctx, o, cuerpo) y el emote como caraNavidad(). El puente del
   * final las enchufa a la vitrina.
   * ===================================================================== */
  var ACC = {}, EFX = {};

  /* los colores de los foquitos y de las flores pintadas del retablo */
  var PAL_NAVI = ['#ff3b3b', '#ffd23f', '#3ee86a', '#2de0ff', '#ff5fd0', '#ff9a1a'];

  /* una estrella de cinco puntas, de radio r, girada `giro` */
  function estrella5(ctx, x, y, r, giro) {
    ctx.beginPath();
    for (var k = 0; k < 10; k++) {
      var a = giro + Math.PI / 2 + k * Math.PI / 5, rr = (k % 2) ? r * 0.44 : r;
      if (k === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  /* una florecita pintada a mano, de las del retablo */
  function florcita(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    for (var k = 0; k < 5; k++) {
      var a = k * Math.PI * 0.4;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffe680';
    ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, Math.PI * 2); ctx.fill();
  }

  /* ---------------- RETABLO ----------------
   * El retablo ayacuchano: un cajón de madera con techo a dos aguas, todo
   * pintado de flores, y dentro, en su nicho azul, el nacimiento: la Virgen,
   * San José, el Niño en el pesebre y una llamita. El cajón de abajo, con su
   * tapa, es la boca. Q: se enciende por dentro, brilla la estrella y suena
   * el villancico. Es extravagante: no es un Pac-Man, es una caja. */
  DRAW.retablo = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.1), k;
    var ang = [0, 16, 30][fz] * Math.PI / 180;
    var madera = hex(mix('#c0392b', o.c, 0.4)), maderaOsc = hex(mix(madera, '#2a0606', 0.5));
    var luz = (q >= 0) ? Math.sin(Math.min(1, q * 1.3) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 6)) * 0.2 - 0.1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    /* el hueco del cajón al abrirse */
    ctx.fillStyle = '#12060a';
    ctx.beginPath(); ctx.moveTo(-4.4, -0.8); ctx.lineTo(4.6, -0.5); ctx.lineTo(4.6, -4.4); ctx.lineTo(-4.4, -2.6); ctx.closePath(); ctx.fill();

    /* el cuerpo: la caja y el techo a dos aguas */
    var caja = new Path2D();
    caja.moveTo(4.6, -0.6);
    caja.lineTo(4.6, 3.4);
    caja.lineTo(5.2, 3.4);
    caja.lineTo(0.1, 6.9);
    caja.lineTo(-5.0, 3.4);
    caja.lineTo(-4.5, 3.4);
    caja.lineTo(-4.6, -0.9);
    caja.lineTo(4.6, -0.6);
    caja.closePath();
    var cajon = new Path2D();
    cajon.moveTo(-4.6, -1.1);
    cajon.lineTo(4.6, -0.8);
    cajon.lineTo(4.6, -4.6);
    cajon.quadraticCurveTo(4.6, -5.3, 3.9, -5.3);
    cajon.lineTo(-3.9, -5.3);
    cajon.quadraticCurveTo(-4.6, -5.3, -4.6, -4.6);
    cajon.closePath();
    rostro(ctx, caja, cajon, -4.7, -1.0, ang, madera, maderaOsc, 0.7, 0.7);

    ctx.save(); ctx.clip(caja);
    /* el frontón, con su flor grande y dos chicas */
    florcita(ctx, 0.1, 4.7, 0.95, PAL_NAVI[1]);
    florcita(ctx, -2.3, 3.9, 0.55, PAL_NAVI[4]);
    florcita(ctx, 2.5, 3.9, 0.55, PAL_NAVI[3]);
    /* el nicho: arco azul con el nacimiento dentro */
    var nicho = new Path2D();
    nicho.moveTo(-3.6, -0.3);
    nicho.lineTo(-3.6, 1.9);
    nicho.quadraticCurveTo(-3.6, 3.2, 0.1, 3.2);
    nicho.quadraticCurveTo(3.8, 3.2, 3.8, 1.9);
    nicho.lineTo(3.8, -0.3);
    nicho.closePath();
    ctx.fillStyle = mix('#1c2a78', '#ffd88a', luz * 0.55);
    ctx.fill(nicho);
    ctx.save(); ctx.clip(nicho);
    if (luz > 0) {
      var g = ctx.createRadialGradient(0.1, 1.0, 0.2, 0.1, 1.0, 4.2);
      g.addColorStop(0, 'rgba(255,240,180,' + (0.8 * luz) + ')');
      g.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = g; ctx.fillRect(-4, -1, 8.2, 4.6);
    }
    /* la Virgen (manto azul claro), San José (marrón), el Niño en su pesebre
     * y la llamita, en fila como en los retablos */
    function figura(x, manto, cara) {
      ctx.fillStyle = manto;
      ctx.beginPath(); ctx.moveTo(x - 0.75, -0.3); ctx.quadraticCurveTo(x - 0.6, 1.3, x, 1.55); ctx.quadraticCurveTo(x + 0.6, 1.3, x + 0.75, -0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = cara;
      ctx.beginPath(); ctx.arc(x, 1.75, 0.36, 0, Math.PI * 2); ctx.fill();
    }
    figura(-2.4, '#7fb2ff', '#f3c9a0');
    figura(2.5, '#8a5a2e', '#e8b98e');
    /* el pesebre y el Niño */
    ctx.fillStyle = '#d9a650';
    ctx.fillRect(-0.7, -0.3, 1.6, 0.55);
    ctx.fillStyle = '#fbf6ec';
    ctx.beginPath(); ctx.ellipse(0.1, 0.42, 0.6, 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f3c9a0';
    ctx.beginPath(); ctx.arc(0.55, 0.5, 0.22, 0, Math.PI * 2); ctx.fill();
    /* la llamita, asomando detrás */
    ctx.fillStyle = '#f4efe4';
    ctx.beginPath(); ctx.ellipse(1.25, 0.25, 0.42, 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(1.52, 0.3, 0.2, 0.75);
    ctx.beginPath(); ctx.arc(1.7, 1.08, 0.2, 0, Math.PI * 2); ctx.fill();
    /* la estrella del pesebre, arriba del nicho */
    ctx.fillStyle = mix('#ffd23f', '#ffffff', luz * 0.6);
    estrella5(ctx, 0.1, 2.55, 0.42 + luz * 0.25, Math.sin(t * 2) * 0.2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = maderaOsc; ctx.lineWidth = 0.3;
    ctx.stroke(nicho);
    /* el marco del nicho, con puntitos de colores */
    for (k = 0; k < 9; k++) {
      var am = Math.PI * (0.05 + k * 0.1125);
      ctx.fillStyle = PAL_NAVI[k % PAL_NAVI.length];
      ctx.beginPath(); ctx.arc(0.1 + Math.cos(am) * 3.95, 1.9 + Math.sin(am) * 1.45, 0.22, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    /* el cajón de abajo: su tapa pintada y el tirador */
    ctx.save(); girarSobre(ctx, -4.7, -1.0, -ang); ctx.clip(cajon);
    florcita(ctx, -2.4, -3.0, 0.7, PAL_NAVI[0]);
    florcita(ctx, 2.6, -3.0, 0.7, PAL_NAVI[2]);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(0.1, -2.2, 0.38, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
    ctx.restore();

    /* Q: brilla la estrella y suena el villancico */
    if (q >= 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,230,150,' + (luz * 0.9) + ')'; ctx.lineWidth = 0.35;
      ctx.beginPath();
      for (k = 0; k < 8; k++) {
        var ar = k * Math.PI / 4 + t;
        ctx.moveTo(0.1 + Math.cos(ar) * 1.2, 7.6 + Math.sin(ar) * 1.2);
        ctx.lineTo(0.1 + Math.cos(ar) * (2.0 + luz * 1.6), 7.6 + Math.sin(ar) * (2.0 + luz * 1.6));
      }
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#ffe680';
      estrella5(ctx, 0.1, 7.6, 0.9 + luz * 0.5, t * 1.5);
      ctx.fill();
      contorno(ctx, 1); ctx.stroke();
      for (k = 0; k < 4; k++) {
        var un = (q * 1.3 + k / 4) % 1;
        nota(ctx, 5.2 + un * 5.2, 2.2 + Math.sin(un * 7 + k) * 1.6 + un * 2.4,
          0.85, mix(PAL_NAVI[k], '#ffffff', 0.3, 1 - un));
      }
    }
    ctx.restore();
  };

  /* ---------------- PANETÓN ----------------
   * Un panetón entero en la cabeza, en su molde de papel: la cúpula dorada
   * con sus frutas confitadas y pasas, y un hilito de vapor, recién sacado. */
  ACC.acc_paneton = function (ctx, o) {
    var k, bam = Math.sin(o.t * 6) * 0.03;
    ctx.save();
    ctx.translate(0.3, R - 1.0);
    ctx.rotate(-0.05 + bam);
    /* la cúpula, abombada y algo más ancha que el molde */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-3.0, 1.9);
      ctx.quadraticCurveTo(-3.3, 4.7, 0, 4.9);
      ctx.quadraticCurveTo(3.3, 4.7, 3.0, 1.9);
      ctx.closePath();
    }, '#c98a2e', '#6e4210', 0.4, 0.4, 1.5);
    /* el brillo tostado de arriba */
    ctx.fillStyle = 'rgba(255,210,120,.45)';
    ctx.beginPath(); ctx.ellipse(-0.6, 3.9, 1.5, 0.5, -0.15, 0, Math.PI * 2); ctx.fill();
    /* las frutas confitadas y las pasas */
    [[-1.8, 2.7, '#e8352c'], [0.3, 3.4, '#3ec05a'], [1.8, 2.6, '#ff9a1a'], [-0.6, 2.4, '#3a1a10'],
     [1.0, 2.1, '#3a1a10'], [-1.2, 3.8, '#e8352c']].forEach(function (f) {
      ctx.fillStyle = f[2];
      ctx.beginPath(); ctx.arc(f[0], f[1], 0.3, 0, Math.PI * 2); ctx.fill();
    });
    /* el molde de papel, a pliegues, del color del jugador */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-2.8, 0);
      ctx.lineTo(-2.95, 2.1);
      ctx.lineTo(2.95, 2.1);
      ctx.lineTo(2.8, 0);
      ctx.closePath();
    }, hex(mix(o.c, '#f2e2b8', 0.45)), hex(mix(o.c, '#5a3a10', 0.55)), 0.25, 0.25, 1.4);
    ctx.strokeStyle = 'rgba(60,30,10,.4)'; ctx.lineWidth = 0.14;
    ctx.beginPath();
    for (k = 0; k < 9; k++) { ctx.moveTo(-2.5 + k * 0.63, 0.1); ctx.lineTo(-2.55 + k * 0.64, 2.0); }
    ctx.stroke();
    /* el vapor */
    for (k = 0; k < 2; k++) {
      var u = ((o.t * 0.5) + k * 0.5) % 1;
      ctx.strokeStyle = 'rgba(240,240,250,' + ((1 - u) * 0.55) + ')'; ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.moveTo(-0.6 + k * 1.2, 5.0 + u * 2.4);
      ctx.quadraticCurveTo(-0.1 + k * 1.2 + Math.sin(u * 6) * 0.5, 5.8 + u * 2.4, -0.6 + k * 1.2, 6.6 + u * 2.4);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* ---------------- ESTRELLA DE BELÉN ----------------
   * La estrella que corona el pesebre, flotando sobre la cabeza con su cola
   * de cometa hacia atrás y su resplandor: sube y baja despacio y titila. */
  ACC.acc_belen = function (ctx, o) {
    var t = o.t, k;
    var fy = 8.8 + Math.sin(t * 2.4) * 0.35, fx = 0.8, gira = Math.sin(t * 1.3) * 0.18;
    var titila = 0.8 + 0.2 * Math.sin(t * 7);
    ctx.save();
    /* el resplandor */
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(fx, fy, 0.2, fx, fy, 3.4);
    g.addColorStop(0, 'rgba(255,236,160,' + (0.55 * titila) + ')');
    g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx, fy, 3.4, 0, Math.PI * 2); ctx.fill();
    /* la cola de cometa, hacia atrás, con chispitas */
    var cola = ctx.createLinearGradient(fx, fy, fx - 7, fy - 1.6);
    cola.addColorStop(0, 'rgba(255,230,150,.7)');
    cola.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = cola;
    ctx.beginPath();
    ctx.moveTo(fx, fy + 0.7);
    ctx.quadraticCurveTo(fx - 3.5, fy + 0.4, fx - 7.2, fy - 1.4);
    ctx.quadraticCurveTo(fx - 3.5, fy - 0.8, fx, fy - 0.6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    for (k = 0; k < 4; k++) {
      var u = ((t * 0.7) + k / 4) % 1;
      estrella4(ctx, fx - 1.2 - u * 5.5, fy - u * 1.2 + Math.sin(k * 2.1) * 0.5, 0.35 * (1 - u), '#fff6c8', 1 - u);
    }
    /* la estrella */
    ctx.fillStyle = '#ffd23f';
    estrella5(ctx, fx, fy, 1.55, gira);
    ctx.fill();
    contorno(ctx, 1.3); ctx.stroke();
    ctx.fillStyle = '#fff3b0';
    estrella5(ctx, fx - 0.1, fy + 0.1, 0.75, gira);
    ctx.fill();
    destello(ctx, fx - 0.5, fy + 0.5, 0.4, titila);
  };

  /* ---------------- FOQUITOS ----------------
   * Por donde pasa deja una tira de foquitos de colores colgando de su
   * cable, que se encienden por turnos, como los del balcón en diciembre. */
  EFX.efx_foquitos = function (ctx, o, cuerpo) {
    var ptos = rastro(o, 3.2, 86);
    if (ptos.length > 1) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      /* el cable, combándose entre punto y punto */
      ctx.strokeStyle = 'rgba(30,70,40,.85)'; ctx.lineWidth = 0.32;
      ctx.beginPath();
      for (var i = 0; i < ptos.length; i++) {
        var q = ptos[i], comba = Math.abs(Math.sin(q.n * Math.PI / 3)) * 0.8;
        if (i === 0) ctx.moveTo(q.p.x, q.p.y + comba); else ctx.lineTo(q.p.x, q.p.y + comba);
      }
      ctx.stroke();
      /* los foquitos, uno de cada tres puntos, que se encienden por turnos */
      var turno = Math.floor(o.t * 5);
      ptos.forEach(function (q) {
        if (q.n % 3) return;
        var col = PAL_NAVI[(q.n / 3) % PAL_NAVI.length | 0];
        var on = ((q.n / 3 + turno) % 3) !== 0;
        var a = 1 - q.edad;
        var x = q.p.x, y = q.p.y + Math.abs(Math.sin(q.n * Math.PI / 3)) * 0.8 + 0.5;
        if (on) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          var g = ctx.createRadialGradient(x, y + 0.4, 0.1, x, y + 0.4, 2.2);
          g.addColorStop(0, mix(col, '#ffffff', 0.2, 0.55 * a));
          g.addColorStop(1, mix(col, '#000000', 0, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y + 0.4, 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = '#2a4a2e';
        ctx.fillRect(x - 0.22, y - 0.2, 0.44, 0.4);
        ctx.fillStyle = on ? col : mix(col, '#1a1a22', 0.6);
        ctx.beginPath(); ctx.ellipse(x, y + 0.65, 0.36, 0.55, 0, 0, Math.PI * 2); ctx.fill();
        if (on) destello(ctx, x - 0.1, y + 0.85, 0.16, a);
        ctx.globalAlpha = 1;
      });
      ctx.restore();
    }
    cuerpo();
  };

  /* ---------------- EMOTE: CHOCOLATADA ----------------
   * La taza de chocolate caliente de la chocolatada: sopla, sorbe, se queda
   * con el bigote de chocolate y suspira de gusto con los ojos cerrados. */
  function caraNavidad(ctx, x, y, r, color, id, t) {
    var ink = '#000000', lw = Math.max(1, r * 0.17), k;
    var ciclo = (t % 150) / 150;
    var sorbe = tramo(ciclo, 0.25, 0.4) * (1 - tramo(ciclo, 0.6, 0.72));    // la taza sube a la boca
    var gusto = tramo(ciclo, 0.7, 0.8) * (1 - tramo(ciclo, 0.95, 1));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-sorbe * 0.12 + gusto * 0.06);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    /* los ojos: abiertos al soplar, cerrados de gusto al tragar */
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.6; ctx.lineCap = 'round';
    [-1, 1].forEach(function (l) {
      ctx.beginPath();
      if (sorbe > 0.3 || gusto > 0.1) ctx.arc(l * r * 0.4, -r * 0.2, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
      else { ctx.fillStyle = ink; ctx.arc(l * r * 0.4, -r * 0.24, r * 0.1, 0, Math.PI * 2); ctx.fill(); }
      ctx.stroke();
    });
    /* los mofletes, colorados del calor */
    ctx.fillStyle = 'rgba(255,90,90,.4)';
    [-1, 1].forEach(function (l) {
      ctx.beginPath(); ctx.arc(l * r * 0.62, r * 0.18, r * 0.15, 0, Math.PI * 2); ctx.fill();
    });
    /* la boca: soplando en O, luego sonrisa con bigote de chocolate */
    if (ciclo > 0.7) {
      ctx.fillStyle = '#5a2e14';
      ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.34, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.5;
      ctx.beginPath(); ctx.arc(0, r * 0.32, r * 0.24, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else {
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(r * 0.05, r * 0.42, r * 0.11, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    /* la taza, abajo a la derecha; sube a la boca al sorber */
    var tx = x + r * (0.85 - sorbe * 0.55), ty = y + r * (0.95 - sorbe * 0.45), tr = sorbe * 0.5;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(-tr);
    ctx.fillStyle = '#f7f2e6';
    roundRect(ctx, -r * 0.42, -r * 0.4, r * 0.84, r * 0.78, r * 0.12); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.35; ctx.stroke();
    ctx.fillStyle = '#d9362c';
    ctx.fillRect(-r * 0.42, -r * 0.05, r * 0.84, r * 0.14);
    ctx.fillStyle = '#5a2e14';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.4, r * 0.4, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f7f2e6'; ctx.lineWidth = lw * 0.45;
    ctx.beginPath(); ctx.arc(r * 0.46, 0, r * 0.18, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.restore();
    /* el vapor */
    for (k = 0; k < 2; k++) {
      var u = ((t * 0.02) + k * 0.5) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - u) * 0.7) + ')'; ctx.lineWidth = lw * 0.3;
      ctx.beginPath();
      ctx.moveTo(tx - r * 0.12 + k * r * 0.24, ty - r * 0.55 - u * r * 0.7);
      ctx.quadraticCurveTo(tx + Math.sin(u * 6 + k) * r * 0.2, ty - r * 0.75 - u * r * 0.7,
        tx - r * 0.12 + k * r * 0.24, ty - r * 0.95 - u * r * 0.7);
      ctx.stroke();
    }
  }

  /* ---- de la forma del juego a la de la vitrina ---- */
  Object.keys(ACC).forEach(function (id) { DRAW[id] = accesorio(ACC[id]); });
  Object.keys(EFX).forEach(function (id) {
    var dib = EFX[id];
    DRAW[id] = function (ctx, o) { dib(ctx, o, function () { body(ctx, o); }); };
  });
  DRAW.emo_chocolatada = function (ctx, o) {
    body(ctx, o);
    globoEmote(ctx, o.x, o.y - 11, o.c, o.t * 60, function (cx, cy, r) {
      caraNavidad(ctx, cx, cy, r, o.c, 'chocolatada', o.t * 60);
    });
  };
