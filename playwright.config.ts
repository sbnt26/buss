import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60 * 1000,
  retries: process.env.CI ? 2 : 0,
  testDir: './tests/e2e',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    headless: true,
  },
  reporter: process.env.CI ? 'github' : [['list']],
});
