export type BugSeverity = "broken" | "looks-wrong" | "idea";
export const BUG_SEVERITIES: { value: BugSeverity; label: string; hint: string }[] = [
  { value: "broken", label: "Something's broken", hint: "An error, a dead button, wrong data" },
  { value: "looks-wrong", label: "Looks wrong", hint: "Layout, text or a confusing screen" },
  { value: "idea", label: "Idea or request", hint: "Something you wish it did" },
];

export type BugStatus = "open" | "resolved";

/** A tester's report as stored; the screenshot is served separately. */
export interface BugReport {
  id: string;
  reporter: { name: string; handle: string; email: string } | null;
  title: string;
  body: string;
  expected: string;
  severity: BugSeverity;
  page: string;
  threadId?: string;
  userAgent: string;
  appVersion: string;
  hasScreenshot: boolean;
  status: BugStatus;
  createdAt: string;
  updatedAt: string;
}

/** Longest edge of a screenshot after the browser downscales it, and the encoded size cap. */
export const SCREENSHOT_MAX_EDGE = 1280;
export const SCREENSHOT_MAX_BYTES = 1_500_000;
