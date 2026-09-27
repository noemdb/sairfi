import "dotenv/config";
import { defineConfig } from "@playwright/test";

// Fase 7: humo e2e contra dev local (el CI de Vercel corre el mismo spec
// contra Preview con PLAYWRIGHT_BASE_URL + usuario de pruebas).
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000", timeout: 120_000, reuseExistingServer: true },
});
