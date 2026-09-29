  /* =====================================================================
   * TEMPORADA DE DICIEMBRE — FIN DE AÑO
   * Las cinco piezas exclusivas del camino del pase. No es la Navidad (esa
   * ya la regala CLAUS-MAN del 20 de diciembre al 6 de enero): es la noche
   * del 31 a la latina, la de aquí. Se quema el AÑO VIEJO, se comen las doce
   * uvas con las campanadas, se da la vuelta a la manzana con la MALETA para
   * viajar el año que viene, los LENTES del año nuevo y los COHETES.
   * Mismo marco que el resto del vestuario (f hacia donde avanza, s hacia la
   * coronilla) y la misma cadencia: la Q cada 3,4 s con qFase() y la muerte
   * cada 6,8 s.
   *
   * Escritas ya como las quiere el juego: la skin como DRAW.id (al portarla,
   * qFase(t, 3.4, d) -> qDe(o, d)), los accesorios como ACC.id, el efecto
   * como EFX.id(ctx, o, cuerpo) y el emote como caraFinDeAno(). El puente
   * del final las enchufa a la vitrina.
   * ===================================================================== */
  var ACC = {}, EFX = {};

  /* los colores de los cohetes y del papel de fiesta */
  var PAL_FIN = ['#ffd23f', '#ff3b5c', '#2de0ff', '#7dff4a', '#ff8c1a', '#c86bff'];

  /* una lengua de fuego que sube por la PANTALLA (el fuego siempre sube,
   * mire a donde mire): base en (x, y), alto h, ancho w */
  function llamarada(ctx, x, y, h, w, t, alpha) {
    if (alpha <= 0 || h <= 0) return;
    var ond = Math.sin(t * 17 + x * 3) * w * 0.35;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    [[1, '#ff5a0a'], [0.66, '#ffa31a'], [0.36, '#fff1a8']].forEach(function (c) {
      var hh = h * c[0], ww = w * c[0];
      ctx.fillStyle = c[1];
      ctx.beginPath();
      ctx.moveTo(x - ww, y);
      ctx.bezierCurveTo(x - ww * 1.1, y - hh * 0.45, x + ond - ww * 0.3, y - hh * 0.7, x + ond, y - hh);
      ctx.bezierCurveTo(x + ond + ww * 0.3, y - hh * 0.7, x + ww * 1.1, y - hh * 0.45, x + ww, y);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  /* un reventón de petardo: estrella de rayos cortos que se abre y se apaga */
  function petardo(ctx, x, y, u, col) {
    if (u <= 0 || u >= 1) return;
    var r = 0.6 + u * 2.2;
    ctx.save();
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = col; ctx.lineWidth = 0.35; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var k = 0; k < 8; k++) {
      var a = k * Math.PI / 4 + 0.3;
      ctx.moveTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.stroke();
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath(); ctx.arc(x, y, 0.5 * (1 - u), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ---------------- AÑO VIEJO ----------------
   * El muñeco que se quema a medianoche: cabeza de trapo relleno, cosida a
   * parches, con ojo de botón, sombrero de paja roto y el cartel del año que
   * se va. La paja le asoma por detrás. La mandíbula de trapo es la boca.
   * Q: le prenden la mecha y revientan los petardos que lleva dentro.
   * Es extravagante: no es un Pac-Man vestido, es otro muñeco. */
  DRAW.anoviejo = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.2), k;
    var ang = [0, 16, 30][fz] * Math.PI / 180;
    var tela = hex(mix('#b8966a', o.c, 0.34)), telaOsc = hex(mix(tela, '#2a1a08', 0.5));
    var paja = '#e6c25a', pajaOsc = '#9c7a22';
    var mecha = (q >= 0) ? Math.min(1, q * 1.5) : 0;          // lo que ya ardió de la mecha
    var trueno = (q >= 0) ? Math.abs(Math.sin(q * Math.PI * 9)) * (1 - q) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(Math.sin(t * 70) * 0.22 * trueno, Math.abs(Math.sin(t * 6)) * 0.25 - 0.12 + trueno * 0.25);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    /* la paja que asoma por detrás */
    ctx.strokeStyle = pajaOsc; ctx.lineWidth = 0.42;
    ctx.beginPath();
    for (k = 0; k < 7; k++) {
      var sy = -0.6 + k * 0.62, w = Math.sin(t * 5 + k) * 0.25;
      ctx.moveTo(-4.4, sy); ctx.lineTo(-6.6 - (k % 3) * 0.6, sy + w + (k - 3) * 0.28);
    }
    ctx.stroke();
    ctx.strokeStyle = paja; ctx.lineWidth = 0.24;
    ctx.stroke();

    /* el hueco de la boca */
    ctx.fillStyle = '#1a0e04';
    ctx.beginPath(); ctx.moveTo(-4.2, -0.8); ctx.lineTo(5.6, -0.5); ctx.lineTo(5.6, -4.2); ctx.lineTo(-4.2, -2.4); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(5.6, -0.4);
    cabeza.quadraticCurveTo(6.5, 2.4, 4.4, 4.0);
    cabeza.quadraticCurveTo(1.4, 5.4, -2.2, 4.6);
    cabeza.quadraticCurveTo(-5.4, 3.4, -5.0, 0.2);
    cabeza.lineTo(-4.4, -0.9);
    cabeza.lineTo(5.6, -0.4);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(-4.6, -1.1);
    mand.lineTo(5.6, -0.6);
    mand.quadraticCurveTo(6.0, -3.4, 3.8, -4.7);
    mand.quadraticCurveTo(0.6, -5.8, -2.2, -5.0);
    mand.quadraticCurveTo(-4.8, -4.0, -4.6, -1.1);
    mand.closePath();
    rostro(ctx, cabeza, mand, -4.6, -1.0, ang, tela, telaOsc, 0.7, 0.7);

    /* la cabeza: un parche del color del jugador y las costuras */
    ctx.save(); ctx.clip(cabeza);
    ctx.fillStyle = hex(mix(o.c, '#ffffff', 0.15));
    ctx.save(); ctx.translate(-2.4, 2.2); ctx.rotate(0.18);
    ctx.fillRect(-1.0, -0.9, 2.0, 1.8);
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.18;
    ctx.setLineDash([0.28, 0.22]);
    ctx.strokeRect(-0.85, -0.75, 1.7, 1.5);
    ctx.restore();
    ctx.strokeStyle = telaOsc; ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.moveTo(0.4, 5.4); ctx.quadraticCurveTo(-0.4, 2.6, 0.2, -0.6); ctx.stroke();
    ctx.setLineDash([]);
    /* el colorete pintado */
    ctx.fillStyle = 'rgba(230,70,70,.45)';
    ctx.beginPath(); ctx.arc(4.7, 1.0, 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* el ojo: un botón cosido en cruz */
    ctx.fillStyle = '#26262e';
    ctx.beginPath(); ctx.arc(3.4, 2.3, 0.88, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.1); ctx.stroke();
    ctx.strokeStyle = '#f2ead6'; ctx.lineWidth = 0.2;
    ctx.beginPath();
    ctx.moveTo(3.1, 2.0); ctx.lineTo(3.7, 2.6); ctx.moveTo(3.7, 2.0); ctx.lineTo(3.1, 2.6);
    ctx.stroke();
    destello(ctx, 3.0, 2.8, 0.22, 0.7);

    /* el cartel del año que se va, prendido con un alfiler */
    ctx.save();
    ctx.translate(-2.2, -0.2);
    ctx.rotate(-0.16 + Math.sin(t * 4) * 0.05);
    ctx.fillStyle = '#f7f2e4';
    ctx.fillRect(-1.5, -0.95, 3.0, 1.3);
    contorno(ctx, 0.9); ctx.strokeRect(-1.5, -0.95, 3.0, 1.3);
    ctx.save(); ctx.scale(1, -1);
    ctx.fillStyle = '#b01e2a';
    ctx.font = 'bold 1.05px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('2026', 0, 0.33);
    ctx.restore();
    ctx.fillStyle = '#c9ccd6';
    ctx.beginPath(); ctx.arc(0, 0.25, 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* la boca: los labios cosidos, en la mandíbula */
    ctx.save(); girarSobre(ctx, -4.6, -1.0, -ang); ctx.clip(mand);
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.22;
    ctx.beginPath();
    ctx.moveTo(0.6, -1.5); ctx.quadraticCurveTo(3.0, -1.9, 5.2, -1.2);
    for (k = 0; k < 6; k++) {
      var mx = 1.0 + k * 0.8, my = -1.55 - Math.sin(k / 5 * Math.PI) * 0.18 + k * 0.04;
      ctx.moveTo(mx, my - 0.3); ctx.lineTo(mx + 0.18, my + 0.3);
    }
    ctx.stroke();
    ctx.restore();

    /* el sombrero de paja, viejo y roto, un poco caído hacia atrás */
    ctx.save();
    ctx.translate(0.4, 4.6);
    ctx.rotate(0.14 + Math.sin(t * 5) * 0.03);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-2.7, 0.4);
      ctx.quadraticCurveTo(-2.6, 3.2, 0.1, 3.3);
      ctx.quadraticCurveTo(2.8, 3.2, 2.7, 0.4);
      ctx.closePath();
    }, paja, pajaOsc, 0.35, 0.35, 1.4);
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(-2.7, 0.55, 5.4, 0.7);
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.ellipse(0, 0.35, 5.0, 0.95, 0, 0, Math.PI * 2);
    }, paja, pajaOsc, 0.25, 0.25, 1.5);
    /* el agujero de la copa, con su paja rota */
    ctx.fillStyle = '#3a2410';
    ctx.beginPath(); ctx.ellipse(1.2, 2.3, 0.55, 0.42, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pajaOsc; ctx.lineWidth = 0.18;
    ctx.beginPath(); ctx.moveTo(1.0, 2.5); ctx.lineTo(1.5, 3.1); ctx.moveTo(1.5, 2.2); ctx.lineTo(2.1, 2.5); ctx.stroke();

    /* la mecha, que sale por la copa; con la Q se enciende y se consume */
    var mTip = 1 - mecha * 0.75;
    ctx.strokeStyle = '#3b3026'; ctx.lineWidth = 0.34;
    ctx.beginPath();
    ctx.moveTo(-0.6, 3.2);
    ctx.quadraticCurveTo(-0.9, 3.2 + 1.4 * mTip, -0.1, 3.2 + 2.1 * mTip);
    ctx.stroke();
    if (q >= 0 && mecha < 1) {
      var chx = -0.1, chy = 3.2 + 2.1 * mTip;
      estrella4(ctx, chx, chy, 0.9 + Math.sin(t * 40) * 0.25, '#fff2a0', 1);
      for (k = 0; k < 6; k++) {
        var a2 = t * 11 + k * 1.05, rr = 0.6 + ((t * 7 + k) % 1) * 1.4;
        ctx.fillStyle = (k % 2) ? '#ffb020' : '#ffe680';
        ctx.fillRect(chx + Math.cos(a2) * rr, chy + Math.sin(a2) * rr, 0.22, 0.22);
      }
    }
    ctx.restore();

    /* Q: revientan los petardos por todo el muñeco */
    if (q >= 0.3) {
      var PET = [[5.6, 3.4], [-4.0, 4.6], [2.4, -5.8], [-5.6, -2.8], [6.8, -1.6], [0.4, 7.4]];
      for (k = 0; k < PET.length; k++) {
        var u = tramo(q, 0.3 + k * 0.1, 0.52 + k * 0.1);
        petardo(ctx, PET[k][0], PET[k][1], u, PAL_FIN[k % PAL_FIN.length]);
      }
    }
    ctx.restore();
  };

  /* ---------------- LENTES 2027 ----------------
   * Los lentes de fiesta con el año nuevo: cuatro cifras doradas con
   * purpurina, y el CERO hace de cristal, justo sobre el ojo. */
  function cifra(ctx, d, x, y, h) {
    var w = h * 0.6;
    ctx.beginPath();
    if (d === '2') {
      ctx.arc(x, y + h * 0.2, w * 0.46, Math.PI * 0.95, -Math.PI * 0.18, true);
      ctx.lineTo(x - w * 0.5, y - h * 0.5);
      ctx.lineTo(x + w * 0.5, y - h * 0.5);
    } else if (d === '0') {
      ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(x - w * 0.5, y + h * 0.5);
      ctx.lineTo(x + w * 0.5, y + h * 0.5);
      ctx.lineTo(x - w * 0.08, y - h * 0.5);
    }
  }
  ACC.acc_lentes = function (ctx, o) {
    var h = 2.4, y = 3.7, CIF = [['2', -0.65], ['0', 1.1], ['2', 2.85], ['7', 4.55]];
    var oro = '#ffd23f', oroOsc = '#8a5e00';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    /* la patilla, hacia atrás */
    ctx.strokeStyle = oroOsc; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-1.2, y + 0.4); ctx.lineTo(-4.4, y - 0.2); ctx.stroke();
    /* el cristal del cero, ahumado del color del jugador */
    ctx.fillStyle = mix(o.c, '#1a1030', 0.55, 0.55);
    ctx.beginPath(); ctx.ellipse(1.1, y, h * 0.3, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    /* las cifras: borde oscuro, oro y un brillo */
    [[0.95, TINTA], [0.62, oroOsc], [0.4, oro]].forEach(function (capa) {
      ctx.strokeStyle = capa[1]; ctx.lineWidth = capa[0];
      CIF.forEach(function (c) { cifra(ctx, c[0], c[1], y, h); ctx.stroke(); });
    });
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.14;
    CIF.forEach(function (c) { cifra(ctx, c[0], c[1] - 0.08, y + 0.08, h); ctx.stroke(); });
    /* la purpurina: destellos que saltan de cifra en cifra */
    for (var k = 0; k < 3; k++) {
      var u = ((o.t * 0.9) + k / 3) % 1;
      var c = CIF[(k + Math.floor(o.t * 0.9 + k / 3)) % 4];
      estrella4(ctx, c[1] + 0.5 - k * 0.3, y + 1.0 - k * 0.8, 0.55 * Math.sin(u * Math.PI), '#ffffff', 1);
    }
  };

  /* ---------------- MALETA ----------------
   * La de dar la vuelta a la manzana a medianoche, para viajar el año que
   * viene: de cuero, con sus correas, las pegatinas de los viajes y una
   * etiqueta del color del jugador. Va colgada a la espalda y bota al correr. */
  ACC.acc_maleta = function (ctx, o) {
    var cuero = '#8a5a2e', cueroOsc = '#3e2410', k;
    var bota = Math.abs(Math.sin(o.t * 8)) * 0.4, mece = Math.sin(o.t * 8) * 0.06;
    ctx.save();
    ctx.translate(-7.6, -0.6 + bota);
    ctx.scale(1.15, 1.15);
    ctx.rotate(mece);
    /* el asa */
    ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.9, 2.3); ctx.quadraticCurveTo(0, 3.5, 0.9, 2.3); ctx.stroke();
    /* la correa que la sujeta al lomo */
    ctx.strokeStyle = cueroOsc; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(1.9, 1.2); ctx.lineTo(3.4, 2.2); ctx.stroke();
    /* el cuerpo */
    piezaX(ctx, function () {
      ctx.beginPath(); roundRect(ctx, -2.1, -2.4, 4.2, 4.7, 0.6);
    }, cuero, cueroOsc, 0.35, 0.35, 1.5);
    /* las dos correas y las esquinas de metal */
    ctx.fillStyle = cueroOsc;
    ctx.fillRect(-1.3, -2.4, 0.45, 4.7);
    ctx.fillRect(0.85, -2.4, 0.45, 4.7);
    ctx.fillStyle = '#d0d4de';
    [[-2.1, 2.3], [2.1, 2.3], [-2.1, -2.4], [2.1, -2.4]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 0.32, 0, Math.PI * 2); ctx.fill();
    });
    /* las pegatinas de los viajes: un sol, un corazón y una estrella */
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(-0.1, 0.9, 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 0.14;
    ctx.beginPath();
    for (k = 0; k < 8; k++) {
      var a = k * Math.PI / 4;
      ctx.moveTo(-0.1 + Math.cos(a) * 0.7, 0.9 + Math.sin(a) * 0.7);
      ctx.lineTo(-0.1 + Math.cos(a) * 0.95, 0.9 + Math.sin(a) * 0.95);
    }
    ctx.stroke();
    corazon(ctx, -0.2, -1.0, 0.5, '#ff3b5c');
    estrella4(ctx, 1.55, -0.4, 0.45, '#2de0ff', 1);
    ctx.restore();
    /* la etiqueta, del color del jugador, colgando del asa */
    ctx.save();
    ctx.translate(-7.6, 2.3 + bota);
    ctx.rotate(-0.5 + Math.sin(o.t * 6) * 0.25);
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 0.14;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -1.1); ctx.stroke();
    ctx.fillStyle = o.c;
    roundRect(ctx, -0.45, -2.1, 0.9, 1.1, 0.18); ctx.fill();
    contorno(ctx, 0.8); ctx.stroke();
    ctx.restore();
  };

  /* ---------------- COHETES ----------------
   * Por el camino van saliendo cohetes: suben con su cola de chispas y
   * revientan en una palmera de colores que cae y se apaga. Uno de cada tres
   * revienta del color del jugador. */
  EFX.efx_cohetes = function (ctx, o, cuerpo) {
    cuerpo();
    ctx.save();
    rastro(o, 26, 118).forEach(function (q) {
      var e = q.edad, col = (q.n % 3 === 0) ? o.c : PAL_FIN[q.n % PAL_FIN.length];
      var x0 = q.p.x + ((q.n * 7) % 5 - 2) * 0.6, y0 = q.p.y;
      var alto = 7 + (q.n % 3) * 1.5;
      if (e < 0.32) {
        /* sube, con su cola */
        var u = e / 0.32, y = y0 - suave(u) * alto;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,210,120,.75)'; ctx.lineWidth = 0.35; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y + 2.6); ctx.lineTo(x0, y); ctx.stroke();
        ctx.fillStyle = col;
        ctx.fillRect(x0 - 0.3, y - 0.5, 0.6, 1.0);
        estrella4(ctx, x0, y + 2.8, 0.45, '#fff2a0', 0.9);
        return;
      }
      /* revienta en palmera */
      var b = tramo(e, 0.32, 1), r = 0.6 + suave(Math.min(1, b * 1.7)) * 3.8, yb = y0 - alto;
      ctx.globalCompositeOperation = 'lighter';
      for (var k = 0; k < 11; k++) {
        var a = k * Math.PI * 2 / 11 + q.n;
        var px = x0 + Math.cos(a) * r, py = yb + Math.sin(a) * r + b * b * 3.2;
        ctx.globalAlpha = (1 - b) * 0.9;
        ctx.strokeStyle = col; ctx.lineWidth = 0.38;
        ctx.beginPath();
        ctx.moveTo(x0 + Math.cos(a) * r * 0.65, yb + Math.sin(a) * r * 0.65 + b * b * 2.4);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.fillStyle = (k % 3) ? col : '#ffffff';
        ctx.beginPath(); ctx.arc(px, py, 0.34 * (1 - b * 0.6), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    });
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  /* ---------------- EMOTE: DOCE UVAS ----------------
   * Una uva por campanada: se las va metiendo en la boca a toda prisa, con
   * los mofletes a reventar y los ojos apretados de concentración, mientras
   * el racimo de arriba se queda en nada. */
  function caraFinDeAno(ctx, x, y, r, color, id, t) {
    var ink = '#000000', lw = Math.max(1, r * 0.17), k;
    var CICLO = 12 * 18, fase12 = t % CICLO;
    var quedan = 12 - Math.floor(fase12 / 18);
    var p = (fase12 % 18) / 18;                 // la uva que va de camino
    var masca = Math.abs(Math.sin(t * 0.45));
    var uva = '#8fd14a', uvaOsc = '#4f8a1c';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.2) * 0.05);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    /* los mofletes, a reventar */
    ctx.fillStyle = hex(mix(color, '#ffffff', 0.28));
    [-1, 1].forEach(function (l) {
      ctx.beginPath(); ctx.arc(l * r * 0.58, r * 0.22, r * 0.3 * (1 + masca * 0.12), 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,90,110,.35)';
    [-1, 1].forEach(function (l) {
      ctx.beginPath(); ctx.arc(l * r * 0.6, r * 0.28, r * 0.14, 0, Math.PI * 2); ctx.fill();
    });
    /* los ojos, apretados */
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.6; ctx.lineCap = 'round';
    [-1, 1].forEach(function (l) {
      ctx.beginPath();
      ctx.moveTo(l * r * 0.52, -r * 0.34); ctx.lineTo(l * r * 0.26, -r * 0.24); ctx.lineTo(l * r * 0.52, -r * 0.14);
      ctx.stroke();
    });
    /* la boca, masticando */
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.ellipse(0, r * 0.44, r * 0.14, r * (0.06 + masca * 0.1), 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* el racimo de arriba, con las que quedan */
    var HUECOS = [[0, 0], [-1, 0], [1, 0], [-0.5, 0.85], [0.5, 0.85], [-1.5, 0.85], [1.5, 0.85],
                  [0, 1.7], [-1, 1.7], [1, 1.7], [-0.5, 2.55], [0.5, 2.55]];
    var rx = x + r * 1.0, ry = y - r * 1.1, ru = r * 0.12;
    ctx.strokeStyle = uvaOsc; ctx.lineWidth = lw * 0.3;
    ctx.beginPath(); ctx.moveTo(rx, ry - ru * 1.4); ctx.lineTo(rx + ru * 0.8, ry - ru * 2.6); ctx.stroke();
    for (k = 0; k < quedan - 1 && k < HUECOS.length; k++) {
      var hx = rx + HUECOS[k][0] * ru * 1.8, hy = ry + HUECOS[k][1] * ru * 1.7;
      ctx.fillStyle = uva;
      ctx.beginPath(); ctx.arc(hx, hy, ru, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = uvaOsc; ctx.lineWidth = lw * 0.18; ctx.stroke();
    }
    /* la que va de camino a la boca */
    if (quedan > 0) {
      var ux = rx + (x - rx) * p, uy = ry + (y + r * 0.44 - ry) * p - Math.sin(p * Math.PI) * r * 0.5;
      ctx.fillStyle = uva;
      ctx.beginPath(); ctx.arc(ux, uy, ru * 1.15 * (1 - p * 0.3), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = uvaOsc; ctx.lineWidth = lw * 0.18; ctx.stroke();
    }
  }

  /* ---- de la forma del juego a la de la vitrina ---- */
  Object.keys(ACC).forEach(function (id) { DRAW[id] = accesorio(ACC[id]); });
  Object.keys(EFX).forEach(function (id) {
    var dib = EFX[id];
    DRAW[id] = function (ctx, o) { dib(ctx, o, function () { body(ctx, o); }); };
  });
  DRAW.emo_uvas = function (ctx, o) {
    body(ctx, o);
    globoEmote(ctx, o.x, o.y - 11, o.c, o.t * 60, function (cx, cy, r) {
      caraFinDeAno(ctx, cx, cy, r, o.c, 'uvas', o.t * 60);
    });
  };
