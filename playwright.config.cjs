const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',
  timeout: 600_000,
  use: {
    baseURL: 'http://127.0.0.1:8264',
    browserName: 'chromium',
    headless: true,
    ...devices['Desktop Chrome']
  },
  reporter: [['list']]
});
