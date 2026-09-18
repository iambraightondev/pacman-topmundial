  /* ---------- Catálogo de la tanda ---------- */
  var CAT = [
    /* --- skins extravagantes --- */
    { id: 'condor', name: 'CÓNDOR', cat: 'skin', cofre: true,
      ve: 'Cóndor andino de perfil: cabeza pelada de piel rojiza, carúncula de macho, golilla de plumón blanco al cuello y plumaje casi negro con un toque del color del jugador. El pico de gancho es la boca.',
      q: 'Abre las dos alas de par en par y suelta un chillido que sale en ondas.',
      muerte: 'Se le doblan las alas y cae en picado dando vueltas, soltando plumas blancas y negras.' },
    { id: 'toro', name: 'TORO', cat: 'skin', cofre: true,
      ve: 'Cabezota de toro bravo: morro claro con la anilla dorada en la nariz, dos cuernos de hueso, copete rizado entre ellos, oreja y un ojo con el ceño apretado. Resopla vapor por la nariz al correr y el pelaje lleva el color del jugador.',
      q: 'Embiste: baja la cabeza y arranca con rayas de velocidad y una polvareda detrás.',
      muerte: 'Se tambalea dos pasos, se desploma de lado y levanta una nube de polvo.' },
    { id: 'unicornio', name: 'UNICORNIO', cat: 'skin', cofre: true,
      ve: 'Cabeza de unicornio con crin de arcoíris que ondea detrás, cuerno de espiral dorado con su destello, pestañas largas y hocico rosado. El pelaje es el color del jugador aclarado.',
      q: 'Dispara un chorro de arcoíris por el cuerno.',
      muerte: 'Se le apaga el cuerno, la crin pierde el color y se deshace en purpurina que cae.' },
    { id: 'rana', name: 'RANA', cat: 'skin',
      ve: 'Rana de cabeza ancha y aplastada, con dos ojazos saltones encima, pupila horizontal, lunares en la piel y papada clara. La boca es una bocaza que ocupa todo el morro.',
      q: 'Saca la lengua entera de un lengüetazo, con su ventosa al final.',
      muerte: 'Pega un último salto, cae patas arriba con la lengua colgando y ve las estrellas.',
      ojo: 'No muerde como los demás: al comer asoma la lengua.' },
    { id: 'payaso', name: 'PAYASO', cat: 'skin',
      ve: 'El payaso del emoji, de perfil: cara crema, peluca de rizos rojos, ojo con el aro azul grueso y la pupila alargada, ceja fina, coloretes, nariz de bola roja y una sonrisota de labios rojos con los dientes blancos. Lleva una florecita del color del jugador en la sien.',
      q: 'Le estalla una tarta de nata en la cara.',
      muerte: 'La nariz se le desinfla y sale volando dando bandazos mientras la cara se desploma.' },
    { id: 'recreativa', name: 'RECREATIVA', cat: 'skin',
      ve: 'Un mueble de salón recreativo: marquesina de luces (una franja del color del jugador), pantalla donde corre su propia partida de Pac-Man con su barrido de tubo, y un panel de mandos con palanca y botones que hace de mandíbula, con dientes de píxel.',
      q: 'INSERT COIN: cae una moneda por la ranura, la pantalla destella y parpadea el rótulo.',
      muerte: 'Sale GAME OVER parpadeando, el tubo se cierra en una raya y el mueble se apaga echando humo.',
      ojo: 'La más cuadrada de la tanda; a propósito, es el guiño al propio juego.' },
    { id: 'cangrejo', name: 'CANGREJO', cat: 'skin',
      ve: 'Cangrejo de frente, a lo simple: caparazón ancho, dos ojos en tallo que se mecen, tres patitas por lado que corretean y dos pinzas. La que va delante es la boca; la de atrás saluda.',
      q: 'Pinzazo seco: la pinza se cierra de golpe y revienta una nube de burbujas.',
      muerte: 'Se cuece: se pone rojo, echa vapor y queda patas arriba.',
      ojo: 'De perfil parecía una araña. Va de frente porque el cangrejo camina de costado: mira a cámara mientras avanza.' },
    { id: 'caracol', name: 'CARACOL', cat: 'skin',
      ve: 'Caracol con concha de espiral grande del color del jugador, pie blando, dos tentáculos con ojos y una boquita que se abre al comer. Deja un rastro de baba que brilla.',
      q: 'Se mete entero en la concha y sale rodando a toda velocidad.',
      muerte: 'Se mete en la concha, la concha se agrieta y se rompe en cascos. Solo queda la baba.',
      ojo: 'El chiste está en que el bicho más lento del mundo corra lo mismo que los demás.' },

    /* --- accesorios --- */
    { id: 'acc_chullo', name: 'CHULLO', cat: 'accesorio',
      ve: 'Gorro de lana con zigzag andino, pompón arriba y la orejera con trenza meciéndose al correr.' },
    { id: 'acc_mohicano', name: 'MOHICANO', cat: 'accesorio',
      ve: 'Nueve pinchos rectos del mismo largo, de la frente a la nuca, barridos hacia atrás y con los lados rapados.' },
    { id: 'acc_vaquero', name: 'SOMBRERO VAQUERO', cat: 'accesorio',
      ve: 'Sombrero de cuero con el ala curvada, copa con pellizco, cinta negra y una chapa dorada.',
      ojo: 'El ala asoma por los dos lados: roza el muro en los pasillos.' },
    { id: 'acc_orejas', name: 'OREJAS DE GATO', cat: 'accesorio',
      ve: 'Dos orejas de gato, rosas por dentro, que se mueven solas cada poco. De perfil se ve entera la de este lado, asoma la otra y baja un lado de la vincha.' },
    { id: 'acc_buceo', name: 'GAFAS DE BUCEO', cat: 'accesorio',
      ve: 'Gafas de cristal azul con su correa y un tubo de respirar que asoma por detrás soltando burbujitas.' },
    { id: 'acc_luchador', name: 'MÁSCARA DE LUCHADOR', cat: 'accesorio', cofre: true,
      ve: 'Máscara de lucha libre: tela azul, llamas doradas alrededor del hueco del ojo y los cordones cruzados detrás.' },
    { id: 'acc_patito', name: 'FLOTADOR DE PATITO', cat: 'accesorio', cofre: true,
      ve: 'Un flotador de pato de goma a la cintura, con su cabeza delante y la colita detrás, que se bambolea al correr.',
      ojo: 'Es el más aparatoso de todos: sobresale por delante y por detrás.' },

    /* --- efectos --- */
    { id: 'efx_pixeles', name: 'PÍXELES', cat: 'efecto',
      ve: 'Al pasar se va deshaciendo en bloques de colores que caen y se apagan.' },
    { id: 'efx_ondas', name: 'ONDAS', cat: 'efecto',
      ve: 'En cada giro deja un anillo del color del jugador que se abre y se desvanece.',
      ojo: 'Solo se ve al doblar: en un pasillo largo no hace nada.' },
    { id: 'efx_mariposas', name: 'MARIPOSAS', cat: 'efecto',
      ve: 'Una fila de mariposas que aletean y se van subiendo por detrás.' },
    { id: 'efx_frutas', name: 'FRUTAS', cat: 'efecto',
      ve: 'Cerezas, fresas y naranjas que van botando por el camino.',
      ojo: 'Son de adorno: no se comen ni valen puntos.' },
    { id: 'efx_fantasmitas', name: 'FANTASMITAS', cat: 'efecto', cofre: true,
      ve: 'Por donde pasas se escapan fantasmas diminutos de los cuatro colores, que suben y se apagan.' },
    { id: 'efx_ojos', name: 'OJOS', cat: 'efecto', cofre: true,
      ve: 'Deja ojos abiertos que te siguen con la mirada y se van cerrando al apagarse.' },

    /* --- emotes --- */
    { id: 'emo_silbando', name: 'SILBANDO', cat: 'emote',
      ve: 'Silba mirando arriba y al lado contrario, con las rayitas del cachete forzando los labios y tres notas que se le escapan.' },
    { id: 'emo_plis', name: 'PLIS', cat: 'emote',
      ve: 'Ojazos de cachorro con dos brillos, cejas de pena y la boca temblando.' },
    { id: 'emo_ambicioso', name: 'AMBICIOSO', cat: 'emote',
      ve: 'Dos dólares por ojos, sonrisa de oreja a oreja con la lengua fuera y monedas cayendo.' },
    { id: 'emo_nervios', name: 'NERVIOS', cat: 'emote',
      ve: 'Sonrisa forzada, cejas en tejado, un tic en el ojo y un gotón de sudor que resbala.' },
    { id: 'emo_arcoiris', name: 'ARCOÍRIS', cat: 'emote',
      ve: 'Cara de loco: los dos ojos desorbitados y desiguales con las pupilas bailando, una ceja arriba y otra abajo, cachetes verdes y un chorro de arcoíris que le sale de la boca a arcadas.' }
  ];

  var PRECIO = { skin: 1500, accesorio: 450, efecto: 250, emote: 150 };
  CAT.forEach(function (it) {
    it.chipCls = it.cofre ? 'cofre' : 'tienda';
    it.chip = it.cofre ? 'Solo cofre' : String(PRECIO[it.cat]).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' monedas';
    it.gana = it.cofre
      ? 'No se vende: solo sale de un cofre.'
      : 'En la tienda, por ' + it.chip + '.' + (it.cat === 'accesorio' ? ' Luce con cualquier skin.' : '');
  });

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
