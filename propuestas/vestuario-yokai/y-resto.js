  /* Partículas que nacen cada `paso` px del camino y viven `vida` px.
   * (En el juego ya existe: al portar, esta no se copia.) */
  function rastro(o, paso, vida) {
    var out = [], base = Math.floor(o.s / paso) * paso;
    for (var k = 0; k < 40; k++) {
      var sk = base - k * paso, dist = o.s - sk;
      if (dist < 3) continue;
      var edad = dist / vida;
      if (edad >= 1) break;
      out.push({ p: o.back(dist), edad: edad, n: Math.abs(Math.round(sk / paso)) });
    }
    return out;
  }

  /* ---------------- ACCESORIOS ----------------
   * Escritos ya como los quiere el juego: ACC.id = function (ctx, o), en el
   * marco del cuerpo (f hacia delante, s hacia la coronilla) y con la skin
   * debajo. */
  var ACC = {};

  /* recorta FUERA del cuerpo: lo que va por detrás de Pac-Man no se pinta
   * encima de él */
  function fueraDelCuerpo(ctx) {
    ctx.beginPath();
    ctx.rect(-20, -20, 40, 40);
    ctx.arc(0, 0, R + 0.2, 0, Math.PI * 2, true);
    ctx.clip();
  }

  /* MÁSCARA KITSUNE: la de zorro de los festivales, echada a un lado de la
   * cabeza, blanca con los trazos bermellón */
  ACC.acc_kitsunemen = function (ctx, o) {
    var w = Math.sin(o.t * 2.4) * 0.05;
    ctx.save();
    ctx.translate(-2.6, 4.4);
    ctx.rotate(0.55 + w);
    /* el cordón */
    ctx.strokeStyle = '#e0322a'; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(2.0, 0.6); ctx.quadraticCurveTo(4.6, -0.6, 6.4, -2.4); ctx.stroke();
    var cara = function () {
      ctx.beginPath();
      ctx.moveTo(0, -3.2);
      ctx.quadraticCurveTo(1.3, -2.3, 2.3, -0.2);
      ctx.quadraticCurveTo(2.7, 1.2, 2.1, 2.0);
      ctx.lineTo(2.4, 4.4);
      ctx.lineTo(0.9, 2.5);
      ctx.quadraticCurveTo(0, 2.8, -0.9, 2.5);
      ctx.lineTo(-2.4, 4.4);
      ctx.lineTo(-2.1, 2.0);
      ctx.quadraticCurveTo(-2.7, 1.2, -2.3, -0.2);
      ctx.quadraticCurveTo(-1.3, -2.3, 0, -3.2);
      ctx.closePath();
    };
    piezaX(ctx, cara, '#fbf6ec', '#c9bfae', 0.3, -0.3, 1.5);
    ctx.fillStyle = '#e0322a';
    [-1, 1].forEach(function (l) {
      ctx.beginPath(); ctx.moveTo(l * 2.0, 2.5); ctx.lineTo(l * 2.2, 3.8); ctx.lineTo(l * 1.2, 2.6); ctx.closePath(); ctx.fill();
    });
    /* los ojos rasgados y las cejas en rojo */
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1.6, 0.9); ctx.lineTo(-0.5, 0.4);
    ctx.moveTo(1.6, 0.9); ctx.lineTo(0.5, 0.4);
    ctx.stroke();
    ctx.strokeStyle = '#e0322a'; ctx.lineWidth = 0.32;
    ctx.beginPath();
    ctx.moveTo(-1.8, 1.5); ctx.quadraticCurveTo(-1.0, 2.0, -0.4, 1.4);
    ctx.moveTo(1.8, 1.5); ctx.quadraticCurveTo(1.0, 2.0, 0.4, 1.4);
    ctx.moveTo(-1.6, -0.6); ctx.lineTo(-0.6, -1.2);
    ctx.moveTo(1.6, -0.6); ctx.lineTo(0.6, -1.2);
    ctx.stroke();
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(0, 1.9, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.ellipse(0, -2.7, 0.45, 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  /* KASA: el sombrero cónico de paja, con su cordón a la barbilla */
  ACC.acc_kasa = function (ctx, o) {
    var paja = '#e2c47a', pajaOsc = '#9a7a3a', k;
    ctx.save();
    girarSobre(ctx, 0, 5, -0.08);
    var cono = function () {
      ctx.beginPath();
      ctx.moveTo(-7.4, 4.3);
      ctx.quadraticCurveTo(-3.0, 7.6, 0.4, 9.8);
      ctx.quadraticCurveTo(3.8, 7.8, 7.8, 4.7);
      ctx.quadraticCurveTo(0.2, 3.6, -7.4, 4.3);
      ctx.closePath();
    };
    piezaX(ctx, cono, paja, pajaOsc, 0.5, 0.5, 1.6);
    ctx.save(); cono(); ctx.clip();
    ctx.strokeStyle = pajaOsc; ctx.lineWidth = 0.18;
    ctx.beginPath();
    for (k = -6; k <= 6; k++) { ctx.moveTo(0.4, 9.8); ctx.lineTo(k * 1.25, 4.0); }
    ctx.stroke();
    ctx.strokeStyle = '#7a5a26'; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-2.4, 7.2); ctx.quadraticCurveTo(0.4, 6.6, 3.2, 7.3); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#7a5a26';
    ctx.beginPath(); ctx.arc(0.4, 9.8, 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  /* CHONMAGE: el peinado de samurái: la coronilla afeitada, el pelo negro
   * recogido por detrás y el moño doblado encima, atado con cordón blanco */
  ACC.acc_chonmage = function (ctx, o) {
    var pelo = '#1e1a22', brillo = '#4a4456';
    /* la coronilla afeitada, más clara, respetando la boca */
    ctx.save();
    pacPath(ctx, 0, 0, R, 0, o.half);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.ellipse(1.2, 6.2, 3.6, 2.0, -0.15, 0, Math.PI * 2); ctx.fill();
    /* el pelo, cubriendo toda la parte de atrás de la cabeza */
    var nuca = function () {
      ctx.beginPath();
      ctx.moveTo(-1.2, 8);
      ctx.quadraticCurveTo(-1.6, 4.4, -3.2, 2.2);
      ctx.quadraticCurveTo(-4.6, 0.2, -4.4, -3.2);
      ctx.lineTo(-8, -3.6);
      ctx.lineTo(-8, 8);
      ctx.closePath();
    };
    nuca(); ctx.fillStyle = pelo; ctx.fill();
    ctx.save(); nuca(); ctx.clip();
    ctx.strokeStyle = brillo; ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(-3.0, 5.2); ctx.quadraticCurveTo(-4.2, 3.0, -5.2, 1.2);
    ctx.moveTo(-2.2, 5.8); ctx.quadraticCurveTo(-3.2, 4.0, -4.2, 2.8);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    /* el moño: sale de la nuca, sube y se dobla hacia delante sobre la
     * coronilla */
    var mech = function () {
      ctx.beginPath();
      ctx.moveTo(-3.4, 4.8);
      ctx.quadraticCurveTo(-3.8, 9.0, -0.6, 9.2);
      ctx.lineTo(4.0, 8.8);
      ctx.quadraticCurveTo(5.8, 8.0, 4.2, 6.9);
      ctx.lineTo(-0.2, 7.0);
      ctx.quadraticCurveTo(-1.2, 6.9, -1.3, 5.4);
      ctx.closePath();
    };
    piezaX(ctx, mech, brillo, pelo, 0.25, -0.25, 1.5);
    ctx.strokeStyle = '#f4f0e6'; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3.4, 7.6); ctx.lineTo(-1.3, 7.2); ctx.stroke();
  };

  /* RAMEN: un cuenco humeante en la cabeza, con sus palillos, su naruto y su
   * alga */
  ACC.acc_ramen = function (ctx, o) {
    var k, t = o.t;
    /* el vapor */
    ctx.save();
    ctx.lineCap = 'round';
    for (k = 0; k < 3; k++) {
      var u = (t * 0.6 + k / 3) % 1;
      ctx.strokeStyle = 'rgba(240,240,250,' + (0.6 * Math.sin(u * Math.PI)) + ')';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      var x0 = -1.8 + k * 1.8;
      ctx.moveTo(x0, 11.0 + u * 2);
      ctx.bezierCurveTo(x0 + 1, 12 + u * 2, x0 - 1, 13 + u * 2, x0 + 0.4, 14.2 + u * 2);
      ctx.stroke();
    }
    ctx.restore();
    /* los palillos, clavados */
    ctx.strokeStyle = TINTA; ctx.lineWidth = 0.75; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.6, 9.4); ctx.lineTo(3.8, 14.2); ctx.moveTo(0.2, 9.4); ctx.lineTo(4.8, 13.6); ctx.stroke();
    ctx.strokeStyle = '#c8905a'; ctx.lineWidth = 0.4; ctx.stroke();
    /* el caldo, con los fideos, el naruto, el huevo y el alga */
    ctx.fillStyle = '#d88a3a';
    ctx.beginPath(); ctx.ellipse(0, 10.2, 4.3, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    piezaX(ctx, function () { ctx.beginPath(); roundRect(ctx, -3.2, 9.8, 1.8, 2.6, 0.2); }, '#2f4a2a', '#14200f', 0.1, 0.1, 1.1);
    ctx.fillStyle = '#fdfaf0';
    ctx.beginPath(); ctx.ellipse(1.6, 10.4, 1.2, 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff6a9a'; ctx.lineWidth = 0.2;
    ctx.beginPath(); ctx.arc(1.6, 10.4, 0.35, 0, Math.PI * 1.6); ctx.stroke();
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(-0.4, 10.3, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffe890'; ctx.lineWidth = 0.22;
    ctx.beginPath();
    for (k = 0; k < 3; k++) { ctx.moveTo(2.6 + k * 0.3, 10.0); ctx.quadraticCurveTo(3.2 + k * 0.3, 10.8, 3.6 + k * 0.3, 10.1); }
    ctx.stroke();
    /* el cuenco, rojo con la greca blanca */
    var cuenco = function () {
      ctx.beginPath();
      ctx.moveTo(-4.4, 10.2);
      ctx.quadraticCurveTo(-4.0, 6.4, -1.6, 6.0);
      ctx.lineTo(1.6, 6.0);
      ctx.quadraticCurveTo(4.0, 6.4, 4.4, 10.2);
      ctx.quadraticCurveTo(0, 9.4, -4.4, 10.2);
      ctx.closePath();
    };
    piezaX(ctx, cuenco, '#e0322a', '#7a0e0a', 0.4, 0.4, 1.5);
    ctx.save(); cuenco(); ctx.clip();
    ctx.fillStyle = '#fbf6ec';
    ctx.fillRect(-5, 8.2, 10, 0.9);
    ctx.strokeStyle = '#e0322a'; ctx.lineWidth = 0.18;
    ctx.beginPath();
    for (k = -4; k <= 3; k++) {
      ctx.moveTo(k * 1.1, 8.35); ctx.lineTo(k * 1.1 + 0.7, 8.35); ctx.lineTo(k * 1.1 + 0.7, 8.95); ctx.lineTo(k * 1.1 + 0.25, 8.95);
    }
    ctx.stroke();
    ctx.restore();
  };

  /* KATANA: a la espalda, en su vaina lacada; asoman la empuñadura por
   * encima del hombro y la contera por abajo, y la correa cruza el cuerpo */
  ACC.acc_katana = function (ctx, o) {
    /* la correa, cruzando el cuerpo (respeta la boca) */
    ctx.save();
    pacPath(ctx, 0, 0, R, 0, o.half);
    ctx.clip();
    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-3.6, 7.0); ctx.lineTo(4.2, -6.8); ctx.stroke();
    ctx.strokeStyle = hex(mix(o.c, '#5a2a10', 0.7)); ctx.lineWidth = 1.0; ctx.stroke();
    ctx.restore();
    ctx.save();
    fueraDelCuerpo(ctx);
    var A = [-8.4, -3.6], B = [-0.8, 9.8];
    var dx = B[0] - A[0], dy = B[1] - A[1];
    var ang = Math.atan2(dy, dx), L = Math.sqrt(dx * dx + dy * dy);
    ctx.translate(A[0], A[1]);
    ctx.rotate(ang);
    /* la vaina */
    piezaX(ctx, function () { ctx.beginPath(); roundRect(ctx, 0, -0.6, L * 0.72, 1.2, 0.5); }, '#34343e', '#101014', 0.1, 0.2, 1.3);
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(0.1, -0.55, 0.8, 1.1);
    /* la guarda */
    piezaX(ctx, function () { ctx.beginPath(); ctx.ellipse(L * 0.725, 0, 0.35, 1.3, 0, 0, Math.PI * 2); }, '#ffd24a', '#a97d0d', 0.05, 0.1, 1.2);
    /* la empuñadura, con el trenzado */
    piezaX(ctx, function () { ctx.beginPath(); roundRect(ctx, L * 0.75, -0.5, L * 0.25, 1.0, 0.3); }, '#f4f0e6', '#b8b0a0', 0.05, 0.1, 1.2);
    ctx.fillStyle = TINTA;
    for (var k = 0; k < 4; k++) {
      var x = L * 0.77 + k * 0.95;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 0.45, 0.45); ctx.lineTo(x + 0.9, 0); ctx.lineTo(x + 0.45, -0.45); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(L - 0.5, -0.5, 0.5, 1.0);
    ctx.restore();
  };

  /* KABUTO: el casco de samurái, con las dos astas doradas (kuwagata) y el
   * cubrenuca de láminas del color del jugador */
  ACC.acc_kabuto = function (ctx, o) {
    var hierro = '#3a3c46', hierroOsc = '#15161b', oro = '#ffd24a', oroOsc = '#a97d0d';
    var lam = hex(mix(o.c, '#2a2a3a', 0.25)), lamOsc = mix(lam, '#000000', 0.5), k;
    /* el cubrenuca, en tres láminas escalonadas */
    for (k = 2; k >= 0; k--) {
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(-3.0 + k * 0.2, 3.6 - k * 1.8);
        ctx.quadraticCurveTo(-6.6 - k * 0.9, 3.4 - k * 2.0, -7.6 - k * 0.9, 1.2 - k * 2.1);
        ctx.lineTo(-6.6 - k * 0.9, 0.2 - k * 2.1);
        ctx.quadraticCurveTo(-5.4 - k * 0.6, 2.2 - k * 1.9, -2.6 + k * 0.2, 2.4 - k * 1.8);
        ctx.closePath();
      }, lam, hex(lamOsc), 0.2, 0.2, 1.3);
      ctx.fillStyle = '#fbf6ec';
      for (var i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(-4.2 - k * 0.7 - i * 1.0, 2.4 - k * 1.9 - i * 0.55, 0.18, 0, Math.PI * 2); ctx.fill();
      }
    }
    /* las astas doradas */
    [[1.4, 12.2, 0.8], [4.4, 11.8, 1]].forEach(function (a) {
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(2.0, 6.4);
        ctx.quadraticCurveTo(a[0] - 1.6, 8.6, a[0], a[1]);
        ctx.quadraticCurveTo(a[0] - 0.4, 9.0, 3.0, 6.6);
        ctx.closePath();
      }, a[2] < 1 ? oroOsc : oro, a[2] < 1 ? '#6a4e08' : oroOsc, 0.15, 0.15, 1.3);
    });
    /* el cuenco de hierro, con sus remaches */
    var casco = function () {
      ctx.beginPath();
      ctx.moveTo(-5.8, 2.6);
      ctx.quadraticCurveTo(-5.4, 7.4, 0.2, 7.6);
      ctx.quadraticCurveTo(5.2, 7.4, 5.8, 3.2);
      ctx.quadraticCurveTo(0, 2.0, -5.8, 2.6);
      ctx.closePath();
    };
    piezaX(ctx, casco, hierro, hierroOsc, 0.5, 0.5, 1.6);
    ctx.save(); casco(); ctx.clip();
    ctx.fillStyle = '#8a8e9c';
    for (k = 0; k < 4; k++) {
      for (var j = 0; j < 5; j++) {
        ctx.beginPath(); ctx.arc(-3.6 + j * 1.8, 3.6 + k * 1.1 + Math.abs(j - 2) * -0.25, 0.16, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    /* la visera */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(2.4, 3.2); ctx.quadraticCurveTo(5.6, 3.0, 7.2, 2.2); ctx.lineTo(5.8, 3.6); ctx.quadraticCurveTo(4.2, 3.8, 2.4, 3.8);
      ctx.closePath();
    }, hierro, hierroOsc, 0.1, 0.1, 1.2);
    /* el emblema del frente: un sol dorado */
    piezaX(ctx, function () { ctx.beginPath(); ctx.arc(2.6, 6.4, 0.85, 0, Math.PI * 2); }, oro, oroOsc, 0.1, 0.1, 1.2);
    ctx.fillStyle = '#e0322a';
    ctx.beginPath(); ctx.arc(2.6, 6.4, 0.4, 0, Math.PI * 2); ctx.fill();
  };

  /* TAMBORES DE RAIJIN: el aro de tambores del dios del trueno, por detrás
   * de la cabeza; de vez en cuando salta un rayo de uno a otro */
  ACC.acc_raijin = function (ctx, o) {
    var t = o.t, k, cx = -0.8, cy = 1.2, rr = 8.4;
    var giro = t * 0.35;
    ctx.save();
    fueraDelCuerpo(ctx);
    /* el aro */
    ctx.strokeStyle = TINTA; ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#c8302a'; ctx.lineWidth = 0.55; ctx.stroke();
    var pos = [];
    for (k = 0; k < 8; k++) {
      var a = giro + k * Math.PI / 4;
      pos.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    /* el rayo que salta, unas décimas cada poco */
    var ciclo = (t * 0.9) % 1, cual = Math.floor(t * 0.9) % 8;
    if (ciclo < 0.18) {
      var p0 = pos[cual], p1 = pos[(cual + 1) % 8];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      [[1.2, 'rgba(120,180,255,.6)'], [0.45, 'rgba(255,255,230,1)']].forEach(function (c) {
        ctx.strokeStyle = c[1]; ctx.lineWidth = c[0]; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        for (var i = 1; i < 7; i++) {
          var u = i / 7;
          var nx = -(p1[1] - p0[1]), ny = p1[0] - p0[0], nl = Math.sqrt(nx * nx + ny * ny);
          var j = (i % 2 ? 1 : -1) * (0.9 + 0.5 * Math.abs(Math.sin(t * 40 + i)));
          ctx.lineTo(p0[0] + (p1[0] - p0[0]) * u + nx / nl * j, p0[1] + (p1[1] - p0[1]) * u + ny / nl * j);
        }
        ctx.lineTo(p1[0], p1[1]);
        ctx.stroke();
      });
      ctx.restore();
    }
    /* los tambores, con el tomoe de tres comas */
    pos.forEach(function (p, i) {
      piezaX(ctx, function () { ctx.beginPath(); ctx.arc(p[0], p[1], 1.45, 0, Math.PI * 2); }, '#b8402a', '#4a1008', 0.2, 0.2, 1.3);
      ctx.fillStyle = '#f2e2b8';
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = (i % 2) ? '#1a1414' : hex(mix(o.c, '#c8302a', 0.3));
      for (var c = 0; c < 3; c++) {
        var b = c * Math.PI * 2 / 3 + t * 2;
        ctx.beginPath(); ctx.arc(p[0] + Math.cos(b) * 0.42, p[1] + Math.sin(b) * 0.42, 0.3, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.restore();
  };

  /* ---------------- EFECTOS ---------------- */
  var EFX = {};

  /* TORII: va dejando puertas de santuario bermellón, como el camino de
   * Fushimi Inari */
  EFX.efx_torii = function (ctx, o, cuerpo) {
    rastro(o, 13, 84).forEach(function (q) {
      var crece = Math.min(1, q.edad / 0.12);
      var e = 0.5 + 0.5 * suave(crece);
      ctx.save();
      ctx.globalAlpha = (1 - q.edad) * 0.95;
      ctx.translate(q.p.x, q.p.y + 0.6);
      ctx.scale(e, e);
      ctx.fillStyle = '#e8401c';
      ctx.fillRect(-1.6, -1.6, 0.6, 3.4);
      ctx.fillRect(1.0, -1.6, 0.6, 3.4);
      ctx.fillRect(-2.0, -1.0, 4.0, 0.5);
      ctx.fillStyle = '#1a1414';
      ctx.beginPath();
      ctx.moveTo(-2.7, -2.4); ctx.quadraticCurveTo(0, -1.8, 2.7, -2.4);
      ctx.lineTo(2.5, -1.7); ctx.quadraticCurveTo(0, -1.3, -2.5, -1.7);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(-1.7, 1.5, 0.8, 0.4); ctx.fillRect(0.9, 1.5, 0.8, 0.4);
      ctx.restore();
    });
    cuerpo();
  };

  /* OLAS: la ola de Hokusai, que sube, se enrosca con sus garras de espuma y
   * rompe detrás de él */
  EFX.efx_olas = function (ctx, o, cuerpo) {
    rastro(o, 9, 60).forEach(function (q) {
      var sube = Math.min(1, q.edad / 0.3);
      var lado = (q.n % 2) ? 1 : -1;
      ctx.save();
      ctx.globalAlpha = (1 - q.edad) * 0.95;
      ctx.translate(q.p.x, q.p.y + 1.2);
      ctx.scale(lado * (0.7 + 0.3 * sube), 0.4 + 0.6 * sube);
      ctx.fillStyle = '#1f4fa8';
      ctx.beginPath();
      ctx.moveTo(-2.4, 0.4);
      ctx.quadraticCurveTo(-1.8, -2.6, 0.6, -2.6);
      ctx.quadraticCurveTo(2.2, -2.4, 1.6, -1.0);
      ctx.quadraticCurveTo(0.8, -1.9, 0.0, -1.2);
      ctx.quadraticCurveTo(-0.4, -0.4, 1.4, 0.4);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8fd0ff'; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(-1.8, 0.0); ctx.quadraticCurveTo(-1.3, -2.0, 0.6, -2.2); ctx.stroke();
      /* las garras de espuma */
      ctx.fillStyle = '#ffffff';
      [[1.7, -1.2], [1.2, -0.7], [2.0, -1.8], [0.7, -2.6]].forEach(function (p, i) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 0.32 - i * 0.03, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    });
    cuerpo();
  };

  /* ORIGAMI: grullas de papel de su color que salen volando por detrás */
  EFX.efx_origami = function (ctx, o, cuerpo) {
    cuerpo();
    var papel = hex(mix(o.c, '#ffffff', 0.25)), papelOsc = hex(mix(o.c, '#000000', 0.35));
    rastro(o, 15, 72).forEach(function (q) {
      var bate = Math.sin(o.t * 12 + q.n) * 1.1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - q.edad) * 1.4);
      ctx.translate(q.p.x + Math.sin(q.edad * 5 + q.n) * 1.5, q.p.y - q.edad * 8);
      ctx.scale((q.n % 2) ? 1 : -1, 1);
      /* el ala de atrás, más oscura */
      ctx.fillStyle = papelOsc;
      ctx.beginPath(); ctx.moveTo(-0.4, -0.1); ctx.lineTo(0.9, -0.1); ctx.lineTo(-1.2, -2.2 - bate * 0.8); ctx.closePath(); ctx.fill();
      /* cuerpo, con el cuello largo y la cola en punta, casi horizontales */
      ctx.fillStyle = papel;
      ctx.beginPath();
      ctx.moveTo(-3.4, -0.9); ctx.lineTo(-0.8, 0.1); ctx.lineTo(0.2, 0.9); ctx.lineTo(1.2, 0.1);
      ctx.lineTo(3.0, -1.5); ctx.lineTo(3.7, -1.1); ctx.lineTo(3.1, -1.1); ctx.lineTo(1.4, 0.5);
      ctx.lineTo(0.2, 1.2); ctx.lineTo(-1.0, 0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = papelOsc; ctx.lineWidth = 0.15; ctx.stroke();
      /* el ala de delante */
      ctx.fillStyle = papel;
      ctx.beginPath(); ctx.moveTo(-0.7, 0.2); ctx.lineTo(1.1, 0.2); ctx.lineTo(-0.6, -2.8 + bate); ctx.closePath(); ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  };

  /* FAROLILLOS: farolillos de papel encendidos que se quedan flotando y
   * suben despacio */
  EFX.efx_farolillos = function (ctx, o, cuerpo) {
    var papel = hex(mix(o.c, '#ff5a1a', 0.6));
    rastro(o, 18, 110).forEach(function (q) {
      var a = (1 - q.edad) * (0.85 + 0.15 * Math.sin(o.t * 7 + q.n * 2));
      var x = q.p.x + Math.sin(o.t * 1.5 + q.n) * 0.8, y = q.p.y - q.edad * 5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(x, y, 0.2, x, y, 3.6);
      g.addColorStop(0, mix('#ffc070', '#ffc070', 0, 0.5 * a));
      g.addColorStop(1, mix('#ff7a2a', '#ff7a2a', 0, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.3);
      ctx.fillStyle = papel;
      ctx.beginPath(); ctx.ellipse(x, y, 1.3, 1.65, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(40,10,0,.8)'; ctx.lineWidth = 0.18; ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,190,.55)';
      ctx.beginPath(); ctx.ellipse(x - 0.2, y, 0.6, 1.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1414';
      ctx.fillRect(x - 0.8, y - 1.9, 1.6, 0.45);
      ctx.fillRect(x - 0.8, y + 1.45, 1.6, 0.45);
      ctx.restore();
    });
    cuerpo();
  };

  /* ONIBI: fuegos fatuos azules que se quedan flotando donde pasó */
  EFX.efx_onibi = function (ctx, o, cuerpo) {
    cuerpo();
    rastro(o, 9, 58).forEach(function (q) {
      var lado = (q.n % 2) ? 1.2 : -1.2;
      llamaAzul(ctx, q.p.x + lado * 0.6, q.p.y - q.edad * 4 + lado * 0.4,
        0.95 * (1 - q.edad * 0.5), (1 - q.edad) * 0.95, o.t + q.n, -1);
    });
  };

  /* KOI: dos carpas que le siguen nadando, y las ondas del agua */
  EFX.efx_koi = function (ctx, o, cuerpo) {
    rastro(o, 14, 50).forEach(function (q) {
      ctx.strokeStyle = 'rgba(140,210,255,' + ((1 - q.edad) * 0.5) + ')';
      ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.ellipse(q.p.x, q.p.y, 1 + q.edad * 4, 0.6 + q.edad * 2.4, 0, 0, Math.PI * 2); ctx.stroke();
    });
    [0, 1].forEach(function (k) {
      var d = 10 + k * 10 + Math.sin(o.t * 2 + k) * 1.2;
      var p = o.back(d);
      var v = DIR_V[p.d], nx = -v[1], ny = v[0];
      var lat = Math.sin(o.t * 3 + k * 2) * 1.6 * (k ? -1 : 1);
      ctx.save();
      ctx.translate(p.x + nx * lat, p.y + ny * lat);
      ctx.rotate(DIR_ANGLE[p.d] + Math.cos(o.t * 3 + k * 2) * 0.35);
      var cola = Math.sin(o.t * 10 + k) * 0.6;
      /* la cola */
      ctx.fillStyle = k ? 'rgba(255,255,255,.8)' : mix(o.c, '#ff6a2a', 0.4, 0.85);
      ctx.beginPath(); ctx.moveTo(-1.8, 0); ctx.lineTo(-3.6, -1.3 + cola); ctx.lineTo(-3.2, cola * 0.5); ctx.lineTo(-3.6, 1.3 + cola); ctx.closePath(); ctx.fill();
      /* el cuerpo blanco con las manchas */
      ctx.fillStyle = '#fbf6ec';
      ctx.beginPath(); ctx.ellipse(0, 0, 2.3, 0.95, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, 0, 2.3, 0.95, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = k ? '#e8401c' : hex(mix(o.c, '#ff6a2a', 0.4));
      ctx.beginPath(); ctx.ellipse(0.9, 0.2, 1.0, 0.7, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-0.9, -0.3, 0.8, 0.6, 0, 0, Math.PI * 2); ctx.fill();
      if (k) { ctx.fillStyle = '#1a1414'; ctx.beginPath(); ctx.arc(-0.2, 0.5, 0.3, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(20,20,20,.55)'; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.ellipse(0, 0, 2.3, 0.95, 0, 0, Math.PI * 2); ctx.stroke();
      /* las aletas */
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.ellipse(0.6, 1.0, 0.6, 0.3, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.6, -1.0, 0.6, 0.3, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1414';
      ctx.beginPath(); ctx.arc(1.7, 0.4, 0.17, 0, Math.PI * 2); ctx.arc(1.7, -0.4, 0.17, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    cuerpo();
  };

  /* ---------------- EMOTES ----------------
   * En el idioma de Sprites.drawPacFace: círculo del color del jugador,
   * rasgos en negro y un meneo propio. t va en ticks (60 por segundo). */
  function caraYokai(ctx, x, y, r, color, id, t) {
    var ink = '#000000', lw = Math.max(1, r * 0.17), k;
    var ex = r * 0.42, ey = y - r * 0.24;

    if (id === 'kawaii') {
      /* ojazos brillantes, coloretes y la boquita "ω", dando saltitos */
      var bota = Math.abs(Math.sin(t * 0.09)) * r * 0.12;
      ctx.save();
      ctx.translate(0, -bota);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      [-1, 1].forEach(function (l) {
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.ellipse(x + l * ex, ey + r * 0.05, r * 0.2, r * 0.27, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x + l * ex + r * 0.07, ey - r * 0.06, r * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + l * ex - r * 0.06, ey + r * 0.12, r * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,110,150,.7)';
        ctx.beginPath(); ctx.ellipse(x + l * r * 0.62, y + r * 0.22, r * 0.17, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      });
      /* la boquita abierta, con la lengua */
      ctx.fillStyle = '#5a0a18';
      ctx.beginPath(); ctx.moveTo(x - r * 0.2, y + r * 0.28); ctx.lineTo(x + r * 0.2, y + r * 0.28);
      ctx.quadraticCurveTo(x, y + r * 0.62, x - r * 0.2, y + r * 0.28); ctx.fill();
      ctx.fillStyle = '#ff6a86';
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.42, r * 0.09, r * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      for (k = 0; k < 3; k++) {
        var tw = Math.sin(t * 0.12 + k * 2.1);
        estrella4(ctx, x + [-0.95, 0.95, 0.75][k] * r, y + [-0.85, -0.7, 0.75][k] * r, r * 0.22 * Math.max(0, tw), '#ffe9f4', Math.max(0, tw));
      }
      return;
    }

    if (id === 'banzai') {
      /* ¡BANZAI!: salta con los brazos arriba, ojos de alegría y bocaza */
      var salto = Math.abs(Math.sin(t * 0.08));
      var cy = y + r * 0.1 - salto * r * 0.2;
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.1; ctx.lineCap = 'round';
      [-1, 1].forEach(function (l) {
        var ay = cy - r * (0.5 + salto * 0.55);
        ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.3;
        ctx.beginPath(); ctx.moveTo(x + l * r * 0.8, cy); ctx.lineTo(x + l * r * 1.05, ay); ctx.stroke();
        ctx.strokeStyle = color; ctx.lineWidth = lw * 0.7; ctx.stroke();
      });
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, cy, r * 0.88, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.6;
      [-1, 1].forEach(function (l) {
        ctx.beginPath(); ctx.arc(x + l * ex * 0.9, cy - r * 0.12, r * 0.16, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
      });
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.moveTo(x - r * 0.34, cy + r * 0.12); ctx.lineTo(x + r * 0.34, cy + r * 0.12);
      ctx.quadraticCurveTo(x, cy + r * 0.8, x - r * 0.34, cy + r * 0.12); ctx.fill();
      ctx.fillStyle = '#ff6a86';
      ctx.beginPath(); ctx.ellipse(x, cy + r * 0.42, r * 0.14, r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      return;
    }

    if (id === 'itadakimasu') {
      /* los palillos le acercan un nigiri, abre la boca y se lo zampa */
      var ciclo = (t * 0.012) % 1;
      var llega = suave(tramo(ciclo, 0.0, 0.45)), come = tramo(ciclo, 0.45, 0.6);
      var abre = ciclo > 0.35 && ciclo < 0.6 ? 1 : 0;
      var masca = ciclo > 0.6 ? Math.abs(Math.sin(ciclo * 60)) : 0;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.6; ctx.lineCap = 'round';
      [-1, 1].forEach(function (l) {
        ctx.beginPath(); ctx.arc(x + l * ex, ey + r * 0.1, r * 0.18, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
      });
      ctx.fillStyle = ink;
      if (abre) { ctx.beginPath(); ctx.ellipse(x, y + r * 0.38, r * 0.26, r * 0.24, 0, 0, Math.PI * 2); ctx.fill(); }
      else {
        ctx.beginPath(); ctx.ellipse(x, y + r * 0.4, r * 0.2, r * (0.06 + masca * 0.08), 0, 0, Math.PI * 2); ctx.fill();
        if (masca > 0) {
          ctx.fillStyle = 'rgba(255,110,150,.6)';
          [-1, 1].forEach(function (l) { ctx.beginPath(); ctx.arc(x + l * r * 0.6, y + r * 0.2, r * 0.14, 0, Math.PI * 2); ctx.fill(); });
        }
      }
      if (come < 1) {
        var sx = x + r * (1.3 - llega * 1.3), sy = y + r * (0.05 + llega * 0.33);
        ctx.save();
        ctx.globalAlpha = 1 - come;
        ctx.strokeStyle = '#c8905a'; ctx.lineWidth = Math.max(1, r * 0.1);
        ctx.beginPath(); ctx.moveTo(sx + r * 0.2, sy - r * 0.1); ctx.lineTo(sx + r * 1.5, sy - r * 1.0);
        ctx.moveTo(sx + r * 0.25, sy + r * 0.12); ctx.lineTo(sx + r * 1.6, sy - r * 0.7); ctx.stroke();
        ctx.fillStyle = '#fbf6ec';
        ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.32, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff8a4a';
        ctx.beginPath(); ctx.ellipse(sx, sy - r * 0.14, r * 0.36, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      return;
    }

    if (id === 'zen') {
      /* ojos cerrados de calma y el ensō, el círculo de pincel, que se traza
       * solo detrás */
      var vuelta = (t * 0.008) % 1;
      var trazo = suave(Math.min(1, vuelta / 0.7));
      var borra = tramo(vuelta, 0.85, 1);
      ctx.save();
      ctx.globalAlpha = 1 - borra;
      ctx.lineCap = 'round';
      for (k = 0; k < 14; k++) {
        var a0 = -Math.PI * 0.4 + trazo * Math.PI * 1.85 * (k / 14);
        var a1 = -Math.PI * 0.4 + trazo * Math.PI * 1.85 * ((k + 1) / 14);
        ctx.strokeStyle = 'rgba(244,240,230,.9)';
        ctx.lineWidth = Math.max(0.8, r * 0.28 * (1 - k / 18));
        ctx.beginPath(); ctx.arc(x, y, r * 1.2, a0, a1); ctx.stroke();
      }
      ctx.restore();
      var flota = Math.sin(t * 0.05) * r * 0.06;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y + flota, r * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.55; ctx.lineCap = 'round';
      [-1, 1].forEach(function (l) {
        ctx.beginPath(); ctx.arc(x + l * ex * 0.9, ey + flota + r * 0.02, r * 0.17, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(x, y + flota + r * 0.25, r * 0.16, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      return;
    }

    /* NINJA: capucha oscura con la rendija de los ojos; cada poco, ¡puf!,
     * desaparece en humo y vuelve */
    var c2 = (t * 0.01) % 1;
    var fuera = c2 > 0.62 && c2 < 0.86;
    if (!fuera) {
      ctx.fillStyle = '#1c2030';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); roundRect(ctx, x - r * 0.85, ey - r * 0.24, r * 1.7, r * 0.5, r * 0.2); ctx.fill();
      ctx.fillStyle = ink;
      [-1, 1].forEach(function (l) {
        ctx.beginPath();
        ctx.moveTo(x + l * ex - r * 0.2, ey - r * 0.02);
        ctx.lineTo(x + l * ex + r * 0.2, ey - r * 0.02 + l * r * 0.08);
        ctx.lineTo(x + l * ex, ey + r * 0.14);
        ctx.closePath(); ctx.fill();
      });
      /* el nudo y las puntas de la cinta */
      ctx.strokeStyle = '#1c2030'; ctx.lineWidth = lw * 0.6; ctx.lineCap = 'round';
      var on = Math.sin(t * 0.2) * r * 0.1;
      ctx.beginPath();
      ctx.moveTo(x + r * 0.9, y - r * 0.5); ctx.lineTo(x + r * 1.35, y - r * 0.75 + on);
      ctx.moveTo(x + r * 0.9, y - r * 0.4); ctx.lineTo(x + r * 1.4, y - r * 0.35 + on);
      ctx.stroke();
    }
    var h1 = tramo(c2, 0.58, 0.72), h2 = tramo(c2, 0.84, 0.98);
    if (h1 > 0 && h1 < 1) humoPuf(ctx, x, y, h1, h1 < 0.6 ? 1 : (1 - h1) / 0.4, r * 1.1);
    if (h2 > 0 && h2 < 1) humoPuf(ctx, x, y, h2, h2 < 0.6 ? 1 : (1 - h2) / 0.4, r * 1.1);
  }
