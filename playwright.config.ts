import { defineConfig, devices } from '@playwright/test'

// The tests open examples/starter/index.html from file://, as a person would.
// Run `pnpm build` first so plainslides.iife.js is next to it.
export default defineConfig({
  testDir: 'tests/browser',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { viewport: { width: 1280, height: 720 } },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
