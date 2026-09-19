  /* Partículas que nacen cada `paso` px del camino y viven `vida` px. */
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
   * marco del cuerpo y con la skin debajo. */
  var ACC = {};

  /* CUERNOS DE CARNERO: los de Amón, enroscados a los lados */
  ACC.acc_carnero = function (ctx, o) {
    var hueso = '#e8dcc0', huesoOsc = '#9c8f6c', k;
    [[1, 1.0], [-1, 0.75]].forEach(function (l) {
      ctx.save();
      ctx.scale(1, l[0]);
      ctx.translate(0, 2.0);
      ctx.scale(l[1], l[1]);
      piezaX(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(-1.2, 2.6);
        ctx.quadraticCurveTo(-4.6, 3.2, -5.0, 0.6);
        ctx.quadraticCurveTo(-5.2, -1.8, -2.6, -2.2);
        ctx.quadraticCurveTo(-0.8, -2.2, -0.6, -0.8);
        ctx.quadraticCurveTo(-0.6, 0.4, -1.8, 0.4);
        ctx.quadraticCurveTo(-2.6, 0.2, -2.4, -0.6);
        ctx.quadraticCurveTo(-3.8, -0.6, -3.7, 0.6);
        ctx.quadraticCurveTo(-3.6, 2.0, -1.6, 1.8);
        ctx.closePath();
      }, hueso, huesoOsc, 0.3, 0.3, 1.5);
      /* los anillos del cuerno */
      ctx.strokeStyle = huesoOsc; ctx.lineWidth = 0.22;
      ctx.beginPath();
      for (k = 0; k < 3; k++) {
        ctx.moveTo(-4.4 + k * 0.9, 1.9 - k * 0.25);
        ctx.lineTo(-4.2 + k * 0.9, 0.2 - k * 0.2);
      }
      ctx.stroke();
      ctx.restore();
    });
  };

  /* BARBA DE ZEUS: blanca, rizada y con un rayito escapándose */
  ACC.acc_zeus = function (ctx, o) {
    var pelo = '#f2f0e8', peloOsc = '#b6b2a4', k;
    var w = Math.sin(o.t * 3) * 0.2;
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(4.8, -0.6);
      ctx.quadraticCurveTo(5.2, -3.4, 3.2, -5.2);
      ctx.quadraticCurveTo(1.6, -6.8 + w, -0.6, -5.4);
      ctx.quadraticCurveTo(-2.6, -4.0, -2.2, -1.4);
      ctx.quadraticCurveTo(1.0, -0.2, 4.8, -0.6);
      ctx.closePath();
    }, pelo, peloOsc, 0.45, 0.45, 1.6);
    /* los rizos del borde */
    ctx.strokeStyle = peloOsc; ctx.lineWidth = 0.3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (k = 0; k < 4; k++) {
      ctx.moveTo(3.4 - k * 1.5, -1.4 - k * 0.5);
      ctx.quadraticCurveTo(3.0 - k * 1.5, -3.0 - k * 0.6, 2.2 - k * 1.5, -3.4 - k * 0.5);
    }
    ctx.stroke();
    /* el bigote */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(1.6, 0.2);
      ctx.quadraticCurveTo(4.2, 0.6, 5.2, -0.4);
      ctx.quadraticCurveTo(3.4, -1.4, 1.4, -0.8);
      ctx.closePath();
    }, pelo, peloOsc, 0.25, 0.25, 1.3);
    /* el rayito */
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath();
    ctx.moveTo(-3.4, -2.0); ctx.lineTo(-1.8, -3.2); ctx.lineTo(-2.6, -3.4);
    ctx.lineTo(-1.0, -5.0); ctx.lineTo(-2.8, -4.0); ctx.lineTo(-2.0, -3.8);
    ctx.closePath(); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
  };

  /* SERPIENTE: enroscada al cuello, con la cabeza asomando por delante */
  ACC.acc_serpiente = function (ctx, o) {
    var verde = hex(mix(o.c, '#2f8f4a', 0.68)), verdeOsc = mix(verde, '#07200f', 0.5);
    var w = Math.sin(o.t * 3.5) * 0.5;
    ctx.strokeStyle = hex(verdeOsc); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5.4, -3.2);
    ctx.quadraticCurveTo(-1.0, -6.4, 3.4, -4.4);
    ctx.quadraticCurveTo(5.8, -3.2, 5.0, -1.0);
    ctx.stroke();
    ctx.strokeStyle = verde; ctx.lineWidth = 0.9; ctx.stroke();
    /* la cabecita, mirando al frente */
    ctx.save();
    ctx.translate(5.2 + w * 0.3, -0.4);
    ctx.rotate(-0.3 + w * 0.1);
    piezaX(ctx, function () {
      ctx.beginPath(); ctx.ellipse(0, 0, 1.4, 0.95, 0, 0, Math.PI * 2);
    }, verde, hex(verdeOsc), 0.25, 0.25, 1.3);
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath(); ctx.arc(0.5, -0.2, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.ellipse(0.55, -0.2, 0.1, 0.24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff5f8d'; ctx.lineWidth = 0.2;
    ctx.beginPath();
    ctx.moveTo(1.3, 0.2); ctx.lineTo(2.4, 0.5);
    ctx.moveTo(2.4, 0.5); ctx.lineTo(2.9, 0.2);
    ctx.moveTo(2.4, 0.5); ctx.lineTo(2.9, 0.9);
    ctx.stroke();
    ctx.restore();
  };

  /* VENDA DEL ORÁCULO: la tira que le tapa los ojos, con su nudo detrás */
  ACC.acc_venda = function (ctx, o) {
    var tela = '#e8e0cc', telaOsc = '#a89c7c';
    var w = Math.sin(o.t * 4) * 0.4;
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-5.2, 4.6);
      ctx.quadraticCurveTo(0.4, 5.6, 5.4, 3.2);
      ctx.lineTo(5.0, 1.4);
      ctx.quadraticCurveTo(0.2, 3.6, -5.4, 2.6);
      ctx.closePath();
    }, tela, telaOsc, 0.35, 0.35, 1.5);
    /* el nudo y las dos puntas ondeando */
    ctx.fillStyle = tela;
    ctx.beginPath(); ctx.arc(-5.2, 3.5, 0.85, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1.2); ctx.stroke();
    [0, 1].forEach(function (k) {
      ctx.fillStyle = k ? telaOsc : tela;
      ctx.beginPath();
      ctx.moveTo(-5.6, 3.6 - k * 0.6);
      ctx.quadraticCurveTo(-8.0, 4.4 - k * 1.2 + w, -9.6, 2.6 - k * 1.4 + w);
      ctx.quadraticCurveTo(-7.8, 2.8 - k * 0.8, -5.8, 2.8 - k * 0.5);
      ctx.closePath(); ctx.fill();
      contorno(ctx, 1); ctx.stroke();
    });
    /* el ojo pintado en la venda, el que de verdad ve */
    ctx.fillStyle = hex(mix(o.c, '#ffffff', 0.4));
    ctx.beginPath(); ctx.ellipse(1.6, 3.5, 1.1, 0.55, -0.12, 0, Math.PI * 2); ctx.fill();
    contorno(ctx, 1); ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(1.7, 3.45, 0.32, 0, Math.PI * 2); ctx.fill();
  };

  /* MÁSCARA DE TEATRO: la de la comedia, sujeta con su palito */
  ACC.acc_mascara = function (ctx, o) {
    var yeso = '#f4efe0', yesoOsc = '#b8b09a';
    var w = Math.sin(o.t * 2.5) * 0.12;
    ctx.save();
    ctx.translate(1.6, 1.6);
    ctx.rotate(w);
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(3.4, 0.6);
      ctx.quadraticCurveTo(3.6, 3.0, 1.6, 4.0);
      ctx.quadraticCurveTo(-0.8, 4.8, -2.4, 3.2);
      ctx.quadraticCurveTo(-3.6, 1.4, -3.0, -1.2);
      ctx.quadraticCurveTo(-1.8, -3.6, 0.6, -3.4);
      ctx.quadraticCurveTo(3.0, -2.8, 3.4, 0.6);
      ctx.closePath();
    }, yeso, yesoOsc, 0.4, 0.4, 1.6);
    /* los dos huecos de los ojos y la boca de la comedia */
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.ellipse(-1.0, 1.6, 0.75, 0.62, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1.8, 1.4, 0.75, 0.62, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-1.6, -1.4);
    ctx.quadraticCurveTo(0.4, -3.2, 2.4, -1.6);
    ctx.quadraticCurveTo(0.4, -2.2, -1.6, -1.4);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    /* el palito */
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1.4, -0.8); ctx.lineTo(-3.0, -5.4);
    ctx.stroke();
  };

  /* CASCO ALADO: el de Hermes, con las dos alitas a los lados */
  ACC.acc_alado = function (ctx, o) {
    var bronce = '#d8b878', bronceOsc = '#8a6a32';
    var pluma = '#f7f2e2', plumaOsc = '#bdb59a';
    var bate = Math.sin(o.t * 9) * 0.35;
    /* las alitas */
    [1, -1].forEach(function (lado) {
      ctx.save();
      ctx.translate(-0.4, lado * 3.2);
      ctx.rotate(lado * (0.25 + bate));
      for (var k = 2; k >= 0; k--) {
        piezaX(ctx, function () {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-2.2 - k * 0.5, lado * (1.6 + k * 0.5), -4.4 - k * 0.8, lado * (0.4 + k * 0.4));
          ctx.quadraticCurveTo(-2.4, lado * -0.8, 0, lado * -0.6);
          ctx.closePath();
        }, pluma, plumaOsc, 0.25, 0.25, 1.1);
      }
      ctx.restore();
    });
    /* el casquete */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(-3.4, 2.8);
      ctx.quadraticCurveTo(-3.0, 6.4, 0.6, 6.6);
      ctx.quadraticCurveTo(4.2, 6.4, 4.4, 3.0);
      ctx.quadraticCurveTo(0.6, 1.8, -3.4, 2.8);
      ctx.closePath();
    }, bronce, bronceOsc, 0.4, 0.4, 1.6);
    ctx.strokeStyle = bronceOsc; ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(-3.2, 3.4); ctx.quadraticCurveTo(0.6, 2.4, 4.2, 3.6);
    ctx.stroke();
    destello(ctx, -1.6, 5.4, 0.45, 0.6);
  };

  /* OJO QUE TODO LO VE: flota encima y te sigue con la mirada */
  ACC.acc_ojo = function (ctx, o) {
    var w = Math.sin(o.t * 2.2) * 0.5;
    var cx = 0.4, cy = 8.4 + w;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(cx, cy, 0.4, cx, cy, 4.5);
    g.addColorStop(0, mix(o.c, '#ffffff', 0.5, 0.45));
    g.addColorStop(1, mix(o.c, '#ffffff', 0.5, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* el párpado, en forma de almendra */
    piezaX(ctx, function () {
      ctx.beginPath();
      ctx.moveTo(cx - 2.8, cy);
      ctx.quadraticCurveTo(cx, cy + 2.4, cx + 2.8, cy);
      ctx.quadraticCurveTo(cx, cy - 2.4, cx - 2.8, cy);
      ctx.closePath();
    }, '#f7f2e2', '#b8b09a', 0.2, 0.2, 1.4);
    /* el iris, que mira adelante y atrás */
    var mira = Math.sin(o.t * 1.3) * 0.9;
    ctx.fillStyle = hex(mix(o.c, '#2b6fd8', 0.45));
    ctx.beginPath(); ctx.arc(cx + mira, cy, 1.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath(); ctx.arc(cx + mira, cy, 0.5, 0, Math.PI * 2); ctx.fill();
    destello(ctx, cx + mira - 0.4, cy + 0.4, 0.28, 0.95);
    contorno(ctx, 1.2);
    ctx.beginPath();
    ctx.moveTo(cx - 2.8, cy);
    ctx.quadraticCurveTo(cx, cy + 2.4, cx + 2.8, cy);
    ctx.quadraticCurveTo(cx, cy - 2.4, cx - 2.8, cy);
    ctx.closePath(); ctx.stroke();
  };

  /* ---------------- EFECTOS ---------------- */
  var EFX = {};

  /* RAYOS: por donde pasa quedan rayos quebrados que chisporrotean */
  EFX.efx_rayos = function (ctx, o, cuerpo) {
    cuerpo();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    rastro(o, 11, 44).forEach(function (q) {
      var a = 1 - q.edad;
      [[1.5, 0.25], [0.5, 0.9]].forEach(function (capa) {
        ctx.strokeStyle = mix('#8fd6ff', '#ffffff', capa[1], a * capa[1]);
        ctx.lineWidth = capa[0];
        ctx.beginPath();
        var x = q.p.x, y = q.p.y;
        ctx.moveTo(x, y - 2.4);
        for (var i = 1; i <= 4; i++) {
          ctx.lineTo(x + ((q.n + i) % 2 ? 1.3 : -1.3) * (1 - q.edad), y - 2.4 + i * 1.3);
        }
        ctx.stroke();
      });
    });
    ctx.restore();
  };

  /* ARENA: un reguero de arena que se va deshaciendo */
  EFX.efx_arena = function (ctx, o, cuerpo) {
    cuerpo();
    rastro(o, 3, 52).forEach(function (q) {
      for (var k = 0; k < 2; k++) {
        var sem = (q.n * 13 + k * 29) % 17;
        var dx = ((sem % 5) - 2) * 0.8, dy = ((sem % 4) - 1.5) * 0.7 + q.edad * 3.5;
        ctx.globalAlpha = (1 - q.edad) * 0.8;
        ctx.fillStyle = (sem % 3) ? '#d8b878' : '#b08f52';
        ctx.fillRect(q.p.x + dx, q.p.y + dy, 0.65, 0.65);
      }
    });
    ctx.globalAlpha = 1;
  };

  /* RUNAS: deja símbolos encendidos que laten y se apagan */
  EFX.efx_runas = function (ctx, o, cuerpo) {
    cuerpo();
    var TRAZOS = [
      [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      [[0, -1.2], [0, 1.2], [-1, 0], [1, 0]],
      [[-1, 1], [0, -1.2], [1, 1], [-1, 1]],
      [[-1, -1], [1, 1], [1, -1], [-1, 1]]
    ];
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    rastro(o, 15, 66).forEach(function (q) {
      var a = (1 - q.edad) * (0.6 + 0.4 * Math.sin(o.t * 5 + q.n));
      var tr = TRAZOS[q.n % TRAZOS.length];
      ctx.strokeStyle = mix(o.c, '#ffffff', 0.45, a);
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      for (var i = 0; i < tr.length; i++) {
        var px = q.p.x + tr[i][0] * 1.25, py = q.p.y + tr[i][1] * 1.25;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
    ctx.restore();
  };

  /* PISADAS: donde pisa queda la losa de piedra marcada */
  EFX.efx_pisadas = function (ctx, o, cuerpo) {
    rastro(o, 14, 90).forEach(function (q) {
      ctx.save();
      ctx.globalAlpha = (1 - q.edad) * 0.75;
      ctx.translate(q.p.x, q.p.y);
      ctx.rotate((q.n % 2 ? 1 : -1) * 0.2);
      ctx.fillStyle = '#6b6f78';
      roundRect(ctx, -1.7, -1.7, 3.4, 3.4, 0.4); ctx.fill();
      ctx.strokeStyle = 'rgba(20,22,26,.8)'; ctx.lineWidth = 0.26; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 0.2;
      ctx.beginPath();
      ctx.moveTo(-1.0, -0.6); ctx.lineTo(0.4, 0.2);
      ctx.stroke();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    cuerpo();
  };

  /* BRASAS: va dejando ascuas que respiran y se apagan */
  EFX.efx_brasas = function (ctx, o, cuerpo) {
    cuerpo();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    rastro(o, 5, 50).forEach(function (q) {
      var vive = 0.55 + 0.45 * Math.sin(o.t * 6 + q.n * 1.7);
      var a = (1 - q.edad) * vive;
      var r = 1.0 * (1 - q.edad * 0.55);
      var g = ctx.createRadialGradient(q.p.x, q.p.y, 0.1, q.p.x, q.p.y, r * 2.6);
      g.addColorStop(0, 'rgba(255,238,170,' + a + ')');
      g.addColorStop(0.45, 'rgba(255,140,26,' + (a * 0.65) + ')');
      g.addColorStop(1, 'rgba(255,60,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(q.p.x, q.p.y, r * 2.6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  };

  /* NIEBLA: la bruma del inframundo, que se queda pegada al suelo */
  EFX.efx_niebla = function (ctx, o, cuerpo) {
    ctx.save();
    rastro(o, 8, 76).forEach(function (q) {
      var a = (1 - q.edad) * 0.30;
      var r = 2.0 + q.edad * 3.6;
      ctx.fillStyle = 'rgba(126,146,170,' + a + ')';
      ctx.beginPath();
      ctx.ellipse(q.p.x + Math.sin(o.t * 1.4 + q.n) * 1.6, q.p.y + q.edad * 1.4,
        r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    cuerpo();
  };

  /* ---------------- EMOTES ---------------- */
  function caraMito(ctx, x, y, r, color, id, t) {
    var ink = '#000000', lw = Math.max(1, r * 0.17), k;
    var ex = r * 0.42, ey = y - r * 0.24;

    if (id === 'oraculo') {
      /* los ojos en blanco: está viendo lo que viene */
      ctx.save();
      ctx.translate(x, y - Math.abs(Math.sin(t * 0.04)) * r * 0.05);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      [-1, 1].forEach(function (lado) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(lado * ex, ey - y, r * 0.26, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.45; ctx.stroke();
      });
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.7; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, r * 0.45); ctx.lineTo(r * 0.2, r * 0.45);
      ctx.stroke();
      ctx.restore();
      /* el resplandor que le sale de los ojos */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      [-1, 1].forEach(function (lado) {
        var g = ctx.createRadialGradient(x + lado * ex, ey, 0.5, x + lado * ex, ey, r * 0.8);
        g.addColorStop(0, 'rgba(200,240,255,' + (0.4 + 0.3 * Math.sin(t * 0.06)) + ')');
        g.addColorStop(1, 'rgba(160,220,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x + lado * ex, ey, r * 0.8, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
      return;
    }

    if (id === 'petrificado') {
      /* gris, agrietado y con cara de horror */
      ctx.save();
      ctx.fillStyle = '#9a9ca2';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5c5e64'; ctx.lineWidth = lw * 0.45; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.75, y - r * 0.4);
      ctx.lineTo(x - r * 0.2, y - r * 0.05);
      ctx.lineTo(x - r * 0.45, y + r * 0.5);
      ctx.moveTo(x - r * 0.2, y - r * 0.05);
      ctx.lineTo(x + r * 0.45, y + r * 0.25);
      ctx.stroke();
      /* ojos y boca, huecos */
      ctx.fillStyle = '#4a4c52';
      [-1, 1].forEach(function (lado) {
        ctx.beginPath(); ctx.ellipse(x + lado * ex, ey, r * 0.2, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
      });
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.45, r * 0.24, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      /* cascotes que se le caen */
      for (k = 0; k < 3; k++) {
        var u = ((t * 0.018 + k * 0.33) % 1);
        ctx.globalAlpha = 1 - u;
        ctx.fillStyle = '#82848a';
        ctx.fillRect(x + (k - 1) * r * 0.5, y + r * 0.8 + u * r * 1.2, r * 0.18, r * 0.18);
      }
      ctx.globalAlpha = 1;
      return;
    }

    if (id === 'divino') {
      /* aureola, ojos cerrados de paz y luz detrás */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.9);
      g.addColorStop(0, 'rgba(255,240,190,.5)');
      g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.75; ctx.lineCap = 'round';
      [-1, 1].forEach(function (lado) {
        ctx.beginPath();
        ctx.arc(x + lado * ex, ey + r * 0.12, r * 0.22, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
      });
      ctx.lineWidth = lw * 0.65;
      ctx.beginPath();
      ctx.arc(x, y + r * 0.3, r * 0.3, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      /* la aureola */
      ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = lw * 0.55;
      ctx.beginPath();
      ctx.ellipse(x, y - r * 1.18 - Math.sin(t * 0.04) * r * 0.06, r * 0.62, r * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (id === 'maldicion') {
      /* aura oscura, ojos rojos y una sonrisa torcida */
      ctx.save();
      for (k = 0; k < 6; k++) {
        var a2 = t * 0.03 + k * 1.05;
        ctx.fillStyle = 'rgba(70,20,100,.35)';
        ctx.beginPath();
        ctx.arc(x + Math.cos(a2) * r * 1.15, y + Math.sin(a2) * r * 1.15,
          r * (0.32 + 0.1 * Math.sin(t * 0.07 + k)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = mix(color, '#2a0a3a', 0.5);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      /* ojos encendidos */
      [-1, 1].forEach(function (lado) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var g2 = ctx.createRadialGradient(x + lado * ex, ey, 0.3, x + lado * ex, ey, r * 0.5);
        g2.addColorStop(0, 'rgba(255,60,60,.95)');
        g2.addColorStop(1, 'rgba(255,40,40,0)');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(x + lado * ex, ey, r * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#ff3b3b';
        ctx.beginPath(); ctx.ellipse(x + lado * ex, ey, r * 0.13, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      });
      /* cejas de maldad y sonrisa */
      ctx.strokeStyle = '#1a0a22'; ctx.lineWidth = lw * 0.6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.72, ey - r * 0.34); ctx.lineTo(x - r * 0.16, ey - r * 0.08);
      ctx.moveTo(x + r * 0.72, ey - r * 0.34); ctx.lineTo(x + r * 0.16, ey - r * 0.08);
      ctx.stroke();
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.34, y + r * 0.34);
      ctx.quadraticCurveTo(x, y + r * 0.62, x + r * 0.4, y + r * 0.28);
      ctx.stroke();
      return;
    }

    /* INVOCANDO: el círculo mágico girando debajo y los ojos encendidos */
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 0.05) * r * 0.05);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.55; ctx.lineCap = 'round';
    [-1, 1].forEach(function (lado) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(lado * ex, ey - y, r * 0.2, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.45; ctx.stroke();
      ctx.fillStyle = mix('#7a3dff', '#ffffff', 0.25);
      ctx.beginPath(); ctx.arc(lado * ex, ey - y, r * 0.11, 0, Math.PI * 2); ctx.fill();
    });
    /* boca recitando */
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.ellipse(0, r * 0.44, r * 0.14, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* el círculo mágico, girando */
    ctx.save();
    ctx.translate(x, y + r * 1.15);
    ctx.scale(1, 0.32);
    ctx.rotate(t * 0.02);
    ctx.strokeStyle = 'rgba(150,90,255,.9)'; ctx.lineWidth = lw * 0.4;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    for (k = 0; k < 5; k++) {
      var a3 = k * (Math.PI * 4 / 5) - Math.PI / 2;
      var px = Math.cos(a3) * r * 1.05, py = Math.sin(a3) * r * 1.05;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
