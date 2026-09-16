// Starts the stand-in model, the Places stub and the app with a fresh embedded database.
// Used by playwright.config as the web server command and by the restore spec for a second instance.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const appPort = Number(process.env.APP_PORT || 3000);
const modelPort = Number(process.env.MODEL_PORT || 4545);
const placesPort = Number(process.env.PLACES_PORT || 4546);
const sitePort = Number(process.env.SITE_PORT || 4547);
const dataDir = process.env.PGLITE_DIR || path.join(root, ".data", `e2e-${appPort}`);
const startMocks = process.env.START_MOCKS !== "0";
const production = process.env.E2E_PRODUCTION === "1";

if (process.env.KEEP_DATA !== "1") rmSync(dataDir, { recursive: true, force: true });

const children = [];
const spawnChild = (cmd, args, env, name) => {
  const child = spawn(cmd, args, { cwd: root, env: { ...process.env, ...env }, stdio: ["ignore", "inherit", "inherit"] });
  child.on("exit", (code) => console.log(`[start-app] ${name} exited with ${code}`));
  children.push(child);
  return child;
};

if (startMocks) {
  // The stand-in model logs one line per request (tests assert on what the app sent it).
  spawnChild("node", [path.join(here, "mock-openrouter.mjs")], { PORT: String(modelPort), LOG: path.join(dataDir, "model-requests.log") }, "mock model");
  spawnChild("node", [path.join(here, "mock-places.mjs")], { PORT: String(placesPort) }, "mock places");
  spawnChild("node", [path.join(here, "mock-site.mjs")], { PORT: String(sitePort) }, "mock site");
}

const appEnv = {
  PGLITE_DIR: dataDir,
  DATABASE_URL: "",
  OPENROUTER_API_KEY: "sk-or-e2e-stand-in",
  OPENROUTER_MODEL: "openai/gpt-4o-mini",
  OPENROUTER_BASE_URL: `http://localhost:${modelPort}/api/v1`,
  GOOGLE_MAPS_API_KEY: "e2e-places-stub",
  PLACES_BASE_URL: `http://localhost:${placesPort}/v1`,
  // The Places stub also answers Routes API computeRoutes calls with deterministic legs.
  ROUTES_BASE_URL: `http://localhost:${placesPort}`,
  // The import fixture site runs on localhost, which the import guard otherwise refuses.
  IMPORT_ALLOW_LOOPBACK: "1",
  // The onboarding spec signs in as this admin to read bug reports and recommendation quality.
  ADMIN_EMAILS: "admin@example.com",
  COPILOTKIT_TELEMETRY_DISABLED: "true",
  NEXT_TELEMETRY_DISABLED: "1",
  PORT: String(appPort),
  // Never let a developer's real keys leak into the run.
  ANTHROPIC_API_KEY: "",
  OPENAI_API_KEY: "",
  GOOGLE_API_KEY: "",
};

const nextBin = path.join(root, "node_modules", ".bin", "next");
const app = production
  ? spawnChild(nextBin, ["start", "-p", String(appPort)], appEnv, "next start")
  : spawnChild(nextBin, ["dev", "-p", String(appPort)], appEnv, "next dev");

const shutdown = () => {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      // already gone
    }
  }
  setTimeout(() => process.exit(0), 300);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
app.on("exit", () => shutdown());
