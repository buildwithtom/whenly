import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  webServer: {
    command: "npm run preview -- --port 4173",
    url: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173",
    timezoneId: "Asia/Kolkata",
    trace: "retain-on-failure",
    launchOptions:
      process.platform === "darwin"
        ? {
            executablePath:
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          }
        : {},
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
