/* ============================================================
 * PAC-MAN TOP MUNDIAL — js/account.js
 * Cuentas de jugador. Define window.PM.Account
 *
 * Usa Supabase Auth por REST (sin librerías, como el resto del
 * proyecto). El jugador solo ve USUARIO y CONTRASEÑA: el correo
 * que pide Supabase se compone por dentro con el usuario y un
 * dominio propio, y no se enseña ni se escribe en ninguna parte.
 *
 * El usuario es TAMBIÉN el nombre dentro del juego. Así no hay dos
 * nombres que cuadrar: el ranking, la party, las invitaciones y los
 * amigos ya iban todos por el nombre.
 *
 * Qué se guarda en la nube (tabla `perfiles`): avatar, experiencia,
 * los CUATRO récords —solo, dúo, trío y escuadra, uno por formato—,
 * el mejor tiempo del nivel 1 y los contadores de los logros. Al
 * entrar se FUNDE con lo de este navegador quedándose con lo mejor
 * de cada lado, así que nunca se pierde lo jugado de invitado ni lo
 * jugado en otro sitio.
 *
 * De ahí salen también las maestrías: cada ruta se deduce del récord
 * de su formato, así que llevándose los récords se llevan las
 * insignias sin guardar ni una lista.
 *
 * IMPORTANTE: el proyecto de Supabase necesita el proveedor Email
 * activo, el alta de usuarios permitida y "Confirm email" APAGADO;
 * si no, el registro no devuelve sesión (el correo es interno y el
 * enlace de confirmación no llega a ninguna parte).
 * ============================================================ */
(function () {
  'use strict';
  var CFG = window.PM.CFG;
  var AC = CFG.ACCOUNT;

  function cfg() { return window.PM.NET_CFG || {}; }

  /* Nombre de usuario: mismo saneado que los nombres del juego */
  function cleanUser(v) {
    return String(v == null ? '' : v).toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CFG.NICK_MAX);
  }

  function mailFor(user) {
    return cleanUser(user).toLowerCase() + '@' + AC.MAIL_DOMAIN;
  }

  function authHeaders(token) {
    var k = cfg().SUPABASE_KEY;
    var h = {
      'apikey': k,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    h['Authorization'] = 'Bearer ' + (token || k);
    return h;
  }

  function base(path) {
    return String(cfg().SUPABASE_URL || '').replace(/\/+$/, '') + path;
  }

  /* Mensajes de Supabase -> algo que se entienda en la pantalla */
  function traduce(msg, code) {
    var m = String(msg || '').toLowerCase();
    if (code === 'email_provider_disabled' || /signups are disabled/.test(m)) {
      return 'EL REGISTRO ESTÁ CERRADO EN EL SERVIDOR';
    }
    if (/already registered|already been registered/.test(m)) {
      return 'ESE USUARIO YA EXISTE';
    }
    if (/invalid login credentials/.test(m)) return 'USUARIO O CONTRASEÑA MAL';
    if (/email not confirmed/.test(m)) return 'LA CUENTA ESTÁ SIN CONFIRMAR';
    if (/password should be at least|weak password/.test(m)) {
      return 'CONTRASEÑA DEMASIADO CORTA';
    }
    if (/rate limit|too many/.test(m)) return 'DEMASIADOS INTENTOS: ESPERA UN POCO';
    return 'NO SE PUDO: ' + (msg || 'ERROR');
  }

  function post(path, body, token) {
    return fetch(base(path), {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (d) {
        if (!res.ok) {
          var e = new Error(traduce(d.msg || d.error_description || d.error,
                                    d.error_code));
          throw e;
        }
        return d;
      });
    });
  }

  /* GET a la tabla de perfiles. `hacerUrl(columnas)` monta la consulta.
   * Si el proyecto todavía no tiene las columnas de trío y escuadra (falta
   * correr supabase/cuentas.sql), PostgREST responde 400 nombrándolas: se
   * apunta y se repite la consulta sin ellas, una sola vez. */
  function pedirPerfiles(self, hacerUrl, fallo, cb) {
    function intenta() {
      fetch(hacerUrl(self.perfilCols()), { headers: authHeaders(self.token) })
        .then(function (res) {
          return res.text().then(function (t) {
            if (!res.ok) {
              if (!self.sinRecordsNuevos && /record3|record4/i.test(t)) {
                self.sinRecordsNuevos = true;
                intenta();
                return null;
              }
              throw new Error(fallo);
            }
            return JSON.parse(t);
          });
        })
        .then(function (rows) { if (rows) cb(null, rows); })
        .catch(function () { cb(fallo, null); });
    }
    intenta();
  }

  var Account = {
    user: null,        // { id, usuario, avatar }
    token: null,       // access token en memoria (no se guarda)
    onchange: null,    // la UI se engancha aquí

    configured: function () {
      var c = cfg();
      return !!(c.SUPABASE_URL && c.SUPABASE_KEY && window.fetch);
    },

    logged: function () { return !!(this.user && this.token); },
    name: function () { return this.user ? this.user.usuario : ''; },

    changed: function () { if (this.onchange) this.onchange(); },

    /* ---------- sesión guardada ---------- */
    saveSession: function (refresh) {
      try {
        if (refresh) localStorage.setItem(AC.KEY, refresh);
        else localStorage.removeItem(AC.KEY);
      } catch (e) { /* sin almacenamiento */ }
    },

    savedSession: function () {
      try { return localStorage.getItem(AC.KEY) || null; }
      catch (e) { return null; }
    },

    /* Guarda tokens y deja la sesión lista. cb(err) */
    accept: function (d, usuario, cb) {
      var self = this;
      if (!d || !d.access_token) {
        // sin sesión = el proyecto pide confirmar el correo
        cb('LA CUENTA NECESITA CONFIRMACIÓN: AVISA AL ADMINISTRADOR');
        return;
      }
      this.token = d.access_token;
      this.saveSession(d.refresh_token || null);
      this.user = { id: (d.user && d.user.id) || '', usuario: cleanUser(usuario),
                    avatar: 'pac' };
      this.sync(function (err) {
        self.changed();
        cb(err || null);
      });
    },

    /* ---------- alta, entrada y salida ---------- */
    signUp: function (usuario, pass, cb) {
      var self = this;
      var u = cleanUser(usuario);
      if (u.length < AC.USER_MIN) {
        cb('EL USUARIO NECESITA AL MENOS ' + AC.USER_MIN + ' LETRAS');
        return;
      }
      if (String(pass || '').length < AC.PASS_MIN) {
        cb('LA CONTRASEÑA NECESITA AL MENOS ' + AC.PASS_MIN + ' CARACTERES');
        return;
      }
      if (!this.configured()) { cb('SIN CONEXIÓN'); return; }
      post('/auth/v1/signup', { email: mailFor(u), password: String(pass) })
        .then(function (d) { self.accept(d, u, cb); })
        .catch(function (e) { cb(e.message); });
    },

    signIn: function (usuario, pass, cb) {
      var self = this;
      var u = cleanUser(usuario);
      if (!u || !pass) { cb('ESCRIBE USUARIO Y CONTRASEÑA'); return; }
      if (!this.configured()) { cb('SIN CONEXIÓN'); return; }
      post('/auth/v1/token?grant_type=password',
           { email: mailFor(u), password: String(pass) })
        .then(function (d) { self.accept(d, u, cb); })
        .catch(function (e) { cb(e.message); });
    },

    /* Al arrancar: si había sesión guardada, se renueva sin molestar */
    restore: function (cb) {
      var self = this;
      var refresh = this.savedSession();
      if (!refresh || !this.configured()) { if (cb) cb('SIN SESIÓN'); return; }
      post('/auth/v1/token?grant_type=refresh_token', { refresh_token: refresh })
        .then(function (d) {
          if (!d || !d.access_token) throw new Error('SESIÓN CADUCADA');
          self.token = d.access_token;
          self.saveSession(d.refresh_token || refresh);
          self.user = { id: (d.user && d.user.id) || '', usuario: '', avatar: 'pac' };
          self.sync(function (err) {
            self.changed();
            if (cb) cb(err || null);
          });
        })
        .catch(function () {
          self.saveSession(null);
          self.token = null;
          self.user = null;
          if (cb) cb('SESIÓN CADUCADA');
        });
    },

    signOut: function (cb) {
      var self = this;
      var token = this.token;
      this.token = null;
      this.user = null;
      this.saveSession(null);
      this.changed();
      if (token) {
        fetch(base('/auth/v1/logout'), {
          method: 'POST', headers: authHeaders(token)
        }).catch(function () { /* da igual: la sesión local ya se fue */ });
      }
      if (cb) cb(null);
    },

    /* ---------- perfil ---------- */
    /* Columnas de récord, una por formato (record1..record4) */
    recordCols: ['record1', 'record2', 'record3', 'record4'],

    /* Proyecto de Supabase sin las columnas de trío y escuadra: se descubre
     * solo a la primera respuesta que las eche en falta (ver pedirPerfiles y
     * push). No se guarda en ningún sitio: se vuelve a probar en cada sesión,
     * así que en cuanto se corra el SQL las columnas vuelven solas. */
    sinRecordsNuevos: false,

    /* Columnas públicas de un perfil */
    perfilCols: function () {
      var c = 'usuario,avatar,xp,record1,record2,tiempo1,logros';
      return this.sinRecordsNuevos ? c : c + ',record3,record4';
    },

    /* Estado local que viaja a la nube */
    localState: function () {
      var g = window.PM.Game || {};
      var s = window.PM.settings || {};
      var A = window.PM.Achievements;
      var o = {
        avatar: s.avatar || 'pac',
        xp: (window.PM.Level ? window.PM.Level.xp() : 0),
        tiempo1: (A ? (A.stats().mejorT1 || null) : null) || null,
        logros: A ? A.stats() : {}
      };
      // los cuatro récords: solo, dúo, trío y escuadra
      for (var n = 1; n <= this.recordCols.length; n++) {
        o[this.recordCols[n - 1]] = (g.recordFor ? g.recordFor(n) : 0) || 0;
      }
      /* Si este proyecto de Supabase todavía no tiene las columnas de trío y
       * escuadra (falta correr supabase/cuentas.sql), se mandan sin ellas: más
       * vale guardar lo de siempre que no guardar nada. Se reintenta en cada
       * sesión, así que en cuanto el SQL esté puesto vuelven solas. */
      if (this.sinRecordsNuevos) {
        delete o.record3;
        delete o.record4;
      }
      return o;
    },

    /* Trae el perfil, lo funde con lo de aquí y devuelve lo fundido arriba.
     * Es lo que hace que entrar en la cuenta nunca cueste progreso. */
    sync: function (cb) {
      var self = this;
      if (!this.logged()) { if (cb) cb('SIN SESIÓN'); return; }
      var url = base('/rest/v1/' + AC.TABLE + '?select=*&id=eq.' + this.user.id);
      fetch(url, { headers: authHeaders(this.token) })
        .then(function (res) { return res.json(); })
        .then(function (rows) {
          var fila = (rows && rows.length) ? rows[0] : null;
          if (fila) self.applyRemote(fila);
          return self.push(true);
        })
        .then(function () { if (cb) cb(null); })
        .catch(function (e) { if (cb) cb(e.message || 'NO SE PUDO SINCRONIZAR'); });
    },

    /* Lo de la nube entra en este navegador SIN pisar lo mejor de aquí */
    applyRemote: function (fila) {
      var s = window.PM.settings || {};
      var g = window.PM.Game;
      this.user.usuario = cleanUser(fila.usuario) || this.user.usuario;
      if (fila.avatar && CFG.AVATAR_IDS.indexOf(fila.avatar) !== -1) {
        this.user.avatar = fila.avatar;
        s.avatar = fila.avatar;
      }
      if (window.PM.Level) window.PM.Level.setAtLeast(fila.xp);
      if (g && g.recordFor) {
        /* Los cuatro récords, uno por formato. Se queda el mejor de cada
         * lado: entrar en la cuenta desde otro navegador nunca cuesta
         * progreso, y lo de aquí tampoco se pisa. */
        var cambio = false;
        for (var n = 1; n <= this.recordCols.length; n++) {
          var v = parseInt(fila[this.recordCols[n - 1]], 10) || 0;
          if (v > g.recordFor(n)) {
            g.setRecordFor(n, v);
            cambio = true;
          }
        }
        if (cambio && g.saveHighScores) g.saveHighScores();
        // los récords traídos pueden regalar maestrías: que no se anuncien
        if (cambio && window.PM.Badges) window.PM.Badges.syncSeen();
      }
      if (window.PM.Achievements) {
        window.PM.Achievements.merge(fila.logros || {});
        window.PM.Achievements.syncSeen();   // lo traído no se celebra
      }
      // el nombre del juego pasa a ser el de la cuenta
      s.nick1 = this.user.usuario;
      if (window.PM.UI && window.PM.UI.saveSettings) window.PM.UI.saveSettings();
    },

    /* Sube el estado de aquí. `callado` = no avisar a la UI. */
    push: function (callado, cb) {
      var self = this;
      if (!this.logged()) {
        if (cb) cb('SIN SESIÓN');
        return Promise.resolve();
      }
      var row = this.localState();
      row.id = this.user.id;
      row.usuario = this.user.usuario;
      var h = authHeaders(this.token);
      h['Prefer'] = 'resolution=merge-duplicates,return=minimal';
      return fetch(base('/rest/v1/' + AC.TABLE), {
        method: 'POST', headers: h, body: JSON.stringify(row)
      }).then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            /* ¿La tabla es de antes de trío y escuadra? Se apunta y se
             * reintenta una vez sin esas dos columnas: que falte una puesta
             * al día del servidor no puede costarle a nadie el récord de
             * siempre. Al volver a entrar se prueba otra vez con todo. */
            if (!self.sinRecordsNuevos && /record3|record4/i.test(t)) {
              self.sinRecordsNuevos = true;
              return self.push(callado, cb);
            }
            throw new Error(/duplicate|unique/i.test(t)
              ? 'ESE USUARIO YA EXISTE' : 'NO SE PUDO GUARDAR');
          });
        }
        if (!callado) self.changed();
        if (cb) cb(null);
      }).catch(function (e) {
        if (cb) cb(e.message);
        else throw e;
      });
    },

    /* Guardado silencioso al acabar una partida: si falla, da igual */
    pushQuiet: function () {
      if (!this.logged()) return;
      this.push(true).catch(function () { /* ya se subirá */ });
    },

    /* ---------- amigos (solo con cuenta) ---------- */
    /* Perfil PÚBLICO de cualquier jugador, por su nombre.
     *
     * La tabla `perfiles` se puede leer sin sesión (así se puede mirar el
     * perfil de un amigo o saber si un nombre está cogido); escribir, solo la
     * fila de uno mismo. Devuelve null si ese nombre no tiene cuenta. */
    fetchProfile: function (usuario, cb) {
      var n = cleanUser(usuario);
      if (!this.configured()) { cb('LAS CUENTAS NECESITAN CONEXIÓN', null); return; }
      if (!n) { cb('NOMBRE NO VÁLIDO', null); return; }
      pedirPerfiles(this, function (cols) {
        return base('/rest/v1/' + AC.TABLE +
          '?usuario=eq.' + encodeURIComponent(n) +
          '&select=' + cols + ',creado_en&limit=1');
      }, 'NO SE PUDO CARGAR EL PERFIL', function (err, rows) {
        if (err) { cb(err, null); return; }
        cb(null, (rows && rows.length) ? rows[0] : null);
      });
    },

    /* Los perfiles de varios de golpe, para la lista de amigos: una sola
     * petición en vez de una por cabeza. Devuelve { NOMBRE: fila }, sin los
     * que todavía no tengan cuenta. */
    fetchProfiles: function (nombres, cb) {
      var lista = [], i, n;
      for (i = 0; i < (nombres || []).length; i++) {
        n = cleanUser(nombres[i]);
        if (n && lista.indexOf(n) === -1) lista.push(n);
      }
      if (!this.configured() || !lista.length) { cb(null, {}); return; }
      pedirPerfiles(this, function (cols) {
        return base('/rest/v1/' + AC.TABLE +
          '?usuario=in.(' + encodeURIComponent(lista.join(',')) + ')' +
          '&select=' + cols);
      }, 'NO SE PUDIERON CARGAR LOS PERFILES', function (err, rows) {
        if (err) { cb(err, null); return; }
        var out = {};
        for (var j = 0; j < (rows || []).length; j++) {
          out[rows[j].usuario] = rows[j];
        }
        cb(null, out);
      });
    },

    listFriends: function (cb) {
      if (!this.logged()) { cb('NECESITAS UNA CUENTA', null); return; }
      var url = base('/rest/v1/' + AC.FRIENDS_TABLE +
                     '?select=amigo&order=amigo.asc');
      fetch(url, { headers: authHeaders(this.token) })
        .then(function (res) { return res.json(); })
        .then(function (rows) {
          var out = [];
          for (var i = 0; i < (rows || []).length; i++) out.push(rows[i].amigo);
          cb(null, out);
        })
        .catch(function () { cb('NO SE PUDO CARGAR LA LISTA', null); });
    },

    addFriend: function (nombre, cb) {
      var n = cleanUser(nombre);
      if (!this.logged()) { cb('NECESITAS UNA CUENTA'); return; }
      if (!n) { cb('ESCRIBE UN NOMBRE'); return; }
      if (n === this.name()) { cb('ESE ERES TÚ'); return; }
      var h = authHeaders(this.token);
      h['Prefer'] = 'return=minimal';
      fetch(base('/rest/v1/' + AC.FRIENDS_TABLE), {
        method: 'POST', headers: h,
        body: JSON.stringify({ de: this.user.id, amigo: n })
      }).then(function (res) {
        if (res.ok) { cb(null); return; }
        return res.text().then(function (t) {
          cb(/duplicate|unique/i.test(t) ? 'YA ESTÁ EN LA LISTA'
                                         : 'NO SE PUDO AÑADIR');
        });
      }).catch(function () { cb('NO SE PUDO AÑADIR'); });
    },

    removeFriend: function (nombre, cb) {
      var n = cleanUser(nombre);
      if (!this.logged()) { if (cb) cb('NECESITAS UNA CUENTA'); return; }
      fetch(base('/rest/v1/' + AC.FRIENDS_TABLE +
                 '?de=eq.' + this.user.id + '&amigo=eq.' + encodeURIComponent(n)), {
        method: 'DELETE', headers: authHeaders(this.token)
      }).then(function () { if (cb) cb(null); })
        .catch(function () { if (cb) cb('NO SE PUDO QUITAR'); });
    },

    cleanUser: cleanUser
  };

  window.PM.Account = Account;
})();
