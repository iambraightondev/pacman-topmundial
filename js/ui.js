/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/ui.js
 * Menús, panel de opciones, selector de color, lobby online
 * y entrada (teclado/táctil).
 * Define window.PM.UI y window.PM.settings
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var D = CFG.DIR;

  /* ---------- Ajustes: carga / persistencia ---------- */
  /* Rangos documentados en el SPEC (contract PM.settings). Un valor
   * corrupto/editado a mano en localStorage se corrige aquí para que
   * nunca llegue crudo a Game.newGame() ni al <input type="color">. */
  var NUM_RANGES = {
    ghostSpeedMult: { min: 0.5, max: 1.2, int: false },
    pacSpeedMult:   { min: 0.8, max: 1.3, int: false },
    frightMult:     { min: 0,   max: 2,   int: false },
    startLives:     { min: 1,   max: 5,   int: true },
    startLevel:     { min: 1,   max: 21,  int: true },
    volMaster:      { min: 0,   max: 1,   int: false },
    volMusic:       { min: 0,   max: 1,   int: false },
    volSfx:         { min: 0,   max: 1,   int: false },
    volLoops:       { min: 0,   max: 1,   int: false },
    volVoices:      { min: 0,   max: 1,   int: false }
  };
  var PRESET_NAMES = ['facil', 'normal', 'dificil', 'custom'];
  var LIVES_MODES = ['shared', 'individual'];

  /* Los cinco ajustes que forman una dificultad. El orden da igual; lo que
   * importa es que estén TODOS: si se añade uno a CFG.PRESETS hay que meterlo
   * aquí, o dos dificultades distintas pasarían por la misma. */
  var PRESET_KEYS = ['ghostSpeedMult', 'pacSpeedMult', 'frightMult',
    'startLives', 'startLevel'];

  /* ---------- Qué dificultad es esta, MIRANDO LOS VALORES ----------
   * La etiqueta ('facil' | 'normal' | 'dificil' | 'custom') NO se guarda: se
   * deduce. Guardarla aparte fue un error con consecuencias reales: era un
   * rótulo que nadie comprobaba contra los números, así que en cuanto los dos
   * se separaban —unos ajustes guardados sin etiqueta, una etiqueta que no
   * existe, un localStorage tocado a mano— el panel decía NORMAL mientras la
   * partida empezaba con cinco vidas. Y el jugador no tiene forma de
   * sospecharlo: lo que ve dice NORMAL.
   *
   * Deduciéndola, el panel no puede mentir, y a quien ya la tuviera
   * descuadrada se le arregla sola al cargar. */
  function presetDe(s) {
    for (var i = 0; i < PRESET_NAMES.length; i++) {
      var nombre = PRESET_NAMES[i];
      var p = CFG.PRESETS[nombre];
      if (!p) continue;                      // 'custom' no tiene tabla
      var igual = true;
      for (var k = 0; k < PRESET_KEYS.length; k++) {
        var key = PRESET_KEYS[k];
        // los multiplicadores son decimales: se comparan con holgura
        if (Math.abs((s[key] || 0) - p[key]) > 0.001) { igual = false; break; }
      }
      if (igual) return nombre;
    }
    return 'custom';
  }

  /* Nombres: mayúsculas, sin acentos raros ni caracteres de control, y
   * recortados a CFG.NICK_MAX para que quepan en el marcador. */
  function filterNick(value) {
    return String(value == null ? '' : value)
      .toUpperCase()
      .replace(/[^A-Z0-9 ._-]/g, '')
      .slice(0, CFG.NICK_MAX);
  }

  function sanitizeNick(value) {
    return filterNick(value).replace(/ +/g, ' ').replace(/^ +| +$/g, '');
  }

  function sanitizeSetting(key, value, def) {
    if (key === 'nick1' || key === 'nick2') return sanitizeNick(value);
    if (NUM_RANGES.hasOwnProperty(key)) {
      var r = NUM_RANGES[key];
      var n = r.int ? parseInt(value, 10) : parseFloat(value);
      if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return def;
      if (n < r.min) n = r.min;
      if (n > r.max) n = r.max;
      return n;
    }
    if (key === 'pacColor' || key === 'pac2Color') {
      return (/^#[0-9a-f]{6}$/i).test(String(value)) ? String(value) : def;
    }
    if (key === 'muted') return !!value;
    if (key === 'difficultyPreset') {
      return PRESET_NAMES.indexOf(value) !== -1 ? value : def;
    }
    if (key === 'livesMode') {
      return LIVES_MODES.indexOf(value) !== -1 ? value : def;
    }
    if (key === 'modePick') {
      return CFG.MODE_IDS.indexOf(value) !== -1 ? value : def;
    }
    if (key === 'habRol1' || key === 'habRol2') {
      return CFG.HAB.ROL_IDS.indexOf(value) !== -1 ? value : def;
    }
    if (key === 'vsGhost2') {
      var g = parseInt(value, 10);
      return (g >= 0 && g < 4) ? g : -1;
    }
    if (key === 'skin1' || key === 'skin2') {
      return CFG.SKIN_IDS.indexOf(value) !== -1 ? value : def;
    }
    if (key === 'avatar') {
      return CFG.AVATAR_IDS.indexOf(value) !== -1 ? value : def;
    }
    /* lo puesto de la TIENDA: aquí solo se mira que exista; que sea tuyo lo
     * mira PM.Tienda al usarlo */
    if (key === 'acc1') return (value === '' || CFG.ACCESORIO_IDS.indexOf(value) !== -1) ? value : def;
    if (key === 'efx1') return (value === '' || CFG.EFECTO_IDS.indexOf(value) !== -1) ? value : def;
    if (key === 'emotes1') {
      var caras = String(value == null ? '' : value).split(',').slice(0, CFG.TIENDA.EMOTE_TECLAS);
      for (var ci = 0; ci < caras.length; ci++) {
        if (CFG.EMOTE_IDS.indexOf(caras[ci]) === -1) return def;
      }
      return caras.length === CFG.TIENDA.EMOTE_TECLAS ? caras.join(',') : def;
    }
    return def;
  }

  /* Monedas con el punto de miles también en 1.500 (toLocaleString no lo
   * pone con cuatro cifras) */
  function fmtMonedas(n) {
    return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /* Nombre de invitado al azar: dos trozos pegados, recortado a lo que
   * cabe en el marcador. Se usa desde PERFIL. */
  function randomNick() {
    var R = CFG.RANDOM_NAMES;
    var a = R.a[Math.floor(Math.random() * R.a.length)];
    var b = R.b[Math.floor(Math.random() * R.b.length)];
    return (a + b).slice(0, CFG.NICK_MAX);
  }

  function loadSettings() {
    var s = {};
    var def = CFG.DEFAULT_SETTINGS;
    for (var k in def) if (def.hasOwnProperty(k)) s[k] = def[k];
    try {
      var raw = localStorage.getItem(CFG.SETTINGS_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        for (var k2 in def) {
          if (def.hasOwnProperty(k2) && saved && saved.hasOwnProperty(k2)) {
            s[k2] = sanitizeSetting(k2, saved[k2], def[k2]);
          }
        }
      }
    } catch (e) { /* sin almacenamiento o JSON corrupto */ }
    /* La etiqueta de dificultad se recalcula SIEMPRE de los valores, se
     * hubiera guardado o no. Es lo que impide que el panel diga NORMAL
     * teniendo otras vidas, y lo que arregla solo a quien ya la tuviera
     * descuadrada. */
    s.difficultyPreset = presetDe(s);
    return s;
  }

  function saveSettings() {
    try {
      localStorage.setItem(CFG.SETTINGS_KEY, JSON.stringify(window.PM.settings));
    } catch (e) { /* sin almacenamiento */ }
    // con party abierta, el nombre, el color y la skin nuevos se reparten ya
    if (window.PM.Party && window.PM.Party.refreshMe) window.PM.Party.refreshMe();
  }

  window.PM.settings = loadSettings();

  /* Subconjunto de ajustes que el anfitrión impone en una partida online */
  var NET_CFG_KEYS = ['ghostSpeedMult', 'pacSpeedMult', 'frightMult',
    'startLives', 'startLevel', 'livesMode'];

  /* ---------- Los modos de la portada ----------
   * Antes cada modo estaba en un sitio distinto: dos arrancaban desde su
   * botón, el reto abría un diálogo, los laberintos vivían escondidos entre
   * los paneles del cuartel y el online tenía su propio botón. No había
   * forma de ver de un vistazo a QUÉ se puede jugar.
   *
   * Ahora son seis tarjetas iguales y un solo botón de JUGAR. Cada una lleva:
   *   id     el que usa el resto del juego
   *   name   lo que se lee en la tarjeta
   *   tag    la coletilla corta de debajo (cuántos juegan)
   *   desc   la frase que sale al elegirlo
   *   color  el del modo (el mismo de sus logros, para que todo case)
   *   icon   cómo se dibuja su icono
   *   go     qué hace JUGAR: arrancar, o abrir lo que ese modo necesita
   *          elegir antes (qué laberinto, qué sala, si gastas el intento) */
  var MODOS = [
    { id: 'clasico', name: 'CLÁSICO', tag: '1 JUGADOR', color: '#ffff00',
      icon: 'pac',
      desc: 'EL ARCADE DE 1980, TAL CUAL. ES EL QUE CUENTA PARA EL TOP MUNDIAL' },
    { id: 'duo', name: 'DOS JUGADORES', tag: 'MISMO TECLADO', color: '#00ff00',
      icon: 'duo',
      desc: 'J1 CON LAS FLECHAS Y J2 CON WASD, A LA VEZ Y EN EL MISMO LABERINTO' },
    { id: 'hab', name: 'DESATADO', tag: '1 O 2 JUGADORES', color: '#ff66cc',
      icon: 'dientes',
      desc: 'CUATRO PODERES CON SU RECARGA. SOLO, EN PAREJA O EN PARTY' },
    { id: 'caza', name: 'CACERÍA', tag: 'DE 1 A 4 FANTASMAS', color: '#ffb8ff',
      icon: 'caza',
      desc: 'TODOS DE FANTASMA CONTRA UN PAC-MAN DE MÁQUINA QUE SE VUELVE PELIGROSO CADA POCO' },
    { id: 'lab', name: 'LABERINTOS', tag: 'OTROS TRAZADOS', color: '#ffb852',
      icon: 'maze',
      desc: 'OTROS LABERINTOS, LOS MISMOS FANTASMAS. ELIGE EN CUÁL JUGAR' },
    { id: 'online', name: 'ONLINE', tag: 'HASTA 4', color: '#7ec8ff',
      icon: 'party',
      desc: 'DE 2 A 4 JUGADORES CADA UNO EN SU CASA, CON CÓDIGO DE SALA' }
  ];

  function modoPorId(id) {
    for (var i = 0; i < MODOS.length; i++) {
      if (MODOS[i].id === id) return MODOS[i];
    }
    return MODOS[0];
  }

  /* Skins cuya gracia es la estela: su miniatura la lleva */
  var CON_ESTELA = { sombra: 1, cometa: 1, rastro: 1, escuadra: 1 };

  var UI = {
    els: {},
    audioResumed: false,
    touchDevice: false,
    promptOpen: false,  // hay un diálogo (rendición / revancha / game over) abierto
    nickInputs: {},     // ajuste -> campos de texto (portada y opciones)
    lobby: null,        // { mode:'host'|'join', code, locked, peerColor, peerName,
                        //   hostCfg, hostColor, hostName, timer }

    /* Guardar ajustes desde fuera de este módulo (lo usa la cuenta al
     * traerse el nombre y el avatar de la nube) */
    saveSettings: saveSettings,

    init: function () {
      this.touchDevice = ('ontouchstart' in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      this.els.menu = document.getElementById('menu');
      this.els.options = document.getElementById('options');
      this.els.online = document.getElementById('online');
      this.els.badges = document.getElementById('badges');
      this.els.ranking = document.getElementById('ranking');
      this.els.mazes = document.getElementById('mazes');
      this.els.friends = document.getElementById('friends');
      this.els.profile = document.getElementById('profile');
      this.els.daily = document.getElementById('daily');
      this.els.mate = document.getElementById('mate');
      this.els.prompt = document.getElementById('prompt');
      if (window.PM.Badges) window.PM.Badges.syncSeen();
      if (window.PM.Achievements) window.PM.Achievements.syncSeen();
      // las skins que ya estaban abiertas al llegar no se anuncian como nuevas
      if (window.PM.Skins) window.PM.Skins.syncVistas();
      this.els.vestuario = document.getElementById('vestuario');
      this.els.tienda = document.getElementById('tienda');
      this.buildMenu();
      this.buildOptions();
      this.buildOnline();
      this.buildBadges();
      this.buildRanking();
      this.buildMazes();
      this.buildFriends();
      this.buildProfile();
      this.buildDaily();
      this.buildMate();
      this.buildVestuario();
      this.buildTienda();
      this.refreshPerfilLook();
      this.accountHooks();
      this.buildGameButtons();
      this.buildDpads();
      this.bindKeyboard();
      this.bindTouch();
      this.applyMute();
      this.fitCanvas();
      var self = this;
      window.addEventListener('resize', function () { self.fitCanvas(); });
      this.showMenu();

      this.partyHooks();

      /* enlace compartido ?rep=<texto>: abre directo la repetición (y si
       * viene rota, avisa y el juego sigue como si nada) */
      if (window.PM.Replay && window.PM.Replay.desdeUrl()) return;

      /* enlace compartido ?sala=CODE: entrar directo a la party */
      var rc = window.PM.Net && window.PM.Net.roomFromUrl();
      if (rc) {
        this.showOnline();
        if (window.PM.Net.configured()) {
          this.codeInput.value = rc;
          this.partyJoin(rc);
        }
      }
    },

    /* ------------------------------------------------------
     * Escalado nítido: ajusta el tamaño CSS del canvas al mayor
     * múltiplo de 0.5 de la resolución nativa (224x288) que quepa
     * en el 96% del viewport, para que cada píxel del juego ocupe
     * un número uniforme de píxeles CSS (píxeles nítidos y parejos).
     * Si ni siquiera cabe a x1, se usa el ajuste exacto como último
     * recurso (pantallas minúsculas).
     * ------------------------------------------------------ */
    fitCanvas: function () {
      var canvas = document.getElementById('game');
      if (!canvas) return;
      /* La barra de poderes va pegada BAJO el lienzo y en el flujo, así que su
       * altura se le descuenta al alto disponible; si no, el conjunto se
       * saldría por abajo justo en el modo donde hay que mirarla. Solo cuando
       * está encendida y en su sitio (en táctil flota, y entonces no ocupa). */
      var alto = window.innerHeight * 0.96;
      if (this.habBar && this.habBar.classList.contains('on') &&
          !this.habBar.classList.contains('fija')) {
        alto -= this.habBar.offsetHeight + 6;
      }
      var s = Math.min(window.innerWidth * 0.96 / CFG.NATIVE_W,
                       alto / CFG.NATIVE_H);
      if (s >= 1) s = Math.floor(s * 2) / 2;   // saltos de 0.5 (x2.5, x3, ...)
      if (s <= 0) s = 0.5;                     // pantalla imposible: algo hay que pintar
      canvas.style.width = Math.floor(CFG.NATIVE_W * s) + 'px';
      canvas.style.height = Math.floor(CFG.NATIVE_H * s) + 'px';
    },

    /* ------------------------------------------------------
     * Menú principal
     * ------------------------------------------------------ */
    buildMenu: function () {
      var self = this;
      var m = this.els.menu;
      m.innerHTML = '';

      /* LA MARQUESINA (17 sep 2026): la portada es el frontal encendido de
       * la recreativa. Arriba el marcador (tu récord, el HIGH SCORE mundial y
       * el nº 1 del mes), el logo latiendo con los fantasmas corriendo por
       * debajo; en medio, tu ficha a la izquierda, los modos y JUGAR en el
       * centro y el cuartel a la derecha con un Pac-Man de cursor; abajo, la
       * cinta con lo que pasa en el TOP MUNDIAL. Todo va dentro de .marq,
       * que en pantalla ancha es una rejilla y en estrecha se apila.
       *
       * El orden del DOM manda en la navegación con flechas: tu nombre, luego
       * los modos y JUGAR, y al final el cuartel. Los controles y EL REPARTO
       * se fueron a OPCIONES · CONTROLES. */
      var marq = document.createElement('div');
      marq.className = 'marq';
      m.appendChild(marq);

      var bombillas = document.createElement('div');
      bombillas.className = 'marq-bombillas';
      bombillas.setAttribute('aria-hidden', 'true');
      marq.appendChild(bombillas);

      /* el marcador de la máquina */
      var hud = document.createElement('div');
      hud.className = 'marq-hud';
      var celda = function (clase, rotulo) {
        var c = document.createElement('div');
        c.className = 'marq-hud-celda ' + clase;
        var k = document.createElement('span');
        k.className = 'marq-hud-k';
        k.textContent = rotulo;
        c.appendChild(k);
        var v = document.createElement('b');
        v.textContent = '---';
        c.appendChild(v);
        hud.appendChild(c);
        return { k: k, v: v };
      };
      this.marqHud = {
        yo: celda('izq', '1UP'),
        high: celda('centro', 'HIGH SCORE'),
        mes: celda('der', 'Nº 1 DEL MES')
      };
      this.marqHud.yo.k.classList.add('parpadeo');
      marq.appendChild(hud);

      var head = document.createElement('div');
      head.className = 'menu-head';
      marq.appendChild(head);

      var player = document.createElement('div');
      player.className = 'menu-player';
      marq.appendChild(player);

      var main = document.createElement('div');
      main.className = 'menu-main';
      marq.appendChild(main);

      var side = document.createElement('div');
      side.className = 'menu-side';
      marq.appendChild(side);

      var title = document.createElement('div');
      title.className = 'title';
      title.textContent = 'PAC-MAN';
      head.appendChild(title);

      var sub = document.createElement('div');
      sub.className = 'subtitle';
      sub.textContent = 'TOP MUNDIAL';
      head.appendChild(sub);

      /* los fantasmas corriendo bajo el logo, como en la demo de la máquina */
      this.marqCaza = document.createElement('canvas');
      this.marqCaza.className = 'marq-caza';
      this.marqCaza.width = 1200;
      this.marqCaza.height = 48;
      this.marqCaza.setAttribute('aria-hidden', 'true');
      head.appendChild(this.marqCaza);

      /* ===== tu ficha: nombre con tu aspecto, nivel, daily, continuar ===== */
      /* la cabecera de la ficha lleva tus monedas a la derecha, sueltas,
       * como los créditos de la máquina: pulsarlas lleva a la tienda */
      var fichaCab = document.createElement('div');
      fichaCab.className = 'marq-ficha-cab';
      fichaCab.appendChild(this.sectionTitle('TU FICHA'));
      this.marqMonedas = document.createElement('button');
      this.marqMonedas.type = 'button';
      this.marqMonedas.className = 'marq-monedas';
      this.marqMonedas.setAttribute('aria-label', 'Tus monedas: abrir la tienda');
      this.marqMonedas.addEventListener('click', function () {
        self.resumeAudio();
        self.showTienda();
      });
      fichaCab.appendChild(this.marqMonedas);
      player.appendChild(fichaCab);

      /* nombre en la portada, estilo arcade moderno: se escribe y a jugar */
      player.appendChild(this.makeNickRow('nick1', 'TU NOMBRE', 'menu'));

      /* nivel de jugador con su barra de progreso */
      var lvl = document.createElement('div');
      lvl.className = 'level-box';
      this.levelLabel = document.createElement('div');
      this.levelLabel.className = 'level-label';
      lvl.appendChild(this.levelLabel);
      var bar = document.createElement('div');
      bar.className = 'level-bar';
      this.levelFill = document.createElement('div');
      this.levelFill.className = 'level-fill';
      bar.appendChild(this.levelFill);
      lvl.appendChild(bar);
      player.appendChild(lvl);

      /* EL RETO DE HOY: se lee ANTES de elegir modo —igual te decides por
       * DESATADO porque el reto de hoy es de ahí— y se pulsa para ver la
       * semana entera. */
      player.appendChild(this.buildDailyBox());

      /* CONTINUAR: la partida que se dejó a medias (js/guardado.js). Si no
       * hay ninguna, el bloque entero no existe. */
      player.appendChild(this.buildContinuarBox());

      /* ===== el centro: modos en carrusel y JUGAR ===== */
      main.appendChild(this.sectionTitle('ELIGE MODO'));
      main.appendChild(this.buildModeGrid());

      /* Lo que hace ese modo, y su recado si tiene (la gente que hay en tu
       * party...). Debajo del carrusel y encima del botón, que es por donde
       * pasa la mirada camino de JUGAR. */
      this.modeDesc = document.createElement('div');
      this.modeDesc.className = 'mode-desc';
      main.appendChild(this.modeDesc);

      this.modeNote = document.createElement('div');
      this.modeNote.className = 'mode-note';
      main.appendChild(this.modeNote);

      var play = this.makeButton('JUGAR', function () {
        self.playPick();
      });
      play.classList.add('btn-primary', 'btn-play');
      main.appendChild(play);
      this.playBtn = play;

      /* ===== el cuartel, como menú de recreativa ===== */
      side.appendChild(this.sectionTitle('TU CUARTEL'));
      var extras = document.createElement('div');
      extras.className = 'menu-extras';
      extras.appendChild(this.makeButton('TOP MUNDIAL', function () {
        self.resumeAudio();
        self.showRanking();
      }));
      extras.appendChild(this.makeButton('PERFIL', function () {
        self.resumeAudio();
        self.showProfile();
      }));
      /* VESTUARIO: todo lo que llevas puesto, en un solo sitio */
      this.menuVestBtn = this.makeButton('VESTUARIO', function () {
        self.resumeAudio();
        self.showVestuario('skin', 'yo');
      });
      extras.appendChild(this.menuVestBtn);
      this.menuTiendaBtn = this.makeButton('TIENDA', function () {
        self.resumeAudio();
        self.showTienda();
      });
      extras.appendChild(this.menuTiendaBtn);
      extras.appendChild(this.makeButton('MAESTRÍAS', function () {
        self.resumeAudio();
        self.showBadges();
      }));
      extras.appendChild(this.makeButton('AMIGOS', function () {
        self.resumeAudio();
        self.showFriends();
      }));
      extras.appendChild(this.makeButton('OPCIONES', function () {
        self.resumeAudio();
        self.showOptions();
      }));
      for (var e = 0; e < extras.childNodes.length; e++) {
        extras.childNodes[e].classList.add('btn-preset');
      }

      /* el Pac-Man que hace de cursor: va a la opción que señalas */
      this.marqCursor = document.createElement('canvas');
      this.marqCursor.className = 'marq-cursor';
      this.marqCursor.width = 48;
      this.marqCursor.height = 48;
      this.marqCursor.setAttribute('aria-hidden', 'true');
      extras.appendChild(this.marqCursor);
      var apunta = function (ev) {
        var b = ev.currentTarget;
        if (self.marqCursor && b.offsetParent) {
          self.marqCursor.style.top = (b.offsetTop + b.offsetHeight / 2 - self.marqCursor.offsetHeight / 2) + 'px';
          self.marqCursor.style.opacity = '1';
        }
      };
      for (var e2 = 0; e2 < extras.childNodes.length; e2++) {
        var eb = extras.childNodes[e2];
        if (eb === this.marqCursor || !eb.addEventListener) continue;
        eb.addEventListener('mouseenter', apunta);
        eb.addEventListener('focus', apunta);
      }
      side.appendChild(extras);

      /* la cinta de noticias del TOP MUNDIAL */
      var cinta = document.createElement('div');
      cinta.className = 'marq-cinta';
      cinta.setAttribute('aria-hidden', 'true');
      this.marqCintaTxt = document.createElement('div');
      this.marqCintaTxt.className = 'marq-cinta-txt';
      cinta.appendChild(this.marqCintaTxt);
      marq.appendChild(cinta);
    },

    /* ------------------------------------------------------
     * LA MARQUESINA: marcador, monedas y cinta de noticias
     * ------------------------------------------------------ */
    refreshMarquesina: function () {
      var self = this, G = window.PM.Game, Tn = window.PM.Tienda;
      if (!this.marqHud) return;
      var mil = function (n) {
        return String(Math.max(0, Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      };
      this.marqHud.yo.v.textContent = mil(G ? G.highScore1 : 0);
      if (this.marqMonedas) {
        this.marqMonedas.innerHTML = '';
        this.marqMonedas.appendChild(this.monedaEl());
        var b = document.createElement('b');
        b.textContent = fmtMonedas(Tn ? Tn.saldo() : 0);
        this.marqMonedas.appendChild(b);
      }
      this.pintarCinta();

      /* lo de la red, como mucho una vez por minuto */
      var R = window.PM.Ranking, S = window.PM.Season;
      if (window.PM_PRUEBAS || !R || !R.configured()) return;
      var ahora = Date.now();
      if (this.marqPedido && ahora - this.marqPedido < 60000) return;
      this.marqPedido = ahora;
      R.top(1, function (err, filas) {
        if (err || !filas) return;
        self.marqTop = filas;
        if (filas[0]) self.marqHud.high.v.textContent = mil(filas[0].puntos);
        self.pintarCinta();
      }, 'clasico');
      if (S && S.configured()) {
        S.top(S.actual(), 1, function (err, filas) {
          if (err || !filas) return;
          self.marqMes = filas;
          self.marqHud.mes.v.textContent = filas[0] ? R.nombresDe(filas[0]).join(' + ') : 'VACANTE';
          self.pintarCinta();
        }, 'clasico');
      }
    },

    /* La cinta: el podio de siempre, quién manda este mes, el reto de hoy y
     * lo que falta para que acabe la temporada. */
    pintarCinta: function () {
      var el = this.marqCintaTxt;
      if (!el) return;
      var R = window.PM.Ranking, D = window.PM.Daily;
      var mil = function (n) {
        return String(Math.max(0, Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      };
      var grupos = [];      // cada noticia: [[etiqueta, texto], ...]
      var puestos = ['VA PRIMERO', 'VA SEGUNDO', 'VA TERCERO'];
      (this.marqTop || []).slice(0, 3).forEach(function (f, i) {
        grupos.push([['b', R.nombresDe(f).join(' + ')], ['span', ' ' + puestos[i] + ' CON ' + mil(f.puntos)]]);
      });
      if (this.marqMes && this.marqMes[0]) {
        grupos.push([['i', 'ESTE MES MANDA '], ['b', R.nombresDe(this.marqMes[0]).join(' + ')]]);
      }
      var hoy = D && D.hoy ? D.hoy() : null;
      if (hoy && hoy.desc) grupos.push([['i', 'RETO DE HOY: '], ['span', hoy.desc]]);
      var d = new Date();
      var finMes = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
      var dias = Math.max(0, Math.ceil((finMes - d.getTime()) / 86400000));
      grupos.push([['i', 'FIN DE TEMPORADA EN ' + dias + (dias === 1 ? ' DÍA' : ' DÍAS')]]);
      el.innerHTML = '';
      grupos.forEach(function (g, i) {
        if (i) {
          var s = document.createElement('span');
          s.className = 'marq-sep';
          s.textContent = ' · ';
          el.appendChild(s);
        }
        g.forEach(function (t) {
          var n = document.createElement(t[0]);
          n.textContent = t[1];
          el.appendChild(n);
        });
      });
    },

    /* Los pósters del carrusel: el de la tarjeta elegida y los dos vecinos.
     * Los que cambian de color tiñen su tarjeta entera. */
    pintarPortadas: function (t) {
      var Po = window.PM.Portadas;
      if (!Po || !this.modeCards) return;
      var card = this.modeCards[this.modePick];
      if (card && card.cv && card.b.offsetParent) {
        Po.pintar(card.cv, card.mo.id, t, card.estado);
        var col = Po.color(card.mo.id, card.estado);
        if (card.pintado !== col) {
          card.pintado = col;
          card.b.style.setProperty('--mc', col);
          var dot = this.modeDots && this.modeDots[card.mo.id];
          if (dot) { dot.style.background = col; dot.style.borderColor = col; }
        }
      }
      [this.modePeekPrev, this.modePeekNext].forEach(function (pk) {
        if (!pk || !pk.id || !pk.b.offsetParent) return;
        Po.pintar(pk.cv, pk.id, t + 1.3, pk.estado);
        var c2 = Po.color(pk.id, pk.estado);
        if (pk.pintado !== c2) { pk.pintado = c2; pk.b.style.setProperty('--mc', c2); }
      });
    },

    /* Los pósteres de la sala online: el elegido a su ritmo y los demás
     * apagados, pero vivos (es lo que los hace parecer una cartelera). */
    pintarCartelera: function (t) {
      var Po = window.PM.Portadas;
      if (!Po || !this.olPosters) return;
      var modo = this.partyModo(window.PM.Party);
      for (var id in this.olPosters) {
        if (!this.olPosters.hasOwnProperty(id)) continue;
        var p = this.olPosters[id];
        if (!p.cv || !p.b.offsetParent) continue;
        var art = (p.mo && p.mo.poster) || id;
        Po.pintar(p.cv, art, (id === modo) ? t : t * 0.45 + 2.7, p.estado || (p.estado = {}));
      }
      void modo;
    },

    /* La cartelera se mueve mientras la sala está a la vista, y nada más
     * (el bucle de la portada no corre con el panel abierto). */
    animarCartelera: function () {
      var self = this, raf = window.requestAnimationFrame;
      if (!raf || this.carteleraAnim) return;
      this.carteleraAnim = true;
      var origen = Date.now();
      function paso() {
        var o = self.els.online;
        if (!o || o.style.display === 'none' || !self.onlineRoom ||
            self.onlineRoom.style.display === 'none') {
          self.carteleraAnim = false;
          return;
        }
        self.pintarCartelera((Date.now() - origen) / 1000);
        raf(paso);
      }
      raf(paso);
    },

    /* Los fantasmas corriendo bajo el logo y el cursor del cuartel.
     * t: segundos. */
    pintarMarquesina: function (t) {
      var Sp = window.PM.Sprites;
      if (!Sp) return;
      var boca = [0, 1, 2, 1][Math.floor(t * 14) % 4];
      var cv = this.marqCaza;
      if (cv && cv.offsetParent) {
        /* El lienzo se estira a lo ancho de la portada con una altura tope:
         * si su ancho interno no sigue la proporción de la caja, los dibujos
         * salen aplastados (se veía en pantalla completa). Se ajusta para que
         * cada píxel sea cuadrado con 48 de alto. */
        if (cv.clientWidth && cv.clientHeight) {
          var anchoOk = Math.round(cv.clientWidth * 48 / cv.clientHeight);
          if (Math.abs(cv.width - anchoOk) > 2) { cv.width = anchoOk; cv.height = 48; }
        }
        var c = cv.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, cv.width, cv.height);
        c.imageSmoothingEnabled = false;
        var S = 3, W = cv.width / S, y = 8;
        c.setTransform(S, 0, 0, S, 0, 0);
        var ciclo = t % 16, p = (ciclo % 8) / 8;
        try {
          if (ciclo < 8) {
            /* ida: los fantasmas persiguen a Pac-Man comiéndose las pastillas */
            var px = -40 + p * (W + 140);
            c.fillStyle = CFG.COLORS.pellet;
            for (var x = 12; x < W; x += 8) if (x > px + 5) c.fillRect(x - 1, y - 1, 2, 2);
            for (var g = 0; g < 4; g++) Sp.drawGhost(c, px - 26 - g * 16, y, 3, g, 'chase', Math.floor(t * 8) % 2, false);
            Sp.drawPacman(c, px, y, 3, boca, '#ffff00', 'clasico', {});
          } else {
            /* vuelta: se han comido la pastilla de poder y huyen */
            var qx = W + 40 - p * (W + 180);
            for (var g2 = 0; g2 < 4; g2++) {
              Sp.drawGhost(c, qx + 30 + g2 * 16, y, 1, g2, 'fright', Math.floor(t * 8) % 2,
                p > 0.7 && Math.floor(t * 6) % 2 === 0);
            }
            Sp.drawPacman(c, qx, y, 1, boca, '#ffff00', 'clasico', {});
          }
        } catch (e) { /* un dibujo raro no rompe la portada */ }
        c.setTransform(1, 0, 0, 1, 0, 0);
      }
      var cu = this.marqCursor;
      if (cu && cu.offsetParent) {
        var cc = cu.getContext('2d');
        cc.setTransform(1, 0, 0, 1, 0, 0);
        cc.clearRect(0, 0, cu.width, cu.height);
        cc.imageSmoothingEnabled = false;
        cc.setTransform(cu.width / 20, 0, 0, cu.width / 20, 0, 0);
        try { Sp.drawPacman(cc, 10, 10, 3, [0, 1, 2, 1][Math.floor(t * 10) % 4], '#ffff00', 'clasico', {}); } catch (e) { }
        cc.setTransform(1, 0, 0, 1, 0, 0);
      }
    },

    /* ------------------------------------------------------
     * DAILY: LA CARTILLA
     *
     * La semana es una cartilla de siete casillas con un fantasma por día.
     * Cumplir el reto es CAZARLO: se pone azul, como cuando te comes un
     * energizante, y le cae el sello. Debajo va el botín de la semana, que es
     * lo que hace que valga la pena volver mañana y no solo jugar hoy.
     *
     * Antes era una línea de texto gris en la portada y siete filas iguales
     * en dos columnas por dentro: no se veía ni lo que se ganaba ni cuánto
     * quedaba, y lo que venía estaba tan apagado que no daba ganas.
     *
     * El recuadro va en la portada y NO en el cuartel a propósito: el reto es
     * lo que hace volver mañana, y algo que hay que ir a buscar a un panel
     * deja de existir. Aquí lo lees de camino a JUGAR, sin buscarlo.
     * ------------------------------------------------------ */

    /* Cómo está la casilla del día i: 'hecho' (cazado), 'hoy' (el que se
     * puede cumplir), 'perdido' (pasó sin cumplirse) o 'futuro' */
    dailyEstado: function (D, est, i) {
      if (est.h[i]) return 'hecho';
      if (i === D.diaSemana()) return 'hoy';
      return (i < D.diaSemana()) ? 'perdido' : 'futuro';
    },

    /* El fantasma de cada día: los cuatro de siempre, en su orden (BLINKY el
     * lunes, PINKY el martes...). Dibujado con Sprites.drawGhost, el mismo de
     * la partida. Cazado va azul; lo que aún no se ha abierto, en silueta; lo
     * perdido, en gris. */
    dailyColor: function (i) { return CFG.GHOSTS[i % CFG.GHOSTS.length].color; },

    pintarFantasmaDaily: function (cv, i, estado) {
      var S = window.PM.Sprites;
      var c = cv.getContext('2d');
      if (!c || !S) return;
      c.clearRect(0, 0, cv.width, cv.height);
      c.save();
      c.translate(cv.width / 2, cv.height / 2 + cv.height / 32);
      var k = cv.width / 16;
      c.scale(k, k);
      S.drawGhost(c, 0, 0, CFG.DIR.RIGHT, i % CFG.GHOSTS.length,
        estado === 'hecho' ? 'fright' : 'normal', 0, false);
      c.restore();
      if (estado === 'futuro' || estado === 'perdido') {
        c.save();
        c.globalCompositeOperation = 'source-atop';
        c.fillStyle = estado === 'futuro' ? '#1f2046' : '#333';
        c.fillRect(0, 0, cv.width, cv.height);
        c.restore();
      }
    },

    /* Un color de la paleta con transparencia (para los brillos del de hoy) */
    dailyRgba: function (hex, a) {
      var n = parseInt(String(hex).slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' +
        (n & 255) + ',' + a + ')';
    },

    /* Lo que queda hasta la medianoche DE TU RELOJ (el DAILY va en hora local) */
    dailyQueda: function (conSegundos) {
      var n = new Date(), m = new Date(n.getTime());
      m.setHours(24, 0, 0, 0);
      var s = Math.max(0, Math.floor((m - n) / 1000));
      var dd = function (x) { return (x < 10 ? '0' : '') + x; };
      return dd(Math.floor(s / 3600)) + ':' + dd(Math.floor(s / 60) % 60) +
        (conSegundos ? ':' + dd(s % 60) : '');
    },

    /* ------------------------------------------------------
     * CONTINUAR LA PARTIDA A MEDIAS (js/guardado.js)
     * ------------------------------------------------------ */
    buildContinuarBox: function () {
      var self = this;
      var box = document.createElement('div');
      box.className = 'cont-box';
      box.style.display = 'none';

      var b = this.makeButton('CONTINUAR', function () {
        self.resumeAudio();
        self.continuarPartida();
      });
      /* sin `btn-primary`: el amarillo es el de JUGAR y este va en verde
       * (.btn-cont), que son dos caminos distintos */
      b.classList.add('btn-play', 'btn-cont');
      box.appendChild(b);

      this.contLine = document.createElement('div');
      this.contLine.className = 'cont-line';
      box.appendChild(this.contLine);

      /* Descartarla sin tener que empezar otra para quitársela de encima */
      var tirar = this.makeButton('DESCARTARLA', function () {
        self.resumeAudio();
        self.descartarPartida();
      });
      tirar.classList.add('btn-preset');
      box.appendChild(tirar);

      this.contBox = box;
      return box;
    },

    /* Se llama al volver al menú y cada vez que la partida guardada cambia
     * (al guardarla, al borrarla y cuando llega una de la nube). */
    refreshContinuar: function () {
      if (!this.contBox) return;
      var Gd = window.PM.Guardado;
      var s = Gd ? Gd.sobre() : null;
      this.contBox.style.display = s ? '' : 'none';
      if (s) {
        this.contLine.textContent = Gd.titulo(s) + '  ·  ' + Gd.cuando(s);
      }
    },

    descartarPartida: function () {
      var self = this;
      var Gd = window.PM.Guardado;
      if (!Gd || !Gd.hay()) return;
      this.showPrompt({
        title: '¿DESCARTAR?',
        color: '#ff8c00',
        lines: [Gd.titulo(), 'SE PIERDE ESA PARTIDA Y TODO LO QUE LLEVABA HECHO.'],
        buttons: [
          { label: 'SÍ, DESCARTARLA', hint: 'ENTER', keys: ['Enter'],
            onClick: function () {
              Gd.borrar();
              self.hidePrompt();
              self.refreshContinuar();
            } },
          { label: 'NO', primary: true, hint: 'ESC', keys: ['Escape'],
            onClick: function () { self.hidePrompt(); } }
        ]
      });
    },

    /* Retomarla: la partida se vuelve a jugar sola a toda velocidad hasta
     * donde se dejó. Tarda unos segundos y por eso lleva barra. */
    continuarPartida: function () {
      var self = this;
      var Gd = window.PM.Guardado;
      if (!Gd || !Gd.hay()) return;
      this.hideAll();
      this.avisoRecuperando(0);
      Gd.retomar(function (x) {
        self.avisoRecuperando(x);
      }, function (err) {
        /* Salió bien: la partida queda en pausa y quien manda en la pantalla
         * es su menú (ahí se dice de qué partida se trata). Ojo con esconder
         * el aviso a pelo: se llevaría por delante ese menú. */
        if (!err) { self.syncPrompt(); return; }
        self.hidePrompt();
        self.showMenu();
        if (err !== 'CANCELADA') self.avisoNoSePudo(err);
      });
    },

    avisoRecuperando: function (x) {
      var self = this;
      var Gd = window.PM.Guardado;
      this.showPrompt({
        title: 'RECUPERANDO TU PARTIDA',
        color: '#00ff00',
        lines: [
          Gd.titulo(),
          'SE ESTÁ VOLVIENDO A JUGAR A TODA VELOCIDAD HASTA DONDE LA DEJASTE.',
          { text: Math.round((x || 0) * 100) + ' %', big: true }
        ],
        buttons: [
          { label: 'CANCELAR', hint: 'ESC', keys: ['Escape'],
            onClick: function () { Gd.cancelar(); self.hidePrompt(); } }
        ]
      });
    },

    /* No ha salido la misma partida. Pasa si el juego cambió por dentro entre
     * el día que se guardó y hoy: la partida se rehace paso a paso, así que un
     * cambio en cómo se mueve un fantasma la descuadra. Se dice tal cual y se
     * deja decidir, que tirarla por cuenta propia sería peor. */
    avisoNoSePudo: function (err) {
      var self = this;
      var Gd = window.PM.Guardado;
      this.showPrompt({
        title: 'NO SE PUDO RECUPERAR',
        color: '#ff0000',
        lines: [
          Gd.titulo(),
          (err === 'ROTA')
            ? 'LO GUARDADO NO SE PUEDE LEER.'
            : 'AL REHACERLA NO HA SALIDO LA MISMA PARTIDA, ASÍ QUE NO SE PUEDE SEGUIR DONDE IBA.',
          'ESTO PASA CUANDO EL JUEGO HA CAMBIADO POR DENTRO DESDE QUE LA GUARDASTE.'
        ],
        buttons: [
          { label: 'DESCARTARLA', primary: true, hint: 'ENTER', keys: ['Enter'],
            onClick: function () {
              Gd.borrar();
              self.hidePrompt();
              self.refreshContinuar();
            } },
          { label: 'DEJARLA AHÍ', hint: 'ESC', keys: ['Escape'],
            onClick: function () { self.hidePrompt(); } }
        ]
      });
    },

    /* Empezar una partida nueva tira la que estuviera a medias, así que se
     * avisa ANTES. Devuelve true si se ha quedado preguntando. */
    avisaSiHayGuardada: function (sigue) {
      var self = this;
      var Gd = window.PM.Guardado;
      if (!Gd || !Gd.hay()) return false;
      var sb = Gd.sobre();
      this.showPrompt({
        title: 'PARTIDA A MEDIAS',
        arcade: true,
        tono: 'amarillo',
        /* la ficha de la guardada: de qué modo es, cómo iba y cuándo se dejó,
         * y el aviso de lo que pasa si se empieza otra */
        custom: function (p) {
          var ficha = document.createElement('div');
          ficha.className = 'medias-ficha';
          var modo = document.createElement('div');
          modo.className = 'medias-modo';
          modo.textContent = sb.maze ? 'LABERINTOS' : (Gd.NOMBRES[sb.modo] || 'PARTIDA');
          ficha.appendChild(modo);
          var datos = document.createElement('div');
          datos.className = 'medias-datos';
          [['PUNTOS', Gd.miles(sb.p)], ['NIVEL', String(sb.lv)],
           ['GUARDADA', Gd.cuando(sb)]].forEach(function (d) {
            var c = document.createElement('div');
            c.className = 'medias-dato';
            var v = document.createElement('b');
            v.textContent = d[1];
            var k = document.createElement('small');
            k.textContent = d[0];
            c.appendChild(v);
            c.appendChild(k);
            datos.appendChild(c);
          });
          ficha.appendChild(datos);
          p.appendChild(ficha);
          var aviso = document.createElement('div');
          aviso.className = 'medias-aviso';
          aviso.textContent = 'SI EMPIEZAS UNA NUEVA, ESTA SE PIERDE';
          p.appendChild(aviso);
        },
        buttons: [
          { label: 'SEGUIR LA DE ANTES', primary: true, hint: 'ENTER',
            keys: ['Enter'],
            onClick: function () { self.hidePrompt(); self.continuarPartida(); } },
          { label: 'EMPEZAR UNA NUEVA', hint: 'N', keys: ['n'],
            onClick: function () {
              Gd.borrar();
              self.hidePrompt();
              self.refreshContinuar();
              sigue();
            } },
          { label: 'VOLVER', hint: 'ESC', keys: ['Escape'],
            onClick: function () { self.hidePrompt(); } }
        ]
      });
      return true;
    },

    buildDailyBox: function () {
      var self = this;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'daily-box';
      b.addEventListener('click', function () {
        self.resumeAudio();
        self.showDaily();
      });

      /* El título, estilo póster. En la portada solo va esto y la semana: el
       * reto, el progreso y el premio se leen dentro de la cartilla. */
      var titulo = document.createElement('span');
      titulo.className = 'daily-titulo';
      titulo.textContent = 'DAILY';
      b.appendChild(titulo);

      /* Al señalarlo, en vez de un recuadro, una línea que recorre su borde */
      this.ponRonda(b, 'daily-ronda');

      /* las siete casillas en pequeño */
      var fila = document.createElement('div');
      fila.className = 'daily-tiles';
      this.dailyTiles = [];
      for (var i = 0; i < CFG.DAILY.DIAS; i++) {
        var t = document.createElement('div');
        t.className = 'daily-tile';
        var cv = document.createElement('canvas');
        cv.width = 40; cv.height = 40;
        t.appendChild(cv);
        var lb = document.createElement('span');
        lb.textContent = CFG.DAILY.DIA_CORTO[i];
        t.appendChild(lb);
        var tick = document.createElement('span');
        tick.className = 'daily-tick';
        tick.textContent = '✓';
        t.appendChild(tick);
        fila.appendChild(t);
        this.dailyTiles.push({ el: t, cv: cv, estado: '' });
      }
      b.appendChild(fila);

      this.dailyDesc = document.createElement('div');
      this.dailyDesc.className = 'daily-desc';
      b.appendChild(this.dailyDesc);

      var pie = document.createElement('div');
      pie.className = 'daily-foot';
      var barra = document.createElement('span');
      barra.className = 'daily-bar';
      this.dailyFill = document.createElement('span');
      this.dailyFill.className = 'daily-fill';
      barra.appendChild(this.dailyFill);
      pie.appendChild(barra);
      this.dailyVal = document.createElement('span');
      this.dailyVal.className = 'daily-val';
      pie.appendChild(this.dailyVal);
      var mon = document.createElement('span');
      mon.className = 'daily-coin';
      var mcv = document.createElement('canvas');
      mcv.width = 24; mcv.height = 24;
      this.pintarMoneda(mcv);
      mon.appendChild(mcv);
      mon.appendChild(document.createTextNode('+' + CFG.TIENDA.POR_RETO));
      pie.appendChild(mon);
      this.dailyClock = document.createElement('span');
      this.dailyClock.className = 'daily-clock';
      pie.appendChild(this.dailyClock);
      b.appendChild(pie);

      this.dailyBox = b;

      /* La cuenta atrás corre sola mientras se ve la portada, y si el reloj
       * pasa la medianoche con el juego abierto, la cartilla cambia de día
       * sin tener que salir y volver a entrar. */
      if (!this.dailyTimer) {
        this.dailyTimer = setInterval(function () {
          if (!self.dailyBox || !self.dailyBox.offsetParent) return;
          var D = window.PM.Daily;
          if (D && D.hoyISO() !== self.dailyDia) self.refreshDaily();
          else self.tickDaily();
        }, 1000);
      }
      return b;
    },

    tickDaily: function () {
      if (!this.dailyClock) return;
      this.dailyClock.textContent = (this.dailyHecho ? 'NUEVO EN ' : 'CIERRA ') +
        this.dailyQueda(false);
    },

    /* Cómo se lee el progreso de un reto. Los de tiempo van en mm:ss.cc y
     * al revés (menos es mejor), como en los logros. */
    dailyValor: function (r, v) {
      var R = window.PM.Ranking;
      if (r.fmt === 'tiempo') {
        var meta = (R && R.fmtTime) ? R.fmtTime(r.goal) : String(r.goal);
        return (v > 0 && R && R.fmtTime) ? (R.fmtTime(v) + ' / ' + meta)
                                         : ('— / ' + meta);
      }
      return v + ' / ' + r.goal;
    },

    /* El recuadro de la portada, al día */
    refreshDaily: function () {
      var D = window.PM.Daily;
      if (!this.dailyBox || !D) return;
      var est = D.leer();
      var hoy = D.diaSemana();
      var p = D.progreso(hoy, est);
      this.dailyDia = D.hoyISO();

      for (var i = 0; i < this.dailyTiles.length; i++) {
        var t = this.dailyTiles[i];
        var e = this.dailyEstado(D, est, i);
        t.el.className = 'daily-tile ' + e + (i === hoy ? ' es-hoy' : '');
        t.el.style.borderColor = (i === hoy && !est.h[i]) ? this.dailyColor(i) : '';
        t.el.style.color = (i === hoy && !est.h[i]) ? this.dailyColor(i) : '';
        t.el.style.background = (i === hoy && !est.h[i])
          ? this.dailyRgba(this.dailyColor(i), 0.1) : '';
        if (t.estado !== e) { this.pintarFantasmaDaily(t.cv, i, e); t.estado = e; }
      }

      var color = this.dailyColor(hoy);
      this.dailyBox.style.setProperty('--dc', color);
      if (!p) { this.dailyDesc.textContent = ''; return; }
      this.dailyHecho = p.hecho;

      if (p.hecho) {
        /* Cumplido: se queda el de HOY, marcado como cumplido. El de mañana
         * no se adelanta aquí (está en la cartilla, al pulsar). */
        this.dailyDesc.textContent = '✓ CUMPLIDO · ' + p.reto.desc;
        this.dailyDesc.style.color = '#00ff00';
        this.dailyVal.textContent = '+' + CFG.DAILY.XP + ' EXP';
        this.dailyVal.style.color = '#00ff00';
      } else {
        this.dailyDesc.textContent = p.reto.desc;
        this.dailyDesc.style.color = '';
        this.dailyVal.textContent = (p.reto.modo
          ? ('EN ' + this.dailyModoName(p.reto.modo) + ' · ') : '') +
          this.dailyValor(p.reto, p.valor);
        this.dailyVal.style.color = '';
      }
      this.dailyFill.style.width = Math.round(p.pct * 100) + '%';
      this.dailyFill.style.background = p.hecho ? '#00ff00' : color;
      this.tickDaily();
    },

    /* Nombre del modo de un reto, tal cual se enseña */
    dailyModoName: function (modo) {
      if (modo === 'solo') return 'SOLO';
      if (modo === 'party') return 'PARTY';
      var m = CFG.ACH_MODOS[modo];
      return m ? m.name : String(modo).toUpperCase();
    },

    /* ------------------------------------------------------
     * DAILY: la semana entera
     * ------------------------------------------------------ */
    buildDaily: function () {
      var self = this;
      var o = this.els.daily;
      if (!o) return;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'DAILY';
      o.appendChild(h);

      /* cabecera: la semana y cuántos van, y a la derecha la racha */
      var cab = document.createElement('div');
      cab.className = 'daily-cab';
      this.dailySub = document.createElement('div');
      this.dailySub.className = 'daily-sub';
      cab.appendChild(this.dailySub);
      this.dailyRacha = document.createElement('div');
      this.dailyRacha.className = 'daily-racha';
      cab.appendChild(this.dailyRacha);
      o.appendChild(cab);

      /* las siete casillas; en pantallas estrechas se desplazan de lado */
      this.dailyScroll = document.createElement('div');
      this.dailyScroll.className = 'daily-scroll';
      this.dailyList = document.createElement('div');
      this.dailyList.className = 'daily-grid';
      this.dailyScroll.appendChild(this.dailyList);
      o.appendChild(this.dailyScroll);

      /* el botín: siete monedas de reto y el cofre de la semana redonda */
      var botin = document.createElement('div');
      botin.className = 'daily-botin';
      this.dailyBotinCab = document.createElement('div');
      this.dailyBotinCab.className = 'daily-botin-cab';
      botin.appendChild(this.dailyBotinCab);
      this.dailySlots = document.createElement('div');
      this.dailySlots.className = 'daily-slots';
      botin.appendChild(this.dailySlots);
      o.appendChild(botin);

      var regla = document.createElement('div');
      regla.className = 'note daily-regla';
      regla.textContent = 'UNO POR DÍA, JUGANDO A LO QUE SEA · SOLO CUENTA EL DE HOY: ' +
        'EL DE AYER YA PASÓ Y EL DE MAÑANA AÚN NO ESTÁ · LA RACHA SE ROMPE EL DÍA QUE NO CUMPLAS EL TUYO';
      o.appendChild(regla);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);
    },

    showDaily: function () {
      this.refreshDailyPanel();
      this.showPanel('daily');
      /* En pantallas estrechas la cartilla se desplaza de lado: se abre con
       * la casilla de hoy a la vista, no con el lunes. */
      var sc = this.dailyScroll, hoyEl = this.dailyHoyCard;
      if (sc && hoyEl && sc.scrollWidth > sc.clientWidth) {
        sc.scrollLeft = Math.max(0, hoyEl.offsetLeft -
          (sc.clientWidth - hoyEl.offsetWidth) / 2);
      }
    },

    refreshDailyPanel: function () {
      var D = window.PM.Daily;
      if (!this.dailyList || !D) return;
      var est = D.leer();
      var hoy = D.diaSemana();
      var sem = D.semanaId();
      var retos = D.retos();
      var hechos = D.cumplidos(est);
      var TC = CFG.TIENDA;
      var self = this;
      var mk = function (tag, cls, txt) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
      };

      this.dailySub.textContent = 'SEMANA DEL ' + D.fmtFecha(D.fechaDe(sem, 0)) +
        ' AL ' + D.fmtFecha(D.fechaDe(sem, CFG.DAILY.DIAS - 1)) + ' · ' +
        hechos + ' DE ' + CFG.DAILY.DIAS + (hechos === 1 ? ' CAZADO' : ' CAZADOS');

      /* la racha en casillas: las llenas son la actual, las marcadas llegan
       * hasta la mejor (hasta siete; más allá se lee en el número) */
      var racha = est.racha || 0, mejor = est.mejor || 0;
      this.dailyRacha.innerHTML = '';
      this.dailyRacha.appendChild(mk('span', null, 'RACHA'));
      this.dailyRacha.appendChild(mk('b', null, String(racha)));
      for (var r = 0; r < CFG.DAILY.DIAS; r++) {
        this.dailyRacha.appendChild(mk('i', 'daily-pip' +
          (r < racha ? ' on' : (r < mejor ? ' mejor' : ''))));
      }
      this.dailyRacha.appendChild(mk('span', 'daily-mejor', 'MEJOR ' + mejor));

      this.dailyList.innerHTML = '';
      this.dailyHoyCard = null;
      for (var i = 0; i < CFG.DAILY.DIAS; i++) {
        var p = D.progreso(i, est);
        if (!p) continue;
        var e = this.dailyEstado(D, est, i);
        var color = this.dailyColor(i);
        var card = mk('div', 'daily-card ' + e);
        if (e === 'hoy') {
          card.style.setProperty('--dc', color);
          card.style.setProperty('--dg', this.dailyRgba(color, 0.22));
          card.style.setProperty('--dg2', this.dailyRgba(color, 0.12));
        }
        if (i === hoy) this.dailyHoyCard = card;

        var dia = mk('span', 'daily-card-dia', CFG.DAILY.DIA_CORTO[i]);
        dia.appendChild(mk('small', null, D.fmtFecha(D.fechaDe(sem, i))));
        card.appendChild(dia);

        var cv = document.createElement('canvas');
        cv.width = 140; cv.height = 140;
        this.pintarFantasmaDaily(cv, i, e);
        card.appendChild(cv);

        card.appendChild(mk('span', 'daily-card-reto', p.reto.desc));

        var extra = mk('span', 'daily-card-extra');
        if (e === 'hoy') {
          var barra = mk('span', 'daily-bar');
          var fill = mk('span', 'daily-fill');
          fill.style.width = Math.round(p.pct * 100) + '%';
          fill.style.background = color;
          barra.appendChild(fill);
          extra.appendChild(barra);
        } else if (p.reto.modo) {
          var chip = mk('span', 'daily-chip', 'EN ' + this.dailyModoName(p.reto.modo));
          var m = CFG.ACH_MODOS[p.reto.modo];
          chip.style.color = (e === 'perdido') ? '#555' : (m ? m.color : '#00ff00');
          extra.appendChild(chip);
        }
        card.appendChild(extra);

        card.appendChild(mk('span', 'daily-card-estado',
          e === 'hecho' ? ('+' + CFG.DAILY.XP + ' EXP · +' + TC.POR_RETO)
          : e === 'hoy' ? ((p.reto.modo ? 'EN ' + this.dailyModoName(p.reto.modo) + ' · ' : '') +
                           this.dailyValor(p.reto, p.valor))
          : e === 'perdido' ? 'SE PASÓ'
          : ('ABRE EL ' + CFG.DAILY.DIA_CORTO[i])));

        if (e === 'hecho') card.appendChild(mk('span', 'daily-sello', 'CAZADO'));
        this.dailyList.appendChild(card);
      }

      /* el botín: lo cobrado y lo que queda en juego esta semana */
      var total = CFG.DAILY.DIAS * TC.POR_RETO + TC.POR_SEMANA;
      var cobrado = hechos * TC.POR_RETO + (est.sem ? TC.POR_SEMANA : 0);
      this.dailyBotinCab.innerHTML = '';
      this.dailyBotinCab.appendChild(mk('span', null, 'BOTÍN DE LA SEMANA'));
      var cuenta = mk('span');
      cuenta.appendChild(mk('b', null, String(cobrado)));
      cuenta.appendChild(document.createTextNode(' DE ' + total + ' MONEDAS · ' +
        CFG.DAILY.XP + ' EXP POR CASILLA'));
      this.dailyBotinCab.appendChild(cuenta);

      this.dailySlots.innerHTML = '';
      for (var s = 0; s < CFG.DAILY.DIAS; s++) {
        var es = this.dailyEstado(D, est, s);
        var slot = mk('div', 'daily-slot' + (es === 'hecho' ? ' lleno' : (es === 'perdido' ? ' perdido' : '')));
        if (es === 'hecho') {
          /* Cobrado, y que se lea así: la moneda dorada y brillante parecía
           * un premio esperando a que lo pulsaras. Va en verde, con su ✓ y
           * la palabra, como un sello de "ya está". */
          var fila = mk('span', 'daily-slot-fila');
          fila.appendChild(mk('span', 'daily-slot-ok', '✓'));
          var mcv = document.createElement('canvas');
          mcv.width = 24; mcv.height = 24;
          self.pintarMoneda(mcv);
          fila.appendChild(mcv);
          fila.appendChild(document.createTextNode('+' + TC.POR_RETO));
          slot.appendChild(fila);
          slot.appendChild(mk('small', null, 'COBRADO'));
        } else {
          slot.appendChild(document.createTextNode(String(TC.POR_RETO)));
        }
        this.dailySlots.appendChild(slot);
      }
      var cofre = mk('div', 'daily-slot cofre' + (est.sem ? ' lleno' : ''));
      if (est.sem) {
        var fc = mk('span', 'daily-slot-fila');
        fc.appendChild(mk('span', 'daily-slot-ok', '✓'));
        fc.appendChild(document.createTextNode('SEMANA +' + TC.POR_SEMANA));
        cofre.appendChild(fc);
        cofre.appendChild(mk('small', null, 'COBRADO'));
      } else {
        cofre.textContent = 'SEMANA +' + TC.POR_SEMANA;
      }
      this.dailySlots.appendChild(cofre);
    },

    /* ------------------------------------------------------
     * Selector de modo de la portada
     * ------------------------------------------------------ */
    /* UN MODO CADA VEZ, en grande, con sus vecinos asomando a los lados y los
     * puntitos debajo. Antes eran seis tarjetas en rejilla: se veía todo de un vistazo,
     * sí, pero ninguna pesaba más que las otras y elegir modo —que es LA
     * decisión de la portada— se sentía como marcar una casilla. Con una sola
     * tarjeta grande, su icono a tamaño de verdad y su nombre, elegir modo se
     * parece más a plantarse delante de una máquina que a rellenar un
     * formulario.
     *
     * Se conserva todo lo de la rejilla: los mismos iconos dibujados con los
     * sprites del juego, la misma coletilla y el mismo atajo de "pulsa la que
     * ya está puesta y arranca". Lo que cambia es que ahora hay que pasar por
     * ellas, así que las flechas también responden al teclado. */
    buildModeGrid: function () {
      var self = this;
      var wrap = document.createElement('div');
      wrap.className = 'mode-carousel';

      /* A los lados, en vez de flechas, los modos VECINOS asomando: más
       * pequeños y apagados, como en la pantalla de selección de una
       * recreativa. Una flecha solo dice "hay más"; el vecino dice QUÉ hay, y
       * se pulsa igual para pasar a él. */
      var peek = function (d) {
        var p = document.createElement('button');
        p.type = 'button';
        p.className = 'mode-peek ' + (d < 0 ? 'mode-prev' : 'mode-next');
        /* el vecino asoma con su póster (js/portadas.js), apagado */
        var pcv = document.createElement('canvas');
        pcv.width = 180; pcv.height = 235;
        pcv.className = 'mode-peek-icon';
        p.appendChild(pcv);
        var pn = document.createElement('span');
        pn.className = 'mode-peek-name';
        p.appendChild(pn);
        var fl = document.createElement('span');
        fl.className = 'mode-peek-arrow';
        fl.textContent = d < 0 ? '◀' : '▶';
        p.appendChild(fl);
        p.addEventListener('click', function () { self.stepMode(d); });
        return { b: p, cv: pcv, name: pn, id: '', estado: {} };
      };
      this.modePeekPrev = peek(-1);
      this.modePeekNext = peek(1);
      wrap.appendChild(this.modePeekPrev.b);

      /* Las seis viven a la vez en el DOM y solo se enseña la elegida. Se
       * montan una vez —los iconos son lienzos y repintarlos en cada paso se
       * notaría— y pasar de modo es encender una y apagar las otras. */
      var caja = document.createElement('div');
      caja.className = 'mode-frame';
      this.modeCards = {};
      MODOS.forEach(function (mo) {
        /* La tarjeta ES un <button>: así entra sola en la navegación con
         * flechas y responde a Enter, como el resto del menú. */
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mode-card poster';
        b.setAttribute('aria-label', mo.name);
        var Po = window.PM.Portadas;
        b.style.setProperty('--mc', Po ? Po.color(mo.id) : mo.color);

        /* EL PÓSTER (17 sep 2026, propuesta B · Retrato): el lienzo animado
         * de js/portadas.js y, encima, número, etiqueta, título inclinado y
         * frase. Todo va dentro de .poster-in, que es lo que se inclina en 3D
         * con el ratón: la tarjeta en sí la mueve el carrusel. */
        var dentro = document.createElement('span');
        dentro.className = 'poster-in';
        b.appendChild(dentro);

        var cv = document.createElement('canvas');
        cv.width = 360; cv.height = 470;
        cv.className = 'mode-icon poster-cv';
        dentro.appendChild(cv);

        var num = document.createElement('span');
        num.className = 'poster-num';
        num.textContent = '0' + (MODOS.indexOf(mo) + 1);
        dentro.appendChild(num);

        var tg = document.createElement('small');
        tg.className = 'mode-tag poster-tag';
        tg.textContent = mo.tag;
        dentro.appendChild(tg);

        var nm = document.createElement('span');
        nm.className = 'mode-name poster-ttl';
        nm.textContent = mo.name;
        dentro.appendChild(nm);

        var frase = document.createElement('span');
        frase.className = 'poster-frase';
        frase.textContent = Po ? Po.frase(mo.id) : mo.desc;
        dentro.appendChild(frase);

        var estado = {};
        b.addEventListener('mousemove', function (ev) {
          var r = b.getBoundingClientRect();
          if (!r.width) return;
          var x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
          if (!self.menosMovimiento()) {
            dentro.style.transform = 'perspective(800px) rotateY(' + (x * 14) + 'deg) rotateX(' + (-y * 14) + 'deg)';
          }
          var D = CFG.DIR;
          estado.dir = Math.abs(x) > Math.abs(y - 0.12) ? (x < 0 ? D.LEFT : D.RIGHT) : (y - 0.12 < 0 ? D.UP : D.DOWN);
        });
        b.addEventListener('mouseleave', function () { dentro.style.transform = ''; estado.dir = null; });

        /* Pulsar la tarjeta arranca: la que se ve ES la elegida, así que aquí
         * ya no hay nada que elegir. */
        b.addEventListener('click', function () {
          self.resumeAudio();
          self.playPick();
        });
        caja.appendChild(b);
        self.modeCards[mo.id] = { b: b, tag: tg, mo: mo, cv: cv, estado: estado };
      });
      wrap.appendChild(caja);

      wrap.appendChild(this.modePeekNext.b);
      this.activarArrastreModos(wrap, caja);

      /* Los puntos: cuántos modos hay y por cuál vas. Sin ellos, un carrusel
       * no dice si quedan dos o veinte. Se pueden pulsar, que es más rápido
       * que darle cinco veces a la flecha para volver al primero. */
      var dots = document.createElement('div');
      dots.className = 'mode-dots';
      this.modeDots = {};
      MODOS.forEach(function (mo) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'mode-dot';
        d.setAttribute('aria-label', mo.name);
        d.addEventListener('click', function () {
          self.resumeAudio();
          self.pickMode(mo.id);
        });
        dots.appendChild(d);
        self.modeDots[mo.id] = d;
      });

      var caja2 = document.createElement('div');
      caja2.className = 'mode-picker';
      caja2.appendChild(wrap);
      caja2.appendChild(dots);

      /* El modo elegido se recuerda entre recargas (ajuste `modePick`). Antes
       * vivía solo en memoria y el carrusel volvía a CLÁSICO en cada arranque:
       * con la rejilla vieja se notaba poco —se veían los seis— y con el
       * carrusel es un peaje de dos flechas cada vez que abres el juego. */
      this.modePick = modoPorId(window.PM.settings.modePick).id;
      return caja2;
    },

    /* Pasa al modo de al lado. Da la vuelta por los dos extremos: son seis y
     * volver del último al primero a base de flecha izquierda es un peaje sin
     * ningún motivo. */
    stepMode: function (d) {
      this.resumeAudio();
      var i = 0;
      for (var k = 0; k < MODOS.length; k++) {
        if (MODOS[k].id === this.modePick) { i = k; break; }
      }
      i = (i + d + MODOS.length) % MODOS.length;
      this.modeEntra = d;          // de qué lado entra la tarjeta nueva
      this.pickMode(MODOS[i].id);
    },

    menosMovimiento: function () {
      try {
        return !!(window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      } catch (e) { return false; }
    },

    /* El paso de un modo a otro, como una cinta: la tarjeta que se va sale por
     * un lado y la nueva entra por el otro a la vez, con una curva que frena
     * al llegar. Antes solo entraba la nueva, a saltos, y la vieja
     * desaparecía de golpe. Si se venía arrastrando, las dos arrancan desde
     * donde la dejó el dedo (`modeDesde`), así que no hay tirón al soltar. */
    animarCambioModo: function (id) {
      var d = this.modeEntra || 0;
      var desde = this.modeDesde || 0;
      this.modeEntra = 0;
      this.modeDesde = 0;
      var nueva = this.modeCards[id];
      var previa = this.modeVista;
      this.modeVista = id;
      if (!d || !nueva || previa === id || !nueva.b.animate || this.menosMovimiento()) {
        if (nueva) { nueva.b.style.transform = ''; nueva.b.style.opacity = ''; }
        return;
      }
      var w = (nueva.b.parentNode && nueva.b.parentNode.clientWidth) || 240;
      var curva = 'cubic-bezier(.22,.9,.25,1)';
      var dur = 320;
      nueva.b.style.transform = '';
      nueva.b.style.opacity = '';
      nueva.b.animate([
        { transform: 'translateX(' + Math.round(d * w * 0.85 + desde * 0.35) + 'px) scale(0.9)', opacity: 0.2 },
        { transform: 'none', opacity: 1 }
      ], { duration: dur, easing: curva });

      var vieja = previa && this.modeCards[previa];
      if (!vieja) return;
      var vb = vieja.b, self = this;
      vb.style.display = '';
      vb.style.borderColor = vieja.mo.color;     // que salga con su color
      vb.style.color = vieja.mo.color;
      vb.classList.add('saliendo');
      var a = vb.animate([
        { transform: 'translateX(' + Math.round(desde) + 'px)', opacity: 1 },
        { transform: 'translateX(' + Math.round(-d * w * 0.85) + 'px) scale(0.9)', opacity: 0 }
      ], { duration: dur, easing: curva });
      var acaba = function () {
        vb.classList.remove('saliendo');
        vb.style.transform = '';
        vb.style.opacity = '';
        if (self.modePick !== vieja.mo.id) {
          vb.style.display = 'none';
          vb.style.borderColor = '';
          vb.style.color = '';
        }
      };
      a.onfinish = acaba;
      a.oncancel = acaba;
    },

    /* ARRASTRAR los modos con el ratón (o el dedo): la tarjeta sigue al
     * puntero, el vecino hacia el que vas se enciende, y al soltar pasa si
     * has arrastrado lo bastante —o lanzado rápido—; si no, vuelve a su sitio
     * con un pequeño rebote. Solo cuenta el arrastre horizontal: el vertical
     * se deja al navegador, que en el móvil es desplazar la portada.
     *
     * Soltar encima de la tarjeta dispararía su clic, que es JUGAR, así que el
     * clic que llega justo después de un arrastre se descarta. */
    activarArrastreModos: function (wrap, frame) {
      var self = this, st = null;
      var vecinos = function (dx, k) {
        var pn = self.modePeekNext && self.modePeekNext.b;
        var pp = self.modePeekPrev && self.modePeekPrev.b;
        if (pn) pn.style.opacity = dx < 0 ? String(Math.min(1, 0.42 + k * 1.2)) : '';
        if (pp) pp.style.opacity = dx > 0 ? String(Math.min(1, 0.42 + k * 1.2)) : '';
      };
      wrap.addEventListener('pointerdown', function (e) {
        if (e.button != null && e.button !== 0) return;
        var card = self.modeCards && self.modeCards[self.modePick];
        if (!card) return;
        st = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, v: 0,
               lx: e.clientX, lt: Date.now(), movido: false, card: card.b,
               w: frame.clientWidth || 240 };
      });
      wrap.addEventListener('pointermove', function (e) {
        if (!st || e.pointerId !== st.id) return;
        var dx = e.clientX - st.x, dy = e.clientY - st.y;
        if (!st.movido) {
          if (Math.abs(dx) < 6) return;
          if (Math.abs(dy) > Math.abs(dx)) { st = null; return; }
          st.movido = true;
          try { wrap.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
          wrap.classList.add('arrastrando');
          self.resumeAudio();
        }
        var ahora = Date.now();
        st.v = (e.clientX - st.lx) / Math.max(1, ahora - st.lt);
        st.lx = e.clientX;
        st.lt = ahora;
        st.dx = dx;
        var k = Math.min(1, Math.abs(dx) / st.w);
        st.card.style.transform = 'translateX(' + dx + 'px) rotate(' +
          (dx < 0 ? -1 : 1) * k * 5 + 'deg) scale(' + (1 - k * 0.08) + ')';
        st.card.style.opacity = String(1 - k * 0.12);
        vecinos(dx, k);
        e.preventDefault();
      });
      var suelta = function (e) {
        if (!st || e.pointerId !== st.id) return;
        var s = st;
        st = null;
        wrap.classList.remove('arrastrando');
        vecinos(0, 0);
        if (!s.movido) return;
        self.modeArrastreFin = Date.now();
        var lejos = Math.abs(s.dx) > s.w * 0.22;
        var lanzado = Math.abs(s.v) > 0.45 && Math.abs(s.dx) > 24 &&
          (s.v < 0) === (s.dx < 0);
        if (e.type !== 'pointercancel' && (lejos || lanzado)) {
          self.modeDesde = s.dx;
          self.stepMode(s.dx < 0 ? 1 : -1);
          return;
        }
        var t0 = s.card.style.transform, o0 = s.card.style.opacity;
        s.card.style.transform = '';
        s.card.style.opacity = '';
        if (s.card.animate && !self.menosMovimiento()) {
          s.card.animate([{ transform: t0, opacity: o0 }, { transform: 'none', opacity: 1 }],
            { duration: 260, easing: 'cubic-bezier(.3,1.5,.5,1)' });
        }
      };
      wrap.addEventListener('pointerup', suelta);
      wrap.addEventListener('pointercancel', suelta);
      wrap.addEventListener('click', function (e) {
        if (self.modeArrastreFin && Date.now() - self.modeArrastreFin < 400) {
          e.stopPropagation();
          e.preventDefault();
        }
      }, true);
    },

    /* El modo que queda a `d` pasos del elegido, dando la vuelta */
    modoVecino: function (d) {
      var i = 0;
      for (var k = 0; k < MODOS.length; k++) {
        if (MODOS[k].id === this.modePick) { i = k; break; }
      }
      return MODOS[(i + d + MODOS.length) % MODOS.length];
    },

    /* Icono de un modo. Todo dibujado con los sprites del juego: son los
     * mismos Pac-Man y fantasmas de la partida, no dibujos aparte. */
    drawModeIcon: function (cv, mo) {
      var S = window.PM.Sprites;
      var c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, cv.width, cv.height);
      c.save();
      c.translate(cv.width / 2, cv.height / 2);
      /* Los sprites son de 13 px: se agrandan hasta llenar el lienzo, sea del
       * tamaño que sea. El 20 es el ancho lógico que ocupa el icono más
       * grande (el de la party, que son dos Pac-Man y un fantasma). */
      /* Los de dos o tres sprites se salían de ese ancho y se veían cortados
       * por arriba y por los lados: esos llevan más margen. */
      var doble = (mo.icon === 'party' || mo.icon === 'duo' || mo.icon === 'caza');
      var k = cv.width / (doble ? 26 : 20);
      c.scale(k, k);
      var D = CFG.DIR;
      if (mo.icon === 'pac') {
        S.drawPacman(c, 0, 0, D.RIGHT, 2, mo.color, 'clasico');
      } else if (mo.icon === 'duo') {
        S.drawPacman(c, -4.5, 0, D.RIGHT, 2, '#ffff00', 'clasico');
        S.drawPacman(c, 5.5, 0, D.RIGHT, 1, '#00ff00', 'clasico');
      } else if (mo.icon === 'dientes') {
        S.drawPacman(c, 0, 0, D.RIGHT, 2, mo.color, 'clasico');
        S.drawPacTeeth(c, 0, 0, D.RIGHT, 2, mo.color);
      } else if (mo.icon === 'caza') {
        // un fantasma pisándole los talones a Pac-Man: aquí el fantasma eres tú
        S.drawGhost(c, -5.5, 0, D.RIGHT, 1, 'normal', 0, false);
        S.drawPacman(c, 5.5, 0, D.RIGHT, 1, '#ffff00', 'clasico');
      } else if (mo.icon === 'estrella') {
        S.drawAchStar(c, 0, 0, 8, mo.color);
      } else if (mo.icon === 'maze') {
        S.drawMazeGlyph(c, 0, 0, 17, mo.color);
      } else if (mo.icon === 'party') {
        // dos Pac-Man y un fantasma: los de la sala son gente, no colores
        S.drawPacman(c, -6, -3.5, D.RIGHT, 2, '#ffff00', 'clasico');
        S.drawPacman(c, 5, -3.5, D.LEFT, 2, '#00ff00', 'clasico');
        S.drawGhost(c, 0, 4.5, D.RIGHT, 0, 'normal', 0, false);
      }
      c.restore();
    },

    pickMode: function (id) {
      this.modePick = modoPorId(id).id;
      /* Se guarda al elegir, no al jugar: elegir ya es la decisión, y quien
       * abre el juego, se asoma a un modo y se va, la próxima vez lo encuentra
       * donde lo dejó. */
      if (window.PM.settings.modePick !== this.modePick) {
        window.PM.settings.modePick = this.modePick;
        saveSettings();
      }
      this.refreshModePicker();
    },

    /* Pinta el estado del selector: cuál está elegido, su descripción y el
     * recado de cada modo. Se llama también cuando cambian cosas de fuera
     * (la marca del reto, la gente de la party). */
    refreshModePicker: function () {
      if (!this.modeCards) return;
      var id = this.modePick || 'clasico';
      var mo = modoPorId(id);
      for (var k in this.modeCards) {
        if (!this.modeCards.hasOwnProperty(k)) continue;
        var card = this.modeCards[k];
        var sel = (k === id);
        /* Solo se ve la elegida. Las otras cinco siguen en el DOM (montarlas
         * una vez sale más barato que repintar iconos a cada paso) pero se
         * ocultan de verdad —display, no opacidad—, para que no se puedan
         * pulsar sin querer ni las pille la navegación con flechas. */
        card.b.style.display = sel ? '' : 'none';
        card.b.classList.toggle('sel', sel);
        card.b.style.borderColor = sel ? card.mo.color : '';
        card.b.style.color = sel ? card.mo.color : '';
        card.tag.textContent = this.modeTag(card.mo);
        var d = this.modeDots && this.modeDots[k];
        if (d) {
          d.classList.toggle('on', sel);
          // el color de su póster (CACERÍA roja, LABERINTOS y ONLINE cambiantes)
          var dc = window.PM.Portadas ? window.PM.Portadas.color(k, card.estado) : card.mo.color;
          d.style.background = sel ? dc : '';
          d.style.borderColor = sel ? dc : '';
        }
      }
      /* Los vecinos: se repintan solo si han cambiado de modo */
      var self = this;
      [[this.modePeekPrev, -1], [this.modePeekNext, 1]].forEach(function (par) {
        var pk = par[0];
        if (!pk) return;
        var vm = self.modoVecino(par[1]);
        if (pk.id !== vm.id) {
          pk.estado = {};
          pk.name.textContent = vm.name;
          pk.b.style.setProperty('--mc', window.PM.Portadas ? window.PM.Portadas.color(vm.id) : vm.color);
          pk.b.setAttribute('aria-label', (par[1] < 0 ? 'Modo anterior: ' : 'Modo siguiente: ') + vm.name);
          // el vecino nuevo asoma desde fuera, no aparece de golpe
          if (pk.id && self.modeEntra && pk.b.animate && !self.menosMovimiento()) {
            pk.b.animate([
              { opacity: 0, transform: 'translateX(' + (par[1] * 18) + 'px)' },
              { transform: 'none' }
            ], { duration: 280, easing: 'cubic-bezier(.22,.9,.25,1)' });
          }
          pk.id = vm.id;
        }
      });
      this.animarCambioModo(id);
      if (this.modeDesc) {
        this.modeDesc.textContent = mo.desc;
        this.modeDesc.style.color = mo.color;
      }
      if (this.modeNote) {
        this.modeNote.textContent = this.modeNota(mo);
        this.ajustarUnaLinea(this.modeNote);
      }
    },

    /* Deja un texto en una sola línea, entero: si no cabe, baja la letra (y,
     * al límite, junta un poco las letras) hasta que quepa. */
    ajustarUnaLinea: function (el) {
      if (!el || !el.style) return;
      el.style.fontSize = '';
      el.style.letterSpacing = '';
      if (!el.clientWidth || !el.textContent) return;
      var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
      var px = cs ? parseFloat(cs.fontSize) : 10;
      for (var i = 0; i < 12 && el.scrollWidth > el.clientWidth && px > 6; i++) {
        px -= 0.5;
        el.style.fontSize = px + 'px';
        if (px <= 8) el.style.letterSpacing = '0';
      }
    },

    /* La coletilla de la tarjeta. Casi siempre es fija, pero ONLINE tiene
     * algo que contar ahora mismo. */
    modeTag: function (mo) {
      var P = window.PM.Party;
      if (mo.id === 'online' && P && P.inParty()) {
        return 'PARTY ' + P.count() + '/' + CFG.MAX_PLAYERS;
      }
      return mo.tag;
    },

    /* El renglón de debajo: lo que conviene saber ANTES de darle a JUGAR. */
    modeNota: function (mo) {
      var P = window.PM.Party;
      if (mo.id === 'online') {
        if (P && P.inParty()) return 'YA ESTÁS EN UNA PARTY: ENTRA Y EMPEZAD';
        return 'CREA UNA SALA O ENTRA CON UN CÓDIGO DE 4 LETRAS';
      }
      if (mo.id === 'lab' || mo.id === 'hab') {
        return 'TOP MUNDIAL PROPIO · MAESTRÍAS PROPIAS POR FORMATO';
      }
      if (mo.id === 'caza') {
        return CFG.CAZA.NIVELES + ' RONDAS · CADA CAZA SON ' + CFG.VS.CATCH_POINTS +
          ' PUNTOS · NO ENTRA EN EL TOP MUNDIAL';
      }
      if (mo.id === 'duo') return 'PUNTUACIÓN DE EQUIPO Y RÉCORD DE DÚO';
      return 'TU RÉCORD Y TU MAESTRÍA DE SIEMPRE';
    },

    /* JUGAR. Tres modos arrancan de una; los otros dos necesitan que elijas
     * algo antes (qué laberinto o qué sala), así que JUGAR abre eso. */
    playPick: function () {
      var s = window.PM.settings;
      var id = this.modePick || 'clasico';
      this.resumeAudio();
      if (id === 'lab') { this.showMazes(); return; }
      if (id === 'online') { this.showOnline(); return; }
      /* DESATADO abre su panel, como LABERINTOS y ONLINE: desde que se puede
       * jugar acompañado hay algo que elegir antes de que haya partida, y de
       * paso ahí están escritas las teclas, que ya no son las mismas en solo
       * que en dos. */
      if (id === 'hab') { this.showHabPrompt(); return; }
      if (id === 'caza') { this.showCazaPrompt(); return; }
      var self = this;
      function go() {
        self.hideAll();
        if (id === 'duo') {
          // PAC-MAN VS. en el mismo teclado: el J2 puede llevar un fantasma
          // (se elige en OPCIONES · PARTIDA; -1 = Pac-Man de siempre)
          window.PM.Game.newGame({ players: 2, ghosts: [-1, s.vsGhost2] });
          return;
        }
        window.PM.Game.newGame({ players: 1 });
      }
      // empezar otra tira la que estuviera a medias: primero se avisa
      if (this.avisaSiHayGuardada(go)) return;
      go();
    },

    /* ------------------------------------------------------
     * DESPLEGABLE de recreativa: un botón que dice lo que hay puesto
     * ("MUNDO · CLÁSICO ▾") y, al pulsarlo, la lista de opciones (con
     * cabeceras de grupo si las hay). Devuelve { el, btns, poner(id) }.
     * Se cierra al elegir, al pulsar fuera o con ESC.
     * ------------------------------------------------------ */
    desplegable: function (rotulo, opciones, alElegir) {
      var self = this;
      var el = document.createElement('div');
      el.className = 'desp';
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'btn desp-btn';
      boton.setAttribute('aria-haspopup', 'listbox');
      boton.setAttribute('aria-expanded', 'false');
      var k = document.createElement('span');
      k.className = 'desp-k';
      k.textContent = rotulo;
      boton.appendChild(k);
      var v = document.createElement('span');
      v.className = 'desp-v';
      boton.appendChild(v);
      var fl = document.createElement('span');
      fl.className = 'desp-fl';
      fl.textContent = '▾';
      boton.appendChild(fl);
      el.appendChild(boton);

      var menu = document.createElement('div');
      menu.className = 'desp-menu';
      menu.setAttribute('role', 'listbox');
      el.appendChild(menu);
      var btns = {}, nombres = {}, grupo = null;
      function cerrar() {
        el.classList.remove('abierto');
        boton.setAttribute('aria-expanded', 'false');
      }
      opciones.forEach(function (o) {
        if (o.grupo && o.grupo !== grupo) {
          grupo = o.grupo;
          var g = document.createElement('span');
          g.className = 'desp-grupo';
          g.textContent = o.grupo;
          menu.appendChild(g);
        }
        var ob = self.makeButton(o.name, function () {
          cerrar();
          alElegir(o.id);
        });
        ob.classList.add('desp-op');
        ob.setAttribute('role', 'option');
        if (o.cuenta != null) {
          var c = document.createElement('small');
          c.className = 'desp-cuenta';
          c.textContent = o.cuenta;
          ob.appendChild(c);
        }
        btns[o.id] = ob;
        nombres[o.id] = o.name;
        menu.appendChild(ob);
      });
      boton.addEventListener('click', function (ev) {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        var abrir = !el.classList.contains('abierto');
        self.cerrarDesplegables();
        if (abrir) {
          el.classList.add('abierto');
          boton.setAttribute('aria-expanded', 'true');
          var act = menu.querySelector && menu.querySelector('.active');
          if (act && act.focus) { try { act.focus(); } catch (e) { } }
        }
      });
      if (!this.despEscucha && typeof document !== 'undefined' && document.addEventListener) {
        this.despEscucha = true;
        document.addEventListener('click', function (ev) {
          var abiertos = document.querySelectorAll ? document.querySelectorAll('.desp.abierto') : [];
          for (var i = 0; i < abiertos.length; i++) {
            if (!abiertos[i].contains(ev.target)) abiertos[i].classList.remove('abierto');
          }
        });
      }
      return {
        el: el, btns: btns, boton: boton,
        poner: function (id) {
          for (var key in btns) {
            if (btns.hasOwnProperty(key)) btns[key].classList.toggle('active', String(key) === String(id));
          }
          v.textContent = nombres.hasOwnProperty(id) ? nombres[id] : '';
        },
        rotulo: function (txt) { v.textContent = txt; }
      };
    },

    /* ¿Hay un desplegable abierto? Se cierra (ESC lo usa antes que salir) */
    cerrarDesplegables: function () {
      if (typeof document === 'undefined' || !document.querySelectorAll) return false;
      var abiertos = document.querySelectorAll('.desp.abierto');
      for (var i = 0; i < abiertos.length; i++) abiertos[i].classList.remove('abierto');
      return abiertos.length > 0;
    },

    /* La línea que recorre el borde al señalar algo (la del DAILY y la de
     * los botones de los diálogos). Es un SVG con un rectángulo de largo 100
     * y un trazo discontinuo que se desplaza; el CSS de la clase lo enciende
     * con :hover y :focus-visible. */
    ponRonda: function (el, clase) {
      var ns = 'http://www.w3.org/2000/svg';
      if (!document.createElementNS) return;
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', clase);
      svg.setAttribute('aria-hidden', 'true');
      var rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', '1'); rect.setAttribute('y', '1');
      rect.setAttribute('width', 'calc(100% - 2px)');
      rect.setAttribute('height', 'calc(100% - 2px)');
      rect.setAttribute('pathLength', '100');
      svg.appendChild(rect);
      el.appendChild(svg);
    },

    makeButton: function (label, onClick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = label;
      b.addEventListener('click', onClick);
      return b;
    },

    /* ------------------------------------------------------
     * Panel de opciones
     * ------------------------------------------------------ */
    buildOptions: function () {
      var self = this;
      var o = this.els.options;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'OPCIONES';
      o.appendChild(h);

      /* --- pestañas: el panel entero de golpe se ve abarrotado, aquí y en
       * pantalla ancha. Lo que cambia con sitio de sobra es que las secciones
       * de la pestaña abierta se reparten en columnas (ver .opt-group). --- */
      var TABS = [
        ['dificultad', 'DIFICULTAD'],
        ['jugadores', 'JUGADORES'],
        ['partida', 'PARTIDA'],
        ['sonido', 'SONIDO'],
        ['controles', 'CONTROLES']
      ];
      var bar = document.createElement('div');
      bar.className = 'tab-row';
      this.tabBtns = {};
      this.tabPanes = {};
      TABS.forEach(function (t) {
        var b = self.makeButton(t[1], function () { self.showOptionsTab(t[0]); });
        b.classList.add('tab');
        self.tabBtns[t[0]] = b;
        bar.appendChild(b);
      });
      o.appendChild(bar);
      TABS.forEach(function (t) {
        var pane = document.createElement('div');
        pane.className = 'tab-pane pane-' + t[0];
        self.tabPanes[t[0]] = pane;
        o.appendChild(pane);
      });

      var dif = this.tabPanes.dificultad;
      var jug = this.tabPanes.jugadores;
      var par = this.tabPanes.partida;
      var son = this.tabPanes.sonido;

      /* ===== pestaña CONTROLES (antes, en la portada) ===== */
      var ctl = this.optGroup(this.tabPanes.controles, 'CONTROLES');
      var ayudas = [
        'J1: FLECHAS O WASD',
        'PAUSA: P O ESC (REANUDAR · REINICIAR R · SALIR Q)',
        'DOS JUGADORES: J1 FLECHAS · J2 WASD, CONTRA LOS FANTASMAS',
        'DESATADO SOLO: FLECHAS PARA MOVERSE · Q W E R PARA LOS PODERES',
        'DESATADO EN DOS: J1 FLECHAS Y ' + CFG.HAB.KEYS_2P[0].join(' ') +
          ' · J2 WASD Y ' + CFG.HAB.KEYS_2P[1].join(' '),
        'RENDIRSE: BOTÓN DE ARRIBA A LA DERECHA (EN DÚO, LOS DOS)'
      ];
      if (this.touchDevice) {
        ayudas.push('TÁCTIL: DESLIZA PARA MOVERTE · EN DÚO, CADA UNO SU MITAD');
      }
      for (var a = 0; a < ayudas.length; a++) {
        var hint = document.createElement('div');
        hint.className = 'hint';
        hint.textContent = ayudas[a];
        ctl.appendChild(hint);
      }
      var rep = this.optGroup(this.tabPanes.controles, 'EL REPARTO');
      var roster = document.createElement('div');
      roster.className = 'roster';
      [['SHADOW', '"BLINKY"', '#ff0000'], ['SPEEDY', '"PINKY"', '#ffb8ff'],
       ['BASHFUL', '"INKY"', '#00ffff'], ['POKEY', '"CLYDE"', '#ffb852']].forEach(function (n) {
        var row = document.createElement('div');
        row.className = 'roster-row';
        row.style.color = n[2];
        var dot = document.createElement('span');
        dot.className = 'roster-ghost';
        dot.style.background = n[2];
        row.appendChild(dot);
        var tt = document.createElement('span');
        tt.textContent = n[0] + '  ' + n[1];
        row.appendChild(tt);
        roster.appendChild(row);
      });
      rep.appendChild(roster);

      /* ===== pestaña DIFICULTAD ===== */
      var difA = this.optGroup(dif, 'DIFICULTAD');
      var presetRow = document.createElement('div');
      presetRow.className = 'preset-row';
      var presets = [['facil', 'FÁCIL'], ['normal', 'NORMAL'], ['dificil', 'DIFÍCIL']];
      this.presetButtons = {};
      presets.forEach(function (p) {
        var b = self.makeButton(p[1], function () {
          self.applyPreset(p[0]);
        });
        b.classList.add('btn-preset');
        self.presetButtons[p[0]] = b;
        presetRow.appendChild(b);
      });
      difA.appendChild(presetRow);

      this.customTag = document.createElement('div');
      this.customTag.className = 'custom-tag';
      this.customTag.textContent = 'PERSONALIZADA';
      difA.appendChild(this.customTag);
      var difNote = document.createElement('div');
      difNote.className = 'note';
      difNote.textContent = 'VELOCIDAD, VIDAS Y NIVEL SE APLICAN EN LA PRÓXIMA PARTIDA';
      difA.appendChild(difNote);

      var difB = this.optGroup(dif, 'A TU MEDIDA');
      this.sliders = {};
      difB.appendChild(this.makeSlider('ghostSpeedMult', 'VELOCIDAD FANTASMAS',
        0.5, 1.2, 0.05, function (v) { return '×' + v.toFixed(2); }));
      difB.appendChild(this.makeSlider('pacSpeedMult', 'VELOCIDAD PAC-MAN',
        0.8, 1.3, 0.05, function (v) { return '×' + v.toFixed(2); }));
      difB.appendChild(this.makeSlider('frightMult', 'DURACIÓN POWER PELLET',
        0, 2, 0.25, function (v) { return '×' + v.toFixed(2); }));
      difB.appendChild(this.makeSlider('startLives', 'VIDAS',
        1, 5, 1, function (v) { return String(v); }));
      difB.appendChild(this.makeSlider('startLevel', 'NIVEL INICIAL',
        1, 21, 1, function (v) { return String(v); }));

      /* ===== pestaña JUGADORES ===== */
      var jugN = this.optGroup(jug, 'NOMBRES', true);
      jugN.appendChild(this.makeNickRow('nick1', 'TU NOMBRE (J1 Y ONLINE)'));
      jugN.appendChild(this.makeNickRow('nick2', 'JUGADOR 2 (LOCAL)'));
      var nkNote = document.createElement('div');
      nkNote.className = 'note';
      nkNote.textContent = 'SE VEN EN EL MARCADOR, SOBRE CADA PAC-MAN Y EN LAS SALAS ONLINE';
      jugN.appendChild(nkNote);

      /* El aspecto (el tuyo y el del jugador 2 local) se elige en el
       * VESTUARIO, que es el único sitio donde se viste a alguien. Aquí solo
       * queda el atajo para no tener que ir a buscarlo. */
      var jugYo = this.optGroup(jug, 'ASPECTO');
      var skNote = document.createElement('div');
      skNote.className = 'note';
      skNote.textContent = 'EL COLOR, LA SKIN Y LO QUE LLEVÁIS PUESTO SE ELIGE EN EL VESTUARIO';
      jugYo.appendChild(skNote);
      var vestRow = document.createElement('div');
      vestRow.className = 'preset-row';
      var vYo = this.makeButton('TU ASPECTO', function () { self.showVestuario('skin', 'yo'); });
      vYo.classList.add('btn-preset');
      vestRow.appendChild(vYo);
      var vJ2 = this.makeButton('VESTIR AL JUGADOR 2', function () { self.showVestuario('skin', 'j2'); });
      vJ2.classList.add('btn-preset');
      vestRow.appendChild(vJ2);
      jugYo.appendChild(vestRow);
      this.optMsgEl = document.createElement('div');
      this.optMsgEl.className = 'lobby-status';
      jugN.appendChild(this.optMsgEl);

      /* ===== pestaña PARTIDA ===== */
      par = this.optGroup(par, 'VIDAS EN 2 JUGADORES');
      var lmRow = document.createElement('div');
      lmRow.className = 'preset-row';
      this.livesModeBtns = {};
      [['shared', 'COMPARTIDAS'], ['individual', 'INDIVIDUALES']].forEach(function (p) {
        var b = self.makeButton(p[1], function () {
          window.PM.settings.livesMode = p[0];
          saveSettings();
          self.refreshOptions();
        });
        b.classList.add('btn-preset');
        self.livesModeBtns[p[0]] = b;
        lmRow.appendChild(b);
      });
      par.appendChild(lmRow);
      var lmNote = document.createElement('div');
      lmNote.className = 'note';
      lmNote.textContent = 'COMPARTIDAS: UN FONDO COMÚN PARA EL EQUIPO · INDIVIDUALES: QUIEN LAS PIERDE, MIRA';
      par.appendChild(lmNote);

      var ctrlNote = document.createElement('div');
      ctrlNote.className = 'note';
      ctrlNote.textContent = 'EN PARTIDA: P O ESC PAUSA · 1-6 EMOTES · ' +
        'CTRL+ESPACIO TU MAESTRÍA · F1-F4 LA DE SOLO/DÚO/TRÍO/ESCUADRA · ' +
        'T CHAT (ONLINE)';
      par.appendChild(ctrlNote);

      /* PAC-MAN VS. en la misma máquina: el jugador 2 lleva un fantasma */
      var vsg = this.optGroup(this.tabPanes.partida, 'PAC-MAN VS. (MISMO TECLADO)');
      var vsRowL = document.createElement('div');
      vsRowL.className = 'preset-row';
      this.vsLocalBtns = {};
      this.vsChoices().forEach(function (op) {
        var b = self.makeButton(op[1], function () {
          window.PM.settings.vsGhost2 = op[0];
          saveSettings();
          self.refreshOptions();
        });
        b.classList.add('btn-preset');
        if (op[0] >= 0) b.style.color = CFG.GHOSTS[op[0]].color;
        self.vsLocalBtns[op[0]] = b;
        vsRowL.appendChild(b);
      });
      vsg.appendChild(vsRowL);
      var vsNoteL = document.createElement('div');
      vsNoteL.className = 'note';
      vsNoteL.textContent = 'EN DOS JUGADORES, EL J2 (WASD) LLEVA ESE FANTASMA ' +
        'EN VEZ DE UN PAC-MAN. GANA SI SE QUEDA CON TODAS TUS VIDAS';
      vsg.appendChild(vsNoteL);

      /* ===== pestaña SONIDO ===== */
      var sonA = this.optGroup(son, 'SONIDO');
      var sndRow = document.createElement('div');
      sndRow.className = 'preset-row';
      this.soundBtns = {};
      [['si', 'SÍ'], ['no', 'NO']].forEach(function (p) {
        var b = self.makeButton(p[1], function () {
          window.PM.settings.muted = (p[0] === 'no');
          self.applyMute();
          saveSettings();
          self.refreshOptions();
        });
        b.classList.add('btn-preset');
        self.soundBtns[p[0]] = b;
        sndRow.appendChild(b);
      });
      sonA.appendChild(sndRow);

      /* prueba rápida de las voces de racha */
      sonA.appendChild(this.sectionTitle('VOCES DE RACHA'));
      var vRow = document.createElement('div');
      vRow.className = 'preset-row';
      CFG.VOICE_NAMES.forEach(function (name, i) {
        var b = self.makeButton((i + 1) + ' ' + name, function () {
          self.resumeAudio();
          if (window.AudioSys) AudioSys.playVoice(i);
        });
        b.classList.add('btn-preset');
        vRow.appendChild(b);
      });
      sonA.appendChild(vRow);
      this.voicesNote = document.createElement('div');
      this.voicesNote.className = 'note';
      sonA.appendChild(this.voicesNote);

      var sonB = this.optGroup(son, 'VOLUMEN POR TIPO');
      CFG.SOUND_CATS.forEach(function (c) {
        sonB.appendChild(self.makeSlider(c.key, c.name, 0, 1, 0.1,
          function (v) { return Math.round(v * 100) + '%'; }, true));
      });
      var volNote = document.createElement('div');
      volNote.className = 'note';
      volNote.textContent = 'EFECTOS: WAKA, FANTASMAS, FRUTA... · ' +
        'AMBIENTE: SIRENA Y MODO AZUL · VOCES: RACHA AL COMER FANTASMAS';
      sonB.appendChild(volNote);

      /* --- VOLVER (fuera de las pestañas) --- */
      var back = this.makeButton('VOLVER', function () {
        self.showMenu();
      });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);

      this.showOptionsTab('dificultad');
      this.refreshOptions();
    },

    showOptionsTab: function (name) {
      if (!this.tabPanes || !this.tabPanes[name]) return;
      this.optionsTab = name;
      for (var k in this.tabPanes) {
        if (!this.tabPanes.hasOwnProperty(k)) continue;
        this.tabPanes[k].style.display = (k === name) ? 'flex' : 'none';
        this.tabBtns[k].classList.toggle('active', k === name);
      }
      this.els.options.scrollTop = 0;
    },

    sectionTitle: function (text) {
      var d = document.createElement('div');
      d.className = 'section-title';
      d.textContent = text;
      return d;
    },

    /* Ficha de una sección de OPCIONES: su título y su contenido dentro de un
     * recuadro. En pantalla ancha las fichas de una pestaña se reparten en
     * columnas, en vez de irse todas una debajo de otra por el centro. */
    optGroup: function (pane, titulo, ancha) {
      var g = document.createElement('div');
      g.className = 'opt-group' + (ancha ? ' opt-wide' : '');
      if (titulo) g.appendChild(this.sectionTitle(titulo));
      pane.appendChild(g);
      return g;
    },

    /* Fila etiqueta + campo de texto para un nombre de jugador.
     * variant 'menu': versión grande de la portada. El mismo ajuste puede
     * tener varios campos (portada y opciones); se sincronizan entre sí. */
    makeNickRow: function (key, label, variant) {
      var self = this;
      var big = (variant === 'menu');
      var row = document.createElement('div');
      row.className = 'nick-row' + (big ? ' nick-row-menu' : '');

      var lab = document.createElement('label');
      lab.className = 'nick-label';
      lab.textContent = label;
      row.appendChild(lab);

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'nick-input' + (big ? ' nick-input-menu' : '');
      input.maxLength = CFG.NICK_MAX;
      input.placeholder = (key === 'nick2') ? 'J2' : 'J1';
      input.setAttribute('aria-label', label);
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('autocapitalize', 'characters');
      input.addEventListener('keydown', function (ev) {
        ev.stopPropagation();     // escribir no debe mover a Pac-Man
        if (ev.key === 'Enter') input.blur();
      });
      input.addEventListener('input', function () {
        var v = filterNick(input.value);
        if (v !== input.value) input.value = v;
        window.PM.settings[key] = v;
        saveSettings();
        self.refreshNicks(input);
      });
      input.addEventListener('blur', function () {
        var v = sanitizeNick(input.value);
        input.value = v;
        window.PM.settings[key] = v;
        saveSettings();
        self.refreshNicks();
      });
      /* En la portada, tu nombre va CON TU ASPECTO: tu Pac-Man al lado, con
       * su skin, su color, su accesorio y su efecto, moviéndose; y el nombre
       * escrito en tu color. Pulsarlo lleva al vestuario. */
      if (big && key === 'nick1') {
        var caja = document.createElement('div');
        caja.className = 'nick-caja';
        var look = document.createElement('canvas');
        look.width = 144; look.height = 144;
        look.className = 'nick-look';
        look.setAttribute('role', 'button');
        look.setAttribute('aria-label', 'Tu aspecto: abrir el vestuario');
        look.title = 'TU ASPECTO · ABRIR EL VESTUARIO';
        look.addEventListener('click', function () { self.showVestuario('skin', 'yo'); });
        caja.appendChild(look);
        caja.appendChild(input);
        row.appendChild(caja);
        this.nickLook = look;
        this.nickLookInput = input;
        /* el campo mide lo que el nombre: así aspecto y nombre van juntos y
         * centrados, sea el nombre corto o largo */
        input.addEventListener('input', function () { self.ajustarNickPortada(); });
        /* con cuenta el nombre no se escribe: pulsarlo lleva al PERFIL (el
         * campo bloqueado no recibe clics, así que se escucha en la caja) */
        caja.addEventListener('click', function (ev) {
          if (ev.target === look || !input.disabled) return;
          self.resumeAudio();
          self.showProfile();
        });
        this.pintarNickLook(0);
      } else {
        row.appendChild(input);
      }

      if (!this.nickInputs[key]) this.nickInputs[key] = [];
      this.nickInputs[key].push(input);
      return row;
    },

    /* Tu Pac-Man junto a tu nombre en la portada, con todo lo que llevas
     * puesto. t: segundos, para la boca y el efecto. */
    pintarNickLook: function (t, otro) {
      var cv = otro || this.nickLook, Sp = window.PM.Sprites;
      if (!cv || !Sp) return;
      var s = window.PM.settings, Tn = window.PM.Tienda;
      var color = s.pacColor || '#ffff00';
      var skin = (CFG.SKIN_IDS.indexOf(s.skin1) !== -1) ? s.skin1 : 'clasico';
      var acc = Tn ? Tn.accesorio() : '';
      var efx = Tn ? Tn.efecto() : '';
      var c = cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      c.imageSmoothingEnabled = false;
      /* 30 de lado lógico: sitio de sobra para el rastro del efecto (detrás)
       * y el accesorio (arriba), que con 20 se cortaban */
      var k = cv.width / 30;
      c.setTransform(k, 0, 0, k, 0, 0);
      var x = efx ? 18.5 : 15, y = acc ? 16.5 : 15;
      try {
        Sp.drawPacman(c, x, y, 3, [0, 1, 2, 1][Math.floor(t * 8) % 4], color, skin, {
          t: t, s: t * 20, giro: (t * 20) % 30, confeti: (t % 3) < 1.4 ? t % 3 : -1,
          back: function (d) { return { x: x - d, y: y, d: 3 }; },
          efecto: efx || null, accesorio: acc || null, team: [], estira: 1
        });
      } catch (e) { /* un dibujo raro no rompe la portada */ }
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (!otro && this.nickLookInput) this.nickLookInput.style.color = color;
    },

    /* Ancho del nombre de la portada según lo escrito (o el texto de ayuda) */
    ajustarNickPortada: function () {
      var inp = this.nickLookInput;
      if (!inp || !inp.style) return;
      var n = Math.max(3, String(inp.value || inp.placeholder || '').length);
      inp.style.fontSize = '';
      inp.style.width = 'calc(' + (n + 1) + 'ch + ' + (n * 2) + 'px)';
      /* un nombre muy largo no se corta: la letra baja hasta que quepa */
      if (!inp.clientWidth || !window.getComputedStyle) return;
      var px = parseFloat(window.getComputedStyle(inp).fontSize) || 14;
      for (var i = 0; i < 16 && inp.scrollWidth > inp.clientWidth && px > 7; i++) {
        px -= 0.5;
        inp.style.fontSize = px + 'px';
      }
    },

    /* Se mueve mientras la portada está a la vista, y nada más */
    animarNickLook: function () {
      var self = this, raf = window.requestAnimationFrame;
      if (!raf || this.nickLookAnim || !this.nickLook) return;
      this.nickLookAnim = true;
      var origen = Date.now();
      function paso() {
        var menu = self.els.menu;
        if (!menu || menu.style.display === 'none') { self.nickLookAnim = false; return; }
        var t = (Date.now() - origen) / 1000;
        self.pintarNickLook(t);
        self.pintarMarquesina(t);   // los fantasmas bajo el logo y el cursor
        self.pintarPortadas(t);     // los pósters de los modos
        self.pintarCartelera(t);    // y los de la sala online
        raf(paso);
      }
      raf(paso);
    },

    /* Refresca los campos de nombre (todos menos el que se está escribiendo).
     * Con la sesión abierta, el nombre del jugador 1 ES el de la cuenta: el
     * campo se enseña bloqueado para que no haya dos nombres que cuadrar. */
    refreshNicks: function (skip) {
      var s = window.PM.settings;
      var Ac = window.PM.Account;
      var fijo = !!(Ac && Ac.logged());
      if (fijo && Ac.name()) s.nick1 = Ac.name();
      for (var k in this.nickInputs) {
        if (!this.nickInputs.hasOwnProperty(k)) continue;
        var list = this.nickInputs[k];
        var bloquea = fijo && k === 'nick1';
        for (var i = 0; i < list.length; i++) {
          list[i].disabled = bloquea;
          list[i].title = bloquea ? 'TU NOMBRE ES EL DE TU CUENTA' : '';
          if (list[i] === skip || list[i] === document.activeElement) continue;
          list[i].value = s[k] || '';
          if (list[i] === this.nickLookInput) this.ajustarNickPortada();
        }
      }
    },

    /* ------------------------------------------------------
     * VESTUARIO
     *
     * El único sitio donde se viste al personaje. Antes estaba repartido en
     * tres: el color, el avatar y la skin puesta en PERFIL; todas las skins
     * en su vitrina; y accesorios, efectos y emotes se ponían en la TIENDA,
     * mezclado con comprar. Y en ninguno se veía solo lo que ya es tuyo.
     *
     * Dos reglas (aprobadas el 15 sep):
     *  1. Sale solo lo que tienes. "VER LO QUE ME FALTA" enseña el resto,
     *     apagado y con cómo se consigue.
     *  2. Pulsar es ponérselo. Lo que no es tuyo se PRUEBA: sale en el
     *     maniquí y en la ficha pone cómo se consigue (o se va a comprarlo).
     *
     * A la izquierda, el maniquí: tu Pac-Man corriendo con todo puesto y tus
     * seis emotes en sus teclas. A la derecha, una pestaña por cosa. La TIENDA
     * se queda solo para comprar.
     * ------------------------------------------------------ */
    VEST_TABS: [
      { id: 'skin', name: 'SKIN', j2: true },
      { id: 'color', name: 'COLOR', j2: true },
      { id: 'accesorio', name: 'ACCESORIO' },
      { id: 'efecto', name: 'EFECTO' },
      { id: 'emote', name: 'EMOTES' },
      { id: 'avatar', name: 'AVATAR' }
    ],

    VEST_VISTOS_KEY: 'pacman-topmundial-vestuario-vistos',

    /* Cómo se consigue cada skin (el `cat` de vestItems) */
    VEST_FILTROS: [
      { id: 'todas', name: 'TODAS' },
      { id: 'nivel', name: 'POR NIVEL', titulo: 'POR NIVEL · SUBIENDO DE NIVEL' },
      { id: 'logro', name: 'POR LOGRO', titulo: 'POR LOGRO · CON LOGROS Y MAESTRÍAS' },
      { id: 'rara', name: 'EXTRAVAGANTES', titulo: 'EXTRAVAGANTES · CON LOGROS' },
      { id: 'temporada', name: 'FECHAS ESPECIALES', titulo: 'FECHAS ESPECIALES · HALLOWEEN, NAVIDAD Y LUNA LLENA' },
      { id: 'tienda', name: 'DE TIENDA', titulo: 'DE TIENDA · CON MONEDAS' }
    ],

    /* ---------- lo que se ha visto ya (para las marcas de NUEVO) ----------
     * Una lista de claves "pestaña:id". La primera vez se siembra con todo lo
     * que ya tenías: quien llega con cuarenta cosas no quiere cuarenta
     * etiquetas de NUEVO, solo las de lo que consiga a partir de ahora. */
    vestVistos: function () {
      var d = null;
      try { d = JSON.parse(localStorage.getItem(this.VEST_VISTOS_KEY) || 'null'); }
      catch (e) { d = null; }
      if (Object.prototype.toString.call(d) === '[object Array]') return d;
      var todo = this.vestTodoLoTuyo();
      this.vestGuardarVistos(todo);
      return todo;
    },

    vestGuardarVistos: function (v) {
      try { localStorage.setItem(this.VEST_VISTOS_KEY, JSON.stringify(v)); }
      catch (e) { /* sin almacenamiento */ }
    },

    vestTodoLoTuyo: function () {
      var out = [];
      var self = this;
      ['skin', 'accesorio', 'efecto', 'emote'].forEach(function (tab) {
        self.vestItems(tab, 'yo').forEach(function (it) {
          if (it.tuyo && it.id) out.push(tab + ':' + it.id);
        });
      });
      return out;
    },

    /* Lo nuevo de todo el vestuario (el botón del menú lo cuenta) */
    vestNuevos: function () {
      var vistos = this.vestVistos();
      var n = 0;
      var todo = this.vestTodoLoTuyo();
      for (var i = 0; i < todo.length; i++) if (vistos.indexOf(todo[i]) === -1) n++;
      return n;
    },

    /* Da por vistas las marcadas como NUEVO en la pestaña que se deja */
    vestMarcarVistos: function () {
      var p = this.vestPendientes;
      this.vestPendientes = [];
      if (!p || !p.length) return;
      var vistos = this.vestVistos();
      for (var i = 0; i < p.length; i++) if (vistos.indexOf(p[i]) === -1) vistos.push(p[i]);
      this.vestGuardarVistos(vistos);
    },

    /* ---------- qué hay en cada pestaña ----------
     * Cada cosa: { id, name, ve, tuyo, puesto, como, pct, chip, tienda, precio }
     * `como` es lo que falta para tenerla (o su precio). */
    vestItems: function (tab, para) {
      var s = window.PM.settings;
      var Sk = window.PM.Skins, Tn = window.PM.Tienda;
      var out = [];
      if (tab === 'skin') {
        var key = (para === 'j2') ? 'skin2' : 'skin1';
        CFG.SKINS.forEach(function (sk) {
          var est = Sk ? Sk.estado(sk.id) : { abierta: sk.id === 'clasico', progreso: '', chip: '', pct: 0 };
          var puesto = (s[key] === sk.id);
          out.push({
            id: sk.id, name: sk.name, ve: sk.ve || '', chip: est.chip,
            // cómo se consigue (para clasificarlas): nivel, logro, rara, temporada, tienda
            cat: (sk.rara && sk.grupo === 'logro') ? 'rara' : sk.grupo,
            tuyo: est.abierta || puesto, puesto: puesto,
            como: est.abierta ? '' : est.progreso, pct: est.abierta ? 1 : est.pct,
            tienda: sk.grupo === 'tienda', precio: sk.precio || 0
          });
        });
        if (!out.some(function (it) { return it.puesto; })) {
          out.forEach(function (it) { if (it.id === 'clasico') it.puesto = true; });
        }
      } else if (tab === 'accesorio' || tab === 'efecto') {
        var lista = (tab === 'accesorio') ? CFG.ACCESORIOS : CFG.EFECTOS;
        var puesto0 = Tn ? (tab === 'accesorio' ? Tn.accesorio() : Tn.efecto()) : '';
        out.push({ id: '', name: 'NINGUNO', ve: tab === 'accesorio' ? 'SIN NADA ENCIMA' : 'SIN RASTRO AL PASAR',
          tuyo: true, puesto: !puesto0, como: '', pct: 1, chip: '' });
        lista.forEach(function (it) {
          var tuyo = !!(Tn && Tn.tiene(it.id));
          out.push({
            id: it.id, name: it.name, ve: it.ve || '', chip: tuyo ? 'COMPRADO' : 'TIENDA',
            tuyo: tuyo, puesto: tuyo && puesto0 === it.id,
            como: tuyo ? '' : ((Tn ? Tn.fmt(it.precio) : it.precio) + ' MONEDAS EN LA TIENDA'),
            pct: tuyo ? 1 : (Tn ? Math.min(1, Math.max(0, Tn.saldo()) / (it.precio || 1)) : 0),
            tienda: true, precio: it.precio
          });
        });
      } else if (tab === 'emote') {
        var tecla = this.vestTecla || 0;
        var caras = Tn ? Tn.emotes() : [];
        var base = CFG.EMOTES.map(function (e) { return e.id; });
        CFG.EMOTES.concat(CFG.EMOTES_TIENDA).forEach(function (e) {
          var esBase = base.indexOf(e.id) !== -1;
          var tuyo = esBase || !!(Tn && Tn.tiene(e.id));
          var enTecla = caras.indexOf(e.id);
          out.push({
            id: e.id, name: e.name, ve: e.ve || '', chip: esBase ? 'DE SIEMPRE' : (tuyo ? 'COMPRADO' : 'TIENDA'),
            tuyo: tuyo, puesto: caras[tecla] === e.id, tecla: enTecla,
            como: tuyo ? '' : ((Tn ? Tn.fmt(e.precio) : e.precio) + ' MONEDAS EN LA TIENDA'),
            pct: tuyo ? 1 : 0, tienda: !esBase, precio: e.precio || 0
          });
        });
      } else if (tab === 'avatar') {
        CFG.AVATARS.forEach(function (av) {
          out.push({ id: av.id, name: av.name, ve: '', chip: '', tuyo: true,
            puesto: s.avatar === av.id, como: '', pct: 1 });
        });
      }
      return out;
    },

    /* ---------- dibujo ---------- */
    /* La skin en pequeño, con tu color (las de estela llevan un trozo) */
    pintarSkinIcono: function (cv, id, color) {
      var c = cv.getContext('2d');
      var k = cv.width / 16;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      c.imageSmoothingEnabled = false;
      c.setTransform(k, 0, 0, k, cv.width / 2, cv.height / 2);
      var estela = !!CON_ESTELA[id];
      window.PM.Sprites.drawPacman(c, estela ? 3 : 0, 0, CFG.DIR.RIGHT, 2, color, id,
        estela ? {
          back: function (d) { return { x: 3 - d, y: 0, d: CFG.DIR.RIGHT }; },
          estira: 0.55, team: ['#ff0000', '#00ffff', '#00ff00']
        } : { icono: true });
      c.setTransform(1, 0, 0, 1, 0, 0);
    },

    /* El look que enseña el maniquí: lo puesto, o lo que se está probando */
    vestLook: function () {
      var s = window.PM.settings, Tn = window.PM.Tienda;
      var j2 = (this.vestPara === 'j2');
      var look = {
        skin: (CFG.SKIN_IDS.indexOf(s[j2 ? 'skin2' : 'skin1']) !== -1) ? s[j2 ? 'skin2' : 'skin1'] : 'clasico',
        color: s[j2 ? 'pac2Color' : 'pacColor'] || '#ffff00',
        accesorio: (!j2 && Tn) ? Tn.accesorio() : '',
        efecto: (!j2 && Tn) ? Tn.efecto() : ''
      };
      var p = this.vestProbando;
      if (p) {
        if (p.tab === 'skin') look.skin = p.id;
        else if (p.tab === 'accesorio') look.accesorio = p.id;
        else if (p.tab === 'efecto') look.efecto = p.id;
      }
      return look;
    },

    /* Una ficha: el dibujo de esa cosa puesta sobre tu personaje */
    pintarFichaVest: function (cv, tab, id) {
      var S = window.PM.Sprites, Sk = window.PM.Skins;
      var look = this.vestLook();
      var c = cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      c.imageSmoothingEnabled = false;
      if (tab === 'skin') { this.pintarSkinIcono(cv, id, look.color); return; }
      if (tab === 'avatar') { S.drawAvatar(c, cv.width / 2, cv.height / 2, cv.width * 0.4, id, look.color); return; }
      if (tab === 'emote') {
        S.drawPacFace(c, cv.width / 2, cv.height / 2 + 1, cv.width * 0.34, look.color, id, 0);
        return;
      }
      if (!Sk) return;
      /* accesorio y efecto: una foto fija de la escena de la vitrina, con la
       * lupa encima (así se ve igual que jugando) */
      if (!this.vestEscenaTmp) {
        this.vestEscenaTmp = document.createElement('canvas');
        this.vestEscenaTmp.width = Sk.ESCENA_W;
        this.vestEscenaTmp.height = Sk.ESCENA_H;
      }
      var skin = look.skin;
      if (tab === 'accesorio' && id && S.admiteAccesorio && !S.admiteAccesorio(skin)) skin = 'clasico';
      var opts = {
        accesorio: tab === 'accesorio' ? (id || null) : (look.accesorio || null),
        efecto: tab === 'efecto' ? (id || null) : null
      };
      var t = 1.4;
      var pos = Sk.escena(this.vestEscenaTmp, skin, look.color, t * 44, t, opts);
      Sk.lupa(cv, this.vestEscenaTmp, pos, tab === 'efecto' ? 5 : 0, 0);
    },

    /* ---------- montaje ---------- */
    buildVestuario: function () {
      var self = this;
      var o = this.els.vestuario;
      if (!o) return;
      o.innerHTML = '';
      this.colorRows = {};
      this.skinRows = {};           // ya no hay filas sueltas de skin: todo es de aquí

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'VESTUARIO';
      o.appendChild(h);

      var cuerpo = document.createElement('div');
      cuerpo.className = 'vest';
      o.appendChild(cuerpo);

      /* ===== el maniquí ===== */
      var man = document.createElement('div');
      man.className = 'vest-maniqui';
      cuerpo.appendChild(man);

      var para = document.createElement('div');
      para.className = 'tab-row tab-row-sub vest-para';
      this.vestParaBtns = {};
      [['yo', 'TÚ'], ['j2', 'JUGADOR 2 (LOCAL)']].forEach(function (p) {
        var b = self.makeButton(p[1], function () {
          self.vestMarcarVistos();
          self.vestPara = p[0];
          self.vestProbando = null;
          if (p[0] === 'j2' && !self.vestTabDe(self.vestTab).j2) self.vestTab = 'skin';
          self.refreshVestuario();
        });
        b.classList.add('tab');
        self.vestParaBtns[p[0]] = b;
        para.appendChild(b);
      });
      man.appendChild(para);

      var vistas = document.createElement('div');
      vistas.className = 'vest-vistas';
      this.vestLupa = document.createElement('canvas');
      this.vestLupa.width = 144; this.vestLupa.height = 144;
      this.vestLupa.className = 'vest-lupa';
      this.vestLupa.setAttribute('aria-label', 'Tu personaje, ampliado');
      this.vestEscena = document.createElement('canvas');
      this.vestEscena.width = 336; this.vestEscena.height = 144;
      this.vestEscena.className = 'vest-escena';
      this.vestEscena.setAttribute('aria-label', 'Tu personaje corriendo por un pasillo');
      vistas.appendChild(this.vestLupa);
      vistas.appendChild(this.vestEscena);
      man.appendChild(vistas);

      this.vestProbandoEl = document.createElement('div');
      this.vestProbandoEl.className = 'vest-probando';
      man.appendChild(this.vestProbandoEl);

      /* lo que llevas, pulsable: cada renglón abre su pestaña */
      this.vestLlevas = document.createElement('div');
      this.vestLlevas.className = 'vest-llevas';
      man.appendChild(this.vestLlevas);

      /* las seis teclas de emote */
      this.vestTeclasWrap = document.createElement('div');
      this.vestTeclasWrap.className = 'vest-teclas-wrap';
      var tt = document.createElement('div');
      tt.className = 'vest-mini-titulo';
      tt.textContent = 'TUS EMOTES · TECLAS 1 A 6';
      this.vestTeclasWrap.appendChild(tt);
      /* EL DIAL (17 sep 2026): las seis teclas en círculo, en un dial que gira
       * como una rueda de selección. El dial gira para dejar arriba la tecla elegida
       * y su cara sale en grande en el centro. */
      var teclas = document.createElement('div');
      teclas.className = 'vest-teclas vest-omni';
      var centro = document.createElement('div');
      centro.className = 'vest-omni-centro';
      this.vestOmniCv = document.createElement('canvas');
      this.vestOmniCv.width = 96; this.vestOmniCv.height = 96;
      centro.appendChild(this.vestOmniCv);
      this.vestOmniNum = document.createElement('span');
      this.vestOmniNum.className = 'vest-omni-num';
      centro.appendChild(this.vestOmniNum);
      teclas.appendChild(centro);
      this.vestOmni = teclas;
      this.vestTeclaBtns = [];
      for (var k = 0; k < CFG.TIENDA.EMOTE_TECLAS; k++) {
        (function (n) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'skin vest-tecla';
          b.style.setProperty('--i', String(n));
          var cv = document.createElement('canvas');
          cv.width = 40; cv.height = 40;
          b.appendChild(cv);
          var num = document.createElement('span');
          num.className = 'emote-num';
          num.textContent = String(n + 1);
          b.appendChild(num);
          b.addEventListener('click', function () {
            self.vestMarcarVistos();
            self.vestTecla = n;
            self.vestTab = 'emote';
            self.vestProbando = null;
            self.refreshVestuario();
          });
          teclas.appendChild(b);
          self.vestTeclaBtns.push({ btn: b, canvas: cv });
        })(k);
      }
      this.vestTeclasWrap.appendChild(teclas);
      man.appendChild(this.vestTeclasWrap);

      /* ===== el armario ===== */
      var arm = document.createElement('div');
      arm.className = 'vest-armario';
      cuerpo.appendChild(arm);

      var bar = document.createElement('div');
      bar.className = 'tab-row vest-tabs';
      this.vestTabBtns = {};
      this.VEST_TABS.forEach(function (t) {
        var b = self.makeButton(t.name, function () {
          self.vestMarcarVistos();
          self.vestTab = t.id;
          self.vestProbando = null;
          self.vestAvisa('');
          self.refreshVestuario();
        });
        b.classList.add('tab');
        self.vestTabBtns[t.id] = b;
        bar.appendChild(b);
      });
      arm.appendChild(bar);

      var util = document.createElement('div');
      util.className = 'vest-util';
      this.vestCuenta = document.createElement('span');
      this.vestCuenta.className = 'vest-cuenta';
      util.appendChild(this.vestCuenta);
      /* Los filtros son desplegables: QUÉ SE VE (todo o solo lo tuyo; de
       * entrada, todo) y, en SKIN, por cómo se consiguen. */
      var filtros = document.createElement('div');
      filtros.className = 'vest-desps';
      util.appendChild(filtros);
      var dVer = this.desplegable('VER', [
        { id: 'todo', name: 'TODO' }, { id: 'mio', name: 'SOLO LO QUE TENGO' }
      ], function (id) {
        self.vestFaltan = (id === 'todo');
        self.refreshVestuario();
      });
      this.vestFaltanBtn = dVer.el;
      this.vestVerDesp = dVer;
      filtros.appendChild(dVer.el);

      /* SKIN: clasificarlas por cómo se consiguen. En TODAS salen agrupadas
       * con su título. */
      var dSkin = this.desplegable('TIPO', this.VEST_FILTROS.map(function (fl) {
        return { id: fl.id, name: fl.name };
      }), function (id) {
        self.vestFiltro = id;
        self.vestProbando = null;
        self.refreshVestuario();
      });
      this.vestFiltrosEl = dSkin.el;
      this.vestFiltroBtns = dSkin.btns;
      this.vestFiltroDesp = dSkin;
      filtros.appendChild(dSkin.el);
      arm.appendChild(util);

      this.vestAviso = document.createElement('div');
      this.vestAviso.className = 'vest-aviso';
      arm.appendChild(this.vestAviso);

      /* La pestaña COLOR: una ficha por color con tu skin pintada de ese
       * color (antes eran ocho cuadraditos sueltos y no se veía qué hacían),
       * y la última, un color a tu gusto. Una rejilla por jugador. */
      this.vestColor = document.createElement('div');
      this.vestColor.className = 'vest-color';
      this.vestColorYo = this.makeColorTiles('pacColor');
      this.vestColorJ2 = this.makeColorTiles('pac2Color');
      this.vestColor.appendChild(this.vestColorYo);
      this.vestColor.appendChild(this.vestColorJ2);
      var cn = document.createElement('div');
      cn.className = 'note vest-color-nota';
      cn.textContent = 'EL COLOR TIÑE TU PAC-MAN, TU SKIN Y TU AVATAR, Y ES EL QUE VE EL RESTO EN LA SALA';
      this.vestColor.appendChild(cn);
      arm.appendChild(this.vestColor);

      this.vestGrid = document.createElement('div');
      this.vestGrid.className = 'vest-grid';
      arm.appendChild(this.vestGrid);

      /* la ficha de lo último pulsado */
      this.vestFicha = document.createElement('div');
      this.vestFicha.className = 'vest-ficha';
      arm.appendChild(this.vestFicha);

      var back = this.makeButton('VOLVER', function () { self.closeVestuario(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);

      this.vestTab = 'skin';
      this.vestPara = 'yo';
      this.vestTecla = 0;
      this.vestFaltan = true;          // de entrada se ve todo, también lo que falta
      this.vestFiltro = 'todas';
      this.vestProbando = null;
      this.vestFoco = null;
      this.vestPendientes = [];
    },

    VEST_COLORES: {
      '#ffff00': 'AMARILLO', '#ff0000': 'ROJO', '#00ffff': 'CIAN', '#00ff00': 'VERDE',
      '#ff69b4': 'ROSA', '#ff8c00': 'NARANJA', '#b19cd9': 'LAVANDA', '#ffffff': 'BLANCO'
    },

    /* Las fichas de color de un jugador. Se registran en colorRows como las
     * filas de muestras de antes (swatches con data-color + el selector
     * libre), así que refreshColorRows y setColor valen igual. */
    makeColorTiles: function (key) {
      var self = this;
      var grid = document.createElement('div');
      grid.className = 'vest-grid vest-color-grid';
      var tiles = [], dibujos = [];
      CFG.PAC_SWATCHES.forEach(function (hex) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'vest-tile vest-color-tile';
        b.setAttribute('data-color', hex);
        var nombre = self.VEST_COLORES[hex] || hex.toUpperCase();
        b.setAttribute('aria-label', 'Color ' + nombre);
        var cv = document.createElement('canvas');
        cv.width = 96; cv.height = 96;
        b.appendChild(cv);
        var nm = document.createElement('span');
        nm.className = 'vest-tile-name';
        nm.textContent = nombre;
        b.appendChild(nm);
        var tag = document.createElement('span');
        tag.className = 'vest-tile-tag vest-color-muestra';
        tag.style.background = hex;
        b.appendChild(tag);
        b.addEventListener('click', function () { self.setColor(key, hex); });
        grid.appendChild(b);
        tiles.push(b);
        dibujos.push({ hex: hex, cv: cv });
      });
      /* el color a tu gusto: la ficha entera abre el selector del sistema */
      var libre = document.createElement('label');
      libre.className = 'vest-tile vest-color-tile vest-color-libre';
      var lcv = document.createElement('canvas');
      lcv.width = 96; lcv.height = 96;
      libre.appendChild(lcv);
      var lnm = document.createElement('span');
      lnm.className = 'vest-tile-name';
      lnm.textContent = 'A TU GUSTO';
      libre.appendChild(lnm);
      var ltag = document.createElement('span');
      ltag.className = 'vest-tile-tag';
      libre.appendChild(ltag);
      var input = document.createElement('input');
      input.type = 'color';
      input.className = 'vest-color-input';
      input.setAttribute('aria-label', 'Elegir un color a tu gusto');
      input.addEventListener('input', function () { self.setColor(key, input.value); });
      libre.appendChild(input);
      grid.appendChild(libre);
      this.colorRows[key] = { swatches: tiles, input: input };
      this.vestColorDibujos = this.vestColorDibujos || {};
      this.vestColorDibujos[key] = { tiles: dibujos, libre: { el: libre, cv: lcv, tag: ltag } };
      return grid;
    },

    /* Repinta las fichas de color con la skin puesta de ese jugador */
    pintarColorTiles: function (key) {
      var d = this.vestColorDibujos && this.vestColorDibujos[key];
      if (!d) return;
      var s = window.PM.settings;
      var skinKey = (key === 'pac2Color') ? 'skin2' : 'skin1';
      var skin = (CFG.SKIN_IDS.indexOf(s[skinKey]) !== -1) ? s[skinKey] : 'clasico';
      for (var i = 0; i < d.tiles.length; i++) this.pintarSkinIcono(d.tiles[i].cv, skin, d.tiles[i].hex);
      var actual = String(s[key] || '#ffff00').toLowerCase();
      var esLibre = CFG.PAC_SWATCHES.indexOf(actual) === -1;
      this.pintarSkinIcono(d.libre.cv, skin, esLibre ? actual : '#888888');
      d.libre.el.classList.toggle('active', esLibre);
      d.libre.tag.textContent = esLibre ? actual.toUpperCase() : 'PULSA Y ELIGE';
      d.libre.tag.style.color = esLibre ? actual : '';
    },

    vestTabDe: function (id) {
      for (var i = 0; i < this.VEST_TABS.length; i++) if (this.VEST_TABS[i].id === id) return this.VEST_TABS[i];
      return this.VEST_TABS[0];
    },

    /* tab: 'skin' | 'color' | 'accesorio' | 'efecto' | 'emote' | 'avatar'
     * para: 'yo' | 'j2'. Se vuelve al panel desde el que se abrió. */
    showVestuario: function (tab, para, foco) {
      var self = this;
      if (!this.els.vestuario) return;
      var abierto = this.visiblePanel();
      if (abierto !== this.els.vestuario &&
          !(abierto === this.els.tienda && this.tiendaVolver === 'vestuario')) {
        this.vestVolver = (abierto === this.els.options) ? 'options'
          : (abierto === this.els.profile) ? 'profile'
          : (abierto === this.els.tienda) ? 'tienda' : 'menu';
      }
      this.vestPara = (para === 'j2') ? 'j2' : 'yo';
      if (tab) this.vestTab = tab;
      if (this.vestPara === 'j2' && !this.vestTabDe(this.vestTab).j2) this.vestTab = 'skin';
      this.vestProbando = null;
      this.vestFoco = foco || null;
      this.vestAvisa('');
      this.refreshVestuario();
      this.showPanel('vestuario');
      this.els.vestuario.scrollTop = 0;
      this.animarVestuario();
      // DORADO se abre al verse en el top 10: se mira una vez, sin molestar
      if (window.PM.Skins) {
        window.PM.Skins.comprobarTop10(function () { self.refreshVestuario(); });
      }
    },

    closeVestuario: function () {
      this.vestMarcarVistos();
      this.vestProbando = null;
      var v = this.vestVolver;
      if (v === 'options') this.showOptions();
      else if (v === 'profile') this.showProfile();
      else if (v === 'tienda') this.showTienda();
      else this.showMenu();
    },

    /* Las de antes siguen funcionando: abren el vestuario en su pestaña */
    showSkins: function (key) { this.showVestuario('skin', key === 'skin2' ? 'j2' : 'yo'); },

    vestAvisa: function (texto, error) {
      if (!this.vestAviso) return;
      this.vestAviso.textContent = texto || '';
      this.vestAviso.classList.toggle('error', !!error);
    },

    /* ---------- pulsar una ficha ---------- */
    vestPulsa: function (tab, it) {
      var s = window.PM.settings, Tn = window.PM.Tienda;
      var clave = tab + ':' + it.id;
      if (this.vestPendientes.indexOf(clave) === -1 && it.id) this.vestPendientes.push(clave);
      this.vestFoco = it.id;
      if (!it.tuyo) {
        /* no es tuyo: se prueba en el maniquí y la ficha dice cómo se consigue */
        this.vestProbando = { tab: tab, id: it.id };
        this.vestAvisa('');
        this.refreshVestuario();
        return;
      }
      this.vestProbando = null;
      var sync = false;
      if (tab === 'skin') {
        s[this.vestPara === 'j2' ? 'skin2' : 'skin1'] = it.id;
        saveSettings();
        sync = true;
        this.vestAvisa((this.vestPara === 'j2' ? 'EL JUGADOR 2 LLEVA ' : 'LLEVAS ') + it.name, false);
      } else if (tab === 'accesorio' || tab === 'efecto') {
        Tn.poner(tab, it.id);
        var aviso = it.id ? ('LLEVAS ' + it.name) : (tab === 'accesorio' ? 'SIN ACCESORIO' : 'SIN EFECTO');
        if (tab === 'accesorio' && it.id && window.PM.Sprites.admiteAccesorio &&
            !window.PM.Sprites.admiteAccesorio(s.skin1)) {
          aviso += ' · CON TU SKIN NO SE VE: PONTE UNA CON FORMA DE PAC-MAN';
        }
        this.vestAvisa(aviso, false);
      } else if (tab === 'emote') {
        Tn.ponerEmote(this.vestTecla || 0, it.id);
        this.vestAvisa(it.name + ' VA EN LA TECLA ' + ((this.vestTecla || 0) + 1), false);
      } else if (tab === 'avatar') {
        s.avatar = it.id;
        saveSettings();
        sync = true;
        this.vestAvisa('TU AVATAR ES ' + it.name, false);
      }
      if (sync && window.PM.Account && window.PM.Account.logged()) window.PM.Account.pushQuiet();
      this.refreshVestuario();
      this.refreshPerfilLook();
    },

    /* ---------- pintar el panel ---------- */
    refreshVestuario: function () {
      var self = this;
      if (!this.vestGrid) return;
      var s = window.PM.settings, Tn = window.PM.Tienda, Sk = window.PM.Skins;
      var j2 = (this.vestPara === 'j2');
      var tab = this.vestTab || 'skin';

      for (var p in this.vestParaBtns) {
        if (this.vestParaBtns.hasOwnProperty(p)) this.vestParaBtns[p].classList.toggle('active', p === this.vestPara);
      }
      var vistos = this.vestVistos();
      this.VEST_TABS.forEach(function (t) {
        var b = self.vestTabBtns[t.id];
        b.style.display = (j2 && !t.j2) ? 'none' : '';
        b.classList.toggle('active', t.id === tab);
        // la pestaña con cosas nuevas lleva su punto
        var nuevas = 0;
        if (!j2 && t.id !== 'color' && t.id !== 'avatar') {
          self.vestItems(t.id, 'yo').forEach(function (it) {
            if (it.tuyo && it.id && vistos.indexOf(t.id + ':' + it.id) === -1) nuevas++;
          });
        }
        b.textContent = t.name + (nuevas ? ' •' : '');
        b.classList.toggle('vest-tab-nueva', nuevas > 0);
      });

      /* ----- el maniquí ----- */
      var look = this.vestLook();
      this.vestTeclasWrap.style.display = j2 ? 'none' : '';
      var pr = this.vestProbando;
      this.vestProbandoEl.textContent = pr ? 'PROBÁNDOTE ALGO QUE AÚN NO TIENES' : (j2 ? 'ASÍ VA EL JUGADOR 2' : 'ASÍ TE VEN');
      this.vestProbandoEl.classList.toggle('on', !!pr);
      this.vestLlevas.innerHTML = '';
      var nombreSkin = Sk && Sk.info(look.skin) ? Sk.info(look.skin).name : look.skin.toUpperCase();
      var filas = [['skin', 'SKIN', nombreSkin], ['color', 'COLOR', '']];
      if (!j2) {
        var nombreDe = function (id) { var x = Tn && Tn.item(id); return x ? x.name : 'NINGUNO'; };
        filas.push(['accesorio', 'ACCESORIO', nombreDe(look.accesorio)]);
        filas.push(['efecto', 'EFECTO', nombreDe(look.efecto)]);
        var av = CFG.AVATARS.filter(function (a) { return a.id === s.avatar; })[0];
        filas.push(['avatar', 'AVATAR', av ? av.name : '']);
      }
      filas.forEach(function (f) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'vest-llevas-fila' + (f[0] === tab ? ' active' : '') +
          (pr && pr.tab === f[0] ? ' prueba' : '');   // lo que te estás probando, en rosa
        var k = document.createElement('span');
        k.className = 'k';
        k.textContent = f[1];
        b.appendChild(k);
        var v = document.createElement('span');
        v.className = 'v';
        if (f[0] === 'color') {
          var m = document.createElement('i');
          m.className = 'vest-muestra';
          m.style.background = look.color;
          v.appendChild(m);
          v.appendChild(document.createTextNode(String(look.color).toUpperCase()));
        } else {
          v.textContent = f[2];
        }
        b.appendChild(v);
        b.addEventListener('click', function () {
          self.vestMarcarVistos();
          self.vestTab = f[0];
          self.vestProbando = null;
          self.refreshVestuario();
        });
        self.vestLlevas.appendChild(b);
      });
      if (!j2 && look.accesorio && window.PM.Sprites.admiteAccesorio &&
          !window.PM.Sprites.admiteAccesorio(look.skin)) {
        var nota = document.createElement('div');
        nota.className = 'vest-nota-acc';
        nota.textContent = 'TU ACCESORIO NO SE VE CON UNA SKIN EXTRAVAGANTE';
        this.vestLlevas.appendChild(nota);
      }

      /* ----- el armario ----- */
      var esColor = (tab === 'color');
      this.vestColor.style.display = esColor ? '' : 'none';
      this.vestColorYo.style.display = j2 ? 'none' : '';
      this.vestColorJ2.style.display = j2 ? '' : 'none';
      this.refreshColorRows();
      if (esColor) this.pintarColorTiles(j2 ? 'pac2Color' : 'pacColor');
      this.vestGrid.style.display = esColor ? 'none' : '';
      this.vestFicha.style.display = esColor ? 'none' : '';
      var conFaltan = (tab === 'skin' || tab === 'accesorio' || tab === 'efecto' || tab === 'emote');
      this.vestFaltanBtn.style.display = conFaltan ? '' : 'none';
      this.vestVerDesp.poner(this.vestFaltan ? 'todo' : 'mio');
      this.vestGrid.classList.toggle('es-emote', tab === 'emote');
      this.vestFiltrosEl.style.display = (tab === 'skin') ? '' : 'none';

      this.vestGrid.innerHTML = '';
      this.vestFichas = [];
      if (esColor) {
        this.vestCuenta.textContent = j2 ? 'EL COLOR DEL JUGADOR 2' : 'TU COLOR';
        return;
      }
      if (tab === 'emote') {
        var tec = document.createElement('div');
        tec.className = 'vest-emote-guia';
        tec.textContent = 'ELIGE LA TECLA A LA IZQUIERDA Y LUEGO LA CARA · AHORA: TECLA ' + ((this.vestTecla || 0) + 1);
        this.vestGrid.appendChild(tec);
      }
      var items = this.vestItems(tab, this.vestPara);
      /* SKIN: la clasificación por cómo se consiguen */
      var filtro = (tab === 'skin') ? (this.vestFiltro || 'todas') : 'todas';
      if (tab === 'skin') {
        var todasSk = items;
        this.VEST_FILTROS.forEach(function (fl) {
          var de = (fl.id === 'todas') ? todasSk : todasSk.filter(function (it) { return it.cat === fl.id; });
          var mias = de.filter(function (it) { return it.tuyo; }).length;
          var fb = self.vestFiltroBtns[fl.id];
          fb.textContent = fl.name + ' · ' + mias + '/' + de.length;
          fb.classList.toggle('active', fl.id === filtro);
          if (fl.id === filtro) self.vestFiltroDesp.rotulo(fl.name + ' · ' + mias + '/' + de.length);
        });
        if (filtro !== 'todas') items = items.filter(function (it) { return it.cat === filtro; });
      }
      var tuyos = items.filter(function (it) { return it.tuyo && it.id; }).length;
      var total = items.filter(function (it) { return it.id; }).length;
      this.vestCuenta.textContent = (tab === 'avatar') ? (total + ' AVATARES')
        : ('TIENES ' + tuyos + ' DE ' + total);
      /* primero lo tuyo; lo que falta, detrás y solo si se pide */
      var ordenar = function (lista) {
        return lista.filter(function (it) { return it.tuyo; })
          .concat(self.vestFaltan ? lista.filter(function (it) { return !it.tuyo; }) : []);
      };
      var orden;
      if (tab === 'skin' && filtro === 'todas') {
        /* todas, pero agrupadas: un título por forma de conseguirlas */
        orden = [];
        this.VEST_FILTROS.forEach(function (fl) {
          if (fl.id === 'todas') return;
          var de = items.filter(function (it) { return it.cat === fl.id; });
          var visibles = ordenar(de);
          if (!visibles.length) return;
          orden.push({ seccion: fl, mias: de.filter(function (it) { return it.tuyo; }).length, total: de.length });
          orden = orden.concat(visibles);
        });
      } else {
        orden = ordenar(items);
      }
      var focoIt = null;
      orden.forEach(function (it) {
        if (it.seccion) {
          var sec = document.createElement('div');
          sec.className = 'vest-seccion';
          sec.textContent = it.seccion.titulo + ' · ' + it.mias + '/' + it.total;
          self.vestGrid.appendChild(sec);
          return;
        }
        var nuevo = !j2 && it.tuyo && it.id && tab !== 'avatar' && vistos.indexOf(tab + ':' + it.id) === -1;
        if (nuevo && self.vestPendientes.indexOf(tab + ':' + it.id) === -1) self.vestPendientes.push(tab + ':' + it.id);
        var probando = !!(pr && pr.tab === tab && pr.id === it.id);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'vest-tile' + (it.puesto ? ' puesto' : '') + (!it.tuyo ? ' bloqueado' : '') +
          (nuevo ? ' nuevo' : '') + (probando ? ' probando' : '');
        b.title = it.name + (it.ve ? ' · ' + it.ve : '') + (it.como ? ' · ' + it.como : '');
        b.setAttribute('aria-label', it.name + (it.puesto ? ', puesto' : '') + (!it.tuyo ? ', no lo tienes' : ''));
        var cv = document.createElement('canvas');
        cv.width = 96; cv.height = 96;
        b.appendChild(cv);
        var nm = document.createElement('span');
        nm.className = 'vest-tile-name';
        nm.textContent = it.name;
        b.appendChild(nm);
        var tag = document.createElement('span');
        tag.className = 'vest-tile-tag';
        tag.textContent = it.puesto ? (tab === 'emote' ? 'TECLA ' + ((self.vestTecla || 0) + 1) : 'PUESTO')
          : nuevo ? 'NUEVO'
          : (tab === 'emote' && it.tecla >= 0) ? ('TECLA ' + (it.tecla + 1))
          : !it.tuyo ? (it.tienda ? (Tn ? Tn.fmt(it.precio) : it.precio) + ' ◎' : 'BLOQUEADA')
          : '';
        b.appendChild(tag);
        b.addEventListener('click', function () { self.vestPulsa(tab, it); });
        self.vestGrid.appendChild(b);
        self.pintarFichaVest(cv, tab, it.id);
        self.vestFichas.push({ it: it, btn: b });
        if ((self.vestFoco != null && it.id === self.vestFoco) || (!focoIt && it.puesto)) focoIt = it;
      });
      if (self.vestFoco != null) {
        var f = items.filter(function (it) { return it.id === self.vestFoco; })[0];
        if (f) focoIt = f;
      }
      if (!orden.length || (orden.length === 1 && orden[0].id === '' && !this.vestFaltan)) {
        var vacio = document.createElement('div');
        vacio.className = 'vest-vacio';
        vacio.textContent = 'AÚN NO TIENES NINGUNO · EN VER, ELIGE TODO O PASA POR LA TIENDA';
        this.vestGrid.appendChild(vacio);
      }
      this.pintarFichaDetalle(tab, focoIt);
    },

    /* La ficha de abajo: qué es, si es tuyo y, si no, cómo se consigue */
    pintarFichaDetalle: function (tab, it) {
      var self = this;
      var f = this.vestFicha;
      f.innerHTML = '';
      if (!it) { f.style.display = 'none'; return; }
      f.style.display = '';
      var cab = document.createElement('div');
      cab.className = 'vest-ficha-cab';
      var nm = document.createElement('span');
      nm.className = 'vest-ficha-nombre';
      nm.textContent = it.name;
      cab.appendChild(nm);
      if (it.chip) {
        var ch = document.createElement('span');
        ch.className = 'skin-chip' + (it.tienda ? ' tienda' : '');
        ch.textContent = it.chip;
        cab.appendChild(ch);
      }
      f.appendChild(cab);
      if (it.ve) {
        var ve = document.createElement('div');
        ve.className = 'skin-ve';
        ve.textContent = it.ve;
        f.appendChild(ve);
      }
      var fila = document.createElement('div');
      fila.className = 'vest-ficha-fila';
      if (it.tuyo) {
        var est = document.createElement('span');
        est.className = 'vest-ficha-estado';
        est.textContent = it.puesto ? 'LO LLEVAS PUESTO' : 'ES TUYO · PÚLSALO ARRIBA PARA PONÉRTELO';
        fila.appendChild(est);
      } else {
        var prog = document.createElement('div');
        prog.className = 'skin-prog';
        var barra = document.createElement('div');
        barra.className = 'level-bar';
        var fill = document.createElement('div');
        fill.className = 'level-fill';
        fill.style.width = Math.round((it.pct || 0) * 100) + '%';
        barra.appendChild(fill);
        prog.appendChild(barra);
        var txt = document.createElement('span');
        txt.textContent = it.como || 'BLOQUEADA';
        prog.appendChild(txt);
        fila.appendChild(prog);
        if (it.tienda) {
          var cat = (tab === 'skin') ? 'skin' : tab;
          var ir = this.makeButton('COMPRAR EN LA TIENDA', function () {
            self.vestMarcarVistos();
            self.showTienda(cat);
          });
          ir.classList.add('btn-preset');
          fila.appendChild(ir);
        }
      }
      /* la misma ficha que en la tienda: verlo en movimiento */
      if (it.id && (tab === 'skin' || tab === 'accesorio' || tab === 'efecto' || tab === 'emote')) {
        var mov = this.makeButton('VERLO EN MOVIMIENTO', function () {
          self.vestMarcarVistos();
          self.abrirFicha(tab, it.id, 'vestuario');
        });
        mov.classList.add('btn-preset');
        fila.appendChild(mov);
      }
      var AS = window.AudioSys;
      if (tab === 'skin' && AS && AS.tieneWaka && AS.tieneWaka(it.id)) {
        var oir = this.makeButton('ESCUCHAR', function () {
          self.resumeAudio();
          for (var n = 0; n < 4; n++) {
            setTimeout(function () { window.AudioSys.playWaka(it.id); }, n * 135);
          }
        });
        oir.classList.add('btn-preset');
        fila.appendChild(oir);
      }
      f.appendChild(fila);
    },

    /* El maniquí se mueve mientras el vestuario está abierto, y nada más */
    animarVestuario: function () {
      var self = this;
      var Sk = window.PM.Skins, S = window.PM.Sprites, Tn = window.PM.Tienda;
      if (!Sk || !this.vestEscena || this.vestAnim) return;
      var raf = window.requestAnimationFrame;
      if (!raf) return;
      this.vestAnim = true;
      var origen = Date.now();
      function paso() {
        var panel = self.els.vestuario;
        if (!panel || panel.style.display === 'none') { self.vestAnim = false; return; }
        var t = (Date.now() - origen) / 1000;
        var look = self.vestLook();
        var skin = look.skin;
        var pos = Sk.escena(self.vestEscena, skin, look.color, t * 44, t, {
          accesorio: look.accesorio || null,
          efecto: look.efecto || null,
          team: ['#ff0000', '#00ffff', '#00ff00']
        });
        Sk.lupa(self.vestLupa, self.vestEscena, pos, look.efecto ? 4 : 0);
        if (self.vestPara !== 'j2' && Tn && self.vestTeclaBtns) {
          var caras = Tn.emotes();
          for (var i = 0; i < self.vestTeclaBtns.length; i++) {
            var tb = self.vestTeclaBtns[i];
            tb.btn.classList.toggle('active', self.vestTab === 'emote' && i === (self.vestTecla || 0));
            tb.btn.title = 'TECLA ' + (i + 1) + ' · ' + Tn.nombreEmote(caras[i]);
            var c = tb.canvas.getContext('2d');
            c.setTransform(1, 0, 0, 1, 0, 0);
            c.clearRect(0, 0, 40, 40);
            c.imageSmoothingEnabled = false;
            S.drawPacFace(c, 20, 21, 13, look.color, caras[i], t * 60);
          }
          /* el dial: gira hasta la tecla elegida y la enseña en el centro */
          var sel = self.vestTecla || 0;
          if (self.vestOmni && self.vestOmniSel !== sel) {
            self.vestOmniSel = sel;
            self.vestOmni.style.setProperty('--giro', (-sel * 60) + 'deg');
            self.vestOmniNum.textContent = String(sel + 1);
          }
          if (self.vestOmniCv) {
            var oc = self.vestOmniCv.getContext('2d');
            oc.setTransform(1, 0, 0, 1, 0, 0);
            oc.clearRect(0, 0, 96, 96);
            oc.imageSmoothingEnabled = false;
            S.drawPacFace(oc, 48, 50, 34, look.color, caras[sel], t * 60);
          }
        }
        raf(paso);
      }
      raf(paso);
    },

    /* PERFIL enseña tu personaje en pequeño y lleva al vestuario */
    refreshPerfilLook: function () {
      if (!this.profLookCv) return;
      var s = window.PM.settings, Tn = window.PM.Tienda, Sk = window.PM.Skins;
      var skin = (CFG.SKIN_IDS.indexOf(s.skin1) !== -1) ? s.skin1 : 'clasico';
      this.pintarNickLook(0, this.profLookCv);
      var nombreDe = function (id) { var x = Tn && Tn.item(id); return x ? x.name : 'NINGUNO'; };
      var info = Sk && Sk.info(skin);
      this.profLook.textContent = 'SKIN ' + (info ? info.name : skin.toUpperCase()) +
        ' · ACCESORIO ' + nombreDe(Tn ? Tn.accesorio() : '') +
        ' · EFECTO ' + nombreDe(Tn ? Tn.efecto() : '');
      if (this.profVestBtn) {
        var n = this.vestNuevos();
        this.profVestBtn.textContent = 'ABRIR EL VESTUARIO' + (n ? ' · ' + n + (n === 1 ? ' NUEVO' : ' NUEVOS') : '');
      }
    },

    /* Lo que antes repintaba las filas de skin: ahora es el vestuario y la
     * miniatura de PERFIL (se llama desde varios sitios al cambiar el nivel) */
    refreshSkins: function () {
      this.refreshPerfilLook();
      if (this.els.vestuario && this.els.vestuario.style.display !== 'none') this.refreshVestuario();
    },

    /* El botón del cuartel cuenta lo que tienes sin estrenar */
    refreshVestBtn: function () {
      if (!this.menuVestBtn) return;
      var n = this.vestNuevos();
      this.menuVestBtn.textContent = 'VESTUARIO' + (n ? ' · ' + n + (n === 1 ? ' NUEVO' : ' NUEVOS') : '');
      this.menuVestBtn.classList.toggle('vest-btn-nuevo', n > 0);
    },

    /* ------------------------------------------------------
     * TIENDA
     *
     * Una tienda de MONEDAS: el precio nunca va suelto, siempre con su moneda
     * y comparado con lo que tienes. Tres columnas en ancho —secciones,
     * artículos y el TICKET— y una sola en el móvil.
     *
     *  - Se compra como en un kiosco: el + de cada ficha la echa al ticket, y
     *    el ticket resta a la vista (tus monedas, cada cosa, lo que te queda).
     *    Pagar es un paso aparte, así que un toque sin querer no se lleva
     *    1.500 monedas.
     *  - Arriba, una META: lo más barato que aún no puedes pagar, con lo que
     *    te falta en PARTIDAS, que es lo que se quiere empujar.
     *  - Pulsar una cosa abre su FICHA (abrirFicha): verla en movimiento,
     *    añadirla al ticket o comprarla y ponértela de un golpe.
     * ------------------------------------------------------ */
    buildTienda: function () {
      var self = this;
      var o = this.els.tienda;
      var Tn = window.PM.Tienda;
      if (!o || !Tn) return;
      o.innerHTML = '';

      /* ----- cabecera: el monedero ----- */
      var cab = document.createElement('div');
      cab.className = 'tn-cab';
      var h = document.createElement('div');
      h.className = 'panel-title tn-titulo';
      h.textContent = 'TIENDA';
      cab.appendChild(h);
      var cartera = document.createElement('div');
      cartera.className = 'tn-cartera';
      cartera.setAttribute('aria-label', 'Tus monedas');
      cartera.appendChild(this.monedaEl('grande'));
      this.tiendaSaldo = document.createElement('b');
      cartera.appendChild(this.tiendaSaldo);
      cab.appendChild(cartera);
      this.tiendaRitmo = document.createElement('div');
      this.tiendaRitmo.className = 'tn-ritmo';
      cab.appendChild(this.tiendaRitmo);
      o.appendChild(cab);

      /* El regalo de veterano, dicho: si no, quien entra y ve 6.000 monedas
       * no sabe de dónde han salido. Solo sale si hay regalo. */
      this.tiendaRegalo = document.createElement('div');
      this.tiendaRegalo.className = 'tienda-regalo';
      o.appendChild(this.tiendaRegalo);

      var TC = CFG.TIENDA;
      var gana = document.createElement('div');
      gana.className = 'note tienda-gana';
      gana.textContent = 'SE GANAN JUGANDO: ' + TC.POR_PARTIDA + ' POR PARTIDA DE AL MENOS UN MINUTO + ' +
        TC.POR_MIL + ' POR CADA 1.000 PUNTOS (HASTA ' + TC.TOPE_PARTIDA + ') · ' +
        TC.POR_RETO + ' POR CADA RETO DEL DAILY · ' + TC.POR_SEMANA + ' POR LA SEMANA ENTERA';
      o.appendChild(gana);

      var cuerpo = document.createElement('div');
      cuerpo.className = 'tn';
      o.appendChild(cuerpo);

      /* ----- secciones ----- */
      var nav = document.createElement('div');
      nav.className = 'tn-nav';
      this.tiendaTabBtns = {};
      Tn.CATEGORIAS.forEach(function (c) {
        var b = self.makeButton(c.name, function () {
          self.tiendaTab = c.id;
          self.tiendaAviso('');
          self.refreshTienda();
        });
        b.classList.add('tab', 'tn-sec');
        self.tiendaTabBtns[c.id] = b;
        nav.appendChild(b);
      });
      cuerpo.appendChild(nav);

      /* ----- centro: meta, utilidades y artículos ----- */
      var centro = document.createElement('div');
      centro.className = 'tn-centro';
      cuerpo.appendChild(centro);

      this.tiendaMeta = document.createElement('div');
      this.tiendaMeta.className = 'tn-meta';
      centro.appendChild(this.tiendaMeta);

      var util = document.createElement('div');
      util.className = 'vest-util tienda-util';
      this.tiendaNota = document.createElement('span');
      this.tiendaNota.className = 'vest-cuenta';
      util.appendChild(this.tiendaNota);
      this.tiendaTengoBtn = this.makeButton('VER LO QUE YA TENGO', function () {
        self.tiendaTengo = !self.tiendaTengo;
        self.refreshTienda();
      });
      this.tiendaTengoBtn.classList.add('btn-preset');
      util.appendChild(this.tiendaTengoBtn);
      var irVest = this.makeButton('IR AL VESTUARIO', function () {
        self.showVestuario(self.tiendaTab || 'skin', 'yo');
      });
      irVest.classList.add('btn-preset');
      util.appendChild(irVest);
      centro.appendChild(util);

      this.tiendaVacio = document.createElement('div');
      this.tiendaVacio.className = 'vest-vacio';
      this.tiendaVacio.textContent = 'YA TIENES TODO LO DE ESTA SECCIÓN';
      centro.appendChild(this.tiendaVacio);

      this.tiendaGrid = document.createElement('div');
      this.tiendaGrid.className = 'tn-grid';
      centro.appendChild(this.tiendaGrid);

      this.tiendaItems = [];
      Tn.CATALOGO.forEach(function (it) {
        var card = document.createElement('div');
        card.className = 'tn-it';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.setAttribute('aria-label', 'Ver la ficha de ' + it.name);
        var lupa = document.createElement('canvas');
        lupa.width = 96; lupa.height = 96;
        lupa.className = 'tn-lupa';
        card.appendChild(lupa);
        var nom = document.createElement('span');
        nom.className = 'tn-nombre';
        nom.textContent = it.name;
        card.appendChild(nom);
        var precio = document.createElement('span');
        precio.className = 'tn-precio';
        card.appendChild(precio);
        var sub = document.createElement('span');
        sub.className = 'tn-sub';
        card.appendChild(sub);
        var mas = document.createElement('button');
        mas.type = 'button';
        mas.className = 'tn-mas';
        mas.addEventListener('click', function (ev) {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          self.tiendaAlTicket(it.id);
        });
        card.appendChild(mas);
        card.addEventListener('click', function () { self.abrirFicha(it.cat, it.id, 'tienda'); });
        card.addEventListener('keydown', function (ev) {
          if (ev.target !== card) return;
          if (ev.key === 'Enter' || ev.key === ' ') {
            if (ev.preventDefault) ev.preventDefault();
            self.abrirFicha(it.cat, it.id, 'tienda');
          }
        });
        self.tiendaGrid.appendChild(card);
        self.tiendaItems.push({ it: it, card: card, lupa: lupa, precio: precio, sub: sub, mas: mas });
      });

      /* ----- el ticket ----- */
      var der = document.createElement('div');
      der.className = 'tn-der';
      this.tiendaTicket = document.createElement('div');
      this.tiendaTicket.className = 'tn-ticket';
      this.tiendaTicket.setAttribute('aria-live', 'polite');
      der.appendChild(this.tiendaTicket);
      this.tiendaMsg = document.createElement('div');
      this.tiendaMsg.className = 'lobby-status tienda-msg';
      der.appendChild(this.tiendaMsg);
      cuerpo.appendChild(der);

      var back = this.makeButton('VOLVER', function () { self.closeTienda(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);

      this.tiendaTab = 'skin';
      this.tiendaTengo = false;
      this.tiendaRecien = [];
      this.tiendaBolsa = [];
    },

    /* Una moneda de oro, en CSS: va delante de cada precio */
    monedaEl: function (tam) {
      var m = document.createElement('i');
      m.className = 'moneda' + (tam ? ' ' + tam : '');
      m.setAttribute('aria-hidden', 'true');
      return m;
    },

    /* Un precio: la moneda y la cifra, juntas siempre */
    precioEl: function (n, apagado, signo) {
      var p = document.createElement('span');
      p.className = 'precio' + (apagado ? ' apagado' : '');
      p.appendChild(this.monedaEl());
      var b = document.createElement('b');
      b.textContent = (signo || '') + fmtMonedas(n);
      p.appendChild(b);
      return p;
    },

    /* la moneda de la tienda, dibujada: disco dorado con canto y brillo */
    pintarMoneda: function (cv) {
      var c = cv.getContext('2d');
      var w = cv.width, r = w / 2 - 2;
      c.clearRect(0, 0, w, w);
      c.fillStyle = '#b8860b';
      c.beginPath(); c.arc(w / 2, w / 2, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffd23f';
      c.beginPath(); c.arc(w / 2 - 1, w / 2 - 1, r - 2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#b8860b'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(w / 2 - 1, w / 2 - 1, r - 5, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#fff6c0';
      c.fillRect(w / 2 - 5, w / 2 - 6, 3, 3);
    },

    showTienda: function (tab) {
      var abierto = this.visiblePanel();
      /* (si se viene del vestuario que a su vez se abrió desde aquí, se deja
       * el VOLVER como estaba: si no, los dos se mandarían el uno al otro) */
      if (abierto !== this.els.tienda &&
          !(abierto === this.els.vestuario && this.vestVolver === 'tienda')) {
        this.tiendaVolver = (abierto === this.els.profile) ? 'profile'
          : (abierto === this.els.vestuario) ? 'vestuario' : 'menu';
        this.tiendaRecien = [];
      }
      this.cerrarFicha(true);
      if (tab) this.tiendaTab = tab;
      if (this.tiendaMsg) this.tiendaMsg.textContent = '';
      this.refreshTienda();
      this.showPanel('tienda');
      if (this.els.tienda) this.els.tienda.scrollTop = 0;
      this.animarTienda();
    },

    closeTienda: function () {
      this.cerrarFicha(true);
      var v = this.tiendaVolver;
      if (v === 'profile') this.showProfile();
      else if (v === 'vestuario') this.showVestuario(null, 'yo');
      else this.showMenu();
    },

    tiendaAviso: function (texto, error) {
      if (!this.tiendaMsg) return;
      this.tiendaMsg.textContent = texto || '';
      this.tiendaMsg.classList.toggle('error', !!error);
    },

    /* ---------- el ticket ---------- */
    tiendaEnTicket: function () {
      var Tn = window.PM.Tienda, n = 0;
      var b = this.tiendaBolsa || [];
      for (var i = 0; i < b.length; i++) { var it = Tn.item(b[i]); if (it) n += it.precio; }
      return n;
    },

    /* Echar o quitar del ticket. Lo que ya es tuyo no entra, y lo que no
     * cabe con lo que ya hay en el ticket, tampoco: se dice cuánto falta. */
    tiendaAlTicket: function (id) {
      var Tn = window.PM.Tienda;
      var it = Tn && Tn.item(id);
      if (!it) return false;
      this.tiendaBolsa = this.tiendaBolsa || [];
      var k = this.tiendaBolsa.indexOf(id);
      if (k !== -1) {
        this.tiendaBolsa.splice(k, 1);
        this.tiendaAviso('');
      } else {
        if (Tn.tiene(id)) return false;
        var libre = Tn.saldo() - this.tiendaEnTicket();
        if (it.precio > libre) {
          this.tiendaAviso('TE FALTAN ' + fmtMonedas(it.precio - Math.max(0, libre)) +
            ' MONEDAS PARA AÑADIR ' + it.name, true);
          this.refreshTienda();
          return false;
        }
        this.tiendaBolsa.push(id);
        this.tiendaAviso(it.name + ' AL TICKET', false);
      }
      this.refreshTienda();
      this.refreshFicha();
      return true;
    },

    /* Pagar el ticket entero. Cada cosa es una compra (Tienda.comprar) y se
     * para en la primera que no se pueda, sin tocar las demás. */
    tiendaPagar: function () {
      var Tn = window.PM.Tienda;
      var bolsa = (this.tiendaBolsa || []).slice();
      if (!bolsa.length) return 0;
      var hechas = 0;
      for (var i = 0; i < bolsa.length; i++) {
        var r = Tn.comprar(bolsa[i]);
        if (!r.ok) { this.tiendaAviso(r.msg, true); break; }
        hechas++;
        this.tiendaBolsa.splice(this.tiendaBolsa.indexOf(bolsa[i]), 1);
        if (this.tiendaRecien.indexOf(bolsa[i]) === -1) this.tiendaRecien.push(bolsa[i]);
      }
      if (hechas) {
        if (window.AudioSys && AudioSys.playEatFruit) AudioSys.playEatFruit();
        if (hechas === bolsa.length) {
          this.tiendaAviso((hechas === 1 ? '¡UNA COSA NUEVA!' : '¡' + hechas + ' COSAS NUEVAS!') +
            ' PÓNTELAS DESDE SU FICHA O EN EL VESTUARIO', false);
        }
      }
      this.refreshTienda();
      return hechas;
    },

    /* Cuántas monedas da una partida tuya de las de siempre: la media de
     * puntos y de tiempo pasada por la misma regla que cobra al acabar. */
    tiendaPorPartida: function () {
      var Tn = window.PM.Tienda, A = window.PM.Achievements, L = window.PM.Level;
      var c = A ? A.stats() : {};
      var p = c.partidas || 0;
      if (!(p > 0) || !Tn) return CFG.TIENDA.POR_PARTIDA;
      var xp = L ? L.xp() : 0;
      return Math.max(1, Tn.dePartida(xp / p, (c.tiempo || 0) / p));
    },

    refreshTienda: function () {
      var self = this;
      var Tn = window.PM.Tienda;
      if (!Tn || !this.tiendaItems) return;
      var tab = this.tiendaTab || 'skin';
      this.tiendaBolsa = (this.tiendaBolsa || []).filter(function (id) { return !Tn.tiene(id); });
      var saldo = Tn.saldo();
      var enTicket = this.tiendaEnTicket();
      var libre = saldo - enTicket;

      this.tiendaSaldo.textContent = fmtMonedas(Math.max(0, saldo));
      var TC = CFG.TIENDA;
      this.tiendaRitmo.textContent = '';
      var r1 = document.createElement('span');
      r1.textContent = 'TU PARTIDA MEDIA TE DA +' + this.tiendaPorPartida();
      var r2 = document.createElement('span');
      r2.textContent = 'UNA SEMANA ENTERA DEL DAILY, +' + (TC.POR_RETO * 7 + TC.POR_SEMANA);
      this.tiendaRitmo.appendChild(r1);
      this.tiendaRitmo.appendChild(r2);
      if (this.tiendaRegalo) {
        var regalo = Tn.regalo ? Tn.regalo() : 0;
        this.tiendaRegalo.hidden = !(regalo > 0);
        this.tiendaRegalo.style.display = (regalo > 0) ? '' : 'none';
        this.tiendaRegalo.textContent = 'REGALO DE VETERANO: +' + fmtMonedas(regalo) +
          ' POR LO QUE YA HABÍAS JUGADO (' + TC.VETERANO_POR_PARTIDA +
          ' POR PARTIDA Y ' + TC.VETERANO_POR_LOGRO + ' POR LOGRO)';
      }

      /* secciones, con lo que te falta de cada una */
      Tn.CATEGORIAS.forEach(function (c) {
        var falta = Tn.CATALOGO.filter(function (it) { return it.cat === c.id && !Tn.tiene(it.id); }).length;
        var b = self.tiendaTabBtns[c.id];
        b.textContent = c.name + (falta ? ' · ' + falta : ' · ✓');
        b.classList.toggle('active', c.id === tab);
      });

      /* la meta */
      this.pintarMetaTienda(libre);

      /* los artículos */
      var cat = null;
      for (var c = 0; c < Tn.CATEGORIAS.length; c++) if (Tn.CATEGORIAS[c].id === tab) cat = Tn.CATEGORIAS[c];
      var mias = 0, total = 0, vistas = 0;
      for (var i = 0; i < this.tiendaItems.length; i++) {
        var row = this.tiendaItems[i], it = row.it;
        var tiene = Tn.tiene(it.id), puesto = Tn.puesto(it.id);
        var recien = this.tiendaRecien.indexOf(it.id) !== -1;
        var dentro = this.tiendaBolsa.indexOf(it.id) !== -1;
        if (it.cat === tab) { total++; if (tiene) mias++; }
        /* lo que ya tienes no sale, salvo que se pida o que se acabe de
         * comprar (para poder ponérselo sin ir a buscarlo) */
        var ver = (it.cat === tab) && (!tiene || recien || this.tiendaTengo);
        row.card.style.display = ver ? '' : 'none';
        if (!ver) continue;
        vistas++;
        var falta = !tiene && !dentro && it.precio > libre;
        row.card.classList.toggle('tuyo', tiene);
        row.card.classList.toggle('puesto', puesto);
        row.card.classList.toggle('dentro', dentro);
        row.precio.textContent = '';
        if (tiene) {
          row.precio.textContent = puesto ? 'PUESTO' : recien ? 'RECIÉN COMPRADO' : 'TUYO';
          row.precio.classList.add('tuyo');
        } else {
          row.precio.classList.remove('tuyo');
          row.precio.appendChild(this.precioEl(it.precio, falta));
        }
        row.sub.textContent = tiene ? '' : dentro ? 'EN EL TICKET'
          : falta ? 'TE FALTAN ' + fmtMonedas(it.precio - Math.max(0, libre)) : '';
        row.sub.classList.toggle('falta', falta);
        row.mas.style.display = tiene ? 'none' : '';
        row.mas.textContent = dentro ? '✓' : '+';
        row.mas.setAttribute('aria-label', (dentro ? 'Quitar del ticket ' : 'Añadir al ticket ') + it.name);
        row.mas.title = dentro ? 'QUITAR DEL TICKET' : 'AÑADIR AL TICKET';
      }
      this.tiendaNota.textContent = (cat ? cat.nota + ' · ' : '') + 'TIENES ' + mias + ' DE ' + total;
      this.tiendaTengoBtn.textContent = this.tiendaTengo ? 'SOLO LO QUE ME FALTA' : 'VER LO QUE YA TENGO';
      this.tiendaTengoBtn.classList.toggle('active', !!this.tiendaTengo);
      this.tiendaVacio.style.display = vistas ? 'none' : '';

      this.pintarTicket(saldo, enTicket);
    },

    /* Lo más barato que aún no puedes pagar (contando lo que ya hay en el
     * ticket), con la barra de lo que llevas y las partidas que faltan. */
    pintarMetaTienda: function (libre) {
      var Tn = window.PM.Tienda;
      var m = this.tiendaMeta;
      var bolsa = this.tiendaBolsa || [];
      m.textContent = '';
      this.tiendaMetaLupa = null;
      var quedan = Tn.CATALOGO.filter(function (it) { return !Tn.tiene(it.id) && bolsa.indexOf(it.id) === -1; });
      var meta = quedan.filter(function (it) { return it.precio > libre; })
        .sort(function (a, b) { return a.precio - b.precio; })[0];
      if (!meta) {
        m.classList.add('llena');
        m.textContent = quedan.length ? 'TE ALCANZA PARA TODO LO QUE QUEDA' : 'LO TIENES TODO';
        return;
      }
      m.classList.remove('llena');
      var self = this;
      var cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      cv.className = 'tn-meta-lupa';
      m.appendChild(cv);
      this.tiendaMetaLupa = { cv: cv, it: meta };
      var txt = document.createElement('div');
      txt.className = 'tn-meta-txt';
      var t1 = document.createElement('div');
      t1.className = 'tn-meta-t';
      t1.textContent = 'TU PRÓXIMA META';
      txt.appendChild(t1);
      var t2 = document.createElement('button');
      t2.type = 'button';
      t2.className = 'tn-meta-n';
      t2.textContent = meta.name + ' ';
      t2.appendChild(this.precioEl(meta.precio));
      t2.addEventListener('click', function () { self.abrirFicha(meta.cat, meta.id, 'tienda'); });
      txt.appendChild(t2);
      var barra = document.createElement('div');
      barra.className = 'tn-barra';
      var fill = document.createElement('i');
      fill.style.width = Math.round(Math.max(0, Math.min(1, libre / meta.precio)) * 100) + '%';
      barra.appendChild(fill);
      txt.appendChild(barra);
      var faltan = meta.precio - Math.max(0, libre);
      var partidas = Math.ceil(faltan / this.tiendaPorPartida());
      var t3 = document.createElement('div');
      t3.className = 'tn-meta-sub';
      t3.textContent = 'TE FALTAN ' + fmtMonedas(faltan) + ' · UNAS ' + partidas +
        (partidas === 1 ? ' PARTIDA' : ' PARTIDAS');
      txt.appendChild(t3);
      m.appendChild(txt);
    },

    pintarTicket: function (saldo, enTicket) {
      var self = this;
      var Tn = window.PM.Tienda;
      var tk = this.tiendaTicket;
      tk.textContent = '';
      var bolsa = this.tiendaBolsa || [];
      function fila(cls, izq, der) {
        var f = document.createElement('div');
        f.className = 'tn-fila' + (cls ? ' ' + cls : '');
        var a = document.createElement('span');
        a.textContent = izq;
        f.appendChild(a);
        if (der) f.appendChild(der);
        tk.appendChild(f);
        return f;
      }
      function raya() { var r = document.createElement('div'); r.className = 'tn-raya'; tk.appendChild(r); }
      var h = document.createElement('div');
      h.className = 'tn-ticket-t';
      h.textContent = 'TICKET';
      tk.appendChild(h);
      fila('', 'TUS MONEDAS', this.precioEl(Math.max(0, saldo)));
      raya();
      if (!bolsa.length) {
        var v = document.createElement('div');
        v.className = 'tn-ticket-vacio';
        v.textContent = 'AÑADE COSAS CON EL + O DESDE SU FICHA';
        tk.appendChild(v);
      }
      bolsa.forEach(function (id) {
        var it = Tn.item(id);
        if (!it) return;
        var q = document.createElement('button');
        q.type = 'button';
        q.className = 'tn-quitar';
        q.textContent = '×';
        q.title = 'QUITAR ' + it.name;
        q.setAttribute('aria-label', 'Quitar ' + it.name + ' del ticket');
        q.addEventListener('click', function () { self.tiendaAlTicket(id); });
        var f = fila('', it.name, self.precioEl(it.precio, false, '− '));
        f.insertBefore(q, f.firstChild);
      });
      if (bolsa.length > 1) fila('tn-total', 'TOTAL', this.precioEl(enTicket));
      raya();
      var resto = saldo - enTicket;
      fila('tn-resto' + (resto < 0 ? ' neg' : ''), resto < 0 ? 'TE FALTAN' : 'TE QUEDAN',
        this.precioEl(Math.abs(resto)));
      var pagar = document.createElement('button');
      pagar.type = 'button';
      pagar.className = 'btn tn-pagar';
      pagar.disabled = !bolsa.length || resto < 0;
      if (!bolsa.length) pagar.textContent = 'TICKET VACÍO';
      else if (resto < 0) pagar.textContent = 'NO TE ALCANZA';
      else {
        pagar.appendChild(document.createTextNode('PAGAR '));
        pagar.appendChild(this.precioEl(enTicket));
      }
      pagar.addEventListener('click', function () { self.tiendaPagar(); });
      tk.appendChild(pagar);
    },

    /* Las lupas de los artículos y de la meta se mueven mientras la tienda
     * está abierta: cada cosa corre por el pasillo de la vitrina con tu skin */
    animarTienda: function () {
      var self = this;
      var Sk = window.PM.Skins;
      if (!Sk || !this.tiendaItems || this.tiendaAnim) return;
      var raf = window.requestAnimationFrame;
      if (!raf) return;
      this.tiendaAnim = true;
      var origen = Date.now();
      var tmp = document.createElement('canvas');
      tmp.width = Sk.ESCENA_W; tmp.height = Sk.ESCENA_H;
      function pinta(cv, it, t) {
        var s = window.PM.settings;
        var color = s.pacColor || '#ffff00';
        var mia = (CFG.SKIN_IDS.indexOf(s.skin1) !== -1) ? s.skin1 : 'clasico';
        var conAcc = window.PM.Sprites.admiteAccesorio(mia) ? mia : 'clasico';
        var skin = (it.cat === 'skin') ? it.id : (it.cat === 'accesorio') ? conAcc : mia;
        var pos = Sk.escena(tmp, skin, color, t * 44, t, {
          efecto: (it.cat === 'efecto') ? it.id : null,
          accesorio: (it.cat === 'accesorio') ? it.id : null,
          emote: (it.cat === 'emote') ? it.id : null
        });
        Sk.lupa(cv, tmp, pos, it.cat === 'efecto' ? 5 : 0, it.cat === 'emote' ? 19 : 0);
      }
      function paso() {
        var panel = self.els.tienda;
        if (!panel || panel.style.display === 'none') { self.tiendaAnim = false; return; }
        var t = (Date.now() - origen) / 1000;
        var alto = window.innerHeight || 800;
        /* con la ficha abierta, las de detrás se quedan quietas */
        if (!self.ficha) {
          for (var i = 0; i < self.tiendaItems.length; i++) {
            var row = self.tiendaItems[i];
            if (row.card.style.display === 'none') continue;
            var r = row.card.getBoundingClientRect();
            if (r.bottom < 0 || r.top > alto) continue;
            pinta(row.lupa, row.it, t + i * 0.37);
          }
          if (self.tiendaMetaLupa) pinta(self.tiendaMetaLupa.cv, self.tiendaMetaLupa.it, t);
        }
        raf(paso);
      }
      raf(paso);
    },

    /* ------------------------------------------------------
     * LA FICHA
     *
     * Una ventana encima de la tienda o del vestuario con UNA cosa en
     * movimiento (js/ficha.js): sus momentos, una lupa, pausa y cámara lenta,
     * probarla sobre otra skin y en otro color, qué es y cuándo se nota. Y
     * abajo, lo que se puede hacer con ella: añadirla al ticket, comprarla y
     * ponértela de un golpe, o ponértela o quitártela si ya es tuya.
     *
     * Se cierra con la X, con ESC o pulsando fuera. Las flechas de la cabecera
     * pasan a la anterior o la siguiente de la misma lista sin cerrarla.
     * ------------------------------------------------------ */

    /* Lo que la ficha necesita saber de una cosa, venga de donde venga */
    fichaItem: function (cat, id) {
      var Tn = window.PM.Tienda;
      if (cat === 'skin') {
        var sk = CFG.SKINS.filter(function (x) { return x.id === id; })[0];
        if (!sk) return null;
        return { id: id, name: sk.name, cat: 'skin', ve: sk.ve || '',
          precio: sk.precio || 0, tienda: sk.grupo === 'tienda' };
      }
      if (cat === 'emote') {
        var e = CFG.EMOTES.concat(CFG.EMOTES_TIENDA).filter(function (x) { return x.id === id; })[0];
        if (!e) return null;
        var base = CFG.EMOTES.some(function (x) { return x.id === id; });
        return { id: id, name: e.name, cat: 'emote', ve: e.ve || '', precio: e.precio || 0, tienda: !base };
      }
      var it = Tn && Tn.item(id);
      if (!it) return null;
      return { id: id, name: it.name, cat: it.cat, ve: it.ve || '', precio: it.precio, tienda: true };
    },

    /* ¿Es tuya? Las skins de nivel y de logro no se compran: se abren */
    fichaTiene: function (it) {
      if (it.cat === 'skin') {
        var Sk = window.PM.Skins;
        return !!(Sk && Sk.estado(it.id).abierta) || window.PM.settings.skin1 === it.id;
      }
      var Tn = window.PM.Tienda;
      return !!(Tn && Tn.tiene(it.id));
    },

    fichaPuesto: function (it) {
      var Tn = window.PM.Tienda, s = window.PM.settings;
      if (it.cat === 'skin') return (s.skin1 || 'clasico') === it.id;
      return !!(Tn && Tn.puesto(it.id));
    },

    /* La lista por la que se pasa con las flechas: lo que se ve detrás */
    fichaLista: function (origen, cat) {
      if (origen === 'tienda') {
        return (this.tiendaItems || []).filter(function (r) {
          return r.it.cat === cat && r.card.style.display !== 'none';
        }).map(function (r) { return r.it.id; });
      }
      var self = this;
      return this.vestItems(cat, 'yo').filter(function (it) {
        return it.id && (it.tuyo || self.vestFaltan);
      }).map(function (it) { return it.id; });
    },

    abrirFicha: function (cat, id, origen) {
      var it = this.fichaItem(cat, id);
      if (!it) return false;
      var host = (origen === 'vestuario') ? this.els.vestuario : this.els.tienda;
      if (!host) return false;
      var s = window.PM.settings;
      var previa = this.ficha;
      this.cerrarFicha(true);
      var Fi = window.PM.Ficha;
      this.ficha = {
        it: it, origen: origen === 'vestuario' ? 'vestuario' : 'tienda', host: host,
        momento: Fi ? Fi.momentosDe(it)[0] : 'correr',
        base: null,
        color: (previa && previa.color) || s.pacColor || '#ffff00',
        pausa: false, lento: previa ? previa.lento : false, reloj: 0,
        volverFoco: (previa && previa.volverFoco) || document.activeElement
      };
      this.montarFicha();
      this.animarFicha();
      return true;
    },

    cerrarFicha: function (sinFoco) {
      var f = this.ficha;
      if (!f) return;
      this.ficha = null;
      if (f.velo && f.velo.parentNode) f.velo.parentNode.removeChild(f.velo);
      if (f.origen === 'tienda') this.refreshTienda();
      else if (this.els.vestuario && this.els.vestuario.style.display !== 'none') this.refreshVestuario();
      if (!sinFoco && f.volverFoco && f.volverFoco.focus) {
        try { f.volverFoco.focus(); } catch (e) { /* ya no está */ }
      }
    },

    /* La skin sobre la que se prueba un accesorio, un efecto o un emote: la
     * que se haya elegido, o la tuya (si con la tuya no se ve el accesorio,
     * la clásica) */
    fichaBase: function () {
      var f = this.ficha, s = window.PM.settings;
      if (f.it.cat === 'skin') return f.it.id;
      if (f.base) return f.base;
      var mia = (CFG.SKIN_IDS.indexOf(s.skin1) !== -1) ? s.skin1 : 'clasico';
      if (f.it.cat === 'accesorio' && window.PM.Sprites.admiteAccesorio &&
          !window.PM.Sprites.admiteAccesorio(mia)) return 'clasico';
      return mia;
    },

    fichaLook: function () {
      var f = this.ficha, Tn = window.PM.Tienda;
      var it = f.it;
      var look = { skin: this.fichaBase(), accesorio: null, efecto: null, emote: null };
      if (it.cat === 'accesorio') look.accesorio = it.id;
      else if (it.cat === 'efecto') look.efecto = it.id;
      else if (it.cat === 'emote') look.emote = it.id;
      else if (it.cat === 'skin' && Tn) {
        // una skin se enseña con lo que llevas encima, como la llevarías
        look.accesorio = Tn.accesorio() || null;
        look.efecto = Tn.efecto() || null;
      }
      return look;
    },

    montarFicha: function () {
      var self = this;
      var f = this.ficha, it = f.it;
      var Fi = window.PM.Ficha;

      var velo = document.createElement('div');
      velo.className = 'ficha-velo';
      velo.addEventListener('click', function (ev) { if (ev.target === velo) self.cerrarFicha(); });
      var win = document.createElement('div');
      win.className = 'ficha';
      win.setAttribute('role', 'dialog');
      win.setAttribute('aria-modal', 'true');
      win.setAttribute('aria-label', 'Ficha de ' + it.name);
      velo.appendChild(win);
      f.velo = velo;
      f.win = win;

      /* cabecera */
      var cab = document.createElement('div');
      cab.className = 'ficha-cab';
      var nom = document.createElement('div');
      nom.className = 'ficha-nombre';
      nom.textContent = it.name;
      cab.appendChild(nom);
      var chip = document.createElement('span');
      chip.className = 'ficha-chip';
      chip.textContent = { skin: 'SKIN', accesorio: 'ACCESORIO', efecto: 'EFECTO', emote: 'EMOTE' }[it.cat];
      cab.appendChild(chip);
      var lista = this.fichaLista(f.origen, it.cat);
      var idx = lista.indexOf(it.id);
      if (lista.length > 1) {
        var nav = document.createElement('div');
        nav.className = 'ficha-pasar';
        [[-1, '‹ '], [1, ' ›']].forEach(function (p) {
          var otro = lista[(Math.max(0, idx) + p[0] + lista.length) % lista.length];
          var info = self.fichaItem(it.cat, otro);
          var b = self.makeButton(p[0] < 0 ? p[1] + info.name : info.name + p[1], function () {
            var foco = f.volverFoco;
            self.abrirFicha(it.cat, otro, f.origen);
            if (self.ficha) self.ficha.volverFoco = foco;
          });
          b.classList.add('btn-preset');
          nav.appendChild(b);
        });
        cab.appendChild(nav);
      }
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'ficha-cerrar';
      x.textContent = '✕';
      x.title = 'CERRAR (ESC)';
      x.setAttribute('aria-label', 'Cerrar la ficha');
      x.addEventListener('click', function () { self.cerrarFicha(); });
      cab.appendChild(x);
      win.appendChild(cab);

      /* escenario y lupa */
      var main = document.createElement('div');
      main.className = 'ficha-main';
      var izq = document.createElement('div');
      izq.className = 'ficha-izq';
      var esc = document.createElement('div');
      esc.className = 'ficha-escena';
      f.cv = document.createElement('canvas');
      f.cv.width = Fi ? Fi.ANCHO : 570;
      f.cv.height = Fi ? Fi.ALTO : 234;
      f.cv.setAttribute('aria-label', it.name + ' en un pasillo del laberinto');
      esc.appendChild(f.cv);
      f.rotulo = document.createElement('span');
      f.rotulo.className = 'ficha-rotulo';
      esc.appendChild(f.rotulo);
      izq.appendChild(esc);

      var fila = document.createElement('div');
      fila.className = 'ficha-momentos';
      f.momentoBtns = {};
      (Fi ? Fi.momentosDe(it) : ['correr']).forEach(function (m) {
        var b = self.makeButton(Fi ? Fi.MOMENTOS[m].name : m, function () {
          f.momento = m;
          f.reloj = 0;
          self.refreshFicha();
        });
        b.classList.add('tab');
        f.momentoBtns[m] = b;
        fila.appendChild(b);
      });
      var ctrl = document.createElement('div');
      ctrl.className = 'ficha-ctrl';
      f.pausaBtn = this.makeButton('❚❚', function () { f.pausa = !f.pausa; self.refreshFicha(); });
      f.lentoBtn = this.makeButton('½×', function () { f.lento = !f.lento; self.refreshFicha(); });
      f.lentoBtn.title = 'CÁMARA LENTA';
      var otraVez = this.makeButton('↺', function () { f.reloj = 0; });
      otraVez.title = 'DESDE EL PRINCIPIO';
      [f.pausaBtn, f.lentoBtn, otraVez].forEach(function (b) { b.classList.add('btn-preset'); ctrl.appendChild(b); });
      fila.appendChild(ctrl);
      izq.appendChild(fila);

      /* probarlo con otra skin y en otro color */
      var prueba = document.createElement('div');
      prueba.className = 'ficha-prueba';
      f.baseBtns = {};
      if (it.cat !== 'skin') {
        var g1 = document.createElement('div');
        g1.className = 'ficha-grupo';
        var l1 = document.createElement('span');
        l1.textContent = 'PROBARLO CON';
        g1.appendChild(l1);
        var s = window.PM.settings;
        var mia = (CFG.SKIN_IDS.indexOf(s.skin1) !== -1) ? s.skin1 : 'clasico';
        var bases = ['clasico'];
        if (mia !== 'clasico') bases.push(mia);
        ['cuy', 'oso', 'galleta'].forEach(function (b) { if (bases.indexOf(b) === -1) bases.push(b); });
        bases.forEach(function (sk) {
          if (it.cat === 'accesorio' && window.PM.Sprites.admiteAccesorio &&
              !window.PM.Sprites.admiteAccesorio(sk)) return;
          var info = window.PM.Skins && window.PM.Skins.info(sk);
          var nm = (sk === 'clasico') ? 'CLÁSICA' : (info ? info.name : sk.toUpperCase());
          if (sk === mia) nm += ' (LA TUYA)';
          var b = self.makeButton(nm, function () { f.base = sk; self.refreshFicha(); });
          b.classList.add('btn-preset');
          f.baseBtns[sk] = b;
          g1.appendChild(b);
        });
        prueba.appendChild(g1);
      }
      var g2 = document.createElement('div');
      g2.className = 'ficha-grupo';
      var l2 = document.createElement('span');
      l2.textContent = 'COLOR';
      g2.appendChild(l2);
      f.colorBtns = [];
      var colores = [String(window.PM.settings.pacColor || '#ffff00').toLowerCase()];
      CFG.PLAYER_COLORS.forEach(function (c) { if (colores.indexOf(c.toLowerCase()) === -1) colores.push(c.toLowerCase()); });
      colores.forEach(function (hex, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ficha-color';
        b.style.background = hex;
        b.setAttribute('aria-label', i === 0 ? 'Tu color' : 'Color ' + hex);
        b.title = i === 0 ? 'TU COLOR' : hex.toUpperCase();
        b.addEventListener('click', function () { f.color = hex; self.refreshFicha(); });
        f.colorBtns.push({ btn: b, hex: hex });
        g2.appendChild(b);
      });
      prueba.appendChild(g2);
      izq.appendChild(prueba);
      main.appendChild(izq);

      var der = document.createElement('div');
      der.className = 'ficha-der';
      var lupaCaja = document.createElement('div');
      lupaCaja.className = 'ficha-lupa';
      f.lupa = document.createElement('canvas');
      f.lupa.width = 240; f.lupa.height = 240;
      f.lupa.setAttribute('aria-hidden', 'true');
      lupaCaja.appendChild(f.lupa);
      der.appendChild(lupaCaja);
      var notas = [
        ['QUÉ ES', this.fichaQueEs(it)],
        ['CÓMO SE VE', it.ve],
        ['CUÁNDO SE NOTA', Fi ? Fi.cuando(it) : '']
      ];
      notas.forEach(function (n) {
        if (!n[1]) return;
        var d = document.createElement('div');
        d.className = 'ficha-dato';
        var k = document.createElement('span');
        k.className = 'k';
        k.textContent = n[0];
        d.appendChild(k);
        var v = document.createElement('span');
        v.textContent = n[1];
        d.appendChild(v);
        der.appendChild(d);
      });
      main.appendChild(der);
      win.appendChild(main);

      /* lo que se puede hacer */
      f.barra = document.createElement('div');
      f.barra.className = 'ficha-barra';
      win.appendChild(f.barra);
      f.aviso = document.createElement('div');
      f.aviso.className = 'lobby-status ficha-aviso';
      win.appendChild(f.aviso);

      f.host.appendChild(velo);
      this.refreshFicha();
      try { x.focus(); } catch (e) { /* sin foco */ }
    },

    fichaQueEs: function (it) {
      var Tn = window.PM.Tienda;
      if (it.cat === 'skin') {
        var Sk = window.PM.Skins, g = Sk ? Sk.grupo(it.id) : '';
        return g === 'tienda' ? 'SKIN EXTRAVAGANTE: SOLO SE CONSIGUE EN LA TIENDA'
          : g === 'nivel' ? 'SKIN QUE SE ABRE SUBIENDO DE NIVEL'
          : g === 'temporada' ? 'SKIN DE FECHA ESPECIAL'
          : 'SKIN QUE SE ABRE CON LOGROS';
      }
      if (it.cat === 'emote' && !it.tienda) return 'EMOTE DE SIEMPRE: LO TIENE TODO EL MUNDO. VA EN LAS TECLAS 1 A 6';
      var cat = Tn ? Tn.CATEGORIAS.filter(function (c) { return c.id === it.cat; })[0] : null;
      return cat ? cat.nota : '';
    },

    fichaAvisa: function (texto, error) {
      var f = this.ficha;
      if (!f || !f.aviso) return;
      f.aviso.textContent = texto || '';
      f.aviso.classList.toggle('error', !!error);
    },

    /* Ponerse algo. Devuelve el aviso. Un emote va a la primera tecla que
     * tenga uno de los de siempre (o a la última) y allí se puede mover. */
    ponerCosa: function (it) {
      var Tn = window.PM.Tienda, s = window.PM.settings;
      if (it.cat === 'emote') {
        var caras = Tn.emotes();
        if (caras.indexOf(it.id) !== -1) return it.name + ' YA VA EN LA TECLA ' + (caras.indexOf(it.id) + 1);
        var base = CFG.EMOTES.map(function (e) { return e.id; });
        var tecla = caras.length - 1;
        for (var i = 0; i < caras.length; i++) {
          if (base.indexOf(caras[i]) !== -1) { tecla = i; break; }
        }
        Tn.ponerEmote(tecla, it.id);
        this.vestTecla = tecla;
        return it.name + ' VA EN LA TECLA ' + (tecla + 1);
      }
      if (it.cat === 'skin') {
        s.skin1 = it.id;
        saveSettings();
        if (window.PM.Account && window.PM.Account.logged()) window.PM.Account.pushQuiet();
        this.refreshPerfilLook();
        return 'LLEVAS ' + it.name;
      }
      Tn.poner(it.cat, it.id);
      var aviso = 'LLEVAS ' + it.name;
      if (it.cat === 'accesorio' && window.PM.Sprites.admiteAccesorio &&
          !window.PM.Sprites.admiteAccesorio(s.skin1)) {
        aviso += ' · CON TU SKIN NO SE VE';
      }
      this.refreshPerfilLook();
      return aviso;
    },

    refreshFicha: function () {
      var self = this;
      var f = this.ficha;
      if (!f || !f.barra) return;
      var it = f.it, Tn = window.PM.Tienda;

      for (var m in f.momentoBtns) {
        if (f.momentoBtns.hasOwnProperty(m)) f.momentoBtns[m].classList.toggle('active', m === f.momento);
      }
      f.pausaBtn.textContent = f.pausa ? '▶' : '❚❚';
      f.pausaBtn.title = f.pausa ? 'SEGUIR' : 'PAUSA';
      f.pausaBtn.classList.toggle('active', f.pausa);
      f.lentoBtn.classList.toggle('active', f.lento);
      var base = this.fichaBase();
      for (var b in f.baseBtns) {
        if (f.baseBtns.hasOwnProperty(b)) f.baseBtns[b].classList.toggle('active', b === base);
      }
      f.colorBtns.forEach(function (c) { c.btn.classList.toggle('active', c.hex === String(f.color).toLowerCase()); });

      /* la barra de abajo */
      var barra = f.barra;
      barra.textContent = '';
      var tiene = this.fichaTiene(it), puesto = tiene && this.fichaPuesto(it);
      var izq = document.createElement('div');
      izq.className = 'ficha-precio';
      var cuenta = document.createElement('div');
      cuenta.className = 'ficha-cuenta';
      var btns = document.createElement('div');
      btns.className = 'ficha-btns';
      barra.appendChild(izq);
      barra.appendChild(cuenta);
      barra.appendChild(btns);

      if (tiene) {
        izq.textContent = '✓ ES TUYO';
        izq.classList.add('tuyo');
        if (it.cat === 'emote') {
          var tecla = Tn.emotes().indexOf(it.id);
          cuenta.textContent = tecla !== -1 ? 'VA EN LA TECLA ' + (tecla + 1) + ' DE LA PARTIDA' : 'NO VA EN NINGUNA TECLA';
        } else {
          cuenta.textContent = puesto ? 'LO LLEVAS PUESTO' : 'LO TIENES GUARDADO';
        }
        if (puesto && (it.cat === 'accesorio' || it.cat === 'efecto')) {
          var quitar = this.makeButton('QUITÁRMELO', function () {
            Tn.poner(it.cat, '');
            self.refreshPerfilLook();
            self.fichaAvisa(it.name + ' GUARDADO', false);
            self.refreshFicha();
          });
          quitar.classList.add('btn-preset');
          btns.appendChild(quitar);
        }
        var poner = this.makeButton(puesto ? '✓ PUESTO' : 'PONÉRMELO', function () {
          if (self.fichaPuesto(it)) return;
          self.fichaAvisa(self.ponerCosa(it), false);
          self.refreshFicha();
        });
        poner.classList.add('ficha-poner');
        poner.classList.toggle('hecho', puesto);
        btns.appendChild(poner);
      } else if (it.tienda && Tn) {
        var saldo = Tn.saldo();
        var bolsa = this.tiendaBolsa || [];
        var dentro = bolsa.indexOf(it.id) !== -1;
        var libre = saldo - this.tiendaEnTicket() + (dentro ? it.precio : 0);
        var noCabe = it.precio > libre, noLlega = it.precio > saldo;
        izq.appendChild(this.precioEl(it.precio, noLlega));
        var conTicket = bolsa.length && !(bolsa.length === 1 && dentro);
        if (dentro) {
          cuenta.textContent = 'ESTÁ EN EL TICKET · TE QUEDARÍAN ' + fmtMonedas(saldo - this.tiendaEnTicket());
        } else if (noCabe) {
          var falta = it.precio - Math.max(0, libre);
          var partidas = Math.ceil(falta / this.tiendaPorPartida());
          var fx = document.createElement('span');
          fx.className = 'falta';
          fx.textContent = 'TE FALTAN ' + fmtMonedas(falta) + (conTicket ? ' CON EL TICKET DE AHORA' : '');
          cuenta.appendChild(fx);
          cuenta.appendChild(document.createTextNode(' · UNAS ' + partidas + (partidas === 1 ? ' PARTIDA' : ' PARTIDAS')));
        } else {
          cuenta.textContent = 'TE QUEDARÍAN ' + fmtMonedas(libre - it.precio) + (conTicket ? ' CON EL TICKET DE AHORA' : '');
        }
        if (f.origen === 'tienda' && bolsa.length) {
          var mini = document.createElement('div');
          mini.className = 'ficha-mini';
          mini.textContent = 'EN EL TICKET: ' + bolsa.length + (bolsa.length === 1 ? ' COSA' : ' COSAS') +
            ' · ' + fmtMonedas(this.tiendaEnTicket()) + ' MONEDAS';
          cuenta.appendChild(mini);
        }
        if (f.origen === 'tienda') {
          var al = this.makeButton(dentro ? '✓ EN EL TICKET' : '+ AL TICKET', function () {
            self.tiendaAlTicket(it.id);
          });
          al.classList.add('btn-preset', 'ficha-alticket');
          al.classList.toggle('active', dentro);
          if (noCabe && !dentro) al.disabled = true;
          btns.appendChild(al);
        }
        var comprar = document.createElement('button');
        comprar.type = 'button';
        comprar.className = 'btn ficha-comprar';
        comprar.disabled = noLlega;
        if (noLlega) comprar.textContent = 'NO TE ALCANZA';
        else {
          comprar.appendChild(document.createTextNode('COMPRAR Y PONÉRMELO '));
          comprar.appendChild(this.precioEl(it.precio));
        }
        comprar.addEventListener('click', function () { self.fichaComprar(); });
        btns.appendChild(comprar);
      } else {
        /* una skin que no se compra: cómo se abre */
        var est = window.PM.Skins ? window.PM.Skins.estado(it.id) : { pct: 0, progreso: '' };
        izq.textContent = 'BLOQUEADA';
        izq.classList.add('bloqueada');
        var barraP = document.createElement('div');
        barraP.className = 'tn-barra';
        var fill = document.createElement('i');
        fill.style.width = Math.round((est.pct || 0) * 100) + '%';
        barraP.appendChild(fill);
        cuenta.appendChild(barraP);
        var ptxt = document.createElement('div');
        ptxt.textContent = est.progreso || '';
        cuenta.appendChild(ptxt);
      }
    },

    /* COMPRAR Y PONÉRMELO: solo esa cosa, sin pasar por el ticket (si estaba
     * en él, sale de él) */
    fichaComprar: function () {
      var f = this.ficha, Tn = window.PM.Tienda;
      if (!f || !Tn) return false;
      var it = f.it;
      var r = Tn.comprar(it.id);
      if (!r.ok) { this.fichaAvisa(r.msg, true); this.refreshFicha(); return false; }
      if (window.AudioSys && AudioSys.playEatFruit) AudioSys.playEatFruit();
      this.tiendaBolsa = (this.tiendaBolsa || []).filter(function (id) { return id !== it.id; });
      if (this.tiendaRecien && this.tiendaRecien.indexOf(it.id) === -1) this.tiendaRecien.push(it.id);
      var aviso = this.ponerCosa(it);
      this.fichaAvisa('¡' + it.name + ' ES TUYO! ' + aviso, false);
      if (f.origen === 'tienda') this.refreshTienda();
      this.refreshFicha();
      return true;
    },

    animarFicha: function () {
      var self = this;
      var Fi = window.PM.Ficha;
      var raf = window.requestAnimationFrame;
      if (!Fi || !raf || this.fichaAnim) return;
      this.fichaAnim = true;
      var antes = Date.now();
      function paso() {
        var f = self.ficha;
        if (!f || !f.cv || !f.host || f.host.style.display === 'none') {
          self.fichaAnim = false;
          if (f && f.host && f.host.style.display === 'none') self.cerrarFicha(true);
          return;
        }
        var ahora = Date.now();
        var dt = Math.min(0.05, (ahora - antes) / 1000);
        antes = ahora;
        if (!f.pausa) f.reloj += dt * (f.lento ? 0.5 : 1);
        var m = Fi.MOMENTOS[f.momento];
        var pos = Fi.pintar(f.cv, self.fichaLook(), f.momento, f.reloj, f.color);
        Fi.lupa(f.lupa, f.cv, pos);
        if (f.rotulo && m) f.rotulo.textContent = m.name + ' · ' + (f.reloj % m.dur).toFixed(1) + ' S';
        raf(paso);
      }
      raf(paso);
    },

    /* Aviso corto dentro de OPCIONES (por ahora, skins bloqueadas) */
    /* Aviso corto de OPCIONES. Se escribe en los dos sitios que enseñan
     * skins (OPCIONES y PERFIL) porque el mismo clic puede venir de
     * cualquiera de ellos y solo se ve el del panel abierto. */
    optionsMsg: function (text) {
      var self = this;
      var cajas = [this.optMsgEl, this.profSkinMsg];
      for (var i = 0; i < cajas.length; i++) {
        if (cajas[i]) cajas[i].textContent = text || '';
      }
      if (this.optMsgTimer) clearTimeout(this.optMsgTimer);
      this.optMsgTimer = setTimeout(function () {
        if (self.optMsgEl) self.optMsgEl.textContent = '';
        if (self.profSkinMsg) self.profSkinMsg.textContent = '';
      }, 3000);
    },

    /* Fila de muestras + selector libre para un ajuste de color */
    makeColorRow: function (key) {
      var self = this;
      var row = document.createElement('div');
      row.className = 'swatches';
      var swatches = [];
      CFG.PAC_SWATCHES.forEach(function (hex) {
        var s = document.createElement('button');
        s.type = 'button';
        s.className = 'swatch';
        s.style.background = hex;
        s.setAttribute('data-color', hex);
        s.setAttribute('aria-label', 'Color ' + hex);
        s.addEventListener('click', function () {
          self.setColor(key, hex);
        });
        swatches.push(s);
        row.appendChild(s);
      });
      var input = document.createElement('input');
      input.type = 'color';
      input.className = 'color-input';
      input.addEventListener('input', function () {
        self.setColor(key, input.value);
      });
      row.appendChild(input);
      this.colorRows[key] = { swatches: swatches, input: input };
      return row;
    },

    /* plain: ajuste suelto (volúmenes); si no, tocarlo pasa la dificultad
     * a PERSONALIZADA */
    makeSlider: function (key, label, min, max, step, fmt, plain) {
      var self = this;
      var wrap = document.createElement('div');
      wrap.className = 'slider-row';

      var lab = document.createElement('label');
      lab.className = 'slider-label';
      lab.textContent = label;
      wrap.appendChild(lab);

      var input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      wrap.appendChild(input);

      var val = document.createElement('span');
      val.className = 'slider-value';
      wrap.appendChild(val);

      input.addEventListener('input', function () {
        var v = parseFloat(input.value);
        window.PM.settings[key] = v;
        if (plain) {
          self.applyVolumes();
        } else {
          // la etiqueta sale de los valores: mover un deslizador hasta dar
          // con una dificultad de la casa la vuelve a marcar sola
          window.PM.settings.difficultyPreset = presetDe(window.PM.settings);
          self.refreshPresetButtons();
        }
        saveSettings();
        val.textContent = fmt(v);
      });

      this.sliders[key] = { input: input, val: val, fmt: fmt };
      return wrap;
    },

    applyPreset: function (name) {
      var s = window.PM.settings;
      var p = CFG.PRESETS[name];
      if (!p) return;
      for (var i = 0; i < PRESET_KEYS.length; i++) s[PRESET_KEYS[i]] = p[PRESET_KEYS[i]];
      s.difficultyPreset = presetDe(s);   // que salga de los valores, siempre
      saveSettings();
      this.refreshOptions();
    },

    /* Para las pruebas y para quien quiera preguntarlo desde fuera */
    presetActual: function (s) { return presetDe(s || window.PM.settings); },

    setColor: function (key, hex) {
      window.PM.settings[key] = hex;   // se aplica en vivo (game lee cada frame)
      saveSettings();
      /* Los dos colores se eligen en el VESTUARIO, y tiñen sus fichas y el
       * maniquí, así que se repinta entero; y la miniatura de PERFIL. */
      this.refreshColorRows();
      if (this.els.vestuario && this.els.vestuario.style.display !== 'none') this.refreshVestuario();
      if (key === 'pacColor' && this.profPane) this.refreshProfile();
    },

    /* Marca la muestra elegida en cada fila de color. Las filas viven en dos
     * paneles distintos (la tuya en PERFIL, la del J2 en OPCIONES) pero se
     * guardan todas en el mismo sitio, así que esto vale para las dos. */
    refreshColorRows: function () {
      var s = window.PM.settings;
      for (var k in this.colorRows) {
        if (!this.colorRows.hasOwnProperty(k)) continue;
        var cr = this.colorRows[k];
        for (var i = 0; i < cr.swatches.length; i++) {
          var el = cr.swatches[i];
          el.classList.toggle('active',
            el.getAttribute('data-color').toLowerCase() === String(s[k]).toLowerCase());
        }
        try { cr.input.value = s[k]; } catch (e) { /* color inválido */ }
      }
    },

    applyMute: function () {
      if (window.AudioSys) AudioSys.setMuted(!!window.PM.settings.muted);
      this.applyVolumes();
    },

    /* Vuelca los volúmenes guardados a los buses del sistema de audio */
    applyVolumes: function () {
      if (!window.AudioSys || !AudioSys.setVolume) return;
      var s = window.PM.settings;
      AudioSys.setVolume('master', s.volMaster);
      AudioSys.setVolume('music', s.volMusic);
      AudioSys.setVolume('sfx', s.volSfx);
      AudioSys.setVolume('loops', s.volLoops);
      AudioSys.setVolume('voices', s.volVoices);
    },

    refreshPresetButtons: function () {
      /* De los valores, no de lo guardado: es la única forma de que el botón
       * encendido y las vidas con las que empiezas digan lo mismo. */
      var cur = presetDe(window.PM.settings);
      window.PM.settings.difficultyPreset = cur;
      for (var k in this.presetButtons) {
        if (this.presetButtons.hasOwnProperty(k)) {
          this.presetButtons[k].classList.toggle('active', k === cur);
        }
      }
      this.customTag.style.display = (cur === 'custom') ? 'block' : 'none';
    },

    refreshOptions: function () {
      var s = window.PM.settings;
      var i, k;
      this.refreshPresetButtons();
      for (k in this.sliders) {
        if (!this.sliders.hasOwnProperty(k)) continue;
        var sl = this.sliders[k];
        sl.input.value = String(s[k]);
        sl.val.textContent = sl.fmt(parseFloat(s[k]));
      }
      this.refreshNicks();
      this.refreshColorRows();
      this.refreshSkins();
      this.livesModeBtns.shared.classList.toggle('active', s.livesMode !== 'individual');
      this.livesModeBtns.individual.classList.toggle('active', s.livesMode === 'individual');
      var vsl = (s.vsGhost2 >= 0 && s.vsGhost2 < 4) ? s.vsGhost2 : -1;
      for (i = -1; i < 4; i++) {
        if (this.vsLocalBtns[i]) this.vsLocalBtns[i].classList.toggle('active', i === vsl);
      }
      this.soundBtns.si.classList.toggle('active', !s.muted);
      this.soundBtns.no.classList.toggle('active', !!s.muted);
      if (this.voicesNote) {
        var ready = window.AudioSys && AudioSys.voicesReady && AudioSys.voicesReady();
        this.voicesNote.textContent = ready
          ? 'SUENAN AL COMER FANTASMAS SEGUIDOS CON EL MISMO ENERGIZANTE'
          : 'SI NO SUENAN, ABRE EL JUEGO DESDE UN SERVIDOR (JUGAR.BAT), NO CON DOBLE CLIC';
      }
    },

    /* Opciones del selector de PAC-MAN VS.: Pac-Man y los cuatro fantasmas.
     * Se usa igual en OPCIONES (local) y en la sala online. */
    vsChoices: function () {
      var out = [[-1, 'PAC-MAN']];
      for (var i = 0; i < 4; i++) out.push([i, CFG.VS.NAMES[i]]);
      return out;
    },

    /* ------------------------------------------------------
     * Lobby online: crear sala / unirse con código
     * ------------------------------------------------------ */
    buildOnline: function () {
      var self = this;
      var o = this.els.online;
      o.innerHTML = '';
      /* Marco de recreativa (el de la pausa y el GAME OVER), en cian: bombillas,
       * título a rayas y fondo con líneas de tubo. */
      o.classList.add('ol-marco');
      var bombs = document.createElement('div');
      bombs.className = 'go-bombillas';
      bombs.setAttribute('aria-hidden', 'true');
      o.appendChild(bombs);

      function el(tag, cls, txt) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (txt != null) e.textContent = txt;
        return e;
      }

      o.appendChild(el('div', 'panel-title ol-titulo', 'MODO ONLINE'));
      o.appendChild(el('div', 'ol-sub', 'HASTA ' + CFG.MAX_PLAYERS +
        ' JUGADORES EN LA MISMA PARTIDA'));

      /* ================= vista inicial ================= */
      var idle = el('div', 'online-view ol-idle');
      this.onlineIdle = idle;

      this.onlineWarn = el('div', 'online-warn');
      this.onlineWarn.style.display = 'none';
      idle.appendChild(this.onlineWarn);

      var cartas = el('div', 'ol-cartas');

      /* CREAR */
      var cA = el('div', 'ol-card ol-card-crear');
      cA.appendChild(el('div', 'ol-card-titulo', 'CREAR PARTY'));
      var escena = document.createElement('canvas');
      escena.className = 'ol-escena';
      escena.width = 180; escena.height = 40;
      this.pintarEscenaOnline(escena);
      cA.appendChild(escena);
      cA.appendChild(el('div', 'ol-card-texto', 'TÚ MANDAS: ELIGES EL MODO Y CUÁNDO EMPEZAR'));
      var create = this.makeButton('CREAR', function () { self.partyCreate(); });
      create.classList.add('btn-primary', 'ol-btn-grande');
      this.createBtn = create;
      cA.appendChild(create);
      cartas.appendChild(cA);

      /* UNIRSE */
      var cB = el('div', 'ol-card ol-card-unirse');
      cB.appendChild(el('div', 'ol-card-titulo', 'UNIRSE'));
      this.codeInput = document.createElement('input');
      this.codeInput.type = 'text';
      this.codeInput.className = 'code-input ol-code-input';
      this.codeInput.maxLength = CFG.NET.ROOM_LEN;
      this.codeInput.placeholder = '····';
      this.codeInput.setAttribute('aria-label', 'Código de la party');
      this.codeInput.setAttribute('autocomplete', 'off');
      this.codeInput.setAttribute('spellcheck', 'false');
      this.codeInput.setAttribute('autocapitalize', 'characters');
      this.codeInput.addEventListener('input', function () {
        var v = self.codeInput.value.toUpperCase().replace(/[^A-Z]/g, '');
        if (v !== self.codeInput.value) self.codeInput.value = v;
      });
      this.codeInput.addEventListener('keydown', function (ev) {
        ev.stopPropagation();   // que WASD no mueva el juego mientras se escribe
        if (ev.key === 'Enter') self.partyJoin(self.codeInput.value);
      });
      cB.appendChild(this.codeInput);
      cB.appendChild(el('div', 'ol-card-texto', 'PÍDELE AL LÍDER SU CÓDIGO DE ' +
        CFG.NET.ROOM_LEN + ' LETRAS, O ABRE SU ENLACE'));
      this.joinBtn = this.makeButton('UNIRSE', function () {
        self.partyJoin(self.codeInput.value);
      });
      this.joinBtn.classList.add('ol-btn-grande');
      cB.appendChild(this.joinBtn);
      cartas.appendChild(cB);
      idle.appendChild(cartas);

      var pieIdle = el('div', 'prompt-btns ol-pie');
      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.appendChild(el('span', 'btn-key', 'ESC'));
      this.ponRonda(back, 'btn-ronda');
      pieIdle.appendChild(back);
      idle.appendChild(pieIdle);
      o.appendChild(idle);

      /* ================= vista de sala ================= */
      var room = el('div', 'online-view ol-sala');
      room.style.display = 'none';
      this.onlineRoom = room;
      var cols = el('div', 'ol-cols');

      /* ---- izquierda: la sala ---- */
      var izq = el('div', 'ol-card ol-card-sala');
      izq.appendChild(el('div', 'ol-card-titulo', 'CÓDIGO DE LA PARTY'));
      this.roomCodeEl = el('div', 'ol-codigo');
      izq.appendChild(this.roomCodeEl);
      this.roomLinkEl = el('div', 'online-link');
      izq.appendChild(this.roomLinkEl);
      var filaSala = el('div', 'ol-fila');
      this.copyBtn = this.makeButton('COPIAR ENLACE', function () { self.copyLink(); });
      this.copyBtn.classList.add('ol-btn-chico');
      filaSala.appendChild(this.copyBtn);
      this.inviteBtn = this.makeButton('INVITAR AMIGO', function () { self.askInviteWho(); });
      this.inviteBtn.classList.add('ol-btn-chico');
      filaSala.appendChild(this.inviteBtn);
      izq.appendChild(filaSala);

      this.partyCountEl = el('div', 'ol-card-titulo ol-sep', 'JUGADORES');
      izq.appendChild(this.partyCountEl);
      this.partyList = el('div', 'ol-plazas');
      izq.appendChild(this.partyList);
      cols.appendChild(izq);

      /* ---- derecha: la cartelera y la ficha del modo elegido ---- */
      var der = el('div', 'ol-card ol-card-partida');
      der.appendChild(el('div', 'ol-card-titulo', 'LA CARTELERA'));
      this.olModoNota = el('div', 'ol-card-texto ol-solo-lider', 'EL MODO LO ELIGE EL LÍDER');
      der.appendChild(this.olModoNota);

      /* Los cuatro modos como PÓSTERES (los mismos del carrusel de la
       * portada, js/portadas.js). El encendido se abre abajo en su ficha. */
      var cartelera = el('div', 'ol-cartelera');
      this.olPosters = {};
      this.OL_MODOS.forEach(function (mo) {
        var b = self.makeButton('', function () { self.pickPartyModo(mo.id); });
        b.classList.add('ol-poster');
        b.style.setProperty('--mc', mo.color);
        b.setAttribute('aria-label', mo.name);
        var cv = document.createElement('canvas');
        cv.className = 'ol-poster-cv';
        cv.width = 180; cv.height = 235;
        b.appendChild(cv);
        var pie = el('span', 'ol-poster-pie');
        pie.appendChild(el('span', 'ol-poster-nombre', mo.name));
        pie.appendChild(el('small', 'ol-poster-tag', mo.tag));
        b.appendChild(pie);
        self.ponRonda(b, 'btn-ronda');
        self.olPosters[mo.id] = { b: b, cv: cv, mo: mo };
        cartelera.appendChild(b);
      });
      der.appendChild(cartelera);

      /* La ficha: una por modo, se enseña la del elegido */
      this.olFichas = {};
      var fichas = el('div', 'ol-fichas');

      function ficha(id, color, titulo, reglas) {
        var f = el('div', 'ol-ficha');
        f.style.setProperty('--mc', color);
        f.style.visibility = 'hidden';
        f.setAttribute('aria-hidden', 'true');
        var cab = el('div', 'ol-ficha-cab');
        cab.appendChild(el('span', 'ol-ficha-nombre', titulo));
        f.appendChild(cab);
        var lista = el('div', 'ol-reglas');
        reglas.forEach(function (r) { lista.appendChild(el('div', 'ol-regla', r)); });
        f.appendChild(lista);
        self.olFichas[id] = f;
        fichas.appendChild(f);
        return f;
      }

      /* EQUIPO (el clásico de la party): aquí va quién lleva fantasma */
      var fEquipo = ficha('equipo', '#00ff66', 'EN EQUIPO', [
        'TODOS A UNA CONTRA LOS FANTASMAS',
        'LA PUNTUACIÓN ES DEL EQUIPO',
        'CADA UNO CON SUS VIDAS'
      ]);
      fEquipo.appendChild(el('div', 'ol-ficha-sub', 'TU PERSONAJE'));
      var vsRow = el('div', 'ol-personajes');
      this.vsBtns = {};
      this.vsChoices().forEach(function (op) {
        var b = self.makeButton('', function () { self.pickVsGhost(op[0]); });
        b.classList.add('ol-pj');
        var cv = document.createElement('canvas');
        cv.width = 40; cv.height = 40;
        cv.className = 'ol-pj-icono';
        self.pintarPersonaje(cv, op[0]);
        b.appendChild(cv);
        var nom = el('span', 'ol-pj-nombre', op[1]);
        if (op[0] >= 0) b.style.setProperty('--pj', CFG.GHOSTS[op[0]].color);
        b.appendChild(nom);
        self.vsBtns[op[0]] = b;
        vsRow.appendChild(b);
      });
      fEquipo.appendChild(vsRow);
      fEquipo.appendChild(el('div', 'ol-card-texto', 'CON UN FANTASMA CAZAS TÚ A LOS PAC-MAN. ' +
        'ALGUIEN TIENE QUE QUEDARSE DE PAC-MAN'));

      /* DESATADO: el rol lo elige cada uno */
      var fHab = ficha('hab', '#ff66cc', 'DESATADO', [
        'CUATRO PODERES EN Q W E R, CON SU RECARGA',
        'AQUÍ SE MUEVE SOLO CON LAS FLECHAS',
        'CADA 5 NIVELES, EL REY FANTASMA',
        'TOP MUNDIAL Y MAESTRÍAS PROPIOS'
      ]);
      fHab.appendChild(el('div', 'ol-ficha-sub', 'TU ROL'));
      this.habRolBox = el('div', 'ol-roles');
      this.habRolBtns = {};
      CFG.HAB.ROL_IDS.forEach(function (id) {
        var info = CFG.HAB.ROL_INFO[id];
        var b = self.makeButton('', function () {
          if (window.PM.Party) window.PM.Party.setRol(id);
          saveSettings();
        });
        b.classList.add('rol-carta');
        b.style.setProperty('--rol', info.color);
        b.appendChild(el('span', 'rol-carta-nombre', info.name));
        b.appendChild(el('small', 'rol-carta-lema', info.lema.split(' · ')[0]));
        self.habRolBtns[id] = b;
        self.habRolBox.appendChild(b);
      });
      fHab.appendChild(this.habRolBox);
      fHab.appendChild(el('div', 'ol-card-texto', 'SOLO CABE UN SOPORTE: EL PRIMERO QUE LO COGE SE LO QUEDA'));

      /* CACERÍA */
      var fCaza = ficha('caza', '#ff3b3b', 'CACERÍA', [
        'TODOS DE FANTASMA CONTRA UN PAC-MAN DE MÁQUINA',
        'SIN SUPERPASTILLAS: SU PODER LLEGA SOLO CADA ' + CFG.CAZA.periodo(0) + ' S, CON AVISO',
        CFG.CAZA.NIVELES + ' RONDAS, Y CADA UNA APRIETA MÁS'
      ]);
      fCaza.appendChild(el('div', 'ol-card-texto', 'CADA UNO LLEVA EL FANTASMA DE SU ASIENTO: NO HAY NADA QUE ELEGIR'));

      /* SUPERVIVENCIA */
      var fSv = ficha('superv', '#ffd400', 'SUPERVIVENCIA', [
        'TODOS CONTRA TODOS, UNA VIDA CADA UNO',
        'LA SUPERPASTILLA TE DEJA ELIMINAR A LOS DEMÁS UNOS SEGUNDOS',
        'LA ZONA SE CIERRA: FUERA DE ELLA NO SE AGUANTA',
        'GANA EL ÚLTIMO EN PIE'
      ]);
      fSv.appendChild(el('div', 'ol-card-texto', 'TODOS SALEN DE PAC-MAN · NO CUENTA PARA EL TOP MUNDIAL'));

      der.appendChild(fichas);
      cols.appendChild(der);
      room.appendChild(cols);

      this.lobbyStatusEl = el('div', 'lobby-status');
      room.appendChild(this.lobbyStatusEl);

      var pie = el('div', 'prompt-btns ol-pie');
      this.startPartyBtn = this.makeButton('EMPEZAR PARTIDA', function () { self.partyStart(); });
      this.startPartyBtn.classList.add('btn-primary');
      pie.appendChild(this.startPartyBtn);
      var volver = this.makeButton('VOLVER AL MENÚ', function () {
        self.showMenu();      // la party sigue conectada
      });
      this.ponRonda(volver, 'btn-ronda');
      pie.appendChild(volver);
      var salir = this.makeButton('SALIR DE LA PARTY', function () { self.partyLeave(); });
      this.ponRonda(salir, 'btn-ronda');
      pie.appendChild(salir);
      room.appendChild(pie);
      o.appendChild(room);
    },

    /* Los cuatro Pac-Man de colores detrás de un fantasma azul (la carta de
     * CREAR PARTY) */
    pintarEscenaOnline: function (cv) {
      var Sp = window.PM.Sprites, c = cv.getContext && cv.getContext('2d');
      if (!Sp || !c) return;
      try {
        c.save();
        c.scale(2, 2);
        Sp.drawGhost(c, 12, 10, CFG.DIR.RIGHT, 0, 'fright', 0, false);
        for (var i = 0; i < 4; i++) {
          Sp.drawPacman(c, 34 + i * 16, 10, CFG.DIR.LEFT, 1, CFG.PLAYER_COLORS[i], 'clasico', {});
        }
        c.restore();
      } catch (e) { /* sin lienzo (pruebas) */ }
    },

    /* Icono de un personaje de la sala: -1 Pac-Man, 0..3 un fantasma */
    pintarPersonaje: function (cv, gid, color, skin) {
      var Sp = window.PM.Sprites, c = cv.getContext && cv.getContext('2d');
      if (!Sp || !c) return;
      try {
        c.clearRect(0, 0, cv.width, cv.height);
        c.save();
        c.scale(cv.width / 16, cv.height / 16);
        if (gid >= 0) Sp.drawGhost(c, 8, 8, CFG.DIR.RIGHT, gid, 'normal', 0, false);
        else Sp.drawPacman(c, 8, 8, 3, 1, color || '#ffff00', skin || 'clasico', {});
        c.restore();
      } catch (e) { /* sin lienzo (pruebas) */ }
    },

    setLobbyStatus: function (text, isError) {
      this.lobbyStatusEl.textContent = text;
      this.lobbyStatusEl.classList.toggle('error', !!isError);
    },

    showOnlineIdle: function () {
      this.onlineIdle.style.display = 'flex';
      this.onlineRoom.style.display = 'none';
      var ok = window.PM.Net.configured();
      this.onlineWarn.style.display = ok ? 'none' : 'block';
      if (!ok) {
        this.onlineWarn.textContent =
          'EL MODO ONLINE AÚN NO ESTÁ CONFIGURADO: FALTAN LAS CREDENCIALES DE SUPABASE EN js/net-config.js';
      }
      this.createBtn.disabled = !ok;
      this.joinBtn.disabled = !ok;
      this.codeInput.disabled = !ok;
    },

    copyLink: function () {
      var self = this;
      var P = window.PM.Party;
      var text = window.PM.Net.roomLink((P && P.code()) || '');
      function done() {
        self.copyBtn.textContent = '¡COPIADO!';
        setTimeout(function () { self.copyBtn.textContent = 'COPIAR ENLACE'; }, 1500);
      }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); }
        catch (e) { /* sin permiso: el enlace queda visible para copiar a mano */ }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    },

    /* Ajustes que impone el anfitrión, saneados en ambos extremos */
    netCfgSubset: function () {
      var s = window.PM.settings, out = {}, i;
      for (i = 0; i < NET_CFG_KEYS.length; i++) {
        out[NET_CFG_KEYS[i]] = s[NET_CFG_KEYS[i]];
      }
      return out;
    },

    sanitizeNetCfg: function (raw) {
      var def = CFG.DEFAULT_SETTINGS, out = {}, i, k;
      raw = raw || {};
      for (i = 0; i < NET_CFG_KEYS.length; i++) {
        k = NET_CFG_KEYS[i];
        out[k] = sanitizeSetting(k, raw[k], def[k]);
      }
      return out;
    },

    /* ----- party: crear, unirse, invitar y empezar -----
     * La party no se cierra al volver al menú ni al acabar la partida: el
     * grupo sigue junto y el líder puede echar otra sin pasar el código. */
    partyHooks: function () {
      var self = this;
      var P = window.PM.Party;
      if (!P) return;
      P.onchange = function () {
        self.refreshParty();
        self.refreshOnlineBtn();
      };
      P.onerror = function (msg) { self.partyError(msg); };
      P.oninvite = function (from, code) { self.askInvite(from, code); };
      P.onstart = function (order, idx, cfg, role, hab, caza, sv) {
        self.startPartyGame(order, idx, cfg, role, hab, caza, sv);
      };
      P.listen();
    },

    partyCreate: function () {
      var P = window.PM.Party;
      if (!P || !window.PM.Net.configured()) return;
      this.onlineWarn.style.display = 'none';
      P.create();
    },

    partyJoin: function (code) {
      var P = window.PM.Party;
      if (!P || !window.PM.Net.configured()) return;
      code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
      if (code.length !== CFG.NET.ROOM_LEN) {
        this.onlineWarn.style.display = 'block';
        this.onlineWarn.textContent = 'EL CÓDIGO TIENE ' + CFG.NET.ROOM_LEN + ' LETRAS';
        return;
      }
      this.onlineWarn.style.display = 'none';
      P.join(code);
    },

    partyLeave: function () {
      var P = window.PM.Party;
      if (P) P.leave();
      this.showOnlineIdle();
    },

    partyStart: function () {
      var P = window.PM.Party;
      if (P) P.startGame();
    },

    /* Los modos de la party, en el orden de la cartelera. El id es el del
     * póster (js/portadas.js) y el que se le pide a PM.Party. */
    OL_MODOS: [
      { id: 'equipo', poster: 'clasico', name: 'EN EQUIPO', tag: 'CONTRA LOS FANTASMAS', color: '#ffff00' },
      { id: 'hab', name: 'DESATADO', tag: 'PODERES Y ROLES', color: '#ff66cc' },
      { id: 'caza', name: 'CACERÍA', tag: 'TODOS DE FANTASMA', color: '#ff3b3b' },
      { id: 'superv', name: 'SUPERVIVENCIA', tag: 'EL ÚLTIMO EN PIE', color: '#ffd400' }
    ],

    /* Qué modo tiene puesto la party ahora mismo */
    partyModo: function (P) {
      if (!P) return 'equipo';
      if (P.supervPick) return 'superv';
      if (P.cazaPick) return 'caza';
      if (P.habPick) return 'hab';
      return 'equipo';
    },

    /* Elegir un póster de la cartelera (solo el líder) */
    pickPartyModo: function (id) {
      var P = window.PM.Party;
      if (!P || !P.isLeader()) return;
      P.setModo(id);
    },

    /* PAC-MAN VS.: pedir un fantasma (o volver a Pac-Man con -1) */
    pickVsGhost: function (gid) {
      var P = window.PM.Party;
      if (P) P.setGhost(gid);
    },

    partyError: function (msg) {
      this.showOnlineIdle();
      this.onlineWarn.style.display = 'block';
      this.onlineWarn.textContent = msg || 'SIN CONEXIÓN';
    },

    /* Lista de miembros y estado de los botones */
    refreshParty: function () {
      var P = window.PM.Party;
      if (!this.onlineRoom || !P) return;
      if (!P.inParty()) {
        if (this.els.online.style.display !== 'none') this.showOnlineIdle();
        return;
      }
      this.onlineIdle.style.display = 'none';
      this.onlineRoom.style.display = 'flex';
      this.animarCartelera();
      var code = P.code() || '';
      /* el código, letra a letra en su casilla */
      this.roomCodeEl.innerHTML = '';
      for (var ci = 0; ci < code.length; ci++) {
        var letra = document.createElement('span');
        letra.className = 'ol-letra';
        letra.textContent = code.charAt(ci);
        this.roomCodeEl.appendChild(letra);
      }
      this.roomLinkEl.textContent = window.PM.Net.roomLink(code);

      /* las plazas: las ocupadas con su Pac-Man (o su fantasma) y las libres */
      var ms = P.members();
      if (this.partyCountEl) this.partyCountEl.textContent = 'JUGADORES ' + ms.length + '/' + CFG.MAX_PLAYERS;
      this.partyList.innerHTML = '';
      for (var i = 0; i < CFG.MAX_PLAYERS; i++) {
        var row = document.createElement('div');
        var m = ms[i];
        if (!m) {
          row.className = 'ol-plaza libre';
          var hueco = document.createElement('span');
          hueco.className = 'ol-plaza-nombre';
          hueco.textContent = 'PLAZA LIBRE';
          row.appendChild(hueco);
          this.partyList.appendChild(row);
          continue;
        }
        row.className = 'ol-plaza';
        var color = m.c || CFG.PLAYER_COLORS[i];
        row.style.setProperty('--jc', color);
        // PAC-MAN VS.: se ve de un vistazo quién lleva fantasma y cuál. En
        // CACERÍA lleva cada uno el de su asiento, y se enseña ese.
        var gv = P.cazaPick ? Math.min(i, 3) : m.g;
        var cv = document.createElement('canvas');
        cv.width = 40; cv.height = 40;
        cv.className = 'ol-plaza-icono';
        this.pintarPersonaje(cv, (gv >= 0 && gv < 4) ? gv : -1, color, m.k);
        row.appendChild(cv);

        var n = document.createElement('span');
        n.className = 'ol-plaza-nombre';
        n.textContent = m.n || ('J' + (i + 1));
        row.appendChild(n);

        var tags = document.createElement('span');
        tags.className = 'ol-plaza-tags';
        if (i === 0) tags.appendChild(this.olTag('LÍDER', '#ffff00'));
        if (m.s === window.PM.Net.sid) tags.appendChild(this.olTag('TÚ', '#00ff66'));
        if (gv >= 0 && gv < 4) tags.appendChild(this.olTag(CFG.VS.NAMES[gv], CFG.GHOSTS[gv].color));
        if (P.habPick && m.r && CFG.HAB.ROL_INFO[m.r]) {
          tags.appendChild(this.olTag(CFG.HAB.ROL_INFO[m.r].name, CFG.HAB.ROL_INFO[m.r].color));
        }
        row.appendChild(tags);
        this.partyList.appendChild(row);
      }

      /* selector de personaje: apagados los fantasmas que ya lleva otro */
      var mio = P.myGhost();
      for (var v = -1; v < 4; v++) {
        var vb = this.vsBtns[v];
        if (!vb) continue;
        var duenyo = (v >= 0) ? P.ghostOwner(v) : null;
        vb.disabled = !!(duenyo && duenyo !== window.PM.Net.sid);
        vb.classList.toggle('active', v === mio);
      }

      var lider = P.isLeader();
      var modo = this.partyModo(P);
      if (this.olModoNota) this.olModoNota.style.display = lider ? 'none' : '';
      /* LA CARTELERA: el póster del modo puesto se enciende, los demás se
       * apagan; y solo el líder puede cambiarlo (pero todos lo ven). */
      if (this.olPosters) {
        for (var pid in this.olPosters) {
          if (!this.olPosters.hasOwnProperty(pid)) continue;
          var po = this.olPosters[pid];
          po.b.classList.toggle('active', pid === modo);
          po.b.disabled = !lider;
          po.b.setAttribute('aria-pressed', pid === modo ? 'true' : 'false');
        }
      }
      if (this.olFichas) {
        for (var fid in this.olFichas) {
          if (!this.olFichas.hasOwnProperty(fid)) continue;
          var esta = (fid === modo);
          this.olFichas[fid].style.visibility = esta ? 'visible' : 'hidden';
          this.olFichas[fid].setAttribute('aria-hidden', esta ? 'false' : 'true');
        }
      }
      /* DESATADO: el rol lo elige cada uno, no el líder */
      if (this.habRolBtns) {
        var miRol = P.myRol ? P.myRol() : 'asesino';
        var otroSop = P.soporteDeOtro ? P.soporteDeOtro() : false;
        for (var rid in this.habRolBtns) {
          if (!this.habRolBtns.hasOwnProperty(rid)) continue;
          this.habRolBtns[rid].classList.toggle('active', rid === miRol);
          this.habRolBtns[rid].disabled = (rid === 'soporte' && otroSop);
        }
      }
      this.startPartyBtn.style.display = lider ? '' : 'none';
      this.startPartyBtn.disabled = !P.canStart();
      this.startPartyBtn.textContent = 'EMPEZAR PARTIDA (' + P.count() + ')';
      this.ponRonda(this.startPartyBtn, 'btn-ronda');
      this.inviteBtn.disabled = !P.active();
      this.setLobbyStatus(
        P.connecting() ? 'CONECTANDO...'
        : (!P.anyPac() && !P.cazaPick) ? 'ALGUIEN TIENE QUE LLEVAR UN PAC-MAN'
        : lider ? (P.count() < 2 ? 'ESPERANDO A MÁS JUGADORES...'
                                 : 'CUANDO QUIERAS, EMPEZAD')
                : 'ESPERANDO A QUE EL LÍDER EMPIECE...');
    },

    /* Una etiqueta de color de la plaza (LÍDER, TÚ, el fantasma, el rol) */
    olTag: function (txt, color) {
      var t = document.createElement('span');
      t.className = 'ol-tag';
      t.style.setProperty('--tc', color);
      t.textContent = txt;
      return t;
    },

    /* Invitar: se le manda el código a su canal personal (su nombre) */
    /* A quién avisar: tus amigos guardados como fichas con su Pac-Man, y el
     * código de la party a la vista para pasarlo por donde sea. */
    askInviteWho: function () {
      var self = this;
      var F = window.PM.Friends;
      var P = window.PM.Party;
      var list = (F ? F.all() : []).slice(0, 8);
      var code = (P && P.code()) || '';
      this.showPrompt({
        title: 'INVITAR',
        arcade: true,
        tono: 'verde',
        custom: function (p) {
          var sub = document.createElement('div');
          sub.className = 'inv-sub';
          sub.textContent = list.length ? 'LE LLEGA EL AVISO EN CUANTO ABRA EL JUEGO'
                                        : 'TODAVÍA NO TIENES AMIGOS GUARDADOS';
          p.appendChild(sub);

          if (list.length) {
            var rejilla = document.createElement('div');
            rejilla.className = 'inv-rejilla';
            list.forEach(function (name, i) {
              var b = self.makeButton('', function () {
                self.hidePrompt();
                self.sendInvite(name);
              });
              b.classList.add('inv-ficha');
              b.style.setProperty('--ic', CFG.PLAYER_COLORS[i % CFG.PLAYER_COLORS.length]);
              var cv = document.createElement('canvas');
              cv.width = 40; cv.height = 40;
              cv.className = 'inv-icono';
              self.pintarPersonaje(cv, -1, CFG.PLAYER_COLORS[i % CFG.PLAYER_COLORS.length], 'clasico');
              b.appendChild(cv);
              var n = document.createElement('span');
              n.className = 'inv-nombre';
              n.textContent = name;
              b.appendChild(n);
              self.ponRonda(b, 'btn-ronda');
              rejilla.appendChild(b);
            });
            p.appendChild(rejilla);
          }

          if (code) {
            var pie = document.createElement('div');
            pie.className = 'inv-codigo';
            pie.textContent = 'O PÁSALE EL CÓDIGO: ' + code.split('').join(' ');
            p.appendChild(pie);
          }
        },
        buttons: [
          { label: 'OTRO NOMBRE', primary: true, hint: 'ENTER', keys: ['Enter'],
            onClick: function () { self.hidePrompt(); self.askInviteName(); } },
          { label: 'COPIAR ENLACE', onClick: function () { self.copyLink(); } },
          { label: 'VOLVER', hint: 'ESC', keys: ['Escape'],
            onClick: function () { self.hidePrompt(); } }
        ]
      });
    },

    askInviteName: function () {
      var self = this;
      function enviar() {
        var v = self.promptInput ? self.promptInput.value : '';
        self.hidePrompt();
        self.sendInvite(v);
      }
      this.showPrompt({
        title: 'INVITAR A LA PARTY',
        lines: ['ESCRIBE SU NOMBRE DE JUGADOR'],
        input: { placeholder: 'NOMBRE', onAccept: function () { enviar(); } },
        buttons: [
          { label: 'INVITAR', primary: true, onClick: enviar },
          { label: 'VOLVER', keys: ['Escape'], hint: 'ESC',
            onClick: function () { self.hidePrompt(); } }
        ]
      });
      if (this.promptInput) this.promptInput.focus();
    },

    sendInvite: function (name) {
      var self = this;
      var P = window.PM.Party;
      if (!P) return;
      this.setLobbyStatus('ENVIANDO INVITACIÓN...');
      P.invite(name, function (ok, msg) {
        self.setLobbyStatus(msg || '', !ok);
      });
    },

    /* Nos invitan: preguntar antes de mover a nadie de sitio */
    askInvite: function (from, code) {
      var self = this;
      if (window.PM.Game && window.PM.Game.inGame()) return;   // en partida, no
      this.showPrompt({
        title: 'INVITACIÓN',
        lines: [(from || 'ALGUIEN') + ' TE INVITA A SU PARTY',
                { text: code.split('').join(' '), big: true }],
        buttons: [
          { label: 'ENTRAR', primary: true, keys: ['Enter'], hint: 'ENTER',
            onClick: function () {
              self.hidePrompt();
              self.showOnline();
              self.partyJoin(code);
            } },
          { label: 'AHORA NO', keys: ['Escape'], hint: 'ESC',
            onClick: function () { self.hidePrompt(); } }
        ]
      });
    },

    startPartyGame: function (order, idx, cfg, role, hab, caza, sv) {
      this.hidePrompt();
      this.hideAll();
      this.resumeAudio();
      var colors = [], names = [], skins = [], ghosts = [], looks = [], roles = [];
      for (var i = 0; i < order.length; i++) {
        roles.push(CFG.HAB.rol(order[i].r));
        colors.push(sanitizeSetting('pacColor', order[i].c, CFG.PLAYER_COLORS[i]));
        names.push(sanitizeNick(order[i].n) || ('J' + (i + 1)));
        skins.push(sanitizeSetting('skin1', order[i].k, 'clasico'));
        ghosts.push(sanitizeSetting('vsGhost2', order[i].g, -1));
        looks.push(this.lookDeRed(order[i]));
      }
      window.PM.Game.newGame({
        players: order.length, net: role, localIdx: idx,
        cfg: (role === 'guest') ? this.sanitizeNetCfg(cfg) : null,
        colors: colors, names: names, skins: skins, ghosts: ghosts, looks: looks,
        hab: !!hab,           // lo enciende quien manda, y vale para todos
        roles: roles,         // ...y cada uno con el rol que eligió en la sala
        caza: !!caza,         // ídem: todos de fantasma contra la máquina
        superv: !!sv          // SUPERVIVENCIA: todos contra todos
      });
    },

    /* Accesorio y efecto de otro jugador, tal y como llegan por la red: lo
     * que no exista en este juego no se pinta (una versión más nueva de la
     * tienda no rompe a una más vieja). */
    lookDeRed: function (d) {
      return {
        a: sanitizeSetting('acc1', d && d.a, ''),
        x: sanitizeSetting('efx1', d && d.x, '')
      };
    },

    cancelLobby: function () {
      var P = window.PM.Party;
      if (P) P.leave();
    },

    /* ------------------------------------------------------
     * Panel de maestrías (insignias por récord personal)
     * ------------------------------------------------------ */
    buildBadges: function () {
      var self = this;
      var o = this.els.badges;
      o.innerHTML = '';

      /* EL TRONO: arriba el título y la liga (dos desplegables, como en el
       * ranking); en medio tu maestría en grande, armándose, con tu récord y
       * lo que falta; abajo el camino de los seis emblemas unidos por una
       * línea de oro que se llena hasta donde has llegado. */
      var cab = document.createElement('div');
      cab.className = 'maes-cab';
      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'MAESTRÍAS';
      cab.appendChild(h);

      /* DOCE rutas independientes, elegidas por sus dos ejes: DÓNDE se juega
       * (el laberinto de 1980, LABERINTOS o DESATADO) y CUÁNTOS jugáis. */
      var B0 = window.PM.Badges;
      var mandos = document.createElement('div');
      mandos.className = 'maes-mandos';
      this.badgeMundoDesp = this.desplegable('MUNDO',
        (B0 ? B0.MUNDOS : []).map(function (m) { return { id: m.id, name: m.name }; }),
        function (id) { self.showBadgeTab(id, null); });
      this.badgeFmtDesp = this.desplegable('FORMATO',
        (B0 ? B0.FORMATOS : []).map(function (f) { return { id: f.n, name: f.name }; }),
        function (n) { self.showBadgeTab(null, n); });
      mandos.appendChild(this.badgeMundoDesp.el);
      mandos.appendChild(this.badgeFmtDesp.el);
      cab.appendChild(mandos);
      o.appendChild(cab);

      this.badgesSub = document.createElement('div');
      this.badgesSub.className = 'note maes-nota';
      o.appendChild(this.badgesSub);

      var cuerpo = document.createElement('div');
      cuerpo.className = 'maes-cuerpo';
      o.appendChild(cuerpo);

      // el emblema en grande: 200x240 lógicos a doble escala
      this.badgeHero = document.createElement('canvas');
      this.badgeHero.width = 400;
      this.badgeHero.height = 480;
      this.badgeHero.className = 'maes-heroe';
      cuerpo.appendChild(this.badgeHero);

      var info = document.createElement('div');
      info.className = 'maes-info';
      cuerpo.appendChild(info);
      this.badgeInfo = info;

      this.badgeStageKicker = document.createElement('div');
      this.badgeStageKicker.className = 'maes-k';
      info.appendChild(this.badgeStageKicker);

      this.badgeStageName = document.createElement('div');
      this.badgeStageName.className = 'maes-nombre';
      info.appendChild(this.badgeStageName);

      this.badgeStageState = document.createElement('div');
      this.badgeStageState.className = 'maes-estado';
      info.appendChild(this.badgeStageState);

      this.badgeDatos = document.createElement('div');
      this.badgeDatos.className = 'maes-datos';
      info.appendChild(this.badgeDatos);

      this.badgeSig = document.createElement('div');
      this.badgeSig.className = 'maes-sig';
      info.appendChild(this.badgeSig);

      // el camino: la lista de los seis (cada paso es un botón)
      var camino = document.createElement('div');
      camino.className = 'maes-camino';
      var linea = document.createElement('div');
      linea.className = 'maes-linea';
      this.badgeLleno = document.createElement('div');
      this.badgeLleno.className = 'maes-lleno';
      linea.appendChild(this.badgeLleno);
      camino.appendChild(linea);
      this.badgesList = document.createElement('div');
      this.badgesList.className = 'maes-pasos';
      camino.appendChild(this.badgesList);
      o.appendChild(camino);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);

      this.badgeMundo = 'clasico';
      this.badgeFmt = 1;
      this.badgeTab = 'solo';
      this.badgePick = null;
      this.badgeLienzos = [];
    },

    /* Cambia uno de los dos ejes (el otro va a null y se queda como estaba) y
     * recalcula la ruta. Se puede entrar también con una ruta hecha —lo hace
     * showBadges con la del modo en curso—, y entonces se deshace en sus dos
     * piezas para que los desplegables queden donde toca. */
    showBadgeTab: function (mundo, n) {
      var B = window.PM.Badges;
      if (!B) return;
      if (mundo && B.MODES.indexOf(mundo) !== -1 && n == null) {
        // ha llegado una ruta entera, no un mundo
        n = B.players(mundo);
        mundo = B.mundoDe(mundo);
      }
      if (mundo) this.badgeMundo = mundo;
      if (n) this.badgeFmt = n;
      this.badgeTab = B.ruta(this.badgeMundo === 'clasico' ? null : this.badgeMundo,
                             this.badgeFmt);
      this.badgeMundo = B.mundoDe(this.badgeTab);
      this.badgeFmt = B.players(this.badgeTab);
      this.badgePick = null;      // cada ruta empieza por la suya
      this.refreshBadges();
    },

    /* 42350 -> '42.350' */
    milesMaes: function (n) {
      return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },

    refreshBadges: function () {
      var B = window.PM.Badges;
      var mode = this.badgeTab || 'solo';
      if (this.badgeMundoDesp) this.badgeMundoDesp.poner(this.badgeMundo);
      if (this.badgeFmtDesp) this.badgeFmtDesp.poner(this.badgeFmt);
      var best = B ? B.best(mode) : 0;
      var next = B ? B.next(mode) : null;
      /* Cada formato es su propia liga: su récord, sus insignias y su listón.
       * Cuanta más gente juega, más puntos pide cada escalón. */
      var meta = function (b) { return B ? B.goal(b, mode) : b.points; };
      /* La coletilla explica POR QUÉ esa ruta pide lo que pide, que si no
       * los números parecen puestos a dedo. */
      var nota = '';
      var mundo = B ? B.mundoDe(mode) : 'clasico';
      if (mundo === 'lab') {
        nota = '  ·  OTRO TRAZADO, OTRA LIGA: LO DE AQUÍ NO ENTREGA LAS DEL ' +
               'LABERINTO DE 1980';
      } else if (mundo === 'hab') {
        nota = '  ·  CON PODERES LOS PUNTOS SON MÁS BARATOS, ASÍ QUE ESTE ' +
               'MUNDO TIENE SUS PROPIOS ESCALONES, MÁS ALTOS';
      } else if (mode !== 'solo') {
        nota = '  ·  CADA FORMATO ES UNA LIGA APARTE Y PIDE MÁS PUNTOS ' +
               'CUANTOS MÁS SEÁIS';
      }
      this.badgesSub.textContent =
        'RÉCORD EN ' + (B ? B.modeName(mode) : 'SOLO') + ': ' + best +
        (next ? ('  ·  SIGUIENTE: ' + next.name + ' A ' + meta(next))
              : '  ·  ¡TODAS CONSEGUIDAS!') + nota;
      this.badgesList.innerHTML = '';
      this.badgeRows = {};
      this.badgeLienzos = [];
      var self = this;
      var S = window.PM.Sprites;
      var gema = (S && S.EMBLEM_GEMA) || [];
      var lleno = this.badgeLleno;
      CFG.BADGES.forEach(function (b, i) {
        var puntos = meta(b);
        var got = best >= puntos;
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'maes-paso' + (got ? ' got' : '');

        var cv = document.createElement('canvas');
        cv.width = 120; cv.height = 144;
        cv.className = 'maes-mini';
        row.appendChild(cv);
        var L = { cv: cv, rango: i, off: !got, a0: Date.now() + 250 + i * 160 };
        self.badgeLienzos.push(L);
        // al pasar por encima se vuelve a armar
        row.addEventListener('mouseenter', function () {
          if (!L.off && (Date.now() - L.a0) / 1000 > 2.6) L.a0 = Date.now();
        });

        var nm = document.createElement('b');
        nm.className = 'maes-paso-nombre';
        nm.style.color = got ? (gema[i] || b.color) : '#4a4868';
        nm.textContent = b.name;
        row.appendChild(nm);
        var pt = document.createElement('small');
        pt.className = 'maes-paso-puntos';
        pt.textContent = self.milesMaes(puntos);
        row.appendChild(pt);

        row.addEventListener('click', function () { self.pickBadge(b.id, true); });

        self.badgeRows[b.id] = row;
        self.badgesList.appendChild(row);
      });

      /* la línea de oro: hasta la tuya y un tramo proporcional hacia la
       * siguiente */
      var top = B ? B.top(mode) : null;
      var tu = -1;
      for (var k = 0; k < CFG.BADGES.length; k++) if (top && CFG.BADGES[k].id === top.id) tu = k;
      var frac = 0;
      if (tu >= 0 && tu < CFG.BADGES.length - 1) {
        var desde = meta(CFG.BADGES[tu]), hasta = meta(CFG.BADGES[tu + 1]);
        frac = Math.max(0, Math.min(1, (best - desde) / Math.max(1, hasta - desde)));
      }
      var tramo = 100 / (CFG.BADGES.length - 1);
      lleno.style.width = (tu < 0 ? 0 : Math.min(100, (tu + frac) * tramo)) + '%';
      if (top && this.badgeRows[top.id]) {
        var tuya = document.createElement('span');
        tuya.className = 'maes-tuya';
        tuya.textContent = 'TUYA';
        this.badgeRows[top.id].appendChild(tuya);
      }

      /* De entrada, la que tienes: la más alta conseguida en esta ruta. Si
       * aún no hay ninguna, la primera por conseguir. */
      var pick = (this.badgePick && this.badgeRows[this.badgePick])
        ? this.badgePick
        : (top ? top.id : CFG.BADGES[0].id);
      this.pickBadge(pick, true);
    },

    /* Elige una maestría: la marca en el camino y la enseña en grande.
     * play=true la vuelve a armar desde cero. */
    pickBadge: function (id, play) {
      var B = window.PM.Badges;
      var mode = this.badgeTab || 'solo';
      var badge = null, rango = 0;
      for (var i = 0; i < CFG.BADGES.length; i++) {
        if (CFG.BADGES[i].id === id) { badge = CFG.BADGES[i]; rango = i; }
      }
      if (!badge || !this.badgeStageName) return;
      var cambia = this.badgePick !== badge.id;
      this.badgePick = badge.id;

      var best = B ? B.best(mode) : 0;
      var top = B ? B.top(mode) : null;
      var next = B ? B.next(mode) : null;
      var puntos = B ? B.goal(badge, mode) : badge.points;
      var got = best >= puntos;
      var S = window.PM.Sprites;
      var gema = (S && S.EMBLEM_GEMA) || [];
      var color = gema[rango] || badge.color;
      var mundoDe = B ? B.mundoDe(mode) : 'clasico', donde = '';
      (B ? B.MUNDOS : []).forEach(function (m) { if (m.id === mundoDe) donde = m.name; });
      donde += ' · ' + (B && B.formatoName ? B.formatoName(mode) : 'SOLO');

      for (var k in this.badgeRows) {
        if (this.badgeRows.hasOwnProperty(k)) {
          var sel = (k === badge.id);
          this.badgeRows[k].classList.toggle('sel', sel);
          this.badgeRows[k].setAttribute('aria-pressed', sel ? 'true' : 'false');
        }
      }

      var esTuya = got && top && top.id === badge.id;
      this.badgeInfo.style.setProperty('--c', color);
      this.badgeInfo.classList.toggle('off', !got);
      this.badgeStageKicker.textContent =
        donde;
      this.badgeStageName.textContent = badge.name;
      this.badgeStageName.style.color = '';
      this.badgeStageState.textContent = got
        ? ((esTuya ? 'TU MAESTRÍA · ' : 'CONSEGUIDA · ') + this.milesMaes(puntos) + ' PUNTOS')
        : ('TE FALTAN ' + this.milesMaes(puntos - best) + ' PUNTOS PARA CONSEGUIRLA');

      var tienes = B ? B.earned(mode).length : 0;
      this.badgeDatos.innerHTML = '';
      var self = this;
      [[this.milesMaes(best), 'TU RÉCORD'], [this.milesMaes(puntos), 'PIDE'],
       [tienes + ' / ' + CFG.BADGES.length, 'EMBLEMAS']].forEach(function (d) {
        var c = document.createElement('div');
        var v = document.createElement('b');
        v.textContent = d[0];
        var r = document.createElement('span');
        r.textContent = d[1];
        c.appendChild(v);
        c.appendChild(r);
        self.badgeDatos.appendChild(c);
      });

      /* debajo, la barra: de la tuya hacia la siguiente; de una que no
       * tienes, cuánto llevas de lo que pide */
      this.badgeSig.innerHTML = '';
      var fila = document.createElement('div');
      fila.className = 'maes-sig-fila';
      var izq = document.createElement('span');
      var der = document.createElement('span');
      var pct = 1;
      if (esTuya && next) {
        var desde = B.goal(badge, mode), hasta = B.goal(next, mode);
        pct = Math.max(0, Math.min(1, (best - desde) / Math.max(1, hasta - desde)));
        izq.appendChild(document.createTextNode('SIGUIENTE: '));
        var em = document.createElement('em');
        em.textContent = next.name;
        for (var j = 0; j < CFG.BADGES.length; j++) {
          if (CFG.BADGES[j].id === next.id) em.style.color = gema[j] || next.color;
        }
        izq.appendChild(em);
        der.textContent = 'TE FALTAN ' + this.milesMaes(hasta - best);
      } else if (!got) {
        pct = Math.max(0, Math.min(1, best / Math.max(1, puntos)));
        izq.textContent = 'SE FORJA A ' + this.milesMaes(puntos) + ' PUNTOS';
        der.textContent = Math.floor(pct * 100) + '%';
      } else if (esTuya) {
        izq.textContent = 'NO HAY NADA MÁS ARRIBA';
      } else {
        izq.textContent = 'YA ES TUYA';
      }
      fila.appendChild(izq);
      fila.appendChild(der);
      this.badgeSig.appendChild(fila);
      if (!got || (esTuya && next)) {
        var barra = document.createElement('div');
        barra.className = 'maes-barra';
        var relleno = document.createElement('i');
        relleno.style.width = (pct * 100).toFixed(1) + '%';
        barra.appendChild(relleno);
        this.badgeSig.appendChild(barra);
      }

      if (play || cambia || !this.badgeHeroL) {
        this.badgeHeroL = { cv: this.badgeHero, rango: rango, off: !got, a0: Date.now() };
      }
      this.animarMaestrias();
    },

    /* Un solo bucle para el emblema grande y los seis del camino, vivo solo
     * mientras se ve el panel. */
    animarMaestrias: function () {
      var self = this, raf = window.requestAnimationFrame;
      var S = window.PM.Sprites;
      if (!raf || this.maesAnim || !S || !S.drawEmblem) return;
      this.maesAnim = true;
      var t0 = Date.now();
      function pinta(L, ahora) {
        var cv = L.cv, c = cv.getContext && cv.getContext('2d');
        if (!c) return;
        if (L.off && L.hecho) return;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, cv.width, cv.height);
        if (L.off) { if (!L.hecho) { S.drawEmblemOff(c, L.rango, cv.width, cv.height); L.hecho = true; } return; }
        var k = cv.width / 200;
        c.setTransform(k, 0, 0, k, 0, 0);
        S.drawEmblem(c, L.rango, (ahora - t0) / 1000, (ahora - L.a0) / 1000);
        c.setTransform(1, 0, 0, 1, 0, 0);
      }
      raf(function paso() {
        var p = self.els.badges;
        if (!p || p.style.display === 'none') { self.maesAnim = false; return; }
        var ahora = Date.now();
        if (self.badgeHeroL) pinta(self.badgeHeroL, ahora);
        (self.badgeLienzos || []).forEach(function (L) { pinta(L, ahora); });
        raf(paso);
      });
    },

    /* ======================================================
     * PERFIL: avatar, nombre, nivel, logros y cuenta
     * ====================================================== */
    /* ------------------------------------------------------
     * Perfil de un amigo (solo mirar)
     * La tabla `perfiles` es de lectura pública, así que con el nombre basta
     * para enseñar su avatar, su nivel, sus récords y sus logros. Los logros
     * no se guardan como "conseguido sí/no" sino como contadores, y son esos
     * los que viajan: aquí se vuelven a deducir con las mismas reglas que los
     * propios, así que la lista sale igualita a la de PERFIL.
     * ------------------------------------------------------ */
    buildMate: function () {
      var self = this;
      var o = this.els.mate;
      if (!o) return;
      o.innerHTML = '';

      this.mateTitle = document.createElement('div');
      this.mateTitle.className = 'panel-title';
      this.mateTitle.textContent = 'PERFIL';
      o.appendChild(this.mateTitle);

      this.mateMsg = document.createElement('div');
      this.mateMsg.className = 'lobby-status';
      o.appendChild(this.mateMsg);

      this.mateBody = document.createElement('div');
      this.mateBody.className = 'tab-pane';
      o.appendChild(this.mateBody);

      var cab = document.createElement('div');
      cab.className = 'perfil-cab';
      this.mateAvatar = document.createElement('canvas');
      this.mateAvatar.width = 72;
      this.mateAvatar.height = 72;
      this.mateAvatar.className = 'perfil-avatar';
      cab.appendChild(this.mateAvatar);
      var datos = document.createElement('div');
      datos.className = 'perfil-datos';
      this.mateName = document.createElement('div');
      this.mateName.className = 'perfil-nombre';
      datos.appendChild(this.mateName);
      this.mateLevel = document.createElement('div');
      this.mateLevel.className = 'level-label';
      datos.appendChild(this.mateLevel);
      var mbar = document.createElement('div');
      mbar.className = 'level-bar';
      this.mateFill = document.createElement('div');
      this.mateFill.className = 'level-fill';
      mbar.appendChild(this.mateFill);
      datos.appendChild(mbar);
      this.mateResumen = document.createElement('div');
      this.mateResumen.className = 'note';
      datos.appendChild(this.mateResumen);
      cab.appendChild(datos);
      this.mateBody.appendChild(cab);

      this.mateBody.appendChild(this.sectionTitle('CIFRAS'));
      /* El mismo bloque que en el perfil propio: aquí se le pasan además las
       * cifras de uno mismo, y el polígono sale con los dos. */
      this.mateCifras = this.buildCifras(this.mateBody);
      this.mateStats = document.createElement('div');
      this.mateStats.className = 'resumen';
      this.mateBody.appendChild(this.mateStats);

      this.mateBody.appendChild(this.sectionTitle('LOGROS'));
      this.mateAchSub = document.createElement('div');
      this.mateAchSub.className = 'note';
      this.mateBody.appendChild(this.mateAchSub);
      this.mateAchList = document.createElement('div');
      this.mateAchList.className = 'badge-list';
      this.mateBody.appendChild(this.mateAchList);

      var back = this.makeButton('VOLVER', function () { self.showFriends(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);
    },

    showFriendProfile: function (name) {
      var self = this;
      var Ac = window.PM.Account;
      this.mateWho = String(name || '');
      this.mateTitle.textContent = this.mateWho;
      this.mateBody.style.display = 'none';
      this.mateMsg.classList.remove('error');
      this.mateMsg.textContent = 'CARGANDO EL PERFIL DE ' + this.mateWho + '...';
      this.showPanel('mate');
      if (!Ac) return;
      Ac.fetchProfile(name, function (err, fila) {
        if (self.mateWho !== String(name || '')) return;   // ya se pidió otro
        if (err) {
          self.mateMsg.classList.add('error');
          self.mateMsg.textContent = err;
          return;
        }
        if (!fila) {
          self.mateMsg.classList.add('error');
          self.mateMsg.textContent = self.mateWho + ' TODAVÍA NO TIENE CUENTA';
          return;
        }
        self.mateMsg.textContent = '';
        self.mateBody.style.display = 'flex';
        self.renderMate(fila);
      });
    },

    renderMate: function (fila) {
      var L = window.PM.Level, A = window.PM.Achievements, R = window.PM.Ranking;
      var st = L ? L.stateFor(fila.xp) : { level: 1, inLevel: 0, needed: 0, pct: 0 };

      var c = this.mateAvatar.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, 72, 72);
      c.imageSmoothingEnabled = false;
      var av = fila.avatar;
      if (CFG.AVATAR_IDS.indexOf(av) === -1) av = 'pac';
      window.PM.Sprites.drawAvatar(c, 36, 36, 30, av, '#ffff00');

      this.mateName.textContent = fila.usuario || '';
      this.mateLevel.textContent = 'NIVEL ' + st.level + ' · ' + st.inLevel +
        ' / ' + st.needed;
      this.mateFill.style.width = Math.round(st.pct * 100) + '%';
      this.mateResumen.textContent = 'EXPERIENCIA TOTAL ' + (fila.xp || 0);

      /* récords: uno por formato. Trío y escuadra solo salen si ha jugado
       * alguna, que si no son dos ceros que no dicen nada. */
      var stats = [
        ['RÉCORD EN SOLO', String(fila.record1 || 0)],
        ['RÉCORD EN DÚO', String(fila.record2 || 0)]
      ];
      if (fila.record3 > 0) stats.push(['RÉCORD EN TRÍO', String(fila.record3)]);
      if (fila.record4 > 0) stats.push(['RÉCORD EN ESCUADRA', String(fila.record4)]);
      stats.push(['NIVEL 1 MÁS RÁPIDO',
        (fila.tiempo1 > 0 && R) ? R.fmtTime(fila.tiempo1) : '—']);
      var cont = fila.logros || {};
      stats.push(['FANTASMAS COMIDOS', String(cont.fantasmas || 0)]);
      stats.push(['PARTIDAS JUGADAS', String(cont.partidas || 0)]);
      stats.push(['NIVEL MÁS LEJOS', String(cont.nivelMax || 0)]);
      /* todo lo suyo, y de paso lo tuyo debajo para compararse */
      var S = window.PM.Stats;
      if (S && this.mateCifras) {
        this.pintarCifras(this.mateCifras, S.deFila(fila), S.mios(),
                          [this.mateWho, 'TÚ']);
      }
      this.mateStats.innerHTML = '';
      var self2 = this;
      stats.forEach(function (p) {
        var row = document.createElement('div');
        row.className = 'mate-stat';
        var k = document.createElement('span');
        k.textContent = p[0];
        var v = document.createElement('b');
        v.textContent = p[1];
        row.appendChild(k);
        row.appendChild(v);
        self2.mateStats.appendChild(row);
      });

      /* logros: se deducen de sus contadores, igual que los propios */
      this.mateAchList.innerHTML = '';
      if (!A) return;
      var hechos = 0;
      CFG.ACHIEVEMENTS.forEach(function (a) {
        if (A.progress(a, cont).hecho) hechos++;
      });
      this.mateAchSub.textContent = 'CONSEGUIDOS ' + hechos + ' DE ' +
        CFG.ACHIEVEMENTS.length;
      CFG.ACHIEVEMENTS.forEach(function (a) {
        var p = A.progress(a, cont);
        self2.mateAchList.appendChild(self2.achRow(a, p));
      });
    },

    /* ------------------------------------------------------
     * CIFRAS — todo lo que se sabe de un jugador (js/stats.js)
     *
     * El mismo bloque sirve para el perfil propio y para el de cualquier
     * otro: se monta una vez con `buildCifras` y se rellena con `pintarCifras`
     * pasándole unos datos u otros. En el perfil ajeno se le pasan además los
     * tuyos, y entonces el polígono lleva los dos encima, que es lo que
     * convierte una vitrina en una comparación.
     * ------------------------------------------------------ */
    buildCifras: function (host) {
      var b = {};

      /* --- lo grande: cuatro cifras de un vistazo --- */
      b.heroe = document.createElement('div');
      b.heroe.className = 'cifras-heroe';
      host.appendChild(b.heroe);

      /* --- el polígono --- */
      var caja = document.createElement('div');
      caja.className = 'radar-box';
      b.canvas = document.createElement('canvas');
      b.canvas.className = 'radar';
      caja.appendChild(b.canvas);
      b.leyenda = document.createElement('div');
      b.leyenda.className = 'radar-leyenda';
      caja.appendChild(b.leyenda);
      host.appendChild(caja);

      /* --- quién es quién, cuando hay dos --- */
      b.quien = document.createElement('div');
      b.quien.className = 'radar-quien';
      host.appendChild(b.quien);

      /* --- las fichas --- */
      b.grupos = document.createElement('div');
      b.grupos.className = 'cifras';
      host.appendChild(b.grupos);

      /* --- por mundo --- */
      b.tituloMundos = this.sectionTitle('POR MODO');
      host.appendChild(b.tituloMundos);
      b.mundos = document.createElement('div');
      b.mundos.className = 'cifras-tabla';
      host.appendChild(b.mundos);

      /* --- por formato --- */
      b.tituloFormatos = this.sectionTitle('RÉCORD POR FORMATO');
      host.appendChild(b.tituloFormatos);
      b.formatos = document.createElement('div');
      b.formatos.className = 'cifras-tabla';
      host.appendChild(b.formatos);

      b.pie = document.createElement('div');
      b.pie.className = 'note';
      host.appendChild(b.pie);
      return b;
    },

    /* `d` son los datos de quien se mira; `otros` (opcional) los de quien
     * mira, para poner los dos polígonos. */
    pintarCifras: function (b, d, otros, nombres) {
      var S = window.PM.Stats;
      if (!b || !S || !d) return;
      var ejes = S.radar(d);
      var series = [{ color: '#ffff00', valores: ejes.map(function (e) { return e.valor; }) }];
      if (otros) {
        /* el otro va debajo y en azul: el amarillo es siempre de quien se
         * está mirando */
        series.unshift({ color: '#7ec8ff',
          valores: S.radar(otros).map(function (e) { return e.valor; }) });
      }

      /* el lienzo se dibuja a la resolución de la pantalla, que si no el
       * polígono sale con los bordes deshilachados */
      var w = 300, h = 250;
      var dpr = (window.devicePixelRatio || 1);
      b.canvas.width = Math.round(w * dpr);
      b.canvas.height = Math.round(h * dpr);
      b.canvas.style.width = w + 'px';
      b.canvas.style.height = h + 'px';
      var ctx = b.canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S.dibujarRadar(ctx, w, h, ejes, series);

      b.leyenda.innerHTML = '';
      for (var i = 0; i < ejes.length; i++) {
        var fila = document.createElement('div');
        fila.className = 'radar-eje';
        var k = document.createElement('span');
        k.textContent = ejes[i].name;
        var v = document.createElement('small');
        v.textContent = ejes[i].texto;
        fila.appendChild(k);
        fila.appendChild(v);
        b.leyenda.appendChild(fila);
      }

      b.quien.innerHTML = '';
      b.quien.style.display = otros ? 'flex' : 'none';
      if (otros) {
        var quienes = [['#ffff00', (nombres && nombres[0]) || 'ÉL'],
                       ['#7ec8ff', (nombres && nombres[1]) || 'TÚ']];
        for (var q = 0; q < quienes.length; q++) {
          var et = document.createElement('span');
          et.className = 'radar-tag';
          et.style.color = quienes[q][0];
          et.style.borderColor = quienes[q][0];
          et.textContent = quienes[q][1];
          b.quien.appendChild(et);
        }
      }

      /* fichas */
      b.grupos.innerHTML = '';
      var secciones = S.secciones(d);
      /* las cuatro primeras de EN TOTAL, en grande */
      if (b.heroe) {
        b.heroe.innerHTML = '';
        var colores = ['#ffff00', '#00ffff', '#ffb8ff', '#00ff00'];
        var prim = (secciones[0] && secciones[0].filas) || [];
        for (var hx = 0; hx < prim.length && hx < 4; hx++) {
          var ht = document.createElement('div');
          ht.className = 'cifras-heroe-f';
          ht.style.setProperty('--fc', colores[hx]);
          var hv = document.createElement('b');
          hv.textContent = prim[hx][1];
          var hk = document.createElement('span');
          hk.textContent = prim[hx][0];
          ht.appendChild(hv);
          ht.appendChild(hk);
          b.heroe.appendChild(ht);
        }
      }
      for (var s = 0; s < secciones.length; s++) {
        var g = document.createElement('div');
        g.className = 'cifra-grupo';
        g.style.setProperty('--gc', ['#ffff00', '#00ffff', '#ffb852', '#ff66cc', '#00ff00', '#7ec8ff'][s % 6]);
        var t = document.createElement('div');
        t.className = 'cifra-tit';
        t.textContent = secciones[s].titulo;
        g.appendChild(t);
        for (var f = 0; f < secciones[s].filas.length; f++) {
          var fi = secciones[s].filas[f];
          var row = document.createElement('div');
          row.className = 'mate-stat';
          var kk = document.createElement('span');
          kk.textContent = fi[0];
          if (fi[2]) {
            var nota = document.createElement('small');
            nota.textContent = fi[2];
            kk.appendChild(nota);
          }
          var vv = document.createElement('b');
          vv.textContent = fi[1];
          row.appendChild(kk);
          row.appendChild(vv);
          g.appendChild(row);
        }
        b.grupos.appendChild(g);
      }

      /* por mundo */
      b.mundos.innerHTML = '';
      var mm = S.porMundo(d);
      b.mundos.appendChild(this.cifraCabecera(['MODO', 'PARTIDAS', 'MEJOR', 'TIEMPO']));
      for (var m = 0; m < mm.length; m++) {
        b.mundos.appendChild(this.cifraFila(
          [mm[m].name, mm[m].partidas, mm[m].mejor, mm[m].tiempo], mm[m].color));
      }

      /* por formato */
      b.formatos.innerHTML = '';
      b.formatos.appendChild(this.cifraCabecera(['FORMATO', 'RÉCORD']));
      var ff = S.porFormato(d);
      for (var x = 0; x < ff.length; x++) {
        b.formatos.appendChild(this.cifraFila([ff[x].name, ff[x].valor]));
      }

      /* y lo que hay que decir de dónde salen algunas cifras */
      /* El tiempo que no se midió (porque no se guardaba) va estimado por los
       * puntos, y eso se dice: sale igual en el perfil propio que en el de
       * otro, que también puede llevar cifras estimadas. */
      var est = d.estimado || 0;
      var avisos = [];
      if (est) {
        avisos.push('ANTES DEL 16/09/2026 NO SE GUARDABAN NI EL TIEMPO NI LOS NIVELES: ' +
          'DE ESAS HORAS, ' + S.reloj(est) + ' SON UNA ESTIMACIÓN POR LOS PUNTOS, ' +
          'Y LOS NIVELES, LAS PASTILLAS Y LAS CADENAS DE ENTONCES SON MÍNIMOS.');
      }
      /* El reparto de partidas por modo es más nuevo que el juego, y lo que
       * se jugó antes se apuntó todo a CLÁSICO. Donde no se sabe sale un
       * guion, pero hay que decir por qué. */
      var dudoso = false;
      for (var md = 0; md < d.mundos.length; md++) {
        if (d.mundos[md].partidas < 0) dudoso = true;
      }
      if (dudoso) {
        avisos.push('LAS PARTIDAS DE CADA MODO SE CUENTAN DESDE QUE CADA MODO LLEVA SU ' +
          'CUENTA: LAS DE ANTES SE APUNTARON TODAS A CLÁSICO, Y DONDE NO SE SABE VA UN GUION. ' +
          'LAS MEJORES MARCAS SÍ SON LAS DE CADA MODO.');
      }
      /* Si hay reparto declarado, se dice de quién es la palabra: es el dato
       * que da quien jugó, no una medición. */
      if (d.reparto) {
        avisos.push('DE LAS PARTIDAS ANTERIORES A ESA CUENTA, Y DE SU TIEMPO, EL ' + d.reparto.pct +
          ' % SE HA REPARTIDO A DESATADO ' + (d.reparto.estimado
            ? 'ESTIMADO POR SUS MORDISCOS, QUE SOLO EXISTEN EN DESATADO ('
            : 'PORQUE ASÍ LO DECLARÓ QUIEN LAS JUGÓ (') +
          S.miles(d.reparto.partidas) + ' PARTIDAS). LO MARCADO CON ~ ES APROXIMADO.');
      }
      b.pie.textContent = avisos.join(' ');
    },

    cifraCabecera: function (celdas) {
      var row = document.createElement('div');
      row.className = 'cifra-fila cabecera';
      for (var i = 0; i < celdas.length; i++) {
        var c = document.createElement('span');
        c.textContent = celdas[i];
        row.appendChild(c);
      }
      return row;
    },

    /* , si viene, es el del modo y va en la primera celda */
    cifraFila: function (celdas, color) {
      var row = document.createElement('div');
      row.className = 'cifra-fila';
      for (var i = 0; i < celdas.length; i++) {
        var c = document.createElement('span');
        c.textContent = celdas[i];
        if (i === 0 && color) c.style.color = color;
        row.appendChild(c);
      }
      return row;
    },

    buildProfile: function () {
      var self = this;
      var o = this.els.profile;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'PERFIL';
      o.appendChild(h);

      var bar = document.createElement('div');
      bar.className = 'tab-row';
      this.profTabBtns = {};
      [['perfil', 'PERFIL'], ['cifras', 'CIFRAS'], ['logros', 'LOGROS']].forEach(function (t) {
        var b = self.makeButton(t[1], function () { self.showProfileTab(t[0]); });
        b.classList.add('tab');
        self.profTabBtns[t[0]] = b;
        bar.appendChild(b);
      });
      o.appendChild(bar);

      /* ---- pestaña CIFRAS ---- */
      /* Va delante en el DOM de la de LOGROS y detrás de la de PERFIL, que
       * es el orden en que se recorren con las flechas. */
      this.cifrasPane = document.createElement('div');
      this.cifrasPane.className = 'tab-pane';

      /* ---- pestaña PERFIL ---- */
      this.profPane = document.createElement('div');
      this.profPane.className = 'tab-pane';

      /* LA CARTA DEL JUGADOR (17 sep 2026): a la izquierda tu personaje en
       * grande, con todo lo puesto y moviéndose, tu nombre con el título de
       * recreativa y tu nivel; a la derecha tus cifras en fichas y la cuenta. */
      var rejilla = document.createElement('div');
      rejilla.className = 'perfil-rejilla';
      this.profPane.appendChild(rejilla);

      var carta = document.createElement('div');
      carta.className = 'perfil-carta';
      rejilla.appendChild(carta);

      var lookBtn = document.createElement('button');
      lookBtn.type = 'button';
      lookBtn.className = 'perfil-carta-look';
      lookBtn.setAttribute('aria-label', 'Tu personaje: abrir el vestuario');
      this.profLookCv = document.createElement('canvas');
      this.profLookCv.width = 240; this.profLookCv.height = 240;
      lookBtn.appendChild(this.profLookCv);
      lookBtn.addEventListener('click', function () { self.resumeAudio(); self.showVestuario('skin', 'yo'); });
      carta.appendChild(lookBtn);

      this.profName = document.createElement('div');
      this.profName.className = 'perfil-nombre';
      carta.appendChild(this.profName);

      /* el avatar de siempre sigue existiendo (lo usan otros sitios), sin verse */
      this.profAvatar = document.createElement('canvas');
      this.profAvatar.width = 72;
      this.profAvatar.height = 72;
      this.profAvatar.className = 'perfil-avatar';
      this.profAvatar.style.display = 'none';
      carta.appendChild(this.profAvatar);

      var nivel = document.createElement('div');
      nivel.className = 'perfil-nivel';
      this.profLevelNum = document.createElement('b');
      this.profLevelNum.className = 'perfil-nivel-n';
      nivel.appendChild(this.profLevelNum);
      var nivDatos = document.createElement('div');
      nivDatos.className = 'perfil-nivel-datos';
      this.profLevel = document.createElement('div');
      this.profLevel.className = 'level-label';
      nivDatos.appendChild(this.profLevel);
      var barra = document.createElement('div');
      barra.className = 'level-bar';
      this.profFill = document.createElement('div');
      this.profFill.className = 'level-fill';
      barra.appendChild(this.profFill);
      nivDatos.appendChild(barra);
      nivel.appendChild(nivDatos);
      carta.appendChild(nivel);

      this.profLook = document.createElement('div');
      this.profLook.className = 'note perfil-look';
      carta.appendChild(this.profLook);

      var acciones = document.createElement('div');
      acciones.className = 'preset-row perfil-acciones';
      this.profVestBtn = this.makeButton('ABRIR EL VESTUARIO', function () {
        self.resumeAudio();
        self.showVestuario('skin', 'yo');
      });
      this.profVestBtn.classList.add('btn-preset');
      acciones.appendChild(this.profVestBtn);
      carta.appendChild(acciones);

      /* nombre de invitado: se puede sortear */
      this.profGuestRow = document.createElement('div');
      this.profGuestRow.className = 'preset-row';
      var azar = this.makeButton('NOMBRE AL AZAR', function () {
        var st = window.PM.settings;
        st.nick1 = randomNick();
        saveSettings();
        self.refreshNicks();
        self.refreshProfile();
      });
      azar.classList.add('btn-preset');
      this.profGuestRow.appendChild(azar);
      carta.appendChild(this.profGuestRow);

      /* la columna de la derecha */
      var lado = document.createElement('div');
      lado.className = 'perfil-lado';
      rejilla.appendChild(lado);

      var tits = document.createElement('div');
      tits.className = 'section-title';
      tits.textContent = 'TUS CIFRAS';
      lado.appendChild(tits);
      var fichas = document.createElement('div');
      fichas.className = 'perfil-fichas';
      lado.appendChild(fichas);
      this.profFichas = {};
      [['logros', 'LOGROS', '#ffff00'], ['maestria', 'MAESTRÍA', '#00ffff'], ['record', 'RÉCORD', '#ffb8ff'],
       ['monedas', 'MONEDAS', '#ffd23f'], ['partidas', 'PARTIDAS', '#00ff00'], ['tiempo', 'JUGADO', '#ffb852']].forEach(function (f) {
        var d = document.createElement('div');
        d.className = 'perfil-ficha';
        d.style.setProperty('--fc', f[2]);
        var v = document.createElement('b');
        d.appendChild(v);
        var k = document.createElement('span');
        k.textContent = f[1];
        d.appendChild(k);
        fichas.appendChild(d);
        self.profFichas[f[0]] = v;
      });
      /* el resumen de antes, que otras partes leen, sin verse */
      this.profResumen = document.createElement('div');
      this.profResumen.className = 'note';
      this.profResumen.style.display = 'none';
      lado.appendChild(this.profResumen);
      var masCifras = this.makeButton('VER TODAS LAS CIFRAS ▸', function () { self.showProfileTab('cifras'); });
      masCifras.classList.add('btn-preset', 'perfil-mas');
      lado.appendChild(masCifras);

      /* cuenta */
      var gCuenta = document.createElement('div');
      gCuenta.className = 'perfil-cuenta';
      var tc = document.createElement('div');
      tc.className = 'section-title';
      tc.textContent = 'TU CUENTA';
      gCuenta.appendChild(tc);
      lado.appendChild(gCuenta);
      this.profAccountMsg = document.createElement('div');
      this.profAccountMsg.className = 'lobby-status';
      gCuenta.appendChild(this.profAccountMsg);
      this.profAccountRow = document.createElement('div');
      this.profAccountRow.className = 'preset-row';
      gCuenta.appendChild(this.profAccountRow);
      this.profAccountNote = document.createElement('div');
      this.profAccountNote.className = 'note';
      gCuenta.appendChild(this.profAccountNote);

      o.appendChild(this.profPane);

      /* lo de CIFRAS se monta una vez y se rellena al abrir la pestaña */
      this.cifrasBloque = this.buildCifras(this.cifrasPane);
      o.appendChild(this.cifrasPane);

      /* ---- pestaña LOGROS ---- */
      this.achPane = document.createElement('div');
      this.achPane.className = 'tab-pane';
      /* cabecera: el total en grande, su barra y los filtros */
      var achCab = document.createElement('div');
      achCab.className = 'logros-cab';
      this.achPane.appendChild(achCab);
      this.achTotal = document.createElement('div');
      this.achTotal.className = 'logros-total';
      achCab.appendChild(this.achTotal);
      var achMedio = document.createElement('div');
      achMedio.className = 'logros-medio';
      achCab.appendChild(achMedio);
      var achBar = document.createElement('div');
      achBar.className = 'level-bar logros-barra';
      this.achFill = document.createElement('div');
      this.achFill.className = 'level-fill';
      achBar.appendChild(this.achFill);
      achMedio.appendChild(achBar);
      this.achSub = document.createElement('div');
      this.achSub.className = 'note';
      achMedio.appendChild(this.achSub);
      var achFiltros = document.createElement('div');
      achFiltros.className = 'logros-filtros';
      achCab.appendChild(achFiltros);
      this.achVer = 'todos';
      this.achModo = 'todos';
      this.achVerDesp = this.desplegable('VER', [
        { id: 'todos', name: 'TODOS' }, { id: 'hechos', name: 'CONSEGUIDOS' }, { id: 'faltan', name: 'POR CONSEGUIR' }
      ], function (id) { self.achVer = id; self.refreshAchievements(); });
      achFiltros.appendChild(this.achVerDesp.el);
      var modosAch = [{ id: 'todos', name: 'TODOS' }, { id: '', name: 'CUALQUIER MODO' }];
      for (var am in CFG.ACH_MODOS) {
        if (CFG.ACH_MODOS.hasOwnProperty(am)) modosAch.push({ id: am, name: CFG.ACH_MODOS[am].name });
      }
      this.achModoDesp = this.desplegable('MODO', modosAch, function (id) { self.achModo = id; self.refreshAchievements(); });
      achFiltros.appendChild(this.achModoDesp.el);
      this.achList = document.createElement('div');
      this.achList.className = 'badge-list';
      this.achPane.appendChild(this.achList);
      o.appendChild(this.achPane);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);

      this.profTab = 'perfil';
    },

    /* tu personaje de la carta, moviéndose mientras el perfil está a la vista */
    animarPerfil: function () {
      var self = this, raf = window.requestAnimationFrame;
      if (!raf || this.perfilAnim || !this.profLookCv) return;
      this.perfilAnim = true;
      var t0 = Date.now();
      raf(function paso() {
        var p = self.els.profile;
        if (!p || p.style.display === 'none' || self.profTab !== 'perfil') { self.perfilAnim = false; return; }
        self.pintarNickLook((Date.now() - t0) / 1000, self.profLookCv);
        raf(paso);
      });
    },

    showProfileTab: function (tab) {
      this.profTab = (tab === 'logros' || tab === 'cifras') ? tab : 'perfil';
      this.refreshProfile();
    },

    showProfile: function () {
      this.refreshProfile();
      this.showPanel('profile');
    },

    refreshProfile: function () {
      var s = window.PM.settings;
      var A = window.PM.Achievements;
      var L = window.PM.Level;
      var Ac = window.PM.Account;
      var logged = !!(Ac && Ac.logged());
      var tab = this.profTab || 'perfil';

      for (var k in this.profTabBtns) {
        if (this.profTabBtns.hasOwnProperty(k)) {
          this.profTabBtns[k].classList.toggle('active', k === tab);
        }
      }
      this.profPane.style.display = (tab === 'perfil') ? 'flex' : 'none';
      this.cifrasPane.style.display = (tab === 'cifras') ? 'flex' : 'none';
      this.achPane.style.display = (tab === 'logros') ? 'flex' : 'none';
      if (tab === 'cifras' && window.PM.Stats) {
        this.pintarCifras(this.cifrasBloque, window.PM.Stats.mios());
      }

      /* cabecera */
      var ctx = this.profAvatar.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, 72, 72);
      ctx.imageSmoothingEnabled = false;
      window.PM.Sprites.drawAvatar(ctx, 36, 36, 30, s.avatar, s.pacColor);

      this.profName.textContent = sanitizeNick(s.nick1) || 'SIN NOMBRE';
      this.profName.style.color = logged ? '#ffff00' : '#ddd';

      var st = L ? L.state() : { level: 1, inLevel: 0, needed: 1, pct: 0 };
      this.profLevel.textContent = 'NIVEL ' + st.level + ' · ' +
        st.inLevel + ' / ' + st.needed;
      if (this.profLevelNum) this.profLevelNum.textContent = String(st.level);
      this.profFill.style.width = Math.round(st.pct * 100) + '%';

      var B = window.PM.Badges;
      var top = B ? B.top('solo') : null;
      this.profResumen.textContent =
        'LOGROS ' + (A ? A.count() : 0) + '/' + (A ? A.total() : 0) +
        ' · MAESTRÍA ' + (top ? top.name : 'NINGUNA') +
        ' · RÉCORD ' + ((window.PM.Game && window.PM.Game.highScore1) || 0);

      if (this.profFichas) {
        var cs = A && A.stats ? A.stats() : {};
        var Tn = window.PM.Tienda;
        var seg = Math.round((cs && cs.tiempo) || 0);
        this.profFichas.logros.textContent = (A ? A.count() : 0) + '/' + (A ? A.total() : 0);
        this.profFichas.maestria.textContent = top ? top.name : '—';
        this.profFichas.record.textContent = fmtMonedas((window.PM.Game && window.PM.Game.highScore1) || 0);
        this.profFichas.monedas.textContent = fmtMonedas(Tn ? Math.max(0, Tn.saldo()) : 0);
        this.profFichas.partidas.textContent = fmtMonedas((cs && cs.partidas) || 0);
        this.profFichas.tiempo.textContent = seg >= 3600 ? (Math.floor(seg / 3600) + 'H ' + Math.floor(seg % 3600 / 60) + 'M')
          : (Math.floor(seg / 60) + 'M');
      }
      this.animarPerfil();

      /* de invitado el nombre se puede sortear; con cuenta, es el usuario */
      this.profGuestRow.style.display = logged ? 'none' : 'flex';

      this.refreshPerfilLook();     // tu personaje en pequeño (se viste en el VESTUARIO)
      this.refreshAccountBox();
      this.refreshAchievements();
    },

    refreshAccountBox: function () {
      var self = this;
      var Ac = window.PM.Account;
      var row = this.profAccountRow;
      row.innerHTML = '';
      if (!Ac || !Ac.configured()) {
        this.profAccountMsg.classList.add('error');
        this.profAccountMsg.textContent = 'LAS CUENTAS NECESITAN CONEXIÓN';
        this.profAccountNote.textContent = '';
        return;
      }
      this.profAccountMsg.classList.remove('error');
      if (Ac.logged()) {
        this.profAccountMsg.textContent = 'SESIÓN DE ' + Ac.name();
        var guardar = this.makeButton('GUARDAR AHORA', function () {
          self.profAccountMsg.classList.remove('error');
          self.profAccountMsg.textContent = 'GUARDANDO...';
          Ac.push(false, function (err) {
            self.profAccountMsg.classList.toggle('error', !!err);
            self.profAccountMsg.textContent = err || 'GUARDADO';
          });
        });
        guardar.classList.add('btn-preset');
        row.appendChild(guardar);
        /* La llave de repuesto. Va en el perfil y no escondida en opciones
         * porque quien se registró ANTES de que se pidiera el correo no tiene
         * ninguno, y hay que empujarle a ponerlo: sin correo, olvidar la
         * contraseña sigue costando la cuenta entera. */
        var correoBtn = this.makeButton('CORREO DE RECUPERACIÓN', function () {
          Ac.miCorreo(function (err, c) {
            self.showCorreoPrompt(err ? '' : c);
          });
        });
        correoBtn.classList.add('btn-preset');
        row.appendChild(correoBtn);
        var salir = this.makeButton('CERRAR SESIÓN', function () {
          Ac.signOut(function () { self.refreshProfile(); });
        });
        salir.classList.add('btn-preset');
        row.appendChild(salir);
        this.profAccountNote.textContent =
          'TU NIVEL, LOGROS, MAESTRÍAS, RÉCORDS Y AMIGOS SE GUARDAN EN LA CUENTA';
        /* Y se pregunta si lo tiene. La respuesta tarda lo que tarde la red,
         * así que el renglón se escribe cuando llega y solo si el panel sigue
         * puesto: entretanto se lee lo de siempre, que no es mentira. */
        Ac.miCorreo(function (err, c) {
          if (err || !self.profAccountNote) return;
          if (!Ac.logged()) return;
          self.profAccountNote.textContent = c
            ? ('RECUPERACIÓN POR CORREO EN ' + c +
               ' · TU PROGRESO SE GUARDA EN LA CUENTA')
            : ('TU CUENTA NO TIENE CORREO: SI OLVIDAS LA CONTRASEÑA, LA PIERDES. ' +
               'PONLO AHORA');
        });
      } else {
        this.profAccountMsg.textContent = 'JUEGAS COMO INVITADO';
        var entrar = this.makeButton('ENTRAR', function () {
          self.showAccountPrompt('entrar');
        });
        entrar.classList.add('btn-preset');
        row.appendChild(entrar);
        var crear = this.makeButton('CREAR CUENTA', function () {
          self.showAccountPrompt('crear');
        });
        crear.classList.add('btn-preset');
        row.appendChild(crear);
        this.profAccountNote.textContent =
          'DE INVITADO JUEGAS IGUAL, PERO TODO SE QUEDA EN ESTE NAVEGADOR ' +
          'Y NO PUEDES TENER AMIGOS';
      }
    },

    /* Una fila de logro con su estrella, su estado y su barra. La usan la
     * pestaña LOGROS y el perfil de un amigo, que se pinta igual. */
    /* El logro completo (con su contador) a partir de lo que traiga un aviso */
    logroDe: function (a) {
      if (!a) return null;
      if (a.stat) return a;
      var lista = CFG.ACHIEVEMENTS || [];
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === a.id || lista[i].name === a.name) return lista[i];
      }
      return a;
    },

    achRow: function (a, p) {
      var R = window.PM.Ranking;
      var row = document.createElement('div');
      row.className = 'badge-row logro' + (p.hecho ? ' got' : '');
      row.style.setProperty('--ac', p.hecho ? (a.color || '#ffff00') : '#2d2d6e');

      var cv = document.createElement('canvas');
      cv.width = 68; cv.height = 68;
      cv.className = 'badge-medal';
      var c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      window.PM.Sprites.drawAchIcon(c, 34, 34, 32, a, p.hecho);
      row.appendChild(cv);

      var txt = document.createElement('div');
      txt.className = 'badge-text';
      var nm = document.createElement('div');
      nm.className = 'badge-name';
      nm.style.color = p.hecho ? a.color : '#666';
      nm.textContent = a.name;
      txt.appendChild(nm);
      var stt = document.createElement('div');
      stt.className = 'badge-state';
      /* El modo va DELANTE de la descripción, y en su color: la lista es una
       * sola para todos los modos, así que si no se dice dónde hay que
       * conseguir cada cosa, media lista no se entiende. */
      var mi = document.createElement('b');
      mi.className = 'ach-modo';
      mi.textContent = CFG.achModoName(a);
      if (a.modo && CFG.ACH_MODOS[a.modo]) {
        mi.style.color = p.hecho ? CFG.ACH_MODOS[a.modo].color : '#6a6a6a';
      }
      stt.appendChild(mi);
      var resto = document.createElement('span');
      if (p.hecho) {
        resto.textContent = ' · CONSEGUIDO · ' + a.desc;
      } else if (a.fmt === 'tiempo') {
        resto.textContent = ' · ' + a.desc +
          (p.valor > 0 && R ? (' · MEJOR: ' + R.fmtTime(p.valor)) : '');
      } else {
        resto.textContent = ' · ' + a.desc + ' · ' + Math.min(p.valor, a.goal) +
          '/' + a.goal;
      }
      stt.appendChild(resto);
      txt.appendChild(stt);
      var barra = document.createElement('div');
      barra.className = 'level-bar ach-bar';
      var fill = document.createElement('div');
      fill.className = 'level-fill';
      fill.style.width = Math.round(p.pct * 100) + '%';
      if (p.hecho) fill.style.background = a.color;
      barra.appendChild(fill);
      txt.appendChild(barra);
      row.appendChild(txt);
      return row;
    },

    refreshAchievements: function () {
      var A = window.PM.Achievements;
      this.achList.innerHTML = '';
      if (!A) return;
      var stats = A.stats();
      /* Se dice de dónde sale lo que ya está contado: si alguien ve PURISTA
       * en 100/50 el primer día que abre esto, tiene derecho a saber por qué
       * (lo jugado antes de que hubiera logros por modo se apuntó al
       * clásico). Ver Achievements.sembrarModos. */
      var hechos = A.count(), total = A.total();
      if (this.achTotal) {
        this.achTotal.innerHTML = '';
        var nb = document.createElement('b');
        nb.textContent = hechos;
        var nt = document.createElement('span');
        nt.textContent = '/' + total;
        this.achTotal.appendChild(nb);
        this.achTotal.appendChild(nt);
        this.achFill.style.width = Math.round(hechos / Math.max(1, total) * 100) + '%';
        this.achVerDesp.poner(this.achVer || 'todos');
        this.achModoDesp.poner(this.achModo == null ? 'todos' : this.achModo);
      }
      this.achSub.textContent = Math.round(hechos / Math.max(1, total) * 100) + ' % CONSEGUIDO' +
        '  ·  LO QUE JUGASTE ANTES DE QUE HUBIERA LOGROS POR MODO CUENTA COMO CLÁSICO';
      var ver = this.achVer || 'todos', modo = (this.achModo == null) ? 'todos' : this.achModo;
      CFG.ACHIEVEMENTS.forEach(function (a) {
        var p = A.progress(a, stats);
        var fila = this.achRow(a, p);
        var sale = (ver === 'todos' || (ver === 'hechos') === !!p.hecho) &&
          (modo === 'todos' || (a.modo || '') === modo);
        if (!sale) fila.style.display = 'none';
        this.achList.appendChild(fila);
      }, this);
    },

    /* Diálogo de entrar / crear cuenta */
    /* alVolver: qué hacer al acabar (entrando o dándole a VOLVER). Sin él,
     * se cierra el diálogo; desde el aviso del récord, vuelve al GAME OVER. */
    showAccountPrompt: function (modo, alVolver) {
      var self = this;
      var Ac = window.PM.Account;
      var crear = (modo === 'crear');
      var usuario = '', pass = '', correo = '';

      function enviar() {
        if (!usuario || !pass) {
          self.setPromptStatus('ESCRIBE USUARIO Y CONTRASEÑA', true);
          return;
        }
        self.setPromptStatus(crear ? 'CREANDO...' : 'ENTRANDO...', false);
        function hecho(err) {
          if (err) { self.setPromptStatus(err, true); return; }
          self.hidePrompt();
          self.refreshNicks();
          self.refreshProfile();
          self.refreshFriends();
          if (alVolver) alVolver(true);
        }
        if (crear) Ac.signUp(usuario, pass, correo, hecho);
        else Ac.signIn(usuario, pass, hecho);
      }

      var campos = [
        { placeholder: 'USUARIO', maxLength: CFG.NICK_MAX,
          onInput: function (v) { usuario = v; } },
        { placeholder: 'CONTRASEÑA', password: true, maxLength: 40,
          onInput: function (v) { pass = v; }, onAccept: enviar }
      ];
      /* El correo se pide AL CREAR y solo al crear: no es un dato del perfil,
       * es lo que te devuelve la cuenta el día que olvides la contraseña. Va
       * el último para que la pantalla siga leyéndose "usuario, contraseña". */
      if (crear) {
        campos.push({ placeholder: 'TU CORREO', maxLength: 64, correo: true,
          onInput: function (v) { correo = v; }, onAccept: enviar });
      }

      var botones = [
        { label: crear ? 'CREAR' : 'ENTRAR', primary: true, onClick: enviar }
      ];
      /* La puerta de vuelta va JUNTO A LA DE ENTRAR, que es donde se busca:
       * quien no consigue entrar no se va al perfil a mirar opciones. */
      if (!crear) {
        botones.push({ label: 'HE OLVIDADO LA CONTRASEÑA',
          onClick: function () { self.showOlvidePrompt(usuario); } });
      }
      botones.push({ label: 'VOLVER', keys: ['Escape'], hint: 'ESC',
        onClick: function () {
          self.hidePrompt();
          if (alVolver) alVolver(false);
        } });

      this.showPrompt({
        title: crear ? 'CREAR CUENTA' : 'ENTRAR',
        lines: crear
          ? ['ELIGE UN USUARIO Y UNA CONTRASEÑA',
             'EL USUARIO SERÁ TU NOMBRE EN EL JUEGO',
             'EL CORREO SIRVE PARA UNA COSA: RECUPERAR LA CUENTA SI OLVIDAS LA CONTRASEÑA']
          : ['ENTRA CON TU USUARIO Y CONTRASEÑA'],
        fields: campos,
        status: '',
        buttons: botones
      });
    },

    /* ------------------------------------------------------
     * Recuperar la cuenta por correo
     *
     * Antes de esto, olvidar la contraseña era PERDER LA CUENTA: los cuatro
     * récords, la experiencia, los logros y las doce maestrías, sin vuelta
     * atrás, porque el correo de la cuenta se componía por dentro y ese buzón
     * no existía. Ahora el correo es el de verdad y la recuperación es la de
     * toda la vida: pides el enlace, te llega, y al abrirlo el juego te pide
     * la contraseña nueva (ver Account.desdeRecuperacion).
     * ------------------------------------------------------ */
    showOlvidePrompt: function (usuarioPrevio) {
      var self = this;
      var Ac = window.PM.Account;
      var usuario = usuarioPrevio || '';

      function enviar() {
        self.setPromptStatus('MANDANDO EL CORREO...', false);
        Ac.olvide(usuario, function (err, pista) {
          if (err) { self.setPromptStatus(err, true); return; }
          self.showPrompt({
            title: 'MIRA TU CORREO',
            color: '#00ffff',
            solid: true,
            lines: [
              pista ? ('TE HEMOS MANDADO UN ENLACE A ' + pista) : 'ENLACE ENVIADO',
              'ÁBRELO Y TE DEJARÁ PONER UNA CONTRASEÑA NUEVA',
              'SI NO LO VES EN UN MINUTO, MIRA EN CORREO NO DESEADO'
            ],
            buttons: [
              { label: 'SEGUIR', primary: true, keys: ['Enter', 'Escape'],
                hint: 'ENTER', onClick: function () { self.hidePrompt(); } }
            ]
          });
        });
      }

      this.showPrompt({
        title: 'RECUPERAR CUENTA',
        color: '#00ffff',
        lines: [
          'ESCRIBE TU USUARIO Y TE MANDAMOS UN ENLACE AL CORREO DE LA CUENTA',
          'SI TU CUENTA ES DE LAS DE ANTES Y NO TIENE CORREO, ENTRA CON TU CONTRASEÑA Y PONLO EN PERFIL'
        ],
        fields: [
          { placeholder: 'USUARIO', maxLength: CFG.NICK_MAX, value: usuario,
            onInput: function (v) { usuario = v; }, onAccept: enviar }
        ],
        status: '',
        buttons: [
          { label: 'MANDAR ENLACE', primary: true, onClick: enviar },
          { label: 'VOLVER', keys: ['Escape'], hint: 'ESC',
            onClick: function () { self.showAccountPrompt('entrar'); } }
        ]
      });
    },

    /* Al volver del enlace del correo: la sesión ya está abierta (de un solo
     * uso) y lo único que falta es la contraseña nueva. Sale por encima de
     * todo nada más abrir el juego. */
    showPassNuevaPrompt: function () {
      var self = this;
      var Ac = window.PM.Account;
      var pass = '';

      function enviar() {
        self.setPromptStatus('GUARDANDO...', false);
        Ac.cambiarPass(pass, function (err) {
          if (err) { self.setPromptStatus(err, true); return; }
          self.hidePrompt();
          self.refreshNicks();
          self.refreshProfile();
          self.showPrompt({
            title: 'LISTO',
            color: '#00ffff',
            solid: true,
            lines: ['YA TIENES CONTRASEÑA NUEVA Y LA SESIÓN ABIERTA',
                    'TU PROGRESO SIGUE DONDE ESTABA'],
            buttons: [
              { label: 'A JUGAR', primary: true, keys: ['Enter', 'Escape'],
                hint: 'ENTER', onClick: function () { self.hidePrompt(); } }
            ]
          });
        });
      }

      this.showPrompt({
        title: 'CONTRASEÑA NUEVA',
        color: '#00ffff',
        solid: true,
        lines: ['ESCRIBE LA CONTRASEÑA QUE VAS A USAR A PARTIR DE AHORA'],
        fields: [
          { placeholder: 'CONTRASEÑA NUEVA', password: true, maxLength: 40,
            onInput: function (v) { pass = v; }, onAccept: enviar }
        ],
        status: '',
        buttons: [
          { label: 'GUARDAR', primary: true, onClick: enviar }
        ]
      });
      this.promptTag = 'passnueva';
    },

    /* Poner o cambiar el correo de recuperación, desde PERFIL. Es lo que
     * tienen que hacer las cuentas creadas antes de que se pidiera. */
    showCorreoPrompt: function (actual) {
      var self = this;
      var Ac = window.PM.Account;
      var correo = '';

      function enviar() {
        self.setPromptStatus('GUARDANDO...', false);
        Ac.ponerCorreo(correo, function (err) {
          if (err) { self.setPromptStatus(err, true); return; }
          self.hidePrompt();
          self.refreshProfile();
        });
      }

      this.showPrompt({
        title: 'CORREO DE RECUPERACIÓN',
        color: '#00ffff',
        lines: [
          actual ? ('AHORA MISMO ES ' + actual)
                 : 'TU CUENTA NO TIENE CORREO: SIN ÉL, OLVIDAR LA CONTRASEÑA ES PERDERLA',
          'SIRVE PARA UNA SOLA COSA: MANDARTE EL ENLACE SI OLVIDAS LA CONTRASEÑA',
          'NO SE ENSEÑA A NADIE NI SALE EN NINGÚN SITIO DEL JUEGO'
        ],
        fields: [
          { placeholder: 'TU CORREO', maxLength: 64, correo: true,
            onInput: function (v) { correo = v; }, onAccept: enviar }
        ],
        status: '',
        buttons: [
          { label: 'GUARDAR', primary: true, onClick: enviar },
          { label: 'VOLVER', keys: ['Escape'], hint: 'ESC',
            onClick: function () { self.hidePrompt(); } }
        ]
      });
    },

    /* Copiar al portapapeles con red de seguridad: navigator.clipboard solo
     * existe en contexto seguro, así que si no está se cae al truco de
     * siempre (un textarea invisible y execCommand). Si tampoco, se dice. */
    copiarTexto: function (texto, hecho) {
      var self = this;
      function fallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = texto;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          self.setPromptStatus(ok ? hecho : 'CÓPIALO A MANO', !ok);
        } catch (e) {
          self.setPromptStatus('CÓPIALO A MANO', true);
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto)
          .then(function () { self.setPromptStatus(hecho, false); })
          .catch(fallback);
        return;
      }
      fallback();
    },

    /* La cuenta ha cambiado (entrar, salir, sincronizar) */
    accountHooks: function () {
      var self = this;
      var Ac = window.PM.Account;
      if (!Ac) return;
      Ac.onchange = function () {
        self.refreshNicks();
        self.refreshLevel();
        self.refreshSkins();      // el nivel de la cuenta puede abrir skins
        if (self.els.profile && self.els.profile.style.display !== 'none') {
          self.refreshProfile();
        }
        if (self.els.friends && self.els.friends.style.display !== 'none') {
          self.refreshFriends();
        }
      };
      /* ¿Venimos del enlace del correo? Entonces la sesión ya viene abierta en
       * el ancla de la URL y lo único que falta es la contraseña nueva. Va
       * ANTES que restore() porque esta sesión manda sobre la que hubiera
       * guardada: quien abre el enlace quiere entrar EN ESA cuenta. */
      if (Ac.desdeRecuperacion(function (err) {
        if (err) {
          self.showPrompt({
            title: 'ENLACE CADUCADO',
            color: '#ff8c00',
            lines: ['ESE ENLACE YA SE HA USADO O HA PASADO DEMASIADO TIEMPO',
                    'PIDE OTRO DESDE ENTRAR · HE OLVIDADO LA CONTRASEÑA'],
            buttons: [
              { label: 'SEGUIR', primary: true, keys: ['Enter', 'Escape'],
                hint: 'ENTER', onClick: function () { self.hidePrompt(); } }
            ]
          });
          return;
        }
        self.showPassNuevaPrompt();
      })) return;
      // sesión de la última vez: se recupera sola y sin molestar
      Ac.restore(function () {
        /* con la sesión ya renovada (o sin ella), las repeticiones que aún no
         * están en la nube se suben y se traen las tuyas de otros aparatos */
        var Rp = window.PM.Replay;
        if (Rp && Rp.subirPendientes) {
          Rp.subirPendientes(function () { if (Rp.traerMias) Rp.traerMias(); });
        }
      });
    },

    /* ------------------------------------------------------
     * Amigos (lista guardada en este navegador)
     * ------------------------------------------------------ */
    buildFriends: function () {
      var self = this;
      var o = this.els.friends;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'AMIGOS';
      o.appendChild(h);

      var sub = document.createElement('div');
      sub.className = 'note';
      sub.textContent = 'GUARDA AQUÍ CON QUIÉN SUELES JUGAR';
      o.appendChild(sub);

      /* de invitado no hay lista: los amigos van con la cuenta */
      this.friendsGate = document.createElement('div');
      this.friendsGate.className = 'tab-pane';
      var gnote = document.createElement('div');
      gnote.className = 'note';
      gnote.textContent = 'LOS AMIGOS SE GUARDAN EN TU CUENTA, ASÍ LOS TIENES ' +
        'EN CUALQUIER SITIO. DE INVITADO NO HAY LISTA.';
      this.friendsGate.appendChild(gnote);
      var goProf = this.makeButton('IR A PERFIL', function () {
        self.showProfile();
      });
      goProf.classList.add('btn-primary');
      goProf.style.marginTop = '10px';
      this.friendsGate.appendChild(goProf);
      o.appendChild(this.friendsGate);

      this.friendsBody = document.createElement('div');
      this.friendsBody.className = 'tab-pane';
      o.appendChild(this.friendsBody);

      var row = document.createElement('div');
      row.className = 'preset-row';
      row.style.marginTop = '10px';
      this.friendInput = document.createElement('input');
      this.friendInput.type = 'text';
      this.friendInput.className = 'nick-input';
      this.friendInput.maxLength = CFG.NICK_MAX;
      this.friendInput.placeholder = 'NOMBRE';
      this.friendInput.setAttribute('autocomplete', 'off');
      this.friendInput.addEventListener('keydown', function (ev) {
        ev.stopPropagation();
        if (ev.key === 'Enter') self.addFriend();
      });
      row.appendChild(this.friendInput);
      var add = this.makeButton('AÑADIR', function () { self.addFriend(); });
      add.classList.add('btn-preset');
      row.appendChild(add);
      this.friendsBody.appendChild(row);

      this.friendsMsg = document.createElement('div');
      this.friendsMsg.className = 'lobby-status';
      this.friendsBody.appendChild(this.friendsMsg);

      this.friendsList = document.createElement('div');
      this.friendsList.className = 'friend-list';
      this.friendsBody.appendChild(this.friendsList);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);
    },

    addFriend: function () {
      var self = this;
      var Ac = window.PM.Account;
      if (!Ac || !Ac.logged()) return;
      var nombre = this.friendInput.value;
      this.friendsMsg.classList.remove('error');
      this.friendsMsg.textContent = 'AÑADIENDO...';
      Ac.addFriend(nombre, function (err) {
        self.friendsMsg.classList.toggle('error', !!err);
        self.friendsMsg.textContent = err || '';
        if (!err) {
          self.friendInput.value = '';
          if (window.PM.Friends) window.PM.Friends.add(nombre);   // copia local
        }
        self.refreshFriends();
      });
    },

    /* La lista vive en la cuenta; aquí se guarda una copia para poder
     * enseñarla al instante y seguir viéndola sin conexión. */
    refreshFriends: function () {
      var F = window.PM.Friends;
      var Ac = window.PM.Account;
      var logged = !!(Ac && Ac.logged());
      if (!this.friendsList || !F) return;

      if (this.friendsGate) this.friendsGate.style.display = logged ? 'none' : 'flex';
      if (this.friendsBody) this.friendsBody.style.display = logged ? 'flex' : 'none';
      if (!logged) return;

      this.pullFriends();
      this.renderFriends();
    },

    /* Traer la lista de verdad desde la cuenta.
     *
     * Antes esto vivía dentro de refreshFriends() y, al llegar la respuesta,
     * volvía a llamarlo: refrescar pedía la lista, la lista refrescaba, y
     * vuelta a empezar. La consecuencia era una petición detrás de otra sin
     * parar y la lista rehaciéndose entera todo el rato, así que los botones
     * parpadeaban y a veces se comían el clic (el botón que pulsabas ya no
     * era el que estaba en pantalla al soltar). Ahora la respuesta solo
     * REPINTA, y solo si la lista ha cambiado de verdad. */
    pullFriends: function () {
      var self = this;
      var Ac = window.PM.Account;
      var F = window.PM.Friends;
      if (this._friendsPulling || !Ac || !Ac.logged()) return;
      this._friendsPulling = true;
      Ac.listFriends(function (err, list) {
        self._friendsPulling = false;
        if (err || !list) return;
        var antes = F.all().join(',');
        F.replace(list);
        if (F.all().join(',') !== antes) self.renderFriends();
      });
    },

    /* Los avatares de la lista: los guarda la cuenta de cada uno, así que se
     * piden todos de una vez y se pintan cuando llegan. Quien no tenga cuenta
     * se queda con el Pac-Man de siempre. */
    pullFriendAvatars: function () {
      var self = this;
      var Ac = window.PM.Account;
      var F = window.PM.Friends;
      if (!Ac || !Ac.fetchProfiles || !F) return;
      var lista = F.all();
      if (!lista.length) return;
      Ac.fetchProfiles(lista, function (err, mapa) {
        if (err || !mapa) return;
        self.friendProfiles = mapa;
        self.paintFriendAvatars();
      });
    },

    paintFriendAvatars: function () {
      var mapa = this.friendProfiles || {};
      if (!this.friendAvatars) return;
      for (var i = 0; i < this.friendAvatars.length; i++) {
        var it = this.friendAvatars[i];
        var fila = mapa[it.name];
        var av = (fila && CFG.AVATAR_IDS.indexOf(fila.avatar) !== -1)
          ? fila.avatar : 'pac';
        var c = it.canvas.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, 44, 44);
        c.imageSmoothingEnabled = false;
        window.PM.Sprites.drawAvatar(c, 22, 22, 18, av, '#ffff00');
      }
    },

    renderFriends: function () {
      var self = this;
      var F = window.PM.Friends;
      if (!this.friendsList || !F) return;
      var list = F.all();
      this.friendsList.innerHTML = '';
      this.friendAvatars = [];
      if (!list.length) {
        var vacio = document.createElement('div');
        vacio.className = 'note';
        vacio.textContent = 'TODAVÍA NO HAS AÑADIDO A NADIE';
        this.friendsList.appendChild(vacio);
        return;
      }
      /* Cada amigo es una ficha: su avatar, su nombre y un botón que despliega
       * lo que se puede hacer con él. Antes salían los cuatro botones de
       * frente, y una lista de amigos parecía una barra de herramientas. */
      list.forEach(function (name) {
        var row = document.createElement('div');
        row.className = 'friend-row';

        var cab = document.createElement('div');
        cab.className = 'friend-cab';
        row.appendChild(cab);

        var av = document.createElement('canvas');
        av.width = 44; av.height = 44;
        av.className = 'friend-avatar';
        cab.appendChild(av);

        var n = document.createElement('span');
        n.className = 'friend-name';
        n.textContent = name;
        cab.appendChild(n);

        var btns = document.createElement('div');
        btns.className = 'friend-btns';
        row.appendChild(btns);

        var abrir = self.makeButton('OPCIONES ▾', function () {
          var on = row.classList.toggle('open');
          abrir.textContent = on ? 'OPCIONES ▴' : 'OPCIONES ▾';
          abrir.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
        abrir.classList.add('btn-preset', 'friend-toggle');
        abrir.setAttribute('aria-expanded', 'false');
        cab.appendChild(abrir);

        self.friendAvatars.push({ name: name, canvas: av });

        function boton(txt, fn, red) {
          var b = self.makeButton(txt, fn);
          b.classList.add('btn-preset');
          if (red) b.disabled = !window.PM.Net.configured();
          btns.appendChild(b);
          return b;
        }

        boton('VER PERFIL', function () { self.showFriendProfile(name); });

        boton('VER PARTIDA', function () { self.watchFriend(name); }, true);

        boton('INVITAR', function () {
          var P = window.PM.Party;
          if (!P || !P.active()) {
            self.friendsMsg.classList.add('error');
            self.friendsMsg.textContent = 'PRIMERO CREA UNA PARTY';
            return;
          }
          P.invite(name, function (ok, msg) {
            self.friendsMsg.classList.toggle('error', !ok);
            self.friendsMsg.textContent = msg || '';
          });
        }, true);

        boton('QUITAR', function () {
          F.remove(name);                       // fuera de la copia local
          self.friendsMsg.classList.remove('error');
          self.friendsMsg.textContent = '';
          self.renderFriends();                 // se va de la lista al momento
          if (window.PM.Account) {
            window.PM.Account.removeFriend(name, function () {
              self.refreshFriends();            // y se confirma con la nube
            });
          }
        });

        self.friendsList.appendChild(row);
      });
      this.paintFriendAvatars();     // con lo que ya se sepa
      this.pullFriendAvatars();      // y se repinta cuando lleguen
    },

    /* ------------------------------------------------------
     * Ver la partida de un amigo
     * Se le pregunta por su canal personal dónde está jugando y se
     * entra en su sala solo a mirar, por un canal aparte: la party
     * propia sigue en pie mientras tanto, no hay que salirse.
     * ------------------------------------------------------ */
    watchFriend: function (name) {
      if (!window.PM.Party || !window.PM.Net.configured()) return;
      this.findAndWatch(name);
    },

    findAndWatch: function (name) {
      var self = this;
      this.friendsMsg.classList.remove('error');
      this.friendsMsg.textContent = 'BUSCANDO A ' + name + '...';
      window.PM.Party.locate(name, function (res) {
        if (!res) {
          self.friendsMsg.classList.add('error');
          self.friendsMsg.textContent = name + ' NO ESTÁ CONECTADO';
          return;
        }
        // primero lo de siempre: si no está jugando, no hay nada que ver
        if (!res.jugando) {
          self.friendsMsg.classList.add('error');
          self.friendsMsg.textContent = name + ' AÚN NO HA EMPEZADO A JUGAR';
          return;
        }
        // jugando pero sin canal: se quedó sin nombre o sin conexión
        if (!res.code) {
          self.friendsMsg.classList.add('error');
          self.friendsMsg.textContent = 'NO SE PUEDE VER LA PARTIDA DE ' + name;
          return;
        }
        self.joinAsSpec(res.code, name);
      });
    },

    joinAsSpec: function (code, name) {
      var self = this;
      this.spec = { code: code, name: name, timer: null };
      this.friendsMsg.textContent = 'ENTRANDO A VER A ' + name + '...';
      window.PM.Net.openView(code, {
        // van dentro: openView empieza cerrando la vista anterior, y eso
        // borraba estos dos enganches si se ponían antes de llamar
        onMsg: function (n, d, sid) { self.specData(n, d, sid); },
        onGone: function () { self.specFail('SE PERDIÓ LA CONEXIÓN'); },
        onOpen: function () {
          if (!self.spec) return;
          window.PM.Net.gameSend('hello', { v: CFG.NET.PROTO, spec: 1 });
          self.spec.timer = setTimeout(function () {
            if (self.spec) self.specFail('NO SE PUDO VER LA PARTIDA');
          }, CFG.NET.HELLO_TIMEOUT_MS);
        },
        onError: function (m) { self.specFail(m || 'SIN CONEXIÓN'); }
      });
    },

    specData: function (name, d) {
      if (!this.spec) return;
      if (name === 'svista') {
        if (!d || d.to !== window.PM.Net.sid) return;
        if (d.v !== CFG.NET.PROTO) {
          this.specFail('TIENE OTRA VERSIÓN DEL JUEGO');
          return;
        }
        clearTimeout(this.spec.timer);
        this.spec = null;
        var n = parseInt(d.n, 10);
        if (!(n >= 1 && n <= CFG.MAX_PLAYERS)) n = 2;
        var colors = [], names = [], skins = [], ghosts = [], looks = [];
        for (var i = 0; i < n; i++) {
          colors.push(sanitizeSetting('pacColor', (d.co || [])[i], CFG.PLAYER_COLORS[i]));
          names.push(sanitizeNick((d.nm || [])[i]) || ('J' + (i + 1)));
          skins.push(sanitizeSetting('skin1', (d.sk || [])[i], 'clasico'));
          // PAC-MAN VS.: el mirón también tiene que ver quién lleva fantasma
          ghosts.push(sanitizeSetting('vsGhost2', (d.gh || [])[i], -1));
          looks.push(this.lookDeRed((d.lk || [])[i]));
        }
        this.hideAll();
        this.resumeAudio();
        window.PM.Game.newGame({
          players: n, net: 'spec', localIdx: -1,
          cfg: this.sanitizeNetCfg(d.cfg),
          colors: colors, names: names, skins: skins, ghosts: ghosts, looks: looks,
          hab: !!(d && d.hab),  // el mirón tiene que ver dientes y chispas
          roles: (d && d.rl) || null,
          caza: !!(d && d.caza), // y el Pac-Man de la máquina, con su reloj
          superv: !!(d && d.sv)  // y la zona de SUPERVIVENCIA
        });
      } else if (name === 'full') {
        if (d && d.to === window.PM.Net.sid) this.specFail('LA PARTIDA NO ADMITE MIRONES');
      }
    },

    specFail: function (msg) {
      if (this.spec && this.spec.timer) clearTimeout(this.spec.timer);
      this.spec = null;
      window.PM.Net.closeView();     // la party propia no se toca
      this.friendsMsg.classList.add('error');
      this.friendsMsg.textContent = msg;
      this.showFriends();
    },

    /* ------------------------------------------------------
     * TOP MUNDIAL
     *
     * La pantalla de récords de una máquina de 1980 con un PODIO dentro (se
     * eligió la "fusión" de <https://claude.ai/artifact/6vMyBK2yBJ1qwPiggg1w8v>):
     * líneas de tubo, 1UP y HIGH SCORE arriba, la cuenta atrás de la temporada
     * en el marcador, los tres primeros en cajones hechos con las paredes del
     * laberinto y, debajo, la tabla con "◄ TÚ". Al lado, el rival (HERE COMES
     * A CHALLENGER) y los campeones del mes pasado (HALL OF FAME). Y al pie,
     * Pac-Man persiguiendo fantasmas.
     *
     * Se elige el MUNDO (clásico, DESATADO, LABERINTOS: cada uno su tabla,
     * supabase/mundos.sql), el FORMATO (1..4 jugadores) y cómo verlo: PODIO o
     * LISTA. El nivel 1 y TUS PARTIDAS son listas siempre.
     *
     * Las pestañas de formato conservan sus números de siempre: 1..4 son el
     * número de jugadores, 5 el nivel 1 y 0 tus partidas.
     * ------------------------------------------------------ */
    buildRanking: function () {
      var self = this;
      var o = this.els.ranking;
      o.innerHTML = '';

      var tm = document.createElement('div');
      tm.className = 'tm';
      o.appendChild(tm);

      /* el marcador de arriba */
      var hud = document.createElement('div');
      hud.className = 'tm-hud';
      function casilla(etq, cls) {
        var c = document.createElement('div');
        c.className = 'tm-hud-c' + (cls ? ' ' + cls : '');
        var e = document.createElement('span');
        e.className = 'tm-hud-e';
        e.textContent = etq;
        c.appendChild(e);
        var v = document.createElement('b');
        c.appendChild(v);
        hud.appendChild(c);
        return { el: c, etq: e, v: v };
      }
      this.rankHud = {
        mio: casilla('1UP', 'uno'),
        alto: casilla('HIGH SCORE', 'alto'),
        reloj: casilla('FIN DE TEMPORADA', 'reloj')
      };
      tm.appendChild(hud);

      var h = document.createElement('div');
      h.className = 'panel-title tm-titulo';
      h.textContent = 'TOP MUNDIAL';
      tm.appendChild(h);

      this.rankSub = document.createElement('div');
      this.rankSub.className = 'tm-sub';
      tm.appendChild(this.rankSub);

      /* ---- los mandos: una sola fila de desplegables ----
       * Antes eran cuatro filas de pestañas (mundo, formato, temporada, vista
       * y, en TUS PARTIDAS, el filtro). Ahora cada cosa es un desplegable que
       * dice lo que hay puesto, y la vista es un interruptor LISTA | PODIO.
       * Los mapas de botones (rankTabBtns, seasonBtns...) siguen existiendo:
       * son las opciones de cada desplegable. */
      var R = window.PM.Ranking;
      var mandos = document.createElement('div');
      mandos.className = 'tm-mandos';
      tm.appendChild(mandos);

      var dTabla = this.desplegable('TABLA', [
        { id: 1, name: 'INDIVIDUAL', grupo: 'POR PUNTOS' }, { id: 2, name: 'DÚO', grupo: 'POR PUNTOS' },
        { id: 3, name: 'TRÍO', grupo: 'POR PUNTOS' }, { id: 4, name: 'ESCUADRA', grupo: 'POR PUNTOS' },
        { id: 5, name: 'NIVEL 1 · CONTRARRELOJ', grupo: 'OTRAS' }, { id: 0, name: 'TUS PARTIDAS', grupo: 'OTRAS' }
      ], function (id) { self.showRankTab(+id); });
      this.rankTabBtns = dTabla.btns;
      this.rankTablaDesp = dTabla;
      mandos.appendChild(dTabla.el);

      var dMundo = this.desplegable('MUNDO',
        (R ? R.MUNDOS : [{ id: 'clasico', name: 'CLÁSICO' }]).map(function (m) { return { id: m.id, name: m.name }; }),
        function (id) { self.showRankMundo(id); });
      this.rankMundoRow = dMundo.el;
      this.rankMundoBtns = dMundo.btns;
      this.rankMundoDesp = dMundo;
      mandos.appendChild(dMundo.el);

      var dTemp = this.desplegable('TEMPORADA', [
        { id: 'ahora', name: 'ESTA TEMPORADA' }, { id: 'historico', name: 'HISTÓRICO' }
      ], function (id) { self.showSeasonTab(id); });
      this.seasonRow = dTemp.el;
      this.seasonBtns = dTemp.btns;
      this.seasonDesp = dTemp;
      mandos.appendChild(dTemp.el);

      /* TUS PARTIDAS: todas, o solo las destacadas */
      var dHist = this.desplegable('VER', [
        { id: 'todas', name: 'TODAS' }, { id: 'destacadas', name: '★ DESTACADAS' }
      ], function (id) { self.histFiltro = id; self.loadRanking(); });
      this.rankHistRow = dHist.el;
      this.rankHistBtns = dHist.btns;
      this.rankHistDesp = dHist;
      mandos.appendChild(dHist.el);
      this.histFiltro = 'todas';

      /* la forma de verlo: interruptor */
      this.rankVistaRow = document.createElement('div');
      this.rankVistaRow.className = 'tm-vista';
      this.rankVistaBtns = {};
      [['lista', '☰ LISTA'], ['podio', '▲ PODIO']].forEach(function (t) {
        var bt = self.makeButton(t[1], function () { self.showRankVista(t[0]); });
        bt.classList.add('tm-vista-b');
        self.rankVistaBtns[t[0]] = bt;
        self.rankVistaRow.appendChild(bt);
      });
      mandos.appendChild(this.rankVistaRow);

      this.rankStatus = document.createElement('div');
      this.rankStatus.className = 'lobby-status tm-estado';
      tm.appendChild(this.rankStatus);

      /* ---- el cuerpo: podio y tabla a la izquierda, paneles a la derecha ---- */
      var cuerpo = document.createElement('div');
      cuerpo.className = 'tm-cuerpo';
      this.rankCuerpo = cuerpo;
      tm.appendChild(cuerpo);
      var izq = document.createElement('div');
      izq.className = 'tm-izq';
      cuerpo.appendChild(izq);
      this.rankPodio = document.createElement('div');
      this.rankPodio.className = 'tm-podio';
      izq.appendChild(this.rankPodio);
      this.rankList = document.createElement('div');
      this.rankList.className = 'rank-list tm-lista';
      izq.appendChild(this.rankList);
      this.rankReto = document.createElement('div');
      this.rankReto.className = 'tm-reto';
      izq.appendChild(this.rankReto);
      this.rankLado = document.createElement('div');
      this.rankLado.className = 'tm-lado';
      cuerpo.appendChild(this.rankLado);

      /* el desfile del pie */
      this.rankDesfile = document.createElement('canvas');
      this.rankDesfile.width = 1180; this.rankDesfile.height = 48;
      this.rankDesfile.className = 'tm-desfile';
      this.rankDesfile.setAttribute('aria-hidden', 'true');
      tm.appendChild(this.rankDesfile);

      var row = document.createElement('div');
      row.className = 'preset-row';
      row.style.marginTop = '12px';
      var reload = this.makeButton('ACTUALIZAR', function () {
        self.rankFama = {};
        self.loadRanking();
      });
      reload.classList.add('btn-preset');
      row.appendChild(reload);
      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-preset');
      row.appendChild(back);
      tm.appendChild(row);

      this.rankTab = 1;
      this.rankMundo = 'clasico';
      this.rankVista = 'lista';        // la lista, de entrada
      this.rankAvatares = {};
      this.rankFama = {};
      this.rankDibujos = [];
      this.rankCuentas = [];
    },

    showRankTab: function (players) {
      this.rankTab = ([0, 2, 3, 4, 5].indexOf(players) !== -1) ? players : 1;
      this.loadRanking();
    },

    /* ESTA TEMPORADA / HISTÓRICO (solo en las clasificaciones por puntos) */
    showSeasonTab: function (name) {
      this.seasonTab = (name === 'historico') ? 'historico' : 'ahora';
      this.loadRanking();
    },

    showRankMundo: function (id) {
      var R = window.PM.Ranking;
      this.rankMundo = R ? R.mundo(id) : 'clasico';
      this.loadRanking();
    },

    showRankVista: function (v) {
      this.rankVista = (v === 'lista') ? 'lista' : 'podio';
      this.loadRanking();
    },

    /* ¿Esa fila es tuya? (tu nombre está entre los que jugaron) */
    rankEsMia: function (r) {
      var R = window.PM.Ranking;
      var mine = String(window.PM.settings.nick1 || '').toUpperCase();
      if (!mine) return false;
      var nombres = R ? R.nombresDe(r) : [String(r.nombre1 || '').toUpperCase()];
      return nombres.indexOf(mine) !== -1;
    },

    loadRanking: function () {
      var self = this;
      var R = window.PM.Ranking;
      var S = window.PM.Season;
      var players = this.rankTab;
      if ([0, 2, 3, 4, 5].indexOf(players) === -1) players = 1;
      var mundo = R ? R.mundo(this.rankMundo) : 'clasico';
      for (var k in this.rankTabBtns) {
        if (this.rankTabBtns.hasOwnProperty(k)) {
          this.rankTabBtns[k].classList.toggle('active', +k === players);
        }
      }
      var porTemporada = (players >= 1 && players <= 4);
      var enTemporada = porTemporada && this.seasonTab === 'ahora' && S;
      /* el mundo solo cuenta en las de puntos: el nivel 1 es del clásico */
      this.rankMundoRow.style.display = porTemporada ? 'flex' : 'none';
      this.rankHistRow.style.display = (players === 0) ? 'flex' : 'none';
      for (var hf in this.rankHistBtns) {
        if (this.rankHistBtns.hasOwnProperty(hf)) this.rankHistBtns[hf].classList.toggle('active', hf === (this.histFiltro || 'todas'));
      }
      for (var m in this.rankMundoBtns) {
        if (this.rankMundoBtns.hasOwnProperty(m)) this.rankMundoBtns[m].classList.toggle('active', m === mundo);
      }
      if (this.seasonRow) {
        this.seasonRow.style.display = porTemporada ? 'flex' : 'none';
        for (var s in this.seasonBtns) {
          if (this.seasonBtns.hasOwnProperty(s)) {
            this.seasonBtns[s].classList.toggle('active', s === this.seasonTab);
          }
        }
        for (var v in this.rankVistaBtns) {
          if (this.rankVistaBtns.hasOwnProperty(v)) this.rankVistaBtns[v].classList.toggle('active', v === this.rankVista);
        }
      }
      if (this.rankVistaRow) this.rankVistaRow.style.display = porTemporada ? 'flex' : 'none';
      if (this.rankTablaDesp) {
        this.rankTablaDesp.poner(players);
        this.rankMundoDesp.poner(mundo);
        this.seasonDesp.poner(this.seasonTab === 'ahora' ? 'ahora' : 'historico');
        this.rankHistDesp.poner(this.histFiltro || 'todas');
      }
      var temporada = S ? S.nombre(S.actual()) : '';
      var nombreMundo = '';
      if (R) R.MUNDOS.forEach(function (x) { if (x.id === mundo) nombreMundo = x.name; });
      var H = window.PM.History;
      var conCuenta = !!(H && H.cuenta && H.cuenta());
      this.rankSub.textContent =
        players === 0 ? ('TUS ÚLTIMAS PARTIDAS · ' + (conCuenta
          ? 'TAMBIÉN LAS DE OTROS APARATOS' : 'SOLO LAS DE ESTE NAVEGADOR')) :
        players === 5 ? 'LO MÁS RÁPIDO EN DESPEJAR EL NIVEL 1 · A UN JUGADOR Y CON LOS AJUSTES DE SIEMPRE' :
        ('— ' + (enTemporada ? temporada : 'DE SIEMPRE') + ' · ' +
          (R ? R.formato(players) : '') + ' · ' + nombreMundo + ' —');

      this.rankList.innerHTML = '';
      this.rankPodio.innerHTML = '';
      this.rankReto.textContent = '';
      this.rankLado.innerHTML = '';
      this.rankDibujos = [];
      this.rankCuentas = [];
      this.rankPodio.style.display = 'none';
      this.rankLado.style.display = 'none';
      this.rankCuerpo.classList.toggle('sin-lado', this.rankVista !== 'podio' || !(players >= 1 && players <= 4));
      this.pintarHud(null);
      this.rankReq = (this.rankReq || 0) + 1;   // corta respuestas en vuelo
      this.animarRanking();
      this.sinTildes(this.els.ranking);

      if (players === 0) {
        var reqLocal = this.rankReq;
        var vacio = (this.histFiltro === 'destacadas')
          ? 'AÚN NO HAS DESTACADO NINGUNA · PULSA ☆ EN UNA PARTIDA'
          : 'AÚN NO HAS JUGADO NINGUNA PARTIDA';
        var hist = this.historialConDestacadas(H ? H.all() : []);
        this.rankStatus.classList.remove('error');
        this.rankStatus.textContent = hist.length ? '' : vacio;
        this.renderHistory(hist);
        var Rp = window.PM.Replay;
        var pinta = function (err, lista) {
          if (self.rankReq !== reqLocal) return;    // se cambió de pestaña
          var todo = self.historialConDestacadas(lista);
          self.renderHistory(todo);
          self.rankStatus.classList.toggle('error', !!err);
          self.rankStatus.textContent =
            err ? ('SOLO LAS DE ESTE NAVEGADOR: ' + err) : todo.length ? '' : vacio;
        };
        if (conCuenta && H.configured()) {
          if (!hist.length) this.rankStatus.textContent = 'CARGANDO...';
          /* primero las repeticiones de tu cuenta (destacadas y de otros
           * aparatos) y luego el historial de la nube */
          var sigue = function () { H.list(pinta); };
          if (Rp && Rp.traerMias) Rp.traerMias(sigue); else sigue();
        }
        return;
      }
      if (!R || !R.configured()) {
        this.rankStatus.classList.add('error');
        this.rankStatus.textContent = 'EL TOP MUNDIAL NECESITA LAS CREDENCIALES DE SUPABASE';
        return;
      }
      this.rankStatus.classList.remove('error');
      this.rankStatus.textContent = 'CARGANDO...';
      var req = this.rankReq;
      function llegaron(err, rows) {
        if (self.rankReq !== req) return;      // respuesta caducada
        if (err) {
          self.rankStatus.classList.add('error');
          self.rankStatus.textContent = err === 'FALTA LA TABLA EN SUPABASE'
            ? ('FALTA LA TABLA: EJECUTA supabase/' +
               (enTemporada ? 'temporadas.sql' : 'ranking.sql') +
               ' EN TU PROYECTO')
            : ('NO SE PUDO CARGAR: ' + err);
          return;
        }
        self.rankStatus.classList.remove('error');
        self.rankStatus.textContent = '';
        /* verse en el top 10 individual de siempre del clásico abre DORADO */
        if (players === 1 && !enTemporada && mundo === 'clasico' && window.PM.Skins) {
          window.PM.Skins.anotarTop10(rows);
        }
        if (players === 5) { self.renderTimes(rows); return; }
        self.rankFilas = rows;
        self.pintarHud(rows);
        if (self.rankVista === 'podio') self.renderPodio(rows);
        self.rankList.classList.toggle('con-podio', self.rankVista === 'podio' && rows.length > 3);
        self.renderRanking(self.rankVista === 'podio' ? rows.slice(3) : rows,
          self.rankVista === 'podio' ? 3 : 0);
        if (!rows.length) {
          self.rankStatus.textContent = enTemporada
            ? 'NADIE HA JUGADO AQUÍ ESTA TEMPORADA · LA PRIMERA PARTIDA SE SUBE AL 1ST'
            : 'NADIE HA JUGADO AQUÍ TODAVÍA · LA PRIMERA PARTIDA SE SUBE AL 1ST';
        }
        self.pintarReto(rows);
        // el rival y el HALL OF FAME son del PODIO: la LISTA es la tabla sola
        if (self.rankVista === 'podio') self.pintarLado(rows, players, mundo);
        self.pedirAvatares(rows);
        self.sinTildes(self.els.ranking);
      }
      if (players === 5) R.topTime(llegaron);
      else if (enTemporada) S.top(S.actual(), players, llegaron, mundo);
      else R.top(players, llegaron, mundo);
    },

    /* 1UP (tu marca en esta tabla), HIGH SCORE y la cuenta atrás */
    pintarHud: function (rows) {
      var H = this.rankHud;
      if (!H) return;
      var mia = null;
      if (rows) for (var i = 0; i < rows.length; i++) if (this.rankEsMia(rows[i])) { mia = rows[i]; break; }
      H.mio.v.textContent = mia ? String(mia.puntos) : '00';
      H.alto.v.textContent = (rows && rows.length) ? String(rows[0].puntos) : '00';
      this.pintarReloj();
    },

    /* Lo que le queda a la temporada (van por meses, en hora UTC) */
    pintarReloj: function () {
      var H = this.rankHud;
      if (!H) return;
      var ahora = new Date();
      var fin = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 1);
      var s = Math.max(0, Math.floor((fin - ahora.getTime()) / 1000));
      var dd = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600);
      var mm = Math.floor((s % 3600) / 60), ss = s % 60;
      function dos(n) { return (n < 10 ? '0' : '') + n; }
      H.reloj.v.textContent = dd + 'D ' + dos(hh) + ':' + dos(mm) + ':' + dos(ss);
    },

    ORDINALES: ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH', '9TH', '10TH',
      '11TH', '12TH', '13TH', '14TH', '15TH', '16TH', '17TH', '18TH', '19TH', '20TH'],

    /* Un avatar dibujado con los sprites del juego, que se repinta solo */
    rankAvatar: function (r, tam, fase) {
      var cv = document.createElement('canvas');
      cv.width = tam; cv.height = tam;
      cv.className = 'tm-avatar';
      this.rankDibujos.push({ cv: cv, fila: r, fase: fase || 0 });
      return cv;
    },

    pintarAvatarRank: function (o, t) {
      var R = window.PM.Ranking, Sp = window.PM.Sprites;
      if (!Sp || !Sp.drawAvatar) return;
      var c = o.cv.getContext('2d'), s = o.cv.width;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, s, s);
      c.imageSmoothingEnabled = false;
      var nombres = R ? R.nombresDe(o.fila) : [];
      var av = this.rankAvatares || {};
      var n = Math.max(1, nombres.length);
      var bote = Math.sin(t * 4 + o.fase) * s * 0.03;
      if (n === 1) {
        Sp.drawAvatar(c, s / 2, s / 2 + bote, s * 0.4, av[nombres[0]] || 'pac', CFG.PLAYER_COLORS[0]);
        return;
      }
      var paso = s / (n + 1.2);
      for (var i = 0; i < n; i++) {
        Sp.drawAvatar(c, s / 2 + (i - (n - 1) / 2) * paso * 1.25,
          s / 2 + Math.sin(t * 4 + o.fase + i) * s * 0.03, paso * 0.55,
          av[nombres[i]] || 'pac', CFG.PLAYER_COLORS[i % CFG.PLAYER_COLORS.length]);
      }
    },

    /* Los avatares de quienes salen, de sus perfiles (se guardan para no
     * volver a pedirlos). Quien no tiene cuenta sale con el Pac-Man. */
    pedirAvatares: function (rows) {
      var self = this, R = window.PM.Ranking;
      if (!R || !R.avatares) return;
      var faltan = [];
      rows.forEach(function (r) {
        R.nombresDe(r).forEach(function (n) {
          if (!self.rankAvatares.hasOwnProperty(n) && faltan.indexOf(n) === -1) faltan.push(n);
        });
      });
      if (!faltan.length) return;
      faltan.forEach(function (n) { self.rankAvatares[n] = 'pac'; });
      R.avatares(faltan, function (err, mapa) {
        if (err || !mapa) return;
        for (var k in mapa) if (mapa.hasOwnProperty(k)) self.rankAvatares[k] = mapa[k];
      });
    },

    /* El podio: 2º, 1º y 3º en sus cajones. Un cajón vacío invita a subirse. */
    renderPodio: function (rows) {
      var self = this, R = window.PM.Ranking;
      var p = this.rankPodio;
      p.innerHTML = '';
      p.style.display = '';
      [1, 0, 2].forEach(function (i) {
        var r = rows[i];
        var pl = document.createElement('div');
        pl.className = 'tm-plaza p' + (i + 1) + (r ? '' : ' hueco');
        var ord = document.createElement('div');
        ord.className = 'tm-ord';
        ord.textContent = self.ORDINALES[i];
        pl.appendChild(ord);
        if (r) {
          pl.appendChild(self.rankAvatar(r, i === 0 ? 96 : 72, i));
        } else {
          var hueco = document.createElement('div');
          hueco.className = 'tm-avatar-hueco';
          pl.appendChild(hueco);
        }
        var nm = document.createElement('div');
        nm.className = 'tm-nombre';
        nm.textContent = r ? (R ? R.nombresDe(r).join(' + ') : r.nombre1) : '¿TÚ?';
        pl.appendChild(nm);
        var pts = document.createElement('div');
        pts.className = 'tm-pts';
        pts.textContent = r ? '0' : '—';
        if (r) self.rankCuentas.push({ el: pts, hasta: r.puntos, t0: Date.now() });
        pl.appendChild(pts);
        var yo = document.createElement('div');
        yo.className = 'tm-yo';
        yo.textContent = (r && self.rankEsMia(r)) ? '◄ TÚ ►' : '';
        pl.appendChild(yo);
        var caja = document.createElement('div');
        caja.className = 'tm-caja';
        var num = document.createElement('span');
        num.textContent = String(i + 1);
        caja.appendChild(num);
        pl.appendChild(caja);
        p.appendChild(pl);
      });
    },

    /* La tabla de récords de la máquina: cabecera RANK · NAME · SCORE · LEVEL
     * y una fila por puesto, cada una entera de un color de fantasma (el 1ST
     * en oro y con el nombre cambiando de color). Sin franjas ni marcos: la
     * de 1980 era texto sobre negro. En PODIO sale del 4º en adelante y con
     * su avatar; en LISTA, todos y sin avatar, tal cual la recreativa. */
    renderRanking: function (rows, desde) {
      var R = window.PM.Ranking;
      desde = desde || 0;
      var conAvatar = desde > 0;
      this.rankList.innerHTML = '';
      if (rows.length) this.rankList.appendChild(this.rankCabecera(['RANK', 'NAME', 'SCORE', 'LEVEL'], conAvatar));
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var puesto = desde + i;
        var nombres = R ? R.nombresDe(r) : [String(r.nombre1 || '').toUpperCase()];
        var row = document.createElement('div');
        row.className = 'rank-row tm-fila-rank ' + this.rankColor(puesto) +
          (conAvatar ? '' : ' sin-avatar');
        row.style.animationDelay = (i * 0.09) + 's';
        if (this.rankEsMia(r)) row.classList.add('mine');

        var pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = this.ORDINALES[puesto] || ((puesto + 1) + 'TH');
        row.appendChild(pos);

        if (conAvatar) row.appendChild(this.rankAvatar(r, 32, puesto));

        var who = document.createElement('span');
        who.className = 'rank-who';
        var nom = document.createElement('span');
        nom.className = 'tm-nom';
        nom.textContent = nombres.join(' + ');
        who.appendChild(nom);
        if (this.rankEsMia(r)) {
          var tu = document.createElement('span');
          tu.className = 'tm-tu';
          tu.textContent = '◄ TU';
          who.appendChild(tu);
        }
        row.appendChild(who);

        var pts = document.createElement('span');
        pts.className = 'rank-pts';
        pts.textContent = String(r.puntos);
        row.appendChild(pts);

        var lvl = document.createElement('span');
        lvl.className = 'rank-lvl';
        lvl.textContent = 'LV ' + r.nivel;
        row.appendChild(lvl);

        this.rankList.appendChild(row);
      }
    },

    /* El color de cada puesto: oro el primero y luego los cuatro fantasmas */
    rankColor: function (puesto) {
      return puesto === 0 ? 'p1' : ('c' + ((puesto - 1) % 4));
    },

    rankCabecera: function (textos, conAvatar) {
      var cab = document.createElement('div');
      cab.className = 'tm-cabecera' + (conAvatar ? '' : ' sin-avatar');
      textos.forEach(function (t, i) {
        var s = document.createElement('span');
        s.textContent = t;
        cab.appendChild(s);
        if (i === 0 && conAvatar) cab.appendChild(document.createElement('span'));
      });
      return cab;
    },

    /* La letra de máquina no tiene tildes: lo que se escribe con ella va sin
     * ellas, como en las recreativas de entonces (TRIO, DUO, CLASICO). */
    sinTildes: function (nodo) {
      if (!nodo) return;
      var hijos = nodo.childNodes || nodo.children || [];
      for (var i = 0; i < hijos.length; i++) {
        var h = hijos[i];
        if (h.nodeType === 3) {
          var v = String(h.nodeValue || '');
          var limpio = v.normalize ? v.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : v;
          if (limpio !== v) h.nodeValue = limpio;
        } else {
          this.sinTildes(h);
        }
      }
    },

    /* Tu mejor puesto y tu rival: el de delante o, si vas primero, el
     * primero que te sigue y NO eres tú (en equipo puedes salir varias
     * veces, con compañeros distintos, y no eres rival de ti mismo). */
    rankRival: function (rows) {
      var pos = -1, otro = null, i;
      for (i = 0; i < rows.length; i++) if (this.rankEsMia(rows[i])) { pos = i; break; }
      if (pos > 0) otro = rows[pos - 1];
      else if (pos === 0) {
        for (i = 1; i < rows.length; i++) if (!this.rankEsMia(rows[i])) { otro = rows[i]; break; }
      }
      return { pos: pos, otro: otro };
    },

    /* La línea del reto: defender el 1ST o lo que falta para el de delante.
     * El nombre y la cifra van en amarillo, como en la recreativa. */
    pintarReto: function (rows) {
      var R = window.PM.Ranking;
      var el = this.rankReto;
      el.textContent = '';
      var rv = this.rankRival(rows), pos = rv.pos;
      var linea = document.createElement('div');
      function trozo(txt, resalta) {
        var s = document.createElement(resalta ? 'b' : 'span');
        s.textContent = txt;
        linea.appendChild(s);
      }
      if (pos === 0 && rv.otro) {
        trozo('DEFIENDE EL 1ST · ');
        trozo(R.nombresDe(rv.otro).join(' + '), true);
        trozo(' ESTA A ');
        trozo(fmtMonedas(rows[0].puntos - rv.otro.puntos), true);
        trozo(' PUNTOS');
      } else if (pos === 0) {
        trozo('DEFIENDE EL 1ST · NADIE TE SIGUE TODAVIA');
      } else if (pos > 0) {
        trozo('TE FALTAN ');
        trozo(fmtMonedas(rows[pos - 1].puntos - rows[pos].puntos + 10), true);
        trozo(' PUNTOS PARA EL ');
        trozo(this.ORDINALES[pos - 1], true);
      } else {
        trozo(rows.length ? 'JUEGA Y ENTRA EN LA TABLA' : 'SUBETE AL PODIO');
      }
      el.appendChild(linea);
      var coin = document.createElement('div');
      coin.className = 'tm-coin';
      coin.textContent = 'INSERT COIN';
      el.appendChild(coin);
    },

    /* Los paneles del lado: tu rival y los campeones del mes pasado */
    pintarLado: function (rows, players, mundo) {
      var self = this, R = window.PM.Ranking, S = window.PM.Season;
      var lado = this.rankLado;
      lado.innerHTML = '';
      lado.style.display = '';

      var p1 = document.createElement('div');
      p1.className = 'tm-panel';
      var t1 = document.createElement('div');
      t1.className = 'tm-panel-t';
      t1.textContent = 'HERE COMES A CHALLENGER';
      p1.appendChild(t1);
      var rv = this.rankRival(rows), pos = rv.pos;
      var txt = document.createElement('div');
      txt.className = 'tm-panel-txt';
      if (pos >= 0 && rv.otro) {
        var otro = rv.otro;
        var vs = document.createElement('div');
        vs.className = 'tm-vs';
        [rows[pos], otro].forEach(function (r, k) {
          var d = document.createElement('div');
          d.appendChild(self.rankAvatar(r, 48, 20 + k));
          var n = document.createElement('div');
          n.className = 'tm-vs-n';
          n.textContent = R.nombresDe(r).join(' + ');
          d.appendChild(n);
          var p = document.createElement('div');
          p.className = 'tm-vs-p';
          p.textContent = fmtMonedas(r.puntos);
          d.appendChild(p);
          vs.appendChild(d);
          if (k === 0) {
            var x = document.createElement('div');
            x.className = 'tm-vs-x';
            x.textContent = 'VS';
            vs.appendChild(x);
          }
        });
        p1.appendChild(vs);
        txt.textContent = pos === 0
          ? (R.nombresDe(otro).join(' + ') + ' ESTÁ A ' + fmtMonedas(rows[0].puntos - otro.puntos) + ' PUNTOS DE QUITARTE EL 1ST')
          : ('TE FALTAN ' + fmtMonedas(otro.puntos - rows[pos].puntos + 10) + ' PUNTOS PARA PASAR A ' + R.nombresDe(otro).join(' + '));
      } else if (pos === 0) {
        txt.textContent = 'ESTÁS SOLO ARRIBA. NADIE TE PERSIGUE… TODAVÍA';
      } else {
        txt.textContent = 'AÚN NO ESTÁS EN ESTA TABLA. UNA PARTIDA Y ENTRAS';
      }
      p1.appendChild(txt);
      lado.appendChild(p1);

      /* HALL OF FAME: el primero de cada formato el mes pasado, en este mundo */
      if (!S) return;
      var p2 = document.createElement('div');
      p2.className = 'tm-panel';
      var ahora = new Date();
      var pasada = S.actual(new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - 1, 15)));
      var t2 = document.createElement('div');
      t2.className = 'tm-panel-t';
      t2.textContent = 'HALL OF FAME · ' + String(S.nombre(pasada)).split(' ')[0];
      p2.appendChild(t2);
      var fama = document.createElement('div');
      fama.className = 'tm-fama';
      p2.appendChild(fama);
      lado.appendChild(p2);
      var clave = pasada + ':' + mundo;
      var req = this.rankReq;
      function pinta(campeones) {
        if (self.rankReq !== req) return;
        fama.innerHTML = '';
        for (var n = 1; n <= 4; n++) {
          var f = document.createElement('div');
          f.className = 'tm-fama-f';
          var a = document.createElement('span');
          a.textContent = R.formato(n);
          f.appendChild(a);
          var b = document.createElement('b');
          var c = campeones[n];
          b.textContent = c ? R.nombresDe(c).join(' & ') : 'DESIERTO';
          b.classList.toggle('desierto', !c);
          f.appendChild(b);
          fama.appendChild(f);
        }
        self.sinTildes(fama);
      }
      if (this.rankFama[clave]) { pinta(this.rankFama[clave]); return; }
      var campeones = {}, faltan = 4;
      [1, 2, 3, 4].forEach(function (n) {
        S.top(pasada, n, function (err, filas) {
          if (!err && filas && filas.length) campeones[n] = filas[0];
          if (--faltan === 0) {
            self.rankFama[clave] = campeones;
            pinta(campeones);
          }
        }, mundo);
      });
    },

    /* Los más rápidos en despejar el nivel 1 */
    renderTimes: function (rows) {
      var R = window.PM.Ranking;
      var mine = String(window.PM.settings.nick1 || '').toUpperCase();
      this.rankList.innerHTML = '';
      if (!rows.length) {
        this.rankStatus.textContent = 'AÚN NADIE HA CRONOMETRADO EL NIVEL 1 · ¡SÉ EL PRIMERO!';
      }
      this.pintarHud(null);
      if (rows.length) this.rankList.appendChild(this.rankCabecera(['RANK', 'NAME', 'TIME', 'SCORE'], false));
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var n1 = String(r.nombre1 || '').toUpperCase();
        var row = document.createElement('div');
        row.className = 'rank-row tm-fila-rank sin-avatar ' + this.rankColor(i);
        row.style.animationDelay = (i * 0.09) + 's';
        if (mine && n1 === mine) row.classList.add('mine');

        var pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = this.ORDINALES[i] || ((i + 1) + 'TH');
        row.appendChild(pos);

        var who = document.createElement('span');
        who.className = 'rank-who';
        who.textContent = n1;
        row.appendChild(who);

        var t = document.createElement('span');
        t.className = 'rank-pts';
        t.textContent = R.fmtTime(r.tiempo1);
        row.appendChild(t);

        var pts = document.createElement('span');
        pts.className = 'rank-lvl';
        pts.textContent = r.puntos + ' PTS';
        this.sinTildes(this.els.ranking);
        row.appendChild(pts);

        this.rankList.appendChild(row);
      }
    },

    /* Mientras el panel está abierto: avatares que botan, puntos que suben,
     * la cuenta atrás y el desfile de Pac-Man y los fantasmas */
    animarRanking: function () {
      var self = this;
      var raf = window.requestAnimationFrame;
      if (!raf || this.rankAnim) return;
      this.rankAnim = true;
      var origen = Date.now(), ultimoReloj = 0;
      function paso() {
        var panel = self.els.ranking;
        if (!panel || panel.style.display === 'none') { self.rankAnim = false; return; }
        var ahora = Date.now(), t = (ahora - origen) / 1000;
        var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        (self.rankCuentas || []).forEach(function (o) {
          var k = quieto ? 1 : Math.min(1, (ahora - o.t0) / 1100);
          o.el.textContent = fmtMonedas(o.hasta * (1 - Math.pow(1 - k, 3)));
        });
        (self.rankDibujos || []).forEach(function (o) { self.pintarAvatarRank(o, quieto ? 0 : t); });
        if (ahora - ultimoReloj > 500) { ultimoReloj = ahora; self.pintarReloj(); }
        self.pintarDesfile(quieto ? 3 : t);
        raf(paso);
      }
      raf(paso);
    },

    /* Pac-Man se come una pastilla grande y persigue a los cuatro; luego
     * vuelven ellos a por él. El de la pantalla de espera de la máquina. */
    pintarDesfile: function (t) {
      var cv = this.rankDesfile, Sp = window.PM.Sprites;
      if (!cv || !Sp) return;
      var c = cv.getContext('2d');
      var S = 2, W = cv.width / S, H = cv.height / S, y = H / 2;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = '#000';
      c.fillRect(0, 0, cv.width, cv.height);
      c.imageSmoothingEnabled = false;
      c.setTransform(S, 0, 0, S, 0, 0);
      var ciclo = t % 16, ida = ciclo < 8, q = (ciclo % 8) / 8;
      var boca = [0, 1, 2, 1][Math.floor(t * 14) % 4], anda = Math.floor(t * 8) % 2;
      c.fillStyle = CFG.COLORS.pellet;
      if (ida) {
        var px = -20 + q * (W + 80), grande = W * 0.25;
        for (var x = 10; x < W; x += 8) if (x > px + 4) c.fillRect(x - 1, y - 1, 2, 2);
        if (px < grande) { c.beginPath(); c.arc(grande, y, 3, 0, Math.PI * 2); c.fill(); }
        var huyen = px >= grande;
        for (var g = 0; g < 4; g++) {
          Sp.drawGhost(c, px + 30 + g * 16, y, CFG.DIR.RIGHT, g, huyen ? 'fright' : 'chase', anda,
            huyen && q > 0.8 && Math.floor(t * 6) % 2 === 0);
        }
        Sp.drawPacman(c, px, y, CFG.DIR.RIGHT, boca, '#ffff00', 'clasico', {});
      } else {
        var qx = W + 20 - q * (W + 80);
        for (var g2 = 0; g2 < 4; g2++) Sp.drawGhost(c, qx + 26 + g2 * 16, y, CFG.DIR.LEFT, g2, 'chase', anda, false);
        Sp.drawPacman(c, qx, y, CFG.DIR.LEFT, boca, '#ffff00', 'clasico', {});
      }
      c.setTransform(1, 0, 0, 1, 0, 0);
    },

    /* TUS PARTIDAS, en la misma tabla de máquina que el top: fecha, quién,
     * puntos, nivel y, al final, ★ DESTACAR, VER y COMPARTIR. La repetición se
     * busca en este navegador (la local o la online) y, si ya no está, en la
     * nube, donde se sube sola al acabar cada partida. Las no destacadas dicen
     * cuántos días les quedan; las destacadas llevan su nombre y no caducan. */
    renderHistory: function (list) {
      var H = window.PM.History, R = window.PM.Replay;
      this.rankList.innerHTML = '';
      if (list.length) {
        var cab = document.createElement('div');
        cab.className = 'tm-cabecera tm-hist';
        ['FECHA', 'PARTIDA', 'SCORE', 'LEVEL', 'REPLAY'].forEach(function (t) {
          var s = document.createElement('span');
          s.textContent = t;
          cab.appendChild(s);
        });
        this.rankList.appendChild(cab);
      }
      var MUNDO = { hab: 'DESATADO', lab: 'LABERINTOS' };
      for (var i = 0; i < list.length; i++) {
        var h = list[i];
        var reg = (R && R.paraPartida) ? R.paraPartida(h) : null;
        var red = (!reg && R && R.paraPartidaRed) ? R.paraPartidaRed(h) : null;
        var nube = h.nubeEntrada || ((R && R.paraPartidaNube) ? R.paraPartidaNube(h) : null);
        var tipo = reg ? 'local' : red ? 'red' : nube ? 'nube' : '';
        var id = reg ? reg.id : red ? red.id : nube ? nube.rn : '';

        var row = document.createElement('div');
        row.className = 'rank-row tm-hist ' + this.rankColor(i + 1) + ((nube && nube.d) ? ' destacada' : '');

        var fecha = document.createElement('span');
        fecha.className = 'tm-fecha';
        var f = H ? H.fmtDate(h.t).split(' ') : ['', ''];
        var d1 = document.createElement('b');
        d1.textContent = f[0];
        var d2 = document.createElement('small');
        d2.textContent = f[1] || '';
        fecha.appendChild(d1);
        fecha.appendChild(d2);
        row.appendChild(fecha);

        var who = document.createElement('span');
        who.className = 'rank-who';
        if (nube && nube.d && nube.ti) {
          var titulo = document.createElement('span');
          titulo.className = 'tm-titulo-rep';
          titulo.textContent = '★ ' + nube.ti;
          who.appendChild(titulo);
        }
        var nom = document.createElement('span');
        nom.className = 'tm-nom';
        // con tres y cuatro no caben todos los nombres: el tuyo y cuántos erais
        nom.textContent = h.nombresTexto ? h.nombresTexto
          : (h.j === 2) ? (h.n1 + ' + ' + h.n2)
          : (h.j > 2) ? (h.n1 + ' +' + (h.j - 1)) : h.n1;
        who.appendChild(nom);
        var etiqueta = MUNDO[h.mu] || '';
        if (h.m === 'online') etiqueta += (etiqueta ? ' · ' : '') + 'ONLINE';
        if (etiqueta) {
          var tag = document.createElement('small');
          tag.className = 'tm-etiqueta';
          tag.textContent = etiqueta;
          who.appendChild(tag);
        }
        row.appendChild(who);

        var pts = document.createElement('span');
        pts.className = 'rank-pts';
        pts.textContent = String(h.p);
        row.appendChild(pts);

        var lvl = document.createElement('span');
        lvl.className = 'rank-lvl';
        lvl.textContent = 'LV ' + h.lv;
        row.appendChild(lvl);

        var acc = document.createElement('span');
        acc.className = 'tm-acciones';
        if (tipo) {
          var botones = document.createElement('span');
          botones.className = 'tm-botones';
          botones.appendChild(this.makeStarBtn(h, tipo, id, nube));
          botones.appendChild(this.makeReplayBtn(id, tipo));
          botones.appendChild(this.makeShareBtn(id, tipo));
          acc.appendChild(botones);
          if (nube && !nube.d && R && R.diasQueQuedan) {
            var dias = R.diasQueQuedan(nube);
            var cad = document.createElement('small');
            cad.className = 'tm-caduca' + (dias <= 1 ? ' pronto' : '');
            cad.textContent = dias === 0 ? 'SE BORRA HOY · DESTÁCALA'
              : ('SE BORRA EN ' + dias + (dias === 1 ? ' DÍA' : ' DÍAS'));
            acc.appendChild(cad);
          }
        } else {
          var sin = document.createElement('small');
          sin.className = 'tm-sin-rep';
          sin.textContent = 'SIN REPETICIÓN';
          sin.title = 'DE ANTES DE QUE LAS REPETICIONES SE GUARDARAN EN LA NUBE, O YA CADUCADA';
          acc.appendChild(sin);
        }
        row.appendChild(acc);

        this.rankList.appendChild(row);
      }
      this.sinTildes(this.rankList);
    },

    /* Lo que enseña TUS PARTIDAS: el historial y, además, las DESTACADAS que
     * ya no estén en él (el historial del navegador es corto; una destacada
     * es para siempre). Con el filtro ★, solo las destacadas. */
    historialConDestacadas: function (list) {
      var R = window.PM.Replay;
      var out = (list || []).slice();
      var dest = (R && R.destacadas) ? R.destacadas() : [];
      dest.forEach(function (x) {
        var esta = out.some(function (h) {
          var e = R.paraPartidaNube(h);
          return e && e.rn === x.rn;
        });
        if (!esta) {
          out.push({ t: x.t, j: x.j || 1, m: x.tipo === 'red' ? 'online' : 'local',
            n1: x.n || '', n2: '', nombresTexto: x.n || '', p: x.p || 0, lv: x.lv || 1,
            nubeEntrada: x });
        }
      });
      out.sort(function (a, b) { return b.t - a.t; });
      if (this.histFiltro === 'destacadas') {
        out = out.filter(function (h) {
          var e = h.nubeEntrada || (R ? R.paraPartidaNube(h) : null);
          return !!(e && e.d);
        });
      }
      return out;
    },

    /* ★: destacar (o dejar de destacar) y ponerle nombre */
    makeStarBtn: function (h, tipo, id, nube) {
      var self = this;
      var activa = !!(nube && nube.d);
      var b = this.makeButton(activa ? '★' : '☆', function () {
        self.showDestacarPrompt(h, tipo, id, nube);
      });
      b.classList.add('tm-estrella');
      b.classList.toggle('activa', activa);
      b.title = activa ? 'DESTACADA: SE GUARDA PARA SIEMPRE' : 'DESTACAR: GUARDARLA PARA SIEMPRE Y PONERLE NOMBRE';
      b.setAttribute('aria-label', activa ? 'Destacada, cambiar' : 'Destacar esta partida');
      return this.chico(b);
    },

    showDestacarPrompt: function (h, tipo, id, nube) {
      var self = this;
      var Ac = window.PM.Account, R = window.PM.Replay;
      if (!Ac || !Ac.logged()) {
        this.showPrompt({
          title: 'DESTACAR PARTIDA',
          color: '#ffd23f',
          solid: true,
          lines: [
            'LAS DESTACADAS SE GUARDAN PARA SIEMPRE Y CON NOMBRE; LAS DEMÁS SE BORRAN A LOS ' +
              CFG.REPLAY_CADUCA_DIAS + ' DÍAS',
            'PARA DESTACAR NECESITAS UNA CUENTA'
          ],
          buttons: [
            { label: 'CREAR CUENTA', primary: true, keys: ['Enter'], hint: 'ENTER',
              onClick: function () { self.showAccountPrompt('crear', function () { self.loadRanking(); }); } },
            { label: 'YA TENGO CUENTA', onClick: function () { self.showAccountPrompt('entrar', function () { self.loadRanking(); }); } },
            { label: 'VOLVER', keys: ['Escape'], hint: 'ESC', onClick: function () { self.hidePrompt(); } }
          ]
        });
        return;
      }
      var activa = !!(nube && nube.d);
      var titulo = (nube && nube.ti) || '';
      function guardar(on) {
        self.setPromptStatus(on ? 'GUARDANDO...' : 'QUITANDO...', false);
        R.destacarFila(tipo, id, on, titulo, function (err) {
          if (err) { self.setPromptStatus(err, true); return; }
          self.hidePrompt();
          self.loadRanking();
        });
      }
      var botones = [
        { label: activa ? 'GUARDAR' : '★ DESTACAR', primary: true, onClick: function () { guardar(true); } }
      ];
      if (activa) botones.push({ label: 'QUITAR DESTACADA', onClick: function () { guardar(false); } });
      botones.push({ label: 'VOLVER', keys: ['Escape'], hint: 'ESC', onClick: function () { self.hidePrompt(); } });
      this.showPrompt({
        title: activa ? 'PARTIDA DESTACADA' : 'DESTACAR PARTIDA',
        color: '#ffd23f',
        lines: [
          { text: String(h.p) + ' PUNTOS · NIVEL ' + h.lv, big: true },
          activa ? 'SE GUARDA PARA SIEMPRE. PUEDES CAMBIARLE EL NOMBRE O QUITARLA'
            : 'SE GUARDA PARA SIEMPRE. SIN DESTACAR, SE BORRA A LOS ' + CFG.REPLAY_CADUCA_DIAS + ' DÍAS'
        ],
        fields: [
          { placeholder: 'NOMBRE (OPCIONAL)', maxLength: CFG.REPLAY_TITULO_MAX, value: titulo,
            onInput: function (v) { titulo = v; }, onAccept: function () { guardar(true); } }
        ],
        status: '',
        buttons: botones
      });
    },

    /* Botón VER. tipo: 'local' y 'red' están en este navegador (id de su
     * ficha); 'nube', solo en la nube (id = su código). Un booleano vale
     * como antes: true es 'red'. */
    makeReplayBtn: function (id, tipo) {
      if (tipo === true) tipo = 'red';
      var b = this.makeButton('VER', function () {
        var R = window.PM.Replay;
        if (tipo === 'red') R.verRedGuardada(id);
        else if (tipo === 'nube') R.verCompartida(id);
        else R.verGuardada(id);
      });
      b.classList.add('tm-ver');
      return this.chico(b);
    },

    /* Y COMPARTIR: el enlace corto con el código de la nube (se sube si aún
     * no lo estaba). Una local que no se pueda subir sale con la partida
     * dentro de la URL, que también vale. */
    makeShareBtn: function (id, tipo) {
      if (tipo === true) tipo = 'red';
      var self = this;
      var b = this.makeButton('COMPARTIR', function () {
        var R = window.PM.Replay;
        if (!R) return;
        if (tipo === 'nube') { self.showSharePrompt(R.enlaceRed(id), true); return; }
        self.showPrompt({
          title: 'COMPARTIR REPETICIÓN',
          color: '#7ec8ff',
          lines: ['PREPARANDO EL ENLACE...'],
          buttons: []
        });
        var hecho = function (err, url) {
          if (err) { self.showShareError(err); return; }
          self.showSharePrompt(url, url.indexOf('?rep=') === -1);
        };
        if (tipo === 'red') R.compartirRed(id, hecho);
        else R.compartirLocal(id, hecho);
      });
      b.classList.add('tm-compartir');
      return this.chico(b);
    },

    /* Botón de fila: el mismo estilo para VER y COMPARTIR */
    chico: function (b) {
      b.classList.add('tab', 'tm-chico');
      return b;
    },

    showShareError: function (msg) {
      var self = this;
      this.showPrompt({
        title: 'NO SE PUDO COMPARTIR',
        color: '#ff8c00',
        lines: [msg || 'INTÉNTALO MÁS TARDE'],
        buttons: [
          { label: 'SEGUIR', primary: true, keys: ['Enter', 'Escape'],
            hint: 'ENTER', onClick: function () { self.hidePrompt(); } }
        ]
      });
    },

    /* El enlace, listo para copiar. Se enseña entero aunque sea largo: si
     * copiar falla (o el navegador no deja), tiene que poder cogerse a mano. */
    showSharePrompt: function (url, deRed) {
      var self = this;
      this.showPrompt({
        title: 'ENLACE DE LA REPETICIÓN',
        color: '#7ec8ff',
        solid: true,
        lines: [
          url,
          deRed
            ? 'LA PARTIDA ESTÁ SUBIDA: EL ENLACE VALE PARA CUALQUIERA, DURE LO QUE DURE'
            : 'LA PARTIDA VA DENTRO DEL ENLACE: FUNCIONA SIN SERVIDOR Y SIN CADUCAR',
          'QUIEN LO ABRA VERÁ LA PARTIDA. NO CUENTA PARA NADA: NI PUNTOS, NI LOGROS, NI RÉCORD'
        ],
        status: '',
        buttons: [
          { label: 'COPIAR', primary: true, onClick: function () {
            self.copiarTexto(url, 'ENLACE COPIADO');
          } },
          { label: 'CERRAR', keys: ['Escape', 'Enter'], hint: 'ESC',
            onClick: function () { self.hidePrompt(); } }
        ]
      });
    },

    /* ------------------------------------------------------
     * Laberintos alternativos (modo aparte)
     * ------------------------------------------------------ */
    buildMazes: function () {
      var self = this;
      var o = this.els.mazes;
      if (!o) return;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'LABERINTOS';
      o.appendChild(h);

      var nota = document.createElement('div');
      nota.className = 'note';
      nota.textContent = 'OTROS LABERINTOS, LOS MISMOS FANTASMAS. ES UN MODO ' +
        'APARTE: EL LABERINTO DE 1980 NO SE TOCA, ASÍ QUE ESTAS PARTIDAS VAN ' +
        'A SU PROPIO TOP MUNDIAL — Y TAMBIÉN SUMAN EXPERIENCIA.';
      o.appendChild(nota);

      var lista = document.createElement('div');
      lista.className = 'maze-list';
      var M = window.PM.Mazes;
      (M ? M.LIST : []).forEach(function (m) {
        lista.appendChild(self.mazeRow(m));
      });
      o.appendChild(lista);

      var row = document.createElement('div');
      row.className = 'preset-row';
      row.style.marginTop = '12px';
      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-preset');
      row.appendChild(back);
      o.appendChild(row);
    },

    /* Una ficha: el dibujo del laberinto, su nombre y el botón de jugar */
    mazeRow: function (m) {
      var self = this;
      var fila = document.createElement('div');
      fila.className = 'maze-row';

      var mini = this.mazeThumb(m);
      if (mini) fila.appendChild(mini);

      var info = document.createElement('div');
      info.className = 'maze-info';
      var nm = document.createElement('div');
      nm.className = 'maze-name';
      nm.textContent = m.name;
      info.appendChild(nm);
      var ds = document.createElement('small');
      ds.textContent = m.desc + ' · ' + m.pellets + ' PASTILLAS';
      info.appendChild(ds);
      fila.appendChild(info);

      var b = this.makeButton('JUGAR', function () {
        self.resumeAudio();
        function go() {
          self.hideAll();
          window.PM.Game.newGame({ players: 1, maze: m.id });
        }
        if (self.avisaSiHayGuardada(go)) return;
        go();
      });
      b.classList.add('btn-preset');
      fila.appendChild(b);
      return fila;
    },

    /* Miniatura de los muros. Se dibuja con el mismo código que la partida
     * (Game.buildMazeCanvas) cambiando CFG.MAZE un momento y devolviéndolo:
     * así el dibujo del panel no puede desviarse del de verdad. */
    mazeThumb: function (m) {
      var G = window.PM.Game;
      if (!G || !G.buildMazeCanvas) return null;
      var cv = document.createElement('canvas');
      cv.width = 112;
      cv.height = Math.round(CFG.ROWS * CFG.TILE / 2);
      var c = cv.getContext('2d');
      if (!c) return null;
      /* Se dibuja DIRECTAMENTE al tamaño del sello, con trazo de un píxel, en
       * vez de encoger el laberinto de la partida. Encogiéndolo se apagaba:
       * el dibujo de la partida va a escala de pantalla, meterlo en 112 px es
       * dividir por seis, y un trazo de CFG.WALL_LINE se disuelve hasta
       * quedar en nada. Es el mismo código con otra escala, así que el sello
       * sigue sin poder desviarse de lo que se juega. */
      var antes = CFG.MAZE;
      CFG.setMaze(m.rows);
      var full = G.buildMazeCanvas(CFG.COLORS.wall, cv.width / CFG.NATIVE_W, 1);
      CFG.setMaze(antes);
      c.drawImage(full, 0, 0);
      return cv;
    },

    showMazes: function () {
      this.showPanel('mazes');
    },

    /* ------------------------------------------------------
     * Controles en pantalla: barra de botones y cruceta(s)
     * ------------------------------------------------------ */
    /* Barra superior de la partida: RENDIRSE (siempre) y pausa (táctil) */
    buildGameButtons: function () {
      var self = this;
      var bar = document.createElement('div');
      bar.id = 'gameBtns';

      var em = document.createElement('button');
      em.type = 'button';
      em.id = 'emoteBtn';
      em.className = 'game-btn';
      em.textContent = 'EMOTES';
      em.setAttribute('aria-label', 'Emotes');
      em.addEventListener('click', function () {
        self.resumeAudio();
        self.toggleEmoteBar();
      });
      bar.appendChild(em);
      this.emoteBtn = em;

      var ch = document.createElement('button');
      ch.type = 'button';
      ch.id = 'chatBtn';
      ch.className = 'game-btn';
      ch.textContent = 'CHAT';
      ch.setAttribute('aria-label', 'Chat');
      ch.addEventListener('click', function () {
        self.resumeAudio();
        self.openChat();
      });
      bar.appendChild(ch);
      this.chatBtn = ch;

      var sur = document.createElement('button');
      sur.type = 'button';
      sur.id = 'surrenderBtn';
      sur.className = 'game-btn';
      sur.textContent = 'RENDIRSE';
      sur.setAttribute('aria-label', 'Rendirse');
      sur.addEventListener('click', function () {
        self.resumeAudio();
        window.PM.Game.requestVote('surrender');
      });
      bar.appendChild(sur);

      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'pauseBtn';
      b.className = 'game-btn';
      b.setAttribute('aria-label', 'Pausa');
      b.textContent = '❚❚';
      b.style.display = this.touchDevice ? '' : 'none';
      b.addEventListener('click', function () {
        self.resumeAudio();
        window.PM.Game.requestPause();
      });
      bar.appendChild(b);

      document.getElementById('stage').appendChild(bar);
      this.gameBtns = bar;
      this.pauseBtn = b;
      this.surrenderBtn = sur;
      this.buildEmoteBar();
      this.buildChatInput();
    },

    /* Fila de emotes (se abre con el botón; en teclado van con 1..6) */
    buildEmoteBar: function () {
      var self = this;
      var bar = document.createElement('div');
      bar.id = 'emoteBar';
      /* cada botón enseña la cara y su número (el mismo atajo de teclado) */
      this.emoteFaces = [];
      CFG.EMOTES.forEach(function (e, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'emote-btn';
        b.title = (i + 1) + ' · ' + e.name;
        b.setAttribute('aria-label', 'Emote ' + (i + 1) + ' ' + e.name);
        var cv = document.createElement('canvas');
        cv.width = 26; cv.height = 26;
        b.appendChild(cv);
        var num = document.createElement('span');
        num.className = 'emote-num';
        num.textContent = String(i + 1);
        b.appendChild(num);
        b.addEventListener('click', function () {
          self.resumeAudio();
          window.PM.Game.sendEmote(i);
          self.toggleEmoteBar(false);
        });
        bar.appendChild(b);
        self.emoteFaces.push({ canvas: cv, id: e.id, btn: b });
      });
      /* misma acción que Ctrl+Espacio (y F1..F4 abajo), para quien juega sin
       * teclado */
      var mb = document.createElement('button');
      mb.type = 'button';
      mb.className = 'emote-btn badge-emote';
      mb.textContent = 'MI MAESTRÍA';
      mb.addEventListener('click', function () {
        self.resumeAudio();
        window.PM.Game.sendBadgeTag();
        self.toggleEmoteBar(false);
      });
      bar.appendChild(mb);
      /* y las de cada formato (F1..F4 con teclado), juntas para que la fila
       * no las parta por la mitad */
      var fmts = document.createElement('span');
      fmts.className = 'badge-fmts';
      [['SOLO', 1], ['DÚO', 2], ['TRÍO', 3], ['ESC.', 4]].forEach(function (f) {
        var fb = document.createElement('button');
        fb.type = 'button';
        fb.className = 'emote-btn badge-emote badge-fmt';
        fb.textContent = f[0];
        fb.title = 'F' + f[1] + ' · MAESTRÍA DE ' +
          (window.PM.Badges ? window.PM.Badges.FORMATOS[f[1] - 1].name : f[0]);
        fb.addEventListener('click', function () {
          self.resumeAudio();
          window.PM.Game.sendBadgeTag(f[1]);
          self.toggleEmoteBar(false);
        });
        fmts.appendChild(fb);
      });
      bar.appendChild(fmts);
      document.getElementById('stage').appendChild(bar);
      this.emoteBar = bar;
    },

    toggleEmoteBar: function (on) {
      if (!this.emoteBar) return;
      var show = (on === undefined) ? !this.emoteBarOpen : !!on;
      this.emoteBarOpen = show;
      this.emoteBar.classList.toggle('on', show);
      if (show) {
        /* Justo debajo del marcador, donde empieza el laberinto: arriba del
         * todo tapaba los puntos y el HIGH SCORE. */
        var cv = document.getElementById('game');
        if (cv && cv.offsetHeight) {
          this.emoteBar.style.top = Math.round(cv.offsetTop +
            cv.offsetHeight * (CFG.MAZE_Y / CFG.NATIVE_H) + 4) + 'px';
        }
        var Tn = window.PM.Tienda;
        for (var i = 0; Tn && i < this.emoteFaces.length; i++) {
          var nombre = Tn.nombreEmote(Tn.emoteDeTecla(i));
          this.emoteFaces[i].btn.title = (i + 1) + ' · ' + nombre;
          this.emoteFaces[i].btn.setAttribute('aria-label', 'Emote ' + (i + 1) + ' ' + nombre);
        }
        this.refreshEmoteFaces();
      }
    },

    /* Las caras de la barra, con el color del jugador local */
    drawEmoteFaces: function (tick) {
      if (!this.emoteFaces) return;
      var g = window.PM.Game;
      var color = g.colorFor(g.netRole ? g.localIdx : 0);
      // las caras de cada tecla las elige cada uno en la TIENDA
      var Tn = window.PM.Tienda;
      var caras = Tn ? Tn.emotes() : null;
      for (var i = 0; i < this.emoteFaces.length; i++) {
        var it = this.emoteFaces[i];
        var id = (caras && caras[i]) || it.id;
        var c = it.canvas.getContext('2d');
        c.clearRect(0, 0, 26, 26);
        c.imageSmoothingEnabled = false;
        window.PM.Sprites.drawPacFace(c, 13, 14, 9, color, id, tick);
      }
    },

    /* Con la barra abierta las caras se mueven, igual que se verán sobre el
     * jugador: así se elige por lo que hace el emote, no por una foto fija.
     * El bucle se para solo al cerrar la barra. */
    refreshEmoteFaces: function () {
      var self = this;
      if (this.emoteRaf) return;
      var ms0 = null;
      var paso = function (ms) {
        if (!self.emoteBarOpen) { self.emoteRaf = 0; return; }
        if (ms0 === null) ms0 = ms;
        self.drawEmoteFaces((ms - ms0) * 0.06);   // 60 pasos por segundo
        self.emoteRaf = window.requestAnimationFrame(paso);
      };
      this.emoteRaf = window.requestAnimationFrame(paso);
    },

    /* Entrada de chat (solo online) */
    buildChatInput: function () {
      var self = this;
      var wrap = document.createElement('div');
      wrap.id = 'chatBox';
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'chat-input';
      input.maxLength = CFG.CHAT_MAX;
      input.placeholder = 'ESCRIBE Y PULSA ENTER';
      input.setAttribute('autocomplete', 'off');
      input.addEventListener('keydown', function (ev) {
        ev.stopPropagation();          // que no llegue al juego
        if (ev.key === 'Enter') {
          window.PM.Game.sendChat(input.value);
          input.value = '';
          self.closeChat();
        } else if (ev.key === 'Escape') {
          self.closeChat();
        }
      });
      wrap.appendChild(input);
      document.getElementById('stage').appendChild(wrap);
      this.chatBox = wrap;
      this.chatInput = input;
    },

    openChat: function () {
      if (!this.chatBox || !window.PM.Game.canChat()) return;
      this.chatBox.classList.add('on');
      this.chatOpen = true;
      this.chatInput.focus();
    },

    closeChat: function () {
      if (!this.chatBox) return;
      this.chatBox.classList.remove('on');
      this.chatOpen = false;
      this.chatInput.blur();
    },

    onChat: function () { /* enganche para futuros avisos de chat */ },

    /* ------------------------------------------------------
     * Diálogos sobre la partida: rendición, revancha y GAME OVER.
     * syncPrompt() reconstruye el diálogo a partir del estado del
     * juego (Game.vote / Game.overIdle), así nunca se descuadran.
     * ------------------------------------------------------ */
    showPrompt: function (o) {
      var self = this;
      var p = this.els.prompt;
      p.innerHTML = '';
      /* De qué es el diálogo que hay puesto. Lo usa quien pregunta algo por
       * red y quiere rehacerlo al llegar la respuesta, sin pisar otro que
       * haya salido entretanto. Lo pone quien lo necesita, después de esto. */
      this.promptTag = null;

      var t = document.createElement('div');
      t.className = 'panel-title';
      if (o.color) t.style.color = o.color;
      t.textContent = o.title;
      p.appendChild(t);

      /* cada línea: texto suelto u objeto { text, big } */
      (o.lines || []).forEach(function (line) {
        if (!line) return;
        var obj = (typeof line === 'object');
        var d = document.createElement('div');
        d.className = 'prompt-line' + (obj && line.big ? ' big' : '');
        d.textContent = obj ? line.text : line;
        p.appendChild(d);
      });

      /* resumen de la partida (lo que te llevas al acabar) */
      if (o.summary) p.appendChild(this.buildRunSummary(o.summary));

      /* contenido hecho a mano (el GAME OVER de recreativa) */
      if (o.custom) o.custom(p);

      /* campo de texto opcional (invitar a alguien por su nombre) */
      this.promptInput = null;
      if (o.input) {
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'nick-input';
        inp.maxLength = o.input.maxLength || CFG.NICK_MAX;
        inp.placeholder = o.input.placeholder || '';
        inp.setAttribute('autocomplete', 'off');
        inp.addEventListener('keydown', function (ev) {
          ev.stopPropagation();
          if (ev.key === 'Enter' && o.input.onAccept) o.input.onAccept(inp.value);
        });
        p.appendChild(inp);
        this.promptInput = inp;
      }

      /* varios campos (usuario + contraseña de las cuentas) */
      if (o.fields) {
        o.fields.forEach(function (f) {
          var el = document.createElement('input');
          /* `email` en vez de `text` para el correo: en el móvil eso cambia el
           * teclado que sale (con arroba y punto a mano), que es la mitad de
           * la comodidad de escribir una dirección con el pulgar. */
          el.type = f.password ? 'password' : (f.correo ? 'email' : 'text');
          el.className = 'nick-input';
          el.maxLength = f.maxLength || CFG.NICK_MAX;
          el.placeholder = f.placeholder || '';
          // arrastrar lo ya escrito de un diálogo al siguiente (el usuario que
          // se tecleó al intentar entrar sigue puesto al ir a recuperar)
          if (f.value) el.value = f.value;
          el.setAttribute('autocomplete', f.password ? 'current-password' : 'off');
          el.setAttribute('spellcheck', 'false');
          el.addEventListener('keydown', function (ev) {
            ev.stopPropagation();          // escribir no mueve a Pac-Man
            if (ev.key === 'Enter' && f.onAccept) f.onAccept(el.value);
          });
          el.addEventListener('input', function () {
            /* El usuario se filtra como un nombre del juego, la clave va tal
             * cual y el correo solo pierde los espacios (un correo no es un
             * nombre del juego: lleva arroba, puntos y minúsculas). */
            var v = el.value;
            if (f.filter) v = f.filter(v);
            else if (f.correo) v = v.replace(/\s+/g, '').toLowerCase();
            else if (!f.password) v = filterNick(v).replace(/[^A-Z0-9]/g, '');
            if (v !== el.value) el.value = v;
            if (f.onInput) f.onInput(el.value);
          });
          p.appendChild(el);
        });
      }

      this.promptStatusEl = null;
      this.promptStatusOwn = false;
      if (typeof o.status === 'string') {
        var st = document.createElement('div');
        st.className = 'lobby-status' + (o.statusError ? ' error' : '');
        st.textContent = o.status;
        p.appendChild(st);
        this.promptStatusEl = st;
      }

      /* botones, con su atajo de teclado (b.keys) y la tecla a la vista */
      var row = document.createElement('div');
      row.className = 'prompt-btns';
      this.promptKeys = [];
      (o.buttons || []).forEach(function (b) {
        var el = self.makeButton(b.label, b.onClick);
        if (b.primary) el.classList.add('btn-primary');
        if (b.hint) {
          var k = document.createElement('span');
          k.className = 'btn-key';
          k.textContent = b.hint;
          el.appendChild(k);
        }
        self.ponRonda(el, 'btn-ronda');
        if (b.keys) self.promptKeys.push({ keys: b.keys, el: el });
        row.appendChild(el);
      });
      p.appendChild(row);

      p.classList.toggle('solid', !!o.solid);
      p.classList.toggle('arcade', !!o.arcade);
      /* Marco de recreativa (el del GAME OVER): bombillas, título a rayas y
       * fondo con líneas de tubo. o.tono le da el color: rojo (el final),
       * amarillo (pausa, revancha), naranja (rendirse), cian (revivir). */
      if (o.arcade) {
        p.setAttribute('data-tono', o.tono || 'rojo');
        if (!p.querySelector('.go-bombillas')) {
          var bombs = document.createElement('div');
          bombs.className = 'go-bombillas';
          bombs.setAttribute('aria-hidden', 'true');
          p.insertBefore(bombs, p.firstChild);
        }
        var tit = p.querySelector('.panel-title');
        if (tit) {
          tit.classList.add('go-titulo');
          if (o.tono) tit.classList.add('tono-' + o.tono);
        }
      } else if (p.removeAttribute) {
        p.removeAttribute('data-tono');
      }
      // sobre un menú el velo tiene que tapar; sobre la partida, no (el
      // laberinto se sigue viendo por detrás a propósito)
      p.classList.toggle('over-panel', !!this.visiblePanel());
      p.style.display = 'flex';
      this.promptOpen = true;
      this.refreshControls();
      // foco en el botón principal: las flechas y Enter funcionan de inmediato
      var first = p.querySelector('.btn-primary') || p.querySelector('.btn');
      if (first) { try { first.focus(); } catch (e) { /* sin foco */ } }
    },

    /* ------------------------------------------------------
     * Navegación con flechas por menús y diálogos
     * ------------------------------------------------------ */
    /* Panel visible ahora mismo (null si estamos en partida) */
    visiblePanel: function () {
      var names = ['menu', 'options', 'online', 'badges', 'ranking',
                   'mazes', 'friends', 'profile', 'mate', 'vestuario', 'tienda'];
      for (var i = 0; i < names.length; i++) {
        var el = this.els[names[i]];
        if (el && el.style.display !== 'none') return el;
      }
      return null;
    },

    /* Controles enfocables del panel/diálogo abierto, en orden de aparición
     * (los de una pestaña oculta no cuentan: no tienen caja de dibujo) */
    navItems: function (host) {
      if (!host) return [];
      var sel = 'button:not([disabled]), input[type="range"], ' +
        'input[type="text"]:not([disabled]), input[type="color"]';
      var all = host.querySelectorAll(sel);
      var out = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].offsetParent !== null) out.push(all[i]);
      }
      return out;
    },

    navMove: function (host, delta) {
      var items = this.navItems(host);
      if (!items.length) return false;
      var cur = -1;
      for (var i = 0; i < items.length; i++) {
        if (items[i] === document.activeElement) { cur = i; break; }
      }
      var next = (cur === -1)
        ? (delta > 0 ? 0 : items.length - 1)
        : (cur + delta + items.length) % items.length;
      var el = items[next];
      try {
        el.focus();
        if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      } catch (e) { /* sin foco */ }
      return true;
    },

    /* Devuelve true si la tecla la consume la navegación */
    handleNavKey: function (ev) {
      /* con la ficha abierta, las flechas se quedan dentro de ella */
      var host = this.promptOpen ? this.els.prompt
        : (this.ficha && this.ficha.win) ? this.ficha.win : this.visiblePanel();
      if (!host) return false;
      var ae = document.activeElement;
      var inHost = ae && host.contains(ae);
      var tag = ae ? ae.tagName : '';
      var typing = inHost && tag === 'INPUT' &&
        (ae.type === 'text' || ae.type === 'color');
      var k = ev.key;

      if (ev.ctrlKey || ev.altKey || ev.metaKey) return false;   // combinaciones
      if (k === 'Enter' || k === ' ') {
        if (typing) return false;             // lo gestiona el propio campo
        if (inHost && tag === 'BUTTON') { ae.click(); return true; }
        return false;                          // que sigan los atajos del diálogo
      }
      if (k !== 'ArrowUp' && k !== 'ArrowDown' &&
          k !== 'ArrowLeft' && k !== 'ArrowRight') return false;

      var horiz = (k === 'ArrowLeft' || k === 'ArrowRight');
      // escribiendo: izquierda/derecha mueven el cursor del texto
      if (typing && horiz) return false;
      // deslizador enfocado: izquierda/derecha ajustan el valor (nativo)
      if (inHost && tag === 'INPUT' && ae.type === 'range' && horiz) return false;
      /* Carrusel de modos: con la tarjeta enfocada, izquierda y derecha pasan
       * de modo en vez de saltar al botón de al lado. Es lo que se espera de
       * algo que enseña ◀ y ▶, y deja el carrusel jugable sin ratón. */
      if (horiz && inHost && ae && ae.classList &&
          ae.classList.contains('mode-card')) {
        this.stepMode((k === 'ArrowRight') ? 1 : -1);
        /* La tarjeta anterior se acaba de ocultar y con ella se iría el foco
         * al body, así que se lo pasamos a la nueva. */
        var card = this.modeCards && this.modeCards[this.modePick];
        if (card) { try { card.b.focus(); } catch (e) { /* sin foco */ } }
        return true;
      }

      return this.navMove(host, (k === 'ArrowDown' || k === 'ArrowRight') ? 1 : -1);
    },

    /* Atajos del diálogo abierto. Devuelve true si la tecla era suya. */
    handlePromptKey: function (ev) {
      if (!this.promptKeys) return false;
      var key = (ev.key && ev.key.length === 1) ? ev.key.toLowerCase() : ev.key;
      for (var i = 0; i < this.promptKeys.length; i++) {
        var pk = this.promptKeys[i];
        if (pk.keys.indexOf(key) === -1) continue;
        if (pk.el.disabled) return true;
        pk.el.click();
        return true;
      }
      return false;
    },

    hidePrompt: function () {
      if (!this.els.prompt) return;
      this.els.prompt.style.display = 'none';
      this.els.prompt.innerHTML = '';
      this.els.prompt.classList.remove('arcade');
      this.promptTag = null;
      this.promptStatusEl = null;
      this.promptStatusOwn = false;
      this.promptKeys = [];
      this.promptOpen = false;
    },

    /* Mensaje dentro del diálogo abierto (cuentas: "entrando...", errores) */
    setPromptStatus: function (text, error) {
      if (!this.promptStatusEl) return;
      // este diálogo se encarga de su propio mensaje: que tickPrompt no lo pise
      this.promptStatusOwn = true;
      this.promptStatusEl.classList.toggle('error', !!error);
      this.promptStatusEl.textContent = text || '';
    },

    voteStatusText: function (vote) {
      var secs = Math.ceil(vote.ticks / 60);
      if (vote.role === 'from') return 'ESPERANDO RESPUESTA... ' + secs;
      return vote.local ? '' : ('QUEDAN ' + secs + ' S');
    },

    /* Cuenta atrás: se reescribe solo el texto, sin rehacer el diálogo
     * (rehacerlo cada segundo se comería alguna pulsación de los botones) */
    tickPrompt: function () {
      var g = window.PM.Game;
      if (!this.promptOpen || !this.promptStatusEl) return;
      if (this.promptStatusOwn) return;      // lo lleva el propio diálogo
      this.promptStatusEl.textContent = g.vote
        ? this.voteStatusText(g.vote)
        : (g.flash ? g.flash.text : '');
    },

    syncPrompt: function () {
      var g = window.PM.Game;
      if (!this.els.prompt) return;
      if (g.state === 'MENU' || g.netNotice) {
        this.hidePrompt();
        this.refreshControls();
        return;
      }
      if (g.vote) this.showVotePrompt(g.vote);
      // g.overWait: aún se están celebrando logros o subida de nivel sobre el
      // laberinto, y el panel del resumen no debe taparlos
      else if (g.state === 'CONTINUE' && !g.replaying && !g.isSpec()) this.showContinuePrompt();
      else if (g.state === 'REVIVIR' && !g.replaying && !g.isSpec()) this.showRevivirPrompt();
      else if (g.overIdle && !g.overWait) this.showGameOverPrompt();
      else if (g.paused && g.inGame() && g.state !== 'GAME_OVER') this.showPausePrompt();
      /* Del CONTINUE? al GAME OVER hay un paso de nada: el diálogo de
       * recreativa se queda puesto hasta que lo sustituye el final, sin
       * enseñar el laberinto en medio. */
      else if (g.state === 'GAME_OVER' && !g.overIdle && this.promptOpen &&
               this.els.prompt.classList.contains('arcade')) { /* se queda */ }
      else {
        this.hidePrompt();
        this.refreshControls();
      }
    },

    /* Menú de pausa: reanudar / reiniciar / salir, con atajos de teclado */
    showPausePrompt: function () {
      var self = this;
      var g = window.PM.Game;
      /* viendo una repetición: el menú de pausa es el suyo (js/replay.js) */
      if (g.replaying && window.PM.Replay && window.PM.Replay.pausaPrompt()) return;
      var lines = [];
      /* de espectador solo se puede seguir viendo o irse: la partida es
       * de otros y aquí nada de reiniciarla */
      if (g.isSpec()) {
        this.showPrompt({
          title: 'VIENDO LA PARTIDA',
          arcade: true,
          tono: 'cian',
          lines: ['ESTÁS VIENDO LA PARTIDA DE ' + g.nameFor(0) + '.'],
          buttons: [
            { label: 'SEGUIR VIENDO', hint: 'P · ESC', primary: true,
              keys: ['p', 'Escape', 'Enter'],
              onClick: function () { self.resumeAudio(); g.requestPause(); } },
            { label: 'SALIR', hint: 'Q', keys: ['q'],
              onClick: function () { g.toMenu(); } }
          ]
        });
        return;
      }
      if (g.netRole) {
        lines.push('LA PARTIDA ESTÁ EN PAUSA PARA LOS DOS.');
        lines.push('REINICIAR TIENE QUE ACEPTARLO ' + g.nameFor(g.peerIdx()) + '.');
      } else if (g.playerCount === 2) {
        lines.push('REINICIAR EMPIEZA UNA PARTIDA NUEVA PARA LOS DOS.');
      }
      /* GUARDAR Y SALIR solo sale donde la partida se puede reconstruir
       * (js/guardado.js): en CACERÍA y en ONLINE no hay nada que guardar y un
       * botón que no fuera a funcionar es peor que no tenerlo. */
      /* Recién recuperada: lo primero es decir QUÉ partida es, que quien la
       * dejó a medias hace dos días no tiene por qué acordarse. */
      if (g.retomada) lines.unshift('SIGUES TU PARTIDA: ' + g.retomada + '.');
      var Gd = window.PM.Guardado;
      var sePuede = !!(Gd && Gd.puedeGuardar());
      if (sePuede) {
        lines.push('GUARDAR LA DEJA COMO ESTÁ PARA SEGUIRLA LUEGO, AQUÍ O EN OTRO APARATO.');
      }
      var botones = [
        { label: 'REANUDAR', hint: 'P · ESC', primary: true,
          keys: ['p', 'Escape', 'Enter'],
          onClick: function () { self.resumeAudio(); g.requestPause(); } },
        { label: 'REINICIAR', hint: 'R', keys: ['r'],
          onClick: function () {
            self.resumeAudio();
            if (g.netRole) g.requestVote('restart');
            else g.restartGame();
          } }
      ];
      if (sePuede) {
        botones.push({ label: 'GUARDAR', hint: 'G', keys: ['g'],
          onClick: function () {
            if (!Gd.guardarYSalir()) return;    // no se pudo: se sigue en pausa
            self.hidePrompt();
            self.showMenu();
          } });
      }
      botones.push({ label: 'SALIR', hint: 'Q', keys: ['q'],
        onClick: function () { g.toMenu(); } });
      /* cómo va la partida, lo primero */
      lines.unshift({ text: 'PUNTOS ' + fmtMonedas(g.score || 0) + ' · NIVEL ' + g.level +
        ' · ' + g.clockText(), big: true });
      this.showPrompt({
        title: 'PAUSA',
        arcade: true,
        tono: 'amarillo',
        lines: lines,
        status: g.flash ? g.flash.text : '',
        buttons: botones
      });
    },

    /* Textos de cada tipo de votación: rendirse / revancha / reiniciar */
    VOTE_TEXT: {
      surrender: {
        color: '#ff8c00', from: 'RENDIRSE', ask: '¿RENDIRSE?',
        mine: 'HAS PROPUESTO ABANDONAR LA PARTIDA.',
        theirs: ' QUIERE ABANDONAR LA PARTIDA.',
        extra: 'SI ACEPTAS, TERMINA PARA LOS DOS.',
        yes: 'SÍ, RENDIRSE', no: 'SEGUIR JUGANDO'
      },
      rematch: {
        color: '#ffff00', from: 'REVANCHA', ask: '¿REVANCHA?',
        mine: 'HAS PROPUESTO JUGAR OTRA PARTIDA.',
        theirs: ' QUIERE LA REVANCHA.',
        yes: 'SÍ, JUGAR', no: 'NO, GRACIAS'
      },
      restart: {
        color: '#ffff00', from: 'REINICIAR', ask: '¿REINICIAR?',
        mine: 'HAS PROPUESTO EMPEZAR LA PARTIDA DE NUEVO.',
        theirs: ' QUIERE EMPEZAR LA PARTIDA DE NUEVO.',
        extra: 'SE PIERDE LA PUNTUACIÓN DE ESTA PARTIDA.',
        yes: 'SÍ, REINICIAR', no: 'SEGUIR JUGANDO'
      }
    },

    showVotePrompt: function (vote) {
      var self = this;
      var g = window.PM.Game;
      var tx = this.VOTE_TEXT[vote.kind] || this.VOTE_TEXT.surrender;
      var peer = g.playerCount === 2 ? g.nameFor(g.peerIdx()) : '';

      if (vote.role === 'from') {
        this.showPrompt({
          title: tx.from,
          arcade: true,
          tono: vote.kind === 'surrender' ? 'naranja' : 'amarillo',
          lines: [tx.mine, 'TIENE QUE ACEPTARLO ' + (peer || 'EL OTRO JUGADOR') + '.'],
          status: this.voteStatusText(vote),
          buttons: []
        });
        return;
      }

      /* nos toca decidir (o confirmar, en local) */
      var lines;
      if (vote.local) {
        lines = (vote.kind === 'surrender' && g.playerCount === 1)
          ? ['LA PARTIDA TERMINA Y SE GUARDA LA PUNTUACIÓN.']
          : [tx.extra || tx.mine];
      } else {
        lines = [(peer || 'EL OTRO JUGADOR') + tx.theirs];
        if (tx.extra) lines.push(tx.extra);
      }
      this.showPrompt({
        title: tx.ask,
        arcade: true,
        tono: vote.kind === 'surrender' ? 'naranja' : 'amarillo',
        lines: lines,
        status: this.voteStatusText(vote),
        buttons: [
          { label: tx.yes, primary: true, hint: 'ENTER', keys: ['Enter'],
            onClick: function () { self.resumeAudio(); g.answerVote(true); } },
          { label: tx.no, hint: 'ESC', keys: ['Escape'],
            onClick: function () { g.answerVote(false); } }
        ]
      });
    },

    /* Bloque "lo que te llevas" del final de la partida: la experiencia
     * ganada con la barra del nivel de jugador y los logros conseguidos en
     * esta partida. Los puntos y el nivel del laberinto ya salen arriba, en
     * las líneas del panel. */
    buildRunSummary: function (s) {
      var box = document.createElement('div');
      box.className = 'resumen';

      var lvlRow = document.createElement('div');
      lvlRow.className = 'resumen-lvl';
      var subio = s.lvl > s.lvlAntes;
      lvlRow.textContent = subio
        ? ('¡SUBES AL NIVEL DE JUGADOR ' + s.lvl + '!')
        : ('NIVEL DE JUGADOR ' + s.lvl);
      if (subio) lvlRow.classList.add('sube');
      box.appendChild(lvlRow);

      var exp = document.createElement('div');
      exp.className = 'resumen-exp';
      exp.textContent = '+' + (s.exp || 0) + ' DE EXPERIENCIA · TE FALTAN ' +
        Math.max(0, (s.lvlPide || 0) - (s.lvlEn || 0)) +
        ' PARA EL NIVEL ' + (s.lvl + 1);
      box.appendChild(exp);

      // monedas de la TIENDA ganadas en esta partida (y retos del DAILY)
      if (typeof s.monedas === 'number') {
        var mon = document.createElement('div');
        mon.className = 'resumen-monedas';
        mon.textContent = s.monedas > 0
          ? ('+' + s.monedas + ' MONEDAS · TIENES ' + fmtMonedas(Math.max(0, s.saldo || 0)))
          : ('SIN MONEDAS: LA PARTIDA TIENE QUE DURAR UN MINUTO O LLEGAR A 1.000 PUNTOS · TIENES ' +
             fmtMonedas(Math.max(0, s.saldo || 0)));
        box.appendChild(mon);
      }

      var barra = document.createElement('div');
      barra.className = 'level-bar';
      var fill = document.createElement('div');
      fill.className = 'level-fill';
      fill.style.width = Math.round((s.lvlPct || 0) * 100) + '%';
      barra.appendChild(fill);
      box.appendChild(barra);

      var logros = s.logros || [];
      var tit = document.createElement('div');
      tit.className = 'resumen-tit';
      tit.textContent = logros.length
        ? ('LOGROS DE ESTA PARTIDA (' + logros.length + ')')
        : 'SIN LOGROS NUEVOS ESTA VEZ';
      box.appendChild(tit);

      logros.forEach(function (a) {
        var row = document.createElement('div');
        row.className = 'resumen-logro';
        var cv = document.createElement('canvas');
        cv.width = 18; cv.height = 18;
        var c = cv.getContext('2d');
        c.imageSmoothingEnabled = false;
        window.PM.Sprites.drawAchIcon(c, 9, 9, 9, window.PM.UI.logroDe(a), true);
        row.appendChild(cv);
        var nm = document.createElement('span');
        nm.style.color = a.color || '#ffff00';
        nm.textContent = a.name;
        row.appendChild(nm);
        var ds = document.createElement('small');
        ds.textContent = a.desc || '';
        row.appendChild(ds);
        box.appendChild(row);
      });

      return box;
    },

    /* Panel de PAC-MAN VS.: aquí lo primero es QUIÉN HA GANADO, que si no
     * la partida no se entiende: hay dos marcadores y no compiten entre sí. */
    versusLines: function () {
      var g = window.PM.Game;
      var V = window.PM.Versus;
      var gana = V.winner(g);
      var cazadores = V.hunters(g);
      /* Con un solo cazador gana él; con varios, el titular se lo lleva el
       * que más ha cazado, pero abajo salen todos con lo suyo: cada uno
       * tiene su marcador, así que el final tiene que decir quién hizo qué. */
      var mejor = V.topHunter(g);
      /* CACERÍA: el Pac-Man es la máquina. Si se quedó sin vidas, gana quien
       * más veces lo cazó; si despejó todas las rondas (o la partida acabó de
       * otra forma), gana él. */
      var caza = !!g.caza;
      var lines = [
        { text: gana === 'ghost'
            ? ('¡GANA ' + (mejor ? mejor.name : V.ghostName(g)) + '!')
            : (caza ? '¡GANA LA MÁQUINA!' : '¡GANAN LOS PAC-MAN!'),
          big: true },
        'PAC-MAN ' + (g.score || 0)
      ];
      for (var i = 0; i < cazadores.length; i++) {
        var c = cazadores[i];
        // las cazas salen de los puntos: así también cuadran en la pantalla
        // del invitado, al que solo le llegan los marcadores
        lines.push(c.name + ' ' + c.score + '  ·  ' +
          (c.catches === 1 ? '1 PAC-MAN CAZADO' : (c.catches + ' PAC-MAN CAZADOS')));
      }
      if (caza) {
        // rondas despejadas: las de antes de este nivel, y este si lo acabó
        var rondas = window.PM.Caza.ronda(g) + (g.dotsLeft <= 0 ? 1 : 0);
        lines.push('PAC-MAN DESPEJÓ ' + Math.min(rondas, CFG.CAZA.NIVELES) + ' DE ' +
          CFG.CAZA.NIVELES + ' RONDAS · CACERÍA NO CUENTA PARA EL TOP MUNDIAL');
      } else {
        lines.push('NIVEL ' + g.level + ' · PAC-MAN VS. NO CUENTA PARA EL TOP MUNDIAL');
      }
      return lines;
    },

    /* Panel de siempre: puntuación, récord y por qué no entra en el top */
    classicOverLines: function () {
      var g = window.PM.Game;
      /* viendo una repetición: el final es el suyo (js/replay.js) */
      if (g.replaying && window.PM.Replay && window.PM.Replay.finPrompt()) return;
      var lines = [{ text: 'PUNTUACIÓN ' + (g.score || 0), big: true }];
      // el equipo, sea de dos, de tres o de cuatro
      if (g.playerCount > 1) {
        var equipo = [];
        for (var q = 0; q < g.playerCount; q++) equipo.push(g.nameFor(q));
        lines.unshift(equipo.join('  +  '));
      }
      lines.push('RÉCORD ' + (g.highScore || 0) + ' · NIVEL ' + g.level);
      // tiempo del primer nivel, que es lo que corre en su clasificación
      if (g.lvl1Cs > 0 && window.PM.Ranking) {
        lines.push('NIVEL 1 EN ' + window.PM.Ranking.fmtTime(g.lvl1Cs) +
          (g.canTimeRecord() ? '' : ' · NO CUENTA PARA EL TOP MUNDIAL'));
      }
      // por qué esta partida no entra en el top mundial, si es el caso
      if (g.score > 0 && window.PM.Ranking && window.PM.Ranking.configured()) {
        if (g.rankPendiente) {
          lines.push('SIN CUENTA, ESTA PARTIDA NO ENTRA EN EL TOP MUNDIAL');
        } else if (g.missingRankingName()) {
          lines.push(g.playerCount > 1
            ? 'PARA ENTRAR EN EL TOP MUNDIAL, TODOS NECESITÁIS NOMBRE'
            : 'PON TU NOMBRE PARA ENTRAR EN EL TOP MUNDIAL');
        } else if (g.badRankingName()) {
          lines.push('ESE NOMBRE NO ENTRA EN EL TOP MUNDIAL: ELIGE OTRO');
        }
      }
      return lines;
    },

    /* El récord que no entra: se hizo sin cuenta. Sale ANTES del GAME OVER,
     * una vez por partida, con las dos puertas a mano. Si entra o crea la
     * cuenta desde aquí, la partida que esperaba se sube sola. */
    showAvisoSinCuenta: function () {
      var self = this;
      var g = window.PM.Game;
      g.rankAvisoVisto = true;
      function volver(entro) {
        if (entro && g.rankPendiente) {
          g.subirRankPendiente(function (err) {
            if (!err) g.setFlash('TU RÉCORD YA ESTÁ EN EL TOP MUNDIAL');
            self.showGameOverPrompt();
          });
          return;
        }
        self.showGameOverPrompt();
      }
      this.showPrompt({
        title: '¡NUEVO RÉCORD!',
        arcade: true,
        tono: 'amarillo',
        solid: true,
        lines: [
          { text: String(g.score || 0), big: true },
          'PERO NO VA A APARECER EN EL TOP MUNDIAL: PARA COLOCAR UN RÉCORD HAY QUE JUGAR CON CUENTA',
          'CREA TU CUENTA O ENTRA AHORA Y ESTA PARTIDA SE SUBE CON TU NOMBRE'
        ],
        buttons: [
          { label: 'CREAR CUENTA', primary: true, keys: ['Enter'], hint: 'ENTER',
            onClick: function () { self.showAccountPrompt('crear', volver); } },
          { label: 'YA TENGO CUENTA', onClick: function () { self.showAccountPrompt('entrar', volver); } },
          { label: 'SEGUIR SIN CUENTA', keys: ['Escape'], hint: 'ESC',
            onClick: function () { volver(false); } }
        ]
      });
    },

    showGameOverPrompt: function () {
      var self = this;
      var g = window.PM.Game;
      if (g.avisoSinCuenta && g.avisoSinCuenta() && !g.replaying) { this.showAvisoSinCuenta(); return; }
      var duo = (g.playerCount > 1);      // "otra partida" con la misma gente
      var versus = !!(g.isVersus && g.isVersus() && window.PM.Versus);
      /* CONTINUE?: el final de recreativa (17 sep 2026). Para las partidas
       * de siempre, con su resumen; PAC-MAN VS. y CACERÍA siguen con el
       * panel que dice quién ha ganado. */
      if (g.superv && window.PM.Superv) { this.showSupervFin(); return; }
      if (!versus && !g.caza && g.runSummary &&
          !(g.replaying && window.PM.Replay && window.PM.Replay.finPrompt)) {
        this.showGameOverArcade(duo);
        return;
      }
      var lines = versus ? this.versusLines() : this.classicOverLines();
      this.showPrompt({
        title: g.caza ? 'FIN DE LA CACERÍA' : versus ? 'FIN DE LA RONDA' : 'GAME OVER',
        color: '#ff0000',
        solid: true,
        lines: lines,
        summary: g.runSummary,
        status: g.flash ? g.flash.text : '',
        statusError: !!g.flash,
        buttons: [
          { label: duo ? 'OTRA PARTIDA' : 'JUGAR OTRA VEZ', primary: true,
            hint: 'R', keys: ['r', 'Enter'],
            onClick: function () {
              self.resumeAudio();
              if (g.netRole) g.requestVote('rematch');
              else g.restartGame();
            } },
          { label: 'MENÚ', hint: 'Q · ESC', keys: ['q', 'Escape'],
            onClick: function () { g.toMenu(); } }
        ]
      });
    },

    /* SUPERVIVENCIA: quién ha ganado y la clasificación */
    showSupervFin: function () {
      var self = this;
      var g = window.PM.Game, SV = window.PM.Superv;
      var s = g.superv, orden = SV.clasificacion(g);
      var gana = s.ganador;
      var titulo = gana >= 0 ? ('¡GANA ' + (g.rawName(gana) || ('J' + (gana + 1))) + '!')
        : (gana === -1 ? 'EMPATE' : 'FIN DE LA PARTIDA');
      this.showPrompt({
        title: titulo,
        arcade: true,
        tono: 'amarillo',
        status: g.flash ? g.flash.text : '',
        statusError: !!g.flash,
        custom: function (p) {
          var tabla = document.createElement('div');
          tabla.className = 'sv-tabla';
          for (var k = 0; k < orden.length; k++) {
            var i = orden[k];
            var fila = document.createElement('div');
            fila.className = 'sv-fila' + (i === gana ? ' gana' : '') + (i === g.localIdx || (!g.netRole && i === 0) ? ' yo' : '');
            fila.style.setProperty('--jc', g.colorFor(i));
            var pos = document.createElement('span');
            pos.className = 'sv-pos';
            pos.textContent = (k + 1) + 'º';
            var nom = document.createElement('span');
            nom.className = 'sv-nombre';
            nom.textContent = g.rawName(i) || ('J' + (i + 1));
            var ko = document.createElement('span');
            ko.className = 'sv-bajas';
            var n = (s.bajas && s.bajas[i]) || 0;
            ko.textContent = n + (n === 1 ? ' K.O.' : ' K.O.');
            fila.appendChild(pos); fila.appendChild(nom); fila.appendChild(ko);
            tabla.appendChild(fila);
          }
          p.appendChild(tabla);
        },
        buttons: [
          { label: 'OTRA PARTIDA', primary: true, hint: 'R', keys: ['r', 'Enter'],
            onClick: function () {
              self.resumeAudio();
              if (g.netRole) g.requestVote('rematch');
              else g.restartGame();
            } },
          { label: 'MENÚ', hint: 'ESC', keys: ['q', 'Escape'],
            onClick: function () { g.toMenu(); } }
        ]
      });
    },

    /* ------------------------------------------------------
     * GAME OVER · CONTINUE?
     *
     * Como el final de las máquinas: GAME OVER en rojo con interferencias,
     * tu Pac-Man muriendo en bucle, el recuento renglón a renglón (los puntos
     * suben contando, luego el récord, la experiencia y las monedas), cada
     * logro cae como un sello, y abajo la cuenta atrás de CONTINUE? junto a
     * INSERT COIN. La cuenta atrás no hace nada al llegar a cero: invita.
     *
     * El diálogo se rehace a menudo (syncPrompt), así que la animación va
     * solo la primera vez por partida: después sale ya contado.
     * ------------------------------------------------------ */
    showGameOverArcade: function (duo) {
      var self = this;
      var g = window.PM.Game;
      var s = g.runSummary;
      var anima = this.goVisto !== s && !this.menosMovimiento();
      this.goVisto = s;
      var mil = function (n) {
        return String(Math.max(0, Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      };

      /* por qué no entra en el TOP MUNDIAL, si es el caso (lo de siempre) */
      var avisos = (this.classicOverLines() || []).filter(function (l) {
        return typeof l === 'string' && /TOP MUNDIAL/.test(l);
      });

      this.showPrompt({
        title: 'GAME OVER',
        arcade: true,
        solid: true,
        status: g.flash ? g.flash.text : '',
        statusError: !!g.flash,
        custom: function (p) {
          var titulo = p.querySelector('.panel-title');
          if (titulo) titulo.classList.add('go-titulo');

          var bomb = document.createElement('div');
          bomb.className = 'go-bombillas';
          bomb.setAttribute('aria-hidden', 'true');
          p.insertBefore(bomb, p.firstChild);

          var muerte = document.createElement('canvas');
          muerte.className = 'go-muerte';
          muerte.width = 96; muerte.height = 96;
          muerte.setAttribute('aria-hidden', 'true');
          p.appendChild(muerte);
          self.goMuerte = muerte;

          if (g.playerCount > 1) {
            var eq = [];
            for (var q = 0; q < g.playerCount; q++) eq.push(g.nameFor(q));
            var equipo = document.createElement('div');
            equipo.className = 'go-equipo';
            equipo.textContent = eq.join('  +  ');
            p.appendChild(equipo);
          }
          /* DESATADO a uno con otro rol: que se lea que no contaba */
          if (g.practica) {
            var prac = document.createElement('div');
            prac.className = 'go-equipo go-practica';
            prac.textContent = 'PRÁCTICA CON ' + CFG.HAB.ROL_INFO[g.roles[0]].name +
              ' · NO CUENTA PARA RÉCORDS NI MAESTRÍAS';
            p.appendChild(prac);
          }

          var cuerpo = document.createElement('div');
          cuerpo.className = 'go-cuerpo';
          p.appendChild(cuerpo);

          var tabla = document.createElement('div');
          tabla.className = 'go-tabla';
          cuerpo.appendChild(tabla);
          var filas = [];
          var fila = function (clase, rotulo, valor, color, sub) {
            var f = document.createElement('div');
            f.className = 'go-fila ' + (clase || '');
            var k = document.createElement('span');
            k.textContent = rotulo;
            f.appendChild(k);
            var v = document.createElement('b');
            if (typeof valor === 'string') v.textContent = valor;
            else v.appendChild(valor);
            if (color) v.style.color = color;
            f.appendChild(v);
            if (sub) {
              var sb = document.createElement('small');
              sb.textContent = sub;
              f.appendChild(sb);
            }
            tabla.appendChild(f);
            filas.push(f);
            return v;
          };

          var pts = fila('grande', 'PUNTOS', anima ? '0' : mil(s.puntos));
          fila('', 'RÉCORD · NIVEL', mil(g.highScore) + ' · ' + (s.nivel || g.level));
          if (g.lvl1Cs > 0 && window.PM.Ranking) {
            fila('', 'NIVEL 1 EN', window.PM.Ranking.fmtTime(g.lvl1Cs), '',
              g.canTimeRecord() ? '' : 'NO CUENTA PARA EL TOP MUNDIAL');
          }
          var subio = s.lvl > s.lvlAntes;
          fila(subio ? 'sube' : '', 'EXPERIENCIA', '+' + mil(s.exp), '#00ffff',
            subio ? ('¡SUBES AL NIVEL DE JUGADOR ' + s.lvl + '!')
                  : ('NIVEL DE JUGADOR ' + s.lvl + ' · TE FALTAN ' +
                     mil(Math.max(0, (s.lvlPide || 0) - (s.lvlEn || 0))) + ' PARA EL ' + (s.lvl + 1)));
          if (typeof s.monedas === 'number') {
            var mon = document.createElement('span');
            mon.className = 'go-monedas';
            mon.appendChild(self.monedaEl());
            mon.appendChild(document.createTextNode(' +' + mil(s.monedas)));
            fila('', 'MONEDAS', mon, '#ffd23f', s.monedas > 0
              ? ('TIENES ' + fmtMonedas(Math.max(0, s.saldo || 0)))
              : ('UN MINUTO O 1.000 PUNTOS PARA GANAR · TIENES ' + fmtMonedas(Math.max(0, s.saldo || 0))));
          }
          avisos.forEach(function (a) {
            var d = document.createElement('div');
            d.className = 'go-aviso';
            d.textContent = a;
            tabla.appendChild(d);
            filas.push(d);
          });

          /* los logros, como sellos */
          var sellos = document.createElement('div');
          sellos.className = 'go-sellos';
          cuerpo.appendChild(sellos);
          var logros = s.logros || [];
          var lista = [];
          logros.slice(0, 4).forEach(function (a, i) {
            var st = document.createElement('div');
            st.className = 'go-sello';
            st.style.color = a.color || '#ffb852';
            st.style.setProperty('--giro', ((i % 2 ? 7 : -9) + i) + 'deg');
            var cv = document.createElement('canvas');
            cv.width = 20; cv.height = 20;
            var c = cv.getContext('2d');
            c.imageSmoothingEnabled = false;
            try { window.PM.Sprites.drawAchIcon(c, 10, 10, 10, window.PM.UI.logroDe(a), true); } catch (e) { }
            st.appendChild(cv);
            var tx = document.createElement('span');
            tx.textContent = 'LOGRO · ' + a.name;
            st.appendChild(tx);
            sellos.appendChild(st);
            lista.push(st);
          });
          if (logros.length > 4) {
            var mas = document.createElement('div');
            mas.className = 'go-sello-mas';
            mas.textContent = '+' + (logros.length - 4) + ' LOGROS MÁS';
            sellos.appendChild(mas);
            lista.push(mas);
          }

          /* CONTINUE? */
          /* la fila de los botones (la cuenta atrás ya pasó: era el CONTINUE?) */
          var cont = document.createElement('div');
          cont.className = 'go-continue';
          p.appendChild(cont);
          self.goCont = cont;

          /* el recuento */
          var todo = filas.concat(lista);
          if (!anima) {
            todo.forEach(function (f) { f.classList.add('on'); });
          } else {
            var t0 = 350;
            filas.forEach(function (f, i) {
              setTimeout(function () {
                f.classList.add('on');
                if (i === 0) self.contarGo(pts, s.puntos, 1300);
              }, t0 + (i === 0 ? 0 : 1500 + (i - 1) * 550));
            });
            var tl = t0 + 1500 + filas.length * 550;
            lista.forEach(function (st, i) {
              setTimeout(function () { st.classList.add('on'); }, tl + i * 450);
            });
            /* pulsar en cualquier sitio lo acaba de golpe */
            p.addEventListener('pointerdown', function () {
              todo.forEach(function (f) { f.classList.add('on'); });
              pts.textContent = mil(s.puntos);
              self.goContando = false;
            }, { once: true });
          }
          self.animarGoMuerte();
        },
        buttons: [
          { label: 'INSERT COIN', primary: true,
            hint: (duo ? 'OTRA PARTIDA' : 'JUGAR OTRA VEZ') + ' · R', keys: ['r', 'Enter'],
            onClick: function () {
              self.resumeAudio();
              if (g.netRole) g.requestVote('rematch');
              else g.restartGame();
            } },
          { label: 'MENÚ', hint: 'ESC', keys: ['q', 'Escape'],
            onClick: function () { g.toMenu(); } }
        ]
      });

      /* los botones, al lado de CONTINUE? (y el aviso de estado debajo) */
      var p = this.els.prompt;
      var btns = p.querySelector('.prompt-btns');
      if (btns && this.goCont) this.goCont.appendChild(btns);
      var estado = p.querySelector('.lobby-status');
      if (estado) p.appendChild(estado);
    },

    /* ------------------------------------------------------
     * CONTINUE? (CFG.CONTINUAR)
     *
     * Sin vidas: 10 segundos para pagar 1.000 monedas y seguir con 1 vida en
     * el mismo nivel. JUGAR OTRA VEZ no se puede pulsar hasta que se acaba la
     * cuenta atrás (entonces sale el GAME OVER). MENÚ sí: irse es irse.
     * ------------------------------------------------------ */
    showContinuePrompt: function () {
      var self = this;
      var g = window.PM.Game, Tn = window.PM.Tienda, C = CFG.CONTINUAR;
      var llega = !!(Tn && Tn.llegaContinuar());
      var mil = function (n) {
        return String(Math.max(0, Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      };
      this.showPrompt({
        title: 'CONTINUE?',
        arcade: true,
        solid: true,
        status: g.flash ? g.flash.text : '',
        statusError: !!g.flash,
        custom: function (p) {
          var titulo = p.querySelector('.panel-title');
          if (titulo) titulo.classList.add('go-titulo');
          var bomb = document.createElement('div');
          bomb.className = 'go-bombillas';
          bomb.setAttribute('aria-hidden', 'true');
          p.insertBefore(bomb, p.firstChild);

          var reloj = document.createElement('div');
          reloj.className = 'go-reloj cont-reloj';
          reloj.innerHTML = '<svg viewBox="0 0 110 110" aria-hidden="true">' +
            '<circle cx="55" cy="55" r="48" fill="none" stroke="#2a0a1a" stroke-width="8"/>' +
            '<circle class="go-aro" cx="55" cy="55" r="48" fill="none" stroke="#ff2a2a" stroke-width="8" stroke-dasharray="301.6" stroke-dashoffset="0"/></svg>';
          var num = document.createElement('b');
          reloj.appendChild(num);
          p.appendChild(reloj);
          self.contReloj = { el: reloj, num: num, aro: reloj.querySelector ? reloj.querySelector('.go-aro') : null };

          var marcador = document.createElement('div');
          marcador.className = 'cont-marcador';
          marcador.textContent = 'PUNTOS ' + mil(g.score) + ' · NIVEL ' + g.level;
          p.appendChild(marcador);

          var oferta = document.createElement('div');
          oferta.className = 'cont-oferta';
          oferta.appendChild(document.createTextNode(C.VIDAS + (C.VIDAS === 1 ? ' VIDA MÁS' : ' VIDAS MÁS') + ' POR '));
          oferta.appendChild(self.precioEl(C.PRECIO));
          p.appendChild(oferta);

          var saldo = document.createElement('div');
          saldo.className = 'cont-saldo' + (llega ? '' : ' falta');
          saldo.textContent = llega
            ? ('TIENES ' + fmtMonedas(Tn.saldo()) + ' · TE QUEDAN ' + fmtMonedas(Tn.saldo() - C.PRECIO))
            : ('TIENES ' + fmtMonedas(Tn ? Tn.saldo() : 0) + ' · TE FALTAN ' + fmtMonedas(C.PRECIO - (Tn ? Tn.saldo() : 0)));
          p.appendChild(saldo);

          if (g.netRole) {
            var nota = document.createElement('div');
            nota.className = 'cont-nota';
            nota.textContent = g.contPedido ? 'ESPERANDO AL ANFITRIÓN...'
              : 'CADA UNO PAGA LO SUYO · QUIEN NO PAGUE SE QUEDA MIRANDO';
            p.appendChild(nota);
          }
        },
        buttons: [
          { label: 'CONTINUAR', primary: true, hint: fmtMonedas(C.PRECIO) + ' · C', keys: ['c', 'Enter'],
            onClick: function () { self.resumeAudio(); g.pedirContinuar(); } },
          /* Se puede empezar otra sin esperar. En party no: los demás pueden
           * estar pagando, y la revancha se pide en el GAME OVER. */
          { label: 'JUGAR OTRA VEZ',
            hint: g.netRole ? ('EN ' + Math.max(0, Math.ceil((g.contTicks || 0) / 60))) : 'R',
            keys: g.netRole ? [] : ['r'],
            onClick: function () { self.resumeAudio(); g.otraDesdeContinue(); } },
          { label: 'MENÚ', hint: 'ESC', keys: ['q', 'Escape'],
            onClick: function () { g.toMenu(); } }
        ]
      });
      var btns = this.els.prompt.querySelectorAll('.prompt-btns .btn');
      if (btns && btns.length >= 2) {
        this.contBtnPagar = btns[0];
        this.contBtnOtra = btns[1];
        btns[0].disabled = !llega || !!g.contPedido || !g.contDisponible();
        if (g.netRole) {
          btns[1].disabled = true;
          btns[1].classList.add('cont-bloqueado');
        }
        if (btns[0].disabled && btns[2]) { try { btns[2].focus(); } catch (e) { } }
      }
      this.tickContinue();
    },

    /* ------------------------------------------------------
     * REVIVIR (CFG.REVIVIR): nivel acabado con alguien fuera. Quien está
     * fuera puede pagar el CONTINUAR para volver en el nivel siguiente; los
     * demás esperan, como mucho, la cuenta atrás.
     * ------------------------------------------------------ */
    showRevivirPrompt: function () {
      var self = this;
      var g = window.PM.Game, Tn = window.PM.Tienda, C = CFG.CONTINUAR;
      var llega = !!(Tn && Tn.llegaContinuar());
      var puedo = g.contQuien() !== null;
      var fuera = [];
      for (var i = 0; i < g.pacs.length; i++) {
        if (g.pacs[i].out && !g.pacs[i].bot) fuera.push(i);
      }
      var botones = [];
      if (puedo) {
        botones.push({ label: 'REVIVIR', primary: true, hint: fmtMonedas(C.PRECIO) + ' · C', keys: ['c', 'Enter'],
          onClick: function () { self.resumeAudio(); g.pedirContinuar(); } });
      }
      if (!g.netRole) {
        botones.push({ label: 'SIGUIENTE NIVEL', hint: 'S', keys: ['s'],
          onClick: function () { self.resumeAudio(); g.saltarRevivir(); } });
      }
      botones.push({ label: 'MENÚ', hint: 'ESC', keys: ['q', 'Escape'],
        onClick: function () { g.toMenu(); } });

      this.showPrompt({
        title: 'REVIVIR',
        arcade: true,
        tono: 'cian',
        solid: true,
        status: g.flash ? g.flash.text : '',
        statusError: !!g.flash,
        custom: function (p) {
          var titulo = p.querySelector('.panel-title');
          if (titulo) titulo.classList.add('go-titulo', 'rev-titulo');
          var bomb = document.createElement('div');
          bomb.className = 'go-bombillas';
          bomb.setAttribute('aria-hidden', 'true');
          p.insertBefore(bomb, p.firstChild);

          var sub = document.createElement('div');
          sub.className = 'cont-marcador';
          sub.textContent = 'NIVEL ' + g.level + ' SUPERADO · PUNTOS ' + fmtMonedas(g.score);
          p.appendChild(sub);

          var reloj = document.createElement('div');
          reloj.className = 'go-reloj cont-reloj rev-reloj';
          reloj.innerHTML = '<svg viewBox="0 0 110 110" aria-hidden="true">' +
            '<circle cx="55" cy="55" r="48" fill="none" stroke="#0a2a2a" stroke-width="8"/>' +
            '<circle class="go-aro" cx="55" cy="55" r="48" fill="none" stroke="#00ffff" stroke-width="8" stroke-dasharray="301.6" stroke-dashoffset="0"/></svg>';
          var num = document.createElement('b');
          reloj.appendChild(num);
          p.appendChild(reloj);
          self.contReloj = { el: reloj, num: num, aro: reloj.querySelector ? reloj.querySelector('.go-aro') : null };

          var quienes = document.createElement('div');
          quienes.className = 'rev-quienes';
          fuera.forEach(function (k) {
            var n = document.createElement('span');
            n.style.color = g.colorFor(k);
            n.textContent = g.hudNameFor(k);
            quienes.appendChild(n);
          });
          var q2 = document.createElement('small');
          q2.textContent = fuera.length === 1 ? 'SE QUEDÓ SIN VIDAS' : 'SE QUEDARON SIN VIDAS';
          quienes.appendChild(q2);
          p.appendChild(quienes);

          if (puedo) {
            var oferta = document.createElement('div');
            oferta.className = 'cont-oferta';
            oferta.appendChild(document.createTextNode('VUELVE CON ' + CFG.REVIVIR.VIDAS +
              (CFG.REVIVIR.VIDAS === 1 ? ' VIDA' : ' VIDAS') + ' POR '));
            oferta.appendChild(self.precioEl(C.PRECIO));
            p.appendChild(oferta);
            var saldo = document.createElement('div');
            saldo.className = 'cont-saldo' + (llega ? '' : ' falta');
            saldo.textContent = llega
              ? ('TIENES ' + fmtMonedas(Tn.saldo()) + ' · TE QUEDAN ' + fmtMonedas(Tn.saldo() - C.PRECIO))
              : ('TIENES ' + fmtMonedas(Tn ? Tn.saldo() : 0) + ' · TE FALTAN ' + fmtMonedas(C.PRECIO - (Tn ? Tn.saldo() : 0)));
            p.appendChild(saldo);
          }
          if (g.netRole) {
            var nota = document.createElement('div');
            nota.className = 'cont-nota';
            nota.textContent = g.contPedido ? 'ESPERANDO AL ANFITRIÓN...'
              : (puedo ? 'SI NO PAGAS, SIGUES MIRANDO' : 'ESPERANDO A QUE TUS COMPAÑEROS DECIDAN');
            p.appendChild(nota);
          }
        },
        buttons: botones
      });
      if (puedo) {
        var btns = this.els.prompt.querySelectorAll('.prompt-btns .btn');
        if (btns && btns[0]) btns[0].disabled = !llega || !!g.contPedido;
      }
      this.contBtnOtra = null;
      this.tickContinue();
    },

    /* Cada segundo: la cuenta atrás y el candado de JUGAR OTRA VEZ */
    tickContinue: function () {
      var g = window.PM.Game;
      if (!this.promptOpen || (g.state !== 'CONTINUE' && g.state !== 'REVIVIR') || !this.contReloj) return;
      var seg = Math.max(0, Math.ceil((g.contTicks || 0) / 60));
      this.contReloj.num.textContent = String(seg);
      if (this.contReloj.aro) {
        this.contReloj.aro.setAttribute('stroke-dashoffset',
          String(301.6 * (1 - (g.contTicks || 0) / CFG.CONTINUAR.TICKS)));
      }
      if (this.contBtnOtra && this.contBtnOtra.disabled) {
        var k = this.contBtnOtra.querySelector && this.contBtnOtra.querySelector('.btn-key');
        if (k) k.textContent = 'EN ' + seg;
      }
    },

    /* En medio de la partida (party o dúo con vidas propias): te has quedado
     * sin vidas y los demás siguen. Un aviso pequeño abajo, sin parar nada. */
    refreshContMini: function () {
      var g = window.PM.Game, Tn = window.PM.Tienda;
      var ver = !!(g.inGame() && g.state !== 'CONTINUE' && !this.promptOpen &&
                   g.contDisponible && g.contDisponible());
      if (!ver) {
        if (this.contMini && this.contMiniOn) {
          this.contMini.style.display = 'none';
          this.contMiniOn = false;
        }
        return;
      }
      var self = this;
      if (!this.contMini) {
        var d = document.createElement('div');
        d.id = 'contMini';
        var txt = document.createElement('span');
        txt.className = 'cont-mini-txt';
        d.appendChild(txt);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-primary cont-mini-btn';
        b.addEventListener('click', function () { self.resumeAudio(); g.pedirContinuar(); });
        d.appendChild(b);
        document.body.appendChild(d);
        this.contMini = d;
        this.contMiniTxt = txt;
        this.contMiniBtn = b;
      }
      var i = g.netRole ? g.localIdx : 0;
      var hasta = g.contHasta[i] || 0;
      if (!g.netRole) {
        for (var k = 0; k < g.pacs.length; k++) hasta = Math.max(hasta, g.contHasta[k] || 0);
      }
      var seg = Math.max(0, Math.ceil((hasta - g.tick) / 60));
      var llega = !!(Tn && Tn.llegaContinuar());
      var texto = g.contPedido ? 'ESPERANDO...' : ('SIN VIDAS · ' + seg + ' S PARA VOLVER');
      var boton = llega ? ('CONTINUAR · ' + fmtMonedas(CFG.CONTINUAR.PRECIO)) :
        ('TE FALTAN ' + fmtMonedas(CFG.CONTINUAR.PRECIO - (Tn ? Tn.saldo() : 0)));
      if (this.contMiniTxt.textContent !== texto) this.contMiniTxt.textContent = texto;
      if (this.contMiniBtn.textContent !== boton) this.contMiniBtn.textContent = boton;
      this.contMiniBtn.disabled = !llega || !!g.contPedido;
      if (!this.contMiniOn) {
        this.contMini.style.display = 'flex';
        this.contMiniOn = true;
      }
    },

    /* los puntos subiendo, como el contador de la máquina */
    contarGo: function (el, hasta, ms) {
      var self = this, raf = window.requestAnimationFrame;
      var mil = function (n) {
        return String(Math.max(0, Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      };
      if (!raf) { el.textContent = mil(hasta); return; }
      var t0 = Date.now();
      this.goContando = true;
      (function paso() {
        if (!self.goContando) return;
        var k = Math.min(1, (Date.now() - t0) / ms);
        el.textContent = mil(hasta * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf(paso); else self.goContando = false;
      })();
    },

    /* tu Pac-Man muriendo en bucle bajo el título, con tu skin y tu color */
    animarGoMuerte: function () {
      var self = this, raf = window.requestAnimationFrame;
      if (!raf || this.goMuerteAnim) return;
      this.goMuerteAnim = true;
      var t0 = Date.now();
      /* arranca en el siguiente fotograma: al montarse, el diálogo aún no
       * cuenta como abierto */
      raf(function paso() {
        var cv = self.goMuerte;
        if (!self.promptOpen || !cv || !cv.isConnected) { self.goMuerteAnim = false; return; }
        var g = window.PM.Game, Sp = window.PM.Sprites;
        var i = g.localIdx > 0 ? g.localIdx : 0;
        var color = '#ffff00', skin = 'clasico';
        try { color = g.colorFor(i) || color; skin = g.skinFor(i) || skin; } catch (e) { /* lo de siempre */ }
        var t = ((Date.now() - t0) / 1000) % 2.6;
        var c = cv.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, cv.width, cv.height);
        c.imageSmoothingEnabled = false;
        c.setTransform(cv.width / 24, 0, 0, cv.width / 24, 0, 0);
        try {
          if (t < 0.5) Sp.drawPacman(c, 12, 12, 3, 1, color, skin, {});
          else if (t < 2) {
            var d = (t - 0.5) / 1.5;
            if (skin !== 'clasico' && Sp.drawSkinDeath) Sp.drawSkinDeath(c, 12, 12, d, color, skin, 3);
            else Sp.drawPacmanDeath(c, 12, 12, d, color);
          }
        } catch (e) { /* un dibujo raro no rompe el final */ }
        c.setTransform(1, 0, 0, 1, 0, 0);
        raf(paso);
      });
    },

    /* Cruceta de dirección. En un jugador y online hay una sola
     * (centrada) que controla al jugador local; en dos jugadores
     * locales hay dos, en las esquinas: izquierda J1, derecha J2. */
    buildDpads: function () {
      this.dpad1 = this.makeDpad('dpad1', 0);
      this.dpad2 = this.makeDpad('dpad2', 1);
      this.buildHabBar();
    },

    /* ------------------------------------------------------
     * Modo DESATADO: la barra de Q/W/E/R
     *
     * Va en el DOM y no en el lienzo porque la fila de abajo del lienzo ya
     * está llena (vidas, cronómetro y frutas) y porque así el mismo trozo
     * sirve de dos cosas: enseña la recarga en el ordenador y se pulsa con
     * el dedo en el móvil. Ver js/habilidades.js.
     * ------------------------------------------------------ */
    buildHabBar: function () {
      var bar = document.createElement('div');
      bar.id = 'habBar';
      bar.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
      /* Un grupo por jugador. En solo y en online solo se usa el primero; con
       * dos en el mismo teclado se encienden los dos, cada uno con SUS teclas
       * (CFG.HAB.KEYS_2P) y con la recarga de SU jugador. Se montan los dos
       * siempre porque montarlos cuesta una vez y encenderlos cuesta nada. */
      this.habGroups = [];
      for (var gi = 0; gi < 2; gi++) {
        var grupo = this.buildHabGroup(gi);
        bar.appendChild(grupo.caja);
        this.habGroups.push(grupo);
      }
      /* Y las de los COMPAÑEROS, en pequeño y sin botones. Saber si al de al
       * lado le queda el GRITO cambia lo que haces tú: si va a soltarlo, te
       * guardas la Q y aprovechas el modo azul. Sin esto había que preguntar
       * por voz o adivinarlo.
       *
       * No hace falta pedir nada por red: el uso ajeno ya llega (por eso
       * suenan los poderes de los demás) y Hab.evento lo apunta en la recarga
       * de su dueño, así que el número ya estaba en esta máquina; solo no se
       * enseñaba. Tres filas como mucho, que son los tres compañeros de una
       * party de cuatro. */
      this.habOtros = [];
      for (var oi = 0; oi < 3; oi++) {
        var otro = this.buildHabOtro();
        bar.appendChild(otro.caja);
        this.habOtros.push(otro);
      }
      /* Dentro del ESCENARIO, no del body: así queda pegada bajo el laberinto
       * y en la misma mirada que la fila de vidas y frutas. Con el ratón, mirar
       * una recarga ya no obliga a apartar los ojos de la partida.
       *
       * En táctil no: ahí abajo manda la cruceta —que va centrada— y la barra
       * se queda flotando en su esquina, donde llega el otro pulgar. */
      bar.classList.toggle('fija', !!this.touchDevice);
      var stage = document.getElementById('stage');
      (stage || document.body).appendChild(bar);
      this.habBar = bar;
    },

    /* Un grupo de poderes. Se montan cuatro botones aunque quien lleva un
     * fantasma solo use dos: los que sobran se esconden al refrescar, que sale
     * más barato que rehacer el DOM cada vez que cambia el reparto. */
    buildHabGroup: function (gi) {
      var self = this;
      var caja = document.createElement('div');
      caja.className = 'hab-grupo';

      /* De quién es esta fila. Solo se ve con dos en el mismo teclado, que es
       * cuando hay dos filas y hace falta saber cuál mirar. */
      var quien = document.createElement('span');
      quien.className = 'hab-quien';
      quien.textContent = 'J' + (gi + 1);
      quien.style.display = 'none';   // solo con dos en el mismo teclado
      caja.appendChild(quien);

      var btns = [];
      CFG.HAB.LIST.forEach(function (h, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'hab-b';
        b.setAttribute('aria-label', h.name);
        /* el relleno es un hijo con altura variable: sube como un vaso que
         * se llena, y a tope significa "lista" */
        var fill = document.createElement('span');
        fill.className = 'hab-fill';
        b.appendChild(fill);
        var lab = document.createElement('span');
        lab.className = 'hab-key';
        lab.textContent = h.key;
        b.appendChild(lab);
        var nom = document.createElement('small');
        nom.className = 'hab-name';
        nom.textContent = h.name;
        b.appendChild(nom);
        /* Los segundos que faltan. Van DONDE EL NOMBRE y se turnan con él:
         * son dos cosas que nunca hacen falta a la vez —recargando quieres
         * el número, cargada quieres saber cuál es— y en dos casillas
         * distintas el botón se llenaría de letra pequeña. La barra sigue
         * estando: dice de un vistazo cuánto queda, y el número dice
         * cuánto exactamente, que es lo que hace falta para decidir si
         * esperas o tiras de otra. */
        var secs = document.createElement('small');
        secs.className = 'hab-secs';
        b.appendChild(secs);
        b.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          self.resumeAudio();
          var g = window.PM.Game;
          if (!g.hab || !window.PM.Hab) return;
          /* las que se pueden MANTENER salen al soltar: el dedo se queda
           * con el botón aunque resbale fuera */
          try { b.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura */ }
          window.PM.Hab.apretar(g, self.habIdxDe(gi), k, false);
        });
        var soltarBtn = function () {
          var g = window.PM.Game;
          if (!g.hab || !window.PM.Hab) return;
          window.PM.Hab.soltar(g, self.habIdxDe(gi), k);
        };
        b.addEventListener('pointerup', soltarBtn);
        b.addEventListener('pointercancel', function () {
          if (window.PM.Hab) window.PM.Hab.cancelarMant();
        });
        caja.appendChild(b);
        btns.push({ b: b, fill: fill, key: lab, name: nom, secs: secs,
                    ultimo: -1, listo: null, tecla: h.key, nombre: h.name,
                    resta: -1, visible: true });
      });
      return { caja: caja, quien: quien, btns: btns, on: true };
    },

    /* Una fila de compañero: su nombre y cuatro casillas chatas, una por
     * poder. Se montan las cuatro aunque quien lleva un fantasma solo use
     * dos; las que sobran se esconden al refrescar, igual que en la barra
     * grande. No son botones: los poderes de otro no se pulsan desde aquí. */
    buildHabOtro: function () {
      var caja = document.createElement('div');
      caja.className = 'hab-otro';
      caja.style.display = 'none';

      var nom = document.createElement('span');
      nom.className = 'hab-otro-nom';
      caja.appendChild(nom);

      var celdas = [];
      for (var k = 0; k < CFG.HAB.LIST.length; k++) {
        var c = document.createElement('span');
        c.className = 'hab-mini';
        var fill = document.createElement('i');
        fill.className = 'hab-mini-fill';
        c.appendChild(fill);
        var txt = document.createElement('b');
        txt.className = 'hab-mini-txt';
        c.appendChild(txt);
        caja.appendChild(c);
        celdas.push({ c: c, fill: fill, txt: txt,
                      ultimo: -1, listo: null, texto: null, visible: true });
      }
      return { caja: caja, nom: nom, celdas: celdas,
               on: false, quien: -1, color: '', nombre: '' };
    },

    /* Qué jugador maneja el grupo `gi`. Con dos en el mismo teclado, cada
     * grupo es de su jugador; en solo y en online solo hay uno y es el tuyo
     * (que en online no tiene por qué ser el 0). */
    habIdxDe: function (gi) {
      var g = window.PM.Game;
      return (g.playerCount === 2 && !g.netRole) ? gi : g.localIdx;
    },

    /* Le cuenta al escenario que la barra está puesta y cuánto ocupa.
     *
     * Hace falta porque hay cosas ANCLADAS AL FONDO del escenario —el chat de
     * las salas online (#chatBox, bottom: 8px)— y el escenario ya no es solo
     * el lienzo: si la barra está debajo, el chat se plantaría encima de ella.
     * Con la altura en una variable de CSS, el chat se sube justo lo que mide.
     * En táctil la barra flota, así que no ocupa y la variable vuelve a cero. */
    marcarHabBar: function () {
      var st = document.getElementById('stage');
      if (!st || !this.habBar) return;
      var enFlujo = this.habBarOn && !this.habBar.classList.contains('fija');
      st.classList.toggle('con-hab', !!enFlujo);
      st.style.setProperty('--habH',
        enFlujo ? (this.habBar.offsetHeight + 6) + 'px' : '0px');
    },

    /* Refresco por fotograma (lo llama Game.render). Solo toca el DOM cuando
     * el número cambia de verdad: son 60 vueltas por segundo y escribir
     * estilos a ciegas en cada una se nota en un móvil modesto. */
    refreshHabBar: function () {
      var g = window.PM.Game;
      var A = window.PM.Hab;
      if (!this.habBar || !this.habGroups) return;
      var ver = !!(g.hab && A && !g.isSpec() && g.inGame() &&
                   g.state !== 'GAME_OVER' && !this.promptOpen);
      /* Encenderla o apagarla cambia lo que mide el escenario (va bajo el
       * lienzo y en el flujo), así que hay que rehacer el encaje. Solo cuando
       * cambia de verdad: esto se llama 60 veces por segundo. */
      if (ver !== this.habBarOn) {
        this.habBarOn = ver;
        this.habBar.classList.toggle('on', ver);
        this.marcarHabBar();
        this.fitCanvas();
      }
      if (!ver) return;
      /* Dos en el mismo teclado: dos grupos, cada uno con su etiqueta. Esto se
       * llama 60 veces por segundo, así que solo se toca el DOM cuando cambia
       * de verdad —y encender o apagar un grupo cambia lo que mide el
       * escenario, que obliga a rehacer el encaje del lienzo. */
      var dual = (g.playerCount === 2 && !g.netRole);
      var gi, grupo;
      if (dual !== this.habDual) {
        this.habDual = dual;
        for (gi = 0; gi < this.habGroups.length; gi++) {
          this.habGroups[gi].quien.style.display = dual ? '' : 'none';
        }
      }
      for (gi = 0; gi < this.habGroups.length; gi++) {
        grupo = this.habGroups[gi];
        var activo = (gi === 0) || dual;
        if (activo !== grupo.on) {
          grupo.on = activo;
          grupo.caja.style.display = activo ? '' : 'none';
          this.marcarHabBar();
          this.fitCanvas();
        }
        if (!activo) continue;
        var idx = this.habIdxDe(gi);
        /* El color de la barra es el del ROL que lleva: el Tanque en naranja,
         * el Soporte en cian, el Mago en violeta y el Asesino en rosa (y quien
         * lleva un fantasma, el de su fantasma). Así no hay que leer nada para
         * saber de quién es la fila. */
        var colRol = this.colorHabDe(g, A, idx);
        if (colRol !== grupo.color) {
          grupo.color = colRol;
          grupo.caja.style.setProperty('--hb', colRol);
        }
        /* Quien lleva un fantasma tiene otra lista (dos poderes en vez de
         * cuatro) y hasta otros nombres, así que las etiquetas se refrescan
         * aquí en vez de escribirse al montar: en PAC-MAN VS. el reparto de
         * fantasmas se decide después de construir la barra. */
        var lista = A.listaDe(g, idx);
        var teclas = dual ? CFG.HAB.KEYS_2P[gi] : null;
        for (var k = 0; k < grupo.btns.length; k++) {
          var o = grupo.btns[k];
          var h = lista[k];
          var visible = !!h;
          if (visible !== o.visible) {
            o.visible = visible;
            o.b.style.display = visible ? '' : 'none';
          }
          if (!visible) continue;
          var tecla = teclas ? teclas[k] : h.key;
          if (tecla !== o.tecla) { o.tecla = tecla; o.key.textContent = tecla; }
          if (h.name !== o.nombre) {
            o.nombre = h.name;
            o.name.textContent = h.name;
            o.b.setAttribute('aria-label', h.name);
          }
          var pct = Math.round(A.carga(g, idx, k) * 100);
          if (pct !== o.ultimo) {
            o.fill.style.height = pct + '%';
            o.ultimo = pct;
          }
          var listo = (pct >= 100);
          if (listo !== o.listo) {
            o.b.classList.toggle('listo', listo);
            o.listo = listo;
          }
          /* Los segundos que faltan. Se escriben solo cuando cambia el
           * número —una vez por segundo, no sesenta— y la clase 'contando'
           * es la que aparta el nombre del poder para dejarles el sitio. */
          var resta = A.restan(idx, k);
          if (resta !== o.resta) {
            o.resta = resta;
            o.secs.textContent = resta > 0 ? resta : '';
            o.b.classList.toggle('contando', resta > 0);
          }
        }
        /* Lo que está ENCENDIDO ahora mismo se marca aparte: recargando y
         * encendida son cosas distintas y en la misma casilla se confundirían.
         * Del fantasma se encienden sus dos; de Pac-Man, solo el turbo (el
         * mordisco y el flash duran un parpadeo y no hay nada que marcar). */
        /* vale para todos los roles: A.activa sabe cuál dura y cuál no */
        for (var ka = 0; ka < grupo.btns.length && ka < lista.length; ka++) {
          var on = A.activa(g, idx, ka);
          if (on !== grupo.btns[ka].activa) {
            grupo.btns[ka].activa = on;
            grupo.btns[ka].b.classList.toggle('activa', on);
          }
        }
      }
      this.refreshHabOtros(g, A, dual);
    },

    /* Las recargas de los COMPAÑEROS. "Compañero" es todo el que juega y no
     * lleva esta máquina: con dos en el mismo teclado no hay ninguno (los dos
     * ya tienen su fila grande) y en online son todos menos el tuyo.
     *
     * Al mirón no se le enseña nada porque a él ya se le apaga la barra
     * entera un poco más arriba; el día que se le encienda, esto le sirve
     * tal cual y sin tocar nada. */
    refreshHabOtros: function (g, A, dual) {
      if (!this.habOtros) return;
      var libres = [], i;
      if (!dual) {
        for (i = 0; i < g.playerCount && libres.length < this.habOtros.length; i++) {
          if (i !== g.localIdx) libres.push(i);
        }
      }
      for (var oi = 0; oi < this.habOtros.length; oi++) {
        var fila = this.habOtros[oi];
        var quien = (oi < libres.length) ? libres[oi] : -1;
        var on = (quien >= 0);
        /* Encender o apagar una fila cambia lo que mide la barra, y la barra
         * empuja al lienzo: hay que rehacer el encaje, pero SOLO cuando pasa
         * de verdad (esto se llama sesenta veces por segundo). */
        if (on !== fila.on) {
          fila.on = on;
          fila.caja.style.display = on ? '' : 'none';
          this.marcarHabBar();
          this.fitCanvas();
        }
        if (!on) continue;
        if (quien !== fila.quien) { fila.quien = quien; fila.nombre = ''; fila.color = ''; }
        /* El nombre va de SU color, que es el mismo con el que se le ve en el
         * laberinto: con cuatro jugadores es lo único que hace la fila
         * reconocible de un vistazo. */
        var nombre = g.nameFor(quien), color = g.colorFor(quien);
        if (nombre !== fila.nombre) { fila.nombre = nombre; fila.nom.textContent = nombre; }
        if (color !== fila.color) { fila.color = color; fila.nom.style.color = color; }
        var colOtro = this.colorHabDe(g, A, quien);
        if (colOtro !== fila.colRol) {
          fila.colRol = colOtro;
          fila.caja.style.setProperty('--hb', colOtro);
        }

        var lista = A.listaDe(g, quien);
        for (var k = 0; k < fila.celdas.length; k++) {
          var c = fila.celdas[k];
          var h = lista[k];
          var visible = !!h;
          if (visible !== c.visible) {
            c.visible = visible;
            c.c.style.display = visible ? '' : 'none';
          }
          if (!visible) continue;
          var pct = Math.round(A.carga(g, quien, k) * 100);
          if (pct !== c.ultimo) {
            c.fill.style.height = pct + '%';
            c.ultimo = pct;
          }
          /* Recargando enseña los segundos; lista, la tecla. Es la misma idea
           * que en la barra grande: una casilla, dos estados que nunca se
           * dan a la vez. */
          var resta = A.restan(quien, k);
          var texto = (resta > 0) ? String(resta) : h.key;
          if (texto !== c.texto) { c.texto = texto; c.txt.textContent = texto; }
          var listo = (resta <= 0);
          if (listo !== c.listo) {
            c.c.classList.toggle('listo', listo);
            c.listo = listo;
          }
        }
      }
    },

    /* El color de los poderes de un jugador: el de su rol de DESATADO, o el
     * de su fantasma si lleva uno (PAC-MAN VS.). */
    colorHabDe: function (g, A, idx) {
      var gid = g.vsGhostOf ? g.vsGhostOf(idx) : -1;
      if (gid >= 0 && CFG.GHOSTS[gid]) return CFG.GHOSTS[gid].color;
      var rol = A.rolDe ? A.rolDe(idx) : 'asesino';
      var info = CFG.HAB.ROL_INFO[rol];
      return (info && info.color) || '#ff66cc';
    },

    makeDpad: function (id, playerIdx) {
      var self = this;
      var wrap = document.createElement('div');
      wrap.className = 'dpad';
      wrap.id = id;
      wrap.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
      var defs = [
        [D.UP, '▲', 'dpad-up', 'Arriba'],
        [D.LEFT, '◀', 'dpad-left', 'Izquierda'],
        [D.RIGHT, '▶', 'dpad-right', 'Derecha'],
        [D.DOWN, '▼', 'dpad-down', 'Abajo']
      ];
      defs.forEach(function (df) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dpad-b ' + df[2];
        b.textContent = df[1];
        b.setAttribute('aria-label', df[3]);
        b.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          self.resumeAudio();
          var g = window.PM.Game;
          if (g.state !== 'PLAYING' && g.state !== 'READY') return;
          var idx = (g.playerCount === 2 && !g.netRole) ? playerIdx : g.localIdx;
          g.setPacDir(idx, df[0]);
        });
        wrap.appendChild(b);
      });
      document.body.appendChild(wrap);
      return wrap;
    },

    /* Botones y crucetas: solo con la partida en marcha y sin diálogos */
    refreshControls: function () {
      var g = window.PM.Game;
      // de espectador (o viendo una repetición) no se juega: ni crucetas,
      // ni emotes, ni chat
      var playable = g.inGame() && g.state !== 'GAME_OVER' && !g.isSpec() &&
        !g.replaying && !this.promptOpen && !g.netNotice;
      if (this.gameBtns) this.gameBtns.classList.toggle('on', playable);
      if (this.surrenderBtn) this.surrenderBtn.disabled = !g.canSurrender();
      // la barra lleva también MI MAESTRÍA, útil en cualquier modo
      if (this.emoteBtn) this.emoteBtn.style.display = playable ? '' : 'none';
      if (this.chatBtn) {
        this.chatBtn.style.display = (playable && g.netRole) ? '' : 'none';
      }
      if (!playable) {
        this.toggleEmoteBar(false);
        this.closeChat();
      }
      /* La barra de poderes se refresca por fotograma desde Game.render,
       * pero ese camino solo existe DENTRO del modo: al volver al menú hay
       * que apagarla desde aquí o se quedaría colgada en la pantalla. */
      if (this.habBar && this.habBarOn && !(playable && g.hab)) {
        this.habBarOn = false;
        this.habBar.classList.remove('on');
        this.marcarHabBar();
        this.fitCanvas();          // el lienzo recupera lo que ocupaba
      }
      if (!this.dpad1) return;
      var show = playable && this.touchDevice;
      var dual = show && g.playerCount === 2 && !g.netRole;
      this.dpad1.style.display = show ? 'grid' : 'none';
      this.dpad1.classList.toggle('dual', dual);
      this.dpad2.style.display = dual ? 'grid' : 'none';
    },

    /* ------------------------------------------------------
     * Visibilidad de paneles
     * ------------------------------------------------------ */
    /* Muestra un solo panel (o ninguno si name es null) */
    showPanel: function (name) {
      this.hidePrompt();
      // la ficha va encima de un panel: si se cambia de panel, se va con él
      if (this.ficha && this.ficha.host !== this.els[name]) this.cerrarFicha(true);
      var panels = ['menu', 'options', 'online', 'badges', 'ranking',
                    'mazes', 'friends', 'profile', 'daily', 'mate', 'vestuario', 'tienda'];
      for (var i = 0; i < panels.length; i++) {
        var el = this.els[panels[i]];
        if (el) el.style.display = (panels[i] === name) ? 'flex' : 'none';
      }
      this.refreshControls();
    },

    showMenu: function () {
      this.refreshNicks();
      this.refreshLevel();
      this.refreshOnlineBtn();
      this.refreshDaily();
      this.refreshContinuar();   // CONTINUAR, si quedó una partida a medias
      this.refreshVestBtn();     // VESTUARIO · N NUEVOS
      this.refreshMarquesina();  // marcador, monedas y cinta
      // el canal personal va atado al nombre: si se ha cambiado, se rehace
      if (window.PM.Party) window.PM.Party.listen();
      this.showPanel('menu');
      this.animarNickLook();     // tu Pac-Man junto a tu nombre
      // si el nivel subió justo al salirse de la partida, el aviso no se
      // llegó a ver: se celebra aquí
      var g = window.PM.Game;
      if (g && g.pendingLevelUp) {
        var lv = g.pendingLevelUp;
        g.pendingLevelUp = null;
        this.showLevelUpPrompt(lv);
      }
    },

    showLevelUpPrompt: function (lv) {
      var self = this;
      var s = window.PM.Level ? window.PM.Level.state() : null;
      var nuevos = this.vestNuevos ? this.vestNuevos() : 0;
      /* Con el marco de recreativa, como el resto de avisos: el nivel en un
       * sello grande que entra de golpe, la barra hacia el siguiente y, si
       * subir ha abierto algo, un atajo al vestuario. */
      var botones = [
        { label: 'SEGUIR', primary: true, keys: ['Enter', 'Escape', ' '],
          hint: 'ENTER', onClick: function () { self.hidePrompt(); } }
      ];
      if (nuevos > 0) {
        botones.push({ label: 'VER ' + (nuevos === 1 ? 'LO NUEVO' : 'LOS ' + nuevos + ' NUEVOS'), hint: 'V', keys: ['v'],
          onClick: function () { self.hidePrompt(); self.showVestuario('skin', 'yo'); } });
      }
      this.showPrompt({
        title: '¡SUBES DE NIVEL!',
        arcade: true,
        tono: 'cian',
        custom: function (p) {
          var tt = p.querySelector('.panel-title');
          if (tt) tt.classList.add('lvl-titulo');       // largo: en una línea
          var sello = document.createElement('div');
          sello.className = 'lvl-sello';
          var k = document.createElement('small');
          k.textContent = 'NIVEL';
          sello.appendChild(k);
          var n = document.createElement('b');
          n.textContent = String(lv);
          sello.appendChild(n);
          p.appendChild(sello);
          if (s) {
            var barra = document.createElement('div');
            barra.className = 'lvl-barra';
            var relleno = document.createElement('i');
            relleno.style.width = Math.round((s.pct || 0) * 100) + '%';
            barra.appendChild(relleno);
            p.appendChild(barra);
            var sig = document.createElement('div');
            sig.className = 'lvl-sig';
            sig.textContent = fmtMonedas(s.inLevel) + ' / ' + fmtMonedas(s.needed) + ' PARA EL NIVEL ' + (lv + 1);
            p.appendChild(sig);
          }
          if (nuevos > 0) {
            var nv = document.createElement('div');
            nv.className = 'lvl-nuevo';
            nv.textContent = nuevos === 1 ? 'HAY ALGO NUEVO EN EL VESTUARIO' : ('HAY ' + nuevos + ' COSAS NUEVAS EN EL VESTUARIO');
            p.appendChild(nv);
          }
        },
        buttons: botones
      });
    },

    /* La presentación de un modo antes de jugar, con el marco de recreativa:
     * una frase, las cartas de lo que hay que saber (con su tecla o su número
     * y su recarga), los mandos en dos columnas y una línea al pie. Antes era
     * un muro de líneas centradas que nadie leía. */
    briefingModo: function (p, o) {
      var lema = document.createElement('div');
      lema.className = 'brief-lema';
      lema.textContent = o.lema;
      p.appendChild(lema);

      var cartas = document.createElement('div');
      cartas.className = 'brief-cartas';
      (o.cartas || []).forEach(function (c) {
        var el = document.createElement('div');
        el.className = 'brief-carta';
        var k = document.createElement('b');
        k.className = 'brief-tecla';
        k.textContent = c.k;
        el.appendChild(k);
        var n = document.createElement('div');
        n.className = 'brief-nombre';
        n.textContent = c.n;
        el.appendChild(n);
        var d = document.createElement('div');
        d.className = 'brief-desc';
        d.textContent = c.d;
        el.appendChild(d);
        if (c.cd != null) {
          var cd = document.createElement('div');
          cd.className = 'brief-recarga';
          cd.textContent = 'RECARGA ' + c.cd + ' S';
          el.appendChild(cd);
        }
        cartas.appendChild(el);
      });
      p.appendChild(cartas);

      var mandos = document.createElement('div');
      mandos.className = 'brief-mandos';
      (o.mandos || []).forEach(function (m) {
        var el = document.createElement('div');
        var t = document.createElement('b');
        t.textContent = m.t;
        el.appendChild(t);
        var d = document.createElement('span');
        d.textContent = m.d;
        el.appendChild(d);
        mandos.appendChild(el);
      });
      p.appendChild(mandos);

      if (o.pie) {
        var pie = document.createElement('div');
        pie.className = 'brief-pie';
        pie.textContent = o.pie;
        p.appendChild(pie);
      }
    },

    /* ------------------------------------------------------
     * Modo DESATADO: reglas y salida a jugar
     * ------------------------------------------------------ */
    showHabPrompt: function () {
      var self = this;
      var H = CFG.HAB;
      var s = window.PM.settings;
      /* ¿El J2 va a llevar un fantasma? Se elige en OPCIONES · PARTIDA y aquí
       * solo se cuenta, porque cambia por completo lo que hace la segunda
       * fila de teclas: con fantasma son dos poderes, no cuatro. */
      var conFantasma = (s.vsGhost2 >= 0 && s.vsGhost2 < 4);
      var t2 = H.KEYS_2P;

      function arranca(jugadores) {
        self.resumeAudio();
        self.hidePrompt();
        function go() {
          self.hideAll();
          var opts = { players: jugadores, hab: true, roles: [roles[0], roles[1]] };
          if (jugadores === 2) opts.ghosts = [-1, s.vsGhost2];
          window.PM.Game.newGame(opts);
        }
        if (self.avisaSiHayGuardada(go)) return;
        go();
      }

      /* Los ROLES: cada jugador elige el suyo (se recuerda en settings). Las
       * cartas enseñan los cuatro poderes del rol que se está mirando, leídos
       * de CFG.HAB.ROLES: ni un texto de recarga escrito a mano. */
      var roles = [H.rol(s.habRol1), H.rol(s.habRol2)];
      if (roles[0] === 'soporte' && roles[1] === 'soporte') roles[1] = 'asesino';
      var mirando = 0;          // de qué jugador son las cartas

      var dos = conFantasma
        ? ('J1 FLECHAS + ' + t2[0].join(' ') + '  ·  J2 LLEVA A ' + CFG.VS.NAMES[s.vsGhost2] +
           ': WASD + ' + t2[1][0] + ' EMBESTIDA Y ' + t2[1][1] + ' ACECHO')
        : ('J1 FLECHAS + ' + t2[0].join(' ') + '  ·  J2 WASD + ' + t2[1].join(' '));
      this.showPrompt({
        title: 'DESATADO',
        arcade: true,
        tono: 'rosa',
        custom: function (p) {
          var filas = document.createElement('div');
          filas.className = 'rol-filas';
          var chips = [{}, {}];
          [0, 1].forEach(function (j) {
            var fila = document.createElement('div');
            fila.className = 'rol-fila';
            var quien = document.createElement('b');
            quien.className = 'rol-quien';
            quien.textContent = j ? 'J2' : 'J1';
            fila.appendChild(quien);
            if (j === 1 && conFantasma) {
              var nota = document.createElement('span');
              nota.className = 'rol-nota';
              nota.textContent = 'LLEVA A ' + CFG.VS.NAMES[s.vsGhost2] + ' (SIN ROL)';
              fila.appendChild(nota);
            } else {
              H.ROL_IDS.forEach(function (id) {
                var info = H.ROL_INFO[id];
                var b = self.makeButton(info.name, function () {
                  roles[j] = id;
                  mirando = j;
                  s['habRol' + (j + 1)] = id;
                  saveSettings();
                  pintar();
                });
                b.classList.add('rol-chip');
                b.style.setProperty('--rol', info.color);
                chips[j][id] = b;
                fila.appendChild(b);
              });
            }
            filas.appendChild(fila);
          });
          p.appendChild(filas);

          self.briefingModo(p, {
            lema: ' ',
            cartas: [{ k: 'Q', n: '', d: '', cd: 0 }, { k: 'W', n: '', d: '', cd: 0 },
                     { k: 'E', n: '', d: '', cd: 0 }, { k: 'R', n: '', d: '', cd: 0 }],
            mandos: [
              { t: 'SOLO', d: 'FLECHAS + Q W E R (WASD NO MUEVE: LA W ES EL TURBO)' },
              { t: 'DOS JUGADORES', d: dos }
            ],
            pie: 'TIENE SU PROPIA LIGA EN EL TOP MUNDIAL, CON SUS RÉCORDS Y MAESTRÍAS' +
              (conFantasma ? '' : '  ·  EN OPCIONES · PARTIDA EL J2 PUEDE LLEVAR UN FANTASMA') +
              '  ·  EN PARTY CADA UNO ELIGE SU ROL EN LA SALA'
          });
          var lema = p.querySelector('.brief-lema');
          var cartas = p.querySelectorAll('.brief-carta');

          function pintar() {
            // solo un Soporte: el del otro jugador sale apagado
            [0, 1].forEach(function (j) {
              for (var id in chips[j]) {
                if (!chips[j].hasOwnProperty(id)) continue;
                chips[j][id].classList.toggle('active', roles[j] === id);
                chips[j][id].classList.toggle('mirando', roles[j] === id && mirando === j);
                chips[j][id].disabled = (id === 'soporte' && roles[1 - j] === 'soporte' && !conFantasma);
              }
            });
            var rol = roles[mirando], info = H.ROL_INFO[rol], lista = H.ROLES[rol];
            p.style.setProperty('--brief', info.color);
            lema.textContent = (mirando ? 'J2 · ' : 'J1 · ') + info.name + ' — ' + info.lema;
            for (var k = 0; k < cartas.length; k++) {
              var h = lista[k];
              cartas[k].querySelector('.brief-tecla').textContent = h.key;
              cartas[k].querySelector('.brief-nombre').textContent = h.largo || h.name;
              cartas[k].querySelector('.brief-desc').textContent = info.desc[k];
              cartas[k].querySelector('.brief-recarga').textContent = 'RECARGA ' + H.segs(k, rol) + ' S';
            }
            /* A uno, con otro rol, la partida es de PRÁCTICA: se dice aquí,
             * antes de jugar, y no en el GAME OVER cuando ya no tiene arreglo */
            aviso.textContent = roles[0] !== 'asesino'
              ? 'SOLO CON ' + H.ROL_INFO[roles[0]].name + ' ES PRÁCTICA: NO CUENTA PARA RÉCORDS NI MAESTRÍAS'
              : '';
            aviso.style.display = aviso.textContent ? '' : 'none';
          }
          var aviso = document.createElement('div');
          aviso.className = 'rol-aviso';
          p.insertBefore(aviso, p.querySelector('.brief-mandos'));
          pintar();
        },
        buttons: [
          { label: 'JUGAR SOLO', primary: true, keys: ['Enter'], hint: 'ENTER',
            onClick: function () { arranca(1); } },
          { label: 'DOS JUGADORES', keys: ['2'], hint: '2',
            onClick: function () { arranca(2); } },
          { label: 'VOLVER', keys: ['Escape'], hint: 'ESC',
            onClick: function () { self.hidePrompt(); } }
        ]
      });
      this.promptTag = 'hab';
    },

    /* CACERÍA: qué es y con cuántos, antes de empezar. Solo o dos en el
     * mismo teclado desde aquí; en party lo enciende quien manda. */
    showCazaPrompt: function () {
      var self = this;
      var Z = CFG.CAZA;

      function arranca(jugadores) {
        self.resumeAudio();
        self.hidePrompt();
        self.hideAll();
        window.PM.Game.newGame({ players: jugadores, caza: true });
      }

      this.showPrompt({
        title: 'CACERÍA',
        arcade: true,
        tono: 'rojo',
        custom: function (p) {
          self.briefingModo(p, {
            lema: 'AQUÍ EL FANTASMA ERES TÚ',
            cartas: [
              { k: '1', n: 'LA PRESA', d: 'EL PAC-MAN LO LLEVA LA MÁQUINA: COME, HUYE Y SE DEFIENDE' },
              { k: '2', n: 'SU PODER', d: 'LLEGA CADA ' + Z.periodo(0) + ' S Y DURA ' + Z.duracion(0) +
                ' S. UN ARO AVISA ' + Z.AVISO + ' S ANTES: APÁRTATE' },
              { k: '3', n: 'LA CAZA', d: 'CADA CAPTURA SON ' + CFG.VS.CATCH_POINTS +
                ' PUNTOS. SIN VIDAS GANÁIS; SI DESPEJA ' + Z.NIVELES + ' RONDAS, GANA ÉL' },
              { k: '4', n: 'EL TRUCO', d: 'UN FANTASMA NO DA MARCHA ATRÁS: CIÉRRALE EL PASILLO ENTRE VARIOS' }
            ],
            mandos: [
              { t: 'SOLO', d: 'LLEVAS A BLINKY (FLECHAS O WASD); LOS OTROS TRES, LA MÁQUINA' },
              { t: 'DOS JUGADORES', d: 'J1 BLINKY CON FLECHAS  ·  J2 PINKY CON WASD' }
            ],
            pie: 'NO ENTRA EN EL TOP MUNDIAL, PERO SUMA EXPERIENCIA Y TIENE SUS LOGROS' +
              '  ·  EN PARTY (HASTA 4) LO ENCIENDE QUIEN MANDA'
          });
        },
        buttons: [
          { label: 'JUGAR SOLO', primary: true, keys: ['Enter'], hint: 'ENTER',
            onClick: function () { arranca(1); } },
          { label: 'DOS JUGADORES', keys: ['2'], hint: '2',
            onClick: function () { arranca(2); } },
          { label: 'VOLVER', keys: ['Escape'], hint: 'ESC',
            onClick: function () { self.hidePrompt(); } }
        ]
      });
      this.promptTag = 'caza';
    },

    /* La tarjeta de ONLINE avisa de si ya estamos en una party y de cuántos
     * sois, sin tener que entrar al panel a mirar. */
    refreshOnlineBtn: function () {
      this.refreshModePicker();
    },

    /* Nivel de jugador en la portada */
    refreshLevel: function () {
      if (!this.levelLabel || !window.PM.Level) return;
      var s = window.PM.Level.state();
      this.levelLabel.textContent = 'NIVEL ' + s.level + ' · ' +
        s.inLevel + ' / ' + s.needed;
      this.levelFill.style.width = Math.round(s.pct * 100) + '%';
    },

    showFriends: function () {
      this.refreshFriends();
      this.showPanel('friends');
    },
    showOptions: function () {
      this.refreshOptions();
      this.showPanel('options');
    },
    showOnline: function () {
      var P = window.PM.Party;
      this.showPanel('online');
      if (P && P.inParty()) this.refreshParty();
      else this.showOnlineIdle();
    },
    showBadges: function () {
      this.badgePick = null;          // al entrar, siempre la que tienes
      this.refreshBadges();
      this.showPanel('badges');
      // el emblema se arma al abrir el panel
      this.animarMaestrias();
    },
    showRanking: function (tab) {
      if (tab != null) this.rankTab = tab;
      this.showPanel('ranking');
      this.loadRanking();
    },
    hideAll: function () {
      this.showPanel(null);   // se actualiza de nuevo al arrancar la partida
    },

    resumeAudio: function () {
      if (window.AudioSys) {
        AudioSys.init();
        AudioSys.resume();
        this.applyMute();
      }
      this.audioResumed = true;
    },

    /* ------------------------------------------------------
     * Entrada: teclado y gestos táctiles
     * J1: flechas (y WASD en 1 jugador) · J2: WASD
     *
     * En el modo DESATADO A UN JUGADOR, WASD DEJA DE MOVER: la W es el turbo,
     * y no se puede tener la misma tecla haciendo dos cosas. Se avisa en la
     * portada y en el rótulo del propio modo.
     *
     * CON DOS EN EL MISMO TECLADO es al revés: el J2 necesita su WASD, así que
     * los poderes se mudan a una fila por cabeza (CFG.HAB.KEYS_2P) — N M , .
     * para el J1 y Z X C V para el J2 — y WASD vuelve a mover. Es la única
     * forma de que quepan dos juegos de poderes sin que dos jugadores se
     * peleen por la misma tecla.
     * ------------------------------------------------------ */
    bindKeyboard: function () {
      var self = this;
      var ARROWS = {
        'ArrowUp': D.UP, 'ArrowLeft': D.LEFT,
        'ArrowDown': D.DOWN, 'ArrowRight': D.RIGHT
      };
      var WASD = {
        'w': D.UP, 'a': D.LEFT, 's': D.DOWN, 'd': D.RIGHT,
        'W': D.UP, 'A': D.LEFT, 'S': D.DOWN, 'D': D.RIGHT
      };
      /* Tecla -> número de poder. Se monta desde CFG para que no puedan
       * separarse de lo que enseña la barra del HUD, que lee de ahí mismo. */
      function habMapa(teclas) {
        var m = {};
        for (var i = 0; i < teclas.length; i++) {
          m[teclas[i]] = i;
          m[String(teclas[i]).toLowerCase()] = i;
        }
        return m;
      }
      var HAB_KEYS = habMapa((function () {
        var t = [];
        for (var i = 0; i < CFG.HAB.LIST.length; i++) t.push(CFG.HAB.LIST[i].key);
        return t;
      })());
      var HAB_2P = [habMapa(CFG.HAB.KEYS_2P[0]), habMapa(CFG.HAB.KEYS_2P[1])];
      /* Soltar un poder. Solo importa en los que se pueden MANTENER (la Q y
       * la E del Soporte), que salen al soltar si no llegaron a su rato; en
       * el resto Hab.soltar no hace nada. */
      document.addEventListener('keyup', function (ev) {
        var g = window.PM.Game;
        if (!g || !g.hab || !window.PM.Hab) return;
        if (g.playerCount === 2 && !g.netRole) {
          for (var j = 0; j < HAB_2P.length; j++) {
            if (ev.key in HAB_2P[j]) { window.PM.Hab.soltar(g, j, HAB_2P[j][ev.key]); return; }
          }
        } else if (ev.key in HAB_KEYS) {
          window.PM.Hab.soltar(g, g.localIdx, HAB_KEYS[ev.key]);
        }
      });
      /* sin foco no llega el keyup: lo que se estaba manteniendo se suelta
       * sin lanzar nada */
      window.addEventListener('blur', function () {
        if (window.PM.Hab) window.PM.Hab.cancelarMant();
      });
      document.addEventListener('keydown', function (ev) {
        var g = window.PM.Game;
        if (self.chatOpen) return;       // escribiendo: lo lleva el propio campo

        /* flechas y Enter recorren los menús y diálogos abiertos */
        if (self.handleNavKey(ev)) { ev.preventDefault(); return; }

        /* con un diálogo abierto mandan sus atajos (REANUDAR, R, Q, ...) */
        if (self.promptOpen) {
          if (self.handlePromptKey(ev)) ev.preventDefault();
          return;
        }

        /* Viendo una repetición el teclado es el de un vídeo: las flechas
         * saltan diez segundos y el espacio pausa. Aquí no hay a quién mover
         * (la repetición manda sobre el teclado), así que no se le quita
         * nada a nadie. */
        if (window.PM.Replay && window.PM.Replay.teclaVideo &&
            window.PM.Replay.teclaVideo(ev)) {
          self.resumeAudio();
          ev.preventDefault();
          return;
        }
        var canControl = (g.state === 'PLAYING' || g.state === 'READY');

        /* C: CONTINUAR sin vidas mientras los demás siguen. Con dos en el
         * mismo teclado en DESATADO la C es un poder del J2, así que ahí solo
         * vale el botón. */
        if ((ev.key === 'c' || ev.key === 'C') && !self.promptOpen &&
            g.contDisponible && g.contDisponible() && g.state !== 'CONTINUE' &&
            !(g.hab && g.playerCount === 2 && !g.netRole)) {
          self.resumeAudio();
          g.pedirContinuar();
          ev.preventDefault();
          return;
        }

        /* Ctrl+Espacio: enseña tu maestría sobre tu Pac-Man */
        if (canControl && ev.ctrlKey &&
            (ev.code === 'Space' || ev.key === ' ' || ev.key === 'Spacebar')) {
          self.resumeAudio();
          g.sendBadgeTag();
          self.toggleEmoteBar(false);
          ev.preventDefault();
          return;
        }
        /* F1..F4: la de SOLO, DÚO, TRÍO o ESCUADRA, del mundo que se juega.
         * Se corta el efecto del navegador (F1 abre la ayuda, F3 buscar). */
        var fKey = /^F([1-4])$/.exec(ev.key || '');
        if (canControl && fKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
          self.resumeAudio();
          g.sendBadgeTag(parseInt(fKey[1], 10));
          self.toggleEmoteBar(false);
          ev.preventDefault();
          return;
        }

        /* emotes 1..6 */
        if (canControl && /^[1-9]$/.test(ev.key)) {
          var ei = parseInt(ev.key, 10) - 1;
          if (ei < CFG.EMOTES.length) {
            self.resumeAudio();
            g.sendEmote(ei);
            self.toggleEmoteBar(false);
            ev.preventDefault();
            return;
          }
        }
        /* chat online con T */
        if (canControl && (ev.key === 't' || ev.key === 'T') && g.canChat()) {
          self.openChat();
          ev.preventDefault();
          return;
        }

        /* DESATADO. Va ANTES que WASD a propósito: a un jugador la W es el
         * turbo y no el "arriba" de siempre.
         *
         * Con dos en el mismo teclado cada uno tiene su propia fila y hay que
         * saber DE QUIÉN es la tecla, que es lo que aquí se averigua. */
        var dosLocal = (g.playerCount === 2 && !g.netRole);
        if (g.hab) {
          var quien = -1, cual = -1, j;
          if (dosLocal) {
            for (j = 0; j < HAB_2P.length && j < g.playerCount; j++) {
              if (ev.key in HAB_2P[j]) { quien = j; cual = HAB_2P[j][ev.key]; break; }
            }
          } else if (ev.key in HAB_KEYS) {
            quien = g.localIdx;
            cual = HAB_KEYS[ev.key];
          }
          if (cual >= 0) {
            if (canControl && window.PM.Hab) {
              self.resumeAudio();
              /* la autorrepetición del teclado no reinicia una tecla que se
               * está manteniendo (ver Hab.apretar) */
              window.PM.Hab.apretar(g, quien, cual, !!ev.repeat);
              ev.preventDefault();
            }
            return;
          }
        }

        var isArrow = (ev.key in ARROWS);
        /* En DESATADO A UN JUGADOR se mueve SOLO con flechas: dejar la A, la S
         * y la D moviendo mientras la W hace otra cosa sería el peor de los dos
         * mundos, medio mando que a veces responde y a veces no. Con dos en el
         * mismo teclado, WASD vuelve a mover porque los poderes ya no están
         * ahí (viven en Z X C V y en N M , .). */
        var isWasd = (!g.hab || dosLocal) && (ev.key in WASD);
        if (isArrow || isWasd) {
          if (canControl) {
            self.resumeAudio();
            if (g.playerCount === 2 && !g.netRole) {
              // dos jugadores locales: controles separados
              if (isArrow) g.setPacDir(0, ARROWS[ev.key]);
              else g.setPacDir(1, WASD[ev.key]);
            } else {
              g.setPacDir(g.localIdx, isArrow ? ARROWS[ev.key] : WASD[ev.key]);
            }
            ev.preventDefault();
          }
          return;
        }
        if (ev.key === 'p' || ev.key === 'P' || ev.key === 'Escape') {
          if (g.canPause()) {           // también mientras mueres o cambia el nivel
            g.requestPause();
            ev.preventDefault();
          } else if (ev.key === 'Escape') {
            if (self.cerrarDesplegables()) {
              /* un desplegable abierto se cierra antes que salir del panel */
            } else if (self.ficha) {
              self.cerrarFicha();     // la ficha va encima: se cierra ella sola
            } else if (self.els.online.style.display !== 'none') {
              self.showMenu();      // salir del panel no deshace la party
            } else if (self.els.vestuario && self.els.vestuario.style.display !== 'none') {
              self.closeVestuario();  // vuelve a PERFIL, OPCIONES o la TIENDA si vino de ahí
            } else if (self.els.tienda && self.els.tienda.style.display !== 'none') {
              self.closeTienda();   // ídem, a donde se abrió
            } else if (self.els.profile && self.els.profile.style.display !== 'none') {
              /* PERFIL: desde CIFRAS o LOGROS vuelve a la carta; desde la
               * carta, al menú */
              if (self.profTab && self.profTab !== 'perfil') self.showProfileTab('perfil');
              else self.showMenu();
            } else if (self.els.options.style.display !== 'none' ||
                       self.els.badges.style.display !== 'none' ||
                       self.els.ranking.style.display !== 'none' ||
                       self.els.friends.style.display !== 'none') {
              self.showMenu();
            }
          }
        }
      });
    },

    /* Deslizar sobre el laberinto para moverse. Multitáctil: en dos
     * jugadores locales, la mitad izquierda de la pantalla controla a J1
     * y la derecha a J2 (cada pulgar con su zona, simultáneos). En un
     * jugador y online, cualquier deslizamiento controla al jugador local. */
    bindTouch: function () {
      var canvas = document.getElementById('game');
      var tracks = {};       // identifier -> { sx, sy, zone }
      var THRESH = 22;       // px de deslizamiento para registrar un giro
      var self = this;

      function zoneFor(clientX) {
        var g = window.PM.Game;
        if (g.playerCount === 2 && !g.netRole) {
          var r = canvas.getBoundingClientRect();
          return (clientX - r.left) < r.width / 2 ? 0 : 1;
        }
        return g.localIdx;
      }

      canvas.addEventListener('touchstart', function (ev) {
        self.resumeAudio();
        for (var i = 0; i < ev.changedTouches.length; i++) {
          var t = ev.changedTouches[i];
          tracks[t.identifier] = { sx: t.clientX, sy: t.clientY, zone: zoneFor(t.clientX) };
        }
      }, { passive: true });

      canvas.addEventListener('touchmove', function (ev) {
        var g = window.PM.Game;
        if (g.state !== 'PLAYING' && g.state !== 'READY') return;
        for (var i = 0; i < ev.changedTouches.length; i++) {
          var t = ev.changedTouches[i];
          var tr = tracks[t.identifier];
          if (!tr) continue;
          var dx = t.clientX - tr.sx;
          var dy = t.clientY - tr.sy;
          if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) continue;
          var d;
          if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? D.RIGHT : D.LEFT;
          else d = dy > 0 ? D.DOWN : D.UP;
          g.setPacDir(tr.zone, d);
          // reanclar: el mismo dedo puede encadenar giros sin levantarse
          tr.sx = t.clientX;
          tr.sy = t.clientY;
        }
      }, { passive: true });

      function endTouches(ev) {
        for (var i = 0; i < ev.changedTouches.length; i++) {
          delete tracks[ev.changedTouches[i].identifier];
        }
      }
      canvas.addEventListener('touchend', endTouches, { passive: true });
      canvas.addEventListener('touchcancel', endTouches, { passive: true });
    }
  };

  window.PM.UI = UI;

  /* Arranque */
  function boot() {
    window.PM.Game.init('game');
    UI.init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
