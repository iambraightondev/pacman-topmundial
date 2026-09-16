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

      /* La portada se reparte en cuatro bloques. En pantalla ancha van en
       * rejilla —reparto a la izquierda, lo de jugar en el centro y el resto
       * de paneles a la derecha— y en estrecha se apilan en este mismo orden.
       * El orden del DOM manda en la navegación con flechas, así que lo de
       * jugar va ANTES que los botones secundarios aunque en pantalla queden
       * a la izquierda: la rejilla los coloca por su nombre de área. */
      var head = document.createElement('div');
      head.className = 'menu-head';
      m.appendChild(head);

      var main = document.createElement('div');
      main.className = 'menu-main';
      m.appendChild(main);

      var side = document.createElement('div');
      side.className = 'menu-side';
      m.appendChild(side);

      var cast = document.createElement('div');
      cast.className = 'menu-cast';
      m.appendChild(cast);

      var title = document.createElement('div');
      title.className = 'title';
      title.textContent = 'PAC-MAN';
      head.appendChild(title);

      var sub = document.createElement('div');
      sub.className = 'subtitle';
      sub.textContent = 'TOP MUNDIAL';
      head.appendChild(sub);

      /* presentación de fantasmas (clásica, opcional) */
      var roster = document.createElement('div');
      roster.className = 'roster';
      var names = [
        ['SHADOW', '"BLINKY"', '#ff0000'],
        ['SPEEDY', '"PINKY"', '#ffb8ff'],
        ['BASHFUL', '"INKY"', '#00ffff'],
        ['POKEY', '"CLYDE"', '#ffb852']
      ];
      for (var i = 0; i < names.length; i++) {
        var row = document.createElement('div');
        row.className = 'roster-row';
        row.style.color = names[i][2];
        var dot = document.createElement('span');
        dot.className = 'roster-ghost';
        dot.style.background = names[i][2];
        row.appendChild(dot);
        var t = document.createElement('span');
        t.textContent = names[i][0] + '  ' + names[i][1];
        row.appendChild(t);
        roster.appendChild(row);
      }
      cast.appendChild(this.sectionTitle('EL REPARTO'));
      cast.appendChild(roster);

      /* nombre en la portada, estilo arcade moderno: se escribe y a jugar */
      main.appendChild(this.makeNickRow('nick1', 'TU NOMBRE', 'menu'));

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
      main.appendChild(lvl);

      /* EL RETO DE HOY, encima de la elección de modo y no dentro de ella: no
       * es un modo, es algo que se cumple jugando a lo que se juegue. Va aquí
       * para que se lea ANTES de elegir —igual te decides por DESATADO porque
       * el reto de hoy es de ahí— y se pulsa para ver la semana entera. */
      main.appendChild(this.buildDailyBox());

      /* CONTINUAR: la partida que se dejó a medias, aquí o en otro aparato
       * (js/guardado.js). Va ANTES de elegir modo porque quien tiene una a
       * medias no viene a elegir nada: viene a seguir donde iba. Si no hay
       * ninguna, el bloque entero no existe. */
      main.appendChild(this.buildContinuarBox());

      /* Elige modo y dale a JUGAR. UNO cada vez, en grande, y se pasa de uno
       * a otro con las flechas de los lados. */
      main.appendChild(this.sectionTitle('ELIGE MODO'));
      main.appendChild(this.buildModeGrid());

      /* Lo que hace ese modo, y su recado si tiene (la gente que hay en tu
       * party...). Va debajo del carrusel y encima del botón, que es por donde
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
      /* VESTUARIO: todo lo que llevas puesto, en un solo sitio (antes era
       * SKINS, y el resto estaba repartido entre PERFIL y la TIENDA) */
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
      /* LABERINTOS ya no vive aquí: es un modo, y los modos están todos
       * juntos en la rejilla de arriba. El cuartel es para lo TUYO. */
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
      side.appendChild(extras);

      /* Ayuda de controles: en la columna del reparto, que es donde sobra
       * sitio, en vez de tres renglones cruzando toda la portada. */
      cast.appendChild(this.sectionTitle('CONTROLES'));
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
        cast.appendChild(hint);
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
      this.showPrompt({
        title: 'TIENES UNA PARTIDA A MEDIAS',
        color: '#ffff00',
        lines: [Gd.titulo(), 'SI EMPIEZAS OTRA, ESA SE PIERDE.'],
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
      this.dailyClock.textContent = (this.dailyHecho ? 'ABRE ' : 'CIERRA ') +
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
        /* Cumplido: lo que toca ahora es enseñar el de mañana, que es lo que
         * hace volver. El domingo no hay mañana en esta semana. */
        var man = D.retos()[hoy + 1];
        this.dailyDesc.textContent = 'CAZADO · ' +
          (man ? ('MAÑANA: ' + man.desc) : 'EL LUNES, SEMANA NUEVA');
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
        var pcv = document.createElement('canvas');
        pcv.width = 88; pcv.height = 88;
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
        return { b: p, cv: pcv, name: pn, id: '' };
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
        b.className = 'mode-card';
        b.setAttribute('aria-label', mo.name);

        var cv = document.createElement('canvas');
        cv.width = 88; cv.height = 88;
        cv.className = 'mode-icon';
        self.drawModeIcon(cv, mo);
        b.appendChild(cv);

        var nm = document.createElement('span');
        nm.className = 'mode-name';
        nm.textContent = mo.name;
        b.appendChild(nm);

        var tg = document.createElement('small');
        tg.className = 'mode-tag';
        tg.textContent = mo.tag;
        b.appendChild(tg);

        /* Pulsar la tarjeta arranca: la que se ve ES la elegida, así que aquí
         * ya no hay nada que elegir. */
        b.addEventListener('click', function () {
          self.resumeAudio();
          self.playPick();
        });
        caja.appendChild(b);
        self.modeCards[mo.id] = { b: b, tag: tg, mo: mo };
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
      var k = cv.width / 20;
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
        S.drawPacman(c, -6, -3, D.RIGHT, 2, '#ffff00', 'clasico');
        S.drawPacman(c, 5, -3, D.LEFT, 2, '#00ff00', 'clasico');
        S.drawGhost(c, 0, 5, D.RIGHT, 0, 'normal', 0, false);
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
          d.style.background = sel ? card.mo.color : '';
          d.style.borderColor = sel ? card.mo.color : '';
        }
      }
      /* Los vecinos: se repintan solo si han cambiado de modo */
      var self = this;
      [[this.modePeekPrev, -1], [this.modePeekNext, 1]].forEach(function (par) {
        var pk = par[0];
        if (!pk) return;
        var vm = self.modoVecino(par[1]);
        if (pk.id !== vm.id) {
          self.drawModeIcon(pk.cv, vm);
          pk.name.textContent = vm.name;
          pk.b.style.setProperty('--mc', vm.color);
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
      if (this.modeNote) this.modeNote.textContent = this.modeNota(mo);
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
        return 'NO ENTRA EN EL TOP MUNDIAL · MAESTRÍAS PROPIAS POR FORMATO';
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
        ['sonido', 'SONIDO']
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
      row.appendChild(input);

      if (!this.nickInputs[key]) this.nickInputs[key] = [];
      this.nickInputs[key].push(input);
      return row;
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
      var teclas = document.createElement('div');
      teclas.className = 'vest-teclas';
      this.vestTeclaBtns = [];
      for (var k = 0; k < CFG.TIENDA.EMOTE_TECLAS; k++) {
        (function (n) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'skin vest-tecla';
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
      this.vestFaltanBtn = this.makeButton('VER LO QUE ME FALTA', function () {
        self.vestFaltan = !self.vestFaltan;
        self.refreshVestuario();
      });
      this.vestFaltanBtn.classList.add('btn-preset', 'vest-faltan');
      util.appendChild(this.vestFaltanBtn);
      arm.appendChild(util);

      /* SKIN: clasificarlas por cómo se consiguen, para quien no quiera verlas
       * todas juntas. En TODAS salen agrupadas con su título. */
      this.vestFiltrosEl = document.createElement('div');
      this.vestFiltrosEl.className = 'vest-filtros';
      this.vestFiltroBtns = {};
      this.VEST_FILTROS.forEach(function (fl) {
        var b = self.makeButton(fl.name, function () {
          self.vestFiltro = fl.id;
          self.vestProbando = null;
          self.refreshVestuario();
        });
        b.classList.add('vest-filtro');
        self.vestFiltroBtns[fl.id] = b;
        self.vestFiltrosEl.appendChild(b);
      });
      arm.appendChild(this.vestFiltrosEl);

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
      this.vestFaltan = false;
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
      this.vestFaltanBtn.classList.toggle('active', !!this.vestFaltan);
      this.vestFaltanBtn.textContent = this.vestFaltan ? 'SOLO LO QUE TENGO' : 'VER LO QUE ME FALTA';
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
          fb.textContent = fl.name + ' ' + mias + '/' + de.length;
          fb.classList.toggle('active', fl.id === filtro);
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
        vacio.textContent = 'AÚN NO TIENES NINGUNO · PULSA "VER LO QUE ME FALTA" O PASA POR LA TIENDA';
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
      this.pintarSkinIcono(this.profLookCv, skin, s.pacColor || '#ffff00');
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

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'MODO ONLINE';
      o.appendChild(h);

      var sub = document.createElement('div');
      sub.className = 'note';
      sub.textContent = 'HASTA ' + CFG.MAX_PLAYERS +
        ' JUGADORES CONTRA LOS FANTASMAS · PUNTUACIÓN DE EQUIPO';
      o.appendChild(sub);

      /* --- vista inicial --- */
      var idle = document.createElement('div');
      idle.className = 'online-view';
      this.onlineIdle = idle;

      this.onlineWarn = document.createElement('div');
      this.onlineWarn.className = 'online-warn';
      this.onlineWarn.style.display = 'none';
      idle.appendChild(this.onlineWarn);

      var create = this.makeButton('CREAR PARTY', function () { self.partyCreate(); });
      create.classList.add('btn-primary');
      this.createBtn = create;
      idle.appendChild(create);

      var div1 = document.createElement('div');
      div1.className = 'section-title';
      div1.textContent = '— O ÚNETE CON UN CÓDIGO —';
      idle.appendChild(div1);

      var joinRow = document.createElement('div');
      joinRow.className = 'preset-row';
      this.codeInput = document.createElement('input');
      this.codeInput.type = 'text';
      this.codeInput.className = 'code-input';
      this.codeInput.maxLength = CFG.NET.ROOM_LEN;
      this.codeInput.placeholder = 'CÓDIGO';
      this.codeInput.setAttribute('autocomplete', 'off');
      this.codeInput.setAttribute('spellcheck', 'false');
      this.codeInput.setAttribute('autocapitalize', 'characters');
      this.codeInput.addEventListener('input', function () {
        var v = self.codeInput.value.toUpperCase().replace(/[^A-Z]/g, '');
        if (v !== self.codeInput.value) self.codeInput.value = v;
        else self.codeInput.value = v;
      });
      this.codeInput.addEventListener('keydown', function (ev) {
        ev.stopPropagation();   // que WASD no mueva el juego mientras se escribe
        if (ev.key === 'Enter') self.partyJoin(self.codeInput.value);
      });
      joinRow.appendChild(this.codeInput);
      this.joinBtn = this.makeButton('UNIRSE', function () {
        self.partyJoin(self.codeInput.value);
      });
      this.joinBtn.classList.add('btn-preset');
      joinRow.appendChild(this.joinBtn);
      idle.appendChild(joinRow);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.style.marginTop = '14px';
      idle.appendChild(back);
      o.appendChild(idle);

      /* --- vista de sala --- */
      var room = document.createElement('div');
      room.className = 'online-view';
      room.style.display = 'none';
      this.onlineRoom = room;

      var lab = document.createElement('div');
      lab.className = 'section-title';
      lab.textContent = 'CÓDIGO DE LA PARTY';
      room.appendChild(lab);

      this.roomCodeEl = document.createElement('div');
      this.roomCodeEl.className = 'online-code';
      room.appendChild(this.roomCodeEl);

      this.roomLinkEl = document.createElement('div');
      this.roomLinkEl.className = 'online-link';
      room.appendChild(this.roomLinkEl);

      this.copyBtn = this.makeButton('COPIAR ENLACE', function () {
        self.copyLink();
      });
      this.copyBtn.classList.add('btn-preset');
      room.appendChild(this.copyBtn);

      var lab2 = document.createElement('div');
      lab2.className = 'section-title';
      lab2.textContent = 'EN LA PARTY';
      room.appendChild(lab2);

      this.partyList = document.createElement('div');
      this.partyList.className = 'friend-list';
      room.appendChild(this.partyList);

      /* PAC-MAN VS.: uno de la party puede llevar un fantasma en vez de un
       * Pac-Man. Los que ya lleva otro salen apagados. */
      var lab3 = document.createElement('div');
      lab3.className = 'section-title';
      lab3.textContent = 'JUGAR COMO FANTASMA';
      room.appendChild(lab3);

      var vsRow = document.createElement('div');
      vsRow.className = 'preset-row';
      this.vsBtns = {};
      this.vsChoices().forEach(function (op) {
        var b = self.makeButton(op[1], function () { self.pickVsGhost(op[0]); });
        b.classList.add('btn-preset');
        if (op[0] >= 0) b.style.color = CFG.GHOSTS[op[0]].color;
        self.vsBtns[op[0]] = b;
        vsRow.appendChild(b);
      });
      room.appendChild(vsRow);

      var vsNote = document.createElement('div');
      vsNote.className = 'note';
      vsNote.textContent = 'LO LLEVAS TÚ, NO LA MÁQUINA: CAZA A LOS PAC-MAN. ' +
        'ALGUIEN TIENE QUE QUEDARSE DE PAC-MAN';
      room.appendChild(vsNote);

      /* Modo DESATADO para toda la party. Solo lo ve y lo toca quien
       * manda: es una regla de la partida, no un gusto de cada uno, y con
       * medio grupo con poderes no habría partida que valiera. */
      this.habRoomBox = document.createElement('div');
      this.habRoomBtn = this.makeButton('DESATADO: NO', function () {
        self.togglePartyHab();
      });
      this.habRoomBtn.classList.add('btn-preset');
      this.habRoomBox.appendChild(this.habRoomBtn);
      var habNote = document.createElement('div');
      habNote.className = 'note';
      habNote.textContent = 'Q MORDISCO · W TURBO · E FLASH · R GRITO. ' +
        'AQUÍ SE MUEVE SOLO CON LAS FLECHAS, Y ESTAS PARTIDAS NO ENTRAN EN ' +
        'EL TOP MUNDIAL';
      this.habRoomBox.appendChild(habNote);
      room.appendChild(this.habRoomBox);

      /* Modo CACERÍA para toda la party: todos de fantasma y el Pac-Man de
       * la máquina. También lo decide quien manda, y con él puesto el
       * selector de fantasma de arriba se apaga (cada uno lleva el de su
       * asiento). */
      this.cazaRoomBox = document.createElement('div');
      this.cazaRoomBtn = this.makeButton('CACERÍA: NO', function () {
        self.togglePartyCaza();
      });
      this.cazaRoomBtn.classList.add('btn-preset');
      this.cazaRoomBox.appendChild(this.cazaRoomBtn);
      var cazaNote = document.createElement('div');
      cazaNote.className = 'note';
      cazaNote.textContent = 'TODOS DE FANTASMA CONTRA UN PAC-MAN DE MÁQUINA. SIN ' +
        'SUPERPASTILLAS: SU PODER LLEGA SOLO CADA ' + CFG.CAZA.periodo(0) +
        'S, CON AVISO. ' + CFG.CAZA.NIVELES + ' RONDAS';
      this.cazaRoomBox.appendChild(cazaNote);
      room.appendChild(this.cazaRoomBox);

      this.lobbyStatusEl = document.createElement('div');
      this.lobbyStatusEl.className = 'lobby-status';
      room.appendChild(this.lobbyStatusEl);

      this.startPartyBtn = this.makeButton('EMPEZAR PARTIDA', function () {
        self.partyStart();
      });
      this.startPartyBtn.classList.add('btn-primary');
      room.appendChild(this.startPartyBtn);

      this.inviteBtn = this.makeButton('INVITAR AMIGO', function () {
        self.askInviteWho();
      });
      this.inviteBtn.classList.add('btn-preset');
      room.appendChild(this.inviteBtn);

      var volver = this.makeButton('VOLVER AL MENÚ', function () {
        self.showMenu();      // la party sigue conectada
      });
      volver.style.marginTop = '10px';
      room.appendChild(volver);

      var salir = this.makeButton('SALIR DE LA PARTY', function () {
        self.partyLeave();
      });
      room.appendChild(salir);
      o.appendChild(room);
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
      P.onstart = function (order, idx, cfg, role, hab, caza) {
        self.startPartyGame(order, idx, cfg, role, hab, caza);
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

    /* Modo DESATADO de la party: lo enciende y lo apaga quien manda */
    togglePartyHab: function () {
      var P = window.PM.Party;
      if (!P || !P.isLeader()) return;
      P.setHab(!P.habPick);      // se reparte a la sala y vuelve por onchange
    },

    /* Modo CACERÍA de la party: también del que manda */
    togglePartyCaza: function () {
      var P = window.PM.Party;
      if (!P || !P.isLeader()) return;
      P.setCaza(!P.cazaPick);
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
      var code = P.code() || '';
      this.roomCodeEl.textContent = code.split('').join(' ');
      this.roomLinkEl.textContent = window.PM.Net.roomLink(code);

      var ms = P.members();
      this.partyList.innerHTML = '';
      for (var i = 0; i < ms.length; i++) {
        var row = document.createElement('div');
        row.className = 'party-row';

        var dot = document.createElement('span');
        dot.className = 'party-dot';
        dot.style.background = ms[i].c || CFG.PLAYER_COLORS[i];
        row.appendChild(dot);

        var n = document.createElement('span');
        n.className = 'friend-name';
        n.textContent = ms[i].n || ('J' + (i + 1));
        row.appendChild(n);

        var tag = document.createElement('span');
        tag.className = 'party-tag';
        tag.textContent = (i === 0 ? 'LÍDER' : '') +
          (ms[i].s === window.PM.Net.sid ? (i === 0 ? ' · TÚ' : 'TÚ') : '');
        row.appendChild(tag);

        // PAC-MAN VS.: se ve de un vistazo quién lleva fantasma y cuál. En
        // CACERÍA lleva cada uno el de su asiento, y se enseña ese.
        var gv = P.cazaPick ? Math.min(i, 3) : ms[i].g;
        if (gv >= 0 && gv < 4) {
          var gt = document.createElement('span');
          gt.className = 'party-tag';
          gt.style.color = CFG.GHOSTS[gv].color;
          gt.textContent = CFG.VS.NAMES[gv];
          row.appendChild(gt);
        }

        this.partyList.appendChild(row);
      }

      /* selector de fantasma: apagados los que ya lleva otro (y todos en
       * CACERÍA, donde el reparto es fijo) */
      var mio = P.myGhost();
      for (var v = -1; v < 4; v++) {
        var vb = this.vsBtns[v];
        if (!vb) continue;
        var duenyo = (v >= 0) ? P.ghostOwner(v) : null;
        vb.disabled = !!P.cazaPick || !!(duenyo && duenyo !== window.PM.Net.sid);
        vb.classList.toggle('active', !P.cazaPick && v === mio);
      }

      var lider = P.isLeader();
      if (this.cazaRoomBox) {
        this.cazaRoomBtn.disabled = !lider;
        this.cazaRoomBtn.classList.toggle('active', !!P.cazaPick);
        this.cazaRoomBtn.childNodes[0].nodeValue =
          'CACERÍA: ' + (P.cazaPick ? 'SÍ' : 'NO');
      }
      /* DESATADO: el interruptor es solo del líder, pero el estado lo ve
       * todo el mundo — entrar a una party y descubrir los poderes al empezar
       * la partida sería una encerrona. */
      if (this.habRoomBox) {
        this.habRoomBtn.disabled = !lider;
        this.habRoomBtn.classList.toggle('active', !!P.habPick);
        this.habRoomBtn.childNodes[0].nodeValue =
          'DESATADO: ' + (P.habPick ? 'SÍ' : 'NO');
      }
      this.startPartyBtn.style.display = lider ? '' : 'none';
      this.startPartyBtn.disabled = !P.canStart();
      this.startPartyBtn.textContent = 'EMPEZAR PARTIDA (' + P.count() + ')';
      this.inviteBtn.disabled = !P.active();
      this.setLobbyStatus(
        P.connecting() ? 'CONECTANDO...'
        : (!P.anyPac() && !P.cazaPick) ? 'ALGUIEN TIENE QUE LLEVAR UN PAC-MAN'
        : lider ? (P.count() < 2 ? 'ESPERANDO A MÁS JUGADORES...'
                                 : 'CUANDO QUIERAS, EMPEZAD')
                : 'ESPERANDO A QUE EL LÍDER EMPIECE...');
    },

    /* Invitar: se le manda el código a su canal personal (su nombre) */
    askInviteWho: function () {
      var self = this;
      var F = window.PM.Friends;
      var list = F ? F.all() : [];
      var btns = [];
      list.slice(0, 3).forEach(function (name) {
        btns.push({
          label: name,
          onClick: function () { self.hidePrompt(); self.sendInvite(name); }
        });
      });
      btns.push({
        label: 'OTRO NOMBRE',
        onClick: function () { self.hidePrompt(); self.askInviteName(); }
      });
      btns.push({ label: 'VOLVER', onClick: function () { self.hidePrompt(); } });
      this.showPrompt({
        title: 'INVITAR A LA PARTY',
        lines: list.length ? ['ELIGE A QUIÉN AVISAR']
                           : ['NO TIENES AMIGOS GUARDADOS TODAVÍA'],
        buttons: btns
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

    startPartyGame: function (order, idx, cfg, role, hab, caza) {
      this.hidePrompt();
      this.hideAll();
      this.resumeAudio();
      var colors = [], names = [], skins = [], ghosts = [], looks = [];
      for (var i = 0; i < order.length; i++) {
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
        caza: !!caza          // ídem: todos de fantasma contra la máquina
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

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'MAESTRÍAS';
      o.appendChild(h);

      /* DOCE rutas independientes, y se eligen por sus dos ejes en vez de con
       * doce pestañas seguidas: arriba DÓNDE se juega (el laberinto de 1980,
       * LABERINTOS o DESATADO) y debajo CUÁNTOS jugáis. Tres botones más
       * cuatro se leen de un vistazo; doce en fila, no. */
      var B0 = window.PM.Badges;
      var bar = document.createElement('div');
      bar.className = 'tab-row';
      this.badgeMundoBtns = {};
      (B0 ? B0.MUNDOS : []).forEach(function (m) {
        var b = self.makeButton(m.name, function () { self.showBadgeTab(m.id, null); });
        b.classList.add('tab');
        self.badgeMundoBtns[m.id] = b;
        bar.appendChild(b);
      });
      o.appendChild(bar);

      var bar2 = document.createElement('div');
      bar2.className = 'tab-row tab-row-sub';
      this.badgeFmtBtns = {};
      (B0 ? B0.FORMATOS : []).forEach(function (f) {
        var b = self.makeButton(f.name, function () { self.showBadgeTab(null, f.n); });
        b.classList.add('tab');
        self.badgeFmtBtns[f.n] = b;
        bar2.appendChild(b);
      });
      o.appendChild(bar2);

      this.badgesSub = document.createElement('div');
      this.badgesSub.className = 'note';
      o.appendChild(this.badgesSub);

      /* Lista a la izquierda, la elegida en grande a la derecha (en estrecho,
       * el escenario va arriba y la lista debajo). No hay botón VER: se pulsa
       * la maestría y ya se ve. */
      var split = document.createElement('div');
      split.className = 'badge-split';
      o.appendChild(split);

      this.badgesList = document.createElement('div');
      this.badgesList.className = 'badge-list';
      split.appendChild(this.badgesList);

      var stage = document.createElement('div');
      stage.className = 'badge-stage';
      split.appendChild(stage);

      /* lienzo para ver la chapa sin tener que jugar: es la misma animación
       * de la partida (Ctrl+Espacio), con tu propio Pac-Man debajo */
      /* 130 x 54 lógicos a triple escala. El alto no es el de la partida: la
       * chapa y el jugador viven entre y=30 e y=58, así que se recorta lo de
       * arriba (badgeTop) en vez de dejar una franja negra muerta. Lo que se
       * deja por encima es para los rayos y el fogonazo de los rangos altos,
       * que se salen de la chapa. */
      this.badgeScale = 3;
      this.badgeTop = 12;
      this.badgeDemo = document.createElement('canvas');
      this.badgeDemo.width = 130 * this.badgeScale;
      this.badgeDemo.height = 54 * this.badgeScale;
      this.badgeDemo.className = 'badge-demo';
      stage.appendChild(this.badgeDemo);

      this.badgeStageName = document.createElement('div');
      this.badgeStageName.className = 'badge-stage-name';
      stage.appendChild(this.badgeStageName);

      this.badgeStageState = document.createElement('div');
      this.badgeStageState.className = 'badge-stage-state';
      stage.appendChild(this.badgeStageState);

      var hint = document.createElement('div');
      hint.className = 'badge-stage-hint';
      hint.textContent = 'PULSA UNA MAESTRÍA DE LA LISTA PARA VERLA';
      stage.appendChild(hint);

      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-primary');
      back.style.marginTop = '14px';
      o.appendChild(back);

      this.badgeMundo = 'clasico';
      this.badgeFmt = 1;
      this.badgeTab = 'solo';
      this.badgePick = null;
    },

    /* Cambia uno de los dos ejes (el otro va a null y se queda como estaba) y
     * recalcula la ruta. Se puede entrar también con una ruta hecha —lo hace
     * showBadges con la del modo en curso—, y entonces se deshace en sus dos
     * piezas para que los botones queden marcados donde toca. */
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

    refreshBadges: function () {
      var B = window.PM.Badges;
      var mode = this.badgeTab || 'solo';
      var k;
      for (k in this.badgeMundoBtns) {
        if (this.badgeMundoBtns.hasOwnProperty(k)) {
          this.badgeMundoBtns[k].classList.toggle('active', k === this.badgeMundo);
        }
      }
      for (k in this.badgeFmtBtns) {
        if (this.badgeFmtBtns.hasOwnProperty(k)) {
          this.badgeFmtBtns[k].classList.toggle('active',
            parseInt(k, 10) === this.badgeFmt);
        }
      }
      var best = B ? B.best(mode) : 0;
      var next = B ? B.next(mode) : null;
      /* Cada formato es su propia liga: su récord, sus insignias y su listón.
       * Cuanta más gente juega, más puntos pide cada escalón (el marcador de
       * un equipo es de todos, y con cuatro se llega al mismo número con
       * mucho menos mérito de cada uno). */
      var meta = function (b) { return B ? B.goal(b, mode) : b.points; };
      /* La coletilla explica POR QUÉ esa ruta pide lo que pide, que si no
       * los números parecen puestos a dedo. Primero lo del mundo, que es lo
       * menos evidente, y si el mundo no tiene nada que decir, lo del
       * formato. */
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
      var self = this;
      CFG.BADGES.forEach(function (b) {
        var puntos = meta(b);
        var got = best >= puntos;
        /* la fila ES el botón: pulsarla la enseña en el escenario. Siendo
         * <button> entra sola en la navegación con flechas. */
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'badge-row badge-pick' + (got ? ' got' : '');

        var cv = document.createElement('canvas');
        cv.width = 34; cv.height = 34;
        cv.className = 'badge-medal';
        var c = cv.getContext('2d');
        c.imageSmoothingEnabled = false;
        window.PM.Sprites.drawBadge(c, 17, 17, 14, b.color, !got);
        row.appendChild(cv);

        var txt = document.createElement('div');
        txt.className = 'badge-text';
        var nm = document.createElement('div');
        nm.className = 'badge-name';
        nm.style.color = got ? b.color : '#666';
        nm.textContent = b.name;
        txt.appendChild(nm);
        var st = document.createElement('div');
        st.className = 'badge-state';
        st.textContent = got
          ? ('CONSEGUIDA · ' + puntos + ' PUNTOS')
          : ('TE FALTAN ' + (puntos - best) + ' PUNTOS');
        txt.appendChild(st);
        row.appendChild(txt);

        // pulsarla es verla: se celebra igual que en partida, sin esperar a
        // conseguirla
        row.addEventListener('click', function () { self.pickBadge(b.id, true); });

        self.badgeRows[b.id] = row;
        self.badgesList.appendChild(row);
      });

      /* De entrada, la que tienes: la más alta conseguida en esta ruta. Si
       * aún no hay ninguna, la primera por conseguir. Al abrir el panel se
       * celebra sola; al cambiar de pestaña, quieta (no se ha pulsado nada). */
      var top = B ? B.top(mode) : null;
      var pick = (this.badgePick && this.badgeRows[this.badgePick])
        ? this.badgePick
        : (top ? top.id : CFG.BADGES[0].id);
      this.pickBadge(pick, false);
    },

    /* Elige una maestría: la marca en la lista y la enseña en el escenario.
     * play=true reproduce la chapa; si no, se queda quieta con su medalla. */
    pickBadge: function (id, play) {
      var B = window.PM.Badges;
      var mode = this.badgeTab || 'solo';
      var badge = null;
      for (var i = 0; i < CFG.BADGES.length; i++) {
        if (CFG.BADGES[i].id === id) badge = CFG.BADGES[i];
      }
      if (!badge || !this.badgeStageName) return;
      this.badgePick = badge.id;

      var best = B ? B.best(mode) : 0;
      var top = B ? B.top(mode) : null;
      var puntos = B ? B.goal(badge, mode) : badge.points;
      var got = best >= puntos;

      for (var k in this.badgeRows) {
        if (this.badgeRows.hasOwnProperty(k)) {
          var sel = (k === badge.id);
          this.badgeRows[k].classList.toggle('sel', sel);
          this.badgeRows[k].setAttribute('aria-pressed', sel ? 'true' : 'false');
        }
      }

      this.badgeStageName.textContent = badge.name;
      this.badgeStageName.style.color = got ? badge.color : '#666';
      this.badgeStageState.textContent = got
        ? (((top && top.id === badge.id) ? 'TU MAESTRÍA · ' : 'CONSEGUIDA · ') +
           puntos + ' PUNTOS')
        : ('TE FALTAN ' + (puntos - best) + ' PUNTOS PARA CONSEGUIRLA');

      if (play) this.playBadgeDemo(badge, got);
      else this.badgeRest(badge, got);
    },

    /* Reposo del escenario: tu Pac-Man con la medalla de la elegida flotando
     * encima (apagada si aún no es tuya). Así el lado derecho siempre enseña
     * algo, en vez de un hueco vacío hasta que se pulsa. */
    badgeRest: function (badge, got) {
      if (!this.badgeDemo) return;
      this.badgeDemoRun = (this.badgeDemoRun || 0) + 1;   // corta la demo en curso
      this.drawBadgeRest(badge, got);
    },

    drawBadgeRest: function (badge, got) {
      var cv = this.badgeDemo;
      if (!cv) return;
      var ctx = cv.getContext('2d');
      var k = this.badgeScale || 2;
      var s = window.PM.settings || {};
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(k, 0, 0, k, 0, -(this.badgeTop || 0) * k);
      window.PM.Sprites.drawPacman(ctx, 65, 52, CFG.DIR.RIGHT, 2,
        s.pacColor || CFG.PLAYER_COLORS[0], s.skin1 || 'clasico');
      if (badge) {
        window.PM.Sprites.drawBadge(ctx, 65, 32, 9, badge.color, !got);
      }
    },

    /* Reproduce dentro del panel la MISMA chapa de la partida: la medalla
     * sube girando desde tu Pac-Man, la chapa se despliega con un chispazo
     * y al final se encoge de vuelta. Antes aquí salía el cartel grande, que
     * no es lo que se ve jugando. */
    playBadgeDemo: function (badge, got) {
      var self = this;
      var cv = this.badgeDemo;
      if (!cv) return;
      var ctx = cv.getContext('2d');
      var total = CFG.BADGE_ANIM_TICKS;
      var S = window.PM.Sprites;
      var s = window.PM.settings || {};
      var color = s.pacColor || CFG.PLAYER_COLORS[0];
      var skin = s.skin1 || 'clasico';
      var k = this.badgeScale || 2;
      var ty = -(this.badgeTop || 0) * k;
      var PX = 65, PY = 52;                 // el jugador, en coordenadas lógicas
      // el escalón manda cuánta pompa gasta la chapa: aquí se ve la de verdad
      var rango = 0;
      for (var bi = 0; bi < CFG.BADGES.length; bi++) {
        if (CFG.BADGES[bi].id === badge.id) rango = bi;
      }
      this.badgeDemoRun = (this.badgeDemoRun || 0) + 1;
      var run = this.badgeDemoRun;
      var prev = null;
      var ticks = 0;

      function fondo() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.setTransform(k, 0, 0, k, 0, ty);  // escalado, como el juego
      }

      function frame(now) {
        if (self.badgeDemoRun !== run) return;      // otra demo la sustituyó
        if (prev === null) prev = now;
        // Avance por frame acotado: si el navegador ralentiza los frames
        // (pestaña de fondo, equipo lento) la chapa se ve entera igual,
        // sólo que más despacio, en vez de saltarse la animación.
        ticks += Math.min(6, (now - prev) / (1000 / 60));
        prev = now;
        var t = ticks / total;
        fondo();
        S.drawPacman(ctx, PX, PY, CFG.DIR.RIGHT,
          [0, 1, 2, 1][Math.floor(ticks / 4) % 4], color, skin);
        // al acabar, la medalla se queda puesta: el escenario enseña siempre
        // cuál está elegida
        if (t >= 1) { self.drawBadgeRest(badge, got); return; }
        S.drawBadgeTag(ctx, PX, PY - 11, badge.name, badge.color, t, ticks,
          rango, (window.PM.Badges && window.PM.Badges.players(self.badgeTab) > 1)
            ? window.PM.Badges.formatoName(self.badgeTab) : null);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
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
      for (var s = 0; s < secciones.length; s++) {
        var g = document.createElement('div');
        g.className = 'cifra-grupo';
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

      var cab = document.createElement('div');
      cab.className = 'perfil-cab';
      this.profAvatar = document.createElement('canvas');
      this.profAvatar.width = 72;
      this.profAvatar.height = 72;
      this.profAvatar.className = 'perfil-avatar';
      cab.appendChild(this.profAvatar);
      var datos = document.createElement('div');
      datos.className = 'perfil-datos';
      this.profName = document.createElement('div');
      this.profName.className = 'perfil-nombre';
      datos.appendChild(this.profName);
      this.profLevel = document.createElement('div');
      this.profLevel.className = 'level-label';
      datos.appendChild(this.profLevel);
      var barra = document.createElement('div');
      barra.className = 'level-bar';
      this.profFill = document.createElement('div');
      this.profFill.className = 'level-fill';
      barra.appendChild(this.profFill);
      datos.appendChild(barra);
      this.profResumen = document.createElement('div');
      this.profResumen.className = 'note';
      datos.appendChild(this.profResumen);
      cab.appendChild(datos);
      var ficha = this.optGroup(this.profPane, null, true);
      ficha.appendChild(cab);

      /* nombre de invitado: se puede cambiar y sortear */
      this.profGuestRow = document.createElement('div');
      this.profGuestRow.className = 'preset-row';
      var azar = this.makeButton('NOMBRE AL AZAR', function () {
        var s = window.PM.settings;
        s.nick1 = randomNick();
        saveSettings();
        self.refreshNicks();
        self.refreshProfile();
      });
      azar.classList.add('btn-preset');
      this.profGuestRow.appendChild(azar);
      ficha.appendChild(this.profGuestRow);

      /* Tu personaje, en pequeño. Aquí antes se elegían el avatar, el color y
       * la skin, y lo de la tienda salía en una línea: todo eso se viste ahora
       * en el VESTUARIO, y PERFIL se queda con quién eres (nombre, nivel,
       * cuenta, logros). */
      var gLook = this.optGroup(this.profPane, 'TU PERSONAJE', true);
      var lookRow = document.createElement('div');
      lookRow.className = 'perfil-personaje';
      var lookBtn = document.createElement('button');
      lookBtn.type = 'button';
      lookBtn.className = 'skin active perfil-personaje-cv';
      lookBtn.setAttribute('aria-label', 'Abrir el vestuario');
      this.profLookCv = document.createElement('canvas');
      this.profLookCv.width = 96; this.profLookCv.height = 96;
      lookBtn.appendChild(this.profLookCv);
      lookBtn.addEventListener('click', function () { self.showVestuario('skin', 'yo'); });
      lookRow.appendChild(lookBtn);
      var lookTxt = document.createElement('div');
      lookTxt.className = 'perfil-personaje-txt';
      this.profLook = document.createElement('div');
      this.profLook.className = 'note perfil-look';
      lookTxt.appendChild(this.profLook);
      this.profVestBtn = this.makeButton('ABRIR EL VESTUARIO', function () {
        self.resumeAudio();
        self.showVestuario('skin', 'yo');
      });
      this.profVestBtn.classList.add('btn-preset');
      lookTxt.appendChild(this.profVestBtn);
      lookRow.appendChild(lookTxt);
      gLook.appendChild(lookRow);

      /* cuenta */
      var gCuenta = this.optGroup(this.profPane, 'TU CUENTA');
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
      this.achSub = document.createElement('div');
      this.achSub.className = 'note';
      this.achPane.appendChild(this.achSub);
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
      this.profFill.style.width = Math.round(st.pct * 100) + '%';

      var B = window.PM.Badges;
      var top = B ? B.top('solo') : null;
      this.profResumen.textContent =
        'LOGROS ' + (A ? A.count() : 0) + '/' + (A ? A.total() : 0) +
        ' · MAESTRÍA ' + (top ? top.name : 'NINGUNA') +
        ' · RÉCORD ' + ((window.PM.Game && window.PM.Game.highScore1) || 0);

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
    achRow: function (a, p) {
      var R = window.PM.Ranking;
      var row = document.createElement('div');
      row.className = 'badge-row' + (p.hecho ? ' got' : '');

      var cv = document.createElement('canvas');
      cv.width = 34; cv.height = 34;
      cv.className = 'badge-medal';
      var c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      window.PM.Sprites.drawAchStar(c, 17, 17, 15, p.hecho ? a.color : '#333');
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
      this.achSub.textContent = 'CONSEGUIDOS ' + A.count() + ' DE ' + A.total() +
        '  ·  LO QUE JUGASTE ANTES DE QUE HUBIERA LOGROS POR MODO CUENTA COMO CLÁSICO';
      CFG.ACHIEVEMENTS.forEach(function (a) {
        this.achList.appendChild(this.achRow(a, A.progress(a, stats)));
      }, this);
    },

    /* Diálogo de entrar / crear cuenta */
    showAccountPrompt: function (modo) {
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
        onClick: function () { self.hidePrompt(); } });

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
      Ac.restore(function () { /* si falla, se sigue de invitado */ });
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
          caza: !!(d && d.caza) // y el Pac-Man de la máquina, con su reloj
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
     * Top mundial (ranking de partidas de dúo, desde Supabase)
     * ------------------------------------------------------ */
    buildRanking: function () {
      var self = this;
      var o = this.els.ranking;
      o.innerHTML = '';

      var h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = 'TOP MUNDIAL';
      o.appendChild(h);

      /* Clasificaciones separadas. Los identificadores 1..4 son EL NÚMERO DE
       * JUGADORES (una clasificación por formato, como las maestrías); el 5 es
       * la del nivel 1 y el 0 es tu historial de este navegador, que no toca
       * la red. El 6 era la del RETO DE HOY, que se retiró con el modo. */
      var bar = document.createElement('div');
      bar.className = 'tab-row';
      this.rankTabBtns = {};
      [[1, 'INDIVIDUAL'], [2, 'DÚO'], [3, 'TRÍO'], [4, 'ESCUADRA'],
       [5, 'NIVEL 1'], [0, 'TUS PARTIDAS']].forEach(function (t) {
        var b = self.makeButton(t[1], function () { self.showRankTab(t[0]); });
        b.classList.add('tab');
        self.rankTabBtns[t[0]] = b;
        bar.appendChild(b);
      });
      o.appendChild(bar);

      /* Segunda fila: la temporada. Solo pinta en las clasificaciones por
       * puntos (1..4), que son las que se reparten por meses; el resto no
       * tiene temporada que valga (el nivel 1 es de siempre). */
      this.seasonRow = document.createElement('div');
      this.seasonRow.className = 'tab-row';
      this.seasonBtns = {};
      [['ahora', 'ESTA TEMPORADA'], ['historico', 'HISTÓRICO']].forEach(function (t) {
        var b = self.makeButton(t[1], function () { self.showSeasonTab(t[0]); });
        b.classList.add('tab');
        self.seasonBtns[t[0]] = b;
        self.seasonRow.appendChild(b);
      });
      o.appendChild(this.seasonRow);
      this.seasonTab = 'ahora';

      this.rankSub = document.createElement('div');
      this.rankSub.className = 'note';
      o.appendChild(this.rankSub);

      this.rankStatus = document.createElement('div');
      this.rankStatus.className = 'lobby-status';
      o.appendChild(this.rankStatus);

      this.rankList = document.createElement('div');
      this.rankList.className = 'rank-list';
      o.appendChild(this.rankList);

      var row = document.createElement('div');
      row.className = 'preset-row';
      row.style.marginTop = '12px';
      var reload = this.makeButton('ACTUALIZAR', function () { self.loadRanking(); });
      reload.classList.add('btn-preset');
      row.appendChild(reload);
      var back = this.makeButton('VOLVER', function () { self.showMenu(); });
      back.classList.add('btn-preset');
      row.appendChild(back);
      o.appendChild(row);

      this.rankTab = 1;
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

    loadRanking: function () {
      var self = this;
      var R = window.PM.Ranking;
      var S = window.PM.Season;
      var players = this.rankTab;
      if ([0, 2, 3, 4, 5].indexOf(players) === -1) players = 1;
      for (var k in this.rankTabBtns) {
        if (this.rankTabBtns.hasOwnProperty(k)) {
          this.rankTabBtns[k].classList.toggle('active', +k === players);
        }
      }
      /* la fila de temporada solo tiene sentido en las de puntos (1..4) */
      var porTemporada = (players >= 1 && players <= 4);
      var enTemporada = porTemporada && this.seasonTab === 'ahora' && S;
      if (this.seasonRow) {
        this.seasonRow.style.display = porTemporada ? 'flex' : 'none';
        for (var s in this.seasonBtns) {
          if (this.seasonBtns.hasOwnProperty(s)) {
            this.seasonBtns[s].classList.toggle('active', s === this.seasonTab);
          }
        }
      }
      var temporada = S ? S.nombre(S.actual()) : '';
      var EQUIPO = { 2: 'DÚO', 3: 'TRÍO', 4: 'ESCUADRA' };
      var H = window.PM.History;
      var conCuenta = !!(H && H.cuenta && H.cuenta());
      this.rankSub.textContent =
        players === 0 ? ('TUS ÚLTIMAS PARTIDAS · ' + (conCuenta
          ? 'TAMBIÉN LAS DE OTROS APARATOS' : 'SOLO LAS DE ESTE NAVEGADOR')) :
        players === 5 ? 'LO MÁS RÁPIDO EN DESPEJAR EL NIVEL 1 · A UN JUGADOR Y CON LOS AJUSTES DE SIEMPRE' :
        (players === 1 ? 'MEJOR MARCA DE CADA JUGADOR'
          : ('MEJOR MARCA DE CADA ' + EQUIPO[players] +
             ' · PUNTUACIÓN DE EQUIPO')) +
        (enTemporada ? (' · ' + temporada) : ' · DESDE EL PRINCIPIO');
      this.rankList.innerHTML = '';
      this.rankReq = (this.rankReq || 0) + 1;   // corta respuestas en vuelo

      /* TUS PARTIDAS: primero las de este navegador, que están ya y no
       * dependen de nada. Con cuenta se piden además las que quedaron en el
       * top mundial —las que jugaste en otro aparato— y la lista se rehace
       * con las dos mezcladas. Sin cuenta, ni se intenta: un nombre suelto no
       * identifica a nadie y traeríamos las partidas de otro. */
      if (players === 0) {
        var hist = H ? H.all() : [];
        var reqLocal = this.rankReq;
        this.rankStatus.classList.remove('error');
        this.rankStatus.textContent = hist.length
          ? '' : 'AÚN NO HAS JUGADO NINGUNA PARTIDA';
        this.renderHistory(hist);
        if (conCuenta && H.configured()) {
          if (!hist.length) this.rankStatus.textContent = 'CARGANDO...';
          H.list(function (err, lista) {
            if (self.rankReq !== reqLocal) return;    // se cambió de pestaña
            self.renderHistory(lista);
            self.rankStatus.classList.toggle('error', !!err);
            self.rankStatus.textContent =
              err ? ('SOLO LAS DE ESTE NAVEGADOR: ' + err) :
              lista.length ? '' : 'AÚN NO HAS JUGADO NINGUNA PARTIDA';
          });
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
      /* testigo de petición: al cambiar de pestaña rápido, la respuesta de la
       * anterior puede llegar después y pisar la lista o el mensaje */
      var req = (this.rankReq || 0) + 1;
      this.rankReq = req;
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
        if (!rows.length) {
          self.rankStatus.textContent =
            (players === 5) ? 'AÚN NADIE HA CRONOMETRADO EL NIVEL 1 · ¡SÉ EL PRIMERO!' :
            enTemporada ? 'AÚN NO HAY PARTIDAS ESTA TEMPORADA · ¡SÉ EL PRIMERO!'
                        : 'AÚN NO HAY PARTIDAS · ¡SÉ EL PRIMERO!';
          return;
        }
        self.rankStatus.textContent = '';
        /* verse en el top 10 individual de siempre abre DORADO */
        if (players === 1 && !enTemporada && window.PM.Skins) {
          window.PM.Skins.anotarTop10(rows);
        }
        if (players === 5) self.renderTimes(rows);
        else self.renderRanking(rows);
      }
      if (players === 5) R.topTime(llegaron);
      else if (enTemporada) S.top(S.actual(), players, llegaron);
      else R.top(players, llegaron);
    },

    /* Los más rápidos en despejar el nivel 1 */
    renderTimes: function (rows) {
      var R = window.PM.Ranking;
      var mine = String(window.PM.settings.nick1 || '').toUpperCase();
      this.rankList.innerHTML = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var n1 = String(r.nombre1 || '').toUpperCase();
        var row = document.createElement('div');
        row.className = 'rank-row';
        if (mine && n1 === mine) row.classList.add('mine');

        var pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = (i + 1) + '.';
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
        row.appendChild(pts);

        this.rankList.appendChild(row);
      }
    },

    /* Tus últimas partidas (localStorage), lo más reciente primero */
    renderHistory: function (list) {
      var H = window.PM.History;
      this.rankList.innerHTML = '';
      for (var i = 0; i < list.length; i++) {
        var h = list[i];
        var row = document.createElement('div');
        row.className = 'rank-row';

        var pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = H ? H.fmtDate(h.t) : '';
        pos.style.textAlign = 'left';
        pos.style.width = 'auto';
        row.appendChild(pos);

        var who = document.createElement('span');
        who.className = 'rank-who';
        // con tres y cuatro no caben todos los nombres: el tuyo y cuántos erais
        who.textContent = (h.j === 2) ? (h.n1 + ' + ' + h.n2)
          : (h.j > 2) ? (h.n1 + ' +' + (h.j - 1)) : h.n1;
        row.appendChild(who);

        var pts = document.createElement('span');
        pts.className = 'rank-pts';
        pts.textContent = String(h.p);
        row.appendChild(pts);

        var lvl = document.createElement('span');
        lvl.className = 'rank-lvl';
        lvl.textContent = 'NIV ' + h.lv + (h.m === 'online' ? ' · ONLINE' : '');
        row.appendChild(lvl);

        /* si esa partida dejó repetición guardada, se puede volver a ver.
         * Las de online se graban de otra manera (el flujo del anfitrión) y
         * viven en su propio almacén, pero desde aquí se ven igual. */
        var R = window.PM.Replay;
        var reg = (R && R.paraPartida) ? R.paraPartida(h) : null;
        var red = null;
        if (!reg) red = (R && R.paraPartidaRed) ? R.paraPartidaRed(h) : null;
        if (reg || red) {
          row.appendChild(this.makeReplayBtn((reg || red).id, !reg));
          row.appendChild(this.makeShareBtn((reg || red).id, !reg));
        }

        this.rankList.appendChild(row);
      }
    },

    /* Botón VER de una partida con repetición guardada (js/replay.js) */
    makeReplayBtn: function (id, deRed) {
      var b = this.makeButton('VER', function () {
        if (deRed) window.PM.Replay.verRedGuardada(id);
        else window.PM.Replay.verGuardada(id);
      });
      return this.chico(b);
    },

    /* Y el de COMPARTIR, que es donde se nota la diferencia entre las dos:
     * la local cabe entera en la URL y el enlace se hace aquí mismo, sin
     * servidor; la de red se sube y el enlace lleva solo su código. Para quien
     * lo recibe son lo mismo, que es de lo que se trata. */
    makeShareBtn: function (id, deRed) {
      var self = this;
      var b = this.makeButton('COMPARTIR', function () {
        var R = window.PM.Replay;
        if (!R) return;
        if (!deRed) {
          var reg = R.porId(id);
          var url = reg ? R.enlace(reg.s) : '';
          if (!url) { self.showShareError('ESA REPETICIÓN YA NO ESTÁ'); return; }
          self.showSharePrompt(url, false);
          return;
        }
        self.showPrompt({
          title: 'COMPARTIR REPETICIÓN',
          color: '#7ec8ff',
          lines: ['SUBIENDO LA PARTIDA...'],
          buttons: []
        });
        R.compartirRed(id, function (err, url) {
          if (err) { self.showShareError(err); return; }
          self.showSharePrompt(url, true);
        });
      });
      return this.chico(b);
    },

    /* Botón de fila: el mismo estilo para VER y COMPARTIR */
    chico: function (b) {
      b.classList.add('tab');
      b.style.padding = '4px 10px';
      b.style.fontSize = '10px';
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

    renderRanking: function (rows) {
      var R = window.PM.Ranking;
      var mine = String(window.PM.settings.nick1 || '').toUpperCase();
      this.rankList.innerHTML = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        // los que jugaron, sean uno o cuatro
        var nombres = R ? R.nombresDe(r) : [String(r.nombre1 || '').toUpperCase()];
        var row = document.createElement('div');
        row.className = 'rank-row';
        if (mine && nombres.indexOf(mine) !== -1) row.classList.add('mine');

        var pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = (i + 1) + '.';
        row.appendChild(pos);

        var who = document.createElement('span');
        who.className = 'rank-who';
        who.textContent = nombres.join(' + ');
        row.appendChild(who);

        var pts = document.createElement('span');
        pts.className = 'rank-pts';
        pts.textContent = String(r.puntos);
        row.appendChild(pts);

        var lvl = document.createElement('span');
        lvl.className = 'rank-lvl';
        lvl.textContent = 'NIV ' + r.nivel + (r.modo === 'online' ? ' · ONLINE' : '');
        row.appendChild(lvl);

        this.rankList.appendChild(row);
      }
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
        'APARTE: EL LABERINTO DE 1980 NO SE TOCA, ASÍ QUE ESTAS PARTIDAS NO ' +
        'ENTRAN EN EL TOP MUNDIAL — PERO SÍ SUMAN EXPERIENCIA.';
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
        if (b.keys) self.promptKeys.push({ keys: b.keys, el: el });
        row.appendChild(el);
      });
      p.appendChild(row);

      p.classList.toggle('solid', !!o.solid);
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
      else if (g.overIdle && !g.overWait) this.showGameOverPrompt();
      else if (g.paused && g.inGame() && g.state !== 'GAME_OVER') this.showPausePrompt();
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
          color: '#7ec8ff',
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
        lines.push('GUARDAR Y SALIR LA DEJA COMO ESTÁ PARA SEGUIRLA LUEGO, AQUÍ O EN OTRO APARATO.');
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
        botones.push({ label: 'GUARDAR Y SALIR', hint: 'G', keys: ['g'],
          onClick: function () {
            if (!Gd.guardarYSalir()) return;    // no se pudo: se sigue en pausa
            self.hidePrompt();
            self.showMenu();
          } });
      }
      botones.push({ label: 'SALIR', hint: 'Q', keys: ['q'],
        onClick: function () { g.toMenu(); } });
      this.showPrompt({
        title: 'PAUSA',
        color: '#ffff00',
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
          color: tx.color,
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
        color: tx.color,
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
        window.PM.Sprites.drawAchStar(c, 9, 9, 8, a.color);
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
        if (g.missingRankingName()) {
          lines.push(g.playerCount > 1
            ? 'PARA ENTRAR EN EL TOP MUNDIAL, TODOS NECESITÁIS NOMBRE'
            : 'PON TU NOMBRE PARA ENTRAR EN EL TOP MUNDIAL');
        } else if (g.badRankingName()) {
          lines.push('ESE NOMBRE NO ENTRA EN EL TOP MUNDIAL: ELIGE OTRO');
        }
      }
      return lines;
    },

    showGameOverPrompt: function () {
      var self = this;
      var g = window.PM.Game;
      var duo = (g.playerCount > 1);      // "otra partida" con la misma gente
      var versus = !!(g.isVersus && g.isVersus() && window.PM.Versus);
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
          window.PM.Hab.pulsar(g, self.habIdxDe(gi), k);
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
        var st = A.estado(idx);
        if (st) {
          var esFantasma = (lista === CFG.HAB.LIST_G);
          grupo.btns[0].b.classList.toggle('activa', esFantasma && st.carga > 0);
          grupo.btns[1].b.classList.toggle('activa',
            esFantasma ? st.acecho > 0 : st.turbo > 0);
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
      // el canal personal va atado al nombre: si se ha cambiado, se rehace
      if (window.PM.Party) window.PM.Party.listen();
      this.showPanel('menu');
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
      this.showPrompt({
        title: '¡SUBES DE NIVEL!',
        color: '#00ffff',
        lines: [
          { text: 'NIVEL ' + lv, big: true },
          s ? ('SIGUIENTE: ' + s.inLevel + ' / ' + s.needed + ' PUNTOS') : ''
        ],
        buttons: [
          { label: 'SEGUIR', primary: true, keys: ['Enter', 'Escape', ' '],
            hint: 'ENTER', onClick: function () { self.hidePrompt(); } }
        ]
      });
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
          var opts = { players: jugadores, hab: true };
          if (jugadores === 2) opts.ghosts = [-1, s.vsGhost2];
          window.PM.Game.newGame(opts);
        }
        if (self.avisaSiHayGuardada(go)) return;
        go();
      }

      this.showPrompt({
        title: 'DESATADO',
        color: '#ff66cc',
        lines: [
          'EL LABERINTO DE SIEMPRE CON CUATRO PODERES. CADA UNO CON SU TECLA Y SU RECARGA',
          'MORDISCO · TE COMES AL FANTASMA QUE TENGAS PEGADO, MIRES HACIA DONDE MIRES (' +
            H.segs(0) + 'S)',
          'TURBO · X1.5 DE VELOCIDAD DURANTE ' + (H.TURBO_TICKS / 60) +
            'S (' + H.segs(1) + 'S)',
          'FLASH · ' + H.FLASH_TILES +
            ' CASILLAS ATRAVESANDO MUROS HACIA LA ÚLTIMA FLECHA QUE PULSES, MIRE PAC-MAN DONDE MIRE, COMIENDO LO QUE PILLES (' +
            H.segs(2) + 'S)',
          'GRITO · LOS CUATRO FANTASMAS SE ASUSTAN ' + H.SHOUT_SECS +
            'S SIN SUPERPASTILLA (' + H.segs(3) + 'S)',
          'SOLO: FLECHAS PARA MOVERTE Y Q W E R PARA LOS PODERES (AQUÍ WASD NO MUEVE: LA W ES EL TURBO)',
          /* Con dos, las teclas cambian y hay que decirlo ANTES de empezar: es
           * la única pantalla donde se pueden leer, y una partida en la que no
           * sabes qué tecla es la tuya dura diez segundos. */
          'DOS JUGADORES: J1 CON FLECHAS Y ' + t2[0].join(' ') +
            '  ·  J2 CON WASD Y ' + t2[1].join(' '),
          conFantasma
            ? ('EL J2 LLEVA A ' + CFG.VS.NAMES[s.vsGhost2] +
               ': SUS DOS PODERES SON ' + t2[1][0] + ' EMBESTIDA (X' +
               H.CHARGE_MULT + ' ' + (H.CHARGE_TICKS / 60) + 'S) Y ' + t2[1][1] +
               ' ACECHO (' + (H.STALK_TICKS / 60) +
               'S TRANSLÚCIDO Y SIN MARCA ENCIMA)')
            : 'EN OPCIONES · PARTIDA PUEDES PONER AL J2 A LLEVAR UN FANTASMA: ENTONCES TIENE SUS PROPIOS PODERES',
          'ES UN MODO APARTE, ASÍ QUE ESTAS PARTIDAS NO ENTRAN EN EL TOP MUNDIAL NI HACEN RÉCORD — PERO SÍ SUMAN EXPERIENCIA Y LOGROS',
          'EN PARTY LO JUEGA TODO EL GRUPO: LO ENCIENDE QUIEN MANDA, EN EL PANEL DE ONLINE'
        ],
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
        color: '#ffb8ff',
        lines: [
          'AQUÍ EL FANTASMA ERES TÚ. EL PAC-MAN LO LLEVA LA MÁQUINA: COME, HUYE Y SE DEFIENDE',
          'NO HAY SUPERPASTILLAS. SU PODER LLEGA SOLO CADA ' + Z.periodo(0) +
            'S Y DURA ' + Z.duracion(0) + 'S; SE AVISA ' + Z.AVISO +
            'S ANTES CON UN ARO Y UNA CUENTA ATRÁS: SUELTA LA PRESA Y APÁRTATE',
          'CADA VEZ QUE LO CAZAS SON ' + CFG.VS.CATCH_POINTS +
            ' PUNTOS. SI SE QUEDA SIN VIDAS, GANÁIS; SI DESPEJA ' + Z.NIVELES +
            ' RONDAS, GANA ÉL. CADA RONDA EL PODER DURA MÁS Y LLEGA ANTES',
          'SOLO: LLEVAS A BLINKY (FLECHAS O WASD) Y LOS OTROS TRES LOS LLEVA LA MÁQUINA',
          'DOS JUGADORES: J1 BLINKY CON FLECHAS · J2 PINKY CON WASD',
          'UN FANTASMA NO DA MARCHA ATRÁS: CIÉRRALE EL PASILLO ENTRE VARIOS, QUE CORRIENDO DETRÁS NO SE PILLA',
          'NO ENTRA EN EL TOP MUNDIAL NI HACE RÉCORD, PERO SUMA EXPERIENCIA Y TIENE SUS LOGROS',
          'EN PARTY (HASTA 4): LO ENCIENDE QUIEN MANDA, EN EL PANEL DE ONLINE'
        ],
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
      // y si tienes alguna, se celebra sola al abrir el panel
      var top = window.PM.Badges ? window.PM.Badges.top(this.badgeTab) : null;
      if (top) this.pickBadge(top.id, true);
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
              window.PM.Hab.pulsar(g, quien, cual);
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
            if (self.ficha) {
              self.cerrarFicha();     // la ficha va encima: se cierra ella sola
            } else if (self.els.online.style.display !== 'none') {
              self.showMenu();      // salir del panel no deshace la party
            } else if (self.els.vestuario && self.els.vestuario.style.display !== 'none') {
              self.closeVestuario();  // vuelve a PERFIL, OPCIONES o la TIENDA si vino de ahí
            } else if (self.els.tienda && self.els.tienda.style.display !== 'none') {
              self.closeTienda();   // ídem, a donde se abrió
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
