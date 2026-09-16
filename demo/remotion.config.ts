import { Config } from "@remotion/cli/config";

// The sandbox and CI ship Chromium already; never download another one.
const browser = process.env.PW_CHROMIUM || process.env.REMOTION_BROWSER || "/opt/pw-browsers/chromium";
Config.setBrowserExecutable(browser);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY || 2));
