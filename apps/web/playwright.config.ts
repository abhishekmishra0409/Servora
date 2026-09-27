import { defineConfig, devices } from '@playwright/test';

const port = process.env.PORT ?? '3000';

export default defineConfig({
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  testDir: './tests/e2e',
  use: {
    baseURL: `http://localhost:${port}`,
  },
  webServer: {
    command: `npm run start -- --port ${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
    url: `http://localhost:${port}/login`,
  },
});
