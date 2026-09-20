  /* ---------- Estado ---------- */
  var color = SWATCHES[0];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var paused = !!reduce;
  var clock = 0.06, last = null;
  var vel = 1, recorrido = 0.06 * SPEED;
  var stages = [];

  function teamFor(c) {
    var pref = ['#ff0000', '#00ffff', '#00ff00', '#ff69b4', '#b19cd9'];
    return pref.filter(function (p) { return p !== c; }).slice(0, 3);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function makeCanvas(w, h, cls, label) {
    var cv = el('canvas', cls);
    cv.width = w; cv.height = h;
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', label);
    return cv;
  }

  function buildCard(sk, idx) {
    var card = el('article', 'card');
    var views = el('div', 'views');
    var f1 = el('figure', 'view');
    var lupa = makeCanvas(LUPA, LUPA, 'lupa', sk.name + ' ampliada');
    f1.appendChild(lupa); f1.appendChild(el('figcaption', null, 'Lupa ×2'));
    var f2 = el('figure', 'view');
    var scene = makeCanvas(SW, SH, 'scene', sk.name + ' en un pasillo a tamaño real');
    f2.appendChild(scene); f2.appendChild(el('figcaption', null, 'Tamaño de partida'));
    views.appendChild(f1); views.appendChild(f2);

    var head = el('div', 'card-head');
    head.appendChild(el('h3', null, sk.name));
    head.appendChild(el('span', 'chip ' + sk.chipCls, sk.chip));

    var dl = el('dl', 'facts');
    dl.appendChild(el('dt', null, 'Se consigue'));
    dl.appendChild(el('dd', null, sk.gana));
    dl.appendChild(el('dt', null, 'Se ve'));
    dl.appendChild(el('dd', null, sk.ve));
    if (sk.q) {
      dl.appendChild(el('dt', null, 'La Q'));
      dl.appendChild(el('dd', null, sk.q));
    }
    if (sk.muerte) {
      dl.appendChild(el('dt', null, 'Al morir'));
      dl.appendChild(el('dd', null, sk.muerte));
    }
    if (sk.ojo) {
      dl.appendChild(el('dt', 'ojo', 'Ojo'));
      dl.appendChild(el('dd', 'ojo', sk.ojo));
    }

    card.appendChild(head);
    card.appendChild(views);
    card.appendChild(dl);
    stages.push({ id: sk.id, scene: scene, lupa: lupa, offset: idx * 41 });
    return card;
  }

  CAT.forEach(function (it, i) {
    document.getElementById('g-' + it.cat).appendChild(buildCard(it, i));
  });

  /* ---------- Controles ---------- */
  var swWrap = document.getElementById('swatches');
  SWATCHES.forEach(function (c, i) {
    var b = el('button', 'sw');
    b.type = 'button';
    b.id = 'sw-' + i;
    b.style.setProperty('--c', c);
    b.setAttribute('aria-label', 'Color ' + c);
    b.setAttribute('aria-pressed', c === color ? 'true' : 'false');
    b.addEventListener('click', function () {
      color = c;
      Array.prototype.forEach.call(swWrap.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      if (paused) render();
    });
    swWrap.appendChild(b);
  });

  var velIn = document.getElementById('vel'), velOut = document.getElementById('vel-out');
  velIn.addEventListener('input', function () {
    vel = (+velIn.value) / 100;
    velOut.textContent = velIn.value + ' %';
    if (paused) render();
  });

  var pauseBtn = document.getElementById('pause');
  function syncPause() { pauseBtn.textContent = paused ? 'Seguir' : 'Pausar'; }
  pauseBtn.addEventListener('click', function () {
    paused = !paused;
    last = null;
    syncPause();
    if (!paused) requestAnimationFrame(tick);
  });
  syncPause();

  /* ---------- Dibujo ---------- */
  function drawStage(st) {
    var ctx = st.scene.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SW, SH);
    ctx.setTransform(S, 0, 0, S, 0, 0);

    var lw = 2 / S, gap = 7 + lw / 2;
    ctx.strokeStyle = '#2121ff';
    ctx.lineWidth = lw;
    roundRect(ctx, X0 - gap, Y0 - gap, PW + 2 * gap, PH + 2 * gap, 4);
    ctx.stroke();
    roundRect(ctx, X0 + gap, Y0 + gap, PW - 2 * gap, PH - 2 * gap, 1.5);
    ctx.stroke();

    var s = recorrido;
    var lap = ((s % P) + P) % P;
    var quieto = st.id.indexOf('emo_') === 0;

    ctx.fillStyle = '#ffb8ae';
    for (var k = 0; k < P / 8; k++) {
      var sp = k * 8 + 4;
      if (!quieto && sp <= lap + 2) continue;
      var pp = pathAt(sp);
      if (quieto && pp.y === Y1 && Math.abs(pp.x - 56) < 8) continue;
      ctx.fillRect(pp.x - 1, pp.y - 1, 2, 2);
    }

    var pos = quieto ? { x: 56, y: Y1, d: 3 } : pathAt(s);
    var phase = [0, 1, 2, 1][Math.floor(clock * 14) % 4];
    var o = {
      x: pos.x, y: pos.y, d: pos.d, half: HALF[phase], c: color, t: clock,
      team: teamFor(color),
      vel: vel,
      estira: Math.max(0.5, 1 + (vel - 1) * 2),
      s: s,
      back: function (dist) { return pathAt(s - dist); }
    };
    ctx.save();
    DRAW[st.id](ctx, o);
    ctx.restore();

    var lctx = st.lupa.getContext('2d');
    lctx.imageSmoothingEnabled = false;
    var dv = DIR_V[pos.d];
    var cx = pos.x, cy = pos.y;
    if (quieto) cy = pos.y - 19;
    if (st.id.indexOf('efx_') === 0) { cx = pos.x - dv[0] * 5; cy = pos.y - dv[1] * 5; }
    if (st.id === 'caracol' || st.id === 'recreativa') { cx = pos.x - dv[0] * 2; cy = pos.y - dv[1] * 2; }
    var sx = Math.max(0, Math.min(SW - CROP, Math.round(cx * S - CROP / 2)));
    var sy = Math.max(0, Math.min(SH - CROP, Math.round(cy * S - CROP / 2)));
    lctx.fillStyle = '#000';
    lctx.fillRect(0, 0, LUPA, LUPA);
    lctx.drawImage(st.scene, sx, sy, CROP, CROP, 0, 0, LUPA, LUPA);
  }

  function render() {
    for (var i = 0; i < stages.length; i++) drawStage(stages[i]);
  }

  function tick(now) {
    if (paused) return;
    if (last != null) {
      var dt = Math.min(0.05, (now - last) / 1000);
      clock += dt;
      recorrido += dt * SPEED * vel;
    }
    last = now;
    render();
    requestAnimationFrame(tick);
  }

  render();
  if (!paused) requestAnimationFrame(tick);
})();

</script>
