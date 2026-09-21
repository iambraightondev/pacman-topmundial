const { test, expect } = require('@playwright/test');

test('suite propia del juego: catálogo y regresiones', async ({ page }) => {
  const errores = [];
  await page.route('**supabase.co/**', route => route.abort());
  page.on('pageerror', error => errores.push(error.message));
  await page.goto('/tests.html', { waitUntil: 'commit', timeout: 10_000 });
  await page.waitForTimeout(2_000);
  await page.waitForFunction(() => window.__TESTS && window.__TESTS.total > 0);
  const resultado = await page.evaluate(() => window.__TESTS);
  expect(errores, errores.join('\n')).toEqual([]);
  expect(resultado.fallos, JSON.stringify(resultado.casos.filter(c => !c.ok))).toBe(0);
});
