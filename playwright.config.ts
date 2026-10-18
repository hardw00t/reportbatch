import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: process.env.RUN_PERF ? [] : ['**/performance.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    channel: process.env.PW_EXECUTABLE_PATH ? undefined : process.env.PW_CHANNEL ?? 'chrome',
    headless: true,
    viewport: { width: 1440, height: 1050 },
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PW_EXECUTABLE_PATH, args: ['--enable-precise-memory-info'] },
  },
  webServer: {
    command: 'npm run serve',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
