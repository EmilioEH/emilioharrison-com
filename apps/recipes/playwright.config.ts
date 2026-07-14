import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/unit/**', '**/integration/**'],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'http://127.0.0.1:8788',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Android Chrome — the app's actual real-world usage pattern is a home-screen-installed
     * standalone PWA on Android Chrome (see manifest.json's `display: "standalone"`), which
     * cold-starts the service worker far more than a typical bookmarked-tab user. `chromium`
     * above already shares the same rendering/SW engine (just a desktop viewport/UA), so core
     * SW caching logic isn't fundamentally different — this project is scoped to only the
     * service-worker spec via `testMatch` so it doesn't multiply the runtime of the full
     * ~250-test suite (see the 5-minute globalTimeout below) for the other ~250 unrelated
     * specs that don't touch SW behavior. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /service-worker-caching\.spec\.ts/,
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  timeout: 45 * 1000,
  globalTimeout: 5 * 60 * 1000, // Hard limit of 5 minutes for the entire test run
  webServer: {
    command: 'npm run build:test && npm run preview:wrangler',
    url: 'http://127.0.0.1:8788/protected/recipes/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
