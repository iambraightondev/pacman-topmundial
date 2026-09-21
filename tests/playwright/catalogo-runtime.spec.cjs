const { test, expect } = require('@playwright/test');

test('catálogo: invariantes de ejecución en el navegador', async ({ page }) => {
  await page.route('**supabase.co/**', route => route.abort());
  await page.route('**/js/tests.js', route => route.abort());
  await page.goto('/tests.html', { waitUntil: 'domcontentloaded', timeout: 15_000 });
  const result = await page.evaluate(() => {
    const CFG = window.PM.CFG;
    const H = window.PM.Hab;
    const G = window.PM.Game;
    const ids = (rol, slot) => CFG.HAB.CATALOGO[rol][slot].map(h => h.id);
    const out = {
      descartadas: !JSON.stringify(CFG.HAB.CATALOGO).match(/intercambio|destierro|ancla|estaca|bastion/i),
      ranuras: ids('soporte', 0).includes('telarana') && ids('soporte', 1).includes('puente') &&
        ids('soporte', 2).includes('relevo') && ids('tanque', 1).includes('yunque') &&
        ids('tanque', 0).includes('rebote') && ids('mago', 0).includes('chispa'),
      relevo: false,
      chispa: false,
      bola: false,
      meteoro: false,
      ejecucion: false
    };

    G.newGame({ players: 2, hab: true, roles: ['soporte', 'asesino'],
      loadouts: ['hielo,puente,relevo,vida', 'mordisco,turbo,flash,grito'] });
    G.state = 'PLAYING'; G.readyTicks = 0;
    G.pacs[0].x = 10 * CFG.TILE + 4; G.pacs[0].y = 5 * CFG.TILE + 4;
    G.pacs[1].x = 12 * CFG.TILE + 4; G.pacs[1].y = 5 * CFG.TILE + 4;
    const soporteX = G.pacs[0].x;
    H.relevo(G, 0);
    out.relevo = G.pacs[1].x === soporteX && G.pacs[0].x === soporteX;

    G.newGame({ players: 1, hab: true, roles: ['mago'],
      loadouts: ['bola_guiada,portal,runa,meteoro'] });
    G.state = 'PLAYING'; G.readyTicks = 0;
    G.pacs[0].x = 13 * CFG.TILE + 4; G.pacs[0].y = 20 * CFG.TILE + 4;
    G.pacs[0].nextDir = CFG.DIR.UP;
    G.ghosts[0].mode = 'normal'; G.ghosts[0].x = G.pacs[0].x + CFG.TILE; G.ghosts[0].y = G.pacs[0].y;
    H.empezar(true, 1, ['mago'], ['bola_guiada,portal,runa,meteoro']); G.roles = ['mago'];
    out.chispa = CFG.HAB.CHISPA_TICKS === 120;
    const score = G.score;
    H.bolaGuiada(G, 0);
    out.bola = G.score - score === CFG.HAB.BOLA_GUIADA_PUNTOS;
    let meteorSale = false;
    for (const dir of [CFG.DIR.UP, CFG.DIR.LEFT, CFG.DIR.DOWN, CFG.DIR.RIGHT]) {
      G.pacs[0].nextDir = dir;
      if (H.casillaAdelante(G, 0, 6, dir)) { meteorSale = H.meteoro(G, 0); break; }
    }
    out.meteoro = !!meteorSale && H.st[0].meteoro.t === CFG.HAB.METEORO_AVISO;

    G.newGame({ players: 1, hab: true, roles: ['asesino'],
      loadouts: ['mordisco,turbo,flash,ejecucion'] });
    G.state = 'PLAYING'; G.readyTicks = 0;
    G.pacs[0].x = 13 * CFG.TILE + 4; G.pacs[0].y = 20 * CFG.TILE + 4;
    G.ghosts[0].mode = 'normal'; G.ghosts[0].x = G.pacs[0].x + CFG.TILE; G.ghosts[0].y = G.pacs[0].y;
    H.empezar(true, 1, ['asesino'], ['mordisco,turbo,flash,ejecucion']); G.roles = ['asesino'];
    const score2 = G.score;
    const fired = H.lanzar(G, 0, 3);
    out.ejecucion = fired && G.score - score2 === CFG.HAB.EJECUCION_PUNTOS && H.st[0].cd[3] === 80 * 60;
    G.toMenu();
    return out;
  });
  expect(result.descartadas).toBe(true);
  expect(result.ranuras).toBe(true);
  expect(result.relevo).toBe(true);
  expect(result.chispa).toBe(true);
  expect(result.bola).toBe(true);
  expect(result.meteoro).toBe(true);
  expect(result.ejecucion).toBe(true);
});
