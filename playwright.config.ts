import { defineConfig, devices, type Project, type ReporterDescription } from '@playwright/test';
import { env, STORAGE_STATE } from './src/config/env';

const isCI = env.isCI;

const reporters: ReporterDescription[] = [
  ['list'],
  ['html', { outputFolder: 'reports/html', open: 'never' }],
  ['junit', { outputFile: 'reports/junit/results.xml' }],
  ['json', { outputFile: 'reports/json/results.json' }],
];
if (isCI) reporters.push(['blob', { outputDir: 'blob-report' }], ['github']);

const loggedIn = { storageState: STORAGE_STATE };

const crossBrowser: Project[] = process.env.CROSS_BROWSER
  ? [
      {
        name: 'firefox-smoke',
        dependencies: ['setup'],
        testIgnore: ['**/auth/sign-up.spec.ts', '**/credits/**', '**/unit/**'],
        grep: /@smoke/,
        use: { ...devices['Desktop Firefox'], ...loggedIn },
      },
      {
        name: 'webkit-smoke',
        dependencies: ['setup'],
        testIgnore: ['**/auth/sign-up.spec.ts', '**/credits/**', '**/unit/**'],
        grep: /@smoke/,
        use: { ...devices['Desktop Safari'], ...loggedIn },
      },
      {
        name: 'mobile-smoke',
        dependencies: ['setup'],
        testIgnore: ['**/auth/sign-up.spec.ts', '**/credits/**', '**/unit/**'],
        grep: /@mobile/,
        use: { ...devices['Pixel 7'], ...loggedIn },
      },
    ]
  : [];

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 4 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: reporters,

  use: {
    baseURL: env.baseUrl,
    testIdAttribute: 'data-testid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    acceptDownloads: true,
    viewport: { width: 1440, height: 900 },
    locale: 'en-AU',
    timezoneId: 'Australia/Sydney',
  },

  projects: [
    {
      name: 'unit',
      testDir: './tests/unit',
    },
    {
      name: 'setup',
      testDir: './tests/setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'auth',
      testDir: './tests/auth',
      use: { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } },
    },
    {
      name: 'app',
      dependencies: ['setup'],
      testIgnore: ['**/auth/**', '**/credits/**', '**/setup/**', '**/unit/**'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, ...loggedIn },
    },
    {
      name: 'credits',
      testDir: './tests/credits',
      dependencies: ['setup'],
      fullyParallel: false,
      workers: 1, // these tests share one credit balance
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, ...loggedIn },
    },
    ...crossBrowser,
  ],
});
