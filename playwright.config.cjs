const { defineConfig, devices } = require('@playwright/test');

/* El servidor lo arranca Playwright (tests/servidor.cjs, sin caché). Si ya
 * hay uno escuchando en el puerto, se usa ese. PW_PORT cambia el puerto. */
const PUERTO = parseInt(process.env.PW_PORT || '8264', 10);

module.exports = defineConfig({
  testDir: './tests/playwright',
  timeout: 600_000,
  use: {
    baseURL: 'http://127.0.0.1:' + PUERTO,
    browserName: 'chromium',
    headless: true,
    ...devices['Desktop Chrome']
  },
  webServer: {
    command: 'node tests/servidor.cjs ' + PUERTO,
    url: 'http://127.0.0.1:' + PUERTO + '/tests.html',
    reuseExistingServer: !process.env.CI,
    timeout: 20_000
  },
  reporter: [['list']]
});
