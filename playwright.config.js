import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT || process.env.PORT || 3100);
const headed = process.env.PLAYWRIGHT_HEADED === '1';

const serveDist = process.env.PLAYWRIGHT_SERVE_DIST === '1';
const webServer = process.env.PLAYWRIGHT_NO_WEBSERVER === '1'
  ? undefined
  : {
command: serveDist ? `http-server dist -s -c-1 -p ${port}` : 'npm run dev',
      url: `http://localhost:${port}/index.html`,
      reuseExistingServer: true,
      timeout: 120 * 1000,
      env: serveDist ? {} : { PORT: String(port) }
    };

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60000,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${port}`,
    headless: !headed,
    trace: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // On Windows, if chromium_headless_shell is missing, use system Chrome
        ...(process.platform === 'win32' && process.env.PLAYWRIGHT_USE_CHROME === '1'
          ? { channel: 'chrome' }
          : {}),
      },
    },
  ],

  webServer,
});
