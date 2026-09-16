import { describe, expect, it } from "vitest";
import { fetchPage, guardUrl, ImportError, isPrivateAddress, MAX_BYTES } from "@/server/import/guard";
import { extractHtml, extractReddit, extractYouTube, normalizeExtraction, siteName } from "@/server/import/extract";
import { screenshotOnlyHost } from "@/lib/import/types";

const publicLookup = async () => [{ address: "93.184.216.34" }];
const privateLookup = async () => [{ address: "10.0.0.5" }];

describe("import guard", () => {
  it("rejects non-http schemes, credentials and private or loopback targets", async () => {
    await expect(guardUrl("file:///etc/passwd")).rejects.toBeInstanceOf(ImportError);
    await expect(guardUrl("ftp://example.com/x")).rejects.toBeInstanceOf(ImportError);
    await expect(guardUrl("not a url")).rejects.toBeInstanceOf(ImportError);
    await expect(guardUrl("http://user:pw@example.com/")).rejects.toBeInstanceOf(ImportError);
    await expect(guardUrl("http://127.0.0.1/admin")).rejects.toThrow(/Private/);
    await expect(guardUrl("http://10.0.0.1/")).rejects.toThrow(/Private/);
    await expect(guardUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow(/Private/);
    await expect(guardUrl("http://[::1]/")).rejects.toThrow(/Private/);
    await expect(guardUrl("http://localhost:3000/")).rejects.toThrow(/Local/);
    await expect(guardUrl("http://internal.example.com/", privateLookup)).rejects.toThrow(/Private/);
    await expect(guardUrl("http://nowhere.example/", async () => [])).rejects.toThrow(/could not be found/);
  });

  it("the test-only loopback flag never opens other private ranges", async () => {
    const previous = process.env.IMPORT_ALLOW_LOOPBACK;
    process.env.IMPORT_ALLOW_LOOPBACK = "1";
    try {
      await expect(guardUrl("http://localhost:4547/rome-post")).resolves.toBeInstanceOf(URL);
      await expect(guardUrl("http://127.0.0.1:4547/rome-post")).resolves.toBeInstanceOf(URL);
      await expect(guardUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow(/Private/);
      await expect(guardUrl("http://10.0.0.1/")).rejects.toThrow(/Private/);
      await expect(guardUrl("http://internal.example.com/", privateLookup)).rejects.toThrow(/Private/);
    } finally {
      if (previous === undefined) delete process.env.IMPORT_ALLOW_LOOPBACK;
      else process.env.IMPORT_ALLOW_LOOPBACK = previous;
    }
  });

  it("accepts public hosts", async () => {
    const url = await guardUrl("https://example.com/post?x=1", publicLookup);
    expect(url.hostname).toBe("example.com");
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("172.20.1.1")).toBe(true);
    expect(isPrivateAddress("::ffff:192.168.1.1")).toBe(true);
    expect(isPrivateAddress("2606:4700::1111")).toBe(false);
  });

  it("re-checks every redirect and stops after three", async () => {
    const hops: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      hops.push(url);
      if (url.startsWith("https://example.com/start")) return new Response(null, { status: 302, headers: { location: "http://10.0.0.9/secret" } });
      return new Response("<html><title>ok</title></html>", { status: 200, headers: { "content-type": "text/html" } });
    }) as typeof fetch;
    await expect(fetchPage("https://example.com/start", { lookup: publicLookup, fetchImpl })).rejects.toThrow(/Private/);
    expect(hops).toEqual(["https://example.com/start"]);

    let n = 0;
    const loop = (async () => new Response(null, { status: 301, headers: { location: `https://example.com/${n++}` } })) as typeof fetch;
    await expect(fetchPage("https://example.com/a", { lookup: publicLookup, fetchImpl: loop })).rejects.toThrow(/redirects/);
    expect(n).toBe(4);
  });

  it("caps the body size", async () => {
    const big = "x".repeat(MAX_BYTES + 10);
    const fetchImpl = (async () => new Response(big, { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch;
    await expect(fetchPage("https://example.com/big", { lookup: publicLookup, fetchImpl })).rejects.toThrow(/too large/);
    const ok = await fetchPage("https://example.com/ok", {
      lookup: publicLookup,
      fetchImpl: (async () => new Response("<p>hi</p>", { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch,
    });
    expect(ok.body).toBe("<p>hi</p>");
    expect(ok.status).toBe(200);
  });

  it("names the sites that need a screenshot", () => {
    expect(screenshotOnlyHost("www.instagram.com")).toBe("instagram.com");
    expect(screenshotOnlyHost("vm.tiktok.com")).toBe("tiktok.com");
    expect(screenshotOnlyHost("example.com")).toBeNull();
  });
});

describe("extraction", () => {
  const blog = `<!doctype html><html><head><title>3 days in Rome &amp; where we ate</title>
    <meta property="og:description" content="Our favorite trattorias and sights"><style>p{}</style></head>
    <body><nav><a href="/">Home</a><li>Menu item</li></nav>
    <h1>3 days in Rome</h1><script>var x = "<p>not this</p>";</script>
    <p>We started at the <b>Colosseum</b> at opening, then walked to the Roman Forum.</p>
    <h2>Where we ate</h2><ul><li>Roscioli Salumeria con Cucina — the carbonara</li><li>Da Enzo al 29</li></ul>
    <p>Short.</p><footer><p>Copyright notice that is long enough to count</p></footer></body></html>`;

  it("pulls title, description, headings, paragraphs and list items from a blog post", () => {
    const c = extractHtml(blog);
    expect(c.title).toBe("3 days in Rome & where we ate");
    expect(c.description).toBe("Our favorite trattorias and sights");
    expect(c.headings).toEqual(["3 days in Rome", "Where we ate"]);
    expect(c.paragraphs).toEqual(["We started at the Colosseum at opening, then walked to the Roman Forum."]);
    expect(c.items).toEqual(["Roscioli Salumeria con Cucina — the carbonara", "Da Enzo al 29"]);
    expect(c.text).not.toContain("not this");
    expect(c.text).not.toContain("Menu item");
    expect(c.text).not.toContain("Copyright");
  });

  it("reads a Reddit thread's post and comments by score", () => {
    const json = [
      { data: { children: [{ data: { title: "Best food in Rome?", selftext: "Going in May." } }] } },
      { data: { children: [{ data: { body: "Da Enzo, book ahead", score: 5 } }, { data: { body: "Roscioli!", score: 40 } }, { data: { score: 1 } }] } },
    ];
    const c = extractReddit(json);
    expect(c.title).toBe("Best food in Rome?");
    expect(c.paragraphs).toEqual(["Going in May.", "Roscioli!", "Da Enzo, book ahead"]);
    expect(c.text.startsWith("Best food in Rome?\nGoing in May.")).toBe(true);
  });

  it("reads YouTube metadata and the player's description", () => {
    const html = `<html><head><title>ROME VLOG - YouTube</title><meta name="description" content="short"></head><body><script>var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":"Day 1: Colosseum\\nDay 2: Trastevere \\"tour\\""}};</script></body></html>`;
    const c = extractYouTube(html);
    expect(c.title).toBe("ROME VLOG - YouTube");
    expect(c.description).toBe('Day 1: Colosseum\nDay 2: Trastevere "tour"');
    expect(siteName("https://www.youtube.com/watch?v=1")).toBe("youtube.com");
  });

  it("normalizes model output: caps at 20, dedupes, defaults kinds, trims reasons", () => {
    const places = Array.from({ length: 25 }, (_, i) => ({ name: `Place ${i % 22}`, kind: i % 3 === 0 ? "restaurant" : "weird", why: "w".repeat(200) }));
    const out = normalizeExtraction({ destination: "  Rome, Italy ", places: [...places, { name: " " }, { kind: "hotel" }] });
    expect(out.destination).toBe("Rome, Italy");
    expect(out.places).toHaveLength(20);
    expect(new Set(out.places.map((p) => p.name)).size).toBe(20);
    expect(out.places[0]).toMatchObject({ name: "Place 0", kind: "restaurant" });
    expect(out.places[1].kind).toBe("attraction");
    expect(out.places[0].why).toHaveLength(160);
    expect(normalizeExtraction({})).toEqual({ destination: undefined, places: [] });
  });
});
