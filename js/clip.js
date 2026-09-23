/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/clip.js
 * CLIPS PARA REELS Y TIKTOK. Define window.PM.Clip
 *
 * Desde el reproductor de repeticiones (js/replay.js) se saca un trozo de
 * la partida como VÍDEO VERTICAL 9:16, con su sonido, listo para subirlo.
 *
 * Cómo se elige el trozo: se lleva la barra al momento bueno y se escoge
 * cuánto dura; el clip ACABA un poco después de donde está la barra (lo que
 * se quiere enseñar es la jugada y lo que lleva hasta ella). MEJOR JUGADA
 * lo pone solo sobre la cadena de fantasmas más larga de la partida.
 *
 * Cómo se graba: la repetición se reproduce a velocidad normal y cada
 * fotograma del juego se compone sobre un lienzo vertical (Game.render
 * llama a componer()), que un MediaRecorder graba junto con el sonido del
 * juego. Es en tiempo real —un clip de 15 s tarda 15 s— porque así el
 * sonido sale solo y cuadrado con la imagen; y es lo que se ve mientras
 * se graba, con su aviso de GRABANDO encima.
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var G = window.PM.Game;

  var ANCHO = 1080, ALTO = 1920;          // el vertical de reels y tiktok
  var DURACIONES = [10, 15, 30, 60];      // segundos
  var MARGEN_TRAS = 120;                  // ticks que el clip sigue tras la barra
  var FUENTE = '"Press Start 2P", "Courier New", monospace';
  var URL_JUEGO = 'PACMAN-TOPMUNDIAL.VERCEL.APP';

  /* El formato: MP4 si el navegador sabe hacerlo (Chrome, Arc, Edge
   * recientes y Safari), que es lo que aceptan Instagram y TikTok sin
   * rechistar; si no, WebM. */
  function formato() {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null;
    var lista = ['video/mp4;codecs=avc1.42E028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a',
                 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < lista.length; i++) if (MediaRecorder.isTypeSupported(lista[i])) return lista[i];
    return null;
  }

  var MODO_TXT = { solo: 'CLÁSICO', duo: 'CLÁSICO A DOS', reto: 'RETO', hab: 'DESATADO',
                   habduo: 'DESATADO A DOS', vs: 'PAC-MAN VS.', habvs: 'VS. DESATADO' };

  var Clip = {
    abierto: false,
    dur: 15,
    grabando: null,     // { rec, trozos, fin, ini, audio, ... }
    ultimo: null,       // { blob, url, nombre, tipo }

    /* ¿Se puede grabar aquí? (sin MediaRecorder o sin captureStream, no) */
    disponible: function () {
      return typeof document !== 'undefined' && !!formato() &&
        !!(document.createElement('canvas').captureStream);
    },

    /* ---------- el trozo elegido ---------- */
    rango: function () {
      var R = window.PM.Replay, total = R.tTotal || 0;
      var fin = Math.min(total, R.t + MARGEN_TRAS);
      var ini = Math.max(0, fin - this.dur * 60);
      /* al principio de la partida no se queda corto: se alarga hacia delante */
      if (fin - ini < this.dur * 60) fin = Math.min(total, ini + this.dur * 60);
      return { ini: ini, fin: fin };
    },

    /* La cadena de fantasmas más larga; si no hay, el último nivel que se
     * empezó, y si tampoco, el final de la partida. */
    mejorJugada: function () {
      var R = window.PM.Replay, ms = R.momentos || [], mejor = null, nota = -1;
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i], n = -1;
        if (m.tipo === 'cadena') n = 10 + (parseInt(String(m.label).replace(/\D/g, ''), 10) || 0);
        else if (m.tipo === 'nivel' && m.t > 0) n = 1;
        if (n > nota || (n === nota && n >= 0)) { nota = n; mejor = m; }
      }
      if (mejor && mejor.tipo === 'cadena') return mejor.t;
      if (mejor) return mejor.t + 8 * 60;
      return Math.max(0, (R.tTotal || 0) - MARGEN_TRAS);
    },

    /* ---------- el panel ---------- */
    abrir: function () {
      var R = window.PM.Replay, UI = window.PM.UI;
      if (!R.barra || !R.fotos.length || this.grabando) return;
      if (!this.disponible()) {
        if (UI && UI.showPrompt) {
          UI.showPrompt({ title: 'CLIPS', color: '#ff8c00',
            lines: ['ESTE NAVEGADOR NO SABE GRABAR VÍDEO.', 'PRUEBA CON CHROME, EDGE, ARC O SAFARI.'],
            buttons: [{ label: 'VALE', primary: true, hint: 'ENTER', keys: ['Enter', 'Escape'],
              onClick: function () { UI.hidePrompt(); } }] });
        }
        return;
      }
      R.pausar(true);
      if (!this.panel) this.construir();
      this.abierto = true;
      this.panel.style.display = '';
      R.barra.classList.add('con-clip');
      this.pinta();
    },

    cerrar: function () {
      this.abierto = false;
      if (this.panel) this.panel.style.display = 'none';
      var R = window.PM.Replay;
      if (R.barra) R.barra.classList.remove('con-clip');
      if (this.rangoEl) this.rangoEl.style.display = 'none';
    },

    construir: function () {
      var self = this, R = window.PM.Replay;
      function el(tag, cls, txt) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
      }
      function boton(cls, txt, fn) {
        var b = el('button', cls, txt);
        b.type = 'button';
        b.addEventListener('click', function (ev) { ev.stopPropagation(); fn(); R.despierta(); });
        return b;
      }
      var p = el('div', 'rv-clip');
      p.style.display = 'none';
      var cab = el('div', 'rv-clip-cab');
      cab.appendChild(el('span', 'rv-clip-titulo', '✂ CLIP PARA REELS'));
      cab.appendChild(boton('rv-ib rv-clip-x', '✕', function () { self.cerrar(); }));
      p.appendChild(cab);
      p.appendChild(el('div', 'rv-clip-ayuda', 'LLEVA LA BARRA A LA JUGADA: EL CLIP ACABA AHÍ.'));
      var chips = el('div', 'rv-clip-chips');
      this.chips = [];
      DURACIONES.forEach(function (d) {
        var c = boton('rv-clip-chip', d + ' S', function () { self.dur = d; self.pinta(); });
        c.dataset.d = d;
        chips.appendChild(c);
        self.chips.push(c);
      });
      chips.appendChild(boton('rv-clip-chip mejor', '★ MEJOR JUGADA', function () {
        R.irA(self.mejorJugada());
        self.pinta();
      }));
      p.appendChild(chips);
      var pie = el('div', 'rv-clip-pie');
      this.rangoTxt = el('span', 'rv-clip-rango', '');
      pie.appendChild(this.rangoTxt);
      pie.appendChild(boton('rv-clip-grabar', '● GRABAR', function () { self.grabar(); }));
      p.appendChild(pie);
      R.barra.querySelector('.rv-abajo').insertBefore(p, R.barra.querySelector('.rv-pista'));
      this.panel = p;
      /* lo elegido, pintado sobre la barra */
      this.rangoEl = el('div', 'rv-clip-zona');
      this.rangoEl.style.display = 'none';
      R.pista.insertBefore(this.rangoEl, R.rvMarcas);
    },

    /* Lo llama también Replay.pintaBarra: al mover la barra se mueve el clip */
    pinta: function () {
      if (!this.abierto || !this.panel) return;
      var R = window.PM.Replay, r = this.rango(), total = R.tTotal || 1;
      for (var i = 0; i < this.chips.length; i++) {
        this.chips[i].classList.toggle('activo', +this.chips[i].dataset.d === this.dur);
      }
      this.rangoTxt.textContent = R.reloj(r.ini) + ' - ' + R.reloj(r.fin) +
        ' · ' + Math.round((r.fin - r.ini) / 60) + ' S';
      this.rangoEl.style.display = '';
      this.rangoEl.style.left = (r.ini / total * 100) + '%';
      this.rangoEl.style.width = ((r.fin - r.ini) / total * 100) + '%';
    },

    /* Teclas mientras hay clip: grabando, solo ESC (cancela) y nada más pasa
     * al reproductor —una pausa en mitad saldría en el vídeo—. */
    tecla: function (ev) {
      var k = ev.key;
      if (this.grabando) {
        if (k === 'Escape') this.parar(false);
        return true;
      }
      if (this.abierto) {
        if (k === 'Escape') { this.cerrar(); return true; }
        if (k === 'Enter') { this.grabar(); return true; }
      }
      if (k === 'c' || k === 'C') { if (this.abierto) this.cerrar(); else this.abrir(); return true; }
      return false;
    },

    /* =========================================================
     * LA GRABACIÓN
     * ========================================================= */
    grabar: function () {
      var self = this, R = window.PM.Replay;
      if (this.grabando || !R.fotos.length) return;
      var tipo = formato();
      if (!tipo) return;
      var r = this.rango();
      if (r.fin - r.ini < 60) return;
      this.cerrar();

      var lienzo = document.createElement('canvas');
      lienzo.width = ANCHO; lienzo.height = ALTO;
      var c = lienzo.getContext('2d');
      var fondo = this.fondo();

      /* sonido: se engancha una salida más al volumen general del juego */
      var audio = window.AudioSys && AudioSys.salidaGrabacion ? AudioSys.salidaGrabacion() : null;
      var pista = lienzo.captureStream(60);
      if (audio) audio.stream.getAudioTracks().forEach(function (t) { pista.addTrack(t); });

      var rec;
      try {
        rec = new MediaRecorder(pista, { mimeType: tipo, videoBitsPerSecond: 4500000, audioBitsPerSecond: 160000 });
      } catch (e) {
        try { rec = new MediaRecorder(pista); tipo = rec.mimeType || tipo; } catch (e2) {
          if (audio) AudioSys.soltarGrabacion(audio);
          this.error('NO SE PUDO EMPEZAR A GRABAR.');
          return;
        }
      }
      var g = this.grabando = { rec: rec, trozos: [], ini: r.ini, fin: r.fin, tipo: tipo,
        lienzo: lienzo, c: c, fondo: fondo, audio: audio, vale: true,
        velocidad: G.timeScale || 1, banner: null };

      rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) g.trozos.push(ev.data); };
      rec.onstop = function () { self.terminado(g); };

      /* al principio del trozo, a velocidad normal y con sonido aunque quien
       * mira lo tenga quitado: el clip lo lleva siempre */
      R.irA(r.ini);
      G.timeScale = 1;
      if (window.AudioSys) AudioSys.setMuted(false);
      this.aviso(true);
      this.componer();                      // el primer fotograma, ya
      rec.start(1000);
      R.pausar(false);
    },

    /* Cada fotograma de la partida, montado en vertical. Lo llama
     * Game.render al acabar de pintar. */
    componer: function () {
      var g = this.grabando, R = window.PM.Replay;
      if (!g || !G.canvas) return;
      var c = g.c;
      c.drawImage(g.fondo, 0, 0);
      /* la partida, a lo ancho menos un margen: lo de los lados lo tapan
       * los botones de la app */
      var gw = 960, gh = Math.round(gw * G.canvas.height / G.canvas.width);
      var gx = (ANCHO - gw) / 2, gy = 330;
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#000';
      c.fillRect(gx - 6, gy - 6, gw + 12, gh + 12);
      c.drawImage(G.canvas, gx, gy, gw, gh);
      c.strokeStyle = '#2121de';
      c.lineWidth = 6;
      c.strokeRect(gx - 6, gy - 6, gw + 12, gh + 12);
      this.pintaMomento(c, gy + gh + 70);

      /* lo que falta y cuándo se para */
      var hecho = Math.max(0, R.t - g.ini), total = g.fin - g.ini;
      if (this.avisoTxt) this.avisoTxt.textContent = '● GRABANDO ' + R.reloj(hecho) + ' / ' + R.reloj(total);
      if (this.avisoBarra) this.avisoBarra.style.width = Math.min(100, hecho / total * 100) + '%';
      if (R.t >= g.fin || R.acabada()) this.parar(true);
    },

    /* El rótulo del momento (CADENA ×4, NIVEL 3...) cuando acaba de pasar:
     * salta grande y se va apagando, como un subtítulo de reel. */
    pintaMomento: function (c, y) {
      var R = window.PM.Replay, m = R.momentoEn(R.t);
      if (!m || m.t <= this.grabando.ini - 1 || R.t - m.t > 150) return;
      var edad = R.t - m.t;
      var escala = edad < 8 ? 0.6 + edad * 0.06 : 1;
      var alfa = edad > 110 ? Math.max(0, 1 - (edad - 110) / 40) : 1;
      var color = m.tipo === 'cadena' ? '#00ffff' : (m.tipo === 'muerte' ? '#ff3b3b' : '#ffff00');
      c.save();
      c.globalAlpha = alfa;
      c.translate(ANCHO / 2, y);
      c.scale(escala, escala);
      c.font = '56px ' + FUENTE;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 10;
      c.strokeStyle = '#000';
      c.strokeText(m.label, 0, 0);
      c.fillStyle = color;
      c.fillText(m.label, 0, 0);
      c.restore();
    },

    /* Lo que no cambia en todo el clip (el fondo, el título, quién jugó y
     * dónde se juega) se pinta una vez y se copia en cada fotograma. */
    fondo: function () {
      var R = window.PM.Replay, rep = R.rep || {};
      var f = document.createElement('canvas');
      f.width = ANCHO; f.height = ALTO;
      var c = f.getContext('2d');
      var gr = c.createLinearGradient(0, 0, 0, ALTO);
      gr.addColorStop(0, '#0a0a2e');
      gr.addColorStop(0.5, '#000000');
      gr.addColorStop(1, '#0a0a2e');
      c.fillStyle = gr;
      c.fillRect(0, 0, ANCHO, ALTO);
      /* puntitos de pastilla de fondo, muy apagados */
      c.fillStyle = 'rgba(255, 184, 151, 0.10)';
      for (var y = 40; y < ALTO; y += 60) for (var x = 30; x < ANCHO; x += 60) c.fillRect(x, y, 6, 6);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 10;
      c.strokeStyle = '#000';
      c.font = '84px ' + FUENTE;
      c.strokeText('PAC-MAN', ANCHO / 2, 120);
      c.fillStyle = '#ffff00';
      c.fillText('PAC-MAN', ANCHO / 2, 120);
      c.font = '40px ' + FUENTE;
      c.fillStyle = '#ffffff';
      c.fillText('TOP MUNDIAL', ANCHO / 2, 200);
      var quien = (rep.nombres || []).filter(Boolean).join(' + ');
      var modo = MODO_TXT[rep.modo] || (R.modo === 'verRed' ? 'PARTY' : '');
      c.font = '26px ' + FUENTE;
      c.fillStyle = '#9fb4ff';
      c.fillText([quien, modo].filter(Boolean).join(' · ').slice(0, 44), ANCHO / 2, 268);
      c.font = '24px ' + FUENTE;
      c.fillStyle = 'rgba(255, 255, 255, 0.75)';
      c.fillText('JUEGA GRATIS EN', ANCHO / 2, 1770);
      c.fillStyle = '#ffff00';
      c.fillText(URL_JUEGO, ANCHO / 2, 1815);
      return f;
    },

    /* ok: ha llegado al final del trozo (si no, se ha cancelado) */
    parar: function (ok) {
      var g = this.grabando;
      if (!g || g.parando) return;
      g.parando = true;
      g.vale = !!ok;
      window.PM.Replay.pausar(true);
      try { g.rec.stop(); } catch (e) { this.terminado(g); }
    },

    terminado: function (g) {
      var R = window.PM.Replay;
      if (g.audio) AudioSys.soltarGrabacion(g.audio);
      g.rec.stream.getVideoTracks().forEach(function (t) { t.stop(); });
      this.grabando = null;
      this.aviso(false);
      G.timeScale = g.velocidad;
      R.mudo(false);                        // el sonido, como lo tenga quien mira
      R.pintaBarra();
      if (!g.vale || !g.trozos.length) return;
      var mp4 = g.tipo.indexOf('mp4') !== -1;
      var blob = new Blob(g.trozos, { type: mp4 ? 'video/mp4' : 'video/webm' });
      if (this.ultimo && this.ultimo.url) URL.revokeObjectURL(this.ultimo.url);
      var d = new Date();
      function dd(n) { return (n < 10 ? '0' : '') + n; }
      this.ultimo = { blob: blob, url: URL.createObjectURL(blob), tipo: blob.type,
        nombre: 'pacman-topmundial-' + d.getFullYear() + dd(d.getMonth() + 1) + dd(d.getDate()) +
          '-' + dd(d.getHours()) + dd(d.getMinutes()) + dd(d.getSeconds()) + (mp4 ? '.mp4' : '.webm') };
      this.listo();
    },

    /* ---------- el aviso mientras se graba ----------
     * Tapa la partida para que ningún clic la pause a medias (saldría en el
     * vídeo), pero deja verla. */
    aviso: function (on) {
      var self = this;
      if (!on) { if (this.avisoEl) this.avisoEl.style.display = 'none'; return; }
      if (!this.avisoEl) {
        var a = document.createElement('div');
        a.className = 'clip-grabando';
        var caja = document.createElement('div');
        caja.className = 'clip-grabando-caja';
        this.avisoTxt = document.createElement('div');
        this.avisoTxt.className = 'clip-grabando-txt';
        var riel = document.createElement('div');
        riel.className = 'clip-grabando-riel';
        this.avisoBarra = document.createElement('div');
        riel.appendChild(this.avisoBarra);
        var nota = document.createElement('div');
        nota.className = 'clip-grabando-nota';
        nota.textContent = 'NO CAMBIES DE PESTAÑA: SE GRABA LO QUE SE VE';
        var cancelar = document.createElement('button');
        cancelar.type = 'button';
        cancelar.className = 'clip-grabando-cancelar';
        cancelar.textContent = 'CANCELAR · ESC';
        cancelar.addEventListener('click', function (ev) { ev.stopPropagation(); self.parar(false); });
        caja.appendChild(this.avisoTxt);
        caja.appendChild(riel);
        caja.appendChild(nota);
        caja.appendChild(cancelar);
        a.appendChild(caja);
        a.addEventListener('click', function (ev) { ev.stopPropagation(); });
        document.body.appendChild(a);
        this.avisoEl = a;
      }
      this.avisoTxt.textContent = '● GRABANDO';
      this.avisoBarra.style.width = '0';
      this.avisoEl.style.display = '';
    },

    /* ---------- el clip, hecho ---------- */
    listo: function () {
      var self = this, UI = window.PM.UI, u = this.ultimo;
      if (!UI || !UI.showPrompt || !u) return;
      var fichero = null;
      try { fichero = new File([u.blob], u.nombre, { type: u.tipo }); } catch (e) { fichero = null; }
      var puedeCompartir = !!(fichero && navigator.canShare && navigator.canShare({ files: [fichero] }));
      var botones = [];
      if (puedeCompartir) {
        botones.push({ label: 'COMPARTIR', primary: true, hint: 'ENTER', keys: ['Enter'],
          onClick: function () {
            navigator.share({ files: [fichero], title: 'PAC-MAN TOP MUNDIAL',
              text: 'Mira esta jugada en PAC-MAN TOP MUNDIAL 👾 https://pacman-topmundial.vercel.app' })
              .catch(function () { /* lo ha cerrado */ });
          } });
      }
      botones.push({ label: 'DESCARGAR', primary: !puedeCompartir, hint: puedeCompartir ? 'D' : 'ENTER',
        keys: puedeCompartir ? ['d'] : ['Enter', 'd'],
        onClick: function () { self.descargar(); } });
      botones.push({ label: 'CERRAR', hint: 'ESC', keys: ['Escape', 'q'],
        onClick: function () { UI.hidePrompt(); } });
      UI.showPrompt({
        title: 'CLIP LISTO',
        color: '#ffff00',
        lines: [(u.tipo.indexOf('mp4') !== -1 ? 'MP4' : 'WEBM') + ' VERTICAL · ' +
          Math.max(1, Math.round(u.blob.size / 1048576)) + ' MB · LISTO PARA REELS Y TIKTOK'],
        custom: function (host) {
          var v = document.createElement('video');
          v.className = 'clip-previa';
          v.src = u.url;
          v.controls = true;
          v.loop = true;
          v.muted = true;
          v.autoplay = true;
          v.setAttribute('playsinline', '');
          host.appendChild(v);
        },
        buttons: botones
      });
    },

    descargar: function () {
      var u = this.ultimo;
      if (!u) return;
      var a = document.createElement('a');
      a.href = u.url;
      a.download = u.nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },

    error: function (txt) {
      var UI = window.PM.UI;
      if (!UI || !UI.showPrompt) return;
      UI.showPrompt({ title: 'CLIPS', color: '#ff8c00', lines: [txt],
        buttons: [{ label: 'VALE', primary: true, hint: 'ENTER', keys: ['Enter', 'Escape'],
          onClick: function () { UI.hidePrompt(); } }] });
    }
  };

  window.PM.Clip = Clip;
})();
