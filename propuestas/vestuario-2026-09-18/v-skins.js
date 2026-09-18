  /* =====================================================================
   * TANDA EXTRAVAGANTE (18 sep): ocho skins. Mismo marco que las demás
   * (f hacia donde avanza, s hacia la coronilla). Cada una enseña su Q cada
   * 3,4 s con qFase(): -1 fuera de la Q y de 0 a 1 mientras dura.
   * ===================================================================== */
  var DRAW = {};

  /* ---------------- CÓNDOR ---------------- */
  DRAW.condor = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.0), k;
    var ang = (q >= 0 ? 30 : [0, 15, 28][fz]) * Math.PI / 180;
    var pluma = hex(mix('#262633', o.c, 0.07)), plumaOsc = mix(pluma, '#000000', 0.55);
    var collar = '#f4f1e6', collarOsc = '#c2bca8';
    var pico = '#e6dcc4', picoOsc = '#9a8f74', carne = '#d0663f';
    var abre = (q >= 0) ? Math.sin(Math.min(1, q * 2) * Math.PI / 2) * (q > 0.7 ? (1 - q) / 0.3 : 1) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 3) * 0.25 + abre * 0.6);

    /* alas: plegadas, y abiertas del todo con la Q */
    function ala(lado) {
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(-1.0, lado * 1.4);
        ctx.quadraticCurveTo(-5.0, lado * (2.0 + abre * 5.0), -8.4 - abre * 2.6, lado * (-0.6 + abre * 7.0));
        ctx.quadraticCurveTo(-5.4, lado * (-2.6 + abre * 3.0), -1.0, lado * -2.0);
        ctx.closePath();
      }, pluma, plumaOsc, 0.5, 0.5);
      ctx.strokeStyle = plumaOsc; ctx.lineWidth = 0.42; ctx.lineCap = 'round';
      for (var j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.moveTo(-2.0, lado * (0.8 - j * 0.9));
        ctx.quadraticCurveTo(-5.0, lado * (0.2 - j * 0.9 + abre * 3.2), -7.4, lado * (-1.0 - j * 0.5 + abre * 5.0));
        ctx.stroke();
      }
    }
    if (abre > 0.05) ala(-1);
    ala(1);

    /* golilla blanca: el plumón del cuello */
    for (var i = 0; i <= 10; i++) {
      var a = -2.4 + i * 0.48;
      var px = -2.0 + Math.cos(a) * 3.0, py = 0.8 + Math.sin(a) * 3.5;
      var rt = 1.75 - Math.abs(a) * 0.12;
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.arc(px, py, rt, 0, Math.PI * 2);
      }, collar, collarOsc, 0.4, 0.4, 1.3);
    }

    ctx.fillStyle = '#3a1416';
    ctx.beginPath(); ctx.moveTo(1.8, -0.6); ctx.lineTo(6.8, -0.3); ctx.lineTo(6.8, -3.2); ctx.lineTo(1.8, -1.4); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(7.7, 1.2);
    cabeza.quadraticCurveTo(7.6, -0.6, 5.8, -0.9);
    cabeza.lineTo(2.0, -0.7);
    cabeza.quadraticCurveTo(-1.0, -0.4, -1.2, 2.0);
    cabeza.quadraticCurveTo(-1.4, 5.0, 2.0, 5.2);
    cabeza.quadraticCurveTo(4.0, 5.1, 4.8, 3.4);
    cabeza.quadraticCurveTo(6.8, 3.0, 7.7, 1.2);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(1.8, -0.9); mand.lineTo(6.5, -1.0);
    mand.quadraticCurveTo(6.7, -2.4, 4.6, -2.9);
    mand.quadraticCurveTo(2.6, -3.1, 1.4, -2.0);
    mand.closePath();
    rostro(ctx, cabeza, mand, 2.0, -0.8, ang, pico, picoOsc, 0.6, 0.6);

    /* la cabeza pelada, de piel, detrás del pico de hueso */
    ctx.save();
    ctx.clip(cabeza);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(4.8, 3.4);
      ctx.quadraticCurveTo(3.4, 5.2, 1.0, 5.2);
      ctx.quadraticCurveTo(-1.6, 5.0, -1.4, 1.8);
      ctx.quadraticCurveTo(-1.2, -0.6, 1.6, -0.8);
      ctx.lineTo(4.0, -0.8);
      ctx.quadraticCurveTo(3.6, 1.4, 4.8, 3.4);
      ctx.closePath();
    }, carne, mix(carne, '#3a1008', 0.45), 0.5, 0.5, 1.2);
    ctx.restore();

    /* carúncula: la cresta carnosa del macho */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(1.6, 4.9);
      ctx.quadraticCurveTo(2.8, 7.8, 4.6, 6.8);
      ctx.quadraticCurveTo(5.6, 5.8, 4.8, 3.3);
      ctx.quadraticCurveTo(3.2, 4.6, 1.6, 4.9);
      ctx.closePath();
    }, carne, mix(carne, '#3a1008', 0.5), 0.4, 0.4, 1.2);

    ctx.fillStyle = '#f7f2e4';
    ctx.beginPath(); ctx.ellipse(2.9, 2.6, 1.0, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    ctx.fillStyle = '#2a1b12';
    ctx.beginPath(); ctx.arc(3.25, 2.55, 0.45, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.5, 2.9, 0.3, 0.9);
    ctx.fillStyle = picoOsc;
    ctx.beginPath(); ctx.ellipse(5.6, 1.8, 0.45, 0.25, 0.2, 0, Math.PI * 2); ctx.fill();

    /* el chillido: ondas que salen del pico */
    if (q >= 0) {
      ctx.lineWidth = 1.4 / S;
      for (k = 0; k < 3; k++) {
        var u = (q * 2 + k / 3) % 1;
        ctx.strokeStyle = 'rgba(255,244,214,' + ((1 - u) * abre) + ')';
        ctx.beginPath(); ctx.arc(7.6, 0.2, 1.6 + u * 6, -0.8, 0.8); ctx.stroke();
      }
    }
    ctx.restore();
  };

  /* ---------------- TORO ---------------- */
  DRAW.toro = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 0.9), k;
    var ang = [0, 12, 22][fz] * Math.PI / 180;
    var pelo = hex(mix(o.c, '#6b3f1c', 0.88)), peloOsc = mix(pelo, '#180c04', 0.55);
    var hocico = '#e9cfbe', hocicoOsc = '#b08d78';
    var hueso = '#f2ead6', huesoOsc = '#ada374';
    /* la Q es una embestida: baja la cabeza y arranca */
    var emb = (q >= 0) ? Math.sin(Math.min(1, q * 1.8) * Math.PI) : 0;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(emb * 1.1, Math.abs(Math.sin(t * 7)) * 0.3 - 0.2 - emb * 0.7);
    ctx.rotate(-emb * 0.16);

    function cuerno(dx, dy, esc, lado, col, colOsc) {
      ctx.save();
      ctx.translate(dx, dy); ctx.scale(esc * lado, esc);
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(-1.7, -0.8);
        ctx.quadraticCurveTo(-1.0, 2.6, 1.5, 4.3);
        ctx.quadraticCurveTo(2.7, 4.9, 3.0, 3.9);
        ctx.quadraticCurveTo(1.3, 2.0, 1.0, -1.2);
        ctx.closePath();
      }, col, colOsc, 0.4, 0.4, 1.5);
      ctx.restore();
    }
    /* oreja */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-2.2, 3.2);
      ctx.quadraticCurveTo(-5.0, 4.0, -6.0, 2.4);
      ctx.quadraticCurveTo(-4.4, 1.5, -2.4, 1.8);
      ctx.closePath();
    }, pelo, peloOsc, 0.3, 0.3);

    ctx.fillStyle = '#3a1012';
    ctx.beginPath(); ctx.moveTo(2.4, -0.9); ctx.lineTo(7.3, -0.6); ctx.lineTo(7.3, -3.4); ctx.lineTo(2.4, -1.8); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(7.6, 1.6);
    cabeza.quadraticCurveTo(7.8, 3.0, 6.2, 3.3);
    cabeza.quadraticCurveTo(4.8, 3.5, 4.2, 4.6);
    cabeza.quadraticCurveTo(2.8, 5.8, -0.6, 5.6);
    cabeza.quadraticCurveTo(-5.0, 5.2, -6.0, 2.0);
    cabeza.quadraticCurveTo(-6.6, -1.2, -3.8, -3.0);
    cabeza.quadraticCurveTo(-0.8, -4.2, 2.0, -2.6);
    cabeza.lineTo(2.6, -1.0);
    cabeza.lineTo(7.3, -0.6);
    cabeza.quadraticCurveTo(7.7, 0.2, 7.6, 1.6);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(2.2, -1.1); mand.lineTo(7.3, -0.8);
    mand.quadraticCurveTo(7.6, -2.7, 5.4, -3.2);
    mand.quadraticCurveTo(3.0, -3.4, 1.8, -2.3);
    mand.closePath();
    rostro(ctx, cabeza, mand, 2.3, -1.0, ang, pelo, peloOsc, 0.8, 0.8);

    /* el morro, una pieza clara bien marcada al frente */
    ctx.save(); ctx.clip(cabeza);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(4.5, 2.9);
      ctx.quadraticCurveTo(4.0, 0.8, 4.7, -1.0);
      ctx.lineTo(7.5, -0.6);
      ctx.quadraticCurveTo(7.9, 0.2, 7.8, 1.6);
      ctx.quadraticCurveTo(8.0, 3.2, 6.2, 3.5);
      ctx.quadraticCurveTo(5.1, 3.6, 4.5, 2.9);
      ctx.closePath();
    }, hocico, hocicoOsc, 0.5, 0.5, 1.4);
    ctx.restore();
    ctx.save(); girarSobre(ctx, 2.3, -1.0, -ang); ctx.clip(mand);
    ctx.fillStyle = hocico;
    ctx.beginPath(); ctx.ellipse(5.6, -2.0, 1.9, 1.0, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* narina */
    ctx.fillStyle = hocicoOsc;
    ctx.beginPath(); ctx.ellipse(6.7, 1.7, 0.62, 0.36, 0.5, 0, Math.PI * 2); ctx.fill();

    /* LA ANILLA. Va donde va en un toro de verdad: colgando del TABIQUE, o
     * sea del punto más bajo y adelantado del morro, por un enganche corto
     * que se ve. Antes salía suelta a un lado de la boca y parecía que la
     * llevaba entre los dientes. */
    ctx.lineCap = 'round';
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(7.15, -0.35); ctx.lineTo(7.15, -1.15); ctx.stroke();
    ctx.strokeStyle = '#c99a1e'; ctx.lineWidth = 0.42;
    ctx.beginPath(); ctx.moveTo(7.15, -0.35); ctx.lineTo(7.15, -1.1); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.arc(7.15, -2.05, 0.92, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 0.56;
    ctx.beginPath(); ctx.arc(7.15, -2.05, 0.92, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.arc(7.15, -2.05, 0.92, Math.PI * 0.75, Math.PI * 1.15); ctx.stroke();


    /* copete: tres rizos pegados a la frente, entre los cuernos */
    [[0.2, 5.4, 1.15], [1.5, 5.6, 0.95], [-1.1, 5.4, 1.0]].forEach(function (c, i2) {
      var w = Math.sin(t * 5 + i2) * 0.15;
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.arc(c[0], c[1] + w, c[2], 0, Math.PI * 2);
      }, pelo, peloOsc, 0.35, 0.35, 1.3);
    });

    /* LOS CUERNOS. El principal (el de este lado) nace ATRÁS, en lo alto de
     * la nuca; el del otro lado asoma por DELANTE de él, cruzándolo, que es
     * como se ve un toro de perfil con la cabeza ladeada. Va más apagado
     * para que no se confunda con el de delante. */
    cuerno(1.8, 3.9, 1.05, 1, hueso, huesoOsc);
    cuerno(4.0, 3.0, 0.82, 1, hex(mix(hueso, '#5f584a', 0.4)), '#4a4438');

    /* ceja de fieltro y ojo con mala leche */
    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(3.0, 2.5, 1.05, 0.95, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.3); ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(3.4, 2.35, 0.5, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.65, 2.7, 0.28, 0.9);
    contorno(ctx, 3.0);
    ctx.beginPath(); ctx.moveTo(1.5, 4.2); ctx.lineTo(4.3, 3.2); ctx.stroke();

    /* resopla por la nariz; con la embestida, el doble */
    for (k = 0; k < 3; k++) {
      var ph = ((t * (emb > 0 ? 2.4 : 1.1)) + k / 3) % 1;
      ctx.fillStyle = 'rgba(228,228,236,' + ((0.15 + 0.45 * emb) * (1 - ph)) + ')';
      ctx.beginPath(); ctx.arc(8.2 + ph * 3.6, 1.0 - ph * 1.6, 0.5 + ph * 1.3, 0, Math.PI * 2); ctx.fill();
    }

    /* la embestida: rayas de velocidad y polvo detrás */
    if (q >= 0) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.75 * emb) + ')'; ctx.lineWidth = 0.35;
      ctx.beginPath();
      [3.4, 0.8, -1.8].forEach(function (sl, i2) {
        var x0 = -6.8 - i2 * 1.1;
        ctx.moveTo(x0, sl); ctx.lineTo(x0 - 4.5 * emb, sl);
      });
      ctx.stroke();
      for (k = 0; k < 6; k++) {
        var d = emb * (2.0 + (k % 3) * 1.8);
        ctx.fillStyle = 'rgba(208,194,172,' + (0.45 * emb) + ')';
        ctx.beginPath();
        ctx.arc(-6.6 - d * 1.5, -3.8 + Math.sin(k * 2.1) * 1.3, 0.8 + d * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ---------------- RANA ---------------- */
  DRAW.rana = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 0.8);
    var ang = (q >= 0 ? 34 : [0, 16, 32][fz]) * Math.PI / 180;
    var piel = hex(mix(o.c, '#3fbf4a', 0.62)), pielOsc = mix(piel, '#04200a', 0.45);
    var vientre = '#eaf7c4';
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 5)) * 0.4 - 0.2);

    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-1.4, -1.0);
      ctx.quadraticCurveTo(-5.6, -0.6, -6.4, -3.2);
      ctx.quadraticCurveTo(-4.0, -4.2, -1.0, -2.6);
      ctx.closePath();
    }, piel, pielOsc, 0.4, 0.4);

    ctx.fillStyle = '#5a1030';
    ctx.beginPath(); ctx.moveTo(-1.6, -0.5); ctx.lineTo(6.2, -0.2); ctx.lineTo(6.2, -3.6); ctx.lineTo(-1.6, -1.6); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(6.3, 0.1);
    cabeza.quadraticCurveTo(6.4, 1.8, 4.8, 2.4);
    cabeza.quadraticCurveTo(2.6, 3.0, 0.4, 2.9);
    cabeza.quadraticCurveTo(-4.6, 2.8, -5.2, 0.6);
    cabeza.quadraticCurveTo(-5.4, -1.2, -3.0, -1.6);
    cabeza.lineTo(-1.6, -0.7);
    cabeza.lineTo(6.3, 0.1);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(-2.4, -0.8); mand.lineTo(6.6, -0.3);
    mand.quadraticCurveTo(6.6, -2.6, 3.4, -3.6);
    mand.quadraticCurveTo(-0.6, -4.4, -3.4, -2.6);
    mand.closePath();
    rostro(ctx, cabeza, mand, -1.6, -0.7, ang, piel, pielOsc, 0.6, 0.6);

    ctx.save(); girarSobre(ctx, -1.6, -0.7, -ang); ctx.clip(mand);
    ctx.fillStyle = vientre;
    ctx.beginPath(); ctx.ellipse(2.0, -2.6, 3.4, 1.4, 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* la lengua: al comer asoma; con la Q sale disparada */
    var L = (q >= 0) ? 3 + Math.sin(q * Math.PI) * 12 : (fz > 0 ? 3.4 : 0);
    if (L > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ff5f8d'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(2.6, -1.8);
      ctx.quadraticCurveTo(4.0 + L * 0.5, -2.4, 4.0 + L, -0.6 + Math.sin(t * 20) * 0.4);
      ctx.stroke();
      ctx.strokeStyle = TINTA; ctx.lineWidth = 0.28; ctx.stroke();
      ctx.fillStyle = '#ff7fa6';
      ctx.beginPath(); ctx.ellipse(4.2 + L, -0.5, 1.0, 0.8, 0.2, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.1); ctx.stroke();
      ctx.restore();
    }

    function ojoRana(x, y, r) {
      piezaX(ctx, function () { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }, piel, pielOsc, 0.3, 0.3, 1.4);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(x + 0.25, y + 0.15, r * 0.62, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.1); ctx.stroke();
      ctx.fillStyle = TINTA;
      ctx.fillRect(x - r * 0.45, y - 0.12, r * 1.3, 0.42);
      destello(ctx, x + 0.5, y + 0.9, 0.3, 0.9);
    }
    ojoRana(-0.6, 3.6, 1.9);
    ojoRana(2.9, 3.2, 1.6);

    ctx.fillStyle = mix(pielOsc, '#000000', 0.2);
    [[-3.4, 1.2], [-2.0, 0.2], [-4.4, -0.2], [0.6, 1.0]].forEach(function (p) {
      ctx.beginPath(); ctx.ellipse(p[0], p[1], 0.55, 0.4, 0.3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  };

  /* ---------------- PAYASO ---------------- */
  /* Copia del emoji de payaso, de perfil: cara crema, peluca de rizos rojos,
   * ojo con el aro azul grueso y la pupila negra alargada, ceja fina, nariz
   * de bola roja, coloretes y la sonrisota roja con los dientes blancos. */
  DRAW.payaso = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.1), k;
    var ang = [0, 15, 28][fz] * Math.PI / 180;
    var rizo = '#e8352c', rizoOsc = '#9c1710';
    var piel = '#f7f0cf', pielOsc = '#d5cb9e';
    var rojo = '#ef2b23', rojoOsc = '#a3130e', azul = '#1f7fd4';
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 6)) * 0.35 - 0.2);

    /* la peluca: racimos de rizos rojos, por detrás y asomando por arriba */
    [[-4.6, 2.2, 2.2], [-5.0, -0.8, 1.9], [-3.4, 4.4, 1.9], [-1.0, 5.6, 1.6],
     [-6.0, 1.2, 1.4], [-4.4, -2.8, 1.4], [1.6, 5.3, 1.15]]
      .forEach(function (p, k2) {
        var w = Math.sin(t * 5 + k2) * 0.18;
        piezaX(ctx, function () {
          ctx.beginPath(); ctx.arc(p[0], p[1] + w, p[2], 0, Math.PI * 2);
        }, rizo, rizoOsc, 0.55, 0.55, 1.4);
      });

    ctx.fillStyle = '#5c0d16';
    ctx.beginPath(); ctx.moveTo(-1.0, -0.6); ctx.lineTo(5.8, -0.2); ctx.lineTo(5.8, -4.2); ctx.lineTo(-1.0, -1.4); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(5.9, 0.0);
    cabeza.quadraticCurveTo(6.3, 2.6, 4.5, 4.1);
    cabeza.quadraticCurveTo(1.5, 5.8, -1.7, 4.8);
    cabeza.quadraticCurveTo(-4.3, 3.8, -4.1, 0.4);
    cabeza.quadraticCurveTo(-3.9, -1.9, -1.5, -2.3);
    cabeza.lineTo(-1.0, -0.8);
    cabeza.lineTo(5.9, 0.0);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(-1.4, -0.9); mand.lineTo(5.9, -0.3);
    mand.quadraticCurveTo(5.7, -3.2, 2.6, -4.2);
    mand.quadraticCurveTo(-0.8, -5.0, -3.0, -2.9);
    mand.closePath();
    rostro(ctx, cabeza, mand, -1.0, -0.8, ang, piel, pielOsc, 0.7, 0.7);

    /* la sonrisota: labio rojo grueso arriba y abajo, con la fila de dientes
     * blancos pegada al borde, como en el emoji */
    ctx.save(); girarSobre(ctx, -1.0, -0.8, -ang); ctx.clip(mand);
    ctx.fillStyle = rojo;
    ctx.beginPath(); ctx.ellipse(2.2, -1.7, 4.0, 1.4, 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath(); ctx.ellipse(2.2, -1.25, 3.3, 0.5, 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.clip(cabeza);
    ctx.fillStyle = rojo;
    ctx.beginPath(); ctx.ellipse(2.0, 0.4, 3.9, 1.2, 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath(); ctx.ellipse(2.0, 0.0, 3.2, 0.42, 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* la comisura, curvándose hacia arriba */
    ctx.strokeStyle = rojo; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1.0, -0.4); ctx.quadraticCurveTo(-2.0, 0.2, -1.7, 1.2);
    ctx.stroke();

    /* colorete */
    ctx.fillStyle = 'rgba(244,130,130,.5)';
    ctx.beginPath(); ctx.ellipse(-0.2, 1.6, 1.5, 0.95, 0.1, 0, Math.PI * 2); ctx.fill();

    /* el ojo del emoji: blanco con aro azul gordo y pupila negra alargada */
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(2.4, 2.7, 1.35, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = azul; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.ellipse(2.7, 2.6, 0.62, 1.0, 0, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 2.3, 3.3, 0.32, 0.95);
    /* ceja fina y arqueada */
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.42; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(1.1, 4.4); ctx.quadraticCurveTo(2.5, 5.4, 3.8, 4.4); ctx.stroke();

    /* nariz de bola */
    ctx.fillStyle = rojo;
    ctx.beginPath(); ctx.arc(5.5, 1.3, 1.45, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath(); ctx.ellipse(5.0, 1.9, 0.5, 0.34, -0.5, 0, Math.PI * 2); ctx.fill();

    /* la florecita del color del jugador, en la sien */
    ctx.save();
    ctx.translate(-1.8, 4.6);
    ctx.rotate(Math.sin(t * 4) * 0.12);
    ctx.fillStyle = o.c;
    for (k = 0; k < 5; k++) {
      var a2 = k * 1.2566;
      ctx.beginPath(); ctx.ellipse(Math.cos(a2) * 0.62, Math.sin(a2) * 0.62, 0.55, 0.42, a2, 0, Math.PI * 2); ctx.fill();
    }
    contorno(ctx, 1); ctx.stroke();
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath(); ctx.arc(0, 0, 0.42, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
    ctx.restore();

    /* la Q: le estalla una tarta de nata en la cara */
    if (q >= 0) {
      var e = Math.min(1, q * 3), fade = q < 0.75 ? 1 : (1 - q) / 0.25;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(3.2, 1.6);
      ctx.scale(e, e);
      ctx.fillStyle = '#fdf6e6';
      ctx.beginPath();
      for (k = 0; k < 11; k++) {
        var a3 = k / 11 * Math.PI * 2, rr = 3.4 + ((k % 2) ? 1.5 : 0);
        var px2 = Math.cos(a3) * rr, py2 = Math.sin(a3) * rr;
        if (k === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
      }
      ctx.closePath(); ctx.fill();
      contorno(ctx, 1.4); ctx.stroke();
      ctx.fillStyle = '#ffd6e6';
      ctx.beginPath(); ctx.arc(-0.6, 0.6, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e02a4a';
      ctx.beginPath(); ctx.arc(1.0, -0.4, 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      for (k = 0; k < 8; k++) {
        var ap = k * 0.785 + 0.3, dp = 3 + q * 7;
        ctx.globalAlpha = fade;
        ctx.fillStyle = (k % 2) ? '#fdf6e6' : '#ffd6e6';
        ctx.beginPath(); ctx.arc(3.2 + Math.cos(ap) * dp, 1.6 + Math.sin(ap) * dp, 0.7 - q * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  /* ---------------- RECREATIVA ---------------- */
  DRAW.recreativa = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.2), k;
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var mueble = hex(mix('#2c3352', o.c, 0.08)), muebleOsc = mix(mueble, '#05060c', 0.45);
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 7) * 0.15);

    ctx.fillStyle = '#05070d';
    ctx.beginPath(); ctx.moveTo(-3.2, -0.6); ctx.lineTo(5.2, -0.2); ctx.lineTo(5.2, -4.0); ctx.lineTo(-3.2, -2.0); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(4.6, -0.2);
    cabeza.lineTo(4.8, 3.6);
    cabeza.quadraticCurveTo(4.9, 5.0, 3.6, 5.2);
    cabeza.lineTo(-3.8, 5.6);
    cabeza.quadraticCurveTo(-5.2, 5.6, -5.2, 4.2);
    cabeza.lineTo(-5.0, -0.8);
    cabeza.lineTo(4.6, -0.2);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(-5.0, -1.0);
    mand.lineTo(4.6, -0.4);
    mand.quadraticCurveTo(5.0, -4.2, 3.4, -5.0);
    mand.lineTo(-3.6, -5.4);
    mand.quadraticCurveTo(-5.2, -5.2, -5.0, -1.0);
    mand.closePath();
    rostro(ctx, cabeza, mand, -5.0, -0.9, ang, mueble, muebleOsc, 0.8, 0.8);

    ctx.save(); ctx.clip(cabeza);
    ctx.fillStyle = '#f4f0e2';
    roundRect(ctx, -4.6, 3.6, 9.0, 1.7, 0.4); ctx.fill();
    contorno(ctx, 1.1); ctx.stroke();
    [-3.9, -2.5, -1.1, 0.3, 1.7, 3.1].forEach(function (x, k2) {
      ctx.fillStyle = (k2 % 2) ? o.c : '#e02a4a';
      ctx.fillRect(x, 4.05 + (k2 % 2 ? 0.15 : 0), 1.0, 0.85);
    });
    ctx.fillStyle = '#04060f';
    roundRect(ctx, -4.3, 0.2, 8.4, 3.0, 0.5); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    if (q >= 0 && q < 0.35) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * (1 - q / 0.35)) + ')';
      roundRect(ctx, -4.3, 0.2, 8.4, 3.0, 0.5); ctx.fill();
    }
    ctx.fillStyle = '#2b6bff';
    ctx.fillRect(-4.0, 0.5, 0.35, 2.4); ctx.fillRect(3.7, 0.5, 0.35, 2.4);
    ctx.fillStyle = '#ffffff';
    [0.0, 1.0, 2.0, 3.0].forEach(function (x) {
      ctx.beginPath(); ctx.arc(x, 1.7, 0.22, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#ffe81a';
    pacPath(ctx, -2.4, 1.7, 0.95, 0, 0.55 + Math.sin(t * 9) * 0.25);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(-4.3, 0.2 + ((t * 2.4) % 3.0), 8.4, 0.35);
    ctx.restore();

    ctx.save(); girarSobre(ctx, -5.0, -0.9, -ang);
    dientes(ctx, -1.6, 4.2, -0.5, 4, 1.2, '#f4f0e2');
    ctx.restore();
    dientes(ctx, -1.2, 4.0, -0.35, 3, -1.1, '#f4f0e2');

    ctx.save();
    girarSobre(ctx, -5.0, -0.9, -ang);
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.42; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2.6, -2.4); ctx.lineTo(-2.2, -4.0); ctx.stroke();
    ctx.fillStyle = '#e02a4a';
    ctx.beginPath(); ctx.arc(-2.65, -2.2, 0.62, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.1); ctx.stroke();
    [[0.2, -3.0, '#ffd23f'], [1.6, -3.2, '#3ee83e'], [3.0, -3.4, '#1ae0ff']].forEach(function (b) {
      ctx.fillStyle = b[2];
      ctx.beginPath(); ctx.arc(b[0], b[1], 0.5, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
    });
    ctx.fillStyle = '#0a0c14';
    roundRect(ctx, 2.0, -4.8, 1.6, 0.4, 0.15); ctx.fill();
    ctx.restore();

    /* la Q: INSERT COIN. Cae la moneda y el rótulo parpadea */
    if (q >= 0) {
      var caida = Math.min(1, q / 0.45);
      ctx.save();
      ctx.globalAlpha = caida < 1 ? 1 : Math.max(0, 1 - (q - 0.45) / 0.2);
      ctx.fillStyle = '#ffd23f';
      var cy2 = 6.5 - caida * 10.5;
      ctx.beginPath(); ctx.ellipse(2.8, cy2, 0.55 * Math.abs(Math.cos(q * 14)) + 0.15, 0.7, 0, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
      ctx.restore();
      if ((Math.floor(q * 8) % 2) === 0) {
        ctx.fillStyle = '#ffe81a';
        var letras = [0, 1, 2, 4, 5, 6, 8, 9, 11, 12];
        letras.forEach(function (n) { ctx.fillRect(-4.4 + n * 0.85, 6.4, 0.6, 0.9); });
      }
    }
    ctx.restore();
  };

  /* ---------------- CANGREJO ---------------- */
  /* De FRENTE (de perfil parecía una araña) y lo más simple posible:
   * caparazón, dos ojos en tallo, dos pinzas y tres patas por lado. Nada
   * más. Camina de costado, como el bicho de verdad, así que mira a cámara
   * mientras avanza; la pinza de delante es la boca. */
  DRAW.cangrejo = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 0.7), k;
    var ang = (q >= 0 ? (q < 0.25 ? 34 * (1 - q / 0.25) : 0) : [0, 15, 30][fz]) * Math.PI / 180;
    var casco = hex(mix(o.c, '#ff4f1f', 0.58)), cascoOsc = mix(casco, '#3a0600', 0.45);
    var paso = Math.sin(t * 11);
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.abs(Math.sin(t * 11)) * 0.3 - 0.3);
    ctx.lineCap = 'round';

    /* patas: tres por lado, un simple trazo curvo */
    function pata(f, lado, largo, vai) {
      ctx.beginPath();
      ctx.moveTo(f, -1.0);
      ctx.quadraticCurveTo(f + lado * largo * 0.8, -1.6, f + lado * largo + vai * lado, -1.0 - largo);
      ctx.lineWidth = 1.7; ctx.strokeStyle = TINTA; ctx.stroke();
      ctx.lineWidth = 1.0; ctx.strokeStyle = casco; ctx.stroke();
    }
    [[-3.6, -1], [-2.2, -1], [-0.8, -1], [0.8, 1], [2.2, 1], [3.6, 1]].forEach(function (p, k2) {
      pata(p[0], p[1], 3.2 + (k2 % 3) * 0.3, paso * 0.7 * (k2 % 2 ? 1 : -1));
    });

    /* caparazón: una sola forma ancha y redondeada */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-5.4, 0.4);
      ctx.quadraticCurveTo(-5.2, 3.2, 0, 3.4);
      ctx.quadraticCurveTo(5.2, 3.2, 5.4, 0.4);
      ctx.quadraticCurveTo(5.0, -2.6, 0, -2.9);
      ctx.quadraticCurveTo(-5.0, -2.6, -5.4, 0.4);
      ctx.closePath();
    }, casco, cascoOsc, 0.8, 0.8, 1.8);

    /* ojos en tallo */
    function ojo(f) {
      var bal = Math.sin(t * 5 + f) * 0.18;
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(f, 2.6); ctx.lineTo(f + bal, 5.6); ctx.stroke();
      ctx.strokeStyle = casco; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.fillStyle = '#fdfaf0';
      ctx.beginPath(); ctx.arc(f + bal, 5.8, 1.2, 0, Math.PI * 2); ctx.fill();
      contorno(ctx, 1.4); ctx.stroke();
      ctx.fillStyle = TINTA;
      ctx.beginPath(); ctx.arc(f + bal, 5.85, 0.6, 0, Math.PI * 2); ctx.fill();
    }
    ojo(-1.6);
    ojo(1.6);

    /* pinzas: palma y dos dedos romos, sin más adorno */
    function pinza(cx, lado, esc, abre) {
      ctx.save();
      ctx.translate(cx, 1.2);
      ctx.scale(lado * esc, esc);
      ctx.strokeStyle = TINTA; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.moveTo(-2.4, -1.2); ctx.lineTo(-1.0, -0.6); ctx.stroke();
      ctx.strokeStyle = casco; ctx.lineWidth = 2.0; ctx.stroke();
      piezaX(ctx, function () {
        ctx.beginPath(); ctx.ellipse(-0.3, 0, 2.3, 2.2, 0, 0, Math.PI * 2);
      }, casco, cascoOsc, 0.7, 0.7, 1.7);
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(0.4, -0.4);
        ctx.quadraticCurveTo(2.6, -3.0, 4.4, -1.6);
        ctx.quadraticCurveTo(4.0, -0.2, 0.8, 0.0);
        ctx.closePath();
      }, casco, cascoOsc, 0.4, 0.4, 1.6);
      ctx.save();
      girarSobre(ctx, 0.2, 0, abre);
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(0.4, 0.4);
        ctx.quadraticCurveTo(2.6, 3.0, 4.4, 1.6);
        ctx.quadraticCurveTo(4.0, 0.2, 0.8, 0.0);
        ctx.closePath();
      }, casco, cascoOsc, 0.4, 0.4, 1.6);
      ctx.restore();
      ctx.restore();
    }
    pinza(-5.8, -1, 0.78, 0.25 + Math.sin(t * 6) * 0.15);
    pinza(5.8, 1, 1.0, ang * 1.5);

    /* el pinzazo de la Q */
    if (q >= 0 && q < 0.4) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - q / 0.4) + ')'; ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (k = 0; k < 3; k++) {
        var a3 = (k - 1) * 0.5;
        ctx.moveTo(10.2 + Math.cos(a3) * 0.6, 1.2 + Math.sin(a3) * 1.2);
        ctx.lineTo(10.2 + Math.cos(a3) * 2.4, 1.2 + Math.sin(a3) * 2.8);
      }
      ctx.stroke();
      for (k = 0; k < 4; k++) {
        var ab = k * 1.57 + 0.4, db = q * (3 + (k % 2) * 2.5);
        ctx.strokeStyle = 'rgba(210,245,255,' + (1 - q) + ')'; ctx.lineWidth = 0.25;
        ctx.beginPath(); ctx.arc(10.4 + Math.cos(ab) * db, 1.2 + Math.sin(ab) * db, 0.4 + q * 0.6, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  };

  /* ---------------- UNICORNIO ---------------- */
  DRAW.unicornio = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 0.9), k;
    var ang = [0, 14, 26][fz] * Math.PI / 180;
    var pelo = hex(mix(o.c, '#ffffff', 0.55)), peloOsc = mix(pelo, '#4a2f5e', 0.35);
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 5) * 0.25);

    for (var i = 0; i < 6; i++) {
      var w = Math.sin(t * 5 + i * 0.7) * 0.7;
      ctx.strokeStyle = PRISMA[(i + 1) % PRISMA.length];
      ctx.lineWidth = 1.25; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0.6 - i * 0.35, 4.6 - i * 0.9);
      ctx.quadraticCurveTo(-4.0, 4.0 - i * 1.1 + w, -8.2 + i * 0.3, 1.4 - i * 1.3 + w);
      ctx.stroke();
    }

    ctx.fillStyle = '#4a1030';
    ctx.beginPath(); ctx.moveTo(0.0, -0.6); ctx.lineTo(6.4, -0.2); ctx.lineTo(6.4, -3.0); ctx.lineTo(0.0, -1.4); ctx.closePath(); ctx.fill();

    var cabeza = new Path2D();
    cabeza.moveTo(6.6, 0.4);
    cabeza.quadraticCurveTo(6.8, 2.0, 5.4, 2.4);
    cabeza.quadraticCurveTo(3.4, 2.8, 2.2, 4.0);
    cabeza.quadraticCurveTo(0.6, 5.6, -2.0, 5.0);
    cabeza.quadraticCurveTo(-4.6, 4.4, -4.6, 1.0);
    cabeza.quadraticCurveTo(-4.6, -1.2, -2.2, -1.6);
    cabeza.lineTo(0.0, -0.8);
    cabeza.lineTo(6.6, 0.4);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(-1.2, -0.9); mand.lineTo(6.6, -0.2);
    mand.quadraticCurveTo(6.4, -2.4, 3.8, -3.0);
    mand.quadraticCurveTo(0.4, -3.6, -2.4, -2.4);
    mand.closePath();
    rostro(ctx, cabeza, mand, -0.4, -0.8, ang, pelo, peloOsc, 0.7, 0.7);

    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-1.4, 4.6); ctx.quadraticCurveTo(-1.0, 7.4, 0.8, 6.0);
      ctx.quadraticCurveTo(0.6, 4.8, -1.4, 4.6); ctx.closePath();
    }, pelo, peloOsc, 0.3, 0.3, 1.3);
    ctx.fillStyle = '#ffb8d8';
    ctx.beginPath(); ctx.moveTo(-0.9, 5.0); ctx.quadraticCurveTo(-0.6, 6.5, 0.3, 5.8); ctx.closePath(); ctx.fill();

    ctx.save();
    ctx.translate(2.6, 4.2);
    ctx.rotate(-0.42);
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.moveTo(-1.15, 0); ctx.lineTo(1.15, 0); ctx.lineTo(0.15, 5.4); ctx.closePath();
    }, '#ffd24a', '#a8730a', 0.3, 0.3, 1.4);
    ctx.strokeStyle = '#a8730a'; ctx.lineWidth = 0.3; ctx.lineCap = 'round';
    for (k = 1; k <= 4; k++) {
      var u2 = k / 5, yy = u2 * 5.2, ww = 1.05 * (1 - u2 * 0.85);
      ctx.beginPath(); ctx.moveTo(-ww, yy - 0.25); ctx.lineTo(ww * 0.8, yy + 0.35); ctx.stroke();
    }
    ctx.restore();
    destello(ctx, 4.4, 9.2, 0.7, 0.6 + 0.4 * Math.sin(t * 4));

    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(1.6, 1.8, 1.05, 1.15, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.3); ctx.stroke();
    ctx.fillStyle = '#5a2a7a';
    ctx.beginPath(); ctx.arc(1.9, 1.75, 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(2.0, 1.75, 0.26, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 1.6, 2.3, 0.3, 0.95);
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.28; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(1.1, 2.9); ctx.lineTo(0.5, 3.7);
    ctx.moveTo(1.9, 3.0); ctx.lineTo(1.7, 3.9);
    ctx.moveTo(2.6, 2.8); ctx.lineTo(2.9, 3.7);
    ctx.stroke();

    ctx.fillStyle = mix(pelo, '#ff9ec4', 0.55);
    ctx.beginPath(); ctx.ellipse(5.6, 1.0, 1.0, 0.85, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = peloOsc;
    ctx.beginPath(); ctx.ellipse(5.9, 1.2, 0.32, 0.2, 0.4, 0, Math.PI * 2); ctx.fill();

    /* la Q: fogonazo de arcoíris por el cuerno */
    if (q >= 0) {
      var vivo2 = q < 0.7 ? 1 : (1 - q) / 0.3;
      var L2 = 3 + Math.sin(Math.min(1, q * 1.5) * Math.PI) * 10;
      ctx.save();
      ctx.translate(4.5, 8.8);
      ctx.rotate(-0.42);
      for (k = 0; k < 7; k++) {
        ctx.fillStyle = PRISMA[k];
        var off = (k - 3) * 0.42;
        ctx.globalAlpha = vivo2;
        ctx.beginPath();
        ctx.moveTo(-0.3, 0);
        ctx.quadraticCurveTo(L2 * 0.5, off * 1.4, L2, off * 3.0);
        ctx.lineTo(L2, off * 3.0 + 0.5);
        ctx.quadraticCurveTo(L2 * 0.5, off * 1.4 + 0.5, -0.3, 0.5);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      destello(ctx, 4.5, 8.8, 1.2 * vivo2, vivo2);
    }
    ctx.restore();
  };

  /* ---------------- CARACOL ---------------- */
  DRAW.caracol = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.1), k;
    var ang = [0, 16, 30][fz] * Math.PI / 180;
    var cuerpo = hex(mix(o.c, '#f6e6c8', 0.45)), cuerpoOsc = mix(cuerpo, '#3a2410', 0.42);
    var concha = hex(mix(o.c, '#e0a03a', 0.35)), conchaOsc = mix(concha, '#40210a', 0.45);
    /* la Q: se mete en la concha y rueda. `escondido` (la muerte) lo mete
     * del todo, pero quieto: la concha no gira */
    var dentro = o.escondido ? 1
      : ((q >= 0) ? Math.sin(Math.min(1, q * 2.2) * Math.PI / 2) * (q > 0.75 ? (1 - q) / 0.25 : 1) : 0);
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, Math.sin(t * 6) * 0.18);

    ctx.fillStyle = 'rgba(205,255,235,.8)';
    ctx.beginPath();
    ctx.moveTo(-3.0, -3.4);
    ctx.quadraticCurveTo(-7.0, -3.0, -9.6, -4.2);
    ctx.quadraticCurveTo(-7.0, -5.0, -3.0, -4.6);
    ctx.closePath(); ctx.fill();

    if (dentro < 0.9) {
      ctx.save();
      ctx.globalAlpha = 1 - dentro;
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(6.0 - dentro * 6, -1.2);
        ctx.quadraticCurveTo(6.6 - dentro * 6, -3.4, 3.6 - dentro * 4, -3.8);
        ctx.lineTo(-4.4, -3.6);
        ctx.quadraticCurveTo(-7.0, -3.4, -6.4, -1.6);
        ctx.quadraticCurveTo(-3.0, -0.4, 1.2, -0.6);
        ctx.closePath();
      }, cuerpo, cuerpoOsc, 0.5, 0.5);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(-2.2 + dentro * 2.2, 1.6 - dentro * 1.6);
    if (dentro > 0 && !o.escondido) ctx.rotate(-q * 14);
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    }, concha, conchaOsc, 0.9, 0.9, 1.8);
    ctx.strokeStyle = conchaOsc; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var a = 0; a < Math.PI * 4.6; a += 0.12) {
      var rr = 4.3 * Math.pow(0.90, a);
      var px = Math.cos(a - 0.6) * rr, py = Math.sin(a - 0.6) * rr;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.arc(0, 0, 3.4, 1.6, 2.6); ctx.stroke();
    ctx.restore();

    if (dentro < 0.9) {
      ctx.save();
      ctx.globalAlpha = 1 - dentro;
      ctx.translate(-dentro * 5, 0);
      ctx.fillStyle = '#4a2030';
      ctx.beginPath(); ctx.moveTo(2.6, -1.0); ctx.lineTo(6.2, -0.8); ctx.lineTo(6.2, -2.8); ctx.lineTo(2.6, -2.0); ctx.closePath(); ctx.fill();
      var cabeza = new Path2D();
      cabeza.moveTo(6.4, -0.6);
      cabeza.quadraticCurveTo(6.6, 1.2, 5.0, 1.6);
      cabeza.quadraticCurveTo(3.0, 2.0, 1.6, 1.0);
      cabeza.lineTo(2.6, -1.0);
      cabeza.lineTo(6.4, -0.6);
      cabeza.closePath();
      var mand = new Path2D();
      mand.moveTo(2.4, -1.2); mand.lineTo(6.4, -0.9);
      mand.quadraticCurveTo(6.4, -2.6, 4.4, -3.0);
      mand.quadraticCurveTo(2.6, -3.0, 1.8, -2.0);
      mand.closePath();
      rostro(ctx, cabeza, mand, 2.2, -1.1, ang, cuerpo, cuerpoOsc, 0.5, 0.5);

      function tent(x0, y0, x1, y1, r) {
        ctx.strokeStyle = TINTA; ctx.lineWidth = 1.15; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + 0.6, (y0 + y1) / 2, x1, y1); ctx.stroke();
        ctx.strokeStyle = cuerpo; ctx.lineWidth = 0.6; ctx.stroke();
        ctx.fillStyle = '#fdfaf0';
        ctx.beginPath(); ctx.arc(x1, y1, r, 0, Math.PI * 2); ctx.fill();
        contorno(ctx, 1.2); ctx.stroke();
        ctx.fillStyle = TINTA;
        ctx.beginPath(); ctx.arc(x1 + r * 0.32, y1, r * 0.45, 0, Math.PI * 2); ctx.fill();
      }
      tent(4.4, 1.2, 5.6, 4.6 - dentro * 3.4 + Math.sin(t * 4) * 0.2, 1.0);
      tent(3.0, 1.4, 3.4, 3.4 - dentro * 2.4 + Math.sin(t * 4 + 1) * 0.2, 0.75);
      ctx.restore();
    }

    /* rodando: rayas de velocidad */
    if (dentro > 0.4) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (dentro * 0.7) + ')'; ctx.lineWidth = 0.35;
      ctx.beginPath();
      for (k = 0; k < 3; k++) {
        var s0 = 2.4 - k * 2.4;
        ctx.moveTo(-6.0, s0); ctx.lineTo(-9.5 - k * 0.8, s0);
      }
      ctx.stroke();
    }
    ctx.restore();
  };
