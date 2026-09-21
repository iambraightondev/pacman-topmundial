const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('**supabase.co/**', route => route.abort());
  await page.route('**/js/tests.js', route => route.abort());
  await page.goto('/tests.html', { waitUntil: 'domcontentloaded', timeout: 15_000 });
});

test('catálogo: Asesino resuelve daño, puntos, estados y proyectiles', async ({ page }) => {
  const r = await page.evaluate(() => {
    const CFG = window.PM.CFG, H = window.PM.Hab, G = window.PM.Game, T = CFG.TILE;
    function start(loadout, players = 1) {
      const roles = Array(players).fill('asesino'), loads = Array(players).fill(loadout);
      G.newGame({ players, hab: true, roles, loadouts: loads });
      G.state = 'PLAYING'; G.readyTicks = 0; G.roles = roles;
      H.empezar(true, players, roles, loads);
      for (const g of G.ghosts) g.mode = 'house';
      return G.pacs[0];
    }
    function ghost(i, x, y) {
      const g = G.ghosts[i]; g.mode = 'normal'; g.frightened = false; g.x = x; g.y = y; return g;
    }
    function fly(n = 120) { for (let i = 0; i < n && H.proyectilesCat.length; i++) H.pasoProyectilesCat(G, true); }
    function recta(largo) {
      for (let r = 1; r < CFG.ROWS - 1; r++) for (let c = 1; c < CFG.COLS - largo - 1; c++) {
        let libre = true; for (let n = 0; n <= largo; n++) libre = libre && CFG.isOpen(c + n, r, false);
        if (libre) return { c, r };
      }
    }
    const out = {};

    let p = start('shuriken,turbo,flash,grito');
    p.x = 8 * T + 4; p.y = CFG.TUNNEL_ROW * T + 4; p.nextDir = CFG.DIR.RIGHT;
    for (let i = 0; i < 3; i++) ghost(i, p.x + T, p.y);
    let base = G.score;
    const q1 = H.lanzar(G, 0, 0), una = H.proyectilesCat.filter(b => b.tipo === 'shuriken').length === 1 && H.st[0].cd[0] === 0;
    fly(60); const q2 = H.lanzar(G, 0, 0); fly(60); const q3 = H.lanzar(G, 0, 0); fly(60);
    out.shurikenLanza = q1 && q2 && q3 && una;
    out.shurikenMataTres = G.score - base === 600 && G.ghosts.slice(0, 3).every(g => g.mode === 'eyes');
    out.shurikenRecarga = H.st[0].cd[0] === 0;

    p = start('shuriken,turbo,flash,grito');
    p.x = 8 * T + 4; p.y = CFG.TUNNEL_ROW * T + 4; p.nextDir = CFG.DIR.RIGHT;
    H.lanzar(G, 0, 0); fly(100);
    ghost(0, p.x + T, p.y); H.lanzar(G, 0, 0); fly(60);
    ghost(1, p.x + T, p.y); H.lanzar(G, 0, 0); fly(60);
    out.shurikenFallo = !H.st[0].shuriken && H.st[0].cd[0] === 20 * 60;

    p = start('bomba,turbo,flash,grito');
    p.x = 10 * T + 4; p.y = 10 * T + 4; ghost(0, p.x + T, p.y);
    base = G.score;
    const planta = H.lanzar(G, 0, 0), queda = !!H.st[0].bomba && H.st[0].cd[0] === 0;
    const detona = H.lanzar(G, 0, 0);
    out.bomba = planta && queda && detona && G.score - base === 150 && G.ghosts[0].mode === 'eyes';

    p = start('mordisco,sombra,marca,grito');
    p.x = 10 * T + 4; p.y = 10 * T + 4;
    H.sombra(G, 0); const invisible = H.oculto(0) && H.alfa(0, G) < 0.4 && H.multVel(0) === 1.2;
    let sg = ghost(0, p.x + T, p.y); sg.dir = CFG.DIR.LEFT;
    base = G.score; G.chainIndex = 0; G.eatGhost(sg, 0, 'contacto'); const frontal = G.score - base === 500;
    sg = ghost(1, p.x + T, p.y); sg.dir = CFG.DIR.RIGHT;
    base = G.score; H.matarCatalogo(G, sg, 0, CFG.HAB.BOMBA_PUNTOS, 'bomba', 1, true);
    out.sombra = invisible && frontal && G.score - base === 750;

    p = start('mordisco,frenesi,marca,grito');
    H.frenesi(G, 0); const fg = ghost(0, p.x + T, p.y); G.eatGhost(fg, 0, 'mordisco');
    for (let i = 0; i < 4; i++) H.alMatar(G, 0, null, p.x, p.y);
    out.frenesi = H.st[0].frenesi === 8 * 60 && H.st[0].frenesiMult > 1.6 && H.multVel(0) > 1.6 && H.fx.some(f => f.t === 'frenesi');

    p = start('mordisco,carrona,flash,grito');
    H.carrona(G, 0); const cg = ghost(0, p.x + T, p.y); base = G.score; G.eatGhost(cg, 0, 'mordisco');
    const joya = H.joyas[0]; if (joya) { p.x = joya.x; p.y = joya.y; H.pasoRoles(G, true); }
    out.carrona = !!joya && H.joyas.length === 0 && G.score - base === 550;

    p = start('mordisco,turbo,marca,grito');
    const mg = ghost(0, p.x + T, p.y); H.marca(G, 0); base = G.score; G.chainIndex = 0; G.eatGhost(mg, 0, 'mordisco');
    out.marca = G.score - base === 500 && H.marcaGhost[0] === -1;

    p = start('mordisco,turbo,gancho_inverso,grito');
    const pasillo = recta(6);
    p.x = pasillo.c * T + T / 2; p.y = pasillo.r * T + T / 2; p.nextDir = CFG.DIR.RIGHT;
    const ox = p.x, falla = H.ganchoInverso(G, 0) && H.proyectilesCat.some(b => b.tipo === 'gancho_inverso');
    let vioVuelta = false; for (let i = 0; i < 80 && H.proyectilesCat.length; i++) { H.pasoProyectilesCat(G, true); vioVuelta ||= H.proyectilesCat.some(b => b.fase === 'vuelve'); }
    const regreso = falla && vioVuelta && !H.proyectilesCat.some(b => b.tipo === 'gancho_inverso') && p.x === ox;
    const gg = ghost(0, p.x + 2 * T, p.y); H.ganchoInverso(G, 0);
    for (let i = 0; i < 120 && H.proyectilesCat.length; i++) H.pasoProyectilesCat(G, true);
    out.gancho = regreso && p.x === gg.x && H.puedeComer(G, gg.id, 0) && H.fx.some(f => f.t === 'gancho_atrapa');

    p = start('mordisco,turbo,flash,misil');
    for (let i = 0; i < 4; i++) ghost(i, p.x + T, p.y);
    base = G.score; out.misilLanza = H.misil(G, 0) && H.proyectilesCat.some(b => b.tipo === 'misil'); fly(120);
    out.misilCuatro = G.score - base === 3750 && G.ghosts.every(g => g.mode === 'eyes');

    p = start('mordisco,turbo,flash,ejecucion');
    const eg = ghost(0, p.x + T, p.y); base = G.score;
    out.ejecucion = H.ejecucion(G, 0) && G.score - base === 5000 && eg.mode === 'eyes';

    start('mordisco,turbo,flash,caceria', 2);
    const hunt = ghost(0, G.pacs[0].x, G.pacs[0].y); H.caceria(G, 0);
    H.st[0].sombra = 2; H.st[0].frenesi = 2; H.st[0].frenesiMult = 1.15;
    const acumulada = Math.abs(H.multVel(0) - 1.2 * 1.2 * 1.15) < 0.0001;
    const permisos = H.puedeComer(G, 0, 0) && !H.puedeComer(G, 0, 1) && H.caceriaQuien[0] === 0 &&
      acumulada && CFG.HAB.CATALOGO.asesino[3].find(x => x.id === 'caceria').cd === 90 * 60;
    G.pacs[0].pauseTicks = 30; G.stepPlaying();
    hunt.mode = 'normal';
    out.caceria = permisos && !G.pacs[0].dying && H.caceriaQuien[0] === -1 && !H.puedeComer(G, 0, 0);
    G.toMenu();
    return out;
  });
  expect(r).toEqual({
    shurikenLanza: true, shurikenMataTres: true, shurikenRecarga: true, shurikenFallo: true,
    bomba: true, sombra: true, frenesi: true, carrona: true, marca: true, gancho: true,
    misilLanza: true, misilCuatro: true, ejecucion: true, caceria: true
  });
});

test('catálogo: el misil sigue pasillos y se dibuja como misil animado', async ({ page }) => {
  const r = await page.evaluate(() => {
    const CFG = window.PM.CFG, H = window.PM.Hab, G = window.PM.Game, T = CFG.TILE;
    G.newGame({ players: 1, hab: true, roles: ['asesino'], loadouts: ['mordisco,turbo,flash,misil'] });
    G.state = 'PLAYING'; G.readyTicks = 0; G.roles = ['asesino'];
    H.empezar(true, 1, ['asesino'], ['mordisco,turbo,flash,misil']);
    for (const g of G.ghosts) g.mode = 'house';
    let par = null;
    for (let r = 1; r < CFG.ROWS - 1 && !par; r++) for (let c = 1; c < CFG.COLS - 2 && !par; c++) {
      if (!CFG.isOpen(c, r, false)) continue;
      for (let d = 2; d <= 10 && c + d < CFG.COLS; d++) {
        if (!CFG.isOpen(c + d, r, false)) continue;
        let muro = false; for (let x = c + 1; x < c + d; x++) muro ||= !CFG.isOpen(x, r, false);
        const ruta = muro && H.rutaLaberinto(c, r, c + d, r);
        if (ruta && ruta.length > d) { par = { c, r, tc: c + d, tr: r, largo: ruta.length }; break; }
      }
    }
    if (!par) return { encontro: false };
    const p = G.pacs[0], g = G.ghosts[0];
    p.x = par.c * T + T / 2; p.y = par.r * T + T / 2;
    g.mode = 'normal'; g.frightened = false; g.x = par.tc * T + T / 2; g.y = par.tr * T + T / 2;
    H.misil(G, 0);
    const cv = document.createElement('canvas'); cv.width = CFG.NATIVE_W; cv.height = CFG.NATIVE_H;
    const ctx = cv.getContext('2d', { willReadFrequently: true }); H.dibujarAire(G, ctx);
    const cp = H.proyectilesCat[0], box = ctx.getImageData(Math.max(0, Math.floor(cp.x - 14)), Math.max(0, Math.floor(cp.y + CFG.MAZE_Y - 9)), 28, 18).data;
    let tinta = 0; for (let i = 3; i < box.length; i += 4) if (box[i]) tinta++;
    let abiertas = true, giros = 0, ang = null;
    for (let i = 0; i < 1600 && H.proyectilesCat.length; i++) {
      H.pasoProyectilesCat(G, true);
      const m = H.proyectilesCat.find(x => x.tipo === 'misil');
      if (m) {
        abiertas = abiertas && CFG.isOpen(Math.floor(m.x / T), Math.floor(m.y / T), false);
        if (ang != null && Math.abs(m.ang - ang) > 0.5) giros++;
        ang = m.ang;
      }
    }
    const out = { encontro: true, ruta: par.largo > 2, abiertas, giros: giros > 0, mata: g.mode === 'eyes', tinta: tinta > 20 };
    G.toMenu(); return out;
  });
  expect(r).toEqual({ encontro: true, ruta: true, abiertas: true, giros: true, mata: true, tinta: true });
});

test('catálogo: Tanque, Soporte y Mago aplican todos sus efectos', async ({ page }) => {
  const r = await page.evaluate(() => {
    const CFG = window.PM.CFG, H = window.PM.Hab, G = window.PM.Game, T = CFG.TILE;
    function start(roles, loads) {
      G.newGame({ players: roles.length, hab: true, roles, loadouts: loads });
      G.state = 'PLAYING'; G.readyTicks = 0; G.roles = roles;
      H.empezar(true, roles.length, roles, loads);
      for (const g of G.ghosts) g.mode = 'house';
      return G.pacs[0];
    }
    function ghost(i, x, y) { const g = G.ghosts[i]; g.mode = 'normal'; g.frightened = false; g.x = x; g.y = y; return g; }
    function fly(n = 180) { for (let i = 0; i < n && H.proyectilesCat.length; i++) H.pasoProyectilesCat(G, true); }
    function openStep() {
      for (let r = 1; r < CFG.ROWS - 1; r++) for (let c = 1; c < CFG.COLS - 2; c++) {
        if (CFG.isOpen(c - 1, r, false) && CFG.isOpen(c, r, false) && CFG.isOpen(c + 1, r, false)) return { c, r };
      }
    }
    const out = {}, pos = openStep();

    let p = start(['tanque'], ['empujon,yunque,provocar,fortaleza']);
    p.x = pos.c * T + 4; p.y = pos.r * T + 4; p.nextDir = CFG.DIR.RIGHT;
    let g = ghost(0, (pos.c + 1) * T + 4, p.y); const gx = g.x;
    out.empujon = H.empujon(G, 0) && H.aturdido[0] === CFG.HAB.EMPUJON_STUN && g.x !== gx;
    g.mode = 'normal'; g.x = p.x + T; g.y = p.y; H.gritoGuerra(G, 0);
    out.gritoGuerra = H.aturdido[0] === CFG.HAB.GRITO_GUERRA_TICKS;
    H.yunque(G, 0); H.pasoRoles(G, true); const quieto = H.st[0].yunque > 0; p.x += 2; H.pasoRoles(G, true);
    out.yunque = quieto && H.st[0].yunque === 0;
    H.fortaleza(G, 0); out.fortaleza = H.salvaDelChoque(G, 0, null);

    p = start(['tanque'], ['rebote,piel_piedra,provocar,terremoto']);
    H.pielPiedra(G, 0); out.piedra = H.multVel(0) === 0.5 && H.salvaDelChoque(G, 0, null);
    H.rebote(G, 0); g = ghost(0, p.x, p.y); H.salvaDelChoque(G, 0, g);
    out.rebote = H.st[0].rebote === 0 && g.mode === 'eyes';
    for (let i = 0; i < 4; i++) ghost(i, p.x + T, p.y);
    let base = G.score; H.terremoto(G, 0);
    out.terremoto = G.score - base === 400 && H.multVel(0) === 0.4;

    p = start(['soporte', 'asesino'], ['mina,estela,relevo,campo', 'mordisco,turbo,flash,grito']);
    G.pacs[1].x = p.x + T; G.pacs[1].y = p.y;
    H.mina(G, 0); g = ghost(0, p.x, p.y); H.pasoRoles(G, true);
    out.mina = g.mode === 'eyes' && H.st[0].escudo > 0;
    H.estela(G, 0); G.tick = 5; H.pasoRoles(G, true); G.pacs[1].x = p.x; G.pacs[1].y = p.y; H.pasoRoles(G, true);
    out.estela = H.st[1].estelaBuff > 0 && H.multVel(1) === CFG.HAB.ESTELA_RASTRO_MULT;
    H.puente(G, 0); out.puente = H.puenteActivo(0) && H.puenteActivo(1);
    const before = G.pacs[0].x; H.relevo(G, 0); out.relevo = G.pacs[1].x === before;
    H.campo(G, 0); out.campo = H.salvaDelChoque(G, 1, null);

    p = start(['soporte', 'asesino'], ['telarana,estela,faro,resurreccion', 'mordisco,turbo,flash,grito']);
    g = ghost(0, p.x, p.y); H.telarana(G, 0); H.pasoRoles(G, true);
    out.telarana = H.multVelFantasma(G, 0) === CFG.HAB.TELARANA_MULT;
    H.st[1].cd[3] = 1000; G.pacs[1].x = p.x; G.pacs[1].y = p.y; H.faro(G, 0); H.pasoRoles(G, true);
    out.faro = H.st[1].cd[3] === 500;
    G.pacs[1].out = true; G.pacs[1].dying = false; G.cuerpos[1] = null;
    out.resurreccion = H.resurreccion(G, 0) && !G.pacs[1].out;

    p = start(['soporte', 'asesino'], ['gancho,cadena,muro,hospital', 'mordisco,turbo,flash,grito']);
    p.x = pos.c * T + 4; p.y = pos.r * T + 4; p.nextDir = CFG.DIR.RIGHT;
    g = ghost(0, (pos.c + 1) * T + 4, p.y); H.gancho(G, 0); out.ganchoSoporte = H.puedeComer(G, 0, 1);
    H.cadena(G, 0); base = G.score; H.bonoCadena(G, 1, 20, p.x, p.y); out.cadena = G.score - base === 20;
    H.muro(G, 0); out.muro = !!H.st[0].muro && H.bloqueaFantasma(H.st[0].muro.c, H.st[0].muro.r);
    H.hospital(G, 0); const safe = G.pacs[1].safeTicks; G.startDeath(1, 0);
    out.hospital = !G.pacs[1].dying && G.pacs[1].safeTicks > safe && H.st[0].hospital === 0;
    H.sirena(G, 0); const objetivo = H.objetivo(G, G.ghosts[0]);
    out.sirena = !!objetivo && objetivo.x === H.st[0].sirena.c && objetivo.y === H.st[0].sirena.r;

    p = start(['mago'], ['bola_guiada,clon,gravedad,meteoro']);
    g = ghost(0, p.x + 2 * T, p.y + T); base = G.score; H.bolaGuiada(G, 0); fly();
    out.guiada = G.score - base === 150 && g.mode === 'eyes';
    p.nextDir = CFG.DIR.RIGHT; if (!H.libreDelante(p.tileX(), p.tileY(), CFG.DIR.RIGHT)) p.nextDir = CFG.DIR.LEFT;
    const clon = H.clon(G, 0); if (clon) { const x0 = H.st[0].clon.x; H.pasoRoles(G, true); out.clon = H.st[0].clon && H.st[0].clon.x !== x0; } else out.clon = false;
    g = ghost(0, p.x + 2 * T, p.y); const d0 = H.distancia(g.x, g.y, p.x, p.y); H.gravedad(G, 0);
    out.gravedad = H.distancia(g.x, g.y, p.x, p.y) < d0 && H.aturdido[0] === CFG.HAB.GRAVEDAD_TICKS;
    let fired = false; for (let d = 0; d < 4; d++) { p.nextDir = d; if (H.meteoro(G, 0)) { fired = true; break; } }
    if (fired) { H.st[0].meteoro.t = 0; H.pasoRoles(G, true); }
    out.meteoro = fired && !!H.st[0].fuegoMeteoro;

    p = start(['mago'], ['chispa,totem,niebla,eclipse']);
    for (let i = 0; i < 3; i++) ghost(i, p.x + (i + 1) * T, p.y);
    H.chispa(G, 0); out.chispa = H.aturdido.slice(0, 3).every(v => v === CFG.HAB.CHISPA_TICKS);
    H.niebla(G, 0); H.pasoRoles(G, true); out.niebla = H.ciego.some(v => v > 0);
    H.aturdido = [0, 0, 0, 0]; H.eclipse(G, 0);
    out.eclipse = H.multVelFantasma(G, 0) === 0.5 && H.ciegoDe(0);
    H.totem(G, 0); H.st[0].totem.cd = 0; H.pasoRoles(G, true);
    out.totem = H.proyectilesCat.some(b => b.tipo === 'totem');

    p = start(['mago'], ['toque_arcano,clon,gravedad,eclipse']);
    g = ghost(0, p.x + T, p.y); out.toqueArcano = H.toqueArcano(G, 0) && H.puedeComer(G, 0, 0);
    G.toMenu();
    return out;
  });
  expect(r).toEqual({
    empujon: true, gritoGuerra: true, yunque: true, fortaleza: true, piedra: true, rebote: true,
    terremoto: true, mina: true, estela: true, puente: true, relevo: true,
    campo: true, telarana: true, faro: true, resurreccion: true,
    ganchoSoporte: true, cadena: true, muro: true, hospital: true, sirena: true,
    guiada: true, clon: true, gravedad: true, meteoro: true, chispa: true,
    niebla: true, eclipse: true, totem: true, toqueArcano: true
  });
});

test('catálogo: las animaciones alteran el lienzo y cubren habilidades activas', async ({ page }) => {
  const r = await page.evaluate(() => {
    const H = window.PM.Hab, G = window.PM.Game, CFG = window.PM.CFG;
    G.newGame({ players: 1, hab: true, roles: ['asesino'], loadouts: ['bomba,sombra,marca,caceria'] });
    G.state = 'PLAYING'; G.readyTicks = 0; G.roles = ['asesino'];
    H.empezar(true, 1, ['asesino'], ['bomba,sombra,marca,caceria']);
    G.ghosts[0].mode = 'normal'; G.ghosts[0].x = G.pacs[0].x + CFG.TILE; G.ghosts[0].y = G.pacs[0].y;
    const cv = document.createElement('canvas'); cv.width = CFG.NATIVE_W; cv.height = CFG.NATIVE_H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    function ink() { const d = ctx.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; }
    H.sombra(G, 0); H.marca(G, 0); H.caceria(G, 0); H.bomba(G, 0);
    H.dibujarSuelo(G, ctx); H.dibujarPac(G, ctx, G.pacs[0], 0); H.dibujarAire(G, ctx);
    const pixels = ink(), tipos = new Set(H.fx.map(f => f.t));
    const declaradas = ['sombra', 'marca', 'caceria', 'bomba_planta'].every(x => tipos.has(x));
    const originalGhost = window.PM.Sprites.drawGhost; let modoAzul = '';
    window.PM.Sprites.drawGhost = (...args) => { modoAzul = args[5]; };
    H.azulCatalogo[0] = 1; G.ghosts[0].draw(ctx, G); window.PM.Sprites.drawGhost = originalGhost;
    const funciones = {
      shuriken: 'shuriken', bomba: 'bomba', sombra: 'sombra', frenesi: 'frenesi', carrona: 'carrona',
      marca: 'marca', gancho_inverso: 'ganchoInverso', misil: 'misil', ejecucion: 'ejecucion', caceria: 'caceria',
      empujon: 'empujon', grito_guerra: 'gritoGuerra', yunque: 'yunque', piel_piedra: 'pielPiedra', rebote: 'rebote',
      terremoto: 'terremoto', fortaleza: 'fortaleza', mina: 'mina', gancho: 'gancho', telarana: 'telarana',
      estela: 'estela', puente: 'puente', cadena: 'cadena', muro: 'muro', relevo: 'relevo', faro: 'faro',
      sirena: 'sirena', campo: 'campo', resurreccion: 'resurreccion', hospital: 'hospital', bola_guiada: 'bolaGuiada',
      toque_arcano: 'toqueArcano', chispa: 'chispa', clon: 'clon', totem: 'totem', gravedad: 'gravedad',
      niebla: 'niebla', meteoro: 'meteoro', eclipse: 'eclipse'
    };
    const sinAnimacion = Object.entries(funciones).filter(([, fn]) => {
      const src = String(H[fn]);
      return !/efecto\(|proyectilesCat\.push/.test(src);
    }).map(([id]) => id);
    G.toMenu();
    return { pixels, declaradas, azulClaro: modoAzul === 'fright', sinAnimacion };
  });
  expect(r.declaradas).toBe(true);
  expect(r.azulClaro).toBe(true);
  expect(r.sinAnimacion).toEqual([]);
  expect(r.pixels).toBeGreaterThan(100);
});
