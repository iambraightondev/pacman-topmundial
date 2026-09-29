  /* =====================================================================
   * TEMPORADA DE NOVIEMBRE — DÍA DE MUERTOS
   * Las cinco piezas exclusivas del camino del pase. El 1 y el 2 de
   * noviembre los difuntos vuelven de visita: en un juego de fantasmas, es
   * la fiesta que toca. Mismo marco que el resto del vestuario (f hacia
   * donde avanza, s hacia la coronilla) y la misma cadencia: la Q cada
   * 3,4 s con qFase() y la muerte cada 6,8 s.
   *
   * Escritas ya como las quiere el juego: la skin como DRAW.id (al portarla,
   * qFase(t, 3.4, d) -> qDe(o, d)), los accesorios como ACC.id, el efecto
   * como EFX.id(ctx, o, cuerpo) y el emote como caraMuertos(). El puente del
   * final las enchufa a la vitrina.
   * ===================================================================== */
  var ACC = {}, EFX = {};

  /* los colores de los alebrijes y del papel picado */
  var PAL_MUERTOS = ['#ff2d8a', '#ffd400', '#2de0ff', '#7dff4a', '#ff7a1a', '#a64dff'];

  /* una flor de cempasúchil: coronas de pétalos rizados, de fuera adentro */
  function cempasuchil(ctx, x, y, r, giro, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.translate(x, y);
    ctx.rotate(giro);
    [[1, 12, '#e86a00'], [0.74, 10, '#ff9412'], [0.48, 8, '#ffb733']].forEach(function (capa, j) {
      var rr = r * capa[0], n = capa[1];
      ctx.fillStyle = capa[2];
      for (var k = 0; k < n; k++) {
        var a = k * Math.PI * 2 / n + j * 0.3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr * 0.62, Math.sin(a) * rr * 0.62, rr * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.fillStyle = '#b84a00';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ---------------- ALEBRIJE ----------------
   * El bicho imposible de los artesanos de Oaxaca: medio gato, medio
   * dragón, con alas de mariposa y cola en espiral, pintado entero a lunares
   * y rayas de colores. La cara es la del color del jugador; el hocico es
   * la boca y la mandíbula baja al comer. Es extravagante: no es un
   * Pac-Man pintado, es otro bicho. */
  DRAW.alebrije = function (ctx, o) {
    var fz = fase(o), t = o.t, q = qFase(t, 3.4, 1.2), k;
    var ang = [0, 18, 34][fz] * Math.PI / 180;
    var fiesta = (q >= 0) ? Math.sin(Math.min(1, q * 1.3) * Math.PI) : 0;
    var piel = hex(mix(o.c, '#ff2d8a', 0.3)), pielOsc = hex(mix(piel, '#2a0630', 0.5));
    /* en la Q los colores de la pintura bailan de sitio */
    var gira = (q >= 0) ? Math.floor(q * 14) : 0;
    function pc(n) { return PAL_MUERTOS[(n + gira) % PAL_MUERTOS.length]; }
    var aleteo = Math.sin(t * 8) * 0.18 + fiesta * (0.35 + Math.sin(t * 30) * 0.45);
    var salto = Math.abs(Math.sin(t * 7)) * 0.3 + fiesta * 1.1;
    var paso = Math.sin(t * 14) * 0.5;
    ctx.save();
    frame(ctx, o.x, o.y, o.d);
    ctx.translate(0, salto - 0.15);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    /* la cola, en espiral, por detrás */
    function cola() {
      ctx.beginPath();
      ctx.moveTo(-5.6, -1.6);
      ctx.quadraticCurveTo(-8.6, -1.4, -8.4, 1.0 + Math.sin(t * 5) * 0.3);
      ctx.quadraticCurveTo(-8.2, 2.8, -6.8, 2.5);
      ctx.quadraticCurveTo(-5.9, 2.1, -6.5, 1.3);
    }
    cola(); ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5; ctx.stroke();
    cola(); ctx.strokeStyle = piel; ctx.lineWidth = 0.95; ctx.stroke();
    [[-7.6, -1.2], [-8.4, 0.6], [-7.6, 2.4]].forEach(function (p, j) {
      ctx.fillStyle = pc(j + 2);
      ctx.beginPath(); ctx.arc(p[0], p[1], 0.3, 0, Math.PI * 2); ctx.fill();
    });

    /* el ala de mariposa, en el lomo; bate y en la Q se abre del todo */
    ctx.save();
    girarSobre(ctx, -2.6, 1.2, aleteo);
    ctx.translate(-2.6, 1.2);
    function ala() {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-0.6, 4.4, -3.6, 5.6);
      ctx.quadraticCurveTo(-4.2, 4.4, -5.4, 4.2);
      ctx.quadraticCurveTo(-4.6, 2.8, -5.4, 1.6);
      ctx.quadraticCurveTo(-2.6, 1.0, 0, 0);
      ctx.closePath();
    }
    piezaX(ctx, ala, pc(2), hex(mix(pc(2), '#0a2040', 0.45)), 0.35, 0.35, 1.3);
    ctx.save(); ala(); ctx.clip();
    ctx.fillStyle = pc(0);
    ctx.beginPath(); ctx.arc(-3.0, 3.6, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pc(1);
    ctx.beginPath(); ctx.arc(-3.0, 3.6, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pc(5);
    ctx.beginPath(); ctx.arc(-4.4, 2.2, 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,20,.5)'; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3.4, 4.9); ctx.moveTo(0, 0); ctx.lineTo(-4.8, 2.2); ctx.stroke();
    ctx.restore();
    ctx.restore();

    /* las patas, que andan */
    [[-4.2, -paso], [0.2, paso]].forEach(function (p) {
      ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p[0], -3.2); ctx.lineTo(p[0] + p[1] * 0.6, -5.2); ctx.stroke();
      ctx.strokeStyle = pielOsc; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = pc(4);
      ctx.beginPath(); ctx.arc(p[0] + p[1] * 0.6, -5.3, 0.45, 0, Math.PI * 2); ctx.fill();
    });

    /* el cuerpo, a rayas y lunares */
    function cuerpo() { ctx.beginPath(); ctx.ellipse(-2.4, -1.3, 3.8, 2.9, 0, 0, Math.PI * 2); }
    piezaX(ctx, cuerpo, piel, pielOsc, 0.5, 0.5, 1.5);
    ctx.save(); cuerpo(); ctx.clip();
    ctx.strokeStyle = pc(1); ctx.lineWidth = 0.55;
    ctx.beginPath();
    for (k = 0; k <= 8; k++) {
      var zx = -6.2 + k * 0.95, zy = -1.0 + ((k % 2) ? 0.7 : -0.7);
      if (k === 0) ctx.moveTo(zx, zy); else ctx.lineTo(zx, zy);
    }
    ctx.stroke();
    [[-4.4, 0.8, 3], [-2.2, 1.0, 5], [-0.6, -2.6, 4], [-3.4, -3.0, 0], [-5.4, -1.8, 3]].forEach(function (p) {
      ctx.fillStyle = pc(p[2]);
      ctx.beginPath(); ctx.arc(p[0], p[1], 0.42, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    /* las orejas, puntiagudas y de otro color */
    [[0.2, 3.4, -0.2, 7.0, 1.8, 4.2], [2.0, 4.2, 3.2, 7.2, 3.8, 4.0]].forEach(function (e, j) {
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(e[0], e[1]);
        ctx.quadraticCurveTo(e[2] - 0.6, e[3] - 1.6, e[2], e[3]);
        ctx.quadraticCurveTo(e[4], e[5] + 1.4, e[4], e[5]);
        ctx.closePath();
      }, pc(1 + j * 4), hex(mix(pc(1 + j * 4), '#301000', 0.45)), 0.25, 0.25, 1.3);
    });

    /* el hueco de la boca y la cabeza */
    /* (solo lo que abre la mandíbula: con la boca cerrada no asoma nada) */
    var ca = Math.cos(ang), sa = Math.sin(ang);
    function baja(x, y) { var dx = x - 0.4, dy = y - 0.1; return [0.4 + dx * ca + dy * sa, 0.1 - dx * sa + dy * ca]; }
    var punta = baja(6.0, 0.6);
    ctx.fillStyle = '#2a0418';
    ctx.beginPath(); ctx.moveTo(0.4, 0.1); ctx.lineTo(6.2, 0.8); ctx.lineTo(punta[0], punta[1]); ctx.closePath(); ctx.fill();
    var cabeza = new Path2D();
    cabeza.moveTo(0.4, 0.2);
    cabeza.lineTo(6.2, 0.8);
    cabeza.quadraticCurveTo(6.7, 2.8, 4.8, 3.8);
    cabeza.quadraticCurveTo(2.8, 5.0, 0.8, 4.3);
    cabeza.quadraticCurveTo(-0.9, 3.3, -0.6, 1.6);
    cabeza.quadraticCurveTo(-0.4, 0.4, 0.4, 0.2);
    cabeza.closePath();
    var mand = new Path2D();
    mand.moveTo(0.4, 0.0);
    mand.lineTo(6.0, 0.6);
    mand.quadraticCurveTo(5.6, -1.1, 3.4, -1.4);
    mand.quadraticCurveTo(1.2, -1.5, 0.4, 0.0);
    mand.closePath();
    rostro(ctx, cabeza, mand, 0.4, 0.1, ang, piel, pielOsc, 0.6, 0.6);

    /* la pintura de la cara: una franja por el hocico y lunares en la frente */
    ctx.save(); ctx.clip(cabeza);
    ctx.fillStyle = pc(4);
    ctx.beginPath(); ctx.ellipse(5.2, 2.0, 0.9, 2.4, 0.35, 0, Math.PI * 2); ctx.fill();
    [[1.4, 3.6, 3], [0.2, 2.2, 5], [2.4, 4.1, 0]].forEach(function (p) {
      ctx.fillStyle = pc(p[2]);
      ctx.beginPath(); ctx.arc(p[0], p[1], 0.36, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    /* colmillos arriba */
    ctx.fillStyle = '#fbf7ea';
    [[4.4, 0.62], [5.5, 0.72]].forEach(function (d) {
      ctx.beginPath(); ctx.moveTo(d[0] - 0.3, d[1]); ctx.lineTo(d[0] + 0.3, d[1] + 0.03); ctx.lineTo(d[0], d[1] - 0.65); ctx.closePath(); ctx.fill();
    });
    /* la nariz */
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(6.1, 2.1, 0.32, 0, Math.PI * 2); ctx.fill();
    /* el ojo, con su aro pintado */
    ctx.strokeStyle = pc(0); ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.arc(3.2, 2.5, 1.35, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(3.2, 2.5, 1.0, 1.08, 0, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.1); ctx.stroke();
    ctx.fillStyle = pc(3);
    ctx.beginPath(); ctx.arc(3.5, 2.45, 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(3.6, 2.45, 0.34, 0, Math.PI * 2); ctx.fill();
    destello(ctx, 3.25, 2.85, 0.28, 0.95);

    /* Q: la fiesta de color: las alas se abren y echa chispas de colores */
    if (q >= 0) {
      for (k = 0; k < 10; k++) {
        var u = (q * 1.7 + k / 10) % 1;
        estrella4(ctx, 6.6 + u * 9, 0.4 + Math.sin(k * 2.3) * u * 3.4,
          0.55 * (1 - u * 0.5), PAL_MUERTOS[k % PAL_MUERTOS.length], (1 - u) * (0.4 + fiesta * 0.6));
      }
    }
    ctx.restore();
  };

  /* ---------------- SOMBRERO CATRINA ----------------
   * El de la Calavera Garbancera: ala enorme y oscura con su borde de
   * encaje, cinta del color del jugador, un ramillete de flores delante y
   * una pluma de avestruz que se mece por detrás. */
  ACC.acc_catrina = function (ctx, o) {
    var ala = '#2b1838', alaOsc = '#12081a', k;
    ctx.save();
    ctx.translate(0.2, R - 0.9);
    ctx.rotate(0.07 + Math.sin(o.t * 5) * 0.02);
    /* la pluma, por detrás */
    var w = Math.sin(o.t * 3.2) * 0.22;
    ctx.save();
    ctx.translate(-2.0, 2.0);
    ctx.rotate(0.95 + w);
    ctx.fillStyle = '#f6f2fb';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(1.6, 3.2, 0.3, 6.4);
    ctx.quadraticCurveTo(-1.4, 3.2, 0, 0);
    ctx.fill();
    contorno(ctx, 1); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,140,190,.7)'; ctx.lineWidth = 0.14;
    ctx.beginPath();
    for (k = 1; k < 7; k++) {
      ctx.moveTo(0.1, k * 0.85); ctx.lineTo(0.9 - k * 0.05, k * 0.85 + 0.5);
      ctx.moveTo(0.1, k * 0.85); ctx.lineTo(-0.7 + k * 0.05, k * 0.85 + 0.5);
    }
    ctx.stroke();
    ctx.restore();
    /* la copa */
    function copa() {
      ctx.beginPath();
      ctx.moveTo(-2.7, 0.4);
      ctx.quadraticCurveTo(-2.8, 3.3, 0, 3.4);
      ctx.quadraticCurveTo(2.8, 3.3, 2.7, 0.4);
      ctx.closePath();
    }
    piezaX(ctx, copa, ala, alaOsc, 0.4, 0.4, 1.5);
    ctx.save(); copa(); ctx.clip();
    ctx.fillStyle = o.c;
    ctx.fillRect(-3, 0.6, 6, 0.75);
    ctx.restore();
    /* el ala, ancha, con el encaje en el borde */
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.ellipse(0, 0.35, 6.4, 1.05, 0, 0, Math.PI * 2);
    }, ala, alaOsc, 0.3, 0.3, 1.6);
    ctx.fillStyle = 'rgba(244,236,248,.85)';
    for (k = 0; k < 11; k++) {
      var a = Math.PI * (0.05 + k * 0.09);
      ctx.beginPath(); ctx.arc(Math.cos(a) * 6.1, 0.35 - Math.sin(a) * 0.95, 0.24, 0, Math.PI * 2); ctx.fill();
    }
    /* el ramillete, delante */
    cempasuchil(ctx, 2.3, 1.5, 1.25, o.t * 0.3, 1);
    ctx.fillStyle = '#ff4fa3';
    for (k = 0; k < 6; k++) {
      var b = k * Math.PI / 3 + o.t * 0.2;
      ctx.beginPath(); ctx.arc(0.7 + Math.cos(b) * 0.45, 2.4 + Math.sin(b) * 0.45, 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#c2186b';
    ctx.beginPath(); ctx.arc(0.7, 2.4, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (k = 0; k < 5; k++) {
      var c = k * Math.PI * 0.4;
      ctx.beginPath(); ctx.arc(3.5 + Math.cos(c) * 0.32, 0.95 + Math.sin(c) * 0.32, 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd400';
    ctx.beginPath(); ctx.arc(3.5, 0.95, 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  /* ---------------- FLOR DE CEMPASÚCHIL ----------------
   * La flor de los muertos, prendida detrás de la oreja: gira despacio y de
   * vez en cuando suelta un pétalo que se va volando hacia atrás. */
  ACC.acc_cempasuchil = function (ctx, o) {
    var fx = -1.9, fy = 4.4;
    /* la hoja */
    ctx.save();
    ctx.translate(fx - 0.6, fy - 1.0);
    ctx.rotate(-2.3 + Math.sin(o.t * 3) * 0.08);
    ctx.fillStyle = '#3f9b2a';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(1.0, 0.8, 2.4, 0); ctx.quadraticCurveTo(1.0, -0.8, 0, 0);
    ctx.fill();
    contorno(ctx, 0.9); ctx.stroke();
    ctx.restore();
    var late = 1 + Math.sin(o.t * 2.4) * 0.04;
    ctx.save();
    ctx.beginPath(); ctx.arc(fx, fy, 2.0 * late, 0, Math.PI * 2);
    contorno(ctx, 1.4); ctx.stroke();
    ctx.restore();
    cempasuchil(ctx, fx, fy, 2.0 * late, o.t * 0.4, 1);
    /* el pétalo que se suelta */
    var u = (o.t / 2.2) % 1;
    if (u < 0.8) {
      var v = u / 0.8;
      ctx.save();
      ctx.globalAlpha = 1 - v;
      ctx.translate(fx - 1.2 - v * 5.5, fy + 0.6 - v * 3.2 + Math.sin(v * 9) * 0.5);
      ctx.rotate(v * 7);
      ctx.fillStyle = '#ff9412';
      ctx.beginPath(); ctx.ellipse(0, 0, 0.55, 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  };

  /* ---------------- VELITAS ----------------
   * Va dejando velitas encendidas en el suelo, como el camino a la ofrenda:
   * se van consumiendo, la llama se achica y al final se apagan con su
   * hilito de humo. Una de cada tres es del color del jugador. */
  EFX.efx_velitas = function (ctx, o, cuerpo) {
    var ptos = rastro(o, 10, 84);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ptos.forEach(function (q) {
      var vive = 1 - tramo(q.edad, 0.72, 0.86);
      if (vive <= 0) return;
      var alto = 2.0 * (1 - q.edad * 0.6);
      var fl = 0.85 + 0.15 * Math.sin(o.t * 13 + q.n * 2.1);
      var fy = q.p.y + 1.6 - alto - 0.9;
      var g = ctx.createRadialGradient(q.p.x, fy, 0.1, q.p.x, fy, 3.4 * fl);
      g.addColorStop(0, 'rgba(255,170,60,' + (0.4 * vive) + ')');
      g.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(q.p.x, fy, 3.4 * fl, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    ptos.forEach(function (q) {
      var alto = 2.0 * (1 - q.edad * 0.6);
      var x = q.p.x, y = q.p.y + 1.6;
      var cera = (q.n % 3 === 0) ? hex(mix(o.c, '#ffffff', 0.35)) : '#f4eee0';
      ctx.globalAlpha = 1 - tramo(q.edad, 0.9, 1);
      ctx.fillStyle = cera;
      roundRect(ctx, x - 0.55, y - alto, 1.1, alto, 0.2); ctx.fill();
      contorno(ctx, 0.9); ctx.stroke();
      /* la gota de cera que resbala */
      ctx.fillStyle = cera;
      ctx.beginPath(); ctx.arc(x + 0.35, y - alto + 0.5 + q.edad * 0.6, 0.22, 0, Math.PI * 2); ctx.fill();
      var vive = 1 - tramo(q.edad, 0.72, 0.86);
      var fl = 0.85 + 0.15 * Math.sin(o.t * 13 + q.n * 2.1);
      var sway = Math.sin(o.t * 9 + q.n) * 0.12;
      if (vive > 0) {
        gota(ctx, x + sway, y - alto - 0.55, 0.42 * fl * vive, '#ff9a1a', 1);
        gota(ctx, x + sway, y - alto - 0.45, 0.22 * fl * vive, '#fff4c2', 1);
      } else {
        /* el humito de la que se apagó */
        var h = tramo(q.edad, 0.86, 1);
        ctx.fillStyle = 'rgba(190,190,200,' + ((1 - h) * 0.5) + ')';
        ctx.beginPath(); ctx.arc(x + Math.sin(h * 6) * 0.5, y - alto - 1 - h * 3, 0.35 + h * 0.5, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    cuerpo();
  };

  /* ---------------- EMOTE: CALAVERITA ----------------
   * La cara se vuelve calaverita de azúcar: blanca, con las cuencas
   * rodeadas de pétalos del color del jugador, la flor en la frente y la
   * boca cosida. Se ríe castañeteando la mandíbula y meciéndose. */
  function caraMuertos(ctx, x, y, r, color, id, t) {
    var ink = '#000000', lw = Math.max(1, r * 0.17), k;
    var mece = Math.sin(t * 0.12) * 0.12;
    var risa = Math.abs(Math.sin(t * 0.35));
    var azucar = '#f7f3ea', flor = hex(mix(color, '#ff8a00', 0.35));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(mece);
    /* la mandíbula, que castañetea */
    ctx.fillStyle = azucar;
    roundRect(ctx, -r * 0.5, r * 0.38 + risa * r * 0.12, r, r * 0.46, r * 0.18); ctx.fill();
    /* el cráneo */
    ctx.beginPath(); ctx.arc(0, -r * 0.12, r * 0.9, 0, Math.PI * 2); ctx.fill();
    /* las cuencas, con sus pétalos */
    [-1, 1].forEach(function (l) {
      var ex = l * r * 0.36, ey = -r * 0.12;
      ctx.fillStyle = color;
      for (k = 0; k < 7; k++) {
        var a = k * Math.PI * 2 / 7 + t * 0.03;
        ctx.beginPath(); ctx.arc(ex + Math.cos(a) * r * 0.34, ey + Math.sin(a) * r * 0.34, r * 0.1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(ex, ey, r * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex + r * 0.07, ey - r * 0.07, r * 0.07, 0, Math.PI * 2); ctx.fill();
    });
    /* la nariz, un corazoncito del revés */
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.12);
    ctx.quadraticCurveTo(-r * 0.16, r * 0.2, -r * 0.08, r * 0.3);
    ctx.lineTo(0, r * 0.26);
    ctx.lineTo(r * 0.08, r * 0.3);
    ctx.quadraticCurveTo(r * 0.16, r * 0.2, 0, r * 0.12);
    ctx.fill();
    /* la boca cosida, que se abre con la risa */
    var by = r * 0.5 + risa * r * 0.06;
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, by); ctx.lineTo(r * 0.4, by);
    for (k = 0; k < 5; k++) {
      var sx = -r * 0.32 + k * r * 0.16;
      ctx.moveTo(sx, by - r * 0.09); ctx.lineTo(sx, by + r * 0.09);
    }
    ctx.stroke();
    /* la flor de la frente */
    ctx.fillStyle = flor;
    for (k = 0; k < 5; k++) {
      var b = k * Math.PI * 0.4 - Math.PI / 2;
      ctx.beginPath(); ctx.arc(Math.cos(b) * r * 0.13, -r * 0.66 + Math.sin(b) * r * 0.13, r * 0.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd400';
    ctx.beginPath(); ctx.arc(0, -r * 0.66, r * 0.07, 0, Math.PI * 2); ctx.fill();
    /* los mofletes, dos puntitos de color */
    ctx.fillStyle = 'rgba(255,79,163,.6)';
    ctx.beginPath(); ctx.arc(-r * 0.66, r * 0.2, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.66, r * 0.2, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ---- de la forma del juego a la de la vitrina ---- */
  Object.keys(ACC).forEach(function (id) { DRAW[id] = accesorio(ACC[id]); });
  Object.keys(EFX).forEach(function (id) {
    var dib = EFX[id];
    DRAW[id] = function (ctx, o) { dib(ctx, o, function () { body(ctx, o); }); };
  });
  DRAW.emo_calaverita = function (ctx, o) {
    body(ctx, o);
    globoEmote(ctx, o.x, o.y - 11, o.c, o.t * 60, function (cx, cy, r) {
      caraMuertos(ctx, cx, cy, r, o.c, 'calaverita', o.t * 60);
    });
  };
