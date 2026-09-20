  function corazon(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.3, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.3, y - s * 0.2, x, y + s * 0.9);
    ctx.closePath();
    ctx.fill();
  }
  function gota(ctx, x, y, s, color, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.5);
    ctx.quadraticCurveTo(x + s, y, x + s * 0.75, y + s * 0.55);
    ctx.quadraticCurveTo(x, y + s * 1.35, x - s * 0.75, y + s * 0.55);
    ctx.quadraticCurveTo(x - s, y, x, y - s * 1.5);
    ctx.fill();
    ctx.restore();
  }
  function estrella4(ctx, x, y, s, color, alpha) {
    if (alpha <= 0 || s <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
    ctx.restore();
  }
  function nota(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.28;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.48, y); ctx.lineTo(x + s * 0.48, y - s * 1.7);
    ctx.quadraticCurveTo(x + s * 1.1, y - s * 1.3, x + s * 1.05, y - s * 0.8);
    ctx.stroke();
  }

  /* El globo de emote, igual que en el juego: (x, y) es la punta del pico */
  function globoEmote(ctx, x, y, color, tick, cara) {
    var w = 22, h = 20;
    var flota = Math.round(Math.sin(tick * 0.07) * 1.2);
    var bx = Math.round(x - w / 2), by = Math.round(y - h) + flota;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(bx, by, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x) - 1, by + h, 2, 2 - flota);
    ctx.save();
    ctx.beginPath(); ctx.rect(bx + 1, by + 1, w - 2, h - 2); ctx.clip();
    cara(bx + w / 2, by + h / 2, 7);
    ctx.restore();
  }
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

  function accesorio(dibujar) {
    return function (ctx, o) {
      body(ctx, o);
      ctx.save();
      frame(ctx, o.x, o.y, o.d);
      dibujar(ctx, o);
      ctx.restore();
    };
  }

  var FOTO = 30, FH = FOTO / 2;
  function tramo(x, a, b) { return Math.max(0, Math.min(1, (x - a) / (b - a))); }
  function suave(x) { return x * x * (3 - 2 * x); }
  function rebote(x) {
    if (x < 0.7) { var a = x / 0.7; return a * a; }
    return 1 - Math.sin((x - 0.7) / 0.3 * Math.PI) * 0.12;
  }
  function conMuerte(id, preparar, morir) {
    var base = DRAW[id], lienzo = document.createElement('canvas'), fotosExtra = [];
    lienzo.width = FOTO * S; lienzo.height = FOTO * S;
    DRAW[id] = function (ctx, o) {
      var tm = o.t % 6.8;
      if (o.sinMuerte || tm <= 5.3) return base(ctx, o);
      var pm = (tm - 5.3) / 1.5;
      var c2 = lienzo.getContext('2d');
      c2.setTransform(1, 0, 0, 1, 0, 0);
      c2.globalCompositeOperation = 'source-over';
      c2.globalAlpha = 1;
      c2.clearRect(0, 0, lienzo.width, lienzo.height);
      c2.setTransform(S, 0, 0, S, 0, 0);
      var o2 = {};
      for (var kk in o) o2[kk] = o[kk];
      o2.x = FH; o2.y = FH; o2.d = 3; o2.half = 0; o2.t = 2.0; o2.sinMuerte = true;
      if (preparar) preparar(o2, pm);
      base(c2, o2);
      c2.setTransform(S, 0, 0, S, 0, 0);
      var v = DIR_V[o.d], ox = (v[0] !== 0) ? 0 : -1, oy = (v[0] !== 0) ? -1 : 0;
      var M = {
        /* otra foto de la skin, con sus propios cambios (n = 1, 2...) */
        foto: function (n, cambios) {
          var extra = fotosExtra[n] || (fotosExtra[n] = document.createElement('canvas'));
          extra.width = FOTO * S; extra.height = FOTO * S;
          var c3 = extra.getContext('2d');
          c3.setTransform(S, 0, 0, S, 0, 0);
          var o3 = {};
          for (var k3 in o2) o3[k3] = o2[k3];
          cambios(o3);
          base(c3, o3);
          return extra;
        },
        ctx: ctx,
        /* (f, s) del marco del cuerpo -> pantalla */
        pant: function (f, s) { return { x: o.x + v[0] * f + ox * s, y: o.y + v[1] * f + oy * s }; },
        /* se coloca en el marco del cuerpo, movido (dx, dy) en pantalla y con
         * escala de pantalla (ex, ey): así "caer" es siempre hacia abajo */
        marco: function (dx, dy, ex, ey) {
          ctx.translate(o.x + (dx || 0), o.y + (dy || 0));
          if (ex != null) ctx.scale(ex, ey);
          ctx.transform(v[0], v[1], ox, oy, 0, 0);
        },
        /* dibuja sobre la foto, en coordenadas del marco */
        enFoto: function (fn, modo) {
          c2.save();
          c2.globalCompositeOperation = modo || 'source-over';
          c2.translate(FH, FH); c2.scale(1, -1);
          fn(c2);
          c2.restore();
        },
        /* pinta la foto: p = { dx, dy, ex, ey (pantalla), rot sobre (pf, ps),
         * sf, ss (escala en el marco), alpha, clip (camino en el marco) } */
        pinta: function (p) {
          var pf = p.pf || 0, ps = p.ps || 0;
          ctx.save();
          M.marco(p.dx, p.dy, p.ex, p.ey);
          if (p.rot) girarSobre(ctx, pf, ps, p.rot);
          if (p.sf != null) { ctx.translate(pf, ps); ctx.scale(p.sf, p.ss); ctx.translate(-pf, -ps); }
          if (p.clip) { p.clip(ctx); ctx.clip(); }
          ctx.globalAlpha = (p.alpha == null) ? 1 : Math.max(0, Math.min(1, p.alpha));
          ctx.scale(1, -1);
          ctx.drawImage(p.lienzo || lienzo, -FH, -FH, FOTO, FOTO);
          ctx.restore();
        },
        /* un trozo cuadrado de la foto, de lado l y centro (f, s) del marco,
         * movido (dx, dy) en pantalla y girado rot */
        trozo: function (f, s, l, dx, dy, rot, alpha) {
          if (alpha <= 0) return;
          var q = M.pant(f, s);
          ctx.save();
          ctx.translate(q.x + dx, q.y + dy);
          ctx.rotate(rot);
          ctx.transform(v[0], v[1], ox, oy, 0, 0);
          ctx.globalAlpha = Math.min(1, alpha);
          ctx.scale(1, -1);
          ctx.drawImage(lienzo, (FH + f - l / 2) * S, (FH - s - l / 2) * S, l * S, l * S, -l / 2, -l / 2, l, l);
          ctx.restore();
        }
      };
      ctx.save();
      morir(M, pm, o);
      ctx.restore();
    };
  }
  /* estrellitas de mareo dando vueltas */
  function mareo(ctx, x, y, t, alpha) {
    for (var k = 0; k < 3; k++) {
      var a = t * 7 + k * 2.09;
      estrella4(ctx, x + Math.cos(a) * 2.6, y + Math.sin(a) * 0.9, 0.9, '#ffe14a', alpha);
    }
  }
