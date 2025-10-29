import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        port: 3001,
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
        },
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
