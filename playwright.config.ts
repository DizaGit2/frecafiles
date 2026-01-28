import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4300';
const runId = new Date().toISOString().replace(/[:.]/g, '-');

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  outputDir: `test-results/${runId}`,
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm start -- --port 4300',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});