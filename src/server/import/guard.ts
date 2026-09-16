import { isIP } from "node:net";
import { promises as dns } from "node:dns";

/**
 * Fetching arbitrary links from the server is a server-side request forgery
 * risk, so every URL (and every redirect) is checked before a request goes
 * out: http(s) only, no private or loopback destinations, bounded size and
 * time. `IMPORT_ALLOW_LOOPBACK=1` exists for the test fixture site only.
 */

export class ImportError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const MAX_REDIRECTS = 3;
export const MAX_BYTES = 2 * 1024 * 1024;
export const TIMEOUT_MS = 8000;
export const USER_AGENT = "Mozilla/5.0 (compatible; XPMatchBot/1.0; +https://xpmatch.app) AppleWebKit/537.36 Chrome/124 Safari/537.36";

export type Lookup = (hostname: string) => Promise<{ address: string }[]>;

const defaultLookup: Lookup = async (hostname) => {
  const results = await dns.lookup(hostname, { all: true });
  return results.map((r) => ({ address: r.address }));
};

/** Private, loopback, link-local and other non-public ranges (v4 and v6). */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // IPv4-mapped addresses carry their v4 rules.
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  return true;
}

/** Loopback only (127/8 and ::1): the one exception the test fixture site needs. */
export function isLoopback(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return address.startsWith("127.");
  if (version === 6) {
    const lower = address.toLowerCase();
    return lower === "::1" || /^::ffff:127\./.test(lower);
  }
  return false;
}

function allowLoopback(): boolean {
  return process.env.IMPORT_ALLOW_LOOPBACK === "1";
}

/** Rejects private ranges always, and loopback unless the test-only flag is set. */
function assertPublic(address: string): void {
  if (isLoopback(address)) {
    if (!allowLoopback()) throw new ImportError(400, "Private addresses cannot be imported");
    return;
  }
  if (isPrivateAddress(address)) throw new ImportError(400, "Private addresses cannot be imported");
}

/** Parses and validates a link the traveler pasted; resolves its host to make sure it is public. */
export async function guardUrl(input: string, lookup: Lookup = defaultLookup): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new ImportError(400, "That does not look like a link");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ImportError(400, "Only http(s) links can be imported");
  if (url.username || url.password) throw new ImportError(400, "Links with credentials are not allowed");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) {
    if (!allowLoopback()) throw new ImportError(400, "Local addresses cannot be imported");
    return url;
  }
  if (host === "0.0.0.0") throw new ImportError(400, "Private addresses cannot be imported");
  if (isIP(host)) {
    assertPublic(host);
    return url;
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host);
  } catch {
    throw new ImportError(400, "That site could not be found");
  }
  if (!addresses.length) throw new ImportError(400, "That site could not be found");
  for (const a of addresses) assertPublic(a.address);
  return url;
}

export interface FetchedPage {
  url: string;
  status: number;
  contentType: string;
  body: string;
}

/**
 * Fetches a page with manual, re-checked redirects, a hard timeout and a size
 * cap. Returns the body as text (binary content is rejected by the caller).
 */
export async function fetchPage(input: string, options: { lookup?: Lookup; fetchImpl?: typeof fetch; accept?: string } = {}): Promise<FetchedPage> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let url = await guardUrl(input, options.lookup);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetchImpl(url.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: options.accept ?? "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5", "Accept-Language": "en" },
      });
    } catch (err) {
      clearTimeout(timer);
      throw new ImportError(502, err instanceof Error && err.name === "AbortError" ? "That site took too long to answer" : "That site could not be reached");
    }
    if (res.status >= 300 && res.status < 400) {
      clearTimeout(timer);
      const location = res.headers.get("location");
      if (!location || hop === MAX_REDIRECTS) throw new ImportError(502, "Too many redirects");
      url = await guardUrl(new URL(location, url).toString(), options.lookup);
      continue;
    }
    const contentType = res.headers.get("content-type") ?? "";
    try {
      const body = await readCapped(res, MAX_BYTES);
      return { url: url.toString(), status: res.status, contentType, body };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new ImportError(502, "Too many redirects");
}

async function readCapped(res: Response, max: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > max) {
        await reader.cancel().catch(() => undefined);
        throw new ImportError(413, "That page is too large to import");
      }
      chunks.push(value);
    }
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
}
