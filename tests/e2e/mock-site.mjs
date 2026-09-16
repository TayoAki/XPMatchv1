// Fixture web site for the inspiration import: a blog post, a page that blocks
// readers (403), a redirect and a binary file. Served on localhost, which the
// import guard only allows when IMPORT_ALLOW_LOOPBACK=1 (set by start-app.mjs).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 4547);
const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.join(here, "fixtures", "site");

let requests = 0;

const server = http.createServer((req, res) => {
  requests += 1;
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (url.pathname === "/rome-post") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(fs.readFileSync(path.join(site, "rome-post.html")));
  }
  if (url.pathname === "/redirect") {
    res.writeHead(302, { Location: "/rome-post" });
    return res.end();
  }
  if (url.pathname === "/forbidden") {
    res.writeHead(403, { "Content-Type": "text/html" });
    return res.end("<html><body>Access denied</body></html>");
  }
  if (url.pathname === "/binary") {
    res.writeHead(200, { "Content-Type": "application/octet-stream" });
    return res.end(Buffer.from([0, 1, 2, 3]));
  }
  if (url.pathname === "/stats") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ requests }));
  }
  res.writeHead(404, { "Content-Type": "text/html" });
  res.end("<html><body>Not found</body></html>");
});

server.listen(PORT, () => console.log(`mock site listening on ${PORT}`));
