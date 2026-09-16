import { Config } from "@remotion/cli/config";

// Remotion drives Chrome's old headless mode, which only the headless shell still offers; Playwright
// ships one next to its Chromium. Point REMOTION_BROWSER elsewhere to override.
const browser = process.env.REMOTION_BROWSER || "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
Config.setBrowserExecutable(browser);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY || 2));
